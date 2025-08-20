<div class="h-100 w-100 d-flex flex-column align-items-start placer-wrapper">
  <div
    class="flex-fill align-self-stretch position-relative"
    style='overflow-y:auto'
    id='placer-document'>
  </div>
  <div
    class="
      placer-no-preview-placeholder
      position-absolute
      d-none
      flex-column
      align-items-center
      justify-content-center
    "
    style="inset:0"
  >
    <i class="fas fa-file-times mb-3" style="font-size:6em"></i>
    <h1 class="placer-no-preview-label text-uppercase">
      <?= t('No PDF preview', [], ['context' => 'gofast:gofast_signature']) ?>
    </h1>
    <p><?= t("The selected document type is not supported here", [], ['context' => 'gofast:gofast_signature']) ?></p>
  </div>
</div>
