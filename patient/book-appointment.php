<?php
$pageTitle = 'Book Appointment';
$activeNav = 'appointments';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';
requireLogin();

if (isPost() && verifyCsrf(post('csrf_token'))) {
    $doctorId = sanitizeInt(post('doctor_id'));
    $date = sanitize(post('appt_date'));
    $time = sanitize(post('appt_time'));
    $notes = sanitize(post('notes'));
    $ptId = (int) $_SESSION['user_id'];
    // Check no duplicate
    $exists = DB::one('SELECT id FROM appointments WHERE patient_id=? AND doctor_id=? AND appt_date=? AND status!=\'cancelled\'', [$ptId, $doctorId, $date . ' ' . $time]);
    if ($exists) {
        setFlash('danger', 'You already have this appointment.');
        redirect('/patient/book-appointment.php');
    }
    DB::insert(
        'INSERT INTO appointments (patient_id,doctor_id,appt_date,appt_time,notes,status,created_at) VALUES(?,?,?,?,?,\'pending\',NOW())',
        [$ptId, $doctorId, $date, $time, $notes]
    );
    setFlash('success', 'Appointment booked! Awaiting confirmation.');
    redirect('/patient/patient-panel.php');
}

$doctors = DB::all('SELECT u.*,d.name AS dept_name FROM users u LEFT JOIN departments d ON d.id=u.dept_id WHERE u.role=? AND u.status=\'active\' ORDER BY u.full_name', [ROLE_DEPT_HEAD]);
require_once __DIR__ . '/../header.php';
?>
<div class="page-body">
    <div class="page-header">
        <h1>Book Appointment</h1>
        <p>Schedule a visit with one of our doctors</p>
    </div>
    <div class="card" style="max-width:560px">
        <div class="card-body">
            <form method="POST">
                <?= csrfField() ?>
                <div class="form-group"><label class="form-label">Select Doctor</label>
                    <select class="form-control form-select" name="doctor_id" required>
                        <option value="">— Choose a doctor —</option>
                        <?php foreach ($doctors as $d): ?>
                            <option value="<?= $d['id'] ?>">
                                <?= e($d['full_name']) ?> —
                                <?= e($d['specialization'] ?? $d['dept_name'] ?? '') ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Preferred Date</label>
                    <input class="form-control" type="date" name="appt_date" min="<?= date('Y-m-d') ?>" required>
                </div>
                <div class="form-group"><label class="form-label">Preferred Time</label>
                    <select class="form-control form-select" name="appt_time" required>
                        <?php $times = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'];
                        foreach ($times as $t): ?>
                            <option value="<?= $t ?>">
                                <?= $t ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Symptoms / Notes (optional)</label>
                    <textarea class="form-control" name="notes" rows="3"
                        placeholder="Briefly describe your concern…"></textarea>
                </div>
                <button class="btn btn-primary btn-block btn-lg">Book Appointment</button>
            </form>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../footer.php'; ?>