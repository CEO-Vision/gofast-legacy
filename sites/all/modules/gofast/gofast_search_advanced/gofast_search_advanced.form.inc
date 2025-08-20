<?php

/**
 * Implements hook_form_alter().
 */
function gofast_search_advanced_form_alter(&$form, &$form_state, $form_id) {
  if ($form['#form_id'] === 'user_profile_form') {
    $form["search_advanced_history"]["#access"] = 0;
  }
}


function gofast_search_form($form, &$form_state) {

  $form['space'] = array(
    '#type' => 'textfield',
    '#name' => 'ac-list-tags-list-spaces',
    '#title' => t('Space(s)'),
    '#attributes' => array(
      'placeholder' => t('Start entering a space name...'),
      'class' => [' form-control-tags js-tagify text-truncate'],
      'data-get-spaces' => '',
      'data-exclude-root-spaces' => '',
    ),
  );

  $form['content_type'] = array(
    '#type' => 'select',
    '#options' => gofast_search_advanced_get_categories(),
    '#title' => t('Category(ies)', array(), array("context" => "gofast:gofast_search_advanced")),
    '#attributes' => array(
      'placeholder' => t('Select content category(ies)'),
      'multiple' => true,
      'style' => array("width: 100%"),
    ),
  );
  $form['search_label'] = array(
    '#type' => 'textfield',
    '#title' => t('Search'),
    '#attributes' => array(
      'placeholder' => t('Enter one or more keywords', array(), array("context" => "gofast:gofast_search_advanced")),
    ),
  );

  return $form;
}


function gofast_search_advanced_history_clear_confirm_form($form, &$form_state){
  $selected = $_POST['selected_ids'];
  if($selected){
    $form['selected_ids'] = array(
      "#type" => "textfield",
      '#attributes' => array(
        'class' => array('d-none')
      ),
      "#value" => $selected
    );
    $markup = t("Are you sure you want to delete the selected items ?", array(), array("context" => "gofast:gofast_search_advanced"));
  }else{
    $markup = t("Are you sure you want to delete the advanced search history ?", array(), array("context" => "gofast:gofast_search_advanced"));
  }
  
  $form['confirm_clear_label'] = array(
    '#type' => 'item',
    '#markup' => $markup,
  );

  $form['submit'] = array(
    '#type' => 'submit',
     '#value' => t('Delete history'),
    "#attributes" => array(
      'class' => array("btn btn-success")
    )
  );
  return $form;
}

function gofast_search_advanced_history_clear_confirm_form_submit($form, &$form_state){
  
  $selected_ids = $form['selected_ids']['#value'];
  
  // Clear only selected items if any
  if(!empty($selected_ids)){
    $selected_ids = explode(' ', $selected_ids);
    gofast_search_advanced_history_clear($selected_ids);
  }else{
    // Else clear all history
    gofast_search_advanced_history_clear();
  }
}
