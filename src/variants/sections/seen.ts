/** Вариант C (/education2). «Что мы видели»: нумерованный список и белая плашка-вывод. */

const ITEMS = [
  '«Вот инструкция, собирайте» — и преподаватель в телефоне.',
  'Час сборки по картинкам. Ноль понимания, как это работает.',
  '<span class="ab-nowrap">9–15 детей</span> на педагога. Застрял — сиди и жди.',
  'Год занятий — а ребёнок не знает, зачем роботу датчик.',
  'Родителям — красивые фото в чате. Знаний за ними нет.',
];

export function seen(): string {
  const items = ITEMS.map(
    (t, i) => `<li class="ab-seen__item"><span class="ab-seen__n">${String(i + 1).padStart(2, '0')}</span><span class="ab-seen__text">${t}</span></li>`,
  ).join('');
  return `<section class="section" id="seen" aria-labelledby="seen-h" data-scroll-goal="scroll_c_seen">
    <div class="container ab-narrow">
      <div class="section-head" data-reveal>
        <p class="label-tag ab-eyebrow">Что мы видели</p>
        <h2 class="h2" id="seen-h">Вот за что родители платят во многих кружках робототехники</h2>
      </div>
      <ol class="ab-seen" data-reveal>${items}</ol>
      <p class="ab-plate" data-reveal>Это не образование. Это платная продлёнка с конструктором.</p>
    </div>
  </section>`;
}
