/**
 * Сборка страницы из секций (сверху вниз). Чистые функции → строка HTML.
 * Импортируется vite.config.ts и встраивается в index.html статически.
 * Клиентское поведение навешивается отдельно в main.ts.
 */
import { header } from './sections/header';
import { hero } from './sections/hero';
import { trust } from './sections/trust';
import { translator } from './sections/translator';
import { programs } from './sections/programs';
import { mission } from './sections/mission';
import { motivation } from './sections/motivation';
import { parents } from './sections/parents';
import { team } from './sections/team';
import { conversion } from './sections/conversion';
import { price } from './sections/price';
import { mediaMentions } from './sections/media-mentions';
import { faq } from './sections/faq';
import { final } from './sections/final';
import { footer } from './sections/footer';

import { stickyBar } from './components/sticky-bar';
import { cookieBanner } from './components/cookie-banner';
import { mobileMenu } from './components/mobile-menu';

export function renderPage(): string {
  return [
    header(),
    mobileMenu(),
    '<main id="main">',
    hero(),
    trust(),
    translator(),
    programs(),
    mission(),
    motivation(),
    parents(),
    team(),
    conversion(),
    price(),
    mediaMentions(),
    faq(),
    final(),
    '</main>',
    footer(true),
    stickyBar(),
    cookieBanner(),
  ].join('\n');
}
