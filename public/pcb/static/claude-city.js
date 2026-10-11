/* TEACHNET: подсказки городов России в поле «Город».
   Нужны для единого формата в базе: в заявку уходит каноническое название из справочника ФИАС,
   регион и код ФИАС (скрытые поля city_region и city_fias_id). Если города нет в справочнике,
   поле принимает текст как есть и помечает его. */
(() => {
  const input = document.getElementById('city');
  const data = window.TEACHNET_CITIES;
  if (!input || !data) return;
  const list = document.getElementById('city-list');
  const hint = document.getElementById('city-hint');
  const fiasEl = document.getElementById('city-fias');
  const regionEl = document.getElementById('city-region');
  const FEDERAL = 'город федерального значения';
  const LIMIT = 8;

  const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–—.,()]+/g, ' ').trim();
  const cities = data.list.map(([name, r, pop, fias]) => {
    const region = data.regions[r];
    return { name, region, pop, fias, n: norm(name), words: norm(name).split(' '), all: norm(name + ' ' + (region === FEDERAL ? '' : region)).split(' ') };
  });
  const byFias = new Map(cities.map(c => [c.fias, c]));
  const nameCount = new Map();
  cities.forEach(c => nameCount.set(c.n, (nameCount.get(c.n) || 0) + 1));
  const find = name => cities.find(c => c.name === name);

  // Сокращения и разговорные названия
  const ALIASES = {
    'спб': 'Санкт-Петербург', 'питер': 'Санкт-Петербург', 'санкт петербург': 'Санкт-Петербург', 'ленинград': 'Санкт-Петербург', 'с пб': 'Санкт-Петербург',
    'мск': 'Москва', 'екб': 'Екатеринбург', 'екат': 'Екатеринбург', 'ебург': 'Екатеринбург', 'свердловск': 'Екатеринбург',
    'нск': 'Новосибирск', 'новосиб': 'Новосибирск', 'нн': 'Нижний Новгород', 'н новгород': 'Нижний Новгород', 'нижний': 'Нижний Новгород', 'горький': 'Нижний Новгород',
    'челны': 'Набережные Челны', 'наб челны': 'Набережные Челны', 'кзн': 'Казань', 'ростов на дону': 'Ростов-на-Дону', 'ростов дон': 'Ростов-на-Дону'
  };
  // Чаще всего имеют в виду город-миллионник: поднимаем его в подсказке, но сами не выбираем
  const BOOST = { 'ростов': 'Ростов-на-Дону', 'новгород': 'Великий Новгород' };
  // Текст, набранный в английской раскладке: «rfpfym» → «казань»
  const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`", RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
  const layout = s => s.toLowerCase().split('').map(ch => { const i = EN.indexOf(ch); return i < 0 ? ch : RU[i]; }).join('');
  // Латиница: «kazan» → «казан»
  const TR = [['shch', 'щ'], ['sch', 'щ'], ['yo', 'е'], ['zh', 'ж'], ['kh', 'х'], ['ts', 'ц'], ['ch', 'ч'], ['sh', 'ш'], ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'],
              ['a', 'а'], ['b', 'б'], ['v', 'в'], ['w', 'в'], ['g', 'г'], ['d', 'д'], ['e', 'е'], ['z', 'з'], ['i', 'и'], ['j', 'й'], ['y', 'ы'], ['k', 'к'], ['l', 'л'],
              ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'], ['h', 'х'], ['c', 'к'], ['x', 'кс'], ["'", 'ь']];
  const translit = s => { let out = '', i = 0; s = s.toLowerCase(); while (i < s.length) { const p = TR.find(([l]) => s.startsWith(l, i)); if (p) { out += p[1]; i += p[0].length; } else { out += s[i]; i++; } } return out; };

  function score(c, q, qt) {
    if (c.n === q) return 0;
    if (c.n.startsWith(q)) return 1;
    if (qt.length && c.words.some(w => w.startsWith(qt[0])) && qt.every(t => c.all.some(w => w.startsWith(t)))) return 2;
    if (q.length >= 3 && c.n.includes(q)) return 3;
    return -1;
  }
  function lev1(a, b) { // не больше одной опечатки
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++e > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  const POPULAR = ['Казань', 'Москва', 'Санкт-Петербург', 'Набережные Челны', 'Нижний Новгород', 'Екатеринбург', 'Самара', 'Уфа'].map(find).filter(Boolean);
  function search(raw) {
    if (!norm(raw)) return POPULAR;
    const variants = [norm(raw)];
    if (/[a-z]/i.test(raw)) variants.push(norm(layout(raw)), norm(translit(raw)));
    const found = new Map();
    for (const q of variants) {
      if (!q) continue;
      const alias = ALIASES[q] || BOOST[q];
      if (alias) { const c = find(alias); if (c) found.set(c.fias, { c, s: -1 }); }
      const qt = q.split(' ');
      for (const c of cities) {
        const s = score(c, q, qt);
        if (s >= 0 && (!found.has(c.fias) || found.get(c.fias).s > s)) found.set(c.fias, { c, s });
      }
    }
    if (!found.size && norm(raw).length >= 4) {
      const q = norm(raw);
      for (const c of cities) if (lev1(c.n.slice(0, q.length + 1), q) || lev1(c.n, q)) found.set(c.fias, { c, s: 4 });
    }
    return [...found.values()].sort((a, b) => a.s - b.s || b.c.pop - a.c.pop).slice(0, LIMIT).map(x => x.c);
  }

  /* ---------- состояние поля ---------- */
  let items = [], active = -1;
  function setChosen(c) {
    if (c) {
      input.value = c.name;
      input.dataset.fias = c.fias;
      input.dataset.region = c.region === FEDERAL ? '' : c.region;
      delete input.dataset.free;
      if (fiasEl) fiasEl.value = c.fias;
      if (regionEl) regionEl.value = input.dataset.region;
      showHint(c.region === FEDERAL ? 'Город федерального значения' : c.region, 'ok');
    } else {
      delete input.dataset.fias; delete input.dataset.region;
      if (fiasEl) fiasEl.value = ''; if (regionEl) regionEl.value = '';
    }
  }
  function showHint(text, kind) {
    if (!hint) return;
    hint.textContent = text || '';
    hint.className = 'city-hint' + (kind ? ' is-' + kind : '');
  }
  // Список строим через DOM (без innerHTML): совпадение подсвечиваем элементом <mark>
  function nameNode(name, q) {
    const span = document.createElement('span'); span.className = 'city-name';
    const n = norm(name), i = q ? n.indexOf(q) : -1;
    if (i < 0 || !q) { span.textContent = name; return span; }
    const m = document.createElement('mark'); m.textContent = name.slice(i, i + q.length);
    span.append(name.slice(0, i), m, name.slice(i + q.length));
    return span;
  }
  function open(results, q) {
    items = results; active = results.length ? 0 : -1;
    if (!results.length) { close(); return; }
    list.replaceChildren(...results.map((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.id = 'city-opt-' + i; li.dataset.i = String(i);
      li.className = 'city-opt' + (i === active ? ' is-active' : ''); li.setAttribute('aria-selected', String(i === active));
      const reg = document.createElement('span'); reg.className = 'city-region';
      reg.textContent = c.region === FEDERAL ? 'город федерального значения' : c.region;
      li.append(nameNode(c.name, q), reg);
      return li;
    }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', active >= 0 ? 'city-opt-' + active : '');
  }
  function close() {
    list.hidden = true; list.replaceChildren(); items = []; active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function move(d) {
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    list.querySelectorAll('.city-opt').forEach((li, i) => { li.classList.toggle('is-active', i === active); li.setAttribute('aria-selected', String(i === active)); });
    input.setAttribute('aria-activedescendant', 'city-opt-' + active);
    const li = list.children[active]; if (li) li.scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const c = items[i]; if (!c) return;
    setChosen(c); close();
    input.dispatchEvent(new Event('input', { bubbles: true }));   // пересчитать бюджет и выезд
  }
  // После ухода из поля приводим текст к справочнику, если это однозначно
  function settle() {
    const v = input.value.trim();
    if (!v) { setChosen(null); showHint(''); return; }
    if (input.dataset.fias && byFias.get(input.dataset.fias)?.name === v) return;
    const q = norm(v), alias = ALIASES[q];
    let exact = alias ? cities.filter(c => c.name === alias) : BOOST[q] ? [find(BOOST[q]), ...cities.filter(c => c.n === q)] : cities.filter(c => c.n === q);
    // латиница и английская раскладка: «Kazan», «rfpfym» → тот же город, если совпадение однозначное
    // (у транслита нет мягкого знака: «kazan» → «казан», поэтому пробуем и с ним)
    if (!exact.length && /[a-z]/i.test(v)) {
      const t = norm(translit(v)), keys = new Set([t, t + 'ь', norm(layout(v))]);
      exact = cities.filter(c => keys.has(c.n));
    }
    if (exact.length === 1) { setChosen(exact[0]); input.dispatchEvent(new Event('input', { bubbles: true })); return; }
    setChosen(null);
    if (exact.length > 1) { input.dataset.free = '1'; showHint('Городов с таким названием несколько, выберите регион из списка.', 'warn'); return; }
    input.dataset.free = '1';
    showHint('Нет в справочнике городов России. Оставим как написали, уточним при звонке.', 'warn');
  }

  input.addEventListener('input', e => {
    if (!e.isTrusted) return;
    setChosen(null); showHint('');
    const v = input.value;
    open(search(v), norm(v));
  });
  input.addEventListener('focus', () => { if (!input.dataset.fias) open(search(input.value), norm(input.value)); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(search(input.value), norm(input.value)); else move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); close(); }
    else if (e.key === 'Tab' && !list.hidden && active >= 0 && input.value.trim()) { choose(active); }
  });
  input.addEventListener('blur', () => setTimeout(() => { close(); settle(); }, 120));
  list.addEventListener('mousedown', e => e.preventDefault());   // фокус остаётся в поле
  list.addEventListener('click', e => { const li = e.target.closest('.city-opt'); if (li) choose(+li.dataset.i); });

  // Для текста заявки: «Казань, Республика Татарстан»
  window.teachnetCityLabel = () => {
    const v = input.value.trim();
    if (!v) return '';
    if (input.dataset.fias) return input.dataset.region ? `${v}, ${input.dataset.region}` : v;
    return `${v} (нет в справочнике)`;
  };

  settle();   // значение по умолчанию («Казань») сразу приводим к справочнику
})();
