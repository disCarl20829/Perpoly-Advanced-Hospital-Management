// HMS Global JS

// ── Mobile sidebar toggle ─────────────────────────
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
if (menuBtn) menuBtn.style.display = 'flex';

// Overlay click close
document.addEventListener('click', e => {
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== menuBtn) {
        sidebar.classList.remove('open');
    }
});

// ── Unread badge polling ──────────────────────────
function pollUnread() {
    fetch(window.APP_URL + '/intercom/api/fetch-messages.php?unread_count=1')
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById('unread-badge');
            const dot = document.getElementById('chat-dot');
            const count = data.total ?? 0;
            if (badge) { badge.textContent = count; badge.style.display = count ? 'inline' : 'none'; }
            if (dot) dot.style.display = count ? 'block' : 'none';
        }).catch(() => { });
}
if (typeof APP_URL !== 'undefined') setInterval(pollUnread, 15000);

// ── Global search (placeholder — hook to appsearch.php) ──
const globalSearch = document.getElementById('global-search');
if (globalSearch) {
    let timer;
    globalSearch.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const q = globalSearch.value.trim();
            if (q.length >= 2) window.location = (window.APP_URL || '') + '/search/appsearch.php?q=' + encodeURIComponent(q);
        }, 400);
    });
}

// ── Auto-dismiss alerts ───────────────────────────
document.querySelectorAll('.alert').forEach(el => {
    setTimeout(() => {
        el.style.transition = 'opacity .5s'; el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 5000);
});