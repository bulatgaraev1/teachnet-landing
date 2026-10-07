<?php
/**
 * TeachNet — закрытый дашборд /dash: общие функции (конфиг, сессия, вход,
 * клиент API Яндекс.Метрики с кешем, база заявок, словарь каналов и статусов).
 * Подключается из index.php и api.php.
 *
 * Секреты — ТОЛЬКО на сервере, выше веб-корня (рядом с send_config.php):
 *   dash_config.php:  <?php return ['metrika_token' => '...', 'counter_id' => 96429194, 'password' => '...',
 *                                   'token_issued' => 'ГГГГ-ММ-ДД' (необязательно)];
 *   send_config.php:  доступ к базе (db_host, db_name, db_user, db_pass) — уже есть, не дублируем.
 * Токен Метрики не уходит в браузер: все запросы к Метрике делает этот PHP.
 */
declare(strict_types=1);

// прямой запрос к lib.php из браузера — 404
if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

date_default_timezone_set('Europe/Moscow');

const DASH_CACHE_TTL      = 3600; // кеш ответов Метрики, сек
const DASH_ERROR_TTL      = 600;  // кеш ответа Метрики «ошибка в запросе» (400), сек
const DASH_REFRESH_MIN    = 60;   // «Обновить» не чаще раза в минуту
const DASH_LOGIN_MAX      = 5;    // попыток входа…
const DASH_LOGIN_WINDOW   = 900;  // …за 15 минут с одного IP
const DASH_LOGIN_GLOBAL_MAX    = 30;   // проверок пароля…
const DASH_LOGIN_GLOBAL_WINDOW = 3600; // …за час на весь дашборд (перебор с многих адресов)
const DASH_SESSION_TTL    = 43200; // сессия живёт 12 часов
const DASH_API_LIMIT      = 180;  // запросов к Метрике за 5 минут (лимит Метрики — 200)
const DASH_API_SLOTS      = 3;    // одновременных запросов к Метрике (лимит Метрики — 3)
const DASH_API_BASE       = 'https://api-metrika.yandex.net';
const DASH_MIN_N          = 30;   // меньше — «мало данных»: проценты серые, без выводов

/** Ошибка, текст которой можно показать на странице. */
final class DashError extends RuntimeException {}

/**
 * Конфиг выше веб-корня. Ищем так же, как send.php ищет send_config.php
 * (несколько уровней выше веб-корня), только /dash лежит на уровень глубже.
 * null — файла нет; DashError — файл есть, но с ошибкой (текст можно показать).
 */
function dash_find_config(string $file): ?array {
    foreach ([__DIR__ . '/../../' . $file, __DIR__ . '/../../../' . $file, __DIR__ . '/../../../../' . $file] as $path) {
        if (!is_file($path)) {
            continue;
        }
        // посторонний вывод конфига (пустая строка или BOM в начале, пробелы после закрывающего тега) отбрасываем
        ob_start();
        try {
            $cfg = include $path; // предупреждения из конфига — в лог (display_errors выключен в index/api)
        } catch (Throwable $e) {
            error_log('TeachNet dash: ошибка в ' . $file . ' — ' . $e->getMessage());
            throw new DashError('Файл ' . $file . ' не читается: в нём ошибка PHP. Сверьте его с шаблоном <?php return [ … ];');
        } finally {
            ob_get_clean();
        }
        if (!is_array($cfg)) {
            throw new DashError('Файл ' . $file . ' найден, но не возвращает настройки. Сверьте его с шаблоном <?php return [ … ];');
        }
        if ($file === 'dash_config.php') {
            dash_config_dir(dirname($path));
        }
        return $cfg;
    }
    return null;
}

/** Папка, где лежит dash_config.php (выше веб-корня). Рядом с ней — папка состояния tn_state. */
function dash_config_dir(?string $set = null): string {
    static $dir = '';
    if ($set !== null) {
        $dir = $set;
    }
    return $dir;
}

/** Общие заголовки: не индексировать, не кешировать (CSP и прочее — из корневого .htaccess). */
function dash_headers(): void {
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store, max-age=0');
}

function dash_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) DASH_SESSION_TTL);
    session_name('tn_dash');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/dash/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
}

function dash_logged_in(): bool {
    return !empty($_SESSION['auth']) && (int) ($_SESSION['auth_until'] ?? 0) > time();
}

function dash_csrf_ok(?string $token): bool {
    return is_string($token) && isset($_SESSION['csrf']) && hash_equals((string) $_SESSION['csrf'], $token);
}

function dash_login(string $password, array $cfg): bool {
    // password_hash — хеш пароля (password_hash() в PHP); если его нет — password открытым текстом
    $hash = (string) ($cfg['password_hash'] ?? '');
    $expected = (string) ($cfg['password'] ?? '');
    $ok = $hash !== '' ? password_verify($password, $hash) : ($expected !== '' && hash_equals($expected, $password));
    if (!$ok) {
        return false;
    }
    session_regenerate_id(true);
    $_SESSION['auth'] = true;
    $_SESSION['auth_until'] = time() + DASH_SESSION_TTL;
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return true;
}

function dash_logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 3600, 'path' => $p['path'], 'secure' => true,
            'httponly' => true, 'samesite' => 'Strict',
        ]);
    }
    session_destroy();
}

/* ---------- защита от перебора пароля (как rate limit в send.php) ---------- */

/** Публичный IP или '' (IPv4, записанный как IPv6 «::ffff:1.2.3.4», приводим к IPv4). */
function dash_public_ip(string $ip): string {
    $ip = trim($ip);
    if (stripos($ip, '::ffff:') === 0 && filter_var(substr($ip, 7), FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $ip = substr($ip, 7);
    }
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false ? $ip : '';
}

/**
 * Реальный IP клиента (та же логика, что в send.php): публичный REMOTE_ADDR — ему и верим;
 * иначе (прокси хостинга) — X-Forwarded-For справа налево: прокси дописывает адрес клиента
 * в конец, а начало цепочки может подставить сам клиент.
 */
function dash_client_ip(): string {
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if (($ip = dash_public_ip($remote)) !== '') {
        return $ip;
    }
    foreach (array_reverse(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))) as $part) {
        if (($ip = dash_public_ip($part)) !== '') {
            return $ip;
        }
    }
    return $remote !== '' ? $remote : 'unknown';
}

/**
 * Папка состояния (счётчики входа, кеш Метрики): рядом с dash_config.php, выше веб-корня —
 * она только наша. Если её не создать — системная временная папка, как раньше. null — негде хранить.
 */
function dash_tmp_dir(string $name): ?string {
    $base = dash_config_dir();
    foreach ([$base !== '' ? $base . '/tn_state/' . $name : '', sys_get_temp_dir() . '/' . $name] as $dir) {
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

/** Удалить файлы старше $maxAge секунд (счётчики входа, ключи кеша — чтобы папка не росла). */
function dash_state_gc(string $dir, string $pattern, int $maxAge): void {
    foreach (glob($dir . '/' . $pattern) ?: [] as $f) {
        if ((int) @filemtime($f) < time() - $maxAge) {
            @unlink($f);
        }
    }
}

/**
 * Счётчик событий в файле: под одной блокировкой читаем отметки времени за окно,
 * $fn решает и возвращает [новый список, результат]. null — файл не открыть.
 */
function dash_counter(string $file, int $window, callable $fn) {
    $fp = @fopen($file, 'c+');
    if ($fp === false) {
        return null;
    }
    $res = null;
    if (flock($fp, LOCK_EX)) {
        $now = time();
        $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
        $hits = is_array($hits) ? array_values(array_filter($hits, static fn ($t) => is_int($t) && ($now - $t) < $window)) : [];
        [$hits, $res] = $fn($hits, $now);
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode(array_values($hits)));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $res;
}

/**
 * Можно ли проверять пароль. Попытка записывается ДО проверки, под той же блокировкой,
 * что и проверка лимита: параллельные запросы не проскочат между «проверили» и «записали».
 * Лимиты: DASH_LOGIN_MAX попыток за 15 минут с одного IP и DASH_LOGIN_GLOBAL_MAX проверок
 * в час на весь дашборд (перебор с многих адресов). Удачный вход сбрасывает счётчик IP.
 * Возвращает [ждать минут (0 — можно; -1 — негде вести счётчик, вход закрыт), сколько попыток останется].
 */
function dash_login_begin(string $ip): array {
    $dir = dash_tmp_dir('tn_dash_login');
    if ($dir === null) {
        return [-1, 0];
    }
    if (mt_rand(1, 20) === 1) {
        dash_state_gc($dir, '*.json', 86400);
    }
    $wait = static fn (array $hits, int $now, int $window): int => max(1, (int) ceil((min($hits) + $window - $now) / 60));
    $ipRes = dash_counter($dir . '/' . sha1($ip) . '.json', DASH_LOGIN_WINDOW, static function (array $hits, int $now) use ($wait) {
        if (count($hits) >= DASH_LOGIN_MAX) {
            return [$hits, [$wait($hits, $now, DASH_LOGIN_WINDOW), 0]];
        }
        $hits[] = $now;
        return [$hits, [0, DASH_LOGIN_MAX - count($hits)]];
    });
    if ($ipRes === null) {
        return [-1, 0];
    }
    if ($ipRes[0] > 0) {
        return $ipRes;
    }
    $allWait = dash_counter($dir . '/_all.json', DASH_LOGIN_GLOBAL_WINDOW, static function (array $hits, int $now) use ($wait) {
        if (count($hits) >= DASH_LOGIN_GLOBAL_MAX) {
            return [$hits, $wait($hits, $now, DASH_LOGIN_GLOBAL_WINDOW)];
        }
        $hits[] = $now;
        return [$hits, 0];
    });
    if ($allWait === null) {
        return [-1, 0];
    }
    return $allWait > 0 ? [$allWait, 0] : $ipRes;
}

/** Удачный вход: прошлые неудачи этого IP забываем. */
function dash_login_success(string $ip): void {
    $dir = dash_tmp_dir('tn_dash_login');
    if ($dir !== null) {
        @unlink($dir . '/' . sha1($ip) . '.json');
    }
}

/** Строковый параметр запроса (массив вместо строки — как будто параметра нет). */
function dash_param(array $in, string $key, string $default = ''): string {
    $v = $in[$key] ?? $default;
    return is_string($v) ? $v : $default;
}

/* ---------- API Яндекс.Метрики ---------- */

/** Не больше DASH_API_LIMIT запросов за 5 минут на весь сайт. */
function dash_api_budget(): void {
    $dir = dash_tmp_dir('tn_dash_cache');
    $fp = $dir ? @fopen($dir . '/_requests.json', 'c+') : false;
    if ($fp === false) {
        return;
    }
    $over = false;
    if (flock($fp, LOCK_EX)) {
        $now = time();
        $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
        $hits = is_array($hits) ? array_values(array_filter($hits, static fn ($t) => is_int($t) && ($now - $t) < 300)) : [];
        if (count($hits) >= DASH_API_LIMIT) {
            $over = true;
        } else {
            $hits[] = $now;
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($hits));
            fflush($fp);
        }
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    if ($over) {
        throw new DashError('Слишком много запросов к Метрике за 5 минут. Подождите несколько минут и обновите страницу.');
    }
}

/**
 * Один из DASH_API_SLOTS «слотов» на запрос к Метрике: все процессы сайта вместе
 * держат не больше трёх одновременных запросов. Возвращает дескриптор блокировки.
 * @return resource|null
 */
function dash_api_slot() {
    $dir = dash_tmp_dir('tn_dash_cache');
    if ($dir === null) {
        return null;
    }
    $deadline = microtime(true) + 60;
    do {
        for ($i = 0; $i < DASH_API_SLOTS; $i++) {
            $fp = @fopen($dir . '/_slot' . $i . '.lock', 'c');
            if ($fp !== false && flock($fp, LOCK_EX | LOCK_NB)) {
                return $fp;
            }
            if ($fp !== false) {
                fclose($fp);
            }
        }
        usleep(150000);
    } while (microtime(true) < $deadline);
    return null; // не дождались — идём без слота, чтобы не зависнуть совсем
}

/** @param resource|null $fp */
function dash_api_slot_release($fp): void {
    if ($fp) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

/** Ответ из кеша: [данные, время] или null. Закешированная ошибка — DashError. */
function dash_cache_read(string $file): ?array {
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    if (!is_array($data)) {
        return null;
    }
    $age = time() - (int) filemtime($file);
    if (isset($data['__dash_error'])) {
        if ($age < DASH_ERROR_TTL) {
            throw new DashError((string) $data['__dash_error']);
        }
        return null;
    }
    return $age < DASH_CACHE_TTL ? [$data, (int) filemtime($file)] : null;
}

/**
 * GET к API Метрики с кешем на DASH_CACHE_TTL. Ошибки — DashError с понятным текстом.
 * Одинаковый запрос из нескольких блоков одновременно уходит в Метрику один раз:
 * остальные ждут на блокировке ключа и берут ответ из кеша.
 * $quiet — не писать в лог ответ «ошибка в запросе» (например, Директ не привязан).
 * Возвращает [декодированный ответ, время получения (unix)].
 */
function metrika_get(array $cfg, string $path, array $params, bool $quiet = false): array {
    // api_base — только для проверки на стенде и только локальный адрес: токен не уйдёт на чужой сервер
    $base = DASH_API_BASE;
    if (preg_match('~^http://(127\.0\.0\.1|localhost)(:\d+)?$~', rtrim((string) ($cfg['api_base'] ?? ''), '/'))) {
        $base = rtrim((string) $cfg['api_base'], '/');
    }
    $url = $base . $path . ($params ? '?' . http_build_query($params) : '');
    $dir = dash_tmp_dir('tn_dash_cache');
    if ($dir !== null && mt_rand(1, 100) === 1) {
        dash_state_gc($dir, '[0-9a-f]*.json', 86400);
        dash_state_gc($dir, '[0-9a-f]*.lock', 86400);
    }
    $key = sha1($url);
    $cacheFile = $dir ? $dir . '/' . $key . '.json' : null;

    if ($cacheFile && ($hit = dash_cache_read($cacheFile))) {
        return $hit;
    }
    $keyLock = $dir ? @fopen($dir . '/' . $key . '.lock', 'c') : false;
    if ($keyLock) {
        flock($keyLock, LOCK_EX);
    }
    try {
        // пока ждали блокировку, ответ мог положить в кеш соседний процесс
        if ($cacheFile && ($hit = dash_cache_read($cacheFile))) {
            return $hit;
        }
        dash_api_budget();
        $slot = dash_api_slot();
        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_HTTPHEADER     => ['Authorization: OAuth ' . (string) ($cfg['metrika_token'] ?? ''), 'Accept: application/json'],
            ]);
            $body = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
        } finally {
            dash_api_slot_release($slot);
        }

        if ($body === false) {
            error_log('TeachNet dash: нет связи с Метрикой — ' . $err);
            throw new DashError('Нет связи с API Метрики. Проверьте интернет на сервере и обновите страницу позже.');
        }
        $data = json_decode((string) $body, true);
        if ($code === 401) {
            throw new DashError('Токен Метрики недействителен или истёк. Получите новый токен и замените metrika_token в dash_config.php.');
        }
        if ($code === 403) {
            throw new DashError('У токена нет доступа к счётчику ' . (int) ($cfg['counter_id'] ?? 0) . '. Получите токен от аккаунта с доступом к счётчику.');
        }
        if ($code === 429) {
            throw new DashError('Метрика временно ограничила число запросов. Подождите несколько минут и нажмите «Обновить».');
        }
        if ($code >= 500) {
            throw new DashError('API Метрики временно недоступно (ошибка ' . $code . '). Попробуйте позже.');
        }
        if ($code !== 200 || !is_array($data)) {
            $msg = is_array($data) && isset($data['message']) ? (string) $data['message'] : 'код ' . $code;
            if (!$quiet) {
                error_log('TeachNet dash: ошибка Метрики ' . $code . ' — ' . $msg . ' — ' . $path);
            }
            $text = 'Метрика вернула ошибку: ' . $msg;
            if ($cacheFile && $code >= 400 && $code < 500) {
                @file_put_contents($cacheFile, json_encode(['__dash_error' => $text], JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
            throw new DashError($text);
        }
        if ($cacheFile) {
            @file_put_contents($cacheFile, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
        }
        return [$data, time()];
    } finally {
        if ($keyLock) {
            flock($keyLock, LOCK_UN);
            fclose($keyLock);
        }
    }
}

/** Сбросить кеш ответов Метрики (кнопка «Обновить»); не чаще раза в минуту. */
function dash_clear_cache(): bool {
    $dir = dash_tmp_dir('tn_dash_cache');
    if ($dir === null) {
        return true;
    }
    $stamp = $dir . '/_last_refresh';
    if (is_file($stamp) && (time() - filemtime($stamp)) < DASH_REFRESH_MIN) {
        return false;
    }
    foreach (glob($dir . '/*.json') ?: [] as $f) {
        if (basename($f) !== '_requests.json') {
            @unlink($f);
        }
    }
    @touch($stamp);
    return true;
}

/* ---------- база заявок ---------- */

function dash_db(?array $sendCfg): PDO {
    if (!$sendCfg) {
        throw new DashError('Не найден send_config.php — нет доступа к базе заявок.');
    }
    try {
        if (strpos((string) ($sendCfg['db_dsn'] ?? ''), 'sqlite:') === 0) { // только для проверки на стенде (SQLite)
            $pdo = new PDO((string) $sendCfg['db_dsn']);
        } else {
            if (empty($sendCfg['db_name']) || empty($sendCfg['db_user'])) {
                throw new DashError('В send_config.php не заданы db_name / db_user.');
            }
            $dsn = 'mysql:host=' . ($sendCfg['db_host'] ?? 'localhost') . ';dbname=' . $sendCfg['db_name'] . ';charset=utf8mb4';
            $pdo = new PDO($dsn, (string) $sendCfg['db_user'], (string) ($sendCfg['db_pass'] ?? ''), [PDO::ATTR_TIMEOUT => 5]);
            $pdo->exec("SET time_zone = '+03:00'"); // created_at в московском времени
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (DashError $e) {
        throw $e;
    } catch (Throwable $e) {
        error_log('TeachNet dash: БД — ' . $e->getMessage());
        throw new DashError('Нет доступа к базе заявок. Проверьте db_* в send_config.php.');
    }
}

/**
 * Что уже есть в базе: колонки leads и таблицы lead_status_log / ad_spend.
 * Дашборд работает и до выполнения SQL: блоки без нужных колонок просят выполнить SQL.
 */
function dash_schema(PDO $pdo): array {
    $cols = [];
    try {
        $st = $pdo->query('SELECT * FROM leads LIMIT 1');
        for ($i = 0, $n = $st->columnCount(); $i < $n; $i++) {
            $meta = $st->getColumnMeta($i);
            if (!empty($meta['name'])) {
                $cols[(string) $meta['name']] = true;
            }
        }
    } catch (Throwable $e) {
        error_log('TeachNet dash: структура leads — ' . $e->getMessage());
        throw new DashError('Не удалось прочитать таблицу заявок leads.');
    }
    $table = static function (string $name) use ($pdo): bool {
        try {
            $pdo->query('SELECT 1 FROM ' . $name . ' LIMIT 1');
            return true;
        } catch (Throwable $e) {
            return false;
        }
    };
    $statusCols = ['status', 'contacted_at', 'trial_at', 'attended', 'paid_at', 'paid_amount', 'lost_reason', 'note', 'status_updated_at'];
    return [
        'cols'    => $cols,
        'status'  => count(array_intersect_key(array_flip($statusCols), $cols)) === count($statusCols),
        'channel' => isset($cols['channel']),
        'manual'  => isset($cols['is_manual']),
        'branch'  => isset($cols['branch']),
        'log'     => $table('lead_status_log'),
        'spend'   => $table('ad_spend'),
    ];
}

/** Текст для блоков, которым нужны новые колонки или таблицы. */
const DASH_NEED_SQL = 'Выполните SQL из инструкции (шаги 1–4), чтобы включить этот блок.';

/* ---------- словари: страницы, филиалы, статусы, каналы ---------- */

/** Заявки не про обучение (заказ плат с /tech, source=tech) — в аналитику школы не попадают. */
const DASH_EXCLUDED_SQL = "(source IS NULL OR source <> 'tech')";

/** source заявки → курс / страница. */
const DASH_SOURCES = [
    'website'           => 'Главная',
    'electronics'       => 'Электроника',
    'child-masterclass' => 'Мастер-класс',
    'links'             => 'Визитка /links',
];

const DASH_BRANCHES = [
    'pavlyukhina' => 'Павлюхина',
    'mardzhani'   => 'Марджани',
];

/** Статусы заявки по порядку воронки. rank — до какого шага дошла заявка. */
const DASH_STATUSES = [
    'new'       => ['label' => 'Новая', 'rank' => 0],
    'contacted' => ['label' => 'Связались', 'rank' => 1],
    'trial'     => ['label' => 'Записан на пробное', 'rank' => 2],
    'attended'  => ['label' => 'Пришёл на пробное', 'rank' => 3],
    'paid'      => ['label' => 'Оплатил', 'rank' => 4],
    'lost'      => ['label' => 'Отказ', 'rank' => -1],
    'junk'      => ['label' => 'Нецелевая', 'rank' => -1],
    'archive'   => ['label' => 'Архив', 'rank' => -1],
];

const DASH_LOST_REASONS = [
    'no_answer'    => 'Не дозвонились',
    'expensive'    => 'Дорого',
    'far'          => 'Далеко',
    'schedule'     => 'Неудобное время',
    'age'          => 'Возраст не подходит',
    'changed_mind' => 'Передумал',
    'other'        => 'Другое',
];

/** Каналы: ключ хранится в базе (leads.channel, ad_spend.channel), подпись — для людей. */
const DASH_CHANNELS = [
    'direct'    => 'Яндекс Директ',
    'search'    => 'Поиск (SEO)',
    'maps'      => 'Карты и справочники',
    'social'    => 'Соцсети (VK, Telegram)',
    'messenger' => 'Мессенджеры',
    'referral'  => 'Сайты-ссылки (СМИ, партнёры)',
    'none'      => 'Прямые заходы',
    'other'     => 'Другое',
];

/**
 * Словарь определения канала — один на заявки из базы и визиты из Метрики.
 * Правила проверяются сверху вниз, первое подошедшее побеждает.
 */
const DASH_CHANNEL_RULES = [
    // 1. Яндекс Бизнес, 2ГИС и другие справочники: utm_medium=business (utm_campaign — площадка)
    'utm_medium' => ['business' => 'maps'],
    // 2. utm_source → канал (после проверки yclid: есть yclid → Директ)
    'utm_source' => [
        'yandex' => 'direct', 'yandex_direct' => 'direct', 'ydirect' => 'direct', 'direct' => 'direct',
        'yandex_maps' => 'maps', '2gis' => 'maps', 'google_maps' => 'maps',
        'vk' => 'social', 'vkads' => 'social', 'vk_ads' => 'social', 'vkontakte' => 'social', 'mytarget' => 'social',
        'telegram' => 'social', 'tg' => 'social', 'ok' => 'social', 'instagram' => 'social',
        'whatsapp' => 'messenger', 'max' => 'messenger', 'viber' => 'messenger',
    ],
    // 3. адрес, с которого пришли (без меток); * — любой домен верхнего уровня
    'referrer' => [
        'maps'      => ['2gis.*', 'maps.yandex.*', 'yandex.*/maps', 'google.*/maps', 'maps.google.*'],
        'search'    => ['yandex.*', 'ya.ru', 'google.*', 'bing.com', 'go.mail.ru', 'duckduckgo.com', 'nova.rambler.ru', 'search.yahoo.com'],
        'social'    => ['vk.com', 'vk.ru', 'm.vk.com', 'away.vk.com', 't.me', 'ok.ru', 'instagram.com', 'facebook.com', 'dzen.ru'],
        'messenger' => ['wa.me', 'web.whatsapp.com', 'max.ru', 'web.max.ru', 'web.telegram.org'],
    ],
];

/** Хост и путь адреса без www: ['yandex.ru', '/maps/…']. Принимает и «голый» хост. */
function dash_url_parts(string $url): array {
    $url = trim($url);
    if ($url === '') {
        return ['', ''];
    }
    if (!preg_match('~^[a-z][a-z0-9+.-]*://~i', $url)) {
        $url = 'https://' . $url;
    }
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    $host = preg_replace('/^www\./', '', $host) ?? $host;
    return [$host, (string) parse_url($url, PHP_URL_PATH)];
}

// Подходит ли адрес под маску словаря: «yandex.*», «yandex.* + путь /maps», «t.me».
function dash_host_match(string $host, string $path, string $mask): bool {
    [$mHost, $mPath] = array_pad(explode('/', $mask, 2), 2, '');
    $re = '~(^|\.)' . str_replace(['\.', '\*'], ['\.', '[a-z.]+'], preg_quote($mHost, '~')) . '$~';
    if (!preg_match($re, $host)) {
        return false;
    }
    return $mPath === '' || strpos(strtolower($path), '/' . strtolower($mPath)) === 0;
}

/** Канал по адресу, с которого пришли (без меток). $ownHost — свой сайт → прямой заход. */
function dash_channel_by_referrer(string $referrer, string $ownHost = ''): string {
    [$host, $path] = dash_url_parts($referrer);
    if ($host === '' || ($ownHost !== '' && ($host === $ownHost || substr($host, -strlen('.' . $ownHost)) === '.' . $ownHost))) {
        return 'none';
    }
    foreach (DASH_CHANNEL_RULES['referrer'] as $channel => $masks) {
        foreach ($masks as $mask) {
            if (dash_host_match($host, $path, $mask)) {
                return $channel;
            }
        }
    }
    return 'referral';
}

/** Канал заявки из базы по её полям (см. DASH_CHANNEL_RULES). */
function dash_channel_for_lead(array $lead, string $ownHost = ''): string {
    $medium = strtolower(trim((string) ($lead['utm_medium'] ?? '')));
    $source = strtolower(trim((string) ($lead['utm_source'] ?? '')));
    if ($medium !== '' && isset(DASH_CHANNEL_RULES['utm_medium'][$medium])) {
        return DASH_CHANNEL_RULES['utm_medium'][$medium];
    }
    if (trim((string) ($lead['yclid'] ?? '')) !== '') {
        return 'direct';
    }
    if ($source !== '') {
        return DASH_CHANNEL_RULES['utm_source'][$source] ?? 'other';
    }
    return dash_channel_by_referrer((string) ($lead['referrer'] ?? ''), $ownHost);
}

/**
 * Канал визита из Метрики: метки — по тому же словарю, без меток — по типу
 * источника Метрики (ym:s:lastsignTrafficSource) и детальному источнику.
 */
function dash_channel_for_visit(string $trafficId, string $engine, string $utmSource, string $utmMedium): string {
    $medium = strtolower(trim($utmMedium));
    $source = strtolower(trim($utmSource));
    if ($medium !== '' && isset(DASH_CHANNEL_RULES['utm_medium'][$medium])) {
        return DASH_CHANNEL_RULES['utm_medium'][$medium];
    }
    if ($source !== '') {
        return DASH_CHANNEL_RULES['utm_source'][$source] ?? 'other';
    }
    switch ($trafficId) {
        case 'ad':
            return mb_stripos($engine, 'директ') !== false || stripos($engine, 'direct') !== false ? 'direct' : 'other';
        case 'organic':
            return 'search';
        case 'social':
            return 'social';
        case 'messenger':
            return 'messenger';
        case 'referral':
            $ch = dash_channel_by_referrer($engine);
            return in_array($ch, ['maps', 'social', 'messenger', 'search'], true) ? $ch : 'referral';
        case 'direct':
        case 'internal':
        case 'saved':
            return 'none';
        default:
            return 'other';
    }
}

/** Телефон под маской: +7 (9**) ***-**-67. */
function dash_mask_phone(string $phone): string {
    $d = preg_replace('/\D/', '', $phone) ?? '';
    if (strlen($d) === 11) {
        return '+7 (' . $d[1] . '**) ***-**-' . substr($d, 9);
    }
    return $d !== '' ? '***' . substr($d, -2) : '';
}

/** Минуты рабочего времени (10:00–21:00 МСК) между двумя моментами. */
function dash_work_minutes(DateTimeImmutable $from, DateTimeImmutable $to): int {
    if ($to <= $from) {
        return 0;
    }
    $total = 0;
    $day = $from->setTime(0, 0);
    while ($day <= $to) {
        $open = $day->setTime(10, 0);
        $close = $day->setTime(21, 0);
        $a = max($open, $from);
        $b = min($close, $to);
        if ($b > $a) {
            $total += intdiv($b->getTimestamp() - $a->getTimestamp(), 60);
        }
        $day = $day->modify('+1 day');
        if ($total > 100000) {
            break;
        }
    }
    return $total;
}
