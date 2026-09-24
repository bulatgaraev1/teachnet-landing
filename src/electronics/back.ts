/**
 * Кнопка возврата.
 * Пришли с этого же сайта: «Назад», history.back() (браузер вернёт на то же место
 * главной, страховка в src/lib/return-position.ts). Пришли извне или напрямую:
 * «Все направления», обычная ссылка в блок направлений на главной.
 * Переходы по якорям внутри страницы не добавляют записей в историю,
 * чтобы «Назад» всегда вёл на предыдущую страницу, а не к предыдущему якорю.
 */
import { track } from './analytics';

function cameFromSite(): boolean {
  try {
    if (!document.referrer) return false;
    const r = new URL(document.referrer);
    return r.origin === location.origin && r.pathname !== location.pathname;
  } catch {
    return false;
  }
}

export function initBack(): void {
  const btn = document.querySelector<HTMLAnchorElement>('a[data-back]');
  if (!btn) return;
  const mode = cameFromSite() && history.length > 1 ? 'history' : 'directions';
  btn.dataset.mode = mode;
  if (mode === 'history') {
    const label = btn.querySelector('.el-back__label');
    if (label) label.textContent = btn.dataset.labelHistory || 'Назад';
  }

  let fallback = 0;
  window.addEventListener('pagehide', () => window.clearTimeout(fallback));

  btn.addEventListener('click', (e) => {
    track('back_click', { mode });
    if (mode !== 'history') return;
    e.preventDefault();
    history.back();
    // если вернуться некуда (история пуста), уходим в блок направлений
    fallback = window.setTimeout(() => {
      location.href = btn.href;
    }, 800);
  });
}

export function initAnchors(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLAnchorElement>('a[data-anchor]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href') || '';
      const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(history.state, '', id);
    });
  });
}
