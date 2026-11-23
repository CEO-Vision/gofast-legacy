<?php

include_once drupal_get_path("module", "webform") . '/includes/webform.report.inc';


function gofast_api_webform_webform($params) {

  switch ($params['method']) {
    case 'GET':
      gofast_api_get_webform($params);
      break;
    case 'POST':
      gofast_api_post_webform($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function gofast_api_webform_webform_submissions($params) {

  switch ($params['method']) {
    case 'GET':
      gofast_api_get_webform_submissions($params);
      break;
    case 'POST':
      gofast_api_post_webform_submissions($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function gofast_api_webform_file($params) {
  switch ($params['method']) {
    case 'GET':
      gofast_api_get_webform_file($params);
      break;
    case 'POST':
      gofast_api_post_webform_file($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function gofast_api_get_webform($params) {

  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid, NULL, TRUE);

  //Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  $webform = $node->webform;
  
  if($webform == null){
    gofast_api_internal_server_error("Unable to load webform with nid : " . $nid);
  }

  // Get the custom properties of the webform 'it's a json string'
  $customProperties = json_decode($node->field_custom_properties[LANGUAGE_NONE][0]['value']);
  
  $webform_encode = json_encode($webform + array('field_custom_properties' => $customProperties));
  
  $themeJson = $node->field_custom_theme[LANGUAGE_NONE][0]['value'];
  
  $webform_encode = array(
    'webform' => $webform_encode,
    'theme' => $themeJson
  );
  gofast_api_success(json_encode($webform_encode), "200 OK", "application/octet-stream", 'attachment; filename="' . $node->title . '"');
}

function gofast_api_post_webform($params) {

  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  //Check node access
  if(!node_access('update', $node)){
     gofast_api_forbidden("You don't have the permission to edit this node");
  }
  
  // Get webform data param
  if(isset($params['data'])){
    $data = $params['data'];
  }else{
    gofast_api_mandatory_parameter("data");
  }

  // Update the webform
  $components = json_decode($data, TRUE);
  // Extract custom properties first so we don't have to manage them later
  // FIXME: improve the API design so this is not necessary at all (maybe extract
  // component list to its own 'components' key containing an array/object)
  $field_custom_properties = $components['field_custom_properties'];
  unset($components['field_custom_properties']);

  // Next component id if adding one.
  $next_component_id = count($components) + 1;

  // Add custom properties like timeSpent, score, percentage
  $custom_properties = ['timeSpent', 'score', 'percentage'];
  foreach ($custom_properties as $property) {
    $component_id = $next_component_id++;
    $components[$component_id] = [
      'nid' => $nid,
      'pid' => 0,
      'extra' => [
        'other_option' => [
          'visible' => FALSE
        ]
      ],
      'form_key' => $property,
      'name' => ucfirst($property),
      'type' => 'textfield',
      'weight' => 0,
      'cid' => $component_id,
    ];
  }

  // Add submission PDF file input.
  $component_id = $next_component_id++;
  $components[$component_id] = [
    'nid' => $nid,
    'pid' => 0,
    'extra' => [
      'other_option' => [
        'visible' => FALSE
      ]
    ],
    'form_key' => 'submissionPdf',
    'name' => ucfirst('submissionPdf'),
    'type' => 'file',
    'weight' => 0,
    'cid' => $component_id,
  ];

  $node->field_custom_properties[LANGUAGE_NONE][0]['value'] = json_encode($field_custom_properties);
  $node->webform['components'] = gofast_xss_clean($components);
  $node->webform['page_breaks'] = array_fill(0,2, array());
  $node->webform['page_count'] = 2;

  node_save($node);
  $node = node_load($nid, NULL, TRUE);
  
  gofast_api_success($node->webform, "200 OK", "application/octet-stream", 'attachment; filename="' . $node->title . '"');
}


/**
 * Retrieves webform submissions based on the provided parameters.
 *
 * @param array $params An array of parameters for retrieving webform submissions.
 *                      - nid: The node ID of the webform.
 *
 * @return string The JSON-encoded webform submissions.
 */
function gofast_api_get_webform_submissions($params) {
  global $user;
  global $base_url;
  
  // Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid);
  
  // Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  // Trick to avoid the webform module to display the table
  variable_set('webform_table', TRUE);
  
  $submissions = webform_get_submissions($node->nid);
  // Reach all submissions to format them
  $submissions = gofast_webform_render_readable_submissions($submissions);
  // Get submission data
  $data = array();
  foreach ($submissions as $sid => $submission) {
    $result = (array)$submission;
    foreach ($submission->data as $key => $value) {
      $component = $node->webform['components'][$key];
      $name = $component['form_key'];
      if (is_array($value) && count($value) === 1) {
        // If reset($value) is a json string, decode it
        if (!empty(json_decode(reset($value), true))) {
          $result[$name] = json_decode(reset($value), true);
        } else {
          $result[$name] = reset($value);
        }
      } else if(is_array($value) && count($value) > 1){
        foreach($value as $key => $val){
          $result[$name][$key] = json_decode($val,TRUE);
        }
      }else {
        $result[$name] = $value;
      }
      if(in_array($component['type'], array('wf_ranking'))){
        // Sort the array by the key
        ksort($result[$name]);
      }
      if(in_array($component['type'], array('file'))){
        $files_href = array();
        foreach ($value as $val) {
          $file_value = json_decode($val);
          $file_reference = $file_value->reference;
          $file_name = $file_value->name;
          $file_nid = gofast_ajax_file_browser_get_nid_from_reference($file_reference);
          if (!empty($file_nid)) {
            $files_href[] = "<a href='" . $base_url . '/node/' . $file_nid . "' target='_blank'> " . $file_name . "</a>";
          } else {
            $files_href[] = $file_name;
          }
        }
        $result[$name] = implode(', ', $files_href);
      }
      if($name == 'submissionPdf'){
        
        $pdfValue = json_decode(reset($value));
        $pdfReference = $pdfValue->file_reference;
        $pdfName = $pdfValue->file_name;
        $file_nid = gofast_ajax_file_browser_get_nid_from_reference($pdfReference);
        if (!empty($file_nid)) {
          $result[$name] = "<a href='" . $base_url . '/node/' . $file_nid . "' target='_blank'> " . $pdfName . "</a>";
        }else{
          $result[$name] = $pdfName;
        }
      }
      $options = gofast_webform_component_options($component);
      $may_have_comment = $options["showOtherItem"] || $options["showCommentArea"];
      if($may_have_comment && isset($value["comment_value"])){
        $result[$name] = json_decode($value["value"]);
        $result["$name-Comment"] = json_decode($value["comment_value"]);
      }
      if(!empty($options)){
        if(in_array($component['type'], array('wf_rating'))){
          if(isset($options['rateValues'])){
            $ratingValues = array();
            foreach($options['rateValues'] as $rateValue){
              $ratingValues[$rateValue['value']] = $rateValue['text'];
            }
            $options = $ratingValues;
          }else{
            $options = array();
          }
        }
        $array_value = $result[$name];
        if(is_string($array_value)){
          $array_value = explode(',', $array_value);
        } elseif (is_array($array_value)) {
          // Remove white spaces
          $array_value = array_map(function ($item) {
            return is_string($item) ? trim($item) : $item;
          }, $array_value);
        }
      }
    }
    unset($result['data']);
    if(!empty($result)){
      $data[] = $result;
    }
  }
  // Trick to avoid the webform module to display the table
  variable_set('webform_table', FALSE);
  return gofast_api_success($data , "200 OK", "application/json");
}

/**
 * Processes and submits webform submissions via API.
 *
 * @param array $params An array containing 'nid' and 'data' parameters.
 * @throws Some_Exception_Class if there are errors during submission.
 * @return void
 */
function gofast_api_post_webform_submissions($params) {
  global $user;
  
  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  // check if we have submissions data
  if(isset($params['data'])){
    $submission_data = json_decode($params['data'], TRUE);
    $data = $submission_data;
  }else{
    gofast_api_mandatory_parameter("data");
  }
  
  if(isset($params['pdfUpload'])){
    $pdfUpload = json_decode($params['pdfUpload']);
  }else{
    gofast_api_mandatory_parameter("pdfUpload");
  }
  
  // Check if the form is a quiz
  $isQuiz = false;
  if(isset($params['getQuizQuestionCount'])){
    $getQuizQuestionCount = $params['getQuizQuestionCount'];
    if($getQuizQuestionCount){
      $isQuiz = true;
    }
  }
  
  if($isQuiz){
    if(isset($params['timeSpent'])){
      $timeSpent = $params['timeSpent'];
    }
    
    if(isset($params['correctAnswer'])){
      $score = $params['correctAnswer'];
    }
    
    if(isset($score)){
      // Calculate pourcentage
      $pourcentage = ($score / $getQuizQuestionCount) * 100;
    }
  }
  
  // Add all of the quiz data to the submission data
  if($isQuiz){
    $hours = floor($timeSpent / 3600);
    $minutes = floor(($timeSpent % 3600) / 60);
    $seconds = $timeSpent % 60;
    $submission_data['timeSpent'] = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    $submission_data['score'] = $score . '/' . $getQuizQuestionCount;
    $submission_data['percentage'] = $pourcentage . '%';
  }
  
  // Add the PDF export reference to the submission data  
  $submission_data['submissionPdf'] = array($pdfUpload);

  // print_r($submission_data); exit;
  // Need to replace all key by the cid
  foreach($submission_data as $cname => $value){
    $component = gofast_webform_get_component_by_name($nid, $cname);
    $cid = $component["cid"];
    
    if(str_ends_with($cname, "-Comment")){
      $base_component_name = preg_replace("/-Comment$/", "", $cname);
      if($base_component = gofast_webform_get_component_by_name($nid, $base_component_name)){
        $cid = $base_component["cid"];
        $value = array("value" => $data[$base_component_name], "comment_value" => $data[$cname]);
      }
    }
    if(!$cid){
      continue;
    }

    if(!is_array($value)){
      $value = array($value);
    }else{
      $value = array_map('json_encode', $value);
    }
        // prevent xss issue
    foreach($value as $key => $val){
      if (strpos($val, 'data:image/png;base64,') === 0 || strpos($val, 'data:application/octet-stream;base64,') === 0 || strpos($val, 'data:application/pdf;base64,') === 0) {
        $value[$key] = $val;
      }else{
        $value[$key] = gofast_xss_clean($val);
      }
    }
    
    $submission_data[$cid] = $value;
    unset($submission_data[$cname]);
  }
  
   $submission = (object) array(
    'nid' => $nid,
    'uid' => $user->uid ? $user->uid : 0, // 0 if anonymous
    'is_draft' => FALSE,
    'submitted' => REQUEST_TIME,
    'remote_addr' => ip_address(),
    'data' => $submission_data,
  );
  // Check if the current user has no reached the submission limit
  $reach_user_limit = webform_submission_user_limit_check($node, $user->uid);
  if ($reach_user_limit) {
    gofast_api_forbidden("You have reached the submission limit");
  }
  
  // Check if the site has no reached the submission limit
  $reach_site_limit = webform_submission_total_limit_check($node);
  if ($reach_site_limit) {
    gofast_api_forbidden("The site has reached the submission limit");
  }
  
  $sid = webform_submission_insert($node, $submission);
  if(!$sid){
    gofast_api_internal_server_error("Unable to save submission");
  }
  
  webform_submission_update($node, (object) $submission);
  
  // Return SID
  gofast_api_success($sid, "200 OK");
  
}

function gofast_api_get_webform_file($params){

  global $base_url;
  
  // Return the file with the name given in the URL
  $filename = $params['name'];
  
  if(empty($filename)){
    gofast_api_mandatory_parameter("filename");
  }
  $uri = 'public://webform/' . $filename;
  if (file_exists($filename)) {
    // Using curl to download the file
    $file = gofast_webform_get_fid_by_uri($uri);
    
    gofast_api_success($file, "200 OK", "application/octet-stream", 'attachment; filename="' . $filename . '"');
    } else {
    gofast_api_not_found("File not found");
  }
}

function gofast_api_post_webform_file($params) {
  
  global $user;
  
  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }

  //Check if we have a nid param
  if (isset($_FILES)) {
    $files = $_FILES;
  } else {
    gofast_api_mandatory_parameter("file");
  }
  
  // If file is from editor
  if(isset($params['editor'])){
    $editor = $params['editor'];
  }
  
  // Check if as admin submission
  $as_admin = gofast_webform_submit_as_admin();
  $folder_reference = gofast_webform_create_submission_folder($nid, $as_admin);
  $submission_folder_reference = $folder_reference['submission_folder'];
  $node_webform_folder_reference = $folder_reference['node_webform_folder'];
  
  // Insert the blob pdf url into a new item content
  if(isset($_FILES['surveySubmissionPdf'])){
    $pdf_name = '';
    if($user->uid <= 1){
      $pdf_name = 'anonymous_' . $nid . '_' . date('Y-m-d_H-i-s') . '.pdf';
    }else{
      $pdf_name = $user->name . '_' . $nid . '_' . date('Y-m-d_H-i-s') . '.pdf';
    }
  }
  // Insert all files
  foreach ($files as $question_name => $file) {
    $files_to_process = [];
    if (is_array($file['name'])) {
      foreach ($file['name'] as $index => $name) {
        $files_to_process[] = [
          'name' => $name,
          'tmp_name' => $file['tmp_name'][$index],
          'type' => $file['type'][$index]
        ];
      }
    } else {
      $files_to_process[] = $file;
    }
    foreach ($files_to_process as $file_to_upload) {
      if($question_name == 'surveySubmissionPdf'){
        $file_to_upload['name'] = $pdf_name;
      }
      
      $file_to_upload['name'] = uniqid() . "_" . $file_to_upload['name'];

      $folder = $editor ? $node_webform_folder_reference : $submission_folder_reference;
      $file_alfresco_item = gofast_cmis_item_content_insert($folder, $file_to_upload['name'], file_get_contents($file_to_upload['tmp_name']), $file_to_upload['type'], array(), $as_admin);

      if (!empty($file_alfresco_item) && is_object($file_alfresco_item)) {
        $responseData[$question_name][] = array(
          'file_reference' => $file_alfresco_item->properties['alfcmis:nodeRef'],
          'file_name' => $file_to_upload['name'],
        );
      }
    }
  }
  $responseData['submission_folder_reference'] = $submission_folder_reference;
  if($as_admin){
    usurp(0);
  }
  if(empty($responseData)){
    gofast_api_internal_server_error("Unable to save file");
  }
  gofast_api_success($responseData, "200 OK");
}


function gofast_api_webform_status($params) {
  switch ($params['method']) {
    case 'GET':
      gofast_api_get_webform_status($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function gofast_api_get_webform_status($params){
  global $user;
  
  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
      gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  $reach_user_limit = webform_submission_user_limit_check($node, $user->uid);
  if ($reach_user_limit) {
    $status = 'submission_limit_reached';
    $description = t('The site has reached the submission limit', array(), array('context' => 'gofast_webform'));
  }
   
  $isClosed = gofast_webform_is_closed($node);
  if($isClosed){
    $status = 'closed';
    
    // If you are the creator of the webform, you have a different message
    if($node->uid == $user->uid){
      $description = t("The webform is closed for now. You can publish it from the contextual menu.", array(), array("context" => "gofast:gofast_webform"));
    }else{
      $description = t("The webform is closed for now. You can contact its creator if you need more information on this matter.", array(), array("context" => "gofast:gofast_webform"));
    }
  }
  if(empty($status)){
    $status = 'open';
    $description = t("The Webform is open for submitting, so you will not be able to edit it.", array(), array("context" => "gofast:gofast_webform"));
  }
  $response = array(
    'status' => $status,
    'description' => $description
  );
  gofast_api_success(json_encode($response), "200 OK", "application/octet-stream", 'attachment; filename="' . $node->title . '"');
}

function gofast_api_webform_theme($params) {
  switch ($params['method']) {
    case 'GET':
      gofast_api_get_webform_theme($params);
      break;
    case 'POST':
      gofast_api_post_webform_theme($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function gofast_api_get_webform_theme($params){
  
  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
    gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  $theme = $node->field_custom_theme[LANGUAGE_NONE][0]['value'];
  
  gofast_api_success($theme , "200 OK", "application/octet-stream", 'attachment; filename="' . $node->title . '"');

}

function gofast_api_post_webform_theme($params){
  
  //Check if we have a nid param
  if(isset($params['nid'])){
    $nid = $params['nid'];
  }else{
    gofast_api_mandatory_parameter("nid");
  }
  
  if(isset($params['themeJson'])){
    $theme = $params['themeJson'];
  }else{
    gofast_api_mandatory_parameter("themeJson");
  }
  
  $node = node_load($nid);
  
  //Check if we retrieved a node
  if($node == null){
    gofast_api_internal_server_error("Unable to load node with nid : " . $nid);
  }
  
  // Store the theme in the webform
  $node->field_custom_theme[LANGUAGE_NONE][0]['value'] = $theme;
  
  node_save($node);
  
  gofast_api_success('Theme stored', "200 OK", "application/octet-stream", 'attachment; filename="' . $node->title . '"');
}


function gofast_api_webform_get_image($params) {
  if(isset($params['reference'])){
    $reference = $params['reference'];
  }else{
    gofast_api_mandatory_parameter("reference");
  }
  
  $item = gofast_cmis_item_get($reference);
  if(!$item){
    gofast_api_not_found("File not found");
  }
  
  $content = gofast_cmis_item_get_content($reference);

  if(empty($content)){ //Check if we retrieved the content
    gofast_api_internal_server_error("Alfresco content not found for this node (Internal error)");
  }
  gofast_api_success($content, "200 OK", "application/octet-stream", 'attachment; filename="' . $item->properties['cmis:name'] . '"');

}
