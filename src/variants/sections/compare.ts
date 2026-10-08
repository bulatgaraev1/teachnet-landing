/** Вариант B (/education). «Знакомая картина?» — сравнение пар «во многих кружках» / «в TEACHNET».
 *  Разметка — таблица с ролями (читается скринридером), на мобиле пары идут друг под другом. */
import { icon } from '../../lib/icons';

const ROWS: [string, string][] = [
  ['Раздал инструкции и весь урок в телефоне', 'Ведёт урок от первой до последней минуты: сюжет, вопросы, вызовы'],
  ['Час сборки по картинкам без понимания, как это работает', 'Объясняем, как и почему всё работает'],
  ['Застрял — ждёт или бросает', 'Застрял — наводящий вопрос, а не готовое решение'],
  ['<span class="ab-nowrap">9–15 детей</span> на педагога, до каждого руки не доходят', 'До 6 детей в группе — внимание каждому'],
  ['«Что делали?» — «Ну, собирали что-то»', 'Видео с занятия в тот же день и памятка для разговора дома'],
  ['Год занятий — а что умеет, непонятно', 'Паспорт инженера, ранги за навыки, защиты проектов'],
];

export function compare(): string {
  const rows = ROWS.map(
    ([bad, good]) => `<div class="ab-cmp__row" role="row">
          <div class="ab-cmp__cell ab-cmp__cell--bad" role="cell">${icon('x', 'ab-cmp__ic')}<span>${bad}</span></div>
          <div class="ab-cmp__cell ab-cmp__cell--good" role="cell">${icon('check', 'ab-cmp__ic')}<span>${good}</span></div>
        </div>`,
  ).join('');

  return `<section class="section ab-sec--white" id="compare" aria-labelledby="cmp-h" data-scroll-goal="scroll_b_compare">
    <div class="container ab-narrow">
      <div class="section-head" data-reveal>
        <p class="label-tag ab-eyebrow">Знакомая картина?</p>
        <h2 class="h2" id="cmp-h">Во многих кружках ребёнка не учат, а просто занимают на час</h2>
        <p class="lead">Родители рассказывают одно и то же: раздал инструкции, уткнулся в телефон, а в конце — «заканчиваем, звоните родителям». Это не обучение, а присмотр за ваши деньги. У нас так не работают.</p>
      </div>
      <div class="ab-cmp" role="table" aria-label="Сравнение: многие кружки и TEACHNET" data-reveal>
        <div class="ab-cmp__row ab-cmp__head" role="row">
          <div class="ab-cmp__th ab-cmp__th--bad" role="columnheader">${icon('x', 'ab-cmp__thic')}Во многих кружках</div>
          <div class="ab-cmp__th ab-cmp__th--good" role="columnheader">${icon('check', 'ab-cmp__thic')}В TEACHNET</div>
        </div>
        ${rows}
      </div>
      <p class="ab-outro" data-reveal>Вы платите не за то, чтобы ребёнка заняли на час, а за понимание, как устроена техника.</p>
    </div>
  </section>`;
}
