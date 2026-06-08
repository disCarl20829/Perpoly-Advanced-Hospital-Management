<?php
$pageTitle = 'Doctor Dashboard';
$activeNav = 'dashboard';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();

$docId = sanitizeInt(get('id', $GLOBALS['_SESSION']['user_id'] ?? 0)) ?: (int) $_SESSION['user_id'];
$doctor = DB::one('SELECT u.*,d.name AS dept_name FROM users u LEFT JOIN departments d ON d.id=u.dept_id WHERE u.id=?', [$docId]);
if (!$doctor)
    redirect('/index.php');

$todayAppts = DB::all(
    'SELECT a.*,p.full_name AS pname,p.contact,p.blood_group FROM appointments a
     JOIN patients p ON p.id=a.patient_id
     WHERE a.doctor_id=? AND DATE(a.appt_date)=CURDATE() ORDER BY a.appt_date ASC',
    [$docId]
);
$stats = [
    'today' => count($todayAppts),
    'pending' => DB::one('SELECT COUNT(*) AS n FROM appointments WHERE doctor_id=? AND status=\'pending\'', [$docId])['n'] ?? 0,
    'done' => DB::one('SELECT COUNT(*) AS n FROM appointments WHERE doctor_id=? AND status=\'done\'', [$docId])['n'] ?? 0,
];
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Dr. <?= e($doctor['full_name']) ?></h1>
        <p><?= e($doctor['specialization'] ?? 'General') ?> &mdash; <?= e($doctor['dept_name'] ?? '') ?></p>
    </div>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon blue">📅</div>
            <div class="stat-info"><strong><?= $stats['today'] ?></strong><span>Today's Appointments</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warn">⏳</div>
            <div class="stat-info"><strong><?= $stats['pending'] ?></strong><span>Pending Approval</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green">✓</div>
            <div class="stat-info"><strong><?= $stats['done'] ?></strong><span>Completed Total</span></div>
        </div>
    </div>
    <div class="card">
        <div class="card-header">
            <h2>Today's Schedule</h2>
            <a href="<?= APP_URL ?>/doctor/my-appointments.php" class="btn btn-outline btn-sm">All Appointments</a>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Contact</th>
                        <th>Blood</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($todayAppts as $a): ?>
                        <tr>
                            <td><strong><?= e($a['appt_time']) ?></strong></td>
                            <td><?= e($a['pname']) ?></td>
                            <td><?= e($a['contact']) ?></td>
                            <td><span class="badge badge-danger"><?= e($a['blood_group'] ?? '—') ?></span></td>
                            <td><?php $cls = ['pending' => 'badge-warn', 'confirmed' => 'badge-green', 'cancelled' => 'badge-danger', 'done' => 'badge-blue']; ?>
                                <span
                                    class="badge <?= $cls[$a['status']] ?? 'badge-gray' ?>"><?= ucfirst(e($a['status'])) ?></span>
                            </td>
                            <td><a href="<?= APP_URL ?>/doctor/prescribe.php?appt_id=<?= $a['id'] ?>"
                                    class="btn btn-green btn-sm">Prescribe</a></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (empty($todayAppts)): ?>
                        <tr>
                            <td colspan="6" style="text-align:center;padding:32px;color:var(--gray-500)">No appointments
                                today.</td>
                        </tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>