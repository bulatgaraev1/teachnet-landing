/**
 * Код источника визита (yd / vk / org / ref / dir) для ссылок мессенджеров:
 * start=electronics_<код>, ref=electronics_<код>. Таблица соответствия:
 * EL_CONFIG.sourceCodes в src/content/electronics.config.ts.
 */
import { EL_CONFIG } from '../content/electronics.config';
import type { MessengerId, SourceCode } from '../content/electronics.config';
import type { Visit } from '../lib/visit';

const SAFE = /^[A-Za-z0-9_-]{1,64}$/;

function hostMatches(host: string, mask: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  const re = new RegExp('(^|\\.)' + mask.replace(/\./g, '\\.').replace(/\*/g, '[a-z.]+') + '$');
  return re.test(h);
}

export function sourceCode(v: Visit): SourceCode {
  const t = EL_CONFIG.sourceCodes;
  const src = (v.utm_source || '').toLowerCase();
  if (src && (t.yd.utmSources as readonly string[]).includes(src)) return 'yd';
  if (src && (t.vk.utmSources as readonly string[]).includes(src)) return 'vk';
  if (v.yclid && t.yd.yclid) return 'yd';
  if (v.utm_source || v.utm_medium || v.utm_campaign) return 'ref';
  if (v.referrer) {
    return t.org.referrerHosts.some((m) => hostMatches(v.referrer, m)) ? 'org' : 'ref';
  }
  return 'dir';
}

/** Значение параметра: electronics_<код>, только A-Z a-z 0-9 _ -, не длиннее 64 */
export function startValue(code: string): string {
  const v = `${EL_CONFIG.startPrefix}_${code}`;
  return SAFE.test(v) ? v : EL_CONFIG.startPrefix;
}

export function messengerHref(id: MessengerId, code: string): string {
  const m = EL_CONFIG.messengers[id];
  if (!m.param) return m.base;
  try {
    const u = new URL(m.base);
    u.searchParams.set(m.param, startValue(code));
    return u.toString();
  } catch {
    return m.base; // плейсхолдер ещё не заменён на реальный адрес
  }
}

/** Проставляет код источника в ссылки мессенджеров в окне записи */
export function applySourceToLinks(v: Visit): SourceCode {
  const code = sourceCode(v);
  document.querySelectorAll<HTMLAnchorElement>('a[data-msg]').forEach((a) => {
    a.href = messengerHref(a.dataset.msg as MessengerId, code);
  });
  return code;
}
