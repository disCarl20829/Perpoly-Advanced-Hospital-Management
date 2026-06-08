<?php
// index.php — Landing / Login Hub
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/include/auth.php';
require_once __DIR__ . '/include/db.php';
require_once __DIR__ . '/include/rbac.php';
require_once __DIR__ . '/include/func.php';

// Already logged in → redirect to dashboard
if (isLoggedIn()) {
    redirect(RBAC::dashboardPath((int) $_SESSION['role']));
}

$error = '';
if (isPost()) {
    $email = sanitize(post('email'));
    $password = post('password');
    $role_type = sanitize(post('role_type', 'staff')); // staff | patient

    if (empty($email) || empty($password)) {
        $error = 'Please enter your email and password.';
    } else {
        $table = $role_type === 'patient' ? 'patients' : 'users';
        $user = DB::one("SELECT * FROM $table WHERE email=? AND status='active'", [$email]);

        if ($user && password_verify($password, $user['password'])) {
            loginUser($user);
            redirect(RBAC::dashboardPath((int) $user['role']));
        } else {
            $error = 'Invalid email or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — <?= APP_FULL ?></title>
    <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/main.css">
    <link rel="icon" type="image/png" href="<?= ASSET_PATH ?>/images/logo.jpg">
</head>

<body>
    <div class="auth-page">

        <!-- Left branding panel -->
        <div class="auth-panel auth-panel-left">
            <div class="auth-brand-block">
                <img src="<?= ASSET_PATH ?>/images/logo.jpg" alt="HMS Logo">
                <h1><?= APP_FULL ?></h1>
                <p>Integrated hospital management and personnel communication platform.</p>
                <div class="auth-features">
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">📅</div>
                        Appointment &amp; patient management
                    </div>
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">💬</div>
                        Real-time intercom messaging
                    </div>
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">📖</div>
                        Hospital-wide staff directory
                    </div>
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">📊</div>
                        Reports &amp; analytics
                    </div>
                </div>
            </div>
        </div>

        <!-- Right form panel -->
        <div class="auth-panel">
            <div class="auth-form-box fade-up">
                <h2>Welcome back</h2>
                <p>Sign in to your HMS account</p>

                <?php if ($error): ?>
                    <div class="alert alert-danger"><span>✕</span><span><?= e($error) ?></span></div>
                <?php endif; ?>

                <!-- Role tabs -->
                <div class="auth-tabs">
                    <button class="auth-tab active" onclick="switchTab('staff',this)">Staff / Admin</button>
                    <button class="auth-tab" onclick="switchTab('patient',this)">Patient</button>
                </div>

                <form method="POST" action="">
                    <?= csrfField() ?>
                    <input type="hidden" name="role_type" id="role_type_input" value="staff">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input class="form-control" type="email" name="email" value="<?= e(post('email')) ?>"
                            placeholder="you@hospital.org" required autofocus>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input class="form-control" type="password" name="password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:8px">
                        Sign In →
                    </button>
                </form>

                <p style="margin-top:20px;font-size:12.5px;color:var(--gray-500);text-align:center">
                    &copy; <?= date('Y') ?> <?= APP_FULL ?> &mdash; Prototype v<?= APP_VERSION ?>
                </p>
            </div>
        </div>
    </div>
    <script>
        function switchTab(type, btn) {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('role_type_input').value = type;
        }
    </script>
</body>

</html>