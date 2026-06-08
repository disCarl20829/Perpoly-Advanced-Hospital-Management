<?php
/**
 * search/messearch.php — Message / chat search
 * Searches message bodies across rooms the current user is a member of.
 * Returns JSON when ?format=json, HTML page otherwise.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/chat-func.php';

requireLogin();

$q = sanitize(get('q'));
$roomId = sanitizeInt(get('room_id', 0));
$format = sanitize(get('format', 'html'));
$userId = (int) $_SESSION['user_id'];

$results = [];

if (strlen($q) >= 2) {
    // Only search rooms the user belongs to
    $where = ['m.body LIKE ?', 'rm.user_id = ?'];
    $params = ["%$q%", $userId];

    if ($roomId) {
        $where[] = 'm.room_id = ?';
        $params[] = $roomId;
    }

    $whereStr = implode(' AND ', $where);
    $results = DB::all(
        "SELECT m.id, m.body, m.sent_at, m.room_id,
                u.full_name AS sender_name,
                r.name AS room_name, r.type AS room_type
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         JOIN rooms r ON r.id = m.room_id
         JOIN room_members rm ON rm.room_id = m.room_id
         WHERE $whereStr
         GROUP BY m.id
         ORDER BY m.sent_at DESC
         LIMIT 50",
        $params
    );
}

// My rooms for filter dropdown
$myRooms = DB::all(
    'SELECT r.id, r.name FROM rooms r
     JOIN room_members rm ON rm.room_id = r.id
     WHERE rm.user_id = ? AND r.archived = 0 ORDER BY r.name',
    [$userId]
);

if ($format === 'json') {
    header('Content-Type: application/json');
    echo json_encode(array_map(fn($r) => [
        'id' => $r['id'],
        'body' => mb_strimwidth($r['body'], 0, 80, '…'),
        'sender_name' => $r['sender_name'],
        'room_name' => $r['room_name'],
        'sent_at' => formatChatTime($r['sent_at']),
        'room_id' => $r['room_id'],
    ], $results));
    exit;
}

$pageTitle = 'Search Messages';
$activeNav = 'chat';
$extraCss = ['chat.css'];
require_once __DIR__ . '/../header.php';

// Helper: highlight search term in text
function highlight(string $text, string $term): string
{
    if (!$term)
        return e($text);
    return preg_replace(
        '/(' . preg_quote(htmlspecialchars($term, ENT_QUOTES), '/') . ')/i',
        '<mark style="background:var(--green-xlight);color:var(--green-dark);border-radius:2px;padding:0 2px">$1</mark>',
        e($text)
    );
}
?>
<div class="page-body">
    <div class="page-header">
        <h1>Search Messages</h1>
        <p>Search across your conversations</p>
    </div>

    <form method="GET" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
        <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Search message content…"
            style="max-width:320px" autofocus>
        <select class="form-control form-select" name="room_id" style="max-width:200px">
            <option value="">All Rooms</option>
            <?php foreach ($myRooms as $r): ?>
                <option value="<?= $r['id'] ?>" <?= $roomId == $r['id'] ? 'selected' : '' ?>>
                    #
                    <?= e($r['name']) ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button class="btn btn-primary">Search</button>
        <?php if ($q): ?>
            <a href="?" class="btn btn-outline">Clear</a>
        <?php endif; ?>
    </form>

    <?php if (strlen($q) >= 2 && empty($results)): ?>
        <div class="alert alert-info">
            <span>ℹ</span><span>No messages found for "
                <?= e($q) ?>".
            </span>
        </div>
    <?php endif; ?>

    <?php if (!empty($results)): ?>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px">
            <?= count($results) ?> result
            <?= count($results) !== 1 ? 's' : '' ?> for "
            <?= e($q) ?>"
        </p>
        <div class="card">
            <?php foreach ($results as $m): ?>
                <div style="padding:14px 20px;border-bottom:1px solid var(--gray-100);
                display:flex;gap:12px;align-items:flex-start">
                    <div class="chat-avatar navy" style="width:36px;height:36px;font-size:13px;flex-shrink:0">
                        <?= strtoupper(substr($m['sender_name'], 0, 1)) ?>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                            <strong style="font-size:13px;color:var(--navy-dark)">
                                <?= e($m['sender_name']) ?>
                            </strong>
                            <span style="font-size:11.5px;color:var(--gray-400)">in</span>
                            <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php?room=<?= $m['room_id'] ?>"
                                style="font-size:12.5px;color:var(--green)">
                                #
                                <?= e($m['room_name']) ?>
                            </a>
                            <span style="font-size:11.5px;color:var(--gray-300);margin-left:auto">
                                <?= formatChatTime($m['sent_at']) ?>
                            </span>
                        </div>
                        <div style="font-size:13.5px;color:var(--gray-700);line-height:1.5">
                            <?= highlight($m['body'], $q) ?>
                        </div>
                    </div>
                    <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php?room=<?= $m['room_id'] ?>"
                        class="btn btn-outline btn-sm" style="flex-shrink:0">Jump →</a>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if (strlen($q) < 2 && !$q): ?>
        <div style="text-align:center;padding:60px 0">
            <div style="font-size:48px;margin-bottom:12px;color:var(--gray-200)">💬</div>
            <div style="font-size:15px;color:var(--gray-500)">Type at least 2 characters to search your messages.</div>
        </div>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>