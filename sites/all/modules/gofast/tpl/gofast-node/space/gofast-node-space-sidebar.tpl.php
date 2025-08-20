<?php
// if (count(module_implements("extra_metadata")) >= 1) {
//   //Check if node have metadata
  $extra_datas = array();
//   foreach (module_implements("extra_metadata") as $module) {
//     $metadata = call_user_func($module . "_extra_metadata", $node);
//     if(!empty($metadata)){
//       $extra_datas[] = $metadata;
//     }
//   }

// }
?>

<div class="card card-custom card-stretch <?= gofast_essential_is_essential()  ? "card-simplified" : "" ?>">
  <div class="position-absolute h-100 d-flex"><span id="collapsible-space-metadata-panel-toggle" class="m-auto cursor-pointer d-flex"><i class="fas fa-chevron-left m-auto"></i></span></div>
  <?php if($node->status != 0 ): ?>
    <!-- <div class="card-header justify-content-end h-50px min-h-50px border-0 px-2 overflow-hidden"> -->
      <!-- <div id="node-tabsHeader" class="card-toolbar min-w-200px w-100"> -->
        <!-- @include('components.document.metadonnes.headerTabs') -->
      <!-- </div> -->
    <!-- </div> -->
    <div class="card-body p-0 collapsed">
      <div class="tab-content p-3 h-100 w-100" id="myTabContent" data-nid="<?= $node->nid ?>">

        <div data-nid="<?= $node->nid ?>" class="tab-pane fade show active " id="space__infotab" role="tabpanel" aria-labelledby="info-tab">
          <div id="node-info-content-unprocessed" class="spinner spinner-center spinner-primary spinner-lg m-5 not-processed position-absolute h-100 w-100"></div>
        </div>
        <?php if (count(module_implements("extra_metadata")) >= 1) { ?>
          <?php foreach($extra_datas as $extra_data) : ?>
            <div class="tab-pane fade" id="<?php print $extra_data['id']; ?>" role="tabpanel" aria-labelledby="extra-metadata-tab">
              <div id="extra-metadata-container">
                <div>
                  <div id="extra-metadata-tab" class="comment-wrapper">
                  <div id="gofast-node-extra-metadata-loader" class="spinner spinner-center spinner-primary spinner-lg m-5 not-processed position-absolute h-100 w-100"></div>
                </div>
                </div>
              </div>
            </div>
          <?php endforeach;?>
        <?php } ?>
      </div>
    </div>
    <?php else: ?>
      <div class="card-body p-0">
        <div class="tab-content p-3 h-100 w-100" id="myTabContent">
          <div class="tab-pane fade show active " id="space__infotab" role="tabpanel" aria-labelledby="info-tab">
            <div id="node-info-content-unprocessed" class="spinner spinner-center spinner-primary spinner-lg m-5 not-processed position-absolute h-100 w-100"></div>
          </div>
        </div>
      </div>
  <?php endif; ?>
</div>


<script type='text/javascript'>
  jQuery(document).ready(function() {
    // Load the metadata tab
    var baseUrl = window.location.protocol + "//" + window.location.host;
    Gofast.processAjax(baseUrl + "/gofast/node-info/<?= $node->nid ?>", true);

    // Set click event en metadata panel toggle button
    jQuery("#ogContainer > .sideContent #collapsible-space-metadata-panel-toggle").on("click", Gofast.initCollapsibleMetadataPanel);

    setTimeout(function() {
      Gofast.loadextrametadata("<?= $node->nid ?>");
    }, 2000);
  });
</script>
