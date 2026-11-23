
/**
 * @file
 *  Provides GoFast Essential front-end functionalities.
 *
 *  This file is part of the Gofast main library and is loaded on every page.
 *  Do not insert code that has to be run on specific page.
 */

(function ($, Gofast, Drupal) {
  'use strict';

  /**
   * Init Gofast settings and globals
   */

  if(location.hash.startsWith("#comment-")){
    Gofast.focusComment = location.hash.slice(1)
  }

  Gofast.global = Gofast.global || {};
  Gofast.exclude_ajax_url = [];
  Gofast.additionalGFBNodes = [];

    Drupal.behaviors.gofastBootstrapSwitchInit = {
    attach: function(context, settings){
        const strict_search_input = document.querySelector("[item='strict']");

        if (strict_search_input && !strict_search_input.classList.contains("handle-processed")) {
          strict_search_input.classList.add("handle-processed");
          strict_search_input.addEventListener("change", () => {
            Gofast.StrictSearchToggle();
          });
        }
    }
  };

  Drupal.behaviors.hideNodeInfos = {
      attach: function(context, settings){
        if(!Drupal.settings.isEssential){
            $("#pdf_frame").contents().find("#gfPresentationMode").hide();
        }
    }
  };


  Drupal.behaviors.initRenanmeOgOnMobile = {
    attach: function () {
      if (jQuery(".mobile-rename-node").length > 0) {
        //Allow to rename the node
        jQuery(".panel.panel-info").find('.panel-heading').click(function () {
          jQuery("#panel-heading-title").hide();
          jQuery("#panel-heading-title-edit").show();
        });

        jQuery('#panel-heading-title-edit').find('.btn-danger').click(function (e) {
          jQuery("#panel-heading-title").show();
          jQuery("#panel-heading-title-edit").hide();
          e.stopPropagation();
        });

        jQuery('#panel-heading-title-edit').find('.btn-success').click(function (e) {
          jQuery("#panel-heading-title").show();
          jQuery("#panel-heading-title-edit").hide();
          jQuery("#panel-heading-title").html("<div class='loader-deleting'></div>");
          var title = jQuery("#panel-heading-title-edit").find('input').val();

          jQuery.post(location.origin + "/update_node_field", {
            name: "title",
            pk: Gofast.get('node').id,
            value: title
          }, function () {
            location.reload();
          });
          e.stopPropagation();
        });
      }
    }

  }

  Gofast.gofastOpenRenameInputOnMobile = function () {
    jQuery("#panel-heading-title").hide();
    jQuery("#panel-heading-title-edit").show();
  }

  Gofast.gofast_onlyoffice_show_warning = function (link, nid, e) {
    e.preventDefault();
    $('.gofast-node-actions').css('display','none');
    var html_message = "<h2>"+Drupal.t("Warning" , {}, {'context' : 'gofast'})+"</h2>";
    html_message = html_message + "<div>"+Drupal.t("Use OnlyOffice on doc, xls or ppt (or equivalent in Open formats) files will automatically convert it into docx, xlsx or pptx, and this can alter the formatting of the document. If you do not want to transform the format, please use Word or LibreOffice by choosing <b>Edit from my PC</b>." , {}, {'context' : 'gofast'})+"</div>";
    html_message = html_message + "<br /><div><a onClick='Gofast.gofast_onlyoffice_start_file_convert("+nid+",\""+link+"\");' class='btn btn-success gofast-callto'>"+Drupal.t("Continue" , {}, {'context' : 'gofast'})+"</a>";
    //html_message = html_message + "<input style='margin-left:10px;margin-right:6px;' type='checkbox' id='onlyoffice_warning_display' value='onlyoffice_warning_display' />"+Drupal.t("Hide this warning in the futur" , {}, {'context' : 'gofast'});
    html_message = html_message + "</div>";
    Gofast.modal(html_message, Drupal.t("Edit with OnlyOffice" , {}, {'context' : 'gofast'}));
    e.stopPropagation();
  }

  Gofast.gofast_onlyoffice_start_file_convert = function(nid, link) {
    Gofast.addLoading()
    $.post(`/gofast_cmis/convert_file_to_new_format/${nid}`, { fromAjax: true }).done(() => {
      Gofast.closeModal();
      window.open(link, "_blank");
      Gofast.removeLoading()
    });
  }

    Gofast.gofast_refresh_fast_actions_node = function (nid) {
       $.get(location.origin + "/gofast/node-actions/"+nid, {}, function( data ) {
           $("#breadcrumb-alt-actions").replaceWith(data);
           Drupal.attachBehaviors();
      });
  }

  Drupal.behaviors.permalinkToClipBoard = {
    attach: function (context, settings) {
      function attachPermalinkBehavior() {
        $(context).find('.forum-post-number a').on('click', function (e) {
          e.preventDefault();
          // Make sure the permalink has an absolute url.
         /* var basePath = History.getBaseUrl() + Drupal.settings.basePath,
                  pattern = new RegExp('^(?:\/|' + basePath + ')'),
                  permalink = basePath + $(this).attr('href').replace(pattern, '');*/
        var url_relative = $(this).attr('href').replace(Gofast.get('baseUrl'), "");
          Gofast.copyToClipboard(Gofast.get('baseUrl') + url_relative);
          $('body').click();
          return false;
        });

        $(context).find('.permalink').on('click', function (e) {
          e.preventDefault();
          var url_relative = $(this).attr('href').replace(Gofast.get('baseUrl'), "");
          Gofast.copyToClipboard(Gofast.get('baseUrl') + url_relative);
          $('body').click();
          return false;
        }).attr({
          'title': Drupal.t('Copy to clipboard', {}, {'context' : 'gofast'})
        });
      }

      // Attach the behavior to the links when the page loads
      attachPermalinkBehavior();

      // Re-attach the behavior each time a modal is shown
      $(document).on('shown.bs.modal', function () {
        attachPermalinkBehavior();
      });
      // Attr title without tooltips bootstrap
      $('.permalink', context).once('permalink', function (e) {
        $(this).attr({
           'title' : Drupal.t('Copy to clipboard', {}, {'context' : 'gofast'})
        }).click(function (e) {
          e.preventDefault();
        var url_relative = $(this).attr('href').replace(Gofast.get('baseUrl'), "");
          Gofast.copyToClipboard(Gofast.get('baseUrl') + url_relative);
          $('body').click();
          return false;
        });
      });
    }
  };

  Drupal.behaviors.clipBoard = {
    attach: function (context, settings) {
      $('.clipboard:not(.clipboard-processed)').addClass('clipboard-processed').each(function () {
        var clipboard = new ClipboardJS('.clipboard');
        clipboard.on('success', function (e) {
          console.info('Action:', e.action);
          console.info('Text:', e.text);
          console.info('Trigger:', e.trigger);

          Gofast.toast(Drupal.t('Link copied to clipboard !', {}, {'context':'gofast:conference'}));
          e.clearSelection();
        });
      });
    }
  }

  Drupal.behaviors.initializeCustomScrollbar = {
    attach: function (context, settings) {
      Gofast.initializeCustomScrollbar();
    }
  };

  Gofast.customScrollbarResizeHandler = function (e, extraParameter = false) {
    if (extraParameter) {
      return;
    }
    $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').css('height', $(window).height() - 100);
    $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').mCustomScrollbar('update');
  };

  Gofast.initializeCustomScrollbar = function () {
    if(typeof Gofast.get("user") != "undefined"){
        if (Gofast.get("user").uid !== 0) {
            if($('#modalContent').length === 0){
                $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').css({
                  'height': $(window).height() - 100,
                  'position': 'fixed'
                }).mCustomScrollbar({
                  axis: 'y',
                  theme: 'dark',
                  horizontalScroll: false,
                  scrollInertia: 0,
                  mouseWheelPixels: 40,
                  scrollButtons: {
                    enable: true,
                    scrollType: "continuous",
                    scrollSpeed: 25
                  },
                  advanced: {
                    updateOnBrowserResize: false,
                    updateOnContentResize: true
                  },
                  callbacks: {
                    onScroll: function () {
                      //trigger xeditable cancel button to close popover when scroll on mobile and tablet only
                      if ($(".editable-cancel").length && (Gofast.isMobile() || Gofast.isTablet())) {
                        $(".editable-cancel").click();
                      }
                    }
                  }
                }).css({
                  'width': 'initial',
                  'min-width': '180px',
                  // was messing up with user profile page, commented out for now
                  // 'max-width': '400px',
                });

                $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second) .mCSB_draggerContainer').css('padding-bottom', 0);
                // important to attach the event only once otherwise duplicate events will be attached on each behaviors attach
                $(window).off("resize", Gofast.customScrollbarResizeHandler).on('resize', Gofast.customScrollbarResizeHandler);

              if (Gofast._settings.isEssential == true && Gofast.isMobile() == true){
                  jQuery('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').css('max-width', '80%');
                  $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').css('height', "95%");
                } else if (Gofast._settings.isEssential == true && Gofast.isTablet() == true){
                  $('.region-sidebar-second:not(#gofast_mobile_panel .region-sidebar-second)').css('height', "95%");
                }
            }
          }
    }
  };


  /**
 * Ajax callback to show confirm form to restart a service
 */
 Gofast.dashboardStopConfirm = function (service) {
    var sentence_confirmation = Drupal.t('Are you sur you want to stop this service ?', {}, {'context' : 'gofast'});
    var html_content = sentence_confirmation+"<br /><input type='button' class='btn btn-info btn-sm' onClick='Gofast.dashboardRestart(\""+service+"\", \"stop\");' value='"+Drupal.t('Stop', {}, {'context' : 'gofast'})+"'/>";
    Gofast.modal(html_content, Drupal.t('Stop service', {}, {'context' : 'gofast'})+" "+service);
 };
 /**
 * Ajax callback to show confirm form to restart a service
 */
 Gofast.dashboardRestartConfirm = function (service) {
    var sentence_confirmation = Drupal.t('Are you sur you want to restart this service ?', {}, {'context' : 'gofast'});
    var html_content = sentence_confirmation+"<br /><input type='button' class='btn btn-info btn-sm' onClick='Gofast.dashboardRestart(\""+service+"\", \"restart\");' value='"+Drupal.t('Restart', {}, {'context' : 'gofast'})+"'/>";
    Gofast.modal(html_content, Drupal.t('Restart service', {}, {'context' : 'gofast'})+" "+service);
 };

 /**
 * Ajax callback to show confirm form to disable auto-restart
 */
 Gofast.dashboardDisableARConfirm = function (service) {
    var sentence_confirmation = Drupal.t('Are you sur you want to disable auto-restart for this service ?', {}, {'context' : 'gofast'});
    var html_content = sentence_confirmation+"<br /><input type='button' class='btn btn-info btn-sm' onClick='Gofast.dashboardRestart(\""+service+"\", \"disableAR\");' value='"+Drupal.t('Disable auto-restart', {}, {'context' : 'gofast'})+"'/>";
    Gofast.modal(html_content, Drupal.t('Disable auto-restart', {}, {'context' : 'gofast'})+" "+service);
 };

  /**
 * Ajax callback to show confirm form to disable auto-restart
 */
 Gofast.dashboardEnableARConfirm = function (service) {
    var sentence_confirmation = Drupal.t('Are you sur you want to enable auto-restart for this service ?', {}, {'context' : 'gofast'});
    var html_content = sentence_confirmation+"<br /><input type='button' class='btn btn-info btn-sm' onClick='Gofast.dashboardRestart(\""+service+"\", \"enableAR\");' value='"+Drupal.t('Enable auto-restart', {}, {'context' : 'gofast'})+"'/>";
    Gofast.modal(html_content, Drupal.t('Enable auto-restart', {}, {'context' : 'gofast'})+" "+service);
 };

/**
 * Ajax callback to show confirm form to restart a service
 */
 Gofast.dashboardRestart = function (service, action) {
   if(action == "restart"){
        $.ajax({
                           url:"/gofast/dashboard/restart?service="+service,
                           type: "GET",
                           dataType:'json',
                           success:function(response){
                             if(response == "OK"){
                                 var html_content = Drupal.t('The service will be restarted in few minutes', {}, {'context' : 'gofast'});
                                 Gofast.modal(html_content, Drupal.t('Restart service', {}, {'context' : 'gofast'}));
                             }else{
                                 var html_content = Drupal.t('An error occured', {}, {'context' : 'gofast'});
                                 Gofast.modal(html_content, Drupal.t('Error', {}, {'context' : 'gofast'}));
                             }
                           }
                         });
  }else if(action == "stop"){
         $.ajax({
                           url:"/gofast/dashboard/stop?service="+service,
                           type: "GET",
                           dataType:'json',
                           success:function(response){
                             if(response == "OK"){
                                 var html_content = Drupal.t('The service will be stopped in few minutes', {}, {'context' : 'gofast'});
                                 Gofast.modal(html_content, Drupal.t('Stop service', {}, {'context' : 'gofast'}));
                             }else{
                                 var html_content = Drupal.t('An error occured', {}, {'context' : 'gofast'});
                                 Gofast.modal(html_content, Drupal.t('Error', {}, {'context' : 'gofast'}));
                             }
                           }
                         });
  }else if(action == "enableAR" || action == "disableAR"){
         $.ajax({
                           url:"/gofast/dashboard/autorestart?service="+service+"&action="+action,
                           type: "GET",
                           dataType:'json',
                           success:function(response){
                             if(response == "OK"){
                                 if(action == "enableAR"){
                                    var html_content = Drupal.t('The AR is now enabled for this service', {}, {'context' : 'gofast'});
                                 }else if(action == "disableAR"){
                                    var html_content = Drupal.t('The AR is now disabled for this service', {}, {'context' : 'gofast'});
                                 }
                                 Gofast.modal(html_content, Drupal.t('Auto restart', {}, {'context' : 'gofast'}));
                             }else{
                                 var html_content = Drupal.t('An error occured', {}, {'context' : 'gofast'});
                                 Gofast.modal(html_content, Drupal.t('Error', {}, {'context' : 'gofast'}));
                             }
                           }
                         });
  }
 };

  /**
   * Update status/warning/error messages. To use in ajax callbacks.
   */
  Gofast.updateStatusMessages = function (data) {
    // We don't use replaceWith() to prevent multiple replacements (one for each
    // previous instance of '.alert').
    var el = $('.alert:first').prev() || $('.page-header');
    $('.alert').remove();
    el.after(data);
  };

  Gofast.removeCommentsBadge = function() {
    $('a[href=#document__commentstab]').each(function() {
      $(this).on("show.bs.tab", function() {
        $("span#gofast-comment-notifiation").each(function() {
          $(this).remove();
          if($("#metadataSideButton > .red-dot").length){
            $("#metadataSideButton > .red-dot").remove()
          }
        });
      });
    });
  };

  Gofast.loadcomments = function (nid, noScroll = false) {
  // In Essential it's possible to have two comment container in the same page (e.g. Document page on top of forum layer)
  var commentContainers = $("[id=comments-container]:not(.processed)");
  commentContainers.each((i, commentContainer) => {
    commentContainer = $(commentContainer)
    commentContainer.addClass("processed");
    if(!Gofast._settings.isEssential){
      $("#gofast_over_content .text-center .pagination").html("<div class='loader-chat'></div>");
    }
    var hash = ""
    if (location.href.indexOf("#comment") != -1) {
      hash = location.href.substring(location.href.indexOf("#") + 1);
    }
    if(Gofast.focusComment != undefined){
      if(hash == ""){
        hash = Gofast.focusComment
      }
      delete(Gofast.focusComment)
    }
    Gofast.removeLoading();
    $.ajax({
      url: Drupal.settings.gofast.baseUrl + '/gofast/all_comments/render/' + nid,
      type: 'GET',
      dataType: 'html',
      async: true,
      success: function (content) {
        commentContainer.html(content);
        commentContainer.css("height", "");
        if (noScroll == false) {
          Gofast.scrollToComment("#" + hash);
        }
        setTimeout(function () {
          Drupal.attachBehaviors(commentContainer);
          Gofast.checkReply();
        }, 500);
      },
      error: function(){
        commentContainer.removeClass("processed");
      }
    });
  })
  };

  Gofast.loadtasks = function (nid) {
    if($("#lightDashboardDocumentMy #bonita_form_process").hasClass('forcefully-loaded')){
        $("#lightDashboardDocumentMy #bonita_form_process").removeClass('forcefully-loaded');
        return;
    }
    $.ajax({
      url: Drupal.settings.gofast.baseUrl + '/gofast/all_tasks/render/' + nid, // change it to taskes
      type: 'GET',
      dataType: 'html',
      async: true,
      success: function (content) {
        $("#tasktab-container").html(content);
        Drupal.attachBehaviors("#tasktab-container");
      }
    });
  };

  Gofast.loadextrametadata = function (nid) {
    $.ajax({
      url: Drupal.settings.gofast.baseUrl + '/gofast/extra_metadata/render/' + nid, // change it to taskes
      type: 'GET',
      dataType: 'html',
      async: true,
      success: function (content) {
        content = JSON.parse(content);
        $.each(content, function (indexInArray, extraMetadata) {
          $("#" + extraMetadata.id + " #extra-metadata-container").html(extraMetadata.theme);
        });
        Drupal.attachBehaviors("#extra-metadata-container");
      }
    });
  };


  Gofast.historyTab = function (nid, tabId = "#document__historytab") {
    if ($(tabId).find("#historytab-container").hasClass("processed")) {
      return;
    }
    $(tabId).find("#historytab-container").addClass("processed");
    $.ajax({
      url: Drupal.settings.gofast.baseUrl + '/gofast/history/render/' + nid,
      type: 'GET',
      dataType: 'html',
      async: true,
      success: function (content) {
        $(tabId).find("#historytab-container").html(content);
        Drupal.attachBehaviors(`${tabId} #historytab-container`);
      }
    });
  };

  // Re-rendered tab headers come with Informations active: highlight the link of the pane actually shown
  Gofast.syncNodeTabsHeader = function () {
    $("#node-tabsHeader").each(function () {
      const paneId = $(this).closest(".card").find(".tab-content").first().children(".tab-pane.active").attr("id");
      if (!paneId) {
        return;
      }
      $(this).find("a.active").removeClass("active");
      $(this).children("ul").each(function () {
        const $link = $(this).find(`a[data-toggle="tab"][href="#${paneId}"]`).first().addClass("active");
        $link.closest(".dropdown").children(".dropdown-toggle").addClass("active");
      });
    });
  };

  Gofast.handleActiveOnOGDropdownTabs = function () {
    if (window.location.hash == "#document__tasktab") {
      $("#lightDashboardDocumentMyParentTab").click();
    }
    if (window.location.hash == "#document__infotab" || window.location.hash.indexOf('#document__extra_metadata') !== -1 ) {
      $("#node-tabsHeader a").removeClass("active");
      $(".header_info_tab").addClass("active");
    }
    if (window.location.hash.startsWith("#document__historytab")) {
      $("[href='#document__historytab']").click();
    }
    if (window.location.hash.startsWith("#document__audittab")) {
      $("[href='#document__audittab']").click();
    }
  }
  
  Gofast.highlightEmptyHomePageItem = function(space_path = null){
    if(space_path == null){
      let searchParams = new URLSearchParams(location.search)
      space_path = searchParams.get("path")
      if(!space_path){
        return
      }
    }
    $("#empty-home-page-wiki").addClass("d-none")
    let spaceId = $(".essentialFileBrowser").attr("data-nid");
    let $targetPageElement = $("#mobile_file_browser_wiki_container .book-explorer-element[data-nid='" +  spaceId + "']");
    if(Gofast._settings.isEssential && !$targetPageElement.length){
      space_path = Gofast.ITHit.getSpacePath(space_path)
      if(space_path != undefined){
        let space_name = space_path.split("/").last().slice(1);
        space_name = decodeURIComponent(space_name);
        Gofast.unselectWikiArticle()
        $("#empty-home-page-wiki .book-explorer-element-name > .item-name").html(space_name)
        $("#empty-home-page-wiki").removeClass("d-none")
        $("#empty-home-page-wiki > .book-explorer-element").addClass("gofastHighlightedItem bg-primary text-white pr-2 rounded");
      }
    }
  }

  Gofast.unselectWikiArticle = function() {
    $(".wiki-tree-widget-item.active").removeClass("active")
    $("#empty-home-page-wiki").addClass("d-none")
    $(".gofastHighlightedItem").find(".book-explorer-element-icon").removeClass("pt-3");
    $(".gofastHighlightedItem").removeClass("gofastHighlightedItem bg-primary text-white pr-2 rounded");
  }

  Gofast.checkReply = function(){
    if(location.pathname.indexOf('replytocomment') !== -1){
      //We came from a notification and we want to reply to a comment
      var pathname = location.pathname.split('/');
      var cid = '';
      var nid = '';
      while(!jQuery.isNumeric(cid)){ //We find the comment ID
        cid = pathname.pop();
      }
      while(!jQuery.isNumeric(nid)){ //Then, the node ID
        nid = pathname.pop();
      }
      var links = jQuery('.comment-reply a');
      jQuery.each(links, function(){ //We try to find the reply link and to click on it
        if(jQuery(this).attr('href') === "/gofast/nojs/comment/reply/" + nid + "/" + cid){
          //A 1 sec timeout is some times needed on poor networks
            jQuery(this).click();
        }
      });
    }
  }
  
  // if needed to set a new CKEditor profile, use the hook add_ckeditor_profiles() PHP-side
  Gofast.parseCKEditorProfile = async function(profile) {
    if(profile.hasOwnProperty('extraPlugins')) {
      if (profile.hasOwnProperty('mention')){
        if(typeof window['ckeditorPluginMentionFeeds'] === 'function'){
          profile.mention.feeds[0].feed = window['ckeditorPluginMentionFeeds']
          profile.mention.feeds[0].itemRenderer = window['ckeditorPluginMentionFeedItemRenderer']
        }
      }
      profile.extraPlugins = profile.extraPlugins.map(plugin => {
        // Replace the string with the corresponding function, if it exists
        if (typeof window[plugin] === 'function') {
          return window[plugin];
        }
        return plugin; // If not, return the string as is
      })
    }
    // XSS-filtering is done by our backend validation logic
    profile.htmlSupport = {
        allow: [
            {
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true
            }
        ]
    };
    // Call JS hook altering CKEditor profiles
    if(typeof Gofast.hooks.alterCKEditorProfile == "object") {
      for (const callback of Gofast.hooks.alterCKEditorProfile) {
        profile = await callback(profile);
      }
    }
    return profile;
}

  // prevent overflow of ckeditor tooltips
  Gofast.setCKEditorTooltips = function(editor) {
      editor.ui.view.toolbar.items.map(item => {
        if (!item.tooltipView && !item.buttonView?.tooltipView) return;
        // sometimes there is a dropdown in the ckeditor button and the tooltip is a bit more nested
        const tooltipReference = item.tooltipView ? item : item.buttonView;
        const tooltipRect = tooltipReference.tooltipView.element.getBoundingClientRect();
        const parentRect = item.element.parentNode.getBoundingClientRect();
        // show tooltip on the left if it overflows on the right
        if (tooltipRect.right > parentRect.right) {
          tooltipReference.tooltipPosition = 'w';
        }
        // show tooltip on the right if it overflows on the left
        if (tooltipRect.left < parentRect.left) {
          tooltipReference.tooltipPosition = 'e';
        }
      });
  }

  Drupal.behaviors.ogTabs = {
    attach: function (context, settings) {
      $('.gofast-og-page:not(.gofast-og-page-processed)').addClass('gofast-og-page-processed').each(function () {
        $('.gofast-og-page a[data-toggle="tab"]:not(".disabled")').click(function (e) {
          $(this).tab('show');
          $('html, body').scrollTop(0);
        });
        if (location.hash !== '') {
          $('.gofast-og-page a[href="' + location.hash + '"]').tab('show');
          $('html, body').scrollTop(0);
        }
        $('.gofast-og-page a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
          if (!$(e.target).attr('href')) {
            return;
          }
          if($(e.target).attr("id") == "ogtab_documents"){
            Gofast.ITHit.reset_full_browser_size()
          }
          if($(e.target).attr("id") == "tab_ogcalendar") {
            if(Gofast.calendar != undefined) {
              Gofast.calendar.initCalendar()
            }
          }
          var location_parts = $(e.target).attr('href').split('#');
          if(!Gofast._settings.isEssential || Gofast.isMobile()){
            return location.hash = location_parts[1];
          }
        });
      });
    }
  };

  function tryMakeEditorResizable($editorElement) {
    // don't allow resizable editors in modals (GOFAST-11649)
    if ($editorElement.parents(".modal").exists()) {
      return;
    }

    $editorElement.resizable({
      minHeight: 280,
      maxHeight: 340,
      minWidth: 280,
    });
    $editorElement.css("height", $editorElement.height() + "px");
  }

  Drupal.behaviors.initCKEditor = {
    attach: function (context, settings) {
      if (!$("[data-ckeditor]:not(.processed)").length || typeof ClassicEditor == "undefined") {
        return;
      }
      $("[data-ckeditor]:not(.processed)").addClass("processed").each(async function() {
        const profileName = $(this).attr("data-ckeditor");// Get the CKEditor profile name 
        const profile = await Gofast.parseCKEditorProfile({...Drupal.settings.ckeditor.profiles[profileName]});
        const contentLanguage = $("#document__infotab").attr("data-language");// Get the content language from the data-language attribute.
        const $originalInput = $(this);

        if(contentLanguage){// Check if contentLanguage is defined.
          profile.language ={
            ui: Gofast.get("user").language,
            content: contentLanguage  // Set the content language.
          };
        }
        // Create the CKEditor instance.
        const editor = await ClassicEditor.create($originalInput[0], profile);
        const $editorElement = $(editor.ui.view.element);
        tryMakeEditorResizable($editorElement);

        Gofast.setCKEditorTooltips(editor);

        // Force set original input value after CKEditor value
        editor.model.document.on("change:data", () => {
          const editorData = editor.getData();
          $originalInput.val(editorData);
        });
      });
    }
  }

  // @todo massive cleanup: as of GF4, most of the selectors and code below are dead
  // @warning there is still some essential stuff here, so be **really** careful while cleaning up
  $(document).ready(function () {
    if (typeof Gofast._settings == 'undefined' || typeof Gofast._settings.isEssential == 'undefined' || Gofast._settings.isEssential == false) {
      $('.menu.nav.navbar-nav > .last').before($('#block-search-form'));
    }
    $('#search-block-form .input-group-btn').html($('#dropdown-menu-page-search'));
    $('#dropdown-menu-page-search').show();
    var sidebar = $('.aside');
    var mainMenu = $('#navbar');
    var breadcrumb = $('.breadcrumb');
    var pageHeader = $('.page-header');
    var mainZone = $('#main-content').parent();
    var fullscreenNode = $('#fullscreen-node');
    var mainContainer = $('.main-container');
    var comments = $('.comment-wrapper');
    var nodeContent = $('#fullscreen-node .content.well');
    var footer = $('.footer');
    var gofastOverContent = $('#gofast_over_content');
    var gofastOverContentOldClass = gofastOverContent.attr('class');

    $(this).on('fscreenchange', function () {
      if ($.fullscreen.isFullScreen()) {
        $('#view-fullscreen').find('i').removeClass('fa-desktop').addClass('fa-compress');
      } else {
        $('#view-fullscreen').find('i').removeClass('fa-compress').addClass('fa-desktop');
        $('#pdf_frame').attr('height', '700px');
      }
    });

    // This shouldn't be put in the loadOnDocumentReady because loadOnDocumentReady is also used for ajaxification.
    // These shouldn't be reloaded each time ajaxifying
    $('.field-group-tabs-wrapper:first .vertical-tab-button a').each(function () {
      $(this).attr('href', '#');
    });

    $('.field-group-tab').each(function () {
      if ($(this).attr('style')) {
        $(this).css('display', '');
      }
    });

    $('.gofast-disabled').prop('disabled', true);

    // Remove header when coming from calendar
    if (typeof Gofast.getQueryVariables('deadline') === 'string' && typeof Gofast.getQueryVariables('gid') === 'string') {
      $('h1.page-header').hide();
    }

    // Make sur #id on url will load the good navTab

    // Javascript to enable link to tab
    var hash = location.hash.replace(/^#/, '');  // ^ means starting, meaning only match the first hash
    if (hash) {
        $('.nav-tabs a[href="#' + hash + '"]').tab('show');
    }

    // Change hash for page-reload
    $('.nav-tabs a').on('shown.bs.tab', function (e) {
      if (e.target.hash) {

        if(Gofast._settings.isEssential || !Gofast.isMobile()){
          history.pushState({}, "", this.href)
        } else {
          window.location.hash = e.target.hash;
        }
      }
    })
});

  /**
   * Returns the current, full url, including query string and hash.
   */
  Gofast.getCurrentUrl = function () {
    return window.location.protocol + "//"
            + window.location.host
            + window.location.pathname
            + window.location.search
            + window.location.hash;
  };

  /**
   * Returns variables present in the query as an object.
   */
  Gofast.getQueryVariables = function (variable) {
    var ret = {},
            query = window.location.search.substring(1),
            vars = query.split('&');
    if (variable)
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) === variable) {
          ret = decodeURIComponent(pair[1]);
        }
      }
    else
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        ret[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
    return ret;
  };

  Gofast.selectText = function (element) {
    var text = document.getElementById(element);
    if ($.browser.msie) {
      var range = document.body.createTextRange();
      range.moveToElementText(text);
      range.select();
    } else if ($.browser.mozilla || $.browser.opera) {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if ($.browser.safari) {
      var selection = window.getSelection();
      selection.setBaseAndExtent(text, 0, text, 1);
    }
  };

  /**
   * Highlight matched string within a page content
   *
   * @param {string} word - the string to highlight
   * @param {string} snippet - highlighting will focus on this context.
   */
  Gofast.highlightElement = function (word, snippet, el) {
    var target, scrolltop, content, match;

    // Decode html entities (decimal)
    word = $('<div/>').html(word).text();
    snippet = $('<div/>').html(snippet).text();

    content = el && $(el).length ? el && $(el) : $('.region-content');

    if (content.length) {
      match = $(content).filterByText(snippet);
      match.length ? $(match).highlight(snippet) : content.highlight(word);
    }

    target = $('.highlight');
    if (target.length) {
      // Scroll down to the first target. Offset is relative to the header's height.
      scrolltop = target.offset().top - (150); /* @todo : get header height */
      $('html, body').animate({scrollTop: scrolltop}, 500);

      // Allow user to remove highlighting :
      // Show a tip while hovering highlighted snippets
      var tip = $('<span class="gofast-button">' + Drupal.t('Click to remove highlighting', {}, {'context' : 'gofast'}) + '</span>').css({
        position: 'absolute',
        background: '#333',
        color: '#eee',
        'font-size': '10px',
        'font-family': 'Arial'
      });

      // Set mouse events callback (over/out) and hover intent parameters
      var over, out, config;
      over = function () {
        var pos = $(this).position();
        $(this).css('cursor', 'pointer');
        $(tip).appendTo(this).css({top: pos.top + 10 + 'px'}).show().add(this).click(function (e) {
          e.preventDefault(); // element could be an anchor tag
          tip.remove();
          $(target).unbind().css('cursor', 'auto').removeClass('highlight');
        });
      };
      out = function () {
        $(this).css('cursor', 'auto');
        tip.remove();
      };
      config = {
        sensitivity: 1,
        interval: 150,
        over: over,
        timeout: 250,
        out: out
      };

      // Bind target
      $(target).hoverIntent(config);
    }
  };

  Gofast.js_get_url = function (end_url) {
    var myUrl = $(document)[0].URL;
    var l = myUrl.split('/');
    var goodUrl = l[0] + "//" + l[2] + Drupal.settings.basePath;
    var burl = goodUrl + end_url;

    return burl;
  };

    /*
   * Set
   */
  Drupal.behaviors.gofast_node_actions_menu_direction = {
    attach: function (context, settings) {
      $(".gofast-node-actions").on("click", function(e){
        if(e.clientY > (3/5*$(window).height())){
          $(".gofast-node-actions .gofast-dropdown-menu:not(.dropdown-menu-right)").css("bottom", "100%").css("top", "inherit");
          $(".gofast-node-actions .gofast-dropdown-menu.dropdown-menu-right").css("top", "inherit").css("bottom", "0px");
          Gofast.last_menu_align = "down";
        }
        else{
          $(".gofast-node-actions .gofast-dropdown-menu:not(.dropdown-menu-right)").css("top", "100%").css("bottom", "inherit");
          $(".gofast-node-actions .gofast-dropdown-menu.dropdown-menu-right").css("top", "inherit").css("bottom", "0px");
          Gofast.last_menu_align = "up";
        }
      });


    }
  };

  Drupal.behaviors.moreBreadcrumbs = {
    attach: function(context, settings) {
      $("#gofast_breadcrumb_more:not(.gofast_breadcrumb_more-processed)").addClass('gofast_breadcrumb_more-processed').each(function () {
        $(this).click(function(){
          let breadcrumbAnimator = $(this).closest(".breadcrumb-gofast").find(".breadcrumbAnimator");
          if(breadcrumbAnimator.length) {
            breadcrumbAnimator = breadcrumbAnimator[0];
            // we use maxHeight because height is not animatable, and numerical values because non-numerical values would not be animatable either
            breadcrumbAnimator.classList.remove("d-none"); // remove d-none for scrollHeight to actually have a value
            if (breadcrumbAnimator.style.maxHeight != "" && breadcrumbAnimator.style.maxHeight != "0px") {
              breadcrumbAnimator.style.maxHeight = 0
            } else {
              breadcrumbAnimator.classList.remove("d-none"); // temporary removal of d-none for scrollHeight to have a value
              breadcrumbAnimator.style.maxHeight = breadcrumbAnimator.scrollHeight + 16 + "px";
              breadcrumbAnimator.classList.add("d-none");
            }
            // make sure the actual height matches the target size (minHeight is also mandatory for the animation to work backward...)
            breadcrumbAnimator.style.height = breadcrumbAnimator.style.minHeight = breadcrumbAnimator.style.maxHeight;
            // we have to wait a bit when adding d-none class to let time for the animation to happen
            if (breadcrumbAnimator.classList.contains("d-none")) {
              breadcrumbAnimator.classList.remove("d-none");
            } else {
              setTimeout(function() {
                breadcrumbAnimator.classList.add("d-none");
              }, 300);
            }
          } else {
            $(this).closest(".breadcrumb-gofast").find(".breadcrumb-transparent.gofast_breadcrumb_hidden_origine").toggleClass( "d-none");
          }
          // if the toggle icon has data for preferred icons, we use them, otherwise we use default icons
          let dataIcons = $(this).attr("data-icons") || "fa-chevron-down/fa-chevron-up";
          dataIcons = dataIcons.split("/");
        if($(this).hasClass(dataIcons[0])){
          $(this).removeClass(dataIcons[0]).addClass(dataIcons[1]);
        }else{
          $(this).removeClass(dataIcons[1]).addClass(dataIcons[0]);
        }
        });
      });
    }
  }
  
  // Behaviors to toggle the arrow after the node title on a document page (hide and show the title metadata)
  Drupal.behaviors.displayTitleMetadata = {
    attach: function(context, settings) {
      $('#gofast_title_metadata_more:not(.gofast_title_metadata_more-processed)').addClass('gofast_title_metadata_more-processed').each(function () {
        $(this).click(function(){
          $(".gofast-node-title-row").toggleClass("d-none");
          // if the toggle icon has data for preferred icons, we use them, otherwise we use default icons
          let dataIcons = $(this).attr("data-icons") || "fa-chevron-down/fa-chevron-up";
          dataIcons = dataIcons.split("/");
        if($(this).hasClass(dataIcons[0])){
          $(this).removeClass(dataIcons[0]).addClass(dataIcons[1]);
        }else{
          $(this).removeClass(dataIcons[1]).addClass(dataIcons[0]);
        }
        });
      });
    }
  }


  Drupal.behaviors.gofast_contextual_actions_submenu_display_onclick = {
    attach: function (context, settings) {
        $('.contextual-actions .dropdown-submenu .dropdown-toogle').on({"click":function(e){
                e.stopPropagation();
                if($('.contextual-actions .dropdown-submenu .gofast-dropdown-menu.processed').length !== 0){
                    if($('.contextual-actions .dropdown-submenu .gofast-dropdown-menu').css('display') === "none"){
                        $('.contextual-actions .dropdown-submenu .gofast-dropdown-menu').css('display','block');
                    }else{
                        $('.contextual-actions .dropdown-submenu .gofast-dropdown-menu').css('display','none');
                    }
                }else{
                    $('.contextual-actions .dropdown-submenu .gofast-dropdown-menu').css('display','block');
                    $('.contextual-actions .dropdown-submenu .gofast-dropdown-menu').addClass('processed');
                }
            }
        });
        $('.gofast-node-actions .dropdown-submenu .dropdown-toogle').on({"click":function(e){
                e.stopPropagation();
                if($('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu.processed').length !== 0){
                    if($('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu').css('display') === "none"){
                        $('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu').css('display','block');
                    }else{
                        $('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu').css('display','none');
                    }
                }else{
                    $('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu').css('display','block');
                    $('.gofast-node-actions .dropdown-submenu .gofast-dropdown-menu').addClass('processed');
                }
            }
        });
    }
  };

  /**
   * Trim all strings inside '.to-trim'-class elements. Attribute 'trimLength'
   * must be set on such element, so that strings are truncated to that length.
   */
  Drupal.behaviors.trimString = {
    attach: function () {
      var text, len;
      $('.to-trim:not(.trimmed)').addClass('trimmed').each(function () {
        text = $(this).text();
        len = $(this).attr('trimLength');
        if (len)
          $(this).text(text.trimToPx(len));
      });
    }
  };

  /**
   * Autocompletion pour les destinataires d'un mail / messages
   * UI : Les suggestions séléctionnées (les adresses/noms/groupes) se
   * transforment en items cliquable (suppressible)
   */
  Drupal.behaviors.labelize = {
    attach: function (context) {
      var labelize = {},
              select = function (data) {
                data = data.data || data;
                //var value = $.trim($($(this).get(0)).text()) || this.defaultValue,
                var value = $.trim($($(this).children()).html()) || this.defaultValue,
                        autocomplete = data.autocomplete,
                        form = data.form,
                        form_item = data.autocomplete.form_item,
                        values = data.values,
                        hidden_values = autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]');
                autocomplete.val('').focus();

                if (!$('.selection-tags', autocomplete.parent()).length) {
                  $('<div class="selection-tags"></div>').insertAfter(autocomplete);
                }

                var parsedItem = $('<output>').append(value);
                var metadata = parsedItem.find('.labelize-metadata').data();
                var itemContent = parsedItem.not('.labelize-metadata').html();
                if (!metadata) {
                  itemContent ='<span style=\"line-height:24px;\">'+value+'</span>';
                  metadata = null;
                }

                var allow_insert = autocomplete.hasClass('labelize-insert');

                var id = metadata !== null ? metadata.id : value;
                var id_type = metadata !== null ? metadata.id + metadata.type : value;
                if (!values[id_type] && ((allow_insert && metadata === null) || metadata !== null)) {
                  var title = "";
                  var id = '';
                  var data = '';
                  if (metadata === null) {
                    title = id = data = value;
                  } else {
                    if (metadata.type === "node") {
                      title = Drupal.t('Members of', {}, {'context' : 'gofast'}) + ' ' + metadata.name;
                    } else if (metadata.type === "user" || metadata.type === 'userlist') {
                      title = metadata.name;
                    } else if (metadata.type === "taxonomy_term") {
                      title = metadata.name;
                    } else {
                      title = itemContent;
                    }
                    id = metadata.id;
                    data = metadata;
                  }
                  values[id_type] = data;
                  title = 'title="' + title + '"';
                  var item = '<span class="tagging-tag processed" ' + title + '>' + itemContent + '&nbsp;<i class="fa fa-times"></i>';
                  if (!metadata) {
                    var labelize_metadata = '<span class="labelize-metadata" data-type="" data-id="' + id + '" data-value="' + value + '" ></span>';
                    item += labelize_metadata;
                  }
                  item += '</span>';
                  autocomplete.parent().find('.selection-tags').append(item);
                  // Add a click event handler that enables user to remove this item
                  autocomplete.parent().find('.tagging-tag.processed:not(.remove)').addClass('remove').click(function () {
                    var id = $(this).find('.labelize-metadata').data('id');
                    var id_type = $(this).find('.labelize-metadata').data('id') + $(this).find('.labelize-metadata').data('type');
                    var existing_hidden_value = autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]').val();
                    var new_value = existing_hidden_value.split(' ').filter(function(i){
                      // Non-strict comparison intended for strings to match numbers or conversely.
                      return i != id;
                    }).join(' ');
                    autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]').val(new_value);
                    if (values[id_type])
                      delete values[id_type];
                    $(this).remove();
                    autocomplete.focus();
                  });
                }
                else {
                  autocomplete.focus();
                }
                var existing_hidden_value = autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]').val();
                var new_value = existing_hidden_value.split(' ').filter(function(i){
                  return i !== id;
                }).concat(id).join(' ');
                autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]').val(new_value);
                if (data.type == "node" & $(this).parent().parent().parent().hasClass('form-item-list-participants')){
                   //Conference case, we need to process tthe given space
                   setTimeout(function () {
                     Gofast.conference.autocomplete_process(this);
                   }, 500);
                }
              },
              prevent = function (e) {
                var autocomplete = e.data.autocomplete,
                        form = e.data.form,
                        form_item = e.data.form_item;
                // Prevents wrong behaviors induced by wrong click events
                if (e.which === 2 || e.which === 3) {
                  e.preventDefault();
                  autocomplete.val('');
                  $('.dropdown li.selected', form_item).removeClass('selected');
                }
                // Prevents double-click to fill twice
                setTimeout(function () {
                  autocomplete.val('');
                }, 200);
              },
              onSubmit = function (e) {
                var autocomplete = e.data.autocomplete,
                        form = e.data.form,
                        form_item = e.data.form_item,
                        hidden_values = autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]');
                var myvalues = [];
                for (var property in e.data.values) {
                  if (e.data.values.hasOwnProperty(property)) {
                    myvalues.push(e.data.values[property]);
                  }
                }
                hidden_values.val(JSON.stringify(myvalues));
              };

      // Bind events to handlers for each instances of a labelized text input

      $('input.labelize-autocomplete:not(.labelize-autocomplete-processed)', context).addClass('labelize-autocomplete-processed').each(function () {
        // This adds the requiered hidden field that will transport the values
        if (!$("input[name*='" + $(this).attr('id') + "-hidden-values']", $(this).parent()).length) {
          $(this).parent().after('<input type="hidden" id="' + $(this).attr('id') + '-values" name="' + $(this).attr('id') + '-hidden-values"/>');
        }

        var autocomplete = $(this),
                form = $(this).closest('form'),
                form_item = $(this).closest('div.form-item'),
                values = [],
                data = {
                  autocomplete: autocomplete,
                  form: form,
                  form_item : form_item,
                  values: values
                },
        hidden_values = autocomplete.parent().siblings('input[id=' + autocomplete.attr('id') + '-values]');

        // Labelize default value if set
        if (autocomplete.val() !== '') {
          // Allow time for the popup to be resized in the first place
          setTimeout(function () {
            var def = autocomplete.val();
            var def_values = def.split(',');
            for (var i = 0; i < def_values.length; i++) {
              if (def_values[i] !== '') {
                select.call({defaultValue: def_values[i]}, data);
              }
            }
            autocomplete.val('').focus().removeClass('labelizeDefault');
          }, 200);
        }

        // This binds submit on every labelized field
        form.submit(data, onSubmit);

        //When submit the userlist form, give
        $('#submit_userlist').mousedown(function(){
            var e={};
            e.data=data;
            onSubmit(e);
            $('#submit_userlist').attr("disabled", "true");
            $.ajax({
                statusCode : {
                   408 : function( ){
                       window.location.replace(window.location.href);
                       //window.location.replace(window.location.origin+"/userlists");
                   }
                }
            });
        });

        form_item.not('.labelized').addClass('labelized')
               .on('click', '.dropdown li', data, prevent)
               .on('mousedown', '.dropdown li', data, select);

        autocomplete.not('.labelized').addClass('labelized').on('keydown', function (e) {
          if (!e)
            e = window.event;
          if (e.keyCode === 13) {
            selectElement(e, $(this), select, data);
          }
        }) ;

        function selectElement(event, input_field, select, data) {
          event.preventDefault();
          var selection = $('.dropdown li.active', form_item);
          if (selection.length) {
            select.call(selection, data);
            setTimeout(function () {
              input_field.val('').focus();
            }, 100);
            setTimeout(function () {
              input_field.val('').focus();
            }, 200);
          }
          else if (input_field.hasClass('labelize-insert')) {
            var text = input_field.val();
            if (text) {
              select.call({defaultValue: text}, data);
              setTimeout(function () {
                input_field.val('').focus();
              }, 200);
            }
          }
        }
      });
    }
  };

  /**
   * Hide protected attributes without altering the underlying value.
   */
  Drupal.behaviors.gofastProtectedAttributes = {
    attach: function (context, settings) {
      var pAttr = Gofast.global.protectedAttr || [];
      pAttr.forEach(function (item, i) {
        $(item.selector, context).once('protected', function () {
          var element = this;
          item.attrList.forEach(function (attr, i) {
            if (element.attributes.getNamedItem(attr)) {
              var val = $(element).val();
              element.attributes.removeNamedItem('value');
              $(element).val(val);
            }
          });
        });
      });
    }
  };

  /**
   * Retrieve the full_screen attribute in the url to know if we display the node in full screen
   */
  Drupal.behaviors.gofastFullscreenNode = {
    attach: function (context, settings) {
        if(Gofast.success_fullscreen != true){
            var href = window.location.href;
            var url = new URL(href);

            if(!!navigator.userAgent.match(/Trident.*rv\:11\./)){
                var full_screen = url.parameterNames.indexOf("full_screen");
                if(full_screen !== -1){
                    full_screen = "1";
                }
            }else{
                var full_screen = url.searchParams.get("full_screen");
            }


            if(full_screen == '1' && Gofast.success_fullscreen != true && Gofast.Fullscreen_node != true){
                Gofast.toggleFullScreen();
                Gofast.Fullscreen_node = true;
                Gofast.success_fullscreen = true;
            }else{
                Gofast.success_fullscreen = false;
            }
        }
    }
  };

  //#region Handling side content tab labels switching to and from icon-only mode
  /**
   * Object of panel status values.
   * @typedef {object} PanelStatuses
   * @property {boolean} isKTAsideOpen `true` if the main side menu is open.
   * @property {boolean} isSideExplorerOpen `true` if the side explorer is open.
   * @property {boolean} isAnySidePanelOpen `true` if either the main side menu
   *  or the explorer are open.
   */

  /**
   * Gets the current status of opened left side panels.
   * @returns {PanelStatuses} The status of opened left side panels.
   */
  function getLeftSidePanelsOpenStatuses() {
    const isKTAsideOpen = !$("#kt_body").hasClass("aside-minimize");
    const isSideExplorerOpen = $("#explorer").hasClass("open");

    return {
      isKTAsideOpen,
      isSideExplorerOpen,
      isAnySidePanelOpen: isKTAsideOpen || isSideExplorerOpen,
    };
  }

  /**
   * Emit a JQuery custom "gofast:side_panel_open_change" on the global window
   * with the current status of the openable left side panels.
   */
  function emitSidePanelOpenStatusChange() {
    $(window).trigger("gofast:side_panel_open_change", getLeftSidePanelsOpenStatuses());
  }

  /**
   * Update the tab presentation of the side content according to a set of
   * given panel status values.
   * @param {PanelStatuses} panelStatuses object of panel status values.
   */
  function updateSideContentTabPresentation(panelStatuses) {
    if (panelStatuses.isAnySidePanelOpen) {
      $(".sideContent").addClass("reduced");
    } else {
      $(".sideContent").removeClass("reduced");
    }
  }

  // setup global listener to update side content tab presentation when opening
  // or closing the left side panels.
  $(window).on("gofast:side_panel_open_change", function (_event, details) {
    if (!$(".GofastNode").length) {
      return;
    }

    updateSideContentTabPresentation(details);
  });

  // Behavior to immediately update the side content tab presentation when it is
  // added to the page.
  Drupal.behaviors.setupInsertedSideContentTabPresentation = {
    attach: function (context, _settings) {
      if (!$(".GofastNode").length) {
        return;
      }

      $(context).find(".sideContent").once("setup_tab_presentation", function () {
        // make sure the state is updated immediately
        updateSideContentTabPresentation(getLeftSidePanelsOpenStatuses());
      });
    },
  };

  // Behavior to listen to clicks on the side menu expand button and then emit
  // status changes
  Drupal.behaviors.toggleSidebar = {
    attach: function (_context, _settings) {
      if (!$(".GofastNode").length) {
        return;
      }

      $("#kt_aside_toggle").once("kt_aside_toggle", function () {
        $(this).click(function () {
          emitSidePanelOpenStatusChange();
        });
      });
    },
  };

  // Behavior to listen to clicks on the side explorer button and then emit
  // status changes
  Drupal.behaviors.toggleBrowserMobile = {
    attach: function (_context, _settings) {
      if (!$(".GofastNode").length) {
        return;
      }

      $("#explorer").once("explorer", function () {
        $(this).click(function () {
          emitSidePanelOpenStatusChange();
        });
      });
    },
  };
  //#endregion

  Gofast.conference = Gofast.conference || {};

  Gofast.conference.attach_before_submit = function(){
        if($("#submit_conference").length === 0 || $("#submit_conference").hasClass('gofast-processed')){
          return;
        }
        $("#submit_conference").addClass('gofast-processed');
        //Set dates to proper format before submit
        var submitButon = $("#submit_conference")[0];
        $().bindFirst(submitButon, 'mousedown', function(){
          //If we are in french language, we need to switch days and month
          var user = Gofast.get('user');
          if(user.language == 'fr'){
            //Get values
            var start = $(".form-item-field-date-und-0-value-date").find('input').val();
            var end = $(".form-item-field-end-date-und-0-value-date").find('input').val();
            //Transform values
            start = start.substring(3,5) + '-' + start.substring(0,2) + start.substring(5);
            end = end.substring(3,5) + '-' + end.substring(0,2) + end.substring(5);
            //Replace values
            $('#conference_date input.date-clear.form-text').val(start);
            $(".form-item-field-end-date-und-0-value-date").find('input').val(end);
          }

          //Now, the fields are formated in english. But, because the 'end_date' field
          //was firstly created with a bad format, we need to reformat it to yyyy-mm-dd
          var end = $(".form-item-field-end-date-und-0-value-date").find('input').val();
          end = end.substring(6, 10) + "-" + end.substring(0, 5) + end.substring(10);
          $('#conference_end_date input.date-clear.form-text').val(end);
        });
  };

    /*
     * Make the audit node block asynchronous
     */
    Gofast.loadAuditBlock = function (tabId = "#document__audittab") {
      if ($(tabId).find('#gofast-audit-container').length > 0){
        if (!$(tabId).find('#gofast-audit-container').hasClass('processed')){
          $(tabId).find('#gofast-audit-container').addClass('processed');
          if (Gofast.get('node') !== undefined){
            var nid = Gofast.get('node').id;
            $.post(location.origin + "/gofast/node/"+nid+"/get_audit_node").done(function(data){
              $(tabId).find('#gofast-audit-container').append(data);
            });
          }
        }
        }
    };

    Gofast.gofast_main_block_breadcrumb = function(isDocument = true, retry = false){
      var $mainBreadcrumb = $(".breadcrumb-gofast:not('.breadcrumb-gofast-full')");
      if(isDocument && Gofast._settings.isEssential){
        $mainBreadcrumb = $("#nodeContainer .breadcrumb-gofast:not(.breadcrumb-gofast-full)");
      }
      if (!$mainBreadcrumb) {
        //Retry - GOFAST-9096
        if(!retry){
          setTimeout(function(){
            Gofast.gofast_main_block_breadcrumb(isDocument, true);
          }, 700);
        }
        console.log("GOFAST-9096 : Breadcrumb Exit 1");
        return;
      }
      if ($mainBreadcrumb.hasClass('processing') || $mainBreadcrumb.hasClass('processed')) {
        //Retry - GOFAST-9096
        if(!retry){
          setTimeout(function(){
            Gofast.gofast_main_block_breadcrumb(isDocument, true);
          }, 700);
        }
        console.log("GOFAST-9096 : Breadcrumb Exit 2");
        return;
      }
      $mainBreadcrumb.addClass('processing');
      $mainBreadcrumb.append("<div class='loader-breadcrumb'></div>");
      var options = {"show_title": true};
      if (isDocument) {
        options.alt_theme = "gofast_document_breadcrumb";
      }
      $.get(location.origin + "/gofast/node-breadcrumb/" + Gofast.get('node').id + "?options=" + JSON.stringify(options), function(data) {
        $(".loader-breadcrumb").remove();
        $mainBreadcrumb.replaceWith(data);
        $mainBreadcrumb.removeClass("processing");
      });
    };

    /**
     * Loads breadcrumb from server for right block *and* replaces the elements in the DOM
     * @param {null|undefined|boolean|"when_not_mirrored"} [manage_locations]
     *  The value to use for the "manage_locations" option when rendering the
     *  breadcrumbs. When `null` or `undefined`, use the server default (defined
     *  in gofast_breadcrumb.module).
     */
    Gofast.gofast_right_block_breadcrumb = function(manage_locations = null){
      var node = Gofast.get("node");

      if(
        node.type == 'group' ||
        node.type == 'organisation' ||
        node.type == 'extranet' ||
        node.type == 'public' ||
        node.type == 'private_space'
      ){return;}
      
      var loadBreadcrumb = function(manage_locations, targetNid){
        var options = {'show_title': false, "show_all_items": false, "show_tooltip": true};
        if (manage_locations != null) {
          options["manage_locations"] = manage_locations;
        }
        $.get(location.origin + "/gofast/node-breadcrumb/" + targetNid + "?options=" + JSON.stringify(options), function(data) {
          $(".loader-breadcrumb").remove();
          const waitForBreadcrumbinterval = setInterval(function() {
            if (!$(".breadcrumb-gofast.breadcrumb-gofast-full").length) {
              return;
            }
            clearInterval(waitForBreadcrumbinterval);
            $(".breadcrumb-gofast.breadcrumb-gofast-full").replaceWith(data);
            $(".breadcrumb-gofast.breadcrumb-gofast-full").removeClass("processing");
            Drupal.attachBehaviors();
          }, 250);
        });
      }
      
      if($(".breadcrumb-gofast.breadcrumb-gofast-full").hasClass("processing")) {
        return;
      }
      $(".breadcrumb-gofast.breadcrumb-gofast-full").addClass('processing');
      let targetNid = $("#document__infotab").attr("data-nid") || node.id;
      Gofast.processAjax(location.origin + "/gofast/node-info/" + targetNid, true);
      Gofast.Poll.init();

      // Trigger metadata modal if needed
      if (window.location.search.includes("manage_taxonomy")) {
        const url = new URL(window.location.href);
        url.searchParams.delete('manage_taxonomy');
        window.history.replaceState({}, document.title, url.pathname + url.search);
        Gofast.metadata.manageTaxonomy(targetNid);
      }

      if(node.type != "webform"){
      //Check locations of the node 
      $.get(location.origin + "/gofast/check-locations/" + targetNid, function(data) {
        var response = JSON.parse(data);
        if(response.response != "OK"){
            if(response.response == "forbidden"){
              Gofast.toast(Drupal.t("You do not have permissions to view this document.", {}, { context: 'gofast' }),"warning");
              Gofast.processAjax("/error/403", true);
            } else if(response.response == "full-reload"){
              location.reload()
            } else if (typeof response.message != "undefined") {
              Gofast.toast(response.message, "warning");
            } else {
              Gofast.processAjax(location.origin + "/gofast/node-info/" + targetNid, true);
              Gofast.Poll.init();
            }
        }   
        //Locations are successfully checked, process the breadcrumb, the right block and the menu                
        loadBreadcrumb(manage_locations, targetNid)
      });
      } else {
        loadBreadcrumb(manage_locations, targetNid)
      }
    };

  /*
   * Login page transitions
   */
  jQuery(function(){
    const waitForGofastBlockLoadInterval = setInterval(() => {
      if (typeof Gofast.block == "undefined" || typeof Gofast.block.load == "undefined") {
        return;
      }
      clearInterval(waitForGofastBlockLoadInterval);
      Gofast.block.load("gofast_workflows_light_dashboard", "gofast_workflows", "Workflow", $("#gofast_block_delta-gofast_workflows_light_dashboard-gofast_workflows .gofast-block-inner"),  "1", "1");
    });
    window.onerror = function(message, url, lcount){
      //var user = Gofast.get("user");
      //$.post(location.origin + "/gofast/js-error", {useragent : navigator.userAgent, request : location.href, url : url, message : message, line : lcount});
    }
     if( $('#user-login-form').length ){
      $('head').append('<link href="/sites/all/themes/bootstrap-gofast/fonts/Roboto.css" rel="stylesheet">');
      $('body').css('-webkit-perspective', '1200px');
      $('body').css('-ms-perspective', '1200px');
      $('body').wrapInner('<div class="pt-wrapper"></div>');
      $('body').append('<div class="pt-page"><div class="message">' + Drupal.settings.message_welcom + '</div></hr></div>');
      const animateWelcomeSlide = function(){
        $('.pt-wrapper').addClass('pt-page-rotateSlideOut');
        $('#navbar').addClass('disappear');
        $('.pt-page').addClass('pt-page-rotateSlideIn');
      };
      $('#user-login-form').submit(animateWelcomeSlide);
      $('.pt-page').append('<div class="poweredbyGofast"></div>');
      $('.poweredbyGofast').append('<div>Powered by</div>');
      $('.poweredbyGofast').append('<div><img class="logo_welcome_page" src="/sites/all/themes/bootstrap-gofast/Logo_GoFAST de CEO-Vision_fr_blanc.png" "></div>');
      $('.poweredbyGofast').append('<span class="text-version">Version:'+ Drupal.settings.gofast_version.replace('7.x-','') +'</span>');
    }

    $("#setVersionPlusButton .btn").on('click',()=>{
      $.post('/gofast/user/login/choose_version/Plus').done((link)=>{
        window.location = "/"+link;
        Gofast.addLoading()
      })
    })
    $("#setVersionEssentialButton .btn").on('click',()=>{
      $.post('/gofast/user/login/choose_version/Essential').done((link)=>{
        window.location = "/"+link;
        Gofast.addLoading()
      })
    })

    $.getScript('/sites/all/modules/flag/theme/flag.js', function() {
        Drupal.behaviors.flagLink.attach(document);
    });
    // enable tooltip
    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover'
    });

    /* END minimized Riot LeftPanel */

    Gofast.callToasterMessages();
  });

  //Add missing translations to the page context
  Drupal.t('No', {}, {'context' : 'gofast'});
  Drupal.t('Yes', {}, {'context' : 'gofast'});
  Drupal.t('Delete', {}, {'context' : 'gofast'});

  var waitUserAvailable = setInterval(function(){
    if(typeof Drupal.settings !== "object" || typeof Drupal.settings.gofast !== "object" || typeof Drupal.settings.gofast.user !== "object"){
        return;
    }

    clearInterval(waitUserAvailable);

    // If atatus field is empty, then we need to display the message
    if(!Drupal.settings.gofast.user.atatus_set && Drupal.settings.gofast.user.uid != 0){
      // Display the atatus banner
      var waitForAtatusBanner = setInterval(function(){
        if($('.atatus-banner').length){
          $('.atatus-banner').removeClass('d-none');
          clearInterval(waitForAtatusBanner);
        }
    }, 200);
    }

    if (Drupal.settings.gofast.user.password_expires) {
      // Preemptively add loader, should get removed once modal is loaded.
      // If modal logic never loads, it will stay however, which indicates an issue elsewhere.
      Gofast.addLoading();
      const maxWaitDuration = 10_000 /* ms */;
      const maxWaitEndTime = Date.now() + maxWaitDuration;
      const waitForModal = setInterval(() => {
        // Wait for modal logic to be initialised.
        if (Drupal.ajax?.prototype?.commands?.modal_display == null) {
          if (Date.now() >= maxWaitEndTime) {
            console.warn('GoFAST: Excessive wait for initialisation of modal while attempting to display password expiration modal');

            clearInterval(waitForModal);
            Gofast.removeLoading();
          }
          return;
        }
        clearInterval(waitForModal);

        Drupal.CTools.Modal.showCtoolsModal("/gofast/nojs/password_expires?timestamp=" + Drupal.settings.gofast.user.password_expires);
      }, 100);
      return;
    }

    if(Drupal.settings.gofast.user.display_carousel){
      var waitForClass = setInterval(function(){
            if($('a[href="/gofast/nojs/carousel"]').hasClass("ctools-use-modal-processed")){
              $('a[href="/gofast/nojs/carousel"]').click();
                clearInterval(waitForClass);
          }
      }, 200);
    }
  }, 200);

  /**
  * Build an error message from an Ajax response.
  */
  Drupal.ajaxError = function (xmlhttp, uri, customMessage) {
    var statusCode, statusText, pathText, responseText, readyStateText, message;
    if (xmlhttp.status) {
      statusCode = "\n" + Drupal.t("An AJAX HTTP error occurred.") +  "\n" + Drupal.t("HTTP Result Code: !status", {'!status': xmlhttp.status});
    }
    else {
      statusCode = "\n" + Drupal.t("An AJAX HTTP request terminated abnormally.");
    }
    statusCode += "\n" + Drupal.t("Debugging information follows.");
    pathText = "\n" + Drupal.t("Path: !uri", {'!uri': uri} );
    statusText = '';
    // In some cases, when statusCode == 0, xmlhttp.statusText may not be defined.
    // Unfortunately, testing for it with typeof, etc, doesn't seem to catch that
    // and the test causes an exception. So we need to catch the exception here.
    try {
      statusText = "\n" + Drupal.t("StatusText: !statusText", {'!statusText': $.trim(xmlhttp.statusText)});
    }
    catch (e) {}

    responseText = '';
    // Again, we don't have a way to know for sure whether accessing
    // xmlhttp.responseText is going to throw an exception. So we'll catch it.
    try {
      responseText = "\n" + Drupal.t("ResponseText: !responseText", {'!responseText': $.trim(xmlhttp.responseText) } );
    } catch (e) {}

    // Make the responseText more readable by stripping HTML tags and newlines.
    responseText = responseText.replace(/<("[^"]*"|'[^']*'|[^'">])*>/gi,"");
    responseText = responseText.replace(/[\n]+\s+/g,"\n");

    // We don't need readyState except for status == 0.
    readyStateText = xmlhttp.status == 0 ? ("\n" + Drupal.t("ReadyState: !readyState", {'!readyState': xmlhttp.readyState})) : "";

    // Additional message beyond what the xmlhttp object provides.
    customMessage = customMessage ? ("\n" + Drupal.t("CustomMessage: !customMessage", {'!customMessage': customMessage})) : "";

    message = statusCode + pathText + statusText + customMessage + responseText + readyStateText;
    //@CEO-Vision patch
    //Won't display technical error message
    //return message;
    console.error('Ajax error', message);
    return "<strong>" + Drupal.t("A network error has occurred.") + "</strong><br />" + Drupal.t("Please save your work and reload this page.");
  };

  /**
   * JS implementation for the gft translation helper used for technical chains
   */
  Drupal.gft = function(str, args, options) {
    let referenceObject = Drupal.locale;
    if (Gofast.get("user").language == "en") {
      referenceObject = Drupal.technical_locale;
    }
    options = options || {};
    options.context = options.context || '';

    // Fetch the localized version of the string.
    if (referenceObject.strings && referenceObject.strings[options.context] && referenceObject.strings[options.context][str]) {
      str = referenceObject.strings[options.context][str];
    }

    if (args) {
      str = Drupal.formatString(str, args);
    }
    return str;
  }

  /**
   * Prevent redirect when clicking admin toolbar toogle.
   */
  Drupal.behaviors.adminToolbar = {
    attach: function(context) {
      $('#toolbar a.toggle', context).once('toolbar-href', function(e) {
        $(this).attr('href', '#');
      });
    }
  };


  /**
   * //For each tag we need to retrieve and set tha subscribe button
   */
  Drupal.behaviors.tagsSetSubButton = {
    attach: function (context) {
      $('.gofast-tags-noedit', context).once('gofast-tags-noedit', function (e) {

        var value = '';
        var tag_value = $(this);
        tag_value.html(value);

        var param_url = tag_value.data("name").replace("/", "*\*") + '[GOFAST_TAG_SEPARATOR]' + tag_value.data("id") + '/' + Drupal.settings.gofast.node.id;
           $.ajax({ //Call to get subscribe button
             url: Drupal.settings.gofast.baseUrl + '/xeditable/get/subscribe/' + param_url,
            type: 'GET',
            dataType: 'html',
            success: function (content, status) {
              value = tag_value.html();
              value = value.slice(0, -5);
              value += content;
              tag_value.html(value);
              $.getScript('/sites/all/modules/flag/theme/flag.js', function () {
                Drupal.behaviors.flagLink.attach(document);
              });
            }
          });
      });
    }
  };

  /**
 * //For each class editableField__datapiker convert to datepiker and each class editableField__dataTimepiker to datetimepicker
 */
  Drupal.behaviors.setDataPiker = {
    attach: function (context) {
      $('.editableField__datapiker').datepicker({
        format: "dd/mm/yyyy",
        todayBtn: "linked",
        language: "fr",
        keyboardNavigation: false,
        autoclose: true,
        todayHighlight: true
      });

      $(function () {
        if($('.editableField__dataTimepiker').length) {
            $('.editableField__dataTimepiker').datetimepicker({
                locale: 'ru'
            });
        }
      });
    }
  };

  $(document).bind('flagGlobalAfterLinkUpdate', function (event, data) { //Reformat tag display when AJAX subscribing to it
    const closestTable = $(data.link).closest("table");
    if (closestTable && closestTable.parent() && closestTable.parent().attr("id") && closestTable.parent().attr("id").includes("dashboard")) { // we're in a dashboard table
      closestTable.html($("<div class='spinner mt-4'>"));
      $.get(location.origin + "/gofast/dashboard/get/block?id=" + closestTable.parent().attr("id"), function (data) {
        closestTable.replaceWith(JSON.parse(data).content);
        Drupal.attachBehaviors();
      });
    }
    if (data.flagName === 'subscribe_term') { // it's a term, not another flag name
      jQuery('.flag.flag-link-toggle.flag-processed').parent('p').children().remove()
      var flag = $(".tagify__tag[value='" + data.contentId + "'] .gofast-sub-icon");
      flag.html(Gofast.metadata.getSubButtonHtml(data.contentId).responseText)
      flag.show();
    }
    if (data.flagName === 'flag_public') { 
      var gid = $('#gofastContainer div[data-gid]').data('gid'); //Get the gid of the current space
      Gofast.og.getSpaceBookmarks(gid); //Refresh the bookmarks
    }  
  });
  $(document).bind('flagGlobalBeforeLinkUpdate', function (event, data) {
    if (data.flagName === 'subscribe_term') {
      var flag = $(".tagify__tag[value='" + data.contentId + "'] .gofast-sub-icon");
      flag.hide();
    }
  });

  Gofast.sideFileBrowser = {
    /**
     * Checks if a given tab is initialised/
     *
     * This checks if the CSS class "processed" is present on the tab content
     * element to know if a tab is initialised.
     *
     * @param {string} tabId HTML ID of the tab content element to check for initilisation
     * @returns {boolean} True if tab is initialised, false otherwise
     */
    isTabInitialised: function(tabId) {
      return $("#" + tabId).hasClass('processed');
    },
    initFileBrowser: function(tabId, { open = true } = {}){
      if (Gofast.sideFileBrowser.isTabInitialised(tabId)) {
        Gofast.sideFileBrowser.selectCurrentItem(tabId, open);
        return;
      }

      const tabHtmlId = "#" + tabId;
      const $tabContentContainer = $(tabHtmlId);
      // No such tab on this page (mobile, Essential...): nothing to load
      if (!$tabContentContainer.length) {
        return;
      }

      $tabContentContainer.addClass("processed")
      $.get(`/gofast/${tabId}/explorer`).done(function(data){
        $tabContentContainer.html(data);
        Gofast.sideFileBrowser.selectCurrentItem(tabId, open);
      });

      const $tabButton = $('#explorer').find('[data-toggle="tab"][data-target="'+tabHtmlId+'"]');

      // Refresh was queued and we're about to show the tab? Refresh the content.
      $tabButton.on('show.bs.tab', () => {
        if ($tabContentContainer.hasClass('gf-refresh-queued')) {
          $tabContentContainer.removeClass('gf-refresh-queued');
          Gofast.sideFileBrowser.refreshBrowser(tabId, { open: false });
        }
      })

      // When a node is restored, refresh the tab as it may have featured the
      // node or its contents.
      $(window).on('gofast:node_restored', (_event) => {
        Gofast.sideFileBrowser.queueBrowserRefresh(tabId);
      })
    },
    /**
     * Queue a tab to be refreshed.
     *
     * If the tab is currently active, it is immediately refreshed. Otherwise,
     * it is marked to be refreshed when next selected to save on resources.
     *
     * @param {string} tabId ID of the side browser tab to queue a refresh for
     */
    queueBrowserRefresh: function (tabId) {
      const $browserTab = $('#' + tabId);
      if ($browserTab.hasClass('active')) {
        Gofast.sideFileBrowser.refreshBrowser(tabId, { open: false });
        return;
      }
      $browserTab.addClass('gf-refresh-queued');
    },
    /**
     * Refreshes the content of a given tab of the side browser.
     *
     * @param {string} tabId ID of the side browser tab to refresh
     * @param {object} [options] Additional options
     * @param {boolean} [options.open] Whether to open or not the side browser. Opens by default.
     */
    refreshBrowser: function(tabId, { open } = {}){

      // find container
      let container = $("#" +  tabId);

      // get stuff
      container.html('<div class="d-flex min-h-200px min-w-40px h-100 w-100"><div class="spinner spinner-primary m-auto"></div></div>');
      $.get(`/gofast/${tabId}/explorer`).done(function(data){
        container.html(data);
        Gofast.sideFileBrowser.selectCurrentItem(tabId, open);
      });
    },
    searchBrowser: function() { 
      clearTimeout(Gofast.ITHitMobile.searchProcess);
      const value =$(this).val();
      const elements = $(this).closest(".side-explorer-wrapper").find(".side-explorer-element");

      Gofast.ITHitMobile.searchProcess = setTimeout(function(){
        Gofast.ITHitMobile.search(
          value,
          false,
          true,
          elements
        );
      });
    },
    treeWidgetItemCollapseCallback: function() {
      const $webformOpenElement = $(this);

      // toggle chevron of clicked element and keep track whether we're collapsing or not to handle children elements
      let collapse = true;
      if ($webformOpenElement.hasClass("ki-bold-arrow-next")) {
          collapse = false;
          $webformOpenElement.removeClass("ki-bold-arrow-next").addClass("ki-bold-arrow-down");
      } else {
          $webformOpenElement.removeClass("ki-bold-arrow-down").addClass("ki-bold-arrow-next");
      }
  
      const $webformItemElement = $webformOpenElement.parent().parent();
      if (collapse) {
          Gofast.sideFileBrowser.closeItemSiblings($webformItemElement);
      } else {
          Gofast.sideFileBrowser.openItemSiblings($webformItemElement, "DESC", false);
      }
    },
    closeItemSiblings: function(selector, direction = "DESC", recursive = true, initialCall = true) {

      const $widgetSiblings = $(selector);

      // we don't want to hide the first item since it's the parent of the closed items
      if (!initialCall && direction == "DESC") {
        $widgetSiblings.removeClass("side-explorer-element-visible").addClass("side-explorer-element-collapsed");
      }
      $widgetSiblings.find(".side-explorer-element-open").removeClass("ki-bold-arrow-down").addClass("ki-bold-arrow-next");
    
      if (!recursive && !initialCall) {
        return;
      }
  
      const widgetTableId = $widgetSiblings.closest(".side_element-explorer-element-table").attr("id")
      let nextWidgetSiblingSelector = [];
  
      if (direction == "DESC") {
        for (const widgetSibling of $widgetSiblings) {
          const currentWidgetSiblingId = $(widgetSibling).attr("id");
          if (currentWidgetSiblingId != undefined && currentWidgetSiblingId != 0) {
            nextWidgetSiblingSelector.push("#" + widgetTableId + " [data-pid='" + currentWidgetSiblingId + "']");
          }
        }
      } else {
        for (const widgetSibling of $widgetSiblings) {
          const nextWidgetSiblingId = $(widgetSibling).find(".side-explorer-element-parent").text().trim();
          if (nextWidgetSiblingId != undefined && nextWidgetSiblingId != 0) {
            nextWidgetSiblingSelector.push("#" + widgetTableId + " #"  + nextWidgetSiblingId);
          }
        }
      }
      nextWidgetSiblingSelector = nextWidgetSiblingSelector.join(", ");
      const $nextSiblings = $(nextWidgetSiblingSelector);
      if ($nextSiblings.length) {
        Gofast.sideFileBrowser.closeItemSiblings($nextSiblings, direction, recursive, false);
      } else if (direction == "ASC") {
        // we don't want to hide a root item
        $widgetSiblings.removeClass("side-explorer-element-collapsed").addClass("side-explorer-element-visible");
      }
    },
    openItemSiblings: function(selector, direction = "ASC", recursive = true, initialCall = true) {

      const $widgetSiblings = $(selector);
      const widgetTableId = $widgetSiblings.closest(".side_element-explorer-element-table").attr("id");
  
      // if in ascending order, still open the first level descendants of the start items
      if (initialCall && direction == "ASC") {
        for (const widgetSibling of $widgetSiblings) {
          const currentWidgetSiblingId = $(widgetSibling).attr("id");
          $("#" + widgetTableId + " [data-pid='" + currentWidgetSiblingId + "']").removeClass("side-explorer-element-collapsed").addClass("side-explorer-element-visible");
          $(widgetSibling).find(".side-explorer-element-open").removeClass("ki-bold-arrow-next").addClass("ki-bold-arrow-down");
        }
      }
      // make sure we actually display all the siblings of the passed siblings
      for (const widgetSibling of $widgetSiblings) {
        const currentWidgetSiblingPid = $(widgetSibling).attr("data-pid");
        $("#" + widgetTableId + " [data-pid='" + currentWidgetSiblingPid + "']").removeClass("side-explorer-element-collapsed").addClass("side-explorer-element-visible");
        $("#" + widgetTableId + " #"+ currentWidgetSiblingPid).find(".side-explorer-element-open").removeClass("ki-bold-arrow-next").addClass("ki-bold-arrow-down");
      }
  
      if (!recursive && !initialCall) {
        return;
      }
  
      let nextWidgetSiblingSelector = [];
  
      if (direction == "ASC") {
        for (const widgetSibling of $widgetSiblings) {
          const nextWidgetSiblingId = $(widgetSibling).find(".side-explorer-element-parent").text().trim();
          if (nextWidgetSiblingId != undefined && nextWidgetSiblingId != 0) {
            nextWidgetSiblingSelector.push("#" + widgetTableId + " #" + nextWidgetSiblingId);
          }
        }
      } else {
        for (const widgetSibling of $widgetSiblings) {
          const currentWidgetSiblingId = $(widgetSibling).attr("id");
          if (currentWidgetSiblingId != undefined && currentWidgetSiblingId != 0) {
            nextWidgetSiblingSelector.push("#" + widgetTableId + " [data-pid='" + currentWidgetSiblingId + "']");
          }
        }
      }
      nextWidgetSiblingSelector = nextWidgetSiblingSelector.join(", ");
      const $nextSiblings = $(nextWidgetSiblingSelector);
      if ($nextSiblings.length) {
        Gofast.sideFileBrowser.openItemSiblings($nextSiblings, direction, recursive, false);
      }
    }, 
    selectCurrentItem: function(tabId = "file-browser", open = true) {
      let space_nid = $(".essentialFileBrowser").attr("data-nid");
      // Don't highlight home page on root spaces
      if(['4', '5', '6', '7'].includes(space_nid)){
        Gofast.sideFileBrowser.unselectAllItems()
        return
      }

      // If tab is not yet initialised, suppose we want to initialise it.
      // This function is called again once the tab is initialised.
      if (!Gofast.sideFileBrowser.isTabInitialised(tabId)) {
        Gofast.sideFileBrowser.initFileBrowser(tabId, { open });
        return;
      }

      const currentNode = Gofast.get("node");
      let tabSelector = "";
      if(tabId != ""){
        tabSelector = Gofast._settings.isEssential ? "#mobile_file_browser_wiki_container" : "#"+tabId
      }
      let $targetPageElement = $(tabSelector + " .side-explorer-element[data-nid='" +  currentNode.id + "']");
      // Show the wiki tree when navigating to a space when user is in the home tab
      if(Gofast._settings.isEssential && currentNode.type == "article"){
        $("#nav_mobile_file_browser_wiki_container").click()
      }
      if (!$targetPageElement.length && currentNode.type == "article") {
        Gofast.highlightEmptyHomePageItem()
        return;
      }
      Gofast.sideFileBrowser.unselectAllItems()
      $targetPageElement.find(".side-explorer-element-icon").removeClass("pt-3");
      $targetPageElement.addClass("gofastHighlightedItem bg-primary text-white pr-2 rounded");

      // Open parents if item is nested
      Gofast.sideFileBrowser.openItemSiblings($targetPageElement);
      if($targetPageElement.length){
        $targetPageElement[0].scrollIntoView({behavior: "smooth", block: "center"});
      }
      // Open left panel if closed
      if (open && !$("#explorer-toggle").hasClass("open")) {
        $("#explorer-toggle").click();
      }
      $(`[data-target="#${tabId}"]`).tab("show");
    },
    unselectAllItems: function() {
      $("#empty-home-page-wiki").addClass("d-none")
      $(".gofastHighlightedItem").find(".book-explorer-element-icon").removeClass("pt-3");
      $(".gofastHighlightedItem").removeClass("gofastHighlightedItem bg-primary text-white pr-2 rounded");
    }
  }

  Drupal.t("Meetings", {}, {context: 'gofast_cdel'});
  Drupal.t("Documents deadlines", {}, {context: 'gofast_cdel'});
  Drupal.t("Tasks", {}, {context: 'gofast_cdel'});

  //some translation strings
  Drupal.t("The rss feed has been added", {}, {context: 'gofast:gofast_rssfeed'});
  Drupal.t("The feed URL is invalid. Please enter a fully-qualified URL, such as<br /><br /><blockquote>https://fr.news.yahoo.com/?format=rss</blockquote>", {}, {context: 'gofast:gofast_rssfeed'});
  Drupal.t("The rss feed has been edited", {}, {context: 'gofast:gofast_rssfeed'});
  Drupal.t("The rss feed has been deleted", {}, {context: 'gofast:gofast_rssfeed'});
  Drupal.t("The rss feed has not been deleted", {}, {context: 'gofast:gofast_rssfeed'});
  Drupal.t("A new space is being created and will be shown as soon as it will be ready", {}, {context: 'gofast:ajax_file_browser'});
  Drupal.t("Unable to reach the company directory. If the problem persists, please contact your IT department.", {}, {context: 'gofast:gofast_ldap'});
  Drupal.t("Webform successfully submitted", {}, {context: 'gofast:gofast_webform'});
  Drupal.t('Image successfully changed!');
  Drupal.t("An error occurred while refreshing the content of the page. Please refresh the page.", {}, {context: "gofast"});
  Drupal.t("Retention action", {}, {context: "gofast:gofast_retention"})
  Drupal.t("Retention period", {}, {context: "gofast:gofast_retention"})
  Drupal.t("Download started...", {}, {context: 'gofast:gofast_link_sharing'});
  Drupal.t("Download again", {}, {context: 'gofast:gofast_link_sharing'});
  Drupal.t("Download completed", {}, {context: 'gofast:gofast_link_sharing'});
  Drupal.t("You can filter only by one space at a time", {}, {context: "gofast:gofast_cmis"}); // sites/all/modules/gofast/gofast_cmis/tpl/gofast-cmis-template-widget.tpl.php:~194

  //editableInputs placeholder and other dynamic-in-context translations
  const translatableFields = ["First name", "Last name", "Job position", "Your phone number", "Your email address", "Your organisation", "Your birthdate", "Your manager", "Description", "Your skills", "Your interests", "Your hobbies", "elements", "element"];
  for (const translatableField of translatableFields) {
    Drupal.t(translatableField);
  }
  const kanbanTranslatableFields = ["deadline", "status", "members", "person-in-charge", "description", "attachements"];
  for (const kanbanTranslatableField of kanbanTranslatableFields) {
    Drupal.t(kanbanTranslatableField, {}, {context: 'gofast:kanban'});
  }

  //Initialize CKEditor Object
  if(typeof Drupal.settings.ckeditor == "undefined"){
    Drupal.settings.ckeditor = {};
  }

  //Init hooks
  Gofast.hooks = {};
  Gofast.customHistoryBackOrBase = function(){
    const baseURL = window.location.origin;
    if (document.referrer.startsWith(baseURL)) {
      history.back();
    } else {
      // The previous URL is external or there's no history to go back to.
      // Navigate to the base URL of the current location.
      window.location.href = baseURL;
    }
  }
})(jQuery, Gofast, Drupal);
