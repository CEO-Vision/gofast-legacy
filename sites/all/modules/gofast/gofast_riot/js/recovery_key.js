(function ($, Drupal) {
  // Copy the recovery key to the clipboard.
  Drupal.behaviors.recoveryKeyCopy = {
    attach: function (context, settings) {
      $('.recovery-key-copy', context).once('recovery-key-copy').each(function() {
            var $copy = $(this);
            var $input = $copy.closest('.recovery-key-wrapper').find('.password-eye-input');
            // Synchronize the height with the input.
            $copy.css('height', $input.outerHeight() + 'px');
        }).on('click', function () {
        var $copy = $(this);
        var $input = $copy.closest('.recovery-key-wrapper').find('.password-eye-input');
        var value = $input.val();

        var onCopied = function () {
          var $icon = $copy.find('i');
          // Briefly show a confirmation icon.
          $icon.removeClass('fa-files-o').addClass('fa-check');
          setTimeout(function () {
            $icon.removeClass('fa-check').addClass('fa-files-o');
          }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(onCopied);
        } else {
          // Fallback for browsers without the Clipboard API.
          var wasPassword = $input.attr('type') === 'password';
          if (wasPassword) {
            $input.attr('type', 'text');
          }
          $input.select();
          document.execCommand('copy');
          if (wasPassword) {
            $input.attr('type', 'password');
          }
          onCopied();
        }
      });
    }
  };
})(jQuery, Drupal);
