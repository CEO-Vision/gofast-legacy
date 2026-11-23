<?php
/**
 * @file
 * Node links fragment used in some workflow dashboards.
 *
 * @see ./gofast-node-links.tpl.php for another variant.
 *
 * Input variables:
 * @var numeric $rand_id
 *   Random numeric identifier for the current element.
 * @var object[] $nodes
 *   Array of nodes to link to.
 * @var object $first_node
 *   First individual node to display in place.
 *
 * @see template_preprocess_gofast_node_links_dashboard()
 *   For variable preprocessing and default values.
 */;

if (count($nodes) > 1) { /* ----- Multiple nodes ------------------------- */ ?>
  <?php foreach ($nodes as $node) { ?>
    <span
      style='
        float: left;
        margin-top: -2px;
        color: #000000
      '
    ></span>
    <span
      style='
        max-width: 680px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        -o-text-overflow: ellipsis;
        display: inline-block;
      '
    >
      <span>
        <?= (string) theme(
          'node_title',
          ['node' => $node],
        ) ?>
      </span>
    </span>
  <?php } ?>
<?php } else { /* ----- Single node -------------------------------------- */ ?>
<span
  style='
    cursor: pointer;
    color: #337ab7;
  '
  onClick='
    <?php if (gofast_essential_is_essential()) { ?>
    window.parent.parent.Gofast.Essential.processEssentialAjax("/node/<?= $first_node->nid ?>");
    <?php } else { ?>
    window.parent.parent.Gofast.processAjax("/node/<?= $first_node->nid ?>");
    <?php } ?>

    window.parent.parent.modalContentClose();
  '
>
  <?= (string) theme(
    'node_title',
    ['node' => $first_node, 'link' => FALSE],
  ) ?>
</span>
<?php } ?>
