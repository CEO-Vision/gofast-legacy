<?php global $user; ?>
<div class="d-flex mb-5">
    <div id="in-charge-spaces-search" class="input-group">
        <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-filter icon-nm"></i></span></div>
        <input id="in-charge-spaces-search-input" type="text" class="form-control form-control-sm m-0 h-100" placeholder="<?php echo t('Filter', array(), array('context' => 'gofast:gofast_menu')); ?>" aria-describedby="sizing-addon3">
    </div>
</div>
<div id="in-charge-spaces-container" class="bookmark_in_charge_spaces_container h-100">
    <ul class="navi" id="in-charge-spaces">
        <?php foreach ($in_charge_spaces as $in_charge_space) : ?>
            <li class="d-flex justify-content-between align-items-center active-item">
                <a class="cursor-pointer" href="/node/<?= $in_charge_space->entity_id ?>">
                    <i style="width: 2rem;" class="fas fa-<?= $bundle_icons[$in_charge_space->bundle] ?>"></i>
                    <span><?= $in_charge_space->title ?></span>
                </a>
                <?php if ($in_charge_space->field_date_value) :?>
                    <span class="text-muted"><?= format_date(strtotime($in_charge_space->field_date_value), "short_without_hours"); ?></span>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
    <nav class="text-center mt-4">
        <ul class="pagination pagination-sm justify-content-center" id="in-charge-spaces-pager"></ul>
    </nav>
</div>
<script>
    jQuery("#in-charge-spaces").pager({
        pagerSelector: "#in-charge-spaces-pager",
        perPage: 10,
        numPageToDisplay: 5,
        isFlex: true,
        filterSelector: ".active-item",
    });
    jQuery("#in-charge-spaces-search-input").on("input", function() {
        const $input = jQuery(this);
        if ($input.val().trim().length < 3) {
            jQuery("#in-charge-spaces li").addClass("active-item");
            jQuery("#in-charge-spaces").get(0).refreshPager();
            return;
        }
        let inputValue = $input.val().trim().toLowerCase();
        for (const element of jQuery("#in-charge-spaces li span")) {
            const $element = jQuery(element);
            const elementValue = $element.text().toLowerCase();
            if (elementValue.includes(inputValue)) {
                $element.closest("li").addClass("active-item");
            } else {
                $element.closest("li").removeClass("active-item");
            }
        }
        jQuery("#in-charge-spaces").get(0).refreshPager();
    });
</script>