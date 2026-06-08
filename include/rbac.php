<?php
// ============================================================
// include/rbac.php — Role-Based Access Control
// 7-level hierarchy: Admin > MCC > Div Head > Dept Head >
//                    Unit Head > Office Head > Staff
// ============================================================

require_once __DIR__ . '/auth.php';

class RBAC
{

    private static array $permissions = [
        // HMS
        'manage_doctors' => ROLE_ADMIN,
        'manage_patients' => ROLE_DEPT_HEAD,
        'manage_staff' => ROLE_ADMIN,
        'view_reports' => ROLE_MCC,
        'export_reports' => ROLE_MCC,
        'manage_appointments' => ROLE_DEPT_HEAD,
        'view_appointments' => ROLE_STAFF,
        'prescribe' => ROLE_DEPT_HEAD,
        'manage_departments' => ROLE_ADMIN,
        'manage_divisions' => ROLE_ADMIN,
        // Intercom
        'chat_all_divisions' => ROLE_MCC,
        'chat_own_division' => ROLE_DIV_HEAD,
        'chat_own_department' => ROLE_DEPT_HEAD,
        'chat_own_unit' => ROLE_UNIT_HEAD,
        'chat_own_office' => ROLE_OFFICE_HEAD,
        'chat_staff_level' => ROLE_STAFF,
        'manage_chat_rooms' => ROLE_ADMIN,
        'archive_messages' => ROLE_MCC,
        // System
        'access_admin_panel' => ROLE_ADMIN,
        'access_mcc_panel' => ROLE_MCC,
        'system_settings' => ROLE_ADMIN,
    ];

    public static function can(string $permission): bool
    {
        if (!isLoggedIn())
            return false;
        $userRole = (int) ($_SESSION['role'] ?? 99);
        $required = self::$permissions[$permission] ?? 0;
        return $userRole <= $required;
    }

    public static function enforce(string $permission): void
    {
        if (!self::can($permission)) {
            http_response_code(403);
            include ROOT_PATH . '/error.php';
            exit;
        }
    }

    public static function myPermissions(): array
    {
        $userRole = (int) ($_SESSION['role'] ?? 99);
        return array_keys(array_filter(
            self::$permissions,
            fn($req) => $userRole <= $req
        ));
    }

    public static function chatScope(): string
    {
        $role = (int) ($_SESSION['role'] ?? 99);
        return match (true) {
            $role <= ROLE_MCC => 'all',
            $role === ROLE_DIV_HEAD => 'division',
            $role === ROLE_DEPT_HEAD => 'department',
            $role === ROLE_UNIT_HEAD => 'unit',
            default => 'office',
        };
    }

    public static function dashboardPath(int $role): string
    {
        return match ($role) {
            ROLE_ADMIN, ROLE_MCC => '/admin/admin-panel.php',
            ROLE_DIV_HEAD => '/admin/admin-panel.php',
            ROLE_DEPT_HEAD => '/doctor/doctor-panel.php',
            default => '/patient/patient-panel.php',
        };
    }
}