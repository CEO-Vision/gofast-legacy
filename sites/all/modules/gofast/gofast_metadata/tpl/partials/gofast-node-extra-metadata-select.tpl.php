<!-- Begin select type  -->
<a class="btn btn-hover-light btn-sm p-2 document__editable--label text-truncate" id="" title="<?php print $info['info'] ?>"><?php echo $info['info']; ?></a>
<div class="document__editable--divfiel document__editable--select w-100 d-none">
    <select class="form-control form-control-sm document__editable--processe" name="<?php print $info["name"] ?>" data-vid="<?php print $info["vid"]  ?>" data-id="<?php print $info["node_pk"]  ?>" data-placeholder="<?= t('None', array(), array('context' => 'gofast')) ?>" data-allow-clear="true">
        <option></option>
        <?php foreach ($info['fields'] as $value) : ?>
            <?php if (!empty($value['children'])) : ?>
                <optgroup label="<?php print $value["text"]  ?>">
                    <?php foreach ($value['children'] as $child) : ?>
                        <?php if ($child["text"] == "") continue; ?>
                        <?php $select = $info['value'] == $child["text"] ? 'selected' : ''; ?>
                        <option value="<?php echo $child["database_name"] ?>" <?php if ($select != '') : ?> selected="selected" <?php endif ?>><?php print $child["text"] == "" ? t('None') : $child["text"]  ?></option>
                    <?php endforeach ?>
                </optgroup>
            <?php else : ?>
                <?php if ($value["text"] == "") continue; ?>
                <?php $select = $info['value'] == $value["text"] ? 'selected' : ''; ?>
                <option value="<?php echo $value["text"] ?>" <?php if ($select != '') : ?> selected="selected" <?php endif ?>><?php print $value["text"] == "" ? t('None') : $value["text"]  ?></option>
            <?php endif; ?>
        <?php endforeach  ?>
    </select>
</div>
<!-- End select type  -->
