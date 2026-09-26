/**
 * Форма заявки (блок 9, §7). Поля: имя · телефон · возраст ребёнка +
 * обязательный чекбокс согласия на обработку ПД (152-ФЗ). Маска телефона +7,
 * клиентская валидация, honeypot от спама. POST на /send.php.
 * После успеха — экран «Спасибо, перезвоним» вместо формы.
 */
import { icon } from '../lib/icons';
import { SITE } from '../lib/site';
import { reachGoal, getClientId } from '../lib/metrika';

export interface LeadFormOptions {
  /** скрытое поле source (напр. 'child-masterclass'); по умолчанию не добавляется */
  source?: string;
  /** поле возраста: текстовый ввод (по умолчанию) или выпадающий список диапазонов */
  ageType?: 'input' | 'select';
  /** подпись кнопки отправки */
  submitLabel?: string;
  /** id формы: если на странице несколько форм, у каждой свой (по умолчанию lead-form) */
  id?: string;
  /** варианты возраста для ageType: 'select' */
  ageOptions?: string[];
}

export function leadForm(opts: LeadFormOptions = {}): string {
  const {
    source = '',
    ageType = 'input',
    submitLabel = 'Записаться бесплатно',
    id = 'lead-form',
    ageOptions = ['6–8', '9–12', '13–16'],
  } = opts;

  const ageField =
    ageType === 'select'
      ? `<select class="field field--select" name="age" autocomplete="off" aria-label="Сколько лет ребёнку">
          <option value="" disabled selected>Сколько лет ребёнку</option>
${ageOptions.map((o) => `          <option value="${o}">${o}</option>`).join('\n')}
        </select>
        <span class="field-error">Выберите возраст ребёнка</span>`
      : `<input class="field" type="text" name="age" placeholder="Возраст ребёнка" inputmode="numeric" maxlength="2" autocomplete="off" aria-label="Возраст ребёнка" />
        <span class="field-error">Укажите возраст ребёнка</span>`;

  const sourceField = source
    ? `<input type="hidden" name="source" value="${source}" />`
    : '';

  return `<form class="lead-form" id="${id}" novalidate>
    <div class="form-grid">
      <div class="field-row">
        <input class="field" type="text" name="name" placeholder="Имя" autocomplete="name" aria-label="Имя" />
        <span class="field-error">Напишите, как вас зовут</span>
      </div>
      <div class="field-row">
        <input class="field" type="tel" name="phone" placeholder="+7 (___) ___-__-__" inputmode="tel" autocomplete="tel" aria-label="Телефон" />
        <span class="field-error">Введите номер телефона полностью</span>
      </div>
      <div class="field-row">${ageField}</div>
      <label class="consent">
        <input type="checkbox" name="consent" value="1" />
        <span>Я даю согласие на обработку <a href="${SITE.legal.consent}" target="_blank" rel="noopener">персональных данных</a></span>
      </label>
      <!-- honeypot: скрытое поле, заполняют только боты -->
      <input class="hp-field" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <!-- источник трафика и идентификаторы Яндекса — заполняются на клиенте (см. initForm) -->
      <input type="hidden" name="utm_source" />
      <input type="hidden" name="utm_medium" />
      <input type="hidden" name="utm_campaign" />
      <input type="hidden" name="utm_term" />
      <input type="hidden" name="utm_content" />
      <input type="hidden" name="yclid" />
      <input type="hidden" name="referrer" />
      <input type="hidden" name="ym_client_id" />
      ${sourceField}
      <button type="submit" class="btn btn--block">${submitLabel}</button>
    </div>
    <p class="form-foot micro">Перезвоним в течение 15 минут в рабочее время. Только чтобы согласовать время.</p>
    <div class="form-success" role="status" aria-live="polite">
      <span class="form-success__check">${icon('check')}</span>
      <h3 class="h3">Спасибо, перезвоним</h3>
      <p class="muted">Заявка принята. Свяжемся с вами, чтобы согласовать удобное время бесплатного урока.</p>
    </div>
  </form>`;
}

/* ---------- поведение ---------- */

// ─── Источник трафика (UTM/yclid) + ClientID Метрики ───────────────────────
// ключи, которые тянем из URL и сохраняем между переходами по сайту
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'yclid'] as const;
const ATTR_STORAGE_KEY = 'tn_attribution';

/** Считывает UTM/yclid из URL, объединяет с сохранёнными ранее (URL в приоритете). */
function captureAttribution(): Record<string, string> {
  let stored: Record<string, string> = {};
  try {
    stored = JSON.parse(localStorage.getItem(ATTR_STORAGE_KEY) || '{}') || {};
  } catch {
    stored = {};
  }
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of ATTR_KEYS) {
    const val = params.get(key);
    if (val) {
      stored[key] = val;
      changed = true;
    }
  }
  // первый реферер (document.referrer) сохраняем один раз — откуда пришёл пользователь
  if (typeof stored.referrer === 'undefined') {
    stored.referrer = document.referrer || '';
    changed = true;
  }
  if (changed) {
    try {
      localStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* localStorage недоступен — не критично */
    }
  }
  return stored;
}

/** Значение cookie по имени (фолбэк _ym_uid → ClientID). */
function readCookie(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

/** Заполняет скрытые поля формы источником трафика и ClientID Метрики. */
function fillAttribution(form: HTMLFormElement): void {
  const attr = captureAttribution();
  for (const key of ATTR_KEYS) {
    const el = form.elements.namedItem(key);
    if (el instanceof HTMLInputElement) el.value = attr[key] ?? '';
  }
  const refEl = form.elements.namedItem('referrer');
  if (refEl instanceof HTMLInputElement) refEl.value = attr.referrer ?? '';
  const ymEl = form.elements.namedItem('ym_client_id');
  if (ymEl instanceof HTMLInputElement) {
    // быстрый фолбэк из куки Метрики…
    const cookieId = readCookie('_ym_uid');
    if (cookieId) ymEl.value = cookieId;
    // …и уточнение через API Метрики (надёжнее), когда счётчик доступен
    getClientId((clientId) => {
      if (clientId) ymEl.value = String(clientId);
    });
  }
}

function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits && !digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length > 0) out += ' (' + rest.slice(0, 3);
  if (rest.length >= 3) out += ')';
  if (rest.length > 3) out += ' ' + rest.slice(3, 6);
  if (rest.length > 6) out += '-' + rest.slice(6, 8);
  if (rest.length > 8) out += '-' + rest.slice(8, 10);
  return out;
}

function setError(input: Element, on: boolean): void {
  const row = input.closest('.field-row, .consent');
  if (!row) return;
  row.classList.toggle('has-error', on);
  if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
}

export function initForm(root: ParentNode = document, id = 'lead-form'): void {
  const form = root.querySelector<HTMLFormElement>(`#${id}`);
  if (!form) return;

  // захват источника трафика и ClientID в скрытые поля (до отправки)
  fillAttribution(form);

  const nameEl = form.elements.namedItem('name') as HTMLInputElement;
  const phoneEl = form.elements.namedItem('phone') as HTMLInputElement;
  const ageEl = form.elements.namedItem('age') as HTMLInputElement | HTMLSelectElement;
  const consentEl = form.elements.namedItem('consent') as HTMLInputElement;
  const hpEl = form.elements.namedItem('website') as HTMLInputElement;

  // маска телефона
  phoneEl.addEventListener('input', () => {
    phoneEl.value = formatPhone(phoneEl.value);
  });
  phoneEl.addEventListener('focus', () => {
    if (!phoneEl.value) phoneEl.value = '+7 ';
  });
  // возраст: для текстового поля — только цифры; для select правка не нужна
  if (ageEl instanceof HTMLInputElement) {
    ageEl.addEventListener('input', () => {
      ageEl.value = ageEl.value.replace(/\D/g, '').slice(0, 2);
    });
  }

  // снимаем ошибку при правке/выборе
  nameEl.addEventListener('input', () => setError(nameEl, false));
  phoneEl.addEventListener('input', () => setError(phoneEl, false));
  ageEl.addEventListener(ageEl instanceof HTMLSelectElement ? 'change' : 'input', () =>
    setError(ageEl, false),
  );
  consentEl.addEventListener('change', () => setError(consentEl, false));

  function validate(): boolean {
    let ok = true;
    if (nameEl.value.trim().length < 2) {
      setError(nameEl, true);
      ok = false;
    }
    const phoneDigits = phoneEl.value.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      setError(phoneEl, true);
      ok = false;
    }
    let ageOk: boolean;
    if (ageEl instanceof HTMLSelectElement) {
      ageOk = ageEl.value !== ''; // выбран один из диапазонов
    } else {
      const age = Number(ageEl.value);
      ageOk = !!ageEl.value && !Number.isNaN(age) && age >= 3 && age <= 18;
    }
    if (!ageOk) {
      setError(ageEl, true);
      ok = false;
    }
    if (!consentEl.checked) {
      setError(consentEl, true);
      ok = false;
    }
    return ok;
  }

  function showSuccess(fireGoal = true): void {
    form!.classList.add('is-sent');
    if (fireGoal) reachGoal('lead_form'); // цель Метрики (96429194) — только для реальной заявки
    form!.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;

    // honeypot заполнен → бот: имитируем успех, ничего не отправляя и не засчитывая цель
    if (hpEl.value.trim() !== '') {
      showSuccess(false);
      return;
    }
    if (!validate()) {
      form.querySelector<HTMLElement>('.has-error .field, .has-error input')?.focus();
      return;
    }

    sending = true;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    // В DEV нет PHP-бэкенда — показываем экран «Спасибо» для предпросмотра UX.
    if (import.meta.env.DEV) {
      console.info('[dev] форма валидна, POST /send.php пропущен (нет PHP в dev).');
      showSuccess();
      return;
    }

    try {
      const res = await fetch('/send.php', { method: 'POST', body: new FormData(form) });
      if (!res.ok) throw new Error('bad status ' + res.status);
      showSuccess();
    } catch (err) {
      sending = false;
      if (submitBtn) submitBtn.disabled = false;
      let errBox = form.querySelector<HTMLElement>('.form-net-error');
      if (!errBox) {
        errBox = document.createElement('p');
        errBox.className = 'micro form-net-error';
        errBox.style.color = '#c0392b';
        errBox.style.marginTop = '12px';
        form.querySelector('.form-foot')?.after(errBox);
      }
      errBox.textContent = 'Не удалось отправить заявку. Позвоните нам: ' + SITE.phoneDisplay;
      console.error(err);
    }
  });
}
