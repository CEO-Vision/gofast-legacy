(($, Gofast) => {
  // import
  const placerLib = Gofast.placerLib;
  const { PlacerElement, Placer, hideBootstrapFlex, showBootstrapFlex } = placerLib;
  /**
   * Construct a new object from a reference object omitting a given key.
   *
   * The resulting object is a shallow copy without the provided key.
   * @template {object} T Input object shape
   * @template {keyof T} K Type of key omitted
   * @param {T} obj Initial object
   * @param {K} key Key to omit
   * @returns {Omit<T,K>} Shallow copy of {@linkcode obj} without the given
   *  {@linkcode key}
   */
  const omit = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k, _v]) => k !== key));

  /**
   * Add a visual spinner to an element.
   *
   * The spinner centers itself within the nearest position:relative element to the
   * root.
   * @param {object} [options] Spinner creation options
   * @param {HTMLElement|string} [options.root] Element to attach the spinner to.
   * @param {
   *   "primary"
   * | "secondary"
   * | "success"
   * | "danger"
   * | "warning"
   * | "info"
   * | "light"
   * | "dark"
   * } [options.type] The type of spinner, determines the color.
   * one of:
   * - primary (default)
   * - secondary
   * - success
   * - danger
   * - warning
   * - info
   * - light
   * - dark
   * @param {string|number} [options.diameter] CSS value to apply to the size of
   *  the spinner. Warning: this ultimately is applied to both width and height
   *  of an element, do not use units which might change length depending on the
   *  axis (e.g.: percentages).
   * @param {string|number} [options.thickness] The thickness of the spinner
   *  visuals.
   * @param {boolean} [options.backdrop] Whether to add a backdrop element or not.
   * @returns {JQuery} A spinner DOM element wrapped in a jQuery collection.
   */
  const addSpinner = ({
    root = document.body,
    type = "primary",
    diameter = null,
    thickness = null,
    backdrop = false,
  } = {}) => {
    const spinnerWrapper = $(
      '<div class="position-absolute d-flex align-items-center justify-content-center flex-column spinner-wrapper" style="inset:0;z-index:1000">' +
        '<div class="spinner-border text-' +
        type +
        '"></div>' +
        "</div>",
    );
    const spinner = spinnerWrapper.find(".spinner-border");
    if (diameter != null) {
      spinner.css({ width: diameter, height: diameter });
    }
    if (thickness != null) {
      spinner.css({ borderWidth: thickness });
    }
    if (backdrop) {
      const backdropEl = $("<div></div>");
      backdropEl.css({
        position: "absolute",
        inset: 0,
        opacity: 0.8,
        backgroundColor: "#3F4254",
      });
      spinnerWrapper.prepend(backdropEl);
    }
    $(root).append(spinnerWrapper);
    return spinnerWrapper;
  };

  /**
   * Removes spinners.
   * @param {object} [options] Removal options
   * @param {HTMLElement|string} [options.root] Root element from which to remove
   *  spinners.
   */
  const removeSpinner = ({ root = document.body } = {}) => {
    $(root).find("> .spinner-wrapper").remove();
  };

  /**
   * Signature element implementation
   */
  class PlacerSignatureElement extends PlacerElement {
    /** @type {number} Width of signature */
    width;
    /** @type {number} Height of signature */
    height;
    /** @type {string} Id of signer user, may not be UID due to external users */
    signerId;

    /** @type {JQuery|null} Dimensions label element */
    #$dimensionsLabel = null;
    /** @type {JQuery|null} Name label element */
    #$label = null;
    /** @type {JQuery|null} Root element this element is attached to */
    #root = null;
    constructor({ width, height, signerId }) {
      super();
      this.width = width;
      this.height = height;
      this.signerId = signerId;
    }

    /** @override */
    getBoundingRect() {
      return {
        width: this.width,
        height: this.height,
        x: 0,
        y: 0,
      };
    }

    /** Updates the element's dimension display label */
    #updateDimensionsLabel() {
      if (!this.#$dimensionsLabel) {
        return;
      }

      const labelContent = this.width.toFixed(1) + " x " + this.height.toFixed(1);
      this.#$dimensionsLabel.text(labelContent);
    }

    /** Updates the element displayed central label */
    #updateLabel() {
      const name = state.signers[this.signerId]?.fullName ?? "?";
      this.#$label?.text(name);
    }

    /** @override */
    detach() {
      super.detach();
      this.#root = null;
    }

    /**
     * @override
     */
    attach(root, options = {}) {
      const { width, height } = this;
      const { scale = 1 } = options;
      this.#root = root;
      const $contents = $(
        '<div class="flex-fill d-flex flex-column signature-box">' +
          '<div class="d-flex position-absolute element-toolbar">' +
          '<button class="btn btn-danger btn-sm btn-icon delete-button"><i class="fas fa-trash"></i></button>' +
          "</div>" +
          '<div class="flex-fill d-flex justify-content-center align-items-center">' +
          '<span class="label-display"></span>' +
          "</div>" +
          '<small class="signature-dimensions position-absolute mb-1 ml-2 text-secondary" style="bottom:0;left:0"></small>' +
          "</div>",
      );
      this.#$dimensionsLabel = $contents.find(".signature-dimensions");
      this.#$label = $contents.find(".label-display");
      this.#updateDimensionsLabel();
      this.#updateLabel();
      const $deleteButton = $contents.find(".delete-button");
      $deleteButton.on("click", () => {
        root.trigger("placer_element:delete");
      });

      // Register event listener on global custom event that users updated.
      this._addEventListener(window, "signature_placer:user_update", this.onUsersUpdate.bind(this));

      root.append($contents);
      root.width(width * scale).height(height * scale);
    }

    /**
     * Common behavior when updating element size.
     *
     * Unspecified/nullish dimension values are not updated.
     * @param {object} [dimensions={}] New dimensions object
     * @param {number} [dimensions.width] New width
     * @param {number} [dimensions.height] New height
     */
    #updateSize({ width, height } = {}) {
      this.width = width ?? this.width;
      this.height = height ?? this.height;
      this.#updateDimensionsLabel();
    }

    onUsersUpdate() {
      this.#updateLabel();
    }

    /** @override */
    onRootResize(event) {
      this.#updateSize({
        width: event.originalEvent.width,
        height: event.originalEvent.height,
      });
    }

    /** @override */
    onRootResizeStop(event) {
      this.#updateSize({
        width: event.originalEvent.width,
        height: event.originalEvent.height,
      });
      // trigger event on root to notify of the element update.
      this.#root.trigger({ type: "placer_element:update", state: this });
    }

    /** @override */
    asPropertiesObject() {
      return {
        width: this.width,
        height: this.height,
        signerId: this.signerId,
      };
    }
  }

  /**
   * @typedef {number|bigint|`${number}`} Numeric Type for numeric values.
   */

  /**
   * Checks if a value is a numeric value.
   *
   * A value is a numeric value if it is a number, a bigint or a string
   * representing a number.
   * @param {unknown} value Value to test as numeric.
   * @returns {value is Numeric} true if value is numeric,
   *  false otherwise.
   */
  function isNumeric(value) {
    return (
      typeof value === "number" ||
      typeof value === "bigint" ||
      (typeof value === "string" && !Number.isNaN(Number(value)))
    );
  }

  /**
   * Load a PDF preview file link given a node ID.
   * @param {bigint} nodeId Node to get the preview of as a PDF file.
   * @returns {Promise<[null,string]|["no_preview"|"generic",null]>} PDF preview Document url.
   */
  async function getDocumentPdfPreviewUrl(nodeId) {
    // Generate/get PDF preview url from onlyoffice.
    const documentPreviewResult = await $.get({
      url: location.origin + "/gofast/ajax/generate_onlyoffice_preview/" + String(nodeId),
    }).then((json) => JSON.parse(json));

    // Handle generation error
    if (documentPreviewResult.Error != null) {
      // When a file cannot be previewed through this endpoint (e.g.: images)
      if (documentPreviewResult.Error === "-7") {
        return ["no_preview", null];
      }
      console.warn(
        "preview generation had unhandled error with code:",
        documentPreviewResult.Error,
      );
      return ["generic", null];
    }

    return [null, documentPreviewResult.FileUrl];
  }

  /**
   * @typedef {object} PlacerSigner Signer object referenced in embedded placer widget
   * @property {string} id Identifies the user.
   * @property {string} fullName Full name of the user, for display
   */

  /**
   * Represents a single state for the embedded widget to track elements,
   * documents, and more.
   */
  let state = {
    /** Currently selected node to display and interact with */
    currentNodeId: null,
    /** Whether we are currently loading a document or not */
    updatingDocumentNode: false,
    /** The document expected to be loaded. */
    pendingDocumentToLoad: null,
    /** Object mapping documents to their collection of placer elements */
    placedElements: {},
    /** @type {Record<string,PlacerSigner|undefined>} Object mapping signers' unique IDs to their info */
    signers: {},
  };

  /** @type {Placer} Placer widget instance */
  let placer;

  /**
   * Root element of the placer instance wrapped in a JQuery collection.
   * @type {JQuery}
   */
  let $documentWrapper;

  /**
   * Reference to element to display a message when a document has no preview,
   * wrapped in a JQuery collection
   * @type {JQuery}
   */
  let $noPreviewElement;

  /**
   * Update which document is being rendered by the widget.
   *
   * @param {number|string|null} nid Document node id.
   *
   * @see {@linkcode queueDocumentNodeUpdate} for a version that adds safety guaranties when
   *  trying to change the document while another is rendering.
   */
  async function updateDocumentNode(nid) {
    // No id change, stop handling.
    if (nid === state.currentNodeId) {
      return;
    }
    // update state's selected node id.
    addSpinner({
      backdrop: true,
      diameter: "max(3rem, 15vmin)",
      thickness: "0.5rem",
    });
    try {
      state = { ...state, currentNodeId: nid };
      if (nid == null) {
        $documentWrapper.show();
        hideBootstrapFlex($noPreviewElement);
        await placer.changeDocument(null);
        return;
      }

      if (!isNumeric(nid)) {
        throw new Error("Expected nid to be a number or numeric value");
      }

      const [error, documentPreviewUrl] = await getDocumentPdfPreviewUrl(BigInt(nid));
      if (error === "no_preview") {
        $documentWrapper.hide();
        showBootstrapFlex($noPreviewElement);
      } else {
        $documentWrapper.show();
        hideBootstrapFlex($noPreviewElement);
      }

      if (error === "generic") {
        console.warn("Could not find document PDF preview URL for node id", nid);
      }

      const document = error ? null : await Placer.loadDocument(documentPreviewUrl);
      await placer.changeDocument(document);
      const placedElements = state.placedElements[nid] ?? {};
      placer.loadElements(Object.values(placedElements), { quiet: true });
    } finally {
      removeSpinner();
    }
  }

  /**
   * Sets and loads the current document, or queues the requested document to be
   * loaded next.
   *
   * Ensures that if a document change is required while another is loading, it
   * is not ignored while not loading both in parallel to avoid race conditions.
   *
   * @param {number|string|null} nid Document node id.
   */
  async function queueDocumentNodeUpdate(nid) {
    if (state.updatingDocumentNode) {
      state = { ...state, pendingDocumentToLoad: nid };
    } else {
      state = { ...state, updatingDocumentNode: true, pendingDocumentToLoad: nid };
      await updateDocumentNode(nid);
      state = { ...state, updatingDocumentNode: false };
      if (state.pendingDocumentToLoad !== state.currentNodeId) {
        await queueDocumentNodeUpdate(state.pendingDocumentToLoad);
      }
    }
  }

  /**
   * Namespace object for functions whose names correspond to message action
   * constant values.
   * @satisfies {Record<string,Function>}
   */
  const messageHandlers = {
    /**
     * Handler for document setting message.
     * @param {object} message Message object
     * @param {"setDocumentNode"} message.action Action name.
     * @param {number|string|null} message.nid Document node id.
     */
    async setDocumentNode(message) {
      const { nid } = message;
      await queueDocumentNodeUpdate(nid);
    },

    /**
     * Handler for user list update message.
     * @param {object} message Message object.
     * @param {'updateUsers'} message.action Action name.
     * @param {PlacerSigner[]} message.users List of up-to-date users.
     */
    updateUsers(message) {
      const newSigners = Object.fromEntries(message.users.map((u) => [u.id, u]));
      const removedSigners = new Set(
        Object.values(state.signers)
          .filter((u) => !(u.id in newSigners))
          .map((u) => u.id),
      );

      // Remove instances in currently active document from placer of removed users.
      if (removedSigners.size > 0) {
        for (const element of Object.values(state.placedElements[state.currentNodeId] ?? {})) {
          if (!removedSigners.has(element.properties.signerId)) {
            continue;
          }
          placer.removeElementById(element.id, { quiet: true });
        }
      }

      // Remove elements in state referencing a removed signer
      const keptElements =
        removedSigners.size === 0
          ? // Short-circuit when no user was removed
            state.placedElements
          : Object.fromEntries(
              Object.entries(state.placedElements).map(([nid, elements]) => [
                nid,
                Object.fromEntries(
                  Object.entries(elements).filter(
                    ([_id, el]) => !removedSigners.has(el.properties.signerId),
                  ),
                ),
              ]),
            );

      const elementsChanged = keptElements !== state.placedElements;

      state = {
        ...state,
        placedElements: keptElements,
        signers: newSigners,
      };
      $(window).trigger("signature_placer:user_update");
      // notify parent that some elements changed due to user changing.
      if (elementsChanged) {
        notifyElementsUpdate();
      }
    },
  };

  /**
   * Namespace object of placer event listeners.
   */
  const eventHandlers = {
    /** When an element is created/added into the placer */
    onElementCreated(event) {
      state.placedElements = {
        ...state.placedElements,
        [state.currentNodeId]: {
          ...state.placedElements[state.currentNodeId],
          [event.element.id]: event.element,
        },
      };
      notifyElementsUpdate();
    },

    /** When an element has reported an update or was moved */
    onElementUpdated(event) {
      state.placedElements = {
        ...state.placedElements,
        [state.currentNodeId]: {
          ...state.placedElements[state.currentNodeId],
          [event.element.id]: event.element,
        },
      };
      notifyElementsUpdate();
    },

    /** When an element was removed from the placer */
    onElementRemoved(event) {
      state.placedElements = {
        ...state.placedElements,
        [state.currentNodeId]: omit(state.placedElements[state.currentNodeId], event.elementId),
      };
      notifyElementsUpdate();
    },
  };

  /**
   * Send message to parent window that placed elements have updated.
   */
  const notifyElementsUpdate = (() => {
    function send() {
      window.parent.postMessage({
        action: "placedElementsUpdated",
        elements: state.placedElements,
      });
    }
    // Deduplicate sending message to parent in same event loop iteration by
    // queuing a microtask to actually send the message to the parent window.
    let queued = false;
    return function notifyElementsUpdate() {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        send();
      });
    };
  })();

  $(async function init() {
    const embedWidthEstimate = 800;
    const search = new URLSearchParams(location.search);

    // Try to parse initial scale from query search parameters, or default to
    // estimation depending on widget window size.
    const initScaleString = search.get("initScale");
    let initScale = initScaleString ? parseFloat(initScaleString) : null;
    if (initScale == null || isNaN(initScale)) {
      initScale = (window.innerWidth / embedWidthEstimate) * 1.25;
    }

    $documentWrapper = $("#placer-document");
    $noPreviewElement = $(".placer-no-preview-placeholder");
    placer = await Placer.create({
      attachTo: $documentWrapper,
      // TODO: figure out scale depending on window size & document first page width.
      scale: initScale,
      elementTypes: {
        signature: {
          sizing: {
            resizable: true,
            width: {
              min: 90,
            },
            height: {
              min: 40,
            },
            aspectRatio: 15 / 7,
          },
          init(root, initData, options) {
            const { width, height, signerId } = initData.properties;
            const element = new PlacerSignatureElement({
              width,
              height,
              signerId,
            });
            element.attach(root, options);
            return element;
          },
        },
      },
    });

    window.top.__dbg_placers ??= [];
    window.top.__dbg_placers.push(placer);
    window.top.__dbg_states ??= [];
    window.top.__dbg_states.push({
      get state() {
        return state;
      },
    });

    placer.on("placer:element:added", eventHandlers.onElementCreated);
    placer.on("placer:element:update", eventHandlers.onElementUpdated);
    placer.on("placer:element:removed", eventHandlers.onElementRemoved);

    window.addEventListener("message", function (event) {
      if (event.origin !== self.location.origin) {
        return;
      }
      /** @type {{action:string}} Message from parent */
      const message = event.data;

      if (message.action in messageHandlers) {
        messageHandlers[message.action](message);
      } else {
        console.warn("Unhandled widget message action", { message, event });
      }
    });

    // send message to parent if not top window to notify that widget is
    // initialized.
    if (window.top !== self) {
      window.parent.postMessage({ action: "placerWidgetInitialized" });
    }
  });
})(jQuery, Gofast);
