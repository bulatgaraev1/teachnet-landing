/**
 * Вариант C главной для A/B-теста: /education2 «Манифест», тёмная подача.
 * Блоки, порядок и компоновка — ровно по утверждённому макету (education2-mockup.html).
 * С сайта — только независимые блоки: единый подвал, cookie-плашка, а также бургер-меню
 * и плавающая кнопка записи (решение владельца). Стили — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { mobileMenu } from '../components/mobile-menu';
import { abHeader } from './sections/header';
import { heroC, photosC, seenC, rulesC, whoC, dareC, priceC, finalC } from './sections/c';

// «Цена» — та же цель, что на главной; новые пункты — свои цели (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Что мы видели', href: '#seen', goal: 'nav_seen' },
  { label: 'Наши правила', href: '#rules', goal: 'nav_rules' },
  { label: 'Кто мы', href: '#who', goal: 'nav_who' },
  { label: 'Цена', href: '#price', goal: 'nav_price' },
];

export function renderEducation2Page(): string {
  return [
    abHeader({ nav: NAV, dark: true }),
    mobileMenu(NAV),
    '<main id="main" class="ab-main">',
    heroC(),
    photosC(),
    seenC(),
    rulesC(),
    whoC(),
    dareC(),
    priceC(),
    finalC(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
