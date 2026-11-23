<div class="panel panel-default manage-folders-locations-panel">
  <div class="panel-body">
    <span id="folder" style="display:none;"><?php echo $folder; ?></span>
    <?php echo t('Setting locations of', array(), array('context' => 'gofast:taxonomy')); ?> <strong><?php echo $title; ?></strong> :
    <ul>
      <?php foreach ($locations_display as $location) { ?>
        <li>
          <?= $location; ?>
        </li>
      <?php } ?>
    </ul>
    <div class="manage-folders-locations-info" style="position: absolute; right: 100px; margin-top: -5px;"><i class='fa fa-clock-o' style='color:orange' aria-hidden='true'></i> <?php echo t('Pending...', array(), array('context' => 'gofast:taxonomy')) ?></div>
    <span id="locations" style="display:none"><?php echo json_encode($locations_a); ?></span>
    <span id="is_broadcast" style="display:none"><?php echo (bool)$is_broadcast; ?></span>
  </div>
</div>
