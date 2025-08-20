/**
 * @typedef {object} AABoundingRect Axis-Aligned Bounding Rectangle.
 * @property {number} x Position/offset along the x axis (left-right).
 * @property {number} y Position/offset along the y axis (top-down).
 * @property {number} width Width of the rectangle.
 * @property {number} height Height of the rectangle.
 */
(($, Gofast) => {
  // define namespace
  const placerLib = (Gofast.placerLib ??= {});

  /**
   * @abstract
   * Abstract class extended by placable elements, defines methods used by placer
   * to interact with the element.
   *
   * Communication with the placer widget is done through custom events.
   */
  class PlacerElement {
    /** @type {{element:JQuery,event:string,listener:Function}[]} */
    _listeners = [];

    /**
     * Compute the element's bounding box in document space.
     * @abstract
     * @returns {AABoundingRect}
     */
    getBoundingRect() {
      throw new Error("Method not implemented by called class");
    }

    /**
     * Detaches the element from the DOM.
     *
     * Removes event listeners.
     */
    detach() {
      this._listeners.forEach(({ element, event, listener }) => element.off(event, listener));
    }

    /**
     * Attach an element to the DOM, handles creating UI DOM elements and
     * attaching event listeners.
     * @abstract
     * @param {JQuery} root
     * @param {object} [options]
     * @param {number} [options.scale]
     */
    attach(root, options = {}) {
      throw new Error("Method not implemented by called class");
    }

    /**
     * Add a managed event listener that will be automatically removed when
     * detaching the element.
     *
     * @param {JQuery|string|HTMLElement} element Element to attach the event on.
     * @param {string} event Event name.
     * @param {Function} listener Listener function.
     */
    _addEventListener(element, event, listener) {
      const $element = $(element);
      this._listeners.push({ element: $element, event, listener });
      $element.on(event, listener);
    }

    /** Standard listener for root element resizing called by Placer widget */
    onRootResize(_e) {}
    /** Standard listener for root element resizing start called by Placer widget */
    onRootResizeStart(_e) {}
    /** Standard listener for root element resizing end called by Placer widget */
    onRootResizeStop(_e) {}
    /** Standard listener for root element move (position change) called by Placer widget */
    onRootMove(_e) {}

    /**
     * Convert the current instance into a plain object of properties that is
     * easily serializable.
     * @returns {unknown}
     */
    asPropertiesObject() {
      return {};
    }
  }

  // exports
  placerLib.PlacerElement = PlacerElement;
})(jQuery, Gofast);
