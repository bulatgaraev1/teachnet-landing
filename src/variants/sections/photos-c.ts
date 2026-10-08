/** Вариант C (/education2). Лента из трёх фото с занятий: в ряд, на мобиле столбиком. */

const PHOTOS = [
  { file: 'hero', w: 1280, h: 760, alt: 'Дети собирают робота из конструктора на занятии' },
  { file: 'team-1', w: 800, h: 1000, alt: 'Преподаватель и ребёнок на занятии' },
  { file: 'mission', w: 900, h: 700, alt: 'Преподаватель помогает ребёнку на занятии' },
];

export function photosC(): string {
  const imgs = PHOTOS.map(
    (p) => `<img class="ph" src="/images/${p.file}.svg" width="${p.w}" height="${p.h}" loading="lazy" decoding="async" alt="${p.alt}" />`,
  ).join('');
  return `<section class="ab-photos" aria-label="Фото с занятий">
    <div class="container ab-photos__grid" data-reveal>${imgs}</div>
  </section>`;
}
