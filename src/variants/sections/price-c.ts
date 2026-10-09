/**
 * Вариант C (/education2). «Стоимость» и форма записи — один светлый блок, как в макете:
 * слева цена и что входит, справа карточка с формой (тот же компонент формы, что на главной,
 * в компоновке макета: подписи над полями, возраст и филиал списками).
 */
import { icon } from '../../lib/icons';
import { leadForm } from '../../components/form';
import { SITE } from '../../lib/site';

const ITEMS = [
  '4 занятия в месяц в группе до 6 человек',
  'Конструкторы и оборудование — наши',
  'Паспорт инженера и материалы для родителей',
  'Видео с каждого занятия в родительский чат',
];
const AGES = ['5–7', '8–9', '10–12', '13–15'];

export function priceC(): string {
  const items = ITEMS.map((t) => `<li>${icon('check')}<span>${t}</span></li>`).join('');
  return `<section class="section ab-light ab-mprice" id="price" aria-labelledby="price-h" data-scroll-goal="scroll_price">
    <div class="container ab-mprice__grid">
      <div class="ab-mprice__info" data-reveal>
        <p class="label-tag ab-eyebrow">Стоимость</p>
        <h2 class="h2" id="price-h">7 000 ₽ в месяц. Всё включено.</h2>
        <ul class="ab-mprice__list">${items}</ul>
        <p class="ab-mprice__free">Первый урок бесплатный. Решайте после него.</p>
      </div>
      <div class="ab-mprice__card" id="conversion" data-scroll-goal="scroll_conversion" data-reveal>
        <h3 class="ab-mprice__title" id="lead">Запишитесь и посмотрите, как мы учим</h3>
        ${leadForm({
          source: 'education2',
          labels: true,
          namePlaceholder: 'Как к вам обращаться',
          ageType: 'select',
          ageOptions: AGES.map((a) => ({ value: a, label: `${a} лет` })),
          branches: SITE.branches.map((b) => ({ value: b.id, label: b.street })),
          submitLabel: 'Записаться на пробный урок',
          footText: 'Перезвоним в течение 15 минут в рабочее время',
        })}
      </div>
    </div>
  </section>`;
}
