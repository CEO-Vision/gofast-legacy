<?php if (!gofast_og_is_entity_hide_members_tab($node)) : ?>
  <div class="d-flex h-100 w-100 flex-column">
    <div id="container-selected-items" style="display:none;">
      <?php echo gofast_directory_space_bulk_members_actions($node->nid, []); ?>
    </div>
    <div class="h-100 w-100">
      <div
        id="gofastSpaceMembersTable"
        class="gofastSpaceMembersTable datatable datatable-bordered datatable-head-custom h-100"
        data-checkboxes='<?php print $is_space_admin ? 1 : 0 ?>'
        data-admin-rid='<?php echo $admin_rid?>'
        data-readonly-rid='<?php echo $readonly_rid?>'
        data-contributor-rid='<?php echo $contributor_rid?>'
        data-group-manager-rid='<?php echo $group_manager_rid?>'
        data-columns='<?php echo $columns ?>'
        data-id="<?php print $node->nid; ?>"
      >
      </div>
    </div>
  </div>
<?php endif ?>

<!-- Scoped Styling for tmembers table adjustments -->

<script src="/<?= drupal_get_path('module', 'gofast_og') . "/js/gofastSpaceMembers.js" ?>"></script>
