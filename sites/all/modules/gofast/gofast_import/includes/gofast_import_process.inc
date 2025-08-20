<?php

/**
 * @file
 * Import processing middle-end functions and implementation.
 */

/**
 * Import middle-end function, in charge of all common processing and validation
 * of imports. Dispatches the final processed data to the chosen back-end for
 * execution (e.g. logging through the dry-run backend).
 *
 * @param array{
 *  users?: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists?: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces?: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @param array{
 *  logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  output_logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 * } $_options Import options.
 * @return array{0:array|null,1:null|array{type:string}[]} A tuple with errors at
 *  index 0, and an array of commands at index 1.
 */
function gofast_import__process_import_data($import_data, $_options = []) {
  // $_options is currently unused, but keep it in case some option is needed in
  // the future
  ($_options);
  $errors = [];

  $errors[] = gofast_import__apply_defaults($import_data);

  // User normalization and validation.
  $errors[] = gofast_import__deduplicate_users($import_data);
  $errors[] = gofast_import__load_user_accounts($import_data);
  $errors[] = gofast_import__fill_user_missing_properties_from_account($import_data);
  $errors[] = gofast_import__validate_user_properties($import_data);

  // Space normalization and validation.
  $errors[] = gofast_import__parse_and_normalize_space_paths($import_data);
  $errors[] = gofast_import__deduplicate_spaces($import_data);
  $errors[] = gofast_import__new_space_add_support_if_no_admin($import_data);
  $errors[] = gofast_import__complete_space_parents($import_data);
  $errors[] = gofast_import__add_space_name_and_parent($import_data);
  $errors[] = gofast_import__load_space_nodes($import_data);
  $errors[] = gofast_import__add_child_members_to_missing_parents($import_data);
  $errors[] = gofast_import__fill_space_missing_properties_from_node($import_data);

  // User list normalization and validation.
  $errors[] = gofast_import__deduplicate_user_lists($import_data);
  $errors[] = gofast_import__deduplicate_space_user_list_members($import_data);
  $errors[] = gofast_import__validate_user_list_members_are_not_user_lists($import_data);
  $errors[] = gofast_import__load_user_list_nodes($import_data);
  $errors[] = gofast_import__new_user_list_add_support_if_no_admin_member($import_data);
  $errors[] = gofast_import__fill_user_list_missing_properties_from_node($import_data);

  // Cross-referencing validation
  $errors[] = gofast_import__validate_user_list_members_will_exist($import_data);

  // flatten by one level
  $errors = array_merge(...$errors);
  if (gofast_import__is_errors_array_fatal($errors)) {
    return [$errors, NULL];
  }

  $commands = gofast_import__transform_import_data_to_sequential_commands($import_data);

  return [$errors, $commands];
}

/**
 * Applies default values to import data as a whole.
 *
 * @param array{
 *  users?: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists?: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces?: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__apply_defaults(&$import_data) {
  $import_data ??= [];
  $import_data += [
    'users' => [],
    'user_lists' => [],
    'spaces' => [],
  ];

  return [];
}

/**
 * Maps a space type to a corresponding root space name.
 *
 * @param string $item_type Type of the import entity.
 * @return GOFAST_CMIS_LOCATIONS_FIELD_EXTRANET_VALUE
 *  | GOFAST_CMIS_LOCATIONS_FIELD_GROUPS_VALUE
 *  | GOFAST_CMIS_LOCATIONS_FIELD_ORGANISATIONS_VALUE
 *  | null Name of the corresponding root space or NULL if none apply.
 */
function gofast_import__try_map_space_type_to_root_space_name($item_type) {
  return match ($item_type) {
    GOFAST_IMPORT_ITEM_TYPE_EXTRANET => GOFAST_CMIS_LOCATIONS_FIELD_EXTRANET_VALUE,
    GOFAST_IMPORT_ITEM_TYPE_GROUP => GOFAST_CMIS_LOCATIONS_FIELD_GROUPS_VALUE,
    GOFAST_IMPORT_ITEM_TYPE_ORGANISATION => GOFAST_CMIS_LOCATIONS_FIELD_ORGANISATIONS_VALUE,
    default => NULL,
  };
}

/**
 * Parse a space path by normalizing it and validating it.
 *
 * Path segments are prefixed by an underscore if not already, the corresponding
 * root space is added if missing and the path is made absolute.
 *
 * @param string $path Space path to parse
 * @param GOFAST_IMPORT_COLUMN_TYPE_* $type Type of the item corresponding to
 *  this path.
 * @return array{0:array,1:null}|array{0:null,1:string} Tuple of either the new
 *  path value (second value), or an error (first value).
 */
function gofast_import__parse_space_path($path, $type) {
  // Try to normalize path value.
  $segments = explode('/', $path);
  $segments = array_map(
    fn($segment) => !empty($segment) && !str_starts_with($segment, '_') ?
      '_' . $segment
      : $segment,
    $segments,
  );
  $root_space_name = gofast_import__try_map_space_type_to_root_space_name($type)
    ?? throw new \LogicException('unreachable');
  if ($segments[0] !== $root_space_name) {
    array_unshift($segments, $root_space_name);
  }

  $path = gofast_import__join_absolute_path_segments($segments);

  return [NULL, $path];
}

/**
 * Deduplicates users in import data.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    source_id: int,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int}
 *    }[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int},
 *    }[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__deduplicate_users(&$import_data) {
  $errors = [];
  $seen_names = [];
  $duplicated_names = [];
  foreach ($import_data['users'] as $key => $user) {
    // User not seen yet: mark as seen and proceed (keep user).
    if (!isset($seen_names[$user['name']])) {
      $seen_names[$user['name']] = TRUE;
      continue;
    }
    // User is duplicated.
    // Ensure we report a single warning for each individual duplicated user.
    if (!isset($duplicated_names[$user['name']])) {
      $duplicated_names[$user['name']] = TRUE;
      $errors[] = [
        'type' => 'warning',
        'code' => 'duplicated_user',
        'message' => 'User "@name" is duplicated, only the first occurrence will be kept.',
        'variables' => [
          '@name' => $user['name'],
        ],
      ];
    }

    // Remove all references to user:
    // In user lists
    foreach ($import_data['spaces'] as &$space) {
      $space['memberships'] = array_values(array_filter(
        $space['memberships'],
        fn($m) => $m['member']['source_id'] !== $user['source_id'],
      ));
    }
    unset($space);

    // In spaces
    foreach ($import_data['user_lists'] as &$user_list) {
      $user_list['memberships'] = array_values(array_filter(
        $user_list['memberships'],
        fn($m) => $m['member']['source_id'] !== $user['source_id'],
      ));
    }
    unset($user_list);
    unset($import_data['users'][$key]);
  }

  // Reindex keys
  $import_data['users'] = array_values($import_data['users']);

  return $errors;
}

/**
 * Deduplicates user lists in import data.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    source_id: int,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int}
 *    }[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int},
 *    }[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__deduplicate_user_lists(&$import_data) {
  $errors = [];
  $seen_names = [];
  $duplicated_names = [];
  foreach ($import_data['user_lists'] as $key => $user_list) {
    if (!isset($seen_names[$user_list['name']])) {
      $seen_names[$user_list['name']] = TRUE;
      continue;
    }

    // Emit warning
    if (!isset($duplicated_names[$user_list['name']])) {
      $duplicated_names[$user_list['name']] = TRUE;
      $errors[] = [
        'type' => 'warning',
        'code' => 'duplicated_user_list',
        'message' => 'User list "@name" is duplicated, only the first occurrence will be kept.',
        'variables' => [
          '@name' => $user_list['name'],
        ],
      ];
    }

    // Remove user list:
    unset($import_data['user_lists'][$key]);
  }
  // Reindex keys
  $import_data['user_lists'] = array_values($import_data['user_lists']);
  return $errors;
}

/**
 * Deduplicates spaces in import data.
 *
 * Needs normalized absolute paths.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    source_id: int,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int}
 *    }[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int},
 *    }[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__deduplicate_spaces(&$import_data) {
  $errors = [];
  $seen_paths = [];
  $duplicated_paths = [];
  foreach ($import_data['spaces'] as $key => $space) {
    if (!isset($seen_paths[$space['path']])) {
      $seen_paths[$space['path']] = TRUE;
      continue;
    }

    // Emit warning
    if (!isset($duplicated_paths[$space['path']])) {
      $duplicated_paths[$space['path']] = TRUE;
      $errors[] = [
        'type' => 'warning',
        'code' => 'duplicated_space',
        'message' => 'Space "@path" is duplicated, only the first occurrence will be kept.',
        'variables' => [
          '@path' => $space['path'],
        ],
      ];
    }

    // Remove space:
    unset($import_data['spaces'][$key]);
  }
  // Reindex keys
  $import_data['spaces'] = array_values($import_data['spaces']);

  return $errors;
}

/**
 * Deduplicates user lists in space memberships in import data.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    source_id: int,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int}
 *    }[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int},
 *    }[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__deduplicate_space_user_list_members(&$import_data) {
  $errors = [];
  $list_member_name_to_source_id = [];
  $duplicated_names = [];

  // How do we know which duplicate member appeared first from source_id.
  // Here we use the implementation detail of front-end that ids are increasing
  // for each instance in order of appearance. Ideally this should be passed in.
  $reduce_first_id = fn($lhs_id, $rhs_id) => $lhs_id < $rhs_id ? $lhs_id : $rhs_id;

  foreach ($import_data['spaces'] as $space) {
    foreach ($space['memberships'] as $membership) {
      // Not a user list, skip it.
      $member = $membership['member'];
      if ($member['type'] !== GOFAST_IMPORT_MEMBER_TYPE_USERLIST) {
        continue;
      }

      // Register all seen member source ids and keep only first occurrence
      // determined using source_id.
      if (!isset($list_member_name_to_source_id[$member['name']])) {
        $list_member_name_to_source_id[$member['name']] = $member['source_id'];
      } else {
        $list_member_name_to_source_id[$member['name']] = $reduce_first_id(
          $list_member_name_to_source_id[$member['name']],
          $member['source_id'],
        );
      }
    }
  }
  unset($space);

  foreach ($import_data['spaces'] as &$space) {
    foreach ($space['memberships'] as $key => $membership) {
      // Not a user list, we don't touch it.
      $member = $membership['member'];
      if ($member['type'] !== GOFAST_IMPORT_MEMBER_TYPE_USERLIST) {
        continue;
      }
      // Member refers to first occurrence of list, skip it.
      if ($list_member_name_to_source_id[$member['name']] === $member['source_id']) {
        continue;
      }

      // Emit warning once per user list.
      if (!isset($duplicated_names[$member['name']])) {
        $duplicated_names[$member['name']] = TRUE;
        $errors[] = [
          'type' => 'warning',
          'code' => 'duplicated_user_list_member',
          'message' => 'User list "@name" is duplicated as a member of spaces. Only the first occurrence will be kept.',
          'variables' => [
            '@name' => $member['name'],
          ],
        ];
      }

      // Remove reference.
      unset($space['memberships'][$key]);
    }
    // Reindex array.
    $space['memberships'] = array_values($space['memberships']);
  }
  unset($space);

  return $errors;
}

/**
 * Parse space paths and normalize them on the import data structure.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__parse_and_normalize_space_paths(&$import_data) {
  $errors = [];

  foreach ($import_data['spaces'] as &$space) {
    [$error, $value] = gofast_import__parse_space_path($space['path'], $space['type']);
    if ($error) {
      $errors[] = [
        'type' => 'error',
        'code' => 'space_path_parse_error',
        'message' => 'Space path "@path" failed parsing with error @error',
        'variables' => [
          '@path' => var_export($space['path'], TRUE),
          '@error' => var_export($error, TRUE),
        ]
      ];
      continue;
    }

    $space['path'] = $value;
  }
  unset($space);

  return $errors;
}

/**
 * Adds the existing user account to the imported users when applicable.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__load_user_accounts(&$import_data) {
  foreach ($import_data['users'] as &$user) {
    $account = user_load_by_name($user['name']);
    $user['account'] = $account !== FALSE ? $account : NULL;
  }
  unset($user);
  return [];
}

/**
 * Fills unspecified user fields from the account object.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__fill_user_missing_properties_from_account(&$import_data) {
  $properties = gofast_import__get_user_property_descriptors();
  foreach ($import_data['users'] as &$user) {
    // user needs an account so we can fill missing properties.
    if (empty($user['account'])) {
      continue;
    }
    foreach ($properties as $property) {
      // property is already set, keep value
      if (!empty($user[$property['name']])) {
        continue;
      }

      // fill in property from account object.
      $user[$property['name']] = $property['account']['get']($user['account']);
    }
  }
  unset($user);
  return [];
}

/**
 * Validates the user's properties.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__validate_user_properties(&$import_data) {
  $errors = [];

  $properties = gofast_import__get_user_property_descriptors();
  foreach ($import_data['users'] as &$user) {
    foreach ($properties as $property) {
      $is_property_set = isset($user[$property['name']])
        && $user[$property['name']] !== '';

      // Check required property
      if (!$is_property_set && $property['required']) {
        $errors[] = [
          'type' => 'error',
          'code' => 'missing_user_required_property',
          'message' => 'Required property "@property" is missing on user "@username"',
          'variables' => [
            '@property' => $property['name'],
            '@username' => $user['name'],
          ],
        ];
        continue;
      }

      // Run property validators
      if (isset($property['validate'])) {
        foreach ($property['validate'] as $validator) {
          $result = $validator($user[$property['name']], $user);
          if ($result !== NULL) {
            $errors[] = $result;
          }
        }
      }
    }
  }
  unset($user);

  return $errors;
}

/**
 * Add entries in imported spaces for missing parents of specified spaces.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__complete_space_parents(&$import_data) {
  $space_mapping = [];

  // Populate mapping with existing imported spaces.
  foreach ($import_data['spaces'] as $space) {
    $space_mapping[$space['path']] = $space;
  }
  unset($space);

  // For each missing space, create an entry in the imported spaces for each
  // missing parent.
  foreach ($import_data['spaces'] as $space) {
    $path_segments = gofast_import__split_space_path($space['path']);
    // Remove last/current segment to get parent.
    array_pop($path_segments);
    for (; !empty($path_segments); array_pop($path_segments)) {
      $current_path = gofast_import__join_absolute_path_segments($path_segments);
      // Space is already specified in current import.
      if (array_key_exists($current_path, $space_mapping)) {
        continue;
      }

      // Create new imported space item and add it to import and mapping (so we
      // don't duplicate it).
      $new_space_item = [
        'type' => $space['type'],
        'path' => $current_path,
        'memberships' => [],
      ];
      $space_mapping[$current_path] = $new_space_item;
      $import_data['spaces'][] = $new_space_item;
    }
  }
  unset($space);
  return [];
}

/**
 * Validate that import data does not contain a user list which has a member of
 * user list type.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__validate_user_list_members_are_not_user_lists($import_data) {
  $errors = [];
  foreach ($import_data['user_lists'] as $user_list) {
    foreach ($user_list['memberships'] as $membership) {
      if ($membership['member']['type'] === GOFAST_IMPORT_MEMBER_TYPE_USERLIST) {
        $errors[] = [
          'type' => 'error',
          'code' => 'user_list_member_is_user_list',
          'message' =>
          'User list "@parent_list" cannot have member "@child_list" of type user list',
          'variables' => [
            '@parent_list' => $user_list['name'],
            '@child_list' => $membership['member']['name'],
          ],
        ];
      }
    }
  }
  return $errors;
}

/**
 * Adds support users to a new space with no administrators.
 *
 * @param @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__new_space_add_support_if_no_admin(&$import_data) {
  $errors = [];

  $support_users = NULL;
  $support_user_names = NULL;
  foreach ($import_data['spaces'] as &$space) {
    // Space is not new, it most likely already has an admin.
    if (isset($space['node'])) {
      continue;
    }

    // Check if space has no admin member.
    $has_admin_member = gofast_iterable_any(
      $space['memberships'],
      fn($m) => $m['role'] === GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN,
    );

    if ($has_admin_member) {
      continue;
    }

    // Report warning if space has no admin member.
    $errors[] = [
      'type' => 'warning',
      'code' => 'no_new_space_admin',
      'message' => 'New imported space "@path" lacks an administrator member. '
        . 'Support users will be added as admins. This will overwrite any other '
        . 'role a support user would have had.',
      'variables' => [
        '@path' => $space['path'],
      ],
    ];

    // Add support users to space as admin, overriding any role they might have had before.
    if (!isset($support_users)) {
      $support_users = gofast_user_load_multiple_by_roles(GOFAST_ROLE_BUSINESS_ADMIN);

      $support_user_names = array_map(fn($u) => $u->name, $support_users);
    }

    // Remove support user memberships.
    $space['memberships'] = array_filter(
      $space['memberships'],
      fn($m) => !in_array($m['member']['name'], $support_user_names, TRUE),
    );

    // Add back support users as admins
    foreach ($support_users as $user) {
      $space['memberships'][] = [
        'role' => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN,
        'member' => [
          'name' => $user->name,
          'type' => GOFAST_IMPORT_MEMBER_TYPE_USER,
        ],
      ];
    }
    $space['memberships'] = array_values($space['memberships']);
  }
  unset($space);

  return $errors;
}

/**
 * Map import item types to space node types.
 *
 * Note: this currently just returns its argument as node types should be the
 * same as the import item type constants, this function mostly explicitly shows
 * they are not the same thing semantically and may have differences in the
 * future.
 *
 * @param GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *  | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *  | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION $type Space import item type.
 * @return string Space node type corresponding to the space import item type.
 */
function gofast_import__convert_space_import_item_type_to_space_node_type($type) {
  return $type;
}

/**
 * Loads nodes onto space import items if it exists, validate that the node type
 * matches the imported item type. If not do not load and report the mismatch as
 * an error.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__load_space_nodes(&$import_data) {
  $errors = [];
  foreach ($import_data['spaces'] as &$space) {
    // Init property (make it exist even if empty).
    $space['node'] = NULL;
    // Try to load the corresponding node.
    $node = gofast_import__load_node_by_path($space['path']);
    $expected_space_node_type = gofast_import__convert_space_import_item_type_to_space_node_type($space['type']);
    if ($node === FALSE) {
      continue;
    }

    // Check if types mismatch, it shouldn't really happen due to preceding
    // processing steps however. (keep it here just in case hell freezes over)
    if ($node->type !== $expected_space_node_type) {
      $errors[] = [
        'type' => 'error',
        'code' => 'space_import_item_node_type_mismatch',
        'message' => 'Import space item with path "@path" matches node but node type "@node_type" does not match expected space import item type "@item_type',
        'variables' => [
          '@path' => $space['path'],
          '@node_type' => $node->type,
          '@item_type' => $space['type'],
        ],
      ];

      // Do not load the node object into the import item as there is a type mismatch.
      continue;
    }
    $space['node'] = $node;
  }
  unset($space);
  return $errors;
}

/**
 * Add members to parent spaces that do not yet exist on the platform and have
 * no members specified.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__add_child_members_to_missing_parents(&$import_data) {
  $space_mapping = [];
  foreach ($import_data['spaces'] as &$space) {
    $space_mapping[$space['path']] = &$space;
  }
  unset($space);

  foreach ($import_data['spaces'] as &$space) {
    $segments = gofast_import__split_space_path($space['path']);
    // We care only about parent spaces, so remove current segment.
    array_pop($segments);
    // Iterate all parents except root spaces.
    for (; count($segments) > 1; array_pop($segments)) {
      $path = gofast_import__join_absolute_path_segments($segments);
      // Parent should be present in mapping as they should already be added to
      // import data.
      $parent = &$space_mapping[$path];

      // Parent either already exists on platform or has already has members.
      if (isset($parent['node']) || !empty($parent['memberships'])) {
        continue;
      }
      // Parent does not already exist and has not been assigned members, add
      // the members of the first child space instead.
      $parent['memberships'] = $space['memberships'];
    }
    unset($parent);
  }
  unset($space);

  return [];
}

/**
 * Loads missing properties in space import items with data from node when possible.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__fill_space_missing_properties_from_node(&$import_data) {
  // Whitelist of properties we want to fill if missing.
  $fillable_properties = ['description'];

  $descriptors = gofast_import__get_space_property_descriptors();
  foreach ($import_data['spaces'] as &$space) {
    // Does this space have a node from which we could fetch missing data?
    if (!isset($space['node'])) {
      continue;
    }

    foreach ($fillable_properties as $property_key) {
      $property = $descriptors[$property_key];
      // Is property set?
      if (!empty($space[$property['name']])) {
        continue;
      }

      // Fill missing property.
      $space[$property['name']] = $property['node']['get']($space['node']);
    }
  }
  unset($space);
  return [];
}

/**
 * Loads user list nodes onto user list import items when possible
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__load_user_list_nodes(&$import_data) {
  $errors = [];
  foreach ($import_data['user_lists'] as &$user_list) {
    // Set node property
    $user_list['node'] = NULL;

    // Find list and set
    $node_ids = gofast_import__find_userlist_nids_by_title($user_list['name']);
    $node_count = count($node_ids);

    // No lists: nothing to do.
    if ($node_count === 0) {
      continue;
    }
    // More than one list: ambiguous, report error as name conflict.
    if ($node_count > 1) {
      $errors[] = [
        'type' => 'error',
        'code' => 'userlist_name_conflict',
        'message' => 'More than 1 userlist with name "@name" exist, node ids are: @node_ids',
        'variables' => [
          '@name' => $user_list['name'],
          '@node_ids' => implode(', ', $node_ids),
        ],
      ];
      continue;
    }

    // Exactly one list: set list node as item 'node' property.
    $user_list['node'] = node_load(reset($node_ids));
  }
  unset($user_list);
  return $errors;
}

/**
 * Adds support users for new user lists without an admin user.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__new_user_list_add_support_if_no_admin_member(&$import_data) {
  $errors = [];
  $support_users = NULL;

  foreach ($import_data['user_lists'] as &$user_list) {
    // User list is not new. Skip.
    if (isset($user_list['node'])) {
      continue;
    }

    $has_admin = gofast_iterable_any(
      $user_list['memberships'],
      fn($m) => $m['role'] === GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN,
    );
    if ($has_admin) {
      continue;
    }
    // Has no admins: raise warning and add support/business admin users as list admins.
    $errors[] = [
      'type' => 'warning',
      'code' => 'no_new_user_list_admin',
      'message' => 'New imported user list "@name" lacks an administrator member.'
        . ' Support users will be added as admin.',
      'variables' => [
        '@name' => $user_list['name'],
      ],
    ];

    if (!isset($support_users)) {
      $support_users = gofast_user_load_multiple_by_roles(GOFAST_ROLE_BUSINESS_ADMIN);
    }

    foreach ($support_users as $account) {
      $user_list['memberships'][] = [
        'role' => GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN,
        'member' => [
          'name' => $account->name,
          'type' => GOFAST_IMPORT_MEMBER_TYPE_USER,
        ]
      ];
    }
  }
  unset($user_list);

  return $errors;
}

/**
 * Loads missing properties in user list import items with data from node when possible.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__fill_user_list_missing_properties_from_node(&$import_data) {
  // Whitelist of properties we want to fill if missing.
  $fillable_properties = ['description'];

  $descriptors = gofast_import__get_user_list_property_descriptors();
  foreach ($import_data['user_lists'] as &$user_list) {
    // Does this user list have a node from which we could fetch missing data?
    if (!isset($user_list['node'])) {
      continue;
    }

    foreach ($fillable_properties as $property_key) {
      $property = $descriptors[$property_key];
      // Is property set?
      if (!empty($user_list[$property['name']])) {
        continue;
      }

      // Fill missing property.
      $user_list[$property['name']] = $property['node']['get']($user_list['node']);
    }
  }
  unset($user_list);
  return [];
}

/**
 * Adds a name and parent_path property on space items based on their path.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__add_space_name_and_parent(&$import_data) {
  foreach ($import_data['spaces'] as &$space) {
    $segments = gofast_import__split_space_path($space['path']);
    $name = array_pop($segments);
    // Drop leading underscore.
    $name = substr($name, 1);
    $space['name'] = $name;

    // Use the fact that we basically have the parent path to add it as well.
    $parent_path = NULL;
    if (!empty($segments)) {
      $parent_path = gofast_import__join_absolute_path_segments($segments);
    }
    $space['parent_path'] = $parent_path;
  }
  unset($space);

  return [];
}

/**
 * Validates that user lists specified as members of a space will exist by the
 * time they are added as members of the space.
 *
 * A user list will exist if and only if it either:
 * - Is specified in the import data (not as a member).
 * - It already exists on the platform, and is unambiguous.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    source_id: int,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int}
 *    }[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    source_id: int,
 *    memberships: array{
 *      role: string,
 *      item_source_id: int,
 *      member: array{name: string, type: string, source_id: int},
 *    }[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array Array of errors, empty when no errors need reporting.
 */
function gofast_import__validate_user_list_members_will_exist(&$import_data) {
  $errors = [];
  $existing_user_lists_by_name = [];
  $invalid_user_lists_by_name = [];
  // Mark all imported user lists as existing.
  foreach ($import_data['user_lists'] as $user_list) {
    $existing_user_lists_by_name[$user_list['name']] = TRUE;
  }

  foreach ($import_data['spaces'] as $space) {
    foreach ($space['memberships'] as $membership) {
      // Membership is not about a user list.
      if ($membership['member']['type'] !== GOFAST_IMPORT_MEMBER_TYPE_USERLIST) {
        continue;
      }

      $user_list_name = $membership['member']['name'];
      // User list is already guaranteed to exist.
      if (isset($existing_user_lists_by_name[$user_list_name])) {
        continue;
      }
      // User has already been found to be invalid.
      if (isset($invalid_user_lists_by_name[$user_list_name])) {
        continue;
      }

      $nids = gofast_import__find_userlist_nids_by_title($user_list_name);
      $node_count = count($nids);
      // List does not exist, emit error and mark invalid
      if ($node_count === 0) {
        $errors[] = [
          'type' => 'error',
          'code' => 'userlist_member_not_exists',
          'message' => 'Space member user list "@name" does not exist.',
          'variables' => [
            '@name' => $user_list_name,
          ],
        ];
        $invalid_user_lists_by_name[$user_list_name] = TRUE;
      } elseif ($node_count > 1) {
        // Ambiguous situation: more than one userlist with the given name exists.
        $errors[] = [
          'type' => 'error',
          'code' => 'ambiguous_user_list_member',
          'message' => 'Space member user list name "@name" refers to multiple existing user lists.',
          'variables' => [
            '@name' => $user_list_name,
          ],
        ];
        $invalid_user_lists_by_name[$user_list_name] = TRUE;
      } else {
        // Exactly one userlist exists, mark as existing.
        $existing_user_lists_by_name[$user_list_name] = TRUE;
      }
    }
  }

  return $errors;
}

/**
 * Transforms import data into an array of simple commands to execute.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array{type:string}[] Commands array destined to be used in back-end. Describes
 *  sequential steps to apply to get desired import result.
 */
function gofast_import__transform_import_data_to_sequential_commands($import_data) {

  $commands = [];

  // User commands
  $commands[] = gofast_import__generate_user_commands($import_data);

  // User list commands
  $commands[] = gofast_import__generate_user_list_commands($import_data);

  // Space commands
  $commands[] = gofast_import__generate_space_commands($import_data);

  $commands = array_merge(...$commands);

  return $commands;
}

/**
 * Generate import commands for users.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array{type:string}[] Commands array destined to be used in back-end. Describes
 *  sequential steps to apply to get desired import result.
 */
function gofast_import__generate_user_commands($import_data) {
  $commands = [];
  $descriptors = gofast_import__get_user_property_descriptors();

  foreach ($import_data['users'] as $user) {

    // User name has no account -> new user.
    if (!isset($user['account'])) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_CREATE,
        'username' => $user['name'],
        'email' => $user['email'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
      ];
      continue;
    }

    // Account exists: find differences to apply updates.
    $property_updates = [];
    $diff_single_valued_property = function ($property_name) use (
      $descriptors,
      &$property_updates,
      $user,
    ) {
      $account_value = $descriptors[$property_name]['account']['get']($user['account']);
      if ($account_value !== $user[$property_name]) {
        $property_updates[] = [
          'property' => $property_name,
          'value' => $user[$property_name],
          'old_value' => $account_value,
        ];
      }
    };

    $diff_single_valued_property('first_name');
    $diff_single_valued_property('last_name');
    $diff_single_valued_property('email');

    // If there are differences: issue update command.
    if (!empty($property_updates)) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_SET_PROPERTIES,
        'username' => $user['name'],
        'uid' => $user['account']->uid,
        'properties' => $property_updates,
      ];
    }
    // User already exists and no differences found: do nothing.
  }

  return $commands;
}

/**
 * Generate import commands for user lists.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array{type:string}[] Commands array destined to be used in back-end. Describes
 *  sequential steps to apply to get desired import result.
 */
function gofast_import__generate_user_list_commands($import_data) {
  $commands = [];

  $descriptors = gofast_import__get_user_list_property_descriptors();
  foreach ($import_data['user_lists'] as $user_list) {
    // User list does not exist, create it from scratch
    if (!isset($user_list['node'])) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_CREATE,
        'name' => $user_list['name'],
        'description' => $user_list['description'],
      ];
      foreach ($user_list['memberships'] as $membership) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER,
          'userlist' => $user_list['name'],
          'role' => $membership['role'],
          'username' => $membership['member']['name'],
        ];
      }
      continue;
    }

    // Diff userlist properties to find updates.
    $property_updates = [];

    $node_description = $descriptors['description']['node']['get']($user_list['node']);
    if ($node_description !== $user_list['description']) {
      $property_updates[] = [
        'property' => 'description',
        'value' => $user_list['description'],
        'old_value' => $node_description,
      ];
    }

    if (!empty($property_updates)) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_SET_PROPERTIES,
        'nid' => $user_list['node']->nid,
        'name' => $user_list['name'],
        'properties' => $property_updates,
      ];
    }

    // Diff members for additions/removals.
    $original_members = $descriptors['members']['node']['get']($user_list['node']);

    $original_members_username_roles_mapping = [];
    foreach ($original_members as $member) {
      $original_members_username_roles_mapping[$member['member']['name']][] = $member['role'];
    }
    $original_members_username_roles_mapping = array_map(
      'array_unique',
      $original_members_username_roles_mapping,
    );

    $import_members_username_roles_mapping = [];
    foreach ($user_list['memberships'] as $member) {
      $import_members_username_roles_mapping[$member['member']['name']][] = $member['role'];
    }
    $import_members_username_roles_mapping = array_map(
      'array_unique',
      $import_members_username_roles_mapping,
    );

    // Loop over members specified in import.
    foreach ($import_members_username_roles_mapping as $username => $roles) {
      // Member is new to the list, add all membership roles.
      if (!isset($original_members_username_roles_mapping[$username])) {
        foreach ($roles as $role) {
          $commands[] = [
            'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER,
            'userlist' => $user_list['name'],
            'nid' => $user_list['node']->nid,
            'role' => $role,
            'username' => $username,
          ];
        }
        continue;
      }

      // Member already exists, issue commands for roles to add and roles to remove
      $original_roles = $original_members_username_roles_mapping[$username];
      $added_roles = array_diff($roles, $original_roles);
      $removed_roles = array_diff($original_roles, $roles);
      foreach ($added_roles as $role) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER,
          'userlist' => $user_list['name'],
          'nid' => $user_list['node']->nid,
          'role' => $role,
          'username' => $username,
        ];
      }

      foreach ($removed_roles as $role) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_REMOVE_MEMBER,
          'userlist' => $user_list['name'],
          'nid' => $user_list['node']->nid,
          'role' => $role,
          'username' => $username,
        ];
      }
    }
  }

  return $commands;
}

/**
 * Generate import commands for spaces.
 *
 * @param array{
 *  users: array{
 *    type: GOFAST_IMPORT_MEMBER_TYPE_USER,
 *    name: string,
 *    last_name: string | null,
 *    first_name: string | null,
 *    email: string | null,
 *    account?: object | null,
 *  }[],
 *  user_lists: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_USERLIST,
 *    name: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    node?: object | null,
 *  }[],
 *  spaces: array{
 *    type: GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *      | GOFAST_IMPORT_ITEM_TYPE_GROUP
 *      | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION,
 *    path: string,
 *    description?: string,
 *    memberships: array{role: string, member: array{name: string, type: string}}[],
 *    name?: string,
 *    parent_path?: string | null,
 *    node?: object | null,
 *  }[],
 * } $import_data Full description of the desired state after import of the platform.
 * @return array{type:string}[] Commands array destined to be used in back-end. Describes
 *  sequential steps to apply to get desired import result.
 */
function gofast_import__generate_space_commands($import_data) {
  $commands = [];
  // Collect spaces into a map from path to space scheduling array.
  $space_mapping = [];
  foreach ($import_data['spaces'] as $space) {
    $space_mapping[$space['path']] = ['scheduled' => FALSE, 'space' => $space];
  }

  // Schedule space import order: parent spaces should be added/modified before
  // their children to minimize possible issues.
  // NOTE: might be equivalent to depth-first traversal of implied tree structure,
  // breadth-first traversal could be emulated by sorting by number of path
  // segments in ascending order.
  $space_schedule = [];
  foreach ($import_data['spaces'] as $space) {
    $schedule_stack = [];

    // Push parent paths on schedule stack
    $segments = gofast_import__split_space_path($space['path']);
    for ($i = count($segments); $i !== 0; --$i) {
      $current_segments = array_slice($segments, 0, $i);
      $current_path =  gofast_import__join_absolute_path_segments($current_segments);
      $schedule_stack[] = $current_path;
    }

    // Pop each item and schedule them if not already scheduled
    while ($path = array_pop($schedule_stack)) {
      if ($space_mapping[$path]['scheduled']) {
        continue;
      }
      $space_schedule[] = $space_mapping[$path]['space'];
      $space_mapping[$path]['scheduled'] = TRUE;
    }
  }

  $descriptors = gofast_import__get_space_property_descriptors();
  // Issue space import commands, they should be in the right order to not care
  // about missing dependencies.
  foreach ($space_schedule as $space) {
    // Space is new.
    if (!isset($space['node'])) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_SPACE_CREATE,
        'space_type' => $space['type'],
        'name' => $space['name'],
        'path' => $space['path'],
        'parent_path' => $space['parent_path'],
        'description' => $space['description'],
      ];
      foreach ($space['memberships'] as $membership) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP,
          'space_path' => $space['path'],
          'role' => $membership['role'],
          'member' => [
            'name' => $membership['member']['name'],
            'type' => $membership['member']['type'],
          ],
        ];
      }
      continue;
    }

    // Space already exists, diff properties and memberships.
    $property_updates = [];

    // Diff description.
    $node_description = $descriptors['description']['node']['get']($space['node']);
    if ($node_description !== $space['description']) {
      $property_updates[] = [
        'property' => 'description',
        'value' => $space['description'],
        'old_value' => $node_description,
      ];
    }

    if (!empty($property_updates)) {
      $commands[] = [
        'type' => GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_PROPERTIES,
        'nid' => $space['node']->nid,
        'space_path' => $space['path'],
        'properties' => $property_updates,
      ];
    }

    // Diff memberships.
    $import_mapping = [];
    foreach ($space['memberships'] as $membership) {
      $member_key = implode('/', [$membership['member']['type'], $membership['member']['name']]);
      $import_mapping[$member_key] = $membership;
    }

    $original_mapping = [];
    $original_memberships = $descriptors['memberships']['node']['get']($space['node']);
    foreach ($original_memberships as $membership) {
      $member_key = implode('/', [$membership['member']['type'], $membership['member']['name']]);
      $original_mapping[$member_key] = $membership;
    }

    foreach ($import_mapping as $member_key => $membership) {
      // New membership
      if (!isset($original_mapping[$member_key])) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP,
          'space_path' => $space['path'],
          'role' => $membership['role'],
          'member' => [
            'name' => $membership['member']['name'],
            'type' => $membership['member']['type'],
          ],
        ];
        continue;
      }

      // Compare new and old memberships
      $original_membership = $original_mapping[$member_key];

      // Role changed?
      if ($original_membership['role'] !== $membership['role']) {
        $commands[] = [
          'type' => GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_MEMBERSHIP_ROLE,
          'nid' => $space['node']->nid,
          'space_path' => $space['path'],
          'member' => $membership['member'],
          'role' => $membership['role'],
          'old_role' => $original_membership['role'],
        ];
      }

      // No more changes to apply.
    }
  }

  return $commands;
}
