<?php

/**
 * Checks if a user has a given role. We should prefer this method over core
 * user_has_role() method that check on rid which may differ in production site.
 *
 * @param string $role_name
 *  A role name.
 * @param object|null $account (optional)
 *  A user account. Defaults to the current user.
 * @return
 *  bool TRUE if the user has the role, or FALSE if not.
 */
function gofast_user_has_role($role_name, $account = NULL, $uid = NULL)
{
    if (!$account && !$uid)
    {
        $user_roles = $GLOBALS['user']->roles;
        return isset($user_roles) && in_array($role_name, $user_roles, true);
    }
    else if ($uid)
    {
        return in_array($role_name, gofast_get_name_of_user_role_by_uid($uid), true);
    }
    else
    {
        return isset($account->roles) && in_array($role_name, $account->roles, true);
    }
}

/**
 * Checks whether a user is an administrator or not.
 *
 * @param object|null $account (optional)
 *  A user account. Defaults to the current user.
 * @return boolean
 *  TRUE if the user is an administrator, FALSE otherwise.
 */
function gofast_user_is_adm($account = NULL, $uid = NULL)
{
  return gofast_user_has_role(GOFAST_ROLE_ADMIN, $account, $uid);
}

 /* Checks whether a user is a business administrator or not.
 *
 * @param object|null $account (optional)
 *  A user account. Defaults to the current user.
 * @return boolean
 *  TRUE if the user is a business administrator, FALSE otherwise.
 */
function gofast_user_is_business_admin($account = NULL, $uid = NULL)
{
  return gofast_user_has_role(GOFAST_ROLE_BUSINESS_ADMIN, $account, $uid);
}

/**
 * Checks whether a user is a site manager or not.
 *
 * @param object|null $account (optional)
 *  A user account. Defaults to the current user.
 * @return boolean
 *  TRUE if the user is an administrator, FALSE otherwise.
 */
function gofast_user_is_site_manager($account = NULL)
{
  return gofast_user_has_role(GOFAST_ROLE_MANAGER, $account);
}


/**
 * Wrapper function. Returns Gofast user roles. Drupal 'anonymous' roles is
 * excluded, others can be filtered out depending on parameters.
 *
 * @param boolean $technicals [optional]
 *  Whether or not to include technical roles, e.g. 'manager' is implicit and
 *  should not be displayed to users. If TRUE technical roles will be
 *  included. Defaults to FALSE.
 *
 * @param string $permissions [optional]
 *  A permission string. If set, only roles containing that permission are
 *  returned.
 *
 * @return array
 *  An associative array with the role id as the key and the role name as value.
 */
function gofast_user_roles($technicals = FALSE, $permissions = NULL)
{
  $roles = user_roles(TRUE, $permissions);
  if (!$technicals) {
    // Exclude technical roles.
    $roles = array_diff($roles, array_intersect($roles, _gofast_user_technical_roles()));
  }
  return $roles;
}


/**
 * Returns an array of Gofast technical role names.
 *
 * @return
 *  Indexed array of roles names.
 */
function _gofast_user_technical_roles()
{
  return array(GOFAST_ROLE_MANAGER, 'authenticated user');
}


/**
 * Gofast admin user roles page/modal calback.
 */
function gofast_user_edit_roles($js, $account)
{
  $args = func_get_args();
  array_shift($args);

  if (!$js) {
    array_unshift($args, 'gofast_user_edit_roles_form');
    return call_user_func_array('drupal_get_form', $args);
  }

  ctools_include('modal');
  ctools_include('ajax');

  $form_state = array(
    'ajax' => TRUE,
    'title' => t('Edit user profiles', array(), array('context' => 'gofast:gofast_user')),
    'build_info' => array(
      'args' => $args
    )
  );

  $commands = ctools_modal_form_wrapper('gofast_user_edit_roles_form', $form_state);

  if ($form_state['submitted']) {
    $commands = array(ctools_modal_command_dismiss());
  }

  print ajax_render($commands);
}



/**
 * Helper function that returns a list of user entities matching role ids or
 * role names passed in.
 *
 * @param $roles
 *  An array of role_ids or role_names, depending on $type
 * @param $type
 *  (optional) A string defining the type of the $roles param. Possible values
 *  are 'rid' or 'name'. Default is 'name'.
 */
function gofast_user_load_multiple_by_roles($roles, $type = 'name', $full = TRUE)
{
  switch ($type) {
    case 'rid':
      return _gofast_user_load_multiple_by_role_ids($roles, $full);
    case 'name':
      return _gofast_user_load_multiple_by_roles($roles, $full);
  }
  return array();
}

function _gofast_user_load_multiple_by_role_ids($rids, $full = TRUE)
{
  if (!is_array($rids))
    (array) $rids;
  $query = 'SELECT DISTINCT(uid) FROM {users_roles} WHERE rid IN (:rids)';
  $result = db_query($query, array(':rids' => $rids));
  $uids = $result->fetchCol();
  if ($full) {
    return $uids ? user_load_multiple($uids) : array();
  }
  return $uids;
}

function _gofast_user_load_multiple_by_roles($roles, $full = TRUE)
{
  if (!is_array($roles))
    (array) $roles;
  $query = 'SELECT rid FROM {role} WHERE name IN (:names)';
  $result = db_query($query, array(':names' => $roles));
  $rids = $result->fetchCol();
  return $rids ? _gofast_user_load_multiple_by_role_ids($rids, $full) : array();
}

function gofast_user_load_all($full = TRUE)
{
  $query = 'SELECT (uid) FROM {users}';
  $result = db_query($query);
  $uids = $result->fetchCol();
  if ($full) {
    return $uids ? user_load_multiple($uids) : array();
  }
  return $uids;
}


/**
 * Creates a drupal user account.
 *
 * This function prepares a form_state array according to passed in parameters,
 * then populates, processes & submits user profile form ('user_register_form').
 * The return value states whether errors were raised or not, you can get error
 * details by calling form_get_errors().
 *
 * @param string $name
 *  A drupal username.
 *
 * @param string $role_name
 *  A unique GOFAST role name.
 *
 * @param array $options
 *  Any additional properties and fields goes here.
 *
 * @return boolean
 *  TRUE if the account was created, FALSE if validation error(s) occured.
 */
function gofast_user_create($name, $role_name = GOFAST_ROLE_CONTRIBUTOR, array $options = array(), $sasl = TRUE, $creation_method = "form_gui")
{
  $domain = str_replace(array('dc=', ','), array('', '.'), GOFAST_LDAP_INT_BASE_DN);
  $options['name'] = $name;

  // Merge in default options.
  $options += array(
    'pass' => $name,
    'mail' => "{$name}@{$domain}",
    'init' => "{$name}@{$domain}",
    'timezone' => drupal_get_user_timezone(),
    'language' => language_default('language'),
    'status' => 1,
    'is_new' => 1,
    'is_extranet' => 0,
    'is_broadcaster' => 0,
    'notify' => TRUE
  );

  // LDAP fields are mandatory because we use them to generate [cn] attribute
  // token for ldap provisioning. Either LDAP module or openLDAP's inetOrgPerson
  // objectClass require cn to be set.
  $field_defaults = array(
    'ldap_user_sn' => $name,
    'ldap_user_givenname' => $name,
    // ... add only single-valued field here (cardinality 1-1), these are not
    // mandatory but setting a default here ensures we can use shortcut pattern
    // to pass options (key => value).
    'ldap_user_displayname' => $name,
    'ldap_user_manager' => array(),
    'ldap_user_ou' => array(), // gid, won't replace GOFAST_OG_USER_MEMBERSHIP_FIELD
    'ldap_user_title' => array(),
    'field_entity' => array(),
    'ldap_user_telephonenumber' => array(),
    'ldap_user_mobile' => array(),
    'ldap_user_departmentnumber' => array(),
    'ldap_user_description' => array(),
    'ldap_user_mobile' => array()
  );
  $taxonomies = ["field_entity"];

  $options += $field_defaults;
  foreach ($field_defaults as $fieldname => $default) {
    $column = "value";
    if (in_array($fieldname, $taxonomies)) {
      $column = "tid";
    }
    !empty($options[$fieldname]) && is_scalar($options[$fieldname])
      && ($options[$fieldname] = array(LANGUAGE_NONE => array(array($column => $options[$fieldname]))));
  }

  // Register user in its ou if needed.
  if (!empty($options['ldap_user_ou'][LANGUAGE_NONE][0]['value'])) {
    $og = array(GOFAST_OG_USER_MEMBERSHIP_FIELD => array(LANGUAGE_NONE => array(
      array('target_id' => $options['ldap_user_ou'][LANGUAGE_NONE][0]['value'])
    )));
    $options = array_merge_recursive($options, $og);
    // Seems we also have to omit #value_key for this field, or is this the case
    // for all single select fields ??
    $options['ldap_user_ou'][LANGUAGE_NONE][0] = $options['ldap_user_ou'][LANGUAGE_NONE][0]['value'];
  }

  // Assign given roles. Fallback to GOFAST_ROLE_READ_ONLY.
  $options['administer_users'] = TRUE;
  $role = in_array($role_name, gofast_user_roles()) ? user_role_load_by_name($role_name) : user_role_load_by_name(GOFAST_ROLE_READ_ONLY);
  $options['roles'] = array($role->rid => $role->rid);

  // Password.
  require_once DRUPAL_ROOT . '/' . variable_get('password_inc', 'includes/password.inc');
  $options['pass'] = array('pass1' => $options['pass'], 'pass2' => $options['pass']);

  // Let submit handlers know what to do.
  $options['op'] = t('Create new account', array(), array('context' => 'gofast:gofast_user'));

  //Enable SASL if asked
  if ($sasl) {
    $options['sasl_auth'][LANGUAGE_NONE][0]['value'] = TRUE;
  }

  // Retrieves, populates, and processes the form.
  $form_state = array('values' => $options);
  drupal_form_submit('user_register_form', $form_state);

  if ($errors = form_get_errors()) {
    // Generic error log msg, caller may display error message.
    watchdog('Gofast User', 'User :username creation failed.', array(':username' => $name), WATCHDOG_ERROR);
    return FALSE;
  } else {
    watchdog('Gofast User', 'User :username created successfully', array(':username' => $options['name']), WATCHDOG_INFO);
    
    $uid_user   = user_load_by_name($name);
    $uid_create = $uid_user->uid ?? FALSE;
    if($uid_create){
      gofast_audit_create_user( $uid_create, $creation_method);
    }
    return TRUE;
  }
}

/**
 * Create a user programmatically
 */
function gofast_user_user_create($username, $givenname, $sn, $pass, $mail, $main_orga, $lang = 'fr', $sso = FALSE)
{
  require_once DRUPAL_ROOT . '/' . variable_get('password_inc', 'includes/password.inc');

  $account = new StdClass();
  $account->is_new = TRUE;
  $account->status = TRUE;
  $account->name = $username;
  $account->pass = $pass;
  $account->mail = $mail;
  $account->init = $mail;
  $account->timezone = 'Europe/Paris';
  $account->language = $lang;

  $role = user_role_load_by_name(GOFAST_ROLE_CONTRIBUTOR);
  $account->roles[$role->rid] = GOFAST_ROLE_CONTRIBUTOR;

  // These fields are mandatory because we use them to generate [cn] attribute
  // token for ldap provisioning. Either LDAP module or openLDAP's inetOrgPerson
  // objectClass require cn to be set..
  $account->ldap_user_givenname[LANGUAGE_NONE][0]['value'] = $givenname;
  $account->ldap_user_sn[LANGUAGE_NONE][0]['value'] = $sn;

  // Password field provisioning to LDAP doesn't work during account creation.
  $edit = array('pass' => $account->pass);
  ldap_user_ldap_provision_pwd('set', $pass);

  $account = user_save($account, $edit);
  
  if($account && $sso){
    $creation_method =  t('Automatically through SSO SAML configuration.', ['context' => 'gofast:gofast_user']);
    $uid_create = $account->uid;
    gofast_audit_create_user( $uid_create, $creation_method);
  }

  return $account;
}



/**
 * Creates the Gofast Administrator (adm).
 */
function gofast_user_adm_create($thename, $thepswd, $moreInfos = array()) {
  require_once DRUPAL_ROOT . '/' . variable_get('password_inc', 'includes/password.inc');

  $account = new StdClass();
  $account->is_new = TRUE;
  $account->status = TRUE;
  variable_set('gofast_user_adm_username', $thename);
  $account->name = variable_get('gofast_user_adm_username'); //GOFAST_USER_ADMINISTRATOR_USERNAME;
  $account->pass = user_hash_password($thepswd);
  if ($moreInfos['Email'] !== ""){
    $account->mail = $moreInfos['Email'];
    $account->init = $moreInfos['Email'];
  }
  else{
    $account->mail = 'support@ceo-vision.com';
    $account->init = 'support@ceo-vision.com';
  }

  $account->timezone = 'Europe/Paris';
  $account->language = 'fr';

  $role = user_role_load_by_name(GOFAST_ROLE_ADMIN);
  $account->roles[$role->rid] = GOFAST_ROLE_ADMIN;

  /**** Profile Data ****/  // Add data of profile if they are registered
  if ($moreInfos['title'] !== "") {
    $account->ldap_user_title[LANGUAGE_NONE][0]['value'] = $moreInfos['title'];
  }
  if ($moreInfos['phoneNumber'] !== "") {
    $account->ldap_user_telephonenumber[LANGUAGE_NONE][0]['value'] = $moreInfos['phoneNumber'];
  }
  if ($moreInfos['MobilePhoneNumber'] !== "") {
  $account->ldap_user_mobile[LANGUAGE_NONE][0]['value'] = $moreInfos['MobilePhoneNumber'];
  }

  // These fields are mandatory because we use them to generate [cn] attribute
  // token for ldap provisioning. Either LDAP module or openLDAP's inetOrgPerson
  // objectClass require cn to be set..
  if ($moreInfos['Name'] && $moreInfos['firstName'] !== ""){
    $account->ldap_user_givenname[LANGUAGE_NONE][0]['value'] = $moreInfos['firstName'];
    $account->ldap_user_sn[LANGUAGE_NONE][0]['value'] = $moreInfos['Name'];
  }
  else {
    $account->ldap_user_givenname[LANGUAGE_NONE][0]['value'] = 'Administrator';
    $account->ldap_user_sn[LANGUAGE_NONE][0]['value'] = 'Gofast';
  }


  // Password field provisioning to LDAP doesn't work during account creation.
  $edit = array('pass' => $account->pass);
  ldap_user_ldap_provision_pwd('set', $thepswd);

  $account = user_save($account, $edit);
  if ($account === FALSE) {
    watchdog('Gofast User', 'User :adm creation failed.', array(':adm' => GOFAST_USER_ADMINISTRATOR_USERNAME), WATCHDOG_ERROR);
  }
  else {
    watchdog('Gofast User', 'User :adm created successfully', array(':adm' => $account->name), WATCHDOG_INFO);
    variable_set('gofast_user_administrator_id', $account->uid);
  }

  return $account;
}

/*
 * Delete the GoFast Administrator "adm"
 */
function gofast_user_adm_delete($uid){
  user_delete($uid);
  variable_del("gofast_user_administrator_id");
  // delete the old password from ldap
  ldap_user_ldap_provision_pwd("","",TRUE); // return false
}



function gofast_user_get_request_actions($account, $include_subscription = TRUE, $exclude_bulk = FALSE)
{
  $actions = array();
  global $user;
  $user_between_account_relationships = user_relationships_load(array('between' => array($user->uid, array($account->uid))));

  if ($account->uid !== $user->uid) {
    //Check if we are administrator
    if (!$exclude_bulk && user_access("gofast administer users")) {
     if (!gofast_user_is_left($account) && gofast_user_is_business_admin()) { //The user has left the org
      $actions[] = theme('gofast_link_generic', array(
        'icon_class' => "fas fa-ban",
        'href' => "/modal/nojs/user/$account->uid/leave",
        'link_class' => 'ctools-use-modal',
        'text' => t('Disable', array(), array('context' => 'gofast'))
      ));
     }
     if((gofast_user_is_left($account) || $account->status == 0 || gofast_user_is_flood_blocked($account->uid) || $account->field_standby[LANGUAGE_NONE][0]["value"] == 1) && (gofast_user_is_business_admin())){
      $actions[] = theme('gofast_link_generic', array(
        'icon_class' => "fas fa-user-check",
        'href' => "/modal/nojs/user/$account->uid/unstandby_or_unleave",
        'link_class' => 'ctools-use-modal',
        'text' => t('Unblock / Activate', array(), array('context' => 'gofast'))
      ));   
    }
     // DELETE User system link -- if logged user is an admin and the user that we will delete never connecte
      if ($account->login == 0) { // the user never connect
        $actions[] = theme('gofast_link_generic', array(
          'icon_class' => "fas fa-trash",
          'href' => "/modal/nojs/user/$account->uid/delete",
          'link_class' => 'ctools-use-modal',
          'link_id' => 'gofastDeleteUserAction',
          'text' => t('Delete', array(), array('context' => 'gofast'))
        ));
      }
    }
    if (empty($user_between_account_relationships)) {
      $actions[] = theme('gofast_link_generic', array(
        'icon_class' => "fas fa-people-arrows",
        'href' => "/modal/nojs/relationship/$account->uid/request",
        'link_class' => 'ctools-use-modal',
        'text' => t('New relationship', array(), array('context' => 'gofast'))
      ));
    } else {
      $rid = reset($user_between_account_relationships)->rid;
      $requester_id = reset($user_between_account_relationships)->requester_id;
      $requestee_id = reset($user_between_account_relationships)->requestee_id;
      if ($requestee_id === $user->uid) {
        if (reset($user_between_account_relationships)->approved == 1) {
          $actions[] = theme('gofast_link_generic', array(
            'icon_class' => "fas fa-people-arrows",
            'href' => "/modal/nojs/user/$requester_id/relationships/$rid/remove",
            'link_class' => 'ctools-use-modal',
            'text' => t('Remove relationship', array(), array('context' => 'gofast'))
          ));
        } else {
          $actions[] = theme('gofast_link_generic', array(
            'icon_class' => "fas fa-check",
            'href' => "/modal/nojs/user/$requestee_id/relationships/requested/$rid/approve",
            'link_class' => 'ctools-use-modal',
            'text' => t('Approve relationship', array(), array('context' => 'gofast'))
          ));
          $actions[] = theme('gofast_link_generic', array(
            'icon_class' => "fas fa-chain-broken",
            'href' => "/modal/nojs/user/$requestee_id/relationships/requested/$rid/disapprove",
            'link_class' => 'ctools-use-modal',
            'text' => t('Decline relationship', array(), array('context' => 'gofast'))
          ));
        }
      } else if (reset($user_between_account_relationships)->requester_id === $user->uid) {
        if (reset($user_between_account_relationships)->approved == 1) {
          $actions[] = theme('gofast_link_generic', array(
            'icon_class' => "fas fa-times",
            'href' => "/modal/nojs/user/$requester_id/relationships/$rid/remove",
            'link_class' => 'ctools-use-modal',
            'text' => t('Remove relationship', array(), array('context' => 'gofast'))
          ));
        } else {
          $actions[] = theme('gofast_link_generic', array(
            'icon_class' => "fas fa-ban",
            'href' => "/modal/nojs/user/$requester_id/relationships/requested/$rid/cancel",
            'link_class' => 'ctools-use-modal',
            'text' => t('Cancel relationship', array(), array('context' => 'gofast'))
          ));
        }
      }
    }
    if (module_exists('gofast_subscription_ui') && $include_subscription) { //Subscription system link for users
      $actions[] = theme('gofast_link_generic', gofast_contextual_menu_create_flag('subscribe_user',  'fa fa-rss', array('user'), FALSE, $account->uid));
    }
  }
  return $actions;
}



/**
 * Given a manager $account, returns its team members.
 */
function gofast_user_team_member($account = NULL)
{
  if (empty($account) || !isset($account->uid))
    return FALSE;


  // Retrieve teams/managers relationships.
  $teams = gofast_get_field_values('ldap_user_manager', 'user');
  // Filter by manager ($account).
  $team_members = array_keys(array_filter($teams, function ($manager) use ($account) {
    return $manager === "uid={$account->name}," . GOFAST_LDAP_INT_REALM_USERS || $manager ===  "uid={$account->name}," . GOFAST_LDAP_INT_REALM_USERS_LC;
  }));
  // Load all accounts at once so we can theme output.
  $team_members = user_load_multiple($team_members);
  foreach ($team_members as $uid => $member) {
    $userTeam[] = _format_related_user_info_for_profile($member, TRUE);
  }
  return $userTeam;
}


/**
 * Helper function that loads approved relationships of a given user.
 *
 * @param $uid
 *  A valid user id.
 * @param $keyed
 *  A boolean stating whether or not to key the array by user id instead of
 *  rid. Default to TRUE.
 * @param $approved
 *  The current status of the relationship we want to get. Default to TRUE
 * @return
 *  Array of user_relationships objects keyed by relationship id or user id,
 *  depending on $keyed parameter.
 */
function gofast_user_load_relationships($uid = NULL, $keyed = TRUE, $approved = TRUE)
{
  if (!$uid) {
    global $user;
    $uid = $user->uid;
  }
  if ($approved) {
    $params = array('user' => $uid, 'rtid' => GOFAST_USER_RTID, 'approved' => $approved);
    $options = $keyed === TRUE ? array('sort' => 'requestee_id') : array();
  } else {
    $params = array('requestee_id' => $uid, 'approved' => $approved);
    $options = $keyed === TRUE ? array('sort' => 'requester_id') : array();
  }
  return user_relationships_load($params, $options);
}


/**
 * Returns whether a user should be considered as an extranet user or not. Be
 * warned that this is independant from membership to Extranet space since a
 * user (such as 'adm') may be a member of 'Extranet' but not an extranet user.
 *
 * @param object $account [optional]
 *  A fully loaded drupal user object. Do not rely on global $user since fields
 *  are not systematically attached. Defaults to the current user.
 *
 * @return boolean
 */
function gofast_user_is_extranet($account = NULL)
{
  if (!$account) {
    global $user;
    $account = user_load($user->uid);
  }
  if (!isset($account->is_extranet)) {
    $account = user_load($account->uid);
    if (!isset($account->is_extranet)) {
      watchdog('Gofast User', 'Unexpected user object.', array(), WATCHDOG_ERROR);
      return;
    }
  }
  return isset($account->is_extranet[LANGUAGE_NONE][0]['value']) && $account->is_extranet[LANGUAGE_NONE][0]['value'];
}


/**
 * Returns whether a user is restricted to private comments and annotations.
 *
 * @param object $account [optional]
 *  A fully loaded drupal user object. Do not rely on global $user since fields
 *  are not systematically attached. Defaults to the current user.
 *
 * @return boolean
 */
function gofast_user_is_comment_restricted($account = NULL)
{
  if (!$account) {
    global $user;
    $account = user_load($user->uid);
  }
  if (!isset($account->field_is_comment_restricted)) {
    $account = user_load($account->uid);
    if (!isset($account->field_is_comment_restricted)) {
      watchdog('Gofast User', 'Unexpected user object.', array(), WATCHDOG_ERROR);
      return;
    }
  }
  return isset($account->field_is_comment_restricted[LANGUAGE_NONE][0]['value']) && $account->field_is_comment_restricted[LANGUAGE_NONE][0]['value'];
}


/**
 * Returns a node or a node id that corresponds to the main organisation of a
 * given user. Use gofast_ldap_ou_title() to get a main organisation's title.
 *
 * @param object|null $account [optional]
 *  A user account, defaults to the current user.
 *
 * @param boolean $full
 *  Whether to return a full node object or a node ID, defaults to TRUE.
 *
 * @return mixed
 *  A node object or a nid if user's main organisation is set, FALSE otherwise.
 */
function gofast_user_get_main_org($account = NULL, $full = FALSE)
{
  $account = $account ? $account : user_load($GLOBALS['user']->uid);
  if (isset($account->ldap_user_ou[LANGUAGE_NONE][0]['value'])) {
    // Fake a rdn using gofast_ldap_space_cn() pattern.
    $ou = 'cn=' . $account->ldap_user_ou[LANGUAGE_NONE][0]['value'];
    $nid = gofast_ldap_gid_from_dn($ou);
    return $full ? node_load($nid) : $nid;
  }
  return FALSE;
}

/**
 * Helper returning available options/labels for user partitioning (whether or
 * not users who don't share at least 1 space can see each other).
 */
function gofast_user_partitioning_options()
{
  return array(
    GOFAST_USER_PARTITIONING_OFF => t('Users can see each other.', array(), array('context' => 'gofast')),
    GOFAST_USER_PARTITIONING_ON => t('All users cannot see each other.', array(), array('context' => 'gofast')),
    GOFAST_USER_PARTITIONING_ON_ONLY_EXTRANET => t('External users cannot see each other.', array(), array('context' => 'gofast'))
  );
}

/**
 * Returns available options for extranet user access restriction (whether or
 * not extranet users are able to access non-extranet spaces).
 */
function gofast_user_extranet_restriction_options()
{
  return array(
    GOFAST_USER_EXTRANET_RESTRICTION_OFF => t('No restriction : External users are able to access organisations.', array(), array('context' => 'gofast:gofast_user')),
    GOFAST_USER_EXTRANET_RESTRICTION_ON => t('Restricted access : External users cannot access organisations.', array(), array('context' => 'gofast:gofast_user'))
  );
}


/**
 * This is a helper function that returns an account is broadcaster or not.
 * @global type $user
 * @param type $account a specified account, using current if none is given.
 * @return boolean true if the user is broadcaster, false otherwise.
 */
function gofast_user_is_broadcaster($account = NULL)
{
  if ($account === NULL) {
    global $user;
    $account = user_load($user->uid);
  } else {
    $account = user_load($account->uid);
  }
  if (!isset($account->{'is_broadcaster'}[LANGUAGE_NONE][0]['value'])) {
    return FALSE;
  } else {
    if ($account->{'is_broadcaster'}[LANGUAGE_NONE][0]['value'] == 1) {
      return TRUE;
    } else {
      return FALSE;
    }
  }
}


function gofast_user_leave_user($account_uid){
    $account = user_load($account_uid);
    global $user;
    if(isset($account->uid)){
       $account->field_left[LANGUAGE_NONE][0]["value"] = 1;
       $account->status = 0;
       
        //GOFAST-9054
        //if standby mecanism is enabled, and the user was standby, set this field to 0 because 
        //the user is not in standby if we disable it
        if($account->field_standby[LANGUAGE_NONE][0]["value"] == 1){
          $account->field_standby[LANGUAGE_NONE][0]["value"] = 0;
        }
        
       user_save($account);

      //remove from search index
      $env_id = GOFAST_SEARCH_ENV_ID;
      $entity_type = "user";
      $entity_id = $account_uid;
      $indexer_table = apachesolr_get_indexer_table($entity_type);
      if (apachesolr_index_delete_entity_from_index($env_id, $entity_type, $entity_id)) {

      }
      else {
        // Set status 0 so we try to delete from the index again in the future.
        db_update($indexer_table)
          ->condition('entity_id', $entity_id)
          ->fields(array('changed' => REQUEST_TIME, 'status' => 0))
          ->execute();
      }

        //audit
       $event = array('mod_author' => $user->uid, 'mod_timestamp' => time(), 'event' => 'user_leave','uid_to_block' => $account_uid);
       $event = serialize($event);
       $last_event_serialized = rawurlencode($event);

       $last_event_unserialized["mod_timestamp"] = time();
       $last_event_unserialized["mod_author"] = $user->uid;

       //Insert inton audit
       $psid = gofast_og_get_user_private_space($account, FALSE) ?: 0;
       gofast_audit_insert_line_audit($psid, 'user_leave', $last_event_serialized, $last_event_unserialized);

       //implement hook to allow custom module to add custom actions when a user leave
        foreach(module_implements('gofast_user_leave') as $module){
          call_user_func_array($module . '_gofast_user_leave', array(&$account));
        }
    }
}

function gofast_user_unleave_user($account_uid){
    $account = user_load($account_uid);
    if(isset($account->uid)){
       $account->field_left[LANGUAGE_NONE][0]["value"] = 0;
       $account->status = 1;
       user_save($account);
        //audit
        global $user;
       $event = array('mod_author' => $user->uid, 'mod_timestamp' => time(), 'event' => 'user_unleave','uid_to_block' => $account_uid);
       $event = serialize($event);
       $last_event_serialized = rawurlencode($event);

       $last_event_unserialized["mod_timestamp"] = time();
       $last_event_unserialized["mod_author"] = $user->uid;

       //Insert inton audit
       $psid = gofast_og_get_user_private_space($account, FALSE) ?: 0;
       gofast_audit_insert_line_audit($psid, 'user_unleave', $last_event_serialized, $last_event_unserialized);

      //implement hook to allow custom module to add custom actions when a user is unleaved
      foreach(module_implements('gofast_user_unleave') as $module){
        call_user_func_array($module . '_gofast_user_unleave', array(&$account));
      }
    }
}

//return true id the user has left the platform, else return false
function gofast_user_is_left($account){
  if (is_numeric($account)) {
    return (bool) db_select("field_revision_field_left", "frfl")
      ->fields("frfl", array("field_left_value"))
      ->condition("field_left_value", 1)
      ->condition("entity_type", "user")
      ->condition("entity_id", $account)
      ->execute()
      ->fetchCol();
    }
    if($account->field_left[LANGUAGE_NONE][0]["value"] == 1){
        return true;
    }else{
        return false;
    }
}

function gofast_user_current_can_see_left_user(){
    global $user;

    if(gofast_user_is_adm($user) || gofast_user_is_business_admin($user)){
        return true;
    }
    return false;
}


function gofast_user_import_from_excel($filepath)
{
  $decoded_data = gofast_user_import_file_decode($filepath);

  if (count($decoded_data) > 0) {
    foreach ($decoded_data as $data_user) {
      //first, create the user
      $options = array();
      $options['mail'] = $data_user["mail"];
      $options['ldap_user_givenname'] = $data_user["firstname"];
      $options['ldap_user_sn'] = $data_user["lastname"];
      $options['ldap_user_sn'] = $data_user["lastname"];
      $options['ldap_user_title'] = $data_user["title"];

      gofast_user_create($data_user["login"], GOFAST_ROLE_CONTRIBUTOR, $options, TRUE);

      //then load the previously created user
      $my_user = user_load_by_name($data_user["login"]);

      //add this user into userlists and spaces
      if (count($data_user["userlists"]) > 0) {
        foreach ($data_user["userlists"] as $userlist) {
          //todo
        }
      }
      if (count($data_user["spaces"]) > 0) {
        foreach ($data_user["spaces"] as $nid) {
          $space_node = node_load($nid);
          $roles_query = og_roles('node', $space_node->type, $nid, FALSE, FALSE);
          foreach ($roles_query as $rkey => $roles) { //We get the role IDs associated to the space
            if ($roles == GOFAST_OG_ROLE_ADMIN) {
              $admin_rid = $rkey;
            }
            if ($roles == GOFAST_OG_ROLE_READ_ONLY) {
              $readonly_rid = $rkey;
            }
            if ($roles == GOFAST_OG_ROLE_STANDARD) {
              $contributor_rid = $rkey;
            }
          }

          //The user is subscribed without any role
          gofast_og_subscribe_user($nid, $my_user->uid);
          //We grant the user contributor role in the space
          og_role_grant('node', $nid, $my_user->uid, $contributor_rid);
        }
      }
    }
  }
}

function gofast_user_import_file_decode($filepath)
{
  set_time_limit(3000);

  /** PHPSpreadSheet */
  require_once libraries_get_path('phpspreadsheet').'/vendor/autoload.php';
  $file_path = file_stream_wrapper_get_instance_by_uri('public://')->realpath();
  $objPHPExcel = \PhpOffice\PhpSpreadsheet\IOFactory::load($filepath);
  $sheet = $objPHPExcel->getSheet(0);

  $data = array();


  //mapping between column number and information inside.
  //if the file structure change, just update this array
  $array_map_column_info = array();
  $array_map_column_info["login"] = 0;
  $array_map_column_info["lastname"] = 1;
  $array_map_column_info["firstname"] = 2;
  $array_map_column_info["mail"] = 3;
  $array_map_column_info["title"] = 4;
  $array_map_column_info["userlists"] = 5;
  $array_map_column_info["spaces"] = 6;
  $i = 0;
  $data_converted = array();
  foreach ($sheet->getRowIterator() as $key_row => $row) {
    if ($i == 0) {
      $i++;
      continue;
    }
    $spaces = array();
    $userlists = array();
    $login = "";
    $lastname = "";
    $firstname = "";
    $mail = "";
    $title = "";
    foreach ($row->getCellIterator() as $key_cell => $cell) {
      switch ($key_cell) {
        case $array_map_column_info["login"]:
          $login = $cell->getValue();
          break;
        case $array_map_column_info["lastname"]:
          $lastname = $cell->getValue();
          break;
        case $array_map_column_info["firstname"]:
          $firstname = $cell->getValue();
          break;
        case $array_map_column_info["mail"]:
          $mail = $cell->getValue();
          break;
        case $array_map_column_info["title"]:
          $title = $cell->getValue();
          break;
        case $array_map_column_info["userlists"]:
          $string_userlists = $cell->getValue();
          $userlists = explode(";", $string_userlists);
          break;
        case $array_map_column_info["spaces"]:
          $string_spaces = $cell->getValue();
          $spaces = explode(";", $string_spaces);
          break;
      }
    }


    $data_converted[$i]["login"] = $login;
    $data_converted[$i]["lastname"] = $lastname;
    $data_converted[$i]["firstname"] = $firstname;
    $data_converted[$i]["mail"] = $mail;
    $data_converted[$i]["title"] = $title;
    $data_converted[$i]["userlists"] = $userlists;
    $data_converted[$i]["spaces"] = $spaces;

    $i++;
  }

  return $data_converted;
}

function gofast_get_permissions_key_value_map() {
  return array(
    "extranet" => t("External", array(), array('context' => 'gofast')),
    "broadcaster" =>  t("Broadcaster", array(), array('context' => 'gofast')),
    "comment_restricted" => t("Restricted comments", array(), array('context' => 'gofast')),
    "granted_confidential_access" => t("Confidential clearance", [], ['context' => 'gofast']),
  );
}

function gofast_get_profiles_key_value_map() {
  return array(
    "contributor" => t("Standard", array(), array('context' => 'gofast')),
    "administrator" =>  t(GOFAST_ROLE_SUPER_ADMIN_VALUE, array(), array('context' => 'gofast')),
    "business administrator" => t(GOFAST_ROLE_BUSINESS_ADMIN_VALUE, array(), array('context' => 'gofast')),
  );
}

/**
 * Retrieve all existing permissions and profiles, whether they are Drupal roles ( = GoFAST profiles) or Drupal fields ( = GoFAST OG global permissions)
 * If the profile permission is a Drupal role, it will be retrieved with a regexable rid : {rid}name
 * Values are used as keys and labels are used as values for better reusability in Drupal checkboxes form element
 * @return array [value => label]
 */
function gofast_get_global_permissions_and_profiles() {
  $permissions_and_profiles = array_flip(array_filter(gofast_user_roles(), function($value) {
      if ($value === "administrator"|| $value === "business administrator" || $value === "contributor") {
          return TRUE;
      }
      return FALSE;
  }));

  foreach($permissions_and_profiles as $option => $index) {
      $query = 'SELECT rid FROM {role} WHERE name = :option';
      $result = db_query($query, array('option' => $option));
      $rid = $result->fetchCol()[0];
      $option_with_rid = "{" . $rid . "}" . $option;
      unset($permissions_and_profiles[$option]);
      $permissions_and_profiles[$option_with_rid] = gofast_get_profiles_key_value_map()[$option];
  }

  $permissions_key_value_map = gofast_get_permissions_key_value_map();
  $permissions_and_profiles["extranet"] = $permissions_key_value_map["extranet"];
  $permissions_and_profiles["broadcaster"] = $permissions_key_value_map["broadcaster"];
  $permissions_and_profiles["comment_restricted"] = $permissions_key_value_map["comment_restricted"];
  $permissions_and_profiles["granted_confidential_access"] = $permissions_key_value_map['granted_confidential_access'];
  return $permissions_and_profiles;
}

/**
 * @param $account is a Drupal user entity
 * @param $options is an array of permissions and profiles formatted as the keys returned by gofast_get_global_permissions_and_profiles
 * @param $add is the operation to perform: TRUE for add and FALSE for remove
*/
function gofast_change_user_global_permissions_and_profiles($account, $options, $add = TRUE) {
  $setter_options = ['op' => $add ? 'add' : 'remove'];
  $errors = [];
  foreach ($options as $option) {
      // global permissions are found in the form of "{rid}role name"
      if (preg_match("/\{(\d+)\}((?:\w+\h*)+)/", $option, $matches)) {
          $rid = $matches[1];
          user_multiple_role_edit([$account->uid], $add ? "add_role" : "remove_role", $rid);
          // Update roles on account so the wrapper save on other options does not overwrite the role updates
          $role_array = [$rid => /* role name */ $matches[2]];
          if ($add) {
            $account->roles += $role_array;
          } else {
            $account->roles = array_diff($account->roles, $role_array);
          }
          continue;
      }
      $reverse = FALSE;
      if ($option == "internal") {
        $option = "extranet";
        $reverse = TRUE;
      }

      // Try to delegate setting and possibly saving the user to a custom callback.
      // The callback is called if found and should return an array of errors.
      // The callback should not update and save the user if it returns errors.
      $setter = 'gofast_user_try_set_' . $option;
      if (function_exists($setter)) {
        $result = $setter($account, $setter_options);
        if (!empty($result)) {
          $errors = array_merge($errors, $result);
        }
        continue;
      }

      // if it's not a Drupal role but a field, we take advantage of the consistency regarding the fields naming and related functions
      $field = "is_" . $option;
      $function = "gofast_user_" . $field;
      $already_is = call_user_func_array($function, [$account]);
      // for fields that don't exist as such but are just boolean opposites of other fields
      if ($reverse) {
        $already_is = !$already_is;
      }
      // field is_comment_restricted is the only one prefixed with "field_" in the database schema
      if ($field == "is_comment_restricted") {
        $field = "field_" . $field;
      }
      if ($add && !$already_is) {
        $account->{$field}[LANGUAGE_NONE][0]["value"] = 1;
      } elseif (!$add && $already_is) {
        $account->{$field}[LANGUAGE_NONE][0]["value"] = 0;
      }
      // we use a wrapper save instead of an entity save to avoid potential deadlocks SQL errors
      $wrapper = entity_metadata_wrapper('user', $account);
      $wrapper->{$field}->set($account->{$field}[LANGUAGE_NONE][0]["value"]);
      $wrapper->save();
  }

  return $errors;
}

/**
 * Read counterpart of gofast_change_user_global_permissions_and_profiles():
 * which of the options a user currently holds.
 *
 * @param $account is a Drupal user entity
 * @return array of option keys, formatted as the keys returned by gofast_user_get_and_order_profile_options
 */
function gofast_user_get_global_permissions_and_profiles($account) {
  $held = array();
  foreach (array_keys(gofast_user_get_and_order_profile_options()) as $option) {
    if (preg_match("/^\{\d+\}((?:\w+\h*)+)/", $option, $matches)) {
      $granted = gofast_user_has_role(trim($matches[1]), $account);
    }
    elseif ($option === "internal") {
      // Synthetic option, the strict opposite of "extranet".
      $granted = !gofast_user_is_extranet($account);
    }
    else {
      $granted = call_user_func("gofast_user_is_" . $option, $account);
    }
    if ($granted) {
      $held[] = $option;
    }
  }

  return $held;
}

function gofast_user_get_and_order_profile_options() {
  $options = gofast_get_global_permissions_and_profiles();
  $roles_variables = ["admin_role", "standard_role", "business_admin_role", "extranet_profile"];
  foreach ($roles_variables as $role_variable) {
    $$role_variable = array_splice($options, 0, 1);
  }
  $fake_internal_profile = array("internal" => t("Internal", array(), array('context' => 'gofast')));
  $options = $standard_role + $business_admin_role + $admin_role + $extranet_profile + $fake_internal_profile + $options;
  return $options;
}

function gofast_user_get_active_users_count($type="all"){
  // get all active users
  if ($type == "all"){
    $query = db_select("users", "u");
    $query->condition("status", 1);
  // get all active and internal users
  }elseif ($type == "internal"){
    $query = db_select("users", "u");
    $query->join("field_data_is_extranet", "f", "u.uid = f.entity_id");
    $query->condition("u.status", 1, "=");
    $query->condition("f.is_extranet_value", 0, "=");
  // get all active and extranet users
  }elseif ($type == "extranet"){
    $query = db_select("users", "u");
    $query->join("field_data_is_extranet", "f", "u.uid = f.entity_id");
    $query->condition("u.status", 1, "=");
    $query->condition("f.is_extranet_value", 1, "=");
  }else{ 
    return FALSE;
  }
  $query->condition("u.uid", 1, "<>"); // ensure we do not take 'admin' user
  $count = $query->countQuery()->execute()->fetchField();
  return $count;
}

function gofast_user_standby_notify(){
  if(gofast_user_get_standby_number() == 0){
    return;
  }

  //get all standby uid
  $users = db_query(" select entity_id from field_revision_field_standby where field_standby_value = 1")->fetchAll();
  $recipients =  db_query("select uid from users where status = 1")->fetchAll();

  $users_standby = array();
  foreach($users as $user){
    $users_standby[] = user_load($user->entity_id);
  }

  $recipients = gofast_user_load_multiple_by_roles(GOFAST_ROLE_BUSINESS_ADMIN, 'name', true);
  
  foreach($recipients as $recipient){
    $account = $recipient;
    if(gofast_user_is_business_admin($account, $account->uid) == 1){
      $l = array('langcode' =>  $account->language, 'context' => 'gofast');
      $subject = t("Standby Users", array(), $l);
      $title = t('Standby users notification', array(), $l);
      $sub_title = t('The following users are in standby', array(), $l);
      $footer = t('Message sent from ', array(), $l) . " " . variable_get('site_name');
      $body = theme('gofast-notifications-user-standby', array(
        'recpt' => $account,
        'user_name' => $account->name,
        'users' => $users_standby,
        'l' => $l,
        'sub_title' => $sub_title,
        'user_link_base' => $GLOBALS['base_url'] . "/user/",
      ));
      $mail = array(
        'body' => $body,
        'title' => $title,
        'subject' => $subject,
        'footer' => $footer
      );

      $recpt = ["recpt" => $account->mail, "method" => 'to'];
      gofast_mail_queue_api_queue_ext($mail,[$recpt] , time());
    }
  }
}

function gofast_user_get_standby_number(){
  $number_standby = db_query(" select count(*) as count from field_revision_field_standby where field_standby_value = 1")->fetchAssoc();
  return $number_standby["count"];
}

function gofast_user_get_gofast_token_count(){
  $query = db_select("gofast_token", "gft");
  $count = $query->countQuery()->execute()->fetchField();
  return $count;
}

/**
 * Load an active user given its email.
 *
 * @param string $email The email address of the user to load.
 * @return array{user:?object,users_with_email_exist:bool}
 *  An array containing the user (or null if no user matches the conditions) and
 *  whether any user (active or not) has the given email.
 */
function gofast_user_load_active_user_by_email($email) {
  // We make sure to load every user with the given email to check if at
  // least one is activated.
  $users_with_email = user_load_multiple([], ['mail' => $email]);
  if (empty($users_with_email)) {
    return [
      'user' => NULL,
      'users_with_email_exist' => FALSE,
    ];
  }

  // keep only active users
  $active_users_with_email = array_filter($users_with_email, fn($u) => !gofast_user_is_left($u));
  if (empty($active_users_with_email)) {
    return [
      'user' => NULL,
      'users_with_email_exist' => TRUE,
    ];
  }

  // return first (and hopefully only) active user
  return [
    'user' => reset($active_users_with_email),
    'users_with_email_exist' => TRUE,
  ];
}

function gofast_user_reporting_get_counts(){
  $domain = '%@ceo-vision.com';

  $query = db_select('users', 'u');
  $query->distinct();
  $query->fields('u', ['uid']);
  $query->leftJoin('field_data_is_extranet', 'e', 'e.entity_id = u.uid');
  $query->leftJoin('field_data_field_left', 'l', 'l.entity_id = u.uid');
  $query->condition('u.uid', [0, 1], 'NOT IN');
  $query->condition('l.field_left_value', 0, '=');
  
  $or = db_or();
  $or->condition('e.is_extranet_value', 0);
  $or->isNull('e.is_extranet_value');
  $query->condition($or);
  
  $query->condition('u.mail', $domain, 'NOT LIKE');
  
  $active_users_count = count($query->execute()->fetchAllAssoc('uid'));
  
  
  $query = db_select('users', 'u');
  $query->distinct();
  $query->fields('u', ['uid']);
  $query->leftJoin('field_data_is_extranet', 'e', 'e.entity_id = u.uid');
  $query->leftJoin('field_data_field_left', 'l', 'l.entity_id = u.uid');
  $query->condition('u.uid', [0, 1], 'NOT IN');
  $query->condition('e.is_extranet_value', 1);
  $query->condition('u.mail', $domain, 'NOT LIKE');
  $query->condition('l.field_left_value', 0, '=');
  
  $active_users_count_extranet = count($query->execute()->fetchAllAssoc('uid'));
  
  
  $query = db_select('users', 'u');
  $query->distinct();
  $query->fields('u', ['uid']);
  $query->leftJoin('field_data_is_extranet', 'e', 'e.entity_id = u.uid');
  $query->leftJoin('field_data_field_left', 'l', 'l.entity_id = u.uid');
  $query->condition('u.uid', [0, 1], 'NOT IN');
  $query->condition('l.field_left_value', 1, '=');
  
  $or = db_or();
  $or->condition('e.is_extranet_value', 0);
  $or->isNull('e.is_extranet_value');
  $query->condition($or);
  
  $query->condition('u.mail', $domain, 'NOT LIKE');
  
  $inactive_users_count = count($query->execute()->fetchAllAssoc('uid'));
  
  
  $query = db_select('users', 'u');
  $query->distinct();
  $query->fields('u', ['uid']);
  $query->leftJoin('field_data_is_extranet', 'e', 'e.entity_id = u.uid');
  $query->leftJoin('field_data_field_left', 'l', 'l.entity_id = u.uid');
  $query->condition('u.uid', [0, 1], 'NOT IN');
  $query->condition('l.field_left_value', 0, '=');

  $query->condition('e.is_extranet_value', 1);
  $query->condition('u.mail', $domain, 'NOT LIKE');
  
  $inactive_users_count_extranet = count($query->execute()->fetchAllAssoc('uid'));
  
  return array('active_users_count' => $active_users_count,
                'active_users_count_extranet' => $active_users_count_extranet,
                'inactive_users_count' => $inactive_users_count,
                'inactive_users_count_extranet' => $inactive_users_count_extranet);
}

function gofast_user_reporting_get_last_stored_data(){
  $last_line= db_query("select * from {gofast_users_reporting} order by id desc limit 0,1")->fetch();
  
  return array('active_users_count' => $last_line->count_internal_actives,
                'active_users_count_extranet' => $last_line->count_external_actives,
                'inactive_users_count' => $last_line->count_internal_inactives,
                'inactive_users_count_extranet' => $last_line->count_external_inactives,
                'timestamp' => $last_line->timestamp
        );
}

function gofast_user_reporting_get_stored_data_history(){
  $history= db_query("select * from {gofast_users_reporting} order by id")->fetchAll();

 return $history;
}

function gofast_user_reporting_get_stored_data_history_formated(){
  $all_data = gofast_user_reporting_get_stored_data_history();
  $html_data =  theme('gofast_user_reporting_infos_table', ["all_data" => $all_data]);

  return $html_data;
 
}

function gofast_user_reporting_get_subscription_end_date(){
  $license_info = gofast_get_licence_infos();
  if($license_info === null){
      return false;
  }
  
  // file is corrupted
  if($license_info === false){
    $add_message = true;
    $warning_message = t("The Gofast license file is corrupted. Please contact your administrator", array(), array('context' => 'gofast'));
    $all_messages = drupal_get_messages("warning", false);
    if(count((array) $all_messages["warning"]) > 0){
        foreach($all_messages["warning"] as $message){
            if($warning_message == $message){
                $add_message = false;
            }
        }
    }
    if($add_message){
      drupal_set_message($warning_message, 'warning');
    }
    return false;
  }

  $targetDate = DateTime::createFromFormat('d/m/Y', $license_info->expiration_date ); 
  
  return $targetDate;
}

/**
 * Checks whether the given user (or current) can grant another access to confidential spaces.
 *
 * NOTE: This function has different semantics than `gofast_user_can_user_access_confidential_content`
 * despite currently having the same implementation, do not mix them up.
 *
 * @param object|null $account Account to check permission for. If not given, defaults to current user.
 * @return bool True if the user can grant confidential access, false otherwise.
 */
function gofast_user_can_user_grant_confidential_access($account = NULL) {
  if (!isset($account)) {
    $account = $GLOBALS['user'];
  }

  // Anonymous user can never grant confidential access.
  if ($account->uid === 0) {
    return FALSE;
  }

  // Allow admin to manage clearances.
  if ($account->uid == 1) {
    return TRUE;
  }

  // GOFAST-14769: granting also requires editing profiles, like the other
  // permission flags; a cleared standard user must not change their own.
  return user_access('administer roles', $account)
    && gofast_user_can_user_access_confidential_content($account);
}

/**
 * Checks if a user can access confidential content
 *
 * @param object|numeric|EntityDrupalWrapper|null $account The user to check
 *  confidential access permission for, defaults to the current user. Allows
 *  passing either the user's id, object (including global $user) or wrapper.
 * @return bool True if the user can access confidential content, false otherwise
 */
function gofast_user_can_user_access_confidential_content($account = NULL) {
  if (!isset($account)) {
    $account = $GLOBALS['user'];
  }

  /** @var EntityDrupalWrapper */
  $account_wrapper = entity_metadata_wrapper('user', $account);

  // Anonymous user can never access confidential content.
  if ($account_wrapper->getIdentifier() === 0) {
    return FALSE;
  }

  return (bool) $account_wrapper->{GOFAST_USER_HAS_CONFIDENTIAL_ACCESS_FIELD}->value();
}

/**
 * Checks if a user can set or unset content (spaces) as confidential
 *
 * NOTE: This function has different semantics than `gofast_user_can_user_grant_confidential_access`
 * despite currently having the same implementation, do not mix them up.
 *
 * @param object|numeric|EntityDrupalWrapper|null $account The user to check
 *  confidential access update permission for. Defaults to the current user.
 * @return bool True if the user can change content confidentiality, false otherwise
 */
function gofast_user_can_user_change_content_confidentiality($account = NULL) {
  if (!isset($account)) {
    $account = $GLOBALS['user'];
  }

  /** @var EntityDrupalWrapper */
  $account = entity_metadata_wrapper('user', $account);

  // Anonymous user can never change content confidentiality.
  if ($account->getIdentifier() === 0) {
    return FALSE;
  }

  // For now, users with access to confidential spaces (i.e: have confidential
  // clearance) can make spaces confidential.
  return gofast_user_can_user_access_confidential_content($account);
}

/**
 * Checks permission for having confidential access.
 *
 * Called from `gofast_user_preprocess_user_profile`.
 *
 * Alias of `gofast_user_can_user_access_confidential_content`.
 *
 * @param object|null $account Account to check. Defaults to current user.
 * @return bool True if user was granted confidential access.
 */
function gofast_user_is_granted_confidential_access($account = NULL) {
  return gofast_user_can_user_access_confidential_content($account);
}

/**
 * Checks if a user is in any confidential space.
 *
 * @param object|numeric|EntityDrupalWrapper|null $account Loaded user object,
 *  id, or wrapper defaults to current user.
 * @return bool True if the user is in a confidential space, false otherwise.
 */
function gofast_user_is_user_in_confidential_spaces($account = NULL) {
  if (!isset($account)) {
    $account = $GLOBALS['user'];
  }

  /** @var EntityDrupalWrapper */
  $account_w = entity_metadata_wrapper('user', $account);

  // Get spaces the user is a member of.
  $user_spaces = gofast_og_get_spaces_by_user(
    $account_w->value(),
    // Public space cannot be confidential
    FALSE,
    // Full (load)?
    FALSE,
    // Not from API
    FALSE,
    // Confidential spaces do not accept user lists currently, ergo a user
    // cannot be in a confidential space because of a userlist, we do not need
    // to check them for confidentiality as of now.
    FALSE,
  );

  // Is any space the user is in confidential?
  return gofast_iterable_any($user_spaces, fn($space) => gofast_group_is_confidential($space));
}

/**
 * Tries to set the confidential access/clearance permission for a user.
 *
 * @param object|numeric|EntityDrupalWrapper $account User for which to set the confidential clearance.
 * @param array{op:'add'|'remove'} $options
 * @return array{code:string,message:string}[] Array of errors preventing the setting of confidential access on the given user.
 */
function gofast_user_try_set_granted_confidential_access($account, $options) {
  /** @var EntityDrupalWrapper */
  $account_w = entity_metadata_wrapper('user', $account);
  $errors = [];

  // Common validations:
  // Is current user is allowed to update this field?
  if (!gofast_user_can_user_grant_confidential_access()) {
    $errors[] = [
      'code' => 'unauthorized',
      'message' => t(
        'You cannot grant or revoke users confidential clearance.',
        [],
        ['context' => 'gofast'],
      ),
    ];
    return $errors;
  }

  switch ($options['op']) {
    // ----- Add clearance if not already present. -----
    case 'add':
      // Already has clearance? Nothing to do.
      if (gofast_user_can_user_access_confidential_content($account_w)) {
        break;
      }

      $account_w->{GOFAST_USER_HAS_CONFIDENTIAL_ACCESS_FIELD}->set(TRUE);
      break;

    // ----- Remove clearance if not already lacking. -----
    case 'remove':
      // Already lacks clearance? Nothing to do.
      if (!gofast_user_can_user_access_confidential_content($account_w)) {
        break;
      }

      // User is in confidential spaces: cannot remove their clearance because
      // of the risk of setting the platform in an invalid state.
      if (gofast_user_is_user_in_confidential_spaces($account_w)) {
        $errors[] = [
          'code' => 'confidential_space_member',
          'message' => t(
            "You cannot remove a user's confidential clearance if they are a member of a confidential space",
            [],
            ['context' => 'gofast'],
          ),
        ];
        break;
      }

      $account_w->{GOFAST_USER_HAS_CONFIDENTIAL_ACCESS_FIELD}->set(FALSE);
      break;

    default:
      // Unknown operation.
      throw new \Exception(strtr(
        'This operation (@op) is not implemented in @function',
        [
          '@op' => var_export($options['op'], TRUE),
          '@function' => __FUNCTION__,
        ],
      ));
      break;
  }

  // No errors occurred, the wrapper may have been updated and needs to be saved.
  if (empty($errors)) {
    $account_w->save();
  }

  return $errors;
}

/**
 * Check if SASL delegation is active for a user account.
 *
 * @param object $account Loaded user object to check if the SASL delegation is
 *  active or not.
 * @return bool True if SASL delegation is active for the account, false otherwise
 */
function gofast_user_is_sasl_auth_active($account) {
  return isset($account->sasl_auth[LANGUAGE_NONE][0]['value']) && boolval($account->sasl_auth[LANGUAGE_NONE][0]['value']);
}
