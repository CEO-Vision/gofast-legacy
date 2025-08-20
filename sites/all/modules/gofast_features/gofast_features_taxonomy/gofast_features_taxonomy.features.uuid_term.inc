<?php

/**
 * @file
 * gofast_features_taxonomy.features.uuid_term.inc
 */

/**
 * Implements hook_uuid_features_default_terms().
 */
function gofast_features_taxonomy_uuid_features_default_terms() {
  $terms = array();

  $terms[] = array(
    'name' => 'Email',
    'description' => 'An email file
',
    'format' => 'plain_text',
    'weight' => 15,
    'uuid' => '027878dc-1d6b-421e-81b8-6037e7e0a817',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';eml;msg;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-envelope-o file-mail',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'SVG',
    'description' => 'A SVG file',
    'format' => 'plain_text',
    'weight' => 3,
    'uuid' => '042649a3-4c0f-4af7-b7dc-69f9394157b2',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';svg;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-image-o image-svg',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'C3 – Restricted / Secret / Sensitive sovereign',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => '04ea8dab-b2d6-41ef-99bb-700182ac3e26',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
          'uuid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'French Military',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification_type',
  );
  $terms[] = array(
    'name' => 'EUCI',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification_type',
  );
  $terms[] = array(
    'name' => 'CIS TLP',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification_type',
  );
  $terms[] = array(
    'name' => 'Done',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '1bdfdf50-f460-4600-9662-ff1870d8db29',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Critical',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '1c1b24ce-f26c-4a82-b78d-9e4c592324bb',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'Internal Distribution',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '245eb1de-161a-4181-8580-341225c01b82',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'To Validate',
    'description' => '',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '1ce68f6c-068b-4242-bd46-904bbf7eaecc',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Awaiting signature',
    'description' => '',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '1e3c4721-a787-46bd-8bf7-03929e32ba32',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Contract',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 6,
    'uuid' => '1edf6b08-b366-4323-915d-63840ccd74a9',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Vectorial presentation',
    'description' => 'Vectorial presentation',
    'format' => 'plain_text',
    'weight' => 22,
    'uuid' => '2331133e-656e-4517-ac1a-208592fd84c5',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';odg;pub;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-text-o file-odg',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Rejected',
    'description' => '',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '26badcce-87b0-4b93-9c90-c66e3df7f27c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Other',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 11,
    'uuid' => '2b50a40d-0751-4a3d-a55e-8cf52d8d87ba',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'ac8298ec-32c5-4e9f-b209-e0edddf66fb9',
    ),
  );
  $terms[] = array(
    'name' => 'Userlist',
    'description' => '<p>Userlist</p>
',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '2d80cdf5-d2f2-492d-a7dc-7e95996fbf81',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';userlist;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-users userlist',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Draft',
    'description' => 'Draft',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '35ec26c0-10f4-41ed-8373-9e260f9a8c94',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Private Space',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 9,
    'uuid' => '36d6aaee-75ed-45e2-8f4c-73b8ab539ee3',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';private_space;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-home',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Normal',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 2,
    'uuid' => '374ad1b1-3018-4e45-af72-e2bbba4e8d2f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'Text file',
    'description' => 'A Text file with .txt.extension',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '39860739-843e-46e3-b448-f30dcc153c43',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';txt;sh;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-text-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Extranet',
    'description' => 'An extranet space',
    'format' => 'plain_text',
    'weight' => 12,
    'uuid' => '404bd087-9928-4d7e-9108-c318cd77c17d',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';extranet;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-globe extranet',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Conference',
    'description' => 'Conference, Visio
',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '480cc27f-223e-44c8-aa77-fb2d903eab7c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';conference;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-video-camera',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Spreadsheet Document',
    'description' => 'A Spreadsheet file like Excel
',
    'format' => 'plain_text',
    'weight' => 5,
    'uuid' => '4fa7e52a-8a5a-4b92-82a3-f1382d2559b2',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';xls;xlsx;ods;xlsm;xltm;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-excel-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Public',
    'description' => 'A public space',
    'format' => 'plain_text',
    'weight' => 4,
    'uuid' => '5342fb2d-9235-4016-98ba-b11e71f701c3',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';public;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-share-alt',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Obsolete',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '592d5a53-1bbe-428c-bfee-67e5111c947b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Audio',
    'description' => 'Audio file',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '5f342b8e-f115-4771-8609-c986d9da98f9',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';mp3;wav;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-sound-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Picture',
    'description' => 'A Picture file',
    'format' => 'plain_text',
    'weight' => 18,
    'uuid' => '61e912a2-7439-438b-b012-125967a87c6f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';jpg;jpeg;tiff;png;bmp;webp;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-image-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Archive',
    'description' => 'An Archive file, like zip
',
    'format' => 'plain_text',
    'weight' => 24,
    'uuid' => '61ea50e8-4511-4ebf-a3bd-f76b2716c9ac',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';zip;bz2;rar;7zip;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-archive-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Validated',
    'description' => '',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '6b81ccdf-1c26-4432-a067-daf1504acba7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Wiki article',
    'description' => 'A Wiki page',
    'format' => 'plain_text',
    'weight' => 7,
    'uuid' => '6c4054f5-4aef-4994-98d9-2b4b4bc75e8f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';article;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-newspaper-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Invoice',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 8,
    'uuid' => '7028233c-9977-4236-b9cb-247e63a034aa',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Presentation',
    'description' => 'A Presentation file like PowerPoint',
    'format' => 'plain_text',
    'weight' => 19,
    'uuid' => '7796ea2b-8393-41dc-9fa6-245312411ae8',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';ppt;pptx;odp;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-powerpoint-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Other',
    'description' => 'Undefined format
',
    'format' => 'plain_text',
    'weight' => 21,
    'uuid' => '78173f22-eebc-443a-bb64-4377596d96f5',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';default;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-o file-other',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Organisation',
    'description' => 'Organisation collaborative Space',
    'format' => 'plain_text',
    'weight' => 23,
    'uuid' => '7c400b02-877d-481a-a372-079e1af153aa',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';organisation;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-sitemap',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Application',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 12,
    'uuid' => '8261336c-8340-4b96-bce2-705206bf998b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Pre-Archived',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '856899f7-6792-40c3-84d1-4d10e5fd4a2b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Presentation',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 9,
    'uuid' => '8745aac2-cbd7-423f-8ec7-65824a08ece7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'PDF Image',
    'description' => 'PDF non OCRisé
',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => '892a2640-8d27-495f-a665-5ceaa8e60d59',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';pdf_image;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-pdf-o pdf-image',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Top Secret Defence',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 14,
    'uuid' => '8c948f9c-2c6f-40fc-8646-363e3421f96e',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
          'uuid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Confidential Data',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '901358ab-35fc-4eb4-9fbb-d335ea836758',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'CAO',
    'description' => 'A CAO file, like Solidworks
',
    'format' => 'plain_text',
    'weight' => 14,
    'uuid' => '9177ec36-2b57-4dc6-909d-4f50835162f0',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';sldprt;slddrw;sldasm;step;igs;iges;dxf;dwg;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-o file-cao',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Forum',
    'description' => 'A forum
',
    'format' => 'plain_text',
    'weight' => 11,
    'uuid' => '93de18c0-3ddd-4317-8c84-7caa9964dc14',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';forum;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-comments-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Civil Organization',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification_type',
  );
  $terms[] = array(
    'name' => 'Outbound (e)mail',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 10,
    'uuid' => 'b17fae5d-373f-4540-bab3-a1402bcfac9c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'External Web Page',
    'description' => 'An External Web Page',
    'format' => 'plain_text',
    'weight' => 13,
    'uuid' => 'b326fe3d-1d5c-4044-b79d-dc8f78180fd2',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';external_page;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-globe external-page',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'In Progress',
    'description' => '<p>In Progress</p>
',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'b5dcca31-9dfa-4ea1-b51d-d128ea0a5196',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Form',
    'description' => 'A form',
    'format' => 'plain_text',
    'weight' => 10,
    'uuid' => 'bd095ec9-988d-43ac-b272-4e63dd6c3d2f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';webform;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-list-alt file-webform',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Inbound (e)mail',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 4,
    'uuid' => 'c39d5846-6789-4f4d-b66a-029791a0ea03',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Specification',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 1,
    'uuid' => 'c65ca575-8c89-48c4-a3a8-c41ccd211314',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '1dfb455c-5089-42e7-8be3-56436264c25a',
    ),
  );
  $terms[] = array(
    'name' => 'Group',
    'description' => 'Group collaborative Space
',
    'format' => 'plain_text',
    'weight' => 16,
    'uuid' => 'c8d39b32-61d6-4263-a2b7-da695b46e133',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';group;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-users',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Low',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => 'cbc9b096-b075-4a14-95a0-6dc4a5987b2b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'Signed',
    'description' => '',
    'format' => 'plain_text',
    'weight' => 0,
    'uuid' => 'd1771148-d81a-4099-824b-a6ce932486c6',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'PDF',
    'description' => 'A PDF document
',
    'format' => 'plain_text',
    'weight' => 20,
    'uuid' => 'd34bc99c-e961-49de-9db7-cbc47b396938',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';pdf;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-pdf-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'C2 – Confidential / Sensitive',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 2,
    'uuid' => 'd350abef-e0af-4c02-8dad-b0afa45fa041',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
          'uuid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Profil',
    'description' => 'A user profile',
    'format' => 'plain_text',
    'weight' => 8,
    'uuid' => 'd3c55831-8f05-4379-b845-ad213d699654',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';user_profile;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-id-card-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Visio',
    'description' => 'A Visio file',
    'format' => 'plain_text',
    'weight' => 6,
    'uuid' => 'd68c8b68-45c5-4ff1-afd9-cd6db2f6c4f7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';vsd;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-o file-visio',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Personal Data',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 1,
    'uuid' => 'dc7440e1-3260-429d-826d-6dc7d8554866',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'Documentation',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 5,
    'uuid' => 'dd5cca08-9592-49a2-b18d-87c8720553ac',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Video',
    'description' => 'A Video file',
    'format' => 'plain_text',
    'weight' => 1,
    'uuid' => 'dd5e25f3-494c-46a9-b046-5f4c886f2c5a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';wma;wmv;avi;flv;mp4;webm;mpg;mov;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-video-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'To Do',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'e35313b5-c593-4fe9-9992-7aae53335e29',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'state',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'C1 – Internal',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 1,
    'uuid' => 'e9102eb4-e891-408e-992e-827933b92345',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
          'uuid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Secret Defence',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 13,
    'uuid' => '10ddee46-e89e-4e2a-be13-4228db73b993',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
          'uuid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Restricted Diffusion',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 12,
    'uuid' => '123e4567-e89b-12d3-a456-426614174000',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
          'uuid' => '18910c4b-182e-43c5-9b45-ab890c19793f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'EU Restricted',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 4,
    'uuid' => '332108c8-22ce-44ab-8403-f2104af6593a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
          'uuid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'EU Confidential',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 5,
    'uuid' => '90227f22-fa70-4c8b-b154-8c001dbbee5f',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
          'uuid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'EU Secret',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 6,
    'uuid' => '09502a91-093e-469e-a054-f9d8826e4b9c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
          'uuid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'EU Top Secret',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 7,
    'uuid' => 'bd3fdb50-6389-4842-b7dd-ce3cef6baa33',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
          'uuid' => '6e1c579f-7f4b-4c94-ba0f-a7824352024a',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'NC – Unclassified / Public',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'dee88d73-89a3-4809-864e-3b3000a16b94',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
          'uuid' => 'a95660f3-492d-410f-b464-a0fa6597989f',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'TLP:CLEAR',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 8,
    'uuid' => '54fb7aff-3592-4b20-9a69-1bd5501f9d5a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
          'uuid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'TLP:AMBER+STRICT',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 10,
    'uuid' => '0b7bb205-5139-4bed-b00c-bb723a027d4f',
    'language' => 'und',
    'i18n_tsid' => 10,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
          'uuid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'TLP:GREEN',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 9,
    'uuid' => 'aa3f4a1e-e3e7-4d1a-a2f9-61c9cb2d66d9',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
          'uuid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'TLP:RED',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 11,
    'uuid' => 'f7f448ff-8b01-4387-b082-9aae317a02db',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'classification',
    'field_classification_type' => array(
      'und' => array(
        0 => array(
          'tid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
          'uuid' => 'd0cfc3e6-48d2-441f-ae3e-fa2820990e07',
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'HTML',
    'description' => 'An HTML document',
    'format' => 'plain_text',
    'weight' => 17,
    'uuid' => 'f0e01087-7832-4239-ac45-415b81730d8b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';html;xhtml;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-code-o html',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Webform',
    'description' => '<p>Icon for webform</p>
',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'f2fcb5a9-451e-47ec-bbe4-0b86ad86867b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';webform;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-list-alt file-webform',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'Procedure',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 3,
    'uuid' => 'f335adf1-03d3-4453-9071-b81ae214f7a5',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '986a3326-766d-4e7d-b453-96b675f851c3',
    ),
  );
  $terms[] = array(
    'name' => 'Text Document',
    'description' => 'A text document like Word or LibreOffice',
    'format' => 'plain_text',
    'weight' => 2,
    'uuid' => 'f3ab0e3a-939a-4018-8c03-c792cc305cb4',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'format',
    'field_extensions' => array(
      'und' => array(
        0 => array(
          'value' => ';doc;docx;odt;dotx;rtf;',
          'format' => NULL,
        ),
      ),
    ),
    'field_icone' => array(
      'und' => array(
        0 => array(
          'value' => 'fa-file-word-o',
          'format' => NULL,
        ),
      ),
    ),
  );
  $terms[] = array(
    'name' => 'High',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 1,
    'uuid' => 'f9adc91d-c63b-4506-8e29-2c4f568f6b98',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'criticity',
  );
  $terms[] = array(
    'name' => 'Delivery note',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '01ac7b05-d726-4520-ac5a-3986cc8d6464',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Planning',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '0f6ae3bf-bafb-4080-8dc6-a79e3f4bf121',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6fc1eaf9-5353-4cae-b533-f156232021a7',
    ),
  );
  $terms[] = array(
    'name' => 'Budget',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '11cadc0c-d823-4d10-965a-4d2c4b023549',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Order',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '13dee0a7-0ba6-4ca1-98bc-0058a95ba639',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Technical',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '1dfb455c-5089-42e7-8be3-56436264c25a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Blueprint',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '1f0074c9-9404-4a0c-91db-0827ffdaba7c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '1dfb455c-5089-42e7-8be3-56436264c25a',
    ),
  );
  $terms[] = array(
    'name' => 'Expense report',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '5d033d5c-4a17-42e1-a2be-0858377a562a',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Agenda',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '5ed7d14b-9e32-47d2-a129-75460723336e',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Email',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '6d19cc4d-dba2-4e4b-bb17-4f621ff59934',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Legal',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Project Management',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '6fc1eaf9-5353-4cae-b533-f156232021a7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Article',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '7111eeac-24f0-4113-965c-b48b844365c7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Purchase order',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '7347b787-d370-4a56-b715-4774be5bab12',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Minutes',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '75750f23-0f30-4138-92f7-e045001696cb',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Court decision',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '84cee35f-2c43-4b53-830a-118dd54bfcef',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Statement',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '8a8db3b5-8bdb-495f-b2e7-9a33215807a2',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Service note',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '8b1f24b1-c165-45d1-bc88-006223d1512b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '986a3326-766d-4e7d-b453-96b675f851c3',
    ),
  );
  $terms[] = array(
    'name' => 'Work stoppage',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '8be7117a-89c5-4ed2-ace3-8fd2b8d77a09',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Commitment',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '94e01de0-02bd-4dfb-9546-7c7cb10121fa',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Operational',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '986a3326-766d-4e7d-b453-96b675f851c3',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Report',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => '99abf669-3e34-475f-8dfa-59854e86b85b',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Financial',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Organizational Chart',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'bdb53909-4bee-4c3d-9af4-98791b01a0e6',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Legal Text',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'c4ff25d5-6724-4343-97b4-9cfbd878c2ed',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Agreement',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'cc05e639-3e86-41d6-ab39-bb513a3ad719',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Announcement',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'd05f32ca-810f-42e5-8ddc-ad48cc3d3521',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'ef788c9b-1b61-4a48-b604-23ed13953889',
    ),
  );
  $terms[] = array(
    'name' => 'Call for tenders',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'd120a734-c840-45d4-8490-8ee4298b2571',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '1dfb455c-5089-42e7-8be3-56436264c25a',
    ),
  );
  $terms[] = array(
    'name' => 'Employment Records',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'd60eb4aa-67f1-4a71-98b6-b8435081c44c',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Administrative',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Deed',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'dd7f07c9-de08-4aef-b832-5082cbf44358',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => '6f2daed0-3d2c-48bf-af89-666f463e5d8b',
    ),
  );
  $terms[] = array(
    'name' => 'Study',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'eac44a0c-a86f-426b-a36b-c45602e7a9e1',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'dc45a58c-0a76-4ac9-950e-55a43ef27bd0',
    ),
  );
  $terms[] = array(
    'name' => 'Marketing and Sales',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'ef788c9b-1b61-4a48-b604-23ed13953889',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Financial report',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'f1941382-f754-47b2-b7e7-55347d874c87',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Pay slip',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'f714c6c9-dfd4-4eef-81d9-b58c89a2fee8',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    ),
  );
  $terms[] = array(
    'name' => 'Human Resources',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'f78beb28-2624-4a99-b347-bbe9f10fc1c7',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );
  $terms[] = array(
    'name' => 'Quote',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'c35719bf-dd0c-402f-a53f-8e2455f62fe5',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
    'parent' => array(
      0 => 'a88f8616-c232-489d-934c-d9f49d3301e2',
    ),
  );
  $terms[] = array(
    'name' => 'Miscellaneous',
    'description' => '',
    'format' => 'filtered_html',
    'weight' => 0,
    'uuid' => 'ac8298ec-32c5-4e9f-b209-e0edddf66fb9',
    'language' => 'und',
    'i18n_tsid' => 0,
    'vocabulary_machine_name' => 'category',
    'og_taxonomy_category_group' => array(),
    'field_standard_gf' => array(
      'und' => array(
        0 => array(
          'value' => 1,
        ),
      ),
    ),
    'field_naming_rules' => array(),
  );

  return $terms;
}
