/* ---------------- world map: a spatial layout of the plus-shaped town, radar preview + full overlay ---------------- */
// Grid rows/cols are 1-indexed to match CSS grid-row/grid-column. Town Square sits in the middle;
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
function renderWorldMap() {
  const grid = document.getElementById('wmGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
    const key = Object.keys(WORLD_LAYOUT).find(k => WORLD_LAYOUT[k].row === r && WORLD_LAYOUT[k].col === c);
    const tile = document.createElement('div');
    tile.style.gridRow = r; tile.style.gridColumn = c;
    if (!key) { tile.className = 'wm-tile empty'; grid.appendChild(tile); continue; }
    const s = districtStatus(key);
    tile.className = 'wm-tile' + (s.unlocked ? ' known' : ' locked') + (!s.unlocked ? '' : s.visited ? '' : ' undiscovered') + (s.current ? ' current' : '');
    if (s.unlocked) {
      tile.innerHTML = `
        <span class="wm-icon">${s.visited ? '🏘️' : '❔'}</span>
        <span class="wm-name">${s.visited ? s.def.name : '???'}</span>
        <span class="wm-boss" title="${s.def.boss}">${s.bossDefeated ? '💀' : s.def.bossIcon}</span>
        ${s.current ? '<span class="wm-you">📍</span>' : ''}
      `;
      tile.addEventListener('click', () => { travelToDistrict(key); closeWorldMap(); });
    } else {
      tile.innerHTML = `<span class="wm-lock">🔒</span><span class="wm-name">${s.def.name}</span><span class="wm-sub">${districtLockReason(key)}</span>`;
    }
    grid.appendChild(tile);
  }
}
function openWorldMap() { renderWorldMap(); document.getElementById('worldMapOverlay').classList.remove('hidden'); sfx('tap'); }
function closeWorldMap() { document.getElementById('worldMapOverlay').classList.add('hidden'); }
document.getElementById('mapRadarBtn').addEventListener('click', openWorldMap);
document.getElementById('worldMapClose').addEventListener('click', closeWorldMap);
// Tapping the dimmed backdrop closes it too, like the player menu/inventory panels already do - only
// when the tap lands on the backdrop itself, not on the card sitting inside it.
document.getElementById('worldMapOverlay').addEventListener('click', e => { if (e.target.id === 'worldMapOverlay') closeWorldMap(); });

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
// Pebbles (see COSMETIC_SHOP_COST and buyCosmetic()). Player picks are stored as the raw emoji/hex value,
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

