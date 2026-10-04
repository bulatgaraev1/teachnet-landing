/**
 * Цель на раскрытие вопроса FAQ: секция с data-faq-goal="<идентификатор>" шлёт эту цель
 * с номером и текстом вопроса (n, q). Сворачивание не считается.
 * Вызывать после initAccordion(): к моменту нашего обработчика aria-expanded уже переключён.
 */
import { reachGoal } from './metrika';

export function initFaqGoals(): void {
  document.querySelectorAll<HTMLElement>('[data-faq-goal]').forEach((box) => {
    const goal = box.dataset.faqGoal || '';
    box.querySelectorAll<HTMLButtonElement>('.acc-trigger').forEach((t, i) => {
      t.addEventListener('click', () => {
        if (goal && t.getAttribute('aria-expanded') === 'true') reachGoal(goal, { n: String(i + 1), q: (t.textContent || '').trim() });
      });
    });
  });
}
