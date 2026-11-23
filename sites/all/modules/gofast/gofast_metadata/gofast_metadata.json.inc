<?php

/**
 * @file
 * Contains all the logic related to parsing metadata from a JSON file.
 */

 function gofast_metadata_cron_check_json_queue()
{
  $json_queue = gofast_metadata_get_json_queue();
  foreach (array_keys($json_queue) as $json_nid) {
    $json_node = node_load($json_nid);
    if (!$json_node) {
      watchdog("gofast_metadata", "Queued json nid @nid has no node anymore : it is dropped from the queue and its acte needs a manual check", array("@nid" => $json_nid), WATCHDOG_ERROR);
      gofast_metadata_remove_json_from_queue($json_nid);
      continue;
    }
    try {
      gofast_metadata_handle_json_metadata($json_node);
    }
    catch (Exception $e) {
      // a pathological json must not hold back the rest of the queue
      watchdog_exception("gofast_metadata", $e);
      gofast_metadata_handle_json_failure($json_node, "Unexpected error while handling the json");
    }
  }
}

function gofast_metadata_handle_json_metadata($node) {
  $name = $node->title;
  $title = explode(".", $name);
  $json_ref = $node->reference;
  if (!$json_ref) {
    // the alfresco reference may just not be replicated yet
    gofast_metadata_handle_json_failure($node, "No alfresco reference found");
    return;
  }
  // json prefix is everything before the last "_" separator in the file name
  $json_title = $title[0];
  $json_title_elements = explode("_", $json_title);
  array_pop($json_title_elements);
  $json_prefix = implode("_", $json_title_elements);
  // get target nodes
  $json_target_nodes = gofast_metadata_get_nodes_from_json_prefix($json_ref, $json_prefix);
  if (empty($json_target_nodes)) {
    // the json often reaches Alfresco before the acte it documents
    gofast_metadata_handle_json_failure($node, "No target nodes found");
    return;
  }
  // parse json file
  $json_content = gofast_cmis_item_get_content($json_ref);
  $json_data = json_decode($json_content);
  if (!$json_data) {
    // an Alfresco hiccup on the content read is indistinguishable from a corrupted json here
    gofast_metadata_handle_json_failure($node, "Could not parse json file");
    return;
  }
  $all_nodes_updated = gofast_metadata_set_nodes_metadata_from_json($json_target_nodes, $json_data);
  // make sure all related nodes have been updated before removing the json file
  if (!$all_nodes_updated) {
    gofast_metadata_handle_json_failure($node, "Some target nodes are not replicated yet");
    return;
  }
  // empty queue before removing the json file
  gofast_metadata_remove_json_from_queue($node->nid);
  // hook_node_delete of gofast_cmis also removes the matching item from Alfresco
  node_delete($node->nid);
}

/**
 * Log a failed run and let the queue decide whether the json deserves another try
 */
function gofast_metadata_handle_json_failure($node, $reason) {
  try {
    $attempts_exhausted = gofast_metadata_fail_json_attempt($node->nid);
  }
  catch (Exception $e) {
    // only ever called from an error path : a database failure here must not raise a second one
    watchdog_exception("gofast_metadata", $e, "Attempt count for json file @title with nid @nid could not be updated, it stays queued : !message in %function (line %line of %file).", array("@title" => $node->title, "@nid" => $node->nid));
    return;
  }
  if ($attempts_exhausted) {
    watchdog("gofast_metadata", "@reason for json file @title with nid @nid : giving up after @attempts attempts, its acte needs a manual check", array("@reason" => $reason, "@title" => $node->title, "@nid" => $node->nid, "@attempts" => GOFAST_METADATA_JSON_MAX_ATTEMPTS), WATCHDOG_ERROR);
    return;
  }
  watchdog("gofast_metadata", "@reason for json file @title with nid @nid : will retry on the next cron run", array("@reason" => $reason, "@title" => $node->title, "@nid" => $node->nid), WATCHDOG_WARNING);
}

/**
 * Read the json queue straight from the database
 * The $conf cache built at bootstrap goes stale as soon as another PHP process writes the variable
 * @param boolean $for_update locking read, required before a write : it returns the latest committed
 *   value instead of the REPEATABLE READ snapshot, and holds the row until the enclosing transaction ends
 * @return array mapping each queued nid to its number of failed attempts
 */
function gofast_metadata_get_json_queue($for_update = FALSE) {
  $query = db_select("variable", "v")
    ->fields("v", array("value"))
    ->condition("v.name", GOFAST_METADATA_JSON_QUEUE);
  if ($for_update) {
    // locks the row, or the gap where it will be created, which serializes concurrent migrations too
    $query->forUpdate();
  }
  $value = $query->execute()->fetchField();
  if ($value !== FALSE) {
    $json_queue = unserialize($value);
    return is_array($json_queue)
      ? $json_queue
      : array();
  }
  // no row yet : the queue is still the legacy one, a list of nids whose keys mean nothing since
  // array_filter left them sparse on every removal, hence array_fill_keys on the values alone
  $legacy_value = db_query("SELECT value FROM {variable} WHERE name = :name", array(":name" => GOFAST_METADATA_JSON_QUEUE_LEGACY))->fetchField();
  $legacy_queue = ($legacy_value === FALSE)
    ? array()
    : unserialize($legacy_value);

  return is_array($legacy_queue)
    ? array_fill_keys(array_filter($legacy_queue), 0)
    : array();
}

/**
 * Add a json nid to the queue
 * The locking read holds the queue row until the enclosing transaction ends, which is what serializes
 * concurrent writers
 */
function gofast_metadata_add_json_to_queue($json_nid) {
  // kept in scope for the whole function : the queue row stays locked until this layer is closed
  $transaction = db_transaction();
  $json_queue = gofast_metadata_get_json_queue(TRUE);
  if (!isset($json_queue[$json_nid])) {
    $json_queue[$json_nid] = 0;
    variable_set(GOFAST_METADATA_JSON_QUEUE, $json_queue);
  }
}

/**
 * Count a failed run on a queued json and drop it once its attempts are exhausted
 * @return boolean whether the json has been dropped from the queue
 */
function gofast_metadata_fail_json_attempt($json_nid) {
  // kept in scope for the whole function : the queue row stays locked until this layer is closed
  $transaction = db_transaction();
  $json_queue = gofast_metadata_get_json_queue(TRUE);
  if (!isset($json_queue[$json_nid])) {
    return TRUE;
  }
  $json_queue[$json_nid]++;
  $attempts_exhausted = $json_queue[$json_nid] >= GOFAST_METADATA_JSON_MAX_ATTEMPTS;
  if ($attempts_exhausted) {
    unset($json_queue[$json_nid]);
  }
  variable_set(GOFAST_METADATA_JSON_QUEUE, $json_queue);
  return $attempts_exhausted;
}

/**
 * Remove a json nid from the queue
 * The locking read holds the queue row until the enclosing transaction ends, which is what serializes
 * concurrent writers
 */
function gofast_metadata_remove_json_from_queue($json_nid) {
  // kept in scope for the whole function : the queue row stays locked until this layer is closed
  $transaction = db_transaction();
  $json_queue = gofast_metadata_get_json_queue(TRUE);
  unset($json_queue[$json_nid]);
  variable_set(GOFAST_METADATA_JSON_QUEUE, $json_queue);
}

/**
 * Given a json ref and a json prefix, find all the nodes in the same folder(s) which have the same prefix
 * @return array of alfresco nodes
 */
function gofast_metadata_get_nodes_from_json_prefix($json_ref, $json_prefix) {
  $json_parents = gofast_cmis_webservice_get_node_parents($json_ref);
  $json_target_nodes = [];
  foreach ($json_parents as $json_parent) {
    $item = gofast_cmis_item_get_by_path($json_parent);
    $descendants = gofast_cmis_alfresco_api_get_descendants($item->id, "documents", TRUE, TRUE);
    foreach ($descendants as $descendant) {
      $title = explode(".", $descendant->name);
      $extension = array_pop($title);
      if ($extension == "json") {
        continue;
      }
      // we match files named exactly after the prefix, or prefix-XXX, or prefix_XXX, or prefix XXX, but we'll not match files named prefixXXX (so for example if the prefix is "DEL10", we'll not match files with the "DEL101" prefix): the prefix has to be clearly separated from the rest in the node title
      $pattern = "/^" . preg_quote($json_prefix, '/') . "([-_\s].*|)$/i";
      if (preg_match($pattern, $descendant->name)) {
        $json_target_nodes[] = $descendant;
      }
    }
  }
  return $json_target_nodes;
}

/**
 * Call hooks responsible for adding metadata from json to nodes
 * @return boolean whether all target nodes have been updated or not
 */
function gofast_metadata_set_nodes_metadata_from_json($json_target_nodes, $json_data) {
  $all_nodes_updated = TRUE;
  foreach($json_target_nodes as $target_node) {
    if (!isset($target_node->properties->{"gofast:nid"})) {
      watchdog("gofast_metadata", "No node found for document @name ; will try to replicate the node for the next cron job", array("@name" => $target_node->name), WATCHDOG_ERROR);
      // check if the node is just missing the gofast aspect or if it needs a full replication
      $nids = db_select("field_data_field_reference", "r")->fields("r", ["entity_id"])->condition("r.field_reference_value", "%" . $target_node->id . "%", "LIKE")->execute()->fetchCol();
      if (!empty($nids)) {
        $node = node_load($nids[0]);
        gofast_cmis_update_aspect_properties($node);
      } else {
        gofast_metadata_publication_replicate_node($target_node);
      }
      $all_nodes_updated = FALSE;
      continue;
    }

    $node = node_load($target_node->properties->{"gofast:nid"});
    if (!$node) {
      watchdog("gofast_metadata", "Document @name points to the missing node @nid : json metadata could not be added to it", array("@name" => $target_node->name, "@nid" => $target_node->properties->{"gofast:nid"}), WATCHDOG_ERROR);
      // the json must not be deleted while one of its target documents is left without its metadata
      $all_nodes_updated = FALSE;
      continue;
    }

    watchdog("gofast_metadata", "Add metadata to node @nid", array("@nid" => $target_node->properties->{"gofast:nid"}), WATCHDOG_INFO);

    // copy json string into node summary in case of data loss
    $node->body[LANGUAGE_NONE][0]['summary'] = json_encode($json_data);

    // parse all parsable fields contained in the json, calling the pastell_to_gofast_metadata hook
    foreach ($json_data as $json_field => $json_value) {
      $gofast_field = FALSE;
      if(count(module_implements("pastell_to_gofast_metadata_alter")) > 0) {
        drupal_alter("pastell_to_gofast_metadata", $json_data, $json_field, $json_value, $gofast_field);
      }
      if ($gofast_field) {
        $node->$gofast_field[LANGUAGE_NONE][0]['value'] = $json_value;
      }
    }

    // call another hook for node-scope modifications (category, related nodes, etc.)
    if(count(module_implements("pastell_to_gofast_node_alter")) > 0) {
      drupal_alter("pastell_to_gofast_node", $json_data, $json_target_nodes, $node);
    }

    $node = gofast_prepare_node_save_technically($node);
    $ruid = $node->revision_uid ?: GOFAST_USER_ADMINISTRATOR_ID;
    node_save($node);
    db_update('node_revision')
      ->fields(array('uid' => $ruid))
      ->condition('nid', $node->nid)
      ->execute();
  }
  return $all_nodes_updated;
}

function gofast_metadata_publication_replicate_node($item) {
  $name = $item->name;
  $person = $item->properties->{"cm:author"} ?: "adm";
  $language = user_load_by_name(trim($person))->language ?: LANGUAGE_NONE;
  $parent_path = $item->path;
  $gid = gofast_og_get_group_id_from_title_without_cmis($parent_path, TRUE);
  if (strpos($item->id, "workspace://SpacesStore/") === FALSE) {
    $item->id = "workspace://SpacesStore/" . $item->id;
  }
  gofast_cmis_create_node_programmatically($item->id, $person, $name, FALSE, $language, FALSE, $gid, $parent_path, "");    
}
