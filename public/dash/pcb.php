<?php
/**
 * TeachNet — дашборд /dash, вкладка «Значки и мастер-классы» (/dash/?view=pcb): заявки с /holiday/ и /pcb/
 * из своей таблицы pcb_leads и Метрика направления (свой счётчик pcb_counter_id в dash_config.php, не школьный).
 * Блоки: pcb_summary, pcb_leads, pcb_metrika. Действия (POST + CSRF, проверяет api.php): pcb_contact, pcb_update.
 * Школьные блоки, таблица leads и счётчик школы здесь не используются.
 */
declare(strict_types=1);

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../pcb/lib/pcb.php';

/** Цели счётчика направления (идентификаторы JavaScript-событий, этап 4 ТЗ). */
const PCB_GOALS = [
    'lead_submit'    => 'Отправили заявку',
    'tryon_upload'   => 'Загрузили логотип в примерку',
    'tryon_download' => 'Скачали картинку примерки',
    'tryon_discuss'  => 'Нажали «Обсудить этот значок»',
];

function pcb_dash_db(?array $sendCfg, ?string $sendError): PDO {
    if ($sendError !== null) {
        throw new DashError($sendError);
    }
    if (!$sendCfg) {
        throw new DashError('Не найден send_config.php — нет доступа к базе заявок.');
    }
    try {
        $pdo = pcb_db($sendCfg);
        pcb_ensure_table($pdo);
        return $pdo;
    } catch (Throwable $e) {
        error_log('TeachNet dash pcb: БД — ' . $e->getMessage());
        throw new DashError('Нет доступа к базе заявок направления. Проверьте db_* в send_config.php.');
    }
}

/** Заявки, созданные в периоде [a, b] (даты включительно), новые сверху. */
function pcb_dash_leads(PDO $pdo, DateTimeImmutable $a, DateTimeImmutable $b): array {
    $st = $pdo->prepare('SELECT * FROM pcb_leads WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC');
    $st->execute([$a->format('Y-m-d 00:00:00'), $b->modify('+1 day')->format('Y-m-d 00:00:00')]);
    return $st->fetchAll();
}

/** Контакт под маской: +7 (9**) ***-**-67, @ol*** — полностью по клику (действие pcb_contact). */
function pcb_dash_mask(array $r): string {
    if (!empty($r['contact_phone'])) {
        return dash_mask_phone((string) $r['contact_phone']) ?: '***';
    }
    if (!empty($r['contact_telegram'])) {
        return mb_substr((string) $r['contact_telegram'], 0, 3) . '***';
    }
    return '';
}

function pcb_dash_channel(array $r): string {
    return dash_channel_for_lead(['utm_source' => $r['utm_source'] ?? '', 'utm_medium' => $r['utm_medium'] ?? '',
        'yclid' => '', 'referrer' => $r['referrer'] ?? ''], 'teachnet.ru');
}

/** Подписи-счётчики по ключу, по убыванию: [['label' => …, 'value' => n]]. */
function pcb_dash_count(array $rows, callable $key, int $limit = 0): array {
    $c = [];
    foreach ($rows as $r) {
        $k = $key($r);
        if ($k !== '' && $k !== null) {
            $c[$k] = ($c[$k] ?? 0) + 1;
        }
    }
    arsort($c);
    $out = array_map(static fn ($k, $v) => ['label' => (string) $k, 'value' => $v], array_keys($c), $c);
    return $limit ? array_slice($out, 0, $limit) : $out;
}

function pcb_dash_block(string $block, DashReport $report, array $cfg, ?array $sendCfg, ?string $sendError, array $q): array {
    if ($block === 'pcb_metrika') {
        return pcb_dash_metrika($report, $cfg, $q);
    }
    $pdo = pcb_dash_db($sendCfg, $sendError);
    if ($block === 'pcb_summary') {
        try {
            pcb_retry_notifications($pdo, $sendCfg ?? [], 3); // Telegram был недоступен — дошлём уведомления
        } catch (Throwable $e) {
            error_log('TeachNet dash pcb: повтор уведомлений — ' . $e->getMessage());
        }
        return pcb_dash_summary($pdo, $report);
    }
    if ($block === 'pcb_leads') {
        return pcb_dash_table($pdo, $report, $q);
    }
    throw new DashError('Неизвестный блок');
}

/** Сводка за период: заявки (к прошлому периоду), по страницам и форматам, города, каналы, сделки. */
function pcb_dash_summary(PDO $pdo, DashReport $report): array {
    $cur = pcb_dash_leads($pdo, $report->from, $report->to);
    $prev = pcb_dash_leads($pdo, $report->prevFrom, $report->prevTo);
    $won = array_filter($cur, static fn ($r) => in_array($r['status'], ['won', 'done'], true));
    $estimate = array_sum(array_map(static fn ($r) => (int) ($r['estimate_amount'] ?? 0), $cur));
    $unanswered = (int) $pdo->query("SELECT COUNT(*) FROM pcb_leads WHERE status = 'new'")->fetchColumn();
    $pending = (int) $pdo->query('SELECT COUNT(*) FROM pcb_leads WHERE notified_at IS NULL AND created_at >= NOW() - INTERVAL 3 DAY')->fetchColumn();
    return $report->meta() + [
        'cards' => [
            ['id' => 'leads', 'label' => 'Заявок', 'value' => count($cur), 'prev' => count($prev)],
            ['id' => 'holiday', 'label' => 'Праздники', 'value' => count(array_filter($cur, static fn ($r) => $r['page'] === 'holiday'))],
            ['id' => 'pcb', 'label' => 'Компаниям', 'value' => count(array_filter($cur, static fn ($r) => $r['page'] === 'pcb'))],
            ['id' => 'won', 'label' => 'Договорились', 'value' => count($won), 'sum' => array_sum(array_map(static fn ($r) => (int) ($r['deal_amount'] ?? 0), $won))],
            ['id' => 'estimate', 'label' => 'Бюджет по калькулятору', 'value' => $estimate, 'rub' => true],
        ],
        'unanswered' => $unanswered,
        'tg_pending' => $pending,
        'formats' => pcb_dash_count($cur, static fn ($r) => (PCB_PAGES[$r['page']] ?? $r['page']) . ' · ' . pcb_format_label($r)),
        'cities' => pcb_dash_count($cur, static fn ($r) => pcb_city_label($r) ?: 'Не указан', 8),
        'channels' => pcb_dash_count($cur, static fn ($r) => DASH_CHANNELS[pcb_dash_channel($r)] ?? 'Другое'),
        'statuses' => pcb_dash_count($cur, static fn ($r) => PCB_STATUSES[$r['status']] ?? $r['status']),
    ];
}

/** Рабочая таблица: фильтры (страница, статус, поиск), по 25 на странице. */
function pcb_dash_table(PDO $pdo, DashReport $report, array $q): array {
    $scope = ($q['scope'] ?? '') === 'unanswered' ? 'unanswered' : 'period';
    $list = $scope === 'unanswered'
        ? $pdo->query("SELECT * FROM pcb_leads WHERE status = 'new' ORDER BY created_at DESC, id DESC")->fetchAll()
        : pcb_dash_leads($pdo, $report->from, $report->to);
    $fPage = (string) ($q['page'] ?? '');
    $fStatus = (string) ($q['status'] ?? '');
    $search = mb_strtolower(trim((string) ($q['q'] ?? '')));
    $digits = preg_replace('/\D/', '', $search) ?? '';
    $list = array_values(array_filter($list, static function ($r) use ($fPage, $fStatus, $search, $digits) {
        if ($fPage !== '' && $r['page'] !== $fPage) {
            return false;
        }
        if ($fStatus !== '' && $r['status'] !== $fStatus) {
            return false;
        }
        if ($search !== '') {
            $hay = mb_strtolower(implode(' ', [$r['contact_name'], $r['company'], $r['city_name'], $r['contact_telegram'], $r['comment']]));
            $inPhone = strlen($digits) >= 3 && strpos(preg_replace('/\D/', '', (string) $r['contact_phone']) ?? '', $digits) !== false;
            if (mb_strpos($hay, $search) === false && !$inPhone) {
                return false;
            }
        }
        return true;
    }));
    $per = 25;
    $total = count($list);
    $pages = max(1, (int) ceil($total / $per));
    $page = min($pages, max(1, (int) ($q['p'] ?? 1)));
    $rows = [];
    foreach (array_slice($list, ($page - 1) * $per, $per) as $r) {
        $created = $report->dt((string) $r['created_at']);
        $tryon = json_decode((string) ($r['tryon'] ?? ''), true);
        $rows[] = [
            'id' => (int) $r['id'],
            'date' => $created ? dash_day_label($created) . ' ' . $created->format('H:i') : '—',
            'page' => $r['page'], 'page_label' => PCB_PAGES[$r['page']] ?? $r['page'],
            'format' => pcb_format_label($r), 'quantity' => pcb_quantity_label($r),
            'design' => $r['design'] ? (PCB_DESIGNS[$r['format']][$r['design']] ?? $r['design']) : '',
            'city' => pcb_city_label($r),
            'event_date' => $r['event_date'] ? date('d.m.Y', (int) strtotime((string) $r['event_date'])) : '',
            'name' => (string) $r['contact_name'], 'contact' => pcb_dash_mask($r),
            'company' => (string) ($r['company'] ?? ''), 'age' => (string) ($r['age'] ?? ''), 'badge_text' => (string) ($r['badge_text'] ?? ''),
            'comment' => (string) ($r['comment'] ?? ''),
            'estimate' => $r['estimate_amount'] !== null ? (int) $r['estimate_amount'] : null,
            'estimate_label' => (string) ($r['estimate_label'] ?? ''),
            'tryon' => is_array($tryon) ? (string) ($tryon['text'] ?? '') : '',
            'channel' => DASH_CHANNELS[pcb_dash_channel($r)] ?? 'Другое',
            'utm' => implode(' / ', array_filter([$r['utm_source'], $r['utm_medium'], $r['utm_campaign'], $r['utm_content']])),
            'referrer' => (string) ($r['referrer'] ?? ''),
            'status' => (string) $r['status'], 'deal_amount' => $r['deal_amount'] !== null ? (int) $r['deal_amount'] : null,
            'note' => (string) ($r['note'] ?? ''),
            'notified' => $r['notified_at'] !== null,
            'consent' => $r['consent_version'] . ', ' . (($c = $report->dt((string) $r['consent_at'])) ? $c->format('d.m.Y H:i') : ''),
        ];
    }
    return $report->meta() + [
        'rows' => $rows, 'total' => $total, 'page' => $page, 'pages' => $pages, 'scope' => $scope,
        'unanswered' => (int) $pdo->query("SELECT COUNT(*) FROM pcb_leads WHERE status = 'new'")->fetchColumn(),
        'options' => ['statuses' => PCB_STATUSES, 'pages' => PCB_PAGES],
    ];
}

/** Метрика направления: свой счётчик (pcb_counter_id), тот же токен, что у школьного дашборда. */
function pcb_dash_metrika(DashReport $report, array $cfg, array $q): array {
    $counter = (int) ($cfg['pcb_counter_id'] ?? 0);
    if ($counter <= 0) {
        return $report->meta() + ['configured' => false];
    }
    $pcfg = ['counter_id' => $counter] + $cfg;
    $r = new DashReport($pcfg, null, $q);
    [$goals] = metrika_get($pcfg, '/management/v1/counter/' . $counter . '/goals', []);
    // наши цели — по идентификатору JavaScript-события в условии цели
    $found = [];
    foreach ((array) ($goals['goals'] ?? []) as $g) {
        foreach ((array) ($g['conditions'] ?? []) as $c) {
            $ident = (string) ($c['url'] ?? '');
            if (isset(PCB_GOALS[$ident]) && !isset($found[$ident])) {
                $found[$ident] = (int) $g['id'];
            }
        }
    }
    $metrics = ['ym:s:visits', 'ym:s:users'];
    foreach ($found as $id) {
        $metrics[] = 'ym:s:goal' . $id . 'reaches';
    }
    $cur = $r->totals($metrics, $r->from, $r->to);
    $prev = $r->compare ? $r->totals($metrics, $r->prevFrom, $r->prevTo) : [];
    $goalRows = [];
    foreach (PCB_GOALS as $ident => $label) {
        $m = isset($found[$ident]) ? 'ym:s:goal' . $found[$ident] . 'reaches' : null;
        $goalRows[] = ['id' => $ident, 'label' => $label, 'found' => $m !== null,
            'value' => $m ? (int) ($cur[$m] ?? 0) : null, 'prev' => $m && $prev ? (int) ($prev[$m] ?? 0) : null];
    }
    $lead = isset($found['lead_submit']) ? 'ym:s:goal' . $found['lead_submit'] . 'reaches' : null;
    $src = $r->byDim(['ym:s:lastsignTrafficSource'], array_values(array_filter(['ym:s:visits', $lead])), $r->from, $r->to, '', 20);
    $sources = [];
    foreach ($src as $row) {
        $sources[] = ['label' => (string) ($row['dims'][0]['name'] ?? '') ?: '—', 'visits' => (int) ($row['m']['ym:s:visits'] ?? 0),
            'leads' => $lead ? (int) ($row['m'][$lead] ?? 0) : null];
    }
    $fetched = $r->fetchedAt();
    return $report->meta() + [
        'configured' => true, 'counter' => $counter,
        'visits' => (int) ($cur['ym:s:visits'] ?? 0), 'visits_prev' => $prev ? (int) ($prev['ym:s:visits'] ?? 0) : null,
        'users' => (int) ($cur['ym:s:users'] ?? 0),
        'goals' => $goalRows, 'sources' => array_slice($sources, 0, 8),
        'fetched_at' => $fetched,
    ];
}

/* ---------- действия ---------- */

function pcb_dash_action(string $action, ?array $sendCfg, ?string $sendError, array $in): array {
    $pdo = pcb_dash_db($sendCfg, $sendError);
    $id = crm_id($in);
    $st = $pdo->prepare('SELECT * FROM pcb_leads WHERE id = ?');
    $st->execute([$id]);
    $lead = $st->fetch();
    if (!$lead) {
        throw new DashError('Заявка не найдена.');
    }
    if ($action === 'pcb_contact') {
        $tg = (string) ($lead['contact_telegram'] ?? '');
        return [
            'phone' => (string) ($lead['contact_phone'] ?? ''),
            'tel' => (string) ($lead['contact_phone'] ?? ''),
            'telegram' => $tg,
            'tg_link' => $tg !== '' ? 'https://t.me/' . ltrim($tg, '@') : '',
        ];
    }
    if ($action === 'pcb_update') {
        $status = crm_str($in, 'status', 16);
        if (!isset(PCB_STATUSES[$status])) {
            throw new DashError('Неизвестный статус.');
        }
        $set = ['status' => $status];
        if ($status !== $lead['status']) {
            $set['status_updated_at'] = crm_now();
        }
        if (array_key_exists('deal_amount', $in)) {
            $raw = str_replace([' ', "\u{00A0}"], '', crm_str($in, 'deal_amount', 15));
            if ($raw !== '' && !preg_match('/^\d{1,9}$/', $raw)) {
                throw new DashError('Сумма сделки — целое число рублей.');
            }
            $set['deal_amount'] = $raw !== '' ? (int) $raw : null;
        }
        if (array_key_exists('note', $in)) {
            $note = crm_str($in, 'note', 2000, true);
            $set['note'] = $note !== '' ? $note : null;
        }
        // имена колонок — только из кода выше, значения — через плейсхолдеры
        $cols = implode(', ', array_map(static fn ($k) => $k . ' = ?', array_keys($set)));
        $pdo->prepare('UPDATE pcb_leads SET ' . $cols . ' WHERE id = ?')->execute(array_merge(array_values($set), [$id]));
        return ['ok' => true, 'message' => 'Сохранено'];
    }
    throw new DashError('Неизвестное действие');
}
