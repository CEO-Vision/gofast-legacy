<?php

/**
 * Get all extra metadata from node
 */
function gofast_metadata_get_metadata_from_node($node, $module_names = []){

  $all_metadatas = [];
  // use module_implements to get all metadatas declare in specific hook
  $hook_name = 'declare_metadatas';
  if(empty($module_names)){
    $module_names = module_implements($hook_name);
  }
  foreach ((array)$module_names as $module_name) {
    $main_module_name = gofast_metadata_get_main_module_name($module_name);
    $function = $module_name . '_' . $hook_name;
    if (function_exists($function)) {
      $result = $function();
      // If module don't have any filter_callback, get modules metadata for all nodes
      if(isset($result["filter_callback"]) && !$result["filter_callback"]($node)){
        continue;
      }
      if (isset($result)) {
        $all_metadatas[$main_module_name][$result['name']] = $result['metadatas'];
      }
    }
  }
  return $all_metadatas;
}

/**
 * Get the values of fields that are in all module fields
 */
function gofast_metadata_filter_common_field_values($nodes){

  foreach($nodes as $node){

    $hook_name = 'declare_metadatas';
    $module_names = module_implements($hook_name);

    foreach($module_names as $module_name){
      $main_module_name = gofast_metadata_get_main_module_name($module_name);
      // Get all extra metadata of the node
      $node_metadatas = gofast_metadata_get_metadata_from_node($node, $module_name);
      if(!$node_metadatas[$main_module_name]){
        $node_metadatas = [];
      } else {
        $node_metadatas = array_values($node_metadatas[$main_module_name])[0] ?? [];
      }
      // Only the fields of this node's bundle (a module may declare space-only
      // ones), and never the slots the display layer hides.
      $node_metadatas = array_filter($node_metadatas, function ($metadata) use ($node) {
        return (empty($metadata["bundles"]) || in_array($node->type, $metadata["bundles"], TRUE))
          && empty($metadata["hidden_in_ui"]);
      });

      if(!isset($metadatas[$main_module_name])){
        $metadatas[$main_module_name] = $node_metadatas;
      }
      foreach($metadatas[$main_module_name] as $field_name => &$metadata){
        if($metadata["type"] == "separator" || !$metadata["is_manageable"]){
          unset($metadatas[$main_module_name][$field_name]);
        }      
        // Get only select options that are on all metadatas
        if(isset($node_metadatas[$field_name]["fields"])){
          // Map arrays before making intersection on keys
          $node_metadata_options = array_column($node_metadatas[$field_name]["fields"], "text", "id");
          $metadata_options = array_column($metadata["fields"], "text", "id");
          $filtered_options = array_intersect_key($node_metadata_options, $metadata_options);
          $metadata["fields"] = [];
          // Put back options to their previous format
          foreach($filtered_options as $key => $value){
            $metadata["fields"][] = array("id" => $key, "text" => $value);
          }
        }
      }
      // Get all extra metadatas that are available for all nodes
      $metadatas[$main_module_name] = array_intersect_assoc($metadatas[$main_module_name], $node_metadatas);
    }
  }
  
  return $metadatas;
}

/**
 * Get the main module that is located inside gofast modules folder (e.g. gofast/, gofast_client/)
 */
function gofast_metadata_get_main_module_name($module_name){
  $module_path = drupal_get_path("module", $module_name);
  $main_module_name = preg_replace('#.*?/modules/(gofast[^/]*)/(gofast[^/]*).*#', '$2', $module_path);

  return $main_module_name;
}