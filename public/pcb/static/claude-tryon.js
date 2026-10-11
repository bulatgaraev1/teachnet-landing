/* TEACHNET: примерка логотипа на значке.
   Безопасность: файл никуда не отправляется. Он читается в браузере, проверяется по
   содержимому (а не по расширению), рисуется на холсте и превращается в одноцветную маску.
   В «Скачать картинку» уходит только новая PNG, нарисованная холстом: в ней нет ничего,
   кроме пикселей. SVG не вставляется в страницу, а открывается как картинка (скрипты в этом
   режиме не выполняются); дополнительно из него вырезаются скрипты, обработчики и внешние ссылки. */
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('tryon-canvas');
  if (!canvas || !canvas.getContext) return;
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;
  const W = 1000, H = 1000;
  const MAX_BYTES = 5 * 1024 * 1024, MAX_SIDE = 8000, WORK = 900;
  const stage = $('tryon-stage'), statusEl = $('tryon-status'), fileInput = $('tryon-file');
  const pill = $('tryon-pill'), drop = $('tryon-drop'), sizeInput = $('tryon-size');
  const upload = document.querySelector('.tryon-upload');

  const state = { shape: 'round', board: 'blue', ink: 'white', light: 'warm', size: 70, ox: 0, oy: 0, mask: null, user: false, side: 'front', backText: '', qr: '' };

  const BOARDS = {
    blue:  { stops: ['#3B82EE', '#1055CB', '#173F86'], edge: '#0B2C6B', trace: '#4F8CF0', silk: 'rgba(255,255,255,.32)', label: 'синий' },
    black: { stops: ['#3A4654', '#1A222D', '#0A1017'], edge: '#020406', trace: '#3D4A5C', silk: 'rgba(255,255,255,.22)', label: 'чёрный' },
    white: { stops: ['#FFFFFF', '#E9EFF7', '#C0CEE2'], edge: '#7D93B3', trace: '#C6D2E3', silk: 'rgba(80,104,140,.42)', label: 'белый' }
  };
  const INKS = { white: 'белым', black: 'чёрным', gold: 'золотом' };
  const LIGHTS = {
    warm:   { glow: '255,214,140', body: '#FFF3C4', edge: '#E2C27A', label: 'тёплый белый' },
    cold:   { glow: '214,232,255', body: '#F7FBFF', edge: '#B9CFEA', label: 'холодный белый' },
    red:    { glow: '255,70,70',   body: '#FF9A90', edge: '#C8443C', label: 'красный' },
    yellow: { glow: '255,206,40',  body: '#FFE58A', edge: '#D2A52A', label: 'жёлтый' },
    green:  { glow: '60,232,120',  body: '#AEF5C6', edge: '#3FAE68', label: 'зелёный' },
    blue:   { glow: '80,150,255',  body: '#B5D0FF', edge: '#4A78D6', label: 'синий' },
    off:    { label: 'выключен' }
  };
  const SHAPES = { round: 'круглая плата', rect: 'прямоугольная плата', badge: 'бейдж' };

  /* ---------- геометрия ---------- */
  function geo(shape) {
    if (shape === 'round') return { type: 'circle', cx: 500, cy: 490, r: 330,
      ring: { type: 'circle', cx: 500, cy: 490, r: 272 }, area: { type: 'circle', cx: 500, cy: 490, r: 236 }, leds: 12 };
    if (shape === 'rect') return { type: 'rr', x: 140, y: 280, w: 720, h: 420, r: 70,
      ring: { type: 'rr', x: 192, y: 332, w: 616, h: 316, r: 24 }, area: { type: 'rr', x: 228, y: 368, w: 544, h: 244, r: 10 }, step: 90 };
    return { type: 'rr', x: 250, y: 140, w: 500, h: 720, r: 56, hole: { x: 440, y: 180, w: 120, h: 28, r: 14 },
      ring: { type: 'rr', x: 302, y: 262, w: 396, h: 546, r: 22 }, area: { type: 'rr', x: 338, y: 298, w: 324, h: 474, r: 10 }, step: 92 };
  }
  function backLayout(shape) {
    if (shape === 'round') return { bat: { x: 500, y: 290, r: 82 }, text: { x: 500, y: 452, w: 440, h: 84, fs: 44 }, qr: { x: 500, y: 640, s: 190 } };
    if (shape === 'rect') return { bat: { x: 302, y: 490, r: 98 }, text: { x: 640, y: 602, w: 340, h: 74, fs: 40 }, qr: { x: 640, y: 438, s: 184 } };
    return { bat: { x: 500, y: 764, r: 64 }, text: { x: 500, y: 322, w: 380, h: 112, fs: 42 }, qr: { x: 500, y: 546, s: 216 } };
  }
  function rrPath(p, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
  }
  function shapePath(g, inset = 0) {
    const p = new Path2D();
    if (g.type === 'circle') p.arc(g.cx, g.cy, g.r - inset, 0, Math.PI * 2);
    else rrPath(p, g.x + inset, g.y + inset, g.w - 2 * inset, g.h - 2 * inset, g.r - inset);
    return p;
  }
  function center(a) { return a.type === 'circle' ? { x: a.cx, y: a.cy } : { x: a.x + a.w / 2, y: a.y + a.h / 2 }; }
  function half(a) { return a.type === 'circle' ? { x: a.r, y: a.r } : { x: a.w / 2, y: a.h / 2 }; }
  function ringPoints(g) {
    const rg = g.ring, pts = [];
    if (rg.type === 'circle') {
      for (let i = 0; i < g.leds; i++) {
        const a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / g.leds;
        pts.push({ x: rg.cx + rg.r * Math.cos(a), y: rg.cy + rg.r * Math.sin(a), a: a + Math.PI / 2 });
      }
      return pts;
    }
    const { x, y, w, h, r } = rg, sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2;
    const segs = [['l', x + r, y, 1, 0, sw], ['a', x + w - r, y + r, -Math.PI / 2, arc], ['l', x + w, y + r, 0, 1, sh], ['a', x + w - r, y + h - r, 0, arc],
                  ['l', x + w - r, y + h, -1, 0, sw], ['a', x + r, y + h - r, Math.PI / 2, arc], ['l', x, y + h - r, 0, -1, sh], ['a', x + r, y + r, Math.PI, arc]];
    const L = 2 * sw + 2 * sh + 4 * arc, n = Math.max(4, Math.round(L / g.step));
    for (let i = 0; i < n; i++) {
      let d = (i + 0.5) * L / n;
      for (const s of segs) {
        const len = s[0] === 'l' ? s[5] : s[4];
        if (d <= len) {
          if (s[0] === 'l') pts.push({ x: s[1] + s[3] * d, y: s[2] + s[4] * d, a: Math.atan2(s[4], s[3]) });
          else { const t = s[3] + d / r; pts.push({ x: s[1] + r * Math.cos(t), y: s[2] + r * Math.sin(t), a: t + Math.PI / 2 }); }
          break;
        }
        d -= len;
      }
    }
    return pts;
  }
  function fitBox(area, aspect) {
    if (area.type === 'circle') { const k = Math.sqrt(1 + aspect * aspect); return { w: 2 * area.r * aspect / k, h: 2 * area.r / k }; }
    return aspect > area.w / area.h ? { w: area.w, h: area.w / aspect } : { w: area.h * aspect, h: area.h };
  }

  /* ---------- рисование ---------- */
  function roundRect(x, y, w, h, r) { const p = new Path2D(); rrPath(p, x, y, w, h, r); return p; }
  let tint = { key: '', canvas: null };
  function tinted() {
    const key = state.ink + '|' + state.mask.id;
    if (tint.key === key) return tint.canvas;
    const m = state.mask.canvas, c = document.createElement('canvas');
    c.width = m.width; c.height = m.height;
    const x = c.getContext('2d');
    x.drawImage(m, 0, 0);
    x.globalCompositeOperation = 'source-in';
    if (state.ink === 'gold') {
      const gr = x.createLinearGradient(0, 0, c.width, c.height);
      gr.addColorStop(0, '#F6E1A6'); gr.addColorStop(.5, '#B8904A'); gr.addColorStop(1, '#E8CF93');
      x.fillStyle = gr;
    } else x.fillStyle = state.ink === 'white' ? '#F7FAFD' : '#0E1A28';
    x.fillRect(0, 0, c.width, c.height);
    tint = { key, canvas: c };
    return c;
  }
  function logoRect(g) {
    const fit = fitBox(g.area, state.mask.aspect), k = state.size / 100, c = center(g.area);
    const w = fit.w * k, h = fit.h * k;
    return { x: c.x + state.ox - w / 2, y: c.y + state.oy - h / 2, w, h };
  }
  function led(p) {
    const L = LIGHTS[state.light], on = state.light !== 'off';
    if (on) {
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 48);
      gr.addColorStop(0, `rgba(${L.glow},.95)`); gr.addColorStop(.32, `rgba(${L.glow},.45)`); gr.addColorStop(1, `rgba(${L.glow},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 48, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = on ? L.body : '#DCE3EC'; ctx.strokeStyle = on ? L.edge : '#94A3B8'; ctx.lineWidth = 1.5;
    let r = roundRect(-14, -9, 28, 18, 4); ctx.fill(r); ctx.stroke(r);
    ctx.fillStyle = on ? '#FFFFFF' : '#F2F5F9'; r = roundRect(-6, -4.5, 12, 9, 2); ctx.fill(r);
    ctx.restore();
  }
  function inkStyle(x0, y0, x1, y1) {
    if (state.ink !== 'gold') return state.ink === 'white' ? '#F7FAFD' : '#0E1A28';
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#F6E1A6'); gr.addColorStop(.5, '#B8904A'); gr.addColorStop(1, '#E8CF93');
    return gr;
  }
  function wrapText(text, w, h, maxFs) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    for (let fs = maxFs; fs >= 18; fs -= 2) {
      ctx.font = `700 ${fs}px Onest, "Golos Text", Arial, sans-serif`;
      const lines = [];
      let cur = '';
      for (const word of words) {
        const t = cur ? cur + ' ' + word : word;
        if (ctx.measureText(t).width <= w) cur = t;
        else { if (cur) lines.push(cur); cur = word; }
      }
      if (cur) lines.push(cur);
      const maxLines = Math.max(1, Math.floor(h / (fs * 1.18)));
      if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= w)) return { lines: balance(words, lines.length, w), fs };
    }
    ctx.font = '700 18px Onest, "Golos Text", Arial, sans-serif';
    let t = text.trim();
    while (t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1);
    return { lines: [t + '…'], fs: 18 };
  }
  function balance(words, k, w) {
    // ровные строки: из всех разбиений на k строк берём то, где самая длинная строка короче
    const width = (a, b) => ctx.measureText(words.slice(a, b).join(' ')).width;
    const n = words.length;
    if (k < 2 || n < 2) return [words.join(' ')];
    let best = null, bestMax = Infinity;
    const tryCuts = cuts => {
      const pts = [0, ...cuts, n], ws = [];
      for (let i = 0; i < pts.length - 1; i++) ws.push(width(pts[i], pts[i + 1]));
      const m = Math.max(...ws);
      if (m <= w && m < bestMax) { bestMax = m; best = pts; }
    };
    if (k === 2) for (let i = 1; i < n; i++) tryCuts([i]);
    else for (let i = 1; i < n - 1; i++) for (let j = i + 1; j < n; j++) tryCuts([i, j]);
    if (!best) return [words.join(' ')];
    const out = [];
    for (let i = 0; i < best.length - 1; i++) out.push(words.slice(best[i], best[i + 1]).join(' '));
    return out;
  }
  let qrCache = { key: '', q: null };
  function qrFor(text) {
    if (qrCache.key === text) return qrCache.q;
    let q = null;
    try {
      if (window.qrcode) {
        window.qrcode.stringToBytes = s => Array.from(new TextEncoder().encode(s));
        q = window.qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
      }
    } catch (e) { q = null; }
    qrCache = { key: text, q };
    return q;
  }
  function drawBack(g, b) {
    const L = backLayout(state.shape), silk = state.board === 'white' ? 'rgba(80,104,140,.55)' : 'rgba(255,255,255,.4)';
    // зона батарейки и крепления
    ctx.save();
    ctx.setLineDash([10, 9]); ctx.lineWidth = 2.5; ctx.strokeStyle = silk;
    ctx.beginPath(); ctx.arc(L.bat.x, L.bat.y, L.bat.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = silk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${L.bat.r < 70 ? 14 : 17}px "Golos Text", Arial, sans-serif`;
    ctx.fillText('батарейка', L.bat.x, L.bat.y - 11); ctx.fillText('и крепление', L.bat.x, L.bat.y + 11);
    ctx.restore();
    // текст
    const T = L.text, value = state.backText.trim() || 'ВАШ ТЕКСТ';
    const fit = wrapText(value, T.w, T.h, T.fs), lh = fit.fs * 1.18;
    ctx.save();
    ctx.globalAlpha = state.backText.trim() ? 1 : .55;
    ctx.font = `700 ${fit.fs}px Onest, "Golos Text", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = inkStyle(T.x - T.w / 2, T.y - T.h / 2, T.x + T.w / 2, T.y + T.h / 2);
    fit.lines.forEach((l, i) => ctx.fillText(l, T.x, T.y + (i - (fit.lines.length - 1) / 2) * lh));
    ctx.restore();
    // QR-код
    const Q = L.qr, x0 = Q.x - Q.s / 2, y0 = Q.y - Q.s / 2, q = state.qr.trim() ? qrFor(state.qr.trim()) : null;
    if (!q) {
      ctx.save(); ctx.setLineDash([10, 9]); ctx.lineWidth = 2.5; ctx.strokeStyle = silk;
      ctx.stroke(roundRect(x0, y0, Q.s, Q.s, 18)); ctx.setLineDash([]);
      ctx.fillStyle = silk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 22px "Golos Text", Arial, sans-serif';
      ctx.fillText('QR-код', Q.x, Q.y); ctx.restore();
      return;
    }
    // QR-код печатается тем же слоем, что логотип и текст: прямо по плате, без подложки
    const n = q.getModuleCount(), cell = Q.s / n;
    ctx.fillStyle = inkStyle(x0, y0, x0 + Q.s, y0 + Q.s);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c))
      ctx.fillRect(x0 + c * cell - .3, y0 + r * cell - .3, cell + .6, cell + .6);
  }
  function render(target, side, label) {
    const prev = ctx; ctx = target;
    try { paint(side, label); } finally { ctx = prev; }
  }
  function draw() { render(mainCtx, state.side); }
  function paint(side, label) {
    const g = geo(state.shape), b = BOARDS[state.board];
    const bg = ctx.createRadialGradient(500, 420, 40, 500, 500, 740);
    bg.addColorStop(0, '#203a5b'); bg.addColorStop(.55, '#132438'); bg.addColorStop(1, '#0a1522');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const face = shapePath(g);
    if (g.hole) rrPath(face, g.hole.x, g.hole.y, g.hole.w, g.hole.h, g.hole.r);
    ctx.save(); ctx.translate(0, 20); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 34;
    ctx.fillStyle = b.edge; ctx.fill(face, 'evenodd'); ctx.restore();
    const fg = ctx.createLinearGradient(160, 140, 840, 860);
    b.stops.forEach((c, i) => fg.addColorStop(i / (b.stops.length - 1), c));
    ctx.fillStyle = fg; ctx.fill(face, 'evenodd');
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.stroke(face);
    ctx.strokeStyle = b.silk; ctx.stroke(shapePath(g, 16));
    if (side === 'back') drawBack(g, b);
    else {
    ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = b.trace; ctx.stroke(shapePath(g.ring));

    if (state.mask) {
      const r = logoRect(g);
      ctx.save(); ctx.clip(shapePath(g.area));
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
      ctx.drawImage(tinted(), r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    ringPoints(g).forEach(led);
    }
    ctx.font = '600 20px "Golos Text", Arial, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(167,186,218,.55)'; ctx.fillText('TEACHNET · примерка', W - 36, H - 34);
    if (label) {
      ctx.textAlign = 'left'; ctx.font = '650 22px "Golos Text", Arial, sans-serif'; ctx.fillStyle = 'rgba(230,238,248,.85)';
      ctx.fillText(label, 40, 60);
    }
    if (ctx === mainCtx) canvas.setAttribute('aria-label', (side === 'back' ? 'Оборот значка: ' : 'Примерка: ') + summary(false));
  }
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

  /* ---------- маска логотипа ---------- */
  const lum = (d, j) => (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function borderColor(d, w, h) {
    const rs = [], gs = [], bs = [];
    const push = (x, y) => { const j = (y * w + x) * 4; rs.push(d[j]); gs.push(d[j + 1]); bs.push(d[j + 2]); };
    const sx = Math.max(1, Math.floor(w / 200)), sy = Math.max(1, Math.floor(h / 200));
    for (let x = 0; x < w; x += sx) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y += sy) { push(0, y); push(w - 1, y); }
    const med = a => a.sort((p, q) => p - q)[a.length >> 1];
    return [med(rs), med(gs), med(bs)];
  }
  function trim(alpha, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x] > 40) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0 || (x1 - x0 + 1) * (y1 - y0 + 1) < 64) throw new Error('empty');
    const mw = x1 - x0 + 1, mh = y1 - y0 + 1, c = document.createElement('canvas');
    c.width = mw; c.height = mh;
    const x = c.getContext('2d'), img = x.createImageData(mw, mh);
    let sum = 0;
    for (let y = 0; y < mh; y++) for (let xx = 0; xx < mw; xx++) {
      const k = (y * mw + xx) * 4, a = alpha[(y + y0) * w + xx + x0];
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a; sum += a;
    }
    x.putImageData(img, 0, 0);
    return { canvas: c, aspect: mw / mh, id: Math.random().toString(36).slice(2), fill: sum / (255 * mw * mh) };
  }
  function maskFromImage(img, iw, ih) {
    const s = Math.min(1, WORK / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    let d;
    try { d = x.getImageData(0, 0, w, h).data; } catch (e) { throw new Error('read'); }
    const n = w * h, out = new Uint8ClampedArray(n);
    let transparent = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 200) transparent++;
    if (transparent / n > 0.02) {
      // Прозрачный фон. Если внутри знака есть белые детали, оставляем их прорезями.
      let opaque = 0, light = 0;
      for (let i = 0; i < n; i++) if (d[i * 4 + 3] > 200) { opaque++; if (lum(d, i * 4) > 0.9) light++; }
      const knock = opaque > 0 && light / opaque > 0.005 && light / opaque < 0.8;
      for (let i = 0; i < n; i++) {
        let a = d[i * 4 + 3] / 255;
        if (knock) a *= 1 - smoothstep(0.78, 0.92, lum(d, i * 4));
        out[i] = a * 255;
      }
    } else {
      // Сплошной фон: берём цвет по краям и выделяем всё, что от него отличается.
      const bg = borderColor(d, w, h);
      for (let i = 0; i < n; i++) {
        const j = i * 4, dist = Math.hypot(d[j] - bg[0], d[j + 1] - bg[1], d[j + 2] - bg[2]);
        out[i] = Math.max(0, Math.min(1, (dist - 36) / 70)) * 255;
      }
    }
    return trim(out, w, h);
  }
  function textMask(text) {
    const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 4);
    let lines = words.length ? [words.join(' ')] : ['ВАШ', 'ЛОГО'];
    if (words.length > 1 && lines[0].length > 9) {
      let best = 1, diff = 1e9;
      for (let i = 1; i < words.length; i++) {
        const dd = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
        if (dd < diff) { diff = dd; best = i; }
      }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    const fs = 180, c = document.createElement('canvas');
    c.width = 2400; c.height = Math.round(fs * 1.08 * lines.length + 60);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = `800 ${fs}px Onest, "Golos Text", Arial, sans-serif`;
    lines.forEach((l, i) => x.fillText(l, 1200, 30 + fs * 0.82 + i * fs * 1.08));
    const d = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    return trim(a, c.width, c.height);
  }
  const brand = $('brand-name');
  function demo() {
    if (state.user) return;
    try { state.mask = textMask(brand && brand.value.trim() ? brand.value : ''); } catch (e) { state.mask = null; }
    schedule();
  }

  /* ---------- чтение и проверка файла ---------- */
  const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  function sniff(b) {
    if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return 'png';
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
    return null;
  }
  async function isSvg(file) {
    const t = await file.slice(0, 4096).text();
    if (t.indexOf('\u0000') !== -1) return false;
    const s = t.replace(/^﻿/, '').trimStart();
    return s.startsWith('<') && /<svg[\s>]/i.test(s);
  }
  function jpegSize(b) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7) || m === 0xFF) { i += (m === 0xFF ? 1 : 2); continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF))
        return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }
  function cleanSvg(text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');   // разбор не запускает скрипты
    const root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
    doc.querySelectorAll('script,foreignObject,iframe,embed,object,audio,video').forEach(n => n.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(a => {
        const name = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
        if (name.startsWith('on')) el.removeAttribute(a.name);
        else if ((name === 'href' || name.endsWith(':href')) && !v.startsWith('#') && !v.startsWith('data:image/')) el.removeAttribute(a.name);
      });
    });
    const num = v => (v && !/%/.test(v) ? parseFloat(v) : NaN);
    const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    let w = num(root.getAttribute('width')), h = num(root.getAttribute('height'));
    const hasVb = vb.length === 4 && vb[2] > 0 && vb[3] > 0;
    if (!(w > 0 && h > 0)) { if (hasVb) { w = vb[2]; h = vb[3]; } else { w = h = 512; } }
    if (!hasVb) root.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const aspect = Math.min(20, Math.max(1 / 20, w / h));
    const ow = aspect >= 1 ? 1200 : Math.round(1200 * aspect), oh = aspect >= 1 ? Math.round(1200 / aspect) : 1200;
    root.setAttribute('width', ow); root.setAttribute('height', oh);
    const s = new XMLSerializer().serializeToString(doc);
    return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s), iw: ow, ih: oh };
  }
  const asDataUrl = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  function say(text, error) { statusEl.textContent = text; statusEl.classList.toggle('is-error', !!error); }
  const fail = text => { say(text, true); return false; };

  async function readFile(file) {
    if (!file) return false;
    if (file.size > MAX_BYTES) return fail('Файл больше 5 МБ. Сохраните логотип поменьше или пришлите исходник нам в письме.');
    if (file.size < 24) return fail('Файл пустой или повреждён.');
    const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    let kind = sniff(head);
    if (!kind && await isSvg(file)) kind = 'svg';
    if (!kind) return fail('Это не похоже на картинку. Подойдут PNG, JPG или SVG.');
    let dims = null;
    if (kind === 'png') dims = { w: u32(head, 16), h: u32(head, 20) };
    if (kind === 'jpg') dims = jpegSize(head);
    if (dims && (!dims.w || !dims.h || dims.w > MAX_SIDE || dims.h > MAX_SIDE)) return fail('Слишком большое изображение: подойдёт до 8000 точек по стороне.');
    say('Открываем логотип…');
    let url, iw = 0, ih = 0;
    try {
      if (kind === 'svg') {
        const r = cleanSvg(await file.text());
        if (!r) return fail('Не получилось прочитать SVG. Попробуйте PNG с прозрачным фоном.');
        ({ url, iw, ih } = r);
      } else url = await asDataUrl(file);
    } catch (e) { return fail('Не получилось прочитать файл.'); }
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try { await img.decode(); } catch (e) { return fail('Не получилось открыть файл. Попробуйте PNG или JPG.'); }
    iw = iw || img.naturalWidth; ih = ih || img.naturalHeight;
    if (!iw || !ih || iw > MAX_SIDE || ih > MAX_SIDE) return fail('Не получилось определить размер картинки.');
    try { state.mask = maskFromImage(img, iw, ih); }
    catch (e) {
      return fail(e.message === 'empty' ? 'Не нашли логотип на картинке. Лучше всего подходит PNG с прозрачным фоном.' : 'Браузер не дал прочитать картинку. Попробуйте PNG или JPG.');
    }
    state.user = true; state.ox = 0; state.oy = 0; setSize(70);
    stage.classList.add('is-editable');
    setSide('front');
    say(state.mask.fill > 0.9
      ? 'Похоже на фото или логотип на плашке. Чище всего выходит PNG с прозрачным фоном.'
      : 'Логотип на значке. Его можно двигать и менять размер.', false);
    schedule();
    return true;
  }

  fileInput.addEventListener('change', async () => { const f = fileInput.files && fileInput.files[0]; await readFile(f); fileInput.value = ''; });
  let depth = 0;
  const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  [stage, upload].forEach(el => {
    el.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; drop.hidden = false; upload.classList.add('is-over'); });
    el.addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    el.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) { drop.hidden = true; upload.classList.remove('is-over'); } });
    el.addEventListener('drop', e => {
      if (!hasFiles(e)) return; e.preventDefault(); depth = 0; drop.hidden = true; upload.classList.remove('is-over');
      readFile(e.dataTransfer.files[0]);
    });
  });

  /* ---------- управление ---------- */
  const sideButtons = document.querySelectorAll('[data-tryon-side]');
  function updatePill() {
    if (state.side === 'back') pill.textContent = 'Оборот · текст и QR-код';
    else if (state.user) pill.textContent = matchMedia('(pointer: coarse)').matches ? 'Ваш логотип · двигайте пальцем' : 'Ваш логотип · перетащите, чтобы подвинуть';
    else pill.textContent = 'Пример · загрузите свой логотип';
  }
  function setSide(side) {
    state.side = side;
    sideButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.tryonSide === side)));
    stage.classList.toggle('is-back', side === 'back');
    updatePill();
    schedule();
  }
  sideButtons.forEach(btn => btn.addEventListener('click', () => setSide(btn.dataset.tryonSide)));
  const backText = $('tryon-back-text'), qrInput = $('tryon-qr'), qrNote = $('tryon-qr-note');
  // примерная яркость краски и платы, чтобы предупредить о неконтрастном QR-коде
  const INK_L = { white: 0.95, black: 0.012, gold: 0.30 }, BOARD_L = { blue: 0.10, black: 0.015, white: 0.86 };
  function updateQrNote() {
    if (!qrNote) return;
    const q = state.qr.trim() ? qrFor(state.qr.trim()) : null;
    const a = INK_L[state.ink], b = BOARD_L[state.board], ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const notes = [];
    if (q && q.getModuleCount() > 41) notes.push('Длинная ссылка: на маленькой плате QR-код выйдет мелким. Лучше короткая ссылка.');
    if (q && ratio < 3) notes.push('В этом сочетании цветов QR-код малоконтрастный и может считываться хуже. Надёжнее белый на синей или чёрной плате, чёрный на белой.');
    qrNote.textContent = notes.join(' ');
  }
  if (backText) {
    backText.addEventListener('focus', () => setSide('back'));
    backText.addEventListener('input', () => { state.backText = backText.value.slice(0, 60); setSide('back'); });
  }
  if (qrInput) {
    qrInput.addEventListener('focus', () => setSide('back'));
    qrInput.addEventListener('input', () => {
      state.qr = qrInput.value.slice(0, 160);
      updateQrNote();
      setSide('back');
    });
  }
  function clampOffset() {
    const a = geo(state.shape).area, hh = half(a);
    state.ox = Math.max(-hh.x, Math.min(hh.x, state.ox));
    state.oy = Math.max(-hh.y, Math.min(hh.y, state.oy));
  }
  function setSize(v) {
    state.size = Math.round(Math.max(20, Math.min(100, v)));
    sizeInput.value = state.size;
    schedule();
  }
  function syncInk() {
    // одноцветный логотип не должен сливаться с платой
    document.querySelectorAll('input[name="tryon-ink"]').forEach(inp => {
      inp.disabled = (state.board === 'white' && inp.value === 'white') || (state.board === 'black' && inp.value === 'black');
    });
    if ((state.board === 'white' && state.ink === 'white') || (state.board === 'black' && state.ink === 'black')) {
      state.ink = 'gold';
      document.querySelector('input[name="tryon-ink"][value="gold"]').checked = true;
    }
  }
  document.querySelectorAll('.tryon-chips input[type="radio"]').forEach(inp => inp.addEventListener('change', () => {
    const key = inp.name.replace('tryon-', '');
    state[key] = inp.value;
    if (key === 'board') syncInk();
    if (key === 'board' || key === 'ink') updateQrNote();
    if (key === 'shape') clampOffset();
    if (key === 'light' && state.side === 'back') setSide('front');
    schedule();
  }));
  sizeInput.addEventListener('input', () => { if (state.side === 'back') setSide('front'); setSize(+sizeInput.value); });
  $('tryon-center').addEventListener('click', () => { state.ox = 0; state.oy = 0; setSide('front'); setSize(70); });

  const pointers = new Map();
  let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', e => {
    if (!state.user || state.side !== 'front') return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, ox: state.ox, oy: state.oy }; stage.classList.add('is-dragging'); }
    else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, size: state.size }; drag = null; }
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const k = W / canvas.getBoundingClientRect().width;
    if (pinch && pointers.size >= 2) { const [a, b] = [...pointers.values()]; setSize(pinch.size * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); }
    else if (drag) { state.ox = drag.ox + (e.clientX - drag.x) * k; state.oy = drag.oy + (e.clientY - drag.y) * k; clampOffset(); schedule(); }
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { x: p.x, y: p.y, ox: state.ox, oy: state.oy }; }
    if (!pointers.size) { drag = null; stage.classList.remove('is-dragging'); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    const step = e.shiftKey ? 40 : 12, moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (state.side !== 'front') return;
    if (moves[e.key]) { e.preventDefault(); state.ox += moves[e.key][0]; state.oy += moves[e.key][1]; clampOffset(); schedule(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setSize(state.size + 5); }
    else if (e.key === '-') { e.preventDefault(); setSize(state.size - 5); }
  });

  function summary(withFile) {
    let s = `${SHAPES[state.shape]}, цвет платы ${BOARDS[state.board].label}, логотип ${INKS[state.ink]}, свет ${LIGHTS[state.light].label}`;
    if (withFile) {
      if (state.backText.trim()) s += `, на обороте текст «${state.backText.trim()}»`;
      if (state.qr.trim()) s += `, QR-код: ${state.qr.trim()}`;
    }
    return s + (withFile && state.user ? '. Картинку примерки приложу.' : '.');
  }
  $('tryon-discuss').addEventListener('click', () => {
    const c = $('comment'), line = 'Примерка на сайте: ' + summary(true);
    if (c) {
      const rest = c.value.split('\n').filter(l => l.trim() && !l.startsWith('Примерка на сайте:'));
      c.value = [line, ...rest].join('\n').slice(0, 1200);
    }
    const det = document.querySelector('.brief-details'); if (det) det.open = true;
    const form = $('request-form'); if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('tryon-download').addEventListener('click', () => {
    // обе стороны на одной картинке
    const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const front = make(), back = make(), out = document.createElement('canvas');
    render(front.getContext('2d'), 'front', 'Лицо');
    render(back.getContext('2d'), 'back', 'Оборот');
    out.width = W * 2; out.height = H;
    const oc = out.getContext('2d');
    oc.drawImage(front, 0, 0); oc.drawImage(back, W, 0);
    oc.fillStyle = 'rgba(255,255,255,.08)'; oc.fillRect(W - 1, 0, 2, H);
    out.toBlob(blob => {
      if (!blob) return say('Не получилось сохранить картинку.', true);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'teachnet-primerka.png';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }, 'image/png');
  });

  updatePill();
  if (brand) brand.addEventListener('input', demo);
  demo();
  if (document.fonts && document.fonts.load) document.fonts.load('800 180px Onest').then(demo, () => {});
  window.addEventListener('load', demo);
})();
