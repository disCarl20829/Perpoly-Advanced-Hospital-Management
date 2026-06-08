<?php
$pageTitle = 'Write Prescription';
$activeNav = 'appointments';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();
RBAC::enforce('prescribe');
$apptId = sanitizeInt(get('appt_id'));
$appt = DB::one('SELECT a.*,p.full_name AS pname,p.dob,p.blood_group,p.contact
    FROM appointments a JOIN patients p ON p.id=a.patient_id
    WHERE a.id=? AND a.doctor_id=?', [$apptId, $_SESSION['user_id']]);
if (!$appt) {
    setFlash('danger', 'Appointment not found.');
    redirect('/doctor/my-appointments.php');
}

if (isPost() && verifyCsrf(post('csrf_token'))) {
    DB::insert(
        'INSERT INTO prescriptions (appt_id,doctor_id,patient_id,diagnosis,medicines,notes,created_at) VALUES(?,?,?,?,?,?,NOW())',
        [
            $apptId,
            (int) $_SESSION['user_id'],
            $appt['patient_id'],
            sanitize(post('diagnosis')),
            sanitize(post('medicines')),
            sanitize(post('notes'))
        ]
    );
    DB::run('UPDATE appointments SET status=\'done\' WHERE id=?', [$apptId]);
    setFlash('success', 'Prescription saved.');
    redirect('/doctor/my-appointments.php');
}
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Prescription</h1>
        <p>For
            <?= e($appt['pname']) ?> &mdash;
            <?= formatDateTime($appt['appt_date']) ?>
        </p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px">
        <div class="card">
            <div class="card-header">
                <h2>Patient Info</h2>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
                <div>
                    <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.07em">Full
                        Name</div><strong>
                        <?= e($appt['pname']) ?>
                    </strong>
                </div>
                <div>
                    <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.07em">
                        Blood Group</div><span class="badge badge-danger">
                        <?= e($appt['blood_group'] ?? '—') ?>
                    </span>
                </div>
                <div>
                    <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.07em">
                        Contact</div>
                    <?= e($appt['contact']) ?>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Write Prescription</h2>
            </div>
            <div class="card-body">
                <form method="POST">
                    <?= csrfField() ?>
                    <div class="form-group"><label class="form-label">Diagnosis</label><input class="form-control"
                            name="diagnosis" required></div>
                    <div class="form-group"><label class="form-label">Medicines (one per line)</label>
                        <textarea class="form-control" name="medicines" rows="5"
                            placeholder="e.g. Paracetamol 500mg – 3x daily for 5 days"></textarea>
                    </div>
                    <div class="form-group"><label class="form-label">Additional Notes</label>
                        <textarea class="form-control" name="notes" rows="3"></textarea>
                    </div>
                    <button class="btn btn-primary">Save &amp; Mark Done</button>
                </form>
            </div>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>