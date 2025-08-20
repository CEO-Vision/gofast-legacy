<select class="form-control form-select gofastSelect2 wf-process-select" data-process-id="<?= $variables["process_id"] ?>" style="width: 90%;">
    <option value="0"> <?php print t("Default"); ?> </option>
    <?php foreach ($variables['profils']  as $profil) : ?>
        <option value="<?php print $profil->id ?>"><?php print $profil->name ?></option>
    <?php endforeach ?>
</select>


<div class="gofast_wf_actions">
    <?php echo $actions; ?>
</div>
