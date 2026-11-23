<script>
    //Not really proud of it but it works
    function resizeIframe(obj) {
        Gofast.intervalidentifier = 0;
        var iframeResizeInterval = setInterval(function() {
            Gofast.intervalidentifier++;
            if (Gofast.intervalidentifier > 10) {
                clearInterval(iframeResizeInterval);
            }

            if (obj.contentWindow !== null) {
                obj.style.height = (obj.contentWindow.document.body.scrollHeight + 15) + 'px';
            }
        }, 500);
    }
    jQuery("document").ready(function() {
        <?php if (isset($_GET['details'])) { ?>
            Gofast.gofast_workflow_show_details(
                <?php echo (int) $_GET['pid'] ?>,
                <?php echo drupal_json_encode((string) $_GET['type']) ?>,
                <?php echo drupal_json_encode((string) $_GET['title']) ?>,
                <?php echo (int) $_GET['hid'] ?>,
                <?php // Decoded then encoded again: only a list of values from the URL reaches the script ?>
                <?php echo drupal_json_encode(array_values((array) json_decode((string) $_GET['documents'], TRUE))) ?>
            );
        <?php } ?>
    });
</script>
<div class="card-body pb-2 pt-0 px-1 d-flex flex-column">
    <div id="workflows-dashboard-details">

        <div class="accordion accordion-solid accordion-toggle-plus mt-2 mb-2 gofastBoostrapPanel" id="accordion_gofast_612e319b85b56">
            <div class="card">
                <div class="card-header">
                    <div class="card-title" data-toggle="collapse" data-target="#collapse_gofast_612e319b85b56" aria-expanded="true">
                        <?php echo t("Workflow tasks", array(), array('context' => "gofast:gofast_workflows")); ?> </div>
                </div>
                <div id="collapse_gofast_612e319b85b56" class="collapse show" data-parent="#accordion_gofast_612e319b85b56" style="">
                    <div class="card-body">
                        <iframe id="workflows-dashboard-tasks" style="width:100%;height:100%;border:none;" onload="resizeIframe(this)"></iframe>
                    </div>
                </div>
            </div>
        </div>

        <div class="accordion accordion-solid accordion-toggle-plus mt-2 mb-2 gofastBoostrapPanel" id="accordion_gofast_612e319b85b55">
            <div class="card">
                <div class="card-header">
                    <div class="card-title" data-toggle="collapse" data-target="#collapse_gofast_612e319b85b55" aria-expanded="true">
                        <?php echo t("Documents in this workflow", array(), array('context' => "gofast:gofast_workflows")); ?> </div>
                </div>
                <div id="collapse_gofast_612e319b85b55" class="collapse show" data-parent="#accordion_gofast_612e319b85b55" style="">
                    <div class="card-body">
                        <div class="panel-body" id="workflows-dashboard-documents"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="accordion accordion-solid accordion-toggle-plus mt-2 mb-2 gofastBoostrapPanel" id="accordion_gofast_612e319b85b54">
            <div class="card">
                <div class="card-header">
                    <div class="card-title" data-toggle="collapse" data-target="#collapse_gofast_612e319b85b54" aria-expanded="true">
                        <?php echo t("Workflow history", array(), array('context' => "gofast:gofast_workflows")); ?> </div>
                </div>
                <div id="collapse_gofast_612e319b85b54" class="collapse show" data-parent="#accordion_gofast_612e319b85b54" style="">
                    <div class="card-body">
                        <iframe id="workflows-dashboard-history" style="width:100%;height:100%;border:none;" onload="resizeIframe(this)"></iframe>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
