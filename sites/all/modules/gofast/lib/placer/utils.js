((Gofast) => {
  // polyfill dispose symbol (upcoming well-known symbol)
  Symbol.dispose ??= Symbol("Symbol.dispose");

  /**
   * Utility to mark paths as unreachable in expressions and asserts it.
   */
  const unreachable = () => {
    throw new Error("Unreachable code reached, check control flow");
  };

  /**
   * Hide a DOM element using bootstrap classes with display flex
   * @param {JQuery} element Element to hide.
   */
  function hideBootstrapFlex(element) {
    $(element).removeClass("d-flex").addClass("d-none");
  }

  /**
   * Show a DOM element using bootstrap classes with display flex
   * @param {JQuery} element Element to show.
   */
  function showBootstrapFlex(element) {
    $(element).removeClass("d-none").addClass("d-flex");
  }

  // exports
  const placerLib = (Gofast.placerLib ??= {});

  placerLib.unreachable = unreachable;
  placerLib.hideBootstrapFlex = hideBootstrapFlex;
  placerLib.showBootstrapFlex = showBootstrapFlex;
})(Gofast);
