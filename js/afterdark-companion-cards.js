/* ============================================================
   AFTER DARK: the Lantern Market and night critters
   At night Lumen sets up in El Mercado de Susurros (a tile you can walk to, like a spirit it never blocks the way), and a few
   critters glow in every district's grass. Catch them for the critter log and to trade at the Lantern Market.
   ============================================================ */
const LANTERN_TILE = { district: 'market', x: 4, y: 5 };
const NIGHT_PACK_COST = 45;
const NIGHT_CARDS = ['moonlit-shrine', 'moon-viewing', 'nightjar', 'northern-lights', 'celestial-owl', 'moon-dragon', 'moonstone', 'starlight',
                     'dusk-bat', 'mist-wraith', 'lantern-fish', 'firefly', 'moth-queen', 'eclipse-panther', 'moonlit-tide', 'starfall', 'paper-lantern', 'stone-lantern'];
const BUGS = [
  { id: 'firefly',     name: 'Firefly',     icon: '✨', weight: 50, pebbles: 2, hint: 'Any night' },
  { id: 'cricket',     name: 'Cricket',     icon: '🦗', weight: 26, pebbles: 2, hint: 'Any night' },
  { id: 'glow-beetle', name: 'Glow Beetle', icon: '🪲', weight: 14, pebbles: 3, hint: 'Any night, now and then' },
  { id: 'luna-moth',   name: 'Luna Moth',   icon: '🦋', weight: 9,  pebbles: 4, hint: 'Any night, but shy' },
  { id: 'rain-snail',  name: 'Rain Snail',  icon: '🐌', weight: 18, pebbles: 3, weather: ['rain', 'storm'], hint: 'Only on rainy nights' },
  { id: 'starwing',    name: 'Starwing',    icon: '💫', weight: 1.5, pebbles: 15, legendary: true, hint: 'A legend of the night sky' },
];
const BUG_MAX = 3, BUG_CATCH_ODDS = 0.8;
function isNightNow() { return skyPhase().isNight; }
function lanternOpen() { return isNightNow() && state.currentDistrict === LANTERN_TILE.district; }
function bugState() { const p = state.progress; if (!p.bugs || typeof p.bugs !== 'object') p.bugs = { caught: {}, jar: {}, total: 0 }; if (!p.bugs.jar) p.bugs.jar = {}; return p.bugs; }
function bugDef(id) { return BUGS.find(b => b.id === id); }
function jarValue() { const j = bugState().jar; return Object.keys(j).reduce((n, id) => n + (j[id] || 0) * (bugDef(id) ? bugDef(id).pebbles : 0), 0); }
function jarLine() { const j = bugState().jar, list = BUGS.filter(b => j[b.id]).map(b => `${b.icon}×${j[b.id]}`); return list.length ? `Your jar: ${list.join(' ')}.` : ''; }
function pickBug() {
  const pool = BUGS.filter(b => !b.weather || b.weather.includes(weatherNow()));
  let r = Math.random() * pool.reduce((n, b) => n + b.weight, 0);
  for (const b of pool) { r -= b.weight; if (r <= 0) return b.id; }
  return pool[0].id;
}
// Critters come out at night and are gone by morning. Returns true when something visibly changed.
function tickBugs(data) {
  if (!isNightNow()) { if (data.bugs && data.bugs.length) { data.bugs = []; return true; } return false; }
  if (!Array.isArray(data.bugs)) data.bugs = [];
  if (data.bugs.length >= BUG_MAX || Math.random() > 0.25) return false;
  const spot = findFreeTile(data);
  data.bugs.push({ uid: 'bug-' + Date.now() + '-' + Math.floor(Math.random() * 1000), kind: pickBug(), x: spot.x, y: spot.y });
  if (data === state.districtData[state.currentDistrict]) showTipOnce('bugs');
  return true;
}
function bugAt(data, x, y) { return (data.bugs || []).find(b => b.x === x && b.y === y) || null; }
function catchBug(b) {
  const data = ensureDistrictData(state.currentDistrict), def = bugDef(b.kind);
  data.bugs = (data.bugs || []).filter(x => x.uid !== b.uid);
  if (Math.random() > BUG_CATCH_ODDS) { toast(`${def.icon} It flitted away!`); sfx('soft'); saveState(); renderTown(); return; }
  const bs = bugState(), first = !bs.caught[def.id];
  bs.caught[def.id] = (bs.caught[def.id] || 0) + 1; bs.jar[def.id] = (bs.jar[def.id] || 0) + 1; bs.total = (bs.total || 0) + 1;
  bumpStat('bugsCaught', 1);
  toast(first ? `📖 Critter log: ${def.icon} ${def.name}!` : `${def.icon} Caught a ${def.name}`);
  if (first) logEvent(def.icon, `New in the critter log: ${def.name}.`);
  if (def.legendary) { logEvent('💫', `Caught the legendary ${def.name}!`); sfx('mythic'); buzz(HAP.big); } else { sfx('found'); buzz(HAP.found); }
  saveState(); renderTown();
}
function buyNightPack() {
  if (!isNightNow()) return 'Lumen yawns. "The night packs are packed away until dark."';
  if (state.progress.pebbles < NIGHT_PACK_COST) { sfx('tie'); return `Lumen blinks slowly. "🫧 ${NIGHT_PACK_COST}, night friend."`; }
  spendPebbles(NIGHT_PACK_COST, 'night-pack');
  const r = Math.random(), rar = r < 0.03 ? 'mythic' : r < 0.15 ? 'super' : r < 0.45 ? 'ultra' : 'rare';
  let pool = NIGHT_CARDS.map(cardDef).filter(d => d && d.rarity === rar);
  if (!pool.length) pool = NIGHT_CARDS.map(cardDef).filter(Boolean);
  const cid = seasonalPick(pool).id, isNew = !discoveredSet().has(cid);
  state.ownedCards.push(cid); noteCardsFound(1); state.progress.packsOpened += 1;
  logEvent('🌙', `Bought a Night Pack from Lumen for 🫧 ${NIGHT_PACK_COST}.`);
  saveState(); updateHud(); bumpPill('pillCards'); bumpPill('pillPebbles');
  showCardReveal(cid, 'Night Pack', true);
  if (isNew) toast('📖 New entry in your Index');
  return 'Lumen tears the dark paper with one talon. "May it serve you well."';
}
function sellJar() {
  const v = jarValue();
  if (!v) return 'Your jar is empty. Critters glow in the grass at night - tap one to catch it.';
  bugState().jar = {}; addPebbles(v, 'bugs'); saveState(); sfx('claim');
  return `Lumen releases your critters into the lantern light, one by one, and counts out 🫧 ${v}.`;
}

/* ============================================================
   COMPANION
   Invite a wandering spirit along and it trails one step behind you everywhere, with a small perk that depends on
   its card's first keyword. One companion at a time; letting it go returns it to the wild.
   ============================================================ */
const COMPANION_PERKS = {
  spirit:  { icon: '🛡️', text: '+2 Calm at the start of every match' },
  finds:   { icon: '👀', text: 'Spots more hidden cards in the grass' },
  crops:   { icon: '🌱', text: 'Crops grow 25% faster' },
  harvest: { icon: '🧺', text: '+2 Embers from every harvest' },
  chest:   { icon: '🗝️', text: 'Hidden chests turn up more often' },
  fish:    { icon: '🎣', text: 'Fish bite sooner' },
  xp:      { icon: '⭐', text: '+10% XP from everything' },
};
const KW_PERK = { guard: 'spirit', thorns: 'spirit', swift: 'finds', mend: 'crops', bloom: 'harvest', shield: 'chest', echo: 'fish', drain: 'fish', rally: 'xp' };
function companionPerkFor(cardId) { const d = cardDef(cardId); return (d && d.kw[0] && KW_PERK[d.kw[0]]) || 'xp'; }
function companionPerk() { return state.companion ? state.companion.perk : null; }
function hasPerk(p) { return companionPerk() === p; }
function inviteCompanion(spiritId) {
  const data = ensureDistrictData(state.currentDistrict), sp = (data.spirits || []).find(x => x.id === spiritId);
  document.getElementById('pickupInvite').classList.add('hidden');
  pickupOverlay.classList.add('hidden');
  if (!sp || state.companion) return;
  const def = cardDef(sp.cardId);
  state.companion = { cardId: sp.cardId, name: def.name, icon: def.icon, perk: companionPerkFor(sp.cardId), since: Date.now() };
  state.companionPos = besidePlayer();
  data.spirits = data.spirits.filter(x => x.id !== spiritId);
  logEvent(def.icon, `${def.name} decided to come along with you.`);
  toast(`${def.icon} ${def.name} joins you · ${COMPANION_PERKS[state.companion.perk].text}`);
  sfx('gift'); buzz(HAP.found); saveState(); renderTown(); checkAchievements();
}
function releaseCompanion() {
  if (!state.companion) return;
  const c = state.companion;
  logEvent(c.icon, `Said goodbye to ${c.name}. It drifted off into the grass.`);
  toast(`${c.icon} ${c.name} drifts off, waving`);
  state.companion = null; state.companionPos = null;
  saveState(); renderTown(); renderCompanionBox();
}
// An open tile next to you (behind you first), for a companion that has just caught up.
function besidePlayer() {
  const m = getMap(state.currentDistrict), p = state.playerPos;
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
    const x = p.x + dx, y = p.y + dy;
    if (x >= 0 && y >= 0 && x < m.w && y < m.h && !m.solid[y][x] && !m.exits[x + ',' + y] && !m.entries[x + ',' + y]) return { x, y };
  }
  return { x: p.x, y: p.y };
}
// The companion steps into the tile you just left.
function followPlayer(prev) {
  if (!state.companion) return;
  state.companionPos = { x: prev.x, y: prev.y };
  const el = townWorld && townWorld.querySelector('.ent.companion');
  if (el) { el.style.setProperty('--x', prev.x); el.style.setProperty('--y', prev.y); el.style.zIndex = prev.y * 2 + 2; }
}
function renderCompanionBox() {
  const box = document.getElementById('companionBox');
  if (!box) return;
  const c = state.companion;
  if (!c) { box.innerHTML = '<div class="panel-desc">Tap a wandering spirit in town and invite it along. Each one brings a small perk.</div>'; return; }
  const perk = COMPANION_PERKS[c.perk];
  box.innerHTML = `<div class="panel-item"><span class="panel-icon">${c.icon}</span><span class="panel-text"><div class="panel-name">${escapeHtml(c.name)}</div><div class="panel-ability">${perk.icon} ${perk.text}</div></span><button class="panel-action" id="companionRelease">Let it go</button></div>`;
  document.getElementById('companionRelease').addEventListener('click', () => { if (confirm(`Say goodbye to ${c.name}?`)) releaseCompanion(); });
}

/* ============================================================
   MORE USES FOR CARDS
   Charms and sets turn cards you own into small town perks (read through cardBonus()), mastery rewards the cards
   you actually play, the museum and the trading board give spare copies somewhere to go, expeditions put idle cards
   to work, deck challenges reward a wide collection, and neighbors can be given cards they love.
   ============================================================ */
const rarityTier = id => RARITY_ORDER.indexOf(cardDef(id).rarity) + 1;       // common 1 … mythic 5
function baseOwnedSet() { return new Set(state.ownedCards.map(id => BattleEngine.baseIdOf(id))); }

/* ---------------- charms: up to three cards, each lending a perk based on its keyword and rarity ---------------- */
const CHARM_KINDS = {
  mend:   { kind: 'crops',          val: t => 0.05 * t,        text: v => `Crops grow ${Math.round(v * 100)}% faster` },
  echo:   { kind: 'fish',           val: t => 0.05 * t,        text: v => `Fish bite ${Math.round(v * 100)}% sooner` },
  swift:  { kind: 'finds',          val: t => 0.10 * t,        text: v => `Hidden finds +${Math.round(v * 100)}%` },
  guard:  { kind: 'chest',          val: t => 0.10 * t,        text: v => `Hidden chests +${Math.round(v * 100)}%` },
  bloom:  { kind: 'harvestPebbles', val: t => t,               text: v => `+${v} Ember${v === 1 ? '' : 's'} per harvest` },
  shield: { kind: 'startSpirit',    val: t => Math.ceil(t / 2), text: v => `+${v} Calm at the start of matches` },
  rally:  { kind: 'xp',             val: t => 0.02 * t,        text: v => `+${Math.round(v * 100)}% XP` },
  drain:  { kind: 'bake',           val: t => 0.06 * t,        text: v => `Bread bakes ${Math.round(v * 100)}% faster` },
  thorns: { kind: 'winPebbles',     val: t => t,               text: v => `+${v} Ember${v === 1 ? '' : 's'} for every match won` },
  spell:  { kind: 'miniPebbles',    val: t => Math.ceil(t / 2), text: v => `+${v} Ember${v === 1 ? '' : 's'} per mini-game medal` },
};
const CHARM_SLOT_LEVELS = [1, 5, 10];      // level needed for charm slot 1, 2, 3
function charmSlotsOpen() { return CHARM_SLOT_LEVELS.filter(l => (state.progress.level || 1) >= l).length; }
function charms() { const p = state.progress; if (!Array.isArray(p.charms)) p.charms = [null, null, null]; return p.charms; }
function charmInfo(id) {
  const d = cardDef(id); if (!d) return null;
  const k = CHARM_KINDS[d.spell ? 'spell' : d.kw[0]]; if (!k) return null;
  const v = k.val(rarityTier(id));
  return { kind: k.kind, val: v, text: k.text(v) };
}
// charms only count while you still own the card
function activeCharms() { const own = new Set(state.ownedCards); return charms().slice(0, charmSlotsOpen()).filter(id => id && own.has(id)); }
function setCharm(id) {
  const c = charms(), open = charmSlotsOpen();
  if (c.slice(0, open).includes(id)) return;
  const slot = c.slice(0, open).findIndex(x => !x || !state.ownedCards.includes(x));
  if (slot < 0) { toast('All charm slots are full - tap one to clear it'); sfx('tie'); return; }
  c[slot] = id; saveState(); sfx('claim'); buzz(HAP.found);
  const info = charmInfo(id); toast(`✦ ${cardDef(id).name}: ${info ? info.text : 'no charm effect'}`);
  bumpStat('charmsSet', 1);
}
function clearCharm(i) { charms()[i] = null; saveState(); sfx('tap'); }

/* ---------------- set bonuses: own every card of a themed set for a lasting perk ---------------- */
const CARD_SETS = [
  { id: 'koi',      name: 'Koi Pond',       icon: '🎏', cards: ['koi', 'copper-carp', 'koi-ascending', 'void-koi'],                      kind: 'fish',        val: 0.10, text: 'Fish bite 10% sooner' },
  { id: 'moon',     name: 'Moon Phases',    icon: '🌙', cards: ['moonlit-shrine', 'moon-viewing', 'moonstone', 'moon-dragon'],           kind: 'xp',          val: 0.05, text: '+5% XP' },
  { id: 'garden',   name: 'Garden Party',   icon: '🌷', cards: ['sprout', 'blossom', 'foxglove', 'garden-spirit', 'garden-titan'],       kind: 'crops',       val: 0.10, text: 'Crops grow 10% faster' },
  { id: 'stones',   name: 'Rock Collection', icon: '🪨', cards: ['pebble', 'flintstone', 'geode', 'boulder', 'quartz-cluster'],          kind: 'startSpirit', val: 1,    text: '+1 Calm at the start of matches' },
  { id: 'birds',    name: 'Birdwatching',   icon: '🐦', cards: ['feather', 'dove', 'nightjar', 'heron', 'pinewood-owl', 'celestial-owl'], kind: 'finds',      val: 0.15, text: 'Hidden finds +15%' },
  { id: 'storm',    name: 'Stormchaser',    icon: '⛈️', cards: ['gale', 'thunderhead', 'thunderclap', 'storm-lily'],                     kind: 'chest',       val: 0.15, text: 'Hidden chests +15%' },
  { id: 'festival', name: 'Festival Night', icon: '🏮', cards: ['paper-fan', 'paper-lantern', 'festival-drum', 'temple-bell', 'lucky-cat'], kind: 'miniPebbles', val: 1, text: '+1 Ember per mini-game medal' },
  { id: 'spells',   name: 'Spellbook',      icon: '📜', cards: CARD_POOL.filter(c => c.spell).map(c => c.id),                             kind: 'startDraw',   val: 1,    text: 'Draw 1 extra card at the start of matches' },
];
function setProgress(s) { const own = baseOwnedSet(); return s.cards.filter(id => own.has(id)).length; }
function setComplete(s) { return setProgress(s) === s.cards.length; }
// A set's one-time completion prize, checked whenever cards change hands.
function checkSets() {
  if (typeof checkBinder === 'function') checkBinder();   // js/binder.js
  const p = state.progress; if (!p.setsDone || typeof p.setsDone !== 'object') p.setsDone = {};
  CARD_SETS.forEach(s => {
    if (p.setsDone[s.id] || !setComplete(s)) return;
    p.setsDone[s.id] = true;
    addPebbles(20, 'sets'); bumpStat('setsCompleted', 1);
    toast(`${s.icon} Set complete: ${s.name}! ${s.text} · +20 🫧`);
    logEvent(s.icon, `Completed the ${s.name} set. Bonus: ${s.text.toLowerCase()}.`);
  });
}

// Every perk from charms and completed sets, summed by kind.
function cardBonus(kind) {
  let v = 0;
  activeCharms().forEach(id => { const i = charmInfo(id); if (i && i.kind === kind) v += i.val; });
  CARD_SETS.forEach(s => { if (s.kind === kind && setComplete(s)) v += s.val; });
  if (typeof skillBonus === 'function') v += skillBonus(kind);   // skill ranks, gear and companion bond (js/skills-gear.js)
  return v;
}

/* ---------------- mastery: cards you play grow ★ ranks; ★★★ cards start matches with +1 health ---------------- */
const MASTERY_AT = [5, 15, 40];
function masteryXp(id) { const m = state.progress.mastery; return (m && m[BattleEngine.baseIdOf(id)]) || 0; }
function masteryRank(id) { const x = masteryXp(id); return MASTERY_AT.filter(t => x >= t).length; }
function masteryStars(id) { const r = masteryRank(id); return r ? '★'.repeat(r) : ''; }
function addMastery(baseId, n) {
  const p = state.progress; if (!p.mastery || typeof p.mastery !== 'object') p.mastery = {};
  const before = masteryRank(baseId);
  p.mastery[baseId] = (p.mastery[baseId] || 0) + n;
  const after = masteryRank(baseId), d = cardDef(baseId);
  if (after > before && d) {
    toast(`✨ ${d.icon} ${d.name} reached ${'★'.repeat(after)} mastery${after === 3 && !d.spell ? ' (+1 health in battle)' : ''}`);
    logEvent('✨', `${d.name} reached ${'★'.repeat(after)} mastery.`);
    bumpStat('masteryRanks', 1);
  }
}
// Called once per match: every card you played gains 1, plus 1 more if you won.
function settleMastery(won) {
  const played = (battle && battle.mastery) || {};
  Object.keys(played).forEach(b => addMastery(b, played[b] + (won ? 1 : 0)));
}

/* ---------------- the museum: donate spare copies to fill six wings ---------------- */
const MUSEUM_WINGS = [
  { id: 'pond',     name: 'Pond Wing',         icon: '🌊', deco: 'pond-diorama',   cards: ['droplet', 'koi', 'lily', 'bubble', 'tide', 'copper-carp', 'koi-ascending', 'lantern-fish'] },
  { id: 'meadow',   name: 'Meadow Wing',       icon: '🌼', deco: 'meadow-painting', cards: ['sprout', 'clover', 'moth', 'reed', 'blossom', 'feather', 'foxglove', 'dew-leaf'] },
  { id: 'hearth',   name: 'Stone & Hearth',    icon: '🪨', deco: 'hearth-urn',     cards: ['pebble', 'flintstone', 'geode', 'boulder', 'old-kettle', 'hollow-log', 'twig-bundle', 'stone-lantern'] },
  { id: 'festival', name: 'Festival Hall',     icon: '🏮', deco: 'festival-mask',  cards: ['paper-fan', 'festival-drum', 'lucky-cat', 'paper-lantern', 'temple-bell', 'torii-gate', 'origami-crane', 'rice-cake'] },
  { id: 'night',    name: 'Night Sky Gallery', icon: '🌌', deco: 'star-telescope', cards: ['moonstone', 'starlight', 'nightjar', 'northern-lights', 'moonlit-shrine', 'moon-viewing', 'celestial-owl', 'moon-dragon'] },
  { id: 'legends',  name: 'Hall of Legends',   icon: '🏛️', deco: 'legend-statue',  cards: ['aurora-stag', 'deep-current', 'mountain-heart', 'sky-whale', 'ancient-oak', 'phoenix-ember', 'glacier-spirit', 'void-koi'] },
];
const WING_PEBBLES = 30;
function museumState() { const p = state.progress; if (!p.museum || typeof p.museum !== 'object') p.museum = { donated: {}, wings: {} }; return p.museum; }
function wingDef(id) { return MUSEUM_WINGS.find(w => w.id === id); }
function wingProgress(w) { const d = museumState().donated; return w.cards.filter(id => d[id]).length; }
function isDonated(id) { return !!museumState().donated[BattleEngine.baseIdOf(id)]; }
function canDonate(id) { return !isDonated(id) && spareCount(id) >= 1; }
function donateCard(id) {
  if (!canDonate(id)) return '';
  const w = MUSEUM_WINGS.find(x => x.cards.includes(id)), d = cardDef(id), ms = museumState();
  state.ownedCards.splice(state.ownedCards.indexOf(id), 1);
  ms.donated[id] = Date.now();
  addPebbles(2, 'museum'); addXP(8); bumpStat('donations', 1);
  let text = `${d.icon} ${d.name} takes its place in the ${w.name}. The curator beams. (+2 🫧)`;
  if (w && !ms.wings[w.id] && wingProgress(w) === w.cards.length) {
    ms.wings[w.id] = Date.now();
    addPebbles(WING_PEBBLES, 'museum');
    state.decorationInventory[w.deco] = decorationInventoryCount(w.deco) + 1;
    const deco = DECORATION_ITEMS.find(x => x.id === w.deco);
    toast(`${w.icon} The ${w.name} is complete!`); logEvent(w.icon, `Completed the museum's ${w.name}.`);
    text += ` The ${w.name} is complete! You receive 🫧 ${WING_PEBBLES} and a ${deco.icon} ${deco.name} for your decorations.`;
    sfx('mythic'); buzz(HAP.big);
  } else sfx('claim');
  logEvent('🏛️', `Donated ${d.name} to the museum.`);
  saveState(); updateHud(); checkAchievements();
  return text;
}
function museumWingButtons() {
  return MUSEUM_WINGS.map(w => { const n = wingProgress(w), ready = w.cards.filter(canDonate).length;
    return sceneBtn('wing:' + w.id, `${w.icon} ${w.name} · ${n}/${w.cards.length}${n === w.cards.length ? ' ✓' : ready ? ` · ${ready} to donate` : ''}`); }).join('');
}
function museumCardButtons(wid) {
  const w = wingDef(wid), own = baseOwnedSet();
  return w.cards.map(id => { const d = cardDef(id);
    if (isDonated(id)) return sceneBtn('noop', `✅ ${d.icon} ${d.name}`, true);
    if (canDonate(id)) return sceneBtn('donate:' + id, `🎁 Donate ${d.icon} ${d.name}`);
    if (own.has(id)) return sceneBtn('noop', `${d.icon} ${d.name} · needs a spare copy`, true);
    return sceneBtn('noop', `❔ ??? · ${RARITY_LABEL[d.rarity]}`, true); }).join('') +
    (w.cards.filter(canDonate).length > 1 ? sceneBtn('donateall:' + wid, `🎁 Donate every spare for this wing (${w.cards.filter(canDonate).length})`) : '');
}

/* ---------------- expeditions: send up to three spare cards away for a while ----------------
   The cards leave your collection while they travel and come home with the loot. Keywords matter: Flicker shortens the
   trip, Watch / Haze / Briar make a mishap less likely, Startle improves the odds of a card, Bloom and Sip bring
   extra supplies, Chorus adds Embers, Rest brings back more experience. Strength (power + health) scales the Embers. */
const EXPEDITIONS = [
  { id: 'meadow', name: 'Meadow Walk',     icon: '🌾', mins: 20,  need: 8,  desc: 'Seeds, daisies and Embers. A common card now and then.' },
  { id: 'shore',  name: 'Along the Shore', icon: '🐚', mins: 45,  need: 14, desc: 'Fish, Embers, and a fair chance of a rare card.' },
  { id: 'ruins',  name: 'Old Ruins',       icon: '🏚️', mins: 90,  need: 20, desc: 'Plenty of Embers and a good chance of a rare card or better.' },
  { id: 'peaks',  name: 'Misty Peaks',     icon: '⛰️', mins: 180, need: 28, desc: 'A long climb. The best odds of an ultra rare card or better, and Moonbeans.' },
];
const EXPED_TEAMS = 2, EXPED_PARTY = 3;
function expedState() { const p = state.progress; if (!p.expeditions || typeof p.expeditions !== 'object') p.expeditions = { active: [], picking: null }; return p.expeditions; }
function expedDef(id) { return EXPEDITIONS.find(e => e.id === id); }
function partyStats(ids) {
  const defs = ids.map(cardDef).filter(Boolean), has = k => defs.filter(d => d.kw.includes(k)).length;
  return { strength: defs.reduce((n, d) => n + (d.spell ? 4 : d.power + d.grit), 0), swift: has('swift'), guard: has('guard') + has('shield') + has('thorns'),
           echo: has('echo'), bloom: has('bloom') + has('drain'), rally: has('rally'), mend: has('mend'), spells: defs.filter(d => d.spell).length };
}
function expedMinutes(e, ids) { return Math.round(e.mins * Math.max(0.6, 1 - 0.15 * partyStats(ids).swift)); }
function expedMishap(ids) { return Math.max(0.03, 0.2 - 0.06 * partyStats(ids).guard); }
function expedSummary(e, ids) {
  const s = partyStats(ids), r = Math.min(1.5, s.strength / e.need);
  return `⏱ ${expedMinutes(e, ids)} min · strength ${s.strength}/${e.need}${r < 1 ? ' (a little weak)' : ''} · mishap ${Math.round(expedMishap(ids) * 100)}%`;
}
function startExpedition(eid, ids) {
  const e = expedDef(eid), es = expedState();
  if (!e || !ids.length || es.active.length >= EXPED_TEAMS) return false;
  if (ids.some(id => spareCount(id) < 1)) return false;
  ids.forEach(id => state.ownedCards.splice(state.ownedCards.indexOf(id), 1));
  es.active.push({ id: eid, cards: ids.slice(), start: Date.now(), ends: Date.now() + expedMinutes(e, ids) * 60000, notified: false });
  es.picking = null;
  logEvent(e.icon, `Sent ${ids.map(id => cardDef(id).name).join(', ')} on the ${e.name}.`);
  saveState(); updateHud(); sfx('claim');
  return true;
}
function rollExpedLoot(e, ids) {
  const s = partyStats(ids), r = Math.min(1.5, Math.max(0.4, s.strength / e.need)), mishap = Math.random() < expedMishap(ids);
  const loot = { pebbles: 0, items: [], card: null, mishap };
  const base = { meadow: [5, 8], shore: [8, 14], ruins: [12, 20], peaks: [20, 30] }[e.id];
  loot.pebbles = Math.round((base[0] + rand(base[1] - base[0] + 1)) * r * (1 + 0.2 * s.rally) * (mishap ? 0.5 : 1));
  const extra = s.bloom;
  if (e.id === 'meadow') { loot.items.push({ kind: 'seed', id: ['daisy', 'pumpkin', 'sunflower'][rand(3)], n: 1 + (extra ? 1 : 0) }); loot.items.push({ kind: 'ingredient', id: 'flowers', n: 1 + rand(2) + extra }); }
  if (e.id === 'shore') loot.items.push({ kind: 'ingredient', id: 'fish', n: 2 + rand(2) + extra });
  if (e.id === 'ruins' && extra) loot.items.push({ kind: 'ingredient', id: 'pumpkin', n: extra });
  if (e.id === 'peaks' && (Math.random() < 0.35 || extra)) loot.items.push({ kind: 'seed', id: 'moonbean', n: 1 });
  const cardOdds = { meadow: 0.3, shore: 0.35, ruins: 0.65, peaks: 0.6 }[e.id] + 0.1 * s.echo;
  if (!mishap && Math.random() < cardOdds) {
    const rr = Math.random();
    const rarity = e.id === 'meadow' ? (rr < 0.85 ? 'common' : 'rare') : e.id === 'shore' ? (rr < 0.6 ? 'common' : rr < 0.95 ? 'rare' : 'ultra')
      : e.id === 'ruins' ? rollRewardRarity(false) : (rr < 0.7 ? 'ultra' : rr < 0.95 ? 'super' : 'mythic');
    loot.card = randomCardId(rarity);
  }
  return loot;
}
function collectExpedition(i) {
  const es = expedState(), t = es.active[i];
  if (!t || Date.now() < t.ends) return '';
  const e = expedDef(t.id), loot = rollExpedLoot(e, t.cards), s = partyStats(t.cards);
  es.active.splice(i, 1);
  t.cards.forEach(id => { state.ownedCards.push(id); addMastery(BattleEngine.baseIdOf(id), 2); });   // everyone comes home, a little wiser
  addPebbles(loot.pebbles, 'expeditions');
  addXP(Math.round(e.mins / 2 * (1 + 0.5 * s.mend)));
  loot.items.forEach(it => { if (it.kind === 'seed') seedInv()[it.id] = seedCount(it.id) + it.n; else addIngredient(it.id, it.n); });
  if (loot.card) { state.ownedCards.push(loot.card); bumpStat('cardsFound', 1); bumpPill('pillCards'); }
  bumpStat('expeditionsDone', 1);
  saveState(); updateHud(); checkSets();
  const itemText = loot.items.map(it => it.kind === 'seed' ? `${seedDef(it.id).icon}×${it.n}` : `${INGREDIENTS[it.id].icon}×${it.n}`).join(' ');
  logEvent(e.icon, `The ${e.name} team came home${loot.mishap ? ' soaked and muddy' : ''} with 🫧 ${loot.pebbles}${loot.card ? ' and a card' : ''}.`);
  if (loot.card) setTimeout(() => showCardReveal(loot.card, `${e.icon} Found on the ${e.name}`, true), 300);
  sfx('claim'); buzz(HAP.found);
  return `${e.icon} The team is back${loot.mishap ? ' - a little soaked and muddy, so they carried less' : ''}! 🫧 ${loot.pebbles} ${itemText}${loot.card ? ' and a card!' : ''}`;
}
function expedButtons() {
  const es = expedState(), now = Date.now();
  if (es.picking) {
    const e = expedDef(es.picking.id), picks = es.picking.cards;
    const pool = Object.keys(ownedCardCounts()).filter(id => spareCount(id) >= 1 || picks.includes(id))
      .sort((a, b) => partyStats([b]).strength - partyStats([a]).strength).slice(0, 14);
    return sceneBtn('exp-go', picks.length ? `🚀 Send them off · ${expedSummary(e, picks)}` : 'Pick up to 3 spare cards below', !picks.length) +
      pool.map(id => { const d = cardDef(id), on = picks.includes(id);
        return sceneBtn('exp-pick:' + id, `${on ? '✅' : '➕'} ${d.icon} ${d.name} <small>${cardStatsText(d)}${d.kw.length ? ' ' + kwIcons(d) : ''}</small>`, !on && picks.length >= EXPED_PARTY); }).join('') +
      (pool.length ? '' : sceneBtn('noop', 'No spare cards to send yet - they must be extra copies outside your deck', true)) +
      sceneBtn('exp-cancel', '← Choose another trip');
  }
  const trips = es.active.map((t, i) => { const e = expedDef(t.id), left = t.ends - now;
    return left > 0 ? sceneBtn('noop', `${e.icon} ${e.name} · back in ${fmtClock(left)} · ${t.cards.map(id => cardDef(id).icon).join('')}`, true) : sceneBtn('exp-collect:' + i, `🎒 ${e.name}: the team is home - collect!`); }).join('');
  const full = es.active.length >= EXPED_TEAMS;
  return trips + EXPEDITIONS.map(e => sceneBtn('exp-plan:' + e.id, `${e.icon} ${e.name} · ${e.mins} min · ${e.desc}`, full)).join('') + sceneBtn('back', '← Back to the curator');
}
function expedAction(act) {
  const es = expedState();
  if (act.startsWith('exp-plan:')) { es.picking = { id: act.slice(9), cards: [] }; const e = expedDef(es.picking.id); return `${e.icon} ${e.name}: ${e.desc} Pick up to 3 spare cards. Flicker ones travel faster, Watch cards keep the team safe, Startle cards sniff out treasure.`; }
  if (act === 'exp-cancel') { es.picking = null; return 'Where shall your cards go?'; }
  if (act.startsWith('exp-pick:')) {
    const id = act.slice(9), p = es.picking.cards;
    if (p.includes(id)) p.splice(p.indexOf(id), 1); else if (p.length < EXPED_PARTY) p.push(id);
    sfx('tap'); return p.length ? expedSummary(expedDef(es.picking.id), p) : 'Pick up to 3 spare cards.';
  }
  if (act === 'exp-go') { const e = expedDef(es.picking.id), ids = es.picking.cards.slice(); return startExpedition(e.id, ids) ? `${e.icon} Off they go! They'll be back in ${expedMinutes(e, ids)} minutes.` : 'That team cannot go right now.'; }
  if (act.startsWith('exp-collect:')) return collectExpedition(+act.slice(12));
  return '';
}
// A quiet heads-up when a team gets home (checked with the town's regular tick).
function checkExpeditions() {
  expedState().active.forEach(t => { if (!t.notified && Date.now() >= t.ends) { t.notified = true; toast(`${expedDef(t.id).icon} Your ${expedDef(t.id).name} team is back - collect them at the museum`); saveState(); } });
}

/* ---------------- the trading board (El Mercado de Susurros sign): three new offers every day ----------------
   swap   : a specific spare card of yours for a card of the same rarity you have never had
   bundle : any 3 spare cards of one rarity for a named card of the next rarity
   buyer  : a specific spare card of yours for three times what releasing it would pay */
function tradesState() {
  const p = state.progress;
  if (!p.trades || p.trades.day !== todayKey()) p.trades = { day: todayKey(), offers: buildTradeOffers() };
  return p.trades;
}
function buildTradeOffers() {
  const who = () => { const pool = NPC_POOLS.market; const i = rand(pool.names.length); return { name: pool.names[i], icon: pool.icons[i % pool.icons.length] }; };
  const spares = Object.keys(ownedCardCounts()).filter(id => spareCount(id) >= 1 && !cardDef(id).crafted);
  const disc = discoveredSet(), offers = [];
  const pickSpare = (fallbackRarity) => spares.length ? spares[rand(spares.length)] : randomCardId(fallbackRarity);
  // 1. swap for something new
  const want1 = pickSpare('common'), r1 = cardDef(want1).rarity;
  const fresh = cardPool(r1).filter(c => !disc.has(c.id));
  offers.push(Object.assign(who(), { kind: 'swap', want: want1, give: (fresh.length ? fresh[rand(fresh.length)] : cardPool(r1)[rand(cardPool(r1).length)]).id, done: false }));
  // 2. bundle up a rarity
  const rar = ['common', 'common', 'rare', 'ultra'][rand(4)];
  offers.push(Object.assign(who(), { kind: 'bundle', rarity: rar, n: 3, give: randomCardId(nextRarity(rar)), done: false }));
  // 3. a collector paying well
  const want3 = pickSpare('rare');
  offers.push(Object.assign(who(), { kind: 'buyer', want: want3, pebbles: RELEASE_VALUE[cardDef(want3).rarity] * 3, done: false }));
  if (eventIs('swap-day')) {                              // Swap Day: one more swap and one more buyer
    const w4 = pickSpare('common'), r4 = cardDef(w4).rarity, fresh4 = cardPool(r4).filter(c => !disc.has(c.id) && c.id !== offers[0].give);
    if (fresh4.length) offers.push(Object.assign(who(), { kind: 'swap', want: w4, give: fresh4[rand(fresh4.length)].id, done: false }));
    const w5 = pickSpare('rare'); offers.push(Object.assign(who(), { kind: 'buyer', want: w5, pebbles: RELEASE_VALUE[cardDef(w5).rarity] * 3, done: false }));
  }
  return offers;
}
function bundlePicks(o) {
  const a = spareAllocation(), picks = [];
  Object.keys(a).filter(id => a[id] > 0 && cardDef(id).rarity === o.rarity && !cardDef(id).crafted)
    .sort((x, y) => a[y] - a[x]).forEach(id => { for (let i = 0; i < a[id] && picks.length < o.n; i++) picks.push(id); });
  return picks.length >= o.n ? picks : null;
}
function tradeReady(o) {
  if (o.done) return false;
  if (o.kind === 'bundle') return !!bundlePicks(o);
  return spareCount(o.want) >= 1;
}
function tradeLabel(o) {
  const g = o.give && cardDef(o.give), w = o.want && cardDef(o.want);
  const wantText = o.kind === 'bundle' ? `any ${o.n} spare ${RARITY_LABEL[o.rarity]} cards` : `your ${w.icon} ${w.name}`;
  const giveText = o.kind === 'buyer' ? `🫧 ${o.pebbles}` : `${g.icon} ${g.name} (${RARITY_LABEL[g.rarity]})${discoveredSet().has(o.give) ? '' : ' · new!'}`;
  return `${o.done ? '✅ ' : ''}${o.icon} ${o.name}: ${wantText} → ${giveText}`;
}
function doTrade(i) {
  const o = tradesState().offers[i];
  if (!o || !tradeReady(o)) { sfx('tie'); return "You don't have the spare cards for that one yet."; }
  const used = o.kind === 'bundle' ? bundlePicks(o) : [o.want];
  used.forEach(id => state.ownedCards.splice(state.ownedCards.indexOf(id), 1));
  o.done = true;
  bumpStat('tradesDone', 1);
  addFriendship({ id: 'npc-market-trade', name: o.name }, 1, 'trade');
  if (o.kind === 'buyer') { addPebbles(o.pebbles, 'trades'); sfx('claim'); }
  else {
    const isNew = !discoveredSet().has(o.give);
    state.ownedCards.push(o.give); bumpStat('cardsFound', 1); bumpPill('pillCards');
    showCardReveal(o.give, `Traded with ${o.name}`, true);
    if (isNew) toast('📖 New entry in your Index');
  }
  logEvent('🤝', `Traded with ${o.name} at the board.`);
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat(used.map(id => BattleEngine.baseIdOf(id)))));
  saveState(); updateHud(); checkSets();
  return `${o.icon} ${o.name} shakes on it. A fair trade!`;
}
function tradeButtons() {
  return tradesState().offers.map((o, i) => sceneBtn('trade:' + i, tradeLabel(o), !tradeReady(o))).join('') + sceneBtn('leave', 'Step away from the board');
}

/* ---------------- deck challenges (at the fountain): win with a deck that follows today's rule ---------------- */
const CHALLENGE_RULES = [
  { id: 'commons',  icon: '🌱', text: 'Only common cards',               test: ds => ds.every(d => d.rarity === 'common') },
  { id: 'noguard',  icon: '🚫', text: 'No Watch cards at all',            test: ds => ds.every(d => !d.kw.includes('guard')) },
  { id: 'spells',   icon: '✨', text: 'At least 3 spells',                test: ds => ds.filter(d => d.spell).length >= 3 },
  { id: 'cheap',    icon: '🪶', text: 'Nothing costing more than 2',      test: ds => ds.every(d => d.cost <= 2) },
  { id: 'single',   icon: '🎴', text: 'No two cards the same',            test: ds => new Set(ds.map(d => BattleEngine.baseIdOf(d.id))).size === ds.length },
  { id: 'big',      icon: '⛰️', text: 'At least 4 cards costing 4 or more', test: ds => ds.filter(d => d.cost >= 4).length >= 4 },
  { id: 'keywords', icon: '🧩', text: 'Every card has a keyword or is a spell', test: ds => ds.every(d => d.spell || d.kw.length) },
  { id: 'rareplus', icon: '💎', text: 'Only rare cards or better',         test: ds => ds.every(d => d.rarity !== 'common') },
  // Family formats (build 100): spells have no family, so they are allowed in every one.
  { id: 'fam-grove', icon: '🌿', text: 'Only Brote cards (and spells)',    test: ds => ds.every(d => d.spell || CARD_FAMILY[BattleEngine.baseIdOf(d.id)] === 'grove') },
  { id: 'fam-stone', icon: '🪨', text: 'Only Recuerdo cards (and spells)',    test: ds => ds.every(d => d.spell || CARD_FAMILY[BattleEngine.baseIdOf(d.id)] === 'stone') },
  { id: 'fam-tide',  icon: '🌊', text: 'Only Deriva cards (and spells)',     test: ds => ds.every(d => d.spell || CARD_FAMILY[BattleEngine.baseIdOf(d.id)] === 'tide') },
  { id: 'fam-wind',  icon: '🪶', text: 'Only Susurro cards (and spells)',     test: ds => ds.every(d => d.spell || CARD_FAMILY[BattleEngine.baseIdOf(d.id)] === 'wind') },
  { id: 'two-fam',   icon: '🎭', text: 'Cards from at most two families',  test: ds => new Set(ds.filter(d => !d.spell).map(d => CARD_FAMILY[BattleEngine.baseIdOf(d.id)] || 'none')).size <= 2 },
];
function challengeState() {
  const p = state.progress;
  if (!p.challenges || p.challenges.day !== todayKey()) {
    const rnd = seeded('challenge-' + todayKey()), pool = CHALLENGE_RULES.slice();
    const picks = [];
    while (picks.length < 3) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
    p.challenges = { day: todayKey(), list: picks.map((id, i) => ({ rule: id, level: ['normal', 'normal', 'smart'][i], won: false })) };
  }
  return p.challenges;
}
function ruleDef(id) { return CHALLENGE_RULES.find(r => r.id === id); }
function deckFits(rule) { return state.deck.length >= DECK_SIZE && ruleDef(rule).test(state.deck.map(cardDef)); }
function challengeButtons() {
  return challengeState().list.map((c, i) => { const r = ruleDef(c.rule), ok = deckFits(c.rule);
    return sceneBtn('chal-play:' + i, `${c.won ? '✅' : r.icon} ${r.text} · ${ok ? 'your deck fits - play!' : "your deck doesn't fit yet"}${c.won ? '' : ` · prize: ${i === 2 ? 'ultra rare+' : 'rare+'}`}`, !ok); }).join('') +
    sceneBtn('chal-back', '← Back to the fountain');
}
function startChallenge(i) {
  const c = challengeState().list[i];
  if (!c || !deckFits(c.rule)) return;
  const r = ruleDef(c.rule);
  startBattle({ id: 'challenge-' + i, name: `${r.icon} Challenger`, icon: r.icon, deck: buildDeckForOpponent(DECK_SIZE, i === 2), profile: { level: c.level, spirit: i === 2 ? 20 : 17 },
                isBoss: false, rewardCard: null, challenge: { i, rule: c.rule } });
}
function challengeWin() {
  const c = challengeState().list[battle.npc.challenge.i], r = ruleDef(c.rule);
  battle.rewarded = true;
  state.wins++; bumpStat('battlesWon', 1); bumpStat('challengesWon', 1);
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = '🎯'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `Challenge beaten: ${r.text.toLowerCase()}!`;
  if (!c.won) {
    c.won = true;
    const rr = rollRewardRarity(false), cid = randomCardId(battle.npc.challenge.i === 2 && RARITY_ORDER.indexOf(rr) < 2 ? 'ultra' : rr), def = cardDef(cid);
    state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards');
    endCard.classList.add('glow-' + def.rarity);
    battleEndStats.innerHTML = `A win on today's rules earns<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
    logEvent('🎯', `Beat today's "${r.text}" challenge.`);
  } else { addPebbles(4, 'signature'); battleEndStats.innerHTML = 'Beaten again - <b>+4 🫧</b>. The card prize comes once a day.'; }
  saveState();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🎯', '✨'], 12); sfx('win'); buzz(HAP.win); bumpPill('pillWins');
}

/* ---------------- giving cards: neighbors love cards with their favourite keyword ---------------- */
const CARD_GIFT_POINTS = [0, 2, 3, 4, 5, 6];    // by rarity tier
function giftableCards(f) {
  const theme = signatureTheme(f);
  return Object.keys(ownedCardCounts()).filter(id => spareCount(id) >= 1)
    .sort((a, b) => (cardDef(b).kw.includes(theme) ? 1 : 0) - (cardDef(a).kw.includes(theme) ? 1 : 0) || rarityTier(a) - rarityTier(b)).slice(0, 6);
}
function canGiveCard(f) { return !!f && !f.isBoss && !f.isRival && !giftsToday().to[neighborKey(f)] && giftableCards(f).length > 0; }
function giveCard(f, id) {
  if (!canGiveCard(f) || spareCount(id) < 1) return;
  const d = cardDef(id), loves = d.kw.includes(signatureTheme(f));
  state.ownedCards.splice(state.ownedCards.indexOf(id), 1);
  giftsToday().to[neighborKey(f)] = true;
  const pts = Math.round(CARD_GIFT_POINTS[rarityTier(id)] * (loves ? 1.5 : 0.75));
  addFriendship(f, Math.max(1, pts), 'card');
  bumpStat('cardsGifted', 1);
  f._thanks = loves ? `${d.icon} ${d.name}! ${KW[signatureTheme(f)].icon} ${KW[signatureTheme(f)].name} cards are my favourite. You remembered!` : `${d.icon} ${d.name}? How thoughtful. I'll find a spot for it.`;
  logEvent('🃏', `Gave ${d.name} to ${f.name}.`);
  document.getElementById('talkCards').classList.add('hidden');
  saveState(); updateHud(); sfx('gift'); buzz(HAP.found);
  renderTalk();
}
function renderCardGiftPicker(f) {
  const box = document.getElementById('talkCards'), theme = signatureTheme(f);
  box.innerHTML = `<div class="talk-sub">${f.name} loves ${KW[theme].icon} ${KW[theme].name} cards. Only spare copies can be given.</div>` +
    giftableCards(f).map(id => { const d = cardDef(id); return `<button class="snack-btn" data-give="${id}">${d.icon} ${d.name}${d.kw.includes(theme) ? ' 💞' : ''} <small>${RARITY_LABEL[d.rarity]}</small></button>`; }).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-give]').forEach(b => b.addEventListener('click', () => giveCard(f, b.dataset.give)));
}

