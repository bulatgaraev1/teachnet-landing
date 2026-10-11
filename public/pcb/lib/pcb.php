<?php
/**
 * TEACHNET, направление «Мастер-классы и значки» (/holiday/, /pcb/): общее для приёма заявок (pcb/lead.php)
 * и вкладки дашборда (dash/pcb.php) — словари, таблица pcb_leads, разбор контакта и города, уведомления.
 * Доступ к базе и боту — из send_config.php (выше веб-корня), как у школьных заявок; таблица своя.
 * Из браузера файл не открывается (404 здесь и Require all denied в pcb/lib/.htaccess).
 */
declare(strict_types=1);

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

/** Редакция текста согласия /pcb/consent: сохраняется с каждой заявкой. Менять вместе с датой редакции на странице. */
const PCB_CONSENT_VERSION = 'pcb-2026-10-11';

const PCB_PAGES = ['holiday' => 'Праздники', 'pcb' => 'Компаниям'];

/** Формат заявки: на «Праздниках» — программа, на «Компаниям» — формат. Подписи — как в формах. */
const PCB_FORMATS = [
    'holiday' => [
        'pcb'     => 'Светящийся значок · от 10 лет',
        'wedo'    => 'Робот LEGO WeDo',
        'traffic' => 'Светофор на макетной плате',
        'younger' => 'Подобрать для младших или смешанной группы',
    ],
    'pcb' => [
        'merch'     => 'Готовый тираж значков',
        'corporate' => 'Корпоративный мастер-класс',
        'stand'     => 'Зона пайки на стенде',
    ],
];

/** Варианты количества: для «Праздников» — один список, для компаний — свой у каждого формата (как в app.js). */
const PCB_QUANTITIES = [
    'holiday'   => ['10' => '10 участников', '20' => '20 участников', '40' => '40 участников', 'custom' => 'Другое количество'],
    'merch'     => ['100' => '100 значков', '300' => '300 значков', 'custom' => 'Другой тираж'],
    'corporate' => ['20' => '20 участников', 'custom' => 'Другое количество'],
    'stand'     => ['50' => 'До 50 гостей', '100' => '50–100 гостей', 'custom' => 'Больше 100 гостей'],
];

const PCB_DESIGNS = [
    'merch'     => ['new' => 'Новый брендированный значок', 'repeat' => 'Повтор согласованного дизайна', 'custom' => 'Новая форма или электроника'],
    'corporate' => ['new' => 'С нашим брендом', 'standard' => 'Дизайн TEACHNET', 'custom' => 'Новая форма или электроника'],
    'stand'     => ['new' => 'С нашим брендом', 'standard' => 'Дизайн TEACHNET', 'custom' => 'Новая форма или электроника'],
];

/** Размер и режим свечения значка — только для готового тиража (поля «Размер» и «Как светится» в калькуляторе). */
const PCB_SIZES = ['S' => 'S · до 40 мм', 'M' => 'M · 40–60 мм', 'L' => 'L · бейдж или крупный контур'];
const PCB_LIGHT_MODES = ['static' => 'Ровный свет', 'blink' => 'Мерцание', 'chase' => 'Бегущий огонь'];

/** Статусы заявки во вкладке дашборда (заказ мастер-класса или тиража, не учёба). */
const PCB_STATUSES = [
    'new'       => 'Новая',
    'contacted' => 'Связались',
    'proposal'  => 'Отправили расчёт',
    'won'       => 'Договорились',
    'done'      => 'Выполнено',
    'lost'      => 'Отказ',
    'junk'      => 'Нецелевая',
];

const PCB_FEDERAL = 'город федерального значения';

/** Таблица заявок направления. Создаётся сама при первой заявке или первом открытии вкладки дашборда. */
const PCB_TABLE_SQL = <<<'SQL'
CREATE TABLE IF NOT EXISTS pcb_leads (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at        DATETIME NOT NULL COMMENT 'московское время',
  page              VARCHAR(16) NOT NULL COMMENT 'holiday | pcb',
  format            VARCHAR(16) NOT NULL COMMENT 'holiday: pcb|wedo|traffic|younger; pcb: merch|corporate|stand',
  quantity          VARCHAR(16) NOT NULL DEFAULT '',
  quantity_custom   INT UNSIGNED NULL,
  design            VARCHAR(16) NULL,
  size_class        VARCHAR(2) NULL COMMENT 'S | M | L — только для тиража',
  light_mode        VARCHAR(8) NULL COMMENT 'static | blink | chase — только для тиража',
  age               VARCHAR(100) NULL,
  company           VARCHAR(100) NULL,
  badge_text        VARCHAR(24) NULL COMMENT 'название на значке из первого экрана /pcb/',
  contact_name      VARCHAR(80) NOT NULL,
  contact_phone     VARCHAR(20) NULL,
  contact_telegram  VARCHAR(40) NULL,
  contact_email     VARCHAR(120) NULL,
  city_name         VARCHAR(100) NULL,
  city_region       VARCHAR(100) NULL,
  city_fias_id      CHAR(36) NULL COMMENT 'ключ города для аналитики',
  city_in_directory TINYINT(1) NOT NULL DEFAULT 0,
  event_date        DATE NULL,
  comment           TEXT NULL,
  estimate_amount   INT UNSIGNED NULL,
  estimate_label    VARCHAR(200) NULL,
  tryon             TEXT NULL COMMENT 'JSON: форма, плата, логотип, свет, текст и QR оборота',
  tryon_image       VARCHAR(255) NULL,
  consent_pd        TINYINT(1) NOT NULL,
  consent_version   VARCHAR(32) NOT NULL,
  consent_at        DATETIME NOT NULL,
  utm_source        VARCHAR(255) NULL,
  utm_medium        VARCHAR(255) NULL,
  utm_campaign      VARCHAR(255) NULL,
  utm_content       VARCHAR(255) NULL,
  utm_term          VARCHAR(255) NULL,
  referrer          VARCHAR(512) NULL,
  ip_hash           CHAR(64) NULL COMMENT 'SHA-256 IP с солью — только для защиты от спама',
  status            VARCHAR(16) NOT NULL DEFAULT 'new',
  status_updated_at DATETIME NULL,
  deal_amount       INT UNSIGNED NULL,
  note              TEXT NULL,
  notified_at       DATETIME NULL COMMENT 'когда уведомление ушло в Telegram',
  notify_attempts   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_created (created_at),
  KEY idx_fias (city_fias_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

/** Подключение к базе по send_config.php (тот же доступ, что у школьных заявок). */
function pcb_db(array $cfg): PDO {
    if (strpos((string) ($cfg['db_dsn'] ?? ''), 'sqlite:') === 0) {
        throw new RuntimeException('SQLite для заявок направления не поддерживается');
    }
    if (empty($cfg['db_name']) || empty($cfg['db_user'])) {
        throw new RuntimeException('В send_config.php не заданы db_name / db_user');
    }
    $dsn = 'mysql:host=' . ($cfg['db_host'] ?? 'localhost') . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, (string) $cfg['db_user'], (string) ($cfg['db_pass'] ?? ''), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 5,
    ]);
    $pdo->exec("SET time_zone = '+03:00'");
    return $pdo;
}

/** Столбцы, добавленные после первого запуска: таблица, созданная раньше, получает их сама. */
const PCB_ADDED_COLUMNS = [
    'size_class' => "VARCHAR(2) NULL COMMENT 'S | M | L — только для тиража' AFTER design",
    'light_mode' => "VARCHAR(8) NULL COMMENT 'static | blink | chase — только для тиража' AFTER size_class",
];

function pcb_ensure_table(PDO $pdo): void {
    static $done = false;
    if ($done) {
        return;
    }
    $pdo->exec(PCB_TABLE_SQL);
    $have = array_map('strtolower', $pdo->query('SHOW COLUMNS FROM pcb_leads')->fetchAll(PDO::FETCH_COLUMN));
    foreach (PCB_ADDED_COLUMNS as $col => $def) {
        if (!in_array($col, $have, true)) {
            $pdo->exec('ALTER TABLE pcb_leads ADD COLUMN ' . $col . ' ' . $def); // имена и типы — только из кода
        }
    }
    $done = true;
}

function pcb_now(): string {
    return (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('Y-m-d H:i:s');
}

/** Секрет для подписи метки времени формы и соли IP: свой (pcb_secret) или выведенный из секретов конфига. */
function pcb_secret(array $cfg): string {
    $own = (string) ($cfg['pcb_secret'] ?? '');
    return $own !== '' ? $own : hash('sha256', 'teachnet-pcb|' . ($cfg['bot_token'] ?? '') . '|' . ($cfg['db_pass'] ?? ''));
}

/**
 * Строка без управляющих и невидимых символов (переводы строк — только если $multiline),
 * битый UTF-8 заменяется, длина обрезается. Так нельзя подделать строки в Telegram и письме.
 */
function pcb_clean(string $s, int $max, bool $multiline = false): string {
    if (!mb_check_encoding($s, 'UTF-8')) {
        $s = mb_convert_encoding($s, 'UTF-8', 'UTF-8');
    }
    if ($multiline) {
        $s = str_replace(["\r\n", "\r"], "\n", $s);
        $s = preg_replace('/[^\P{Cc}\n]+|[\p{Cf}\p{Zl}\p{Zp}]+/u', ' ', $s) ?? '';
        $s = preg_replace("/\n{3,}/", "\n\n", $s) ?? '';
    } else {
        $s = preg_replace('/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/u', ' ', $s) ?? '';
    }
    $s = trim($s);
    return mb_strlen($s) > $max ? mb_substr($s, 0, $max) : $s;
}

/**
 * Поле «Телефон или Telegram» (почту тоже принимаем): ['phone' => '+7…'] | ['telegram' => '@…'] | ['email' => …]
 * или null — не похоже ни на одно. Телефон приводится к +7XXXXXXXXXX (иностранный — к +цифрам).
 */
function pcb_parse_contact(string $s): ?array {
    $s = trim($s);
    if ($s === '') {
        return null;
    }
    if (strpos($s, '@') > 0 && filter_var($s, FILTER_VALIDATE_EMAIL) && mb_strlen($s) <= 120) {
        return ['email' => mb_strtolower($s)];
    }
    if (preg_match('~^(?:@|(?:https?://)?(?:t\.me|telegram\.me)/)([A-Za-z][A-Za-z0-9_]{4,31})/?$~i', $s, $m)) {
        return ['telegram' => '@' . $m[1]];
    }
    if (preg_match('/^\+?[\d\s()\-.]{7,25}$/', $s)) {
        $d = preg_replace('/\D/', '', $s) ?? '';
        if (strlen($d) === 11 && ($d[0] === '7' || $d[0] === '8')) {
            return ['phone' => '+7' . substr($d, 1)];
        }
        if (strlen($d) === 10 && $d[0] === '9') {
            return ['phone' => '+7' . $d];
        }
        if ($s[0] === '+' && strlen($d) >= 10 && strlen($d) <= 15) {
            return ['phone' => '+' . $d];
        }
        return null;
    }
    if (preg_match('/^[A-Za-z][A-Za-z0-9_]{4,31}$/', $s)) {
        return ['telegram' => '@' . $s];
    }
    return null;
}

/** Справочник городов — тот же файл, что подсказывает города в форме (static/cities-ru.js): [fias => [название, регион]]. */
function pcb_cities(): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    $js = (string) @file_get_contents(__DIR__ . '/../static/cities-ru.js');
    $start = strpos($js, '={regions:');
    $end = strrpos($js, '};');
    if ($start === false || $end === false) {
        error_log('TEACHNET pcb: не прочитан справочник городов cities-ru.js');
        return $map;
    }
    $json = substr($js, $start + 1, $end - $start);
    $json = preg_replace(['/^\{regions:/', '/\],list:\[/'], ['{"regions":', '],"list":['], $json, 1) ?? '';
    $data = json_decode($json, true);
    if (!is_array($data) || !isset($data['regions'], $data['list'])) {
        error_log('TEACHNET pcb: справочник городов cities-ru.js не разобран');
        return $map;
    }
    foreach ($data['list'] as $c) {
        if (is_array($c) && isset($c[0], $c[1], $c[3])) {
            $map[strtolower((string) $c[3])] = [(string) $c[0], (string) ($data['regions'][(int) $c[1]] ?? '')];
        }
    }
    return $map;
}

/** «Казань, Республика Татарстан»; город федерального значения — без региона; не из справочника — с пометкой. */
function pcb_city_label(array $lead): string {
    $name = (string) ($lead['city_name'] ?? '');
    if ($name === '') {
        return '';
    }
    $region = (string) ($lead['city_region'] ?? '');
    if (empty($lead['city_in_directory'])) {
        return $name . ' (нет в справочнике)';
    }
    return $region !== '' && $region !== PCB_FEDERAL ? $name . ', ' . $region : $name;
}

function pcb_quantity_label(array $lead): string {
    $set = $lead['page'] === 'holiday' ? 'holiday' : (string) $lead['format'];
    if ($lead['quantity'] === 'custom') {
        $n = (int) ($lead['quantity_custom'] ?? 0);
        $unit = $set === 'merch' ? 'значков' : ($set === 'stand' ? 'гостей' : 'участников');
        return $n > 0 ? $n . ' ' . $unit : (PCB_QUANTITIES[$set]['custom'] ?? 'другое');
    }
    return PCB_QUANTITIES[$set][$lead['quantity']] ?? (string) $lead['quantity'];
}

function pcb_format_label(array $lead): string {
    return PCB_FORMATS[$lead['page']][$lead['format']] ?? (string) $lead['format'];
}

function pcb_rub(int $v): string {
    return number_format($v, 0, ',', "\u{00A0}") . "\u{00A0}₽";
}

/** Адрес вкладки направления в дашборде — в уведомлении вместо контактов. */
function pcb_dash_url(): string {
    return 'https://teachnet.ru/dash/?view=pcb';
}

/**
 * Текст уведомления. Без $withContacts — ни имени, ни контактов, ни комментария (в нём бывают телефоны):
 * Telegram — иностранный сервис, персональные данные туда не уходят (см. /pcb/privacy). Они — в дашборде и в письме.
 */
function pcb_notify_text(array $lead, bool $withContacts): string {
    $title = $lead['page'] === 'holiday' ? 'Новая заявка — мастер-класс на праздник' : 'Новая заявка — значки и мастер-классы компаниям';
    $lines = [$title, '', 'Страница: ' . (PCB_PAGES[$lead['page']] ?? $lead['page']), 'Формат: ' . pcb_format_label($lead), 'Количество: ' . pcb_quantity_label($lead)];
    if (!empty($lead['design'])) {
        $lines[] = 'Оформление: ' . (PCB_DESIGNS[$lead['format']][$lead['design']] ?? $lead['design']);
    }
    if (!empty($lead['size_class'])) {
        $lines[] = 'Размер: ' . (PCB_SIZES[$lead['size_class']] ?? $lead['size_class']);
    }
    if (!empty($lead['light_mode'])) {
        $lines[] = 'Свет: ' . (PCB_LIGHT_MODES[$lead['light_mode']] ?? $lead['light_mode']);
    }
    if (!empty($lead['age'])) {
        $lines[] = 'Возраст участников: ' . $lead['age'];
    }
    if (!empty($lead['company'])) {
        $lines[] = 'Компания: ' . $lead['company'];
    }
    if (!empty($lead['badge_text'])) {
        $lines[] = 'Название для значка: ' . $lead['badge_text'];
    }
    $city = pcb_city_label($lead);
    $lines[] = 'Город: ' . ($city !== '' ? $city : 'не указан');
    $lines[] = 'Дата: ' . (!empty($lead['event_date']) ? date('d.m.Y', (int) strtotime((string) $lead['event_date'])) : 'не выбрана');
    $lines[] = 'Бюджет с калькулятора: ' . ($lead['estimate_amount'] !== null && $lead['estimate_amount'] !== '' ? pcb_rub((int) $lead['estimate_amount']) : 'индивидуальный расчёт');
    if (!empty($lead['tryon'])) {
        $t = json_decode((string) $lead['tryon'], true);
        if (is_array($t) && !empty($t['text'])) {
            $lines[] = 'Примерка: ' . $t['text'];
        }
    }
    if ($withContacts) {
        $lines[] = '';
        $lines[] = 'Имя: ' . $lead['contact_name'];
        foreach (['contact_phone' => 'Телефон', 'contact_telegram' => 'Telegram', 'contact_email' => 'Почта'] as $k => $label) {
            if (!empty($lead[$k])) {
                $lines[] = $label . ': ' . $lead[$k];
            }
        }
        if (!empty($lead['comment'])) {
            $lines[] = 'Комментарий: ' . $lead['comment'];
        }
        $src = array_filter([$lead['utm_source'] ?? '', $lead['utm_medium'] ?? '', $lead['utm_campaign'] ?? '', $lead['utm_content'] ?? '', $lead['utm_term'] ?? '']);
        if ($src) {
            $lines[] = 'Метки: ' . implode(' / ', $src);
        }
        if (!empty($lead['referrer'])) {
            $lines[] = 'Пришли с: ' . $lead['referrer'];
        }
    } else {
        $lines[] = '';
        $lines[] = (!empty($lead['comment']) ? 'Есть комментарий. ' : '') . 'Имя и контакты — в дашборде: ' . pcb_dash_url();
    }
    $when = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string) $lead['created_at'], new DateTimeZone('Europe/Moscow'));
    $lines[] = '';
    $lines[] = 'Заявка №' . $lead['id'] . ($when ? ' · ' . $when->format('d.m.Y H:i') . ' (МСК)' : '');
    return implode("\n", $lines);
}

/** Адрес Bot API: tg_api в конфиге — только для проверки на стенде и только локальный адрес. */
function pcb_tg_api(array $cfg): string {
    $api = rtrim((string) ($cfg['tg_api'] ?? ''), '/');
    return preg_match('~^http://(127\.0\.0\.1|localhost)(:\d+)?$~', $api) ? $api : 'https://api.telegram.org';
}

/** Сообщение в Telegram (тот же бот и чат, что у школьных заявок). true — Bot API принял. */
function pcb_tg_send(array $cfg, string $text): bool {
    $token = (string) ($cfg['bot_token'] ?? '');
    $chat = (string) ($cfg['chat_id'] ?? '');
    if ($token === '' || $chat === '') {
        return false;
    }
    $ch = curl_init(pcb_tg_api($cfg) . '/bot' . $token . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query(['chat_id' => $chat, 'text' => $text, 'disable_web_page_preview' => true]),
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res === false || $code !== 200) {
        error_log('TEACHNET pcb: Telegram не принял уведомление, HTTP ' . $code);
        return false;
    }
    return true;
}

/** Полная заявка письмом на почту направления (pcb_email_to в send_config.php, по умолчанию pcb@teachnet.ru; '' — не слать). */
function pcb_mail(array $cfg, array $lead, bool $tgOk): bool {
    $to = array_key_exists('pcb_email_to', $cfg) ? (string) $cfg['pcb_email_to'] : 'pcb@teachnet.ru';
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $from = filter_var($cfg['mail_from'] ?? '', FILTER_VALIDATE_EMAIL) ?: 'no-reply@teachnet.ru';
    $body = pcb_notify_text($lead, true) . ($tgOk ? '' : "\n\nВнимание: в Telegram уведомление не ушло (Telegram не ответил) — повторим автоматически.");
    $subject = 'Заявка №' . $lead['id'] . ' — ' . (PCB_PAGES[$lead['page']] ?? '') . ', ' . pcb_format_label($lead);
    try {
        return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body,
            'From: ' . $from . "\r\nContent-Type: text/plain; charset=utf-8\r\n");
    } catch (Throwable $e) {
        error_log('TEACHNET pcb: письмо не отправлено — ' . $e->getMessage());
        return false;
    }
}

/** Уведомить о заявке в Telegram и отметить в базе; не получилось — попытка засчитывается, повторим позже. */
function pcb_notify(PDO $pdo, array $cfg, array $lead): bool {
    $ok = pcb_tg_send($cfg, pcb_notify_text($lead, !empty($cfg['pcb_tg_contacts'])));
    if ($ok) {
        $pdo->prepare('UPDATE pcb_leads SET notified_at = ?, notify_attempts = LEAST(notify_attempts + 1, 250) WHERE id = ?')
            ->execute([pcb_now(), $lead['id']]);
    } else {
        $pdo->prepare('UPDATE pcb_leads SET notify_attempts = LEAST(notify_attempts + 1, 250) WHERE id = ?')->execute([$lead['id']]);
    }
    return $ok;
}

/**
 * Повтор неотправленных уведомлений (Telegram был недоступен): при каждой новой заявке и при открытии
 * вкладки дашборда — до $limit самых старых за последние 3 дня, не больше 20 попыток на заявку.
 */
function pcb_retry_notifications(PDO $pdo, array $cfg, int $limit = 3): int {
    $st = $pdo->prepare('SELECT * FROM pcb_leads WHERE notified_at IS NULL AND notify_attempts < 20 AND created_at >= ? ORDER BY id LIMIT ' . max(1, min(10, $limit)));
    $st->execute([(new DateTimeImmutable('-3 days', new DateTimeZone('Europe/Moscow')))->format('Y-m-d H:i:s')]);
    $sent = 0;
    foreach ($st->fetchAll() as $lead) {
        if (!pcb_notify($pdo, $cfg, $lead)) {
            break; // Telegram всё ещё недоступен — остальные не дёргаем
        }
        $sent++;
    }
    return $sent;
}
