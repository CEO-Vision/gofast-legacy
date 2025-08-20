(function ($, Gofast, Drupal) {
    
    'use strict';

    Drupal.behaviors.gofastPerfectScrollBarInit = {
        attach: function(context, settings){
            const thead = $("#gofastSpaceMembersTable > table > thead"); 
            const tbody = $("#gofastSpaceMembersTable > table > tbody");
            thead.scroll(function() {
            tbody.scrollLeft(thead.scrollLeft());
            });
            tbody.scroll(function() {
                thead.scrollLeft(tbody.scrollLeft());
            });
        }
    };

})(jQuery, Gofast, Drupal);

