/**
 * @typedef {object} DocumentCoordinates Position object relative to the document
 * @property {number} page Page in the document for this position.
 * @property {number} x X coordinate from top-left in PDF document coordinates
 * @property {number} y Y coordinate from top-left in PDF document coordinates
 */
/** @typedef {string} PlacerElementId Type of the identifier property on elements */
((Gofast) => {
  // define namespace
  const placerLib = (Gofast.placerLib ??= {});

  /**
   * Instance metadata of an element used in Placer. Stores common element data.
   */
  class PlacerElementInstance {

    /** @type {PlacerElementId} Unique identifier of the element. */
    id;
    /** @type {string} Current element type. */
    type;
    /** @type {DocumentCoordinates} Element position in the document */
    position;
    /** @type {JQuery} Root DOM element of the Placer wrapped in Jquery collection.*/
    root;
    /**
     * @type {Record<string,PlacerElement>} Mapping of types to state instances.
     * This is a mapping instead of a single property to hopefully allow a future
     * feature of switching an element type and being to switch back without
     * loosing configuration. (Switching currently not implemented)
     */
    states = Object.create(null);

    /**
     * Get the current element instance state object.
     * @returns {PlacerElement}
     */
    getCurrentState() {
      return this.states[this.type];
    }

    /**
     * Create and initialize a new placer element instance
     * @param {object} properties Instance properties
     * @param {PlacerElementId} properties.id Element unique ID.
     * @param {string} properties.type Element type.
     * @param {DocumentCoordinates} properties.position Element position.
     * @param {JQuery} properties.root Element root DOM element.
     */
    constructor({ id, type, position, root }) {
      this.id = id;
      this.type = type;
      this.position = position;
      this.root = root;
    }
  }

  // exports
  placerLib.PlacerElementInstance = PlacerElementInstance;
})(Gofast);
