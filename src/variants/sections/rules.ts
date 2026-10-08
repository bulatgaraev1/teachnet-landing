/** Вариант C (/education2). «Шесть правил, которые мы не нарушаем» — светлый блок для контраста. */

const RULES = [
  { title: 'Никаких телефонов у преподавателя', text: 'Весь урок с детьми: сюжет, вопросы, испытания вместе с группой.' },
  { title: 'Объясняем, почему работает', text: 'Не только как собрать, но и почему механизм устроен именно так.' },
  { title: 'Не делаем за ребёнка', text: 'Застрял — наводящий вопрос. Решение ребёнок находит сам.' },
  { title: 'Не больше 6 детей в группе', text: 'Внимание каждому, а не только самым активным.' },
  { title: 'Родитель видит всё', text: 'Видео с каждого занятия, памятки и открытые защиты проектов.' },
  { title: 'Прогресс — за навыки', text: 'Ранги и печати в паспорте — за умения, а не за посещаемость.' },
];

export function rules(): string {
  const cards = RULES.map(
    (r, i) => `<article class="ab-rule" data-reveal>
          <p class="label-tag ab-eyebrow">Правило ${i + 1}</p>
          <h3 class="h3">${r.title}</h3>
          <p class="muted">${r.text}</p>
        </article>`,
  ).join('');
  return `<section class="section ab-light" id="rules" aria-labelledby="rules-h" data-scroll-goal="scroll_c_rules">
    <div class="container">
      <div class="section-head" data-reveal>
        <p class="label-tag ab-eyebrow">Наши правила</p>
        <h2 class="h2" id="rules-h">Шесть правил, которые мы не нарушаем</h2>
        <p class="lead">Миссии и награды у нас тоже есть. Но интерес — инструмент, чтобы ребёнок захотел разобраться, а не способ занять его на час.</p>
      </div>
      <div class="grid-3">${cards}</div>
    </div>
  </section>`;
}
