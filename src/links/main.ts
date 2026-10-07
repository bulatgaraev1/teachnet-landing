/**
 * Клиентский JS страницы /links. HTML уже статичный (src/links/page.ts), здесь только:
 * окно записи с формой (components/form.ts → send.php, цель lead_form с source=links),
 * клик-цели по data-goal, метки визита в ссылках на сайт, cookie-плашка.
 */
import '../styles/main.css';
import '../styles/electronics.css'; // окно записи .el-modal — общее с /electronics
import '../styles/links.css';

import { captureVisit } from '../lib/visit';
import type { Visit } from '../lib/visit';
import { initGoalLinks } from '../lib/nav';
import { initForm } from '../components/form';
import { initCookieBanner } from '../components/cookie-banner';
import { initModal } from './modal';

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Ссылки внутри сайта уносят UTM текущего визита: метки из адреса /links,
 * а если их там нет — сохранённые за визит (lib/visit.ts).
 */
function keepUtm(visit: Visit): void {
  const here = new URLSearchParams(location.search);
  const tags = new URLSearchParams();
  for (const k of UTM) {
    const v = here.get(k) || (visit as Partial<Record<string, string>>)[k];
    if (v) tags.set(k, v);
  }
  if (![...tags.keys()].length) return;
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => {
    try {
      const u = new URL(a.getAttribute('href') || '/', location.origin);
      tags.forEach((v, k) => u.searchParams.set(k, v));
      a.href = u.pathname + u.search + u.hash;
    } catch {
      /* кривой адрес — оставляем как есть */
    }
  });
}

function init(): void {
  keepUtm(captureVisit());
  initGoalLinks();
  initModal();
  // source для цели lead_form — из скрытого поля формы (LN.source), чтобы не тянуть тексты страницы в JS
  const source = document.querySelector<HTMLInputElement>('#ln-lead-form input[name="source"]')?.value || 'links';
  initForm(document, 'ln-lead-form', { source });
  initCookieBanner();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
