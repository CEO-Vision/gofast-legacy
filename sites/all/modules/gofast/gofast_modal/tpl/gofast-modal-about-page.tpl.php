<?php
global $user;
$is_admin = array_intersect([
  'administrator',
  'business administrator',
], $user->roles); ?>
<div class="d-flex justify-content-center">
    <ul class="list-group w-80 rounded border border-dark">
        <?php foreach ($items as $item) : ?>
            <li
                class="
                    list-group-item
                    d-flex
                    justify-content-between
                    align-items-center
                    <?= empty($item['version']) && strpos($item['name'], "following") >= 0 ? "list-group-item-primary" : "" ?>
                    <?= empty($item['version']) && !strpos($item['name'], "following") ? "list-group-item-warning" : "" ?>
                "
            >
                <?= theme("gofast_modal_about_page_item", ["item" => $item, 'is_admin' => $is_admin]) ?>
            </li>
        <?php endforeach; ?>
    </ul>
</div>