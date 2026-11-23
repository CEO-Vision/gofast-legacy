<div id="dashboard_toolbar_calendar" class="d-flex align-items-center">
  <div class="btn-group" role="group">
    <button type="button"
      class="btn btn-sm btn-primary dropdown-toggle"
      id="btn-dashboard-calendar-meetings"
      data-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="false">
      <span id="calendar-main-btn-text">
        <?php echo t('Meetings', array(), array('context' => 'gofast_cdel')); ?>
      </span>
    </button>

    <div class="dropdown-menu">
      <a class="dropdown-item" id="dashboard-calendar-selection-meetings">
        <?php echo t('Meetings', array(), array('context' => 'gofast')); ?>
      </a>
      <a class="dropdown-item" id="dashboard-calendar-selection-deadlines">
        <?php echo t('Documents deadlines', array(), array('context' => 'gofast_cdel')); ?>
      </a>
    </div>
  </div>
  <a href="/node/add/conference"
     class="btn btn-sm btn-outline-secondary ml-2"
     data-toggle="tooltip"
     data-html="true"
     title="<?php echo t('New meeting', [], ['context' => 'gofast']); ?>">
    <span class="fa fa-plus"></span>
  </a>
</div>
