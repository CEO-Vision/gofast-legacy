<?php

/**
 * Create a Matrix room and invite users.
 *
 * @param string $room_name             Name of the room.
 * @param array $invite_users           Array of user IDs to invite (internal UIDs).
 * @param bool $is_direct               Set TRUE for a direct (DM) room, FALSE otherwise.
 * @param string|null $access_token     If needed to use another token than chatroom.active's.
 *
 * @return array|null         API response as associative array, or NULL on failure.
 */
function gofast_riot_api_create_room($room_name, $invite_users = array(), $is_direct = FALSE, $access_token = NULL){

  global $conf;
  $users = array();
  foreach ($invite_users as $invite_user) {
    $uname = gofast_riot_get_matrix_username($invite_user);
    $users[] = $uname;
  }

  if (!$access_token) {
    $access_token = variable_get('riot_token_admin');
  }

  $param = array("name" => $room_name, 'invite' => $users, 'preset' => "private_chat", "is_direct" => $is_direct);
  $url = "https://" . 'internal-' . $conf['gofast-comm_domain'] . "/_matrix/client/api/v1/createRoom?access_token=" . $access_token;
  $data_string = json_encode($param);
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length:' . strlen($data_string))
  );
  $result = curl_exec($ch);
  return json_decode($result,TRUE);
}

function gofast_riot_api_send_message($user = NULL, $target_id = NULL, $message = NULL){

  global $conf;

  if(empty($user)){
    $user = "@chatroom.active:" . $conf['gofast-comm_domain'];
  }

  $target = user_load($target_id, TRUE);

  if(empty($message)){
    $display_name = $target->ldap_user_displayname[LANGUAGE_NONE][0]['value'];
    $message = t('@user send test', array('@user' => $display_name));
  }

  // Get room id beetween chatroom active and the user mentionned
  $room_id = str_replace(":" . $conf['gofast-comm_domain'], '', gofast_riot_get_chatroom_id($target_id));

  gofast_riot_api_send_message_call($room_id, $message);
}

/**
 * Sends a text (optionally HTML) message to a Matrix room.
 *
 * @param string $room_id          Matrix room ID (without domain appended).
 * @param string $message          Message to send (plain text or HTML).
 * @param string|null $access_token  Matrix access token of the sender user.
 *
 * @return string  JSON response from the Matrix API.
 */
function gofast_riot_api_send_message_call($room_id, $message, $access_token = NULL) {
  global $conf;

  if (!$access_token) {
    $access_token = variable_get('riot_token_admin');
  }
  if (!str_ends_with($room_id, ":" . $conf['gofast-comm_domain'])) {
    $room_id .= ":" . $conf['gofast-comm_domain'];
  }
  // Generate unique id for the message
  $message_id = uniqid('m.', true);
  // Call matrix API to send message : use org.matrix.custom.xml for send html message (here with a link)
  $param = array('msgtype' => "m.text", "format" => "org.matrix.custom.html", "body" => $message, "formatted_body" => $message);
  $path = '/_matrix/client/r0/rooms/' . urlencode($room_id) . '/send/m.room.message/' . $message_id ;
  $query = '?access_token=' . $access_token;
  $url = 'https://' . 'internal-' . $conf['gofast-comm_domain'] . $path . $query;

  $data_string = json_encode($param);
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length:' . strlen($data_string))
  );
  $res = curl_exec($ch);
  return json_encode($res);
}

function gofast_riot_api_check_members($room_id){
  global $conf;
  $room_id = urlencode($room_id);
  $path = "/_matrix/client/r0/rooms/{$room_id}/members";


  $query = http_build_query([
    'access_token' => variable_get('riot_token_admin'),
//    'membership' => 'join,invite'
  ]);

  $url = 'https://' . 'internal-' . $conf['gofast-comm_domain'] . $path . '?' . $query;

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
      'Content-Type: application/json'
  ));

  $result = curl_exec($ch);
  $result = json_decode($result, TRUE);

  return $result;
}


function gofast_riot_api_change_room_avatar($room_id, $img_url){

  global $conf;

  $param = array('url' => $img_url);
  $path = '/_matrix/client/r0/rooms/' . urlencode($room_id) . '/state/m.room.avatar';
  $query = '?access_token=' . variable_get('riot_token_admin');
  $url = 'https://' . 'internal-' . $conf['gofast-comm_domain'] . $path . $query;

  $data_string = json_encode($param);
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length:' . strlen($data_string))
  );
  $res = curl_exec($ch);

  return json_encode($res);
}

function gofast_riot_api_upload_file($img_url){
  global $conf;
  $filename = end(explode('/',$img_url));
  $content_type = gofast_get_mime_content_type($filename);
  
  $url = "https://" . 'internal-' . $conf['gofast-comm_domain'] . "/_matrix/media/v1/upload?filename=". urlencode($filename) . "&access_token=" . variable_get('riot_token_admin');
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
  curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents($img_url));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: ' . $content_type,
    'Content-Length:' . strlen(file_get_contents($img_url))
  ));
  $result = curl_exec($ch);
  return json_decode($result,TRUE);
}

/**
 * Parse a base64-encoded authentication string and return the user UID if valid.
 *
 * @param string $authentication_string  Base64-encoded JSON with 'admin_password' and 'user_login'.
 *
 * @return int  User UID if authentication is valid, 0 otherwise.
 */
function gofast_riot_parse_authentication_string($authentication_string) {
  global $conf;
  $chat_json = base64_decode($authentication_string, TRUE);
  $data_json = json_decode($chat_json, TRUE);
  if (!is_array($data_json)) {
    return 0;
  }
  $user_login = $data_json['user_login'] ?? NULL;
  if (!is_string($user_login) || $user_login === '') {
    return 0;
  }

  // Only a strict, constant-time match on a configured password grants impersonation
  $admin_password = $data_json['admin_password'] ?? NULL;
  $expected_password = (string) ($conf['admin_password'] ?? '');
  if ($expected_password === '' || !is_string($admin_password)) {
    return 0;
  }
  if (!hash_equals($expected_password, $admin_password)) {
    return 0;
  }

  // If request comes from Synapse
  if (str_starts_with($user_login, "@")) {
    $user_login = explode(":", substr($user_login, 1))[0];
  }
  return (int) gofast_user_get_uid_by_login($user_login);
}

/**
 * Retrieves the list of Direct Message (DM) rooms from the Matrix account data 
 * for a specific user.
 *
 * @param int $uid The user ID (uid) for which to retrieve the DM rooms list.
 * @return array|bool The decoded JSON response containing the 'm.direct' account data.
 *   Will return FALSE if no user token is provided.
 */
function gofast_riot_api_get_dm_rooms($uid) {
  $localpart = gofast_riot_get_matrix_username($uid);
  $access_token = gofast_riot_get_user_token($uid);
  if (!$access_token) {
    return FALSE;
  }
  global $conf;
  $dm_url =  "https://internal-" . $conf['gofast-comm_domain'] . "/_matrix/client/v3/user/" . urlencode($localpart) . "/account_data/m.direct?access_token=" . $access_token;
  $ch_dm = curl_init();
  curl_setopt($ch_dm, CURLOPT_URL, $dm_url);
  curl_setopt($ch_dm, CURLOPT_CUSTOMREQUEST, "GET");
  curl_setopt($ch_dm, CURLOPT_RETURNTRANSFER, TRUE);
  curl_setopt($ch_dm, CURLOPT_SSL_VERIFYHOST, FALSE);
  curl_setopt($ch_dm, CURLOPT_SSL_VERIFYPEER, FALSE);
  curl_setopt($ch_dm, CURLOPT_TIMEOUT, 5);
  $result_dm = curl_exec($ch_dm);
  if (curl_errno($ch_dm)) {
      watchdog("gofast_riot", "Error getting DM rooms for $uid:" . curl_error($ch_dm), WATCHDOG_ERROR);
      return FALSE;
  }
  $dms = json_decode($result_dm, TRUE);
  if (!is_array($dms) || !empty($dms["errcode"])) {
    return [];
  }
  return $dms;
}

/**
 * Invite a user to a Matrix room.
 *
 * @param string $room_id   The Matrix room ID.
 * @param string $user_id   The Matrix user ID to invite.
 * @param string|null $access_token  Matrix access token of the sender user.
 *
 * @return array|null       API response as associative array, or NULL on failure.
 */
function gofast_riot_api_invite_user($room_id, $user_id, $access_token = NULL) {
    global $conf;
    if (!$access_token) {
      $access_token = variable_get('riot_token_admin');
    }
    $path = '/_matrix/client/r0/rooms/' . urlencode($room_id) . '/invite';
    $query = '?access_token=' . $access_token;
    $url = 'https://' . 'internal-' . $conf['gofast-comm_domain'] . $path . $query;

    $param = array('user_id' => $user_id);
    $data_string = json_encode($param);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'Content-Length:' . strlen($data_string))
    );
    $result = curl_exec($ch);
    return json_decode($result, TRUE);
}
