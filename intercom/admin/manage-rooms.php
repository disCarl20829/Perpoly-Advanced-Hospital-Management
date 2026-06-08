<?php
$pageTitle = 'Manage Rooms';
$activeNav = 'rooms';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/func.php';
requireLogin();
RBAC::enforce('manage_chat_rooms');

if (isPost() && verifyCsrf(post('csrf_token'))) {
    $action = post('action');
    if ($action === 'create') {
        $roomId = DB::insert(
            'INSERT INTO rooms (name,type,dept_id,div_id,archived,created_at) VALUES(?,?,?,?,0,NOW())',
            [sanitize(post('name')), sanitize(post('type')), sanitizeInt(post('dept_id')) ?: null, sanitizeInt(post('div_id')) ?: null]
        );
        // Add all dept members if department room
        if (post('type') === 'department' && sanitizeInt(post('dept_id'))) {
            $members = DB::all('SELECT id FROM users WHERE dept_id=? AND status=\'active\'', [sanitizeInt(post('dept_id'))]);
            foreach ($members as $m)
                DB::run('INSERT IGNORE INTO room_members (room_id,user_id) VALUES(?,?)', [$roomId, $m['id']]);
        }
        setFlash('success', 'Room created.');
        redirect('/intercom/admin/manage-rooms.php');
    } elseif ($action === 'archive') {
        DB::run('UPDATE rooms SET archived=1 WHERE id=?', [sanitizeInt(post('id'))]);
        setFlash('success', 'Room archived.');
        redirect('/intercom/admin/manage-rooms.php');
    } elseif ($action === 'unarchive') {
        DB::run('UPDATE rooms SET archived=0 WHERE id=?', [sanitizeInt(post('id'))]);
        setFlash('success', 'Room restored.');
        redirect('/intercom/admin/manage-rooms.php');
    }
}

$showArchived = get('archived') === '1';
$rooms = DB::all('SELECT r.*,d.name AS dept_name,dv.name AS div_name,
    (SELECT COUNT(*) FROM room_members WHERE room_id=r.id) AS member_count,
    (SELECT COUNT(*) FROM messages WHERE room_id=r.id) AS msg_count
    FROM rooms r LEFT JOIN departments d ON d.id=r.dept_id LEFT JOIN divisions dv ON dv.id=r.div_id
    WHERE r.archived=? ORDER BY r.created_at DESC', [$showArchived ? 1 : 0]);
$departments = DB::all('SELECT id,name FROM departments ORDER BY name');
$divisions = DB::all('SELECT id,name FROM divisions ORDER BY name');
require_once __DIR__ . '/../../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Manage Rooms</h1>
            <p>
                <?= count($rooms) ?>
                <?= $showArchived ? 'archived' : 'active' ?> rooms
            </p>
        </div>
        <div style="display:flex;gap:8px">
            <a href="?archived=<?= $showArchived ? '0' : '1' ?>" class="btn btn-outline">
                <?= $showArchived ? 'Active Rooms' : 'View Archived' ?>
            </a>
            <button class="btn btn-primary" onclick="document.getElementById('create-modal').style.display='flex'">+ New
                Room</button>
        </div>
    </div>
    <div class="card">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Room Name</th>
                        <th>Type</th>
                        <th>Department</th>
                        <th>Members</th>
                        <th>Messages</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rooms as $r): ?>
                        <tr>
                            <td><strong>
                                    <?= e($r['name']) ?>
                                </strong></td>
                            <td><span class="badge <?= $r['type'] === 'department' ? 'badge-green' : 'badge-blue' ?>">
                                    <?= ucfirst(e($r['type'])) ?>
                                </span></td>
                            <td>
                                <?= e($r['dept_name'] ?? $r['div_name'] ?? '—') ?>
                            </td>
                            <td>
                                <?= $r['member_count'] ?>
                            </td>
                            <td>
                                <?= $r['msg_count'] ?>
                            </td>
                            <td style="display:flex;gap:6px">
                                <a href="<?= APP_URL ?>/intercom/channels/intercom-chat.php?room=<?= $r['id'] ?>"
                                    class="btn btn-outline btn-sm">Open</a>
                                <form method="POST" style="display:inline">
                                    <?= csrfField() ?><input type="hidden" name="id" value="<?= $r['id'] ?>">
                                    <input type="hidden" name="action"
                                        value="<?= $r['archived'] ? 'unarchive' : 'archive' ?>">
                                    <button class="btn <?= $r['archived'] ? 'btn-green' : 'btn-outline' ?> btn-sm">
                                        <?= $r['archived'] ? 'Restore' : 'Archive' ?>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="create-modal"
    style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center">
    <div class="card" style="width:440px">
        <div class="card-header">
            <h2>Create Room</h2>
            <button onclick="document.getElementById('create-modal').style.display='none'"
                style="background:none;border:none;font-size:20px;cursor:pointer">✕</button>
        </div>
        <div class="card-body">
            <form method="POST">
                <?= csrfField() ?><input type="hidden" name="action" value="create">
                <div class="form-group"><label class="form-label">Room Name</label><input class="form-control"
                        name="name" required placeholder="e.g. ICU Staff Channel"></div>
                <div class="form-group"><label class="form-label">Type</label>
                    <select class="form-control form-select" name="type">
                        <option value="direct">Direct</option>
                        <option value="department">Department</option>
                        <option value="division">Division</option>
                        <option value="group">Group</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Department (optional)</label>
                    <select class="form-control form-select" name="dept_id">
                        <option value="">— None —</option>
                        <?php foreach ($departments as $d): ?>
                            <option value="<?= $d['id'] ?>">
                                <?= e($d['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Division (optional)</label>
                    <select class="form-control form-select" name="div_id">
                        <option value="">— None —</option>
                        <?php foreach ($divisions as $dv): ?>
                            <option value="<?= $dv['id'] ?>">
                                <?= e($dv['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button class="btn btn-primary btn-block">Create Room</button>
            </form>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/../../footer.php'; ?>