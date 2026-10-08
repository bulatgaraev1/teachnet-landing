/** Вариант B (/education). «Каждое занятие — миссия»: заменяет блок миссии и блок команды главной. */

const STEPS = [
  { n: '01', title: 'Завязка', text: 'Рассказывает сюжет: из штаба пришло срочное сообщение, нужен новый робот.' },
  { n: '02', title: 'Вызов', text: 'Ставит задачу и спрашивает: «Как сделаем?» Ребёнок сначала думает, потом собирает.' },
  { n: '03', title: 'Сборка и код', text: 'Ходит между столами, задаёт вопросы, объясняет, почему механизм работает так. Не делает за ребёнка.' },
  { n: '04', title: 'Испытание', text: 'Испытывает роботов с группой, разбирают ошибки. Миссия выполнена — печать в паспорт.' },
  { n: '05', title: 'Интрига', text: 'В финале новая угроза. Ребёнок уходит с вопросом «а что дальше?».' },
];

export function lesson(): string {
  const steps = STEPS.map(
    (s) => `<li class="ab-step" data-reveal>
          <span class="ab-step__n">${s.n}</span>
          <h3 class="h3">${s.title}</h3>
          <p class="muted">${s.text}</p>
        </li>`,
  ).join('');

  return `<section class="section" id="lesson" aria-labelledby="lesson-h" data-scroll-goal="scroll_b_lesson">
    <div class="container">
      <div class="ab-split">
        <div class="section-head ab-split__copy" data-reveal>
          <p class="label-tag ab-eyebrow">Наше обучение устроено так</p>
          <h2 class="h2" id="lesson-h">Каждое занятие — миссия, и ведёт её преподаватель</h2>
          <p class="lead">Сюжет тянется через весь курс, как сериал. И держит его не инструкция, а преподаватель рядом с детьми.</p>
        </div>
        <img class="ph ab-split__photo" src="/images/mission.svg" width="900" height="700" loading="lazy" decoding="async" alt="Преподаватель помогает ребёнку на занятии" data-reveal />
      </div>
      <ol class="ab-steps">${steps}</ol>
      <div class="ab-quote" data-reveal>
        <p class="ab-quote__text">Учим говорить как инженер: не «у меня не получается», а «у меня шестерёнка не вращается».</p>
        <p class="ab-quote__note">Так ребёнок учится искать причину, а не ждать помощи</p>
      </div>
    </div>
  </section>`;
}
