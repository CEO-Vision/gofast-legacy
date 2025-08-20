<div id="too-large-preview" class="d-flex justify-content-center h-100 align-items-center invisible">
  <h2><?= t("@extension preview can't be generated on file bigger than @max_size", array("@extension" => strtoupper($extension), "@max_size" => $max_size), array("context" => "gofast:gofast_cmis")) ?></h2>
</div>
<script>
  jQuery(document).ready(function() {
    $("#container_preview_element").addClass("no-spinner");
    $("#too-large-preview").removeClass("invisible");
  })
</script>