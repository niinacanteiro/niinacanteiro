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

/* ---------------- topo: buraco negro em tempo real ---------------- */
(async function hero() {
  const cv = $('#hero-gl');
  try { const { initHero } = await import('./hero3d.js'); if (!initHero(cv, { reduced })) cv.classList.add('off'); }
  catch (err) { console.warn('hero 3D indisponível:', err); cv.classList.add('off'); }
})();

/* ---------------- universo 3D ---------------- */
const PLANETS = [
  { name: 'Mercúrio', fact: 'O mais rápido: dá a volta no Sol em 88 dias.', area: 'Programação', text: 'Python e Jupyter para métodos numéricos, com Git e GitHub para versionar.', link: '#exp-interp', label: 'Ver experimento' },
  { name: 'Vênus', fact: 'O mais quente, coberto por nuvens densas de ácido sulfúrico.', area: 'Documentação em LaTeX', text: 'Relatórios técnicos com circuitikz, pgfplots e TikZ, escritos no Overleaf.', link: '#exp-rc', label: 'Ver relatórios' },
  { name: 'Terra', fact: 'Nossa casa, o único planeta conhecido com vida.', area: 'Engenharia Elétrica', text: 'Circuitos RC, corrente alternada, fator de potência e motor de indução, medidos e simulados.', link: '#exp-rc', label: 'Ver experimento' },
  { name: 'Marte', fact: 'O planeta vermelho, explorado por robôs desde 1976.', area: 'Robótica & Arduino', text: 'No projeto de extensão em robótica, ministrei uma aula prática de semáforo com Arduino.', link: '#exp-semaforo', label: 'Ver experimento' },
  { name: 'Júpiter', fact: 'O gigante: caberiam mais de 1.300 Terras dentro dele.', area: 'Física & Astronomia', text: 'Física de partículas, astrofísica e astronomia: a curiosidade que move este portfólio.', link: '#sobre', label: 'Sobre mim' },
  { name: 'Saturno', fact: 'Seus anéis são feitos de gelo e rocha e têm até 280 mil km.', area: 'Circuitos no Tinkercad', text: 'Projetos simulados no Tinkercad Circuits, do esquema ao protótipo virtual.', link: '#exp-tinkercad', label: 'Ver circuitos' },
  { name: 'Urano', fact: 'Gira deitado, com o eixo inclinado em 98 graus.', area: 'Dados e análise', text: 'Pacote Office e Power BI para transformar números em decisões.', link: '#conhecimentos', label: 'Ver conhecimentos' },
  { name: 'Netuno', fact: 'Tem os ventos mais fortes do Sistema Solar, acima de 2.000 km/h.', area: 'Próximos passos', text: 'Aberta a estágios e trabalhos remotos em tecnologia e engenharia.', link: '#contato', label: 'Fale comigo' }
];
const uniCard = $('#uni-card');
function showPlanet(i) {
  const p = PLANETS[i];
  if (!p) { uniCard.hidden = true; $$('.planet-list button').forEach(b => b.classList.remove('on')); return; }
  uniCard.innerHTML = `<p class="kicker">planeta ${i + 1} de ${PLANETS.length}</p><h3>${p.name}</h3><p class="fact">${p.fact}</p><p><b>${p.area}.</b> ${p.text}</p><a href="${p.link}">${p.label} →</a>`;
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
    universe = mod.initUniverse($('#uni-stage'), PLANETS, { reduced, onSelect: showPlanet, onReady: () => $('#uni-loading').classList.add('done') });
  } catch (err) { console.warn('3D indisponível, usando versão leve:', err); useFallback(); }
}, { rootMargin: '300px' });
uniObs.observe($('#universo'));

$$('[data-uni]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.uni;
  if (a === 'pause') {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on); b.textContent = on ? 'Retomar órbitas' : 'Pausar órbitas';
    universe && universe.setPaused(on);
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

/* ---------------- profundidade: cartões inclinam com o cursor ---------------- */
if (!reduced && matchMedia('(hover:hover)').matches) {
  $$('.exp, .con-card, .glass:not(.universe):not(.sky)').forEach(c => {
    c.classList.add('tilt');
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(1100px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`;
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });
}

/* ---------------- legenda que escreve e apaga ---------------- */
(function typer() {
  const el = $('#typed'); if (!el) return;
  const words = ['ENGENHARIA ELÉTRICA', 'PROGRAMAÇÃO', 'ROBÓTICA', 'TECNOLOGIA', 'FÍSICA & ASTRONOMIA'];
  if (reduced) { el.textContent = words.join(' · '); return; }
  let w = 0, i = words[0].length, del = true;
  setTimeout(function tick() {
    const word = words[w];
    i += del ? -1 : 1; el.textContent = word.slice(0, i);
    let wait = del ? 38 : 85;
    if (!del && i === word.length) { del = true; wait = 1800; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; wait = 350; }
    setTimeout(tick, wait);
  }, 2200);
})();
