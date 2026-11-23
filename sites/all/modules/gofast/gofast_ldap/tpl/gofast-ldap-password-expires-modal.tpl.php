<?php $site_name = variable_get('site_name', 'GoFast'); ?>
<style>.modal-header .close { display: none; }</style>
<?php $message = $password_expiration < time() ? t("Your password has expired", [], ["context" => "gofast:gofast_ldap"]) : t("Your password expires on %time", ["%time" => format_date($password_expiration, "short")], ["context" => "gofast:gofast_ldap"]); ?>

<div class='alert alert-custom alert-notice alert-light-warning' role='alert'>
    <div class='alert-icon'><i class='flaticon-warning'></i></div>
    <div class='alert-text m-0'>
        <span><?= $message ?></span>
    </div>
</div>
<?php
    // gofast_modal.js extracts .btn elements individually into #modal-footer which is hardcoded justify-content-start
    // no-footer skips that extraction ; modal-footer-element moves the whole wrapper into the footer instead, preserving layout control 
?>
<div class='d-flex justify-content-between gap-2 w-100 modal-footer-element'>
    <a href='/profile/change-password' class='btn btn-primary gofast-non-ajax no-footer'><?= t("Change password", [], ["context" => "gofast:gofast_ldap"]) ?></a>
    <button type='button' class='btn btn-danger ctools-close-modal no-footer'><?= t("Cancel", [], ["context" => "gofast:gofast_ldap"]) ?></button>
</div>