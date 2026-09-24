/**
 * Фото страницы /electronics. Проверка на сборке: если файл лежит в
 * public/images/electronics/, выводится <img>, иначе аккуратный плейсхолдер
 * с подписью, что должно быть в кадре. Новый файл подхватывается без правки кода
 * (достаточно пересобрать сайт, CI делает это при пуше).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EL } from '../content/electronics';
import { elIcon } from './icons';

const DIR = fileURLToPath(new URL('../../public/images/electronics/', import.meta.url));
const FORMATS = ['webp', 'jpg', 'jpeg', 'png'];

export interface PhotoSpec {
  readonly file: string;
  readonly w: number;
  readonly h: number;
  readonly shot: string;
  readonly alt: string;
}

/** Путь к реальному файлу фото или null, если его ещё нет */
export function photoSrc(p: PhotoSpec): string | null {
  for (const ext of FORMATS) {
    if (existsSync(`${DIR}${p.file}.${ext}`)) return `/images/electronics/${p.file}.${ext}`;
  }
  return null;
}

function ratio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/** hero: без lazy, с fetchpriority="high" (preload добавляется в head отдельно) */
export function photo(p: PhotoSpec, opts: { hero?: boolean; cls?: string } = {}): string {
  const cls = ['el-photo', opts.cls || ''].filter(Boolean).join(' ');
  const src = photoSrc(p);
  if (src) {
    const loading = opts.hero ? 'fetchpriority="high"' : 'loading="lazy"';
    return `<img class="${cls}" src="${src}" width="${p.w}" height="${p.h}" style="aspect-ratio:${p.w} / ${p.h}" ${loading} decoding="async" alt="${p.alt}" />`;
  }
  return `<div class="${cls} el-ph" style="aspect-ratio:${p.w} / ${p.h}" role="img" aria-label="${EL.photoPlaceholderPrefix} ${p.shot}">
      <span class="el-ph__inner" aria-hidden="true">
        ${elIcon('camera', 'el-ph__icon')}
        <span class="el-ph__text">${p.shot}</span>
        <span class="el-ph__file">${p.file}.webp · ${ratio(p.w, p.h)}</span>
      </span>
    </div>`;
}

/** <link rel="preload"> для hero, только если фото уже есть */
export function heroPreload(): string {
  const src = photoSrc(EL.photos.hero);
  return src ? `<link rel="preload" as="image" href="${src}" fetchpriority="high" />` : '';
}
