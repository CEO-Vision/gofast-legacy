<?php
$languageParam = isset($language) ? '?language=' . $language : '';
?>
<iframe src="/drupal/survey/<?php echo $nid . $languageParam; ?>" width="100%" height="100%" title="SurveyJS" style="border: none;"></iframe>
