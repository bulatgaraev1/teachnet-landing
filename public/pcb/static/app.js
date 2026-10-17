(() => {
  'use strict';
  const form = document.querySelector('#request-form');
  const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const byId = id => document.getElementById(id);
  const isBusiness = form?.dataset.kind === 'business';
  const prices = {10:14900,20:24900,40:39900};
  let latest = null;
  const brandInput = byId('brand-name');
  brandInput?.addEventListener('input', () => {
    const value = brandInput.value.trim();
    byId('brand-preview').textContent = value || 'ВАШ БРЕНД';
    byId('brand-preview').style.fontSize = value.length > 15 ? '20px' : '';
    if(form) invalidateResult();
  });
  if (!form) return;

  function quantityOptions() {
    const value = byId('format')?.value;
    const old = byId('quantity').value;
    const options = value === 'corporate' ? [['20','20 участников'],['30','30 участников'],['60','60 участников'],['custom','Другое количество']] : value === 'stand' ? [['50','До 50 гостей'],['100','50–100 гостей'],['custom','Больше 100 гостей']] : [['100','100 значков'],['300','300 значков'],['500','500 значков'],['1000','1000 значков'],['custom','Другой тираж']];
    byId('custom-quantity').placeholder = value === 'corporate' ? 'Например, 250' : value === 'stand' ? 'Например, 400' : 'Например, 2000';
    byId('quantity').replaceChildren(...options.map(([value,label]) => new Option(label,value)));
    if(options.some(x => x[0] === old)) byId('quantity').value = old;
    byId('quantity-label').textContent = value === 'corporate' ? 'Количество участников' : value === 'stand' ? 'Ожидаемый поток гостей' : 'Тираж';
    const opts = value === 'corporate' || value === 'stand' ? [['new','С нашим брендом'],['standard','Дизайн TEACHNET'],['custom','Новая форма или электроника']] : [['new','Новый брендированный значок'],['repeat','Повтор согласованного дизайна'],['custom','Новая форма или электроника']];
    byId('design').replaceChildren(...opts.map(([v,label]) => new Option(label,v)));
  }
  function toggleBadgeFields() {
    const merch = !isBusiness || byId('format').value === 'merch';
    ['badge-size','light-mode'].forEach(id => { const el = byId(id); if(el) el.closest('.field').hidden = !merch; });
  }
  function calculate() {
    if(isBusiness) toggleBadgeFields();
    const qty = byId('quantity').value;
    let amount = null, description = '', label = '', detail = '';
    const city = byId('city').value.trim();
    const local = !city || city.toLowerCase() === 'казань';
    const n = qty === 'custom' ? Math.round(Number(byId('custom-quantity').value) || 0) : Number(qty);
    let approx = qty === 'custom';
    if (isBusiness) {
      const format = byId('format').value, design = byId('design').value;
      label = format === 'merch' ? 'Готовый тираж значков' : format === 'stand' ? 'Зона сборки на стенде' : 'Корпоративный мастер-класс';
      if(format === 'stand') {
        description = 'Посчитаем по часам работы зоны, потоку гостей и тиражу. Анкета гостей ваша, контакты сразу остаются у вас.';
      } else if(design === 'custom') {
        description = 'Новую форму или электронику посчитаем отдельно по макету.';
      } else if(format === 'merch') {
        // Сетка цен: размер × тираж + надбавка за мерцание; бегущий огонь — по запросу
        const TIERS = [100, 300, 500, 1000];
        const RATES = {S:[600,450,400,370], M:[650,500,450,400], L:[850,650,600,550]};
        const MODE_ADD = {static:[0,0,0,0], blink:[100,80,70,60]};
        const MODE_LABEL = {blink:'мерцание', chase:'бегущий огонь'};
        const size = byId('badge-size') ? byId('badge-size').value : 'M', mode = byId('light-mode') ? byId('light-mode').value : 'static';
        if(mode === 'chase') {
          description = 'Бегущий огонь посчитаем отдельно: схема зависит от формы и числа светодиодов.';
        } else if(n >= 100 && n <= 5000) {
          let t = 0; TIERS.forEach((v, i) => { if(n >= v) t = i; });
          const rate = RATES[size][t] + MODE_ADD[mode][t], prep = design === 'repeat' ? 0 : 15000;
          amount = n * rate + prep;
          detail = `${n} значков ${size}${mode !== 'static' ? ', '+MODE_LABEL[mode] : ''} × ${money(rate)}${prep ? ' + '+money(prep)+' разработка платы под логотип' : ' · повтор без изменений'}`;
          description = detail + '. Доставка отдельно.';
        } else description = n > 5000 ? 'Большой тираж посчитаем отдельно: цена за значок будет ниже.' : 'Тираж меньше 100 штук посчитаем отдельно.';
      } else {
        // Корпоративный мастер-класс: 24 900 ₽ за 20 участников, дальше примерно 1 000 ₽ за человека (предварительно)
        if(n >= 1 && n <= 300) {
          const program = Math.max(24900, Math.round((24900 + (n - 20) * 1000) / 1000) * 1000 - 100);
          const sessions = Math.ceil(n / 30), brand = design === 'new' ? 15000 : 0;
          amount = program + brand;
          detail = `${money(program)} программа${brand ? ' + 15 000 ₽ разработка платы под логотип' : ' с готовым дизайном TEACHNET'}`;
          description = detail + `. ${sessions === 1 ? 'Один сеанс' : sessions + ' ' + (sessions < 5 ? 'сеанса' : 'сеансов')} до 30 человек, по 60–80 минут, один ведущий на пятерых.`;
        } else description = 'Большую группу посчитаем отдельно: сеансы можно развести по дням или запустить по кругу на событии.';
      }
    } else {
      const program = byId('program').value;
      label = byId('program').selectedOptions[0].textContent;
      if(program === 'pcb' && n >= 1 && n <= 120) {
        // 10 — 14 900, 20 — 24 900, 40 — 39 900; между ними и дальше ориентир по участникам
        const pts = [[10,14900],[20,24900],[40,39900]];
        let v;
        if(prices[n]) v = prices[n];
        else if(n <= 10) v = 14900;
        else if(n <= 20) v = 14900 + (n - 10) * 1000;
        else if(n <= 40) v = 24900 + (n - 20) * 750;
        else v = 39900 + (n - 40) * 950;
        amount = prices[n] ? v : Math.round((v + 100) / 1000) * 1000 - 100;
        approx = !prices[n];
        const sessions = Math.ceil(n / 30);
        detail = `${n} участников · ${sessions === 1 ? 'один сеанс 60–80 минут' : sessions+' сеанса подряд по 60–80 минут'}`;
        description = detail + '. Материалы, оборудование и работа ведущих включены.';
      } else description = program === 'pcb' ? 'Большую группу посчитаем отдельно.' : 'Подберём программу, длительность и стоимость по возрасту и составу группы.';
    }
    if(!local && (!isBusiness || byId('format').value !== 'merch')) description += ' Поездка из Казани — отдельно.';
    byId('estimate-value').textContent = amount === null ? 'Индивидуальный расчёт' : (approx ? '≈ ' : '') + money(amount);
    byId('estimate-value').classList.toggle('is-custom',amount === null);
    byId('estimate-description').textContent = description;
    byId('custom-quantity-field').hidden = qty !== 'custom';
    byId('custom-quantity').required = qty === 'custom';
    byId('custom-quantity').disabled = qty !== 'custom';
    latest = {amount,description,label,detail};
  }
  function invalidateResult() {
    byId('request-result').hidden = true;
    byId('copy-status').textContent = '';
  }
  function update() { calculate(); invalidateResult(); }
  form.addEventListener('input',update);
  form.addEventListener('change',e => {
    if(e.target.id === 'format') quantityOptions();
    update();
  });
  document.querySelectorAll('[data-party-quantity]').forEach(link => link.addEventListener('click',() => {
    byId('program').value = 'pcb';
    byId('quantity').value = link.dataset.partyQuantity;
    update();
  }));
  document.querySelectorAll('[data-party-program]').forEach(link => link.addEventListener('click',() => {
    byId('program').value = 'younger';
    update();
  }));
  document.querySelectorAll('[data-select-format]').forEach(link => link.addEventListener('click',() => {
    byId('format').value = link.dataset.selectFormat;
    quantityOptions();
    update();
  }));
  // Текст обращения: в письмо или Telegram, если заявка не ушла на сервер (запасной путь)
  function brief() {
    const qty = byId('quantity').value === 'custom' ? byId('custom-quantity').value : byId('quantity').selectedOptions[0].textContent;
    const date = byId('date').value ? byId('date').value.split('-').reverse().join('.') : 'Пока не определились';
    const lines = ['Здравствуйте, TEACHNET!','',`Интересует: ${latest.label}.`,`Количество: ${qty}.`,`Город: ${(window.teachnetCityLabel ? window.teachnetCityLabel() : byId('city').value.trim()) || 'Уточним'}.`,`Дата: ${date}.`];
    if(isBusiness){
      const company = byId('company').value.trim();
      if(company) lines.push(`Компания: ${company}.`);
      lines.push(`Оформление: ${byId('design').selectedOptions[0].textContent}.`);
      if(byId('badge-size') && byId('format').value === 'merch') lines.push(`Размер: ${byId('badge-size').selectedOptions[0].textContent}.`);
      if(byId('light-mode') && byId('format').value === 'merch') lines.push(`Свет: ${byId('light-mode').selectedOptions[0].textContent}.`);
      if(byId('design').value !== 'standard' && brandInput?.value.trim()) lines.push(`Название для значка: ${brandInput.value.trim()}.`);
    } else if(byId('age').value.trim()) lines.push(`Возраст участников: ${byId('age').value.trim()}.`);
    if(latest.amount !== null) lines.push(`Ориентир на сайте: ${money(latest.amount)}.`,latest.description);
    else lines.push('Нужен индивидуальный расчёт.');
    if(byId('comment').value.trim()) lines.push('',`Дополнительно: ${byId('comment').value.trim()}`);
    const who = [byId('lead-name').value.trim(), byId('lead-contact').value.trim()].filter(Boolean).join(', ');
    if(who) lines.push('',`Как связаться: ${who}.`);
    lines.push('','Подскажите возможность проведения или изготовления, итоговую стоимость и условия заказа.');
    return lines.join('\n');
  }
  function showBrief(text) {
    const body = brief();
    byId('brief-text').textContent = body;
    byId('email-brief').href = 'mailto:pcb@teachnet.ru?subject='+encodeURIComponent('TEACHNET — '+latest.label)+'&body='+encodeURIComponent(body);
    byId('result-text').textContent = text;
    byId('request-result').hidden = false;
    byId('result-title').focus({preventScroll:true});
    byId('request-result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'nearest'});
  }

  // ── Отправка заявки (этап 2): /pcb/lead.php, без перезагрузки страницы ──
  const API = '/pcb/lead.php';
  const SRC_KEY = 'tn-pcb-src';
  const UTM = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  // Источник визита: UTM-метки и адрес, с которого пришли, — запоминаем при входе (на время вкладки)
  const source = (() => {
    try {
      const q = new URLSearchParams(location.search);
      let saved = JSON.parse(sessionStorage.getItem(SRC_KEY) || 'null');
      if(UTM.some(k => q.get(k)) || !saved) {
        let ref = '';
        try { ref = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : ''; } catch { ref = ''; }
        saved = { referrer: (ref || saved?.referrer || '').slice(0,512) };
        UTM.forEach(k => { saved[k] = (q.get(k) || '').slice(0,255); });
        sessionStorage.setItem(SRC_KEY, JSON.stringify(saved));
      }
      return saved || {};
    } catch { return {}; }
  })();
  // Метка времени открытия страницы от сервера: заявку быстрее 3 секунд сервер считает ботом
  let token = null;
  function getToken() {
    return fetch(API + '?token=1', { credentials:'same-origin', headers:{ Accept:'application/json' } })
      .then(r => { if(r.ok) return r.json(); r.body?.cancel(); throw new Error('token'); })   // тело ошибки не читаем — отпускаем соединение
      .then(j => { token = { t:j.t, at:Date.now() }; return token; });
  }
  getToken().catch(() => {});

  const contactInput = byId('lead-contact');
  function contactProblem(v) {
    v = v.trim();
    if(!v) return '';
    if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Нужен телефон или Telegram. Почту можно написать в комментарии.';
    if(/^(?:@|(?:https?:\/\/)?(?:t\.me|telegram\.me)\/)?[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(v)) return '';
    const d = v.replace(/\D/g,'');
    if(/^\+?[\d\s().-]{7,25}$/.test(v) && ((d.length === 11 && /^[78]/.test(d)) || (d.length === 10 && d[0] === '9') || (v[0] === '+' && d.length >= 10 && d.length <= 15))) return '';
    return 'Похоже на опечатку. Телефон — например, +7 917 123-45-67, Telegram — @имя.';
  }
  contactInput.addEventListener('input', () => { contactInput.setCustomValidity(''); clearError(contactInput); });

  function clearError(input) {
    const f = input.closest('.field, .consent');
    if(!f) return;
    f.classList.remove('is-invalid');
    f.querySelector('.field-error')?.remove();
  }
  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(n => n.remove());
    form.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid'));
    byId('form-error').hidden = true;
  }
  // Ошибки с сервера — рядом с полями; поле, которого нет на странице, — общей строкой над кнопкой
  function showErrors(errors) {
    let first = null, rest = [];
    Object.keys(errors).forEach(name => {
      const input = name === 'form' ? null : form.querySelector(`[name="${name}"]`);
      const box = input?.closest('.field, .consent');
      if(!box) { rest.push(errors[name]); return; }
      box.classList.add('is-invalid');
      const msg = document.createElement('small');
      msg.className = 'field-error';
      msg.textContent = errors[name];
      box.appendChild(msg);
      if(!first) first = input;
    });
    if(rest.length) { byId('form-error').textContent = rest.join(' '); byId('form-error').hidden = false; }
    if(first) { first.closest('details')?.setAttribute('open',''); first.focus(); }
  }
  form.addEventListener('input', e => { if(e.target.name) clearError(e.target); });

  const submitBtn = form.querySelector('.submit-button');
  const submitHtml = submitBtn.innerHTML;
  function busy(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-sending', on);
    if(on) submitBtn.textContent = 'Отправляем…'; else submitBtn.innerHTML = submitHtml;
  }
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

  function payload() {
    const fd = new FormData(form);
    fd.set('page', isBusiness ? 'pcb' : 'holiday');
    fd.set('token', token.t);
    fd.set('estimate_amount', latest.amount === null ? '' : String(latest.amount));
    fd.set('estimate_label', (latest.detail || latest.description || '').slice(0,200));
    if(isBusiness && brandInput) fd.set('brand', brandInput.value.trim());
    const tryon = window.teachnetTryon;
    if(isBusiness && tryon && tryon.used()) fd.set('tryon', JSON.stringify(tryon.summary()));
    UTM.concat('referrer').forEach(k => { if(source[k]) fd.set(k, source[k]); });
    return fd;
  }
  async function send(retried) {
    if(!token || Date.now() - token.at > 12 * 3600 * 1000) await getToken();
    await wait(3500 - (Date.now() - token.at));            // не быстрее 3 секунд с метки времени
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(API, { method:'POST', body:payload(), credentials:'same-origin', headers:{ Accept:'application/json' }, signal:ctrl.signal });
      const j = await r.json().catch(() => ({}));
      if(r.status === 400 && j.errors?.form && !retried) { await getToken(); return send(true); }   // страница устарела — новая метка и ещё раз
      return { status:r.status, data:j };
    } finally { clearTimeout(timer); }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if(submitBtn.disabled) return;
    clearErrors();
    contactInput.setCustomValidity(contactProblem(contactInput.value));
    if(!form.reportValidity()) return;
    calculate();
    invalidateResult();
    busy(true);
    let res = null;
    try { res = await send(false); } catch { res = null; }
    busy(false);
    if(res && res.status === 201 && res.data.ok) {
      form.hidden = true;
      byId('request-sent').hidden = false;
      byId('sent-title').focus({preventScroll:true});
      byId('request-sent').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'nearest'});
      return;
    }
    if(res && res.status === 400 && res.data.errors && !res.data.errors.form) { showErrors(res.data.errors); return; }
    // сервер не ответил, вернул ошибку или ограничил частоту — заявка не теряется: готовый текст для письма или Telegram
    showBrief(res && res.status === 429
      ? 'С вашего адреса уже ушло несколько заявок подряд. Отправьте эту письмом или в Telegram — текст уже готов.'
      : 'Отправьте её письмом или в Telegram — текст уже готов.');
  });
  const tgBrief = byId('tg-brief');
  tgBrief?.addEventListener('click', () => {
    navigator.clipboard?.writeText(byId('brief-text').textContent).then(
      () => { byId('copy-status').textContent = 'Текст скопирован. Вставьте его в чат TEACHNET и отправьте.'; },
      () => { byId('copy-status').textContent = 'Скопируйте текст выше и отправьте его в чат TEACHNET.'; });
  });
  byId('copy-brief').addEventListener('click',async () => {
    try {
      await navigator.clipboard.writeText(byId('brief-text').textContent);
      byId('copy-status').textContent = 'Текст скопирован. Откройте Telegram и отправьте его в чат TEACHNET.';
    } catch {
      const range = document.createRange();range.selectNodeContents(byId('brief-text'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      byId('copy-status').textContent = 'Выделили текст — скопируйте его вручную или откройте письмо.';
    }
  });
  if(isBusiness) quantityOptions();
  calculate();
})();
