<?php
// intercom/api/user-status.php — GET/POST: online presence
header('Content-Type: application/json');
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/chat-func.php';

if (!isLoggedIn()) {
    echo json_encode([]);
    exit;
}
$userId = (int) $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $status = ($_POST['status'] ?? '') === 'offline' ? 0 : 1;
    DB::run('UPDATE users SET is_online=?,last_seen=NOW() WHERE id=?', [$status, $userId]);
    echo json_encode(['ok' => true]);
} else {
    setUserOnline($userId);
    $deptId = (int) ($_SESSION['dept_id'] ?? 0);
    echo json_encode(getOnlineUsers($deptId));
}