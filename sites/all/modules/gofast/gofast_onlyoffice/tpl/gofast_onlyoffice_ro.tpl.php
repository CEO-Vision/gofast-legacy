    <script type="text/javascript" src="<?php print DOC_SERV_API_URL ?>"></script>

    <script type="text/javascript">
      //Wait for DocsAPI to be available
      Gofast.process_onlyoffice_editor = async function(reload = false){
              var docEditor;

              //Set a cookie to inform onlyoffice plugins about the current key
              var current_date = new Date();
              current_date.setMonth(current_date.getMonth() + 12);

              var domain_parse = location.origin.split(".");
              var domain_base = domain_parse[domain_parse.length-2] + "." + domain_parse[domain_parse.length-1];

              let docConfig = JSON.parse('<?= $docConfig ?>');
              docConfig.token = "<?= $token ?>";
              if (reload) {
                await fetch("/onlyoffice/config/<?= $nid ?>")
                  .then(response => response.json())
                  .then(data => {
                    docConfig = data.docConfig;
                    docConfig.token = data.token;
                  });
              }
              Gofast.docEditor = new DocsAPI.DocEditor("iframeEditor", docConfig);
      }
      
      Gofast.onlyoffice_preview_interval = setInterval(function(){
            if(typeof DocsAPI == "undefined"){
                return;
            }
            Gofast.process_onlyoffice_editor();
            clearInterval(Gofast.onlyoffice_preview_interval);
            
      }, 500);
    </script>
    
    <form id="form1" class="h-100">
      <div id="iframeEditor">
      </div>
    </form>