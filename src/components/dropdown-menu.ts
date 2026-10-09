/**
 * Выпадающее меню под шапкой (/education2, вариант C — по макету): кнопка-бургер [data-dd-toggle]
 * открывает панель из aria-controls. Не модальное: фон не блокируется, фокус остаётся на кнопке,
 * Tab ведёт в панель. Закрывается по пункту меню, клику вне меню, Esc и повторному нажатию кнопки;
 * состояние — в aria-expanded. На страницах без такой кнопки ничего не делает.
 */
export function initDropdownMenu(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-dd-toggle]');
  const panel = btn ? document.getElementById(btn.getAttribute('aria-controls') || '') : null;
  if (!btn || !panel) return;

  const isOpen = (): boolean => !panel.hidden;
  const set = (open: boolean): void => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  btn.addEventListener('click', () => set(!isOpen()));
  // пункт меню, телефон или кнопка записи — закрываем (переход по якорю делает lib/nav.ts)
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a[href]')) set(false);
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (isOpen() && !btn.contains(t) && !panel.contains(t)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    set(false);
    btn.focus(); // фокус возвращается на кнопку меню
  });
}
