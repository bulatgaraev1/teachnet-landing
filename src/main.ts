/**
 * Клиентская точка входа. HTML уже отрендерен статически (vite-плагином из секций),
 * здесь только навешиваем поведение на готовый DOM.
 */
import './styles/main.css';

import { initHeader } from './lib/header';
import { initNav } from './lib/nav';
import { initReveal, initRouteLine } from './lib/reveal';
import { initScrollGoals } from './lib/scroll-goals';
import { initAccordion } from './components/accordion';
import { initForm } from './components/form';
import { initStickyBar } from './components/sticky-bar';
import { initCookieBanner } from './components/cookie-banner';
import { initMobileMenu } from './components/mobile-menu';
import { initReturnPosition } from './lib/return-position';
import { captureVisit } from './lib/visit';

// до DOMContentLoaded: обработчик pageshow должен успеть подписаться
initReturnPosition();

function init(): void {
  captureVisit();
  initHeader();
  initNav();
  initReveal();
  initRouteLine();
  initScrollGoals();
  initAccordion();
  initForm();
  initStickyBar();
  initCookieBanner();
  initMobileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
