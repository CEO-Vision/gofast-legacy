<?php global $base_url; global $user; ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="icon" href="<?= $base_url ?>/sites/all/modules/gofast/gofast_onlyoffice/favicon.ico" type="image/x-icon" />
    <title>✎ <?php echo $filename ?></title>

    <style>
      html {
        height: 100%;
        width: 100%;
      }

      body {
        background: #fff;
        color: #333;
        font-family: Arial, Tahoma,sans-serif;
        font-size: 12px;
        font-weight: normal;
        height: 100%;
        margin: 0;
        overflow-y: hidden;
        padding: 0;
        text-decoration: none;
      }

      form {
        height: 100%;
      }

      div {
        margin: 0;
        padding: 0;
      }
      
      .oo-popup{
        min-height: 50px;
        min-width: 150px;
        box-sizing: border-box;
        z-index: 1040;
        box-shadow: 0 5px 15px rgba(0,0,0,.2);
        border-radius: 5px;
        background-color: #fff;
        border: solid 1px #cbcbcb;
        left: 0;
        top: 0;
        position: fixed;
        z-index: 1050;
        user-select: none;
        margin-left: 120px;
        margin-top: 100px;
        margin-left: 120px;
        margin-top: 100px;
        width: 324px;
        height: 110px;
      }
      
      .oo-popup-header{
        height: 34px;
        border-radius: 5px 5px 0 0;
        position: absolute;
        padding: 5px 6px 6px;
        left: 0;
        right: 0;
        top: 0;
        text-overflow: ellipsis;
        color: #848484;
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        text-shadow: 1px 1px #f8f8f8;
        vertical-align: bottom;
        line-height: 26px;
        background: #ededed;
        border-bottom: solid 1px #cbcbcb;
        cursor: move;
      }
      
      .oo-popup-body{
        border-radius: 0 0 5px 5px;
        position: absolute;
        top: 34px;
        width: 100%;
        background-color: #fff;
        height: auto;
        overflow: hidden;
        text-align: center;
      }
      
      .oo-button{
        display: inline-block;
        margin-bottom: 0;
        font-weight: 400;
        text-align: center;
        vertical-align: middle;
        touch-action: manipulation;
        cursor: pointer;
        background-image: none;
        border: 1px solid transparent;
        white-space: nowrap;
        padding: 1px 3px;
        font-size: 11px;
        line-height: 1.42857143;
        border-radius: 4px;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        border-radius: 1px;
        color: #444;
        height: 22px;
        color: #fff;
        background-color: #7d858c;
        width: auto;
        min-width: 86px;
        margin-right: 10px;
      }
    </style>

  <?= theme("gofast_user_atatus_script", ["atatus_tag" => "onlyoffice"]) ?>
    <script type="text/javascript" src="<?php print DOC_SERV_API_URL ?>"></script>
    <script type="text/javascript" src="/sites/all/modules/tag1d7es_jquery_update/replace/jquery/3.7.1/jquery.min.js"></script>

    <script type="text/javascript">
      // Anonymous problem. CF : http://dev.onlyoffice.org/viewtopic.php?t=6855&p=9456
      var docConfig;
      var docEditor;
      var onCollaborativeChanges = function () {
          console.log("The document changed by collaborative user");
      };

      var onDocumentReady = function () {
        const docEditorIframe = document.querySelector("#form1 iframe");
        <?php foreach($localStorage as $key => $value): ?>
          docEditorIframe.contentWindow.postMessage({op: "setLocalStorage", key: "<?= $key ?>", value: "<?= $value ?>"}, "https://<?= $commDomain ?>");
        <?php endforeach; ?>
      }

      var onDocumentStateChange = function (event) {
          if (event.data) {
              console.log("The document changed");
          } else {
              console.log("Changes are collected on document editing service");
          }
      };

      var onDownloadAs = function (event) {
          console.log("ONLYOFFICE™ Document Editor create file: " + event.data);
      };

      var onError = function (event) {
          console.log("ONLYOFFICE™ Document Editor reports an error: " + event.data);
      };

      var onReady = function() {
          console.log("ONLYOFFICE™ Document Editor is ready");
      };

      var onRequestEditRights = function () {
          console.log("ONLYOFFICE™ Document Editor requests editing rights");
          document.location.reload();
      }

      var onRequestHistoryClose = function() {
        document.location.reload();
      };

      /** Behavior when trying to open external data source: will open the GoFAST document page */
      var onRequestOpen = function(event) {
        const referenceData = event.data.referenceData;
        const [reference, nid] = referenceData.fileKey.split("%%SEPARATOR%%");
        const path = "<?= $base_url ?>/node/" + nid;
        window.open(path, event.data.windowName);
      }

      /** Set payload to fetch external data source */
      var onRequestReferenceData = function(event) {
        const referenceData = event.data.referenceData;
        const referenceDataLink = referenceData.fileKey.split("%%SEPARATOR%%")[0].replace(":/", "");
        // URL with Alfresco session ticket
        const url = "<?= rtrim(GOFAST_URL_WEBSCRIPT_ALFRESCO, '/') . '/api/node/content/' ?>" + referenceDataLink + "<?= '?alf_ticket=' . gofast_cmis_ticket_validate() ?>";
        const path = event.data.path;
        const referenceDataPayload = {
          fileType: docConfig.document.fileType,
          path,
          key: referenceDataLink + "-" + new Date().getTime(),
          referenceData,
          url,
        }
        // JWT-sign the payload
        fetch("<?= $base_url ?>/onlyoffice/config/jwt", {
          method: "post",
          body: JSON.stringify({config: referenceDataPayload})
        }).then(response => response.json())
        .then(data => {
          referenceDataPayload.token = data.token;
          // Set the payload
          docEditor.setReferenceData(referenceDataPayload);
        })
      }
      
      //Set a cookie to inform onlyoffice plugins about the current key
      var current_date = new Date();
      current_date.setMonth(current_date.getMonth() + 12);
      
      var domain_parse = location.origin.split(".");
      var domain_base = domain_parse[domain_parse.length-2] + "." + domain_parse[domain_parse.length-1];
      
      var connectEditor = function () {
        docConfig = JSON.parse('<?= $docConfig ?>');
        docConfig.events = {
            "onCollaborativeChanges": onCollaborativeChanges,
            "onDocumentReady": onDocumentReady,
            "onDocumentStateChange": onDocumentStateChange,
            "onDownloadAs": onDownloadAs,
            "onError": onError,
            "onReady": onReady,
            "onRequestEditRights": onRequestEditRights,
            "onRequestHistoryClose": onRequestHistoryClose,
            "onRequestReferenceData": onRequestReferenceData,
            "onRequestOpen": onRequestOpen,
        };
        docConfig.token = "<?= $token ?>";
        docEditor = new DocsAPI.DocEditor("iframeEditor", docConfig);
      };

      if (window.addEventListener) {
        window.addEventListener("load", connectEditor);
      } else if (window.attachEvent) {
        window.attachEvent("load", connectEditor);
      }
    </script>
    <script>
      let disconnected = false;
        window.addEventListener('online',  function(){
            jQuery("#connection-lost").remove();
            if (disconnected) {
              document.location.reload(true); // no cache
            }
        });
        window.addEventListener('offline', function(){
            disconnected = true;
            let userLanguage = "<?= $user->language ?>";
            if(userLanguage == "fr"){
                jQuery("#connection-lost").remove();
                jQuery("body").append('<div id="connection-lost" style="position:fixed;width:100%;height:100%;z-index:99999;background-color:rgba(200,200,200,0.4);top:0px;left:0px;"></div>');
                jQuery("#connection-lost").append('<div class="oo-popup"><div class="oo-popup-header">Enregistrez votre travail</div><div class="oo-popup-body">Vous avez été déconnecté suite à un problème réseau.<br /><br />La page sera rechargée automatiquement au retour de la connexion.<br /><br />Néanmoins, veuillez enregistrer votre travail pour ne rien perdre et contacter votre administrateur.<br /><br /><button id="oo-close-button" class="oo-button">Fermer</button></div></div>');
                jQuery("#oo-close-button").click(function(){
                    jQuery("#connection-lost").remove();
                });
            }else{
                jQuery("#connection-lost").remove();
                jQuery("body").append('<div id="connection-lost" style="position:fixed;width:100%;height:100%;z-index:99999;background-color:rgba(200,200,200,0.4);top:0px;left:0px;"></div>');
                jQuery("#connection-lost").append('<div class="oo-popup"><div class="oo-popup-header">Save your work</div><div class="oo-popup-body">You have been disconnected because of a network issue.<br /><br />The page will be automatically reloaded when you return to the connection.<br /><br />However, please save your work and contact your system administrator.<br /><br /><button id="oo-close-button" class="oo-button">Close</button></div></div>');
                jQuery("#oo-close-button").click(function(){
                    jQuery("#connection-lost").remove();
                });
            }
        });
        
        function healthCheck(){
            $.post("/sites/all/modules/gofast/gofast_onlyoffice/oo_healthcheck", {ressource: "gofast", action: "get_version"}, function(){            
                window.dispatchEvent(new Event('online'));
                setTimeout(healthCheck, 10000);
            }).fail(function(){
                window.dispatchEvent(new Event('offline'));
                setTimeout(healthCheck,30000);
            }, 'json');
        }
        
        healthCheck();
    </script>
  </head>
  <body>
    <form id="form1">
      <div id="iframeEditor">
      </div>
    </form>
  </body>
</html>
