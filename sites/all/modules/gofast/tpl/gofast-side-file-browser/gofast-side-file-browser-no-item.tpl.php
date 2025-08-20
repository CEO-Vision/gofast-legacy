<?php if($node_type) : ?>
<a href="/node/add/<?= $node_type ?>" class="d-flex align-items-center justify-content-center text-muted h-100" style="gap: 1rem;">
    <i class="fas fa-plus fa-2x"></i>
    <span class="font-size-h3"><?= strtoupper(gofast_get_node_bundle_label($node_type, false)); ?></span>
</a>
<?php endif; ?>