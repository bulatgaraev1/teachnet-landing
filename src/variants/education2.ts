/**
 * Вариант C главной для A/B-теста: /education2 «Манифест», тёмная подача.
 * Блоки, порядок и компоновка — ровно по утверждённому макету (docs/mockups/education2-mockup.html).
 * С сайта — только независимые блоки: единый подвал, cookie-плашка, а также плавающая кнопка записи
 * (решение владельца). Меню на телефоне — выпадающее, из макета. Стили — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { abHeader } from './sections/header';
import { SIGNUP, heroC, photosC, seenC, rulesC, stepsC, notedC, whoC, dareC, priceC, galleryC, finalC } from './sections/c';

// «Цена» — та же цель, что на главной; остальные пункты — свои цели с параметром place (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Что мы видели', href: '#seen', goal: 'nav_seen' },
  { label: 'Наши правила', href: '#rules', goal: 'nav_rules' },
  { label: 'Ступени', href: '#steps', goal: 'nav_steps' },
  { label: 'Кто мы', href: '#who', goal: 'nav_who' },
  { label: 'Цена', href: '#mprice-info', goal: 'nav_price' },
  { label: 'Галерея', href: '#gallery', goal: 'nav_gallery' },
];

export function renderEducation2Page(): string {
  return [
    abHeader({ nav: NAV, dark: true, ctaHref: SIGNUP }),
    '<main id="main" class="ab-main">',
    heroC(),
    photosC(),
    seenC(),
    rulesC(),
    stepsC(),
    notedC(),
    whoC(),
    dareC(),
    priceC(),
    galleryC(),
    finalC(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar({ href: SIGNUP }),
    cookieBanner(),
  ].join('\n');
}
