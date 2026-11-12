// Nicoly Canteiro · portfólio interativo
// Módulos: navegação + barramento, céu/circuitos do topo, universo 3D (lazy),
// demonstrações do laboratório, filtro de conhecimentos, mapa de constelações, dados do GitHub.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const C = { orange: '#FF7A1A', amber: '#FFC531', gold: '#FFE08A', text: '#FFF6EA', dim: '#8E7A64' };

$('#year').textContent = new Date().getFullYear();

/* ---------------- navegação ---------------- */
const topbar = $('.topbar');
const menuBtn = $('.menu-btn');
const menu = $('#menu');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.classList.toggle('open', open);
});
menu.addEventListener('click', e => {
  if (e.target.closest('a')) { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.classList.contains('open')) { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); }
});
addEventListener('scroll', () => topbar.classList.toggle('scrolled', scrollY > 30), { passive: true });

// barramento lateral: nó ativo + pulso que "viaja" até a seção atual
const railLinks = $$('.rail a');
railLinks.forEach(a => a.dataset.label = a.textContent.trim());
const railPulse = $('.rail-pulse');
const sections = $$('main > section');
const secObs = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const id = en.target.id;
    railLinks.forEach((a, i) => {
      const on = a.dataset.node === id;
      a.classList.toggle('active', on);
      if (on) { a.setAttribute('aria-current', 'true'); railPulse.style.top = (a.parentElement.offsetTop - 11) + 'px'; }
      else a.removeAttribute('aria-current');
    });
    $$('.menu a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => secObs.observe(s));

// barramentos entre seções: esquentam quando o cursor se aproxima
const buses = $$('.bus');
let busRaf = 0, lastPointer = null;
addEventListener('pointermove', e => {
  lastPointer = e;
  if (busRaf) return;
  busRaf = requestAnimationFrame(() => {
    busRaf = 0;
    for (const b of buses) {
      const r = b.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const dy = Math.abs(lastPointer.clientY - (r.top + r.height / 2));
      const heat = Math.max(0, 1 - dy / 220);
      b.style.setProperty('--heat', heat.toFixed(2));
      b.classList.toggle('fast', heat > .55);
    }
  });
}, { passive: true });

/* ---------------- topo: estrelas + circuitos ---------------- */
(function hero() {
  const cv = $('#hero-canvas'), ctx = cv.getContext('2d');
  const hero = $('#inicio');
  let w, h, dpr, stars = [], traces = [], mouse = { x: -999, y: -999, tx: -999, ty: -999 }, running = true, last = performance.now();

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = hero.clientWidth; h = hero.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(420, Math.round(w * h / 4200));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h, z: .2 + Math.random() * .8,
      r: Math.random() < .08 ? 1.6 : .5 + Math.random() * .9, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5,
      warm: Math.random() < .35
    }));
    // trilhas de circuito no estilo placa: segmentos ortogonais com curvas de 45°
    const g = 26; traces = [];
    const count = Math.round(Math.min(34, w / 48));
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      let x = fromLeft ? -g : w + g;
      let y = Math.round((fromLeft ? h * .8 + Math.random() * h * .18 : h * .22 + Math.random() * h * .74) / g) * g;
      const pts = [[x, y]];
      let dir = fromLeft ? 1 : -1;
      const segs = 4 + Math.floor(Math.random() * 6);
      for (let k = 0; k < segs; k++) {
        const len = g * (2 + Math.floor(Math.random() * 6));
        x += dir * len; pts.push([x, y]);
        if (Math.random() < .7) { const dy = (Math.random() < .5 ? -1 : 1) * g * (1 + Math.floor(Math.random() * 2)); x += dir * Math.abs(dy); y += dy; pts.push([x, y]); }
      }
      const lens = [0];
      for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      traces.push({ pts, lens, total: lens[lens.length - 1], heat: 0, pulses: [Math.random() * lens[lens.length - 1]], next: Math.random() * 3 });
    }
  }
  function at(t, s) {
    let k = 1; while (k < t.lens.length - 1 && t.lens[k] < s) k++;
    const a = t.pts[k - 1], b = t.pts[k], seg = t.lens[k] - t.lens[k - 1] || 1, f = Math.min(1, Math.max(0, (s - t.lens[k - 1]) / seg));
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function draw(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08;
    ctx.clearRect(0, 0, w, h);
    const ox = mouse.tx > -900 ? (mouse.x - w / 2) : 0, oy = mouse.ty > -900 ? (mouse.y - h / 2) : 0;
    // estrelas com paralaxe sutil
    for (const s of stars) {
      const tw = reduced ? .8 : .55 + .45 * Math.sin(now / 1000 * s.s + s.p);
      const x = s.x - ox * s.z * .025, y = s.y - oy * s.z * .025;
      ctx.globalAlpha = tw * s.z;
      ctx.fillStyle = s.warm ? C.gold : C.text;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // brilho do cursor
    if (mouse.tx > -900) {
      const gr = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
      gr.addColorStop(0, 'rgba(255,122,26,.10)'); gr.addColorStop(1, 'rgba(255,122,26,0)');
      ctx.fillStyle = gr; ctx.fillRect(mouse.x - 220, mouse.y - 220, 440, 440);
    }
    // trilhas
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const t of traces) {
      let d = 1e9;
      for (let k = 0; k < t.pts.length; k++) d = Math.min(d, Math.hypot(t.pts[k][0] - mouse.x, t.pts[k][1] - mouse.y));
      const target = Math.max(0, 1 - d / 200);
      t.heat += (target - t.heat) * .1;
      ctx.strokeStyle = `rgba(255,197,49,${.07 + t.heat * .32})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); t.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      // pads (nós) pulsando
      const end = t.pts[t.pts.length - 1];
      const pulse = reduced ? .7 : .5 + .5 * Math.sin(now / 600 + t.total);
      ctx.fillStyle = `rgba(255,122,26,${.25 + .5 * pulse * (.4 + t.heat)})`;
      ctx.beginPath(); ctx.arc(end[0], end[1], 3.2, 0, 6.283); ctx.fill();
      ctx.strokeStyle = `rgba(255,224,138,${.25 + t.heat * .5})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(end[0], end[1], 6, 0, 6.283); ctx.stroke();
      if (reduced) continue;
      // pulsos de sinal
      t.next -= dt * (1 + t.heat * 4);
      if (t.next <= 0) { t.pulses.push(0); t.next = 2.5 + Math.random() * 3; }
      const speed = 110 + t.heat * 160;
      t.pulses = t.pulses.filter(s => s < t.total);
      for (let i = 0; i < t.pulses.length; i++) {
        t.pulses[i] += speed * dt;
        const s = t.pulses[i];
        const [hx, hy] = at(t, s), [tx, ty] = at(t, Math.max(0, s - 34));
        const lg = ctx.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, 'rgba(255,122,26,0)'); lg.addColorStop(1, 'rgba(255,224,138,.95)');
        ctx.strokeStyle = lg; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(tx, ty);
        // segue a trilha entre a cauda e a cabeça
        for (let k = 1; k < t.pts.length; k++) if (t.lens[k] > s - 34 && t.lens[k] < s) ctx.lineTo(t.pts[k][0], t.pts[k][1]);
        ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = C.gold; ctx.shadowColor = C.orange; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    // véu escuro atrás do bloco de texto (leitura em primeiro lugar)
    const tb = textBox();
    if (tb) {
      const cx = tb.x + tb.w / 2, cy = tb.y + tb.h / 2, rad = Math.max(tb.w, tb.h) * .75;
      const vg = ctx.createRadialGradient(cx, cy, rad * .2, cx, cy, rad);
      vg.addColorStop(0, 'rgba(10,8,6,.72)'); vg.addColorStop(1, 'rgba(10,8,6,0)');
      ctx.fillStyle = vg; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    if (running && !reduced) requestAnimationFrame(draw);
  }
  let tbCache = null;
  function textBox() {
    if (tbCache) return tbCache;
    const el = $('.hero-text'), hr = hero.getBoundingClientRect(), r = el.getBoundingClientRect();
    return tbCache = { x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height };
  }
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; if (mouse.x < -900) { mouse.x = mouse.tx; mouse.y = mouse.ty; } if (reduced) draw(performance.now()); }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = -999; mouse.x = mouse.y = -999; });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { tbCache = null; build(); if (reduced || !running) draw(performance.now()); }, 150); });
  new IntersectionObserver(([en]) => {
    const was = running; running = en.isIntersecting && !document.hidden;
    if (running && !was && !reduced) { last = performance.now(); requestAnimationFrame(draw); }
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { const was = running; running = !document.hidden; if (running && !was && !reduced) { last = performance.now(); requestAnimationFrame(draw); } });
  build(); requestAnimationFrame(draw);
})();

/* ---------------- universo 3D ---------------- */
const PLANETS = [
  { name: 'Engenharia Elétrica', color: '#FF7A1A', text: 'Circuitos RC, corrente alternada, fator de potência e motor de indução trifásico — tudo medido, simulado e documentado em relatórios de laboratório.', link: '#exp-rc', label: 'Ver experimento' },
  { name: 'Programação', color: '#FFC531', text: 'Python e Jupyter para métodos numéricos: interpolação polinomial e erro percentual, com Git e GitHub para versionar.', link: '#exp-interp', label: 'Ver experimento' },
  { name: 'Robótica & Arduino', color: '#FFE08A', text: 'No projeto de extensão em robótica, preparei e ministrei uma aula prática de semáforo com Arduino e protoboard.', link: '#exp-semaforo', label: 'Ver experimento' },
  { name: 'Documentação em LaTeX', color: '#FF9F4A', text: 'Relatórios técnicos com circuitikz, pgfplots, TikZ e tcolorbox, escritos e compilados no Overleaf.', link: '#exp-rc', label: 'Ver relatórios' },
  { name: 'Física & Astronomia', color: '#C9682A', text: 'A curiosidade de fundo: física de partículas, astrofísica e astronomia — o motivo de este portfólio ser um universo.', link: '#sobre', label: 'Sobre mim' }
];
const uniCard = $('#uni-card');
function showPlanet(i) {
  const p = PLANETS[i];
  if (!p) { uniCard.hidden = true; $$('.planet-list button').forEach(b => b.classList.remove('on')); return; }
  uniCard.innerHTML = `<p class="kicker">planeta ${i + 1} de ${PLANETS.length}</p><h3>${p.name}</h3><p>${p.text}</p><a href="${p.link}">${p.label} →</a>`;
  uniCard.hidden = false;
  $$('.planet-list button').forEach((b, k) => b.classList.toggle('on', k === i));
}
function hasWebGL() {
  if (/[?&]no3d\b/.test(location.search)) return false;
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}
let universe = null;
function useFallback() {
  $('#uni-stage').hidden = true; $('#uni-fallback').hidden = false;
  $$('[data-uni]').forEach(b => { if (b.dataset.uni !== 'pause') b.disabled = true; });
}
const uniObs = new IntersectionObserver(async ([en]) => {
  if (!en.isIntersecting) return;
  uniObs.disconnect();
  if (!hasWebGL()) return useFallback();
  try {
    const mod = await import('./universe.js');
    universe = mod.initUniverse($('#uni-stage'), PLANETS, { reduced, onSelect: showPlanet });
  } catch (err) { console.warn('3D indisponível, usando versão leve:', err); useFallback(); }
}, { rootMargin: '300px' });
uniObs.observe($('#universo'));

$$('[data-uni]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.uni;
  if (a === 'pause') {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on); b.textContent = on ? 'Retomar órbitas' : 'Pausar órbitas';
    universe ? universe.setPaused(on) : $$('.fb-orbit').forEach(o => o.style.animationPlayState = on ? 'paused' : 'running');
    return;
  }
  if (!universe) return;
  if (a === 'in') universe.zoom(.75);
  if (a === 'out') universe.zoom(1.33);
  if (a === 'reset') { universe.reset(); showPlanet(-1); }
}));
$$('[data-planet]').forEach(b => b.addEventListener('click', () => {
  const i = +b.dataset.planet; showPlanet(i); universe && universe.focus(i);
}));

/* ---------------- laboratório ---------------- */
const demos = {};
$$('[data-toggle]').forEach(btn => {
  const target = $('#' + btn.dataset.toggle);
  const original = btn.textContent;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open);
    target.hidden = !open;
    btn.textContent = open ? (target.classList.contains('docs') ? 'Esconder documentos' : 'Fechar') : original;
    const card = btn.closest('.exp');
    card.classList.toggle('open', $$('[data-toggle]', card).some(b => b.getAttribute('aria-expanded') === 'true'));
    if (open && demos[btn.dataset.toggle]) demos[btn.dataset.toggle].start();
    if (!open && demos[btn.dataset.toggle]?.stop) demos[btn.dataset.toggle].stop();
  });
});
function openDemo(id) {
  const btn = $(`[data-toggle="${id}"]`);
  if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
  btn?.closest('.exp')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

// utilitário de gráfico simples em canvas
function plot(cv, { xmin, xmax, ymin, ymax, series, marks = [], xlabel, ylabel, vline }) {
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const L = 52, R = 16, T = 16, B = 36;
  const X = x => L + (x - xmin) / (xmax - xmin) * (W - L - R), Y = y => H - B - (y - ymin) / (ymax - ymin) * (H - T - B);
  g.font = '11px JetBrains Mono, monospace'; g.fillStyle = C.dim; g.strokeStyle = 'rgba(255,197,49,.10)'; g.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const x = xmin + (xmax - xmin) * i / 5, y = ymin + (ymax - ymin) * i / 5;
    g.beginPath(); g.moveTo(X(x), T); g.lineTo(X(x), H - B); g.stroke();
    g.beginPath(); g.moveTo(L, Y(y)); g.lineTo(W - R, Y(y)); g.stroke();
    g.textAlign = 'center'; g.fillText(fmt(x, x % 1 ? 2 : 0), X(x), H - B + 16);
    g.textAlign = 'right'; g.fillText(fmt(y, Math.abs(ymax - ymin) < 5 ? 1 : 0), L - 8, Y(y) + 4);
  }
  g.textAlign = 'left'; g.fillStyle = C.gold;
  if (xlabel) g.fillText(xlabel, W - R - g.measureText(xlabel).width, H - 4);
  if (ylabel) g.fillText(ylabel, L + 6, T + 10);
  if (vline != null) { g.strokeStyle = 'rgba(255,224,138,.5)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(vline), T); g.lineTo(X(vline), H - B); g.stroke(); g.setLineDash([]); }
  for (const s of series) {
    g.strokeStyle = s.color; g.lineWidth = s.width || 2.5; g.shadowColor = s.color; g.shadowBlur = s.glow ? 10 : 0;
    if (s.dash) g.setLineDash(s.dash);
    g.beginPath();
    const n = 240; for (let i = 0; i <= n; i++) { const x = xmin + (xmax - xmin) * i / n; const y = s.f(x); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); }
    g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
  }
  for (const m of marks) {
    g.fillStyle = m.color; g.shadowColor = m.color; g.shadowBlur = 10;
    g.beginPath(); g.arc(X(m.x), Y(m.y), m.r || 5, 0, 6.283); g.fill(); g.shadowBlur = 0;
    if (m.label) { g.fillStyle = C.text; g.textAlign = 'left'; g.fillText(m.label, X(m.x) + 8, Y(m.y) + (m.below ? 16 : -8)); }
  }
}

// EXP-01: circuito RC (valores do relatório: E = 10 V, R = 1 kΩ, C = 100 µF)
(function rc() {
  const cv = $('#rc-canvas'), e = $('#rc-e'), r = $('#rc-r'), c = $('#rc-c');
  let mode = 'carga';
  function render() {
    const E = +e.value, R = +r.value * (mode === 'descarga' ? 2 : 1), Cf = +c.value * 1e-6, tau = R * Cf;
    $('#rc-e-o').textContent = fmt(E, E % 1 ? 1 : 0) + ' V';
    $('#rc-r-o').textContent = fmt(+r.value / 1000, 1) + ' kΩ';
    $('#rc-c-o').textContent = c.value + ' µF';
    const ms = v => v >= 1 ? fmt(v, 2) + ' s' : fmt(v * 1000, 0) + ' ms';
    $('#rc-tau').textContent = ms(tau); $('#rc-5tau').textContent = ms(5 * tau);
    const f = mode === 'carga' ? t => E * (1 - Math.exp(-t / tau)) : t => E * Math.exp(-t / tau);
    plot(cv, { xmin: 0, xmax: 6 * tau, ymin: 0, ymax: Math.max(E, 1), xlabel: 't (s)', ylabel: 'v_C (V)', vline: tau,
      series: [{ f, color: C.amber, glow: true }, { f: () => mode === 'carga' ? E : 0, color: 'rgba(255,122,26,.5)', width: 1.2, dash: [6, 6] }],
      marks: [{ x: tau, y: f(tau), color: C.orange, label: mode === 'carga' ? 'τ → 63,2%' : 'τ → 36,8%' }] });
  }
  [e, r, c].forEach(i => i.addEventListener('input', render));
  $$('[data-rc-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.rcMode; $$('[data-rc-mode]').forEach(x => x.setAttribute('aria-checked', x === b)); render();
  }));
  addEventListener('resize', () => !cv.closest('[hidden]') && render());
  demos['demo-rc'] = { start: render };
})();

// EXP-02: interpolação quadrática de Newton (pontos do notebook 01)
(function interp() {
  const cv = $('#ip-canvas'), sx = $('#ip-x');
  const x0 = 1, x1 = 4, x2 = 6, y0 = 0, y1 = 1.386294, y2 = 1.791759;
  const b0 = y0, b1 = (y1 - y0) / (x1 - x0), b2 = ((y2 - y1) / (x2 - x1) - (y1 - y0) / (x1 - x0)) / (x2 - x0);
  const f2 = x => b0 + b1 * (x - x0) + b2 * (x - x0) * (x - x1);
  function render() {
    const x = +sx.value, real = Math.log(x), ap = f2(x), err = real ? (real - ap) / real * 100 : 0;
    $('#ip-x-o').textContent = fmt(x, 1);
    $('#ip-real').textContent = fmt(real, 6); $('#ip-aprox').textContent = fmt(ap, 6);
    $('#ip-err').textContent = x === 1 ? '— (ln 1 = 0)' : fmt(err, 2) + ' %';
    plot(cv, { xmin: .5, xmax: 7, ymin: -.8, ymax: 2.2, xlabel: 'x', ylabel: 'y', vline: x,
      series: [{ f: Math.log, color: C.text, width: 1.6 }, { f: f2, color: C.amber, glow: true }],
      marks: [{ x: x0, y: y0, color: C.orange }, { x: x1, y: y1, color: C.orange }, { x: x2, y: y2, color: C.orange },
        { x, y: ap, color: C.gold, r: 6, label: 'f₂(x)', below: true }, { x, y: real, color: C.text, r: 4, label: 'ln x' }] });
  }
  sx.addEventListener('input', render);
  addEventListener('resize', () => !cv.closest('[hidden]') && render());
  demos['demo-interp'] = { start: render };
})();

// EXP-03: semáforo (verde 5 s, amarelo 2 s, vermelho 5 s — como no manual)
(function semaforo() {
  const steps = [{ n: 'verde', l: '.green', t: 5 }, { n: 'amarelo', l: '.yellow', t: 2 }, { n: 'vermelho', l: '.red', t: 5 }];
  let i = 0, left = 5, speed = 1, playing = true, raf = 0, last = 0;
  const play = $('#sem-play'), sp = $('#sem-speed');
  function paint() {
    $$('.lamp').forEach(l => l.classList.remove('on'));
    $(steps[i].l, $('.traffic')).classList.add('on');
    $$('#sem-code .ln').forEach(l => l.classList.toggle('on', +l.dataset.s === i));
    $('#sem-state').textContent = steps[i].n; $('#sem-time').textContent = fmt(Math.max(0, left), 1) + ' s';
  }
  function tick(now) {
    const dt = (now - last) / 1000; last = now;
    if (playing) { left -= dt * speed; if (left <= 0) { i = (i + 1) % 3; left = steps[i].t; } paint(); }
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pausar' : 'Continuar'; play.setAttribute('aria-pressed', playing); });
  sp.addEventListener('click', () => { speed = speed === 1 ? 5 : 1; sp.textContent = `Velocidade ${speed}×`; sp.setAttribute('aria-pressed', speed === 5); });
  demos['demo-sem'] = {
    start() { paint(); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); }
  };
})();

/* ---------------- conhecimentos ---------------- */
$$('[data-filter]').forEach(b => b.addEventListener('click', () => {
  const f = b.dataset.filter;
  $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
  $$('.skill').forEach(s => s.hidden = f !== 'all' && s.dataset.cat !== f);
}));

/* ---------------- constelações ---------------- */
(function sky() {
  const repo = n => `https://github.com/niinacanteiro/${n}`;
  const STARS = [
    { id: 'ele', area: 1, x: 24, y: 28, name: 'Engenharia Elétrica', text: 'Circuitos em CC e CA, transitórios RC, fator de potência e máquinas elétricas, estudados no Bacharelado do IFMT.', links: [['Ver relatórios', '#exp-rc']] },
    { id: 'prog', area: 1, x: 64, y: 22, name: 'Programação', text: 'Python e Jupyter Notebook aplicados a métodos numéricos, com Git e GitHub para versionar o trabalho.', links: [['Ver experimento', 'demo-interp']] },
    { id: 'rob', area: 1, x: 76, y: 66, name: 'Robótica & Arduino', text: 'Arduino, protoboard e Tinkercad no projeto de extensão em robótica do curso.', links: [['Ver experimento', 'demo-sem']] },
    { id: 'doc', area: 1, x: 40, y: 74, name: 'Documentação técnica', text: 'LaTeX no Overleaf com circuitikz, pgfplots, TikZ e tcolorbox para relatórios e manuais.', links: [['Repositório', repo('relatorios-latex')]] },
    { id: 'sim', area: 1, x: 47, y: 46, name: 'Modelagem & Simulação', text: 'PSIM para circuitos em corrente alternada, Tinkercad para Arduino e modelos numéricos em Python.', links: [['Simulações no PSIM', repo('relatorios-latex/tree/main/circuitos-ii-psim-iii')]] },
    { id: 'fis', area: 1, x: 88, y: 16, name: 'Física & Astronomia', text: 'Interesse pessoal: física de partículas, física quântica, astrofísica e astronomia.', links: [['Sobre mim', '#sobre']] },
    { id: 'p-rc', x: 9, y: 50, name: 'Circuito RC', text: 'Relatório de carga e descarga de capacitor: τ = RC = 100 ms na carga e 200 ms na descarga.', links: [['Abrir simulação', 'demo-rc'], ['PDF', repo('relatorios-latex/blob/main/circuitos-ii-carga-descarga-rc/main.pdf')]], to: ['ele', 'doc'] },
    { id: 'p-psim', x: 27, y: 56, name: 'Simulações PSIM', text: 'Circuitos em corrente alternada simulados no PSIM, com leitura de wattímetro e compensação do fator de potência.', links: [['PDF', repo('relatorios-latex/blob/main/circuitos-ii-psim-iii/main.pdf')]], to: ['ele', 'sim'] },
    { id: 'p-motor', x: 36, y: 9, name: 'Motor de indução', text: 'Ensaio de motor trifásico tipo gaiola de esquilo em delta, com o método dos dois wattímetros.', links: [['PDF', repo('relatorios-latex/blob/main/circuitos-motor-gaiola-esquilo/main.pdf')]], to: ['ele'] },
    { id: 'p-interp', x: 72, y: 42, name: 'Interpolação quadrática', text: 'Polinômio de Newton de 2º grau em Python para estimar ln(2) e medir o erro percentual.', links: [['Abrir demonstração', 'demo-interp'], ['Repositório', repo('Metodos_Computacionais')]], to: ['prog', 'sim'] },
    { id: 'p-sem', x: 60, y: 86, name: 'Semáforo Arduino', text: 'Manual em LaTeX para uma aula prática que ministrei: semáforo com Arduino e protoboard.', links: [['Ligar o semáforo', 'demo-sem'], ['Repositório', repo('Manual-de-Instrucao-LaTex')]], to: ['rob', 'doc'] },
    { id: 'p-site', x: 90, y: 86, name: 'Este portfólio', text: 'Site em HTML, CSS e JavaScript com Three.js, publicado no GitHub Pages.', links: [['Repositório', repo('niinacanteiro')]], to: ['prog', 'rob'] }
  ];
  const AREA_LINKS = [['ele', 'sim'], ['prog', 'sim'], ['sim', 'doc'], ['prog', 'fis']];
  const map = $('#sky-map'), svg = $('#sky-lines');
  const byId = Object.fromEntries(STARS.map(s => [s.id, s]));
  const edges = [...AREA_LINKS, ...STARS.flatMap(s => (s.to || []).map(t => [s.id, t]))];
  svg.innerHTML = edges.map(([a, b]) => `<line data-a="${a}" data-b="${b}" x1="${byId[a].x}%" y1="${byId[a].y}%" x2="${byId[b].x}%" y2="${byId[b].y}%"/>`).join('');
  STARS.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'star' + (s.area ? ' area' : '');
    b.style.left = s.x + '%'; b.style.top = s.y + '%'; b.style.setProperty('--d', (i * .37 % 3) + 's');
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${s.name} — ${s.area ? 'área de conhecimento' : 'projeto'}`);
    b.innerHTML = `<span>${s.name}</span>`;
    b.addEventListener('click', () => select(s, b));
    map.appendChild(b);
  });
  function select(s, btn) {
    $$('.star', map).forEach(x => x.setAttribute('aria-pressed', x === btn));
    $$('line', svg).forEach(l => l.classList.toggle('hot', l.dataset.a === s.id || l.dataset.b === s.id));
    $('#sky-type').textContent = s.area ? 'área de conhecimento' : 'projeto';
    $('#sky-title').textContent = s.name;
    $('#sky-desc').textContent = s.text;
    const wrap = $('#sky-links'); wrap.innerHTML = '';
    for (let [label, href] of s.links) {
      let el;
      if (href.startsWith('demo-')) { el = document.createElement('button'); el.type = 'button'; el.addEventListener('click', () => openDemo(href)); }
      else { el = document.createElement('a'); el.href = href; if (href.startsWith('http')) { el.target = '_blank'; el.rel = 'noopener'; if (!label.endsWith('↗')) label += ' ↗'; } }
      el.className = 'btn small ' + (wrap.children.length ? 'ghost' : 'primary'); el.textContent = label;
      wrap.appendChild(el);
    }
  }
})();

/* ---------------- dados ao vivo do GitHub ---------------- */
(async function stats() {
  const note = $('#st-note');
  try {
    const [u, repos] = await Promise.all([
      fetch('https://api.github.com/users/niinacanteiro').then(r => { if (!r.ok) throw r.status; return r.json(); }),
      fetch('https://api.github.com/users/niinacanteiro/repos?per_page=100&type=owner').then(r => { if (!r.ok) throw r.status; return r.json(); })
    ]);
    const langs = [...new Set(repos.map(r => r.language).filter(Boolean))];
    const lastPush = repos.map(r => new Date(r.pushed_at)).sort((a, b) => b - a)[0];
    $('#st-repos').textContent = u.public_repos;
    $('#st-langs').textContent = langs.length;
    $('#st-push').textContent = lastPush ? lastPush.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    note.textContent = langs.length ? 'Linguagens detectadas pelo GitHub: ' + langs.join(', ') + '.' : '';
  } catch {
    $('#stats').hidden = true;
  }
})();
