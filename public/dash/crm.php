<?php
/**
 * TeachNet — дашборд /dash: изменения данных (статусы заявок, ручные заявки, расходы).
 * Только POST от вошедшего пользователя с CSRF-токеном (проверяет api.php),
 * все значения проверяются по белым спискам, запросы — подготовленные выражения PDO.
 */
declare(strict_types=1);

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

/** Строковое поле запроса без управляющих символов (переводы строк — по желанию). */
function crm_str(array $in, string $key, int $max, bool $multiline = false): string {
    $v = $in[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = preg_replace($multiline ? '/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/' : '/[\x00-\x1F\x7F]+/', ' ', $v) ?? '';
    $v = trim($v);
    return mb_strlen($v) > $max ? mb_substr($v, 0, $max) : $v;
}

/** Номер записи из запроса: целое число больше нуля, иначе 0 (запись не найдётся). */
function crm_id(array $in): int {
    $v = $in['id'] ?? '';
    return is_string($v) ? (int) filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 0]]) : 0;
}

/** Дата-время из поля datetime-local («2026-10-05T17:00») или пусто. */
function crm_datetime(string $v): ?string {
    if ($v === '') {
        return null;
    }
    $d = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $v, new DateTimeZone('Europe/Moscow'))
        ?: DateTimeImmutable::createFromFormat('Y-m-d H:i', $v, new DateTimeZone('Europe/Moscow'));
    if (!$d) {
        throw new DashError('Дата указана неверно.');
    }
    return $d->format('Y-m-d H:i:00');
}

function crm_now(): string {
    return (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('Y-m-d H:i:s');
}

function crm_need(array $schema, string $what): void {
    if (empty($schema[$what])) {
        throw new DashError('Сначала выполните SQL из инструкции — в базе ещё нет нужных колонок или таблиц.');
    }
}

/** Полный номер телефона заявки (по клику на маску). */
function crm_phone(PDO $pdo, array $in): array {
    $id = crm_id($in);
    $st = $pdo->prepare('SELECT phone FROM leads WHERE id = ?');
    $st->execute([$id]);
    $phone = $st->fetchColumn();
    if ($phone === false) {
        throw new DashError('Заявка не найдена.');
    }
    $digits = preg_replace('/\D/', '', (string) $phone) ?? '';
    if (strlen($digits) === 11 && $digits[0] === '8') {
        $digits = '7' . substr($digits, 1);
    }
    return ['phone' => (string) $phone, 'tel' => '+' . $digits];
}

/**
 * Изменить заявку: статус и связанные поля (дата пробного, сумма оплаты, причина отказа),
 * заметка, филиал, канал. Время шага пишется в соответствующее поле.
 */
function crm_lead_update(PDO $pdo, array $schema, array $in): array {
    crm_need($schema, 'status');
    $id = crm_id($in);
    $st = $pdo->prepare('SELECT * FROM leads WHERE id = ?');
    $st->execute([$id]);
    $lead = $st->fetch();
    if (!$lead) {
        throw new DashError('Заявка не найдена.');
    }
    $status = crm_str($in, 'status', 20);
    if (!isset(DASH_STATUSES[$status])) {
        throw new DashError('Неизвестный статус.');
    }
    $reason = crm_str($in, 'lost_reason', 32);
    if ($status === 'lost' && !isset(DASH_LOST_REASONS[$reason])) {
        throw new DashError('Для отказа выберите причину.');
    }
    $trial = crm_datetime(crm_str($in, 'trial_at', 20));
    $amountRaw = crm_str($in, 'paid_amount', 12);
    $amount = null;
    if ($amountRaw !== '') {
        if (!preg_match('/^\d{1,9}$/', str_replace([' ', "\u{00A0}"], '', $amountRaw))) {
            throw new DashError('Сумма оплаты — целое число рублей.');
        }
        $amount = (int) str_replace([' ', "\u{00A0}"], '', $amountRaw);
    }
    $note = crm_str($in, 'note', 2000, true);
    $now = crm_now();
    $old = (string) ($lead['status'] ?? '') ?: 'new';
    $rank = DASH_STATUSES[$status]['rank'];

    // меняем только присланные поля: быстрая смена статуса не стирает заметку и сумму
    $set = ['status' => $status, 'lost_reason' => $status === 'lost' ? $reason : null];
    if (array_key_exists('note', $in)) {
        $set['note'] = $note !== '' ? $note : null;
    }
    if ($status !== $old) {
        $set['status_updated_at'] = $now;
    }
    if ($rank >= 1 && empty($lead['contacted_at'])) {
        $set['contacted_at'] = $now; // первый контакт: любой статус дальше «Новой»
    }
    if ($trial !== null || $status === 'trial') {
        $set['trial_at'] = $trial ?? ($lead['trial_at'] ?: null);
    }
    if ($status === 'attended') {
        $set['attended'] = 1;
    }
    // статус вернули назад по воронке (исправление ошибки) — снимаем отметки дальних шагов;
    // у «Отказа» и «Нецелевой» отметки остаются: видно, до какого шага дошли
    if ($rank >= 0) {
        if ($rank < 1) {
            $set['contacted_at'] = null;
        }
        if ($rank < 2 && $trial === null) {
            $set['trial_at'] = null;
        }
        if ($rank < 3) {
            $set['attended'] = null;
        }
        if ($rank < 4) {
            $set['paid_at'] = null;
        }
    }
    if ($status === 'paid') {
        if (empty($lead['paid_at'])) {
            $set['paid_at'] = $now;
        }
        if ($amount !== null) {
            $set['paid_amount'] = $amount;
        }
    } elseif ($amount !== null) {
        $set['paid_amount'] = $amount;
    }
    if ($schema['branch'] && array_key_exists('branch', $in)) {
        $b = crm_str($in, 'branch', 32);
        if ($b !== '' && !isset(DASH_BRANCHES[$b])) {
            throw new DashError('Неизвестный филиал.');
        }
        $set['branch'] = $b !== '' ? $b : null;
    }
    if ($schema['channel'] && array_key_exists('channel', $in)) {
        $c = crm_str($in, 'channel', 32);
        if ($c !== '' && !isset(DASH_CHANNELS[$c])) {
            throw new DashError('Неизвестный канал.');
        }
        $set['channel'] = $c !== '' ? $c : null;
    }
    // имена колонок — только из кода выше, значения — через плейсхолдеры
    $cols = implode(', ', array_map(static fn ($k) => $k . ' = ?', array_keys($set)));
    $upd = $pdo->prepare('UPDATE leads SET ' . $cols . ' WHERE id = ?');
    $upd->execute(array_merge(array_values($set), [$id]));
    if ($status !== $old && $schema['log']) {
        $log = $pdo->prepare('INSERT INTO lead_status_log (lead_id, old_status, new_status, changed_at) VALUES (?, ?, ?, ?)');
        $log->execute([$id, $old, $status, $now]);
    }
    return ['ok' => true, 'message' => 'Сохранено'];
}

/** Добавить заявку вручную (обращение из Telegram, MAX, по телефону). */
function crm_lead_add(PDO $pdo, array $schema, array $in): array {
    crm_need($schema, 'status');
    crm_need($schema, 'manual');
    crm_need($schema, 'channel');
    $name = crm_str($in, 'name', 100);
    if (mb_strlen($name) < 2) {
        throw new DashError('Укажите имя.');
    }
    $digits = preg_replace('/\D/', '', crm_str($in, 'phone', 30)) ?? '';
    if (strlen($digits) === 10) {
        $digits = '7' . $digits;
    }
    if (strlen($digits) !== 11) {
        throw new DashError('Телефон — 11 цифр, например +7 917 123-45-67.');
    }
    $sub = substr($digits, -10);
    $phone = '+7 (' . substr($sub, 0, 3) . ') ' . substr($sub, 3, 3) . '-' . substr($sub, 6, 2) . '-' . substr($sub, 8, 2);
    $source = crm_str($in, 'source', 32);
    if (!isset(DASH_SOURCES[$source])) {
        throw new DashError('Выберите курс.');
    }
    $channel = crm_str($in, 'channel', 32);
    if (!isset(DASH_CHANNELS[$channel])) {
        throw new DashError('Выберите канал — откуда узнали.');
    }
    $branch = crm_str($in, 'branch', 32);
    if ($branch !== '' && !isset(DASH_BRANCHES[$branch])) {
        throw new DashError('Неизвестный филиал.');
    }
    $age = crm_str($in, 'age', 16);
    $note = crm_str($in, 'note', 2000, true);
    $created = crm_datetime(crm_str($in, 'created_at', 20)) ?? crm_now();
    $cols = ['name' => $name, 'phone' => $phone, 'child_age' => $age, 'created_at' => $created, 'source' => $source,
        'utm_source' => '', 'utm_medium' => '', 'utm_campaign' => '', 'utm_term' => '', 'utm_content' => '',
        'yclid' => '', 'ym_client_id' => '', 'referrer' => '',
        'status' => 'new', 'channel' => $channel, 'is_manual' => 1, 'note' => $note !== '' ? $note : null];
    if ($schema['branch']) {
        $cols['branch'] = $branch !== '' ? $branch : null;
    }
    $cols = array_intersect_key($cols, $schema['cols']);
    $st = $pdo->prepare('INSERT INTO leads (' . implode(', ', array_keys($cols)) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')');
    $st->execute(array_values($cols));
    return ['ok' => true, 'message' => 'Заявка добавлена', 'id' => (int) $pdo->lastInsertId()];
}

/** Проверенные поля расхода. */
function crm_spend_fields(array $in): array {
    $month = crm_str($in, 'month', 7);
    if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month)) {
        throw new DashError('Выберите месяц.');
    }
    $channel = crm_str($in, 'channel', 32);
    if (!isset(DASH_CHANNELS[$channel])) {
        throw new DashError('Выберите канал.');
    }
    $amount = str_replace([' ', "\u{00A0}"], '', crm_str($in, 'amount', 15));
    if (!preg_match('/^\d{1,9}$/', $amount) || (int) $amount <= 0) {
        throw new DashError('Сумма — целое число рублей больше нуля.');
    }
    return [$month . '-01', $channel, (int) $amount, crm_str($in, 'comment', 255)];
}

function crm_spend_add(PDO $pdo, array $schema, array $in): array {
    crm_need($schema, 'spend');
    [$month, $channel, $amount, $comment] = crm_spend_fields($in);
    $st = $pdo->prepare('INSERT INTO ad_spend (month, channel, amount, comment, created_at) VALUES (?, ?, ?, ?, ?)');
    $st->execute([$month, $channel, $amount, $comment !== '' ? $comment : null, crm_now()]);
    return ['ok' => true, 'message' => 'Расход добавлен'];
}

function crm_spend_update(PDO $pdo, array $schema, array $in): array {
    crm_need($schema, 'spend');
    [$month, $channel, $amount, $comment] = crm_spend_fields($in);
    $st = $pdo->prepare('UPDATE ad_spend SET month = ?, channel = ?, amount = ?, comment = ? WHERE id = ?');
    $st->execute([$month, $channel, $amount, $comment !== '' ? $comment : null, crm_id($in)]);
    return ['ok' => true, 'message' => 'Расход сохранён'];
}

function crm_spend_delete(PDO $pdo, array $schema, array $in): array {
    crm_need($schema, 'spend');
    $st = $pdo->prepare('DELETE FROM ad_spend WHERE id = ?');
    $st->execute([crm_id($in)]);
    return ['ok' => true, 'message' => 'Расход удалён'];
}
