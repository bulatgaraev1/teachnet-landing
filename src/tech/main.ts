/**
 * Клиентский JS страницы /tech. HTML уже статичный (src/tech/page.ts), здесь только:
 * блок «Что на плате», форма заявки, переходы по якорям, бургер-меню, FAQ-аккордеон,
 * появление блоков, cookie-баннер.
 */
import '../styles/main.css';
import '../styles/electronics.css';
import '../styles/tech.css';

import { initHeader } from '../lib/header';
import { initReveal } from '../lib/reveal';
import { initCookieBanner } from '../components/cookie-banner';
import { initAccordion } from '../components/accordion';
import { initMobileMenu } from '../components/mobile-menu';
import { initGoalLinks } from '../lib/nav';
import { initScrollGoals } from '../lib/scroll-goals';
import { initFaqGoals } from '../lib/faq-goals';
import { initBoard } from './board';
import type { BoardApi } from './board';
import { initTechForm } from './form';

/** Якоря: плавно (или сразу при reduced motion), без лишних записей в историю.
 *  data-open-tab="pins" — перед переходом открыть вкладку «Выводы». */
function initAnchors(board: BoardApi | null): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLAnchorElement>('a[data-anchor]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href') || '';
      const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!target) return;
      e.preventDefault();
      if (a.dataset.openTab === 'pins') board?.openTab('pins');
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(history.state, '', id);
    });
  });
}

function init(): void {
  const board = initBoard();
  initTechForm();
  initAnchors(board);
  initGoalLinks(); // клик-цели [data-goal]: кнопки, меню, ссылки, подвал
  initScrollGoals(); // скролл-цели [data-scroll-goal]: разделы страницы и подвал
  initHeader();
  initReveal();
  initAccordion();
  initFaqGoals(); // tech_faq_open {n, q}
  initMobileMenu();
  initCookieBanner();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
