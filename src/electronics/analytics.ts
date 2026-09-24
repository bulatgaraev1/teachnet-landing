/**
 * Аналитика страницы /electronics (Яндекс.Метрика, счётчик из src/lib/metrika.ts).
 * Все цели идут через track(goal, params): не падает, если Метрика не загрузилась
 * или заблокирована. Полный список целей: docs/analytics-electronics.md.
 */
import { YM_COUNTER_ID } from '../lib/metrika';

export type GoalParams = Record<string, string | number>;

function ym(...args: unknown[]): void {
  try {
    const fn = (window as unknown as { ym?: (...a: unknown[]) => void }).ym;
    if (typeof fn === 'function') fn(YM_COUNTER_ID, ...args);
  } catch {
    /* Метрика недоступна: страница работает без неё */
  }
}

/** Цель Метрики (тип «JavaScript-событие») */
export function track(goal: string, params?: GoalParams): void {
  if (params) ym('reachGoal', goal, params);
  else ym('reachGoal', goal);
}

/** Параметры визита */
export function visitParams(params: GoalParams): void {
  ym('params', params);
}

/* ---------- цели «один раз за визит» (скролл) ---------- */
const ONCE_KEY = 'tn_el_once';
const memory = new Set<string>();

function onceDone(goal: string): boolean {
  if (memory.has(goal)) return true;
  try {
    const list = JSON.parse(sessionStorage.getItem(ONCE_KEY) || '[]') as string[];
    return list.includes(goal);
  } catch {
    return false;
  }
}

function markOnce(goal: string): void {
  memory.add(goal);
  try {
    const list = JSON.parse(sessionStorage.getItem(ONCE_KEY) || '[]') as string[];
    if (!list.includes(goal)) list.push(goal);
    sessionStorage.setItem(ONCE_KEY, JSON.stringify(list));
  } catch {
    /* без sessionStorage: один раз за загрузку страницы */
  }
}

const DWELL_MS = 600;

/**
 * scroll_trial / scroll_price / scroll_faq / scroll_contacts: блок виден на 50%
 * (для блоков выше экрана: закрывает не меньше половины окна) непрерывно 600 мс,
 * один раз за визит. Выдержка отсекает пролёт через блок при переходе по якорю.
 */
function initScrollGoals(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-scroll-goal]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  const timers = new Map<Element, number>();

  const visible = (en: IntersectionObserverEntry): boolean => {
    if (!en.isIntersecting) return false;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return en.intersectionRatio >= 0.5 || en.intersectionRect.height >= vh * 0.5;
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const el = en.target as HTMLElement;
        const goal = el.dataset.scrollGoal || '';
        if (!goal || onceDone(goal)) {
          io.unobserve(el);
          continue;
        }
        if (visible(en)) {
          if (timers.has(el)) continue;
          timers.set(
            el,
            window.setTimeout(() => {
              timers.delete(el);
              if (onceDone(goal)) return;
              markOnce(goal);
              track(goal);
              io.unobserve(el);
            }, DWELL_MS),
          );
        } else {
          const id = timers.get(el);
          if (id) {
            clearTimeout(id);
            timers.delete(el);
          }
        }
      }
    },
    { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  );
  els.forEach((el) => io.observe(el));
}

/** Место клика по телефону: modal / faq / contacts / header / footer */
function phonePlace(a: HTMLElement): string {
  if (a.dataset.place) return a.dataset.place;
  if (a.closest('.site-footer')) return 'footer';
  if (a.closest('.site-header')) return 'header';
  return 'page';
}

export function initAnalytics(): void {
  visitParams({ direction: 'electronics' });

  // один делегированный обработчик: одна цель на одно действие
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    const a = t?.closest?.<HTMLElement>('a[href], [data-press]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('phone_click', { place: phonePlace(a) });
    else if (a.dataset.press) track('press_click', { source: a.dataset.press });
    else if (a.hasAttribute('data-map-link')) track('map_click');
    else if (a.hasAttribute('data-cross')) track('cross_robotics');
  });

  initScrollGoals();
}
