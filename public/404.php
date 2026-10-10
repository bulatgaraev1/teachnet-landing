<?php
/**
 * Страница «не найдено» (ErrorDocument 404 и 403 в .htaccess): каждый раз — случайный из шести вариантов.
 * Варианты — обычные HTML-файлы, витрина со всеми — /404-variants/. Если какого-то файла нет,
 * показывается основной /404.html. Адрес в строке браузера и код ответа (404/403) сохраняются.
 * Ничего не пишет и не читает из запроса, кроме кода исходной ошибки.
 */
declare(strict_types=1);

$variants = [
    '404.html',                    // «Космос»
    '404-variants/invaders.html',  // «Захватчики 404»
    '404-variants/circuit.html',   // «Обрыв цепи»
    '404-variants/lego.html',      // «Конструктор»
    '404-variants/terminal.html',  // «Терминал Тича»
    '404-variants/orbit.html',     // «Гравитационная праща»
];

$file = __DIR__ . '/' . $variants[random_int(0, count($variants) - 1)];
if (!is_file($file)) {
    $file = __DIR__ . '/404.html';
}

// закрытые файлы отдают 403 (как и раньше со статичной 404.html), всё остальное — 404
$status = (string) ($_SERVER['REDIRECT_STATUS'] ?? '') === '403' ? 403 : 404;
http_response_code($status);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
readfile($file);
