/**
 * Страница /tech: учебная плата TEACHNET UNO. Рендерится на сборке (vite.config.ts)
 * в статичный HTML, как остальные страницы сайта. Тексты: src/content/tech.ts,
 * координаты на рендере платы: src/content/teachnet-uno-coordinates.json.
 * Клиентский JS: ./main.ts (вкладки и выбор на плате, форма заявки).
 * Стили: src/styles/tech.css (префикс .tc-) поверх токенов и компонентов сайта.
 */
import { TECH, TECH_DOWNLOADS } from '../content/tech';
import COORDS from '../content/teachnet-uno-coordinates.json';
import { SITE } from '../lib/site';
import { footer } from '../sections/footer';
import { cookieBanner } from '../components/cookie-banner';
import { accordion } from '../components/accordion';
import { elIcon } from '../electronics/icons';

export const BOARD_IMG = '/images/tech/teachnet-uno-top.webp';
/** логотип TEACHNET ROBOTICS — в шапке и меню этой страницы */
const LOGO = '<img class="site-header__logo tc-logo" src="/images/logo-robotics.svg" width="122" height="44" alt="TEACHNET ROBOTICS" />';
export const BOARD_IMG_800 = '/images/tech/teachnet-uno-top-800.webp';
const IMG_W = 1600;
const IMG_H = 1199;

type Pin = { name: string; x: number; y: number };
const PINS = COORDS.pins as Pin[];
const LEDS = COORDS.leds as Record<string, number[]>;

/** Позиция центра элемента поверх картинки (проценты) */
const at = (x: number, y: number): string => `left:${x}%;top:${y}%`;

function boardImg(cls: string, sizes: string, eager: boolean): string {
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img class="${cls}" src="${BOARD_IMG}" srcset="${BOARD_IMG_800} 800w, ${BOARD_IMG} 1600w" sizes="${sizes}" width="${IMG_W}" height="${IMG_H}" alt="${TECH.meta.imageAlt}" decoding="async" ${load} />`;
}

/** Кнопка «Оставить заявку» (к форме); goal — клик-цель места */
function toOrder(label: string, cls: string, goal: string): string {
  return `<a class="${cls}" href="#order" data-anchor data-goal="${goal}">${label}</a>`;
}

function header(): string {
  const nav = TECH.nav.map((n) => `<a href="${n.href}" data-anchor data-goal="${n.goal}" data-goal-place="header">${n.label}</a>`).join('');
  return `<header class="site-header el-header tc-header" id="top">
    <div class="container site-header__inner el-header__inner">
      <a href="/" class="site-header__brand el-header__brand" aria-label="${SITE.brand}, на главную" data-goal="tech_logo_home">
        ${LOGO}
      </a>
      <nav class="site-nav el-nav" aria-label="Разделы страницы">${nav}</nav>
      <div class="site-header__right">
        ${toOrder(TECH.cta, 'btn btn--compact tc-header__cta', 'tech_order_header')}
        <button class="burger" type="button" aria-label="${TECH.menu.open}" aria-expanded="false" aria-controls="mobile-nav" data-mm-open>${elIcon('menu')}</button>
      </div>
    </div>
  </header>`;
}

/** Бургер-меню: разметка и поведение общего меню сайта (initMobileMenu) */
function mobileMenu(): string {
  const links = TECH.nav.map((n) => `<a class="mobile-nav__link" href="${n.href}" data-anchor data-goal="${n.goal}" data-goal-place="menu">${n.label}</a>`).join('');
  return `<div class="mobile-nav" id="mobile-nav">
    <div class="mobile-nav__backdrop" data-mm-close></div>
    <aside class="mobile-nav__panel" role="dialog" aria-modal="true" aria-label="${TECH.menu.label}" id="mobile-nav-panel">
      <div class="mobile-nav__head">
        <img class="mobile-nav__logo tc-logo" src="/images/logo-robotics.svg" width="122" height="44" alt="TEACHNET ROBOTICS" />
        <button class="mobile-nav__close" type="button" aria-label="${TECH.menu.close}" data-mm-close>${elIcon('x')}</button>
      </div>
      <nav class="mobile-nav__links" aria-label="Разделы страницы">${links}</nav>
      <div class="mobile-nav__foot">
        ${toOrder(TECH.cta, 'btn btn--block', 'tech_order_menu')}
      </div>
    </aside>
  </div>`;
}

function hero(): string {
  const chips = TECH.hero.chips.map((c) => `<li class="el-chip tc-chip">${c}</li>`).join('');
  const stats = TECH.hero.stats
    .map((s) => `<li class="tc-stat"><span class="tc-stat__value">${s.value}</span><span class="tc-stat__label">${s.label}</span></li>`)
    .join('');
  return `<section class="tc-hero el-sec--white" aria-labelledby="tc-h1" data-scroll-goal="scroll_tech_hero">
    <div class="el-dots" aria-hidden="true"></div>
    <div class="container tc-hero__grid">
      <div class="tc-hero__copy">
        <ul class="el-chips tc-chips" aria-label="О плате">${chips}</ul>
        <h1 class="h1 tc-hero__title" id="tc-h1">${TECH.hero.h1}</h1>
        <p class="lead tc-hero__sub">${TECH.hero.sub}</p>
        <div class="tc-hero__cta">
          ${toOrder(TECH.cta, 'btn', 'tech_order_hero')}
          <a class="btn btn--ghost" href="#board" data-anchor data-goal="tech_hero_board">${TECH.hero.ctaBoard}</a>
        </div>
        <ul class="tc-stats">${stats}</ul>
      </div>
      <div class="tc-hero__media">
        ${boardImg('tc-hero__img', '(min-width: 960px) 560px, calc(100vw - 48px)', true)}
      </div>
    </div>
  </section>`;
}

function head(id: string, eyebrow: string, h2: string, sub = ''): string {
  return `<div class="el-head tc-head" data-reveal>
        <p class="el-eyebrow tc-eyebrow">${eyebrow}</p>
        <h2 class="h2" id="${id}">${h2}</h2>${sub ? `\n        <p class="lead">${sub}</p>` : ''}
      </div>`;
}

/* ---------- 3. Что на плате ---------- */

function boardOverlays(): string {
  const f = COORDS.features;
  const areas = f
    .map((ft) =>
      ft.areas
        .map(([x0, y0, x1, y1]) => `<span class="tc-area" data-f="${ft.n}" style="left:${x0}%;top:${y0}%;width:${+(x1 - x0).toFixed(2)}%;height:${+(y1 - y0).toFixed(2)}%"${ft.n === 1 ? '' : ' hidden'}></span>`)
        .join(''),
    )
    .join('');
  const markers = f
    .map((ft, i) => `<button type="button" class="tc-marker${ft.n === 1 ? ' is-active' : ''}" data-f="${ft.n}" style="${at(ft.x, ft.y)}" aria-pressed="${ft.n === 1}" aria-label="${ft.n}. ${TECH.board.features[i].title}">${ft.n}</button>`)
    .join('');
  // кольца — только у контактов, которые входят в группы выводов
  const used = new Set<string>(TECH.board.pinGroups.flatMap((g) => [...g.pins]));
  const rings = PINS.filter((p) => used.has(p.name))
    .map((p) => `<span class="tc-ring" data-pin="${p.name}" style="${at(p.x, p.y)}" hidden></span>`)
    .join('');
  const leds = Object.entries(LEDS)
    .flatMap(([name, [x, y]]) =>
      name === 'TX' || name === 'RX'
        ? [`<span class="tc-led tc-led--${name.toLowerCase()}" data-led="txrx" style="${at(x, y)}" hidden></span>`]
        : [`<span class="tc-led tc-led--${name.toLowerCase()}" data-led="${name.toLowerCase()}" style="${at(x, y)}" hidden></span>`],
    )
    .join('');
  return `<div class="tc-layer" data-layer="features">${areas}${markers}</div>
          <div class="tc-layer" data-layer="pins" hidden>${rings}${leds}</div>`;
}

function featureCard(i: number): string {
  const f = TECH.board.features[i];
  return `<p class="tc-card__head"><span class="tc-num">${i + 1}</span><span class="tc-card__title">${f.title}</span></p>
          <p class="tc-card__text">${f.text}</p>
          <p class="tc-card__lesson"><b>${TECH.board.onLesson}</b> ${f.lesson}</p>`;
}

function board(): string {
  const featItems = TECH.board.features
    .map((f, i) => `<li><button type="button" class="tc-item${i === 0 ? ' is-active' : ''}" data-f="${i + 1}" aria-pressed="${i === 0}">
            <span class="tc-num">${i + 1}</span><span class="tc-item__copy"><span class="tc-item__title">${f.title}</span><span class="tc-item__short">${f.short}</span></span>
          </button></li>`)
    .join('');
  const pinItems = TECH.board.pinGroups
    .map((g, i) => `<li><button type="button" class="tc-item tc-item--pins${i === 0 ? ' is-active' : ''}" data-g="${i}" aria-pressed="${i === 0}">
            <span class="tc-item__copy"><span class="tc-item__title">${g.label}</span><span class="tc-item__short">${g.purpose}</span></span>
          </button></li>`)
    .join('');
  return `<section class="section el-sec--gray tc-board-sec" id="board" aria-labelledby="tc-board-h" data-scroll-goal="scroll_tech_board">
    <div class="container">
      ${head('tc-board-h', TECH.board.eyebrow, TECH.board.h2)}
      <div class="tc-board-grid">
        <div class="tc-board-main">
          <div class="tc-tabs" role="tablist" aria-label="${TECH.board.h2}">
            <button type="button" class="tc-tab is-active" role="tab" id="tc-tab-features" aria-selected="true" aria-controls="tc-board-panel" data-tab="features">${TECH.board.tabs.features}</button>
            <button type="button" class="tc-tab" role="tab" id="tc-tab-pins" aria-selected="false" aria-controls="tc-board-panel" data-tab="pins" tabindex="-1">${TECH.board.tabs.pins}</button>
          </div>
          <div class="tc-board-panel" id="tc-board-panel" role="tabpanel" aria-labelledby="tc-tab-features">
            <div class="tc-figure">
              <div class="tc-board" data-board>
                ${boardImg('tc-board__img', '(min-width: 1024px) 640px, calc(100vw - 48px)', false)}
                ${boardOverlays()}
              </div>
            </div>
            <div class="tc-card" data-card aria-live="polite">
          ${featureCard(0)}
            </div>
          </div>
        </div>
        <div class="tc-board-side">
          <ol class="tc-list" data-list="features" aria-label="${TECH.board.tabs.features}">${featItems}</ol>
          <ul class="tc-list" data-list="pins" aria-label="${TECH.board.tabs.pins}" hidden>${pinItems}</ul>
        </div>
      </div>
    </div>
  </section>`;
}

/* ---------- 4. Сравнение ---------- */

const MARK_ICON: Record<string, string> = {
  y: '<svg class="tc-mark__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  p: '<svg class="tc-mark__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 9.5c1.6-2.6 3.4-2.6 5 0s3.4 2.6 5 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  n: '<svg class="tc-mark__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
const MARK_SR: Record<string, string> = { y: 'справляется', p: 'частично', n: 'нет' };

function mark(kind: string, text: string): string {
  return `<span class="tc-mark tc-mark--${kind}">${MARK_ICON[kind]}<span class="sr-only">${MARK_SR[kind]}: </span><span>${text}</span></span>`;
}

function compare(): string {
  const c = TECH.compare;
  const legend = (['y', 'p', 'n'] as const)
    .map((k) => `<li class="tc-mark tc-mark--${k}">${MARK_ICON[k]}<span>${c.legend[k === 'y' ? 'yes' : k === 'p' ? 'part' : 'no']}</span></li>`)
    .join('');
  const body = c.groups
    .map((g) => {
      const rows = g.rows
        .map((r) => `<tr><th scope="row">${r.label}</th>${r.cells.map(([k, t], i) => `<td${i === 0 ? ' class="tc-col-our"' : ''}>${mark(k, t)}</td>`).join('')}</tr>`)
        .join('');
      return `<tbody><tr class="tc-group"><th colspan="4" scope="colgroup">${g.title}</th></tr>${rows}</tbody>`;
    })
    .join('');
  const notes = c.notes.map((n) => `<p class="tc-compare__note">${n.strong ? `<b>${n.strong}</b> ` : ''}${n.text}</p>`).join('');
  return `<section class="section el-sec--white" id="compare" aria-labelledby="tc-compare-h" data-scroll-goal="scroll_tech_compare">
    <div class="container">
      ${head('tc-compare-h', c.eyebrow, c.h2, c.sub)}
      <ul class="tc-legend" aria-label="Обозначения">${legend}</ul>
      <div class="tc-table-wrap" data-reveal role="region" aria-labelledby="tc-compare-h" tabindex="0">
        <table class="tc-table">
          <caption class="sr-only">${c.h2} ${c.sub}</caption>
          <thead><tr><td></td><th scope="col" class="tc-col-our">${c.cols[0]}</th><th scope="col">${c.cols[1]}</th><th scope="col">${c.cols[2]}</th></tr></thead>
          ${body}
        </table>
      </div>
      ${notes}
    </div>
  </section>`;
}

/* ---------- 5. Характеристики ---------- */

function specs(): string {
  const s = TECH.specs;
  const rows = s.rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
  return `<section class="section el-sec--gray" id="specs" aria-labelledby="tc-specs-h" data-scroll-goal="scroll_tech_specs">
    <div class="container tc-specs-grid">
      <div class="tc-specs__copy" data-reveal>
        <p class="el-eyebrow tc-eyebrow">${s.eyebrow}</p>
        <h2 class="h2" id="tc-specs-h">${s.h2}</h2>
        <p class="tc-specs__note">${s.noteBefore}<a class="el-link" href="#board" data-anchor data-open-tab="pins" data-goal="tech_specs_pins">${s.noteLink}</a>${s.noteAfter}</p>
      </div>
      <div class="tc-specs card" data-reveal>
        <table class="tc-spec-table"><caption class="sr-only">${s.h2}</caption><tbody>${rows}</tbody></table>
      </div>
    </div>
  </section>`;
}

/* ---------- 6. Педагогам ---------- */

function teachers(): string {
  const t = TECH.teachers;
  const cards = t.cards
    .map((c) => `<li class="tc-tcard"><span class="tc-tcard__num">${c.num}.</span><p class="tc-tcard__title">${c.title}</p><p class="tc-tcard__text">${c.text}</p></li>`)
    .join('');
  // кнопки PDF: с файлом — ссылка на скачивание, пока файла нет — неактивная кнопка (без ссылок-заглушек)
  const dl = '<svg class="tc-download__icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // download="<имя файла>": файл скачивается с тем же именем (телефон может просто открыть PDF — это нормально)
  const downloads = `<div class="tc-downloads">${TECH_DOWNLOADS.map((d) => {
    const btn = d.href
      ? `<a class="btn tc-download" href="${d.href}" download="${d.href.split('/').pop()}" data-goal="${d.goal}">${d.label}${dl}</a>`
      : `<button class="btn tc-download" type="button" disabled title="Файл появится позже" data-goal="${d.goal}">${d.label}${dl}</button>`;
    return `<div class="tc-dl">${btn}<span class="tc-dl__note">${d.note}</span></div>`;
  }).join('')}</div>`;
  return `<section class="section el-sec--white" id="teachers" aria-labelledby="tc-teachers-h" data-scroll-goal="scroll_tech_teachers">
    <div class="container">
      <div class="tc-teachers" data-reveal>
        <p class="el-eyebrow tc-eyebrow tc-eyebrow--light">${t.eyebrow}</p>
        <h2 class="h2" id="tc-teachers-h">${t.h2}</h2>
        <ul class="tc-tcards">${cards}</ul>
        ${downloads}
      </div>
    </div>
  </section>`;
}

/* ---------- 7. Заявка ---------- */

function orderForm(): string {
  const f = TECH.order.form;
  const roles = f.roles
    .map((r, i) => `<label class="tc-seg__opt"><input type="radio" name="role" value="${r.value}"${i === 0 ? ' checked' : ''} /><span>${r.label}</span></label>`)
    .join('');
  const hidden = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'yclid', 'referrer', 'ym_client_id']
    .map((n) => `<input type="hidden" name="${n}" />`)
    .join('');
  return `<form class="tc-form card" id="tc-form" action="/send.php" method="post" novalidate>
          <fieldset class="tc-roles">
            <legend class="tc-label">${f.role}</legend>
            <div class="tc-seg">${roles}</div>
          </fieldset>
          <div class="tc-fields">
            <div class="tc-field"><label class="tc-label" for="tc-name">${f.name}</label><input class="field" id="tc-name" name="name" type="text" autocomplete="name" maxlength="100" required /></div>
            <div class="tc-field"><label class="tc-label" for="tc-contact">${f.contact}</label><input class="field" id="tc-contact" name="contact" type="text" autocomplete="tel" maxlength="100" required /></div>
            <div class="tc-field" data-org><label class="tc-label" for="tc-org">${f.org}</label><input class="field" id="tc-org" name="org" type="text" autocomplete="organization" maxlength="150" /></div>
            <div class="tc-field"><label class="tc-label" for="tc-qty">${f.qty}</label><input class="field" id="tc-qty" name="qty" type="number" min="1" step="1" value="10" inputmode="numeric" /></div>
          </div>
          <label class="tc-consent"><input type="checkbox" name="consent" value="1" required /><span>${f.consentBefore}<a href="${SITE.legal.privacy}" target="_blank" rel="noopener">${f.consentLink}</a></span></label>
          <input type="hidden" name="source" value="tech" />
          ${hidden}
          <div class="tc-hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
          <p class="tc-form__error" role="alert" data-form-error hidden></p>
          <button class="btn btn--block" type="submit">${f.submit}</button>
        </form>
        <div class="tc-done card" data-done hidden tabindex="-1">
          <h3 class="h3">${TECH.order.done.h3}</h3>
          <p data-done-text data-template="${TECH.order.done.text}"></p>
          <button class="btn btn--ghost" type="button" data-again>${TECH.order.done.again}</button>
        </div>`;
}

function order(): string {
  const o = TECH.order;
  const info = o.info.map((r) => `<div class="tc-info__row"><dt>${r.label}</dt><dd>${r.value}</dd></div>`).join('');
  return `<section class="section el-sec--gray" id="order" aria-labelledby="tc-order-h" data-scroll-goal="scroll_tech_order">
    <div class="container tc-order-grid">
      <div class="tc-order__copy" data-reveal>
        <p class="el-eyebrow tc-eyebrow">${o.eyebrow}</p>
        <h2 class="h2" id="tc-order-h">${o.h2}</h2>
        <dl class="tc-info card">${info}</dl>
      </div>
      <div class="tc-order__form" data-reveal>
        ${orderForm()}
      </div>
    </div>
  </section>`;
}

/* ---------- 8. Вопросы ---------- */

const PINS_LINK = 'В блоке «Что на плате», вкладка «Выводы»';

function faq(): string {
  const items = TECH.faq.items.map((it, i) =>
    // ответ про выводы — ссылка на вкладку «Выводы» только на эти слова, остальной текст как есть
    i === TECH.faq.items.length - 1
      ? { q: it.q, a: it.a.replace(PINS_LINK, `<a class="el-link" href="#board" data-anchor data-open-tab="pins" data-goal="tech_faq_pins">${PINS_LINK}</a>`) }
      : { q: it.q, a: it.a },
  );
  return `<section class="section el-sec--white" id="faq" aria-labelledby="tc-faq-h" data-scroll-goal="scroll_tech_faq" data-faq-goal="tech_faq_open">
    <div class="container el-faq-wrap">
      ${head('tc-faq-h', TECH.faq.eyebrow, TECH.faq.h2)}
      <div data-reveal>${accordion(items)}</div>
    </div>
  </section>`;
}

export function renderTechPage(): string {
  return [
    header(),
    mobileMenu(),
    '<main id="main" class="el-main tc-main">',
    hero(),
    board(),
    compare(),
    specs(),
    teachers(),
    order(),
    faq(),
    '</main>',
    footer('scroll_tech_footer'),
    cookieBanner(),
  ].join('\n');
}
