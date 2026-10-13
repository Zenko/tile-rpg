/* ============================================================
   PUDDLE WORLDS (build 241)
   Splash through a puddle in the rain and, now and then, it takes you somewhere else: a small world that exists only for a few
   minutes. Every world is different (a map shape, a colour palette, a size, a name, props, hidden cards and spirits), has a countdown
   in the top bar, and when the timer runs out it is simply gone and you are put back on the tile you fell in from.

   How it fits the rest of the game:
   - One hidden district key, PW_KEY ('pw'). DISTRICTS.pw exists (so every `DISTRICTS[state.currentDistrict].name` still works) but is
     NOT enumerable, so Object.keys(DISTRICTS) - the world map, "visit every district", boss lists - never sees it.
   - The world itself lives in state.progress.puddleWorld: { seed, name, sub, biome, shape, size, startedAt, endsAt, origin, map }.
     The map is generated from the seed once, when the world starts, and stored in the record (map = rows, props, spawn); getMap in
     js/maps.js asks pwMapDef() for it, so a reload in the middle of a world gives exactly the same map. What you can find lives in state.districtData.pw and is deleted when the world ends.
   - Cards here do not vanish and respawn like the town's (items are `fixed`), the way home is blocked (pwBlocksTravel), and the
     way out is the timer, or tapping it to leave early.
   - Off in Cozy mode (a countdown is exactly the pressure that mode takes away).
   Tunables are the PW_* constants right below. Colour palettes: scripts/build-pw-biomes.py -> css/latest.css.
   ============================================================ */
const PW_KEY = 'pw';
const PW_CHANCE = 0.15;                       // chance a newly splashed puddle is a way in
const PW_MIN_LEVEL = 2;                       // not for the very first minutes of play
const PW_MIN_MS = 4 * 60 * 1000, PW_MAX_MS = 7 * 60 * 1000;   // how long a world lasts
const PW_COOLDOWN_MS = 4 * 60 * 1000;         // after one ends, no new one for this long
const PW_ITEMS = 5;                           // hidden cards, plus one treasure; plus the three spirits every district has

// The hidden district entry (see the banner). `theme` picks the travel-fade colours (css/latest.css .travel-fade.theme-pw).
Object.defineProperty(DISTRICTS, PW_KEY, {
  value: { name: 'A Puddle World', theme: 'pw', unlockWins: 0, unlockLevel: 1, boss: '', bossIcon: '🌀', scenery: [] },
  enumerable: false, writable: true, configurable: true
});
TRAVEL_ICON[PW_KEY] = '🌀';

const PW_BIOMES = [
  { id: 'pw-glass', word: 'Glass' }, { id: 'pw-ember', word: 'Ember' }, { id: 'pw-mirror', word: 'Mirror' }, { id: 'pw-bloom', word: 'Blossom' },
  { id: 'pw-static', word: 'Static' }, { id: 'pw-tide', word: 'Drowned' }, { id: 'pw-dusk', word: 'Dusk' }
];
const PW_SHAPES = {
  meadow:  ['Meadow', 'Fields', 'Commons'],
  grove:   ['Hollow', 'Thicket', 'Grove'],
  islands: ['Archipelago', 'Shallows', 'Atoll'],
  ring:    ['Circle', 'Plaza', 'Orbit'],
  maze:    ['Warren', 'Labyrinth', 'Maze'],
  river:   ['Reach', 'Crossing', 'Bend']
};
const PW_MOODS = [
  'The air here hums a different tune.', 'Everything is slightly the wrong way round.', 'The light comes from somewhere you cannot see.',
  'It smells like a rainstorm that has not happened yet.', 'The ground remembers every step, but quietly.', 'Nothing here has a shadow quite where it should.',
  'It feels like the inside of a held breath.', 'Somebody dreamed this place and left it running.'
];
const PW_PROPS = {
  bench:    { title: 'A bench that was not here a moment ago', desc: 'It is warm, as if someone has just stood up.' },
  lamp:     { title: 'A lamp with no wire', desc: 'It glows the colour of the sky it came from.' },
  well:     { title: 'A well with no bottom', desc: 'You hear your own name, very faintly, a long way down.' },
  fountain: { title: 'A fountain running backwards', desc: 'The water falls upward and lands in the sky.' }
};

/* ---------------- the world record ---------------- */
function pwActive() { const w = state.progress && state.progress.puddleWorld; return w && w.endsAt ? w : null; }
function pwNewWorld() {
  const pr = state.progress, last = pr.pwLast || {};
  const seed = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const rnd = seeded('pw-pick-' + seed), pick = a => a[Math.floor(rnd() * a.length)];
  const biome = pick(PW_BIOMES.filter(b => b.id !== last.biome)), shapeKey = pick(Object.keys(PW_SHAPES).filter(s => s !== last.shape));
  const size = [15 + 2 * Math.floor(rnd() * 3), 15 + 2 * Math.floor(rnd() * 3)];   // 15, 17 or 19 each way (odd, for the maze)
  const now = Date.now();
  return { seed, shape: shapeKey, biome: biome.id, name: biome.word + ' ' + pick(PW_SHAPES[shapeKey]), sub: pick(PW_MOODS), size,
    startedAt: now, endsAt: now + PW_MIN_MS + Math.floor(rnd() * (PW_MAX_MS - PW_MIN_MS)), origin: null, cards0: state.ownedCards.length };
}
// Points the shared lookups (name, biome, cached map) at the current world. Safe to call again.
function pwApply(w) {
  DISTRICTS[PW_KEY].name = w ? w.name : 'A Puddle World';
  if (w) BIOME_OF[PW_KEY] = w.biome; else delete BIOME_OF[PW_KEY];
  delete MAP_CACHE[PW_KEY];
}

/* ---------------- the map: six shapes, all from one seed ---------------- */
// g = grid of single characters (see js/maps.js for the legend), edited in place. Each shape only fills the inside; the border and the
// guarantee that everything you can stand on is joined to the arrival spot are done afterwards for all of them.
const PW_BUILD = {
  meadow(g, W, H, rnd, spawn) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const r = rnd(); g[y][x] = r < 0.10 ? 'hrro'[Math.floor(rnd() * 4)] : r < 0.32 ? ',' : '.'; }
    let x = spawn.x; for (let y = spawn.y; y > 1; y--) { g[y][x] = '='; if (rnd() < 0.4) x = Math.max(2, Math.min(W - 3, x + (rnd() < 0.5 ? -1 : 1))); g[y][x] = '='; }
  },
  grove(g, W, H, rnd, spawn) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g[y][x] = rnd() < 0.62 ? 'ooio'[Math.floor(rnd() * 4)] : '.';
    for (let k = 0; k < 7; k++) {
      let x = spawn.x, y = spawn.y;
      for (let s = 0; s < 46; s++) {
        g[y][x] = k === 0 ? '=' : '.';
        const r = rnd(); if (r < 0.45) y--; else if (r < 0.6) y++; else if (r < 0.8) x--; else x++;
        x = Math.max(1, Math.min(W - 2, x)); y = Math.max(1, Math.min(H - 2, y));
      }
    }
    for (let c = 0; c < 4; c++) { const cx = 3 + Math.floor(rnd() * (W - 6)), cy = 3 + Math.floor(rnd() * (H - 8));
      for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (Math.hypot(x - cx, y - cy) <= 2.2 && x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = rnd() < 0.3 ? ',' : '.'; }
  },
  islands(g, W, H, rnd, spawn) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g[y][x] = '~';
    const isl = [{ x: spawn.x, y: H - 4 }];
    for (let t = 0; t < 60 && isl.length < 6; t++) {
      const c = { x: 3 + Math.floor(rnd() * (W - 6)), y: 3 + Math.floor(rnd() * (H - 8)) };
      if (isl.every(o => Math.hypot(o.x - c.x, o.y - c.y) >= 5)) isl.push(c);
    }
    isl.forEach(c => { const rx = 2 + rnd() * 1.3, ry = 1.8 + rnd() * 1.2;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 <= 1) g[y][x] = '.'; });
    // join each island to its nearest unvisited neighbour with a bridge: along x first, then along y
    const todo = isl.slice(1); let cur = isl[0];
    while (todo.length) {
      todo.sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y));
      const nx = todo.shift(), sx = Math.sign(nx.x - cur.x) || 1, sy = Math.sign(nx.y - cur.y) || 1;
      for (let x = cur.x; x !== nx.x; x += sx) if (g[cur.y][x] === '~') g[cur.y][x] = 'b';
      for (let y = cur.y; y !== nx.y; y += sy) if (g[y][nx.x] === '~') g[y][nx.x] = 'b';
      cur = nx;
    }
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (g[y][x] === '.') {
      const nearBridge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy][x + dx] === 'b');
      const r = rnd(); if (!nearBridge && Math.abs(x - spawn.x) + Math.abs(y - spawn.y) > 2) g[y][x] = r < 0.12 ? 'o' : r < 0.18 ? 'i' : r < 0.34 ? ',' : '.';
    }
  },
  ring(g, W, H, rnd, spawn) {
    const cx = (W - 1) / 2, cy = (H - 1) / 2 - 1, R = Math.min(W, H) / 2 - 1.6;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const d = Math.hypot(x - cx, y - cy), gate = Math.abs(x - cx) < 1.5 || Math.abs(y - cy) < 1.5;
      if (d < 2.3) g[y][x] = '~';
      else if (d >= 3.2 && d < 4.3) g[y][x] = '=';
      else if (d >= R - 1.2 && d < R - 0.1) g[y][x] = gate ? '=' : 'h';
      else if (d >= R) g[y][x] = rnd() < 0.35 ? 'oi'[Math.floor(rnd() * 2)] : '.';
      else g[y][x] = rnd() < 0.05 ? 'r' : rnd() < 0.24 ? ',' : '.';
    }
    for (let y = spawn.y; y > cy + 2; y--) g[y][spawn.x] = '=';
  },
  maze(g, W, H, rnd, spawn) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g[y][x] = 'rrh'[Math.floor(rnd() * 3)];
    const stack = [{ x: spawn.x, y: spawn.y }]; g[spawn.y][spawn.x] = '.';
    while (stack.length) {
      const c = stack[stack.length - 1], opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy; return nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && 'rh'.includes(g[ny][nx]); });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = opts[Math.floor(rnd() * opts.length)];
      g[c.y + dy / 2][c.x + dx / 2] = '.'; g[c.y + dy][c.x + dx] = '.'; stack.push({ x: c.x + dx, y: c.y + dy });
    }
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if ((x + y) % 2 === 1 && 'rh'.includes(g[y][x]) && rnd() < 0.14) g[y][x] = '.';   // loops, so it is not one long corridor
    for (let r = 0; r < 2; r++) { const rx = 2 * (1 + Math.floor(rnd() * ((W - 5) / 2))), ry = 2 * (1 + Math.floor(rnd() * ((H - 7) / 2)));
      for (let y = ry - 1; y <= ry + 1; y++) for (let x = rx - 1; x <= rx + 1; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = rnd() < 0.4 ? ',' : '.'; }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && rnd() < 0.12) g[y][x] = ',';
  },
  river(g, W, H, rnd, spawn) {
    const cy = H * 0.42, amp = 1.3 + rnd() * 1.2, f = 0.5 + rnd() * 0.5, ph = rnd() * 6, wide = rnd() < 0.5 ? 2 : 3;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const r = rnd(); g[y][x] = r < (y < cy ? 0.24 : 0.14) ? 'ooi'[Math.floor(rnd() * 3)] : r < 0.42 ? ',' : '.'; }
    const bridges = new Set([spawn.x, 2 + Math.floor(rnd() * (W - 4))]);
    for (let x = 1; x < W - 1; x++) { const yc = Math.round(cy + Math.sin(x * f + ph) * amp);
      for (let k = 0; k < wide; k++) { const y = yc + k; if (y > 0 && y < H - 1) g[y][x] = bridges.has(x) ? 'b' : '~'; }
      if (bridges.has(x)) { for (let y = yc + wide; y < H - 2 && y < yc + wide + 1; y++) g[y][x] = '='; } }
    for (let y = spawn.y; y > cy + 3; y--) g[y][spawn.x] = '=';
  }
};
// The map of a world is generated once, when it starts, and stored in the world record (w.map: rows, props, spawn). It is NOT rebuilt from
// the seed on every load: a restart or a reload then always gives exactly the same map, whatever the browser does. pwGenerate is the generator.
function pwMapDef(w) {
  w = w || pwActive() || { seed: 'none', shape: 'meadow', size: [15, 15] };
  return w.map || pwGenerate(w);
}
function pwGenerate(w) {
  let best = null;
  for (let attempt = 0; attempt < 6 && !best; attempt++) {
    const shape = attempt < 4 ? w.shape : 'meadow';                     // a shape that came out too small falls back to a meadow
    const rnd = seeded('pw-map-' + w.seed + ':' + attempt), W = w.size[0], H = w.size[1];
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const spawn = { x: shape === 'maze' ? (W >> 1) | 1 : W >> 1, y: H - 2 };
    PW_BUILD[shape](g, W, H, rnd, spawn);
    for (let x = 0; x < W; x++) { g[0][x] = 'o'; g[H - 1][x] = 'i'; }
    for (let y = 0; y < H; y++) { g[y][0] = 'i'; g[y][W - 1] = 'o'; }
    g[spawn.y][spawn.x] = '='; if (shape !== 'maze') { g[spawn.y][spawn.x - 1] = '='; g[spawn.y][spawn.x + 1] = '='; }
    // everything you can stand on must be joined to the arrival spot; whatever is not becomes a tree
    const seen = new Set([spawn.x + ',' + spawn.y]), q = [spawn];
    while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || SOLID_TERRAIN.includes(g[ny][nx])) return; seen.add(k); q.push({ x: nx, y: ny }); }); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!SOLID_TERRAIN.includes(g[y][x]) && !seen.has(x + ',' + y)) g[y][x] = 'o';
    if (seen.size < 45) continue;
    // props on open grass, spread apart
    const props = [], cand = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if ('.,'.includes(g[y][x]) && seen.has(x + ',' + y) && Math.abs(x - spawn.x) + Math.abs(y - spawn.y) > 3
      && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy][x + dx] === 'b')) cand.push({ x, y });
    const kinds = Object.keys(PW_PROPS);   // a seeded Fisher-Yates shuffle (an inconsistent sort comparator is engine-dependent)
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    kinds.length = 2 + Math.floor(rnd() * 2);
    kinds.forEach((type, i) => {
      for (let t = 0; t < 40 && cand.length; t++) {
        const c = cand[Math.floor(rnd() * cand.length)];
        if (props.some(p => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 4)) continue;
        g[c.y][c.x] = '.'; props.push({ id: 'pw-' + type + i, type, x: c.x, y: c.y, title: PW_PROPS[type].title, desc: PW_PROPS[type].desc }); break;
      }
    });
    best = { w: W, h: H, rows: g.map(r => r.join('')), buildings: [], props, spawn };
  }
  return best;
}

/* ---------------- the hidden cards and spirits ---------------- */
function pwBuildData() {
  const m = getMap(PW_KEY), data = { npcs: [], boss: null, items: [], spirits: null, scenery: [], buildings: {}, decorations: [], pw: true };
  state.districtData[PW_KEY] = data;
  const taken = new Set([m.spawn.x + ',' + m.spawn.y]);
  for (let i = 0; i <= PW_ITEMS; i++) {
    const s = pickSpot(m, taken, data, null); taken.add(s.x + ',' + s.y);
    // the last one is the treasure: a proper reward roll (rare or better); the rest are town finds, a little richer than usual
    const rarity = i === PW_ITEMS ? rollRewardRarity(false) : (Math.random() < 0.35 ? 'rare' : 'common');
    data.items.push({ id: 'item-pw-' + i, x: s.x, y: s.y, cardId: weightedTownCardId(rarity), collected: false, spawnedAt: 0, collectedAt: null, fixed: true, treasure: i === PW_ITEMS });
  }
  ensureSpirits(PW_KEY, data);
  return data;
}

/* ---------------- going in and coming out ---------------- */
function pwBusy() { return inBattle || !!storyCur || (typeof inScene !== 'undefined' && inScene) || travelFading; }
function pwCanStart() {
  if (pwActive() || pwBusy() || document.hidden || prefs.cozy) return false;
  if (!state.currentDistrict || state.currentDistrict === PW_KEY || !Object.prototype.hasOwnProperty.call(DISTRICTS, state.currentDistrict)) return false;
  if (typeof ensureLevel === 'function' && ensureLevel().level < PW_MIN_LEVEL) return false;
  if (typeof CWALK !== 'undefined' && CWALK && CWALK.on) return false;
  return Date.now() - (state.progress.pwEndedAt || 0) >= PW_COOLDOWN_MS;
}
// Called from the puddle splash in js/town-life.js (once per newly splashed puddle).
function pwMaybeEnter(x, y) {
  if (!pwCanStart() || Math.random() >= PW_CHANCE) return;
  setTimeout(() => { if (pwCanStart()) pwEnter(x, y); }, 520);   // let the splash play first
}
function pwEnter(x, y) {
  const w = pwNewWorld(); w.origin = { district: state.currentDistrict, x: x == null ? state.playerPos.x : x, y: y == null ? state.playerPos.y : y };
  w.map = pwGenerate(w);
  state.progress.puddleWorld = w; state.progress.pwLast = { biome: w.biome, shape: w.shape };
  pwApply(w);
  const go = () => {
    cancelWalk();
    state.currentDistrict = PW_KEY; state.playerPos = Object.assign({}, getMap(PW_KEY).spawn);
    pwBuildData(); townBuiltFor = null;
    bumpStat('puddleWorlds', 1); saveState(); renderTown(); if (typeof renderDistricts === 'function') renderDistricts(); switchTab('town');
    townLog.textContent = `The puddle swallows you. ${w.sub}`;
    toast(`🌀 You fell into the ${w.name}. It will not last - look around while you can.`);
    logEvent('🌀', `Fell through a puddle into the ${w.name}.`);
    if (typeof teleInc === 'function') teleInc('puddleWorld.entered');
    pwUpdatePill(); showTipOnce('puddleworld'); sfx('claim'); buzz(HAP.tap);
  };
  withTravelTransition(PW_KEY, go, { sub: w.sub, icon: '🌀' });
}
// The way out: the timer ran down, or the player chose to leave. `quiet` = no transition (used at start-up).
function pwLeave(why, quiet) {
  const w = pwActive(); if (!w) return;
  const origin = w.origin && Object.prototype.hasOwnProperty.call(DISTRICTS, w.origin.district) && w.origin.district !== PW_KEY ? w.origin : { district: 'square', x: null, y: null };
  const back = () => {
    const found = Math.max(0, state.ownedCards.length - (w.cards0 || 0));
    delete state.districtData[PW_KEY]; delete LIFE.puddles[PW_KEY]; delete LIFE.birds[PW_KEY];
    state.progress.puddleWorld = null; state.progress.pwEndedAt = Date.now();
    pwApply(null);
    const m = getMap(origin.district), ok = origin.x != null && m.rows[origin.y] && !m.solid[origin.y][origin.x];
    state.currentDistrict = origin.district; state.playerPos = ok ? { x: origin.x, y: origin.y } : Object.assign({}, m.spawn);
    townBuiltFor = null; cancelWalk(); saveState();
    if (!quiet) {
      renderTown(); if (typeof renderDistricts === 'function') renderDistricts();
      const gone = why === 'left' ? `You climbed back out of the ${w.name}.` : `The ${w.name} faded like a ripple, and you are back in ${DISTRICTS[origin.district].name}.`;
      townLog.textContent = gone;
      toast(`🌀 ${gone}${found ? ` You came back with ${found} new card${found === 1 ? '' : 's'}.` : ''}`);
      logEvent('🌀', `The ${w.name} ${why === 'left' ? 'was left behind' : 'faded away'}${found ? ` (${found} new card${found === 1 ? '' : 's'} found)` : ''}.`);
      sfx('soft');
    }
    if (typeof teleInc === 'function') teleInc('puddleWorld.' + why);
    pwUpdatePill();
  };
  if (quiet) back(); else withTravelTransition(origin.district, back, { sub: 'Back where you started…', icon: '🌀' });
}
function pwBlocksTravel() {
  if (!pwActive()) return false;
  toast('🌀 A ripple holds you here. Tap the timer at the top to climb out early.');
  return true;
}

/* ---------------- start-up, the timer and the pill ---------------- */
// Runs right after loadState(): a world that ended while the game was closed is simply gone (you are put back, quietly).
function pwBoot() {
  const w = pwActive();
  if (w && Date.now() < w.endsAt) { pwApply(w); if (!state.districtData[PW_KEY]) pwBuildData(); return; }
  if (w) { pwLeave('faded', true); setTimeout(() => toast('🌀 The puddle world you fell into faded while you were away.'), 1800); return; }
  if (state.currentDistrict === PW_KEY) { state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); }
  delete state.districtData[PW_KEY];
}
function pwLeft(w) { return Math.max(0, w.endsAt - Date.now()); }
function pwFmt(ms) { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function pwUpdatePill() {
  const el = document.getElementById('pillWorld'); if (!el) return;
  const w = pwActive(); el.classList.toggle('hidden', !w);
  if (!w) { el.classList.remove('warn'); return; }
  const left = pwLeft(w);
  document.getElementById('pwTime').textContent = pwFmt(left);
  el.classList.toggle('warn', left <= 30000);
  el.title = `${w.name} - tap to climb out early`;
}
function pwTick() {
  if (document.hidden) return;
  const w = pwActive();
  if (!w) { const el = document.getElementById('pillWorld'); if (el && !el.classList.contains('hidden')) pwUpdatePill(); return; }   // no world: nothing to do, and no DOM work every second
  const left = pwLeft(w);
  if (left > 0) {
    if (left <= 60000 && !w.warned1) { w.warned1 = true; toast('🌀 The world is starting to thin. About a minute left.'); }
    if (left <= 15000 && !w.warned2) { w.warned2 = true; toast('🌀 The edges are rippling…'); sfx('soft'); }
    pwUpdatePill(); return;
  }
  pwUpdatePill();
  if (!pwBusy()) pwLeave('faded');   // in a battle or a scene it waits until you are done
}
setInterval(pwTick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) pwTick(); });
document.getElementById('pillWorld').addEventListener('click', () => {
  const w = pwActive(); if (!w) return;
  sfx('nav'); askConfirm({ title: 'Climb out?', text: `The ${w.name} will be gone for good, and you will be back where you fell in. ${pwFmt(pwLeft(w))} left.`, ok: 'Climb out' }, () => { if (pwActive() && !pwBusy()) pwLeave('left'); });
});
