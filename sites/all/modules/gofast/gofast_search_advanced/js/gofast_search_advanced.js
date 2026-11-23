(function ($, Gofast, Drupal) {
    'use strict';

    Gofast.searchAdvanced = Gofast.searchAdvanced || {};

    Gofast.searchAdvanced.searchAdvancedTable = function () {
        // Private functions
        let _tableEl;
        let _table;
        let columns = [];
        // user table
        var initTable = function (table, insertHistory){
          _crateTable(table, insertHistory);

          $("#gofastAdvancedSearchResults").on("datatable-on-check", function(event,args){
            $("#gofastAdvancedSearchResults #container-selected-items").removeClass("processed");

            var selected_records = _table.getSelectedRecords();
            _GofastKDataTableSelectCounter(selected_records.length, "gofastAdvancedSearchResults");
            
            $("#gofastAdvancedSearchResults #container-selected-items > .contextual-actions-container >.dropdown").css("cursor", "")
            $("#dropdown-search-advanced-dropdown").removeClass("disabled");
            
            $("#gofastAdvancedSearchResults .contextual-actions-container >.dropdown").show()
            $("#gofastAdvancedSearchResults .contextual-actions-container >.dropdown").once("directory-dropdown").on("show.bs.dropdown", (event) => {
              // Prevent reload dropdown menu if the selection didn't change
              if($("#gofastAdvancedSearchResults #container-selected-items").hasClass("processed")){
                return;
              }
              $("#gofastAdvancedSearchResults #container-selected-items").addClass("processed")
              let selected_records = _table.getSelectedRecords();
              let entities = {};
              selected_records.find(".entity-data").each((i, el) => {
                let entity = JSON.parse($(el).html());
                if(entities[entity.entity_type]){
                  entities[entity.entity_type].push(entity.entity_id)
                } else {
                  entities[entity.entity_type] = [entity.entity_id]
                }
              })
              Gofast.search.checkedEntities.data = entities;
              $("#gofastAdvancedSearchResults #container-selected-items > .contextual-actions-container > .dropdown > .dropdown-menu").html($('<div class="loader-activity-menu-active"></div>'))

              $.get("/search/advanced/contextual_actions", {entities: entities}, (data) => {
                let dropdownContent = $(data).find("> .dropdown > .dropdown-menu").html();
                $(event.target).find("> .dropdown-menu").html(dropdownContent)

                Drupal.behaviors.ZZCToolsModal.attach();
              })
            })
          });
          
          $("#gofastAdvancedSearchResults").on("datatable-on-uncheck", function(event,args){
            $("#gofastAdvancedSearchResults #container-selected-items").removeClass("processed");
            var selected_records = _table.getSelectedRecords();
            _GofastKDataTableSelectCounter(selected_records.length, "gofastAdvancedSearchResults");
            if(selected_records.length == 0){
              $("#gofastAdvancedSearchResults #container-selected-items > .contextual-actions-container >.dropdown").css("cursor", "not-allowed")
              $("#dropdown-search-advanced-dropdown").addClass("disabled");
            }
          });
          
          $("#gofastAdvancedSearchResults").on("datatable-on-ajax-done datatable-on-layout-updated", function(event,args){
            
            $.get("/search/advanced/contextual_actions").done((html) => {
              // Remove the datatable sort click event
              $("#gofastAdvancedSearchResults .datatable-row > th[data-field='actions']").off("click")
              $("#gofastAdvancedSearchResults .datatable-row > th[data-field='actions']").html(`<div id="container-selected-items">${html}</div>`)
              $("#gofastAdvancedSearchResults .datatable-row > th[data-field='actions'] > .selected-items-count").remove();
              $("#gofastAdvancedSearchResults .datatable-row > th[data-field='actions']").append('<div class="selected-items-count">&nbsp;</div>');
              var selected_records = _table.getSelectedRecords();
              _GofastKDataTableSelectCounter(selected_records.length, "gofastAdvancedSearchResults");
              if(selected_records.length == 0){
                $("#gofastAdvancedSearchResults #container-selected-items > .contextual-actions-container >.dropdown").css("cursor", "not-allowed")
                $("#dropdown-search-advanced-dropdown").addClass("disabled");
              }
            })
          });
        };

        var _crateTable = function (table, insertHistory) {

          const params = Gofast.searchAdvanced.getFiltersParams();
          params.insertHistory = insertHistory;
            // Console log columns
            _table = $(table).KTDatatable({
                data: {
                    type: 'remote',
                    source: {
                        read: {
                            url: window.origin + "/advanced/search",
                            params : params,
                            method: 'GET',
                            contentType: 'application/json',
                            map: function(raw) {
                                // prevent JS error if no data after applying filter
                                if (raw == null) {
                                    return [];
                                }
                                let queryUrl = new URLSearchParams()
                                Object.entries(raw.filters).forEach(([key, value]) => {
                                  if(typeof value !== 'string') {
                                    value = JSON.stringify(value);
                                  }
                                  queryUrl.set(key, value);
                                })
                                queryUrl.set("options", JSON.stringify(raw.filters.options))
                                if(raw.meta.sort){
                                  queryUrl.set("sort[sort]", raw.meta.sort.sort)
                                  queryUrl.set("sort[field]", raw.meta.sort.field)
                                }
                                
                                $("#advanced-search-export-results").attr("data-query", queryUrl);
                                $("#advanced-search-export-results").attr("data-result-count", raw.data.length);
                                // sample data mapping
                                var dataSet = raw;
                                if (typeof raw.data !== 'undefined') {
                                    dataSet = raw.data;
                                }

                                // REFRESH HISTORY Table  //
                                $('#gofastAdvancedSearchHistory').KTDatatable('reload');
                                return dataSet;
                            },
                        },

                    },
                    sortable: true, 
                    serverPaging: true,
                    serverSorting: true,
                    saveState : false,
                },

                // layout definition
                layout: {
                    class: 'GofastTable GofastTable--scroll h-100',
                    scroll: false, // enable/disable datatable scroll both horizontal and vertical when needed.
                    footer: false, // display/hide footer
                    icons: {
                        sort: {
                            asc: 'fa fa-chevron-up',
                            desc: 'fa fa-chevron-down',
                        }
                    }
                },

                // column sorting

                pagination: true,

                translate: {
                    records: {
                        processing: Drupal.t('Please wait...'),
                        noRecords: Drupal.t('No records found')
                    },
                    toolbar: {
                        pagination: {
                            items: {
                                default: {
                                    first: Drupal.t('First'),
                                    prev: Drupal.t('Previous'),
                                    next: Drupal.t('Next'),
                                    last: Drupal.t('Last'),
                                    more: Drupal.t('More pages'),
                                    input: Drupal.t('Page number'),
                                    select: Drupal.t('Select page size')
                                },
                                info: Drupal.t("Displaying {{start}} - {{end}} of {{total}} records")
                            }
                        }
                    }
                },
                columns: _createColumns(),
                rows: {
                  afterTemplate: function(row, data, index) {
                    Object.entries(data).forEach(([key, value]) => {
                      if(value && value.more){
                        row.find(`[data-field=${key}]`).append($(value.more));
                        row.find(".gofast__popover").popover();
                      }
                    })
                  }
                }
            });
        }

        var _createColumns = function () {
            let finalColumn = [];
            // Call hooks to declare new columns
            if(typeof Gofast.hooks.gofast_advanced_search.hook_declare_columns == "object"){
                Gofast.hooks.gofast_advanced_search.templates = {};
                for(var i in Gofast.hooks.gofast_advanced_search.hook_declare_columns){
                    if(typeof Gofast.hooks.gofast_advanced_search.hook_declare_columns[i] == "function"){
                        let specColumn = Gofast.hooks.gofast_advanced_search.hook_declare_columns[i]();
                        // Check if the column name is in the cookie
                        let filtersColumns = window.getFiltersColumnsFromCookies();
                        if(filtersColumns.length > 0){
                            specColumn = specColumn.filter(function (el) {
                                return filtersColumns.includes(el.field);
                            });
                        }
                        finalColumn.unshift(...specColumn);
                    }
                }
            }
            //finalColumn.unshift({ selector: { class: 'kt-checkbox--solid' }, field: 'checkbox', title: '', autoHide: false, width: 25, });
            return finalColumn;
        };

        return {
            init: function (table, insertHistory){
                initTable(table, insertHistory)
            },
        };
    }();

    Gofast.searchAdvanced.initFilterValues = function() {
      // if no params into the url skip this behavior
      if (window.location.search === '') {
        return;
      }
      // Get all params inside the url
      const urlParams = new URLSearchParams(location.search)

      urlParams.forEach((filterValue, key) => {
        if(key == "name"){
          if (filterValue != "") {
            $('#search-form-body').find('input#search-name-input').val(filterValue);
          }
        } else if(key == "query") {     // If query is not empty, put it in the input
          if (filterValue != "") {
            $('#search-form-body').find('input[name="search_label"]').val(filterValue);
          }
        } else if(key == "globalOperator") {
          if (filterValue != "") {
            $(`input[name="global-operator"][value=${filterValue.toLowerCase()}]`).attr('checked', true)
          }
        } else {
          try {
            JSON.parse(filterValue);
          } catch (e) {
            return;
          }
          // Reach all filters (the key is the name of the filter)
          // Get value of the filter
          filterValue = JSON.parse(filterValue);
          let operator = filterValue.operator;
          let value = filterValue.value;

          if (!Array.isArray(value)) {
            // Fill the operator
            
            // Check if its a select, input, date, etc
            // If it's a select
            let accordion;
            if ($('#search-form-body').find('select[name="' + key + '"]').length > 0) {
              // Get select
              let select = $('#search-form-body').find('select[name="' + key + '"]');
              
              $('#search-form-body').find('select[name="' + key + '"]').parents('.GofastForm__Field').find('.form-select-field-operator').val(operator)
              
              // If the select element has a list of options, select corresponding option
              if(select.find('option').length){
                // The value is an id , then find the option with this id
                let option = select.find('option[id="' + key + "-"+ value + '"]');
                
                // If the option exist, get the value attributes
                let optionValue = option.attr('value');
                // Set value
                select.val(optionValue);
                //Trigger change event
                select.trigger('change');
              } else {
                // If Select don't have any option, fetch the corresponding item
                select.data('select2').dataAdapter.query({term: value}, (results) => {
                  let firstResult = results.results[0];
                  if(!firstResult || firstResult.id == 'null'){
                    return;
                  }
                  let newOption = new Option(firstResult.text, firstResult.id, true, true);
                  select.append(newOption);
                  //Trigger change event
                  select.trigger('change');
                })
              }
              
              accordion = select.parents('.accordion').first();
            }
            // If it's a date
            else if ($('#search-form-body').find('input[name="' + key + '"]').hasClass('datepicker')) {
              $('#search-form-body').find('input[name="' + key + '"]').parents('.GofastForm__Field').find('.form-select-field-operator').val(operator)
              
              // Get datepicker
              let datepicker = $('#search-form-body').find('input[name="' + key + '"]');
              // Set value
              datepicker.val(value);
              accordion = datepicker.parents('.accordion').first();
            }
            // If it's an input
            else if ($('#search-form-body').find('input[name="' + key + '"]').length > 0) {
              
              $('#search-form-body').find('input[name="' + key + '"]').parents('.GofastForm__Field').find('.form-select-field-operator').val(operator)
              // Get input
              let input = $('#search-form-body').find('input[name="' + key + '"]');

              // Set value
              input.val(value);
              accordion = input.parents('.accordion').first();
            }
            // If it's a tagify
            else if ($('#search-form-body').find('.form-tagify[name="' + key + '"]').length > 0) {
              $('#search-form-body').find('.form-tagify[name="' + key + '"]').parents('.GofastForm__Field').find('.form-select-field-operator').val(operator)
              
              // Get tagify
              const inputElmName = $('#search-form-body').find('[name="' + key + '"] > input.js-tagify');

              // If tagify is not yet processed, edit the defaut value of the input
              if(inputElmName.hasClass("js-tagify-processed")){
                window.tagify[inputElmName[0].name].removeAllTags();
                window.tagify[inputElmName[0].name].settings.whitelist = JSON.parse(value);
                window.tagify[inputElmName[0].name].addTags(JSON.parse(value));
              } else {
                inputElmName.val(value)
              }
              accordion = inputElmName.parents('.accordion').first();
            }
            else if (key == "im_field_category") {
              // for each filters 
              let select = $('#search-form-body').find('select[name="content_type"]');
              
              // JSON encode values
              select.val(filterValue);
              select.trigger('change');
            }else if(key == "sm_og_group_content_ref"){
              const spaces_filter_element = $('#search-form-body').find('input[name="ac-list-tags-list-spaces"]');
              // Reach all filters[key]
              let values = filterValue.map((val) => {
                return JSON.parse(val);
              })
              // If tagify is not yet processed, edit the defaut value of the input
              if(spaces_filter_element.hasClass("js-tagify-processed")){
                window.tagify["ac-list-tags-list-spaces"].removeAllTags();
                window.tagify["ac-list-tags-list-spaces"].settings.whitelist = values;
                window.tagify["ac-list-tags-list-spaces"].addTags(values);
              } else {
                spaces_filter_element.val(JSON.stringify(values))
              }
            }

            //Only if accordion is defined, open accordion where input is (take the first accordion)
            if (typeof accordion !== 'undefined') {   
              accordion.find('.collapse').addClass('show');
              accordion.find('.card-title').removeClass('collapsed');
            }
          }
        }
      })

      // Trigger search with added filters
      Gofast.searchAdvanced.triggerSearch(false)
    }

    Gofast.searchAdvanced.getFiltersParams = function() {
      // Get all name attr and his value for $('.accordion-advanced-search-standard .form-control[name]')
      var nameAttr = {};
      $('.accordion-advanced-search-standard .search-advanced-filter-item[name]').each(function() {
          let name = $(this).attr('name');
          let value = "";
          // If the value is select2, get the value of the select2
          if($(this).hasClass('select2-hidden-accessible')){
              if($(this).hasClass('gofast-select2-ajax') || $(this).hasClass('gofast-select2-switch')){
                  value = $(this).find('option:selected').val();
              }else{
                  value = $(this).find('option:selected').attr('id');
              }
          }else if($(this).hasClass('form-tagify')){
              // If the value is tagify, get the value of the tagify
              let inputValue = $(this).find("input.js-tagify").val()
              if(inputValue == ""){
                value = "";
              } else {
                value = inputValue
              }
          }else{
              value = $(this).val();
          }
          if(value == ""){
              value = null;
          }
          
          // If it's a date, get the specific operator
          let operator = "";
          if($(this).hasClass('form-control-date')){
              operator = $(this).parents('.form-search-date').find('.form-select-date').val();
          }else{
              // Get the form-select-field-operator
              operator = $(this).parents('.form-field-operator').find('.form-select-field-operator').val();
          }
          
          if(value != null){
              // initialize the object if it doesn't exist
              if (!nameAttr[name]) {
                  nameAttr[name] = {};
              }
              
              // add the operator 
              nameAttr[name].operator = operator;
              
              // Add it to the object like this nameAttr.name = value
              nameAttr[name].value = value;
          }
          
      });

      const params = {
        name: $('input[id="search-name-input"]').val(),
        query: $('input[id="edit-search-label"]').val(),
        spaces: $('input[id="edit-space"]').val(),
        categories :$('select[id="edit-content-type"]').val(),
        options: JSON.stringify(nameAttr),
        globalOperator: $('input[name="global-operator"]:checked').val().toUpperCase(),
      }

      return params;
      
    }

    // Reset function
    Gofast.searchAdvanced.resetAdvancedSearchForm = function(){
        // Reset all inputs except all operator select and global operator
        $('#search-form-body').find('input:not(.form-select-field-operator, .form-select-global-operator)').val(null);
        
        $('#search-form-body').find('select:not(.form-select-field-operator)').val(null);
        $('#search-form-body').find('select:not(.form-select-field-operator)').trigger('change');
        
        // Reset spaces tagify
        window.tagify["ac-list-tags-list-spaces"].removeAllTags();
        
        // Reset all tagify input , we remove all tags inside window.tagify
        $('#search-form-body').find('.form-tagify').each(function() {
            // Get children input of tagify
            let input = $(this).find('input.js-tagify');
            // if the input is not tagify, return
            if(input.length == 0){
                return;
            }
            // Get name attr
            let name = input.attr('name');
            // Remove all tags
            window.tagify[name].removeAllTags();
        });
        
        // Reset all operator with equal value
        $('#search-form-body').find('.form-select-field-operator').each(function() {
            $(this).val("equal");
        });
        
        // Reset all datepicker to between
        $('#search-form-body').find('.form-select-date').each(function() {
            $(this).val("between");
        });
    }

    Gofast.searchAdvanced.triggerSearch = function(insertHistory = true){
      // TABLE //
      // Remove old datatable if exist
      if($('#gofastAdvancedSearchResults').length > 0){
        $('#gofastAdvancedSearchResults').KTDatatable('destroy');
      }

      $("#gofastAdvancedSearchBlankSearch").remove()

      let table = document.querySelector('#gofastAdvancedSearchResults')
      // Generate table

      Gofast.searchAdvanced.searchAdvancedTable.init(table, insertHistory);
    }

    Gofast.searchAdvanced.download_search_advanced_csv = function() {
      const params = Gofast.searchAdvanced.getFiltersParams();
      params.insertHistory = 'false';
      const resultCount = $("#advanced-search-export-results").attr("data-result-count");
      if(resultCount == 0){
        Gofast.toast(Drupal.t("There is no result to export", {}, {context: "gofast:gofast_search_advanced"}), "error")
        return;
      }
      Gofast.modal('<div class="loader-sync-status"></div> ' + Drupal.t("Please hold on while your export is being generating. This process may take a few minutes.", {}, {context : "gofast_stats"}), Drupal.t("Your export is being generating", {}, {context : "gofast_stats"}));
      // Replicate last datatable query string to replicate current sorting and filtering to export
      $.get("/search/advanced/export_to_csv", params, function(fid){
         var downloadInterval = setInterval(() => {
             $.get("/search/advanced/retrieve_export_file", {fid: fid}).done((file) => {
                if(file !== "Waiting"){
                    clearInterval(downloadInterval);
                    Gofast.closeModal();
                    window.location = `/search/advanced/retrieve_export_file?fid=${fid}`;
                } 
             });
         }, 1000); 
      });
    }

    Drupal.behaviors.gofastDirectorySearchAdvanced = {
        attach: function (context, settings) {


            // When clicking on #gofastAdvancedSearchResults, launch api/search/search
            $('#submit-advanced-search').once().click(function() {
                Gofast.searchAdvanced.triggerSearch();
            });

            // When clicking on #submit-advanced-reset, reset all input form
            $('#submit-advanced-reset').once().click(function(e) {
              Gofast.searchAdvanced.resetAdvancedSearchForm();
            });

            // When choose a date option in the select, show the date input
            $('.form-select-date').once().change(function() {
                let value = $(this).val();
                let input = $(this).parents('.form-search-date').find('.form-control-date');
                // If the user select an interval , then the input is a datepicker range
                if(value == "between"){ // The interval option
                    // Convert input into datePicker range
                    Gofast.initializeDateRangePicker(input)
                }else if(value == "lower" || value == "higher"){
                    Gofast.initializeDateRangePicker(input, {
                        singleDatePicker: true,
                    });
                }
            });

            // When category was changed, check if fieldset exist
            $('#edit-content-type').once().change(function() {
                let categories = $(this).val();

                // Make a request to check if fieldset exist
                $.ajax({
                    url: window.origin + "/advanced/search/fieldset",
                    type: 'GET',
                    data: {
                        categories: categories
                    },
                    success: function (data) {
                        // If fieldset exist, add it to the DOM
                        if(data.fieldset != null){
                            // Remove old fieldset
                            $('.accordion-advanced-search-standard .fieldset').remove();
                            // Add new fieldset
                            $('.accordion-advanced-search-standard').append(data.fieldset);
                            // Add new fieldset to the form
                            $('#edit-search-advanced').append(data.fieldset);
                        }
                    }
                });
            });

            // Foreach gofast-select2 class init select2
            $('.gofast-select2').once().each(function() {
                $(this).select2({
                    allowClear: true,
                });
            });

            $('#gofastAdvancedSearchResults').once().on('datatable-on-ajax-done	', function (event, jqXHR) {
                $('#gofastAdvancedSearchResults').data("KTDatatable").options.data.source.read.params.insertHistory = "false";
            });

            // Foreach gofast-select2 class init select2
            $('.gofast-select2-ajax').once().each(function() {
                var URL = Drupal.settings.gofast.baseUrl + '/gofast/gofast_ac_config';
                var newOption = new Option(Drupal.t('None'), "", false, false);
                $(this).select2({
                    allowClear: true,
                    placeholderOption: function () { return undefined; },
                    ajax: {
                    url: URL,
                    params: {
                            data: newOption
                        },
                        dataType: "json",
                        type: "POST",
                        data: function (params) {
                            var queryParameters = {
                                str: params.term,
                                get_user: true
                            }
                            return queryParameters;
                        },
                        processResults: function (data, params) {
                            const isOnlyUser = this.$element.data("only-user");
                            var resultArray = {
                                results: $.map(data, function (item) {
                                    return {
                                        text: item.display_name,
                                        id: isOnlyUser ? item.name : item.display_name
                                    }
                                })
                            };
                            // Add user input as select option
                            if(!isOnlyUser){
                              resultArray.results.push(
                                {
                                  text: params.term,
                                  id: params.term
                                },
                              )
                            }
                            resultArray.results.push(
                              {
                                text: Drupal.t('None'),
                                id: 'null'
                              }
                            );

                            return resultArray;
                        }
                    }
                });
            });
        }
    }

    if(typeof Gofast.hooks.gofast_advanced_search == "undefined"){
        Gofast.hooks.gofast_advanced_search = [];
        Gofast.hooks.gofast_advanced_search.hook_declare_columns = [];
    }


    Gofast.hooks.gofast_advanced_search.hook_declare_columns.push(function(){
        return [
            {
                selector: {
                    class: 'kt-checkbox--solid'
                },
                field: 'checkbox',
                title: '',
                autoHide: false,
                width: 25,
            },
            {
                field: "actions",
                title: "",
                autoHide: false,
                width: 60,
                overflow: "visible",
                sortable: false,
                template: function (data) {
                  let entity = {
                    entity_type: data.entity_type,
                    entity_id: data.entity_id,
                  };
                  let entity_string = JSON.stringify(entity)
                  return `<div class="d-none entity-data">${entity_string}</div>`;
                },
            },
            {
                field: 'entity_id',
                title: Drupal.t('ID'),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    return "<span>"  +row.entity_id + "</span>";
                },
            },
            {
                field: 'im_field_format',
                title: Drupal.t('Type'),
                width: 50,
                textAlign: 'center',
                autoHide: false,
                template: function (row) {
                    if (row.im_field_format == undefined || row.im_field_format == null) {
                        return "-";
                    }
                    return "<span>" + row.im_field_format + "</span>";
                }
            },
            {
                field: 'label',
                title: Drupal.t('Title'),
                width: 400,
                textAlign: 'left',
                autoHide: false,
                template : function(row) {
                    if(row.label == undefined || row.label == null){
                        return "-";
                    }
                    return `<span>${row.label}</span>`;
                }
            },
            {
                field: 'formatedGroupes',
                title: Drupal.t('Spaces'),
                width: 200,
                textAlign: 'center',
                sortable: false,
                autoHide: false,
                template: function(row) {
                    let result = `<div class="search-advanced-spaces" data-id="${row.entity_id}">`;
                    Object.entries(row.formatedGroupes).forEach(([key, value]) => {
                      if(key != "more"){
                        result += `<a class="d-flex w-100 mb-2" href="/node/${value.nid}" target="_blank" data-nid="${value.nid}" data-toggle="search-tooltip"><span class="badge badge-secondary bg-hover-primary text-hover-white text-truncate w-100" title="${value.title}">${value.title}</span></a>`;
                      }
                    });
                    result += '</div>';
                    return result;
                },

            },
            {
                field: 'im_field_state',
                title: Drupal.t('State'),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    let result = "";
                    if(row.im_field_state == undefined || row.im_field_state == null){
                        return "-";
                    }
                    result = `<span class="badge badge-secondary h-100 text-truncate font-weight-normal w-100" title="${row.im_field_state}">${row.im_field_state}</span>`;
                    return result;
                }
            },
            {
                field: 'im_field_criticity',
                title: Drupal.t('Criticity', {}, {context: 'gofast'}),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    let result = "";
                    if(row.im_field_criticity == undefined || row.im_field_criticity == null){
                        return "-";
                    }
                    result = `<span class="badge badge-secondary h-100 text-truncate font-weight-normal w-100" title="${row.im_field_criticity}">${row.im_field_criticity}</span>`;
                    return result;
                }
            },
            {
                field: 'im_field_classification',
                title: Gofast._settings.classificationLabel ?? Drupal.t('Classification', {}, {context: 'gofast'}),
                width: 150,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    let result = "";
                    if(row.im_field_classification == undefined || row.im_field_classification == null){
                        return "-";
                    }
                    result = `<span class="badge badge-secondary h-100 text-truncate font-weight-normal w-100" title="${row.im_field_classification}">${row.im_field_classification}</span>`;
                    return result;
                }
            },
            {
                field: 'im_field_tags',
                title: Drupal.t('Tags'),
                width: 100,
                textAlign: 'center',
                sortable: false,
                autoHide: false,
                template: function(row) {
                    let result = "";
                    if(row.im_field_tags == undefined || row.im_field_tags == null){
                        return "-";
                    }
                    Object.entries(row.im_field_tags).forEach(([key, value]) => {
                      if(key != "more"){
                        result += `<span class="badge badge-secondary h-100 text-truncate font-weight-normal w-100" title="${Drupal.t(value.label)}">${Drupal.t(value.label)}</span>`;
                      }
                    }); 
                    return result; 
                }
            },
            {
                field: 'sm_vid_Category',
                title: Drupal.t('Category'),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    let result = "";
                    if(row.sm_vid_Category == undefined || row.sm_vid_Category == null){
                        return "-";
                    }
                    Object.entries(row.sm_vid_Category).forEach(([key, value]) => {
                      if(key != "more"){
                        result += `<span class="badge badge-secondary h-100 text-truncate font-weight-normal w-100" title="${Drupal.t(value)}">${Drupal.t(value)}</span>`;
                      }
                    }); 
                    return result;
                }
            },
            {
                field: 'tos_name',
                title: Drupal.t('Creator'),
                autoHide: false,
                width: 100,
                textAlign: 'center',
                template: function(row) {
                  if(row.tos_name == undefined || row.tos_name == null){
                    return "-";
                  }
                    return "<span>"  +row.tos_name + "</span>";
                },
            },
            {
                field: 'tos_mod_name',
                title: Drupal.t('Last modifier'),
                autoHide: false,
                width: 110,
                textAlign: 'center',
                template: function(row) {
                  if(row.tos_mod_name == undefined || row.tos_mod_name == null){
                    return "-";
                  }
                    return "<span>"  +row.tos_mod_name + "</span>";
                },
            },
            {
                field: 'tos_unr_author',
                title: Drupal.t('Author'),
                autoHide: false,
                width: 100,
                textAlign: 'center',
                template: function(row) {
                  if(row.tos_unr_author == undefined || row.tos_unr_author == null){
                    return "-";
                  }
                    return "<span>"  +row.tos_unr_author + "</span>";
                },
            },
            {
                field: 'tos_unr_document_reference',
                title: Drupal.t('Document reference', {}, {context: "gofast"}),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.tos_unr_document_reference == undefined || row.tos_unr_document_reference == null){
                        return "-";
                    }
                    return "<span>"  +row.tos_unr_document_reference + "</span>";
                },
            },
            {
                field: 'ps_popularity',
                title: Drupal.t('Popularity'),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ps_popularity == undefined || row.ps_popularity == null){
                        return "-";
                    }
                    return "<span>"  +row.ps_popularity + "</span>";
                },
            },
            {
                field: 'ds_field_date',
                title: Drupal.t('Deadline'),
                width: 200,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ds_field_date == undefined || row.ds_field_date == null){
                        return "-";
                    }
                    return "<span>"  +row.ds_field_date + "</span>";
                },
            },
            {
                field: 'ds_custom_date',
                title: Gofast._settings.customDateLabel ?? Drupal.t("Date"),
                width: 200,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ds_custom_date == undefined || row.ds_custom_date == null){
                        return "-";
                    }
                    return "<span>"  + row.ds_custom_date + "</span>";
                },
            },
            {
                field: 'ds_created',
                title: Drupal.t('Creation date'),
                width: 200,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ds_created == undefined || row.ds_created == null){
                        return "-";
                    }
                    return "<span>"  +row.ds_created + "</span>";
                },
            },
            {
                field: 'ds_changed',
                title: Drupal.t('Last updated'),
                width: 200,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ds_changed == undefined || row.ds_changed == null){
                        return "-";
                    }
                    return "<span>"  +row.ds_changed + "</span>";
                },
            },
            {
                field: 'ss_language',
                title: Drupal.t('Language'),
                width: 100,
                textAlign: 'center',
                autoHide: false,
                template: function(row) {
                    if(row.ss_language == undefined || row.ss_language == null){
                        return "-";
                    }
                    return '<div class="symbol symbol-20 document__editable--label position-relative py-2">'
                    + '<img class="metadata-language-flag" alt="Pic" src="' + row.ss_language  + '" />'
                    + '</div>';
                },
            },
        ];  
    })
})(jQuery, Gofast, Drupal);
