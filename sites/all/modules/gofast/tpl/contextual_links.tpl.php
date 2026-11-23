<div class="contextual-actions-container font-weight-normal d-flex <?= gofast_essential_is_essential() ? "" : "justify-content-center" ?>" id="<?php print $btn_group_id; ?>">
    <div class="contextual-actions btn-group btn-group-xs" role="group" aria-label="contextual actions">
        <?php foreach ($buttons as $btn) : ?>
            <?php
            $classes = isset($btn['classes']) ? implode(" ", $btn['classes']) : '';
            $buttonText = isset($btn['button-text']) ? $btn['button-text'] : '';
            ?>
            <?php if (isset($btn['children'])) : ?>
                <?php $contextual_menu = $btn; ?>
            <?php elseif(isset($btn['title'])) : /* Handle buttons with icons/titles, wrapper span
                allows title to show even when button is disabled. The wrapper needs all buttons
                classes to be kept in the button group aesthetics-wise. The inline style
                'pointer-events' counters the disabled state for the tooltip. This is super hacky,
                but unless JS is involved, it's the only way to make Bootstrap behave here while
                playing by their rules. */ ?>
                <span
                    class="
                        d-inline-block
                        btn
                        btn-sm
                        btn-icon
                        btn-outline-secondary
                        position-relative
                        <?php if(isset($btn['disabled'])) : ?>disabled<?php endif ?>
                        <?= $classes ?>
                    "
                    style="pointer-events: auto;"
                    data-toggle="tooltip"
                    data-placement="bottom"
                    data-delay='{"show": 250, "hide": 0}'
                    data-trigger="hover"
                    title="<?= t($btn['title'], array(), array('context' => 'gofast:gofast_workflows')) ?>"
                    <?php if(isset($btn['id'])) : ?>id="<?="{$btn['id']}--wrapper"?>"<?php endif ?>
                >
                    <a
                        type="button"
                        class="btn btn-icon btn-sm position-relative overflow-hidden <?php echo $classes ?>"
                        <?php if (isset($btn['id'])) : ?> id="<?php echo $btn['id'] ?>" <?php endif ?>
                        <?php if (isset($btn['href'])) : ?> href="<?php echo $btn['href'] ?>" <?php endif ?>
                        <?php if (isset($btn['disabled'])) : ?> disabled aria-disabled="true" <?php endif ?>
                        <?php if (isset($btn['onClick'])) : ?> onClick=<?php echo $btn['onClick'] ?> <?php endif ?>
                        <?php if (isset($btn['alt'])) : ?> alt="<?php echo $btn['alt'] ?>" <?php endif ?>
                        <?php if (isset($btn['target'])) : ?> target="<?php echo $btn['target'] ?>" <?php endif ?>
                    >
                        <?php if (isset($btn['avatar'])) : ?>
                            <?php echo $btn['avatar'] ?>
                        <?php endif ?>
                        <?php if (isset($btn['icon-class'])) : ?>
                        <i class="<?php echo $btn['icon-class'] ?> icon-nm"></i>
                        <?php endif ?>
                    </a>
                </span>
            <?php endif ?>
        <?php endforeach ?>
    </div>

    <?php if (!empty($contextual_menu)) : ?>
        <?php $detect = new Mobile_Detect(); ?>
        <div class="dropdown ml-3 <?= $fromBrowser && !$isSpace || (gofast_essential_is_essential() && !$isSpace) ? "dropleft" : "" ?>" style="<?= gofast_essential_is_essential() ? "position:absolute;right:0;" : "" ?>">

            <div class="dropdown-menu dropdown-menu-md py-5" aria-labelledby="dropdown-<?php echo $contextual_menu['id'] ?>">
                <ul class="navi navi-hover navi-link-rounded-lg px-1">
                    <?php foreach ($contextual_menu['children'] as $item) : ?>
                        <?php if ($item['divider'] == TRUE) : ?>
                         <li class='navi-separator my-3'></li>
                        <?php elseif ($item['children'] && !empty($item['children'])) : ?>
                            <li class="collapsed dropdown-submenu navi-item">
                                <div class="dropdown gofastDropdown">
                                    <a class="dropdown-toogle">
                                    <?php echo $item['themed'] ?>
                                </a>
                                <div class="dropdown-menu dropdown-menu-md py-5 <?= $_POST['dropleft'] || $contextual_menu['dropleft'] ? "dropleft" : "" ?>" aria-labelledby="dropdown-<?php echo $contextual_menu['id'] ?>">
                                    <ul class="navi navi-hover navi-link-rounded-lg px-1">
                                        <?php foreach ($item['children'] as $item) : ?>
                                            <li <?php if (isset($item['title'])) : ?> data-boundary="window" data-toggle="tooltip" data-placement="left" data-theme="dark" data-trigger="hover" data-html="true" title="<?php print $item['title']; ?>" <?php endif ?> class="navi-item"><?php echo $item['themed']; ?></li>
                                        <?php endforeach ?>
                                    </ul>
                                </div>
                            </div>
                        </li>
                    <?php else : ?>
                        <li class="navi-item<?php if (isset($item['disabled']) && $item['disabled']) : ?> disabled<?php endif;?>" <?php if (isset($item['title']) && !empty($item['title'])) : ?> data-boundary="window" data-toggle="tooltip" data-placement="left" data-theme="dark" data-trigger="hover" data-html="true"  title="<?php print $item['title']; ?>" <?php endif ?>><?php echo $item['themed'] ?></li>
                    <?php endif ?>
                <?php endforeach ?>
            </ul>
        </div>
        <a type="button" class="btn btn-primary btn-icon btn-sm position-relative" <?php if (isset($contextual_menu['id'])) : ?> id="dropdown-<?php echo $contextual_menu['id'] ?>" <?php endif ?> <?php if (isset($contextual_menu['title'])) : ?> title="<?php echo t($contextual_menu['title'], array(), array('context' => 'gofast:gofast_workflows')) ?>" <?php endif ?> data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i class="<?php echo $contextual_menu['icon-class'] ?> icon-nm"></i>
        </a>
    </div>
    <?php endif; ?>
    <script>
      jQuery(document).ready(function() {
        jQuery("#refresh_actions_button").removeClass("d-none");
        // GOFAST-8671: if submenu overflows from its parent, translate it so it actually starts at the top of its parent
        jQuery('.contextual-actions ~ .dropdown').on('shown.bs.dropdown', function() {
          jQuery(".gofastDropdown .dropdown-menu").css("visibility", "hidden");
          jQuery(".gofastDropdown .dropdown-menu").css("display", "block"); // for the element to actually have a size while remaining invisible
          jQuery.each(jQuery(".gofastDropdown .dropdown-menu"), (i, el) => {
            const $subMenu = $(el);
            if (!$subMenu.length) {
              return;
            }
            const subMenuRelativePosition = $subMenu[0].getBoundingClientRect();
            $subMenu.css("display", "");
            $subMenu.css("visibility", "");
            const subMenuOverflows = subMenuRelativePosition.top < 0;
            if (subMenuOverflows) {
              $subMenu.css("cssText", "position: fixed; top: 0 !important; height: min-content;");
            }
          })
        });
        // Disable click on disabled links
        jQuery('.navi-link.disabled').on('click', function(event) {
        event.preventDefault();
        return false;
        });
      });
    </script>
</div>
