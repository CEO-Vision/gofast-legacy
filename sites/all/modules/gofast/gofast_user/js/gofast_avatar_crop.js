(function($, Drupal, Gofast) {
  'use strict';

  // Refresh user thumbnail when updating profile avatar.
  $(document).on('avatarChange', function(e, data) {
    var thumbnailUrl = data && data.thumbnailUrl;
    if (thumbnailUrl) {
      $('.user-picture[id|="' + data.uid + '"] img').attr('src', thumbnailUrl);
      $('.GofastUserProfile__picture img').attr('src', thumbnailUrl);
    }
    if (thumbnailUrl && Gofast.get("user").uid == data.uid) {
      $('.menu-profile.topbar-item img').attr('src', thumbnailUrl);
    }
  });


  Drupal.behaviors.avatar_crop = {
    attach: function(context, settings) {
      if ($('#gofast_crop_avatar').length) {
        $('#gofast_crop_avatar:not(.crop-processed)').addClass('crop-processed').each(function(e){
          $(document).trigger('crop');
        });
      } else {
        return;
      }

      var $image = document.getElementById('image');

      // Class definition
      var GofastCropper = Gofast.getGofastCropper();
      if($('#img-cropper').length){
        GofastCropper.init($image, Gofast.getGofastCropperSaveHandler);
      }
    }
  };
})(jQuery, Drupal, Gofast);
