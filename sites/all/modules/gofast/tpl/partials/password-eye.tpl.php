<div <?= drupal_attributes($element['#attributes'])?>>
  <input <?= drupal_attributes($element['#inner_input']['#attributes'])?> />
  <div class="input-group-append">
    <button <?= drupal_attributes($element['#inner_button']['#attributes']) ?>>
      <i class="fas <?= $element['#show_password'] ? 'fa-eye' : 'fa-eye-slash' ?>"></i>
    </button>
  </div>
</div>
