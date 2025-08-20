
(function ($) {
  "use strict";
  
  /**
   * Applies the soft limit to facets in the block realm.
   *  Support hierarchized facets as well.
   * 
   * @see facetapi/facetapi.js
   */
  Drupal.facetapi.applyLimit = function(settings) {
    if (settings.limit > 0 && !$('ul#' + settings.id).hasClass('facetapi-processed')) {
      // Only process this code once per page load.
      $('ul#' + settings.id).addClass('facetapi-processed');

      // Ensures our limit is zero-based, hides facets over the limit.
      var limit = settings.limit - 1;
      $('ul#' + settings.id).children('li:gt(' + limit + ')').hide();

      // Adds "Show more" / "Show fewer" links as appropriate.
      $('ul#' + settings.id).filter(function() {
        return $(this).children('li').length > settings.limit;
      }).each(function() {
        $('<a href="#" class="facetapi-limit-link"></a>').text(Drupal.t(settings.showMoreText, {}, {'context' : 'gofast'})).click(function() {
          if ($(this).siblings().children('li:hidden').length > 0) {
            $(this).siblings().children('li:gt(' + limit + ')').slideDown();
            $(this).addClass('open').text(Drupal.t(settings.showFewerText, {}, {'context' : 'gofast'}));
          }
          else {
            $(this).siblings().children('li:gt(' + limit + ')').slideUp();
            $(this).removeClass('open').text(Drupal.t(settings.showMoreText, {}, {'context' : 'gofast'}));
          }
          return false;
        }).appendTo($(this));
      });
    }
  };
  
  // This strange little function allows the "expanded" class to be added to or
  // removed from the passed in facet based on the passed in condition, which
  // corresponds to a configured setting.
  var facetCollapseExpanded = function ($facet, condition, operation, behavior) {
    var wrapper = $facet.closest('ul.facetapi-collapsible').get(0);

    if (wrapper) {
      var facetId = $(wrapper).data("field-alias")

      if (Drupal.settings.gofast_search[facetId]) {
        // We either need to check that the 'condition' in Drupal.settings DOES
        // hold for the given facet's configuration, or that it DOES NOT hold. 
        // Only add or remove the class if the condition has been satisfied.
        if (Drupal.settings.gofast_search[facetId][condition] === operation) {
          // behavior is either "addClass" or "removeClass"
          $facet[behavior]('expanded');
          $facet.find("ul")[behavior]('expanded');
        }
      }
    }
  };
  
  var facetSaveState = function (state) {
    $.cookie(
      'Facetapi.collapsible.expanded',
      JSON.stringify(state), {
        path: Drupal.settings.basePath,
        expires: 1,
        secure: true,
      }
    );
  }

  /**
   * Behavior for collapsing faceted search lists.
   */
  Drupal.behaviors.facetapiCollapsible = {
    attach : function (context) {
      // Check cookie
      var state = $.parseJSON($.cookie('Facetapi.collapsible.expanded')) || {};
      
      $('.facetapi-collapsible').once('facetapi-collapsible', function () {
        var $facet = $(this);
        $facet.addClass("navi");

        // triggering bootstrap-keen classes to actually hide the inactive collapsible lists
        for (const activeFacetsList of document.querySelectorAll('.facetapi-active ~ ul')) {
          activeFacetsList.classList.remove("collapse");
        }

        // we display the navi-link slightly differently if there is a "close filter" button next to it
        for (const activeBullet of document.querySelectorAll('.facetapi-active > .navi-bullet')) {
          activeBullet.remove();
        }

        // Add the 'expanded' class to the facet if configured to do so.
        facetCollapseExpanded($facet, 'expand', 1, 'addClass');

        if ($('.facetapi-active', this).size() > 0) {
          $(this).addClass('expanded active').removeClass('collapse');
          // we don't forget to open the accordion if a facet is expanded
          const $cardTitle = $(this).closest(".card").find(".card-title");
          if ($cardTitle.hasClass('collapsed')) {
            $cardTitle.click();
            this.scrollIntoView({behavior: "smooth", block: "end"});
          }
        }
        else {
          var wrapper = $('facetapi-collapsible ul.facetapi-collapsible', $facet).get(0),
              facetId;
          
          if (wrapper) {
            facetId = $(wrapper).data("field-alias")
            state[facetId] = state[facetId] || [];
            if (state[facetId].indexOf('expanded') !== -1) {
              $facet.addClass('expanded');
            }
          }

          // Expand/Collapse facet block on click.
          $('h2', $facet).click(function () {
            $facet.siblings('.facetapi-collapsible:not(.active)').each(function () {
              // Remove the 'expanded' class from all other facets that haven't
              // been configured to stay open.
              facetCollapseExpanded($(this), 'keep_open', 0, 'removeClass');
            });

            wrapper && $(wrapper).slideToggle(300, 'swing', function() {
              $facet.toggleClass('expanded');
              if (wrapper && facetId) {
                var blockState = $facet.hasClass('expanded') ? 'expanded' : 'collapsed';
                state[facetId] = Gofast.apply(state[facetId] || [], [blockState]);
                facetSaveState(state);
              }              
            });
          });
        }
        
        $('.facetapi-collapsible ul.facetapi-collapsible ul').once('facetlist', function () {
          var $list = $(this);
          var $parentwrapper = $list.closest('ul.facetapi-collapsible');

          if ($parentwrapper) {
            var parentfacetId = $parentwrapper.attr('data-field-alias');
            
            if (Drupal.settings.gofast_search[parentfacetId] && Drupal.settings.gofast_search[parentfacetId].collapsible_children) {
              var $parentfacet = $($list.siblings('.facetapi-facet').get(0));

              // Expand facet with active childs.
              if ($('a.facetapi-active', $list).length) {
                $('ul', $list.closest('div')).first().addClass('expanded');
              }

              // Collapse/Expand on click
              $('a .navi-bullet', $parentfacet).click(function (event) {
                event.preventDefault()
                event.stopImmediatePropagation()
                var $clickedlist = $parentfacet.siblings('ul'),
                    $clickedlink = $(this).closest('a');
                
                state[parentfacetId] = state[parentfacetId] || [];
                if($clickedlist.hasClass("expanded")){
                  $clickedlink.find(".navi-bullet > i").removeClass().addClass("fas fa-sm fa-plus")
                  $clickedlist.add($clickedlist.closest('li')).removeClass('expanded'); //
                  $clickedlist.slideUp(300, 'swing')
                } else {
                  $clickedlink.find(".navi-bullet > i").removeClass().addClass("bullet")
                  $clickedlist.add($clickedlist.closest('li')).addClass('expanded'); //
                  $clickedlist.slideDown(300, 'swing')
                }
                
                facetSaveState(state);
                event.preventDefault();
              });
            }
          }
        });
        
      });
    }
  };
})(jQuery);