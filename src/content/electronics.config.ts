/**
 * Страница /electronics: все плейсхолдеры и ссылки в одном месте.
 * Значения в квадратных скобках нужно заменить на реальные до мёрджа в main.
 */

export interface MessengerLink {
  /** адрес без параметров */
  base: string;
  /** имя параметра для кода источника; null, если параметр не добавлять */
  param: string | null;
}

export const EL_CONFIG = {
  /**
   * Мессенджеры в окне записи. К ссылке добавляется параметр param=electronics_<код источника>.
   * base: адрес без параметров. param: имя параметра (null, если добавлять не нужно).
   */
  messengers: {
    // ПЛЕЙСХОЛДЕР: имя Telegram-бота, например https://t.me/teachnet_bot
    telegram: { base: 'https://t.me/[BOT]', param: 'start' },
    // ПЛЕЙСХОЛДЕР: короткое имя сообщества VK (на сайте сейчас vk.com/teachnetru)
    vk: { base: 'https://vk.me/[GROUP]', param: 'ref' },
    // ПЛЕЙСХОЛДЕР: ссылка MAX (на сайте в подвале сейчас https://max.ru/id165505564947_biz)
    max: { base: '[ССЫЛКА]', param: 'start' },
  } as Record<'telegram' | 'vk' | 'max', MessengerLink>,

  /** Префикс параметра источника: start=electronics_<код> */
  startPrefix: 'electronics',

  /**
   * Коды источника визита для ссылок мессенджеров. Проверяются сверху вниз:
   * 1) utm_source из списка → код строки; 2) есть yclid → yd;
   * 3) любые другие utm-метки → ref; 4) referrer поисковика → org;
   * 5) другой внешний сайт → ref; 6) иначе (прямой заход) → dir.
   */
  sourceCodes: {
    yd: { title: 'Яндекс.Директ', utmSources: ['yandex', 'yandex_direct', 'ydirect', 'direct'], yclid: true },
    vk: { title: 'Реклама VK', utmSources: ['vk', 'vkads', 'vk_ads', 'vkontakte', 'mytarget'] },
    org: {
      title: 'Поиск без меток',
      // * внутри маски = любой домен верхнего уровня (yandex.ru, yandex.kz, google.com ...)
      referrerHosts: ['yandex.*', 'ya.ru', 'google.*', 'bing.com', 'go.mail.ru', 'duckduckgo.com', 'search.yahoo.com', 'nova.rambler.ru'],
    },
    ref: { title: 'Переход с другого сайта' },
    dir: { title: 'Прямой заход' },
  },

  /**
   * Публикации в блоке «Нам доверяют». Ссылки взяты из блока «О нас пишут»
   * на главной (те же издания), проверьте перед мёрджем.
   */
  press: {
    minmol: 'https://minmol.tatarstan.ru/index.htm/news/2539647.htm',
    monrt: 'https://mon.tatarstan.ru/index.htm/news/2543500.htm',
    kai: 'https://kai.ru/news/new?id=14465643',
    tatarinform:
      'https://www.tatar-inform.ru/news/put-yunogo-inzenera-v-kazani-skolniki-sozdayut-elektrotexniku-svoimi-rukami-6035800',
  },

  /**
   * Яндекс.Карты. Поиск по адресу; если организация есть в Яндекс Бизнесе,
   * точнее заменить на ссылку с её oid.
   */
  map: {
    widget: 'https://yandex.ru/map-widget/v1/?mode=search&text=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C%2C%20%D1%83%D0%BB.%20%D0%9F%D0%B0%D0%B2%D0%BB%D1%8E%D1%85%D0%B8%D0%BD%D0%B0%2C%20108%D0%B1&z=16',
    open: 'https://yandex.ru/maps/?mode=search&text=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C%2C%20%D1%83%D0%BB.%20%D0%9F%D0%B0%D0%B2%D0%BB%D1%8E%D1%85%D0%B8%D0%BD%D0%B0%2C%20108%D0%B1&z=17',
  },

  links: {
    /** «Все направления»: блок направлений на главной */
    directions: '/#programs',
    /** Перекрёстная ссылка на робототехнику. Пока страницы нет, ведёт в блок программ главной */
    robotics: '/#programs',
  },
} as const;

export type MessengerId = keyof typeof EL_CONFIG.messengers;
export type SourceCode = keyof typeof EL_CONFIG.sourceCodes;
