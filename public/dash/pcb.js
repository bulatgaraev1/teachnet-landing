/* TeachNet — дашборд /dash, вкладка «Значки и мастер-классы» (/dash/?view=pcb): заявки с /holiday/ и /pcb/
 * (своя таблица pcb_leads) и Метрика направления. Данные — только из api.php после входа.
 * Всё, что пришло из данных, вставляется через textContent. */
(function () {
  'use strict';
  var D = window.DashCharts;
  var el = D.el, num = D.num, pct = D.pct, rub = D.rub;
  var CSRF = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
  var BLOCKS = ['pcb_summary', 'pcb_leads', 'pcb_metrika'];
  var MSK = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
  var MSKDAY = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short' });

  /* ---------- состояние (период — в адресе после #, как на вкладке школы) ---------- */
  var state = { period: '30', from: '', to: '', compare: true, leads: { page: '', status: '', q: '', p: 1, scope: '' } };
  (function readHash() {
    try {
      var h = new URLSearchParams(location.hash.slice(1));
      if (h.get('period')) state.period = h.get('period');
      state.from = h.get('from') || '';
      state.to = h.get('to') || '';
      if (h.get('compare') === '0') state.compare = false;
    } catch (e) { /* адрес без параметров */ }
  })();
  function writeHash() {
    var h = new URLSearchParams();
    h.set('period', state.period);
    if (state.period === 'custom') { h.set('from', state.from); h.set('to', state.to); }
    if (!state.compare) h.set('compare', '0');
    history.replaceState(null, '', location.pathname + location.search + '#' + h.toString());
  }
  function params(extra) {
    var p = new URLSearchParams();
    p.set('period', state.period);
    if (state.period === 'custom') { p.set('from', state.from); p.set('to', state.to); }
    p.set('compare', state.compare ? '1' : '0');
    Object.keys(extra || {}).forEach(function (k) { if (extra[k] !== '' && extra[k] !== null && extra[k] !== undefined) p.set(k, extra[k]); });
    return p.toString();
  }

  /* ---------- загрузка блоков (каждый независимо) ---------- */
  var ctrl = {}, fetched = {};
  function load(block) {
    var sec = document.querySelector('[data-block="' + block + '"]');
    if (!sec) return;
    var body = sec.querySelector('.block__body');
    if (ctrl[block]) ctrl[block].abort();
    var c = new AbortController();
    ctrl[block] = c;
    sec.classList.add('is-loading');
    sec.setAttribute('aria-busy', 'true');
    fetch('api.php?block=' + block + '&' + params(block === 'pcb_leads' ? state.leads : {}), { signal: c.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.status === 401) { location.reload(); throw new Error('Нужно войти'); }
        return r.json().catch(function () { throw new Error('сервер вернул не JSON (ошибка ' + r.status + ')'); });
      })
      .then(function (j) {
        if (c.signal.aborted) return;
        if (j.fetched_at) fetched[block] = j.fetched_at;
        updateStamp();
        body.textContent = '';
        if (j.error) { body.appendChild(stateBox(j.error, true)); return; }
        try { RENDER[block](body, j); } catch (e) { body.textContent = ''; body.appendChild(stateBox('Не удалось показать блок: ' + e.message, true)); }
      })
      .catch(function (e) {
        if (e.name === 'AbortError') return;
        body.textContent = '';
        body.appendChild(stateBox('Не удалось загрузить блок: ' + e.message, true));
      })
      .then(function () { if (ctrl[block] === c) { sec.classList.remove('is-loading'); sec.removeAttribute('aria-busy'); } });
  }
  function loadAll() { writeHash(); syncFilters(); BLOCKS.forEach(load); }
  function updateStamp() {
    var s = document.getElementById('stamp');
    var ts = Object.keys(fetched).map(function (k) { return fetched[k]; }).filter(Boolean);
    if (!ts.length) { s.textContent = 'Заявки — из базы, сразу'; return; }
    var d = new Date(Math.min.apply(null, ts) * 1000);
    var today = MSKDAY.format(new Date()) === MSKDAY.format(d);
    s.textContent = 'Метрика обновлена ' + (today ? 'в ' : MSKDAY.format(d) + ' в ') + MSK.format(d);
  }

  /* ---------- общие элементы ---------- */
  function stateBox(text, isErr) {
    var b = el('div', 'state' + (isErr ? ' state--err' : ''));
    b.setAttribute('role', isErr ? 'alert' : 'note');
    b.appendChild(el('span', '', isErr ? '!' : 'ⓘ'));
    var t = el('div'); t.appendChild(document.createTextNode(text)); b.appendChild(t);
    return b;
  }
  function card() { var c = el('div', 'card'); for (var i = 0; i < arguments.length; i++) if (arguments[i]) c.appendChild(arguments[i]); return c; }
  function entries(obj) { return Object.keys(obj || {}).map(function (k) { return [k, obj[k]]; }); }
  function select(options, value, label) {
    var s = el('select', 'field');
    if (label) s.setAttribute('aria-label', label);
    options.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
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
  /** Карточка-цифра: значение, изменение к прошлому периоду (если включено сравнение), подпись. */
  function kpi(label, value, o) {
    o = o || {};
    var k = el('div', 'kpi');
    k.appendChild(el('div', 'kpi__label', label));
    k.appendChild(el('div', 'kpi__value', o.text !== undefined ? o.text : o.rub ? rub(value) : num(value)));
    if (state.compare && o.prev !== undefined && o.prev !== null) {
      var diff = value - o.prev;
      k.appendChild(el('div', 'kpi__delta', (diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= ') + num(diff) + ' к прошлому периоду (' + num(o.prev) + ')'));
    }
    if (o.sub) k.appendChild(el('div', 'kpi__sub', o.sub));
    return k;
  }
  function bars(title, rows, name) {
    return card(D.withTable(title, rows.length ? D.hbars(rows, { name: name || 'Заявок' }) : el('p', 'muted', 'Нет заявок за период'), function () {
      return D.table([title, name || 'Заявок'], rows.map(function (r) { return [r.label, num(r.value)]; }), [1]);
    }));
  }

  var RENDER = {};

  /* 1. Как идут заявки? */
  RENDER.pcb_summary = function (body, j) {
    if (j.unanswered || j.tg_pending) {
      var top = el('div', 'leads-top');
      if (j.unanswered) {
        var b = el('button', 'btn btn--ghost btn--small counter is-hot', 'Новых без ответа: ' + num(j.unanswered));
        b.type = 'button';
        b.title = 'Показать все новые заявки без ответа (за всё время)';
        b.addEventListener('click', function () { state.leads.scope = 'unanswered'; state.leads.p = 1; load('pcb_leads'); document.getElementById('pcb_leads').scrollIntoView({ block: 'start' }); });
        top.appendChild(b);
      }
      if (j.tg_pending) top.appendChild(el('span', 'small muted', 'Уведомлений в Telegram пока не ушло: ' + num(j.tg_pending) + ' — повторяем автоматически.'));
      body.appendChild(top);
    }
    var ks = el('div', 'kpis');
    j.cards.forEach(function (c) {
      ks.appendChild(kpi(c.label, c.value, { prev: c.prev, rub: c.rub, sub: c.id === 'won' ? 'сумма сделок ' + rub(c.sum) : c.id === 'estimate' ? 'сумма по заявкам, не выручка' : '' }));
    });
    body.appendChild(ks);
    var g = el('div', 'grid2');
    g.style.marginTop = '12px';
    g.appendChild(bars('Форматы', j.formats));
    g.appendChild(bars('Города', j.cities));
    g.appendChild(bars('Откуда пришли', j.channels));
    g.appendChild(bars('Статусы заявок за период', j.statuses));
    body.appendChild(g);
  };

  /* 2. Что с заявками? */
  RENDER.pcb_leads = function (body, j) {
    var o = j.options;
    var top = el('div', 'leads-top');
    if (j.scope === 'unanswered') {
      top.appendChild(el('span', 'counter is-hot', 'Все новые заявки без ответа: ' + num(j.total)));
      var back = el('button', 'link', 'Вернуться к заявкам за период');
      back.type = 'button';
      back.addEventListener('click', function () { state.leads.scope = ''; state.leads.p = 1; load('pcb_leads'); });
      top.appendChild(back);
    } else if (j.unanswered) {
      var cnt = el('button', 'btn btn--ghost btn--small counter is-hot', 'Новых без ответа: ' + num(j.unanswered));
      cnt.type = 'button';
      cnt.addEventListener('click', function () { state.leads.scope = 'unanswered'; state.leads.p = 1; load('pcb_leads'); });
      top.appendChild(cnt);
    }
    body.appendChild(top);

    var main = el('div', 'card');
    var filters = el('div', 'leads-filters');
    var fp = select([['', 'Обе страницы']].concat(entries(o.pages)), state.leads.page, 'Страница');
    var fs = select([['', 'Все статусы']].concat(entries(o.statuses)), state.leads.status, 'Статус');
    var q = el('input', 'field');
    q.type = 'search'; q.placeholder = 'Поиск: имя, компания, город, телефон'; q.value = state.leads.q; q.setAttribute('aria-label', q.placeholder);
    fp.addEventListener('change', function () { state.leads.page = fp.value; state.leads.p = 1; load('pcb_leads'); });
    fs.addEventListener('change', function () { state.leads.status = fs.value; state.leads.p = 1; load('pcb_leads'); });
    var tq = null;
    q.addEventListener('input', function () { clearTimeout(tq); tq = setTimeout(function () { state.leads.q = q.value.trim(); state.leads.p = 1; load('pcb_leads'); }, 450); });
    filters.appendChild(fp); filters.appendChild(fs); filters.appendChild(q);
    main.appendChild(filters);

    var heads = ['Дата (МСК)', 'Что нужно', 'Город и дата', 'Имя', 'Контакт', 'Бюджет', 'Статус', ''];
    var tw = el('div', 'lt-wrap xscroll');
    var t = el('table', 'tbl lt');
    var htr = el('tr');
    heads.forEach(function (h, i) { var th = el('th', i === 5 ? 'num' : '', h); th.scope = 'col'; htr.appendChild(th); });
    var thead = el('thead'); thead.appendChild(htr); t.appendChild(thead);
    var tb = el('tbody');
    var cards = el('div', 'lcards');
    j.rows.forEach(function (r) {
      var tr = el('tr');
      var cDate = el('td'); cDate.appendChild(el('div', '', r.date)); cDate.appendChild(el('span', 'pcb-sub', r.page_label)); tr.appendChild(cDate);
      var cWhat = el('td'); cWhat.appendChild(el('div', '', r.format)); cWhat.appendChild(el('span', 'pcb-sub', r.quantity + (r.design ? ' · ' + r.design : ''))); tr.appendChild(cWhat);
      var cCity = el('td'); cCity.appendChild(el('div', '', r.city || '—')); if (r.event_date) cCity.appendChild(el('span', 'pcb-sub', 'дата ' + r.event_date)); tr.appendChild(cCity);
      var cName = el('td'); cName.appendChild(el('div', '', r.name)); if (r.company) cName.appendChild(el('span', 'pcb-sub', r.company)); tr.appendChild(cName);
      var cCont = el('td'); cCont.appendChild(contactBtn(r)); tr.appendChild(cCont);
      tr.appendChild(el('td', 'num', r.estimate === null ? 'расчёт' : rub(r.estimate)));
      var editorRow = el('tr', 'editor'); editorRow.hidden = true;
      var edTd = el('td'); edTd.colSpan = heads.length; editorRow.appendChild(edTd);
      var detRow = el('tr', 'editor'); detRow.hidden = true;
      var detTd = el('td'); detTd.colSpan = heads.length; detTd.appendChild(details(r)); detRow.appendChild(detTd);
      var cSt = el('td'); cSt.appendChild(statusControl(r, o, function (st) { openEditor(edTd, editorRow, r, o, st); })); tr.appendChild(cSt);
      var cMore = el('td');
      var more = el('button', 'pcb-more', 'Подробнее');
      more.type = 'button'; more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', function () { detRow.hidden = !detRow.hidden; more.setAttribute('aria-expanded', String(!detRow.hidden)); more.textContent = detRow.hidden ? 'Подробнее' : 'Скрыть'; });
      cMore.appendChild(more); tr.appendChild(cMore);
      tb.appendChild(tr); tb.appendChild(detRow); tb.appendChild(editorRow);

      var c = el('div', 'lcard');
      var ct = el('div', 'lcard__top'); ct.appendChild(el('span', '', r.date)); ct.appendChild(el('span', '', r.page_label)); c.appendChild(ct);
      c.appendChild(el('div', 'lcard__name', r.name + (r.company ? ' · ' + r.company : '')));
      var pr = el('div'); pr.appendChild(contactBtn(r)); c.appendChild(pr);
      c.appendChild(el('div', 'lcard__meta', [r.format, r.quantity, r.city, r.event_date && 'дата ' + r.event_date, r.estimate === null ? 'расчёт' : rub(r.estimate)].filter(Boolean).join(' · ')));
      var box = el('div', 'editor-box'); box.hidden = true;
      var row2 = el('div', 'lcard__row');
      row2.appendChild(statusControl(r, o, function (st) { openEditor(box, box, r, o, st); }));
      c.appendChild(row2);
      var det = el('details'); det.appendChild(el('summary', 'small', 'Подробнее')); det.appendChild(details(r)); c.appendChild(det);
      c.appendChild(box);
      cards.appendChild(c);
    });
    if (!j.rows.length) { var e = el('tr'); var td = el('td', 'muted', 'Заявок не найдено'); td.colSpan = heads.length; e.appendChild(td); tb.appendChild(e); cards.appendChild(el('p', 'muted', 'Заявок не найдено')); }
    t.appendChild(tb); tw.appendChild(t);
    main.appendChild(tw); main.appendChild(cards);
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
          b.addEventListener('click', function () { state.leads.p = n; load('pcb_leads'); document.getElementById('pcb_leads').scrollIntoView({ block: 'start' }); });
          pg.appendChild(b);
        })(i);
      }
      main.appendChild(pg);
    } else main.appendChild(el('p', 'small muted', 'Всего ' + num(j.total)));
    body.appendChild(main);
  };

  /** Подробности заявки: комментарий, примерка, источник, согласие. */
  function details(r) {
    var g = el('div', 'pcb-details');
    var item = function (label, value, wide) { if (!value) return; var d = el('div', wide ? 'wide' : ''); d.appendChild(el('b', '', label)); d.appendChild(document.createTextNode(value)); g.appendChild(d); };
    item('Комментарий', r.comment, true);
    item('Примерка', r.tryon, true);
    item('Возраст участников', r.age);
    item('Название для значка', r.badge_text);
    item('Расчёт на сайте', r.estimate_label);
    item('Откуда пришли', r.channel + (r.utm ? ' · ' + r.utm : ''));
    item('Страница-источник', r.referrer);
    item('Согласие на обработку данных', r.consent);
    item('Уведомление в Telegram', r.notified ? 'отправлено' : 'ещё не ушло — повторим автоматически');
    return g;
  }

  /** Телефон или Telegram под маской — полностью по клику. */
  function contactBtn(r) {
    if (!r.contact) return el('span', 'muted', '—');
    var b = el('button', 'phone', r.contact);
    b.type = 'button';
    b.title = 'Показать контакт полностью';
    b.addEventListener('click', function () {
      b.disabled = true;
      post('pcb_contact', { id: r.id }).then(function (res) {
        var w = el('span', 'contact-links');
        if (res.phone) { var a = el('a', '', res.phone); a.href = 'tel:' + res.tel; w.appendChild(a); }
        if (res.telegram) { var t = el('a', '', res.telegram); t.href = res.tg_link; t.target = '_blank'; t.rel = 'noopener noreferrer'; w.appendChild(t); }
        b.replaceWith(w);
      }).catch(function (e) { b.disabled = false; b.title = e.message; });
    });
    return b;
  }

  function statusControl(r, o, onEdit) {
    var w = el('div');
    w.style.display = 'flex'; w.style.gap = '6px'; w.style.alignItems = 'center'; w.style.flexWrap = 'wrap';
    var s = select(entries(o.statuses), r.status, 'Статус заявки ' + r.name);
    s.className = 'field st st-' + r.status;
    s.addEventListener('change', function () {
      s.disabled = true;
      post('pcb_update', { id: r.id, status: s.value }).then(afterChange).catch(function (e) { s.disabled = false; s.value = r.status; alertBox(w, e.message); });
    });
    var ed = el('button', 'btn btn--ghost btn--small', '✎');
    ed.type = 'button';
    ed.title = 'Изменить: сумма сделки, заметка';
    ed.setAttribute('aria-label', 'Изменить заявку ' + r.name);
    ed.addEventListener('click', function () { onEdit(s.value); });
    w.appendChild(s); w.appendChild(ed);
    if (r.deal_amount) w.appendChild(el('span', 'ms', rub(r.deal_amount)));
    if (r.note) w.appendChild(el('span', 'ms', '✎ ' + r.note));
    return w;
  }
  function alertBox(parent, text) { var m = el('span', 'form-msg is-err', text); parent.appendChild(m); setTimeout(function () { m.remove(); }, 6000); }

  function openEditor(host, toggleEl, r, o, status) {
    host.textContent = '';
    toggleEl.hidden = false;
    var f = el('form');
    var g = el('div', 'editor__grid');
    var field = function (label, node, cls) { var w = el('label', cls || ''); w.appendChild(el('span', 'lbl', label)); w.appendChild(node); g.appendChild(w); return node; };
    var st = field('Статус', select(entries(o.statuses), status || r.status, 'Статус'));
    var amount = el('input', 'field'); amount.type = 'number'; amount.min = '0'; amount.step = '100'; amount.inputMode = 'numeric'; amount.value = r.deal_amount || ''; amount.placeholder = 'например, 39900';
    field('Сумма сделки, ₽', amount);
    var note = el('textarea', 'field'); note.value = r.note || ''; note.maxLength = 2000; note.placeholder = 'Например: прислать макет до пятницы';
    field('Заметка', note, 'wide');
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
      save.disabled = true;
      post('pcb_update', { id: r.id, status: st.value, deal_amount: amount.value, note: note.value })
        .then(function (res) { msg.className = 'form-msg is-ok'; msg.textContent = res.message || 'Сохранено'; afterChange(); })
        .catch(function (err) { save.disabled = false; msg.className = 'form-msg is-err'; msg.textContent = err.message; });
    });
    host.appendChild(f);
    st.focus();
  }
  function afterChange() { load('pcb_leads'); load('pcb_summary'); }

  /* 3. Что говорит Метрика? */
  RENDER.pcb_metrika = function (body, j) {
    if (!j.configured) {
      body.appendChild(stateBox('Счётчик Метрики для направления ещё не создан. Когда создадите, впишите его номер в dash_config.php строкой \'pcb_counter_id\' => 12345678 — здесь появятся визиты и цели: lead_submit, tryon_upload, tryon_download, tryon_discuss (JavaScript-события). Токен — тот же, что у школьного дашборда.', false));
      return;
    }
    var ks = el('div', 'kpis');
    ks.appendChild(kpi('Визиты', j.visits, { prev: j.visits_prev }));
    ks.appendChild(kpi('Посетители', j.users));
    var lead = j.goals.filter(function (g) { return g.id === 'lead_submit'; })[0];
    if (lead && lead.found && j.visits) ks.appendChild(kpi('Конверсия в заявку', null, { text: pct(100 * lead.value / j.visits), sub: 'заявок на 100 визитов' }));
    j.goals.forEach(function (g) {
      if (g.found) ks.appendChild(kpi(g.label, g.value, { prev: g.prev }));
      else { var k = el('div', 'kpi'); k.appendChild(el('div', 'kpi__label', g.label)); k.appendChild(el('div', 'kpi__nodata', 'Цели ' + g.id + ' нет в счётчике')); ks.appendChild(k); }
    });
    body.appendChild(ks);
    if (j.sources.length) {
      var t = D.table(['Источник', 'Визиты', 'Заявки'], j.sources.map(function (s) { return [s.label, num(s.visits), s.leads === null ? '—' : num(s.leads)]; }), [1, 2]);
      var c = card(el('h3', '', 'Источники визитов'), t);
      c.style.marginTop = '12px';
      body.appendChild(c);
    }
  };

  /* ---------- фильтры ---------- */
  function syncSeg(id, attr, value) {
    document.querySelectorAll('#' + id + ' button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + attr) === value)); });
  }
  function syncFilters() {
    syncSeg('f-period', 'period', state.period);
    document.getElementById('f-range').classList.toggle('is-open', state.period === 'custom');
    document.getElementById('f-from').value = state.from;
    document.getElementById('f-to').value = state.to;
    document.getElementById('f-compare').checked = state.compare;
  }
  document.getElementById('f-period').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = b.getAttribute('data-period');
    if (p === 'custom') { state.period = 'custom'; syncFilters(); document.getElementById('f-from').focus(); return; }
    state.period = p; state.leads.p = 1; loadAll();
  });
  document.getElementById('f-apply').addEventListener('click', function () {
    var f = document.getElementById('f-from').value, t = document.getElementById('f-to').value;
    if (!f || !t) return;
    state.period = 'custom'; state.from = f; state.to = t; state.leads.p = 1; loadAll();
  });
  document.getElementById('f-compare').addEventListener('change', function (e) { state.compare = e.target.checked; loadAll(); });
  var refresh = document.getElementById('refresh');
  refresh.addEventListener('click', function () {
    refresh.disabled = true;
    post('refresh', {}).catch(function () {}).then(function () { refresh.disabled = false; loadAll(); });
  });
  loadAll();
})();
