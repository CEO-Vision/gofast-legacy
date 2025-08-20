(($, Gofast) => {
  // define namespace
  const placerLib = (Gofast.placerLib ??= {});
  /**
   * Wraps a PDF.js page to handle its display as well as allow custom elements
   * to be added and displayed above the page.
   */
  class PDFPageView {
    /** @type {PDFPageProxy} PDF.js page object of the page to render */
    #pdfPage;
    /** @type {number} Scale factor for the display */
    #scale;
    /** @type {PageViewport} PDF Viewport used in render */
    #pdfViewport;
    /** @type {JQuery} Top-most element of the page view */
    #$root;
    /** @type {JQuery} Page view canvas element. May be null when not rendered to save memory */
    #$canvas;
    /** @type {JQuery} Text layer container */
    #$textLayer;
    /** @type {JQuery} Element regrouping the PDF view canvas and text layer */
    #$pdfPreviewWrapper;
    /** @type {JQuery} Element containing page-specific elements. */
    #$elementLayer;
    /**
     * @type {'hidden'|'rendering'|'rendered'} Internal state of the view.
     * Each state has its meaning:
     * - hidden: view is not displayed, either because it was not rendered yet or because it was cleared.
     * - rendering: a render operation is underway.
     * - rendered: rendering finished, the PDF page should be displayed.
     */
    #state = "hidden";
    /**
     * Create a new page view object to handle rendering the PDF page.
     *
     * @param {object} options View creation options.
     * @param {PDFPageProxy} options.page Page proxy object.
     * @param {number} [options.scale] Rendering scale, defaults to 1.
     * @param {string[]} [options.rootClasses] CSS classes to add to page view root element.
     */
    constructor({ page, scale = 1, rootClasses = [] }) {
      this.#pdfPage = page;
      this.#scale = scale;
      this.#$root = $(
        '<div class="gf-pdf-page-wrapper position-relative">' +
          '<div class="gf-pdfjs-render h-100 w-100">' +
          '<div class="gf-pdfjs-page-text-layer position-absolute" style="inset:0"></div>' +
          "</div>" +
          '<div class="gf-pdf-page-elements">' +
          "</div>" +
          "</div>",
      );
      this.#$root.addClass(rootClasses);
      this.#$canvas = null;
      this.#$textLayer = this.#$root.find(".gf-pdfjs-page-text-layer");
      this.#$pdfPreviewWrapper = this.#$root.find(".gf-pdfjs-render");
      this.#$elementLayer = this.#$root.find(".gf-pdf-page-elements");
      this.#pdfViewport = this.#pdfPage.getViewport({ scale: this.#scale });
      // adjust wrapper size to page rendered size (allows easier placement
      // without jumping)
      this.#$root.width(Math.floor(this.#pdfViewport.width) + "px");
      this.#$root.height(Math.floor(this.#pdfViewport.height) + "px");
    }

    /** Get the jQuery wrapper object around the top-most page view DOM element */
    getPageWrapperElement() {
      return this.#$root;
    }

    /**
     * Compute the total outer size with margins of this page view.
     * @returns {{height:number,width:number}} The total dimensions of the page
     *  view including margins outside the page. The lengths are expressed in pixels.
     */
    getPageViewElementDimensionsWithMargins() {
      return this.getPageViewElementDimensions(true);
    }
    /**
     * Compute the total outer size without margins of this page view.
     * @returns {{height:number,width:number}} The total dimensions of the page
     *  view excluding margins outside the page. The lengths are expressed in pixels.
     */
    getPageViewElementDimensionsWithoutMargins() {
      return this.getPageViewElementDimensions(false);
    }

    /**
     * Compute the total outer size possibly including margins of this page view.
     * @param {boolean} withMargins  Whether or not to include margins
     * @returns {{height:number,width:number}} The total dimensions of the page
     *  view maybe including margins outside the page. The lengths are expressed in pixels.
     */
    getPageViewElementDimensions(withMargins) {
      return {
        height: this.#$root.outerHeight(withMargins),
        width: this.#$root.outerWidth(withMargins),
      };
    }

    /** Create the canvas element for rendering */
    #makeCanvas() {
      return $('<canvas class="gf-pdfjs-page-canvas h-100 w-100"></canvas>');
    }

    /**
     * Render the pdf page into the corresponding elements
     */
    async render() {
      if (this.#state === "rendering") {
        return;
      }
      this.#state = "rendering";
      // Remove previous elements to make sure
      this.clearRender();
      this.#$canvas = this.#makeCanvas();
      this.#$pdfPreviewWrapper.prepend(this.#$canvas);

      // Support screens with high resolution
      const outputScale = window.devicePixelRatio ?? 1;
      const context2D = this.#$canvas[0].getContext("2d");

      // adjust canvas render output size
      this.#$canvas[0].width = Math.floor(this.#pdfViewport.width * outputScale);
      this.#$canvas[0].height = Math.floor(this.#pdfViewport.height * outputScale);

      // Column-major 2x3 affine transform matrix, set to null when would be
      // identity transform for optimisation (I guess, pdf.js example does this)
      // Applies a scaling by outputScale:
      // | outputScale 0           0 |
      // | 0           outputScale 0 |
      const outputTransform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context2D,
        transform: outputTransform,
        viewport: this.#pdfViewport,
      };

      // Queue rendering using PDF.js
      const renderTask = this.#pdfPage.render(renderContext);
      const textLayerRenderTask = pdfjsLib.renderTextLayer({
        textContentStream: this.#pdfPage.streamTextContent(),
        viewport: this.#pdfViewport,
        container: this.#$textLayer[0],
      });
      await Promise.all([renderTask.promise, textLayerRenderTask.promise]);
      this.#state = "rendered";
    }

    /**
     * Remove rendered elements, should be called either before rendering to
     * restore a clean state or when page view is not visible (not implemented)
     */
    clearRender() {
      this.#$textLayer.children().remove();
      this.#$canvas?.remove();
      this.#$canvas = null;
      this.#state = "hidden";
    }

    /** Cleanup resources used by the page view */
    cleanup() {
      this[Symbol.dispose]();
    }
    /** Cleanup resources used by the page view */
    [Symbol.dispose]() {
      this.#pdfPage.cleanup();
    }

    /**
     * Add an element on this page's element layer.
     *
     * @param {JQuery} element Element to add
     */
    addElement(element) {
      this.#$elementLayer.append(element);
    }

    /**
     * Get the bounding rectangle of the page display.
     *
     * This excludes margins.
     * @returns {DOMRect} The bounding rectangle relative to the browser's view position.
     */
    getBoundingClientRect() {
      return this.#$root[0].getBoundingClientRect();
    }
  }

  placerLib.PDFPageView = PDFPageView;
})(jQuery, Gofast);
