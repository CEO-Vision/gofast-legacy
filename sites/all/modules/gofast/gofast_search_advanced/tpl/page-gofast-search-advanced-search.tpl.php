<div id="gofast-search-advanced-page" class="pb-2 pt-2 px-1 d-flex flex-column h-100">
    <div class="accordion accordion-solid accordion-toggle-plus gofastBoostrapPanel" id="accordion1">
        <div class="card">
            <div class="card-header" id="filters-card-header">
                <div class="card-title collapsed" data-toggle="collapse" data-target="#filters-card-body" aria-expanded="false">
                        <?php echo t('Search and history', array(), array('context' => 'gofast:gofast_search_advanced')); ?>
                    </div>
            </div>


            <div id="filters-card-body" class="collapse show" aria-labelledby="filters-card-header" data-parent="#accordion1">
                <div class="card-body h-500px">
                    <div id="card-search-form-body">
                        <div id="search-form-body" class="pr-5 d-flex flex-column mt-4">
                            <?php echo render(drupal_get_form('gofast_search_form')); ?>
                            <div id="all-filters-container" style="max-height: 70%; overflow-y: scroll;">
                            <?php echo theme('gofast_search_advanced_form'); ?>
                            </div>

                            <div id="search-form-submit-section" class="d-flex flex-grow-1 flex-column justify-content-end">
                                <div class="separator separator-solid separator-border-2 my-4 w-100"></div>
                                <div class="d-flex flex-row align-items-center">

                                    <div class="form-item form-type-textfield form-group flex-grow-1 mr-5">
                                    <label><?= t('Search name (to save in history)') ?></label>
                                    <input id="search-name-input" type="text" class="form-control form-control-lg">
                                </div>
                                    <div id="search-form-submit-container" class="d-flex flew-row align-items-center">
                                <button class="btn btn-sm btn-primary mr-2" id="submit-advanced-search"><?php print t('Search') ?></button>
                                <button class="btn btn-sm btn-default btn-icon mr-2" id="submit-advanced-reset"><i class="fa fa-undo"></i></button>
                                <div class="radio-list" id="global-operator">
                                    <label class="radio radio-rounded">
                                        <input class="form-select-global-operator" type="radio" name="global-operator" value="and" checked>
                                        <span></span>
                                        <?= t('Satisfy all conditions') ?>
                                    </label>
                                    <label class="radio radio-rounded">
                                        <input class="form-select-global-operator" type="radio" name="global-operator" value="or">
                                        <span></span>
                                        <?= t('Satisfy at least one condition') ?>
                                    </label>
                                </div>
                            </div>
                        </div>
                            </div>
                        </div>
                        <div id="search-form-history" class="d-flex flex-column">
                            <div class="row align-items-end mx-0 mb-2">
                                <span class="offset-2 col-8 text-center"><?= t('Search history'); ?></span>
                                <div class="col-2 d-flex justify-content-center">
                                <?php print $contextual_menu; ?>
                                </div>
                            </div>
                            <div id="search-history">
                                <?php print theme('gofast_search_advanced_history'); ?>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
        <div class="card card-custom mt-5">
            <div class="card-header">
                <h3 class="card-title"><?= t('Search results', array(), array('context' => 'gofast:gofast_search_advanced')); ?></h3>
                <div class="card-toolbar">
                    <button id="advanced-search-export-results" class="btn btn-sm btn-icon btn-secondary mr-2 gofast__popover" onclick="Gofast.searchAdvanced.download_search_advanced_csv()" data-boundary="window" data-toggle="popover" data-placement="top" data-trigger="hover" data-html="true" data-container="body" data-content="<div class='py-2 px-4'><?= t("Export all search results (up to @max_results_size results)", array("@max_results_size" => number_format(GOFAST_EXPORT_RESULTS_MAX_SIZE, 0, ".", " ")), array("context" => "gofast:gofast_search_advanced")) ?></div>">
                        <i class="fa fa-file-excel-o"></i>
                    </button>
                    <button id="advanced-search-filter-column" class="btn btn-sm btn-icon btn-primary">
                        <i class="fal fa-cog"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="h-100 w-100 mb-5">
                    <div id="gofastAdvancedSearchResults" class="datatable datatable-bordered datatable-head-custom h-100"></div>
                    <div id="gofastAdvancedSearchBlankSearch" class="h-100 d-flex align-items-center">
                        <h4 class="w-100 text-center"><?= t("Start search to display results", array(), array("context" => "gofast:gofast_search_advanced")) ?></h4>
                    </div>
                </div>
            </div>
        </div>
    <script>
      jQuery(document).ready(function(){
        Gofast.searchAdvanced.initFilterValues()
      })
    </script>

    <style>
        #card-search-form-body {
            display: grid;
            grid-template-columns: 70% 30%;
            height: 100%;
        }

        #search-form-body {
            grid-column-start: 1;
            overflow-y: scroll;
            height: 100%;
        }

        #search-form-history {
            grid-column-start: 2;
            overflow-y: hidden;
            width: 100%;
            box-sizing: border-box;
            position: sticky;
            top: 0;
        }

        #search-history {
            border: 1px solid #e4e6ef;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            overflow: scroll;
        }

        #search-history ul li {
            list-style: none;
        }

        #search-form-submit-container {
            min-width: 400px;
        }

        #gofast-search-advanced-page .GofastForm__Field.GofastForm__Field--content-type ul.select2-selection__rendered {
            padding-top: 0.54rem;
            padding-bottom: 0.54rem;
        }

        .select2-container--default .select2-selection--single .select2-selection__rendered {
            padding: 0px;
        }

        .datatable.datatable-default>.datatable-table{
            overflow: auto !important;
        }

        .GofastTable{
            overflow: auto !important;
        }
        .GofastTable--scroll table tbody{
            overflow: visible !important;
        }
    </style>
