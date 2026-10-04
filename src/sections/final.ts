/** Блок 12. Финал. Тексты дословно. Закрывающий CTA + контакты + фото. */
import { cta } from '../components/button';
import { SITE } from '../lib/site';

export function final(): string {
  const photos = ['final-1', 'final-2', 'mission']
    .map(
      (n) =>
        `<img class="ph" src="/images/${n}.svg" width="900" height="700" loading="lazy" decoding="async" alt="Фото с мастер-класса" />`,
    )
    .join('');

  return `<section class="section final" id="final" aria-labelledby="fin-h" data-scroll-goal="scroll_final">
    <div class="blueprint"></div>
    <div class="container layer">
      <div class="section-head section-head--center" data-reveal>
        <h2 class="h2" id="fin-h">Один бесплатный урок — и всё станет понятно</h2>
        <p class="lead">Ребёнок соберёт робота. Вы получите ответы.</p>
      </div>
      <div style="text-align:center" data-reveal>${cta({ label: 'Бесплатный пробный урок', goal: 'block12_cta' })}</div>
      <div class="final__contacts" data-reveal>
        <a href="${SITE.phoneHref}" data-goal="phone_click" data-goal-place="final">${SITE.phoneDisplay}</a>
        <a href="${SITE.social.vk}" target="_blank" rel="noopener" data-goal="contact_click" data-goal-type="vk" data-goal-place="final">ВКонтакте</a>
        <a href="${SITE.social.telegram}" target="_blank" rel="noopener" data-goal="contact_click" data-goal-type="telegram" data-goal-place="final">Telegram</a>
        <a href="${SITE.social.max}" target="_blank" rel="noopener" data-goal="contact_click" data-goal-type="max" data-goal-place="final">MAX</a>
      </div>
      <div class="final__photos" data-reveal>${photos}</div>
    </div>
  </section>`;
}
