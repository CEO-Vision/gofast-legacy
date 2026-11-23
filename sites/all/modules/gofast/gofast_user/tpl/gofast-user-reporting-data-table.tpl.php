<table class='table table-striped'><thead><tr>
<td><?php echo t("Date", array(), array('context' => 'gofast')); ?></td>
<td><?php echo t("Number internal actives", array(), array('context' => 'gofast')); ?></td>
<td><?php echo t("Number external actives", array(), array('context' => 'gofast')); ?></td>
<td><?php echo t("Number internal inactives", array(), array('context' => 'gofast')); ?></td>
<td><?php echo t("Number external inactives", array(), array('context' => 'gofast')); ?></td>
</tr></thead>
<tbody>
  <?php if(count($all_data) > 0) : ?>
    <?php foreach($all_data as $data): ?>
      <tr style='font-family: SFMono-Regular, Menlo, Monaco, Consolas;'>
        <td><?php echo format_date($data->timestamp,  'custom', 'd-m-Y',); ?></td>
        <td><?php echo $data->count_internal_actives; ?></td>
        <td><?php echo $data->count_external_actives; ?></td>
        <td><?php echo $data->count_internal_inactives; ?></td>
        <td><?php echo $data->count_external_inactives; ?></td>
      </tr>
      <?php endforeach; ?>
    <?php endif; ?>
</tbody></table>
