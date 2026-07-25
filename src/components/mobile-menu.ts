/**
 * Мобильное боковое меню (drawer). Десктоп использует обычную навигацию в шапке;
 * на мобильном — бургер открывает выезжающую панель.
 *
 * Соответствие Web Interface Guidelines:
 *  - <button> для действия, <a> для навигации; иконки aria-hidden, у кнопок aria-label
 *  - role="dialog" aria-modal, ловушка фокуса, возврат фокуса на бургер, Escape
 *  - overscroll-behavior: contain, блокировка прокрутки фона
 *  - анимация только transform/opacity; уважает prefers-reduced-motion (см. base.css)
 */
import { cta } from './button';
import { icon } from '../lib/icons';
import { SITE } from '../lib/site';

export function mobileMenu(): string {
  const links = SITE.nav
    .map((n) => {
      // «О нас пишут» из бургера шлёт ту же цель nav_press, что и из хедера
      const g = n.href === '#press' ? ' data-goal="nav_press"' : '';
      return `<a class="mobile-nav__link" href="${n.href}"${g}>${n.label}</a>`;
    })
    .join('');

  return `<div class="mobile-nav" id="mobile-nav">
    <div class="mobile-nav__backdrop" data-mm-close></div>
    <aside class="mobile-nav__panel" role="dialog" aria-modal="true" aria-label="Меню" id="mobile-nav-panel">
      <div class="mobile-nav__head">
        <img class="mobile-nav__logo" src="/images/logo-dark.svg" width="121" height="38" alt="${SITE.brand}" />
        <button class="mobile-nav__close" type="button" aria-label="Закрыть меню" data-mm-close>${icon('x')}</button>
      </div>
      <nav class="mobile-nav__links" aria-label="Разделы сайта">${links}</nav>
      <div class="mobile-nav__foot">
        <a class="mobile-nav__phone" href="${SITE.phoneHref}">${SITE.phoneDisplay}</a>
        ${cta({ label: 'Бесплатный пробный урок', block: true, goal: 'burger_cta' })}
      </div>
    </aside>
  </div>`;
}

export function initMobileMenu(): void {
  const overlay = document.querySelector<HTMLElement>('#mobile-nav');
  const panel = document.querySelector<HTMLElement>('#mobile-nav-panel');
  const openBtn = document.querySelector<HTMLButtonElement>('[data-mm-open]');
  if (!overlay || !panel || !openBtn) return;

  const isOpen = (): boolean => overlay.classList.contains('is-open');

  const focusable = (): HTMLElement[] =>
    Array.from(
      panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ).filter((el) => el.offsetParent !== null);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  function open(): void {
    if (isOpen()) return;
    overlay!.classList.add('is-open');
    document.documentElement.classList.add('mm-lock');
    openBtn!.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    // фокус на кнопку закрытия после открытия
    requestAnimationFrame(() => panel!.querySelector<HTMLElement>('.mobile-nav__close')?.focus());
  }

  function close(): void {
    if (!isOpen()) return;
    overlay!.classList.remove('is-open');
    document.documentElement.classList.remove('mm-lock');
    openBtn!.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    openBtn!.focus(); // возврат фокуса на открывавший элемент
  }

  openBtn.addEventListener('click', open);
  // закрытие: бэкдроп, кнопка-крестик, а также любой переход по ссылке (навигация по якорю)
  overlay.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-mm-close]') || t.closest('a[href]')) close();
  });
}
