<!-- FILE: mail_deadline_source.mjml -->
<?php global $base_url; ?>
<style type="text/css">
    #outlook a {
        padding: 0;
    }

    body {
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
    }

    table,
    td {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
    }

    img {
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
    }

    p {
        display: block;
        margin: 13px 0;
    }
</style>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<!--[if lte mso 11]>
<style type="text/css">
    .mj-outlook-group-fix { width:100% !important; }
</style>
<![endif]-->
<style type="text/css">
    @media only screen and (min-width:480px) {
        .mj-column-per-90 {
            width: 90% !important;
            max-width: 90%;
        }

        .mj-column-per-100 {
            width: 100% !important;
            max-width: 100%;
        }

        .mj-column-per-50 {
            width: 50% !important;
            max-width: 50%;
        }
    }
</style>
<style media="screen and (min-width:480px)">
    .moz-text-html .mj-column-per-90 {
        width: 90% !important;
        max-width: 90%;
    }

    .moz-text-html .mj-column-per-100 {
        width: 100% !important;
        max-width: 100%;
    }

    .moz-text-html .mj-column-per-50 {
      width: 50% !important;
      max-width: 50%;
    }
</style>
<style type="text/css">
</style>

<!-- SubHeader -->
<!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:992px;" width="992" bgcolor="white" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
<div style="background:white;background-color:white;margin:0px auto;max-width:992px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:white;background-color:white;width:100%;">
        <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:0;padding-left:10px;padding-top:10px;text-align:center;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:883.8px;" ><![endif]-->
                    <div class="mj-column-per-90 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>
                                <tr>
                                    <td align="left" style="font-size:0px;padding:10px 25px;padding-left:0;word-break:break-word;">
                                        <div style="font-family:Poppins, Candara, Helvetica, Arial, sans-serif;font-size:18px;font-weight:600;line-height:1;text-align:left;color:#337ab7;"><?= t('Hello ', array(), $l) . $user_name . "," ?></div>
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
</div>
<!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:992px;" width="992" bgcolor="white" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
<div style="background:white;background-color:white;margin:0px auto;max-width:992px;border-radius: 0 0 10px 10px;padding-bottom: 10px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:white;background-color:white;width:100%;">
        <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:0;padding-left:10px;padding-top:10px;text-align:center;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:883.8px;" ><![endif]-->
                    <div class="mj-column-per-90 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>
                                <tr>
                                    <td align="left" style="font-size:0px;padding:0;padding-bottom:5px;word-break:break-word;">
                                        <div style="font-family:Poppins, Candara, Helvetica, Arial, sans-serif;font-size:14px;font-weight:600;line-height:1;text-align:left;color:#000000;">
                                        <?php
                                            $count = 0;
                                            foreach ($nodes as $node_array) $count += count($node_array);
                                            $formatted_count = format_plural($count, '1 item', '@nb items', array('@nb' => $count), $l);
                                            echo t('Here are your deadline on @date, including @formatted_count', array('@date' => $deadline, '@formatted_count' => $formatted_count), $l);
                                        ?>
                                        </div>
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
</div>
<div style="margin:0px auto;max-width:992px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
        <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:0;padding-left:10px;padding-top:10px;text-align:center;">
                    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:883.8px;" ><![endif]-->
                    <div class="mj-column-per-90 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>
                                <tr>
                                <?= $table ?>
                                </tr>  
                            </tbody>
                        </table>
                    </div>
                    <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
</div>
