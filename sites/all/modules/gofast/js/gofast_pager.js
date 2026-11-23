/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

jQuery.fn.pager = function (opts) {
  var $this = this;

  var defaults = {
    perPage: 10,
    showPrevNext: false,
    showFirstLast: true,
    hidePageNumbers: false,
    numPageToDisplay: 10,
    isFlex: false,
    childSelector: undefined,
    pagerSelector: '.pager',
    filterSelector: undefined,
  };

  var settings = jQuery.extend(defaults, opts);
  var listElement = $this;
  var pager = jQuery(settings.pagerSelector);

  function getItems() {
    var items = settings.childSelector
      ? listElement.find(settings.childSelector)
      : listElement.children();

    return items;
  }

  function getChildren() {
    var items = getItems();

    if (settings.filterSelector) {
      items = items.filter(settings.filterSelector);
    }

    return items;
  }

  function initPager() {
    var items = getItems();
    if (settings.isFlex) {
      items.removeClass("d-flex").addClass("d-none");
    } else {
      items.hide();
    }

    var children = getChildren();
    var numItems = children.length;
    var numPages = Math.ceil(numItems / settings.perPage);
    var nav_class = 'btn btn-icon btn-sm btn-light-primary mr-2 my-1';
    var nb_class = 'btn btn-icon btn-sm border-0 btn-hover-primary mr-2 my-1';

    pager.data("curr", 0).empty();

    if (numPages <= 1) {
      if (settings.isFlex) {
        children.removeClass("d-none").addClass("d-flex");
      } else {
        children.show();
      }
      return;
    }

    if (settings.showFirstLast) {
      pager.append('<li><a href="#" class="' + nav_class + ' first_link"><i class="fas fa-angle-double-left"></i></a></li>');
    }
    if (settings.showPrevNext) {
      pager.append('<li><a href="#" class="' + nav_class + ' prev_link"><i class="fas fa-angle-left"></i></a></li>');
    }

    for (var curr = 0; curr < numPages && !settings.hidePageNumbers; curr++) {
      pager.append('<li><a href="#" class="' + nb_class + ' page_link">' + (curr + 1) + '</a></li>');
    }

    if (settings.showPrevNext) {
      pager.append('<li><a href="#" class="' + nav_class + ' next_link"><i class="fas fa-angle-right"></i></a></li>');
    }
    if (settings.showFirstLast) {
      pager.append('<li><a href="#" class="' + nav_class + ' last_link"><i class="fas fa-angle-double-right"></i></a></li>');
    }

    pager.find('.page_link:first').addClass('active');
    pager.find('.prev_link, .first_link').parent().hide();

    displayPage(0);
  }

  function displayPage(page) {
    var children = getChildren();
    var numItems = children.length;
    var numPages = Math.ceil(numItems / settings.perPage);

    if (numItems === 0) {
      if (settings.isFlex) {
        children.removeClass("d-flex").addClass("d-none");
      } else {
        children.hide();
      }
      pager.hide();
      return;
    }

    pager.show();

    var startAt = page * settings.perPage;
    var endOn = startAt + settings.perPage;

    if (settings.isFlex) {
      children.removeClass("d-flex").addClass("d-none");
      children.slice(startAt, endOn).removeClass("d-none").addClass("d-flex");
    } else {
      children.hide().slice(startAt, endOn).show();
    }

    pager.data("curr", page);
    pager.find('.page_link').removeClass('active').eq(page).addClass('active');
    pager.find('.prev_link, .first_link').parent().toggle(page > 0);
    pager.find('.next_link, .last_link').parent().toggle(page < numPages - 1);
    movePageNumbers(page, numPages);
  }

  function movePageNumbers(currentPage, numPages) {
    var pageToDisplay = Math.min(settings.numPageToDisplay, numPages);
    var numSidePages = Math.floor(pageToDisplay / 2);
    var start, end;

    if (currentPage <= numSidePages) {
      start = 0;
      end = pageToDisplay;
    } else if (currentPage >= numPages - numSidePages - 1) {
      start = numPages - pageToDisplay;
      end = numPages;
    } else {
      start = currentPage - numSidePages;
      end = start + pageToDisplay;
    }

    pager.find('.page_link').hide().slice(start, end).show();
  }

  pager.off('click').on('click', '.page_link', function (e) {
    e.preventDefault();
    displayPage(parseInt(jQuery(this).text(), 10) - 1);
  });

  pager.on('click', '.prev_link', function (e) { e.preventDefault(); displayPage(pager.data("curr") - 1); });
  pager.on('click', '.next_link', function (e) { e.preventDefault(); displayPage(pager.data("curr") + 1); });
  pager.on('click', '.first_link', function (e) { e.preventDefault(); displayPage(0); });
  pager.on('click', '.last_link', function (e) { e.preventDefault(); displayPage(Math.ceil(getChildren().length / settings.perPage) - 1); });

  // Expose refresh method
  $this.get(0).refreshPager = initPager;

  // Initial load
  initPager();

  return this;
};
