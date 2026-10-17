/* Лента настоящих фото: сама медленно прокручивается по кругу, на наведении стоит.
   Чтобы круг был без пустот, набор фото повторяется до ширины экрана, затем удваивается (копии скрыты от экранного диктора). */
(() => {
  const track = document.querySelector('.photo-strip-track');
  if (!track || track.children.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // без движения — лента листается пальцем
  const items = [...track.children];
  const copy = () => items.forEach(li => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('img').forEach(img => { img.alt = ''; });
    track.appendChild(c);
  });
  while (track.scrollWidth < window.innerWidth * 1.2) copy();
  [...track.children].forEach(li => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('img').forEach(img => { img.alt = ''; });
    track.appendChild(c);
  });
  // Скорость одинаковая при любом числе фото: около 40 px в секунду
  track.style.animationDuration = Math.round(track.scrollWidth / 2 / 40) + 's';
  track.classList.add('is-moving');
})();
