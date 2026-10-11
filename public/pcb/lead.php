<?php
/**
 * TEACHNET, «Мастер-классы и значки»: приём заявки со страниц /holiday/ и /pcb/.
 *   GET  lead.php?token=1 — подписанная метка времени открытия страницы (для проверки «не быстрее 3 секунд»)
 *   POST lead.php         — заявка (multipart/form-data): 201 {ok, id} | 400 {ok:false, errors:{поле: текст}} |
 *                           403 / 429 / 500 {ok:false, error} — тогда страница показывает готовый текст для письма или Telegram.
 * Порядок: проверка → запись в pcb_leads → уведомление в Telegram (без контактов) → письмо с полной заявкой.
 * Если база недоступна, заявка не теряется: полная — письмом, в Telegram — короткое предупреждение.
 * Персональные данные в журналы не пишутся.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ob_start();

require __DIR__ . '/lib/pcb.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

/** @return never */
function out(int $code, array $data): void {
    http_response_code($code);
    ob_clean();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Конфиг: send_config.php выше веб-корня (как у send.php; lead.php лежит на уровень глубже) ──
$cfg = [];
$cfgDir = '';
foreach ([__DIR__ . '/../../send_config.php', __DIR__ . '/../../../send_config.php', __DIR__ . '/../../../../send_config.php'] as $path) {
    if (!is_file($path)) {
        continue;
    }
    $loaded = @include $path;
    if (is_array($loaded)) {
        $cfg = $loaded;
        $cfgDir = dirname($path);
        break;
    }
}
$SECRET = pcb_secret($cfg);

function field(string $key): string {
    $v = $_POST[$key] ?? '';
    return is_string($v) ? $v : '';
}

/** Публичный IP или '' (IPv4 в виде «::ffff:1.2.3.4» приводим к IPv4). */
function public_ip(string $ip): string {
    $ip = trim($ip);
    if (stripos($ip, '::ffff:') === 0 && filter_var(substr($ip, 7), FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $ip = substr($ip, 7);
    }
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false ? $ip : '';
}

/** Реальный IP клиента — та же логика, что в send.php: публичный REMOTE_ADDR, иначе X-Forwarded-For справа налево. */
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

/** Заявка со страницы нашего сайта (чужая страница выдаёт себя заголовками Sec-Fetch-Site и Origin). */
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
    return $originHost !== '' && ($originHost === 'teachnet.ru' || $originHost === $host);
}

/** Папка счётчиков лимитов: рядом с send_config.php (tn_state/pcb), иначе системная временная. */
function state_dir(string $cfgDir): ?string {
    foreach ([$cfgDir !== '' ? $cfgDir . '/tn_state/pcb' : '', sys_get_temp_dir() . '/tn_pcb'] as $dir) {
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

/** Не более $max событий за $window секунд по ключу (как в send.php). Нет хранилища — не блокируем. */
function rate_limited(?string $dir, string $key, int $max, int $window): bool {
    if ($dir === null) {
        return false;
    }
    if (mt_rand(1, 50) === 1) {
        foreach (glob($dir . '/*.json') ?: [] as $f) {
            if ((int) @filemtime($f) < time() - 86400) {
                @unlink($f);
            }
        }
    }
    $fp = @fopen($dir . '/' . sha1($key) . '.json', 'c+');
    if ($fp === false) {
        return false;
    }
    $now = time();
    $exceeded = false;
    if (flock($fp, LOCK_EX)) {
        $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
        $hits = is_array($hits) ? array_values(array_filter($hits, static fn ($t) => is_int($t) && ($now - $t) < $window)) : [];
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

/** Больше стольких заявок за 10 минут на всё направление — почти наверняка атака: только база, без уведомлений. */
const FLOOD_MAX = 30;

// ── GET ?token=1: метка времени открытия страницы, подписанная секретом ──
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['token'])) {
    $t = (string) time();
    out(200, ['t' => $t . '.' . hash_hmac('sha256', 'form|' . $t, $SECRET)]);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// ── Ловушка: поле website заполняют только боты → тихий «успех», ничего не сохраняем ──
if (field('website') !== '') {
    out(201, ['ok' => true, 'id' => 0]);
}
if (!same_origin()) {
    out(403, ['ok' => false, 'error' => 'forbidden']);
}

// ── Метка времени: не подделана, не старше 2 суток; быстрее 3 секунд с открытия страницы — бот ──
$token = field('token');
if (!preg_match('/^(\d{10})\.([0-9a-f]{64})$/', $token, $m) || !hash_equals(hash_hmac('sha256', 'form|' . $m[1], $SECRET), $m[2])
    || time() - (int) $m[1] > 172800 || (int) $m[1] > time() + 60) {
    out(400, ['ok' => false, 'errors' => ['form' => 'Страница устарела. Обновите её и отправьте заявку ещё раз.']]);
}
if (time() - (int) $m[1] < 3) {
    out(201, ['ok' => true, 'id' => 0]);
}

$STATE = state_dir($cfgDir);
if (rate_limited($STATE, client_ip(), 5, 600)) {
    out(429, ['ok' => false, 'error' => 'rate_limited']);
}

// ── Проверка полей (значения списков — только из словарей) ──
$errors = [];
$page = field('page');
if (!isset(PCB_PAGES[$page])) {
    out(400, ['ok' => false, 'errors' => ['form' => 'Не удалось отправить форму. Обновите страницу.']]);
}
$format = $page === 'holiday' ? field('program') : field('format');
if (!isset(PCB_FORMATS[$page][$format])) {
    $errors[$page === 'holiday' ? 'program' : 'format'] = 'Выберите вариант из списка.';
}
$qSet = $page === 'holiday' ? 'holiday' : $format;
$quantity = field('quantity');
$quantityCustom = null;
if (!isset(PCB_QUANTITIES[$qSet][$quantity])) {
    $errors['quantity'] = 'Выберите количество из списка.';
} elseif ($quantity === 'custom') {
    $raw = trim(field('custom-quantity'));
    if (!preg_match('/^\d{1,6}$/', $raw) || (int) $raw < 1 || (int) $raw > 100000) {
        $errors['custom-quantity'] = 'Укажите количество числом.';
    } else {
        $quantityCustom = (int) $raw;
    }
}
$design = null;
if ($page === 'pcb' && isset(PCB_DESIGNS[$format])) {
    $design = field('design');
    if (!isset(PCB_DESIGNS[$format][$design])) {
        $errors['design'] = 'Выберите оформление из списка.';
    }
}
// размер и режим свечения — только у тиража; у других форматов полей на странице нет
$sizeClass = $lightMode = null;
if ($page === 'pcb' && $format === 'merch') {
    $sizeClass = field('badge-size') !== '' ? field('badge-size') : 'M';
    $lightMode = field('light-mode') !== '' ? field('light-mode') : 'static';
    if (!isset(PCB_SIZES[$sizeClass])) {
        $errors['badge-size'] = 'Выберите размер из списка.';
    }
    if (!isset(PCB_LIGHT_MODES[$lightMode])) {
        $errors['light-mode'] = 'Выберите, как светится значок.';
    }
}
$name = pcb_clean(field('name'), 80);
if (mb_strlen($name) < 2) {
    $errors['name'] = 'Напишите, как к вам обращаться.';
}
$contactRaw = pcb_clean(field('contact'), 120);
$contact = pcb_parse_contact($contactRaw);
if ($contactRaw === '') {
    $errors['contact'] = 'Укажите телефон или Telegram.';
} elseif ($contact === null || isset($contact['email'])) {
    $errors['contact'] = isset($contact['email'])
        ? 'Нужен телефон или Telegram. Почту можно написать в комментарии.'
        : 'Похоже на опечатку. Телефон — например, +7 917 123-45-67, Telegram — @имя.';
}
if (field('consent') !== '1') {
    $errors['consent'] = 'Без согласия на обработку данных заявку не отправить.';
}
$eventDate = null;
$rawDate = trim(field('date'));
if ($rawDate !== '') {
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $rawDate);
    if (!$d || $d->format('Y-m-d') !== $rawDate || (int) $d->format('Y') < 2024 || (int) $d->format('Y') > 2100) {
        $errors['date'] = 'Проверьте дату.';
    } else {
        $eventDate = $rawDate;
    }
}
if ($errors) {
    out(400, ['ok' => false, 'errors' => $errors]);
}

// город: код ФИАС из подсказки сверяем со справочником и берём название и регион ИЗ НЕГО, а не из запроса
$cityText = pcb_clean(field('city'), 100);
$fias = strtolower(trim(field('city_fias_id')));
$cities = preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $fias) ? pcb_cities() : [];
if (isset($cities[$fias])) {
    [$cityName, $cityRegion] = $cities[$fias];
    $inDir = 1;
} else {
    [$cityName, $cityRegion, $fias, $inDir] = [$cityText !== '' ? $cityText : null, null, null, 0];
}

// примерка: только известные ключи и значения, тексты обрезаны
$tryon = null;
if ($page === 'pcb') {
    $t = json_decode(substr(field('tryon'), 0, 4000), true);
    if (is_array($t)) {
        $pick = static fn (string $k, array $allowed) => in_array($t[$k] ?? null, $allowed, true) ? $t[$k] : null;
        $clean = array_filter([
            'shape'     => $pick('shape', ['round', 'rect', 'badge']),
            'board'     => $pick('board', ['blue', 'black', 'white', 'green', 'purple']),
            'ink'       => $pick('ink', ['white', 'black', 'gold']),
            'cls'       => $pick('cls', ['S', 'M', 'L']),
            'light'     => $pick('light', ['cold', 'red', 'yellow', 'green', 'blue', 'off']),
            'mode'      => $pick('mode', ['static', 'blink', 'chase']),
            'leds'      => is_int($t['leds'] ?? null) && $t['leds'] > 0 && $t['leds'] <= 64 ? $t['leds'] : null,
            'logo'      => !empty($t['logo']),
            'back_text' => is_string($t['back_text'] ?? null) ? pcb_clean($t['back_text'], 60) : '',
            'qr'        => is_string($t['qr'] ?? null) ? pcb_clean($t['qr'], 160) : '',
            'text'      => is_string($t['text'] ?? null) ? pcb_clean($t['text'], 400) : '',
        ], static fn ($v) => $v !== null && $v !== '');
        if (isset($clean['shape'])) {
            $tryon = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }
}

$amountRaw = trim(field('estimate_amount'));
$now = pcb_now();
$lead = [
    'created_at'        => $now,
    'page'              => $page,
    'format'            => $format,
    'quantity'          => $quantity,
    'quantity_custom'   => $quantityCustom,
    'design'            => $design,
    'size_class'        => $sizeClass,
    'light_mode'        => $lightMode,
    'age'               => $page === 'holiday' ? (pcb_clean(field('age'), 100) ?: null) : null,
    'company'           => $page === 'pcb' ? (pcb_clean(field('company'), 100) ?: null) : null,
    'badge_text'        => $page === 'pcb' ? (pcb_clean(field('brand'), 24) ?: null) : null,
    'contact_name'      => $name,
    'contact_phone'     => $contact['phone'] ?? null,
    'contact_telegram'  => $contact['telegram'] ?? null,
    'contact_email'     => null,
    'city_name'         => $cityName,
    'city_region'       => $cityRegion,
    'city_fias_id'      => $fias,
    'city_in_directory' => $inDir,
    'event_date'        => $eventDate,
    'comment'           => pcb_clean(field('comment'), 1200, true) ?: null,
    'estimate_amount'   => preg_match('/^\d{1,9}$/', $amountRaw) ? (int) $amountRaw : null,
    'estimate_label'    => pcb_clean(field('estimate_label'), 200) ?: null,
    'tryon'             => $tryon,
    'consent_pd'        => 1,
    'consent_version'   => PCB_CONSENT_VERSION,
    'consent_at'        => $now,
    'utm_source'        => pcb_clean(field('utm_source'), 255) ?: null,
    'utm_medium'        => pcb_clean(field('utm_medium'), 255) ?: null,
    'utm_campaign'      => pcb_clean(field('utm_campaign'), 255) ?: null,
    'utm_content'       => pcb_clean(field('utm_content'), 255) ?: null,
    'utm_term'          => pcb_clean(field('utm_term'), 255) ?: null,
    'referrer'          => pcb_clean(field('referrer'), 512) ?: null,
    'ip_hash'           => hash_hmac('sha256', 'ip|' . client_ip(), $SECRET),
];

$flood = rate_limited($STATE, '_all', FLOOD_MAX, 600);

// ── Сначала база ──
try {
    $pdo = pcb_db($cfg);
    pcb_ensure_table($pdo);
    $cols = array_keys($lead);
    $pdo->prepare('INSERT INTO pcb_leads (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')
        ->execute(array_values($lead));
    $lead['id'] = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
    // без подробностей в ответе; в журнал — только причина, без данных заявки
    error_log('TEACHNET pcb: заявка не записана в базу — ' . $e->getMessage());
    $lead['id'] = 'без номера';
    $mailOk = pcb_mail($cfg, $lead, false);
    pcb_tg_send($cfg, 'Внимание: заявка с ' . ($page === 'holiday' ? '/holiday/' : '/pcb/') . ' не записалась в базу (ошибка базы данных). '
        . ($mailOk ? 'Полная заявка ушла письмом на почту направления.' : 'Письмо тоже не ушло — посетитель увидел готовый текст, чтобы написать нам сам.'));
    $mailOk ? out(201, ['ok' => true, 'id' => 0]) : out(500, ['ok' => false, 'error' => 'server']);
}

// ── Лавина заявок: только база, владельцу — одно предупреждение за 10 минут ──
if ($flood) {
    $mark = $STATE !== null ? $STATE . '/_flood_alert' : null;
    if ($mark === null || !is_file($mark) || time() - (int) filemtime($mark) >= 600) {
        if ($mark !== null) {
            @touch($mark);
        }
        pcb_tg_send($cfg, 'Внимание: больше ' . FLOOD_MAX . ' заявок на мастер-классы и значки за 10 минут — похоже на атаку. '
            . 'Новые заявки сохраняются только в базе (дашборд, вкладка «Значки и мастер-классы»), уведомления на паузе.');
    }
    out(201, ['ok' => true, 'id' => $lead['id']]);
}

// ── Потом уведомления: Telegram (без контактов) и письмо с полной заявкой ──
$tgOk = false;
try {
    $tgOk = pcb_notify($pdo, $cfg, $lead);
    if ($tgOk) {
        pcb_retry_notifications($pdo, $cfg, 3); // Telegram снова отвечает — дошлём то, что не ушло раньше
    }
} catch (Throwable $e) {
    error_log('TEACHNET pcb: уведомление — ' . $e->getMessage());
}
pcb_mail($cfg, $lead, $tgOk);

out(201, ['ok' => true, 'id' => $lead['id']]);
