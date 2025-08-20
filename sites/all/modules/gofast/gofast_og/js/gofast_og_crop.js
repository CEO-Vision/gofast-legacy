(function ($, Drupal, Gofast) {
  "use strict";

  // Refresh user thumbnail when updating profile avatar.
  $(document).on('ogLogoChange', function(e, data) {
    if (data.src) {
      $("#gofast-og-home-space-logo").css("backgroundImage", "url(" + data.src + "?id=" + Math.random() * 1000 + ")");
    }
  });

  Drupal.behaviors.og_crop = {
    attach: function (context, settings) {
      if (
        !$("#gofast_crop_og_logo").length ||
        $("#gofast_crop_og_logo.crop-processed").length
      ) {
        return;
      }

      var $image = document.getElementById("image");

      // Class definition
      var GofastCropper = Gofast.getGofastCropper();
      if ($("#img-cropper").length) {
        $("#gofast_crop_og_logo").addClass("crop-processed");
        GofastCropper.init($image, Gofast.getGofastCropperSaveHandler);
      }
    },
  };
})(jQuery, Drupal, Gofast);
