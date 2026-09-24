/**
 * Окно записи на нативном <dialog>. Открывается любой из четырёх кнопок
 * [data-open-modal]; фокус внутри, закрытие по Escape, клику вне окна и крестику,
 * после закрытия фокус возвращается на кнопку, которая его открыла.
 */
import { track } from './analytics';

export function initModal(): void {
  const dlg = document.getElementById('el-modal') as HTMLDialogElement | null;
  if (!dlg || typeof dlg.showModal !== 'function') return;

  let opener: HTMLElement | null = null;
  let fromBlock = '';
  let chosen = false;

  document.querySelectorAll<HTMLElement>('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      fromBlock = btn.dataset.openModal || '';
      track(`cta_${fromBlock}`, { block: fromBlock });
      opener = btn;
      chosen = false;
      dlg.showModal();
      dlg.querySelector<HTMLElement>('.el-msg')?.focus();
    });
  });

  dlg.addEventListener('click', (e) => {
    const t = e.target as Element;
    // клик по подложке приходит в сам <dialog> (содержимое занимает его целиком)
    if (t === dlg || t.closest('[data-modal-close]')) {
      dlg.close();
      return;
    }
    const opt = t.closest<HTMLAnchorElement>('a.el-msg');
    if (!opt) return;
    chosen = true;
    // цель по мессенджеру; для телефона phone_click (place: modal) шлёт analytics.ts
    if (opt.dataset.msg) track(`msg_${opt.dataset.msg}`, { from_block: fromBlock });
    window.setTimeout(() => dlg.close(), 0);
  });

  dlg.addEventListener('close', () => {
    if (!chosen) track('modal_close_empty', { from_block: fromBlock });
    opener?.focus();
    opener = null;
  });
}
