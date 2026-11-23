<?php

/**
 * Implements hook_theme().
 */
function gofast_naming_rules_theme()
{
    return array(
        'gofast_naming_rules_apply_category_confirm_modal' => array(
            'template' => 'tpl/gofast_naming_rules_apply_category_confirm_modal'
        ),
        'gofast_naming_rules_warning' => array(
            'template' => 'tpl/gofast_naming_rules_warning'
        ),
        'gofast_naming_rules_rule_container' => array(
            'template' => 'tpl/gofast_naming_rules_rule_container'
        ),
        'gofast_naming_rules_title_error' => array(
            'template' => 'tpl/gofast_naming_rules_title_error',
            'variables' => array('errors' => array(), 'chars' => array()),
        ),
    );
}

/**
 * Theme the tags before injecting the themed rules into the modal template.
 */
function gofast_naming_rules_preprocess_gofast_naming_rules_apply_category_confirm_modal(&$variables) {
    $node = $variables["node"];
    $term = $variables["term"];
    if ($term) {
        $term_name = i18n_taxonomy_localize_terms($term)->name;
        $variables["term_name"] = $term_name;
        $ruled_theme = gofast_naming_rule_get_node_ruled_value($node, $term, FALSE, TRUE)["value"];
        $ruled_value = gofast_naming_rule_get_node_ruled_value($node, $term, TRUE, FALSE);
        $variables["ruled_theme"] = $ruled_theme;
        $variables["ruled_value"] = $ruled_value["value"];
        $variables["has_all_metadata"] = $ruled_value["has_all_metadata"];
    }
}