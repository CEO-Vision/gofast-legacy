<?php if (isset($popover_content)) : ?>
    <a class="btn gofast__popover btn-link-success text-muted " role="button" tabindex="0" data-toggle="popover" data-trigger="hover" title="" data-html="true" data-content="<?php print '<div class=\'search-advanced-tags-popover\'>' . $popover_content . '</div>'; ?>">
      <i class="fas fa-search icon-nm text-muted"></i>
      <?php print $button_text; ?>
    </a>
  <?php endif; ?>
<style>
  .search-advanced-tags-popover {
    display: grid;
    row-gap: .75rem;
    margin: 1rem 2rem;
  }
  .search-advanced-tags-popover > .badge {
    font-size: unset;
  }
</style>