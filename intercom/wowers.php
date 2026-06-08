<?php
/**
 * intercom/wowers.php — Main Intercom Router
 *
 * This is the "wowers" router from the reference Intercom System repo.
 * It acts as a single entry point that reads ?page= and dispatches
 * to the correct intercom sub-page, applying role checks first.
 *
 * URL pattern:  /intercom/wowers.php?page=chat&room=5
 *               /intercom/wowers.php?page=directory
 *               /intercom/wowers.php?page=admin
 *
 * You can also use it as a direct-link hub on any page:
 *   <a href="<?= APP_URL ?>/intercom/wowers.php?page=chat">Open Chat</a>
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../include/auth.php';
require_once __DIR__ . '/../include/rbac.php';
require_once __DIR__ . '/../include/func.php';

requireLogin();

$page = sanitize(get('page', 'chat'));

// Map page keys → [file path relative to intercom/, required permission or null]
$routes = [
    'chat' => ['channels/intercom-chat.php', null],
    'dept' => ['channels/department-chat.php', null],
    'directory' => ['directory/directory.php', null],
    'search' => ['directory/directory-search.php', null],
    'rooms' => ['admin/manage-rooms.php', 'manage_chat_rooms'],
    'admin' => ['admin/chat-admin.php', 'manage_chat_rooms'],
    'signup' => ['signup.php', null],
];

if (!isset($routes[$page])) {
    // Unknown page — fall back to chat
    header('Location: ' . APP_URL . '/intercom/channels/intercom-chat.php');
    exit;
}

[$file, $permission] = $routes[$page];

// Permission check
if ($permission && !RBAC::can($permission)) {
    header('Location: ' . APP_URL . '/error.php?code=403');
    exit;
}

// Forward any GET params (room, q, etc.) to the target page
// by including it directly — keeps URL clean
$targetFile = __DIR__ . '/' . $file;

if (!file_exists($targetFile)) {
    header('Location: ' . APP_URL . '/error.php?code=404');
    exit;
}

// Include the target page (it will render its own header/footer)
require $targetFile;