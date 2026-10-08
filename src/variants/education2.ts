/**
 * Вариант C главной для A/B-теста: /education2 «Манифест», тёмная подача.
 * Самостоятельный лендинг для рекламы: меню, кнопки и логотип — только якоря этой страницы,
 * в подвале нет ссылок на другие страницы сайта. Секции главной переиспользуются,
 * новые блоки — src/variants/sections/. Светлые блоки (правила, программы, цена, форма, вопросы)
 * — в обёртке .ab-light. Стили — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { header } from '../sections/header';
import { programs } from '../sections/programs';
import { price } from '../sections/price';
import { conversion } from '../sections/conversion';
import { faq } from '../sections/faq';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { mobileMenu } from '../components/mobile-menu';
import { heroC } from './sections/hero-c';
import { photosC } from './sections/photos-c';
import { seen } from './sections/seen';
import { rules } from './sections/rules';
import { who } from './sections/who';
import { dare } from './sections/dare';
import { finalC } from './sections/final-c';
import { FAQ_DIFFERENCE } from './shared';

// «Цена» — та же цель, что на главной; новые пункты — свои цели (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Что мы видели', href: '#seen', goal: 'nav_seen' },
  { label: 'Наши правила', href: '#rules', goal: 'nav_rules' },
  { label: 'Кто мы', href: '#who', goal: 'nav_who' },
  { label: 'Цена', href: '#price', goal: 'nav_price' },
];

export function renderEducation2Page(): string {
  return [
    header({ nav: NAV, logo: '/images/logo-white.svg' }),
    mobileMenu(NAV),
    '<main id="main">',
    heroC(),
    photosC(),
    seen(),
    rules(),
    who(),
    dare(),
    '<div class="ab-light">',
    programs({ courseLinks: false }),
    price(),
    conversion({ source: 'education2' }),
    faq({ prepend: [FAQ_DIFFERENCE] }),
    '</div>',
    finalC(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
