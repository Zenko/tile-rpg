/* ============================================================
   FISHING
   Tap water from a bank, cast, wait for the bite, tap to reel in.
   Calm, no penalty for missing, a small daily cap on rewards.
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
const NIBBLE_LINES = ['The float sits still.', 'A dragonfly lands on the line.', 'Ripples spread. Not yet.', 'Something brushes the line.'];

const fishState = () => {
  const p = state.progress;
  if (!p.fishing) p.fishing = { day: todayKey(), rewarded: 0, caught: {}, total: 0, best: null };
  const f = p.fishing;
  if (f.day !== todayKey()) { f.day = todayKey(); f.rewarded = 0; }
  if (!f.caught) f.caught = {};
  return f;
};
// Rain makes the scarcer fish (anything that isn't the everyday Minnow/Perch) bite more often.
function fishWeight(f) { return f.weight * (f.weight < 20 && !f.legendary ? (weatherFx().rareFish || 1) * (eventIs('fishing-derby') ? 2 : 1) : 1); }
function pickFish() {
  const pool = FISH.filter(fishAvailable);
  const total = pool.reduce((s, f) => s + fishWeight(f), 0); let r = Math.random() * total;
  for (const f of pool) { r -= fishWeight(f); if (r <= 0) return f; }
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

/* ---------- the fishing card ---------- */
let fishing = null;   // { phase: 'idle'|'wait'|'bite'|'reeling', timers, spot, fish, progress }
function fishEls() { return { ov: document.getElementById('fishOverlay'), art: document.getElementById('fishArt'), msg: document.getElementById('fishMsg'), sub: document.getElementById('fishSub'),
  btn: document.getElementById('fishBtn'), close: document.getElementById('fishClose'), tally: document.getElementById('fishTally'),
  bar: document.getElementById('fishReelBar'), fill: document.getElementById('fishReelFill') }; }
function fishClear() { if (fishing) { clearTimeout(fishing.t1); clearTimeout(fishing.t2); clearInterval(fishing.reelTimer); } }
function fishTallyText() {
  const f = fishState(), left = Math.max(0, FISH_DAILY_REWARDED - f.rewarded);
  const kinds = FISH.filter(x => f.caught[x.id]).length;
  return `${left ? `${left} rewarded catch${left === 1 ? '' : 'es'} left today` : 'Daily rewards used, still fun to fish'} · Fish log ${kinds}/${FISH.length}`;
}
function openFishing(spot) {
  fishing = { phase: 'idle', spot };
  const e = fishEls();
  e.art.className = 'fish-art'; e.art.textContent = '🎣';
  e.msg.textContent = 'A quiet spot by the water.';
  e.sub.textContent = weatherIs('rain') ? '🌧️ The rain has the fish biting. Cast your line.' : 'Cast your line and wait for a bite.';
  e.btn.textContent = 'Cast line'; e.btn.disabled = false; e.btn.classList.remove('wait', 'bite', 'reeling'); e.tally.textContent = fishTallyText();
  e.bar.classList.add('hidden'); e.fill.style.width = '32%'; e.fill.classList.remove('danger');
  e.ov.classList.remove('hidden'); sfx('tap');
}
function closeFishing() { fishClear(); fishing = null; fishEls().ov.classList.add('hidden'); }
function fishCast() {
  if (!fishing || fishing.phase === 'wait' || fishing.phase === 'bite') return;
  const e = fishEls();
  fishing.phase = 'wait';
  e.art.className = 'fish-art cast'; e.art.textContent = '🎣';
  e.msg.textContent = NIBBLE_LINES[Math.floor(Math.random() * NIBBLE_LINES.length)];
  e.sub.textContent = 'Wait for the float to dip…';
  e.btn.textContent = 'Reel in'; e.btn.classList.add('wait'); sfx('soft');
  const wait = (FISH_WAIT_MS[0] + Math.random() * (FISH_WAIT_MS[1] - FISH_WAIT_MS[0])) * (weatherFx().biteSpeed || 1) * (hasPerk('fish') ? 0.7 : 1) * (1 - Math.min(0.5, cardBonus('fish')));   // rain, a fishy companion, charms: bites come sooner
  fishing.t1 = setTimeout(() => {
    if (!fishing || fishing.phase !== 'wait') return;
    fishing.phase = 'bite';
    e.art.className = 'fish-art bite'; e.msg.textContent = 'Bite!'; e.sub.textContent = 'Tap now!';
    e.btn.classList.remove('wait'); e.btn.classList.add('bite'); sfx('found'); buzz(HAP.tap);
    fishing.t2 = setTimeout(() => { if (fishing && fishing.phase === 'bite') fishMiss('It got away. Not to worry.'); }, FISH_BITE_MS);
  }, wait);
}
function fishMiss(text) {
  fishClear(); const e = fishEls();
  fishing.phase = 'idle';
  e.art.className = 'fish-art'; e.art.textContent = '🌊';
  e.msg.textContent = text; e.sub.textContent = 'Cast again whenever you like.';
  e.btn.classList.remove('wait', 'bite', 'reeling'); e.btn.textContent = 'Cast line'; e.btn.disabled = false;
  e.bar.classList.add('hidden');
}
function fishPress() {
  if (!fishing) return;
  if (fishing.phase === 'idle') return fishCast();
  if (fishing.phase === 'wait') return fishMiss('Too soon. The fish slipped off.');
  if (fishing.phase === 'bite') return fishHook();
  if (fishing.phase === 'reeling') return fishPull();
}
// The hook lands - now it's a tug of war: tap to reel while the fish tugs back on its own clock.
function fishHook() {
  fishClear();
  const e = fishEls();
  fishing.phase = 'reeling';
  fishing.fish = pickFish();
  fishing.progress = 32;
  e.art.className = 'fish-art bite'; e.msg.textContent = 'Hooked!'; e.sub.textContent = 'Tap fast to reel it in!';
  e.btn.classList.remove('wait', 'bite'); e.btn.classList.add('reeling'); e.btn.textContent = 'Reel!';
  e.bar.classList.remove('hidden'); e.fill.style.width = fishing.progress + '%'; e.fill.classList.remove('danger');
  sfx('found'); buzz(HAP.tap);
  fishing.reelTimer = setInterval(() => {
    if (!fishing || fishing.phase !== 'reeling') return;
    fishing.progress -= fishing.fish.drain * (0.8 + Math.random() * 0.4);
    if (fishing.progress <= 0) { fishing.progress = 0; fishReelUpdate(); fishMiss('It fought free and got away!'); return; }
    fishReelUpdate();
  }, FISH_REEL_TICK_MS);
}
function fishReelUpdate() {
  const e = fishEls();
  const pct = Math.max(0, Math.min(100, fishing.progress));
  e.fill.style.width = pct + '%';
  e.fill.classList.toggle('danger', pct < 25);
}
function fishPull() {
  if (!fishing || fishing.phase !== 'reeling') return;
  fishing.progress += fishing.fish.pull * (0.85 + Math.random() * 0.3);
  buzz(HAP.step);
  const e = fishEls(); e.art.className = 'fish-art bite';
  if (fishing.progress >= 100) { fishing.progress = 100; fishReelUpdate(); fishLand(fishing.fish); return; }
  fishReelUpdate(); sfx('step');
}
function fishLand(fish) {
  fishClear();
  const e = fishEls(), f = fishState();
  const firstOfKind = !f.caught[fish.id];
  f.caught[fish.id] = (f.caught[fish.id] || 0) + 1; f.total = (f.total || 0) + 1;
  addIngredient('fish', 1);                                   // every catch goes in the pantry too
  if (!f.best || !fishDef(f.best) || fish.pebbles > fishDef(f.best).pebbles) f.best = fish.id;
  bumpStat('fishCaught', 1);
  if (weatherIs('rain')) bumpStat('rainyFish', 1);
  if (firstOfKind) logEvent(fish.icon, `New in the fish log: ${fish.name}.`);
  if (fish.legendary) logEvent('🌟', `Landed the legendary ${fish.name}!`);
  const rewarded = f.rewarded < FISH_DAILY_REWARDED;
  let line = fish.blurb, cardId = null;
  if (rewarded) {
    f.rewarded++;
    if (Math.random() < FISH_CARD_ODDS) {
      cardId = randomCardId(rollRewardRarity(false));
      state.ownedCards.push(cardId); bumpStat('cardsFound', 1); bumpPill('pillCards');
      line = 'Something heavier than a fish. A card, tied up in the weeds!';
    } else { const peb = fish.pebbles * (eventIs('fishing-derby') ? 2 : 1); addPebbles(peb); line = `${fish.blurb} +${peb} Pebble${peb > 1 ? 's' : ''}${eventIs('fishing-derby') ? ' (derby!)' : ''}`; }
  } else { line = `${fish.blurb} You let it go.`; }
  saveState(); updateHud();
  fishing.phase = 'idle'; e.btn.classList.remove('wait', 'bite', 'reeling');
  e.bar.classList.add('hidden');
  e.art.className = 'fish-art caught'; e.art.textContent = cardId ? '🃏' : fish.icon;
  e.msg.textContent = cardId ? 'A card!' : (firstOfKind ? `New catch: ${fish.name}!` : `You caught a ${fish.name}!`);
  e.sub.textContent = line; e.tally.textContent = fishTallyText();
  e.btn.textContent = 'Cast again'; e.btn.disabled = false;
  sfx(cardId || fish.legendary ? 'rare' : 'claim'); buzz(fish.legendary ? HAP.big : HAP.win);
  if (fish.legendary) toast(`🌟 A legendary catch: ${fish.name}!`);
  if (firstOfKind) toast(`📖 Fish log: ${fish.name}`);
  if (cardId) { const isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId)); if (isNew) toast('📖 New entry in your Index'); setTimeout(() => { if (fishing) showCardReveal(cardId, 'Fished up', false); }, 350); }
}
document.getElementById('fishBtn').addEventListener('click', fishPress);
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


