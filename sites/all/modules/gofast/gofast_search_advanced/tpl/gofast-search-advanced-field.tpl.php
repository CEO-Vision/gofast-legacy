<label><?= $field['title'] ?></label>
<?php if($field['type'] != 'date'): ?>
    <div class="form-field-operator d-flex w-100">
        <select class="custom-select custom-select-sm grid-item-left form-select-field-operator mr-2" style="width:5rem">
            <option value="equal">&#x3D; </option>
            <option value="not-equal">&#8800; </option>
            <?php // Show "includes" operator on specific field (the operator doean't work on field entity_id for now) 
            if(in_array($field['type'], ["input", "only_user_ac", "user_ac"]) && $field['solr_field'] != "entity_id") : ?>
            <option value="includes">< ></option>
            <?php endif; ?>
        </select>
<?php endif; ?>
<?php switch ($field['type']) {
    case 'input':
        print '<input type="text" class="form-control form-control-sm search-advanced-filter-item" style="width: 0px;flex-grow: 1;" name="' . $field['solr_field'] .  '" data-id="advanced-filters-'. $key .'">';
        break;
    case 'select':
        print '<select class="form-control form-control-sm gofast-select2 search-advanced-filter-item" name="' . $field['solr_field'] .  '" data-id="advanced-filters-'. $key .'" data-placeholder="'.t("Select").'" style="width: 0px; flex-grow: 1;">
        <option></option>';
        foreach ($field['fields'] as $key => $value) :
            if(isset($value['tid'])){
                print '<option id="' . $field['solr_field'] . "-" . $value['tid'] . '" value="' . $value['tid'] . '"> ' . $value['text'] . '</option>';
            }else if(isset($value['id'])){
                print '<option id="' . $field['solr_field'] . "-" . $value['id'] . '" value="' . $value['id'] . '"> ' . $value['text'] . '</option>';
            }else{
                print '<option id="' . $field['solr_field'] . "-" . $key . '" value="' . $value . '"> ' . $value . '</option>';
            }
        endforeach;
        print '</select>';
        break;
    case 'date':
        print '<div class="d-flex w-100 form-search-date">';
            print '<select class="custom-select custom-select-sm form-select-date form-select-field-operator mr-2" aria-label="" style="width:5rem">';
            print '<option value="between" selected>< ></option>';
            print '<option value="lower">></option>';
            print '<option value="higher"><</option>';
            print '</select>';

            print '<div class="input-group" style="width: 0px;flex-grow: 1;">';
                print '<input type="text" class="form-control form-control-sm form-control-date gofastDateRangetimepicker search-advanced-filter-item" name="' . $field['solr_field'] .  '" data-id="advanced-filters-'. $key .'"/>';
                print '<span class="input-group-text">';
                    print '<i class="fad fa-calendar fs-1"></i>';
                print '</span>';
            print '</div>';
        print '</div>';
        break;
    case 'tagify':
        print '<div id="tags-list-ac" class="overflow-hidden d-flex flex-grow-1 form-tagify search-advanced-filter-item" name="' . $field['solr_field'] .  '" style="width: 0px;">';
            print '<input class="js-tagify text-truncate form-control form-control-sm form-control-tags metadata-node" placeholder="'. t("Try adding tags from the list", array(), array("context" => "gofast:gofast_search_advanced")) .'" data-taxonomy_term="" data-vid="' . $field['vid'] . '" data-pk="" type="text" id="edit-field-custom-keywords" data-name="' . $field['name'] . '" name="ac-list-tags-custom-keywords" maxlength="" data-oninput="' . $field['oninput'] . '">';
            print '<input class="gofast_display_none w-100" type="text" id="edit-actagify-ac-list-tags-custom-keywords" name="gofast_tagify_ac">';
        print '</div>';
        break;
    case 'switch':
        print '<select class="form-control form-control-sm gofast-select2 gofast-select2-switch w-100 search-advanced-filter-item" name="' . $field['solr_field'] .  '" data-id="advanced-filters-'. $key .'" data-placeholder="'.t("Select").'">
        <option></option>';
        print '<option id="' . $field['solr_field'] . '-Oui" value="Oui"> ' . t('Yes') . '</option>';
        print '<option id="' . $field['solr_field'] . '-Non" value="Non"> ' . t('No') . '</option>';
        print '</select>';
        break;
    case 'only_user_ac':
    case 'user_ac':
            print '<select class="form-control form-control-sm gofast-select2-ajax search-advanced-filter-item" name="' . $field['solr_field'] . '" data-id="advanced-filters-'. $key .'" data-placeholder="'.t("Select").'" data-only-user="'.($field['type'] == "only_user_ac").'" style="width:0px; flex-grow: 1;">';
            print '</select>';
        break;
    default:
        # code...
        break; 
} ?>
<?php if($field['type'] != 'date'): ?>
    </div>
<?php endif; ?>

