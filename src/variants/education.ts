/**
 * Вариант B главной для A/B-теста: /education «Сравнение». Текущая главная (/) — вариант A.
 * Самостоятельный лендинг для рекламы: меню, кнопки и логотип — только якоря этой страницы,
 * в подвале нет ссылок на другие страницы сайта. Секции главной переиспользуются,
 * новые блоки — src/variants/sections/. Стили блоков — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { header } from '../sections/header';
import { trust } from '../sections/trust';
import { translator } from '../sections/translator';
import { programs } from '../sections/programs';
import { motivation } from '../sections/motivation';
import { parents } from '../sections/parents';
import { conversion } from '../sections/conversion';
import { price } from '../sections/price';
import { mediaMentions } from '../sections/media-mentions';
import { faq } from '../sections/faq';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { mobileMenu } from '../components/mobile-menu';
import { heroB } from './sections/hero-b';
import { compare } from './sections/compare';
import { lesson } from './sections/lesson';
import { proof } from './sections/proof';
import { finalB } from './sections/final-b';
import { FAQ_DIFFERENCE } from './shared';

// «Программы» и «Цена» — те же цели, что на главной; новые пункты — свои цели (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Чем мы отличаемся', href: '#compare', goal: 'nav_compare' },
  { label: 'Как проходит урок', href: '#lesson', goal: 'nav_lesson' },
  { label: 'Программы', href: '#programs', goal: 'nav_programs' },
  { label: 'Цена', href: '#price', goal: 'nav_price' },
];

export function renderEducationPage(): string {
  return [
    header({ nav: NAV }),
    mobileMenu(NAV),
    '<main id="main">',
    heroB(),
    trust(),
    compare(),
    lesson(),
    proof(),
    translator(),
    programs({ courseLinks: false }),
    motivation(),
    parents(),
    conversion({ source: 'education' }),
    price(),
    mediaMentions(),
    faq({ prepend: [FAQ_DIFFERENCE] }),
    finalB(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
