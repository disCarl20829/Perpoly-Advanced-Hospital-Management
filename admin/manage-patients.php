<?php
$pageTitle = 'Manage Patients';
$activeNav = 'patients';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('manage_patients');
$search = sanitize(get('q'));
$page = max(1, (int) get('page', 1));
$total = DB::one('SELECT COUNT(*) AS n FROM patients WHERE full_name LIKE ? OR contact LIKE ?', ["%$search%", "%$search%"])['n'] ?? 0;
$p = paginate($total, 12, $page);
$patients = DB::all('SELECT * FROM patients WHERE full_name LIKE ? OR contact LIKE ? ORDER BY full_name LIMIT ? OFFSET ?', ["%$search%", "%$search%", $p['perPage'], $p['offset']]);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Patients</h1>
        <p>
            <?= $total ?> registered patients
        </p>
    </div>
    <form method="GET" style="margin-bottom:16px;display:flex;gap:10px">
        <input class="form-control" name="q" value="<?= e($search) ?>" placeholder="Search name or contact…"
            style="max-width:300px">
        <button class="btn btn-outline">Search</button>
    </form>
    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Blood Group</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($patients as $pt): ?>
                        <tr>
                            <td><strong>
                                    <?= e($pt['full_name']) ?>
                                </strong></td>
                            <td>
                                <?= e($pt['contact']) ?>
                            </td>
                            <td><span class="badge badge-danger">
                                    <?= e($pt['blood_group'] ?? '—') ?>
                                </span></td>
                            <td>
                                <?= formatDate($pt['created_at']) ?>
                            </td>
                            <td><a href="<?= APP_URL ?>/patient/patient-panel.php?id=<?= $pt['id'] ?>"
                                    class="btn btn-outline btn-sm">View</a></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (empty($patients)): ?>
                        <tr>
                            <td colspan="5" style="text-align:center;padding:32px;color:var(--gray-500)">No patients
                                found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>