<div class="card card-custom card-stretch <?= gofast_essential_is_essential()  ? "card-simplified" : "" ?>">
  <div class="position-absolute h-100 d-flex"><span id="collapsible-space-metadata-panel-toggle" class="m-auto cursor-pointer d-flex"><i class="fas fa-chevron-left m-auto"></i></span></div>
  <?php if($node->status != 0 ): ?>
    <div class="card-body p-0 collapsed">
      <div class="tab-content p-3 h-100 w-100" id="myTabContent" data-nid="<?= $node->nid ?>">
        <div data-nid="<?= $node->nid ?>" class="tab-pane fade show active " id="space__infotab" role="tabpanel" aria-labelledby="info-tab">
          <div id="node-info-content-unprocessed" class="spinner spinner-center spinner-primary spinner-lg m-5 not-processed position-absolute h-100 w-100"></div>
        </div>
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
  });
</script>
