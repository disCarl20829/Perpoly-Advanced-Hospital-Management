<?php
/**
 * footer.php — Closes the layout opened by header.php
 *
 * HOW TO USE:
 *   Always include this at the very bottom of every authenticated page,
 *   after all your page HTML:
 *
 *   <?php require_once __DIR__ . '/../footer.php'; ?>
 *
 * It closes:
 *   </div>  ← .main-content  (opened in header.php)
 *   </div>  ← .hms-shell     (opened in header.php)
 * Then loads base JS + any $extraJs you set before header.php.
 */
?>

<!-- ════ END OF PAGE CONTENT ════ -->

</div><!-- /.main-content -->
</div><!-- /.hms-shell -->

<!-- Base JS (always loaded) -->
<script src="<?= ASSET_PATH ?>/js/main.js"></script>

<!-- Extra JS (set $extraJs = ['chat.js'] before including header.php) -->
<?php if (!empty($extraJs)):
    foreach ($extraJs as $js): ?>
        <script src="<?= ASSET_PATH ?>/js/<?= e($js) ?>"></script>
    <?php endforeach; endif; ?>

</body>

</html>