// Вкладка «Значки и мастер-классы» в /dash: блоки, статусы, сумма сделки, заметка, контакт по клику,
// школьная вкладка без изменений, нет нарушений CSP. С PCB_METRIKA_COUNTER — ещё и блок Метрики
// (нужна заглушка API Метрики с целями этого счётчика). Запуск и стенд — tests/pcb/README.md.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const env = (k, d) => process.env[k] || d;
const BASE = env('PCB_BASE', 'http://127.0.0.1:8086');
const PASSWORD = env('PCB_DASH_PASSWORD', '');                             // пароль дашборда СТЕНДА (не боевой)
const DCFG = env('PCB_DASH_CONFIG', '/srv/apstand/dash_config.php');
const COUNTER = env('PCB_METRIKA_COUNTER', '');
const MOCKLOG = env('PCB_METRIKA_LOG', '');
const DB = env('PCB_DB', 'mariadb --default-character-set=utf8mb4 -u root -N -B teachnet');
const sql = q => execSync(`${DB} -e ${JSON.stringify(q)}`).toString().trim();
if (!PASSWORD) { console.error('Задайте PCB_DASH_PASSWORD — пароль дашборда стенда'); process.exit(2); }
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };
const dcfg = readFileSync(DCFG, 'utf8');
const b = await chromium.launch();
async function session(w = 1440) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  p.errs = []; p.csp = [];
  await p.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  p.on('pageerror', e => p.errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console: ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400) p.errs.push(`HTTP ${r.status()} ${r.url()}`); });
  await p.goto(BASE + '/dash/');
  await p.fill('input[name=password]', PASSWORD);
  await p.click('button[type=submit]');
  await p.waitForLoadState('networkidle');
  return { ctx, p };
}
const blockErrors = p => p.evaluate(() => [...document.querySelectorAll('[data-block]')].filter(x => x.querySelector('.state--err')).map(x => x.dataset.block + ': ' + x.querySelector('.state--err').textContent.trim().slice(0, 100)));

console.log('— школьная вкладка: как раньше, плюс переключатель');
let { ctx, p } = await session();
await p.waitForTimeout(2500);
ok(await p.locator('.tabs a[aria-current="page"]').textContent() === 'Школа', 'по умолчанию — «Школа»');
const schoolBlocks = await p.evaluate(() => [...document.querySelectorAll('[data-block]')].map(x => x.dataset.block).join(','));
ok(schoolBlocks === 'insights,kpi,funnel,flow,channels,pages,behavior,audience,leads,spend,quality', 'школьные блоки на месте', schoolBlocks);
ok((await blockErrors(p)).length === 0, 'школьные блоки без ошибок', (await blockErrors(p)).join(' | '));
ok(p.errs.length === 0 && (await p.evaluate(() => window.__csp)).length === 0, 'нет ошибок и нарушений CSP', p.errs.join(' | '));

console.log('— вкладка направления без счётчика');
await p.click('.tabs a[href="./?view=pcb"]');
await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
ok(new URL(p.url()).pathname === '/dash/' && new URL(p.url()).search === '?view=pcb', 'тот же адрес /dash/, параметр view=pcb', p.url());
ok(await p.locator('.tabs a[aria-current="page"]').textContent() === 'Значки и мастер-классы', 'активна вкладка направления');
const blocks = await p.evaluate(() => [...document.querySelectorAll('[data-block]')].map(x => x.dataset.block).join(','));
ok(blocks === 'pcb_summary,pcb_leads,pcb_metrika', 'три блока направления', blocks);
ok((await blockErrors(p)).length === 0, 'блоки без ошибок', (await blockErrors(p)).join(' | '));
const total = +sql('SELECT COUNT(*) FROM pcb_leads');
const kpiLeads = await p.locator('#pcb_summary .kpi').first().locator('.kpi__value').textContent();
ok(+kpiLeads.replace(/\D/g, '') === total, 'карточка «Заявок» = число заявок в базе', kpiLeads + ' vs ' + total);
ok(/ещё не создан/.test(await p.locator('#pcb_metrika').textContent()), 'Метрика: подсказка, как подключить счётчик');
ok(await p.locator('#pcb_leads tbody tr:not(.editor)').count() >= Math.min(total, 25), 'таблица заявок заполнена');
// контакт по клику
const firstId = +sql('SELECT MAX(id) FROM pcb_leads');
const masked = await p.locator('#pcb_leads tbody tr:not(.editor) .phone').first().textContent();
ok(/\*/.test(masked), 'контакт под маской', masked);
await p.locator('#pcb_leads tbody tr:not(.editor) .phone').first().click(); await p.waitForTimeout(500);
const revealed = await p.locator('#pcb_leads tbody tr:not(.editor) .contact-links').first().textContent();
ok(/\+7\d{10}|@/.test(revealed), 'по клику — полный телефон или Telegram ссылкой', revealed);
// статус
const sel = p.locator('#pcb_leads tbody tr:not(.editor) select.st').first();
await sel.selectOption('contacted'); await p.waitForTimeout(800);
ok(sql(`SELECT status FROM pcb_leads WHERE id=${firstId}`) === 'contacted' && sql(`SELECT status_updated_at IS NOT NULL FROM pcb_leads WHERE id=${firstId}`) === '1', 'смена статуса сохраняется в базе');
// редактор: сумма и заметка
await p.locator('#pcb_leads tbody tr:not(.editor) button[title^="Изменить"]').first().click();
await p.locator('#pcb_leads tr.editor select').first().selectOption('won');
await p.fill('#pcb_leads tr.editor input[type=number]', '39900');
await p.fill('#pcb_leads tr.editor textarea', 'Макет до пятницы');
await p.click('#pcb_leads tr.editor button[type=submit]'); await p.waitForTimeout(900);
ok(sql(`SELECT CONCAT(status,'|',deal_amount,'|',note) FROM pcb_leads WHERE id=${firstId}`) === 'won|39900|Макет до пятницы', 'статус, сумма сделки и заметка сохранены');
await p.waitForTimeout(500);
ok(/39\s900/.test(await p.locator('#pcb_summary').textContent()), 'сводка пересчиталась: сумма сделок');
// подробнее
await p.locator('#pcb_leads .pcb-more').first().click();
ok(/Согласие на обработку данных/.test(await p.locator('#pcb_leads .pcb-details').first().textContent()), '«Подробнее»: комментарий, источник, согласие');
// фильтры
await p.locator('#pcb_leads select[aria-label="Страница"]').selectOption('pcb'); await p.waitForTimeout(800);
const pcbCount = +sql("SELECT COUNT(*) FROM pcb_leads WHERE page='pcb'");
ok(/Всего\s+\d+/.test(await p.locator('#pcb_leads').textContent()) && (await p.locator('#pcb_leads').textContent()).includes('Всего ' + pcbCount), 'фильтр по странице', pcbCount);
ok(p.errs.length === 0 && (await p.evaluate(() => window.__csp)).length === 0, 'нет ошибок и нарушений CSP', p.errs.join(' | '));
await ctx.close();

if (COUNTER) {
console.log('— со счётчиком направления (pcb_counter_id)');
writeFileSync(DCFG, dcfg.replace(/return \[/, "return [\n  'pcb_counter_id' => " + Number(COUNTER) + ','));
execSync('sleep 3'); // opcache перечитывает изменённые файлы раз в 2 секунды
try {
  ({ ctx, p } = await session());
  await p.goto(BASE + '/dash/?view=pcb'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);
  const m = await p.locator('#pcb_metrika').textContent();
  ok(/Визиты/.test(m) && /Отправили заявку/.test(m) && /Конверсия в заявку/.test(m), 'визиты, цели, конверсия', m.slice(0, 200));
  ok(/Цели tryon_discuss нет в счётчике/.test(m), 'цель, которой нет в счётчике, отмечена');
  ok(/Источники визитов/.test(m), 'источники визитов');
  if (MOCKLOG) {
    const reqs = readFileSync(MOCKLOG, 'utf8').split('\n').filter(l => l.includes(COUNTER));
    ok(reqs.length > 0 && !reqs.some(l => /ids=96429194/.test(l)), 'запросы только к счётчику направления', reqs.length);
  }
  ok(p.errs.length === 0, 'нет ошибок', p.errs.join(' | '));
  await ctx.close();
} finally { writeFileSync(DCFG, dcfg); }
}

console.log('— телефон 390');
({ ctx, p } = await session(390));
await p.goto(BASE + '/dash/?view=pcb'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'нет горизонтальной прокрутки');
ok(await p.locator('#pcb_leads .lcard').count() > 0, 'заявки карточками');
await ctx.close();
console.log(`\n${pass} ✓, ${fail} ✗`);
await b.close();
process.exit(fail ? 1 : 0);
