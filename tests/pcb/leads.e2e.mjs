// Сквозные проверки этапа 2 (раздел 7 ТЗ): заявки с /holiday/ и /pcb/ до базы, Telegram и почты,
// проверка полей, ловушка, «не быстрее 3 секунд», лимит частоты, чужой сайт, единый код ФИАС,
// сбои Telegram, обработчика и базы. Запуск и стенд — tests/pcb/README.md.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib from 'node:zlib';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const env = (k, d) => process.env[k] || d;
const BASE = env('PCB_BASE', 'http://127.0.0.1:8086');
const WEBROOT = env('PCB_WEBROOT', '/srv/apstand/www');                 // корень сайта стенда (для «обработчик недоступен»)
const CFG = env('PCB_SEND_CONFIG', '/srv/apstand/send_config.php');      // send_config.php стенда (для «база недоступна»)
const STATE = env('PCB_STATE_DIR', '/srv/apstand/tn_state/pcb');          // счётчики лимитов lead.php
const MAIL = env('PCB_MAIL_LOG', '/srv/apstand/mail.log');                // куда sendmail стенда пишет письма
const TGLOG = env('PCB_TG_LOG', '/srv/apstand/tg/tg.log');                // журнал заглушки Telegram (tests/pcb/tg-mock.php)
const TGMODE = env('PCB_TG_MODE', '/srv/apstand/tg/mode');                // ok | down
const DB = env('PCB_DB', 'mariadb --default-character-set=utf8mb4 -u root -N -B teachnet');   // консольный клиент базы стенда
const TMP = mkdtempSync(join(tmpdir(), 'pcb-e2e-'));
const LOGO = join(TMP, 'logo.png');
// тестовый логотип 64×64 PNG, без сторонних библиотек
(() => {
  const crc = (buf) => { let c, crc = 0xffffffff; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(64, 0); ihdr.writeUInt32BE(64, 4); ihdr[8] = 8; ihdr[9] = 6;
  // красный круг на прозрачном фоне — как настоящий логотип (сплошной квадрат примерка не примет: фон берётся по углам)
  const raw = Buffer.concat(Array.from({ length: 64 }, (_, y) => Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: 64 }, (_, x) => Buffer.from((x - 32) ** 2 + (y - 32) ** 2 < 24 ** 2 ? [220, 40, 40, 255] : [0, 0, 0, 0])))])));
  writeFileSync(LOGO, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
})();
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };
const sql = q => execSync(`${DB} -e ${JSON.stringify(q)}`).toString().trim();
const row = id => { const cols = sql('SHOW COLUMNS FROM pcb_leads').split('\n').map(l => l.split('\t')[0]); const v = sql(`SELECT * FROM pcb_leads WHERE id=${id}`).split('\t'); return Object.fromEntries(cols.map((c, i) => [c, v[i] === 'NULL' ? null : v[i]])); };
const lastId = () => +(sql('SELECT COALESCE(MAX(id),0) FROM pcb_leads') || 0);
const resetLimits = () => execSync(`rm -rf ${JSON.stringify(STATE)}`);
const tg = () => existsSync(TGLOG) ? readFileSync(TGLOG, 'utf8') : '';
const mail = () => existsSync(MAIL) ? readFileSync(MAIL, 'utf8') : '';
writeFileSync(TGMODE, 'ok');
sql('DROP TABLE IF EXISTS pcb_leads');
resetLimits();

const b = await chromium.launch();
let lastCtx = null;
async function open(path, w = 1440) {
  if (lastCtx) await lastCtx.close();
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('tn-cookie-consent', 'accepted'); } catch {} });
  lastCtx = ctx;
  const p = await ctx.newPage();
  p.errors = []; p.posts = [];
  p.on('pageerror', e => p.errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errors.push(m.text()); });
  p.on('request', r => { if (r.method() === 'POST') p.posts.push(r.url()); });
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  return p;
}
async function fillContact(p, name = 'Анна', contact = '8 (917) 123-45-67') {
  await p.fill('#lead-name', name);
  await p.fill('#lead-contact', contact);
}
async function submitAndWait(p) {
  await p.click('.submit-button');
  await p.waitForFunction(() => !document.getElementById('request-sent').hidden || !document.getElementById('request-result').hidden || document.querySelector('.field-error'), null, { timeout: 15000 });
}

console.log('— /holiday/: заявка до базы, Telegram и почты');
let tg0 = tg().length, mail0 = mail().length;
let p = await open('/holiday/?utm_source=vk&utm_medium=cpc&utm_campaign=autumn');
await p.click('[data-party-quantity="20"]');
await p.fill('#city', 'челны'); await p.waitForTimeout(150); await p.keyboard.press('Enter');
await p.fill('#age', '10–12 лет');
await p.fill('#date', '2026-12-20');
await p.fill('#comment', 'Позвоните после 18:00, мой номер 8 900 000-00-00');
await fillContact(p);
// без согласия форма не уходит
await p.click('.submit-button'); await p.waitForTimeout(300);
ok(p.posts.length === 0, 'без галочки согласия запрос не отправляется');
// почта вместо телефона — подсказка у поля
await p.fill('#lead-contact', 'anna@mail.ru'); await p.check('#lead-consent');
await p.click('.submit-button'); await p.waitForTimeout(300);
ok(p.posts.length === 0 && (await p.$eval('#lead-contact', i => i.validationMessage)).includes('телефон или Telegram'), 'почта вместо телефона — понятная подсказка, запрос не уходит');
await p.fill('#lead-contact', '8 (917) 123-45-67');
const t0 = Date.now();
await submitAndWait(p);
ok(await p.locator('#request-sent').isVisible() && !(await p.locator('#request-form').isVisible()), '«Заявка отправлена», форма скрыта', await p.locator('#result-text').textContent().catch(() => ''));
let id = lastId(), r = row(id);
ok(r.page === 'holiday' && r.format === 'pcb' && r.quantity === '20', 'в базе: страница, программа, количество', JSON.stringify([r.page, r.format, r.quantity]));
ok(r.contact_name === 'Анна' && r.contact_phone === '+79171234567' && r.contact_telegram === null, 'контакт приведён к +7XXXXXXXXXX', r.contact_phone);
ok(r.city_name === 'Набережные Челны' && r.city_region === 'Республика Татарстан' && r.city_fias_id && r.city_in_directory === '1', 'город из справочника с кодом ФИАС', JSON.stringify([r.city_name, r.city_region, r.city_fias_id]));
ok(r.event_date === '2026-12-20' && r.age === '10–12 лет' && r.estimate_amount === '24900', 'дата, возраст, бюджет калькулятора', JSON.stringify([r.event_date, r.age, r.estimate_amount]));
ok(r.consent_pd === '1' && r.consent_version === 'pcb-2026-10-11' && r.consent_at, 'согласие: факт, версия, время');
ok(r.utm_source === 'vk' && r.utm_medium === 'cpc' && r.utm_campaign === 'autumn', 'UTM-метки', JSON.stringify([r.utm_source, r.utm_medium, r.utm_campaign]));
ok(/^[0-9a-f]{64}$/.test(r.ip_hash || '') && r.status === 'new' && r.notified_at, 'хеш IP, статус new, уведомление отмечено');
const tgNew = tg().slice(tg0);
ok(/мастер-класс на праздник/.test(tgNew) && /Набережные Челны/.test(tgNew) && /24\s900\s₽/.test(tgNew), 'Telegram: формат, город, бюджет', tgNew.slice(0, 300));
ok(!/Анна|917|123-45-67|900 000|Позвоните/.test(tgNew) && /в дашборде/.test(tgNew), 'Telegram: без имени, телефона и комментария, ссылка на дашборд');
const mailNew = mail().slice(mail0);
ok(/To: pcb@teachnet\.ru/i.test(mailNew) || /pcb@teachnet\.ru/.test(mailNew), 'письмо ушло на pcb@teachnet.ru');
ok(/Анна/.test(Buffer.from(mailNew).toString()) || /=\?UTF-8\?B\?/.test(mailNew), 'письмо с полной заявкой', mailNew.slice(0, 200));
ok(p.errors.length === 0, 'нет ошибок в консоли', p.errors.join(' | '));

console.log('— /pcb/: тираж, примерка, компания; источник визита сохраняется между страницами');
resetLimits();
p = await open('/holiday/?utm_source=telegram&utm_campaign=channel');
await p.goto(BASE + '/pcb/', { waitUntil: 'networkidle' });
await p.fill('#brand-name', 'Ромашка');
await p.setInputFiles('#tryon-file', LOGO); await p.waitForTimeout(400);
await p.check('input[name="tryon-board"][value="black"]', { force: true });
await p.click('[data-tryon-side="back"]'); await p.fill('#tryon-qr', 'https://romashka.ru');
await p.click('#tryon-discuss'); await p.waitForTimeout(200);
await p.selectOption('#quantity', '300');
await p.selectOption('#badge-size', 'L');
await p.selectOption('#light-mode', 'blink');
await p.fill('#company', 'ООО «Ромашка»');
await p.fill('#city', 'Kazan'); await p.locator('#city').blur(); await p.waitForTimeout(300);
await fillContact(p, 'Олег', '@oleg_romashka');
await p.check('#lead-consent');
await submitAndWait(p);
ok(await p.locator('#request-sent').isVisible(), '«Заявка отправлена»');
id = lastId(); r = row(id);
ok(r.page === 'pcb' && r.format === 'merch' && r.quantity === '300' && r.design === 'new', 'в базе: формат, тираж, оформление', JSON.stringify([r.format, r.quantity, r.design]));
ok(r.contact_telegram === '@oleg_romashka' && r.contact_phone === null && r.company === 'ООО «Ромашка»' && r.badge_text === 'Ромашка', 'Telegram-контакт, компания, название для значка');
const tj = JSON.parse(r.tryon || '{}');
ok(tj.board === 'black' && tj.logo === true && tj.qr === 'https://romashka.ru' && /плата/.test(tj.text || ''), 'параметры примерки в JSON', r.tryon);
ok(/^Примерка на сайте:/.test(r.comment || ''), '«Обсудить этот значок» дописал примерку в комментарий');
ok(r.utm_source === 'telegram' && r.utm_campaign === 'channel', 'UTM с первой страницы визита сохранились', JSON.stringify([r.utm_source, r.utm_campaign]));
ok(r.size_class === 'L' && r.light_mode === 'blink', 'размер L и мерцание', JSON.stringify([r.size_class, r.light_mode]));
ok(r.estimate_amount === '234000', 'бюджет: 300 × (650 + 80) + 15 000 = 234 000', r.estimate_amount);
const kazanFias = r.city_fias_id;
ok(r.city_name === 'Казань' && r.city_in_directory === '1', '«Kazan» → Казань из справочника', JSON.stringify([r.city_name, r.city_fias_id]));
ok(p.errors.length === 0, 'нет ошибок в консоли', p.errors.join(' | '));

console.log('— «казань», «Kazan», «Казань» — один код ФИАС; город не из справочника — с пометкой');
for (const city of ['казань', 'Казань', 'Хьюстон']) {
  resetLimits();
  p = await open('/holiday/');
  await p.fill('#city', city); await p.locator('#city').blur(); await p.waitForTimeout(300);
  await fillContact(p, 'Тест', '+7 900 111-22-33'); await p.check('#lead-consent');
  await submitAndWait(p);
  r = row(lastId());
  if (city === 'Хьюстон') ok(r.city_name === 'Хьюстон' && r.city_in_directory === '0' && r.city_fias_id === null, 'город не из справочника сохранён как есть, с пометкой');
  else ok(r.city_fias_id === kazanFias, `«${city}» → тот же код ФИАС`, r.city_fias_id);
}

console.log('— защита от спама (curl)');
const RESP = join(TMP, 'resp.json');
const curl = args => execSync(`curl -s -o ${RESP} -w "%{http_code}" ${args}`, { env: { ...process.env, NO_PROXY: '127.0.0.1,localhost' } }).toString();
const resp = () => readFileSync(RESP, 'utf8');
const getTok = () => JSON.parse(execSync(`curl -s ${BASE}/pcb/lead.php?token=1`, { env: { ...process.env, NO_PROXY: '127.0.0.1,localhost' } }).toString()).t;
const base = t => `-F page=holiday -F program=pcb -F quantity=10 -F name=Бот -F contact=+79001112233 -F consent=1 -F token=${t}`;
resetLimits();
let n0 = lastId();
let code = curl(`${base(getTok())} -F website=http://spam.example ${BASE}/pcb/lead.php`);
ok(code === '201' && lastId() === n0, 'ловушка website → 201, в базе ничего', code);
code = curl(`${base(getTok())} ${BASE}/pcb/lead.php`);
ok(code === '201' && lastId() === n0, 'быстрее 3 секунд → 201, в базе ничего', code);
code = curl(`${base('123.abc')} ${BASE}/pcb/lead.php`);
ok(code === '400' && /устарела/.test(resp()), 'поддельная метка времени → 400', code + resp());
code = curl(`${base(getTok())} -H "Origin: https://evil.example" -H "Sec-Fetch-Site: cross-site" ${BASE}/pcb/lead.php`);
ok(code === '403', 'запрос с чужого сайта → 403', code);
const tok = getTok(); execSync('sleep 3.2');
code = curl(`-F page=holiday -F program=hack -F quantity=999 -F name=Я -F contact=12 -F token=${tok} ${BASE}/pcb/lead.php`);
const errs = JSON.parse(resp()).errors || {};
ok(code === '400' && errs.program && errs.quantity && errs.name && errs.contact && errs.consent, 'неверные поля → 400 с ошибками по каждому полю', resp());
code = curl(`-F page=holiday -F program=pcb -F quantity=10 -F name=Иван -F contact=ivan@mail.ru -F consent=1 -F token=${tok} ${BASE}/pcb/lead.php`);
ok(code === '400' && /телефон или Telegram/.test(resp()), 'почта вместо телефона → 400', resp());
resetLimits();
const codes = [];
for (let i = 0; i < 6; i++) codes.push(curl(`-F page=holiday -F program=pcb -F quantity=10 -F name=Иван -F contact=+7900111223${i} -F consent=1 -F token=${tok} ${BASE}/pcb/lead.php`));
ok(codes.slice(0, 5).every(c => c === '201') && codes[5] === '429', '6-я заявка за 10 минут с одного IP → 429', codes.join(','));

console.log('— Telegram недоступен: заявка в базе, уведомление дойдёт позже');
resetLimits();
writeFileSync(TGMODE, 'down');
p = await open('/pcb/');
await fillContact(p, 'Мария', '89170000001'); await p.check('#lead-consent');
await submitAndWait(p);
const downId = lastId();
ok(await p.locator('#request-sent').isVisible() && row(downId).notified_at === null && row(downId).notify_attempts === '1', 'посетитель видит «отправлено», в базе без отметки уведомления');
writeFileSync(TGMODE, 'ok');
const tgBefore = tg().length;
p = await open('/holiday/');
await fillContact(p, 'Пётр', '89170000002'); await p.check('#lead-consent');
await submitAndWait(p);
ok(row(downId).notified_at !== null && (tg().slice(tgBefore).match(/Заявка №/g) || []).length === 2, 'со следующей заявкой дослали и пропущенное уведомление');

console.log('— сервер недоступен: готовый текст для письма или Telegram');
resetLimits();
renameSync(`${WEBROOT}/pcb/lead.php`, `${WEBROOT}/pcb/lead.php.off`);
try {
  p = await open('/holiday/');
  await fillContact(p, 'Ирина', '+7 917 555-44-33'); await p.check('#lead-consent');
  await submitAndWait(p);
  const brief = await p.locator('#brief-text').textContent();
  ok(await p.locator('#request-result').isVisible() && /Ирина, \+7 917 555-44-33/.test(brief), 'показан готовый текст с контактом');
  ok((await p.getAttribute('#email-brief', 'href')).startsWith('mailto:pcb@teachnet.ru') && await p.locator('#copy-brief').isVisible(), 'кнопки «Открыть письмо» (pcb@) и «Скопировать текст»');
  ok(await p.locator('#request-form').isVisible(), 'форма остаётся — можно попробовать ещё раз');
} finally { renameSync(`${WEBROOT}/pcb/lead.php.off`, `${WEBROOT}/pcb/lead.php`); }

console.log('— база недоступна: заявка уходит письмом, в Telegram — предупреждение');
resetLimits();
const cfgText = readFileSync(CFG, 'utf8');
writeFileSync(CFG, cfgText.replace("'db_name' => 'teachnet'", "'db_name' => 'nope_db'"));
try {
  const m0 = mail().length, t1 = tg().length;
  p = await open('/pcb/');
  await fillContact(p, 'Глеб', '+7 917 777-66-55'); await p.check('#lead-consent');
  await submitAndWait(p);
  ok(await p.locator('#request-sent').isVisible(), 'посетитель видит «отправлено» (заявка ушла письмом)');
  ok(mail().length > m0 && /не записалась в базу/.test(tg().slice(t1)), 'письмо ушло, в Telegram — предупреждение');
} finally { writeFileSync(CFG, cfgText); execSync('sleep 3'); }   // opcache перечитывает файлы раз в 2 секунды

console.log('— телефон 390: форма без прокрутки вбок');
resetLimits();
p = await open('/holiday/', 390);
const hs = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
ok(hs <= 0, 'нет горизонтальной прокрутки', hs);
await p.locator('#request').scrollIntoViewIfNeeded();
console.log(`\n${pass} ✓, ${fail} ✗`);
await b.close();
process.exit(fail ? 1 : 0);
