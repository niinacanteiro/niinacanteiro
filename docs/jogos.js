// Fliperama: Cobrinha, Memória dos Planetas, 2048 e Foguete. Teclado, toque e botões.
(() => {
  const root = document.getElementById('arcade');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const cv = $('#ar-canvas'), ctx = cv.getContext('2d');
  const scoreEl = $('#ar-score'), bestEl = $('#ar-best'), msg = $('#ar-msg'), startBtn = $('#ar-start'), dpad = $('#ar-dpad');
  const C = { bg: '#0b0806', cell: 'rgba(255,190,120,.05)', line: 'rgba(255,197,49,.10)', o: '#FF7A1A', a: '#FFC531', g: '#FFE08A', b: '#8B4513', t: '#FFF6EA', m: '#CDBBA5' };
  let W = 0, H = 0, dpr = 1, game = null, raf = 0;

  function fit() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2.5);
    W = Math.floor(r.width); H = Math.floor(Math.min(r.width * .66, innerHeight * .62, 560));
    if (r.width < 600) H = Math.floor(Math.min(r.width * 1.05, innerHeight * .6));
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game && game.resize && game.resize(); game && game.draw();
  }
  const best = k => +(localStorage.getItem('nina-' + k) || 0);
  function setScore(s) { scoreEl.textContent = s; if (s > best(game.key)) { localStorage.setItem('nina-' + game.key, s); bestEl.textContent = s; } }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function glowText(t, x, y, size, color = C.t, weight = 300) {
    ctx.font = `${weight} ${size}px Montserrat, Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,122,26,.6)'; ctx.shadowBlur = 18; ctx.fillStyle = color; ctx.fillText(t, x, y); ctx.shadowBlur = 0;
  }

  /* ---------- Cobrinha ---------- */
  function Snake() {
    const g = { key: 'snake', hint: 'Setas, W A S D, deslize o dedo ou use os botões.', dpad: true };
    let cols, rows, cs, ox, oy, snake, dir, next, food, timer = 0, acc = 0, score, alive = false, step = 120, parts = [];
    g.resize = () => { cs = Math.floor(Math.min(W / 28, H / 18)); cols = Math.floor(W / cs); rows = Math.floor(H / cs); ox = (W - cols * cs) / 2; oy = (H - rows * cs) / 2; };
    function place() { do food = { x: Math.random() * cols | 0, y: Math.random() * rows | 0, lv: 1 + (Math.random() * 3 | 0) }; while (snake.some(s => s.x === food.x && s.y === food.y)); }
    g.start = () => { g.resize(); const cx = cols / 2 | 0, cy = rows / 2 | 0; snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }]; dir = next = { x: 1, y: 0 }; score = 0; step = 120; setScore(0); place(); alive = true; };
    g.input = d => { if (d.x === -dir.x && d.y === -dir.y) return; next = d; };
    g.update = dt => {
      parts = parts.filter(p => (p.life -= dt) > 0); parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; });
      if (!alive) return; acc += dt * 1000; if (acc < step) return; acc = 0; dir = next;
      const h = { x: (snake[0].x + dir.x + cols) % cols, y: (snake[0].y + dir.y + rows) % rows };
      if (snake.some(s => s.x === h.x && s.y === h.y)) { alive = false; g.over(score); return; }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) {
        score += food.lv * 10; setScore(score); step = Math.max(62, step - 3);
        for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 90; parts.push({ x: ox + (h.x + .5) * cs, y: oy + (h.y + .5) * cs, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .6 }); }
        place();
      } else snake.pop();
    };
    g.draw = () => {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) { ctx.fillStyle = C.cell; rr(ox + x * cs + 2, oy + y * cs + 2, cs - 4, cs - 4, 3); ctx.fill(); }
      if (!snake) return;
      const fc = ['', '#8B4513', '#FF7A1A', '#FFC531'][food.lv];
      ctx.shadowColor = fc; ctx.shadowBlur = 16; ctx.fillStyle = fc; rr(ox + food.x * cs + 3, oy + food.y * cs + 3, cs - 6, cs - 6, 4); ctx.fill(); ctx.shadowBlur = 0;
      snake.forEach((s, i) => {
        const k = i / Math.max(1, snake.length - 1);
        const col = k < .5 ? mix('#FFE08A', '#FF7A1A', k * 2) : mix('#FF7A1A', '#7a3a10', (k - .5) * 2);
        ctx.fillStyle = col; if (i === 0) { ctx.shadowColor = C.a; ctx.shadowBlur = 14; }
        rr(ox + s.x * cs + 1.5, oy + s.y * cs + 1.5, cs - 3, cs - 3, i === 0 ? cs * .35 : 4); ctx.fill(); ctx.shadowBlur = 0;
      });
      parts.forEach(p => { ctx.globalAlpha = p.life / .6; ctx.fillStyle = C.g; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }); ctx.globalAlpha = 1;
    };
    return g;
  }

  /* ---------- Memória dos Planetas ---------- */
  function Memory() {
    const g = { key: 'memory', hint: 'Toque nas cartas e encontre os pares de planetas. Menos jogadas = mais pontos.' };
    const P = [['Mercúrio', '#b1ada6', '#6f6a63'], ['Vênus', '#f0d39a', '#b88a4a'], ['Terra', '#4c8fe0', '#1f4f8a'], ['Marte', '#e0663a', '#8a2c10'], ['Júpiter', '#e2c29a', '#a06a3e'], ['Saturno', '#efdcaa', '#b49452'], ['Urano', '#b5ecf2', '#5fb2c0'], ['Netuno', '#5b84ea', '#233f9a']];
    let cards = [], open = [], moves = 0, found = 0, lock = 0, layout;
    g.resize = () => { const n = 16, colsN = W > H * 1.2 ? 8 : 4, rowsN = n / colsN; const cw = Math.min((W - 24) / colsN, (H - 24) / rowsN); layout = { colsN, rowsN, cw, ox: (W - cw * colsN) / 2, oy: (H - cw * rowsN) / 2 }; };
    g.start = () => { g.resize(); cards = [...P.keys(), ...P.keys()].sort(() => Math.random() - .5).map(p => ({ p, up: false, done: false, flip: 0 })); open = []; moves = 0; found = 0; setScore(0); };
    g.click = (x, y) => {
      if (lock > 0) return; const { colsN, cw, ox, oy } = layout;
      const c = Math.floor((x - ox) / cw), r = Math.floor((y - oy) / cw), i = r * colsN + c; const card = cards[i];
      if (!card || card.up || card.done || c < 0 || c >= colsN) return;
      card.up = true; open.push(card);
      if (open.length === 2) {
        moves++;
        if (open[0].p === open[1].p) { open.forEach(o => o.done = true); found++; open = []; if (found === 8) { const s = Math.max(10, 200 - (moves - 8) * 10); setScore(s); g.over(s, `Você achou todos em ${moves} jogadas!`); } }
        else { lock = .8; }
      }
    };
    g.update = dt => { if (lock > 0 && (lock -= dt) <= 0) { open.forEach(o => o.up = false); open = []; } cards.forEach(c => c.flip += (((c.up || c.done) ? 1 : 0) - c.flip) * Math.min(1, dt * 10)); };
    g.draw = () => {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); if (!layout) return; const { colsN, cw, ox, oy } = layout;
      cards.forEach((c, i) => {
        const x = ox + (i % colsN) * cw + 5, y = oy + Math.floor(i / colsN) * cw + 5, s = cw - 10, sx = Math.abs(Math.cos(c.flip * Math.PI));
        ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.scale(Math.max(.02, sx), 1);
        if (c.flip < .5) {
          const gr = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,170,80,.16)'); gr.addColorStop(1, 'rgba(255,170,80,.04)');
          ctx.fillStyle = gr; rr(-s / 2, -s / 2, s, s, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,197,49,.25)'; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,197,49,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, s * .28, s * .1, -.4, 0, 6.28); ctx.stroke();
          ctx.fillStyle = C.a; ctx.beginPath(); ctx.arc(0, 0, s * .07, 0, 6.28); ctx.fill();
        } else {
          const [name, c1, c2] = P[c.p];
          ctx.fillStyle = c.done ? 'rgba(255,197,49,.10)' : 'rgba(255,255,255,.06)'; rr(-s / 2, -s / 2, s, s, 12); ctx.fill(); ctx.strokeStyle = c.done ? 'rgba(255,197,49,.5)' : 'rgba(255,255,255,.15)'; ctx.stroke();
          const pr = s * .24, gr = ctx.createRadialGradient(-pr * .4, -pr * .5 - s * .06, pr * .1, 0, -s * .06, pr);
          gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr; ctx.shadowColor = c1; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(0, -s * .06, pr, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
          if (name === 'Saturno') { ctx.strokeStyle = 'rgba(240,220,170,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -s * .06, pr * 1.6, pr * .45, -.3, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1; }
          ctx.font = `400 ${Math.max(10, s * .11)}px Montserrat, Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = C.t; ctx.fillText(name, 0, s * .34);
        }
        ctx.restore();
      });
    };
    return g;
  }

  /* ---------- 2048 ---------- */
  function T2048() {
    const g = { key: '2048', hint: 'Setas, W A S D, deslize ou botões. Junte números iguais até chegar a 2048.', dpad: true };
    let b, score, L, anim = 0;
    g.resize = () => { const s = Math.min(W, H) - 24; L = { s, ox: (W - s) / 2, oy: (H - s) / 2, c: s / 4 }; };
    const add = () => { const e = []; b.forEach((r, y) => r.forEach((v, x) => !v && e.push([x, y]))); if (!e.length) return; const [x, y] = e[Math.random() * e.length | 0]; b[y][x] = Math.random() < .9 ? 2 : 4; };
    g.start = () => { g.resize(); b = [...Array(4)].map(() => Array(4).fill(0)); score = 0; setScore(0); add(); add(); };
    function slide(row) { const r = row.filter(v => v); for (let i = 0; i < r.length - 1; i++) if (r[i] === r[i + 1]) { r[i] *= 2; score += r[i]; r.splice(i + 1, 1); } while (r.length < 4) r.push(0); return r; }
    g.input = d => {
      const before = JSON.stringify(b), rot = m => m[0].map((_, i) => m.map(r => r[i]));
      if (d.x === -1) b = b.map(slide);
      if (d.x === 1) b = b.map(r => slide([...r].reverse()).reverse());
      if (d.y === -1) b = rot(rot(b).map(slide));
      if (d.y === 1) b = rot(rot(b).map(r => slide([...r].reverse()).reverse()));
      if (JSON.stringify(b) !== before) { add(); setScore(score); anim = 1; }
      const can = b.some((r, y) => r.some((v, x) => !v || (r[x + 1] === v) || (b[y + 1] && b[y + 1][x] === v)));
      if (!can) g.over(score);
      if (b.flat().includes(2048)) g.over(score, 'Você chegou a 2048!');
    };
    g.update = dt => { anim = Math.max(0, anim - dt * 6); };
    const col = v => ({ 2: '#3a2414', 4: '#4e2c12', 8: '#7a3a10', 16: '#9c4a12', 32: '#c95a14', 64: '#FF7A1A', 128: '#ff9a2e', 256: '#ffb13b', 512: '#FFC531', 1024: '#ffd65c', 2048: '#FFE08A' }[v] || '#FFF6EA');
    g.draw = () => {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); if (!b) return; const { ox, oy, c } = L;
      ctx.fillStyle = 'rgba(255,170,80,.06)'; rr(ox - 6, oy - 6, c * 4 + 12, c * 4 + 12, 16); ctx.fill();
      b.forEach((r, y) => r.forEach((v, x) => {
        const px = ox + x * c + 5, py = oy + y * c + 5, s = c - 10;
        ctx.fillStyle = v ? col(v) : 'rgba(255,190,120,.05)'; if (v >= 64) { ctx.shadowColor = col(v); ctx.shadowBlur = 18; }
        rr(px, py, s, s, 10); ctx.fill(); ctx.shadowBlur = 0;
        if (v) { ctx.font = `${v >= 1024 ? 500 : 400} ${s * (v >= 1000 ? .3 : v >= 100 ? .36 : .44)}px Montserrat, Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = v >= 256 ? '#1a0f00' : C.t; ctx.fillText(v, px + s / 2, py + s / 2 + 1); }
      }));
    };
    return g;
  }

  /* ---------- Foguete ---------- */
  function Rocket() {
    const g = { key: 'rocket', hint: 'Mova o dedo ou o mouse (ou as setas) para desviar dos asteroides.' };
    let ship, rocks, stars, t, score, alive, tx, keys = 0, spawn;
    g.start = () => { ship = { x: W / 2, y: H * .8 }; tx = W / 2; rocks = []; t = 0; score = 0; spawn = 0; alive = true; setScore(0); stars = [...Array(90)].map(() => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() })); };
    g.move = x => { tx = x; };
    g.input = d => { keys = d.x; };
    g.keyup = () => { keys = 0; };
    g.update = dt => {
      if (!stars) return;
      stars.forEach(s => { s.y += (30 + s.z * 140) * dt * (alive ? 1 + t * .02 : .3); if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
      if (!alive) return; t += dt;
      if (keys) tx = Math.max(16, Math.min(W - 16, tx + keys * 420 * dt));
      ship.x += (tx - ship.x) * Math.min(1, dt * 12);
      spawn -= dt; if (spawn <= 0) { spawn = Math.max(.22, .9 - t * .02); const r = 10 + Math.random() * 22; rocks.push({ x: Math.random() * W, y: -r, r, v: 120 + Math.random() * 120 + t * 6, a: Math.random() * 6, va: (Math.random() - .5) * 2, pts: [...Array(9)].map(() => .75 + Math.random() * .35) }); }
      rocks.forEach(r => { r.y += r.v * dt; r.a += r.va * dt; });
      rocks = rocks.filter(r => { if (r.y - r.r > H) { score += 5; setScore(score); return false; } return true; });
      if (rocks.some(r => Math.hypot(r.x - ship.x, r.y - ship.y) < r.r * .85 + 10)) { alive = false; g.over(score); }
    };
    g.draw = () => {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); if (!stars) return;
      stars.forEach(s => { ctx.globalAlpha = .3 + s.z * .7; ctx.fillStyle = s.z > .8 ? C.g : C.t; ctx.fillRect(s.x, s.y, 1 + s.z * 1.5, 1 + s.z * 1.5); }); ctx.globalAlpha = 1;
      rocks.forEach(r => {
        ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
        const gr = ctx.createRadialGradient(-r.r * .3, -r.r * .3, 1, 0, 0, r.r); gr.addColorStop(0, '#9a6a44'); gr.addColorStop(1, '#3a2414');
        ctx.fillStyle = gr; ctx.beginPath(); r.pts.forEach((k, i) => { const a = i / r.pts.length * 6.28; ctx.lineTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k); }); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,190,120,.25)'; ctx.stroke(); ctx.restore();
      });
      const { x, y } = ship;
      const fl = 10 + Math.random() * 8, fg = ctx.createLinearGradient(0, y + 8, 0, y + 8 + fl);
      fg.addColorStop(0, '#FFE08A'); fg.addColorStop(1, 'rgba(255,122,26,0)'); ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(x - 5, y + 8); ctx.lineTo(x, y + 10 + fl); ctx.lineTo(x + 5, y + 8); ctx.fill();
      ctx.shadowColor = C.a; ctx.shadowBlur = 16; ctx.fillStyle = C.t;
      ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.quadraticCurveTo(x + 9, y - 2, x + 7, y + 9); ctx.lineTo(x - 7, y + 9); ctx.quadraticCurveTo(x - 9, y - 2, x, y - 16); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = C.o; ctx.beginPath(); ctx.moveTo(x - 7, y + 2); ctx.lineTo(x - 13, y + 11); ctx.lineTo(x - 6, y + 9); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 7, y + 2); ctx.lineTo(x + 13, y + 11); ctx.lineTo(x + 6, y + 9); ctx.fill();
      ctx.fillStyle = '#4c8fe0'; ctx.beginPath(); ctx.arc(x, y - 4, 2.8, 0, 6.28); ctx.fill();
    };
    return g;
  }

  function mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; }

  const GAMES = { snake: Snake, memory: Memory, '2048': T2048, rocket: Rocket };
  let running = false, last = 0;
  function select(k) {
    root.querySelectorAll('[data-game]').forEach(b => b.setAttribute('aria-selected', b.dataset.game === k));
    game = GAMES[k](); game.over = (s, text) => { running = game.key === 'memory' || game.key === '2048' ? running : false; overlay(text || `Fim de jogo: ${s} pontos`, 'Jogar de novo'); };
    bestEl.textContent = best(k); scoreEl.textContent = 0; dpad.hidden = !game.dpad;
    game.resize && game.resize(); game.draw(); overlay(game.hint, 'Jogar');
    running = false;
  }
  function overlay(text, btn) { msg.textContent = text; startBtn.textContent = btn; msg.parentElement.parentElement.classList.remove('playing'); }
  function start() { game.start(); running = true; msg.parentElement.parentElement.classList.add('playing'); cv.focus({ preventScroll: true }); last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (game) { game.update(dt); game.draw(); }
    if (running || game.key === 'memory') raf = requestAnimationFrame(loop);
  }
  startBtn.addEventListener('click', start);
  root.querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => select(b.dataset.game)));

  const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
  const inView = () => { const r = root.getBoundingClientRect(); return r.top < innerHeight * .7 && r.bottom > innerHeight * .3; };
  addEventListener('keydown', e => {
    if (!running || !inView() || !DIRS[e.key] || !game.input) return;
    e.preventDefault(); const [x, y] = DIRS[e.key]; game.input({ x, y });
  });
  addEventListener('keyup', e => { if (game && game.keyup && DIRS[e.key]) game.keyup(); });
  dpad.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b || !running) return; const [x, y] = b.dataset.d.split(',').map(Number); game.input({ x, y }); setTimeout(() => game.keyup && game.keyup(), 160); });

  let ts = null;
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ts = { x: e.clientX, y: e.clientY };
    if (!running && game.key !== 'memory') return;
    if (game.click && running) game.click(x, y);
    if (game.move) game.move(x);
  });
  cv.addEventListener('pointermove', e => { if (!running || !game.move) return; if (e.pointerType === 'mouse' || ts) game.move(e.clientX - cv.getBoundingClientRect().left); });
  cv.addEventListener('pointerup', e => {
    if (!ts || !running || !game.dpad) { ts = null; return; }
    const dx = e.clientX - ts.x, dy = e.clientY - ts.y; ts = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    game.input(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
  });
  cv.addEventListener('touchmove', e => { if (running) e.preventDefault(); }, { passive: false });

  new ResizeObserver(fit).observe(cv.parentElement);
  select('snake'); fit();
})();
