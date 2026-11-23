<div id="webform-browser">
  <div
    class="spinner spinner-track spinner-primary d-inline-flex gofast-spinner-xxl position-absolute"
    style="top: calc(50% - 6em); left: calc(50% - 4em);"
  >
  </div>
</div>

<script>
  (($, Gofast, Drupal) => {
    // Initialisation function for webform browser.
    const init = () => Gofast.sideFileBrowser.initFileBrowser("webform-browser");

    $(() => {
      const $webformNavLink = $('.nav-link[href="#navWebforms"]');
      // In case the tab is not initially shown. Might also make the webform
      // hierarchy refresh each time the tab is selected.
      $webformNavLink.on("shown.bs.tab", () => {
        init();
      });

      // If the tab is initially shown, initialise immediately.
      if ($webformNavLink.hasClass('active')) {
        init();
      }
    })
  })(jQuery, Gofast, Drupal)
</script>
