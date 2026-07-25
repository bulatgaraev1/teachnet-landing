/** Шапка (§8). Прозрачная поверх hero, тёмный логотип слева, якоря + компактный CTA.
 *  На мобильном навигация и CTA уезжают в боковое меню (бургер). */
import { cta } from '../components/button';
import { icon } from '../lib/icons';
import { SITE } from '../lib/site';

// якорь раздела → идентификатор клик-цели Метрики для пунктов навигации
const NAV_GOALS: Record<string, string> = {
  '#programs': 'nav_programs',
  '#price': 'nav_price',
  '#press': 'nav_press',
  '#faq': 'nav_faq',
};

export function header(): string {
  const nav = SITE.nav
    .map((n) => {
      const g = NAV_GOALS[n.href];
      return `<a href="${n.href}"${g ? ` data-goal="${g}"` : ''}>${n.label}</a>`;
    })
    .join('');
  return `<header class="site-header" id="top">
    <div class="container site-header__inner">
      <a href="#top" class="site-header__brand" aria-label="${SITE.brand} — на главную">
        <img class="site-header__logo" src="/images/logo-dark.svg" width="121" height="38" alt="${SITE.brand}" />
      </a>
      <nav class="site-nav" aria-label="Разделы сайта">${nav}</nav>
      <div class="site-header__right">
        <a class="site-header__phone" href="${SITE.phoneHref}" data-goal="nav_phone">${SITE.phoneDisplay}</a>
        ${cta({ label: 'Пробный урок', compact: true, extraClass: 'site-header__cta', goal: 'nav_cta' })}
        <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-nav" data-mm-open>${icon('menu')}</button>
      </div>
    </div>
  </header>`;
}
