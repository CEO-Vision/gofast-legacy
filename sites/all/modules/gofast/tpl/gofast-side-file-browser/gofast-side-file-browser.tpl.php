<!-- START gofast-side-file-browser.tpl.php -->
<div class="side-explorer-wrapper side-explorer-main d-flex flex-column w-100 max-h-100" id="<?= $tab_id ?>-side-explorer">
    <div id="side_explorer_header">
        <div id="side_explorer_toolbar_search" class="input input-group-sm">
            <div class="input-group">
                <input id="side_explorer_toolbar_search_input" type="text" class="form-control" placeholder="<?php echo t('Filter', array(), array('context' => 'gofast:ajax_file_browser')); ?>" aria-describedby="sizing-addon3">
                <div class="input-group-append dropdown no-arrow" id="file_browser_mobile_toolbar_refresh_group">
                    <button title="<?php echo t('Refresh'); ?>" onclick="Gofast.sideFileBrowser.refreshBrowser('<?= $tab_id ?>');" type="button" class="btn input-group-text no-footer"><i class="fa fa-refresh" aria-hidden="true"></i></button>
                </div>
                <?php if($node_type) : ?>
                  <a href="/node/add/<?=$node_type?>" type="button" class="btn btn-icon btn-light-primary ml-2"><i class="fas fa-plus"></i></a>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <div id="side_explorer_body" class="side-explorer-body panel-body">
        <?= empty($items) ? theme("gofast_side_file_browser_no_item", array("node_type" => $node_type)) : $items ?>
    </div>  
</div>
<!-- END gofast-side-file-browser.tpl.php -->
<script>
    jQuery(document).ready(function() {
        // uncollapse on link click
        jQuery("#<?= $tab_id ?>-side-explorer .side-explorer-element-name:not(.processed)").on("click", function(e) {
            $(this).addClass("processed");
            const arrow = jQuery(e.currentTarget).closest('tr').find(".side-explorer-element-open");
            if (arrow.hasClass("ki-bold-arrow-next")) {
                arrow.click();
            }
        });
        // uncollapse on icon click
        jQuery("#<?= $tab_id ?>-side-explorer .side-explorer-element-open:not(.side-explorer-processed)").addClass("side-explorer-processed").on("click", Gofast.sideFileBrowser.treeWidgetItemCollapseCallback);
        if(jQuery("#webform").hasClass("active")) {
            jQuery("#<?= $tab_id ?>-side-explorer .explorer-main-container .nav.nav-tabs a.active:not('#<?= $tab_id ?>')").removeClass('active');
        }
        jQuery("#<?= $tab_id ?>-side-explorer [id='side_explorer_toolbar_search_input']").on("keyup", Gofast.sideFileBrowser.searchBrowser);
        jQuery("[data-toggle='tooltip']").tooltip();
    });
</script>