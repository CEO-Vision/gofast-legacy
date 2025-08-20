<?php $site_name = variable_get('site_name', 'GoFast'); ?>
<?php $message = $password_expiration < time() ? t("Your password has expired", [], ["context" => "gofast:gofast_ldap"]) : t("Your password expires on %time", ["%time" => format_date($password_expiration, "short")], ["context" => "gofast:gofast_ldap"]); ?>

<div class='alert alert-custom alert-notice alert-light-warning' role='alert'>
    <div class='alert-icon'><i class='flaticon-warning'></i></div>
    <div class='alert-text m-0'>
        <span><?= $message ?></span>
    </div>
</div>
<a href='/profile/change-password' class='gofast-non-ajax'><?= t("Change it immediately here.", [], ["context" => "gofast:gofast_ldap"]) ?></div>