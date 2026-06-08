<?php
$pageTitle = 'Appointments';
$activeNav = 'appointments';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();

if (isPost() && verifyCsrf(post('csrf_token'))) {
    $id = sanitizeInt(post('id'));
    $status = sanitize(post('status'));
    $allowed = ['pending', 'confirmed', 'cancelled', 'done'];
    if (in_array($status, $allowed))
        DB::run('UPDATE appointments SET status=? WHERE id=?', [$status, $id]);
    setFlash('success', 'Appointment updated.');
    redirect('/admin/appointments-list.php');
}

$filter = sanitize(get('status', 'all'));
$page = max(1, (int) get('page', 1));
$where = $filter !== 'all' ? ' AND a.status=?' : ' ';
$params = $filter !== 'all' ? [$filter] : [];
$total = DB::one("SELECT COUNT(*) AS n FROM appointments a WHERE 1=1$where", $params)['n'] ?? 0;
$p = paginate($total, 15, $page);
$params2 = $params;
$params2[] = $p['perPage'];
$params2[] = $p['offset'];
$appts = DB::all("SELECT a.*,p.full_name AS pname,u.full_name AS dname
    FROM appointments a
    JOIN patients p ON p.id=a.patient_id
    JOIN users u ON u.id=a.doctor_id
    WHERE 1=1$where ORDER BY a.appt_date DESC LIMIT ? OFFSET ?", $params2);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Appointments</h1>
        <p>
            <?= $total ?> total records
        </p>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
        <?php foreach (['all', 'pending', 'confirmed', 'cancelled', 'done'] as $s):
            $a = ($filter === $s ? ' btn-primary' : ' btn-outline'); ?>
            <a href="?status=<?= $s ?>" class="btn btn-sm<?= $a ?>">
                <?= ucfirst($s) ?>
            </a>
        <?php endforeach; ?>
    </div>
    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Change Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($appts as $a): ?>
                        <tr>
                            <td>
                                <?= e($a['pname']) ?>
                            </td>
                            <td>
                                <?= e($a['dname']) ?>
                            </td>
                            <td>
                                <?= formatDate($a['appt_date']) ?>
                            </td>
                            <td>
                                <?= e($a['appt_time']) ?>
                            </td>
                            <td>
                                <?php $cls = ['pending' => 'badge-warn', 'confirmed' => 'badge-green', 'cancelled' => 'badge-danger', 'done' => 'badge-blue']; ?>
                                <span class="badge <?= $cls[$a['status']] ?? 'badge-gray' ?>">
                                    <?= ucfirst(e($a['status'])) ?>
                                </span>
                            </td>
                            <td>
                                <form method="POST" style="display:flex;gap:4px">
                                    <?= csrfField() ?><input type="hidden" name="id" value="<?= $a['id'] ?>">
                                    <select class="form-control form-select" name="status"
                                        style="padding:5px 28px 5px 8px;font-size:12px">
                                        <?php foreach (['pending', 'confirmed', 'cancelled', 'done'] as $s): ?>
                                            <option value="<?= $s ?>" <?= $a['status'] === $s ? 'selected' : '' ?>>
                                                <?= ucfirst($s) ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                    <button class="btn btn-outline btn-sm">Save</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>