((Drupal, $) => {
  const hiddenClass = "fa-eye-slash";
  const shownClass = "fa-eye";

  /**
   * Applies the DOM changes necessary when changing/setting the hidden value of
   * a show-able password element.
   *
   * @param {boolean} isHidden If the input text should be hidden.
   * @param {JQuery<HTMLElement>} $eyeIcon Icon element of which the CSS icon classes will be changed.
   * @param {JQuery<HTMLInputElement>} $input Input element to change the type of to show/hide its value.
   */
  const applyHiddenDOMChanges = (isHidden, $eyeIcon, $input) => {
    if (isHidden) {
      $eyeIcon.removeClass(shownClass).addClass(hiddenClass);
      $input.attr("type", "password");
    } else {
      $eyeIcon.removeClass(hiddenClass).addClass(shownClass);
      $input.attr("type", "text");
    }
  };

  /**
   * Behavior to process password inputs on the page that have an eye button to
   * control if it shows or hides its contents
   */
  Drupal.behaviors.processPasswordEyeElements = {
    attach: function (context, _settings) {
      const $inputs = $(context).find(".password-eye:not(.processed)");

      $inputs.each(function () {
        const $inputGroup = $(this);
        // Mark input as processed.
        $inputGroup.addClass("processed");

        const $input = $inputGroup.find("input.password-eye-input");
        const $eyeButton = $inputGroup.find(".password-eye-btn");
        const $eyeIcon = $eyeButton.find("i");

        const showAttribute = $input.attr("data-show");
        // Make hidden state start as the value of show attribute, which is
        // true if it is '0', 'false' or empty, and true otherwise (attribute is
        // 'show', state is 'hidden' so the value of the attribute is inverted).
        // If the attribute is not set, default to true.
        let isHidden = showAttribute != null ? ["0", "", "false"].includes(showAttribute) : true;
        // Add eye button click listener
        $eyeButton.on("click", (e) => {
          // prevent submitting/redirecting just in case
          e.preventDefault();
          // Toggle
          isHidden = !isHidden;
          // Apply DOM Changes
          applyHiddenDOMChanges(isHidden, $eyeIcon, $input);
        });

        // Ensure the input DOM is in the correct state.
        applyHiddenDOMChanges(isHidden, $eyeIcon, $input);
      });
    },
  };
})(Drupal, jQuery);
