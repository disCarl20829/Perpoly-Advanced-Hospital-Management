<?php
// ============================================================
// config.php — Database & Application Configuration
// ============================================================

// Load .env if it exists
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#'))
            continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

// ── Database ───────────────────────────────────────
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'hms_db');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHAR', 'utf8mb4');

// ── App ───────────────────────────────────────────
define('APP_NAME', 'HMS');
define('APP_FULL', 'Hospital Management System');
define('APP_URL', $_ENV['APP_URL'] ?? 'http://localhost/hms');
define('APP_VERSION', '1.0.0-prototype');

// ── Paths ─────────────────────────────────────────
define('ROOT_PATH', __DIR__);
define('ASSET_PATH', APP_URL . '/assets');
define('UPLOAD_PATH', ROOT_PATH . '/uploads');

// ── Session ───────────────────────────────────────
define('SESSION_NAME', 'hms_session');
define('SESSION_LIFETIME', 7200); // 2 hours

// ── Roles — matches Intercom hierarchy ────────────
define('ROLE_ADMIN', 1);
define('ROLE_MCC', 2);
define('ROLE_DIV_HEAD', 3);
define('ROLE_DEPT_HEAD', 4);
define('ROLE_UNIT_HEAD', 5);
define('ROLE_OFFICE_HEAD', 6);
define('ROLE_STAFF', 7);

define('ROLE_LABELS', [
    ROLE_ADMIN => 'Administrator',
    ROLE_MCC => 'MCC',
    ROLE_DIV_HEAD => 'Division Head',
    ROLE_DEPT_HEAD => 'Department Head',
    ROLE_UNIT_HEAD => 'Unit Head',
    ROLE_OFFICE_HEAD => 'Office Head',
    ROLE_STAFF => 'Staff',
]);

// ── Chat poll interval (ms) ────────────────────────
define('CHAT_POLL_MS', 3000);

// ── Error display (disable in production) ─────────
ini_set('display_errors', 1);
error_reporting(E_ALL);