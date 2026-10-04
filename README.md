# TEACHNET — лендинг

Одностраничный продающий лендинг школы инженерии и робототехники TEACHNET (Казань).
Стек: **Vite + ванильный TypeScript + Tailwind CSS**, без React. Результат `npm run build` —
полностью статичная папка `dist/`, готовая к заливке на любой хостинг (нужен PHP только для формы).

## Команды

```bash
npm install            # установка (см. примечание про кэш ниже)
npm run dev            # дев-сервер (http://localhost:5173)
npm run build          # прод-сборка в dist/
npm run preview        # локальный предпросмотр dist/
npm run assets         # перегенерировать логотипы, favicon, OG и плейсхолдеры
```

> Если `npm install` падает с `EACCES ... ~/.npm/_cacache` — кэш содержит root-файлы.
> Обход: `npm install --cache /tmp/tn-npm-cache` (уже прописано в `.npmrc`).

## Структура

```
src/
  sections/    — по модулю на блок (hero, trust, … final, footer)
  components/  — button, form, accordion, sticky-bar, cookie-banner
  lib/         — icons, site (контакты/ссылки), metrika, nav, header, reveal
  styles/      — tokens.css (CSS-переменные из дизайн-ТЗ), base.css, components.css, main.css
  page.ts      — сборка страницы из секций (встраивается в index.html на этапе сборки)
  main.ts      — клиентское поведение
public/
  fonts/       — Onest + Golos Text (woff2, локально, без CDN)
  images/      — логотипы + серые плейсхолдеры фото (заменить реальными)
  send.php     — приём формы → Telegram
scripts/       — генерация логотипов и плейсхолдеров
```

Контент рендерится **статически** на этапе сборки (важно для SEO и LCP), клиентский JS
(~2.5 КБ gzip) только навешивает поведение.

## ⚠️ Что нужно заполнить перед публикацией

| Где | Что |
|---|---|
| `send_config.php` — на сервере, **выше веб-корня** (не в репозитории и не в `public/`) | `bot_token`, `chat_id`, `db_host`, `db_name`, `db_user`, `db_pass`, `email_to`; по желанию `mail_from` (отправитель писем, по умолчанию `no-reply@teachnet.ru`). Секреты в `public/send.php` не вписывать: файл публичный и лежит в git |
| `dash_config.php` — там же, рядом с `send_config.php` | `metrika_token`, `counter_id`, `password` (или `password_hash` — хеш из `password_hash()`), `token_issued` |
| `src/lib/site.ts` | `legal.*` — URL документов (политика, согласие, cookie); `social.vk`, `social.telegram` — ссылки соцсетей (чат поддержки уже задан) |
| `src/components/form.ts` | срок перезвона (блок 9, плейсхолдер `[···]`) |
| `src/sections/faq.ts` | ответ «Если пропустили занятие?» (пока ответа нет, вопрос на странице скрыт) |
| `src/sections/team.ts` | имена и роли преподавателей |
| `public/images/` | положить реальные фото — см. раздел «Фото» ниже |

Все плейсхолдеры в коде помечены `// TODO` / `<!-- TODO -->`. Найти разом:
```bash
grep -rn "TODO" src public/send.php index.html
```

## 📸 Фото (куда класть и как называть)

Все картинки лежат в **`public/images/`**. Серые SVG-прямоугольники там — это
заглушки. Чтобы поставить настоящее фото, **положите рядом файл с тем же именем,
но в растровом формате** (`.webp` / `.jpg` / `.jpeg` / `.png`). Менять код не нужно:
при сборке ссылка `имя.svg` автоматически заменится на `имя.<ваш-формат>`
(растровый файл всегда в приоритете над заглушкой; если нескольких форматов —
берётся `.webp`, затем `.jpg`, `.jpeg`, `.png`). Удалять старый `.svg` не обязательно.

Загружать можно прямо через GitHub (**Add file → Upload files** в папку
`public/images/`) — подстановка произойдёт в CI при сборке.

| Имя файла | Где на странице | Рекомендуемый размер (пропорции) |
|---|---|---|
| `hero` | Первый экран, главное фото | 1280×760, горизонт (16:9) |
| `passport` | Блок «Паспорт инженера» | 1040×800, горизонт (13:10) |
| `comics` | Блок «Паспорт инженера», комиксы | 1040×800, горизонт (13:10) |
| `team-1`, `team-2`, `team-3` | Блок «Команда», 3 фото | 800×1000, **вертикаль** (4:5) |
| `final-1`, `final-2`, `mission` | Финальный блок, лента из 3 фото | ~900×700, горизонт (4:3) |

> Пример: чтобы заменить фото первого экрана, загрузите `public/images/hero.jpg`
> (или `hero.webp`). Фото обрезаются по центру под нужные пропорции (`object-fit: cover`),
> поэтому держите ключевой объект ближе к центру кадра.

**Логотипы партнёров** (блок «Нас поддерживают») — тоже заглушки, заменяются так же.
Имена: `logo-edu`, `logo-youth-ministry`, `logo-fsi`, `logo-itpark`, `logo-youth-committee`
(360×200, на странице обесцвечиваются в монохром; лучше PNG с прозрачным фоном или SVG).

Логотип самой школы (`logo-dark.svg`, `logo-white.svg`), favicon и OG-картинка —
**не заглушки**, они генерируются из `logo-full.svg` командой `npm run assets`, трогать не нужно.

## Деплой превью на GitHub Pages

В репозитории уже есть workflow `.github/workflows/deploy.yml` — он на каждый push в `main`
собирает сайт и публикует на Pages. `base` подставляется автоматически из имени репозитория,
поэтому ассеты грузятся по пути `/<repo>/`.

1. Создать репозиторий на GitHub и запушить:
   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. На GitHub: **Settings → Pages → Build and deployment → Source: `GitHub Actions`**
   (ветку выбирать не нужно — деплой идёт из workflow).
3. После завершения экшена сайт будет на `https://<username>.github.io/<repo>/`
   (ссылка также появится во вкладке **Actions** в job `deploy` и в Settings → Pages).

> Форма на Pages не отправляет заявки — это статический хостинг без PHP. Превью визуальное;
> рабочая форма (`send.php` → Telegram) поднимется на хостинге с PHP.

## Качество (проверено)

- Lighthouse mobile: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**
- LCP 1.5 c, CLS 0.018, TBT 0 мс. Вес `dist/` ≈ 468 КБ.
- Тексты — дословно из `teachnet-landing-copy-final.md`. Дизайн — по `teachnet-landing-design-tz.md`.
