/**
 * Единые константы сайта: бренд (строго TEACHNET, §13a), контакты, навигация,
 * ссылки на юр-документы и соцсети. '#' — плейсхолдеры, заменить на реальные URL.
 */
/** Физический адрес основного филиала: на него опираются главная, подвал и JSON-LD главной. */
const ADDRESS = {
  street: 'ул. Павлюхина, 108б',
  locality: 'Казань',
  region: 'Республика Татарстан',
  country: 'RU',
  full: 'г. Казань, ул. Павлюхина, 108б',
} as const;

export type BranchId = 'pavlyukhina' | 'mardzhani';

/** Пункт меню шапки и бургер-меню: якорь на странице и клик-цель Метрики */
export interface NavItem {
  label: string;
  href: string;
  goal: string;
}

export interface Branch {
  id: BranchId;
  /** «Казань, ул. …»: для плашек, карточек и FAQ */
  address: string;
  /** улица с номером дома: для PostalAddress в JSON-LD */
  street: string;
  /** уточнение мелким шрифтом */
  note: string;
  /** подпись в выпадающем списке «Филиал» формы заявки */
  selectLabel: string;
  /** номер организации в Яндекс.Картах (карта-виджет и ссылка на карточку) */
  orgId: string;
}

export const SITE = {
  brand: 'TEACHNET',
  city: 'Казань',
  phoneDisplay: '+7 (993) 415-14-34',
  phoneHref: 'tel:+79934151434',
  email: 'hello@teachnet.ru',
  emailHref: 'mailto:hello@teachnet.ru',
  // goal — клик-цель Метрики; одна и та же в шапке и в бургер-меню, место — параметр place
  nav: [
    { label: 'Программы', href: '#programs', goal: 'nav_programs' },
    { label: 'Цена', href: '#price', goal: 'nav_price' },
    { label: 'О нас пишут', href: '#press', goal: 'nav_press' },
    { label: 'Вопросы', href: '#faq', goal: 'nav_faq' },
  ],
  // Курсы: колонка «Курсы» в подвале (новый курс — одна строка). goal — клик-цель Метрики
  courses: [
    { label: 'Электроника, 10–15 лет', href: '/electronics', goal: 'footer_electronics' },
    { label: 'Робототехника на LEGO, 5–9 лет', href: '/#programs', goal: 'footer_robotics' },
  ],
  // Разработки: блок «Разработки TEACHNET» под курсами в подвале. goal — клик-цель Метрики
  products: [
    { label: 'Учебная плата TEACHNET UNO', href: '/tech', goal: 'footer_tech' },
  ],
  // Отдельные статические страницы (см. content/ и *.html в корне проекта)
  legal: {
    consent: '/personal-data-consent', // Согласие на обработку персональных данных
    privacy: '/privacy', // Политика конфиденциальности
    cookie: '/cookie-policy', // Политика использования cookie
  },
  social: {
    vk: 'https://vk.com/teachnetru',
    telegram: 'https://t.me/teachnet_ru',
    max: 'https://max.ru/id165505564947_biz',
    chat: 'https://t.me/teachnet_school', // чат поддержки
  },
  requisites: {
    name: 'ИП Гараев Булат Ильдарович',
    inn: '165505564947',
    ogrnip: '323169000139083',
  },
  // Физический адрес школы — единый источник правды (футер, FAQ, JSON-LD).
  address: ADDRESS,
  // Филиалы: единый список для страницы /electronics и формы заявки.
  // Значения id совпадают с белым списком в public/send.php.
  branches: [
    {
      id: 'pavlyukhina',
      address: `${ADDRESS.locality}, ${ADDRESS.street}`,
      street: ADDRESS.street,
      note: 'напротив Kazan Mall',
      selectLabel: 'ул. Павлюхина, 108б (напротив Kazan Mall)',
      orgId: '153081578625',
    },
    {
      id: 'mardzhani',
      address: 'Казань, ул. Марджани, 28',
      street: 'ул. Марджани, 28',
      note: 'Старо-Татарская слобода, набережная озера Кабан',
      selectLabel: 'ул. Марджани, 28 (Старо-Татарская слобода)',
      orgId: '160215884322',
    },
  ] as Branch[],
  year: 2026,
} as const;
