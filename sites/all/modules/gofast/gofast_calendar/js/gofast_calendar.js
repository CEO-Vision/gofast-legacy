/* global Gofast, Drupal */

(function ($, Gofast, Drupal) {
  'use strict';
  Gofast.calendar = {

    initCalendar: function() {
      if(!$("#kt_calendar").length || $("#kt_calendar").hasClass("calendar-processed")){
        return;
      }
      $("#kt_calendar").addClass("calendar-processed");
      var KTCalendarBasic = function () {

        let initPopover = function(el, event) {
          el.data('placement', 'top');
          el.data('content', getPopOverContent(event))
          el.data('html', true)
          el.attr('title', event.title)
          var skin = el.data('skin') ? 'popover-' + el.data('skin') : '';
          var triggerValue = el.data('trigger') ? el.data('trigger') : 'hover';
          const { user, isRecurrent, humanReadableRecurrence, spaces } = event.extendedProps;

          const attributionMessage = user.assigned_to ? Drupal.t('Assigned to') : Drupal.t('Created by');
          const spacesMessage = Drupal.t('Space(s)', {}, {context: 'gofast:gofast_calendar'});
          const spaceList = $('<ul class="m-0 pl-4">');
          if(spaces){
            spaces.forEach((space_title) => {
              spaceList.append(`<li>${space_title}</li>`)
            })
          }

          el.popover({
            trigger: triggerValue,
            template: `
            <div class="popover ${skin} p-0" role="tooltip">
              <div class="arrow"></div>
              <div class="d-flex align-items-baseline">
                <div class="popover-header p-2 text-truncate flex-grow-1"></div>
              </div>
              <div class="popover-body p-2"></div>
              ${
                isRecurrent
                  ? `<div class="gf-recurrence-hr ml-2">
                      <i class="far fa-repeat mr-2"></i> ${Drupal.t(
                        "Repeats @pattern",
                        { "@pattern": humanReadableRecurrence },
                        { context: "gofast:gofast_conference" },
                      )}
                    </div>`
                  : ""
              }
              <div class="popover-footer d-flex p-2 d-flex font-size-sm d-flex flex-column">
                <div class="d-flex">
                  <span class="text-muted mr-4">${attributionMessage}:</span>
                  <div class="d-flex">
                    <div class="symbol symbol-circle symbol-20 mr-2 d-flex align-items-center">
                      <img alt="Pic" style="max-width: 15px; height: 15px;" src="${user.picture}"/>
                    </div>
                    <div class="text-muted">${user.firstname} ${user.lastname}</div>
                  </div>
                </div>
                <div class="d-flex pt-2">
                  <span class="text-muted mr-4">${spacesMessage}:</span>
                  ${spaceList[0].outerHTML}
                </div>
              </div>
            </div>
            `,
          });
        }

        let getPopOverContent = (event) => {
            const defaultDescription = Drupal.t("No description");
            switch(event.extendedProps.type){
                case 'conference':
                case 'task':
                case 'kanban_todo':
                    return event.extendedProps.description.und ? event.extendedProps.description.und[0].value : defaultDescription;
                default:
                    return event.extendedProps.tooltip_description ?? defaultDescription;
            }
        }

        /**
         * Object that maps gofast locales to their calendar options
         * @satisfies {Record<string, {localeCode: string, firstDay: number}>}
         */
        const localeOptionsMap = {
          en: {
            localeCode: "en-gb", // map base english locale to UK English
            firstDay: 1, // start week on Monday
          },
          fr: {
            localeCode: "fr",
            firstDay: 1, // start week on Monday
          },
        };

        const getLocaleOptions = (locale) => {
          if (locale in localeOptionsMap) {
            return localeOptionsMap[locale];
          }
          return localeOptionsMap["en"];
        };

        return {
          //main function to initiate the module
          init: function () {
            var User = Gofast.get("user");
            const userLanguage = User.language;
            
            if (Gofast._settings.gofast_bluemind_is_feature_active && Gofast._settings.gofast_bluemind_is_feature_active_for_user) {
              const lastSyncTimestamp = Gofast._settings.gofast_bluemind_user_last_sync;
              var lastSyncTitle = Drupal.t('Not yet synced', {}, { context: 'gofast:gofast_calendar' });
              if (lastSyncTimestamp) {
                var lastSyncDate = new Date(lastSyncTimestamp * 1000); // JavaScript uses milliseconds
                var dateString = lastSyncDate.toLocaleString(); // Convert to a string in the local date and time format
                lastSyncTitle = Drupal.t('Last sync was on @last_sync', { '@last_sync': dateString }, { context: 'gofast:gofast_calendar' });
              }
            }
            var calendarEl = document.getElementById('kt_calendar');
            var customButtons  =  {
              importCalendar: {
                text: '',
                icon: " fa fa-download",
                click: function (e) {
                  // get the current space id and pass it in the url params for the bluemind module / conference creation
                  const spaceId = $("#kt_calendar").attr("data-id");
                  e.stopPropagation();
                  Drupal.CTools.Modal.showCtoolsModal(`/modal/nojs/calendar/add_calendar?spaceId=${spaceId}`); // Use the stored reference
                }
              }
            }
            if (Gofast.get("node").type == "private_space") {
              customButtons.syncCalendar = {
                text: '',
                icon: " fa fa-sync", 
                click: function (){
                  const isBluemindFeatureActive = Gofast._settings.gofast_bluemind_is_feature_active;
                  const isFeatureActiveForUser = Gofast._settings.gofast_bluemind_is_feature_active_for_user;
                  if (!isBluemindFeatureActive || !isFeatureActiveForUser) {
                    return;
                  }
                  $(".fc-syncCalendar-button span").addClass('fa-spin');// add the spinning wheel class
                  $.ajax({
                    type: "POST",
                    url: window.origin + "/calendar/synchronize",
                    data: { nid: calendarEl.dataset.id },
                    async: false,
                    success: function (data) {
                      if(data.success){
                        Gofast.toast(Drupal.t("Calendar Synchronization started successfully", {}, { context: 'gofast:gofast_calendar' }), "info");
                        Gofast.getLastSyncDate(Gofast.calendar.setLastSync)
                      } else {
                        Gofast.toast(Drupal.t("Calendar Synchronization is not enabled on your account", {}, { context: 'gofast:gofast_calendar' }), "warning");
                      }
                    },
                    dataType: 'json'
                  });
                  setTimeout(
                    ()=> {
                      $('.fc-syncCalendar-button').blur()
                      $(".fc-syncCalendar-button span").removeClass('fa-spin')
                      Gofast.calendar.calInstance.refetchEvents()
                    }, 2000
                  )
                }
              };
            }
            var buttonText = {
              today:    Drupal.t('today'),
              month:    Drupal.t('month'),
              week:     Drupal.t('week'),
              day:      Drupal.t('day'),
              list:     Drupal.t('list'),
            }
            
            var header = {
              left: 'prev,next today ',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }

            header.left = header.left + ' syncCalendar';
            header.left = header.left + ' importCalendar';

            Gofast.calendar.calInstance = new FullCalendar.Calendar(calendarEl, {
              buttonText : buttonText,
              customButtons: customButtons,
              eventLimit: 3, // Limit the number of events in all-day row and in month view to 2 before showing "+x more" button. (need to put +1 to the event limit because it take "+x more" button in the limit)

              header: header,
              height: 'parent',
              aspectRatio: 3, // see: https://fullcalendar.io/docs/aspectRatio

              nowIndicator: true,
              now: Date.now(), // just for demo
              scrollTime: '08:00:00',
              slotMinTime:'08:00:00',
              defaultView: 'timeGridWeek',
              allDayText: Drupal.t('all-day'),

              // locale-dependent options
              locale: getLocaleOptions(userLanguage).localeCode,
              firstDay: getLocaleOptions(userLanguage).firstDay,

              plugins: ['bootstrap', 'interaction', 'dayGrid', 'timeGrid', 'list','locales'],
              isRTL: KTUtil.isRTL(),

              buttonIcons: {
                refreshCalendar: 'refresh', 
              },

              editable: false,
              navLinks: true,
              events: function(fetchInfo, successCallback, failureCallback) {
                Gofast.getCalendarEvents(fetchInfo, calendarEl.dataset.id, successCallback, failureCallback);
              },
              eventSourceSuccess: function(content, xhr) {
                  Gofast.calendar.setToolbarEventsBadge(content);
              },
              eventRender: function(info) {

                let element = $(info.el);
                let content = element.find('.fc-content')
                
                content.addClass('p-2')
                content.find('.fc-time').hide()
                element.find('.fc-title').addClass('font-weight-bolder');
                element.attr('href', '/node/' + info.event.extendedProps.nid);

                if(info.event.extendedProps && info.event.extendedProps.type){
                    // transform title element into flex row
                    const titleRowContainer = element.find('.fc-title');
                    titleRowContainer.addClass(['d-flex', 'align-items-baseline']);
                    // move text content into element that expands to take as
                    // much space as possible, pushing elements after to algin
                    // with the right of the event box
                    const title = titleRowContainer.text();
                    const titleContainer = $('<span class="flex-fill text-truncate"></span>').text(title);
                    titleRowContainer.text('').append(titleContainer);

                    let icon = "";
                    if(info.event.extendedProps.type == 'conference'){
                        let start = new Date(info.event.start)
                        let end = new Date(info.event.end)
                        let startHour = start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                        let endHour = end.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                        // An all-day event has no end: show the all-day label instead of hours.
                        let hours = info.event.allDay ? Drupal.t('all-day') : startHour + " - " + endHour;
                        let el = "<div class=\"text-dark-50 mt-1 font-weight-bold\">" + hours + "</div>";
                        element.find('.fc-content').append(el);
                        icon = '<i class="'+info.event.extendedProps.icon+' icon-nm mr-2"></i>'
                        if(info.event.extendedProps.color){ 
                          //element.css('border', '2px solid '+info.event.extendedProps.color); 
                        } 
                    } else if (info.event.extendedProps.icon) {
                      icon = '<i class="'+info.event.extendedProps.icon+' icon-nm mr-2"></i>'
                    } else {
                      icon = '<i class="far fa-file icon-nm mr-2"></i>'
                    }
                    element.find('.fc-title').prepend(icon);

                    // Add recurrence icon
                    if (info.event.extendedProps.isRecurrent) {
                      element.find('.fc-title').append('<i class="far fa-repeat icon-nm ml-2"></i>');
                    }

                    if (info.event.extendedProps.task_details) {
                      element.find('.fc-title').prepend("<div class=\"fc-state mb-2\"></div>");
                      element.find('.fc-state').append('<span class="text-wrap h-100 label label-sm label-outline-' + info.event.extendedProps.task_details.localized_state_indicator + ' label-pill label-inline">' +
                      info.event.extendedProps.task_details.localized_state +'</span>');
                    }

                    initPopover(element, info.event);
                    if (element.hasClass('fc-time-grid-event') || element.hasClass('fc-day-grid-event')) {
                        element.addClass('scroll', 'scroll-pull');
                        element.attr('data-scroll', 'true')
                        element.attr('data-wheel-propagation', 'true')
                        let desc = typeof info.event.extendedProps.description.und !== "undefined" ? info.event.extendedProps.description.und[0].value : Drupal.t("No description");
                        element.find('.fc-title').after("<div class=\"fc-description font-weight-bolder\"></div>");
                        element.find('.fc-description').css({whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}).append(desc);
                    } else if (element.find('.fc-list-item-title').length !== 0) {
                        element.find('.fc-list-item-title').append('<div class="fc-description">' + info.event.title + '</div>');
                    }
                }

              },
              datesRender: function({view, el}){
                if(view.type == 'dayGridMonth'){
                    let days = el.querySelectorAll('.fc-day-top')                     
                    if(days && days.length > 0) {
                        days.forEach((day) => {
                          let currentDate = day.dataset.date
                          let nodeId = calendarEl.dataset.id
                          let link = document.createElement('a')
                          link.className = 'btn btn-link-primary'
                          link.innerHTML = '+'
                          link.href = '/node/add/conference?deadline='+currentDate+'&gid='+nodeId
                          day.prepend(link)
                        })
                    }
                }else{
                        let days = el.querySelectorAll('.fc-day-header')
                          if(days && days.length > 0) {
                              days.forEach((day) => {
                                let currentDate = day.dataset.date
                                let nodeId = calendarEl.dataset.id
                                let link = document.createElement('a')
                                link.className = 'btn btn-link-primary'
                                //link.innerHTML = '<span style="margin-left:10px;font-weight:bold;font-size:xx-large"> +</span>'
                                link.innerHTML = '<span class="fa fa-plus" style="color:#3699ff;margin-left:10px;"></span>';
                                link.href = '/node/add/conference?deadline='+currentDate+'&gid='+nodeId
                                let br = document.createElement('br')
                                day.append(br);
                                day.append(link);
                              })
                      }
                  }
            
                }, 
            });
            Gofast.calendar.calInstance.on("datesRender", function(info) {
              Gofast.calendar.setToolbarEventsBadge(Gofast.calendar.calInstance.getEvents());
              const $toolbarRightContainer = $("#kt_calendar .fc-right");
              // Add new calendar toolbar element
              $toolbarRightContainer.prepend(`
                <div class="d-inline-flex align-items-center align-middle justify-content-end w-50">
                  <span class="switch switch-sm switch-icon ml-4">
                    <label>
                      <input id="calendar-visibility-switch-input" type="checkbox">
                      <span></span>
                    </label>
                  </span>
                  <span class="ml-2">${Drupal.t("Display children's spaces calendars", {}, {context: "gofast:gofast_calendar"})}</span>
                </div>
              `);
              // Set switch state value from value stored in session storage
              if(sessionStorage.getItem("calendar-events-visiblity") == "all"){
                $("#calendar-visibility-switch-input").prop("checked", true)
              }

              const isBluemindFeatureActive = Gofast._settings.gofast_bluemind_is_feature_active;
              const isFeatureActiveForUser = Gofast._settings.gofast_bluemind_is_feature_active_for_user;
              if (!isBluemindFeatureActive) {
                let syncDeactivatedTitle = Drupal.t('The Bluemind calendar synchronization is deactivated globally', {}, { context: 'gofast:gofast_calendar' });
                $(".fc-syncCalendar-button").attr("title", syncDeactivatedTitle).attr("disabled", "");
              } else if (!isFeatureActiveForUser) {
                let syncDeactivatedTitle = Drupal.t('You deactivated the Bluemind calendar synchronization in your profile', {}, { context: 'gofast:gofast_calendar' });
                $(".fc-syncCalendar-button").attr("title", syncDeactivatedTitle).attr("disabled", "");
              }

              // Store switch state in session storage
              $("#calendar-visibility-switch-input").on("change", () => {
                if($("#calendar-visibility-switch-input").is(":checked")) {
                  sessionStorage.setItem("calendar-events-visiblity", "all")
                } else {
                  sessionStorage.setItem("calendar-events-visiblity", "space-only")
                }
                Gofast.calendar.toggleLoader(true)
                // Delay event fetching preventing page freezing
                setTimeout(() => {
                  Gofast.calendar.calInstance.refetchEvents();
                }, 500)
              })
            });
            Gofast.calendar.calInstance.render();
            Gofast.updateCalendarEvents()

            $('#tab_ogcalendar').on('shown.bs.tab', function (e) {
              // update size of calendar when the tab is showed
              Gofast.calendar.calInstance.updateSize();
              Gofast.calendar.calInstance.refetchEvents();
              Gofast.getLastSyncDate(Gofast.calendar.setLastSync)
            })
            
            $('.fc-importCalendar-button').attr('title', Drupal.t("Import Calendar from ics", {},{context:'gofast:gofast_calendar'}))
            Gofast.getLastSyncDate(Gofast.calendar.setLastSync)
          }
        };
      }();
      
      KTCalendarBasic.init();
    }
  }

  Drupal.behaviors.gofastCalendar = {
    attach: function(context, settings){
      $('.date-views-pager').find('.icon-after').on('click', function () {
        //remove tooltip
        $('.tooltip').each(function(key, elt){
          $(elt).remove();
        });
      });

      $('.date-views-pager').find('.icon-before').on('click', function () {
        //remove tooltip
        $('.tooltip').each(function(key, elt){
          $(elt).remove();
        });
      });
    }

  };

  Drupal.behaviors.gofastCalendar_popover = {
      attach: function(context, settings){
          if (typeof $('.popup_calendar:not(.calendar_popover-processed)',context).popover == "undefined" || Gofast._settings.isEssential) {
              return;
          }

          $('.popup_calendar:not(.calendar_popover-processed)',context).addClass('calendar_popover-processed').popover({
              content:function() {
                  var my_id = $(this).attr("id");
                  if (my_id !== ""){
                      return $('#window_popup_calendar_'+my_id).html();
                  }
              },
              html:true,
              placement:'bottom',
              trigger:'hover'
          });
      }
  };

  Gofast.getCalendarEvents = function (fetchInfo, nid, successCallback, failureCallback) {
    fetchInfo.calendarEventsVisibility = sessionStorage.getItem("calendar-events-visiblity") ?? "space-only"
    var data = {
      nid: nid,
      fetchInfo: fetchInfo
    };
    $.ajax({
      type: "GET",
      url: window.origin + "/calendar/get_calendar",
      data: data,
      success: function (data) {
        successCallback(data);
        Gofast.calendar.toggleLoader(false)
        Gofast.getLastSyncDate(Gofast.calendar.setLastSync)
      },
      dataType: 'json'
    });
  }

  Gofast.updateCalendarEvents = function () {
    const isBluemindFeatureActive = Gofast._settings.gofast_bluemind_is_feature_active;
    const isFeatureActiveForUser = Gofast._settings.gofast_bluemind_is_feature_active_for_user;

    if (!isBluemindFeatureActive || !isFeatureActiveForUser || $(".fc-syncCalendar-button.syncing").length) {
      return;
    }
    $(".fc-syncCalendar-button").addClass("syncing");

    const bluemindSyncCallback = function() {
      if (!$(".fc-syncCalendar-button").length) {
        clearInterval(Gofast.calendar?.bluemindSyncInterval);
        return;
      }
      try {
        Gofast?.calendar?.calInstance?.refetchEvents()
      } catch (error) {
        console.error('Error occurred during calendar update:', error);
      }
    };

    // Set up an interval to call Gofast.calendar.initCalendar every 5 minutes.
    bluemindSyncCallback();
    Gofast.calendar.bluemindSyncInterval = setInterval(bluemindSyncCallback, 5 * 60 * 1000); // 5 minutes in milliseconds.
  }
  
  Gofast.getLastSyncDate = function (successCallback) {
    const isBluemindFeatureActive = Gofast._settings.gofast_bluemind_is_feature_active;
    const isFeatureActiveForUser = Gofast._settings.gofast_bluemind_is_feature_active_for_user;
    
    if (isBluemindFeatureActive && isFeatureActiveForUser){
      $.ajax({
        type: "GET",
        url: window.origin + "/calendar/get_last_sync",
        async: false,
        success: function (data) {
          successCallback(data);
        },
        dataType: 'json'
      });
    }
  }

  Gofast.calendar.setLastSync = function (lastSyncDate = 0) {
    const isBluemindFeatureActive = Gofast._settings.gofast_bluemind_is_feature_active;
    const isFeatureActiveForUser = Gofast._settings.gofast_bluemind_is_feature_active_for_user;

    if (isBluemindFeatureActive && isFeatureActiveForUser) {
      const lastSyncTimestamp = lastSyncDate !== 0 ? lastSyncDate : Gofast._settings.gofast_bluemind_user_last_sync;

      let lastSyncTitle = Drupal.t('Not yet synced', {}, { context: 'gofast:gofast_calendar' });

      if (lastSyncTimestamp) {
        const lastSyncDate = new Date(lastSyncTimestamp * 1000);
        const dateString = lastSyncDate.toLocaleString();
        lastSyncTitle = Drupal.t('Last sync was on @last_sync', { '@last_sync': dateString }, { context: 'gofast:gofast_calendar' });
      }

      const syncCalendarButton = $(".fc-syncCalendar-button");

      if (syncCalendarButton.length) {
        syncCalendarButton.attr("title", lastSyncTitle);
      }
    }
  };
  Gofast.calendar.toggleLoader = function(showLoader = true) {
    if(showLoader){
      $("#kt_calendar > .fc-view-container > .fc-view").addClass("d-none")
      $("#kt_calendar > .fc-view-container").append('<div class="spinner spinner-center spinner-primary spinner-lg h-100"></div>')
    } else {
      $("#kt_calendar > .fc-view-container > .spinner").remove();
      $("#kt_calendar > .fc-view-container > .fc-view").removeClass("d-none")
    }
  }

  Gofast.calendar.setToolbarEventsBadge = function(events) {
    const $calendarTitleElement = $(".fc-toolbar .fc-center > *:last-child");
    const $titleContainer = $('<div class="d-inline-flex align-items-center">');
    $calendarTitleElement.wrap($titleContainer);
    $calendarTitleElement.addClass("m-0")
    let $calendarTitleBadge = $calendarTitleElement.parent().find("span");
    if(!$calendarTitleBadge.length){
      $calendarTitleBadge = $(`<span class='ml-3 label label-inline font-weight-bold label-dark'></span>`);
      $calendarTitleElement.parent().append($calendarTitleBadge);
    }
    $calendarTitleBadge.html(`${events.length} ${(events.length > 1 ? Drupal.t('events') : Drupal.t('event'))}`);
  }


})(jQuery, Gofast, Drupal);
