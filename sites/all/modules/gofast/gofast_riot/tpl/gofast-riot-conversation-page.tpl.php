<?php global $base_url; ?>

<style>
    .main-container{
        width: 100% !important;
        padding-left: 25px;
        padding-right: 25px;
    }

    aside, footer, .breadcrumb-gofast {
      display: none !important;
    }
    
    .block-gofast-riot {
      visibility: hidden !important;
    }
    
</style>

<iframe id="IframeRiot"
        class="gofast-iframe-riot"
        title="Frame Riot"
        src="">
</iframe>

<script>
    jQuery(document).ready(function() {
        function riotIframeHeightSize(){
            if (!document.querySelector('#IframeRiot')) {
                return;
            }
            // Get width and height of the window excluding scrollbars
            var h = document.documentElement.clientHeight;
            // add height to frame
            document.querySelector('#IframeRiot').setAttribute('height', (h-100) + 'px'); 
        }
        const waitForSessionReadyInterval = setInterval(() => {
            if (!document.querySelector("#IframeRiot") || !Gofast.Riot?.sessionReady) {
            return;
            }
            clearInterval(waitForSessionReadyInterval);
            document.querySelector('#IframeRiot').setAttribute('src', "/sites/all/libraries/riot/index.html")
        }, 100);
        // Attaching the event listener function to window's resize event
        window.addEventListener("resize", riotIframeHeightSize);
        riotIframeHeightSize();
        const waitForConversationPageLoadInterval = setInterval(() => {
            if (!document.querySelector("#IframeRiot") || !document.querySelector("#IframeRiot")?.contentWindow?.document?.querySelector(".mx_MatrixChat")) {
                return;
            }
            clearInterval(waitForConversationPageLoadInterval);
            jQuery("#gofast_over_content").removeClass("col-lg-8");
            jQuery("#gofast_over_content").addClass("col-lg-12");
            Gofast.Riot.showUserMenu("#IframeRiot");
        }, 100);
    });
</script>

