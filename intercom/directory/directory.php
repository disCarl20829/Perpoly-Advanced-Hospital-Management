<?php
$pageTitle = 'Staff Directory';
$activeNav = 'directory';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../include/auth.php';
require_once __DIR__ . '/../../include/db.php';
require_once __DIR__ . '/../../include/rbac.php';
require_once __DIR__ . '/../../include/func.php';
requireLogin();

$divisions = DB::all('SELECT * FROM divisions ORDER BY name');
$depts = DB::all('SELECT d.*,dv.name AS div_name FROM departments d LEFT JOIN divisions dv ON dv.id=d.div_id ORDER BY dv.name,d.name');
$units = DB::all('SELECT u.*,d.name AS dept_name FROM units u LEFT JOIN departments d ON d.id=u.dept_id ORDER BY u.name');
require_once __DIR__ . '/../../header.php';
?>
<div class="page-body">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
            <h1>Hospital Directory</h1>
            <p>Browse divisions, departments, units, and personnel</p>
        </div>
        <a href="<?= APP_URL ?>/intercom/directory/directory-search.php" class="btn btn-outline">🔍 Search Personnel</a>
    </div>

    <div class="directory-tree">
        <?php foreach ($divisions as $div):
            $divDepts = array_filter($depts, fn($d) => $d['div_id'] == $div['id']); ?>
            <div class="dir-division">
                <div class="dir-division-header"
                    onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
                    <div class="dir-division-icon">🏛</div>
                    <div class="dir-division-name"><?= e($div['name']) ?></div>
                    <span style="color:var(--gray-500);font-size:12px"><?= count($divDepts) ?>
                        dept<?= count($divDepts) !== 1 ? 's' : '' ?></span>
                    <span style="color:var(--navy-light);font-size:14px;margin-left:8px">▾</span>
                </div>
                <div>
                    <?php foreach ($divDepts as $dept):
                        $deptUnits = array_filter($units, fn($u) => $u['dept_id'] == $dept['id']);
                        $headCount = DB::one('SELECT COUNT(*) AS n FROM users WHERE dept_id=? AND status=\'active\'', [$dept['id']])['n'] ?? 0; ?>
                        <div class="dir-dept">
                            <div class="dir-dept-name"
                                onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
                                🏢 <?= e($dept['name']) ?>
                                <span style="margin-left:auto;font-size:11.5px;color:var(--gray-500)"><?= $headCount ?>
                                    staff</span>
                                <span style="color:var(--navy-light);font-size:13px;margin-left:8px">▾</span>
                            </div>
                            <div style="padding-left:12px;margin-top:4px;margin-bottom:4px">
                                <?php foreach ($deptUnits as $unit): ?>
                                    <div class="dir-unit">
                                        📋 <?= e($unit['name']) ?>
                                        <span style="margin-left:auto;font-size:11px;color:var(--gray-300)">Unit</span>
                                    </div>
                                <?php endforeach; ?>
                                <div style="margin-top:8px">
                                    <a href="<?= APP_URL ?>/intercom/directory/directory-search.php?dept_id=<?= $dept['id'] ?>"
                                        class="btn btn-outline btn-sm">View <?= $headCount ?> staff →</a>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
        <?php if (empty($divisions)): ?>
            <div class="card">
                <div class="card-body" style="text-align:center;color:var(--gray-500);padding:48px">No divisions configured
                    yet.</div>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php require_once __DIR__ . '/../../footer.php'; ?>