/**
 * Точный возврат на главную со страницы /electronics.
 * 1) Клик по любой ссылке в /electronics: сохраняем путь и window.scrollY.
 * 2) Страховка: на pageshow при навигации «назад/вперёд» прокручиваем к
 *    сохранённой позиции (если браузер не восстановил её сам) и очищаем запись.
 */
const KEY = 'tn_return';
const TARGETS = ['/electronics'];

interface ReturnPos {
  path: string;
  y: number;
}

function isTarget(a: HTMLAnchorElement): boolean {
  try {
    const u = new URL(a.href, location.href);
    return u.origin === location.origin && TARGETS.includes(u.pathname.replace(/(\.html|\/)$/, ''));
  } catch {
    return false;
  }
}

export function initReturnPosition(): void {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !isTarget(a)) return;
      const rec: ReturnPos = { path: location.pathname, y: Math.round(window.scrollY) };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(rec));
      } catch {
        /* нет sessionStorage: вернёмся штатным восстановлением браузера */
      }
    },
    true,
  );

  window.addEventListener('pageshow', (e) => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!e.persisted && nav?.type !== 'back_forward') return;
    let rec: ReturnPos | null = null;
    try {
      rec = JSON.parse(sessionStorage.getItem(KEY) || 'null') as ReturnPos | null;
    } catch {
      rec = null;
    }
    if (!rec || rec.path !== location.pathname) return;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    const y = rec.y;
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'instant' });
    });
  });
}
