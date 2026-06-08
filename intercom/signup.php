<?php
/**
 * intercom/signup.php — Staff self-registration
 * New personnel register here; account starts as 'pending' until admin approves.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/db.php';
require_once __DIR__ . '/../include/func.php';

// Already logged in? Go to chat
if (isLoggedIn()) {
    redirect('/intercom/channels/intercom-chat.php');
}

$error = '';
$success = '';

if (isPost()) {
    $name = sanitize(post('full_name'));
    $email = sanitize(post('email'));
    $pass = post('password');
    $confirm = post('confirm_password');
    $deptId = sanitizeInt(post('dept_id'));
    $divId = sanitizeInt(post('div_id'));

    if (strlen($name) < 2) {
        $error = 'Please enter your full name.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address.';
    } elseif (strlen($pass) < 6) {
        $error = 'Password must be at least 6 characters.';
    } elseif ($pass !== $confirm) {
        $error = 'Passwords do not match.';
    } elseif (DB::one('SELECT id FROM users WHERE email = ?', [$email])) {
        $error = 'That email is already registered.';
    } else {
        DB::insert(
            'INSERT INTO users (full_name, email, password, role, dept_id, div_id, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, \'pending\', NOW())',
            [$name, $email, password_hash($pass, PASSWORD_BCRYPT), ROLE_STAFF, $deptId ?: null, $divId ?: null]
        );
        $success = 'Registration submitted! Your account is pending approval by an administrator.';
    }
}

$departments = DB::all('SELECT id, name FROM departments ORDER BY name');
$divisions = DB::all('SELECT id, name FROM divisions ORDER BY name');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Sign Up —
        <?= APP_NAME ?> Intercom
    </title>
    <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/main.css">
    <link rel="icon" type="image/png" href="<?= ASSET_PATH ?>/images/logo.jpg">
</head>

<body>
    <div class="auth-page">

        <!-- Left panel -->
        <div class="auth-panel auth-panel-left">
            <div class="auth-brand-block">
                <img src="<?= ASSET_PATH ?>/images/logo.jpg" alt="HMS Logo">
                <h1>HMS Intercom</h1>
                <p>Register for the hospital personnel communication system.</p>
                <div class="auth-features" style="margin-top:28px">
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">💬</div>
                        Direct &amp; department messaging
                    </div>
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">📖</div>
                        Hospital-wide staff directory
                    </div>
                    <div class="auth-feature-item">
                        <div class="auth-feature-icon">🔔</div>
                        Real-time notifications
                    </div>
                </div>
            </div>
        </div>

        <!-- Right: registration form -->
        <div class="auth-panel" style="overflow-y:auto">
            <div class="auth-form-box fade-up">
                <h2>Staff Registration</h2>
                <p>Create your Intercom account</p>

                <?php if ($error): ?>
                    <div class="alert alert-danger"><span>✕</span><span>
                            <?= e($error) ?>
                        </span></div>
                <?php endif; ?>
                <?php if ($success): ?>
                    <div class="alert alert-success"><span>✓</span><span>
                            <?= e($success) ?>
                        </span></div>
                    <p style="text-align:center;margin-top:16px">
                        <a href="<?= APP_URL ?>/index.php" class="btn btn-primary">Back to Sign In</a>
                    </p>
                <?php else: ?>
                    <form method="POST">
                        <?= csrfField() ?>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                            <div class="form-group" style="grid-column:1/-1">
                                <label class="form-label">Full Name</label>
                                <input class="form-control" name="full_name" value="<?= e(post('full_name')) ?>" required
                                    autofocus>
                            </div>
                            <div class="form-group" style="grid-column:1/-1">
                                <label class="form-label">Email Address</label>
                                <input class="form-control" type="email" name="email" value="<?= e(post('email')) ?>"
                                    required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Password</label>
                                <input class="form-control" type="password" name="password" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirm Password</label>
                                <input class="form-control" type="password" name="confirm_password" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Division</label>
                                <select class="form-control form-select" name="div_id">
                                    <option value="">— Select Division —</option>
                                    <?php foreach ($divisions as $dv): ?>
                                        <option value="<?= $dv['id'] ?>" <?= post('div_id') == $dv['id'] ? 'selected' : '' ?>>
                                            <?= e($dv['name']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <select class="form-control form-select" name="dept_id">
                                    <option value="">— Select Department —</option>
                                    <?php foreach ($departments as $d): ?>
                                        <option value="<?= $d['id'] ?>" <?= post('dept_id') == $d['id'] ? 'selected' : '' ?>>
                                            <?= e($d['name']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <p class="form-hint" style="margin-bottom:14px">
                            Your account will be reviewed and activated by an administrator.
                        </p>
                        <button class="btn btn-primary btn-block btn-lg">Submit Registration</button>
                    </form>
                <?php endif; ?>

                <p style="margin-top:20px;font-size:13px;text-align:center;color:var(--gray-500)">
                    Already have an account? <a href="<?= APP_URL ?>/index.php">Sign in</a>
                </p>
            </div>
        </div>

    </div>
</body>

</html>