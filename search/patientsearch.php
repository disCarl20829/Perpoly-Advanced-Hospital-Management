<?php
/**
 * search/patientsearch.php — Patient-specific search
 * Returns JSON when ?format=json (AJAX), HTML page otherwise.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';
require_once __DIR__ . '/../include/rbac.php';

requireLogin();
RBAC::enforce('manage_patients');

$q = sanitize(get('q'));
$blood = sanitize(get('blood', ''));
$gender = sanitize(get('gender', ''));
$format = sanitize(get('format', 'html'));

$where = ["p.status = 'active'"];
$params = [];

if ($q) {
    $where[] = '(p.full_name LIKE ? OR p.contact LIKE ? OR p.email LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($blood) {
    $where[] = 'p.blood_group = ?';
    $params[] = $blood;
}
if ($gender) {
    $where[] = 'p.gender = ?';
    $params[] = $gender;
}

$whereStr = implode(' AND ', $where);
$patients = DB::all(
    "SELECT p.id, p.full_name, p.email, p.contact, p.dob, p.blood_group, p.gender, p.created_at,
            (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id) AS total_visits,
            (SELECT appt_date FROM appointments WHERE patient_id = p.id ORDER BY appt_date DESC LIMIT 1) AS last_visit
     FROM patients p
     WHERE $whereStr
     ORDER BY p.full_name ASC LIMIT 40",
    $params
);

if ($format === 'json') {
    header('Content-Type: application/json');
    echo json_encode(array_map(fn($p) => [
        'id' => $p['id'],
        'label' => $p['full_name'] . ' — ' . ($p['contact'] ?? ''),
        'full_name' => $p['full_name'],
        'contact' => $p['contact'] ?? '',
        'blood' => $p['blood_group'] ?? '',
    ], $patients));
    exit;
}

$pageTitle = 'Patient Search';
$activeNav = 'patients';
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Patient Search</h1>
        <p>Search by name, contact number, or email</p>
    </div>

    <form method="GET" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
        <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Name, contact, or email…"
            style="max-width:260px" autofocus>
        <select class="form-control form-select" name="blood" style="max-width:130px">
            <option value="">All Blood Types</option>
            <?php foreach (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as $bg): ?>
                <option value="<?= $bg ?>" <?= $blood === $bg ? 'selected' : '' ?>>
                    <?= $bg ?>
                </option>
            <?php endforeach; ?>
        </select>
        <select class="form-control form-select" name="gender" style="max-width:130px">
            <option value="">All Genders</option>
            <?php foreach (['Male', 'Female', 'Other'] as $g): ?>
                <option value="<?= $g ?>" <?= $gender === $g ? 'selected' : '' ?>>
                    <?= $g ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button class="btn btn-primary">Search</button>
        <?php if ($q || $blood || $gender): ?>
            <a href="?" class="btn btn-outline">Clear</a>
        <?php endif; ?>
    </form>

    <?php if (!empty($patients)): ?>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px">
            <?= count($patients) ?> patient
            <?= count($patients) !== 1 ? 's' : '' ?> found
        </p>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Blood</th>
                            <th>Gender</th>
                            <th>Visits</th>
                            <th>Last Visit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($patients as $pt): ?>
                            <tr>
                                <td>
                                    <strong style="font-size:13.5px">
                                        <?= e($pt['full_name']) ?>
                                    </strong><br>
                                    <span style="font-size:11.5px;color:var(--gray-500)">
                                        <?= e($pt['email']) ?>
                                    </span>
                                </td>
                                <td>
                                    <?= e($pt['contact'] ?? '—') ?>
                                </td>
                                <td><span class="badge badge-danger">
                                        <?= e($pt['blood_group'] ?? '—') ?>
                                    </span></td>
                                <td>
                                    <?= e($pt['gender'] ?? '—') ?>
                                </td>
                                <td><span class="badge badge-gray">
                                        <?= $pt['total_visits'] ?>
                                    </span></td>
                                <td style="font-size:12.5px;color:var(--gray-500)">
                                    <?= $pt['last_visit'] ? formatDate($pt['last_visit']) : '—' ?>
                                </td>
                                <td style="display:flex;gap:6px">
                                    <a href="<?= APP_URL ?>/patient/patient-panel.php?id=<?= $pt['id'] ?>"
                                        class="btn btn-outline btn-sm">View</a>
                                    <a href="<?= APP_URL ?>/patient/book-appointment.php?patient_id=<?= $pt['id'] ?>"
                                        class="btn btn-primary btn-sm">Book</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    <?php elseif ($q || $blood || $gender): ?>
        <div class="alert alert-info"><span>ℹ</span><span>No patients found matching your search.</span></div>
    <?php else: ?>
        <div style="text-align:center;padding:60px 0">
            <div style="font-size:48px;margin-bottom:12px;color:var(--gray-200)">🏥</div>
            <div style="font-size:15px;color:var(--gray-500)">Enter a name, contact, or filter to search patients.</div>
        </div>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>