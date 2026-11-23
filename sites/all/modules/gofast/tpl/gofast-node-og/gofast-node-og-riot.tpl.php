    <?php if ($node->field_riot_identifier[LANGUAGE_NONE][0]['value'] != '') : ?>
      <?php if (variable_get("gofast_configuration_hide_element_chat", false) == false) : ?>
        <iframe src="" id="gf_conversation" style="width:100%;height: calc(100vh - 180px);border:none;"></iframe>
      <?php else : ?>
        <div style="width:90%;padding-left:70px;padding-top:20px;"><h4><?php echo t("This feature has been disabled on your server", [], array("context" => "gofast:gofast_riot")); ?></h4></div>
      <?php endif; ?>
    <?php else : ?>
      <span class="RiotMessageRoom"> <?php print t('This collaboratif space does not have any chatroom yet.'); ?>
        <?php global $user;
        if (in_array('administrator member', gofast_og_get_user_final_roles_for_space('node', $node->nid, $user->uid), true) || $user->uid == 1) : ?>
          <?php print t('The administrator of this space can create a chatroom via the context actions menu.'); ?>
          ( <i class="fa fa-bars" aria-hidden="true"></i> )
      </span>
    <?php else : ?>
      <?php print t('Please contact a space administrator (“Members” tab) to ask for the creation of a linked chatroom.'); ?></span>
    <?php endif; ?>

    <?php endif; ?>
<script>
  jQuery(document).ready(function() {
    if(jQuery("#gf_conversation").length){
      const waitForSessionReadyInterval = setInterval(() => {
        if (!document.querySelector("#gf_conversation") || !Gofast.Riot?.sessionReady) {
          return;
        }
        clearInterval(waitForSessionReadyInterval);
        document.querySelector('#gf_conversation').setAttribute('src', "/sites/all/libraries/riot/index.html#/room/<?= $node->field_riot_identifier[LANGUAGE_NONE][0]['value'] ?>");
        document.querySelector('#gf_conversation').setAttribute("data-room", "<?= $node->field_riot_identifier[LANGUAGE_NONE][0]['value'] ?>");
      }, 100);
      // Load settings icon and fix to fetch assets from the conversation
      const waitForConversationPageLoadInterval = setInterval(() => {
        if (!document.querySelector("#gf_conversation") || !document.querySelector("#gf_conversation")?.contentWindow?.document?.querySelector(".mx_MatrixChat")) {
          return;
        }
        clearInterval(waitForConversationPageLoadInterval);
        jQuery("#gf_conversation").contents().find('body').addClass("space-context");
      }, 100);
    }
  })
</script>