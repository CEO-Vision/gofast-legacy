(function ($, Gofast, Drupal) {
    'use strict';

    Gofast = Gofast || {};

    // Will auto-init the JS behavior for multiselect inputs (inputs made of several select ipnuts) in directories cells
    Drupal.behaviors.initMultiSelectInput = {
        attach: function(context) {
          if (typeof Tagify == "undefined") {
            return;
          }
          const $selectCandidates = $(".gofast-directory-multiselect-input:not(.processed)");
          $selectCandidates.addClass("processed").each(function() {
              Gofast.initMultiSelectInput($(this));
          });
        }
    }

    // Generic submit handler for multiselect inputs
    Gofast.submitMultiSelect = async function(e, $multiSelectContainer, clear = false) {
        e.stopPropagation();
        const params = {};
        // The field name which will be put in the body of the request is found in the "name" attribute of the select
        // The select name is expected to be gofast-directory-multiselect-select-{{name}}
        for (const select of $multiSelectContainer.find(".gofast-directory-multiselect-selects").children("select, input")) {
            const name = select.getAttribute("name").replace("gofast-directory-multiselect-select-", "");
            const value = select.value;
            params[name] = value;
        }
        // The submit endpoint is set in the data-submit attribute of the multiselect container, the entity id to update is set in its data-etid attribute
        params["etid"] = $multiSelectContainer.attr("data-etid");
        if (clear) {
            params["clear"] = true;
        }
        const callback = $multiSelectContainer.attr("data-submit");
        // Show spinner for the time of the request
        Gofast.toggleMultiSelectSpinner($multiSelectContainer);
        await $.post(callback, params)
            .done(function(response) {
                // Display in a toaster the message sent by the submit endpoint, reload the table
                const status = Object.keys(response.message)[0];
                const message = Object.values(response.message)[0];
                Gofast.toast(message, status);

                if (response.data.placeholder) {
                    const $multiSelectSpan = $multiSelectContainer.find(".gofast-directory-multiselect-span");
                    $multiSelectSpan.html(response.data.placeholder);
                }

                if (status == "success") {
                    Gofast.toggleMultiSelect(e, $multiSelectContainer);

                    // Force refresh containing datatable on success.
                    if ($multiSelectContainer.parents(".datatable")[0]?.id) {
                        window.GofastKDataTableReload($multiSelectContainer.parents(".datatable")[0].id);
                    }
                }
            })
            .fail(function(response) {
                if (response.status == 403) {
                  Gofast.toast(Drupal.t("Operation forbidden"), "error");
                } else {
                  Gofast.toast(Drupal.t("Something went wrong!"), "error");
                }
                Gofast.toggleMultiSelectSpinner($multiSelectContainer);
            });
        // Remove the spinner if everything went fine
        Gofast.toggleMultiSelectSpinner($multiSelectContainer);
    }

    // Handler to display a spinner when a multiselect input is submitting
    Gofast.toggleMultiSelectSpinner = function ($multiSelectContainer) {
        const $multiSelectTemplate = $multiSelectContainer.find(".gofast-directory-multiselect-template");
        const $confirmationButtons = $multiSelectContainer.find(".editableInputConfirmationButtons");
        if ($confirmationButtons.find(".spinner").length) {
            $multiSelectTemplate.css("pointer-events", "auto");
            $multiSelectTemplate.parent().css("cursor", "auto");
            $confirmationButtons.find(".spinner").remove();
        } else {
            $multiSelectTemplate.css("pointer-events", "none");
            $multiSelectTemplate.parent().css("cursor", "not-allowed");
            $confirmationButtons.append($("<div class='spinner'>"));
        }
    }

    // Switch between edition and readonly mode of a multiselect input (should be called on span click, confirm and cancel)
    Gofast.toggleMultiSelect = function(e, $multiSelectContainer) {
        e.stopPropagation();
        const $multiSelectSpan = $multiSelectContainer.find(".gofast-directory-multiselect-span");
        const $multiSelectTemplate = $multiSelectContainer.find(".gofast-directory-multiselect-template");
        const classes = $multiSelectSpan.hasClass("d-block") ? ["d-block", "d-none"] : ["d-none", "d-block"]
        $multiSelectSpan.removeClass(classes[0]).addClass(classes[1]);
        $multiSelectTemplate.removeClass(classes[1]).addClass(classes[0]);
    }

    Gofast.updateSelectWidth = function($select) {
        const displayedValue = $select.find("option:selected").text();
        $select.css("paddingInline", ".5rem");
        $select.css("width", (displayedValue.length + 4) + "ch");
    }

    // Add the events to make a multiselect input behave properly
    Gofast.initMultiSelectInput = function($multiSelectContainer) {
        // Get elements
        const $multiSelectSpan = $multiSelectContainer.find(".gofast-directory-multiselect-span");
        const $confirmButton = $multiSelectContainer.find(".confirmButton");
        const $cancelButton = $multiSelectContainer.find(".cancelButton");
        const $clearButton = $multiSelectContainer.find(".clearButton");

        // Attach events
        $multiSelectSpan.on("click", e => Gofast.toggleMultiSelect(e, $multiSelectContainer));
        $confirmButton.on("click", e => Gofast.submitMultiSelect(e, $multiSelectContainer));
        $cancelButton.on("click", e => Gofast.toggleMultiSelect(e, $multiSelectContainer));
        $clearButton.on("click", e => Gofast.submitMultiSelect(e, $multiSelectContainer, true));

        // Initialize select elements and set their initial width
        $multiSelectContainer.find(".gofast-directory-multiselect-selects").children("select").each(function() {
            Gofast.updateSelectWidth($(this));
        });
        $multiSelectContainer.find(".gofast-directory-multiselect-selects").children("select").on("change", function() {
            Gofast.updateSelectWidth($(this));
        });
    }

    Gofast.initPermissionsForm = function() {
        $('div.form-item-permissions-3administrator-bs-switch').after('<hr>');
        $('div.form-item-permissions-internal-bs-switch').after('<hr>');
        $('input#edit-permissions-4contributor-bs-switch').on('change', function() {
            if ($(this).prop('checked')) {
                $('input#edit-permissions-7business-administrator-bs-switch').prop('checked', false);
                $('input#edit-permissions-3administrator-bs-switch').prop('checked', false);
            }
        });
        $('input#edit-permissions-3administrator-bs-switch, input#edit-permissions-7business-administrator-bs-switch').on('change', function() {
            if ($(this).prop('checked')) {
                $('input#edit-permissions-4contributor-bs-switch').prop('checked', false);
            }
        });
        $('input#edit-permissions-internal-bs-switch').on('change', function() {
            if ($(this).prop('checked')) {
                $('input#edit-permissions-extranet-bs-switch').prop('checked', false);
            } else {
                $('input#edit-permissions-extranet-bs-switch').prop('checked', true);
            }
        });
        $('input#edit-permissions-extranet-bs-switch').on('change', function() {
            if ($(this).prop('checked')) {
                $('input#edit-permissions-internal-bs-switch').prop('checked', false);
            } else {
                $('input#edit-permissions-internal-bs-switch').prop('checked', true);
            }
        });
        // we have to select at least one permission between extranet and internal, which are strictly commutative
        // GOFAST-14611: only seed the pair when the server-side prefill left both off
        if (!$('input#edit-permissions-extranet-bs-switch').prop('checked') && !$('input#edit-permissions-internal-bs-switch').prop('checked')) {
            $('input#edit-permissions-extranet-bs-switch').prop('checked', true);
        }
    }

    // Generic submit handler for directories forms
    window.GofastKDataTableFormSubmit = function(e, _table) {
        e.preventDefault();
        _table.spinnerCallback(true)
        let filterArr = $(e.currentTarget).serializeArray();
        let filter = Object.create({});

        filterArr.forEach((fil) => {
          if (!!fil.value) {
            let att = fil.name;
            filter[att] = fil.value;
          }
        });

        // Validation for date ranges
        const dateRanges = $(".datatable .GofastDateRange");
        for (const dateRange of dateRanges) {
            const startName = $(dateRange).find("input:nth-of-type(1)").attr("name");
            const endName = $(dateRange).find("input:nth-of-type(2)").attr("name");
            const dateValues = [{start: filter[startName], end: filter[endName]}];
            for (const dateValue of dateValues) {
                if ((dateValue.start && !dateValue.end) || (!dateValue.start && dateValue.end)) {
                    Gofast.toast(Drupal.t("Please fill in both start and end dates", {}, {context: "gofast:gofast_directory"}), "error");
                    return;
                }
            }
            // We have to convert the date string value into a timestamp before submission, so the server will be able to handle the filtering request
            if(filter[startName]) filter[startName] = moment(filter[startName], GofastConvertDrupalDatePattern("moment", Drupal.settings.date_format_short, false)).valueOf() / 1000;
            // The end date is inclusive: filter up to the end of that day
            if(filter[endName]) filter[endName] = moment(filter[endName], GofastConvertDrupalDatePattern("moment", Drupal.settings.date_format_short, false)).endOf("day").unix();
        }

        _table.setDataSourceParam("query", filter);
        if(filter){_table.setDataSourceParam("currentPage", _table.getCurrentPage());} // set currentPage in the request if filter is applied GOFAST-11592
        _table.reload();
    }

    window.GofastKDataTableReload = function(tableId) {
        $("#" + tableId + " thead tr:first-of-type th:nth-of-type(2)").html(""); // remove megacheckbox
        $(".datatable-subheader spacer:first-of-type").text(""); // remove megacheckbox counter
        $(".GofastTable.datatable#" + tableId).KTDatatable().reload();
    };

    window._GofastKDataTableSelectCounter = function(rowsCount, tableId) {
      let targetContainer = $("#" + tableId + " thead tr:nth-of-type(2) spacer:first-of-type"); 
      if(tableId == "gofastAdvancedSearchResults"){ 
        if($("#" + tableId + " thead tr:nth-of-type(1) [data-field^=action] > .selected-items-count > span").length == 0){ 
          $("#" + tableId + " thead tr:nth-of-type(1) [data-field^=action] > .selected-items-count").prepend('<span class="position-absolute">' + Drupal.t("Total:") + " " + rowsCount + '</span>'); 
        } 
        targetContainer = $("#" + tableId + " thead tr:nth-of-type(1) [data-field^=action] > .selected-items-count > span"); 
      } 
 
      if (rowsCount === 0) { 
          targetContainer.html("&nbsp;"); 
          return; 
      } 
      targetContainer.css({ 
          display: "flex", 
          whiteSpace: "noWrap", 
      }); 
      targetContainer.text(Drupal.t("Total:") + " " + rowsCount); 
    };

    /**
     * pseudo-facade triggering the GofastRefreshKDataTableMegaDropdown global function accordingly to the given rows array state
     * @warning in order to be triggered correctly, this pseudo-facade must be called on both "datatable-check" and "dataTable-uncheck" events
     * @param {HTMLTableRowElement[]} rows 
     * @param {string} tableId 
     * @param {boolean} defaultAction
     * @param {boolean} useSingleRowAction Display specific row action if only one is selected
     */
    window.GofastTriggerKDataTableMegaDropdown = function(rows, tableId, defaultAction = false, useSingleRowAction = true) {
        _GofastKDataTableSelectCounter(rows.length, tableId);
        if (!rows.length) {
            _GofastRefreshKDataTableMegaDropdown(tableId, -2, defaultAction);
            return;
        }
        if (rows.length == 1 && useSingleRowAction) {
            const rowId = $(rows[0]).attr("data-row");
            _GofastRefreshKDataTableMegaDropdown(tableId, rowId);
            return;
        }
        _GofastRefreshKDataTableMegaDropdown(tableId);
    }
    
    /**
     * directory dropdowns are hidden by default: regardless of their original location, this function shows them in the same spot to give the user the impression there is only one "mega" dropdown
     * @param {string} tableId | DOM ID of the Keen Datable
     * @param {number} rowId | if -1, looks for the bulk actions dropdown, if even less, display default action if any or clears the dropdown, otherwide looks for the dropdown in the row with the given rowId
     */
     window._GofastRefreshKDataTableMegaDropdown = async function (tableId, rowId = -1, defaultAction = false) {
        let $widthReference = $("#" + tableId + " thead tr:nth-of-type(2) form > *:nth-of-type(2)");
        // Wait for width reference to be in the DOM (one second max, otherwise reject)
        if (!$widthReference.length) {
            $widthReference = await new Promise((resolve, reject) => {
                const maxAttempts = 10;
                let attempts = 0;
                const intervalId = setInterval(() => {
                    const $widthReference =  $("#" + tableId + " thead tr:first-of-type th:nth-of-type(2)");
                    if ($widthReference.length) {
                        clearInterval(intervalId);
                        resolve($widthReference);
                    }
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        reject();
                    }
                }, 100);
            });
        }
        const $targetContainer =  $("#" + tableId + " thead tr:first-of-type th:nth-of-type(2)");
        const targetWidth =  $widthReference.width();
        $targetContainer.html("");
        $targetContainer.width(targetWidth);
        if (rowId < -1 && !defaultAction) {
            return;
        }
        if (rowId < -1 && defaultAction) {
            const $defaultAction = $(defaultAction);
            $defaultAction.width(targetWidth);  
            $targetContainer.html($defaultAction);
            return
        }
        let $dropdownContainer = $("#container-selected-items");
        $dropdownContainer.hide()
        if (rowId > -1) {
            $dropdownContainer = $("#" + tableId + " tr[data-row='" + rowId + "'] [data-field='actions'] .contextual-actions-container");
            if (!$dropdownContainer.length) {
                $dropdownContainer = $("#" + tableId + " tr[data-row='" + rowId + "'] [data-field='actions'] .dropdown");
            }
            if (!$dropdownContainer.length) {
                $dropdownContainer = $("#" + tableId + " tr[data-row='" + rowId + "'] [data-field='actions'] .contextual-actions");
            }
            if (!$dropdownContainer.children().length) {
                return;
            }
            $dropdownContainer.hide();
        }
        const $dropdownContainerClone = $dropdownContainer.clone(true).width(targetWidth);
        $dropdownContainerClone.parent().find(".dropdown").css("cssText", "margin-left: 0 !important;");
        $dropdownContainerClone.appendTo($targetContainer);
        $targetContainer.css("font-weight", "400");
        $targetContainer.children().show();
        $targetContainer.find(".dropdown-menu").css("display", "");
        // "dispose" will not really destroy the tooltips, which will therefore remained attached to their original hidden coordinates
        // so if we want the tooltips to show at the right place, we have to clone all items with a tooltip (without tied events) and reinsert them
        $targetContainer.find('[data-toggle="tooltip"]').each(function() {
            var $this = $(this);
            var $clone = $this.clone();
            $this.replaceWith($clone);
        });
        $targetContainer.find('[data-toggle="tooltip"]').tooltip();
        Drupal.attachBehaviors();
    }

    /**
     * refreshes layout of the Keen Datatable subheader, is called on subheader add but
     * @warning must also be called on the KDataTable "datatable-ajax-done" event
     * @param {string} tableId | DOM ID of the Keen Datable 
     * @param {string} formId | DOM ID of the form wrapping the subheader
     */
    window.GofastRefreshKDataTableSubheader = function (tableId, formId) {
        // Drawn while hidden (e.g. in an inactive tab), the table has no usable cell widths: redraw it once shown.
        const table = document.getElementById(tableId);
        if (table) {
            const width = table.offsetWidth;
            const datatable = $(table).data("KTDatatable");
            if (table.dataset.gofastLastWidth === "0" && width > 0 && datatable) {
                datatable.redraw();
            }
            table.dataset.gofastLastWidth = width;
        }
        if ($("#" + tableId).attr("data-prevent-refresh") == "true") {
            $("#" + tableId).attr("data-prevent-refresh", "false");
            return;
        }
        setTimeout(function() {
            const firstRow = $("#" + tableId + " tbody tr:first-of-type > td");
            // Keen may render thead with wider cells than tbody, that's why we make sure everything is aligned
            const headerCellsWidth = $("#" + tableId + " thead tr:first-of-type th").map(function (i, el) {
                if (firstRow.length) {
                    el.style.width = getComputedStyle(firstRow[i]).width;
                    return parseInt(getComputedStyle(firstRow[i]).width);
                }
                return parseInt(getComputedStyle(el).width);
            });
            const formElements = $("#" + formId + " > *:not(input.js-tagify)");
            for (let i = 0; i < formElements.length; i++) {
                if (formElements[i].classList.contains("GofastDirectoryFilterButtons") && formElements[i].classList.contains("flex-column")) {
                    continue;
                }
                // even if the form element collapses for some reason, we make sure the inputs will not collapse
                formElements[i].style.minWidth = (headerCellsWidth[i] - 10) + "px";
                formElements[i].style.maxWidth = (headerCellsWidth[i] - 10) + "px";
                formElements[i].style.marginInline = "5px";
                if (formElements[i].tagName == "INPUT") {
                    formElements[i].addEventListener("keydown", function(e) {
                        if (e.code == "Enter") {
                            $(".datatable-subheader form").submit();
                        }
                    });
                }
                if (formElements[i].querySelector(".input-group-text")) {
                    formElements[i].querySelector(".input-group-text").style.width = "auto";
                }
            }
            // remove classes KTDatatable add on sort which unexpectedly translate the subheader layout
            $(".datatable-subheader > th").attr("class", "");
            $(".datatable-subheader").css("visibility", "visible");
            $(".datatable-subheader .fa-search").attr("title", Drupal.t("Apply current filters")).tooltip();
            $(".datatable-subheader .fa-undo").attr("title", Drupal.t("Reset current filters")).tooltip();
        }, 250);
    }

    /**
     * this adds a subheader to a Keen Datatable, but may work for other purposes
     * @warning to be triggered correctly, this function must be called on the KDataTable "datatable-on-layout-updated" event
     * @param {string} tableId | DOM ID of the Keen Datable 
     * @param {string} formId | DOM ID of the form wrapping the subheader
     * @param {string[]} templateElements | array of template elements: number of template elements _must_ be the same as the number of columns, submit button(s) may be included, template elements values must be raw HTML strings and if a column is skipped just put an empty string instead
     */
    window.GofastAddKDataTableSubheader = function (tableId, formId, templateElements) {
        if ($("#" + tableId + " thead #" + formId).length) {
            return;
        }
        let subheaderTemplate = '<tr class="datatable-subheader" style="border-bottom: 1px solid #EBEDF3; visibility: hidden;"><th><form id="' + formId + '" class="pb-2 d-flex align-items-center" style="max-height: 50px;">';
        for (const element of templateElements) {
            if (element === "") {
                subheaderTemplate += "<spacer></spacer>";
                continue;
            }
            subheaderTemplate += element;
        }
        subheaderTemplate += '</form></th></tr>';
        $("#" + tableId + " thead").append(subheaderTemplate);
        $("#" + tableId + " thead tr:first-of-type").css("border-bottom", "none");
        $("#" + tableId + " thead tr:nth-of-type(2)").css({display: "flex", justifyContent: "start", width: "100%"});

        var arrows;
        if (KTUtil.isRTL()) {
            arrows = {
                leftArrow: '<i class="la la-angle-right"></i>',
                rightArrow: '<i class="la la-angle-left"></i>'
            }
        } else {
            arrows = {
                leftArrow: '<i class="la la-angle-left"></i>',
                rightArrow: '<i class="la la-angle-right"></i>'
            }
        }

        // Datepicker configuration and callbacks
        const datePickerDirectoryConf = {
            language: window.GofastLocale,
            locale : window.GofastLocale,
            format: window.GofastConvertDrupalDatePattern("bootstrapDate"),
            rtl: KTUtil.isRTL(),
            todayHighlight: true,
            templates: arrows,
            clearBtn: true,
            autoclose: true,
        };
        const changeDateCallback = function(e) {
            if (typeof e.date === "undefined") {
                $(e.target).tooltip("dispose");
                return;
            }
            const $dateInput = $(e.target)
            const inputName = $dateInput.attr("name");
            const $siblingInput = $("[name='" + inputName.replace("start", "end") + "']");
            // Setting a start date fills an empty or earlier end date with the same day (the end date is inclusive)
            if (inputName.startsWith("start") && $siblingInput.length && typeof e.date != "undefined") {
                const siblingDate = $siblingInput.datepicker("getDate");
                if (!siblingDate || siblingDate.getTime() < e.date.getTime()) {
                    $siblingInput.datepicker("setDate", e.date);
                }
            }
            $dateInput.tooltip("dispose");
            $dateInput.attr("title", $dateInput.val());
            $dateInput.attr("data-toggle", "date-tooltip");
            $dateInput.tooltip();
        };
        const showCallback = function(e) {
            // prevent datepicker from overflowing on smaller screens
            $(".datepicker:visible").css("z-index", 10000);
            e.target.style.display = "static";
            const distanceFromRight = $(window).width() - ($(e.target).offset().left + $(e.target).width());
            if (distanceFromRight < 150) {
              $(".datepicker:visible").css("left", (parseInt($(".datepicker:visible").css("left")) + 144) + "px");
            }
        };
        const clearDateCallback = function(e) {
            // the native "clearDate" method of the datepicker will reinit the value of one input but trigger updateDate on all the input siblings with the last value... so we force reset the siblings as well
            $(e.target).parent().find("input").val("").datepicker("update");
            $(e.target).parent().find("input").val("").datepicker("clearDates"); // will not call "clearDate" again: it's a different event
        };

        // Init datepicker
        setDatepickerL18n();
        $('.GofastDateRange').datepicker(datePickerDirectoryConf).on("changeDate", changeDateCallback).on("show", showCallback).on("clearDate", clearDateCallback);

        // When clicking on the dropdown menu, remove display: none from filters
        $("#" + tableId ).on('click', function() {
            const $subHeaderContainer =  $("#" + tableId + " thead");
            $subHeaderContainer.find(".dropdown-menu").css("display", "");
        });

        // Event for filters reset
        $(".datatable-subheader button[type='reset']").on("click", (e) => {
            e.preventDefault();
            const $dropdownCell =  $("#" + tableId + " thead tr:first-of-type th:nth-of-type(2)");
            // delete cell content only if it's set to hold a checkbox
            if ($dropdownCell.attr("data-field") == "" || $dropdownCell.attr("data-field") == "picture") {
                $("#" + tableId + " thead tr:first-of-type th:nth-of-type(2)").html(""); // remove dropdown
            }
            $(".datatable-subheader spacer:first-of-type").text(""); // remove dropdown counter
            $("[data-toggle='date-tooltip']").tooltip("dispose");
            // cleanup datepickers inputs, then datepickers themselves
            $("[data-toggle='date-tooltip']").val("").datepicker("update");
            $("[data-toggle='date-tooltip']").datepicker("clearDates");

            // reset values and submit again (more reliable to submit again than counting on some input listeners)
            $(".datatable-subheader select").val('').selectpicker('refresh');
            $(".datatable-subheader input").each(function() {
                const inputDefaultValue = $(this).attr("data-default") || null;
                $(this).val(inputDefaultValue);
            });
            $(".datatable-subheader select").each(function() {
                const inputDefaultValue = $(this).attr("data-default") || null;
                $(this).val(inputDefaultValue);
            });
            $("#" + formId).submit();  
        });

        GofastRefreshKDataTableSubheader(tableId, formId);
        
        $(".selectpicker").selectpicker({size: 7})
    }
    
        /**
       * this adds a topfooter to a Keen Datatable, but may work for other purposes
       * @warning to be triggered correctly, this function must be called on the KDataTable "datatable-on-layout-updated" event
       * @param {string} tableId | DOM ID of the Keen Datable 
       * @param {string} formId | DOM ID of the form wrapping the topfooter
       * @param {string[]} templateElements | array of template elements: number of template elements _must_ be the same as the number of columns, submit button(s) may be included, template elements values must be raw HTML strings and if a column is skipped just put an empty string instead
       */
         window.GofastAddKDataTableTopFooter = function (tableId, formId, templateElements) {
            if ($("#" + tableId + " .datatable-pager #" + formId).length) {
                return;
            }
            
            let topfooterTemplate = '<div class="datatable-topfooter" style="border-bottom: 1px solid #EBEDF3;"><form id="' + formId + '" class="pb-2 d-flex align-items-center" style="max-height: 50px;">';
            for (const element of templateElements) {
                if (element === "") {
                    topfooterTemplate += "<spacer></spacer>";
                    continue;
                }
                topfooterTemplate += element;
            }
            
            topfooterTemplate += '</form></div>';
            
            $("#" + tableId + " .datatable-pager").prepend(topfooterTemplate);
            //$("#" + tableId + " thead tr:first-of-type").css("border-bottom", "none");
            //$("#" + tableId + " thead tr:nth-of-type(2)").css({display: "flex", justifyContent: "start", width: "100%"});
        }
})(jQuery, Gofast, Drupal);
