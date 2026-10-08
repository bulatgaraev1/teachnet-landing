import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
import { renderPage } from './src/page';
import { renderLegalPage } from './src/legal';
import { renderChildPage } from './src/child';
import { siteJsonLd } from './src/lib/jsonld';
import { renderElectronicsPage } from './src/electronics/page';
import { electronicsHead } from './src/electronics/head';
import { renderTechPage } from './src/tech/page';
import { techHead } from './src/tech/head';
import { renderLinksPage } from './src/links/page';
import { renderEducationPage } from './src/variants/education';
import { renderEducation2Page } from './src/variants/education2';

// Контент страницы собирается из секций (чистые функции) и встраивается в index.html
// на этапе сборки/дев-сервера — статичный HTML, без рантайм-инъекции (важно для SEO и LCP,
// трафик из Яндекс Директа). Клиентский main.ts вешает только поведение на готовый DOM.
// На GitHub Pages проектный сайт отдаётся по пути /<repo>/. base задаётся в CI
// (workflow подставляет имя репозитория), локально остаётся '/'.
const base = process.env.BASE_PATH || '/';

// Авто-подстановка реальных фото вместо серых SVG-заглушек.
// Реальное фото кладут в public/images/ с тем же именем, что у заглушки, но
// в растровом формате (.webp / .jpg / .jpeg / .png). Если такой файл есть —
// сборка сама заменит ссылку <name>.svg → <name>.<реальный-формат>.
// Если фото ещё нет, остаётся заглушка. Имя файла менять в коде не нужно.
const IMAGES_DIR = fileURLToPath(new URL('./public/images', import.meta.url));
const RASTER_PRIORITY = ['webp', 'jpg', 'jpeg', 'png'];

function realPhotos(): Record<string, string> {
  const byName: Record<string, string> = {};
  let files: string[] = [];
  try {
    files = readdirSync(IMAGES_DIR);
  } catch {
    return byName;
  }
  for (const file of files) {
    const m = /^(.+)\.(webp|jpe?g|png)$/i.exec(file);
    if (!m) continue;
    const [, name, rawExt] = m;
    const ext = rawExt.toLowerCase() === 'jpeg' ? 'jpeg' : rawExt.toLowerCase();
    const current = byName[name];
    const currentExt = current?.split('.').pop()?.toLowerCase() ?? '';
    if (!current || RASTER_PRIORITY.indexOf(ext) < RASTER_PRIORITY.indexOf(currentExt)) {
      byName[name] = file;
    }
  }
  return byName;
}

function resolvePhotos(html: string): string {
  const map = realPhotos();
  return html.replace(
    /\/images\/([A-Za-z0-9_-]+)\.svg/g,
    (full, name: string) => (map[name] ? `/images/${map[name]}` : full),
  );
}

// Стили блоков вариантов главной (A/B-тест): встраиваются <style> только в /education и /education2.
// Через import они попали бы в общий CSS (cssCodeSplit: false) и утяжелили бы все страницы сайта.
const AB_CSS = fileURLToPath(new URL('./src/styles/ab.css', import.meta.url));
function abStyle(): string {
  // без комментариев и лишних пробелов (пробел-комбинатор в селекторах сохраняется)
  const css = readFileSync(AB_CSS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .trim();
  return `<style>${css}</style>`;
}

// Точки входа: главная (index.html) + отдельные юридические страницы.
// Каждая — реальный статичный HTML, доступный по своему URL.
const pageInput = (name: string) => fileURLToPath(new URL(`./${name}.html`, import.meta.url));

export default defineConfig({
  base,
  plugins: [
    tailwindcss(),
    {
      name: 'teachnet:render-page',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          // имя страницы по её html-файлу: index | education | education2 | child | links | privacy | …
          const slug = basename(ctx.path).replace(/\.html$/, '');
          let body: string;
          if (slug === 'education') {
            body = renderEducationPage();
          } else if (slug === 'education2') {
            body = renderEducation2Page();
          } else if (slug === 'links') {
            body = renderLinksPage();
          } else if (slug === 'child') {
            body = renderChildPage();
          } else if (slug === 'electronics') {
            body = renderElectronicsPage();
          } else if (slug === 'tech') {
            body = renderTechPage();
          } else if (slug !== 'index') {
            body = renderLegalPage(slug) || renderPage();
          } else {
            body = renderPage();
          }
          let out = html.replace('<!--app-->', body);
          // варианты главной: свои стили блоков — встроенным <style> (читается при каждой сборке/запросе)
          if (slug === 'education' || slug === 'education2') {
            out = out.replace('<!--ab-style-->', abStyle());
          }
          // JSON-LD (LocalBusiness + FAQPage) — только на главной, из SITE/FAQ
          if (slug === 'index') {
            out = out.replace('<!--jsonld-->', siteJsonLd(html));
          }
          // /electronics: SEO-мета, preload hero, JSON-LD (Service, BreadcrumbList, FAQPage)
          if (slug === 'electronics') {
            out = out.replace('<!--el-head-->', electronicsHead());
          }
          // /tech: SEO-мета, preload рендера платы, JSON-LD (BreadcrumbList, FAQPage)
          if (slug === 'tech') {
            out = out.replace('<!--tech-head-->', techHead());
          }
          return resolvePhotos(out);
        },
      },
    },
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: pageInput('index'),
        child: pageInput('child'),
        electronics: pageInput('electronics'),
        tech: pageInput('tech'),
        privacy: pageInput('privacy'),
        'personal-data-consent': pageInput('personal-data-consent'),
        'cookie-policy': pageInput('cookie-policy'),
        // визитка для ссылки в профиле соцсетей: /links и /links/ (без редиректа, как остальные страницы)
        links: pageInput('links'),
        // варианты главной для A/B-теста: /education (B «Сравнение»), /education2 (C «Манифест»)
        education: pageInput('education'),
        education2: pageInput('education2'),
      },
    },
  },
});
