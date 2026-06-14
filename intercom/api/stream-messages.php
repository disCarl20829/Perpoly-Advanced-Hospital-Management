<?php
/**
 * intercom/api/stream-messages.php
 * ─────────────────────────────────────────────────────────────────
 * Server-Sent Events (SSE) endpoint.
 *
 * The browser connects once; this script holds the connection open
 * and pushes new messages as "data: <json>\n\n" frames.
 *
 * Browsers auto-reconnect on disconnect, so no client-side retry
 * logic is needed.  We send a "ping" event every 25 s so proxies
 * and load-balancers don't kill idle connections.
 *
 * Usage (client JS):
 *   const es = new EventSource('/hms/intercom/api/stream-messages.php
 *                                ?room_id=3&since_id=0');
 *   es.addEventListener('message', e => {
 *       const msgs = JSON.parse(e.data);   // array of message rows
 *       msgs.forEach(m => renderMessage(m));
 *   });
 * ─────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/func.php';
requireLogin();

/* ── Input ── */
$roomId  = sanitizeInt($_GET['room_id']  ?? 0);
$sinceId = sanitizeInt($_GET['since_id'] ?? 0);

if (!$roomId) {
    http_response_code(400);
    exit('Missing room_id');
}

/* ── SSE headers ── */
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');   /* Disable Nginx proxy buffering */

/* Disable PHP output buffering */
if (ob_get_level()) ob_end_clean();

/* ── How long to hold this connection open ──
   Browsers reconnect automatically, so 60 s is fine.
   Shorter keeps memory tidy on shared hosts. */
$maxRunSeconds = 60;
$startTime     = time();
$pollInterval  = 1;   /* check DB every 1 second */

while (true) {

    /* ── Fetch new messages ── */
    $rows = DB::all(
        'SELECT m.id, m.room_id, m.sender_id, m.body, m.sent_at,
                u.name AS sender_name
         FROM   messages m
         JOIN   users    u ON u.id = m.sender_id
         WHERE  m.room_id = ?
           AND  m.id      > ?
         ORDER  BY m.id ASC
         LIMIT  50',
        [$roomId, $sinceId]
    );

    if ($rows) {
        foreach ($rows as $r) {
            $sinceId = max($sinceId, (int) $r['id']);
        }
        /* Emit a "message" event (default event type) */
        echo 'data: ' . json_encode(array_values($rows)) . "\n\n";
        flush();
    }

    /* ── Keepalive ping every 25 s ── */
    static $lastPing = 0;
    if (time() - $lastPing >= 25) {
        echo "event: ping\ndata: ok\n\n";
        flush();
        $lastPing = time();
    }

    /* ── Stop after maxRunSeconds so PHP doesn't leak ── */
    if (time() - $startTime >= $maxRunSeconds) {
        /* Send a "reconnect" hint so the browser reconnects immediately */
        echo "retry: 100\n";
        echo "event: reconnect\ndata: ok\n\n";
        flush();
        break;
    }

    /* ── Check if client disconnected ── */
    if (connection_aborted()) break;

    sleep($pollInterval);
}