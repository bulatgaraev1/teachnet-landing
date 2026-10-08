/** Вариант B (/education). Первый экран: текст слева, фото справа с карточкой поверх. */
import { cta } from '../../components/button';
import { abIcon } from '../icons';

export function heroB(): string {
  return `<section class="section ab-hero" id="hero" aria-labelledby="hero-h1" data-scroll-goal="scroll_hero">
    <div class="container ab-hero__grid">
      <div class="ab-hero__copy" data-reveal>
        <span class="chip">Резидент IT-парка · Группы до 6 человек</span>
        <h1 class="h1" id="hero-h1">Школа инженерии, где учат, а не развлекают</h1>
        <p class="lead">Без «вот инструкция, собирайте, а я в телефоне». Преподаватель весь урок с детьми: объясняет, как и почему всё работает, через миссии, вопросы и вызовы. Дети <span class="ab-nowrap">5–15 лет</span>, Казань.</p>
        <div class="ab-hero__cta">
          ${cta({ label: 'Бесплатный пробный урок', goal: 'hero_cta' })}
          <p class="micro">60 минут · можно посмотреть, как идёт урок · ни к чему не обязывает</p>
        </div>
      </div>
      <div class="ab-hero__media" data-reveal style="--reveal-delay:120ms">
        <img class="ph ab-hero__photo" src="/images/hero.svg" width="1280" height="760" alt="Дети собирают робота из конструктора на занятии по робототехнике" fetchpriority="high" decoding="async" />
        <p class="ab-hero__note"><span class="ab-hero__note-icon">${abIcon('users')}</span><span><strong>Преподаватель рядом весь урок.</strong> До 6 детей в группе.</span></p>
      </div>
    </div>
  </section>`;
}
