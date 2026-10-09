/**
 * Скролл-цели Яндекс.Метрики (через обёртку reachGoal(), счётчик 96429194).
 * Цель по секции с data-scroll-goal="scroll_…" отправляется ОДИН раз за визит и
 * только если секция провисела видимой непрерывно ~600 мс. Выдержка по времени
 * убирает ложные срабатывания при клике по якорям в навигации, когда страница
 * быстро пролистывается через промежуточные секции.
 *
 * Видимой считается секция, у которой в окне ≥50% площади, либо (для секций выше
 * экрана) её середина прошла центр окна.
 */
import { reachGoal } from './metrika';

const DWELL_MS = 600; // сколько мс секция должна быть видимой непрерывно
const VISIBLE_RATIO = 0.5;

export function initScrollGoals(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-scroll-goal]');
  if (!els.length || !('IntersectionObserver' in window)) return;

  const fired = new Set<string>();
  const timers = new Map<Element, number>();

  const isVisible = (entry: IntersectionObserverEntry): boolean => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const r = entry.boundingClientRect;
    const ratioOk = entry.intersectionRatio >= VISIBLE_RATIO;
    const midReached = r.height > vh && r.top <= vh / 2 && r.bottom >= vh / 2; // высокие секции
    return entry.isIntersecting && (ratioOk || midReached);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const goal = el.getAttribute('data-scroll-goal') || '';
        if (!goal || fired.has(goal)) {
          observer.unobserve(el);
          continue;
        }

        if (isVisible(entry)) {
          if (!timers.has(el)) {
            const id = window.setTimeout(() => {
              timers.delete(el);
              if (!fired.has(goal)) {
                fired.add(goal);
                reachGoal(goal); // шлём цель только после выдержки
                observer.unobserve(el);
              }
            }, DWELL_MS);
            timers.set(el, id);
          }
        } else {
          const id = timers.get(el); // ушла из кадра раньше — отменяем
          if (id) {
            clearTimeout(id);
            timers.delete(el);
          }
        }
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  els.forEach((el) => observer.observe(el));
}

/**
 * Цель на первую прокрутку горизонтальной ленты (data-swipe-goal="…", например галерея
 * /education2): уходит один раз за просмотр страницы, когда пользователь сдвинул ленту.
 * Сама страница ленту не прокручивает, поэтому любой сдвиг — действие пользователя.
 */
export function initSwipeGoals(): void {
  document.querySelectorAll<HTMLElement>('[data-swipe-goal]').forEach((el) => {
    const goal = el.getAttribute('data-swipe-goal') || '';
    const onScroll = (): void => {
      if (Math.abs(el.scrollLeft) < 4) return; // доводка scroll-snap на месте — не прокрутка
      el.removeEventListener('scroll', onScroll);
      reachGoal(goal);
    };
    if (goal) el.addEventListener('scroll', onScroll, { passive: true });
  });
}
