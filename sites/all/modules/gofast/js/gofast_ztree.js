(function ($, Gofast, Drupal) {
  // /!\ IMPORTANT : Put 2 click events outsite the behaviors to avoid the multiple calls
  // Button submit
  $(document).on('click', '.ztree-locations-submit', function () {
    var form = $(this).parents('.popover-content').find('form');
    var popup_id = $(this).parents('.popover-content').find('.ztree-component').attr('id').split('_').pop();

    // Replacing content by loader when saving
    var content_height = $(this).parents('.popover').height();
    var content_width = $(this).parents('.popover').width();
    var content = $(this).parents('.popover-content');
    var ztree_content = content.find('.ztree-widget');
    var loader_html = '<div class="editableform-loading"></div>';
    content.append(loader_html);
    var loader = $('.editableform-loading');
    loader.height(content_height);
    loader.width(content_width);
    loader.show();
    ztree_content.hide();

    $.post(form.attr('action'), form.serialize(), function (data) {
      loader.hide();
      if (data !== null) {
        var response = JSON.parse(data);
        if (response.status === 'error') {
          Gofast.toast(response.msg, 'error');
        }
        var link_popup = $('#popup_block_' + popup_id).children().first();
        link_popup.popover('hide');
        //If there is custom callback given as popup parameter, then call the callback, otherwise, update the link content
        var callback = 'default_ztree_location_callback';
        if (link_popup.data('jscallback')) {
          callback = link_popup.data('jscallback');
        }
        Drupal.behaviors.gofast_ztree.ztreeCallbacks[callback](data, link_popup);
      } else {
        $('#popup_ztree_' + popup_id).append('<p class="col-md-12 error">Error while saving the new locations</p>');
        //trigger the error
      }
      ztree_content.show();
    });
    return false;
  });

  // Button cancel for ztree popover
  $(document).on('click', '.ztree-locations-cancel', function () {
    var popup_id = $(this).parents('.popover-content').find('.ztree-component').attr('id').split('_').pop();
    $('#popup_block_' + popup_id).children().first().popover('hide');
  });
  // Button cancel for book popover
  $(document).on('click', '.book-cancel', function () {
    var popup_id = $(this).parents('.popover-content').find('.book-cancel').attr('id').split('_').pop();
    $('#popup_block_book_' + popup_id).children().first().popover('hide');
  });

  /**
   * Set of ztree component ids where async loading should be forced
   *
   * @see {@linkcode isZTreeComponentAsyncForced} to test if an id should have
   *  async forced independently of this constant's actual type.
   */
  const forcedAsyncZTreeComponents = new Set([
    "ztree_component_locations",
    "ztree_component_custom_space",
    "ztree_component_custom_space_member",
    "ztree_component_custom_space_chat",
    "ztree_component_custom_space_all",
  ]);

  /**
   * Tests if a given tree component should be forced to load data asynchronously.
   *
   * @param {string} ztree_component_id ZTree component ID
   * @returns Whether the tree component should load asynchronously.
   */
  function isZTreeComponentAsyncForced(ztree_component_id) {
    return forcedAsyncZTreeComponents.has(ztree_component_id);
  }

  /**
   * Gets the async url/path string to get tree nodes from.
   *
   * @param {string} ztree_component_id ID string of the ztree
   *  component type (?)
   * @returns A zTree compatible "URL" string.
   *
   *  NOTE: This might be, and currently is, only a path with query parameters.
   *  (So technically not a URL or URI)
   */
  function getAsyncUrlBase(ztree_component_id) {
    var url_async = "/ztree_location/async";
    //Keep locations where Article belongs selected in ztree during edition, verifiy if doesnt create a problem
    if (ztree_component_id == "ztree_component_content") {
        var node_id = window.location.pathname.split('/')[2];
        url_async = (isNaN(+node_id) || Gofast._settings.isEssential) ? url_async : url_async + "?node=" + node_id;
    }

    if (ztree_component_id == "ztree_component_content_templates"){
      url_async = "/ztree_location/async?template=true";
    }

    if (ztree_component_id === "ztree_component_custom_space" || ztree_component_id === "ztree_component_custom_space_member") {
      url_async = "/ztree_location_members/async?members=true";
    }

    if (ztree_component_id === "ztree_component_custom_space") {
      url_async += "&chkDisabled=1";
    }

    if (ztree_component_id === "ztree_component_custom_space_chat") {
      url_async = "/ztree_location_members/async?members=false&notmanaged=true";
    }

    if (ztree_component_id === "ztree_component_custom_space_all") {
      url_async = "/ztree_location_members/async?members=false&notmanaged=true";
    }

    if (ztree_component_id === "ztree_component_locations") {
      var param = [];
      if($('#gofast-cmis-node-publish-form').length > 0){
        param.push("publication=true");
      }

      if($('#gofast-dashboard-add-folder-form').length > 0 || $('#conference-node-form').length > 0){
        param.push("disable_space_check=true");
      }

      if($('#gofast-taxonomy-manage-folder-locations-form').length) {
        param.push("enable_mirror_check=true");
      }

      if ($('.gofast_is_internal_document_form').length > 0) {
        param.push("is_internal=true");
      }

      if ($('.gofast_is_confidential_document_form').length > 0) {
        param.push("is_confidential=true");
      }

      if (param && param.length > 0) {
        $.each(param, function (key, value) {
          if(key == 0){
            url_async = "/ztree_location/async?" + value;
          } else if (key > 0){
            url_async = url_async + '&' + value;
          }
        });
      }
    }

    return url_async;
  }

  /**
   * Maximum number of descendant nodes fetched per request
   *
   * Note that this is not a hard limit and due to the hierarchy of the returned
   * data of request, a few more than this many nodes may be received.
   */
  const maxItemsPerBatch = 400;

  /**
   * Parse a string in the format expected by zTree's async autoParam property.
   *
   * @param {string} paramString Parameter string, must be in the format
   * `${property_name}` or `${property_name}=${query_parameter}`
   */
  const parseAutoParam = (paramString) => {
    const [property, query] = paramString
      .split("=")
      .slice(0, 2)
      .map((s) => s.trim());

    if (query) {
      return {
        property,
        query,
      };
    }

    return {
      property,
      query: property,
    };
  };

  /**
   * Construct a payload object from a tree's async auto-parameters and the
   * relevant node.
   *
   * @param {{}} treeObj zTree instance.
   * @param {{}|null|undefined} treeNode Reference node to take parameter
   *  values from.
   * @returns A payload object constructed according to the autoParam setting.
   */
  const getTreeAutoParamPayload = (treeObj, treeNode) => {
    // Auto parameters not set or no node to take values from?
    if (treeNode == null || !treeObj.setting.async?.autoParam) {
      return null;
    }

    // Collect values from node as specified by auto parameter configuration.
    /** @type {Record<string, unknown>} */
    const payload = {};

    for (const autoParam of treeObj.setting.async.autoParam) {
      const parameter = parseAutoParam(autoParam);
      payload[parameter.query] = treeNode[parameter.property];
    }

    return payload;
  }

  /**
   * Construct a payload object from the tree's otherParam async setting.
   *
   * @param {{}} treeObj zTree instance to use the settings of.
   * @returns A payload object constructed according to the otherParam setting.
   */
  const getTreeOtherParamPayload = (treeObj) => {
    // Other parameters not set?
    if (!treeObj.setting.async?.otherParam) {
      return null;
    }

    const otherParam = treeObj.setting.async.otherParam;

    // Handle case where other parameters is an object mapping parameters to
    // their values.
    if (!Array.isArray(otherParam)) {
      return otherParam;
    }

    // Handle case where other parameters is an array alternating the keys and
    // values.
    /** @type {Record<string, unknown>} */
    const payload = {};

    for (let i = 0; i < otherParam.length; i += 2) {
      payload[otherParam[i]] = otherParam[i + 1];
    }

    return payload;
  }

  /**
   * Construct the payload needed for the descendants endpoint accounting for
   * zTree's settings and pagination.
   *
   * @param {{}} treeObj
   * @param {{}|null|undefined} treeNode zTree node object to get the
   *  children of, may be null or undefined for the root node.
   * @param {GFBatchAsyncPagination|null} pagination The current pagination
   *  object to use. Defaults to the pagination stored on the tree node.
   * @returns A payload object of parameter to value pairs.
   */
  const getNextBatchPayload = (treeObj, treeNode, pagination = treeNode?.gfPagination) => {
    /** @type {Record<string, unknown>} */
    const payload = {
      // Handle configured automatic parameters.
      ...getTreeAutoParamPayload(treeObj, treeNode),

      // Support otherParam setting.
      ...getTreeOtherParamPayload(treeObj),
    };

    // Update URL search parameters with pagination parameters:
    // Always try to limit number of fetched items.
    payload.max_items = maxItemsPerBatch;
    // Only add skip parameter if available.
    if (pagination?.lastSeen) {
      payload.skip_until_after_path = pagination.lastSeen;
    }

    return payload;
  };

  /**
   * Yields descendant batches.
   *
   * @param {{}} treeObj zTree instance.
   * @param {GFAsyncBatchNode} treeNode Parent node of which we will get the descendants.
   */
  const getDescendantBatches = async function* (treeObj, treeNode) {
    const zTreeSettings = treeObj.setting;
    const zTreeTools = $.fn.zTree._z.tools;
    const {
      async: {
        type: method,
        url: urlSetting,
        contentType,
        dataType,
        headers,
        xhrFields,
      },
      treeId,
    } = zTreeSettings;
    // Only compute url once if getter is provided.
    const url = zTreeTools.apply(urlSetting, [treeId, treeNode], urlSetting);

    const doRequest = (data) => $.ajax({
      method,
      url,
      contentType,
      cache: false,
      data: contentType.includes('application/json') ? JSON.stringify(data) : data,
      dataType,
      headers,
      xhrFields,
    });

    /** @type {GFBatchAsyncPagination|null} */
    let pagination = null;
    let request = doRequest(getNextBatchPayload(treeObj, treeNode, pagination));
    /** @type {GFBatchAsyncPagination} */
    do {
      const body = await request;

      /** @type {GFBatchAsyncResponse|GFAsyncBatchNode[]} */
      const responseRaw = JSON.parse(body);
      const response = !Array.isArray(responseRaw)
        ? responseRaw
        : {
            children: responseRaw,
            pagination: null,
          };
      pagination = response.pagination;

      // Eagerly start next request while we process current one.
      if (pagination?.hasMore) {
        request = doRequest(getNextBatchPayload(treeObj, treeNode, pagination));
      }

      yield response;
      // Continue while there is still more items to load.
    } while (pagination?.hasMore);
  };

  /**
   * @typedef {object} GFBatchAsyncPagination Pagination data object for batch requests
   * @property {boolean} hasMore True if more data to fetch exists, false
   *  otherwise. In case the corresponding request hit an endpoint that does not
   *  support pagination, this property is set to false.
   * @property {string} [lastSeen] Path to the last seen element included in the request.
   *  This may not be returned by the endpoint.
   * @property {number} [fetchCount] Number of already fetched entries, can be
   *  used to set skip count on subsequent requests. This mya not be returned by
   *  the endpoint.
   */
  /**
   * @typedef {object} GFAsyncBatchNode Object representing a tree node returned
   *  by a batch request. This can contain more of itself to model the
   *  folder/space hierarchy.
   * @property {GFAsyncBatchNode[]} children Child nodes array
   * @property {string} name Node file/folder name.
   * @property {string} id Node id.
   * @property {string} ename Node element (?) name, usually the full path.
   * @property {boolean} last_depth Whether this node is a leaf node (has no
   *  children) or not.
   * @property {string} icon Path to the icon resource.
   * @property {string} gid Group Id, either the Drupal node id for spaces/files,
   *  or the path for folders.
   * @property {boolean} is_template Whether the node is a template?
   * @property {boolean} is_mirror Whether the node is mirrored?
   * @property {boolean} non_member
   * @property {boolean} isHidden
   * @property {boolean} showLine
   */
  /**
   * @typedef {object} GFBatchAsyncResponseFirstChildProperties
   *  Extra properties that may appear on the first child of a batch response.
   * @property {Record<string, string> | null} [path_warnings]
   *  Object mapping a path to a warning message.
   */
  /**
   * @typedef {object} GFBatchAsyncResponse Object returned by batch request.
   * @property {[
   *  (GFAsyncBatchNode & GFBatchAsyncResponseFirstChildProperties)?,
   *  ...GFAsyncBatchNode[],
   * ]} children
   *  Batch of children, formatted as a hierarchy of nodes.
   * @property {GFBatchAsyncPagination|null} pagination Current pagination information object.
   *  Endpoint may not support pagination in which case it might be null.
   */

  /**
   * @typedef {object} GFAggregateParent Type representing the minimum shape
   *  expected within the ResponseBatchAggregator.
   * @property {Map<string, GFAggregateParent>} children Child nodes keyed by
   *  their element name (path).
   */

  /**
   * Maintains an aggregate hierarchy combining multiple batch request responses
   * into a single coherent object.
   *
   * For this, the children hierarchies are combined without adding duplicates
   * while preserving the order of the items ate their respective levels in the
   * responses. Additionally, the last pagination information object is kept.
   */
  class ResponseBatchAggregator {
    /**
     * aggregate object, storing a modified version of the response to allow
     * efficient modification/inspection.
     * @type {{
     *  pagination: GFBatchAsyncPagination,
     *  firstChildProperties: GFBatchAsyncResponseFirstChildProperties,
     * } & GFAggregateParent}
     */
    responseAggregate = {
      children: new Map(),
      pagination: null,
      firstChildProperties: {},
    };

    /**
     * Merges the given parent aggregate item's children with a new set of
     * children, making sure not to add duplicate entries.
     *
     * Recursively updates children as well.
     *
     * @param {GFAggregateParent} parent Parent object to update.
     * @param {GFAsyncBatchNode[]} children Array of children to merge.
     */
    static aggregateResponseChildren(parent, children) {
      for (const child of children) {
        let childAggregate = parent.children.get(child.ename);
        if (!childAggregate) {
          childAggregate = {
            ...child,
            children: new Map(),
          };
          parent.children.set(child.ename, childAggregate);
        }
        this.aggregateResponseChildren(childAggregate, child.children);
      }
    }

    /**
     * Process a given batch request response object adding its contents to the
     * internal aggregate hierarchy.
     *
     * @param {GFBatchAsyncResponse} response Batch request response object, its
     *  children will be recursively added to the internal hierarchy.
     */
    processBatch(response) {
      this.responseAggregate.pagination = response.pagination;

      if (response.children[0].path_warnings) {
        this.responseAggregate.firstChildProperties.path_warnings = {
          ...this.responseAggregate.firstChildProperties.path_warnings ?? {},
          ...response.children[0].path_warnings,
        };
        // Remove the warnings from the item here so restoration is simpler while
        // guaranteeing only the first item in the restored response has the warnings.
        response = structuredClone(response);
        delete response.children[0].path_warnings;
      }

      ResponseBatchAggregator.aggregateResponseChildren(this.responseAggregate, response.children);
    }

    /**
     * Transforms the internal hierarchy into a combined object which emulate a
     * single unlimited request's response.
     *
     * @returns {GFBatchAsyncResponse} The emulated response.
     */
    restoreFullResponse() {
      /** @param {GFAggregateParent} obj */
      const restoreResponseObject = (obj) => ({
        ...obj,
        ...(!obj.children
          ? {}
          : {
              children: Array.from(obj.children.values()).map(restoreResponseObject),
            }),
      });

      /** @type {GFBatchAsyncResponse} */
      const restoredResponse = restoreResponseObject(this.responseAggregate);

      // Add back first child properties
      restoredResponse.children[0] = {
        ...restoredResponse.children[0],
        ...this.responseAggregate.firstChildProperties,
      };

      return restoredResponse;
    }
  }

  /**
   * @callback GFAsyncBatchListener
   * @param {GFBatchAsyncResponse} batchResponse
   * @returns {void}
   */

  /**
   * Create a function to add node children during the loading of a node's descendants.
   *
   * The returned closure adds children to the tree, where the children
   * structure is already hierarchical, taking care not duplicate parent elements.
   *
   * @param {{}} treeObj Reference to the zTree object affected by the descendants loading request.
   * @returns Closure that allows efficiently adding children to the given tree without adding duplicates.
   */
  function createAddNodeChildren(treeObj) {
    /**
     * Cache map to quickly access zTree nodes and their known children set
     * given their paths. Used to deduplicate nodes without relying on the
     * zTree node object's data.
     * @type {Map<string,{node:GFAsyncBatchNode,knownChildren:Set<string>}>}
     */
    const nodeCache = new Map();

    return function addNodeChildren(parentNode, children, isSilent = false) {
      let cachedNode = nodeCache.get(parentNode?.ename);
      if (!cachedNode) {
        cachedNode = {
          node: parentNode,
          knownChildren: new Set(),
        };
        nodeCache.set(parentNode?.ename, cachedNode);
      }

      if (parentNode && children.length) {
        // Pretend the child node is loaded by async otherwise ztree
        // triggers async while calling addNodes. This could happen if the
        // last batch stopped on a possible parent element.
        parentNode.zAsync = true;
      }

      // We batch needed additions to the tree in a temporary array so that
      // ztree can limit the amount of work it does as much as possible.
      // Internally ztree uses concat on the parent node children array so it
      // is better to add the children all in one call than individually.
      const nodesToAdd = [];
      for (const child of children) {
        if (!cachedNode.knownChildren.has(child.ename)) {
          nodesToAdd.push(child);
          cachedNode.knownChildren.add(child.ename);
        } else {
          const childNode =
            nodeCache.get(child.ename)?.node ??
            treeObj.getNodeByParam("ename", child.ename, parentNode);
          addNodeChildren(childNode, child.children, isSilent);
        }
      }

      if (nodesToAdd.length) {
        treeObj.addNodes(parentNode, -1, nodesToAdd, isSilent);
      }
    }
  }

  /**
   * Factory function to create a function to load child nodes asynchronously in batches.
   * @param {object} settings Setting object
   * @param {string} settings.treeId ID of the zTree object/root DOM element.
   * @param {{}|null} [settings.treeObj] Reference to the actual zTree object.
   *  By default we get the instance from the id when null when calling this
   *  function or the returned closure.
   * @param {((treeNode:{}|undefined|null) => GFAsyncBatchListener|null|undefined)|null} [settings.getRequestBatchListener]
   *  Function that returns a function to be used as a listener called after
   *  each batch is received and internally processed.
   * @returns
   */
  const zTreeCreateDescendantsLoader = ({
    treeId,
    treeObj = null,
    getRequestBatchListener = null,
  }) => {

    /**
     * A closure that can load the child hierarchy of a given tree node.
     *  This closure will also try to dispatch the usual callbacks needed and
     *  configured on the zTree object.
     * @param {{}|undefined|null} treeNode zTree node to get the child hierarchy of.
     *  May be null or undefined when getting the hierarchy of the tree root node.
     */
    return async (treeNode) => {
      // Try to get ztree object in case it could not be obtained before.
      if (treeObj == null) {
        treeObj = $.fn.zTree.getZTreeObj(treeId);
      }

      const addNodeChildren = createAddNodeChildren(treeObj);

      if (treeNode) {
        // Pretend we are zTree starting the async loading process.
        treeNode.isAjaxing = true;
        // We also pretend the loading is actually done so ztree allows us to add
        // nodes to the tree.
        treeNode.zAsync = true;

        // Set zTree loading icon
        const zConsts = $.fn.zTree.consts;
        const selector = "#" + treeNode.tId + zConsts.id.ICON;
        const $nodeIcon = $(selector, treeObj.setting.treeObj);
        $nodeIcon.attr({
          style: "",
          class: zConsts.className.BUTTON + " " + zConsts.className.ICO_LOADING,
        });
      }

      /** Aggregator object used to recover a full response object for callbacks */
      const responseAggregator = new ResponseBatchAggregator();
      const onEachBatch = getRequestBatchListener?.(treeNode);

      try {
        // Load in batches.
        for await (const batchResponse of getDescendantBatches(treeObj, treeNode)) {
          if (treeNode) {
            // We store the pagination data returned by the server on the
            // relevant node.
            treeNode.gfPagination = batchResponse.pagination;
          }
          // Process node children through dataFilter function if present.
          const children =
            treeObj.setting.async?.dataFilter?.(treeId, treeNode, batchResponse) ??
            batchResponse.children;

          if (children) {
            addNodeChildren(treeNode, children, treeNode == null);
          }

          responseAggregator.processBatch(batchResponse);

          onEachBatch?.(batchResponse);
        }

        // Restore a coherent response object including all loaded elements to
        // respect the async success callback signature and invariants
        const fullResponse = responseAggregator.restoreFullResponse();

        // Call usual async success callback like batching never even existed.
        // We don't exactly match the full zTree API, only the parts we know we
        // use currently.
        treeObj.setting.callback?.onAsyncSuccess?.(
          null,
          treeId,
          treeNode,
          JSON.stringify(fullResponse),
        );
      } catch (error) {
        console.error("[GOFAST] Error while asynchronously loading tree widget", error);
        treeObj.setting.callback?.onAsyncError?.(null, treeId, treeNode, null);
      } finally {
        if (treeNode) {
          // Pretend we are zTree ending the async loading process.
          treeNode.isAjaxing = null;

          // Make sure node is up to date. (removes loader icon)
          treeObj.updateNode(treeNode);
        }
      }
    };
  };

  Drupal.behaviors.gofast_ztree = {
    ztreeCallbacks: {
      /**
       * This is the default callback for ztree location widget
       * @param {type} data
       */
      default_ztree_location_callback: function (data, caller_element) {
        // Replace the value in the container block
        var elements = $.parseJSON(data);
        var element_urls = [];
        var i = 0;
        for (i in elements) {
          element_urls[i] = elements[i].url;
        }
        var string_elements = element_urls.join('<br/>');
        var node_id = caller_element.parent().attr('id').split('popup_block_').pop();
        var context = caller_element.data('context');
        if (context === 'alfresco_item' || context === 'article') {
          caller_element.parent().find('.xeditable-values').html(elements);
          //this.update_field_css(caller_element);
        } else {
          caller_element.html(elements);
        }

        // This ajax request replace the current popup content with updated data
        // @TODO : the data_tree is not updated so the Ztree widget show incorrect data for un-/selected nodes
        /*$.post("/ztree_location/rendered/" + context + "/" + node_id, function (data) {
         caller_element.attr('data-content', data);
         });*/
      },
      /**
       * This function updates the user group list instead of updating the popup button content.
       * @param {type} data
       */
      callback_update_user_group_list: function (data, caller_element) {
        var groups = $.parseJSON(data);

        var groups_links = '';
        $.each(groups, function (item_key, item_value) {
          var title = item_value.title + ' (' + Drupal.t("Pending", {}, {'context': 'gofast'}) + ')';
          var path = '/node/' + item_value.nid;
          groups_links += '<a href="' + path + '">' + title + '</a>';
          if (item_key !== groups.length - 1) {
            groups_links += ' ';
          }
        });
        $('.profile-groups_requested').append(groups_links);
      }
    },
    attach: function (context) {

      // We deactivate submit button on ajax request
      $(document).ajaxSend(function (event, jqxhr, settings) {
        if (settings.url === "/gofast/update_templates_list") {
          $('#edit-actions button').attr("disabled", "disabled");
        }
      });

      // We deactivate submit button on ajax request
      $(document).ajaxComplete(function (event, jqxhr, settings) {
        if (settings.url === "/gofast/update_templates_list") {
          $('#edit-actions button').removeAttr("disabled");
        }
      });

      $('.ztree-browser:not(.ztree-browser-processed)').addClass('ztree-browser-processed').each(function () {
        var popover_id = $(this).parent().parent().parent().attr('id');
        $('#' + popover_id).addClass("popover-ztree");
        var ztree_component = $(this).find('.ztree-component');
        var ztree_component_id = ztree_component.attr('id');
        var zTreeObj;
        var already_refresh = false;

        // Force async configuration for given component id.
        if (isZTreeComponentAsyncForced(ztree_component_id)) {
          Drupal.settings[ztree_component_id].async = true;
        }

        const loadDescendants = zTreeCreateDescendantsLoader({
          treeId: ztree_component_id,
          treeObj: zTreeObj,
          getRequestBatchListener: (treeNode) => {
            // No listener needed when fetching root descendants.
            if (treeNode == null) {
              return;
            }

            // Only query this set of options once to reduce the number of costly DOM queries.
            /** @type {HTMLOptionElement[]} Array of existing option elements */
            const options = $(
              ".form-selected-locations option, #edit-field-emplacement option",
            ).toArray();

            /** Set of element names for which a DOM Option element exists. */
            const knownENames = new Set(options.map(o => o.innerText));

            // Keep select elements in a single jQuery collection with one DOM
            // selector query, so we don't multiply the queries for each
            // children of each level for elements that should not change themselves
            // during the whole process.
            /** jQuery collection of select elements to which the EName options  would be added */
            const $eNameSelects = $(".form-selected-locations, #edit-field-emplacement");

            /**
             * Adds children's ename option elements as needed.
             *
             * Children are iterated upon in depth-first order.
             * @param {GFAsyncBatchNode[]} children Array of children node to add options for.
             */
            const addMissingOptions = (children) => {
              for (const child of children) {
                if (knownENames.has(child.ename)) {
                  continue
                }

                // Add missing option.
                const $option = $("<option>", {
                  value: child.gid,
                  text: child.ename,
                });
                $eNameSelects.append($option);
                options.push($option[0]);
                knownENames.add(child.ename);

                // Recurse.
                addMissingOptions(child.children);
              }
            }

            return (response) => addMissingOptions(response.children);
          }
        });

        function beforeAsync(treeId, treeNode) {
          if($('#is-from-mirror').length == 1){
            // Remove ztree
            $(".form-item-field-emplacement label").hide();
            $(".ztree-widget").hide();
          }else{
            if ($('#ztree_component_locations').children().length === 0) {
              $(".form-item-field-emplacement").append("<div id='ztree_async_loading' class='loader-blog'></div>");
            }
          }

          // Manual loading of descendants using batches.
          loadDescendants(treeNode);
          return false;
        }

        function onAsyncError(event, treeId, treeNode, msg) {
          $("#ztree_async_loading").remove();
          fa_icon = "fa-times";
          color = '#d9534f';
          itemHTML = "<span class='fa " + fa_icon + "' style='color:" + color + "'></span>" + Drupal.t("An error occured", {}, {context: 'gofast'});
          $(".form-item-field-emplacement").append("<div id='ztree_async_loading'>" + itemHTML + "</div>");
          //$(".form-item-field-emplacement").append("<div id='ztree_async_loading'><i aria-hidden='true' class='icon glyphicon glyphicon-refresh glyphicon-spin'></i></div>");
        }

        function onAsyncSuccess(event, treeId, treeNode, msg) {
          $("#ztree_async_loading").remove();
          if (typeof treeNode === 'undefined') {
            //we check all selected location on the hiden select list, and check corresponding treenode if not the case
            $('.form-selected-locations option:selected, #edit-field-emplacement option:selected').each(function () {
              var node = zTreeObj.getNodeByParam("ename", $(this).text(), null);
              if (node != null) {
                zTreeObj.checkNode(node, true, true, true);
              }

              if (node === null) {
                var fake_node = {ename: $(this).text(), chkDisabled: false};
                html_insert_nodes(fake_node);
              }
            });
          }

          // This selects the options in form fields (where applicable)
          var selectedNodes = zTreeObj.getNodesByParam('checked', true);
          manage_selected_nodes(selectedNodes);

          $('div.popover-content').find('div.loader-ztree').remove();
          $('div.loader-ztree').remove();

          var in_popover = $('#' + treeId).parents('div.popover-content').length;
          if (in_popover === 1) {
            var win_height = $(window).height();
            var ztree_max_height = win_height - 500;
            var ztree_current_heigth = $('div.popover-content').find('.ztree-component').height();

            if (ztree_current_heigth > ztree_max_height) {
              $('div.popover-content').find('.ztree-component').css('height', ztree_max_height + 'px');
            }

            $('div.popover-content').find('.ui-selected-locations').css('position', 'absolute');
            $('div.popover-content').find('.ui-selected-locations').css('right', '40px');
            $('div.popover-content').find('.ztree-component').css('width', '100%');
            $('div.popover-content').find('.ztree-component').css('max-height', ztree_max_height + 'px');
            $('div.popover-content').find('.ui-selected-locations').css('max-height', ztree_max_height + 'px');
            $('div.popover-content').find('.ui-selected-locations').css('overflow-y', 'auto');
            $('div.popover-content').find('.ztree-component').css('overflow-y', 'auto');

          }

          //Gerer les emplacements ztree
          var in_modal = $('#' + treeId).parents('div.modal-body').length;
          if (in_modal === 1) {
            var win_height = $(window).height();
            var ztree_max_height = win_height - 500;
            var ztree_current_heigth = $('div.popover-content').find('.ztree-component').height();

            if (ztree_current_heigth > ztree_max_height) {
              $('div.popover-content').find('.ztree-component').css('height', ztree_max_height + 'px');
            }

            // $('div.modal-body').find('.ztree-component').css('max-height', ztree_max_height + 'px');
            // $('div.modal-body').find('.ztree-component').css('width', $('div.modal-body').width());
            // $('div.modal-body').find('.ztree-component').css('overflow-y', 'auto');
            // $('div.modal-body').find('.ztree-component').css('margin-bottom', '20px');

          }
          if( Gofast._settings.isEssential && $("#alfresco-item-node-form:visible").length){
            let pathParam = new URLSearchParams(window.location.search)
            if(pathParam.get("path") != undefined && Gofast.get("node") != undefined){
              $('#edit-field-emplacement-und').append($('<option>', {
                value: Gofast.get("node").id,
                text: Gofast.get("space").replace("/alfresco/webdav", "")
              }));
            }
          }

          //Update popup size.
          var in_modal = $('#' + treeId).parents('div#modalContent').length;
          if (in_modal === 1 && !$(".ztree-widget").hasClass("resize_processed")) {
            $(window).resize();
            $(".ztree-widget").addClass("resize_processed");
          }

          $('#modalContent .ui-resizable').css({ width: 'auto', height: 'auto' });
          $('#modalContent .ui-resizable .ztree-widget').css({ "min-height": '200px', "max-height": '500px' });

          // hide useless items on ztree
          var elements = $(".node_name:not([id^=file_browser_full_tree_element_])");
          if (elements !== undefined) {
            elements.each(function (elements, element) {
              var element = $(element);
              if (element.text() === "undefined" || element.text() === "" || element.text() === "FOLDERS TEMPLATES") {
                element.parent().parent().hide();
              }
              if (element.text() === "Sites"){
                  element.parent().hide();
                  //Hiding checkbox of Sites
                  element.parent().parent().children('span').css("display", "none");
              }
              if(("#alfresco-item-node-form") !== undefined || ('#article-node-form') !== undefined){
                  $('.roots_open').hide();
              }
              var in_modal = $('#' + treeId).parents('div#modalContent').length;
              if (in_modal === 1) {
                  $('.root_open').hide();
              }
            });
          }

          Drupal.attachBehaviors();
        }


        var onExpand = function (evt, treeId, treeNode) {

          var in_modal = $('#' + treeId).parents('div#modalContent').length;

          return true;
        };

        var onCollapse = function (evt, treeId, treeNode) {

          var in_modal = $('#' + treeId).parents('div#modalContent').length;
          return true;
        };

        // Prevent uncheck on radio that are already checked
        var beforeCheck = function (treeId, treeNode) {
          if (typeof Drupal.settings[ztree_component_id].ztree_options.allow_uncheck === 'undefined' && !Drupal.settings[ztree_component_id].ztree_options.allow_uncheck) {
            return !(zTreeObj.setting.check.chkStyle === "radio" && treeNode.checked);
          }
        };

        // Prevent unselect radio on click when already selected
        var beforeClick = function (treeId, treeNode, clickFlag) {
          if (typeof Drupal.settings[ztree_component_id].ztree_options.allow_uncheck === 'undefined' && !Drupal.settings[ztree_component_id].ztree_options.allow_uncheck) {
            return !(zTreeObj.setting.check.chkStyle === "radio" && treeNode.checked);
          }
        };

        var toggleNodeCheck = async function (event, treeId, treeNode) {
          zTreeObj.selectNode(treeNode, false);
          // Depending of the component name, the selection differs
          switch (ztree_component_id) {
            case 'ztree_component_space':
              var select = $('#edit-og-group-ref-und-0-default');
              select.find('option[value="' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              // Check if we are in space creation form
              const parentForm = $("#ztree_component_space").parents("form[id$=node-form]");

              select.change();
              if(!parentForm.length){
                break;
              }
              // Get metadata of selected space
              $.get("/api/node/metadata", {nid: treeNode.gid}).done((metadata) => {
                parentForm.find("#edit-space-metadata .form-control").each((index, element) => {
                  var isProcessed = false;
                  Object.entries(metadata).forEach(([name, value]) => {
                    if(isProcessed){
                      return;
                    }
                    // If the metadata exist in the form, fill inputs with parent metadata value
                    if($(element).is(`[name^=${name}]`)){
                      const metadataValue = value[0].value ?? value[0].tid;
                      if($(element).hasClass("gofastDatepicker")){
                        var datetime = new Date(metadataValue);
                        $(element).datepicker("setDate", datetime);
                      } else {
                        $(element).val(metadataValue).change();
                      }
                      isProcessed = true;
                    } else {
                      // If parent metadata value is empty, clear input value or set default value if defined
                      $(element).val($(element).data("default-value")).change();
                    }
                  })
                })
              })
              break;
            case 'ztree_component_user':
              var select = $('#edit-og-user-node-und-0-default');
              select.find('option[value="' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              select.change();
              break;
            case 'ztree_component_content':
              var check_action = treeNode.checked;
              var select = $('#edit-og-group-content-ref-und-0-default');
              var space_gid = getSpaceGid(treeNode);
              if (!check_action) {
                var checked_nodes = zTreeObj.getCheckedNodes();
                for (var i = 0; i < checked_nodes.length; i++) {
                  if (getSpaceGid(checked_nodes[i]) === space_gid) {
                    check_action = true;
                  }
                }
              }
              select.find('option[value="' + space_gid + '"]').prop("selected", check_action);
              select.change();
              break;
            case 'ztree_component_custom' :
              var select;
              if ($('#edit-target').length > 0) {
                select = $('#edit-target');
              }
              break;
            case 'ztree_component_custom_space_member' :
              var id = '';
              select = $('select.edit-spaces-members');

              if (treeNode.icon.search(/user.png/)) { //is user

                id = treeNode.getParentNode().getParentNode().gid + '_' + treeNode.gid;
                if (select.find('option[value="' + id + '"]').length == 0) {
                  if (treeNode.checked == true) {
                    select.append('<option value="' + id + '" selected="selected"></option>');
                  } else {
                    select.append('<option value="' + id + '"></option>');
                  }
                  select = $('select.edit-spaces-members'); //reload object
                } else {
                  select.find('option[value="' + id + '"]').prop('selected', treeNode.checked);
                }
                select.change();


              } else if (treeNode.icon.search(/users-members.png/)) { //is members sub-node
                var children = treeNode.children;
                children.forEach(function (child, key) {

                  id = treeNode.getParentNode().gid + '_' + child.gid;
                  child.checked = treeNode.checked;
                  if (select.find('option[value="' + id + '"]').length == 0) {
                    if (child.checked == true) {
                      select.append('<option value="' + id + '" selected="selected"></option>');
                    } else {
                      select.append('<option value="' + id + '" ></option>');
                    }
                    select = $('select.edit-spaces-members'); //reload object
                  } else {
                    select.find('option[value="' + id + '"]').prop('selected', treeNode.checked);
                  }
                  select.change();
                });
                zTreeObj.refresh();

              } else { //is space
                var children = treeNode.children;
                var gid = treeNode.gid;
                children.forEach(function (child, key) {
                  child.checked = treeNode.checked;
                  select.find('option[value="' + gid + '_' + child.gid + '"]').prop("selected", treeNode.checked);
                  select.change();
                });
                zTreeObj.refresh();
              }
              break;
            case 'ztree_component_custom_space' :
            case 'ztree_component_custom_space_chat' :
              select = $('select.edit-spaces');
              select.find('option[value="' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              select.change();
              break;
            case 'ztree_component_custom_space_all' :
              select = $('select.edit-all-spaces');
              select.find('option[value="' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              select.change();
              break;
            case 'ztree_component_locations' :
              var select = $('#edit-field-emplacement');
              select.find('option[value="' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              select.change();

              var mirror_check = !(zTreeObj.setting.check.disable_mirror_check == "true");
              var check_action = treeNode.checked;
              var select_space = $('#edit-og-group-content-ref');
              var space_gid = getSpaceGid(treeNode);

              if (check_action && mirror_check && $('#is-from-mirror').length == 0) {
                // check if it's a mirrored folder to update treeNode info
                await $.get("/gofast/cmis/is_path_mirrored?path=" + encodeURIComponent(treeNode.ename), function(is_mirrored) {
                  if (is_mirrored != "1") {
                    return true;
                  }
                  treeNode.is_mirror = true;
                  // change icon
                  const icon = treeNode.icon.split("/").slice(0, -1).join("/") + "/folders-primary.svg";
                  treeNode.icon = icon;
                  zTreeObj.updateNode(treeNode);
                  $("#" + treeNode.tId + "_ico").css("background", "url(" + icon + ") 0 0 no-repeat");
                });
                // checker le nombre cochés
                if (zTreeObj.getCheckedNodes().length == 1) {
                  handleMirroredDisplay(false);
                } else {
                  handleMirroredDisplay(true);
                }
              } else if(!zTreeObj.getCheckedNodes().length && mirror_check) {
                // if nothing is selected after an unchecking, we "reset" the ztree display
                handleMirroredDisplay(false);
              }

              if (!check_action) {
                var checked_nodes = zTreeObj.getCheckedNodes();
                  var mandatory_nodes = zTreeObj.getNodesByFilter(function (node) {
                  return node.chkDisabled && node.checked;
                });
                var all_checked_nodes = $.merge(checked_nodes, mandatory_nodes);
                for (var i = 0; i < all_checked_nodes.length; i++) {
                  if (getSpaceGid(all_checked_nodes[i]) === space_gid) {
                    check_action = true;
                  }
                }
              }
              select_space.find('option[value="' + space_gid + '"]').prop("selected", check_action);
              select_space.change();
              break;
            case 'ztree_component_content_templates':
              if (!treeNode.checked) {
                // Bypass ztree bug : When canceling the selected node but ztree is hidden, it doesn't change "radio_true_full" class into radio_false_full
                // cancelSelectedNode doesn't work properly
                $('#' + treeNode.tId + '_check').removeClass('radio_true_full').addClass('radio_false_full');
                zTreeObj.cancelSelectedNode(treeNode);
                $('[id^=edit-extension]').val('');
                $('[id^=edit-templates]').val('none');
              } else {
                $('[id^=edit-extension]').val(treeNode.name.split('.').pop());
                $('[id^=edit-title]').val(treeNode.name.split('.').shift());
                $('#' + $('[id^=edit-templates]').attr('id') + ' option:contains(' + treeNode.gid + ')').prop('selected', true);
                $('#' + $('[id^=edit-language]').attr('id') + ' option[value=' + $('[id^=edit-templates]').val().split('|:|')[4] + ']').prop('selected', true);
                $('#' + $('[id^=edit-language]').attr('id') + ' option[value=' + $('[id^=edit-templates]').val().split('|:|')[4] + ']').trigger('change');

                if ($('[id^=edit-reference]').val() !== '') {
                  $('[id^=edit-reference]').val('');
                  //$('#edit-title').val('');
                }

                if ($('[id^=edit-empty-template]').val() !== 'none') {
                  $('[id^=edit-empty-template]').val('none');
                  //$('#edit-title').val('');
                }

                //temporary fix
                if(window.location.hash == '#createFromTemplate'){
                    jQuery('#create_from_template').click();
                }
              }
              break;
            case 'ztree_component_content_templates_folders':
              var select = $("#edit-templates");
              select.find('option[value="/Sites' + treeNode.gid + '"]').prop("selected", treeNode.checked);
              select.change();
              var check_action = treeNode.checked;
              var space_gid = getSpaceGid(treeNode);
              if (!check_action) {
                var checked_nodes = zTreeObj.getCheckedNodes();
                var mandatory_nodes = zTreeObj.getNodesByFilter(function (node) {
                  return node.chkDisabled && node.checked;
                });
                var all_checked_nodes = $.merge(checked_nodes, mandatory_nodes);
                for (var i = 0; i < all_checked_nodes.length; i++) {
                  if (getSpaceGid(all_checked_nodes[i]) === space_gid) {
                    check_action = true;
                  }
                }
              }
              break;
            default:
              break;
          }
          html_update_list_locations(event, treeId, treeNode);
        };

        var handleMirroredDisplay = function(disable = true) {
          zTreeObj.getNodesByParam("is_mirror", true).forEach(mirrorNode => {
            // if we have multiple locations, we can't have any selected mirrored location
            if (disable) {
              disableTreeNode(mirrorNode, Drupal.t("Multifiling is not allowed inside mirrored folders", {}, {context: "gofast:gofast_ztree"}));
            } else {
            // a file can have a mirrored folder if it's its unique location
              undisableTreeNode(mirrorNode);
            }
          });
          if (disable && !zTreeObj.getCheckedNodes().length) {
            zTreeObj.getNodesByParam("is_mirror", true).forEach(mirrorNode => {
            undisableTreeNode(mirrorNode);
          });
            Gofast.toast(Drupal.t("If you select a mirrored folder, you can select only one location", {}, {context: "gofast_ztree"}), "warning");
          }
        }

        var undisableTreeNode = function(treeNode) {
          // enable treeNode
          zTreeObj.setChkDisabled(treeNode, false);
          // remove explanation
          $("#" + treeNode.tId + "_ico").closest("li").find(".badge").remove();
        }

        var disableTreeNode = function(treeNode, message) {
          // disable treeNode
          zTreeObj.checkNode(treeNode, false, false, true);
          zTreeObj.setChkDisabled(treeNode, true);
          // remove from html locations
          var linkid = treeNode.ename.replace(/&amp;/g, "&");
          $("[id='emplacement_tag" + get_clean_path(linkid) + "']").remove();
          // show explanation
          if (message && !$(".badge_" + treeNode.tId).length) {
            const alertButton = $('<span class="ml-2 text-white px-2 badge_' + treeNode.tId+ ' badge badge-danger">' + message + '</span>');
            const linkElement = $("#" + treeNode.tId + "_a");
            alertButton.insertAfter(linkElement);
          }
        }

        var selectClicked = function (event, treeId, treeNode) {
          zTreeObj.checkNode(treeNode, !treeNode.checked, false, true);
        };

        function get_drupal_path_from_webdav_path(path) {
          var result = path.replace(/\/Sites/g, '').replace(/\/_/g, '/');
          return result;
        }

        if (Drupal.settings[ztree_component_id].ztree_options.widget_locations) {

          /**
           * This function replaces "_" by "*8*" and then "/" by "_" and in paths (for ztree)
           * @param {type} path
           * @returns {unresolved}
           */
          function get_clean_path(path) {
            return path.replace(/\_/g, "*8\*").replace(/\//g, "_").replace(/\'/g, "*7\*");
          }
          ;

          /**
           * This function insert the selected values from tree browser to form.
           * @param linkid the actual link identifier
           */
          function html_insert_nodes(node) {
            var linkid = node.ename.replace(/&amp;/g, "&");
            var node_id = node.gid;
            var node_icone = node.icon;
            var node_tId = node.tId;

            if(node_icone && node_icone.indexOf("/sites/all/modules/") !== -1){
                //We got a path instead of a font awesome icon
                node_icone = "fa-" + node_icone.split("/").last().split(".").shift();
            }
            if ($(".ui-locations-check").length > 0) {
              var widget_locations = $(".ui-locations-check");
            } else {
              var widget_locations = ztree_component.siblings(".ui-selected-locations");
            }
            if (has_nomenclature_subgroups(linkid)) {
              linkid = linkid.replace(/_([^_]*)$/g, "*8*");
            }
            var id = linkid;
            id = id.replace(/\*8\*/g, "_").replace('/Sites/', "").replace('Espaces privés/', "");

            var already_exists = widget_locations.children('[id=\'emplacement_tag' + get_clean_path(linkid) + '\']');
            if (already_exists.size() === 0) {
              if ($("[id=\'" + unescape(encodeURI(get_clean_path(linkid))) + "\']").size() !== 0) {
                $("[id=\'" + unescape(encodeURI(get_clean_path(linkid))) + "\']").parent().parent().addClass("selected_tree");
              }
              // Prevent OG to be deletable
              var deletable = linkid.indexOf('Sites') == 0 ? true : false;
              var deletable = node.chkDisabled ? !node.chkDisabled : true;
              if (widget_locations.hasClass("ui-single-location")) {
                widget_locations.children().remove();
              }
              if ($(".ui-locations-check").length === 0) {
                var deletable_icon = deletable ? "<i class='fa fa-times text-light'></i>" : "";
                var ui_location = "<div class='gofast-selected-locations bg-info label-primary location span_temp_emplacement' id='emplacement_tag" + get_clean_path(linkid) + "' data-deletable=" + deletable + " data-tid=" + node_tId + " title=''>" + deletable_icon + "<span class='location_value'>" + unescape(id) + "</span></div>";
                widget_locations.append(ui_location);
              } else {
                if ($(".span_temp_emplacement").length === 0) {
                  $('.ui-locations-check i').hide();
                }

                if($('#is-from-mirror').length == 1){deletable = false;}
                if(deletable === false ){
                  var message = Drupal.t("You are not permitted to remove a location you do not have access to. ", {}, {'context': 'gofast'});
                  var ui_location_checkbox = "<div title='"+message+"' class='span_temp_emplacement' id='emplacement_tag" + get_clean_path(linkid) + "' data-deletable=" + deletable + " data-tid=" + node_tId + " title=''><input type='checkbox' checked disabled><span><i class='fa " + node_icone + "' style='margin-right:5px;'></i>" + unescape(id) + "</span></div>";
                }else{
                    var ui_location_checkbox = "<div class='span_temp_emplacement' id='emplacement_tag" + get_clean_path(linkid) + "' data-deletable=" + deletable + " data-tid=" + node_tId + " title=''><input type='checkbox' checked><span><i class='fa " + node_icone + "' style='margin-right:5px;'></i>" + unescape(id) + "</span></div>";
                }
                widget_locations.append(ui_location_checkbox);
              }

              $('#edit-locations span[value="' + node_id + '"]').parent().attr('data-deletable', deletable).attr('data-tid', node_tId);
              $(".span_temp_emplacement[id='emplacement_tag" + get_clean_path(linkid) + "']").bind("click", function () {
                html_remove_location($(this));
                if ($(".span_temp_emplacement").length === 0) {
                  $('.ui-locations-check i').show();
                }

              });
            }
          }
          ;

          /**
           * This method is called by HTML link on click, it triggers ztree node unselect and item removal.
           */
          function html_remove_location(link) {
            if ($(link).data('deletable') === true) {
              ztree_update_node(link);
              let link_tId = link.attr("data-tId");
              $("#" + link_tId + "_a").removeClass("curSelectedNode");
              $("#" + link_tId + " .ztree-fake-node").remove();
              link.remove();
            } else {
              if($('#is-from-mirror').length == 1){
                message = Drupal.t("This document is inside a mirror folder then you cannot remove it from this location.", {}, {'context': 'gofast'});
              }else{
                var message = Drupal.t("You are not allowed to delete this location because you cannot access to it.", {}, {'context': 'gofast'});
              }
              Gofast.toast(message, "warning", Drupal.t("Item not deletable", {}, {'context': 'gofast'}));
            }
          }
          ;

          ztree_component.parent().find('.ui-selected-locations .span_temp_emplacement').click(function () {
            html_remove_location($(this));
          });

          /**
           * This method is faster because it's getting parent node of candidates. This candidates represents filtered nodes to gather instead of looping on each elements of the tree.
           * This method returns the node regarding it's node path. It's doing a verification for parent's depths because the getNode function only accepts 2 level of depths.
           * @param the full node path to lookup
           * @returns the node if the path is verified and found, null otherwise
           */
          function browser_get_node_by_path_filtered(path) {
            var exploded_path = path.split("/");
            var depth = exploded_path.length;
            var folder_name = exploded_path[depth - 1];

            var candidates = zTreeObj.getNodesByParam("name", folder_name);
            if (candidates.length > 0) {
              if (candidates.length === 1) {
                return candidates[0];
              } else {
                var parent_path = path.substr(0, path.indexOf('/' + folder_name));
                var normalized_parent_path = parent_path.replace(/_/g, "*8*");
                normalized_parent_path = normalized_parent_path.replace(/'/g, "*7*");
                normalized_parent_path = normalized_parent_path.replace(/\//g, "_");
                var node = null;
                $.each(candidates, function (index, node_item) {
                  if (get_clean_path(node_item.getParentNode().ename) === normalized_parent_path) {
                    node = node_item;
                    return false;
                  }
                });
                return node;
              }
            } else {
              return null;
            }
          }
          ;

          /**
           * This method updates the ztree node when removing an HTML location
           * @param {type} location
           */
          function ztree_update_node(location) {
            var elementName = location.attr('id').split('emplacement_tag').pop().replace(/\_/g, "/").replace(/\*8\*/g, "_").replace(/\*7\*/g, "'");

            // if the node we lookup has parents, look into it's parent path.
            var node = browser_get_node_by_path_filtered(elementName);

            if (undefined !== node && null !== node) {
              const isLocationTree = ztree_component_id == "ztree_component_locations";
              zTreeObj.checkNode(node, false, false, isLocationTree); // re-trigger toggleCheckNode callback on locations tree only
              zTreeObj.updateNode(node);
            }

            var filtered_element;
            var select_space;
            if (ztree_component_id === 'ztree_component_locations') {
              select_space = $('#edit-og-group-content-ref');
            } else {
              select_space = $('#edit-og-group-content-ref-und-0-default');
            }

            var check_action = false;
            var space_gid = getSpaceGid(node);
            var checked_nodes = zTreeObj.getCheckedNodes();
            var mandatory_nodes = zTreeObj.getNodesByFilter(function (node) {
              return node.chkDisabled && node.checked;
            });
            var all_checked_nodes = $.merge(checked_nodes, mandatory_nodes);
            for (var i = 0; i < all_checked_nodes.length; i++) {
              if (getSpaceGid(all_checked_nodes[i]) === space_gid) {
                check_action = true;
              }
            }
            select_space.find('option[value="' + space_gid + '"]').prop("selected", check_action);
            select_space.change();
            // In the case we are dealing with ztree with form attached
            if (Drupal.settings[ztree_component_id].ztree_options.form) {
              if (ztree_component_id === 'ztree_component_locations') {
                filtered_element = $('#edit-field-emplacement option').filter(function () {
                  return $(this).text() === elementName;
                });
              } else {
                filtered_element = ztree_component.siblings('form').find('.form-selected-locations option').filter(function () {
                  return $(this).text() === elementName;
                });
              }
            } else {
              if (ztree_component_id === 'ztree_component_locations') {
                filtered_element = $('#edit-field-emplacement option').filter(function () {
                  return $(this).text() === elementName;
                });
              } else {
                filtered_element = $('#edit-field-emplacement-und option').filter(function () {
                  return $(this).text() === elementName;

                });
              }
            }
            filtered_element.prop("selected", false);
            filtered_element.parent('select').change();
          }
          ;
        }

        /**
         * This function returns the closest space gid (the first parent looking up)
         * @param {type} treeNode
         * @returns {treeNode.gid}
         */
        function getSpaceGid(treeNode) {
          if (treeNode == null) {
            return;
          }
          var gid = treeNode.gid;
          var parent = treeNode.getParentNode();
          while (!$.isNumeric(gid) && parent !== null) {
            gid = parent.gid;
            parent = parent.getParentNode();
          }
          return gid;
        }
        ;

        /**
         * This method update the HTML location selected by ztree, adding or removing element.
         * @param {type} event
         * @param {type} treeId
         * @param {type} treeNode
         */
        function html_update_list_locations(event, treeId, treeNode) {
          var checked = treeNode.checked;

          var elementName = treeNode.ename;
          var elementName = elementName.indexOf('Sites') === 0 ? '/' + elementName : elementName;
          var filtered_element;

          // If we are dealing with ztree attached to form
          if (Drupal.settings[ztree_component_id].ztree_options.form) {
            if ($('#edit-field-emplacement').length != 0) {
              filtered_element = $('#edit-field-emplacement option').filter(function () {
                return $(this).text() === elementName;
              });
            } else {
              filtered_element = $('#' + treeId).siblings('form').find('.form-selected-locations option').filter(function () {
                return $(this).text() === elementName;
              });
            }
          } else {
            if ($('#edit-field-emplacement-und').length != 0) {
              filtered_element = $('#edit-field-emplacement-und option').filter(function () {
                //return get_drupal_path_from_webdav_path($(this).text()) === elementName;
                return $(this).text() === elementName;
              });
            } else {
              filtered_element = $('#edit-field-emplacement option, #edit-field-emplacement option').filter(function () {
                //return get_drupal_path_from_webdav_path($(this).text()) === elementName;
                return $(this).text() === elementName;
              });
            }
          }

          if (filtered_element.length == 0 && treeId !== "ztree_component_content_templates" && treeId !== "ztree_component_content_templates_folders") {
            if (Drupal.settings[ztree_component_id].ztree_options.form) {
              $('.form-selected-locations, #edit-field-emplacement').append($('<option>', {
                value: treeNode.gid,
                text: treeNode.ename,
              }));
              if ($('#edit-field-emplacement').length != 0) {
                filtered_element = $('#edit-field-emplacement option').filter(function () {
                  return $(this).text() === elementName;
                });
              } else {
                filtered_element = $('#' + treeId).siblings('form').find('.form-selected-locations option').filter(function () {
                  return $(this).text() === elementName;
                });
              }
            } else {
              if ($('#edit-field-emplacement-und').length != 0) {
                $('#edit-field-emplacement-und').append($('<option>', {
                  value: treeNode.gid,
                  text: treeNode.ename,
                }));
                filtered_element = $('#edit-field-emplacement-und option').filter(function () {
                  return $(this).text() === elementName;
                });
              } else {
                $('#edit-field-emplacement').append($('<option>', {
                  value: treeNode.gid,
                  text: treeNode.ename,
                }));
                filtered_element = $('#edit-field-emplacement option').filter(function () {
                  return $(this).text() === elementName;
                });
              }
            }

          }
          filtered_element.prop("selected", checked);
          filtered_element.parent('select').change();

          // Widget location (if defined)
          if (Drupal.settings[ztree_component_id].ztree_options.widget_locations) {
            if (checked) {
              html_insert_nodes(treeNode);
            } else {
              if ($(".ui-locations-check").length > 0) {
                var location = $(".ui-locations-check").find('div[id="emplacement_tag' + get_clean_path(treeNode.ename) + '"]');
              } else {
                var location = $('#' + treeId).siblings(".ui-selected-locations").find('div[id="emplacement_tag' + get_clean_path(treeNode.ename) + '"]');
              }
              location.remove();
              if ($(".ui-locations-check").length > 0 && $(".span_temp_emplacement").length === 0) {
                $('.ui-locations-check i').show();
              }
            }
          }
        }
        ;

        function dblClickExpand(treeId, treeNode) {
          return treeNode.level > 0;
        }
        ;

        var callbacks = {
          onClick: selectClicked,
          onCheck: toggleNodeCheck,
          beforeClick: beforeClick,
          beforeCheck: beforeCheck,
          onAsyncSuccess: onAsyncSuccess,
          onExpand: onExpand,
          onCollapse: onCollapse,
          beforeAsync: beforeAsync,
          onAsyncError: onAsyncError
        };

        /**
         * This function is called to initialize the tree browser when the popup is shown.
         */
        function browser_tree_init(loaded_async) {
          if(ztree_component_id === "ztree_component_content_templates" && !loaded_async){
              //These values are loaded async. Load the values and init the tree again
              jQuery.get(location.origin + "/ztree/values_async/" + ztree_component_id, function(values){
                  values = JSON.parse(values)
                  var select = values.select;
                  var tree = values.tree;

                  select = $(select).find("select");
                  $("select#edit-templates").replaceWith(select);
                  $('#ztree_component_content_templates .spinner').remove();
                  if(typeof tree.content !== "undefined"){
                    Drupal.settings.ztree_component_content_templates.data_tree = tree.content["#attached"].js[1].data.ztree_component_content_templates.data_tree;
                  }

                  browser_tree_init(true);
              });
              return;
          }

          //show loading icon while ztree not completly loaded
          if (!$('.popover-title:contains("book")').length) {
            $('div.popover-content').prepend('<div class="loader-ztree"></div>');
          }
          if (Drupal.settings[ztree_component_id]) {
            var ztree_options = eval(Drupal.settings[ztree_component_id].ztree_options);
            var data_tree = $.parseJSON(Drupal.settings[ztree_component_id].data_tree);
            Gofast.setCookie("data_tree", JSON.stringify(data_tree), 3600 * 24);
          } else {
            var data_tree = JSON.parse(Gofast.getCookie("data_tree"));
          }

          function setFontCss(treeId, treeNode) {
            return treeNode.non_member ? {color: "red"} : {};
          }
          ;

          function addWebfontIcon(treeId, treeNode) {
            var aObj = $("#" + treeNode.tId + "_ico");
            //retreive taxo icone
            style = aObj.css('background-image');
            var cleanup = /\"|\'|\)/g;
            icon = style.split('/').pop().replace('%20', ' ').replace(cleanup, '');

            if ($("#webfont_icon_" + treeNode.tId).length > 0)
              return;
            var editStr = " <span id='webfont_icon_" + treeNode.tId + "' class='fa " + icon + "'> </span>";
            aObj.prepend(editStr);
            aObj.css('background', 'transparent');
          }

          if (Drupal.settings[ztree_component_id].async == false) {
            var setting = {
              check: {
                enable: true,
                chkboxType: {"Y": "", "N": ""}
              },
              data: {
                keep: {
                  parent: true
                }
              },
              view: {
                txtSelectedEnable: false,
                dblClickExpand: dblClickExpand,
                fontCss: setFontCss,
              //  addDiyDom: addWebfontIcon
              },
              callback: callbacks
            };

            // If ztree options has been set and is not empty
            if (ztree_options !== undefined && Object.keys(ztree_options).length > 0) {
              setting.check = Gofast.apply(setting.check, ztree_options);
            }

            if (typeof zTreeObj === 'undefined') {
              zTreeObj = $.fn.zTree.init(ztree_component, setting, data_tree.children);
            }

          } else {

            const asyncUrlBase = getAsyncUrlBase(ztree_component_id);

            var setting = {
              check: {
                enable: true,
                chkboxType: {"Y": "", "N": ""}
              },
              async: {
                enable: true,
                url: asyncUrlBase,
                autoParam: ["ename"],
                dataFilter: filter_async
              },
              view: {
                txtSelectedEnable: false,
                dblClickExpand: dblClickExpand,
                fontCss: setFontCss,
              //  addDiyDom: addWebfontIcon
              },
              callback: callbacks
            };

            if (typeof ztree_options.form !== 'undefined') {
              setting.async.otherParam = {"node": ztree_options.form.id};
            }

            if (ztree_component_id == "ztree_component_content") {
              $('#edit-og-group-content-ref>div.panel-body').append('<div id="ztree_async_loading" class="loader-ztree"></div>');
              var browser_location = window.location.href;
              var browser_path = Gofast.getAllUrlParams(browser_location).path;
              if (typeof browser_path != 'undefined') {
                setting.async.otherParam = {"browser_path": decodeURIComponent(browser_path)};
              }
            }

            if (ztree_component_id == "ztree_component_locations") {

              // Get nid from publish form
              if($("#gofast-cmis-node-publish-form").length != 0){
                var nid = $("#gofast-cmis-node-publish-form").find('div > input[name="nid"]').val();
              }

              // Get nid from manage location form
              if($("#gofast-taxonomy-manage-locations-form").length != 0){
                var nid = $("#gofast-taxonomy-manage-locations-form").find('div input[name="selected_locations_ids"]').val();
                var nid = JSON.parse(nid)[0];
              }

              // Get nid from node
              if ($("#conference-node-form").length != 0) {
                var nid = $("#conference-node-form").find('div input[name="selected_node"]').val();
              }

              if($("#gofast-taxonomy-manage-folder-locations-form").length != 0){
                var folder_reference = $("#gofast-taxonomy-manage-folder-locations-form #edit-selected-folder").val();
              }

              // param $_REQUEST["node"] passed in gofast_ztree_async_json
              if(folder_reference != null){
                setting.async.otherParam = {"node": nid, "folder_reference" : folder_reference};
              }else{
                setting.async.otherParam = {"node": nid};
              }
            }

            function filter_async(treeId, parentNode, response) {

              // Handle response's paginated results
              let childNodes = response.children;

              if (!childNodes)
                return null;
              for (var i = 0, l = childNodes.length; i < l; i++) {
                if (childNodes[i].name) {
                  childNodes[i].name = childNodes[i].name.replace(/\.n/g, '.');
                }
              }
              return childNodes;
            }


            // If ztree options has been set and is not empty
            if (ztree_options !== undefined && Object.keys(ztree_options).length > 0) {
              setting.check = Gofast.apply(setting.check, ztree_options);
            }

            if (typeof zTreeObj === 'undefined') {
              zTreeObj = $.fn.zTree.init(ztree_component, setting);
            }

          }


          var filtered_element;

          // Checking nodes previously selected
          switch (ztree_component_id) {
            case 'ztree_component_space':
              var elements_selected = $('#edit-og-group-ref-und-0-default').val();
              var ztree_node = zTreeObj.getNodesByParam("gid", elements_selected);
              zTreeObj.checkNode(ztree_node[0], true, false);
              break;
            case 'ztree_component_user':
              var elements_selected = $('#edit-og-user-node-und-0-default').val();
              for (var key in elements_selected) {
                var nodes = zTreeObj.getNodesByParam("gid", elements_selected[key]);
                if (nodes.length > 0) {
                  ztree_node = nodes[0];
                  zTreeObj.checkNode(ztree_node, true, false);
                }
              }
              break;
          }

          if (ztree_component_id === 'ztree_component_locations') {
            // This list contains the non_member paths
            zTreeObj.filtered_paths = zTreeObj.getNodesByFilter(function (node) {
              return node.non_member === true;
            });

            // This function allow to filter on members/non_members paths
            zTreeObj.filter_spaces = function (zTreeObj) {
              var filter_state = $('#edit-trigger-mode').is(':checked');
              if (filter_state) {
                zTreeObj.showNodes(zTreeObj.filtered_paths);
              } else {
                zTreeObj.hideNodes(zTreeObj.filtered_paths);
              }
            };

            // Initialize filter with non_members hidden
            zTreeObj.filter_spaces(zTreeObj);

            // Trigger the filter on checkbox (publish form)
            $(document).on('change', '#edit-trigger-mode', function (e) {
              //zTreeObj.filter_spaces(zTreeObj);
              $("#container_broadcast_og_publication").toggle();
            });
          } else if (ztree_component_id === 'ztree_component_content_templates' || ztree_component_id === 'ztree_component_content_templates_folders') {
            // Remove "None" leaf
            zTreeObj.removeNode(zTreeObj.getNodeByParam('gid', 'None'));
          }

          // Expanding selected nodes by default (expanding parent and unexpand selected node)
          var checked_nodes = zTreeObj.getNodesByParam('checked', true);
          checked_nodes.forEach(function (node) {
            zTreeObj.expandNode(node, true, false, false);
            var parentNode = node.getParentNode();
            while (parentNode !== null) {
              zTreeObj.expandNode(parentNode, true, false, false);
              parentNode = parentNode.getParentNode();
            }
          });

          $(document).on('change', '#edit-empty-template', function (e) {
            if (ztree_component_id === 'ztree_component_content_templates' || ztree_component_id === 'ztree_component_content_templates_folders') {
              var selectedNode = zTreeObj.getSelectedNodes()[0];
              if (selectedNode) {
                // Bypass ztree bug : When canceling the selected node but ztree is hidden, it doesn't change "radio_true_full" class into radio_false_full
                // cancelSelectedNode doesn't work properly
                selectedNode.checked = false;
                $('#' + selectedNode.tId + '_check').removeClass('radio_true_full').addClass('radio_false_full');

                zTreeObj.cancelSelectedNode(selectedNode);
                $('select' + $('[id^=edit-templates]')).val('none');
              }
            }

            if ($('#edit-reference').val() !== '') {
              $('#edit-reference').val('');
              //$('#edit-title').val('');
            }

            if ($(this).val() === 'none') {
              $('#edit-extension').val('');
            } else {
              $('#edit-extension').val($(this).val().split('|:|').pop());
            }
          });

          // A title typed by the user wins over the chosen file's name, an emptied one does not
          $(document).on('input', '[id^=edit-title]', function () {
            $(this).data('typed', this.value !== '');
          });

          $(document).on('change', '[id^=edit-reference]', function (e) {
            e.preventDefault();
            if (this.files.length > 0) {
              if (ztree_component_id === 'ztree_component_content_templates' || ztree_component_id === 'ztree_component_content_templates_folders') {
                var selectedNode = zTreeObj.getSelectedNodes()[0];
                if (selectedNode) {
                  // Bypass ztree bug : When canceling the selected node but ztree is hidden, it doesn't change "radio_true_full" class into radio_false_full
                  // cancelSelectedNode doesn't work properly
                  selectedNode.checked = false;
                  $('#' + selectedNode.tId + '_check').removeClass('radio_true_full').addClass('radio_false_full');

                  zTreeObj.cancelSelectedNode(selectedNode);
                  $('select' + $('[id^=edit-templates]')).val('none');
                }
              }
              if ($('#edit-empty-template').val() !== 'none') {
                $('#edit-empty-template').val('none');
              }
              var filename_parts = this.files[0].name.split('.');
              var extension = filename_parts.length > 1 ? filename_parts.pop() : '';
              var filename = this.files[0].name.replace("." + extension, "");
              if (!$('[id^=edit-title]').data('typed')) {
                $('[id^=edit-title]').val(filename);
              }
              $('[id^=edit-extension]').val(extension);
            } else {
              //$('#edit-title').val('');
              $('[id^=edit-extension]').val('');
            }
          });


          // This selects the options in form fields (where applicable)
          var selectedNodes = zTreeObj.getNodesByParam('checked', true);
          manage_selected_nodes(selectedNodes);


          if(ztree_component_id === "ztree_component_content_templates" && loaded_async){
            //Get URL params
            var vars = {};
            var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
                vars[key] = value;
            });

            //Get template param
            var template = Number.parseInt(vars['template']);

            if(Number.isInteger(template)){
                var template_option = $("select#edit-templates").find("option").filter(function(key, option){
                    var parts = $(option).attr("value").split("|:|");
                    if(parts[5] == template){
                        $(option).prop("selected", true);
                        return true;
                    }
                });

                var option_path = $(template_option[0]).attr("value").split("|:|")[2];
                option_path = option_path.substr(6).replace(/\/_/g, "/");

                var element = zTreeObj.getNodeByParam("ename", option_path);

                if(element !== null){
                    zTreeObj.checkNode(element, true, true, toggleNodeCheck);
                }
            }
          }
        }
        ;

        function has_nomenclature_subgroups(title) {
          var last_character = title.charAt(0);
          if (last_character === "_") {
            return true;
          } else {
            return false;
          }
        }


        function manage_selected_nodes(selectedNodes) {
          for (var i = 0; i < selectedNodes.length; i++) {
            // Processing field_group_content_membership
            var filtered_group = $('#edit-og-group-content-ref-und-0-default option').filter(function () {
              return $(this).val() === selectedNodes[i].gid.toString();
            });
            filtered_group.prop('selected', true);

            if (ztree_component_id === 'ztree_component_content') {
              // If we show ztree for documents
              filtered_element = $('#edit-field-emplacement-und option').filter(function () {
                //return get_drupal_path_from_webdav_path($(this).text()) === selectedNodes[i].ename;
                return $(this).text() === selectedNodes[i].ename;
              });

              filtered_element.prop('selected', true);
              filtered_element.parent('select').change();
            } else if (ztree_component_id === 'ztree_component_locations') {
              // If we show ztree for publication
              filtered_element = $('#edit-field-emplacement option').filter(function () {
                return get_drupal_path_from_webdav_path($(this).text()) === selectedNodes[i].ename;
              });
              filtered_element.prop('selected', true);
              filtered_element.parent('select').change();
              var filtered_group = $('#edit-og-group-content-ref option').filter(function () {
                return $(this).val() === getSpaceGid(selectedNodes[i]).toString();
              });
              filtered_group.prop('selected', true);
            }

            // If widget_location is defined
            if (Drupal.settings[ztree_component_id].ztree_options.widget_locations) {
              html_insert_nodes(selectedNodes[i]);
            }
          }
        }
        ;

        browser_tree_init();

      });
      Drupal.behaviors.hide_ztree_elements = {
        attach: function (context, settings) {
          var elements = $(".node_name:not([id^=file_browser_full_tree_element_])");
          if (elements !== undefined) {
            elements.each(function (elements, element) {
              var element = $(element);
              if (element.text() === "undefined" || element.text() === "") {
                element.parent().parent().hide();
              }
              if (element.text() === "Sites"){
                  element.parent().hide();
                  //Hiding checkbox of Sites
                  element.parent().parent().children('span').css("display", "none");
              }
              if (element.text() === "FOLDERS TEMPLATES" && element.parents("form").length && element.parents("form").attr('id') !== 'gofast-ajax-file-browser-add-template-folder-form' && element.parents(".ztree").attr('id') !== "ztree_component_content_templates_folders"){
                  element.parent().parent().hide();
              }
            });
          }
        }
      };
    }
  };

})(jQuery, Gofast, Drupal);
