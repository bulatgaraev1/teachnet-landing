/** Вариант C (/education2, тёмная подача). Первый экран-манифест. */
import { cta } from '../../components/button';

export function heroC(): string {
  return `<section class="section ab-mhero" id="hero" aria-labelledby="hero-h1" data-scroll-goal="scroll_hero">
    <div class="container ab-mhero__inner" data-reveal>
      <span class="ab-line-chip">Манифест TEACHNET</span>
      <h1 class="ab-mhero__title" id="hero-h1">Мы устали от школ, которые развлекают детей, а не учат.</h1>
      <p class="ab-mhero__accent">Поэтому создали TEACHNET.</p>
      <p class="lead ab-mhero__sub">Школа инженерии для детей <span class="ab-nowrap">5–15 лет</span> в Казани. Преподаватель не уходит в телефон, а весь урок ведёт детей и объясняет, как и почему всё работает.</p>
      <div class="ab-mhero__cta">
        ${cta({ label: 'Проверить на бесплатном уроке', goal: 'hero_cta' })}
        <p class="micro">60 минут · можно посмотреть, как идёт урок · бесплатно</p>
      </div>
    </div>
  </section>`;
}
