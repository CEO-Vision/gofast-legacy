<?php foreach ($extra_infos as $key => $info) { ?>
    <?= theme("gofast_node_extra_metadata_wrapper", ["before" => TRUE, "info" => $info]) ?>
    <?php if ($info['type'] == 'separator') : ?>
        <div class="separator separator-solid my-4"></div>
    <?php else : ?>
        <?php if (!empty($info["value"])) : ?>
            <span class="p-2 text-wrap text-right"><?php echo $info['value']; ?></span>
        <?php endif; ?>
    <?php endif; ?>
    <?= theme("gofast_node_extra_metadata_wrapper", ["after" => TRUE, "info" => $info]) ?>
<?php } ?>