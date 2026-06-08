<?php
$pageTitle = 'Patient Dashboard';
$activeNav = 'dashboard';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
$ptId = sanitizeInt(get('id', 0)) ?: (int) $_SESSION['user_id'];
$patient = DB::one('SELECT * FROM patients WHERE id=?', [$ptId]);
if (!$patient)
    redirect('/index.php');

$upcoming = DB::all('SELECT a.*,u.full_name AS dname,u.specialization FROM appointments a
    JOIN users u ON u.id=a.doctor_id WHERE a.patient_id=? AND a.appt_date>=NOW()
    AND a.status!=\'cancelled\' ORDER BY a.appt_date ASC LIMIT 5', [$ptId]);
$history = DB::all('SELECT a.*,u.full_name AS dname FROM appointments a
    JOIN users u ON u.id=a.doctor_id WHERE a.patient_id=? AND (a.appt_date<NOW() OR a.status=\'cancelled\')
    ORDER BY a.appt_date DESC LIMIT 5', [$ptId]);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Hello, <?= e(explode(' ', $patient['full_name'])[0]) ?> 👋</h1>
        <p>Your health overview</p>
    </div>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon blue">📅</div>
            <div class="stat-info"><strong><?= count($upcoming) ?></strong><span>Upcoming Appointments</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green">✓</div>
            <div class="stat-info">
                <strong><?= DB::one('SELECT COUNT(*) AS n FROM appointments WHERE patient_id=? AND status=\'done\'', [$ptId])['n'] ?? 0 ?></strong><span>Completed
                    Visits</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">🩸</div>
            <div class="stat-info"><strong><?= e($patient['blood_group'] ?? '—') ?></strong><span>Blood Group</span></div>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
            <div class="card-header">
                <h2>Upcoming Appointments</h2>
                <a href="<?= APP_URL ?>/patient/book-appointment.php" class="btn btn-primary btn-sm">+ Book</a>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
                <?php foreach ($upcoming as $a): ?>
                    <div
                        style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--navy-pale);border-radius:var(--radius-sm)">
                        <div><strong style="font-size:13.5px"><?= e($a['dname']) ?></strong>
                            <div style="font-size:12px;color:var(--gray-500)"><?= e($a['specialization'] ?? '') ?></div>
                            <div style="font-size:12px;color:var(--navy)"><?= formatDateTime($a['appt_date']) ?></div>
                        </div>
                        <span class="badge badge-green"><?= ucfirst(e($a['status'])) ?></span>
                    </div>
                <?php endforeach; ?>
                <?php if (empty($upcoming)): ?>
                    <p style="color:var(--gray-500);font-size:13.5px;text-align:center;padding:20px 0">No upcoming
                        appointments. <a href="<?= APP_URL ?>/patient/book-appointment.php">Book one</a>!</p><?php endif; ?>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Visit History</h2>
                <a href="<?= APP_URL ?>/patient/appointment-history.php" class="btn btn-outline btn-sm">View All</a>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
                <?php foreach ($history as $a): ?>
                    <div
                        style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--gray-50);border-radius:var(--radius-sm);border:1px solid var(--gray-100)">
                        <div><strong style="font-size:13.5px"><?= e($a['dname']) ?></strong>
                            <div style="font-size:12px;color:var(--gray-500)"><?= formatDate($a['appt_date']) ?></div>
                        </div>
                        <?php $cls = ['done' => 'badge-blue', 'cancelled' => 'badge-danger']; ?>
                        <span class="badge <?= $cls[$a['status']] ?? 'badge-gray' ?>"><?= ucfirst(e($a['status'])) ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>