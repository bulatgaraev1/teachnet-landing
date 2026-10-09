/**
 * Шапка вариантов главной — по макетам: логотип, разделы, телефон, кнопка «Записаться».
 * Меню на телефоне (до 820 px) — выпадающая панель под шапкой, вид и состав — из макетов
 * (docs/mockups/education-mockup.html — светлая, education2-mockup.html — тёмная).
 */
import { SITE } from '../../lib/site';
import type { NavItem } from '../../lib/site';

// иконка бургера из макетов
const BURGER =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

interface AbHeaderOptions {
  nav: readonly NavItem[];
  dark?: boolean;
  /** куда ведёт «Записаться» (и кнопка в выпадающем меню) */
  ctaHref?: string;
}

/** Выпадающее меню: разделы, телефон, кнопка записи. Цели — как у меню главной (place=menu). */
function dropdown(nav: readonly NavItem[], ctaHref: string): string {
  const links = nav
    .map((n) => `<a class="ab-dd__link" href="${n.href}" data-goal="${n.goal}" data-goal-place="menu">${n.label}</a>`)
    .join('\n          ');
  return `<div class="ab-burger">
        <button class="ab-burger__btn" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="ab-menu" data-dd-toggle>${BURGER}</button>
        <nav class="ab-dd" id="ab-menu" aria-label="Меню" hidden>
          ${links}
          <a class="ab-dd__phone" href="${SITE.phoneHref}" data-goal="nav_phone" data-goal-place="menu">${SITE.phoneDisplay}</a>
          <a class="ab-dd__cta" href="${ctaHref}" data-goal="burger_cta">Записаться на пробный урок</a>
        </nav>
      </div>`;
}

export function abHeader({ nav, dark = false, ctaHref = '#lead' }: AbHeaderOptions): string {
  const links = nav.map((n) => `<a href="${n.href}" data-goal="${n.goal}" data-goal-place="header">${n.label}</a>`).join('');
  const logo = dark
    ? '<img class="ab-header__logo" src="/images/logo-white.svg" width="108" height="34" alt="TEACHNET" />'
    : '<img class="ab-header__logo" src="/images/logo-links.webp" width="121" height="34" alt="TEACHNET" />';
  return `<header class="ab-header${dark ? ' ab-header--dark' : ''}" id="top">
    <div class="ab-header__inner">
      <a href="#top" class="ab-header__brand" aria-label="TEACHNET — наверх страницы">${logo}</a>
      <nav class="ab-header__nav" aria-label="Разделы">${links}</nav>
      <div class="ab-header__right">
        <a class="ab-header__phone" href="${SITE.phoneHref}" data-goal="nav_phone" data-goal-place="header">${SITE.phoneDisplay}</a>
        <a class="ab-header__btn" href="${ctaHref}" data-goal="nav_cta">Записаться</a>
        ${dropdown(nav, ctaHref)}
      </div>
    </div>
  </header>`;
}
