<?php

/**
 * @file
 * GoFAST import execution backend functions and implementation.
 */

/**
 * Execute an array of import commands apply them.
 *
 * Execution back-end function.
 *
 * @param array{type:string}[] $commands
 * @param array{
 *  logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  output_logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  runner_uid: numeric,
 * } $options Execution options.
 * @return void Calls core gofast management functions to execute the given commands.
 */
function gofast_import__execute_import_commands($commands, $options) {
  $logger = $options['logger'] ?? 'watchdog';

  $context = [
    'cache' => [],
  ];

  usurp($options['runner_uid']);
  try {
    foreach ($commands as $command) {
      // Dispatch commands
      switch ($command['type']) {
        case GOFAST_IMPORT_COMMAND_TYPE_USER_CREATE:
          _gofast_import__execute_user_create($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_USER_SET_PROPERTIES:
          _gofast_import__execute_user_set_properties($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_CREATE:
          _gofast_import__execute_user_list_create($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_SET_PROPERTIES:
          _gofast_import__execute_user_list_set_properties($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER:
          _gofast_import__execute_user_list_add_member($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_REMOVE_MEMBER:
          _gofast_import__execute_user_list_remove_member($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_SPACE_CREATE:
          _gofast_import__execute_space_create($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_PROPERTIES:
          _gofast_import__execute_space_set_properties($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP:
          _gofast_import__execute_space_add_membership($command, $context);
          break;
        case GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_MEMBERSHIP_ROLE:
          _gofast_import__execute_space_set_membership_role($command, $context);
          break;
        default:
          // Unknown command: report error and stop (further commands might require
          // updates from command).
          $logger(
            'gofast_import',
            'Unknown command: @command',
            ['@command' => var_export($command, TRUE)],
            WATCHDOG_ERROR,
          );
          return;
      }
    }
  } finally {
    usurp();
  }
}

/**
 * Load a user object using the given uid from the import execution context, or
 * use the username if not set, and finally load the user with the provided uid.
 *
 * @param array $context The execution context array for the import.
 * @param string|null $uid The user id, may be null.
 * @param string $username The user's username, used as a fallback.
 * @return object The user account object.
 * @throws Exception When all attempts at loading the user failed.
 */
function _gofast_import__get_or_load_user_from_execution_context(&$context, $uid, $username) {
  if (!isset($uid)) {
    $uid = $context['cache']['users:uid_by_username'][$username];
  }

  $account = NULL;
  if ($uid) {
    $account = $context['cache']['users'][$uid];
  }
  if ($account === NULL) {
    $account = user_load_by_name($username);
    if ($account === FALSE) {
      throw new Exception(
        "User account could not be loaded during import.\n"
          . 'uid: ' . var_export($uid, TRUE) . ', username: '
          . var_export($username, TRUE),
      );
    }
    _gofast_import__update_user_context_with_account($context, $account);
  }

  return $account;
}

/**
 * Update or create entries in cache for a user account.
 *
 * @param array $context The execution context array for the import.
 * @param object $account User account object
 * @return void Updates the context cache with the account data.
 */
function _gofast_import__update_user_context_with_account(&$context, $account) {
  $context['cache']['users'][$account->uid] = $account;
  $context['cache']['users:uid_by_username'][$account->name] = $account->uid;
}

/**
 * Update or create entries in cache for a user list node.
 *
 * @param array $context The execution context array for the import.
 * @param object $account User account object
 * @return void Updates the context cache with the account data.
 */
function _gofast_import__update_user_list_context_with_node(&$context, $node) {
  $context['cache']['user_lists'][$node->nid] = $node;
  $context['cache']['user_lists:nid_by_name'][$node->title] = $node->nid;
}

/**
 * Load a user list node object using the given nid from the import execution
 * context, or use the list name if not set, and finally try to load the node with the
 * provided information.
 *
 * @param array $context The execution context array for the import.
 * @param string|null $nid The user list node id, may be null.
 * @param string $name The user list name, used as a fallback.
 * @return object The user list node object.
 * @throws Exception When all attempts at loading the user list failed.
 */
function _gofast_import__get_or_load_user_list_node_from_execution_context(&$context, $nid, $name) {
  // Try load from cache.
  if (!isset($nid)) {
    $nid = $context['cache']['user_lists:nid_by_name'][$name];
  }

  $node = NULL;
  if ($nid) {
    $node = $context['cache']['user_lists'][$nid];
  }

  // Node not in cache, try to load from DB
  if ($node === NULL) {
    if (!isset($nid)) {
      $nid = reset(gofast_import__find_userlist_nids_by_title($name));
    }
    $node = node_load($nid);
    if ($node === FALSE) {
      throw new Exception(
        "Could not load user list node during import.\n"
          . 'nid: ' . var_export($nid, TRUE)
          . ', name: ' . var_export($name, TRUE),
      );
    }

    _gofast_import__update_user_list_context_with_node($context, $node);
  }

  // Return loaded node.
  return $node;
}

/**
 * Update or create entries in cache for a space node.
 *
 * @param array $context The execution context array for the import.
 * @param object $account User account object
 * @return void Updates the context cache with the account data.
 */
function _gofast_import__update_space_context_with_node(&$context, $node, $path = NULL) {
  $context['cache']['spaces'][$node->nid] = $node;
  // try get path from cache if missing.
  if (!isset($path)) {
    $path = $context['cache']['spaces:path_by_nid'][$node->nid];
  }
  // Not in cache, update from DB (may be expensive).
  if (!isset($path)) {
    $path = gofast_cmis_space_get_webdav_path($node->nid);
  }
  $context['cache']['spaces:path_by_nid'][$node->nid] = $path;
  $context['cache']['spaces:nid_by_path'][$path] = $node->nid;
}

/**
 * Load a space node object using the given nid from the import execution
 * context, or use the space path if not set, and finally try to load the node with the
 * provided information.
 *
 * @param array $context The execution context array for the import.
 * @param string|null $nid The user list node id, may be null.
 * @param string $name The user list name, used as a fallback.
 * @return object The user list node object.
 * @throws Exception When all attempts at loading the user list failed.
 */
function _gofast_import__get_or_load_space_node_from_execution_context(&$context, $nid, $path) {
  // Try load from cache.
  if (!isset($nid)) {
    $nid = $context['cache']['spaces:nid_by_path'][$path];
  }

  $node = NULL;
  if ($nid) {
    $node = $context['cache']['spaces'][$nid];
  }

  // Node not in cache, try to load from DB.
  if ($node === NULL) {
    if (!isset($nid)) {
      $node = gofast_import__load_node_by_path($path);
    } else {
      $node = node_load($nid);
    }

    if (empty($node)) {
      throw new Exception(
        "Could not load space node during import.\n"
          . 'nid: ' . var_export($nid, TRUE)
          . ', path: ' . var_export($path, TRUE),
      );
    }

    _gofast_import__update_space_context_with_node($context, $node, $path);
  }

  // Return loaded node.
  return $node;
}

/**
 * Execute command to create user.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_CREATE,
 *  first_name: string,
 *  last_name: string,
 *  email: string,
 *  username: string,
 * } $command User creation command array
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_create($command, &$context) {
  // Create user.
  $account = gofast_user_user_create(
    $command['username'],
    $command['first_name'],
    $command['last_name'],
    '', // Empty password since user receives temporary session email.
    $command['email'],
    '', // no main organisation (?)
  );

  // Ensure password reset email is sent to user.
  $message = [
    'id' => 'user_register_admin_created',
    'params' => ['account' => $account],
  ];
  gofast_user_mail_alter($message);

  // Cache user information for later commands.
  _gofast_import__update_user_context_with_account($context, $account);
}

/**
 * Execute command to update user.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_SET_PROPERTIES,
 *  username: string,
 *  uid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command User property update command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_set_properties($command, &$context) {
  // Load user, try cache first, then load from uid on command, lastly use username.
  $username = $command['username'];
  $uid = $command['uid'];

  $account = _gofast_import__get_or_load_user_from_execution_context($context, $uid, $username);
  $uid = $account->uid;

  // Load property descriptors.
  $descriptors = gofast_import__get_user_property_descriptors();

  // Update properties on account.
  foreach ($command['properties'] as $update) {
    $property = $descriptors[$update['property']];
    $property['account']['set']($account, $update['value']);
  }

  // Save.
  $account = user_save($account);
  if ($account === FALSE) {
    watchdog(
      'gofast_import',
      'User update failed during import on user "@username" (@uid)',
      ['@username' => $username, '@uid' => $uid],
    );
    return;
  }
  // Keep cache up to date.
  _gofast_import__update_user_context_with_account($context, $account);
}

/**
 * Execute command to create user list.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_CREATE,
 *  name: string,
 *  description: string | NULL,
 * } $command User list creation command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_list_create($command, &$context) {
  // Create user list.
  $nid = gofast_userlist_create_userlist($command['name'], $command['description']);

  // Check for error(s).
  if (!is_numeric($nid)) {
    throw new Exception(
      "Error creating user list node during import.\n"
        . 'Command: ' . var_export($command, TRUE) . "\n"
        . 'Error value: ' . var_export($nid, TRUE),
    );
  }

  // Save new list to context cache for future commands.
  $user_list_node = node_load($nid);
  _gofast_import__update_user_list_context_with_node($context, $user_list_node);
}

/**
 * Execute command to update a user list.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_SET_PROPERTIES,
 *  name: string,
 *  nid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command User list property update command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_list_set_properties($command, &$context) {
  // Load user list node.
  $node = _gofast_import__get_or_load_user_list_node_from_execution_context(
    $context,
    $command['nid'],
    $command['name'],
  );

  // Update node.
  $descriptors = gofast_import__get_user_list_property_descriptors();

  foreach ($command['properties'] as $update) {
    $property = $descriptors[$update['property']];
    $property['node']['set']($node, $update['value']);
  }

  // Save.
  $node = node_save($node);
  if ($node === FALSE) {
    watchdog(
      'gofast_import',
      'User list update failed during import for user list "@name" (@nid)',
      [
        '@name' => $command['name'],
        '@nid' => $command['nid'],
      ],
    );
    return;
  }

  _gofast_import__update_user_list_context_with_node($context, $node);
}

/**
 * Execute a command to add a user list member.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER,
 *  userlist: string,
 *  username: string,
 *  role: string,
 * } $command User list member addition command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_list_add_member($command, &$context) {
  // Load resources.
  $node = _gofast_import__get_or_load_user_list_node_from_execution_context(
    $context,
    NULL,
    $command['userlist'],
  );

  $account = _gofast_import__get_or_load_user_from_execution_context(
    $context,
    NULL,
    $command['username'],
  );

  // Add member.
  switch ($command['role']) {
    case GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_MEMBER:
      gofast_userlist_add_members($node->nid, [$account->uid]);
      // Reset user list entity cache to not get half updated entities on next
      // command executions. For unknown reasons this isn't done automatically.
      entity_get_controller('userlist')->resetCache([
        $node->field_userlist_ulid[LANGUAGE_NONE][0]['value'],
      ]);
      break;
    case GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN:
      gofast_import__add_userlist_admin($node->nid, $account->uid);
      break;
    default:
      throw new Exception(
        'Adding user to user list in import failed due to unknown role. Command '
          . var_export($command, TRUE),
      );
  }
}

/**
 * Execute user list member removal command.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_REMOVE_MEMBER,
 *  userlist: string,
 *  username: string,
 *  role: string,
 * } $command User list member removal command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_user_list_remove_member($command, &$context) {
  // Load resources.
  $node = _gofast_import__get_or_load_user_list_node_from_execution_context(
    $context,
    NULL,
    $command['userlist'],
  );

  $account = _gofast_import__get_or_load_user_from_execution_context(
    $context,
    NULL,
    $command['username'],
  );

  // Remove member.
  switch ($command['role']) {
    case GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_MEMBER:
      gofast_import__remove_userlist_member($node->nid, $account->uid);
      // Reset user list entity cache to not get half updated entities on next
      // command executions. For unknown reasons this isn't done automatically.
      entity_get_controller('userlist')->resetCache([
        $node->field_userlist_ulid[LANGUAGE_NONE][0]['value'],
      ]);
      break;
    case GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN:
      gofast_import__remove_userlist_admin($node->nid, $account->uid);
      break;
    default:
      throw new Exception(
        'Removing user from user list in import failed due to unknown role. Command: '
          . var_export($command, TRUE),
      );
  }
}

/**
 * Execute a space creation command.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_CREATE,
 *  name: string,
 *  space_type: string,
 *  path: string,
 *  parent_path: string | NULL,
 *  description: string | NULL,
 * } $command Space creation command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_space_create($command, &$context) {
  // Load resources.
  $parent = _gofast_import__get_or_load_space_node_from_execution_context(
    $context,
    NULL,
    $command['parent_path'],
  );

  // Create space.
  // We assume parent is always defined, as root spaces should always exist and
  // we do not create private spaces.
  $options = [
    'author' => $GLOBALS['user'],
    'add_author_as_admin' => FALSE,
    'parent' => $parent->nid,
    ...(isset($command['description']) ? ['description' => $command['description']] : []),
  ];

  $space_bundle = gofast_import__convert_space_import_item_type_to_space_node_type(
    $command['space_type'],
  );
  $result = gofast_og_create(
    $command['name'],
    $space_bundle,
    $options,
  );

  if ($result !== TRUE) {
    throw new Exception(
      "Space node creation failed during import.\n"
        . ' - Command: ' . var_export($command, TRUE) . "\n"
        . ' - Errors:' . var_export($result, TRUE),
    );
  }

  // Using super global to get creation result is flaky. :/
  $node = node_load($_POST['new_space_nid']);
  _gofast_import__update_space_context_with_node($context, $node, $command['path']);
}

/**
 * Execute a space update command.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_PROPERTIES,
 *  space_path: string,
 *  nid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command Space property update command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_space_set_properties($command, &$context) {
  // Load resources.
  $node = _gofast_import__get_or_load_space_node_from_execution_context(
    $context,
    $command['nid'],
    $command['space_path'],
  );

  $descriptors = gofast_import__get_space_property_descriptors();

  // Update.
  foreach ($command['properties'] as $update) {
    $property = $descriptors[$update['property']];
    $property['node']['set']($node, $update['value']);
  }

  // Save.
  $node = node_save($node);
  if ($node === FALSE) {
    watchdog(
      'gofast_import',
      'Space update failed during import for space "@path" (@nid)',
      [
        '@path' => $command['space_path'],
        '@nid' => $command['nid'],
      ],
    );
    return;
  }

  _gofast_import__update_space_context_with_node($context, $node);
}

/**
 * Execute a space member addition command.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP,
 *  space_path: string,
 *  role: string,
 *  member: array{name: string, type: string},
 * } $command Space membership addition command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_space_add_membership($command, &$context) {
  // Load resources.
  $node = _gofast_import__get_or_load_space_node_from_execution_context(
    $context,
    NULL,
    $command['space_path'],
  );

  $space_role_name = gofast_import__convert_import_role_to_space_role_name($command['role']);
  $role_id = array_key_first(
    gofast_og_space_admin_get_node_role('node', $node->nid, $space_role_name),
  );

  [$entity_id, $add_membership] = match ($command['member']['type']) {
    GOFAST_IMPORT_MEMBER_TYPE_USER => [
      _gofast_import__get_or_load_user_from_execution_context(
        $context,
        NULL,
        $command['member']['name'],
      )->uid,
      fn($nid, $uid, $rid) => gofast_og_space_admin_add_membership($nid, $uid, $rid),
    ],

    GOFAST_IMPORT_MEMBER_TYPE_USERLIST => [
      _gofast_import__get_or_load_user_list_node_from_execution_context(
        $context,
        NULL,
        $command['member']['name'],
      )->field_userlist_ulid[LANGUAGE_NONE][0]['value'],
      fn($nid, $ulid, $rid) => gofast_userlist_og_add_membership($nid, $ulid, $rid),
    ]
  };

  // Add membership.
  $add_membership($node->nid, $entity_id, $role_id);
}

/**
 * Execute a space member role change command.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_MEMBERSHIP_ROLE,
 *  space_path: string,
 *  role: string,
 *  old_role: string,
 *  member: array{name: string, type: string},
 * } $command Space membership role update command array.
 * @param array $context Reference to the current execution context, used to
 *  access cache or set data needed by runtime.
 * @return void Executes command.
 */
function _gofast_import__execute_space_set_membership_role($command, &$context) {
  // Load resources.
  $node = _gofast_import__get_or_load_space_node_from_execution_context(
    $context,
    NULL,
    $command['space_path'],
  );

  $space_role_name = gofast_import__convert_import_role_to_space_role_name($command['role']);

  [$entity_id, $update_membership] = match ($command['member']['type']) {
    GOFAST_IMPORT_MEMBER_TYPE_USER => [
      _gofast_import__get_or_load_user_from_execution_context(
        $context,
        NULL,
        $command['member']['name'],
      )->uid,
      fn($nid, $uid, $role_name) => gofast_og_space_admin_update_membership($nid, $uid, $role_name),
    ],

    GOFAST_IMPORT_MEMBER_TYPE_USERLIST => [
      _gofast_import__get_or_load_user_list_node_from_execution_context(
        $context,
        NULL,
        $command['member']['name'],
      )->field_userlist_ulid[LANGUAGE_NONE][0]['value'],
      fn($nid, $ulid, $role_name) => gofast_userlist_og_update_membership($nid, $ulid, $role_name),
    ]
  };

  // Update membership.
  $update_membership($node->nid, $entity_id, $space_role_name);
}
