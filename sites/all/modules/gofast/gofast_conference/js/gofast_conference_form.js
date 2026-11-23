/**
 * @file
 * JS script used by the conference node form. It makes the "customize" option
 * of the recurrence input open the advanced configuration modal and manages
 * that modal form.
 */

(($, Drupal) => {
  /**
   * Selector string for the recurrence advanced configuration modal form element.
   */
  const recurrenceFormSelector = "form#gofast-conference-event-recurrence-form";

  /**
   * Setup code for an individual select element requiring the recurrence input
   * behavior.
   * @param {JQuery<HTMLSelectElement>} $recurrenceSelect The select element on
   *  which a select2 component has been instantiated wrapped in a JQuery object.
   */
  function initRecurrenceInput($recurrenceSelect) {
    let lastSelectedOption = $recurrenceSelect.select2("data")[0].id;
    let $customOption = $recurrenceSelect.find(
      'option:not([value="FREQ=YEARLY"]):has(+ option[value="customize"])',
    );
    const $customizeOption = $recurrenceSelect.find('option[value="customize"]');

    /**
     * Submit event listener.
     * @this {HTMLFormElement} The recurrence form element.
     * @param {RecurrenceFormEvent<{recurrenceRule: string}>} event
     */
    function onRecurrenceFormSubmit(event) {
      const rule = event.detail.recurrenceRule;
      const $defaultOption = $recurrenceSelect.find('option[value="' + rule + '"]');

      // all paths from here should lead to the most appropriate option being selected
      lastSelectedOption = rule;

      if ($defaultOption.exists()) {
        $recurrenceSelect.val(rule).trigger("change");
        return;
      }

      if (!$customOption.exists()) {
        $customOption = $("<option></option>");
        $customOption.insertBefore($customizeOption);
      }

      $customOption
        .attr("value", rule)
        .text(Drupal.t("Custom", {}, { context: "gofast:gofast_conference" }));

      $recurrenceSelect.val(rule).trigger("change");
    }

    /**
     * Cancel event listener.
     * @this {HTMLFormElement} The recurrence form element.
     * @param {RecurrenceFormEvent<{}>} _event The cancel event.
     */
    function onRecurrenceFormCancel(_event) {
      $recurrenceSelect.val(lastSelectedOption).trigger("change");
    }

    /** Target element of recurrence form events */
    const $recurrenceFormEventTarget = $(document);

    /**
     * Detach event listeners of recurrence
     * @param {RecurrenceFormEvent<{}|{recurrenceRule: string}>} _event The form event.
     */
    const detachRecurrenceFormListeners = function (_event) {
      $recurrenceFormEventTarget.off("gofast:recurrence_form_submit", onRecurrenceFormSubmit);
      $recurrenceFormEventTarget.off("gofast:recurrence_form_cancel", onRecurrenceFormCancel);
    };

    /**
     * Adds event listeners on the recurrence form.
     */
    const attachRecurrenceFormListeners = () => {
      $recurrenceFormEventTarget.one("gofast:recurrence_form_submit", onRecurrenceFormSubmit);
      $recurrenceFormEventTarget.one("gofast:recurrence_form_cancel", onRecurrenceFormCancel);

      // remove event listeners of form after any of the two chosen events to
      // make sure only one of the two listeners is ever called
      $recurrenceFormEventTarget.one(
        "gofast:recurrence_form_submit",
        detachRecurrenceFormListeners,
      );
      $recurrenceFormEventTarget.one(
        "gofast:recurrence_form_cancel",
        detachRecurrenceFormListeners,
      );
    };

    const onCustomizeSelect = () => {
      let modalUrl = "/modal/nojs/recurrence";

      // if an option other than never is selected, add it as initial value for
      // the configuration form
      if (lastSelectedOption !== "never") {
        modalUrl += "?initial_recurrence=" + encodeURIComponent(lastSelectedOption);
      }
      Drupal.CTools.Modal.showCtoolsModal(modalUrl, "javascript:;");
      attachRecurrenceFormListeners();
    };

    // add change handler to keep track of selected value and know when
    // customize is selected
    $recurrenceSelect.on("select2:select", function (e) {
      const selected = e.params.data;
      if (selected.id === "customize") {
        onCustomizeSelect();
      } else {
        lastSelectedOption = selected.id;
      }
    });
  }

  /**
   * Alias for what to expect of an event from the advanced recurrence
   *  configuration form
   * @template [T=never]
   * @typedef {{type: string, detail: T}} RecurrenceFormEvent
   */

  /**
   * Setup the necessary client-side behaviors to handle the recurrence modal
   * form.
   * @param {JQuery<HTMLFormElement>} $recurrenceForm The modal's form element
   *  wrapped in a JQuery object
   */
  function initModalRecurrenceForm($recurrenceForm) {
    // for some reason the behavior is called before the modal is fully
    // initialized, we need to delay configuring the on blur closing behavior.
    // EDIT: Actually, a closeOnBlur(true) call is hardcoded after calling attachBehaviors
    setTimeout(() => Drupal.CTools.Modal.closeOnBlur(false), 100);

    const $cancelButton = $recurrenceForm.find("#recurrence-form-cancel");

    /**
     * @param {string} recurrenceRule The recurrence rule ICS string
     * @returns {RecurrenceFormEvent<{recurrenceRule:string}>} a custom event
     *  configured for the custom recurrence submit event
     */
    const makeSubmitEvent = (recurrenceRule) => ({
      type: "gofast:recurrence_form_submit",
      detail: {
        recurrenceRule,
      },
    });

    /**
     * @returns {RecurrenceFormEvent<{}>} A custom event configured for the custom
     *  recurrence cancel event
     */
    const makeCancelEvent = () => ({ type: "gofast:recurrence_form_cancel", detail: {} });

    const onSubmit = function (_e, { ruleString }) {
      $(document).trigger(makeSubmitEvent(ruleString));
      Drupal.CTools.Modal.dismiss();
    };

    const onCancel = function (e) {
      e.preventDefault();

      $(document).trigger(makeCancelEvent());
      Drupal.CTools.Modal.dismiss();
    };

    const $dialog = $recurrenceForm.parents(".modal").first();
    const $cancelClickableElements = $([
      ...$cancelButton,
      ...$dialog.find('button.close[data-dismiss="modal"]'),
    ]);

    $cancelClickableElements.on("click", function cancelHandler() {
      $cancelClickableElements.off("click", cancelHandler);
      onCancel.apply(this, arguments);
    });

    $recurrenceForm.one("gofast:submit_success", onSubmit);
  }

  // #region --------------- DRUPAL BEHAVIORS ---------------

  Drupal.behaviors.recurrenceInput = {
    attach: function () {
      // Additional class selector filters inputs that have select2 initialised
      // on them. We'll wait for the select2 initialization to happen before our own.
      const $recurrenceSelect = $("#edit-recurrence.select2-hidden-accessible");
      $recurrenceSelect.once("recurrence-input", function () {
        initRecurrenceInput($recurrenceSelect);
      });
    },
  };

  Drupal.behaviors.recurrenceModalForm = {
    attach: function (context) {
      const $recurrenceForm = $(context).find(recurrenceFormSelector);

      $recurrenceForm.once("recurrence-form", function () {
        initModalRecurrenceForm($recurrenceForm);
      });
    },
  };
  // #endregion
})(jQuery, Drupal);
