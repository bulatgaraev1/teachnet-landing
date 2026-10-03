<?php
/**
 * TeachNet — JSON для дашборда /dash (только для вошедших).
 *   GET  api.php?from=YYYY-MM-DD&to=YYYY-MM-DD  — все блоки за период
 *   POST api.php?action=refresh (заголовок X-CSRF-Token) — сбросить кеш Метрики
 * Метрика (счётчик из dash_config.php) + таблица leads (доступ из send_config.php).
 */
declare(strict_types=1);

// Ошибки PHP — только в лог: в ответе только наш JSON с понятным текстом.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// Буфер вывода: случайный пробел или BOM не испортит заголовки, сессию и JSON.
ob_start();

require __DIR__ . '/lib.php';

dash_headers();
header('Content-Type: application/json; charset=utf-8');

/** @return never */
function out(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $cfg = dash_find_config('dash_config.php');
} catch (DashError $e) {
    out(503, ['error' => $e->getMessage()]);
}
if (!$cfg) {
    out(503, ['error' => 'Не найден dash_config.php']);
}
dash_session_start();
if (!dash_logged_in()) {
    out(401, ['error' => 'Нужно войти']);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && ($_GET['action'] ?? '') === 'refresh') {
    if (!dash_csrf_ok($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
        out(403, ['error' => 'Сессия устарела, обновите страницу']);
    }
    session_write_close();
    $ok = dash_clear_cache();
    out(200, ['ok' => $ok, 'message' => $ok ? 'Данные обновлены' : 'Обновлять можно не чаще раза в минуту']);
}
session_write_close(); // дальше сессия не нужна — не блокируем параллельные запросы

// Метрика: запросы идут строго по одному. Одновременные открытия дашборда ждут друг
// друга (второй потом почти целиком берёт данные из кеша) — лимит «3 параллельных» не превышаем.
@set_time_limit(120);
$lockDir = dash_tmp_dir('tn_dash_cache');
$lock = $lockDir ? @fopen($lockDir . '/_api.lock', 'c') : false;
if ($lock) {
    flock($lock, LOCK_EX); // снимается автоматически по завершении скрипта
}

/* ---------- справочник целей сайта: русские названия ---------- */

const GOAL_NAMES = [
    // кнопки записи
    'hero_cta' => 'Кнопка в первом экране (главная)',
    'nav_cta' => 'Кнопка «Пробный урок» в шапке (главная)',
    'burger_cta' => 'Кнопка в мобильном меню (главная)',
    'block4_signup' => 'Кнопка «Записаться» под программами (главная)',
    'block12_cta' => 'Кнопка в финальном блоке (главная)',
    'sticky_cta' => 'Липкая кнопка внизу экрана (главная)',
    'cta_hero' => 'Кнопка в первом экране (/electronics)',
    'cta_trial' => 'Кнопка в блоке «Пробный урок» (/electronics)',
    'cta_price' => 'Кнопка в блоке цены (/electronics)',
    'cta_final' => 'Кнопка в контактах (/electronics)',
    'cta_menu' => 'Кнопка в мобильном меню (/electronics)',
    // мессенджеры и звонки
    'msg_telegram' => 'Telegram в окне записи (/electronics)',
    'msg_max' => 'MAX в окне записи (/electronics)',
    'msg_vk' => 'VK в окне записи (/electronics)',
    'phone_click' => 'Клик по телефону (/electronics)',
    'nav_phone' => 'Телефон в шапке (главная)',
    // переходы между страницами
    'programs_electronics' => 'Главная → «Подробнее о курсе» электроники',
    'footer_electronics' => 'Подвал → «Электроника»',
    'footer_robotics' => 'Подвал → «Робототехника на LEGO»',
    'cross_robotics' => '/electronics → «Смотрите робототехнику»',
    // публикации
    'press_click' => 'Публикация о нас (/electronics)',
    'press_click_minmol' => 'Публикация: Министерство молодёжи РТ (главная)',
    'press_click_monrt' => 'Публикация: Министерство образования РТ (главная)',
    'press_click_kai' => 'Публикация: КНИТУ-КАИ (главная)',
    'press_click_tatarinform' => 'Публикация: Татар-информ (главная)',
    // глубина просмотра
    'scroll_hero' => 'Первый экран (главная)',
    'scroll_trust' => '«Нас поддерживают» (главная)',
    'scroll_translator' => '«Инженерия — проще, чем звучит» (главная)',
    'scroll_programs' => '«Путь, который пройдёт ваш ребёнок» (главная)',
    'scroll_mission' => '«Здесь не уроки. Здесь миссии» (главная)',
    'scroll_motivation' => '«Почему дети сами просятся» (главная)',
    'scroll_parents' => '«Вы будете знать, чем занимается ребёнок» (главная)',
    'scroll_team' => '«Преподаватель» (главная)',
    'scroll_conversion' => 'Форма заявки (главная)',
    'scroll_price' => 'Цена (главная и /electronics)',
    'scroll_press' => '«О нас пишут» (главная)',
    'scroll_faq' => 'Вопросы (главная и /electronics)',
    'scroll_final' => 'Финальный блок (главная)',
    'scroll_footer' => 'Подвал (главная)',
    'scroll_trial' => 'Пробный урок (/electronics)',
    'scroll_contacts' => 'Контакты (/electronics)',
    // прочее
    'lead_form' => 'Заявка отправлена',
    'nav_programs' => 'Меню: «Программы» (главная)',
    'nav_price' => 'Меню: «Цена» (главная)',
    'nav_press' => 'Меню: «О нас пишут» (главная)',
    'nav_faq' => 'Меню: «Вопросы» (главная)',
    'map_click' => '«Открыть в Яндекс.Картах» (/electronics)',
    'back_click' => 'Кнопка «Назад» (/electronics)',
    'modal_close_empty' => 'Окно записи закрыто без выбора (/electronics)',
];

const CLICK_GROUPS = [
    ['title' => 'Кнопки записи', 'goals' => ['hero_cta', 'nav_cta', 'burger_cta', 'block4_signup', 'block12_cta', 'sticky_cta', 'cta_hero', 'cta_trial', 'cta_price', 'cta_final', 'cta_menu']],
    ['title' => 'Мессенджеры и звонки', 'goals' => ['msg_telegram', 'msg_max', 'msg_vk', 'phone_click', 'nav_phone']],
    ['title' => 'Переходы между страницами', 'goals' => ['programs_electronics', 'footer_electronics', 'footer_robotics', 'cross_robotics']],
    ['title' => 'Публикации', 'goals' => ['press_click', 'press_click_minmol', 'press_click_monrt', 'press_click_kai', 'press_click_tatarinform']],
    ['title' => 'Навигация и прочее', 'goals' => ['nav_programs', 'nav_price', 'nav_press', 'nav_faq', 'map_click', 'back_click', 'modal_close_empty']],
];

const SCROLL_GOALS = [
    'scroll_hero', 'scroll_trust', 'scroll_translator', 'scroll_programs', 'scroll_mission', 'scroll_motivation',
    'scroll_parents', 'scroll_team', 'scroll_conversion', 'scroll_price', 'scroll_press', 'scroll_faq',
    'scroll_final', 'scroll_footer', 'scroll_trial', 'scroll_contacts',
];

const FUNNELS = [
    [
        'title' => 'Главная',
        'path' => '/',
        'steps' => [
            ['label' => 'Дошли до формы заявки', 'goals' => ['scroll_conversion']],
            ['label' => 'Нажали кнопку записи', 'goals' => ['hero_cta', 'nav_cta', 'burger_cta', 'sticky_cta', 'block4_signup', 'block12_cta']],
            ['label' => 'Отправили заявку', 'goals' => ['lead_form']],
        ],
    ],
    [
        'title' => 'Электроника (/electronics)',
        'path' => '/electronics',
        'steps' => [
            ['label' => 'Дошли до цены или контактов', 'goals' => ['scroll_price', 'scroll_contacts']],
            ['label' => 'Нажали кнопку записи', 'goals' => ['cta_hero', 'cta_trial', 'cta_price', 'cta_final', 'cta_menu']],
            ['label' => 'Отправили заявку', 'goals' => ['lead_form']],
        ],
    ],
];

/* ---------- период ---------- */

$tz = new DateTimeZone('Europe/Moscow');
$today = new DateTimeImmutable('today', $tz);
$parse = static function ($v) use ($tz): ?DateTimeImmutable {
    if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
        return null;
    }
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $v, $tz);
    return $d && $d->format('Y-m-d') === $v ? $d : null;
};
// быстрые периоды (7 / 30 / 90 дней) считаем от сегодняшней даты по Москве
$presetDays = in_array((int) ($_GET['days'] ?? 0), [7, 30, 90], true) ? (int) $_GET['days'] : 30;
$to = $parse($_GET['to'] ?? null) ?? $today;
$from = $parse($_GET['from'] ?? null) ?? $to->modify('-' . ($presetDays - 1) . ' days');
if ($to > $today) {
    $to = $today;
}
if ($from > $to) {
    [$from, $to] = [$to, $from];
}
if ($from < $to->modify('-365 days')) {
    $from = $to->modify('-365 days');
}
$days = (int) $from->diff($to)->days + 1;
$prevTo = $from->modify('-1 day');
$prevFrom = $prevTo->modify('-' . ($days - 1) . ' days');
$fmt = static fn (DateTimeImmutable $d): string => $d->format('Y-m-d');

$result = [
    'period' => ['from' => $fmt($from), 'to' => $fmt($to), 'days' => $days, 'prev_from' => $fmt($prevFrom), 'prev_to' => $fmt($prevTo)],
    'fetched_at' => null,
    'errors' => [],
];
$oldest = null; // самый старый ответ из кеша — «данные на …»
$remember = static function (int $t) use (&$oldest): void {
    $oldest = $oldest === null ? $t : min($oldest, $t);
};

/* ---------- Метрика: хелперы ---------- */

$counter = (int) ($cfg['counter_id'] ?? 96429194);

$stat = static function (array $params) use ($cfg, $counter, $remember): array {
    $params += ['ids' => $counter, 'lang' => 'ru', 'accuracy' => 'full', 'limit' => 100];
    [$data, $t] = metrika_get($cfg, '/stat/v1/data', $params);
    $remember($t);
    return $data;
};

/** Итоги (totals) по списку метрик с разбиением на запросы по 20 метрик. */
$totals = static function (array $metrics, string $d1, string $d2, string $filters = '') use ($stat): array {
    $out = [];
    foreach (array_chunk($metrics, 20) as $chunk) {
        $p = ['metrics' => implode(',', $chunk), 'date1' => $d1, 'date2' => $d2];
        if ($filters !== '') {
            $p['filters'] = $filters;
        }
        $data = $stat($p);
        foreach ($chunk as $i => $m) {
            $out[$m] = (float) ($data['totals'][$i] ?? 0);
        }
    }
    return $out;
};

$goals = [];       // идентификатор → id цели
$goalNames = [];   // id → название в Метрике (для целей вне нашего справочника)
$metrikaError = null;
try {
    [$g, $t] = metrika_get($cfg, '/management/v1/counter/' . $counter . '/goals', []);
    $remember($t);
    foreach ($g['goals'] ?? [] as $goal) {
        $goalNames[(int) $goal['id']] = (string) ($goal['name'] ?? '');
        if (($goal['type'] ?? '') !== 'action') {
            continue; // JavaScript-событие: условие «идентификатор цели»
        }
        foreach ($goal['conditions'] ?? [] as $c) {
            if (in_array($c['type'] ?? '', ['exact', 'contain'], true) && !empty($c['url'])) {
                $goals[(string) $c['url']] = (int) $goal['id'];
            }
        }
    }
} catch (DashError $e) {
    $metrikaError = $e->getMessage();
    $result['errors'][] = $metrikaError;
}
$gm = static fn (string $ident, string $kind) => isset($goals[$ident]) ? 'ym:s:goal' . $goals[$ident] . $kind : null;

/* ---------- база ---------- */

$pdo = null;
$dbError = null;
try {
    $pdo = dash_db(dash_find_config('send_config.php'));
} catch (DashError $e) {
    $dbError = $e->getMessage();
    $result['errors'][] = $dbError;
}
$range = static fn (DateTimeImmutable $a, DateTimeImmutable $b): array => [$a->format('Y-m-d 00:00:00'), $b->modify('+1 day')->format('Y-m-d 00:00:00')];
$dbCount = static function (DateTimeImmutable $a, DateTimeImmutable $b) use (&$pdo, $range): int {
    [$x, $y] = $range($a, $b);
    $st = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE created_at >= ? AND created_at < ?');
    $st->execute([$x, $y]);
    return (int) $st->fetchColumn();
};
$dbGroup = static function (string $col, string $empty) use (&$pdo, $range, $from, $to): array {
    [$x, $y] = $range($from, $to);
    $st = $pdo->prepare("SELECT COALESCE(NULLIF($col, ''), ?) AS k, COUNT(*) AS c FROM leads WHERE created_at >= ? AND created_at < ? GROUP BY k ORDER BY c DESC");
    $st->execute([$empty, $x, $y]);
    return array_map(static fn ($r) => ['name' => (string) $r['k'], 'leads' => (int) $r['c']], $st->fetchAll());
};

/* ---------- 1. главные цифры + график по дням ---------- */

$summary = ['metrika_error' => $metrikaError, 'db_error' => $dbError];
if (!$metrikaError) {
    try {
        $m = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate'];
        $cur = $totals($m, $fmt($from), $fmt($to));
        $prev = $totals($m, $fmt($prevFrom), $fmt($prevTo));
        $summary['visits'] = ['cur' => $cur['ym:s:visits'], 'prev' => $prev['ym:s:visits']];
        $summary['users'] = ['cur' => $cur['ym:s:users'], 'prev' => $prev['ym:s:users']];
        $summary['bounce'] = ['cur' => round($cur['ym:s:bounceRate'], 1), 'prev' => round($prev['ym:s:bounceRate'], 1)];
        $daily = $stat(['metrics' => 'ym:s:visits', 'dimensions' => 'ym:s:date', 'date1' => $fmt($from), 'date2' => $fmt($to), 'sort' => 'ym:s:date', 'limit' => 400]);
        $summary['daily_visits'] = [];
        foreach ($daily['data'] ?? [] as $row) {
            $summary['daily_visits'][(string) $row['dimensions'][0]['name']] = (float) $row['metrics'][0];
        }
    } catch (DashError $e) {
        $summary['metrika_error'] = $e->getMessage();
    }
}
if ($pdo) {
    try {
        $summary['leads'] = ['cur' => $dbCount($from, $to), 'prev' => $dbCount($prevFrom, $prevTo)];
        [$x, $y] = $range($from, $to);
        $st = $pdo->prepare('SELECT DATE(created_at) AS d, COUNT(*) AS c FROM leads WHERE created_at >= ? AND created_at < ? GROUP BY DATE(created_at)');
        $st->execute([$x, $y]);
        $summary['daily_leads'] = [];
        foreach ($st->fetchAll() as $r) {
            $summary['daily_leads'][(string) $r['d']] = (int) $r['c'];
        }
    } catch (Throwable $e) {
        error_log('TeachNet dash: leads — ' . $e->getMessage());
        $summary['db_error'] = 'Не удалось прочитать заявки из базы.';
    }
}
$result['summary'] = $summary;

/* ---------- 2. воронки по страницам ---------- */

$funnels = [];
foreach (FUNNELS as $f) {
    $item = ['title' => $f['title'], 'path' => $f['path'], 'error' => $metrikaError, 'steps' => [], 'note' => ''];
    if (!$metrikaError) {
        $metrics = ['ym:s:visits'];
        foreach ($f['steps'] as $s) {
            foreach ($s['goals'] as $ident) {
                if ($m = $gm($ident, 'visits')) {
                    $metrics[] = $m;
                }
            }
        }
        $metrics = array_values(array_unique($metrics));
        // визиты с просмотром страницы; если фильтр по хитам не поддержан — по странице входа
        $filters = ["EXISTS(ym:pv:URLPath=='" . $f['path'] . "')", "ym:s:startURLPath=='" . $f['path'] . "'"];
        foreach ($filters as $i => $flt) {
            try {
                $tot = $totals($metrics, $fmt($from), $fmt($to), $flt);
                if ($i === 1) {
                    $item['note'] = 'Визиты, которые начались с этой страницы.';
                }
                $prevVal = $tot['ym:s:visits'];
                $item['steps'][] = ['label' => 'Визиты на страницу', 'value' => $prevVal, 'pct' => null, 'approx' => false, 'goals' => []];
                foreach ($f['steps'] as $s) {
                    $parts = [];
                    $sum = 0.0;
                    foreach ($s['goals'] as $ident) {
                        $m = $gm($ident, 'visits');
                        $v = $m ? $tot[$m] : null;
                        $parts[] = ['id' => $ident, 'name' => GOAL_NAMES[$ident] ?? $ident, 'value' => $v, 'missing' => $m === null];
                        $sum += (float) $v;
                    }
                    $approx = count($s['goals']) > 1;
                    // визит мог достичь нескольких целей шага: сумма не больше предыдущего шага
                    $val = $approx ? min($sum, $prevVal) : $sum;
                    $item['steps'][] = [
                        'label' => $s['label'], 'value' => $val, 'approx' => $approx && $sum > 0,
                        'pct' => $prevVal > 0 ? round(100 * $val / $prevVal, 1) : null, 'goals' => $parts,
                    ];
                    $prevVal = $val;
                }
                $item['error'] = null;
                break;
            } catch (DashError $e) {
                $item['steps'] = [];
                $item['error'] = $e->getMessage();
                if (strpos($e->getMessage(), 'Метрика вернула ошибку') !== 0) {
                    break; // не про синтаксис фильтра (токен, сеть, лимит) — второй вариант не поможет
                }
            }
        }
    }
    $funnels[] = $item;
}
$result['funnels'] = $funnels;

/* ---------- 3. источники трафика ---------- */

$sources = ['error' => $metrikaError, 'db_error' => $dbError, 'types' => [], 'utm' => [], 'db_utm' => [], 'db_source' => []];
$leadMetric = $gm('lead_form', 'visits');
if (!$metrikaError) {
    try {
        $metrics = array_values(array_filter(['ym:s:visits', $leadMetric]));
        $rows = static function (array $data) use ($leadMetric): array {
            $out = [];
            foreach ($data['data'] ?? [] as $r) {
                $visits = (float) $r['metrics'][0];
                $leads = $leadMetric ? (float) $r['metrics'][1] : null;
                $out[] = [
                    'name' => implode(' / ', array_map(static fn ($d) => (string) ($d['name'] ?? '—'), $r['dimensions'])),
                    'visits' => $visits, 'leads' => $leads,
                    'conv' => $leads !== null && $visits > 0 ? round(100 * $leads / $visits, 2) : null,
                ];
            }
            return $out;
        };
        $sources['types'] = $rows($stat(['metrics' => implode(',', $metrics), 'dimensions' => 'ym:s:lastsignTrafficSource', 'date1' => $fmt($from), 'date2' => $fmt($to), 'sort' => '-ym:s:visits']));
        $sources['utm'] = $rows($stat(['metrics' => implode(',', $metrics), 'dimensions' => 'ym:s:lastsignUTMSource,ym:s:lastsignUTMCampaign', 'date1' => $fmt($from), 'date2' => $fmt($to), 'sort' => '-ym:s:visits', 'limit' => 50]));
        $sources['lead_goal_missing'] = $leadMetric === null;
    } catch (DashError $e) {
        $sources['error'] = $e->getMessage();
    }
}
if ($pdo) {
    try {
        $sources['db_utm'] = $dbGroup('utm_source', '(без метки)');
        $sources['db_source'] = $dbGroup('source', 'website');
    } catch (Throwable $e) {
        error_log('TeachNet dash: sources — ' . $e->getMessage());
        $sources['db_error'] = 'Не удалось прочитать заявки из базы.';
    }
}
$result['sources'] = $sources;

/* ---------- 4. последние заявки ---------- */

$leads = ['error' => $dbError, 'rows' => []];
if ($pdo) {
    try {
        [$x, $y] = $range($from, $to);
        $st = $pdo->prepare('SELECT * FROM leads WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 20');
        $st->execute([$x, $y]);
        foreach ($st->fetchAll() as $r) {
            $leads['rows'][] = [
                'id' => (int) ($r['id'] ?? 0),
                'created_at' => (string) ($r['created_at'] ?? ''),
                'name' => (string) ($r['name'] ?? ''),
                'phone' => (string) ($r['phone'] ?? ''),
                'age' => (string) ($r['child_age'] ?? ''),
                'source' => (string) ($r['source'] ?? ''),
                'branch' => (string) ($r['branch'] ?? ''),
                'utm_source' => (string) ($r['utm_source'] ?? ''),
                'utm_campaign' => (string) ($r['utm_campaign'] ?? ''),
            ];
        }
    } catch (Throwable $e) {
        error_log('TeachNet dash: last leads — ' . $e->getMessage());
        $leads['error'] = 'Не удалось прочитать заявки из базы.';
    }
}
$result['leads'] = $leads;

/* ---------- 5. клики и действия + глубина просмотра ---------- */

$clicks = ['error' => $metrikaError, 'groups' => [], 'scroll' => [], 'other' => []];
if (!$metrikaError) {
    try {
        $reach = [];
        $all = [];
        foreach (CLICK_GROUPS as $g) {
            foreach ($g['goals'] as $ident) {
                if ($m = $gm($ident, 'reaches')) {
                    $all[] = $m;
                }
            }
        }
        // цели из Метрики, которых нет в справочнике (кроме служебных scroll_* и lead_form)
        $known = array_merge(array_merge(...array_column(CLICK_GROUPS, 'goals')), SCROLL_GOALS, ['lead_form']);
        $otherIds = [];
        foreach ($goals as $ident => $id) {
            if (!in_array($ident, $known, true)) {
                $otherIds[$ident] = $id;
                $all[] = 'ym:s:goal' . $id . 'reaches';
            }
        }
        $scrollMetrics = ['ym:s:visits'];
        foreach (SCROLL_GOALS as $ident) {
            if ($m = $gm($ident, 'visits')) {
                $scrollMetrics[] = $m;
            }
        }
        $reach = $all ? $totals(array_values(array_unique($all)), $fmt($from), $fmt($to)) : [];
        $scrollTot = $totals($scrollMetrics, $fmt($from), $fmt($to));

        foreach (CLICK_GROUPS as $g) {
            $rows = [];
            foreach ($g['goals'] as $ident) {
                $m = $gm($ident, 'reaches');
                $rows[] = ['id' => $ident, 'name' => GOAL_NAMES[$ident] ?? $ident, 'value' => $m ? $reach[$m] : null, 'missing' => $m === null];
            }
            $clicks['groups'][] = ['title' => $g['title'], 'rows' => $rows];
        }
        $visits = $scrollTot['ym:s:visits'];
        foreach (SCROLL_GOALS as $ident) {
            $m = $gm($ident, 'visits');
            $v = $m ? $scrollTot[$m] : null;
            $clicks['scroll'][] = [
                'id' => $ident, 'name' => GOAL_NAMES[$ident] ?? $ident, 'value' => $v, 'missing' => $m === null,
                'pct' => $v !== null && $visits > 0 ? round(100 * $v / $visits, 1) : null,
            ];
        }
        foreach ($otherIds as $ident => $id) {
            $clicks['other'][] = ['id' => $ident, 'name' => $goalNames[$id] ?: $ident, 'value' => $reach['ym:s:goal' . $id . 'reaches'] ?? 0, 'missing' => false];
        }
        $clicks['lead_form'] = ['missing' => !isset($goals['lead_form'])];
    } catch (DashError $e) {
        $clicks['error'] = $e->getMessage();
    }
}
$result['clicks'] = $clicks;

$result['fetched_at'] = date('d.m.Y H:i', $oldest ?? time());
$result['errors'] = array_values(array_unique(array_filter($result['errors'])));
out(200, $result);
