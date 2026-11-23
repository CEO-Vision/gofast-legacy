<span style='position:relative;'>
  <img
    title='<?= $user_name ?>'
    style='margin-right:2px;width:20px;height:20px;'
    src='<?= $picture_url ?>'
    alt='<?= t(
      "@user's picture",
      ['@user' => $user_name],
    ) ?>'
  />
  <span
    class='badge-pill badge-primary co-editing-user-counter--badge co-editing-user-counter--value'
    data-user-count-exact='<?= htmlspecialchars(json_encode($number_of_co_editing_users)) ?>'
    style='<?php if (!$display_badge) { ?>display:none;<?php } ?>'
  >
    <?= $displayed_number_of_co_editing_users ?>
  </span>
  <i class="fa <?= $lock_icon ?> document_locked co-editing-lock-icon"></i>
</span>
