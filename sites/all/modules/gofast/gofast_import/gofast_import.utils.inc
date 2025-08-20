<?php

/**
 * @file
 * Utility functions for import module. Some may be generic enough to become
 * general utility functions in the future (ask if it may be moved).
 */

/**
 * Consume an iterator and group its items into an array of arrays by the keys
 * returned by the given callback.
 *
 * @template TKey Input iterable key type.
 * @template TValue Input iterable value type.
 * @template TGroupKey Output group keys of key callback
 * @param iterable<TKey,TValue> $iterable Iterable of items to group.
 * @param callable(TValue,TKey):TGroupKey $key_callback Callback that returns
 *  the given item's group key.
 * @param array<TGroupKey,TValue[]> $initial_value The initial value to use for
 *  the resulting grouped array. Can be useful to initialise an array with all
 *  group keys initialised to empty arrays for example.
 * @return array<TGroupKey,TValue[]> An array keyed by group keys containing
 *  sequential arrays of items of one group each.
 */
function gofast_import__iterable_group_by($iterable, $key_callback, $initial_value = []) {
  $result = $initial_value;
  foreach ($iterable as $key => $value) {
    $result[$key_callback($value, $key)][] = $value;
  }
  return $result;
}

/**
 * Loads a node using its path, may send requests to CMIS API.
 *
 * Set global $cmis_sudo_admin for the duration of the call, its value is reset
 * to the one before calling this function before it returns.
 *
 * @param string $path Node path.
 * @param bool $as_admin Whether to use the admin authentication for all parts
 *  of the loading.
 * @return object Loaded node.
 */
function gofast_import__load_node_by_path($path, $as_admin = TRUE) {
  // Normalise path to add /Sites if not present (allow import paths that omit
  // it)
  if (!str_starts_with("/Sites/", $path)) {
    $path = '/Sites' . $path;
  }
  // Force every cmis request to be done by admin, especially initial
  // getRepositoryInfo.
  // Call to gofast_cmis_item_get_by_path gets repository without using the
  // $asAdmin parameter and fails silently with non-existent anonymous user
  // ticket before setting sudo global for item request.
  global $cmis_sudo_admin;
  $cmis_sudo_previous = $cmis_sudo_admin;
  $cmis_sudo_admin = $as_admin;
  try {
    $cmis_item = gofast_cmis_item_get_by_path($path);
    return node_load($cmis_item->properties['gofast:nid']);
  } finally {
    $cmis_sudo_admin = $cmis_sudo_previous;
  }
}

/**
 * Queries entities for user lists with the given name/title and returns their
 * node ids.
 *
 * @param string $title Userlist title/name.
 * @return array<numeric,numeric> Array of node ids indexed by node ids. Returns
 *  an empty array when no user list was found.
 */
function gofast_import__find_userlist_nids_by_title($title) {
  $query_results = (new EntityFieldQuery())
    ->entityCondition('entity_type', 'node')
    ->entityCondition('bundle', 'userlist')
    ->propertyCondition('title', $title)
    ->propertyCondition('status', 1)
    ->execute();

  return array_map(fn($r) => $r->nid, $query_results['node'] ?? []);
}

/**
 * Splits space paths at '/' delimiter characters making sure not to create
 * empty segments with leading and trailing delimiters.
 *
 * @param string $path Space path.
 * @return string[] Path segments
 */
function gofast_import__split_space_path($path) {
  return explode('/', trim($path, '/'));
}

/**
 * Join path segments into an absolute path (path starting with /).
 *
 * @param string[] $segments Path segments
 * @return string The joined absolute path
 */
function gofast_import__join_absolute_path_segments($segments) {
  return '/' . implode('/', $segments);
}

/**
 * Get the mapping from space member role name to import role constant as an array.
 *
 * @return array<
 *  string,
 *  GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY
 * > Conversion array from space role name to import role constants. Safe to flip.
 */
function gofast_import__get_space_role_name_to_import_role_mapping() {
  static $mapping;
  if (!isset($mapping)) {
    $mapping = [
      GOFAST_OG_ROLE_ADMIN => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN,
      GOFAST_OG_ROLE_MANAGER => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER,
      GOFAST_OG_ROLE_STANDARD => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR,
      GOFAST_OG_ROLE_READ_ONLY => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY,
    ];
  }
  return $mapping;
}

/**
 * Converts from a space role name to an import role constant.
 *
 * @param string $role_name Space role name.
 * @return GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY Import role constant.
 */
function gofast_import__convert_space_role_name_to_import_role($role_name) {
  static $mapping;
  if (!isset($mapping)) {
    $mapping = gofast_import__get_space_role_name_to_import_role_mapping();
  }
  assert(array_key_exists($role_name, $mapping));
  return $mapping[$role_name];
}

/**
 * Converts from an import role constant to a space role name.
 *
 * @param GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR
 *  | GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY $role Import role constant.
 * @return string Space role name.
 */
function gofast_import__convert_import_role_to_space_role_name($role) {
  static $mapping;
  if (!isset($mapping)) {
    $mapping = array_flip(gofast_import__get_space_role_name_to_import_role_mapping());
  }
  assert(array_key_exists($role, $mapping));
  return $mapping[$role];
}

/**
 * Gets the number of digits an integer has when displayed with minimal formatting.
 *
 * @param int $number The integer from which to get the number of digits.
 * @param int $base The number base for the count of digits.
 * @return int The minimum number of digits the integer can be represented with.
 */
function gofast_import__get_integer_digit_count($number, $base = 10) {
  return $number === 0 ? 1 : (int) floor(log($number, $base) + 1);
}

/**
 * Create an array of user list role names to role ids with gofast OG roles for
 * the given node.
 *
 * @see `gofast_userlist_form_userlist_node_form_submit` extracted from there.
 *
 * @param numeric $node_id Node id.
 * @return array<string,numeric> Array of role names to role ids.
 */
function gofast_import__get_og_user_list_role_to_rid_mapping($node_id) {
  $roles = og_roles('node', 'userlist', $node_id, FALSE, FALSE);

  $roles = array_filter($roles, fn($r) => in_array($r, [
    GOFAST_OG_ROLE_ADMIN,
    GOFAST_OG_ROLE_STANDARD,
    GOFAST_OG_ROLE_READ_ONLY,
  ]));
  return array_flip($roles);
}

/**
 * Adds an admin member to a user list given both's ids.
 *
 * @see `gofast_userlist_form_userlist_node_form_submit` extracted from there.
 *
 * @param numeric $node_id Id of the user list to add the admin to.
 * @param numeric $user_id Id of the user to add as an admin of the user list.
 * @return void Modifies the OG roles and subscriptions.
 */
function gofast_import__add_userlist_admin($node_id, $user_id) {
  $roles = gofast_import__get_og_user_list_role_to_rid_mapping($node_id);

  gofast_og_subscribe_user($node_id, $user_id);
  foreach ($roles as $role_id) {
    og_role_revoke('node', $node_id, $user_id, $role_id);
  }
  og_role_grant('node', $node_id, $user_id, $roles[GOFAST_OG_ROLE_ADMIN]);
}

/**
 * Remove a member from a user list.
 *
 * @param numeric $node_id
 * @param numeric $user_id
 * @return void Modifies the user list entity on the node
 */
function gofast_import__remove_userlist_member($node_id, $user_id) {
  $node = node_load($node_id);
  $user_list_entity = entity_load_single('userlist', $node->field_userlist_ulid[LANGUAGE_NONE][0]['value']);

  // Find and remove member entry.
  foreach ($user_list_entity->field_userlist_members[LANGUAGE_NONE] as $key => $member) {
    if ($member['value'] === $user_id) {
      unset($user_list_entity->field_userlist_members[LANGUAGE_NONE][$key]);
      break;
    }
  }

  $user_list_entity->save();
}

/**
 * Removes an admin member from a user list given both's ids.
 *
 * @see `gofast_userlist_form_userlist_node_form_submit` extracted from there.
 *
 * @param numeric $node_id Id of the user list to remove the admin from.
 * @param numeric $user_id Id of the admin user to remove from the user list.
 * @return void Modifies the OG roles and subscriptions.
 */
function gofast_import__remove_userlist_admin($node_id, $user_id) {
  $roles = gofast_import__get_og_user_list_role_to_rid_mapping($node_id);

  foreach ($roles as $role_id) {
    og_role_revoke('node', $node_id, $user_id, $role_id);
  }
  gofast_og_unsubscribe_user($node_id, $user_id);
}

/**
 * Log an array of import errors.
 *
 * @param callable(string $type, string $message, array $variables=, int<0,7> $severity=): void $logger
 *  Logger callable (may differ if called from drush or internally)
 * @param array{
 *    type: string
 *    code: string,
 *    message: string,
 *    variables?: array<string, string>,
 *    level?: int<0, 7>,
 *  }[] $errors Array of error arrays
 * @return void
 */
function gofast_import__log_errors($logger, $errors) {
  foreach ($errors as $error) {
    $logger(
      'gofast_import',
      '@code: @message',
      [
        '@code' => $error['code'],
        '@message' => strtr(
          $error['message'],
          $error['variables'] ?? [],
        ),
      ],
      match ($error['type']) {
        'error' => WATCHDOG_ERROR,
        'warning' => WATCHDOG_WARNING,
        default => WATCHDOG_ERROR,
      },
    );
  }
}


/**
 * Join unix-style paths together.
 *
 * @param string[] $subpaths Subpaths to join.
 * @return string Joined path
 */
function gofast_import__join_path($subpaths) {
  $last = count($subpaths) - 1;

  // Remove leading/trailing separators in between subpaths.
  $processed_subpaths = array_map(
    fn($subpath, $i) => match ($i) {
      0 => rtrim($subpath, '/'),
      $last => ltrim($subpath, '/'),
      default => trim($subpath, '/'),
    },
    $subpaths,
    range(0, $last),
  );

  return implode('/', $processed_subpaths);
}

/**
 * Check if an error array is considered fatal, i.e. the import needs to stop
 * and report back to its caller.
 *
 * Currently defined as the errors array containing an error type array.
 *
 * @param array{type:string}[]|NULL $errors Array of structured error arrays.
 * @return boolean TRUE if the errors are fatal and execution needs to stop,
 *  FALSE otherwise.
 */
function gofast_import__is_errors_array_fatal($errors) {
  return isset($errors) && gofast_iterable_any($errors, fn($e) => $e['type'] === 'error');
}
