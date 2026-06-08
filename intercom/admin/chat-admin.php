<?php
$pageTitle = 'Chat Administration';
$activeNav = 'chat-admin';

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/func.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/chat-func.php';

requireLogin();
RBAC::enforce('manage_chat_rooms');

// Handle POST actions
if (isPost() && verifyCsrf(post('csrf_token'))) {
    $action = post('action');

    if ($action === 'delete_message') {
        DB::run('DELETE FROM messages WHERE id = ?', [sanitizeInt(post('msg_id'))]);
        setFlash('success', 'Message deleted.');
    } elseif ($action === 'kick_user') {
        $roomId = sanitizeInt(post('room_id'));
        $userId = sanitizeInt(post('user_id'));
        DB::run('DELETE FROM room_members WHERE room_id = ? AND user_id = ?', [$roomId, $userId]);
        setFlash('success', 'User removed from room.');
    } elseif ($action === 'broadcast') {
        // Send a broadcast message to ALL active rooms
        $body = sanitize(post('body'));
        $senderId = (int) $_SESSION['user_id'];
        $rooms = DB::all('SELECT id FROM rooms WHERE archived = 0');
        foreach ($rooms as $r) {
            // Ensure sender is a member of the room
            DB::run('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)', [$r['id'], $senderId]);
            sendMessage($r['id'], $senderId, '[ANNOUNCEMENT] ' . $body);
        }
        setFlash('success', 'Broadcast sent to ' . count($rooms) . ' rooms.');
    }
    redirect('/intercom/admin/chat-admin.php');
}

// Stats
$stats = [
    'total_rooms' => DB::one('SELECT COUNT(*) AS n FROM rooms WHERE archived = 0')['n'] ?? 0,
    'total_messages' => DB::one('SELECT COUNT(*) AS n FROM messages')['n'] ?? 0,
    'online_users' => DB::one('SELECT COUNT(*) AS n FROM users WHERE is_online = 1')['n'] ?? 0,
    'archived_rooms' => DB::one('SELECT COUNT(*) AS n FROM rooms WHERE archived = 1')['n'] ?? 0,
];

// Recent messages across all rooms (for moderation)
$recentMessages = DB::all(
    'SELECT m.id, m.body, m.sent_at, m.room_id,
            u.full_name AS sender_name, u.role,
            r.name AS room_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     JOIN rooms r ON r.id = m.room_id
     ORDER BY m.sent_at DESC LIMIT 30'
);

// Currently online users
$onlineUsers = DB::all(
    'SELECT u.id, u.full_name, u.role, u.last_seen, d.name AS dept_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.dept_id
     WHERE u.is_online = 1
     ORDER BY u.full_name'
);

require_once __DIR__ . '/../../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Chat Administration</h1>
        <p>Monitor messages, manage rooms, broadcast announcements</p>
    </div>

    <!-- Stats row -->
    <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card">
            <div class="stat-icon blue">💬</div>
            <div class="stat-info"><strong>
                    <?= $stats['total_rooms'] ?>
                </strong><span>Active Rooms</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green">✉</div>
            <div class="stat-info"><strong>
                    <?= number_format($stats['total_messages']) ?>
                </strong><span>Total Messages</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warn">🟢</div>
            <div class="stat-info"><strong>
                    <?= $stats['online_users'] ?>
                </strong><span>Online Now</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon gray">📦</div>
            <div class="stat-info"><strong>
                    <?= $stats['archived_rooms'] ?>
                </strong><span>Archived Rooms</span></div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px">

        <!-- Left: recent messages moderation -->
        <div>
            <!-- Broadcast panel -->
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <h2>📢 Broadcast Announcement</h2>
                </div>
                <div class="card-body">
                    <form method="POST" style="display:flex;gap:10px;align-items:flex-start">
                        <?= csrfField() ?>
                        <input type="hidden" name="action" value="broadcast">
                        <textarea class="form-control" name="body" rows="2"
                            placeholder="Send a message to ALL active rooms…" required style="flex:1"></textarea>
                        <button class="btn btn-primary" onclick="return confirm('Broadcast to all rooms?')">
                            Send
                        </button>
                    </form>
                </div>
            </div>

            <!-- Recent messages -->
            <div class="card">
                <div class="card-header">
                    <h2>Recent Messages</h2>
                    <span style="font-size:12px;color:var(--gray-500)">Latest 30 across all rooms</span>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Sender</th>
                                <th>Room</th>
                                <th>Message</th>
                                <th>Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recentMessages as $m): ?>
                                <tr>
                                    <td>
                                        <strong style="font-size:13px">
                                            <?= e($m['sender_name']) ?>
                                        </strong><br>
                                        <span class="badge badge-blue" style="font-size:10px">
                                            <?= e(ROLE_LABELS[$m['role']] ?? 'Staff') ?>
                                        </span>
                                    </td>
                                    <td>
                                        <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php?room=<?= $m['room_id'] ?>"
                                            style="font-size:13px;color:var(--navy-light)">#
                                            <?= e($m['room_name']) ?>
                                        </a>
                                    </td>
                                    <td style="font-size:13px;max-width:260px;white-space:normal;color:var(--gray-700)">
                                        <?= e(mb_strimwidth($m['body'], 0, 100, '…')) ?>
                                    </td>
                                    <td style="font-size:12px;white-space:nowrap;color:var(--gray-500)">
                                        <?= formatChatTime($m['sent_at']) ?>
                                    </td>
                                    <td>
                                        <form method="POST" style="display:inline"
                                            onsubmit="return confirm('Delete this message?')">
                                            <?= csrfField() ?>
                                            <input type="hidden" name="action" value="delete_message">
                                            <input type="hidden" name="msg_id" value="<?= $m['id'] ?>">
                                            <button class="btn btn-danger btn-sm">Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (empty($recentMessages)): ?>
                                <tr>
                                    <td colspan="5" style="text-align:center;padding:32px;color:var(--gray-500)">
                                        No messages yet.
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Right: online users -->
        <div>
            <div class="card">
                <div class="card-header">
                    <h2>🟢 Online Now</h2>
                    <span style="font-size:12px;color:var(--gray-500)">
                        <?= count($onlineUsers) ?> users
                    </span>
                </div>
                <div style="overflow-y:auto;max-height:520px">
                    <?php if (empty($onlineUsers)): ?>
                        <div style="padding:24px;text-align:center;color:var(--gray-500);font-size:13px">
                            No users currently online.
                        </div>
                    <?php endif; ?>
                    <?php foreach ($onlineUsers as $u): ?>
                        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;
                      border-bottom:1px solid var(--gray-100)">
                            <div class="chat-avatar navy"
                                style="width:34px;height:34px;font-size:13px;flex-shrink:0;position:relative">
                                <?= strtoupper(substr($u['full_name'], 0, 1)) ?>
                                <span class="online-dot"></span>
                            </div>
                            <div style="min-width:0;flex:1">
                                <div style="font-size:13px;font-weight:500;color:var(--gray-900);
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                                    <?= e($u['full_name']) ?>
                                </div>
                                <div style="font-size:11.5px;color:var(--gray-500)">
                                    <?= e(ROLE_LABELS[$u['role']] ?? 'Staff') ?>
                                </div>
                                <div style="font-size:11px;color:var(--gray-300)">
                                    <?= e($u['dept_name'] ?? '—') ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <div class="card-footer">
                    <a href="<?= APP_URL ?>/intercom/directory/directory-search.php"
                        class="btn btn-outline btn-sm btn-block">View Full Directory</a>
                </div>
            </div>
        </div>

    </div>
</div>
<?php require_once __DIR__ . '/../../footer.php'; ?>