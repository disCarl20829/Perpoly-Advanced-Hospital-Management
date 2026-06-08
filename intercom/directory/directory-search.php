<?php
$pageTitle = 'Search Personnel';
$activeNav = 'directory';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/func.php';
requireLogin();

$q = sanitize(get('q'));
$deptId = sanitizeInt(get('dept_id', 0));
$divId = sanitizeInt(get('div_id', 0));
$role = sanitizeInt(get('role', 0));

$where = ['u.status=\'active\''];
$params = [];
if ($q) {
    $where[] = '(u.full_name LIKE ? OR u.email LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($deptId) {
    $where[] = 'u.dept_id=?';
    $params[] = $deptId;
}
if ($divId) {
    $where[] = 'u.div_id=?';
    $params[] = $divId;
}
if ($role) {
    $where[] = 'u.role=?';
    $params[] = $role;
}
$whereStr = implode(' AND ', $where);

$staff = DB::all("SELECT u.*,d.name AS dept_name,dv.name AS div_name FROM users u
    LEFT JOIN departments d ON d.id=u.dept_id
    LEFT JOIN divisions dv ON dv.id=u.div_id
    WHERE $whereStr ORDER BY u.role,u.full_name LIMIT 60", $params);
$departments = DB::all('SELECT id,name FROM departments ORDER BY name');
$divisions = DB::all('SELECT id,name FROM divisions ORDER BY name');
require_once __DIR__ . '/../../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Search Personnel</h1>
        <p><?= count($staff) ?> results</p>
    </div>
    <form method="GET" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Name or email…" style="max-width:220px">
        <select class="form-control form-select" name="div_id" style="max-width:180px">
            <option value="">All Divisions</option>
            <?php foreach ($divisions as $dv): ?>
                <option value="<?= $dv['id'] ?>" <?= $divId == $dv['id'] ? 'selected' : '' ?>><?= e($dv['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <select class="form-control form-select" name="dept_id" style="max-width:180px">
            <option value="">All Departments</option>
            <?php foreach ($departments as $d): ?>
                <option value="<?= $d['id'] ?>" <?= $deptId == $d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <select class="form-control form-select" name="role" style="max-width:180px">
            <option value="">All Roles</option>
            <?php foreach (ROLE_LABELS as $k => $v): ?>
                <option value="<?= $k ?>" <?= $role == $k ? 'selected' : '' ?>><?= e($v) ?></option><?php endforeach; ?>
        </select>
        <button class="btn btn-primary">Search</button>
        <a href="?" class="btn btn-outline">Clear</a>
    </form>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
        <?php foreach ($staff as $s): ?>
            <div class="card" style="transition:box-shadow .2s,transform .2s"
                onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.boxShadow='';this.style.transform=''">
                <div class="card-body" style="display:flex;gap:12px;align-items:flex-start">
                    <div class="chat-avatar navy" style="width:44px;height:44px;font-size:17px;flex-shrink:0">
                        <?= strtoupper(substr($s['full_name'], 0, 1)) ?>
                        <?php if ($s['is_online'] ?? false): ?><span class="online-dot"></span><?php endif; ?>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:14px;color:var(--navy-dark)"><?= e($s['full_name']) ?></div>
                        <div style="font-size:12px;color:var(--gray-500);margin-top:2px">
                            <?= e(ROLE_LABELS[$s['role']] ?? 'Staff') ?></div>
                        <div style="font-size:12px;color:var(--gray-500)"><?= e($s['dept_name'] ?? '—') ?></div>
                        <?php if ($s['div_name'] ?? ''): ?>
                            <div style="font-size:11.5px;color:var(--gray-300)"><?= e($s['div_name']) ?></div><?php endif; ?>
                    </div>
                </div>
                <div class="card-footer" style="display:flex;gap:8px;padding:10px 16px">
                    <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php?user=<?= $s['id'] ?>"
                        class="btn btn-outline btn-sm" style="flex:1;justify-content:center">💬 Message</a>
                </div>
            </div>
        <?php endforeach; ?>
        <?php if (empty($staff)): ?>
            <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--gray-500)">No personnel found matching
                your search.</div>
        <?php endif; ?>
    </div>
</div>
<?php require_once __DIR__ . '/../../footer.php'; ?>