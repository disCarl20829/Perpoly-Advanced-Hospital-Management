<?php
$pageTitle = 'Search Results';
$activeNav = '';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';    // ← THE FIX
require_once __DIR__ . '/../include/func.php';
requireLogin();

$q = sanitize(get('q'));
$results = ['doctors' => [], 'patients' => [], 'appointments' => []];

if (strlen($q) >= 2) {
    $results['doctors'] = DB::all(
        "SELECT id, full_name, email, specialization
         FROM users
         WHERE status = 'active' AND full_name LIKE ?
         LIMIT 5",
        ["%$q%"]
    );
    $results['patients'] = DB::all(
        "SELECT id, full_name, contact, blood_group
         FROM patients
         WHERE status = 'active' AND (full_name LIKE ? OR contact LIKE ?)
         LIMIT 5",
        ["%$q%", "%$q%"]
    );
    $results['appointments'] = DB::all(
        "SELECT a.id, a.appt_date, a.status,
                p.full_name AS pname,
                u.full_name AS dname
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN users    u ON u.id = a.doctor_id
         WHERE p.full_name LIKE ? OR u.full_name LIKE ?
         ORDER BY a.appt_date DESC
         LIMIT 5",
        ["%$q%", "%$q%"]
    );
}

require_once __DIR__ . '/../header.php';
?>

<div class="page-body">
    <div class="page-header">
        <h1>Search Results</h1>
        <p><?= strlen($q) >= 2 ? 'Showing results for "' . e($q) . '"' : 'Enter a search term above.' ?></p>
    </div>

    <form method="GET" style="margin-bottom:24px;display:flex;gap:10px">
        <input class="form-control" name="q" value="<?= e($q) ?>"
               placeholder="Search…" style="max-width:400px" autofocus>
        <button class="btn btn-primary">Search</button>
    </form>

    <?php if ($results['doctors']): ?>
        <div class="card" style="margin-bottom:16px">
            <div class="card-header"><h2>👨‍⚕️ Doctors</h2></div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Specialization</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($results['doctors'] as $d): ?>
                            <tr>
                                <td>
                                    <a href="<?= APP_URL ?>/doctor/doctor-panel.php?id=<?= $d['id'] ?>">
                                        <?= e($d['full_name']) ?>
                                    </a>
                                </td>
                                <td><?= e($d['email']) ?></td>
                                <td><?= e($d['specialization'] ?? '—') ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <?php if ($results['patients']): ?>
        <div class="card" style="margin-bottom:16px">
            <div class="card-header"><h2>🏥 Patients</h2></div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th>Name</th><th>Contact</th><th>Blood Group</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($results['patients'] as $p): ?>
                            <tr>
                                <td>
                                    <a href="<?= APP_URL ?>/patient/patient-panel.php?id=<?= $p['id'] ?>">
                                        <?= e($p['full_name']) ?>
                                    </a>
                                </td>
                                <td><?= e($p['contact']) ?></td>
                                <td><span class="badge badge-danger"><?= e($p['blood_group'] ?? '—') ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <?php if ($results['appointments']): ?>
        <div class="card" style="margin-bottom:16px">
            <div class="card-header"><h2>📅 Appointments</h2></div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($results['appointments'] as $a): ?>
                            <tr>
                                <td><?= e(date('M j, Y', strtotime($a['appt_date']))) ?></td>
                                <td><?= e($a['pname']) ?></td>
                                <td><?= e($a['dname']) ?></td>
                                <td><span class="badge badge-blue"><?= e($a['status']) ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <?php if (strlen($q) >= 2 && !$results['doctors'] && !$results['patients'] && !$results['appointments']): ?>
        <div class="card">
            <div class="card-body" style="text-align:center;padding:48px;color:var(--gray-500)">
                <div style="font-size:32px;margin-bottom:8px">🔍</div>
                No results found for "<?= e($q) ?>".
            </div>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/../footer.php'; ?>