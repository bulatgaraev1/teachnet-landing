/**
 * FAQ-аккордеон (§7): белые строки, разделитель 1px, плюс/минус справа,
 * открытие плавное 200ms. Плюс/минус — CSS-псевдоэлементы (.acc-icon).
 */
export interface AccItem {
  q: string;
  /** HTML ответа (может содержать <!-- TODO --> для плейсхолдеров) */
  a: string;
}

export function accordion(items: AccItem[]): string {
  return `<div class="acc">${items
    .map((it, i) => {
      const pid = `faq-panel-${i}`;
      return `<div class="acc-item">
  <button class="acc-trigger" type="button" aria-expanded="false" aria-controls="${pid}">
    <span>${it.q}</span>
    <span class="acc-icon" aria-hidden="true"></span>
  </button>
  <div class="acc-panel" id="${pid}" role="region">
    <div class="acc-panel__inner">${it.a}</div>
  </div>
</div>`;
    })
    .join('')}</div>`;
}

export function initAccordion(root: ParentNode = document): void {
  const triggers = root.querySelectorAll<HTMLButtonElement>('.acc-trigger');
  triggers.forEach((trigger) => {
    const panel = trigger.nextElementSibling as HTMLElement | null;
    if (!panel) return;

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        panel.style.height = panel.scrollHeight + 'px'; // фиксируем для анимации
        requestAnimationFrame(() => {
          panel.style.height = '0px';
        });
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded', 'true');
        panel.addEventListener(
          'transitionend',
          () => {
            if (trigger.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
          },
          { once: true },
        );
      }
    });
  });
}
