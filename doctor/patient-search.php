<?php
$pageTitle = 'Patient Search';
$activeNav = 'appointments';

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';
require_once __DIR__ . '/../include/rbac.php';

requireLogin();
RBAC::enforce('manage_patients');

$q = sanitize(get('q'));
$patients = [];

if ($q !== '') {
    $patients = DB::all(
        'SELECT p.*,
            (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND status = \'done\') AS visits,
            (SELECT appt_date FROM appointments WHERE patient_id = p.id ORDER BY appt_date DESC LIMIT 1) AS last_visit
         FROM patients p
         WHERE p.full_name LIKE ? OR p.contact LIKE ? OR p.email LIKE ?
         ORDER BY p.full_name ASC LIMIT 30',
        ["%$q%", "%$q%", "%$q%"]
    );
}

require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Patient Search</h1>
        <p>Look up patients by name, contact, or email</p>
    </div>

    <form method="GET" style="display:flex;gap:10px;margin-bottom:24px;max-width:500px">
        <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Name, phone, or email…" autofocus
            required>
        <button class="btn btn-primary">Search</button>
        <?php if ($q): ?>
            <a href="?" class="btn btn-outline">Clear</a>
        <?php endif; ?>
    </form>

    <?php if ($q !== '' && empty($patients)): ?>
        <div class="alert alert-info">
            <span>ℹ</span><span>No patients found for "
                <?= e($q) ?>".
            </span>
        </div>
    <?php endif; ?>

    <?php if (!empty($patients)): ?>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:12px">
            <?= count($patients) ?> result
            <?= count($patients) !== 1 ? 's' : '' ?> for "
            <?= e($q) ?>"
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
            <?php foreach ($patients as $pt): ?>
                <div class="card">
                    <div class="card-body" style="display:flex;gap:12px;align-items:flex-start">
                        <div class="chat-avatar navy" style="width:44px;height:44px;font-size:17px;flex-shrink:0">
                            <?= strtoupper(substr($pt['full_name'], 0, 1)) ?>
                        </div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:14px;color:var(--navy-dark)">
                                <?= e($pt['full_name']) ?>
                            </div>
                            <div style="font-size:12px;color:var(--gray-500);margin-top:2px">📞
                                <?= e($pt['contact'] ?? '—') ?>
                            </div>
                            <div style="font-size:12px;color:var(--gray-500)">✉
                                <?= e($pt['email']) ?>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                                <span class="badge badge-danger">
                                    <?= e($pt['blood_group'] ?? '—') ?>
                                </span>
                                <span class="badge badge-gray">
                                    <?= $pt['visits'] ?> visit
                                    <?= $pt['visits'] != 1 ? 's' : '' ?>
                                </span>
                                <?php if ($pt['last_visit']): ?>
                                    <span class="badge badge-blue">Last:
                                        <?= formatDate($pt['last_visit']) ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer" style="display:flex;gap:8px;padding:10px 16px">
                        <a href="<?= APP_URL ?>/patient/patient-panel.php?id=<?= $pt['id'] ?>" class="btn btn-outline btn-sm"
                            style="flex:1;justify-content:center">View Profile</a>
                        <a href="<?= APP_URL ?>/patient/book-appointment.php?patient_id=<?= $pt['id'] ?>"
                            class="btn btn-primary btn-sm" style="flex:1;justify-content:center">Book Appt</a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if ($q === ''): ?>
        <div style="text-align:center;padding:60px 0;color:var(--gray-300)">
            <div style="font-size:48px;margin-bottom:12px">🔍</div>
            <div style="font-size:15px;color:var(--gray-500)">Enter a name, phone number, or email to find a patient.</div>
        </div>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>