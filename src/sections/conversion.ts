/** Блок 9. Конверсионный (§3 — заголовок по центру, §5 — glass на пятнах). Тексты дословно. */
import { icon } from '../lib/icons';
import { leadForm } from '../components/form';
import { SITE } from '../lib/site';

const POINTS = [
  'Ребёнок соберёт и запустит первого робота уже на этом занятии',
  'Определим интересы и подберём ступень',
  'Ответим на все ваши вопросы',
];

export function conversion(): string {
  const ticks = POINTS.map(
    (p) => `<li><span class="tick-mark">${icon('check')}</span><span>${p}</span></li>`,
  ).join('');

  return `<section class="section conversion" id="conversion" aria-labelledby="cv-h" data-scroll-goal="scroll_conversion">
    <div class="blobs"></div>
    <div class="container layer">
      <div class="section-head section-head--center" id="lead" data-reveal>
        <h2 class="h2" id="cv-h">Начните с бесплатного урока</h2>
        <ul class="ticks" style="text-align:left;max-width:460px;margin:26px auto 0">${ticks}</ul>
      </div>
      <div class="conversion__form" style="max-width:560px;margin:0 auto" data-reveal>
        ${leadForm({
          // филиал — как в форме /electronics: обязательный выбор из SITE.branches
          branches: SITE.branches.map((b) => ({ value: b.id, label: b.selectLabel })),
          branchLabel: 'Филиал',
          branchError: 'Выберите филиал',
        })}
      </div>
    </div>
  </section>`;
}
