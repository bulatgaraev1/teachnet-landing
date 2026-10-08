/** Вариант B (/education). «Проверьте сами — мы ничего не прячем»: 4 карточки 2×2 и два фото. */

const CARDS = [
  { title: 'Видео с каждого занятия', text: 'В родительском чате в тот же день.' },
  { title: 'Пробный урок на ваших глазах', text: 'Понаблюдайте за занятием через дверь класса.' },
  { title: 'Открытые защиты проектов', text: 'Ребёнок сам объясняет, что собрал и как это работает.' },
  { title: 'До 6 детей на педагога', text: 'С такой группой в телефон не уйдёшь.' },
];

export function proof(): string {
  const cards = CARDS.map(
    (c) => `<div class="ab-proof__card">
            <h3 class="ab-proof__title">${c.title}</h3>
            <p class="muted">${c.text}</p>
          </div>`,
  ).join('');

  return `<section class="section ab-sec--white" id="proof" aria-labelledby="proof-h" data-scroll-goal="scroll_b_proof">
    <div class="container ab-proof">
      <div class="ab-proof__copy" data-reveal>
        <div class="section-head">
          <p class="label-tag ab-eyebrow">Не верьте на слово</p>
          <h2 class="h2" id="proof-h">Проверьте сами — мы ничего не прячем</h2>
        </div>
        <div class="ab-proof__grid">${cards}</div>
      </div>
      <div class="ab-proof__photos" data-reveal>
        <img class="ph" src="/images/team-1.svg" width="800" height="1000" loading="lazy" decoding="async" alt="Преподаватель и ребёнок на занятии" />
        <img class="ph" src="/images/team-2.svg" width="800" height="1000" loading="lazy" decoding="async" alt="Преподаватель помогает детям с программой на планшете" />
      </div>
    </div>
  </section>`;
}
