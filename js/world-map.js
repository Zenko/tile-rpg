/* ---------------- world map: a spatial layout of the plus-shaped town, radar preview + full overlay ---------------- */
// Grid rows/cols are 1-indexed to match CSS grid-row/grid-column. El Umbral sits in the middle;
// the others are one map over in the direction their in-town exit actually leads (see DISTRICT_LINKS).
const WORLD_LAYOUT = { square: { row: 2, col: 2 }, market: { row: 2, col: 3 }, harbor: { row: 3, col: 2 }, garden: { row: 2, col: 1 } };
function districtStatus(key) {
  const def = DISTRICTS[key];
  const unlocked = districtUnlocked(key);
  const visited = state.visitedDistricts.includes(key);
  const current = state.currentDistrict === key;
  const data = state.districtData[key];
  const bossDefeated = !!(data && data.boss && data.boss.defeated);
  return { def, unlocked, visited, current, bossDefeated };
}
function renderRadar() {
  const grid = document.getElementById('radarGridMini');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
    const key = Object.keys(WORLD_LAYOUT).find(k => WORLD_LAYOUT[k].row === r && WORLD_LAYOUT[k].col === c);
    const tile = document.createElement('div');
    tile.className = 'rd-tile';
    tile.style.gridRow = r; tile.style.gridColumn = c;
    if (key) {
      const s = districtStatus(key);
      tile.classList.toggle('on', s.unlocked);
      tile.classList.toggle('locked', !s.unlocked);
      tile.classList.toggle('current', s.current);
    }
    grid.appendChild(tile);
  }
}
/* ---------- the dream map (v1.71.0) ----------
   Four islands drifting in the dream sky, joined by dotted light bridges, with a bottom sheet that tells you about the
   one you've selected. Everything is coloured from the theme tokens, so it follows the dark/light switch by itself
   (the sky, moon/sun and island tops are in css/style.css under "Dream map"). Island positions are in a 390x330
   viewBox (WM_ISLES); the labels are HTML placed by the same numbers as percentages, so the map scales with the screen.
   Details shown depend on how much you've discovered: a visited town lists its real buildings and neighbours, an
   unlocked-but-unvisited one keeps those as a surprise, and a locked one shows what it takes to open it. */
const WM_ISLES = {
  garden: { x: 80,  y: 96,  w: 80,  lx: 80,  ly: 152 },
  market: { x: 305, y: 88,  w: 88,  lx: 305, ly: 146 },
  square: { x: 195, y: 130, w: 112, lx: 195, ly: 192 },
  harbor: { x: 195, y: 228, w: 76,  lx: 195, ly: 274 }
};
const WM_ART = {
  square: '<circle cx="195" cy="118" r="13" class="wm-art-leaf"/><rect x="192" y="124" width="6" height="12" fill="#5b4632"/>',
  market: '<path d="M287 84h36v-9l-5-11h-26l-5 11z" fill="#b06a35"/><rect x="291" y="84" width="28" height="7" fill="#5b4632"/>',
  harbor: '<rect x="193" y="216" width="3" height="20" fill="#d6c7a4"/><path d="M196 218l14 12h-14z" fill="#e9edf1"/>',
  garden: '<circle cx="80" cy="92" r="8" class="wm-art-bloom"/><path d="M80 99v12" stroke="#3c7a5c" stroke-width="3"/>'
};
// Text and the few facts that aren't stored anywhere else. Buildings and neighbour names come from the real maps/save.
const WM_INFO = {
  square: { short: 'Square', blurb: 'The heart of town. Everything starts here, and every road leads back to it.', extras: ['Dreamers’ Cup fountain', 'Weather sign'] },
  market: { short: 'Market', blurb: 'East of the Square. Stalls and a lantern market that only opens after dark.', extras: ['Trading board', "Lumen's Lantern Market (night only)"] },
  harbor: { short: 'Harbor', blurb: 'Salt air and slow water. The best fishing in town, and a keeper who bends the tide.', extras: ['Fishing spots (they shuffle every 10 minutes)'] },
  garden: { short: 'Garden', blurb: 'A hush of flowers and hedges, with a glasshouse tucked in the middle.', extras: [] }
};
const WM_ORDER = ['square', 'market', 'harbor', 'garden'];
let wmSel = 'square';
const wmEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function wmIslandSvg(key, st) {
  const I = WM_ISLES[key], h = I.w * 0.5, cx = I.x, cy = I.y, w = I.w;
  const body = `M${cx - w / 2} ${cy}q${w / 2} ${-h * 0.5} ${w} 0q${-w * 0.12} ${h * 0.9} ${-w * 0.4} ${h * 1.1}q${-w * 0.1} ${-h * 0.15} ${-w * 0.2} 0q${-w * 0.28} ${-h * 0.2} ${-w * 0.4} ${-h * 1.1}z`;
  const cur = st.current ? `<ellipse cx="${cx}" cy="${cy + h * 0.35}" rx="${w * 0.64}" ry="${h * 0.55}" class="wm-glow"/>` : '';
  const ring = wmSel === key ? `<ellipse cx="${cx}" cy="${cy + 2}" rx="${w * 0.62}" ry="${h * 0.34}" class="wm-ring"/>` : '';
  const lock = st.unlocked ? '' : `<g transform="translate(${cx - 9} ${cy + 3})" class="wm-lock"><rect x="3" y="9" width="12" height="9" rx="2"/><path d="M6 9V6a3 3 0 0 1 6 0v3"/></g>`;
  return `<g class="wm-isle${st.unlocked ? '' : ' locked'}${wmSel === key ? ' sel' : ''}" data-k="${key}" role="button" tabindex="0" aria-label="${wmEsc(st.def.name)}${st.current ? ', you are here' : st.unlocked ? '' : ', locked'}">
    ${cur}<g class="wm-float"><path d="${body}" class="wm-body"/><ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h * 0.22}" class="wm-top wm-top-${key}"/>${WM_ART[key]}</g>${ring}${lock}
    <ellipse cx="${cx}" cy="${cy + h * 0.3}" rx="${w * 0.7}" ry="${h * 0.9}" fill="transparent"/></g>`;
}
function wmCloud(x, y, s) { return `<g class="wm-cloud" transform="translate(${x} ${y}) scale(${s})"><ellipse rx="40" ry="10"/><ellipse cx="-16" cy="-8" rx="18" ry="11"/><ellipse cx="14" cy="-9" rx="20" ry="12"/></g>`; }
function wmStars() {
  let o = '', r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;   // fixed pattern, so the sky never shuffles
  for (let i = 0; i < 46; i++) o += `<circle cx="${Math.round(rnd() * 380 + 5)}" cy="${Math.round(rnd() * 150 + 4)}" r="${(0.6 + rnd() * 0.8).toFixed(1)}" opacity="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`;
  return `<g class="wm-stars">${o}</g>`;
}
function wmStatusChip(st) {
  if (st.current) return '<span class="wm-chip">📍 You are here</span>';
  return st.unlocked ? '<span class="wm-chip ok">Open</span>' : '<span class="wm-chip">🔒 Locked</span>';
}
function wmPlaces(key, st) {
  if (!st.visited) return '';
  const set = [];
  getMap(key).buildings.forEach(b => { const t = typeof INTERIORS !== 'undefined' && b.enter && INTERIORS[b.enter] && INTERIORS[b.enter].title; if (t && !set.includes(t)) set.push(t); });
  WM_INFO[key].extras.forEach(t => { if (!set.includes(t)) set.push(t); });
  return set.map(t => `<span class="wm-chip">${wmEsc(t)}</span>`).join('');
}
function wmMeter(label, have, need) {
  return `<div class="wm-meter"><div class="wm-meter-top"><span>${label}</span><span>${Math.min(have, need)} / ${need}</span></div><div class="wm-track"><i style="width:${Math.min(100, Math.round(100 * have / need))}%"></i></div></div>`;
}
function wmRow(label, inner) { return `<div class="wm-row"><div class="wm-row-k">${label}</div><div class="wm-row-v">${inner}</div></div>`; }
function renderWmSheet() {
  const key = wmSel, st = districtStatus(key), def = st.def, info = WM_INFO[key], sheet = document.getElementById('wmSheet');
  const pills = WM_ORDER.map(k => `<button class="wm-pill${k === key ? ' on' : ''}" data-k="${k}" aria-pressed="${k === key}">${WM_INFO[k].short}</button>`).join('');
  const tw = BattleEngine.TWISTS[BOSS_TWIST[key]];
  let rows = '';
  if (st.visited) {
    const data = state.districtData[key], names = ((data && data.npcs) || []).filter(n => !n.isBoss && !n.isRival).map(n => n.name);
    rows += wmRow('PLACES', `<div class="wm-chips">${wmPlaces(key, st)}</div>`);
    rows += wmRow('NEIGHBOURS', names.length ? wmEsc(names.join(', ')) : 'No one around right now');
  } else if (st.unlocked) {
    rows += wmRow('PLACES', 'Visit to discover the buildings and who lives here.');
  }
  rows += wmRow('BOSS', `<div class="wm-boss">${wmEsc(def.boss)}${st.bossDefeated ? ' <em>(beaten)</em>' : ''}</div>${tw ? `<div class="wm-sub">Twist: ${wmEsc(tw.text)}</div>` : ''}`);
  let action;
  if (!st.unlocked) {
    const pr = ensureLevel();
    rows += wmRow('TO OPEN', `<div class="wm-meters">${wmMeter('Wins', state.wins, def.unlockWins)}${wmMeter('Level', pr.level, def.unlockLevel || 1)}</div>`);
    action = `<button class="wm-go" disabled>Opens at ${def.unlockWins} wins and level ${def.unlockLevel || 1}</button>`;
  } else if (st.current) {
    rows += wmRow('BOSS STATUS', st.bossDefeated ? 'Beaten.' : 'Not beaten yet.');
    action = `<button class="wm-go" disabled>You are already here</button>`;
  } else {
    rows += wmRow('OPENED', `At ${def.unlockWins || 'no'} win${def.unlockWins === 1 ? '' : 's'} and level ${def.unlockLevel || 1}. ${st.bossDefeated ? 'Boss beaten.' : 'Boss not beaten yet.'}`);
    action = `<button class="wm-go" data-go="${key}">Float to ${wmEsc(def.name)}</button>`;
  }
  sheet.innerHTML = `<div class="wm-grab"></div><div class="wm-pills">${pills}</div>
    <div class="wm-title"><h3>${wmEsc(def.name)}</h3>${wmStatusChip(st)}</div>
    <p class="wm-blurb">${wmEsc(info.blurb)}</p>${rows}<div class="wm-action">${action}</div>`;
}
function renderWorldMap() {
  const stage = document.getElementById('wmStage');
  if (!stage) return;
  const sts = {}; WM_ORDER.forEach(k => sts[k] = districtStatus(k));
  const cur = state.currentDistrict;
  const labels = WM_ORDER.map(k => {
    const I = WM_ISLES[k], st = sts[k], sub = st.current ? 'You are here' : st.unlocked ? 'Open' : `Level ${st.def.unlockLevel || 1}`;
    return `<div class="wm-label" style="left:${(I.lx / 390 * 100).toFixed(2)}%;top:${(I.ly / 330 * 100).toFixed(2)}%"><b>${wmEsc(st.def.name)}</b><span>${sub}</span></div>`;
  }).join('');
  stage.innerHTML = `<svg viewBox="0 0 390 330" preserveAspectRatio="xMidYMid meet" aria-hidden="false">
    <defs><linearGradient id="wmBridge" x1="0" x2="1"><stop offset="0" class="wm-b1"/><stop offset="1" class="wm-b2"/></linearGradient></defs>
    ${wmStars()}<g class="wm-orb"><circle cx="332" cy="52" r="34" class="wm-orb-halo"/><circle cx="332" cy="52" r="24" class="wm-orb-disc"/><circle cx="342" cy="47" r="21" class="wm-orb-cut"/></g>
    <path d="M195 132Q250 108 296 94" class="wm-bridge main"/><path d="M195 132Q130 112 84 100" class="wm-bridge"/><path d="M195 160Q199 200 195 224" class="wm-bridge"/>
    ${wmCloud(50, 200, 1)}${wmCloud(340, 190, 1.2)}${wmCloud(95, 285, 1)}${wmCloud(320, 275, 1.3)}
    ${['garden', 'market', 'square', 'harbor'].map(k => wmIslandSvg(k, sts[k])).join('')}
    <circle cx="195" cy="98" r="14" class="wm-pin-halo"/><circle cx="195" cy="98" r="7" class="wm-pin"/></svg>${labels}`;
  // the pin sits over whichever island you're standing on
  const you = WM_ISLES[cur], pinY = you ? you.y - 32 : 98, pinX = you ? you.x : 195;
  stage.querySelectorAll('.wm-pin, .wm-pin-halo').forEach(c => { c.setAttribute('cx', pinX); c.setAttribute('cy', pinY); });
  renderWmSheet();
}
function wmSelect(key) { if (!WM_ISLES[key] || key === wmSel) return; wmSel = key; sfx('tap'); renderWorldMap(); }
function openWorldMap() { wmSel = state.currentDistrict in WM_ISLES ? state.currentDistrict : 'square'; renderWorldMap(); document.getElementById('worldMapOverlay').classList.remove('hidden'); sfx('tap'); }
function closeWorldMap() { document.getElementById('worldMapOverlay').classList.add('hidden'); }
document.getElementById('mapRadarBtn').addEventListener('click', openWorldMap);
document.getElementById('worldMapClose').addEventListener('click', closeWorldMap);
document.getElementById('worldMapOverlay').addEventListener('click', e => {
  const isle = e.target.closest('.wm-isle'), pill = e.target.closest('.wm-pill'), go = e.target.closest('[data-go]');
  if (go) { const k = go.dataset.go; closeWorldMap(); travelToDistrict(k); return; }
  if (isle) wmSelect(isle.dataset.k); else if (pill) wmSelect(pill.dataset.k);
});
document.getElementById('worldMapOverlay').addEventListener('keydown', e => {
  const isle = e.target.closest && e.target.closest('.wm-isle');
  if (isle && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); wmSelect(isle.dataset.k); }
  if (e.key === 'Escape') closeWorldMap();
});

/* Travel transition: a quick fade to a tinted "arriving at..." card, with the actual district swap happening while
   the screen is covered so the map never visibly pops. Input is blocked for the ~0.9s it lasts. `swap` runs once at
   the midpoint; if reduced motion is on, the swap happens at once with only a brief fade. */
let travelFading = false;
const TRAVEL_ICON = { square: '⛲', market: '🏪', harbor: '⚓', garden: '🌻' };
function withTravelTransition(key, swap) {
  const def = DISTRICTS[key];
  if (travelFading || !def) { swap(); return; }
  travelFading = true;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'travel-fade theme-' + def.theme;
  el.innerHTML = `<div class="tf-inner"><div class="tf-icon">${TRAVEL_ICON[key] || '🗺️'}</div><div class="tf-name">${def.name}</div><div class="tf-sub">${state.visitedDistricts.includes(key) ? 'Heading over…' : 'A new place…'}</div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => {
    try { swap(); } finally {
      setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.remove(); travelFading = false; }, 320); }, reduce ? 60 : 380);
    }
  }, reduce ? 40 : 300);
}
function crossExit(exit) {
  const def = DISTRICTS[exit.to];
  if (!districtUnlocked(exit.to)) {
    townLog.textContent = `The way to ${def.name} is still overgrown. ${districtLockReason(exit.to)} to clear it.`;
    sfx('soft'); buzz(HAP.tap);
    return;
  }
  cancelWalk(); setChase(null); pendingWalk = null;
  withTravelTransition(exit.to, () => crossExitNow(exit, def));
}
function crossExitNow(exit, def) {
  state.currentDistrict = exit.to;
  const firstVisit = !state.visitedDistricts.includes(exit.to);
  if (firstVisit) { state.visitedDistricts.push(exit.to); bumpStat('districtsVisited', 1); }
  const nm = getMap(exit.to);
  state.playerPos = Object.assign({}, entryTileFor(nm, exit.toDir, exit.toAt));
  generateTiles();
  saveState();
  renderTown();
  renderDistricts();
  townLog.textContent = `You cross into ${def.name}.`;
  logEvent('🗺️', firstVisit ? `Discovered ${def.name} for the first time.` : `Crossed into ${def.name}.`);
  sfx('claim'); buzz(HAP.tap);
}
function travelToDistrict(key) {
  if (key !== state.currentDistrict) withTravelTransition(key, () => travelToDistrictNow(key));
  else travelToDistrictNow(key);
}
function travelToDistrictNow(key) {
  state.currentDistrict = key;
  if (!state.visitedDistricts.includes(key)) { state.visitedDistricts.push(key); bumpStat('districtsVisited', 1); }
  state.playerPos = Object.assign({}, getMap(key).spawn);
  generateTiles();
  saveState();
  renderTown();
  renderDistricts();
  switchTab('town');
  townLog.textContent = `You arrive at ${DISTRICTS[key].name}.`;
}

// Kept deliberately small - five of each, one free starter per row, the rest unlocked from the Shop with
// Embers (see COSMETIC_SHOP_COST and buyCosmetic()). Player picks are stored as the raw emoji/hex value,
// and state.character.unlocked{Emojis,Accessories,Colors} tracks which values this player can select.
const EMOJI_OPTIONS = [
  { emoji: '🧑', cost: 0 },
  { emoji: '🐰', cost: 20 },
  { emoji: '🐱', cost: 20 },
  { emoji: '🦊', cost: 20 },
  { emoji: '🐸', cost: 20 },
  { emoji: '🐢', cost: 20 },
  { emoji: '🐻', cost: 25 },
  { emoji: '🐼', cost: 25 },
  { emoji: '🐨', cost: 25 },
  { emoji: '🦉', cost: 25 },
  { emoji: '🦁', cost: 30 },
  { emoji: '🐯', cost: 30 },
  { emoji: '🧙', cost: 30 },
  { emoji: '🥷', cost: 35 },
  { emoji: '🧛', cost: 35 },
  { emoji: '🧝', cost: 35 },
  { emoji: '🐉', cost: 45 },
  { emoji: '🦄', cost: 50 }
];
const ACCESSORY_OPTIONS = [
  { icon: '',   label: 'None',      cost: 0 },
  { icon: '🎀', label: 'Bow',       cost: 15 },
  { icon: '🧣', label: 'Scarf',     cost: 15 },
  { icon: '🎗️', label: 'Ribbon',    cost: 15 },
  { icon: '🍁', label: 'Leaf',      cost: 15 },
  { icon: '🕶️', label: 'Shades',    cost: 20 },
  { icon: '🌸', label: 'Bloom',     cost: 20 },
  { icon: '⭐', label: 'Star',      cost: 20 },
  { icon: '👑', label: 'Crown',     cost: 25 },
  { icon: '🎩', label: 'Top Hat',   cost: 25 },
  { icon: '💫', label: 'Sparkle',   cost: 25 },
  { icon: '🦋', label: 'Butterfly', cost: 25 },
  { icon: '🔥', label: 'Flame',     cost: 30 }
];
// Table mats: the cloth on your side of the battle table (see .mat-* in css/style.css). Same Shop-and-equip flow
// as the cosmetics above; ids are stored in state.character.unlockedMats / state.character.mat.
const MAT_OPTIONS = [
  { id: 'glass',   name: 'Sea glass',       cost: 0 },
  { id: 'moss',    name: 'Moss felt',       cost: 15 },
  { id: 'velvet',  name: 'Midnight velvet', cost: 20 },
  { id: 'linen',   name: 'Sand linen',      cost: 20 },
  { id: 'lacquer', name: 'Cherry lacquer',  cost: 28 },
  { id: 'stars',   name: 'Starfield',       cost: 32 },
  { id: 'aurora',  name: 'Aurora',          cost: 40 }
];
// Avatar borders (v1.74.0): the ring around your portrait, everywhere it appears (top bar, in town, battles, Character tab).
// Thick by default (BORDER_WIDTHS). `native` styles use the browser's own border-style; `grad` styles paint a gradient into the
// border area instead (and some ignore your border colour: `fixed`); `glow` adds a soft halo in the border colour.
// Saved as state.character.avBorder / avBorderColor / avBorderW / unlockedAvBorders (the plain `border` field is an old, deleted one).
// Width is its own free choice (Character > Look): thin, medium or thick. Thick is the default.
const BORDER_WIDTHS = [{ id: 'thin', name: 'Thin', px: '2px' }, { id: 'medium', name: 'Medium', px: '3.5px' }, { id: 'thick', name: 'Thick', px: '5px' }];
const borderWidthDef = id => BORDER_WIDTHS.find(w => w.id === id) || BORDER_WIDTHS[2];
const BORDER_OPTIONS = [
  { id: 'solid',   name: 'Solid',      cost: 0,  native: 'solid' },
  { id: 'dashed',  name: 'Dashed',     cost: 12, native: 'dashed' },
  { id: 'dotted',  name: 'Dotted',     cost: 12, native: 'dotted' },
  { id: 'double',  name: 'Double',     cost: 15, native: 'double' },
  { id: 'groove',  name: 'Groove',     cost: 15, native: 'groove' },
  { id: 'ridge',   name: 'Ridge',      cost: 15, native: 'ridge' },
  { id: 'glow',    name: 'Glow',       cost: 22, native: 'solid', glow: true },
  { id: 'neon',    name: 'Neon dashes', cost: 28, native: 'dashed', glow: true },
  { id: 'twotone', name: 'Two-tone',   cost: 18, grad: c => `conic-gradient(${c} 0 50%, color-mix(in srgb, ${c} 45%, #fff) 50% 100%)` },
  { id: 'candy',   name: 'Candy stripe', cost: 20, grad: c => `repeating-conic-gradient(${c} 0 15deg, #fff 15deg 30deg)` },
  { id: 'sunset',  name: 'Sunset fade', cost: 24, grad: c => `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 35%, #ff8fb1))` },
  { id: 'rainbow', name: 'Rainbow',    cost: 30, fixed: true, grad: () => 'conic-gradient(#e86a6a, #f0c05a, #7fbf8a, #6fc3d6, #7a8fe0, #c27ad6, #e86a6a)' },
  { id: 'gold',    name: 'Gilded',     cost: 36, fixed: true, glow: true, grad: () => 'conic-gradient(#f6e3a1, #c9962d, #fff0b8, #a87420, #f6e3a1)' },
  // Premium rings (v1.87.0): the high-end Ember sinks
  { id: 'prism',   name: 'Prism',      cost: 90,  fixed: true, grad: () => 'conic-gradient(from 30deg, #ffd1dc, #ffe9b8, #d1f5d3, #c4e7ff, #e0d1ff, #ffd1dc)' },
  { id: 'ember',   name: 'Ember',      cost: 120, fixed: true, glow: true, grad: () => 'conic-gradient(#ff9a3c, #e8443a, #ffd36b, #e8443a, #ff9a3c)' },
  { id: 'galaxy',  name: 'Galaxy',     cost: 170, fixed: true, glow: true, grad: () => 'conic-gradient(#2b1f5c, #7a4fd6, #3fb6e8, #7a4fd6, #2b1f5c)' },
  { id: 'crown',   name: 'Crown',      cost: 240, fixed: true, glow: true, grad: () => 'conic-gradient(#fff3b0, #f0b429, #fff3b0, #c98a12, #fff3b0)' }
];
const borderDef = id => BORDER_OPTIONS.find(b => b.id === id) || BORDER_OPTIONS[0];
// Free colours for the ring (the first is the old default, sea glass). A custom colour can be picked too.
const BORDER_COLORS = ['#8dbccb', '#e8cb88', '#d98a3d', '#b1615e', '#c27a9c', '#9a86c9', '#6a96c2', '#6a9f7c', '#7fbf8a', '#b17a63', '#e9edf1', '#2c3641'];
// Backdrops for the Character tab's stage (you and your companion). 'live' follows the real sky and weather; the
// rest are painted from the sky/ground colours and a few emoji scattered over them (see stageHtml() in js/character-tab.js).
// Same Shop-and-equip flow as the mats: ids live in state.character.unlockedStages / state.character.stage.
const STAGE_OPTIONS = [
  { id: 'live',    name: "Today's sky",    cost: 0,  live: true },
  { id: 'meadow',  name: 'Meadow',         cost: 12, sky: ['#9fd3ea', '#e6f3d8'], ground: '#86b873', deco: ['☁️', '☁️', '🌼', '🌷', '🦋'] },
  { id: 'harbor',  name: 'Harbor lights',  cost: 18, sky: ['#f4b88f', '#8fa9c9'], ground: '#58798f', deco: ['⛵', '🌅', '🕊️', '⚓'] },
  { id: 'autumn',  name: 'Autumn grove',   cost: 20, sky: ['#f2c58b', '#f7e4c2'], ground: '#b3733c', deco: ['🍂', '🍁', '🍂', '🌰', '🍁'] },
  { id: 'night',   name: 'Starry night',   cost: 22, sky: ['#0f1b3a', '#33457a'], ground: '#25344a', deco: ['⭐', '✨', '🌙', '⭐', '✨'], dark: true },
  { id: 'snow',    name: 'Snowfall',       cost: 24, sky: ['#b9cde0', '#eef4fa'], ground: '#e8eef5', deco: ['❄️', '❄️', '⛄', '❄️', '🌲'] },
  { id: 'lantern', name: 'Lantern night',  cost: 30, sky: ['#2a1d3d', '#7a3f55'], ground: '#3b2634', deco: ['🏮', '🏮', '✨', '🏮', '🌙'], dark: true },
  { id: 'aurora',  name: 'Aurora hill',    cost: 40, sky: ['#0b2a3a', '#2f8f7a'], ground: '#1d3a4a', deco: ['🌌', '✨', '⭐', '✨', '🌲'], dark: true },
  { id: 'sakura',  name: 'Sakura grove',   cost: 100, sky: ['#f7d6e0', '#fdf0e6'], ground: '#a7c98a', deco: ['🌸', '🌸', '🏮', '🦋', '🌸'] },
  { id: 'nightfall', name: 'Nightfall',    cost: 140, sky: ['#141a36', '#3b4a7a'], ground: '#222c4a', deco: ['🌙', '⭐', '✨', '🦉', '⭐'], dark: true },
  { id: 'summit',  name: 'Misty summit',   cost: 190, sky: ['#cfdbe8', '#f4f7fa'], ground: '#8a9aa8', deco: ['⛰️', '☁️', '🦅', '☁️', '❄️'] },
];
const stageDef = id => STAGE_OPTIONS.find(s => s.id === id) || STAGE_OPTIONS[0];
// The sky colours of a backdrop; 'live' reads the game clock so the stage turns dusky and dark with the town.
function stageColors(def) {
  if (!def.live) return { sky: def.sky, ground: def.ground, dark: !!def.dark };
  // day sky blended toward night by how dim the town is, with a warm band while the light is changing
  const sp = skyPhase(), n = Math.min(1, sp.dim * 1.8), warm = Math.max(0, 1 - Math.abs(sp.dim - 0.25) / 0.25) * 0.55;
  const mix = (day, night) => hexMix(hexMix(day, night, n), '#f4b88f', warm);
  return { sky: [mix('#8fcbe6', '#0f1b3a'), mix('#e6f3d8', '#33457a')], ground: hexMix(hexMix('#86b873', '#25344a', n), '#b3733c', warm * 0.4), dark: sp.dim > 0.35 };
}
const stageGradient = def => { const c = stageColors(def); return `linear-gradient(180deg, ${c.sky[0]}, ${c.sky[1]})`; };
const COLOR_OPTIONS = [
  { color: '#a8d4cc', cost: 0 },
  { color: '#e3b7a0', cost: 15 },
  { color: '#b7a8d4', cost: 15 },
  { color: '#d99aa8', cost: 15 },
  { color: '#8ecae6', cost: 15 },
  { color: '#f4d35e', cost: 18 },
  { color: '#95c98d', cost: 18 },
  { color: '#e0a8c8', cost: 18 },
  { color: '#a8b4e0', cost: 18 },
  { color: '#e08a5c', cost: 20 },
  { color: '#6fb3a8', cost: 20 },
  { color: '#c9a876', cost: 20 },
  { color: '#8a8fd4', cost: 22 },
  { color: '#d46a6a', cost: 22 }
];

