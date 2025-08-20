<p class="progress-label" class="mb-4"><?= t("Conversion in progress...", [], ["context" => "gofast:gofast_onlyoffice"]) ?></p>
<div class="progress mb-4" id="bulkactions-users-panels-progress">
    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
</div>
<button disabled class="btn btn-success conversion-submit" style="cursor: not-allowed;" onClick="Drupal.CTools.Modal.dismiss()">OK</button>

<script>
    Gofast.onlyofficeConvert.intervals.convertInterval = setInterval(async () => {
        const response = await Gofast.onlyofficeConvert.handlers.convertAsync(JSON.parse('<?= $request_body ?>'));
        if (response.percent != 100) {
            return;
        }
        clearInterval(Gofast.onlyofficeConvert.intervals.convertInterval);

        Gofast.onlyofficeConvert.handlers.createVersion(response.url, response.type, <?= $node->nid ?>);
        $('#modal-content .progress-bar').removeClass('progress-bar-striped');
        $('#modal-content .progress-bar').addClass('progress-bar-success');
        $('#modal-content .progress-label').text('<?= t("Conversion done!", [], ["context" => "gofast:gofast_onlyoffice"]) ?>');
        $('#modal-footer .conversion-submit').removeAttr("disabled");
        $('#modal-footer .conversion-submit').css("cursor", "pointer");
    }, 1000)

</script>
