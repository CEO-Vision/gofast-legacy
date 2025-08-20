<?php // Reach all the fields of the form ?>
<?php foreach ($fieldsets as $key => $fieldset): ?>
    <div id="accordion-search-<?= $key ?>" class="accordion accordion-solid accordion-toggle-plus gofastBoostrapPanel accordion-advanced-search-standard mb-5">
        <div class="card">
            <div class="card-header" id="section-header-<?= $key ?>">
                <h5 class="mb-0">
                    <div class="card-title <?= $key != "default" ? "collapsed" : "" ?>" data-toggle="collapse" data-parent="#accordion-search-<?= $key ?>" data-target="#section-content-<?= $key ?>" aria-expanded="false">
                        <?= $fieldset['title'] ?>
                    </div>
                </h5>
            </div>
            <div id="section-content-<?= $key ?>" class="collapse <?= $key == "default" ? "show" : "" ?> role="tabpanel" aria-labelledby="section-header-<?= $key ?>" data-parent="#accordion-search-<?= $key ?>">
                <div class="card-body">
                    <div class="row mx-0">
                            <?php foreach ($fieldset['filters'] as $key => $field): ?>
                            <?php if ($field['filter_hidden'] || $field['type'] == "separator"): ?>
                                <?php continue; ?>
                            <?php endif; ?>
                            <div class="GofastForm__Field col-6 col-2xl-4 mb-3">
                                <?= theme('gofast_search_advanced_field', array('field' => $field, 'key' => $key)); ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php endforeach; ?>

