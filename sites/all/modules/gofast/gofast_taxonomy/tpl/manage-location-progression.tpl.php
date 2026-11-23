<div class="panel panel-default manage-locations-panel">
  <div class="panel-body">
    <span id="nid" style="display:none;"><?php echo $nid; ?></span>
    <?php echo t('Setting locations of', array(), array('context' => 'gofast:taxonomy')); ?> <strong><?php echo $title; ?></strong> : 
    <ul>
      <?php foreach($locations_display as $display_path){ ?>
        <li>
          <?= $display_path; ?>
        </li>
      <?php } ?>
    </ul>
    <div class="manage-locations-info" style="position: absolute; right: 100px; margin-top: -5px;"><i class='fa fa-clock-o' style='color:orange' aria-hidden='true'></i> <?php echo t('Pending...', array(), array('context' => 'gofast:taxonomy')) ?></div>
    <span id="locations" style="display:none"><?php echo json_encode($locations_a); ?></span>
    <span id="locations-gids" style="display:none"><?php echo json_encode($locations_gids); ?></span>
    <span id="is_broadcast" style="display:none"><?php echo (bool)$is_broadcast; ?></span>
  </div>
</div>
