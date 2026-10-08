/** Вариант B (/education). Финал по макету: фирменная плашка — текст и кнопка слева, фото справа. */
import { cta } from '../../components/button';

export function finalB(): string {
  return `<section class="section ab-final-b" id="final" aria-labelledby="fin-h" data-scroll-goal="scroll_final">
    <div class="container">
      <div class="ab-final-b__box" data-reveal>
        <div class="ab-final-b__copy">
          <h2 class="h2" id="fin-h">Один бесплатный урок — и вы увидите разницу</h2>
          <p class="lead">Приходите с ребёнком и посмотрите, как мы учим.</p>
          ${cta({ label: 'Бесплатный пробный урок', goal: 'block12_cta', extraClass: 'ab-btn-on-brand' })}
        </div>
        <img class="ab-final-b__photo" src="/images/final-1.svg" width="900" height="700" loading="lazy" decoding="async" alt="Преподаватель и ребёнок на занятии" />
      </div>
    </div>
  </section>`;
}
