/* ============================================================
   PUDDLE WORLD KINDS (build 245): maze, ladders, deep
   js/puddle-worlds.js owns the world (timer, going in and out, the hooks); each kind here is an entry in PW_KINDS with the hooks it needs
   (create, generate, build, enter, leave, boot, render, tap, exit, goal - see the banner there). Things that move on their own (racers,
   pawns, folk, fish) are "actors" in the persistent layer (pwActor), updated by one fast timer, pwModeTick.

   MAZE      Find the way out before the timer ends. You only see a few tiles around you (a fog layer), and you can only tap-walk a few
             steps at a time, so the maze is not solved by tapping the exit. Three neighbours are looking too, each exploring with its
             own memory. The exit is a gap in the top wall (map.pwExit -> m.exits -> crossExit -> pwReachedExit -> exit()). Out = a card
             and Embers, better if you are first. Cards are hidden in dead ends.
   LADDERS   A board game. The path is a snake of tiles; the only way to move is the dice (#pwDice). Ladders lift you, snakes drop you,
             a few squares are traps, boosts, gifts or a nap. Two or three neighbours play too, one turn at a time. First to the flag
             wins the best reward; finishing at all pays. The game lives in w.game, so a reload carries on.
   DEEP      A sunken city. Streets, coral, sealed houses, a plaza with a fountain; you swim (slower, floaty), folk who live there give
             you a card and a line, fish swim over everything. Two underwater palettes. Hidden cards as usual.
   ============================================================ */
const PW_FOLK_EMOJI = ['🐰', '🐱', '🦊', '🐸', '🐢', '🐻', '🐼', '🐨', '🦉', '🦁', '🐯', '🧙', '🥷', '🧝', '🦄'];
const pwPickFrom = (arr, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; };
function pwFolk(n) {   // n neighbours to play with: [{ name, emoji }]
  const names = [], emo = pwPickFrom(PW_FOLK_EMOJI, n);
  for (let i = 0; i < n; i++) names.push(randomNpcName('square', names));
  return names.map((name, i) => ({ name, emoji: emo[i] }));
}
const pwFree = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !m.solid[y][x];
const PW_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ============================================================ MAZE ============================================================ */
const PW_MAZE_RADIUS = 3;                // how many tiles around her she can see, and how many steps one tap may walk
const PW_RACER_LINES = ['This way? No... that way.', 'I keep ending up here.', 'Is that the exit? No.', 'Left. Or right. Definitely one of them.', 'Dead end. Again.', 'I smell fresh air. Maybe.'];

function pwMazeGenerate(w) {
  const n = w.cells, W = 2 * n + 1, H = W, rnd = seeded('pw-maze-' + w.seed);
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const sx = n >> 1, sy = n - 1, seen = Array.from({ length: n }, () => Array(n).fill(false)), stack = [[sx, sy]];
  seen[sy][sx] = true; g[2 * sy + 1][2 * sx + 1] = '.';
  while (stack.length) {   // a perfect maze (one way between any two cells), carved depth first
    const [cx, cy] = stack[stack.length - 1], opts = PW_DIRS.filter(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny][nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy] = opts[Math.floor(rnd() * opts.length)], nx = cx + dx, ny = cy + dy;
    g[2 * cy + 1 + dy][2 * cx + 1 + dx] = '.'; g[2 * ny + 1][2 * nx + 1] = '.'; seen[ny][nx] = true; stack.push([nx, ny]);
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)   // a few shortcuts, so it is not only dead ends
    if (g[y][x] === '#' && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0)) && rnd() < 0.06) g[y][x] = '.';
  const spawn = { x: 2 * sx + 1, y: 2 * sy + 1 };                  // the middle cell of the bottom row
  g[spawn.y][spawn.x] = '=';
  // the exit: the top-row cell furthest from the start, by walking distance
  const dist = new Map([[spawn.x + ',' + spawn.y, 0]]), q = [spawn];
  while (q.length) { const c = q.shift(), d = dist.get(c.x + ',' + c.y); PW_DIRS.forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist.has(k) || g[ny][nx] === '#') return; dist.set(k, d + 1); q.push({ x: nx, y: ny }); }); }
  let ex = 1, best = -1; for (let x = 1; x < W; x += 2) { const d = dist.get(x + ',1'); if (d != null && d > best) { best = d; ex = x; } }
  g[0][ex] = '=';
  const other = w.wall === 'h' ? 'r' : 'h';
  const rows = g.map((row, y) => row.map((c, x) => c === '#' ? (rnd() < 0.18 ? other : w.wall) : (c === '.' && rnd() < 0.10 ? ',' : c)).join(''));
  return { w: W, h: H, rows, buildings: [], props: [], spawn, pwExit: { x: ex, y: 0 }, solveSteps: best };
}
function pwMazeSync(w) {
  const data = state.districtData[PW_KEY]; if (!data || !data.racers) return;
  data.racers.forEach((r, i) => {
    if (r.out) { pwActorRemove(r.id); return; }
    pwActor(r.id, r.x + (i - 1) * 0.14, r.y, `<span>${r.emoji}</span><b class="pw-tag">${escapeHtml(r.name)}</b>`, 'pw-racer');
  });
}
function pwMazeTick(w, now) {
  const data = state.districtData[PW_KEY], m = getMap(PW_KEY); if (!data || !data.racers) return;
  let moved = false;
  data.racers.forEach(r => {
    if (r.out || now < r.next) return;
    r.next = now + r.ms * (0.8 + Math.random() * 0.5);
    r.seen[r.x + ',' + r.y] = 1;
    const opts = PW_DIRS.map(([dx, dy]) => ({ x: r.x + dx, y: r.y + dy })).filter(c => pwFree(m, c.x, c.y) && !r.seen[c.x + ',' + c.y]);
    let to = null;
    if (opts.length) { const up = opts.find(c => c.y < r.y); to = up && Math.random() < 0.4 ? up : opts[Math.floor(Math.random() * opts.length)]; r.stack.push([r.x, r.y]); }   // they know the way out is somewhere up
    else if (r.stack.length) { const [bx, by] = r.stack.pop(); to = { x: bx, y: by }; }
    if (!to) return;
    r.x = to.x; r.y = to.y; moved = true;
    if (m.exits[r.x + ',' + r.y]) {
      r.out = now; (w.outBy = w.outBy || []).push(r.name); saveState();
      toast(`${r.emoji} ${r.name} found the way out!`); sfx('soft');
    }
  });
  if (moved) pwMazeSync(w);
}
let pwFogRaf = 0;
function pwFogEl(create) {
  let f = townView.querySelector(':scope > .pw-fog');
  if (!f && create) { f = document.createElement('div'); f.className = 'pw-fog'; townView.appendChild(f); }
  return f;
}
function pwFogLoop() {
  const w = pwActive();
  if (!w || w.kind !== 'maze' || state.currentDistrict !== PW_KEY) { pwFogOff(); return; }
  const f = pwFogEl(true);
  if (playerEl && playerEl.isConnected) {
    const a = playerEl.getBoundingClientRect(), v = townView.getBoundingClientRect();
    f.style.setProperty('--fx', (a.left + a.width / 2 - v.left) + 'px'); f.style.setProperty('--fy', (a.top + a.height / 2 - v.top) + 'px');
    f.style.setProperty('--fr', (tilePx * PW_MAZE_RADIUS) + 'px');
  }
  pwFogRaf = requestAnimationFrame(pwFogLoop);
}
function pwFogOn() { if (!pwFogRaf) pwFogRaf = requestAnimationFrame(pwFogLoop); }
function pwFogOff() { if (pwFogRaf) cancelAnimationFrame(pwFogRaf); pwFogRaf = 0; const f = townView && pwFogEl(); if (f) f.remove(); }

PW_KINDS.maze = {
  weight: 2,
  create(w, rnd, pick, last) {
    const b = pick(pwBiomesFor(false).filter(x => x.id !== last.biome));
    w.cells = 7 + Math.floor(rnd() * 3);                 // 7, 8 or 9 cells a side
    w.size = [2 * w.cells + 1, 2 * w.cells + 1]; w.wall = rnd() < 0.5 ? 'h' : 'r'; w.biome = b.id;
    w.name = b.word + ' ' + pick(['Labyrinth', 'Maze', 'Warren', 'Tangle']);
    w.ms = (5 + rnd() * 2) * 60 * 1000; w.outBy = [];
    w.intro = 'Find the way out before it fades. You can only see a little way ahead, and the others are looking too.';
  },
  generate: pwMazeGenerate,
  build(w, data, m) {
    // three cards in the dead ends furthest from the start, one of them a treasure
    const walk = [], free = (x, y) => pwFree(m, x, y);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (free(x, y) && PW_DIRS.filter(([dx, dy]) => free(x + dx, y + dy)).length === 1) { const d = Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y); if (d > 4) walk.push({ x, y, d }); }   // never right beside the start
    walk.sort((a, b) => b.d - a.d); let pool = walk.slice(0, Math.max(3, Math.ceil(walk.length / 2)));   // (fewer than 3 when the maze has few far dead ends; topped up below)
    if (pool.length < 3) {   // a small maze with few dead ends: fill up from the open tiles furthest from the start
      const more = []; for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (free(x, y) && !pool.some(p => p.x === x && p.y === y) && Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) > 4) more.push({ x, y, d: Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) });
      more.sort((a, b) => b.d - a.d); pool = pool.concat(more.slice(0, 6));
    }
    pwPickFrom(pool, 3).forEach((s, i) => data.items.push({ id: 'item-pw-' + i, x: s.x, y: s.y, cardId: pwCardId(i === 2 ? rollRewardRarity(false) : (Math.random() < 0.35 ? 'rare' : 'common')),
      collected: false, spawnedAt: 0, collectedAt: null, fixed: true, treasure: i === 2 }));
    data.spirits = [];
    const now = Date.now();
    data.racers = pwFolk(3).map((f, i) => ({ id: 'racer' + i, name: f.name, emoji: f.emoji, x: m.spawn.x, y: m.spawn.y, seen: {}, stack: [], ms: 520 + i * 130, next: now + 2200 + i * 1400, out: 0 }));
  },
  enter(w) { pwFogOn(); pwMazeSync(w); },
  boot(w) { pwFogOn(); },
  leave(w) { pwFogOff(); },
  render(w, data, add) {
    const m = getMap(PW_KEY), ex = m.exits && Object.keys(m.exits)[0];
    if (ex) { const [x, y] = ex.split(',').map(Number); add('pw-exit', x, y, '<span>🌀</span>'); }
    pwFogOn(); pwMazeSync(w);
  },
  tap(w, tx, ty) {
    const data = state.districtData[PW_KEY], m = getMap(PW_KEY);
    const racer = (data.racers || []).find(r => !r.out && Math.round(r.x) === tx && Math.round(r.y) === ty);
    if (racer) { lifeFx('npc-bubble', racer.x, racer.y, `<span>${PW_RACER_LINES[Math.floor(Math.random() * PW_RACER_LINES.length)]}</span>`, 1800); sfx('tap'); return true; }
    if (m.solid[ty][tx]) return false;
    if (Math.abs(tx - state.playerPos.x) + Math.abs(ty - state.playerPos.y) > PW_MAZE_RADIUS + 1) { townLog.textContent = 'You cannot see that far. Feel your way along.'; sfx('soft'); return true; }
    const path = findPath(m, data, state.playerPos, (x, y) => x === tx && y === ty);
    if (!path || path.length > PW_MAZE_RADIUS + 3) { townLog.textContent = 'That way is not so simple. Take it a few steps at a time.'; sfx('soft'); return true; }
    return false;
  },
  exit(w) {
    if (w.escaped) return; w.escaped = true;
    const rank = (w.outBy || []).length + 1, first = rank === 1, emb = first ? 10 : rank === 2 ? 6 : rank === 3 ? 4 : 3;
    bumpStat('puddleWins', 1);
    pwLeave('done', false, () => {
      addPebbles(emb, 'puddle-world'); toast(`🌀 ${first ? 'First one out! ' : ''}+${emb} ${GAME.currency.many}`);
      const ks = first ? worldCardId('puddle', 'maze') : null;   // the first one out takes the maze's own card home, once
      pwGiveCard(ks || pwCardId(first ? rollRewardRarity(false) : (Math.random() < 0.5 ? 'rare' : 'common')), ks ? 'A keepsake from the maze' : first ? 'First one out of the maze' : 'Out of the maze');
    });
  },
  goal(w) { return { icon: '🧭', text: 'Find the way out of the maze', hint: 'You can only see a little way ahead. The way out is a gap in the top wall, and the others are looking for it too.' }; },
  tick(w, now) { pwMazeTick(w, now); }
};

/* ============================================================ LADDERS ============================================================ */
const PW_DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const PWB = { busy: false, timer: 0, hintAt: 0, speed: 1, paused: false };   // speed scales every animation delay below; paused stops the neighbours playing by themselves (both only for tests)
const pwT = ms => Math.max(3, Math.round(ms * PWB.speed)), pwSet = (fn, ms) => setTimeout(fn, pwT(ms));        // in-memory only: the game itself is w.game
const PW_BOARD_SPECIAL = { trap: { icon: '🕳️', text: 'a muddy hole: back 3' }, boost: { icon: '💨', text: 'a gust of wind: forward 3' }, gift: { icon: '🎁', text: 'a gift' }, skip: { icon: '💤', text: 'a nap: miss a turn' } };

function pwBoardGenerate(w) {
  const rnd = seeded('pw-board-' + w.seed), W = 9, H = 12, cols = 7, rows = 5;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const r = rnd(); g[y][x] = r < 0.12 ? ',' : r < 0.16 ? 'o' : r < 0.19 ? 'i' : r < 0.22 ? '~' : '.'; }
  for (let x = 0; x < W; x++) { g[0][x] = 'o'; g[H - 1][x] = 'i'; } for (let y = 0; y < H; y++) { g[y][0] = 'i'; g[y][W - 1] = 'o'; }
  const cells = [];   // the board: left to right along the bottom row, a step up at the end, right to left, and so on
  for (let r = 0; r < rows; r++) {
    const y = H - 2 - 2 * r, ltr = r % 2 === 0;
    for (let c = 0; c < cols; c++) cells.push([ltr ? 1 + c : cols - c, y]);
    if (r < rows - 1) cells.push([ltr ? cols : 1, y - 1]);
  }
  cells.forEach(([x, y]) => { g[y][x] = '='; });
  const N = cells.length, used = new Set(), jumps = {}, spec = {};
  const free = i => i >= 1 && i <= N - 2 && !used.has(i);
  const jump = ladder => {
    for (let t = 0; t < 80; t++) {
      const d = 6 + Math.floor(rnd() * 11), from = ladder ? 2 + Math.floor(rnd() * Math.max(1, N - 4 - d)) : d + 2 + Math.floor(rnd() * Math.max(1, N - 3 - d - 2)), to = ladder ? from + d : from - d;
      if (free(from) && free(to) && to <= N - 2 && to >= 2 && from <= N - 3) { used.add(from); used.add(to); jumps[from] = { to, t: ladder ? 'ladder' : 'snake' }; return; }
    }
  };
  for (let i = 0; i < 4; i++) { jump(true); jump(false); }
  [['trap', 2], ['boost', 2], ['gift', 2], ['skip', 1]].forEach(([t, k]) => { for (let n = 0; n < k; n++) for (let tries = 0; tries < 60; tries++) { const i = 3 + Math.floor(rnd() * (N - 6)); if (free(i)) { used.add(i); spec[i] = t; break; } } });
  w.board = { cells, jumps, spec };
  return { w: W, h: H, rows: g.map(r => r.join('')), buildings: [], props: [], spawn: { x: cells[0][0], y: cells[0][1] } };
}
const pwBoardCell = (w, i) => ({ x: w.board.cells[i][0], y: w.board.cells[i][1] });
function pwBoardPawns(w) {   // the neighbours' pawns, drawn in the actor layer, nudged apart when they share a square
  const g = w.game; if (!g || pwActive() !== w || state.currentDistrict !== PW_KEY) return;
  for (let k = 1; k < g.n; k++) {
    const c = pwBoardCell(w, g.pos[k]), off = [[-0.22, -0.18], [0.22, -0.18], [0, 0.2]][(k - 1) % 3];
    pwActor('pawn' + k, c.x + off[0], c.y + off[1], `<span>${g.emoji[k]}</span><b class="pw-tag">${escapeHtml(g.names[k])}</b>`, 'pw-pawn' + (g.rank.includes(k) ? ' done' : ''));
  }
}
function pwBoardUi() {
  const w = pwActive(), el = document.getElementById('pwDice'); if (!el) return;
  const on = !!w && w.kind === 'ladders' && state.currentDistrict === PW_KEY && !!w.game;
  el.classList.toggle('hidden', !on); document.body.classList.toggle('pw-board', on); if (!on) return;
  const g = w.game, mine = g.turn === 0 && !PWB.busy && !g.rank.includes(0);
  document.getElementById('pwdRoll').disabled = !mine;
  document.getElementById('pwdLine').textContent = g.over ? 'The game is over' : mine ? 'Your turn - roll the dice' : `${g.names[g.turn]} is playing…`;
  document.getElementById('pwdSq').textContent = `Square ${g.pos[0] + 1} of ${w.board.cells.length}`;
}
function pwBoardNext() {
  const w = pwActive(); if (!w || w.kind !== 'ladders' || !w.game || PWB.busy || PWB.paused || document.hidden) { pwBoardUi(); return; }
  const g = w.game;
  for (let i = 0; i < g.n && g.rank.includes(g.turn); i++) g.turn = (g.turn + 1) % g.n;
  if (g.skip[g.turn] > 0) {
    g.skip[g.turn]--; toast(`${g.turn === 0 ? 'You' : g.names[g.turn]} sleep${g.turn === 0 ? '' : 's'} through this turn.`); g.turn = (g.turn + 1) % g.n; saveState();
    clearTimeout(PWB.timer); PWB.timer = pwSet(pwBoardNext, 900); pwBoardUi(); return;
  }
  pwBoardUi();
  if (g.turn !== 0) { clearTimeout(PWB.timer); const who = g.turn; PWB.timer = pwSet(() => pwBoardRoll(who), 900 + Math.random() * 500); }
}
function pwBoardRoll(who, forced) {
  const w = pwActive(); if (!w || w.kind !== 'ladders' || !w.game) return false;
  const g = w.game; if (PWB.busy || g.turn !== who || g.rank.includes(who)) return false;
  PWB.busy = true; pwBoardUi();
  const v = forced || 1 + Math.floor(Math.random() * 6), face = document.getElementById('pwdFace');
  let n = 0; const spin = setInterval(() => { face.textContent = PW_DICE[Math.floor(Math.random() * 6)]; face.classList.add('roll'); if (++n >= 6) { clearInterval(spin); face.textContent = PW_DICE[v - 1]; face.classList.remove('roll'); settle(); } }, pwT(90));
  const settle = () => {
    const c = pwBoardCell(w, g.pos[who]); lifeFx('npc-bubble', c.x, c.y, `<span>${PW_DICE[v - 1]} ${v}</span>`, 1300); g.last = { who, v }; sfx('tap');
    pwSet(() => pwBoardMove(w, who, v), 450);
  };
  return true;
}
function pwBoardPlace(w, who, i) {
  if (pwActive() !== w || state.currentDistrict !== PW_KEY) return;   // a delayed step must never move her once the world is gone
  const g = w.game; g.pos[who] = i; const c = pwBoardCell(w, i);
  if (who === 0) { const prev = state.playerPos; state.playerPos = { x: c.x, y: c.y }; if (typeof followPlayer === 'function') followPlayer(prev); positionPlayer(true); updateCamera(true); sfx('step'); }
  else pwBoardPawns(w);
  pwBoardUi();
}
function pwBoardMove(w, who, v) {
  const g = w.game, N = w.board.cells.length, steps = [];
  let i = g.pos[who], dir = 1;
  for (let k = 0; k < v; k++) { if (i === N - 1) dir = -1; i += dir; steps.push(i); }   // too many pips for the last square: bounce back off the flag
  const next = () => {
    if (!pwActive() || pwActive() !== w) return;
    if (steps.length) { pwBoardPlace(w, who, steps.shift()); pwSet(next, 240); } else pwSet(() => pwBoardLanded(w, who), 280);
  };
  next();
}
function pwBoardLanded(w, who) {
  if (pwActive() !== w) return;
  const g = w.game, N = w.board.cells.length, name = who === 0 ? 'You' : g.names[who], verb = who === 0 ? '' : 's';
  let i = g.pos[who], moved = false;
  const j = w.board.jumps[i];
  const after = () => {
    const sp = w.board.spec[g.pos[who]];
    const finish = () => {
      if (g.pos[who] === N - 1 && !g.rank.includes(who)) {
        g.rank.push(who); const place = g.rank.length;
        toast(who === 0 ? `🏁 You reached the flag${place === 1 ? ' first!' : '!'}` : `🏁 ${name} reached the flag${place === 1 ? ' first' : ''}.`); sfx(who === 0 ? 'claim' : 'soft');
        if (who === 0) { pwBoardWin(w, place); return; }
      }
      g.turn = (g.turn + 1) % g.n; PWB.busy = false; saveState(); pwBoardUi(); clearTimeout(PWB.timer); PWB.timer = pwSet(pwBoardNext, 500);
    };
    if (!sp || g.rank.includes(who)) { finish(); return; }
    const c = pwBoardCell(w, g.pos[who]); lifeFx('npc-bubble', c.x, c.y, `<span>${PW_BOARD_SPECIAL[sp].icon}</span>`, 1300);
    if (sp === 'trap') { toast(`${PW_BOARD_SPECIAL[sp].icon} ${name} step${verb} in a muddy hole and slip${verb} back 3.`); pwSet(() => { pwBoardPlace(w, who, Math.max(0, g.pos[who] - 3)); pwSet(finish, 450); }, 600); return; }
    if (sp === 'boost') { toast(`${PW_BOARD_SPECIAL[sp].icon} A gust of wind pushes ${who === 0 ? 'you' : name} forward 3!`); pwSet(() => { pwBoardPlace(w, who, Math.min(N - 1, g.pos[who] + 3)); pwSet(finish, 450); }, 600); return; }
    if (sp === 'skip') { g.skip[who] = 1; toast(`💤 ${name} nod${verb === 's' ? 's' : ''} off and will miss the next turn.`); pwSet(finish, 700); return; }
    if (sp === 'gift') {
      if (who === 0 && !(g.gifted || (g.gifted = {}))[g.pos[0]]) { g.gifted[g.pos[0]] = 1; saveState(); pwSet(() => { pwGiveCard(pwCardId(Math.random() < 0.35 ? 'rare' : 'common'), 'A gift on the board'); pwSet(finish, 600); }, 500); return; }
      toast(`🎁 ${name} open${verb === 's' ? 's' : ''} a gift box.`); pwSet(finish, 600); return;
    }
    finish();
  };
  if (j) {
    toast(j.t === 'ladder' ? `🪜 ${name} climb${verb} a ladder to square ${j.to + 1}!` : `🐍 ${name} slide${verb} down a snake to square ${j.to + 1}.`); sfx(j.t === 'ladder' ? 'found' : 'soft');
    pwSet(() => { pwBoardPlace(w, who, j.to); pwSet(after, 600); }, 650);
  } else after();
}
function pwBoardWin(w, place) {
  const emb = place === 1 ? 10 : place === 2 ? 6 : 4;
  bumpStat('puddleWins', 1); PWB.busy = true;
  pwLeave('done', false, () => {
    addPebbles(emb, 'puddle-world'); toast(`🌀 ${place === 1 ? 'You won the board! ' : place === 2 ? 'Second place. ' : 'You finished. '}+${emb} ${GAME.currency.many}`);
    const ks = place === 1 ? worldCardId('puddle', 'ladders') : null;   // winning the board earns its own card, once
    pwGiveCard(ks || pwCardId(place === 1 ? rollRewardRarity(false) : (Math.random() < 0.5 ? 'rare' : 'common')), ks ? 'A keepsake from the board' : place === 1 ? 'Winner of the board' : 'A prize from the board');
  });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pwBoardNext(); });   // the game waits while the app is hidden
document.getElementById('pwdRoll').addEventListener('click', () => { const w = pwActive(); if (w && w.game && w.game.turn === 0) pwBoardRoll(0); });

PW_KINDS.ladders = {
  weight: 2,
  create(w, rnd, pick, last) {
    const b = pick(pwBiomesFor(false).filter(x => x.id !== last.biome));
    w.biome = b.id; w.size = [9, 12]; w.name = b.word + ' ' + pick(['Steps', 'Stairway', 'Ascent', 'Climb', 'Gauntlet']);
    w.ms = (5 + rnd() * 2) * 60 * 1000;
    w.intro = 'Roll the dice to move - it is the only way. Ladders lift you, snakes drop you. First to the flag wins.';
  },
  generate: pwBoardGenerate,
  build(w, data, m) {
    data.spirits = [];
    const folk = pwFolk(2 + Math.floor(Math.random() * 2));
    w.game = { n: 1 + folk.length, names: ['You'].concat(folk.map(f => f.name)), emoji: [state.character.emoji || '🧑'].concat(folk.map(f => f.emoji)), pos: Array(1 + folk.length).fill(0), skip: Array(1 + folk.length).fill(0), turn: 0, rank: [], gifted: {}, last: null };
  },
  enter(w) { PWB.busy = false; pwBoardPawns(w); pwBoardUi(); clearTimeout(PWB.timer); PWB.timer = pwSet(pwBoardNext, 1200); },
  boot(w) {   // a reload mid-game: put everybody back on their squares and carry on
    PWB.busy = false; if (w.game) { const c = pwBoardCell(w, w.game.pos[0]); state.playerPos = { x: c.x, y: c.y }; }
    pwBoardUi(); clearTimeout(PWB.timer); PWB.timer = pwSet(pwBoardNext, 1500);
  },
  leave(w) { clearTimeout(PWB.timer); PWB.busy = false; const el = document.getElementById('pwDice'); if (el) el.classList.add('hidden'); document.body.classList.remove('pw-board'); },
  render(w, data, add) {
    const N = w.board.cells.length;
    w.board.cells.forEach(([x, y], i) => {
      const j = w.board.jumps[i], sp = w.board.spec[i];
      add('pw-num', x, y, `<i>${i + 1}</i>`);
      if (i === 0) add('pw-mark', x, y, '<span>🚩</span>');
      else if (i === N - 1) add('pw-mark', x, y, '<span>🏁</span>');
      else if (j) add('pw-mark ' + j.t, x, y, `<span>${j.t === 'ladder' ? '🪜' : '🐍'}</span><b>${j.t === 'ladder' ? '↑' : '↓'}${j.to + 1}</b>`);
      else if (sp) add('pw-mark special', x, y, `<span>${PW_BOARD_SPECIAL[sp].icon}</span>`);
    });
    pwBoardPawns(w); pwBoardUi();
  },
  tap(w, tx, ty) {
    const now = Date.now(); if (now - PWB.hintAt > 2500) { PWB.hintAt = now; townLog.textContent = 'You cannot walk here. Roll the dice to move.'; sfx('soft'); }
    return true;
  },
  goal(w) { return { icon: '🎲', text: `Reach square ${w.board.cells.length}`, hint: 'Roll the dice to move: it is the only way. Ladders lift you up, snakes slide you down, and the others are playing too.' }; }
};

/* ============================================================ DEEP ============================================================ */
const PW_DEEP_NAMES = ['Marina', 'Coral', 'Bubbles', 'Finn', 'Pearl', 'Squidley', 'Tide', 'Kelp', 'Shelly', 'Brine', 'Sandy', 'Drift'];
const PW_DEEP_FOLK = ['🧜‍♀️', '🧜‍♂️', '🐙', '🦑', '🐢', '🦀', '🐡', '🐬', '🦞'];
// PW_DEEP_LINES: in content/dialogue.js (the game's words and data, kept apart from the code)
const PW_DEEP_GIFT = ['Here, I found this in the sand. It is yours.', 'A traveller left this behind. Take it.', 'It was going to float away anyway.', 'I keep these for visitors. You are the first in a while.'];
const PWD = { stepBefore: null };
function pwDeepGenerate(w) {
  const [W, H] = w.size, rnd = seeded('pw-deep-' + w.seed);
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let x = 0; x < W; x++) { g[0][x] = 'o'; g[H - 1][x] = 'i'; } for (let y = 0; y < H; y++) { g[y][0] = 'i'; g[y][W - 1] = 'o'; }
  const sx = [], sy = []; for (let x = 5; x < W - 3; x += 5) sx.push(x); for (let y = 4; y < H - 4; y += 5) sy.push(y); sy.push(H - 2);
  sx.forEach(x => { for (let y = 1; y < H - 1; y++) g[y][x] = '='; }); sy.forEach(y => { for (let x = 1; x < W - 1; x++) g[y][x] = '='; });
  // the blocks between the streets
  const xb = [0].concat(sx, [W - 1]), yb = [0].concat(sy.slice(0, -1), [H - 2]), blocks = [];
  for (let i = 0; i < xb.length - 1; i++) for (let j = 0; j < yb.length - 1; j++) { const x0 = xb[i] + 1, x1 = xb[i + 1] - 1, y0 = yb[j] + 1, y1 = yb[j + 1] - 1; if (x1 >= x0 && y1 >= y0) blocks.push({ x0, x1, y0, y1 }); }
  const cx = (W - 1) / 2, cy = (H - 1) / 2, props = [], buildings = [];
  blocks.sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - cx, (a.y0 + a.y1) / 2 - cy) - Math.hypot((b.x0 + b.x1) / 2 - cx, (b.y0 + b.y1) / 2 - cy));
  blocks.forEach((b, bi) => {
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1, kind = bi === 0 ? 'plaza' : bw >= 3 && bh >= 3 && rnd() < 0.55 ? 'house' : rnd() < 0.5 ? 'coral' : 'ruins';
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) g[y][x] = rnd() < 0.18 ? ',' : '.';
    if (kind === 'plaza') { const px = Math.round((b.x0 + b.x1) / 2), py = Math.round((b.y0 + b.y1) / 2); g[py][px] = '.'; props.push({ id: 'deep-fountain', type: 'fountain', x: px, y: py, title: 'A fountain that bubbles upward', desc: 'The bubbles rise and never quite reach the top.' }); }
    else if (kind === 'house') {
      const type = bw >= 3 && rnd() < 0.3 ? 'bakery' : rnd() < 0.5 ? 'cottage' : 'nook', bt = BUILDING_TYPES[type], bx = b.x0 + Math.floor(rnd() * Math.max(1, bw - bt.w + 1)), by = b.y1 - bt.h + 1;
      if (bx + bt.w - 1 <= b.x1 && by >= b.y0) {
        for (let y = by; y < by + bt.h; y++) for (let x = bx; x < bx + bt.w; x++) g[y][x] = '.';
        buildings.push({ id: 'deep-house-' + bi, type, x: bx, y: by, locked: ['The door is sealed with coral.', 'Barnacles have grown over the latch.', 'Nobody answers. Something inside is humming.', 'Shuttered. A small crab guards the step.'][Math.floor(rnd() * 4)], roof: '#d9647a', roof2: '#b04a64' });
      }
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (g[y][x] === '.' && rnd() < 0.2) g[y][x] = 'oih'[Math.floor(rnd() * 3)];
    }
    else if (kind === 'coral') { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) g[y][x] = rnd() < 0.55 ? 'oih'[Math.floor(rnd() * 3)] : ','; }
    else { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const edge = x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1; g[y][x] = edge && rnd() < 0.7 ? 'r' : rnd() < 0.15 ? 'h' : '.'; } }
  });
  // sea-lamps at some street corners
  sx.concat([]).slice(0, 2).forEach((x, i) => { const y = sy[Math.min(i, sy.length - 2)] + 1; if (y < H - 2 && g[y][x + 1] === '.') { g[y][x + 1] = '.'; props.push({ id: 'deep-lamp' + i, type: 'lamp', x: x + 1, y, title: 'A glowing sea-lamp', desc: 'A jar of something that shines by itself.' }); } });
  const spawn = { x: W >> 1, y: H - 2 };
  g[spawn.y][spawn.x] = '=';
  buildings.forEach(b => { const t = BUILDING_TYPES[b.type]; for (let x = b.x; x < b.x + t.w; x++) g[b.y + t.h][x] = g[b.y + t.h][x] === '=' ? '=' : '.'; });
  const seen = new Set([spawn.x + ',' + spawn.y]), q = [spawn], blockedByBld = (x, y) => buildings.some(b => { const t = BUILDING_TYPES[b.type]; return x >= b.x && x < b.x + t.w && y >= b.y && y < b.y + t.h; }) || props.some(p => p.x === x && p.y === y);
  while (q.length) { const c = q.shift(); PW_DIRS.forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || SOLID_TERRAIN.includes(g[ny][nx]) || blockedByBld(nx, ny)) return; seen.add(k); q.push({ x: nx, y: ny }); }); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!SOLID_TERRAIN.includes(g[y][x]) && !seen.has(x + ',' + y) && !blockedByBld(x, y)) g[y][x] = 'o';
  return { w: W, h: H, rows: g.map(r => r.join('')), buildings, props, spawn };
}
function pwDeepSync(w) {
  const data = state.districtData[PW_KEY]; if (!data) return;
  (data.folk || []).forEach(f => pwActor(f.id, f.x, f.y, `<span>${f.emoji}</span><b class="pw-tag">${escapeHtml(f.name)}</b>`, 'pw-folk' + (f.given ? '' : ' gift')));
  (data.fish || []).forEach(f => { const e = pwActor(f.id, f.x, f.y, `<span>${f.emoji}</span>`, 'pw-fish'); if (e) e.classList.toggle('flip', f.vx > 0); });
  if (playerEl) playerEl.classList.add('pw-swim');
}
function pwDeepTick(w, now, dt) {
  const data = state.districtData[PW_KEY], m = getMap(PW_KEY); if (!data) return;
  (data.fish || []).forEach(f => {
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 0.6 || f.x > m.w - 1.6) { f.vx = -f.vx; f.x = Math.max(0.6, Math.min(m.w - 1.6, f.x)); }
    if (f.y < 0.6 || f.y > m.h - 1.6) { f.vy = -f.vy; f.y = Math.max(0.6, Math.min(m.h - 1.6, f.y)); }
    if (Math.random() < dt * 0.15) { f.vx = (Math.random() - 0.5) * 1.6; f.vy = (Math.random() - 0.5) * 0.7; if (Math.abs(f.vx) < 0.25) f.vx = f.vx < 0 ? -0.35 : 0.35; }
  });
  (data.folk || []).forEach(f => {
    if (now < f.next) return; f.next = now + 1500 + Math.random() * 2500;
    if (Math.random() < 0.4) return;
    const opts = PW_DIRS.map(([dx, dy]) => ({ x: f.x + dx, y: f.y + dy })).filter(c => pwFree(m, c.x, c.y) && Math.abs(c.x - f.hx) + Math.abs(c.y - f.hy) <= 3 && !(c.x === state.playerPos.x && c.y === state.playerPos.y)
      && !m.buildings.some(b => c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h) && !m.props.some(p => p.x === c.x && p.y === c.y));
    if (opts.length) { const c = opts[Math.floor(Math.random() * opts.length)]; f.x = c.x; f.y = c.y; }
  });
  pwDeepSync(w);
}
function pwDeepOn() {
  if (PWD.stepBefore == null) PWD.stepBefore = STEP_MS;
  STEP_MS = Math.max(STEP_MS, 240);                        // swimming is slower than walking
  townView.classList.add('pw-deep'); if (playerEl) playerEl.classList.add('pw-swim');
}
function pwDeepOff() {
  if (PWD.stepBefore != null) { STEP_MS = PWD.stepBefore; PWD.stepBefore = null; }
  townView.classList.remove('pw-deep'); if (playerEl) playerEl.classList.remove('pw-swim');
}
function pwFolkTalk(f) {
  if (!pwInside()) return;
  const lines = PW_DEEP_LINES;
  lifeFx('npc-bubble', f.x, f.y, `<span>${f.given ? lines[Math.floor(Math.random() * lines.length)] : PW_DEEP_GIFT[Math.floor(Math.random() * PW_DEEP_GIFT.length)]}</span>`, 2600); sfx('tap');
  if (!f.given) {
    f.given = true; saveState(); pwDeepSync(pwActive());
    const everyone = (state.districtData[PW_KEY].folk || []).every(o => o.given), ks = everyone ? worldCardId('puddle', 'deep') : null;   // the last of the folk gives the city's own card, once
    setTimeout(() => pwGiveCard(ks || pwCardId(Math.random() < 0.35 ? 'rare' : 'common'), ks ? `The city's keepsake, from ${f.name}` : `A gift from ${f.name}`), 900);
  }
}

PW_KINDS.deep = {
  weight: 2,
  create(w, rnd, pick, last) {
    const b = pick(pwBiomesFor(true).filter(x => x.id !== last.biome));
    w.biome = b.id; w.size = [19 + 2 * Math.floor(rnd() * 2), 17 + 2 * Math.floor(rnd() * 2)];
    w.name = pick(['Sunken', 'Coral', 'Pearl', 'Lantern', 'Kelp', 'Tidal']) + ' ' + pick(['Quarter', 'Market', 'Heights', 'Reach', 'Terraces', 'Commons']);
    w.ms = (6 + rnd() * 2) * 60 * 1000;
    w.intro = 'Everything here is underwater. Swim around the sunken city and meet whoever still lives here.';
  },
  generate: pwDeepGenerate,
  build(w, data, m) {
    data.spirits = [];
    pwScatterItems(data, m, 6, true);
    const taken = new Set([m.spawn.x + ',' + m.spawn.y].concat(data.items.map(i => i.x + ',' + i.y))), names = pwPickFrom(PW_DEEP_NAMES, 6), emo = pwPickFrom(PW_DEEP_FOLK, 6);
    data.folk = names.map((name, i) => { const s = pickSpot(m, taken, data, null); taken.add(s.x + ',' + s.y); return { id: 'folk' + i, name, emoji: emo[i], x: s.x, y: s.y, hx: s.x, hy: s.y, given: false, next: Date.now() + 1000 + i * 700 }; });
    data.fish = []; const kinds = ['🐟', '🐠', '🐡', '🐟', '🐠', '🦈'];
    for (let i = 0; i < 12; i++) data.fish.push({ id: 'fish' + i, emoji: i === 11 ? '🦈' : kinds[i % 5], x: 1 + Math.random() * (m.w - 3), y: 1 + Math.random() * (m.h - 3), vx: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.6), vy: (Math.random() - 0.5) * 0.4 });
  },
  enter(w) { pwDeepOn(); pwDeepSync(w); },
  boot(w) { pwDeepOn(); },
  leave(w) { pwDeepOff(); },
  render(w, data, add) { pwDeepOn(); pwDeepSync(w); },
  tap(w, tx, ty) {
    const data = state.districtData[PW_KEY], f = (data.folk || []).find(o => o.x === tx && o.y === ty);
    if (!f) return false;
    cancelWalk(); walkThen(adjacentTo({ x: f.x, y: f.y }), () => pwFolkTalk(f)); return true;
  },
  goal(w) { return { icon: '🫧', text: 'Swim around the sunken city', hint: 'Talk to the folk who live here: each has a line, and a gift for a visitor.' }; },
  tick(w, now, dt) { pwDeepTick(w, now, dt); }
};

/* ---------------- the one fast timer for everything that moves on its own ---------------- */
let pwModeLast = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.5, (now - pwModeLast) / 1000); pwModeLast = now;
  if (document.hidden || !pwInside() || pwBusy()) return;
  const w = pwActive(), k = pwKind(w); if (k.tick) k.tick(w, now, dt);
}, 200);
