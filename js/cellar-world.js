/* ============================================================
   THE CELLAR AS A WORLD (build 301)
   The cellar used to be a 7x7 grid of buttons in a window. It is now a place: tap the cellar door and you walk down into a world of its own,
   the same kind of world the puddle worlds are (js/puddle-worlds.js: a hidden district key, PW_KEY, drawn by the real town map), only with no
   timer. Every floor is a map of rooms and corridors in the dark. You carry a lantern, so you only see a little way (a fog canvas over the
   floor remembers what you have seen), and the floor is full of things to find:

     🪜 stairs up     where you came in; walk onto them to leave (the run waits)         🕳️ stairs down  the way on (a guardian can stand on them)
     🐀🧱🌳… creatures walk up to one and tap it for a match (they never hurt your hearts directly; a lost match costs one heart)
     🛢️ barrels        smash for a few Embers          🗝️ a key  opens the 🔒 locked chest on the same floor (a boon and Embers)
     🧰 chests         Embers or a boon                🔥 campfire  restores a heart        ⛩️ shrine  a boon        🧳 peddler  sells a boon
     🐀 rats           knock your lantern: the light shrinks for a few steps               🍄 glowcaps  make it burn bright for a few steps

   Hearts, boons and the floor you are on live in the cellar's building state (cellarState, js/houses-and-cellar.js; st.run, js/cellar-run.js); the
   current floor's map, things and what you have seen live in st.run.fl, and the world record (state.progress.puddleWorld, kind 'cellar',
   noTimer) points at the same map, so a reload puts you back exactly where you were. The kind is registered NOT enumerable on PW_KINDS, so the
   Rift Atlas and the random puddle picker never see it. Winning a match is handled by dungeonWin (js/houses-and-cellar.js); this file only
   starts the match and tidies up after it (cellarFight, cellarAfterBattle).
   ============================================================ */
const CL_FAR_MS = 50 * 365 * 24 * 3600 * 1000;       // "endsAt" for a world with no timer
const CL_FOG_PX = 16;                                // pixels per tile on the fog canvas (it is stretched to the map)
const CL_ICON = { barrel: '🛢️', key: '🗝️', lock: '🔒', chest: '🧰', cap: '🍄', rat: '🐀', camp: '🔥', shrine: '⛩️', shop: '🧳' };
const clKey = (x, y) => x + ',' + y;
const clWalk = c => c === '#' || c === '=';

function cellarWorldOn() { const w = pwActive(); return !!w && w.kind === 'cellar' && state.currentDistrict === PW_KEY; }
function cellarFl() { const run = cellarRun(cellarState()); return (run && run.fl) || null; }
function cellarRadius(fl) { return fl.bright > 0 ? 4.2 : fl.dim > 0 ? 1.4 : 2.7; }

/* ---------------- a floor's map: rooms joined by corridors ---------------- */
function cellarGenMap(floor, seed) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const rnd = seeded(`cellar|${seed}|${floor}|${attempt}`), grow = Math.min(3, floor >> 1), W = 19 + 2 * grow, H = 23 + 2 * grow;
    const HH = H + 3, g = Array.from({ length: HH }, () => Array(W).fill('r')), rooms = [];   // three spare rows of rock below, so the camera can bring the bottom rooms up out from under the bar
    for (let t = 0; t < 160 && rooms.length < 7 + grow; t++) {
      const rw = 3 + Math.floor(rnd() * 4), rh = 3 + Math.floor(rnd() * 3), x = 1 + Math.floor(rnd() * (W - rw - 1)), y = 1 + Math.floor(rnd() * (H - rh - 1));
      if (rooms.some(r => x < r.x + r.w + 1 && x + rw + 1 > r.x && y < r.y + r.h + 1 && y + rh + 1 > r.y)) continue;
      rooms.push({ x, y, w: rw, h: rh });
    }
    if (rooms.length < 6) continue;
    rooms.forEach(r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '#'; });
    const centre = r => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
    const carve = (a, b, horizFirst) => {   // an L-shaped corridor of path tiles between two room centres
      let x = a.x, y = a.y; const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y), put = () => { if (g[y][x] === 'r') g[y][x] = '='; };
      const alongX = () => { while (x !== b.x) { x += sx; put(); } }, alongY = () => { while (y !== b.y) { y += sy; put(); } };
      if (horizFirst) { alongX(); alongY(); } else { alongY(); alongX(); }
    };
    for (let i = 1; i < rooms.length; i++) {   // each room to the nearest one before it, so everything is joined
      const a = centre(rooms[i]); let best = 0, bd = 1e9;
      for (let j = 0; j < i; j++) { const b = centre(rooms[j]), d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); if (d < bd) { bd = d; best = j; } }
      carve(a, centre(rooms[best]), rnd() < 0.5);
    }
    for (let k = 0; k < 2; k++) { const i = Math.floor(rnd() * rooms.length), j = Math.floor(rnd() * rooms.length); if (i !== j) carve(centre(rooms[i]), centre(rooms[j]), rnd() < 0.5); }   // a loop or two
    const spawnRoom = rooms.reduce((a, r) => (r.y + r.h > a.y + a.h ? r : a), rooms[0]);
    const up = { x: spawnRoom.x, y: spawnRoom.y + spawnRoom.h - 1 }, spawn = { x: up.x + 1, y: up.y };
    // walking distance from the arrival spot picks the room furthest away for the stairs down
    const dist = new Map([[clKey(spawn.x, spawn.y), 0]]), q = [spawn];
    while (q.length) { const c = q.shift(), d = dist.get(clKey(c.x, c.y)); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy, k = clKey(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= HH || dist.has(k) || !clWalk(g[ny][nx])) return; dist.set(k, d + 1); q.push({ x: nx, y: ny }); }); }
    let downRoom = null, far = -1;
    rooms.forEach(r => { if (r === spawnRoom) return; const c = centre(r), d = dist.get(clKey(c.x, c.y)); if (d != null && d > far) { far = d; downRoom = r; } });
    if (!downRoom || rooms.some(r => dist.get(clKey(centre(r).x, centre(r).y)) == null)) continue;
    const down = { x: downRoom.x + downRoom.w - 1, y: downRoom.y };
    return { def: { w: W, h: HH, rows: g.map(r => r.join('')), buildings: [], props: [], spawn, pwExit: { x: up.x, y: up.y }, cellarDown: down }, rooms, spawnRoom, downRoom, up, down, spawn };
  }
  return null;   // (never in practice; cellarMakeFloor falls back to a plain hall)
}
function cellarHall() {   // the fallback: one long room, so a floor can always be made
  const W = 19, H = 23, g = Array.from({ length: H + 3 }, (_, y) => Array.from({ length: W }, (_, x) => (x > 0 && x < W - 1 && y > 0 && y < H - 1 ? '#' : 'r')));
  const room = { x: 1, y: 1, w: W - 2, h: H - 2 }, up = { x: 1, y: H - 2 }, down = { x: W - 2, y: 1 }, spawn = { x: 2, y: H - 2 };
  return { def: { w: W, h: H + 3, rows: g.map(r => r.join('')), buildings: [], props: [], spawn, pwExit: up, cellarDown: down }, rooms: [room], spawnRoom: room, downRoom: room, up, down, spawn };
}

function cellarPopulate(st, run, gen, floor) {
  const rnd = seeded(`cellar-things|${run.seed}|${floor}`), { rooms, spawnRoom, up, down, spawn } = gen;
  const taken = new Set([clKey(up.x, up.y), clKey(spawn.x, spawn.y), clKey(down.x, down.y)]), others = rooms.filter(r => r !== spawnRoom), away = others.length ? others : rooms;
  const free = rs => { for (let t = 0; t < 300; t++) { const r = rs[Math.floor(rnd() * rs.length)], x = r.x + Math.floor(rnd() * r.w), y = r.y + Math.floor(rnd() * r.h), k = clKey(x, y); if (!taken.has(k)) { taken.add(k); return { x, y }; } } return null; };
  const objs = {}, foes = [], put = (k, rs, n) => { for (let i = 0; i < (n || 1); i++) { const p = free(rs || rooms); if (p) objs[clKey(p.x, p.y)] = { k }; } };
  const f = cellarFloor(floor), hurt = run.hearts < cellarMaxHearts(run);
  if (cellarIsGuardian(floor)) foes.push({ id: 'g', x: down.x, y: down.y, done: false, guard: true });   // stands on the stairs down
  else { const n = 2 + (floor >= 3 ? 1 : 0); for (let i = 0; i < n; i++) { const p = free(away); if (p) foes.push({ id: 'f' + i, x: p.x, y: p.y, done: false }); } }
  put('barrel', rooms, 3 + Math.floor(rnd() * 3));
  if (rnd() < 0.7) { put('key', rooms); put('lock', away); }
  put('cap'); put('rat', rooms, 1 + (floor > 3 ? 1 : 0));
  if (rnd() < (hurt ? 0.85 : 0.4)) put('camp', away);
  if (rnd() < 0.35) put('shrine', away);
  if (rnd() < 0.25) put('shop', away);
  if (rnd() < 0.35) put('chest', away);
  return { floor, map: gen.def, objs, foes, seen: {}, key: false, dim: 0, bright: 0, lit: false, pos: { x: spawn.x, y: spawn.y }, wins: 0, icon: f.icon };
}
function cellarMakeFloor(st) {
  const run = cellarRun(st); if (!run.seed) run.seed = Math.random().toString(36).slice(2, 8);
  const gen = cellarGenMap(st.floor, run.seed) || cellarHall();
  run.fl = cellarPopulate(st, run, gen, st.floor);
  cellarSee(run.fl);
  return run.fl;
}
// Marks every tile within the lantern's reach as seen (the fog remembers them).
function cellarSee(fl) {
  const R = cellarRadius(fl) + 0.35, m = fl.map, p = fl.pos;
  for (let y = Math.max(0, Math.floor(p.y - R)); y <= Math.min(m.h - 1, Math.ceil(p.y + R)); y++)
    for (let x = Math.max(0, Math.floor(p.x - R)); x <= Math.min(m.w - 1, Math.ceil(p.x + R)); x++) if (Math.hypot(x - p.x, y - p.y) <= R) fl.seen[clKey(x, y)] = 1;
}

/* ---------------- the fog: dark where you have not been, dim where you have, clear in the lantern's light ---------------- */
function cellarFogDraw() {
  if (!cellarWorldOn()) return;
  const fl = cellarFl(), layer = fl && pwLayer(true); if (!layer) return;
  let cv = layer.querySelector('canvas.cl-fog');
  const W = fl.map.w, H = fl.map.h, S = CL_FOG_PX;
  if (!cv) { cv = document.createElement('canvas'); cv.className = 'cl-fog'; layer.appendChild(cv); }
  if (cv.width !== W * S || cv.height !== H * S) { cv.width = W * S; cv.height = H * S; }
  cv.style.width = (W * tilePx) + 'px'; cv.style.height = (H * tilePx) + 'px';
  const g = cv.getContext('2d'), dark = (getComputedStyle(townView).getPropertyValue('--cellar-dark') || '').trim() || 'black';
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height);
  if (fl.lit) return;   // the whole floor lit: no fog at all
  g.fillStyle = dark; g.fillRect(0, 0, cv.width, cv.height);
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 0.62; g.fillStyle = '#000';   // seen tiles lose most of their dark (the fill colour is irrelevant to destination-out)
  Object.keys(fl.seen).forEach(k => { const [x, y] = k.split(',').map(Number); g.fillRect(x * S, y * S, S, S); });
  const px = (fl.pos.x + 0.5) * S, py = (fl.pos.y + 0.5) * S, R = cellarRadius(fl) * S, gr = g.createRadialGradient(px, py, R * 0.3, px, py, R * 1.15);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
}

/* ---------------- the bar and the pill: where you are, your hearts, the lantern ---------------- */
function cellarHeartsText(run) { const max = cellarMaxHearts(run); return '♥'.repeat(Math.max(0, run.hearts)) + '♡'.repeat(Math.max(0, max - run.hearts)); }
function cellarBarSync() {
  const el = document.getElementById('hudCellar'); if (!el) return;
  const st = cellarState(), run = cellarRun(st), fl = run && run.fl, on = cellarWorldOn() && !!fl;
  document.body.classList.toggle('in-cellar', on);
  if (!on) { el.textContent = ''; return; }
  el.textContent = `Floor ${st.floor + 1} · ${cellarHeartsText(run)} · ${fl.lit ? '💡 Lit' : fl.bright > 0 ? '🔆 Bright' : fl.dim > 0 ? '🔅 Dim' : '🔦 Lantern'}${fl.key ? ' · 🗝️ Key' : ''}`;
}
function cellarMenu(w) {
  const st = cellarState(), run = cellarRun(st), fl = run && run.fl; if (!run || !fl) return;
  const boons = run.boons.map(id => { const b = CELLAR_BOONS.find(x => x.id === id); return `${b.icon} ${b.name}`; }).join(' · ') || 'No boons yet';
  const acts = [];
  if (!fl.lit) acts.push({ label: '💡 Light the whole floor', run: () => { fl.lit = true; saveState(); cellarFogDraw(); cellarBarSync(); townLog.textContent = 'You hold the lantern high and the whole floor glows.'; sfx('found'); } });
  acts.push({ label: '🪜 Leave for now (the run waits)', run: () => { if (pwActive() && !pwBusy()) pwLeave('left'); } });
  acts.push({ label: '🚪 Climb out for good (ends the run)', danger: true, run: () => askConfirm({ title: 'End this run?', text: `You will climb out and the run is over. Your deepest floor (${cellarBest()}) is kept.`, ok: 'Climb out' }, () => { endCellarRun(cellarState(), 'climbed out'); if (pwActive() && !pwBusy()) pwLeave('left'); }) });
  showProp('🕯️', PLACES.cellar, { html: `<p class="cl-menu"><b>Floor ${st.floor + 1}</b> · deepest ${cellarBest()}<br>${cellarHeartsText(run)} hearts<br>${boons}</p>` }, acts);
}

/* ---------------- what happens when you step on things ---------------- */
function cellarSay(text, loud) { townLog.textContent = text; if (loud) toast(text); }
function clEnt(x, y) { return townWorld && townWorld.querySelector(`.ent.cl-obj[data-x="${x}"][data-y="${y}"]`); }
function clDrop(x, y) { const e = clEnt(x, y); if (e) e.remove(); }
function clLocks() { if (!townWorld) return; const fl = cellarFl(); townWorld.querySelectorAll('.ent.cl-obj.lock > span').forEach(e => { e.textContent = fl && fl.key ? '🧰' : '🔒'; }); }
function clUsed(x, y) { const e = clEnt(x, y); if (e) e.classList.add('used'); }
function cellarUse(st, run, fl, x, y, o) {   // returns true when the walk should stop here
  const k = clKey(x, y);
  if (o.k === 'barrel') { const n = 1 + Math.floor(Math.random() * 3); addPebbles(n, 'cellar'); delete fl.objs[k]; cellarSay(`You smash a barrel: +${n} 🫧.`); sfx('tap'); buzz(HAP.tap); clDrop(x, y); return false; }
  if (o.k === 'key') { fl.key = true; delete fl.objs[k]; cellarSay('A rusty key, wedged behind a crate. Somewhere on this floor a chest is locked.', true); sfx('claim'); clDrop(x, y); clLocks(); return false; }
  if (o.k === 'cap') { fl.bright = 10; delete fl.objs[k]; cellarSay('A glowcap. Your lantern burns bright for a few steps.'); sfx('found'); clDrop(x, y); return false; }
  if (o.k === 'rat') { fl.dim = 8; delete fl.objs[k]; cellarSay('A rat darts under your feet and knocks your lantern. The light shrinks for a few steps.'); sfx('soft'); clDrop(x, y); return true; }
  if (o.k === 'lock') {
    if (!fl.key) { cellarSay('The chest is locked. There must be a key on this floor.'); sfx('tie'); return true; }
    fl.key = false; delete fl.objs[k]; const p = cellarPebblesFor(5 + st.floor, st); addPebbles(p, 'cellar');
    cellarSay(`The key turns. +${p} 🫧. ` + cellarGainBoon(st), true); sfx('claim'); clDrop(x, y); clLocks(); return true;
  }
  if (o.k === 'chest') {
    delete fl.objs[k];
    if (Math.random() < 0.55) { const p = cellarPebblesFor((4 + st.floor) * (eventIs('cellar-night') ? 2 : 1), st); addPebbles(p, 'cellar'); cellarSay(`A dusty chest creaks open: +${p} 🫧.`, true); sfx('claim'); }
    else cellarSay('Under the lid, something glows. ' + cellarGainBoon(st), true);
    clDrop(x, y); return true;
  }
  if (o.k === 'camp') {
    if (o.used) { cellarSay('The fire has burned low. Nothing more to warm.'); return true; }
    o.used = true; const heal = 1 + (cellarHasBoon('warm', st) ? 1 : 0), before = run.hearts; run.hearts = Math.min(cellarMaxHearts(run), run.hearts + heal);
    cellarSay(run.hearts > before ? `You warm your hands by the fire. ${'♥'.repeat(run.hearts - before)} restored.` : 'You rest by the fire. Your hearts are already full, so you just enjoy it.', true); sfx('soft'); clUsed(x, y); return true;
  }
  if (o.k === 'shrine') {
    if (o.used) { cellarSay('The little shrine is quiet now.'); return true; }
    o.used = true; cellarSay('You kneel at the little shrine. ' + cellarGainBoon(st), true); clUsed(x, y); return true;
  }
  if (o.k === 'shop') {
    const cost = cellarHasBoon('moss', st) ? PEDDLER_COST_MOSS : PEDDLER_COST;
    if (run.boons.length >= CELLAR_BOONS.length) { cellarSay('The peddler nods. You already carry every boon.'); return true; }
    if (state.progress.pebbles < cost) { cellarSay(`The peddler sells boons for 🫧 ${cost}. You are short, so you nod and move on.`); return true; }
    askConfirm({ title: 'The peddler', text: `A boon wrapped in cloth, for 🫧 ${cost}?`, ok: 'Buy' }, () => {
      if (state.progress.pebbles < cost) return;
      spendPebbles(cost, 'cellar'); cellarSay(`The peddler wraps something up for 🫧 ${cost}. ` + cellarGainBoon(cellarState()), true); updateHud(); saveState(); cellarBarSync(); pwUpdatePill();
    });
    return true;
  }
  return false;
}
function cellarStep(w, x, y) {
  const st = cellarState(), run = cellarRun(st), fl = run && run.fl; if (!fl) return;
  fl.pos = { x, y }; cellarSee(fl);
  const down = fl.map.cellarDown, o = fl.objs[clKey(x, y)];
  let stop = false;
  if (down && x === down.x && y === down.y && !fl.foes.some(f => !f.done && f.x === x && f.y === y)) { cellarDescend(); return; }
  if (o) { stop = cellarUse(st, run, fl, x, y, o); if (stop) cancelWalk(); }
  if (fl.dim > 0) fl.dim--; if (fl.bright > 0) fl.bright--;
  cellarFogDraw(); cellarBarSync(); pwUpdatePill();
}
function cellarDescend() {
  const st = cellarState(), run = cellarRun(st), w = pwActive(); if (!run || !w) return;
  cancelWalk(); sfx('creak'); buzz(HAP.tap);
  st.floor++; cellarAdvance(st);
  const fl = cellarMakeFloor(st); w.map = fl.map; w.size = [fl.map.w, fl.map.h]; delete MAP_CACHE[PW_KEY];
  withDoorFade(() => {
    delete state.districtData[PW_KEY]; pwBuildData();
    state.playerPos = Object.assign({}, fl.map.spawn); townBuiltFor = null; saveState(); renderTown(); cellarBarSync(); pwUpdatePill();
    const f = cellarFloor(st.floor);
    cellarSay(`Floor ${st.floor + 1}. ${cellarIsGuardian(st.floor) ? f.blurb : 'It is dark. Walk with your lantern and find the stairs down.'}`, true);
    if (st.floor > 0 && st.floor === (state.progress.cellarBest || 0) && st.floor >= CELLAR.floors.length) logEvent('🕳️', `Reached cellar floor ${st.floor + 1}.`);
  });
}
function cellarFight(foe) {
  const st = cellarState(), run = cellarRun(st); if (!run || foe.done || inBattle) return;
  cancelWalk();
  const f = cellarFloor(st.floor);
  const opp = { id: 'cellar-' + st.floor + '-' + foe.id, name: f.name, icon: f.icon, deck: f.deep ? deepDeck(f) : themedDeck(f.theme, st.floor), isBoss: !!(f.final || f.guardian), rewardCard: null, defeated: false,
    profile: f.profile, dungeon: { id: 'cellar', district: CELLAR_HOME, floor: st.floor, deep: !!f.deep, world: true, foe: foe.id } };
  sfx('tap'); buzz(HAP.tap); startBattle(opp);
}
function cellarSyncBlockers() {   // creatures block the path (findPath, js/maps.js, reads data.blockers)
  const fl = cellarFl(), data = state.districtData[PW_KEY]; if (data) data.blockers = fl ? fl.foes.filter(f => !f.done) : [];
}
// After a match (js/battle-ui.js closeBattle): back in the world, or out of it if the run is over.
function cellarAfterBattle() {
  const st = cellarState();
  if (!cellarRun(st)) { if (cellarWorldOn()) pwLeave('pushed'); return; }
  cellarSyncBlockers(); renderTown(); cellarFogDraw(); cellarBarSync(); pwUpdatePill(); saveState();
}

/* ---------------- going in ---------------- */
function cellarWorldEnter() {
  if (pwActive()) return;
  const st = cellarState();
  if (typeof noteVisit === 'function') noteVisit('cellar');
  if (st.resting) { showProp('🕯️', 'The cellar is quiet', 'Whatever lives down here is resting. Come back in a few minutes.'); return; }
  if (!cellarRun(st)) { cellarNewRun(st); showTipOnce('cellarRun'); }
  const run = cellarRun(st); if (!run.fl || run.fl.floor !== st.floor) cellarMakeFloor(st);
  const fl = run.fl, now = Date.now();
  const w = { seed: run.seed, kind: 'cellar', name: PLACES.cellar, sub: '', biome: 'pw-cellar', size: [fl.map.w, fl.map.h], startedAt: now, endsAt: now + CL_FAR_MS, noTimer: true,
    origin: { district: state.currentDistrict, x: state.playerPos.x, y: state.playerPos.y }, cards0: state.ownedCards.length, map: fl.map, intro: '' };
  state.progress.puddleWorld = w; pwApply(w);
  cancelWalk();
  state.currentDistrict = PW_KEY; state.playerPos = Object.assign({}, fl.pos || fl.map.spawn);
  pwBuildData(); townBuiltFor = null; cellarOn();
  saveState(); renderTown(); if (typeof renderDistricts === 'function') renderDistricts(); switchTab('town'); pwUpdatePill();
  const f = cellarFloor(st.floor);
  townLog.textContent = `Floor ${st.floor + 1}. ${cellarIsGuardian(st.floor) ? f.blurb : 'It is dark. Walk with your lantern and find the stairs down.'}`;
  sfx('creak'); buzz(HAP.tap);
}
function cellarOn() { townView.classList.add('pw-cellar-world'); cellarBarSync(); }
function cellarOff() { townView.classList.remove('pw-cellar-world'); document.body.classList.remove('in-cellar'); const el = document.getElementById('hudCellar'); if (el) el.textContent = ''; }

// Registered but not enumerable: the Rift Atlas and the random puddle picker only look at Object.keys(PW_KINDS).
Object.defineProperty(PW_KINDS, 'cellar', { enumerable: false, configurable: true, writable: true, value: {
  weight: 0, noLife: true,
  create() { /* a cellar world is made by cellarWorldEnter, never by the puddle picker */ },
  generate(w) { const fl = cellarFl(); return (fl && fl.map) || w.map || (cellarGenMap(0, w.seed) || cellarHall()).def; },
  build(w, data) { data.spirits = []; data.blockers = []; cellarSyncBlockers(); },
  enter() { cellarOn(); },
  boot(w) { if (!cellarRun(cellarState()) || !cellarFl()) { pwLeave('left', true); return; } cellarOn(); },
  leave() { cellarOff(); },
  render(w, data, add) {
    const fl = cellarFl(); if (!fl) return;
    cellarOn(); if (typeof nlSetLamps === 'function') nlSetLamps([]);   // no street lamps from the square down here
    const up = fl.map.pwExit, down = fl.map.cellarDown;
    add('cl-stairs up', up.x, up.y, '<span>🪜</span>');
    add('cl-stairs down', down.x, down.y, '<span>🕳️</span>');
    Object.keys(fl.objs).forEach(k => { const o = fl.objs[k], [x, y] = k.split(',').map(Number); add('cl-obj ' + o.k + (o.used ? ' used' : ''), x, y, `<span>${o.k === 'lock' && fl.key ? '🧰' : CL_ICON[o.k]}</span>`); });
    fl.foes.forEach(f => { if (!f.done) add('cl-foe' + (f.guard ? ' guard' : ''), f.x, f.y, `<span>${fl.icon}</span>`); });
    cellarSyncBlockers(); cellarFogDraw();
  },
  step: cellarStep,
  tap(w, tx, ty) {
    const fl = cellarFl(), m = getMap(PW_KEY); if (!fl) return false;
    if (!fl.lit && !fl.seen[clKey(tx, ty)]) { townLog.textContent = 'It is too dark to go that way. Walk with your lantern.'; sfx('soft'); return true; }
    const foe = fl.foes.find(f => !f.done && f.x === tx && f.y === ty);
    if (foe) { cancelWalk(); setChase(null); pendingWalk = null; walkThen(adjacentTo(foe), () => cellarFight(foe)); return true; }
    if (m.solid[ty][tx]) { townLog.textContent = 'Cold, damp stone.'; sfx('soft'); return true; }
    return false;
  },
  exit(w) {   // the stairs up
    askConfirm({ title: 'Leave the cellar?', text: 'Your run waits for you: the floor, your hearts and your boons stay just as they are.', ok: 'Leave' }, () => { if (pwActive() && !pwBusy()) pwLeave('left'); });
  },
  goal(w) {
    const st = cellarState(), f = cellarFloor(st.floor), fl = cellarFl();
    const guard = cellarIsGuardian(st.floor) && fl && fl.foes.some(x => !x.done);
    return { icon: guard ? f.icon : '🕳️', text: guard ? `${f.name} guards the stairs down` : 'Find the stairs down', hint: 'Walk with your lantern. Creatures are matches, and the other things you find are tucked into the rooms. Tap the candle at the top for your run.' };
  },
  pill(w) { const st = cellarState(), run = cellarRun(st); return { icon: '🕯️', text: run ? `F${st.floor + 1} ${cellarHeartsText(run)}` : 'Cellar', title: `${PLACES.cellar}: tap for your run` }; },
  menu(w) { cellarMenu(w); },
  blockMsg() { return '🕯️ You are down in the cellar. Take the stairs up, or tap the candle at the top, to leave.'; }
} });
