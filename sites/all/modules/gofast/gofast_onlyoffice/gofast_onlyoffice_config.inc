<?php

require_once(DRUPAL_ROOT .'/sites/all/libraries/firebase-jwt/vendor/autoload.php');
use Firebase\JWT\JWT;

global $base_url, $conf;

define('WEB_ROOT_URL', $base_url);

define('DOC_SERV_TIMEOUT', '120000');
define('DOC_SERV_STORAGE_URL', 'https://'.$conf['gofast-comm_domain'].'/FileUploader.ashx');
define('DOC_SERV_CONVERTER_URL', 'https://'.$conf['gofast-comm_domain'].'/ConvertService.ashx');
define('DOC_SERV_API_URL', 'https://'.$conf['gofast-comm_domain'].'/web-apps/apps/api/documents/api.js');
define('DOC_SERV_PRELOADER_URL', 'https://'.$conf['gofast-comm_domain'].'/web-apps/apps/api/documents/cache-scripts.html');
define('DOC_SERV_COMMAND_SERVICE', 'https://internal-'.$conf['gofast-comm_domain'].'/coauthoring/CommandService.ashx');
define('OO_GOFAST_AI_PLUGIN_ID', '{9DC93CDB-B576-4F0C-B55E-FCC9C48DD007}');

function gofast_onlyoffice_rtl_languages() {
  return array("ar", "he", "fa", "ur");
}

function gofast_onlyoffice_viewable_document_extensions() {
    return array("xlsx", "xlsm", "xls", "ods");
}

function gofast_onlyoffice_comparable_document_extensions() {
  return array("doc", "docx", "odt", "pdf");
}

function gofast_onlyoffice_editable_document_extensions() {
  $editable_extensions = array("docx", "docxf", "dotx", "odt", "xlsx", "ods", "odp", "pptx", "ppsx", "txt", "doc", "ppt", "xls", "pdf");
  return $editable_extensions;
}

function gofast_onlyoffice_old_ms_extensions() {
  return array("doc", "xls", "ppt", "pps");
}

function gofast_onlyoffice_convertible_document_extensions() {
  return array("doc", "odt", "xls", "ods", "ppt", "pps", "odp", "rtf", "mht", "html", "htm", "epub");
}

/*
 Extensions for which the transformation is manage manually by us
*/
function gofast_manual_previewable_document_extensions() {
  return array("doc", "dot", "ppt", "pps", "xls", "eml", "vsd", "odg", "msg", "dwg");
}

function gofast_onlyoffice_previewable_document_extensions() {
  return array("docx", "dotx", "ppt", "pptx", "ppsx", "docm", "vsdx", "xlsx");
}

function gofast_onlyoffice_spreadsheet_extensions() {
  return array("xls", "xlsx", "xlsm",
  "ods", "csv");
}

function gofast_onlyoffice_presentation_extensions() {
  return array("pps", "ppsx",
  "ppt", "pptx",
  "odp");
}

function gofast_onlyoffice_document_extensions() {
  return array("docx", "doc", "docm", "odt", "rtf", "txt",
  "html", "htm", "mht", "pdf", "djvu",
  "fb2", "epub", "xps");
}

/**
 * Returns an associative array with:
 *   convertible file extensions as keys
 *   arrays of extensions available for conversion as values
 * @see https://api.onlyoffice.com/editors/conversionapi
 * 
 */
function gofast_onlyoffice_get_conversion_table() {
  return array(
    "doc" => ["docx"],
    "xls" => ["xlsx"],
    "ppt" => ["pptx"],
    "xlsx" => ["csv", "pdf"],
    "csv" => ["xlsx"],
    "docx" => ["pdf"],
    "pptx" => ["pdf"],
    "md" => ["pdf"],
  );
}

function gofast_onlyoffice_get_onclick_contextual_action($node){
  $cmis_object = gofast_cmis_node_edit_item_get($node);

  $current_mimetype = $cmis_object->properties["cmis:contentStreamMimeType"];
  if(gofast_onlyoffice_is_mimetype_must_convert($current_mimetype)){
    global $base_url;
    return "Gofast.gofast_onlyoffice_show_warning('" . $base_url . "/onlyoffice/editor/" . $node->nid . "?start=" . time() . "',$node->nid,event);";
  }else{
    return "";
  }
}


if (!defined('ServiceConverterMaxTry')) {
  define('ServiceConverterMaxTry', 3);
}

/**
 * Given a JSON body with a "config" key, will sign the config
 * using the OO JWT secret. Should not be exposed to anonymous users.
 */
function gofast_onlyoffice_sign_config_ajax() {
  global $conf;
  $payload = json_decode(file_get_contents("php://input"), TRUE);
  $config = $payload["config"];
  $token = JWT::encode($config, $conf['oo_jwt_secret'], "HS256");
  return drupal_json_output(["config" => $config, "token" => $token]);
}

/**
 * This gets the signed readonly config for the given node.
 * Since JWT key secret must not be exposed front-side and since configuration is parsed from the JWT token,
 * this endpoint is necessary to refresh readonly instances.
 */
function gofast_onlyoffice_get_config_ajax($node) {
  global $conf;
  $doc_config = gofast_onlyoffice_get_config($node, gofast_generate_uuid(), "", "readonly");
  $token = JWT::encode($doc_config, $conf['oo_jwt_secret'], "HS256");
  return drupal_json_output(["docConfig" => $doc_config, "token" => $token]);
}

/**
 * Given a full Drupal node and an OO doc id, will return the OO docsApi config matching the requested OO template.
 * @return array $doc_config
 */
function gofast_onlyoffice_get_config($node, $doc_id, $doc_uri_to_document_server = "", $template = "full") {
  global $base_url;
  global $user;
  $doc_config = [];

  // Get document infos
  $doc_name = gofast_cmis_item_get($node->{GOFAST_CMIS_REFERENCE_FIELD}[LANGUAGE_NONE][0]['value'])->properties['cmis:contentStreamFileName'];
  $extension  = gofast_cmis_node_get_extension($node);

  // Build callback_url
  $alfresco_ticket = gofast_cmis_ticket_validate(); // This ticket is used for the Alfresco's authentification
  $callback_url = GOFAST_URL_ONLYOFFICE_CALLBACK . 'onlyoffice/callback/' . $node->nid . '/' . gofast_cmis_get_raw_item_id($node->{GOFAST_CMIS_REFERENCE_FIELD}[LANGUAGE_NONE][0]['value']) . '/' . $alfresco_ticket;
  // URI points to document on the alfresco server
  if (empty($doc_uri_to_document_server))  {
    $transformed_path = str_replace(':/', '', gofast_cmis_node_get_item_id($node)); // Transform alfresco's node reference to the "good" format
    $doc_uri_to_document_server = rtrim(GOFAST_URL_WEBSCRIPT_ALFRESCO, '/') . '/api/node/content/' . $transformed_path . '?alf_ticket=' . $alfresco_ticket;
  }

  // Author's information
  $author_info = gofast_ldap_user_attributes(user_load($node->uid));
  $document_created_timestamp = $node->created;
  $user_info = gofast_ldap_user_attributes();

  // Permissions
  $user_permission_of_node = 'Deny Access';
  $editor_mode = 'view';
  $doc_edit_permission = true;
  $is_doc_confidential = gofast_taxonomy_is_node_confidential_or_internal($node);
  if (node_access('update', $node, $user)) {
    $user_permission_of_node = 'Full Access';
    $editor_mode = 'edit';
    $doc_edit_permission = true;
  } else if (node_access('view', $node, $user)) {
    $user_permission_of_node = 'Read Only';
    $editor_mode = 'view';
    $doc_edit_permission = false;
  }


  // Parse config
  switch($template) {
    case "full":
      $doc_config = [
        "width" => "100%",
        "height" => "100%",
        "type" => "desktop",
        "documentType" => getDocumentType(array_key_exists('extension', pathinfo($doc_name)) ? $doc_name : $doc_name . '.' . $extension),
        "document" => [
          "title" => $doc_name,
          "url" => $doc_uri_to_document_server,
          "fileType" => $extension,
          "key" => $doc_id,
          "info" => [
            "author" => $author_info['ldap_user_givenname']['value'] . ' ' . $author_info['ldap_user_sn']['value'],
            "created" => date('d.m.y', $document_created_timestamp),
            "sharingSettings" => [
                [
                  "permissions" => $user_permission_of_node,
                  "user" => $user_info['ldap_user_givenname']['value'] . ' ' . $user_info['ldap_user_sn']['value'],
                ]
            ],
          ],
          "permissions" => [
            "edit" => $doc_edit_permission,
            "print" => !$is_doc_confidential,
            "download" => false,
          ],
          "referenceData" => [
            "fileKey" => gofast_cmis_node_get_item_id($node) . "%%SEPARATOR%%" . $node->nid,
            "instanceId" => $base_url,
            "key" => $doc_id,
          ],
        ],
        "editorConfig" => [
          "mode" => $editor_mode,
          "lang" => $user->language,
          "callbackUrl" => $callback_url,
          "user" => [
            "id" => $user->name,
            "name" => $user_info['ldap_user_givenname']['value'] . " " . $user_info['ldap_user_sn']['value'],
          ],
          "embedded" => [
            "saveUrl" => $doc_uri_to_document_server,
            "embedUrl" => $doc_uri_to_document_server,
            "shareUrl" => $doc_uri_to_document_server,
            "toolbarDocked" => "top",
          ],
          "customization" => [
            "logUrl"  => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "logUrlEmbedded" => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "about" =>  true,
            "feedback" => false,
            "chat" => true,
            "comments" => true,
            "forcesave" => true,
            "goback" => [
              "text" => t('Return to document', array(), array('context' => 'gofast:gofast_onlyoffice')),
              "url" => $base_url . '/' . 'node/' . $node->nid,
              "blank" => false,
            ]
          ],
          "plugins" => [
            "autostart" => [],
            "pluginsData" => [],
            "options" => [
              "all" => [
                "nid" => $node->nid,
              ],
            ],
          ],
        ],
      ];
      if (module_exists("gofast_mistral")) {
        global $conf;
        $doc_config["editorConfig"]["plugins"]["autostart"][] = "asc." . OO_GOFAST_AI_PLUGIN_ID;
        $doc_config["editorConfig"]["plugins"]["pluginsData"][] = "https://" . $conf['gofast-comm_domain']. "/sdkjs-plugins/" . OO_GOFAST_AI_PLUGIN_ID . "/config.json";
      }
      break;
    case "readonly":
      $doc_config = [
        "width" => "100%",
        "height" => "95%",
        "type" => "desktop",
        "documentType" => getDocumentType(array_key_exists('extension', pathinfo($doc_name)) ? $doc_name : $doc_name . '.' . $extension),
        "document" => [
          "title" => $doc_name,
          "url" => $doc_uri_to_document_server,
          "fileType" => $extension,
          "key" => $doc_id,
          "info" => [
            "author" => $author_info['ldap_user_givenname']['value'] . ' ' . $author_info['ldap_user_sn']['value'],
            "created" => date('d.m.y', $document_created_timestamp),
            "sharingSettings" => [
                [
                  "permissions" => "Read Only",
                  "user" => $user_info['ldap_user_givenname']['value'] . ' ' . $user_info['ldap_user_sn']['value'],
                ]
            ],
          ],
          "permissions" => [
            "edit" => false,
            "print" => false,
            "download" => false,
            "comment" => false,
          ],
        ],
        "editorConfig" => [
          "mode" => "view",
          "lang" => $user->language,
          "user" => [
            "id" => $user->name,
            "name" => $user_info['ldap_user_givenname']['value'] . " " . $user_info['ldap_user_sn']['value'],
          ],
          "embedded" => [
            "saveUrl" => $doc_uri_to_document_server,
            "embedUrl" => $doc_uri_to_document_server,
            "shareUrl" => $doc_uri_to_document_server,
            "toolbarDocked" => "top",
          ],
          "customization" => [
            "logUrl"  => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "logUrlEmbedded" => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "about" =>  false,
            "feedback" => false,
            "chat" => false,
            "comments" => false,
            "hideRightMenu" => true,
            "plugins" => false,
          ],
        ]
      ];
      break;
    case "compare":
      $extension = $extension == "pdf" ? "docx" : $extension;
      $doc_config = [
        "width" => "100%",
        "height" => "95%",
        "type" => "desktop",
        "documentType" => getDocumentType($extension),
        "document" => [
          "title" => $doc_name,
          "url" => $doc_uri_to_document_server,
          "fileType" => $extension,
          "key" => $doc_id,
          "permissions" => [
            "edit" => true,
            "print" => false,
            "download" => false,
            "comment" => false,
          ],
        ],
        "editorConfig" => [
          "mode" => "edit",
          "lang" => $user->language,
          "user" => [
            "id" => $user->uid,
            "name" => $user->name,
          ],
          "embedded" => [
            "saveUrl" => $doc_uri_to_document_server,
            "embedUrl" => $doc_uri_to_document_server,
            "shareUrl" => $doc_uri_to_document_server,
            "toolbarDocked" => "top",
          ],
          "customization" => [
            "logUrl"  => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "logUrlEmbedded" => $base_url . '/sites/all/themes/bootstrap-keen/logo.png',
            "about" =>  false,
            "feedback" => false,
            "chat" => false,
            "comments" => false,
            "hideRightMenu" => true,
            "plugins" => false,
          ],
        ]
      ];
      break;
  }
  return $doc_config;
}

/**
 * Given a full Alfresco node reference, get the matching OO document key.
 * The document key is the version label matching the latest version which didn't originate from OnlyOffice.
 */
function gofast_onlyoffice_get_document_key($node_ref) {
  gofast_cmis_activate_alfresco_connection();

  // Get Alfresco node IDs for all versions of the document
  $node_ref_qname = gofast_cmis_get_qname_id('frozenNodeRef');
  $query = db_select('alf_node_properties', 'np', ["target" => "alfresco"])
    ->fields('np', ['node_id'])
    ->distinct()
    ->condition('np.string_value', $node_ref, '=')
    ->condition('np.qname_id', $node_ref_qname, '=');
  $alf_nids = $query->execute()->fetchCol();


  // Get the highest Alfresco node ID which was not created from OnlyOffice
  $oo_origin_qname = gofast_cmis_get_qname_id('onlyofficeOrigin');
  $query = db_select('alf_node_properties', 'np', ["target" => "alfresco"])
    ->fields('np', ['node_id'])
    ->condition('np.boolean_value', FALSE, '=')
    ->condition('np.qname_id', $oo_origin_qname, '=')
    ->condition('np.node_id', $alf_nids, 'IN')
    ->orderBy('np.node_id', 'DESC');
  $latest_dropped_node = $query->execute()->fetchField();

  // Finally get the matching version label
  $version_label_qname = gofast_cmis_get_qname_id('versionLabel', 'http://www.alfresco.org/model/versionstore/2.0');
  $query = db_select('alf_node_properties', 'np', ["target" => "alfresco"])
    ->fields('np', ['string_value'])
    ->condition('np.qname_id', $version_label_qname, '=')
    ->condition('np.node_id', $latest_dropped_node, '=')
    ->orderBy('np.node_id', 'DESC');
  
  $latest_dropped_version  = $query->execute()->fetchField();

  if (!$latest_dropped_version) {
    $latest_dropped_version = 1.0;
  }

  return str_replace(".", "_", $latest_dropped_version);
}