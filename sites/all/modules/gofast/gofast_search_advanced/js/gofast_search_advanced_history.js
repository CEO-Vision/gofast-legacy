(function ($, Gofast, Drupal) {
    'use strict';

    var buildAdvancedSearchURL = function(row) {
      
      let queryColumn = row.find('td[data-field="query"]');
      let nameColumn = row.find('td[data-field="name"]');
      let fieldColumn = row.find('td[data-field="filters"]');

      // Get value of data-field="query" via aria-label
      let query = queryColumn.attr('aria-label');

      // Get search name
      let searchName = nameColumn.attr('aria-label');

      // Get value of data-field="filters" via aria-label
      let filters = fieldColumn.attr('aria-label');

      // JSON decode filters
      filters = JSON.parse(filters);
      
      // Convert each variable into a url parameters
      let queryParams = new URLSearchParams();

      queryParams.set("query", query);
      queryParams.set("name", searchName);

      for (let key in filters) {
          queryParams.set(key, JSON.stringify(filters[key]));
      }
      return "/search/advanced?" + decodeURIComponent(queryParams.toString())
    }

    Drupal.behaviors.gofastSearchAdvancedHistory = {
        attach: function (context, settings) {

            let searchAdvancedHistoryTable = function () {
                // Private functions
                let _table;
                let _tableEl;
                let _columns;
                // user table

                let initHistoryTable = function (table) {
                    _tableEl = table
                    let jsonColumns = _tableEl.dataset.columns
                    _columns = JSON.parse(jsonColumns)
                    _createHistoryTable(table)
                };

                let _createHistoryTable = function (table) {

                    _table = $(table).KTDatatable({
                        data: {
                            type: 'remote',
                            source: {
                                read: {
                                    url: window.origin + "/advanced/search/history",
                                    method: 'GET',
                                    contentType: 'application/json',
                                    map: function (raw) {
                                        // prevent JS error if no data after applying filter
                                        if (raw == null) {
                                            return [];
                                        }

                                        // sample data mapping
                                        let dataSet = raw;
                                        if (typeof raw.data !== 'undefined') {
                                            dataSet = raw.data;
                                        }
                                        return dataSet;
                                    },
                                },

                            },
                            pageSize: 10,
                            serverPaging: false,
                            saveState: false,
                            serverFiltering: false,
                            autoColumns: false,
                        },

                        // layout definition
                        layout: {
                            class: 'GofastTable GofastTable--scroll',
                            scroll: false, // enable/disable datatable scroll both horizontal and vertical when needed.
                            footer: false, // display/hide footer
                        },

                        // column sorting
                        sortable: false,

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
                                        info: Drupal.t("{{start}} - {{end}} of {{total}} records")
                                    }
                                }
                            }
                        },

                        // columns definition
                        columns: [
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
                                field: 'id',
                                title: "",
                                autoHide: false,
                                width: 0,
                                sortable: false,
                                template: function (data) {
                                    return "<span class='text-nowrap'>" + data.id + "</span>"
                                },
                            },
                            {
                                field: 'name',
                                title: _columns.name,
                                autoHide: false,
                                width: 150,
                                sortable: false,
                                template: function (data) {
                                    //If empty name
                                    if (data.name == "") {
                                        return `<a href="#" class="search-advanced-history-link btn-link text-nowrap" target="_blank" title="${Drupal.t("No search name")}">${Drupal.t("No search name")}</a>`
                                    }
                                    return `<a href="#" class="search-advanced-history-link btn-link text-nowrap" target="_blank" title="${data.name}">${data.name}</a>`
                                },
                            },
                            {
                                field: 'date',
                                title: _columns.date,
                                autoHide: false,
                                width: 120,
                                sortable: false,
                                template: function (data) {
                                    return "<span class='text-nowrap'>" + data.date + "</span>"
                                },
                            },
                            {
                                field: 'filters',
                                title: "",
                                autoHide: false,
                                sortable: false,
                                width: 0,
                                template: function (data) {
                                    return "<span class='text-nowrap'>" + data.filters + "</span>"
                                },
                            },
                            {
                                field: 'query',
                                title: "",
                                autoHide: false,
                                sortable: false,
                                width: 0,
                                template: function (data) {
                                    return "<span class='text-nowrap'>" + data.query + "</span>"
                                },
                            },

                        ],
                        rows: {
                          afterTemplate: function(row, data, index) {
                            // Set history link href with all filters
                            const searchURL = buildAdvancedSearchURL(row);
                            row.find('.search-advanced-history-link').attr("href", searchURL);
                          }
                        },
                    });

                                
                    $("#gofastAdvancedSearchHistory").once().on("datatable-on-check datatable-on-uncheck datatable-on-init", function(event,args){
                        // Get selected records
                        let selected_records = _table.getSelectedRecords();
                        
                        // count records
                        let selected_records_count = selected_records.length;
                        
                        // if count > 0 , enable the delete selection button
                        if(selected_records_count > 0){
                            $('.delete-selected-items').removeClass('disabled');
                        }else{
                            $('.delete-selected-items').addClass('disabled');
                        }
                        
                    });
                    
                    // When clicking on delete selected items button
                    $('.delete-selected-items').once().click(function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        let selected_records = _table.getSelectedRecords();
                        let selected_records_count = selected_records.length;
                        if(selected_records_count > 0){
                            let ids = [];
                            selected_records.each(function(){
                                // Get th with date-field = id  
                                let id = $(this).find('td[data-field="id"]').text();
                                ids.push(id);
                            });
                            let url = window.origin + "/search/advanced/history/clear/selected/confirm";
                            $.ajax({
                                url: url,
                                type: "POST",
                                data: {
                                    selected_ids: ids
                                },
                                success: function (response) {
                                    // JSON decode the response
                                    var data = JSON.parse(response);
            
                                    Gofast.removeLoading();
                                    // Create the modal
                                    Gofast.modal(data, Drupal.t("Confirm deletion of selection from history", {}, {context: "gofast:gofast_search_advanced"}));
                                },
                                error : function (response) {
                                    Gofast.removeLoading();
                                    Gofast.toast(Drupal.t('An error occured : ') + response , 'error');
                                }
                            });
                        }
                    });
                }

                return {

                    initHistory: function (table) {
                        initHistoryTable(table)
                    },
                };
            }();

            // Execute only if gofastAdvancedSearchHistory have not processed class
            $("#gofastAdvancedSearchHistory:not(.gofastAdvancedSearchHistory-processed)").addClass("gofastAdvancedSearchHistory-processed").each(function () {
                $('#gofastAdvancedSearchHistory').KTDatatable('destroy');
                let historyTable = document.querySelector('#gofastAdvancedSearchHistory')
                searchAdvancedHistoryTable.initHistory(historyTable);
            });

            $("#gofastAdvancedSearchHistory").once().on("datatable-on-layout-updated", function () {
                Drupal.attachBehaviors();
            });
        }
    }
})(jQuery, Gofast, Drupal);
