/* TeachNet — дашборд /dash: фильтры, загрузка блоков (каждый независимо), отрисовка,
 * рабочая таблица заявок и расходы. Данные — только из api.php после входа.
 * Всё, что пришло из данных, вставляется через textContent. */
(function () {
  'use strict';
  var D = window.DashCharts;
  var el = D.el, num = D.num, pct = D.pct, rub = D.rub, fmt = D.fmt;
  var CSRF = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
  var BLOCKS = ['insights', 'kpi', 'funnel', 'flow', 'channels', 'pages', 'behavior', 'audience', 'leads', 'spend', 'quality'];
  var MSK = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
  var MSKDAY = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short' });

  /* ---------- состояние фильтров (в адресе страницы — удобно сохранить в закладки) ---------- */
  var state = {
    period: '30', from: '', to: '', compare: true, branch: 'all', group: '',
    funnelPage: 'all', behaviorPage: 'main',
    leads: { status: '', channel: '', q: '', p: 1, scope: '' },
    sort: { key: 'leads', dir: -1 }
  };
  (function readHash() {
    try {
      var h = new URLSearchParams(location.hash.slice(1));
      if (h.get('period')) state.period = h.get('period');
      state.from = h.get('from') || '';
      state.to = h.get('to') || '';
      if (h.get('compare') === '0') state.compare = false;
      if (h.get('branch')) state.branch = h.get('branch');
      if (h.get('group')) state.group = h.get('group');
      if (h.get('fp')) state.funnelPage = h.get('fp');
      if (h.get('bp')) state.behaviorPage = h.get('bp');
    } catch (e) { /* адрес без параметров */ }
  })();
  function writeHash() {
    var h = new URLSearchParams();
    h.set('period', state.period);
    if (state.period === 'custom') { h.set('from', state.from); h.set('to', state.to); }
    if (!state.compare) h.set('compare', '0');
    if (state.branch !== 'all') h.set('branch', state.branch);
    if (state.group) h.set('group', state.group);
    if (state.funnelPage !== 'all') h.set('fp', state.funnelPage);
    if (state.behaviorPage !== 'main') h.set('bp', state.behaviorPage);
    history.replaceState(null, '', '#' + h.toString());
  }
  function params(extra) {
    var p = new URLSearchParams();
    p.set('period', state.period);
    if (state.period === 'custom') { p.set('from', state.from); p.set('to', state.to); }
    p.set('compare', state.compare ? '1' : '0');
    p.set('branch', state.branch);
    if (state.group) p.set('group', state.group);
    Object.keys(extra || {}).forEach(function (k) { if (extra[k] !== '' && extra[k] !== null && extra[k] !== undefined) p.set(k, extra[k]); });
    return p.toString();
  }

  /* ---------- загрузка блоков ---------- */
  var ctrl = {}, fetched = {}, last = {};
  function extraFor(block) {
    if (block === 'funnel') return { page: state.funnelPage };
    if (block === 'behavior') return { page: state.behaviorPage };
    if (block === 'leads') return state.leads;
    return {};
  }
  function load(block) {
    var sec = document.querySelector('[data-block="' + block + '"]');
    if (!sec) return;
    var body = sec.querySelector('.block__body');
    if (ctrl[block]) ctrl[block].abort();
    var c = new AbortController();
    ctrl[block] = c;
    sec.classList.add('is-loading');
    sec.setAttribute('aria-busy', 'true');
    fetch('api.php?block=' + block + '&' + params(extraFor(block)), { signal: c.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.status === 401) { location.reload(); throw new Error('Нужно войти'); }
        return r.json().catch(function () { throw new Error('сервер вернул не JSON (ошибка ' + r.status + ')'); });
      })
      .then(function (j) {
        if (c.signal.aborted) return;
        last[block] = j;
        if (j.fetched_at) fetched[block] = j.fetched_at;
        updateStamp();
        if (j.period && j.period.group && block === 'flow') syncGroup(j.period.group);
        body.textContent = '';
        if (j.error) { body.appendChild(stateBox(j.error, true)); if (block === 'quality') qSummary('Не удалось проверить данные'); return; }
        try { RENDER[block](body, j); } catch (e) { body.textContent = ''; body.appendChild(stateBox('Не удалось показать блок: ' + e.message, true)); }
      })
      .catch(function (e) {
        if (e.name === 'AbortError') return;
        body.textContent = '';
        body.appendChild(stateBox('Не удалось загрузить блок: ' + e.message, true));
      })
      .then(function () {
        if (ctrl[block] === c) { sec.classList.remove('is-loading'); sec.removeAttribute('aria-busy'); }
      });
  }
  function loadAll() { writeHash(); syncFilters(); BLOCKS.forEach(load); }
  function loadSome(list) { writeHash(); list.forEach(load); }

  function updateStamp() {
    var ts = Object.keys(fetched).map(function (k) { return fetched[k]; }).filter(Boolean);
    var s = document.getElementById('stamp');
    if (!ts.length) { s.textContent = ''; return; }
    var d = new Date(Math.min.apply(null, ts) * 1000);
    var today = MSKDAY.format(new Date()) === MSKDAY.format(d);
    s.textContent = 'Данные обновлены ' + (today ? 'в ' : MSKDAY.format(d) + ' в ') + MSK.format(d);
  }

  /* ---------- общие элементы ---------- */
  function stateBox(text, isErr, link) {
    var b = el('div', 'state' + (isErr ? ' state--err' : ''));
    b.setAttribute('role', isErr ? 'alert' : 'note');
    b.appendChild(el('span', '', isErr ? '!' : 'ⓘ'));
    var t = el('div');
    t.appendChild(document.createTextNode(text));
    if (link) { t.appendChild(document.createTextNode(' ')); var a = el('a', '', link[0]); a.href = link[1]; t.appendChild(a); }
    b.appendChild(t);
    return b;
  }
  function card() { var c = el('div', 'card'); for (var i = 0; i < arguments.length; i++) if (arguments[i]) c.appendChild(arguments[i]); return c; }
  function infoBtn(text) {
    var b = el('button', 'info', 'ⓘ');
    b.type = 'button';
    b.setAttribute('aria-label', 'Что это: ' + text);
    var show = function () { var r = b.getBoundingClientRect(); D.showTip(text, [], r.left + r.width / 2, r.top); b.setAttribute('aria-expanded', 'true'); };
    var hide = function () { D.hideTip(); b.setAttribute('aria-expanded', 'false'); };
    b.addEventListener('mouseenter', show);
    b.addEventListener('mouseleave', hide);
    b.addEventListener('focus', show);
    b.addEventListener('blur', hide);
    b.addEventListener('click', function (e) { e.preventDefault(); b.getAttribute('aria-expanded') === 'true' ? hide() : show(); });
    return b;
  }
  /** «12 из 340 · 3,5 %», процент серым при малом знаменателе. */
  function absPct(n, den, small) {
    var w = el('span', small ? 'is-small' : '');
    if (n === null || n === undefined) { w.textContent = '—'; return w; }
    w.textContent = num(n) + (den ? ' · ' + pct(100 * n / den) : '');
    if (small && den) w.appendChild(el('span', 'ms', 'мало данных'));
    return w;
  }
  function pctCell(v, small) {
    var w = el('span', small ? 'is-small' : '', pct(v));
    if (small && v !== null && v !== undefined) w.appendChild(el('span', 'ms', 'мало данных'));
    return w;
  }
  function minutesText(m) {
    if (m === null || m === undefined) return '—';
    if (m < 60) return m + ' мин';
    if (m < 1440) return Math.floor(m / 60) + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '');
    return Math.floor(m / 1440) + ' дн';
  }
  function post(action, data) {
    var body = new URLSearchParams();
    Object.keys(data || {}).forEach(function (k) { if (data[k] !== undefined && data[k] !== null) body.set(k, data[k]); });
    return fetch('api.php?action=' + action, {
      method: 'POST', credentials: 'same-origin', body: body,
      headers: { 'X-CSRF-Token': CSRF, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (r) {
      if (r.status === 401) { location.reload(); throw new Error('Нужно войти'); }
      return r.json().catch(function () { throw new Error('ошибка сервера ' + r.status); }).then(function (j) {
        if (!r.ok || j.error) throw new Error(j.error || ('ошибка ' + r.status));
        return j;
      });
    });
  }
  function select(options, value, label, cls) {
    var s = el('select', cls || 'field');
    if (label) s.setAttribute('aria-label', label);
    options.forEach(function (o) {
      var op = el('option', '', o[1]);
      op.value = o[0];
      if (String(o[0]) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function entries(obj) { return Object.keys(obj || {}).map(function (k) { return [k, obj[k]]; }); }

  /* ================= блоки ================= */
  var RENDER = {};

  /* 1. Что важно знать сейчас */
  RENDER.insights = function (body, j) {
    var ul = el('ul', 'insights');
    j.items.forEach(function (it) {
      var li = el('li', 'is-' + it.type);
      li.appendChild(el('span', 'i-ico', it.type === 'alert' ? '⚠' : it.type === 'ok' ? '✓' : '•'));
      var t = el('div');
      if (it.type === 'alert') { t.appendChild(el('b', '', 'Внимание: ')); }
      t.appendChild(document.createTextNode(it.text));
      li.appendChild(t);
      ul.appendChild(li);
    });
    body.appendChild(ul);
  };

  /* 2. Ключевые показатели */
  RENDER.kpi = function (body, j) {
    var g = el('div', 'kpis');
    j.cards.forEach(function (c) {
      var k = el('div', 'kpi');
      var lab = el('div', 'kpi__label');
      lab.appendChild(document.createTextNode(c.label));
      if (c.hint) lab.appendChild(infoBtn(c.hint));
      k.appendChild(lab);
      if (c.state !== 'ok') {
        k.appendChild(el('div', 'kpi__nodata', c.state === 'error' ? 'ошибка' : 'нет данных'));
        if (c.msg) {
          if (c.action) { var a = el('a', 'small', c.msg + ' →'); a.href = c.action; k.appendChild(a); }
          else k.appendChild(el('div', 'small muted', c.msg));
        }
        g.appendChild(k);
        return;
      }
      var smallVal = c.unit === '%' && c.small;
      var v = el('div', 'kpi__value' + (smallVal ? ' is-small' : ''), fmt(c.value, c.unit));
      k.appendChild(v);
      if (state.compare && c.prev !== null && c.prev !== undefined) {
        var d = el('div', 'kpi__delta');
        if (c.prev === 0) {
          d.className += ' flat';
          d.textContent = c.value === 0 ? 'без изменений' : 'раньше было 0';
        } else {
          var ch = 100 * (c.value - c.prev) / Math.abs(c.prev);
          var good = c.lowerIsBetter === null ? null : (c.lowerIsBetter ? ch < 0 : ch > 0);
          var cls = c.small || Math.abs(ch) < 0.5 || good === null ? 'flat' : (good ? 'up' : 'down');
          d.className += ' ' + cls;
          d.textContent = (ch > 0 ? '▲ ' : ch < 0 ? '▼ ' : '') + pct(Math.abs(ch));
          if (c.small) d.appendChild(el('span', 'ms', 'мало данных для выводов'));
          d.title = 'Прошлый период: ' + fmt(c.prev, c.unit);
        }
        k.appendChild(d);
        k.appendChild(el('div', 'kpi__sub', 'было ' + fmt(c.prev, c.unit)));
      }
      if (c.n) k.appendChild(el('div', 'kpi__sub', c.n));
      if (c.sub) k.appendChild(el('div', 'kpi__sub', c.sub));
      k.appendChild(D.sparkline(c.series || [], c.label));
      g.appendChild(k);
    });
    body.appendChild(g);
  };

  /* 3. Воронка целиком */
  RENDER.funnel = function (body, j) {
    syncSeg('funnel-page', 'page', state.funnelPage);
    var wrap = el('div', 'card');
    var f = el('div', 'funnel');
    f.setAttribute('role', 'list');
    var greyMsg = '';
    j.steps.forEach(function (s, i) {
      var grey = s.state !== 'ok';
      var st = el('div', 'fstep' + (s.worst ? ' is-worst' : '') + (grey ? ' is-grey' : ''));
      st.setAttribute('role', 'listitem');
      st.appendChild(el('div', 'fstep__label', s.label));
      var val = s.value === null || s.value === undefined ? '—' : (s.approx ? '≈ ' : '') + num(s.value);
      st.appendChild(el('div', 'fstep__value', s.state === 'nosql' ? '—' : val));
      var p = el('div', 'fstep__pct');
      if (i > 0 && s.pct_prev !== null && s.pct_prev !== undefined && s.state !== 'nosql') {
        var a = el('div', s.small ? 'is-small' : '');
        a.appendChild(el('b', '', pct(s.pct_prev)));
        a.appendChild(document.createTextNode(' от пред.' + (s.small ? ' · мало данных' : '')));
        p.appendChild(a);
      }
      if (i > 0 && s.pct_first !== null && s.pct_first !== undefined && s.state !== 'nosql') {
        p.appendChild(el('div', 'muted', pct(s.pct_first) + ' от визитов'));
      }
      st.appendChild(p);
      if (s.state === 'nogoals') st.appendChild(el('div', 'fstep__msg', 'На этой странице нет таких целей'));
      if (s.state === 'missing') st.appendChild(el('div', 'fstep__msg', 'Цели не созданы в Метрике'));
      if (s.state === 'error' && i < 3) st.appendChild(el('div', 'fstep__msg', 'Нет данных Метрики'));
      if (s.state === 'error' && i >= 3) st.appendChild(el('div', 'fstep__msg', 'Нет данных базы'));
      if (s.state === 'ok' && s.parts) {
        var miss = s.parts.filter(function (x) { return x.missing; }).map(function (x) { return x.id; });
        if (miss.length && miss.length < s.parts.length) st.appendChild(el('div', 'fstep__msg', 'нет в Метрике: ' + miss.join(', ')));
      }
      if ((s.state === 'nosql' || s.state === 'nostatus') && s.msg) greyMsg = s.msg;
      var bar = el('div', 'fstep__bar');
      var w = i === 0 ? 100 : Math.max(0, Math.min(100, s.pct_prev || 0));
      var ib = el('i'); ib.style.width = (s.state === 'nosql' ? 0 : w) + '%';
      bar.appendChild(ib);
      st.appendChild(bar);
      if (s.worst) st.appendChild(el('div', 'fstep__worst', 'Здесь теряем больше всего'));
      if (i < j.steps.length - 1) { var ar = el('span', 'fstep__arrow', '›'); ar.setAttribute('aria-hidden', 'true'); st.appendChild(ar); }
      st.setAttribute('aria-label', s.label + ': ' + val + (s.pct_prev !== null && s.pct_prev !== undefined ? ', ' + pct(s.pct_prev) + ' от предыдущего шага' : '') + (s.worst ? ', здесь теряем больше всего' : ''));
      f.appendChild(st);
    });
    wrap.appendChild(f);
    if (greyMsg) { var sb = stateBox(greyMsg, false, ['Перейти к заявкам', '#leads']); sb.style.marginTop = '12px'; wrap.appendChild(sb); }
    (j.notes || []).forEach(function (n) { wrap.appendChild(el('p', 'note', n)); });
    body.appendChild(wrap);
  };

  /* 4. Как меняется поток */
  RENDER.flow = function (body, j) {
    var labels = j.buckets.map(function (b) { return b.label; });
    var ranges = j.buckets.map(function (b) { return b.range; });
    var partial = j.buckets.map(function (b) { return b.partial; });
    var unitWord = j.period.group === 'week' ? 'по неделям' : 'по дням';
    var node = el('div');
    var charts = [];
    var hover = function (i, ev) {
      charts.forEach(function (c) { c.setIndex(i); });
      var rows = [];
      if (j.visits) {
        rows.push({ label: 'Визиты', value: num(j.visits[i]), key: 'line' });
        if (j.visits_prev) rows.push({ label: 'Визиты, прошлый период', value: num(j.visits_prev[i]), key: 'prev' });
      }
      if (j.leads) {
        rows.push({ label: 'Заявки', value: num(j.leads[i]), key: 'line' });
        if (j.leads_prev) rows.push({ label: 'Заявки, прошлый период', value: num(j.leads_prev[i]), key: 'prev' });
      }
      var r = (ev && ev.currentTarget ? ev.currentTarget : node).getBoundingClientRect();
      var xs = charts[0] ? charts[0].xs() : [];
      D.showTip(ranges[i] + (partial[i] ? ' · неполный период' : ''), rows,
        ev && ev.clientX !== undefined ? ev.clientX : r.left + (xs[i] || 0), ev && ev.clientY !== undefined ? ev.clientY : r.top + 30);
    };
    var leave = function () { charts.forEach(function (c) { c.setIndex(null); }); };
    var sum = function (a) { return (a || []).reduce(function (s, v) { return s + (v || 0); }, 0); };
    node.appendChild(el('p', 'chart__title', 'Визиты ' + unitWord));
    if (j.visits) {
      var c1 = D.timeChart({ kind: 'line', labels: labels, ranges: ranges, partial: partial, values: j.visits, prev: j.visits_prev, name: 'Визиты',
        height: 170, showX: false, integer: true, onHover: hover, onLeave: leave,
        ariaLabel: 'Визиты ' + unitWord + ': всего ' + num(sum(j.visits)) + '. Стрелками влево и вправо — значения по периодам.' });
      charts.push(c1); node.appendChild(c1.el);
    } else node.appendChild(stateBox((j.errors && j.errors.visits) || 'Нет данных Метрики', true));
    var t2 = el('p', 'chart__title', 'Заявки ' + unitWord); t2.style.marginTop = '12px';
    node.appendChild(t2);
    if (j.leads) {
      var c2 = D.timeChart({ kind: 'bar', labels: labels, ranges: ranges, partial: partial, values: j.leads, prev: j.leads_prev, name: 'Заявки',
        height: 150, showX: true, integer: true, onHover: hover, onLeave: leave,
        ariaLabel: 'Заявки ' + unitWord + ': всего ' + num(sum(j.leads)) + '.' });
      charts.push(c2); node.appendChild(c2.el);
    } else node.appendChild(stateBox((j.errors && j.errors.leads) || 'Нет данных базы', true));
    var lg = el('div', 'legend');
    var item = function (cls, text) { var s = el('span'); s.appendChild(el('i', cls)); s.appendChild(document.createTextNode(text)); return s; };
    lg.appendChild(item('', 'Визиты'));
    lg.appendChild(item('is-bar', 'Заявки'));
    if (j.visits_prev || j.leads_prev) lg.appendChild(item('is-prev', 'Прошлый период'));
    if (partial.some(Boolean)) lg.appendChild(item('is-partial', 'Неполный период'));
    node.appendChild(lg);
    body.appendChild(card(D.withTable('Визиты и заявки ' + unitWord, node, function () {
      var rows = ranges.map(function (r, i) {
        return [r + (partial[i] ? ' (неполный)' : ''), j.visits ? num(j.visits[i]) : '—', j.visits_prev ? num(j.visits_prev[i]) : '—',
          j.leads ? num(j.leads[i]) : '—', j.leads_prev ? num(j.leads_prev[i]) : '—'];
      });
      return D.table(['Период', 'Визиты', 'Прошлый период', 'Заявки', 'Прошлый период'], rows, [1, 2, 3, 4]);
    })));
  };

  /* 5. Каналы */
  RENDER.channels = function (body, j) {
    if (j.errors && j.errors.metrika) body.appendChild(stateBox('Метрика: ' + j.errors.metrika, true));
    if (j.errors && j.errors.db) body.appendChild(stateBox('База заявок: ' + j.errors.db, true));
    var withLeads = j.rows.filter(function (r) { return r.leads; }).sort(function (a, b) { return b.leads - a.leads; });
    if (withLeads.length) {
      var total = withLeads.reduce(function (s, r) { return s + r.leads; }, 0);
      var bars = D.hbars(withLeads.map(function (r) { return { label: r.label, value: r.leads, extra: ['Доля заявок', pct(100 * r.leads / total)] }; }), { name: 'Заявок' });
      body.appendChild(card(D.withTable('Заявки по каналам', bars, function () {
        return D.table(['Канал', 'Заявки', 'Доля'], withLeads.map(function (r) { return [r.label, num(r.leads), pct(100 * r.leads / total)]; }), [1, 2]);
      })));
    }
    var cols = [['label', 'Канал'], ['visits', 'Визиты'], ['bounce', 'Отказы'], ['leads', 'Заявки'], ['conv', 'Конверсия'],
      ['attended', 'Пришли на пробное'], ['paid', 'Оплатили'], ['spend', 'Расходы'], ['cpl', 'CPL'], ['cac', 'CAC']];
    var hints = { bounce: 'Отказ — визит, в котором посмотрели одну страницу меньше 15 секунд.', conv: 'Конверсия — заявки ÷ визиты канала.',
      cpl: 'CPL — цена заявки: расходы ÷ заявки.', cac: 'CAC — цена ученика: расходы ÷ оплаты.' };
    var c = el('div', 'card');
    var head = el('div', 'card__head');
    head.appendChild(el('h3', '', 'Каналы: от визита до оплаты'));
    c.appendChild(head);
    var tblWrap = el('div', 'xscroll');
    var t = el('table', 'tbl');
    tblWrap.appendChild(t);
    c.appendChild(tblWrap);
    function draw() {
      t.textContent = '';
      var tr = el('tr');
      cols.forEach(function (col, i) {
        var th = el('th', i ? 'num' : '');
        th.scope = 'col';
        var b = el('button', 'sort', col[1]);
        b.type = 'button';
        if (state.sort.key === col[0]) { th.setAttribute('aria-sort', state.sort.dir < 0 ? 'descending' : 'ascending'); b.textContent += state.sort.dir < 0 ? ' ▼' : ' ▲'; b.setAttribute('aria-sort', 'x'); }
        b.addEventListener('click', function () {
          state.sort = { key: col[0], dir: state.sort.key === col[0] ? -state.sort.dir : (col[0] === 'label' ? 1 : -1) };
          draw();
        });
        th.appendChild(b);
        if (hints[col[0]]) th.appendChild(infoBtn(hints[col[0]]));
        tr.appendChild(th);
      });
      var thead = el('thead'); thead.appendChild(tr); t.appendChild(thead);
      var tb = el('tbody');
      var rows = j.rows.slice().sort(function (a, b) {
        var x = a[state.sort.key], y = b[state.sort.key];
        if (state.sort.key === 'label') return state.sort.dir * String(x).localeCompare(String(y), 'ru');
        return state.sort.dir * ((x === null || x === undefined ? -1 : x) - (y === null || y === undefined ? -1 : y));
      });
      rows.forEach(function (r) {
        var row = el('tr');
        var first = el('td');
        var subRows = [];
        if (r.subs && r.subs.length) {
          var ex = el('button', 'exp', '▸');
          ex.type = 'button';
          ex.setAttribute('aria-expanded', 'false');
          ex.setAttribute('aria-label', 'Показать кампании канала ' + r.label);
          ex.addEventListener('click', function () {
            var open = ex.getAttribute('aria-expanded') !== 'true';
            ex.setAttribute('aria-expanded', open ? 'true' : 'false');
            ex.textContent = open ? '▾' : '▸';
            subRows.forEach(function (s) { s.hidden = !open; });
          });
          first.appendChild(ex);
        } else {
          var sp = el('span', 'exp', ''); sp.setAttribute('aria-hidden', 'true'); first.appendChild(sp);
        }
        first.appendChild(document.createTextNode(r.label));
        row.appendChild(first);
        var cell = function (node) { var td = el('td', 'num'); if (node instanceof Node) td.appendChild(node); else td.textContent = node; row.appendChild(td); };
        cell(r.visits === null ? '—' : num(r.visits));
        cell(pctCell(r.bounce, r.small));
        cell(r.leads === null ? '—' : num(r.leads));
        cell(pctCell(r.conv, r.small));
        cell(r.attended === null ? '—' : num(r.attended));
        cell(r.paid === null ? '—' : num(r.paid));
        cell(r.spend === null ? '—' : rub(r.spend));
        cell(r.cpl === null ? '—' : rub(r.cpl));
        cell(r.cac === null ? '—' : rub(r.cac));
        tb.appendChild(row);
        (r.subs || []).forEach(function (s) {
          var sr = el('tr', 'sub');
          sr.hidden = true;
          var lab = [s.campaign || '(без кампании)', s.content].filter(Boolean).join(' / ');
          var td0 = el('td', '', lab);
          sr.appendChild(td0);
          [num(s.visits), '—', num(s.leads), s.visits ? pct(s.conv) : '—', num(s.attended), num(s.paid), '—', '—', '—'].forEach(function (v) { sr.appendChild(el('td', 'num', v)); });
          subRows.push(sr);
          tb.appendChild(sr);
        });
      });
      if (!rows.length) { var e = el('tr'); var td = el('td', 'muted', 'Нет данных за период'); td.colSpan = cols.length; e.appendChild(td); tb.appendChild(e); }
      t.appendChild(tb);
    }
    draw();
    var rec = j.recon || {};
    var p = el('p', 'recon');
    if (rec.lead_goal === false) p.textContent = 'Цель «Заявка отправлена» (lead_form) не создана в Метрике — сверка невозможна.';
    else if (rec.metrika !== null && rec.db !== null) {
      p.textContent = 'Сверка: Метрика засчитала ' + num(rec.metrika) + ' целей «Заявка отправлена», в базе ' + num(rec.db) + ' заявок с форм' +
        (rec.diff_pct !== null ? ' (расхождение ' + pct(rec.diff_pct) + (rec.small ? ', мало данных для выводов' : '') + ')' : '') + '.';
    }
    c.appendChild(p);
    if (j.branch_note) c.appendChild(el('p', 'note', j.branch_note));
    if (j.has_status === false) c.appendChild(el('p', 'note', 'Пробные и оплаты появятся после выполнения SQL и отметки статусов в блоке «Заявки».'));
    c.appendChild(el('p', 'note', 'Канал заявки определяется по меткам и адресу, с которого пришли: utm_medium=business — «Карты и справочники», есть yclid — Директ, без меток — по сайту-источнику. Строки с ▸ раскрываются до кампаний (utm_campaign / utm_content).'));
    body.appendChild(c);
  };

  /* 6. Страницы */
  RENDER.pages = function (body, j) {
    var rows = j.rows.map(function (r) {
      var v = r.visits;
      return [r.label, num(v), pctCell(r.bounce, r.small), absPct(r.reach, v, r.small), absPct(r.cta, v, r.small),
        r.leads === null ? '—' : num(r.leads), pctCell(r.conv, r.small)];
    });
    var c = card(D.table(['Страница входа', 'Визиты', 'Отказы', 'Дочитали до цены или формы', 'Нажали «Записаться»', 'Заявки', 'Конверсия'], rows, [1, 2, 3, 4, 5, 6]));
    if (j.approx) c.appendChild(el('p', 'note', 'Пока нет составных целей воронки, «дочитали» и «нажали» — оценка по сумме отдельных целей.'));
    if (j.missing && j.missing.lead) c.appendChild(el('p', 'note', 'Цель lead_form не создана в Метрике — заявки по страницам не посчитать.'));
    c.appendChild(el('p', 'note', 'Заявки здесь — по Метрике (цель «Заявка отправлена»): база не знает, с какой страницы человек начал визит.'));
    body.appendChild(c);
  };

  /* 7. Поведение на странице */
  RENDER.behavior = function (body, j) {
    syncSeg('behavior-page', 'page', state.behaviorPage);
    if (j.small) body.appendChild(stateBox('Мало данных: ' + num(j.visits) + ' визитов со страницей за период — проценты могут сильно колебаться.', false));
    var g = el('div', 'grid2');
    var depthRows = j.depth.map(function (r) { return { label: r.label, id: r.id, value: r.pct, missing: r.missing, extra: ['Визитов', num(r.value)] }; });
    g.appendChild(card(D.withTable('До какой секции дошли, % визитов', D.hbars(depthRows, { unit: '%', ramp: true, max: 100, name: 'Дошли' }), function () {
      return D.table(['Секция (сверху вниз)', 'Визиты', '% визитов страницы'], j.depth.map(function (r) {
        return [r.label + ' (' + r.id + ')', r.missing ? 'не создана в Метрике' : num(r.value), r.missing ? '—' : pct(r.pct)];
      }), [1, 2]);
    })));
    var right = el('div');
    var simple = function (title, rows, name) {
      return card(D.withTable(title, D.hbars(rows.map(function (r) { return { label: r.label, id: r.id, value: r.value, missing: r.missing }; }), { name: name }), function () {
        return D.table(['Место', 'Нажатий'], rows.map(function (r) { return [r.label + ' (' + r.id + ')', r.missing ? 'не создана в Метрике' : num(r.value)]; }), [1]);
      }));
    };
    right.appendChild(simple('Какие кнопки «Записаться» нажимают', j.cta, 'Нажатий'));
    var contact = simple('Как предпочитают связаться', j.contact, 'Раз');
    contact.style.marginTop = '12px';
    right.appendChild(contact);
    g.appendChild(right);
    body.appendChild(g);
    var links = card(el('h3', '', 'Переходы, меню и вопросы'), D.table(['Действие', 'Раз за период'], j.links.map(function (r) {
      var w = el('div'); w.appendChild(document.createTextNode(r.label)); w.appendChild(el('span', 'id', ' ' + r.id));
      if (r.missing) { w.appendChild(document.createTextNode(' ')); w.appendChild(el('span', 'badge', 'не создана в Метрике')); }
      return [w, r.missing ? '—' : num(r.value)];
    }), [1]));
    links.style.marginTop = '12px';
    body.appendChild(links);
    if (j.note) body.appendChild(el('p', 'note', j.note));
  };

  /* 8. Посетители */
  RENDER.audience = function (body, j) {
    if (j.errors && j.errors.metrika) body.appendChild(stateBox('Метрика: ' + j.errors.metrika, true));
    var g = el('div', 'grid2');
    if (j.devices) {
      g.appendChild(card(el('h3', '', 'Устройства'), D.table(['Устройство', 'Визиты', 'Отказы', 'Заявки', 'Конверсия'], j.devices.map(function (d) {
        return [d.label, num(d.visits), pctCell(d.bounce, d.small), d.leads === null ? '—' : num(d.leads), pctCell(d.conv, d.small)];
      }), [1, 2, 3, 4])));
    }
    var right = el('div');
    if (j.cities) {
      right.appendChild(card(D.withTable('Города', D.hbars(j.cities.map(function (c) { return { label: c.label, value: c.visits, extra: ['Доля', pct(c.pct)] }; }), {
        name: 'Визитов', valueText: function (r) { var c = j.cities.filter(function (x) { return x.label === r.label; })[0]; return num(r.value) + ' · ' + pct(c.pct); }
      }), function () { return D.table(['Город', 'Визиты', 'Доля'], j.cities.map(function (c) { return [c.label, num(c.visits), pct(c.pct)]; }), [1, 2]); })));
    }
    if (j.newret) {
      var nr = [{ label: 'Новые', value: j.newret.new }, { label: 'Вернувшиеся', value: j.newret.returning }];
      var tot = j.newret.users || 0;
      var nc = card(D.withTable('Новые и вернувшиеся посетители', D.hbars(nr, { name: 'Посетителей', valueText: function (r) { return num(r.value) + (tot ? ' · ' + pct(100 * r.value / tot) : ''); } }), function () {
        return D.table(['Посетители', 'Число', 'Доля'], nr.map(function (r) { return [r.label, num(r.value), tot ? pct(100 * r.value / tot) : '—']; }), [1, 2]);
      }));
      nc.style.marginTop = '12px';
      right.appendChild(nc);
    }
    g.appendChild(right);
    body.appendChild(g);
    if (j.heatmap) {
      var hm = j.heatmap;
      var best = null;
      hm.grid.forEach(function (r, d) { r.forEach(function (v, h) { if (!best || v > best[2]) best = [d, h, v]; }); });
      var heat = D.heatmap(hm.grid, hm.days);
      heat.firstChild.firstChild.setAttribute('aria-label', 'Заявки по дням недели и часам. ' + (best && best[2] ? 'Больше всего: ' + hm.days[best[0]] + ', ' + best[1] + ':00 — ' + best[2] + '.' : 'Заявок нет.'));
      var hc = card(D.withTable('Когда приходят заявки (день недели × час, по МСК)', hm.total ? heat : stateBox('Заявок за период нет.', false), function () {
        var hours = []; for (var h = 0; h < 24; h++) hours.push(String(h));
        return D.table(['День'].concat(hours), hm.grid.map(function (r, d) { return [hm.days[d]].concat(r.map(function (v) { return v ? String(v) : ''; })); }), hours.map(function (x, i) { return i + 1; }));
      }));
      hc.appendChild(el('p', 'note', 'Темнее — больше заявок. Помогает выбрать часы показа рекламы и время, когда точно нужно быть на связи.'));
      hc.style.marginTop = '12px';
      body.appendChild(hc);
    } else if (j.errors && j.errors.db) body.appendChild(stateBox('База заявок: ' + j.errors.db, true));
  };

  /* 9. Заявки */
  var STATUS_NEEDS = { trial: true, paid: true, lost: true };
  RENDER.leads = function (body, j) {
    var o = j.options;
    var sch = j.schema;
    var top = el('div', 'leads-top');
    if (sch.status) {
      if (j.scope === 'unanswered') {
        top.appendChild(el('span', 'counter is-hot', 'Все новые заявки без ответа: ' + num(j.total)));
        var back = el('button', 'link', 'Вернуться к заявкам за период');
        back.type = 'button';
        back.addEventListener('click', function () { state.leads.scope = ''; state.leads.p = 1; load('leads'); });
        top.appendChild(back);
      } else {
        var cnt = el('button', 'btn btn--ghost btn--small counter' + (j.unanswered ? ' is-hot' : ''), 'Новых без ответа: ' + num(j.unanswered) + (j.overdue ? ' · из них дольше 30 мин: ' + num(j.overdue) : ''));
        cnt.type = 'button';
        cnt.title = 'Показать все новые заявки без ответа (за всё время)';
        cnt.addEventListener('click', function () { state.leads.scope = 'unanswered'; state.leads.p = 1; load('leads'); });
        top.appendChild(cnt);
      }
    }
    var addBtn = el('button', 'btn btn--small', '+ Добавить заявку');
    addBtn.type = 'button';
    addBtn.disabled = !(sch.status && sch.manual && sch.channel);
    if (addBtn.disabled) addBtn.title = 'Сначала выполните SQL из инструкции';
    top.appendChild(addBtn);
    body.appendChild(top);
    if (!sch.status) body.appendChild(stateBox('Статусы заявок пока недоступны. Выполните SQL из инструкции (шаги 1–5) — появятся статусы, пробные, оплаты и ручные заявки.', false));
    var addBox = el('div', 'card addform');
    addBox.hidden = true;
    addBtn.addEventListener('click', function () { addBox.hidden = !addBox.hidden; if (!addBox.hidden && !addBox.firstChild) addBox.appendChild(addForm(o)); });
    body.appendChild(addBox);

    var main = el('div', 'card');
    var filters = el('div', 'leads-filters');
    var fs = select([['', 'Все статусы']].concat(entries(o.statuses)), state.leads.status, 'Статус');
    var fc = select([['', 'Все каналы']].concat(entries(o.channels)), state.leads.channel, 'Канал');
    var q = el('input', 'field');
    q.type = 'search'; q.placeholder = 'Поиск по имени или телефону'; q.value = state.leads.q; q.setAttribute('aria-label', 'Поиск по имени или телефону');
    if (!sch.status) fs.disabled = true;
    fs.addEventListener('change', function () { state.leads.status = fs.value; state.leads.p = 1; load('leads'); });
    fc.addEventListener('change', function () { state.leads.channel = fc.value; state.leads.p = 1; load('leads'); });
    var tq = null;
    q.addEventListener('input', function () { clearTimeout(tq); tq = setTimeout(function () { state.leads.q = q.value.trim(); state.leads.p = 1; load('leads'); }, 450); });
    filters.appendChild(fs); filters.appendChild(fc); filters.appendChild(q);
    main.appendChild(filters);

    // таблица (компьютер)
    var tw = el('div', 'lt-wrap xscroll');
    var t = el('table', 'tbl lt');
    var heads = ['Дата (МСК)', 'Имя', 'Телефон', 'Возраст', 'Курс', 'Филиал', 'Канал', 'Статус', 'До контакта'];
    var htr = el('tr');
    heads.forEach(function (h, i) { var th = el('th', i === 8 ? 'num' : '', h); th.scope = 'col'; htr.appendChild(th); });
    var thead = el('thead'); thead.appendChild(htr); t.appendChild(thead);
    var tb = el('tbody');
    // карточки (телефон)
    var cards = el('div', 'lcards');
    j.rows.forEach(function (r) {
      var tr = el('tr', r.overdue ? 'is-overdue' : '');
      var cellDate = el('td');
      cellDate.appendChild(el('div', '', r.date));
      if (r.overdue) cellDate.appendChild(el('span', 'wait', '⚠ ждёт ' + minutesText(r.wait_min)));
      tr.appendChild(cellDate);
      var nm = el('td'); nm.textContent = r.name || '—'; tr.appendChild(nm);
      var ph = el('td'); ph.appendChild(phoneBtn(r)); tr.appendChild(ph);
      tr.appendChild(el('td', '', r.age || '—'));
      var src = el('td', '', r.source_label); if (r.manual) src.appendChild(el('span', 'ms', 'добавлена вручную')); tr.appendChild(src);
      tr.appendChild(el('td', '', o.branches[r.branch] || '—'));
      var chc = el('td', '', r.channel_label); if (r.utm) chc.appendChild(el('span', 'ms', r.utm)); if (r.channel_manual) chc.appendChild(el('span', 'ms', 'канал указан вручную')); tr.appendChild(chc);
      var stc = el('td');
      var editorRow = el('tr', 'editor'); editorRow.hidden = true;
      var edTd = el('td'); edTd.colSpan = heads.length; editorRow.appendChild(edTd);
      stc.appendChild(statusControl(r, o, sch, function (status) { openEditor(edTd, editorRow, r, o, sch, status); }));
      tr.appendChild(stc);
      tr.appendChild(el('td', 'num', r.status === 'new' ? '—' : minutesText(r.contact_min)));
      tb.appendChild(tr);
      tb.appendChild(editorRow);

      var c = el('div', 'lcard' + (r.overdue ? ' is-overdue' : ''));
      var ct = el('div', 'lcard__top');
      ct.appendChild(el('span', '', r.date));
      if (r.overdue) ct.appendChild(el('span', 'wait', '⚠ ждёт ' + minutesText(r.wait_min)));
      c.appendChild(ct);
      c.appendChild(el('div', 'lcard__name', (r.name || '—') + (r.age ? ' · ' + r.age + (/^\d+$/.test(r.age) ? ' лет' : '') : '')));
      var pr = el('div'); pr.appendChild(phoneBtn(r)); c.appendChild(pr);
      c.appendChild(el('div', 'lcard__meta', [r.source_label, o.branches[r.branch], r.channel_label].filter(Boolean).join(' · ')));
      var box = el('div', 'editor-box'); box.hidden = true;
      var row2 = el('div', 'lcard__row');
      row2.appendChild(statusControl(r, o, sch, function (status) { openEditor(box, box, r, o, sch, status); }));
      if (r.status && r.status !== 'new' && r.contact_min !== null) row2.appendChild(el('span', 'small muted', 'ответили через ' + minutesText(r.contact_min)));
      c.appendChild(row2);
      c.appendChild(box);
      cards.appendChild(c);
    });
    if (!j.rows.length) { var e = el('tr'); var td = el('td', 'muted', 'Заявок не найдено'); td.colSpan = heads.length; e.appendChild(td); tb.appendChild(e); cards.appendChild(el('p', 'muted', 'Заявок не найдено')); }
    t.appendChild(tb);
    tw.appendChild(t);
    main.appendChild(tw);
    main.appendChild(cards);
    // страницы по 25
    if (j.pages > 1) {
      var pg = el('nav', 'pager');
      pg.setAttribute('aria-label', 'Страницы заявок');
      pg.appendChild(el('span', 'small muted', 'Всего ' + num(j.total) + ' · '));
      for (var i = 1; i <= j.pages; i++) {
        if (j.pages > 9 && i > 2 && i < j.pages - 1 && Math.abs(i - j.page) > 1) { if (i === 3 || i === j.pages - 2) pg.appendChild(el('span', 'muted', '…')); continue; }
        (function (n) {
          var b = el('button', 'btn btn--ghost btn--small', String(n));
          b.type = 'button';
          if (n === j.page) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', function () { state.leads.p = n; load('leads'); document.getElementById('leads').scrollIntoView({ block: 'start' }); });
          pg.appendChild(b);
        })(i);
      }
      main.appendChild(pg);
    } else main.appendChild(el('p', 'small muted', 'Всего ' + num(j.total)));
    body.appendChild(main);
    // почему не купили
    if (sch.status) {
      var why = j.reasons.length
        ? D.withTable('Почему не купили (отказы за период)', D.hbars(j.reasons.map(function (r) { return { label: r.label, value: r.value }; }), { name: 'Отказов' }), function () {
          return D.table(['Причина', 'Отказов'], j.reasons.map(function (r) { return [r.label, num(r.value)]; }), [1]);
        })
        : (function () { var w = el('div'); w.appendChild(el('h3', '', 'Почему не купили')); w.appendChild(el('p', 'muted', 'Отказов за период нет. При статусе «Отказ» выбирается причина — здесь появится разбивка.')); return w; })();
      var wc = card(why); wc.style.marginTop = '12px';
      body.appendChild(wc);
    }
  };

  function phoneBtn(r) {
    if (!r.phone) return el('span', 'muted', '—');
    var b = el('button', 'phone', r.phone);
    b.type = 'button';
    b.title = 'Показать номер полностью';
    b.addEventListener('click', function () {
      b.disabled = true;
      post('phone', { id: r.id }).then(function (res) {
        var a = el('a', '', res.phone);
        a.href = 'tel:' + res.tel;
        b.replaceWith(a);
      }).catch(function (e) { b.disabled = false; b.title = e.message; });
    });
    return b;
  }

  function statusControl(r, o, sch, onNeedEditor) {
    var w = el('div');
    w.style.display = 'flex'; w.style.gap = '6px'; w.style.alignItems = 'center'; w.style.flexWrap = 'wrap';
    if (!sch.status || !r.status) { w.appendChild(el('span', 'muted', '—')); return w; }
    // выпадающий список и есть цветная метка статуса: цвет + текст
    var s = select(entries(o.statuses), r.status, 'Статус заявки ' + (r.name || ''));
    s.className = 'field st st-' + r.status;
    s.addEventListener('change', function () {
      var v = s.value;
      if (STATUS_NEEDS[v]) { onNeedEditor(v); return; }
      s.disabled = true;
      post('lead_update', { id: r.id, status: v }).then(afterLeadChange).catch(function (e) { s.disabled = false; s.value = r.status; alertBox(w, e.message); });
    });
    var ed = el('button', 'btn btn--ghost btn--small', '✎');
    ed.type = 'button';
    ed.title = 'Изменить: дата пробного, оплата, заметка, филиал, канал';
    ed.setAttribute('aria-label', 'Изменить заявку ' + (r.name || ''));
    ed.addEventListener('click', function () { onNeedEditor(s.value); });
    w.appendChild(s);
    w.appendChild(ed);
    if (r.status === 'lost' && r.lost_reason) w.appendChild(el('span', 'ms', o.reasons[r.lost_reason] || r.lost_reason));
    if (r.status === 'trial' && r.trial_at) w.appendChild(el('span', 'ms', 'пробное ' + dateTimeRu(r.trial_at)));
    if (r.paid_amount) w.appendChild(el('span', 'ms', rub(r.paid_amount)));
    if (r.note) w.appendChild(el('span', 'ms', '✎ ' + r.note));
    return w;
  }
  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  /** «2026-10-05T17:00» → «5 окт 17:00» */
  function dateTimeRu(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(v || '');
    return m ? (+m[3]) + '\u00a0' + MONTHS[+m[2] - 1] + ' ' + m[4] + ':' + m[5] : (v || '');
  }
  function alertBox(parent, text) { var m = el('span', 'form-msg is-err', text); parent.appendChild(m); setTimeout(function () { m.remove(); }, 6000); }

  function openEditor(host, toggleEl, r, o, sch, status) {
    host.textContent = '';
    toggleEl.hidden = false;
    var f = el('form');
    var g = el('div', 'editor__grid');
    var field = function (label, node, cls) { var w = el('label', cls || ''); w.appendChild(el('span', 'lbl', label)); w.appendChild(node); g.appendChild(w); return w; };
    var st = select(entries(o.statuses), status || r.status, 'Статус');
    field('Статус', st);
    var trial = el('input', 'field'); trial.type = 'datetime-local'; trial.value = r.trial_at || '';
    var wTrial = field('Дата и время пробного', trial);
    var amount = el('input', 'field'); amount.type = 'number'; amount.min = '0'; amount.step = '100'; amount.inputMode = 'numeric'; amount.value = r.paid_amount || ''; amount.placeholder = 'например, 7000';
    var wAmount = field('Сумма оплаты, ₽', amount);
    var reason = select([['', 'Выберите причину']].concat(entries(o.reasons)), r.lost_reason || '', 'Причина отказа');
    var wReason = field('Причина отказа', reason);
    var br = select([['', 'Не указан']].concat(entries(o.branches)), r.branch || '', 'Филиал');
    if (sch.branch) field('Филиал', br);
    var chOpts = [['', 'Автоматически: ' + (o.channels[r.channel_auto] || r.channel_auto)]].concat(entries(o.channels));
    var ch = select(chOpts, r.channel_manual ? r.channel : '', 'Канал');
    if (sch.channel) field('Канал (откуда узнали)', ch);
    var note = el('textarea', 'field'); note.value = r.note || ''; note.maxLength = 2000; note.placeholder = 'Например: перезвонить в субботу';
    field('Заметка', note, 'wide');
    function vis() {
      var v = st.value;
      wTrial.hidden = !(v === 'trial' || v === 'attended');
      wAmount.hidden = v !== 'paid';
      wReason.hidden = v !== 'lost';
    }
    st.addEventListener('change', vis);
    vis();
    f.appendChild(g);
    var act = el('div', 'editor__actions');
    var save = el('button', 'btn btn--small', 'Сохранить'); save.type = 'submit';
    var cancel = el('button', 'btn btn--ghost btn--small', 'Отмена'); cancel.type = 'button';
    var msg = el('span', 'form-msg'); msg.setAttribute('role', 'status');
    act.appendChild(save); act.appendChild(cancel); act.appendChild(msg);
    f.appendChild(act);
    cancel.addEventListener('click', function () { toggleEl.hidden = true; host.textContent = ''; });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (st.value === 'lost' && !reason.value) { msg.className = 'form-msg is-err'; msg.textContent = 'Для отказа выберите причину.'; reason.focus(); return; }
      save.disabled = true;
      var data = { id: r.id, status: st.value, note: note.value };
      if (!wTrial.hidden) data.trial_at = trial.value;
      if (!wAmount.hidden) data.paid_amount = amount.value;
      if (!wReason.hidden) data.lost_reason = reason.value;
      if (sch.branch) data.branch = br.value;
      if (sch.channel) data.channel = ch.value;
      post('lead_update', data).then(function (res) { msg.className = 'form-msg is-ok'; msg.textContent = res.message || 'Сохранено'; afterLeadChange(); })
        .catch(function (err) { save.disabled = false; msg.className = 'form-msg is-err'; msg.textContent = err.message; });
    });
    host.appendChild(f);
    st.focus();
  }
  function afterLeadChange() { loadSome(['leads', 'kpi', 'funnel', 'channels', 'insights', 'flow']); }

  function addForm(o) {
    var f = el('form');
    f.appendChild(el('h3', '', 'Новая заявка из мессенджера или звонка'));
    var g = el('div', 'editor__grid');
    var field = function (label, node, cls) { var w = el('label', cls || ''); w.appendChild(el('span', 'lbl', label)); w.appendChild(node); g.appendChild(w); return node; };
    var name = field('Имя', Object.assign(el('input', 'field'), { required: true, maxLength: 100, autocomplete: 'off' }));
    var phone = field('Телефон', Object.assign(el('input', 'field'), { required: true, type: 'tel', placeholder: '+7 917 123-45-67', autocomplete: 'off' }));
    var age = field('Возраст ребёнка', Object.assign(el('input', 'field'), { maxLength: 16 }));
    var src = field('Курс', select(entries(o.sources), 'electronics', 'Курс'));
    var ch = field('Откуда узнали (канал)', select([['', 'Выберите канал']].concat(entries(o.channels)), '', 'Канал'));
    var br = field('Филиал', select([['', 'Не указан']].concat(entries(o.branches)), '', 'Филиал'));
    var when = field('Когда обратились (если не сейчас)', Object.assign(el('input', 'field'), { type: 'datetime-local' }));
    var note = field('Заметка', Object.assign(el('textarea', 'field'), { maxLength: 2000 }), 'wide');
    f.appendChild(g);
    var act = el('div', 'editor__actions');
    var save = el('button', 'btn btn--small', 'Добавить заявку'); save.type = 'submit';
    var msg = el('span', 'form-msg'); msg.setAttribute('role', 'status');
    act.appendChild(save); act.appendChild(msg);
    f.appendChild(act);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ch.value) { msg.className = 'form-msg is-err'; msg.textContent = 'Выберите канал — откуда узнали.'; ch.focus(); return; }
      save.disabled = true;
      post('lead_add', { name: name.value, phone: phone.value, age: age.value, source: src.value, channel: ch.value, branch: br.value, created_at: when.value, note: note.value })
        .then(function (res) { msg.className = 'form-msg is-ok'; msg.textContent = res.message; f.reset(); save.disabled = false; afterLeadChange(); })
        .catch(function (err) { save.disabled = false; msg.className = 'form-msg is-err'; msg.textContent = err.message; });
    });
    return f;
  }

  /* 10. Расходы */
  RENDER.spend = function (body, j) {
    var c = el('div', 'card');
    if (!j.enabled) c.appendChild(stateBox('Таблицы расходов пока нет. Выполните SQL из инструкции (шаг 4) — появится форма.', false));
    if (j.enabled) {
      var f = el('form', 'spend-form');
      var field = function (label, node, cls) { var w = el('label', cls || ''); w.appendChild(el('span', 'lbl', label)); w.appendChild(node); f.appendChild(w); return node; };
      var month = field('Месяц', Object.assign(el('input', 'field'), { type: 'month', value: j.default_month, required: true }));
      var ch = field('Канал', select([['', 'Выберите канал']].concat(entries(j.channels)), '', 'Канал'));
      var amount = field('Сумма, ₽', Object.assign(el('input', 'field'), { type: 'number', min: '1', step: '1', required: true, inputMode: 'numeric' }));
      var comment = field('Комментарий', Object.assign(el('input', 'field'), { maxLength: 255, placeholder: 'например, продвижение в Яндекс Бизнесе' }), 'wide');
      var btnW = el('div');
      var add = el('button', 'btn', 'Добавить'); add.type = 'submit';
      btnW.appendChild(add); f.appendChild(btnW);
      var msg = el('p', 'form-msg'); msg.setAttribute('role', 'status');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!ch.value) { msg.className = 'form-msg is-err'; msg.textContent = 'Выберите канал.'; return; }
        add.disabled = true;
        post('spend_add', { month: month.value, channel: ch.value, amount: amount.value, comment: comment.value })
          .then(function () { loadSome(['spend', 'kpi', 'channels', 'insights']); })
          .catch(function (err) { add.disabled = false; msg.className = 'form-msg is-err'; msg.textContent = err.message; });
      });
      c.appendChild(f);
      c.appendChild(msg);
      if (j.auto_direct) c.appendChild(el('p', 'note', 'Расходы Яндекс Директа подставляются автоматически из Метрики — вносить их не нужно.'));
    }
    var rows = [];
    (j.auto || []).forEach(function (a) { rows.push({ auto: true, month_label: a.month_label, channel_label: 'Яндекс Директ', amount: a.amount, comment: 'из Директа, автоматически' }); });
    rows = rows.concat(j.rows || []);
    if (rows.length) {
      var tw = el('div', 'xscroll');
      tw.style.marginTop = '16px';
      var t = el('table', 'tbl');
      var htr = el('tr');
      ['Месяц', 'Канал', 'Сумма', 'Комментарий', ''].forEach(function (h, i) { var th = el('th', i === 2 ? 'num' : '', h); th.scope = 'col'; htr.appendChild(th); });
      var th = el('thead'); th.appendChild(htr); t.appendChild(th);
      var tb = el('tbody');
      rows.forEach(function (r) { tb.appendChild(spendRow(r, j)); });
      t.appendChild(tb);
      tw.appendChild(t);
      c.appendChild(tw);
    } else if (j.enabled) c.appendChild(el('p', 'muted', 'Расходов пока нет — внесите первый месяц.'));
    if (j.period_total) {
      var parts = (j.period_by_channel || []).map(function (x) { return x.label + ' — ' + rub(x.amount); }).join(', ');
      c.appendChild(el('p', 'note', 'За выбранный период: ' + rub(j.period_total) + (parts ? ' (' + parts + ')' : '') + '. Расход месяца делится на дни поровну, если период не совпадает с месяцем.'));
    }
    body.appendChild(c);
  };
  function spendRow(r, j) {
    var tr = el('tr');
    function view() {
      tr.textContent = '';
      tr.appendChild(el('td', '', r.month_label));
      tr.appendChild(el('td', '', r.channel_label));
      tr.appendChild(el('td', 'num', rub(r.amount)));
      tr.appendChild(el('td', r.auto ? 'muted' : '', r.comment || ''));
      var act = el('td');
      act.style.whiteSpace = 'nowrap';
      if (!r.auto) {
        var e = el('button', 'btn btn--ghost btn--small', 'Изменить'); e.type = 'button';
        var d = el('button', 'btn btn--ghost btn--small', 'Удалить'); d.type = 'button';
        d.style.marginLeft = '6px';
        e.addEventListener('click', edit);
        d.addEventListener('click', function () {
          if (!window.confirm('Удалить расход ' + rub(r.amount) + ' (' + r.channel_label + ', ' + r.month_label + ')?')) return;
          post('spend_delete', { id: r.id }).then(function () { loadSome(['spend', 'kpi', 'channels', 'insights']); }).catch(function (err) { alertBox(act, err.message); });
        });
        act.appendChild(e); act.appendChild(d);
      }
      tr.appendChild(act);
    }
    function edit() {
      tr.textContent = '';
      var m = Object.assign(el('input', 'field'), { type: 'month', value: r.month });
      var ch = select(entries(j.channels), r.channel, 'Канал');
      var a = Object.assign(el('input', 'field'), { type: 'number', min: '1', value: r.amount });
      var cm = Object.assign(el('input', 'field'), { value: r.comment || '', maxLength: 255 });
      [m, ch, a, cm].forEach(function (n) { var td = el('td'); td.appendChild(n); tr.appendChild(td); });
      var act = el('td'); act.style.whiteSpace = 'nowrap';
      var s = el('button', 'btn btn--small', 'Сохранить'); s.type = 'button';
      var c = el('button', 'btn btn--ghost btn--small', 'Отмена'); c.type = 'button'; c.style.marginLeft = '6px';
      s.addEventListener('click', function () {
        s.disabled = true;
        post('spend_update', { id: r.id, month: m.value, channel: ch.value, amount: a.value, comment: cm.value })
          .then(function () { loadSome(['spend', 'kpi', 'channels', 'insights']); })
          .catch(function (err) { s.disabled = false; alertBox(act, err.message); });
      });
      c.addEventListener('click', view);
      act.appendChild(s); act.appendChild(c);
      tr.appendChild(act);
      m.focus();
    }
    view();
    return tr;
  }

  /* 11. Качество данных */
  function qSummary(text) { var s = document.getElementById('quality-sum'); if (s) s.textContent = text; }
  RENDER.quality = function (body, j) {
    var issues = 0;
    var ul = el('ul', 'qlist');
    function item(title, nodes, bad) {
      if (bad) issues++;
      var li = el('li');
      li.appendChild(el('h3', '', (bad ? '⚠ ' : '✓ ') + title));
      nodes.forEach(function (n) { li.appendChild(typeof n === 'string' ? el('p', 'muted small', n) : n); });
      ul.appendChild(li);
    }
    if (j.metrika_error) item('Метрика недоступна', [j.metrika_error], true);
    if (j.composite) {
      var okC = j.composite.reach && j.composite.cta;
      item('Составные цели воронки', [okC ? 'Созданы — шаги 2–3 воронки точные.' :
        'Не созданы: ' + [!j.composite.reach ? '«Воронка: дошли до цены или формы»' : '', !j.composite.cta ? '«Воронка: нажали Записаться»' : ''].filter(Boolean).join(', ') +
        '. Без них шаги 2–3 — оценка (≈). Как создать — в инструкции.'], !okC);
    }
    if (j.missing) {
      var box = el('div');
      j.missing.forEach(function (m) { var s = el('span', 'qtag badge', m.name + ' · ' + m.id); box.appendChild(s); });
      item(j.missing.length ? 'Цели, которых нет в Метрике: ' + j.missing.length : 'Все цели сайта созданы в Метрике', j.missing.length ? ['Создайте их в Метрике (тип «JavaScript-событие», условие «совпадает» с идентификатором):', box] : [], j.missing.length > 0);
    }
    if (j.silent) {
      var sb = el('div');
      j.silent.forEach(function (m) { sb.appendChild(el('span', 'qtag badge', m.name + ' · ' + m.id)); });
      var watch = j.silent.filter(function (m) { return m.watch; }).length;
      item(j.silent.length ? 'Цели без срабатываний за 7 дней: ' + j.silent.length : 'Все цели срабатывали за последние 7 дней',
        j.silent.length ? ['Если цель кнопки записи или заявки молчит неделю — возможно, сломалась кнопка. Редкие цели (публикации, меню) молчать могут.', sb] : [], watch > 0);
    }
    if (j.no_source) {
      var ns = j.no_source;
      var share = ns.total ? 100 * ns.count / ns.total : 0;
      item('Заявки без данных об источнике: ' + num(ns.count) + ' из ' + num(ns.total) + (ns.total ? ' (' + pct(share) + ')' : ''),
        ['Нет ни меток, ни адреса, с которого пришли. Такие заявки считаются «Прямыми заходами». Можно уточнить канал вручную в таблице заявок.'], ns.total >= 30 && share > 40);
    }
    if (j.recon && j.recon.metrika !== null && j.recon.db !== null) {
      var r = j.recon;
      item('Метрика и база: ' + num(r.metrika) + ' и ' + num(r.db) + (r.diff_pct !== null ? ' (расхождение ' + pct(r.diff_pct) + ')' : ''),
        ['Небольшое расхождение нормально: блокировщики рекламы, отключённый JavaScript. Больше 20 % при достаточных данных — повод проверить форму и цель lead_form.' + (r.small ? ' Сейчас данных мало для выводов.' : '')],
        !r.small && r.diff_pct > 20);
    }
    if (j.token) {
      var tk = j.token;
      item('Токен Метрики: выпущен ' + tk.issued + ', действует до ' + tk.expires, [tk.days_left < 0 ? 'Срок, скорее всего, истёк — получите новый токен.' : 'Осталось ' + num(tk.days_left) + ' дн.' + (tk.days_left <= 30 ? ' Пора обновить токен.' : '')], tk.days_left <= 30);
    } else {
      item('Срок токена Метрики не отслеживается', ['Добавьте в dash_config.php строку \'token_issued\' => \'ГГГГ-ММ-ДД\' (дата получения токена) — дашборд предупредит за 30 дней до конца года.'], false);
    }
    if (j.schema) {
      var s = j.schema;
      var miss = [];
      if (!s.status) miss.push('статусы заявок (шаг 1)');
      if (!s.channel || !s.manual) miss.push('канал и ручные заявки (шаг 1)');
      if (!s.log) miss.push('история статусов (шаг 3)');
      if (!s.spend) miss.push('расходы (шаг 4)');
      item(miss.length ? 'База: не выполнен SQL — ' + miss.join(', ') : 'База: все колонки и таблицы на месте', miss.length ? ['Выполните SQL из инструкции в phpMyAdmin.'] : [], miss.length > 0);
    }
    if (j.db_error) item('База заявок недоступна', [j.db_error], true);
    body.appendChild(ul);
    qSummary(issues ? 'Замечаний: ' + issues + ' — цели Метрики, источники заявок, токен и база.' : 'Замечаний нет: цели, источники и токен в порядке.');
  };

  /* ---------- фильтры ---------- */
  function syncSeg(id, attr, value) {
    var g = document.getElementById(id);
    if (!g) return;
    g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset[attr] === value ? 'true' : 'false'); });
  }
  function syncGroup(g) { if (!state.group) syncSeg('f-group', 'group', g); }
  function syncFilters() {
    syncSeg('f-period', 'period', state.period);
    document.getElementById('f-range').classList.toggle('is-open', state.period === 'custom');
    document.getElementById('f-compare').checked = state.compare;
    document.getElementById('f-branch').value = state.branch;
    if (state.group) syncSeg('f-group', 'group', state.group);
    syncSeg('funnel-page', 'page', state.funnelPage);
    syncSeg('behavior-page', 'page', state.behaviorPage);
    if (state.period === 'custom') { document.getElementById('f-from').value = state.from; document.getElementById('f-to').value = state.to; }
  }
  document.getElementById('f-period').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.period === 'custom') {
      syncSeg('f-period', 'period', 'custom');
      document.getElementById('f-range').classList.add('is-open');
      var p = (last.kpi && last.kpi.period) || (last.flow && last.flow.period);
      if (p) { document.getElementById('f-from').value = state.from || p.from; document.getElementById('f-to').value = state.to || p.to; }
      document.getElementById('f-from').focus();
      return;
    }
    state.period = b.dataset.period;
    state.leads.p = 1;
    loadAll();
  });
  document.getElementById('f-apply').addEventListener('click', function () {
    var f = document.getElementById('f-from').value, t = document.getElementById('f-to').value;
    if (!f || !t) { document.getElementById('f-from').focus(); return; }
    state.period = 'custom'; state.from = f; state.to = t; state.leads.p = 1;
    loadAll();
  });
  document.getElementById('f-compare').addEventListener('change', function (e) { state.compare = e.target.checked; loadSome(['insights', 'kpi', 'flow']); });
  document.getElementById('f-branch').addEventListener('change', function (e) { state.branch = e.target.value; state.leads.p = 1; loadAll(); });
  document.getElementById('f-group').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.group = b.dataset.group;
    syncSeg('f-group', 'group', state.group);
    loadSome(['kpi', 'flow']);
  });
  document.getElementById('funnel-page').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.funnelPage = b.dataset.page;
    syncSeg('funnel-page', 'page', state.funnelPage);
    loadSome(['funnel']);
  });
  document.getElementById('behavior-page').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.behaviorPage = b.dataset.page;
    syncSeg('behavior-page', 'page', state.behaviorPage);
    loadSome(['behavior']);
  });
  var refresh = document.getElementById('refresh');
  refresh.addEventListener('click', function () {
    refresh.disabled = true;
    var s = document.getElementById('stamp');
    post('refresh', {}).then(function (j) { s.textContent = j.message || ''; if (j.ok) { fetched = {}; loadAll(); } })
      .catch(function (e) { s.textContent = e.message; })
      .then(function () { setTimeout(function () { refresh.disabled = false; }, 60000); });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.getElementById(a.getAttribute('href').slice(1));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  loadAll();
})();
