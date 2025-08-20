<?php

include_once __DIR__ . '/gofast_og.bulk.inc';

/**
 * Callback to menu /space/admin/members
 * @param type $js
 * @param type $action
 * @return string
 */
function gofast_og_admin_members_page($js, $action ='add'){
  $output =  '<div id="gofast-og-admin-spaces-container">'
            .theme('gofast_og_space_admin', array('js' => $js, 'action'=>$action))
            .'</div>';
  return $output;
}

/**
 * Return the list of actif user in a specific format
 * to be used by a checkboxes widget
 * @return string
 */
function gofast_og_get_visible_users(){
  $users = array();

  $query = db_select('users', 'u');
  $query->fields('u', array('uid','name'));
  $query->join('field_data_ldap_user_givenname', 'a', 'a.entity_id = u.uid');
  $query->join('field_data_ldap_user_sn', 'b', 'b.entity_id = u.uid');
  $query->fields('a', array('ldap_user_givenname_value'));
  $query->fields('b', array('ldap_user_sn_value'));
  $query->condition('u.status', 1);
  $query->condition('u.name', 'adm', '<>');
  $query->condition('u.uid', '1', '<>');
  $query->orderBy('b.ldap_user_sn_value', 'ASC');

  $results = $query->execute();

  if ($results->rowCount() > 0) {
    while($user = $results->fetchObject()){
      $users[$user->uid] = strtoupper($user->ldap_user_sn_value).' '.$user->ldap_user_givenname_value;
    }
  }
  return $users;
}



/**
 * Gofast OG member administration page.
 */
function gofast_og_admin_account($js, $group_type, $gid) {
  gofast_og_admin_member ($js, $group_type, $gid);
}

/**
 * Edit single OG membership - modal callback.
 */
function gofast_og_edit_membership($js, $group_type, $gid, $og_membership) {
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  if (!$js){
    return drupal_get_form('og_ui_edit_membership', $group_type, $gid, $og_membership);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Edit membership', array(), array('context' => 'gofast:gofast_og')),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('og_ui_edit_membership', $form_state);

  if($form_state['last_admin']){
    form_get_errors();
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_toast_message(t("You can't remove the last administrator of a space", array(), array('context' => "gofast:gofast_og")), "error")
    );
  }else if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
}

function gofast_og_form_og_ui_edit_membership_form_alter(&$form, &$form_state) {
  $form['#submit'][] = '';
}

/**
 * Show confirmation modal for membership instant edit
 */
function gofast_og_instant_edit_membership($js, $group_type, $gid, $type, $og_membership, $role_id) {
  ctools_include('og_ui/og_ui.admin', 'og', '');
  global $user;
  $args = func_get_args();
  array_shift($args);
  $old_role = null;
  if($og_membership->entity_type == "user"){
    $old_role = gofast_og_get_user_roles($og_membership->gid, $og_membership->etid);
  } else if($type == "userlist"){
    $old_role = gofast_userlist_og_get_userlist_roles("node", $og_membership->gid, $og_membership->etid);
  }

  if (!$js){
    return drupal_get_form('gofast_og_ui_instant_edit_membership', $group_type, $gid, $type, $og_membership, $role_id);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);
  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Edit membership in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('gofast_og_ui_instant_edit_membership', $form_state);

  if ($form_state['last_admin']){
    form_get_errors();
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_toast_message(t("You can't remove the last administrator of a space", array(), array('context' => "gofast:gofast_og")), "error")
    );
  } elseif ($form_state['submitted']) {
    $message = $type == "userlist"
      ? t("The userlist has successfully been edited", array(), array('context' => "gofast:gofast_og"))
      : t("The user has successfully been edited", array(), array('context' => "gofast:gofast_og"));
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers"),
      gofast_command_toast_message($message, "success")
    );
    $new_role = null;
    if($og_membership->entity_type == "user"){
      $new_role = gofast_og_get_user_roles($og_membership->gid, $og_membership->etid);
    } else if($type == "userlist"){
      $new_role = gofast_userlist_og_get_userlist_roles("node", $og_membership->gid, $og_membership->etid);
    }
    $event = array('mod_author' => $user->uid, 'mod_timestamp' => time(), 'event' => 'update_role', 'entity_id' => $og_membership->etid, 'entity_type' => $og_membership->entity_type, 'old_role' => $old_role, 'new_role' => $new_role);
    $event = serialize($event);
    $last_event_serialized = rawurlencode($event);

    $last_event_unserialized["mod_timestamp"] = time();
    $last_event_unserialized["mod_author"] = $user->uid;

    //Insert inton audit
    gofast_audit_insert_line_audit($og_membership->gid, 'update_role', $last_event_serialized, $last_event_unserialized);
  }

  print ajax_render($commands);
}

function gofast_og_ui_instant_edit_membership($form, &$form_state, $group_type, $gid, $type, $og_membership, $role_id) {
  $account = user_load($og_membership->etid);

  // Current roles
  $form_state['og_roles'] = og_roles('node', gofast_get_node_type($gid), $gid, FALSE, FALSE);
  $form_state['current_roles'] = og_get_user_roles($group_type, $gid, $og_membership->etid);
  // Target role
  $form_state['role_id'] = $role_id;
  $form_state['role_name'] = og_role_load($role_id)->name;

  $form_state['group_type'] = $group_type;
  $form_state['gid'] = $gid;
  if ($type == 'userlist') {
    $userlist = entity_load_single("userlist", $og_membership->etid);
    $form_state["userlist"] = $userlist;
    $name = $userlist->name;
  } else {
    $form_state["uid"] = $og_membership->etid;
    $form_state["userlist"] = FALSE;
    $name = $account->name;
  }

  $form['#validate'][] = "gofast_og_ui_instant_edit_membership_validate";
  $form['#submit'][] = "gofast_og_ui_instant_edit_membership_submit";

  [ $hasTasks, $name, $warning ] = gofast_og_checkIfTasksInSpace($gid, 
    $type, $account, $og_membership, $name);

  if ($hasTasks) {
    $form['warning'] = array(
      '#type' => 'markup',
      '#markup' => '<div class="alert alert-block alert-dismissible alert-warning messages warning d-flex align-items-center" role="alert">
                      <div class="alert-icon"><i class="fa fa-exclamation-triangle pr-5" style="font-size:1.5em"></i></div>
                      <div class="alert-text">' . $warning . '</div>
                    </div>',
    );
  }
  $confirm_form = confirm_form($form,
      "", // title is already set
      "/node/{$gid}" . "#gofastSpaceMembers",
      t('Are you sure you would like to edit the membership for @user ?', array('@user' => $name), array('context' => "gofast:gofast_og")),
  );
  // classes for the global modal script to properly display the cancel button
  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
  $confirm_form['actions']['cancel']['#attributes'] = array(
      'id' => 'edit-cancel',
      'class' => array('btn', 'btn-secondary')
  );
  return $confirm_form;
}

function gofast_og_ui_instant_edit_membership_validate($form, &$form_state) {
  $users_admins = gofast_userlist_og_get_node_members_by_role($form_state["gid"], array(OG_STATE_ACTIVE), "administrator member");
  if(count($users_admins) < 2 && strpos($form_state['role_name'], "administrator member") == FALSE && in_array("administrator member", $form_state['current_roles'])) {
      $form_state['last_admin'] = TRUE;
      form_set_error("last_admin", t("You can't remove the last administrator of a space", array(), array('context' => "gofast:gofast_og")));
  }
  return FALSE;
}

function gofast_og_ui_instant_edit_membership_submit($form, &$form_state) {
  $rids = array_keys($form_state["og_roles"]);

  $removed_rids = array_filter($rids, function($rid) use ($form_state){
    return $rid != $form_state["role_id"];
  });
  // Remove all roles before granting new one to prevent user having two roles on hook role_grant
  foreach($removed_rids as $removed_rid){
    if($form_state["userlist"]){
      gofast_userlist_og_role_revoke_userlist($form_state["group_type"], $form_state["gid"], $form_state["userlist"]->ulid, $removed_rid);
    } else {
      og_role_revoke($form_state["group_type"], $form_state["gid"], $form_state["uid"], $removed_rid);
    }
  }
  if($form_state["userlist"]){
    gofast_userlist_og_role_grant_userlist($form_state["group_type"], $form_state["gid"], $form_state["userlist"]->ulid, $form_state["role_id"]);
  } else {
    og_role_grant($form_state["group_type"], $form_state["gid"], $form_state["uid"], $form_state["role_id"]);
  }
}

/**
 * Delete single OG membership - modal callback.
 */
function gofast_og_delete_membership($js, $group_type, $gid, $og_membership) {
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  if (!$js){
    return drupal_get_form('gofast_og_ui_delete_membership', $group_type, $gid, $og_membership);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);

  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Remove membership in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('gofast_og_ui_delete_membership', $form_state);

  if($form_state['last_admin']){
    form_get_errors();
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_toast_message(t("You can't remove the last administrator of a space", array(), array('context' => "gofast:gofast_og")), "error")
    );
  }else if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
}

/**
 * Delete a single membership from group.
 */
function gofast_og_ui_delete_membership($form, &$form_state, $group_type, $gid, $og_membership) {
  og_set_breadcrumb($group_type, $gid, array(l(t('Group'), "$group_type/$gid/group")));
  $account = user_load($og_membership->etid);

  $check = false;
  $userlists = gofast_userlist_og_get_node_members($gid, array('userlist'));
    
  $rids = array();
  //check if user is in userlist in the space
  foreach ($userlists as $userlist) {
    if (gofast_userlist_is_member_of($userlist->etid, $account->uid) == TRUE) {
      $rids = gofast_userlist_og_get_userlist_roles($group_type, $gid, $userlist->etid) + $rids;
      $check = true;
    }
  }

  if($check == true){
    global $user;
    $role_string = "";
    //Get the higher roles
    if(array_search(GOFAST_OG_ROLE_ADMIN, $rids) !== FALSE){
      $role_string = GOFAST_OG_ROLE_ADMIN;
    }else if(array_search(GOFAST_OG_ROLE_MANAGER, $rids) !== FALSE){
      $role_string = GOFAST_OG_ROLE_MANAGER;
    }else if(array_search(GOFAST_OG_ROLE_STANDARD, $rids) !== FALSE){
      $role_string = GOFAST_OG_ROLE_STANDARD;
    }else if (array_search(GOFAST_OG_ROLE_READ_ONLY, $rids) !== FALSE){
      $role_string = GOFAST_OG_ROLE_READ_ONLY;
    }
    if (strlen($role_string)) {
      $role_string = $user->language == "en" ? ucfirst($role_string) : t($role_string, array(), array("context" => "gofast"));
    }
  }

  // Add group membership form. We still don't have the user or state.
  $form_state['og_membership'] = $og_membership;
  $form['#validate'][] = "gofast_og_ui_delete_membership_validate";
  
  [$hasTasks, $name, $warning] = gofast_og_checkIfTasksInSpace($gid,
    $og_membership->entity_type, $account,
    $og_membership, $account->name);

  if ($hasTasks) {
    $form['warning'] = array(
      '#type' => 'markup',
      '#markup' => '<div class="alert alert-block alert-dismissible alert-warning messages warning d-flex align-items-center" role="alert">
                      <div class="alert-icon"><i class="fa fa-exclamation-triangle pr-5" style="font-size:1.5em"></i></div>
                      <div class="alert-text">' . $warning . '</div>
                    </div>',
    );
  }

  // build message content of the confirmation form
  $confirmation_message = (
  (
    // Is the user is in a user list in this space? then show warning that the user can still access the space
    // otherwise do not show the warning banner.
    ($check) ?
    (
      '<div class="alert alert-block alert-dismissible alert-warning messages warning d-flex align-items-center">'
      . '<i class="fa fa-exclamation-triangle pr-5 text-white" style="font-size:1.5em"> </i><div>'
      . t(
        'This user will still be able to access this space because they are still a member of one or more user lists in this space. Their new role will be: @role.',
        ['@role' => $role_string],
        ['context' => 'gofast_og'],
      ) . '</div></div></br>'
    )
    : ''
  )
  // permanent confirmation message
  . t(
    'Are you sure you would like to remove the membership for the user @user?',
    ['@user' => $account->name],
  )
  );

  $confirm_form = confirm_form(
    $form,
    "",
    "/node/{$gid}" . "#gofastSpaceMembers",
    $confirmation_message,
  );
  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
  $confirm_form['actions']['cancel']['#attributes'] = array(
      'id' => 'edit-cancel',
      'class' => array('btn', 'btn-secondary')
  );
  return $confirm_form;
}

/**
 * Implements validation of membership deletion form
 */
function gofast_og_ui_delete_membership_validate($form, &$form_state) {
    $membership = $form_state['og_membership'];

    $member_uid = $membership->etid;
    $node = node_load($membership->gid);

    //Check if we are impacting an administrator membership
    if($membership->entity_type == "user"){
        $roles = og_get_user_roles("node", $node->nid, $member_uid);
    }else if($membership->entity_type == "userlist"){
        $roles = gofast_userlist_og_get_userlist_roles("node", $node->nid, $member_uid);
    }

    if(in_array("administrator member", $roles, TRUE)){
        //Check cound of administrators in this space
        $users_admins = gofast_userlist_og_get_node_members_by_role($node->nid, array(OG_STATE_ACTIVE), "administrator member");
        if(count($users_admins) < 2){
            $form_state['last_admin'] = TRUE;
            form_set_error("last_admin", t("You can't remove the last administrator of a space", array(), array('context' => "gofast:gofast_og")));
        }
    }

}


/**
 * Callback from spaces/%ctools_js/%/%/admin/bulk-instant-edit-membership/%/%'
 */
function gofast_og_change_role_bulk_membership($js, $group_type, $gid, $rid, $uids){
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);

  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Change memberships in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('gofast_og_ui_change_role_bulk_membership', $form_state, $group_type, $gid, $rid, $uids);
  if($form_state['last_admin']){
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_toast_message(t("A space must have at least two administrators", array(), array('context' => "gofast:gofast_og")), "error")
    );
  }else if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
  
}




/**
 * Form to change the role of multiple users in a group.
 */
function gofast_og_ui_change_role_bulk_membership($form, &$form_state, $group_type, $gid, $rid, $uids) {

  $uids = explode('-', $uids);
  $form_state['gid'] = $gid;
  $form_state['uids'] = $uids;
  $form_state['rid'] = $rid;
  
  $form['#validate'] = array("gofast_og_ui_change_role_bulk_membership_validate");
  $form['#submit'] =  array("gofast_og_ui_change_role_bulk_membership_submit");

  $summaries = array();
  $summary_message = "";
  foreach ($summaries as $summary) {
    $summary_message .= $summary["picture"]."<br />";
  }
  
  $confirm_form = confirm_form(
    $form,
    "",
    "/node/{$gid}#gofastSpaceMembers",
     $summary_message,
  );
  // Create the list of users to be displayed in the confirmation form
  $titles = "<div>";
  foreach ($uids as $uid) {
    $uid = explode(':', $uid);
    $entity_uid = $uid[1];
    $entity_type = $uid[0];
    if($entity_type == "user"){
      $account = user_load($entity_uid);
      if (isset($account->uid)) {
        $title = $account->ldap_user_givenname[LANGUAGE_NONE][0]['value'] . " " . $account->ldap_user_sn[LANGUAGE_NONE][0]['value'];
        $picture =  theme('user_picture', array('account' => $account, 'dimensions' => 40));
        $titles .= '<div class="d-flex align-items-center">' . $picture . '<span class="ml-3 text-dark font-size-h6">' . $title  . '</span></div>';
      }
    }else{
      $userlist = entity_load_single("userlist", $entity_uid);
      if (isset($userlist->ulid)) {
        $title = $userlist->name;
        $picture =  theme('user_picture', array('account' => $userlist, 'dimensions' => 40));
        $titles .= '<div class="d-flex align-items-center">' . $picture . '<span class="ml-3 text-dark font-size-h6">' . $title  . '</span></div>';
      }
    }
  }
  $titles .= "</div>";
  $confirm_form["selected_uids_titles"] = array(
    '#type' => 'fieldset',
    '#title' => $titles,
  );

  // Actions buttons
  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
  $confirm_form['actions']['cancel']['#attributes'] = array(
    'id' => 'edit-cancel',
    'class' => array('btn', 'btn-secondary')
  );

  return $confirm_form;
}


/**
 * Implements hook_validate().
 */
function gofast_og_ui_change_role_bulk_membership_validate($form, &$form_state) {
  
  // Get all parameters
  $uids = $form_state['uids'];
  $rid = $form_state['rid'];
  $role_name = og_role_load($rid)->name;
  $gid = $form_state['gid'];
  
  // Get all remaining administrators to check if we already have at least two
  $remaining_admins = gofast_userlist_og_get_node_members_by_role($form_state['gid'], array(OG_STATE_ACTIVE), "administrator member");
  
  foreach ($uids as $uid) {
    $uid = explode(':', $uid);
    $member_uid = $uid[1];
    $member_entity_type = $uid[0];
    //Check if we are impacting an administrator membership
    if($member_entity_type== "user"){
      $roles = gofast_og_get_user_roles($gid, $member_uid);
    }else if($member_entity_type == "userlist"){
      $roles = gofast_userlist_og_get_userlist_roles("node", $gid, $member_uid);
    }
    
    if(in_array("administrator member", $roles, TRUE)){
      
      //remove this entity from remaining space administrators
      if(array_search($member_uid, array_column($remaining_admins, 'etid')) !== false && strpos($role_name, "administrator member") === FALSE){
        unset($remaining_admins[array_search($member_uid, array_column($remaining_admins, 'etid'))]);
        // Reset the array keys
        $remaining_admins = array_values($remaining_admins);
      }
      //Check count of administrators in this space without entities we will remove from this space
      if(count($remaining_admins) < 2){
        $form_state['last_admin'] = TRUE;
        form_set_error("last_admin", t("A space must have at least two administrators", array(), array('context' => "gofast:gofast_og")));
      }
    }
  }
}

/**
 * hook_form_submit() implementation.
 */
function gofast_og_ui_change_role_bulk_membership_submit($form, &$form_state) {

  $uids = $form_state['uids'];
  $gid = $form_state['gid'];
  $rid = $form_state['rid'];
  $role_name = og_role_load($rid)->name;
  foreach ($uids as $uid) {
    $uid = explode(':', $uid);
    $member_uid = $uid[1];
    $member_type = $uid[0];

    // Update membership
    if($member_type == "user"){ // User
      gofast_og_space_admin_update_membership($gid, $member_uid, $role_name);
    }else if ($member_type == "userlist"){ // Userlist
      gofast_userlist_og_update_membership($gid, $member_uid, $role_name);
    }
  }
}




/**
 * Delete  OG memberships - modal callback.
 */
function gofast_og_delete_bulk_membership($js, $group_type, $gid, $og_membership_ids) {
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);

  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Remove memberships in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    )
  );
  $commands = ctools_modal_form_wrapper('gofast_og_ui_delete_bulk_membership', $form_state, $group_type, $gid, $og_membership_ids);
  if($form_state['last_admin']){
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_toast_message(t("A space must have at least two administrators", array(), array('context' => "gofast:gofast_og")), "error")
    );
  }else if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
}
/**
 * Delete multiple membership from group.
 */
function gofast_og_ui_delete_bulk_membership($form, &$form_state, $group_type, $gid, $uids) {
  $remaining_userlists = gofast_userlist_og_get_node_members($gid, array('userlist'));
  
  $form_state['gid'] = $gid;
  // Membership_id to og_membership
  if (strpos($uids, '-') !== false) { 
    $uids = explode('-', $uids); 
  }
  
  
  $og_memberships = []; // Create a new array to store loaded memberships
  foreach ($uids as $uid) {
    $uid = explode(':', $uid);
    $entity_type = $uid[0];
    $etid = $uid[1];
    $membership = og_get_membership('node', $gid, $entity_type, $etid);
    $og_memberships[] = $membership;
  }
  $form_state['og_memberships'] = $og_memberships;
  
  $at_least_one_userlist = false;
  //build an array containing all warnings to display
  $warnings = array();
  $summaries = array();
  
  //first, iterate into userlist memberships
  foreach ($og_memberships as $og_membership) {
    if ($og_membership->entity_type == "userlist"){
      $form_state['og_memberships'][] = $og_membership;
      $at_least_one_userlist = true;
    
      $ul = entity_load_single('userlist', $og_membership->etid);
      $summaries[$og_membership->etid] = array('picture' => $ul->name);
     
      //remove this userlist from space remaining userlists
      if(array_search($og_membership->etid, array_column($remaining_userlists, 'etid')) !== false){
        unset($remaining_userlists[array_search($og_membership->etid, array_column($remaining_userlists, 'etid'))]);
      }
    }
  }
  

   //then, iterate into user memberships, to be sure to have a correct remaining userlists list
   foreach ($og_memberships as $og_membership) {
    if ($og_membership->entity_type == "user"){
      $form_state['og_memberships'][] = $og_membership;
      $check = false; 
      $rids = array();
      $account = user_load($og_membership->etid);
      
    
      $summaries[$og_membership->etid] = array('picture' => theme('user_picture', array('account' => $account, 'dimensions' => 40)));

      // Check if the user is in a userlist remaining in the space
      foreach ($remaining_userlists as $userlist) {
        if (gofast_userlist_is_member_of($userlist->etid, $account->uid)) {
          $rids = array_merge($rids, gofast_userlist_og_get_userlist_roles($group_type, $gid, $userlist->etid));
          $check = true;         
        }
        
        // Determine the highest role
        if ($check) {
          if (in_array('administrator member', $rids)) {
            $final_rids = 0;
          } elseif (in_array('group contributor', $rids)) {
            $final_rids = 1;
          } elseif (in_array('read only member', $rids)) {
            $final_rids = 2;
          }

          switch ($final_rids) {
            case 0:
              $role_string = t('administrator member', array(), array('context' => 'gofast_og'));
              break;
            case 1:
              $role_string = t('group contributor', array(), array('context' => 'gofast_og'));
              break;
            case 2:
              $role_string = t('read only member', array(), array('context' => 'gofast_og'));
              break;
          }
          
          $warning = array("user" => theme('user_picture', array('account' => $account, 'dimensions' => 40)),
                           "text" => t('This user will still be able to access this space because they are still a member of one or more user lists in this space. Their new role will be: @role.',
                           ['@role' => $role_string], 
                           ['context' => 'gofast_og'])
                          );
          $warnings[$og_membership->etid] = $warning;
                           
        }  
      } 
    } 
   }
   
   //if at least one userlist removed, display warning message
   if($at_least_one_userlist){
    $warning = array("user" => "",
                    "text" => t('If you delete a userlist from the space, users in this list will also be removed from their child spaces',
                              array(), 
                              ['context' => 'gofast_og'])
              );
    $warnings[] = $warning;
   }
   
  // print_r($warnings);exit;
  
  $form['#validate'] = array("gofast_og_ui_delete_bulk_membership_validate");
  $form['#submit'] =  array("gofast_og_ui_delete_bulk_membership_submit");

  $warning_message = "";
  foreach($warnings as $warning){
    $warning_message .=  (
      '<div class="alert alert-block alert-dismissible alert-warning messages warning d-flex align-items-center">'
      . '<i class="fa fa-exclamation-triangle pr-5 text-white" style="font-size:1.5em"> </i><div>'
      . $warning['user'] . $warning['text'] . '</div></div></br>'
      );
  }
  
  $confirm_form = confirm_form(
    $form,
    "",
    "/node/{$gid}#gofastSpaceMembers",
    $warning_message."<br />",
  );

  // Create the list of users to be displayed in the confirmation form
  $titles = "<div>";
  foreach ($uids as $uid) {
    $uid = explode(':', $uid);
    $entity_uid = $uid[1];
    $entity_type = $uid[0];
    if ($entity_type == "user") {
      $account = user_load($entity_uid);
      if (isset($account->uid)) {
        $title = $account->ldap_user_givenname[LANGUAGE_NONE][0]['value'] . " " . $account->ldap_user_sn[LANGUAGE_NONE][0]['value'];
        $picture =  theme('user_picture', array('account' => $account, 'dimensions' => 40));
        $titles .= '<div class="d-flex align-items-center">' . $picture . '<span class="ml-3 text-dark font-size-h6">' . $title  . '</span></div>';
      }
    } else {
      $userlist = entity_load_single("userlist", $entity_uid);
      if (isset($userlist->ulid)) {
        $title = $userlist->name;
        $picture =  theme('user_picture', array('account' => $userlist, 'dimensions' => 40));
        $titles .= '<div class="d-flex align-items-center">' . $picture . '<span class="ml-3 text-dark font-size-h6">' . $title  . '</span></div>';
      }
    }
  }
  $titles .= "</div>";
  $confirm_form["selected_uids_titles"] = array(
    '#type' => 'fieldset',
    '#title' => $titles,
  );

  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
  $confirm_form['actions']['cancel']['#attributes'] = array(
    'id' => 'edit-cancel',
    'class' => array('btn', 'btn-secondary')
  );

  return $confirm_form;
}

/**
 * Implements validation of memberships deletion form
 */
function gofast_og_ui_delete_bulk_membership_validate($form, &$form_state) {
  $og_memberships = $form_state['og_memberships'];
  $remaining_admins = gofast_userlist_og_get_node_members_by_role($form_state['gid'], array(OG_STATE_ACTIVE), "administrator member");

  foreach ($og_memberships as $membership) {
    $member_uid = $membership->etid;
    $node = node_load($membership->gid);
    //Check if we are impacting an administrator membership
    if($membership->entity_type == "user"){
      $roles = og_get_user_roles("node", $node->nid, $member_uid);
    }else if($membership->entity_type == "userlist"){
      $roles = gofast_userlist_og_get_userlist_roles("node", $node->nid, $member_uid);
    }
   
    if(in_array("administrator member", $roles, TRUE)){
      
      //remove this entity from remaining space administrators
      if(array_search($membership->etid, array_column($remaining_admins, 'etid')) !== false){
        unset($remaining_admins[array_search($membership->etid, array_column($remaining_admins, 'etid'))]);
      }
      
      //Check count of administrators in this space without entities we will remove from this space
      if(count($remaining_admins) < 2){
        $form_state['last_admin'] = TRUE;
        form_set_error("last_admin", t("A space must have at least two administrators", array(), array('context' => "gofast:gofast_og")));
      }
    }
  }
  
}

/**
 * Submit handler;Delete memberships.
 */
function gofast_og_ui_delete_bulk_membership_submit($form, &$form_state) {

  $memberships = $form_state['og_memberships'];

  foreach ($memberships as $membership) {
    if($membership->entity_type == "user"){ // User
      $member_uid = $membership->etid;
      $node = node_load($membership->gid);
      $account = user_load( $member_uid );
    
      $membership->delete();
    
      //Check if this User is member by userlist in current space
      $check = gofast_og_check_spaces_user($membership->entity_type, $account, $membership->gid);
      if( $check == FALSE ){
        gofast_og_sendmail_delete_membership_user(user_load($member_uid), array($node), NULL);
          if($membership->entity_type == 'user'){
            $membership_data = array(
              'membership_action' => 'DMEM', // Remove Member
              'membership_type' => 'user',
              'membership_id' => $member_uid,
              'membership_name' => gofast_user_get_display_name_sql($member_uid)
            );
            gofast_message_ext_create_og_membership_entity($node, $membership_data);
          }
          //Log into audit
          gofast_audit_delete_members($node, $membership_data);
      }
    }else if ($membership->entity_type == "userlist"){ // Userlist
      $userlist = entity_load_single('userlist', $membership->etid);
      $node = node_load($membership->gid);
      $membership->delete();

      // Get all members of the remove userlist
      $userlist_members = gofast_userlist_get_members($userlist->ulid);
      foreach($userlist_members as $uid => $theme_user){
        $user_removed = user_load($uid);
        $check = gofast_og_check_spaces_user($membership->entity_type, $user_removed, $membership->gid);
        if ($check == FALSE) {
          gofast_og_sendmail_delete_membership_user($user_removed, array($node), NULL);
        }
      }

      $membership_data = array(
        'membership_action' => 'DMEM', // Delete Member
        'membership_type' => 'userlist',
        'membership_id' => $membership->etid,
        'membership_name' => $userlist->name
      );
      gofast_message_ext_create_og_membership_entity($node, $membership_data);

      //Log into audit
      gofast_userlist_audit_membership($node, $membership_data);
    }
  }
  drupal_set_message(t('The memberships were deleted.'));
}

function gofast_og_check_remove_last_admin_children($member_uid, $node, $membership){
    //load all node children
    $descendants = gofast_og_get_children($node->nid, TRUE, FALSE, TRUE);
    if(count($descendants) > 0){
        $last_admin = false;
        foreach($descendants as $gid){
             //Check if we are impacting an administrator membership
            watchdog("debug admin 1", $membership->entity_type);
            if($membership->entity_type == "user"){
                $roles = og_get_user_roles("node", $gid, $member_uid);
            }else if($membership->entity_type == "userlist"){
                $roles = gofast_userlist_og_get_userlist_roles("node", $gid, $member_uid);
            }
             watchdog("debug admin", json_encode($roles));
           if(in_array("administrator member", $roles, TRUE)){
                //Check cound of administrators in this space
                 watchdog("debug admin 2", json_encode($roles));
                $users_admins = gofast_userlist_og_get_node_members_by_role($gid, array(OG_STATE_ACTIVE), "administrator member");
                 watchdog("debug admin 3", json_encode($users_admins));
                if(count($users_admins) < 2){
                    $last_admin = true;
                    return false;
                }
           }
        }
    }else{
        //no children
        return true;
    }
   if($last_admin == true){
        return false;
   }else{
       return true;
   }

}

/**
 * Submit handler;Delete the membership.
 */
function gofast_og_ui_delete_membership_submit($form, &$form_state) {

  $membership = $form_state['og_membership'];

  $member_uid = $membership->etid;
  $node = node_load($membership->gid);
  $account = user_load( $member_uid );

  $membership->delete();

  //Check if this User is member by userlist in current space
  $check = gofast_og_check_spaces_user($membership->entity_type, $account, $membership->gid);
  if( $check == FALSE ){
      gofast_og_sendmail_delete_membership_user(user_load($member_uid), array($node), NULL);
        if($membership->entity_type == 'user'){
            $membership_data = array(
                'membership_action' => 'DMEM', // Remove Member
        'membership_type' => 'user',
        'membership_id' => $member_uid,
        'membership_name' => gofast_user_get_display_name_sql($member_uid)
            );
           gofast_message_ext_create_og_membership_entity($node, $membership_data);
         }
           //Log into audit
        gofast_audit_delete_members($node, $membership_data);
  }

  $form_state['redirect'] = 'group/' . $membership->group_type . '/' . $membership->gid . '/admin/people';

  drupal_set_message(t('The membership was removed.'));
}

/**
 * Grant access to OG group - modal callback.
 */
function gofast_og_grant_membership($js, $group_type, $gid, $og_membership) {
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  if (!$js){
    return drupal_get_form('gofast_og_ui_grant_membership', $group_type, $gid, $og_membership);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);

  $form_state = array(
    'ajax' => TRUE,
    'title' =>  t('Accept membership request in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    ) 
  );

  $commands = ctools_modal_form_wrapper('gofast_og_ui_grant_membership', $form_state);
  // Handle if submit with errors
  if (isset($commands[0])) {
    $commands[0]['output'] = gofast_normalize_string_from_ajaxifying($commands[0]['output']);
  }

  if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
}

/**
 * Deny access to OG group - modal callback.
 */
function gofast_og_deny_membership($js, $group_type, $gid, $og_membership) {
  ctools_include('og_ui/og_ui.admin', 'og', '');

  $args = func_get_args();
  array_shift($args);

  if (!$js){
    return drupal_get_form('gofast_og_ui_deny_membership', $group_type, $gid, $og_membership);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $group = entity_load_single($group_type, $gid);
  $label = entity_label($group_type, $group);

  $form_state = array(
    'ajax' => TRUE,
    'title' =>  t('Deny membership in group @group', array('@group' => $label)),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('gofast_og_ui_deny_membership', $form_state);
  // Handle if submit with errors
  if (isset($commands[0])) {
    $commands[0]['output'] = gofast_normalize_string_from_ajaxifying($commands[0]['output']);
  }
  if ($form_state['submitted']) {
    $commands = array(
      ctools_modal_command_dismiss(),
      gofast_command_processAjax("/node/{$gid}" . "#gofastSpaceMembers")
    );
  }

  print ajax_render($commands);
}

/**
 * Grant membership to a space.
 */
function gofast_og_ui_grant_membership($form, &$form_state, $group_type, $gid, $og_membership) {
  global $user;
  og_set_breadcrumb($group_type, $gid, array(l(t('Group'), "$group_type/$gid/group")));

  $entity = entity_load_single($og_membership->entity_type, $og_membership->etid);

  // Add group membership form. We still don't have the user or state.
  $form_state['og_membership'] = $og_membership;

  $og_default_roles = og_get_default_roles(FALSE);
  $og_default_role_trad = array();
  foreach($og_default_roles as $key => $role_string){
    $og_default_role_trad[$role_string] = $user->language == "en" ? ucfirst($role_string) : t($role_string, array(), array("context" => "gofast"));
  }
  $role = null;
  if($og_membership->entity_type == "user"){
    $role = array_values(gofast_og_get_user_roles($og_membership->gid, $og_membership->etid, FALSE))[0];
  } else if($og_membership->entity_type == "userlist"){
    $role = array_values(gofast_userlist_og_get_userlist_roles("node", $og_membership->gid, $og_membership->etid, false, false))[0];
  }
  $form['role'] = array(
    '#type' => 'radios',
    '#options' => $og_default_role_trad,
    '#required' => TRUE,
    '#description' => t('Role to be assigned for the member', array(), array('context' => 'gofast:gofast_og')),
    '#default_value' => $role,
  );

  $confirm_form = confirm_form($form,
  "", // title is already set
  "/node/{$gid}" . "#gofastSpaceMembers",
  t('Are you sure you would like to accept the membership request for @entity ?', array('@entity' => $entity->name), array('context' => "gofast:gofast_og")),
  );
  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
    // classes for the global modal script to properly display the cancel button
  $confirm_form['actions']['cancel']['#attributes'] = array(
      'id' => 'edit-cancel',
      'class' => array('btn', 'btn-secondary')
  );
  return $confirm_form;
}

/**
 * Submit handler;grant the membership.
 */
function gofast_og_ui_grant_membership_submit($form, &$form_state) {
  $membership = $form_state['og_membership'];
  $rid = key(gofast_og_space_admin_get_node_role('node', $membership->gid, $form_state["values"]["role"]));
  $member_name = "";
  $membership->state = '1';
  $membership->save();
  $entity = entity_load_single($membership->entity_type, $membership->etid);
  if($membership->entity_type == "user"){
    $member_name = gofast_user_get_display_name_sql($membership->etid); 
    // remove pending user membership role before granting resetted role
    db_query("delete from {og_users_roles} where uid = :uid and gid = :gid", array(':uid' => $membership->etid, ':gid' => $membership->gid));
    og_role_grant($membership->group_type, $membership->gid, $membership->etid, $rid);
  } else if($membership->entity_type == "userlist"){
    $member_name = $entity->name;
    db_query("delete from {gofast_og_userlists_roles} where ulid = :ulid and gid = :gid", array(':ulid' => $membership->etid, ':gid' => $membership->gid));
    gofast_userlist_og_role_grant_userlist($membership->group_type, $membership->gid, $membership->etid, $rid);
  }
  if($membership->entity_type == "user"){
    //We propagate the membership to the parents
    gofast_og_membership_propagate($membership);
    //We add user in LDAP
    gofast_ldap_og_membership_insert($membership);
    $role = key(gofast_og_get_user_roles($membership->gid, $membership->etid));
    $role = array($role);
    gofast_ldap_og_role_grant('node', $membership->gid, $membership->etid, $role);
  }
  $form_state['redirect'] = 'group/' . $membership->group_type . '/' . $membership->gid . '/admin/people';

  // send mail in this case
  $message = t("Your request is accepted !");
  gofast_og_sendmail_members_groups($membership, $message);

  $node = node_load($membership->gid);
  $membership_data = array(
    'membership_action' => 'NMEM', // add Member
    'membership_type' => $membership->entity_type,
    'membership_id' => $membership->etid,
    'membership_name' => $member_name, 
    'ignore_mail_queue' => TRUE,
  );
  gofast_message_ext_create_og_membership_entity($node, $membership_data);
  gofast_audit_add_members($node, $membership_data);
  drupal_set_message(t('The membership request was accepted.'));
}

/**
 * Deny membership to a space.
 */
function gofast_og_ui_deny_membership($form, &$form_state, $group_type, $gid, $og_membership) {
  og_set_breadcrumb($group_type, $gid, array(l(t('Group'), "$group_type/$gid/group")));
  $entity = entity_load_single($og_membership->entity_type, $og_membership->etid);

  // Add group membership form. We still don't have the user or state.
  $form_state['og_membership'] = $og_membership;

  $confirm_form = confirm_form($form,
  "", // title is already set
  "/node/{$gid}" . "#gofastSpaceMembers",
  '</br>' . t('Are you sure you would like to deny the membership request for @entity_name ?', array('@entity_name' => $entity->name), array('context' => "gofast:gofast_og")),
  );
  // classes for the global modal script to properly display the cancel button
  $confirm_form['actions']['cancel']['#type'] = "submit";
  $confirm_form['actions']['cancel']['#value'] = t('Cancel');
  $confirm_form['actions']['cancel']['#attributes'] = array(
      'id' => 'edit-cancel',
      'class' => array('btn', 'btn-secondary')
  );
  return $confirm_form;
}

/**
 * Submit handler;Deny the membership.
 */
function gofast_og_ui_deny_membership_submit($form, &$form_state) {
  $membership = $form_state['og_membership'];

  $member_requester = entity_load_single($membership->entity_type, $membership->etid);
  $groups = node_load_multiple(array($membership->gid));
  $membership->delete();
  $form_state['redirect'] = 'group/' . $membership->group_type . '/' . $membership->gid . '/admin/people';

  // send mail in this case
  $message = t("Your request is rejected !");
  if($membership->entity_type == "user"){
    gofast_og_sendmail_rejected_membership_user($member_requester, $groups, $message);
  } else if($membership->entity_type == "userlist"){
    // Get all members of the remove userlist
    $userlist_members = gofast_userlist_get_members($member_requester->ulid);
    foreach($userlist_members as $uid => $theme_user){
      $user_removed = user_load($uid);
      $check = gofast_og_check_spaces_user($membership->entity_type, $user_removed, $membership->gid);
      if ($check == FALSE) {
        gofast_og_sendmail_rejected_membership_user($user_removed, $groups, $message);
      }
    }
  }

  $event = array('mod_author' => $membership->etid, 'mod_timestamp' => time(), 'event' => 'deny_membership', 'user_id' => $membership->etid);
  $event = serialize($event);
  $last_event_serialized = rawurlencode($event);

  $last_event_unserialized["mod_timestamp"] = time();
  $last_event_unserialized["mod_author"] = $membership->etid;

  //Insert inton audit
  gofast_audit_insert_line_audit($membership->gid, 'deny_membership', $last_event_serialized, $last_event_unserialized);
  drupal_set_message(t('The membership request was denied.'));
}

/**
 * Alter og_user_roles_action form (VBO).
 */
function gofast_og_vbo_action_user_roles_alter(&$form, &$form_state, $context) {
  list($group_type, $gid, $space) = $context;

  $form['add_roles']['#type'] = '#hidden';
  $form['remove_roles']['#type'] = '#hidden';

  // Check if we should use defaults or overriden roles.
  if (og_is_group_default_access($group_type, $gid)) {
    // Get global OG roles.
    $roles = og_roles($group_type, $space->type, 0, FALSE, FALSE);
  }
  else {
    // Get this specific roles, as the permission set may have been overriden.
    $roles = og_roles($group_type, $space->type, $gid, TRUE, FALSE);
  }

  $defaults = og_get_default_roles(FALSE);
  $default_rid = array_search($defaults['gofast_og'], $roles);

  $form['og_roles'] = array(
    '#type' => 'checkboxes',
    '#options' => $roles,
    '#title' => t('Roles', array(), array('context' => 'gofast')),
    '#default_value' => array($default_rid),
    '#attributes' => array('class' => array('og-roles-force-single')),
    '#attached' => array(
      'js' => array(
        array(
          'data' => drupal_get_path('module', 'gofast_og') . '/gofast_og.js',
          'type' => 'file',
          'scope' => 'footer',
          'weight' => 5
        )
      )
    )
  );

  // Our validator must be executed first to map roles add/remove for other
  // validate & submit handlers.
  array_unshift($form['actions']['submit']['#validate'], 'gofast_og_vbo_action_user_roles_validate');
}

/**
 * Validate handler - OG user roles (VBO)
 */
function gofast_og_vbo_action_user_roles_validate(&$form, &$form_state) {
  $og_roles = $form_state['values']['og_roles'];

  $granted = array_filter($og_roles);
  $revoked = array_combine($revoked = array_keys(array_diff_key($og_roles, $granted)), $revoked);

  $form_state['values']['add_roles'] = $granted;
  $form_state['values']['remove_roles'] = $revoked;
}

/**
 * Alter og_membership_delete_action form (VBO).
 */
function gofast_og_vbo_action_membership_delete_confirm_alter(&$form, &$form_state, $context) {
  list($group_type, $gid, $space) = $context;
  $form['description']['#markup'] = str_replace(array('&lt;strong&gt;', '&lt;/strong&gt;'), '', $form['description']['#markup']);
}
