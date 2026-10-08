/** Вариант C (/education2). Финал по макету: крупный заголовок, текст и кнопка на тёмном фоне. */
import { cta } from '../../components/button';

export function finalC(): string {
  return `<section class="section ab-final-c" id="final" aria-labelledby="fin-h" data-scroll-goal="scroll_final">
    <div class="container ab-narrow ab-final-c__inner" data-reveal>
      <h2 class="ab-final-c__title" id="fin-h">Хватит платить за то, чтобы ребёнка просто заняли.</h2>
      <p class="lead">Один бесплатный урок покажет разницу.</p>
      ${cta({ label: 'Бесплатный пробный урок', goal: 'block12_cta' })}
    </div>
  </section>`;
}
