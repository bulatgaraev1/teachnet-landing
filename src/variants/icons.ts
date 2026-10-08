/**
 * Иконки вариантов главной, которых нет в общем наборе (src/lib/icons.ts).
 * Тот же стиль: Lucide line, viewBox 24, stroke 1.75, цвет currentColor. Рендерятся на сборке.
 */
const PATHS = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
} as const;

export function abIcon(name: keyof typeof PATHS, cls = ''): string {
  const c = `icon ${cls}`.trim();
  return `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}
