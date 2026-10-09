/**
 * Шапка вариантов главной — по макетам: логотип, разделы, телефон, кнопка «Записаться».
 * Меню на телефоне:
 *  - B (/education) — бургер открывает боковое меню сайта (mobileMenu), решение владельца;
 *  - C (/education2) — выпадающая тёмная панель под шапкой, вид и состав — из макета education2-mockup.html.
 */
import { SITE } from '../../lib/site';
import type { NavItem } from '../../lib/site';
import { icon } from '../../lib/icons';

// иконка бургера из макета C
const BURGER_C =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

interface AbHeaderOptions {
  nav: readonly NavItem[];
  dark?: boolean;
  /** куда ведёт «Записаться» (и кнопка в выпадающем меню) */
  ctaHref?: string;
  /** 'drawer' — боковое меню сайта, 'dropdown' — выпадающая панель из макета C */
  menu?: 'drawer' | 'dropdown';
}

/** Выпадающее меню C: разделы, телефон, кнопка записи. Цели — те же, что у бокового меню (place=menu). */
function dropdown(nav: readonly NavItem[], ctaHref: string): string {
  const links = nav
    .map((n) => `<a class="ab-dd__link" href="${n.href}" data-goal="${n.goal}" data-goal-place="menu">${n.label}</a>`)
    .join('\n          ');
  return `<div class="ab-burger">
        <button class="ab-burger__btn" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="ab-menu" data-dd-toggle>${BURGER_C}</button>
        <nav class="ab-dd" id="ab-menu" aria-label="Меню" hidden>
          ${links}
          <a class="ab-dd__phone" href="${SITE.phoneHref}" data-goal="nav_phone" data-goal-place="menu">${SITE.phoneDisplay}</a>
          <a class="ab-dd__cta" href="${ctaHref}" data-goal="burger_cta">Записаться на пробный урок</a>
        </nav>
      </div>`;
}

export function abHeader({ nav, dark = false, ctaHref = '#lead', menu = 'drawer' }: AbHeaderOptions): string {
  const links = nav.map((n) => `<a href="${n.href}" data-goal="${n.goal}" data-goal-place="header">${n.label}</a>`).join('');
  const logo = dark
    ? '<img class="ab-header__logo" src="/images/logo-white.svg" width="108" height="34" alt="TEACHNET" />'
    : '<img class="ab-header__logo" src="/images/logo-links.webp" width="121" height="34" alt="TEACHNET" />';
  const burger =
    menu === 'dropdown'
      ? dropdown(nav, ctaHref)
      : `<button class="burger ab-header__burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-nav" data-mm-open>${icon('menu')}</button>`;
  return `<header class="ab-header${dark ? ' ab-header--dark' : ''}" id="top">
    <div class="ab-header__inner">
      <a href="#top" class="ab-header__brand" aria-label="TEACHNET — наверх страницы">${logo}</a>
      <nav class="ab-header__nav" aria-label="Разделы">${links}</nav>
      <div class="ab-header__right">
        <a class="ab-header__phone" href="${SITE.phoneHref}" data-goal="nav_phone" data-goal-place="header">${SITE.phoneDisplay}</a>
        <a class="ab-header__btn" href="${ctaHref}" data-goal="nav_cta">Записаться</a>
        ${burger}
      </div>
    </div>
  </header>`;
}
