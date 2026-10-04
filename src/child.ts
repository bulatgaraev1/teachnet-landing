/**
 * Страница /child — бесплатные мастер-классы «Твой Ход» (трек «Делаю», Росмолодёжь).
 * Пересборка экспортированной из Creatium страницы в текущем стеке, в едином дизайне
 * с сайтом. Тексты — дословно из content/child-page-brief.md.
 * Рендерится на сборке (импортируется vite.config.ts) — статичный HTML, без JS-роутинга.
 */
import { cta } from './components/button';
import { accordion } from './components/accordion';
import type { AccItem } from './components/accordion';
import { leadForm } from './components/form';
import { footer } from './sections/footer';
import { cookieBanner } from './components/cookie-banner';
import { icon } from './lib/icons';
import { SITE } from './lib/site';

const STATS = [
  { num: '6—16', label: 'возраст детей, лет' },
  { num: '60—90 мин', label: 'длительность занятия, в зависимости от возраста' },
  { num: '0 руб', label: 'полностью бесплатно' },
];

const BENEFITS = [
  {
    label: '— 01 / Опыт',
    title: 'Первый практический опыт в инженерии',
    text: 'Соберет робототехническую систему, поработает с моторами, датчиками и электронными компонентами.',
  },
  {
    label: '— 02 / Понимание',
    title: 'Поймет принципы работы технических устройств',
    text: 'Узнает, как работают простые инженерные и электронные системы, и как конструкция влияет на результат.',
  },
  {
    label: '— 03 / Профориентация',
    title: 'Сформирует интерес к инженерным направлениям',
    text: 'Познакомится с инженерией как реальной профессией и сделает первый шаг к дальнейшему обучению.',
  },
];

const GALLERY = ['final-1', 'final-2', 'mission', 'team-1', 'team-2', 'team-3', 'hero'];

const STEPS = [
  {
    n: '01',
    title: 'Знакомство с инженерией и постановка задачи',
    text: 'Участники узнают, кто такой инженер, где применяются инженерные решения и какую задачу предстоит решить в рамках мастер-класса.',
  },
  {
    n: '02',
    title: 'Сборка инженерной конструкции',
    text: 'Участники собирают робототехническую систему, знакомятся с основными компонентами: двигателями, датчиками и элементами конструкции.',
  },
  {
    n: '03',
    title: 'Знакомство с электроникой и принципами работы',
    text: 'Изучение базовых элементов электроники (светодиоды, резисторы, двигатели, мультиметр) и понимание, как работают технические системы.',
  },
  {
    n: '04',
    title: 'Практическая работа и результат',
    text: 'Завершение сборки, проверка работы устройства и получение первого самостоятельного опыта взаимодействия с техникой.',
  },
  {
    n: '05',
    title: 'Собственный инженерный конструктор',
    text: 'В мастер-классах используется разработанный учебный инженерный конструктор на отечественной компонентной базе. Это позволяет участникам работать с реальными техническими решениями и лучше понимать принципы современной инженерии.',
  },
];

const EQUIP_BULLETS = [
  {
    title: 'Мини-группы',
    text: 'Занятия проходят в небольших группах, что позволяет уделить внимание каждому участнику.',
  },
  {
    title: 'Практико-ориентированный формат',
    text: 'Основной акцент сделан на самостоятельной работе и вовлечении участников в процесс.',
  },
  {
    title: 'Адаптация под возраст',
    text: 'Содержание занятий подбирается с учетом возраста и уровня подготовки участников.',
  },
];

const FORM_POINTS = [
  'Мастер-класс полностью бесплатный',
  'Всё оборудование и помещение предоставляем мы',
  'Родители могут присутствовать',
];

const FAQ: AccItem[] = [
  {
    q: 'Сколько стоит мастер-класс?',
    a: 'Мастер-класс полностью бесплатный — это часть конкурсного проекта TEACHNET в рамках трека «Делаю» проекта «Твой Ход» от Росмолодёжи. От вас не потребуется никакой оплаты, ни до, ни после занятия.',
  },
  {
    q: 'Как со мной свяжутся после заявки?',
    a: 'В течение рабочего дня позвоним с 10:00 до 20:00 МСК. Согласуем удобное время, ответим на все вопросы и забронируем место в группе.',
  },
  {
    q: 'Что если ребёнок никогда не занимался инженерией и робототехникой?',
    a: 'Это нормально и даже желательно. Мастер-класс рассчитан как раз на знакомство с темой. Преподаватель адаптирует подачу под уровень группы — никто не останется в стороне.',
  },
  {
    q: 'Что такое трек «Делаю» и конкурс «Твой Ход»?',
    a: '«Твой Ход» — Всероссийский студенческий конкурс от Росмолодёжи. Трек «Делаю» — направление конкурса, в котором участники реализуют собственные проекты с реальной пользой для общества. Наш проект TEACHNET — один из таких.',
  },
];

function header(): string {
  return `<header class="child-header">
    <div class="container child-header__inner">
      <a href="/" class="site-header__brand" aria-label="${SITE.brand} — на главную">
        <img class="site-header__logo" src="/images/logo-dark.svg" width="121" height="38" alt="${SITE.brand}" />
      </a>
      <span class="child-status">Запись закрыта. Мастер-классы прошли</span>
    </div>
  </header>`;
}

function hero(): string {
  return `<section class="section child-hero">
    <div class="container">
      <h1 class="h1 child-hero__title">Бесплатные мастер-классы по <span class="accent">инженерии и робототехнике</span> для детей</h1>
      <p class="lead child-hero__sub">За занятие ваш ребёнок соберёт первого робота, познакомится с программированием и почувствует себя инженером.</p>
      <div class="child-hero__cta">
        ${cta({ label: 'Записать ребёнка', href: '#zapis' })}
        ${cta({ label: 'Узнать подробнее', href: '#podrobnee', extraClass: 'btn--ghost' })}
      </div>
    </div>
  </section>`;
}

function stats(): string {
  const items = STATS.map(
    (s) => `<div class="child-stat">
      <span class="child-stat__num">${s.num}</span>
      <span class="child-stat__label">${s.label}</span>
    </div>`,
  ).join('');
  return `<section class="child-stats-section">
    <div class="container"><div class="child-stats">${items}</div></div>
  </section>`;
}

function tyhod(): string {
  return `<section class="section child-tyhod">
    <div class="container">
      <div class="child-tyhod__grid">
        <h2 class="h2 child-tyhod__title"><span class="accent">«Твой Ход»</span> — проект от Росмолодёжи</h2>
        <div>
          <p class="lead">Мастер-классы проводятся в рамках <strong>трека «Делаю»</strong> Всероссийского студенческого конкурса «Твой Ход» от Росмолодёжи. Это часть нашего конкурсного проекта TEACHNET.</p>
          <div class="child-badges">
            <span class="chip">Трек «Делаю»</span>
            <span class="chip">Росмолодежь</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function benefits(): string {
  const cards = BENEFITS.map(
    (c) => `<article class="card child-benefit">
      <span class="child-benefit__label">${c.label}</span>
      <h3 class="h3">${c.title}</h3>
      <p class="muted">${c.text}</p>
    </article>`,
  ).join('');
  return `<section class="section" id="podrobnee">
    <div class="container">
      <div class="section-head">
        <p class="label-tag child-eyebrow">— ЧТО ПОЛУЧИТ РЕБËНОК</p>
        <h2 class="h2">Не лекция, а <span class="accent">живая инженерия</span> — руками, с разработкой и опытным преподавателем</h2>
      </div>
      <div class="grid-3">${cards}</div>
    </div>
  </section>`;
}

function gallery(): string {
  const imgs = GALLERY.map(
    (n) =>
      `<img class="child-gallery__img" src="/images/${n}.svg" width="900" height="700" loading="lazy" decoding="async" alt="Кадр с мастер-класса TEACHNET" />`,
  ).join('');
  return `<section class="section child-gallery-section">
    <div class="container">
      <div class="section-head">
        <p class="label-tag child-eyebrow">— КАК ЭТО ВЫГЛЯДИТ</p>
        <h2 class="h2">Кадры с <span class="accent">наших занятий</span></h2>
        <p class="lead">Маленькие группы, индивидуальное внимание, полный комплект оборудования. Родители могут присутствовать</p>
      </div>
    </div>
    <div class="child-gallery" role="list" aria-label="Кадры с наших занятий">${imgs}</div>
  </section>`;
}

function structure(): string {
  const steps = STEPS.map(
    (s) => `<li class="child-step">
      <span class="child-step__num">${s.n}</span>
      <div>
        <h3 class="h3 child-step__title">${s.title}</h3>
        <p class="child-step__text">${s.text}</p>
      </div>
    </li>`,
  ).join('');
  const bullets = EQUIP_BULLETS.map(
    (b) => `<li class="child-equip__item">
      <span class="tick-mark">${icon('check')}</span>
      <span><strong>${b.title}</strong> — ${b.text}</span>
    </li>`,
  ).join('');
  return `<section class="section section--dark">
    <div class="container">
      <div class="section-head">
        <p class="label-tag child-eyebrow">— СТРУКТУРА ЗАНЯТИЯ</p>
        <h2 class="h2">Мастер-класс разложенный <span class="accent">по смыслам</span></h2>
        <p class="lead">Мы продумали каждый этап так, чтобы ребёнок не потерял внимание и ушёл с конкретным результатом в руках.</p>
      </div>
      <div class="child-structure">
        <ol class="child-steps">${steps}</ol>
        <aside class="child-equip">
          <h3 class="h3">Всё оборудование — наше. Приходить нужно только с интересом.</h3>
          <p class="child-equip__lead">Конструкторы, ноутбуки, расходники — мы предоставляем всё. Преподаватели — действующие инженеры и выпускники педагогических ВУЗов.</p>
          <ul class="child-equip__list">${bullets}</ul>
        </aside>
      </div>
    </div>
  </section>`;
}

function formSection(): string {
  const points = FORM_POINTS.map(
    (p) => `<li><span class="tick-mark">${icon('check')}</span><span>${p}</span></li>`,
  ).join('');
  return `<section class="section child-form-section" id="zapis">
    <div class="container">
      <div class="child-form__grid">
        <div class="child-form__intro">
          <h2 class="h2">Запишите ребёнка на <span class="accent">бесплатный</span> мастер-класс</h2>
          <p class="lead">Свяжемся в течение дня по телефону с 10:00 до 20:00 МСК. Подскажем удобное время и место, и забронируем место.</p>
          <ul class="ticks child-form__points">${points}</ul>
        </div>
        <div class="conversion__form">
          ${leadForm({ source: 'child-masterclass', ageType: 'select', submitLabel: 'Записаться на занятие' })}
        </div>
      </div>
    </div>
  </section>`;
}

function faq(): string {
  return `<section class="section" id="faq">
    <div class="container" style="max-width:880px">
      <div class="section-head section-head--center">
        <p class="label-tag child-eyebrow">— отвечаем на вопросы —</p>
        <h2 class="h2">Что обычно <span class="accent">спрашивают родители</span></h2>
      </div>
      ${accordion(FAQ)}
    </div>
  </section>`;
}

export function renderChildPage(): string {
  return [
    header(),
    '<main id="main">',
    hero(),
    stats(),
    tyhod(),
    benefits(),
    gallery(),
    structure(),
    formSection(),
    faq(),
    '</main>',
    footer(),
    cookieBanner(),
  ].join('\n');
}
