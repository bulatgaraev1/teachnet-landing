/**
 * Страница-визитка /links (ссылка в шапке профиля соцсетей): тексты и цели Метрики.
 * Телефон, филиалы, реквизиты: SITE (src/lib/site.ts). Мессенджеры и ссылки на курсы:
 * EL_CONFIG (src/content/electronics.config.ts) и SITE.courses. Публикации: блок «О нас пишут» главной.
 */
import { SITE } from '../lib/site';
import { EL_CONFIG } from './electronics.config';

/** Адрес курса из колонки «Курсы» подвала (SITE.courses) по его цели */
function courseHref(goal: string, fallback: string): string {
  return SITE.courses.find((c) => c.goal === goal)?.href ?? fallback;
}

export const LN = {
  title: 'TEACHNET — запись на пробное занятие',
  description: 'Школа робототехники и электроники для детей 5–15 лет в Казани. Первое занятие бесплатно: запишитесь, напишите или позвоните.',

  /** источник заявки: скрытое поле source формы, белый список в public/send.php */
  source: 'links',

  hero: {
    tagline: 'Робототехника и электроника для детей 5–15 лет',
    meta: `${SITE.city} · группы до 6 человек`,
    offer: 'Первое занятие бесплатно',
  },

  signup: 'Записаться на пробное занятие',

  contacts: [
    { id: 'telegram', label: 'Написать в Telegram', href: EL_CONFIG.messengers.telegram.base, img: 'icon-telegram.webp', goal: 'links_telegram' },
    { id: 'max', label: 'Написать в MAX', href: EL_CONFIG.messengers.max.base, img: 'icon-max.webp', goal: 'links_max' },
  ],
  call: { label: 'Позвонить', goal: 'links_phone' },

  coursesTitle: 'Курсы',
  courses: [
    { label: 'Робототехника на LEGO', age: '5–9 лет', href: courseHref('footer_robotics', EL_CONFIG.links.robotics), goal: 'links_course_robotics' },
    { label: 'Электроника и программирование', age: '10–15 лет', href: courseHref('footer_electronics', '/electronics'), goal: 'links_course_electronics' },
  ],

  branchesTitle: 'Адреса',
  route: 'Маршрут',
  /** карточка организации в Яндекс.Картах; orgId — из SITE.branches */
  routeHref: (orgId: string) => `https://yandex.ru/maps/org/${orgId}/`,
  routeGoal: (branchId: string) => `links_route_${branchId}`,

  pressTitle: 'О нас пишут',

  site: { label: 'Перейти на сайт teachnet.ru', href: '/', goal: 'links_site' },

  modal: {
    title: 'Запись на пробное занятие',
    text: 'Первое занятие бесплатно. Оставьте контакты: перезвоним и подберём удобное время и филиал.',
    close: 'Закрыть',
    ageOptions: ['5–9', '10–12', '13–15'],
    submit: 'Записаться',
    successTitle: 'Спасибо!',
    successText: 'Перезвоним в течение 15 минут в рабочее время.',
  },
} as const;
