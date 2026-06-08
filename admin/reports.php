<?php
$pageTitle = 'Reports';
$activeNav = 'reports';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('view_reports');

$month = sanitize(get('month', date('Y-m')));
$apptsByStatus = DB::all('SELECT status, COUNT(*) AS n FROM appointments WHERE DATE_FORMAT(appt_date,\'%Y-%m\')=? GROUP BY status', [$month]);
$topDoctors = DB::all('SELECT u.full_name, COUNT(*) AS n FROM appointments a JOIN users u ON u.id=a.doctor_id WHERE a.status=\'done\' AND DATE_FORMAT(a.appt_date,\'%Y-%m\')=? GROUP BY a.doctor_id ORDER BY n DESC LIMIT 5', [$month]);
$totalPts = DB::one('SELECT COUNT(*) AS n FROM patients')['n'] ?? 0;
$newPts = DB::one('SELECT COUNT(*) AS n FROM patients WHERE DATE_FORMAT(created_at,\'%Y-%m\')=?', [$month])['n'] ?? 0;
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Reports</h1>
            <p>Monthly summary</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
            <form method="GET" style="display:flex;gap:8px">
                <input class="form-control" type="month" name="month" value="<?= e($month) ?>">
                <button class="btn btn-outline">Filter</button>
            </form>
            <?php if (RBAC::can('export_reports')): ?>
                <a href="<?= APP_URL ?>/include/export-pdf.php?month=<?= e($month) ?>" class="btn btn-primary">⬇ Export
                    PDF</a>
            <?php endif; ?>
        </div>
    </div>

    <div class="stats-grid">
        <?php $statusColors = ['pending' => 'warn', 'confirmed' => 'blue', 'done' => 'green', 'cancelled' => 'danger'];
        foreach ($apptsByStatus as $row):
            $cls = $statusColors[$row['status']] ?? 'gray'; ?>
            <div class="stat-card">
                <div class="stat-icon <?= $cls ?>">📅</div>
                <div class="stat-info"><strong>
                        <?= $row['n'] ?>
                    </strong><span>
                        <?= ucfirst(e($row['status'])) ?> Appointments
                    </span></div>
            </div>
        <?php endforeach; ?>
        <div class="stat-card">
            <div class="stat-icon green">🆕</div>
            <div class="stat-info"><strong>
                    <?= $newPts ?>
                </strong><span>New Patients This Month</span></div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>Top Doctors by Completed Appointments</h2>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Doctor</th>
                        <th>Completed</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($topDoctors as $i => $d): ?>
                        <tr>
                            <td><span class="badge badge-blue">#
                                    <?= $i + 1 ?>
                                </span></td>
                            <td>
                                <?= e($d['full_name']) ?>
                            </td>
                            <td>
                                <?= $d['n'] ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>