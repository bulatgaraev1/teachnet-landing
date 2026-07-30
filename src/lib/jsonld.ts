/**
 * JSON-LD для главной страницы — генерируется на сборке (внедряется в index.html
 * через transformIndexHtml вместо плейсхолдера <!--jsonld-->).
 * Источник данных — SITE (адрес, реквизиты, контакты, соцсети) и FAQ ITEMS,
 * чтобы адрес и вопросы не дублировались руками. Тип — LocalBusiness (у проекта
 * нет образовательной лицензии, EducationalOrganization/Course не используются).
 * geo не добавляется — координаты не заданы.
 */
import { SITE } from './site';
import { ITEMS } from '../sections/faq';

const ORIGIN = 'https://teachnet.ru';

/** description берём дословно из <meta name="description"> самой страницы. */
function metaDescription(html: string): string {
  const m = html.match(/name="description"[\s\S]*?content="([^"]*)"/);
  return m ? m[1] : '';
}

function localBusiness(html: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${ORIGIN}/#organization`,
    name: SITE.brand,
    description: metaDescription(html),
    url: ORIGIN,
    logo: `${ORIGIN}/icon-512.png`,
    image: `${ORIGIN}/og-image.png`,
    telephone: SITE.phoneDisplay,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '10:00',
      closes: '21:00',
    },
    priceRange: '7000 ₽/месяц',
    areaServed: { '@type': 'City', name: SITE.address.locality },
    sameAs: [SITE.social.vk, SITE.social.telegram],
    taxID: SITE.requisites.inn,
  };
}

function faqPage(): Record<string, unknown> {
  // только вопросы с реальным текстом ответа (заглушки-TODO с HTML-комментарием — мимо)
  const mainEntity = ITEMS.filter((it) => !it.a.includes('<!--')).map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a },
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

function scriptTag(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

/** Оба блока JSON-LD для вставки в <head> главной. */
export function siteJsonLd(html: string): string {
  return `${scriptTag(localBusiness(html))}\n    ${scriptTag(faqPage())}`;
}
