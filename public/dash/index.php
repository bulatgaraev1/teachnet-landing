<?php
/**
 * TeachNet — закрытый дашборд аналитики /dash: вход по паролю и каркас страницы.
 * Данные страница берёт из api.php (только для вошедших), графики и логика — dash.js / charts.js,
 * стили — dash.css (свои файлы, без встроенных скриптов и CDN; CSP не ослабляется).
 * Секреты — в dash_config.php выше веб-корня (см. lib.php). Не индексируется.
 */
declare(strict_types=1);

// Ошибки PHP — только в лог: на странице пользователь видит только наши понятные сообщения.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// Буфер вывода: случайный пробел или BOM не помешает старту сессии и отправке заголовков.
ob_start();

require __DIR__ . '/lib.php';

dash_headers();
header('Content-Type: text/html; charset=utf-8');

function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Ссылка на свой файл с версией по дате изменения (сброс кеша браузера после деплоя). */
function asset(string $file): string {
    $t = @filemtime(__DIR__ . '/' . $file);
    return $file . '?v=' . ($t ?: '1');
}

function page_head(string $title, string $csrf = ''): void {
    ?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<?php if ($csrf !== ''): ?><meta name="csrf-token" content="<?= h($csrf) ?>">
<?php endif; ?>
<title><?= h($title) ?></title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="<?= h(asset('dash.css')) ?>">
</head>
<body>
<?php
}

/** Страница с одним сообщением (нет конфига и т. п.). */
function page_message(string $title, string $text): void {
    page_head('TEACHNET · аналитика');
    ?>
<main class="login">
  <div class="card">
    <h1><?= h($title) ?></h1>
    <p class="muted"><?= h($text) ?></p>
  </div>
</main>
</body></html>
<?php
}

try {
    $cfg = dash_find_config('dash_config.php');
} catch (DashError $e) {
    page_message('Ошибка в dash_config.php', $e->getMessage());
    exit;
}
if (!$cfg) {
    page_message('Не найден dash_config.php', 'Положите файл dash_config.php на сервер рядом с send_config.php, выше папки сайта. Шаблон — в описании дашборда.');
    exit;
}
if ((string) ($cfg['password'] ?? '') === '' && (string) ($cfg['password_hash'] ?? '') === '') {
    page_message('Не задан пароль', 'В dash_config.php не заполнено поле password (или password_hash).');
    exit;
}

dash_session_start();
$ip = dash_client_ip();
$error = '';
$action = dash_param($_POST, 'action');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!dash_csrf_ok(dash_param($_POST, 'csrf'))) {
        // нет cookie сессии — обычно страница открыта по http (cookie Secure) или cookie запрещены
        $error = empty($_COOKIE[session_name()])
            ? 'Браузер не сохранил cookie входа. Откройте страницу по адресу https://… и разрешите cookie.'
            : 'Страница устарела. Попробуйте ещё раз.';
    } elseif ($action === 'logout') {
        dash_logout();
        header('Location: ./', true, 303);
        exit;
    } elseif ($action === 'login') {
        // попытка записывается до проверки пароля (см. dash_login_begin)
        [$wait, $left] = dash_login_begin($ip);
        if ($wait === -1) {
            $error = 'Вход временно недоступен: на сервере нет папки для счётчика попыток. Сообщите разработчику.';
        } elseif ($wait > 0) {
            $error = 'Слишком много попыток входа. Попробуйте через ' . $wait . ' мин.';
        } elseif (dash_login(dash_param($_POST, 'password'), $cfg)) {
            dash_login_success($ip);
            header('Location: ./', true, 303);
            exit;
        } else {
            $error = $left > 0
                ? 'Неверный пароль. Осталось попыток: ' . $left . '.'
                : 'Неверный пароль. Попытки закончились — вход закрыт на ' . intdiv(DASH_LOGIN_WINDOW, 60) . ' мин.';
        }
    }
}

if (!dash_logged_in()) {
    page_head('Вход · TEACHNET аналитика');
    ?>
<main class="login">
  <form class="card" method="post" action="./" autocomplete="off">
    <img src="/images/logo-dark.svg" width="121" height="38" alt="TEACHNET">
    <h1>Аналитика сайта</h1>
    <p class="muted small" style="margin:0 0 16px">Закрытый раздел. Вход только по https.</p>
    <?php if ($error !== ''): ?><div class="err" role="alert"><?= h($error) ?></div><?php endif; ?>
    <label for="pw" class="lbl">Пароль</label>
    <input id="pw" class="field" name="password" type="password" required autofocus autocomplete="current-password">
    <input type="hidden" name="action" value="login">
    <input type="hidden" name="csrf" value="<?= h((string) $_SESSION['csrf']) ?>">
    <button class="btn" type="submit">Войти</button>
  </form>
</main>
</body></html>
<?php
    exit;
}

$csrf = (string) $_SESSION['csrf'];
page_head('TEACHNET · аналитика продаж', $csrf);
/** Каркас блока: заголовок-вопрос, строка «как читать», место под данные. */
function block(string $id, string $title, string $how, string $tools = '', int $h = 180): void {
    ?>
  <section class="block" id="<?= h($id) ?>" aria-labelledby="<?= h($id) ?>-h" data-block="<?= h($id) ?>">
    <div class="block__head">
      <div>
        <h2 id="<?= h($id) ?>-h"><?= h($title) ?></h2>
        <p class="block__how"><?= h($how) ?></p>
      </div>
      <?= $tools ?>
    </div>
    <div class="block__body" aria-live="polite"><div class="skeleton" style="--h:<?= $h ?>px"></div></div>
  </section>
<?php
}
?>
<header class="top">
  <div class="wrap">
    <img src="/images/logo-dark.svg" width="104" height="33" alt="TEACHNET">
    <h1>Аналитика продаж</h1>
    <span class="top__stamp" id="stamp" aria-live="polite">Загружаем данные…</span>
    <button class="btn btn--ghost btn--small" id="refresh" type="button" title="Заново получить данные из Метрики (не чаще раза в минуту)">Обновить</button>
    <form method="post" action="./" style="margin:0">
      <input type="hidden" name="action" value="logout">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <button class="btn btn--ghost btn--small" type="submit">Выйти</button>
    </form>
  </div>
</header>

<div class="filters" role="region" aria-label="Фильтры: действуют на все блоки">
  <div class="wrap">
    <div class="seg" role="group" aria-label="Период" id="f-period">
      <button type="button" data-period="today">Сегодня</button>
      <button type="button" data-period="7">7 дней</button>
      <button type="button" data-period="30">30 дней</button>
      <button type="button" data-period="90">90 дней</button>
      <button type="button" data-period="custom" aria-controls="f-range">Свой период</button>
    </div>
    <div class="custom-range" id="f-range">
      <label class="sr-only" for="f-from">С даты</label><input class="field" type="date" id="f-from">
      <span class="muted">—</span>
      <label class="sr-only" for="f-to">По дату</label><input class="field" type="date" id="f-to">
      <button class="btn btn--small" type="button" id="f-apply">Показать</button>
    </div>
    <label class="switch"><input type="checkbox" id="f-compare" checked> Сравнить с прошлым периодом</label>
    <label class="sr-only" for="f-branch">Филиал</label>
    <select class="field" id="f-branch" title="Филиал влияет на блоки из базы заявок">
      <option value="all">Все филиалы</option>
      <?php foreach (DASH_BRANCHES as $k => $v): ?><option value="<?= h($k) ?>"><?= h($v) ?></option><?php endforeach; ?>
    </select>
    <div class="seg" role="group" aria-label="Группировка графиков" id="f-group">
      <button type="button" data-group="day">Дни</button>
      <button type="button" data-group="week">Недели</button>
    </div>
  </div>
</div>

<main class="dash wrap" id="dash">
<?php
block('insights', 'Что важно знать сейчас?', 'Сначала тревоги — то, что требует действия сегодня. Ниже — главные выводы за период.', '', 120);
block('kpi', 'Как идут дела?', 'Главные цифры за период. Стрелка — изменение к прошлому такому же периоду; серым — мало данных для выводов.', '', 170);
block('funnel', 'Где мы теряем людей?', 'Путь от визита до оплаты. На каждом шаге — сколько дошло и какая доля от предыдущего шага. Цветом выделен шаг, где теряем больше всего.',
    '<div class="seg" role="group" aria-label="Страница" id="funnel-page"><button type="button" data-page="all">Все</button><button type="button" data-page="main">Главная</button><button type="button" data-page="electronics">Электроника</button><button type="button" data-page="child">Мастер-классы</button></div>', 220);
block('flow', 'Как меняется поток?', 'Визиты и заявки во времени. Пунктир — прошлый период, бледный столбик или точка — период ещё не закончился.', '', 320);
block('channels', 'Откуда приходят заявки и ученики?', 'Каналы по заявкам и деньгам: какой канал даёт учеников и сколько они стоят. Нажмите на строку, чтобы увидеть кампании и объявления.', '', 300);
block('pages', 'Какие страницы работают?', 'Страницы, с которых начинают знакомство с сайтом: сколько людей дочитывают до цены, нажимают «Записаться» и оставляют заявку.', '', 200);
block('behavior', 'Что люди делают на странице?', 'До какой секции дочитывают, какие кнопки нажимают и как предпочитают связаться.',
    '<div class="seg" role="group" aria-label="Страница" id="behavior-page"><button type="button" data-page="main">Главная</button><button type="button" data-page="electronics">Электроника</button></div>', 360);
block('audience', 'Кто наши посетители?', 'Устройства, города, новые и вернувшиеся посетители, и в какие часы приходят заявки.', '', 300);
block('leads', 'Что с заявками?', 'Рабочая таблица: отмечайте статус каждой заявки — из этих отметок считаются пробные, оплаты и цена ученика.', '', 360);
block('spend', 'Сколько стоит реклама?', 'Внесите расходы по месяцам — из них считаются цена заявки (CPL) и цена ученика (CAC).', '', 200);
?>
  <section class="block" id="quality" data-block="quality" aria-labelledby="quality-h">
    <details class="quality card">
      <summary>
        <div>
          <h2 id="quality-h">Можно ли доверять цифрам?</h2>
          <p class="block__how" id="quality-sum">Проверяем цели Метрики, источники заявок и токен…</p>
        </div>
        <span class="chev" aria-hidden="true">▶</span>
      </summary>
      <div class="block__body" aria-live="polite"></div>
    </details>
  </section>
  <footer class="foot">Данные Метрики обновляются раз в час, кнопка «Обновить» — не чаще раза в минуту. Время — московское.</footer>
</main>
<div class="tip" id="tip" role="status" hidden></div>
<script src="<?= h(asset('charts.js')) ?>" defer></script>
<script src="<?= h(asset('dash.js')) ?>" defer></script>
</body>
</html>
