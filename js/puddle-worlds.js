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
   Kinds of world (build 245): every world has a `kind`. 'explore' (below) is the original: wander and look for cards. js/puddle-modes.js adds
   'maze' (find the way out, racing neighbours), 'ladders' (a dice-only board game) and 'deep' (an underwater city). A kind is an entry in
   PW_KINDS with hooks: create, generate, build, enter, leave, boot, render, tap, exit, goal (see pwKind and the hook helpers below).
   Tunables are the PW_* constants right below. Colour palettes: scripts/build-pw-biomes.py -> css/theme.css. The way in plays the warped-time transition (js/warp-fx.js);
   a portal (js/portal.js) is a second way in, always open for a while, that calls pwEnter(x, y, undefined, 'portal').
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
  { id: 'pw-glass', word: 'Glass' }, { id: 'pw-ember', word: 'Ember' }, { id: 'pw-mirror', word: 'Mirror' }, { id: 'pw-bloom', word: 'Blossom' },   // names-ok: a world word, not the currency
  { id: 'pw-static', word: 'Static' }, { id: 'pw-tide', word: 'Drowned' }, { id: 'pw-dusk', word: 'Dusk' },
  { id: 'pw-reef', word: 'Reef', deep: true }, { id: 'pw-abyss', word: 'Abyssal', deep: true }   // the two underwater palettes: only 'deep' worlds use them
];
const pwBiomesFor = deep => PW_BIOMES.filter(b => !!b.deep === !!deep);
const PW_SHAPES = {
  meadow:  ['Meadow', 'Fields', 'Commons'],
  grove:   ['Hollow', 'Thicket', 'Grove'],
  islands: ['Archipelago', 'Shallows', 'Atoll'],
  ring:    ['Circle', 'Plaza', 'Orbit'],
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

/* ---------------- kinds of world ---------------- */
const PW_KINDS = {};   // kind -> { weight, create, generate, build, enter, leave, boot, render, tap, exit, goal }; 'explore' is defined below
function pwKind(w) { w = w || pwActive(); return (w && PW_KINDS[w.kind]) || PW_KINDS.explore; }

/* ---------------- the world record ---------------- */
function pwActive() { const w = state.progress && state.progress.puddleWorld; return w && w.endsAt ? w : null; }
function pwNewWorld(forceKind) {
  const pr = state.progress, last = pr.pwLast || {};
  const seed = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const rnd = seeded('pw-pick-' + seed), pick = a => a[Math.floor(rnd() * a.length)];
  // the kind: weighted, never the same twice running
  const kinds = Object.keys(PW_KINDS).filter(k => k !== last.kind || Object.keys(PW_KINDS).length < 2);
  let kind = forceKind && PW_KINDS[forceKind] ? forceKind : kinds[0], r = rnd() * kinds.reduce((a, k) => a + PW_KINDS[k].weight, 0);
  if (!(forceKind && PW_KINDS[forceKind])) for (const k of kinds) { r -= PW_KINDS[k].weight; if (r < 0) { kind = k; break; } }
  const now = Date.now(), w = { seed, kind, sub: pick(PW_MOODS), startedAt: now, origin: null, cards0: state.ownedCards.length };
  PW_KINDS[kind].create(w, rnd, pick, last);
  w.endsAt = now + (w.ms || PW_MIN_MS + Math.floor(rnd() * (PW_MAX_MS - PW_MIN_MS)));
  return w;
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
function pwGenerate(w) { return pwKind(w).generate(w); }
function pwGenerateExplore(w) {
  let best = null;
  for (let attempt = 0; attempt < 6 && !best; attempt++) {
    const shape = attempt < 4 ? w.shape : 'meadow';                     // a shape that came out too small falls back to a meadow
    const rnd = seeded('pw-map-' + w.seed + ':' + attempt), W = w.size[0], H = w.size[1];
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const spawn = { x: W >> 1, y: H - 2 };
    (PW_BUILD[shape] || PW_BUILD.meadow)(g, W, H, rnd, spawn);   // (older saved worlds can name a shape that no longer exists)
    for (let x = 0; x < W; x++) { g[0][x] = 'o'; g[H - 1][x] = 'i'; }
    for (let y = 0; y < H; y++) { g[y][0] = 'i'; g[y][W - 1] = 'o'; }
    g[spawn.y][spawn.x] = '='; g[spawn.y][spawn.x - 1] = '='; g[spawn.y][spawn.x + 1] = '=';
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
  const w = pwActive(), m = getMap(PW_KEY), data = { npcs: [], boss: null, items: [], spirits: null, scenery: [], buildings: {}, decorations: [], pw: true };
  state.districtData[PW_KEY] = data;
  pwKind(w).build(w, data, m);
  return data;
}
// Shared by the kinds: n hidden cards on open ground (the last one a proper reward roll when `treasure`), never on `taken`.
function pwScatterItems(data, m, n, treasure, taken) {
  taken = taken || new Set([m.spawn.x + ',' + m.spawn.y]);
  for (let i = 0; i < n; i++) {
    const s = pickSpot(m, taken, data, null); taken.add(s.x + ',' + s.y);
    const isTreasure = treasure && i === n - 1, rarity = isTreasure ? rollRewardRarity(false) : (Math.random() < 0.35 ? 'rare' : 'common');
    data.items.push({ id: 'item-pw-' + data.items.length, x: s.x, y: s.y, cardId: weightedTownCardId(rarity), collected: false, spawnedAt: 0, collectedAt: null, fixed: true, treasure: isTreasure });
  }
}
// A card given outright (a reward, a gift): the same pickup sheet as a hidden card.
function pwGiveCard(cardId, label) {
  const isNew = !state.ownedCards.includes(cardId);
  state.ownedCards.push(cardId); saveState(); updateHud(); bumpPill('pillCards'); bumpStat('cardsFound', 1);
  if (isNew) toast('📖 New entry in your Index');
  sfx('claim'); buzz(HAP.tap); showCardReveal(cardId, label, false, null, XP_PER_STAT.cardsFound);
}
// The persistent layer for things that move on their own (racers, pawns, folk, fish). It lives inside the town world but is not an
// `.ent`, so the town's redraws (which clear every .ent) never destroy it, and its elements keep their CSS transitions.
function pwLayer(create) {
  if (!townWorld) return null;
  let l = townWorld.querySelector(':scope > .pw-layer');
  if (!l && create) { l = document.createElement('div'); l.className = 'pw-layer'; townWorld.appendChild(l); }
  return l;
}
function pwActor(id, x, y, html, cls) {
  const l = pwLayer(true); if (!l) return null;
  let e = l.querySelector(`[data-pwid="${id}"]`);
  if (!e) { e = document.createElement('div'); e.className = 'pw-actor ' + (cls || ''); e.dataset.pwid = id; e.innerHTML = html; l.appendChild(e); }
  else if (html != null && e.dataset.html !== html) { e.innerHTML = html; }
  e.dataset.html = html; e.style.setProperty('--x', x); e.style.setProperty('--y', y); e.style.zIndex = Math.round(y * 2 + 1);
  return e;
}
function pwActorRemove(id) { const l = pwLayer(); const e = l && l.querySelector(`[data-pwid="${id}"]`); if (e) e.remove(); }
function pwLayerClear() { const l = pwLayer(); if (l) l.remove(); }

// The original kind: wander, look for cards and spirits.
PW_KINDS.explore = {
  weight: 3,
  create(w, rnd, pick, last) {
    const biome = pick(pwBiomesFor(false).filter(b => b.id !== last.biome)), shapeKey = pick(Object.keys(PW_SHAPES).filter(s => s !== last.shape));
    w.shape = shapeKey; w.biome = biome.id; w.name = biome.word + ' ' + pick(PW_SHAPES[shapeKey]);
    w.size = [15 + 2 * Math.floor(rnd() * 3), 15 + 2 * Math.floor(rnd() * 3)];   // 15, 17 or 19 each way
    w.intro = 'It will not last - look around while you can.';
  },
  generate: pwGenerateExplore,
  build(w, data, m) { pwScatterItems(data, m, PW_ITEMS + 1, true); ensureSpirits(PW_KEY, data); },
  goal() { return { icon: '🔎', text: 'Find hidden cards before the world fades' }; }
};

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
function pwEnter(x, y, forceKind, via) {   // via: 'portal' (js/portal.js) changes the words, nothing else
  const w = pwNewWorld(forceKind); w.origin = { district: state.currentDistrict, x: x == null ? state.playerPos.x : x, y: y == null ? state.playerPos.y : y };
  w.map = pwGenerate(w);
  state.progress.puddleWorld = w; state.progress.pwLast = { biome: w.biome, shape: w.shape, kind: w.kind };
  pwApply(w);
  const go = () => {
    cancelWalk();
    state.currentDistrict = PW_KEY; state.playerPos = Object.assign({}, getMap(PW_KEY).spawn);
    pwBuildData(); townBuiltFor = null; const k = pwKind(w); if (k.enter) k.enter(w);
    if (via !== 'portal') bumpStat('puddleWorlds', 1);   // a portal counts as portalsEntered instead (below)
    saveState(); renderTown(); if (typeof renderDistricts === 'function') renderDistricts(); switchTab('town');
    const portal = via === 'portal';
    townLog.textContent = portal ? `The portal folds around you. ${w.sub}` : `The puddle swallows you. ${w.sub}`;
    toast(`🌀 ${portal ? 'The portal carried you into' : 'You fell into'} the ${w.name}. ${w.intro || ''}`);
    logEvent('🌀', portal ? `Stepped through a portal into the ${w.name}.` : `Fell through a puddle into the ${w.name}.`); if (typeof teleInc === 'function') teleInc('puddleWorld.kind.' + w.kind);
    if (portal) { bumpStat('portalsEntered', 1); if (typeof teleInc === 'function') teleInc('puddleWorld.portal'); }
    if (typeof teleInc === 'function') teleInc('puddleWorld.entered');
    pwUpdatePill(); showTipOnce('puddleworld'); sfx('claim'); buzz(HAP.tap);
  };
  // Warped time (js/warp-fx.js) on the way in; the plain fade if that file is missing.
  (typeof warpTransition === 'function' ? warpTransition : withTravelTransition)(PW_KEY, go, { name: w.name, sub: w.sub, icon: '🌀' });
}
// The way out: the timer ran down, or the player chose to leave. `quiet` = no transition (used at start-up).
function pwLeave(why, quiet, after) {   // why: 'faded' (the timer), 'left' (climbed out), 'done' (finished the world's goal); after: runs once she is back
  const w = pwActive(); if (!w) return;
  const origin = w.origin && Object.prototype.hasOwnProperty.call(DISTRICTS, w.origin.district) && w.origin.district !== PW_KEY ? w.origin : { district: 'square', x: null, y: null };
  const back = () => {
    const found = Math.max(0, state.ownedCards.length - (w.cards0 || 0)), k = pwKind(w);
    if (k.leave) { try { k.leave(w); } catch (e) { /* cleanup only */ } }
    pwLayerClear();
    delete state.districtData[PW_KEY]; delete LIFE.puddles[PW_KEY]; delete LIFE.birds[PW_KEY];
    state.progress.puddleWorld = null; state.progress.pwEndedAt = Date.now();
    pwApply(null);
    const m = getMap(origin.district), ok = origin.x != null && m.rows[origin.y] && !m.solid[origin.y][origin.x];
    state.currentDistrict = origin.district; state.playerPos = ok ? { x: origin.x, y: origin.y } : Object.assign({}, m.spawn);
    townBuiltFor = null; cancelWalk(); saveState();
    if (!quiet) {
      renderTown(); if (typeof renderDistricts === 'function') renderDistricts();
      const gone = why === 'left' ? `You climbed back out of the ${w.name}.` : why === 'done' ? `You made it out of the ${w.name} and are back in ${DISTRICTS[origin.district].name}.` : `The ${w.name} faded like a ripple, and you are back in ${DISTRICTS[origin.district].name}.`;
      townLog.textContent = gone;
      toast(`🌀 ${gone}${found ? ` You came back with ${found} new card${found === 1 ? '' : 's'}.` : ''}`);
      logEvent('🌀', `The ${w.name} ${why === 'left' ? 'was left behind' : why === 'done' ? 'was completed' : 'faded away'}${found ? ` (${found} new card${found === 1 ? '' : 's'} found)` : ''}.`);
      sfx('soft');
    }
    if (typeof teleInc === 'function') teleInc('puddleWorld.' + why);
    pwUpdatePill();
    if (after && !quiet) setTimeout(after, 700);
  };
  if (quiet) back(); else withTravelTransition(origin.district, back, { sub: 'Back where you started…', icon: '🌀' });
}
function pwBlocksTravel() {
  if (!pwActive()) return false;
  toast('🌀 A ripple holds you here. Tap the timer at the top to climb out early.');
  return true;
}

/* ---------------- hooks the rest of the game calls (all typeof-guarded there) ---------------- */
function pwInside() { return !!pwActive() && state.currentDistrict === PW_KEY; }
function pwRenderEntities(data, add) {   // from lifeRenderEntities (town-life.js), on every redraw of the town
  if (!pwInside()) { pwLayerClear(); return; }
  const w = pwActive(), k = pwKind(w); if (k.render) k.render(w, data, add);
}
function pwHandleTap(tx, ty) { if (!pwInside()) return false; const w = pwActive(), k = pwKind(w); return !!(k.tap && k.tap(w, tx, ty)); }   // true = the tap is used up
function pwReachedExit(exit) { if (!exit || !exit.pw) return false; const w = pwActive(), k = pwKind(w); if (w && k.exit) k.exit(w); return true; }   // from crossExit (world-map.js)
function pwGoal() {   // the goal pill at the top: what this world is about
  if (!pwInside()) return null;
  const w = pwActive(), g = pwKind(w).goal ? pwKind(w).goal(w) : null; if (!g) return null;
  return { icon: g.icon, text: g.text, run: () => toast('🌀 ' + (g.hint || g.text)) };
}

/* ---------------- start-up, the timer and the pill ---------------- */
// Runs right after loadState(): a world that ended while the game was closed is simply gone (you are put back, quietly).
function pwBoot() {
  const w = pwActive();
  if (w && Date.now() < w.endsAt) { pwApply(w); if (!state.districtData[PW_KEY]) pwBuildData(); const k = pwKind(w); if (k.boot) k.boot(w); return; }
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
