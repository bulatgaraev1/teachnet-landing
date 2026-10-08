/** Вариант C (/education2). «Проверьте нас» — фирменная синяя плашка с кнопкой записи (цель c_dare_signup). */
import { cta } from '../../components/button';

export function dare(): string {
  return `<section class="section ab-dare-sec" id="dare" aria-labelledby="dare-h" data-scroll-goal="scroll_c_dare">
    <div class="container">
      <div class="ab-dare" data-reveal>
        <p class="label-tag ab-eyebrow">Проверьте нас</p>
        <h2 class="h2" id="dare-h">Приходите на пробный урок и смотрите за каждой минутой</h2>
        <p class="lead">Наблюдайте через дверь класса, как идёт занятие. Увидите, что детей оставили с инструкцией, — можете не возвращаться. Это бесплатно.</p>
        ${cta({ label: 'Записаться и проверить', goal: 'c_dare_signup', extraClass: 'ab-btn-on-brand' })}
      </div>
    </div>
  </section>`;
}
