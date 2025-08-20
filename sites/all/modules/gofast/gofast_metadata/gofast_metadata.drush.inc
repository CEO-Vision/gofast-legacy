<?php

/**
 * Implements hook_drush_command().
 */
function gofast_metadata_drush_command()
{
    $items = array();

    $items['add-declared-metadata-fields'] = array(
        'description' => dt('Creates Drupal fields for each module implementing declared metadata'),
        'bootsrap' => DRUSH_BOOTSTRAP_DRUPAL_FULL
    );
    $items['add-declared-metadata-alfresco'] = array(
        'description' => dt('Creates Alfresco aspects for each module implementing declared metadata'),
        'bootsrap' => DRUSH_BOOTSTRAP_DRUPAL_FULL
    );
    $items['export-declared-metadata-alfresco'] = array(
        'description' => dt('Export aspects for declared metadata as .zip files in matching modules folders'),
        'bootsrap' => DRUSH_BOOTSTRAP_DRUPAL_FULL
    );
    $items['import-declared-metadata-alfresco'] = array(
        'description' => dt('Import aspects for declared metadata as .zip files in matching modules folders'),
        'bootsrap' => DRUSH_BOOTSTRAP_DRUPAL_FULL
    );
    return $items;
}

/**
 * Add optional fields after the target Drupal module.
 * If the fields already exist, the user will be prompted whether to delete and recreate them or not.
 */
function drush_gofast_metadata_add_declared_metadata_fields() {
    $hook_name = 'declare_metadatas';
    $modules = module_implements($hook_name);
    $modules = drush_choice_multiple(drupal_map_assoc($modules), FALSE, dt("Select from which modules you want the metadata to be deployed:"), "!value", "[X] !value", 1);
    foreach ($modules as $module) {
        $function = $module . '_' . $hook_name;
        if (!function_exists($function)) {
            continue;
        }
        $declaration = $function();
        if (empty($declaration) || empty($declaration["metadatas"])) {
            continue;
        }
        $metadata = $declaration["metadatas"];
        drush_print(dt("Will add fields for module !module", ["!module" => $module]));
        foreach ($metadata as $field) {
            if ($field["type"] == "separator") {
                continue;
            }
            gofast_metadata_add_drupal_field_from_drush($field);
        }
    }
}

function gofast_metadata_add_drupal_field_from_drush($field) {
    $info = field_info_field($field["name"]);
    if (!empty($info)) {
        $prompt = drush_prompt(dt("Field !field already exists, do you want to delete and recreate it again? If you do this, you will lose all existing data within those fields. You may want to update the features instead. y/n", ["!field" => $field["name"]]), "y");
        if ($prompt == "y") {
            drush_print(dt("Will proceed to field !field deletion", ["!field" => $field["name"]]));
            drush_op('field_delete_field', $field["name"]);
        } else {
            drush_print(dt("Will skip !field field", ["!field" => $field["name"]]));
            return;
        }
    }
    drush_print(dt("Will proceed to field !field creation", ["!field" => $field["name"]]));
    $field_base = ['field_name' => $field["name"], 'type' => $field["is_multi"] ? "list_text" : "text_long"];
    drush_op('field_create_field', $field_base);
    $entity_type = $field["entity_type"] ?: "node";
    foreach($field["bundles"] as $bundle) {
        $field_instance = ['field_name' => $field["name"], 'entity_type' => $entity_type, 'bundle' => $bundle];
        drush_op('field_create_instance', $field_instance);
    }
}

function drush_gofast_metadata_add_declared_metadata_alfresco()
{
    $hook_name = 'declare_metadatas';
    $modules = module_implements($hook_name);
    $modules = drush_choice_multiple(drupal_map_assoc($modules), FALSE, dt("Select from which modules you want the metadata to be deployed:"), "!value", "[X] !value", 1);
    foreach ($modules as $module) {
        $function = $module . '_' . $hook_name;
        if (!function_exists($function)) {
            continue;
        }
        $declaration = $function();
        if (empty($declaration) || empty($declaration["metadatas"])) {
            continue;
        }
        $metadata = $declaration["metadatas"];
        drush_print(dt("Will add model and aspect for module !module", ["!module" => $module]));
        $model_definition = gofast_metadata_get_model_definition($module);
        gofast_metadata_add_alfresco_aspect($model_definition);
        foreach ($metadata as $field) {
            if ($field["alfresco_field"]) {
                drush_print(dt("Will add field !field in aspect of module !module", ["!field" => $field["name"], "!module" => $module]));
                gofast_metadata_add_alfresco_field($model_definition, $field);
            }
        }
    }
}

/**
 * Add a model on Alfresco named after the target Drupal module.
 * Then add an aspect into that model.
 * If the model already exists, it will try to update it instead.
 * Alfresco Share APIs are used to make the request.
 */
function gofast_metadata_add_alfresco_aspect($model_definition)
{
    // Prepare request data
    extract($model_definition);

    // First add the model holding the aspect
    $data = [
        "modelName" => $model_upper,
        "operation" => "createModel",
        "data" => [
            "status" => "ACTIVE",
            "namespaceUri" => $model_lower . "/model/1.0",
            "namespacePrefix" => $model_lower,
            "name" => $model_upper,
            "description" => "",
            "author" => "",
        ],
    ];
    // Defines what to do if the response code is 409 (model already existing)
    $meta = [
        "verb" => "POST",
        "retry" => [
            "code" => 409,
            "operation" => "editModel",
            "arguments" => ["name" => $model_upper],
            "verb" => "PUT",
        ],
    ];
    gofast_metadata_request_model_service($data, $meta);

    // Secondly add the aspect
    $data = [
        "modelName" => $model_upper,
        "operation" => "createPropertyGroup",
        "arguments" => [
            "name" => $model_upper,
        ],
        "data" => [
            "description" => "",
            "title" => "",
            "name" => $aspect_name,
            "parentName" => "gofast:nodeproperties",
        ],
    ];
    $meta = [
        "verb" => "POST",
        "retry" => [
            "code" => 409,
            "operation" => "editPropertyGroup",
            "arguments" => ["name" => $model_upper],
            "verb" => "PUT",
        ],
    ];
    gofast_metadata_request_model_service($data, $meta);
}

/**
 * Add field to target Afresco aspect.
 * The field must be structured as the fields in the hook declare_metadatas.
 */
function gofast_metadata_add_alfresco_field($model_definition, $field)
{
    $type = "d:text";
    if ($field["type"] == "switch") {
        $type = "d:boolean";
    }
    if ($field["is_timestamp"]) {
        $type = "d:datetime";
    }

    // Prepare request data
    extract($model_definition);

    $data = [
        "modelName" => $model_upper,
        "operation" => "createProperty",
        "data" => [
            "name" => $aspect_name,
            "properties" => [
                [
                    "name" => $field["name"],
                    "title" => $field["title"],
                    "multiValued" => $field["is_multi"] ? true : false,
                    "mandatory" => false,
                    "mandatoryEnforced" => false,
                    "defaultValue" => "",
                    "dataType" => $type,
                    "indexed" => true,
                    "facetable" => "FALSE",
                    "indexTokenisationMode" => "TRUE",
                    "description" => "",
                ],
            ],
        ],
        "arguments" => [
            "name" => $model_upper,
            "entityClass" => "aspects",
            "entityName" => $aspect_name,
        ],
    ];
    $meta = [
        "verb" => "PUT",
        "retry" => [
            "code" => 409,
            "operation" => "editProperty",
            "arguments" => $data["arguments"] + ["propertyName" => $field["name"]],
            "verb" => "PUT",
        ],
    ];
    gofast_metadata_request_model_service($data, $meta);
}

/**
 * Export module-related Alfresco model into a .zip file and put in in the module src folder.
 */
function drush_gofast_metadata_export_declared_metadata_alfresco() {
    // Select a target module
    $hook_name = 'declare_metadatas';

    $modules = module_implements($hook_name);
    $module = drush_choice(drupal_map_assoc($modules), dt("Select from which module you want the metadata to be deployed:"));
    $function = $module . '_' . $hook_name;
    if (!function_exists($function)) {
        return;
    }
    $declaration = $function();
    if (empty($declaration) || empty($declaration["metadatas"])) {
        return;
    }
    $model_definition = gofast_metadata_get_model_definition($module);
    extract($model_definition);

    // Build URL
    drush_print(dt("Requesting .zip file"));
    $reference = gofast_metadata_request_model_file($model_upper);

    // Now we wait for the .zip file to be ready
    drush_print(dt("Waiting for .zip file to be ready"));
    $url = "http://localhost/share/proxy/alfresco/api/internal/downloads/" . str_replace(":/", "", $reference) . "/status";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    gofast_metadata_authenticate_share_request($ch);
    $buffer = curl_exec($ch);
    $response = json_decode($buffer);
    while ($response->status != "DONE") {
        sleep(1);
        $buffer = curl_exec($ch);
        $response = json_decode($buffer);
    }

    // Downloading .zip file
    drush_print(dt("Download .zip file"));
    $url = "http://localhost/share/proxy/alfresco/api/node/content/" . str_replace(":/", "", $reference) . "/$model_upper.zip";
    curl_setopt($ch, CURLOPT_URL, $url);
    $buffer = curl_exec($ch);
    echo $buffer;
    $file_path = DRUPAL_ROOT . '/' . drupal_get_path('module', $module) . "/src";
    mkdir($file_path);
    echo $file_path;
    file_put_contents($file_path . "/$model_upper.zip", $buffer);
    curl_close($ch);
    drush_print(dt("The operation is a success"));
}

/**
 * Export module-related Alfresco model from the .zip file located in the module src folder.
 */
function drush_gofast_metadata_import_declared_metadata_alfresco() {
    // Select a target module
    $hook_name = 'declare_metadatas';

    $modules = module_implements($hook_name);
    $module = drush_choice(drupal_map_assoc($modules), dt("Select from which module you want the metadata to be deployed:"));
    $function = $module . '_' . $hook_name;
    if (!function_exists($function)) {
        return;
    }
    $declaration = $function();
    if (empty($declaration) || empty($declaration["metadatas"])) {
        return;
    }
    $model_definition = gofast_metadata_get_model_definition($module);
    extract($model_definition);

    // Prepare upload request
    drush_print(dt("Starting .zip upload"));
    $ch = curl_init();
    $token = gofast_metadata_authenticate_share_request($ch, "multipart/form-data");
    $url = "http://localhost/share/proxy/alfresco/api/cmm/upload?Alfresco-CSRFToken=" . $token;
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Prepare file for upload request
    $file_path = DRUPAL_ROOT . '/' . drupal_get_path('module', $module) . "/src";
    $file = new CURLFile("$file_path/$model_upper.zip", "application/zip");
    curl_setopt($ch, CURLOPT_POSTFIELDS, ["file" => $file]);

    // Proceed to upload request
    curl_setopt($ch, CURLOPT_HEADER, true); // include header in the output

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        echo "Error: " . curl_error($ch);
        return;
    }
    $info = curl_getinfo($ch);
    if ($info["http_code"] == 409) {
        drush_print(dt("Model is already imported: abort"));
        return;
    }

    // Activate model
    drush_print(dt(".zip upload succesful, now activating the model"));

    $data = [
        "modelName" => $model_upper,
        "operation" => "activateModel",
        "arguments" => ["name" => $model_upper],
        "data" => [
            "status" => "ACTIVE",
        ],
    ];
    $meta = [
        "verb" => "PUT",
        "retry" => [],
    ];
    $buffer = gofast_metadata_request_model_service($data, $meta);
    $response = json_decode($buffer);

    if ($response && $response->entry) {
        drush_print(dt("Activation was succesful"));
    } else {
        drush_print(dt("Activation failed"));
    }
}