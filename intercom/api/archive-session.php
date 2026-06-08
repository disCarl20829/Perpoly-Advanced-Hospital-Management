<?php
// intercom/api/archive-session.php — Background archiver (run via cron)
// Marks rooms as archived after 30 days of inactivity, logs old messages
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/db.php';

// Only allow CLI or admin
if (php_sapi_name() !== 'cli' && (!isset($_SESSION['role']) || (int) $_SESSION['role'] > ROLE_ADMIN)) {
    http_response_code(403);
    exit;
}

$cutoff = date('Y-m-d H:i:s', strtotime('-30 days'));
// Archive stale rooms
$archived = DB::run(
    'UPDATE rooms SET archived=1 WHERE archived=0
     AND id NOT IN (SELECT DISTINCT room_id FROM messages WHERE sent_at>?)',
    [$cutoff]
)->rowCount();

// Delete messages older than 1 year from archived rooms
$deleted = DB::run(
    'DELETE m FROM messages m
     JOIN rooms r ON r.id=m.room_id
     WHERE r.archived=1 AND m.sent_at<?',
    [date('Y-m-d H:i:s', strtotime('-1 year'))]
)->rowCount();

echo json_encode(['archived_rooms' => $archived, 'deleted_messages' => $deleted, 'ran_at' => date('c')]);