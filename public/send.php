<?php
/**
 * TeachNet — приём заявки с лендинга: Telegram (основной канал) + MySQL + email.
 * Поля формы: name, phone, age, consent + honeypot (website) + источник (utm_*, yclid, ym_client_id).
 *
 * Секреты — в send_config.php ВЫШЕ веб-корня (вне зоны деплоя). Формат:
 *   <?php return [
 *     'bot_token' => '...', 'chat_id' => '...',
 *     'db_host' => 'localhost', 'db_name' => '...', 'db_user' => '...', 'db_pass' => '...',
 *     'email_to' => '...',
 *   ];
 */

// ── Конфиг (выше веб-корня, вне зоны деплоя) ──
// Глубина веб-корня на хостинге заранее неизвестна, поэтому ищем send_config.php
// на нескольких уровнях выше send.php и берём первый файл, вернувший массив.
$cfg = [];
$cfgDir = '';
foreach (
    [
        __DIR__ . '/../send_config.php',
        __DIR__ . '/../../send_config.php',
        __DIR__ . '/../../../send_config.php',
    ] as $cfgPath
) {
    $loaded = @include $cfgPath;
    if (is_array($loaded)) {
        $cfg = $loaded;
        $cfgDir = dirname($cfgPath);
        break;
    }
}
$BOT_TOKEN = $cfg['bot_token'] ?? '';
$CHAT_ID   = $cfg['chat_id']   ?? '';
$DB_HOST   = $cfg['db_host']   ?? 'localhost';
$DB_NAME   = $cfg['db_name']   ?? '';
$DB_USER   = $cfg['db_user']   ?? '';
$DB_PASS   = $cfg['db_pass']   ?? '';
$EMAIL_TO  = $cfg['email_to']  ?? '';
// отправитель писем — свой домен (mail_from в конфиге), а не заголовок Host: его подставляет клиент
$MAIL_FROM = filter_var($cfg['mail_from'] ?? '', FILTER_VALIDATE_EMAIL) ?: 'no-reply@teachnet.ru';
// адрес Bot API; tg_api в конфиге — только для проверки на стенде и только локальный адрес
$TG_API = 'https://api.telegram.org';
if (preg_match('~^http://(127\.0\.0\.1|localhost)(:\d+)?$~', rtrim((string) ($cfg['tg_api'] ?? ''), '/'))) {
    $TG_API = rtrim((string) $cfg['tg_api'], '/');
}

header('Content-Type: application/json; charset=utf-8');

// ── Хелперы ───────────────────────────────────────────────────────────────

/** Безопасно получить строковое POST-поле (массивы → пустая строка). */
function post(string $key): string {
    $v = $_POST[$key] ?? '';
    return is_string($v) ? $v : '';
}

/**
 * Санитизация ввода: убрать управляющие и невидимые символы — переводы строк (в т. ч. U+2028/2029),
 * символы направления текста и нулевой ширины, чтобы в Telegram и письме нельзя было подделать
 * лишние строки; битые байты UTF-8 заменяются. Обрезать длину.
 */
function clean(string $s, int $maxLen): string {
    if (!mb_check_encoding($s, 'UTF-8')) {
        $s = mb_convert_encoding($s, 'UTF-8', 'UTF-8');
    }
    $s = preg_replace('/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/u', ' ', $s) ?? '';
    $s = trim($s);
    if (mb_strlen($s) > $maxLen) {
        $s = mb_substr($s, 0, $maxLen);
    }
    return $s;
}

/** Публичный IP или '' (IPv4, записанный как IPv6 «::ffff:1.2.3.4», приводим к IPv4). */
function public_ip(string $ip): string {
    $ip = trim($ip);
    if (stripos($ip, '::ffff:') === 0 && filter_var(substr($ip, 7), FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $ip = substr($ip, 7);
    }
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false ? $ip : '';
}

/**
 * Реальный IP клиента. REMOTE_ADDR публичный — верим ему, X-Forwarded-For не смотрим.
 * Иначе запрос пришёл через прокси хостинга: он дописывает адрес клиента В КОНЕЦ X-Forwarded-For,
 * а начало цепочки может подставить сам клиент. Поэтому читаем справа налево — первый публичный.
 */
function client_ip(): string {
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if (($ip = public_ip($remote)) !== '') {
        return $ip;
    }
    foreach (array_reverse(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))) as $part) {
        if (($ip = public_ip($part)) !== '') {
            return $ip;
        }
    }
    return $remote !== '' ? $remote : 'unknown';
}

/** Домен сайта (без www): заявки со страниц этого домена принимаются всегда. */
const SITE_HOST = 'teachnet.ru';

/**
 * Заявка пришла со страницы нашего сайта. Браузер на чужой странице (скрытая форма, которая
 * шлёт заявки от имени посетителей) выдаёт себя заголовками Sec-Fetch-Site и Origin.
 * Запрос без них (старый браузер, скрипт) пропускаем — его держит лимит по IP.
 */
function same_origin(): bool {
    if (strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')) === 'cross-site') {
        return false;
    }
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return true;
    }
    $bare = static fn (string $h): string => (string) preg_replace('/^www\./', '', strtolower($h));
    $originHost = $bare((string) parse_url($origin, PHP_URL_HOST));
    $host = $bare((string) parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST));
    // свой домен — всегда; иначе страница и send.php должны быть на одном адресе (стенд, зеркало)
    return $originHost !== '' && ($originHost === SITE_HOST || $originHost === $host);
}

/**
 * Папка для счётчиков лимитов: рядом с send_config.php (выше веб-корня, доступна только нашему
 * аккаунту). Если её не создать — системная временная папка, как раньше. null — хранилища нет.
 */
function state_dir(string $cfgDir): ?string {
    foreach ([$cfgDir !== '' ? $cfgDir . '/tn_state/send' : '', sys_get_temp_dir() . '/tn_ratelimit'] as $dir) {
        if ($dir === '') {
            continue;
        }
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        if (is_dir($dir) && is_writable($dir)) {
            return $dir;
        }
    }
    return null;
}

/** Удалить счётчики, которые не менялись дольше $maxAge секунд (чтобы папка не росла). */
function state_gc(string $dir, int $maxAge): void {
    foreach (glob($dir . '/*.json') ?: [] as $f) {
        if ((int) @filemtime($f) < time() - $maxAge) {
            @unlink($f);
        }
    }
}

/** Лимит на файлах: не более $max событий за $window секунд по ключу (IP клиента или '_all' — весь сайт). */
function rate_limited(?string $dir, string $key, int $max, int $window): bool {
    if ($dir === null) {
        return false; // нет хранилища — не блокируем (fail-open), форму не ломаем
    }
    if (mt_rand(1, 50) === 1) {
        state_gc($dir, 86400);
    }
    $fp = @fopen($dir . '/' . sha1($key) . '.json', 'c+');
    if ($fp === false) {
        return false;
    }
    $now = time();
    $exceeded = false;
    if (flock($fp, LOCK_EX)) {
        $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
        if (!is_array($hits)) {
            $hits = [];
        }
        // оставляем только попадания внутри окна
        $hits = array_values(array_filter($hits, static function ($t) use ($now, $window) {
            return is_int($t) && ($now - $t) < $window;
        }));
        if (count($hits) >= $max) {
            $exceeded = true;
        } else {
            $hits[] = $now;
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($hits));
        }
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $exceeded;
}

/** Сообщение в Telegram. true — Bot API принял (HTTP 200). */
function tg_send(string $api, string $token, string $chatId, string $text): bool {
    $ch = curl_init($api . "/bot{$token}/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query(['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => true]),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($response === false || $httpCode !== 200) {
        error_log('TeachNet lead: Telegram не принял заявку, HTTP ' . $httpCode);
        return false;
    }
    return true;
}

/** Письмо-дубль (best-effort). true — почтовый сервер хостинга принял письмо. */
function mail_send(string $to, string $from, string $heading, string $body): bool {
    if ($to === '') {
        return false;
    }
    try {
        return @mail($to, '=?UTF-8?B?' . base64_encode($heading) . '?=', $body,
            "From: " . $from . "\r\nContent-Type: text/plain; charset=utf-8\r\n");
    } catch (Throwable $e) {
        error_log('TeachNet lead: ошибка отправки email — ' . $e->getMessage());
        return false;
    }
}

/** Приписка к письму, если Telegram заявку не принял: письмо — запасной канал. */
const TG_FAIL_NOTE = "\n\nВнимание: в Telegram эта заявка не ушла (Telegram не ответил). Проверьте бота.";

/** Порог «лавины»: больше LEADS_FLOOD_MAX заявок за 10 минут на весь сайт — почти наверняка атака. */
const LEADS_FLOOD_MAX = 30;

/**
 * Лавина заявок: новые пишутся только в базу, без Telegram и почты (чтобы их не завалило).
 * Владельцу — одно предупреждение в Telegram за 10 минут.
 */
function flood_alert(?string $dir, string $api, string $token, string $chatId): void {
    $mark = $dir !== null ? $dir . '/_flood_alert' : null;
    if ($mark !== null && is_file($mark) && time() - (int) filemtime($mark) < 600) {
        return;
    }
    if ($mark !== null) {
        @touch($mark);
    }
    tg_send($api, $token, $chatId, 'Внимание: больше ' . LEADS_FLOOD_MAX . " заявок с сайта за 10 минут — похоже на атаку.\n"
        . 'Новые заявки пока сохраняются только в базе (дашборд, «Что с заявками?»), Telegram и почта на паузе, пока поток не спадёт.');
}

/**
 * Ответ форме. Заявка не потеряна, если её принял хотя бы один канал: Telegram, база или почта —
 * тогда посетитель видит «Заявка отправлена». Ошибка — только если не сработало ничего.
 */
function finish_lead(bool $tgOk, ?int $leadId, bool $mailOk): void {
    if ($tgOk || $leadId || $mailOk) {
        echo json_encode(['ok' => true]);
        exit;
    }
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'telegram_failed']);
    exit;
}

// ── Только POST ──────────────────────────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// ── Honeypot: поле website заполняют только боты → тихий «успех» ─────────────
if (post('website') !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

// ── Только со страниц нашего сайта ───────────────────────────────────────────
if (!same_origin()) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

// ── Rate limiting по IP (защита от флуда) ────────────────────────────────────
$STATE_DIR = state_dir($cfgDir);
if (rate_limited($STATE_DIR, client_ip(), 5, 600)) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate_limited']);
    exit;
}

// ── Заявка на платы TEACHNET UNO (страница /tech) ────────────────────────────
// Свои поля: «Кто вы», контакт (телефон или Telegram), организация, число плат.
// Канал тот же: Telegram (основной) + база + email. Детские заявки ниже не меняются.
if (post('source') === 'tech') {
    $ROLES = [
        'school'  => 'Школа',
        'club'    => 'Кружок или центр',
        'teacher' => 'Педагог',
        'self'    => 'Для себя',
        'other'   => 'Другое',
    ];
    $role    = array_key_exists(post('role'), $ROLES) ? post('role') : 'other';
    $name    = clean(post('name'), 100);
    $contact = clean(post('contact'), 100);
    $org     = $role === 'self' ? '' : clean(post('org'), 150);
    $qtyRaw  = trim(post('qty'));
    $qty     = preg_match('/^\d{1,6}$/', $qtyRaw) ? max(1, (int) $qtyRaw) : 1;
    $consent = trim(post('consent'));

    if ($name === '' || $contact === '' || $consent === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'validation']);
        exit;
    }
    // номер из 11 цифр приводим к виду +7 (999) 123-45-67; Telegram и прочее — как ввели
    $cDigits = preg_replace('/\D/', '', $contact);
    if (strlen($cDigits) === 11 && preg_match('/^[\d\s()+\-]+$/', $contact)) {
        $cSub    = substr($cDigits, -10);
        $contact = '+7 (' . substr($cSub, 0, 3) . ') ' . substr($cSub, 3, 3) . '-' . substr($cSub, 6, 2) . '-' . substr($cSub, 8, 2);
    }
    if ($BOT_TOKEN === '' || $CHAT_ID === '') {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'not_configured']);
        exit;
    }
    $flood = rate_limited($STATE_DIR, '_all', LEADS_FLOOD_MAX, 600);

    $utm_source   = clean(post('utm_source'), 255);
    $utm_medium   = clean(post('utm_medium'), 255);
    $utm_campaign = clean(post('utm_campaign'), 255);
    $utm_term     = clean(post('utm_term'), 255);
    $utm_content  = clean(post('utm_content'), 255);
    $yclid        = clean(post('yclid'), 255);
    $ym_client_id = clean(post('ym_client_id'), 255);
    $referrer     = clean(post('referrer'), 512);
    $sourceText =
        "utm_source: " . $utm_source . "\n" .
        "utm_medium: " . $utm_medium . "\n" .
        "utm_campaign: " . $utm_campaign . "\n" .
        "utm_term: " . $utm_term . "\n" .
        "utm_content: " . $utm_content . "\n" .
        "Реферер: " . $referrer . "\n" .
        "ym_client_id: " . $ym_client_id;
    if ($yclid !== '') {
        $sourceText .= "\nyclid: " . $yclid;
    }
    $timeText = (new DateTime('now', new DateTimeZone('Europe/Moscow')))->format('d.m.Y H:i') . ' (МСК)';

    // база (best-effort): source=tech, контакт — в колонке phone; в аналитику школы не попадает
    $leadId = null;
    if ($DB_NAME !== '' && $DB_USER !== '') {
        try {
            $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            $cols = 'name, phone, child_age, created_at, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, yclid, ym_client_id, referrer';
            $vals = ":name, :phone, '', NOW(), 'tech', :utm_source, :utm_medium, :utm_campaign, :utm_term, :utm_content, :yclid, :ym_client_id, :referrer";
            $params = [
                ':name' => $name, ':phone' => $contact,
                ':utm_source' => $utm_source, ':utm_medium' => $utm_medium, ':utm_campaign' => $utm_campaign,
                ':utm_term' => $utm_term, ':utm_content' => $utm_content, ':yclid' => $yclid,
                ':ym_client_id' => $ym_client_id, ':referrer' => $referrer,
            ];
            // кто, организация и число плат — в note, чтобы заказ был виден и в базе
            $note = 'Кто: ' . $ROLES[$role] . ($org !== '' ? '; организация: ' . $org : '') . '; плат: ' . $qty;
            try {
                $pdo->prepare("INSERT INTO leads ({$cols}, note) VALUES ({$vals}, :note)")->execute($params + [':note' => $note]);
            } catch (Throwable $e) {
                // колонки note ещё нет (SQL дашборда не выполнен): пишем без неё
                $pdo->prepare("INSERT INTO leads ({$cols}) VALUES ({$vals})")->execute($params);
            }
            $leadId = (int) $pdo->lastInsertId();
        } catch (Throwable $e) {
            error_log('TeachNet lead (tech): ошибка записи в БД — ' . $e->getMessage());
        }
    }

    $heading = 'Новая заявка — платы TEACHNET UNO';
    $body =
        "Кто: " . $ROLES[$role] . "\n" .
        "Имя: " . $name . "\n" .
        "Контакт: " . $contact .
        ($org !== '' ? "\nОрганизация: " . $org : '') .
        "\nСколько плат: " . $qty .
        "\n\n— Источник —\n" . $sourceText .
        "\n\nВремя: " . $timeText .
        ($leadId ? "\nЗаявка #" . $leadId : '');

    if ($flood) {
        flood_alert($STATE_DIR, $TG_API, $BOT_TOKEN, $CHAT_ID);
        finish_lead(false, $leadId, false);
    }
    // Telegram — основной канал; письмо уходит всегда, а если Telegram не ответил — с пометкой
    $tgOk   = tg_send($TG_API, $BOT_TOKEN, $CHAT_ID, $heading . "\n\n" . $body);
    $mailOk = mail_send($EMAIL_TO, $MAIL_FROM, $heading, $body . ($tgOk ? '' : TG_FAIL_NOTE));
    finish_lead($tgOk, $leadId, $mailOk);
}

// ── Сбор и санитизация ───────────────────────────────────────────────────────
$name    = clean(post('name'), 100);
$digits  = preg_replace('/\D/', '', post('phone'));
$age     = clean(post('age'), 16);
$consent = trim(post('consent'));
// источник заявки: только из белого списка, иначе — обычная заявка с сайта
$source  = in_array(post('source'), ['child-masterclass', 'electronics', 'links', 'education', 'education2'], true) ? post('source') : 'website';

// филиал: только из белого списка (id из SITE.branches), иначе пусто
$BRANCHES = [
    'pavlyukhina' => 'Казань, ул. Павлюхина, 108б (напротив Kazan Mall)',
    'mardzhani'   => 'Казань, ул. Марджани, 28 (Старо-Татарская слобода, набережная озера Кабан)',
];
$branch     = array_key_exists(post('branch'), $BRANCHES) ? post('branch') : '';
$branchText = $branch !== '' ? "\nФилиал: " . $BRANCHES[$branch] : '';

$utm_source   = clean(post('utm_source'), 255);
$utm_medium   = clean(post('utm_medium'), 255);
$utm_campaign = clean(post('utm_campaign'), 255);
$utm_term     = clean(post('utm_term'), 255);
$utm_content  = clean(post('utm_content'), 255);
$yclid        = clean(post('yclid'), 255);
$ym_client_id = clean(post('ym_client_id'), 255);
$referrer     = clean(post('referrer'), 512);

// возраст: число 3–18 ИЛИ диапазон вида «6–8» / «9-12» (форма мастер-класса)
$ageValid = false;
if (preg_match('/^\d{1,2}$/', $age)) {
    $n = (int) $age;
    $ageValid = ($n >= 3 && $n <= 18);
} elseif (preg_match('/^\d{1,2}\s*[–—-]\s*\d{1,2}$/u', $age)) {
    $ageValid = true;
}

// ── Валидация ────────────────────────────────────────────────────────────────
if (mb_strlen($name) < 2 || strlen($digits) !== 11 || !$ageValid || $consent === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

// каноничный (заведомо чистый) телефон; возраст уже очищен через clean()
$sub   = substr($digits, -10);
$phone = '+7 (' . substr($sub, 0, 3) . ') ' . substr($sub, 3, 3) . '-' . substr($sub, 6, 2) . '-' . substr($sub, 8, 2);

if ($BOT_TOKEN === '' || $CHAT_ID === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'not_configured']);
    exit;
}
$flood = rate_limited($STATE_DIR, '_all', LEADS_FLOOD_MAX, 600);

// ── Блок «Источник» (строки UTM всегда присутствуют, даже с пустым значением,
//    чтобы было видно, что заявка пришла без меток) ─────────────────────────
$sourceText =
    "utm_source: " . $utm_source . "\n" .
    "utm_medium: " . $utm_medium . "\n" .
    "utm_campaign: " . $utm_campaign . "\n" .
    "utm_term: " . $utm_term . "\n" .
    "utm_content: " . $utm_content . "\n" .
    "Реферер: " . $referrer . "\n" .
    "ym_client_id: " . $ym_client_id;
// yclid показываем только при наличии (Яндекс.Директ) — чтобы не терять click id
if ($yclid !== '') {
    $sourceText .= "\nyclid: " . $yclid;
}

// ── Дата/время по Москве (таймзона задана явно, не зависит от сервера) ───────
$now = new DateTime('now', new DateTimeZone('Europe/Moscow'));
$timeText = $now->format('d.m.Y H:i') . ' (МСК)';

// ── Запись в БД ДО Telegram — чтобы получить номер заявки (best-effort) ───────
// Все запросы — prepared statements с плейсхолдерами (без конкатенации ввода).
$leadId = null;
if ($DB_NAME !== '' && $DB_USER !== '') {
    try {
        $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 5,
        ]);
        $params = [
            ':name'         => $name,
            ':phone'        => $phone,
            ':child_age'    => $age,
            ':source'       => $source,
            ':utm_source'   => $utm_source,
            ':utm_medium'   => $utm_medium,
            ':utm_campaign' => $utm_campaign,
            ':utm_term'     => $utm_term,
            ':utm_content'  => $utm_content,
            ':yclid'        => $yclid,
            ':ym_client_id' => $ym_client_id,
            ':referrer'     => $referrer,
        ];
        $cols = 'name, phone, child_age, created_at, source, '
            . 'utm_source, utm_medium, utm_campaign, utm_term, utm_content, yclid, ym_client_id, referrer';
        $vals = ':name, :phone, :child_age, NOW(), :source, '
            . ':utm_source, :utm_medium, :utm_campaign, :utm_term, :utm_content, :yclid, :ym_client_id, :referrer';
        try {
            // колонка branch (ALTER TABLE leads ADD COLUMN branch VARCHAR(32) DEFAULT NULL)
            $stmt = $pdo->prepare("INSERT INTO leads ({$cols}, branch) VALUES ({$vals}, :branch)");
            $stmt->execute($params + [':branch' => $branch !== '' ? $branch : null]);
        } catch (Throwable $e) {
            // колонки branch ещё нет: пишем заявку без неё, чтобы не терять записи
            error_log('TeachNet lead: запись без branch — ' . $e->getMessage());
            $stmt = $pdo->prepare("INSERT INTO leads ({$cols}) VALUES ({$vals})");
            $stmt->execute($params);
        }
        $leadId = (int) $pdo->lastInsertId();
    } catch (Throwable $e) {
        error_log('TeachNet lead: ошибка записи в БД — ' . $e->getMessage());
    }
}

// ── Сообщение (источник + время + номер заявки внизу) ────────────────────────
// parse_mode не используется → Telegram трактует текст как plain (разметку не
// инжектнуть). Поля уже очищены от управляющих символов и переводов строк.
// Заголовок зависит от источника — чтобы заявки с мастер-класса было видно отдельно.
$heading = $source === 'child-masterclass'
    ? 'Новая заявка — бесплатный мастер-класс (Твой Ход)'
    : ($source === 'electronics'
        ? 'Новая заявка — курс электроники (пробный урок)'
        : ($source === 'links'
            ? 'Новая заявка — визитка /links (из соцсетей)'
            // варианты главной для A/B-теста: /education, /education2
            : ($source === 'education'
                ? 'Заявка с главной — вариант B'
                : ($source === 'education2'
                    ? 'Заявка с главной — вариант C'
                    : 'Новая заявка с лендинга TEACHNET'))));
$text =
    $heading . "\n\n" .
    "Имя: " . $name . "\n" .
    "Телефон: " . $phone . "\n" .
    "Возраст ребёнка: " . $age . $branchText .
    "\n\n— Источник —\n" . $sourceText .
    "\n\nВремя: " . $timeText;
if ($leadId) {
    $text .= "\nЗаявка #" . $leadId;
}

// ── Лавина заявок (вероятно, атака): только база ─────────────────────────────
if ($flood) {
    flood_alert($STATE_DIR, $TG_API, $BOT_TOKEN, $CHAT_ID);
    finish_lead(false, $leadId, false);
}

// ── Отправка в Telegram (основной канал) ─────────────────────────────────────
$tgOk = tg_send($TG_API, $BOT_TOKEN, $CHAT_ID, $text);

// ── Email-дубль: уходит всегда; если Telegram не ответил — это запасной канал ─
$body =
    "Имя: " . $name . "\n" .
    "Телефон: " . $phone . "\n" .
    "Возраст ребёнка: " . $age . $branchText .
    "\n\n— Источник —\n" . $sourceText .
    "\n\nВремя: " . $timeText .
    ($leadId ? "\nЗаявка #" . $leadId : '');
$mailOk = mail_send($EMAIL_TO, $MAIL_FROM, $heading, $body . ($tgOk ? '' : TG_FAIL_NOTE));

finish_lead($tgOk, $leadId, $mailOk);
