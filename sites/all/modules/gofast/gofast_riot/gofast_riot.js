(function ($, Gofast, Drupal) {

  Gofast = Gofast || {};

  // Cross-tab listeners are attached once per page load (destroy() recreates Gofast.Riot)
  let sessionCheckAttached = false;

  Gofast._riot = function() {
    return {
      //############### PROPERTIES ###############
      // Is our Riot instancied
      isInit: false,
      
      // Is the right bloc expanded
      isExpanded: false,
      
      //Width of the right block when collapsed
      widthCollapsed: $('#conteneurIframe').width() < 100 ?  $('#conteneurIframe').width() : 68, // defined in css
      
      //Width of the right block when expended
      widthExpanded: 480,
      
      //Is our session ready in the browser
      sessionReady: false,

      //Another tab switched account while this one was hidden: re-init on next focus
      shouldInit: false,

      //Our access token to Element
      accessToken: "",
      
      intervals : {
        //Interval to display Element
        displayInterval: null,
        
        //Interval to add event when we switch room
        switchRoomEventInterval: null,
        
        //Interval to minimize the Element client
        minimizedEventInterval: null,
        
        //Interval to apply bubble events
        bubbleEventsInterval: null,
        
        //Interval to process tooltips
        tooltipsInterval: null,

        //Wait for the full content of the window to be loaded before interferring with elements inside
        waitForFullMatrixLoadInterval: null,

        //Wait for the full content of the base avatar to be displayed before replacing it
        waitForBaseAvatar: null
      },
      listeners: {
        onStorageChange: null,
        onVisibilityChange: null,
        // If click an element outside Riot, autoclose Riot modal to "shortcut" the focus lock trap
        // which otherwise would prevent focus on any parent document element
        shortcutFocusLock: function(e) {
          if (!$("#IframeRiotBloc").contents().length) {
            return;
          }
          const dialogButtons = $("#IframeRiotBloc").contents()[0].querySelectorAll(".mx_ImageView_button_close, .mx_Dialog_primary, .mx_Dialog_cancelButton");
          if ($("#IframeRiotBloc") && $("#IframeRiotBloc").contents()[0] && dialogButtons.length) {
            for (const dialogButton of dialogButtons) {
              dialogButton.click();
            }
            setTimeout(() => {
              $(e.target).focus();
            }, 500);
          }
        },
        onCallStateChange: function(e) {
          // Open side-panel chat when the phone rings
          if (e.detail.status == "ringing" && !Gofast.Riot.isExpanded){
            Gofast.Riot.expand();
          }
        },
      },
      
      // Settings to implement in the local storage for Element notifications
      notifications : {
        defaults : { //TO ENABLE AGAIN AUTOMATICALY
          notifications_enabled: true,        // Enable desktop notifications for this session
          audio_notifications_enabled: true,  // Enable audible notifications for this session
          notifications_body_enabled: true,   // Show message in desktop notification
        },
      },
      
      //############### METHODS ###############
      
      /*
       * Initialize Element, check if we have a session and display
      */
      init: async function (iframeId = false) {
        var hide_chat = 0;
        if (typeof Drupal.settings.hide_chat != "undefined") {
          hide_chat = Drupal.settings.hide_chat;
        }
        
        if(hide_chat == 1){
          $('.menu-link[href="/conversation"]').attr("href", "").attr("title", Drupal.t("This feature has been disabled on your server", {}, {context: "gofast:gofast_riot"}));
          Gofast.Riot.processHandleClickEvent();
          return;
        }

        //Inform that we are initializing Element
        Gofast.Riot.isInit = true;
        
        //Preconfiguration
        Gofast.Riot.processHandleClickEvent();
        Gofast.Riot.preconfigure();

        //Log in
        if(!localStorage.riot_access_token){
          // Connect and save token to local storage.
          await Gofast.Riot.login();
        }else{
          await Gofast.Riot.checkLogin();
        }

        //Display Element
        Gofast.Riot.display(iframeId);

        $(document).on("mousedown", Gofast.Riot.listeners.shortcutFocusLock);
        $(document).on("call_state", Gofast.Riot.listeners.onCallStateChange);

        //Start watching for logout / account switch from other tabs
        Gofast.Riot.startSessionCheck();
      },

      destroy: function(collapse = true, iframeId = false){
        if (collapse) {
          Gofast.Riot.collapse();
        }
        for (const listener of Object.values(this.listeners)) {
          window.removeEventListener('storage', listener);
        }
        for (const interval of Object.values(this.intervals)) {
          if (interval !== null) {
              clearInterval(interval);
          }
        }
        if (iframeId) {
          $("#" + iframeId).attr("src", "");
        } else {
          $("#IframeRiotBloc").attr("src", "");
          $("#IframeRiot").attr("src", "");
          $("#gf_conversation").attr("src", "");
        }
        Gofast.Riot = null;
        Gofast.Riot = Gofast._riot();
        $(document).off("mousedown", Gofast.Riot.listeners.shortcutFocusLock);
      },

      /*
       * Preconfigure Element before instanciation
      */
      preconfigure: function(){
        // Sort rooms by activity. Always show rooms with unread messages first.
        localStorage['mx_listOrder_im.vector.fake.recent'] = 'IMPORTANCE'; // | NATURAL
        localStorage['mx_tagSort_im.vector.fake.recent'] = 'RECENT'; // | ALPHABETIC
        localStorage['mx_im.vector.fake.recent_sortBy'] = "RECENT"; // | ALPHABETIC

        // Same for user list.
        localStorage['mx_listOrder_im.vector.fake.direct'] = 'IMPORTANCE';
        localStorage['mx_tagSort_im.vector.fake.direct'] = 'RECENT';
        localStorage['mx_im.vector.fake.direct_sortBy'] = "RECENT"; // | ALPHABETIC

        // Localization
        let mxSettings = {};
        if (localStorage['mx_local_settings']) {
          try {
            mxSettings = JSON.parse(localStorage['mx_local_settings']); // keep already existing settings
          } catch (e) {
            console.error(e)
          }
        }
        mxSettings["webRtcForceTURN"] = Drupal.settings.DISABLE_P2P_RIOT; // disable P2P if configuration says so
        mxSettings["language"] = Drupal.settings.gofast.language; // for the language regardless of existing settings
        localStorage['mx_local_settings'] = JSON.stringify(mxSettings);

        // Browser compatiblity check
        Gofast.Riot.checkBrowserCompatibility();

        //Force minimized client
        localStorage['mx_lhs_size'] = 0;
        
        //Copy Riot token if available for Element to consume it to log in
        if(typeof localStorage['riot_access_token'] == "string"){
          localStorage['mx_access_token'] = localStorage['riot_access_token'];
        }
      },

      /*
       * Given an iframe DOM id attribute, set the src to a new riot instance,
       * taking into account the room id if the iframe targets a room.
       * This can also works as a riot instance refresh without resetting riot storage.
       */
      setIframeSrc: function(iframeId){
        if (!$("#" + iframeId).length) {
          return;
        }
        const roomId = $("#" + iframeId).attr("data-room");
        if (roomId) {
          $("#" + iframeId).attr("src", "/sites/all/libraries/riot/index.html#/room/" + roomId);
        } else {
          $("#" + iframeId).attr("src", "/sites/all/libraries/riot/index.html");
        }
      },

      /*
       * We make the same browser compatibility check Element does
       * except for the ES2020 check which may fail at times even with modern browsers
       * @see checkBrowserFeatures function in src/vector/index.ts in Element source code
       */
      checkBrowserCompatibility: function(){
        const tests = [
          typeof window.Promise.prototype.finally === "function",
          window.RegExp.prototype && !!Object.getOwnPropertyDescriptor(window.RegExp.prototype, "dotAll"),
          typeof window.Object.fromEntries === "function"
        ];
        const isBrowserCompatible = !tests.includes(false);
        if (isBrowserCompatible) {
          window.localStorage.setItem('mx_accepts_unsupported_browser', String(true));
        }
      },

      /*
       * Ask Element for a session
      */
      login: async function () {
        const drupalUsername = await Gofast.whoAmI();
        const loginParams = {user: drupalUsername.toLowerCase(), password: Drupal.settings.TOKEN_RIOT, type: "m.login.password"};
        await $.ajax({
          url: "https://" + Drupal.settings.GOFAST_COMM + "/_matrix/client/r0/login",
          type: "POST",
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify(loginParams),
          dataType: "json",
          success: await Gofast.Riot.onLogin,
          error: function(jqXHR, textStatus, errorThrown) {
            Gofast.Riot.handleFailure(jqXHR, textStatus, errorThrown);
          },
          timeout: function(jqXHR, textStatus, errorThrown) {
            Gofast.Riot.handleFailure(jqXHR, textStatus, errorThrown);
          },
        });
      },

      /*
       * Check if our element session is valid
      */
      checkLogin: async function(){
        await $.ajax({
          url: "https://" + Drupal.settings.GOFAST_COMM + "/_matrix/client/r0/account/whoami?access_token=" + localStorage.riot_access_token,
          type: 'GET',
          dataType: 'json',
          success: await Gofast.Riot.onCheckLoginSuccess,
          error: Gofast.Riot.onCheckLoginError
        });
      },

      onCheckLoginError: function (jqXHR, textStatus, errorThrown) {
        delete Drupal.settings.ACCESS_TOKEN_RIOT;
        localStorage.removeItem("riot_access_token");
        localStorage.removeItem("mx_access_token");
        Gofast.Riot.destroy();
        Gofast.Riot.init();
      },

      onCheckLoginSuccess: async function(data) {
        const hasIntegrity = await Gofast.Riot.checkTokenIntegrity(data);
        if (!hasIntegrity) {
          return;
        }
        data.access_token = localStorage.riot_access_token;
        data.well_known = {"m.homeserver": {base_url: "https://" + Drupal.settings.GOFAST_COMM + "/"}};
        await Gofast.Riot.onLogin(data);
      },

      /**
       * Verifies the integrity of the user token by comparing the user ID in the
       * provided data against the current Drupal session user.
       * @returns {boolean} True if the token is valid and matches the session; false otherwise.
       */
      checkTokenIntegrity: async function(data) {
        const riotUsername = data?.user_id?.split("@")[1].split(":")[0];
        const drupalUsername = await Gofast.whoAmI();
        if (riotUsername.toLowerCase() == drupalUsername.toLowerCase()) {
          return true;
        }
        localStorage.removeItem("riot_access_token");
        localStorage.removeItem("mx_access_token");
        return false;
      },

      /*
       * After getting an Element session, save it in the browser
      */
      onLogin: async function (data) {
        if(data.access_token){
          const hasIntegrity = await Gofast.Riot.checkTokenIntegrity(data);
          if (!hasIntegrity) {
            return;
          }
          //Save the session in the browser
          Gofast.Riot.save_user(data);
          
          //Save the session in the backend
          $.ajax({
            url: window.location.origin + '/SaveRiotToken',
            type: 'POST',
            data: {token: data.access_token},
            dataType: 'html',
          });
          
          Gofast.Riot.accessToken = data.access_token;
        }else{
          Gofast.Riot.accessToken = localStorage.riot_access_token;
        }

        //Our session is ready
        Gofast.Riot.sessionReady = true;
      },

      /*
       * Watch for logout / account switch happening in other tabs
       * ('storage' events only fire on the other tabs, not the one that made the change)
      */
      startSessionCheck: function(){
        if (sessionCheckAttached) {
          return;
        }
        sessionCheckAttached = true;

        window.addEventListener('storage', (event) => {
          if (event.key !== 'riot_access_token') {
            return;
          }
          const newToken = event.newValue;
          const oldToken = Gofast.Riot.accessToken;

          //Logout in another tab: stop our session right away, nothing to re-init
          if (!newToken) {
            if (Gofast.Riot.isInit) {
              Gofast.Riot.destroy();
            }
            return;
          }

          //Another account logged in: stop the stale session right away
          if (newToken !== oldToken) {
            if (Gofast.Riot.isInit) {
              Gofast.Riot.destroy();
            }
            if (document.visibilityState == "visible") {
              Gofast.Riot.init();
            } else {
              //Background tabs are throttled by the browser, re-init on next focus instead
              Gofast.Riot.shouldInit = true;
            }
          }
        });

        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState == "visible" && Gofast.Riot.shouldInit) {
            Gofast.Riot.shouldInit = false;
            Gofast.Riot.init();
          }
        });
      },

      /*
       * Save our Element session in the local storage
      */
      save_user: function (data) {
        localStorage.mx_access_token = data.access_token;
        localStorage.riot_access_token = data.access_token;
        localStorage.mx_user_id = data.user_id;
        localStorage.mx_device_id = data.device_id;
        localStorage.mx_hs_url = data['well_known']['m.homeserver'].base_url;
      },

      handleFailure: async function(jqXHR, textStatus, errorThrown){
        if (jqXHR && jqXHR.status === 403) {
          Drupal.settings.TOKEN_RIOT = await $.ajax({
            url: window.location.origin + '/GetRiotTokenJS',
            type: 'GET',
            dataType: 'html',
          });
        }
        // first we check if the COMM server is up
        const pingCommEndpoint = "https://" + Drupal.settings.GOFAST_COMM + "/.well-known/matrix/client";
        $.get(pingCommEndpoint).done(function(data, status) {
          if (status != "success") {
            Gofast.toast(Drupal.t("The Element server is not available. Please try again later.", {}, {context: "gofast:gofast_riot"}), "error");
            Gofast.Riot.destroy();
            return;
          }
        }).error(() => {
          Gofast.toast(Drupal.t("The Element server is not available. Please try again later.", {}, {context: "gofast:gofast_riot"}), "error");
          Gofast.Riot.destroy();
          return;
        });
        // if COMM server is up, we add a reload button to be able to re-init the riot block from scratch
        $("#IframeRiotBloc").attr("src", "");
        $("#IframeRiot").attr("src", "");
        $("#gf_conversation").attr("src", "");
        $("#IframeRiotBloc").hide();
        $(".gofastRiotReload").removeClass("d-none");
      },
      
      /*
       * Element is ready, display it
      */
      display: function(iframeId = false){
        var hide_chat = 0;
        if (typeof Drupal.settings.hide_chat != "undefined") {
          hide_chat = Drupal.settings.hide_chat;
        }
        
        if(hide_chat == 1){  
          return;
        }
      
        if (Gofast.Riot.intervals.displayInterval) {
          return;
        }
        //Wait for our session to be ready
        let displayAttemptsCounter = 0;
        Gofast.Riot.intervals.displayInterval = setInterval(async () => {
          // if it has been more than 30 seconds we're trying to connect
          if (displayAttemptsCounter > 100) {
            Gofast.Riot.handleFailure();
            clearInterval(Gofast.Riot.intervals.displayInterval);
            return;
          }
          if(!Gofast.Riot.sessionReady){
            displayAttemptsCounter++;
            return;
          }
          
          //Display Element
          $(".gofastRiotReload").addClass("d-none");
          if (iframeId) {
            Gofast.Riot.setIframeSrc(iframeId);
          } else {
            $("#IframeRiotBloc").attr("src", "/sites/all/libraries/riot/index.html");
            $("#IframeRiot").attr("src", "/sites/all/libraries/riot/index.html");
            $("#gf_conversation").attr("src", "/sites/all/libraries/riot/index.html#/room/" + $("#gf_conversation").attr("data-room"));
          }
          $("#IframeRiotBloc").show();

          clearInterval(Gofast.Riot.intervals.displayInterval);

          //Wait for content to be fully loaded
          await new Promise((resolve, reject) => {
            Gofast.Riot.intervals.waitForFullMatrixLoadInterval = setInterval(() => {
              if (!document.querySelector("#IframeRiotBloc") || !document.querySelector("#IframeRiotBloc").contentWindow.document.querySelector(".mx_MatrixChat")) {
                return;
              }
              clearInterval(Gofast.Riot.intervals.waitForFullMatrixLoadInterval);
              $("#IframeRiotBloc").contents().find('body').addClass("gofast-side-content").addClass("gofast-side-content-collapsed");
              $("#IframeRiotBloc").contents().find('body').addClass("gofast-side-content-collapsed");
              Gofast.Riot.isExpanded = false;
              // don't trigger element contextual menu when element is collapsed
              $("#IframeRiotBloc").contents().find(".mx_UserMenu").css("pointer-events", "none");
              //Our session is ready, display and process Element
              Gofast.Riot.applyBubbleEvents();
              Gofast.Riot.processTooltips();
              resolve();
            }, 100);
          });
        }, 300);
      },
      
      /*
       * Check our bubble elements and check if they have the click event to open the client automatically
      */
      applyBubbleEvents: function(){
        //Constantly (every 1.5s) check if the bubbles are clickable
        clearInterval(Gofast.Riot.intervals.bubbleEventsInterval);
        
        Gofast.Riot.intervals.bubbleEventsInterval = setInterval(function(){
          var $iframe_body = $("#IframeRiotBloc").contents().find('body');
          
          $iframe_body.find('.mx_AccessibleButton').not("click-expand-processed").on('click', function() {
            if(!Gofast.Riot.isExpanded){
              Gofast.Riot.expand();
            }
          }).addClass("click-expand-processed");
        }, 1500);
      },

      //Move the user menu to a visible place
      showUserMenu: function(iframeHolder = "#IframeRiotBloc"){
        const $leftPanel = $(iframeHolder).contents().find(".mx_LeftPanel_filterContainer");
        const $userMenu = $(iframeHolder).contents().find(".mx_UserMenu");
        // we don't have to show the avatar image twice in the same area, so we wait for the riot avatar to be loaded and replace it by an icon
        Gofast.Riot.intervals.waitForBaseAvatar = setInterval(() => {
          clearInterval(Gofast.Riot.intervals.waitForBaseAvatar);
          if (!$userMenu.find(".mx_BaseAvatar").length) {
            return;
          }
          clearInterval(Gofast.Riot.intervals.waitForBaseAvatar);
          setTimeout(() => {
            $userMenu.find(".mx_BaseAvatar").html('<img loading="lazy" alt="" src="'+document.location.origin+'/sites/all/modules/gofast/gofast_mail_queue/icon/cog-solid-grey.png" crossorigin="anonymous" referrerpolicy="no-referrer" data-type="round" width="24px" height="24px">');
            $leftPanel.prepend($userMenu);
          }, 1000);
        }, 100);
      },
      
      processTooltips: function(){
        clearInterval(Gofast.Riot.intervals.tooltipsInterval);
        Gofast.Riot.intervals.tooltipsInterval = setInterval(function() {
          if (!$("#IframeRiotBloc").contents().find('body').find(".mx_RoomSublist_minimized").length || $("#IframeRiotBloc").contents().find('body').find(".mx_RoomSublist_minimized .mx_RoomSublist_skeletonUI").length > 0) {
            return;
          }
          
          // Make tooltips always visible regardless of the bloc being collapsed or not.
          var $tooltip = $('<div/>');

          var $iframe_body = $("#IframeRiotBloc").contents().find('body');
          $iframe_body.on('mouseover', 'div.mx_AccessibleButton', function(e) {
            setTimeout(function() {
              // Remove any previous tooltip if any.
              if ($tooltip) {
                $tooltip.remove();
              }

              if (Gofast.Riot.isExpanded) {
                // Nothing to do, just display original tooltip.
                $(e.delegateTarget).find('.mx_Tooltip_wrapper').css('display', 'block');
                return;
              }

              // We make a copy, no detach() otherwise react will throw an error
              // when trying to remove the compoenent.
              $tooltip = $(e.delegateTarget).find('.mx_Tooltip').clone();

              if ($tooltip && !$tooltip.length) {
                // hover intent was not long enough to make the toolip appear OR there is no mx_Tooltip
                if (typeof $(e.delegateTarget).attr("aria-label") != "undefined" && typeof $(e.delegateTarget).attr("title") == "undefined") {
                  $(e.delegateTarget).attr("title",  $(e.delegateTarget).attr("title") ??  $(e.delegateTarget).attr("aria-label"));
                }
                return;
              }

              // Adjust styles according to bloc state.
              var top = parseInt($tooltip.css('top')) + 50;
              var right = parseInt($tooltip.css('right'));

              if ($tooltip) {
                $tooltip.css({
                  top: top + 'px',
                  left: 'unset',
                  right: right + 10 + 'px',
                });

                // Insert the tooltip into the DOM outside the iframe so it can expand
                // properly.
                $tooltip.appendTo('#conteneurIframe');
              }
            }, 100);
          });

          $iframe_body.on('mouseout', 'div.mx_RoomTile,.mx_RoomSublist_headerText', function(e) {
            if (!$tooltip.length && typeof $(e.delegateTarget).attr("aria-label") != "undefined" && typeof $(e.delegateTarget).attr("title") != "undefined") {
              $(e.delegateTarget).removeAttr("title");
            }
            if ($tooltip) {
              $tooltip.remove();
            }
          });
          clearInterval(Gofast.Riot.intervals.tooltipsInterval);
        });
      },

      processHandleClickEvent: function(){
        $('#animateRiot').once('animated', function () {
          $(this).click(Gofast.Riot.onHandleClick);
        });
        $(".gofastRiotReload:not('.processed')").addClass("processed").on("click", function(){
          Gofast.Riot.destroy(false);
          Gofast.Riot.isInit = false; // this will not unset the login token in local storage so sessions will remain synced after init
          Gofast.Riot.init();
        });
      },
      
      /*
       * Handle the click on the expand/collapse bubble button
      */
      onHandleClick: function () {
        if (Math.floor($('#conteneurIframe').innerWidth()) <= Gofast.Riot.widthCollapsed) {
          Gofast.Riot.expand();
        }
        else {
          Gofast.Riot.collapse();
        }
        if(Gofast._settings.isEssential){
          if(Gofast.Riot.isExpanded){
            $("#animateRiot > i.fa-chevron-left").removeClass("fa-chevron-left").addClass("fa-chevron-right")
          } else {
            $("#animateRiot > i.fa-chevron-right").removeClass("fa-chevron-right").addClass("fa-chevron-left")
            
          }
        }
      },
      
      /*
       * Expand de right block
      */
      expand: function () {
        var w = Gofast.Riot.widthExpanded;
        $('#conteneurIframe').animate({width: w + 'px'});
        Gofast.Riot.isExpanded = true;
        $("#IframeRiotBloc").contents().find('body').removeClass("gofast-side-content-collapsed");
        $("#IframeRiotBloc").contents().find(".mx_UserMenu").css("pointer-events", "auto");
      },
      
      /*
       * Collapse the right block
      */
      collapse: function () {
        var w = Gofast.Riot.widthCollapsed;
        $('#conteneurIframe').animate({width: w + 'px'});
        Gofast.Riot.isExpanded = false;
        $("#IframeRiotBloc").contents().find('body').addClass("gofast-side-content-collapsed");
        $("#IframeRiotBloc").contents().find(".mx_UserMenu").css("pointer-events", "none");
      },
    };
  };
  
  $(document).ready(function(){
    if (Drupal.settings.ACCESS_TOKEN_RIOT && Drupal.settings.ACCESS_TOKEN_RIOT != localStorage.riot_access_token) {
      localStorage.setItem("riot_access_token", Drupal.settings.ACCESS_TOKEN_RIOT);
    }
    // Don't load Element if on tablet of mobile devices
    if(Gofast.isTablet() || Gofast.isMobile()){
      return;
    }
    //Initialize our Riot library
    Gofast.Riot = Gofast._riot();
    //Initialize Element
    Gofast.Riot.init();
  });

})(jQuery, Gofast, Drupal, ifvisible);
