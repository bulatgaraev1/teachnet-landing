/**
 * Логотипы «Наше дело актуальное» (/education2) и «Нас благодарят» (/education) — один список на оба лендинга.
 * Файл кладут в public/images/ (webp / jpg / jpeg / png). Проверка на сборке: если файла ещё нет,
 * лендинг выводит вместо картинки название, без битой картинки.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const IMAGES_DIR = fileURLToPath(new URL('../../../public/images/', import.meta.url));
const LOGO_FORMATS = ['webp', 'jpg', 'jpeg', 'png'];

export interface Logo {
  readonly file: string;
  readonly alt: string;
  readonly caption: string;
  /** высота логотипа в карточке /education2 по макету: tall — 76 px, short — 64 px, иначе 72 px */
  readonly size?: 'tall' | 'short';
}

export const LOGOS: readonly Logo[] = [
  { file: 'logo-itpark', alt: 'IT-парк', caption: 'IT-парк' },
  { file: 'logo-edu', alt: 'Министерство образования и науки РТ', caption: 'Минобрнауки РТ' },
  { file: 'logo-youth-ministry', alt: 'Министерство по делам молодёжи РТ', caption: 'Минмолодёжи РТ' },
  { file: 'logo-kai', alt: 'КНИТУ-КАИ', caption: 'КНИТУ-КАИ' },
  { file: 'logo-kazan', alt: 'Школа №4', caption: 'Школа №4', size: 'tall' },
  { file: 'logo-semya', alt: 'Семья вместе', caption: '«Семья вместе»' },
  { file: 'logo-fsi', alt: 'Фонд содействия инновациям', caption: 'Фонд содействия инновациям' },
  { file: 'logo-selet', alt: 'Сэлэт', caption: '«Сэлэт»', size: 'short' },
];

/** Путь к файлу логотипа или null, если его ещё нет */
export function logoSrc(file: string): string | null {
  const ext = LOGO_FORMATS.find((e) => existsSync(`${IMAGES_DIR}${file}.${e}`));
  return ext ? `/images/${file}.${ext}` : null;
}
