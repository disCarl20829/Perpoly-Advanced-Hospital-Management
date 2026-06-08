<?php
$pageTitle = 'Manage Doctors';
$activeNav = 'doctors';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('manage_doctors');

// Handle POST: add doctor
if (isPost() && verifyCsrf(post('csrf_token'))) {
    $action = post('action');
    if ($action === 'add') {
        $hashed = password_hash(post('password'), PASSWORD_BCRYPT);
        DB::insert(
            'INSERT INTO users (full_name,email,password,role,specialization,dept_id,status,created_at)
             VALUES (?,?,?,?,?,?,\'active\',NOW())',
            [
                sanitize(post('full_name')),
                sanitize(post('email')),
                $hashed,
                ROLE_DEPT_HEAD,
                sanitize(post('specialization')),
                sanitizeInt(post('dept_id'))
            ]
        );
        setFlash('success', 'Doctor added successfully.');
    } elseif ($action === 'delete') {
        DB::run('UPDATE users SET status=\'inactive\' WHERE id=?', [sanitizeInt(post('id'))]);
        setFlash('success', 'Doctor deactivated.');
    }
    redirect('/admin/manage-doctors.php');
}

$page = max(1, (int) get('page', 1));
$search = sanitize(get('q'));
$total = DB::one(
    'SELECT COUNT(*) AS n FROM users WHERE role=? AND status=\'active\' AND full_name LIKE ?',
    [ROLE_DEPT_HEAD, "%$search%"]
)['n'] ?? 0;
$p = paginate($total, 10, $page);
$doctors = DB::all(
    'SELECT u.*, d.name AS dept_name FROM users u
     LEFT JOIN departments d ON d.id=u.dept_id
     WHERE u.role=? AND u.status=\'active\' AND u.full_name LIKE ?
     ORDER BY u.full_name ASC LIMIT ? OFFSET ?',
    [ROLE_DEPT_HEAD, "%$search%", $p['perPage'], $p['offset']]
);
$departments = DB::all('SELECT id,name FROM departments ORDER BY name');
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Doctors</h1>
            <p>
                <?= $total ?> active doctors
            </p>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('add-modal').style.display='flex'">+ Add
            Doctor</button>
    </div>

    <!-- Search -->
    <form method="GET" style="margin-bottom:16px;display:flex;gap:10px">
        <input class="form-control" name="q" value="<?= e($search) ?>" placeholder="Search by name…"
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
                        <th>Specialization</th>
                        <th>Department</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($doctors as $d): ?>
                        <tr>
                            <td><strong>
                                    <?= e($d['full_name']) ?>
                                </strong></td>
                            <td>
                                <?= e($d['email']) ?>
                            </td>
                            <td>
                                <?= e($d['specialization'] ?? '—') ?>
                            </td>
                            <td>
                                <?= e($d['dept_name'] ?? '—') ?>
                            </td>
                            <td style="display:flex;gap:6px">
                                <a href="<?= APP_URL ?>/doctor/doctor-panel.php?id=<?= $d['id'] ?>"
                                    class="btn btn-outline btn-sm">View</a>
                                <form method="POST" style="display:inline"
                                    onsubmit="return confirm('Deactivate this doctor?')">
                                    <?= csrfField() ?><input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?= $d['id'] ?>">
                                    <button class="btn btn-danger btn-sm">Remove</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (empty($doctors)): ?>
                        <tr>
                            <td colspan="5" style="text-align:center;padding:32px;color:var(--gray-500)">No doctors found.
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php if ($p['pages'] > 1): ?>
            <div class="card-footer" style="display:flex;gap:8px">
                <?php for ($i = 1; $i <= $p['pages']; $i++):
                    $a = $i === $p['current'] ? ' btn-primary' : ' btn-outline'; ?>
                    <a href="?page=<?= $i ?>&q=<?= e($search) ?>" class="btn btn-sm<?= $a ?>">
                        <?= $i ?>
                    </a>
                <?php endfor; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<!-- Add Doctor Modal -->
<div id="add-modal"
    style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center">
    <div class="card" style="width:480px;max-height:90vh;overflow-y:auto">
        <div class="card-header">
            <h2>Add New Doctor</h2>
            <button onclick="document.getElementById('add-modal').style.display='none'"
                style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--gray-500)">✕</button>
        </div>
        <div class="card-body">
            <form method="POST">
                <?= csrfField() ?><input type="hidden" name="action" value="add">
                <div class="form-group"><label class="form-label">Full Name</label><input class="form-control"
                        name="full_name" required></div>
                <div class="form-group"><label class="form-label">Email</label><input class="form-control" type="email"
                        name="email" required></div>
                <div class="form-group"><label class="form-label">Specialization</label><input class="form-control"
                        name="specialization"></div>
                <div class="form-group"><label class="form-label">Department</label>
                    <select class="form-control form-select" name="dept_id">
                        <?php foreach ($departments as $dept): ?>
                            <option value="<?= $dept['id'] ?>">
                                <?= e($dept['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Temporary Password</label><input class="form-control"
                        type="password" name="password" required></div>
                <button class="btn btn-primary btn-block">Add Doctor</button>
            </form>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>