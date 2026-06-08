<?php
$pageTitle = 'My Appointments';
$activeNav = 'appointments';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
$docId = (int) $_SESSION['user_id'];

if (isPost() && verifyCsrf(post('csrf_token'))) {
    $id = sanitizeInt(post('id'));
    DB::run('UPDATE appointments SET status=\'cancelled\' WHERE id=? AND doctor_id=?', [$id, $docId]);
    setFlash('success', 'Appointment cancelled.');
    redirect('/doctor/my-appointments.php');
}

$filter = sanitize(get('status', 'all'));
$page = max(1, (int) get('page', 1));
$where = $filter !== 'all' ? ' AND a.status=?' : ' ';
$wp = $filter !== 'all' ? [$docId, $filter] : [$docId];
$total = DB::one("SELECT COUNT(*) AS n FROM appointments a WHERE a.doctor_id=?$where", $wp)['n'] ?? 0;
$pg = paginate($total, 12, $page);
$wp[] = $pg['perPage'];
$wp[] = $pg['offset'];
$appts = DB::all("SELECT a.*,p.full_name AS pname,p.contact FROM appointments a
    JOIN patients p ON p.id=a.patient_id WHERE a.doctor_id=?$where ORDER BY a.appt_date DESC LIMIT ? OFFSET ?", $wp);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>My Appointments</h1>
        <p>
            <?= $total ?> records
        </p>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
        <?php foreach (['all', 'pending', 'confirmed', 'done', 'cancelled'] as $s):
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
                        <th>Contact</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($appts as $a): ?>
                        <tr>
                            <td>
                                <?= e($a['pname']) ?>
                            </td>
                            <td>
                                <?= e($a['contact']) ?>
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
                            <td style="display:flex;gap:6px">
                                <a href="<?= APP_URL ?>/doctor/prescribe.php?appt_id=<?= $a['id'] ?>"
                                    class="btn btn-green btn-sm">Prescribe</a>
                                <?php if ($a['status'] !== 'cancelled' && $a['status'] !== 'done'): ?>
                                    <form method="POST" style="display:inline"
                                        onsubmit="return confirm('Cancel this appointment?')">
                                        <?= csrfField() ?><input type="hidden" name="id" value="<?= $a['id'] ?>">
                                        <button class="btn btn-danger btn-sm">Cancel</button>
                                    </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>