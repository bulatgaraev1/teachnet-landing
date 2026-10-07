/**
 * Окно записи /links на нативном <dialog>: открывается кнопкой [data-ln-open]
 * (цель links_signup_open уходит через data-goal), закрывается крестиком, Escape и кликом
 * по подложке; после закрытия фокус возвращается на кнопку.
 */
export function initModal(): void {
  const dlg = document.getElementById('ln-modal') as HTMLDialogElement | null;
  if (!dlg || typeof dlg.showModal !== 'function') return;

  let opener: HTMLElement | null = null;

  document.querySelectorAll<HTMLElement>('[data-ln-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      opener = btn;
      dlg.showModal();
      // фокус на первое поле, без экранной клавиатуры на телефоне: только с клавиатуры/мыши
      if (matchMedia('(pointer: fine)').matches) dlg.querySelector<HTMLElement>('input[name="name"]')?.focus();
      else dlg.querySelector<HTMLElement>('.el-modal__box')?.focus();
    });
  });

  dlg.addEventListener('click', (e) => {
    const t = e.target as Element;
    // клик по подложке приходит в сам <dialog> (содержимое занимает его целиком)
    if (t === dlg || t.closest('[data-modal-close]')) dlg.close();
  });

  dlg.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });
}
