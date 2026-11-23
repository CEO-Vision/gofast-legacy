<?php
// Utility because I am not repeating myself
function _step($number, $description) {
  return t(
    'Step @number: !description',
    [
      '@number' => is_array($number) ? implode('.', $number) : $number,
      '!description' => $description,
    ],
    ['context' => 'gofast'],
  );
}
?>
<div id="restore_space_modal_confirmation_container">
  <h3 class="confirmation_header">
    <?= t('Are you sure you want to restore this space?', [], ['context' => 'gofast']) ?>
  </h3>

  <button
    class="btn btn-success"
    type="button"
    onclick="Gofast.og.restoreSpaceModalButtonClickHandler(event, <?= $gid ?>)"
  >
    <i class="fas fa-trash-undo"></i>
    <?= t('Restore space', [], ['context' => 'gofast']) ?>
  </button>
</div>
<!-- Progression list container -->
<div
  id="restore_space_modal_progress_container"
  class="d-none flex-column align-items-start w-100"
>
  <div class="panel panel-default">
    <div class="panel-body">
      <div id="step_restore_folder"><?=_step(1, t('Restore folder.', [], ['context' => 'gofast']))?></div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-body">
      <div id="step_restore_contents"><?=_step(2, t('Restore documents.', [], ['context' => 'gofast']))?></div>
    </div>
  </div>
  <div class="panel panel-default">
    <div class="panel-body">
      <div id="step_restore_node"><?=_step(3, t('Restore space.', [], ['context' => 'gofast']))?></div>
    </div>
  </div>
</div>
