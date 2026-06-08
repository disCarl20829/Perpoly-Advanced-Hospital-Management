<?php
$pageTitle = 'Manage Staff';
$activeNav = 'staff';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('manage_staff');

if (isPost() && verifyCsrf(post('csrf_token'))) {
    $action = post('action');
    if ($action === 'add') {
        DB::insert(
            'INSERT INTO users (full_name,email,password,role,dept_id,div_id,status,created_at) VALUES(?,?,?,?,?,?,\'active\',NOW())',
            [
                sanitize(post('full_name')),
                sanitize(post('email')),
                password_hash(post('password'), PASSWORD_BCRYPT),
                sanitizeInt(post('role')),
                sanitizeInt(post('dept_id')),
                sanitizeInt(post('div_id'))
            ]
        );
        setFlash('success', 'Staff member added.');
        redirect('/admin/manage-staff.php');
    } elseif ($action === 'delete') {
        DB::run('UPDATE users SET status=\'inactive\' WHERE id=?', [sanitizeInt(post('id'))]);
        setFlash('success', 'Staff member deactivated.');
        redirect('/admin/manage-staff.php');
    }
}
$search = sanitize(get('q'));
$staff = DB::all('SELECT u.*,d.name AS dept_name FROM users u LEFT JOIN departments d ON d.id=u.dept_id
    WHERE u.status=\'active\' AND u.role>=? AND u.full_name LIKE ? ORDER BY u.role,u.full_name',
    [ROLE_DIV_HEAD, "%$search%"]
);
$departments = DB::all('SELECT id,name FROM departments ORDER BY name');
$divisions = DB::all('SELECT id,name FROM divisions ORDER BY name');
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Staff Directory</h1>
            <p>
                <?= count($staff) ?> active personnel
            </p>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('add-modal').style.display='flex'">+ Add
            Staff</button>
    </div>
    <form method="GET" style="margin-bottom:16px;display:flex;gap:10px">
        <input class="form-control" name="q" value="<?= e($search) ?>" placeholder="Search staff…"
            style="max-width:300px">
        <button class="btn btn-outline">Search</button>
    </form>
    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($staff as $s): ?>
                        <tr>
                            <td><strong>
                                    <?= e($s['full_name']) ?>
                                </strong></td>
                            <td>
                                <?= e($s['email']) ?>
                            </td>
                            <td><span class="badge badge-blue">
                                    <?= e(ROLE_LABELS[$s['role']] ?? 'Staff') ?>
                                </span></td>
                            <td>
                                <?= e($s['dept_name'] ?? '—') ?>
                            </td>
                            <td style="display:flex;gap:6px">
                                <form method="POST" style="display:inline" onsubmit="return confirm('Deactivate?')">
                                    <?= csrfField() ?><input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?= $s['id'] ?>">
                                    <button class="btn btn-danger btn-sm">Remove</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="add-modal"
    style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center">
    <div class="card" style="width:480px;max-height:90vh;overflow-y:auto">
        <div class="card-header">
            <h2>Add Staff Member</h2>
            <button onclick="document.getElementById('add-modal').style.display='none'"
                style="background:none;border:none;font-size:20px;cursor:pointer">✕</button>
        </div>
        <div class="card-body">
            <form method="POST">
                <?= csrfField() ?><input type="hidden" name="action" value="add">
                <div class="form-group"><label class="form-label">Full Name</label><input class="form-control"
                        name="full_name" required></div>
                <div class="form-group"><label class="form-label">Email</label><input class="form-control" type="email"
                        name="email" required></div>
                <div class="form-group"><label class="form-label">Role</label>
                    <select class="form-control form-select" name="role">
                        <?php foreach (ROLE_LABELS as $k => $v):
                            if ($k === ROLE_ADMIN)
                                continue; ?>
                            <option value="<?= $k ?>">
                                <?= e($v) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Division</label>
                    <select class="form-control form-select" name="div_id">
                        <?php foreach ($divisions as $div): ?>
                            <option value="<?= $div['id'] ?>">
                                <?= e($div['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Department</label>
                    <select class="form-control form-select" name="dept_id">
                        <?php foreach ($departments as $dept): ?>
                            <option value="<?= $dept['id'] ?>">
                                <?= e($dept['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Temp Password</label><input class="form-control"
                        type="password" name="password" required></div>
                <button class="btn btn-primary btn-block">Add Staff</button>
            </form>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>