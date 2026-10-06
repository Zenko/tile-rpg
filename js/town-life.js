/* ============================================================
   TOWN LIFE: things to poke at in every district
   Props with their own actions (bench, well, lamp, plus a crate in the Market, nets at the Harbor), trees you can
   shake and water you can skip stones on, birds that scatter as you walk up, puddles in the rain, lamps that stay
   lit until morning, and a per-district "town mood" that builds up as you do all of it and permanently dresses
   the district (balloons, flower pots, always-glowing lamps).
   Nothing here owns an animation loop on the town map itself: every visual is a throwaway `.ent` rebuilt by
   renderEntities() (see lifeRenderEntities), so it can never fight the camera/walk transitions (HANDOFF §9).
   Only top-level functions and plain objects here, nothing that reaches into another file at parse time.
   ============================================================ */
const MOOD_STEPS = [10, 25, 50];                 // interactions needed for mood level 1 / 2 / 3
const MOOD_NAMES = ['Quiet', 'Cheerful', 'Lively', 'Festive'];
const LIFE_BIRD = { square: '🐦', market: '🕊️', harbor: '🪽', garden: '🐤' };
const LIFE = { birds: {}, puddles: {}, splashed: new Set(), sheetProp: null, game: null };

function lifeState() {
  const p = state.progress;
  if (!p.life || typeof p.life !== 'object') p.life = {};
  const l = p.life;
  if (l.day !== todayKey()) { l.day = todayKey(); l.uses = {}; }
  if (!l.shaken || typeof l.shaken !== 'object') l.shaken = {};
  if (!l.lit || typeof l.lit !== 'object') l.lit = {};
  return l;
}
function lifeUses(k) { return lifeState().uses[k] || 0; }
function lifeUse(k) { const l = lifeState(); l.uses[k] = (l.uses[k] || 0) + 1; }

/* ---------------- town mood ---------------- */
function moodLevel(data) { const n = (data && data.mood) || 0; return MOOD_STEPS.filter(s => n >= s).length; }
function lifeTopMood() { return Math.max(0, ...Object.keys(state.districtData || {}).map(k => moodLevel(state.districtData[k]))); }
function moodLine() {
  const data = ensureDistrictData(state.currentDistrict), lv = moodLevel(data), n = data.mood || 0;
  return lv >= MOOD_STEPS.length ? `🎆 Town mood: ${MOOD_NAMES[lv]} (full!)` : `🎈 Town mood: ${MOOD_NAMES[lv]} · ${n}/${MOOD_STEPS[lv]}`;
}
// Every little interaction nudges the district's mood; crossing a step dresses the district for good.
function lifeMood(n) {
  const data = ensureDistrictData(state.currentDistrict), before = moodLevel(data);
  data.mood = (data.mood || 0) + (n || 1);
  bumpStat('townActs', 1);
  const after = moodLevel(data);
  if (after > before) {
    const what = ['balloons on the lamps', 'flower pots on the benches', 'lamps that glow all night and sparkling wells'][after - 1];
    toast(`🎉 ${DISTRICTS[state.currentDistrict].name} feels ${MOOD_NAMES[after].toLowerCase()} - ${what}!`);
    sfx('rare'); buzz(HAP.found); renderTown();
  }
  saveState();
}

/* ---------------- the little action sheet for props ---------------- */
const lifeSheetEl = document.createElement('div');
lifeSheetEl.className = 'overlay hidden'; lifeSheetEl.id = 'lifeOverlay';
lifeSheetEl.innerHTML = '<div class="overlay-card life-card"><div class="life-ico" id="lifeIco"></div><h2 id="lifeTitle"></h2><p id="lifeDesc"></p><p class="life-mood-line" id="lifeMoodLine"></p><div id="lifeBtns"></div><button class="btn talk-close" id="lifeClose">Close</button></div>';
document.body.appendChild(lifeSheetEl);
document.getElementById('lifeClose').addEventListener('click', () => { lifeSheetEl.classList.add('hidden'); sfx('tap'); });

function lifeActionsFor(p) {
  const d = state.currentDistrict, a = [];
  if (p.type === 'bench') { a.push({ id: 'sit', label: '🪑 Sit for a moment' }); if (d === 'square' && p.id === 'bench2') a.push({ id: 'busk', label: '🎸 Busk for tips' }); }
  else if (p.type === 'well') { a.push({ id: 'wish', label: '🪙 Make a wish (1 Ember)' }); if (d === 'garden') a.push({ id: 'water', label: '🚿 Water the plants' }); }
  else if (p.type === 'lamp') a.push({ id: 'lamp', label: skyPhase().isNight ? '🏮 Light the lamp' : '🏮 Light it (after dark)' });
  else if (p.type === 'crate') a.push({ id: 'haggle', label: '🤝 Haggle with the trader' });
  else if (p.type === 'nets') a.push({ id: 'nets', label: '🪢 Haul in the nets' });
  return a;
}
function lifeProp(p) {
  const acts = lifeActionsFor(p);
  if (!acts.length) return false;
  LIFE.sheetProp = p;
  document.getElementById('lifeIco').textContent = PROP_ICON[p.type] || '✨';
  document.getElementById('lifeTitle').textContent = p.title;
  document.getElementById('lifeDesc').textContent = p.desc;
  document.getElementById('lifeMoodLine').textContent = moodLine();
  const box = document.getElementById('lifeBtns'); box.innerHTML = '';
  acts.forEach(a => {
    const b = document.createElement('button'); b.className = 'btn life-act'; b.textContent = a.label;
    b.addEventListener('click', () => { lifeSheetEl.classList.add('hidden'); lifeDo(a.id, p); });
    box.appendChild(b);
  });
  lifeSheetEl.classList.remove('hidden'); sfx('tap'); buzz(HAP.tap);
  showTipOnce('townlife');
  return true;
}
const WISH_LINES = ['Your coin sinks slowly. You feel lighter.', 'A far-off splash. Somebody, somewhere, smiles.', 'The water ripples twice, as if it heard.', 'You wish for a quiet evening. It seems likely.'];
function lifeDo(id, p) {
  if (inBattle || inScene) return;
  if (id === 'sit') {
    sfx('creak'); lifeMood(1);
    const company = state.companion ? ` ${state.companion.icon} hops up beside you.` : '';
    if (lifeUses('sit') < 5) { lifeUse('sit'); addXP(2); }
    calmSit(state.companion ? state.companion.icon : '');   // js/calm.js: the town zooms out gently until you stand up
  } else if (id === 'wish') {
    if (lifeUses('wish') >= 5) { toast('🪙 The well has heard enough wishes today.'); return; }
    if ((state.progress.pebbles || 0) < 1) { toast('🪙 You need a Ember to make a wish.'); return; }
    lifeUse('wish'); spendPebbles(1, 'wishing'); sfx('wish'); lifeMood(1);
    const r = Math.random();
    if (r < 0.06) { grantHiddenCard('The well answers'); }
    else if (r < 0.18) { const id2 = ['daisy', 'daisy', 'pumpkin', 'sunflower'][Math.floor(Math.random() * 4)]; seedInv()[id2] = seedCount(id2) + 1; saveState(); toast(`${seedDef(id2).icon} Something glints below... a ${seedDef(id2).name} seed floats up!`); sfx('found'); }
    else if (r < 0.43) { addPebbles(3, 'wishing'); toast('🪙 Your coin comes back with two friends! +2 Embers net.'); sfx('found'); }
    else toast('🪙 ' + WISH_LINES[Math.floor(Math.random() * WISH_LINES.length)]);
  } else if (id === 'lamp') {
    if (!skyPhase().isNight) { toast('🏮 Better to wait until dusk to light it.'); return; }
    const l = lifeState(), k = state.currentDistrict + ':' + p.id;
    if (l.lit[k]) { toast('🏮 It is already glowing.'); return; }
    l.lit[k] = true; sfx('click'); addXP(3); lifeMood(1); renderTown();
    toast('🏮 The lamp glows warm until morning.');
  } else if (id === 'busk') {
    lifeGame('busk', 'Busk by the fountain', '🎸', 'Tap in the green zone to keep the beat. Every hit earns a tip.', h => {
      addPebbles(h + (h === 5 ? 2 : 0), 'town-games'); return `🎸 The crowd tips you ${h + (h === 5 ? 2 : 0)} Embers${h === 5 ? ' - and cheers for an encore' : ''}.`; });
  } else if (id === 'haggle') {
    lifeGame('haggle', 'Haggle with the trader', '🤝', 'Tap when the marker is in the green zone to land each counter-offer.', h => {
      const gain = h + (h >= 4 ? 1 : 0); addPebbles(gain, 'town-games');
      if (h === 5 && Math.random() < 0.4) setTimeout(() => grantHiddenCard('A trader slips you something extra'), 600);
      return `🤝 You talk the price down and pocket ${gain} Embers${h === 5 ? ' (and the trader grumbles a bonus)' : ''}.`; });
  } else if (id === 'nets') {
    lifeGame('nets', 'Haul in the nets', '🪢', 'Pull when the marker is in the green zone. Time it right and the haul comes in smooth.', h => {
      addPebbles(h, 'town-games'); if (h >= 4 && Math.random() < 0.35) setTimeout(() => grantHiddenCard('Something shiny in the net'), 600);
      return `🪢 You land a good haul: ${h} Embers' worth of fish.`; });
  } else if (id === 'water') {
    lifeGame('water', 'Water the plants', '🚿', 'Pump when the marker is in the green zone. Every good pump also helps the crops in El Umbral grow.', h => {
      let helped = 0; (cropsIn() || []).forEach(c => { if (cropProgress(c) < 1) { c.grown = Math.min(cropGrowMs(c), (c.grown || 0) + h * 90000); helped++; } });
      let line = `🚿 You water the garden${helped ? ` and the water carries down to ${helped} plot${helped > 1 ? 's' : ''} in the Square` : ''}.`;
      if (h >= 3) { const sid = Math.random() < 0.7 ? 'daisy' : 'pumpkin'; seedInv()[sid] = seedCount(sid) + 1; line += ` ${seedDef(sid).icon} A ${seedDef(sid).name} seed sprouts loose.`; }
      addPebbles(1, 'town-games'); saveState(); return line; });
  }
}

/* ---------------- the shared timing mini-game (5 rounds, tap in the green zone) ---------------- */
const lifeGameEl = document.createElement('div');
lifeGameEl.className = 'overlay hidden'; lifeGameEl.id = 'lifeGameOverlay';
lifeGameEl.innerHTML = '<div class="overlay-card life-card"><div class="life-ico" id="lgIco"></div><h2 id="lgTitle"></h2><p id="lgInfo"></p><div class="life-track" id="lgTrack"><div class="life-zone" id="lgZone"></div><div class="life-marker" id="lgMarker"></div></div><div class="life-dots" id="lgDots"></div><p class="life-result" id="lgResult"></p><button class="btn life-tap" id="lgTap">Tap!</button><button class="btn talk-close" id="lgLeave">Leave</button></div>';
document.body.appendChild(lifeGameEl);

function lifeGame(kind, title, icon, info, finish) {
  if (lifeUses('game:' + kind) >= 3) { toast('😌 That is enough of that for today - come back tomorrow.'); return; }
  const g = LIFE.game = { kind, round: 0, hits: 0, t0: 0, center: 0.5, zoneW: 0.24, raf: 0, locked: true, done: false, finish };
  document.getElementById('lgIco').textContent = icon;
  document.getElementById('lgTitle').textContent = title;
  document.getElementById('lgInfo').textContent = info;
  document.getElementById('lgResult').textContent = '';
  document.getElementById('lgDots').textContent = '○ ○ ○ ○ ○';
  document.getElementById('lgTap').textContent = 'Tap!';
  lifeGameEl.classList.remove('hidden');
  setTimeout(() => lifeRound(g), 500);
}
function lifeRound(g) {
  if (LIFE.game !== g) return;
  g.zoneW = 0.24 - g.round * 0.02; g.center = 0.22 + Math.random() * 0.56; g.t0 = performance.now(); g.locked = false;
  const zone = document.getElementById('lgZone');
  zone.style.left = ((g.center - g.zoneW / 2) * 100) + '%'; zone.style.width = (g.zoneW * 100) + '%';
  const omega = 2.2 + g.round * 0.45, track = document.getElementById('lgTrack'), marker = document.getElementById('lgMarker');
  const tick = (now) => {
    if (LIFE.game !== g || g.locked) return;
    g.pos = (1 - Math.cos(omega * (now - g.t0) / 1000)) / 2;
    marker.style.transform = `translateX(${g.pos * (track.clientWidth - 8)}px)`;
    g.raf = requestAnimationFrame(tick);
  };
  g.raf = requestAnimationFrame(tick);
}
function lifeTap() {
  const g = LIFE.game; if (!g) return;
  if (g.done) { lifeGameEnd(); return; }
  if (g.locked) return;
  g.locked = true; cancelAnimationFrame(g.raf);
  const hit = Math.abs(g.pos - g.center) <= g.zoneW / 2;
  if (hit) { g.hits++; sfx('found'); buzz(HAP.tap); } else sfx('soft');
  const dots = document.getElementById('lgDots').textContent.split(' ');
  dots[g.round] = hit ? '●' : '✕'; document.getElementById('lgDots').textContent = dots.join(' ');
  g.round++;
  if (g.round < 5) { setTimeout(() => lifeRound(g), 450); return; }
  g.done = true;
  lifeUse('game:' + g.kind); bumpStat('townGames', 1); lifeMood(2);
  document.getElementById('lgResult').textContent = g.finish(g.hits);
  document.getElementById('lgTap').textContent = 'Done';
  sfx(g.hits >= 4 ? 'win' : 'claim');
}
function lifeGameEnd() {
  const g = LIFE.game; if (g) cancelAnimationFrame(g.raf);
  LIFE.game = null; lifeGameEl.classList.add('hidden'); sfx('tap');
}
document.getElementById('lgTap').addEventListener('pointerdown', (e) => { e.preventDefault(); lifeTap(); });
document.getElementById('lgLeave').addEventListener('click', lifeGameEnd);

/* ---------------- trees and water ---------------- */
function lifeTapSolid(tx, ty, c) {
  if (c !== 'o' && c !== 'i' && c !== '~') return false;
  return walkThen(adjacentTo({ x: tx, y: ty }), () => (c === '~' ? lifeSkip(tx, ty) : lifeShake(tx, ty)));
}
function lifeFx(cls, x, y, html, ms) {
  if (!townWorld) return;
  const e = document.createElement('div'); e.className = 'ent ' + cls; e.style.setProperty('--x', x); e.style.setProperty('--y', y); e.style.zIndex = y * 2 + 3;
  e.innerHTML = html; townWorld.appendChild(e); setTimeout(() => e.remove(), ms);
}
function lifeShake(tx, ty) {
  const l = lifeState(), k = state.currentDistrict + ':' + tx + ',' + ty, now = Date.now();
  lifeFx('life-leaves', tx, ty, '<span>🍃</span><span class="l2">🍂</span><span class="l3">🍃</span>', 1100);
  sfx('rustle'); buzz(HAP.tap);
  if (l.shaken[k] && now - l.shaken[k] < 20 * 60000) { townLog.textContent = 'A few last leaves drift down. Nothing else falls - not yet.'; return; }
  l.shaken[k] = now; lifeMood(1);
  const r = Math.random(), garden = state.currentDistrict === 'garden' || state.currentDistrict === 'square';
  if (r < 0.03) grantHiddenCard('Something was tucked in the branches');
  else if (r < 0.15 && garden) { const sid = Math.random() < 0.7 ? 'daisy' : 'pumpkin'; seedInv()[sid] = seedCount(sid) + 1; saveState(); toast(`${seedDef(sid).icon} A ${seedDef(sid).name} seed drops into your hand.`); sfx('found'); }
  else if (r < 0.4) { addPebbles(1, 'acorns'); toast('🌰 An acorn drops - you pocket it for a Ember.'); sfx('found'); }
  else townLog.textContent = 'Leaves flutter down around you.';
}
function lifeSkip(tx, ty) {
  const hops = 1 + Math.floor(Math.random() * 5);
  lifeFx('life-ripple', tx, ty, '', 700); sfx('plop'); buzz(HAP.tap);
  townLog.textContent = hops >= 4 ? `Plink-plink-plink-plink! ${hops} skips - what a throw.` : `Your stone skips ${hops} time${hops > 1 ? 's' : ''}.`;
  const l = lifeState(), now = Date.now();
  if (!l.lastSkipAt || now - l.lastSkipAt > 8000) { l.lastSkipAt = now; lifeMood(1); }
  bumpStat('stonesSkipped', 1);
}

/* ---------------- walking hook: birds scatter, puddles splash ---------------- */
function lifeStep(x, y) {
  const d = state.currentDistrict, birds = LIFE.birds[d] || [], now = Date.now();
  birds.forEach(b => {
    if (b.gone || Math.abs(b.x - x) + Math.abs(b.y - y) > 2) return;
    b.gone = now;
    const el = townWorld && townWorld.querySelector(`[data-bird="${b.id}"]`);
    if (el) { el.classList.add('flee'); setTimeout(() => el.remove(), 950); }
    sfx('rustle');
  });
  const pk = d + ':' + x + ',' + y, pud = LIFE.puddles[d];
  if (pud && pud.tiles.some(t => t.x === x && t.y === y) && !LIFE.splashed.has(pk)) {
    LIFE.splashed.add(pk); lifeFx('life-splash', x, y, '', 600); sfx('splash'); buzz(HAP.tap);
    bumpStat('puddles', 1);
  }
}

/* ---------------- everything drawn on the map (rebuilt by renderEntities every render) ---------------- */
function lifeRenderEntities(data, add) {
  const d = state.currentDistrict, m = getMap(d), night = skyPhase().isNight, wx = weatherNow(), wet = wx === 'rain' || wx === 'storm';
  townView.dataset.wx = wx;
  const l = lifeState(), lv = moodLevel(data);
  if (!night && Object.keys(l.lit).length) l.lit = {};
  const nlList = [];
  m.props.forEach(p => {
    if (p.type === 'lamp') {
      if (night && (l.lit[d + ':' + p.id] || lv >= 3)) nlList.push({ x: p.x, y: p.y });
      if (lv >= 1) add('life-mood balloon', p.x, p.y, '<span>🎈</span>');
      if (night && (l.lit[d + ':' + p.id] || lv >= 3)) add('life-glow', p.x, p.y, '');
    } else if (p.type === 'bench' && lv >= 2) add('life-mood pot', p.x, p.y, '<span>🪴</span>');
    else if ((p.type === 'well' || p.type === 'fountain') && lv >= 3) add('life-mood spark', p.x, p.y, '<span>✨</span>');
  });
  if (typeof nlSetLamps === 'function') nlSetLamps(nlList);   // the lit lamps also light the night (js/night-lights.js)
  // puddles: a handful of walkable tiles, fixed for the length of one spell of rain
  if (wet) {
    const key = d + ':' + (state.weather.changesAt || 0);
    if (!LIFE.puddles[d] || LIFE.puddles[d].key !== key) {
      const rnd = seeded('puddle-' + key), taken = occupiedSet(data), tiles = [];
      for (let tries = 0; tries < 80 && tiles.length < 6; tries++) {
        const x = 1 + Math.floor(rnd() * (m.w - 2)), y = 1 + Math.floor(rnd() * (m.h - 2)), c = m.rows[y][x];
        if (!m.solid[y][x] && (c === '.' || c === '=') && !taken.has(x + ',' + y) && !tiles.some(t => t.x === x && t.y === y)) tiles.push({ x, y });
      }
      LIFE.puddles[d] = { key, tiles }; LIFE.splashed.clear();
    }
    LIFE.puddles[d].tiles.forEach(t => add('life-puddle', t.x, t.y, ''));
  } else delete LIFE.puddles[d];
  // birds: by day, in dry weather only
  if (!night && !wet) {
    const now = Date.now(), list = LIFE.birds[d] || (LIFE.birds[d] = []), taken = occupiedSet(data);
    while (list.length < 3) list.push({ id: d + (list.length), x: 0, y: 0, gone: 1 });
    list.forEach(b => {
      if (b.gone && now - b.gone > 45000) {
        for (let tries = 0; tries < 40; tries++) {
          const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), c = m.rows[y][x];
          if (!m.solid[y][x] && (c === '.' || c === ',') && !taken.has(x + ',' + y) && Math.abs(x - state.playerPos.x) + Math.abs(y - state.playerPos.y) > 3) { b.x = x; b.y = y; b.gone = 0; break; }
        }
      }
      if (!b.gone) { const e = add('life-bird', b.x, b.y, `<span>${LIFE_BIRD[d] || '🐦'}</span>`); e.dataset.bird = b.id; }
    });
  }
}
