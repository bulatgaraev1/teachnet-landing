/* Плашка cookie — та же логика, что на остальном сайте (src/components/cookie-banner.ts):
   появляется через 1,5 с, выбор хранится в localStorage под тем же ключом — кто уже нажал
   «Хорошо» на teachnet.ru, тому плашка здесь не покажется. */
(() => {
  'use strict';
  const KEY = 'tn-cookie-consent';
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* localStorage недоступен — покажем, но без сохранения */ }
  if (stored === 'accepted') return;
  setTimeout(() => {
    banner.classList.add('is-visible');
    banner.setAttribute('aria-hidden', 'false');
  }, 1500);
  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    try { localStorage.setItem(KEY, 'accepted'); } catch { /* игнорируем */ }
    banner.classList.remove('is-visible');
    banner.setAttribute('aria-hidden', 'true');
  });
})();
