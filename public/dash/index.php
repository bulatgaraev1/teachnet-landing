<?php
/**
 * TeachNet — закрытый дашборд аналитики /dash: вход по паролю и страница отчётов.
 * Данные страница берёт из api.php (только для вошедших). Секреты — в dash_config.php
 * выше веб-корня (см. lib.php). Не индексируется (X-Robots-Tag, meta robots, robots.txt).
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

/** Общая шапка HTML (шрифты и цвета сайта). */
function page_head(string $title): void {
    ?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= h($title) ?></title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
@font-face{font-family:'Golos Text';font-weight:400;font-display:swap;src:url('/fonts/golos-cyrillic-400.woff2') format('woff2');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:'Golos Text';font-weight:400;font-display:swap;src:url('/fonts/golos-latin-400.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+20BD}
@font-face{font-family:'Golos Text';font-weight:500;font-display:swap;src:url('/fonts/golos-cyrillic-500.woff2') format('woff2');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:'Golos Text';font-weight:500;font-display:swap;src:url('/fonts/golos-latin-500.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+20BD}
@font-face{font-family:'Onest';font-weight:600;font-display:swap;src:url('/fonts/onest-cyrillic-600.woff2') format('woff2');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:'Onest';font-weight:600;font-display:swap;src:url('/fonts/onest-latin-600.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:'Onest';font-weight:700;font-display:swap;src:url('/fonts/onest-cyrillic-700.woff2') format('woff2');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:'Onest';font-weight:700;font-display:swap;src:url('/fonts/onest-latin-700.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
:root{--brand:#316397;--action:#1055cb;--bg:#f5f8fc;--card:#fff;--text:#18222f;--soft:#5a6b80;--line:#d7e1ee;--ok:#1a7f4b;--bad:#c0392b;--shadow:0 8px 32px rgba(45,99,151,.1)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 'Golos Text',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:'Onest',system-ui,sans-serif;margin:0;line-height:1.2}
a{color:var(--action)}
button,input,select{font:inherit}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 16px;border:0;border-radius:12px;background:var(--action);color:#fff;font-weight:500;cursor:pointer}
.btn:hover{background:#0d47ad}
.btn--ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
.btn--ghost:hover{background:#eef3fa}
.btn[disabled]{opacity:.6;cursor:default}
:focus-visible{outline:2px solid var(--action);outline-offset:2px}
.card{background:var(--card);border-radius:20px;box-shadow:var(--shadow);padding:20px}
.muted{color:var(--soft)}
.small{font-size:13px}
.err{background:#fdecea;color:var(--bad);border-radius:12px;padding:12px 14px;margin:12px 0}
.note{background:#eef3fa;color:var(--soft);border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14px}
</style>
</head>
<body>
<?php
}

/** Страница с одним сообщением (нет конфига и т. п.). */
function page_message(string $title, string $text): void {
    page_head('TEACHNET · аналитика');
    ?>
<main class="wrap" style="padding-top:12vh;max-width:520px">
  <div class="card">
    <h1 style="font-size:22px;margin-bottom:10px"><?= h($title) ?></h1>
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
if ((string) ($cfg['password'] ?? '') === '') {
    page_message('Не задан пароль', 'В dash_config.php не заполнено поле password.');
    exit;
}

dash_session_start();
$ip = dash_client_ip();
$error = '';
$action = (string) ($_POST['action'] ?? '');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!dash_csrf_ok(is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : null)) {
        // нет cookie сессии — обычно страница открыта по http (cookie Secure) или cookie запрещены
        $error = empty($_COOKIE[session_name()])
            ? 'Браузер не сохранил cookie входа. Откройте страницу по адресу https://… и разрешите cookie.'
            : 'Страница устарела. Попробуйте ещё раз.';
    } elseif ($action === 'logout') {
        dash_logout();
        header('Location: ./', true, 303);
        exit;
    } elseif ($action === 'login') {
        if (dash_login_failures($ip) >= DASH_LOGIN_MAX) {
            $error = 'Слишком много неверных попыток. Попробуйте через ' . dash_login_wait_minutes($ip) . ' мин.';
        } elseif (dash_login(is_string($_POST['password'] ?? null) ? $_POST['password'] : '', $cfg)) {
            header('Location: ./', true, 303);
            exit;
        } else {
            $left = DASH_LOGIN_MAX - dash_login_failures($ip, true);
            $error = $left > 0
                ? 'Неверный пароль. Осталось попыток: ' . $left . '.'
                : 'Слишком много неверных попыток. Попробуйте через ' . dash_login_wait_minutes($ip) . ' мин.';
        }
    }
}

if (!dash_logged_in()) {
    page_head('Вход · TEACHNET аналитика');
    ?>
<main class="wrap" style="padding-top:12vh;max-width:420px">
  <form class="card" method="post" action="./" autocomplete="off">
    <img src="/images/logo-dark.svg" width="121" height="38" alt="TEACHNET" style="display:block;margin-bottom:16px">
    <h1 style="font-size:22px;margin-bottom:6px">Аналитика сайта</h1>
    <p class="muted small" style="margin:0 0 16px">Закрытый раздел. Вход только по https.</p>
    <?php if ($error !== ''): ?><div class="err" role="alert"><?= h($error) ?></div><?php endif; ?>
    <label for="pw" class="small muted">Пароль</label>
    <input id="pw" name="password" type="password" required autofocus autocomplete="current-password"
      style="display:block;width:100%;height:46px;margin:6px 0 16px;padding:0 14px;border:1px solid var(--line);border-radius:12px">
    <input type="hidden" name="action" value="login">
    <input type="hidden" name="csrf" value="<?= h((string) $_SESSION['csrf']) ?>">
    <button class="btn" type="submit" style="width:100%;height:46px">Войти</button>
  </form>
</main>
</body></html>
<?php
    exit;
}

page_head('TEACHNET · аналитика сайта');
?>
<style>
header.top{background:#fff;border-bottom:1px solid var(--line)}
@media(min-width:760px){header.top{position:sticky;top:0;z-index:5}}
header.top .wrap{display:flex;align-items:center;gap:12px;min-height:60px;flex-wrap:wrap;padding-block:8px}
header.top h1{font-size:18px;margin-right:auto}
.periods{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:18px 0 6px}
.periods .seg{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.periods .seg button{height:38px;padding:0 14px;border:0;background:none;cursor:pointer;color:var(--text)}
.periods .seg button[aria-pressed="true"]{background:var(--brand);color:#fff}
.periods input[type=date]{height:38px;padding:0 10px;border:1px solid var(--line);border-radius:12px;background:#fff}
.status{font-size:14px;color:var(--soft);margin-bottom:14px}
section.block{margin:18px 0}
section.block > h2{font-size:20px;margin:0 0 12px}
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(min-width:900px){.kpis{grid-template-columns:repeat(5,minmax(0,1fr))}}
.kpis + .card{margin-top:12px}
.kpi .label{font-size:14px;color:var(--soft)}
.kpi .value{font-family:'Onest',sans-serif;font-weight:700;font-size:28px;line-height:1.1;margin:6px 0}
.delta{font-size:13px;font-weight:500}
.delta.up{color:var(--ok)}.delta.down{color:var(--bad)}.delta.flat{color:var(--soft)}
.chart{margin-top:12px}
.chart svg{display:block;width:100%;height:auto}
.legend{display:flex;gap:16px;font-size:13px;color:var(--soft);margin-top:6px;flex-wrap:wrap}
.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.grid2{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
@media(min-width:900px){.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}}
.funnel h3{font-size:17px;margin-bottom:10px}
.step{margin:10px 0}
.step .row{display:flex;justify-content:space-between;gap:10px;font-size:15px}
.step .bar{height:10px;background:#e8eef7;border-radius:6px;overflow:hidden;margin-top:6px}
.step .bar i{display:block;height:100%;background:var(--brand);border-radius:6px}
.step details{font-size:13px;color:var(--soft);margin-top:4px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th,.tbl td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl th{font-weight:500;color:var(--soft);font-size:13px}
.tbl td.num,.tbl th.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
/* таблица заявок на телефоне — карточками: подпись поля слева, значение справа */
@media(max-width:640px){
  .tbl--stack thead{display:none}
  .tbl--stack tr{display:block;padding:10px 0;border-bottom:1px solid var(--line)}
  .tbl--stack td{display:flex;justify-content:space-between;gap:12px;border:0;padding:3px 0;text-align:right;overflow-wrap:anywhere}
  .tbl--stack td::before{content:attr(data-label);color:var(--soft);font-size:13px;text-align:left;flex:none}
}
.id{display:block;font-size:12px;color:var(--soft);font-family:ui-monospace,Menlo,Consolas,monospace}
.badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:8px;background:#fff4e5;color:#9a5b00;white-space:nowrap}
.pbar{display:inline-block;width:80px;height:8px;background:#e8eef7;border-radius:5px;overflow:hidden;vertical-align:middle;margin-right:8px}
.pbar i{display:block;height:100%;background:var(--brand)}
.phone{border:0;background:none;padding:0;color:var(--action);cursor:pointer;text-decoration:underline dotted;font:inherit;white-space:nowrap}
.nowrap{white-space:nowrap}
.loading{padding:30px 0;text-align:center;color:var(--soft)}
h3.sub{font-size:16px;margin:16px 0 8px}
</style>
<header class="top">
  <div class="wrap">
    <img src="/images/logo-dark.svg" width="104" height="33" alt="TEACHNET">
    <h1>Аналитика сайта</h1>
    <button class="btn btn--ghost" id="refresh" type="button" title="Заново получить данные из Метрики (не чаще раза в минуту)">Обновить</button>
    <form method="post" action="./" style="margin:0">
      <input type="hidden" name="action" value="logout">
      <input type="hidden" name="csrf" value="<?= h((string) $_SESSION['csrf']) ?>">
      <button class="btn btn--ghost" type="submit">Выйти</button>
    </form>
  </div>
</header>
<main class="wrap" style="padding-bottom:40px">
  <div class="periods" role="group" aria-label="Период">
    <div class="seg">
      <button type="button" data-days="7">7 дней</button>
      <button type="button" data-days="30">30 дней</button>
      <button type="button" data-days="90">90 дней</button>
    </div>
    <span class="small muted">или</span>
    <input type="date" id="from" aria-label="С даты">
    <span class="muted">—</span>
    <input type="date" id="to" aria-label="По дату">
    <button class="btn btn--ghost" id="apply" type="button">Показать</button>
  </div>
  <div class="status" id="status" aria-live="polite"></div>
  <div id="errors"></div>
  <div id="app"><div class="loading">Загружаем данные…</div></div>
</main>
<script>
(function () {
  'use strict';
  var CSRF = <?= json_encode((string) $_SESSION['csrf'], JSON_HEX_TAG | JSON_HEX_AMP) ?>;
  var app = document.getElementById('app');
  var statusEl = document.getElementById('status');
  var errorsEl = document.getElementById('errors');
  var nf = new Intl.NumberFormat('ru-RU');
  var nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  var state = { days: 30, from: '', to: '' };

  /* ---- безопасное построение DOM: данные только через textContent ---- */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'cls') node.className = attrs[k];
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return node;
  }
  function num(v) { return v === null || v === undefined ? '—' : nf.format(Math.round(v)); }
  function pct(v) { return v === null || v === undefined ? '—' : nf1.format(v) + '%'; }
  function ddmm(iso) { var p = iso.split('-'); return p[2] + '.' + p[1]; }
  function dmy(iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function card() { var c = el('div', { cls: 'card' }); for (var i = 0; i < arguments.length; i++) if (arguments[i]) c.appendChild(arguments[i]); return c; }
  function block(title) { var s = el('section', { cls: 'block' }, el('h2', { text: title })); app.appendChild(s); return s; }
  function errBox(msg) { return el('div', { cls: 'err', role: 'alert', text: msg }); }
  // общая причина (токен, база) показана один раз вверху — в блоках только короткая пометка
  var globalErrors = [];
  function blockError(parent, label, msg) {
    if (!msg) return;
    parent.appendChild(globalErrors.indexOf(msg) >= 0
      ? el('div', { cls: 'note', text: label + ': нет данных — причина указана вверху страницы.' })
      : errBox(label + ': ' + msg));
  }
  function missingBadge() { return el('span', { cls: 'badge', text: 'не создана в Метрике' }); }

  /* ---- изменение к прошлому периоду ---- */
  function delta(cur, prev, lowerIsBetter) {
    if (cur === null || cur === undefined || prev === null || prev === undefined) return el('span', { cls: 'delta flat', text: '—' });
    if (prev === 0) return el('span', { cls: 'delta flat', text: cur === 0 ? 'без изменений' : 'раньше было 0' });
    var ch = (cur - prev) / prev * 100;
    var good = lowerIsBetter ? ch < 0 : ch > 0;
    var cls = Math.abs(ch) < 0.5 ? 'flat' : (good ? 'up' : 'down');
    var arrow = ch > 0 ? '▲ ' : (ch < 0 ? '▼ ' : '');
    return el('span', { cls: 'delta ' + cls, title: 'Прошлый период: ' + (lowerIsBetter ? pct(prev) : num(prev)) }, arrow + nf1.format(Math.abs(ch)) + '% к прошлому периоду');
  }
  function kpi(label, value, d) { return el('div', { cls: 'card kpi' }, el('div', { cls: 'label', text: label }), el('div', { cls: 'value', text: value }), d); }

  /* ---- график визитов и заявок по дням (чистый SVG) ---- */
  function chart(period, visitsByDay, leadsByDay) {
    var days = [];
    var d = new Date(period.from + 'T00:00:00Z');
    var end = new Date(period.to + 'T00:00:00Z');
    while (d <= end) { days.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    var V = days.map(function (k) { return visitsByDay ? (visitsByDay[k] || 0) : null; });
    var L = days.map(function (k) { return leadsByDay ? (leadsByDay[k] || 0) : null; });
    var W = 900, H = 260, pl = 44, pr = 44, pt = 14, pb = 30, cw = W - pl - pr, ch = H - pt - pb;
    // верх шкалы — «круглое» число, делящееся на 4 целых деления (1, 2, 5 × 10ⁿ)
    function niceMax(arr) {
      var m = Math.max(4, Math.max.apply(null, arr.map(function (x) { return x || 0; })));
      var raw = m / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
      var stepV = [1, 2, 5, 10].map(function (f) { return f * p; }).filter(function (v) { return v >= raw; })[0];
      return Math.max(1, Math.round(stepV)) * 4;
    }
    var vmax = niceMax(V), lmax = niceMax(L);
    var ns = 'http://www.w3.org/2000/svg';
    function s(tag, a, txt) { var n = document.createElementNS(ns, tag); Object.keys(a).forEach(function (k) { n.setAttribute(k, a[k]); }); if (txt !== undefined) n.textContent = txt; return n; }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Визиты и заявки по дням' });
    for (var g = 0; g <= 4; g++) {
      var y = pt + ch - ch * g / 4;
      svg.appendChild(s('line', { x1: pl, x2: W - pr, y1: y, y2: y, stroke: '#e3eaf3' }));
      if (visitsByDay) svg.appendChild(s('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#5a6b80' }, nf.format(Math.round(vmax * g / 4))));
      if (leadsByDay) svg.appendChild(s('text', { x: W - pr + 6, y: y + 4, 'font-size': 11, fill: '#1055cb' }, nf.format(lmax * g / 4)));
    }
    var n = days.length, step = cw / n;
    if (leadsByDay) L.forEach(function (v, i) {
      var bh = ch * v / lmax, x = pl + i * step + step * 0.2;
      var r = s('rect', { x: x, y: pt + ch - bh, width: Math.max(1, step * 0.6), height: bh, fill: '#1055cb', opacity: 0.35, rx: 2 });
      r.appendChild(s('title', {}, dmy(days[i]) + ': заявок ' + v));
      svg.appendChild(r);
    });
    if (visitsByDay) {
      var pts = V.map(function (v, i) { return (pl + i * step + step / 2).toFixed(1) + ',' + (pt + ch - ch * v / vmax).toFixed(1); });
      svg.appendChild(s('polyline', { points: pts.join(' '), fill: 'none', stroke: '#316397', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
      V.forEach(function (v, i) {
        var c = s('circle', { cx: pl + i * step + step / 2, cy: pt + ch - ch * v / vmax, r: n > 60 ? 1.5 : 3, fill: '#316397' });
        c.appendChild(s('title', {}, dmy(days[i]) + ': визитов ' + nf.format(v)));
        svg.appendChild(c);
      });
    }
    var every = Math.max(1, Math.ceil(n / 10));
    days.forEach(function (k, i) { if (i % every === 0) svg.appendChild(s('text', { x: pl + i * step + step / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 11, fill: '#5a6b80' }, ddmm(k))); });
    var legend = el('div', { cls: 'legend' },
      visitsByDay ? el('span', {}, el('i', { style: 'background:#316397' }), 'Визиты (шкала слева)') : null,
      leadsByDay ? el('span', {}, el('i', { style: 'background:#1055cb;opacity:.35' }), 'Заявки (шкала справа)') : null);
    var wrap = el('div', { cls: 'chart' });
    wrap.appendChild(svg); wrap.appendChild(legend);
    return wrap;
  }

  function table(headers, rows, numCols, stack) {
    var t = el('table', { cls: stack ? 'tbl tbl--stack' : 'tbl' });
    var tr = el('tr');
    headers.forEach(function (hd, i) { tr.appendChild(el('th', { cls: numCols.indexOf(i) >= 0 ? 'num' : '', text: hd })); });
    t.appendChild(el('thead', {}, tr));
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      r.forEach(function (c, i) {
        var td = el('td', { cls: numCols.indexOf(i) >= 0 ? 'num' : '', 'data-label': headers[i] });
        if (c instanceof Node) td.appendChild(c); else td.textContent = c;
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    if (!rows.length) tb.appendChild(el('tr', {}, el('td', { colspan: headers.length, cls: 'muted', text: 'Нет данных за период' })));
    t.appendChild(tb);
    return el('div', { cls: 'scroll-x' }, t);
  }
  function goalCell(name, id, missing) {
    var w = el('div', {}, name, el('span', { cls: 'id', text: id }));
    if (missing) { w.appendChild(document.createTextNode(' ')); w.appendChild(missingBadge()); }
    return w;
  }

  var SOURCE_NAMES = { website: 'Главная (форма)', electronics: 'Электроника (/electronics)', 'child-masterclass': 'Мастер-класс (/child)' };
  var BRANCH_NAMES = { pavlyukhina: 'ул. Павлюхина, 108б', mardzhani: 'ул. Марджани, 28' };

  function maskPhone(p) {
    var d = String(p).replace(/\D/g, '');
    if (d.length === 11) return '+7 (' + d[1] + '**) ***-**-' + d.slice(9);
    return p ? '***' + d.slice(-2) : '—';
  }
  function phoneCell(p) {
    if (!p) return '—';
    var b = el('button', { cls: 'phone', type: 'button', title: 'Показать номер полностью', text: maskPhone(p) });
    b.addEventListener('click', function () {
      var d = String(p).replace(/\D/g, '');
      if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
      var a = el('a', { href: 'tel:+' + d, text: p });
      b.replaceWith(a);
    });
    return b;
  }
  function dt(s) { // «2026-10-03 14:05:00» → «03.10.2026 14:05»
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5] : (s || '—');
  }

  /* ---- блоки ---- */
  function renderSummary(data) {
    var s = data.summary, b = block('Главные цифры');
    blockError(b, 'Метрика', s.metrika_error);
    blockError(b, 'База заявок', s.db_error);
    var conv = null, convPrev = null;
    if (s.visits && s.leads) {
      conv = s.visits.cur > 0 ? s.leads.cur / s.visits.cur * 100 : null;
      convPrev = s.visits.prev > 0 ? s.leads.prev / s.visits.prev * 100 : null;
    }
    var k = el('div', { cls: 'kpis' },
      kpi('Визиты', s.visits ? num(s.visits.cur) : '—', s.visits ? delta(s.visits.cur, s.visits.prev) : null),
      kpi('Посетители', s.users ? num(s.users.cur) : '—', s.users ? delta(s.users.cur, s.users.prev) : null),
      kpi('Заявки (из базы)', s.leads ? num(s.leads.cur) : '—', s.leads ? delta(s.leads.cur, s.leads.prev) : null),
      kpi('Конверсия визит → заявка', conv === null ? '—' : nf1.format(conv) + '%', conv !== null && convPrev !== null ? delta(conv, convPrev) : null),
      kpi('Отказы', s.bounce ? pct(s.bounce.cur) : '—', s.bounce ? delta(s.bounce.cur, s.bounce.prev, true) : null));
    b.appendChild(k);
    if (s.daily_visits || s.daily_leads) b.appendChild(card(chart(data.period, s.daily_visits || null, s.daily_leads || null)));
    b.appendChild(el('p', { cls: 'small muted', text: 'Сравнение с прошлым таким же периодом: ' + dmy(data.period.prev_from) + ' — ' + dmy(data.period.prev_to) + '. Отказ — визит с одной страницей короче 15 секунд.' }));
  }

  function renderFunnels(data) {
    var b = block('Воронка по страницам');
    var g = el('div', { cls: 'grid2' });
    data.funnels.forEach(function (f) {
      var c = el('div', { cls: 'card funnel' }, el('h3', { text: f.title }));
      if (f.error) { blockError(c, 'Метрика', f.error); g.appendChild(c); return; }
      var first = f.steps.length ? f.steps[0].value : 0;
      f.steps.forEach(function (st, i) {
        var w = first > 0 ? Math.max(1, Math.round(100 * st.value / first)) : 0;
        var right = (st.approx ? '≈ ' : '') + num(st.value) + (i > 0 ? ' · ' + pct(st.pct) + ' от предыдущего' : '');
        var stepEl = el('div', { cls: 'step' },
          el('div', { cls: 'row' }, el('span', { text: (i + 1) + '. ' + st.label }), el('b', { text: right })),
          el('div', { cls: 'bar' }, el('i', { style: 'width:' + w + '%' })));
        if (st.goals && st.goals.length) {
          var det = el('details', {}, el('summary', { text: st.approx ? 'по отдельным целям (визит может быть посчитан в нескольких)' : 'цель' }));
          var ul = el('ul', { style: 'margin:4px 0;padding-left:18px' });
          st.goals.forEach(function (pg) { ul.appendChild(el('li', {}, pg.name + ': ' + (pg.missing ? '' : num(pg.value)) + ' ', el('span', { cls: 'id', style: 'display:inline', text: pg.id }), pg.missing ? missingBadge() : null)); });
          det.appendChild(ul);
          stepEl.appendChild(det);
        }
        c.appendChild(stepEl);
      });
      if (f.note) c.appendChild(el('div', { cls: 'note', text: f.note }));
      g.appendChild(c);
    });
    b.appendChild(g);
    b.appendChild(el('p', { cls: 'small muted', text: 'Считаются визиты, в которых была эта страница. Каждый шаг — сколько визитов дошли до него, процент — от предыдущего шага.' }));
  }

  function renderSources(data) {
    var s = data.sources, b = block('Источники трафика');
    if (s.error) blockError(b, 'Метрика', s.error);
    else {
      if (s.lead_goal_missing) b.appendChild(el('div', { cls: 'note' }, 'Цель «Заявка отправлена» (lead_form) ', missingBadge(), ' — заявки по Метрике не посчитаны.'));
      var rows = function (list) { return list.map(function (r) { return [r.name, num(r.visits), r.leads === null ? '—' : num(r.leads), pct(r.conv)]; }); };
      var g = el('div', { cls: 'grid2' },
        card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'По типу источника (Метрика)' }), table(['Источник', 'Визиты', 'Заявки', 'Конверсия'], rows(s.types), [1, 2, 3])),
        card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'По UTM-меткам (Метрика)' }), table(['utm_source / utm_campaign', 'Визиты', 'Заявки', 'Конверсия'], rows(s.utm), [1, 2, 3])));
      b.appendChild(g);
    }
    if (s.db_error) blockError(b, 'База заявок', s.db_error);
    else {
      var g2 = el('div', { cls: 'grid2', style: 'margin-top:12px' },
        card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'Заявки из базы по utm_source' }), table(['utm_source', 'Заявки'], s.db_utm.map(function (r) { return [r.name, num(r.leads)]; }), [1])),
        card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'Заявки из базы по странице' }), table(['Страница', 'Заявки'], s.db_source.map(function (r) { return [SOURCE_NAMES[r.name] || r.name, num(r.leads)]; }), [1])));
      b.appendChild(g2);
    }
    b.appendChild(el('p', { cls: 'small muted', text: 'Заявки в Метрике — визиты с целью «Заявка отправлена»; в базе — реально сохранённые заявки. Небольшое расхождение нормально (блокировщики рекламы, отключённый JavaScript).' }));
  }

  function renderLeads(data) {
    var l = data.leads, b = block('Последние заявки');
    if (l.error) { blockError(b, 'База заявок', l.error); return; }
    var rows = l.rows.map(function (r) {
      return [el('span', { cls: 'nowrap', text: dt(r.created_at) }), r.name || '—', phoneCell(r.phone), r.age || '—', SOURCE_NAMES[r.source] || r.source || '—', BRANCH_NAMES[r.branch] || r.branch || '—', [r.utm_source, r.utm_campaign].filter(Boolean).join(' / ') || '—'];
    });
    b.appendChild(card(table(['Дата (МСК)', 'Имя', 'Телефон', 'Возраст', 'Страница', 'Филиал', 'UTM'], rows, [], true)));
    b.appendChild(el('p', { cls: 'small muted', text: '20 последних заявок за период. Нажмите на номер, чтобы увидеть его полностью.' }));
  }

  function renderClicks(data) {
    var c = data.clicks, b = block('Клики и действия');
    if (c.error) { blockError(b, 'Метрика', c.error); return; }
    var g = el('div', { cls: 'grid2' });
    c.groups.forEach(function (grp) {
      g.appendChild(card(el('h3', { cls: 'sub', style: 'margin-top:0', text: grp.title }),
        table(['Действие', 'Раз за период'], grp.rows.map(function (r) { return [goalCell(r.name, r.id, r.missing), r.missing ? '—' : num(r.value)]; }), [1])));
    });
    if (c.other && c.other.length) {
      g.appendChild(card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'Другие цели в Метрике' }),
        table(['Цель', 'Раз за период'], c.other.map(function (r) { return [goalCell(r.name, r.id, false), num(r.value)]; }), [1])));
    }
    b.appendChild(g);
    var scrollRows = c.scroll.map(function (r) {
      var bar = el('span', {}, el('span', { cls: 'pbar' }, el('i', { style: 'width:' + Math.min(100, r.pct || 0) + '%' })), pct(r.pct));
      return [goalCell(r.name, r.id, r.missing), r.missing ? '—' : num(r.value), r.missing ? '—' : bar];
    });
    b.appendChild(card(el('h3', { cls: 'sub', style: 'margin-top:0', text: 'Глубина просмотра: до какой секции дошли' }),
      table(['Секция', 'Визиты', '% от всех визитов'], scrollRows, [1, 2])));
  }

  function render(data) {
    app.textContent = '';
    errorsEl.textContent = '';
    globalErrors = data.errors || [];
    globalErrors.forEach(function (m) { errorsEl.appendChild(errBox(m)); });
    statusEl.textContent = 'Период: ' + dmy(data.period.from) + ' — ' + dmy(data.period.to) + ' (' + data.period.days + ' дн.) · данные Метрики на ' + data.fetched_at + ' МСК, обновляются раз в час';
    document.getElementById('from').value = data.period.from;
    document.getElementById('to').value = data.period.to;
    [renderSummary, renderFunnels, renderSources, renderLeads, renderClicks].forEach(function (fn) {
      try { fn(data); } catch (e) { app.appendChild(errBox('Не удалось показать блок: ' + e.message)); }
    });
  }

  var seq = 0; // при быстром переключении периода показываем только последний ответ
  function load() {
    var my = ++seq;
    var q = state.from && state.to ? 'from=' + encodeURIComponent(state.from) + '&to=' + encodeURIComponent(state.to) : 'days=' + state.days;
    document.querySelectorAll('.seg button').forEach(function (bt) { bt.setAttribute('aria-pressed', !state.from && Number(bt.dataset.days) === state.days ? 'true' : 'false'); });
    app.textContent = '';
    errorsEl.textContent = '';
    app.appendChild(el('div', { cls: 'loading', text: 'Загружаем данные… Первый запрос к Метрике может занять до минуты.' }));
    fetch('api.php?' + q, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.status === 401) { location.reload(); throw new Error('Нужно войти'); }
        return r.json().catch(function () { throw new Error('сервер вернул не JSON (ошибка ' + r.status + ')'); })
          .then(function (j) { if (!r.ok) throw new Error(j.error || ('ошибка ' + r.status)); return j; });
      })
      .then(function (data) { if (my === seq) render(data); })
      .catch(function (e) { if (my !== seq) return; app.textContent = ''; app.appendChild(errBox('Не удалось загрузить данные: ' + e.message)); });
  }

  document.querySelectorAll('.seg button').forEach(function (bt) {
    bt.addEventListener('click', function () { state.days = Number(bt.dataset.days); state.from = state.to = ''; load(); });
  });
  document.getElementById('apply').addEventListener('click', function () {
    var f = document.getElementById('from').value, t = document.getElementById('to').value;
    if (!f || !t) { errorsEl.textContent = ''; errorsEl.appendChild(errBox('Выберите обе даты периода.')); return; }
    state.from = f; state.to = t; load();
  });
  var refreshBtn = document.getElementById('refresh');
  refreshBtn.addEventListener('click', function () {
    refreshBtn.disabled = true;
    fetch('api.php?action=refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': CSRF, Accept: 'application/json' } })
      .then(function (r) { if (r.status === 401) { location.reload(); throw new Error('Нужно войти'); } return r.json(); })
      .then(function (j) { statusEl.textContent = j.message || j.error || ''; if (j.ok) load(); })
      .catch(function () { statusEl.textContent = 'Не удалось обновить данные'; })
      .finally(function () { setTimeout(function () { refreshBtn.disabled = false; }, 60000); });
  });
  load();
})();
</script>
</body>
</html>
