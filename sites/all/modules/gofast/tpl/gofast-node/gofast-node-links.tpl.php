<?php
/**
 * @file
 * Node links fragment used in some workflow dashboards.
 *
 * @see ./gofast-node-links-dashboard.tpl.php for another variant.
 *
 * Input variables:
 * @var numeric $rand_id
 *   Random numeric identifier for the current element.
 * @var object[] $nodes
 *   Array of nodes to link to.
 * @var object $first_node
 *   First individual node to display in place.
 *
 * @see template_preprocess_gofast_node_links()
 *   For variable preprocessing and default values.
 */;

if (count($nodes) > 1) { /* ----- Multiple nodes ------------------------- */ ?>
<div
  class="deadline_box_in_rapide_todoliste"
  style="
    cursor: pointer;
    display: flex;
    position: relative;
    max-width: 100%;
  "
  onmouseout="window.parent.Drupal.gofast_workflows.hideTooltip(event, this);"
  onmouseover="$(this).parent().find('#wf_multiple_docs_'+$(this).data('nid')).css('display', 'block');"
  data-nid="<?= $rand_id ?>"
>
  <span
    id="wf_multiple_docs_<?= $rand_id ?>"
    data-nid="<?= $rand_id ?>"
    style="
      display: none;
      position: absolute;
      z-index: 999;
      min-width: 200px;
      max-width: 100%;
      left: 0;
      top: 100%;
    "
    onmouseover="$(this).parent().find('#wf_multiple_docs_'+$(this).data('nid')).css('display', 'block');"
    onmouseout="window.parent.Drupal.gofast_workflows.hideTooltip(event, this);"
  >
    <div class="panel panel-primary" style="margin-bottom: 0px;">
      <div class="panel-heading">
        <?= (string) t("Associated documents", [], ['context' => 'gofast:gofast_workflows']) ?>
      </div>
      <div class='panel-body'>
        <?php foreach ($nodes as $node) { ?>
        <div
          class='deadline_box_in_rapide_todoliste'
          style='
            max-width: 685px;
            max-height: 22px;
          '
          title="<?= htmlspecialchars($node->title) ?>"
        >
          <span
            style='
              float: left;
              margin-top: -2px;
              color: #000000
            '
          ></span>
          <span
            style='
              max-width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              -o-text-overflow: ellipsis;
              display: inline-block;
            '
          >
            <span
              onClick='
                <?php if (gofast_essential_is_essential()) { ?>
                window.parent.parent.Gofast.Essential.processEssentialAjax("/node/<?= $node->nid ?>");
                <?php } else { ?>
                window.parent.parent.Gofast.processAjax("/node/<?= $node->nid ?>");
                <?php } ?>

                window.parent.parent.modalContentClose();
              '
            >
              <?= (string) theme(
                'node_title',
                [
                  'node' => $node,
                  'link' => FALSE,
                  'title_tag' => 'a',
                  'title_attr' => 'href',
                ],
              ) ?>
            </span>
        </div>
        <?php } ?>
      </div>
    </div>
  </span>
  <span style='max-width: calc(100% - 20px);'>
    <?= (string) theme(
      'node_title',
      ['node' => $first_node, 'link' => FALSE],
    ) ?>
  </span>
  <span
    class="fa fa-caret-down"
    title="Documents"
    style="
      margin-top: 4px;
      padding-left: 5px;
    "
  >
    <span style="clear:both;"></span>
  </span>
</div>
<?php } else { /* ----- Single node -------------------------------------- */ ?>
<span
  style='
    cursor: pointer;
    color: #337ab7;
    max-width: 100%;
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
