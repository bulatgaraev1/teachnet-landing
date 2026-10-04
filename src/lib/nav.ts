/**
 * Плавный скролл по якорям с учётом высоты фиксированной шапки + клик-цели
 * Яндекс.Метрики: на элементе с data-goal по клику шлём именно его идентификатор
 * через reachGoal() (каждая кнопка/ссылка — отдельная цель). Уважает
 * prefers-reduced-motion.
 */
import { goalParams, reachGoal } from './metrika';

function headerOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
  return (parseInt(raw, 10) || 64) + 14;
}

export function initNav(): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    // плейсхолдер-ссылка (юр-документы ещё не подключены) — гасим
    if (href === '#') {
      e.preventDefault();
      return;
    }
    if (href.length < 2) return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    history.pushState(null, '', href);
  });

  initGoalLinks();
}

/**
 * Клик-цели: на элементе с data-goal шлём именно его идентификатор (отдельная цель).
 * Цель уходит синхронно в момент клика, до перехода; переход не блокируем
 * (preventDefault нет), отправку переживающую уход со страницы делает Метрика (beacon).
 */
export function initGoalLinks(): void {
  const sendGoal = (e: MouseEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-goal]');
    const goal = el?.getAttribute('data-goal');
    if (!el || !goal) return;
    // параметры цели — из атрибутов data-goal-<имя>="значение" (например, data-goal-place="menu")
    reachGoal(goal, goalParams(el));
  };
  document.addEventListener('click', sendGoal);
  // средний клик (открыть в новой вкладке) не даёт события click
  document.addEventListener('auxclick', (e) => {
    if (e.button === 1) sendGoal(e);
  });
}
