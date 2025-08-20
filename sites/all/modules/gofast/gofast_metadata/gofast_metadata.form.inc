<?php 

function gofast_metadata_form_gofast_taxonomy_manage_taxonomy_form_alter(&$form, &$form_state, $form_id){

  $selected_items = $form_state['selected_item_by_type'];

  foreach($selected_items as $type => $item_paths){

    if($type === "Folder"){
      return;
    }
    foreach($item_paths as $item_path){
      $alfresco_path = str_replace("/alfresco/webdav", "", $item_path);
      
      $_GET['href'] = $alfresco_path;
      gofast_cmis_replicate(FALSE);
      $item = gofast_cmis_item_get_by_path($alfresco_path);
      if(isset($item->id) && isset($item->properties['gofast:nid'])) {
        $selected_nids[] = $item->properties['gofast:nid'];
        
      }else if(isset($item->id) && isset($item->properties['alfcmis:nodeRef'])){
        $reference = $item->properties['alfcmis:nodeRef'];
        $nid = gofast_ajax_file_browser_get_nid_from_reference($reference);
        if(is_numeric($nid) && $nid > 0){
          $selected_nids[] = $nid;
        }
      }
    }
  }
  // Store all selected nids to have them when submitting
  $form["selected_nids"] = array(
    "#type" => "hidden",
    "#value" => $selected_nids,
  );
  $nodes = node_load_multiple($selected_nids);
  
  $metadatas = gofast_metadata_filter_common_field_values($nodes);

  $module_fields = array();
    
  foreach($metadatas as $main_module_name => $metadata){

    // Don't show module fields if there is no displayed metadata
    if(empty($metadata)){
      continue;
    }

    $main_module_info = system_get_info("module", $main_module_name);
    $main_module_label = $main_module_info["name"];
    $form["{$main_module_name}_row"] = array(
      '#type' => 'container',
      '#weight' => -35,
      '#attributes' => array(
        'class' => array('row', 'mb-0'),
      ),
      '#prefix' => "<div><hr class='mt-0'/><h3>".t($main_module_label, array(), array("gofast:gofast_metadata"))."</h3>",
      '#suffix' => "</div>",
    );

    foreach($metadata as $field_label => $field){
      // Set base field component template
      $field_component = array(
        '#title' => $field["title"],
        '#type' => 'textfield',
        '#prefix' => '<div class="col-3">',
        '#suffix' => '</div>',
      );
      
      if($field["type"] == "tagify" && isset($field["vid"])){
        $tagify_attributes = array(
          'class' => ['js-tagify', 'form-control-tags'],
          'data-taxonomy_term' => '',
          'data-vid' => $field["vid"],
          'data-ac-max-tags' => $field["max_tags"] ?? "Infinity",
          'data-tagify-name' => "ac-list-tags-custom-keywords-".$field["vid"],
        );
        $field_component["#attributes"] = $tagify_attributes;
        $field_component["#maxlength"] = NULL; // No maxlength
      }
  
      if($field["type"] == "select"){
        // Set options default values and append metadata options
        $options = array(0 => t('No change', array(), array('context' => 'gofast')), -1 => t('None', array(), array('context' => 'gofast')));
        foreach($field["fields"] as $option){
          $options[$option["id"]] = $option["text"];
        }
        
        $field_component["#type"] = "select";
        $field_component["#options"] = $options;
        $field_component["#attributes"] = array("style" => array("width: 100%"));
      }
      
      if($field["type"] == "switch"){
        $field_component["#type"] = "select";
        $field_component["#options"] = array(0 => t('No change', array(), array('context' => 'gofast')), -1 => t("No"), 1 => t("Yes"));
        $field_component["#attributes"] = array("style" => array("width: 100%"));
      }
      if($field["type"] == "date"){
        $field_component["#attributes"] = array(
          'class' => array('gofastDatepicker'),
          'data-toggle' => array('datepicker')
        );
      }

      $form["{$main_module_name}_row"][$field["name"]] = $field_component;
    }
    $module_fields[$main_module_name] = $metadatas[$main_module_name];
  }
  
  // Store all manageable metadatas fields
  $form["module_fields"] = array(
    "#type" => "hidden",
    "#value" => $module_fields,
  );

  array_unshift($form["#submit"], "gofast_metadata_manage_taxonomy_form_submit");
  return $form;
}

// Update extra metadata values
function gofast_metadata_manage_taxonomy_form_submit($form, &$form_state){
  $html = "";
  $module_fields = $form_state["values"]["module_fields"];
  // Iterate throught all root modules and submodules fields (e.g. gofast_sdma & gofast_sdma_fiche_gp & ...)
  foreach($module_fields as $fields){
    if(!$fields){
      return $form;
    }

    $selected_nids = $form_state["values"]["selected_nids"];
    
    // Format $fields to (key => value) format
    $fields = array_column($fields, null, "name");
    foreach($fields as $field_name => $field){
      $value = $form_state["values"][$field_name];
      if(empty($value)){
        continue;
      }
      // If value is -1, we want to empty the field value
      $value = $value == -1 ? "" : $value;
      
      if($field["type"] == "tagify"){
        $map_tid = function($element) {
          if (is_array($element)) {
            return $element['tid'];
          }
          else {
            return $element->tid;
          }
        };
        $value = json_decode($value, true);
        $tids = array_column($value, "value");
      }
      // Update every node fields value
      foreach($selected_nids as $nid){

        if($field["type"] == "tagify"){

          $node_new_taxo_term = array();
          $node_taxo_term = array();
          $node = node_load($nid);
          // Check if node already have some taxonomy term
          if(isset($node->{$field_name}[LANGUAGE_NONE])) {
            $node_taxo_term = $node->{$field_name}[LANGUAGE_NONE];
            $new_taxo_term = array_diff($tids, array_map($map_tid, $node_taxo_term));
          } else {
            $new_taxo_term = $tids;
          }
          // Add only new taxonomy term, without removing any
          foreach($new_taxo_term as $new_keyword_tid) {
            $node_new_taxo_term[]['tid'] = $new_keyword_tid;
          }
          $value = array_merge($node_taxo_term, $node_new_taxo_term);
        }

        $title = gofast_get_node_title($nid);
        $html .= theme('gofast_taxonomy_manage_taxonomy_progression', array('nid' => $nid, 'vid' => $field["vid"], 'title' => $title, 'field_name' => $field["title"], 'field' => $field_name, 'field_type' => $field["type"], 'value' => $value));
      }
    }
  }
  $form_state["render_html"] = $html;
}
