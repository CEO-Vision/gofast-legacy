<?php
$is_login_form_disabled = (bool)variable_get("gofast_disable_login_form", false) === true;
$is_password_reset_disabled = (bool) variable_get("gofast_disable_password_reset") === true;
if($is_login_form_disabled){$hidden_class = "d-none";}  ?>
    <div class="d-flex flex-column align-items-center">
      <?php if(isset($form['saml_sp_drupal_login_links'])): ?>
        <div class="GofastLoginField login-double-max-width w-100">
          <?php print render($form['saml_sp_drupal_login_links']); ?>
        </div>
      <?php endif; ?>
      <div class="GofastLoginField login-max-width w-100 <?php echo $hidden_class; ?>">
        <label class="font-size-h6 font-weight-bolder text-dark"><?php print t('Username'); ?> *</label>
        <span class ="badge badge-pill badge-light-info"
          title="<?= t("Please use your actual username, an email will not work.", array(), array("context" => "gofast: gofast_user")) ?>"
          data-toggle="tooltip"
          data-placement="right"
          style="cursor: initial;"
        ><i class="fas fa-question"></i></span>
        <?php print render($form['name']); ?>
      </div>
      <div class="GofastLoginField login-max-width w-100">
        <div class="d-flex mt-n5 align-items-baseline <?= $is_login_form_disabled ? 'justify-content-center' : 'justify-content-between' ?>">
          <label class="font-size-h6 font-weight-bolder text-dark pt-5 mr-5 <?php echo $hidden_class; ?>"><?php print t('Password'); ?> *</label>
          <?php if(!$is_password_reset_disabled): ?>
            <span class="password-link text-primary font-size-h6 font-weight-bolder text-hover-primary pt-5">
              <a href="/user/password">
                <?php echo t('Forgot your password?'); ?>
              </a>
            </span>
            <?php if ($is_login_form_disabled && $form['#gofast_keycloak_idp'] !== null) { ?>
              <span class ="badge badge-pill badge-light-info ml-5"
                title="<?= htmlspecialchars(t(
                  'Resetting a user password only works for users logging in exclusively trough the "!idp_link_label" link',
                  array(
                    '!idp_link_label' => t('Log in using @idp_name', array('@idp_name' => $form['#gofast_keycloak_idp']->name))
                  ),
                  array("context" => "gofast")
                )) ?>"
                data-toggle="tooltip"
                data-placement="bottom"
                style="cursor: initial;"
              ><i class="fas fa-question"></i></span>
            <?php } ?>
          <?php endif; ?>
        </div>
        <span class="<?php echo $hidden_class; ?>"><?php print render($form['pass']); ?></span>
      </div>
        <div class="pb-lg-0 pb-5 font-weight-bolder login-max-width w-100 <?php if($is_login_form_disabled){echo "d-none";}else{echo "d-flex";}  ?> justify-content-center">
          <?php echo render($form['actions']); ?>
        </div>
      <div class="d-none"><?php echo drupal_render_children($form); ?></div>
    </div>
<?php if (!gofast_ldap_is_directory_reachable()) : ?>
<script>
  jQuery(document).ready(function() {
    Gofast.toast(Drupal.t("Unable to reach the company directory. If the problem persists, please contact your IT department.", {}, {context: 'gofast:gofast_ldap'}), "warning");
    jQuery("#edit-submit").attr("disabled", true).css("cursor", "not-allowed");
  });
</script>
<?php endif; ?>