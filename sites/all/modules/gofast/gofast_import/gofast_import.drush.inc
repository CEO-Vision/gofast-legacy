<?php

/**
 * @file
 * Drush CLI command file, declares and implements Drush commands.
 */

use Drush\Log\LogLevel;

/**
 * Implements hook_drush_command
 * @return array Drush commands configuration
 */
function gofast_import_drush_command() {
  return [
    // spell-checker:ignore gfiusmss
    'gofast_import:from_user_space_membership_spreadsheet' => [
      'description' => 'Import user, spaces and memberships using a spreadsheet file.',
      'examples' => [
        'drush @d7 gf-import-usm-spreadsheet [[--file-path=]<file-path>] '
          . '[--sheet-name=<sheet-name>] [--sheet-index=<sheet-index>] [--dry-run]'
        => 'General example using path.',
        'drush @d7 gf-import-usm-spreadsheet --file-path=test.xlsx' =>
        'Pass file path using option (all options but boolean flags need the = sign).',
        'drush @d7 gf-import-usm-spreadsheet test.xlsx' =>
        'Pass the file path from positional arguments.',
      ],
      'aliases' => [
        'gf-import-user-space-membership-spreadsheet',
        'gf-import-usm-spreadsheet',
        'gfiusmss',
      ],
      'command-hook' => 'import_user_space_membership_spreadsheet',
      'arguments' => [
        'file-path' => 'Path to the file being imported, the command uses the '
          . 'first positional argument if the --file-path option is not specified',
      ],
      'options' => [
        'file-path' => [
          'description' => 'Path to the spreadsheet file to import.',
          'example-value' => './users.xlsx',
        ],
        'sheet-name' => [
          'description' => 'Name of the spreadsheet sheet in which the table is '
            . 'located. Takes priority over --sheet-index if both are specified',
          'example-value' => 'Sheet1',
        ],
        'sheet-index' => [
          'description' => 'Index of the sheet to import, useful when trying '
            . 'not to depend on the name. Defaults to 0.',
          'example-value' => '0',
        ],
        'active-sheet' => [
          'description' => 'Flag to use the active excel sheet instead of first '
            . 'one by default. Ignored when --sheet-index or --sheet-name are specified'
        ],
        'dry-run' => [
          'description' => 'Flag to print to STDOUT the planned actions instead '
            . 'of executing them.'
        ],
        'quiet' => [
          'description' => 'Flag to suppress output logging.'
        ],
        'stdout-log' => [
          'description' => 'Flag to force output logging to log to stdout.'
        ],
      ],
    ],
  ];
}

/**
 * Convert from watchdog logging level constants to drush_log level constants.
 *
 * @param int<0,7> $level Watchdog log level
 * @return LogLevel::* Drush log level
 */
function gofast_import__convert_watchdog_log_level_to_drush($level) {
  return match ($level) {
    WATCHDOG_EMERGENCY => LogLevel::EMERGENCY,
    WATCHDOG_ALERT => LogLevel::ALERT,
    WATCHDOG_CRITICAL => LogLevel::CRITICAL,
    WATCHDOG_ERROR => LogLevel::ERROR,
    WATCHDOG_WARNING => LogLevel::WARNING,
    WATCHDOG_NOTICE => LogLevel::NOTICE,
    WATCHDOG_INFO => LogLevel::INFO,
    WATCHDOG_DEBUG => LogLevel::DEBUG,
  };
}

/**
 * Get an instance of a callable logger using the same signature as the standard
 * watchdog function.
 *
 * @return callable(string $type, string $message, array $variables=, int<0,7> $severity=): void
 *  Logger callable.
 */
function gofast_import__get_watchdog_compatible_drush_logger() {
  return fn($type, $message, $variables = [], $severity = WATCHDOG_NOTICE) => drush_log(
    '{' . $type . '} ' . strtr($message, $variables),
    gofast_import__convert_watchdog_log_level_to_drush($severity),
  );
}

/**
 * Get a callable with a watchdog-compatible signature that writes to STDERR by default.
 *
 * We cannot write to STDOUT if we want the output to be interactive, outputting
 * each time the function is called. Drush, however, wraps STDOUT and buffers it
 * on its own to do some display on its own, meaning ANY and ALL custom commands
 * output to STDOUT is not, and cannot be, interactive, in a CLI.
 *
 * @param resource $handle File handle resource to write to, defaults to STDERR
 *  so output can be interactive in drush.
 * @return callable(string $type, string $message, array $variables=, int<0,7> $severity=): void
 *  Logger callable.
 */
function gofast_import__get_default_logger($handle = STDERR) {
  return function ($type, $message, $variables = [], $severity = WATCHDOG_NOTICE) use ($handle) {
    // We ignore setting a severity indicator.
    ($severity);
    $formatted_message = strtr($message, $variables);
    fwrite($handle, '{' . $type . '} ' . $formatted_message . PHP_EOL);
  };
}

/**
 * Drush command execution callback for gofast_import:from_user_space_membership_spreadsheet.
 *
 * @return void
 */
function drush_gofast_import_import_user_space_membership_spreadsheet() {

  // prepare for positional arguments
  /** @var string[] */
  $arguments = drush_get_arguments();
  // first argument is command/alias used, we don't need it.
  array_shift($arguments);
  /**
   * @var int Represents the index of the first unused argument, can be
   * incremented when a positional argument is 'consumed'
   */
  $argument_index = 0;

  // parse options
  $options = [
    'backend' => GOFAST_IMPORT_BACKEND_TYPE_EXECUTE,
    'active_sheet' => (bool) drush_get_option('active-sheet', FALSE),
  ];

  // Handle flag to explicitly log to stdout.
  $output_log_file = STDERR;
  if (drush_get_option('stdout-log', FALSE)) {
    $output_log_file = STDOUT;
  }
  $options['output_logger'] = gofast_import__get_default_logger($output_log_file);

  // Handle dry-run back-end switching
  if (drush_get_option('dry-run', FALSE)) {
    $options['backend'] = GOFAST_IMPORT_BACKEND_TYPE_DRY_RUN;
  }

  // Quiet flag: replace output logger with function doing nothing.
  if (drush_get_option('quiet', FALSE)) {
    $options['output_logger'] = fn() => NULL;
  }

  // sheet index option
  if ($sheet_index = drush_get_option('sheet-index')) {
    $options['sheet_index'] = (int) $sheet_index;
  } elseif (!$options['active_sheet']) {
    $options['sheet_index'] = 0;
  }

  // sheet name option
  if ($sheet_name = drush_get_option('sheet-name')) {
    $options['sheet_name'] = (string) $sheet_name;
  }

  // file path option
  if (($file_path = drush_get_option('file-path')) && !is_bool($file_path)) {
    $options['file_path'] = (string) $file_path;
  }

  if (!isset($options['file_path']) && isset($arguments[$argument_index])) {
    $options['file_path'] = $arguments[$argument_index++];
  }

  if (!isset($options['file_path'])) {
    drush_set_error('MISSING_IMPORT_FILE', "No file identifier was passed, cannot proceed with import.");
    return;
  }

  // Handle relative paths from calling location instead of drupal root.
  if (!str_starts_with($options['file_path'], '/')) {
    $options['file_path'] = gofast_import__join_path([drush_cwd(), $options['file_path']]);
  }

  // Call realpath to ensure that ., .., or any remaining extra separator are
  // handled and we get an absolute path.
  // Call may return false if file does not exist, keep old path for error
  // reporting as file existence and type checking is done after.
  $options['file_path'] = realpath($options['file_path']) ?: $options['file_path'];

  if (!is_file($options['file_path'])) {
    drush_set_error(
      'INVALID_IMPORT_FILE',
      strtr(
        "The specified path '@file' either does not exist or is not a file.",
        [
          '@file' => $options['file_path'],
        ],
      ),
    );
    return;
  }

  // Handle user for import
  $uid = $GLOBALS['user']->uid;
  // User is anonymous
  if ($uid == 0) {
    if (drush_confirm('You are currently trying to import using an anonymous'
      . ' user, import using the main admin instead?')) {
      $uid = 1;
    } elseif (!drush_confirm('You chose to run the import as an anonymous user,'
      . ' the import may not work completely if at all, are you sure you wish '
      . 'to continue?')) {
      echo 'Tip: you can select a user using the --user or -u option and passing'
        . ' a user id number or user name'
        . PHP_EOL;
      return;
    }
  }
  $options['runner_uid'] = $uid;

  // execute import using user space membership spreadsheet front-end
  $logger = gofast_import__get_watchdog_compatible_drush_logger();
  [$errors] = gofast_import__import_user_space_membership_spreadsheet([
    ...$options,
    'logger' => $logger,
  ]);

  if (!empty($errors)) {
    gofast_import__log_errors($logger, $errors);
    if (gofast_import__is_errors_array_fatal($errors)) {
      drush_set_error(
        'IMPORT_FAILED',
        'The spreadsheet import failed due to the previous errors and/or warnings.'
      );
    }
    return;
  }
}
