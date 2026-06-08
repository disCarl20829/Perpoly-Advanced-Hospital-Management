<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/func.php';

$error = $success = '';
if (isPost()) {
    $name = sanitize(post('full_name'));
    $email = sanitize(post('email'));
    $pass = post('password');
    $contact = sanitize(post('contact'));
    $dob = sanitize(post('dob'));
    $blood = sanitize(post('blood_group'));
    $gender = sanitize(post('gender'));

    if (DB::one('SELECT id FROM patients WHERE email=?', [$email])) {
        $error = 'Email already registered.';
    } elseif (strlen($pass) < 6) {
        $error = 'Password must be at least 6 characters.';
    } else {
        DB::insert(
            'INSERT INTO patients (full_name,email,password,contact,dob,blood_group,gender,role,status,created_at) VALUES(?,?,?,?,?,?,?,7,\'active\',NOW())',
            [$name, $email, password_hash($pass, PASSWORD_BCRYPT), $contact, $dob, $blood, $gender]
        );
        $success = 'Registration successful! You can now sign in.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Patient Registration —
        <?= APP_NAME ?>
    </title>
    <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/main.css">
</head>

<body>
    <div class="auth-page">
        <div class="auth-panel auth-panel-left">
            <div class="auth-brand-block">
                <img src="<?= ASSET_PATH ?>/images/logo.jpg" alt="HMS Logo">
                <h1>Join HMS</h1>
                <p>Register as a patient to book appointments and manage your health records online.</p>
            </div>
        </div>
        <div class="auth-panel" style="overflow-y:auto">
            <div class="auth-form-box fade-up">
                <h2>Patient Registration</h2>
                <p>Create your patient account</p>
                <?php if ($error): ?>
                    <div class="alert alert-danger"><span>✕</span><span>
                            <?= e($error) ?>
                        </span></div>
                <?php endif; ?>
                <?php if ($success): ?>
                    <div class="alert alert-success"><span>✓</span><span>
                            <?= e($success) ?>
                        </span></div>
                <?php endif; ?>
                <form method="POST">
                    <?= csrfField() ?>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                        <div class="form-group"><label class="form-label">Full Name</label><input class="form-control"
                                name="full_name" required></div>
                        <div class="form-group"><label class="form-label">Email</label><input class="form-control"
                                type="email" name="email" required></div>
                        <div class="form-group"><label class="form-label">Password</label><input class="form-control"
                                type="password" name="password" required></div>
                        <div class="form-group"><label class="form-label">Contact No.</label><input class="form-control"
                                name="contact" required></div>
                        <div class="form-group"><label class="form-label">Date of Birth</label><input
                                class="form-control" type="date" name="dob"></div>
                        <div class="form-group"><label class="form-label">Blood Group</label>
                            <select class="form-control form-select" name="blood_group">
                                <?php foreach (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as $bg): ?>
                                    <option>
                                        <?= $bg ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group"><label class="form-label">Gender</label>
                            <select class="form-control form-select" name="gender">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block btn-lg" style="margin-top:8px">Create Account</button>
                </form>
                <p style="margin-top:16px;font-size:13px;text-align:center;color:var(--gray-500)">Already registered? <a
                        href="<?= APP_URL ?>/index.php">Sign in</a></p>
            </div>
        </div>
    </div>
</body>

</html>