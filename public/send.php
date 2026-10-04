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
// адрес Bot API; tg_api в конфиге — только для проверки на стенде, на сервере не задаётся
$TG_API    = rtrim((string) ($cfg['tg_api'] ?? 'https://api.telegram.org'), '/');

header('Content-Type: application/json; charset=utf-8');

// ── Хелперы ───────────────────────────────────────────────────────────────

/** Безопасно получить строковое POST-поле (массивы → пустая строка). */
function post(string $key): string {
    $v = $_POST[$key] ?? '';
    return is_string($v) ? $v : '';
}

/** Санитизация ввода: убрать управляющие символы (вкл. переводы строк), обрезать длину. */
function clean(string $s, int $maxLen): string {
    $s = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $s) ?? $s;
    $s = trim($s);
    if (mb_strlen($s) > $maxLen) {
        $s = mb_substr($s, 0, $maxLen);
    }
    return $s;
}

/**
 * Реальный IP клиента. X-Forwarded-For учитываем ТОЛЬКО если прямое подключение
 * пришло от приватного/локального прокси — иначе XFF легко подделать и обойти лимит.
 */
function client_ip(): string {
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    // если REMOTE_ADDR — публичный IP, доверяем ему и игнорируем XFF
    if (filter_var($remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
        return $remote;
    }
    // иначе (за прокси/CDN) — берём первый публичный IP из цепочки XFF
    foreach (explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '') as $part) {
        $ip = trim($part);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
            return $ip;
        }
    }
    return $remote !== '' ? $remote : 'unknown';
}

/** Простой rate limit на файлах: не более $max заявок за $window секунд с одного IP. */
function rate_limited(string $ip, int $max = 5, int $window = 600): bool {
    $dir = sys_get_temp_dir() . '/tn_ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        return false; // нет хранилища — не блокируем (fail-open), форму не ломаем
    }
    $fp = @fopen($dir . '/' . sha1($ip) . '.json', 'c+');
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
function mail_send(string $to, string $heading, string $body): bool {
    if ($to === '') {
        return false;
    }
    try {
        // хост для From чистим от чужеродных символов (защита от инъекции заголовков)
        $host = preg_replace('/[^A-Za-z0-9.\-:]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost') ?: 'localhost';
        return @mail($to, '=?UTF-8?B?' . base64_encode($heading) . '?=', $body,
            "From: no-reply@" . $host . "\r\nContent-Type: text/plain; charset=utf-8\r\n");
    } catch (Throwable $e) {
        error_log('TeachNet lead: ошибка отправки email — ' . $e->getMessage());
        return false;
    }
}

/** Приписка к письму, если Telegram заявку не принял: письмо — запасной канал. */
const TG_FAIL_NOTE = "\n\nВнимание: в Telegram эта заявка не ушла (Telegram не ответил). Проверьте бота.";

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

// ── Rate limiting по IP (защита от флуда) ────────────────────────────────────
if (rate_limited(client_ip())) {
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

    // Telegram — основной канал; письмо уходит всегда, а если Telegram не ответил — с пометкой
    $tgOk   = tg_send($TG_API, $BOT_TOKEN, $CHAT_ID, $heading . "\n\n" . $body);
    $mailOk = mail_send($EMAIL_TO, $heading, $body . ($tgOk ? '' : TG_FAIL_NOTE));
    finish_lead($tgOk, $leadId, $mailOk);
}

// ── Сбор и санитизация ───────────────────────────────────────────────────────
$name    = clean(post('name'), 100);
$digits  = preg_replace('/\D/', '', post('phone'));
$age     = clean(post('age'), 16);
$consent = trim(post('consent'));
// источник заявки: только из белого списка, иначе — обычная заявка с сайта
$source  = in_array(post('source'), ['child-masterclass', 'electronics'], true) ? post('source') : 'website';

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
        : 'Новая заявка с лендинга TEACHNET');
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
$mailOk = mail_send($EMAIL_TO, $heading, $body . ($tgOk ? '' : TG_FAIL_NOTE));

finish_lead($tgOk, $leadId, $mailOk);
