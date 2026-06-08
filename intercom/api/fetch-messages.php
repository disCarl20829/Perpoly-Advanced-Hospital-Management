<?php
// intercom/api/fetch-messages.php — GET: poll new messages
header('Content-Type: application/json');
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/chat-func.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode([]);
    exit;
}
$roomId = (int) ($_GET['room_id'] ?? 0);
$sinceId = (int) ($_GET['since_id'] ?? 0);
if (!$roomId) {
    echo json_encode([]);
    exit;
}

$member = DB::one('SELECT id FROM room_members WHERE room_id=? AND user_id=?', [$roomId, (int) $_SESSION['user_id']]);
if (!$member) {
    http_response_code(403);
    echo json_encode([]);
    exit;
}

$msgs = DB::all(
    'SELECT m.id, m.body, m.sender_id, m.sent_at, u.full_name AS sender_name, u.role
     FROM messages m JOIN users u ON u.id=m.sender_id
     WHERE m.room_id=? AND m.id>? ORDER BY m.sent_at ASC LIMIT 50',
    [$roomId, $sinceId]
);
echo json_encode($msgs);