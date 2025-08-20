<?php
$items_count = count($nodes_description);
?>
<div class="d-flex flex-column h-100">
  <h3> <?= format_plural($items_count, "Are you sure you want to extract the following item ?", "Are you sure you want to extract the following items ?", array(), array("context" => "gofast:ajax_file_browser")) ?></h3>
    <div class="d-flex flex-column flex-wrap flex-grow-1" style="height: 0%;">
  
    <?php foreach ($nodes_description as $index => $node_description) :
      $locations_string = implode("", array_map(function ($loc) {
        return "<ul class='list-group'>" . str_replace("/Sites", "", $loc) . "</ul>";
      }, $node_description->locations));
      $is_templates = $node_description->title == "TEMPLATES";
      ?>
        <div class="my-2"
            <?php if (count($node_description->locations) > 1) : ?>data-toggle="tooltip"
            data-html="true" data-trigger="hover" data-placement="bottom"
            title="<li class='border-0 list-group-item'><?= $locations_string ?></li>" <?php endif; ?> <?php if (!empty($node_description->children)) : ?> type="button" data-toggle="collapse" data-target="#removableContent<?= $index ?>" <?php endif; ?>>
            <div class="d-flex align-items-center">
                <i class="fa-2x <?= $node_description->icon ?>" <?= $is_templates ? "style=\"color: #F0685A !important;\"" : "" ?>></i>
                &nbsp;<span
                        class="font-size-lg"><?= $node_description->title ?></span>
              <?php if (count($node_description->locations) > 1) : ?>&nbsp;<i
                      class="fa fa-question-circle"></i><?php endif; ?>
            </div>
          <?php if (!empty($node_description->children)) : ?>
              <div class="collapse" id="removableContent<?= $index ?>">
                  <div class="font-weight-bold">
                    <?= t("The folder above has the following content:", [], ["context" => "gofast:ajax_file_browser"]) ?>
                  </div>
                <?php foreach ($node_description->children as $child) :
                  $is_templates = $child->title == "TEMPLATES";
                  ?>
                    <div>
                        <i class="<?= $child->icon ?>" <?= $is_templates ? "style=\"color: #F0685A !important;\"" : "" ?>></i>
                        &nbsp;<span><?= $child->title ?></span>
                    </div>
                <?php endforeach; ?>
              </div>
          <?php endif; ?>
        </div>
    <?php endforeach; ?>
    </div>
  <div>
    <span><?= t("Type here the name of the destination folder : (Leave empty to extract here)", array(), array("context" => "gofast:gofast_ajax_file_browser")) ?></span>
    <input id="unzip-target-folder-input" type="text" class="w-100 form-control">
  </div>
</div>

<script>
  jQuery(document).ready(function () {
    setTimeout(function () {
      jQuery("body").tooltip({selector: '[data-toggle=tooltip]'});
    }, 1000);
  });
</script>