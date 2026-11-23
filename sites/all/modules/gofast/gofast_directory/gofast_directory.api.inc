<?php

/*
 * Implements gofast_api_RESSOURCE_ACTION
 * @ressource directory
 * @action users
 * @methods GET
 */
function gofast_api_directory_users($params)
{
  switch ($params['method']) {
    case 'GET':
      gofast_api_get_directory_users($params);
      break;
    default:
      gofast_api_not_implemented("This method");
      break;
  }
}

function  gofast_api_get_directory_users($params){
  // Check authentication
  global $user;
  if ($user->uid == 0) {
      gofast_api_not_authorized("Unavailable ressource for anonymous user");
  }

  $pagination = array();
  if(isset($_GET['page']) && is_numeric($_GET['page'])){
      $pagination["page"] = $_GET['page'];
  }
  if(isset($_GET['perpage']) && is_numeric($_GET['perpage'])){
      $pagination["perpage"] = $_GET['perpage'];
  }
  
  if(isset($_GET['status']) && is_numeric($_GET['status'])){
      $filter['status'] = $_GET['status'];
  }else{
      $filter = null;
  }

  $users = gofast_getAllUsers($pagination, null, $filter);

  // remove some useless informations
  foreach($users["data"] as $directoryUser){
      $finalUser = array();
      $finalUser["uid"] = $directoryUser->uid;
      $finalUser["last_login"] = $directoryUser->login;
      $finalUser["username"] = $directoryUser->username;
      $finalUser["mail"] = $directoryUser->mail;
      $finalUser["status"] = $directoryUser->status["value"];
      $finalUser["firstname"] = $directoryUser->firstname;
      $finalUser["lastname"] = $directoryUser->lastname;
      $finalUser["created"] = $directoryUser->created;
      $finalUser["is_extranet"] = $directoryUser->is_extranet;
      
      $return["users"][] = $finalUser;
      
  }
  
  $return["meta"] = $users["meta"];

  gofast_api_success($return);

}
