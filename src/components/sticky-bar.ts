/**
 * Sticky CTA-бар (§9, §14). Снизу, glass. Виден только в средней части страницы.
 * Слева текст (скрыт на мобильном), справа компактный CTA «Записаться».
 * Скрыт на первых двух блоках (#hero, .trust), на форме (#conversion), на финальном
 * CTA (#final) и в подвале (.site-footer) — через IntersectionObserver, чтобы не
 * дублировать кнопку и не показывать бар слишком рано/поздно.
 */
import { cta } from './button';

/** href — куда ведёт кнопка (по умолчанию форма #lead; на /education2 — #msignup) */
export function stickyBar({ href = '#lead' }: { href?: string } = {}): string {
  return `<div class="sticky-cta" id="sticky-cta" aria-hidden="true">
    <span class="sticky-cta__text">Первый урок — бесплатный</span>
    ${cta({ label: 'Записаться', href, compact: true, goal: 'sticky_cta' })}
  </div>`;
}

export function initStickyBar(root: ParentNode = document): void {
  const bar = root.querySelector<HTMLElement>('#sticky-cta');
  if (!bar) return;
  // Бар виден только в средней части страницы. Скрыт там, где есть своя кнопка
  // или показывать его рано/поздно: первые два блока (#hero и лента доверия .trust),
  // блок формы (#conversion, на /education2 — #msignup), финальный CTA (#final) и подвал (.site-footer).
  const hideSections = ['#hero', '.trust', '#conversion', '#msignup', '#final', '.site-footer']
    .map((s) => document.querySelector(s))
    .filter((el): el is Element => el !== null);

  const visibleHideSections = new Set<Element>();

  const update = (): void => {
    const show = visibleHideSections.size === 0;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visibleHideSections.add(e.target);
          else visibleHideSections.delete(e.target);
        });
        update();
      },
      { rootMargin: '0px 0px -25% 0px' },
    );
    hideSections.forEach((el) => io.observe(el));
  } else {
    // запасной вариант без IntersectionObserver — показываем после первого экрана
    const onScroll = (): void => {
      bar.classList.toggle('is-visible', window.scrollY > window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}
