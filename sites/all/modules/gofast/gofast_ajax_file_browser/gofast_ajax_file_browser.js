(function ($, Gofast, Drupal) {

  /** Name of the folder containing wiki pages */
  const WIKI_FOLDER_NAME = 'Wikis';

  /** Name of the folder containing webform results */
  const WEBFORM_FOLDER_NAME = 'WEBFORM';

  /** Name of the folder under each space containing document templates */
  const TEMPLATES_FOLDER_NAME = 'TEMPLATES';

  /** Name of the folder where broadcasted contents land */
  const BROADCAST_INBOX_FOLDER_NAME = "BROADCAST";

  /** Names of the technical files Drupal never replicates, kept in sync with alfresco_script.php */
  const TECHNICAL_FILE_PATTERNS = [/^\./, /~\$/, /\.~lock/, /\.tmp/, /Thumbs\.db/];

  /*
   * Functions used to implement ITHit Ajax Library
   */
  const GFITHit = {
    /*
     * To truely stop propagation
     */
    prop: false,
    /*
     * Tells if we are ready to process data
     */
    ready: false,
    /*
     * Tells if all Gofast.ITHit methods are ready
     */
    fullReady: false,
    /*
     * Contains the File Browser tree object
     */
    tree: false,
    /*
     * Contains the current path
     */
    currentPath: "/alfresco/webdav/Sites",
    /*
     * Number of downloads in progress (used tu set 2s interval between downloads start)
     */
    downloadTimeout: 1,
    /*
     * Load the bredcrumb after 1 second to avoid multiple calls
     */
    refreshBreadcrumbTimeout: 1,
    /*
     * Load the bredcrumb after 1 second to avoid multiple calls
     */
    locationChanged: false,
    /*
     * Contains the todo queue (move and delete actions)
     */
    queue: [],
    /*
     * Tells if the queue refreshing is active
     */
    activeQueue: false,
    /*
     * Tells if the queue processing loop is running
     */
    processingQueue: false,
    /*
     * Tells if multi upload model is being shown _or processed_
     */
    hasMultiUploadModal: false,
    /*
     * Tells if we are already processing items or not to prevent multiple items processing
     */
    processingItems: false,
    /*
     * Regex for forbidden characters in item names
     */
    forbiddenCharactersPattern: /[\\/:*?"<>|]/,
    /*
     * Folders and spaces are path segments: a literal % breaks the URI decoding of the browser
     */
    forbiddenPathCharactersPattern: /[\\/:*?"<>|%]/,
    /*
     * Names can be encoded in several ways (accents): compare their NFC forms, optionally ignoring
     * case since Alfresco treats names as case-insensitive
     */
    isSameItemName: function (firstName, secondName, ignoreCase = false) {
      const normalize = (itemName) => ignoreCase ? itemName.normalize("NFC").toLowerCase() : itemName.normalize("NFC");
      return normalize(firstName) === normalize(secondName);
    },
    /*
     * Last set of files fetched to the filebrowser with extra informations, used to track context navigation in essential version
     */
    lastProcessedResources: [],
    /*
     * Set the drop path, used to queue events in another folder than the initial
     */
    dropPath: false,
    /*
     * Store copied items from CTRL+C or CTRL+X
     */
    itemsCopied: [],
    /*
     * CTRL+C or CTRL+X
     */
    copyType: 'C',
    /*
     * Contains a timeout for the search processing (prevent overload)
     */
    searchProcess: null,
    /*
     * Define display (default : details)
     */
    display: 'details',
    /*
     * Define by what are sorted the items (default : name)
     */
    sortType: 'DisplayName.toLowerCase()',
    /*
     * Defines the sort order (default asc);
     */
    sortOrder: 'asc',
    /*
     * Keep track of intervals
     */
    intervals: {},
    /*
     * Keep track of promises
     */
    promises: {
      multiUploadModal: {},
    },
    /*
     * A variable to remember the upload operation to apply when a user interaction is needed
     */
    rememberUploadOp: null,

    /**
     * cache which paths are being duplicated currently.
     */
    pathsBeingDuplicated: new Set(),

    initTreeTooltip: function(treeNodeToTooltip){
      treeNodeToTooltip.forEach((node,i) => {

        //check if the element is a space
        if(node.name[0] !== "_" || node.level == '1'){
          return;
        }

        const tId = node.tId;
        element = $('#'+tId).find('a').first();

        element.attr('data-toggle','tooltip');
        element.attr('title','');

        element.on('inserted.bs.tooltip',(e)=>{
          if($(e.target).attr("data-loaded")){
            return;
          }

          $(".ztree-tooltip .spinner").css("transform", "translateX(-.75rem)");
          $(".ztree-tooltip").css({"max-width":"max-content"});

          //put the tooltip higher to compensate the body
          if($('.ztree-tooltip').attr('x-placement') == 'top'){
            $('.ztree-tooltip').css('top', parseInt($('.ztree-tooltip').css('top')) + -0.6 + 'rem');
          }
        });
        element.on("show.bs.tooltip", function(e) {
            $(e.target).attr("data-hidden",false);
        });
        element.on('shown.bs.tooltip',(e)=>{
          if ($(e.target).hasClass("processed")) {
            return;
          }
          $(e.target).addClass("processed");
          //get nid of the hovered space with the path
          $.get(location.origin + '/ajax/getnidfromhref', { href: treeNodeToTooltip[i].path, force: true }, function (nid) {
            if(nid==''){
              return;
            }
            //get description with the nid
            $.get(location.origin+'/get/'+nid+'/description/async',function(description){
              //add body part to the tooltip
              let descriptionTag = description == "" ? "" : ("<div class='tooltip-body'>" + description + "</div>");
              $(e.target).attr('data-original-title', treeNodeToTooltip[i].name + descriptionTag);

              $(e.target).attr("data-loaded", true);
              if($(e.target).attr("data-hidden") != 'true'){
              $(e.target).tooltip('show');
              }
            });
          });
        });
        element.on("hide.bs.tooltip", (e) => {
            $(e.target).attr("data-hidden",true);
        });
      });

      $("[data-toggle='tooltip']").tooltip({
        template: "<div class=\"tooltip ztree-tooltip text-center\" role=\"tooltip\"><div class=\"arrow\"></div><div class=\"tooltip-inner\"></div></div>",
        placement: "top",
        html: true,
        delay: {"show": 1000},
        trigger: "hover",
        title: '<div class="spinner spinner-track spinner-primary d-inline-flex position-absolute"></div>',
      });
    },
    /*
     * Refresh the breadcrumb
     */
    refreshBreadcrumb: function (usedPath, refreshPage) {
      var baseUrl = window.location.protocol + "//" + window.location.host;
      usedPath = usedPath.replace(/\&/g, "%26").replace(/\+/g, "%2B");
      var folderPath = "";
      //formatting path to match the next call
      var index = usedPath.indexOf('/', usedPath.lastIndexOf('/_') + 1);
      //case where the user clicked on a folder
      if (index !== -1) {
        folderPath = usedPath.substring(index, usedPath.length);
        usedPath = usedPath.substring(0, index);
      }
      //getting node
      $.post(baseUrl + '/ajax/getnidfromhref', { href: usedPath }, function (data) {
          //to avoid calling if we already are on the node
          if (Gofast.get("node")["id"] !== data || Gofast.ITHit.locationChanged) {
            if (Gofast.get("node")["id"] === data) Gofast.ITHit.locationChanged = false;
            else Gofast.ITHit.locationChanged = true;
            if (Gofast.get("node")["id"] !== data && refreshPage && typeof Gofast.processAjax !== "undefined") {
              // reloads
              Gofast.processAjax("/node/" + data + "?path=" + usedPath + folderPath + location.hash);
            } else {
              if (Gofast.get("node")["id"] !== data) {
                // use History API not to actually trigger a reload
                // window.location.href = window.location.origin + "/node/" + data + "?&path=" + usedPath + folderPath + location.hash;
              }
              // If we navigate to a root folder (ex: FOLDER TEMPLATES)
              if(usedPath == "" && folderPath != ""){
                Gofast.ITHit.disableFileBrowserTabs(null, true);
              } else {
                //getting breadcrumb
                $.post(baseUrl + '/gofast/node-breadcrumb/' + data, function(breadcrumb){
                  //update the breadcrumb
                  Gofast.breadcrumb_gid = data;
                  $(".breadcrumb-gofast").replaceWith(breadcrumb);
                    Drupal.attachBehaviors();
                    Gofast.ITHit.disableFileBrowserTabs(data);
                  $.post(baseUrl + '/gofast/node-actions/' + data, {fromBrowser: true}, function (actions) {
                    $("#breadcrumb-alt-actions").replaceWith(actions);
                    Drupal.attachBehaviors();
                  });
              });
            }
          }
        }
      });
    },
    refreshSpaceSideContent: function(path) {
      // If there is no parent space, show message
      if(Gofast.ITHit.getSpacePath(path) == undefined){
        $("#ogContainer > .sideContent #space__infotab").html(`<div class="alert alert-custom alert-light-warning fade show mb-5" role="alert">
          <div class="alert-text">${Drupal.t('There is no metadata available on this type of location.', {}, {context: "gofast:gofast_ajax_file_browser"})}</div>
        </div>`);
        return;
      }
      if(["group", "organisation", "extranet", "public", "private_space"].includes(Gofast.get("node").type)){
        $.post('/ajax/getnidfromhref', { href: Gofast.ITHit.getSpacePath(path) }, function (nid) {
          $("#space__infotab").attr("data-nid", nid);
          $("#ogContainer > .sideContent #space__infotab").html('<div class="spinner spinner-center spinner-primary spinner-lg position-absolute h-100 w-100">');
          var baseUrl = window.location.protocol + "//" + window.location.host;
          Gofast.processAjax(baseUrl + "/gofast/node-info/" + nid, true);
        })
      }
    },
    /*
     * Init component
     * Will wait and call itself while the ITHit object isn't instanciated
     */
    init: function () {
      if (typeof Drupal.settings.pass_reset != "undefined") {
        return;
      }

      //Check if ITHit object is here
      if (typeof ITHit === "undefined") { //Object is not here
        //Try later
        setTimeout(Gofast.ITHit.init, 1000);
      } else { //Object is here
        //Check if the user is logged in
        if (Gofast.get('user').uid === 0) {
          //Not logged in
          return;
        }

        //Create a new ITHit session
        Gofast.ITHit.Client = ITHit.WebDAV.Client;
        // Without it WebDAV Drive runs in free mode, limited to 10 users
        if (Drupal.settings.ithitLicenseId) {
          ITHit.WebDAV.Client.LicenseId = Drupal.settings.ithitLicenseId;
        }
        Gofast.ITHit.Session = new Gofast.ITHit.Client.WebDavSession();

        //Authentify to Alfresco
        Gofast.ITHit._authentify();

        //Instenciate uploaders (Warning, mobile uploader is also instanciated here)
        Gofast.ITHit.Uploader = new ITHit.WebDAV.Client.Upload.Uploader();
        Gofast.ITHit.Uploader.UploadFolders = true;
        Gofast.ITHit.Uploader.FilesMultiselect = true;

        Gofast.ITHit.UploaderMobile = new ITHit.WebDAV.Client.Upload.Uploader();
        Gofast.ITHit.UploaderMobile.UploadFolders = true;
        Gofast.ITHit.UploaderMobile.FilesMultiselect = true;

        //Init the queue processing
        if (!Gofast.ITHit.processingQueue) {
          Gofast.ITHit.processQueue();
        }

        //Init the files loader
        if ( Gofast.isMobile()) {
          NProgress.configure({ parent: '#file_browser_mobile_header' });
        } else {
          NProgress.configure({ parent: '#file_browser_full_toolbar' });
        }
        NProgress.configure({ showSpinner: false });
      }
    },
    /** Allows to add "fake" nodes to browser with disabling and tooltip */
    addItem: async function(nodePath, newNodeName, resourceType = "Folder", disabled = false, tooltip = false) {
      nodePath = nodePath.includes("/alfresco/webdav") ? nodePath : "/alfresco/webdav" + nodePath;
      var item = {
        DisplayName: newNodeName,
        Href: nodePath,
        ResourceType: resourceType,
        LastModified: new Date()
      };
      // use arrow function to keep original context
      var waitForFileBrowserInterval = setInterval(async () => {
        if (!this.fullReady || !$(".file_browser_full_files_element ").length) {
          return;
        }
        clearInterval(waitForFileBrowserInterval);
        //Format the new item
        var itemHTML = Gofast.ITHit._formatItem(item);
        //Add the item to the list
        var processedItem = $('#file_browser_full_files_table').find('tbody:last-child').append(itemHTML);
        processedItem = processedItem.find('tr').last();
        processedItem[0].scrollIntoView({behavior: "smooth", block: "end"});
        Gofast.ITHit.reset_full_browser_size();
        if (disabled) {
          $(".file_browser_full_files_element ").last().find("*").prop("disabled", true);
          $(".file_browser_full_files_element ").last().find("*").addClass("text-muted");
          $(".file_browser_full_files_element ").last().find("*").css("cursor", "not-allowed");

        }
        if (tooltip) {
          $(".file_browser_full_files_element ").last().tooltip({title: tooltip, placement: "top", trigger: "hover"});
        }
      });
      // add to tree and return new treeNode
      return await Gofast.ITHit.tree.addFakeNode(nodePath, newNodeName, disabled, tooltip);
    },
    /*
     * Authentify to Alfresco
     * Called in init process
     */
    _authentify: function () {
      if (!Gofast.ITHit.ready) {

        Gofast.sendXHR('OPTIONS', '/alfresco/webdav/Sites?ticket=' + Drupal.settings.ticket, '', false, null, function (xhr) {
          Gofast.sendXHR('GET', '/alfresco/webdav/Sites?ticket=' + Drupal.settings.ticket, '', false, null, function (xhr) {
            //Ready to retrieve data
            Gofast.ITHit.ready = true;
          });
        });

        setInterval(function () {
          Gofast.sendXHR('OPTIONS', '/alfresco/webdav/Sites?ticket=' + Drupal.settings.ticket, '', true, null, function (xhr) {
            Gofast.sendXHR('GET', '/alfresco/webdav/Sites?ticket=' + Drupal.settings.ticket, '', true, null, function (xhr) {
              //Ready to retrieve data
              Gofast.ITHit.ready = true;
            });
          });
        }, 900000);
      }
    },
    /*
     * Navigate to a path
     * If no params are provided or if the path is not accessible, will back to
     * Sites folder
     * If onlyTree is set to true, we just update the zTree
     * If noRecursion is set to true, we only update the zTree for the wanted location
     */
    navigate: async function (path, onlyTree, noRecursion, noPush, selectItem, deleteTree, eventType="load") {
      if (!Gofast.ITHit.Client) {
        Gofast.ITHit.init();
      }
      clearInterval(Gofast.ITHit.refreshBreadcrumbTimeout);

      // Ensure progress bar parent element exists to start its progression.
      if (!Gofast.ITHit.progress.start()) {
        // queue navigation after NProgress is fully loaded (mostly waiting on parent element existing)
        const loadNProgressParentInterval = setInterval(() => {
          if (Gofast.ITHit.progress._isNProgressSafeToUse()) {
            clearInterval(loadNProgressParentInterval);
            Gofast.ITHit.navigate(path, onlyTree, noRecursion, noPush, selectItem, deleteTree, eventType);
            return
          }
        })
      }
      path = decodeURIComponent(path).replace(/%2F/g, '/').replace(/\+/g, '%2B').replace(/\&/g, "%26");

      //Remove trailing slash at the end
      if(path[path.length-1] == "/"){
        path = path.slice(0,-1)
      }

      if (path.indexOf('/alfresco/webdav') !== 0) {
        path = "/alfresco/webdav" + path;
      }
      // If the selected location is the same as the one we're navigating to, simply expand the node to expand all the parents as well.
      // Ensure tree is loaded before trying to expand it (error if reloading too quickly after page load).
      if (Gofast._settings.isEssential && Gofast.ITHit.tree) {
        if(Gofast.ITHit.currentPath == path){
          let selectedTreeNode = Gofast.ITHit.tree.getNodeByParam("path", path)
          Gofast.ITHit.tree.expandNode(selectedTreeNode, true)
        }
      }
      var fullPath = path;

      //As we navigate, set tabs as unprocessed to reload them later
      $('#gofastBrowserContentPanel > .tab-pane').each((e,i)=>{
        $(i).removeClass('processed')
      })
      if(eventType != "expand") {
        await $.get(location.origin + "/ajax/getnidfromhref?href=" + Gofast.ITHit.getSpacePath(path)).done((nid)=>{
          //Check if don't have nid (ex: root folder)
          if(nid == ""){
            return;
          }
          $(".GofastNodeOg").attr("id", "node-" + nid).attr("data-nid", nid);
        })
      }

      if(Gofast._settings.isEssential){
        if(eventType != "expand"){
        if ($(".add-alfresco_item").length) {
          let addAlfrescoItemHref = $(".add-alfresco_item").attr("href");
          if (!addAlfrescoItemHref.includes(window.location.origin)) {
            addAlfrescoItemHref = window.location.origin + addAlfrescoItemHref;
          }
          let urlObject = new URL(addAlfrescoItemHref);
          urlObject.searchParams.set("path", path.replace("/alfresco/webdav", ""));
          $(".add-alfresco_item").unbind()
          delete(Drupal.ajax[$(".add-alfresco_item").attr("href")])
          $(".add-alfresco_item").attr("href", urlObject.toString());
          $(".add-alfresco_item").removeClass("ctools-use-modal-processed");
          Drupal.attachBehaviors()
        }
          Gofast.Essential.setSpaceObject(path, true);
          if($(".GofastNodeOg").attr("data-nid") != undefined) {
            let nid = +$(".GofastNodeOg").attr("data-nid");
            if(nid != "" && eventType != "backgroundNavigation"){
                Gofast.Essential.setNodeObject(nid, true);
            }
            $("#essential-actions > div > div.dropdown.ml-3.dropleft > div > ul > li > a").each(function() {
              var hrefValue = $(this).attr("href");
              hrefValue = hrefValue.replace(/\d+/, nid);
              $(this).attr("href", hrefValue);
            });

            if(Gofast._settings.gofast_ajax_file_browser.private_space_nid != nid){
              $.post(location.origin + '/essential/update_contextual_space_actions/' + nid, {isAjax : true},  function (actions) {
                $("#essential-actions").html(actions);
              });
            }else{
              if($("#essential-actions").length){
                $("#essential-actions a").addClass("disabled");
                $("#essential-actions .dropdown-menu").remove();
              }
            }
          }
        }
      }

      if (typeof ITHit === "undefined" || typeof Gofast.ITHit.Session === "undefined") {//Not ready to navigate
        //Try later
        setTimeout(Gofast.ITHit.navigate, 1000, path);
    } else { //Ready to navigate
        Gofast.ITHit.Session.OpenFolderAsync(path, null,
          function (asyncResult) {

            if (!asyncResult.IsSuccess) {
              Gofast.ITHit.progress.done();
              Gofast.toast(Drupal.t("Unable to access to", {}, { context: 'gofast:ajax_file_browser' }) + " " + path, "warning");

              //Remove slash at the end if needed
              if (path.substr(-1, 1) === "/") {
                path = path.substring(0, path.length - 1);
              }

              //Try to get the parent folder
              path = path.split('/');
              path.pop();

              //Prevent infinite loop and go
              if (path.length !== 2) {
                path = path.join('/') + "/";
                Gofast.ITHit.navigate(path);
              } else {
                $('#file_browser_full_container').replaceWith('<div style="text-align: center;font-size: 25px;"><i style="color: #dc3545;" class="fa fa-exclamation" aria-hidden="true"></i> ' + Drupal.t("Sorry, we are not able to load the file browser", {}, { context: 'gofast:ajax_file_browser' }) + "</div>");
              }
              return;
            }

            Gofast.ITHit.progress.set(0.4);

            var folder = asyncResult.Result;
            Gofast.ITHit._resetMirrorFolders();
            Gofast.ITHit._resetArchiveFolders();

            folder.GetChildrenAsync(false, null,
              function (asyncResult) {
                if (!asyncResult.IsSuccess) {
                  Gofast.ITHit.progress.done();
                  Gofast.toast(Drupal.t("Unable to get elements of", {}, { context: 'gofast:ajax_file_browser' }) + " " + path, "warning");

                  //Try to get the parent folder
                  path = path.split('/');
                  path.pop();
                  path.pop();

                  //Prevent infinite loop and go
                  if (path.length !== 0) {
                    path = path.join('/') + "/";
                    Gofast.ITHit.navigate(path);
                  }
                  return;
                }
                var error_new_document_browser = ['/alfresco/webdav/Sites', '/alfresco/webdav/Sites/_Public/', '/alfresco/webdav/Sites/_Extranet/', '/alfresco/webdav/Sites/_Groups/', '/alfresco/webdav/Sites/_Organisations/'];
                var error_new_document_ztree = ['/alfresco/webdav/Sites/_Public', '/alfresco/webdav/Sites/_Extranet', '/alfresco/webdav/Sites/_Groups', '/alfresco/webdav/Sites/_Organisations'];
                var folder_template_path = '/alfresco/webdav/Sites/FOLDERS TEMPLATES';
                // Disable 'New' toolbar button in root spaces
                if (jQuery.inArray(path, error_new_document_browser) !== -1 || jQuery.inArray(path, error_new_document_ztree) !== -1) {
                  if(eventType != "expand"){
                    $('#file_browser_tooolbar_new_item').prop('disabled', true);
                  }
                } else {
                  $('#file_browser_tooolbar_new_item').prop('disabled', false);
                }
                if (decodeURI(path).indexOf(folder_template_path) !== -1) {
                  $('.add-folder-template').addClass('gofast_display_none');
                  $('#file_browser_tooolbar_new_alfresco_item').addClass('gofast_display_none');
                } else {
                  $('.add-folder-template').removeClass('gofast_display_none');
                  $('#file_browser_tooolbar_new_alfresco_item').removeClass('gofast_display_none');
                }
                Gofast.ITHit.progress.set(0.6);

                var items = Gofast.ITHit.filterTechnicalFiles(asyncResult.Result);


                if (!onlyTree) {
                  Gofast.ITHit._processItems(items, fullPath);

                  fullPath = decodeURIComponent(fullPath);
                  fullPath = fullPath.replaceAll("&", "%26").replaceAll("+", "%2B")
                  //Remove slash at the end if needed
                  if (fullPath.substr(-1, 1) === "/") {
                    fullPath = fullPath.substring(0, fullPath.length - 1);
                  }

                  Gofast.ITHit.currentPath = fullPath;
                  Gofast.ITHit.Uploader.SetUploadUrl(location.origin + fullPath);

                  if (!noPush) {
                    var folderType;
                    if (folder.DisplayName.substr(0, 1) === "_") {
                      folderType = "space";
                    }else{
                      folderType = "folder";
                    }
                    Gofast.ITHit.updatePathParam(fullPath, eventType, folderType);
                  }

                  //Select the wanted item
                  if (typeof selectItem !== "undefined") {
                    Gofast.ITHit.selectItem(selectItem);
                  }

                  GFITHit._fileListSelectionUpdated();
                  Gofast.ITHit.refreshSpaceSideContent(path);

                  if ((!Gofast._settings.isEssential && $(".gofast-og-page").length)) {
                    //setting an interval to avoid multiple useless calls
                    Gofast.ITHit.refreshBreadcrumbTimeout = setTimeout(function () {
                      Gofast.ITHit.refreshBreadcrumb(path.substring(16, path.length), false);
                    }, 1000);
                  }
                }

                Gofast.ITHit._processTree(path, noRecursion, deleteTree, eventType);
                if (onlyTree) {
                  Gofast.ITHit.progress.done();
                }
                Gofast.ITHit.searchProcess = setTimeout(function () {
                  $('#name_header').trigger('resize');
                  $('#size_header').trigger('resize');
                  $('#type_header').trigger('resize');
                }, 250);

              }
            );
            // GOFAST-5946 : add "magic" checkbox to select/unselect all documents in current folder
            const gofastBrowserMagicCheckbox = document.querySelector("#gofastBrowserMagicCheckbox");
            if (gofastBrowserMagicCheckbox) {
              const toggleAllGofastCheckboxes = () => {
                if(gofastBrowserMagicCheckbox.checked) {
                  Gofast.ITHit.selectAllShown();
                } else {
                  Gofast.ITHit.deselectAllShown();
                }
              };
              // init magic checkbox initial state
              gofastBrowserMagicCheckbox.checked = false;
              gofastBrowserMagicCheckbox.addEventListener("click", toggleAllGofastCheckboxes);
            }
          }
        );
      }
      $(document).trigger("ajax-browser-navigate");
      setTimeout(()=>{
        const treeNodeToPopover = Gofast.ITHit.tree.getNodesByFilter(()=>true);
        Gofast.ITHit.initTreeTooltip(treeNodeToPopover);
        Gofast.ITHit.handleDropZonePermission(path);
      }, 2000);
      // uncheck magic checkbox
      if ($("#gofastBrowserMagicCheckbox")) {
        $("#gofastBrowserMagicCheckbox").prop("checked", false);
      }
    },
    /*
     * Select an item by path and scroll to it
     */
    selectItem: function (path, keepothers) {
      var item = $('#file_browser_full_files_table').find('.item-path:contains("' + path + '")').parent();
      if (keepothers) {
        var event = $.Event("mousedown");
        event.ctrlKey = true;
        item.trigger(event);
      } else {
        item.trigger('mousedown');
        $("#file_browser_full_files_table").mCustomScrollbar("scrollTo", item);
      }
    },
    /*
     * Push a new state in history containing the path param
     * Occures at navigation
     */
    updatePathParam: function (path, eventType, folderType = "folder") {
      var pushHash = "";

      if(Gofast._settings.isEssential){
        // If it's a background navigation, don't change the url
        if(eventType == "backgroundNavigation"){
          return;
        }
        pushHash = location.hash
        //Check if the hash is for filebrowser tabs or if it is empty to set a default value
        if((pushHash != "#ogdocuments"
        && pushHash != "#oghome"
        && pushHash != "#ogcalendar"
        && pushHash != "#ogkanban"
        && pushHash != "#ogconversation"
        && pushHash != "#gofastSpaceMembers") || pushHash == ""){
          pushHash = "#ogdocuments"
        }
      } else {
        //Prepare hash to push
        if (location.hash !== "") {
          pushHash = location.hash;
        }
      }

      var replace = false;
      // Make sure that path variable is correct
      path = path.replace("/alfresco/webdav", "");
      path = path.replace(/&/g, '%26');
      //
      let searchParams = new URLSearchParams(location.search);
      // if(!searchParams.has("path")){
      //   replace = true;
      // }
      // Get the search url part with the path
      let searchQueryString = Gofast.ITHit.buildSearchQueryStringWithPath(path);

      //Prepare URL to push
      var pushUrl = location.origin + location.pathname + searchQueryString + pushHash;
      var currentPathWithParams = location.origin+location.pathname+location.search+location.hash;

      if (decodeURI(pushUrl) == decodeURI(currentPathWithParams)) {
        replace = true;
      }

      if(folderType == "space"){
        $.post('/ajax/getnidfromhref', { href: path.replace(/\&/g, "%26").replace(/\+/g, "%2B") }, function (nid) {
          pushUrl = location.origin + "/node/" + nid + searchQueryString + pushHash
          if (replace) {
            history.replaceState(null, "Gofast", pushUrl);
          } else {
            history.pushState(null, "Gofast", pushUrl);
          }
        })
      }else{
        nid = "";
        if(location.pathname.startsWith("/node/")){
          nid = location.pathname.split("/")[2]
        } else if ($("#gofastContainer .essentialFileBrowser").attr("id") ) { // User is navigating from url without "/node/xxx"
          // Take nid of the loaded space in the dom
          nid = $("#gofastContainer .essentialFileBrowser").attr("id")
          nid = nid.replace("node-", "")
        }
        if(location.pathname.substring(0, 21) == "/home_page_navigation"){ // Special navigation in mobile phone home page
          pushUrl = location.origin + "/home_page_navigation/" + searchQueryString + pushHash
        }else{
          pushUrl = location.origin + "/node/" + nid + searchQueryString + pushHash
        }
        if (replace) {
          history.replaceState(null, "Gofast", pushUrl);
        } else {
          history.pushState(null, "Gofast", pushUrl);
        }
      }
    },

    /**
     * Tests if the user is running on Mac OS using the user agent
     *
     * @returns {boolean} true if the device is running Mac OS (hopefully)
     */
    _isMacOS: function() {
      // note: the User Agent string may not be reliable
      return navigator.userAgent.includes("Mac OS X");
    },

    /*
     * Usually called when loading a space node (in the tpl)
     */
    attachBrowserEvents: function () {
      $('#file_browser_full_files_table')
        .on('keydown', function (event) {
          if (document.activeElement.id === "rename-form") return; // don't override when in form
          if (event.key !== 'a') return; // require A to be pressed
          // make the shortcut use CMD on mac os
          if(Gofast.ITHit._isMacOS()) {
            if (!event.metaKey) return; // CMD is not pressed
          } else {
            if (!event.ctrlKey) return; // CTRL is not pressed
          }

          if(event.shiftKey) {
            // note: Chrome and firefox already bind a shortcut to CTRL+SHIFT+A without the possibility of rebinding it
            // making it unusable on these browsers, however other browsers may let user use this shortcut
            Gofast.ITHit.deselectAllShown(); // CTRL+SHIFT+A pressed: deselect all
          } else {
            Gofast.ITHit.selectAllShown(); // CTRL+A pressed: select all
          }

          return false;
        })
        .on('keydown', function (event) {
          if(event.code !== 'Escape') return;

          if (document.activeElement.id === "rename-form") {
            return false;
          }

          // Escape pressed: deselect all
          Gofast.ITHit.deselectAll();

          return false;
        });

      // Listen for F2 key to trigger rename when only one item is selected.
      $("#file_browser_full_container").off('keyup.filebrowserRename').on('keyup.filebrowserRename', function (e) {
        // Is F2 pressed alone? If not return early.
        if (e.key !== 'F2' || e.ctrlKey || e.shiftKey || e.metaKey) {
          return;
        }
        if ($(e.target).is('input, textarea, select')) return; // already inputing something
        const $fileTable = $("#file_browser_full_files_table");
        if (!$fileTable.length || !$fileTable.is(':visible')) return;

        const selected = GFITHit.getFileBrowserSelectedItems();

        // Is exactly one item selected?
        if (selected.length !== 1) {
          // Have we not selected any item?
          if (selected.length === 0) {
            Gofast.toast(
              Drupal.t(
                'Select an item to rename.',
                {},
                { context: 'gofast:ajax_file_browser' },
              ),
              'warning',
            );
          } else {
            // More than one item selected.
            Gofast.toast(
              Drupal.t(
                'You cannot rename multiple items at once. Select only one.',
                {},
                { context: 'gofast:ajax_file_browser' },
              ),
              'warning',
            );
          }
          return;
        }

        const selectedItem = selected[0];
        if ($(selectedItem._rowElement).find('#rename-form').exists()) {
          // The renaming form already exists, ignore the input.
          return;
        }

        e.preventDefault();

        // Initialise rename input/form in explorer file list.
        Gofast.ITHit.rename(selectedItem.path);
      });

      $("#file_browser_full_container").off('keyup.filebrowserShortcuts').on('keyup.filebrowserShortcuts', function (e) {
        if (e.keyCode == 46) { //Suppr pressed
          if ($("#rename-form").length !== 0 || $("#new-folder-form").length !== 0) {
            return;
          }
          const $fileTable = $("#file_browser_full_files_table");
          if (!$fileTable.length || !$fileTable.is(':visible')) return;

          //Retrieve all selected items
          var data = [];
          var selected = $('.gfb-cbx:checked').parents('.file_browser_full_files_element').find('.item-path');
          var noDelete = false;
          $.each(selected, function (k, elem) {
            var path = elem.innerText;

            //Remove slash at the end if needed
            if (path.substr(-1, 1) === "/") {
              path = path.substring(0, path.length - 1);
            }

            //Check if this is a space
            var name = path.split('/');
            name = name.pop();

            if (name.substr(0, 1) !== '_') {
              if(decodeURI(name) === "FOLDERS TEMPLATES"){
                Gofast.toast(Drupal.t("'FOLDERS TEMPLATES' folder cannot be deleled.", {}, {context: 'gofast:ajax_file_browser'}), "warning");
                noDelete = true;
              }else if(decodeURI(name) === "TEMPLATES"){
                Gofast.toast(Drupal.t("'TEMPLATES' folder cannot be deleled.", {}, {context: 'gofast:ajax_file_browser'}), "warning");
                noDelete = true;
              }else if(decodeURI(name) === "Wikis"){
                Gofast.toast(Drupal.t("Wikis folders can't be deleted", {}, { context: 'gofast' }), "warning");
                noDelete = true;
              }else {
                data.push(elem.innerText);
              }
            } else {
              noDelete = true;
              Gofast.addLoading();
              $.get(location.origin + "/ajax/getnidfromhref?href=" + path)
                .done(function (result) {
                  $.ajax({
                    url: location.origin + "/modal/nojs/gofast_og/delete_space/" + result,
                  }).done(function (commands) {
                    var jsonCommands = JSON.parse(commands);

                    jsonCommands.forEach(function (k, v) {
                      if (k.command == "modal_display") {
                        Gofast.removeLoading();
                        Gofast.modal(k.output, k.title);
                      }
                    })
                  })
                    .fail(function () {
                      Gofast.removeLoading();
                      Gofast.toast(Drupal.t("You don't have permission to delete this space", {}, { context: 'gofast:ajax_file_browser' }), "warning");
                    })
                })
            }
          });
          data = JSON.stringify(data);

          if (!noDelete) {
            //process delete
            Gofast.ITHit.delete(data);
          }
        } if (e.keyCode == 67 && e.ctrlKey == true && document.activeElement.id !== "rename-form") { //CTRL+C pressed
          Gofast.ITHit.copySelected();
        } if (e.keyCode == 88 && e.ctrlKey == true & document.activeElement.id !== "rename-form") { //CTRL+X pressed
          Gofast.ITHit.cutSelected();
        } if (e.keyCode == 86 && e.ctrlKey == true && document.activeElement.id !== "rename-form") { //CTRL+V pressed
          Gofast.ITHit.paste();
        }
      });

      $("#file_browser_full_toolbar_search_input").on('keyup', function (e) {
        //We set timeout to prevent JS engine overload (and we clear the timeout each time a key is pressed)
        clearTimeout(Gofast.ITHit.searchProcess);
        Gofast.ITHit.searchProcess = setTimeout(function () {
          Gofast.ITHit.search($('#file_browser_full_toolbar_search_input').val());
        }, 300);
      });

      //Toolbar
      $('#file_browser_tooolbar_new_folder').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.createFolder(Gofast.ITHit.currentPath);
      });
      $('#file_browser_tooolbar_display_details').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.setDisplay('details');
      });
      $('#file_browser_tooolbar_display_icons').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.setDisplay('icons');
      });
      $('#file_browser_tooolbar_refresh').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.reload();
      });
      $('#file_browser_tooolbar_copy').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.copySelected();
      });
      $('#file_browser_tooolbar_cut').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.cutSelected();
      });
      $('#file_browser_tooolbar_paste').on('click', function (e) {
        e.preventDefault();
        Gofast.ITHit.paste();
      });
      $('#file_browser_tooolbar_cart_button').on('click', function (e) {
        Gofast.ITHit.bulkSelected(e);
      });
      $('#file_browser_tooolbar_contextual_actions').on('click', function (e) {
        $('#file_browser_full_files_table').find('.selected').trigger('contextmenu');
      });

      //Sorting
      $('.file_table_header').on('click', function (e) {
        var target = $(e.target);
        if (target.hasClass('ui-resizable-resizing')) {
          return;
        }
        if (target.find('.order_indicator').not('.gofast_display_none').length !== 0) {
          //Just need to switch the order
          if (target.find('.order_indicator').not('.gofast_display_none').hasClass('fa-caret-up')) {
            //Switch to asc order
            target.find('.fa-caret-up').addClass('gofast_display_none');
            target.find('.fa-caret-down').removeClass('gofast_display_none');

            Gofast.ITHit.sortOrder = 'desc';
          } else if (target.find('.order_indicator').not('.gofast_display_none').hasClass('fa-caret-down')) {
            //Switch to desc order
            target.find('.fa-caret-down').addClass('gofast_display_none');
            target.find('.fa-caret-up').removeClass('gofast_display_none');

            Gofast.ITHit.sortOrder = 'asc';
          }
        } else { //Set order to asc and change ordering type
          target.parent().find('.order_indicator').addClass('gofast_display_none');
          target.find('.fa-caret-up').removeClass('gofast_display_none');

          Gofast.ITHit.sortOrder = 'asc';

          if (target.attr('id') === 'name_header') {
            Gofast.ITHit.sortType = 'DisplayName.toLowerCase()';
          } else if (target.attr('id') === 'size_header') {
            Gofast.ITHit.sortType = 'ContentLength';
          } else if (target.attr('id') === 'type_header') {
            Gofast.ITHit.sortType = 'type';
          } else if (target.attr('id') === 'modified_header') {
            Gofast.ITHit.sortType = 'LastModified.getTime()';
          }
        }

        Gofast.ITHit.reload();
      });

      //Makes the columns resizable
      $('#file_browser_full_files_table').find('th:not(:first):not(:last)').resizable({
        handles: 'e',
        minWidth: 10,
      }).css('border-right', '1px solid black');

      //Bind the resize events
      $('#name_header').resize(function (e) {
        e.stopPropagation();
        if (!(new URLSearchParams(window.location.search)).has("path")) {
          return;
        }
        var icon_width = $('#file_browser_full_files_header').find('th:first').innerWidth();
        var header_width = $("#file_browser_full_files_header").innerWidth();
        var name_width = $('#name_header').innerWidth();
        var size_width = $('#size_header').innerWidth();
        var type_width = $('#type_header').innerWidth();
        var modified_width = $('#modified_header').innerWidth();
        var info_width = $('#info_header').innerWidth();

        //Edit elements width
        $('#file_browser_full_files_table').find('tr').find('.item-name').innerWidth(name_width);
        if (Gofast.ITHit.display === 'icons') {
          $('#file_browser_full_files_table').find('tr').find('.item-icon').css("cssText", "text-align: center; font-size: 80px; height: 75px; width: " + name_width + "px !important;");
        }

        //Search what width we have to correct
        var correction_width = (icon_width + name_width + size_width + type_width + modified_width + info_width) - header_width + 10;

        //We need to have a repartition of this correction between headers. A header
        //cannot be smaller than 80px

        //Alter size header
        var alter_size_width_max = -(10 - size_width);
        if (alter_size_width_max < correction_width) {
          correction_width -= alter_size_width_max;
          $('#size_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-size').innerWidth(10);
        } else {
          $('#size_header').innerWidth(size_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-size').innerWidth(size_width - correction_width);
          return;
        }

        //Alter type header
        var alter_type_width_max = -(10 - type_width);
        if (alter_type_width_max < correction_width) {
          correction_width -= alter_type_width_max;
          $('#type_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(10);
        } else {
          $('#type_header').innerWidth(type_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(type_width - correction_width);
          return;
        }

        //Alter modified header
        var alter_modified_width_max = -(10 - modified_width);
        if (alter_modified_width_max < correction_width) {
          correction_width -= alter_modified_width_max;
          $('#modified_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(10);

          //We need to revert the resizing as we can't resize anymore
          $('#name_header').innerWidth(name_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-name').innerWidth(name_width - correction_width);
          if (Gofast.ITHit.display === 'icons') {
            $('#file_browser_full_files_table').find('tr').find('.item-icon').css("cssText", "text-align: center; font-size: 80px; height: 75px; width: " + (name_width - correction_width) + "px !important;");
          }
        } else {
          $('#modified_header').innerWidth(modified_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(modified_width - correction_width);
          return;
        }
      });
      $('#size_header').resize(function (e) {
        e.stopPropagation();
        if (!(new URLSearchParams(window.location.search)).has("path")) {
          return;
        }
        var icon_width = $('#file_browser_full_files_header').find('th:first').innerWidth();
        var header_width = $("#file_browser_full_files_header").innerWidth();
        var name_width = $('#name_header').innerWidth();
        var size_width = $('#size_header').innerWidth();
        var type_width = $('#type_header').innerWidth();
        var modified_width = $('#modified_header').innerWidth();
        var info_width = $('#info_header').innerWidth();

        $('#file_browser_full_files_table').find('tr').find('.item-size').innerWidth(size_width);

        //Search what width we have to correct
        var correction_width = (icon_width + name_width + size_width + type_width + modified_width + info_width) - header_width + 10;

        //We need to have a repartition of this correction between headers. A header
        //cannot be smaller than 80px

        //Alter type header
        var alter_type_width_max = -(10 - type_width);
        if (alter_type_width_max < correction_width) {
          correction_width -= alter_type_width_max;
          $('#type_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(10);
        } else {
          $('#type_header').innerWidth(type_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(type_width - correction_width);
          return;
        }

        //Alter modified header
        var alter_modified_width_max = -(10 - modified_width);
        if (alter_modified_width_max < correction_width) {
          correction_width -= alter_modified_width_max;
          $('#modified_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(10);

          //We need to revert the resizing as we can't resize anymore
          $('#size_header').innerWidth(size_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-size').innerWidth(size_width - correction_width);
        } else {
          $('#modified_header').innerWidth(modified_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(modified_width - correction_width);
          return;
        }
      });
      $('#type_header').resize(function (e) {
        e.stopPropagation();
        if (!(new URLSearchParams(window.location.search)).has("path")) {
          return;
        }
        var icon_width = $('#file_browser_full_files_header').find('th:first').innerWidth();
        var header_width = $("#file_browser_full_files_header").innerWidth();
        var name_width = $('#name_header').innerWidth();
        var size_width = $('#size_header').innerWidth();
        var type_width = $('#type_header').innerWidth();
        var modified_width = $('#modified_header').innerWidth();
        var info_width = $('#info_header').innerWidth();

        $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(type_width);


        //Search what width we have to correct
        var correction_width = (icon_width + name_width + size_width + type_width + modified_width + info_width) - header_width + 10;

        //We need to have a repartition of this correction between headers. A header
        //cannot be smaller than 80px

        //Alter modified header
        var alter_modified_width_max = -(10 - modified_width);
        if (alter_modified_width_max < correction_width) {
          correction_width -= alter_modified_width_max;
          $('#modified_header').innerWidth(10);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(10);

          //We need to revert the resizing as we can't resize anymore
          $('#type_header').innerWidth(type_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(type_width - correction_width);
        } else {
          $('#modified_header').innerWidth(modified_width - correction_width);
          $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(modified_width - correction_width);
          return;
        }
      });
      $('#modified_header').resize(function (e) {
        e.stopPropagation();
        if (!(new URLSearchParams(window.location.search)).has("path")) {
          return;
        }
        const icon_width = $('#file_browser_full_files_header').find('th:first').innerWidth();
        const header_width = $("#file_browser_full_files_header").innerWidth();
        const name_width = $('#name_header').innerWidth();
        const size_width = $('#size_header').innerWidth();
        const type_width = $('#type_header').innerWidth();
        const modified_width = $('#modified_header').innerWidth();
        const info_width = $('#info_header').innerWidth();

        $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(modified_width);

        //Search what width we have to correct
        let correction_width = (icon_width + name_width + size_width + type_width + modified_width + info_width) - header_width + 10;
         //We need to have a repartition of this correction between headers.
         // A header cannot be smaller than 80px

          //Alter modified header
          const alter_modified_width_max = -(10 - modified_width);
          if (alter_modified_width_max < correction_width) {
            correction_width -= alter_modified_width_max;
            $('#modified_header').innerWidth(10);
            $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(10);

            //We need to revert the resizing as we can't resize anymore
            $('#type_header').innerWidth(type_width - correction_width);
            $('#file_browser_full_files_table').find('tr').find('.item-type').innerWidth(type_width - correction_width);
          } else {
            $('#modified_header').innerWidth(modified_width - correction_width);
            $('#file_browser_full_files_table').find('tr').find('.item-date').innerWidth(modified_width - correction_width);
            return;
        }
      });
    },

    /*
     * Select all items
     */
    selectAll: function () {
      $('.file_browser_full_files_element')
        .not('#file_browser_back_button')
        .addClass('selected');

      $('.gfb-cbx')
        .each(function () {
          $(this).prop('checked', true);
        });

      GFITHit._fileListSelectionUpdated();
    },

    /*
     * Deselect all items
     */
    deselectAll: function () {
      $('.file_browser_full_files_element')
        .not('#file_browser_back_button')
        .removeClass('selected');

      $('.gfb-cbx')
        .each(function() {
          $(this).prop('checked', false);
        });

      GFITHit._fileListSelectionUpdated();
    },

    /**
     * Select all currently shown items.
     */
    selectAllShown: function () {
      const $elements = $('.file_browser_full_files_element').not('#file_browser_back_button');
      const $shownElements = $elements.not('.search-hidden');

      $shownElements.addClass('selected');
      $shownElements.find("td>input[type=checkbox]").prop('checked', true);

      GFITHit._fileListSelectionUpdated();
    },

    /**
     * Deselect all currently shown items.
     */
    deselectAllShown: function () {
      const $elements = $('.file_browser_full_files_element').not('#file_browser_back_button');
      const $shownElements = $elements.not('.search-hidden');

      $shownElements.removeClass('selected');
      $shownElements.find("td>input[type=checkbox]").prop('checked', false);

      GFITHit._fileListSelectionUpdated();
    },

    /**
     * Selection status object
     * @typedef {object} SelectionStatus
     * @prop {JQuery} $selectedElements
     *   JQuery list object of selected elements. This includes hidden elements.
     * @prop {JQuery} $selectedShownElements
     *   JQuery list object of selected and shown elements.
     * @prop {bool} isAnySelected
     *   Whether any element is selected at all currently.
     * @prop {bool} areAllShownElementsSelected
     *   Whether all shown elements are currently selected.
     * @prop {bool} areOnlyContainersSelected
     *   Whether all selected elements are container elements, e.g. spaces
     *   or directories.
     * @prop {bool} isShownFileListEmpty
     *   Whether the shown file list is currently empty.
     */
    /**
     * Computes a selection status object.
     *
     * The selection status object compiles information about the current
     * selection state, such as the lists of selected elements, selected shown
     * elements and conditions such as knowing if any element is selected or if
     * all visible elements are selected.
     *
     * @returns {SelectionStatus} Selection status object.
     */
    _getSelectionStatus: function () {
      const $elements = $('.file_browser_full_files_element').not('#file_browser_back_button');
      const $shownElements = $elements.not('.search-hidden');
      const $selectedShownElements = $shownElements.filter('.selected');
      const $selectedElements = $elements.filter('.selected');

      const isShownFileListEmpty = $shownElements.length === 0;
      const areAllShownElementsSelected = $selectedShownElements.length === $shownElements.length;
      const isAnySelected = $selectedElements.length > 0;

      const areOnlyContainersSelected = $selectedElements
        .get()
        .every((el) => $(el).find(".item-real-type").text() === "Folder");

      return {
        $selectedElements,
        $selectedShownElements,
        isAnySelected,
        areAllShownElementsSelected,
        areOnlyContainersSelected,
        isShownFileListEmpty,
      };
    },

    /**
     * Callback to run after file list display or items change.
     *
     * Applies common browser UI and state updates based on the new state of the
     * file list.
     */
    _fileListShownElementsUpdated: function () {
      const selectionStatus = GFITHit._getSelectionStatus();
      GFITHit._updateMagicCheckbox(selectionStatus);
    },

    /**
     * Callback to run after the current selection updated.
     *
     * Applies common browser UI and state updates based on the new state of the
     * selection.
     */
    _fileListSelectionUpdated: function () {
      const selectionStatus = GFITHit._getSelectionStatus();
      GFITHit._updateMagicCheckbox(selectionStatus);
      GFITHit._enableToolbar(selectionStatus);
    },

    /**
     * Updates the "magic" all elements selection checkbox based on a given
     * selection status.
     *
     * @param {SelectionStatus} selectionStatus
     *   Current selection status that the checkbox state should reflect.
     */
    _updateMagicCheckbox: function ({ areAllShownElementsSelected, isAnySelected, isShownFileListEmpty }) {
      const gofastBrowserMagicCheckbox = document.querySelector("#gofastBrowserMagicCheckbox");
      const hasCheckbox = gofastBrowserMagicCheckbox != null
        && (gofastBrowserMagicCheckbox instanceof HTMLInputElement);
      if (!hasCheckbox) {
        return;
      }

      if (!isShownFileListEmpty && areAllShownElementsSelected) {
        gofastBrowserMagicCheckbox.checked = true;
        gofastBrowserMagicCheckbox.indeterminate = false;
      } else if (isAnySelected) {
        gofastBrowserMagicCheckbox.checked = false;
        gofastBrowserMagicCheckbox.indeterminate = true;
      } else {
        gofastBrowserMagicCheckbox.checked = false;
        gofastBrowserMagicCheckbox.indeterminate = false;
      }
    },

    /**
     * Enables or disables the toolbar
     *
     * @param {SelectionStatus} selectionStatus
     *   The current selection status
     */
    _enableToolbar: function({ isAnySelected: active, areOnlyContainersSelected }) {
      $('#file_browser_tooolbar_copy').prop('disabled', !active);
      $('#file_browser_tooolbar_cut').prop('disabled', !active);
      // Cart button is only enabled while there is a selection that is not
      // entirely made up of spaces or folders.
      $('#file_browser_tooolbar_cart_button').prop('disabled', !active || areOnlyContainersSelected);

      const toolbar = $('#file_browser_full_container #file_browser_tooolbar_manage')

      if(active) {
        toolbar
          .removeClass("disabled")
          .addClass("btn-white")
          .attr("data-toggle", "dropdown")
          .tooltip("dispose");
      } else {
        toolbar
          .addClass("disabled")
          .removeClass("btn-white")
          .attr("data-toggle", "tooltip")
          .tooltip();
      }

      $('#file_browser_tooolbar_contextual_actions').prop('disabled', !active);
    },

    /*
     * Set the display type of the browser
     */
    setDisplay: function (type) {
      Gofast.ITHit.display = type;
      Gofast.ITHit.reload();

      if (type === 'details') {
        //Display the header
        $('#file_browser_full_files_header').show();
        $('#file_browser_tooolbar_display_icon').removeClass('fa-picture-o').addClass('fa-list');
      } else {
        //Hide the header
        $('#file_browser_full_files_header').hide();
        $('#file_browser_tooolbar_display_icon').removeClass('fa-list').addClass('fa-picture-o');
      }

    },
    getPathParam: function() {
      const urlParams = new URLSearchParams(window.location.search);
      let currentPath = "";
      for (const pair of urlParams.entries()) {
        if (pair[0] !== "path") continue;
        currentPath = pair[1];
        break;
      }
      return currentPath;
    },
    handleDropZoneClickEvent: function(canUpload = false) {
      if (canUpload) {
        jQuery("#file_browser_full_upload_label_container").css("cursor", "pointer");
        jQuery("#file_browser_full_upload_label_container").once().on("click", Gofast.ITHit.triggerFileInput);
        return;
      }
      jQuery("#file_browser_full_upload_label_container").css("cursor", "auto");
      jQuery("#file_browser_full_upload_label_container").off("click");
    },
    handleDropZoneLabel: function(currentPath = "", canUpload = false, itemLabel = "") {
      if (!itemLabel.length && !canUpload) {
        itemLabel = Drupal.t("You can't upload documents or folders in root spaces (Groups, Organizations, Public, Extranet).", {}, {context : "gofast:gofast_ajax_file_browser"}) + '<br>' + Drupal.t("Please upload your files in sub-spaces or create them.", {}, {context : "gofast:gofast_ajax_file_browser"});
      }
      if (!itemLabel.length && canUpload) {
        itemLabel = Drupal.t("Click or drag your documents or folders here to share in:", {}, {context: "gofast:gofast_ajax_file_browser"}) + '<br><strong>' + decodeURIComponent(currentPath) + '</strong>';
      }
      const templatedItemLabel = '<td id="file_browser_full_upload_label" style="width: 100%; display: inline-block; border-top: none; color: var(--gray-dark);" class="text-center py-1">' + itemLabel + '</td>';

      if (document.getElementById("file_browser_full_upload_label")) document.getElementById("file_browser_full_upload_label").remove();
      document.querySelector("#file_browser_full_upload_table_head + tr").insertAdjacentHTML("afterbegin", templatedItemLabel);
    },

    /**
     * Checks if a given path is a root space path
     *
     * The path may include the /alfresco/webdav prefix and start at /Sites/.
     *
     * @param {string} path Path to the space/folder.
     * @returns {boolean} Whether the path is a path to a root space.
     */
    isRootSpacePath: function (path) {
      const cleanPath = path
        .replace(/^\/alfresco\/webdav/, '')
        .replace(/^\/Sites\//, '');

      const rootSpaceNames = ["_Groups", "_Extranet", "_Organisations", "_Public"];
      return rootSpaceNames.includes(cleanPath);
    },

    /**
     * Root spaces and non-updatable nodes should not have upload listeners
     * This must be triggered on navigation and handles two things: labels and
     * upload listeners
     */
    handleDropZonePermission: function(currentPath = "") {
      const dropZone = document.getElementById('file_browser_full_upload');
      if (typeof Gofast.ITHit.Uploader === "undefined" || !dropZone) {
        return;
      }
      if (currentPath.length === 0) currentPath = Gofast.ITHit.getPathParam();
      currentPath = currentPath
        .replace("/alfresco/webdav", "")
        .replace("/Sites/", "")
        // Remove underscores that are preceded by either a slash or the beginning of the string
        .replace(/^_/, "")
        .replaceAll("/_", "/");

      Gofast.ITHit.Uploader.Queue.RemoveListener('OnQueueChanged', '_UploadQueueChanged', this);
      const isWikiLocation = Gofast.ITHit.currentPath.includes("/Wikis");
      if (isWikiLocation) {
        Gofast.ITHit.handleDropZoneLabel(currentPath, false, Drupal.t("There can be only wiki articles in the Wikis folder", {}, { context: 'gofast:ajax_file_browser' }));
        Gofast.ITHit.handleDropZoneClickEvent();
        return;
      }
      if(["/Sites", "Groups", "Extranet", "Organisations", "Public"].some(val => val == currentPath)) {
        Gofast.ITHit.handleDropZoneLabel(currentPath);
        Gofast.ITHit.handleDropZoneClickEvent();
        return;
      }

      Gofast.ITHit.Uploader.Queue.AddListener('OnQueueChanged', '_UploadQueueChanged', this);
      Gofast.ITHit.handleDropZoneLabel(currentPath, true);
      Gofast.ITHit.handleDropZoneClickEvent(true);
    },
    /*
     * Reload the current path
     */
    reload: function () {
      Gofast.ITHit.navigate(Gofast.ITHit.currentPath);
    },
    /*
     * Create a folder (form)
     */
    createFolder: function (path) {
      //Remove slash at the end
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }
      if (path.includes("/Wikis")) {
        Gofast.toast(Drupal.t("A folder cannot be created inside a Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        return;
      }

      //Create a fake item to process it in the table
      var item = {
        ResourceType: 'Folder',
        DisplayName: Drupal.t('New folder', {}, { context: 'gofast:ajax_file_browser' }),
        Href: path + '/' + this.DisplayName,
      };

      //Format the fake item
      var itemHTML = Gofast.ITHit._formatItem(item);

      //Add a new line to the table at the bottom containing the new potential folder
      var processedItem = $('#file_browser_full_files_table').find('tbody:last-child').append(itemHTML);
      processedItem = processedItem.find('tr').last();
      var name_element = processedItem.find('.item-name');

      //We are secure to edit
      name_element.html('<input id="new-folder-form" class="form-control form-text" value="' + name_element.text() + '" style="padding-bottom:12px;height:20px;width:80%;float:left;margin-top:0px;"><div class="badge badge-success"><i class="fa fa-check" style="color:white;"></i></div><div class="badge badge-danger"><i class="fa fa-times" style="color:white;"></i></div>');

      //Scroll to the bottom of the table
      $("#file_browser_full_files_table").mCustomScrollbar("scrollTo", "bottom", { scrollInertia: 0 });

      //GOFAST-6757 - Couldn't d&d a file after going out of a rename in the gfb (caused because no refresh when we don't submit a new name)
      $('.file_browser_full_files_element').attr('draggable', 'false'); //sets the attribute to false

      name_element.find('input:text').select();

      name_element.focus();

      //Bind the enter event to the input
      name_element.find('input').on('keyup', function (e) {
        if (e.keyCode == 13) { //Enter pressed
          var new_name = name_element.find('input').val();

          //Delete spaces at the beginning and end of the name
          new_name = new_name.trim();
          if(!validateItemName(new_name, "folder", true)){
            return;
          }
          //Trigger the animation
          name_element.html('<div class="loader-filebrowser"></div>' + new_name);

          //Process creation
          Gofast.ITHit._processCreateFolder(path, new_name, processedItem, name_element);
        }
      });
      //Bind the validate button event
      name_element.find('.badge-success').on('click', function (e) {
        var new_name = name_element.find('input').val();

        //Delete spaces at the beginning and end of the name
        new_name = new_name.trim();
        if(!validateItemName(new_name, "folder", true)){
          return;
        }
        //Trigger the animation
        name_element.html('<div class="loader-filebrowser"></div>' + new_name);

        //Process creation
        Gofast.ITHit._processCreateFolder(path, new_name, processedItem, name_element);
      });
      //Bind the cancel button event
      name_element.find('.badge-danger').on('click', function (e) {
        processedItem.remove();
      });
    },
    /*
     * Process the creation of a folder
     */
    _processCreateFolder: function (path, name, element, name_element) {
      Gofast.ITHit.Session.OpenFolderAsync(path, null, function (asyncResult) {
        if (!asyncResult.IsSuccess) {
          Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + path, "warning");
          element.remove();
          return;
        }

        var folder = asyncResult.Result;

        //Process creation
        folder.CreateFolderAsync(name, null, null, function (asyncFResult) {
          if (asyncFResult.IsSuccess) {
            //Reload and go to folder position
            Gofast.ITHit.navigate(path, null, null, null, asyncFResult.Result.Href);
            // The returned Href does not resolve for accented names: build the path instead.
            Gofast.ITHit.navigate(path.replace(/\/$/, "") + "/" + name);
            return;
          } 
          if (asyncFResult.Error instanceof ITHit.WebDAV.Client.Exceptions.MethodNotAllowedException) {
            Gofast.toast(name + " " + Drupal.t("already exists in this folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
            element.remove();
            return;
          }
          // The MKCOL may succeed while re-reading the new folder fails, and Alfresco answers 500 to a
          // case-only duplicate: look at what the parent now holds before reporting an error.
          folder.GetChildrenAsync(false, null, function (childrenResult) {
            const existing = childrenResult.IsSuccess
              ? childrenResult.Result.find((child) => Gofast.ITHit.isSameItemName(child.DisplayName, name, true))
              : null;
            if (existing && Gofast.ITHit.isSameItemName(existing.DisplayName, name)) {
              Gofast.ITHit.navigate(path, null, null, null, existing.Href);
              Gofast.ITHit.navigate(path.replace(/\/$/, "") + "/" + existing.DisplayName);
              return;
            }
            if (existing) {
              Gofast.toast(name + " " + Drupal.t("already exists in this folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
            } else if (asyncFResult.Error instanceof ITHit.WebDAV.Client.Exceptions.ForbiddenException) {
              Gofast.toast(
                path.includes("TEMPLATES")
                  ? Drupal.t("You are not the administrator of this space and therefore cannot create a template inside.", {}, { context: 'gofast:ajax_file_browser' })
                  : Drupal.t("You are not the administrator of this space and therefore cannot create a folder inside.", {}, { context: 'gofast:ajax_file_browser' }), "warning"
              );
            } else {
              Gofast.toast(Drupal.t("Your folder cannot be created", {}, { context: 'gofast:ajax_file_browser' }), "warning");
            }
            element.remove();
          });
        });
      });
    },
    /*
     * Search a string in displayed items
     */
    search: function (pattern) {
      if ($("#rename-form").length !== 0) {
        return;
      }
      var elements = $(".file_browser_full_files_element").not('#file_browser_back_button');

      if (pattern === "") {
        elements.removeClass('search-hidden');
        elements.css('display', 'block');

        //Remove bold
        $.each(elements.find('.item-name'), function (k, elem) {
          $(elem).text($(elem).text());
        });
      } else {
        $.each(elements, function (k, element) {
          if ($(element).find('.item-name').text().toLowerCase().indexOf(pattern.toLowerCase()) === -1) {
            $(element).addClass('search-hidden');
            setTimeout(function () {
              $(element).css('display', 'none');
            }, 300);

            $(element).find('.item-name').text($(element).find('.item-name').text());
          } else {
            $(element).removeClass('search-hidden');
            $(element).css('display', 'block');

            //Add bold
            $(element).find('.item-name').text($(element).find('.item-name').text());
            var name = $(element).find('.item-name').text()
            var indexStart = $(element).find('.item-name').text().toLowerCase().indexOf(pattern.toLowerCase());
            var indexEnd = indexStart + pattern.toLowerCase().length;

            var newHtml = name.substring(0, indexStart) + "<span class='search-bold'>" + name.substring(indexStart, indexEnd) + "</span>" + name.substring(indexEnd);
            $(element).find('.item-name').html(newHtml);
          }
        });
      }

      GFITHit._fileListShownElementsUpdated();
    },
    /*
     * Copy selected content to ITHit variable
     */
    copySelected: function () {
      if (Gofast.ITHit.currentPath.includes("/Wikis")) {
        Gofast.toast(Drupal.t("A wiki article cannot be copied outside of its Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        return;
      }
      //Get selected items
      var selected = $('.gfb-cbx:checked').parents('.file_browser_full_files_element').find('.item-path');

      if (selected.length == 0) {
        return;
      }
      //Store them
      Gofast.ITHit.itemsCopied = [];
      $.each(selected, function (k, path) {
        Gofast.ITHit.itemsCopied.push(path.innerText);
      });

      //Set copy type
      Gofast.ITHit.copyType = 'C';

      //Display toast
      Gofast.toast(Drupal.t("Copied", {}, { context: 'gofast:ajax_file_browser' }), "info");

      //Enable paste button
      $('#file_browser_tooolbar_paste').prop('disabled', false);
    },
    /*
     * Cut selected content to ITHit variable
     */
    cutSelected: function () {
      if (Gofast.ITHit.currentPath.includes("/Wikis")) {
        Gofast.toast(Drupal.t("A wiki article cannot be cut outside of its Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        return;
      }
      //Get selected items
      var selected = $('.gfb-cbx:checked').parents('.file_browser_full_files_element').find('.item-path');

      if (selected.length == 0) {
        return;
      }
      //Store them
      Gofast.ITHit.itemsCopied = [];
      $.each(selected, function (k, path) {
        Gofast.ITHit.itemsCopied.push(path.innerText);
      });

      //Set copy type
      Gofast.ITHit.copyType = 'X';

      //Display toast
      Gofast.toast(Drupal.t("Cut", {}, { context: 'gofast:ajax_file_browser' }), "info");

      //Enable paste button
      $('#file_browser_tooolbar_paste').prop('disabled', false);
    },
    /*
     * Paste content from ITHit variable
     */
    paste: function () {
      if (Gofast.ITHit.currentPath.includes("/Wikis")) {
        Gofast.toast(Drupal.t("There can be only wiki articles in the Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        return;
      }
      if (Gofast.ITHit.copyType === 'C') { //Copy
        //Queue items to be copied
        $.each(Gofast.ITHit.itemsCopied, function (k, path) {
          //Get the name of the element from the path
          var fileName = path;
          if (path.substr(-1, 1) === "/") {
            fileName = path.substring(0, path.length - 1);
          }
          fileName = fileName.split('/');
          fileName = decodeURIComponent(fileName.pop());

          Gofast.ITHit.queue.push({
            uuid: Gofast.ITHit.generate_uuid(),
            path: path,
            destination: Gofast.ITHit.currentPath,
            displayNamePath: fileName + ' (' + path + ')',
            fileName: fileName,
            operation: 'copy',
            displayOperation: Drupal.t('Copy', {}, { context: 'gofast:ajax_file_browser' }),
            progression: 0,
            status: 0
          });
        });
      } else { //Move (cut)
        //Queue items to be moved
        $.each(Gofast.ITHit.itemsCopied, function (k, path) {
          //Get the name of the element from the path
          var fileName = path;
          if (path.substr(-1, 1) === "/") {
            fileName = path.substring(0, path.length - 1);
          }
          fileName = fileName.split('/');
          fileName = decodeURIComponent(fileName.pop());

          Gofast.ITHit.queue.push({
            uuid: Gofast.ITHit.generate_uuid(),
            path: path,
            destination: Gofast.ITHit.currentPath,
            displayNamePath: fileName + ' (' + path + ')',
            fileName: fileName,
            operation: 'move',
            displayOperation: Drupal.t('Move', {}, { context: 'gofast:ajax_file_browser' }),
            progression: 0,
            status: 0
          });
        });
        Gofast.ITHit.itemsCopied = [];

        //Disable paste button
        $('#file_browser_tooolbar_paste').prop('disabled', true);
      }
      //Display toast
      Gofast.toast(Drupal.t("Pasted", {}, { context: 'gofast:ajax_file_browser' }), "info");
    },
    /*
     * Attach events when ITHit upload queue is updated
     */
    attachUploadEvents: function () {
      Gofast.ITHit.Uploader.Queue.AddListener('OnQueueChanged', '_UploadQueueChanged', this);

      //Callback that happens when a drag and drop occur to filter the uploaded content
      Gofast.ITHit.Uploader.Queue.OnUploadItemsCreatedCallback = function (oUploadItemsCreated) {
        items = [];

        //Prevent drag and drop of documents in Wikis folders
        const isWikiLocation = Gofast.ITHit.currentPath.includes("/Wikis");
        if (isWikiLocation) {
          Gofast.toast(Drupal.t("There can be only wiki articles in the Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
          return;
        }

        for (i = 0; i < oUploadItemsCreated.Items.length; i++) {
          items[i] = oUploadItemsCreated.Items[i];
        }
        var item_delete = false;
        items.forEach(function (item, id) {
          if (item_delete === true) {
            indice = items.length - oUploadItemsCreated.Items.length;
            id = id - indice;
            item_delete = false;
          }
          var file = item.GetFile();
          var relativePath = item.GetRelativePath();
          relativepath = relativePath.split("/");

          if (file === null) {
            //This might be a folder and it will not be created
            item_delete = true;
          }
          relativepath.forEach(function (part) {
            if (part.substr(0, 1) === "_") {
              Gofast.toast(Drupal.t("You can't create the following document because a part of it's path is starting with '_' : ") + "<strong>" + item.GetRelativePath() + "</strong>", "warning");
              item_delete = true;
            }
          });
          if (item_delete === false) {
            var path = new URL(item._UploadProvider.Url._BaseUrl, location.origin).pathname;
            if (path.indexOf('/Wikis') !== -1) {
              Gofast.toast(Drupal.t("There can be only wiki articles in the Wikis folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
              item_delete = true;
            }
            if (path.indexOf('/alfresco/webdav/Sites/FOLDERS TEMPLATES') !== -1) {
              Gofast.toast(Drupal.t("You can't create documents in folders templates"), "warning");
              item_delete = true;
            }

            if (Gofast.ITHit.isRootSpacePath(path)) {
              Gofast.toast(
                Drupal.t(
                  "You can't upload documents to root spaces.",
                  {},
                  { context: "gofast:ajax_file_browser" },
                ),
                "error",
              );
              item_delete = true;
            }
          }
          //If an item has been set to be removed from queue, remove it from queue
          if (item_delete) {
            oUploadItemsCreated.Items.splice(id, 1);
          }
        });
        oUploadItemsCreated.Upload(oUploadItemsCreated.Items);
        //Set back upload URL to current location in case drop was inside another location
        Gofast.ITHit.dropPath = false;
        Gofast.ITHit.Uploader.SetUploadUrl(location.origin + Gofast.ITHit.currentPath);
      };
    },
    /*
     * Upload queue changed
     */
    _UploadQueueChanged: function (changes) {
      if (typeof changes.AddedItems !== "undefined" && changes.AddedItems.length > 0) {
        //Close any opened modal
        Drupal.CTools.Modal.dismiss();
      }
      $.each(changes.AddedItems, function (index, uploadItem) {
        Gofast.ITHit.queue.push({
          uuid: Gofast.ITHit.generate_uuid(),
          path: uploadItem._UploadProvider.Url._OriginalUrl,
          displayNamePath: "(" + uploadItem._UploadProvider.FSEntry._File.name + ") " + decodeURIComponent(uploadItem._UploadProvider.Url._OriginalUrl.replace('/alfresco/webdav/Sites/', '')),
          fileName: uploadItem._UploadProvider.FSEntry._File.name,
          operation: "upload",
          displayOperation: Drupal.t("Upload", {}, { context: 'gofast:ajax_file_browser' }),
          progression: 0,
          status: 0,
          uploadItem: uploadItem
        });
        uploadItem.AddListener('OnProgressChanged', '_UploadItemQueueChanged', this);
        uploadItem.AddListener('OnStateChanged', '_UploadItemQueueChanged', this);
        uploadItem.AddListener('OnBeforeUploadStarted', '_UploadItemQueueBeforeStart', this);
        if (Gofast.ITHit.dropPath) {
          Gofast.ITHit.dropPath = false;
          Gofast.ITHit.Uploader.SetUploadUrl(location.origin + Gofast.ITHit.currentPath);
        }
      }.bind(this));

      $.each(changes.RemovedItems, function (index, uploadItem) {
        console.log('removed');
      }.bind(this));
    },
    /*
     *
     */
    _UploadItemQueueBeforeStart: function(oBeforeUploadStarted, item){
      let relativePath = item._UploadProvider.Url._RelativePath.split("/");
      relativePath.pop(); // pop the file name
      let containerName = relativePath.length ? relativePath.pop() : ""; // pop the container name or an empty string if the container is the root upload folder
      if (containerName.startsWith("%5F")) {
        let toasterString = Drupal.t("The item @item in @path was skipped because folders can't begin with '_'.");
        toasterString = toasterString.replace("@item", item._UploadProvider.FSEntry._File.name).replace("@path", decodeURIComponent(item._UploadProvider.Url._OriginalUrl.replace('/alfresco/webdav/Sites/', '/')));
        Gofast.toast(toasterString, "warning");
        var index = Gofast.ITHit.queue.findIndex(function (e) {
          return e !== null && e.operation === "upload" && e.path === item._UploadProvider.Url._OriginalUrl;
        });
        oBeforeUploadStarted.Skip();
        Gofast.ITHit.queue[index] = null;
        return;
      }
      //Try to see if the item already exists
      Gofast.ITHit.Session.OpenItemAsync(item._UploadProvider.Url._OriginalUrl, null, function (asyncResult) {
        if (asyncResult.IsSuccess) {
          //The item already exists, let the queue know the item have to be validated by the user. Get queue item by path
          var index = Gofast.ITHit.queue.findIndex(function (e) {
            return e !== null && e.operation === "upload" && e.path === item._UploadProvider.Url._OriginalUrl;
          });

          if (!$.isNumeric(index)) {
            //Item not found in the queue, abort transfer and send an error in the console
            oBeforeUploadStarted.Skip();
            console.log("Warning : Transfer aborted due to queue item not found for: ");
            console.log(item);
          }

          //Add a flag to the queue and the BeforeUpload event
          if(Gofast.ITHit.queue[index]) {
            Gofast.ITHit.queue[index].toValidate = 1;
            Gofast.ITHit.queue[index].beforeUploadEvent = oBeforeUploadStarted;
          }
        }else{
          //The item doesn't exists
          oBeforeUploadStarted.Upload();
        }
      });
    },
    /*
     * Upload item queue changed
     */
    _UploadItemQueueChanged: async function (change) {
      if ($("#file_browser_full_upload_label")) $("#file_browser_full_upload_label").remove();
      //Get queue item by path
      var index = Gofast.ITHit.queue.findIndex(function (e) {
        return e !== null && e.operation === "upload" && e.path === change.Sender._UploadProvider.Url._OriginalUrl;
      });

      if (!$.isNumeric(index)) {
        return;
      }

      //Update state
      var state = 0;
      switch (change.NewState) {
        case "Queued":
          state = 0;
          break;
        case "Uploading":
          state = 1;
          break;
        case "Failed":
          state = 3;
          break;
        case "Completed":
          state = 4;
          break;
        case "Canceled":
          state = 5;
      }

      if (state <= 1) {
        $("#file_browser_full_upload_button").show();
      }
      if (state == 1 && Drupal.settings.gofast_ajax_file_browser?.has_upload_modal == 1 && !Gofast.ITHit.hasMultiUploadModal) {
        Gofast.ITHit._processMultiUploadGenerateHtml();
      }

      if (state > 1 && Gofast.ITHit.queue.length <= 1) {
        $("#file_browser_full_upload_button").hide();
      }
      Gofast.ITHit.queue[index].status = state;

      //Update progression
      if (typeof change.NewProgress !== "undefined" && state !== 4) {
        Gofast.ITHit.queue[index].progression = change.NewProgress.Completed;
      }

      //Update completed, clear the queue and process the item
      if (state === 4) {
        if (location.origin + Gofast.ITHit.currentPath === change.Sender._UploadProvider.Url._BaseUrl) {
          //Get uploaded file and URl informations
          var file = change.Sender._UploadProvider._UploadItem.GetFile();
          var fullPath = change.Sender._UploadProvider._UploadItem.GetUrl();

          var folderPath = fullPath.split("/");
          folderPath.pop();
          folderPath = folderPath.join("/");

          if (folderPath !== change.Sender._UploadProvider.Url._BaseUrl) {
            var type = "Folder";

            //Prevent depth to alter wanted the behavior
            while (folderPath.split("/").length + 1 > change.Sender._UploadProvider.Url._BaseUrl.split("/").length + 2) {
              folderPath = folderPath.split("/");
              folderPath.pop();
              folderPath = folderPath.join("/");
            }

            //Build a folder item object
            var item = {
              DisplayName: decodeURIComponent(folderPath.split("/").pop()),
              Href: folderPath.substr(window.location.origin.length),
              ResourceType: type,
              LastModified: new Date()
            };
          } else {
            var type = "Resource";
            //Build a ressource item object
            var item = {
              DisplayName: file.name,
              Href: fullPath.substr(window.location.origin.length),
              ContentLength: file.size,
              ResourceType: type,
              LastModified: new Date()
            };
          }
          Gofast.ITHit.awaitSetItemProperties(Gofast.ITHit.queue[index], file, fullPath);

          //Check if the item is already present in the file browser
          var browser_item = $('#file_browser_full_files_table').find('td:contains("' + item.DisplayName + '")');
          if (browser_item.length > 0) {
            if (item.ResourceType === "Resource") {
              // decodeURIComponent doesn't do the trick since the item-path is somehow partially encoded
              let item_path = item.Href.replaceAll("%5F", "_").replaceAll("%2D", "-");
              Gofast.ITHit.selectItem(item_path, true);
            }
          } else if (!Gofast.ITHit.isTechnicalFile(item)) {
            //Format the new item
            var itemHTML = Gofast.ITHit._formatItem(item);

            //Add the item to the list
            var processedItem = $('#file_browser_full_files_table').find('tbody:last-child').append(itemHTML);
            processedItem = processedItem.find('tr').last();

            //Attach event handlers to the processed item
            Gofast.ITHit._attachEvents(item, processedItem);

            if (type === "Folder") {
              //Make this folder dropable
              processedItem.attr('ondragover', "Gofast.ITHit.insideDragOver(event)");
              processedItem.attr('ondragleave', "Gofast.ITHit.insideDragLeave(event)");
              processedItem.attr('ondrop', "Gofast.ITHit.insideDrop(event)");
              processedItem[0].addEventListener("drop", Gofast.ITHit.insideDrop);
            }

            //Trigger resize on columns and select item
            $('#name_header').trigger('resize');
            $('#size_header').trigger('resize');
            $('#type_header').trigger('resize');
            Gofast.ITHit.selectItem(item.Href, true);
          }

          //Removed : GOFAST-5364
          //Gofast.ITHit.reload();
        }
        Gofast.ITHit.queue[index].progression = 100;
        Gofast.ITHit.queue.splice(index, 1);
        // setTimeout(function () {
        //   Gofast.ITHit.queue.splice(index, 1);
        //   // if this was the last item of the queue, we trigger the metadata modal
        //   if (Gofast.ITHit.queue.length == 0) document.getElementById(Drupal.t('Manage Metadata', {}, {context: 'gofast'})).click();
        //   // if we need to generate some buttons afterwards
        //   // const processedElement = $('<tr style="width: 100%; display: inline-block;"><td style="width: 100%; display: inline-block; border-top: none;" class="d-flex justify-content-center"><a><button class="btn btn-outline-success btn-sm">' + Drupal.t("Fill in additional informations for", {}, {context: "gofast:gofast_ajax_file_browser"}) + ' ' + item.DisplayName + '</button></a></td></tr>').insertAfter( "#file_browser_full_upload_table_head");
        // }, 1000);
      }

      //Update failed, clear the queue and process the item
      if (state === 3) {
        var baseurl = change.Sender._UploadProvider.Url._BaseUrl;
        if (baseurl == window.location.origin + "/alfresco/webdav/Sites" || baseurl == window.location.origin + "/alfresco/webdav/Sites/_Groups" || baseurl == window.location.origin + "/alfresco/webdav/Sites/_Organisations" || baseurl == window.location.origin + "/alfresco/webdav/Sites/_Public" || baseurl == window.location.origin + "/alfresco/webdav/Sites/_Extranet") {
          Gofast.ITHit.queue[index].progression = 0;
          Gofast.toast(Drupal.t("You can not upload files in root spaces (Groups, Organizations, Public, Extranet). Please, upload your files in sub-spaces or create them. ", {}, { context: 'gofast:ajax_file_browser' }), 'warning');
          setTimeout(function () {
            Gofast.ITHit.queue[index] = null;
          }, 1500);
        } else {
          Gofast.ITHit.queue[index].progression = 0;
          if (baseurl.indexOf('/TEMPLATES/') !== -1) {
              Gofast.toast("<u>" + change.Sender._UploadProvider.FSEntry._File.name + "</u><br /><br />" + Drupal.t("You are not the administrator of this space, you cannot create a model there.", {}, { context: 'gofast:ajax_file_browser' }), "warning", Drupal.t("Your document cannot be uploaded", {}, { context: 'gofast:ajax_file_browser' }));
          }
          else{
            Gofast.toast("<u>" + change.Sender._UploadProvider.FSEntry._File.name + "</u><br /><br />" + Drupal.t("Please verify that you are allowed to do that.  If you think this is an error, please contact your administrator.", {}, { context: 'gofast:ajax_file_browser' }), "warning", Drupal.t("Your document cannot be uploaded", {}, { context: 'gofast:ajax_file_browser' }));
          }
          setTimeout(function () {
            Gofast.ITHit.queue[index] = null;
          }, 1500);
        }
      }

      //Last item canceled or failed
      if ((state == 5 || state == 3) && Gofast.ITHit.queue.length == 1) {
        Gofast.ITHit.hasMultiUploadModal = false;
      }

      if (!Gofast.ITHit.queue.length) {
        Gofast.ITHit.hasMultiUploadModal = false;
      }
      Gofast.ITHit.handleDropZonePermission();
    },
    /**
     * Wait for any confirmation modal to be closed before setting item properties.
     * Handle uploading items and already uploaded items as well.
     * @param {*} properties | the ITHit item
     * @param {*} file | the ITHit file time
     * @param {*} fullPath | the ITHit URL item
     */
    awaitSetItemProperties: async function(item, file, fullPath) {
      var itemProperties = {};
      if (Gofast.ITHit.promises.multiUploadModal.promise) {
        itemProperties = await Gofast.ITHit.promises.multiUploadModal.promise;
      } else if (item?.properties) {
        itemProperties = item.properties;
      }
      Gofast.ITHit.setItemProperties(itemProperties, file, fullPath);
    },
    /**
     * Using WebDAV requests, set properties of given item.
     * @param {*} properties | the ITHit item properties
     * @param {*} file | the ITHit file time
     * @param {*} fullPath | the ITHit URL item
     */
    setItemProperties: function (properties, file, fullPath) {
      if (!properties || !Object.keys(properties).length) {
        return;
      }
      const deletableProperties = [];
      const formattedProperties = Object.entries(properties).map(([key, value]) => {
        if (value === "-1" || value === "0" || value === "") { // Unset
          deletableProperties.push(new ITHit.WebDAV.Client.PropertyName("gofast:" + key, "gofast.model"));
          return null;
        }
        return new ITHit.WebDAV.Client.Property("gofast:" + key, value, "gofast.model");
      });

      Gofast.ITHit.Session.OpenFileAsync(fullPath, [], function (oFile) {
        oFile.Result.UpdatePropertiesAsync(formattedProperties.filter(el => el != null), deletableProperties, "", function (oResult) {
            if (oResult.IsSuccess) {
                console.log('Properties successfully set for:', file.name);
            } else {
                console.error('Failed to set properties:', oResult.Error);
            }
        });
      });
    },
    /*
     *
     * @param {type} uuid
     * @returns {undefined}
     * Cancel a waiting or processing upload in the queue
     */
    cancelUpload: function (uuid) {
      Gofast.ITHit.queue.forEach(function (item, i) {
        if (item !== null && item.uuid == uuid && item.uploadItem !== null) {
          //Cancel the upload
          if (typeof item.uploadItem.CancelAsync == "function") {
            item.uploadItem.SetDeleteOnCancel(false);
            item.uploadItem.CancelAsync(5, 500, function () {
              //Upload cancelled, remove line in queue
              Gofast.ITHit.queue[i] = null;
            });
          }
        }
      });
      if (!Gofast.ITHit.queue.filter(item => item != null).length) {
        Gofast.ITHit.hasMultiUploadModal = false;
      }
    },
    /*
     *
     * @returns {undefined}
     * Cancel all waiting or processing uploads in the queue
     */
    cancelAllUpload: function () {
      Gofast.ITHit.queue.forEach(function (item, i) {
        if (item !== null && item.uploadItem !== null) {
          //Cancel the upload
          if (typeof item.uploadItem.CancelAsync == "function") {
            item.uploadItem.SetDeleteOnCancel(false);
            item.uploadItem.CancelAsync(5, 500, function () {
              //Upload cancelled, remove line in queue
              Gofast.ITHit.queue[i] = null;
            });
          }
        }
      });
    },
    /*
     * Load the tree of the File Browser
     * Uses a ztree basic implementation
     */
    loadTree: function () {
      //Configure zTree parameters
      var settings = {
        view: {
          dblClickExpand: false,
          showLine: true,
          selectedMulti: false,
        },
        data: {
          simpleData: {
            enable: true,
            idKey: "id",
            pIdKey: "pId",
            rootPId: null,
          }
        },
        callback: {
          onClick: function (event, treeId, treeNode, clickFlag) {
            Gofast.ITHit.navigate(treeNode.path, false, true, null, null, null, "click");
          },
          onExpand: function (event, treeId, treeNode, clickFlag) {
            Gofast.ITHit.navigate(treeNode.path, true, true, null, null, null, "expand");
          },
          onRightClick: Gofast.ITHit._contextMenuHandler,
        }
      }

      //Configure zTree elements
      var treeNodes = [
        { id: 1, pId: null, name: "Sites", open: true, path: "/alfresco/webdav/Sites" },
      ];

      Gofast.additionalGFBNodes.forEach(function (item, index) {
        var new_node = { id: index + 1, pId: null, name: item.split("/").reverse()[0], open: true, path: item }
        treeNodes.push(new_node);
      });

      //Instanciate zTree
      var tree = $("#file_browser_full_tree_element");
      Gofast.ITHit.tree = $.fn.zTree.init(tree, settings, treeNodes);
      //Override default behavior of selectNode tree method to add autoscroll on select
      Gofast.ITHit.tree.onlySelectNode = Gofast.ITHit.tree.selectNode;
      Gofast.ITHit.tree.selectNode = function() {
        Gofast.ITHit.tree.onlySelectNode.apply(this, arguments);
        const curSelectedNode = document.querySelector(".curSelectedNode");
        // without this condition navigation may break on simplified version
        if (curSelectedNode) {
          curSelectedNode.scrollIntoView({ behavior: "smooth", block: "center"});
        }
      };
      Gofast.ITHit.tree.addFakeNode = async function(parentPath, newNodeName, disabled = false, tooltip = false) {
        var zTreeObj = this;
        var parentNode;
        var newNode;
        parentPath = parentPath.includes("/alfresco/webdav") ? parentPath : "/alfresco/webdav" + parentPath;
        // we can't return the new node before it has been set so we have to await
        await new Promise((resolve, reject) => {
          var waitForParentInterval = setInterval(function() {
            parentNode = zTreeObj.getNodeByParam("path", parentPath);
            if (parentNode == null) {
              return;
            }
            clearInterval(waitForParentInterval);
            $("#" + parentNode.tId + "_switch").click();
            newNode = {...parentNode, ...{name: newNodeName, children: []}};
            zTreeObj.addNodes(parentNode, -1, [newNode]);
            if (disabled) {
              $("#" + parentNode.tId + " > ul > li:last-of-type > a").css("cursor", "not-allowed");
              $("#" + parentNode.tId + " > ul > li:last-of-type > a").removeAttr("treenode_a onclick target");
              $("#" + parentNode.tId + " > ul > li:last-of-type > [treenode_switch]").addClass("invisible");
              $("#" + parentNode.tId + " > ul > li:last-of-type > a > span:last-of-type").addClass("ml-5 text-muted");
              $("<span class='spinner spinner-primary spinner-sm'></span>").insertBefore($("#" + parentNode.tId + " > ul > li:last-of-type > a > span:last-of-type"));
            }
            if (tooltip) {
              $("#" + parentNode.tId + " > ul > li:last-of-type").tooltip({title: tooltip, placement: "top", trigger: "hover"});
            }
            resolve();
          }, 250);
        })
        return newNode;
      };
    },
    /*
     *
     * Fully reload the tree to the given path
     * Call when navigating
     * If noRecursion is set to true, we only update the zTree for the wanted location
     */
    _processTree: function (path, noRecursion, deleteTree, eventType) {
      //DEBUG TC
      var currentPath = ["/alfresco/webdav/Sites"];
      Gofast.additionalGFBNodes.forEach(function (item, index) {
        currentPath.push(item);
      });

      //Remove not needed /alfresco/webdav/Sites and other currentPath
      currentPath.forEach(function (item, index, array) {
        if (path.indexOf(item) === 0) {
          path = path.substr(item.size() + 1);
        }
      });

      //Get elements
      var splitPath = path.split('/');
      var nodes = [];
      if (Gofast.ITHit.tree) {
        nodes = Gofast.ITHit.tree.getSelectedNodes();
      }
      if (deleteTree === true) {
        Gofast.ITHit.tree.removeNode(nodes[0]);
      }

      //Call for recursion if needed
      if (noRecursion) {
        currentPath.forEach(function (item, index, array) {
          let itemAppend = path ? "/" + path : "";
          Gofast.ITHit._processTreePart(item + itemAppend, [], eventType);
        })
      } else {
        currentPath.forEach(function (item, index, array) {
          Gofast.ITHit._processTreePart(item, splitPath, eventType);
        })
      }
      Gofast.ITHit._processZTreeDropZones(path, eventType);
    },
    /**
     * Add drag & drop events to ztree nodes
     */
    _processZTreeDropZones: function(path, eventType) {
      // If we are in a "Wikis" folder, we don't want to allow drag&drop items to other locations
      const  makeDroppable = !Gofast.ITHit.currentPath.includes("/Wikis");

      var nodes = $("#file_browser_full_tree").find("a");
      var nodeDragEvents = makeDroppable ? {over: "Gofast.ITHit.moveDragOver(event)", leave: "Gofast.ITHit.moveDragLeave(event)"} :  {over: "", leave: ""};

      var nodesArray = nodes.get();
      var filteredNodeArray = [];
      // Filter nodes to get only droppable ones
      nodesArray.forEach((el, i) => {
        const elementTId = $(el).parent("[treenode]").attr("id");
        const treeNode = Gofast.ITHit.tree.getNodeByTId(elementTId)
        // Prevent Wikis folder and ites subfolders being droppable
        if(!treeNode.path.endsWith("/Wikis") && !treeNode.path.includes("/Wikis/")){
          filteredNodeArray.push(el);
        }
      })
      nodes = $(filteredNodeArray)
      //Add drop events
      nodes.attr("ondragover", nodeDragEvents.over);
      nodes.attr("ondragleave", nodeDragEvents.leave);

      //Set drag and drop zone for upload
      nodes.each(function (k, elem) {
        // Remove drop event if the element should not be droppable anymore
        elem.removeEventListener("drop", Gofast.ITHit.moveDrop);
        if(makeDroppable){
          elem.addEventListener("drop", Gofast.ITHit.moveDrop)
          // Set dropzone on element if not already set
          if(!Gofast.ITHit.Uploader.DropZones.GetById(elem.id)) {
            Gofast.ITHit.Uploader.DropZones.AddById(elem.id)
          }
        } else {
          $(elem).off("drop");
          Gofast.ITHit.Uploader.DropZones.RemoveById(elem.id);
        }
      });
    },

    /**
     * Async generator of item batches of given maximum size (default: 400)
     *
     * NOTE: Although this function uses Alfresco's CMIS API, the retrieved objects
     * are mapped to seamlessly integrate with the WebDAV code.
     * @param {string} path The path of the folder to get the children of in batches
     * @param {object} [options] Options on how to get the batches, supports the following options:
     * @param {number} [options.maxBatchItems] maximum number of item per batch (default: 400)
     */
    _getChildrenBatches: async function* (path, options = {}) {
      // normalize path (remove webdav part)
      path = path.replace(/^\/alfresco\/webdav/, "");

      /** utility to join path segments together somewhat safely */
      const urlPathJoin = (segments) =>
        segments
          .map((segment, i) => {
            // trim leading slash of every segment except the first
            if (i !== 0) segment = segment.replace(/^\//, "");
            // trim trailing slash of every segment except the last
            if (i !== segments.length - 1) segment = segment.replace(/\/$/, "");
            return segment;
          })
          .join("/"); // join each segment with slashes

      /**
       * function to wrap a cmis response object by creating a new object with
       * properties satisfying the used properties of the WebDAV object they are replacing
       */
      const wrapCmisResponseObject = (obj) => {
        const cmisProperties = obj.succinctProperties;

        return {
          _CMISObject: obj,
          DisplayName: cmisProperties["cmis:name"],
          ResourceType:
            cmisProperties["cmis:objectTypeId"] === "cmis:folder" ? "Folder" : "Resource",
          Href: urlPathJoin(["/alfresco/webdav", path, cmisProperties["cmis:name"]]),
        };
      };

      // build URL to CMIS API (points at item using its path)
      const cmisUrl = new URL(
        urlPathJoin(["/alfresco/api/-default-/public/cmis/versions/1.1/browser/root", path]),
        location.origin,
      );

      // Add configuration through parameters
      cmisUrl.searchParams.set("cmisselector", "children");
      cmisUrl.searchParams.set("succinct", "true");
      cmisUrl.searchParams.set("orderBy", "cmis:name");
      // cmis:objectTypeId is always returned
      cmisUrl.searchParams.set("filter", "cmis:name");

      const headers = {
        Authorization: "Basic " + btoa(Drupal.settings.ticket),
      };

      // initialize pagination variables
      const maxItems = options.maxBatchItems ?? 400;
      let skipCount = 0;

      /** Execute a request to get the children using the current pagination values */
      const doRequest = async () => {
        cmisUrl.searchParams.set("maxItems", String(maxItems));
        cmisUrl.searchParams.set("skipCount", String(skipCount));

        return await $.get({
          url: cmisUrl,
          headers,
        }).promise();
      };

      // Each request is done eagerly, started right after the last one gets a
      // response as long as there are items.
      let body;
      let request = doRequest();
      try {
        do {
          body = await request;

          if (body.hasMoreItems) {
            // go to next page/batch and start next request
            skipCount += maxItems;
            request = doRequest();
          }

          const childrenBatch = body.objects.map((o) => wrapCmisResponseObject(o.object));
          yield({ IsSuccess: true, Result: childrenBatch });
        } while (body.hasMoreItems);
      } catch {
        // we do not fill in the `Error` property because it is not used where this function is used.
        yield({ IsSuccess: false, Result: null });
      }
    },

    /**
     * Callback-based alternative to {@linkcode _getChildrenBatches}.
     * @param {string} path The path of the folder to get children of
     * @param {object} options The options for the operations. Supports all
     *  options of {@linkcode _getChildrenBatches}, and adds the following:
     * @param {(batch: {IsSuccess:boolean,Result:any[]}) => void} options.forEachBatch A callback executed for each batch of items.
     * @param {() => void} [options.onDone] A callback executed at the end after all batches were processed.
     * @param {number} [options.maxBatchItems] maximum number of item per batch (default: 400)
     */
    _getChildrenBatchesCallback: async function (path, options) {
      const { forEachBatch, onDone, ...otherOptions } = options;

      // async iteration on children batches
      for await (const batch of Gofast.ITHit._getChildrenBatches(path, otherOptions)) {
        forEachBatch(batch);
      }
      onDone?.();
    },

    /*
     * Called in zTree processing for each opened folder
     */
    _processTreePart: function (path, split, eventType) {
      Gofast.ITHit.Session.OpenFolderAsync(path, null,
        function (asyncResult) {

          if (!asyncResult.IsSuccess) {
            console.log("Error ITHit async (can't open folder)");
            return;
          }

          Gofast.ITHit._getChildrenBatchesCallback(path, {
            forEachBatch,
            onDone,
          });

          function forEachBatch(asyncResult) {

            if (!asyncResult.IsSuccess) {
              console.log("Error CMIS async (can't get children)");
              return;
            }

            var items = Gofast.ITHit.filterTechnicalFiles(asyncResult.Result);
            var nodes_to_add = []

            //Order nodes before processing them, regarding their names
            items.sort(function (a, b) {
              var comp_a = eval('a.DisplayName.toLowerCase()');
              var comp_b = eval('b.DisplayName.toLowerCase()');
              return (comp_a > comp_b) ? 1 : ((comp_b > comp_a) ? -1 : 0);
            });

            //Handle history for GoFAST Essential
            if (Gofast._settings.isEssential) {
              Gofast.ITHit._handleEssentialHistory(path, split, eventType, items);
            }
            //Unhide any hidden fileBrowser elements if they exist.
            if (Gofast._settings.isEssential && eventType === "click") {
              Gofast.Essential.unHideFileBrowserLayerChildren()
            }
            //Decode HTML entities
            path = decodeURIComponent(path);

            //Search where to put the elements in zTree
            var node_parent = Gofast.ITHit.tree ? Gofast.ITHit.tree.getNodeByParam("path", path) : null;

            //Prevent space to expand on click on Essential version
            if(!(split.length == 0 && eventType != "expand") || !Gofast._settings.isEssential){
              //Process items in zTree
              for (var i = 0; i < items.length; i++) {
                var item = items[i];
                //If it's not a folder, continue
                if (item.ResourceType !== "Folder") {
                  continue;
                }

                //Decode HTML entities
                item.Href = decodeURIComponent(item.Href);
                //Remove slash at the end if needed
                if (item.Href.substr(-1, 1) === "/") {
                  item.Href = item.Href.substring(0, item.Href.length - 1);
                }

                //Search if our wanted node exists
                if (Gofast.ITHit.tree && Gofast.ITHit.tree.getNodeByParam("path", item.Href) === null) {
                  //Need to add the node to the tree
                  var name = item.Href.split('/');
                  name = name.pop();

                var icon = ""
                //Get icon path
                if(Gofast._settings.isEssential){
                  icon = "ztreeEssential fas ztreeFa "
                } else {
                  icon = "fas ztreeFa "
                }
                if(name == "TEMPLATES"){
                  icon += "fa-folder templates"
                } else if (name == "Wikis") {
                  icon += "fa-folder wikis"
                } else if (name == "WEBFORM") {
                  icon += "fa-folder webform"
                } else if (name === BROADCAST_INBOX_FOLDER_NAME) {
                  icon += "fa-folder broadcast"
                } else {
                  icon += Gofast.ITHit._getIconPath(name, item.Href, "fa");
                }
                icon += " "

                  //Set open status to open or close, regarding the full path and the actual item path
                  if (path.indexOf(item.Href) !== -1) {
                    var open = true;
                  } else {
                    var open = false;
                  }

                  var type = item.ResourceType;

                  if (node_parent) {
                    //Push the node to the array
                    nodes_to_add.push({ id: Math.floor(Math.random() * 999999), pId: node_parent.id, name: name, open: open, path: item.Href, icon: "", iconSkin: icon, isParent: true, type: type });
                  }
                }
              }

              // set current items to be processed for further tree changes (e.g.: folder icon change due to mirroring)
              Gofast.ITHit._processTreeItems(items);
            }
            //Add nodes to the tree if needed
            if (nodes_to_add.length > 0 && node_parent) {
              Gofast.ITHit.tree.addNodes(node_parent, nodes_to_add)
              // Add drop events to new nodes
              Gofast.ITHit._processZTreeDropZones(path, eventType);
            }
          }

          function onDone() {
            //Iterate again if needed
            if (split.length > 0) {
              Gofast.ITHit._processTreePart(path + "/" + split.shift(), split, eventType);
            } else {

              //get all displayed nodes and init tooltip on spaces
              const treeNodeToTooltip = Gofast.ITHit.tree.getNodesByFilter(() => true);
              Gofast.ITHit.initTreeTooltip(treeNodeToTooltip);

              //All is done, we can select the item in the zTree if needed
              const currentPath = decodeURIComponent(Gofast.ITHit.currentPath);
              if (typeof Gofast.ITHit.tree.getSelectedNodes()[0] !== "object" || Gofast.ITHit.tree.getSelectedNodes()[0].path !== currentPath) {
                Gofast.ITHit.tree.selectNode(Gofast.ITHit.tree.getNodeByParam("path", currentPath));
                if (Gofast._settings.isEssential) {
                  $("#gofast_over_content").scrollTop(0)
                  $("#file_browser_full_tree_element").scrollLeft(0)
                }
              }
            }
          }
        }
      );
    },

    /*
     * Check the path and the name passed in params and return the corresponding icon path
     */
    _getIconPath: function (name, path, type) {
      if (type == "image") {
        if (name.substr(0, 1) === '_') { //This is a space
          //Now, we get the type of the space, regarding the path
          var pathSplit = path.split('/');
          var space = pathSplit[4];
          //Then, set the icon
          if (space === "_Groups") {
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/users.png";
          } else if (space === "_Organisations") {
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/sitemap.png";
          } else if (space === "_Extranet") {
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/globe.png";
          } else if (space === "_Public") {
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/share.png";
          } else {
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/home.png";
          }
        } else if (name == "TEMPLATES") { //This is a templates folder
          var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/folder_template.png";
        } else { //This is a folder
            var icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/folder.png";
        }
      }
      if (type == "fa") {
        if (name.substr(0, 1) === '_') { //This is a space
          //Now, we get the type of the space, regarding the path
          var pathSplit = path.split('/');
          var space = pathSplit[4];
          //Then, set the icon
          if (space === "_Groups") {
            var icon = "fa-users";
          } else if (space === "_Organisations") {
            var icon = "fa-sitemap";
          } else if (space === "_Extranet") {
            var icon = "fa-globe";
          } else if (space === "_Public") {
            var icon = "fa-share-alt";
          } else {
            var icon = "fa-home";
          }
        } else if (name === "TEMPLATES") {
          var icon = "TEMPLATE";
        } else{
            var icon = "fa-folder";
        }
      }
      return icon;
    },
    /**
     * Tells if an item is a technical file or folder created by Office or the OS, which Drupal never replicates
     * @param {ITHit.WebDAV.Client.HierarchyItem} item The item to check
     * @returns {boolean} TRUE when the item must stay out of the file browser
     */
    isTechnicalFile: function (item) {
      return TECHNICAL_FILE_PATTERNS.some(function (pattern) {
        return pattern.test(item.DisplayName);
      });
    },
    /**
     * Removes the technical files from a WebDAV item list
     * @param {ITHit.WebDAV.Client.HierarchyItem[]} items The items returned by GetChildrenAsync
     * @returns {ITHit.WebDAV.Client.HierarchyItem[]} The items that can be displayed
     */
    filterTechnicalFiles: function (items) {
      return items.filter(function (item) {
        return !Gofast.ITHit.isTechnicalFile(item);
      });
    },
    /*
     * Process items into the file browser when it's loaded
     * Called when navigation occurs
     */
    _processItems: function (items, fullPath) {
      if (Gofast.ITHit.processingItems) {
        //We are already processing items, wait for lock release
        setTimeout(function () {
          Gofast.ITHit._processItems(items, fullPath);
        }, 100);
        return;
      }
      Gofast.ITHit.progress.set(0.7);

      Gofast.ITHit.processingItems = true;
      var itemHTML = "";
      $(".file_browser_full_files_element").remove();

      //First, if we are not localized at the root path '/alfresco/webdav/Sites'

      //Get parent path from given path
      var path = fullPath;
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }
      path = path.split('/');
      path.pop();
      var name = decodeURIComponent(path.last());
      path = path.join('/');

      if(!Gofast._settings.isEssential){
      //Get the 'Back' button at the top of the list
        itemHTML += Gofast.ITHit._getBackButton(name);

        if (path !== "/alfresco/webdav") {
          //Add the item to the list
        var processedItem = $('#file_browser_full_files_table').find('tbody:last-child').append(itemHTML);
        processedItem = processedItem.find('tr').last();

          //Attach event handlers to the processed item

          Gofast.ITHit._attachEvents(null, processedItem, path);
        }
      }

      //Replace items last modified dates with last version date
      //Split folders and files
      var folders = items.filter(function (e) { return e.ResourceType === 'Folder'; });
      var resources = items.filter(function (e) { return e.ResourceType === 'Resource'; });

      Gofast.ITHit.currentFolders = folders;
      Gofast.ITHit.currentResources = resources;

      if (resources.length < 300 && folders.length < 300) {
        Gofast.ITHit._fetchFileBrowserExtraData(folders, resources, fullPath)
        .always(function (response) {
          Gofast.ITHit._processItemsAfterAsync(this.indexValue.folders, this.indexValue.resources, response);
          Gofast.ITHit.processingItems = false;
        });
      } else {
        Gofast.ITHit._processItemsAfterAsync(folders, resources, null);
        Gofast.ITHit.processingItems = false;
      }
    },
    /**
     * Fetches the necessary extra data needed by the file browser from Alfresco
     * @param {ITHit.WebDAV.Client.HierarchyItem[]} folders The folder ITHit WebDAV items
     * @param {ITHit.WebDAV.Client.HierarchyItem[]} resources The resource (files) ITHit WebDAV items
     * @param {string} fullPath The current full path
     * @returns A jQuery ajax request object
     */
    _fetchFileBrowserExtraData: function(folders, resources, fullPath = '/') {
      //Get the documents paths
      const Hrefs_files = resources.map(function (item) {
        return item.Href.replace("/alfresco/webdav/", "");
      });
      const Hrefs_folders = folders.map(function (item) {
        return item.Href.replace("/alfresco/webdav/", "");
      });

      //Send a request to Alfresco to map versionning dates
      return $.ajax({
        url:
          location.origin +
          "/alfresco/service/post/file_browser_extra_informations?alf_ticket=" +
          Drupal.settings.ticket,
        type: "POST",
        timeout: 3000,
        data: {
          files: JSON.stringify(Hrefs_files),
          folders: JSON.stringify(Hrefs_folders),
          current_folder: fullPath.replace("/alfresco/webdav/", ""),
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        indexValue: { folders: folders, resources: resources },
      });
    },
    /**
     * Resets Gofast.ITHit.mirrorFolders to its original value of an empty array.
     *
     * This function does not mutate the array instance of mirrorFolders,
     * which means that the value of mirrorFolders after calling this function is a new empty array.
     */
    _resetMirrorFolders: function() {
      Gofast.ITHit.mirrorFolders = [];
    },
    /**
     * Resets Gofast.ITHit.archiveFolders to its original value of an empty array.
     *
     * This function does not mutate the array instance of archiveFolders,
     * which means that the value of archiveFolders after calling this function is a new empty array.
     */
    _resetArchiveFolders: function() {
      Gofast.ITHit.archiveFolders = [];
    },
    /*
     * Process items into the file browser when it's loaded
     * Called when navigation occures
     */
    _processItemsAfterAsync: function (folders, resources, response) {
      Gofast.ITHit.progress.set(0.9);
      if (response !== null && typeof response !== "undefined" && typeof response.status === "undefined") {

        if (response.files && response.files.dates && response.files.dates.length > 0) {
          for (var j = 0; j < resources.length; j++) {
            if (response.files.dates[j]) {
              resources[j].LastModified = new Date(response.files.dates[j]);
            }
          }
        }

        if (response.files && response.files.permissions && response.files.permissions.length > 0) {
          for (var j = 0; j < resources.length; j++) {
            if (response.files.permissions[j]) {
              resources[j].Permission = response.files.permissions[j];
            }
          }
        }

        if (response.files && response.files.visibility && response.files.visibility.length > 0) {
          for (var j = 0; j < resources.length; j++) {
            if (response.files.visibility[j]) {
              resources[j].Visibility = response.files.visibility[j];
            }
          }
        }

        if (response.files && response.files.props && response.files.props.nids && response.files.visibility.length > 0) {
          for (var j = 0; j < resources.length; j++) {
            if (response.files.props.nids[j]) {
              resources[j].Nid = response.files.props.nids[j];
            }
          }
        }

        if (response.files && response.files.props && response.files.props.nids && response.files.visibility.length > 0) {
          for (var j = 0; j < resources.length; j++) {
            if (response.files.props.nodeRefs[j]) {
             resources[j].NodeRef = 'workspace://SpacesStore/'+response.files.props.nodeRefs[j];
            }
          }
        }

        if (response.folders && response.folders.permissions && response.folders.permissions.length > 0) {
          for (var j = 0; j < folders.length; j++) {
            if (response.folders.permissions[j]) {
              folders[j].Permission = response.folders.permissions[j];
            }
          }
        }

        if (response.folders && response.folders?.visibility?.length) {
          for (var j = 0; j < folders.length; j++) {
            if (response.folders.props.folderRefs[j]) {
              folders[j].NodeRef =  'workspace://SpacesStore/'+response.folders.props.folderRefs[j];
            }
          }
        }

        if (response.folders && response.folders?.visibility?.length) {
          for (var j = 0; j < folders.length; j++) {
            if (response.folders?.visibility[j]) {
              folders[j].Visibility = response.folders?.visibility[j];
            }
            // Keep mirror folders paths
            if(response.folders?.visibility[j] && response.folders?.visibility[j].length > 1){
              Gofast.ITHit.mirrorFolders =  Gofast.ITHit.mirrorFolders.concat(decodeURI(folders[j].Href));
            }
          }
        }

        if (response.folders && response.folders.properties) {
          for (var j = 0; j < folders.length; j++) {
            if(response.folders.properties[j]["gofast:isarchived"] == true) {
              Gofast.ITHit.archiveFolders = Gofast.ITHit.archiveFolders.concat(decodeURI(folders[j].Href));
            } 
          }
        }
      } else {
        for (var j = 0; j < folders.length; j++) {
          folders[j].Timeout = true;
        }

        for (var j = 0; j < resources.length; j++) {
          resources[j].Timeout = true;
        }
      }

      //Merge the arrays
      Gofast.ITHit.lastProcessedResources = resources;
      Gofast.ITHit.storeAllContentsEssential()
      var items = folders.concat(resources);

      //Sort items
      items = Gofast.ITHit.sort(items);

      for (var i = 0; i < items.length; i++) {
        //Format the item
        itemHTML = "";
        var item = items[i];
        var itemHTML = Gofast.ITHit._formatItem(item);

        //Add the item to the list
        var processedItem = $('#file_browser_full_files_table').find('tbody:last-child').append(itemHTML);
        processedItem = processedItem.find('tr').last();

        //Attach event handlers to the processed item
        Gofast.ITHit._attachEvents(item, processedItem);

        //Configure custom scrollbar to replace the legacy
        var waitForTableInterval = setInterval(async () => {
          if (!$("#file_browser_full_files_table").length) {
            return;
          }
          clearInterval(waitForTableInterval);
          $("#file_browser_full_files_table").mCustomScrollbar({
            axis: "y",
            theme: "dark-thin",
            callbacks: {
              onInit: function () {
                //Trigger the auto sizing of columns
                Gofast.ITHit.reset_full_browser_size();
              }
            },
          });
        }, 10);
      }

      //Trigger the auto sizing of columns
      Gofast.ITHit.reset_full_browser_size();

      //Make the folders dropable
      var folders = $(".file_browser_full_files_element").find('.item-real-type:contains("Folder")').parent();
      folders.attr('ondragover', "Gofast.ITHit.insideDragOver(event)");
      folders.attr('ondragleave', "Gofast.ITHit.insideDragLeave(event)");
      folders.attr('ondrop', "Gofast.ITHit.insideDrop(event)");
      folders.each(function (k, elem) {
        elem.addEventListener("drop", Gofast.ITHit.insideDrop);
      });
      Gofast.ITHit.progress.done();
      this.fullReady = true;
    },

    /**
     * Updates Icons in the tree view of folders that are mirrored/have multiple locations
     */
    _updateTreeMirrorIcons: function() {
      // mirror folders have not been loaded yet
      if(Gofast.ITHit.mirrorFolders == null) {
        return;
      }

      for (const folderPath of Gofast.ITHit.mirrorFolders) {
        const treeNode = Gofast.ITHit.tree.getNodeByParam(
          "path",
          // nodes in the zTree object do not have the trailing slash in their path,
          // remove it if present
          folderPath.replace(/\/$/, ""),
        );

        // node for mirrored folder did not load yet, ignore it.
        if (treeNode == null) continue;

        treeNode.iconSkin = treeNode.iconSkin.replace(/\bfa-folder\b/, "fa-folders");

        Gofast.ITHit.tree.updateNode(treeNode, false);
      }
    },

    /**
     * Updates Icons in the tree view of folders that are archived/have multiple locations
     */
    _updateTreeArchiveIcons: function() {
      // archive folders have not been loaded yet
      if(Gofast.ITHit.archiveFolders == null) {
        return;
      }

      for (const folderPath of Gofast.ITHit.archiveFolders) {
        const treeNode = Gofast.ITHit.tree.getNodeByParam(
          "path",
          // nodes in the zTree object do not have the trailing slash in their path,
          // remove it if present
          folderPath.replace(/\/$/, ""),
        );

        // node for archived folder did not load yet, ignore it.
        if (treeNode == null) continue;

        treeNode.iconSkin = treeNode.iconSkin.replace(/fa-[a-z0-9]+/, "fa-archive");

        Gofast.ITHit.tree.updateNode(treeNode, false);
      }
    },

    /**
     * Function to process WebDAV items that may need to change the tree view when loaded
     * @param {ITHit.WebDAV.Client.HierarchyItem[]} items The ITHit WebDAV items to process
     */
    _processTreeItems: (() => {
      // initial debounce state
      /**
       * @type {ITHit.WebDAV.Client.HierarchyItem[]} A WebDAV item queue. Calls to _processTreeItems in
       * quick succession add their items to this queue. This queue is emptied
       * (replaced by a new array) when the debounced implementation is called
       */
      let queue = [];

      /**
       * @type {number|null} The timeout ID of the planned task executing the
       * debounced implementation. This is set to null when no task has been
       * queued. This is used to cancel a previously queued task when
       * _processTreeItems is called again before the task executed.
       */
      let timeoutId = null;

      return function (items) {
        // how long to wait without being called to execute the implementation code
        const debounceDuration = 200; /*ms*/

        // Add all given items to queue of items to process
        queue = [...queue, ...items];

        // if was called less than debounceDuration milliseconds ago, cancel planned execution
        if (timeoutId != null) {
          clearTimeout(timeoutId);
        }

        // plan execution in debounceDuration milliseconds
        timeoutId = setTimeout(() => {
          // reset function bounce state
          timeoutId = null;
          const items = queue;
          queue = [];
          // call implementation
          Gofast.ITHit._processTreeItemsDebounced(items);
        }, debounceDuration);
      };
    })(),

    /**
     * Implementation of logic for _processTreeItems
     *
     * This function is called in a debounced way by _processTreeItems to reduce
     * the number of requests to Alfresco's API.
     * @param {ITHit.WebDAV.Client.HierarchyItem[]} items The ITHit WebDAV items to process
     */
    _processTreeItemsDebounced: function(items) {
      // group items by resource type
      const folders = [];
      const resources = [];

      for (const i of items) {
        if (i.ResourceType === "Folder") {
          folders.push(i);
        } else {
          resources.push(i);
        }
      }

      Gofast.ITHit._fetchFileBrowserExtraData(folders, resources, GFITHit.currentPath).always(function (
        response,
      ) {
        this.indexValue.folders.forEach((folder, i) => {
          // is folder mirrored ? add to mirrored folders list
          if (response.folders && response.folders?.visibility[i]?.length > 1) {
            Gofast.ITHit.mirrorFolders.push(decodeURI(folder.Href));
          }
          // is folder archived ? add to archived folders list
          if (response.folders && response.folders?.properties[i]["gofast:isarchived"] == true) {
            Gofast.ITHit.archiveFolders.push(decodeURI(folder.Href));
          }
        });

        Gofast.ITHit._updateTreeMirrorIcons();
        Gofast.ITHit._updateTreeArchiveIcons();
        GFITHit._handleArchiveSpaceUpdatesOnNavigation(response.current_folder);
      });
    },

    /*
     *
     * Handle the history select2 component when navigating in GoFAST Essential
     * TODO @TCH : Comment all this code / Review with @JLE
     *
    */
    _handleEssentialHistory: function(path, split, eventType, items){
      let targetDrupalPath = path.replace("/alfresco/webdav", "");
      let searchQueryString = Gofast.ITHit.buildSearchQueryStringWithPath(targetDrupalPath);
      // Change the value of the select and add new option with last path
      if (split.length == 0 && eventType != "expand") {
        var hash = location.hash
        //Check if the hash is for filebrowser tabs or if it is empty to set a default value
        if((hash != "#ogdocuments"
        && hash != "#oghome"
        && hash != "#ogcalendar"
        && hash != "#ogkanban"
        && hash != "#ogconversation"
        && hash != "#gofastSpaceMembers") || hash == ""){
          hash = "#ogdocuments"
        }
        if(eventType == "click" && $("#fileBrowserLayer").hasClass("d-none")){
          $.get(location.origin+"/ajax/getnidfromhref?href="+path).done((nid) => {

            if($("#activityFeedLayer").length){
              $('#activityFeedLayer').remove()
            }
            if($("#searchPageLayer").length){
              $('#searchPageLayer').remove()
              /**
               * Checks if the file browser layer is not already processed and the "fileBrowserLayerContainer" is not present.
               * If the conditions are met, the following actions are performed:
               *
               * 1. Adds the class "processed" to the "#fileBrowserLayer" and prepends the fetched fileBrowserContent to it.
               * 2. Removes the "d-none" class from the "#essentialFileBrowserHistory" element, making it visible.
               * 3. Unhide any file browser elements if present
               * 4. Reloads the file browser using Gofast.ITHit.reload().
               *
               * This block ensures the file browser content is fetched and added to the DOM, updating the file browser layer.
               * The class "processed" serves as a marker to prevent redundant content fetching on subsequent calls.
               *
               * NB: This block to not show multiple layers at the same time after removing the search layer.
               */
              if(!$('#fileBrowserLayer').hasClass('processed') && !$('.fileBrowserLayerContainer').length){
                Gofast.Essential.getFileBrowserContent().then((fileBrowserContent) => {
                  $('#fileBrowserLayer').addClass('processed').prepend(fileBrowserContent)
                  $('#essentialFileBrowserHistory').removeClass('d-none')
                  Gofast.Essential.unHideFileBrowserLayerChildren()
                  Gofast.ITHit.reload()
                });
              }
            }
            if($("#wikiPageLayer").length){
              $("#wikiPageLayer").remove()
            }

            if($("#forumPageLayer").length){
              $(".gofastHighlightedForum").removeClass("gofastHighlightedForum bg-primary text-white rounded");
              $("#forumPageLayer").remove()
            }

            $('#fileBrowserLayer').removeClass('d-none').addClass('d-flex')

            Gofast.ITHit.reset_full_browser_size()

            $('.essentialHeader a.btn-clean').removeClass('selected')
              if($('#topbarNavFileBrowserButton').length > 0){
                  $('#topbarNavFileBrowserButton').addClass('selected')
              }
          })
        }

        if($('#activityFeedLayer').length > 0 && !location.pathname.startsWith("/activity")){
          $('#activityFeedLayer').remove()
          $('#fileBrowserLayer').removeClass('d-none').addClass('d-flex')
          Gofast.Essential.unHideFileBrowserLayerChildren()

          $('.essentialHeader a.btn-clean').removeClass('selected')
            if($('#topbarNavFileBrowserButton').length > 0){
                $('#topbarNavFileBrowserButton').addClass('selected')
            }
        }

        if((Gofast._settings.isEssential && !window.location.pathname.startsWith("/search/solr") && !window.location.pathname.startsWith("/activity") && (window.location.search != "" || $(".GofastNode").length == 0))){
          if(Gofast.get("node") != undefined){
            if(!(Gofast.get("node").type == "article" || Gofast.get("node").type == "forum")){
              if(Gofast.get("node").type == "alfresco_item"){
                let targetPathname = "/node/" + Gofast.get("node").id
                if(window.location.pathname == targetPathname){
                  history.replaceState({}, "", targetPathname + searchQueryString + hash);
                } else {
                  history.pushState({}, "", targetPathname + searchQueryString + hash);
                }
              } else {
                let pathArray = path.split("/");
                //if navigate to folder, change url to parent space nid
                if(pathArray[pathArray.length-1].startsWith("_")){
                  $.get(location.origin+"/ajax/getnidfromhref?href="+path).done((nid) => {
                    let currentPathWithParams = window.location.pathname+window.location.search+window.location.hash;
                    let targetPathWithParams = "/node/" + nid + searchQueryString + hash;
                    if (currentPathWithParams != targetPathWithParams) {
                      history.pushState({}, "", targetPathWithParams);
                    }
                    Gofast.ITHit.reset_full_browser_size()
                  })
                } else {

                  //change to documents tab when navigating on folders
                  if(hash != "#ogdocuments" && $("#ogtab_documents").length){
                    $("#ogtab_documents").click()
                  }
                  let isFolder = false
                  let pathArrayReverse = path.split("/").reverse()
                  //iterate until the first space parent is find
                  pathArrayReverse.forEach((e,i)=>{
                    if(isFolder){
                      return;
                    }
                    //if the node is a space, stop the loop and change the url
                    if(e.startsWith("_")){
                      isFolder = true;
                      let parentSpace = path.slice(0,path.indexOf(pathArray[pathArray.length-i]))
                      $.get(location.origin+"/ajax/getnidfromhref?href="+parentSpace).done((nid)=>{
                        if(nid != ""){
                          history.pushState({}, "", "/node/" + nid + searchQueryString + hash)
                          Gofast.ITHit.reset_full_browser_size()
                        }
                      });
                    }
                  })
                }
              }
            }
          }
        }
        let pathTab = path.split('/')
        let usedPath = path
        if (pathTab[pathTab.length - 1].substring(0, 1) != "_") {
          usedPath = usedPath.slice(0, -(pathTab[pathTab.length - 1].length + 1))
        }
        var needProcess = []
        $('#gofastBrowserContentPanel > .tab-pane').each((i, el) => {
          let tabContent = $(el)
          if (!tabContent.hasClass("processed")) {
            tabContent.addClass("processed");
            needProcess[tabContent.attr("id")] = true;
          } else {
            needProcess[tabContent.attr("id")] = false;
          }
        })
        //Get content of tab and change tabContent value
        const loadTab = function (tabContent, nid) {
          $.get('/essential/get_node_content_part/' + tabContent.attr('id') + '/' + nid).done((result) => {
            tabContent.html(result)
            if (tabContent.attr('id') == "oghome" && location.hash == "#oghome") {
              $("#oghome").load("/gofast_og/home_async/" + nid, function (response, status, xhr) {
                if (status == "success") {
                  Drupal.attachBehaviors();
                }
              });
            }
            Drupal.attachBehaviors();
            if(tabContent.attr("id") == "ogcalendar") {
              if(Gofast.calendar != undefined) {
                Gofast.calendar.initCalendar()
              }
            }
            if (tabContent.attr('id') == "gofastSpaceMembers" && location.hash == "#gofastSpaceMembers") {
              $('#gofastSpaceMembersLink').trigger('shown.bs.tab')
            }
          })
        }
        //Get old nid with data attributes stored in the tabContent. Must be called before loadTab
        const getTabContentOldNid = function (tabContent) {
          let oldNid = 0
          let tabName = tabContent.attr("id")
          if (tabName == "oghome") {
            oldNid = $("#gofastHomePage").attr("data-gid")
          }
          if (tabName == "ogcalendar") {
            oldNid = $("#kt_calendar").attr("data-gid")
          }
          if (tabName == "ogkanban") {
            oldNid = $("#gofastKanban").attr("data-gid")
          }
          if (tabName == "gofastSpaceMembers") {
            oldNid = $("#gofastSpaceMembersTable").attr("data-gid")
          }
          if (tabName == "ogconversation") {
            oldNid = $("#gf_conversation").attr("data-gid")
          }
          return oldNid
        }
        //Initialize the click event on the tabs to load them only on click
        const initFileBrowserTabsEventHandlers = function (nid) {
          $('#gofastBrowserContentPanel > .tab-pane').each((i, el) => {
            let tabContent = $(el)
            let navTab = $('[aria-controls=' + tabContent.attr('id') + ']')

            navTab.removeClass('processedTab');
            //Event triggered when clicking on a file browser tab
            let clickEvent = async function () {
              if (!navTab.hasClass('processedTab')) {
                navTab.addClass('processedTab');
                history.pushState({}, "", window.location.origin + window.location.pathname + window.location.search + "#" + tabContent.attr("id"));
                if (location.hash && tabContent.attr('id') !== "ogdocuments") {
                  let tabContent = $(`#gofastBrowserContentPanel ${location.hash}`);
                  if(tabContent.length){
                    let oldNid = getTabContentOldNid(tabContent);
                    if (nid != oldNid) {
                      tabContent.html("")
                      loadTab(tabContent, nid)
                    }
                  }
                }
              }
          }
          //Remove and add a new click event to update the nid
            navTab.off("click")
            navTab.on("click", this, clickEvent);
          })
        }

        var currentSpacePath = Gofast.get("space");
        if (currentSpacePath) {
          $.get(location.origin + "/ajax/getnidfromhref?href=" + Gofast.ITHit.getSpacePath(currentSpacePath)).done((nid) => {
            let isRootFolder = false;
            if (pathTab[pathTab.length - 2] == "Sites" && pathTab[pathTab.length - 1].substring(0, 1) != "_") {
              isRootFolder = true;
            }
            if (!nid && !isRootFolder) {
              return;
            }
            Gofast.ITHit.disableFileBrowserTabs(nid, isRootFolder)
            //When navigating, reload actual tab if the nid is changed
            if (location.hash && location.hash != "#ogdocuments") {
              let tabContent = $(`#gofastBrowserContentPanel ${location.hash}`);
              if(tabContent.length){
                let oldNid = getTabContentOldNid(tabContent);
                if (nid != oldNid) {
                  loadTab(tabContent, nid, oldNid)
                }
              }
            }
            initFileBrowserTabsEventHandlers(nid)
          })
        }

        //Maximum number of path show in the select
        var maxHistoryItem = 5;
        if(window.sessionStorage.getItem('browserHistoryOptions_'+Gofast.get('user').uid) != null && (eventType == "load" || eventType == "backgroundNavigation") && $("#fileBrowserSelect > option").length == 1){

              let options = (window.sessionStorage.getItem('browserHistoryOptions_'+Gofast.get('user').uid)).split(':')

              options = options.reverse()

              options.forEach((path)=>{

            $('#fileBrowserSelect > option[value=""]').after(new Option(path, "/alfresco/webdav/Sites"+path))
          })
        }
            if(path == "/alfresco/webdav/Sites/"){ // Prevent adding empty path to the history bar
              return;
            }
            var index = path.split("/", 4).join("/").length;
            var selectPath = index == -1 ? "" : path.substring(index)
            selectPath = decodeURIComponent(selectPath);
            $('#fileBrowserSelect').children().first().html(selectPath)
            $('#fileBrowserSelect').children().first().data('path', selectPath)

            //Add new option for the last path
            if(window.sessionStorage.getItem("browserHistory_"+Gofast.get("user").uid) != null && eventType != "expand" && window.sessionStorage.getItem("browserHistory_"+Gofast.get('user').uid) != selectPath && eventType != "load") {
              $('#fileBrowserSelect > option[value=""]').after(new Option(window.sessionStorage.getItem("browserHistory_"+Gofast.get('user').uid), window.sessionStorage.getItem("browserHistoryFullPath_"+Gofast.get('user').uid)))
            }

            //check if the actual path is already in the history prevent adding it to the list
            $('#fileBrowserSelect').children().each((i,opt)=>{
              if(i != 0){
                if(opt.innerText == $('#fileBrowserSelect').children().first().data('path')){
                  opt.remove()
                }
              }
            })


            if($('#fileBrowserSelect').children().length >= maxHistoryItem+2){
              $('#fileBrowserSelect').children().last().remove()
            }

            $("#fileBrowserSelect").select2({
              minimumResultsForSearch: Infinity,
              width: 'resolve',
              dropdownCssClass: "dropdownEssentialHistory"
          });

          var navigationIndex = 0
          var navigationList = ""

          if(window.sessionStorage.getItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid)){
            navigationIndex = parseInt(window.sessionStorage.getItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid))
          }
          if(window.sessionStorage.getItem("browserFullNavigationHistory_"+Gofast.get('user').uid)){
            navigationList = window.sessionStorage.getItem("browserFullNavigationHistory_"+Gofast.get('user').uid)
          }

            var newNavigationList = navigationList.split(':')
            if(eventType == 'click'){
              if(navigationIndex+1 < newNavigationList.length){
                navigationList = newNavigationList.slice(0,navigationIndex+1).join(":")
              }
            }

            if(eventType != 'back' && eventType != 'next' && window.sessionStorage.getItem("browserHistory_"+Gofast.get('user').uid) != selectPath){

              if(window.sessionStorage.getItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid) && eventType != "load"){
                window.sessionStorage.setItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid, navigationIndex+1)

              } else {
                window.sessionStorage.setItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid, 0)
              }

              if(window.sessionStorage.getItem("browserFullNavigationHistory_"+Gofast.get('user').uid) && eventType != "load"){

                window.sessionStorage.setItem("browserFullNavigationHistory_"+Gofast.get('user').uid, navigationList+':'+path)
              } else {
                window.sessionStorage.setItem("browserFullNavigationHistory_"+Gofast.get('user').uid, path)
              }
            }

          window.sessionStorage.setItem("browserHistory_"+Gofast.get('user').uid, selectPath)
          window.sessionStorage.setItem("browserHistoryFullPath_"+Gofast.get('user').uid, path)

            let allOptions = ""
            $('#fileBrowserSelect').children().each((i,opt)=>{
              if(i != 0){

                if(i == $('#fileBrowserSelect').children().length-1){

                  allOptions += opt.innerText

                } else {

                  allOptions += opt.innerText+":"

                }
              }
              })
            if(allOptions != ""){
              window.sessionStorage.setItem("browserHistoryOptions_"+Gofast.get('user').uid, window.sessionStorage.getItem("browserHistory_"+Gofast.get('user').uid)+":"+allOptions)

            }
          }
    },
    //Disable unaccessible tab on given space
    disableFileBrowserTabs: function(nid, isRootFolder = false){
      if(nid == ""){
        nid = null
      }
      //Return list of tabs that need to be disabled
      $.post("/ajax_file_browser/get_disabled_tabs/"+nid, {isRootFolder: isRootFolder}).done(result => {
        let hideDropdownLinks = result.hidden_dropdown_links;
        //We unhide all dropdown links
        $("#gofastBrowserNavTabs .dropdown-item").removeClass("d-none");
        //And then hide only those we need to hide in the current context
        for (const dropdownLinkId of hideDropdownLinks) {
          $("#gofastBrowserNavTabs .dropdown-item#" + dropdownLinkId).addClass("d-none");
        }
        let disableTab = Object.keys(result.disabled_tabs)
        let tabsContent = $('#gofastBrowserContentPanel > .tab-pane')
        tabsContent.each((i, el) => {
          let tab = $(el)
          let navTab = $('[aria-controls='+tab.attr('id')+']')
          let tab_members_hover = ""
          if(disableTab.some(name => tab.attr("id").includes(name))){
            //If user was on tab that is now disabled, go to "Documents" tab
            if(disableTab.some(name => location.hash.includes(name))){
              $('#ogtab_documents').click()
              setTimeout(()=>{
                Gofast.ITHit.reset_full_browser_size()
              },200)
            }
            tab_members_hover = result.disabled_tabs[tab.attr("id")]
            navTab.parent().addClass('disabled')
            navTab.addClass('disabled')
          } else {
            if(navTab.attr('id') == "tab_ogmembers_disabled"){
              navTab.attr('id',"gofastSpaceMembersLink")
              navTab.css('pointer-events', '')
            }
            navTab.parent().removeClass('disabled')
            navTab.removeClass('disabled')
          }

          $("#"+navTab.attr("id")).parent().attr("data-animation", "true")
            .attr("data-triggger", "hover")
            .attr("data-placement", "top")
            .attr("data-boundary", "window")

          $("#"+navTab.attr("id")).parent().tooltip().attr("data-original-title", tab_members_hover)
        })
        // tab autoclick must occur after the disabled tabs have been toggled
        const excludedHashes = ["#users_stats", "#documents_stats", "#ogaudit"];
        if (!excludedHashes.includes(location.hash)) {
          $("#gofastBrowserNavTabs a[href="+location.hash+"]").click();
        }
        $(document).trigger("refresh-breadcrumb");
      })
    },
    storeAllContentsEssential: function() {
      var allContents = ""
      var allContentsObj = {}
      var items = Gofast.ITHit.sort(Gofast.ITHit.lastProcessedResources);
      items.forEach((e,i) => {
        let nid = e.Nid;
        if (!nid) {
          allContentsObj[e.Href] = null
          return;
        }
        allContentsObj[e.Href] = nid
      })
      let allContentsArray = Object.entries(allContentsObj);
      allContentsObj = Object.fromEntries(allContentsArray);
      allContents = JSON.stringify(allContentsObj)
      window.sessionStorage.setItem("allContents"+Gofast.get('user').uid, allContents)
    },
    /*
     * Returns the space path of a node with its href
     */
    getSpacePath: function(href){
      var pathArray = href.split("/");
        if(pathArray[pathArray.length-1].startsWith("_")){
          return href;
        }
        var pathArrayReverse = href.split("/").reverse()
        var parentSpace
        var isFolder = false;
        //iterate until the first space parent is find
        pathArrayReverse.forEach((e,i)=>{
          if(isFolder){
            return;
          }
          //if the node is a space, stop the loop and go to this space node
          if(e.startsWith("_")){
            isFolder = true;
            parentSpace = href.slice(0,href.indexOf("/"+pathArray[pathArray.length-i]))
          }
        })
        return parentSpace;
     },
    /*
     * Sort items
     */
    sort: function (items, forceName) {
      //Split folders and files
      var folders = items.filter(function (e) { return e.ResourceType === 'Folder'; });
      var resources = items.filter(function (e) { return e.ResourceType === 'Resource'; });

      //Process the sort
      if (Gofast.ITHit.sortOrder === 'asc' || forceName) {
        folders.sort(function (a, b) {
          if (forceName) {
            var comp_a = eval('a.DisplayName.toLowerCase()');
            var comp_b = eval('b.DisplayName.toLowerCase()');
          }
          else if (Gofast.ITHit.sortType === 'type') {
            var comp_a = Gofast.ITHit._getTypeFromRessourceType(a.DisplayName, a.Href, a.ResourceType);
            var comp_b = Gofast.ITHit._getTypeFromRessourceType(b.DisplayName, b.Href, b.ResourceType);
          } else {
            var comp_a = eval('a.' + Gofast.ITHit.sortType);
            var comp_b = eval('b.' + Gofast.ITHit.sortType);
          }
          return (comp_a > comp_b) ? 1 : ((comp_b > comp_a) ? -1 : 0);
        });
        resources.sort(function (a, b) {
          if (forceName) {
            var comp_a = eval('a.DisplayName.toLowerCase()');
            var comp_b = eval('b.DisplayName.toLowerCase()');
          }
          else if (Gofast.ITHit.sortType === 'type') {
            var comp_a = Gofast.ITHit._getTypeFromRessourceType(a.DisplayName, a.Href, a.ResourceType);
            var comp_b = Gofast.ITHit._getTypeFromRessourceType(b.DisplayName, b.Href, b.ResourceType);
          } else {
            var comp_a = eval('a.' + Gofast.ITHit.sortType);
            var comp_b = eval('b.' + Gofast.ITHit.sortType);
          }
          return (comp_a > comp_b) ? 1 : ((comp_b > comp_a) ? -1 : 0);
        });
      } else {
        folders.sort(function (a, b) {
          if (forceName) {
            var comp_a = eval('a.DisplayName.toLowerCase()');
            var comp_b = eval('b.DisplayName.toLowerCase()');
          }
          else if (Gofast.ITHit.sortType === 'type') {
            var comp_a = Gofast.ITHit._getTypeFromRessourceType(a.DisplayName, a.Href, a.ResourceType);
            var comp_b = Gofast.ITHit._getTypeFromRessourceType(b.DisplayName, b.Href, b.ResourceType);
          } else {
            var comp_a = eval('a.' + Gofast.ITHit.sortType);
            var comp_b = eval('b.' + Gofast.ITHit.sortType);
          }
          return (comp_a < comp_b) ? 1 : ((comp_b < comp_a) ? -1 : 0);
        });
        resources.sort(function (a, b) {
          if (forceName) {
            var comp_a = eval('a.DisplayName.toLowerCase()');
            var comp_b = eval('b.DisplayName.toLowerCase()');
          }
          else if (Gofast.ITHit.sortType === 'type') {
            var comp_a = Gofast.ITHit._getTypeFromRessourceType(a.DisplayName, a.Href, a.ResourceType);
            var comp_b = Gofast.ITHit._getTypeFromRessourceType(b.DisplayName, b.Href, b.ResourceType);
          } else {
            var comp_a = eval('a.' + Gofast.ITHit.sortType);
            var comp_b = eval('b.' + Gofast.ITHit.sortType);
          }
          return (comp_a < comp_b) ? 1 : ((comp_b < comp_a) ? -1 : 0);
        });
      }

      //Merge the arrays
      items = folders.concat(resources);

      return items;
    },
    /*
     * Return HTML formatted back button
     */
    _getBackButton: function (name) {
      var itemHTML = "";

      itemHTML += "<tr id='file_browser_back_button' class='file_browser_full_files_element' style='width:100%; display: inline-block;'>";
      //Icon
      itemHTML += "<td style='width:10%;'>";
      itemHTML += "<span class='fa fa-arrow-left' style='color:#3498db'></span>";
      itemHTML += "</td>";

      //Name
      itemHTML += "<td style='width:35%;'>";
      itemHTML += Drupal.t("Back to ", {}, { context: "gofast:ajax_file_browser" }) + name;
      itemHTML += "</td>";

      //Size
      itemHTML += "<td style='width:15%;'>";
      itemHTML += "</td>";

      //Type
      itemHTML += "<td style='width:15%;'>";
      itemHTML += "</td>";

      //Modification date
      itemHTML += "<td style='width:15%;'>";
      itemHTML += "</td>";

      //Infos
      itemHTML += "<td style='width:10%;'>";
      itemHTML += "</td>";
      itemHTML += "</tr>";

      return itemHTML;
    },
    /*
     * Get an Item and return the corresponding HTML
     * Called when items are processed
     */
    _formatItem: function (item) {
      var itemHTML = "";
      var HTMLClass = "";
      var trStyle = "";
      var float = 0;
      var tdIconSize = "";
      var tdNameSize = "";

      //Display type is icons
      if (Gofast.ITHit.display === 'icons') {
        HTMLClass = 'display-icons';
        trStyle = 'width:25%;height: 155px;';
        tdIconSize = "100%;text-align: center;font-size:80px;";
        tdNameSize = "100%;text-align: center;height:40px;white-space: normal;";
        if (float < 4) {
          trStyle += "float: left;";
          float++;
        } else {
          float = 0;
        }
      } else { //Display type is details
        trStyle = 'width:100%;';
        tdIconSize = "5%;";
        tdNameSize = "35%;";
      }

      if(item.ResourceType == "Folder" && typeof item.Visibility != 'undefined' && item.Visibility.length > 1){
        itemHTML += "<tr draggable='false' class='file_browser_full_files_element " + HTMLClass + "' style='" + trStyle + " display: block;white-space: nowrap;'>";
      }else{
        itemHTML += "<tr draggable='true' ondragstart='Gofast.ITHit.moveDragStart(event)' class='file_browser_full_files_element " + HTMLClass + "' style='" + trStyle + " display: block;white-space: nowrap;'>";
      }

      //checkbox to select multiple
      itemHTML += "<td style='width:5%' class='pl-0'><input id='cbxSelect' class='gfb-cbx' type='checkbox'></td>"
      //Icon
      itemHTML += "<td title='" + item.DisplayName + "' style='width:" + tdIconSize + "; height:75px;' class='item-icon'>";
      if (item.ResourceType == "Folder") { //It's a folder
        var icon = Gofast.ITHit._getIconPath(item.DisplayName, item.Href, "fa");
        var color = "#3498db";
        if (icon === "TEMPLATE") {
          icon = "fa-folder";
          color = "#F0685A";
        } else if (item.DisplayName === "Wikis") {
          color = "#20c997";
        } else if(item.DisplayName === "WEBFORM") {
          color = "brown";
        } else if (item.DisplayName === BROADCAST_INBOX_FOLDER_NAME) {
          color = "var(--gf-folder-broadcast-color)";
        }
        itemHTML += "<span class='n-color fas " + icon + "' style='color:" + color + "'></span>";
        //Get extension
        var ext = item.DisplayName.split('.').pop().toLowerCase();
        //toLowerCase extension GOFAST-4662
        //Get font
        var font = Drupal.settings.ext_map[ext];
      } else { //It's a document, use mapping to find the proper icon
        //Get extension
        var ext = item.DisplayName.split('.').pop().toLowerCase();
        //toLowerCase extension GOFAST-4662
        //Get font
        var font = Drupal.settings.ext_map[ext];
          //Get type
          var typeForArticle = Gofast.ITHit._getTypeFromRessourceType(item.DisplayName, item.Href, item.ResourceType, item.ContentType);
          if(typeForArticle === 'Article') { //Article icon
              itemHTML += "<span class='far fa-ballot'></span>";
          }else if(typeof font !== "undefined"){ //Known
              if(font === "fa-file-image-o" && Gofast.ITHit.display == "icons"){
                  //Load image
                  itemHTML += "<img height=\"75px\" src='" + location.origin + item.Href + "' />";
              }else{
                  itemHTML += "<span class='fa " + font + "'></span>";
              }
          }else { //Unknown
               itemHTML += "<span class='fa fa-file-o file-other'></span>";
         }
      }

      if (typeof item.ActiveLocks !== "undefined" && item.ActiveLocks.length !== 0) {
        if (Gofast.ITHit.display === 'icons') {
          itemHTML += "<span class='fa fa-lock' style='color:red;font-size: 0.3em;float: right;position: relative;margin-left: -13px;top: 54px;left: -40px;'></span>";
        } else {
          itemHTML += "<span class='fa fa-lock' style='color:red;font-size: 0.7em;float: right;position: relative;top: -9px;'></span>";
        }
      }
      itemHTML += "</td>";

      //Name
      itemHTML += "<td class='item-name' title='" + item.DisplayName + "' style='width:" + tdNameSize + "'>";
      itemHTML += decodeURIComponent(encodeURIComponent(item.DisplayName)); // display name is sometimes "half encoded", so we must finish the encoding before decoding
      itemHTML += "</td>";

      //Size
      itemHTML += "<td class='item-size' style='width:15%;'>";
      if (typeof item.ContentLength !== "undefined" && item.ContentLength !== 0) {
        itemHTML += Gofast.ITHit._octetToString(item.ContentLength);
      }
      itemHTML += "</td>";

      //Type
      itemHTML += "<td class='item-type' style='width:15%;'>";
        let normalHTML = Gofast.ITHit._getTypeFromRessourceType(item.DisplayName, item.Href, item.ResourceType, item.ContentType);
        itemHTML += (normalHTML == "Article") ? Drupal.t('Web Page', {}, {context: 'gofast:ajax_file_browser'}) : normalHTML;
      itemHTML += "</td>";

      //Type
      itemHTML += "<td class='item-real-type' style='display:none;'>";
      itemHTML += item.ResourceType;
      itemHTML += "</td>";

      //Modification date 
      itemHTML += "<td class='item-date' style='width:15%;'>";
      if (typeof item.LastModified !== "undefined") {
        var date = new Date(item.LastModified);
        var timeZone = Gofast.get('user').timezone;
        // Set the default platform timezone if the user do not have one.
        if (!timeZone) {
          timeZone = Drupal.settings.timezone;
        }

        // Format date in ISO format with the correct timezone
        var formatter = new Intl.DateTimeFormat('en-CA', { 
          timeZone: timeZone,
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        // Get ISO formatted date string
        var isoDate = formatter.format(date); // Returns YYYY-MM-DD HH:mm:ss

        // Format with moment using the known ISO format
        const format = GofastConvertDrupalDatePattern("moment", Drupal.settings.date_format_short, false);
        const displayedDate = moment(isoDate, "YYYY-MM-DD HH:mm:ss").format(format);
        itemHTML += displayedDate;
      }
      itemHTML += "</td>";

      //Prepare the info header
      itemHTML += "<td class='item-info' style='width:10%;'>";
      if (!item.Timeout) {
        itemHTML += Gofast.ITHit._formatInfo(item.Permission, item.Visibility, item.ResourceType);
        // Change mirroring icon
        if(Gofast.ITHit._isPathMirrored(decodeURI(item.Href))){
          // Replace old icon by the new one
          itemHTML = itemHTML.replace(icon, "fa-folders");
        }
        if(Gofast.ITHit._isPathArchived(decodeURI(item.Href))){
          // Replace old icon by the new one
          itemHTML = itemHTML.replace(icon, "fa-archive");
          // Make icon display with gray color
          itemHTML = itemHTML.replace("n-color", "");
        }

      } else {
        var title = Drupal.t("Unable to retrieve the informations because there are to many elements or the request took too long", {}, { context: "gofast:gofast_ajax_file_browser" });
        itemHTML += "<i title=\"" + title + "\" class='fa fa-question' style='margin-right: 3px; color: #777;'></i>";
      }
      itemHTML += "</td>";

      //Stock the path to the item
      itemHTML += "<td class='item-path' data-path='" + item.Href.toLowerCase() + "' style='display:none;'>";
      itemHTML += item.Href;
      itemHTML += "</td>";

      //NodeRef - The alfresco node reference of the reource.
      itemHTML += "<td class='item-nodeRef' style='display:none;'>";
      itemHTML += item.NodeRef;
      itemHTML += "</td>";

      //Store the nid of the item
      if(item.Nid != undefined){
        itemHTML += "<td class='item-nid' style='display:none;'>";
        itemHTML += item.Nid;
        itemHTML += "</td>";
      }

      itemHTML += "</tr>";
      return itemHTML;
    },

    /**
     * Checks if a single path is a mirrored folder path.
     * @param {string} path - href of the item to check if it is mirrored
     * @returns {boolean} true if path is a mirrored folder, false otherwise.
     *  Will also return false when the mirroredFolders property has not been loaded yet
     */
    _isPathMirrored: (path) => {
      /** @type {number|null} */
      const pathIndex = Gofast.ITHit.mirrorFolders?.indexOf(path);
      return null != pathIndex && pathIndex != -1;
    },

    /**
     * Checks if a single path is a archived folder path.
     * @param {string} path - href of the item to check if it is archived
     * @returns {boolean} true if path is a archived folder, false otherwise.
     *  Will also return false when the archiveFolders property has not been loaded yet
     */
    _isPathArchived: (path) => {
      /** @type {number|null} */
      const pathIndex = Gofast.ITHit.archiveFolders?.indexOf(path);
      return null != pathIndex && pathIndex != -1;
    },

    /*
     *
     * @param {string} Access permission
     * @returns {string} HTML formated INFO column
     */
    _formatInfo: function (permission, visibility, type) {
      var output = "";

      //Permissions
      if (typeof permission !== "undefined") {
        if (type == "Resource") {
          switch (permission) {
            case "owner":
              var title = Drupal.t("You can manage this content (edition, deletion...) because you have owner rights on it.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user-circle-o' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "administrator":
              var title = Drupal.t("You can manage this content (edition, deletion...) because you administer one of it's spaces.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-shield' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "groupmanager":
              var title = Drupal.t("You can manage this content (edition, deletion...) because you are manager one of its spaces.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fas fa-user-shield' style='font-size: .75em; margin-right: 3px; color: #777;'></i>";
              break;
            case "contributor":
              var title = Drupal.t("You can collaborate on this content (edition, commenting) but you won't be able to delete or move it.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "readonly":
              var title = Drupal.t("You are only able to consult this content and comment it because you are read only on all of it's spaces.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user-o' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "onlyreadonly":
              var title = Drupal.t("You are only able to consult this content and comment it because it have special permissions (archived, DUA...).", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-archive' style='margin-right: 3px; color: #777;'></i>";
              break;
          }
        } else {
          switch (permission) {
            case "owner":
              var title = Drupal.t("You have owner permissions on this folder/space but you won't have extra permissions on the content in this folder/space because you are read only in this space.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user-circle-o' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "administrator":
              var title = Drupal.t("You have administration permissions, you will be able to manage all content inside this folder/space.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-shield' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "contributor":
              var title = Drupal.t("You have contribution permissions, you will be able to collaborate on all content inside this folder/space.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "readonly":
              var title = Drupal.t("You have read only permissions, you can see all the content in this folder/space but you won't get extra permissions.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user-o' style='margin-right: 3px; color: #777;'></i>";
              break;
            case "onlyreadonly":
              var title = Drupal.t("This is a special folder/space with read only permissions.", {}, { context: "gofast:gofast_ajax_file_browser" });
              output += "<i title=\"" + title + "\" class='fa fa-user-o' style='margin-right: 3px; color: #777;'></i>";
              break;
          }
        }
      }

      //Visibility
      if (type === "Resource") {
        if (visibility && visibility.length === 1) {
          output += "";
        } else if (visibility && visibility.length > 1) {
          var title = Drupal.t("This content is in multiple locations : ", {}, { context: "gofast:gofast_ajax_file_browser" }) + "\r\n" + decodeURIComponent(visibility.join("\r\n")).replace(/\/webdav\/Sites/g, "");
          output += "<i title=\"" + title + "\" class='fa fa-share-alt' style='margin-right: 3px; color: #777;'></i>";
        } else if (typeof permission !== "undefined") {
          var title = Drupal.t("This content is in multiple locations but you don't have access to all these locations.", {}, { context: "gofast:gofast_ajax_file_browser" });
          output += "<i title=\"" + title + "\" class='fa fa-share-alt' style='margin-right: 3px; color: #777;'></i>";
        }
      }else{
        if (visibility && visibility.length === 1) {
          output += "";
        } else if (visibility && visibility.length > 1) {
          var title = Drupal.t("This folder is in multiple locations : ", {}, { context: "gofast:gofast_ajax_file_browser" }) + "\r\n" + decodeURIComponent(visibility.join("\r\n")).replace(/\/webdav\/Sites/g, "");
          output += "<i title=\"" + title + "\" class='fas fa-exchange-alt' style='margin-right: 3px; color: #777;'></i>";
        } else if (typeof permission !== "undefined") {
          var title = Drupal.t("This folder is in multiple locations but you don't have access to all these locations.", {}, { context: "gofast:gofast_ajax_file_browser" });
          output += "<i title=\"" + title + "\" class='fas fa-exchange-alt' style='margin-right: 3px; color: #777;'></i>";
        }
      }

      return output;
    },
    /*
     *
     */
    _getTypeFromRessourceType: function(name, path, type, content_type){
      if(type === "Resource"){
         //Checks if we either have an alfresco_item (has an extension) or an article (no extension)
         var nametab = name.split('.');
          let item_path = path.split('/');
          if(item_path[item_path.length-2] == 'Wikis' && content_type == 'text/html') {
              return "Article";
          }
        return nametab.pop().toUpperCase();
      }else{
            if (name.substr(0, 1) === '_'){ //This is a space
              //Now, we get the type of the space, regarding the path
              var pathSplit = path.split('/');
              var space = pathSplit[4];
              //Then, set the type
              if (space === "_Groups"){
                return Drupal.t('Group', {}, {context: 'gofast:ajax_file_browser'});
              } else if (space === "_Organisations"){
                return Drupal.t('Organisation', {}, {context: 'gofast:ajax_file_browser'});
              } else if (space === "_Extranet"){
                return Drupal.t('Extranet', {}, {context: 'gofast:ajax_file_browser'});
              } else if (space === "_Public"){
                return Drupal.t('Public space', {}, {context: 'gofast:ajax_file_browser'});
              } else{
                return Drupal.t('Personal space', {}, {context: 'gofast:ajax_file_browser'});
              }
            } else if(name == "TEMPLATES"){
              return Drupal.t('Templates folder', {}, {context: 'gofast:ajax_file_browser'});
            }else{ //This is a folder
              return Drupal.t('Folder', {}, {context: 'gofast:ajax_file_browser'});
            }
      }
    },
    /*
     * Get an Queued Item and return the corresponding HTML
     * Called when queue items are processed
     */
    _formatQueueItem: function (item, originalIndex) {
      var cancellable = false;
      var itemHTML = "";
      itemHTML += "<tr class='file_browser_full_upload_element' id='file_browser_full_upload_element" + originalIndex + "' style='width:100%; display: inline-block;'>";
      //Icon
      //Set icon regarding the status
      var fa_icon = "";
      var color = "#3498db";
      if (item.status === 0) {
        fa_icon = "fa-clock-o";
        color = "#3498db";
        cancellable = true;
      } else if (item.status === 1) {
        fa_icon = "fa-play";
        color = '#3498db';
        cancellable = true;
      } else if (item.status === 3) {
        fa_icon = "fa-times";
        color = '#d9534f';
      } else if (item.status === 4) {
        fa_icon = "fa-check";
        color = '#5cb85c';
      }
      itemHTML += "<td style='width:5%;'>";
      itemHTML += "<span class='fas " + fa_icon + "' style='color:" + color + "'></span>";
      itemHTML += "</td>";

      //Name + Path
      itemHTML += "<td style='width:65%;'>";
      itemHTML += item.displayNamePath;
      itemHTML += "</td>";

      //Operation
      itemHTML += "<td style='width:10%;'>";
      itemHTML += item.displayOperation;
      itemHTML += "</td>";

      //Progression
      itemHTML += "<td style='width:18%;height:22px;'>";
      itemHTML += '<div class="progress" style="width:70%;">';
      itemHTML += '<div class="progress-bar bg-success" role="progressbar" style="width: ' + item.progression + '%" aria-valuenow="' + item.progression + '" aria-valuemin="0" aria-valuemax="100">' + item.progression + '%</div>';
      itemHTML += '</div>';
      if (cancellable && item.operation === "upload") { //Waiting or in progress uploads are cancellable
        itemHTML += '<button type="button" style="right: 2.8%;margin-top: -15px;position: absolute;z-index: 2;" onClick="Gofast.ITHit.cancelUpload(\'' + item.uuid + '\')" class="btn btn-danger btn-xs btn-icon"><i class="fa fa-times"></i></button>';
      }
      itemHTML += "</td>";

      itemHTML += "</tr>";
      return itemHTML;
    },
    /*
     * Get a value in octet and return it in the appropriate size value
     */
    _octetToString: function (aSize) {
      aSize = Math.abs(parseInt(aSize, 10));
      var def = [[1, 'octets'], [1024, 'ko'], [1024 * 1024, 'Mo'], [1024 * 1024 * 1024, 'Go'], [1024 * 1024 * 1024 * 1024, 'To']];
      for (var i = 0; i < def.length; i++) {
        if (aSize < def[i][0])
          return (aSize / def[i - 1][0]).toFixed(2) + ' ' + def[i - 1][1];
      }
    },
    /*
     * Attach event handlers to the processed item passed in param
     * Called in the item processing phase
     */
    _attachEvents: function (item, processedItem, path) {
      if (typeof item !== "undefined" && item !== null) {
        if (Gofast.isTablet() || Gofast.isMobile()){
          //Disable resize on double tap
          processedItem.on('touchend', function (e) {
            e.preventDefault();
            //Propagate a click event
            $(this).click();
          });

          //Double click detection on mobile version
          var touchtime = 0;
          processedItem.on("click", function () {
            if (((new Date().getTime()) - touchtime) < 500) {
              processedItem.trigger('dblclick');
            }
            touchtime = new Date().getTime();
          });
        }
        //Folder navigation triggering at double click
        if (item.ResourceType === "Folder") {
          processedItem.dblclick(function () {
            let itemPath = item.Href

            //Remove trailing slash at the end
            if(itemPath.slice(-1) == "/"){
              itemPath = itemPath.slice(0,-1);
            }

            var rename_form = $("#rename-form");
            if (processedItem.find(rename_form).length === 0) {
              Gofast.ITHit.navigate(itemPath, false, true, null, null, null, "click");
            }
          });
        }
        if (item.ResourceType === "Resource") {
          //Go to node in ajax triggering at double click
          processedItem.dblclick(function () {
            var rename_form = $("#rename-form");
            if (processedItem.find(rename_form).length === 0) {
              if (!Gofast._settings.isEssential) {
                Gofast.addLoading();
              }
              Gofast.ITHit.goToNode(item.Href, false, item.DisplayName, item.Nid);

              clearTimeout(Gofast.willRenameElement);
            }
          });
          processedItem.on('mousedown', function (e) {
            if (e.which == 2) {
              Gofast.ITHit.goToNode(item.Href, true, item.DisplayName);
              clearTimeout(Gofast.willRenameElement);
            }
          });
        }

        //Allow to select items
        processedItem.find("td>input[type=checkbox]").on('mousedown touchstart tap', function (e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
          Gofast.ITHit.prop = true;
          if (processedItem.hasClass('selected')) {
            processedItem.removeClass('selected');
            if ($(".selected").length == 0) {
              //add class disabled on copy and cut options
              $('#file_browser_tooolbar_copy').prop('disabled', true);
              $('#file_browser_tooolbar_cut').prop('disabled', true);
              //disable manage button
              $('#file_browser_full_container #file_browser_tooolbar_manage').addClass("disabled").removeClass("btn-white").attr("data-toggle", "tooltip").tooltip();
              //disable contextual actions
              $('#file_browser_tooolbar_contextual_actions').prop('disabled', true);
            }

          } else {
            processedItem.addClass('selected');
            //Remove class disabled on copy and cut options
            $('#file_browser_tooolbar_copy').prop('disabled', false);
            $('#file_browser_tooolbar_cut').prop('disabled', false);
            //Enable contextual actions
            $('#file_browser_tooolbar_contextual_actions').prop('disabled', false);
          }
          if (Gofast.isTablet() || Gofast.isMobile()){
            //Check the box
            $(this).prop("checked", !$(this).prop("checked")).trigger("change");
          }
        });
        processedItem.find("td>input[type=checkbox]").on('mouseup touchend', function (e) {
          GFITHit._fileListSelectionUpdated();
        });
        // checkboxes are actually checked _after_ the mousedown event so we need a differentiated event for this
        processedItem.find("td>input[type=checkbox]").on("change", function() {
          //Enable manage button
          var path = $(processedItem[0]).find('td.item-path').text();
          // var type = $(processedItem[0]).find('td.item-type').text();

          if (path === '/alfresco/webdav/Sites/_Groups/' || path === '/alfresco/webdav/Sites/_Extranet/' || path === '/alfresco/webdav/Sites/_Organisations/' || path === '/alfresco/webdav/Sites/_Public/'
            || GFITHit._isPathArchived(path)) {
            $('#file_browser_full_container #file_browser_tooolbar_manage').addClass("disabled").removeClass("btn-white").attr("data-toggle", "tooltip").tooltip();
          }
        });
        function processedItemCallback(e) {
          //Remove class disabled on copy and cut options
          $('#file_browser_tooolbar_copy').prop('disabled', false);
          $('#file_browser_tooolbar_cut').prop('disabled', false);
          //Enable contextual actions
          $('#file_browser_tooolbar_contextual_actions').prop('disabled', false);
          let selectedItems = $("#file_browser_full_files .selected").not('.search-hidden');
          if (e.shiftKey) {
            if ($("#file_browser_full_files .selected").length > 0) {
              // Don't unselect if shift + click on a selected item
              if (processedItem.hasClass('selected')) {

              // If the processedItem is between two selected item then select all from the first to the processedItem
              } else if(selectedItems.first().position().top < processedItem.position().top
                        && selectedItems.last().position().top > processedItem.position().top) {
                let closestItemFromTop = selectedItems.first();
                selectedItems.each((index, item) => {
                  item = $(item);
                  if(item.position().top < processedItem.position().top && item.position().top > closestItemFromTop.position().top) {
                    closestItemFromTop = item
                  }
                })
                closestItemFromTop.nextUntil(processedItem, "tr").not('.search-hidden').find("td>input[type=checkbox]").prop('checked', true);
                closestItemFromTop.nextUntil(processedItem, "tr").not('.search-hidden').addClass('selected');
              // If the processedItem is on top of selectedItems then select all items from processItem to the first selected item
              } else if (selectedItems.first().position().top > processedItem.position().top) {
                processedItem.nextUntil($("#file_browser_full_files .selected").first(), "tr").not('.search-hidden').find("td>input[type=checkbox]").prop('checked', true);
                processedItem.nextUntil($("#file_browser_full_files .selected").first(), "tr").not('.search-hidden').addClass('selected');
              // If the processedItem is under the last selected item then select all items from last selected item to processedItem
              } else {
                selectedItems.last().nextUntil(processedItem, "tr").not('.search-hidden').find("td>input[type=checkbox]").prop('checked', true);
                selectedItems.last().nextUntil(processedItem, "tr").not('.search-hidden').addClass('selected');
              }
              processedItem.addClass('selected');
              processedItem.find("td>input[type=checkbox]").prop('checked', true);
            } else {
              $("#file_browser_full_files .selected").removeClass("selected");
              processedItem.addClass('selected');
            }
          } else if (e.ctrlKey) {
            if (processedItem.hasClass('selected')) {
              processedItem.removeClass('selected');
              processedItem.find("td>input[type=checkbox]").prop('checked', false);
            } else {
              processedItem.addClass('selected');
              processedItem.find("td>input[type=checkbox]").prop('checked', true);
            }
          } else {
            if (!processedItem.hasClass('selected')) {
              $("#file_browser_full_files .selected").removeClass("selected");
              processedItem.addClass('selected');
              $("td>input[type=checkbox]:checked").prop('checked', false);
              processedItem.find("td>input[type=checkbox]").prop('checked', true);
            }
          }
          processedItem.find("td>input[type=checkbox]").trigger('change'); // will enable the manage button by triggering the "change" event

          GFITHit._fileListSelectionUpdated();
        }
        let processedItemTimeout;
        let originalItemTouchX;
        let originalItemTouchY;
        processedItem.on('mousedown touchstart', function (e) {
          if (e.type == "mousedown") {
            processedItemCallback(e);
          } else {
            var touch = e.touches[0];
            [originalItemTouchX, originalItemTouchY] = [touch.clientX, touch.clientY];
            clearTimeout(processedItemTimeout);
            processedItemTimeout = setTimeout(() => processedItemCallback(e), 250);
          }
        });
        processedItem.on('touchmove', function (e) {
          var touch = e.touches[0];
          var [touchX, touchY] = [touch.clientX, touch.clientY];
          // Check if touch has moved beyond threshold
          if (Math.abs(touchX - originalItemTouchX) || Math.abs(touchY - originalItemTouchY)) {
            clearTimeout(processedItemTimeout);
          }
        });
        processedItem.on('mouseup touchend', function (e) {
          if (Gofast.ITHit.prop) {
            Gofast.ITHit.prop = false;
            return;
          }
          if ($('.ui-resizable-resizing').length !== 0) {
            return;
          }
          if (!e.shiftKey && !e.ctrlKey && e.button === 0) {
            $("#file_browser_full_files .selected").removeClass("selected");
            processedItem.addClass('selected');
            $("td>input[type=checkbox]:checked").prop('checked', false);
            processedItem.find("td>input[type=checkbox]").prop('checked', true);
          }

          GFITHit._fileListSelectionUpdated();
        });

        //Display menu at right click event, select the item if it's not already selected
        processedItem.contextmenu(function (e) {
          if (!processedItem.hasClass('selected')) {
            processedItem.click();
          } else {
            // If you don't edit input field rename doc, dispaly ContextMenu
            if (e.target.id !== "rename-form") {
              Gofast.ITHit._contextMenuHandler(e);
            }//Else not think to do
          }
        });
      };

      //Navigation triggering at single click
      if (typeof path !== "undefined") {
        processedItem.click(function () {
          Gofast.ITHit.navigate(path);
        });
      }
    },
    /*
     * Attach again click events to an item
     * Usually called after a rename operation
     */
    _attachEventsAgain: function (item, processedItem) {
      processedItem.off('mousedown');
      processedItem.off('dblclick');
      //Folder navigation triggering at double click
      if (item.ResourceType === "Folder") {
        processedItem.dblclick(function () {
          let itemPath = item.Href

          //Remove trailing slash at the end
          if(itemPath.slice(-1) == "/"){
            itemPath = itemPath.slice(0,-1);
          }

          var rename_form = $("#rename-form");
          if (processedItem.find(rename_form).length === 0) {
            Gofast.ITHit.navigate(itemPath, false, true, null, null, null, "click");
          }
        });
      }
      if (item.ResourceType === "Resource") {
        //Go to node in ajax triggering at double click
        processedItem.dblclick(function () {
          var rename_form = $("#rename-form");
          if (processedItem.find(rename_form).length === 0) {
            if (!Gofast._settings.isEssential) {
              Gofast.addLoading();
            }
            Gofast.ITHit.goToNode(item.Href, false, item.DisplayName);
          }
        });
        processedItem.on('mousedown', function (e) {
          if (e.which == 2) {
            Gofast.ITHit.goToNode(item.Href, true, item.DisplayName);
          }
        });
      }
    },
    /*
     * Attach event handlers to the processed queue item passed in param
     * Called in the queue item processing phase
     */
    _attachQueueEvents: function (item, processedItem) {
      if (typeof item !== "undefined" && item !== null) {
      }
    },
    /**
     * Triggered by right clicking an item.
     * Display the corresponding menu.
     *
     * NOTE: This handler can be called from multiple contexts such as:
     * - as handler of `contextualmenu` events
     * - as callback for ztree right click events
     */
    _contextMenuHandler: function (e, tId, node) {
      //Prevent any default browser action, we are going to manage all actions
      e.preventDefault();

      //Prevent click on nothing
      if (node == null && typeof node == 'object') {
        return;
      }

      let menuParent = "";
      if (Gofast._settings.isEssential) {
        menuParent = $("#gofast_file_browser_side_content");
      } else {
        menuParent = $("#gofastBrowserContentPanel");
      }

      // Get the selected elements
      let data = [];
      let fromTree = 0;
      if (node === undefined) { //From files
        data = Gofast.ITHit.getFileBrowserSelectedItems();
      } else { //From tree
        data = [
          {
            // Encode each path part individually to prevent encoding '/'
            path: node.path.split('/').map(pathPart => encodeURIComponent(pathPart)).join('/'),
            type: node.type,
          },
        ];
        fromTree = 1;
      }

      // Find the position at which to show the menu, either at the click
      // position or next to a reference element.
      const position = {
        x: e.clientX ?? $("#file_browser_tooolbar_contextual_actions").offset().left,
        y: e.clientY ?? $("#file_browser_tooolbar_contextual_actions").offset().top - window.scrollY,
      };

      Gofast.ITHit.showFloatingContextualMenu({
        position,
        parent: menuParent,
        selectedItems: data,
        menuRequestOptions: { fromTree },
      });
    },
    /**
     * Show a contextual menu for the given selection at the given position on
     * the screen.
     *
     * The operation may fail early, indicated by a `success` property set to
     * `false` on the returned result object. Failure can be expected when:
     * - Too many items have been selected
     * - No items have been selected
     *
     * The `FOLDERS TEMPLATES` special folder (or any folder with that name) is
     * ignored if part of the selection, which may result in failure due to no
     * items being selected.
     *
     * @param {object} options Menu options.
     * @param {object[]} options.selectedItems List of selected item objects as
     *  required by the `gofast/node-actions/filebrowser` endpoint.
     * @param {string|HTMLElement|JQuery} options.parent Parent element to which
     *  the menu will be appended.
     * @param {object} [options.position] The position on screen of the menu.
     * @param {number} [options.position.x] The x position of the menu in pixels.
     * @param {number} [options.position.y] The y position of the menu in pixels.
     * @param {object} [options.menuRequestOptions] Options passed to call to
     *  get the contextual menu.
     * @param {0|1} [options.menuRequestOptions.fromTree] Indicates whether the
     *  action came from the tree view or not.
     * @returns {{success: false} | {success: true, promise: Promise<JQuery>}}
     *  Immediate result of the operation, as an object with a `success` property
     *  set either to `true` or to `false`. A failure (`success` set to `false`)
     *  means the operation failed before any asynchronous operation (fetching
     *  the menu). In case the code fails after an asynchronous operation, the
     *  returned promise may reject.
     */
    showFloatingContextualMenu: function (options) {
      const { selectedItems, parent, menuRequestOptions: { fromTree = 0 } = {} } = options;
      let { position = {} } = options;
      // Apply defaults
      position = { x: 0, y: 0, ...position };

      const $menuParent = $(parent);

      // If another menu is open, destroy it
      $menuParent.find(".gofast-node-actions.open").remove();

      // Instanciate and insert menu element in the DOM
      // The "open" CSS class on the root wrapper element shows the menu
      const $menuWrapper = $(
        '<div class="gofast-node-actions open"><div class="dropdown-menu dropdown-menu-md py-5" aria-labelledby="dropdown-"></div></div>',
      );
      const $menuElement = $menuWrapper.find(".dropdown-menu");

      const menuCreationResult = Gofast.ITHit.populateElementWithContextualMenu({
        root: $menuElement,
        selectedItems,
        menuRequestOptions: { fromTree },
        onEmptyMenu() {
          $menuWrapper.remove();
        },
      });
      if (!menuCreationResult.success) {
        return { success: false };
      }

      $menuWrapper.appendTo($menuParent);

      // Set the position of the menu
      $menuWrapper.css({
        position: "fixed",
        left: position.x,
        top: position.y,
      });

      Gofast.ITHit.handleOverflowPosition($menuElement);

      //Add event to destroy the menu when clicking outside
      $("body").click(function (e) {
        if (
          $(e.target).hasClass("fa-bars") ||
          $(e.target).attr("id") === "file_browser_tooolbar_contextual_actions"
        ) {
          return;
        }
        // Destroy the listener for performance
        $(this).off(e);

        // Remove the menu
        $menuWrapper.remove();
        $(".tooltip").remove();
      });

      const promise = menuCreationResult.promise.then(function ($menuContents) {
        // Submenu is always out of the window, then reposition it
        const $submenu = $menuContents.children(".dropdown-submenu").children(".dropdown-menu");
        $submenu.css("bottom", "0");

        //Check if the menu is out of the window, reposition it if needed
        const bottom = $menuWrapper[0].getBoundingClientRect().top + $menuWrapper[0].scrollHeight;
        if (window.innerHeight < bottom) {
          const diff = bottom - window.innerHeight;
          $menuWrapper.css("top", parseInt($menuWrapper.css("top")) - diff);
        }
        return $menuContents;
      });

      return { success: true, promise };
    },
    /**
     * Populate a given menu dropdown element with the contextual menu for a
     * selection of items.
     *
     * The operation may fail early, indicated by a `success` property set to
     * `false` on the returned result object. Failure can be expected when:
     * - Too many items have been selected
     * - No items have been selected
     *
     * The `FOLDERS TEMPLATES` special folder (or any folder with that name) is
     * ignored if part of the selection, which may result in failure due to no
     * items being selected.
     *
     * @param {object} options Options object for populating the menu.
     * @param {string|HTMLElement|JQuery} options.root Root element in which the
     *  menu will **REPLACE** the contents.
     * @param {object[]} options.selectedItems List of selected item objects as
     *  required by the `gofast/node-actions/filebrowser` endpoint.
     * @param {() => void} [options.onEmptyMenu] callback which *may* be called
     *  if the received menu is empty (has no items).
     * @param {object} [options.menuRequestOptions] Options passed to call to
     *  get the contextual menu.
     * @param {0|1} [options.menuRequestOptions.fromTree] Indicates whether the
     *  action came from the tree view or not.
     * @returns {{success: false} | {success: true, promise: Promise<JQuery>}}
     *  Immediate result of the operation, as an object with a `success` property
     *  set either to `true` or to `false`. A failure (`success` set to `false`)
     *  means the operation failed before any asynchronous operation (fetching
     *  the menu). In case the code fails after an asynchronous operation, the
     *  returned promise may reject, or provided common error handling callbacks
     *  may be called (like `onEmptyMenu`).
     */
    populateElementWithContextualMenu: function (options) {
      const { root, menuRequestOptions: { fromTree = 0 } = {} } = options;
      let { selectedItems } = options;

      // Prevent getting contextual menu for FOLDERS TEMPLATES (GOFAST-12198)
      selectedItems = selectedItems.filter((o) => o.path.split("/").at(-1) !== "FOLDERS TEMPLATES");

      // If no item to get the contextual menu for after filtering:
      // abort menu creation.
      if (selectedItems.length === 0) {
        return { success: false };
      }

      const $root = $(root);

      // Initialise menu dropdown content with initial loading spinner
      const $contents = $(
        // Strings formatted in a way to make it like a readable html snippet
        // prettier-ignore
        '<ul class="navi navi-hover navi-link-rounded-lg px-1">' +
          '<li>' +
            '<div class="loader-activity-menu-active"></div>' +
          '</li>' +
        '</ul>',
      );
      $root.empty().append($contents);

      // Add default if empty menu callback is not set, removes the list contents.
      const onEmptyMenu = options.onEmptyMenu ?? (() => $contents.remove());

      // AJAX request to get the menu
      const promise = $.post(location.origin + "/gofast/node-actions/filebrowser", {
        selected: JSON.stringify(selectedItems),
        fromTree: fromTree,
        fromBrowser: 1,
      }).then(function (data) {
        try {
          data = JSON.parse(data);
        } catch (_e) {
          data = data;
        }

        if (data.message) {
          Gofast.toast(data.message, "error")
        }
        const $data = $(data);
        if (data.message || $data.find("ul").length == 0) {
          //Empty menu
          onEmptyMenu(); // FIXME: use rejected promise instead?
          return $contents;
        }

        // Append the topmost list of options, all other list (e.g.: submenus)
        // should be inside and therefore after in the JQuery collection.
        // We need this step since the gofast/node-actions endpoint returns a
        // full set of buttons we do not want in addition to our menu content.
        $contents.empty().append($data.find("ul").first());
        Drupal.attachBehaviors(); // FIXME add context to optimize execution?
        return $contents;
      });

      return { success: true, promise };
    },
    /*
     * Correct the elements that overlap into the edge of the window.
     * If this can be done in pure css or bootsrap consider removing this method.
    */
    handleOverflowPosition: function (menuElement) {
        var elementWidth = menuElement.outerWidth();
        var windowWidth = $(window).width();
        var elementRightPosition = menuElement.offset().left + elementWidth;
        var overflowAmount = elementRightPosition - windowWidth;
        if (overflowAmount > 0) {
            var newRightPosition = menuElement.offset().left - (overflowAmount + 10); // Adjust 10 pixels for breathing space
            menuElement.offset({ left: newRightPosition });
        }
    },
    /**
     * Find the selected items in the files part of the browser.
     * @returns {{path:string, type: string, _rowElement: HTMLElement}[]} A list of currently selected
     *  items, represented by their path and type. A reference to the DOM row
     *  element is included as well but its usage is discouraged unless you know
     *  what you are doing, absolutely need it or it drastically improves the
     *  calling code.
     */
    getFileBrowserSelectedItems: function () {
      // Get elements with the checkbox checked
      const $selectedElements = $('.gfb-cbx:checked').parents('.file_browser_full_files_element');
      const selectedItems = [];
      $.each($selectedElements, function (k, elem) {
        const path = $(elem).find(".item-path").html();
        const type = $(elem).find(".item-real-type").html();
        selectedItems.push({
          path,
          type,
          _rowElement: elem,
        });
      });
      return selectedItems;
    },
    /**
     * Handles side effects of navigation related to archived spaces.
     *
     * Side effects include:
     * - Adding and removing the archived space warning alert.
     *
     * @param {object} spaceItem The spaceItem we are navigating to.
     * @param {object[]} spaceItem.properties The spaceItem properties
     * @param {[string]} spaceItem.permissions The spaceItem permission
     */
    _handleArchiveSpaceUpdatesOnNavigation: function (spaceItem) {
      if (!spaceItem) {
        return;
      }
      // Handle archived space alert update.
      const isSpaceArchived = spaceItem.properties['gofast:isarchived'] == true;

      const $archiveAlertWrapper = $('.archived-space-warning-alert')
      const $archiveAlert = $archiveAlertWrapper.find('> .alert');
      const archiveAlertExists = $archiveAlert.length > 0;

      // Handle navigating to and from archived spaces:
      // NOTE: we add and remove the alert from the DOM instead of
      // showing/hiding it since the dismiss button removes it (bootstrap
      // behavior).
      if (isSpaceArchived && !archiveAlertExists) {
        // Make sure the alert shows up when navigating to an archived space.
        const archivedAlert = $('template#archived-space-warning-alert-template')[0].content.cloneNode(true);
        $archiveAlertWrapper.append(archivedAlert);
      } else if (!isSpaceArchived && archiveAlertExists) {
        // Remove the alert when navigating out of an archived space.
        $archiveAlert.remove();
      }

      if (isSpaceArchived) {
        $('#file_browser_tooolbar_new_item').prop('disabled', true);
      }
    },

    /**
     * Validates that renaming an element from the file browser is possible given its path.
     *
     * The validation should be DOM independent.
     *
     * @param {string} itemPath Path to the item to rename.
     *  Should not include `/Sites`.
     *  Should not include the webdav url path ('/alfresco/webdav').
     *  The path is assumed to have its segments URI encoded.
     * @returns {{ok: true, error?: undefined} | {ok: false, error: {type: 'technical_folder', folderName: string} | {type: 'space_not_renamable', spaceName: string}}}
     *  Renamability check result. In the case that the item is renamable, the
     *  return object only has an `ok` property set to true. Otherwise, the `ok`
     *  property is set to `false` and an `error` property contains an object
     *  detailing the error.
     */
    isRenamableFromFileBrowser: function (itemPath) {
      // Parse item path.
      const pathSegments = itemPath.split('/')
        .filter(s => s.length !== 0)
        .map(x => decodeURIComponent(x));
      const [parentName, itemName] = pathSegments.slice(-2);

      // Cannot rename spaces.
      const isSpace = itemName.startsWith('_');
      if (isSpace) {
        return {
          ok: false,
          error: {
            type:'space_not_renamable',
            spaceName: itemName,
          },
        }
      }

      const isUnderSpace = parentName.startsWith('_');

      // Check if we are trying to rename a technical folder.
      const technicalFolderNames = [
        WIKI_FOLDER_NAME,
        WEBFORM_FOLDER_NAME,
        BROADCAST_INBOX_FOLDER_NAME,
        TEMPLATES_FOLDER_NAME,
      ];
      if (isUnderSpace && technicalFolderNames.includes(itemName)) {
        return {
          ok: false,
          error: {
            type: 'technical_folder',
            folderName: itemName,
          },
        };
      };

      // All checks passed, we can rename the item.
      return { ok: true };
    },

    /*
     * Implements an little input form to rename the document/folder
     */
    rename: function (href, item_type = "folder") {
      // Strip href of non-path segments and constant segment.
      const itemPath = href.replace(/^(\/alfresco\/webdav)?(\/Sites)?/, '');
      // Validate rename action from item path.
      const renamable = GFITHit.isRenamableFromFileBrowser(itemPath, item_type);

      if (!renamable.ok) {
        switch (renamable.error.type) {
          case 'technical_folder':
            Gofast.toast(
              Drupal.t(
                'You cannot rename this technical folder: @folder_name.',
                { '@folder_name': renamable.error.folderName },
                { context: 'gofast:ajax_file_browser' },
              ),
              'warning',
            );
            break;
            case "space_not_renamable":
            Gofast.toast(
              Drupal.t(
                'You cannot rename spaces from the file browser. You tried to rename "@space_name".',
                { '@space_name': renamable.error.spaceName },
                { context: 'gofast:ajax_file_browser' },
              ),
              'warning',
            );
          break;
        }
        return;
      }

      //Search and get the line we are editing
      href = href !== decodeURIComponent(href) ? href : encodeURI(href).replaceAll("'", "%27").replaceAll(",", "%2c").replaceAll("+", "%2b"); // encode the path if not already (the path is URL-encoded and lower-cased in the DOM)
      var element = $('#file_browser_full_files_table').find('td[data-path="' + href.toLowerCase() + '"]');
      var name_element = element.parent().find('.item-name');

      if (name_element.find('#rename-form').exists()) {
        // The rename form is already initialised for this item, do nothing.
        return;
      }

      //Check if we got an element
      if (name_element.length == 0) {
        Gofast.toast(Drupal.t("Unable to rename this item", {}, { context: 'gofast:ajax_file_browser' }), "warning");
      } else {
        //Save old name
        var old_name = name_element.text();

        //We are secure to edit
        var input_group = name_element.html('<input id="rename-form" class="form-control form-text"  value="' + name_element.text() + '" style="padding-bottom:12px;height:20px;width:80%;float:left;margin-top:0px;"><div class="badge badge-success"><i class="fa fa-check" style="color:white;"></i></div><div class="badge badge-danger"><i class="fa fa-times" style="color:white;"></i></div>');

        //GOFAST-6757 - Couldn't d&d a file after going out of a rename in the gfb (caused because no refresh when we don't submit a new name)
        $('.file_browser_full_files_element').attr('draggable', 'false'); //sets the attribute to false

        //Select text without the extension
        if (input_group.parent().find(".item-real-type").text() === "Resource") {
          Gofast.selectPartOfInput(input_group.find('input:text')[0], 0, input_group.find('input:text').val().lastIndexOf("."));
        } else {
          input_group.find('input:text').select();
        }

        const cancelRename = () => {
          name_element.text(old_name);
          $('.file_browser_full_files_element').attr('draggable', 'true'); //sets the attribute to true
        }

        //Bind the enter event to the input
        name_element.find('input').on('keyup', function (e) {
          if (e.keyCode == 13) { //Enter pressed
            var new_name = name_element.find('input').val();
            if(!validateItemName(new_name, item_type)){
              return;
            }

            //Trigger the animation
            name_element.html('<div class="loader-filebrowser"></div>' + new_name);

            //Process rename
            Gofast.ITHit._processRename(href, old_name, new_name, name_element, "ressource");
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
            // Restore focus to file list.
            $("#file_browser_full_files_table [tabindex]").first().focus();
            return;
          }
        });
        //Bind the validate button event
        name_element.find('.badge-success').on('click', function (e) {
          var new_name = name_element.find('input').val();


          //delete spaces at the beginning and end of the name
          new_name = new_name.trim();

          if(!validateItemName(new_name, item_type)){
            return;
          }

          //Trigger the animation
          name_element.html('<div class="loader-filebrowser"></div>' + new_name);

          //Process rename
          Gofast.ITHit._processRename(href, old_name, new_name, name_element, "ressource");
        });
        //Bind the cancel button event
        name_element.find('.badge-danger').on('click', function (e) {
          cancelRename();
        });
      }
    },
    /*
     * Implements an little input form to rename the document/folder
     */
    renameTree: function (href, item_type = "folder") {
      //Search and get the ztree element we are editing
      var zElement = Gofast.ITHit.tree.getNodeByParam("path", href);

      //Check if we got an element
      if (zElement === null) {
        Gofast.toast(Drupal.t("Unable to rename this item", {}, { context: 'gofast:ajax_file_browser' }), "warning");
      } else {
        var name = zElement.name;

        //Display the input field
        $("#rename-popup").remove();
        $('#file_browser_full_tree').prepend('<div id="rename-popup"><input id="rename-form" class="form-control form-text" value="' + name + '" style="line-height:0px;height:20px;"><div class="btn-group d-flex" role="group"><button style="height:20px;padding-left:5px;padding-right:5px;padding-top:0px;padding-bottom:0px;" type="button" class="btn btn-success"><i class="fa fa-check"></i></button><button type="button" style="height:20px;padding-left:5px;padding-right:5px;padding-top:0px;padding-bottom:0px;" class="btn btn-danger"><i class="fa fa-times"></i></button></div>');
        var name_element = $("#rename-popup");

        name_element.css('width', $("#file_browser_full_tree_element").width());

        //Select text
        name_element.find('input:text').select();

        //Bind the enter event to the input
        name_element.find('input').on('keyup', function (e) {
          if (e.keyCode == 13) { //Enter pressed
            var new_name = name_element.find('input').val();

            //delete spaces at the beginning and end of the name
            new_name = new_name.trim();

            if(!validateItemName(new_name, item_type)){
              return;
            }

            //Process rename
            $("#rename-popup").remove();
            Gofast.ITHit._processRename(href, name, new_name, name_element, "ressource", zElement);
          }
        });
        //Bind the validate button event
        name_element.find('.btn-success').on('click', function (e) {
          var new_name = name_element.find('input').val();

          //delete spaces at the beginning and end of the name
          new_name = new_name.trim();

          if(!validateItemName(new_name, item_type)){
            return;
          }

          //Process rename
          $("#rename-popup").remove();
          Gofast.ITHit._processRename(href, name, new_name, name_element, "ressource", zElement);
        });
        //Bind the cancel button event
        name_element.find('.btn-danger').on('click', function (e) {
          $("#rename-popup").remove();
        });
      }
    },
    /*
     * Process the rename of an element. Usually called in renaming process
     * path : The full path of the element
     * old_name : The old name of the element
     * new_name : The new name of the element
     * name_element : the jQuery graphic container
     * type : folder or ressource
     * zElement : Ztree element if the rename comes from ztree
     */
    _processRename: function (path, old_name, new_name, name_element, type, zElement) {
      //Remove slash at the end if needed
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }

      //Prevent move of a space, except if the rename comes from the ztree so it's definitely not a move operation
      if (old_name.substr(0, 1) === "_" && typeof zElement === "undefined") {
        Gofast.toast(Drupal.t("You cannot rename a space from the filebrowser", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        name_element.text(old_name);
        return;
      }

      //If the rename comes from ztree, change icon
      if (typeof zElement !== "undefined") {
        var saveIcon = zElement.icon;
        var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
        zElement.icon = "/sites/all/modules/gofast/gofast_ajax_file_browser/img/load.gif";
        Gofast.ITHit.tree.refresh();
        Gofast.ITHit.tree.selectNode(selectedNode);
      }
      if (type == "ressource") { //We are renaming a document
        //First, we open the item
        Gofast.ITHit.Session.OpenItemAsync(path, null, function (asyncResult) {

          if (!asyncResult.IsSuccess) {
            Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + old_name, "warning");
            if (typeof zElement === "undefined") {
              name_element.text(old_name);
            } else {
              var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
              zElement.icon = saveIcon;
              Gofast.ITHit.tree.refresh();
              Gofast.ITHit.tree.selectNode(selectedNode);
            }
            return;
          }

          var item = asyncResult.Result;

          //We got the item, we try to get the parent folder
          var pathSplit = path.split('/');
          pathSplit.pop();
          var folderPath = pathSplit.join('/');
          Gofast.ITHit.Session.OpenFolderAsync(folderPath, null, function (asyncResult) {

            if (!asyncResult.IsSuccess) {
              Gofast.toast(Drupal.t("Unable to open the parent folder of", {}, { context: 'gofast:ajax_file_browser' }) + " " + old_name, "warning");
              if (typeof zElement === "undefined") {
                name_element.text(old_name);
              } else {
                var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
                zElement.icon = saveIcon;
                Gofast.ITHit.tree.refresh();
                Gofast.ITHit.tree.selectNode(selectedNode);
              }
              return;
            }

            var folder = asyncResult.Result;

            //We got the folder, we can process the rename action
            item.MoveToAsync(folder, new_name, false, null, function (asyncResult) {
              if (asyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.PreconditionFailedException || (asyncResult.Status && asyncResult.Status.Code == 412)) {
                Gofast.toast(new_name + " " + Drupal.t("already exists in this folder", {}, { context: 'gofast:ajax_file_browser' }), "warning");
                var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
                if (typeof zElement === "undefined") {
                  name_element.text(old_name);
                } else {
                  zElement.icon = saveIcon;
                  Gofast.ITHit.tree.refresh();
                  Gofast.ITHit.tree.selectNode(selectedNode);
                }
                return;
              }
              if (!asyncResult.IsSuccess) {
                Gofast.toast(Drupal.t("Unable to rename", {}, { context: 'gofast:ajax_file_browser' }) + " " + old_name, "warning");
                if (typeof zElement === "undefined") {
                  name_element.text(old_name);
                } else {
                  var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
                  zElement.icon = saveIcon;
                  Gofast.ITHit.tree.refresh();
                  Gofast.ITHit.tree.selectNode(selectedNode);
                }
                return;
              } else {
                if (typeof zElement === "undefined") {
                  name_element.text(new_name);

                  //Check if we find the element int the tree
                  var zElement = Gofast.ITHit.tree.getNodeByParam("path", decodeURIComponent(folder.Href + old_name));

                  if (zElement !== null) {
                    //That's a folder and we found it in thz zTree, rename it !
                    zElement.name = new_name;
                    zElement.path = decodeURIComponent(folder.Href + new_name);
                    Gofast.ITHit.tree.editName(zElement);
                    Gofast.ITHit.tree.removeChildNodes(zElement);
                    zElement.isParent = true;
                    if(typeof saveIcon != "undefined"){
                      zElement.icon = saveIcon;
                    }
                    Gofast.ITHit.tree.refresh();
                    Gofast.ITHit.tree.selectNode(selectedNode);
                  }
                  Gofast.ITHit.currentPath = Gofast.ITHit.currentPath.replace(decodeURIComponent(folder.Href + old_name), decodeURIComponent(folder.Href + new_name));
                  Gofast.ITHit.reload();
                } else {
                  var selectedNode = Gofast.ITHit.tree.getSelectedNodes()[0];
                  zElement.name = new_name;
                  zElement.path = decodeURIComponent(folder.Href + new_name);
                  Gofast.ITHit.tree.editName(zElement);
                  if(typeof saveIcon != "undefined"){
                    zElement.icon = saveIcon;
                  }
                  Gofast.ITHit.tree.removeChildNodes(zElement);
                  zElement.isParent = true;
                  Gofast.ITHit.tree.refresh();
                  Gofast.ITHit.tree.selectNode(selectedNode);
                }
                var items = items || [];
                //Attach again click event with the proper path
                var rtype_items = items.filter(function (i) {
                  return i.Href === folder.Href + encodeURIComponent(old_name).replace(/[!'()*]/g, escape);
                });
                var rtype = "";
                if (rtype_items.length) {
                  rtype = "Resource";
                } else {
                  rtype = "Folder";
                }
                // refresh wiki panel if a wiki article has been renamed
                if (folder.Href.includes("/Wikis")) {
                  Gofast.sideFileBrowser.refreshBrowser("book-browser");
                }
                var fakeItem = {
                  ResourceType: rtype,
                  DisplayName: new_name,
                  Href: folder.Href + encodeURIComponent(new_name).replace(/[!'()*]/g, escape)
                };
                Gofast.ITHit._attachEventsAgain(fakeItem, name_element.parent());
                //We also need to edit the item-path hidden attribute for technical reasons
                var item_path = folder.Href + encodeURIComponent(new_name).replace(/[!'()*]/g, escape);
                name_element.parent().find('.item-path').text(item_path);
                return;
              }
            });
          });
        });
      }
    },
    /*
     * Display confirmation modal to process a deletion
     */
    delete: function (data, process, e) {
      if (process) {
        //Stop propagation of events to prevent multiple submit
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        Gofast.closeModal();
        var items = JSON.parse(data);
        var folders = [];

        //Queue items for deletion
        items.forEach(function (path) {
          //Get the name of the element from the path
          var fileName = path;
          if (path.substr(-1, 1) === "/") {
            fileName = path.substring(0, path.length - 1);
          }
          fileName = fileName.split('/');
          fileName = decodeURIComponent(fileName.pop());
          var displayNamePath = fileName + ' (' + decodeURIComponent(path).replace('/alfresco/webdav/Sites/', '') + ')';

          var operation = "delete";
          var displayOperation = Drupal.t('Deletion', {}, { context: 'gofast:ajax_file_browser' });
          Gofast.ITHit.queue.push({
            uuid: Gofast.ITHit.generate_uuid(),
            path: path,
            displayNamePath: displayNamePath,
            fileName: fileName,
            operation: operation,
            displayOperation: displayOperation,
            progression: 0,
            status: 0
          });

          //Finally check if the item is a folder
          if ($(".item-path:contains("+ path +")").parent().find(".item-real-type").text() == "Folder") {
            folders.push(path);
          }
        });

        //Delete from audit and favorites
        if (folders.length) {
          $.post(location.origin + "/gofast/audit/delete/folder", { folders });
          $.post(location.origin + "/gofast/browser/check_favorite_folders", { folders }, function (data) {
            if (data != 1) {
              console.log('There were no favorites to remove');
            }
          });
        }

        //Disable copy and cut buttons
        $('#file_browser_tooolbar_copy').prop('disabled', true);
        $('#file_browser_tooolbar_cut').prop('disabled', true);
        $('#file_browser_tooolbar_cart_button').prop('disabled', true);
        //Disable manage button
        $('#file_browser_full_container #file_browser_tooolbar_manage').addClass("disabled").removeClass("btn-white").attr("data-toggle", "tooltip").tooltip(); //Disable cart button
        $('#file_browser_tooolbar_cart_button').prop('disabled', true);
        //Disable contextual actions
        $('#file_browser_tooolbar_contextual_actions').prop('disabled', true);

      } else {
        //Retrieve back items
        var items = JSON.parse(data);
        var title = Drupal.t("Delete files", {}, { context: "gofast:ajax_file_browser" });
        var html = "";
        Gofast.addLoading();
        $.post(location.origin + "/ajax_file_browser/0/get_delete_modal_content", {
          items: items
        }, function(res) {
          html = res;
          data = data.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          html += '<button id="deleteButton" class="btn btn-danger btn-sm icon-before" onClick="Gofast.ITHit.delete(\'' + data + '\', true, event)"><span class="icon glyphicon glyphicon-trash"></span>' + ' ' + Drupal.t('Delete') + '</button>';
          Gofast.modal(html, title);
          Gofast.removeLoading();
        });
      }
    },
    /*
     * Delete selected items
     */
    deleteSelected: function (e, selection) {
      if (typeof selection === "undefined") {
        var supprEvent = $.Event('keyup');
        supprEvent.keyCode = 46;
        //Full browser
        $("#file_browser_full_files_table").trigger(supprEvent);
      } else {
        var data = JSON.stringify([selection]);
        Gofast.ITHit.delete(data);
      }
      e.preventDefault();
      e.stopPropagation();
    },

    /**
     * Parses a path into a directory path, a file name and an extension.
     *
     * The extension is defined as the last part after the last dot that is not
     * directly following a slash, the filename is what comes before the dot
     * preceding the extension and is after the final slash. Everything before
     * and including the final slash is the directory.
     *
     * The baseName property is both the file name and extension
     * joined.
     *
     * The returned object verifies
     * `((directory ?? "") + (filename ?? "") + (extension == null ? "" : "." + extension)) === filePath`
     * @param {string} filePath The file path to split into a file name and extension
     * @typedef {{
     *  directory: string|null,
     *  name: string|null,
     *  extension: string|null,
     *  baseName: string|null,
     * }} PathParseResult
     * @return {PathParseResult} An object with the path parsing data
     */
    parseFilePath: function (filePath) {
      // split path into segments and get file base name
      const segments = filePath.split("/");
      const fullFileName = segments.pop();

      // Compute directory path
      const directoryPath = segments.length > 0 ? segments.join("/") + "/" : null;
      // path ended in / or is empty, extension can only come after the last /,
      // so there is no extension
      if (fullFileName === "") {
        return {
          directory: directoryPath,
          name: null,
          extension: null,
          baseName: null,
        };
      }

      // Match on leading file base name dots, they are accounted for in the file name
      const leadingDotsMatch = fullFileName.match(/^(\.*)(.*)$/);
      const leadingDots = leadingDotsMatch[1];
      const fileNameWithoutLeadingDots = leadingDotsMatch[2];

      // split on dots in rest of file name
      const splitName = fileNameWithoutLeadingDots.split(".");
      // if file has no extension in last segment
      if (splitName.length <= 1) {
        return {
          directory: directoryPath,
          name: fullFileName,
          extension: null,
          baseName: fullFileName,
        };
      }
      // cannot be undefined since length is always positive or 0 and we
      // already returned for lengths 0,1, and maybe 2 when dotfile.
      const extension = splitName.pop();

      // reconstruct the file name using the data we accumulated omitting the
      // extension and separator dot
      const fileName = leadingDots + splitName.join(".");

      return {
        directory: directoryPath,
        name: fileName,
        extension,
        baseName: fullFileName,
      };
    },

    /**
     * Duplicate the selected item
     */
    duplicateSelected() {
      const $selected = $('#file_browser_full_files_table')
        .find('.selected');

      if (!$selected.exists()) {
        return;
      }

      const path = decodeURIComponent(
        $selected.find('.item-path')
          .text()
          .replace('/alfresco/webdav/Sites/', '')
      );
      Gofast.ITHit.duplicate(path);
    },
    /*
    * Duplicate item
    */
    duplicate: function (path, options = {}) {
      path = path.replace("/alfresco/webdav/Sites/", "");
      const parsedPath = Gofast.ITHit.parseFilePath(path);
      if (parsedPath.name == null) {
        console.error("[GoFAST] Cannot duplicate a directory:", {
          path,
          parsedPath,
        });
        return;
      }

      //Push to queue
      Gofast.ITHit.queue.push({
        uuid: Gofast.ITHit.generate_uuid(),
        path: path,
        duplicateArgs: {
          parsedPath: parsedPath,
          options: options,
        },
        destination: parsedPath.directory,
        displayNamePath: parsedPath.baseName + ' (' + path + ')',
        fileName: parsedPath.baseName,
        operation: 'duplicate',
        displayOperation: Drupal.t('duplicate', {}, { context: 'gofast:ajax_file_browser' }),
        progression: 0,
        status: 0
      });
    },
    /*
     * Move selected items
     */
    moveSelected: function (destination) {
      //Get selected items
      var selected = $('#file_browser_full_files_table').find('.selected');

      //Push them to queue
      $.each(selected, function (k, elem) {
        var path = $(elem).find('.item-path').text();
        var fileName = $(elem).find('.item-name').text();
        Gofast.ITHit.queue.push({
          uuid: Gofast.ITHit.generate_uuid(),
          path: path,
          destination: destination,
          displayNamePath: fileName + ' (' + path + ')',
          fileName: fileName,
          operation: 'move',
          displayOperation: Drupal.t('Move', {}, { context: 'gofast:ajax_file_browser' }),
          progression: 0,
          status: 0
        });
      });
      //Disable copy and cut buttons
      $('#file_browser_tooolbar_copy').prop('disabled', true);
      $('#file_browser_tooolbar_cut').prop('disabled', true);
      $('#file_browser_tooolbar_cart_button').prop('disabled', true);
      //Disable manage button
      $('#file_browser_full_container #file_browser_tooolbar_manage').addClass("disabled").removeClass("btn-white").attr("data-toggle", "tooltip").tooltip();
      //Disable cart button
      $('#file_browser_tooolbar_cart_button').prop('disabled', true);
      //Disable contextual actions
      $('#file_browser_tooolbar_contextual_actions').prop('disabled', true);

    },
    /*
     * Download selected items
     */
    downloadSelected: async function () {
      var selected = $('#file_browser_full_files_table').find('.selected');
      let files = [];
      var filesWithoutNodeRefs = [];
      $.each(selected, function (k, elem) {
        var nodeRef = $(elem).find('.item-nodeRef').text();
        if (nodeRef === "undefined") {
          filesWithoutNodeRefs.push($(elem).find('.item-path').text());
        } else {
          files.push({'nodeRef': nodeRef});
        }
      })
      if(filesWithoutNodeRefs.length > 0) {
        nodeRefs = await Gofast.ITHit.getReference(filesWithoutNodeRefs, function (references) {
          references.map((reference) => {
            files.push({nodeRef: reference});
          });
        })
      }
      Gofast.ITHit.downloadFiles(files);
    },
    /**
     * Download list of files
     * format : [{nodeRef: 'xxx'}, {nodeRef: 'xxx'}]
     */
    downloadFiles(files){
      // Check if there are any completed download items in the queue.
      const hasCompletedItems = Gofast.ITHit.queue.some(item => item.status === 4);

      // Create a new download item object.
      const newItem = {
        uuid: Gofast.ITHit.generate_uuid(),
        files: files,
        displayNamePath: Drupal.t('Mass file download', {}, { context: 'gofast:ajax_file_browser' }) + ' ('+files.length+')',
        fileName: Drupal.t('Downloading Files', {}, { context: 'gofast:ajax_file_browser' }),
        operation: 'download_selected',
        displayOperation: Drupal.t('Download', {}, { context: 'gofast:ajax_file_browser' }),
        progression: 0,
        status: 0
      };

      // If there are completed items in the queue, find the index of the last completed item.
      if (hasCompletedItems) {
        const index = Gofast.ITHit.queue.findIndex(item => item.status === 4);

        // Insert the new item before the last completed item.
        Gofast.ITHit.queue.splice(index, 0, newItem);
      } else {
        // If there are no completed items, push the new item to the end of the queue.
        Gofast.ITHit.queue.push(newItem);
      }

    },
    /*
    * Display confirmation modal to process an unzipping
    */
    unzip: function (data, process) {
      if (process) {

        let targetFolderName = $("#unzip-target-folder-input").val();
        if(!validateItemName(targetFolderName, "folder", true)){
          return;
        }
        Gofast.closeModal();
        let items = JSON.parse(data);

        //Queue items for unzipping
        if (!Gofast.ITHit.queue) {
          Gofast.ITHit.queue = [];
        }
        // Push to queue
        const newItem = {
          uuid: Gofast.ITHit.generate_uuid(),
          displayNamePath: Drupal.t('Mass file extraction', {}, { context: 'gofast:ajax_file_browser' }) + ' ('+items.length+')',
          fileName: Drupal.t("Extract files"),
          operation: "unzip",
          displayOperation: Drupal.t("Extract", {}, { context: "gofast" }),
          progression: 25,
          status: 0,
        };

          $.post(location.origin + "/ajax_file_browser/unzip_file", { items: items, targetFolderName: targetFolderName, process_uuid: newItem.uuid })
            .done((res) => {
              if(res.status == "success") {


                // Get the index of the newly added item in the queue
                const item_index = Gofast.ITHit.queue.push(newItem) - 1;

                Gofast.ITHit._increaseFileProgressionInQueue(1, 70, item_index);

                Gofast.toast(res.message);
              } else {
                Gofast.toast(Drupal.t(
                    "Some files may already exists in this space.", {}, {context: "gofast:ajax_file_browser"}), "info",
                    Drupal.t('Please note', {}, {context:'ajax_file_browser'}), '');
              }
            });
      } else {
        //Retrieve back items
        items = JSON.parse(data);
        const title = Drupal.t("Extract File", {}, {context: "gofast:ajax_file_browser"});
        Gofast.addLoading();

        $.post(location.origin + "/ajax_file_browser/get_unzip_modal_content", { items: items, isAjax: true }).done((html) => {
              data = data.replace(/"/g, "&quot;");
              html +=
                  '<button id="extractButton" class="btn btn-warning btn-sm' +
                  ' icon-before' +
                  ' not-form" onmousedown="Gofast.ITHit.unzip(\'' +
                  data +
                  '\', true)"><span class="icon glyphicon glyphicon-archive"></span>' +
                  " " +
                  Drupal.t("Extract", {}, {context: "gofast:ajax_file_browser"}) +
                  "</button>";
              Gofast.modal(html, title);
              Gofast.removeLoading();
            }
        );

        $('#gofast_basicModal').click();
      }
    },
    /*
    * Section UnZip selected items
    */
    unzipSelected: function (selection) {
      if (typeof selection !== "undefined") {
        const data = JSON.stringify([selection]);
        Gofast.ITHit.unzip(selection);
      }
    },
    /*
    * Display confirmation modal to process a compression
    */
    compress: function (data, process) {
      let items;
      if (process) {
        let targetFolderName = $("#zip-target-folder-input").val() + ".zip";
        if(!validateItemName(targetFolderName, "alfresco_item")){
          return;
        }
        Gofast.closeModal();
        items = JSON.parse(data)
        // Create a new compress item object for the queue
          const newItem = {
            uuid: Gofast.ITHit.generate_uuid(),
            displayNamePath: Drupal.t('Mass file compression', {}, { context: 'gofast:ajax_file_browser' }) + ' ('+items.length+')',
            fileName: Drupal.t('Compressing Files', {}, { context: 'gofast:ajax_file_browser' }),
          operation: 'compress_selected',
          displayOperation: Drupal.t('Compress', {}, { context: 'gofast:ajax_file_browser' }),
          progression: 0,
          items: items,
          targetFolderName: targetFolderName,
          status: 0
        };

        Gofast.ITHit.queue.push(newItem);

      } else {
        items = data
        //Retrieve back items
        const title = Drupal.t("Compress",{}, {context: "gofast:ajax_file_browser"});
        Gofast.addLoading();
        $.post(location.origin + "/ajax_file_browser/get_compress_modal_content", { items: items, isAjax: true })
          .done((html) => {
              data = data.replace(/"/g, "&quot;");
              html +=
                '<button id="compressButton" class="btn btn-warning btn-sm' +
              ' icon-before not-form" onmousedown="Gofast.ITHit.compress(\'' +
              data + '\', true)">' +
              '<span class="icon glyphicon glyphicon-archive"></span>' +
              " " +
              Drupal.t('Compress', {}, { context: 'gofast:ajax_file_browser' }) +
              "</button>";
            Gofast.modal(html, title);
            Gofast.removeLoading();
            }
          );
        $('#gofast_basicModal').click();
      }
    },

    /*
     * Process an unzip operation on an item in the queue
     */
    _processUnzip: function (index) {
        $.post(location.origin + "/ajax_file_browser/unzip_file/check_status", { process_uuid: Gofast.ITHit.queue[index].uuid }).done((response) => {

            if (Gofast.ITHit.queue[index]) {
              if (response.status === "IN_PROGRESS") {
                Gofast.ITHit.queue[index].status = 1

                // Try again in 2 seconds
                setTimeout(() => {
                  Gofast.ITHit._processUnzip(index);
                }, 2000)
              } else if (response.status === "DONE") {
                setTimeout( function(){
                  Gofast.ITHit.queue[index] = null;

                  response.messages.success.forEach((message) => {
                    Gofast.toast(message, "success");
                  })
                  response.messages.fail.forEach((message) => {
                    Gofast.toast(message, "warning");
                  })
                  Gofast.ITHit.reload();
                }, 1000);
                return;
              } else {
                Gofast.toast(response.message, "error", Drupal.t("Something went wrong!"), []);
              }
          }
        })
    },
    /*
     * Process a delete operation on a item in the queue
     */
    _processDelete: function (index) {
      var path = Gofast.ITHit.queue[index].path;
      var fileName = Gofast.ITHit.queue[index].fileName;
      //Remove slash at the end if needed
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }

      // Prevent deleting space's home page wiki
      if (Gofast.ITHit.isHomePageWiki(path)) {
        Gofast.toast(
          Drupal.t(
            "You cannot delete a space's home page wiki article (%fileName).",
            { "%fileName": fileName },
            { context: "gofast:ajax_file_browser" },
          ),
          "error",
        );
        Gofast.ITHit.unsetQueueItem(index);
        return;
      }

      //First, we try to open the item
      Gofast.ITHit.Session.OpenItemAsync(path, null, function (asyncResult) {
        if (!asyncResult.IsSuccess) {
          Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName, "warning");
          Gofast.ITHit.queue[index] = null;
          return;
        }

        var item = asyncResult.Result;
        Gofast.ITHit.queue[index].progression = 50;
        //We got the item, ask delete authorization to Drupal
        Gofast.ITHit.authorizeDelete(path, function (auth) {
          Gofast.ITHit.queue[index].progression = 75;
          if (auth) {
            //We do have the autorization, now try to delete it
            item.DeleteAsync(null, function (oAsyncResult) {
              if (oAsyncResult.IsSuccess) {
                //Check if the file was successfully removed as Alfresco can send false
                //positives
                Gofast.ITHit.queue[index] = null;

                // Remove item from ztree
                const decodedPath = decodeURIComponent(path);
                const ztreeElement = Gofast.ITHit.tree.getNodeByParam("path", decodedPath);
                if(ztreeElement){
                  Gofast.ITHit.tree.removeNode(ztreeElement);
                }
                // Refresh: navigate to parent if we were inside the deleted
                // folder, otherwise re-navigate current folder to update the
                // file list on the right side.
                if(Gofast.ITHit.currentPath == decodedPath){
                  const parentPath = decodedPath.split("/").slice(0, -1).join("/")
                  Gofast.ITHit.navigate(parentPath)
                } else {
                  Gofast.ITHit.navigate(Gofast.ITHit.currentPath)
                }
              } else {
                Gofast.toast("<u>" + fileName + "</u><br /><br />" + Drupal.t("Please verify that you are allowed to do that.  If you think this is an error, please contact your administrator.", {}, { context: 'gofast:ajax_file_browser' }), "warning", Drupal.t("This element cannot be deleted", {}, { context: 'gofast:ajax_file_browser' }));
                Gofast.ITHit.queue[index] = null;
                return;
              }
            });
          } else {
            Gofast.toast(Drupal.t("You are not authorized to delete", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName, "warning");
            Gofast.ITHit.queue[index] = null;
            return;
          }
        })
      });
    },
    /*
     * Process a move operation on a item in the queue
     */
    _processMove: function (index) {
      var path = Gofast.ITHit.queue[index].path;
      var destination = Gofast.ITHit.queue[index].destination;
      var fileName = Gofast.ITHit.queue[index].fileName;
      //Remove slash at the end if needed
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }

      //Prevent move of a space
      if (fileName.substr(0, 1) === "_") {
        Gofast.toast(Drupal.t("You can only move a space from it's page.", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        Gofast.ITHit.queue[index] = null;
        return;
      }

      // Prevent moving a space's home page article
      if (Gofast.ITHit.isHomePageWiki(path)) {
        Gofast.toast(
          Drupal.t(
            "You cannot move a space's home page wiki article (%fileName).",
            { "%fileName": fileName },
            { context: "gofast:ajax_file_browser" },
          ),
          "error",
        );
        Gofast.ITHit.unsetQueueItem(index);
        return;
      }

      const targetFolderName = destination.split("/").slice(-2)[0]; // since it's a target folder it ends with a "/" so the last item after the split is an empty string hence the slice
      if (targetFolderName == "Wikis") {
        Gofast.toast(Drupal.t("You can't move documents inside a \"Wikis\" folder, only articles.", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        Gofast.ITHit.queue[index] = null;
        return;
      }

      //First, we try to open the item
      Gofast.ITHit.Session.OpenItemAsync(path, null, function (asyncResult) {
        if (!asyncResult.IsSuccess) {
          Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName, "warning");
          Gofast.ITHit.queue[index] = null;
          return;
        }

        var item = asyncResult.Result;
        Gofast.ITHit.queue[index].progression = 30;

        //Then, we try to open the destination folder
        Gofast.ITHit.Session.OpenFolderAsync(destination, null, function (dasyncResult) {
          if (!dasyncResult.IsSuccess) {
            Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + destination, "warning");
            Gofast.ITHit.queue[index] = null;
            return;
          }

          var destinationItem = dasyncResult.Result;
          Gofast.ITHit.queue[index].progression = 40;

          item.MoveToAsync(destinationItem, item.DisplayName, false, null, function (oAsyncResult) {
            if (oAsyncResult.IsSuccess) {
              Gofast.ITHit.queue[index] = null;

              //Remove line in file browser
              var element = $('td:contains("' + path + '")');
              if (element.length !== 0) {
                element.parent().remove();
              }
              //If we are in the destination path, reload
              if (destination === Gofast.ITHit.currentPath) {
                Gofast.ITHit.reload();
              }
            }
            else if (oAsyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.PreconditionFailedException || oAsyncResult.Status.Code === 412) {
              Gofast.toast(Drupal.t('Cannot move this file or directory because it already exists in the destination folder', {}, {context: 'gofast:ajax_file_browser'}), "warning", Drupal.t('Your file cannot be moved', {}, {context: 'gofast:ajax_file_browser'}), []);
              Gofast.ITHit.queue[index] = null;

            }
            else if (destination === '/alfresco/webdav/Sites/_Groups' || destination === '/alfresco/webdav/Sites/_Organisations' || destination === '/alfresco/webdav/Sites/_Public' || destination === '/alfresco/webdav/Sites/_Extranet') {
              Gofast.toast(Drupal.t('You can not upload files in root spaces (Groups, Organizations, Public, Extranet). Please, upload your files in sub-spaces or create them.', {}, {context: 'gofast:ajax_file_browser'}), "warning", Drupal.t('Your file cannot be moved', {}, {context: 'gofast:ajax_file_browser'}), []);
              Gofast.ITHit.queue[index] = null;
            }
            else if (oAsyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.ForbiddenException || oAsyncResult.Status.Code === 403) {

              Gofast.toast(Drupal.t('You do not have the permission to move this item to this destination.',
                      {context: 'gofast:ajax_file_browser'}),
                  "warning", Drupal.t("Your file cannot be moved", {}, {context: 'gofast:ajax_file_browser'}),
                  []
              );
              Gofast.ITHit.queue[index] = null;
            }
            else if (oAsyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.LockedException || oAsyncResult.Status.Code === 423) {
              Gofast.toast(Drupal.t('This file or directory  is currently locked. Please try again later.',
                      {context: 'gofast:ajax_file_browser'}),
                  "warning", Drupal.t("Your file cannot be moved", {}, {context: 'gofast:ajax_file_browser'}),
                  []
              );
              Gofast.ITHit.queue[index] = null;
            }
            else if (oAsyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.NotFoundException || oAsyncResult.Status.Code === 404) {
              Gofast.toast(Drupal.t('This file or directory may have been recently deleted, please kindly refresh this browser tab.',
                      {context: 'gofast:ajax_file_browser'}),
                  "warning", Drupal.t("Your file cannot be moved", {}, {context: 'gofast:ajax_file_browser'}),
                  []
              );
              Gofast.ITHit.queue[index] = null;
            }
            else {
              Gofast.toast(Drupal.t('This file or directory cannot be moved, please make sure it is not locked or that you are authorised to move it.',
                      {context: 'gofast:ajax_file_browser'}),
                  "warning", Drupal.t('Your file cannot be moved', {}, {context: 'gofast:ajax_file_browser'}),
                  []
              );
              Gofast.ITHit.queue[index] = null;

            }
          });
        });
      });
    },
    /*
     * Process a copy operation on a item in the queue
     */
    _processCopy: function (index) {
      var path = Gofast.ITHit.queue[index].path;
      var destination = Gofast.ITHit.queue[index].destination;
      var fileName = Gofast.ITHit.queue[index].fileName;
      //Remove slash at the end if needed
      if (path.substr(-1, 1) === "/") {
        path = path.substring(0, path.length - 1);
      }

      //Prevent copy of a space
      if (fileName.substr(0, 1) === "_") {
        Gofast.toast(Drupal.t("You can't copy/paste a space.", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        Gofast.ITHit.queue[index] = null;
        return;
      }

      //First, we try to open the item
      Gofast.ITHit.Session.OpenItemAsync(path, null, function (asyncResult) {
        if (!asyncResult.IsSuccess) {
          Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName, "warning");
          Gofast.ITHit.queue[index] = null;
          return;
        }

        var item = asyncResult.Result;
        Gofast.ITHit.queue[index].progression = 30;

        //Then, we try to open the destination folder
        Gofast.ITHit.Session.OpenFolderAsync(destination, null, function (dasyncResult) {
          if (!dasyncResult.IsSuccess) {
            Gofast.toast(Drupal.t("Unable to find", {}, { context: 'gofast:ajax_file_browser' }) + " " + destination, "warning");
            Gofast.ITHit.queue[index] = null;
            return;
          }

          var destinationItem = dasyncResult.Result;
          Gofast.ITHit.queue[index].progression = 40;

          item.CopyToAsync(destinationItem, item.DisplayName, true, false, null, function (oAsyncResult) {
            if (oAsyncResult.IsSuccess) {
              Gofast.ITHit.queue[index] = null;

              //Reload file browser
              Gofast.ITHit.reload();
            } else if (oAsyncResult.Error instanceof ITHit.WebDAV.Client.Exceptions.PreconditionFailedException || oAsyncResult.Status.Code == 412) {
              Gofast.toast(Drupal.t("Can't copy/paste", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName + " " + Drupal.t("because this item already exists in the destination folder.", {}, { context: 'gofast:ajax_file_browser' }), "warning");
              Gofast.ITHit.queue[index] = null;
              return;
            } else {
              Gofast.toast(Drupal.t("Please verify that you are allowed to do that. If you think this is an error, please contact your administrator.", {}, { context: 'gofast:ajax_file_browser' }), "warning", Drupal.t("This copy / paste operation cannot be completed", {}, { context: 'gofast:ajax_file_browser' }));
              Gofast.ITHit.queue[index] = null;
              return;
            }
          });
        });
      });
    },
    /*
     * Process an upload operation in the queue
     * This handler won't actually handle the upload, only check for user interaction if needed
     */
    _processUpload: function (index) {
      if(!Gofast.ITHit.queue[index].toValidate || $("#gofast_basicModal").hasClass("show")){
        //Nothing to do
        return;
      }

      const destination = Gofast.ITHit.queue[index].path;
      const targetFolderName = destination.split("/").slice(-2)[0];
      if (targetFolderName == "Wikis") {
        Gofast.toast(Drupal.t("You can't upload documents inside a \"Wikis\" folder.", {}, { context: 'gofast:ajax_file_browser' }), "warning");
        Gofast.ITHit.queue[index] = null;
        return;
      }

      //Check if a default op is already saved
      if(Gofast.ITHit.rememberUploadOp != null){
        Gofast.ITHit._processUploadSubmit(Gofast.ITHit.queue[index].uuid, Gofast.ITHit.rememberUploadOp);
      }else{
        //Retrieve HTML content of the modal and display user interaction
        var html = Gofast.ITHit._processUploadGenerateHTML(Gofast.ITHit.queue[index]);
        Gofast.modal(html, Drupal.t("Overwrite this document ?", {}, {context: "gofast:gofast_ajax_file_browser"}));
      }
    },
    /*
     * Generate HTML for user interraction in an upload process
     */
    _processUploadGenerateHTML: function (item) {
      var path = item.path;
      var fileName = item.fileName;
      var uuid = item.uuid;

      path = decodeURIComponent(path.split("alfresco/webdav/Sites/")[1]);

      var html = "";
      html += Drupal.t("This document already exists in the destination : ", {}, {context: "gofast:gofast_ajax_file_browser"});

      html += "<ul>";
      html += "<li>" + fileName + " ( " + path + " )" + "</li>";
      html += "</ul>";

      html += '<div class="form-item form-type-checkbox checkbox align-items-start d-flex flex-column mb-5">';
      html += ' <label class="checkbox mr-3 switch switch-icon switch-sm gofast-switch-icon" for="rememberUploadOp">';
      html += '   <input type="checkbox" id="rememberUploadOp">';
      html += '     <span class="mr-2"></span>';

      html += Drupal.t("Remember my choice for the current queue", {}, {context: "gofast:gofast_ajax_file_browser"});

      html += ' </label>';
      html += '</div>';

      html += '<button id="overwriteButton" class="btn btn-warning btn-sm icon-before" onclick="Gofast.ITHit._processUploadSubmit(\'' + uuid + '\', 1)">Ecraser</button>';
      html += '<button id="cancelButton" class="btn btn-danger btn-sm icon-before" onclick="Gofast.ITHit._processUploadSubmit(\'' + uuid + '\', 0)">Annuler</button>';

      return html;
    },
    /*
     * Get the user interraction and process it
     * OP 0 - Cancel; OP 1 - Overwrite
     */
    _processUploadSubmit: function (uuid, op){
      var item_index = Gofast.ITHit.queue.findIndex(function (e) {
        return e !== null && e.uuid === uuid;
      });

      if(Gofast.ITHit.queue[item_index] == null){return;}

      Gofast.ITHit.queue[item_index].toValidate = 0;
      Gofast.closeModal();

      //Check for remember setting
      if($("#rememberUploadOp").length && $("#rememberUploadOp")[0].checked){
        Gofast.ITHit.rememberUploadOp = op;
      }

      if(op == 1){
        Gofast.ITHit.queue[item_index].beforeUploadEvent.Upload();
      }else{
        Gofast.ITHit.cancelUpload(uuid);
      }
    },
    _processMultiUploadGenerateHtml: async function() {
      Gofast.ITHit.hasMultiUploadModal = true;
      Gofast.ITHit.promises.multiUploadModal.promise = new Promise((resolve, reject) => {
        Gofast.ITHit.promises.multiUploadModal.resolve = resolve;
        Gofast.ITHit.promises.multiUploadModal.reject = reject;
        Drupal.CTools.Modal.showCtoolsModal($('.bulk_taxonomy').attr("href") + "?upload=" + $(".GofastNodeOg").attr("data-nid"));
        const closeEvent = $(".modal button.close").on("click", () => {
          resolve({});
          $(".modal button.close").off("click", closeEvent);
        });
      });
      await Gofast.ITHit.promises.multiUploadModal.promise;
      Gofast.ITHit.promises.multiUploadModal = {};
    },
    _processMultiUploadSubmit: function(formValues) {
      Gofast.ITHit.queue.forEach(item => item.properties = formValues); // for uploading items
      Gofast.ITHit.promises.multiUploadModal.resolve(formValues); // for already uploaded items
    },
    /*
     * Process a download operation on a item in the queue
     */
    _processDownload: function (index, process) {
      //Prevent overload
      if (!process) {
        setTimeout(function () {
          Gofast.ITHit.downloadTimeout--;
          Gofast.ITHit._processDownload(index, true);
        }, (2000 * Gofast.ITHit.downloadTimeout));
        Gofast.ITHit.downloadTimeout++;
      } else {
        var path = Gofast.ITHit.queue[index].path;
        var fileName = Gofast.ITHit.queue[index].fileName;
        var is_confidential;
        var is_internal;

        //Remove slash at the end if needed
        if (path.substr(-1, 1) === "/") {
          path = path.substring(0, path.length - 1);
        }

        //Ask Drupal for the alfresco reference of the item we try to download
        Gofast.ITHit.getReference(path, function (reference) {
          reference = reference[0];
          if (reference.indexOf('workspace') === -1) {
            Gofast.toast(Drupal.t("Can't download", {}, { context: 'gofast:ajax_file_browser' }) + " " + fileName, "warning");
            Gofast.ITHit.queue[index] = null;
            return;
          }

          //Check if the document is confidential
          is_confidential = Gofast.ITHit.getIsConfidential(reference);
          //Check if the document is Internal Distribution
          is_internal = Gofast.ITHit.getIsInternalDocument(reference);

          if (is_confidential) {
            is_confidential_data = true;
            Gofast.toast(fileName + " " + Drupal.t("can't be downloaded because it's a confidential document", {}, { context: 'gofast:ajax_file_browser' }), "warning");
            Gofast.ITHit.queue[index] = null;
          } else if (is_internal) {
            is_internal_data = true;
            Gofast.toast(fileName + " " + Drupal.t("Can't be downloaded because it's an Internal Distribution document", {}, { context: 'gofast:ajax_file_browser' }), "warning");
            Gofast.ITHit.queue[index] = null;
          } else {
            //Download
            $('<form><input type="hidden" name="id" value="' + reference + '"></form>')
              .attr('action', '/cmis/browser')
              .attr('method', 'get')
              .appendTo('body').submit().remove();
          }
        });
        Gofast.ITHit.queue[index] = null;
      }
    },
    /*
     * Process a download operation on a item in the queue
     */
    _processDownloadSelected: function (index) {
        const files = Gofast.ITHit.queue[index]?.files || [];
        if (files.length) {
          Gofast.ITHit._increaseFileProgressionInQueue(files.length, 90, index);
          //Send request to the server to initiate a new download op of the selected files
          try {
             $.post(location.origin + "/ajax_file_browser/download_selected_files", { files: files, process_uuid: Gofast.ITHit.queue[index].uuid }).done(downloadObject => {
              if (downloadObject.status === 'download_processing' && Gofast.ITHit.queue[index]) {
                // Begin to check download status
                Gofast.ITHit._checkDownloadStatus(Gofast.ITHit.queue[index].uuid, index);
              }
            });
          } catch (error) {
            console.error('Failed to register download: ', error);
          }
        }
    },
    /*
    * Process a compression operation on items in the queue
    */
    _processCompress: function (index) {
      let itemsPath = [];
      Gofast.ITHit.queue[index].items.forEach((item)=>{
        itemsPath.push(item["url"])
      });
      if (itemsPath.length && Gofast.ITHit.queue[index].status == 0) {
        Gofast.ITHit.queue[index].status = 1;
        //Send request to the server to initiate a new download op of the selected files
        try {
           // initiate the compression
          $.post(location.origin + "/ajax_file_browser/compress_files", { itemsPath: itemsPath, targetFolderName: Gofast.ITHit.queue[index].targetFolderName, process_uuid: Gofast.ITHit.queue[index].uuid }
          ).done(()=> {
            Gofast.ITHit._checkCompressionStatus(index);
          })
        } catch (error) {
          console.error('Failed to initiate compression: ', error);
        }
      }
    },

    /**
     * A faker that increases the file operation progression in the queue.
     * Increases file progression in the queue
     * Updates the progression based on the number of files to download,
     * aiming for targetProgression (%) completion.
     * The increment rate is calculated as the targetProgression
     * divided by the expected duration in seconds
     * to complete the operation. It ensures the progression doesn't
     * exceed the targetProgression.
     *
     * The progression is updated in the queue.
     *
     * @param {number} filesLength - The number of files in the operation
     * @param {Integer} targetProgression - The target progression to be achieved.
     * @param {Integer} index - The Queue index the queue item.
     */
    _increaseFileProgressionInQueue : function (filesLength, targetProgression, index) {
        let currentProgression = Gofast.ITHit.queue[index].progression;
      let incrementRate = targetProgression / filesLength;
        incrementRate = Math.round(incrementRate);
      if (currentProgression < targetProgression) {
        currentProgression += incrementRate;
        // Ensure currentProgression is not greater than targetProgression
        if (Gofast.ITHit.queue[index] !== null) {
          if (currentProgression > targetProgression) {
            currentProgression = targetProgression;
          }
          Gofast.ITHit.queue[index].progression = currentProgression;
          setTimeout(() => {
            if(Gofast.ITHit.queue[index] && Gofast.ITHit.queue[index].status !== 3){
              Gofast.ITHit._increaseFileProgressionInQueue(filesLength, targetProgression, index);
            }
          }, 2000);
        }
      }
    },

    /**
     * Check download status and start download once the server is ready with the download file.
     *
     * @param {Integer} process_uuid - The uuid of the download process.
     * @param {Integer} index - The Queue index of the download requeste.
    */
    _completedDownloads: [],
    _checkDownloadStatus: async function (process_uuid, index = null) {
        $.post("/ajax_file_browser/check_file_download_status", { process_uuid: process_uuid }).done((data) => {

          if (data.status === "COMPLETE") {
            if (index !== null) {
              Gofast.ITHit.queue[index].progression = 100;
              Gofast.ITHit.queue[index].status = 4;
            }
            Gofast.ITHit._startDownload(data.nodeRef);
            Gofast.ITHit._handleFileDownloadErrors(data);  // Handles any download errors if present
            Gofast.ITHit._completedDownloads.push(process_uuid);
          } else if(data.status === "FAILED") {
            if (index !== null) {
              Gofast.ITHit.queue[index].progression = 0;
              Gofast.ITHit.queue[index].status = 3;
            }
            Gofast.ITHit._handleFileDownloadErrors(data); // Handles any download errors if present
          }
          else {
            setTimeout(() => {
              Gofast.ITHit._checkDownloadStatus(process_uuid, index)
            }, 2000)
          }
        }).fail(() => {
          Gofast.ITHit._handleFileDownloadErrors({status:"FAILED", failedFiles:[]}); // Handles any download errors if present
        });
    },

    /**
     * Check download status and start download once the server is ready with the download file.
     *
     * @param {Object} downloadObject - The download object of the download batch.
     * @param {Integer} index - The Queue index of the download request.
    */
    _checkCompressionStatus: function (index) {
        $.post(location.origin + "/ajax_file_browser/compress_files/check_status", { process_uuid: Gofast.ITHit.queue[index].uuid }).done((res) => {
        if (res.status === "DONE") {
              Gofast.ITHit.queue[index].progression = Math.round((res.done / res.total) * 100);
            Gofast.ITHit.queue[index].status = 4;
            setTimeout(function () {
              Gofast.toast(Drupal.t("Your files have been compressed successfully.",
              {},{ context: "gofast:ajax_file_browser" }), "success");
              Gofast.ITHit.queue[index] = null;
            }, 2000);
            setTimeout(function () {
              Gofast.ITHit.reload()
            }, 4000);
              return;
        }
        else if (res.status === "IN_PROGRESS") {
              Gofast.ITHit.queue[index].progression = Math.round((res.done / res.total) * 100);
              Gofast.ITHit.queue[index].status = 1;
        }
        else if (res.status === "ERROR") {
            Gofast.ITHit.queue[index].progression = 0;
            Gofast.ITHit.queue[index].status = 3;
            Gofast.toast(Drupal.t("An error occured while compressing your files.",
            {},{ context: "gofast:ajax_file_browser" }), "success");
        }

          setTimeout(() => {
            Gofast.ITHit._checkCompressionStatus(index)
          }, 2000)
        })
    },

    /**
    *  Send file to browser to start download
    *
    * @param {Object} data - The data object of the downlaod request to be downloaded.
    *
    */
    _startDownload:  function (nodeRef) {
      Gofast.toast(Drupal.t('Download started successfully', {}, { context: 'gofast:ajax_file_browser' }), 'success', []);

      location.href = `/ajax_file_browser/download_file?nodeRef=${nodeRef}`;
    },

    /**
     *  Handles any download errors if present alering the user.
     *  @param {Object} data - The data object of the downlaod request to be downloaded.
     */
    _handleFileDownloadErrors :  function (data){
      if(data && data.failedFiles && data.failedFiles.length === 1) {
        if(data.failedFiles[0].isConfidential && !data.failedFiles[0].isInternal ){
            Gofast.toast(data.failedFiles[0].title + ' ' + Drupal.t('could not be included in the download because it is or contains a confidential document.', { context: 'gofast:ajax_file_browser' }), 'warning', []);
        }
        else if(data.failedFiles[0].isInternal && !data.failedFiles[0].isConfidential){
            Gofast.toast(data.failedFiles[0].title + ' ' +  Drupal.t('could not included in the download because it is an internal document.', { context: 'gofast:ajax_file_browser' }), 'warning', []);
        }
        else{
            Gofast.toast(Drupal.t('A file could not be included in the download because it is an internal document.', { context: 'gofast:ajax_file_browser' }), 'warning', []);
        }
      }
    },
    /*
    * Process a duplicate operation on an item in the queue
    */
    _processDuplicate: async function (index) {
      // utils

      // equivalent to Promise.withResolvers
      // but since that is very new and unsupported by some LTS/ESR
      // browser versions it's safer to have this here.
      const promiseResolvers = () => {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };

      const promiseWrap = (callback) => {
        const { promise, resolve, reject } = promiseResolvers();
        const handler = function (ITHitResult) {
          if (!ITHitResult.IsSuccess) {
            reject(ITHitResult);
          } else {
            resolve(ITHitResult);
          }
        };
        callback(handler);
        return promise;
      };

      const setProgress = (value) => (Gofast.ITHit.queue[index].progression = value);
      const replanExecution = () => {
        setProgress(0);
        Gofast.ITHit.queue[index].status = 0;
      };

      /**
       * Extract arguments from queue
       * @type {{
       * path: string,
       *  duplicateArgs: {
       *    options: {noToast?:boolean},
       *    parsedPath: PathParseResult
       *  },
       * destination: string
       * }}
       */
      const {
        path,
        duplicateArgs: { options, parsedPath },
        destination,
      } = Gofast.ITHit.queue[index];

      if (Gofast.ITHit.pathsBeingDuplicated.has(path)) {
        replanExecution();
        return;
      }
      Gofast.ITHit.pathsBeingDuplicated.add(path);
      try {
        // open folder
        const destinationFolder = (
          await promiseWrap((h) =>
            Gofast.ITHit.Session.OpenFolderAsync(
              location.origin + "/alfresco/webdav/Sites/" + destination,
              null,
              h,
            ),
          )
        ).Result;
        setProgress(10);

        // open original item to copy
        const originalItem = (
          await promiseWrap((h) =>
            Gofast.ITHit.Session.OpenItemAsync(
              location.origin + "/alfresco/webdav/Sites/" + path,
              null,
              h,
            ),
          )
        ).Result;
        setProgress(20);

        // try names until one does not exist
        let progress = 20;
        let duplicateFileName;
        const extString = parsedPath.extension == null ? "" : "." + parsedPath.extension;
        for (let i = 1, itemExists = true; itemExists; ++i) {
          duplicateFileName = parsedPath.name + "(" + String(i) + ")" + extString;

          itemExists = (
            await promiseWrap((h) => destinationFolder.ItemExistsAsync(duplicateFileName, h))
          ).Result;
          // update progress after each try getting closer and closer to 55%
          // whilst not really getting there (unless a large amount of tries
          // happen)
          progress += (55 - progress) / 4;
          setProgress(Math.round(progress));
        }
        setProgress(60);

        // copy item
        await promiseWrap((h) =>
          originalItem.CopyToAsync(destinationFolder, duplicateFileName, true, false, null, h),
        );
        setProgress(100);

        if (!options.noToast) {
          //Display toast
          Gofast.toast(
            Drupal.t("File duplicated", {}, { context: "gofast:ajax_file_browser" }),
            "info",
          );
        }
        Gofast.ITHit.reload();
      } catch (e) {
        if (!options.noToast) {
          Gofast.toast(
            Drupal.t("File duplication failed", {}, { context: "gofast:ajax_file_browser" }),
            "error",
          );
        }
        // rethrow, we didn't really handle the error itself.
        throw e;
      } finally {
        Gofast.ITHit.pathsBeingDuplicated.delete(path);
        // unset queue Item
        Gofast.ITHit.queue[index] = null;
      }
    },
    /*
     * Ask Drupal for an Alfresco reference
     */
    getReference: async function (paths, callback) {
      await $.post(location.origin + "/ajax_file_browser/get_reference", { paths: paths}, function (data) {
        callback(data);
      });
    },
    /*
     * Ask Drupal to know if the document is confidential
     */
    getIsConfidential: function (reference) {
      var response = $.ajax({
        url: location.origin + "/ajax_file_browser/is_confidential",
        type: 'POST',
        data: { reference: reference },
        dataType: 'json',
        async: false
      });
      if (typeof (response.responseJSON) != "undefined" && response.responseJSON !== null && response.responseJSON == 1) {
        return true;
      } else {
        return false;
      }
    },

    /*
     * Ask Drupal to know if the document is internal
     */
    getIsInternalDocument: function (reference) {
      var response = $.ajax({
        url: location.origin + "/ajax_file_browser/is_internal",
        type: 'POST',
        data: { reference: reference },
        dataType: 'json',
        async: false
      });
      if (typeof (response.responseJSON) != "undefined" && response.responseJSON !== null && response.responseJSON == 1) {
        return true;
      } else {
        return false;
      }
    },
    /*
     * Go to a node in essential version
    */
    goToNodeEssential: function(href, newtab, name, nid = null){
      Gofast.addLoading();
      const getNodeData = (nid) => {
        $.get('/essential/get_node/'+nid).done((result)=>{
          var node = Gofast.get("node")
          let jsonData = JSON.parse(result)
          if (node == false || node.id != jsonData.id){
            Gofast.set("node", jsonData);
          }

          //Get space path insteads of document path to put in URL
          var spacePath = href.replace("/alfresco/webdav", "");
          spacePath = spacePath.split("/")
          spacePath.pop()
          spacePath = spacePath.join("/")

          if(Gofast.get("node").type == "article"){
            Gofast.Essential.processEssentialAjax("/node/"+nid)
          } else {
            // Give the space path to prevent make useless call to get the path
            Gofast.Essential.goToNode(nid, "node", true, spacePath);
          }
        })
      }
      if(nid != null){
        getNodeData(nid)
      } else {
        $.get(location.origin+'/ajax/getnidfromhref?href='+href).done((nid)=>{
          getNodeData(nid)
        })
      }
    },
    /*
     * Go to a node from File Browser
     * /!\ Legacy ITHit function /!\
     */
    goToNode: function (href, newtab, name, nid = null) {
      var baseUrl = window.location.protocol + "//" + window.location.host;
      // Retrieve the document's nid.
      $.post(baseUrl + '/ajax/getnidfromhref', { href: href.replace(/\&/g, "%26").replace(/\+/g, "%2B") }, function (data) {
        if (data === false || isNaN(data) || data === "false" || data === "") {
          Gofast.removeLoading();
          Gofast.modal('<div class="panel panel-default">\n\
                            <div class="panel-body" id="uploading_progress_panel">\n\
                              <div id="uploading_error_messages" class="alert alert-danger" style="display:none;">\n\
                                <ul></ul>\n\
                              </div>\n\
                              <div id="uploading_buttons_actions_all"></div>\n\
                                <div style="clear:both;" id="uploading_0" file-name="logo gofast détouré_eng.png" xhr-id="0" file-id="0">\n\
\n\                               <div class="loader-replicate"></div>\n\
                                  <span id="uploading_replicating" style="font-weight: bold;">' + Drupal.t('You will be redirected to @path  in a few seconds...', { '@path': window.decodeURI(href.split('/').pop()) }, { 'context': 'gofast:gofast_ajax_file_browser' }) + '</span>\n\
                                </div>\n\
                              </div>\n\
                          </div>', Drupal.t('Almost ready', {}, { 'context': 'gofast' }), {
            'modalSize': {
              'type': 'scale',
              'width': .5,
              'height': .5
            },
            'modalTheme': 'uploading_dragdrop'
          });
          //Start replication as it seems to be needed
          $.ajax({
            url: baseUrl + '/cmis/replicate',
            data: 'href=' + href.replace(/\&/g, "%26").replace(/\+/g, "%2B"),
            dataType: 'json'
          }).done(function (data) {
            $(".modal button.close").trigger("click");
            if (newtab) {
              var win = window.open("/node/" + data, '_blank');
            } else {
              if(Gofast._settings.isEssential && typeof Gofast.ITHit.goToNodeEssential !== "undefined" && !Gofast.isMobile()){
                Gofast.ITHit.goToNodeEssential(href, newtab, name, nid)
              } else if(typeof Gofast.processAjax !== "undefined") {
                Gofast.processAjax('/node/' + data);
              } else {
                window.location.href = window.location.origin + "/node/" + data;
              }
            }
          });
        } else {
          if (newtab) {
            var win = window.open("/node/" + data, '_blank');
          } else {
            if(Gofast._settings.isEssential && typeof Gofast.ITHit.goToNodeEssential !== "undefined" && !Gofast.isMobile()){
              Drupal.settings.title = Drupal.settings.site_name || "GoFAST";
              Gofast.ITHit.goToNodeEssential(href, newtab, name, nid)
            } else if (typeof Gofast.processAjax !== "undefined") {
              Drupal.settings.title = name;
              Gofast.processAjax('/node/' + data);
            } else {
              Drupal.settings.title = name;
              window.location.href = window.location.origin + "/node/" + data;
            }
          }
        }
      });
      return false;
    },
    freezeQueue: function() {
      clearInterval(Gofast.ITHit.intervals.queueLoop);
    },
    /*
     * loop to refresh the current queue
     */
    refreshQueue: function () {
      Gofast.ITHit.intervals.queueLoop = setInterval(function () {
        //Check if we need to stop the queue loop
        if ($("#file_browser_full_container").length === 0) {
          Gofast.ITHit.activeQueue = false;
          clearInterval(Gofast.ITHit.intervals.queueLoop);
          return;
        }
        Gofast.ITHit.activeQueue = true;
        // we map the original index so we can add it to the item DOM element, gaining the ability to treat the item DOM and item queue simultaneously
        var items = Gofast.ITHit.queue
          .map(function (e, i) {
              return {originalIndex: i, originalItem: e}
          })
          .filter(function (e) {
          return e.originalItem !== null;
        });

        var upload_message_elem = $("#file_browser_full_upload_label").parent();
        if (items.length === 0) {
          //Clear index as there is no item in the queue
          Gofast.ITHit.queue = [];

          //Display upload informative message
          upload_message_elem.removeClass('d-none');
        }else{
          //Hide upload informative message
          upload_message_elem.addClass('d-none');
        }

        //Prevent graphic overload
        var more = 0;
        var itemsLength = items.length;
        if (items.length > 15) {
          itemsLength = 15;
          more = items.length - 15;
        }

        //Configure custom scrollbar to replace the legacy
        $("#file_browser_full_upload_table").mCustomScrollbar({
          theme: "dark-thin"
        });

        $(".file_browser_full_upload_element").remove();
        for (var i = 0; i < itemsLength; i++) {
          //Format the item
          itemHTML = "";
          var item = items[i].originalItem;
          var originalIndex = items[i].originalIndex;
          var itemHTML = Gofast.ITHit._formatQueueItem(item, originalIndex);

          //Add the item to the list after removing the current items of the list
          var processedItem = $('#file_browser_full_upload_table').find('tbody:last-child').append(itemHTML);
          processedItem = processedItem.find('tr').last();

          //Attach event handlers to the processed item
          Gofast.ITHit._attachQueueEvents(item, processedItem);
        }
        if (more !== 0) {
          itemHTML = "<tr class='file_browser_full_upload_element' style='width:100%; display: inline-block;'><td style='width:5%;'></td><td style='width:75%;'>" + more + " " + Drupal.t('more items in the queue', {}, { context: 'gofast:ajax_file_browser' }) + "</td></tr>";
          $('#file_browser_full_upload_table').find('tbody:last-child').append(itemHTML);
        }
      }, 700);
    },
    /*
     * loop to process the current queue
     * This function is not part of graphic implementation, it will process the
     * queued items in background
     */
    processQueue: async function () {
      Gofast.ITHit.processingQueue = true;
      let queueHasUpload = false;
      var items = Gofast.ITHit.queue.filter(function (e) {

        //!! debug TC !!
        if (e !== null) {
          if (e.operation == "upload") {
            queueHasUpload = true;
            Gofast.additionalGFBNodes.forEach(function (item, index) {
              if (e.path.includes(item)) {
                console.log("cancel upload " + e.uuid);
                Gofast.ITHit.cancelUpload(e.uuid);
              }
            });

          }
        }
        return e !== null;
      });

      //Get the number of queued elements
      var queued_count = items.length;

      //Get the number of processing elements
      var active_count = items.filter(function (e) {
        return e.status === 1;
      }).length;

      //Check if we have something to do this processing
      if (queued_count !== 0 && active_count < 3 && queued_count > active_count) {
        //Get the pending items
        var pending_items = items.filter(function (e) {
          return e.status === 0;
        });
        if (queued_count < 3) {
          var max_count = queued_count;
        } else {
          var max_count = 3
        }
        while (active_count < max_count) { //Stop the processing when we reached this limit
          var item = pending_items.shift();
          if (item === undefined) {
            break;
          }
          var item_uuid = item?.uuid;
          var item_index = Gofast.ITHit.queue.findIndex(function (e) {
            return e !== null && e.uuid === item_uuid;
          });

          if(Gofast.ITHit.queue[item_index].operation != 'upload' && Gofast.ITHit.queue[item_index].operation != 'compress_selected'){
            //Before anything, we update the status and progression of this item
            //so we need to find the item index using integrated uuid
            Gofast.ITHit.queue[item_index].status = 1;
            Gofast.ITHit.queue[item_index].progression = 25;
          }

          //Now, we can send the item to the proper processing function
          switch(Gofast.ITHit.queue[item_index].operation){
            case 'duplicate':
              Gofast.ITHit._processDuplicate(item_index);
              break;
            case 'delete':
              Gofast.ITHit._processDelete(item_index);
              break;
            case 'move':
              Gofast.ITHit._processMove(item_index);
              break;
            case 'download':
              Gofast.ITHit._processDownload(item_index);
              break;
            case 'download_selected':
              Gofast.ITHit._processDownloadSelected(item_index);
              break;
            case 'compress_selected':
              Gofast.ITHit._processCompress(item_index);
              break;
            case 'copy':
              Gofast.ITHit._processCopy(item_index);
              break;
            case 'unzip':
              Gofast.ITHit._processUnzip(item_index);
              break;
            case 'upload':
              //This will just check if a user interraction is needed, not actually process the upload as it is handeled by ITHit
              Gofast.ITHit._processUpload(item_index);
              break;
          }
          active_count++;
        }
      }else{
        //Reset queue variables as the queue is cleared
        Gofast.ITHit.rememberUploadOp = null;
      }

      setTimeout(function () { //Run again in 500ms
        Gofast.ITHit.processQueue();
      }, 500);
    },
    generate_uuid: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    /*
     * Ask Drupal (OG) if we have the right to delete an item
     * Call the passed callback with true or false
     */
    authorizeDelete: function (path, callback) {
      $.post(location.origin + "/ajax_file_browser/right/delete", { path: path }, function (data) {
        if (data.trim() === "GRANTED") {
          callback(true);
        } else {
          callback(false);
        }
      });
    },
    /*
     * Handle drag start event
     */
    moveDragStart: function (e) {
      if ($("#rename-form").length !== 0 || $("#new-folder-form").length !== 0) {
        e.preventDefault();
        return false;
      }
      var selected = $('#file_browser_full_files_table').find('.selected');
      var selectedDom = selected.get();

      var ua = window.navigator.userAgent;
      var msie = ua.indexOf("MSIE ");

      if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {  // Internet Explorer
      } else {
        //Clear Drag and drop elements
        $('#dragndrop_file_browser').remove();

        //Replace ghost of the drag by a file(s)/folder(s)/files+folders icon
        //regarding what was selected
        if (selected.length === 1) { //One item selected
          if (selected.find(".item-real-type").text() === "Resource") {
            var ghost = $('<i id="dragndrop_file_browser" class="fa fa-file-o" aria-hidden="true"></i>');
          } else {
            var ghost = $('<i id="dragndrop_file_browser" class="fa fa-folder-open-o" aria-hidden="true"></i>');
          }
        } else { //Multiple items selected
          var ghost = $('<i id="dragndrop_file_browser" class="fa fa-files-o" aria-hidden="true"></i>');
        }
        $('body').append(ghost);
        ghost.css('position', 'absolute');
        ghost.css('font-size', '60px');
        ghost.css('top', '0px');
        ghost.css('left', '-100px');
        var ghostDom = ghost.get(0);
        e.dataTransfer.setDragImage(ghostDom, 0, 0);
        e.dataTransfer.setData('text', 'anything');
      }
    },
    /*
     * Handle drag over event
     */
    moveDragOver: function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      var item = $(e.currentTarget);
      var itemTitle = item.find('.node_name').text();
      if (itemTitle == '_Groups' || itemTitle == '_Public' || itemTitle == '_Organisations' || itemTitle == '_Extranet') {
        item.css('border-color', '#ebccd1');
        item.css('background-color', '#f2dede');
        item.css('color', '#a94442');
        item.css("border", "dashed 1px #a94442");
      } else {
        item.find('.node_name').css("font-weight", "bold");
        item.css("color", "#428bca");
        item.css("border", "dashed 1px #337ab7");
      }
    },
    /*
     * Handle drag leave event
     */
    moveDragLeave: function (e) {
      var item = $(e.currentTarget);
      item.find('.node_name').removeAttr('style');
      item.removeAttr('style');
    },
    /*
     * Handle drop event
     */
    moveDrop: function (e) {
      var item = $(e.currentTarget);

      item.find('.node_name').removeAttr('style');
      item.removeAttr('style');

      var node = item.parent();
      var znode = Gofast.ITHit.tree.getNodeByParam("tId", node[0].id);
      var data = e.dataTransfer.getData("text");
      if ((typeof e.dataTransfer.items !== "undefined" && e.dataTransfer.items !== null && e.dataTransfer.items.length == 1 && e.dataTransfer.items[0].kind === "string") || (typeof e.dataTransfer.files !== "undefined" && e.dataTransfer.files !== null && e.dataTransfer.files.length == 0) || (data == "anything")) { //Internal d&d
        Gofast.ITHit.moveSelected(znode.path);
        e.stopPropagation();
        e.preventDefault();
      } else { //External d&d
        Gofast.ITHit.dropPath = true;
        var fullPath = znode.path;

        //Remove slash at the end if needed
        if (fullPath.substr(-1, 1) === "/") {
          fullPath = fullPath.substring(0, fullPath.length - 1);
        }

        Gofast.ITHit.Uploader.SetUploadUrl(location.origin + znode.path);
      }
    },

    /*
     * Handle Drag over event (inside the browser)
     */
    insideDragOver: function (e) {
      e.preventDefault();
      var target = e.currentTarget;
      var path = $(target).find('.item-path').text();
      if (path == '/alfresco/webdav/Sites/_Groups/' || path == '/alfresco/webdav/Sites/_Extranet/' || path == '/alfresco/webdav/Sites/_Organisations/' || path == '/alfresco/webdav/Sites/_Public/') {
        $(target).css('background-color', '#f2dede');
        $(target).css('border-color', '#ebccd1');
        $(target).css('color', '#a94442');
      } else {
        $(target).css('border', '2px dashed #a3a3a3');
      }
    },

    /*
     * Handle Drag leave event (inside the browser)
     */
    insideDragLeave: function (e) {
      var target = e.currentTarget;
      $(target).css('background-color', 'white');
      $(target).css('color', '#777');
      $(target).css('border', 'none');
    },

    /*
     * Handle Drop event (inside the browser)
     */
    insideDrop: function (e) {
      var target = e.currentTarget;
      $(target).css('background-color', 'white');
      $(target).css('color', '#777');
      $(target).css('border', 'none');

      var path = $(target).find('.item-path').text();
      var data = e.dataTransfer.getData("text");

      if ((typeof e.dataTransfer.items !== "undefined" && e.dataTransfer.items !== null && e.dataTransfer.items.length == 1 && e.dataTransfer.items[0].kind === "string") || (typeof e.dataTransfer.files !== "undefined" && e.dataTransfer.files !== null && e.dataTransfer.files.length == 0) || (data == "anything")) { //Internal d&d
        Gofast.ITHit.moveSelected(path);
        e.stopImmediatePropagation();
        e.preventDefault();
      } else { //External d&d
        Gofast.ITHit.dropPath = true;
        var fullPath = path;

        //Remove slash at the end if needed
        if (fullPath.substr(-1, 1) === "/") {
          fullPath = fullPath.substring(0, fullPath.length - 1);
        }

        Gofast.ITHit.Uploader.SetUploadUrl(location.origin + decodeURIComponent(decodeURIComponent(path)));
      }
    },
    /*
     * Set Drupal variable to contain the selected items and call back itelfs to
     * do an action with this bulk (taxonomy, location mass management..)
     */
    bulkSelected: function (e, path) {
      var element = $(e.target);
      //Stop propagation of the click event
      e.preventDefault();
      e.stopImmediatePropagation();
      var data = [];

      if (path) {
        data.push({ url: path, type: "Folder" });
      } else {
        //Get selected elements
        var selected = $('.gfb-cbx:checked').parents('.file_browser_full_files_element').find('.item-path');
        if (selected.length == 0) {
          var selected = $('#file_browser_mobile_files_table').find('.selected').find('.item-path');
        }
        $.each(selected, function (k, elem) {
          var path = elem.innerText;

          //Remove slash at the end if needed
          if (path.substr(-1, 1) === "/") {
            path = path.substring(0, path.length - 1);
          }

          var type = $(elem).parent().find('.item-real-type').text();
          data.push({ url: path, type: type });
        });
      }

      data = JSON.stringify(data);

      //Send selected elements to Drupal
      var user_id = Gofast.get("user").uid;
      $.post("/gofast/variable/set", { name: "ithit_bulk_" + user_id, value: data }).done(function (response) {
        if ($(element[0]).hasClass('manage-taxonomy') || $(element[0]).parentsUntil('ul').hasClass('manage-taxonomy')) {
          $('.bulk_taxonomy').click();
        } else if ($(element[0]).hasClass('add-locations') || $(element[0]).parentsUntil('ul').hasClass('add-locations')) {
          $('.bulk_add_locations').click();
        } else if ($(element[0]).hasClass('manage-publications') || $(element[0]).parentsUntil('ul').hasClass('manage-publications')) {
          $('.bulk_publications').click();
        } else if ($(element[0]).hasClass('manage-mail-sharing') || $(element[0]).parentsUntil('ul').hasClass('manage-mail-sharing')) {
          $('.bulk_mail_sharing').click();
        } else if ($(element[0]).hasClass('bulk-archive') || $(element[0]).parentsUntil('ul').hasClass('bulk-archive')) {
          $('.bulk_archive').click();
        } else if ($(element[0]).hasClass('compress-files') || $(element[0]).parentsUntil('ul').hasClass('compress-files')) {
          Gofast.ITHit.compress(data)
        } else if ($(element[0]).hasClass('unzip-files') || $(element[0]).parentsUntil('ul').hasClass('unzip-files')) {
          Gofast.ITHit.unzipSelected(data)
        } else if ($(element[0]).hasClass('download-folder') || $(element[0]).parentsUntil('ul').hasClass('download-folder')) {
            Gofast.ITHit.downloadSelected(data);
        }  else {
          $('.bulk_add_to_cart').click();
        }
      });
    },
    getSelectNodeRefs: function () { // selectedNodeRefs (sne)
      let selectedNodeRefs = []
      let sne = $('.gfb-cbx:checked').parents('.file_browser_full_files_element').find('.item-nodeRef')

      if (sne.length === 0) {
        sne = $('#file_browser_mobile_files_table').find('.selected').find('.item-nodeRef')
      }
      $.each(sne, function (k, elem) {
        selectedNodeRefs.push(elem.innerText)
      });
      return selectedNodeRefs;
    },
    linkToFolder: function (path,nid) {
      Gofast.copyToClipboard(Gofast.get('baseUrl') + "/node/"+nid+"?path=" + encodeURIComponent(path));
    },
    /*
     * Wait for the upload modal to be processed and then, tells to ITHit lib to
     * listen the input
     */
    attachInputEvents: function () {
      var waitProcess = setInterval(function () {
        if ($("[id^=edit-gofast-file-browser-upload-input]").length) {
          Gofast.ITHit.Uploader.Inputs.AddById($("[id^=edit-gofast-file-browser-upload-input]")[0].id);
          clearInterval(waitProcess);
        }
      }, 200);
    },
    /*
     * Add a folder to bookmarks
     */
    bookmarkFolder: function (path) {
      $.post(location.origin + "/ajax_file_browser/bookmark_folder", { href: path }, function () {
        Gofast.toast(Drupal.t("Folder added to bookmarks"), "success");
        $(".block-bookmarks").data('forceRefresh', true);
        Gofast.block.loadIfNeeded($(".gofast-block"));
      });
    },

    /*
     * Remove a folder from bookmarks
     */
    unbookmarkFolder: function (path) {
      $.post(location.origin + "/ajax_file_browser/bookmark_folder", { href: path }, function () {
        Gofast.toast(Drupal.t("Folder removed from bookmarks"), "success");
        $(".block-bookmarks").data('forceRefresh', true);
        Gofast.block.loadIfNeeded($(".gofast-block"));
      });
    },

    /*
     * Add new alfresco_item
     */
    addAlfrescoItem: function (event) {
      event.preventDefault();
      event.stopPropagation();
      Gofast.addLoading();
      var browser_location = window.location.href;
      var browser_path = Gofast.getAllUrlParams(browser_location).path;
      $.post(location.origin + '/gofast/browser/path/get_rules', { href: browser_path }, function (data) {
        if (data == 2) {
          Gofast.removeLoading();
          Gofast.toast(Drupal.t('You don\'t have write permission in this group'), "warning");
        } else if (data == 1) {
          Gofast.removeLoading();
          Gofast.toast(Drupal.t('You can\'t write to this group because it is archived'), "warning");
        } else {
          var browser_href = '/node/add/alfresco-item?path=' + browser_path;
          Gofast.processAjax(browser_href);
        }
      });
    },

    /*
     * Add new article
     */
    addArticle: function(event) {
        event.preventDefault();
        event.stopPropagation();
        Gofast.addLoading();
        var browser_path = encodeURI(Gofast.ITHit.currentPath.replace("/alfresco/webdav", ""));
        $.post(location.origin + '/gofast/browser/path/get_rules' , {href:browser_path} ,function(data){
        if (data == 2){
            Gofast.removeLoading();
            Gofast.toast(Drupal.t('You don\'t have write permission in this group'),"warning");
        }else if (data == 1){
            Gofast.removeLoading();
            Gofast.toast(Drupal.t('You can\'t write to this group because it is archived'),"warning");
        }else{
            var browser_href = '/node/add/article?path=' + browser_path;
            Gofast.processAjax(browser_href);
        }
        });
    },

    /*
     * Resize the browser in the full browser page
     */
    reset_full_browser_size: function () {
      var size = window.innerHeight - 400;

      // height
      $("#file_browser_tree_and_files").height(size);
      $("#file_browser_full_tree_container").height(size);
      $("#file_browser_full_tree_element").height(size);
      if(Gofast._settings.isEssential){
        $("#mobile_file_browser_full_files_container").height(size);
      } else {
        $("#file_browser_full_files_container").height(size);
      }

      // width
      $("#file_browser_full_tree_container").width("30%");
      $("#file_browser_full_files_container").width("70%");
      $("#file_browser_full_files_container table").width($("#file_browser_full_files_container").width() - 20);
      $("#file_browser_full_files_container").css("margin-left", "30%");
      $('#name_header').width('45%');
      $('#size_header').width('10%');
      $('#type_header').width('8%');
      $('#modified_header').width('12%');

      // columns
      $('#name_header').trigger('resize', ["fromResize"]);
      $('#size_header').trigger('resize', ["fromResize"]);
      $('#type_header').trigger('resize', ["fromResize"]);
      // Round the KB size to the nearest integer in the file browser
      let kbTds = $('#file_browser_full_files_table .item-size:contains("ko")');
      kbTds.each(function() {
        let currentValue = $(this).text();
        let size = currentValue.match(/\d+(\.\d+)?/)[0];
        let roundedSize = Math.round(parseFloat(size));
        let newValue = currentValue.replace(size, roundedSize.toString());
        $(this).text(newValue);
      });
    },
    initEssentialHistorySelector: function(){
      $('#fileBrowserSelect').on('change', function(opt){
        var navigatePath = $('option:selected',this).attr('value');

        if(navigatePath != ""){
          Gofast.ITHit.navigate(navigatePath, false, true, null, null, null, "click")
          $('#fileBrowserSelect').val("")
        }
      })

      const getFullNavigationHistory = () =>
        window.sessionStorage
          .getItem("browserFullNavigationHistory_" + Gofast.get("user").uid)
          ?.split(":") ?? null;

      const getNavigationHistoryIndex = () => {
        const indexString = window.sessionStorage.getItem(
          "browserNavigationHistoryIndex_" + Gofast.get("user").uid,
        );
        if (indexString == null) {
          return null;
        }
        return parseInt(indexString);
      };

      $('#backHistory').on('click', function(){
        var navigationArray = getFullNavigationHistory();
        var navigationIndex = getNavigationHistoryIndex();

        if (navigationArray == null || navigationIndex == null) {
          console.warn('GOFAST: Unable to load history in essential version');
          return;
        }

        if(navigationIndex > 0) {
          window.sessionStorage.setItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid, navigationIndex-1)
          Gofast.ITHit.navigate(navigationArray[navigationIndex-1], false, true, null, null, null, "back")
        }
      })

      $('#nextHistory').on('click', function(){
        var navigationArray = getFullNavigationHistory();
        var navigationIndex = getNavigationHistoryIndex();

        if (navigationArray == null || navigationIndex == null) {
          console.warn('GOFAST: Unable to load history in essential version');
          return;
        }

        if(navigationIndex+1 < navigationArray.length){
          window.sessionStorage.setItem("browserNavigationHistoryIndex_"+Gofast.get('user').uid, navigationIndex+1)
          Gofast.ITHit.navigate(navigationArray[navigationIndex+1], false, true, null, null, null, "next")
        }
      })

      $('#parentHistory').on('click', function(){
        var navigationArray = getFullNavigationHistory();
        var navigationIndex = getNavigationHistoryIndex();

        if (navigationArray == null || navigationIndex == null) {
          console.warn('GOFAST: Unable to load history in essential version');
          return;
        }
        var currentPath = navigationArray[navigationIndex]

        //Check after /alfresco/webdav/_Sites/
        if (currentPath.split("/").length > 5) {
          var parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
          Gofast.ITHit.navigate(parentPath, false, true, null, null, null, "click")
        }
      })

      $('#select2-fileBrowserSelect-results').load(function(){
        $('#select2-fileBrowserSelect-results').css('max-height', '300px')
      })

      $("#fileBrowserSelect").select2({
        minimumResultsForSearch: Infinity,
        width: 'resolve',
        dropdownCssClass: "dropdownEssentialHistory"
      });
    },

    /*
     * Add item to upload queue by triggering a file input
     */
    triggerFileInput: function() {
      if (!$("#file_browser_full_upload_table_file_input")) {
        return;
      }
      Gofast.ITHit.Uploader.Inputs.AddById('file_browser_full_upload_table_file_input');
      $("#file_browser_full_upload_table_file_input").trigger('click');
    },
    /*
     * Build search query string with the already existing search query and the given path
     */
    buildSearchQueryStringWithPath: function(path){
      path = path.replace("/alfresco/webdav", "")
      let searchParams = new URLSearchParams(location.search);
      searchParams.set("path", path)
      searchParams.sort()
      return decodeURIComponent("?"+searchParams.toString());
    },

    /**
     * Check if a path matches a home page wiki article
     * @param {string} path A file path
     * @returns true if the path is that of a Space's home page
     */
    isHomePageWiki: function(path) {
      const [fileFolderParentName, fileFolderName, fileName] = path
        .split("/")
        .slice(-3)
        .map((segment) => decodeURIComponent(segment));

      if (fileFolderName !== "Wikis") return false;
      return (
        fileName.endsWith(".html") &&
        fileFolderParentName.startsWith("_") &&
        fileName.replace(/\.html$/, "") === fileFolderParentName.replace(/^_/, "")
      );
    },

    /**
     * Removes an item from the queue.
     * @param {number} index The index in the queue of the item to remove
     */
    unsetQueueItem: function(index) {
      Gofast.ITHit.queue[index] = null;
    },

    /**
     * Wrapper namespace around NProgress allowing safe use within the file
     * browser context.
     */
    progress: (() => {
      /**
       * Adds safety checks in a wrapper around a decorated function so that
       * NProgress is safely accessible from within the decorated function,
       * which is only called if safety checks pass.
       *
       * @template {(...args: any[]) => any} T Function type to decorate
       * @param {T} target Function to decorate.
       * @returns {(...args: Parameters<T>) => boolean} New wrapper function with safety checks
       */
      const _safeDecorate = (target) => function (...args) {
        if (!NProgressWrapper._isNProgressSafeToUse()) {
          return false;
        }
        target.apply(this, args);
        return true;
      };

      // Namespace content definition
      const NProgressWrapper = {
        /** Check if NProgress can be used without throwing an error */
        _isNProgressSafeToUse: function () {
          try {
            return Boolean($(NProgress.settings.parent).length);
          } catch (e) {
            console.warn("caught exception while checking for NProgress usability:", e);
            return false;
          }
        },
        /** Safely start progress bar */
        start: _safeDecorate(() => NProgress.start()),
        /** Safely set progress bar value */
        set: _safeDecorate(
          /** @param {number} progress Progress value as float between 0 and 1. */
          (progress) => NProgress.set(progress),
        ),
        /** Safely set progress bar to done state */
        done: _safeDecorate(() => NProgress.done()),
      };
      return NProgressWrapper;
    })(),
  };

  Gofast.ITHit = GFITHit;

  $(document).ready(function () {
    //Init File Browser
    Gofast.ITHit.init();
  });

  function linkToThisFolder(aContextMenuHierarchyItems) {
    if (aContextMenuHierarchyItems[0].ResourceType == "Folder") {
      var href = aContextMenuHierarchyItems[0].Href.replace("/alfresco/webdav", "");
    } else if (aContextMenuHierarchyItems[0].ResourceType == "Resource") {
      var href = aContextMenuHierarchyItems[0].Href.replace("/alfresco/webdav", "").replace(encodeURI(aContextMenuHierarchyItems[0].DisplayName), "");
    }
    Gofast.copyToClipboard(Gofast.get('baseUrl') + "/gofast/browser?path=" + encodeURI(href));
  }

  function validateItemName(itemName, itemType = "folder", isNew = false){
    let isValid = true;
    const isSameName = (otherName) => Gofast.ITHit.isSameItemName(otherName, itemName, isNew);

    if(itemType === "folder"){
      //Prevent users to create folders starting with '_'
      if (itemName.substr(0, 1) === "_") {
        Gofast.toast(Drupal.t("You can't create a folder with a name starting with '_'"), "warning");
        isValid = false
      }
      if (itemName === "Wikis") {
        Gofast.toast(Drupal.t("\"Wikis\" is a reserved folder name"), "warning");
        isValid = false
      }
      if (itemName === "TEMPLATES") {
        Gofast.toast(Drupal.t("\"TEMPLATES\" is a reserved folder name"), "warning");
        isValid = false
      }
      if(itemName.endsWith(".")) {
        Gofast.toast(Drupal.t("You can't create a folder with a name ending with '.'"), "warning");
        isValid = false
      }
      let allFoldersInSpace = $(".file_browser_full_files_element:not(#file_browser_back_button) > td.item-real-type:contains('Folder')");
      allFoldersInSpace = allFoldersInSpace.toArray();
      let alreadyExist = allFoldersInSpace.some((folderItem) => {
        return isSameName($(folderItem).siblings(".item-name").text());
      })
      if(alreadyExist){
        Gofast.toast(Drupal.t("Folder @itemName already exists in this location.", {"@itemName": itemName}, { context: 'gofast:gofast_ajax_file_browser' }), "warning");
        isValid = false;
      }
    } else if(!["group", "organisation", "extranet", "public", "private_space"].includes(itemType)){ // If it's a content
      // Prevent users to rename contents with a name starting with '_'
      if (itemName.substr(0, 1) === "_") {
        Gofast.toast(Drupal.t("You can't name a content with a name starting with '_'"), "warning");
        isValid = false;
      }
      let allContentInSpace = $(".file_browser_full_files_element:not(#file_browser_back_button) > td.item-real-type:contains('Resource')");
      allContentInSpace = allContentInSpace.toArray();
      let alreadyExist = allContentInSpace.some((contentItem) => {
        return $(contentItem).siblings(".item-name").text() == itemName;
      })
      if(alreadyExist){
        Gofast.toast(Drupal.t("Content @itemName already exists in this location.", {"@itemName": itemName}, { context: 'gofast:gofast_ajax_file_browser' }), "warning");
        isValid = false;
      }
    }

    const isPathSegment = ["folder", "group", "organisation", "extranet", "public", "private_space"].includes(itemType);
    if((isPathSegment ? Gofast.ITHit.forbiddenPathCharactersPattern : Gofast.ITHit.forbiddenCharactersPattern).test(itemName)) {
      const itemTypeName = Drupal.t(itemType, {}, {context: "gofast:gofast_ajax_file_browser"});
      Gofast.toast(Drupal.t("You can't create a @itemType with one of these characters @characters", {"@itemType": itemTypeName, "@characters": isPathSegment ? "(\\ / : * ? \" < > | %)" : "(\\ / : * ? \" < > |)"}, {context: "gofast:gofast_ajax_file_browser"}), "warning");
      isValid = false
    }

    // Space titles hit the Alfresco/CMIS limit before the 255 characters of a name.
    const maxLength = isPathSegment && itemType !== "folder" ? (Drupal.settings.maxSpaceNameLength || 255) : 255;
    if(itemName.length > maxLength) {
      Gofast.toast(Drupal.t("The name cannot be longer than @max characters.", {"@max": maxLength}, {context: "gofast:gofast_ajax_file_browser"}), "warning");
      isValid = false
    }

    return isValid;
  }

  if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return k.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return k;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return -1.
        return -1;
      },
      configurable: true,
      writable: true
    });
  }


  $(document).on("click", ".switch.bottom_close", function () {
    $('.mCSB_container_wrapper .mCSB_container').css('left', '0px');
  });

  $(document).on("click", ".switch.center_close", function () {
    $('.mCSB_container_wrapper .mCSB_container').css('left', '0px');
  });

  $(document).ready(function () {
    $(window).resize(function (e, extraParameter = false) {
      if (typeof e === "undefined") {
        return;
      }
      if (typeof e.target.classList !== "undefined" && e.target.classList.contains("ui-resizable")) {
        return;
      }

      if (!extraParameter) {
        Gofast.ITHit.reset_full_browser_size();
      }
    });

    //Implements translations
    Drupal.t("Unable to find this space's folder", {}, { context: 'gofast:ajax_file_browser' });
  });

  // Behavior to setup the manage button drop down menu to use the same
  // contextual menu options as the right click menu.
  Drupal.behaviors.attachFileBrowserManageButtonEvents = {
    attach(context) {
      $(context)
        .find("#file_browser_tooolbar_manage")
        .parent()
        .once("manage-button-dropdown", function () {
          const $dropdownWrapper = $(this);
          const $dropdownMenu = $dropdownWrapper.find(".dropdown-menu").first();
          const closeMenu = () => $dropdownWrapper.filter('.open').dropdown('toggle');

          $dropdownWrapper.on("show.bs.dropdown", function (_e) {
            const result = Gofast.ITHit.populateElementWithContextualMenu({
              root: $dropdownMenu,
              selectedItems: Gofast.ITHit.getFileBrowserSelectedItems(),
              onEmptyMenu() {
                closeMenu();
              }
            });
            if (!result.success) {
              closeMenu();
              return;
            }
            // Since manage button is at the top of the area, align submenu top position to main menu top position
            result.promise.then(function ($menuContents) {
              const menuHeight = $menuContents.height();
              const $submenu = $menuContents.find(".dropdown-submenu").find(".dropdown-menu");
              $submenu.css("cssText", "top : -" + menuHeight + "px !important;");
            });

          });

          $dropdownWrapper.on("hide.bs.dropdown", function (e) {
            $dropdownMenu.empty();
          });
        });
    },
  };
})(jQuery, Gofast, Drupal);
