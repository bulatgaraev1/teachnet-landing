/** Карточка с формой записи из макетов: заголовок, подзаголовок, форма сайта в компоновке макета. */
import { leadForm } from '../../components/form';
import { SITE } from '../../lib/site';

const AGES = ['5–7', '8–9', '10–12', '13–15'];

interface FormCardOptions {
  title: string;
  sub?: string;
  source: string;
  /** id карточки (якорь кнопок записи) и id заголовка — у макетов B и C свои */
  id?: string;
  titleId?: string;
}

export function formCard({ title, sub = '', source, id = 'conversion', titleId = 'lead' }: FormCardOptions): string {
  return `<div class="ab-form" id="${id}" data-scroll-goal="scroll_conversion">
        <p class="ab-form__title" id="${titleId}">${title}</p>${sub ? `
        <p class="ab-form__sub">${sub}</p>` : ''}
        ${leadForm({
          source,
          labels: true,
          namePlaceholder: 'Как к вам обращаться',
          ageType: 'select',
          ageOptions: AGES.map((a) => ({ value: a, label: `${a} лет` })),
          branches: SITE.branches.map((b) => ({ value: b.id, label: b.street })),
          consentLead: 'Согласен на обработку',
          submitLabel: 'Записаться на пробный урок',
          footText: 'Перезвоним в течение 15 минут в рабочее время',
        })}
      </div>`;
}
