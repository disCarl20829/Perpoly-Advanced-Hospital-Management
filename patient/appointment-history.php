<?php
$pageTitle = 'Appointment History';
$activeNav = 'appointments';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
$ptId = (int) $_SESSION['user_id'];
$page = max(1, (int) get('page', 1));
$total = DB::one('SELECT COUNT(*) AS n FROM appointments WHERE patient_id=?', [$ptId])['n'] ?? 0;
$pg = paginate($total, 10, $page);
$appts = DB::all('SELECT a.*,u.full_name AS dname,u.specialization,
    (SELECT diagnosis FROM prescriptions WHERE appt_id=a.id LIMIT 1) AS diagnosis
    FROM appointments a JOIN users u ON u.id=a.doctor_id
    WHERE a.patient_id=? ORDER BY a.appt_date DESC LIMIT ? OFFSET ?',
    [$ptId, $pg['perPage'], $pg['offset']]
);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Appointment History</h1>
            <p>
                <?= $total ?> total visits
            </p>
        </div>
        <a href="<?= APP_URL ?>/patient/book-appointment.php" class="btn btn-primary">+ Book New</a>
    </div>
    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Diagnosis</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($appts as $a): ?>
                        <tr>
                            <td><strong>
                                    <?= e($a['dname']) ?>
                                </strong></td>
                            <td>
                                <?= e($a['specialization'] ?? '—') ?>
                            </td>
                            <td>
                                <?= formatDateTime($a['appt_date']) ?>
                            </td>
                            <td>
                                <?php $cls = ['pending' => 'badge-warn', 'confirmed' => 'badge-green', 'cancelled' => 'badge-danger', 'done' => 'badge-blue']; ?>
                                <span class="badge <?= $cls[$a['status']] ?? 'badge-gray' ?>">
                                    <?= ucfirst(e($a['status'])) ?>
                                </span>
                            </td>
                            <td>
                                <?= e($a['diagnosis'] ?? '—') ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>