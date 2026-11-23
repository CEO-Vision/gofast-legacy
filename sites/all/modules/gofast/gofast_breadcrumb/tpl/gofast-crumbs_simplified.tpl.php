<a class="text-hover-bold " href="/<?php echo $section ?>/<?php echo $ulid ?>">
  <?php echo theme("gofast_node_icon_format", array('node' => node_load($nid)));  ?>
  <?php print $title;?></a><?php echo isset($role) ? $role : ''; ?>
  <?php if (isset($is_confidential) && $is_confidential) { ?>
    <span class="label label-inline label-rounded label-outline-secondary"><?=t('Confidential')?></span>
  <?php }?>