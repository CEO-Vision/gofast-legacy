<?php

/**
 * Implements hook_menu
 */
function gofast_search_advanced_menu() {
  $items = array();

  $items['search/advanced'] = array(
    'page callback' => 'gofast_search_advanced_search',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['advanced/search'] = array(
    'page callback' => 'gofast_search_advanced_search_query',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['advanced/search/history'] = array(
    'page callback' => 'gofast_search_advanced_search_history',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['advanced/search/fieldset'] = array(
    'page callback' => 'gofast_search_advanced_search_fieldset',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['modal/%ctools_js/search/advanced/history/clear/confirm'] = array(
    'page callback' => 'gofast_search_advanced_history_clear_confirm',
    'type' => MENU_CALLBACK,
    'page arguments' => array(1),
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['search/advanced/history/clear/selected/confirm'] = array(
    'page callback' => 'gofast_search_advanced_history_clear_selected_confirm',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );
  
  $items['search/advanced/filter/column'] = array(
    'page callback' => 'gofast_search_advanced_filter_column',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['search/advanced/export_to_csv'] = array(
    'page callback' => 'gofast_search_advanced_export_to_csv',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['search/advanced/retrieve_export_file'] = array(
    'page callback' => 'gofast_search_advanced_retrieve_export_file',
    'type' => MENU_CALLBACK,
    'access arguments' => array('access content'),
    'access callback' => 'user_access',
  );

  $items['search/advanced/contextual_actions'] = array(
    "page callback" => "gofast_search_advanced_get_entities_contextual_actions",
    "type" => MENU_CALLBACK,
    "access arguments" => array("access content"),
    'access callback' => 'user_access',
  );

  return $items;
}

/**
 * Callback for advanced search page.
 *
 * @return $pageContent
 */
function gofast_search_advanced_search() {
  $content = theme('page_gofast_search_advanced_search');
  $pageContent = gofast_create_page_content($content);

  return $pageContent;
}

/**
 * Callback for advanced search page.
 */
function gofast_search_advanced_search_query(){

  $pagination = $_GET['pagination'];
  $query = $_GET['query'];
  $spaces = $_GET['spaces'];
  $categories = $_GET['categories'];
  $search_name = $_GET['name'];
  $options = json_decode($_GET['options'],TRUE);
  $global_operator = $_GET["globalOperator"];
  
  $insert_history = $_GET['insertHistory'];
  $is_export = $_GET["export"] ?: false;
  if(!empty($_GET['sort'])){
    $insert_history = "false";
  }
  if(empty($pagination["page"])) $pagination["page"] = GOFAST_PAGINATION_PAGE_DEFAULT;
  if(empty($pagination["perpage"])) $pagination["perpage"] = GOFAST_PAGINATION_PERPAGE_DEFAULT;
  // Get all first GOFAST_EXPORT_RESULTS_MAX_SIZE results for the export
  if($is_export){
    $_GET['pagination']["page"] = 1;
    $pagination["perpage"] = GOFAST_EXPORT_RESULTS_MAX_SIZE;
    $_GET['pagination']["perpage"] = GOFAST_EXPORT_RESULTS_MAX_SIZE;
  }
  $filters_authorized = gofast_search_advanced_get_search_advanced_filters();
  // Get all filters authorized
  $all_filters = array();

  foreach($filters_authorized as $name => $filter_authorized){
    // We need to remove all filters who dont have solr field
    foreach ($filter_authorized['filters'] as $key => $filter) {
      if($filter['type'] == 'separator' || !$filter['solr_field']){
        unset($filter_authorized['filters'][$key]);
      }
    }
    $all_filters = array_merge($all_filters, $filter_authorized['filters']);
  }
  // Rewrite key with solr field
  $index = 0;
  foreach($all_filters as $key => $filter){
    // If it's a tagify filter add it to a specific array
    if($filter['type'] == 'tagify' && $options[$filter['solr_field']]){
      $filter_solr_field = $filter["solr_field"]; 
      $options[$filter_solr_field]["raw_value"] = $options[$filter_solr_field]["value"];
      $tags = json_decode($options[$filter_solr_field]["value"], true);
      $options[$filter_solr_field]["value"] = array_map(function($tag){
        return $tag["value"];
      } ,$tags);
    }
    if(isset($filter['solr_field']) && $filter['solr_field'] != $key){
      // Insert the filter at the same place in the array
      $all_filters = array_merge(array_slice($all_filters, 0, $index), array($filter['solr_field'] => $filter), array_slice($all_filters, $index));
      unset($all_filters[$key]);
    }
    $index++;
  }
  $filters = array();

  //Get nid from spaces
  $spaces = json_decode($spaces);
  foreach($spaces as $space){
    $filters['sm_og_group_content_ref'][] = "node:" . $space->value;
    $json = gofast_ac_format_value_json('node', node_load($space->value));
    $history_filters['sm_og_group_content_ref'][] = json_encode($json);
  }

  // Get categories
  foreach($categories as $category){
    $category = str_replace("im_field_category-", "", $category);
    $filters['im_field_category'][] = $category;
    $history_filters['im_field_category'][] = $category;
  }
  // Match all options with filters authorized
  foreach($options as $name => $option_value){
    $curr_operator = $option_value['operator'];
    $curr_value = str_replace($name . '-', '',$option_value['value']);
    
    // Store the history filters
    $history_filters[$name]['operator'] = $curr_operator;
    // If it's a tagify field, we want to store the tagify object
    if($all_filters[$name]["type"] == "tagify"){
      $history_filters[$name]['value'] = $option_value['raw_value'];
    } else {
      $history_filters[$name]['value'] = $curr_value;
    }
    if(isset($all_filters[$name]) && $curr_value != ""){
      // If it'a date operator we need to format the date
      switch ($curr_operator) {
        case 'between':
          // Convert the value to an array
          $array_date = explode(" - ", $curr_value);
          // Format the date
          $date_start = gofast_search_advanced_format_date_to_solr($array_date[0]);
          // A single date can be picked on both ends of the range, the end date then defaults to the start one
          $date_end = gofast_search_advanced_format_date_to_solr(isset($array_date[1]) ? $array_date[1] : $array_date[0], TRUE);

          // Skip the filter rather than sending an invalid range to Solr
          if (!$date_start || !$date_end) {
            continue 2;
          }

          // Define the solr array filter
          $curr_value = ' [' . $date_start . ' TO ' . $date_end . ']';
          break;
        case 'lower':
          // Get the value and format it
          $date_start = gofast_search_advanced_format_date_to_solr($curr_value);
          if (!$date_start) {
            continue 2;
          }
          // Define the solr array filter
          $curr_value = ' [' . $date_start . ' TO *]';
          break;
        case 'higher':
          // Get the value and format it
          $date_end = gofast_search_advanced_format_date_to_solr($curr_value, TRUE);
          if (!$date_end) {
            continue 2;
          }
          // Define the solr array filter
          $curr_value = ' [* TO ' . $date_end . ']';
          break;
        default:
          # code...
          break;
      }
      $filters[$name]['operator'] = $curr_operator;
      $filters[$name]['value'] = $curr_value;
    }
  }
  // If the initHistory is set to false, then dont insert the history
  if ($insert_history != "false") {
    gofast_search_advanced_history_save($search_name, $query, $history_filters, $global_operator);
  }
  
  // Search function from gofast_search module
  $results = gofast_search_query($query, $filters);
  // Store some values in variables to reaffect later
  $nb_results = $results['results'];
  // Keep only data we want
  $results = array_map(function($result) use ($all_filters) {
    $filtered_result = array();

    // Check facet filters authorized and add them to the result
    foreach($all_filters as $key=>$filter) {
      if(isset($filter['solr_field']) && !empty($filter['solr_field'])){
        $key = $filter['solr_field'];
      }
      if(isset($result['fields'][$key])) {
          $filtered_result[$key] = $result['fields'][$key];
        } else if (isset($result[$key])){
          $filtered_result[$key] = $result[$key];
        }
        else {
          $filtered_result[$filter['']] = '';
        }
      }
      return $filtered_result;
    }, $results);

  // Unset some values we don't want to display
  unset($results['results']);
  unset($results['total']);
  unset($results['popularity']);
  unset($results['facets']);
  // Create an array of all metadata (corresponding to Type, Titre, Popularité...) inside an array to be compatible with datatable, be care to dont have the same name for metadata
  foreach($all_filters as $key => $facet){

    //If it's a separator, we don't add it to the metadata
    if($facet['type'] == 'separator' || $facet['search_column_hidden'] == TRUE) continue;

    if(isset($facet['solr_field']) && !empty($facet['solr_field'])){
      $key = $facet['solr_field'];
    }
  }

  // Reach all results to reformate them
  foreach($results as $key => $result){

    // Create drupal hook to modify the result
    foreach(module_implements('advanced_search_result_alter') as $module){
      $result = call_user_func($module . "_advanced_search_result_alter", $result);
    }
    $results[$key] = $result;
  }
  if($is_export) {
    return $results;
  }
  
  // Send data to keen datatable
  $kt_results['data'] = $results;
  $kt_results['meta']['total'] = $nb_results;
  if(isset($_GET["sort"])){
    $kt_results['meta']["sort"]["field"] = $_GET["sort"]["field"];
    $kt_results['meta']["sort"]["sort"] = $_GET["sort"]["sort"];
  }
  $kt_results['meta']["page"] = $pagination["page"];
  $kt_results['meta']["pages"] = $kt_results['meta']['total'] / $pagination["perpage"];
  $kt_results['meta']["perpage"] = $pagination["perpage"];
  $kt_results["filters"]["query"] = $query;
  $kt_results["filters"]["spaces"] = $spaces;
  $kt_results["filters"]["categories"] = $categories;
  $kt_results["filters"]["options"] = $options;
  $kt_results["filters"]["insert_history"] = false;
  $kt_results["filters"]["globalOperator"] = $global_operator;
  print json_encode($kt_results); exit;
}

/**
 * Callback for advanced search history block.
 */
function gofast_search_advanced_search_history(){
  $pagination = $_GET['pagination'];

  global $user;

  $account = user_load($user->uid);

  $json_history = $account->search_advanced_history[LANGUAGE_NONE][0]['value'];
  $search_history = json_decode($json_history, true);

  if(empty($search_history)){
    $search_history = array();
  }

  // Reverse array to get the last search first
  $search_history = array_values(array_reverse($search_history));

  print json_encode($search_history); exit;
}


function gofast_search_advanced_search_fieldset(){
  $categories = $_GET['categories'];
  
  // Init the fieldset array
  // $fieldset = array();
  // foreach ($categories as $key => $category) {
  //   if($category['taxonomy_type'] == "category"){
  //     $fieldset[] = module_invoke_all('advanced_search_fieldset', $category['value']);
  //   }
  // }
}

/**
 * Callback for advanced search history clear form
 */
function gofast_search_advanced_history_clear_confirm($js){
  $form_id = 'gofast_search_advanced_history_clear_confirm_form';

  if (!$js) {
    $form = drupal_get_form($form_id);
    return $form;
  }

  ctools_include('modal');
  ctools_include('ajax');

  $form_state = array(
    'title' => t("Confirm deletion of advanced search history"),
    'ajax' => TRUE,
    're_render' => FALSE,
    'no_redirect' => TRUE,
  );

  $commands = ctools_modal_form_wrapper($form_id, $form_state);

  // Handle if submit with errors
  if (isset($commands[0])) {
    $commands[0]['output'] = gofast_normalize_string_from_ajaxifying($commands[0]['output']);
  }

  if ($form_state['executed']) {
    $commands[] = ajax_command_html('#ctools-add-js', "<script type='text/javascript'>$('#gofastAdvancedSearchHistory').KTDatatable('reload');</script>");
    $commands[] = ctools_modal_command_dismiss();
  }
  print ajax_render($commands);
  exit;
}

/**
 * Callback for advanced search history clear selected confirm
 */
function gofast_search_advanced_history_clear_selected_confirm(){
  $body = drupal_get_form('gofast_search_advanced_history_clear_confirm_form');
  print json_encode(drupal_render($body));
  exit;
}

/**
 * Callback for get search column filter template
 */
function gofast_search_advanced_filter_column(){
  
  // Get column filters
  $columns_displayed = $_GET['columns_displayed'];
  // Get all metadatas
  $columns_filters = gofast_search_advanced_declare_all_metadatas(false);
  // Reach all filters and remove all useless filters
  $columns_result = array();
  foreach ($columns_filters as $key => $filter) {
    foreach ($filter as $key2 => $filter2) {
      if ($filter2['search_column_hidden'] || $filter2['type'] == "separator") {
        unset($columns_filters[$key][$key2]);
        continue;
      }
      $data = array();
      $data['title'] = $filter2['title'];
      $data['id'] =  $filter2['solr_field'];
      // If $data['solr_filed] is in $columns_displayed, we set $data['checked'] to true
      if (in_array($data['id'], $columns_displayed)) {
        $data['checked'] = true;
      }
      $columns_result[$key][] = $data;
    }
  }
  // Send data to template
  $content = theme('gofast_search_advanced_filters_columns', array('columns' => $columns_result));
  // Send data to keen datatable
  print json_encode($content); exit;
}
// Convert search result to csv file
function gofast_search_advanced_export_to_csv(){
  set_time_limit(0);
  /** PHPSpreadSheet */
  require_once libraries_get_path('phpspreadsheet').'/vendor/autoload.php';
  $fid = rand(0, getrandmax());
  
  print $fid;
  fastcgi_finish_request();

  $filename = "export_search_".$fid.".csv";
  $_GET["export"] = true;

  $results = gofast_search_advanced_search_query();

  $all_metadata = gofast_search_advanced_declare_all_metadatas();
  
  $used_metadatas = [];
  // Get all metadata that are in at least 1 result
  foreach($results as $result){
    $used_metadatas = array_unique(array_merge($used_metadatas, array_keys($result)));
  }

  // Get metadata values of used metadata
  $metadata_to_export = array_filter($all_metadata, function($metadata) use($used_metadatas){
    return in_array($metadata["solr_field"], $used_metadatas);
  });

  // Create new PHPExcel object
  $objPHPExcel = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
  $objPHPExcel->getActiveSheet()->setTitle(t("Search Results", array(), array('context' => 'gofast:gofast_advanced_search')));
  $objPHPExcel->setActiveSheetIndex(0);
  
  $column = "A";
  $line = 1;

  // Make columns headers with metadata title
  foreach($metadata_to_export as $metadata){
    if(empty($metadata["title"]) || !isset($metadata["solr_field"])){
      continue;
    }
    // Store all solr_field of metadata to export
    $metadata_keys[] = $metadata["solr_field"];
    $objPHPExcel->getActiveSheet()->SetCellValue($column . $line, $metadata["title"]);
    $column++;
  }
  
  // Loop through each results to add
  foreach($results as $result){
    $column = "A";
    $line++;
    // Loop through each metadata to export
    foreach($metadata_keys as $metadata_key){
      $value = "";
      // If metadata value is an array, format it to json
      if(is_array($result[$metadata_key])){
        $value_array = [];
        foreach($result[$metadata_key] as $metadata_value) {
          if(is_string($metadata_value)){
            $value_array[] = $metadata_value;
          } else {
            if ($metadata_value["label"]){
              $value_array[] = $metadata_value["label"];
            } else if($metadata_value["title"]) {
              $value_array[] = $metadata_value["title"];
            }
          }
        }
        // Don't format to json if only one value
        if(count($value_array) > 1){
          $value = json_encode($value_array, JSON_UNESCAPED_UNICODE);
        } else {
          $value = $value_array[0];
        }
      } else {
        $value = $result[$metadata_key];
      }
      // Add value to the 
      $objPHPExcel->getActiveSheet()->SetCellValue($column . $line, $value);
      $column++;
    }
  }
  
  $objWriter = new \PhpOffice\PhpSpreadsheet\Writer\Csv($objPHPExcel);
  $file_path = "/var/www/d7/sites/default/files/export_search/$filename";
  $objWriter->save($file_path);
}

function gofast_search_advanced_retrieve_export_file(){
  $fid = $_GET["fid"];
  $filename = "export_search_".$fid.".csv";
  $file = '/var/www/d7/sites/default/files/export_search/'.$filename;

  if (file_exists($file)) {
    header('Content-Description: File Transfer');
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . basename($file) . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($file));
    ob_clean();
    flush();
  
    readfile($file);
    exit;
  } else {
    print "Waiting";
    exit;
  }
}

function gofast_search_advanced_cleanup_export_files_cron(){
  $dir = "/var/www/d7/sites/default/files/export_search";
  $files = scandir($dir);

  foreach ($files as $file) {
    if ($file != "." && $file != "..") {
      $filePath = $dir . DIRECTORY_SEPARATOR . $file;
      if (is_file($filePath)) {
        unlink($filePath);
      }
    }
  }
}