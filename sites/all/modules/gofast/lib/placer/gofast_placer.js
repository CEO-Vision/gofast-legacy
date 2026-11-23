/**
 * @typedef {PlacerElement} PlacerElementInitializationResult Result type of
 *  init callbacks in element definitions.
 */
/**
 * @callback PlacerElementInitializer Callback to initialise a new Placer element.
 * @param {JQuery} root Root DOM Element for element wrapped in JQuery collection.
 * @param {object} initData Initial data for element
 * @param {string} initData.type Element type (was used to select initializer)
 * @param {object} initData.properties Custom properties passed by caller.
 * @param {object} options Additional options/data passed by placer
 * @param {number} options.scale Scale factor of document
 * @returns {PlacerElementInitializationResult} Initialisation result. This is
 *  currently the element "state" object implementing a base interface required
 *  by Placer widget.
 */
/**
 * @typedef {'center'|'topLeft'} PlacementPosition Enumeration of well-known
 *  placement position.
 */
/**
 * @callback PlacementPositionProvider Callback to compute a position offset
 *  from cursor for the element origin. Used when placing elements.
 * @param {AABoundingRect} boundingRect Element-provided bounding rectangle.
 * @param {any} initData Element initial data.
 * @return {Vec2Like}
 */
/**
 * @typedef {object} PlacerElementDefinition Definition object type, configures
 *  how a Placer widget instantiates and configures each element.
 * @property {object} [sizing] Object size and resizing options.
 * @property {boolean} [sizing.resizable] Whether element is resizable or not
 * @property {object} [sizing.width] Element Width options
 * @property {number} [sizing.width.min] Minimum width value
 * @property {number} [sizing.width.max] Maximum width value
 * @property {object} [sizing.height] Element height options
 * @property {number} [sizing.height.min] Minimum height value
 * @property {number} [sizing.height.max] Maximum height value
 * @property {number} [sizing.aspectRatio] Aspect ratio to preserve while resizing
 * @property {object} [dragging] Options related to dragging
 * @property {object} [preview] Element preview options. Preview only works in
 *  Firefox.
 * @property {boolean} [preview.enabled] Whether preview is enabled or not.
 *  Defaults to being enabled.
 * @property {object} [placement] Element placement options
 * @property {PlacementPosition|PlacementPositionProvider} [placement.origin]
 *  Element anchor/origin position when placing a new element. Defaults to center.
 * @property {PlacerElementInitializer} init Function to create and initialise
 *  a new element.
 */

/**
 * Mapping of element types to element definition objects.
 * @typedef {{[type:string]: PlacerElementDefinition}} PlacerElementRegistry
 */
(($, Gofast) => {
  // define namespace
  const placerLib = (Gofast.placerLib ??= {});
  const { Vec2, PlacerElementInstance, PDFPageView, hideBootstrapFlex, showBootstrapFlex } =
    placerLib;
  /** @type {()=>never} */
  const unreachable = placerLib.unreachable;

  /**
   * Placer widget implementation, allowing management of elements placed on a
   * document supporting drag & drop.
   */
  class Placer {
    /** @type {JQuery} JQuery object wrapping the top-most placer div */
    $root;
    /** @type {JQuery} JQuery Object displaying message that not document is loaded */
    $noDocumentPlaceholder;
    /** @type {PDFDocumentProxy} PDF.js document object */
    pdfDocument;
    /** @type {PDFPageView[]} Array of views to each page of hte current document */
    #pageViews;
    /** @type {JQuery} JQuery object wrapping the div containing pages. */
    $pagesWrapper;

    /**
     * Elements placed on the Document
     * @type {PlacerElementInstance[]}
     */
    #elements = [];
    /** @type {number} Scale factor for the PDF rendering */
    #scale;
    /** @type {PlacerElementRegistry} Registry of element types to definitions. */
    #elementRegistry;

    /**
     * Instanced placer element that is yet to be fully added to the document.
     *
     * Used by preview and validation that element can be dropped in valid position.
     * @type {PlacerElementInstance|null}
     */
    #pendingDraggedElement = null;

    /**
     * Array of page snapping bottom positions relative to the top of the
     * document preview element.
     *
     * Each index corresponds to the appropriate page in the `#pageViews`
     * property. Since each page is laid out one after another vertically, these
     * coordinates should be in strict ascending order.
     * @type {number[]}
     */
    #pageAreaBottoms = [];

    /**
     * Set of currently used element ids.
     * @type {Set<PlacerElementId>}
     */
    #elementIds = new Set();

    /**
     * Loads a pdf document from a URL pointing to the document.
     *
     * @param {string} url URL to the PDF Document.
     * @returns {PDFDocumentProxy} Document object.
     */
    static async loadDocument(url) {
      const pdfLoadingTask = pdfjsLib.getDocument(url);
      return await pdfLoadingTask.promise;
    }

    /**
     * Loads a document's pages.
     *
     * @param {PDFDocumentProxy} document The document to load the pages of.
     * @returns {Promise<PDFPageProxy>[]} Array of promises to each individual page.
     */
    static loadPages(document) {
      const pagePromises = [];
      for (let i = 1; i <= document.numPages; ++i) {
        pagePromises.push(document.getPage(i));
      }
      return pagePromises;
    }

    /**
     * Create page views out of PDF Page objects.
     *
     * @param {PDFPageProxy[]} pages PDF pages of the document
     * @param {{scale: number}} options Other options
     * @returns {PDFPageView[]} Array of page views for each page.
     */
    static createPageViews(pages, { scale }) {
      return pages.map((page) => new PDFPageView({ page, scale, rootClasses: ["shadow"] }));
    }

    /**
     * Create a new instance of a placer
     * @param {object} options Placer creation options object
     * @param {any} options.attachTo Placer root DOM element.
     * @param {string|null} [options.documentUrl] Url to PDF document file.
     * @param {number} [options.scale] Document view scaling factor. defaults to 1.5.
     * @param {PlacerElementRegistry} options.elementTypes Mapping of element
     *  types to definition objects instructing the placer on how to create
     *  and configure them.
     * @returns {Promise<Placer>} Promise resolving to an fully configured and
     *  rendered instance of Placer
     */
    static async create(options) {
      const { attachTo: root, documentUrl = null, scale = 1.5, elementTypes } = options;
      let pdfDocument = null;
      let pageViews = [];
      if (documentUrl) {
        pdfDocument = await Placer.loadDocument(documentUrl);
        const pages = await Promise.all(Placer.loadPages(pdfDocument));
        pageViews = Placer.createPageViews(pages, { scale });
      }

      const placer = new Placer({ root, pdfDocument, pageViews, scale, elementTypes });
      await placer._render();
      return placer;
    }

    /**
     * Create a new placer.
     *
     * The constructor is infallible and synchronous, but does not expose the
     * most user-friendly API.
     * @see Placer.create Simpler API.
     * @param {object} options Placer construction arguments
     * @param {any} options.root DOM root for the Placer.
     * @param {PDFDocumentProxy} options.pdfDocument Loaded PDF.js document
     * @param {PDFPageView[]} options.pageViews Loaded Page View objects in order
     * @param {number} options.scale Display scale factor.
     * @param {PlacerElementRegistry} options.elementTypes Mapping of element
     *  types to description of how the elements should be created.
     */
    constructor(options) {
      const { root, pdfDocument, pageViews, scale, elementTypes } = options;
      this.#elementRegistry = elementTypes;
      this.#scale = scale;
      this.$root = $(root);
      this.$pagesWrapper = $(
        '<div class="placer-pages-wrapper position-absolute d-flex flex-column align-items-center"></div>',
      );
      this.$root.append(this.$pagesWrapper);
      this.$noDocumentPlaceholder = $(
        '<div class="placer-no-document-placeholder position-absolute d-flex flex-column align-items-center justify-content-center" style="inset:0">' +
          '<i class="fas fa-file-times mb-3" style="font-size:6em"></i>' +
          '<h1 class="placer-no-document-label text-uppercase"></h1>' +
          "</div>",
      );
      this.$noDocumentPlaceholder
        .find(".placer-no-document-label")
        .text(Drupal.t("No document", {}, { context: "gofast" }));
      if (pdfDocument != null) {
        this.#hideNoDocument();
      }
      this.$root.append(this.$noDocumentPlaceholder);

      this.pdfDocument = pdfDocument;
      this.#pageViews = pageViews;
      this._attachViews();
      this.#computePageBottoms();
      // setup event listeners
      this.$root.on("dragenter", this.onDragEnter.bind(this));
      this.$root.on("dragleave", this.onDragLeave.bind(this));
      this.$root.on("dragover", this.onDragOver.bind(this));
      this.$root.on("drop", this.onDrop.bind(this));

      // Add instance as JQuery arbitrary data on element.
      this.$root.data("gf-placer", this);
    }

    /**
     * Cleans resources used by placer.
     *
     * Alias for [Symbol.dispose]().
     */
    cleanup() {
      this[Symbol.dispose]();
    }

    /**
     * Cleans resources used by placer.
     */
    [Symbol.dispose]() {
      // All cleanup for instance
      this.#cleanupPdfDoc();
      this.$root.removeData("gf-placer");
    }

    /**
     * Cleanup resources used by document and page views as well as remove page
     * views from DOM.
     */
    #cleanupPdfDoc() {
      // clean after pdf doc, like when changing doc.
      this.pdfDocument?.cleanup();
      for (const view of this.#pageViews) {
        view.cleanup();
      }
      this._detachViews();
    }

    /**
     * Change which document is displayed/interacted with by the placer
     *
     * This clears all elements currently in the placer quietly.
     *
     * @param {PDFDocumentProxy|null} pdfDocument PDF.js document object of the new
     *  document to display/interact with.
     * @returns {Promise<void>} Promise resolving when the new document is fully
     *  loaded and rendered.
     */
    async changeDocument(pdfDocument) {
      let pageViews = [];
      if (pdfDocument != null) {
        const pages = await Promise.all(Placer.loadPages(pdfDocument));
        pageViews = Placer.createPageViews(pages, { scale: this.#scale });
      }

      // Remove the elements from the instance before removing the pages from DOM.
      // The elements would no longer be relevant on a different document.
      this.clearElements({ quiet: true });
      this.#cleanupPdfDoc();
      this.pdfDocument = pdfDocument;
      this.setPageViews(pageViews);
      await this._render();
    }

    /**
     * Updates the page view data on the Placer instance while removing old
     * views' DOM elements and eagerly adding the new views' DOM elements.
     * @param {PDFPageView[]} pageViews Array of page views in order
     */
    setPageViews(pageViews) {
      this._detachViews();
      this.#pageViews = pageViews;
      this._attachViews();
      this.#computePageBottoms();
    }

    /**
     * Compute and cache the page bottom positions relative to the document view element.
     */
    #computePageBottoms() {
      this.#pageAreaBottoms = this.#pageViews.map(
        (v) => v.getPageViewElementDimensionsWithMargins().height,
      );
      // in-place Scan / cumulative sum
      for (let i = 1; i < this.#pageAreaBottoms.length; ++i) {
        this.#pageAreaBottoms[i] += this.#pageAreaBottoms[i - 1];
      }
    }

    /**
     * Adds the DOM Elements of the current page view objects.
     *
     * The elements are added in the order of the page views array.
     */
    _attachViews() {
      for (const view of this.#pageViews) {
        this.$pagesWrapper.append(view.getPageWrapperElement());
      }
    }

    /**
     * Removes the DOM elements of the current page view objects.
     */
    _detachViews() {
      for (const view of this.#pageViews) {
        view.getPageWrapperElement().remove();
      }
    }

    /**
     * Render the document's pages.
     *
     * Currently renders all pages by delegating each page's render to its page
     * view object.
     */
    async _render() {
      if (this.pdfDocument == null) {
        this.#showNoDocument();
      } else {
        this.#hideNoDocument();
      }
      const renderPromises = [];
      for (const view of this.#pageViews) {
        renderPromises.push(view.render());
      }
      await Promise.all(renderPromises);
    }

    /**
     * Switches the CSS classes of the no document element to hide it.
     *
     * Warning: may be called in constructor, thus, when the instance is not fully initialized
     */
    #hideNoDocument() {
      hideBootstrapFlex(this.$noDocumentPlaceholder);
    }

    /**
     * Switches the CSS classes of the no document element to show it.
     */
    #showNoDocument() {
      showBootstrapFlex(this.$noDocumentPlaceholder);
    }

    /**
     * Remove all registered placed elements.
     * @param {object} [options] Clear options.
     * @param {boolean} [options.quiet] When true, no events will be emitted
     *  when removing the elements.
     */
    clearElements({ quiet = false } = {}) {
      let el;
      while ((el = this.#elements.pop())) {
        this.removeElement(el, { quiet });
      }
    }

    /**
     * Get the Definition object according to an element type.
     * @param {string} type Element type
     * @returns {PlacerElementDefinition|null}
     */
    #getElementDefinition(type) {
      if (!(type in this.#elementRegistry)) {
        return null;
      }
      return this.#elementRegistry[type];
    }

    /** Set of allowed drop effects for placer drop zone */
    static #allowedDropEffects = new Set(
      /**@satisfies {DataTransfer['effectAllowed'][]}*/ (["copy", "copyMove", "copyLink", "all"]),
    );

    /**
     * Expected MIME type of placer element data when using drag and drop.
     * @readonly
     */
    static get elementDataMimeType() {
      return "application/x.gf-placer-element";
    }

    /**
     * Checks that a drag event ca be used for dropping in the PLacer widget.
     * @param {DragEvent} event Drag event to test if acceptable for drop in placer.
     * @returns {boolean}
     */
    #isDragEventAcceptable(event) {
      if (this.#pageViews.length === 0) {
        return false;
      }

      if (!event.dataTransfer.types.includes(Placer.elementDataMimeType)) {
        return false;
      }

      if (!Placer.#allowedDropEffects.has(event.dataTransfer.effectAllowed)) {
        return false;
      }

      return true;
    }

    /**
     * Try to instantiate a new placer element instance from a drag event's data
     * @param {DataTransfer} dataTransfer The drag event's data transfer object
     * @returns {PlacerElementInstance|null} The new element instance or null in
     *  case of failure.
     */
    #tryInstantiateElementFromDataTransfer(dataTransfer) {
      const initDataJson = dataTransfer.getData(Placer.elementDataMimeType);
      if (initDataJson === "") {
        return null;
      }
      const initData = JSON.parse(initDataJson);
      if (initData.type == null) {
        return null;
      }
      return this.instantiateElement(initData);
    }

    /**
     * Listener to placer Browser Drag & drop drag enter event.
     * @param {JQuery.Event} jqev JQuery event
     */
    onDragEnter(jqev) {
      /** @type {DragEvent} */
      const event = jqev.originalEvent;
      if (!this.#isDragEventAcceptable(event)) {
        return;
      }

      // Element already pending, most likely entered some child
      if (this.#pendingDraggedElement != null) {
        return;
      }

      // try create pending element
      // If the browser enforces drag data not being available when not in drop
      // event, we cannot have a preview.
      const element = this.#tryInstantiateElementFromDataTransfer(event.dataTransfer);
      if (element == null) {
        return;
      }
      const definition = this.#getElementDefinition(element.type) ?? unreachable();
      const previewEnabled = definition.preview?.enabled ?? true;

      const mousePosition = Vec2.divS(
        this.#transformGlobalToViewportRelative({ x: event.clientX, y: event.clientY }),
        this.#scale,
      );
      element.position = this.#tryGetElementPlacementPosition(element, mousePosition);

      // Initialise preview (or hide if disabled)
      if (previewEnabled) {
        element.root.css("opacity", 0.5);
      } else {
        hideBootstrapFlex(element.root);
      }

      this.#pendingDraggedElement = element;
    }

    /**
     * Try to compute a snapped position for the given element such that it fits
     * inside the nearest intersecting page according to the cursor position and
     * element-defined positioning on insertion.
     *
     * @param {PlacerElementInstance} element
     * @param {Vec2Like} cursorPosition
     * @returns {DocumentCoordinates|null}
     */
    #tryGetElementPlacementPosition(element, cursorPosition) {
      const definition = this.#getElementDefinition(element.type);
      if (definition == null) {
        return;
      }
      const state = element.getCurrentState();
      const boundingRect = state.getBoundingRect();
      const offsetProvider = Placer.getPlacementPositionProvider(
        definition.placement?.origin ?? "center",
      );
      const offset = offsetProvider(boundingRect);
      const tentativeBounds = {
        ...boundingRect,
        ...Vec2.add(cursorPosition, Vec2.add(offset, boundingRect)),
      };

      return this.#tryFindSnappedPositionInDocument(tentativeBounds);
    }

    /**
     * Listener to placer Browser Drag & drop drag leave event.
     * @param {JQuery.Event} jqev JQuery event
     */
    onDragLeave(jqev) {
      /** @type {DragEvent} */
      const event = jqev.originalEvent;
      // event bubbled from child, ignore.
      /** @type {DOMRect} */
      const rootBounds = this.$root[0].getBoundingClientRect();
      const mousePosition = { x: event.clientX, y: event.clientY };
      const isInsideRoot =
        mousePosition.x >= rootBounds.left &&
        mousePosition.x <= rootBounds.right &&
        mousePosition.y >= rootBounds.top &&
        mousePosition.y <= rootBounds.bottom;
      // Left some child element, ignore event
      if (isInsideRoot) {
        return;
      }
      // Delete preview element
      if (this.#pendingDraggedElement != null) {
        this.removeElement(this.#pendingDraggedElement);
        this.#pendingDraggedElement = null;
      }
    }

    /**
     * Listener to placer Browser Drag & drop drag over event.
     * @param {JQuery.Event} jqev JQuery event
     */
    onDragOver(jqev) {
      /** @type {DragEvent} */
      const event = jqev.originalEvent;
      if (!this.#isDragEventAcceptable(event)) {
        return;
      }

      // Try to find a valid position for the drop
      const element = this.#pendingDraggedElement;
      // Pending element could not be created due to browser restrictions
      // Check if event is acceptable based on mous position
      let previewEnabled = true;
      if (element != null) {
        // Checks that pending element can find an appropriate position according to mouse position.
        const definition = this.#getElementDefinition(element.type) ?? unreachable();
        previewEnabled = definition.preview?.enabled ?? true;

        const mousePosition = Vec2.divS(
          this.#transformGlobalToViewportRelative({ x: event.clientX, y: event.clientY }),
          this.#scale,
        );

        const position = this.#tryGetElementPlacementPosition(element, mousePosition);
        // Always keep pending element position up-to-date.
        element.position = position;
        // No valid position, prevent drop.
        if (position == null) {
          // hide preview element
          if (previewEnabled) {
            hideBootstrapFlex(element.root);
          }
          return;
        }
      } else {
        // check if mouse is over page (only "safe" bet)
        const mousePosition = { x: event.clientX, y: event.clientY };
        const pageIndex = this.getPageIndexFromViewerPosition(
          this.#transformGlobalToViewportRelative(mousePosition),
        );

        const view = this.#pageViews[pageIndex];

        const rect = view.getBoundingClientRect();
        if (!Placer.#rectContains(rect, mousePosition)) {
          return;
        }
      }

      // prevent default to allow for drop (default is denying drop)
      event.preventDefault();
      // Specify the expected operation
      event.dataTransfer.dropEffect = "copy";

      // update preview element
      if (previewEnabled && element != null) {
        showBootstrapFlex(element.root);
        this.#moveElementToPosition(element);
      }
    }

    /**
     * Listener to placer Browser Drag & drop drop event.
     *
     * Creates new element at the drop position according to the associated definition.
     *
     * @param {JQuery.Event} jqev JQuery event
     */
    onDrop(jqev) {
      /** @type {DragEvent} */
      const event = jqev.originalEvent;
      if (!this.#isDragEventAcceptable(event)) {
        return;
      }

      // Pending element may not have been created due to browser restrictions
      // on drag data access during drag and drop events, now in drop we should
      // be able to get the data.
      const element =
        this.#pendingDraggedElement != null
          ? this.#pendingDraggedElement
          : this.#tryInstantiateElementFromDataTransfer(event.dataTransfer);

      this.#pendingDraggedElement = null;
      // Instantiation may have failed.
      if (element == null) {
        return;
      }

      const mousePosition = Vec2.divS(
        this.#transformGlobalToViewportRelative({ x: event.clientX, y: event.clientY }),
        this.#scale,
      );

      const position = this.#tryGetElementPlacementPosition(element, mousePosition);
      if (position == null) {
        this.removeElement(element);
        return;
      }
      element.position = position;

      // Ensure element is shown and opaque (may be hidden or transparent
      // depending on preview)
      showBootstrapFlex(element.root);
      element.root.css("opacity", "");

      this.addElement(element);
      // prevent default to allow for drop (default is denying drop)
      event.preventDefault();
    }

    /**
     * Remove an element from the placer given its ID.
     *
     * @param {PlacerElementId} elementId ID of element to remove.
     * @param {object} [options] Additional removal options
     * @param {boolean} [options.quiet] When true, prevents emitting an event
     *  when the element is removed.
     */
    removeElementById(elementId, options = {}) {
      const element = this.#elements.find((el) => el.id === elementId);
      if (element == null) return;
      this.removeElement(element, options);
    }

    /**
     * Remove an element from the placer.
     *
     * @param {PlacerElementInstance} elementData Element to remove.
     * @param {object} [options] Additional removal options
     * @param {boolean} [options.quiet] When true, prevents emitting an event
     *  when the element is removed.
     */
    removeElement(elementData, { quiet = false } = {}) {
      const state = elementData.getCurrentState();
      state.detach?.();

      elementData.root.remove();
      const index = this.#elements.findIndex((e) => e.id === elementData.id);
      if (index !== -1) {
        this.#elements.splice(index, 1);
      }
      this.#elementIds.delete(elementData.id);
      if (index !== -1 && !quiet) {
        // Trigger remove event.
        this.$root.trigger({
          type: "placer:element:removed",
          elementId: elementData.id,
          placer: this,
        });
      }
    }

    /**
     * Mapping of well known positions to equivalent position provider functions.
     * @type {Record<PlacementPosition,PlacementPositionProvider>}
     */
    static #positionProviders = {
      center: (boundingRect) => ({
        x: -(boundingRect.width / 2),
        y: -(boundingRect.height / 2),
      }),
      topLeft: () => ({ x: 0, y: 0 }),
    };

    /**
     * Get a position provider function from a well known position name.
     * @param {PlacementPosition} position Position name.
     * @returns {PlacementPositionProvider}
     */
    static getWellKnownPlacementPositionProvider(position) {
      return Placer.#positionProviders[position];
    }

    /**
     * Normalize a position provider value to a provider function.
     * @param {PlacementPosition|PlacementPositionProvider} position Position value.
     * @returns {PlacementPositionProvider}
     */
    static getPlacementPositionProvider(position) {
      if (typeof position === "function") {
        return position;
      }
      return this.getWellKnownPlacementPositionProvider(position);
    }

    /**
     * Finds in which page a given position lies vertically within the viewport.
     *
     * This assumes pages are only stacked vertically, and each page's vertical
     * range is defined by it height plus display margin.
     *
     * This means a position switches from one page to the next in the middle of
     * the space between each page visually.
     * @param {Vec2Like} position Position relative to Placer document viewport
     * @returns {number} The index of the page the position is in.
     */
    getPageIndexFromViewerPosition(position) {
      // find page based on height.
      let pageIndex = 0;
      for (; pageIndex < this.#pageViews.length; ++pageIndex) {
        if (position.y <= this.#pageAreaBottoms[pageIndex]) {
          break;
        }
      }
      return pageIndex;
    }

    /**
     * Compute full document coordinates from a viewer position
     * @param {Vec2Like} position Point coordinate relative to viewport
     * @returns {DocumentCoordinates}
     */
    getPageCoordinatesFromViewerPosition(position) {
      const pageIndex = this.getPageIndexFromViewerPosition(position);

      // get view of page position is associated to
      const view = this.#pageViews[pageIndex];
      /** @type {DOMRect} */
      const viewportRect = this.$pagesWrapper[0].getBoundingClientRect();
      const pageRect = view.getBoundingClientRect();

      return {
        page: pageIndex + 1,
        // Vector math: (position + (viewportPosition - pagePosition)) / scale
        // where:
        // - vectors: position, viewportPosition, pagePosition
        // - scalars: scale
        ...Vec2.divS(Vec2.add(position, Vec2.sub(viewportRect, pageRect)), this.#scale),
      };
    }

    /**
     * Transforms a position relative to the browser client view to a position
     * relative to the document viewport element.
     * @param {Vec2Like} position Client position
     * @returns {Vec2Like} document relative position.
     */
    #transformGlobalToViewportRelative(position) {
      const viewerRect = this.$pagesWrapper[0].getBoundingClientRect();
      return Vec2.sub(position, viewerRect);
    }

    /**
     * Transforms a position relative to the browser client view to a position
     * relative to the document viewport element.
     * @param {Vec2Like} position document-relative position
     * @returns {Vec2Like} Client position.
     */
    #transformViewportRelativeToGlobal(position) {
      const viewerRect = this.$pagesWrapper[0].getBoundingClientRect();
      return Vec2.add(position, viewerRect);
    }

    /**
     * Tests if two ranges intersect.
     *
     * @param {object} lhs First range
     * @param {number} lhs.min Lower bound
     * @param {number} lhs.max Higher bound
     * @param {object} rhs Second range
     * @param {number} rhs.min Lower bound
     * @param {number} rhs.max Higher bound
     */
    static #rangeIntersect(lhs, rhs) {
      return lhs.min <= rhs.max && lhs.max >= rhs.min;
    }

    /**
     * Tests if two Axis-Aligned rectangles intersect.
     *
     * @param {AABoundingRect} lhs First rectangle
     * @param {AABoundingRect} rhs Second rectangle
     */
    static #rectsIntersect(lhs, rhs) {
      return (
        Placer.#rangeIntersect(
          {
            min: lhs.x,
            max: lhs.x + lhs.width,
          },
          {
            min: rhs.x,
            max: rhs.x + rhs.width,
          },
        ) &&
        Placer.#rangeIntersect(
          {
            min: lhs.y,
            max: lhs.y + lhs.height,
          },
          {
            min: rhs.y,
            max: rhs.y + rhs.height,
          },
        )
      );
    }

    /**
     * Checks if a point is within a bounding rectangle.
     * @param {AABoundingRect} rect
     * @param {Vec2Like} point
     */
    static #rectContains(rect, point) {
      return (
        rect.x <= point.x &&
        point.x <= rect.x + rect.width &&
        rect.y <= point.y &&
        point.y <= rect.y + rect.height
      );
    }

    /**
     * Try to compute a set of document coordinates where the given tentative
     * bounds in document space fit inside a page. In case the bound do not
     * intersect any page, the position is considered invalid and null is returned.
     * @param {AABoundingRect} tentativeBounds Axis-Aligned Bounding Rectangle
     *  corresponding to desired element position in document space.
     * @returns {DocumentCoordinates|null} A set of coordinates snapped to
     *  include the bounds inside the closest page the bounds intersected. Null
     *  if the bounds did not intersect any page.
     */
    #tryFindSnappedPositionInDocument(tentativeBounds) {
      const elementGlobalPosition = this.#transformViewportRelativeToGlobal(
        Vec2.mulS(tentativeBounds, this.#scale),
      );
      const elementGlobalSize = {
        width: tentativeBounds.width * this.#scale,
        height: tentativeBounds.height * this.#scale,
      };
      const elementGlobalRect = new DOMRect(
        elementGlobalPosition.x,
        elementGlobalPosition.y,
        elementGlobalSize.width,
        elementGlobalSize.height,
      );
      const elementGlobalCenter = {
        x: elementGlobalRect.x + elementGlobalRect.width / 2,
        y: elementGlobalRect.y + elementGlobalRect.height / 2,
      };

      // position relative to viewport
      const viewportBoundingRect = this.$pagesWrapper[0].getBoundingClientRect();
      const intersectingPages = [];
      // keep track of page bottom relative to document view with running sum
      for (let i = 0; i < this.#pageViews.length; ++i) {
        const view = this.#pageViews[i];
        const globalRect = view.getBoundingClientRect();
        if (Placer.#rectsIntersect(elementGlobalRect, globalRect)) {
          intersectingPages.push({
            pageIndex: i,
            view,
            globalRect,
            pageSnappingBottom: this.#pageAreaBottoms[i] + viewportBoundingRect.y,
          });
        }
      }

      // Element is not intersecting any page, meaning it is outside the
      // document and in an incorrect position. Skip updating the logical
      // position and restore the position of the root DOM Element.
      if (intersectingPages.length === 0) {
        return null;
      }

      // if only one intersection: choose it, otherwise find the page in which
      // the center is positioned vertically.
      const page =
        intersectingPages.length === 1
          ? intersectingPages[0]
          : intersectingPages.find((p) => p.pageSnappingBottom >= elementGlobalCenter.y);
      if (page == null) {
        throw new Error(
          "Couldn't find page intersecting element bounding rectangle containing element center, should be impossible",
        );
      }

      // snap element into page bounds.
      // if an element is larger than the bounds of the page, snapping behavior
      // is undefined
      const globalPageRect = page.globalRect;
      let elementLocalPosition = Vec2.sub(elementGlobalRect, globalPageRect);
      // vertical snapping
      if (elementGlobalRect.bottom > globalPageRect.bottom) {
        elementLocalPosition.y -= elementGlobalRect.bottom - globalPageRect.bottom;
      } else if (elementGlobalRect.top < globalPageRect.top) {
        elementLocalPosition.y += globalPageRect.top - elementGlobalRect.top;
      }
      // horizontal snapping
      if (elementGlobalRect.right > globalPageRect.right) {
        elementLocalPosition.x -= elementGlobalRect.right - globalPageRect.right;
      } else if (elementGlobalRect.left < globalPageRect.left) {
        elementLocalPosition.x += globalPageRect.left - elementGlobalRect.left;
      }

      // build new element position in PDF document coordinate space
      elementLocalPosition = Vec2.divS(elementLocalPosition, this.#scale);
      const pageNumber = page.pageIndex + 1;

      return {
        page: pageNumber,
        x: elementLocalPosition.x,
        y: elementLocalPosition.y,
      };
    }

    /**
     * Attempt to move an element to the position of its root element.
     *
     * Snaps the element inside the document pages if necessary. In cases where
     * the element is not in a valid position (not intersecting any page), it is
     * moved back to its original position.
     *
     * This updates the document-relative position on the element's instance
     * object, and then moves the element's root DOM element to the updated position.
     * @param {PlacerElementInstance} element Element to attempt moving, where
     *  the root DOM element is already moved but position is not yet updated.
     */
    #tryMoveElementAfterDrag(element) {
      /** @type {DOMRect} */
      const elementGlobalRect = element.root[0].getBoundingClientRect();
      const elementBoundingRect = element.getCurrentState().getBoundingRect();
      const elementLocalRect = {
        ...Vec2.add(
          Vec2.divS(this.#transformGlobalToViewportRelative(elementGlobalRect), this.#scale),
          elementBoundingRect,
        ),
        width: elementBoundingRect.width,
        height: elementBoundingRect.height,
      };
      const newPosition = this.#tryFindSnappedPositionInDocument(elementLocalRect);
      if (newPosition != null) {
        element.position = newPosition;
      }
      this.#moveElementToPosition(element);

      element.getCurrentState().onRootMove?.();

      // Trigger update event
      this.$root.trigger({
        type: "placer:element:update",
        hint: "moved",
        element: Placer.#serializeElement(element),
        placer: this,
      });
    }

    /**
     * Synchronise placer element's root DOM element to it's logical position.
     * @param {PlacerElementInstance} element
     */
    #moveElementToPosition(element) {
      // addElement adds the current DOM element as a child of the page's
      // element layer, which effectively moves it since DOM elements can only
      // be in one place on the page at a time.
      this.#pageViews[element.position.page - 1].addElement(element.root);
      // position's offset is relative to the page in document space, account
      // for scaling here.
      element.root.css({
        top: element.position.y * this.#scale,
        left: element.position.x * this.#scale,
      });
    }

    /**
     * Generate an ID guaranteed to be unique for the current placer instance,
     * and very likely unique among multiple instances.
     * @returns {PlacerElementId}
     */
    #generateElementId() {
      let id;
      do {
        id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      } while (this.#elementIds.has(id));
      return id;
    }

    /**
     * Create a new placer element instance on the document according to the initial data.
     * Does not automatically position the element or register it.
     *
     * @param {object} element Element initial data. This should contain all
     *  data needed to initialise an element in addition to its type.
     * @param {string} element.type Element type constant, as described in
     *  element registry. Decides which description is used to configure
     *  placer-owned data and which initialisation callback to call.
     * @param {DocumentCoordinates|null} [element.position] Document coordinates
     *  at which to create the element.
     * @param {PlacerElementId|null} [element.id] Pre-existing element id to try to use.
     *  When not given the placer will generate a unique id. When provided, if
     *  the id is already in use, a new id will be generated in its place.
     * @returns {PlacerElementInstance|null}
     */
    instantiateElement(element) {
      const { type, position = null } = element;
      let id = element.id ?? null;

      const definition = this.#getElementDefinition(type);
      if (definition == null) {
        return null;
      }

      // Ensure id is generated and unique for this instance.
      if (id == null || this.#elementIds.has(id)) {
        id = this.#generateElementId();
      }

      const root = this.#createElementRoot();
      const elementData = new PlacerElementInstance({
        id,
        type,
        root,
        position,
      });

      const elementState = definition.init(elementData.root, element, { scale: this.#scale });
      elementData.states[type] = elementState;

      return elementData;
    }

    /**
     * Create a new placer element on the document according to the initial data.
     * Automatically positions the element and registers it in this Placer instance.
     * @param {object} element Element initial data. This should contain all
     *  data needed to initialise an element in addition to its type.
     * @param {string} element.type Element type constant, as described in
     *  element registry. Decides which description is used to configure
     *  placer-owned data and which initialisation callback to call.
     * @param {DocumentCoordinates|null} [element.position] Document coordinates
     *  at which to create the element.
     * @param {PlacerElementId|null} [element.id] Pre-existing element id to try to use.
     *  When not given the placer will generate a unique id. When provided, if
     *  the id is already in use, a new id will be generated in its place.
     * @param {object} [options] Creation options.
     * @param {boolean} [options.quiet] Prevent triggering event that element
     *  was added.
     * @returns {PlacerElementInstance|null}
     */
    createElement(element, options = {}) {
      const placerElement = this.instantiateElement(element);
      if (placerElement == null) {
        return;
      }
      this.addElement(placerElement, options);
    }

    /**
     * Adds an element instance to this placer.
     *
     * Effectively registers it for tracking as well as moving its root to the
     * right position.
     * @param {PlacerElementInstance} element Element to add to the instance
     * @param {object} [options] Element addition options.
     * @param {boolean} [options.quiet] Prevent triggering event that element
     *  was added.
     */
    addElement(element, { quiet = false } = {}) {
      this.#registerElement(element);
      this.#moveElementToPosition(element);
      // trigger add event (idk if this is the best place)
      if (!quiet) {
        this.$root.trigger({
          type: "placer:element:added",
          element: Placer.#serializeElement(element),
          placer: this,
        });
      }
    }

    /**
     * Register the element so the placer widget keeps track of it.
     * @param {PlacerElementInstance} element Element instance to register.
     */
    #registerElement(element) {
      this.#elements.push(element);
      this.#elementIds.add(element.id);

      // add listeners and configure UI interaction in the context of this placer.
      const { root } = element;
      const definition = this.#getElementDefinition(element.type) ?? unreachable();
      // setup listeners for element interaction
      root.on("placer_element:delete", () => {
        this.removeElement(element);
      });

      // Listen for element's self-reported update events, and re-emit placer
      // element update event.
      root.on("placer_element:update", () => {
        this.$root.trigger({
          type: "placer:element:update",
          hint: "self_report",
          element: Placer.#serializeElement(element),
          placer: this,
        });
      });

      root.draggable({
        containment: this.$pagesWrapper,
      });
      root.on("dragstop", (event) => {
        this.#tryMoveElementAfterDrag(element);
      });

      /** @type {<T,K extends string>(value:T|null|undefined,key:K)=> {[P in K]:T}|{}}*/
      const objWrapIfNotNull = (value, key) => (value != null ? { [key]: value } : {});
      /** @type {<T,R>(v:T|null|undefined,fn:(v:T)=>R)=>R|null|undefined} */
      const mapNotNull = (v, fn) => (v != null ? fn(v) : v);
      /** apply PDF document => DOM View scaling @param {number} v*/
      const mulScale = (v) => v * this.#scale;
      /** apply DOM View => PDF document scaling @param {number} v*/
      const divScale = (v) => v / this.#scale;

      if (definition.sizing?.resizable) {
        const sizing = definition.sizing;
        root.resizable({
          handles: "n,e,s,w,se,ne,sw,nw",
          containment: "parent", // assume element is in page-specific wrapper
          ...objWrapIfNotNull(mapNotNull(sizing.width?.min, mulScale), "minWidth"),
          ...objWrapIfNotNull(mapNotNull(sizing.width?.max, mulScale), "maxWidth"),
          ...objWrapIfNotNull(mapNotNull(sizing.height?.min, mulScale), "minHeight"),
          ...objWrapIfNotNull(mapNotNull(sizing.height?.max, mulScale), "maxHeight"),
          ...objWrapIfNotNull(sizing.aspectRatio, "aspectRatio"),
        });
        const getRootSizeInDocumentSpace = () => ({
          width: divScale(root.width()),
          height: divScale(root.height()),
        });

        root.on("resize", () => {
          const event = new $.Event({
            ...getRootSizeInDocumentSpace(),
            type: "placer_element:resize",
          });
          element.getCurrentState().onRootResize?.(event);
        });
        root.on("resizestart", () => {
          const event = new $.Event({
            ...getRootSizeInDocumentSpace(),
            type: "placer_element:resizestart",
          });
          element.getCurrentState().onRootResizeStart?.(event);
        });
        root.on("resizestop", () => {
          const event = new $.Event({
            ...getRootSizeInDocumentSpace(),
            type: "placer_element:resizestop",
          });
          element.getCurrentState().onRootResizeStop?.(event);
        });
      }
    }

    /**
     * Create the root DOM element for placed elements.
     *
     * @returns {JQuery} The root element wrapped in a JQuery collection.
     */
    #createElementRoot() {
      return $('<div class="d-flex position-absolute placer-element-root"></div>');
    }

    /**
     * Serialize an element into a plain object.
     * @param {PlacerElementInstance} element Element to serialize.
     */
    static #serializeElement(element) {
      const { id, position, type } = element;
      return {
        id,
        type,
        position,
        properties: element.getCurrentState().asPropertiesObject(),
      };
    }

    /**
     * Load a collection of elements in the current Placer instance.
     * @param {Parameters<Placer['createElement']>[0][]} elements Collection of
     *  elements to create on this instance.
     * @param {object} [options] Element loading options.
     */
    loadElements(elements, options = {}) {
      for (const element of elements) {
        this.createElement(element, options);
      }
    }

    /**
     * Add an event listener on the Placer widget's root DOM element.
     * @param {string} event Event name
     * @param {Function} handler Handler function
     */
    on(event, handler) {
      this.$root.on(event, handler);
    }

    /**
     * Remove an event listener on the Placer widget's root DOM element.
     * @param {string} event Event name
     * @param {Function} handler Handler function
     */
    off(event, handler) {
      this.$root.off(event, handler);
    }
  }

  // exports
  placerLib.Placer = Placer;
})(jQuery, Gofast);
