<?php
$pageTitle = 'Department Channel';
$activeNav = 'dept-chat';
$extraCss = ['chat.css'];
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/func.php';
require_once __DIR__ . '/../../include/chat-func.php';
requireLogin();
$userId = (int) $_SESSION['user_id'];
$deptId = (int) ($_SESSION['dept_id'] ?? 0);
// Find or auto-create the department room
$room = $deptId ? DB::one('SELECT * FROM rooms WHERE type=\'department\' AND dept_id=?', [$deptId]) : null;
$messages = $room ? fetchMessages($room['id'], 0, 80) : [];
if ($room)
    markMessagesRead($room['id'], $userId);
$members = $deptId ? DB::all('SELECT id,full_name,role,is_online FROM users WHERE dept_id=? AND status=\'active\' ORDER BY role,full_name', [$deptId]) : [];
require_once __DIR__ . '/../../header.php';
?>
<div class="chat-shell" style="grid-template-columns:1fr 280px">
    <!-- Message Window -->
    <div class="chat-window">
        <?php if ($room): ?>
            <div class="chat-window-header">
                <div class="chat-avatar green" style="width:36px;height:36px;font-size:13px">#</div>
                <div class="chat-window-header-info">
                    <strong>
                        <?= e($room['name']) ?>
                    </strong>
                    <span>
                        <?= count(array_filter($members, fn($m) => $m['is_online'])) ?> online
                    </span>
                </div>
            </div>
            <div class="chat-messages" id="msg-container">
                <?php $lastDate = '';
                foreach ($messages as $m):
                    $date = date('F j, Y', strtotime($m['sent_at']));
                    $isMe = ($m['sender_name'] === $_SESSION['user_name']); ?>
                    <?php if ($date !== $lastDate):
                        $lastDate = $date; ?>
                        <div class="msg-day-label">
                            <?= e($date) ?>
                        </div>
                    <?php endif; ?>
                    <div class="msg-row <?= $isMe ? 'from-me' : '' ?>">
                        <?php if (!$isMe): ?>
                            <div class="msg-avatar-small green">
                                <?= strtoupper(substr($m['sender_name'], 0, 1)) ?>
                            </div>
                        <?php else: ?>
                            <div class="msg-spacer"></div>
                        <?php endif; ?>
                        <div>
                            <?php if (!$isMe): ?>
                                <div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;padding-left:4px">
                                    <?= e($m['sender_name']) ?> <span style="color:var(--gray-300)">&middot;</span>
                                    <?= e(ROLE_LABELS[$m['role']] ?? '') ?>
                                </div>
                            <?php endif; ?>
                            <div class="msg-bubble">
                                <?= nl2br(e($m['body'])) ?>
                            </div>
                            <div class="msg-time">
                                <?= formatChatTime($m['sent_at']) ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="chat-input-bar">
                <div class="chat-input-wrap">
                    <textarea class="chat-input" id="msg-input"
                        placeholder="Message #<?= e($room['name'] ?? 'department') ?>…" rows="1"></textarea>
                </div>
                <button class="chat-send-btn" id="send-btn">➤</button>
            </div>
        <?php else: ?>
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray-500)">
                <div style="text-align:center">
                    <div style="font-size:40px;margin-bottom:10px">🏢</div>
                    <div>No department channel found. Contact your administrator.</div>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <!-- Members Panel -->
    <div style="border-left:1px solid var(--gray-200);background:var(--white);overflow-y:auto">
        <div style="padding:16px;border-bottom:1px solid var(--gray-100)">
            <h3 style="font-size:14px;font-weight:600;color:var(--navy-dark)">Members (
                <?= count($members) ?>)
            </h3>
        </div>
        <div style="padding:8px 0">
            <?php foreach ($members as $m): ?>
                <div style="display:flex;align-items:center;gap:10px;padding:8px 14px">
                    <div class="chat-avatar navy" style="width:32px;height:32px;font-size:12px;flex-shrink:0">
                        <?= strtoupper(substr($m['full_name'], 0, 1)) ?>
                        <?php if ($m['is_online']): ?><span class="online-dot"></span>
                        <?php endif; ?>
                    </div>
                    <div>
                        <div style="font-size:13px;font-weight:500;color:var(--gray-900)">
                            <?= e($m['full_name']) ?>
                        </div>
                        <div style="font-size:11.5px;color:var(--gray-500)">
                            <?= e(ROLE_LABELS[$m['role']] ?? 'Staff') ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<script>
    const ROOM_ID = <?= $room['id'] ?? 0 ?>;
    const USER_ID = <?= $userId ?>;
    let lastId = <?= !empty($messages) ? end($messages)['id'] : 0 ?>;
    const API_BASE = '<?= APP_URL ?>/intercom/api';
    document.getElementById('msg-container')?.scrollTo(0, 99999);
    const input = document.getElementById('msg-input');
    if (input) {
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    }
    function send() {
        const body = input.value.trim(); if (!body || !ROOM_ID) return;
        input.value = '';
        fetch(`${API_BASE}/send-message.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `room_id=${ROOM_ID}&body=${encodeURIComponent(body)}`
        }).then(r => r.json()).then(d => { if (d.id) lastId = d.id; });
    }
    document.getElementById('send-btn')?.addEventListener('click', send);
    if (ROOM_ID) setInterval(() => {
        fetch(`${API_BASE}/fetch-messages.php?room_id=${ROOM_ID}&since_id=${lastId}`)
            .then(r => r.json()).then(msgs => {
                msgs.forEach(m => {
                    lastId = Math.max(lastId, m.id);
                    const c = document.getElementById('msg-container');
                    const isMe = (m.sender_id == USER_ID);
                    const d = document.createElement('div'); d.className = 'msg-row' + (isMe ? ' from-me' : '');
                    d.innerHTML = (isMe ? '<div class="msg-spacer"></div>' : `<div class="msg-avatar-small green">${m.sender_name[0].toUpperCase()}</div>`)
                        + `<div>${!isMe ? `<div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;padding-left:4px">${m.sender_name}</div>` : ''}
          <div class="msg-bubble">${m.body.replace(/\n/g, '<br>')}</div>
          <div class="msg-time">${m.sent_at}</div></div>`;
                    c.appendChild(d); c.scrollTop = c.scrollHeight;
                });
            });
    }, <?= CHAT_POLL_MS ?>);
</script>
<?php require_once __DIR__ . '/../../footer.php'; ?>