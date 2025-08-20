<!-- START ajax_file_browser_mobile.tpl.php -->
<div class="ajax-file-browser" >
  <div id="file_browser_mobile_header" class="">
    <div id="file_browser_mobile_header_breadcrumb">
      <ul></ul>
    </div>
    <div id="file_browser_mobile_toolbar_search" class="input-group input-group-sm">
      <div class="input-group">
        <input id="file_browser_mobile_toolbar_search_input" type="text" class="form-control" placeholder="<?php echo t('Filter', array(), array('context' => 'gofast:ajax_file_browser')); ?>" aria-describedby="sizing-addon3">
        <div class="input-group-append dropdown no-arrow" id="file_browser_mobile_toolbar_refresh_group">
          <button title="<?php echo t('Refresh'); ?>" id="file_browser_mobile_tooolbar_refresh" type="button" class="btn input-group-text dropdown-toggle" ><i class="fa fa-refresh" aria-hidden="true"></i></button>
        </div>
      </div>
    </div>
  </div>
  <div id="file_browser_mobile_files" class="panel-body">
    <table id="file_browser_mobile_files_table" class="table">
    </table>
  </div>
  <div id="file_browser_mobile_queue" class="panel-body">

  </div>
</div>
<!-- END ajax_file_browser_mobile.tpl.php -->