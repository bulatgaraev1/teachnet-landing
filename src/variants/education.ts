/**
 * Вариант B главной для A/B-теста: /education «Сравнение». Текущая главная (/) — вариант A.
 * Блоки, порядок и компоновка — ровно по утверждённому макету (docs/mockups/education-mockup.html).
 * С сайта — только независимые блоки: единый подвал, cookie-плашка, а также плавающая кнопка записи
 * (решение владельца). Меню на телефоне — выпадающее, из макета. Стили — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { ITEMS } from '../sections/faq';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { abHeader } from './sections/header';
import { heroB, thanksB, compareB, stepsB, lessonB, proofB, motivationB, priceB, galleryB, faqB, finalB } from './sections/b';

// «Цена» — та же цель, что на главной; остальные пункты — свои цели с параметром place (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Чем мы отличаемся', href: '#compare', goal: 'nav_compare' },
  { label: 'Как проходит урок', href: '#lesson', goal: 'nav_lesson' },
  { label: 'Ступени', href: '#steps', goal: 'nav_b_steps' },
  { label: 'Цена', href: '#price-info', goal: 'nav_price' },
  { label: 'Галерея', href: '#gallery', goal: 'nav_b_gallery' },
];

export function renderEducationPage(): string {
  // «Остальные вопросы — как в основной версии сайта» (пометка в макете): вопросы главной с ответами
  const rest = ITEMS.filter((it) => !it.a.includes('<!--'));
  return [
    abHeader({ nav: NAV }),
    '<main id="main" class="ab-main">',
    heroB(),
    thanksB(),
    compareB(),
    stepsB(),
    lessonB(),
    proofB(),
    motivationB(),
    priceB(),
    galleryB(),
    faqB(rest),
    finalB(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
