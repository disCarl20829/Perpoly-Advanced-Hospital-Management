<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/include/auth.php';
require_once __DIR__ . '/include/chat-func.php';
if (isLoggedIn())
    setUserOffline((int) $_SESSION['user_id']);
logoutUser();
header('Location: ' . APP_URL . '/index.php');
exit;