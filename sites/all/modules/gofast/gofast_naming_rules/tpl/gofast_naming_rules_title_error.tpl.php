<?php
/**
 * @file
 * Error shown in the confirm modal when a naming rule would produce an invalid
 * title.
 *
 * Available variables:
 * - $errors: string[] validation messages.
 * - $chars: string[] forbidden characters found in the generated title.
 */
?>
<div class="alert alert-custom fade show mb-5 alert-light-danger messages error">
    <div class="alert-icon">
        <i class="flaticon-warning"></i>
    </div>
    <div class="ml-6" style="font-size: 1.2rem;">
        <p><b><?= t("One of these fields contains unsupported characters and the naming rule would produce an invalid title:", [], ['context' => 'gofast:gofast_naming_rules']) ?></b></p>
        <ul>
        <?php foreach($errors as $error) : ?>
            <li>
                <i><?= $error ?></i>
            </li>
        <?php endforeach; ?>
        </ul>
        <?php if (!empty($chars)) : ?>
            <p class="mt-6 mb-0"><b class="mr-2"><?= t("Characters not allowed:", [], ['context' => 'gofast:gofast_naming_rules']) ?> </b>"<?= check_plain(implode(' ', $chars)) ?>"</p>
        <?php endif; ?>
    </div>
</div>


