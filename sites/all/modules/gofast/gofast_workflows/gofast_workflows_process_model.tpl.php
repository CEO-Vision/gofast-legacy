<select class="form-control form-select gofastSelect2 wf-process-select" data-process-id="<?= $variables["process_id"] ?>" style="width: 90%;">
    <option value="0"> <?php print t("Default"); ?> </option>
    <?php foreach ($variables['profils']  as $profil) : ?>
        <option value="<?php print $profil->id ?>"><?php print $profil->name ?></option>
    <?php endforeach ?>
</select>


<div class="gofast_wf_actions">
    <?php echo $actions; ?>
</div>

<script>
  jQuery(document).ready(function() {

    if(!$("#gofast_block_delta-gofast_workflows_light_dashboard-gofast_workflows select").length) {
      return;
    }
    // prevent triggering a mouseout event when a select dropdown is open
    $("#gofast_block_delta-gofast_workflows_light_dashboard-gofast_workflows select").on("select2:open", (e) => {
      e.stopPropagation();
      window.GFTopbarMenu.pauseDropdownHoverTime = Infinity;
    });
    // go back to normal behavior when hovering the menu again
    $("#gf-topbar-menu .menu-submenu").on("mouseenter", () => {
      var isSelectOpen = false;
      // Don't close tab is select is still focused
      for(const selectElement of $(".gofast_wf_profil .gofastSelect2")) {
        if($(selectElement).data("select2")?.isOpen()){
          isSelectOpen = true;
          break;
        }
      }
      if(!isSelectOpen){
        window.GFTopbarMenu.pauseDropdownHoverTime = 0
      }
    });
    // force-hide the menu if clicking outside
    $(document).on("click", (e) => {
      if ($(e.target).closest("#gf-topbar-menu").length) {
        return;
      }
      window.GFTopbarMenu.pauseDropdownHoverTime = 0;
      window.GFTopbarMenu.hideDropdowns();
    });
  })
</script>