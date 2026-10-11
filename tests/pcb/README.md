# Тесты направления «Мастер-классы и значки» (/holiday/, /pcb/, вкладка в /dash)

Сквозные проверки из раздела 7 ТЗ (`docs/pcb/tz-claude-code.md`) на локальном стенде, похожем на хостинг reg.ru.
В сборку сайта не попадают (деплоится только `dist/`).

| Файл | Что проверяет |
|---|---|
| `leads.e2e.mjs` | заявки с обеих страниц до базы, Telegram (без контактов) и почты; согласие и контакт обязательны, ошибки у полей; ловушка `website`; «не быстрее 3 секунд»; 6-я заявка за 10 минут с одного IP → 429; запрос с чужого сайта → 403; «казань», «Kazan», «Казань» → один `city_fias_id`, город не из справочника — с пометкой; UTM сохраняются между страницами; Telegram недоступен — уведомление дойдёт со следующей заявкой; обработчик недоступен — готовый текст для письма и Telegram; база недоступна — заявка уходит письмом |
| `dash.e2e.mjs` | вкладка «Значки и мастер-классы» в `/dash`: блоки, смена статуса, сумма сделки и заметка, контакт по клику, фильтры, телефон 390 px; школьная вкладка — те же блоки без ошибок; нет нарушений CSP. С `PCB_METRIKA_COUNTER` — ещё блок Метрики |
| `pdf.e2e.mjs` + `check_pdf.py` | PDF «значок в натуральную величину»: все формы и размеры, нет сетевых запросов при создании, кнопка «Готовим PDF…»; затем A4, габариты плат ±0,2 мм, контур карты и отрезок 50 мм, русский текст, QR из PDF в 300 dpi считывается, файл ≤ 3 МБ |
| `tg-mock.php` | заглушка Telegram Bot API |

## Стенд

1. Apache 2.4 + PHP 8 (mod_rewrite, mod_headers, `AllowOverride All`), корень сайта — копия `dist/` после `npm run build`.
2. MariaDB с базой и пользователем (права на создание таблиц: `pcb_leads` создаётся сама).
3. Выше корня сайта — `send_config.php` и `dash_config.php`, как на хостинге (шаблоны — в `public/send.php` и `public/dash/lib.php`), плюс:
   - в `send_config.php`: `'tg_api' => 'http://127.0.0.1:8097'` — уведомления уходят в заглушку;
   - `sendmail_path` PHP — скрипт, который дописывает письмо в файл (`PCB_MAIL_LOG`).
4. Заглушка Telegram: `TG_MOCK_DIR=/srv/apstand/tg php -S 127.0.0.1:8097 tests/pcb/tg-mock.php`.
5. Playwright с Chromium.

## Запуск

```bash
export PCB_BASE=http://127.0.0.1:8086           # адрес стенда
export PCB_WEBROOT=/srv/apstand/www             # корень сайта стенда
export PCB_SEND_CONFIG=/srv/apstand/send_config.php
export PCB_STATE_DIR=/srv/apstand/tn_state/pcb  # счётчики лимитов lead.php (рядом с send_config.php)
export PCB_MAIL_LOG=/srv/apstand/mail.log
export PCB_TG_LOG=/srv/apstand/tg/tg.log PCB_TG_MODE=/srv/apstand/tg/mode
export PCB_DB="mariadb --default-character-set=utf8mb4 -u root -N -B teachnet"
node tests/pcb/leads.e2e.mjs        # ВНИМАНИЕ: пересоздаёт таблицу pcb_leads — только на стенде

export PCB_DASH_PASSWORD=…           # пароль дашборда СТЕНДА
export PCB_DASH_CONFIG=/srv/apstand/dash_config.php
node tests/pcb/dash.e2e.mjs
```

PDF: `PCB_PDF_OUT=/tmp/pcb-pdf node tests/pcb/pdf.e2e.mjs && python3 tests/pcb/check_pdf.py /tmp/pcb-pdf` (нужны `pymupdf` и `opencv-python-headless`).

Если Playwright установлен не в проекте — `PLAYWRIGHT=/путь/к/playwright/index.mjs`.
Тесты временно меняют `send_config.php` / `dash_config.php` стенда и переименовывают `lead.php` — и возвращают всё обратно.
