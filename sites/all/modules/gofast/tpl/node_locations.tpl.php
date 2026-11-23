<?php $is_confidential = gofast_taxonomy_is_node_confidential($nid); ?>
<div id="<?php echo $container_id; ?>" class="<?php echo $container_class; ?>">
  <div class="xeditable-trigger-1">
      <a 
        href="<?= $is_confidential ? "#" : $href; ?>"
        id="manage-locations"
        <?= $is_confidential ? 'aria-disabled="true"' : "" ?>
        <?= $is_confidential ? 'title="'.t("This document is confidential", array(), array("context" => "gofast:gofast_cmis")).'"' : "" ?>
        class="btn btn-primary btn-sm p-2 ctools-use-modal xeditable-trigger<?= isset($relative_positioning) && $relative_positioning ? " top-0" : "" ?><?= $is_confidential ? " disabled xeditable_processed ctools-use-modal-processed" : "" ?>"
        alt="<?php echo t('Edit', array(), array('context' => 'gofast')); ?>"
      
      >   
      <span class="font-weight-bolder">
        <?php echo t('Edit', array(), array('context' => 'gofast')); ?>
      </span>
    </a>
  </div>
</div>