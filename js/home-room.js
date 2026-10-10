/* ============================================================
   YOUR COTTAGE AS A ROOM
   ============================================================
   Inside your own cottage (scene id 'home') the stage is a small tile map you walk around instead of an emoji on a counter. It has
   a back wall (two tiles, the lower one a wainscot), side walls, a front wall with the door, and floor in between. The camera is the
   town's: seven tiles across, following you, stopping at the room's edge.

   It reuses what the town already has, so it looks like the town: the tiles are `.town-tile`, the furniture is the r-* symbols in
   assets/sprites.js drawn through svgUse(), and the character is the real one (playerSpriteHTML / applyPlayerSprite, so the walk
   animation, facing, Alyn's turn pictures and the emoji fallback all come for free). Walking is the town's too: one tile every
   STEP_MS, taps find a path (breadth first, like findPath), a new tap cancels the old walk.

   It does NOT replace the scene, it sits in its stage. Furniture that does something (the "menu pieces": mailbox, shelves, framed
   cards, trophy case, altar, sand garden, bonsai, Tidy basket, armchair) is one of the cottage's existing actions in INTERIORS.home
   (js/houses-and-cellar.js): walk up and the scene's own bubble and bottom sheet offer it, and sceneAction() runs it exactly as
   before. The sheet ends in Close, which puts it away and keeps you in the house. The way out is the door: walking onto the doormat
   leaves through the same fade as every other building (sceneAction('leave')).

   MAKING IT YOURS (the Decorate button, top right of the room)
   - The layout is saved in state.progress.home: `items` (each { uid, id, x, y }; `id` is a key of HR_CATALOG), `storage` (owned
     pieces that are not placed, id -> count), `style` (floor / wall / rug palette ids) and `level` (1 to 5). Old saves have none of
     these and get the plain starting layout (HR_DEFAULTS); a home that was already saved keeps what it was given.
   - Town decorations (Shop -> Items) can be placed too: they are items with id 'deco:<id>' (hrDefOf), drawn as their emoji. Placing takes one
     from state.decorationInventory and putting it away gives it back, so the town and the home share one stock.
   - Every piece can be moved or put away, the menu pieces included (a piece that does something is never lost: if it is neither in the room
     nor in storage, hrHome() puts it in storage). A new home is a plain 6 by 6 room with only those pieces. A move is refused if it would
     cover the doormat, the player, or shut the door or any piece in the room that does something off from the player (hrPlaceError / hrReachOk). Wall pieces hang on the back wall (row 1), floor pieces stand on
     the floor, flat pieces (rugs, toys) lie under everything and may overlap other pieces.
   - Home level (HR_LEVELS) is bought with Embers, one step at a time. Each level makes the floor bigger (hrIndex: the room is the
     level's floor plus walls, but never smaller than the furniture already placed, so a home saved at an older size keeps its room; the door
     stays in column 4 so saved positions never move) and reveals more floor, wall and rug colours
     (HR_FLOORS / HR_WALLS / HR_RUGS, `lvl`) and more furniture to buy (HR_CATALOG, `lvl`). Nothing is ever taken away.
   - While decorating you cannot walk, so a drag pans the camera (hrDragMove) and a tap, decided when the finger lifts, picks up or puts down.
   - The Decorate panel is the scene's bottom sheet, with three tabs (Items, Colours, Room). Its buttons use the same `data-act`
     route as every other scene button: sceneAction() hands anything starting 'hr:' (or 'hr-close') to hrAction().
   Indoors has no seasons or weather: the colours are the .hr-room tokens in css/latest.css, overridden only by the chosen palette.

   Hooks into houses-and-cellar.js: renderScene() calls hrSync() after drawing, closeScene() calls hrLeave(), sceneAction() calls
   hrAction(), and SCENE_EXIT_ACTS lists 'hr-close'. The room is built lazily into #scStage (a mini-game rebuilds that element, so
   hrMount() rebuilds the room when it finds it gone). */
const HR_LEVELS = [null,
  { name: 'Cosy', fw: 6, fh: 6, cost: 0 }, { name: 'Comfy', fw: 7, fh: 8, cost: 60 }, { name: 'Homely', fw: 9, fh: 9, cost: 120 },
  { name: 'Spacious', fw: 10, fh: 11, cost: 200 }, { name: 'Grand', fw: 12, fh: 12, cost: 320 }];
const HR_DOOR_X = 4;
// Palettes. `lvl` is the home level that reveals it; `c` is the tones the room uses (floor: three boards; wall: upper wall, wainscot,
// side and front walls; rug: the rug and its edge).
const HR_FLOORS = [
  { id: 'oak', name: 'Honey oak', lvl: 1, c: ['#7f6542', '#7a6140', '#846a46'] }, { id: 'walnut', name: 'Walnut', lvl: 1, c: ['#5f4630', '#5a422c', '#654c34'] },
  { id: 'birch', name: 'Pale birch', lvl: 2, c: ['#a28e6c', '#9c8866', '#a89472'] }, { id: 'slate', name: 'Slate tile', lvl: 3, c: ['#56606a', '#515b65', '#5b656f'] },
  { id: 'moss', name: 'Mossy green', lvl: 4, c: ['#52684a', '#4d6346', '#586f50'] }, { id: 'clay', name: 'Rose clay', lvl: 5, c: ['#8f5d4e', '#895848', '#976555'] }];
const HR_WALLS = [
  { id: 'plaster', name: 'Plaster', lvl: 1, c: ['#a39278', '#5a452d', '#43341f'] }, { id: 'sage', name: 'Sage', lvl: 1, c: ['#8fa088', '#4a5a45', '#3a4838'] },
  { id: 'blush', name: 'Blush', lvl: 2, c: ['#b99a92', '#6a4a45', '#4f3733'] }, { id: 'sea', name: 'Sea glass', lvl: 3, c: ['#8aa6ad', '#43606a', '#33494f'] },
  { id: 'butter', name: 'Butter', lvl: 4, c: ['#c4b278', '#6b5a30', '#524424'] }, { id: 'dusk', name: 'Dusk', lvl: 5, c: ['#7d7aa0', '#44405f', '#363350'] }];
const HR_RUGS = [
  { id: 'teal', name: 'Teal', lvl: 1, c: ['#2f6068', '#244a52'] }, { id: 'red', name: 'Brick', lvl: 1, c: ['#8a3d36', '#6b2e29'] },
  { id: 'plum', name: 'Plum', lvl: 2, c: ['#5f4a7a', '#493860'] }, { id: 'mustard', name: 'Mustard', lvl: 3, c: ['#a8812f', '#85661f'] },
  { id: 'fern', name: 'Fern', lvl: 4, c: ['#4a7a4e', '#385f3c'] }, { id: 'cream', name: 'Cream', lvl: 5, c: ['#cdbf9c', '#a99b78'] }];
/* Everything that can stand in the room. `act` marks a menu piece (an id from INTERIORS.home: owned from the start, never put away).
   The rest is bought with Embers (`cost`) once the home reaches `lvl`. wall = hangs on the back wall, flat = lies on the floor under
   everything (w x h tiles), tall = drawn one and a half tiles high, glow = light it gives off (dx, dy in tiles from its tile). */
const HR_CATALOG = {
  nap: { name: 'Armchair', icon: '🛋️', spr: 'r-armchair', act: 'nap', say: () => 'A sunny chair by the window. The cushion is still warm.' },
  decorate: { name: 'The shelves', icon: '📚', spr: 'r-shelf', tall: 1, wall: 1, act: 'decorate', say: () => 'Room for a few more things.' },
  favs: { name: 'Framed cards', icon: '⭐', spr: 'r-frames', tall: 1, wall: 1, act: 'favs', say: () => 'Your favourite cards, framed on the wall.' },
  trophies: { name: 'Trophy case', icon: '🏆', spr: 'r-trophy', tall: 1, wall: 1, act: 'trophies', say: () => 'Everything you have won so far.' },
  altar: { name: 'The altar', icon: '🕯️', spr: 'r-altar', act: 'altar', glow: { dx: .5, dy: .2, r: 3.2 }, say: () => 'A small flame, always lit.' },
  sand: { name: 'Sand garden', icon: '🪨', spr: 'r-sand', act: 'calm-sand', say: () => 'The sand is smooth, waiting for a rake.' },
  bonsai: { name: 'Your bonsai', icon: '🪴', spr: 'r-bonsai', act: 'calm-bonsai', say: () => 'It looks a little taller than yesterday.' },
  tidy: { name: 'Basket', icon: '🧺', spr: 'r-basket', act: 'mg-tidy', say: () => 'Toys everywhere. Someone has been busy.' },
  mail: { name: 'Mailbox', icon: '📬', spr: 'r-mail', act: 'mail', say: () => unreadMail() ? `📬 ${unreadMail()} unread letter${unreadMail() === 1 ? '' : 's'} in the mailbox.` : 'The mailbox is empty for now.' },
  window: { name: 'Window', icon: '🪟', spr: 'r-window', tall: 1, wall: 1, cost: 30, lvl: 1, glow: { dx: .5, dy: .9, r: 2.6, day: 1 } },
  sconce: { name: 'Wall lamp', icon: '💡', spr: 'r-sconce', tall: 1, wall: 1, cost: 20, lvl: 1, glow: { dx: .5, dy: .6, r: 3 } },
  clock: { name: 'Clock', icon: '🕰️', spr: 'r-clock', tall: 1, wall: 1, cost: 18, lvl: 1 },
  toys: { name: 'Toys', icon: '🧸', spr: 'r-toys', flat: 1, cost: 8, lvl: 1 },
  plant: { name: 'Potted plant', icon: '🪴', spr: 'r-plant', cost: 12, lvl: 1 },
  stool: { name: 'Stool', icon: '🪑', spr: 'r-stool', cost: 10, lvl: 1 },
  table: { name: 'Side table', icon: '🌼', spr: 'r-table', cost: 22, lvl: 1 },
  lamp: { name: 'Floor lamp', icon: '🏮', spr: 'r-lamp', tall: 1, cost: 30, lvl: 1, glow: { dx: .5, dy: .4, r: 3 } },
  rug2: { name: 'Small rug', icon: '🧶', flat: 1, rug: 1, w: 2, h: 2, cost: 18, lvl: 1 },
  rug3: { name: 'Rug', icon: '🧶', flat: 1, rug: 1, w: 3, h: 3, cost: 30, lvl: 1 },
  cot: { name: 'Cot', icon: '🛏️', spr: 'r-cot', cost: 60, lvl: 2 },
  painting: { name: 'Painting', icon: '🖼️', spr: 'r-painting', tall: 1, wall: 1, cost: 25, lvl: 2 },
  bookcase: { name: 'Bookcase', icon: '📚', spr: 'r-shelf', tall: 1, cost: 45, lvl: 2 },
  cat: { name: 'Sleeping cat', icon: '🐈', spr: 'r-cat', cost: 40, lvl: 2 },
  fireplace: { name: 'Fireplace', icon: '🔥', spr: 'r-fireplace', tall: 1, wall: 1, cost: 120, lvl: 3, glow: { dx: .5, dy: .9, r: 3.8 } },
  wardrobe: { name: 'Wardrobe', icon: '🚪', spr: 'r-wardrobe', tall: 1, cost: 70, lvl: 3 },
  chest: { name: 'Chest', icon: '🧰', spr: 'r-chest', cost: 50, lvl: 3 },
  tree: { name: 'Indoor tree', icon: '🌳', spr: 'r-tree', tall: 1, cost: 90, lvl: 4 },
  rug4: { name: 'Grand rug', icon: '🧶', flat: 1, rug: 1, w: 4, h: 4, cost: 60, lvl: 4 },
  // Spirit pieces (js/home-spirits.js). `uses` marks a piece with a sheet of its own (like the menu pieces, but not one of INTERIORS.home's
  // actions); `family` marks a family corner, which draws spirits of that family to visit.
  perch: { name: 'Spirit perch', icon: '🕊️', spr: 'r-perch', tall: 1, uses: 1, cost: 40, lvl: 2, say: () => hsSay('perch') },
  cabinet: { name: 'Collector\'s cabinet', icon: '🏅', spr: 'r-cabinet', tall: 1, wall: 1, uses: 1, cost: 60, lvl: 2, say: () => hsSay('cabinet') },
  mantel: { name: 'Reborn mantel', icon: '✨', spr: 'r-mantel', tall: 1, wall: 1, uses: 1, cost: 120, lvl: 3, say: () => hsSay('mantel') },
  grove: { name: 'Grove nook', icon: '🌿', spr: 'r-grove', family: 'grove', cost: 45, lvl: 2 },
  cairn: { name: 'Memory cairn', icon: '🪨', spr: 'r-cairn', family: 'stone', cost: 45, lvl: 2 },
  basin: { name: 'Tide basin', icon: '🌊', spr: 'r-basin', family: 'tide', cost: 45, lvl: 2 },
  chimes: { name: 'Wind chimes', icon: '🎐', spr: 'r-chimes', family: 'wind', cost: 45, lvl: 2 }
};
const hrUses = d => !!(d.act || d.uses);   // a piece you walk up to and use
// A new home: a plain 6 by 6 room with only the pieces that do something, and nothing to look at (no windows, rug, lamp or toys), so there
// is something to want. Every piece here can be moved or put away. Homes saved before this keep the layout they were given.
const HR_DEFAULTS = [
  { uid: 'nap', id: 'nap', x: 1, y: 2 }, { uid: 'decorate', id: 'decorate', x: 2, y: 1 }, { uid: 'favs', id: 'favs', x: 3, y: 1 }, { uid: 'trophies', id: 'trophies', x: 5, y: 1 },
  { uid: 'altar', id: 'altar', x: 6, y: 2 }, { uid: 'bonsai', id: 'bonsai', x: 6, y: 4 }, { uid: 'sand', id: 'sand', x: 1, y: 5 }, { uid: 'tidy', id: 'tidy', x: 1, y: 7 },
  { uid: 'mail', id: 'mail', x: 6, y: 7 }];
const homeRoom = { focus: null, drag: null, scene: null, host: null, world: null, player: null, ring: null, badge: null, ro: null, edit: null,
  t: 58, vw: 400, vh: 600, cx: 0, cy: 0, x: 4, y: 9, sel: null, walk: 0, hadModal: false,
  cols: 9, rows: 11, solid: new Map() };

/* ---------------- the saved layout ---------------- */
// A town decoration (bought in Shop -> Items, counted in state.decorationInventory) placed in the home is an item whose id is
// 'deco:<decoration id>'. It is drawn as its emoji, stands on the floor like any other piece and does nothing. Placing it takes one from
// the same inventory the town uses and putting it away gives it back, so it can go out into town again. No home level is needed.
function hrDefOf(id) {
  if (HR_CATALOG[id]) return HR_CATALOG[id];
  const d = typeof id === 'string' && id.startsWith('deco:') && DECORATION_ITEMS.find(x => x.id === id.slice(5));
  return d ? { name: d.name, icon: d.icon, emoji: 1, deco: d.id } : null;
}
function hrDecoGive(id, n) { state.decorationInventory = state.decorationInventory || {}; state.decorationInventory[id] = Math.max(0, decorationInventoryCount(id) + n); }
function hrHome() {   // your cottage's saved state, filled in (and tidied) the first time it is read
  const h = homeState(), pal = (list, id) => list.some(p => p.id === id) ? id : list[0].id;
  if (!Array.isArray(h.shelf)) h.shelf = []; if (!Array.isArray(h.favs)) h.favs = [];   // the shelves and framed cards (js/houses-and-cellar.js) expect these
  if (!(h.level >= 1 && h.level <= 5)) h.level = 1;
  h.level = Math.floor(h.level);
  if (!h.style || typeof h.style !== 'object') h.style = {};
  h.style.floor = pal(HR_FLOORS, h.style.floor); h.style.wall = pal(HR_WALLS, h.style.wall); h.style.rug = pal(HR_RUGS, h.style.rug);
  if (!h.storage || typeof h.storage !== 'object') h.storage = {};
  Object.keys(h.storage).forEach(k => { if (!HR_CATALOG[k] || !(h.storage[k] > 0)) delete h.storage[k]; });
  if (!Array.isArray(h.items)) h.items = HR_DEFAULTS.map(d => Object.assign({}, d));
  h.items = h.items.filter(i => i && hrDefOf(i.id) && Number.isFinite(i.x) && Number.isFinite(i.y) && typeof i.uid === 'string');
  Object.keys(HR_CATALOG).forEach(id => { if (HR_CATALOG[id].act && !h.storage[id] && !h.items.some(i => i.id === id)) h.storage[id] = 1; });   // a piece that does something is never lost: if it is not in the room it is in storage
  if (!(h.nextUid > 0)) h.nextUid = 1;
  return h;
}
function hrIndex() {   // room size, and which tiles are blocked, from the saved layout
  const h = hrHome(), L = HR_LEVELS[h.level], r = homeRoom;
  let fw = L.fw, fh = L.fh;
  h.items.forEach(i => { const d = hrDefOf(i.id); fw = Math.max(fw, i.x + (d.w || 1) - 1); if (!d.wall) fh = Math.max(fh, i.y + (d.h || 1) - 2); });   // a home saved at an older, bigger size keeps every piece inside its walls
  r.cols = fw + 2; r.rows = fh + 3; r.solid = new Map();
  h.items.forEach(i => { if (!hrDefOf(i.id).flat) r.solid.set(i.x + ',' + i.y, i); });
}
function hrMatY() { return homeRoom.rows - 2; }
function hrKind(x, y) { const r = homeRoom; return y === 0 ? 'wt' : y === 1 ? 'wb' : y === r.rows - 1 ? (x === HR_DOOR_X ? 'door' : 'ws') : (x === 0 || x === r.cols - 1) ? 'ws' : 'floor'; }
function hrDef(it) { return hrDefOf(it.id); }
function hrItemAt(x, y) { return homeRoom.solid.get(x + ',' + y) || null; }
function hrFlatAt(x, y) { return hrHome().items.find(i => { const d = hrDef(i); return d.flat && x >= i.x && x < i.x + (d.w || 1) && y >= i.y && y < i.y + (d.h || 1); }) || null; }
function hrWalkable(x, y, solid) {
  const r = homeRoom; if (x < 0 || y < 0 || x >= r.cols || y >= r.rows) return false;
  const k = hrKind(x, y); return (k === 'floor' || k === 'door') && !(solid || r.solid).has(x + ',' + y);
}
function hrBfs(sx, sy, goal, solid) {   // shortest path over walkable tiles, as [x, y] steps (null when there is none)
  if (goal(sx, sy)) return [];
  const cols = homeRoom.cols, key = (x, y) => y * cols + x, prev = { [key(sx, sy)]: -1 }, q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (!hrWalkable(nx, ny, solid) || prev[key(nx, ny)] !== undefined) continue;
      prev[key(nx, ny)] = key(x, y);
      if (goal(nx, ny)) { const p = []; let c = key(nx, ny); while (c !== key(sx, sy)) { p.push([c % cols, (c / cols) | 0]); c = prev[c]; } return p.reverse(); }
      q.push([nx, ny]);
    }
  }
  return null;
}
// After a hypothetical change: can the player still reach the door and a spot beside every menu piece?
function hrReachOk(items) {
  const r = homeRoom, solid = new Map();
  items.forEach(i => { if (!hrDef(i).flat) solid.set(i.x + ',' + i.y, i); });
  const seen = new Set([r.x + ',' + r.y]), q = [[r.x, r.y]];
  for (let n = 0; n < q.length; n++) for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
    const nx = q[n][0] + dx, ny = q[n][1] + dy;
    if (seen.has(nx + ',' + ny) || !hrWalkable(nx, ny, solid)) continue;
    seen.add(nx + ',' + ny); q.push([nx, ny]);
  }
  if (!seen.has(HR_DOOR_X + ',' + (r.rows - 1))) return false;
  return items.filter(i => hrUses(hrDef(i))).every(i => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has((i.x + dx) + ',' + (i.y + dy))));
}
// Why a piece cannot go on that tile (a short sentence), or null when it can. `uid` is the piece being moved (null for a new one).
function hrPlaceError(id, x, y, uid) {
  const r = homeRoom, d = hrDefOf(id), h = hrHome(), w = d.w || 1, hh = d.h || 1;
  if (d.flat) {
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < hh; dy++) if (hrKind(x + dx, y + dy) !== 'floor') return 'That has to lie on the floor.';
    const clash = h.items.some(i => i.uid !== uid && hrDef(i).flat && hrDef(i).rug && d.rug && x < i.x + (hrDef(i).w || 1) && i.x < x + w && y < i.y + (hrDef(i).h || 1) && i.y < y + hh);
    return clash ? 'There is already a rug there.' : null;
  }
  if (d.wall) {
    if (y !== 1 || x < 1 || x > r.cols - 2) return 'That hangs on the back wall.';
    const o = hrItemAt(x, y); return o && o.uid !== uid ? 'That spot is taken.' : null;
  }
  if (hrKind(x, y) !== 'floor' || y < 2) return 'That stands on the floor.';
  const o = hrItemAt(x, y); if (o && o.uid !== uid) return 'That spot is taken.';
  if (x === HR_DOOR_X && y === hrMatY()) return 'Keep the doormat clear.';
  if (x === r.x && y === r.y) return 'You are standing there. Step aside first.';
  const next = h.items.filter(i => i.uid !== uid).concat([{ uid: uid || 'new', id, x, y }]);
  return hrReachOk(next) ? null : 'That would block the way.';
}
function hrCommit() { saveState(); hrIndex(); hrRefresh(); }   // the layout changed: save it and redraw the room

/* ---------------- building the room ---------------- */
function hrPalette(list, id) { return list.find(p => p.id === id) || list[0]; }
function hrApplyStyle() {
  const h = hrHome(), f = hrPalette(HR_FLOORS, h.style.floor).c, w = hrPalette(HR_WALLS, h.style.wall).c, g = hrPalette(HR_RUGS, h.style.rug).c, s = homeRoom.host.style;
  s.setProperty('--floor1', f[0]); s.setProperty('--floor2', f[1]); s.setProperty('--floor3', f[2]);
  s.setProperty('--wall-up', w[0]); s.setProperty('--wainscot', w[1]); s.setProperty('--wall-side', w[2]);
  s.setProperty('--rug', g[0]); s.setProperty('--rug2', g[1]);
}
function hrWorldHtml() {
  const r = homeRoom, h = hrHome(); let s = '<div class="hr-world snap">';
  for (let y = 0; y < r.rows; y++) for (let x = 0; x < r.cols; x++) {
    const k = hrKind(x, y);
    if (k === 'floor' || k === 'door') s += `<div class="town-tile hr-f${1 + ((x * 7 + y * 13 + x * y) % 3)}" style="--x:${x};--y:${y}">${svgUse(((x + y * 2) & 1) ? 'r-plank-a' : 'r-plank-b')}</div>`;
    else s += `<div class="town-tile hr-${k}" style="--x:${x};--y:${y}"></div>`;
  }
  const glows = [{ x: HR_DOOR_X + .5, y: r.rows - 1.6, r: 3.4, day: 1 }];
  h.items.forEach(i => {
    const d = hrDef(i);
    if (d.rug) s += `<div class="hr-rug" style="left:calc(var(--t)*${i.x});top:calc(var(--t)*${i.y});width:calc(var(--t)*${d.w});height:calc(var(--t)*${d.h})"></div>`;
    else s += `<div class="hr-prop${d.flat ? ' flat' : ''}${d.tall ? ' tall' : ''}${d.emoji ? ' emoji' : ''}${typeof hsClass === 'function' ? hsClass(i) : ''}" style="--x:${i.x};--y:${i.y}">${d.emoji ? `<span>${d.icon}</span>` : svgUse(d.spr)}${typeof hsExtras === 'function' ? hsExtras(i) : ''}</div>`;
    if (d.glow) glows.push({ x: i.x + d.glow.dx, y: i.y + d.glow.dy, r: d.glow.r, day: d.glow.day });
  });
  s += `<div class="hr-prop deco door" style="--x:${HR_DOOR_X};--y:${r.rows - 1}">${svgUse('r-door')}</div><div class="hr-prop deco mat" style="--x:${HR_DOOR_X};--y:${hrMatY()}">${svgUse('r-mat')}</div>`;
  glows.forEach(g => { s += `<div class="hr-glow${g.day ? ' day' : ''}" style="left:calc(var(--t)*${g.x - g.r / 2});top:calc(var(--t)*${g.y - g.r / 2});width:calc(var(--t)*${g.r});height:calc(var(--t)*${g.r})"></div>`; });
  return s + (typeof hsEntitiesHtml === 'function' ? hsEntitiesHtml() : '') + '<div class="hr-ring hidden"></div><div class="hr-badge hidden"></div><div class="ent player hr-player">' + playerSpriteHTML() + '</div></div>';
}
function hrFill() {   // (re)draw everything inside the host
  const h = homeRoom;
  h.host.innerHTML = hrWorldHtml() + '<div class="hr-vignette"></div><button class="hr-edit-btn" type="button"></button>';
  hrApplyStyle();
  h.world = h.host.querySelector('.hr-world'); h.player = h.host.querySelector('.hr-player'); h.ring = h.host.querySelector('.hr-ring'); h.badge = h.host.querySelector('.hr-badge');
}
function hrMount() {
  const h = homeRoom;
  if (h.host && h.host.isConnected) return;
  if (h.ro) h.ro.disconnect();
  hrIndex();
  const stage = document.getElementById('scStage');
  h.host = document.createElement('div'); h.host.className = 'hr-room'; stage.appendChild(h.host);
  hrFill();
  h.host.addEventListener('pointerdown', hrTap);
  h.host.addEventListener('pointermove', hrDragMove); h.host.addEventListener('pointerup', hrDragEnd); h.host.addEventListener('pointercancel', () => { homeRoom.drag = null; });
  h.host.addEventListener('click', e => { if (e.target.closest('.hr-edit-btn')) hrToggleEdit(); });
  h.ro = new ResizeObserver(() => hrLayout()); h.ro.observe(h.host);
  hrLayout();
}
function hrRefresh() { if (homeRoom.host) { hrFill(); hrLayout(); hrSync(); } }
function hrEnter() {   // a fresh visit starts on the doormat, facing the room
  const h = homeRoom; hrIndex(); h.scene = scene; h.x = HR_DOOR_X; h.y = hrMatY(); h.sel = null; h.edit = null; h.hadModal = false; h.walk++;
  playerFaceFromMove({ x: HR_DOOR_X, y: h.y + 1 }, { x: HR_DOOR_X, y: h.y });
  if (typeof hsEnter === 'function') hsEnter();   // js/home-spirits.js: a spirit may have come to visit
}
function hrLeave() {
  const h = homeRoom; h.walk++;
  if (typeof hsLeave === 'function') hsLeave();
  if (h.ro) { h.ro.disconnect(); h.ro = null; }
  if (h.host) { h.host.remove(); h.host = null; h.world = h.player = null; }
  h.scene = null; h.sel = null; h.edit = null; h.hadModal = false;
  if (typeof sceneView !== 'undefined') sceneView.classList.remove('room-on', 'hr-idle');
}

/* ---------------- camera, layout, the player ---------------- */
function hrLayout() {
  const h = homeRoom; if (!h.host || !h.world) return;
  const r = h.host.getBoundingClientRect(); if (!r.width || !r.height) return;
  h.vw = r.width; h.vh = r.height; h.t = Math.max(38, Math.ceil(h.vw / 7));
  h.host.style.setProperty('--t', h.t + 'px');
  h.world.style.width = h.cols * h.t + 'px'; h.world.style.height = h.rows * h.t + 'px';
  hrPlace(false); hrCamera(true); hrBadge(); hrMarks();
}
// Centre on the player like the town does, but never show past the room's edge; a room smaller than the view sits in the middle.
// The top is kept clear of the floating top bar.
function hrCamera(snap) {
  const h = homeRoom; if (!h.world) return;
  const hud = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-h')) || 72, top = hud + 6, bottom = 8, avail = h.vh - top - bottom;
  const f = h.edit && h.focus ? h.focus : { x: h.x + .5, y: h.y + .5 };   // decorating: the camera goes where you dragged it, not after the player
  const px = f.x * h.t, py = f.y * h.t, rw = h.cols * h.t, rh = h.rows * h.t;
  h.cx = rw <= h.vw ? (h.vw - rw) / 2 : Math.max(h.vw - rw, Math.min(0, h.vw / 2 - px));
  h.cy = rh <= avail ? top + (avail - rh) / 2 : Math.max(h.vh - bottom - rh, Math.min(top, top + avail / 2 - py));
  h.world.classList.toggle('snap', !!snap || !btMotionOk());
  h.world.style.transition = snap || !btMotionOk() ? 'none' : `transform ${STEP_MS}ms linear`;
  h.world.style.transform = `translate(${h.cx}px,${h.cy}px)`;
}
function hrPlace(animate) {
  const h = homeRoom, el = h.player; if (!el) return;
  el.style.transition = animate && btMotionOk() ? `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear` : 'none';
  el.style.setProperty('--x', h.x); el.style.setProperty('--y', h.y); el.style.zIndex = h.y * 10 + 5;
  const badge = el.querySelector('.pl-badge');
  if (badge) { badge.textContent = state.character.emoji; applyAvatarStyle(badge, state.character); }   // the emoji badge is the fallback when there is no drawn art
  else applyPlayerSprite(el, state.character, animate);
}
function hrBadge() {   // the unread count on the letter table
  const h = homeRoom; if (!h.badge) return;
  const m = hrHome().items.find(i => i.id === 'mail'), n = unreadMail();
  h.badge.classList.toggle('hidden', !n || !m); h.badge.textContent = n;
  if (m) { h.badge.style.left = (m.x + .62) * h.t + 'px'; h.badge.style.top = (m.y + .02) * h.t + 'px'; }
}
function hrSelected() { const h = homeRoom, id = h.edit ? h.edit.sel : h.sel; return id ? hrHome().items.find(i => i.uid === id) || null : null; }
// A ring round the piece you are using or moving, and (while placing) a tint on every tile it could go on.
function hrMarks() {
  const h = homeRoom; if (!h.ring || !h.world) return;
  h.world.querySelectorAll('.hr-target').forEach(e => e.remove());
  const it = hrSelected(), d = it && hrDef(it);
  h.ring.classList.toggle('hidden', !it);
  if (it) {
    const w = d.w || 1, hh = d.h || 1, top = d.tall ? it.y - .5 : it.y, ht = d.tall ? 1.5 : hh;
    h.ring.style.cssText = `left:${it.x * h.t + 3}px;top:${top * h.t + 3}px;width:${w * h.t - 6}px;height:${ht * h.t - 6}px`;
  }
  const e = h.edit, id = e && (e.pick || (it && it.id));
  if (!e || !id) return;
  const def = hrDefOf(id), uid = e.pick ? null : it.uid; let html = '';
  for (let y = 0; y < h.rows; y++) for (let x = 0; x < h.cols; x++) {
    const [ox, oy] = def.flat ? hrAnchor(def, x, y) : [x, y];   // a rug is put down by its middle, so the tint marks the middle tile
    if (!hrPlaceError(id, ox, oy, uid) && !(it && it.x === ox && it.y === oy)) html += `<div class="hr-target" style="left:${x * h.t + 4}px;top:${y * h.t + 4}px;width:${h.t - 8}px;height:${h.t - 8}px"></div>`;
  }
  h.world.insertAdjacentHTML('beforeend', html);
}
function hrAnchor(d, tx, ty) { return [tx - Math.floor(((d.w || 1) - 1) / 2), ty - Math.floor(((d.h || 1) - 1) / 2)]; }   // a rug is placed by its middle

/* ---------------- walking and using furniture ---------------- */
function hrWalk(path, then) {
  const h = homeRoom, my = ++h.walk;
  h.player.classList.toggle('walking', path.length > 0);
  let i = 0;
  const next = () => {
    if (my !== h.walk || !h.player) return;
    if (i >= path.length) { h.player.classList.remove('walking'); hrArrive(then); return; }
    const [nx, ny] = path[i++];
    playerFaceFromMove({ x: h.x, y: h.y }, { x: nx, y: ny });
    h.x = nx; h.y = ny; hrPlace(true); hrCamera(false);
    setTimeout(next, btMotionOk() ? STEP_MS : 0);
  };
  next();
}
function hrArrive(item) {
  const h = homeRoom;
  if (h.y === h.rows - 1) { sceneAction('leave'); return; }   // the doorway: the usual fade back to the street
  if (item) hrSelect(item);
}
function hrSelect(it) {
  const h = homeRoom; if (!scene || scene.id !== 'home') return;
  playerFaceFromMove({ x: h.x, y: h.y }, { x: it.x, y: it.y }); hrPlace(false);
  h.sel = it.uid; scene.text = hrDef(it).say(); sfx('tap');
  renderScene();   // hrSync() puts the action in the sheet
}
function hrGoTo(it) {
  const h = homeRoom; if (!h.player) return;
  const path = hrBfs(h.x, h.y, (x, y) => Math.abs(x - it.x) + Math.abs(y - it.y) === 1);
  if (!path) { toast('Something is in the way.'); return; }
  hrWalk(path, it);
}
function hrTileAt(e) { const h = homeRoom, r = h.host.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - h.cx) / h.t), Math.floor((e.clientY - r.top - h.cy) / h.t)]; }
function hrDragMove(e) {
  const h = homeRoom, d = h.drag; if (!d || !h.edit) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!d.moved && Math.hypot(dx, dy) < 8) return;
  d.moved = true; h.focus = { x: d.fx - dx / h.t, y: d.fy - dy / h.t }; hrCamera(true);
}
function hrDragEnd(e) {
  const h = homeRoom, d = h.drag; h.drag = null;
  if (!d || d.moved || !h.edit || !h.world) return;
  const [tx, ty] = hrTileAt(e);
  if (tx >= 0 && ty >= 0 && tx < h.cols && ty < h.rows) hrEditTap(tx, ty);
}
function hrPieceAt(tx, ty) { return hrItemAt(tx, ty) || (() => { const below = hrItemAt(tx, ty + 1); return below && hrDef(below).tall ? below : null; })(); }   // a tall piece's top half counts too
function hrTap(e) {
  const h = homeRoom;
  if (!h.world || doorFading || !scene || scene.mode || scene.leaving || (e.target && e.target.closest && e.target.closest('.hr-edit-btn'))) return;   // a letter list or the shelves are open: the sheet is in charge
  if (h.edit) {   // decorating: a drag moves the camera, a tap picks up or puts down (decided when the finger lifts)
    h.drag = { x: e.clientX, y: e.clientY, fx: h.focus.x, fy: h.focus.y, moved: false };
    try { h.host.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic event has no pointer */ }
    return;
  }
  const [tx, ty] = hrTileAt(e);
  if (tx < 0 || ty < 0 || tx >= h.cols || ty >= h.rows) return;
  const item = hrPieceAt(tx, ty);
  if (typeof hsTapVisitor === 'function' && hsTapVisitor(tx, ty)) return;   // a visiting spirit
  if (item && !hrUses(hrDef(item))) return;   // a plant or a lamp does nothing; only the pieces with something to use are for using
  const path = item ? null : (hrWalkable(tx, ty) ? hrBfs(h.x, h.y, (x, y) => x === tx && y === ty) : null);
  if (!item && !path) return;
  if (h.sel) { h.sel = null; renderScene(); }   // any new tap puts the sheet away
  if (item) hrGoTo(item); else hrWalk(path, null);
}

/* ---------------- decorating ---------------- */
function hrToggleEdit() {
  const h = homeRoom; if (!scene || scene.id !== 'home' || scene.mode || doorFading) return;
  h.walk++; h.player.classList.remove('walking'); h.sel = null;
  h.edit = h.edit ? null : { tab: 'items', sel: null, pick: null };
  h.focus = { x: h.x + .5, y: h.y + .5 }; h.drag = null;
  sfx('nav'); if (h.edit) showTipOnce('homeDecor');
  renderScene(); hrCamera(true);
}
function hrEditTap(tx, ty) {
  const h = homeRoom, e = h.edit, home = hrHome();
  const hit = hrPieceAt(tx, ty) || hrFlatAt(tx, ty);
  if (e.pick) { hrPutDown(e.pick, null, tx, ty); return; }
  const cur = e.sel && home.items.find(i => i.uid === e.sel);
  if (hit && (!cur || hit.uid !== cur.uid)) { e.sel = hit.uid; sfx('tap'); renderScene(); return; }
  if (hit && cur) { e.sel = null; renderScene(); return; }   // tapping the selected piece again lets go of it
  if (cur) hrPutDown(cur.id, cur, tx, ty);
}
function hrPutDown(id, cur, tx, ty) {   // a new piece from storage (cur null) or a move of `cur`, to the tile that was tapped
  const h = homeRoom, e = h.edit, home = hrHome(), d = hrDefOf(id), [x, y] = d.flat ? hrAnchor(d, tx, ty) : [tx, ty];
  const err = hrPlaceError(id, x, y, cur ? cur.uid : null);
  if (err) { toast(err); sfx('tie'); return; }
  if (cur) { cur.x = x; cur.y = y; }
  else {
    if (d.deco) { if (decorationInventoryCount(d.deco) < 1) { toast('You have none of those left.'); return; } hrDecoGive(d.deco, -1); }
    else { home.storage[id]--; if (home.storage[id] <= 0) delete home.storage[id]; }
    home.items.push({ uid: 'u' + home.nextUid++, id, x, y }); e.pick = null; }
  sfx('claim'); buzz(HAP.tap); hrCommit(); renderScene();
}
function hrEditHint() {
  const e = homeRoom.edit, it = hrSelected();
  const noun = n => n.replace(/^(the|your) /i, '').toLowerCase();   // 'Your bonsai' reads as 'the bonsai'
  if (e.pick) return `Tap a spot to put the ${noun(hrDefOf(e.pick).name)} down.`;
  if (it) return `Tap a spot to move the ${noun(hrDef(it).name)}, or use the buttons below.`;
  return { items: 'Tap a piece to move it, or pick something below to place.', colors: 'Choose the colours of your floor, walls and rug.', room: 'Make your home bigger and unlock more.' }[e.tab];
}
function hrLocked(lvl) { return (lvl || 1) > hrHome().level; }
function hrSwatches(title, list, key) {
  const cur = hrHome().style[key];
  return `<div class="hr-h">${title}</div><div class="hr-sws">` + list.map(p => `<button class="hr-sw${p.id === cur ? ' on' : ''}" data-act="hr:${key}:${p.id}" ${hrLocked(p.lvl) ? 'disabled' : ''} style="--a:${p.c[0]};--b:${p.c[1]}"><i></i><span>${hrLocked(p.lvl) ? `Lv ${p.lvl}` : p.name}</span></button>`).join('') + '</div>';
}
function hrUnlockText(lvl) {   // what a level reveals, in a line
  const bits = [];
  const f = HR_LEVELS[lvl], p = HR_LEVELS[lvl - 1];
  if (p && (f.fw !== p.fw || f.fh !== p.fh)) bits.push(`a bigger floor (${f.fw} by ${f.fh})`);
  const cols = [].concat(HR_FLOORS, HR_WALLS, HR_RUGS).filter(c => c.lvl === lvl).length;
  if (cols) bits.push(`${cols} new colour${cols === 1 ? '' : 's'}`);
  const items = Object.values(HR_CATALOG).filter(d => d.lvl === lvl).map(d => d.name.toLowerCase());
  if (items.length) bits.push(items.join(', '));
  if (typeof HS_LEVEL_PERKS !== 'undefined' && HS_LEVEL_PERKS[lvl]) bits.push(HS_LEVEL_PERKS[lvl]);
  return bits.join(' · ');
}
function hrEditHtml() {
  const e = homeRoom.edit, home = hrHome(), it = hrSelected(), tabs = [['items', 'Items'], ['colors', 'Colours'], ['room', 'Room']];
  let s = '<div class="hr-tabs">' + tabs.map(([k, n]) => `<button class="btn sc-btn${e.tab === k ? ' on' : ''}" data-act="hr:tab:${k}">${n}</button>`).join('') + '</div>';
  if (e.tab === 'items') {
    if (it) {
      const d = hrDef(it);
      s += `<div class="hr-h">${d.icon} ${d.name}</div>` + sceneBtn('hr:store', d.deco ? '📦 Put it back in your decorations' : '📦 Put it away') + sceneBtn('hr:desel', 'Let go of it');
    } else if (e.pick) s += `<div class="hr-h">Placing</div>` + sceneBtn('hr:desel', `Cancel · ${hrDefOf(e.pick).name}`);
    else {
      const owned = Object.keys(home.storage);
      if (owned.length) s += '<div class="hr-h">In storage</div>' + owned.map(id => sceneBtn('hr:place:' + id, `${HR_CATALOG[id].icon} ${HR_CATALOG[id].name} · ×${home.storage[id]}`)).join('');
      const decos = DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0);
      if (decos.length) s += '<div class="hr-h">Your decorations</div>' + decos.map(d => sceneBtn('hr:place:deco:' + d.id, `${d.icon} ${d.name} · ×${decorationInventoryCount(d.id)}`)).join('');
      const buy = Object.entries(HR_CATALOG).filter(([, d]) => d.cost).sort((a, b) => a[1].lvl - b[1].lvl || a[1].cost - b[1].cost);
      s += '<div class="hr-h">Buy</div>' + buy.map(([id, d]) => hrLocked(d.lvl)
        ? sceneBtn('hr:noop', `🔒 ${d.name} · Home Lv ${d.lvl}`, true) : sceneBtn('hr:buy:' + id, `${d.icon} ${d.name} · 🫧 ${d.cost}`, state.progress.pebbles < d.cost)).join('');
    }
  } else if (e.tab === 'colors') s += hrSwatches('Floor', HR_FLOORS, 'floor') + hrSwatches('Walls', HR_WALLS, 'wall') + hrSwatches('Rug', HR_RUGS, 'rug');
  else {
    const L = HR_LEVELS[home.level], N = HR_LEVELS[home.level + 1];
    s += `<div class="hr-h">Your home</div><div class="hr-info"><b>Level ${home.level} · ${L.name}</b><span>Floor ${L.fw} by ${L.fh}</span></div>`;
    if (N) s += `<div class="hr-info"><b>Next: Level ${home.level + 1} · ${N.name}</b><span>Reveals ${hrUnlockText(home.level + 1)}</span></div>` + sceneBtn('hr:up', `⬆️ Upgrade your home · 🫧 ${N.cost}`, state.progress.pebbles < N.cost);
    else s += '<div class="hr-info"><b>Your home is as grand as it gets</b><span>Every colour and piece is yours.</span></div>';
  }
  return s + sceneBtn('hr-close', '✓ Done');
}
// Every button the room adds goes through here: 'hr-close' and 'hr:<what>:<which>'.
function hrAction(act) {
  const h = homeRoom, home = hrHome(); if (!scene || scene.id !== 'home') return;
  const parts = act === 'hr-close' ? ['hr', 'close'] : act.split(':'), what = parts[1], which = parts.slice(2).join(':');   // 'hr:place:deco:planter' -> place, deco:planter
  const e = h.edit;
  if (what === 'close') { if (e) { h.edit = null; h.drag = null; } else { scene.mode = null; } h.sel = null; sfx('nav'); renderScene(); hrCamera(true); return; }
  if (what === 'noop') return;
  if (!e) return;
  if (what === 'tab') { e.tab = which; e.sel = null; e.pick = null; sfx('nav'); }
  else if (what === 'desel') { e.sel = null; e.pick = null; sfx('nav'); }
  else if (what === 'place') { const d = hrDefOf(which); if (d && (d.deco ? decorationInventoryCount(d.deco) > 0 : home.storage[which])) { e.pick = which; e.sel = null; sfx('tap'); } }
  else if (what === 'store') {
    const it = hrSelected();
    if (it) {
      home.items = home.items.filter(i => i.uid !== it.uid);
      if (hrDef(it).deco) hrDecoGive(hrDef(it).deco, 1); else home.storage[it.id] = (home.storage[it.id] || 0) + 1;   // a town decoration goes back to the town's inventory
      e.sel = null; sfx('tap'); hrCommit();
    }
  } else if (what === 'buy') {
    const d = HR_CATALOG[which];
    if (!d || !d.cost || hrLocked(d.lvl)) return;
    if (state.progress.pebbles < d.cost) { toast('Not enough Embers yet'); sfx('tie'); return; }
    spendPebbles(d.cost, 'home'); home.storage[which] = (home.storage[which] || 0) + 1; e.pick = which; e.sel = null;
    saveState(); updateHud(); bumpPill('pillPebbles'); sfx('claim'); buzz(HAP.found); toast(`${d.icon} Bought. Tap a spot to put it down.`);
  } else if (what === 'floor' || what === 'wall' || what === 'rug') {
    const list = { floor: HR_FLOORS, wall: HR_WALLS, rug: HR_RUGS }[what], p = list.find(q => q.id === which);
    if (p && !hrLocked(p.lvl)) { home.style[what] = p.id; saveState(); hrApplyStyle(); sfx('tap'); }
  } else if (what === 'up') {
    const N = HR_LEVELS[home.level + 1];
    if (!N) return;
    if (state.progress.pebbles < N.cost) { toast('Not enough Embers yet'); sfx('tie'); return; }
    spendPebbles(N.cost, 'home'); home.level++; saveState(); updateHud(); bumpPill('pillPebbles'); sfx('claim'); buzz(HAP.found);
    toast(`🏠 Your home is now level ${home.level}: ${N.name}`); logEvent('🏠', `Your home grew to level ${home.level}, ${N.name}.`);
    hrIndex(); hrRefresh(); return;   // hrRefresh redraws the bigger room and runs the sheet
  }
  renderScene();
}

/* ---------------- the scene around the room ---------------- */
// Called at the end of renderScene(). With nothing open the room fills the screen (.hr-idle); with a piece of furniture picked, the
// Decorate panel open, or one of the cottage's own screens open, the stage shrinks to the usual size and the sheet shows the action,
// so the sheet never hides you.
function hrSync() {
  const h = homeRoom;
  if (!scene || scene.id !== 'home') { if (h.scene) hrLeave(); return; }
  const miniHome = typeof mini !== 'undefined' && !!mini && mini.house === 'home', modal = !!scene.mode || miniHome;
  if (h.scene !== scene) hrEnter();
  if (h.hadModal && !modal) h.sel = null;      // closed the mailbox, the shelves, a game: the room is free again
  h.hadModal = modal;
  sceneView.classList.toggle('room-on', !miniHome);
  if (miniHome) { sceneView.classList.remove('hr-idle'); return; }   // a mini-game owns the stage until it ends
  hrMount();
  const acts = document.getElementById('scActions'), txt = document.getElementById('scText'), keep = acts.scrollTop;
  if (modal) {
    // the cottage's own screens end in their own way back; make sure one always does, and that it is not the door
    if (!SCENE_EXIT_ACTS.some(a => acts.querySelector(`[data-act="${a}"]`))) acts.insertAdjacentHTML('beforeend', sceneBtn('hr-close', 'Close'));
  } else if (h.edit) {
    acts.innerHTML = hrEditHtml(); scene.text = hrEditHint(); txt.textContent = scene.text; acts.scrollTop = keep;
  } else {
    const it = h.sel && hrHome().items.find(i => i.uid === h.sel), a = it && hrDef(it).act && INTERIORS.home.actions.find(x => x.id === hrDef(it).act);
    if (h.sel === 'hs-visitor' && typeof hsVisitorSheet === 'function') { acts.innerHTML = hsVisitorSheet() + sceneBtn('hr-close', 'Close'); txt.textContent = scene.text; }
    else if (it && hrDef(it).uses && typeof hsSheetHtml === 'function') { acts.innerHTML = hsSheetHtml(it) + sceneBtn('hr-close', 'Close'); txt.textContent = scene.text; acts.scrollTop = keep; }
    else if (a) { const v = a.view ? a.view(a) : null; acts.innerHTML = sceneBtn(a.id, v ? v.label : a.label, v && v.disabled) + sceneBtn('hr-close', 'Close'); txt.textContent = scene.text; }
    else { h.sel = null; acts.innerHTML = ''; scene.text = ''; txt.textContent = ''; }
  }
  sceneView.classList.toggle('hr-idle', !modal && !h.sel && !h.edit);
  h.host.classList.toggle('editing', !!h.edit);   // no browser panning while a drag moves the camera
  const btn = h.host.querySelector('.hr-edit-btn');
  btn.classList.toggle('hidden', modal);
  const lost = unreadMail() && !hrHome().items.some(i => i.id === 'mail');   // letters are waiting but the mailbox is put away: say so on the button
  btn.textContent = h.edit ? '✓ Done' : '🎨 Decorate' + (lost ? ' · 📬' : '');
  hrBadge(); hrMarks();
}
