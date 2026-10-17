/* Лента настоящих фото: сама медленно прокручивается по кругу и при этом листается вручную —
   тачпадом, колесом с Shift, перетаскиванием мышкой и пальцем. После ручной прокрутки через пару секунд едет дальше.
   Круг без пустот: набор фото повторяется до ширины экрана и удваивается (копии скрыты от экранного диктора),
   а позиция прокрутки переносится на полкруга, когда доходит до края. */
(() => {
  const view = document.querySelector('.photo-strip-viewport');
  const track = view && view.querySelector('.photo-strip-track');
  if (!track || track.children.length < 2) return;
  const items = [...track.children];
  const copy = list => list.forEach(li => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('img').forEach(img => { img.alt = ''; });
    track.appendChild(c);
  });
  while (track.scrollWidth < view.clientWidth * 1.2) copy(items);
  copy([...track.children]);
  track.classList.add('is-moving');

  const SPEED = 40;                       // px в секунду
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let half = track.scrollWidth / 2, pos = 0, pauseUntil = 0, hover = false, last = 0;
  const wrap = () => {                    // держим позицию в пределах первого полукруга
    if (pos >= half) pos -= half;
    else if (pos < 0) pos += half;
    view.scrollLeft = pos;
  };
  const hold = ms => { pauseUntil = performance.now() + ms; };

  // Ручная прокрутка (тачпад, свайп, Shift+колесо): подхватываем позицию и ненадолго останавливаемся
  view.addEventListener('scroll', () => {
    if (Math.abs(view.scrollLeft - pos) > 1) { pos = view.scrollLeft; hold(2500); if (pos < 1 || pos >= half) wrap(); }
  }, { passive: true });
  view.addEventListener('mouseenter', () => { hover = true; });
  view.addEventListener('mouseleave', () => { hover = false; hold(800); });

  // Перетаскивание мышкой
  let drag = null;
  view.classList.add('is-draggable');
  view.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, start: pos, moved: false };
    view.setPointerCapture(e.pointerId);
    view.classList.add('is-dragging');
  });
  view.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    pos = drag.start - dx; wrap(); hold(2500);
  });
  const end = () => { if (drag) { drag = null; view.classList.remove('is-dragging'); hold(2500); } };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);

  window.addEventListener('resize', () => { half = track.scrollWidth / 2; wrap(); });

  if (still) return;                      // без анимации — только ручная прокрутка
  const tick = t => {
    const dt = last ? Math.min(t - last, 64) : 0; last = t;
    // при наведении едет медленно, а не замирает; после ручной прокрутки — короткая пауза
    if (!drag && t > pauseUntil && !document.hidden) { pos += SPEED * (hover ? 0.25 : 1) * dt / 1000; wrap(); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
