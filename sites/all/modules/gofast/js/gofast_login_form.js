(function ($) {
  const $form = $("form#user-login-form");
  // add fragment to form action so that it is kept after the submission redirect
  $form.attr("action", $form.attr("action") + window.location.hash);
})(jQuery);
