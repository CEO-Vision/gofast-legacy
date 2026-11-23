<?php

/**
 * @file
 * Dry run import backend functions, implementations and constants.
 */

// Dry run message types
/** Dry run message type value for adding new data/relationship */
define('GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION', 'addition');
/** Dry run message type value for updating existing data/relationship */
define('GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE', 'update');
/** Dry run message type value for removing existing data/relationship */
define('GOFAST_IMPORT_DRY_RUN_MESSAGE_REMOVAL', 'remove');
/** Dry run message type value for unknown operations */
define('GOFAST_IMPORT_DRY_RUN_MESSAGE_UNKNOWN', 'unknown');

/**
 * Dry-run backend function, formats and logs the given commands using the
 * provided logging function (defaults to watchdog).
 *
 * @param array{type:string}[] $commands Import commands to print.
 * @param array{
 *  logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  output_logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 * } $options Options array.
 * @return void Prints commands to logging output.
 */
function gofast_import__print_import_commands($commands, $options) {
  $logger = $options['output_logger'] ?? gofast_import__get_default_logger();

  // Handle case where no command was output (import does not apply changes).
  if (empty($commands)) {
    $logger(
      'gofast_import',
      'No operation to execute, platform is up to date with import source',
    );
    return;
  }

  $i = 1;
  $index_max_digits = gofast_import__get_integer_digit_count(count($commands));
  foreach ($commands as $command) {
    $command_number = $i++;
    // Get message array for command type.
    $message = _gofast_import__get_command_message_array($command);

    // Add command index and update type decoration to message
    $logging_args = [];
    $message_type_decoration = match ($message[0]) {
      GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION => '[+]',
      GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE => '[=]',
      GOFAST_IMPORT_DRY_RUN_MESSAGE_REMOVAL => '[-]',
      default => '[?]',
    };
    $logging_args[0] = '#@cmd_index ' . $message_type_decoration . ' ' . $message[1];
    $logging_args[1] = $message[2] ?? [];

    // Ensure command numbers have the same width and stay right-aligned.
    $logging_args[1]['@cmd_index'] = str_pad(
      $command_number,
      $index_max_digits,
      '0',
      STR_PAD_LEFT,
    );

    // Log message as dry-run pretty print.
    $logger('gofast_import', ...$logging_args);
  }
}

/**
 * Get a message array from an import command for printing purposes.
 *
 * @param array{type:string} $command Command to get the message of.
 * @return array{0:string,1:string,2:array<string,mixed>} Command message array.
 */
function _gofast_import__get_command_message_array($command) {
  // Dispatch call to command-specific function to get message array.
  // Note: this could be easier with OOP and dynamic dispatch.
  return match ($command['type']) {
    // Create user.
    GOFAST_IMPORT_COMMAND_TYPE_USER_CREATE =>
    _gofast_import__get_command_message_of_user_create($command),

    // Update user properties.
    GOFAST_IMPORT_COMMAND_TYPE_USER_SET_PROPERTIES =>
    _gofast_import__get_command_message_of_user_set_properties($command),

    // Create user list.
    GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_CREATE =>
    _gofast_import__get_command_message_of_user_list_create($command),

    // Update user list properties.
    GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_SET_PROPERTIES =>
    _gofast_import__get_command_message_of_user_list_set_properties($command),

    // Add member to user list.
    GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER =>
    _gofast_import__get_command_message_of_user_list_add_member($command),

    // Remove member(ship) from user list.
    GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_REMOVE_MEMBER =>
    _gofast_import__get_command_message_of_user_list_remove_member($command),

    // Create space.
    GOFAST_IMPORT_COMMAND_TYPE_SPACE_CREATE =>
    _gofast_import__get_command_message_of_space_create($command),

    // Set properties on space.
    GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_PROPERTIES =>
    _gofast_import__get_command_message_of_space_set_properties($command),

    // Add member to space.
    GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP =>
    _gofast_import__get_command_message_of_space_add_membership($command),

    // Update membership role in space.
    GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_MEMBERSHIP_ROLE =>
    _gofast_import__get_command_message_of_space_update_membership_role($command),

      // Catch-all for commands without an explicit message.
    default => [
      GOFAST_IMPORT_DRY_RUN_MESSAGE_UNKNOWN,
      'no pretty print for command: @command',
      ['@command' => var_export($command, TRUE)],
    ],
  };
}

/**
 * Get user creation command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_CREATE,
 *  first_name: string,
 *  last_name: string,
 *  email: string,
 *  username: string,
 * } $command User creation command array
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_create($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
    'Create user "@full_name" (@username) <@email>',
    [
      '@full_name' => $command['first_name'] . ' ' . $command['last_name'],
      '@username' => $command['username'],
      '@email' => $command['email'],
    ],
  ];
}

/**
 * Get user property update command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_SET_PROPERTIES,
 *  username: string,
 *  uid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command User property update command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_set_properties($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE,
    "Set properties on user \"@username\" (@uid):\n@property_list\n",
    [
      '@username' => $command['username'],
      '@uid' => var_export($command['uid'], TRUE),
      '@property_list' => implode(
        "\n",
        array_map(
          fn($p) => strtr(
            '  - @property: @new_value <== @old_value',
            [
              '@property' => $p['property'],
              '@new_value' => var_export($p['value'], TRUE),
              '@old_value' => var_export($p['old_value'], TRUE),
            ],
          ),
          $command['properties'],
        ),
      ),
    ],
  ];
}

/**
 * Get user list creation command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_CREATE,
 *  name: string,
 *  description: string | NULL,
 * } $command User list creation command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_list_create($command) {
  if ($command['description'] === NULL) {
    return [
      GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
      "Create user list \"@name\"",
      ['@name' => $command['name']]
    ];
  }

  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
    "Create user list \"@name\" with description:\n@description\n",
    ['@name' => $command['name'], '@description' => $command['description']]
  ];
}

/**
 * Get user list property update command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_SET_PROPERTIES,
 *  name: string,
 *  nid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command User list property update command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_list_set_properties($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE,
    "Set properties on user list \"@user_list\" (@nid):\n@property_list\n",
    [
      '@user_list' => $command['name'],
      '@nid' => var_export($command['nid'], TRUE),
      '@property_list' => implode(
        "\n",
        array_map(
          fn($p) => strtr(
            '  - @property = @new_value <== @old_value',
            [
              '@property' => $p['property'],
              '@new_value' => var_export($p['value'], TRUE),
              '@old_value' => var_export($p['old_value'], TRUE),
            ]
          ),
          $command['properties'],
        ),
      )
    ],
  ];
}

/**
 * Get user list member addition command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_ADD_MEMBER,
 *  userlist: string,
 *  username: string,
 *  role: string,
 * } $command User list member addition command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_list_add_member($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
    'Add member "@username" to user list "@list_name" with role "@role"',
    [
      '@username' => $command['username'],
      '@list_name' => $command['userlist'],
      '@role' => $command['role'],
    ],
  ];
}

/**
 * Get user list member removal command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_USER_LIST_REMOVE_MEMBER,
 *  userlist: string,
 *  username: string,
 *  role: string,
 * } $command User list member removal command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_user_list_remove_member($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_REMOVAL,
    'Remove member "@username" from user list "@list_name" with role "@role"',
    [
      '@username' => $command['username'],
      '@list_name' => $command['userlist'],
      '@role' => $command['role'],
    ],
  ];
}

/**
 * Get space creation command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_CREATE,
 *  name: string,
 *  space_type: string,
 *  parent_path: string | NULL,
 *  description: string | NULL,
 * } $command Space creation command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_space_create($command) {
  $additional_properties_message = implode(', ', [
    ...($command['parent_path'] !== NULL ? ['parent "@parent"'] : []),
    ...($command['description'] !== NULL ? ["description:\n@description\n"] : []),
  ]);

  if (!empty($additional_properties_message)) {
    $additional_properties_message = ' with ' . $additional_properties_message;
  }

  $additional_properties_message = strtr(
    $additional_properties_message,
    [
      '@parent' => $command['parent_path'],
      '@description' => $command['description'],
    ],
  );

  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
    'Create space "@name" of type "@type"@properties_message',
    [
      '@name' => $command['name'],
      '@type' => $command['space_type'],
      '@properties_message' => $additional_properties_message,
    ],
  ];
}

/**
 * Get space property update command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_PROPERTIES,
 *  space_path: string,
 *  nid: numeric,
 *  properties: array{property: string, value: mixed, old_value: mixed}[],
 * } $command Space property update command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_space_set_properties($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE,
    "Set properties on space \"@path\" (@nid):\n@property_list\n",
    [
      '@path' => $command['space_path'],
      '@nid' => $command['nid'],
      '@property_list' => implode(
        "\n",
        array_map(
          fn($p) => strtr(
            '  - @property: @new_value <== @old_value',
            [
              '@property' => $p['property'],
              '@new_value' => var_export($p['value'], TRUE),
              '@old_value' => var_export($p['old_value'], TRUE),
            ],
          ),
          $command['properties'],
        ),
      ),
    ],
  ];
}

/**
 * Get space membership addition command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_ADD_MEMBERSHIP,
 *  space_path: string,
 *  role: string,
 *  member: array{name: string, type: string},
 * } $command Space membership addition command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_space_add_membership($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_ADDITION,
    'Add @type member "@member_name" to space "@path" with role "@role"',
    [
      '@type' => match ($command['member']['type']) {
        GOFAST_IMPORT_MEMBER_TYPE_USER => 'user',
        GOFAST_IMPORT_MEMBER_TYPE_USERLIST => 'user list',
      },
      '@member_name' => $command['member']['name'],
      '@path' => $command['space_path'],
      '@role' => $command['role'],
    ],
  ];
}

/**
 * Get space membership role update command dry run message array.
 *
 * @param array{
 *  type: GOFAST_IMPORT_COMMAND_TYPE_SPACE_SET_MEMBERSHIP_ROLE,
 *  space_path: string,
 *  role: string,
 *  old_role: string,
 *  member: array{name: string, type: string},
 * } $command Space membership role update command array.
 * @return array{0:string,1:string,2:array<string,mixed>} Dry run message array.
 */
function _gofast_import__get_command_message_of_space_update_membership_role($command) {
  return [
    GOFAST_IMPORT_DRY_RUN_MESSAGE_UPDATE,
    'Set role of member "@name" (@type) in space "@path" to "@new_role" from "@old_role"',
    [
      '@name' => $command['member']['name'],
      '@type' => $command['member']['type'],
      '@new_role' => $command['role'],
      '@old_role' => $command['old_role'],
      '@path' => $command['space_path']
    ],
  ];
}
