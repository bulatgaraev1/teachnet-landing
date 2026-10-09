/** Иконки из макетов вариантов главной — те же SVG, что в макете. Рендерятся на сборке. */
const svg = (size: number, stroke: string, width: number, body: string, cls = ''): string =>
  `<svg${cls ? ` class="${cls}"` : ''} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** ✓ */
export const tick = (stroke: string, width = 2.4, cls = ''): string => svg(22, stroke, width, '<path d="M4.5 12.5l5 5 10-11"></path>', cls);
/** ✕ */
export const cross = (stroke: string, cls = ''): string => svg(22, stroke, 2.2, '<path d="M6 6l12 12M18 6L6 18"></path>', cls);
/** «люди» — карточка поверх фото на первом экране B */
export const people = (): string =>
  svg(22, '#316397', 2, '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7"></path><path d="M18.5 14.8c1.7.8 2.7 2.5 3 5.2"></path>');
