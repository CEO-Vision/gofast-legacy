<?php global $user; $rand = rand(0, 1000); // avoid caching ?>
<script type="text/javascript" src="<?php print DOC_SERV_API_URL ?>"></script>

<script type="text/javascript">
    //Wait for DocsAPI to be available
    Gofast.load_onlyoffice_compare = function() {
        var docEditor;

        Gofast = Gofast || {};
        const docConfig = JSON.parse('<?= $docConfig ?>');
        docConfig.events = {
            "onDocumentReady": onDocumentReady,
        };
        docConfig.token = "<?= $token ?>";
        Gofast.docCompare = new DocsAPI.DocEditor("iframeCompareEditor<?= $rand ?>", docConfig);
    }

    function onDocumentReady() {
        Gofast.docCompare.iframe = document.querySelector("#iframeCompareEditorContainer iframe");
        Gofast.docCompare.iframe.classList.add("pb-8");
        // We want to see only the document content, nothing else
        Gofast.docCompare.iframe.contentWindow.postMessage({op: "hideToolbar"},  "https://" + Drupal.settings.GOFAST_COMM);
        // We set the document content to readonly so the user will only be able to see the compare resuts (this also refreshes the layout)
        Gofast.docCompare.denyEditingRights("");
        Gofast.docCompare.iframe.contentWindow.postMessage({op: "confirm", button: "ok"}, "https://" + Drupal.settings.GOFAST_COMM);
        // Trigger the actual compare process
        const docRequestConfig = JSON.parse('<?= $docRequestConfig ?>');
        docRequestConfig.token = "<?= $docRequestToken ?>";
        Gofast.docCompare.setRequestedDocument(docRequestConfig);
        // Confirm dialog and show iframe
        Gofast.docCompare.iframe.contentWindow.postMessage({op: "confirm", button: "ok"}, "https://" + Drupal.settings.GOFAST_COMM);
        Gofast.docCompare.iframe.contentWindow.postMessage({op: "confirm", button: "yes"}, "https://" + Drupal.settings.GOFAST_COMM);
        Gofast.docCompare.iframe.contentWindow.postMessage({op: "close"}, "https://" + Drupal.settings.GOFAST_COMM);
        $("#iframeCompareEditorLoader").css("display", "none");
        $("#iframeCompareEditorContainer").css("opacity", 100);
    }

    Gofast.onlyoffice_compare_interval = setInterval(function() {
        if (typeof DocsAPI == "undefined") {
            return;
        }
        Gofast.load_onlyoffice_compare();
        clearInterval(Gofast.onlyoffice_compare_interval);
    }, 500);
</script>

<?php if (empty($errors)) : ?>
<div class="h-100 d-flex">
    <div id="gofastCompare" class="position-relative card gutter-b card-custom my-4 w-100 overflow-hidden ">
        <div class="card-header d-flex align-items-center justify-content-between">
            <div class="h3 mb-2"><?php print theme('gofast_node_icon_format', array('node' => $node, 'size' => 2)) . $node->title ?></div>
            <span class="h3"><?php print t("Version comparator : Version", array(), array("context" => "gofast:gofast_pdf_compare")) . " " . $version_source . " " . t("to", array(), array("context" => "gofast:gofast_pdf_compare"))  . " " . $version_dest; ?></span>
        </div>
        <form id="iframeCompareEditorContainer" class="position-absolute card-body w-100 h-100" style="transition: opacity .5s; opacity: 0; top: 70px;">
            <div id="iframeCompareEditor<?= $rand ?>">
            </div>
        </form>
        <div id="iframeCompareEditorLoader" class="position-absolute card-body w-100" style="transition: opacity .5s; opacity: 100; top: 70px;">
            <?= theme("gofast_pdf_compare_loader") ?>
        </div>
    </div>
</div>
<?php endif; ?>

<?php if (!empty($errors)) : ?>
<div class="card mt-4">
    <div class="card-body">
<?php foreach ($errors as $error) : ?>
        <div class='alert alert-custom alert-notice alert-light-danger fade show' role='alert'>
    <div class='alert-icon'><i class='flaticon-warning'></i></div>
    <div class='alert-text m-0'><?= $error ?></div>
</div>
<?php endforeach; ?>
    </div>
</div>
<?php endif; ?>