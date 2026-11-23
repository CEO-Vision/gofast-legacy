(function ($, Gofast, Drupal) {
  'use strict';

  Drupal.gofast_og = Drupal.gofast_og || {};
  Gofast.og = Gofast.og || {};
  Gofast.og.overSpace = false;

  var fromTree = false;

  Gofast.og.showOGPopup = function() {
      Gofast.og.overSpace = true;
      var nid = this.id, url,
              popup = $(this).find('.space-popup'),
              throbber = '<i aria-hidden="true" class="icon glyphicon glyphicon-refresh glyphicon-spin"></i>';
      popup.html(throbber).mouseleave(Gofast.og.hideOGPopup);

      url = '/gofast_og/space/popup/' + nid;

      $.ajax({
          url: url,
          dataType: 'html',
          beforeSend: function(xhr) {
              Gofast.xhrPool = Gofast.xhrPool || {};
              Gofast.xhrPool.xhrShowOGPopup = xhr;
          },
          'complete': function() {
              delete Gofast.xhrPool.xhrShowOGPopup;
          },
          success: function(response) {
              if(Gofast.og.overSpace === true) {
                  popup.html(response);
                  Drupal.attachBehaviors();
              }
          }
      });
  };

  Gofast.og.hideOGPopup = function() {
      Gofast.og.overSpace = false;
      $(this).find('.space-popup').children().remove();
  };

  Gofast.og.getSpaceBookmarks = function(gid) {
    jQuery.post(location.origin + "/gofast/bookmarks/favorites_contents", {
      gid: gid,
      flag_type: "flag_public",
      from_home_page: true,
    }).done(function(data) {
        jQuery("#gofastOgHomeFavoritesContainer").html(data);
    });
  };

  Drupal.behaviors.gofastOGSpacePopup = {
      attach : function(context, settings) {
          var config = {
              sensitivity: 7,
              interval: 100,
              over: Gofast.og.showOGPopup,
              timeout: 0,
              out: Gofast.og.hideOGPopup
          };
          setTimeout(function() {
              $('.space-icon.space-to-popup:not(.gofast-popup-processed)').addClass('gofast-popup-processed').each(function() {
                    $(this).hoverIntent(config);
                });
          }, 8000);

      }
  };

  $(document).ready(function () {
    var $ = jQuery;
    //Switch tab when hash change in url at navigation (back/fwd button)
    $(window).bind('hashchange', function(e){
      const excludedHashes = ["#users_stats", "#documents_stats", "#ogaudit"];
      if (excludedHashes.includes(location.hash)) {
        return;
      }
      if($(".gofast-og-page").length < 1){
          //Prevent doing these actions outside of a space page
          return;
      }
      // remove active classes on previously active tab dropdown items
      $("#gofastBrowserNavTabs .nav-item.dropdown a.dropdown-item").removeClass("active");
      if(location.hash === ""){
        history.replaceState(null, "Gofast", location.href + "#oghome");
        $("#ogtab_home").click();
      }
      if(location.hash !== "#ogdocuments" && !Gofast._settings.isEssential){
        clearInterval(Gofast.ITHit.refreshBreadcrumbTimeout);
        //Get params
        const urlParams = new URLSearchParams(location.search);
        const path = urlParams.get("path");
        if (!!path) {
          Gofast.ITHit.refreshBreadcrumb(path, true);
        }
      }

      $('.gofast-og-page a[href="' + location.hash + '"]').tab('show');
      $(window).scrollTop(0);
      if($("#file_browser_full_tree_element").length > 0){
          $("#file_browser_full_tree_element").mCustomScrollbar('scrollTo', 'left');
          $('.mCSB_scrollTools_vertical').css('visibility', 'visible');
          $('.mCSB_scrollTools_horizontal').css('visibility', 'visible');
      }
    });
    $('#tabs_og_group').tabs();
    $('#panel_ztree_og').css('max-height', $(window).height()*0.7);
    window.onresize = function(){
      $('#panel_ztree_og').css('max-height', $(window).height()*0.7);
    };
    $(document).scroll(function(){
      $('#panel_ztree_og').css('top', $(this).scrollTop()+97);
    });

    Drupal.deleteSpace = function(gid){
      var modal_form = $('#delete_space_modal_container');
      var modal_process = $('#delete_space_modal_process_container');

      modal_form.hide();
      modal_process.css('display', 'block');

      const $deleteButton = $('#modal-footer #deleteButton');
      $deleteButton.attr('disabled', '1');

      //Step 1 : Delete the documents
      $("#delete_step_1").append("<div class='loader-deleting'></div>");

      //Step 1-1 : Remove multifiling
      $("#delete_step_1_1").append("<div class='loader-deleting'></div><span id='delete_remaining_items'></span>");
      Drupal.removeMultifiling(gid);
    };

    Drupal.removeMultifiling = function(gid){
      $.get(location.origin + "/gofast_og/delete_space/" + gid + "/unmultifile_documents").done(function(data){
        if(data === "OK"){
          $("#delete_step_1_1").find(".loader-deleting").remove();
          $("#delete_remaining_items").remove();
          $("#delete_step_1_1").append(' <i class="fa fa-check" style="color:green;"></i>');
          Drupal.deleteDocuments(gid);
        }else if(!isNaN(data)){
          // There are multi-filed documents to process still.
          $("#delete_remaining_items").html(" " + data + " " + Drupal.t("items remaining..."));
          Drupal.removeMultifiling(gid);
        }else{
          $("#delete_step_1_1").find(".loader-deleting").remove();
          $("#delete_step_1").find(".loader-deleting").remove();
          $("#delete_remaining_items").remove();
          $("#delete_step_1_1").append(' <i class="fa fa-times" style="color:red;"></i> <span>' + data + "</span>");
          $("#delete_step_1").append(' <i class="fa fa-times" style="color:red;"></i>');
        }
      });
    };

    Drupal.deleteDocuments = function(gid){
      //Step 1-2 : Delete all the documents
      $("#delete_step_1_2").append("<div class='loader-deleting'></div><span id='delete_remaining_items'></span>");
      Drupal.deleteDocumentsProcess(gid);
    };

    Drupal.deleteDocumentsProcess = function(gid){
      $.get(location.origin + "/gofast_og/delete_space/" + gid + "/delete_documents").done(function(data){
        if(data === "OK"){
          $("#delete_step_1_2").find(".loader-deleting").remove();
          $("#delete_step_1").find(".loader-deleting").remove();
          $("#delete_remaining_items").remove();
          $("#delete_step_1_2").append(' <i class="fa fa-check" style="color:green;"></i>');
          $("#delete_step_1").append(' <i class="fa fa-check" style="color:green;"></i>');
          Drupal.deleteSpaceFolder(gid);
        }else if(!isNaN(data)){
          $("#delete_remaining_items").html(" " + data + " " + Drupal.t("items remaining..."));
          Drupal.deleteDocumentsProcess(gid);
        }else{
          $("#delete_step_1_2").find(".loader-deleting").remove();
          $("#delete_step_1").find(".loader-deleting").remove();
          $("#delete_remaining_items").remove();
          $("#delete_step_1_2").append(' <i class="fa fa-times" style="color:red;"></i> <span>' + data + "</span>");
          $("#delete_step_1").append(' <i class="fa fa-times" style="color:red;"></i>');
        }
      });
    };

    Drupal.deleteSpaceFolder = function(gid){
      //Step 2 : Delete the folders
      $("#delete_step_2").append("<div class='loader-deleting'></div>");
      $.get(location.origin + "/gofast_og/delete_space/" + gid + "/delete_folder").done(function(data){
        if(data === "OK"){
          $("#delete_step_2").find(".loader-deleting").remove();
          $("#delete_step_2").append(' <i class="fa fa-check" style="color:green;"></i>');
          //[GOFAST-6199] get parent space path
          $.post("/gofast_og/" + gid + "/get_parent_space_path/").done(function(parent_path){
              Drupal.deleteSpaceDrupal(gid, parent_path);
          },"text");
        }else{
          $("#delete_step_2").find(".loader-deleting").remove();
          $("#delete_step_2").append(' <i class="fa fa-times" style="color:red;"></i> <span>' + data + "</span>");
        }
      });
    };

    Drupal.deleteSpaceDrupal = function(gid, parent_path){
      //Step 2 : Delete the drupal space
      $("#delete_step_3").append("<div class='loader-deleting'></div>");
      $.get(location.origin + "/gofast_og/delete_space/" + gid + "/delete_drupal").done(function(data){
        setTimeout(Drupal.deleteSpaceDrupalProgress, 5000, gid, parent_path);
      });
    };

    Drupal.deleteSpaceDrupalProgress = function(gid, parent_path){
      $.get(location.origin + "/gofast_og/delete_space/" + gid + "/delete_drupal_progression").done(function(data){
        if (data !== "OK") {
          setTimeout(Drupal.deleteSpaceDrupalProgress, 5000, gid);
          return;
        }
        $("#delete_step_3").find(".loader-deleting").remove();
        $("#delete_step_3").append(' <i class="fa fa-check" style="color:green;"></i>');

        // Replace "delete" button with "close" button.
        const $deleteButton = $("#modal-footer #deleteButton");

        const $closeButton = $(
          '<button type="button" class="btn btn-success">' + Drupal.t("Close") + "</button>",
        );
        $closeButton.on("click", () => Drupal.CTools.Modal.dismiss());

        $deleteButton.replaceWith($closeButton);
      });

      //[GOFAST-6199]
      var str = parent_path.split("*");
      var url = "/" + str[0];
      url += "?&path=/Sites" + str[1] + "#ogdocuments";
      Gofast.processAjax(url);
      Gofast.toast(Drupal.t("Your space has been deleted", {}, {context : 'gofast:og'}));
      // notify node was deleted
      window.dispatchEvent(
        new CustomEvent("gofast:node_delete", {
          detail: {
            nid: gid,
          },
        })
      );
    };
  });

  /**
   * Handler to show a warning popup before leaving the page that
   * progress/unsaved data may be lost.
   *
   * @param {BeforeUnloadEvent} e Before unload event.
   */
  const beforeUnloadPopupHandler = (e) => {
    // Modern way.
    e.preventDefault()

    // Legacy support.
    e.returnValue = true;
    return true;
  }

  /**
   * Configures the browser to show a confirmation popup before leaving the page.
   *
   * @returns {() => void} A function to do cleanup tasks when popup is no
   *  longer necessary.
   */
  const useBeforeUnloadPopup = () => {
    window.addEventListener('beforeunload', beforeUnloadPopupHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadPopupHandler);
  }

  /** Enumeration of restoration steps */
  const SpaceRestorationStep = Object.freeze({
    Start: "start",
    RestoreFolder: "restore_folder",
    RestoreContents: "restore_contents",
    RestoreNode: "restore_node",
    End: "end",
  });

  /**
   * @typedef {typeof SpaceRestorationStep} SpaceRestorationStepEnum Enum object type
   * @typedef {(SpaceRestorationStepEnum)[keyof SpaceRestorationStepEnum]} SpaceRestorationStep Restoration step action
   */

  /**
   * @typedef {object} RestoreStepResult Step process result object
   * @property {boolean} ok If the step processing was successful
   * @property {'done'|'error'|'processing'} status Step processing status, one of:
   *  - `'done'`: the step processing is complete.
   *  - `'error'`: An error occurred during processing.
   *  - `'processing'`: the step is still processing and will have more work to do.
   */

  /**
   * @typedef {object} RestoreStepProcessingResult Restoration step response data.
   * @property {RestoreStepResult} result Processing result.
   * @property {SpaceRestorationStep} action The action that was just executed.
   * @property {SpaceRestorationStep|null} next The next action to be executed.
   * @property {number} nodeId The ID of the node the restoration
   *  processing step was executed.
   */

  /**
   * @typedef {object} RestoreSpaceBeforeEachStepState State object representing
   *  the situation before executing a restoration step.
   * @property {SpaceRestorationStep} action The current action about to be executed.
   * @property {SpaceRestorationStep|null} previous The last action that was executed.
   */

  /**
   * Button click event handler for the restore space modal "restore" button.
   *
   * @param {MouseEvent} event Triggering event.
   * @param {number} gid Node id of the space to restore.
   */
  Gofast.og.restoreSpaceModalButtonClickHandler = async function (event, gid) {
    // Make sure this is called on a DOM element.
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    const button = event.target;

    const unloadCleanup = useBeforeUnloadPopup();
    try {
      // Remove current event listener to prevent another click from triggering
      // the restoration process again.
      button.removeAttribute('onclick');
      button.removeEventListener(event.type, Gofast.og.restoreSpaceModalButtonClickHandler);
      button.setAttribute('disabled', '1');

      // Switch shown elements.
      $('#restore_space_modal_confirmation_container').hide();
      $('#restore_space_modal_progress_container').removeClass('d-none').addClass('d-flex');

      // Restore space, the callbacks handle the modal-specific DOM mutations.
      await Gofast.og.restoreSpace(gid, {
        onBeforeEachStep: restoreModalOnBeforeEachStep,
        onEachStepResponse: restoreModalOnEachStep,
      });

      // Notify we restored a space
      window.dispatchEvent(new CustomEvent('gofast:node_restored', {
        detail: {
          nid: gid,
        },
      }));
    } finally {
      unloadCleanup();
    }

    // When space directory table exists, refresh it.
    const $spacesDirectoryTable = $('#gofastDirectorySpacesTable');
    if ($spacesDirectoryTable.exists()) {
      // Unselect all elements.
      $spacesDirectoryTable.data('KTDatatable').setActiveAll(false);
      // Reload table.
      window.GofastKDataTableReload($spacesDirectoryTable.attr('id'));
    }

    // Replace "restore" button by "close" button
    const $restoreButton = $(button);

    const $closeButton = $(
      '<button type="button" class="btn btn-success">' + Drupal.t("Close") + "</button>",
    );
    $closeButton.on("click", () => Drupal.CTools.Modal.dismiss());

    $restoreButton.replaceWith($closeButton);
  }

  /**
   * Restore a space.
   *
   * @param {number} gid Id of the space node.
   * @param {object} [options] Call options object.
   * @param {(response:RestoreStepProcessingResult) => void} [options.onEachStepResponse]
   *  Callback called after each step's API call completed.
   * @param {(state:RestoreSpaceBeforeEachStepState) => void} [options.onBeforeEachStep]
   *  Callback called before calling each step's process API.
   */
  Gofast.og.restoreSpace = async function (gid, options = {}) {
    /** @type {SpaceRestorationStep|null} */
    let previous = null;
    /** @type {SpaceRestorationStep} */
    let action = SpaceRestorationStep.Start;
    let context = {};

    // Loop while we still have an action going (we break at a specific point).
    while (true) {
      // Invoke possible callback before step.
      options.onBeforeEachStep?.({ action, previous });

      // Make request to process step.
      const responseString = await $.post(
        location.origin + "/gofast_og/restore_space/" + gid + "/" + action,
        {
          context: JSON.stringify(context),
        },
      );

      // Parse response.
      const response = JSON.parse(responseString);
      const result = response.result;
      /** @type {SpaceRestorationStep|null} */
      const next = response.next;
      const nodeId = Number(response.node_id);

      // Invoke possible callback for after step with result.
      options.onEachStepResponse?.({ result, action, next, nodeId });

      // Handle step result error.
      if (!result.ok) {
        const message = "Error while restoring space.";
        console.error(message, { result });
        throw new Error(message);
      }

      // Check if we're done (no next step).
      if (next == null) {
        break;
      }

      // Prepare next iteration.
      previous = action;
      action = next;
      gid = nodeId;
      context = response.context;
    }
  };

  /**
   * Create a function executable before each restoration processing step that
   * adds or resets a loader element.
   *
   * @param {string} parentSelector CSS/JQuery Selector of element the loader
   *  will be appended to.
   * @returns A function callable before a restoration processing step is
   *  executed that will add a loader element to the given parent when first
   *  executing the step.
   */
  const addLoaderOnEnter = (parentSelector) => {
    const loaderIconTemplate = '<span class="loader-deleting"></span>';
    const loaderTemplate =
      '<span class="loader--root">' +
      '<span class="loader--icon-container ml-3">' +
      loaderIconTemplate +
      "</span>" +
      '<span class="loader--message ml-3"></span>' +
      "</span>";

    /**
     * Before step callback adding the loader element.
     * @param {RestoreSpaceBeforeEachStepState} state Current restoration state.
     */
    return function (state) {
      // When did not enter step: do nothing.
      if (state.previous === state.action) {
        return;
      }

      const $step = $(parentSelector);
      const $loader = $(loaderTemplate);
      const $root = $step.find('.loader--root');
      // Prevent adding a second loader by replacing a potentially already
      // existing one.
      if ($root.exists()) {
        $root.replaceWith($loader);
        return;
      }
      // Add loader.
      $step.append($loader);
    };
  }

  /**
   * Dispatches the call dynamically to one of the step functions defined in
   * this function's `steps` property depending on the current action.
   *
   * @param {RestoreSpaceBeforeEachStepState} state Restoration step response data.
   */
  function restoreModalOnBeforeEachStep(state) {
    restoreModalOnBeforeEachStep.steps[state.action]?.(state);
  }

  restoreModalOnBeforeEachStep.steps = {};

  restoreModalOnBeforeEachStep.steps[SpaceRestorationStep.RestoreFolder] =
    addLoaderOnEnter("#step_restore_folder");

  restoreModalOnBeforeEachStep.steps[SpaceRestorationStep.RestoreContents] =
    addLoaderOnEnter("#step_restore_contents");

  restoreModalOnBeforeEachStep.steps[SpaceRestorationStep.RestoreNode] =
    addLoaderOnEnter("#step_restore_node");

  /**
   * Create a function to update a loader element depending on the response of a
   * processing step.
   *
   * The loader element expects an element with the `loader--root` class with a
   * child having the `loader--icon-container` class and a child having the
   * `loader--message` class.
   *
   * @see {@linkcode addLoaderOnEnter} to add the loader element to update
   *  beforehand.
   *
   * @param {string} parentSelector The selector of a parent of the loader element.
   * @param {object} [options] An object of additional options to customize the behavior.
   * @param {(response:RestoreStepProcessingResult) => string|null|undefined} [options.processingMessageExtractor]
   *  Function to extract a message to be displayed after the loader during
   *  processing from the result. When a string is returned, that value is
   *  displayed in the `.loader--message` element. When a nullish value is
   *  returned, no message is displayed. Defaults to extracting truthy values
   *  of `response.result.message`.
   * @returns A function that updates a loader element depending on a
   *  restoration step result.
   */
  const restorationLoaderUpdater = (parentSelector, options = {}) => {

    const { processingMessageExtractor = (response) => response.result.message || null } = options;

    /**
     * Updates the loader according to the response
     * @param {RestoreStepProcessingResult} response Response of processing the
     *  restoration step.
     */
    return function (response) {
      // Get each DOM element we need to update the loader.
      const $step = $(parentSelector);
      const $loader = $step.find(".loader--root");
      const $iconContainer = $loader.find(".loader--icon-container");
      const $message = $loader.find(".loader--message");

      // Empty the message.
      $message.empty();

      // Handle processing status.
      if (response.result.status === "processing") {
        const messageValue = processingMessageExtractor(response);
        if (messageValue != null) {
          $message.text(messageValue);
        }
        return;
      }

      // Step is finished either with a success or an error, icon will change.
      $iconContainer.empty();
      // Handle success.
      if (response.result.status === "done") {
        $iconContainer.append('<i class="fa fa-check text-success"></i>');
        return;
      }

      // Handle error.
      const $error = $('<i class="fa fa-times text-danger"></i>');
      if (response.result.message) {
        $message.text(response.result.message);
      }
      $iconContainer.append($error);
    };
  }

  /**
   * Dispatches the call dynamically to one of the step functions defined in
   * this function's `steps` property depending on the current action.
   *
   * @param {RestoreStepProcessingResult} response Restoration step response data.
   */
  function restoreModalOnEachStep(response) {
    restoreModalOnEachStep.steps[response.action]?.(response);
  }

  restoreModalOnEachStep.steps = {};

  restoreModalOnEachStep.steps[SpaceRestorationStep.RestoreFolder] =
    restorationLoaderUpdater("#step_restore_folder");

  restoreModalOnEachStep.steps[SpaceRestorationStep.RestoreContents] = restorationLoaderUpdater(
    "#step_restore_contents",
    {
      // Extract remaining document count into a message.
      processingMessageExtractor: (response) =>
        Drupal.formatPlural(
          response.result.remaining,
          "1 item remaining...",
          "@count items remaining...",
          {},
          { context: "gofast" },
        ),
    },
  );

  restoreModalOnEachStep.steps[SpaceRestorationStep.RestoreNode] =
    restorationLoaderUpdater("#step_restore_node");

  Drupal.gofast_og.transform_tabs = function (tab_id) {
    $(document).ready(function ($) {
      //on remplit automatiquement le champs titre avec le nom du fichier choisit
      $('#fragment-' + tab_id).tabs();
    });
  };

  /**
   * OG/User membership edition forms. Process states for roles checkboxes so
   * that only 1 non-technical role can be assigned to a user (radios would not
   * do the job for technical roles values).
   */
  Drupal.behaviors.gofastOGAdminRolesStates = {
    attach: function (context, settings) {
      $('.og-roles-force-single:not(".processed")').addClass('processed').on('change', function(e){        
        // Check if single role is selected
        var item_checked = $('.og-roles-force-single .form-checkbox:checked');
        // if item is empty disabled submit button and add message to the right
        if(item_checked.length == 0){
          $('.form-submit').prop('disabled', true);
          $('.form-submit').addClass('disabled');
          if($('.form-item-submit-message') != undefined){
            $('#modal-footer #edit-submit').after('<div class="form-item form-type-textfield form-item-submit-message"><i class="fas fa-exclamation-triangle mr-2" style="color:#FFA800"></i>'+ Drupal.t('Please select at least one role') +'</div>');
          }
        }else if(e.target.type == "checkbox"){
          $('.og-roles-force-single .form-checkbox:checked:not(#' + e.target.id + ')').prop('checked', false);
          $('.form-submit').prop('disabled', false);
          $('.form-submit').removeClass('disabled');
          $('.form-item-submit-message').remove();
        }
      });
    }
  };

  Drupal.behaviors.gofastOGMembersFilters = {
    attach: function (context, settings) {
      $('[id^=gofast-og-member-filter-form]:not(.gofast-og-member-filter-form_processed)').addClass('gofast-og-member-filter-form_processed').each(function () {
        $('[id^=gofast-og-member-filter-form]').submit(function (e) {
          e.preventDefault();
        });

        $('[id^=gofast-og-member-filter-form] [id^=edit-reset-filters]').on('click', function () {
          $('[id^=edit-member-search]').val('');
          $('[id^=gofast-og-member-filter-form] [id^=edit-apply-filters]').click();
        });

        $('[id^=gofast-og-member-filter-form] [id^=edit-apply-filters]').on('click', function () {
          var text_value = $('[id^=edit-member-search]').val();
          $('[id^=edit-administrators-filter-input]').val(text_value);
          $('[id^=edit-contributors-filter-input]').val(text_value);
          $('[id^=edit-members-filter-input]').val(text_value);
          $('[id^=edit-requesters-filter-input]').val(text_value);
          $('[id^=edit-administrators-filter-input-]').siblings('div .views-submit-button').children('button').click();
          $('[id^=edit-contributors-filter-input-]').siblings('div .views-submit-button').children('button').click();
          $('[id^=edit-members-filter-input-]').siblings('div .views-submit-button').children('button').click();
          $('[id^=edit-requesters-filter-input-]').siblings('div .views-submit-button').children('button').click();
        });
      });
    }
  };

  Drupal.behaviors.og_grid = {
     attach: function() {
       if(($('.joinbtn')[0]) || ($('.cancelbtn')[0])){
            $('#contextual-actions-loading').hide();
       }else{
            $('#contextual-actions-loading').show();
       }
       $(document).trigger("scroll");
       $('#panel_ztree_og').css('max-height', $(window).height()*0.7);
       //In case of non-membership
       $('.joinbtn').not(".processed").on('click', function(caller){ //Click on join button
         if($(caller.target).hasClass("clicked")){ // Check if the button was already clicked
           return;
         }
         var caller_id = $(this).attr('id');
         var gid = caller_id.replace("join-", ""); //Get back the id of the caller div
         $(caller.target).addClass("clicked"); //Prevent from multiclicking

         $('#iconjoin_'+gid).removeClass("glyphicon-ok").addClass("glyphicon glyphicon-time"); //Change icon on the button
         $('#textjoin_'+gid).html(Drupal.t("Joining", {}, {'context' : 'gofast:og'})); //Change text on the button
         $('#textmembership_'+gid).html("");//Unset "you are not member" text

         $.ajax({ //Call to join the group
                url : Drupal.settings.gofast.baseUrl+'/og/list_grid/ajax/'+gid+'/join',
                type : 'GET',
                dataType: 'html',
                success : function(content, status){ //We edit the display (button + membership sentence)
                  $('#join_'+gid).replaceWith("<button type='button' class='btn btn-default cancelbtn' id='cancel_"+gid+"'><span id='iconcancel_"+gid+"' class='glyphicon glyphicon-remove' style='margin-right:7px;'></span><span id='textcancel_"+gid+"'>"+Drupal.t('Cancel', {}, {'context' : 'gofast:og'})+"</span></button>");
                  $('#textmembership_'+gid).html(Drupal.t('You are a pending requester of this space.', {}, {'context' : 'gofast:og'})).css("color", "blue");
                  Drupal.attachBehaviors('#cancel_'+gid);
                }
            });

       }).addClass("processed"); //Prevent multi attach to this listner on the same div

       //In case of pending membership
       $('.cancelbtn').not(".processed").on('click', function(caller){ //Click on the cancel button
         if($(caller.target).hasClass("clicked")){// Check if the button was already clicked
           return;
         }
         var caller_id = caller.currentTarget.id;
         var gid = caller_id.replace("cancel_", "");//Get back the id of the caller div
         $(caller.target).addClass("clicked"); //Prevent from multiclicking

         $('#iconcancel_'+gid).removeClass("glyphicon-ok").addClass("glyphicon glyphicon-time"); //Change icon on the button
         $('#textcancel_'+gid).html(Drupal.t("Canceling", {}, {'context' : 'gofast:og'})); //Change text on the button
         $('#textmembership_'+gid).html("");

         $.ajax({ //Call to cancel the membership request
                url : Drupal.settings.gofast.baseUrl+'/og/list_grid/ajax/'+gid+'/cancel',
                type : 'GET',
                dataType: 'html',
                success : function(content, status){ //We edit the display (button + membership sentence)
                  $('#cancel_'+gid).replaceWith("<button type='button' class='btn btn-default joinbtn' id='join_"+gid+"'><span id='iconjoin_"+gid+"' class='glyphicon glyphicon-ok' style='margin-right:7px;'></span><span id='textjoin_"+gid+"'>"+Drupal.t('Join', {}, {'context' : 'gofast:og'})+"</span></button>");
                  $('#textmembership_'+gid).html(Drupal.t('You are not member of this space.', {}, {'context' : 'gofast:og'})).css("color", "red");
                  Drupal.attachBehaviors('#join_'+gid);
                }
            });

       }).addClass("processed"); //Prevent multi attach to this listner on the same div


       $('.caller_fill').not(".processed").on('click', function(caller){
          var caller_id = caller.currentTarget.id;
          var gid = caller_id.replace("caller_", "");
          var placeholder_id = caller_id.replace("caller_", "#placeholder_");
          if($(placeholder_id).css('display') === 'none'){
            $(".arrow_"+gid).removeClass("glyphicon-arrow-down").addClass("glyphicon-arrow-up");
            $(placeholder_id).css('display', 'block').css('height', '100%');
            var height_ph = $(placeholder_id).height();

            //Expend ztree object
            var treeId = "ztree_og_grid";
            var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
            var node = zTreeObj.getNodeByParam('nId', gid);
            if(!fromTree){
              zTreeObj.expandNode(node, true, false, false, false);
            }

            $(placeholder_id).css('height', '0px').css('display', 'block').css('opacity', '0').animate({
              height: height_ph,
              opacity: "1"
            }, 500, "swing", function(){
              $(placeholder_id).css('height', '100%');
            });
          }
          else if($(placeholder_id).html() !== ""){
            $(".arrow_"+gid).removeClass("glyphicon-arrow-up").addClass("glyphicon-arrow-down");

            //Collpse ztree object
            var treeId = "ztree_og_grid";
            var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
            var node = zTreeObj.getNodeByParam('nId', gid);
            if(!fromTree){
              zTreeObj.expandNode(node, false, false, false, false);
            }

            $(placeholder_id).animate({
              height: "0px",
              opacity: "0"
            }, 500, "swing", function(){
              $(placeholder_id).css('display', 'none');
            });
          }
          else{
            $(".arrow_"+gid).removeClass("glyphicon-arrow-down").addClass("glyphicon-arrow-up");
            $(placeholder_id).css("display", "block").css("opacity", "0").animate({
              height: '100px'
              },200);
            $.ajax({
                url : Drupal.settings.gofast.baseUrl+'/og/list_grid/ajax/'+gid,
                type : 'GET',
                dataType: 'html',
                success : function(content, status){
                  //Expend ztree object
                  var treeId = "ztree_og_grid";
                  var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
                  var node = zTreeObj.getNodeByParam('nId', gid);
                  if(!fromTree){
                    zTreeObj.expandNode(node, true, false, false, false);
                  }

                  $(placeholder_id).html(content);
                  $(placeholder_id).children(".og_grid_level").children("#og_level_container").css("width", '100%');
                  Drupal.attachBehaviors(placeholder_id);
                  $(placeholder_id).css('display', 'block').css('height', '100%');
                  var height_ph = $(placeholder_id).height();
                  $(placeholder_id).css('height', '100px').css('display', 'block').css('opacity', '0').animate({
                    height: height_ph,
                    opacity: 1
                  }, 500, "swing", function(){
                    $(placeholder_id).css('height', '100%');
                  });
                }
            });
          }
        }).addClass("processed"); //Prevent multi attach to this listner on the same div

        $(".cadre_og_grid").not(".processed-enter").mousemove(function(e){
            var target = $(e.target);
            var path = target.children(".crumb_path").html();
            while (path === undefined){
              var target = target.parent();
              path = target.children(".crumb_path").html();
            }
            $("#float_crumbs").css("display", "block");
            $("#float_crumbs").html(path);
        }).addClass("processed-enter"); //Prevent multi attach to this listner on the same div

       $(".cadre_og_grid").not(".processed-move").mousemove(function(e){
          if($("#float_crumbs").css("display") === "none"){
            var target = $(e.target);
            var path = target.children(".crumb_path").html();
            while (path === undefined){
              var target = target.parent();
              path = target.children(".crumb_path").html();
            }
            $("#float_crumbs").css("display", "block");
            $("#float_crumbs").html(path);
          }
        }).addClass("processed-move"); //Prevent multi attach to this listner on the same div

        $(".cadre_og_grid").not(".processed-leave").mouseleave(function(e){
          $("#float_crumbs").css("display", "none");
        }).addClass("processed-leave"); //Prevent multi attach to this listner on the same div
     }
}

Drupal.behaviors.gofast_og_grid_ztree = {
    attach: function (context, settings) {
      context = $(context);

      $('#ztree_og_grid:not(.ztree-processed)', context).addClass('ztree-processed').each(function() {
        var data_tree = {};

        if (Drupal.settings.gofast_og_tree) {
          data_tree = $.parseJSON(Drupal.settings.gofast_og_tree.data_tree);
        }

        var settings = {  data: {
                                simpleData: {
                                    enable: true,
                                    }
                          },
                          view: {
                                showIcon: false,
                                selectedMulti: false,
                                fontCss: {color:"#428bca"},
                                txtSelectedEnable: false,
                                dblClickExpand: false,
                          },
                         callback: {
                           onClick: gofast_og_ztree_click,
                           beforeExpand: gofast_og_ztree_expand,
                           beforeCollapse: gofast_og_ztree_collapse
                          }
                       };
        var zTreeObj = $.fn.zTree.init($("#ztree_og_grid"), settings, data_tree);
        var topNode = zTreeObj.getNodeByParam('nId', -1);
        zTreeObj.expandNode(topNode, true, false, false, false);
      });
    }
  }

  Drupal.behaviors.gofast_og_grid_ztree_af = {
    attach: function (context, settings) {
      context = $(context);

      $('#ztree_og_grid_af_filter:not(.ztree-processed)', context).addClass('ztree-processed').each(function() {
        var data_tree = {};
        if (Drupal.settings.gofast_og_tree_af_filter) {
          data_tree = $.parseJSON(Drupal.settings.gofast_og_tree_af_filter.data_tree);
        }

        var settings = {  data: {
                                simpleData: {
                                    enable: true,
                                    }
                          },
                          view: {
                                showIcon: false,
                                selectedMulti: false,
                                fontCss: {color:"#428bca"},
                                txtSelectedEnable: false,
                                dblClickExpand: false,
                          },
                         callback: {
                           onClick: gofast_og_ztree_af_click,
                           beforeExpand: gofast_og_ztree_expand,
                           beforeCollapse: gofast_og_ztree_collapse
                          }
                       };
        var zTreeObj = $.fn.zTree.init($("#ztree_og_grid_af_filter"), settings, data_tree);
        var topNode = zTreeObj.getNodeByParam('nId', -1);
        zTreeObj.expandNode(topNode, true, false, false, false);
      });
    }
  }

  Drupal.behaviors.gofast_og_grid_ztree_af_orga = {
    attach: function (context, settings) {
      context = $(context);

      $('#ztree_og_grid_af_filter_orga:not(.ztree-processed)', context).addClass('ztree-processed').each(function() {
        var data_tree = {};
        if (Drupal.settings.gofast_og_tree_af_filter_orga) {
          data_tree = $.parseJSON(Drupal.settings.gofast_og_tree_af_filter_orga.data_tree);
        }

        var settings = {  data: {
                                simpleData: {
                                    enable: true,
                                    }
                          },
                          view: {
                                showIcon: false,
                                selectedMulti: false,
                                fontCss: {color:"#428bca"},
                                txtSelectedEnable: false,
                                dblClickExpand: false,
                          },
                         callback: {
                           onClick: gofast_og_ztree_af_click,
                           beforeExpand: gofast_og_ztree_expand,
                           beforeCollapse: gofast_og_ztree_collapse
                          }
                       };
        var zTreeObj = $.fn.zTree.init($("#ztree_og_grid_af_filter_orga"), settings, data_tree);
        var topNode = zTreeObj.getNodeByParam('nId', -1);
        zTreeObj.expandNode(topNode, true, false, false, false);
      });
    }
  }

    Drupal.behaviors.gofast_og_grid_ztree_af_extranet = {
    attach: function (context, settings) {
      context = $(context);

      $('#ztree_og_grid_af_filter_extranet:not(.ztree-processed)', context).addClass('ztree-processed').each(function() {
        var data_tree = {};
        if (Drupal.settings.gofast_og_tree_af_filter_extranet) {
          data_tree = $.parseJSON(Drupal.settings.gofast_og_tree_af_filter_extranet.data_tree);
        }

        var settings = {  data: {
                                simpleData: {
                                    enable: true,
                                    }
                          },
                          view: {
                                showIcon: false,
                                selectedMulti: false,
                                fontCss: {color:"#428bca"},
                                txtSelectedEnable: false,
                                dblClickExpand: false,
                          },
                         callback: {
                           onClick: gofast_og_ztree_af_click,
                           beforeExpand: gofast_og_ztree_expand,
                           beforeCollapse: gofast_og_ztree_collapse
                          }
                       };
        var zTreeObj = $.fn.zTree.init($("#ztree_og_grid_af_filter_extranet"), settings, data_tree);
        var topNode = zTreeObj.getNodeByParam('nId', -1);
        zTreeObj.expandNode(topNode, true, false, false, false);
      });
    }
  }

    Drupal.behaviors.gofast_og_grid_ztree_af_public = {
    attach: function (context, settings) {
      context = $(context);

      $('#ztree_og_grid_af_filter_public:not(.ztree-processed)', context).addClass('ztree-processed').each(function() {
        var data_tree = {};
        if (Drupal.settings.gofast_og_tree_af_filter_public) {
          data_tree = $.parseJSON(Drupal.settings.gofast_og_tree_af_filter_public.data_tree);
        }

        var settings = {  data: {
                                simpleData: {
                                    enable: true,
                                    }
                          },
                          view: {
                                showIcon: false,
                                selectedMulti: false,
                                fontCss: {color:"#428bca"},
                                txtSelectedEnable: false,
                                dblClickExpand: false,
                          },
                         callback: {
                           onClick: gofast_og_ztree_af_click,
                           beforeExpand: gofast_og_ztree_expand,
                           beforeCollapse: gofast_og_ztree_collapse
                          }
                       };
        var zTreeObj = $.fn.zTree.init($("#ztree_og_grid_af_filter_public"), settings, data_tree);
        var topNode = zTreeObj.getNodeByParam('nId', -1);
        zTreeObj.expandNode(topNode, true, false, false, false);
      });
    }
  }

   function gofast_og_ztree_af_click(event, treeId, treeNode, clickFlag){
    var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
    var gid = treeNode.nId;
    //simulate click to the non indented element into the space filter
    $("#"+gid).click();

  }

  function gofast_og_ztree_click(event, treeId, treeNode, clickFlag){
    var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
    var gid = treeNode.nId;
    $("html, body").animate({ scrollTop: $('.container_'+gid).offset().top-60}, 500, function(){
      $('.container_'+gid).children('.cadre_og_grid').animate({ backgroundColor: "#CCC"}, 50, function(){
        $('.container_'+gid).children('.cadre_og_grid').animate({ backgroundColor: "#FFF"}, 500, function(){
          $('.container_'+gid).children('.cadre_og_grid').removeProperty('background-color');
        });
      });
    });

    //zTreeObj.expandNode(treeNode, false, false, false, true);
    //zTreeObj.expandNode(treeNode, true, false, false, true);
  }

  function gofast_og_ztree_expand(treeId, treeNode){
    fromTree = true;
    var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
    var gid = treeNode.nId;
    $('#caller_'+gid).trigger('click');
    fromTree = false;
  }

  function gofast_og_ztree_collapse(treeId, treeNode){
    fromTree = true;
    var zTreeObj = $.fn.zTree.getZTreeObj(treeId);
    var gid = treeNode.nId;
    $('#caller_'+gid).trigger('click');
    fromTree = false;
  }

    Drupal.behaviors.gofast_members_space_async = {
        attach: function (context, settings) {
            if($('#tab_ogmembers_disabled').length == 0){
                if($('#tab_ogmembers:not(.members_processed)').parent().hasClass('active')){
                    $("#tab_ogmembers:not(.members_processed)").addClass("members_processed");
                    var nid = $(".gofast-og-page").attr("id").replace("node-", "");
                     $("#ogmembers").load( "/gofast_og/space_members_async/" + nid, function (response, status, xhr){
                         if(status == "success"){
                             Drupal.attachBehaviors();
                         }
                     });
                }
                $("#tab_ogmembers:not(.members_processed)").addClass("members_processed").click(function(){
                    var nid = $(".gofast-og-page").attr("id").replace("node-", "");
                     $("#ogmembers").load( "/gofast_og/space_members_async/" + nid, function (response, status, xhr){
                         if(status == "success"){
                             Drupal.attachBehaviors();
                         }
                     });
                });
            }else{
                $('#tab_ogmembers_disabled').css('pointer-events','none');
                $("#tab_ogmembers:not(.members_processed)").addClass("members_processed").click(function(e){
                    e.preventDefault();
                    return false;
                });
            }
        }
    };

    Drupal.behaviors.gofast_activity_space_async = {
        attach: function (context, settings) {
          if($('#tab_ogactivity:not(.activity_processed)').parent().hasClass('active')){
            $("#tab_ogactivity:not(.activity_processed)").addClass("activity_processed");
            var nid = $(".gofast-og-page").attr("id").replace("node-", "");
              $("#ogactivity").load( "/gofast_og/space_activity_async/" + nid, function (response, status, xhr){
                  if(status == "success"){
                      Drupal.attachBehaviors();
                  }
              });
          }
          $("#tab_ogactivity:not(.activity_processed)").addClass("activity_processed").click(function(){
              var nid = $(".gofast-og-page").attr("id").replace("node-", "");
                $("#ogactivity").load( "/gofast_og/space_activity_async/" + nid, function (response, status, xhr){
                    if(status == "success"){
                        Drupal.attachBehaviors();
                    }
                });
          });
        }
    };

        Drupal.behaviors.gofast_home_page_async = {
        attach: function (context, settings) {
              setTimeout(function(){
                if($('#ogtab_home:not(.activity_processed)').hasClass('active')){
                    $("#ogtab_home:not(.activity_processed)").addClass("activity_processed");
                    var nid = $(".gofast-og-page").attr("id").replace("node-", "");
                     $("#oghome").load( "/gofast_og/home_async/" + nid, function (response, status, xhr){
                         if(status == "success"){
                            Drupal.attachBehaviors();
                         }
                     });
                }
            }, 2000 );
            $("#ogtab_home:not(.activity_processed)").click(function(){
                        if($("#ogtab_home").hasClass("activity_processed")){
                          return;
                        }
                        $("#ogtab_home").addClass("activity_processed")
                        var nid = $(".gofast-og-page").attr("id").replace("node-", "");
                        if($("#oghome").html().trim() == '<div class="loader-blog"></div>'){
                            $("#oghome").load( "/gofast_og/home_async/" + nid, function (response, status, xhr){
                                if(status == "success"){
                                    Drupal.attachBehaviors();
                                }
                            });
                        }
            });
        }
    };

  Gofast.og_preadd_validation_process = function () {
    var panel = $(".preadd-validation-panel");

    //For each panel, process the request and check the result
    panel.each(function(i, obj){
        var it = $(this);    
            //Retrieve nid
            var nid = it.find('#nid').text();
            var type = it.find('#type').text();
            if (nid > 0) { } else {
              it.find('.panel-body').find(".preadd-validation-info").html("<i class='fa fa-times' style='color:red' aria-hidden='true'></i> " + Drupal.t("This modification cannot be done currently. Please try again later.", {}, { context: 'gofast:taxonomy' }));
              return true;
            }
            //Retrieve locations
            var usersPreAdd = JSON.parse($(it).find('#users_preadd').text());
            it.find('.panel-body').find(".preadd-validation-info").html("<i class='fa fa-arrow-right' style='color:#3498db' aria-hidden='true'></i> " + Drupal.t("Processing...", {}, { context: 'gofast:taxonomy' }));

            var message = it.find('#message').text();
            var rid = it.find('#role_id').text();
            var barWidth = usersPreAdd.length;
            var count = 0;
            var actionPost;
            var timeoutPreadd;

            usersPreAdd.forEach(function (userPreaAdd) {
              count++
              if (count == usersPreAdd.length) {
                actionPost = "join_preadd_send";
                timeoutPreadd = 3000;
              } else {
                actionPost = "join_preadd"
                timeoutPreadd = 0;
              }

                $.ajax({
                  type: "POST",
                  async: false,
                  url: location.origin + "/og/preadd/process",
                  data: {nid: nid, action: actionPost, user_to_add: userPreaAdd.id, message: message, role_id : rid, type: type, entity_type: userPreaAdd.type},
                  timeout: timeoutPreadd,
                  success: function (data) {
                    var returnData = jQuery.parseJSON(data);
                    if (returnData.success == false) {
                      it.find(`span.user-preadd-span[data-type=${returnData.entity_type}]#${returnData.entity_id}`).append(" - " + returnData.message + " <i class='fa fa-info' style='color:red' aria-hidden='true'></i>");
                    } else {
                      it.find(`span.user-preadd-span[data-type=${returnData.entity_type}]#${returnData.entity_id}`).append("<i class='fa fa-check' style='color:green' aria-hidden='true'></i>");
                    }

                    var barProgressValue = 100 / barWidth;
                    const progressValue = Math.floor(barProgressValue) + "%";
                    $('#modal-content .progress-bar').width(progressValue);
                    $('#modal-content .progress-bar').html(progressValue);
                    if (Math.floor(barProgressValue) === 100) {
                      $('.progress-bar').removeClass('progress-bar-striped');
                      $('.progress-bar').addClass('progress-bar-success');
                      $('.progress-bar').html(Drupal.t('Completed', {}, { 'context': "gofast:gofast_taxonomy" }));
                      $(panel).find('.panel-body').find(".preadd-validation-info").html("<i class='fa fa-check' style='color:green' aria-hidden='true'></i> " + Drupal.t("Processed !", {}, { context: 'gofast:taxonomy' }));
                    }
                    barWidth--;
                  }
                });
            });
      });
  };
  
  // Define a JavaScript function for removing a space identified by 'gid' from the list.
  Gofast.og.remove_space_from_contact_admin_modal_form = function(button, gid) {

    // Retrieve the current JSON-formatted data from an input field with the name attribute "spaces."
    var currentSpaces = JSON.parse($('input[name="spaces"]').val());

    // Initialize a new array to store the updated list of spaces.
    let newCurrentSpaces = [];

    if (currentSpaces.length > 1) {
      // Iterate through each element ('space') in the current spaces array.
      currentSpaces.forEach(function(space) {
        // If the 'space' does not equal 'gid', add it to the 'newCurrentSpaces' array.
        if (space != gid) {
          newCurrentSpaces.push(space);
        }
      });

      // Find the closest table row containing the clicked button and remove it from the UI.
      var row = button.closest("tr");
      row.remove();

      // Update the value attribute of the input field with the name "spaces" to contain
      // the JSON stringified version of the 'newCurrentSpaces' array.
      $('input[name="spaces"]').attr('value', JSON.stringify(newCurrentSpaces));

    }else{
      Gofast.toast(Drupal.t("You can't delete the last space", {}, {context : 'gofast:og::contact_admin'}), 'error');
    }

  }

  Gofast.og.nodeIsSpace = function(node, includePrivateSpace = true){
    const spaceTypes = ["group", "organisation", "extranet", "public"];
    if(includePrivateSpace){
      spaceTypes.push("private_space");
    }
    return spaceTypes.includes(node.type);
  }

})(jQuery, Gofast, Drupal);
