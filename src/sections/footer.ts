/** Подвал (§11). Тёмный фон, белый логотип, контакты, реквизиты, юр-ссылки. */
import { icon } from '../lib/icons';
import { SITE } from '../lib/site';

export function footer(withScrollGoal = false): string {
  // скролл-цель подвала вешаем только на главной (передаётся из page.ts),
  // чтобы scroll_footer не срабатывал на дочерних/юридических страницах
  const scrollAttr = withScrollGoal ? ' data-scroll-goal="scroll_footer"' : '';
  // Блок поддержки ФСИ временно скрыт по запросу. Чтобы вернуть — заполнить
  // fsiSupport разметкой из комментария ниже.
  const fsiSupport = '';
  /* Восстановить:
  const fsiSupport = `
      <div class="footer-support">
        <img class="footer-support__logo" src="/images/logo-fsi.svg" width="120" height="60" loading="lazy" decoding="async" alt="Фонд содействия инновациям" />
        <p class="footer-support__text">Проект создан при поддержке Федерального государственного бюджетного учреждения «Фонд содействия развитию малых форм предприятий в научно-технической сфере» в рамках программы «Студенческий стартап» федерального проекта «Платформа университетского технологического предпринимательства».</p>
      </div>`;
  */
  return `<footer class="site-footer"${scrollAttr}>
    <div class="container">
      <div class="footer-grid">

        <div>
          <img class="footer-logo" src="/images/logo-white.svg" width="140" height="44" loading="lazy" decoding="async" alt="${SITE.brand}" />
          <p class="footer-soft" style="max-width:34ch">Школа инженерии и робототехники для детей в Казани</p>
          <div class="footer-social">
            <a href="${SITE.social.vk}" target="_blank" rel="noopener" aria-label="ВКонтакте">${icon('vk')}</a>
            <a href="${SITE.social.telegram}" target="_blank" rel="noopener" aria-label="Telegram">${icon('send')}</a>
            <a href="${SITE.social.max}" target="_blank" rel="noopener" aria-label="MAX">${icon('message-circle')}</a>
          </div>
          <p class="footer-req" style="margin-top:24px">
            ${SITE.requisites.name}<br>
            ИНН: ${SITE.requisites.inn}<br>
            ОГРНИП: ${SITE.requisites.ogrnip}
          </p>
        </div>

        <div>
          <p class="footer-col__title">Контакты</p>
          <address style="line-height:2;font-style:normal">${SITE.address.full}</address>
          <p style="line-height:2"><a href="${SITE.emailHref}">${SITE.email}</a></p>
          <p style="line-height:2"><a href="${SITE.phoneHref}">${SITE.phoneDisplay}</a></p>
          <p style="line-height:2;margin-top:8px"><a href="${SITE.social.chat}" target="_blank" rel="noopener">Чат поддержки</a></p>
          <p class="footer-soft">ежедневно с 10:00 до 21:00</p>
        </div>

      </div>

      ${fsiSupport}

      <div class="footer-bottom">
        <img class="footer-itpark" src="/images/logo-itpark.svg" width="90" height="50" loading="lazy" decoding="async" alt="IT-парк" />
        <div class="footer-bottom__links">
          <span>© ${SITE.brand} ${SITE.year}</span>
          <a href="${SITE.legal.privacy}" target="_blank" rel="noopener">Политика конфиденциальности</a>
          <a href="${SITE.legal.consent}" target="_blank" rel="noopener">Согласие на обработку персональных данных</a>
          <a href="${SITE.legal.cookie}" target="_blank" rel="noopener">Политика использования cookie</a>
        </div>
      </div>
    </div>
  </footer>`;
}
