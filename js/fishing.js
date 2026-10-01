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
  { id: 'ghost-koi', name: 'Ghost Koi', icon: '👻', pebbles: 6, weight: 14, weather: ['fog'], blurb: 'You can almost see through it.', drain: 7.0, pull: 11, hint: 'Drifts up only in the fog' },
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
function pickFish() {
  const pool = FISH.filter(fishAvailable);
  // A very long dry spell on the legendary Starlight Koi (whose catch weight is tiny by design) guarantees
  // the next hook is one, rather than leaving it a lottery ticket most players never actually see.
  const koi = fishDef('star-koi');
  if ((fishState().sinceLegendary || 0) >= FISH_LEGEND_PITY && koi && fishAvailable(koi)) return koi;
  const bait = currentBait(), w = f => fishWeight(f) * (bait.likes.includes(f.id) ? bait.mult : 1);   // the chosen bait makes its favourites bite more
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

/* ---------- the fishing scene ---------- */
let fishing = null;   // { phase: 'idle'|'wait'|'bite'|'reeling', timers, spot, fish, bait, dist, tension, holding, ... }
const fe = id => document.getElementById(id);
const FISH_HOOK = { x: 59.4, y: 59.8 };                       // where the hook hangs, as % of the scene (also dist = 30)
const fishPosAt = d => ({ x: 66 - 22 * d / 100, y: 70 - 34 * d / 100 });   // the fish rises toward the bank as you reel it in
function fishClear() { if (fishing) { clearTimeout(fishing.t1); clearTimeout(fishing.t2); clearTimeout(fishing.t3); cancelAnimationFrame(fishing.raf); } }
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
function fishRenderBaits() {
  const box = fe('fishBaits'), sel = currentBait().id;
  box.innerHTML = '';
  BAITS.forEach(b => {
    const n = b.stock(), el = document.createElement('button'); el.type = 'button';
    el.className = 'fs-bait' + (b.id === sel ? ' sel' : '') + (n <= 0 ? ' out' : '');
    el.setAttribute('aria-label', `${b.name} bait${n === Infinity ? '' : ', ' + n + ' left'}`);
    el.innerHTML = `<b>${b.icon}</b><span>${b.name}${n === Infinity ? '' : ' ×' + n}</span><em>${baitWorks(b) ? b.likes.map(id => fishDef(id).icon).join('') : 'not now'}</em>`;
    el.addEventListener('click', () => { if (n <= 0 || !fishing || fishing.phase !== 'idle') return; fishState().bait = b.id; saveState(); sfx('tap'); fishRenderBaits(); });
    box.appendChild(el);
  });
}
function fishUi(msg, sub, btn, btnCls) {
  fe('fishMsg').textContent = msg; fe('fishSub').textContent = sub;
  const b = fe('fishBtn'); b.textContent = btn; b.className = 'btn' + (btnCls ? ' ' + btnCls : ''); b.disabled = false;
}
function fishIdleUi(msg, sub) {
  fishPhase('idle');
  fishUi(msg, sub, 'Cast', '');
  fe('fishBaits').classList.remove('hidden'); fe('fishTension').classList.add('hidden'); fe('fishDepth').classList.add('hidden');
  fe('fishBang').style.opacity = ''; fe('fishScene').classList.remove('nibble');
  fe('fishTally').textContent = fishTallyText(); fishRenderStamps(); fishRenderBaits();
  fishPlaceFish(50, 50, ''); fishSetLine(null);
}
function openFishing(spot) {
  fishing = { phase: 'idle', spot };
  const sc = fe('fishScene');
  sc.dataset.wx = weatherNow();
  fe('fishLoc').textContent = DISTRICTS[state.currentDistrict].name;
  fe('fishWx').textContent = (WEATHER_KINDS[weatherNow()].icon || '☀️') + ' ' + WEATHER_KINDS[weatherNow()].name;
  fe('fishResult').classList.add('hidden');
  const rainNote = weatherIs('rain') ? '🌧️ The rain has the fish biting. ' : '';
  fishIdleUi('A quiet spot by the water.', rainNote + (fishAvailableNote() || 'Pick a bait, then cast.'));
  fe('fishOverlay').classList.remove('hidden'); document.body.classList.add('in-fishing'); sfx('tap');
  showTipOnce('fishing');
}
function closeFishing() { fishClear(); if (fishing) { fishing.phase = 'closed'; } fishing = null; fe('fishOverlay').classList.add('hidden'); document.body.classList.remove('in-fishing'); }
function fishCast() {
  if (!fishing || fishing.phase !== 'idle') return;
  const bait = currentBait();
  fishing.bait = bait; fishing.fish = pickFish(); fishing.size = fishSizeOf(fishing.fish);
  fishPhase('wait');
  fe('fishBaits').classList.add('hidden'); fe('fishResult').classList.add('hidden');
  fishUi(`${bait.icon} ${bait.name} on the hook`, `A ${FISH_SIZE_WORD[fishing.size]} shadow drifts closer…`, 'Reel in', 'wait'); sfx('soft');
  fishSetLine(FISH_HOOK.x, FISH_HOOK.y, 0);
  const wait = (FISH_WAIT_MS[0] + Math.random() * (FISH_WAIT_MS[1] - FISH_WAIT_MS[0])) * (weatherFx().biteSpeed || 1) * (hasPerk('fish') ? 0.7 : 1) * (1 - Math.min(0.5, cardBonus('fish')));   // rain, a fishy companion, charms: bites come sooner
  // the shadow swims in from the left and arrives at the hook exactly when it bites
  fishPlaceFish(6, 66, 'shadow ' + fishing.size, 0); fe('fishFish').textContent = fishing.fish.icon; void fe('fishFish').offsetWidth;
  fishPlaceFish(FISH_HOOK.x, FISH_HOOK.y, null, wait / 1000);
  // sometimes a false nibble comes first: the float twitches, but it is not a bite yet
  if (wait > 2200 && Math.random() < 0.4) fishing.t3 = setTimeout(() => {
    if (!fishing || fishing.phase !== 'wait') return;
    fe('fishScene').classList.add('nibble'); fe('fishSub').textContent = 'Just a nibble… not yet.'; sfx('soft');
    setTimeout(() => { const sc = fe('fishScene'); if (sc) sc.classList.remove('nibble'); if (fishing && fishing.phase === 'wait') fe('fishSub').textContent = `A ${FISH_SIZE_WORD[fishing.size]} shadow circles the bait…`; }, 600);
  }, wait * 0.55);
  fishing.t1 = setTimeout(() => {
    if (!fishing || fishing.phase !== 'wait') return;
    const f = fishing.fish;
    fishing.bait.take(); fishRenderBaits(); saveState();                       // the bait is used up when something bites it
    fishPhase('bite'); fe('fishScene').classList.remove('nibble');
    fe('fishFish').className = 'fs-fish shown ' + fishing.size;
    fe('fishSplash').classList.remove('on'); void fe('fishSplash').offsetWidth; fe('fishSplash').classList.add('on');
    fishUi('Bite!', 'Tap now to set the hook.', 'Hook it!', 'bite'); sfx('found'); buzz(HAP.tap);
    fishing.t2 = setTimeout(() => { if (fishing && fishing.phase === 'bite') fishMiss('It got away. Not to worry.'); }, FISH_BITE_MS);
  }, wait);
}
function fishMiss(text) {
  fishClear(); if (!fishing) return;
  fishIdleUi(text, 'Cast again whenever you like.');
  fishPlaceFish(50, 70, ''); fe('fishBtn').textContent = 'Cast again';
}
function fishPress() {
  if (!fishing) return;
  if (fishing.phase === 'idle') return fishCast();
  if (fishing.phase === 'wait') return fishMiss('Too soon. The fish slipped off.');
  if (fishing.phase === 'bite') return fishHook();
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
  fishUi('Hooked!', 'Hold the button to reel.', 'Hold to reel', 'reeling'); fe('fishSplash').classList.remove('on');
  sfx('found'); buzz(HAP.tap);
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
  fishPlaceFish(p.x, p.y, 'shown ' + fishing.size + (run ? ' run' : ''), 0.12);
  fishSetLine(p.x, p.y, Math.min(34, T * 0.4));
  fe('fishBtn').classList.toggle('holding', hold);
  const status = zone === 'strain' ? 'strain' : run ? 'run' : zone === 'slack' ? 'slack' : 'ok';
  if (status !== fishing.status) {
    fishing.status = status;
    fe('fishMsg').textContent = status === 'strain' ? 'The line is straining!' : status === 'run' ? "It's running!" : status === 'slack' ? 'Slack line' : 'Hooked!';
    fe('fishSub').textContent = status === 'strain' ? 'Let go for a moment.' : status === 'run' ? 'Ease off, tap in short pulls.' : status === 'slack' ? 'Hold to take up the line.' : 'Keep the marker in the green.';
    if (status === 'strain') buzz(HAP.soft);
  }
  if (fishing.dist <= 0) { fishing.dist = 0; fishMiss('It fought free and got away!'); return; }
  if (fishing.dist >= 100) { fishLand(f); return; }
  fishing.raf = requestAnimationFrame(fishReelTick);
}
function fishHold(on) { if (fishing && fishing.phase === 'reeling') { fishing.holding = on; if (!on) fe('fishBtn').classList.remove('holding'); } }
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
      gotPeb = Math.round(fish.pebbles * (eventIs('fishing-derby') ? 2 : 1) * (isBig ? 1.5 : 1));
      addPebbles(gotPeb);
      line = `${isBig ? "It's a big one! " : ''}${fish.blurb}`;
    }
  } else { line = `${fish.blurb} You let it go.`; }
  saveState(); updateHud();
  fishIdleUi(cardId ? 'A card!' : (firstOfKind ? `New catch: ${fish.name}!` : isBig ? `A big ${fish.name}!` : `You caught a ${fish.name}!`), line);
  fishPhase('caught'); fe('fishBtn').textContent = 'Cast again'; fe('fishBaits').classList.add('hidden');
  // the fish leaps out of the water above the bank line
  const el = fe('fishFish'); el.className = 'fs-fish shown leap ' + fishing.size; el.textContent = cardId ? '🃏' : fish.icon; fishPlaceFish(50, 14, null, 0.5);
  fe('fishSplash').classList.remove('on'); void fe('fishSplash').offsetWidth; fe('fishSplash').classList.add('on');
  fishSetLine(50, 20, 0);
  const chips = [];
  if (gotPeb) chips.push(`<span class="fs-chip gold">+${gotPeb} Pebble${gotPeb > 1 ? 's' : ''}${eventIs('fishing-derby') ? ' (derby!)' : ''}</span>`);
  if (firstOfKind) chips.push(`<span class="fs-chip ok">New · Log ${FISH.filter(x => f.caught[x.id]).length}/${FISH.length}</span>`);
  if (isBig) chips.push('<span class="fs-chip gold">Big one</span>');
  const rr = fe('fishResult'); rr.innerHTML = chips.join(''); rr.classList.toggle('hidden', !chips.length);
  sfx(cardId || fish.legendary ? 'rare' : 'claim'); buzz(fish.legendary ? HAP.big : HAP.win);
  if (fish.legendary) toast(`🌟 A legendary catch: ${fish.name}!`);
  if (firstOfKind) toast(`📖 Fish log: ${fish.name}`);
  if (cardId) { const isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId)); if (isNew) toast('📖 New entry in your Index'); setTimeout(() => { if (fishing) showCardReveal(cardId, 'Fished up', false); }, 350); }
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


