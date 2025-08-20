<?php 
    $has_children = (isset($item->children) && count((array) $item->children) > 0);
?>
<?php if ($depth == 0) : ?>
<table class="side_element-explorer-element-table w-100" id="<?= random_int(0, 999999) ?>">
<?php endif; ?>
    <tr <?= $item->nid ? 'data-nid="'. $item->nid .'"' : "" ?> data-depth="<?= $depth ?>" data-name="<?= $item->name ?>" id="<?= $item->id ?>" data-pid="<?= $item->pid ?>" class="side-explorer-element side-explorer-element-<?php echo $depth == 0 ? 'visible' : 'collapsed'; ?>">
        <td style="width: <?php echo $depth * 1.5; ?>em;">
        </td>
        <td class="side-explorer-element-parent" style="display: none;">
            <?= $item->pid ?>
        </td>
        <td class="side-explorer-element-seechild">
            <?php echo $has_children ? '<i class="side-explorer-element-open ki ki-bold-arrow-next"></i>' : ''; ?>
        </td>
        <td class="side-explorer-element-icon">
            <i class="<?php echo $item->icon ?>"></i>
        </td>
        <td class="side-file-explorer-element-name side-explorer-element-name w-100 d-flex align-items-center justify-content-between" title="<?= $item->description ?? $item->name ?>" data-placement="top" data-toggle="tooltip" data-trigger="hover">
            <a class="wiki-tree-widget-item-name item-name" href="<?= $item->link_path ?>">
              <?= is_numeric($item->weight) ? "<strong>W"  . str_pad($item->weight, 3, "0", STR_PAD_LEFT) . "</strong> - " . $item->name : $item->name ?>
            </a>
            <?php if (isset($item->canUpdate) && $item->canUpdate) : ?>
                <div class="d-flex align-items-center mr-2 <?= ($item->edit_link) ? 'mx-1' : 'mx-2' ?>">
                  <?php if($item->add_link): ?>
                    <a href="<?= $item->add_link ?>"><i class="fas fa-plus text-muted cursor-pointer"></i></a>
                  <?php endif ?>
                  <?php if($item->edit_link): ?>
                    <a href="<?= $item->edit_link ?>"style="width: 35%;" class="ctools-use-modal"><i class="fas fa-pen text-muted cursor-pointer"></i></a>
                  <?php endif ?>
                </div>
            <?php endif; ?>
        </td>
    </tr>
    <!-- NESTED items -->
    <?php
    // recursivity allows for rendering of nested items
    if ($has_children) {
        $below_depth = $depth + 1;
        foreach($item->children as $child) {
          echo theme('gofast_side_file_browser_element', ['item' => $child, 'depth' => $below_depth]);
        }
    }
    ?>
<?php if ($depth == 0) : ?>
</table>
<?php endif; ?>