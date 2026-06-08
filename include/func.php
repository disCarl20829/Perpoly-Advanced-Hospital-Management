<?php
// include/func.php — HMS General Helper Functions

function e(string $str): string
{
    return htmlspecialchars($str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function sanitize(string $input): string
{
    return trim(strip_tags($input));
}
function sanitizeInt(mixed $val): int
{
    return (int) filter_var($val, FILTER_SANITIZE_NUMBER_INT);
}

function setFlash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}
function getFlash(): ?array
{
    if (!isset($_SESSION['flash']))
        return null;
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}
function renderFlash(): string
{
    $f = getFlash();
    if (!$f)
        return '';
    $map = ['success' => 'alert-success', 'danger' => 'alert-danger', 'warning' => 'alert-warning'];
    $icon = ['success' => '✓', 'danger' => '✕', 'warning' => '⚠'];
    $cls = $map[$f['type']] ?? 'alert-info';
    $ico = $icon[$f['type']] ?? 'ℹ';
    return '<div class="alert ' . $cls . '"><span>' . $ico . '</span><span>' . e($f['message']) . '</span></div>';
}

function formatDate(string $d): string
{
    return date('F j, Y', strtotime($d));
}
function formatDateTime(string $d): string
{
    return date('M j, Y g:i A', strtotime($d));
}
function timeAgo(string $dt): string
{
    $diff = time() - strtotime($dt);
    return match (true) {
        $diff < 60 => 'Just now',
        $diff < 3600 => floor($diff / 60) . 'm ago',
        $diff < 86400 => floor($diff / 3600) . 'h ago',
        default => date('M j', strtotime($dt)),
    };
}

function paginate(int $total, int $perPage, int $current): array
{
    $pages = (int) ceil($total / $perPage);
    return [
        'total' => $total,
        'perPage' => $perPage,
        'current' => $current,
        'pages' => $pages,
        'offset' => ($current - 1) * $perPage,
        'hasPrev' => $current > 1,
        'hasNext' => $current < $pages
    ];
}

function redirect(string $path): never
{
    header('Location: ' . APP_URL . $path);
    exit;
}
function isPost(): bool
{
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}
function post(string $k, mixed $d = ''): mixed
{
    return $_POST[$k] ?? $d;
}
function get(string $k, mixed $d = ''): mixed
{
    return $_GET[$k] ?? $d;
}
function generatePassword(int $len = 10): string
{
    return bin2hex(random_bytes((int) ceil($len / 2)));
}
function uploadFile(array $file, string $dest, array $allowed = ['jpg', 'jpeg', 'png', 'pdf']): string|false
{
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed) || $file['size'] > 5 * 1024 * 1024)
        return false;
    $name = uniqid('hms_', true) . '.' . $ext;
    $path = UPLOAD_PATH . '/' . $dest . '/' . $name;
    if (!is_dir(dirname($path)))
        mkdir(dirname($path), 0755, true);
    return move_uploaded_file($file['tmp_name'], $path) ? $name : false;
}