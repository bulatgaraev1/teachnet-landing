/* TeachNet — дашборд /dash: графики на SVG и чистом JS (без библиотек и CDN).
 * Линии 2px, столбики до 24px со скруглением 4px только на конце, сетка — тонкие сплошные линии,
 * одна ось Y на график. Подсказка при наведении/тапе/фокусе, у каждого графика — табличный вид.
 * Все подписи из данных вставляются через textContent. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { brand: '#316397', mute: '#98b3d6', grid: '#e8eef5', text: '#18222f', soft: '#5a6b80', surface: '#ffffff' };
  var RAMP = ['#98b3d6', '#7899c6', '#5c82b6', '#436ca3', '#33598d', '#264873', '#1b3659'];
  var nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

  function num(v) { return v === null || v === undefined || isNaN(v) ? '—' : nf0.format(Math.round(v)); }
  function pct(v) { return v === null || v === undefined || isNaN(v) ? '—' : nf1.format(v) + ' %'; }
  function rub(v) { return v === null || v === undefined || isNaN(v) ? '—' : nf0.format(Math.round(v)) + ' ₽'; }
  function fmt(v, unit) { return unit === '%' ? pct(v) : unit === '₽' ? rub(v) : num(v); }

  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  /* ---------- подсказка (одна на страницу) ---------- */
  var tipEl = null;
  function tip() { return tipEl || (tipEl = document.getElementById('tip')); }
  /** rows: [{label, value, key: 'line'|'prev'|null, strong}] */
  function showTip(title, rows, x, y) {
    var t = tip();
    if (!t) return;
    t.textContent = '';
    if (title) t.appendChild(el('div', 'tip__title', title));
    rows.forEach(function (r) {
      var row = el('div', 'tip__row');
      var left = el('span');
      if (r.key) { var k = el('i', 'tip__key' + (r.key === 'prev' ? ' is-prev' : '')); left.appendChild(k); }
      left.appendChild(document.createTextNode(r.label));
      row.appendChild(left);
      row.appendChild(el('b', '', r.value));
      t.appendChild(row);
    });
    t.hidden = false;
    var w = t.offsetWidth, h = t.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = x + 14, top = y - h - 12;
    if (left + w > vw - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 16;
    if (top + h > vh - 8) top = vh - h - 8;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { var t = tip(); if (t) t.hidden = true; }
  document.addEventListener('scroll', hideTip, { passive: true });

  /** «Красивый» верх шкалы: 1, 2, 5 × 10ⁿ на 4 деления. */
  function niceScale(max, integer) {
    if (!(max > 0)) return { max: integer ? 4 : 1, step: integer ? 1 : 0.25 };
    var raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (f) { return f * p; }).filter(function (v) { return v >= raw; })[0];
    if (integer) step = Math.max(1, Math.ceil(step));
    return { max: step * Math.ceil(max / step), step: step };
  }

  /** Перерисовка по ширине контейнера (подписи не мельчают на телефоне). */
  function responsive(box, draw) {
    var last = 0;
    function run() {
      var w = box.clientWidth;
      if (w > 0 && Math.abs(w - last) > 2) { last = w; draw(w); }
    }
    run();
    if (window.ResizeObserver) {
      var t = null;
      new ResizeObserver(function () { clearTimeout(t); t = setTimeout(run, 80); }).observe(box);
    }
  }

  /**
   * График по времени: линия (kind 'line') или столбики ('bar').
   * o = {kind, labels[], ranges[], partial[], values[], prev[]|null, name, unit, height, showX, integer, onHover(i, ev), ariaLabel}
   * Возвращает {el, setIndex(i)} — для общей подсказки у двух графиков с общей осью.
   */
  function timeChart(o) {
    var box = el('div', 'chart');
    box.tabIndex = 0;
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', o.ariaLabel || o.name);
    var state = { xs: [], idx: null, layer: null, w: 0, pad: null, h: 0 };
    var n = o.values.length;
    var H = o.height || 170, PL = 46, PR = 16, PT = 18, PB = o.showX ? 26 : 8;
    function draw(W) {
      box.textContent = '';
      state.w = W;
      var cw = W - PL - PR, ch = H - PT - PB;
      var all = o.values.concat(o.prev || []).filter(function (v) { return v !== null && v !== undefined; });
      var sc = niceScale(Math.max.apply(null, all.concat([0])), o.integer);
      var y = function (v) { return PT + ch - ch * v / sc.max; };
      var step = cw / Math.max(1, n);
      var x = function (i) { return PL + step * i + step / 2; };
      state.xs = []; for (var i = 0; i < n; i++) state.xs.push(x(i));
      var root = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
      // сетка и ось Y
      for (var t = 0; t <= sc.max + 1e-9; t += sc.step) {
        var yy = Math.round(y(t)) + 0.5;
        root.appendChild(svg('line', { x1: PL, x2: W - PR, y1: yy, y2: yy, stroke: C.grid, 'stroke-width': 1 }));
        root.appendChild(svg('text', { x: PL - 8, y: yy + 4, 'text-anchor': 'end', class: 'axis' }, o.unit === '%' ? nf1.format(t) : nf0.format(t)));
      }
      // подписи X: не больше ~1 на 70px
      if (o.showX) {
        var every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(cw / 70))));
        for (var j = 0; j < n; j++) {
          if (j % every !== 0 && j !== n - 1) continue;
          if (j === n - 1 && j % every !== 0 && (j % every) < every / 2) continue;
          root.appendChild(svg('text', { x: x(j), y: H - 6, 'text-anchor': j === 0 && n > 1 ? 'start' : (j === n - 1 && n > 1 ? 'end' : 'middle'), class: 'axis' }, o.labels[j]));
        }
      }
      if (o.kind === 'bar') {
        var bw = Math.max(2, Math.min(24, step * 0.62));
        o.values.forEach(function (v, i) {
          if (v === null || v === undefined) return;
          var x0 = x(i) - bw / 2, top = y(v), base = y(0), h = base - top, r = Math.min(4, h, bw / 2);
          var d = h <= 0 ? '' : 'M' + x0 + ',' + base + 'V' + (top + r) + 'Q' + x0 + ',' + top + ' ' + (x0 + r) + ',' + top +
            'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ',' + top + ' ' + (x0 + bw) + ',' + (top + r) + 'V' + base + 'Z';
          if (d) root.appendChild(svg('path', { d: d, fill: C.brand, opacity: o.partial && o.partial[i] ? 0.38 : 1 }));
        });
        if (o.prev) o.prev.forEach(function (v, i) {
          if (v === null || v === undefined) return;
          var yy = y(v);
          root.appendChild(svg('line', { x1: x(i) - bw / 2 - 3, x2: x(i) + bw / 2 + 3, y1: yy, y2: yy, stroke: C.mute, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
        });
      } else {
        if (o.prev) {
          var pp = o.prev.map(function (v, i) { return v === null || v === undefined ? null : x(i) + ',' + y(v); }).filter(Boolean);
          if (pp.length > 1) root.appendChild(svg('polyline', { points: pp.join(' '), fill: 'none', stroke: C.mute, 'stroke-width': 2, 'stroke-dasharray': '5 4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        }
        // отрезки, касающиеся неполного интервала, — бледнее; остальное — сплошной линией
        var runs = [], cur = null, prevPt = null, prevPartial = false;
        o.values.forEach(function (v, i) {
          if (v === null || v === undefined) { cur = null; prevPt = null; return; }
          var p = x(i) + ',' + y(v), part = !!(o.partial && o.partial[i]);
          var faded = part || prevPartial;
          if (prevPt && (!cur || cur.faded !== faded)) { cur = { faded: faded, pts: [prevPt] }; runs.push(cur); }
          if (cur) cur.pts.push(p); else { cur = { faded: faded, pts: [p] }; runs.push(cur); }
          prevPt = p; prevPartial = part;
        });
        runs.forEach(function (r) {
          if (r.pts.length > 1) root.appendChild(svg('polyline', { points: r.pts.join(' '), fill: 'none', stroke: C.brand, 'stroke-width': 2, opacity: r.faded ? 0.38 : 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        });
        if (n === 1 && o.values[0] !== null) root.appendChild(svg('circle', { cx: x(0), cy: y(o.values[0]), r: 4, fill: C.brand, stroke: C.surface, 'stroke-width': 2 }));
      }
      // выборочные подписи: максимум и последняя точка
      var maxI = -1, lastI = -1;
      o.values.forEach(function (v, i) { if (v === null || v === undefined) return; lastI = i; if (maxI < 0 || v > o.values[maxI]) maxI = i; });
      [maxI, lastI].filter(function (v, i, a) { return v >= 0 && a.indexOf(v) === i; }).forEach(function (i) {
        var v = o.values[i], yy = y(v);
        if (o.kind !== 'bar') root.appendChild(svg('circle', { cx: x(i), cy: yy, r: 4, fill: C.brand, stroke: C.surface, 'stroke-width': 2, opacity: o.partial && o.partial[i] ? 0.5 : 1 }));
        var anchor = x(i) > W - PR - 30 ? 'end' : (x(i) < PL + 30 ? 'start' : 'middle');
        root.appendChild(svg('text', { x: x(i), y: Math.max(11, yy - 8), 'text-anchor': anchor, class: 'vlabel' }, fmt(v, o.unit)));
      });
      // «неполный период» подписан в легенде графика и в подсказке — внутри области не наезжает на данные
      // слой для перекрестия
      state.layer = svg('g');
      root.appendChild(state.layer);
      box.appendChild(root);
      state.y = y; state.H = H; state.PT = PT; state.PB = PB;
      if (state.idx !== null) setIndex(state.idx);
    }
    function setIndex(i) {
      state.idx = i;
      if (!state.layer) return;
      state.layer.textContent = '';
      if (i === null || i < 0 || i >= n) return;
      var xx = state.xs[i];
      state.layer.appendChild(svg('line', { x1: xx, x2: xx, y1: state.PT - 6, y2: state.H - state.PB, stroke: C.soft, 'stroke-width': 1, opacity: 0.5 }));
      var v = o.values[i];
      if (v !== null && v !== undefined && o.kind !== 'bar') {
        state.layer.appendChild(svg('circle', { cx: xx, cy: state.y(v), r: 5, fill: C.brand, stroke: C.surface, 'stroke-width': 2 }));
      }
    }
    function indexAt(clientX) {
      var r = box.getBoundingClientRect(), px = clientX - r.left, best = 0;
      state.xs.forEach(function (xx, i) { if (Math.abs(xx - px) < Math.abs(state.xs[best] - px)) best = i; });
      return best;
    }
    function hover(i, ev) {
      setIndex(i);
      if (o.onHover) o.onHover(i, ev); else defaultTip(i, ev);
    }
    function defaultTip(i, ev) {
      var rows = [{ label: o.name, value: fmt(o.values[i], o.unit), key: 'line' }];
      if (o.prev) rows.push({ label: 'Прошлый период', value: fmt(o.prev[i], o.unit), key: 'prev' });
      var r = box.getBoundingClientRect();
      showTip(o.ranges[i] + (o.partial && o.partial[i] ? ' · неполный период' : ''), rows,
        ev && ev.clientX !== undefined ? ev.clientX : r.left + state.xs[i], ev && ev.clientY !== undefined ? ev.clientY : r.top + 20);
    }
    box.addEventListener('pointermove', function (ev) { hover(indexAt(ev.clientX), ev); });
    box.addEventListener('pointerdown', function (ev) { hover(indexAt(ev.clientX), ev); });
    box.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { setIndex(null); if (o.onLeave) o.onLeave(); hideTip(); } });
    box.addEventListener('focus', function () { hover(state.idx === null ? n - 1 : state.idx); });
    box.addEventListener('blur', function () { setIndex(null); if (o.onLeave) o.onLeave(); hideTip(); });
    box.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      var i = state.idx === null ? n - 1 : state.idx + (ev.key === 'ArrowRight' ? 1 : -1);
      hover(Math.max(0, Math.min(n - 1, i)));
    });
    box._draw = draw;
    setTimeout(function () { responsive(box, draw); }, 0);
    return { el: box, setIndex: setIndex, xs: function () { return state.xs; } };
  }

  /** Мини-график тренда: приглушённая линия, последняя точка — цветом бренда. */
  function sparkline(values, label) {
    var box = el('div', 'kpi__spark');
    box.setAttribute('aria-hidden', 'true');
    var vals = values.filter(function (v) { return v !== null && v !== undefined; });
    if (vals.length < 2) return box;
    responsive(box, function (W) {
      box.textContent = '';
      var H = 34, P = 4;
      var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals.concat([0]));
      var span = max - min || 1;
      var step = (W - 2 * P) / (values.length - 1);
      var pts = [], last = null;
      values.forEach(function (v, i) {
        if (v === null || v === undefined) return;
        last = [P + step * i, H - P - (H - 2 * P) * (v - min) / span];
        pts.push(last.join(','));
      });
      var root = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, focusable: 'false' });
      root.appendChild(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: C.mute, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (last) root.appendChild(svg('circle', { cx: last[0], cy: last[1], r: 4, fill: C.brand, stroke: C.surface, 'stroke-width': 2 }));
      box.appendChild(root);
    });
    return box;
  }

  /**
   * Горизонтальные столбики (HTML): rows [{label, id, value, missing, extra}], o = {unit, ramp (по порядку), max, valueText(row)}.
   */
  function hbars(rows, o) {
    o = o || {};
    var wrap = el('div', 'hbars');
    wrap.setAttribute('role', 'list');
    var max = o.max || Math.max.apply(null, rows.map(function (r) { return r.value || 0; }).concat([0]));
    rows.forEach(function (r, i) {
      var row = el('div', 'hbar' + (r.missing ? ' is-missing' : ''));
      row.setAttribute('role', 'listitem');
      var lab = el('div', 'hbar__label');
      lab.appendChild(document.createTextNode(r.label));
      if (r.id) lab.appendChild(el('span', 'id', r.id));
      row.appendChild(lab);
      var tr = el('div', 'hbar__track');
      if (r.missing) {
        tr.appendChild(el('span', 'badge', 'не создана в Метрике'));
      } else {
        var area = el('div', 'hbar__area');
        var bar = el('div', 'hbar__bar');
        var w = max > 0 ? Math.max(0.5, 100 * (r.value || 0) / max) : 0;
        bar.style.width = w.toFixed(2) + '%';
        if (o.ramp) bar.style.background = RAMP[Math.min(RAMP.length - 1, Math.floor(i * RAMP.length / Math.max(1, rows.length)))];
        area.appendChild(bar);
        tr.appendChild(area);
        var val = el('span', 'hbar__val', o.valueText ? o.valueText(r) : fmt(r.value, o.unit));
        tr.appendChild(val);
        row.tabIndex = 0;
        var show = function (ev) {
          var rect = row.getBoundingClientRect();
          var rowsTip = [{ label: o.name || 'Значение', value: fmt(r.value, o.unit) }];
          if (r.extra) rowsTip.push({ label: r.extra[0], value: r.extra[1] });
          showTip(r.label, rowsTip, ev && ev.clientX !== undefined ? ev.clientX : rect.left + rect.width / 2, ev && ev.clientY !== undefined ? ev.clientY : rect.top);
        };
        row.addEventListener('pointermove', show);
        row.addEventListener('pointerdown', show);
        row.addEventListener('focus', function () { show(); });
        row.addEventListener('pointerleave', hideTip);
        row.addEventListener('blur', hideTip);
      }
      row.appendChild(tr);
      wrap.appendChild(row);
    });
    return wrap;
  }

  /** Тепловая карта «день недели × час»: один оттенок, темнее — больше. */
  function heatmap(grid, days, onTable) {
    var max = 0;
    grid.forEach(function (r) { r.forEach(function (v) { if (v > max) max = v; }); });
    var steps = [RAMP[0], RAMP[2], RAMP[3], RAMP[5], RAMP[6]];
    var color = function (v) { return v <= 0 ? '#f1f5fa' : steps[Math.min(steps.length - 1, Math.floor((v / max) * steps.length - 1e-9))]; };
    var box = el('div', 'xscroll');
    var g = el('div', 'heat');
    g.setAttribute('role', 'img');
    g.appendChild(el('span', 'heat__h', ''));
    for (var h = 0; h < 24; h++) g.appendChild(el('span', 'heat__h', h % 3 === 0 ? String(h) : ''));
    grid.forEach(function (row, d) {
      g.appendChild(el('span', 'heat__d', days[d]));
      row.forEach(function (v, hh) {
        var c = el('span', 'heat__c');
        c.style.background = color(v);
        c.tabIndex = v > 0 ? 0 : -1;
        var show = function (ev) {
          var rect = c.getBoundingClientRect();
          showTip(days[d] + ', ' + hh + ':00–' + (hh + 1) + ':00', [{ label: 'Заявок', value: num(v) }],
            ev && ev.clientX !== undefined ? ev.clientX : rect.left, ev && ev.clientY !== undefined ? ev.clientY : rect.top);
        };
        c.addEventListener('pointermove', show);
        c.addEventListener('pointerdown', show);
        c.addEventListener('focus', function () { show(); });
        c.addEventListener('pointerleave', hideTip);
        c.addEventListener('blur', hideTip);
        g.appendChild(c);
      });
    });
    box.appendChild(g);
    var lg = el('div', 'heat-legend');
    lg.appendChild(document.createTextNode('меньше'));
    ['#f1f5fa'].concat(steps).forEach(function (s) { var i = el('i'); i.style.background = s; lg.appendChild(i); });
    lg.appendChild(document.createTextNode('больше заявок'));
    var out = el('div');
    out.appendChild(box);
    out.appendChild(lg);
    return out;
  }

  /** Таблица из заголовков и строк (значения — строки или узлы). numCols — номера числовых колонок. */
  function table(headers, rows, numCols) {
    numCols = numCols || [];
    var wrap = el('div', 'xscroll');
    var t = el('table', 'tbl');
    var tr = el('tr');
    headers.forEach(function (h, i) { var th = el('th', numCols.indexOf(i) >= 0 ? 'num' : '', h); th.scope = 'col'; tr.appendChild(th); });
    var thead = el('thead'); thead.appendChild(tr); t.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      r.forEach(function (c, i) {
        var td = el('td', numCols.indexOf(i) >= 0 ? 'num' : '');
        if (c instanceof Node) td.appendChild(c); else td.textContent = c === null || c === undefined ? '—' : String(c);
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    if (!rows.length) { var e = el('tr'); var td = el('td', 'muted', 'Нет данных за период'); td.colSpan = headers.length; e.appendChild(td); tb.appendChild(e); }
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  /** Кнопка «Таблица»/«График»: переключает вид, не меняя высоту остального. */
  function withTable(title, chartNode, makeTable, headExtra) {
    var card = el('div');
    var head = el('div', 'card__head');
    head.appendChild(el('h3', '', title));
    var right = el('div');
    right.style.display = 'flex'; right.style.gap = '8px'; right.style.alignItems = 'center';
    if (headExtra) right.appendChild(headExtra);
    var btn = el('button', 'btn btn--ghost btn--small tbl-toggle', 'Таблица');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    right.appendChild(btn);
    head.appendChild(right);
    card.appendChild(head);
    var chartBox = el('div');
    chartBox.appendChild(chartNode);
    var tableBox = el('div', 'chart-table');
    tableBox.hidden = true;
    card.appendChild(chartBox);
    card.appendChild(tableBox);
    btn.addEventListener('click', function () {
      var on = tableBox.hidden;
      if (on && !tableBox.firstChild) tableBox.appendChild(makeTable());
      tableBox.hidden = !on;
      chartBox.hidden = on;
      btn.textContent = on ? 'График' : 'Таблица';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      hideTip();
    });
    return card;
  }

  window.DashCharts = {
    timeChart: timeChart, sparkline: sparkline, hbars: hbars, heatmap: heatmap, table: table, withTable: withTable,
    showTip: showTip, hideTip: hideTip, fmt: fmt, num: num, pct: pct, rub: rub, el: el, RAMP: RAMP
  };
})();
