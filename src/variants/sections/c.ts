/** Блоки варианта C (/education2 «Манифест») — по макету education2-mockup.html. */
import { tick } from './svg';
import { formCard } from './form-card';

export function heroC(): string {
  return `<section class="ab-mhero" id="hero" aria-labelledby="m-h1" data-scroll-goal="scroll_hero">
    <div class="ab-wrap ab-mhero__inner">
      <span class="ab-mchip">Манифест TEACHNET</span>
      <h1 class="ab-mhero__title" id="m-h1">Мы устали от школ, которые развлекают детей, а не учат.</h1>
      <p class="ab-mhero__accent">Поэтому создали TEACHNET.</p>
      <p class="ab-mhero__sub">Школа инженерии для детей 5–15 лет в Казани. Преподаватель не уходит в телефон, а весь урок ведёт детей и объясняет, как и почему всё работает.</p>
      <div class="ab-mhero__cta">
        <a class="ab-btn ab-btn--glow" href="#lead" data-goal="hero_cta">Проверить на бесплатном уроке</a>
        <span class="ab-mhero__micro">60 минут · можно посмотреть, как идёт урок · бесплатно</span>
      </div>
    </div>
  </section>`;
}

export function photosC(): string {
  return `<section class="ab-mphotos" aria-label="Фото с занятий">
    <div class="ab-wrap ab-mphotos__grid">
      <img src="/images/hero.webp" width="1608" height="908" loading="lazy" decoding="async" alt="Дети собирают робота вместе с преподавателем" />
      <img src="/images/team-1.webp" width="800" height="1000" loading="lazy" decoding="async" alt="Преподаватель объясняет устройство механизма" />
      <img src="/images/mission.webp" width="900" height="700" loading="lazy" decoding="async" alt="Испытание робота на миссии" />
    </div>
  </section>`;
}

const SEEN = [
  '«Вот инструкция, собирайте» — и преподаватель в телефоне.',
  'Час сборки по картинкам. Ноль понимания, как это работает.',
  '9–15 детей на педагога. Застрял — сиди и жди.',
  'Год занятий — а ребёнок не знает, зачем роботу датчик.',
  'Родителям — красивые фото в чате. Знаний за ними нет.',
];

export function seenC(): string {
  const items = SEEN.map((t, i) => `<li><span class="ab-seen__n">0${i + 1}</span><span class="ab-seen__t">${t}</span></li>`).join('\n        ');
  return `<section class="ab-msec" id="seen" aria-labelledby="seen-h2" data-scroll-goal="scroll_c_seen">
    <div class="ab-wrap ab-wrap--1100 ab-stack-36">
      <div class="ab-head ab-head--14">
        <span class="ab-meyebrow">Что мы видели</span>
        <h2 class="ab-mh2" id="seen-h2">Вот за что родители платят во многих кружках робототехники</h2>
      </div>
      <ol class="ab-seen">
        ${items}
      </ol>
      <div class="ab-plate"><p>Это не образование. Это платная продлёнка с конструктором.</p></div>
    </div>
  </section>`;
}

const RULES = [
  ['Никаких телефонов у преподавателя', 'Весь урок с детьми: сюжет, вопросы, испытания вместе с группой.'],
  ['Объясняем, почему работает', 'Не только как собрать, но и почему механизм устроен именно так.'],
  ['Не делаем за ребёнка', 'Застрял — наводящий вопрос. Решение ребёнок находит сам.'],
  ['Не больше 6 детей в группе', 'Внимание каждому, а не только самым активным.'],
  ['Родитель видит всё', 'Видео с каждого занятия, памятки и открытые защиты проектов.'],
  ['Прогресс — за навыки', 'Ранги и печати в паспорте — за умения, а не за посещаемость.'],
];

export function rulesC(): string {
  const cards = RULES.map(
    ([t, x], i) => `<div class="ab-rule">
          <span class="ab-rule__n">Правило ${i + 1}</span>
          <span class="ab-rule__title">${t}</span>
          <span class="ab-rule__text">${x}</span>
        </div>`,
  ).join('\n        ');
  return `<section class="ab-msec ab-msec--light" id="rules" aria-labelledby="rules-h2" data-scroll-goal="scroll_c_rules">
    <div class="ab-wrap ab-stack-36">
      <div class="ab-head ab-head--14 ab-head--820">
        <span class="ab-meyebrow">Наши правила</span>
        <h2 class="ab-mh2" id="rules-h2">Шесть правил, которые мы не нарушаем</h2>
        <p class="ab-p">Миссии и награды у нас тоже есть. Но интерес — инструмент, чтобы ребёнок захотел разобраться, а не способ занять его на час.</p>
      </div>
      <div class="ab-rules">
        ${cards}
      </div>
    </div>
  </section>`;
}

export function whoC(): string {
  const chips = ['Резидент IT-парка', 'Свои учебные разработки на отечественных компонентах', 'Поддержка Фонда содействия инновациям']
    .map((c) => `<span class="ab-mchip ab-mchip--plain">${c}</span>`)
    .join('\n          ');
  return `<section class="ab-msec" id="who" aria-labelledby="who-h2" data-scroll-goal="scroll_c_who">
    <div class="ab-wrap ab-grid ab-grid--420 ab-gap-who ab-center">
      <div class="ab-stack-18">
        <span class="ab-meyebrow">Кто мы</span>
        <h2 class="ab-mh2" id="who-h2">Школа инженеров, а не аниматоров</h2>
        <p class="ab-mp">Программы и учебное оборудование разрабатываем сами. Основатель — инженер-конструктор, выпускник КНИТУ-КАИ с красным дипломом.</p>
        <div class="ab-chips">
          ${chips}
        </div>
      </div>
      <img class="ab-who__photo" src="/images/team-2.webp" width="800" height="1000" loading="lazy" decoding="async" alt="Основатель TEACHNET на занятии с детьми" />
    </div>
  </section>`;
}

export function dareC(): string {
  return `<section class="ab-msec ab-msec--flush" id="dare" aria-labelledby="dare-h2" data-scroll-goal="scroll_c_dare">
    <div class="ab-wrap ab-dare">
      <span class="ab-dare__eyebrow">Проверьте нас</span>
      <h2 class="ab-dare__h2" id="dare-h2">Приходите на пробный урок и смотрите за каждой минутой</h2>
      <p class="ab-dare__p">Наблюдайте через дверь класса, как идёт занятие. Увидите, что детей оставили с инструкцией, — можете не возвращаться. Это бесплатно.</p>
      <a class="ab-btn ab-btn--white" href="#lead" data-goal="c_dare_signup">Записаться и проверить</a>
    </div>
  </section>`;
}

const PRICE = ['4 занятия в месяц в группе до 6 человек', 'Конструкторы и оборудование — наши', 'Паспорт инженера и материалы для родителей', 'Видео с каждого занятия в родительский чат'];

export function priceC(): string {
  const items = PRICE.map((t) => `<li>${tick('#316397')}<span>${t}</span></li>`).join('\n          ');
  return `<section class="ab-msec ab-msec--light ab-price" id="price" aria-labelledby="mprice-h2" data-scroll-goal="scroll_price">
    <div class="ab-wrap ab-grid ab-grid--420 ab-gap-price">
      <div class="ab-stack-22">
        <span class="ab-meyebrow">Стоимость</span>
        <h2 class="ab-price__h2" id="mprice-h2">7 000 ₽ в месяц. Всё включено.</h2>
        <ul class="ab-price__list">
          ${items}
        </ul>
        <p class="ab-price__free">Первый урок бесплатный. Решайте после него.</p>
      </div>
      ${formCard({ title: 'Запишитесь и посмотрите, как мы учим', source: 'education2' })}
    </div>
  </section>`;
}

export function finalC(): string {
  return `<section class="ab-msec" id="final" aria-labelledby="mfinal-h2" data-scroll-goal="scroll_final">
    <div class="ab-wrap ab-wrap--1100 ab-mfinal">
      <h2 class="ab-mfinal__h2" id="mfinal-h2">Хватит платить за то, чтобы ребёнка просто заняли.</h2>
      <p class="ab-mfinal__p">Один бесплатный урок покажет разницу.</p>
      <a class="ab-btn" href="#lead" data-goal="block12_cta">Бесплатный пробный урок</a>
    </div>
  </section>`;
}
