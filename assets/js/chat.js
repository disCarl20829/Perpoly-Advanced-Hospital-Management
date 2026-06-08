function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// Notify service worker of new message (optional PWA enhancement)
function notifyNewMessage(senderName, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('HMS — ' + senderName, { body: body.substring(0, 80), icon: '/hms/assets/images/logo.jpg' });
    }
}

// Request notification permission on first visit
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}