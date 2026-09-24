/**
 * <head> страницы /electronics: title, description, canonical, Open Graph,
 * Twitter Card, preload hero-фото и JSON-LD (Service, BreadcrumbList, FAQPage).
 * Всё генерируется на сборке из src/content/electronics.ts.
 * Типы Course и EducationalOrganization не используются.
 */
import { EL } from '../content/electronics';
import { heroPreload } from './photo';

const ORIGIN = 'https://teachnet.ru';
export const PAGE_PATH = '/electronics';
const PAGE_URL = `${ORIGIN}${PAGE_PATH}`;
const OG_IMAGE = `${ORIGIN}/og-electronics.png`;
/** @id LocalBusiness с главной (src/lib/jsonld.ts) */
const ORG_ID = `${ORIGIN}/#organization`;

function attr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function ld(data: Record<string, unknown>): string {
  // </script> внутри строки невозможен, но экранируем «<» на всякий случай
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

function service(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${PAGE_URL}#service`,
    name: EL.meta.serviceName,
    description: EL.meta.description,
    url: PAGE_URL,
    image: OG_IMAGE,
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'City', name: 'Казань' },
    audience: { '@type': 'PeopleAudience', suggestedMinAge: 10, suggestedMaxAge: 15 },
    offers: {
      '@type': 'Offer',
      url: `${PAGE_URL}#price`,
      price: '7000',
      priceCurrency: 'RUB',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '7000',
        priceCurrency: 'RUB',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON', unitText: 'месяц' },
      },
    },
  };
}

function breadcrumbs(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: EL.meta.breadcrumbHome, item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: EL.meta.breadcrumbPage, item: PAGE_URL },
    ],
  };
}

function faqPage(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: EL.faq.items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

export function electronicsHead(): string {
  const t = attr(EL.meta.title);
  const d = attr(EL.meta.description);
  return [
    `<title>${EL.meta.title}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${PAGE_URL}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="TEACHNET" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:url" content="${PAGE_URL}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${attr(EL.meta.ogImageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    heroPreload(),
    ld(service()),
    ld(breadcrumbs()),
    ld(faqPage()),
  ]
    .filter(Boolean)
    .join('\n    ');
}
