/**
 * Яндекс.Метрика — отправка целей. Счётчик подключён в index.html / child.html.
 * Здесь — безопасная обёртка: если счётчик недоступен, вызовы тихо игнорируются.
 *
 * Цели: lead_form — успешная отправка формы; клик-цели по элементам с data-goal
 * (nav_programs, nav_price, nav_faq, nav_phone, nav_cta, burger_cta, hero_cta,
 * block4_signup, block12_cta, sticky_cta) — см. lib/nav.ts; скролл-цели секций
 * scroll_… — см. lib/scroll-goals.ts.
 */

// Номер счётчика Яндекс.Метрики (тот же, что подключён в index.html)
export const YM_COUNTER_ID = 96429194;

type YmCallback = (clientId: string) => void;
type Ym = (id: number, action: string, value: string | YmCallback | Record<string, string>, params?: Record<string, string>) => void;

/** params: необязательные параметры цели (например, branch для lead_form на /electronics) */
export function reachGoal(goal: string, params?: Record<string, string>): void {
  const ym = (window as unknown as { ym?: Ym }).ym;
  if (YM_COUNTER_ID && typeof ym === 'function') {
    if (params) ym(YM_COUNTER_ID, 'reachGoal', goal, params);
    else ym(YM_COUNTER_ID, 'reachGoal', goal);
  }
}

/** Параметры визита (например, { ab_variant: 'b' } на вариантах главной): ym(id, 'params', …) */
export function visitParams(params: Record<string, string>): void {
  const ym = (window as unknown as { ym?: Ym }).ym;
  if (YM_COUNTER_ID && typeof ym === 'function') ym(YM_COUNTER_ID, 'params', params);
}

/** Параметры клик-цели из атрибутов data-goal-<имя>="значение"
 *  (data-goal-place="menu" → { place: "menu" }); нет атрибутов — undefined */
export function goalParams(el: HTMLElement): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(el.dataset)) {
    if (k.startsWith('goal') && k !== 'goal' && v) params[k.charAt(4).toLowerCase() + k.slice(5)] = v;
  }
  return Object.keys(params).length ? params : undefined;
}

/**
 * ClientID Яндекс.Метрики через её API — надёжнее, чем парсить куку _ym_uid.
 * Если счётчик не подключён / номер не задан — колбэк просто не вызывается.
 */
export function getClientId(cb: (clientId: string) => void): void {
  const ym = (window as unknown as { ym?: Ym }).ym;
  if (YM_COUNTER_ID && typeof ym === 'function') {
    try {
      ym(YM_COUNTER_ID, 'getClientID', cb);
    } catch {
      /* getClientID недоступен — тихо игнорируем */
    }
  }
}
