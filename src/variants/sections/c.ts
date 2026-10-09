/** Блоки варианта C (/education2 «Манифест») — по макету docs/mockups/education2-mockup.html. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tick } from './svg';
import { formCard } from './form-card';

/** Якорь всех кнопок записи на странице — карточка формы (как в макете) */
export const SIGNUP = '#msignup';

export function heroC(): string {
  return `<section class="ab-mhero" id="hero" aria-labelledby="m-h1" data-scroll-goal="scroll_hero">
    <div class="ab-wrap ab-mhero__inner">
      <span class="ab-mchip">Манифест TEACHNET</span>
      <h1 class="ab-mhero__title" id="m-h1">Мы устали от школ, которые развлекают детей, а не учат.</h1>
      <p class="ab-mhero__accent">Поэтому создали TEACHNET.</p>
      <p class="ab-mhero__sub">Школа инженерии для детей 5–15 лет в Казани. Преподаватель не в своих делах, а весь урок ведёт детей и объясняет, как и почему всё работает.</p>
      <div class="ab-mhero__cta">
        <a class="ab-btn ab-btn--glow" href="${SIGNUP}" data-goal="hero_cta">Проверить на бесплатном уроке</a>
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

const STEPS = [
  {
    age: 'от 5 лет',
    title: 'Робототехника на LEGO',
    text: 'Первый собственный робот. Основы механики, электроники и программирования — через миссии и испытания.',
    result: 'сам собирает и программирует роботов — от простых к сложным.',
    meta: '60 минут · группа до 6 человек',
  },
  {
    age: 'от 10 лет',
    title: 'Электроника',
    text: 'Реальные платы, датчики и моторы. Ребёнок сам рассчитывает схему, проверяет её прибором и пишет программу.',
    result: 'проектирует, собирает и защищает собственные устройства.',
    meta: '90 минут · группа до 6 человек',
  },
  {
    age: 'от 14 лет',
    title: 'Продвинутая электроника и робототехника',
    text: 'Автоматика и робототехника: устройства, которые сами следят за обстановкой и принимают решения. Ребёнок проектирует их от схемы до программы.',
    result: 'создаёт автономного робота или систему автоматики под реальную задачу.',
    meta: '90 минут · группа до 6 человек',
  },
];

export function stepsC(): string {
  const cards = STEPS.map(
    (st, i) => `<li class="ab-mstep">
          <div class="ab-mstep__top">
            <span class="ab-mstep__n">${i + 1}</span>
            <span class="ab-mstep__age">${st.age}</span>
          </div>
          <span class="ab-mstep__title">${st.title}</span>
          <span class="ab-mstep__text">${st.text}</span>
          <div class="ab-mstep__foot">
            <span class="ab-mstep__result"><b>Итоги модулей:</b> ${st.result}</span>
            <span class="ab-mstep__meta">${st.meta}</span>
          </div>
        </li>`,
  ).join('\n        ');
  return `<section class="ab-msec ab-msec--steps" id="steps" aria-labelledby="steps-h2" data-scroll-goal="scroll_c_steps">
    <div class="ab-wrap ab-stack-36">
      <div class="ab-head ab-head--14 ab-head--820">
        <span class="ab-meyebrow">Ступени обучения</span>
        <h2 class="ab-mh2" id="steps-h2">От первого робота до своего инженерного проекта</h2>
        <p class="ab-mp">Своя программа под каждый возраст и понятная траектория роста: каждая ступень опирается на предыдущую — от первого робота до автоматики и собственных проектов.</p>
      </div>
      <ol class="ab-msteps">
        ${cards}
      </ol>
      <div class="ab-msteps__cta">
        <a class="ab-btn ab-btn--md" href="${SIGNUP}" data-goal="c_steps_signup">Подобрать ступень на пробном уроке</a>
        <span class="ab-msteps__note">С какой ступени начать — определим на первом занятии по возрасту и подготовке.</span>
      </div>
    </div>
  </section>`;
}

// Логотипы «Наше дело актуальное»: файл кладут в public/images/ (webp / jpg / jpeg / png).
// Проверка на сборке: если файла ещё нет, в карточке — название текстом, без битой картинки.
const IMAGES_DIR = fileURLToPath(new URL('../../../public/images/', import.meta.url));
const LOGO_FORMATS = ['webp', 'jpg', 'jpeg', 'png'];
const NOTED = [
  { file: 'logo-itpark', alt: 'IT-парк', caption: 'IT-парк' },
  { file: 'logo-edu', alt: 'Министерство образования и науки РТ', caption: 'Минобрнауки РТ' },
  { file: 'logo-youth-ministry', alt: 'Министерство по делам молодёжи РТ', caption: 'Минмолодёжи РТ' },
  { file: 'logo-kai', alt: 'КНИТУ-КАИ', caption: 'КНИТУ-КАИ' },
  { file: 'logo-kazan', alt: 'Школа №4', caption: 'Школа №4', tall: true },
  { file: 'logo-semya', alt: 'Семья вместе', caption: '«Семья вместе»' },
];

function logoSrc(file: string): string | null {
  const ext = LOGO_FORMATS.find((e) => existsSync(`${IMAGES_DIR}${file}.${e}`));
  return ext ? `/images/${file}.${ext}` : null;
}

export function notedC(): string {
  const items = NOTED.map((l) => {
    const src = logoSrc(l.file);
    const inner = src
      ? `<img class="ab-noted__logo${l.tall ? ' ab-noted__logo--tall' : ''}" src="${src}" loading="lazy" decoding="async" alt="${l.alt}" />`
      : `<span class="ab-noted__name">${l.alt}</span>`;
    return `<li class="ab-noted__item"><div class="ab-noted__card">${inner}</div><span class="ab-noted__caption">${l.caption}</span></li>`;
  }).join('\n        ');
  return `<section class="ab-msec ab-msec--noted" id="noted" aria-labelledby="noted-h2" data-scroll-goal="scroll_c_noted">
    <div class="ab-wrap ab-stack-28">
      <h2 class="ab-noted__h2" id="noted-h2">Наше дело актуальное, и это отметили</h2>
      <ul class="ab-noted">
        ${items}
      </ul>
    </div>
  </section>`;
}

export function whoC(): string {
  const chips = ['Резидент IT-парка', 'Свои учебные разработки на отечественных компонентах', 'Поддержка Фонда содействия инновациям']
    .map((c) => `<span class="ab-mchip ab-mchip--plain">${c}</span>`)
    .join('\n          ');
  return `<section class="ab-msec ab-msec--who" id="who" aria-labelledby="who-h2" data-scroll-goal="scroll_c_who">
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
      <div class="ab-dare__copy">
        <span class="ab-dare__eyebrow">Проверьте нас</span>
        <h2 class="ab-dare__h2" id="dare-h2">Приходите на пробный урок и смотрите за каждой минутой</h2>
        <p class="ab-dare__p">Наблюдайте, как идёт занятие. Увидите, что детей оставили с инструкцией, — можете не возвращаться. Это бесплатно.</p>
        <a class="ab-btn ab-btn--white" href="${SIGNUP}" data-goal="c_dare_signup">Записаться и проверить</a>
      </div>
      <img class="ab-dare__photo" src="/images/final-1.webp" width="880" height="660" loading="lazy" decoding="async" alt="Пробный урок в TEACHNET" />
    </div>
  </section>`;
}

const PRICE = ['4 занятия в месяц в группе до 6 человек', 'Конструкторы и оборудование — наши', 'Паспорт инженера и материалы для родителей', 'Видео с каждого занятия в родительский чат'];

export function priceC(): string {
  const items = PRICE.map((t) => `<li>${tick('#316397')}<span>${t}</span></li>`).join('\n          ');
  return `<section class="ab-msec ab-msec--light ab-price" id="mprice" aria-labelledby="mprice-h2" data-scroll-goal="scroll_price">
    <div class="ab-wrap ab-grid ab-grid--420 ab-gap-price">
      <div class="ab-stack-22" id="mprice-info">
        <span class="ab-meyebrow">Стоимость</span>
        <h2 class="ab-price__h2" id="mprice-h2">7 000 ₽ в месяц. Всё включено.</h2>
        <ul class="ab-price__list">
          ${items}
        </ul>
        <p class="ab-price__free">Первый урок бесплатный. Решайте после него.</p>
      </div>
      ${formCard({ title: 'Запишитесь и посмотрите, как мы учим', source: 'education2', id: SIGNUP.slice(1), titleId: 'msignup-h' })}
    </div>
  </section>`;
}

// Галерея «Как проходят наши занятия». Фото — в public/images/; чтобы добавить, допишите строку.
// Первые два фото — без loading="lazy", остальные — с ним (указание владельца).
const GALLERY = [
  { src: '/images/hero.webp', alt: 'Дети собирают робота на занятии' },
  { src: '/images/team-1.webp', alt: 'Преподаватель объясняет устройство механизма' },
  { src: '/images/mission.webp', alt: 'Испытание робота на миссии' },
  { src: '/images/team-2.webp', alt: 'Преподаватель с детьми на занятии' },
  { src: '/images/passport.webp', alt: 'Паспорт инженера с печатями' },
  { src: '/images/final-1.webp', alt: 'Дети на занятии TEACHNET' },
];

export function galleryC(): string {
  const items = GALLERY.map(
    (g, i) => `<li><img src="${g.src}" width="880" height="660"${i > 1 ? ' loading="lazy"' : ''} decoding="async" alt="${g.alt}" /></li>`,
  ).join('\n      ');
  return `<section class="ab-mgallery" id="gallery" aria-labelledby="gallery-h2" data-scroll-goal="scroll_c_gallery">
    <div class="ab-mgallery__head">
      <div class="ab-head ab-head--14">
        <span class="ab-meyebrow">Галерея</span>
        <h2 class="ab-mh2 ab-mh2--plain" id="gallery-h2">Как проходят наши занятия</h2>
      </div>
      <span class="ab-mgallery__hint">Листайте вправо →</span>
    </div>
    <ul class="ab-mgallery__strip" aria-label="Фото с занятий" tabindex="0" data-swipe-goal="c_gallery_swipe">
      ${items}
    </ul>
  </section>`;
}

export function finalC(): string {
  return `<section class="ab-msec" id="final" aria-labelledby="mfinal-h2" data-scroll-goal="scroll_final">
    <div class="ab-wrap ab-wrap--1100 ab-mfinal">
      <h2 class="ab-mfinal__h2" id="mfinal-h2">Хватит платить за то, чтобы ребёнка просто заняли.</h2>
      <p class="ab-mfinal__p">Один бесплатный урок покажет разницу.</p>
      <a class="ab-btn" href="${SIGNUP}" data-goal="block12_cta">Бесплатный пробный урок</a>
    </div>
  </section>`;
}
