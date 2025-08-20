/**
 * @file
 *
 * Provides object with all callable utilities related to OnlyOffice convert service
 *
 */
(function ($, Gofast, Drupal) {
  Gofast = Gofast || {};

  Gofast.onlyofficeConvert = {
    intervals: {
        convertInterval: null,
    },
    handlers: {
      async convertAsync(requestBody) {
        let response = {};
        await $.ajax({
          url: location.origin + "/gofast_cmis/convert_async",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(requestBody),
          success: function (data) {
            const progressValue = data.percent + "%";
            $("#modal-content .progress-bar").width(progressValue);
            $("#modal-content .progress-bar").html(progressValue);
            response = data;
          },
        });
        return response;
      },
      createVersion(fileUrl, fileType, nid) {
        $.ajax({
          url: location.origin + "/gofast_cmis/converted_async/" + nid,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({ fileUrl, fileType }),
          success: function (data) {
            Gofast.toast(data.success, "success");
            Gofast.processAjax("/node/" + nid)
          },
          error: function (jqXHR) {
            const errorMessage = jqXHR.responseJSON?.error || Drupal.t("Something went wrong!");
            Gofast.toast(errorMessage, "error");
          },
        });
      },
    },
  };
})(jQuery, Gofast, Drupal);
