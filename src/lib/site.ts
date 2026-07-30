/**
 * Единые константы сайта: бренд (строго TEACHNET, §13a), контакты, навигация,
 * ссылки на юр-документы и соцсети. '#' — плейсхолдеры, заменить на реальные URL.
 */
export const SITE = {
  brand: 'TEACHNET',
  city: 'Казань',
  phoneDisplay: '+7 (993) 415-14-34',
  phoneHref: 'tel:+79934151434',
  email: 'hello@teachnet.ru',
  emailHref: 'mailto:hello@teachnet.ru',
  nav: [
    { label: 'Программы', href: '#programs' },
    { label: 'Цена', href: '#price' },
    { label: 'О нас пишут', href: '#press' },
    { label: 'Вопросы', href: '#faq' },
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
    max: 'https://t.me/teachnet_ru', // TODO: заменить на реальную ссылку МАКС (пока ведёт в Telegram)
    chat: 'https://t.me/teachnet_school', // чат поддержки
  },
  requisites: {
    name: 'ИП Гараев Булат Ильдарович',
    inn: '165505564947',
    ogrnip: '323169000139083',
  },
  // Физический адрес школы — единый источник правды (футер, FAQ, JSON-LD).
  address: {
    street: 'ул. Павлюхина, 108б',
    locality: 'Казань',
    region: 'Республика Татарстан',
    country: 'RU',
    full: 'г. Казань, ул. Павлюхина, 108б',
  },
  year: 2026,
} as const;
