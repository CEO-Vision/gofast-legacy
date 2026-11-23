<div class="accordion accordion-toggle-arrow" id="gofastSummaryAccordion">
    <div class="card<?= $hide ? " d-none" : "" ?>">
        <div class="card-header">
            <div class="card-title" data-toggle="collapse" data-target="#gofastSummaryContent" aria-expanded="true">
                <?= t("Summary") ?>
            </div>
        </div>
    </div>
    <div id="gofastSummaryContent" class="card-body p-4<?= $hide ? " d-none" : "" ?> collapse show" data-parent="#gofastSummaryAccordion">
        <div class='gofastSummaryContent bg-secondary rounded shadow-sm'>
            <?= $body ?>
        </div>
    </div>
</div>
