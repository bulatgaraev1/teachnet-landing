<?php
/**
 * TeachNet — закрытый дашборд /dash: общие функции (конфиг, сессия, вход,
 * клиент API Яндекс.Метрики с кешем, база заявок). Подключается из index.php и api.php.
 *
 * Секреты — ТОЛЬКО на сервере, выше веб-корня (рядом с send_config.php):
 *   dash_config.php:  <?php return ['metrika_token' => '...', 'counter_id' => 96429194, 'password' => '...'];
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
const DASH_REFRESH_MIN    = 60;   // «Обновить» не чаще раза в минуту
const DASH_LOGIN_MAX      = 5;    // неверных попыток входа…
const DASH_LOGIN_WINDOW   = 900;  // …за 15 минут с одного IP
const DASH_SESSION_TTL    = 43200; // сессия живёт 12 часов
const DASH_API_LIMIT      = 180;  // запросов к Метрике за 5 минут (лимит Метрики — 200)
const DASH_API_BASE       = 'https://api-metrika.yandex.net';

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
        return $cfg;
    }
    return null;
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
    $expected = (string) ($cfg['password'] ?? '');
    if ($expected === '' || !hash_equals($expected, $password)) {
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

/** Реальный IP клиента (та же логика, что в send.php). */
function dash_client_ip(): string {
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (filter_var($remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
        return $remote;
    }
    foreach (explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '') as $part) {
        $ip = trim($part);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
            return $ip;
        }
    }
    return $remote !== '' ? $remote : 'unknown';
}

function dash_tmp_dir(string $name): ?string {
    $dir = sys_get_temp_dir() . '/' . $name;
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return is_dir($dir) && is_writable($dir) ? $dir : null;
}

/**
 * Неверные попытки входа с IP за окно. $add = true — записать ещё одну неудачу.
 * Возвращает число неудач за последние 15 минут.
 */
function dash_login_failures(string $ip, bool $add = false): int {
    $dir = dash_tmp_dir('tn_dash_login');
    if ($dir === null) {
        return 0;
    }
    $fp = @fopen($dir . '/' . sha1($ip) . '.json', 'c+');
    if ($fp === false) {
        return 0;
    }
    $now = time();
    $hits = [];
    if (flock($fp, LOCK_EX)) {
        $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
        $hits = is_array($hits) ? $hits : [];
        $hits = array_values(array_filter($hits, static fn ($t) => is_int($t) && ($now - $t) < DASH_LOGIN_WINDOW));
        if ($add) {
            $hits[] = $now;
        }
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($hits));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return count($hits);
}

/** Сколько минут ждать до снятия блокировки (по самой старой неудаче в окне). */
function dash_login_wait_minutes(string $ip): int {
    $dir = dash_tmp_dir('tn_dash_login');
    $hits = $dir ? json_decode((string) @file_get_contents($dir . '/' . sha1($ip) . '.json'), true) : [];
    $hits = is_array($hits) ? array_filter($hits, 'is_int') : [];
    if (!$hits) {
        return 0;
    }
    return max(1, (int) ceil((min($hits) + DASH_LOGIN_WINDOW - time()) / 60));
}

/* ---------- API Яндекс.Метрики ---------- */

/** Не больше DASH_API_LIMIT запросов за 5 минут (запросы идут последовательно, по одному). */
function dash_api_budget(): void {
    $dir = dash_tmp_dir('tn_dash_cache');
    if ($dir === null) {
        return;
    }
    $file = $dir . '/_requests.json';
    $now = time();
    $hits = json_decode((string) @file_get_contents($file), true);
    $hits = is_array($hits) ? array_values(array_filter($hits, static fn ($t) => is_int($t) && ($now - $t) < 300)) : [];
    if (count($hits) >= DASH_API_LIMIT) {
        throw new DashError('Слишком много запросов к Метрике за 5 минут. Подождите несколько минут и обновите страницу.');
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

/**
 * GET к API Метрики с кешем на DASH_CACHE_TTL. Ошибки — DashError с понятным текстом.
 * Возвращает [декодированный ответ, время получения (unix)].
 */
function metrika_get(array $cfg, string $path, array $params): array {
    $base = rtrim((string) ($cfg['api_base'] ?? DASH_API_BASE), '/'); // api_base — только для проверки на стенде
    $url = $base . $path . ($params ? '?' . http_build_query($params) : '');
    $dir = dash_tmp_dir('tn_dash_cache');
    $cacheFile = $dir ? $dir . '/' . sha1($url) . '.json' : null;

    if ($cacheFile && is_file($cacheFile) && (time() - filemtime($cacheFile)) < DASH_CACHE_TTL) {
        $data = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($data)) {
            return [$data, filemtime($cacheFile)];
        }
    }

    dash_api_budget();
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
        error_log('TeachNet dash: ошибка Метрики ' . $code . ' — ' . $msg . ' — ' . $path);
        throw new DashError('Метрика вернула ошибку: ' . $msg);
    }
    if ($cacheFile) {
        @file_put_contents($cacheFile, json_encode($data), LOCK_EX);
    }
    return [$data, time()];
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
        if (!empty($sendCfg['db_dsn'])) { // только для проверки на стенде
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
