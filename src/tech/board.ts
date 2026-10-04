/**
 * Блок «Что на плате»: вкладки «9 решений» / «Выводы», выбор решения или группы выводов
 * (метки на плате и строки списка), рамки, кольца на контактах, подсветка светодиодов
 * и карточка с описанием. Всё поверх картинки размечено на сборке (page.ts),
 * здесь только переключение классов и атрибутов.
 */
import { TECH } from '../content/tech';

type Tab = 'features' | 'pins';

export interface BoardApi {
  openTab(tab: Tab): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function initBoard(): BoardApi | null {
  const sec = document.getElementById('board');
  const card = sec?.querySelector<HTMLElement>('[data-card]');
  const panel = document.getElementById('tc-board-panel');
  if (!sec || !card || !panel) return null;

  const tabs = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const layers = Array.from(sec.querySelectorAll<HTMLElement>('[data-layer]'));
  const lists = Array.from(sec.querySelectorAll<HTMLElement>('[data-list]'));
  const areas = Array.from(sec.querySelectorAll<HTMLElement>('.tc-area'));
  const markers = Array.from(sec.querySelectorAll<HTMLButtonElement>('.tc-marker'));
  const featItems = Array.from(sec.querySelectorAll<HTMLButtonElement>('.tc-item[data-f]'));
  const pinItems = Array.from(sec.querySelectorAll<HTMLButtonElement>('.tc-item[data-g]'));
  const rings = Array.from(sec.querySelectorAll<HTMLElement>('.tc-ring'));
  const leds = Array.from(sec.querySelectorAll<HTMLElement>('.tc-led'));

  let tab: Tab = 'features';
  let feature = 1;
  let group = 0;

  const press = (list: HTMLElement[], active: (n: HTMLElement) => boolean): void => {
    list.forEach((n) => {
      const on = active(n);
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  function renderFeatureCard(): void {
    const f = TECH.board.features[feature - 1];
    card!.textContent = '';
    const head = el('p', 'tc-card__head');
    head.append(el('span', 'tc-num', String(feature)), el('span', 'tc-card__title', f.title));
    const lesson = el('p', 'tc-card__lesson');
    lesson.append(el('b', '', TECH.board.onLesson), document.createTextNode(' ' + f.lesson));
    card!.append(head, el('p', 'tc-card__text', f.text), lesson);
  }

  function renderPinCard(): void {
    const g = TECH.board.pinGroups[group];
    card!.textContent = '';
    const head = el('p', 'tc-card__head');
    head.append(el('span', 'tc-card__title tc-card__title--big', g.label));
    card!.append(head, el('p', 'tc-card__text', g.text));
  }

  function selectFeature(n: number): void {
    feature = n;
    areas.forEach((a) => { a.hidden = Number(a.dataset.f) !== n; });
    press(markers, (m) => Number(m.dataset.f) === n);
    press(featItems, (i) => Number(i.dataset.f) === n);
    renderFeatureCard();
  }

  function selectGroup(i: number): void {
    group = i;
    const g = TECH.board.pinGroups[i];
    const pins = new Set<string>(g.pins);
    rings.forEach((r) => { r.hidden = !pins.has(r.dataset.pin || ''); });
    leds.forEach((l) => { l.hidden = !g.led || l.dataset.led !== g.led; });
    press(pinItems, (it) => Number(it.dataset.g) === i);
    renderPinCard();
  }

  function setTab(t: Tab, focus = false): void {
    tab = t;
    tabs.forEach((b) => {
      const on = b.dataset.tab === t;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    panel!.setAttribute('aria-labelledby', `tc-tab-${t}`);
    layers.forEach((l) => { l.hidden = l.dataset.layer !== t; });
    lists.forEach((l) => { l.hidden = l.dataset.list !== t; });
    if (t === 'features') selectFeature(feature);
    else selectGroup(group);
  }

  tabs.forEach((b, idx) => {
    b.addEventListener('click', () => setTab(b.dataset.tab as Tab));
    // стрелки, Home и End — как у обычных вкладок
    b.addEventListener('keydown', (e) => {
      let next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      setTab(tabs[next].dataset.tab as Tab, true);
    });
  });
  markers.forEach((m) => m.addEventListener('click', () => selectFeature(Number(m.dataset.f))));
  featItems.forEach((it) => it.addEventListener('click', () => selectFeature(Number(it.dataset.f))));
  pinItems.forEach((it) => it.addEventListener('click', () => selectGroup(Number(it.dataset.g))));

  setTab('features');
  return { openTab: (t) => { if (t !== tab) setTab(t); } };
}
