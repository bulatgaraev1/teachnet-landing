/**
 * Страница /electronics: курс электроники и программирования для детей 10–15 лет.
 * Рендерится на сборке (импортируется vite.config.ts) в статичный HTML, как и
 * остальные страницы сайта. Тексты: src/content/electronics.ts, ссылки и
 * плейсхолдеры: src/content/electronics.config.ts. Клиентский JS: ./main.ts.
 */
import { EL, CTA_LABEL } from '../content/electronics';
import { EL_CONFIG } from '../content/electronics.config';
import { SITE } from '../lib/site';
import { footer } from '../sections/footer';
import { cookieBanner } from '../components/cookie-banner';
import { accordion } from '../components/accordion';
import { leadForm } from '../components/form';
import { elIcon } from './icons';
import type { ElIcon } from './icons';
import { photo } from './photo';

/** Кнопка записи: открывает окно; block уходит в цель cta_<block> и в from_block */
function ctaButton(block: 'hero' | 'trial' | 'price' | 'final' | 'menu', extra = ''): string {
  const cls = ['btn', 'el-cta', extra].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-open-modal="${block}" aria-haspopup="dialog" aria-controls="el-modal">${CTA_LABEL}</button>`;
}

function tel(place: string, cls = ''): string {
  return `<a class="${cls}" href="${SITE.phoneHref}" data-place="${place}">${SITE.phoneDisplay}</a>`;
}

function nbsp(s: string): string {
  return s.replace(/ /g, '&nbsp;');
}

function header(): string {
  const nav = EL.nav.map((n) => `<a href="${n.href}" data-anchor>${n.label}</a>`).join('');
  return `<header class="site-header el-header" id="top">
    <div class="container site-header__inner el-header__inner">
      <a class="el-back" href="${EL_CONFIG.links.directions}" data-back data-label-history="${EL.back.history}">
        ${elIcon('arrow-left', 'el-back__icon')}<span class="el-back__label">${EL.back.directions}</span>
      </a>
      <a href="/" class="site-header__brand el-header__brand" aria-label="${SITE.brand}, на главную">
        <img class="site-header__logo" src="/images/logo-dark.svg" width="121" height="38" alt="${SITE.brand}" />
      </a>
      <nav class="site-nav el-nav" aria-label="Разделы страницы">${nav}</nav>
      <div class="site-header__right">
        ${tel('header', 'site-header__phone')}
        <a class="el-call" href="${SITE.phoneHref}" data-place="header" aria-label="${EL.modal.call}: ${SITE.phoneDisplay}">${elIcon('phone')}</a>
        <button class="burger" type="button" aria-label="${EL.menu.open}" aria-expanded="false" aria-controls="mobile-nav" data-mm-open>${elIcon('menu')}</button>
      </div>
    </div>
  </header>`;
}

/** Бургер-меню: та же разметка и поведение, что у меню главной (initMobileMenu) */
function mobileMenu(): string {
  const links = EL.nav.map((n) => `<a class="mobile-nav__link" href="${n.href}" data-anchor>${n.label}</a>`).join('');
  return `<div class="mobile-nav" id="mobile-nav">
    <div class="mobile-nav__backdrop" data-mm-close></div>
    <aside class="mobile-nav__panel" role="dialog" aria-modal="true" aria-label="${EL.menu.label}" id="mobile-nav-panel">
      <div class="mobile-nav__head">
        <img class="mobile-nav__logo" src="/images/logo-dark.svg" width="121" height="38" alt="${SITE.brand}" />
        <button class="mobile-nav__close" type="button" aria-label="${EL.menu.close}" data-mm-close>${elIcon('x')}</button>
      </div>
      <nav class="mobile-nav__links" aria-label="Разделы страницы">${links}</nav>
      <div class="mobile-nav__foot">
        ${tel('menu', 'mobile-nav__phone')}
        <button type="button" class="btn btn--block el-cta" data-open-modal="menu" data-mm-close aria-haspopup="dialog" aria-controls="el-modal">${CTA_LABEL}</button>
      </div>
    </aside>
  </div>`;
}

function hero(): string {
  const facts = EL.hero.facts.map((f) => `<li class="el-fact">${f}</li>`).join('');
  return `<section class="el-hero el-sec--white" aria-labelledby="el-h1">
    <div class="el-dots" aria-hidden="true"></div>
    <div class="container el-hero__grid">
      <div class="el-hero__copy">
        <h1 class="h1 el-hero__title" id="el-h1">${EL.hero.h1}</h1>
        <p class="lead el-hero__sub">${EL.hero.sub}</p>
        <ul class="el-facts" aria-label="Коротко о курсе">${facts}</ul>
        <div class="el-hero__cta">${ctaButton('hero')}</div>
      </div>
      <div class="el-hero__media">${photo(EL.photos.hero, { hero: true, cls: 'el-photo--hero' })}</div>
    </div>
  </section>`;
}

function sectionHead(id: string, h2: string, sub: string): string {
  return `<div class="el-head" data-reveal>
        <h2 class="h2" id="${id}">${h2}</h2>
        <p class="lead">${sub}</p>
      </div>`;
}

function result(): string {
  const stages = EL.result.stages
    .map(
      (s) => `<li class="el-stage">
          <span class="el-stage__num" aria-hidden="true">${s.num}</span>
          <span class="el-stage__dot" aria-hidden="true"></span>
          <div class="el-stage__body">
            <h3 class="h3 el-stage__title">${s.title}</h3>
            <p class="el-stage__text">${s.text}</p>
          </div>
        </li>`,
    )
    .join('');
  return `<section class="section el-sec--gray" id="result" aria-labelledby="el-result-h">
    <div class="container">
      ${sectionHead('el-result-h', EL.result.h2, EL.result.sub)}
      <ol class="el-stages" data-reveal>${stages}</ol>
    </div>
  </section>`;
}

function lesson(): string {
  const steps = EL.lesson.steps
    .map(
      (s, i) => `<li class="el-step">
          <span class="el-step__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="h3 el-step__title">${s.title}</h3>
          <p class="el-step__text">${s.text}</p>
        </li>`,
    )
    .join('');
  return `<section class="section el-sec--white" id="lesson" aria-labelledby="el-lesson-h">
    <div class="container">
      ${sectionHead('el-lesson-h', EL.lesson.h2, EL.lesson.sub)}
      <ol class="el-steps" data-reveal>${steps}</ol>
      <div class="el-lesson__media" data-reveal>${photo(EL.photos.lesson)}</div>
      <p class="el-note" data-reveal>${elIcon('report', 'el-note__icon')}<span>${EL.lesson.report}</span></p>
    </div>
  </section>`;
}

function trial(): string {
  const chips = EL.trial.chips.map((c) => `<li class="el-chip el-chip--light">${c}</li>`).join('');
  return `<section class="section el-trial" id="trial" aria-labelledby="el-trial-h" data-scroll-goal="scroll_trial">
    <div class="container el-trial__grid">
      <div class="el-trial__copy" data-reveal>
        <h2 class="h2" id="el-trial-h">${EL.trial.h2}</h2>
        <p class="lead el-trial__sub">${EL.trial.sub}</p>
        <ul class="el-chips" aria-label="Условия пробного урока">${chips}</ul>
        <p class="el-trial__addr">${elIcon('pin', 'el-trial__pin')}<span>${EL.trial.address}</span></p>
        <div class="el-trial__cta">${ctaButton('trial', 'el-cta--light')}</div>
      </div>
      <div class="el-trial__media" data-reveal>${photo(EL.photos.trial, { cls: 'el-photo--on-brand' })}</div>
    </div>
  </section>`;
}

function program(): string {
  const items = EL.program.modules
    .map(
      (m, i) => `<li class="el-mod">
          <span class="el-mod__num">${String(i + 1).padStart(2, '0')}</span>
          <span class="el-mod__text"><span class="el-mod__title">${m.title}</span> — <span class="el-mod__product">${m.product}</span></span>
        </li>`,
    )
    .join('');
  return `<section class="section el-sec--gray" id="program" aria-labelledby="el-program-h">
    <div class="container el-narrow">
      ${sectionHead('el-program-h', EL.program.h2, EL.program.sub)}
      <ol class="el-mods" data-reveal>${items}</ol>
      <div class="el-mods__photos" data-reveal>
        ${photo(EL.photos.module1, { cls: 'el-photo--module' })}
        ${photo(EL.photos.module2, { cls: 'el-photo--module' })}
      </div>
    </div>
  </section>`;
}

function progress(): string {
  const cards = EL.progress.cards
    .map(
      (c) => `<li class="el-card el-progress__card">
          <span class="el-card__icon">${elIcon(c.icon as ElIcon)}</span>
          <div>
            <h3 class="h3 el-card__title">${c.title}</h3>
            <p class="el-card__text">${c.text}</p>
          </div>
        </li>`,
    )
    .join('');
  return `<section class="section el-sec--white" aria-labelledby="el-progress-h">
    <div class="container">
      ${sectionHead('el-progress-h', EL.progress.h2, EL.progress.sub)}
      <div class="el-split">
        <ul class="el-progress__cards" data-reveal>${cards}</ul>
        <div class="el-split__media" data-reveal>${photo(EL.photos.journal)}</div>
      </div>
    </div>
  </section>`;
}

function teacher(): string {
  const facts = EL.teacher.facts
    .map((f) => `<li>${elIcon('check', 'el-tick')}<span>${f}</span></li>`)
    .join('');
  return `<section class="section el-sec--gray" aria-labelledby="el-teacher-h">
    <div class="container el-teacher">
      <div class="el-teacher__media" data-reveal>${photo(EL.photos.teacher, { cls: 'el-photo--portrait' })}</div>
      <div class="el-teacher__copy" data-reveal>
        <h2 class="h2" id="el-teacher-h">${EL.teacher.h2}</h2>
        <p class="lead">${EL.teacher.sub}</p>
        <ul class="el-list">${facts}</ul>
      </div>
    </div>
  </section>`;
}

function trust(): string {
  const chips = EL.trust.chips.map((c) => `<li class="el-chip">${c}</li>`).join('');
  const press = EL.trust.press
    .map(
      (p) => `<li><a class="el-press" href="${EL_CONFIG.press[p.id]}" target="_blank" rel="noopener noreferrer" data-press="${p.id}">
          <span class="el-press__source">${p.source}</span>
          <span class="el-press__read">${EL.trust.read}</span>
        </a></li>`,
    )
    .join('');
  return `<section class="section el-sec--white" aria-labelledby="el-trust-h">
    <div class="container">
      <div class="el-head" data-reveal>
        <h2 class="h2" id="el-trust-h">${EL.trust.h2}</h2>
        <p class="el-trust__sub"><span class="el-bignum">${EL.trust.subNum}</span> <span class="lead">${EL.trust.subText}</span></p>
      </div>
      <ul class="el-chips el-trust__chips" data-reveal>${chips}</ul>
      <ul class="el-press-grid" data-reveal>${press}</ul>
    </div>
  </section>`;
}

function price(): string {
  const inc = EL.price.included.map((t) => `<li>${elIcon('check', 'el-tick')}<span>${t}</span></li>`).join('');
  return `<section class="section el-sec--gray" id="price" aria-labelledby="el-price-h" data-scroll-goal="scroll_price">
    <div class="container el-narrow">
      <div class="el-price" data-reveal>
        <div class="el-price__main">
          <h2 class="el-price__title" id="el-price-h"><span class="el-price__lead">${EL.price.lead}</span> <span class="el-price__amount">${nbsp(EL.price.amount)}</span> <span class="el-price__period">${EL.price.period}</span></h2>
          <p class="lead">${EL.price.sub}</p>
        </div>
        <div class="el-price__details">
          <p class="el-price__label">${EL.price.includedLabel}</p>
          <ul class="el-list">${inc}</ul>
          ${ctaButton('price')}
        </div>
      </div>
    </div>
  </section>`;
}

function faq(): string {
  return `<section class="section el-sec--white" id="faq" aria-labelledby="el-faq-h" data-scroll-goal="scroll_faq">
    <div class="container el-faq-wrap">
      <div class="el-head" data-reveal>
        <h2 class="h2" id="el-faq-h">${EL.faq.h2}</h2>
        <p class="lead">${EL.faq.subText} ${tel('faq', 'el-link')}</p>
      </div>
      <div data-reveal>${accordion(EL.faq.items.map((it) => ({ q: it.q, a: it.a })))}</div>
    </div>
  </section>`;
}

/** Карта: карточка организации по orgId, иначе поиск организации по названию и адресу */
function mapUrls(): { widget: string; open: string } {
  const { orgId, search } = EL_CONFIG.map;
  if (orgId) {
    return {
      widget: `https://yandex.ru/map-widget/v1/?ol=biz&oid=${orgId}&z=17`,
      open: `https://yandex.ru/maps/org/${orgId}/`,
    };
  }
  const q = encodeURIComponent(search);
  return {
    widget: `https://yandex.ru/map-widget/v1/?mode=search&text=${q}&z=17`,
    open: `https://yandex.ru/maps/?mode=search&text=${q}&z=17`,
  };
}

function contacts(): string {
  return `<section class="section el-sec--gray" id="contacts" aria-labelledby="el-contacts-h" data-scroll-goal="scroll_contacts">
    <div class="container el-contacts">
      <div class="el-contacts__copy" data-reveal>
        <h2 class="h2" id="el-contacts-h">${EL.contacts.h2}</h2>
        <p class="lead">${EL.contacts.sub}</p>
        <div class="el-contacts__cta">${ctaButton('final')}</div>
        <ul class="el-contacts__list">
          <li>${elIcon('phone', 'el-contacts__icon')}${tel('contacts', 'el-contacts__phone')}</li>
          <li>${elIcon('pin', 'el-contacts__icon')}<span>${EL.contacts.address}</span></li>
        </ul>
      </div>
      <div class="el-contacts__map" data-reveal>
        <div class="el-map">
          <iframe class="el-map__frame" src="${mapUrls().widget}" title="${EL.contacts.mapTitle}" loading="lazy" width="600" height="450" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <a class="el-link el-map__open" href="${mapUrls().open}" target="_blank" rel="noopener noreferrer" data-map-link>${EL.contacts.mapLink}${elIcon('arrow-right', 'el-link__icon')}</a>
      </div>
    </div>
    <div class="container">
      <p class="el-cross" data-reveal><a class="el-link" href="${EL_CONFIG.links.robotics}" data-cross>${EL.contacts.cross}</a></p>
    </div>
  </section>`;
}

function messenger(id: 'telegram' | 'vk' | 'max', label: string, img: string): string {
  const m = EL_CONFIG.messengers[id];
  const href = m.param ? `${m.base}?${m.param}=${EL_CONFIG.startPrefix}` : m.base;
  return `<li><a class="el-msg" href="${href}" target="_blank" rel="noopener" data-msg="${id}">
        <img class="el-msg__logo" src="/images/${img}" width="40" height="40" alt="" loading="lazy" decoding="async" />
        <span class="el-msg__label">${label}</span>
        ${elIcon('arrow-right', 'el-msg__arrow')}
      </a></li>`;
}

function modal(): string {
  return `<dialog class="el-modal" id="el-modal" aria-labelledby="el-modal-title" aria-describedby="el-modal-text">
    <div class="el-modal__box">
      <button type="button" class="el-modal__close" data-modal-close aria-label="${EL.modal.close}">${elIcon('x')}</button>
      <p class="el-modal__title" id="el-modal-title">${EL.modal.title}</p>
      <p class="el-modal__text" id="el-modal-text">${EL.modal.text}</p>
      <div class="el-modal__form">
        ${leadForm({ id: 'el-lead-form', source: 'electronics', ageType: 'select', ageOptions: [...EL.modal.ageOptions], submitLabel: EL.modal.formSubmit })}
      </div>
      <p class="el-modal__or">${EL.modal.or}</p>
      <ul class="el-msgs">
        ${messenger('telegram', EL.modal.telegram, 'icon-telegram.png')}
        ${messenger('vk', EL.modal.vk, 'icon-vk.png')}
        ${messenger('max', EL.modal.max, 'icon-max.png')}
        <li><a class="el-msg" href="${SITE.phoneHref}" data-place="modal">
          <span class="el-msg__logo el-msg__logo--phone">${elIcon('phone')}</span>
          <span class="el-msg__label">${EL.modal.call}<span class="el-msg__sub">${SITE.phoneDisplay}</span></span>
          ${elIcon('arrow-right', 'el-msg__arrow')}
        </a></li>
      </ul>
    </div>
  </dialog>`;
}

export function renderElectronicsPage(): string {
  return [
    header(),
    mobileMenu(),
    '<main id="main" class="el-main">',
    hero(),
    result(),
    lesson(),
    trial(),
    program(),
    progress(),
    teacher(),
    trust(),
    price(),
    faq(),
    contacts(),
    '</main>',
    footer(),
    modal(),
    cookieBanner(),
  ].join('\n');
}
