<?php global $base_url; ?>
<div style="background:transparent;background-color:transparent;margin:0px auto;max-width:992px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:transparent;background-color:transparent;width:100%;">
        <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:20px 0;padding-bottom:10px;padding-top:10px;text-align:center;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
</div>
<div style="margin:0px auto;border-radius:10px 10px 0 0;max-width:992px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:white;background-color:white;width:100%;border-radius:10px 10px 0 0;">
        <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;text-align:center;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:992px;" ><![endif]-->
                    <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                            <tbody>
                                <tr>
                                    <td style="background-color:#337ab7;border-radius:10px 10px 0 0;vertical-align:top;padding-left:10px;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#337ab7;border-radius:5px;vertical-align:top;" width="100%">
                                            <tbody>
                                                <tr>
                                                    <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                                        <div style="font-family:Poppins, Candara, Helvetica, Arial, sans-serif;font-size:18px;font-weight:600;line-height:1;text-align:left;color:white;">
                                                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td>
                                                                            <img src="<?= $base_url . '/' . drupal_get_path('module', 'gofast_mail_queue') . '/icon/' . $section_icon . '-white.png' ?>" width="18">
                                                                        <td><span style="color: #FFFFFF; font-size: 18px; font-weight: 600;">&nbsp;<?= $section_title ?></span></td>
                                                                        <td><span style="color: #FFFFFF; font-size: 14px; font-weight: 400;">&nbsp;(<?= format_plural(count($node_array), "1 item", "@nb items", array('@nb' => count($node_array)), $l) ?>)</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-radius:10px 10px 0 0;">
        <tbody>
            <tr>
                <td style="direction:ltr;padding-bottom:10px;padding-top:0px;border-radius: 0 0 10px 10px;background: white;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:992px;" ><![endif]-->
                    <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                            <thead>
                                <tr>
                                    <th style="padding: 10px; background-color:#666666;font-family:Poppins;font-size:14px;font-weight:600;line-height:1;text-align:left;color:white;"><?=t("Type", array(), array('context' => 'gofast_stats', 'langcode' => $langcode))?></th>
                                    <th style="padding: 10px; background-color:#666666;font-family:Poppins;font-size:14px;font-weight:600;line-height:1;text-align:left;color:white;">
                                        <?php switch ($section_icon) {
                                            case "other":
                                                echo  t('Author', array(), array('langcode' => $langcode));
                                                break;
                                            case "conference":
                                                echo  t('Organisator', array(), array('context' => 'gofast:gofast_conference','langcode' => $langcode));
                                                break;
                                            default:
                                            echo  t('Responsible', array(), array('context' => 'gofast_kanban', 'langcode' => $langcode));
                                                break;
                                        }?>
                                    </th>
                                    <th style="padding: 10px; background-color:#666666;font-family:Poppins;font-size:14px;font-weight:600;line-height:1;text-align:left;color:white;"><?= t('Deadline', array(), array('context' => 'gofast', 'langcode' => $langcode))?></th>
                                    <th style="padding: 10px; background-color:#666666;font-family:Poppins;font-size:14px;font-weight:600;line-height:1;text-align:left;color:white;"><?= t("Label", array(), $l)?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($node_array as $node) {
                                    $node_link = $base_url . '/node/' . $node->nid;
                                    $node_icon = str_replace('<span>', '<span style="display:none;">', theme('node_title', array('node' => $node, 'link' => FALSE)));
                                    $document_pic = gofast_mail_queue_fa_png($node_icon, "18");
                                    $item_labels = NULL;
                                    $type="";
                                    switch ($node->type) {
                                        case 'task':
                                            $type=t("Task ", array(), array('langcode' => $langcode));
                                            break;
                                        case 'conference':
                                            $type= t("Conference", array(), array('langcode' => $langcode));
                                            break;
                                        case 'alfresco_item':
                                            $type= t("Document", array(), array('langcode' => $langcode));
                                            break;
                                    }
                                    // $type=t("Card", array(), array('langcode' => $langcode));
                                    if (!empty($node->items)) {
                                        $labels = [];
                                        foreach($node->items as $item) {
                                            $labels[] = $item["item_label"];
                                        }
                                        $item_labels = implode(", ", $labels);
                                        
                                    }
                                    $responsible = isset($node->responsible) ? $node->responsible : NULL;
                                    $node_title = $node->title; ?>
                                    <tr>
                                        <td style="padding: 10px;color: #000000; font-size: 18px;text-align:left;"> <?=$type?></td>
                                        <td style="padding: 10px;color: #000000; font-size: 18px;text-align:left;">
                                            <?php if (isset($responsible)): ?>
                                                <img style="padding-left: 5px; vertical-align: bottom; border-radius: 50%; width:25px;height:25px;" typeof="foaf:Image" src="<?=gofast_get_url_picture_by_id($responsible->picture->fid)?>" alt="<?=t("@user's picture",["@user" => format_username($responsible)],["context" => "gofast:gofast_user"])?>" title="<?=t("@user's picture",["@user" => format_username($responsible)],["context" => "gofast:gofast_user"])?>" />
                                                <span style="font-weight: 400;color: #000000;"><?=gofast_user_display_name($responsible)?></span>
                                            <?php endif ?>
                                        </td>
                                        <td style="padding: 10px;color: #000000; font-size: 18px;text-align:left;"><?=$deadline?></td>
                                        <td style="padding: 10px;">
                                            <div style="font-family:Poppins, Helvetica, Arial, sans-serif;font-size:14px;line-height:1;text-align:left;color:#000000;">
                                                <a href="<?=$node_link?>" style="color: #000000; text-decoration: none;font-style: italic;">&nbsp;<?=$node_title?></a>
                                            </div>
                                        </td>
                                    </tr>
                                <?php } ?>
                            </tbody>
                        </table>
                    </div>
                    <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
</div>
