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
import { initFaqGoals } from './lib/faq-goals';
import { initForm } from './components/form';
import { initStickyBar } from './components/sticky-bar';
import { initCookieBanner } from './components/cookie-banner';
import { initMobileMenu } from './components/mobile-menu';
import { initReturnPosition } from './lib/return-position';
import { captureVisit } from './lib/visit';
import { visitParams } from './lib/metrika';

// до DOMContentLoaded: обработчик pageshow должен успеть подписаться
initReturnPosition();

function init(): void {
  // Варианты главной для A/B-теста (/education, /education2) работают на этом же скрипте:
  // вариант и source заявки — в атрибутах <body data-ab-variant="b" data-lead-source="education">
  const ab = document.body.dataset;
  if (ab.abVariant) visitParams({ ab_variant: ab.abVariant });
  captureVisit();
  initHeader();
  initNav();
  initReveal();
  initRouteLine();
  initScrollGoals();
  initAccordion();
  initFaqGoals(); // faq_open {n, q} — секции с data-faq-goal
  // на вариантах цель lead_form уходит с source варианта (на главной — как было)
  initForm(document, 'lead-form', ab.leadSource ? { source: ab.leadSource } : undefined);
  initStickyBar();
  initCookieBanner();
  initMobileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
