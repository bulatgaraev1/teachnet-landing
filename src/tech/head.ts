/**
 * <head> страницы /tech: title, description, canonical, Open Graph, Twitter Card,
 * preload рендера платы и JSON-LD (BreadcrumbList, FAQPage). Генерируется на сборке
 * из src/content/tech.ts. Product не используется: цены пока нет (заглушка [ЦЕНА]).
 */
import { TECH } from '../content/tech';
import { BOARD_IMG, BOARD_IMG_800 } from './page';

const ORIGIN = 'https://teachnet.ru';
const PAGE_URL = `${ORIGIN}/tech`;
/** превью для ссылок: копия рендера платы 1200 × 630 (как у остальных страниц сайта) */
const OG_IMAGE = `${ORIGIN}/og-tech.png`;

function attr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function ld(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

export function techHead(): string {
  const t = attr(TECH.meta.title);
  const d = attr(TECH.meta.description);
  return [
    `<title>${TECH.meta.title}</title>`,
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
    `<meta property="og:image:alt" content="${attr(TECH.meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<link rel="preload" as="image" href="${BOARD_IMG}" imagesrcset="${BOARD_IMG_800} 800w, ${BOARD_IMG} 1600w" imagesizes="(min-width: 960px) 560px, calc(100vw - 48px)" fetchpriority="high" />`,
    ld({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: TECH.meta.breadcrumbHome, item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: TECH.meta.breadcrumbPage, item: PAGE_URL },
      ],
    }),
    ld({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: TECH.faq.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    }),
  ].join('\n    ');
}
