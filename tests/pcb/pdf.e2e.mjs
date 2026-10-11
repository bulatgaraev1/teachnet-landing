// PDF «значок в натуральную величину» (ТЗ docs/pcb/tz-pdf-1-1.md): кнопка в примерке на /pcb/ для всех форм и размеров —
// файл скачивается, во время создания нет сетевых запросов, нет ошибок в консоли, кнопка блокируется.
// PDF сохраняются в PCB_PDF_OUT (по умолчанию — временная папка), проверка содержимого — tests/pcb/check_pdf.py.
// Запуск и стенд — tests/pcb/README.md.
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib from 'node:zlib';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.PCB_BASE || 'http://127.0.0.1:8086';
const OUT = process.env.PCB_PDF_OUT || mkdtempSync(join(tmpdir(), 'pcb-pdf-'));
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };

// тестовый логотип: красный круг на прозрачном фоне, PNG без сторонних библиотек
const LOGO = join(OUT, 'logo.png');
(() => {
  const crc = (buf) => { let c, r = 0xffffffff; for (const b of buf) { c = (r ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(64, 0); ih.writeUInt32BE(64, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.concat(Array.from({ length: 64 }, (_, y) => Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: 64 }, (_, x) => Buffer.from((x - 32) ** 2 + (y - 32) ** 2 < 24 ** 2 ? [220, 40, 40, 255] : [0, 0, 0, 0])))])));
  writeFileSync(LOGO, Buffer.concat([Buffer.from([0x89, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
})();

// форма × допустимые размеры; цвета плат и краски — разные, чтобы проверить и новые платы
const CASES = [
  { shape: 'round', cls: 'S', board: 'blue', ink: 'white', logo: false },
  { shape: 'round', cls: 'M', board: 'blue', ink: 'white', logo: true },
  { shape: 'rect', cls: 'M', board: 'green', ink: 'white', logo: false },
  { shape: 'rect', cls: 'L', board: 'black', ink: 'gold', logo: true },
  { shape: 'badge', cls: 'L', board: 'purple', ink: 'white', logo: false },
  { shape: 'round', cls: 'M', board: 'white', ink: 'black', logo: false },
];
const QR = 'https://teachnet.ru/pcb/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('tn-cookie-consent', 'accepted'); } catch {} });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(BASE + '/pcb/', { waitUntil: 'networkidle' });
await p.locator('#tryon').scrollIntoViewIfNeeded();
await p.waitForFunction(() => window.jspdf && window.TEACHNET_PDF_FONTS, null, { timeout: 15000 });
ok(true, 'jsPDF и шрифт подгрузились заранее, когда примерка появилась на экране');
await p.fill('#tryon-back-text', 'Привет, команда!');
await p.fill('#tryon-qr', QR);
const manifest = [];
for (const c of CASES) {
  const name = `${c.shape}-${c.cls}-${c.board}`;
  if (c.logo) await p.setInputFiles('#tryon-file', LOGO);
  await p.check(`input[name="tryon-shape"][value="${c.shape}"]`, { force: true });
  await p.check(`input[name="tryon-cls"][value="${c.cls}"]`, { force: true });
  await p.check(`input[name="tryon-board"][value="${c.board}"]`, { force: true });
  await p.check(`input[name="tryon-ink"][value="${c.ink}"]`, { force: true });
  await p.waitForTimeout(150);
  const requests = [];
  const onReq = r => requests.push(r.url());
  p.on('request', onReq);
  const t0 = Date.now();
  // состояние кнопки во время создания PDF ловим наблюдателем — PDF собирается быстрее, чем успел бы опрос
  await p.evaluate(() => {
    const btn = document.getElementById('tryon-pdf');
    window.__busy = [];
    window.__mo && window.__mo.disconnect();
    window.__mo = new MutationObserver(() => { if (btn.disabled) window.__busy.push(btn.textContent); });
    window.__mo.observe(btn, { attributes: true, childList: true, characterData: true, subtree: true });
  });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#tryon-pdf')]);
  c.busyText = (await p.evaluate(() => window.__busy)).find(t => t) || '';
  const file = join(OUT, name + '.pdf');
  await dl.saveAs(file);
  p.off('request', onReq);
  const ms = Date.now() - t0;
  ok(dl.suggestedFilename() === 'teachnet-znachok-1-1.pdf', `${name}: файл teachnet-znachok-1-1.pdf (${ms} мс)`, dl.suggestedFilename());
  ok(requests.filter(u => !u.startsWith('blob:')).length === 0, `${name}: во время создания нет сетевых запросов`, requests.join(' '));
  ok(c.busyText === 'Готовим PDF…', `${name}: кнопка «Готовим PDF…» и заблокирована`, c.busyText);
  ok(!(await p.locator('#tryon-pdf').isDisabled()) && (await p.textContent('#tryon-pdf')) === 'Скачать в натуральную величину (PDF)', `${name}: кнопка снова доступна`);
  manifest.push({ file, ...c, qr: c.cls === 'S' ? null : QR });
}
ok(errors.length === 0, 'нет ошибок в консоли', errors.join(' | '));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nPDF: ${OUT}\n${pass} ✓, ${fail} ✗`);
await b.close();
process.exit(fail ? 1 : 0);
