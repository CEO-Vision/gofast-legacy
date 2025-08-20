<?php foreach ($users as $user) : ?>
    <div class="d-flex align-items-center p-2"><div class="symbol symbol-35 flex-shrink-0 mr-4"><img alt="Pic" src="<?= $user["picture"] ?>"></div><a href="/user/<?= $user["uid"] ?>" class="font-size-lg"><?= str_replace(["'", "\""], " ", "{$user['firstname']} {$user['lastname']}") ?></a>
    </div>
<?php endforeach; ?>
