<?php
/**
 * search/doctorsearch.php — Doctor-specific search
 * Searches by name, specialization, or department.
 * Returns JSON when ?format=json (for AJAX), HTML page otherwise.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';
require_once __DIR__ . '/../include/rbac.php';

requireLogin();

$q = sanitize(get('q'));
$deptId = sanitizeInt(get('dept_id', 0));
$format = sanitize(get('format', 'html'));

$where = ['u.status = \'active\'', 'u.role = ' . ROLE_DEPT_HEAD];
$params = [];

if ($q) {
    $where[] = '(u.full_name LIKE ? OR u.specialization LIKE ? OR u.email LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($deptId) {
    $where[] = 'u.dept_id = ?';
    $params[] = $deptId;
}

$whereStr = implode(' AND ', $where);
$doctors = DB::all(
    "SELECT u.id, u.full_name, u.email, u.specialization, u.is_online,
            d.name AS dept_name,
            (SELECT COUNT(*) FROM appointments WHERE doctor_id = u.id AND status = 'done') AS completed
     FROM users u
     LEFT JOIN departments d ON d.id = u.dept_id
     WHERE $whereStr
     ORDER BY u.full_name ASC LIMIT 40",
    $params
);
$departments = DB::all('SELECT id, name FROM departments ORDER BY name');

// JSON response for AJAX autocomplete
if ($format === 'json') {
    header('Content-Type: application/json');
    echo json_encode(array_map(fn($d) => [
        'id' => $d['id'],
        'label' => $d['full_name'] . ' — ' . ($d['specialization'] ?? $d['dept_name'] ?? ''),
        'full_name' => $d['full_name'],
        'specialization' => $d['specialization'] ?? '',
        'dept_name' => $d['dept_name'] ?? '',
        'is_online' => (bool) $d['is_online'],
    ], $doctors));
    exit;
}

// HTML page
$pageTitle = 'Doctor Search';
$activeNav = 'doctors';
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Doctor Search</h1>
        <p>Search by name, specialization, or department</p>
    </div>

    <form method="GET" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
        <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Name or specialization…"
            style="max-width:260px" autofocus>
        <select class="form-control form-select" name="dept_id" style="max-width:200px">
            <option value="">All Departments</option>
            <?php foreach ($departments as $d): ?>
                <option value="<?= $d['id'] ?>" <?= $deptId == $d['id'] ? 'selected' : '' ?>>
                    <?= e($d['name']) ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button class="btn btn-primary">Search</button>
        <?php if ($q || $deptId): ?>
            <a href="?" class="btn btn-outline">Clear</a>
        <?php endif; ?>
    </form>

    <?php if (!empty($doctors)): ?>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px">
            <?= count($doctors) ?> doctor
            <?= count($doctors) !== 1 ? 's' : '' ?> found
        </p>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Specialization</th>
                            <th>Department</th>
                            <th>Completed</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($doctors as $d): ?>
                            <tr>
                                <td>
                                    <div style="display:flex;align-items:center;gap:9px">
                                        <div class="chat-avatar navy"
                                            style="width:32px;height:32px;font-size:12px;flex-shrink:0;position:relative">
                                            <?= strtoupper(substr($d['full_name'], 0, 1)) ?>
                                            <?php if ($d['is_online']): ?>
                                                <span class="online-dot"></span>
                                            <?php endif; ?>
                                        </div>
                                        <div>
                                            <strong style="font-size:13.5px">
                                                <?= e($d['full_name']) ?>
                                            </strong><br>
                                            <span style="font-size:11.5px;color:var(--gray-500)">
                                                <?= e($d['email']) ?>
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <?= e($d['specialization'] ?? '—') ?>
                                </td>
                                <td>
                                    <?= e($d['dept_name'] ?? '—') ?>
                                </td>
                                <td><span class="badge badge-blue">
                                        <?= $d['completed'] ?> appts
                                    </span></td>
                                <td>
                                    <?php if ($d['is_online']): ?>
                                        <span class="badge badge-green">Online</span>
                                    <?php else: ?>
                                        <span class="badge badge-gray">Offline</span>
                                    <?php endif; ?>
                                </td>
                                <td style="display:flex;gap:6px">
                                    <a href="<?= APP_URL ?>/doctor/doctor-panel.php?id=<?= $d['id'] ?>"
                                        class="btn btn-outline btn-sm">Profile</a>
                                    <a href="<?= APP_URL ?>/patient/book-appointment.php?doctor_id=<?= $d['id'] ?>"
                                        class="btn btn-primary btn-sm">Book</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    <?php elseif ($q || $deptId): ?>
        <div class="alert alert-info"><span>ℹ</span><span>No doctors found matching your search.</span></div>
    <?php else: ?>
        <div style="text-align:center;padding:60px 0;color:var(--gray-300)">
            <div style="font-size:48px;margin-bottom:12px">👨‍⚕️</div>
            <div style="font-size:15px;color:var(--gray-500)">Enter a name or select a department to search.</div>
        </div>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>