/**
 * Форма «Заказать платы» на /tech. Отправка — через общий механизм заявок сайта
 * (POST /send.php, source=tech: Telegram + база + почта), как у остальных форм.
 * Ошибки — над кнопкой, по одной: имя → контакт → согласие.
 * После отправки вместо формы — «Заявка отправлена» и кнопка «Отправить ещё одну».
 */
import { TECH } from '../content/tech';
import { SITE } from '../lib/site';
import { reachGoal } from '../lib/metrika';
import { fillAttribution } from '../components/form';

export function initTechForm(): void {
  const form = document.getElementById('tc-form') as HTMLFormElement | null;
  const done = document.querySelector<HTMLElement>('[data-done]');
  if (!form || !done) return;
  const doneText = done.querySelector<HTMLElement>('[data-done-text]')!;
  const again = done.querySelector<HTMLButtonElement>('[data-again]')!;
  const errBox = form.querySelector<HTMLElement>('[data-form-error]')!;
  const orgField = form.querySelector<HTMLElement>('[data-org]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const field = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
  const name = field('name');
  const contact = field('contact');
  const org = field('org');
  const qty = field('qty');
  const consent = field('consent');
  const hp = field('website');
  const t = TECH.order.form;

  fillAttribution(form);

  // «Сколько плат»: пока человек сам не менял число, оно следует за выбором «Кто вы»
  let qtyTouched = false;
  qty.addEventListener('input', () => { qtyTouched = true; });

  const role = (): string => (form.elements.namedItem('role') as RadioNodeList).value;
  function onRole(): void {
    const self = role() === 'self';
    orgField.hidden = self;
    org.disabled = self; // скрытое поле не отправляется
    if (!qtyTouched) qty.value = self ? '1' : '10';
  }
  form.querySelectorAll<HTMLInputElement>('input[name="role"]').forEach((r) => r.addEventListener('change', onRole));

  function clearError(): void {
    errBox.hidden = true;
    errBox.textContent = '';
    [name, contact, consent].forEach((i) => i.removeAttribute('aria-invalid'));
  }
  function showError(text: string, input: HTMLInputElement): void {
    errBox.textContent = text;
    errBox.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }
  [name, contact].forEach((i) => i.addEventListener('input', clearError));
  consent.addEventListener('change', clearError);

  function validate(): boolean {
    clearError();
    if (!name.value.trim()) { showError(t.errors.name, name); return false; }
    if (!contact.value.trim()) { showError(t.errors.contact, contact); return false; }
    if (!consent.checked) { showError(t.errors.consent, consent); return false; }
    const n = Number.parseInt(qty.value, 10);
    if (!(n >= 1)) qty.value = '1'; // число плат — от 1
    return true;
  }

  function showDone(who: string): void {
    doneText.textContent = (doneText.dataset.template || '').replace('{name}', who);
    form!.hidden = true;
    done!.hidden = false;
    done!.focus();
  }

  again.addEventListener('click', () => {
    form.reset(); // «Школа», 10 плат, пустые поля
    qtyTouched = false;
    onRole();
    clearError();
    fillAttribution(form);
    submit.disabled = false;
    done.hidden = true;
    form.hidden = false;
    name.focus();
  });

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    // honeypot заполнен — бот: имитируем успех, ничего не отправляя
    if (hp.value.trim() !== '') { showDone(name.value.trim()); return; }
    if (!validate()) return;

    sending = true;
    submit.disabled = true;
    const who = name.value.trim();
    // в DEV нет PHP — показываем экран «Заявка отправлена» для предпросмотра
    if (import.meta.env.DEV) {
      sending = false;
      showDone(who);
      return;
    }
    try {
      const res = await fetch('/send.php', { method: 'POST', body: new FormData(form) });
      if (!res.ok) throw new Error('bad status ' + res.status);
      reachGoal('tech_lead', { role: role() });
      showDone(who);
    } catch (err) {
      errBox.textContent = `${t.netError} ${SITE.phoneDisplay}`;
      errBox.hidden = false;
      submit.disabled = false;
      console.error(err);
    } finally {
      sending = false;
    }
  });
}
