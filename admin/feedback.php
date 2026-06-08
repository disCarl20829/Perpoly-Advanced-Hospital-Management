<?php
/**
 * admin/feedback.php
 * View patient contact messages / queries submitted via the portal.
 *
 * Usage pattern (same for every page):
 *   1. Set $pageTitle, $activeNav, optional $extraCss / $extraJs
 *   2. Load config + includes
 *   3. Do your logic (queries, POST handling)
 *   4. require header.php  → outputs HTML head + sidebar + topbar
 *   5. Write your page HTML
 *   6. require footer.php  → closes layout + loads JS
 */
$pageTitle = 'Feedback & Queries';
$activeNav = 'feedback';

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';
require_once __DIR__ . '/../include/rbac.php';

requireLogin();
RBAC::enforce('access_admin_panel');

// Mark a message as read
if (isPost() && verifyCsrf(post('csrf_token'))) {
    $action = post('action');
    if ($action === 'read') {
        DB::run('UPDATE feedback SET is_read = 1 WHERE id = ?', [sanitizeInt(post('id'))]);
    } elseif ($action === 'delete') {
        DB::run('DELETE FROM feedback WHERE id = ?', [sanitizeInt(post('id'))]);
        setFlash('success', 'Message deleted.');
    }
    redirect('/admin/feedback.php');
}

$filter = sanitize(get('filter', 'all')); // all | unread | read
$page = max(1, (int) get('page', 1));
$where = $filter === 'unread' ? ' WHERE is_read = 0'
    : ($filter === 'read' ? ' WHERE is_read = 1' : '');
$total = DB::one("SELECT COUNT(*) AS n FROM feedback$where")['n'] ?? 0;
$pg = paginate($total, 15, $page);
$messages = DB::all(
    "SELECT * FROM feedback$where ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [$pg['perPage'], $pg['offset']]
);
$unreadCount = DB::one('SELECT COUNT(*) AS n FROM feedback WHERE is_read = 0')['n'] ?? 0;

require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Feedback &amp; Queries</h1>
            <p>
                <?= $total ?> messages
                <?php if ($unreadCount): ?>
                    &mdash; <span style="color:var(--green);font-weight:600">
                        <?= $unreadCount ?> unread
                    </span>
                <?php endif; ?>
            </p>
        </div>
    </div>

    <!-- Filter tabs -->
    <div style="display:flex;gap:8px;margin-bottom:16px">
        <?php foreach (['all' => 'All', 'unread' => 'Unread', 'read' => 'Read'] as $val => $label):
            $active = ($filter === $val) ? ' btn-primary' : ' btn-outline'; ?>
            <a href="?filter=<?= $val ?>" class="btn btn-sm<?= $active ?>">
                <?= $label ?>
            </a>
        <?php endforeach; ?>
    </div>

    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>From</th>
                        <th>Email</th>
                        <th>Message</th>
                        <th>Received</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($messages as $msg): ?>
                        <tr style="<?= !$msg['is_read'] ? 'background:var(--navy-pale)' : '' ?>">
                            <td><strong>
                                    <?= e($msg['name']) ?>
                                </strong></td>
                            <td>
                                <?= e($msg['email']) ?>
                            </td>
                            <td style="max-width:320px;white-space:normal;font-size:13px;color:var(--gray-700)">
                                <?= e(mb_strimwidth($msg['message'], 0, 120, '…')) ?>
                            </td>
                            <td style="white-space:nowrap">
                                <?= formatDateTime($msg['created_at']) ?>
                            </td>
                            <td>
                                <?php if ($msg['is_read']): ?>
                                    <span class="badge badge-gray">Read</span>
                                <?php else: ?>
                                    <span class="badge badge-green">New</span>
                                <?php endif; ?>
                            </td>
                            <td style="display:flex;gap:6px;flex-wrap:wrap">
                                <?php if (!$msg['is_read']): ?>
                                    <form method="POST" style="display:inline">
                                        <?= csrfField() ?>
                                        <input type="hidden" name="action" value="read">
                                        <input type="hidden" name="id" value="<?= $msg['id'] ?>">
                                        <button class="btn btn-outline btn-sm">Mark Read</button>
                                    </form>
                                <?php endif; ?>
                                <button class="btn btn-outline btn-sm"
                                    onclick="document.getElementById('msg-<?= $msg['id'] ?>').style.display='flex'">
                                    View
                                </button>
                                <form method="POST" style="display:inline"
                                    onsubmit="return confirm('Delete this message?')">
                                    <?= csrfField() ?>
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?= $msg['id'] ?>">
                                    <button class="btn btn-danger btn-sm">Delete</button>
                                </form>
                            </td>
                        </tr>

                        <!-- Full message modal (inline, hidden) -->
                        <tr id="msg-<?= $msg['id'] ?>" style="display:none">
                            <td colspan="6" style="background:var(--gray-50);padding:16px 20px">
                                <div
                                    style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                                    <strong style="color:var(--navy-dark)">Full Message from
                                        <?= e($msg['name']) ?>
                                    </strong>
                                    <button onclick="document.getElementById('msg-<?= $msg['id'] ?>').style.display='none'"
                                        style="background:none;border:none;cursor:pointer;color:var(--gray-500);font-size:18px">✕</button>
                                </div>
                                <div style="font-size:13.5px;color:var(--gray-700);line-height:1.7;white-space:pre-wrap">
                                    <?= e($msg['message']) ?>
                                </div>
                                <div style="margin-top:10px">
                                    <a href="mailto:<?= e($msg['email']) ?>" class="btn btn-green btn-sm">✉ Reply via
                                        Email</a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>

                    <?php if (empty($messages)): ?>
                        <tr>
                            <td colspan="6" style="text-align:center;padding:40px;color:var(--gray-500)">
                                No messages found.
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <?php if ($pg['pages'] > 1): ?>
            <div class="card-footer" style="display:flex;gap:8px">
                <?php for ($i = 1; $i <= $pg['pages']; $i++):
                    $a = ($i === $pg['current']) ? ' btn-primary' : ' btn-outline'; ?>
                    <a href="?filter=<?= e($filter) ?>&page=<?= $i ?>" class="btn btn-sm<?= $a ?>">
                        <?= $i ?>
                    </a>
                <?php endfor; ?>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>