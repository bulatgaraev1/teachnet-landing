/**
 * Вариант B главной для A/B-теста: /education «Сравнение». Текущая главная (/) — вариант A.
 * Блоки, порядок и компоновка — ровно по утверждённому макету (education-mockup.html).
 * С сайта — только независимые блоки: единый подвал, cookie-плашка, а также бургер-меню
 * и плавающая кнопка записи (решение владельца). Стили — src/styles/ab.css (встраиваются в страницу).
 */
import type { NavItem } from '../lib/site';
import { ITEMS } from '../sections/faq';
import { footer } from '../sections/footer';
import { stickyBar } from '../components/sticky-bar';
import { cookieBanner } from '../components/cookie-banner';
import { mobileMenu } from '../components/mobile-menu';
import { abHeader } from './sections/header';
import { heroB, trustB, compareB, lessonB, proofB, programsB, motivationB, priceB, faqB, finalB } from './sections/b';

// «Программы» и «Цена» — те же цели, что на главной; новые пункты — свои цели (см. docs/analytics-ab.md)
const NAV: NavItem[] = [
  { label: 'Чем мы отличаемся', href: '#compare', goal: 'nav_compare' },
  { label: 'Как проходит урок', href: '#lesson', goal: 'nav_lesson' },
  { label: 'Программы', href: '#programs', goal: 'nav_programs' },
  { label: 'Цена', href: '#price', goal: 'nav_price' },
];

export function renderEducationPage(): string {
  // «Остальные вопросы — как в основной версии сайта» (пометка в макете): вопросы главной с ответами
  const rest = ITEMS.filter((it) => !it.a.includes('<!--'));
  return [
    abHeader({ nav: NAV }),
    mobileMenu(NAV),
    '<main id="main" class="ab-main">',
    heroB(),
    trustB(),
    compareB(),
    lessonB(),
    proofB(),
    programsB(),
    motivationB(),
    priceB(),
    faqB(rest),
    finalB(),
    '</main>',
    footer(true, { pageLinks: false }),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
