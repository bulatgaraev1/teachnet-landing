/**
 * Страница /electronics: все плейсхолдеры и ссылки в одном месте.
 * Заглушек не осталось: мессенджеры, карта и публикации заполнены реальными ссылками.
 */

export interface MessengerLink {
  /** адрес без параметров */
  base: string;
  /** имя параметра для кода источника; null, если параметр не добавлять */
  param: string | null;
}

export const EL_CONFIG = {
  /**
   * Мессенджеры в окне записи. Если param задан, к ссылке добавляется
   * param=electronics_<код источника> (сейчас только у VK: ref=electronics_<код>).
   * base: адрес без параметров. param: имя параметра (null, если добавлять не нужно).
   */
  messengers: {
    telegram: { base: 'https://t.me/teachnet_school', param: null },
    vk: { base: 'https://vk.me/teachnetru', param: 'ref' },
    max: { base: 'https://max.ru/id165505564947_biz', param: null },
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
   * Яндекс.Карты: карточка организации TEACHNET.
   * orgId: номер организации из ссылки вида https://yandex.ru/maps/org/teachnet/1234567890/
   * (открыть карточку в Яндекс.Картах, скопировать число из адреса). Пока не задан,
   * карта ищет организацию по названию и адресу (search).
   */
  map: {
    orgId: '153081578625',
    search: 'TEACHNET, Казань, улица Павлюхина, 108Б',
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
