(function ($, Drupal, Gofast) {
    "use strict";
  
    // Refresh user thumbnail when updating profile avatar.
    $(document).on('kanbanLogoChange', function(e, data) {
      if (data.src) {
        $("#gofastKanbanTaskLogo").css("backgroundImage", "url(" + data.src + "?id=" + Math.random() * 1000 + ")");
      }
    });
  
    Drupal.behaviors.kanban_crop = {
      attach: function (context, settings) {
        if (!$("#gofastKanbanTaskLogo").length) {
          return;
        }
  
        var $image = document.getElementById("image");
  
        // Class definition
        var GofastCropper = Gofast.getGofastCropper();
        if ($("#img-cropper").length) {
          GofastCropper.init($image, Gofast.getGofastCropperSaveHandler);
        }
      },
    };
  })(jQuery, Drupal, Gofast);
  