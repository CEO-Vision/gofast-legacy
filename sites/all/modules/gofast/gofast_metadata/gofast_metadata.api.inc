<?php

// Where we store the Alfresco Share login session
define("GOFAST_SHARE_COOKIE", "sites/default/files/swf/share_model_token.txt");
// URL to login to Share
define("GOFAST_SHARE_LOGIN_URL", "http://localhost:8080/share/page/dologin");
// URL to Share service handling Alfresco models, used to get a CSRF token to submit with
define("GOFAST_SHARE_MODEL_SERVICE_URL", "http://localhost:8080/share/service/cmm/model-service");
// URL to the submit callback for Share model service
define("GOFAST_SHARE_MODEL_SERVICE_FORM_URL", 'http://localhost:8080/share/page/console/admin-console/custom-model-manager');
// Alfresco API endpoint to generate a .zip containing a model
define("GOFAST_ALFRESCO_API_MODEL_SERVICE_URL", 'http://localhost/share/proxy/alfresco-api/-default-/private/alfresco/versions/1/cmm');

/**
 * Given a module name, will return expected Alfresco model and aspect names for that module.
 * @return array
 */
function gofast_metadata_get_model_definition($module_name)
{
    return [
        "model_lower" => str_replace("_", "-", $module_name), // "gofast_metadata" would become "gofast-metadata"
        "model_upper" => implode('_', array_map('ucfirst', explode('_', $module_name))), // "gofast_metadata" becomes "Gofast_Metadata"
        "aspect_name" => $module_name . "_metadata",
    ];
}

/**
 * Alter a cURL request for Alfresco Share authentication
 * @return string an Alfresco CSRF token.
 */
function gofast_metadata_authenticate_share_request(&$ch, $content_type = "application/json")
{
    $jsessionid = gofast_metadata_login_to_share();
    if (!$jsessionid) {
        throw new Exception("Could not login to Alfresco Share");
    }
    $token = gofast_metadata_generate_model_service_token();
    if (!$token) {
        throw new Exception("Could not retrieve Alfresco-CSRFToken");
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Alfresco-CSRFToken: $token",
        "Content-Type: $content_type",
        "Cookie: JSESSIONID=$jsessionid;",
    ]);
    return $token;
}

/**
 * Login to Alfresco Share and retrieve the logged session JSESSIONID.
 *  @return string|false will be false if an error occurred
 */
function gofast_metadata_login_to_share()
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://localhost:8080/share/page/dologin");
    $data = [
        "username" => "admin",
        "password" => gofast_get_admin_pwd(),
    ];
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_COOKIEJAR, GOFAST_SHARE_COOKIE);

    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); // include header in the output

    $response = curl_exec($ch);

    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $header_size);
    curl_close($ch);
    if (preg_match('/Set-Cookie: JSESSIONID=([^;]+)/', $header, $matches)) {
        return urldecode($matches[1]); // the cookie is url-encoded but it is expected to be decode when passed in the headers
    } else {
        return false;
    }
}

/**
 * Will get a CSRF token to be able to submit to Alfresco Share model service.
 * Since this is a CSRF token it is regenerated at each new form render.
 * This is why we have to regenerate and get it back before each request to the model service.
 * @return string|false will be false if an error occurred 
 */
function gofast_metadata_generate_model_service_token()
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, GOFAST_SHARE_MODEL_SERVICE_FORM_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); // include header in the output
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_COOKIEFILE, GOFAST_SHARE_COOKIE); // cookie handling
    curl_setopt($ch, CURLOPT_COOKIEJAR, GOFAST_SHARE_COOKIE);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        echo 'Error:' . curl_error($ch);
        return false;
    }

    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $header_size);
    curl_close($ch);
    if (preg_match('/Set-Cookie: Alfresco-CSRFToken=([^;]+)/', $header, $matches)) {
        return urldecode($matches[1]); // the cookie is url-encoded but it is expected to be decode when passed in the headers
    } else {
        return false;
    }
}

function gofast_metadata_request_model_service($data, $meta)
{
    // Prepare request to service
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, GOFAST_SHARE_MODEL_SERVICE_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $meta["verb"]);
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    gofast_metadata_authenticate_share_request($ch);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        echo 'Error:' . curl_error($ch);
        return false;
    }

    // Proceed to fallback request if needed
    $info = curl_getinfo($ch);
    if (!empty($meta["retry"]) && $info["http_code"] == $meta["retry"]["code"]) {
        $continue = true;
        if (drupal_is_cli()) {
            $prompt = drush_prompt(dt("The entity already exists. Do you want to force update it? Some data may be lost if you do so. y/n"), "y");
            $continue = $prompt == "y";
        }
        if ($continue) {
            $data["operation"] = $meta["retry"]["operation"];
            $data["arguments"] = $meta["retry"]["arguments"];
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $meta["retry"]["verb"]);
            $response = curl_exec($ch);
        }
    }
    curl_close($ch);
    return $response;
}

/**
 * Given a module name, make the request to generate the .zip file containing the related Alfresco model.
 */
function gofast_metadata_request_model_file($model_name) {
    $url = GOFAST_ALFRESCO_API_MODEL_SERVICE_URL . "/" . $model_name . "/download?extModule=true";

    // Request to generate .zip file
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "{}");
    curl_setopt($ch, CURLOPT_USERPWD, 'admin:' . gofast_get_admin_pwd());
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    gofast_metadata_authenticate_share_request($ch);
    $buffer = curl_exec($ch);
    curl_close($ch);
    $response = json_decode($buffer);
    if (!isset($response->entry)) {
        throw new Exception("Error generating model for the .zip file");
    }
    $reference = $response->entry->nodeRef;
    return $reference;
}