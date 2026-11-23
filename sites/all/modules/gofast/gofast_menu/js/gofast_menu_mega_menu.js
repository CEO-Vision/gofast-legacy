/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Library JS to instanciate and manage special component for MENU.
 *
 * This component required the following specific template to work
 * cf.
 * - gofast-menu-header-menu-item.tpl.php
 * - gofast_menu_menu_content.tpl.php
 * - gofast-menu-menu-item.tpl.php
 *
 * ---------------------------------
 * see HOW TO USE in GOFAST-6891
 *
 */
var GFMegaMenu = (function ($) {

    /**
     * @typedef {number|`${number}`} GID Numeric identifier of group/spaces.
     *  Note that it may be either a numeric string of a number.
     */
    //Private propoerties
    var _menuElement;
    var _menuObject;
    var _ajaxUrl;
    var _debug;
    var _subMenusCall;
    var _time = 800;

    /**
     * Mega Menu memo entry, to cache html and parent/child relationships
     * @typedef {Object} MMMemoEntry
     * @property {GID | null} parent Id of the parent group/node, or null if it
     *  is unknown or if none exists (root space).
     * @property {string | null} html Rendered HTML string for the space's
     *  submenu, or null if it hasn't been rendered yet.
     * @property {GID[]} children List of known children group/spaces' ids.
     */
    /**
     * Mega menu memo/cache for each submenu html and parent/child relationships
     * @type {{[key:number]:MMMemoEntry|undefined}}
     */
    const _memo = {};

    /**
     * Updates entries in the html cache given their gid and a mapping function.
     *
     * @param {GID} gid The gid of the node of which the menu entry cache should be updated
     * @param {(memo:MMMemoEntry) => MMMemoEntry} callback A function that maps the previous cache state to the
     *  new/updated one. The parameter gets a default entry value if the cache did not contain an entry for the given
     *  gid.
     */
    const _updateMemo = (gid, callback) => {
      const result = callback(
        _memo[gid] ?? {
          parent: null,
          html: null,
          children: [],
        }
      );
      _memo[gid] = result;
      return result;
    };

    /**
     * Updates the parent and children properties in cache of the given gid to add one to another.
     *
     * @see {@linkcode _removeMemoRelationship} to remove a relationship from cache.
     *
     * @param {GID} parentGID The gid of the entry to which childGID should be appended to children
     * @param {GID} childGID The gid of the entry to which parentGID should overwrite parent
     */
    const _setMemoRelationship = (parentGID, childGID) => {
      _updateMemo(childGID, (memo) => ({ ...memo, parent: parentGID }));
      _updateMemo(parentGID, (memo) => ({
        ...memo,
        children: [...memo.children, childGID],
      }));
    };

    /**
     * Updates the parent and children properties in cache of the given gid to remove one from another
     *
     * @see {@linkcode _setMemoRelationship} to add a relationship to cache.
     *
     * @param {GID} parentGID The gid of the entry to which childGID should be removed from children
     * @param {GID} childGID The gid of the entry of which parent should be set to null
     */
    const _removeMemoRelationship = (parentGID, childGID) => {
      _updateMemo(childGID, (memo) => ({ ...memo, parent: null }));
      _updateMemo(parentGID, (memo) => ({
        ...memo,
        children: memo.children.filter((gid) => gid !== childGID),
      }));
    };

    //Private functions
    var _init = function () {

        _menuObject = new Object(_menuElement, {
            async: {
                url: _ajaxUrl,
                param: ''
            }
        });

        _subMenusCall = null;
        _debug = false;

    };

    var _log = function (msg) {
        if (_debug) {
            console.log(msg);
        }
    }

    var _getSubMenus = function (gid, params, callback) {

        _log("_getSubMenus - START");
        try {
          // try to get memoized submenu content
          const url = new URL(_ajaxUrl, location.origin);
          url.searchParams.set('gid', String(gid));

          const memoizedHTML = _memo[gid]?.html;

          _subMenusCall = null;
          if (memoizedHTML != null) {
            // use cached content
            callback?.(memoizedHTML);
            return;
          }

          // retrieve new submenu content
          _subMenusCall = jQuery.ajax({
            url: url.href,
            data: params,
            dataType: "html",
            success: function (data) {
              // update cache and notify
              _updateMemo(gid, (memo) => ({ ...memo, html: data }));
              callback?.(data);
            },
            always: function (data) {
              _subMenusCall = null;
            },
          });
        } finally {
          _log("_getSubMenus - END");
        }
    };

    var _moveToLeft = function () {
        _log("_moveToLeft - START");

        var currentWidth = parseInt(jQuery('div.gf-megamenu').width());
        var maxWidth = parseInt(jQuery('div.gf-megamenu').css("max-width"));

        var elColumn = jQuery('div.gf-megamenu').find('li.menu-item:first');
        var columnWidth = parseInt(jQuery(elColumn).innerWidth());

        if(! jQuery('#gf-megamenu-sidebar-left').hasClass('d-none')){
            currentWidth = currentWidth - 20 ;
        }

        if ((currentWidth + columnWidth) > maxWidth) {

            //Get column to hide
            var columnToHide = jQuery('div.gf-megamenu').find('li:first').siblings(':visible:not(.gf-megamenu-sidebar):first');
            jQuery(columnToHide).hide();

            /*
             columnToHide.animate({
             opacity: 0.25,
             width: "toggle"
             }, 400, function () {
             // Animation complete.
             });

             var options = {
             'effect': 'slide',
             'easing': 'swing',
             'duration' : 1000
             };
             columnToHide.hide(options);
             */

            //display/hide the div with arrow
            _showSideBar('left');
        }
        _log("_moveToLeft - END");

    };

    var _moveToRight = function () {
        _log("_moveToRight - START");

        var currentWidth = parseInt(jQuery('div.gf-megamenu').width());
        var maxWidth = parseInt(jQuery('div.gf-megamenu').css("max-width"));

        var elColumn = jQuery('div.gf-megamenu').find('li.menu-item:first');
        var columnWidth = parseInt(jQuery(elColumn).innerWidth());

        if ((currentWidth - columnWidth) < maxWidth) {

            //Get column to hide
            var firstVisibleColumn = jQuery('div.gf-megamenu').find('li:first').siblings(':visible:not(.gf-megamenu-sidebar):first');
            var columnToShow = jQuery(firstVisibleColumn).prev(':not(.gf-megamenu-sidebar)');

            jQuery(columnToShow).show("slow");
            /*
             var options = {
             'effect': 'slide',
             'easing': 'swing',
             'duration' : 1000
             };
             columnToShow.show(options);
             */

            var stillHiddenSiblings = jQuery('div.gf-megamenu').find('li:first').siblings(':hidden:not(.gf-megamenu-sidebar)');
            if (stillHiddenSiblings.length == 0) {
                _hideSideBar('left');
            }
        }
        _log("_moveToRight - END");
    };

    var _hideSideBar = function (side) {
        jQuery('#gf-megamenu-sidebar-' + side).addClass('d-none');
    };

    var _hideSubmenu = function (item, classAlso) {

        _log('_hideSubmenu START');

        var parent_item = jQuery(item).parents('li:first').get(0);

        // remove submenu activation class
        if (classAlso) {
            jQuery(parent_item).removeClass('menu-item-hover');
            jQuery(parent_item).removeClass('menu-item-active-tab');
        }

        // clear timeout
        parent_item.removeAttribute('data-hover');

        if (parent_item.getAttribute('data-menu-toggle-class')) {
            jQuery(parent_item).removeClass(body, item.getAttribute('data-menu-toggle-class'));
        }

        var timeout = parent_item.getAttribute('data-timeout');
        parent_item.removeAttribute('data-timeout');
        clearTimeout(timeout);

        _log('_hideSubmenu END');
    };

    var _showSideBar = function (side) {
        _log('_showSideBar END');

        jQuery('#gf-megamenu-sidebar-' + side).removeClass('d-none');

        _log('_showSideBar END');
    };

    var _cleanSubMenus = function (submenu_container) {
        _log("_cleanSubMenus - START");
        if (submenu_container.next().length > 0) {

            submenu_container.nextUntil().each(function () {

                if (!jQuery(this).hasClass('gf-megamenu-sidebar') && !jQuery(this).hasClass('gf-megamenu-empty')) {
                    jQuery(this).remove();
                    _moveToRight();
                }
            });
        }
        _log("_cleanSubMenus - END");
    };

    var _onMenuLeave = function (event) {
        _log("_onMenuLeave - START");

        if (event.type == "mouseout") {
            event.stopPropagation();
        }

        if (event.type == "mouseleave" /*&& jQuery(event.target).hasClass('.gf-megamenu') */) {
            event.stopPropagation();
            var item = event.target;

            var parent_item = jQuery(item).parents('li:first').get(0);

            var timeout = setTimeout(function() {
                if ( parent_item.getAttribute('data-hover') == '1' ) {
                    _hideSubmenu(item, true);
                }
            }, _time);

            parent_item.setAttribute('data-hover', '1');
            parent_item.setAttribute('data-timeout', timeout);

        }

        _log("_onMenuLeave - END");
    };

    var _onMenuNavigate = function (event) {

        _log("_onMenuNavigate - START");

        if (event.type == "mouseleave") {

            var currentMenuCol = event.target;
            var target = event.relatedTarget;

            _abortSubMenuCall();

            if (target.tagName != 'LI' || !jQuery(target).hasClass('gf-megamenu-col')) {
                var targetMenuCol = jQuery(target).parents('li.gf-megamenu-col').get(0);
            } else {
                var targetMenuCol = target;
            }

            if (jQuery(currentMenuCol).index() > jQuery(targetMenuCol).index()) {

                var item = event.target;
                var submenu_container = jQuery(item);

                _cleanSubMenus(submenu_container);
            }
        }

        _log("_onMenuNavigate - END");
    }

    var _onMenuHover = function (event) {
        _log("_onMenuHover - START");

        if (event.type == "mouseenter") {

            _abortSubMenuCall();

            var item = event.target;
            var submenu_container = jQuery(item).parent().parent();

            _highlightMenu(item);

            if (jQuery(item).hasClass('menu-item-submenu')) {

                _moveToLeft();
                _loadSubMenu(item);

            } else {
                _cleanSubMenus(submenu_container);
                _hasSubMenu(item, {
                  then: function (item) {
                    //has new submenu => load them
                    jQuery(item).addClass("menu-item-submenu");
                    jQuery(item)
                      .find("a.menu-link")
                      .append('<i class="menu-arrow"></i>');
                    _loadSubMenu(item);
                  },
                });
            }

        } else if (event.type == "mouseleave") {

            _abortSubMenuCall();

        }
        _log("_onMenuHover - END");
    };

    /**
     * Checks if a node has a submenu, and calls given callbacks afterwards
     * @param {*} item Jquery submenu item of the node to check
     * @param {Object} [callbackOptions] option object for
     *  callbacks to execute once the check is done, depending on the result.
     * @param {(item:any) => void} [callbackOptions.then] Callback for when
     *  the node has a submenu.
     * @param {(item:any) => void} [callbackOptions.otherwise] Callback for when
     *  the node does NOT have a submenu.
     */
    var _hasSubMenu = function(item, {then: thenCallback, otherwise: otherwiseCallback} = {}) {
        // check if there is a submenu
        var gid = jQuery(item).attr("data-gid");
        var params = {};

        _getSubMenus(gid, params, function (data) {
            var frag = document.createRange().createContextualFragment(data);
            if(jQuery(frag).find('span.menu-text').length > 0){
              thenCallback?.(item);
            } else {
              otherwiseCallback?.(item);
            }
        });
    }

    var _addEmptySubMenu = function (item) {

        _log('_addEmptySubMenu - START');

        var submenu_container = jQuery(item).parent().parent();

        if (jQuery(item).hasClass('gf-megamenu-static-submenu')) {
            submenu_container = jQuery(item).parent().parent().next();
        }

        jQuery(submenu_container).after('<li class="gf-megamenu-empty menu-item p-2 overflow-hidden w-275px"></li>');

        _log('_addEmptySubMenu - END');
    }

    var _loadSubMenu = function (item) {
        _log('_loadSubMenu - START');

        var submenu_container = jQuery(item).parent().parent();

        if (jQuery(item).hasClass('gf-megamenu-static-submenu')) {
            _hideSideBar('left');
            submenu_container = jQuery(item).parent().parent().next();
        }

        var gid = jQuery(item).attr("data-gid");
        var elemId = jQuery(item).attr("id");
        var params = {};

        _cleanSubMenus(submenu_container);
        if (jQuery(submenu_container).next('.gf-megamenu-empty').length == 0) {
            _addEmptySubMenu(item);
        }

        _getSubMenus(gid, params, function (data) {
            var frag = document.createRange().createContextualFragment(data);
            _attachEvents(frag);
            // detect children and add self as parent in memo entry
            $(frag)
              .find("[data-gid]")
              .each((_i, el) => {
                const childGID = $(el).attr("data-gid");
                _setMemoRelationship(gid, childGID);
              });

            jQuery(submenu_container).after(frag);
            jQuery('.gf-megamenu-empty').remove();

            //load perfect scroll bar
            jQuery('[data-scroll="true"]').each(function() {
                var el = jQuery(this);

                KTUtil.scrollInit(this, {
                    mobileNativeScroll: true,
                    handleWindowResize: true,
                    rememberPosition: (el.data('remember-position') == 'true' ? true : false)
                });
            });

        });

        _log('_loadSubMenu - END');

    };

    var _attachEvents = function (submenu_container) {

        _log("_attachEvents - START");

        var menu_container = _menuElement.find('.gf-megamenu');

        $(menu_container).each(function () {
            this.addEventListener("mouseleave", _onMenuLeave, false);

            //Required to by-pass Keen (KTMenu) default behaviours
            this.addEventListener("mouseout", _onMenuLeave, false);
        });

        $(menu_container).find('li.gf-megamenu-col').each(function () {
            this.addEventListener("mouseleave", _onMenuNavigate, false);
        });

        $(submenu_container).find('.gf-megamenu-submenu').each(function () {
            this.addEventListener("mouseenter", _onMenuHover, false);
            this.addEventListener("mouseleave", _onMenuHover, false);
        });

        _log("_attachEvents - END");

    };

    var _highlightMenu = function (item) {
        _log('highlightMenu - START');

        jQuery(item).addClass('menu-item-here');
        jQuery(item).siblings().removeClass('menu-item-here menu-item-hover');

        _log('highlightMenu - END');
    };

    var _addClassOnMenuColumns = function (currentNode) {

        if (!currentNode) {
            _menuElement.children('div').children('div').children('ul').children('li').addClass('gf-megamenu-col');
        } else {
            jQuery(currentNode).addClass('gf-megamenu-col');
        }
    }

    var _addSideBars = function () {

        // Build LeftSideBar
        var sideBarLeft = document.createElement("li");
        jQuery(sideBarLeft).attr('id', 'gf-megamenu-sidebar-left');
        jQuery(sideBarLeft).attr("class", "w-20px gf-megamenu-sidebar bg-secondary d-none");

        var sideIconContainer = document.createElement("span");
        jQuery(sideIconContainer).attr("style", "align-items:center;");
        jQuery(sideIconContainer).attr("class", "h-100 d-inline-flex");
        jQuery(sideIconContainer).html('<i class="menu-icon fas n-color fas fa-angle-double-left"></i>');

        sideBarLeft.appendChild(sideIconContainer);

        // Build RightSideBar
//        var sideBarRight = document.createElement("li");
//        jQuery(sideBarRight).attr('id', 'gf-megamenu-sidebar-left');
//        jQuery(sideBarRight).attr("class", "w-20px gf-megamenu-sidebar bg-secondary d-none");
//
//        var sideIconContainer = document.createElement("span");
//        jQuery(sideIconContainer).attr("style", "align-items:center;");
//        jQuery(sideIconContainer).attr("class", "h-100 d-inline-flex");
//        jQuery(sideIconContainer).html('<i class="menu-icon fas n-color fas fa-angle-double-right"></i>');
//
//        sideBarRight.appendChild(sideIconContainer);


        //Append sideBars to Menu
        jQuery('div.gf-megamenu').find('li:first').after(sideBarLeft);
//        jQuery('div.gf-megamenu').find('li:last').after(sideBarRight);
    }

    var _abortSubMenuCall = function () {

        _log('_abortSubMenuCall - START');

        if (_subMenusCall !== null) {
            _subMenusCall.abort();
            jQuery('.gf-megamenu-empty').remove();
        }

        _log('_abortSubMenuCall - END');
    };

    /**
     * Resets the node's cache entry to a state like its submenu was not loaded
     *
     * @param {GID} gid the node id of which to invalidate its submenu
     */
    const _invalidateSpaceSubmenu = function(gid) {
      _updateMemo(gid, (memo) => ({
        ...memo,
        html: null,
        children: [],
      }));
    }

    /**
     * remove nested submenu containers from DOM
     * @param {HTMLElement} subMenu submenu list container DOM element
     */
    const _tryRemoveNestedSubMenus = function(subMenu) {
      if(subMenu == null) return;
      $(subMenu).nextAll(":not(#gf-megamenu-sidebar-left)").remove();
    }

    /**
     * Checks if a given gid needs to be invalidated, and invalidates it if so.
     * Used to invalidate node which no longer have children.
     *
     * @param {GID} gid The node id to check
     */
    const _bubbleInvalidation = function (gid) {
      const item = $(`[data-gid="${gid}"]`);
      _hasSubMenu(item, {
        otherwise: (item) => {
          _invalidateEntry(gid);
        },
      });
    };

    /**
     * Gets the corresponding DOM element of the submenu containing the space entry
     *
     * @param {GID} gid Th node id of the space
     */
    const _getSpaceSubmenu = function(gid) {
      const subMenu = $(
        `#gf-spaces-menu .gf-megamenu-col:has([data-gid="${gid}"])`
      );
      if(!subMenu.exists()) return null;
      return subMenu;
    }

    /**
     * @typedef {Object} MMEntryInvalidationOptions MegaMenu invalidation options
     * @property {boolean} [updateDOM] whether to update the dom after
     *  invalidating entry. Default: `true`
     */

    /**
     * Invalidates a space from submenu cache, removing its and its parent's
     * memoized html (will be re-fetched if necessary). Additionally removes
     * related elements from the DOM if the `updateDOM` option is true (default).
     *
     * @param {GID} gid The node id of the space of which to invalidate its submenu entry
     * @param {MMEntryInvalidationOptions} [options] Invalidation options, see type
     *  {@linkcode MMEntryInvalidationOptions} for more information
     */
    const _invalidateEntry = async function(gid, options = {}) {
        const { updateDOM = true } = options;

        const invalidateAndRemoveNestedSubMenus = (gid) => {
          _invalidateSpaceSubmenu(gid);

          if (!updateDOM) return;

          const subMenu = _getSpaceSubmenu(gid);
          if (subMenu == null) return;
          _tryRemoveNestedSubMenus(subMenu);
        };

        // should update dom ? eagerly remove current group nested submenus
        invalidateAndRemoveNestedSubMenus(gid);

        let parentGID = _memo[gid]?.parent;

        parentGID ??= await $.ajax({
          method: "GET",
          url: `/gofast_og/${gid}/get_parents`,
          dataType: "json",
        }) || null;

        // no parent
        if (parentGID == null) return;

        // if should update dom, and group has parent, remove its submenus to update current space display
        invalidateAndRemoveNestedSubMenus(parentGID);
        _bubbleInvalidation(parentGID);
    }

    //Publics methods
    return{
        init: function (menuId, ajaxUrl, options) {
            _menuElement = jQuery(document).find('#' + menuId);
            if (!_menuElement) {
                return;
            }
            _ajaxUrl = ajaxUrl;

            // Initialize menu
            _init();

            _addSideBars();

            _addClassOnMenuColumns();

            _attachEvents(_menuElement);
        },
        getMenuElement: function () {
            return _menuElement;
        },
        getMenu: function () {
            return _menuObject;
        },
        enableDebug: function () {
            _debug = true;
            return _debug;
        },
        loadSubMenu: function(item){
            _loadSubMenu(item);
            return _loadSubMenu;
        },
        cleanSubMenus: function(item){
            _cleanSubMenus(item.parent().parent());
            return _cleanSubMenus;
        },
        disableDebug: function () {
            _debug = false;
            return _debug;
        },
        moveToLeft: function () {
            _moveToLeft();
        },
        addSideBars: function () {
            _addSideBars();
        },
        /**
         * Invalidates a space from submenu cache, removing its and its parent's
         * memoized html (will be re-fetched if necessary). Additionally removes
         * related elements from the DOM if the `updateDOM` option is true (default).
         *
         * @param {GID} gid The node id of the space of which to invalidate its submenu entry
         * @param {MMEntryInvalidationOptions} [options] Invalidation options, see type
         *  {@linkcode MMEntryInvalidationOptions} for more information
         */
        invalidateEntry: async function(gid, options) {
            return _invalidateEntry(gid, options)
        },
    };


})(jQuery);

jQuery(document).ready(function () {

    // console.log('GF MEGA MENU LIB LOADED');
    Gofast = Gofast || {};
    GFMegaMenu.init('gf-spaces-menu', '/gofast/menu/get');
    Gofast.spacesMenu = GFMegaMenu;

    /**
     * Event listener for custom events that should trigger menu invalidation.
     *
     * @param {CustomEvent<{nid:GID}>} event Custom event object, requires only
     *  the node id in an nid property inside the event details.
     */
    const invalidationListener = (event) => {
        Gofast.spacesMenu.invalidateEntry(event.detail.nid);
    }

    // invalidation event listeners
    window.addEventListener("gofast:node_rename", invalidationListener);
    window.addEventListener("gofast:node_delete", invalidationListener);
    window.addEventListener("gofast:node_create", invalidationListener);
    window.addEventListener("gofast:node_restored", invalidationListener)
});


