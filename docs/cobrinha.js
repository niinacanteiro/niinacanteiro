// Cobrinha jogável sobre o gráfico de contribuições do GitHub (niinacanteiro)
(() => {
  const cv = document.getElementById('sn-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const COLS = 53, ROWS = 7, CELL = 10, GAP = 3, PAD = 3;
  const W = PAD * 2 + COLS * (CELL + GAP) - GAP, H = PAD * 2 + ROWS * (CELL + GAP) - GAP;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
  const scoreEl = document.getElementById('sn-score'), bestEl = document.getElementById('sn-best');
  const msg = document.getElementById('sn-msg'), startBtn = document.getElementById('sn-start');
  const LV = ['rgba(255,170,80,.07)', '#5a2e12', '#8B4513', '#FF7A1A', '#FFC531'];
  let grid = [], snake = [], dir = { x: 1, y: 0 }, next = dir, timer = null, score = 0, speed = 130;
  let best = +(localStorage.getItem('nina-snake-best') || 0); bestEl.textContent = best;

  function emptyGrid() { grid = Array.from({ length: COLS }, () => Array(ROWS).fill(0)); }
  function seedRandom() { // tabuleiro reserva, se a API não responder
    emptyGrid();
    for (let i = 0; i < 70; i++) grid[Math.random() * COLS | 0][Math.random() * ROWS | 0] = 1 + (Math.random() * 4 | 0);
  }
  let original = null;
  async function loadGrid() {
    try {
      const r = await fetch('https://github-contributions-api.jogruber.de/v4/niinacanteiro?y=last');
      const j = await r.json();
      const days = j.contributions.slice(-COLS * ROWS);
      const firstDow = new Date(days[0].date + 'T12:00:00').getDay();
      emptyGrid();
      days.forEach((d, i) => { const k = i + firstDow, c = k / ROWS | 0, w = k % ROWS; if (c < COLS) grid[c][w] = d.level; });
      if (!days.some(d => d.level)) seedRandom();
    } catch { seedRandom(); }
    original = grid.map(c => c.slice());
    draw();
  }
  function remaining() { return grid.some(c => c.some(v => v > 0)); }
  function addFood() { // mantém sempre algo para comer
    let tries = 0;
    while (tries++ < 200) {
      const x = Math.random() * COLS | 0, y = Math.random() * ROWS | 0;
      if (!grid[x][y] && !snake.some(s => s.x === x && s.y === y)) { grid[x][y] = 1 + (Math.random() * 4 | 0); return; }
    }
  }
  function px(i) { return PAD + i * (CELL + GAP); }
  function lerp(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  const STOPS = [[255, 197, 49], [255, 122, 26], [139, 69, 19]]; // amarelo → laranja → marrom
  function grad(t) { return t < .5 ? lerp(STOPS[0], STOPS[1], t * 2) : lerp(STOPS[1], STOPS[2], (t - .5) * 2); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { ctx.fillStyle = LV[grid[x]?.[y] || 0]; rr(px(x), px(y), CELL, CELL, 2); }
    const n = snake.length;
    snake.forEach((s, i) => {
      const [r, g, b] = grad(n > 1 ? i / (n - 1) : 0);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.shadowColor = i === 0 ? 'rgba(255,197,49,.9)' : 'transparent'; ctx.shadowBlur = i === 0 ? 8 : 0;
      const inset = i === 0 ? -1 : Math.min(2, i / n * 3);
      rr(px(s.x) + inset, px(s.y) + inset, CELL - inset * 2, CELL - inset * 2, 3);
    });
    ctx.shadowBlur = 0;
  }
  function step() {
    dir = next;
    const h = snake[0];
    const nh = { x: (h.x + dir.x + COLS) % COLS, y: (h.y + dir.y + ROWS) % ROWS };
    if (snake.some(s => s.x === nh.x && s.y === nh.y)) return over();
    snake.unshift(nh);
    const v = grid[nh.x][nh.y];
    if (v) {
      score += v; grid[nh.x][nh.y] = 0; scoreEl.textContent = score;
      if (!remaining()) addFood();
      if (score % 10 < v && speed > 70) { speed -= 6; restartTimer(); }
    } else snake.pop();
    draw();
  }
  function restartTimer() { clearInterval(timer); timer = setInterval(step, speed); }
  function over() {
    clearInterval(timer); timer = null;
    if (score > best) { best = score; localStorage.setItem('nina-snake-best', best); bestEl.textContent = best; }
    msg.textContent = `Fim de jogo! ${score} pontos. Toque em Jogar para tentar de novo.`; msg.hidden = false;
    startBtn.textContent = 'Jogar de novo';
  }
  function start() {
    if (original) grid = original.map(c => c.slice());
    snake = [{ x: 6, y: 3 }, { x: 5, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 3 }];
    dir = next = { x: 1, y: 0 }; score = 0; speed = 130; scoreEl.textContent = 0;
    msg.hidden = true; startBtn.textContent = 'Recomeçar';
    draw(); restartTimer();
    cv.closest('.snake-stage').scrollLeft = 0;
  }
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  function turn(d) { const nd = DIRS[d]; if (!nd || !timer) return; if (nd.x === -dir.x && nd.y === -dir.y) return; next = nd; }
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  document.addEventListener('keydown', e => {
    if (!timer || !KEYS[e.key]) return;
    const r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    e.preventDefault(); turn(KEYS[e.key]);
  });
  document.querySelectorAll('.dpad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); turn(b.dataset.d); }));
  let t0 = null;
  const stage = cv.closest('.snake-stage');
  stage.addEventListener('touchstart', e => { t0 = e.touches[0]; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!t0) return; const t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY; t0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
  startBtn.addEventListener('click', start);
  seedRandom(); draw(); loadGrid();
})();
