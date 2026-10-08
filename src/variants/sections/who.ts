/** Вариант C (/education2). «Кто мы». Фото — основатель (то же, что в блоке «Ведёт инженер» на /electronics). */

const CHIPS = ['Резидент IT-парка', 'Свои учебные разработки на отечественных компонентах', 'Поддержка Фонда содействия инновациям'];

export function who(): string {
  const chips = CHIPS.map((c) => `<li class="ab-line-chip">${c}</li>`).join('');
  return `<section class="section" id="who" aria-labelledby="who-h" data-scroll-goal="scroll_c_who">
    <div class="container ab-who">
      <div class="ab-who__copy" data-reveal>
        <p class="label-tag ab-eyebrow">Кто мы</p>
        <h2 class="h2" id="who-h">Школа инженеров, а не аниматоров</h2>
        <p class="lead">Программы и учебное оборудование разрабатываем сами. Основатель — инженер-конструктор, выпускник КНИТУ-КАИ с красным дипломом.</p>
        <ul class="ab-who__chips">${chips}</ul>
      </div>
      <img class="ph ab-who__photo" src="/images/electronics/teacher.webp" width="800" height="1000" loading="lazy" decoding="async" alt="Основатель TEACHNET на занятии с детьми" data-reveal />
    </div>
  </section>`;
}
