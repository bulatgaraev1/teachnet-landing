/**
 * Страница-визитка /links: ссылка в шапке профиля соцсетей. Одна колонка до 480 px:
 * кто мы, запись в один тап (окно с формой заявки), мессенджеры и звонок, курсы, адреса.
 * Рендерится на сборке (импортируется vite.config.ts) в статичный HTML, как и остальные страницы.
 * Тексты: src/content/links.ts. Клиентский JS: ./main.ts.
 */
import { LN } from '../content/links';
import { EL } from '../content/electronics';
import { SITE } from '../lib/site';
import type { Branch } from '../lib/site';
import { icon } from '../lib/icons';
import { elIcon } from '../electronics/icons';
import { MENTIONS } from '../sections/media-mentions';
import { leadForm } from '../components/form';
import { cookieBanner } from '../components/cookie-banner';

function head(): string {
  // логотип TEACHNET (знак + надпись) — растровая копия фирменного SVG, лёгкая и чёткая на экранах 2×
  return `<header class="ln-head">
      <h1 class="ln-logo"><img src="/images/logo-links.webp" width="240" height="67" alt="${SITE.brand}" decoding="async" fetchpriority="high" /></h1>
      <p class="ln-tagline">${LN.hero.tagline}</p>
      <p class="ln-meta">${LN.hero.meta}</p>
    </header>`;
}

function contacts(): string {
  const msgs = LN.contacts
    .map(
      (c) => `<li><a class="ln-btn" href="${c.href}" target="_blank" rel="noopener" data-goal="${c.goal}">
          <img class="ln-btn__logo" src="/images/links/${c.img}" width="32" height="32" alt="" decoding="async" />
          <span class="ln-btn__label">${c.label}</span>
        </a></li>`,
    )
    .join('');
  return `<ul class="ln-actions">
      ${msgs}
      <li><a class="ln-btn" href="${SITE.phoneHref}" data-goal="${LN.call.goal}">
          <span class="ln-btn__logo ln-btn__logo--phone">${elIcon('phone')}</span>
          <span class="ln-btn__label">${LN.call.label}<span class="ln-btn__sub">${SITE.phoneDisplay}</span></span>
        </a></li>
    </ul>`;
}

function courses(): string {
  const cards = LN.courses
    .map(
      (c) => `<li><a class="ln-card" href="${c.href}" data-goal="${c.goal}">
          <span class="ln-card__body"><span class="ln-card__title">${c.label}</span><span class="ln-card__age">${c.age}</span></span>
          ${elIcon('arrow-right', 'ln-card__arrow')}
        </a></li>`,
    )
    .join('');
  return `<section class="ln-sec" aria-labelledby="ln-courses-h">
      <h2 class="ln-h2" id="ln-courses-h">${LN.coursesTitle}</h2>
      <ul class="ln-list">${cards}</ul>
    </section>`;
}

function branch(b: Branch): string {
  return `<li class="ln-branch">
          <p class="ln-branch__addr">${elIcon('pin', 'ln-branch__pin')}<span>${b.address}<span class="ln-branch__note">${b.note}</span></span></p>
          <a class="ln-route" href="${LN.routeHref(b.orgId)}" target="_blank" rel="noopener" data-goal="${LN.routeGoal(b.id)}">${LN.route}</a>
        </li>`;
}

function branches(): string {
  return `<section class="ln-sec" aria-labelledby="ln-branches-h">
      <h2 class="ln-h2" id="ln-branches-h">${LN.branchesTitle}</h2>
      <ul class="ln-list">${SITE.branches.map(branch).join('')}</ul>
    </section>`;
}

function press(): string {
  const links = MENTIONS.map((m) => `<a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.source}</a>`).join('<span aria-hidden="true"> · </span>');
  return `<section class="ln-sec" aria-labelledby="ln-press-h">
      <h2 class="ln-h2" id="ln-press-h">${LN.pressTitle}</h2>
      <p class="ln-press">${links}</p>
    </section>`;
}

function foot(): string {
  const r = SITE.requisites;
  return `<footer class="ln-foot">
      <a class="ln-site" href="${LN.site.href}" data-goal="${LN.site.goal}">${LN.site.label}${elIcon('arrow-right', 'ln-site__icon')}</a>
      <p class="ln-legal"><a href="${SITE.legal.privacy}">Политика конфиденциальности</a><span aria-hidden="true"> · </span><a href="${SITE.legal.consent}">Согласие на обработку персональных данных</a></p>
      <p class="ln-req">${r.name} · ИНН ${r.inn} · ОГРНИП ${r.ogrnip}</p>
    </footer>`;
}

function modal(): string {
  // окно записи — то же, что на /electronics (стили .el-modal), с той же формой заявки
  return `<dialog class="el-modal ln-modal" id="ln-modal" aria-labelledby="ln-modal-title" aria-describedby="ln-modal-text">
    <div class="el-modal__box" tabindex="-1">
      <button type="button" class="el-modal__close" data-modal-close aria-label="${LN.modal.close}">${elIcon('x')}</button>
      <p class="el-modal__title" id="ln-modal-title">${LN.modal.title}</p>
      <p class="el-modal__text" id="ln-modal-text">${LN.modal.text}</p>
      ${leadForm({
        id: 'ln-lead-form',
        source: LN.source,
        ageType: 'select',
        ageOptions: [...LN.modal.ageOptions],
        phoneLabel: EL.modal.phoneLabel,
        branches: SITE.branches.map((b) => ({ value: b.id, label: b.selectLabel })),
        branchLabel: EL.modal.branchLabel,
        branchError: EL.modal.branchError,
        submitLabel: LN.modal.submit,
        footText: EL.modal.formFoot,
        successTitle: LN.modal.successTitle,
        successText: LN.modal.successText,
      })}
    </div>
  </dialog>`;
}

/** Лёгкая страница: без отступов между тегами и служебных комментариев (текст и пробелы внутри строк не трогаем) */
function compact(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();
}

export function renderLinksPage(): string {
  return compact(`<main class="ln" id="main">
    ${head()}
    <p class="ln-offer">${icon('check', 'ln-offer__icon')}${LN.hero.offer}</p>
    <button type="button" class="btn ln-primary" data-ln-open data-goal="links_signup_open" aria-haspopup="dialog" aria-controls="ln-modal">${LN.signup}</button>
    ${contacts()}
    <div class="ln-rest">
    ${courses()}
    ${branches()}
    ${press()}
    ${foot()}
    </div>
  </main>
  ${modal()}
  ${cookieBanner()}`);
}
