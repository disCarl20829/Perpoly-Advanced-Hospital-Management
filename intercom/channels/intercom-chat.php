<?php
$pageTitle = 'Messages';
$activeNav = 'chat';
$extraCss = ['chat.css'];
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/func.php';
require_once __DIR__ . '/../../include/chat-func.php';
requireLogin();

$userId = (int) $_SESSION['user_id'];
setUserOnline($userId);
$rooms = getRooms($userId);
$activeRoomId = sanitizeInt(get('room', $rooms[0]['id'] ?? 0));
$messages = $activeRoomId ? fetchMessages($activeRoomId, 0, 60) : [];
if ($activeRoomId)
    markMessagesRead($activeRoomId, $userId);
$activeRoom = $activeRoomId ? DB::one('SELECT * FROM rooms WHERE id=?', [$activeRoomId]) : null;

require_once __DIR__ . '/../../header.php';
?>
<style>
/*
 * ════════════════════════════════════════════════════════════════
 *  CHAT BUBBLE OVERRIDES
 *  chat.css is loaded before this block and contains rules that
 *  force bubbles to be narrow vertical columns.  Every critical
 *  property uses !important so these rules always win regardless
 *  of chat.css specificity.
 * ════════════════════════════════════════════════════════════════
 */

/* ── 1. Message row: full-width flex, alignment by direction ── */
.msg-row {
    display:        flex    !important;
    flex-direction: row     !important;   /* NEVER column */
    align-items:    flex-end!important;
    gap:            8px     !important;
    margin-bottom:  6px     !important;
    width:          100%    !important;
    box-sizing:     border-box !important;
}

/* Received → left */
.msg-row:not(.from-me) {
    justify-content: flex-start !important;
}

/* Sent → right */
.msg-row.from-me {
    justify-content: flex-end !important;
}

/* ── 2. Body-wrap: flex column, capped at 70% of the chat pane ── */
.msg-body-wrap {
    display:        flex          !important;
    flex-direction: column        !important;
    max-width:      70%           !important;  /* THE one and only width cap */
    min-width:      0             !important;
    box-sizing:     border-box    !important;
}
.msg-row.from-me       .msg-body-wrap { align-items: flex-end   !important; }
.msg-row:not(.from-me) .msg-body-wrap { align-items: flex-start !important; }

/* ── 3. Bubble: NO max-width (parent handles it).
         word-break: normal = wrap at spaces, not between letters. ── */
.msg-bubble {
    display:       inline-block !important;   /* shrinks to content width */
    max-width:     100%         !important;   /* fill body-wrap, no more  */
    min-width:     0            !important;
    width:         auto         !important;
    box-sizing:    border-box   !important;

    /* Text wrapping — the root cause of the "letter per line" bug */
    word-break:    normal       !important;   /* break at spaces only     */
    overflow-wrap: anywhere     !important;   /* last-resort char break   */
    white-space:   normal       !important;
    hyphens:       none         !important;

    padding:       9px 14px     !important;
    border-radius: 18px         !important;
    font-size:     14px         !important;
    line-height:   1.5          !important;
}

/* Sent bubble → navy, right tail */
.msg-row.from-me .msg-bubble {
    background:               #1E4D7B !important;
    color:                    #fff    !important;
    border-bottom-right-radius: 4px   !important;
}

/* Received bubble → light gray, left tail */
.msg-row:not(.from-me) .msg-bubble {
    background:              #EEF1F5 !important;
    color:                   #1A2733 !important;
    border-bottom-left-radius: 4px   !important;
}

/* ── 4. Spacer: only exists inside .from-me rows, pushes content right ── */
.msg-spacer {
    flex:     1 1 0  !important;
    min-width: 0     !important;
    display:  block  !important;
}

/* ── 5. Avatar beside received messages ── */
.msg-avatar-small {
    width:        28px        !important;
    height:       28px        !important;
    min-width:    28px        !important;
    border-radius: 50%        !important;
    background:   #1E4D7B    !important;
    color:        #fff        !important;
    font-size:    11px        !important;
    font-weight:  700         !important;
    display:      flex        !important;
    align-items:  center      !important;
    justify-content: center   !important;
    flex-shrink:  0           !important;
    align-self:   flex-end    !important;
    margin-bottom: 0          !important;
}

/* ── 6. Timestamp ── */
.msg-time {
    font-size:   10px    !important;
    color:       #7A8EA3 !important;
    margin-top:  3px     !important;
    white-space: nowrap  !important;
    line-height: 1.2     !important;
}
.msg-row.from-me       .msg-time { text-align: right !important; }
.msg-row:not(.from-me) .msg-time { text-align: left  !important; padding-left: 2px !important; }

/* ── 7. Sender name ── */
.msg-sender-name {
    font-size:    11px   !important;
    color:        #7A8EA3!important;
    margin-bottom: 2px   !important;
    padding-left:  2px   !important;
    white-space:   nowrap!important;
}
</style>

<div class="chat-shell">

    <!-- ── Left panel: rooms list ── -->
    <div class="chat-contacts">
        <div class="chat-contacts-header">
            <h3>Messages</h3>
            <div class="chat-search">
                <span class="chat-search-icon">🔍</span>
                <input type="text" id="room-search" placeholder="Search conversations…">
            </div>
        </div>
        <div class="chat-list">
            <div class="chat-list-section-label">Channels</div>
            <?php foreach ($rooms as $r):
                $isActive = ($r['id'] == $activeRoomId); ?>
                <div class="chat-item <?= $isActive ? 'active' : '' ?>"
                     onclick="window.location='?room=<?= $r['id'] ?>'">
                    <div class="chat-avatar <?= $r['type'] === 'group' ? 'green' : 'navy' ?>">
                        <?= $r['type'] === 'group' ? '#' : strtoupper(substr($r['name'], 0, 1)) ?>
                    </div>
                    <div class="chat-item-info">
                        <div class="chat-item-name"><?= e($r['name']) ?></div>
                        <div class="chat-item-preview">
                            <?= e(mb_strimwidth($r['last_msg'] ?? 'No messages yet', 0, 38, '…')) ?>
                        </div>
                    </div>
                    <div class="chat-item-meta">
                        <div class="chat-item-time"><?= $r['last_at'] ? formatChatTime($r['last_at']) : '' ?></div>
                        <?php if ($r['unread'] > 0): ?>
                            <div class="chat-unread"><?= $r['unread'] ?></div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
            <?php if (empty($rooms)): ?>
                <div style="padding:24px 16px;text-align:center;color:#7A8EA3;font-size:13px">
                    No conversations yet.
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- ── Right panel: message window ── -->
    <div class="chat-window">
        <?php if ($activeRoom): ?>
            <div class="chat-window-header">
                <div class="chat-avatar <?= $activeRoom['type'] === 'group' ? 'green' : 'navy' ?>"
                     style="width:36px;height:36px;font-size:13px">
                    <?= $activeRoom['type'] === 'group' ? '#' : strtoupper(substr($activeRoom['name'], 0, 1)) ?>
                </div>
                <div class="chat-window-header-info">
                    <strong><?= e($activeRoom['name']) ?></strong>
                    <span id="room-status">Active</span>
                </div>
                <div class="chat-window-actions">
                    <button class="chat-action-btn" title="Directory">📖</button>
                    <button class="chat-action-btn" title="Search messages">🔍</button>
                </div>
            </div>

            <div class="chat-messages" id="msg-container">
                <?php
                $lastDate = '';
                foreach ($messages as $m):
                    $date  = date('F j, Y', strtotime($m['sent_at']));
                    $isMe  = ((int)($m['sender_id'] ?? 0) === $userId
                           || $m['sender_name'] === $_SESSION['user_name']);
                    /* Always use real clock time — never "now" — so timestamps
                       survive a page reload without disappearing or showing wrong */
                    $tsDisplay = date('h:i A', strtotime($m['sent_at']));
                ?>
                    <?php if ($date !== $lastDate): $lastDate = $date; ?>
                        <div class="msg-day-label"><?= e($date) ?></div>
                    <?php endif; ?>

                    <div class="msg-row <?= $isMe ? 'from-me' : '' ?>" data-id="<?= (int)$m['id'] ?>">
                        <?php if ($isMe): ?>
                            <div class="msg-spacer"></div>
                        <?php else: ?>
                            <div class="msg-avatar-small">
                                <?= strtoupper(substr($m['sender_name'], 0, 1)) ?>
                            </div>
                        <?php endif; ?>

                        <div class="msg-body-wrap">
                            <?php if (!$isMe): ?>
                                <div class="msg-sender-name"><?= e($m['sender_name']) ?></div>
                            <?php endif; ?>
                            <div class="msg-bubble"><?= nl2br(e($m['body'])) ?></div>
                            <div class="msg-time"><?= $tsDisplay ?></div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($messages)): ?>
                    <div style="margin:auto;text-align:center;color:#7A8EA3">
                        <div style="font-size:32px;margin-bottom:8px">💬</div>
                        <div style="font-size:14px">No messages yet. Say hello!</div>
                    </div>
                <?php endif; ?>
            </div>

            <div class="chat-input-bar">
                <div class="chat-input-wrap">
                    <button class="chat-attach-btn" title="Attach file">📎</button>
                    <textarea class="chat-input" id="msg-input"
                              placeholder="Type a message…" rows="1"></textarea>
                </div>
                <button class="chat-send-btn" id="send-btn" title="Send">➤</button>
            </div>

        <?php else: ?>
            <div style="display:flex;flex-direction:column;align-items:center;
                        justify-content:center;height:100%;color:#7A8EA3">
                <div style="font-size:48px;margin-bottom:12px">💬</div>
                <div style="font-size:15px;font-weight:500;color:#3D5166">Select a conversation</div>
                <div style="font-size:13px;margin-top:4px">Choose from your channels on the left</div>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
/* ════════════════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════════════════ */
const ROOM_ID     = <?= $activeRoomId ?>;
const USER_ID     = <?= $userId ?>;
const API_BASE    = '<?= rtrim(APP_URL, '/') ?>/intercom/api';
const SEARCH_URL  = '<?= rtrim(APP_URL, '/') ?>/search/appsearch.php';
const MY_NAME     = <?= json_encode($_SESSION['user_name'] ?? '') ?>;


/* ════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════ */
function scrollBottom(force) {
    const c = document.getElementById('msg-container');
    if (!c) return;
    if (force || (c.scrollHeight - c.scrollTop - c.clientHeight < 80))
        c.scrollTop = c.scrollHeight;
}
scrollBottom(true);

function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* formatTime — identical output to PHP's date('h:i A') */
function formatTime(str) {
    if (!str) return '';
    /* MySQL "2026-06-14 23:41:00" → treat as local time */
    const d = new Date(str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return str;
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

/* ════════════════════════════════════════════════════════════════
   DOM BUILDER
   Mirrors the PHP template exactly — same classes, same structure.
════════════════════════════════════════════════════════════════ */
function buildMsgEl(m) {
    const isMe = (parseInt(m.sender_id) === USER_ID);
    const row  = document.createElement('div');
    row.className  = 'msg-row' + (isMe ? ' from-me' : '');
    row.dataset.id = m.id;

    const initial  = esc((m.sender_name || '?')[0].toUpperCase());
    const safeBody = esc(m.body).replace(/\n/g, '<br>');
    const time     = formatTime(m.sent_at);

    if (isMe) {
        row.innerHTML =
            `<div class="msg-spacer"></div>` +
            `<div class="msg-body-wrap">` +
              `<div class="msg-bubble">${safeBody}</div>` +
              `<div class="msg-time">${time}</div>` +
            `</div>`;
    } else {
        row.innerHTML =
            `<div class="msg-avatar-small">${initial}</div>` +
            `<div class="msg-body-wrap">` +
              `<div class="msg-sender-name">${esc(m.sender_name)}</div>` +
              `<div class="msg-bubble">${safeBody}</div>` +
              `<div class="msg-time">${time}</div>` +
            `</div>`;
    }
    return row;
}

/* Deduplicate by tracking rendered IDs */
const rendered = new Set(
    [...document.querySelectorAll('.msg-row[data-id]')]
        .map(el => parseInt(el.dataset.id))
);

let lastId = rendered.size ? Math.max(...rendered) : 0;

function appendMessages(msgs) {
    if (!msgs || !msgs.length) return;
    const c = document.getElementById('msg-container');
    let added = false;
    msgs.forEach(m => {
        const id = parseInt(m.id);
        if (id > 0 && rendered.has(id)) return;
        if (id > 0) rendered.add(id);
        lastId = Math.max(lastId, id > 0 ? id : lastId);
        c.appendChild(buildMsgEl(m));
        added = true;
    });
    if (added) scrollBottom();
}

/* ════════════════════════════════════════════════════════════════
   REAL-TIME: Server-Sent Events (auto-reconnects, no libraries)
   Falls back to polling for old browsers.
════════════════════════════════════════════════════════════════ */
if (ROOM_ID) {
    if (typeof EventSource !== 'undefined') {
        let es;
        function connectSSE() {
            es = new EventSource(
                `${API_BASE}/stream-messages.php?room_id=${ROOM_ID}&since_id=${lastId}`
            );
            es.addEventListener('message', function(e) {
                try { appendMessages(JSON.parse(e.data)); } catch {}
            });
            es.addEventListener('ping', function() {});
            es.onerror = function() {
                es.close();
                setTimeout(connectSSE, 3000);
            };
        }
        connectSSE();
    } else {
        const POLL = <?= defined('CHAT_POLL_MS') ? (int)CHAT_POLL_MS : 3000 ?>;
        setInterval(function() {
            fetch(`${API_BASE}/fetch-messages.php?room_id=${ROOM_ID}&since_id=${lastId}`)
                .then(r => r.json()).then(appendMessages).catch(() => {});
        }, POLL);
    }
}

/* ════════════════════════════════════════════════════════════════
   SEND
════════════════════════════════════════════════════════════════ */
const input = document.getElementById('msg-input');
if (input) {
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
}

function sendMsg() {
    if (!ROOM_ID || !input) return;
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    input.style.height = 'auto';

    /* Optimistic: show instantly with a temp negative ID */
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    appendMessages([{
        id:          -(Date.now()),
        sender_id:   USER_ID,
        sender_name: MY_NAME,
        body:        body,
        sent_at:     `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} `
                   + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    }]);
    scrollBottom(true);

    fetch(`${API_BASE}/send-message.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `room_id=${ROOM_ID}&body=${encodeURIComponent(body)}`
    })
    .then(r => r.json())
    .then(d => {
        if (d.id) {
            /* Register real DB id so SSE/poll won't re-append it */
            rendered.add(parseInt(d.id));
            lastId = Math.max(lastId, parseInt(d.id));
        }
    })
    .catch(() => {});
}

document.getElementById('send-btn')?.addEventListener('click', sendMsg);
</script>

<?php require_once __DIR__ . '/../../footer.php'; ?>