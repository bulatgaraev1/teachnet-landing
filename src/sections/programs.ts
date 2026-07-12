/** Блок 4. Программы — ступени пути (§4, §6, §7). Тексты — дословно. */
import { cta } from '../components/button';

const STEPS = [
  {
    n: '1',
    tag: 'СТУПЕНЬ 1 · от 5 лет',
    title: 'LEGO WeDo 2.0',
    text: 'Первый собственный робот. Основы механики, электроники и программирования.',
    meta: '60 минут · группа до 6 человек',
  },
  {
    n: '2',
    tag: 'СТУПЕНЬ 2 · от 9 лет',
    title: 'Spike Prime',
    text: 'Датчики и сложные механизмы — робот начинает видеть и реагировать на мир.',
    meta: '90 минут · группа до 6 человек',
  },
  {
    n: '3',
    tag: 'СТУПЕНЬ 3 · от 12 лет',
    title: 'Arduino',
    text: 'Настоящая электроника и реальные компоненты: платы, микроконтроллеры, датчики. Ребёнок разрабатывает свои схемы и пишет для них программы.',
    meta: '90 минут · группа до 6 человек',
  },
  {
    n: '4',
    tag: 'СТУПЕНЬ 4 · от 14 лет',
    title: 'Рука-манипулятор',
    text: 'Язык C, электроника, схемы. Ребёнок собирает руку-манипулятор с нуля — проект уровня вуза.',
    meta: '90 минут · группа до 6 человек',
  },
];

export function programs(): string {
  const steps = STEPS.map(
    (s) => `<li class="route__step" data-reveal>
      <span class="step-node">${s.n}</span>
      <article class="card card--program card-hover route__card">
        <span class="chip" style="margin-bottom:14px">${s.tag}</span>
        <h3 class="h3">${s.title}</h3>
        <p class="muted" style="margin:10px 0 16px">${s.text}</p>
        <p class="micro">${s.meta}</p>
      </article>
    </li>`,
  ).join('');

  return `<section class="section" id="programs" aria-labelledby="pr-h" data-scroll-goal="scroll_programs">
    <div class="container">
      <div class="section-head" data-reveal>
        <h2 class="h2" id="pr-h">Путь, который пройдёт ваш ребёнок</h2>
        <p class="lead">Не отдельные курсы — одна траектория из четырёх ступеней.</p>
      </div>
      <ol class="route">${steps}</ol>
      <p class="muted" style="text-align:center;margin-top:36px" data-reveal>С какой ступени начать — определим на пробном уроке.</p>
      <div style="text-align:center;margin-top:20px" data-reveal>${cta({ label: 'Записаться', goal: 'block4_signup' })}</div>
    </div>
  </section>`;
}
