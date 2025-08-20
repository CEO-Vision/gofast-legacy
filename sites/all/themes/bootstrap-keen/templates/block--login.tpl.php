<?php

/**
 * @file
 * Default theme implementation to display a block.
 *
 * Available variables:
 * - $block->subject: Block title.
 * - $content: Block content.
 * - $block->module: Module that generated the block.
 * - $block->delta: An ID for the block, unique within each module.
 * - $block->region: The block region embedding the current block.
 * - $classes: String of classes that can be used to style contextually through
 *   CSS. It can be manipulated through the variable $classes_array from
 *   preprocess functions. The default values can be one or more of the
 *   following:
 *   - block: The current template type, i.e., "theming hook".
 *   - block-[module]: The module generating the block. For example, the user
 *     module is responsible for handling the default user navigation block. In
 *     that case the class would be 'block-user'.
 * - $title_prefix (array): An array containing additional output populated by
 *   modules, intended to be displayed in front of the main title tag that
 *   appears in the template.
 * - $title_suffix (array): An array containing additional output populated by
 *   modules, intended to be displayed after the main title tag that appears in
 *   the template.
 *
 * Helper variables:
 * - $classes_array: Array of html class attribute values. It is flattened
 *   into a string within the variable $classes.
 * - $block_zebra: Outputs 'odd' and 'even' dependent on each block region.
 * - $zebra: Same output as $block_zebra but independent of any block region.
 * - $block_id: Counter dependent on each block region.
 * - $id: Same output as $block_id but independent of any block region.
 * - $is_front: Flags true when presented in the front page.
 * - $logged_in: Flags true when the current user is a logged-in member.
 * - $is_admin: Flags true when the current user is an administrator.
 * - $block_html_id: A valid HTML ID and guaranteed unique.
 *
 * @see bootstrap_preprocess_block()
 * @see template_preprocess()
 * @see template_preprocess_block()
 * @see bootstrap_process_block()
 * @see template_process()
 *
 * @ingroup templates
 */

 $theme = variable_get('theme_bootstrap_gofast_settings');
 $position = $theme['position'];
 $enable = $theme['toggle_logo'];
 $logoPath = $theme['logo_path'];
 $messages = $variables["elements"]["messages"];
 
 if ($enable == 1 && $logoPath !== null && $logoPath !== '') {
   $imageUrl = file_create_url($logoPath);
   switch ($position) {
     case 1:
       $containerClass = 'd-flex justify-content-end align-items-center';
       break;
     case 2:
       $containerClass = 'd-flex justify-content-end align-items-end';
       break;
     case 3:
       $containerClass = 'd-flex';
       break;
     default:
       $containerClass = '';
       break;
   }
 }
?>
<div class="h-100 d-flex flex-column justify-content-center">
  <div class="flex-column <?php echo ($position == 2) ? ' ' . $containerClass : ' d-none'; ?>" >
    <img class="h-70px mb-8" src="<?php print $imageUrl; ?>" alt="Plateform logo" >
    <h3 class="font-weight-bolder text-center font-size-h4 font-size-h1-lg text-black" ><?php print variable_get('site_name', ''); ?></h3>
  </div>

  <div class="d-flex flex-column-fluid flex-center">
    <div class="d-flex h-100 w-100 justify-content-center" id="content-main-container">
      <div class="my-20" style=" width: 100%;">
        <div id="ajax_content">
          <div class="d-flex h-100 w-100 justify-content-center" id="content-main-container">
            <div class="flex-column mb-15 <?php echo ($position == 1) ? ' ' . $containerClass : ' d-none'; ?>" >
              <img class="h-70px mb-8" src="<?php print $imageUrl; ?>" alt="Plateform logo" >
              <h3 class="font-weight-bolder text-center font-size-h4 font-size-h1-lg text-black" ><?php print variable_get('site_name', ''); ?></h3>
            </div>
          </div>
          
          <div id="block-user-login-messages">
            <?php print $messages; ?>
          </div>
          <section id="<?php print $block_html_id; ?>" class="<?php print $classes; ?>" <?php print $attributes; ?>>
          
            <?php print render($title_prefix); ?>
              <?php if ($title) : ?>
                <div class="pb-13 pt-lg-0 pt-5">
                  <div class="font-weight-bolder text-dark font-size-h4 font-size-h1-lg"><?php print t($title, array(), array('context' => 'gofast')); ?></div>
                </div>
              <?php endif; ?>
            <?php print render($title_suffix); ?>
          
            <?php print $content ?>
          
          </section>
        </div>
      </div>
    </div>
  </div>

  <div class="login-footer__container d-flex justify-content-center align-items-end py-7 py-lg-0">
    <span class="login-footer font-weight-bolder font-size-h6 mr-1 "><i class="fas fa-2x fa-comments mr-2 align-middle" aria-hidden="true"></i><a href="https://community.ceo-vision.com" target="#blank" class="text-primary font-weight-bolder font-size-h5"><?php print t('Any question?'); ?></a></span>
    <span class="login-footer font-weight-bolder font-size-h6 ml-10 mr-2"> <i class="fas fa-2x fa-book mr-2 align-middle" aria-hidden="true"></i><a href="https://gofast-docs.readthedocs.io/<?= substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);?>/latest/docs-gofast-users/doc-gofast-guide-utilisateurs.html" target="#blank" class="text-primary font-weight-bolder font-size-h5"><?php print t('Documentation') ?></a></span>
  </div>
</div>