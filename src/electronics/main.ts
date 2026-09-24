/**
 * Клиентский JS страницы /electronics. HTML уже статичный (src/electronics/page.ts),
 * здесь только: окно записи, кнопка «Назад», аналитика, появление блоков, FAQ-аккордеон, бургер-меню.
 */
import '../styles/main.css';
import '../styles/electronics.css';

import { initHeader } from '../lib/header';
import { initReveal } from '../lib/reveal';
import { captureVisit } from '../lib/visit';
import { initCookieBanner } from '../components/cookie-banner';
import { initAccordion } from '../components/accordion';
import { initMobileMenu } from '../components/mobile-menu';
import { initAnalytics } from './analytics';
import { initModal } from './modal';
import { initBack, initAnchors } from './back';
import { applySourceToLinks } from './source';

function init(): void {
  applySourceToLinks(captureVisit());
  initAnalytics();
  initModal();
  initBack();
  initAnchors();
  initHeader();
  initReveal();
  initAccordion();
  initMobileMenu();
  initCookieBanner();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
