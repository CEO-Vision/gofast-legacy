<?php

define('GOFAST_LDAP_MAX_SYNC_PER_CRON', 50);

/*
 * This function will synchronize the Drupal user database with the configured
 * remote directory
 * @param $remote_accounts : The result of an admin search query on the distant
 *                           directory.
 */
function gofast_ldap_sync_directory($remote_accounts){
  //Firstly, compare current database against remote directory to block/unblock accounts
  gofast_ldap_sync_block_accounts($remote_accounts);
  
  //Then, synchronize the accounts
  gofast_ldap_synchronize_accounts($remote_accounts);
}

/*
 * This function will block the Drupal users that are NOT in the remote directory
 * @param $remote_accounts : The result of an admin search query on the distant
 *                           directory.
 */
function gofast_ldap_sync_block_accounts($remote_accounts){
  $sync_settings = variable_get('gofast_directory_sync_config', array());
  //Key remote accounts by username
  foreach($remote_accounts as $k => $account){
    $remote_account_uname = strtolower($account[$sync_settings['mapping']['uid']][0]);
    $remote_account_by_uname[$remote_account_uname] = $account;
  }

  $users = db_query("select name, status, uid, sasl_auth_value from users INNER JOIN field_data_sasl_auth ON uid=entity_id")->fetchAllAssoc('uid');
  
  foreach($users as $k => $rquery){
    $status = $rquery->status;
    $uid = $rquery->uid;
    $name = strtolower($rquery->name);
    $sasl = $rquery->sasl_auth_value;
    
    if($uid == 0 || $uid == 1){
      continue;
    }
    
    if(empty($remote_account_by_uname[$name]) && $status == 1 && $sasl == 1){
      //Log
      watchdog('Directory Synchronization', "Blocking user " . $uid . "/" . $name, array(), WATCHDOG_INFO);
     
      //Block the user
      try{
        gofast_user_leave_user($uid);
      }catch (Throwable $t){
        watchdog('Directory Synchronization', "Error Blocking user ".json_encode($t), array(), WATCHDOG_INFO);
      }
    }else if(!empty($remote_account_by_uname[$name]) && $status == 0 && $sasl == 1){
      //Log
      watchdog('Directory Synchronization', "Unblocking user " . $uid . "/" . $name, array(), WATCHDOG_INFO);
      
      //unblock the user
      gofast_user_unleave_user($uid);
     
      // check if user is standby. If yes, unstanby it, to prevent having user enabled but standby
      $my_user = user_load($uid);
      if($my_user->field_standby[LANGUAGE_NONE][0]["value"] == 1){
        $edit = array('field_standby' => 0);
        user_save($my_user, $edit);
      }
    }
  }
}


/*
 * This function will synchronize the accounts retrieved from the distant Directory
 * if there is more than GOFAST_LDAP_MAX_SYNC_PER_CRON accounts, the synchronization
 * will occur in multiple crons
 */
function gofast_ldap_synchronize_accounts($remote_accounts){
  //Check if we have accounts to synchronize
  if(count($remote_accounts) == 0){
    variable_set('gofast_ldap_processing_sync', 0);
    cache_set("gofast_ldap_remote_accounts", [], "cache_gofast_ldap_sync", CACHE_PERMANENT);
    return;
  }
  
  $count = 0;
  $sync_settings = variable_get('gofast_directory_sync_config', array());
  $mapping = $sync_settings['mapping'];
  unset($remote_accounts['count']);
  
  foreach($remote_accounts as $k => $account){
    $success = _gofast_ldap_try_synchronize_single_account($account, $mapping);

    unset($remote_accounts[$k]);
    if (!$success) {
      continue;
    }
    
    if($count == GOFAST_LDAP_MAX_SYNC_PER_CRON){
      break;
    }
    $count++;
  }
  
  if(count($remote_accounts)){
    watchdog('Directory Synchronization', "Breaking synchronisation for this cron, " . count($remote_accounts) . " remaining.", array(), WATCHDOG_INFO);
    cache_set("gofast_ldap_remote_accounts", $remote_accounts, "cache_gofast_ldap_sync", CACHE_PERMANENT);
  }else{
      //All accounts have been synchronized, end of synchronization
    watchdog('Directory Synchronization', "All accounts have been synchronized", array(), WATCHDOG_INFO);
    variable_set('gofast_ldap_processing_sync', 0);
    cache_set("gofast_ldap_remote_accounts", [], "cache_gofast_ldap_sync", CACHE_PERMANENT);
  }
  
  return;
}

/**
 * Internal function to attempt to synchronize a single LDAP account.
 *
 * Under normal circumstances, this function must return and not throw or let
 * handled error bubble up the stack.
 *
 * Meant to be used as part of {@see gofast_ldap_synchronize_accounts()}.
 *
 * @param array $account
 *   LDAP account to try to synchronize.
 * @param array $mapping
 *   Account property mapping.
 *
 * @return bool
 *   Whether the synchronization was successful or not.
 */
function _gofast_ldap_try_synchronize_single_account($account, $mapping) {
  $uname = $account[$mapping['uid']][0];
  $umail = $account[$mapping['email']][0];
  if (empty($uname)) {
    return FALSE;
  }
  $user = user_load_by_name($uname);

  if ($user == FALSE) {
    $mail_exists = (bool) count(
      db_select('users')
        ->fields('users', array('uid'))
        ->condition('mail', $umail, '=')
        ->execute()
        ->fetchAll(),
    );
    if ($mail_exists) {
      watchdog('Directory Synchronization', "Can't create user @user because of duplicate email @umail", array("@user" => $uname, "@umail" => $umail), WATCHDOG_WARNING);
      return FALSE;
    }
    //We need to create the user as it's not registered yet
    watchdog('Directory Synchronization', "Creating user " . $uname, array(), WATCHDOG_NOTICE);
    gofast_ldap_synchronize_create_account($account);
  }
  else {
    //User is registered on the platform and we got it's informations from the
    //remote Directory, we can synchronize it.
    $mail_taken_by_other_user = (bool) count(
      db_select('users')
        ->fields('users', array('uid'))
        ->condition('mail', $umail, '=')
        ->condition('name', $uname, '<>')
        ->execute()
        ->fetchAll(),
    );
    if ($mail_taken_by_other_user) {
      watchdog('Directory Synchronization', "Can't update user @user because of duplicate email @umail", array("@user" => $uname, "@umail" => $umail), WATCHDOG_WARNING);
      return FALSE;
    }

    watchdog('Directory Synchronization', "Updating user " . $uname, array(), WATCHDOG_NOTICE);
    try {
      gofast_ldap_synchronize_update_account($account);
    }
    catch (Throwable $t) {
      watchdog('Directory Synchronization', "Error Updating user " . json_encode($t));
      return FALSE;
    }
  }

  return TRUE;
}

/*
 * This function will create an account retrieved from the distant directory
 */
function gofast_ldap_synchronize_create_account($account){
  $sasl = variable_get('gofast_sasl_auth', 0);
  $sync_settings = variable_get('gofast_directory_sync_config', array());
  //Prepare account fields
  $mapping = $sync_settings['mapping'];
  $uname = $account[$mapping['uid']][0];
  $fullname_field = $mapping['fullname'];
  $options = array();
  foreach($mapping as $field => $remote_field){
    if(empty($remote_field)){
      continue;
    }
    switch($field){
      case 'email':
        if(!empty($account[$remote_field][0])){
          $options['mail'] = $account[$remote_field][0];
        }
        break;
      case 'title':
        if(!empty($account[$remote_field][0])){
          $options['ldap_user_title'] = $account[$remote_field][0];
        }
        break;
      case 'company':
        if(!empty($account[$remote_field][0])){
          $entity_term = gofast_taxonomy_get_or_add_term(GOFAST_VID_ENTITY, $account[$remote_field][0]);
          $options['field_entity'] = $entity_term->tid;
        }
        break;
      case 'phone':
        if(!empty($account[$remote_field][0])){
          $options['ldap_user_telephonenumber'] = $account[$remote_field][0];
        }
        break;
      case 'mobile_phone':
        if(!empty($account[$remote_field][0])){
          $options['ldap_user_mobile'] = $account[$remote_field][0];
        }
        break;
    }
  }
  
  //Getting name
  if(!empty($mapping['fullname']) && !empty($account[$fullname_field][0])) {
    $name_exploded = explode(' ', $account[$fullname_field][0]);
    if(count($name_exploded) <= 1){
      $options['ldap_user_givenname'] = $name_exploded[0];
      $options['ldap_user_sn'] = $name_exploded[0];
    }else{
      $options['ldap_user_givenname'] = array_shift($name_exploded);
      $sn = implode(" ", $name_exploded);
      $options['ldap_user_sn'] = $sn;
    }
  }else if (!empty($account[$mapping['firstname']][0]) && !empty($account[$mapping['lastname']][0])){
    $options['ldap_user_givenname'] = $account[$mapping['firstname']][0];
    $options['ldap_user_sn'] = $account[$mapping['lastname']][0];
  }
  
  //Getting main organization
  $main_orga_field = $mapping['main_orga'];
  if(!empty($account[$main_orga_field][0])){
    $main_orga = $account[$main_orga_field][0];
    $nodes = node_load_multiple(NULL, array('title' => $main_orga, "type" => "organisation"));
    
    if(count($nodes) != 1){
      watchdog('Directory Synchronization', "Unable to attach the user to it's main organization because " . count($nodes) . " match were found for " . $main_orga, array(), WATCHDOG_ERROR);
    }else{
      $node = array_shift($nodes);
      $options['ldap_user_ou'] =  $node->nid;
    }
  }
  
  //Create the account
  $method =  t('Automatically through LDAP synchronization.', ['context' => 'gofast:gofast_user']);
  $creation = gofast_user_create($uname, GOFAST_ROLE_CONTRIBUTOR, $options, $sasl, $method);
  if(!$creation){
    watchdog('Directory Synchronization', "Unable to create the account : " . implode(', ', drupal_get_messages()['error']), array(), WATCHDOG_ERROR);
  }
}

/*
 * This function will update an account retrieved from the distant directory
 */
function gofast_ldap_synchronize_update_account($account){
  $sync_settings = variable_get('gofast_directory_sync_config', array());
  $uname = $account[$sync_settings['mapping']['uid']][0];
  $need_sync = false;
  $user = user_load_by_name($uname);
  
  if($user == false){
    watchdog('Directory Synchronization', "Unable to load the account " . $uname, array(), WATCHDOG_ERROR);
  }
  
  //Compare fields to update them if needed
  $mapping = $sync_settings['mapping'];
  $fullname_field = $mapping['fullname'];
  $firstname_field = $mapping['firstname'];
  $lastname_field = $mapping['lastname'];

  foreach($mapping as $field => $remote_field){
    if(empty($remote_field)){
      continue;
    }
    switch($field){
      case 'email':
        if(!empty($account[$remote_field][0])){
          if($user->mail != $account[$remote_field][0]){
            watchdog('Directory Synchronization', "Updating email", array(), WATCHDOG_NOTICE);
            $user->mail=$account[$remote_field][0];
            $need_sync = true;
          }
        }
        break;
      case 'title':
        if($user->ldap_user_title[LANGUAGE_NONE][0]['value'] != $account[$remote_field][0]){
          watchdog('Directory Synchronization', "Updating title", array(), WATCHDOG_NOTICE);
          $user->ldap_user_title[LANGUAGE_NONE][0]['value']=$account[$remote_field][0];
          $need_sync = true;
        }
        break;
      case 'company':
        $entity_term = gofast_taxonomy_get_or_add_term(GOFAST_VID_ENTITY, $account[$remote_field][0]);
        // Fill user's entity taxonomy ID if it doesn't match
        if($user->field_entity[LANGUAGE_NONE][0]['tid'] != $entity_term->tid){
          watchdog('Directory Synchronization', "Updating company", array(), WATCHDOG_NOTICE);
          $user->field_entity[LANGUAGE_NONE][0]['tid'] = $entity_term->tid;
          $need_sync = true;
        }
        break;
      case 'phone':
        if($user->ldap_user_telephonenumber[LANGUAGE_NONE][0]['value'] != $account[$remote_field][0]){
          watchdog('Directory Synchronization', "Updating telephone number", array(), WATCHDOG_NOTICE);
          $user->ldap_user_telephonenumber[LANGUAGE_NONE][0]['value']=$account[$remote_field][0];
          $need_sync = true;
        }
        break;
      case 'mobile_phone':
        if($user->ldap_user_mobile[LANGUAGE_NONE][0]['value'] != $account[$remote_field][0]){
          watchdog('Directory Synchronization', "Updating mobile phone number", array(), WATCHDOG_NOTICE);
          $user->ldap_user_mobile[LANGUAGE_NONE][0]['value']=$account[$remote_field][0];
          $need_sync = true;
        }
        break;
    }
  }
  
  //Getting name
 if(!empty($mapping['fullname']) && !empty($account[$fullname_field][0])) {
  $name_exploded = explode(' ', $account[$fullname_field][0]);
    if(count($name_exploded) <= 1){
      $ldap_user_givenname = $name_exploded[0];
      $ldap_user_sn = $name_exploded[0];
    }else{
      $ldap_user_givenname = array_shift($name_exploded);
      $sn = implode(" ", $name_exploded);
      $ldap_user_sn = $sn;
    }
  }else if (!empty($account[$firstname_field][0]) && !empty($account[$lastname_field][0])){
    $ldap_user_givenname = $account[$firstname_field][0];
    $ldap_user_sn = $account[$lastname_field][0];
  }

  if($user->ldap_user_givenname[LANGUAGE_NONE][0]['value'] != $ldap_user_givenname){
    watchdog('Directory Synchronization', "Updating first name", array(), WATCHDOG_NOTICE);
    $user->ldap_user_givenname[LANGUAGE_NONE][0]['value']=$ldap_user_givenname;
    $need_sync = true;
  }
  if($user->ldap_user_sn[LANGUAGE_NONE][0]['value'] != $ldap_user_sn){
    watchdog('Directory Synchronization', "Updating sir name", array(), WATCHDOG_NOTICE);
    $user->ldap_user_sn[LANGUAGE_NONE][0]['value']=$ldap_user_sn;
    $need_sync = true;
  }
  
  //Getting main organization
  $main_orga_field = $mapping['main_orga'];
  if(!empty($account[$main_orga_field][0])){
    $main_orga = $account[$main_orga_field][0];
    $nodes = node_load_multiple(NULL, array('title' => $main_orga, "type" => "organisation"));

    if(count($nodes) != 1){
      watchdog('Directory Synchronization', "Unable to attach the user to it's main organization because " . count($nodes) . " match were found for " . $main_orga, array(), WATCHDOG_ERROR);
    }else{
      $node = array_shift($nodes);
      if($user->ldap_user_ou[LANGUAGE_NONE][0]['value'] != "_#" . $node->nid){
        watchdog('Directory Synchronization', "Updating main organisation", array(), WATCHDOG_NOTICE);
        $user->ldap_user_ou[LANGUAGE_NONE][0]['value'] = "_#" . $node->nid;
        $need_sync = true;
      }
    }
  }
  
  if($need_sync){
    $updating = user_save($user);
    
    if($updating == FALSE){
      watchdog('Directory Synchronization', "Update of user " . $uname . "/" . $user->uid . " has failed", array(), WATCHDOG_ERROR);
    }else{
      watchdog('Directory Synchronization', "Successfull update of user " . $uname . "/" . $user->uid, array(), WATCHDOG_INFO);
    }
  }else{
    watchdog('Directory Synchronization', "No update needed for " . $uname . "/" . $user->uid, array(), WATCHDOG_INFO);
  }
}

/**
 * Get from the active directory the current password expiration for user with $uid.
 */
function gofast_ldap_ppolicy_get_password_expiration($uid, $format = true, $with_settings = false){
  $dn = gofast_ldap_user_dn($uid);

  module_load_include('inc', 'gofast_ldap', 'gofast_ldap.settings');
  $LdapServer = gofast_ldap_server_load(GOFAST_LDAP_INT_SERVER);

  $ppolicy_ldap_infos = gofast_ldap_get_ppolicy_infos_from_account($dn,$LdapServer);
  $timestamp_password_changed =  strtotime($ppolicy_ldap_infos["pwdChangedTime"]);

  $account = user_load($uid);
  $ldap_password_settings = gofast_ldap_get_user_password_policy_settings($account);

  $timestamp_password_expire = $timestamp_password_changed + $ldap_password_settings["max_password_lifetime"];

  if($format){
    return format_date($timestamp_password_expire, 'custom', "d/m/Y H:i");
  } else if ($with_settings) {
    return [$timestamp_password_expire, $ldap_password_settings];
  } else {
    return $timestamp_password_expire;
  }
}

/**
 * Retrieve all password expirations from LDAP.
 * @return array ["uid" => int, "expiration" => int]
 */
function gofast_ldap_get_all_password_expirations_from_ldap($LdapServer) {
  $ldap_password_settings = gofast_ldap_get_password_policy_settings();

  $base_dn = reset($LdapServer->basedn);
  $filter = "(objectClass=person)"; // match all people
  $attributes = ["pwdChangedTime"];
  $results = $LdapServer->search($base_dn, $filter, $attributes);

  $expirations = [];
  foreach ($results as $key => $result) {
    if (!is_numeric($key)) {
      continue; // skip pagination controls
    }
    if (!$result["pwdchangedtime"]) {
      continue;
    }

    $dn = $result["dn"];
    preg_match('/uid=([^,]+)/', $dn, $matches);
    $username = $matches[1];
    if (!$username) {
    continue;
    }

    $expiration = $result["pwdchangedtime"][0];
    if (!$expiration) {
      continue;
    }
    $expiration =  strtotime($expiration);
    $expiration = $expiration + $ldap_password_settings["max_password_lifetime"];

    $uid = gofast_user_get_uid_by_login($username);
    if (!$uid || $uid <= 1) {
      continue;
    }
    $expirations[] = ["uid" => $uid, "expiration" => $expiration];
  }

  return $expirations;
}
