<script>
  const clearRiotBrowserData = function(clearBlacklist = []){
    let localStorageData = {};
    // Keep some localStorage variables after the clear (e.g. 'mx_local_settings')
    clearBlacklist.forEach((localStorageVariable) => {
      localStorageData[localStorageVariable] = localStorage[localStorageVariable];
    })

    // Clear the localStorage
    localStorage.clear();

    // Put back saved variable to localStorage
    Object.entries(localStorageData).forEach(([variableName, data]) => {
      localStorage.setItem(variableName, data);
    })
    // Unregister Element service worker before deleting indexedDB databases
    navigator.serviceWorker.getRegistration(location.origin + "/sites/all/libraries/riot/sw.js").then((registration) => {
      registration.unregister();
      indexedDB.deleteDatabase('matrix-js-sdk:riot-web-sync');
      indexedDB.deleteDatabase('matrix-js-sdk::riot-web-sync');
      indexedDB.deleteDatabase('matrix-js-sdk:matrix-sdk-crypto');
      indexedDB.deleteDatabase('matrix-js-sdk::matrix-sdk-crypto');
      indexedDB.deleteDatabase('matrix-js-sdk:crypto');
      indexedDB.deleteDatabase('matrix-js-sdk::crypto');
      indexedDB.deleteDatabase('matrix-react-sdk');
      indexedDB.deleteDatabase('logs');
    })
    
  }
  //We have a Riot token in our browser, logout this session
  if(typeof localStorage.mx_access_token == "string" && localStorage.mx_access_token.length){
    jQuery.ajax({
        url: "https://" + Drupal.settings.GOFAST_COMM + "/_matrix/client/r0/logout",
        headers: {
          "Authorization": "Bearer " + localStorage.mx_access_token
        },
        type: 'POST',
        dataType: 'json',
        complete: function(){
          //Delete local storage to finalize the clear
          clearRiotBrowserData(["mx_local_settings"])
        },
      });
  }else{
    //Delete local storage to finalize the clear
    clearRiotBrowserData(["mx_local_settings"])
  }
</script>
