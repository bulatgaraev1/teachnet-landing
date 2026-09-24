/**
 * Источник визита для всего сайта: при входе сохраняем в sessionStorage
 * utm_source, utm_medium, utm_campaign, yclid и внешний referrer, чтобы метки
 * переносились между страницами в рамках визита (вкладки).
 * Новые метки в адресе перезаписывают запись; без меток запись создаётся один раз.
 */
const KEY = 'tn_visit';
const TAGS = ['utm_source', 'utm_medium', 'utm_campaign', 'yclid'] as const;

export type VisitTag = (typeof TAGS)[number];
export type Visit = Partial<Record<VisitTag, string>> & { referrer: string };

/** Хост внешнего referrer; пустая строка, если заход прямой или с этого же сайта */
function externalReferrer(): string {
  try {
    if (!document.referrer) return '';
    const u = new URL(document.referrer);
    return u.host === location.host ? '' : u.host;
  } catch {
    return '';
  }
}

function read(): Visit | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Visit) : null;
  } catch {
    return null;
  }
}

export function captureVisit(): Visit {
  const params = new URLSearchParams(location.search);
  const fresh: Visit = { referrer: externalReferrer() };
  let tagged = false;
  for (const k of TAGS) {
    const v = params.get(k);
    if (v) {
      fresh[k] = v.slice(0, 200);
      tagged = true;
    }
  }
  const saved = read();
  if (saved && !tagged) return saved;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {
    /* sessionStorage недоступен: работаем с данными текущей страницы */
  }
  return fresh;
}
