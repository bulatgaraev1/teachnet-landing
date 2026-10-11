<?php
/**
 * Заглушка Telegram Bot API для стенда: php -S 127.0.0.1:8097 tests/pcb/tg-mock.php
 * Пишет каждое сообщение в tg.log рядом с собой; файл mode: «down» — отвечать ошибкой 502 (Telegram недоступен).
 * В send_config.php стенда: 'tg_api' => 'http://127.0.0.1:8097' (lead.php принимает только локальный адрес).
 */
$dir = getenv('TG_MOCK_DIR') ?: __DIR__;
$mode = trim((string) @file_get_contents($dir . '/mode'));
file_put_contents($dir . '/tg.log', '=== ' . date('H:i:s') . ' ' . $_SERVER['REQUEST_URI'] . "\n" . ($_POST['text'] ?? '') . "\n", FILE_APPEND);
header('Content-Type: application/json');
if ($mode === 'down') {
    http_response_code(502);
    echo '{"ok":false}';
    exit;
}
echo '{"ok":true}';
