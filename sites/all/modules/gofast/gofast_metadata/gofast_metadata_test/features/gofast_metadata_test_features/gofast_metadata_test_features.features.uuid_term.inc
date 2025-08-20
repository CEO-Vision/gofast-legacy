<?php

/**
 * @file
 * gofast_metadata_test_features.features.uuid_term.inc
 */

/**
 * Implements hook_uuid_features_default_terms().
 */
function gofast_metadata_test_features_uuid_features_default_terms() {
  $terms = array();

  $terms[] = array(
    'name' => 'Test Tag 1',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '153d7d0b-a026-4614-9fb5-ce1b967961e6',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'metadata_test_voc',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 0,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Test Tag 2',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '49ba1899-1966-4fd1-88ad-54482fcb3f2b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'metadata_test_voc',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 0,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Test Tag 3',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '6c68ba6c-d867-4845-b9c8-02504983348a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'metadata_test_voc',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 0,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Test Tag 4',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '22d91639-ea63-4870-a4be-f41618b45051',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'metadata_test_voc',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 0,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Test Tag 5',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '0a92cfcc-b3f9-45b0-802d-6e8b5b68982e',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'metadata_test_voc',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 0,
        ),
      ),
    ),
  );
  
  return $terms;
}