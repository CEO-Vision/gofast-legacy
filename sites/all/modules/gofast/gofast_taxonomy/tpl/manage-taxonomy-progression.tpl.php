<?php 
  $field_display = "";
  switch($field){
    case 'language':
      $field_display = t("the language", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_state':
      $field_display = t("the state", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_category':
      $field_display = t("the category", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_tags':
      $field_display = t("the tags", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_date':
      $field_display = t("the deadline", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_criticity':
      $field_display = t("the criticity", array(), array('context' => 'gofast:taxonomy'));
      break;
    case 'field_classification':
      $field_display = t("the classification", array(), array('context' => 'gofast:taxonomy'));
      break;
    default:
      $field_display = $field_name;
      break;
  }
?>

<div class="panel panel-default manage-locations-panel">
  <div class="panel-body">
    <?php echo t('Setting', array(), array('context' => 'gofast:taxonomy')); ?> <?php echo $field_display ?> <?php echo t('of', array(), array('context' => 'gofast:taxonomy')); ?> <strong><?php echo $title; ?></strong> <?php echo t('to', array(), array('context' => 'gofast:taxonomy')); ?> : 
    <?php
      if($field == 'field_tags' || $field_type == "tagify"){
    ?>
      <ul>
    <?php
      foreach($value as $tag){
        print "<li>";
        print taxonomy_term_load($tag['tid'])->name;
        print "</li>";
        $tags[] = $tag['tid'];
      }
      $value = json_encode($tags);
    ?>
      </ul>
    <?php
      }else if(isset($vid)){
        print i18n_taxonomy_localize_terms(taxonomy_term_load($value))->name;
      } else {
        print $value;
      }
      ?>
    <span id="value" style="display:none"><?php echo $value ?></span>
    <div class="manage-locations-info" style="position: absolute; right: 100px; margin-top: -1.5rem;"><i class='fa fa-clock-o' style='color:orange' aria-hidden='true'></i> <?php echo t('Pending...', array(), array('context' => 'gofast')) ?></div>
    <span id="nid" style="display:none"><?php echo $nid; ?></span>
    <span id="vid" style="display:none"><?php echo $vid; ?></span>
    <span id="field" style="display:none"><?php echo $field; ?></span>
    <span id="field_type" style="display:none"><?php echo $field_type; ?></span>
  </div>
</div>