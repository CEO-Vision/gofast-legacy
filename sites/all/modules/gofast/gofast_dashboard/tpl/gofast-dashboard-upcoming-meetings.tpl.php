 <?php global $user;
    $account = $user;
 ?>
<div class="table-responsive d-flex flex-column h-100">
  <div class="calendar-table-wrapper">
    <table id="table-upcoming-meetings" class="table table-hover table-striped" style="table-layout:fixed;">
      <tbody>
        <?php foreach ($meetings as $key => $meeting) : ?>
          <tr class="text-truncate">
            <td class="td-field-date">
              <span class="dashboard-calendar-deadline"><?php echo format_date(strtotime(gofast_change_time_zone($meeting->field_date_value, 'UTC', $account->timezone)) , 'short', '', date_default_timezone_get()); ?></span>
            </td>
            <td class="td-field-nid d-none"><?php echo $meeting->nid ?></td>
            <td class="td-field-title">
              <span class="w-100 d-inline-flex align-items-baseline">
                <i class="fas fa-video fa-1x mr-1"></i>
                <span class="flex-fill text-truncate">
                  <a href="/node/<?php echo $meeting->nid?>" title="<?php echo $meeting->title ?>"><?php echo $meeting->title ?></a>
                </span>
                <?php if ($meeting->has_recurrence) { ?>
                  <i
                    class="fas fa-repeat fa-1x ml-1"
                    title="<?= t('Recurrent meeting', [], ['context' => 'gofast']) ?>"
                    data-toggle="tooltip"
                    data-delay='{ "show": 500, "hide": 100 }'
                  ></i>
                <?php } ?>
              </span>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <nav class="text-center mt-6">
    <ul class="pagination pagination-sm justify-content-center" id="path_pager_upcoming_meetings"></ul>
  </nav>
</div>

<script type='text/javascript'>
    jQuery(document).ready(function(){
        jQuery('#table-upcoming-meetings > tbody').pager({pagerSelector : '#path_pager_upcoming_meetings', perPage: 7, numPageToDisplay : 5, showPrevNext: false});
    });

</script>
