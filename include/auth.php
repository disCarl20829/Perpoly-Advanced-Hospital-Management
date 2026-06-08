<?php
// ============================================================
// include/auth.php — Session & Role-Based Access Guard
// ============================================================

require_once __DIR__ . '/../config.php';

// Start session once
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'secure' => false, // set true in production over HTTPS
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

// ── Core Auth Functions ────────────────────────────

function isLoggedIn(): bool
{
    return isset($_SESSION['user_id'], $_SESSION['role']);
}

function currentUser(): array
{
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'name' => $_SESSION['user_name'] ?? 'Unknown',
        'role' => $_SESSION['role'] ?? null,
        'role_label' => ROLE_LABELS[$_SESSION['role'] ?? 0] ?? 'Unknown',
        'dept_id' => $_SESSION['dept_id'] ?? null,
        'div_id' => $_SESSION['div_id'] ?? null,
        'avatar' => strtoupper(substr($_SESSION['user_name'] ?? 'U', 0, 1)),
    ];
}

// Require login — redirect to index if not logged in
function requireLogin(string $redirect = '/index.php'): void
{
    if (!isLoggedIn()) {
        header('Location: ' . APP_URL . $redirect);
        exit;
    }
}

// Require a specific role level or higher (lower number = more privilege)
function requireRole(int $maxRole, string $redirect = '/error.php'): void
{
    requireLogin();
    $userRole = (int) ($_SESSION['role'] ?? 99);
    if ($userRole > $maxRole) {
        header('Location: ' . APP_URL . $redirect . '?code=403');
        exit;
    }
}

// Require exactly one of the given roles
function requireAnyRole(array $roles, string $redirect = '/error.php'): void
{
    requireLogin();
    $userRole = (int) ($_SESSION['role'] ?? 99);
    if (!in_array($userRole, $roles, true)) {
        header('Location: ' . APP_URL . $redirect . '?code=403');
        exit;
    }
}

function hasRole(int $role): bool
{
    return isLoggedIn() && (int) $_SESSION['role'] === $role;
}

function isAdminOrAbove(): bool
{
    return isLoggedIn() && (int) $_SESSION['role'] <= ROLE_ADMIN;
}

function isDivisionHead(): bool
{
    return isLoggedIn() && (int) $_SESSION['role'] === ROLE_DIV_HEAD;
}

function isDeptHead(): bool
{
    return isLoggedIn() && (int) $_SESSION['role'] === ROLE_DEPT_HEAD;
}

// ── Login ──────────────────────────────────────────
function loginUser(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['role'] = (int) $user['role'];
    $_SESSION['dept_id'] = $user['dept_id'] ?? null;
    $_SESSION['div_id'] = $user['div_id'] ?? null;
    $_SESSION['logged_at'] = time();
}

// ── Logout ─────────────────────────────────────────
function logoutUser(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $p['path'],
            $p['domain'],
            $p['secure'],
            $p['httponly']
        );
    }
    session_destroy();
}

// ── CSRF ───────────────────────────────────────────
function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrf(string $token): bool
{
    return isset($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}

function csrfField(): string
{
    return '<input type="hidden" name="csrf_token" value="' . csrfToken() . '">';
}