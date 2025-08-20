<?php

function gofast_search_advanced_declare_standard_metadatas(){
  $metadatas_name = t("Standard metadata", array(), array('context' => 'gofast:gofast_search_advanced'));
  
  $metadata = array();
  $metadata['nid'] = array(
    'solr_field' => 'entity_id',
    'title' => t('Node ID'),
    'type' => 'input',
    'fieldset' => "default"
  );
  $metadata['entity_type'] = array(
    'solr_field' => 'entity_type',
    'filter_hidden' => true,
    'search_column_hidden' => true,
  );
  $metadata['im_field_format'] = array(
    'solr_field' => 'im_field_format',
    'title' => t('Type'),
    'type' => 'select',
    'fields' => gofast_advanced_search_get_taxonomy('field_format'),
  );
  $metadata['label'] = array(
    'solr_field' => 'label',
    'title' => t('Title'),
    'filter_hidden' => true,
  );
  $metadata['sm_og_group_content_ref'] = array(
    'solr_field' => 'formatedGroupes',
    'title' => t('Spaces'),
    'filter_hidden' => true,
  );
  $metadata['sm_vid_State'] = array(
    'solr_field' => 'im_field_state',
    'title' => t('State'),
    'type' => 'select',
    'fields' => gofast_advanced_search_get_taxonomy('field_state'),
  );
  $metadata['im_field_tags'] = array(
    'solr_field' => 'im_field_tags',
    'name' => 'field_tags',
    'vid' => 11,
    'title' => t('Tags',array(),array('context' => 'gofast:gofast-search')),
    'type' => 'tagify',
  );
  $metadata['sm_vid_Category'] = array(
    'solr_field' => 'sm_vid_Category',
    'title' => t('Category'),
    'filter_hidden' => true,
  );
  $metadata['sm_vid_Criticity'] = array(
    'solr_field' => 'im_field_criticity',
    'title' => t('Criticity', [], ['context' => 'gofast']),
    'type' => 'select',
    'fields' => gofast_advanced_search_get_taxonomy('field_criticity'),
  );
  $metadata['sm_vid_Classification'] = array(
    'solr_field' => 'im_field_classification',
    'title' => t('Classification', [], ['context' => 'gofast']),
    'type' => 'select',
    'fields' => gofast_advanced_search_get_taxonomy('field_classification'),
  );
  $metadata['tos_unr_author'] = array(
    'solr_field' => 'tos_unr_author',
    'title' => t('Author'),
    'type' => 'user_ac',
  );
  $metadata['tos_name'] = array(
    'solr_field' => 'tos_name',
    'title' => t("Creator"),
    'type' => 'only_user_ac',
  );
  $metadata['is_uid'] = array(
    'solr_field' => 'is_uid',
    'filter_hidden' => true,
    'search_column_hidden' => true,
  );
  $metadata['is_mod_uid'] = array(
    'solr_field' => 'is_mod_uid',
    'filter_hidden' => true,
    'search_column_hidden' => true,
  );
  $metadata['tos_mod_name'] = array(
    'solr_field' => 'tos_mod_name',
    'title' => t("Last modifier"),
    'type' => 'only_user_ac',
  );
  $metadata['ds_custom_date'] = array(
    'solr_field' => 'ds_custom_date',
    'title' => GOFAST_METADATA_CUSTOM_DATE_LABEL,
    'type' => 'date' ,
  );
  $metadata['ds_created'] = array(
    'solr_field' => 'ds_created',
    'title' => t('Creation date'),
    'type' => 'date',
  );
  $metadata['ds_changed'] = array(
    'solr_field' => 'ds_changed',
    'title' => t('Last updated'),
    'type' => 'date',
  );
  $metadata['ds_field_date'] = array(
    'solr_field' => 'ds_field_date',
    'title' => t('Deadline'),
    'type' => 'date',
  );
  $metadata['tos_unr_document_reference'] = array(
    'solr_field' => 'tos_unr_document_reference',
    'title' => t('Document reference'),
    'type' => 'input',
  );
  $metadata['ss_language'] = array(
    'solr_field' => 'ss_language',
    'title' => t('Language'),
    'type' => 'select',
    'fields' => gofast_advanced_search_get_language(),
  );
  $metadata['ps_popularity'] = array(
    'solr_field' => 'ps_popularity',
    'title' => t('Popularity'),
    'filter_hidden' => true,
  );
  $metadata['bs_status'] = array(
    'solr_field' => 'bs_status',
    'title' => t('Status', array(), array('context' => 'gofast:gofast_search_advanced')),
    'type' => 'select',
    'fields' => array(
      1 => t('Not deleted'),
      0 => t('Deleted'),
    ),
    'filter_hidden' => false,
    'search_column_hidden' => true,
  );

  return array(
    'name' => $metadatas_name,
    'metadatas' => $metadata,
  );
}
