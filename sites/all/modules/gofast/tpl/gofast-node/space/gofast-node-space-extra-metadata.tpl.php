<?php
$extra_metadata_types = gofast_metadata_get_extra_metadata_types();
foreach ($extra_infos as $key => $info) {
    $type = $info["type"];
    $order = $info["order"] ?? 999;
    if (in_array($type, array_keys($extra_metadata_types))) {
        echo theme("gofast_node_extra_metadata_wrapper", ["before" => TRUE, "info" => $info]);
        echo theme("gofast_node_extra_metadata_{$type}", ["info" => $info]);
        echo theme("gofast_node_extra_metadata_wrapper", ["after" => TRUE, "info" => $info]);
    } else { ?>
        <div class="alert alert-custom alert-light-warning fade show mb-5" role="alert">
            <div class="alert-text"><?= t("The %theme theme was not found.", ["%theme" => "gofast_node_extra_metadata_{$info["type"]}"]) ?></div>
        </div>
<?php }
} ?>