<?php

/**
 * @file
 * Link_sharing_form integration for the Gofast_link_sharing module.
 */


/**
 * Form constructor for the gofast_link_sharing form
 *
 * @param node $node
 *  The node "document" that will be shared
 *
 * @see function gofast_link_sharing_form_validate()
 * @see function gofast_link_sharing_form_submit()
 *
 * @ingroup forms
 *
 */
function gofast_link_sharing_form($form, &$form_state, $node){
  global $user;

  $user_details = user_load($user->uid);
  $current_user_fullname=  gofast_user_display_name($user_details);
  $file_sharing_link = gofast_link_sharing_build_link($node->nid);

  return gofast_link_sharing_get_form_fields($current_user_fullname, $form, $user, $node, $file_sharing_link);
}

/**
 * @param $current_user_fullname
 * @param $form
 * @param $user
 * @param $node
 * @param string|null $file_sharing_link
 *
 * @return mixed
 */
function gofast_link_sharing_get_form_fields($current_user_fullname, $form, $user, $node = null, ?string $file_sharing_link = null, $link_element = [], $attributes = []){
  $human_readable_node_type = gofast_get_human_readable_node_type($node->type);
  if (empty($attributes)) {
  $attributes = [
    'class' => [' form-control-tags js-tagify'],
    'data-user' => '',
    'data-get-spaces' => '',
    'data-extract-user' => '',
    'data-email' => '',
    'data-userlist' => '',
  ];
  }

  $form['to'] = [
    '#type' => 'textfield',
    '#title' => t('Recipient(s)', [], ['context' => 'gofast']) . ' *',
    '#maxlength' => '',
    '#name' => 'ac-list-tags-to',
    '#description' => t(
      'Email of the person to whom the @node_type will be shared', 
      ['@node_type' => $human_readable_node_type], 
      ['context' => 'gofast:gofast_link_sharing'],
    ),
    '#required' => FALSE,
    '#attributes' => $attributes
  ];

  if (!empty($link_element)) {
    $form['link'] = $link_element;
  }
  
  if ($file_sharing_link !== null) {
    $form['url'] = [
      '#type' => 'hidden',
      '#value' => $file_sharing_link,
    ];
  }

  if(empty($link_element) && $file_sharing_link !== null) {
    $form['link'] = array(
      '#markup' => '<div class="form-item form-item-link form-group">'
        . '<label class="control-label" for="edit-link">'.t(
          'Link to the @node_type %title', 
          array('@node_type' => $human_readable_node_type, '%title' => $node->title), 
          array('context' => 'gofast:gofast_link_sharing')
        ).'</label>'
        . '<div><a id="linksharing_link" class="clipboard gofast-non-ajax" data-clipboard-target="#linksharing_link" title="' .t('Copy the link') . '">'.$file_sharing_link.'</a><a title="'.t('Copy the link') .'" style="padding: 2px 7px; vertical-align: middle; color:#3498db; margin-left:10px;" class="btn-sm btn btn-default btn-outline-secondary btn-icon no-footer clipboard" data-clipboard-target="#linksharing_link"><i class="fa fa-files-o"></i></a></div>'
        . '</div>',
    );
  }
  
  $form['from_name'] = [
    '#type' => 'hidden',
    '#title' => t('Your Name', [], ['context' => 'gofast:gofast_link_sharing']),
    '#size' => 60,
    '#maxlength' => 60,
    '#description' => t('Myself', [], ['context' => 'gofast']),
    '#required' => TRUE,
    '#default_value' => $current_user_fullname,
  ];

  $form['from_addr'] = [
    '#type' => 'hidden',
    '#value' => $user->mail,
  ];

  $default_subject = $current_user_fullname . ' ' . t(
    'shared with you a @node_type on ', 
    ['@node_type' => $human_readable_node_type], 
    ['context' => 'gofast:gofast_link_sharing', 'langcode' => $user->language]
  ) . variable_get('site_name', 'GoFAST');
  if(isset($form['data'])){
    $data = json_decode($form['data']['#value'], true);
    $folder_data = [
        $data['cmis_item']['id'] => $data['folder'],
    ];
    $form['folder_data'] = [
      '#type' => 'hidden',
      '#value' => $folder_data,
    ];
  }
  if(isset($form['data']) && json_decode($form['data']['#value'], true)){
    $default_subject = $current_user_fullname . ' ' . t('shared with you a folder on ', [], [
      'context' => 'gofast:gofast_link_sharing',
      'langcode' => $user->language
    ]) . variable_get('site_name', 'GoFAST');
  }
  
  $form['subject'] = [
    '#type' => 'textfield',
    '#title' => t('Subject', [], ['context' => 'gofast']),
    '#size' => 60,
    '#maxlength' => 128,
    '#description' => t('Subject for the email that will be sent', [], ['context' => 'gofast:gofast_link_sharing']),
    '#required' => TRUE,
    '#default_value' => $default_subject,
  ];

  $form['title'] = [
    '#type' => 'hidden',
    '#value' => $node->title,
  ];

  $form['message'] = [
    '#after_build' => ["gofast_cmis_remove_ckeditor"],
    '#attributes' => ["data-ckeditor" => "ckeditor-full"],
    '#resizable' => FALSE,
    '#type' => 'text_format',
    '#title' => t('Your message', [], ['context' => 'gofast:gofast_link_sharing']),
    '#default_value' => '',
    '#cols' => 60,
    '#rows' => 5,
    '#description' => t('This message will be included in the email that will be sent', [], ['context' => 'gofast:gofast_link_sharing']),
    '#required' => FALSE,
    '#format' => 'filtered_html',
    '#pre_render' => ['ckeditor_pre_render_text_format'],
  ];

  if ($node !== null) {
    $form['nid'] = [
      '#type' => 'hidden',
      '#value' => $node->nid,
    ];
    
    $form['node'] = [
      '#type' => 'hidden',
      '#value' => $node->nid,
    ];
    $form['node_id'] = [
      '#type' => 'hidden',
      '#value' => $node->nid,
    ];
  }
  

  $form['submit'] = [
    '#type' => 'submit',
    '#value' => t('Send', [], ['context' => 'gofast']),
    '#validate' => ['gofast_link_sharing_form_validate'],
    '#attributes' => ['class' => ['btn', 'btn-success', 'btn-sm']],
  ];
  
  return $form;
}

/**
 * Form validation handler for gofast_link_sharing_form()
 *
 * @see gofast_link_sharing_form_submit()
 */
function gofast_link_sharing_form_validate($form, &$form_state){

    ## check if Submit button has been pressed
    if (isset($form_state['values']['op']) && $form_state['values']['op'] == t('Send', array(), array('context' => 'gofast'))) {


    ## recovery of the data to be analyzed (email address or uid)
    $recipient_addresses = array();
    $recipients_value = json_decode($form_state['input']['ac-list-tags-to']);

    ## check if the number of recipients is not empty
    if(count((array)$recipients_value) <1){
       form_set_error('to', t('You must fill all mandatory fields', array(), array('context' => 'gofast')));
       return;
    }

    // Fill 'to' with the hidden input of autocomplete field
    // and if node not in Extranet -> disabled capability to share with external people
    foreach ($recipients_value as $recipient) {
      if ($recipient->type === 'user') {
        $space_user = $recipient->value;
        $recipient_addresses[] = $space_user;
      }
      if ($recipient->type === 'node') {
        // Get nid from the group
        $node = node_load($recipient->value);
        // Get member id from the group
        $group_members = gofast_og_get_members_userlist_included($node,'active');
        foreach ($group_members as $member) {
            if (user_load($member)->status == 1){
                $recipient_addresses[] = $member;
            }
        }
      }
      else if($recipient->type === 'userlist'){

        // Get the ULID from the userlist to send mails
        $ulid = $recipient->ulvalue;
        // Get all members of the group
        $group_members = gofast_userlist_get_members($ulid);
        foreach ($group_members as $uid => $member) {
          $user_members = user_load($uid);
          // Get only users active to send mail
          if ($user_members->status == 1){
            $recipient_addresses[] = $uid;
          }

        }
      }
      else if(valid_email_address($recipient->name)){
        $recipient_addresses[] = $recipient->name;
      }
    }

    ## check if the number of recipients is not empty (no mail send)
    if (count($recipient_addresses) < 1) {
      drupal_set_message(t("No valid data's (no mail was send)"), "warning");
      return;
    }

    ## store recipient ids or adresses in the form
    $recipient_addresses = array_unique($recipient_addresses);
    $form_state['values']['to'] = implode(',', $recipient_addresses);
  }

}

/**
 * Form submit handler for gofast_link_sharing_form()
 *
 * @param $form
 * @param $form_state
 *
 * @throws \Exception
 * @see gofast_link_sharing_form_validate()
 *
 * @param type $form
 * @param type $form_state
 */
function gofast_link_sharing_form_submit($form, &$form_state){

  global $user;
  global $base_url;

  $user_name = gofast_user_display_name($user);
  $user_mail = $user->mail;

  ## get all node informations
  $node = node_load($form_state['values']['nid']);
  $human_readable_node_type = gofast_get_human_readable_node_type($node->type);
  $node_icon = str_replace('<span>', '<span style="display:none;">', theme('node_title', array('node' => $node, 'link' => FALSE)));
  $document_pic = gofast_mail_queue_fa_png($node_icon);
  
  // send mail for share the link of a document
  if (isset($form_state['values']['op']) && $form_state['values']['op'] == t('Send', array(), array('context' => 'gofast')) && $form_state['values']['to'] != null) {

    $recpts = gofast_linksharing_build_receipt_mail($form_state);

    ## get document version
    $node_ref = gofast_cmis_node_get_item_id($node);
    $document_version = gofast_cmis_webservice_item_get_versions($node_ref)[0]->label;
    $recipient= NULL;
    $recipients_ids_list = explode(',',$form_state['values']['to']);
    $copy_recipients_ids_list = $recipients_ids_list;
    $message = $form_state['values']['message']['value'];
    
    ## reach all recipient informations to send mail to each users
    $already_add_toast = false;
    foreach($recpts as $recpt){
      $recpt_mail = array();
        $recpt_mail[] = $recpt;

        ## get the language of the recipient
        $l = array('langcode' => $recpt['language'], 'context' => 'gofast:gofast_link_sharing');
        if ($recpt['method'] == 'to'){
          ## get all mails of receipt
          $recipient = $recpt['recpt'];
          $recipient_user = user_load_by_mail($recpt['recpt']);
          if(isset($recipient_user->uid)){
            $recipient = gofast_user_display_name($recipient_user);
          }
          $id_recpt = array_shift($recipients_ids_list);

          # create a unique link for each dest
          $file_sharing_link_dest = gofast_link_sharing_build_link($form_state['values']['node_id'],$id_recpt,$user->uid,$document_version);
          ## store it
          $form_state['values']['url'] = $file_sharing_link_dest;

          ## get default site name
          if (!module_exists('gofast_community'))
          { $defaultSiteName = "GoFAST"; }
          else
          { $defaultSiteName = "GoFAST Community"; }
          $site_name = variable_get('site_name', $defaultSiteName);

          $title = t('@node_type Sharing' , array('@node_type' => $human_readable_node_type), $l);
          $subject = $form_state['values']['subject'];
          $footer = t('Message sent from %site_name', array('%site_name' => $site_name), $l);
          $subheader_message = $user_name . ' ' . t('shared', array(), $l) . '<a href="' . $form_state['values']['url'] . '" style="color: #337ab7; text-decoration: none;">' . $document_pic . ' ' . $form_state['values']['title'] . '</a> ' . t('with you.', array(), $l);
          $body = theme('gofast-link-sharing-body', array(
            'author_pic' => theme('user_picture', array('account' => $user, 'dimensions' => 40, 'attributes' => ['width' => 40, 'style' => "border-radius: 5px; width:40px;"])),
            'recip_name' => $recipient,
            'subheader_message' => $subheader_message,
            'message' => nl2br($message),
            'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
            array('%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, array(), $l)),
            $l),
            'l' => $l,
            'node_type' => $human_readable_node_type,
            'helper_message' => $node->type === 'webform' ? t('Click on the link to fill the webform', [], $l) : t('If you want, you can download the file and edit it.', [], $l)
          ));
          if (count($recpts) == 1){
            $recpt_mail[] = end($recpts);
          }
          $mail = array (
            'subject' => $subject,
            'title' => $title,
            'footer' => $footer,
            'body' => $body,
          );
          $ret = gofast_mail_queue_api_queue_ext($mail, $recpt_mail, time(), $user->uid);
          if($already_add_toast == false && count($recipients_ids_list) < 1){
            flood_register_event('print_mail');
            drupal_set_message(t(
              'An email has been sent to the user(s) with the @node_type\'s sharing link.', 
              array('@node_type' => $human_readable_node_type), 
              array()
            ));
          }
          $already_add_toast = true;
          }
        }
        if (count($recpts) > 1 ){
        $mail_active_user[] = array('recpt' => $user_mail, 'method' => 'to' );
        $mail_list = [];
        foreach ($copy_recipients_ids_list as $recpt_mail_recpt) {
          if (is_numeric($recpt_mail_recpt)){
            $user_dest  = user_load($recpt_mail_recpt);
            array_push($mail_list, $user_dest->mail);
          }else{
            array_push($mail_list, $recpt_mail_recpt);
          }
        }

        $subject = t('You shared a @node_type with users in ', array('@node_type' => $human_readable_node_type), array('context' => 'gofast:gofast_link_sharing'))." ".$defaultSiteName;
        $subheader_message = t('You shared', array(), $l) . '<a href="' . $form_state['values']['url'] . '" style="color: #337ab7; text-decoration: none;">' . $document_pic . ' ' . $form_state['values']['title'] . '</a> ' . t('with:', array(), $l);
        foreach($mail_list as $mail_list_recpt){
          $subheader_message .= "<div>" . $mail_list_recpt . "</div>";
        }
        $body = theme('gofast-link-sharing-body', array(
          'author_pic' => theme('user_picture', array('account' => $user, 'dimensions' => 40, 'attributes' => ['width' => 40, 'style' => "border-radius: 5px; width:40px;"])),
          'recip_name' => $user_name,
          'subheader_message' => $subheader_message,
          'message' => nl2br($message),
          'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
          array('%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, array(), $l)),
          $l),
          'l' => $l,
          'node_type' => $human_readable_node_type,
          'helper_message' => $node->type === 'webform' ? t('Click on the link to fill the webform', [], $l) : t('If you want, you can download the file and edit it.', [], $l)
        ));

        $mail = array(
          'body' => $body,
          'title' => $title,
          'subject' => $subject,
          'footer' => $footer
        );
      }

      $ret = gofast_mail_queue_api_queue_ext($mail,  $mail_active_user, time(), $user->uid);
      if ($ret == TRUE) {
        flood_register_event('print_mail');
    }
  }
  $form_state['redirect'] = 'node';
}


function gofast_linksharing_build_receipt_mail($form_state){
    //build recipients to the mail
    global $user;
    $recpts = array();
    $to_array = array_unique(explode(',', $form_state['values']['to']));
    foreach($to_array as $to){
      if (ctype_digit($to)){ // Verify if it's an uid
          $to_user= user_load($to);
          $to_mail= $to_user->mail;
          $to_language = $to_user->language;
          $recpts[] = array('recpt' => $to_mail,'language' => $to_language,  'method' => 'to');
      }else{ // else it's an external email adress
          $recpts[] = array('recpt' => $to,'language' => $user->language? $user->language : "en",  'method' => 'to');
      }
    }
    //add current_user mail to cc
    if(count($recpts)==1){
        $recpts[] = array('recpt' => $form_state['values']['from_addr'], 'method' => 'cc' );
    }
    return $recpts;
}


/**
 * This is the form that allow to share by mail more than one documents.
 * @global type $user
 * @param type $form
 * @param type $form_state
 * @return int
 */
function gofast_link_sharing_manage_mail_sharing_form($form, &$form_state) {
  global $user;

  $user_details = user_load($user->uid);
  $current_user_fullname = gofast_user_display_name($user_details);

    $attributes = [
    'class' => ['form-control-tags js-tagify'],
    'data-user' => '', // show ac users
    'data-node' => '', // show ac node
    'data-userlist' => '', // show ac userlist
    'data-email' => '', // show ac email
  ];

  $selected_items_json = array();
  $title_cart = array();
  // Extract a variable set in gofast_ajax_file_browser.js to get all paths selected when you click on "manage shares by mail"
  if(variable_get("ithit_bulk_".$user->uid, NULL)){
      $selected_items_json = json_decode(rawurldecode(variable_get("ithit_bulk_".$user->uid, NULL)));
      variable_del("ithit_bulk_".$user->uid);
  }
  // Extract a variable set in gofast_ajax_file_browser.js to get all paths selected when you click on "manage shares by mail" in the cart
  if(variable_get("ithit_bulk_cart_".$user->uid, NULL)){

      //Get all nid node in the cart
      $selected_items_json = json_decode(rawurldecode(variable_get("ithit_bulk_cart_".$user->uid, NULL)));
      $nid_cart = array();
      // Reach all nid and transform it to a path (available with folders)
      foreach($selected_items_json as $select){
          $node = node_load($select->url);
          // We need only one location in order to have a 1:1 nid:path mapping
          $path = gofast_cmis_get_first_available_location($node);
          array_push($nid_cart, $path.'/'.$node->title);
          array_push($title_cart, $node->title);

      }
      foreach($nid_cart as $key=>$path_cart){
        if(!empty($selected_items_json[$key])){
          $selected_items_json[$key]->url = '/alfresco/webdav' . $path_cart;
        }
      }
      variable_del("ithit_bulk_cart_".$user->uid);
  }
  // Sorting the items received in parameter (Folders first, then Resource)
  usort($selected_items_json, function($a, $b) {
    return $a->type > $b->type;
  });

  $items_by_type = array();
  foreach ($selected_items_json as $selected_item_type) {
    $items_by_type[$selected_item_type->type][] = $selected_item_type->url;
  }

  $selected_nids = array();
  $blocked_nids = array();
  foreach ($items_by_type as $type => $items) {
    if ($type === 'Folder') {
        foreach($items as $item_path){
            $alfresco_path = str_replace("/alfresco/webdav", "", $item_path);
            $folder_item = gofast_cmis_item_get_by_path($alfresco_path,TRUE);
            $descendants = gofast_cmis_item_get_children($folder_item->id, FALSE, 'documents');
            foreach ($descendants as $descendant) {
              if (isset($descendant->nid)) {
                $selected_nids[$descendant->nid] = str_replace('webdav/','',$descendant->path);
              }
            }
        }
    }else {
      foreach ($items as $item_path) {
        //Force replication of this content if it's not yet replicated
        $_GET['href'] = $item_path;
        gofast_cmis_replicate(FALSE);

        $alfresco_path = str_replace("/alfresco/webdav", "", $item_path);
        $item = gofast_cmis_item_get_by_path($alfresco_path);
        if (isset($item->id)) {
            if(isset($item->properties['gofast:nid'])){
                if($item->properties['gofast:nid'] == 0){
                  $selected_nids[rand(-9999999, -1)] = $alfresco_path;
                }else{
                  $node = node_load($item->properties['gofast:nid']);
                  //Exclude unsharable confidential documents
                  $is_confidential = gofast_taxonomy_is_node_confidential($node); 
                  if($is_confidential){
                    $blocked_nids[] = $item->properties["gofast:nid"];
                    continue;
                  }
                  $is_internal = gofast_taxonomy_is_node_criticity_internal($node);
                  if ($is_internal) {
                    $blocked_nids[] = $item->properties["gofast:nid"];
                    continue;
                  }

                  $selected_nids[$item->properties['gofast:nid']] = $alfresco_path;
                }
            }else{
                if(gofast_ajax_file_browser_get_nid_from_reference($item->properties['alfcmis:nodeRef']) == 0){
                  $selected_nids[rand(-9999999, -1)] = $alfresco_path;
                }else{
                  $selected_nids[gofast_ajax_file_browser_get_nid_from_reference($item->properties['alfcmis:nodeRef'])] = $alfresco_path;
                }
            }
        }
      }
    }
  }
  if($form_state['executed'] && empty($selected_nids)){
    $commands[] = gofast_command_toast_message(t("There is no valid items to share.", array(), array("context" => "gofast:gofast_link_sharing")), "warning");
    print ajax_render($commands);
    exit;
  }

  $form_state['selected_nodes_ids'] = array_keys($selected_nids);
  $form['selected_nodes_ids'] = array(
      '#type' => 'textfield',
      '#default_value' => json_encode(array_keys($selected_nids)),
      '#maxlength' => "99999"
  );
  $form['selected_items'] = array(
      '#type' => 'hidden',
      '#value' => json_encode(['node' => array_keys($selected_nids)]),
  );
  $form['selected_nodes_ids']['#attributes']['class'][] = "gofast_display_none";
  $rendered_items = "";
  foreach (array_unique($title_cart) as $title) {
    $rendered_items .= '<ul><li>' . $title . '</li></ul>';
  }
  if(empty($title_cart)){
      foreach(array_keys($selected_nids) as $select_nid){
          $rendered_items .= '<ul><li>' . node_load($select_nid)->title . '</li></ul>';
      }
  }


  $nodes = array_filter(json_decode($form['selected_nodes_ids']['#default_value'], true) ?: []);
  $nodes_title = array();
  $nodes_nids = array();
  $nodes_links = array();
  $links = "" ;
  $warning_message = "" ;
  if(!empty($blocked_nids)){
    $warning_message .= '
                  <span>'. format_plural(count($blocked_nids),"This file will not be shared as it is confidential.", "These files will not be shared as they are confidential.", array(), array("context" => "gofast:gofast_link_sharing")).'</span>
                  <ul class="my-0">';
    foreach($blocked_nids as $nid) {
      $node = node_load($nid);
      $warning_message .= "<li><a href=\"/node/$node->nid\" title=\"$node->title\">$node->title</a></li>";
    }
    $warning_message .= '</ul>';
  }
  drupal_set_message($warning_message, "warning");
  foreach($nodes as $key=>$nid){
      $file_sharing_link = gofast_link_sharing_build_link($nid);
      $links .= '<div class="form-item form-item-link form-group">'
      . '<label class="control-label" for="edit-link">'.t('Link to the document %title', array('%title' => node_load($nid)->title ), array('context' => 'gofast:gofast_link_sharing')).'</label>'
      . '<div><a id="linksharing_link' . $nid . '" class="clipboard gofast-non-ajax" data-clipboard-target="#linksharing_link' . $nid . '" title="' .t('Copy the link') . '">'.$file_sharing_link.'</a><a title="'.t('Copy the link') .'" style="padding: 2px 7px; vertical-align: middle; color:#3498db; margin-left:10px;" class="btn-sm btn btn-default btn-outline-secondary btn-icon no-footer clipboard" data-clipboard-target="#linksharing_link' . $nid . '"><i class="fa fa-files-o"></i></a></div>'
      . '</div>';
      $nodes_title[$key] = node_load($nid)->title;
      $nodes_nids[$key] = $nid;
      $nodes_links[$key] = $file_sharing_link;
  }
  $link_element = array(
    '#markup' => '<div class="form-item form-item-link form-group" style="max-height:200px;overflow-y:scroll;">' .$links .'</div>',
  );
  $form = gofast_link_sharing_get_form_fields($current_user_fullname, $form, $user, $node, NULL, $link_element, $attributes);
  $form['subject']['#default_value'] =  $current_user_fullname.' '.t('shared with you documents on ', array(), array('context' => 'gofast:gofast_link_sharing','langcode' => $user->language)) . variable_get('site_name', 'GoFAST');

  $form['title'] = array(
    '#type' => 'hidden',
    '#value' => json_encode($nodes_title),
  );

  $form['node_id'] = array(
    '#type' => 'hidden',
    '#value' => json_encode($nodes_nids),
  );

  $form['url'] = array(
    '#type' => 'hidden',
    '#value' => json_encode($nodes_links),
  );

  $form['node'] = array(
    '#type' => 'hidden',
    '#value' => json_encode($nodes_nids),
  );

  $form['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Send', array(), array('context' => 'gofast')),
    '#validate' => array('gofast_link_sharing_manage_mail_sharing_form_validate'),
    '#attributes' => array('class' => array('btn', 'btn-success', 'btn-sm')),
  );
  return $form;
}


/**
 * Form validation handler for gofast_link_sharing_manage_mail_sharing_form()
 *
 * @see gofast_link_sharing_manage_mail_sharing_form()
 */
function gofast_link_sharing_manage_mail_sharing_form_validate($form, &$form_state){
    if (isset($form_state['values']['op']) && $form_state['values']['op'] == t('Send', array(), array('context' => 'gofast'))) {

    $recipient_addresses = array();
    $recipients_value = json_decode($form_state['input']['ac-list-tags-to']);
    if($form_state['input']['to'] !== null && $form_state['input']['to'] !== ""){
        if(filter_var($form_state['input']['to'],FILTER_VALIDATE_EMAIL)){
            $recipients_value[] = $form_state['input']['to'];
        }else{
            form_set_error('to' , t('You must give a valid email address',array(),array('context' => 'gofast')));
            return;
        }
    }
    if(count($recipients_value) <1){
       form_set_error('to', t('You must fill all mandatory fields', array(), array('context' => 'gofast')));
       return;
    }

    // Fill 'to' with the hidden input of autocomplete field
    // and if node not in Extranet -> disabled capability to share with external people
    foreach ($recipients_value as $recipient) {
      if ($recipient->type === 'user') {
        $space_user = $recipient->value;
        $recipient_addresses[] = $space_user;
      }
      if ($recipient->type === 'node') {
        // Get nid from the group
        $node = node_load($recipient->value);
        // Get member id from the group
        $group_members = gofast_og_get_members_userlist_included($node,'active');
        foreach ($group_members as $member) {
            $user = user_load($member);
            if ($user->status == 1){
                $recipient_addresses[] = $member;
            }
        }
      }
      else if($recipient->type === 'userlist'){

        // Get the ULID from the userlist to send mails
        $ulid = $recipient->ulvalue;
        // Get all members of the group
        $group_members = gofast_userlist_get_members($ulid);
        foreach ($group_members as $uid => $member) {
          $user_members = user_load($uid);
          // Get only users active to send mail
          if ($user_members->status == 1){
            $recipient_addresses[] = $uid;
          }
        }
      }
      else if(valid_email_address($recipient->name)){
        $recipient_addresses[] = $recipient->name;
      }
    }
    $recipient_addresses = array_unique($recipient_addresses);
    $form_state['values']['to'] = implode(',', $recipient_addresses);
  }
}



/**
 * Form submit handler for gofast_link_sharing_manage_mail_sharing_form()
 *
 * @see gofast_link_sharing_manage_mail_sharing_form_validate()
 */
function gofast_link_sharing_manage_mail_sharing_form_submit($form, &$form_state){
  //Give all informations for the asynchronous request
  $users_uids = array_map(function($item) {
    $formatted_item = new stdClass();
    $formatted_item->type = $item->type;
    $formatted_item->value = $item->value;
    return $formatted_item;
  }, json_decode((string) $form_state['input']['ac-list-tags-to']));
  
  $items = [];
  // Get folder id
  if(isset($form_state['values']['folder_data'])){
    $folder_data = $form_state['values']['folder_data'];
    $items['folder'] = $folder_data;
  }
  // Get nids
  if(isset($form_state['values']['selected_nodes_ids'])){
    $nids = $form_state['values']['selected_nodes_ids'];
    $items['node'] = json_decode($nids);
  }
  $form_state['values']['items'] = $items;

  //Get subject
  $subject = $form_state['values']['subject'];

  //Get message
  if(!empty($form_state['values']['message']['value'])){
      $message = $form_state['values']['message']['value'];
  }else{
      $message = t('No message',array(),array('context' => 'gofast'));
  }

  //Insert a general progress bar for mass mail sharing
  $html = '<div class="progress mb-4" id="link-panels-progress"><div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0 / ' . count($users_uids) . '</div></div>';
  foreach($users_uids as $key => $info_recipient){
    $title = $form_state['values']['title'][$key];
    $download_page_title = !empty($form_state['values']['folder_sharing_title']) ? $form_state['values']['folder_sharing_title'] : null;
    //Create all theme for the modal
    $html .= theme('gofast_manage_linksharing_progression', array('uid' => 
      $info_recipient->value ,'nids' => $nids,'subject' => $subject ,'message' => $message, 'download_page_title' => $download_page_title, 'title' => $title, 'items' => $items));
    }

      $commands[] = ctools_modal_command_dismiss();

      //Display a modal that tracks the progress of publications
      $commands[] = ctools_modal_command_display(t("In progress", array(), array('context' => 'gofast:taxonomy')), $html);

      //Call asynchronous function
      $commands[] = gofast_command_callback('Gofast.manage_linksharing_process');

      $form_state['input']['to'] = $users_uids;
      
      gofast_link_sharing_send_mail_to_transmitter($form, $form_state);
      foreach(json_decode($nids) as $nid){
          gofast_audit_linksharing(node_load($nid), [$info_recipient]);
          // gofast_message_ext_create_linksharing_entity(node_load($nid), $info_recipient);
      }

      print(ajax_render($commands));
      exit;
}

/**
 * Sending an acknowledgment of receipt of the documents sent with the persons
 * concerned
 *
 * @param  $form
 * @param  $form_state
 *
 * @throws \Exception
 * @global  $user
 */
function gofast_link_sharing_send_mail_to_transmitter($form,$form_state) {
  
  global $user;
  global $base_url;

  $items = $form_state['values']['items'];
  if(!isset($items)){
    return;
  }

  ## get information of current user
  $user_name = gofast_user_display_name($user);
  $user_mail = $user->mail;

  $nodes_informations = [];
  $info_recipients = json_decode($form_state['input']['edit-to-hidden-values']);

  if (!empty($form_state['input']['to'])) {
    $info_recipients = $form_state['input']['to'];
  }

  ## store all uid (or mail for extranet) in array
  $recipients_ids_list = [];
  foreach ($info_recipients as $info_recipient) {
    ## get recipients to send the mails
    if ($info_recipient->type == 'user') {
      array_push($recipients_ids_list, $info_recipient->value);
    }

    
    ## get recipients in the group to send mails
    else {
      if ($info_recipient->type == 'node') {
        ## get the NID from the group to send mails
        $node_id = node_load($info_recipient->id);
        ## get all members of the group
        $group_members = gofast_og_get_members($node_id, 'active');
        foreach ($group_members as $member) {
          $user_members = user_load($member);
          ## get only users active to send mail
          if ($user_members->status == 1) {
            array_push($recipients_ids_list, $user_members->uid);
          }
        }
      }
      else {
        if ($info_recipient->type == 'userlist') {

          ## get the ULID from the userlist to send mails
          $ulid = $info_recipient->id;

          ## get all members of the group
          $group_members = gofast_userlist_get_members($ulid);
          foreach ($group_members as $uid => $member) {
            $user_members = user_load($uid);
            ## get only users active to send mail
            if ($user_members->status == 1) {
              array_push($recipients_ids_list, $user_members->uid);
            }
          }

        }
        else {
          if (valid_email_address($info_recipient)) {

            // // check if the document can be shared with an extranet
            // if(! external_share_allowed($form_state['values']['node_id'])){
            //   form_set_error('to',
            //             t('This document must be located in "Extranet" to be '
            //               . 'shared with people external to GoFast (%recipient)',
            //               array( '%recipient' => $recipient ), array('context' => 'gofast:gofast_link_sharing')
            //             )
            //           );
            // }
            array_push($recipients_ids_list, $info_recipient);
          }
        }
      }
    }
  }
  
  $mail_active_user[] = ['recpt' => $user_mail, 'method' => 'to'];
  
  $mail_list = [];
  ## store all mail in a array
  foreach (array_unique($recipients_ids_list) as $recpt_mail_recpt) {
    if (is_numeric($recpt_mail_recpt)) {
      $user_dest = user_load($recpt_mail_recpt);
      array_push($mail_list, $user_dest->mail);
    }
    else {
      array_push($mail_list, $recpt_mail_recpt);
    }
  }

  ## get default site name
  if (!module_exists('gofast_community')) {
    $defaultSiteName = "GoFAST";
  }
  else {
    $defaultSiteName = "GoFAST Community";
  }

  $l = [
    'langcode' => $user->language,
    'context' => 'gofast:gofast_link_sharing'
  ];
  $subject = t('You shared documents with users in ', [], ['context' => 'gofast:gofast_link_sharing']) . " " . $defaultSiteName;
  $title = t('Information about shared documents', [], $l);
  
  if (!empty($form_state['values']['message']['value'])) {
    $message = $form_state['values']['message']['value'];
  }
  else {
    $message = t('No message', [], ['context' => 'gofast']);
  }

  if(isset($items['node'])) {
    foreach ($items['node'] as $key => $nid) {
      $node = node_load($nid);
      if (!$node) {
        continue;
      }

      $node_title = $node->title;
      $nodes_informations[$key]['title'] = $node_title;
      $document_version = $node->field_current_version[LANGUAGE_NONE][0]['value'];
      $nodes_informations[$key]['version'] = $document_version;

      ## get node icon
      $node_icon = str_replace('<span>', '<span style="display:none;">', theme('node_title', [
        'node' => $node,
        'link' => FALSE
      ]));
      ## store the icon in node information
      $nodes_informations[$key]['icon'] = gofast_mail_queue_fa_png($node_icon);
      $nodes_informations[$key]['url'] = $base_url . '/node/' . $nid;
    }
    $body = theme('gofast_manage_linksharing_body', [
      'is_author' => TRUE,
      'author_name' => $user_name,
      'recip_name' => $user_name,
      'nodes_informations' => $nodes_informations,
      'mail_list' => $mail_list,
      'message' => nl2br($message),
      'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
        ['%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, [], $l)],
        $l),
      'l' => $l,
    ]);
  } else if($items['folder']) {
    $folder_informations = [];
    foreach($items['folder'] as $alfresco_id => $folder_path){
      $item = gofast_cmis_item_get($alfresco_id);
      $folder_information = new stdClass();
      $folder_information->title = $item->properties['cmis:name'];
      $folder_information->url = null;
      $folder_information->type = 'folder';
      if($folder_path){
        $folder_available_paths = gofast_cmis_webservice_get_node_parents($alfresco_id);
        if(!in_array($folder_path, $folder_available_paths)){
          $folder_path = $folder_available_paths[0] ?? null;
        }
        $space = gofast_cmis_get_spaceid_by_webdav_folder($folder_path, $alfresco_id);
        $folder_url = $base_url . '/node/' . $space.'?path='.$folder_path;
        $folder_information->url = $folder_url;
      }
      $folder_informations[] = $folder_information;
    }
    
    $title = t('Information about shared folders', [], $l);
    $subject = format_plural(
      count($folder_informations), 
      "You shared a folder with users in @site_name", 
      "You shared @count folders with users in @site_name", 
      array("@site_name" => $defaultSiteName), 
      $l
    );

    $folder_link_button = "<a href=\"{$folder_informations[0]->url}\" style=\"color: #337ab7; text-decoration: none;\"><i class=\"fa-2x fa fa-folder\"></i>$folder_information->title</a>";
    $subheader_message = format_plural(
      count($folder_informations),
      "You shared !folder_link with:",
      "You shared @count folders with:",
      array("!folder_link" => $folder_link_button),
      $l
    );
    
    foreach($mail_list as $mail_list_recpt){
      $recipient = user_load_by_mail($mail_list_recpt); 
      if($recipient){
        $subheader_message .= "<div>" . $recipient->name . "</div>";
      }else{
        $subheader_message .= "<div>" . $mail_list_recpt . "</div>";
      }
    }
    
    $body = theme('gofast_link_sharing_folder_body', [
      'is_author' => TRUE,
      'author_name' => $user_name,
      'author_pic' => theme('user_picture', array('account' => $user, 'dimensions' => 40, 'attributes' => ['width' => 40, 'style' => "border-radius: 5px; width:40px;"])),
      'recip_name' => $user_dest->name,
      'folder_informations' => $folder_informations,
      'mail_list' => $mail_list,
      'subheader_message' => $subheader_message,
      'message' => nl2br($message),
      'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
        ['%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, [], $l)],
        $l),
      'l' => $l,
    ]);
    
  }
  
  $footer = t('Message sent from %site_name', ['%site_name' => $defaultSiteName], $l);
  ## send mail
  $mail = [
    'body' => $body,
    'title' => $title,
    'subject' => $subject,
    'footer' => $footer
  ];
  $ret = gofast_mail_queue_api_queue_ext($mail, $mail_active_user, time());

  if ($ret == TRUE) {
    flood_register_event('print_mail');
  }
}


/**
 * Function that sends asynchronously (see in file gofast_link_sharing.js) the mails to the different recipients
 * @global type $user
 * @global type $base_url
 * @return Returns an empty value to tell the JS code that the send is complete
 */
function gofast_manage_linksharing_process(){
      global $user;
      global $base_url;

      //Get current user information for the mail
      $user_name = gofast_user_display_name($user);

      //Get user id to send mail
      $uid = $_POST['process_uid'];
      //Get title mail
      $mail_subject = $_POST['process_subject'];
      //Get message mail
      $mail_message = $_POST['process_message'];

      $items = json_decode($_POST['process_items'], true);
      //Get all documents nid to send
      $process_nids = json_decode($_POST['process_nids']);
      $nids = explode(',' , $process_nids);
      $nids = str_replace("[",'',$nids);
      $nids = str_replace("]",'',$nids);
      
      //Get user mail && language (condition extranet or no)
      $recipient_user = false;
      if(!is_numeric($uid)){
          $recipient_user_mail = $uid;
          $recipient_user_language = $user->language;
      }else{
          $recipient_user = user_load($uid);
          $recipient_user_mail = user_load($uid)->mail;
          $recipient_user_language = user_load($uid)->language;
      }

      //Store recipient
      $recpts['to'] = array('recpt' => $recipient_user_mail,'language' => $recipient_user_language,  'method' => 'to');
      //Store current user
      if(count($recpts)==1){
        $recpts['cc'] = array('recpt' => $user->mail,  'method' => 'cc');
      }
      
    $process_nids = json_decode($process_nids);
    if(isset($items['node'])){
       //Get information of all nodes to send (icons,build the hash..)
      $nids_informations = array();
      //Get information of all nodes to send (icons,build the hash..)
      foreach ($nids as $key=>$nid){
            $nid = str_replace('"','',$nid);
            $node = node_load($nid);
            if (!$node) {
              continue;
            }
            $document_version = $node->field_current_version['und']['0']['value'];
            $hash = gofast_link_sharing_build_link($nids,$uid,$user->uid,$document_version,TRUE,TRUE,$nid);
  
            $node_title = $node->title;
            $nids_informations[$key]['title'] = $node_title;
            $nids_informations[$key]['version'] = $document_version;
  
            //Get node icon
            $node_icon = str_replace('<span>', '<span style="display:none;">', theme('node_title', array('node' => $node, 'link' => FALSE)));
            //Store the icon in node information
            $nids_informations[$key]['icon'] = gofast_mail_queue_fa_png($node_icon);
            $nids_informations[$key]['url'] = $hash ;
          }
  
          // Get default site name
          if (!module_exists('gofast_community')){
            $defaultSiteName = "GoFAST";
          }else{
            $defaultSiteName = "GoFAST Community";
          }
          // Get recipient language (current user language if it's an extranet user)
          $l = array('langcode' => $recpts['to']['language'], 'context' => 'gofast:gofast_link_sharing');
          $title = t('Shared documents' , array(), $l);
          $body = theme('gofast_manage_linksharing_body', array(
            'author_pic' => theme('user_picture', array('account' => $user, 'dimensions' => 40, 'attributes' => ['width' => 40, 'style' => "border-radius: 5px; width:40px;"])),
            'author_name' => $user_name,
            'recip_name' => $recipient_user_mail,
            'nodes_informations' => $nids_informations,
            'download' => gofast_link_sharing_build_link($nids,$uid,$user->uid,NULL,TRUE,TRUE),
            'message' => nl2br($mail_message),
            'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
              array('%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, array(), $l)),
              $l),
            'l' => $l,
          ));
    } else if(isset($items['folder'])) { // It's actually not possible to share multiple folder
      $folder_informations = [];
      foreach($items['folder'] as $folder_alfresco_id => $path){

        $folder_item = gofast_cmis_item_get($folder_alfresco_id);
        $hash = gofast_link_sharing_build_link(
          $folder_alfresco_id,
          $uid,
          $user->uid,
          '', 
          TRUE,
          FALSE,
          NULL, 
          TRUE,
          ['folder_path' => $path],
        );
    
        $folder_information = new stdClass();
        $item = $folder_item;
        $item->properties = (array)$item->properties;
        $folder_information->title = $item->properties['cmis:name'];
        $folder_information->url = $hash;
        $folder_information->id = $folder_alfresco_id;
        $folder_informations[] = $folder_information;
      }
  
      // Get default site name
      if (!module_exists('gofast_community')){
        $defaultSiteName = "GoFAST";
      }else{
        $defaultSiteName = "GoFAST Community";
      }
      // Get recipient language (current user language if it's an extranet user)
      $l = array('langcode' => $recpts['to']['language'], 'context' => 'gofast:gofast_link_sharing');
      $title = t('Shared Folder' , array(), $l);
      $body = theme('gofast_link_sharing_folder_body', array(
        'author_pic' => theme('user_picture', array('account' => $user, 'dimensions' => 40, 'attributes' => ['width' => 40, 'style' => "border-radius: 5px; width:40px;"])),
        'author_name' => $user_name,
        'recip_name' => $recipient_user ? $recipient_user->name : $recipient_user_mail,
        'folder_informations' => $folder_informations,
        'download' =>gofast_link_sharing_build_link(
          $folder_informations[0]->id,
          $uid,
          $user->uid,
          '',
          TRUE,
          FALSE,
          NULL,
          TRUE,
          ['folder_path' => $path],
        ),
        'message' => nl2br($mail_message),
        'expiry_msg' => t('This link will be functional for the next ' . '%exp_period. After this, it will be disabled.',
          array('%exp_period' => t(DEFAULT_EXPIRY_PERIOD_STRING, array(), $l)),
          $l),
        'l' => $l,
      ));
    }
    $footer = t('Message sent from %site_name', array('%site_name' => $defaultSiteName), $l);

      //Send mail
      $mail = array(
        'body' => $body,
        'title' => $title,
        'subject' => $mail_subject,
        'footer' => $footer
    );
    gofast_mail_queue_api_queue_ext($mail,  $recpts, time(), $user->uid);
    $ret = TRUE;

    if ($ret == TRUE) {
      flood_register_event('print_mail');
      $commands = [];
      $commands[] = gofast_command_toast_message(t('An email has been sent to the user(s) with the document\'s sharing link.'), "success");
    }
  print ajax_render($commands);
  exit;
}

/**
 * Attempts to redirect a user to a folder by its absolute path.
 *
 * This redirects the user to the parent space node view on the file browser tab
 * with the folder itself open.
 *
 * This function only redirects to the given path if it is accessible, and
 * should not redirect to any other possible location of the folder.
 *
 * @see gofast_link_sharing_try_redirecting_to_folder_by_item_id() to attempt to
 *  redirect a user to any path they can access, optionally with a preferred
 *  path to use.
 *
 * @param string $path Absolute path of the folder to redirect to.
 * @return void|never Returns if the user could not be redirected, otherwise the
 *  function exits.
 */
function gofast_link_sharing_try_redirecting_to_folder_path($path) {
  $space_nid = gofast_cmis_get_spaceid_by_webdav_folder($path, NULL);
  $space_node = node_load($space_nid);

  // Check if space node exists.
  if ($space_node === FALSE) {
    return;
  }

  // Check if  user can browse files within space (needs to be a member of the space).
  global $user;
  $can_browse = in_array($user->uid, gofast_og_get_members_userlist_included($space_node));
  if (!$can_browse) {
    return;
  }

  // Redirect user to folder in file browser.
  drupal_goto('/node/' . $space_nid, [
    'query' => [
      'path' => $path,
    ],
    'fragment' => 'ogdocuments',
  ]);
}

/**
 * Sets up a redirect to the first accessible space that contains the given folder reference
 *
 * This function will attempt to redirect the user to the preferred path if
 * provided, as long as the user can access it.
 *
 * Otherwise, it will try to redirect the user to a location of the given folder
 * item reference that they can access.
 *
 * If none of these succeed, this function returns and the user is not redirected.
 *
 * @see gofast_link_sharing_try_redirecting_to_folder_path() To attempt to
 *  redirect a user to a folder by its path without attempting to redirect to
 *  another location.
 *
 * @param string $folder_alfresco_reference The Alfresco reference or item ID of the folder to redirect to
 * @param string|null $preferred_path Path that should be used first before
 *  attempting to find another location that the user can access.
 * @return void|never Returns if the user could not be redirected, otherwise the
 *  function exits.
 */
function gofast_link_sharing_try_redirecting_to_accessible_folder_location_by_item_id($folder_alfresco_reference, $preferred_path = NULL) {
  global $user;

  // First try to redirect to a preferred path if provided.
  if (!empty($preferred_path)) {
    gofast_link_sharing_try_redirecting_to_folder_path($preferred_path);
  }

  // normalize item id to reference
  if (strpos($folder_alfresco_reference, 'workspace://SpacesStore/') === false) {
    $folder_alfresco_reference = 'workspace://SpacesStore/' . $folder_alfresco_reference;
  }

  $folder_item = gofast_cmis_item_get($folder_alfresco_reference);
  // check if we got item from alfresco, if not it means the folder does not
  // exist. We cannot redirect to a folder that does not exist.
  if ($folder_item === false) {
    return false;
  }
  
  $folder_name = $folder_item->properties['cmis:name'];

  // Find spaces of mirrored locations that user may access.
  $folder_parents = gofast_cmis_item_get_mirrored_parent_spaces($folder_alfresco_reference, $user);

  foreach ($folder_parents as $parent_space) {
    $space_nid = $parent_space['cmis_item']->properties['gofast:nid'];
    $space_node = node_load($space_nid);

    // if node loading failed, ignore this path
    if ($space_node === FALSE) {
      continue;
    }

    $folder_subpath = implode('/', [...$parent_space['segments_to_parent'], $folder_name]);
    // redirect
    drupal_goto(
      '/node/' . $space_nid,
      [
        'query' => [
          'path' => $parent_space['path'] . '/' . $folder_subpath,
        ],
        'fragment' => 'ogdocuments',
      ],
    );
  }
  // no parent path contained a space that can be redirected to
}

/**
 * Loads a single node from the given parameters available within a share link request
 * @param string|string[] $nids Either an array of node ids, or a single node id
 * @param ?string $nid_unique A possibly null node id
 * @return object|false A node if one could be loaded or false (either more it
 * is an ambiguous case where more that one node could be loaded, or the node that should have been loaded was deleted)
 */
function gofast_link_sharing_try_load_sharing_link_node($nids, $nid_unique) {
  // nid_unique given (multiple files shared, specific file link clicked)
  if (isset($nid_unique) && is_numeric($nid_unique)) {
    return node_load($nid_unique);
  }

  // nids only one value in nids array (single file shared as multiple files?)
  if (is_array($nids) && count($nids) === 1) {
    return node_load($nids[0]);
  }

  // nids is nid string (single file shared)
  if (is_numeric($nids)) {
    return node_load($nids);
  }

  // ambiguous case, no node loaded
  return false;
}

/**
 * Sets up a redirect to the given node if possible
 * @param object $node The loaded node object to redirect to
 */
function gofast_link_sharing_try_redirecting_to_node($node) {
  if (node_access('view', $node)) {
    // never returns / exits / diverges
    drupal_goto("/node/" . $node->nid);
  } else if($node->type === "webform"){
    // if it's a webform, redirect to public survey url
    $survey_link =  "/drupal/survey/$node->nid?hash=". gofast_webform_create_expiration_hash($node->nid);
    header('Location:'.$survey_link);
    exit;
  }
}

function gofast_multi_sharing_check_session($hash){
  if(!empty($hash)){
    $decrypt_datas = gofast_link_sharing_link_decrypt($hash);
  } else {
    $decrypt_datas = gofast_link_sharing_link_decrypt($_GET["hash"]);
  }
  $exp_date = $decrypt_datas['exp_date'];

  //Check sharing expiry date
  if ($exp_date == "") {
    $link_still_valid = FALSE;
  } else {
    $link_still_valid = ($exp_date > time()) ? TRUE : FALSE;
  }
    
  //Check if there is already a gofast session
  if(!$link_still_valid){
    drupal_set_message(t("Sorry this sharing link is not valid", array(), array('context' => 'sharing_dl')), 'error');
    // never returns / exits / diverges
    drupal_goto("/");
  }
}

/**
 * Parse nids in a link sharing hash into the relevant form option
 * @return array $nids_title a checkboxes form option
 */
function gofast_multi_link_parse_hash_nid($decrypt_datas, $decrypt_nid_unique) {
  global $user;
  global $base_url;


  if(isset($decrypt_datas['nids'])){
    $nids = $decrypt_datas['nids'];
  }else {
    $decrypt_nid = explode('+',$decrypt_datas['nid']);
    $nids = array_filter($decrypt_nid);
  }

  ## check if there is already a gofast session
  $is_gofast_user = gofast_link_sharing_is_gofast_user($user);
  if(isset($decrypt_datas['nid_unique'])){
        $node = node_load($decrypt_datas['nid_unique']);
        ## check if user has access to node
        $user_has_access = gofast_link_sharing_usr_has_access($node, $user);
        if($is_gofast_user && $user_has_access){
          $ddl_link = $base_url.":443".'/node/'.$decrypt_nid_unique;
          header('Location:'.$ddl_link);
          exit;
        }
    }
    $nids_title = array();
    foreach($nids as $nid){
      // extract number from $nid 
      $nid = str_replace('"', '', $nid);
      $node = node_load($nid);
      $version = $node->field_current_version['und']['0']['value'];
    $nids_title[$nid]['title'] = $node->title;
    $nids_title[$nid]['version'] = $version;
  }
  return $nids_title;
}

/**
 * Implements multi-sharing form (Check documents to download)
 *
 * @param type $form
 * @param type $form_state
 *
 * @return $form
 * @global type $user
 */
function gofast_multi_link_sharing_form($form, &$form_state, $hash, $folder_store_id = NULL) {
  // Check is the session link is not expiry
  gofast_multi_sharing_check_session($hash);

  if (!empty($hash)) {
    $decrypt_datas = gofast_link_sharing_link_decrypt($hash);
  }
  else {
    $decrypt_datas = gofast_link_sharing_link_decrypt($_GET['hash']);
  }

  if (isset($decrypt_datas['nid_unique'])) {
    $decrypt_nid_unique = $decrypt_datas['nid_unique'];
  }
  else {
    $decrypt_nid_unique = FALSE;
  }
  // It's a folder
  if (!isset($decrypt_datas['nids'])) {
    $nids_title = [];
  }
  else {
    // It's a collection of documents
    $nids_title = gofast_multi_link_parse_hash_nid($decrypt_datas, $decrypt_nid_unique);
  }

  $form['shares'] = [
    '#title' => t('Choose documents you want to download'),
    '#type' => 'checkboxes',
    '#required' => $folder_store_id === NULL,
    '#options' => $nids_title,
  ];

  $form['actions']['submit'] = [
    '#attributes' => ['class' => ['btn-warning', 'gofast_link_sharing_button']],
    '#type' => 'submit',
    '#value' => t('Download', [], ["context" => 'gofast']),
  ];

  return $form;
}

/**
 * Form validate handler for gofast_multi_link_sharing_form()
 *
 * @see gofast_link_sharing_form_validate()
 */
function gofast_multi_link_sharing_form_validate($form, &$form_state){
}

/**
 * Form submit handler for gofast_multi_link_sharing_form()
 *
 * @global $user
 * @global $base_url
 * @see gofast_link_sharing_form_validate()
 */
function gofast_multi_link_sharing_form_submit($form,&$form_state){
     set_time_limit(0);
     
    ## get documents checked
    $nodes_nid = $form['shares']['#value'];
    try{
      if (count($nodes_nid) > 1) {
        $nodes_ref = [];
        foreach ($nodes_nid as $nid) {
          $nodes_ref[] = ["nodeRef" => gofast_cmis_node_get_reference_by_nid_without_cmis($nid)];
        }
        gofast_multi_link_sharing_send_mail($form, $form_state);
        $process_uuid = uuid_generate();
        $_POST["process_uuid"] = $process_uuid;
        drupal_json_output(array(
          'process_uuid' => $process_uuid,
          'status' => 'success',
          'code' => 200,
        ));
        // Init cmis repository to allow doing operation as admin while user is anonymous
        usurp(1);
        gofast_cmis_get_repository();
        usurp(false);
        
        fastcgi_finish_request();
        gofast_ajax_file_browser_initialize_file_download_process($nodes_ref);
      }else{
        $node_id = array_pop($nodes_nid);
        $url = "/ajax_file_browser/download_file?nodeRef=".gofast_cmis_node_get_reference_by_nid_without_cmis($node_id);
        echo $url;
      }
      exit;
    }catch(Exception $e){
        gofast_cmis_unset_user_ticket();
        usurp(false);
    }
}

/**
 * Sending an email that a user has downloaded a shared document
 * @global type $base_url
 * @param type $form
 * @param type $form_state
 */
function gofast_multi_link_sharing_send_mail($form,$form_state){
    global $base_url;
    global $user;

    $decrypt_datas = gofast_link_sharing_link_decrypt($_GET['hash']);
    $nids = $form['shares']['#value'];
    $transmitter = user_load($decrypt_datas['transmitter']);
    $version = $decrypt_datas['version'];
    $dest_id = $decrypt_datas['dest_id'];

    if(!is_numeric($dest_id)){
      ## not a GoFAST user
      $mail = $decrypt_datas['dest_id'];
      $nameDestinaire = $decrypt_datas['dest_id'];
    }else{
      $destinataire = user_load($dest_id);
      $nameDestinaire = gofast_user_display_name($destinataire);
    }

    $nodes_informations = array();
    $tab_int = 0;
    ## get all informations of all nodes shared
    foreach($nids as $nid){
        $node = node_load($nid);
        $node_title = $node->title;
        $nodes_informations[$tab_int]['title'] = $node_title;
        //Get node icon
        $node_icon = str_replace('<span>', '<span style="display:none;">', theme('node_title', array('node' => $node, 'link' => FALSE)));
        //Store the icon in node information
        $nodes_informations[$tab_int]['icon'] =  gofast_mail_queue_fa_png($node_icon);
        $nodes_informations[$tab_int]['url'] = $base_url .'/node/' . $nid;
        $tab_int += 1 ;
    }

    ## get default site name
    if (!module_exists('gofast_community')){
        $defaultSiteName = "GoFAST";
    }else{
        $defaultSiteName = "GoFAST Community";
    }

    $l = array('langcode' => $transmitter->language, 'context' => 'gofast:gofast_link_sharing');
    $title = t("File sharing download",array(), array('langcode' => $transmitter->language, 'context' => 'sharing_dl'));
    $subject = t("@destinaire downloaded your document on the GoFAST platform", array('@destinaire' => $nameDestinaire), array('langcode' => $transmitter->language, 'context' => 'sharing_dl'));

    $message_tag = '<a href="mailto:' . $mail . '" style="color: 3699ff; text-decoration: none;">' . $nameDestinaire. '</a>';
    $author_pic_url = gofast_get_url_picture_by_id($destinataire->uid);
    $author_pic = '<img src="' . $author_pic_url . '" style="padding-right: 5px; border-radius; 5px;" width="25">';

    $body = theme('gofast-sharing-download', array(
      'message' => str_replace("{tag}", $message_tag, t("{tag} downloaded your documents on the GoFAST platform", array(), array('context' => 'gofast:gofast_link_sharing'))),
      'author_pic' => $author_pic,
      'recip_name' => $transmitter->ldap_user_givenname[LANGUAGE_NONE][0]['value'],
      'nodes_informations' => $nodes_informations,
      'l' => $l,
    ));
    $footer = t('Message sent from ', array(), $l) . $defaultSiteName;
    $dest_mail=array();
    $dest_mail['0']['recpt'] = $transmitter->mail;
    $dest_mail['0']['method'] = 'to';

    ## send mail
    $mail = array(
        'body' => $body,
        'title' => $title,
        'subject' => $subject,
        'footer' => $footer
    );
    gofast_mail_queue_api_queue_ext($mail,  $dest_mail, time(), $dest_id);

    ## insert sharing_dl into audit
    $addr_ip = $_SERVER["REMOTE_ADDR"];
    $event_type = "sharing_dl";
    $last_event_unserialized["mod_timestamp"] = time();
    $last_event_unserialized["mod_author"] = 0;

    if($user->uid == 0){
	$last_event_unserialized["mod_ip"] = $addr_ip;
    }else{
	$last_event_unserialized["mod_ip"] = $user->uid;
    }

    foreach($nids as $nid){
	$node = node_load($nid);
	$node_version = $node->field_current_version[LANGUAGE_NONE][0]['value'];
	$last_event_unserialized["mod_version"] = $node_version;
	if($user->uid == 0){
	    $event = array('mod_author' => 0, 'mod_timestamp' => time(), "event" => $event_type, 'mod_version' => $node_version, 'mod_ip' => $addr_ip);
	}else{
	    $event = array('mod_author' => 0, 'mod_timestamp' => time(), "event" => $event_type, 'mod_version' => $node_version, 'mod_ip' => $user->uid);
	}
	$event = serialize($event);
	$last_event_serialized = rawurlencode($event);
        gofast_audit_insert_line_audit($nid,$event_type,$last_event_serialized, $last_event_unserialized );
    }
}

/**
 * Downloads a shared folder and sends an email to the user who shared the folder
 */
function gofast_link_sharing_folder_dl() {
  $hash = $_GET['hash'];
  $workspace = $_GET['workspace'];
  $process_uuid = $_GET['process_uuid'];
  // Make first cmis call as admin to allow cmis instance having admin rights
  usurp(1);
  gofast_cmis_get_repository();
  usurp(false);

  // Add process_uuid to $_POST to make a drupal variable with this id
  $_POST["process_uuid"] = $process_uuid;

  // Check is the session link is not expiry
  gofast_multi_sharing_check_session($hash);
  if(isset($workspace)){
    // The workspace must be the folder authorized by the signed hash.
    $share = gofast_link_sharing_link_decrypt($hash);
    if (empty($share['alfresco_id']) || $share['alfresco_id'] !== $workspace) {
      drupal_goto('/');
    }
    $item = gofast_cmis_item_get($workspace);
    $nodeRefs = [['nodeRef' =>  'workspace://SpacesStore/'.$workspace]];
    drupal_json_output(array(
      'status' => 'success',
      'code' => 200,
    ));
    fastcgi_finish_request();
    
    gofast_multi_link_sharing_folder_send_mail($hash, $workspace);
    try{
      gofast_ajax_file_browser_initialize_file_download_process($nodeRefs, ['output_title' => $item->properties['cmis:name']]);
    }
    catch(\Exception $e){   
      variable_set("gofast_cmis_compression_status_$process_uuid", array(
        'status' => 'ERROR',
        'message' => t('Something went wrong'),
        'code' => 500,
      ));
    }
  }
}

/**
 * Sending an email that a user has downloaded a shared folder
 * @param String $hash  The hash of the multi-sharing link
 *
 */
function gofast_multi_link_sharing_folder_send_mail($hash, $folder_store_id){
  global $base_url;
  global $user;

  $decrypt_datas = gofast_link_sharing_link_decrypt($hash);
  $shared_folder = gofast_cmis_item_get($folder_store_id);
  $folder_name = $shared_folder->properties['cmis:name'];
  $folder_path = $shared_folder->properties['cmis:path'];
  $folder_version = $shared_folder->properties['cmis:versionLabel'];
  //find the node of the folder's parent 
  $space = gofast_cmis_get_spaceid_by_webdav_folder($folder_path, $folder_store_id);
  $folder_url = $base_url . '/node/' . $space.'?path='.$folder_path;
  $folder_informations = [];
  $folder_informations['title'] = $folder_name;
  $folder_informations['url'] = $folder_url;
  $folder_informations['icon'] = 'folder';

  ## get default site name
  if (!module_exists('gofast_community')){
    $defaultSiteName = "GoFAST";
  }else{
    $defaultSiteName = "GoFAST Community";
  }

  $transmitter = user_load($decrypt_datas['transmitter']);
  $dest_id = $decrypt_datas['dest_id'];

  if(!is_numeric($dest_id)){
    ## not a GoFAST user
    $mail = $decrypt_datas['dest_id'];
    $nameDestinaire = $decrypt_datas['dest_id'];
  }else{
    $destinataire = user_load($dest_id);
    $nameDestinaire = gofast_user_display_name($destinataire);
  }

  $l = array('langcode' => $transmitter->language, 'context' => 'gofast:gofast_link_sharing');
  $title = t("Folder sharing download",array(), array('langcode' => $transmitter->language, 'context' => 'sharing_dl'));
  $subject = t("@destinaire downloaded your folder on the GoFAST platform", array('@destinaire' => $nameDestinaire), array('langcode' => $emetteur->language, 'context' => 'sharing_dl'));
  $message_tag = '<a href="mailto:' . $mail . '" style="color: 3699ff; text-decoration: none;">' . $nameDestinaire. '</a>';
  $author_pic_url = gofast_get_url_picture_by_id($destinataire->uid);
  $author_pic = '<img src="' . $author_pic_url . '" style="padding-right: 5px; border-radius; 5px;" width="25">';
  $body = theme('gofast-sharing-download', array(
    'message' => str_replace("{tag}", $message_tag, t("{tag} downloaded your folder on the GoFAST platform", array(), array('context' => 'gofast:gofast_link_sharing'))),
    'author_pic' => $author_pic,
    'recip_name' => $transmitter->ldap_user_givenname[LANGUAGE_NONE][0]['value'],
    'nodes_informations' => [$folder_informations],
    'l' => $l,
  ));
  $footer = t('Message sent from ', array(), $l) . $defaultSiteName;
  $dest_mail=array();
  $dest_mail['0']['recpt'] = $transmitter->mail;
  $dest_mail['0']['method'] = 'to';

  ## send mail
  $mail = array(
    'body' => $body,
    'title' => $title,
    'subject' => $subject,
    'footer' => $footer
  );
  gofast_mail_queue_api_queue_ext($mail,  $dest_mail, time(), $dest_id);

  $addr_ip = $_SERVER["REMOTE_ADDR"];
  $event_type = "sharing_dl";
  $last_event_unserialized["mod_timestamp"] = time();
  $last_event_unserialized["mod_author"] = 0;
  $last_event_unserialized["mod_title"] = $folder_name;

  $mod_folder_details = [
    'folder_name' => $folder_name,
    'folder_path' => $folder_path,
    'folder_version' => $folder_version,
    'folder_url' => $folder_url,
  ];
  
  if(!empty($user->uid)){
    $addr_ip  = $user->uid;
   }

  $event = array('mod_author' => 0, 'mod_timestamp' => time(), "event" => $event_type,  'mod_ip' => $addr_ip, 'mod_folder_details' => $mod_folder_details);
  
  $event = serialize($event);
  $last_event_serialized = rawurlencode($event);
  gofast_audit_insert_line_audit(0,$event_type,$last_event_serialized, $last_event_unserialized );
}

/**
 * Form for sharing a folder by email
 *
 * @param $form
 * @param $form_state
 *
 * @param array $data
 * @return mixed
 * @throws \Exception
 */
function gofast_link_sharing_folder_form($form, $form_state){
  global $user;
    
  $data = $form_state['data'];
  $user_details = user_load($user->uid);
  $current_user_fullname=  gofast_user_display_name($user_details);
  //append the candidates to the form to be used in the submit function
  $form['data'] = array(
    '#type' => 'hidden',
    '#value' => $data,
  );
  $form[] = gofast_link_sharing_displayFolderSharingInfo($data, $form);

  return gofast_link_sharing_get_form_fields($current_user_fullname, $form, $user);
}


/**
 * Form submit handler for gofast_link_sharing_folder_form()
 *
 * @throws \Exception
 */
function gofast_link_sharing_folder_form_submit($form, &$form_state){
  $form_state['values']['folder_sharing_title'] = t('Folder Shared Contents');

  gofast_link_sharing_manage_mail_sharing_form_submit($form, $form_state);
}
/**
 * This function is used to display the list of the candidates (documents) that
 * will be included and excluded from the zip file generated by folder link
 * sharing.
 *
 * @param $data
 * @param $form
 *
 * @return array
 * @throws \Exception
 */
function gofast_link_sharing_displayFolderSharingInfo($data, $form): array {
  $data = json_decode($data); 
  $form['#prefix'] = '<div class="form-group">';
  $form['#suffix'] = '</div>';
  
  $item = $data->cmis_item;
  $node_description = gofast_link_sharing_get_folder_description($item);
  //convert properties to array
  $item->properties = (array) $item->properties;
  $node_description->title = $item->properties["cmis:name"] ?? $item->title;
  $node_description->locations = [];
 
  $form['folder_contents'] = array(
    '#type' => 'item',
    '#markup' => theme('gofast_link_sharing_share_folder_contents', 
      array('nodes_description' => [$node_description], 'showTitle' => true)),
  );
 
  return $form;
}
