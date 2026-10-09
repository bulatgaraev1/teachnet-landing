/** Блоки варианта B (/education «Сравнение») — по макету docs/mockups/education-mockup.html. */
import { tick, cross, people } from './svg';
import { formCard } from './form-card';
import { LOGOS, logoSrc } from './logos';
import { STEPS_TEXT, stepCards, galleryItems } from './shared';

const PILLS = ['Казань', 'Дети 5–15 лет', 'Группы до 6 человек'];

export function heroB(): string {
  return `<section class="ab-hero" id="hero" aria-labelledby="hero-h1" data-scroll-goal="scroll_hero">
    <div class="ab-wrap ab-hero__grid">
      <div class="ab-hero__copy">
        <div class="ab-pills">${PILLS.map((t) => `<span class="ab-pill ab-pill--hero">${t}</span>`).join('')}</div>
        <h1 class="ab-hero__title" id="hero-h1">Школа инженерии, где учат, а не развлекают</h1>
        <p class="ab-hero__sub">Наш преподаватель не раздаёт инструкции и не уходит в свой телефон. Он весь урок с детьми и объясняет, как и почему всё работает.</p>
        <div class="ab-hero__cta">
          <a class="ab-btn" href="#lead" data-goal="hero_cta">Бесплатный пробный урок</a>
          <p class="ab-hero__micro">60 минут · можно посмотреть, как идёт урок · ни к чему не обязывает</p>
        </div>
      </div>
      <div class="ab-hero__media">
        <img class="ab-hero__photo" src="/images/hero.webp" width="1608" height="908" alt="Дети собирают робота на занятии вместе с преподавателем" fetchpriority="high" decoding="async" />
        <div class="ab-hero__note"><span class="ab-hero__note-icon">${people()}</span><span><b>Преподаватель рядом весь урок.</b> До 6 детей в группе.</span></div>
      </div>
    </div>
  </section>`;
}

/** «Нас благодарят» — общий с /education2 список логотипов; файла нет — в ряду только подпись */
export function thanksB(): string {
  const items = LOGOS.map((l) => {
    const src = logoSrc(l.file);
    const img = src ? `<img src="${src}" loading="lazy" decoding="async" alt="${l.alt}" />` : '';
    return `<li class="ab-thanks__item"><span class="ab-thanks__logo">${img}</span><span class="ab-thanks__caption">${l.caption}</span></li>`;
  }).join('\n        ');
  return `<section class="ab-trust trust" aria-labelledby="thanks-h" data-scroll-goal="scroll_trust">
    <div class="ab-wrap ab-thanks">
      <span class="ab-thanks__label" id="thanks-h">Нас благодарят</span>
      <ul class="ab-thanks__list">
        ${items}
      </ul>
    </div>
  </section>`;
}

const PAIRS: [string, string][] = [
  ['Раздал инструкции и весь урок в телефоне', 'Ведёт урок от первой до последней минуты: сюжет, вопросы, вызовы'],
  ['Час сборки по картинкам без понимания, как это работает', 'Объясняем, как и почему всё работает'],
  ['Застрял — ждёт или бросает', 'Застрял — наводящий вопрос, а не готовое решение'],
  ['9–15 детей на педагога, до каждого руки не доходят', 'До 6 детей в группе — внимание каждому'],
  ['«Что делали?» — «Ну, собирали что-то»', 'Видео с занятия в тот же день и памятка для разговора дома'],
  ['Год занятий — а что умеет, непонятно', 'Паспорт инженера, ранги за навыки, защиты проектов'],
];

export function compareB(): string {
  const rows = PAIRS.map(
    ([bad, good]) => `<div class="ab-cmp__row" role="row">
          <div class="ab-cmp__bad" role="cell">${cross('#8a97a8')}<span><span class="ab-cmp__tag" aria-hidden="true">Во многих кружках</span>${bad}</span></div>
          <div class="ab-cmp__good" role="cell">${tick('#ffffff')}<span><span class="ab-cmp__tag" aria-hidden="true">В TEACHNET</span>${good}</span></div>
        </div>`,
  ).join('\n        ');
  return `<section class="ab-sec ab-sec--white" id="compare" aria-labelledby="compare-h2" data-scroll-goal="scroll_b_compare">
    <div class="ab-wrap ab-wrap--1100 ab-stack-36">
      <div class="ab-head ab-head--820">
        <span class="ab-eyebrow">Знакомая картина?</span>
        <h2 class="ab-h2" id="compare-h2">Во многих кружках ребёнка не учат, а просто занимают на час</h2>
        <p class="ab-p">Родители рассказывают одно и то же: раздал инструкции, уткнулся в телефон, а в конце — «заканчиваем, звоните родителям». Это не обучение, а присмотр за ваши деньги. У нас так не работают.</p>
      </div>
      <div class="ab-cmp" role="table" aria-label="Сравнение: многие кружки и TEACHNET">
        <div class="ab-cmp__row ab-cmp__head" role="row">
          <div class="ab-cmp__th" role="columnheader">Во многих кружках</div>
          <div class="ab-cmp__th ab-cmp__th--good" role="columnheader">В TEACHNET</div>
        </div>
        ${rows}
      </div>
      <p class="ab-cmp__outro">Вы платите не за то, чтобы ребёнка заняли на час, а за понимание, как устроена техника.</p>
    </div>
  </section>`;
}

/** «Ступени обучения» — общие с /education2 данные и карточки, светлое оформление */
export function stepsB(): string {
  return `<section class="ab-sec ab-steps-light" id="steps" aria-labelledby="steps-h2" data-scroll-goal="scroll_b_steps">
    <div class="ab-wrap ab-stack-32">
      <div class="ab-head ab-head--14 ab-head--820">
        <span class="ab-eyebrow">${STEPS_TEXT.eyebrow}</span>
        <h2 class="ab-h2" id="steps-h2">${STEPS_TEXT.h2}</h2>
        <p class="ab-p">${STEPS_TEXT.lead}</p>
      </div>
      <ol class="ab-msteps">
        ${stepCards()}
      </ol>
      <div class="ab-msteps__cta">
        <a class="ab-btn ab-btn--md" href="#lead" data-goal="b_steps_signup">${STEPS_TEXT.cta}</a>
        <span class="ab-msteps__note">${STEPS_TEXT.note}</span>
      </div>
    </div>
  </section>`;
}

const LESSON = [
  ['01', 'Завязка', 'Рассказывает сюжет: из штаба пришло срочное сообщение, нужен новый робот.'],
  ['02', 'Вызов', 'Ставит задачу и спрашивает: «Как сделаем?» Ребёнок сначала думает, потом собирает.'],
  ['03', 'Сборка и код', 'Ходит между столами, задаёт вопросы, объясняет, почему механизм работает так. Не делает за ребёнка.'],
  ['04', 'Испытание', 'Испытывает роботов с группой, разбирают ошибки. Миссия выполнена — печать в паспорт.'],
  ['05', 'Интрига', 'В финале новая угроза. Ребёнок уходит с вопросом «а что дальше?».'],
];

export function lessonB(): string {
  const steps = LESSON.map(
    ([n, t, x]) => `<li class="ab-step">
          <span class="ab-step__n">${n}</span>
          <span class="ab-step__title">${t}</span>
          <span class="ab-step__text">${x}</span>
        </li>`,
  ).join('\n        ');
  return `<section class="ab-sec ab-sec--white" id="lesson" aria-labelledby="lesson-h2" data-scroll-goal="scroll_b_lesson">
    <div class="ab-wrap ab-stack-40">
      <div class="ab-grid ab-grid--420 ab-gap-32 ab-center">
        <div class="ab-head">
          <span class="ab-eyebrow">Наше обучение устроено так</span>
          <h2 class="ab-h2" id="lesson-h2">Каждое занятие — миссия, и ведёт её преподаватель</h2>
          <p class="ab-p">Сюжет тянется через весь курс, как сериал. И держит его не инструкция, а преподаватель рядом с детьми.</p>
        </div>
        <img class="ab-lesson__photo" src="/images/mission.webp" width="900" height="700" loading="lazy" decoding="async" alt="Ребёнок выполняет миссию на занятии" />
      </div>
      <ol class="ab-steps">
        ${steps}
      </ol>
      <div class="ab-quote">
        <p class="ab-quote__text">Учим говорить как инженер: не «у меня не получается», а «у меня шестерёнка не вращается».</p>
        <span class="ab-quote__note">Так ребёнок учится искать причину, а не ждать помощи</span>
      </div>
    </div>
  </section>`;
}

const PROOF = [
  ['Видео с каждого занятия', 'В родительском чате в тот же день.'],
  ['Пробный урок на ваших глазах', 'Понаблюдайте за занятием через дверь класса.'],
  ['Открытые защиты проектов', 'Ребёнок сам объясняет, что собрал и как это работает.'],
  ['До 6 детей на педагога', 'С такой группой в телефон не уйдёшь.'],
];

export function proofB(): string {
  const cards = PROOF.map(
    ([t, x]) => `<div class="ab-proof__card">
            <span class="ab-proof__title">${t}</span>
            <span class="ab-proof__text">${x}</span>
          </div>`,
  ).join('\n          ');
  return `<section class="ab-sec" id="proof" aria-labelledby="proof-h2" data-scroll-goal="scroll_b_proof">
    <div class="ab-wrap ab-grid ab-grid--440 ab-gap-56 ab-center">
      <div class="ab-stack-28">
        <div class="ab-head ab-head--14">
          <span class="ab-eyebrow">Не верьте на слово</span>
          <h2 class="ab-h2 ab-h2--plain" id="proof-h2">Проверьте сами — мы ничего не прячем</h2>
        </div>
        <div class="ab-proof__grid">
          ${cards}
        </div>
      </div>
      <div class="ab-proof__photos">
        <img src="/images/team-1.webp" width="800" height="1000" loading="lazy" decoding="async" alt="Преподаватель объясняет ребёнку устройство робота" />
        <img src="/images/team-2.webp" width="800" height="1000" loading="lazy" decoding="async" alt="Дети испытывают робота вместе с преподавателем" />
      </div>
    </div>
  </section>`;
}

const MOTIV = [
  ['Задачи по возрасту.', 'Младшие проходят миссии с сюжетом, подростки — инженерные проекты с расчётами и испытаниями.'],
  ['Паспорт инженера и допуски.', 'Печать за каждую миссию, допуск — за освоенный навык. Рост видно и ребёнку, и вам.'],
  ['Ранги и ТИЧКОИНЫ.', 'Ранги — за навыки, а не за посещаемость. Монеты меняются на призы.'],
  ['Свой результат.', 'Робот или устройство, которое ребёнок сделал сам и защитил перед родителями.'],
];

const MOTIV_PHOTOS = [
  ['/images/passport.webp', 'Паспорт инженера для младших учеников', '5–9 лет · паспорт инженера'],
  ['/images/electronics/journal-coins.webp', 'Лабораторный журнал и ТИЧКОИНЫ на курсе электроники', '10–15 лет · лабораторный журнал'],
];

export function motivationB(): string {
  const items = MOTIV.map(([b, t]) => `<li><span class="ab-dot"></span><span><b>${b}</b> ${t}</span></li>`).join('\n          ');
  const photos = MOTIV_PHOTOS.map(
    ([src, alt, cap]) => `<figure><img src="${src}" width="600" height="600" loading="lazy" decoding="async" alt="${alt}" /><figcaption>${cap}</figcaption></figure>`,
  ).join('\n        ');
  return `<section class="ab-sec ab-sec--flush" aria-labelledby="motiv-h2" data-scroll-goal="scroll_motivation">
    <div class="ab-wrap ab-motiv">
      <div class="ab-motiv__photos">
        ${photos}
      </div>
      <div class="ab-stack-18">
        <h2 class="ab-motiv__h2" id="motiv-h2">Почему ученикам интересно — и в 5, и в 15 лет</h2>
        <ul class="ab-motiv__list">
          ${items}
        </ul>
      </div>
    </div>
  </section>`;
}

const PRICE = ['4 занятия в месяц в группе до 6 человек', 'Конструкторы и оборудование — наши', 'Паспорт инженера и материалы для родителей', 'Видео с занятия в родительский чат'];

export function priceB(): string {
  const items = PRICE.map((t) => `<li>${tick('#a7bada')}<span>${t}</span></li>`).join('\n          ');
  return `<section class="ab-sec ab-price ab-price--dark" id="price" aria-labelledby="price-h2" data-scroll-goal="scroll_price">
    <div class="ab-wrap ab-grid ab-grid--420 ab-gap-price">
      <div class="ab-stack-22" id="price-info">
        <span class="ab-eyebrow">Стоимость</span>
        <h2 class="ab-price__h2" id="price-h2">7 000 ₽ в месяц. Всё включено.</h2>
        <ul class="ab-price__list">
          ${items}
        </ul>
        <p class="ab-price__free">Первый урок бесплатный. Решайте после него.</p>
      </div>
      ${formCard({ title: 'Бесплатный урок: посмотрите сами', sub: 'Ребёнок соберёт робота, а вы увидите, как мы учим.', source: 'education' })}
    </div>
  </section>`;
}

/** «Галерея» — общий с /education2 список фото, светлое оформление */
export function galleryB(): string {
  return `<section class="ab-mgallery ab-mgallery--light" id="gallery" aria-labelledby="gallery-h2" data-scroll-goal="scroll_b_gallery">
    <div class="ab-mgallery__head">
      <div class="ab-head ab-head--14">
        <span class="ab-eyebrow">Галерея</span>
        <h2 class="ab-h2 ab-h2--plain" id="gallery-h2">Как проходят наши занятия</h2>
      </div>
      <span class="ab-mgallery__hint">Листайте вправо →</span>
    </div>
    <ul class="ab-mgallery__strip" aria-label="Фото с занятий" tabindex="0" data-swipe-goal="b_gallery_swipe">
      ${galleryItems()}
    </ul>
  </section>`;
}

/** Вопросы: два из макета (первый раскрыт) и, как сказано в макете, остальные — из основной версии сайта */
export function faqB(rest: { q: string; a: string }[]): string {
  const items = [
    { q: 'Чем вы отличаетесь от других школ робототехники?', a: 'Преподаватель не раздаёт инструкции, а ведёт урок от начала до конца: сюжет, вопросы, объяснения, почему всё работает именно так. В группе до 6 детей. После занятия — видео в родительский чат.' },
    { q: 'Можно ли посмотреть, как проходит урок?', a: 'Да, на пробном уроке можно понаблюдать за занятием через дверь класса.' },
    ...rest,
  ];
  const list = items
    .map((it, i) => `<details class="ab-faq__item"${i === 0 ? ' open' : ''}>
        <summary>${it.q}</summary>
        <p>${it.a}</p>
      </details>`)
    .join('\n      ');
  return `<section class="ab-sec" id="faq" aria-labelledby="faq-h2" data-scroll-goal="scroll_faq" data-faq-goal="faq_open">
    <div class="ab-wrap ab-wrap--860 ab-stack-20">
      <h2 class="ab-faq__h2" id="faq-h2">Вопросы родителей</h2>
      ${list}
    </div>
  </section>`;
}

export function finalB(): string {
  return `<section class="ab-sec ab-sec--flush" id="final" aria-labelledby="final-h2" data-scroll-goal="scroll_final">
    <div class="ab-wrap ab-final-b">
      <div class="ab-final-b__copy">
        <h2 class="ab-final-b__h2" id="final-h2">Один бесплатный урок — и вы увидите разницу</h2>
        <p class="ab-final-b__p">Приходите с ребёнком и посмотрите, как мы учим.</p>
        <a class="ab-btn ab-btn--white" href="#lead" data-goal="block12_cta">Бесплатный пробный урок</a>
      </div>
      <img class="ab-final-b__photo" src="/images/final-1.webp" width="900" height="700" loading="lazy" decoding="async" alt="Дети на занятии TEACHNET" />
    </div>
  </section>`;
}
