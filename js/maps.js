/* ============================================================
   TOWN MAPS: data, compile, pathfinding.
   Terrain characters:  . grass   , flowers (walkable)   = path   # cobble   ~ water   b bridge
                        o oak  i pine  h hedge  r rock  (all solid)
   Buildings are sprites over a footprint; the tile just below the footprint (at the door column) is the entry tile.
   ============================================================ */
const MAP_SQUARE = {"w": 16, "h": 17, "rows": ["iooiooiooiooiooo", "ooi...i..o...oii", "oi...o.......ioi", "io...,.==.,...io", "o......==...,..i", "o.,=...==..==..i", "ii.=i##==##=o.oo", "ooi=.##==##=.oii", "o..==========..i", "i.,..##==##..,.o", "oo..,.,==.....ii", "oi.....==,....oi", "ioh=========hhio", "o~~..,.==.,..~~i", "o~~~~~~bb~~~~~~i", "i......==......o", "oiioiioiioiioiii"], "buildings": [{"id": "cottage", "type": "cottage", "x": 3, "y": 3, "enter": "cottage"}, {"id": "nook", "type": "nook", "x": 11, "y": 3, "enter": "nook"}, {"id": "cellar", "type": "cellar", "x": 7, "y": 1, "enter": "cellar"}, {"id": "bakery", "type": "bakery", "x": 2, "y": 10, "enter": "bakery"}, {"id": "house2", "type": "cottage", "x": 11, "y": 10, "enter": "house2", "roof": "#6f8fbf", "roof2": "#5c7ba8"}, {"id": "home", "type": "cottage", "x": 10, "y": 1, "enter": "home", "roof": "#9a78c9", "roof2": "#7f62ad"}], "props": [{"id": "fountain", "type": "fountain", "x": 7, "y": 7, "title": "The old fountain", "desc": "Coins glimmer faintly beneath the water."}, {"id": "bench1", "type": "bench", "x": 5, "y": 6, "title": "A quiet bench", "desc": "A good place to sit and watch the town go by."}, {"id": "bench2", "type": "bench", "x": 10, "y": 9, "title": "A quiet bench", "desc": "Someone left a folded newspaper here."}, {"id": "well", "type": "well", "x": 5, "y": 4, "title": "The village well", "desc": "The water is cold and clear. You can hear it drip far below."}, {"id": "lamp1", "type": "lamp", "x": 6, "y": 5, "title": "A street lamp", "desc": "It glows a little even in the daytime."}, {"id": "lamp2", "type": "lamp", "x": 9, "y": 5, "title": "A street lamp", "desc": "Moths circle it, patient and hopeful."}, {"id": "lamp3", "type": "lamp", "x": 6, "y": 11, "title": "A street lamp", "desc": "The bridge is just beyond it."}, {"id": "sign", "type": "sign", "x": 6, "y": 13, "title": "Welcome sign", "desc": "\"Tile RPG. Friendly matches only. Please feed the ducks.\""}], "spawn": {"x": 7, "y": 15}};
// Hand-authored like Town Square (not proceduralMap): a market row street with a plaza well at its
// crossing. West edge links back to Town Square (see DISTRICT_LINKS); no other exits.
const MAP_MARKET = {"w": 14, "h": 15, "rows": ["hihoihoihoihoo", "o.,...==....,i", "i..,..==....,h", "h.....==.....o", "o.....==.....i", "i.,..,==.....h", "h....####....o", "o====####====i", "i....####....h", "h.,...==.....o", "o.....==.....i", "i...,.==...,.h", "h....,==.....o", "o.....==.....i", "ihoihoihoihoih"], "buildings": [{"id": "stall-grain", "type": "cottage", "x": 2, "y": 2, "enter": "stall-grain"}, {"id": "stall-thread", "type": "nook", "x": 9, "y": 2, "enter": "stall-thread"}, {"id": "stall-spice", "type": "bakery", "x": 2, "y": 9, "enter": "stall-spice"}, {"id": "stall-tinker", "type": "cottage", "x": 8, "y": 9, "enter": "stall-tinker", "roof": "#6f8fbf", "roof2": "#5c7ba8"}, {"id": "museum", "type": "nook", "x": 11, "y": 11, "enter": "museum", "roof": "#8c8c9a", "roof2": "#74747f"}, {"id": "card-shop", "type": "nook", "x": 11, "y": 1, "enter": "card-shop", "roof": "#d4a13d", "roof2": "#b3852d"}], "props": [{"id": "crate", "type": "crate", "x": 3, "y": 12, "title": "A trader's crate", "desc": "Stacked high with goods. The trader beside it is always open to a little haggling."}, {"id": "well", "type": "well", "x": 5, "y": 6, "title": "The market well", "desc": "Traders fill their jugs here before the day gets busy."}, {"id": "bench1", "type": "bench", "x": 5, "y": 3, "title": "A market bench", "desc": "A good spot to watch the stalls fill up."}, {"id": "bench2", "type": "bench", "x": 9, "y": 11, "title": "A market bench", "desc": "Crumbs on the seat - someone had a snack here."}, {"id": "lamp1", "type": "lamp", "x": 11, "y": 3, "title": "A market lamp", "desc": "Strung with little flags that flutter in the breeze."}, {"id": "lamp2", "type": "lamp", "x": 11, "y": 9, "title": "A market lamp", "desc": "Lit early and late, whenever the stalls are open."}, {"id": "sign", "type": "sign", "x": 8, "y": 12, "title": "Market sign", "desc": "\"Market Row. Bring your best trade, mind the crates.\""}], "spawn": {"x": 6, "y": 13}};
const BUILDING_TYPES = {
  cottage: { w: 2, h: 2, door: 0, sprite: 'b-cottage' },
  nook:    { w: 2, h: 2, door: 1, sprite: 'b-nook' },
  cellar:  { w: 2, h: 2, door: 0, sprite: 'b-cellar' },
  bakery:  { w: 3, h: 2, door: 1, sprite: 'b-bakery' }
};
const SOLID_TERRAIN = 'oihr~';
const BIOME_OF = { square: 'meadow', market: 'bazaar', harbor: 'harbor', garden: 'orchard' };
const PROP_ICON = { fountain: '⛲', bench: '🪑', well: '🪣', lamp: '🏮', sign: '🪧', door: '🚪', crate: '📦', nets: '🪢' };
const PROP_SPRITE = { fountain: 'p-fountain', bench: 'p-bench', well: 'p-well', lamp: 'p-lamp', sign: 'p-sign' };
const TREE_FLAVOR = ['An old tree. It has seen a lot of quiet afternoons.', 'The trunk is too wide to squeeze past.', 'Leaves rustle overhead.', 'Nothing to do here but admire it.'];
const WATER_FLAVOR = ['The water is cool and clear. Best to keep your boots dry.', 'Small ripples spread and fade.'];

function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Simple placeholder maps for the other districts (same engine, own biome). They get designed one by one after the Town Square.
function proceduralMap(key) {
  const W = 14, H = 14, rnd = seeded('qc-map-' + key);
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const cfg = { market: { solid: 'hhr', density: 0.13 }, harbor: { solid: 'rri', density: 0.10 }, garden: { solid: 'hhoo', density: 0.16 } }[key] || { solid: 'oi', density: 0.12 };
  for (let x = 0; x < W; x++) { g[0][x] = 'o'; g[H - 1][x] = 'i'; }
  for (let y = 0; y < H; y++) { g[y][0] = 'i'; g[y][W - 1] = 'o'; }
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (rnd() < cfg.density) g[y][x] = cfg.solid[Math.floor(rnd() * cfg.solid.length)];
  for (let x = 1; x < W - 1; x++) g[7][x] = '=';                       // a road across
  for (let y = 1; y < H - 1; y++) { g[y][6] = '='; g[y][7] = '='; }    // and one down
  if (key === 'harbor') for (let y = 9; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!(x === 6 || x === 7)) g[y][x] = y === 9 && rnd() < 0.5 ? 'r' : '~';
  if (key === 'garden') for (let i = 0; i < 26; i++) { const x = 1 + Math.floor(rnd() * (W - 2)), y = 1 + Math.floor(rnd() * (H - 2)); if (g[y][x] === '.') g[y][x] = ','; }
  const spawn = { x: 6, y: H - 2 }; g[spawn.y][6] = '='; g[spawn.y][7] = '=';
  // anything the player could never reach becomes a tree, so the map is always one connected space
  const seen = new Set([spawn.x + ',' + spawn.y]), q = [spawn];
  while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || SOLID_TERRAIN.includes(g[ny][nx])) return; seen.add(k); q.push({ x: nx, y: ny }); }); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!SOLID_TERRAIN.includes(g[y][x]) && !seen.has(x + ',' + y)) g[y][x] = 'o';
  // One fixed building per district - the layouts around them stay procedural placeholders (see HANDOFF),
  // but the Harbor and the Garden each get one landmark worth walking to, the same way every other district has one.
  const buildings = [];
  if (key === 'harbor') { for (let dy = 2; dy <= 4; dy++) for (let dx = 2; dx <= 3; dx++) g[dy][dx] = '.';
    buildings.push({ id: 'harbor-hut', type: 'nook', x: 2, y: 2, enter: 'harbor-hut', roof: '#3d6a86', roof2: '#2f5468' }); }
  if (key === 'garden') { for (let dy = 2; dy <= 4; dy++) for (let dx = 9; dx <= 10; dx++) g[dy][dx] = '.';
    buildings.push({ id: 'garden-glass', type: 'cottage', x: 9, y: 2, enter: 'garden-glass', roof: '#4c8a5e', roof2: '#3b6f4a' }); }
  // A few props so these districts have something to poke at too (bench/lamp/well/nets - see js/town-life.js).
  const props = [];
  const prop = (id, type, x, y, title, desc) => { g[y][x] = '.'; props.push({ id, type, x, y, title, desc }); };
  if (key === 'harbor') {
    prop('bench1', 'bench', 4, 6, 'A harbor bench', 'Salt-bleached planks, worn smooth by patient sitters.');
    prop('lamp1', 'lamp', 9, 6, 'A harbor lamp', 'Its glass is crusted with salt, but it still shines.');
    prop('nets', 'nets', 9, 8, 'Drying nets', 'Heaped nets that smell of the tide. They could use hauling in.');
  }
  if (key === 'garden') {
    prop('bench1', 'bench', 4, 6, 'A garden bench', 'Half-hidden by honeysuckle. Bees hum nearby.');
    prop('well', 'well', 9, 8, 'The garden pump', 'A stone pump with a mossy trough. The water runs sweet.');
    prop('lamp1', 'lamp', 3, 9, 'A garden lamp', 'Fireflies gather around it at dusk.');
  }
  return { w: W, h: H, rows: g.map(r => r.join('')), buildings, props, spawn };
}

// Town layout: Town Square sits in the middle, with Market Row / Quiet Harbor / Hollow Garden one step
// off its east / south / west edges. Walking off the edge of a map at the linked spot crosses into the
// next one; `at` is the row (for E/W edges) or column (for N/S edges) where the opening sits.
const DISTRICT_LINKS = [
  { from: 'square', dir: 'E', at: 8, to: 'market', toDir: 'W', toAt: 7 },
  { from: 'square', dir: 'S', at: 7, to: 'harbor', toDir: 'N', toAt: 7 },
  { from: 'square', dir: 'W', at: 8, to: 'garden', toDir: 'E', toAt: 7 },
];
const EXITS_BY_DISTRICT = {};
function addExit(district, dir, at, to, toDir, toAt) {
  (EXITS_BY_DISTRICT[district] || (EXITS_BY_DISTRICT[district] = [])).push({ dir, at, to, toDir, toAt });
}
DISTRICT_LINKS.forEach(l => { addExit(l.from, l.dir, l.at, l.to, l.toDir, l.toAt); addExit(l.to, l.toDir, l.toAt, l.from, l.dir, l.at); });
function edgeTileFor(m, dir, at) {
  if (dir === 'W') return { x: 0, y: at };
  if (dir === 'E') return { x: m.w - 1, y: at };
  if (dir === 'N') return { x: at, y: 0 };
  return { x: at, y: m.h - 1 }; // 'S'
}
function entryTileFor(m, dir, at) {
  if (dir === 'W') return { x: 1, y: at };
  if (dir === 'E') return { x: m.w - 2, y: at };
  if (dir === 'N') return { x: at, y: 1 };
  return { x: at, y: m.h - 2 }; // 'S'
}

// A minority of water tiles are ever fishable at once - the visible swimming-fish sprite (drawn in
// buildWorld from this same set) is the only tell, and only those tiles will open the fishing overlay.
// Which ones light up reshuffles every FISH_ROTATE_MS, seeded by district + a time bucket, so the school
// moves around rather than sitting in the same spots forever. getMap() re-checks the bucket on every call
// (which is often - most renders call it), so a reshuffle takes effect the moment the bucket ticks over.
const FISH_ROTATE_MS = 10 * 60 * 1000;
function refreshFishTiles(m, key) {
  const bucket = Math.floor(Date.now() / FISH_ROTATE_MS);
  if (m.fishBucket === bucket) return;
  m.fishBucket = bucket;
  const frnd = seeded('fish-' + key + '-' + bucket);
  const tiles = {};
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === '~' && frnd() < 0.3) tiles[x + ',' + y] = true;
  m.fishTiles = tiles;
}

const MAP_CACHE = {};
function getMap(key) {
  if (MAP_CACHE[key]) { refreshFishTiles(MAP_CACHE[key], key); return MAP_CACHE[key]; }
  const HAND_MAPS = { square: MAP_SQUARE, market: MAP_MARKET };
  const def = HAND_MAPS[key] || proceduralMap(key);
  const m = { key, w: def.w, h: def.h, rows: def.rows.slice(), spawn: def.spawn, biome: BIOME_OF[key] || 'meadow', buildings: [], props: def.props.map(p => Object.assign({}, p)), solid: [], entries: {}, exits: {} };
  (EXITS_BY_DISTRICT[key] || []).forEach(exit => {
    const t = edgeTileFor(m, exit.dir, exit.at);
    const row = m.rows[t.y].split(''); row[t.x] = '=';
    m.rows[t.y] = row.join('');
    m.exits[t.x + ',' + t.y] = exit;
  });
  for (let y = 0; y < m.h; y++) { m.solid[y] = []; for (let x = 0; x < m.w; x++) m.solid[y][x] = SOLID_TERRAIN.includes(m.rows[y][x]); }
  def.buildings.forEach(b => {
    const t = BUILDING_TYPES[b.type];
    const bb = Object.assign({ w: t.w, h: t.h, sprite: t.sprite, entry: { x: b.x + t.door, y: b.y + t.h } }, b);
    for (let dy = 0; dy < t.h; dy++) for (let dx = 0; dx < t.w; dx++) m.solid[b.y + dy][b.x + dx] = true;
    m.buildings.push(bb); m.entries[bb.entry.x + ',' + bb.entry.y] = bb;
  });
  m.props.forEach(p => { m.solid[p.y][p.x] = true; });
  // which tiles can be reached from the spawn (used so cards and neighbors never appear where you can't go)
  m.reach = Array.from({ length: m.h }, () => Array(m.w).fill(false));
  const q = [m.spawn]; m.reach[m.spawn.y][m.spawn.x] = true;
  while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy;
    if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.reach[ny][nx] || m.solid[ny][nx]) return; m.reach[ny][nx] = true; q.push({ x: nx, y: ny }); }); }
  m.fishTiles = {}; refreshFishTiles(m, key);
  MAP_CACHE[key] = m;
  return m;
}
function buildingAt(m, x, y) { return m.buildings.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) || null; }
function propAt(m, x, y) { return m.props.find(p => p.x === x && p.y === y) || null; }

// Tiles where a card or a neighbor may appear: open, reachable, not a doorstep, not the bridge, and not right on top of the arrival spot.
function spawnable(m, x, y) {
  if (m.solid[y][x] || !m.reach[y][x]) return false;
  if (m.entries[x + ',' + y] || m.exits[x + ',' + y] || m.rows[y][x] === 'b') return false;
  return Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) > 2;
}
function occupiedSet(data) {
  const s = new Set([state.playerPos.x + ',' + state.playerPos.y]);
  data.npcs.forEach(n => { if (!n.defeated) s.add(n.x + ',' + n.y); });
  if (data.boss && !data.boss.defeated && bossVisible()) s.add(data.boss.x + ',' + data.boss.y);
  fighters(data).forEach(f => { if (f.defeated && f.grave) s.add(f.grave.x + ',' + f.grave.y); });
  data.items.forEach(it => { if (!it.collected) s.add(it.x + ',' + it.y); });
  if (data.chest) s.add(data.chest.x + ',' + data.chest.y);
  (data.decorations || []).forEach(d => s.add(d.x + ',' + d.y));
  (data.crops || []).forEach(c => s.add(c.x + ',' + c.y));
  (data.bugs || []).forEach(b => s.add(b.x + ',' + b.y));
  if (data === state.districtData[LANTERN_TILE.district]) s.add(LANTERN_TILE.x + ',' + LANTERN_TILE.y);   // Lumen's pitch stays clear
  return s;
}

// Breadth-first search over walkable tiles. isGoal decides which tiles end the walk; alive neighbors block the way.
function findPath(m, data, from, isGoal) {
  if (isGoal(from.x, from.y)) return [];
  const blocked = new Set();
  data.npcs.forEach(n => { if (!n.defeated) blocked.add(n.x + ',' + n.y); else if (n.grave) blocked.add(n.grave.x + ',' + n.grave.y); });
  if (data.boss) { if (!data.boss.defeated && bossVisible()) blocked.add(data.boss.x + ',' + data.boss.y); else if (data.boss.defeated && data.boss.grave) blocked.add(data.boss.grave.x + ',' + data.boss.grave.y); }
  const prev = new Map(), start = from.x + ',' + from.y, q = [from];
  prev.set(start, null);
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || prev.has(k) || m.solid[ny][nx] || blocked.has(k)) continue;
      prev.set(k, c.x + ',' + c.y);
      if (isGoal(nx, ny)) { const path = []; let cur = k; while (cur !== start) { const [px, py] = cur.split(',').map(Number); path.unshift({ x: px, y: py }); cur = prev.get(cur); } return path; }
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

