<?php
$pageTitle = 'Dashboard';
$activeNav = 'dashboard';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('access_admin_panel');

// Stats
$stats = [
    'doctors' => DB::one('SELECT COUNT(*) AS n FROM users WHERE role=?', [4])['n'] ?? 0,
    'patients' => DB::one('SELECT COUNT(*) AS n FROM patients')['n'] ?? 0,
    'today_appts' => DB::one('SELECT COUNT(*) AS n FROM appointments WHERE DATE(appt_date)=CURDATE()')['n'] ?? 0,
    'pending' => DB::one('SELECT COUNT(*) AS n FROM appointments WHERE status="pending"')['n'] ?? 0,
];
$recentAppts = DB::all(
    'SELECT a.*, p.full_name AS patient_name, u.full_name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id=a.patient_id
     JOIN users u ON u.id=a.doctor_id
     ORDER BY a.appt_date DESC LIMIT 8'
);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of hospital operations for <?= date('F j, Y') ?></p>
    </div>

    <!-- Stats -->
    <div class="stats-grid fade-up">
        <div class="stat-card fade-up-1">
            <div class="stat-icon blue">👨‍⚕️</div>
            <div class="stat-info"><strong><?= $stats['doctors'] ?></strong><span>Active Doctors</span></div>
        </div>
        <div class="stat-card fade-up-2">
            <div class="stat-icon green">🏥</div>
            <div class="stat-info"><strong><?= $stats['patients'] ?></strong><span>Registered Patients</span></div>
        </div>
        <div class="stat-card fade-up-3">
            <div class="stat-icon warn">📅</div>
            <div class="stat-info"><strong><?= $stats['today_appts'] ?></strong><span>Today's Appointments</span>
            </div>
        </div>
        <div class="stat-card fade-up-4">
            <div class="stat-icon danger">⏳</div>
            <div class="stat-info"><strong><?= $stats['pending'] ?></strong><span>Pending Approvals</span></div>
        </div>
    </div>

    <!-- Recent Appointments -->
    <div class="card fade-up">
        <div class="card-header">
            <h2>Recent Appointments</h2>
            <a href="<?= APP_URL ?>/admin/appointments-list.php" class="btn btn-outline btn-sm">View All</a>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recentAppts as $a): ?>
                        <tr>
                            <td><?= e($a['patient_name']) ?></td>
                            <td><?= e($a['doctor_name']) ?></td>
                            <td><?= formatDateTime($a['appt_date']) ?></td>
                            <td>
                                <?php $cls = ['pending' => 'badge-warn', 'confirmed' => 'badge-green', 'cancelled' => 'badge-danger', 'done' => 'badge-blue']; ?>
                                <span
                                    class="badge <?= $cls[$a['status']] ?? 'badge-gray' ?>"><?= ucfirst(e($a['status'])) ?></span>
                            </td>
                            <td>
                                <a href="<?= APP_URL ?>/admin/appointments-list.php?id=<?= $a['id'] ?>"
                                    class="btn btn-outline btn-sm">View</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (empty($recentAppts)): ?>
                        <tr>
                            <td colspan="5" style="text-align:center;color:var(--gray-500);padding:32px">No appointments
                                found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>