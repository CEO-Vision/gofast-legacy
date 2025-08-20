<?php

/**
 * @file
 * gofast_metadata_test_features.features.taxonomy.inc
 */

/**
 * Implements hook_taxonomy_default_vocabularies().
 */
function gofast_metadata_test_features_taxonomy_default_vocabularies() {
  return array(
    'metadata_test_voc' => array(
      'name' => 'Test Vocabulary',
      'machine_name' => 'metadata_test_voc',
      'description' => 'Vocabulary for testing purpose',
      'hierarchy' => 0,
      'module' => 'taxonomy',
      'weight' => 0,
      'language' => 'und',
      'i18n_mode' => 0,
      'base_i18n_mode' => 0,
      'base_language' => 'und',
      'rdf_mapping' => array(
        'rdftype' => array(
          0 => 'skos:ConceptScheme',
        ),
        'name' => array(
          'predicates' => array(
            0 => 'dc:title',
          ),
        ),
        'description' => array(
          'predicates' => array(
            0 => 'rdfs:comment',
          ),
        ),
      ),
    ),
  );
}
