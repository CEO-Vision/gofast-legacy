<?php

define("TAGS_DISPLAY_AMOUNT", 3);

/**
 * function gofast_search_advanced_get_search_advanced_filters
 * @return array
 *
 * Return the filters for the advanced search
 */
function gofast_search_advanced_get_search_advanced_filters(){

  $filters = gofast_search_advanced_declare_standard_metadatas()['metadatas'];
  $fieldset_filters['default'] = array(
    'title' => t('SEARCH AREA : Information'),
    'filters' => $filters,
    'weight' => 0,
  );

  // Special filters
  $fieldset_filters_final = array_merge($fieldset_filters, module_invoke_all('search_advanced_filters'));

  // Sort with weight DESC
  uasort($fieldset_filters_final, function($a, $b){
    return $a['weight'] - $b['weight'];
  });

  return $fieldset_filters_final;

}


function gofast_search_advanced_history_save($name, $query, $filters, $global_operator){
  global $user;

  $account = user_load($user->uid);

  // Get account search_history
  $search_history = $account->search_advanced_history[LANGUAGE_NONE][0]['value'];
  // If the search history is not empty, decode it
  if(!empty($search_history)){
    $search_history = json_decode($search_history, true);
  }else{
    $search_history = array();
  }

  // Generate unique id for the history
  $unique_id = uniqid();
  
  $history_values['id'] = $unique_id;
  $history_values['query'] = $query;
  $history_values['filters'] = json_encode($filters);
  $history_values['name'] = $name;
  $history_values['date'] = date('d/m/Y H:i:s');
  $history_values['globalOperator'] = $global_operator;
  
  $search_history[$unique_id] = $history_values;

  // Saved it to the user account
  $account->search_advanced_history["und"][0] = array(
    'value' => json_encode($search_history),
  );
  user_save($account);
}


/**
 * Returns an array of allowed taxonomy values for a given field name.
 *
 * @param string $field_name
 *   The name of the field for which to retrieve allowed taxonomy values.
 *
 * @return array
 *   An array of allowed taxonomy values for the given field name.
 */
function gofast_advanced_search_get_taxonomy($field_name){

  $allow_taxonomy_value = taxonomy_allowed_values(field_info_field($field_name));
    // Retrieve the allowed taxonomy values for the given field name.
    // Loop through each allowed taxonomy value.
    foreach ($allow_taxonomy_value as $tid => $term) {
      // Localize the taxonomy term name.
      $localized_term = i18n_taxonomy_localize_terms(taxonomy_term_load($tid));
      // Add the localized term to the array of allowed taxonomy values.
      $allow_taxonomy_value[$localized_term->tid] = $localized_term->name;
    }
    // Return the array of allowed taxonomy values.
    return $allow_taxonomy_value;
}


/**
 * Returns an array of allowed language values.
 *
 * @return array
 *   An array of allowed language values.
 */
function gofast_advanced_search_get_language(){
    // Retrieve the allowed language values.
    return locale_language_list('name', TRUE);
}


/**
 * Clear the selected history
 * @param array $selected
 */
function gofast_search_advanced_history_clear($selected = array()){

  gofast_search_advanced_history_delete($selected);
  
  ctools_include('modal');
  ctools_include('ajax');
  
  if(empty($selected)){
    $commands[] = gofast_command_toast_message("L'historique de recherche a été vidé", "success");
  }else{
  $commands[] = gofast_command_toast_message("Les lignes d'historique selectionnées ont étés supprimées", "success");
  }
  
  $commands[] = ctools_modal_command_dismiss();
  $commands[] = ajax_command_html('#ctools-add-js',"<script type='text/javascript'>
  $('#gofastAdvancedSearchHistory').KTDatatable('reload');
  Drupal.attachBehaviors();
  </script>");
  print ajax_render($commands);exit;
}

/**
 * Deletes the search advanced history account field.
 *
 * @param array $selected
 *   An array of selected history IDs to delete. If empty, delete all history.
 */
function gofast_search_advanced_history_delete($selected = array()) {
  global $user;

  $account = user_load($user->uid);

  // Get account search_history
  $search_history = $account->search_advanced_history[LANGUAGE_NONE][0]['value'];

  // If the search history is not empty, decode it
  if (!empty($search_history)) {
    $search_history = json_decode($search_history, true);
  } else {
    $search_history = array();
  }
  // Delete selected search history or all if $selected is empty
  if (!empty($selected)) {
    foreach ($selected as $id) {
      unset($search_history[$id]);
    }
  } else {
    $search_history = array();
  }
  // Save the updated search history to the user account
  $account->search_advanced_history["und"][0] = array(
    'value' => json_encode($search_history),
  );
  user_save($account);
}

/**
 * Returns an array of category options for the advanced search form.
 *
 * @return array
 *   An array of category options, keyed by category ID and with category name as value.
 */
function gofast_search_advanced_get_categories(){  
  // Map category terms to show category group titles
  $category_options = gofast_xeditable_vocabulary_to_select_items(GOFAST_VID_CATEGORY);
  $categories = [];
  foreach($category_options as $category_option){
    foreach($category_option["children"] as $child_option){
      $categories[$category_option["text"]][$child_option["tid"]] = $child_option["text"];
    }
  }
  return $categories;
}

function gofast_search_advanced_show_more_tags($tags) {
  
  $display_count = $_GET["display_count"] ?? TAGS_DISPLAY_AMOUNT;
  $tags = array_values($tags);
  if(count($tags) <= $display_count){
    return "";
  }
  $more_tags = array_slice($tags, $display_count);
  $tags_list_popup = "";

  foreach($more_tags as $tag){
    if(isset($tag["color"]) && isset($tag["tag_class"])){
      $tags_list_popup .= "<div class='badge badge-light-{$tag["color"]} w-100 text-truncate d-flex align-items-center justify-content-center' title='{$tag["label"]}'><i class='{$tag["tag_class"]}'></i><span class='font-weight-normal font-size-sm ml-2 text-wrap text-truncate'>{$tag["label"]}</span></div>";
    } else {
      $tags_list_popup .= "<span class='badge badge-secondary h-100 text-wrap text-truncate font-weight-normal' title='{$tag["label"]}'>{$tag["label"]}</span>";
    }
  }
  
  $count_more = count($tags) - $display_count;
  $button_text = $count_more . " " . t("more", array(), array("context" => "gofast:gofast_activity_feed")) . "...";
  $more_spaces_list = theme('gofast_search_advanced_more_tags', array('popover_content' => $tags_list_popup, 'button_text' => $button_text));

  return $more_spaces_list;
}

// Format field array to be displayed in search results
function gofast_search_advanced_format_tag_search_result($field_array) {
    // Prevent formatting if we are in export
    if(isset($_GET["export"]) && $_GET["export"] == true){
      return $field_array;
    }
    
    // Show the specified amout of item and hide others in a popup
    $tags = $field_array;
    array_splice($field_array, TAGS_DISPLAY_AMOUNT);
    $field_array["more"] = gofast_search_advanced_show_more_tags($tags);

    return $field_array;
}

function gofast_search_advanced_get_entities_contextual_actions(){

  $actions = array();

  if(empty($actions)){
    $search_action[]["themed"] = theme('gofast_link_generic', array(
      'text' => t('Add to cart', array(), array('context' => 'gofast')),
      'link_id' => "add-to-cart",
      'icon_class' => "fas fa-shopping-basket",
      'onClick' => 'Gofast.search.getAlfrescoItemForAddToCart()',
    ));
    $actions[] = [
      'id' => 'search-advanced-dropdown',
      'icon-class' => 'fa fa-bars',
      'children' => $search_action,
    ];
  }

  $contextual_actions = theme('contextual_links', array('buttons' => $actions));
  print $contextual_actions;
  exit;
}

/**
 * function gofast_search_advanced_format_date_to_solr
 * @param string $date : date picked by the user, in d/m/Y format
 * @param bool $end_of_day : TRUE for an upper bound, FALSE for a lower bound
 * @return string|null
 *
 * Convert a date picked in the advanced search into an inclusive Solr bound
 */
function gofast_search_advanced_format_date_to_solr($date, $end_of_day = FALSE) {

  $timezone = new DateTimeZone(date_default_timezone_get());
  $formatted_date = DateTime::createFromFormat('d/m/Y', trim((string) $date), $timezone);

  if (!$formatted_date) {
    return NULL;
  }

  // The picker only provides a day, so both bounds are widened to the whole day to stay inclusive
  if ($end_of_day) {
    $formatted_date->setTime(23, 59, 59);
  }
  else {
    $formatted_date->setTime(0, 0, 0);
  }

  // Solr indexes dates in UTC (see apachesolr_date_iso), the user timezone must be converted
  $formatted_date->setTimezone(new DateTimeZone('UTC'));

  return $formatted_date->format('Y-m-d\TH:i:s\Z');
}