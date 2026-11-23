<?php
// normal case: we're displaying a list item
if (!empty($item['version'])) : ?>
    <span><?= $item['name'] ?></span>
    <div class="d-flex align-items-center gap-2">
    <?php // data labels
    if (isset($item['licence'])) : ?>
        <span class="label label-inline label-light font-weight-bold"><?= $item['licence'] ?></span>
    <?php endif; ?>
    <?php if ($is_admin) : /* Display versions only to (business) admin users */ ?>
        <?php if (!empty($item['version']['complement'])) { ?>
            <span class="label label-inline label-light font-weight-bold"><?= $item['version']['complement'] ?></span>
        <?php } ?>
        <span class="label label-inline label-dark font-weight-bold"><?= $item['version']['number'] ?></span>
    <?php endif; ?>
    <?php // eventual subitem
    if (isset($item["subitem"]) && $is_admin) : ?>
        <ul class="list-group">
            <?php foreach ($item["subitem"] as $subitem) : ?>
                <li class="list-group-item ml-auto border-0">
                    <small><strong><?= $subitem[0] . ":" ?></strong>&nbsp;<?= $subitem[1] ?></small>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
    </div>
<?php // special case: we're displaying a subtitle
else : ?>
    <span class="mx-auto font-weight-bold font-size-h3"><?= t($item['name'], ["@site_name" => variable_get("site_name", "GoFAST")], ["context" => "gofast"]) . ":" ?></span>
<?php endif; ?>