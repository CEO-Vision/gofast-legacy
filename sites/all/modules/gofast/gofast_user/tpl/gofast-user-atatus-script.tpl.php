<?php
global $base_url;
global $conf;
global $user;
$http_bind_url = 'https://' . $conf['gofast-comm_domain'] . '/http-bind';
$poll_url = $base_url . "/gofast/poll";
$detect = new Mobile_Detect();
?>
<div id="atatus-script-section">
    <?php if (isset($conf['gofast-atatus-key']) && user_load($user->uid)->field_atatus_tracking[LANGUAGE_NONE]['0']['value'] == 2) : ?>
        <script src="https://dmc1acwvwny3.cloudfront.net/atatus-spa.js"></script>
        <script type="text/javascript">
            atatus.config('<?php echo variable_get('gofast-atatus-key'); ?>', {
                ignoreUrls: ['<?php echo $http_bind_url; ?>', '<?php echo $poll_url; ?>']
            }).install();

            var atatusInterval = setInterval(function() {
                if (typeof Gofast == "object" &&
                    typeof Gofast._settings == "object" &&
                    typeof Gofast._settings.gofast_version == "string" &&
                    typeof Gofast._settings.gofast == "object" &&
                    typeof Gofast._settings.gofast.user == "object" &&
                    typeof Gofast._settings.gofast.user.uid == "string") {
                    atatus.setVersion(Gofast._settings.gofast_version);
                    atatus.setUser(Gofast._settings.gofast.user.uid);
                    clearInterval(atatusInterval);
                }
            }, 500);
        </script>
        <?php // if the atatus tag has been passed directly to the template, use the passed tag 
        ?>
        <?php if (isset($atatus_tag)) : ?>
            <script type="text/javascript">
                atatus.setTags(["<?= trim($atatus_tag) ?>"]);
            </script>
        <?php elseif (gofast_essential_is_essential()) : ?>
            <?php if (gofast_mobile_is_phone()) : ?>
                <script type="text/javascript">
                    atatus.setTags(['mobile']);
                </script>
            <?php elseif ($detect->isTablet()) : ?>
                <script type="text/javascript">
                    atatus.setTags(['tablet']);
                </script>
            <?php else : ?>
                <script type="text/javascript">
                    atatus.setTags(['essential']);
                </script>
            <?php endif; ?>
        <?php else : ?>
            <script type="text/javascript">
                atatus.setTags(['plus']);
            </script>
        <?php endif; ?>
    <?php endif; ?>
</div>