<?php
/**
 * TeachNet — JSON для дашборда /dash (только для вошедших).
 *   GET  api.php?block=<имя>&period=7|30|90|today|custom&from&to&compare&branch&group&…  — один блок
 *   POST api.php?action=refresh | phone | lead_update | lead_add | spend_add | spend_update | spend_delete
 *        (заголовок X-CSRF-Token) — изменения
 * Метрика (счётчик из dash_config.php) + таблица leads (доступ из send_config.php).
 */
declare(strict_types=1);

// Ошибки PHP — только в лог: в ответе только наш JSON с понятным текстом.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// Буфер вывода: случайный пробел или BOM не испортит заголовки, сессию и JSON.
ob_start();

require __DIR__ . '/lib.php';
require __DIR__ . '/report.php';
require __DIR__ . '/crm.php';

dash_headers();
header('Content-Type: application/json; charset=utf-8');

/** @return never */
function out(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
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

$sendCfg = null;
$sendError = null;
try {
    $sendCfg = dash_find_config('send_config.php');
} catch (DashError $e) {
    $sendError = $e->getMessage();
}

/* ---------- изменения: только POST + CSRF ---------- */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!dash_csrf_ok($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
        out(403, ['error' => 'Сессия устарела, обновите страницу']);
    }
    session_write_close();
    $action = (string) ($_GET['action'] ?? '');
    if ($action === 'refresh') {
        $ok = dash_clear_cache();
        out(200, ['ok' => $ok, 'message' => $ok ? 'Данные обновлены' : 'Обновлять можно не чаще раза в минуту']);
    }
    $handlers = ['phone' => 'crm_phone', 'lead_update' => 'crm_lead_update', 'lead_add' => 'crm_lead_add',
        'spend_add' => 'crm_spend_add', 'spend_update' => 'crm_spend_update', 'spend_delete' => 'crm_spend_delete'];
    if (!isset($handlers[$action])) {
        out(400, ['error' => 'Неизвестное действие']);
    }
    try {
        if ($sendError !== null) {
            throw new DashError($sendError);
        }
        $pdo = dash_db($sendCfg);
        $result = $action === 'phone' ? crm_phone($pdo, $_POST) : $handlers[$action]($pdo, dash_schema($pdo), $_POST);
        out(200, $result);
    } catch (DashError $e) {
        out(422, ['error' => $e->getMessage()]);
    } catch (Throwable $e) {
        error_log('TeachNet dash: действие ' . $action . ' — ' . $e->getMessage());
        out(500, ['error' => 'Не удалось сохранить. Подробности — в логе сервера.']);
    }
}
session_write_close(); // дальше сессия не нужна — не блокируем параллельные запросы блоков

/* ---------- блоки ---------- */

@set_time_limit(120);
$block = (string) ($_GET['block'] ?? '');
$report = new DashReport($cfg, $sendCfg, $_GET, $sendError);
try {
    switch ($block) {
        case 'insights':
            $data = $report->blockInsights();
            break;
        case 'kpi':
            $data = $report->blockKpi();
            break;
        case 'funnel':
            $data = $report->blockFunnel((string) ($_GET['page'] ?? 'all'));
            break;
        case 'flow':
            $data = $report->blockFlow();
            break;
        case 'channels':
            $data = $report->blockChannels();
            break;
        case 'pages':
            $data = $report->blockPages();
            break;
        case 'behavior':
            $data = $report->blockBehavior((string) ($_GET['page'] ?? 'main'));
            break;
        case 'audience':
            $data = $report->blockAudience();
            break;
        case 'leads':
            $data = $report->blockLeads($_GET);
            break;
        case 'spend':
            $data = $report->blockSpend();
            break;
        case 'quality':
            $data = $report->blockQuality();
            break;
        default:
            out(400, ['error' => 'Неизвестный блок']);
    }
    $data['fetched_at'] = $report->fetchedAt();
    out(200, $data);
} catch (DashError $e) {
    out(200, ['error' => $e->getMessage(), 'fetched_at' => $report->fetchedAt()] + $report->meta());
} catch (Throwable $e) {
    error_log('TeachNet dash: блок ' . $block . ' — ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine());
    out(200, ['error' => 'Не удалось построить блок. Подробности — в логе сервера.'] + $report->meta());
}
