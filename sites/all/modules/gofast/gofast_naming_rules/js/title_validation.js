/**
 * @file
 * 
 * Check wether when the field of a naming rule 
 * is modified if it will produce an invalid title.
 *
 * If so display a toast message explaining which field
 * and which characters are invalid.
 * 
 * Allow the modification of the field but block
 * the application of the naming rule.
 */
(function ($, Gofast, Drupal) {
    Gofast = Gofast || {};
    Gofast.hooks = Gofast.hooks || {};
    Gofast.hooks.beforePostMetadata = Gofast.hooks.beforePostMetadata || [];

    Gofast.hooks.beforePostMetadata.push(async function (elem, value) {
        const field_name = elem.attr("name");
        // Category/state already have their own confirmation modal (hooks.js).
        if (["field_category", "field_state"].includes(field_name)) {
            return true;
        }
        const nid = elem.attr("data-id");
        // Whether this change would trigger an invalid rule title.
        let resp = await $.post("/taxonomy/naming_rules/validate_pending_title", {
            nid,
            field: field_name,
            value: value || elem.val(),
        });
        if (resp) {
            if (resp.error) {
                // Keep the field change, only warn that the naming rule won't apply.
                Gofast.toast(resp.error, "error");
                return true;
            }
        }
        return true;
    });
})(jQuery, Gofast, Drupal);
