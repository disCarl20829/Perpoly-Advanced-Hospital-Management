<?php
require_once __DIR__ . '/config.php';
$code = (int) ($_GET['code'] ?? 500);
$messages = [403 => 'Access Denied', 404 => 'Page Not Found', 500 => 'Server Error'];
$msg = $messages[$code] ?? 'Something went wrong';
http_response_code($code);
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>
        <?= $code ?> —
        <?= APP_NAME ?>
    </title>
    <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/main.css">
</head>

<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--gray-50)">
    <div style="text-align:center;max-width:400px;padding:40px">
        <div style="font-family:var(--font-display);font-size:80px;color:var(--navy);line-height:1">
            <?= $code ?>
        </div>
        <div style="font-family:var(--font-display);font-size:24px;color:var(--navy-dark);margin:12px 0 8px">
            <?= $msg ?>
        </div>
        <p style="color:var(--gray-500);font-size:14px;margin-bottom:24px">
            <?php if ($code === 403): ?>You don't have permission to access this page.
            <?php elseif ($code === 404): ?>The page you're looking for doesn't exist.
            <?php else: ?>An unexpected error occurred. Please try again.
            <?php endif; ?>
        </p>
        <a href="<?= APP_URL ?>/index.php" class="btn btn-primary">← Back to Home</a>
    </div>
</body>

</html>