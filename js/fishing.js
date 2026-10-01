/* ============================================================
   FISHING
   Tap water from a bank, cast, wait for the bite, tap to reel in.
   Calm, no penalty for missing, a small daily cap on rewards.
   (v1.62.0: a bait choice, a fish shadow that shows its size, and hold-to-reel with a tension gauge.)
   ============================================================ */
// Beyond the everyday three, a fish may only bite in some districts (where), at night, or in certain weather.
// `hint` is what the Fish page shows before you've caught one.
const FISH = [
  { id: 'minnow', name: 'Minnow',      icon: '🐟', pebbles: 2, weight: 58, blurb: 'Small, silver and quick.',        drain: 3.0, pull: 16, hint: 'Bites anywhere, any time' },
  { id: 'perch',  name: 'Perch',       icon: '🐠', pebbles: 3, weight: 30, blurb: 'Striped and a little proud of it.', drain: 5.5, pull: 13, hint: 'Bites anywhere, any time' },
  { id: 'carp',   name: 'Golden Carp', icon: '🏅', pebbles: 5, weight: 12, blurb: 'It shimmers like a coin in the sun.', drain: 8.0, pull: 10, hint: 'Anywhere, but shy' },
  { id: 'crab',   name: 'Harbor Crab', icon: '🦀', pebbles: 3, weight: 26, where: ['harbor'], blurb: 'It pinches the line, then lets go politely.', drain: 4.5, pull: 14, hint: 'Scuttles only in Quiet Harbor' },
  { id: 'puffer', name: 'Pufferfish',  icon: '🐡', pebbles: 5, weight: 12, where: ['harbor'], blurb: 'It puffs up, offended, then settles down.', drain: 6.0, pull: 12, hint: 'Lives only in Quiet Harbor' },
  { id: 'eel',    name: 'Moonlit Eel', icon: '🐍', pebbles: 4, weight: 18, night: true, blurb: 'Long and silver, like a ribbon of moonlight.', drain: 6.0, pull: 12, hint: 'Bites only at night' },
  { id: 'trout',  name: 'Rainbow Trout', icon: '🌈', pebbles: 5, weight: 18, weather: ['rain'], blurb: 'Every scale a different colour.', drain: 6.5, pull: 12, hint: 'Rises only in the rain' },
  { id: 'pike',   name: 'Thunder Pike', icon: '⚡', pebbles: 6, weight: 14, weather: ['storm'], blurb: 'It crackles faintly when it thrashes.', drain: 8.5, pull: 10, hint: 'Hunts only in storms' },
  { id: 'ghost-koi', name: 'Ghost Koi', icon: '👻', pebbles: 6, weight: 14, weather: ['cloudy'], blurb: 'You can almost see through it.', drain: 7.0, pull: 11, hint: 'Drifts up only under cloudy skies' },
  { id: 'frost-cod', name: 'Frost Cod', icon: '🧊', pebbles: 5, weight: 16, weather: ['snow'], blurb: 'Cold to the touch, and very grumpy.', drain: 6.0, pull: 12, hint: 'Bites only when it snows' },
  { id: 'star-koi', name: 'Starlight Koi', icon: '🌟', pebbles: 25, weight: 1.2, legendary: true, blurb: 'The water glows gold around it. You will remember this.', drain: 10, pull: 9, hint: 'A legend. Anywhere, almost never' },
];
// Which fish can bite right here, right now.
function fishAvailable(f) {
  if (f.where && !f.where.includes(state.currentDistrict)) return false;
  if (f.night && !skyPhase().isNight) return false;
  if (f.weather && !f.weather.includes(weatherNow())) return false;
  return true;
}
const FISH_REEL_TICK_MS = 220;    // how often the fish tugs back while you're reeling it in
const FISH_CARD_ODDS = 1 / 14;       // chance that a rewarded catch is a card of rare or better instead of Pebbles
const FISH_DAILY_REWARDED = 8;       // rewarded catches per day; fishing itself is never blocked
const FISH_WAIT_MS = [1500, 4000];   // random wait before a bite
const FISH_BITE_MS = 1100;           // how long the bite window stays open
const FISH_LEGEND_PITY = 150;        // hook this many non-legendary fish in a row and the next one is guaranteed the Starlight Koi
const FISH_BIG_ODDS = 0.1;           // chance any ordinary catch turns out to be a big one (bonus pebbles, a little flourish)
const NIBBLE_LINES = ['The float sits still.', 'A dragonfly lands on the line.', 'Ripples spread. Not yet.', 'Something brushes the line.'];

const fishState = () => {
  const p = state.progress;
  if (!p.fishing) p.fishing = { day: todayKey(), rewarded: 0, caught: {}, total: 0, best: null, sinceLegendary: 0 };
  const f = p.fishing;
  if (f.day !== todayKey()) { f.day = todayKey(); f.rewarded = 0; }
  if (!f.caught) f.caught = {};
  return f;
};
// Rain makes the scarcer fish (anything that isn't the everyday Minnow/Perch) bite more often.
function fishWeight(f) { return f.weight * (f.weight < 20 && !f.legendary ? (weatherFx().rareFish || 1) * (eventIs('fishing-derby') ? 2 : 1) : 1); }
// `quiet` is for filling the water with swimmers: no legendary guarantee, and the Starlight Koi is seen even more rarely.
function pickFish(quiet) {
  const pool = FISH.filter(fishAvailable);
  // A very long dry spell on the legendary Starlight Koi (whose catch weight is tiny by design) guarantees
  // the next hook is one, rather than leaving it a lottery ticket most players never actually see.
  const koi = fishDef('star-koi');
  if (!quiet && (fishState().sinceLegendary || 0) >= FISH_LEGEND_PITY && koi && fishAvailable(koi)) return koi;
  const bait = currentBait(), w = f => fishWeight(f) * (bait.likes.includes(f.id) ? bait.mult : 1) * (quiet && f.legendary ? 0.25 : 1);   // the chosen bait makes its favourites bite more
  const total = pool.reduce((s, f) => s + w(f), 0); let r = Math.random() * total;
  for (const f of pool) { r -= w(f); if (r <= 0) return f; }
  return pool[0] || FISH[0];
}
function fishDef(id) { return FISH.find(f => f.id === id); }

/* ---------- where you can fish ---------- */
function bankFor(m, wx, wy) {
  // A walkable, reachable tile next to the water tile that is not a doorstep or the bridge itself.
  const opts = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: wx + dx, y: wy + dy }))
    .filter(t => t.x >= 0 && t.y >= 0 && t.x < m.w && t.y < m.h && !m.solid[t.y][t.x] && m.reach[t.y][t.x] && !m.entries[t.x + ',' + t.y] && m.rows[t.y][t.x] !== 'b');
  if (!opts.length) return null;
  const p = state.playerPos;
  opts.sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)));
  return opts[0];
}
const isWaterTile = (m, x, y) => m.rows[y] && m.rows[y][x] === '~';

/* ---------- baits ----------
   Each bait makes certain fish bite more often (their weight is multiplied) and is used up when a fish bites. Crumbs
   are free and endless, so fishing never gets stuck; the rest come from things you already collect: daisies, night
   bugs from the jar, and fish from the pantry. A bait only matters for fish that can bite right now. */
function jarBugCount() { const j = bugState().jar; return Object.keys(j).reduce((n, id) => n + (j[id] || 0), 0); }
function takeJarBug() { const j = bugState().jar, id = Object.keys(j).find(k => j[k] > 0); if (id) { j[id]--; if (!j[id]) delete j[id]; } }
const BAITS = [
  { id: 'crumbs', icon: '🍞', name: 'Crumbs', likes: ['minnow', 'perch'], mult: 1.8, stock: () => Infinity, take: () => {} },
  { id: 'daisy', icon: '🌼', name: 'Daisies', likes: ['carp', 'perch', 'trout'], mult: 2.5, stock: () => ingredientCount('flowers'), take: () => { const pt = pantry(); pt.flowers = Math.max(0, (pt.flowers || 0) - 1); } },
  { id: 'bug', icon: '✨', name: 'Night bug', likes: ['eel', 'ghost-koi', 'frost-cod'], mult: 3, stock: jarBugCount, take: takeJarBug },
  { id: 'fish', icon: '🐟', name: 'Fish', likes: ['pike', 'crab', 'puffer'], mult: 2.5, stock: () => ingredientCount('fish'), take: () => { const pt = pantry(); pt.fish = Math.max(0, (pt.fish || 0) - 1); } },
];
const baitDef = id => BAITS.find(b => b.id === id) || BAITS[0];
function currentBait() { const b = baitDef(fishState().bait); return b.stock() > 0 ? b : BAITS[0]; }
const baitWorks = b => b.likes.some(id => { const f = fishDef(id); return f && fishAvailable(f); });
const FISH_SIZE_WORD = { small: 'small', medium: 'medium', large: 'large' };
const fishSizeOf = f => (f.legendary || f.pebbles >= 6) ? 'large' : f.pebbles >= 4 ? 'medium' : 'small';
// How a fish fights: [tired phase seconds, running phase seconds]. Minnows dart, carp lean on the line, and so on.
const FISH_BEHAVIOR = { minnow: [[.8, 1.4], [.4, .7]], carp: [[2, 3], [1.2, 1.8]], crab: [[1.2, 2], [.6, 1]], puffer: [[1.4, 2.2], [1, 1.4]], eel: [[.9, 1.5], [.5, .9]], pike: [[1.6, 2.4], [1.2, 1.8]], 'star-koi': [[2, 3], [1.2, 1.8]] };
const fishBehavior = f => FISH_BEHAVIOR[f.id] || [[1.4, 2.4], [.7, 1.1]];
const randIn = ([a, b]) => a + Math.random() * (b - a);

/* ---------- the fishing scene ----------
   You see a handful of fish swimming about and your chosen bait floating on the water. Tap the water to aim, cast, and
   the fish nearest your spot (liked baits draw from further away) swims over to the hook. Phases: idle (aiming), cast
   (the line is flying), wait, bite, reeling, landing / away (the catch or escape animation), then result (Cast again). */
let fishing = null;   // { phase, spot, swimmers, aim, hook, sw (the fish on the line), band, asp, bucket, timers, ... }
const fe = id => document.getElementById(id);
const FISH_BANK = { x: 50, y: 27 };    // where the line leaves the bank, as % of the scene
const FISH_POP = 6;                    // how many fish you can see swimming at once
const FISH_REACH = 30;                 // how far (in % of the scene's width) a fish will come from to your bait
const fishMotionOk = () => typeof btMotionOk !== 'function' || btMotionOk();
const fishMs = n => fishMotionOk() ? n : 0;
const fishRnd = (a, b) => a + Math.random() * (b - a);
// the fish rises from where the hook landed toward the bank as you reel it in (dist 30 = at the hook, 100 = at the bank)
const fishPosAt = d => { const h = fishing.hook; return { x: Math.max(5, Math.min(95, FISH_BANK.x + (h.x - FISH_BANK.x) * (100 - d) / 70)), y: Math.max(30, Math.min(95, FISH_BANK.y + (h.y - FISH_BANK.y) * (100 - d) / 70)) }; };
function fishClear() { if (fishing) { ['t1', 't2', 't3'].forEach(k => clearTimeout(fishing[k])); cancelAnimationFrame(fishing.raf); cancelAnimationFrame(fishing.fl); } }
function fishPhase(ph) { if (fishing) fishing.phase = ph; fe('fishScene').dataset.phase = ph; }
function fishTallyText() {
  const f = fishState(), left = Math.max(0, FISH_DAILY_REWARDED - f.rewarded);
  const kinds = FISH.filter(x => f.caught[x.id]).length;
  return `${left ? `${left} rewarded catch${left === 1 ? '' : 'es'} left today` : 'Daily rewards used, still fun to fish'} · Fish log ${kinds}/${FISH.length}`;
}
function fishRenderStamps() { const f = fishState(); fe('fishStamps').innerHTML = Array.from({ length: FISH_DAILY_REWARDED }, (_, i) => `<i class="${i < f.rewarded ? 'on' : ''}"></i>`).join(''); }
function fishSetLine(fx, fy, bend) {
  const X = fx * 3.4, Y = fy * 6.9, line = fe('fishLine');
  line.setAttribute('d', fx == null ? '' : `M170 186 Q ${(170 + X) / 2 + 8} ${(186 + Y) / 2} ${X} ${Y}`);
  fe('fishRod').setAttribute('d', `M338 6 Q 262 ${16 + (bend || 0)} 170 176`);
}
function fishPlaceFish(x, y, cls, ms) {
  const el = fe('fishFish'); el.style.setProperty('--mv', (ms || 0) + 's'); el.style.left = x + '%'; el.style.top = y + '%';
  if (cls != null) el.className = 'fs-fish ' + cls;
}
function fishBobberAt(x, y) {   // the float and its ripples follow the end of the line
  const b = fe('fishBobber'); b.style.left = x + '%'; b.style.top = `calc(${y}% - 12px)`;
  ['fishRing1', 'fishRing2'].forEach(id => { const r = fe(id); r.style.left = x + '%'; r.style.top = y + '%'; });
}
/* small screen effects: drops, puffs, a flash, a shake. All skipped in calm / reduced-motion. */
function fishFx(cls, x, y, text) {
  const el = document.createElement('i'); el.className = cls; el.style.left = x + '%'; el.style.top = y + '%'; if (text) el.textContent = text;
  fe('fishScene').appendChild(el); setTimeout(() => el.remove(), 1000); return el;
}
function fishDrops(x, y, n, gold) {
  if (!fishMotionOk()) return;
  for (let i = 0; i < n; i++) { const a = Math.PI * fishRnd(1.1, 1.9), r = fishRnd(22, 60), el = fishFx('fs-drop' + (gold ? ' gold' : ''), x, y); el.style.setProperty('--dx', Math.cos(a) * r * 1.2 + 'px'); el.style.setProperty('--dy', Math.sin(a) * r + 'px'); }
}
function fishFlash(x, y, gold) { if (!fishMotionOk()) return; const el = fishFx('fs-flash' + (gold ? ' gold' : ''), 0, 0); el.style.left = el.style.top = '0'; el.style.setProperty('--x', x + '%'); el.style.setProperty('--y', y + '%'); }
function fishShake() { if (!fishMotionOk()) return; const sc = fe('fishScene'); sc.classList.remove('shake'); void sc.offsetWidth; sc.classList.add('shake'); setTimeout(() => sc.classList.remove('shake'), 340); }
function fishSplashAt(x, y, drops) {
  const s = fe('fishSplash'); s.style.left = x + '%'; s.style.top = `calc(${y}% - 28px)`;
  s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); fishDrops(x, y, drops || 6);
}
/* the fish you can see */
function fishBand() {   // the part of the water that isn't hidden behind the panel
  const sc = fe('fishScene').getBoundingClientRect(), pn = document.querySelector('#fishScene .fs-panel').getBoundingClientRect();
  const hi = sc.height ? (pn.top - sc.top) / sc.height * 100 - 6 : 58;
  return { lo: 34, hi: Math.max(46, Math.min(80, hi)) };
}
function fishMakeSwimmer(fish, x, y, fade) {
  const el = document.createElement('div'), inn = document.createElement('span');
  el.className = 'fs-sw ' + fishSizeOf(fish) + (fish.legendary ? ' legend' : '') + (fade && fishMotionOk() ? ' fadein' : '');
  el.style.left = x + '%'; el.style.top = y + '%'; inn.className = 'in'; inn.textContent = fish.icon;
  inn.style.setProperty('--sw', fishRnd(30, 70) + 'px'); inn.style.setProperty('--dur', fishRnd(12, 22) + 's'); inn.style.setProperty('--dl', -fishRnd(0, 12) + 's');
  el.appendChild(inn); fe('fishSwim').appendChild(el);
  if (fade) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('fadein')));
  return { fish, el, x, y };
}
function fishFill() {
  const b = fishing.band;
  while (fishing.swimmers.length < FISH_POP) fishing.swimmers.push(fishMakeSwimmer(pickFish(true), fishRnd(12, 88), fishRnd(b.lo + 2, b.hi), true));
}
function fishWander() {   // the fish drift to new spots now and then
  if (!fishing) return;
  const b = fishing.band;
  if (fishMotionOk()) fishing.swimmers.forEach(s => {
    if (Math.random() < 0.5) { s.x = Math.max(8, Math.min(92, s.x + fishRnd(-14, 14))); s.y = Math.max(b.lo, Math.min(b.hi, s.y + fishRnd(-8, 8))); s.el.style.setProperty('--mv', '4s'); s.el.style.left = s.x + '%'; s.el.style.top = s.y + '%'; }
  });
  if (fishing.phase === 'idle') fishAimUpdate();
  fishing.tw = setTimeout(fishWander, 4500);
}
function fishRenderFloat() {   // whatever bait you picked bobs on the water like the fish do
  const box = fe('fishSwim'), b = currentBait(), band = fishing.band;
  box.querySelectorAll('.fs-fl').forEach(e => e.remove());
  for (let i = 0; i < 7; i++) {
    const el = document.createElement('span'); el.className = 'fs-fl'; el.textContent = b.icon;
    el.style.left = fishRnd(8, 92) + '%'; el.style.top = fishRnd(band.lo, band.hi + 2) + '%';
    el.style.setProperty('--dur', fishRnd(4, 8) + 's'); el.style.setProperty('--dl', -fishRnd(0, 6) + 's'); el.style.setProperty('--fx', fishRnd(-18, 18) + 'px');
    box.appendChild(el);
  }
}
/* aiming: the fish nearest the marker (counting the bait's favourites as closer) is the one that will come */
function fishNearest(ax, ay) {
  const bait = currentBait(); let best = null;
  fishing.swimmers.forEach(s => {
    const d = Math.hypot(s.x - ax, (s.y - ay) * fishing.asp), score = d / (bait.likes.includes(s.fish.id) ? Math.sqrt(bait.mult) : 1);
    if (!best || score < best.score) best = { s, d, score };
  });
  return best && best.score <= FISH_REACH ? best : null;
}
function fishAimUpdate() {
  if (!fishing) return;
  fishing.swimmers.forEach(s => s.el.classList.remove('near'));
  const aim = fishing.aim, aimEl = fe('fishAim'), btn = fe('fishBtn');
  if (!aim) { aimEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Tap the water to aim'; return; }
  aimEl.classList.remove('hidden'); aimEl.style.left = aim.x + '%'; aimEl.style.top = aim.y + '%';
  const n = fishNearest(aim.x, aim.y); if (n) n.s.el.classList.add('near');
  btn.disabled = false; btn.textContent = 'Cast';
  fe('fishSub').textContent = n ? `A ${FISH_SIZE_WORD[fishSizeOf(n.s.fish)]} fish is close to that spot.` : 'Nothing close yet. Fish wander over now and then.';
}
fe('fishScene').addEventListener('pointerdown', e => {
  if (!fishing || fishing.phase !== 'idle' || e.target.closest('.fs-panel, .fs-top, .fs-bucket')) return;
  const r = fe('fishScene').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
  if (y < 30) return;   // that's the bank
  fishing.aim = { x: Math.max(6, Math.min(94, x)), y: Math.min(fishing.band.hi + 4, y) }; sfx('tap'); fishAimUpdate();
});
function fishRenderBaits() {
  const box = fe('fishBaits'), sel = currentBait().id;
  box.innerHTML = '';
  BAITS.forEach(b => {
    const n = b.stock(), el = document.createElement('button'); el.type = 'button';
    el.className = 'fs-bait' + (b.id === sel ? ' sel' : '') + (n <= 0 ? ' out' : '');
    el.setAttribute('aria-label', `${b.name} bait${n === Infinity ? '' : ', ' + n + ' left'}`);
    el.innerHTML = `<b>${b.icon}</b><span>${b.name}${n === Infinity ? '' : ' ×' + n}</span><em>${baitWorks(b) ? b.likes.map(id => fishDef(id).icon).join('') : 'not now'}</em>`;
    el.addEventListener('click', () => { if (n <= 0 || !fishing || fishing.phase !== 'idle') return; fishState().bait = b.id; saveState(); sfx('tap'); fishRenderBaits(); fishRenderFloat(); fishAimUpdate(); });
    box.appendChild(el);
  });
}
function fishUi(msg, sub, btn, btnCls) {
  fe('fishMsg').textContent = msg; fe('fishSub').textContent = sub;
  const b = fe('fishBtn'); b.textContent = btn; b.className = 'btn' + (btnCls ? ' ' + btnCls : ''); b.disabled = false;
}
function fishIdleUi(msg, sub) {   // back to aiming; the last aim spot is kept so Cast again is one tap
  fishPhase('idle');
  fishUi(msg, sub, 'Cast', '');
  fe('fishBaits').classList.remove('hidden'); fe('fishTension').classList.add('hidden'); fe('fishDepth').classList.add('hidden'); fe('fishResult').classList.add('hidden');
  fe('fishBang').style.opacity = ''; fe('fishScene').classList.remove('nibble');
  fe('fishTally').textContent = fishTallyText(); fishRenderStamps(); fishRenderBaits();
  fishPlaceFish(50, 50, ''); fishSetLine(null); fe('fishHook').classList.add('hidden'); fishBobberAt(FISH_BANK.x, 26.6);
  fishAimUpdate();
}
function openFishing(spot) {
  fishing = { phase: 'idle', spot, swimmers: [], aim: null, bucket: 0 };
  const sc = fe('fishScene');
  sc.dataset.wx = weatherNow();
  fe('fishLoc').textContent = DISTRICTS[state.currentDistrict].name;
  fe('fishWx').textContent = (WEATHER_KINDS[weatherNow()].icon || '☀️') + ' ' + WEATHER_KINDS[weatherNow()].name;
  fe('fishOverlay').classList.remove('hidden'); document.body.classList.add('in-fishing');
  fe('fishSwim').innerHTML = ''; fe('fishBucketN').textContent = '0';
  const r = sc.getBoundingClientRect(); fishing.asp = r.height / Math.max(1, r.width); fishing.band = fishBand();
  fishFill(); fishRenderFloat();
  const rainNote = weatherIs('rain') ? '🌧️ The rain has the fish biting. ' : '';
  fishIdleUi('A quiet spot by the water.', rainNote + (fishAvailableNote() || 'Tap the water to choose where to cast.'));
  fishing.tw = setTimeout(fishWander, 3000);
  sfx('tap'); showTipOnce('fishing');
}
function closeFishing() { fishClear(); if (fishing) { clearTimeout(fishing.tw); fishing.phase = 'closed'; } fishing = null; fe('fishOverlay').classList.add('hidden'); document.body.classList.remove('in-fishing'); fe('fishSwim').innerHTML = ''; }
/* casting: the float arcs out from the bank to your spot, the rod whips, the bait splashes down */
function fishCast() {
  if (!fishing || fishing.phase !== 'idle' || !fishing.aim) return;
  const bait = currentBait(), aim = fishing.aim, n = fishNearest(aim.x, aim.y);
  let s;
  if (n) { s = n.s; fishing.swimmers.splice(fishing.swimmers.indexOf(s), 1); }
  else { s = fishMakeSwimmer(pickFish(true), Math.random() < 0.5 ? 4 : 96, aim.y + fishRnd(-6, 6), false); }   // nothing close: one wanders in from the edge
  const koi = fishDef('star-koi');   // a very long dry spell guarantees the legendary is the one that comes
  if ((fishState().sinceLegendary || 0) >= FISH_LEGEND_PITY && koi && fishAvailable(koi) && !s.fish.legendary) { s.fish = koi; s.el.className = 'fs-sw large legend'; s.el.firstChild.textContent = koi.icon; }
  s.el.classList.remove('near');
  Object.assign(fishing, { bait, fish: s.fish, size: fishSizeOf(s.fish), sw: s, hook: { x: aim.x, y: aim.y }, dist0: n ? n.d : 60 });
  fishPhase('cast');
  fe('fishBaits').classList.add('hidden'); fe('fishResult').classList.add('hidden'); fe('fishAim').classList.add('hidden');
  fishing.swimmers.forEach(x => x.el.classList.remove('near'));
  fishUi(`${bait.icon} ${bait.name} on the hook`, 'Casting…', 'Reel in', 'wait'); fe('fishBtn').disabled = true; sfx('soft');
  fishFlight(FISH_BANK, fishing.hook, fishMs(560), fishLanded);
}
function fishFlight(from, to, ms, done) {
  const t0 = performance.now();
  const bendAt = k => k < 0.2 ? -26 * k / 0.2 : k < 0.4 ? -26 + 60 * (k - 0.2) / 0.2 : 34 * (1 - (k - 0.4) / 0.6);
  if (!ms) { fishBobberAt(to.x, to.y); fishSetLine(to.x, to.y, 0); return done(); }
  const step = t => {
    if (!fishing || fishing.phase !== 'cast') return;
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) * (1 - k);
    const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * k) * 14;
    fishBobberAt(x, y); fishSetLine(x, y, bendAt(k));
    if (k < 1) fishing.fl = requestAnimationFrame(step); else { fishSetLine(to.x, to.y, 0); done(); }
  };
  fishing.fl = requestAnimationFrame(step);
}
function fishLanded() {
  if (!fishing || fishing.phase !== 'cast') return;
  const h = fishing.hook, bait = fishing.bait, sw = fishing.sw;
  fishPhase('wait'); fe('fishBtn').disabled = false;
  fishBobberAt(h.x, h.y); fishSetLine(h.x, h.y, 0);
  const hk = fe('fishHook'); hk.textContent = bait.icon; hk.style.left = h.x + '%'; hk.style.top = (h.y + 3) + '%'; hk.classList.remove('hidden');
  fishSplashAt(h.x, h.y, 6);
  fishUi(`${bait.icon} ${bait.name} on the hook`, `A ${FISH_SIZE_WORD[fishing.size]} shadow drifts closer…`, 'Reel in', 'wait');
  // the nearer the fish was, the sooner it arrives; rain, a fishy companion and charms help too
  const near = Math.min(1, fishing.dist0 / 40);
  const wait = (FISH_WAIT_MS[0] + Math.random() * (FISH_WAIT_MS[1] - FISH_WAIT_MS[0])) * (0.55 + 0.7 * near) * (weatherFx().biteSpeed || 1) * (hasPerk('fish') ? 0.7 : 1) * (1 - Math.min(0.5, cardBonus('fish')));
  sw.el.firstChild.style.animation = 'none';
  sw.el.style.setProperty('--mv', fishMs(wait / 1000) + 's'); sw.el.style.left = h.x + '%'; sw.el.style.top = h.y + '%';
  // sometimes a false nibble comes first: the float twitches, but it is not a bite yet
  if (wait > 2000 && Math.random() < 0.4) fishing.t3 = setTimeout(() => {
    if (!fishing || fishing.phase !== 'wait') return;
    fe('fishScene').classList.add('nibble'); fe('fishSub').textContent = 'Just a nibble… not yet.'; sfx('soft');
    setTimeout(() => { const sc = fe('fishScene'); if (sc) sc.classList.remove('nibble'); if (fishing && fishing.phase === 'wait') fe('fishSub').textContent = `A ${FISH_SIZE_WORD[fishing.size]} shadow circles the bait…`; }, 600);
  }, wait * 0.55);
  fishing.t1 = setTimeout(() => {
    if (!fishing || fishing.phase !== 'wait') return;
    fishing.bait.take(); fishRenderBaits(); saveState();                       // the bait is used up when something bites it
    fishPhase('bite'); fe('fishScene').classList.remove('nibble');
    sw.el.remove(); hk.classList.add('hidden');
    fe('fishFish').textContent = fishing.fish.icon; fishPlaceFish(h.x, h.y, 'shown ' + fishing.size, 0);
    fishSplashAt(h.x, h.y, 5);
    fishUi('Bite!', 'Tap now to set the hook.', 'Hook it!', 'bite'); sfx('found'); buzz(HAP.tap);
    fishing.t2 = setTimeout(() => { if (fishing && fishing.phase === 'bite') fishEscape('It got away. Not to worry.'); }, FISH_BITE_MS);
  }, wait);
}
/* the fish gets away: it dashes off with a puff and a splash, the float bounces, the line goes slack */
function fishEscape(text) {
  fishClear(); if (!fishing) return;
  const was = fishing.phase, h = fishing.hook, sw = fishing.sw, b = fishing.band;
  fishPhase('away');
  ['fishTension', 'fishDepth'].forEach(id => fe(id).classList.add('hidden'));
  fe('fishScene').classList.remove('nibble'); fe('fishBang').style.opacity = ''; fe('fishHook').classList.add('hidden'); fe('fishSplash').classList.remove('on');
  fishUi(text, 'Cast again whenever you like.', 'Cast again'); fe('fishBtn').disabled = true;
  let px = h.x, py = h.y;
  if (was === 'reeling') { const p = fishPosAt(Math.max(0, Math.min(100, fishing.dist))); px = p.x; py = p.y; }
  const tx = Math.max(4, Math.min(96, px + (Math.random() < 0.5 ? -1 : 1) * fishRnd(28, 45))), ty = Math.min(b.hi + 2, py + fishRnd(3, 10));
  if (was === 'wait') { const el = sw.el; el.style.setProperty('--mv', fishMs(0.5) + 's'); el.style.left = tx + '%'; el.style.top = ty + '%'; el.style.opacity = 0; setTimeout(() => el.remove(), 700); }
  else { fishPlaceFish(tx, ty, 'shown run ' + fishing.size, fishMs(0.35)); setTimeout(() => { fe('fishFish').className = 'fs-fish ' + fishing.size; }, fishMs(350)); }
  if (fishMotionOk()) {
    fishFx('fs-puff', px, py, '💨'); fishDrops(px, py, 8); fishSplashAt(px, py, 0);
    fe('fishBobber').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out' });
    if (was === 'reeling') fishShake();
  }
  fishSetLine(px, py, -10); sfx('soft'); buzz(HAP.soft);
  setTimeout(() => {
    if (!fishing || fishing.phase !== 'away') return;
    fishSetLine(null); fishPlaceFish(50, 50, ''); fishFill(); fishSettle();
  }, fishMs(800));
}
function fishSettle() {   // the animation is over: Cast again goes back to aiming
  fishPhase('result'); fe('fishBtn').disabled = false; fe('fishBtn').textContent = 'Cast again'; fe('fishTally').textContent = fishTallyText(); fishRenderStamps();
}
function fishPress() {
  if (!fishing) return;
  if (fishing.phase === 'idle') return fishCast();
  if (fishing.phase === 'wait') return fishEscape('Too soon. The fish slipped off.');
  if (fishing.phase === 'bite') return fishHook();
  if (fishing.phase === 'result') return fishIdleUi('Where to next?', 'Tap the water to choose a spot, then cast.');
}

/* ---------- the reel: hold to reel, keep the line in the green ----------
   Holding the button raises the line's tension; letting go lets it fall slack. The fish alternates between tired spells
   and runs. Perfect (35-65%) reels in fastest, the slightly tight or loose bands reel slowly, a slack line lets the fish
   take back line, and a straining line (>78%) lets it take line twice as fast. Nothing breaks: the only way to lose the
   fish is for it to drag the line all the way back out. Easy reeling (a Settings toggle) holds the tension steady. */
const FISH_TENSION = { slack: 22, perfectLo: 35, perfectHi: 65, strain: 78 };
function fishHook() {
  fishClear(); if (!fishing) return;
  fishPhase('reeling');
  Object.assign(fishing, { dist: 30, tension: 10, holding: false, fPhase: 'tired', last: performance.now(), clickAt: 0, status: '' });
  const [tired] = fishBehavior(fishing.fish); fishing.fUntil = performance.now() + randIn(tired) * 1000;
  fe('fishTension').classList.remove('hidden'); fe('fishDepth').classList.remove('hidden');
  fe('fishDepthMk').textContent = fishing.fish.icon;
  fishUi('Hooked!', 'Hold the button to reel.', 'Hold to reel', 'reeling'); fe('fishSplash').classList.remove('on'); fe('fishHook').classList.add('hidden');
  sfx('found'); buzz(HAP.tap); if (fishMotionOk()) { fishShake(); fishDrops(fishing.hook.x, fishing.hook.y, 6); }
  fishing.raf = requestAnimationFrame(fishReelTick);
}
function fishReelTick(t) {
  if (!fishing || fishing.phase !== 'reeling') return;
  const dt = Math.min(0.1, (t - fishing.last) / 1000); fishing.last = t;
  const f = fishing.fish, easy = !!prefs.fishEasy, [tired, runr] = fishBehavior(f);
  if (t >= fishing.fUntil) {            // the fish switches between resting and running
    fishing.fPhase = fishing.fPhase === 'tired' ? 'run' : 'tired';
    fishing.fUntil = t + randIn(fishing.fPhase === 'run' ? runr : tired) * 1000;
    if (fishing.fPhase === 'run') buzz(HAP.tap);
  }
  const run = fishing.fPhase === 'run', hold = fishing.holding;
  const target = easy ? (hold ? 50 : 8) : hold ? 34 + (run ? 14 + f.drain * 3.5 : f.drain * 1.5) : 6 + (run ? f.drain * 1.4 : 0);
  fishing.tension += (target - fishing.tension) * Math.min(1, dt * 3.4);
  const T = fishing.tension, drag = f.drain * (run ? 1 : 0.35) * (easy ? 0.7 : 1), reel = 7 + f.pull * 0.7;
  let rate, zone;
  if (T > FISH_TENSION.strain) { rate = -drag * 2; zone = 'strain'; }
  else if (T < FISH_TENSION.slack) { rate = -drag; zone = 'slack'; }
  else if (T >= FISH_TENSION.perfectLo && T <= FISH_TENSION.perfectHi) { rate = reel - drag; zone = 'perfect'; }
  else { rate = reel * 0.55 - drag; zone = 'ok'; }
  fishing.dist += rate * dt;
  if (hold && rate > 0 && t - fishing.clickAt > 280) { fishing.clickAt = t; sfx('step'); }   // a reel click while the line comes in
  // draw it
  const d = Math.max(0, Math.min(100, fishing.dist)), p = fishPosAt(d);
  fe('fishTensionMk').style.left = Math.max(2, Math.min(98, T)) + '%';
  fe('fishTension').classList.toggle('strain', zone === 'strain');
  fe('fishDepthFill').style.height = Math.max(4, d) + '%'; fe('fishDepthMk').parentNode.style.setProperty('--d', d);
  fe('fishDepthMk').style.bottom = `calc(${Math.max(4, d)}% - 4px)`;
  fishPlaceFish(p.x, p.y, 'shown ' + fishing.size + (run ? ' run' : ''), 0.12); fishBobberAt(p.x, p.y);
  fishSetLine(p.x, p.y, Math.min(34, T * 0.4));
  fe('fishBtn').classList.toggle('holding', hold);
  const status = zone === 'strain' ? 'strain' : run ? 'run' : zone === 'slack' ? 'slack' : 'ok';
  if (status !== fishing.status) {
    fishing.status = status;
    fe('fishMsg').textContent = status === 'strain' ? 'The line is straining!' : status === 'run' ? "It's running!" : status === 'slack' ? 'Slack line' : 'Hooked!';
    fe('fishSub').textContent = status === 'strain' ? 'Let go for a moment.' : status === 'run' ? 'Ease off, tap in short pulls.' : status === 'slack' ? 'Hold to take up the line.' : 'Keep the marker in the green.';
    if (status === 'strain') buzz(HAP.soft);
  }
  if (fishing.dist <= 0) { fishing.dist = 0; fishEscape('It fought free and got away!'); return; }
  if (fishing.dist >= 100) { fishLand(f); return; }
  fishing.raf = requestAnimationFrame(fishReelTick);
}
function fishHold(on) { if (fishing && fishing.phase === 'reeling') { fishing.holding = on; if (!on) fe('fishBtn').classList.remove('holding'); } }
function fishBucketPos() {   // where the bucket sits, as % of the scene
  const r = fe('fishScene').getBoundingClientRect(), b = fe('fishBucket').getBoundingClientRect();
  return { x: (b.left + b.width / 2 - r.left) / r.width * 100, y: (b.top + b.height / 2 - r.top) / r.height * 100 };
}
function fishLand(fish) {
  fishClear();
  const f = fishState();
  const firstOfKind = !f.caught[fish.id];
  f.caught[fish.id] = (f.caught[fish.id] || 0) + 1; f.total = (f.total || 0) + 1;
  f.sinceLegendary = fish.legendary ? 0 : (f.sinceLegendary || 0) + 1;
  addIngredient('fish', 1);                                   // every catch goes in the pantry too
  if (!f.best || !fishDef(f.best) || fish.pebbles > fishDef(f.best).pebbles) f.best = fish.id;
  bumpStat('fishCaught', 1);
  if (weatherIs('rain')) bumpStat('rainyFish', 1);
  if (firstOfKind) logEvent(fish.icon, `New in the fish log: ${fish.name}.`);
  if (fish.legendary) logEvent('🌟', `Landed the legendary ${fish.name}!`);
  const rewarded = f.rewarded < FISH_DAILY_REWARDED;
  const isBig = !fish.legendary && Math.random() < FISH_BIG_ODDS;   // a rare bonus-sized catch - flourish and a bit more, nothing to chase deliberately
  let line = fish.blurb, cardId = null, gotPeb = 0;
  if (rewarded) {
    f.rewarded++;
    if (Math.random() < FISH_CARD_ODDS) {
      cardId = randomCardId(rollRewardRarity(false));
      state.ownedCards.push(cardId); bumpStat('cardsFound', 1); bumpPill('pillCards');
      line = 'Something heavier than a fish. A card, tied up in the weeds!';
    } else {
      gotPeb = econTaper('fishing', Math.round(fish.pebbles * (eventIs('fishing-derby') ? 2 : 1) * (isBig ? 1.5 : 1)), 120);
      addPebbles(gotPeb, 'fishing');
      line = `${isBig ? "It's a big one! " : ''}${fish.blurb}`;
    }
  } else { line = `${fish.blurb} You let it go.`; }
  saveState(); updateHud();
  const title = cardId ? 'A card!' : (firstOfKind ? `New catch: ${fish.name}!` : isBig ? `A big ${fish.name}!` : `You caught a ${fish.name}!`);
  fishPhase('landing'); ['fishTension', 'fishDepth', 'fishBaits'].forEach(id => fe(id).classList.add('hidden'));
  fishUi(title, line, 'Cast again'); fe('fishBtn').disabled = true; fe('fishTally').textContent = fishTallyText(); fishRenderStamps();
  // the fish leaps from the bank into the bucket, with a spray of drops and a flash (gold for something special)
  const gold = !!(fish.legendary || isBig || cardId), bp = fishBucketPos(), el = fe('fishFish'), sz = fishing.size, ic = cardId ? '🃏' : fish.icon;
  el.textContent = ic; fishPlaceFish(FISH_BANK.x, FISH_BANK.y + 2, 'shown ' + sz, 0); fishSetLine(FISH_BANK.x, FISH_BANK.y + 2, 0);
  fishSplashAt(FISH_BANK.x, FISH_BANK.y + 2, 10); fishFlash(FISH_BANK.x, FISH_BANK.y + 6, gold); fishDrops(FISH_BANK.x, FISH_BANK.y + 2, gold ? 10 : 5, gold);
  const t = n => fishMs(n);
  if (fishMotionOk()) {
    setTimeout(() => { if (fishing && fishing.phase === 'landing') fishPlaceFish(30, 9, 'shown ' + sz, 0.32); }, 40);
    setTimeout(() => { if (fishing && fishing.phase === 'landing') fishPlaceFish(bp.x, bp.y, 'shown ' + sz, 0.28); }, 380);
  }
  setTimeout(() => {
    if (!fishing || fishing.phase !== 'landing') return;
    el.className = 'fs-fish ' + sz; fishSetLine(null);
    fishing.bucket++; fe('fishBucketN').textContent = fishing.bucket;
    const bk = fe('fishBucket'); bk.classList.remove('bump'); void bk.offsetWidth; bk.classList.add('bump'); fishDrops(bp.x, bp.y + 2, 5, gold);
  }, t(680));
  setTimeout(() => {
    if (!fishing || fishing.phase !== 'landing') return;
    fishPlaceFish(50, 50, ''); fishFill(); fishSettle();
  }, t(1000));
  const chips = [];
  if (gotPeb) chips.push(`<span class="fs-chip gold">+${gotPeb} Pebble${gotPeb > 1 ? 's' : ''}${eventIs('fishing-derby') ? ' (derby!)' : ''}</span>`);
  if (firstOfKind) chips.push(`<span class="fs-chip ok">New · Log ${FISH.filter(x => f.caught[x.id]).length}/${FISH.length}</span>`);
  if (isBig) chips.push('<span class="fs-chip gold">Big one</span>');
  const rr = fe('fishResult'); rr.innerHTML = chips.join(''); rr.classList.toggle('hidden', !chips.length);
  sfx(cardId || fish.legendary ? 'rare' : 'claim'); buzz(fish.legendary ? HAP.big : HAP.win);
  if (fish.legendary) toast(`🌟 A legendary catch: ${fish.name}!`);
  if (firstOfKind) toast(`📖 Fish log: ${fish.name}`);
  if (cardId) { const isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId)); if (isNew) toast('📖 New entry in your Index'); setTimeout(() => { if (fishing) showCardReveal(cardId, 'Fished up', false); }, fishMs(1050) || 350); }
}
// The main button: a tap casts, waits and sets the hook, and a hold reels.
const fishBtnEl = fe('fishBtn');
fishBtnEl.addEventListener('click', () => { if (fishing && fishing.phase === 'reeling') return; fishPress(); });
fishBtnEl.addEventListener('pointerdown', e => { if (fishing && fishing.phase === 'reeling') { e.preventDefault(); fishHold(true); } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => fishBtnEl.addEventListener(ev, () => fishHold(false)));
fishBtnEl.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && fishing && fishing.phase === 'reeling') { e.preventDefault(); fishHold(true); } });
fishBtnEl.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') fishHold(false); });
fishBtnEl.addEventListener('contextmenu', e => e.preventDefault());
document.getElementById('fishClose').addEventListener('click', closeFishing);

/* ---------- tapping the water ---------- */
function tryFishTap(m, tx, ty) {
  if (!isWaterTile(m, tx, ty)) return false;
  if (!m.fishTiles[tx + ',' + ty]) return false;    // no fish showing here - nothing to cast for
  const bank = bankFor(m, tx, ty);
  if (!bank) return false;                         // a pond with no reachable bank keeps its old flavour text
  const atBank = bank.x === state.playerPos.x && bank.y === state.playerPos.y;
  const go = () => openFishing({ x: tx, y: ty });
  if (atBank) { go(); return true; }
  if (!walkThen((x, y) => x === bank.x && y === bank.y, go)) townLog.textContent = "You can't get down to the water there.";
  return true;
}


