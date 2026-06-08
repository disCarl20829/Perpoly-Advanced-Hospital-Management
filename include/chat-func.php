<?php
// include/chat-func.php — Chat/Intercom Helper Functions
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function sendMessage(int $roomId, int $senderId, string $body): int
{
    $body = trim(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
    if (empty($body))
        return 0;
    return (int) DB::insert(
        'INSERT INTO messages (room_id, sender_id, body, sent_at) VALUES (?,?,?,NOW())',
        [$roomId, $senderId, $body]
    );
}

function fetchMessages(int $roomId, int $sinceId = 0, int $limit = 50): array
{
    return DB::all(
        'SELECT m.id, m.body, m.sent_at, u.full_name AS sender_name, u.role
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.room_id = ? AND m.id > ?
         ORDER BY m.sent_at ASC LIMIT ?',
        [$roomId, $sinceId, $limit]
    );
}

function getRooms(int $userId): array
{
    return DB::all(
        'SELECT r.id, r.name, r.type, r.dept_id, r.div_id,
                (SELECT body FROM messages WHERE room_id=r.id ORDER BY sent_at DESC LIMIT 1) AS last_msg,
                (SELECT sent_at FROM messages WHERE room_id=r.id ORDER BY sent_at DESC LIMIT 1) AS last_at,
                (SELECT COUNT(*) FROM messages WHERE room_id=r.id AND is_read=0 AND sender_id!=?) AS unread
         FROM rooms r
         JOIN room_members rm ON rm.room_id=r.id
         WHERE rm.user_id=? AND r.archived=0
         ORDER BY last_at DESC',
        [$userId, $userId]
    );
}

function setUserOnline(int $userId): void
{
    DB::run('UPDATE users SET last_seen=NOW(), is_online=1 WHERE id=?', [$userId]);
}

function setUserOffline(int $userId): void
{
    DB::run('UPDATE users SET is_online=0 WHERE id=?', [$userId]);
}

function getOnlineUsers(int $deptId = 0): array
{
    $sql = 'SELECT id, full_name, role, is_online, last_seen FROM users WHERE is_online=1';
    $params = [];
    if ($deptId) {
        $sql .= ' AND dept_id=?';
        $params[] = $deptId;
    }
    return DB::all($sql, $params);
}

function markMessagesRead(int $roomId, int $userId): void
{
    DB::run(
        'UPDATE messages SET is_read=1 WHERE room_id=? AND sender_id!=? AND is_read=0',
        [$roomId, $userId]
    );
}

function formatChatTime(string $dt): string
{
    $diff = time() - strtotime($dt);
    if ($diff < 60)
        return 'now';
    if ($diff < 3600)
        return floor($diff / 60) . 'm';
    if (date('Y-m-d') === date('Y-m-d', strtotime($dt)))
        return date('g:i A', strtotime($dt));
    return date('M j', strtotime($dt));
}