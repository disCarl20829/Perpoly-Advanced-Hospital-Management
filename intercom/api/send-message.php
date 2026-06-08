<?php
// intercom/api/send-message.php — POST: persist new message
header('Content-Type: application/json');
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/chat-func.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
$roomId = (int) ($_POST['room_id'] ?? 0);
$body = trim($_POST['body'] ?? '');
if (!$roomId || empty($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing fields']);
    exit;
}

// Verify user is a member of this room
$member = DB::one('SELECT rooms.id FROM rooms INNER JOIN room_members ON rooms.id = room_members.room_id WHERE rooms.id = ? AND room_members.user_id = ?', [$roomId, (int) $_SESSION['user_id']]);
if (!$member) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$id = sendMessage($roomId, (int) $_SESSION['user_id'], $body);
echo json_encode(['id' => $id, 'status' => 'ok']);