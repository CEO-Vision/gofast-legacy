<?php

/**
 * @file
 * Spreadsheet import front-end functions, constants, and implementation.
 */

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet;

// Spreadsheet header values for each column type
/** Value of a type header cell for a user column */
define('GOFAST_IMPORT_TYPE_HEADER_USER', 'USER');
/** Value of a type header cell for a user list column */
define('GOFAST_IMPORT_TYPE_HEADER_USERLIST', 'LISTE');
/** Value of a type header cell for an organisation column */
define('GOFAST_IMPORT_TYPE_HEADER_ORGANISATION', 'ORG');
/** Value of a type header cell for a group column */
define('GOFAST_IMPORT_TYPE_HEADER_GROUP', 'GRP');
/** Value of a type header cell for an extranet column */
define('GOFAST_IMPORT_TYPE_HEADER_EXTRANET', 'EXT');

/** Define expected column count, order and map them to member property names. */
define('GOFAST_IMPORT_MEMBER_COLUMN_MAPPING', [
  'type',
  'name',
  'last_name',
  'first_name',
  'email',
]);

/**
 * Parse a spreadsheet of users, spaces, users lists and their memberships
 * according to the given options.
 *
 * Parsing is done row-by-row from top to bottom, the first few rows are treated
 * as special and thus iterated on manually. Each row is parsed as a whole one
 * time.
 *
 * NOTE: An alternative design could be to parse the first row to get which part
 * is users, which is spaces and user lists, then iterate over user rows to get
 * a list of members by row. Then, iterate on the remaining columns for each
 * user list or space until none is left. This could make the code maybe a bit
 * more easily understandable.
 *
 * @param array{
 *  file_path?: string|null,
 *  logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  output_logger?: callable(string $type, string $message, array $variables=, int<0,7> $severity=): void,
 *  runner_uid: numeric,
 *  backend: string,
 *  sheet_index?: int,
 *  sheet_name?: string,
 * } $options Spreadsheet import options.
 * @return array{0:array|null,1:null|mixed} A tuple with errors at
 *  index 0, and an array of commands at index 1.
 */
function gofast_import__parse_user_space_membership_spreadsheet($options) {
  gofast_import__require_phpspreadsheet_autoload();
  $spreadsheet = gofast_import__open_spreadsheet($options);

  if (isset($options['sheet_name'])) {
    $spreadsheet->getSheetByName($options['sheet_name']);
  } elseif (isset($options['sheet_index'])) {
    $spreadsheet->setActiveSheetIndex($options['sheet_index']);
  }

  // starting coordinates for parsing and iterating on the membership table
  // possible improvement: pass table start (top left) coordinate as option.
  $start_column = 'A';
  $start_row = 2;

  $worksheet = $spreadsheet->getActiveSheet();
  $row_iter = $worksheet->getRowIterator($start_row);

  // parse type headers on first row, expects all cells in the row (except the
  // first one it skips) to be filled, the first empty cell determines the end
  // of the table
  $first_row = $row_iter->current();
  [$errors, $result] = gofast_import__try_parse_import_type_header_row($first_row, $start_column);
  if (!empty($errors)) {
    return [$errors, NULL];
  }
  [
    'column_type_mapping' => $column_type_mapping,
    'end_column' => $end_column,
  ] = $result;

  // split user columns from other columns
  [$user_columns, $membership_column_type_mapping] = gofast_import__split_user_columns_from_type_mapping($column_type_mapping);

  // Assert the file has the right number of user columns
  $error = gofast_import__verify_user_column_count_matches_expected($user_columns);
  if ($error) {
    return [[$error], NULL];
  }

  $user_start_column = reset($user_columns);
  $user_end_column = end($user_columns);
  $membership_start_column = array_key_first($membership_column_type_mapping);
  // alias for clarity and consistency
  $membership_end_column = $end_column;

  // Assert there was no error when getting column boundaries.
  assert(
    is_string($user_start_column)
      && is_string($user_end_column)
      && is_string($membership_start_column),
  );

  $row_iter->next();

  // Parse identifier row of user lists and spaces, columns with an empty
  // identifier are discarded at this point.
  // User lists expect a name as an identifier, spaces expect a path.
  $second_row = $row_iter->current();

  // We call spaces and user lists aggregate items for brevity sake
  [$errors, $aggregate_items_mapping] = gofast_import__try_parse_element_identifiers_row(
    $second_row,
    $column_type_mapping,
    $membership_start_column,
    $membership_end_column
  );

  if (!empty($errors)) {
    return [$errors, NULL];
  }
  $row_iter->next();

  // Parse userlist/group properties
  // Parse description row
  $description_row = $row_iter->current();
  $aggregate_items_mapping = gofast_import__parse_description_row($description_row, $aggregate_items_mapping);
  $row_iter->next();

  // parse member/membership part (rest of the table)
  // members include user lists and users.
  $members = [];

  // reset row iterator start to current row so already used rows are "consumed",
  // since foreach rewinds the iterator before iterating.
  $row_iter->resetStart($row_iter->current()->getRowIndex());
  // iterate each remaining rows until a row is without a user.
  foreach ($row_iter as $row) {
    $member = gofast_import__try_parse_member($row, $user_start_column, $user_end_column);
    if ($member === NULL) {
      break;
    }
    $members[] = $member;
    // modifies $aggregate_items_mapping in place.
    // Feel free to refactor so a return value is used instead.
    gofast_import__parse_memberships_row($row, $member, $aggregate_items_mapping);
  }

  // We have all the import data from the spreadsheet, but it is still too
  // spreadsheet-oriented so transform into an easier to manipulate shape for
  // the middle-end
  $import_data = [
    'users' => array_filter(
      $members,
      fn($member) => $member['type'] === GOFAST_IMPORT_MEMBER_TYPE_USER
    ),
    ...gofast_import__iterable_group_by(
      $aggregate_items_mapping,
      fn($item) => match ($item['type']) {
        GOFAST_IMPORT_ITEM_TYPE_USERLIST => 'user_lists',
        GOFAST_IMPORT_ITEM_TYPE_EXTRANET,
        GOFAST_IMPORT_ITEM_TYPE_GROUP,
        GOFAST_IMPORT_ITEM_TYPE_ORGANISATION => 'spaces',
      },
    ),
  ];

  return [NULL, $import_data];
}

/**
 * Open spreadsheet file for reading as part of import.
 *
 * @param array{file_path?:string} $options Opening options, the shape of this
 *  array determines how the spreadsheet is fetched and opened.
 * @return PhpSpreadsheet\Spreadsheet The opened spreadsheet.
 */
function gofast_import__open_spreadsheet($options) {
  return match (TRUE) {
    !empty($path = $options['file_path']) =>
    PhpSpreadsheet\IOFactory::createReaderForFile($path)
      ->setReadDataOnly(TRUE) // ensure reader is read-only
      ->load($path),
    // implement other file import methods here (e.g.: gofast node)
  };
}

/**
 * Convert type header value in spreadsheet to internal import type value.
 *
 * @param string $header_value Value of the header cell
 * @return GOFAST_IMPORT_COLUMN_TYPE_*|null Internal
 * value as described by GOFAST_IMPORT_COLUMN_TYPE_* constants or null in case
 * of an unknown type.
 */
function gofast_import__try_convert_spreadsheet_header_to_import_membership_type($header_value) {
  return match ($header_value) {
    GOFAST_IMPORT_TYPE_HEADER_USER => GOFAST_IMPORT_COLUMN_TYPE_USER,
    GOFAST_IMPORT_TYPE_HEADER_USERLIST => GOFAST_IMPORT_COLUMN_TYPE_USERLIST,
    GOFAST_IMPORT_TYPE_HEADER_ORGANISATION => GOFAST_IMPORT_COLUMN_TYPE_ORGANISATION,
    GOFAST_IMPORT_TYPE_HEADER_GROUP => GOFAST_IMPORT_COLUMN_TYPE_GROUP,
    GOFAST_IMPORT_TYPE_HEADER_EXTRANET => GOFAST_IMPORT_COLUMN_TYPE_EXTRANET,
    default => NULL,
  };
}

/**
 * Generate source ids to be able to link instances later.
 *
 * @return int The new source id.
 */
function _gofast_import__generate_spreadsheet_source_id() {
  static $id = 0;
  return $id++;
}

/**
 * Parse the given spreadsheet row as a type header row.
 *
 * Checks for each column except the first if it contains a known type value and
 * maps it to an internal import type value. The iteration stops if an empty
 * cell is encountered.
 *
 * @param PhpSpreadsheet\Worksheet\Row $row The spreadsheet row to parse for
 *  type headers
 * @param string $start_column The column the table starts (includes numbering
 *  column)
 * @return array{
 *  0: array{ error: string, message: string, variables: array<string, string> }[],
 *  1: array{
 *    column_type_mapping: array<string,GOFAST_IMPORT_COLUMN_TYPE_*>,
 *    end_column: string,
 *    end_column_index: int,
 *  }
 * } A tuple of errors and an array of results, including the last header type
 *  column name and index and a mapping from column names to import types. Check
 *  if the errors value is empty before using results.
 */
function gofast_import__try_parse_import_type_header_row($row, $start_column) {
  $start_column_index = Coordinate::columnIndexFromString($start_column);

  // get cell iterator skipping first column
  $row_cell_iter = $row->getCellIterator(Coordinate::stringFromColumnIndex($start_column_index + 1));

  // init output
  $end_column = $start_column;
  $errors = [];

  // build type mapping for each column
  $membership_column_type_mapping = [];
  foreach ($row_cell_iter as $column => $cell) {
    $value = $cell->getValue();
    // cell is empty, stop iteration and record end column values
    if (empty($value)) {
      break;
    }
    $end_column = $column;

    $import_membership_type = gofast_import__try_convert_spreadsheet_header_to_import_membership_type($value);
    // Check for error in case of unknown type.
    if ($import_membership_type === NULL) {
      $cell_coordinate = $cell->getCoordinate();
      $errors[] = [
        'type' => 'error',
        'code' => 'unknown_type',
        'message' => 'Type header cell @coordinate contains invalid type "@type"',
        'variables' => [
          '@coordinate' => $cell_coordinate,
          '@type' => $value,
        ],
      ];
      // report as many errors as possible at a time
      continue;
    }
    $membership_column_type_mapping[$column] = $import_membership_type;
  }

  return [
    $errors,
    [
      'column_type_mapping' => $membership_column_type_mapping,
      'end_column' => $end_column,
      'end_column_index' => Coordinate::columnIndexFromString($end_column),
    ],
  ];
}

/**
 * Maps column types to aggregate item arrays property name for that object's
 * identifying value.
 *
 * @param GOFAST_IMPORT_COLUMN_TYPE_* $column_type The type of the column for
 *  which to get the property name.
 * @return string|null The aggregate item property name for the column's
 *  identifying value.
 */
function gofast_import__try_map_column_type_to_property_name($column_type) {
  return match ($column_type) {
    GOFAST_IMPORT_COLUMN_TYPE_USER => NULL,
    GOFAST_IMPORT_COLUMN_TYPE_USERLIST => 'name',
    GOFAST_IMPORT_COLUMN_TYPE_ORGANISATION,
    GOFAST_IMPORT_COLUMN_TYPE_GROUP,
    GOFAST_IMPORT_COLUMN_TYPE_EXTRANET => 'path',
  };
}

/**
 * Parse the aggregate items (spaces and user lists) identifier row.
 *
 * @param PhpSpreadsheet\Worksheet\Row $row Row with the identifiers
 * @param array<string,GOFAST_IMPORT_COLUMN_TYPE_*> $column_type_mapping mapping
 *  of column to their type (user, user list, space)
 * @param string $start_column Table start column
 * @param string $end_column Table end column
 * @return array{
 *  0: array{ error: string, message: string, variables: array<string, string> }[],
 *  1: array<
 *    string,
 *    array{
 *      type: GOFAST_IMPORT_ITEM_TYPE_USERLIST
 *        | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION
 *        | GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *        | GOFAST_IMPORT_ITEM_TYPE_GROUP,
 *      name?: string,
 *      path?: string,
 *      memberships: array{role: string, member: array{name: string, type: string}}[],
 *    }
 *  >,
 * } A tuple of errors and a mapping of column coordinates to partial aggregate
 *  items including type, their identifier property and an empty membership array.
 */
function gofast_import__try_parse_element_identifiers_row($row, $column_type_mapping, $start_column, $end_column) {
  $errors = [];
  $aggregate_items_mapping = [];
  $row_cell_iter = $row->getCellIterator($start_column, $end_column);
  foreach ($row_cell_iter as $column => $cell) {
    $column_type = $column_type_mapping[$column];
    // ignore user columns
    if ($column_type === GOFAST_IMPORT_COLUMN_TYPE_USER) {
      continue;
    }
    // ignore columns with an empty identifier
    $value = $cell->getValue();
    if (empty($value)) {
      continue;
    }

    $identifier_property_name = gofast_import__try_map_column_type_to_property_name($column_type) ?? throw new LogicException('unreachable');

    // Add processed identifier
    $aggregate_items_mapping[$column] = [
      'type' => $column_type,
      $identifier_property_name => $value,
      'memberships' => [],
      'source_id' => _gofast_import__generate_spreadsheet_source_id(),
    ];
  }

  return [$errors, $aggregate_items_mapping];
}

/**
 * Parse user list and spaces description row.
 *
 * @param PhpSpreadsheet\Worksheet\Row $row Description row
 * @param array<
 *    string,
 *    array{
 *      type: GOFAST_IMPORT_ITEM_TYPE_USERLIST
 *        | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION
 *        | GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *        | GOFAST_IMPORT_ITEM_TYPE_GROUP,
 *      name?: string,
 *      path?: string,
 *      memberships: array{role: string, member: array{name: string, type: string}}[],
 *    }
 *  > $aggregate_items_mapping Previous mapping.
 * @return array<
 *    string,
 *    array{
 *      type: GOFAST_IMPORT_ITEM_TYPE_USERLIST
 *        | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION
 *        | GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *        | GOFAST_IMPORT_ITEM_TYPE_GROUP,
 *      name?: string,
 *      path?: string,
 *      memberships: array{role: string, member: array{name: string, type: string}}[],
 *      description?: string,
 *    }
 *  > New mapping with added description based on contents of provided row.
 */
function gofast_import__parse_description_row($row, $aggregate_items_mapping) {
  // Row class does not implement indexing or any method for random access of cells.
  $row_cell_iter = $row->getCellIterator();
  foreach ($aggregate_items_mapping as $column => &$aggregate_item) {
    $row_cell_iter->seek($column);
    $cell = $row_cell_iter->current();
    $value = $cell->getValue();
    if (!empty($value)) {
      $aggregate_item['description'] = $value;
    }
  }
  unset($aggregate_item);

  return $aggregate_items_mapping;
}

/**
 * Split a column type mapping into the user columns and the rest of the mapping.
 *
 * @param array<string,GOFAST_IMPORT_COLUMN_TYPE_*> $column_type_mapping
 * @return array{0:string[],1:array<string,GOFAST_IMPORT_COLUMN_TYPE_*>} Tuple
 *  of user column coordinates array and mapping of other columns.
 */
function gofast_import__split_user_columns_from_type_mapping($column_type_mapping) {
  $user_columns = [];
  $result_mapping = [];
  foreach ($column_type_mapping as $column => $type) {
    if ($type === GOFAST_IMPORT_COLUMN_TYPE_USER) {
      $user_columns[] = $column;
    } else {
      $result_mapping[$column] = $type;
    }
  }

  return [$user_columns, $result_mapping];
}

/**
 * Checks that the number of found user columns matches the expected number.
 *
 * @param string[] $user_columns Array of user column coordinates, or any array
 *  with one value per user column.
 * @return array{
 *  error: string,
 *  message: string,
 *  variables: array<string,string>,
 * }
 * |null Error for mismatched column counts, or null if column counts match.
 */
function gofast_import__verify_user_column_count_matches_expected($user_columns) {
  $user_column_count = count($user_columns);
  $mapping_column_count = count(GOFAST_IMPORT_MEMBER_COLUMN_MAPPING);
  if ($user_column_count !== $mapping_column_count) {
    return [
      'type' => 'error',
      'code' => 'invalid_user_column_count',
      'message' => 'Expected @expected_count user columns, got @actual_count. '
        . 'Make sure you are using the right version of the model file with the '
        . 'right version of the importer.',
      'variables' => [
        '@expected_count' => $mapping_column_count,
        '@actual_count' => $user_column_count,
      ],
    ];
  }
  return NULL;
}


/**
 * Parse member type from cell value string.
 *
 * @param string $value Cell value of a member type.
 * @return GOFAST_IMPORT_MEMBER_TYPE_USER|GOFAST_IMPORT_MEMBER_TYPE_USERLIST
 *  Internal member type constant.
 */
function gofast_import__parse_member_type($value) {
  return match ($value) {
    GOFAST_IMPORT_MEMBER_TYPE_USER_CELL_VALUE => GOFAST_IMPORT_MEMBER_TYPE_USER,
    GOFAST_IMPORT_MEMBER_TYPE_USERLIST_CELL_VALUE => GOFAST_IMPORT_MEMBER_TYPE_USERLIST,
  };
}

/**
 * Try parsing current member on the given row and between the given columns.
 *
 * @param PhpSpreadsheet\Worksheet\Row $row Current row being parsed.
 * @param string $start_column Member start column.
 * @param string $end_column Member end column.
 * @return array{
 *  type: string,
 *  name: string,
 *  last_name: string|null,
 *  first_name: string|null,
 *  email: string|null,
 * }|null Member array or null.
 */
function gofast_import__try_parse_member($row, $start_column, $end_column) {
  // specify the property corresponding to each column in the member/user part
  // of the spreadsheet by column order.
  $row_cell_iter = $row->getCellIterator($start_column, $end_column);
  $column_index = 0;
  $member = [];
  // collect values in row into member array, empty values are mapped to NULLs
  // NOTE: Might be better to use a function for empty strings rather than the
  // built-in empty construct
  foreach ($row_cell_iter as $cell) {
    $value = $cell->getValue();
    $member[GOFAST_IMPORT_MEMBER_COLUMN_MAPPING[$column_index]] = empty($value) ?
      NULL
      : $value;

    ++$column_index;
  }

  // if member id or type is not defined: consider user unspecified
  if (empty($member['name']) || empty($member['type'])) {
    return NULL;
  }

  $member['type'] = gofast_import__parse_member_type($member['type']);
  $member['source_id'] = _gofast_import__generate_spreadsheet_source_id();

  return $member;
}

/**
 * Parse a userlist membership.
 *
 * @param string $value Cell value for the a member of a user list column.
 * @return string[] Array of types of membership the value grants to the user
 *  for the associated user list.
 */
function gofast_import__parse_userlist_membership($value) {
  // Maybe refactor and move to middle-end (common) processing ?
  if ($value === GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_BOTH_CELL_VALUE) {
    return [
      GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN,
      GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_MEMBER,
    ];
  }

  $type = match ($value) {
    GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN_CELL_VALUE => GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_ADMIN,
    GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_MEMBER_CELL_VALUE => GOFAST_IMPORT_USERLIST_MEMBERSHIP_ROLE_MEMBER,
  };

  return [$type];
}

/**
 * Parse a membership value for a space member.
 *
 * @param string $value Cell value for the a member of a space column.
 * @return string[] Array of types of membership the value grants to the user
 *  for the associated space. In this case the returned array only ever has one
 *  element.
 */
function gofast_import__parse_space_membership($value) {
  $type = match ($value) {
    GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN_CELL_VALUE => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_ADMIN,
    GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER_CELL_VALUE => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_MANAGER,
    GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR_CELL_VALUE => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_CONTRIBUTOR,
    GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY_CELL_VALUE => GOFAST_IMPORT_SPACE_MEMBERSHIP_ROLE_READ_ONLY,
  };

  return [$type];
}

/**
 * Parse a membership cell value into memberships/relations between a member and
 * an aggregate item.
 *
 * @param string $value Cell value for the membership.
 * @param string $item_type Type of the aggregate item.
 * @return string[] The membership type(s) to add onto the aggregate item for
 *  the current item/member pair.
 */
function gofast_import__parse_membership_value($value, $item_type) {
  return match ($item_type) {
    GOFAST_IMPORT_ITEM_TYPE_USERLIST => gofast_import__parse_userlist_membership($value),
    GOFAST_IMPORT_ITEM_TYPE_EXTRANET,
    GOFAST_IMPORT_ITEM_TYPE_GROUP,
    GOFAST_IMPORT_ITEM_TYPE_ORGANISATION => gofast_import__parse_space_membership($value),
  };
}

/**
 * Parse spreadsheet membership part of row associating members with the
 * aggregate items they are a part of.
 *
 * @param PhpSpreadsheet\Worksheet\Row $row The row with the memberships of the
 *  member.
 * @param array{
 *  type: string,
 *  name: string,
 *  last_name: string|null,
 *  first_name: string|null,
 *  email: string|null,
 *  source_id: int,
 * } $member The concerned member array.
 * @param array<
 *    string,
 *    array{
 *      type: GOFAST_IMPORT_ITEM_TYPE_USERLIST
 *        | GOFAST_IMPORT_ITEM_TYPE_ORGANISATION
 *        | GOFAST_IMPORT_ITEM_TYPE_EXTRANET
 *        | GOFAST_IMPORT_ITEM_TYPE_GROUP,
 *      name?: string,
 *      path?: string,
 *      memberships: array{role: string, member: array{name: string, type: string}}[],
 *      description?: string,
 *    }
 *  > &$aggregate_items_mapping The mapping of columns to aggregate entities.
 *  Used to lookup the specific cells we need, memberships are added as they are
 *  found.
 * @return void Modifies value of memberships in aggregate_items_mapping
 */
function gofast_import__parse_memberships_row($row, $member, &$aggregate_items_mapping) {
  $row_cell_iter = $row->getCellIterator();
  foreach ($aggregate_items_mapping as $column => &$aggregate_item) {
    $cell = $row_cell_iter->seek($column)->current();
    $value = $cell->getValue();
    // ignore empty cells
    if (empty($value)) {
      continue;
    }
    $membership_types = gofast_import__parse_membership_value($value, $aggregate_item['type']);
    $aggregate_item['memberships'] = array_merge(
      $aggregate_item['memberships'],
      array_map(
        fn($type) => [
          'role' => $type,
          'item_source_id' => $aggregate_item['source_id'],
          'member' => [
            'name' => $member['name'],
            'type' => $member['type'],
            'source_id' => $member['source_id'],
          ],
        ],
        $membership_types,
      ),
    );
  }
}
