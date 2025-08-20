<?php global $base_url; ?>
<script src="<?php echo $base_url . "/sites/all/modules/gofast/gofast_directory/js/gofastAdminDirectoryEntitiesTable.js" ?>"></script>

<div id="container-selected-items" style="display:none;">
  <?php echo gofast_directory_entities_actions_get_all_actions(); ?>
</div>
<div class="w-100 h-100">
    <div id="gofastEntitiesTable" class="datatable datatable-bordered datatable-head-custom h-100" data-columns='<?php echo $columns ?>'></div>
</div>

<script>Gofast.initEntitiesDirectory();</script>