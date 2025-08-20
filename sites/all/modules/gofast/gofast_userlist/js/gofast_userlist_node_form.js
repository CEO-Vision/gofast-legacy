/**
 * @file Client-side behavior associated with creating/editing a user list node.
 *
 * Currently controls whether the member list is editable depending on the
 * synchronization behavior of the user list, that is, the member list is
 * editable if and only if the list is not synchronized with an external source.
 */

(function ($, Drupal) {
  /**
   * Lazily get the current instance of tagify for the member list of a user list
   * @returns {Tagify|null}
   */
  const getMemberListTagify = () => window.tagify?.["ac-list-tags-userlist-members"];

  /**
   * Get the message span of the member list input.
   * @returns {JQuery<HTMLSpanElement>|null}
   */
  const getMemberListMessageElement = () => {
    const $memberInputParent = $("#edit-field-userlist-members").parent();
    return $memberInputParent.find(".gofast-field-message");
  };

  /**
   * Record object to keep track of the values of each input
   * @type {Record<string, boolean|undefined>}
   */
  const syncInputState = {};

  /**
   * Function called after any input state changed, updates the UI depending on
   * state.
   * @param {typeof syncInputState} state The new state value.
   */
  const onStateUpdate = (state) => {
    // any sync checkbox checked ?
    const shouldMemberListBeReadonly = Object.values(state).some((value) => value);
    // make member input readonly
    getMemberListTagify()?.setReadonly(shouldMemberListBeReadonly);

    // update input information message's visibility
    const $messageElement = getMemberListMessageElement();
    if (shouldMemberListBeReadonly) {
      $messageElement.removeClass("invisible");
    } else {
      $messageElement.addClass("invisible");
    }
  };

  /**
   * Makes an event listener function for change events that keeps track of the
   * `checked` value using {@linkcode syncInputState} and then calls
   * {@linkcode onStateUpdate}.
   * @param {string} inputName The name of the corresponding input,
   *  used to index input state
   * @returns {(this: HTMLInputElement, ev: InputEvent) => void}
   */
  const makeSyncChangeListener = (inputName) =>
    function () {
      // store value in state
      syncInputState[inputName] = $(this).prop('checked');
      onStateUpdate(syncInputState);
    };

  /**
   * @param {JQuery<HTMLInputElement>} $input The input DOM element, does nothing if
   *  value is `null`
   * @param {string} inputName The name of the input in input state.
   */
  const applySyncChangeListener = ($input, inputName) => {
    if (!$input.exists()) return;

    // store current checked state
    syncInputState[inputName] = $input.prop('checked');
    $input.on("change", makeSyncChangeListener(inputName));
    onStateUpdate(syncInputState);
  };

  // ---------------------------- Drupal Behaviors -----------------------------
  Drupal.behaviors.userListNodeFormObserveSyncStatus = {
    attach: function () {
      /**
       * list of inputs to listen to for sync state
       * @type {{selector: string, inputName: string}[]}
       */
      const syncInputs = [
        {
          selector: "#edit-field-is-gofast-sync input",
          inputName: "isGofastSync",
        },
        {
          selector: "#edit-field-is-ldap-sync input",
          inputName: "isLDAPSync",
        },
      ];

      for (const { selector, inputName } of syncInputs) {
        /** @type {JQuery<HTMLInputElement>} */
        const $inputElement = $(selector);
        applySyncChangeListener($inputElement, inputName);
      }
    },
  };
})(jQuery, Drupal);
