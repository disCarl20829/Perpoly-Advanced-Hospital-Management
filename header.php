<?php
/**
 * header.php — Global layout: <head>, sidebar, topbar
 *
 * HOW TO USE (at the top of every authenticated page):
 * -------------------------------------------------------
 *   <?php
 *   // 1. Set page variables BEFORE including header
 *   $pageTitle = 'My Page Title';   // shown in <title> and topbar
 *   $activeNav = 'dashboard';       // highlights the matching sidebar link
 *   $extraCss  = ['chat.css'];      // optional: extra CSS files from assets/css/
 *   $extraJs   = ['chat.js'];       // optional: extra JS files from assets/js/
 *
 *   // 2. Load config + includes (header.php does NOT re-load these)
 *   require_once __DIR__ . '/../config.php';   // adjust depth as needed
 *   require_once __DIR__ . '/../include/auth.php';
 *   require_once __DIR__ . '/../include/db.php';
 *   require_once __DIR__ . '/../include/func.php';
 *   require_once __DIR__ . '/../include/rbac.php';
 *   requireLogin();
 *   // ... your page logic (queries, POST handling) ...
 *
 *   // 3. Include header — starts HTML output
 *   require_once __DIR__ . '/../header.php';
 *   ?>
 *
 *   <!-- 4. Your page HTML goes here -->
 *   <div class="page-body"> ... </div>
 *
 *   <?php require_once __DIR__ . '/../footer.php'; ?>
 * -------------------------------------------------------
 *
 * $activeNav values: dashboard | doctors | patients | staff |
 *   appointments | reports | feedback | chat | dept-chat |
 *   directory | rooms
 */

// Guard: config must already be loaded by the calling page
if (!defined('APP_NAME')) {
    die('header.php: config.php must be loaded before including this file.');
}

$user = currentUser();
$flash = renderFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle ?? 'Dashboard') ?> — <?= APP_NAME ?></title>

    <!-- Base stylesheet (always loaded) -->
    <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/main.css">

    <!-- Extra stylesheets (set $extraCss = ['chat.css'] before include) -->
    <?php if (!empty($extraCss)):
        foreach ($extraCss as $css): ?>
            <link rel="stylesheet" href="<?= ASSET_PATH ?>/css/<?= e($css) ?>">
        <?php endforeach; endif; ?>

    <link rel="icon" type="image/png" href="<?= ASSET_PATH ?>/images/logo.jpg">

    <!-- Pass APP_URL to JS -->
    <script>const APP_URL = '<?= APP_URL ?>';</script>
</head>

<body>
    <div class="hms-shell">

        <!-- ════════════════════════════════════════
     SIDEBAR
     ════════════════════════════════════════ -->
        <aside class="sidebar" id="sidebar">

            <!-- Brand -->
            <div class="sidebar-brand">
                <img src="<?= ASSET_PATH ?>/images/logo.jpg" alt="HMS Logo">
                <div class="sidebar-brand-text">
                    <strong><?= APP_NAME ?></strong>
                    <span>Management System</span>
                </div>
            </div>

            <!-- ── Hospital Section ── -->
            <div class="sidebar-section">
                <div class="sidebar-section-label">Hospital</div>
                <nav class="sidebar-nav">

                    <?php if (RBAC::can('access_admin_panel') || RBAC::can('access_mcc_panel')): ?>
                        <a href="<?= APP_URL ?>/admin/admin-panel.php"
                            class="<?= ($activeNav ?? '') === 'dashboard' ? 'active' : '' ?>">
                            <span class="nav-icon">⊞</span> Dashboard
                        </a>
                        <a href="<?= APP_URL ?>/admin/manage-doctors.php"
                            class="<?= ($activeNav ?? '') === 'doctors' ? 'active' : '' ?>">
                            <span class="nav-icon">👨‍⚕️</span> Doctors
                        </a>
                        <a href="<?= APP_URL ?>/admin/manage-patients.php"
                            class="<?= ($activeNav ?? '') === 'patients' ? 'active' : '' ?>">
                            <span class="nav-icon">🏥</span> Patients
                        </a>
                        <a href="<?= APP_URL ?>/admin/manage-staff.php"
                            class="<?= ($activeNav ?? '') === 'staff' ? 'active' : '' ?>">
                            <span class="nav-icon">👥</span> Staff
                        </a>
                    <?php endif; ?>

                    <a href="<?= APP_URL ?>/admin/appointments-list.php"
                        class="<?= ($activeNav ?? '') === 'appointments' ? 'active' : '' ?>">
                        <span class="nav-icon">📅</span> Appointments
                    </a>

                    <?php if (RBAC::can('view_reports')): ?>
                        <a href="<?= APP_URL ?>/admin/reports.php"
                            class="<?= ($activeNav ?? '') === 'reports' ? 'active' : '' ?>">
                            <span class="nav-icon">📊</span> Reports
                        </a>
                    <?php endif; ?>

                    <?php if (RBAC::can('access_admin_panel')): ?>
                        <a href="<?= APP_URL ?>/admin/feedback.php"
                            class="<?= ($activeNav ?? '') === 'feedback' ? 'active' : '' ?>">
                            <span class="nav-icon">📩</span> Feedback
                        </a>
                    <?php endif; ?>

                </nav>
            </div>

            <!-- ── Intercom Section ── -->
            <div class="sidebar-section">
                <div class="sidebar-section-label">Intercom</div>
                <nav class="sidebar-nav">

                    <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php"
                        class="<?= ($activeNav ?? '') === 'chat' ? 'active' : '' ?>">
                        <span class="nav-icon">💬</span> Messages
                        <span class="nav-badge" id="unread-badge" style="display:none">0</span>
                    </a>

                    <a href="<?= APP_URL ?>/intercom/channels/department-chat.php"
                        class="<?= ($activeNav ?? '') === 'dept-chat' ? 'active' : '' ?>">
                        <span class="nav-icon">🏢</span> Dept Channel
                    </a>

                    <a href="<?= APP_URL ?>/intercom/directory/directory.php"
                        class="<?= ($activeNav ?? '') === 'directory' ? 'active' : '' ?>">
                        <span class="nav-icon">📖</span> Directory
                    </a>

                    <?php if (RBAC::can('manage_chat_rooms')): ?>
                        <a href="<?= APP_URL ?>/intercom/admin/manage-rooms.php"
                            class="<?= ($activeNav ?? '') === 'rooms' ? 'active' : '' ?>">
                            <span class="nav-icon">⚙</span> Manage Rooms
                        </a>
                        <a href="<?= APP_URL ?>/intercom/admin/chat-admin.php"
                            class="<?= ($activeNav ?? '') === 'chat-admin' ? 'active' : '' ?>">
                            <span class="nav-icon">🛡</span> Chat Admin
                        </a>
                    <?php endif; ?>

                </nav>
            </div>

            <!-- ── Sidebar Footer ── -->
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar"><?= e($user['avatar']) ?></div>
                    <div class="sidebar-user-info">
                        <strong><?= e($user['name']) ?></strong>
                        <span><?= e($user['role_label']) ?></span>
                    </div>
                </div>
                <a href="<?= APP_URL ?>/logout.php" class="sidebar-logout">⏻ Sign Out</a>
            </div>

        </aside>
        <!-- /sidebar -->

        <!-- ════════════════════════════════════════
     MAIN CONTENT WRAPPER
     ════════════════════════════════════════ -->
        <div class="main-content">

            <!-- ── Topbar ── -->
            <header class="topbar">
                <!-- Mobile hamburger (shown via CSS on small screens) -->
                <button class="topbar-icon-btn" id="menu-btn"
                    onclick="document.getElementById('sidebar').classList.toggle('open')" style="display:none"
                    aria-label="Open menu">☰</button>

                <span class="topbar-title"><?= e($pageTitle ?? 'Dashboard') ?></span>

                <div class="topbar-search">
                    <span class="topbar-search-icon">🔍</span>
                    <input type="text" id="global-search" placeholder="Search patients, doctors…" autocomplete="off">
                </div>

                <div class="topbar-actions">
                    <button class="topbar-icon-btn"
                        onclick="window.location='<?= APP_URL ?>/intercom/channels/intercom-chat.php'" title="Messages">
                        💬<span class="topbar-notif-dot" id="chat-dot" style="display:none"></span>
                    </button>
                    <button class="topbar-icon-btn" title="Notifications">🔔</button>
                </div>
            </header>

            <!-- ── Flash message (auto-clears after 5s via main.js) ── -->
            <?php if ($flash):
                echo $flash; endif; ?>

            <!-- ════════════════════════════════════════
       PAGE CONTENT — your HTML goes below here
       ════════════════════════════════════════ -->