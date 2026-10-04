<?php
/**
 * TeachNet — дашборд /dash: расчёт блоков (Метрика + база заявок).
 * Подключается из api.php после проверки входа. Каждый блок — отдельный метод,
 * ошибка одного блока не мешает остальным.
 */
declare(strict_types=1);

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

/* ---------- справочник целей сайта ---------- */

/** Идентификатор цели → понятное название. Это же — список целей, которые ждёт дашборд. */
const GOAL_NAMES = [
    // заявка
    'lead_form' => 'Заявка отправлена',
    // кнопки записи: главная
    'hero_cta' => 'Кнопка в первом экране (главная)',
    'nav_cta' => 'Кнопка «Пробный урок» в шапке (главная)',
    'burger_cta' => 'Кнопка в мобильном меню (главная)',
    'block4_signup' => 'Кнопка под программами (главная)',
    'block12_cta' => 'Кнопка в финальном блоке (главная)',
    'sticky_cta' => 'Плавающая кнопка внизу экрана (главная)',
    // кнопки записи: /electronics
    'cta_hero' => 'Кнопка в первом экране (электроника)',
    'cta_trial' => 'Кнопка в блоке «Пробный урок» (электроника)',
    'cta_price' => 'Кнопка в блоке цены (электроника)',
    'cta_final' => 'Кнопка в контактах (электроника)',
    'cta_menu' => 'Кнопка в мобильном меню (электроника)',
    // связь
    'msg_telegram' => 'Telegram в окне записи (электроника)',
    'msg_max' => 'MAX в окне записи (электроника)',
    'phone_click' => 'Клик по телефону (электроника)',
    'nav_phone' => 'Телефон в шапке и меню (главная)',
    // переходы
    'programs_electronics' => 'Главная → «Подробнее о курсе» электроники',
    'footer_electronics' => 'Подвал → «Электроника»',
    'footer_robotics' => 'Подвал → «Робототехника на LEGO»',
    'footer_tech' => 'Подвал → «Учебная плата TEACHNET UNO»',
    'cross_robotics' => 'Электроника → «Смотрите робототехнику»',
    'back_click' => 'Кнопка «Назад» (электроника)',
    'nav_programs' => 'Меню: «Программы» (главная)',
    'nav_price' => 'Меню: «Цена» (главная)',
    'nav_press' => 'Меню: «О нас пишут» (главная)',
    'nav_faq' => 'Меню: «Вопросы» (главная)',
    'el_nav_program' => 'Меню: «Программа» (электроника)',
    'el_nav_price' => 'Меню: «Цена» (электроника)',
    'el_nav_faq' => 'Меню: «Вопросы» (электроника)',
    'el_nav_contacts' => 'Меню: «Контакты» (электроника)',
    'map_click' => '«Открыть в Яндекс Картах» (электроника)',
    'modal_close_empty' => 'Окно записи закрыто без выбора (электроника)',
    // публикации
    'press_click' => 'Публикация о нас (электроника)',
    'press_click_minmol' => 'Публикация: Минмолодёжи РТ (главная)',
    'press_click_monrt' => 'Публикация: Минобрнауки РТ (главная)',
    'press_click_kai' => 'Публикация: КНИТУ-КАИ (главная)',
    'press_click_tatarinform' => 'Публикация: Татар-информ (главная)',
    // глубина просмотра
    'scroll_hero' => 'Первый экран',
    'scroll_trust' => 'Нас поддерживают',
    'scroll_translator' => 'Инженерия — проще, чем звучит',
    'scroll_programs' => 'Путь ребёнка (программы)',
    'scroll_mission' => 'Здесь не уроки, здесь миссии',
    'scroll_motivation' => 'Почему дети сами просятся',
    'scroll_parents' => 'Вы будете знать, чем занят ребёнок',
    'scroll_team' => 'Преподаватель',
    'scroll_conversion' => 'Форма заявки',
    'scroll_price' => 'Цена',
    'scroll_press' => 'О нас пишут',
    'scroll_faq' => 'Вопросы',
    'scroll_final' => 'Финальный блок',
    'scroll_footer' => 'Подвал',
    'scroll_trial' => 'Пробный урок',
    'scroll_contacts' => 'Контакты',
    // глубина просмотра /electronics (свои идентификаторы, чтобы не смешиваться с главной)
    'scroll_el_hero' => 'Первый экран (электроника)',
    'scroll_el_result' => 'Результат по месяцам (электроника)',
    'scroll_el_lesson' => 'Как проходят занятия (электроника)',
    'scroll_el_program' => 'Программа курса (электроника)',
    'scroll_el_progress' => 'Прогресс, который видно (электроника)',
    'scroll_el_teacher' => 'Ведёт инженер (электроника)',
    'scroll_el_trust' => 'Нам доверяют (электроника)',
    // страница /tech — учебная плата TEACHNET UNO (docs/analytics-tech.md)
    'scroll_tech_hero' => 'Первый экран (плата)',
    'scroll_tech_board' => '«Что на плате» (плата)',
    'scroll_tech_compare' => 'Сравнение (плата)',
    'scroll_tech_specs' => 'Характеристики (плата)',
    'scroll_tech_teachers' => 'Педагогам (плата)',
    'scroll_tech_order' => 'Заявка (плата)',
    'scroll_tech_faq' => 'Вопросы (плата)',
    'scroll_tech_footer' => 'Подвал (плата)',
    'tech_order_header' => '«Оставить заявку» в шапке (плата)',
    'tech_order_hero' => '«Оставить заявку» в первом экране (плата)',
    'tech_order_menu' => '«Оставить заявку» в меню (плата)',
    'tech_nav_board' => 'Меню: «Что на плате» (плата)',
    'tech_nav_compare' => 'Меню: «Сравнение» (плата)',
    'tech_nav_specs' => 'Меню: «Характеристики» (плата)',
    'tech_nav_teachers' => 'Меню: «Педагогам» (плата)',
    'tech_nav_faq' => 'Меню: «Вопросы» (плата)',
    'tech_hero_board' => '«Что на плате» в первом экране (плата)',
    'tech_logo_home' => 'Логотип → главная (плата)',
    'tech_tab_pins' => 'Вкладка «Выводы» (плата)',
    'tech_tab_features' => 'Вкладка «9 решений» (плата)',
    'tech_feature' => 'Выбрали решение на плате',
    'tech_pins_group' => 'Выбрали группу выводов',
    'tech_specs_pins' => 'Характеристики → вкладка «Выводы» (плата)',
    'tech_faq_pins' => 'Ответ → вкладка «Выводы» (плата)',
    'tech_pdf_board' => '«Описание платы (PDF)»',
    'tech_pdf_pins' => '«Назначение выводов (PDF)»',
    'tech_faq_open' => 'Раскрыли вопрос (плата)',
    'tech_form_start' => 'Начали заполнять заявку на платы',
    'tech_form_error' => 'Ошибка в заявке на платы',
    'tech_lead' => 'Заявка на платы отправлена',
    'tech_form_again' => '«Отправить ещё одну» (плата)',
];

/** Шаг воронки «Дошли до цены или формы» и «Нажали «Записаться»» — по всему сайту. */
const REACH_GOALS = ['scroll_price', 'scroll_conversion', 'scroll_contacts'];
const CTA_GOALS = ['hero_cta', 'nav_cta', 'burger_cta', 'sticky_cta', 'block4_signup', 'block12_cta',
    'cta_hero', 'cta_trial', 'cta_price', 'cta_final', 'cta_menu'];

/** Кнопки записи и цели, по которым видно, что кнопка сломалась (тревога «нет срабатываний 7 дней»). */
const WATCH_GOALS = ['lead_form', 'hero_cta', 'nav_cta', 'sticky_cta', 'cta_hero', 'cta_price'];

/** Страницы для воронки: путь в Метрике, source заявок в базе, цели шагов 2–3. */
const DASH_PAGES = [
    'all' => ['label' => 'Все', 'path' => null, 'sources' => null, 'reach' => REACH_GOALS, 'cta' => CTA_GOALS],
    'main' => ['label' => 'Главная', 'path' => '/', 'sources' => ['website'],
        'reach' => ['scroll_price', 'scroll_conversion'],
        'cta' => ['hero_cta', 'nav_cta', 'burger_cta', 'sticky_cta', 'block4_signup', 'block12_cta']],
    'electronics' => ['label' => 'Электроника', 'path' => '/electronics', 'sources' => ['electronics'],
        'reach' => ['scroll_price', 'scroll_contacts'],
        'cta' => ['cta_hero', 'cta_trial', 'cta_price', 'cta_final', 'cta_menu']],
    'child' => ['label' => 'Мастер-классы', 'path' => '/child', 'sources' => ['child-masterclass'], 'reach' => [], 'cta' => []],
];

/** «Что люди делают на странице»: секции сверху вниз, кнопки по местам, способы связи, переходы. */
const DASH_BEHAVIOR = [
    'main' => [
        'path' => '/',
        'depth' => ['scroll_hero', 'scroll_trust', 'scroll_translator', 'scroll_programs', 'scroll_mission', 'scroll_motivation',
            'scroll_parents', 'scroll_team', 'scroll_conversion', 'scroll_price', 'scroll_press', 'scroll_faq', 'scroll_final', 'scroll_footer'],
        'cta' => ['hero_cta' => 'Первый экран', 'nav_cta' => 'Шапка', 'burger_cta' => 'Мобильное меню',
            'sticky_cta' => 'Плавающая кнопка', 'block4_signup' => 'Под программами', 'block12_cta' => 'Финальный блок'],
        'contact' => ['lead_form' => 'Форма', 'nav_phone' => 'Звонок'],
        'links' => ['programs_electronics', 'footer_electronics', 'footer_robotics', 'footer_tech', 'nav_programs', 'nav_price', 'nav_press', 'nav_faq',
            'press_click_minmol', 'press_click_monrt', 'press_click_kai', 'press_click_tatarinform'],
    ],
    'electronics' => [
        'path' => '/electronics',
        'depth' => ['scroll_el_hero', 'scroll_el_result', 'scroll_el_lesson', 'scroll_trial', 'scroll_el_program',
            'scroll_el_progress', 'scroll_el_teacher', 'scroll_el_trust', 'scroll_price', 'scroll_faq', 'scroll_contacts'],
        'cta' => ['cta_hero' => 'Первый экран', 'cta_trial' => 'Блок «Пробный урок»', 'cta_price' => 'Блок цены',
            'cta_final' => 'Контакты', 'cta_menu' => 'Мобильное меню'],
        'contact' => ['lead_form' => 'Форма', 'msg_telegram' => 'Telegram', 'msg_max' => 'MAX', 'phone_click' => 'Звонок'],
        'links' => ['el_nav_program', 'el_nav_price', 'el_nav_faq', 'el_nav_contacts', 'cross_robotics', 'back_click', 'footer_electronics', 'footer_robotics', 'footer_tech', 'press_click', 'map_click', 'modal_close_empty'],
    ],
];

const DASH_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const DASH_MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

/* ---------- форматирование для текстов выводов ---------- */

function dash_num(float $v, int $dec = 0): string {
    return number_format($v, $dec, ',', "\u{00A0}");
}
function dash_pct(float $v): string {
    $s = number_format($v, abs($v) < 10 ? 1 : 0, ',', "\u{00A0}");
    return preg_replace('/,0$/', '', $s) . "\u{00A0}%";
}
function dash_rub(float $v): string {
    return dash_num(round($v)) . "\u{00A0}₽";
}
function dash_day_label(DateTimeImmutable $d): string {
    return (int) $d->format('j') . "\u{00A0}" . DASH_MONTHS[(int) $d->format('n') - 1];
}

/* ---------- расчёт ---------- */

final class DashReport {
    public DateTimeImmutable $now;
    public DateTimeImmutable $today;
    public DateTimeImmutable $from;
    public DateTimeImmutable $to;
    public DateTimeImmutable $prevFrom;
    public DateTimeImmutable $prevTo;
    public int $days;
    public string $period;
    public string $group;
    public string $branch;
    public bool $compare;

    private array $cfg;
    private ?array $sendCfg;
    private ?string $sendError;
    private int $counter;
    private string $ownHost;
    private ?array $goals = null;
    private ?PDO $pdo = null;
    private ?string $dbError = null;
    private bool $dbTried = false;
    private ?array $schema = null;
    private ?int $fetched = null;
    private array $memo = [];

    public function __construct(array $cfg, ?array $sendCfg, array $q, ?string $sendError = null) {
        $this->cfg = $cfg;
        $this->sendCfg = $sendCfg;
        $this->sendError = $sendError;
        $this->counter = (int) ($cfg['counter_id'] ?? 96429194);
        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $host = preg_replace('/:\d+$/', '', $host) ?? $host;
        $this->ownHost = preg_replace('/^www\./', '', $host) ?: 'teachnet.ru';

        $tz = new DateTimeZone('Europe/Moscow');
        $this->now = new DateTimeImmutable('now', $tz);
        $this->today = $this->now->setTime(0, 0);
        $parse = static function ($v) use ($tz): ?DateTimeImmutable {
            if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
                return null;
            }
            $d = DateTimeImmutable::createFromFormat('!Y-m-d', $v, $tz);
            return $d && $d->format('Y-m-d') === $v ? $d : null;
        };
        $period = (string) ($q['period'] ?? '30');
        $from = $to = null;
        if ($period === 'custom') {
            $from = $parse($q['from'] ?? null);
            $to = $parse($q['to'] ?? null);
            if (!$from || !$to) {
                $period = '30';
            }
        }
        if ($period === 'today') {
            $from = $to = $this->today;
        } elseif ($period !== 'custom') {
            $period = in_array($period, ['7', '30', '90'], true) ? $period : '30';
            $to = $this->today;
            $from = $to->modify('-' . ((int) $period - 1) . ' days');
        }
        if ($to > $this->today) {
            $to = $this->today;
        }
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        if ($from < $to->modify('-365 days')) {
            $from = $to->modify('-365 days');
        }
        $this->period = $period;
        $this->from = $from;
        $this->to = $to;
        $this->days = (int) $from->diff($to)->days + 1;
        $this->prevTo = $from->modify('-1 day');
        $this->prevFrom = $this->prevTo->modify('-' . ($this->days - 1) . ' days');

        $group = (string) ($q['group'] ?? '');
        $this->group = in_array($group, ['day', 'week'], true) ? $group : ($this->days >= 30 ? 'week' : 'day');
        if ($this->days < 8) {
            $this->group = 'day';
        }
        $branch = (string) ($q['branch'] ?? 'all');
        $this->branch = isset(DASH_BRANCHES[$branch]) ? $branch : 'all';
        $this->compare = ($q['compare'] ?? '1') !== '0';
    }

    /** Время самого старого ответа Метрики из кеша, использованного в блоке. */
    public function fetchedAt(): ?int {
        return $this->fetched;
    }

    /** Общая часть ответа любого блока. */
    public function meta(): array {
        return [
            'period' => [
                'from' => $this->from->format('Y-m-d'), 'to' => $this->to->format('Y-m-d'), 'days' => $this->days,
                'prev_from' => $this->prevFrom->format('Y-m-d'), 'prev_to' => $this->prevTo->format('Y-m-d'),
                'group' => $this->group, 'branch' => $this->branch, 'compare' => $this->compare,
            ],
            'fetched_at' => $this->fetched,
        ];
    }

    /* ---------- Метрика ---------- */

    private function mget(string $path, array $params, bool $quiet = false): array {
        [$data, $t] = metrika_get($this->cfg, $path, $params, $quiet);
        $this->fetched = $this->fetched === null ? $t : min($this->fetched, $t);
        return $data;
    }

    private static function ymd(DateTimeImmutable $d): string {
        return $d->format('Y-m-d');
    }

    public function stat(array $p, bool $quiet = false): array {
        $p += ['ids' => $this->counter, 'lang' => 'ru', 'accuracy' => 'full', 'limit' => 100];
        return $this->mget('/stat/v1/data', $p, $quiet);
    }

    /** Итоги по метрикам (по 20 метрик в запросе): [метрика => число]. */
    public function totals(array $metrics, DateTimeImmutable $a, DateTimeImmutable $b, string $filter = ''): array {
        $metrics = array_values(array_unique(array_filter($metrics)));
        $out = [];
        foreach (array_chunk($metrics, 20) as $chunk) {
            $p = ['metrics' => implode(',', $chunk), 'date1' => self::ymd($a), 'date2' => self::ymd($b)];
            if ($filter !== '') {
                $p['filters'] = $filter;
            }
            $data = $this->stat($p);
            foreach ($chunk as $i => $m) {
                $out[$m] = (float) ($data['totals'][$i] ?? 0);
            }
        }
        return $out;
    }

    /**
     * Таблица с группировками: [['dims' => [['id'=>…, 'name'=>…], …], 'm' => [метрика => число]], …].
     * Больше 20 метрик — несколько запросов, строки склеиваются по группировкам.
     */
    public function byDim(array $dims, array $metrics, DateTimeImmutable $a, DateTimeImmutable $b, string $filter = '', int $limit = 1000): array {
        $metrics = array_values(array_unique(array_filter($metrics)));
        $rows = [];
        foreach (array_chunk($metrics, 20) as $chunk) {
            $p = ['metrics' => implode(',', $chunk), 'dimensions' => implode(',', $dims),
                'date1' => self::ymd($a), 'date2' => self::ymd($b), 'limit' => $limit, 'sort' => '-' . $chunk[0]];
            if ($filter !== '') {
                $p['filters'] = $filter;
            }
            $data = $this->stat($p);
            foreach ($data['data'] ?? [] as $r) {
                $d = array_map(static fn ($x) => ['id' => (string) ($x['id'] ?? ''), 'name' => (string) ($x['name'] ?? '')], $r['dimensions'] ?? []);
                $key = implode("\x1f", array_map(static fn ($x) => $x['id'] . '|' . $x['name'], $d));
                $rows[$key] ??= ['dims' => $d, 'm' => []];
                foreach ($chunk as $i => $m) {
                    $rows[$key]['m'][$m] = (float) ($r['metrics'][$i] ?? 0);
                }
            }
        }
        return array_values($rows);
    }

    /** Визиты по дням: ['Y-m-d' => число]. */
    public function visitsByDay(DateTimeImmutable $a, DateTimeImmutable $b): array {
        $data = $this->stat(['metrics' => 'ym:s:visits', 'dimensions' => 'ym:s:date', 'date1' => self::ymd($a),
            'date2' => self::ymd($b), 'sort' => 'ym:s:date', 'limit' => 400]);
        $out = [];
        foreach ($data['data'] ?? [] as $r) {
            $out[(string) ($r['dimensions'][0]['name'] ?? '')] = (float) ($r['metrics'][0] ?? 0);
        }
        return $out;
    }

    /**
     * Фильтр «визиты, в которых была страница». Если Метрика не примет EXISTS —
     * считаем по странице входа и возвращаем пометку.
     * @return array{0: mixed, 1: string}
     */
    public function withPage(?string $path, callable $fn): array {
        if ($path === null) {
            return [$fn(''), ''];
        }
        try {
            return [$fn("EXISTS(ym:pv:URLPath=='" . $path . "')"), ''];
        } catch (DashError $e) {
            if (strpos($e->getMessage(), 'Метрика вернула ошибку') !== 0) {
                throw $e;
            }
            return [$fn("ym:s:startURLPath=='" . $path . "'"), 'Считаются визиты, которые начались с этой страницы.'];
        }
    }

    /** Цели счётчика: одиночные (идентификатор → id) и составные цели воронки. */
    public function goals(): array {
        if ($this->goals !== null) {
            return $this->goals;
        }
        $d = $this->mget('/management/v1/counter/' . $this->counter . '/goals', []);
        $single = [];
        $names = [];
        $composites = [];
        foreach ($d['goals'] ?? [] as $g) {
            $id = (int) ($g['id'] ?? 0);
            $names[$id] = (string) ($g['name'] ?? '');
            if (($g['type'] ?? '') !== 'action') {
                continue; // JavaScript-событие
            }
            $conds = array_values(array_filter($g['conditions'] ?? [], static fn ($c) => is_array($c) && ($c['url'] ?? '') !== ''));
            if (count($conds) === 1 && ($conds[0]['type'] ?? '') === 'exact') {
                $single[(string) $conds[0]['url']] ??= $id;
            } elseif ($conds) {
                $composites[$id] = $conds; // несколько условий «или», «содержит», регулярное выражение
            }
        }
        $known = array_keys(GOAL_NAMES);
        $find = static function (array $set) use ($composites, $known): ?int {
            sort($set);
            foreach ($composites as $id => $conds) {
                $cov = array_values(array_filter($known, static fn ($k) => self::condMatch($conds, $k)));
                sort($cov);
                if ($cov === $set) {
                    return $id;
                }
            }
            return null;
        };
        $other = [];
        foreach ($single as $ident => $id) {
            if (!isset(GOAL_NAMES[$ident])) {
                $other[$ident] = $id;
            }
        }
        return $this->goals = [
            'single' => $single, 'names' => $names, 'other' => $other,
            'reach' => $find(REACH_GOALS), 'cta' => $find(CTA_GOALS),
        ];
    }

    private static function condMatch(array $conds, string $ident): bool {
        foreach ($conds as $c) {
            $u = (string) ($c['url'] ?? '');
            switch ($c['type'] ?? '') {
                case 'exact':
                    if ($u === $ident) {
                        return true;
                    }
                    break;
                case 'contain':
                    if ($u !== '' && strpos($ident, $u) !== false) {
                        return true;
                    }
                    break;
                case 'start':
                    if ($u !== '' && strpos($ident, $u) === 0) {
                        return true;
                    }
                    break;
                case 'regexp':
                    if (@preg_match('~' . str_replace('~', '\~', $u) . '~u', $ident) === 1) {
                        return true;
                    }
                    break;
            }
        }
        return false;
    }

    /** Имя метрики цели: ym:s:goal<ID>visits / reaches; null — цели нет в Метрике. */
    public function gm(string $ident, string $kind = 'visits'): ?string {
        $s = $this->goals()['single'];
        return isset($s[$ident]) ? 'ym:s:goal' . $s[$ident] . $kind : null;
    }

    /** Метрики для шага из нескольких целей: составная цель или отдельные цели. */
    private function setMetrics(array $set, string $which): array {
        if (!$set) {
            return [];
        }
        $comp = $this->goals()[$which];
        if ($comp && count($set) > 1) {
            return ['ym:s:goal' . $comp . 'visits'];
        }
        return array_values(array_filter(array_map(fn ($g) => $this->gm($g), $set)));
    }

    /**
     * Значение шага из нескольких целей.
     * @return array{value: ?float, approx: bool, state: string, parts: array}
     */
    private function setValue(array $set, string $which, array $tot, ?float $cap): array {
        if (!$set) {
            return ['value' => null, 'approx' => false, 'state' => 'nogoals', 'parts' => []];
        }
        $comp = $this->goals()[$which];
        $parts = [];
        foreach ($set as $g) {
            $m = $this->gm($g);
            $parts[] = ['id' => $g, 'name' => GOAL_NAMES[$g] ?? $g, 'missing' => $m === null, 'value' => $m ? ($tot[$m] ?? 0) : null];
        }
        if ($comp && count($set) > 1) {
            return ['value' => $tot['ym:s:goal' . $comp . 'visits'] ?? 0, 'approx' => false, 'state' => 'ok', 'parts' => $parts];
        }
        $present = array_filter($parts, static fn ($p) => !$p['missing']);
        if (!$present) {
            return ['value' => null, 'approx' => false, 'state' => 'missing', 'parts' => $parts];
        }
        $sum = array_sum(array_column($present, 'value'));
        $approx = count($set) > 1;
        // визит мог достичь нескольких целей шага: без составной цели сумма — оценка сверху
        if ($approx && $cap !== null) {
            $sum = min($sum, $cap);
        }
        return ['value' => $sum, 'approx' => $approx && $sum > 0, 'state' => 'ok', 'parts' => $parts];
    }

    /* ---------- база ---------- */

    public function db(): ?PDO {
        if (!$this->dbTried) {
            $this->dbTried = true;
            if ($this->sendError !== null) {
                $this->dbError = $this->sendError; // send_config.php с ошибкой
                return null;
            }
            try {
                $this->pdo = dash_db($this->sendCfg);
                $this->schema = dash_schema($this->pdo);
            } catch (DashError $e) {
                $this->pdo = null;
                $this->dbError = $e->getMessage();
            }
        }
        return $this->pdo;
    }

    public function dbError(): ?string {
        $this->db();
        return $this->dbError;
    }

    public function schema(): array {
        $this->db();
        return $this->schema ?? ['cols' => [], 'status' => false, 'channel' => false, 'manual' => false, 'branch' => false, 'log' => false, 'spend' => false];
    }

    private static function range(DateTimeImmutable $a, DateTimeImmutable $b): array {
        return [$a->format('Y-m-d 00:00:00'), $b->modify('+1 day')->format('Y-m-d 00:00:00')];
    }

    /** Заявка из базы в едином виде: канал, до какого шага дошла. */
    public function normalize(array $r): array {
        $s = $this->schema();
        $status = $s['status'] ? ((string) ($r['status'] ?? '') ?: 'new') : null;
        if ($status !== null && !isset(DASH_STATUSES[$status])) {
            $status = 'new';
        }
        $override = (string) ($r['channel'] ?? '');
        $auto = dash_channel_for_lead($r, $this->ownHost);
        $rank = $status !== null ? DASH_STATUSES[$status]['rank'] : 0;
        $manual = !empty($r['is_manual']);
        $noSource = !$manual && trim((string) ($r['utm_source'] ?? '')) === '' && trim((string) ($r['yclid'] ?? '')) === ''
            && trim((string) ($r['referrer'] ?? '')) === '';
        return [
            'id' => (int) ($r['id'] ?? 0),
            'created_at' => (string) ($r['created_at'] ?? ''),
            'name' => (string) ($r['name'] ?? ''),
            'phone' => (string) ($r['phone'] ?? ''),
            'age' => (string) ($r['child_age'] ?? ''),
            'source' => (string) ($r['source'] ?? '') ?: 'website',
            'branch' => (string) ($r['branch'] ?? ''),
            'utm_source' => (string) ($r['utm_source'] ?? ''),
            'utm_medium' => (string) ($r['utm_medium'] ?? ''),
            'utm_campaign' => (string) ($r['utm_campaign'] ?? ''),
            'utm_content' => (string) ($r['utm_content'] ?? ''),
            'channel' => isset(DASH_CHANNELS[$override]) ? $override : $auto,
            'channel_auto' => $auto,
            'channel_manual' => isset(DASH_CHANNELS[$override]),
            'no_source' => $noSource,
            'manual' => $manual,
            'status' => $status,
            'contacted_at' => (string) ($r['contacted_at'] ?? ''),
            'trial_at' => (string) ($r['trial_at'] ?? ''),
            'attended' => (int) ($r['attended'] ?? 0) === 1,
            'paid_at' => (string) ($r['paid_at'] ?? ''),
            'paid_amount' => isset($r['paid_amount']) && $r['paid_amount'] !== '' ? (int) $r['paid_amount'] : null,
            'lost_reason' => (string) ($r['lost_reason'] ?? ''),
            'note' => (string) ($r['note'] ?? ''),
            'status_updated_at' => (string) ($r['status_updated_at'] ?? ''),
            // до какого шага дошла: по статусу и по отметкам (отказ после пробного помнит пробное)
            'st_contacted' => $rank >= 1 || !empty($r['contacted_at']),
            'st_trial' => $rank >= 2 || !empty($r['trial_at']),
            'st_attended' => $rank >= 3 || (int) ($r['attended'] ?? 0) === 1,
            'st_paid' => $rank >= 4 || !empty($r['paid_at']),
        ];
    }

    /** Заявки, созданные в период (с фильтром филиала). */
    public function leadsCreated(DateTimeImmutable $a, DateTimeImmutable $b, bool $byBranch = true): array {
        $key = 'c' . self::ymd($a) . self::ymd($b) . ($byBranch ? $this->branch : 'all');
        if (isset($this->memo[$key])) {
            return $this->memo[$key];
        }
        $pdo = $this->db();
        if (!$pdo) {
            throw new DashError((string) $this->dbError);
        }
        [$x, $y] = self::range($a, $b);
        $st = $pdo->prepare('SELECT * FROM leads WHERE created_at >= ? AND created_at < ? AND ' . DASH_EXCLUDED_SQL . ' ORDER BY created_at DESC, id DESC');
        $st->execute([$x, $y]);
        $rows = array_map(fn ($r) => $this->normalize($r), $st->fetchAll());
        if ($byBranch && $this->branch !== 'all') {
            $rows = array_values(array_filter($rows, fn ($r) => $r['branch'] === $this->branch));
        }
        return $this->memo[$key] = $rows;
    }

    /** Заявки, у которых событие (paid_at, trial_at) попало в период. */
    public function leadsByEvent(string $col, DateTimeImmutable $a, DateTimeImmutable $b): array {
        if (!in_array($col, ['paid_at', 'trial_at'], true) || !$this->schema()['status']) {
            return [];
        }
        $key = 'e' . $col . self::ymd($a) . self::ymd($b) . $this->branch;
        if (isset($this->memo[$key])) {
            return $this->memo[$key];
        }
        [$x, $y] = self::range($a, $b);
        $st = $this->db()->prepare("SELECT * FROM leads WHERE $col >= ? AND $col < ? AND " . DASH_EXCLUDED_SQL);
        $st->execute([$x, $y]);
        $rows = array_map(fn ($r) => $this->normalize($r), $st->fetchAll());
        if ($this->branch !== 'all') {
            $rows = array_values(array_filter($rows, fn ($r) => $r['branch'] === $this->branch));
        }
        if ($col === 'trial_at') {
            $rows = array_values(array_filter($rows, static fn ($r) => $r['st_attended']));
        }
        return $this->memo[$key] = $rows;
    }

    /** Новые заявки без ответа за всё время (без архива). */
    public function leadsUnanswered(): array {
        if (!$this->schema()['status']) {
            return [];
        }
        if (isset($this->memo['unanswered'])) {
            return $this->memo['unanswered'];
        }
        $st = $this->db()->query("SELECT * FROM leads WHERE status = 'new' AND " . DASH_EXCLUDED_SQL . ' ORDER BY created_at DESC, id DESC');
        return $this->memo['unanswered'] = array_map(fn ($r) => $this->normalize($r), $st->fetchAll());
    }

    public function dt(string $s): ?DateTimeImmutable {
        if ($s === '') {
            return null;
        }
        try {
            return new DateTimeImmutable($s, new DateTimeZone('Europe/Moscow'));
        } catch (Throwable $e) {
            return null;
        }
    }

    /** По дням: ['Y-m-d' => число] для списка заявок по полю даты. */
    private static function countByDay(array $rows, string $field): array {
        $out = [];
        foreach ($rows as $r) {
            $d = substr((string) $r[$field], 0, 10);
            if ($d !== '') {
                $out[$d] = ($out[$d] ?? 0) + 1;
            }
        }
        return $out;
    }

    /* ---------- расходы ---------- */

    /** Расходы Директа из Метрики по дням; null — Директ не привязан или расходов нет. */
    public function directCosts(DateTimeImmutable $a, DateTimeImmutable $b): ?array {
        try {
            $data = $this->stat(['metrics' => 'ym:ad:RUBConvertedAdCost', 'dimensions' => 'ym:ad:date',
                'date1' => self::ymd($a), 'date2' => self::ymd($b), 'limit' => 400], true);
        } catch (DashError $e) {
            return null; // нет Директа — только ручной ввод, без ошибок
        }
        $out = [];
        foreach ($data['data'] ?? [] as $r) {
            $out[(string) ($r['dimensions'][0]['name'] ?? '')] = (float) ($r['metrics'][0] ?? 0);
        }
        return array_sum($out) > 0 ? $out : null;
    }

    public function spendRows(): array {
        if (!$this->schema()['spend']) {
            return [];
        }
        return $this->memo['spendRows'] ??= $this->db()->query('SELECT * FROM ad_spend ORDER BY month DESC, id DESC')->fetchAll();
    }

    /**
     * Расходы за период: расход месяца делится на дни поровну.
     * @return array{total: float, by_channel: array, by_day: array, auto_direct: bool, has_data: bool}
     */
    public function spendFor(DateTimeImmutable $a, DateTimeImmutable $b): array {
        $key = 's' . self::ymd($a) . self::ymd($b);
        if (isset($this->memo[$key])) {
            return $this->memo[$key];
        }
        $direct = $this->directCosts($a, $b);
        $byCh = [];
        $byDay = [];
        $hasRows = false;
        foreach ($this->spendRows() as $r) {
            $hasRows = true;
            $ch = (string) $r['channel'];
            if ($direct !== null && $ch === 'direct') {
                continue; // Директ подставляется из Метрики
            }
            $m = DateTimeImmutable::createFromFormat('!Y-m-d', substr((string) $r['month'], 0, 10), new DateTimeZone('Europe/Moscow'));
            if (!$m) {
                continue;
            }
            $m = $m->modify('first day of this month');
            $end = $m->modify('last day of this month');
            $dim = (int) $end->format('j');
            $perDay = (float) $r['amount'] / $dim;
            $s = max($m, $a);
            $e = min($end, $b);
            for ($d = $s; $d <= $e; $d = $d->modify('+1 day')) {
                $k = $d->format('Y-m-d');
                $byDay[$k] = ($byDay[$k] ?? 0) + $perDay;
                $byCh[$ch] = ($byCh[$ch] ?? 0) + $perDay;
            }
        }
        if ($direct !== null) {
            foreach ($direct as $k => $v) {
                $byDay[$k] = ($byDay[$k] ?? 0) + $v;
                $byCh['direct'] = ($byCh['direct'] ?? 0) + $v;
            }
        }
        return $this->memo[$key] = [
            'total' => array_sum($byCh), 'by_channel' => $byCh, 'by_day' => $byDay,
            'auto_direct' => $direct !== null, 'has_data' => $hasRows || $direct !== null,
        ];
    }

    /* ---------- группировка по дням / неделям ---------- */

    /** Интервалы графика. Для прошлого периода — те же интервалы, сдвинутые на длину периода. */
    public function buckets(): array {
        $out = [];
        if ($this->group === 'day') {
            for ($d = $this->from; $d <= $this->to; $d = $d->modify('+1 day')) {
                $out[] = ['from' => $d, 'to' => $d, 'partial' => $d == $this->today];
            }
        } else {
            $s = $this->from;
            while ($s <= $this->to) {
                $sunday = $s->modify('sunday this week');
                $e = min($sunday, $this->to);
                $len = (int) $s->diff($e)->days + 1;
                $out[] = ['from' => $s, 'to' => $e, 'partial' => $len < 7 || $e >= $this->today];
                $s = $e->modify('+1 day');
            }
        }
        return $out;
    }

    public function bucketMeta(array $buckets): array {
        return array_map(static function ($b) {
            $label = dash_day_label($b['from']);
            $range = $b['from'] == $b['to'] ? $label : $label . ' – ' . dash_day_label($b['to']);
            return ['label' => $label, 'range' => $range, 'partial' => $b['partial'], 'from' => $b['from']->format('Y-m-d')];
        }, $buckets);
    }

    /** Сумма по интервалам; $prev — сдвиг на прошлый период. */
    public function bucketize(array $byDay, array $buckets, bool $prev = false): array {
        $shift = $prev ? '-' . $this->days . ' days' : '+0 days';
        $out = [];
        foreach ($buckets as $b) {
            $sum = 0.0;
            for ($d = $b['from']->modify($shift); $d <= $b['to']->modify($shift); $d = $d->modify('+1 day')) {
                $sum += (float) ($byDay[$d->format('Y-m-d')] ?? 0);
            }
            $out[] = $sum;
        }
        return $out;
    }

    /* =========================================================
     * Блоки
     * ========================================================= */

    /** 2. Ключевые показатели. */
    public function blockKpi(): array {
        $buckets = $this->buckets();
        $cards = [];
        $s = $this->schema();
        $db = $this->db();

        // Метрика: визиты
        $visits = $visitsPrev = null;
        $vSeries = [];
        $mErr = null;
        try {
            $t = $this->totals(['ym:s:visits'], $this->from, $this->to);
            $tp = $this->totals(['ym:s:visits'], $this->prevFrom, $this->prevTo);
            $visits = $t['ym:s:visits'];
            $visitsPrev = $tp['ym:s:visits'];
            $vSeries = $this->bucketize($this->visitsByDay($this->from, $this->to), $buckets);
        } catch (DashError $e) {
            $mErr = $e->getMessage();
        }
        $cards[] = $this->card('visits', 'Визиты', $visits, $visitsPrev, $vSeries, [
            'hint' => 'Сколько раз заходили на сайт. Один человек может зайти несколько раз.',
            'error' => $mErr, 'small' => $visitsPrev !== null && $visitsPrev < DASH_MIN_N,
        ]);

        // база: заявки
        $leads = $leadsPrev = null;
        $formLeads = $formLeadsPrev = 0;
        $lSeries = [];
        $dbErr = $this->dbError();
        $manualCount = 0;
        if ($db) {
            $cur = $this->leadsCreated($this->from, $this->to);
            $prev = $this->leadsCreated($this->prevFrom, $this->prevTo);
            $leads = count($cur);
            $leadsPrev = count($prev);
            $manualCount = count(array_filter($cur, static fn ($r) => $r['manual']));
            $formLeads = $leads - $manualCount;
            $formLeadsPrev = $leadsPrev - count(array_filter($prev, static fn ($r) => $r['manual']));
            $lSeries = $this->bucketize(self::countByDay($cur, 'created_at'), $buckets);
        }
        $cards[] = $this->card('leads', 'Заявки', $leads, $leadsPrev, $lSeries, [
            'hint' => 'Заявки из базы: формы на сайте и добавленные вручную.',
            'error' => $dbErr, 'small' => $leadsPrev !== null && $leadsPrev < DASH_MIN_N,
            'sub' => $manualCount ? 'в т. ч. ' . $manualCount . ' вручную' : '',
        ]);

        // конверсия визит → заявка (заявки с форм / визиты)
        $conv = $visits ? 100 * $formLeads / $visits : null;
        $convPrev = $visitsPrev ? 100 * $formLeadsPrev / $visitsPrev : null;
        $cSeries = [];
        if ($vSeries && $lSeries) {
            foreach ($vSeries as $i => $v) {
                $cSeries[] = $v > 0 ? round(100 * ($lSeries[$i] ?? 0) / $v, 2) : null;
            }
        }
        $cards[] = $this->card('conv', 'Конверсия визит → заявка', $conv !== null && $db ? round($conv, 2) : null, $convPrev !== null && $db ? round($convPrev, 2) : null, $cSeries, [
            'unit' => '%', 'hint' => 'Какая доля визитов закончилась заявкой с сайта: заявки с форм ÷ визиты.',
            'error' => $mErr ?? $dbErr, 'small' => ($visits ?? 0) < DASH_MIN_N || ($visitsPrev ?? 0) < DASH_MIN_N,
            'n' => $visits !== null && $db ? dash_num($formLeads) . ' из ' . dash_num($visits) : '',
        ]);

        // пробные и оплаты — по дате события в периоде
        foreach ([['attended', 'Пришли на пробное', 'trial_at', 'Отметьте статусы в блоке «Заявки»'],
                  ['paid', 'Новые ученики', 'paid_at', 'Отмечайте оплаты в блоке «Заявки»']] as [$id, $label, $col, $todo]) {
            if (!$db) {
                $cards[] = $this->card($id, $label, null, null, [], ['error' => $dbErr]);
                continue;
            }
            if (!$s['status']) {
                $cards[] = $this->card($id, $label, null, null, [], ['state' => 'nosql', 'msg' => 'Выполните SQL из инструкции', 'action' => '#leads']);
                continue;
            }
            $cur = $this->leadsByEvent($col, $this->from, $this->to);
            $prev = $this->leadsByEvent($col, $this->prevFrom, $this->prevTo);
            $anyStatus = $this->anyStatusMarked();
            $cards[] = $this->card($id, $label, count($cur), count($prev), $this->bucketize(self::countByDay($cur, $col), $buckets), [
                'small' => count($prev) < DASH_MIN_N,
                'state' => $anyStatus || count($cur) ? 'ok' : 'nodata', 'msg' => $todo, 'action' => '#leads',
                'hint' => $id === 'paid' ? 'Сколько учеников оплатили за период (по дате оплаты).' : 'Сколько детей пришли на пробное за период (по дате пробного).',
            ]);
        }
        $paid = $s['status'] && $db ? count($this->leadsByEvent('paid_at', $this->from, $this->to)) : null;
        $paidPrev = $s['status'] && $db ? count($this->leadsByEvent('paid_at', $this->prevFrom, $this->prevTo)) : null;

        // расходы, CPL, CAC
        if (!$db) {
            foreach ([['spend', 'Расходы на рекламу'], ['cpl', 'Цена заявки (CPL)'], ['cac', 'Цена ученика (CAC)']] as [$id, $label]) {
                $cards[] = $this->card($id, $label, null, null, [], ['error' => $dbErr]);
            }
            return $this->meta() + ['cards' => $cards, 'buckets' => $this->bucketMeta($buckets)];
        }
        $sp = $this->spendFor($this->from, $this->to);
        $spPrev = $this->spendFor($this->prevFrom, $this->prevTo);
        $spSeries = $this->bucketize($sp['by_day'], $buckets);
        $noSpend = !$sp['has_data'];
        $spendState = !$s['spend'] && !$sp['auto_direct'] ? 'nosql' : ($noSpend ? 'nodata' : 'ok');
        $spendMsg = $spendState === 'nosql' ? 'Выполните SQL из инструкции' : 'Внесите расходы в блоке «Расходы»';
        $cards[] = $this->card('spend', 'Расходы на рекламу', $noSpend ? null : round($sp['total']), $noSpend ? null : round($spPrev['total']), $spSeries, [
            'unit' => '₽', 'state' => $spendState, 'msg' => $spendMsg, 'action' => '#spend', 'small' => $spPrev['total'] <= 0,
            'hint' => 'Расходы за период. Расход месяца делится на дни поровну.' . ($sp['auto_direct'] ? ' Директ — автоматически из Метрики.' : ''),
            'lowerIsBetter' => null,
        ]);
        $byBranch = $this->branch !== 'all';
        $ratio = static function (?float $a, ?float $b): ?float {
            return $a !== null && $b ? round($a / $b) : null;
        };
        $series = static function (array $num, array $den): array {
            $out = [];
            foreach ($num as $i => $v) {
                $out[] = !empty($den[$i]) ? round($v / $den[$i]) : null;
            }
            return $out;
        };
        $branchMsg = 'Расходы не делятся по филиалам — выберите «Все филиалы»';
        $cards[] = $this->card('cpl', 'Цена заявки (CPL)', $noSpend || $byBranch ? null : $ratio($sp['total'], $leads), $noSpend || $byBranch ? null : $ratio($spPrev['total'], $leadsPrev), $noSpend ? [] : $series($spSeries, $lSeries), [
            'unit' => '₽', 'lowerIsBetter' => true, 'hint' => 'Цена заявки: расходы на рекламу ÷ число заявок.',
            'state' => $byBranch ? 'nodata' : $spendState, 'msg' => $byBranch ? $branchMsg : $spendMsg, 'action' => $byBranch ? '' : '#spend',
            'small' => ($leads ?? 0) < DASH_MIN_N || ($leadsPrev ?? 0) < DASH_MIN_N,
        ]);
        $pSeries = $s['status'] ? $this->bucketize(self::countByDay($this->leadsByEvent('paid_at', $this->from, $this->to), 'paid_at'), $buckets) : [];
        $cacState = $byBranch ? 'nodata' : (!$s['status'] ? 'nosql' : ($noSpend ? $spendState : (!$paid ? 'nodata' : 'ok')));
        $cards[] = $this->card('cac', 'Цена ученика (CAC)', $cacState === 'ok' ? $ratio($sp['total'], $paid) : null, $cacState === 'ok' ? $ratio($spPrev['total'], $paidPrev) : null, $cacState === 'ok' ? $series($spSeries, $pSeries) : [], [
            'unit' => '₽', 'lowerIsBetter' => true, 'hint' => 'Цена ученика: расходы на рекламу ÷ число новых учеников (оплат).',
            'state' => $cacState,
            'msg' => $byBranch ? $branchMsg : (!$s['status'] ? 'Выполните SQL из инструкции' : ($noSpend ? $spendMsg : 'Отмечайте оплаты в блоке «Заявки»')),
            'action' => $byBranch ? '' : ($noSpend ? '#spend' : '#leads'),
            'small' => ($paid ?? 0) < DASH_MIN_N || ($paidPrev ?? 0) < DASH_MIN_N,
        ]);
        return $this->meta() + ['cards' => $cards, 'buckets' => $this->bucketMeta($buckets)];
    }

    private function anyStatusMarked(): bool {
        if (!$this->schema()['status']) {
            return false;
        }
        return $this->memo['anyStatus'] ??= (bool) $this->db()->query("SELECT COUNT(*) FROM leads WHERE status NOT IN ('new', 'archive') AND " . DASH_EXCLUDED_SQL)->fetchColumn();
    }

    private function card(string $id, string $label, ?float $value, ?float $prev, array $series, array $o = []): array {
        $state = $o['state'] ?? 'ok';
        if (!empty($o['error'])) {
            $state = 'error';
        } elseif ($state === 'ok' && $value === null) {
            $state = 'nodata';
        }
        return [
            'id' => $id, 'label' => $label, 'value' => $state === 'ok' ? $value : null, 'prev' => $state === 'ok' ? $prev : null,
            'series' => $state === 'ok' ? array_map(static fn ($v) => $v === null ? null : round((float) $v, 2), $series) : [],
            'unit' => $o['unit'] ?? '', 'hint' => $o['hint'] ?? '', 'state' => $state,
            'msg' => $state === 'error' ? (string) $o['error'] : ($o['msg'] ?? ''), 'action' => $o['action'] ?? '',
            'small' => (bool) ($o['small'] ?? false),
            // null — рост не хорош и не плох (расходы): изменение без цвета
            'lowerIsBetter' => array_key_exists('lowerIsBetter', $o) ? $o['lowerIsBetter'] : false,
            'sub' => $o['sub'] ?? '', 'n' => $o['n'] ?? '',
        ];
    }

    /** 3. Воронка целиком: от визита до оплаты. */
    public function blockFunnel(string $page): array {
        $p = DASH_PAGES[$page] ?? DASH_PAGES['all'];
        $labels = ['Визиты', 'Дошли до цены или формы', 'Нажали «Записаться»', 'Оставили заявку',
            'Связались', 'Записаны на пробное', 'Пришли на пробное', 'Оплатили'];
        $steps = [];
        $notes = [];
        // шаги 1–3: Метрика
        try {
            $metrics = array_merge(['ym:s:visits'], $this->setMetrics($p['reach'], 'reach'), $this->setMetrics($p['cta'], 'cta'));
            [$tot, $note] = $this->withPage($p['path'], fn ($f) => $this->totals($metrics, $this->from, $this->to, $f));
            if ($note) {
                $notes[] = $note;
            }
            $visits = $tot['ym:s:visits'];
            $steps[] = ['label' => $labels[0], 'value' => $visits, 'state' => 'ok', 'source' => 'metrika'];
            $reach = $this->setValue($p['reach'], 'reach', $tot, $visits);
            $steps[] = ['label' => $labels[1], 'source' => 'metrika'] + $reach;
            $cta = $this->setValue($p['cta'], 'cta', $tot, $reach['value'] ?? $visits);
            $steps[] = ['label' => $labels[2], 'source' => 'metrika'] + $cta;
            if (($reach['approx'] ?? false) || ($cta['approx'] ?? false)) {
                $notes[] = '≈ — оценка: в Метрике нет составной цели, визиты по отдельным целям сложены. Создайте составные цели из инструкции — станет точно.';
            }
        } catch (DashError $e) {
            for ($i = 0; $i < 3; $i++) {
                $steps[] = ['label' => $labels[$i], 'value' => null, 'state' => 'error', 'msg' => $e->getMessage(), 'source' => 'metrika'];
            }
        }
        // шаги 4–8: база, когорта заявок периода
        $db = $this->db();
        if (!$db) {
            for ($i = 3; $i < 8; $i++) {
                $steps[] = ['label' => $labels[$i], 'value' => null, 'state' => 'error', 'msg' => $this->dbError, 'source' => 'db'];
            }
        } else {
            $cohort = $this->leadsCreated($this->from, $this->to);
            if ($p['sources']) {
                $cohort = array_values(array_filter($cohort, static fn ($r) => in_array($r['source'], $p['sources'], true)));
            }
            $steps[] = ['label' => $labels[3], 'value' => count($cohort), 'state' => 'ok', 'source' => 'db'];
            if (!$this->schema()['status']) {
                for ($i = 4; $i < 8; $i++) {
                    $steps[] = ['label' => $labels[$i], 'value' => null, 'state' => 'nosql', 'source' => 'db',
                        'msg' => 'Начните отмечать статусы заявок в блоке «Заявки» (сначала выполните SQL из инструкции).'];
                }
            } else {
                $base = array_values(array_filter($cohort, static fn ($r) => $r['status'] !== 'archive'));
                $archived = count($cohort) - count($base);
                if ($archived) {
                    $notes[] = 'Заявок в архиве (до начала учёта статусов): ' . $archived . ' — в шагах 5–8 не учтены.';
                }
                $marked = $this->anyStatusMarked();
                foreach (['st_contacted', 'st_trial', 'st_attended', 'st_paid'] as $i => $f) {
                    $steps[] = ['label' => $labels[4 + $i], 'value' => count(array_filter($base, static fn ($r) => $r[$f])),
                        'state' => $marked ? 'ok' : 'nostatus', 'source' => 'db', 'base' => $i === 0 ? count($base) : null,
                        'msg' => $marked ? '' : 'Начните отмечать статусы заявок в блоке «Заявки».'];
                }
            }
        }
        // проценты: от предыдущего шага с данными и от визитов
        $first = $steps[0]['value'] ?? null;
        $prevVal = null;
        $worst = null;
        foreach ($steps as $i => &$st) {
            $st['pct_prev'] = $st['pct_first'] = null;
            $st['small'] = false;
            $v = $st['value'] ?? null;
            if ($v === null || !in_array($st['state'], ['ok', 'nostatus'], true)) {
                continue;
            }
            $den = $st['base'] ?? null; // для «Связались» знаменатель — заявки без архива
            $den = $den ?? $prevVal;
            if ($i > 0 && $den !== null) {
                $st['pct_prev'] = $den > 0 ? round(100 * $v / $den, 1) : null;
                $st['small'] = $den < DASH_MIN_N;
                $st['den'] = $den;
                if ($st['state'] === 'ok' && !$st['small'] && $st['pct_prev'] !== null && ($worst === null || $st['pct_prev'] < $steps[$worst]['pct_prev'])) {
                    $worst = $i;
                }
            }
            if ($first) {
                $st['pct_first'] = round(100 * $v / $first, 2);
            }
            $prevVal = $v;
        }
        unset($st);
        if ($worst !== null) {
            $steps[$worst]['worst'] = true;
        }
        $notes[] = 'Шаги 1–3 — Метрика (визиты' . ($p['path'] ? ' со страницей ' . $p['path'] : ' на сайт') . '), шаги 4–8 — заявки, созданные в выбранном периоде, и что с ними стало к сегодняшнему дню.';
        if ($this->branch !== 'all') {
            $notes[] = 'Филиал влияет только на шаги 4–8: Метрика не знает филиал.';
        }
        return $this->meta() + ['page' => $page, 'pages' => array_map(static fn ($x) => $x['label'], DASH_PAGES),
            'steps' => $steps, 'worst' => $worst, 'notes' => $notes];
    }

    /** 4. Как меняется поток: визиты и заявки по дням / неделям. */
    public function blockFlow(): array {
        $buckets = $this->buckets();
        $out = $this->meta() + ['buckets' => $this->bucketMeta($buckets), 'visits' => null, 'visits_prev' => null,
            'leads' => null, 'leads_prev' => null, 'errors' => []];
        try {
            $out['visits'] = $this->bucketize($this->visitsByDay($this->from, $this->to), $buckets);
            if ($this->compare) {
                $out['visits_prev'] = $this->bucketize($this->visitsByDay($this->prevFrom, $this->prevTo), $buckets, true);
            }
        } catch (DashError $e) {
            $out['errors']['visits'] = $e->getMessage();
        }
        if ($this->db()) {
            $out['leads'] = $this->bucketize(self::countByDay($this->leadsCreated($this->from, $this->to), 'created_at'), $buckets);
            if ($this->compare) {
                $out['leads_prev'] = $this->bucketize(self::countByDay($this->leadsCreated($this->prevFrom, $this->prevTo), 'created_at'), $buckets, true);
            }
        } else {
            $out['errors']['leads'] = $this->dbError;
        }
        $out['meta'] = $this->meta();
        return $out;
    }

    /** 5. Откуда приходят заявки и ученики: каналы. */
    public function blockChannels(): array {
        $agg = [];
        foreach (DASH_CHANNELS as $k => $label) {
            $agg[$k] = ['key' => $k, 'label' => $label, 'visits' => null, 'bounce_w' => 0.0, 'leads' => 0, 'attended' => 0, 'paid' => 0,
                'spend' => null, 'subs' => []];
        }
        $sub = static function (array &$row, string $camp, string $content): array {
            $key = $camp . "\x1f" . $content;
            $row['subs'][$key] ??= ['campaign' => $camp, 'content' => $content, 'visits' => 0.0, 'leads' => 0, 'attended' => 0, 'paid' => 0];
            return [$key];
        };
        $errors = [];
        $metrikaOk = false;
        try {
            $rows = $this->byDim(['ym:s:lastsignTrafficSource', 'ym:s:lastsignSourceEngine', 'ym:s:lastsignUTMSource',
                'ym:s:lastsignUTMMedium', 'ym:s:lastsignUTMCampaign', 'ym:s:lastsignUTMContent'], ['ym:s:visits', 'ym:s:bounceRate'],
                $this->from, $this->to, '', 2000);
            $metrikaOk = true;
            foreach ($agg as &$a) {
                $a['visits'] = 0.0;
            }
            unset($a);
            foreach ($rows as $r) {
                [$ts, $eng, $us, $um, $uc, $ucont] = array_pad($r['dims'], 6, ['id' => '', 'name' => '']);
                $ch = dash_channel_for_visit($ts['id'], $eng['name'], $us['name'], $um['name']);
                $v = $r['m']['ym:s:visits'] ?? 0;
                $agg[$ch]['visits'] += $v;
                $agg[$ch]['bounce_w'] += $v * ($r['m']['ym:s:bounceRate'] ?? 0);
                if ($us['name'] !== '' || $uc['name'] !== '') {
                    [$k] = $sub($agg[$ch], $uc['name'], $ucont['name']);
                    $agg[$ch]['subs'][$k]['visits'] += $v;
                }
            }
        } catch (DashError $e) {
            $errors['metrika'] = $e->getMessage();
        }
        $db = $this->db();
        $hasStatus = $this->schema()['status'];
        $leadsTotal = 0;
        if ($db) {
            foreach ($this->leadsCreated($this->from, $this->to) as $l) {
                $ch = $l['channel'];
                $leadsTotal++;
                $agg[$ch]['leads']++;
                $agg[$ch]['attended'] += $l['st_attended'] && $l['status'] !== 'archive' ? 1 : 0;
                $agg[$ch]['paid'] += $l['st_paid'] && $l['status'] !== 'archive' ? 1 : 0;
                if ($l['utm_campaign'] !== '' || $l['utm_content'] !== '') {
                    [$k] = $sub($agg[$ch], $l['utm_campaign'], $l['utm_content']);
                    $agg[$ch]['subs'][$k]['leads']++;
                    $agg[$ch]['subs'][$k]['attended'] += $l['st_attended'] ? 1 : 0;
                    $agg[$ch]['subs'][$k]['paid'] += $l['st_paid'] ? 1 : 0;
                }
            }
            if ($this->branch === 'all') {
                $sp = $this->spendFor($this->from, $this->to);
                if ($sp['has_data']) {
                    foreach ($agg as $k => &$a) {
                        $a['spend'] = isset($sp['by_channel'][$k]) ? round($sp['by_channel'][$k]) : null; // нет расходов по каналу — «—»
                    }
                    unset($a);
                }
            }
        } else {
            $errors['db'] = $this->dbError;
        }
        $rowsOut = [];
        foreach ($agg as $a) {
            if (!$a['visits'] && !$a['leads'] && !$a['spend']) {
                continue;
            }
            $subs = array_values(array_map(static function ($s) {
                $s['conv'] = $s['visits'] > 0 ? round(100 * $s['leads'] / $s['visits'], 2) : null;
                return $s;
            }, $a['subs']));
            usort($subs, static fn ($x, $y) => [$y['leads'], $y['visits']] <=> [$x['leads'], $x['visits']]);
            $rowsOut[] = [
                'key' => $a['key'], 'label' => $a['label'], 'visits' => $a['visits'],
                'bounce' => $a['visits'] ? round($a['bounce_w'] / $a['visits'], 1) : null,
                'leads' => $db ? $a['leads'] : null, 'conv' => $a['visits'] && $db ? round(100 * $a['leads'] / $a['visits'], 2) : null,
                'attended' => $db && $hasStatus ? $a['attended'] : null, 'paid' => $db && $hasStatus ? $a['paid'] : null,
                'spend' => $a['spend'], 'cpl' => $a['spend'] && $a['leads'] ? round($a['spend'] / $a['leads']) : null,
                'cac' => $a['spend'] && $a['paid'] && $hasStatus ? round($a['spend'] / $a['paid']) : null,
                'small' => ($a['visits'] ?? 0) < DASH_MIN_N, 'subs' => $subs,
            ];
        }
        usort($rowsOut, static fn ($x, $y) => [$y['leads'] ?? 0, $y['visits'] ?? 0] <=> [$x['leads'] ?? 0, $x['visits'] ?? 0]);
        return $this->meta() + ['rows' => $rowsOut, 'errors' => $errors, 'recon' => $this->reconcile(),
            'has_status' => $hasStatus, 'branch_note' => $this->branch !== 'all'
                ? 'Визиты и расходы — по всем филиалам, заявки и ученики — по выбранному филиалу.' : ''];
    }

    /** Сверка: цели «Заявка отправлена» в Метрике и заявки с форм в базе (все филиалы). */
    public function reconcile(): array {
        $m = $d = null;
        try {
            $g = $this->gm('lead_form', 'reaches');
            if ($g) {
                $m = $this->totals([$g], $this->from, $this->to)[$g];
            }
        } catch (DashError $e) {
            $m = null;
        }
        if ($this->db()) {
            $d = count(array_filter($this->leadsCreated($this->from, $this->to, false), static fn ($r) => !$r['manual']));
        }
        $diff = $m !== null && $d !== null && max($m, $d) > 0 ? round(100 * abs($m - $d) / max($m, $d), 1) : null;
        return ['metrika' => $m, 'db' => $d, 'diff_pct' => $diff, 'small' => max($m ?? 0, $d ?? 0) < DASH_MIN_N,
            'lead_goal' => $this->goalsSafe() ? $this->gm('lead_form') !== null : null];
    }

    private function goalsSafe(): bool {
        try {
            $this->goals();
            return true;
        } catch (DashError $e) {
            return false;
        }
    }

    /** 6. Какие страницы работают: страницы входа. */
    public function blockPages(): array {
        $reachM = $this->setMetrics(REACH_GOALS, 'reach');
        $ctaM = $this->setMetrics(CTA_GOALS, 'cta');
        $leadM = $this->gm('lead_form');
        $rows = $this->byDim(['ym:s:startURLPath'], array_merge(['ym:s:visits', 'ym:s:bounceRate'], $reachM, $ctaM, [$leadM]),
            $this->from, $this->to, '', 500);
        $groups = [];
        foreach (['main' => 'Главная', 'electronics' => 'Электроника', 'child' => 'Мастер-классы', 'other' => 'Другие'] as $k => $label) {
            $groups[$k] = ['key' => $k, 'label' => $label, 'visits' => 0.0, 'bounce_w' => 0.0, 'reach' => 0.0, 'cta' => 0.0, 'leads' => 0.0];
        }
        foreach ($rows as $r) {
            $path = strtolower(rtrim(strtok($r['dims'][0]['name'] ?? '', '?') ?: '/', '/')) ?: '/';
            $k = in_array($path, ['/', '/index.html'], true) ? 'main'
                : (in_array($path, ['/electronics', '/electronics.html'], true) ? 'electronics'
                : (in_array($path, ['/child', '/child.html'], true) ? 'child' : 'other'));
            $v = $r['m']['ym:s:visits'] ?? 0;
            $groups[$k]['visits'] += $v;
            $groups[$k]['bounce_w'] += $v * ($r['m']['ym:s:bounceRate'] ?? 0);
            $groups[$k]['reach'] += min($v, array_sum(array_map(static fn ($m) => $r['m'][$m] ?? 0, $reachM)));
            $groups[$k]['cta'] += min($v, array_sum(array_map(static fn ($m) => $r['m'][$m] ?? 0, $ctaM)));
            $groups[$k]['leads'] += $leadM ? ($r['m'][$leadM] ?? 0) : 0;
        }
        $approx = (count($reachM) > 1) || (count($ctaM) > 1);
        $out = [];
        foreach ($groups as $g) {
            $v = $g['visits'];
            $out[] = ['key' => $g['key'], 'label' => $g['label'], 'visits' => $v,
                'bounce' => $v ? round($g['bounce_w'] / $v, 1) : null,
                'reach' => $reachM ? $g['reach'] : null, 'reach_pct' => $reachM && $v ? round(100 * $g['reach'] / $v, 1) : null,
                'cta' => $ctaM ? $g['cta'] : null, 'cta_pct' => $ctaM && $v ? round(100 * $g['cta'] / $v, 1) : null,
                'leads' => $leadM ? $g['leads'] : null, 'conv' => $leadM && $v ? round(100 * $g['leads'] / $v, 2) : null,
                'small' => $v < DASH_MIN_N];
        }
        return $this->meta() + ['rows' => $out, 'approx' => $approx,
            'missing' => ['reach' => !$reachM, 'cta' => !$ctaM, 'lead' => !$leadM]];
    }

    /** 7. Что люди делают на странице. */
    public function blockBehavior(string $page): array {
        $page = isset(DASH_BEHAVIOR[$page]) ? $page : 'main';
        $b = DASH_BEHAVIOR[$page];
        $metrics = ['ym:s:visits'];
        foreach ($b['depth'] as $g) {
            $metrics[] = $this->gm($g, 'visits');
        }
        foreach (array_merge(array_keys($b['cta']), array_keys($b['contact']), $b['links']) as $g) {
            $metrics[] = $this->gm($g, 'reaches');
        }
        [$tot, $note] = $this->withPage($b['path'], fn ($f) => $this->totals($metrics, $this->from, $this->to, $f));
        $visits = $tot['ym:s:visits'];
        $row = function (string $g, string $label, string $kind) use ($tot, $visits): array {
            $m = $this->gm($g, $kind);
            $v = $m ? ($tot[$m] ?? 0) : null;
            return ['id' => $g, 'label' => $label, 'value' => $v, 'missing' => $m === null,
                'pct' => $kind === 'visits' && $v !== null && $visits > 0 ? round(100 * $v / $visits, 1) : null];
        };
        return $this->meta() + [
            'page' => $page, 'visits' => $visits, 'small' => $visits < DASH_MIN_N, 'note' => $note,
            'depth' => array_map(fn ($g) => $row($g, GOAL_NAMES[$g], 'visits'), $b['depth']),
            'cta' => array_map(fn ($g, $l) => $row($g, $l, 'reaches'), array_keys($b['cta']), $b['cta']),
            'contact' => array_map(fn ($g, $l) => $row($g, $l, 'reaches'), array_keys($b['contact']), $b['contact']),
            'links' => array_map(fn ($g) => $row($g, GOAL_NAMES[$g], 'reaches'), $b['links']),
        ];
    }

    /** 8. Кто наши посетители. */
    public function blockAudience(): array {
        $out = $this->meta() + ['devices' => null, 'cities' => null, 'newret' => null, 'heatmap' => null, 'errors' => []];
        try {
            $leadM = $this->gm('lead_form');
            $names = ['mobile' => 'Телефон', 'desktop' => 'Компьютер', 'tablet' => 'Планшет', 'tv' => 'Телевизор'];
            $dev = [];
            foreach ($this->byDim(['ym:s:deviceCategory'], ['ym:s:visits', 'ym:s:bounceRate', $leadM], $this->from, $this->to) as $r) {
                $id = $r['dims'][0]['id'] ?: 'other';
                $v = $r['m']['ym:s:visits'] ?? 0;
                $dev[] = ['id' => $id, 'label' => $names[$id] ?? ($r['dims'][0]['name'] ?: 'Другое'), 'visits' => $v,
                    'bounce' => round($r['m']['ym:s:bounceRate'] ?? 0, 1),
                    'leads' => $leadM ? ($r['m'][$leadM] ?? 0) : null,
                    'conv' => $leadM && $v ? round(100 * ($r['m'][$leadM] ?? 0) / $v, 2) : null, 'small' => $v < DASH_MIN_N];
            }
            usort($dev, static fn ($a, $b) => $b['visits'] <=> $a['visits']);
            $out['devices'] = $dev;
            $out['lead_goal_missing'] = $leadM === null;

            $kazan = $rest = 0.0;
            foreach ($this->byDim(['ym:s:regionCity'], ['ym:s:visits'], $this->from, $this->to, '', 200) as $r) {
                $v = $r['m']['ym:s:visits'] ?? 0;
                if (mb_strtolower($r['dims'][0]['name'] ?? '') === 'казань') {
                    $kazan += $v;
                } else {
                    $rest += $v;
                }
            }
            $sum = $kazan + $rest;
            $out['cities'] = [
                ['label' => 'Казань', 'visits' => $kazan, 'pct' => $sum ? round(100 * $kazan / $sum, 1) : null],
                ['label' => 'Другие города', 'visits' => $rest, 'pct' => $sum ? round(100 * $rest / $sum, 1) : null],
            ];
            $t = $this->totals(['ym:s:users', 'ym:s:newUsers'], $this->from, $this->to);
            $users = $t['ym:s:users'];
            $new = min($users, $t['ym:s:newUsers']);
            $out['newret'] = ['users' => $users, 'new' => $new, 'returning' => max(0, $users - $new),
                'new_pct' => $users ? round(100 * $new / $users, 1) : null];
        } catch (DashError $e) {
            $out['errors']['metrika'] = $e->getMessage();
        }
        if ($this->db()) {
            $grid = array_fill(0, 7, array_fill(0, 24, 0));
            $n = 0;
            foreach ($this->leadsCreated($this->from, $this->to) as $l) {
                $d = $this->dt($l['created_at']);
                if ($d) {
                    $grid[(int) $d->format('N') - 1][(int) $d->format('G')]++;
                    $n++;
                }
            }
            $out['heatmap'] = ['grid' => $grid, 'total' => $n, 'days' => ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']];
        } else {
            $out['errors']['db'] = $this->dbError;
        }
        return $out;
    }

    /** 9. Заявки: рабочая таблица. */
    public function blockLeads(array $q): array {
        if (!$this->db()) {
            throw new DashError((string) $this->dbError);
        }
        $s = $this->schema();
        $scope = ($q['scope'] ?? '') === 'unanswered' && $s['status'] ? 'unanswered' : 'period';
        $list = $scope === 'unanswered' ? $this->leadsUnanswered() : $this->leadsCreated($this->from, $this->to);
        $fStatus = (string) ($q['status'] ?? '');
        $fChannel = (string) ($q['channel'] ?? '');
        $search = mb_strtolower(trim((string) ($q['q'] ?? '')));
        $digits = preg_replace('/\D/', '', $search) ?? '';
        $filtered = array_values(array_filter($list, static function ($r) use ($fStatus, $fChannel, $search, $digits) {
            if ($fStatus !== '' && $r['status'] !== $fStatus) {
                return false;
            }
            if ($fChannel !== '' && $r['channel'] !== $fChannel) {
                return false;
            }
            if ($search !== '') {
                $inName = mb_strpos(mb_strtolower($r['name']), $search) !== false;
                $inPhone = strlen($digits) >= 3 && strpos(preg_replace('/\D/', '', $r['phone']) ?? '', $digits) !== false;
                if (!$inName && !$inPhone) {
                    return false;
                }
            }
            return true;
        }));
        $per = 25;
        $total = count($filtered);
        $pages = max(1, (int) ceil($total / $per));
        $page = min($pages, max(1, (int) ($q['p'] ?? 1)));
        $rows = [];
        foreach (array_slice($filtered, ($page - 1) * $per, $per) as $r) {
            $created = $this->dt($r['created_at']);
            $contacted = $this->dt($r['contacted_at']);
            $wait = $r['status'] === 'new' && $created ? dash_work_minutes($created, $this->now) : null;
            $rows[] = [
                'id' => $r['id'], 'created_at' => $r['created_at'],
                'date' => $created ? dash_day_label($created) . ' ' . $created->format('H:i') : '—',
                'name' => $r['name'], 'phone' => dash_mask_phone($r['phone']), 'age' => $r['age'],
                'source' => $r['source'], 'source_label' => DASH_SOURCES[$r['source']] ?? $r['source'],
                'branch' => $r['branch'], 'channel' => $r['channel'], 'channel_label' => DASH_CHANNELS[$r['channel']] ?? $r['channel'],
                'channel_manual' => $r['channel_manual'], 'channel_auto' => $r['channel_auto'],
                'utm' => trim($r['utm_source'] . ($r['utm_campaign'] !== '' ? ' / ' . $r['utm_campaign'] : '') . ($r['utm_content'] !== '' ? ' / ' . $r['utm_content'] : '')),
                'status' => $r['status'], 'trial_at' => $r['trial_at'] !== '' ? substr(str_replace(' ', 'T', $r['trial_at']), 0, 16) : '',
                'paid_amount' => $r['paid_amount'], 'lost_reason' => $r['lost_reason'], 'note' => $r['note'], 'manual' => $r['manual'],
                'contact_min' => $created && $contacted ? max(0, intdiv($contacted->getTimestamp() - $created->getTimestamp(), 60)) : null,
                'wait_min' => $wait, 'overdue' => $wait !== null && $wait >= 30,
            ];
        }
        $unanswered = $this->leadsUnanswered();
        $overdue = 0;
        foreach ($unanswered as $u) {
            $c = $this->dt($u['created_at']);
            if ($c && dash_work_minutes($c, $this->now) >= 30) {
                $overdue++;
            }
        }
        $reasons = [];
        if ($s['status']) {
            foreach ($this->leadsCreated($this->from, $this->to) as $l) {
                if ($l['status'] === 'lost') {
                    $k = $l['lost_reason'] !== '' ? $l['lost_reason'] : 'other';
                    $reasons[$k] = ($reasons[$k] ?? 0) + 1;
                }
            }
            arsort($reasons);
        }
        return $this->meta() + [
            'rows' => $rows, 'total' => $total, 'page' => $page, 'pages' => $pages, 'scope' => $scope,
            'unanswered' => $s['status'] ? count($unanswered) : null, 'overdue' => $s['status'] ? $overdue : null,
            'reasons' => array_map(static fn ($k, $v) => ['id' => $k, 'label' => DASH_LOST_REASONS[$k] ?? $k, 'value' => $v], array_keys($reasons), $reasons),
            'schema' => ['status' => $s['status'], 'channel' => $s['channel'], 'manual' => $s['manual'], 'branch' => $s['branch']],
            'options' => [
                'statuses' => array_map(static fn ($v) => $v['label'], DASH_STATUSES),
                'reasons' => DASH_LOST_REASONS, 'channels' => DASH_CHANNELS, 'branches' => DASH_BRANCHES, 'sources' => DASH_SOURCES,
            ],
        ];
    }

    /** 10. Расходы на рекламу. */
    public function blockSpend(): array {
        if (!$this->db()) {
            throw new DashError((string) $this->dbError);
        }
        $s = $this->schema();
        $monthStart = $this->from->modify('first day of this month');
        $direct = $this->directCosts($monthStart, $this->to);
        $auto = [];
        if ($direct) {
            foreach ($direct as $day => $v) {
                $m = substr($day, 0, 7);
                $auto[$m] = ($auto[$m] ?? 0) + $v;
            }
            krsort($auto);
        }
        $rows = array_map(static function ($r) {
            $m = substr((string) $r['month'], 0, 7);
            [$y, $mm] = array_map('intval', explode('-', $m . '-01'));
            return ['id' => (int) $r['id'], 'month' => $m, 'month_label' => (DASH_MONTHS_FULL[$mm - 1] ?? $m) . ' ' . $y,
                'channel' => (string) $r['channel'], 'channel_label' => DASH_CHANNELS[(string) $r['channel']] ?? (string) $r['channel'],
                'amount' => (int) $r['amount'], 'comment' => (string) ($r['comment'] ?? '')];
        }, $this->spendRows());
        $sp = $this->spendFor($this->from, $this->to);
        $channels = DASH_CHANNELS;
        if ($direct) {
            unset($channels['direct']);
        }
        return $this->meta() + [
            'enabled' => $s['spend'], 'rows' => $rows,
            'auto' => array_map(static function ($m, $v) {
                [$y, $mm] = array_map('intval', explode('-', $m));
                return ['month' => $m, 'month_label' => DASH_MONTHS_FULL[$mm - 1] . ' ' . $y, 'amount' => round($v)];
            }, array_keys($auto), $auto),
            'period_total' => round($sp['total']),
            'period_by_channel' => array_map(static fn ($k, $v) => ['key' => $k, 'label' => DASH_CHANNELS[$k] ?? $k, 'amount' => round($v)],
                array_keys($sp['by_channel']), $sp['by_channel']),
            'channels' => $channels, 'auto_direct' => (bool) $direct,
            'default_month' => $this->today->format('Y-m'),
        ];
    }

    /** 11. Качество данных. */
    public function blockQuality(): array {
        $out = $this->meta() + ['missing' => [], 'silent' => [], 'composite' => null, 'token' => null, 'schema' => null];
        try {
            $g = $this->goals();
            $out['missing'] = array_values(array_map(static fn ($k) => ['id' => $k, 'name' => GOAL_NAMES[$k]],
                array_filter(array_keys(GOAL_NAMES), static fn ($k) => !isset($g['single'][$k]))));
            $out['composite'] = ['reach' => (bool) $g['reach'], 'cta' => (bool) $g['cta']];
            $out['silent'] = $this->silentGoals();
        } catch (DashError $e) {
            $out['metrika_error'] = $e->getMessage();
        }
        if ($this->db()) {
            $leads = $this->leadsCreated($this->from, $this->to, false);
            $out['no_source'] = ['count' => count(array_filter($leads, static fn ($l) => $l['no_source'])), 'total' => count($leads)];
            $out['schema'] = array_diff_key($this->schema(), ['cols' => 1]);
        } else {
            $out['db_error'] = $this->dbError;
        }
        $out['recon'] = $this->reconcile();
        $out['token'] = $this->tokenInfo();
        return $out;
    }

    /** Цели без срабатываний за последние 7 дней (возможно, сломалась кнопка). */
    public function silentGoals(): array {
        $g = $this->goals();
        $a = $this->today->modify('-6 days');
        $metrics = [];
        foreach (array_keys(GOAL_NAMES) as $k) {
            if (isset($g['single'][$k])) {
                $metrics[$k] = 'ym:s:goal' . $g['single'][$k] . 'reaches';
            }
        }
        if (!$metrics) {
            return [];
        }
        $tot = $this->totals(array_values($metrics), $a, $this->today);
        $out = [];
        foreach ($metrics as $k => $m) {
            if (($tot[$m] ?? 0) <= 0) {
                $out[] = ['id' => $k, 'name' => GOAL_NAMES[$k], 'watch' => in_array($k, WATCH_GOALS, true)];
            }
        }
        return $out;
    }

    /** Срок токена Метрики по token_issued (необязательное поле dash_config.php). */
    public function tokenInfo(): ?array {
        $issued = (string) ($this->cfg['token_issued'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $issued)) {
            return null;
        }
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $issued, new DateTimeZone('Europe/Moscow'));
        if (!$d) {
            return null;
        }
        $exp = $d->modify('+1 year');
        $left = (int) floor(($exp->getTimestamp() - $this->today->getTimestamp()) / 86400);
        return ['issued' => $d->format('d.m.Y'), 'expires' => $exp->format('d.m.Y'), 'days_left' => $left];
    }

    /** 1. Главное за период: выводы и тревоги по правилам (без ИИ). */
    public function blockInsights(): array {
        $alerts = [];
        $info = [];
        $metrikaError = null;
        try {
            $this->goals();
        } catch (DashError $e) {
            $metrikaError = $e->getMessage();
            $alerts[] = 'Ошибка Метрики: ' . $metrikaError;
        }
        if ($this->dbError()) {
            $alerts[] = 'Ошибка базы заявок: ' . $this->dbError;
        }
        $s = $this->schema();

        // новые заявки без ответа
        if ($this->db() && $s['status']) {
            $oldest = null;
            $n = 0;
            foreach ($this->leadsUnanswered() as $u) {
                $c = $this->dt($u['created_at']);
                if ($c && dash_work_minutes($c, $this->now) >= 30) {
                    $n++;
                    $oldest = $c;
                }
            }
            if ($n) {
                $ago = $this->agoText($oldest);
                $alerts[] = $n . ' ' . self::plural($n, 'новая заявка', 'новые заявки', 'новых заявок') . ' без ответа дольше 30 минут, самая старая — ' . $ago . '.';
            }
        }
        // ни одной заявки 3 дня подряд
        if ($this->db()) {
            $last = $this->db()->query('SELECT MAX(created_at) FROM leads WHERE ' . DASH_EXCLUDED_SQL)->fetchColumn();
            $lastD = $last ? $this->dt((string) $last) : null;
            if ($lastD && $lastD < $this->now->modify('-3 days')) {
                $alerts[] = 'Ни одной заявки 3 дня подряд. Последняя — ' . dash_day_label($lastD) . '.';
            }
        }
        $kpi = $this->blockKpi();
        $card = [];
        foreach ($kpi['cards'] as $c) {
            $card[$c['id']] = $c;
        }
        // расхождение Метрика / база
        $rec = $this->reconcile();
        if ($rec['diff_pct'] !== null && !$rec['small'] && $rec['diff_pct'] > 20) {
            $alerts[] = 'Метрика засчитала ' . dash_num($rec['metrika']) . ' целей «Заявка отправлена», а в базе ' . dash_num($rec['db'])
                . ' заявок с форм — расхождение ' . dash_pct($rec['diff_pct']) . '. Проверьте форму и цель lead_form.';
        }
        // конверсия упала больше чем на 30 %
        $cv = $card['conv'] ?? null;
        if ($cv && $cv['state'] === 'ok' && !$cv['small'] && $cv['prev'] > 0 && $cv['value'] < $cv['prev'] * 0.7) {
            $alerts[] = 'Конверсия визит → заявка упала: ' . dash_pct((float) $cv['value']) . ' против ' . dash_pct((float) $cv['prev'])
                . ' в прошлом периоде (−' . dash_pct(100 * (1 - $cv['value'] / $cv['prev'])) . ').';
        }
        // мобильная конверсия заметно ниже
        if (!$metrikaError) {
            try {
                $aud = $this->blockAudience();
                $dev = [];
                foreach ($aud['devices'] ?? [] as $d) {
                    $dev[$d['id']] = $d;
                }
                $m = $dev['mobile'] ?? null;
                $d = $dev['desktop'] ?? null;
                if ($m && $d && !$m['small'] && !$d['small'] && $d['conv'] > 0 && $m['conv'] !== null && $m['conv'] < $d['conv'] * 0.7) {
                    $alerts[] = 'На телефоне конверсия ' . dash_pct((float) $m['conv']) . ', на компьютере ' . dash_pct((float) $d['conv'])
                        . ' — проверьте мобильную версию.';
                }
                // кнопка перестала срабатывать (за 7 дней ни одного срабатывания при живом трафике)
                $a7 = $this->today->modify('-6 days');
                $v7 = $this->totals(['ym:s:visits'], $a7, $this->today)['ym:s:visits'];
                if ($v7 >= DASH_MIN_N) {
                    $silent = array_filter($this->silentGoals(), static fn ($x) => $x['watch']);
                    if ($silent) {
                        $alerts[] = 'Цели не срабатывали 7 дней: ' . implode(', ', array_map(static fn ($x) => '«' . $x['name'] . '»', array_slice($silent, 0, 3)))
                            . '. Возможно, сломалась кнопка или форма.';
                    }
                }
            } catch (DashError $e) {
                // ошибка Метрики уже показана выше
            }
        }
        // токен
        $tok = $this->tokenInfo();
        if ($tok && $tok['days_left'] <= 30) {
            $alerts[] = $tok['days_left'] < 0
                ? 'Токен Метрики, скорее всего, истёк (' . $tok['expires'] . '). Получите новый и замените metrika_token в dash_config.php.'
                : 'Обновите токен Метрики: он истекает ' . $tok['expires'] . ' (через ' . $tok['days_left'] . ' дн.).';
        }

        // итог периода
        $lead = $card['leads'] ?? null;
        if ($lead && $lead['state'] === 'ok') {
            $parts = [dash_num((float) $lead['value']) . ' ' . self::plural((int) $lead['value'], 'заявка', 'заявки', 'заявок')
                . ($this->compare && !$lead['small'] && $lead['prev'] > 0 ? ' (' . self::changeText((float) $lead['value'], (float) $lead['prev']) . ' ' . $this->prevPhrase() . ')' : '')];
            $paid = $card['paid'] ?? null;
            if ($paid && $paid['state'] === 'ok') {
                $parts[] = dash_num((float) $paid['value']) . ' ' . self::plural((int) $paid['value'], 'новый ученик', 'новых ученика', 'новых учеников');
            }
            $cac = $card['cac'] ?? null;
            if ($cac && $cac['state'] === 'ok' && $cac['value']) {
                $parts[] = 'цена ученика ' . dash_rub((float) $cac['value']);
            }
            $info[] = $this->periodPhrase() . ': ' . implode(', ', $parts) . '.';
        }
        // главная потеря
        try {
            $f = $this->blockFunnel('all');
            if ($f['worst'] !== null) {
                $w = $f['steps'][$f['worst']];
                $prev = null;
                for ($i = $f['worst'] - 1; $i >= 0; $i--) {
                    if (($f['steps'][$i]['value'] ?? null) !== null) {
                        $prev = $f['steps'][$i];
                        break;
                    }
                }
                if ($prev) {
                    $info[] = 'Больше всего теряем на шаге «' . $prev['label'] . ' → ' . $w['label'] . '»: доходит ' . dash_pct((float) $w['pct_prev']) . '.';
                }
            }
        } catch (DashError $e) {
            // шаги воронки покажут ошибку в своём блоке
        }
        // лучший канал
        try {
            $ch = $this->blockChannels();
            $best = null;
            $paidAny = array_sum(array_map(static fn ($r) => (int) ($r['paid'] ?? 0), $ch['rows'])) > 0;
            foreach ($ch['rows'] as $r) {
                if ($paidAny) {
                    if (($r['leads'] ?? 0) >= DASH_MIN_N && $r['paid'] !== null) {
                        $val = 100 * $r['paid'] / $r['leads'];
                        if ($best === null || $val > $best[1]) {
                            $best = [$r, $val, 'заявок доходят до оплаты'];
                        }
                    }
                } elseif (($r['visits'] ?? 0) >= DASH_MIN_N && $r['conv'] !== null && $r['leads'] > 0) {
                    if ($best === null || $r['conv'] > $best[1]) {
                        $best = [$r, $r['conv'], 'визитов становятся заявками'];
                    }
                }
            }
            if ($best) {
                $info[] = 'Лучший канал — ' . $best[0]['label'] . ': ' . dash_pct($best[1]) . ' ' . $best[2] . '.';
            }
        } catch (DashError $e) {
            // ок
        }
        $items = array_map(static fn ($t) => ['type' => 'alert', 'text' => $t], $alerts);
        foreach ($info as $t) {
            $items[] = ['type' => 'info', 'text' => $t];
        }
        if (!$alerts) {
            $items[] = ['type' => 'ok', 'text' => 'Всё в порядке, отклонений нет.'];
        }
        return $this->meta() + ['items' => $items];
    }

    private function periodPhrase(): string {
        if ($this->period === 'today') {
            return 'Сегодня';
        }
        if ($this->period !== 'custom') {
            return 'За ' . $this->days . ' ' . self::plural($this->days, 'день', 'дня', 'дней');
        }
        return 'За ' . dash_day_label($this->from) . ' – ' . dash_day_label($this->to);
    }

    private function prevPhrase(): string {
        if ($this->period === 'today') {
            return 'ко вчера';
        }
        return $this->period !== 'custom' ? 'к прошлым ' . $this->days . ' ' . self::plural($this->days, 'дню', 'дням', 'дням') : 'к прошлому периоду';
    }

    private static function changeText(float $cur, float $prev): string {
        $ch = 100 * ($cur - $prev) / $prev;
        return ($ch >= 0 ? '▲ ' : '▼ ') . dash_pct(abs($ch));
    }

    private function agoText(DateTimeImmutable $d): string {
        $min = intdiv($this->now->getTimestamp() - $d->getTimestamp(), 60);
        if ($min < 60) {
            return $min . ' мин';
        }
        if ($min < 1440) {
            return intdiv($min, 60) . ' ч ' . ($min % 60) . ' мин';
        }
        return intdiv($min, 1440) . ' ' . self::plural(intdiv($min, 1440), 'день', 'дня', 'дней');
    }

    public static function plural(int $n, string $one, string $few, string $many): string {
        $n = abs($n) % 100;
        $n1 = $n % 10;
        if ($n > 10 && $n < 20) {
            return $many;
        }
        if ($n1 > 1 && $n1 < 5) {
            return $few;
        }
        return $n1 === 1 ? $one : $many;
    }
}
