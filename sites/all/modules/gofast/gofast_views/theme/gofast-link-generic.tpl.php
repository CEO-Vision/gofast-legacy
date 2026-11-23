  <?php if ($flag == TRUE) : ?>
    <span class="flag-wrapper">
  <?php endif; ?>
  <?php if(!empty($text)):  ?> 
    <?php
    print '<a ';

    $on_click_impl = $onClick;
    // Override onclick with implementation to prevent any other handler from applying
    // if link is disabled.
    if ($disabled) {
      $on_click_impl = "if(this.classList.contains('disabled')){event.preventDefault();event.stopImmediatePropagation();}";
    }

    print 'class="navi-link ' . $link_class .' '. (!empty($disabled) ? "disabled" : "").'" '
      . 'id="' . $link_id . '" '
      . (isset($href) ? 'href="' . $href . '" ' : '')
      . (isset($on_click_impl) ? 'onClick="' . $on_click_impl . '" ' : '')
      . (isset($alt) ? 'alt="' . $alt . '" ' : '')
      . (isset($target) ? 'target="' . $target . '" ' : '')
      . (isset($title) ? 'title="' . $title . '" ' : '')
      . '>';
    
    if($svg){
      print '<span class="navi-icon"><img class="' . $icon_class . '" src="' . $svg . '" /></span>' . '<span class="navi-text">' . (isset($text) ? $text : '') . '</span>';
    }else{
      print '<span class="navi-icon"><i class="' . $icon_class . '"></i></span>' . '<span class="navi-text">' . (isset($text) ? $text : '') . '</span>';
    }
    
    print '</a>';
    ?>
    <?php endif; ?>
  <?php if ($flag == TRUE) : ?>
    </span>
  <?php endif; ?>
  <?php if($divider): ?>
    <li class='navi-separator my-3'></li>
  <?php endif; ?>
