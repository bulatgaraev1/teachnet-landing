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
    const options = value === 'corporate' ? [['20','20 участников'],['custom','Другое количество']] : value === 'stand' ? [['50','До 50 гостей'],['100','50–100 гостей'],['custom','Больше 100 гостей']] : [['100','100 значков'],['300','300 значков'],['custom','Другой тираж']];
    byId('quantity').replaceChildren(...options.map(([value,label]) => new Option(label,value)));
    if(options.some(x => x[0] === old)) byId('quantity').value = old;
    byId('quantity-label').textContent = value === 'corporate' ? 'Количество участников' : value === 'stand' ? 'Ожидаемый поток гостей' : 'Тираж';
    const opts = value === 'corporate' || value === 'stand' ? [['new','С нашим брендом'],['standard','Дизайн TEACHNET'],['custom','Новая форма или электроника']] : [['new','Новый брендированный значок'],['repeat','Повтор согласованного дизайна'],['custom','Новая форма или электроника']];
    byId('design').replaceChildren(...opts.map(([v,label]) => new Option(label,v)));
  }
  function calculate() {
    const qty = byId('quantity').value;
    let amount = null, description = '', label = '', detail = '';
    const city = byId('city').value.trim();
    const local = !city || city.toLowerCase() === 'казань';
    if (isBusiness) {
      const format = byId('format').value, design = byId('design').value;
      label = format === 'merch' ? 'Готовый тираж значков' : format === 'stand' ? 'Зона пайки на стенде' : 'Корпоративный мастер-класс';
      if(format === 'stand') {
        description = 'Посчитаем по часам работы зоны, потоку гостей и тиражу значков. Контакты гостей соберём анкетой с согласием на обработку данных.';
      } else if(qty !== 'custom' && design !== 'custom') {
        if(format === 'merch') {
          const units = Number(qty), rate = units === 100 ? 600 : 500;
          const prep = design === 'repeat' ? 0 : 15000;
          amount = units * rate + prep;
          detail = `${units} значков × ${money(rate)}${prep ? ' + '+money(prep)+' подготовка дизайна' : ' · без повторной подготовки дизайна'}`;
          description = detail + '. Доставка рассчитывается отдельно.';
        } else {
          amount = 24900 + (design === 'new' ? 15000 : 0);
          detail = design === 'new' ? '24 900 ₽ программа + 15 000 ₽ простая адаптация бренда' : '24 900 ₽ программа с готовым дизайном TEACHNET';
          description = detail + '. Один сеанс до 30 человек, 60–80 минут, один ведущий на пятерых.';
        }
      } else description = 'Подготовим индивидуальный расчёт по количеству, дизайну и условиям вашего заказа.';
    } else {
      const program = byId('program').value;
      label = byId('program').selectedOptions[0].textContent;
      if(program === 'pcb' && qty !== 'custom') {
        amount = prices[qty];
        const sessions = Math.ceil(Number(qty) / 30);
        detail = `${qty} участников · ${sessions === 1 ? 'один сеанс 60–80 минут' : sessions+' сеанса подряд по 60–80 минут'}`;
        description = detail + '. Материалы, оборудование и работа ведущих включены.';
      } else description = 'Подберём программу, длительность и стоимость по возрасту и составу группы.';
    }
    if(!local && (!isBusiness || byId('format').value !== 'merch')) description += ' Поездка из Казани — отдельно.';
    byId('estimate-value').textContent = amount === null ? 'Индивидуальный расчёт' : money(amount);
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
  form.addEventListener('submit', e => {
    e.preventDefault();
    if(!form.reportValidity()) return;
    calculate();
    const qty = byId('quantity').value === 'custom' ? byId('custom-quantity').value : byId('quantity').selectedOptions[0].textContent;
    const date = byId('date').value ? byId('date').value.split('-').reverse().join('.') : 'Пока не определились';
    const lines = ['Здравствуйте, TEACHNET!','',`Интересует: ${latest.label}.`,`Количество: ${qty}.`,`Город: ${(window.teachnetCityLabel ? window.teachnetCityLabel() : byId('city').value.trim()) || 'Уточним'}.`,`Дата: ${date}.`];
    if(isBusiness){
      const company = byId('company').value.trim();
      if(company) lines.push(`Компания: ${company}.`);
      lines.push(`Оформление: ${byId('design').selectedOptions[0].textContent}.`);
      if(byId('design').value !== 'standard' && brandInput?.value.trim()) lines.push(`Название для значка: ${brandInput.value.trim()}.`);
    } else if(byId('age').value.trim()) lines.push(`Возраст участников: ${byId('age').value.trim()}.`);
    if(latest.amount !== null) lines.push(`Ориентир на сайте: ${money(latest.amount)}.`,latest.description);
    else lines.push('Нужен индивидуальный расчёт.');
    if(byId('comment').value.trim()) lines.push('',`Дополнительно: ${byId('comment').value.trim()}`);
    lines.push('','Подскажите возможность проведения или изготовления, итоговую стоимость и условия заказа.');
    const body = lines.join('\n');
    byId('brief-text').textContent = body;
    byId('email-brief').href = 'mailto:pcb@teachnet.ru?subject='+encodeURIComponent('TEACHNET — '+latest.label)+'&body='+encodeURIComponent(body);
    byId('request-result').hidden = false;
    byId('result-title').focus({preventScroll:true});
    byId('request-result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'nearest'});
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
