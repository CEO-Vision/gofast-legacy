/**
 * @file
 * Extensions to the Drupal states library
 */

(function ($) {
  /**
   * Allow setting the `readonly` attribute using states.
   *
   * Adapted from https://git.drupalcode.org/project/drupal/-/merge_requests/3692/diffs?commit_id=7f18f7f4e72df2503829354c7aa30a35b3c08b17
   */
  $(document).bind("state:readonly", function (e) {
    if (!e.trigger) return;

    $(e.target)
      .closest(".form-item, .form-submit, .form-wrapper")
      .toggleClass("form-readonly", e.value)
      .find("input, textarea")
      .prop("readonly", e.value);
  });
})(jQuery);
