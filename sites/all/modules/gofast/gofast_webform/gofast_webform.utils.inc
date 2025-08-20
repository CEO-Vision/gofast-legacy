<?php 

/**
 * Function to get the component ID (cid) based on the component name.
 *
 * @param int $nid
 *   The node ID of the Webform.
 * @param string $component_name
 *   The name of the component to search for.
 *
 * @return int|null
 *   The component ID (cid) if found, otherwise NULL.
 */
function gofast_webform_get_cid_by_form_key($nid, $component_name) {
  // Load the Webform node
  $node = node_load($nid);

  // Check if the node is a Webform
  if ($node && $node->type == 'webform') {
    // Iterate through the components of the Webform
    foreach ($node->webform['components'] as $cid => $component) {
      if ($component['form_key'] == $component_name) {
        // Return the component ID (cid) if the name matches
        return $cid;
      }
    }
  }

  // Return NULL if the component is not found
  return NULL;
}


/**
 * Function to get the options of a Webform component.
 *
 * @param array $component
 *   The component array.
 *
 * @return array
 *   The options array.
 */
function gofast_webform_component_options($component) {
  $options = array();
  if (!empty($component['extra']['items'])) {
    $items = explode("\n", $component['extra']['items']);
    foreach ($items as $item) {
      list($key, $value) = explode('|', $item);
      $options[trim($key)] = trim($value);
    }
  }
  if(!empty($component['extra']['other_option'])){
    $options = array_merge($options, $component['extra']['other_option']);
    
  }
  return $options;
}


/**
 * Function to get the fid of a file from its URI in Drupal 7.
 */
function gofast_webform_get_fid_by_uri($uri) {
  // Database query to get the file based on its URI
  $result = db_select('file_managed', 'f')
    ->fields('f', array('fid'))
    ->condition('uri', $uri)
    ->execute()
    ->fetchField();

  // Check if the file exists and return its fid
  if ($result) {
    return $result;
  } else {
    drupal_set_message(t('The file with URI @uri was not found.', array('@uri' => $uri)), 'error');
    return FALSE;
  }
}

/**
 * Function to render Webform submissions in a readable format.
 *
 * @param array $submissions
 *   The array of Webform submissions.
 *
 * @return array
 *   The formatted array of Webform submissions.
 */
function gofast_webform_render_readable_submissions($submissions){
  
  // Reach all submissions to format them
  $submissions_formatted = array();
  foreach($submissions as $sid => $submission){
    
    // If the submission is in draft mode, remove it from the list
    if($submission->is_draft){
      continue;
    }
    
    // Unset nid, serial, is_draft, preview and highest valid page fields
    unset($submission->sid);
    unset($submission->nid);
    unset($submission->serial);
    unset($submission->is_draft);
    unset($submission->highest_valid_page);
    unset($submission->preview);
    
    // Unset comleted and modified fields
    $submission->completed = date('Y-m-d H:i:s', $submission->completed);
      
    unset($submission->modified);
    
    // Include timeSpent, score and percentage fields if they exist for the quiz
    if(isset($submission->data['timeSpent']) && isset($submission->data['score']) && isset($submission->data['percentage'])){
      $submission->timeSpent = $submission->data['timeSpent'];
      $submission->score = $submission->data['score'];
      $submission->percentage = $submission->data['percentage'];
      unset($submission->data['timeSpent']);
      unset($submission->data['score']);
      unset($submission->data['percentage']);
    }
    if(isset($submission->data['submissionPdf'])){
      $submission->submissionPdf = $submission->data['submissionPdf'];
      unset($submission->data['submissionPdf']);
    }
    
    $submissions_formatted[$sid] = $submission;
  }
  
  return $submissions_formatted;
}

function gofast_webform_get_webform_folder_reference($gid, $create = FALSE, $as_admin = FALSE) {
    $gid_reference = node_load($gid)->field_folder_reference['und'][0]['value'];
    $location_path = gofast_cmis_space_get_webdav_path($gid);
    // Create WEBFORM folder if it doesn't exist
    $webform_folder_reference = gofast_ajax_file_browser_get_reference_from_href($location_path . '/' . GOFAST_WEBFORM_FOLDER_NAME, $as_admin);
    if(!$webform_folder_reference && $create){
      $webform_folder = gofast_cmis_item_folder_insert(GOFAST_WEBFORM_FOLDER_NAME, $gid_reference, TRUE);
      $webform_folder_reference = $webform_folder->properties['alfcmis:nodeRef'];
    }
    return $webform_folder_reference;
}

function gofast_webform_get_webform_node_folder_reference($gid, $nid, $create = FALSE, $as_admin = FALSE) {
    $gid_reference = node_load($gid)->field_folder_reference['und'][0]['value'];
    $location_path = gofast_cmis_space_get_webdav_path($gid);
    
    // Load webform node folder reference
    if(!is_numeric($nid)){
      $node = $nid;
    }else{
      $node = node_load($nid);      
    }
    // Create the webform folder for the current node if it doesn't exist
    $node_webform_folder_reference = gofast_ajax_file_browser_get_reference_from_href($location_path . '/' . GOFAST_WEBFORM_FOLDER_NAME . '/' . $node->title, $as_admin);

    
    if(!$node_webform_folder_reference && $create){
      $webform_form_folder = gofast_webform_get_webform_folder_reference($gid, TRUE, $as_admin);
      $node_webform_folder = gofast_cmis_item_folder_insert($node->title, $webform_form_folder, $as_admin);
      $node_webform_folder_reference = $node_webform_folder->properties['alfcmis:nodeRef'];
    }
    
    return $node_webform_folder_reference;
}

function gofast_webform_create_expiration_hash($nid){

  $params = array("nid" => $nid);
  // $params["expire_date"] = gofast_link_sharing_get_expiry_timestamp();

  $encrypted_data = urlencode(gofast_encrypt(CIPHER_KEY, json_encode($params)));

  return $encrypted_data;
}

function gofast_webform_submit_as_admin() {
  global $user;
  $as_admin = FALSE;
  $username = $user->name;
  if (empty($username)) {
    $as_admin = TRUE;
  }
  
  return $as_admin;
}

function  gofast_webform_create_submission_folder($nid, $as_admin = FALSE) {
  global $user;

  $username = $user->name;
  if (!$as_admin) {
    // Check if the username exist in the database
    $user = user_load_by_name($username);
    if (!$user) {
      gofast_api_forbidden("User not found");
    }
    $folder_name = $username . '_' . time();
  } else {
    usurp(1);
    $folder_name = 'anonymous_' . $nid . '_' . rand(1, 1000) . '_' . time();
  }
  
  // Get the parent directory of the webform
  $gids = array_keys(gofast_og_get_parents_gids($nid, TRUE));
  $main_location = '';
  $node_webform_folder_reference = '';
  foreach ($gids as $gid) {
    // Check if webform folder exists
    $location_path = gofast_cmis_space_get_webdav_path($gid);
    if ($location_path) {
      // Create WEBFORM folder if it doesn't exist
      $webform_folder_reference = gofast_webform_get_webform_folder_reference($gid, TRUE);

      // If main location exists then we only need to multifile the webform folder
      if (empty($main_location)) {
        $node_webform_folder_reference = gofast_webform_get_webform_node_folder_reference($gid, $nid, $webform_folder_reference);
        // Create the current submission folder
        $submission_folder = gofast_cmis_item_folder_insert($folder_name, $node_webform_folder_reference);
        $submission_folder_reference = $submission_folder->properties['alfcmis:nodeRef'];
        // Store the main location
        $main_location = $location_path;
      } else {
        gofast_cmis_webservice_multifile_folder($node_webform_folder_reference, $webform_folder_reference);
      }
    }
  }
  return ['node_webform_folder' => $node_webform_folder_reference, 'submission_folder' => $submission_folder_reference];
}

function gofast_webform_get_component_by_name($nid, $cname){
  $node = node_load($nid);

  // Check if the node is a Webform
  if ($node && $node->type == 'webform') {
    // Iterate through the components of the Webform
    foreach ($node->webform['components'] as $cid => $component) {
      if ($component['form_key'] == $cname) {
        // Return the component if the name matches
        return array("cid" => $cid, "component" => $component);
      }
    }
  }

  return false;
}