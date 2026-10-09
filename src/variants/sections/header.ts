/**
 * Шапка вариантов главной — по макетам: логотип, разделы, телефон, кнопка «Записаться».
 * Бургер-меню добавлено по решению владельца (в макете меню на телефоне просто скрывается).
 */
import { SITE } from '../../lib/site';
import type { NavItem } from '../../lib/site';
import { icon } from '../../lib/icons';

export function abHeader({ nav, dark = false }: { nav: readonly NavItem[]; dark?: boolean }): string {
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
        <a class="ab-header__btn" href="#lead" data-goal="nav_cta">Записаться</a>
        <button class="burger ab-header__burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-nav" data-mm-open>${icon('menu')}</button>
      </div>
    </div>
  </header>`;
}
