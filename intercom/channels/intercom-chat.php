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
<div class="chat-shell">
    <!-- Contacts / Rooms -->
    <div class="chat-contacts">
        <div class="chat-contacts-header">
            <h3>Messages</h3>
            <div class="chat-search"><span class="chat-search-icon">🔍</span>
                <input type="text" id="room-search" placeholder="Search conversations…">
            </div>
        </div>
        <div class="chat-list">
            <!-- Direct messages -->
            <div class="chat-list-section-label">Channels</div>
            <?php foreach ($rooms as $r):
                $isActive = ($r['id'] == $activeRoomId); ?>
                <div class="chat-item <?= $isActive ? 'active' : '' ?>" onclick="window.location='?room=<?= $r['id'] ?>'">
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
                            <div class="chat-unread"><?= $r['unread'] ?></div><?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
            <?php if (empty($rooms)): ?>
                <div style="padding:24px 16px;text-align:center;color:var(--gray-500);font-size:13px">No conversations yet.
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Message Window -->
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
                <?php $lastDate = '';
                foreach ($messages as $m):
                    $date = date('F j, Y', strtotime($m['sent_at']));
                    $isMe = ((int) ($m['sender_id'] ?? 0) === $userId || $m['sender_name'] === $_SESSION['user_name']); ?>
                    <?php if ($date !== $lastDate):
                        $lastDate = $date; ?>
                        <div class="msg-day-label"><?= e($date) ?></div>
                    <?php endif; ?>
                    <div class="msg-row <?= $isMe ? 'from-me' : '' ?>">
                        <?php if (!$isMe): ?>
                            <div class="msg-avatar-small"><?= strtoupper(substr($m['sender_name'], 0, 1)) ?></div>
                        <?php else: ?>
                            <div class="msg-spacer"></div><?php endif; ?>
                        <div>
                            <?php if (!$isMe): ?>
                                <div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;padding-left:4px">
                                    <?= e($m['sender_name']) ?>
                                </div><?php endif; ?>
                            <div class="msg-bubble"><?= nl2br(e($m['body'])) ?></div>
                            <div class="msg-time"><?= formatChatTime($m['sent_at']) ?></div>
                        </div>
                    </div>
                <?php endforeach; ?>
                <?php if (empty($messages)): ?>
                    <div style="margin:auto;text-align:center;color:var(--gray-500)">
                        <div style="font-size:32px;margin-bottom:8px">💬</div>
                        <div style="font-size:14px">No messages yet. Say hello!</div>
                    </div>
                <?php endif; ?>
            </div>

            <div class="chat-input-bar">
                <div class="chat-input-wrap">
                    <button class="chat-attach-btn" title="Attach file">📎</button>
                    <textarea class="chat-input" id="msg-input" placeholder="Type a message…" rows="1"></textarea>
                </div>
                <button class="chat-send-btn" id="send-btn" title="Send">➤</button>
            </div>

        <?php else: ?>
            <div
                style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--gray-500)">
                <div style="font-size:48px;margin-bottom:12px">💬</div>
                <div style="font-size:15px;font-weight:500;color:var(--gray-700)">Select a conversation</div>
                <div style="font-size:13px;margin-top:4px">Choose from your channels on the left</div>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
    const ROOM_ID = <?= $activeRoomId ?>;
    const USER_ID = <?= $userId ?>;
    const POLL_MS = <?= CHAT_POLL_MS ?>;
    const API_BASE = '<?= APP_URL ?>/intercom/api';
    let lastId = <?= !empty($messages) ? end($messages)['id'] : 0 ?>;

    function scrollBottom() {
        const c = document.getElementById('msg-container');
        if (c) c.scrollTop = c.scrollHeight;
    }
    scrollBottom();

    // Auto-resize textarea
    const input = document.getElementById('msg-input');
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }

    function sendMessage() {
        if (!ROOM_ID || !input) return;
        const body = input.value.trim();
        if (!body) return;
        input.value = ''; input.style.height = 'auto';
        fetch(`${API_BASE}/send-message.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `room_id=${ROOM_ID}&body=${encodeURIComponent(body)}`
        }).then(r => r.json()).then(d => { if (d.id) { lastId = d.id; pollMessages(); } });
    }

    document.getElementById('send-btn')?.addEventListener('click', sendMessage);

    function pollMessages() {
        if (!ROOM_ID) return;
        fetch(`${API_BASE}/fetch-messages.php?room_id=${ROOM_ID}&since_id=${lastId}`)
            .then(r => r.json()).then(msgs => {
                if (!msgs.length) return;
                const c = document.getElementById('msg-container');
                const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 60;
                msgs.forEach(m => {
                    lastId = Math.max(lastId, m.id);
                    const isMe = m.sender_id == USER_ID;
                    const div = document.createElement('div');
                    div.className = 'msg-row' + (isMe ? ' from-me' : '');
                    div.innerHTML = (isMe
                        ? `<div class="msg-spacer"></div>`
                        : `<div class="msg-avatar-small">${m.sender_name[0].toUpperCase()}</div>`)
                        + `<div>${!isMe ? `<div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;padding-left:4px">${m.sender_name}</div>` : ''}
             <div class="msg-bubble">${m.body.replace(/\n/g, '<br>')}</div>
             <div class="msg-time">${m.sent_at}</div></div>`;
                    c.appendChild(div);
                });
                if (atBottom) scrollBottom();
            }).catch(() => { });
    }

    if (ROOM_ID) setInterval(pollMessages, POLL_MS);
</script>
<?php require_once __DIR__ . '/../../footer.php'; ?>