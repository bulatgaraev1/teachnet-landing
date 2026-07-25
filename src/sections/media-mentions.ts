/**
 * Секция «О нас пишут» — публикации о TEACHNET в сторонних изданиях.
 * По структуре/типографике повторяет блок «Нас поддерживают» (sections/trust.ts):
 * тот же .container, тот же центрированный приглушённый заголовок, тот же ритм.
 * Данные — в массиве ниже: добавление публикации не требует правки разметки.
 */
import { icon } from '../lib/icons';

const MENTIONS = [
  {
    source: 'Минмолодёжи РТ',
    text: 'В Татарстане проходят инженерные мастер-классы для школьников в рамках проекта TEACHNET',
    date: '14 июля 2026',
    url: 'https://minmol.tatarstan.ru/index.htm/news/2539647.htm',
  },
  {
    source: 'КНИТУ-КАИ',
    text: 'TEACHNET, ПИШ КАИ и кафедра КиТПЭС научили участников форума «Һөнәрләр Биләр Форум 2026» создавать цифровые значки',
    date: '24 июля 2026',
    url: 'https://kai.ru/news/new?id=14465643',
  },
];

export function mediaMentions(): string {
  const cards = MENTIONS.map(
    (m) => `<a class="card card-hover media-card" href="${m.url}" target="_blank" rel="noopener noreferrer">
      <span class="media-card__source">${m.source}</span>
      <span class="media-card__text">${m.text}</span>
      <span class="media-card__date">${m.date}</span>
      <span class="media-card__link"><span>Читать</span>${icon('external-link')}</span>
    </a>`,
  ).join('');

  return `<section class="section media-mentions" aria-labelledby="mm-h" style="padding-block:48px">
    <div class="container">
      <h2 class="h3 section-head section-head--center muted" id="mm-h" style="margin-bottom:28px;font-weight:600">О нас пишут</h2>
      <div class="media-grid" data-reveal>${cards}</div>
    </div>
  </section>`;
}
