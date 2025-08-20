<?php

/**
 * Display the modal holding the OnlyOffice convert form.
 */
function gofast_onlyoffice_convert_modal($js, $node) {
    drupal_set_title(t("Document conversion", [], ["context" => "gofast:gofast_onlyoffice"]));
    $form_id = "gofast_onlyoffice_convert_form";
    if (!$js) {
        return drupal_get_form($form_id, $node->nid);
    }

    ctools_include('modal');
    ctools_include('ajax');

    $form_state = array(
        'ajax' => TRUE,
        're_render' => FALSE,
        'no_redirect' => TRUE,
        'build_info' => array(
            'args' => array(
                'node' => $node,
            )
        ),
        'title' => null
    );

    $commands = ctools_modal_form_wrapper($form_id, $form_state);

    if ($form_state['executed']) {
      $commands[] = ctools_modal_command_dismiss();
      $commands[] = gofast_command_processAjax("/node/$node->nid");
    }
    $commands = array_merge($commands, gofast_ajaxification_get_toast_messages());

    print ajax_render($commands);
    exit;
}

function gofast_onlyoffice_convert_form($form, &$form_state, $node) {
    $extension = strtolower(gofast_cmis_node_get_extension($node));
    $options = gofast_onlyoffice_get_conversion_table()[$extension];
    $form ['conversion_warning'] = [
        '#type' => 'markup',
        '#markup' => "<div class='alert alert-custom alert-notice alert-light-warning fade show' role='alert'><div class='alert-icon'><i class='flaticon-warning'></i></div><div class='alert-text m-0'><span class='font-weight-bold'>" . t("The conversion process will create a new version of the document in the target format with the matching extension.", [], ["context" => "gofast:gofast_onlyoffice"]) . "</span></div></div>"
    ];
    $form['target_format'] = [
        '#prefix' => '<h3>' . t("Target format", [], ["context" => "gofast:gofast_onlyoffice"]) . "</h3>",
        '#type' => 'select',
        '#options' => $options,
    ];
    gofast_modal_set_form_buttons($form);
    return $form;
}

function gofast_onlyoffice_convert_form_submit($form, &$form_state) {
    global $base_url;

    // First we parse the source and target extensions again
    $node = $form_state['build_info']['args']['node'];
    $extension = strtolower(gofast_cmis_node_get_extension($node));
    $options = gofast_onlyoffice_get_conversion_table()[$extension];
    $option_index = (int) $form_state["values"]["target_format"];
    $target_format = $options[$option_index];

    // We get the Alfresco item and content URL
    $reference = gofast_cmis_node_get_item_id($node);
    $ticket = gofast_cmis_webservice_generate_alfresco_ticket("admin");
    $doc_raw_item_id =  gofast_cmis_get_raw_item_id($node->{GOFAST_CMIS_REFERENCE_FIELD}[LANGUAGE_NONE][0]['value']);
    $alfresco_item = gofast_cmis_item_get($node->{GOFAST_CMIS_REFERENCE_FIELD}[LANGUAGE_NONE][0]['value']);
    $doc_last_modification_date = $alfresco_item->properties['cmis:lastModificationDate'];
    $doc_id = $doc_raw_item_id . '_' . GenerateRevisionId($doc_last_modification_date);
    $url_alfresco_content = $base_url . "/alfresco/s/api/node/content/" . str_replace(":/","",$reference) . "?alf_ticket=" . $ticket;

    // We do the actual conversion
    $request_body = gofast_cmis_convert_document($node, $url_alfresco_content, $target_format, $doc_id, TRUE);

    // And return early
    $html = theme("onlyoffice_convert_progress", ["node" => $node, "url" => DOC_SERV_CONVERTER_URL, "request_body" => json_encode($request_body)]);
    $commands[] = ctools_modal_command_dismiss();
    $commands[] = ctools_modal_command_display(t("In progress", array(), array('context' => 'gofast:taxonomy')), $html);
    drupal_json_output($commands);
    drupal_exit();
}
