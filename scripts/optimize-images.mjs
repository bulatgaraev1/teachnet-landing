#!/usr/bin/env node
/**
 * Оптимизация изображений сайта: конвертация в WebP + ресайз (sharp).
 *
 *   npm run optimize-images                          # все растровые файлы в public/images
 *   npm run optimize-images -- public/images/new.png # конкретные файлы или папки
 *
 * Опции:
 *   --max=1600      максимум по большей стороне, px (по умолчанию 1600; меньше не увеличиваем)
 *   --width=400     вместо --max: максимум по ширине, px (для логотипов)
 *   --quality=78    качество WebP (по умолчанию 78)
 *   --lossless      WebP без потерь (для логотипов и иконок с мелким текстом и орнаментом)
 *   --force         перекодировать и уже готовые WebP, даже если ресайз не нужен
 *   --keep          не удалять исходные PNG/JPG после конвертации
 *   --dry-run       только показать, что будет сделано
 *
 * Правила:
 *   - PNG/JPG → WebP с тем же именем, исходник удаляется (сборка сама подставит WebP
 *     вместо SVG-заглушки, см. vite.config.ts);
 *   - прозрачность сохраняется; если альфа-канал пустой (картинка полностью непрозрачная),
 *     он убирается: вид тот же, файл меньше;
 *   - готовый WebP перезаписывается, только если его нужно уменьшить по размеру (или --force)
 *     и новый файл получается легче;
 *   - не трогаются: SVG, превью для соцсетей и иконки сайта (должны оставаться PNG).
 */
import { readdirSync, statSync, unlinkSync, renameSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, basename, dirname, relative } from 'node:path';
import sharp from 'sharp';

const SKIP = new Set(['og-image.png', 'og-electronics.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png']);
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const args = process.argv.slice(2);
const opt = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : def;
};
const flag = (name) => args.includes(`--${name}`);
const MAX = opt('max', 1600);
const WIDTH = opt('width', 0);
const QUALITY = opt('quality', 78);
const LOSSLESS = flag('lossless');
const FORCE = flag('force');
const KEEP = flag('keep');
const DRY = flag('dry-run');
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) targets.push('public/images');

function collect(p, out) {
  if (!existsSync(p)) {
    console.warn(`нет такого пути: ${p}`);
    return out;
  }
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) collect(join(p, f), out);
  } else if (RASTER.has(extname(p).toLowerCase()) && !SKIP.has(basename(p))) {
    out.push(p);
  }
  return out;
}

const kb = (n) => (n / 1024).toFixed(1);
const rows = [];
let before = 0;
let after = 0;

const files = targets.reduce((acc, t) => collect(t, acc), []);

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const out = join(dirname(file), `${basename(file, extname(file))}.webp`);
  const src = await sharp(file).metadata();
  const sizeBefore = statSync(file).size;

  // нужен ли ресайз
  const limitW = WIDTH || MAX;
  const limitH = WIDTH ? Infinity : MAX;
  const needResize = src.width > limitW || src.height > limitH;
  if (ext === '.webp' && !needResize && !FORCE) {
    rows.push([file, sizeBefore, sizeBefore, `${src.width}×${src.height}`, 'уже оптимизирован']);
    before += sizeBefore;
    after += sizeBefore;
    continue;
  }

  // прозрачность: оставляем, только если альфа-канал реально используется
  let keepAlpha = false;
  if (src.hasAlpha) {
    const stats = await sharp(file).stats();
    keepAlpha = stats.channels[3].min < 255;
  }

  let pipeline = sharp(file).rotate();
  if (needResize) {
    pipeline = WIDTH
      ? pipeline.resize({ width: WIDTH, withoutEnlargement: true })
      : pipeline.resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
  }
  if (!keepAlpha) pipeline = pipeline.removeAlpha();
  const webpOpts = LOSSLESS ? { lossless: true, effort: 6 } : { quality: QUALITY, alphaQuality: 100, effort: 6, smartSubsample: true };
  const buf = await pipeline.webp(webpOpts).toBuffer({ resolveWithObject: true });

  // уже готовый WebP не заменяем более тяжёлым
  if (ext === '.webp' && buf.data.length >= sizeBefore && !needResize) {
    rows.push([file, sizeBefore, sizeBefore, `${src.width}×${src.height}`, 'оставлен (новый не легче)']);
    before += sizeBefore;
    after += sizeBefore;
    continue;
  }

  if (!DRY) {
    // буфер пишем как есть: повторный проход через sharp перекодировал бы файл
    const tmp = `${out}.tmp`;
    writeFileSync(tmp, buf.data);
    renameSync(tmp, out);
    if (ext !== '.webp' && !KEEP) unlinkSync(file);
  }
  before += sizeBefore;
  after += buf.data.length;
  rows.push([
    ext === '.webp' ? file : `${file} → ${basename(out)}`,
    sizeBefore,
    buf.data.length,
    `${buf.info.width}×${buf.info.height}${keepAlpha ? ', прозрачность' : ''}${LOSSLESS ? ', без потерь' : ''}`,
    DRY ? 'dry-run' : 'готово',
  ]);
}

const w = Math.max(...rows.map((r) => relative('.', r[0]).length), 10);
for (const [f, b, a, dim, note] of rows) {
  console.log(`${relative('.', f).padEnd(w)}  ${kb(b).padStart(8)} КБ → ${kb(a).padStart(7)} КБ  ${dim}  ${note}`);
}
console.log(`\nИтого: ${kb(before)} КБ → ${kb(after)} КБ (${rows.length} файлов)`);
