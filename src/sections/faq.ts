/** Блок 11. FAQ (§7 — аккордеон). Тексты дословно. Плейсхолдеры → HTML-комментарии. */
import { accordion } from '../components/accordion';
import type { AccItem } from '../components/accordion';
import { SITE } from '../lib/site';

export const ITEMS: AccItem[] = [
  {
    q: 'Мой ребёнок — гуманитарий. Ему точно сюда?',
    a: 'Инженерное мышление начинается не с формул, а с вопроса «как это устроено?». Его задают все дети. Приходите на пробный — посмотрим, что откликнется, и скажем честно.',
  },
  {
    q: 'А если бросит через месяц?',
    a: 'Главный страх всех родителей. Именно поэтому занятия у нас — миссии с сюжетом, рангами и наградами: интерес держится на самом процессе, а не на уговорах. И реакция ребёнка после бесплатного урока скажет вам больше любых обещаний.',
  },
  {
    q: 'Нужно что-то покупать?',
    a: 'Нет. Конструкторы, электроника, инструменты — всё наше.',
  },
  {
    q: 'Где проходят занятия?',
    a: `В двух филиалах: ${SITE.branches.map((b) => `${b.address} (${b.note})`).join(', и ')}.`,
  },
  {
    q: 'Если пропустили занятие?',
    a: '<!-- TODO: блок 11 — политика отработок пропусков -->',
  },
  {
    q: 'С какого возраста?',
    a: 'С 5 лет. Для каждого возраста — своя ступень и свой темп.',
  },
];

export interface FaqOptions {
  /** вопросы перед общими (на вариантах главной — «Чем вы отличаетесь…», раскрыт сразу) */
  prepend?: AccItem[];
}

export function faq({ prepend = [] }: FaqOptions = {}): string {
  // вопрос без ответа (заглушка <!-- TODO -->) на странице не показываем, пока нет текста
  const items = [...prepend, ...ITEMS.filter((it) => !it.a.includes('<!--'))];
  return `<section class="section" id="faq" aria-labelledby="faq-h" data-scroll-goal="scroll_faq" data-faq-goal="faq_open">
    <div class="blobs"></div>
    <div class="container layer" style="max-width:880px">
      <div class="section-head" data-reveal>
        <h2 class="h2" id="faq-h">Частые вопросы родителей</h2>
      </div>
      <div data-reveal>${accordion(items, { openFirst: prepend.length > 0 })}</div>
    </div>
  </section>`;
}
