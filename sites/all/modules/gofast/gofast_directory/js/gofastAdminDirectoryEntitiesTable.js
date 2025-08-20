(function ($, Gofast, Drupal) {
  "use strict";

  let GofastEntitiesTableElements = [];
  let GofastEntitiesDefaultAction = "";

  // Schemas
  const _getEntitiesDefinitions = function (columns) {
    return [
      {
        column: {
          selector: {
            class: "kt-checkbox--solid",
          },
          field: "checkbox",
          title: "",
          autoHide: false,
          width: 10,
          sortable: false,
        },
        filter: "",
      },
      {
        column: {
          field: "",
          title: "",
          autoHide: false,
          width: 30,
          overflow: "visible",
          sortable: false,
        },
        filter: "",
      },
      {
        column: {
          field: "name",
          title: columns.name,
          autoHide: false,
          width: 400,
          textAlign: "left",
          template: function (data) {
            return data.name;
          },
        },
        filter:
          '<input type="text" name="entname" class="form-control GofastEntitiesFilter__entname" placeholder="' +
          Drupal.t("Search") +
          '"/>',
      },
      {
        column: {
          field: "users",
          title: columns.users,
          autoHide: false,
          textAlign: "left",
          template: function (data) {
            return data.users;
          },
        },
        filter: "",
      },
      {
        column: {
          field: "actions",
          title: "",
          sortable: false,
          autoHide: false,
          width: 40,
          textAlign: "left",
          sortable: false,
          template: function (data) {
            return '<div class="d-none">' + data.actions + "</div>";
          },
        },
        filter:
          '<div class="GofastDirectoryFilterButtons d-flex mt-auto justify-content-end" style="gap: .5rem;"><button type="submit" class="btn btn-xs btn-primary btn-icon m-0">' +
          '<i class="fas fa-search" style="font-size: 12px !important;"></i>' +
          '</button><button type="reset" class="btn btn-xs btn-light btn-icon m-0">' +
          '<i class="fas fa-undo" style="font-size: 12px !important;"></i>' +
          "</button></div>",
      },
      {
        column: {
          field: "tid",
          title: "",
          autoHide: true,
          width: 0,
          sortable: false,
          template: function (data) {
            return (
              '<span style="display:none;" class="tid_span" value="' +
              data.tid +
              '">' +
              data.tid +
              "</span>"
            );
          },
        },
        filter: null,
      },
    ];
  };

  var GofastEntitiesTable = (function () {
    // Private functions
    let _tableEl;
    let _table;
    let _columns;
    let _selection;
    var initTable = function (table) {
      _tableEl = table;
      let jsonColumns = _tableEl.dataset.columns;
      _columns = JSON.parse(jsonColumns);
      GofastEntitiesTableElements = _getEntitiesDefinitions(_columns)
        .filter(Object)
        .map((el) => el.filter)
        .filter((filterValue) => filterValue !== null);
      _createTable(table);
    };

    var _createTable = function (table) {
      _table = $(table).KTDatatable({
        data: {
          type: "remote",
          source: {
            read: {
              url: window.origin + "/gofast/admin/directory/entities",
              params: {
                query: {
                  standard: "on",
                },
              },
              method: "GET",
              map: function (raw) {
                if (raw == null) {
                  return [];
                }
                var dataSet = raw;
                if (typeof raw.data !== "undefined") {
                  dataSet = raw.data;
                }
                if (typeof raw.default_action_button !== "undefined") {
                  GofastEntitiesDefaultAction = raw.default_action_button;
                }
                return dataSet;
              },
            },
          },
          pageSize: 20,
          serverPaging: true,
          serverFiltering: true,
          serverSorting: true,
          autoColumns: false,
        },
        // layout definition
        layout: {
          class: "GofastTable GofastTable--scroll h-100",
          scroll: false, // enable/disable datatable scroll both horizontal and vertical when needed.
          footer: false, // display/hide footer
          icons: {
            sort: {
              asc: "fa fa-chevron-up",
              desc: "fa fa-chevron-down",
            },
          },
        },
        // column sorting
        sortable: true,

        pagination: true,

        translate: {
          records: {
            processing: Drupal.t("Please wait..."),
            noRecords: Drupal.t("No records found"),
          },
          toolbar: {
            pagination: {
              items: {
                default: {
                  first: Drupal.t("First"),
                  prev: Drupal.t("Previous"),
                  next: Drupal.t("Next"),
                  last: Drupal.t("Last"),
                  more: Drupal.t("More pages"),
                  input: Drupal.t("Page number"),
                  select: Drupal.t("Select page size"),
                },
                info: Drupal.t(
                  "Displaying {{start}} - {{end}} of {{total}} records"
                ),
              },
            },
          },
        },

        // columns definition
        columns: _getEntitiesDefinitions(_columns)
          .filter(Object)
          .map((el) => el.column),
        rows: {
          autoHide: false,
          beforeTemplate: function (row, data, index) {
            row.attr("data-tid", data.tid);
          },
        },
      });
    };

    // the form being rendered ad hoc, we have to wait for it to be rendered before we can attach events to it
    let formAttempts = 0;
    const formInterval = setInterval(function () {
      formAttempts++;
      if (formAttempts > 100) {
        clearInterval(formInterval);
        return;
      }
      if (!$("#GofastEntitiesFilterForm").length) {
        return;
      }
      $("#GofastEntitiesFilterForm").on("submit", function (e) {
        e.preventDefault();
        let filterArr = $(this).serializeArray();
        let filter = Object.create({});

        filterArr.forEach((fil) => {
          if (!!fil.value) {
            let att = fil.name;
            filter[att] = fil.value;
          }
        });

        _table.setDataSourceParam("query", filter);
        _table.reload();
      });
      clearInterval(formInterval);
    }, 100);

    $("#gofastEntitiesTable").on("datatable-on-check", function (event, args) {
      $(".kt-checkbox--solid input[disabled]").prop("checked", false);
      var selected_records = _table
        .getSelectedRecords()
        .filter(function (record) {
          return (
            $(this).find(".kt-checkbox--solid input[disabled]").length == 0
          );
        });
      _selection = "";
      selected_records.each(function (index) {
        var tid = $(this).find(".tid_span").html();
        _selection += tid + "-";
      });
      _selection = _selection.slice(0, -1);

      $("#container-selected-items .navi-item .ctools-use-modal").each(
        function (index) {
          if ($(this).hasClass("default-action")) {
            return;
          }
          var href = $(this).attr("href");
          if (!href) {
            return;
          }
          var array_href = href.split("/");
          array_href[array_href.length - 1] = _selection;
          var new_href = array_href.join("/");
          $(this).attr("href", new_href);
          $(this).removeClass("ctools-use-modal-processed");
          $(this).off("click");
        }
      );

      GofastTriggerKDataTableMegaDropdown(selected_records, "gofastEntitiesTable", GofastEntitiesDefaultAction);
    });

    $("#gofastEntitiesTable").on(
      "datatable-on-uncheck",
      function (event, args) {
        var selected_records = _table.getSelectedRecords();
        _selection = "";
        selected_records.each(function (index) {
          var tid = $(this).find(".tid_span").html();
          _selection += tid + "-";
        });

        $("#container-selected-items .navi-item .ctools-use-modal").each(
          function (index) {
            var href = $(this).attr("href");
            if (!href) {
              return;
            }
            var array_href = href.split("/");
            array_href[array_href.length - 1] = _selection;
            var new_href = array_href.join("/");
            $(this).attr("href", new_href);
            $(this).removeClass("ctools-use-modal-processed");
            $(this).off("click");
          }
        );

        GofastTriggerKDataTableMegaDropdown(selected_records, "gofastEntitiesTable", GofastEntitiesDefaultAction);
      }
    );

    const interferringEvents = ["datatable-on-ajax-done", "datatable-on-goto-page", "datatable-on-update-perpage"];

    for (const interferringEvent of interferringEvents) {
      $("#gofastEntitiesTable").on(interferringEvent, function (event, data) {
        GofastRefreshKDataTableSubheader("gofastEntitiesTable","GofastEntitiesFilterForm");
        if (!_table) {
          return;
        }

        var selected_records = _table.getSelectedRecords();
        GofastTriggerKDataTableMegaDropdown(selected_records, "gofastEntitiesTable", GofastEntitiesDefaultAction);

        if (interferringEvent == "datatable-on-ajax-done") {
          $(".datatable-subheader").show();
          Gofast.removeLoading();
        }
      });
    }

    return {
      init: function (table) {
        initTable(table);
      },
    };
  })();

  Gofast.initEntitiesDirectory = function () {
    if (document.querySelector("#gofastEntitiesTable") == null) {
      return;
    }
    if (!document.querySelector("#gofastEntitiesTable").classList.contains("processed")) {
      let table = document.querySelector("#gofastEntitiesTable");
      table.classList.add("processed");
      GofastEntitiesTable.init(table);
      if (typeof ResizeObserver != "undefined") {
        const directoryResizeObserver = new ResizeObserver(function (entries) {
          GofastRefreshKDataTableSubheader("gofastEntitiesTable", "GofastEntitiesFilterForm");
        });
        directoryResizeObserver.observe(table);
        $("#gofastEntitiesTable").on("datatable-on-destroy", function () {
          directoryResizeObserver.disconnect();
        });
      }
      $("#gofastEntitiesTable").on("datatable-on-layout-updated", function () {
        GofastAddKDataTableSubheader("gofastEntitiesTable", "GofastEntitiesFilterForm", GofastEntitiesTableElements);
        // full reload = everything will be unchecked = we must update the total display accordingly
        if (typeof _table == "undefined") {
          _GofastKDataTableSelectCounter(0, "gofastEntitiesTable");
        }
        Drupal.attachBehaviors();
        $("[data-toggle='popover']").popover({
          template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-body overflow-auto max-h-250px"></div></div>'
        });
      });
    }
  };
})(jQuery, Gofast, Drupal);
