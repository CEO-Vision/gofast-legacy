(function ($, Gofast, Drupal) {
    
  'use strict';
  
  Drupal.behaviors.gofastAdminTestSync = {
      attach: function(context, settings){
          if(document.querySelector('#gofastAdminTestSyncTable') != null){
              if(!document.querySelector('#gofastAdminTestSyncTable').classList.contains('processed')){
                  let table = document.querySelector('#gofastAdminTestSyncTable');
                  table.classList.add('processed');
                  GofastAdminTestSyncTable.init(table);
              }
          }
          
      }
  };
  
  var GofastAdminTestSyncTable = function() {
      // Private functions
      let _tableEl;
      let _bodyHeight;
      let _table;
      let _columns;
      
      // user table
      var initTable = function(table) {
          
          _tableEl = table;
          _bodyHeight = table.parentElement.offsetHeight - 50;
          
          let jsonColumns = _tableEl.dataset.columns;
          _columns = JSON.parse(jsonColumns);
          let cols = [];
          
          for(const [key, value] of Object.entries(_columns)) {
              const f = {
                  field: key,
                  title: key,
                  autoHide: false,
                  width: (key=="mail") ? 300 : "auto"
              };
              cols.push(f);
          }
          _crateTable(table, cols);
      };
      
      var _crateTable = function(table, cols){
          
          _table = $(table).KTDatatable({
              data: {
                  type: 'remote',
                  source: {
                      read: {
                          url: window.origin + "/admin/config/gofast/ldap/sync_entries",
                          method: 'GET',
                          map: function(raw) {
                              // sample data mapping
                              var dataSet = raw;
                              if (typeof raw.data !== 'undefined') {
                                  dataSet = raw.data;
                              }
                              return dataSet;
                          }
                      }
                      
                  },
                  pageSize: 20,
                  serverPaging: false,
                  serverFiltering: true,
                  serverSorting: false,
                  autoColumns: false
              },
              
              // layout definition
              layout: {
                  class: 'GofastTable GofastTable--scroll',
                  height: _bodyHeight,
                  scroll: true, // enable/disable datatable scroll both horizontal and vertical when needed.
                  footer: false // display/hide footer
              },
              
              // column sorting
              sortable: true,
              pagination: true,
              
              // columns definition
              columns: cols,
              
          });
      }
      
      return {
          init: function(table){
              initTable(table);
          }
      };
  }();
  
  
  
})(jQuery, Gofast, Drupal);
