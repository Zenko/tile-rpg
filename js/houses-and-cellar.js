/* ============================================================
   HOUSES AND THE CELLAR
   ============================================================ */
// INTERIORS: in content/world.js (the game's words and data, kept apart from the code)

/* ---------------- Maple's bakery: bake a loaf in real time, then share it with neighbors ---------------- */
const BAKE_MS = 6 * 60 * 1000;
const BREAD_MAX = 6;
function breadCount() { return state.progress.bread || 0; }
function breadLine() { const n = breadCount(); return n ? `You're carrying ${n} loa${n === 1 ? 'f' : 'ves'}.` : ''; }
function ovenState() { const st = buildingState('bakery'); if (!st.oven) st.oven = { startedAt: null }; return st.oven; }
function ovenView() {
  const ov = ovenState();
  if (!ov.startedAt) return { label: `🔥 Bake a loaf (ready in ${Math.max(1, Math.round(bakeMs() / 60000))} min)` };
  const left = (ov.ms || BAKE_MS) - (Date.now() - ov.startedAt);
  if (left > 0) return { label: `⏳ In the oven… ${fmtClock(left)}`, disabled: true };
  return { label: '🍞 Take out the fresh loaf' };
}
function bakeMs() { return Math.round(BAKE_MS * (1 - Math.min(0.5, cardBonus('bake') + (hasPerk('hearth') ? 0.2 : 0))) * (eventIs('baking-day') ? 0.5 : 1)); }
function fmtClock(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function ovenAction() {
  const ov = ovenState();
  if (!ov.startedAt) {
    ov.startedAt = Date.now(); ov.ms = bakeMs(); saveState(); sfx('tap');
    scheduleLocalNotify('bread', ov.startedAt + ov.ms, '🍞 Bread is ready!', 'Your loaf at the bakery is done baking.');
    return `${CAST.baker.name} slides your loaf into the oven. "Off you go - it will not burn, I promise."`;
  }
  if (Date.now() - ov.startedAt < (ov.ms || BAKE_MS)) return 'Not yet. It smells wonderful, though.';
  ov.startedAt = null;
  bumpStat('breadBaked', 1);
  if (breadCount() >= BREAD_MAX) { const sale = 4 + Math.round(cardBonus('breadPebbles')); addPebbles(sale, 'bread'); toast(`🫧 +${sale} ${GAME.currency.many}`); saveState(); return `Your basket is already full, so ${CAST.baker.name} buys this loaf back for ${sale} ${GAME.currency.many}.`; }
  state.progress.bread = breadCount() + 1; saveState();
  toast('🍞 +1 loaf'); sfx('claim'); buzz(HAP.found);
  logEvent('🍞', 'Baked a loaf of bread at the bakery.');
  return `Golden and crackling. ${breadLine()} Tap a neighbor in town to share it.`;
}

/* ---------------- cooking: what you grow, catch and bake becomes dishes ----------------
   Harvests and catches go into the pantry; Maple cooks them into dishes. A dish can be given to a neighbor (more
   friendship than bread), eaten before a match for a head start, or asked for in a favour. */
const INGREDIENTS = {
  flowers:   { icon: '🌼', name: 'Daisies' },
  pumpkin:   { icon: '🎃', name: 'Pumpkin' },
  sunflower: { icon: '🌻', name: 'Sunflower seeds' },
  moonbean:  { icon: '🌙', name: 'Moonbeans' },
  fish:      { icon: '🐟', name: 'Fish' },
  bread:     { icon: '🍞', name: 'Bread' },
};
const PANTRY_MAX = 12;       // per ingredient
// RECIPES: in content/world.js (the game's words and data, kept apart from the code)
function recipeDef(id) { return RECIPES.find(r => r.id === id); }
function pantry() { const p = state.progress; if (!p.pantry || typeof p.pantry !== 'object') p.pantry = {}; return p.pantry; }
function ingredientCount(k) { return k === 'bread' ? breadCount() : (pantry()[k] || 0); }
function addIngredient(k, n) { const pt = pantry(); pt[k] = Math.min(PANTRY_MAX, (pt[k] || 0) + (n || 1)); if (typeof pfxGain === 'function' && INGREDIENTS[k]) pfxGain(INGREDIENTS[k].icon); }
function useIngredient(k, n) { if (k === 'bread') state.progress.bread = breadCount() - n; else pantry()[k] = ingredientCount(k) - n; }
function dishes() { const p = state.progress; if (!p.dishes || typeof p.dishes !== 'object') p.dishes = {}; return p.dishes; }
function dishCount(id) { return dishes()[id] || 0; }
function canCook(r) { return Object.keys(r.needs).every(k => ingredientCount(k) >= r.needs[k]); }
function needsText(r) { return Object.keys(r.needs).map(k => `${INGREDIENTS[k].icon}${r.needs[k] > 1 ? '×' + r.needs[k] : ''}`).join(' '); }
function pantryLine() {
  const have = Object.keys(INGREDIENTS).filter(k => ingredientCount(k) > 0).map(k => `${INGREDIENTS[k].icon}×${ingredientCount(k)}`);
  const cooked = RECIPES.filter(r => dishCount(r.id) > 0).map(r => `${r.icon}×${dishCount(r.id)}`);
  return `Pantry: ${have.length ? have.join(' ') : 'empty - harvest crops, catch fish, bake bread'}.${cooked.length ? ` Dishes: ${cooked.join(' ')}.` : ''}`;
}
function cookButtons() {
  return RECIPES.map(r => sceneBtn('dish:' + r.id, `${r.icon} ${r.name} · ${needsText(r)}${dishCount(r.id) ? ` (have ${dishCount(r.id)})` : ''}`, !canCook(r))).join('');
}
function cookDish(id) {
  const r = recipeDef(id);
  if (!r) return '';
  if (!canCook(r)) { sfx('tie'); return `You need ${needsText(r)} for ${r.name}. ${pantryLine()}`; }
  Object.keys(r.needs).forEach(k => useIngredient(k, r.needs[k]));
  dishes()[id] = dishCount(id) + 1;
  (state.progress.recipesMade || (state.progress.recipesMade = {}))[id] = true;      // the Almanac's Recipes page
  bumpStat('dishesCooked', 1);
  logEvent(r.icon, `Cooked ${r.name} with ${CAST.baker.name}.`);
  saveState(); sfx('claim'); buzz(HAP.found); toast(`${r.icon} ${r.name} is ready`);
  return `${r.icon} ${r.name}! ${r.desc} ${pantryLine()}`;
}
// The dish a neighbor would most like: the one worth the most friendship.
function bestGiftDish() { return RECIPES.filter(r => dishCount(r.id) > 0 && r.gift).sort((a, b) => b.gift - a.gift)[0] || null; }
// Battle snacks, offered on the keep-this-hand screen.
function snackDishes() { return RECIPES.filter(r => r.battle && dishCount(r.id) > 0); }

/* ---------------- Saffron's spice stall: one deal a day, the same for everyone that day ---------------- */
function spiceDeal() {
  const d = spiceDealBase();
  if (eventIs('market-day')) d.price = Math.round(d.price * 0.8);
  return d;
}
function spiceDealBase() {
  const rnd = seeded('spice-' + todayKey());
  if (rnd() < 0.5) {
    const packs = PACKS.filter(p => ['brook', 'orchard', 'aurora', 'spellbook'].includes(p.id));
    const p = packs[Math.floor(rnd() * packs.length)];
    return { kind: 'pack', pack: p.id, price: Math.round(p.cost * 0.6), icon: p.icon, name: p.name, was: p.cost };
  }
  const rar = rnd() < 0.72 ? 'ultra' : 'super', pool = cardPool(rar), c = pool[Math.floor(rnd() * pool.length)];
  return { kind: 'card', card: c.id, price: rar === 'ultra' ? 38 : 85, icon: c.icon, name: c.name };
}
function spiceSold() { return buildingState('stall-spice').dealDay === todayKey(); }
function spiceDealLine() {
  const d = spiceDeal();
  if (spiceSold()) return "Today's deal is sold. Come back tomorrow for a new one.";
  if (d.kind === 'pack') return `Today: a ${d.icon} ${d.name} for 🫧 ${d.price} instead of ${d.was}.`;
  const def = cardDef(d.card);
  return `Today: ${def.icon} ${def.name}, ${RARITY_LABEL[def.rarity]} (${def.spell ? spellText(def) : `⚔${def.power} ♥${def.grit}${def.kw.length ? ' ' + kwIcons(def) : ''}`}), for 🫧 ${d.price}.`;
}
function spiceDealView() {
  if (spiceSold()) return { label: '✅ Sold out until tomorrow', disabled: true };
  const d = spiceDeal();
  return { label: `🌶️ Buy today's deal: ${d.icon} ${d.name} · 🫧 ${d.price}` };
}
function spiceDealAction() {
  if (spiceSold()) return `Today's deal is gone. ${CAST.spiceSeller.name} is already dreaming up tomorrow's.`;
  const d = spiceDeal();
  if (state.progress.pebbles < d.price) { sfx('tie'); return `${CAST.spiceSeller.name} taps the sign. "🫧 ${d.price}, friend. Come back when your pockets jingle."`; }
  buildingState('stall-spice').dealDay = todayKey();
  if (d.kind === 'pack') { buyPack(d.pack, d.price); return `${CAST.spiceSeller.name} wraps the pack in brown paper. "A bargain, and you know it."`; }
  spendPebbles(d.price, 'spice-deal');
  const isNew = !discoveredSet().has(d.card);
  state.ownedCards.push(d.card); noteCardsFound(1);
  logEvent('🌶️', `Bought ${cardDef(d.card).name} from ${CAST.spiceSeller.name}'s deal for 🫧 ${d.price}.`);
  saveState(); updateHud(); bumpPill('pillCards'); bumpPill('pillPebbles');
  showCardReveal(d.card, `${CAST.spiceSeller.name}'s deal`, true);
  if (isNew) toast('📖 New entry in your Index');
  return `${CAST.spiceSeller.name} slides the card across the counter with a wink.`;
}

/* ---------------- Tock's bait counter (replaced the sleeves, which now live only in Zeph's Card Shop) ----------------
   Bait is bought straight into the pantry, where fishing already reads it (js/fishing.js BAITS: daisies and fish), so the
   fishing code did not change. Night bugs are not sold on purpose: Lumen buys bugs back, so selling them would be a free
   Ember loop. The pantry holds PANTRY_MAX of each, which is also the cap on how much you can stock up. */
const BAIT_STOCK = [
  { id: 'daisy', icon: '🌼', name: 'Daisy bunch', give: { flowers: 4 }, cost: 8 },
  { id: 'fish',  icon: '🐟', name: 'Fresh fish',  give: { fish: 3 },    cost: 15 },
  { id: 'mix',   icon: '🧺', name: "Angler's mix", give: { flowers: 2, fish: 2 }, cost: 14 },
];
function baitHaveLine() { return `You have 🌼 ${ingredientCount('flowers')} and 🐟 ${ingredientCount('fish')} for bait.`; }
function baitButtons() {
  return BAIT_STOCK.map(b => {
    const ks = Object.keys(b.give), parts = ks.map(k => `${ks.length > 1 ? INGREDIENTS[k].icon : ''}×${b.give[k]}`).join(' ');   // the icon is only needed when a bundle holds two things
    return sceneBtn('bait:' + b.id, `${b.icon} ${b.name} ${parts} · 🫧 ${b.cost}`, false);
  }).join('');
}
function baitAction(id) {
  const b = BAIT_STOCK.find(x => x.id === id);
  if (!b) return '';
  if (Object.keys(b.give).every(k => ingredientCount(k) >= PANTRY_MAX)) { sfx('tie'); return `"Your pantry is already full of those," says ${CAST.tinker.name}. ${baitHaveLine()}`; }
  if (state.progress.pebbles < b.cost) { sfx('tie'); return `"That one's 🫧 ${b.cost}," says ${CAST.tinker.name}, tying a hook anyway.`; }
  spendPebbles(b.cost, 'bait');
  Object.keys(b.give).forEach(k => addIngredient(k, b.give[k]));
  logEvent('🎣', `Bought ${b.name} from ${CAST.tinker.name} for 🫧 ${b.cost}.`);
  saveState(); updateHud(); bumpPill('pillPebbles'); sfx('claim'); buzz(HAP.found);
  return `${b.icon} ${CAST.tinker.name} wraps it up. ${baitHaveLine()}`;
}

// SLEEVES: in content/items.js (the game's words and data, kept apart from the code)
function ensureSleeves() { const ch = state.character; if (!Array.isArray(ch.unlockedSleeves)) ch.unlockedSleeves = ['']; if (typeof ch.sleeve !== 'string') ch.sleeve = ''; return ch; }
function currentSleeve() { const id = ensureSleeves().sleeve; return SLEEVES.find(s => s.id === id) || SLEEVES[0]; }
function sleeveChip(s) { return `<span class="sleeve-chip${s.id ? ' sleeve-' + s.id : ''}"><span class="sleeve-fx"></span></span>`; }
// A grid of big card-back previews (build 96), in the same sheet as every other building screen. Each tile still carries
// data-act="sleeve:<id>", so the scene's one click handler (and sleeveAction) work exactly as they did with the old rows.
function sleeveButtons() {
  const ch = ensureSleeves(), peb = state.progress.pebbles;
  return '<div class="sl-grid">' + SLEEVES.map(s => {
    const owned = ch.unlockedSleeves.includes(s.id), worn = ch.sleeve === s.id;
    const status = worn ? '<span class="sl-status worn">✓ Wearing</span>' : owned ? '<span class="sl-status">Wear</span>' : `<span class="sl-status price${peb < s.cost ? ' short' : ''}">🫧 ${s.cost}</span>`;
    return `<button type="button" class="sl-tile${worn ? ' worn' : ''}${owned ? '' : ' locked'}" data-act="sleeve:${s.id}" aria-label="${s.name}${worn ? ', wearing' : owned ? ', wear' : ', buy for ' + s.cost + ` ${GAME.currency.many}`}" aria-pressed="${worn}">
      <span class="sl-card"><span class="sleeve-chip${s.id ? ' sleeve-' + s.id : ''}"><span class="sleeve-fx"></span></span><span class="sl-mark">${s.id ? s.icon : ''}</span></span>
      <span class="sl-name">${s.name}</span>${status}</button>`;
  }).join('') + '</div>';
}
function sleeveAction(id) {
  const ch = ensureSleeves(), s = SLEEVES.find(x => x.id === id);
  if (!s) return '';
  if (!ch.unlockedSleeves.includes(s.id)) {
    if (state.progress.pebbles < s.cost) { sfx('tie'); return `"That one's 🫧 ${s.cost}," says ${scene && INTERIORS[scene.id] ? INTERIORS[scene.id].name : CAST.tinker.name}, polishing it anyway.`; }
    spendPebbles(s.cost, 'sleeves'); ch.unlockedSleeves.push(s.id);
    logEvent('🎴', `Bought the ${s.name} card sleeve for 🫧 ${s.cost}.`);
    bumpPill('pillPebbles'); sfx('claim'); buzz(HAP.found);
  } else sfx('tap');
  ch.sleeve = s.id; saveState(); updateHud();
  return s.id ? `Your cards slip into ${s.name} sleeves. ${s.icon} Very smart.` : 'Back to plain sleeves. Classic.';
}
const CELLAR = {
  cooldownMs: 5 * 60 * 1000,
  floors: [
    { name: 'Cellar Rats', icon: '🐀', theme: 'swarm', pebbles: 2, profile: { level: 'gentle', spirit: 15 }, blurb: 'Something small and quick scurries between the barrels.' },
    { name: 'The Stone Wall', icon: '🧱', theme: 'wall', pebbles: 4, profile: { level: 'normal', spirit: 16 }, blurb: 'A slow, stubborn guardian fills the whole passage.' },
    { name: 'The Root Keeper', icon: '🌳', theme: 'grove', pebbles: 7, final: true, profile: { level: 'normal', spirit: 18 }, blurb: 'Roots as thick as your arm coil around an old chest.' },
  ],
};
// The three shallow floors climb the foe tiers (see buildDeckForOpponent): unique foe cards and enhanced "+" cards, more of them each floor.
function themedDeck(theme, floor) {
  const pools = {
    swarm: ['origami-crane', 'origami-crane', 'flintstone', 'flintstone', 'sprout', 'sprout', 'feather', 'feather', 'gale', 'firefly', 'droplet', 'toadstool', 'tide'],
    wall:  ['pebble', 'pebble', 'geode', 'geode', 'torii-gate', 'torii-gate', 'bubble', 'bubble', 'jade-turtle', 'moonstone', 'droplet', 'toadstool', 'ember-fox'],
    grove: ['firefly', 'firefly', 'blossom', 'blossom', 'foxglove', 'foxglove', 'droplet', 'droplet', 'aurora-stag', 'deep-current', 'mountain-heart', 'dove', 'ember-fox'],
  };
  const counts = {}; pools[theme].forEach(id => { counts[id] = Math.min(MAX_COPIES, (counts[id] || 0) + 1); });
  return foeEnhanceDeck(BattleEngine.suggestDeck(counts), Math.max(1, Math.min(2, floor || 0)), 'cellar-' + theme);
}
/* ---------------- the deep: past the Root Keeper the cellar keeps going, one harder floor at a time ----------------
   Floors 1-3 are the old hand-made floors (a loss there costs nothing, retry as often as you like). From floor 4 on
   it is a run: a loss, a yield or climbing back up ends it, the cellar rests, and your deepest floor is kept as a record.
   Every 5th floor is a guardian that can drop one of the cellar's own cards, found nowhere else. */
const DEEP_FOES = [
  { name: 'Cave Bats',       icon: '🦇', kw: 'swift',  blurb: 'Leathery wings flutter somewhere in the dark.' },
  { name: 'The Web Weaver',  icon: '🕷️', kw: 'guard',  blurb: 'Silver threads stretch from wall to wall.' },
  { name: 'Tunnel Snake',    icon: '🐍', kw: 'echo',   blurb: 'A long hiss echoes down the tunnel.' },
  { name: 'Glowworm Swarm',  icon: '🪱', kw: 'bloom',  blurb: 'Tiny lights pulse on the ceiling, growing brighter.' },
  { name: 'Old Bones',       icon: '💀', kw: 'shield', blurb: 'Something rattles in a heap of dust.' },
];
const DEEP_GUARDIANS = [
  { name: 'The Watcher Below', icon: '👁️', kw: 'guard', cards: ['watcher-eye', 'candle-wraith', 'watcher-eye', 'candle-wraith'], blurb: 'One great eye opens in the rock and follows you.' },
  { name: 'The Forgotten Wyrm',     icon: '🐉', kw: 'bloom', cards: ['hollow-king', 'deep-wyrm', 'deep-wyrm'], blurb: 'The floor trembles. Something very large is breathing.' },
];
// The prizes only the deep gives up, handed out by guardians in this order (then at random once you have them all).
const CELLAR_PRIZES = ['glowworm', 'echo-cavern', 'deep-wyrm'].concat(WORLD_CARDS.cellar);
function isDeepFloor(i) { return i >= CELLAR.floors.length; }
function cellarFloor(i) {
  if (!isDeepFloor(i)) return CELLAR.floors[i];
  const n = i + 1, depth = i - CELLAR.floors.length + 1, guardian = n % 5 === 0;
  const f = guardian ? DEEP_GUARDIANS[(n / 5 - 1) % DEEP_GUARDIANS.length] : DEEP_FOES[(i - CELLAR.floors.length) % DEEP_FOES.length];
  return Object.assign({}, f, { deep: true, depth, guardian, pebbles: (5 + depth + (guardian ? 8 : 0)) * (eventIs('cellar-night') ? 2 : 1),
    profile: { level: depth >= 6 ? 'smart' : 'normal', spirit: Math.min(30, 16 + Math.ceil(depth * 0.8) + (guardian ? 2 : 0)) } });
}
// A deep deck gets rarer with depth and leans on the floor's keyword.
function deepDeck(fl) {
  const d = fl.depth, pool = BASE_COMMONS.slice();
  const rar = () => { const r = Math.random() * (10 + d * 2); return r < 10 - d ? 'rare' : r < 14 ? 'ultra' : r < 17 + d * 0.4 ? 'super' : 'mythic'; };
  for (let i = 0; i < 14 + Math.min(10, d); i++) {
    const cands = cardPool(rar()).filter(c => !c.spell);
    const themed = cands.filter(c => c.kw.includes(fl.kw));
    const src = themed.length && Math.random() < 0.6 ? themed : cands;
    pool.push(src[Math.floor(Math.random() * src.length)].id);
  }
  const counts = {}; pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  // Depth adds more unique foe cards and more enhanced "+" cards, with extra keywords becoming likelier.
  const deck = foeEnhanceDeck(BattleEngine.suggestDeck(counts), 4, fl.name,
    { foeCount: Math.min(2, 1 + Math.floor(d / 5)), enhanced: Math.min(5, 1 + Math.floor(d / 2)), skill: Math.min(0.5, 0.2 + d * 0.03) });
  return fl.cards ? swapInCards(deck, fl.cards) : deck;   // a guardian fields the cards it drops
}
const CELLAR_HOME = 'square';   // the cellar's door is in the first district; the run's state lives there even while you are down in the cellar's own world
function cellarState() {
  const hd = ensureDistrictData(CELLAR_HOME), st = hd.buildings.cellar || (hd.buildings.cellar = {});
  if (typeof st.floor !== 'number') st.floor = 0;
  if (typeof st.best !== 'number') st.best = 0;
  // a save from before the Descent Map (js/cellar-run.js) that is mid-climb gets a run at its current floor
  if (!st.run && st.floor > 0 && !st.clearedAt && !st.resting && typeof cellarNewRun === 'function') cellarNewRun(st);
  // an older save "rested" by sitting on floor 3 with clearedAt set; the rest now has its own flag
  if (st.clearedAt && !st.resting && st.floor >= CELLAR.floors.length && !st.inRun) st.resting = true;
  if (st.resting && Date.now() - (st.clearedAt || 0) >= CELLAR.cooldownMs) { st.floor = 0; st.clearedAt = null; st.resting = false; st.inRun = false; }
  return st;
}
// Ends a deep run: the cellar rests, the record stays.
function endCellarRun(st, reason) {
  const reached = st.floor;                                // floors cleared this run
  st.run = null; st.inRun = false;
  // a short run costs nothing (start again at once); from three floors on the cellar rests for a few minutes
  if (reached >= CELLAR.floors.length) { st.resting = true; st.clearedAt = Date.now(); logEvent('🕳️', `Climbed out of the cellar after clearing floor ${reached}${reason ? ' (' + reason + ')' : ''}.`); }
  else { st.floor = 0; st.resting = false; st.clearedAt = null; }
  saveState();
}
function cellarBest() { return Math.max(state.progress.cellarBest || 0, cellarState().best || 0); }
function deckAdvice() {
  const d = state.deck.map(cardDef).filter(Boolean);
  if (d.length < DECK_SIZE) return `Your deck holds ${d.length} of ${DECK_SIZE} cards. Fill it in Cards → Deck first, then we can talk shape.`;
  const cheap = d.filter(c => c.cost <= 2).length, avg = d.reduce((n, c) => n + c.cost, 0) / d.length;
  const has = k => d.filter(c => c.kw.includes(k)).length;
  if (cheap < 4) return `Only ${cheap} of your cards cost 1 or 2. Your first turns will feel slow. Try to have at least 5 cheap cards.`;
  if (avg > 3) return `Your average cost is ${avg.toFixed(1)}, which is heavy. Strong cards do nothing sitting in your hand. Swap one expensive card for a cheap one.`;
  if (has('guard') === 0) return 'Not one Watch in the whole deck. Enemies will hit your Calm as they please. One or two Watch cards buy you time.';
  if (d.filter(c => c.cost >= 4).length === 0) return 'A tidy, cheap deck, but nothing to finish with. One big card at cost 4 or 5 gives you something to build toward.';
  return `That is a well-shaped deck: ${cheap} cheap cards, average cost ${avg.toFixed(1)}, and ${has('guard') + has('shield')} defenders. I would not change much.`;
}

/* ---------------- the scene screen ---------------- */
const SCENE_TIPS = { bakery: 'bakery', house2: 'garden' };
/* ---------- door fade ----------
   Going into (or out of) a building covers the screen with a quick fade to the page colour, swaps the screens while
   it's covered, then fades back, the same idea as the district travel card but shorter. While it runs, further taps
   on the same trigger are ignored. With motion off (reduced motion) the swap just happens at once. */
let doorFading = false;
function withDoorFade(swap, inMs, outMs) {
  inMs = inMs || 190; outMs = outMs || 280;      // a battle's exit passes longer ones (see closeBattle)
  if (doorFading) return;
  if (!btMotionOk()) { swap(); return; }
  doorFading = true;
  const v = document.createElement('div'); v.className = 'door-fade'; document.body.appendChild(v);
  v.style.transition = `opacity ${inMs}ms ease-in-out`;
  requestAnimationFrame(() => v.classList.add('on'));
  setTimeout(() => {
    try { swap(); } finally {
      v.style.transition = `opacity ${outMs}ms ease-in-out`;
      v.classList.remove('on');
      setTimeout(() => { v.remove(); doorFading = false; }, outMs);
    }
  }, inMs);
}
// Town taps use this: fade in. Code that opens a scene as part of something bigger (travel, the shop button) calls openScene directly.
function openSceneFx(id) { if (typeof pfxEnter === 'function' && pfxEnter(() => withDoorFade(() => openScene(id)))) return; withDoorFade(() => openScene(id)); }   // pfxEnter (js/player-fx.js) burns the figure away first
function sceneEnterFx() {
  sceneView.classList.remove('scene-enter'); void sceneView.offsetWidth; sceneView.classList.add('scene-enter');
  setTimeout(() => sceneView.classList.remove('scene-enter'), 900);
}
/* The Character > Look "Shop" button: walk the player to the Card Shop (El Mercado de Susurros) and open its Customize counter. Until
   El Mercado de Susurros is open, the Shop tab does the same job. */
function goToCardShop() {
  if (inBattle || doorFading) return;
  sfx('nav'); buzz(HAP.tap);
  if (!districtUnlocked('market')) { switchTab('shop'); setShopView('customize'); toast(`The Card Shop is in ${PLACES.market} - until it opens, this is its shop window`); return; }
  const enter = () => { if (state.currentDistrict !== 'market') travelToDistrictNow('market'); else switchTab('town'); openScene('card-shop'); sceneAction('customize'); };
  if (state.currentDistrict !== 'market') withTravelTransition('market', enter); else withDoorFade(enter);
}
function openScene(id) {
  if (id === 'cellar' && typeof cellarWorldEnter === 'function') { cellarWorldEnter(); return; }   // the cellar is a world you walk through now (js/cellar-world.js)
  if (typeof camRelease === 'function') camRelease();   // a dragged town camera is for the street, not for what is inside / the match
  cancelWalk(); if (typeof noteVisit === 'function') noteVisit(id);
  if (SCENE_TIPS[id]) showTipOnce(SCENE_TIPS[id]);
  inScene = true; scene = { id, text: '' }; sceneView.classList.remove('scene-leaving');
  townPanel.classList.add('hidden'); document.getElementById('bottomNav').style.display = 'none';
  document.body.classList.add('in-scene'); sceneView.classList.remove('hidden'); sceneEnterFx();
  if (id === 'cup') { scene.text = cupIntro(); showTipOnce('cup'); }
  else if (id === 'trades') { scene.text = `Neighbors pin up offers here each morning. Only spare copies can be traded. ${forecastText()}`; showTipOnce('trades'); }
  else if (id === 'home') { const g = INTERIORS.home.greet; scene.text = g(); showTipOnce('home'); }
  else { const g = INTERIORS[id].greet; scene.text = typeof g === 'function' ? g() : g; }
  renderScene();
}
/* The Card Shop's Packs / Customize / Items screens are the same views the Shop panel uses (renderPacks,
   renderCustomize, renderItems draw into #packsView, #customizeView, #itemsView by id). While the Card Shop scene
   is in one of those modes we simply move that element into the scene, so the player never leaves the shop counter;
   leaving the mode puts them back in #shopPanel, where the profile menu's "Visit shop" and the Embers fallback
   still find them. */
const CARD_SHOP_MODES = ['packs', 'customize', 'items'];
function shopModeActive(view) { return !!(inScene && scene && scene.id === 'card-shop' && (view ? scene.mode === view : CARD_SHOP_MODES.includes(scene.mode))); }
function mountShopView(view) {
  const panel = document.getElementById('shopPanel'), host = document.getElementById('scShopHost');
  ['packsView', 'customizeView', 'itemsView'].forEach(id => { const el = document.getElementById(id); if (el && el.parentElement !== panel) panel.appendChild(el); });   // always park them home first
  sceneView.classList.toggle('shop-mode', !!view);
  if (!view) { host.classList.add('hidden'); return; }
  host.classList.remove('hidden');
  host.appendChild(document.getElementById(view + 'View'));
  setShopView(view);
}
function closeScene() {
  if (typeof bakeryScreenHide === 'function') bakeryScreenHide();
  if (typeof spiceScreenHide === 'function') spiceScreenHide();
  hrLeave();                                          // js/home-room.js: put the cottage room away
  mountShopView(null);
  miniStop();
  inScene = false; scene = null; if (typeof memory !== 'undefined') { memory = null; memoryLeaveStage(); }
  sceneView.classList.add('hidden'); sceneView.classList.remove('scene-leaving', 'scene-enter', 'sc-std');
  townPanel.classList.remove('hidden'); document.getElementById('bottomNav').style.display = '';
  document.body.classList.remove('in-scene');
  if (typeof pfxReform === 'function') pfxReform();   // the figure re-forms in blue sparks if she burned away on the way in
  townLog.textContent = 'You step back outside.';
  renderTown(); updateHud();
}
/* ---------------- your cottage: shelves, framed cards, trophies and the mailbox ---------------- */
const SHELF_MAX = 6, FAV_MAX = 3;
function homeState() {
  const p = state.progress; if (!p.home || typeof p.home !== 'object') p.home = { shelf: [], favs: [] };
  if (!Array.isArray(p.home.shelf)) p.home.shelf = []; if (!Array.isArray(p.home.favs)) p.home.favs = [];   // however the home was saved, these always exist
  return p.home;
}
// Everything you have earned that deserves a spot on the top shelf.
function trophyItems() {
  const out = trophies().map(t => ({ icon: '🏆', label: `${t.icon} ${t.name}` }));
  const best = state.progress.cellarBest || 0;
  if (best >= 5) out.push({ icon: '🕯️', label: `Cellar floor ${best}` });
  if (state.progress.rival && state.progress.rival.chapter >= RIVAL.chapters) out.push({ icon: '🎭', label: `${CAST.rival.name}'s respect` });
  const fs = state.progress.fishing;
  if (fs && fs.caught && fs.caught['star-koi']) out.push({ icon: '🌟', label: 'Starlight Koi' });
  else if (fs && fs.best && fishDef(fs.best)) out.push({ icon: fishDef(fs.best).icon, label: `Best catch: ${fishDef(fs.best).name}` });
  const bs = state.progress.bugs;
  if (bs && bs.caught && bs.caught.starwing) out.push({ icon: '💫', label: 'Starwing' });
  return out;
}
function renderHomeShelf() {
  const stage = document.getElementById('scStage');
  let el = document.getElementById('homeShelf');
  stage.classList.toggle('is-home', !!(scene && scene.id === 'home'));
  if (!scene || scene.id !== 'home') { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'homeShelf'; el.className = 'home-shelf'; stage.appendChild(el); }
  const h = homeState(), tr = trophyItems();
  const favs = h.favs.map(cardDef).filter(Boolean);
  el.innerHTML = `<div class="hs-frames">${favs.map(d => `<span class="hs-frame rarity-${d.rarity}" title="${escapeHtml(d.name)}">${d.icon}</span>`).join('')}</div>
    <div class="hs-shelf top">${tr.slice(0, 6).map(t => `<span title="${escapeHtml(t.label)}">${t.icon}</span>`).join('') || '<small>trophies go here</small>'}</div>
    <div class="hs-shelf">${h.shelf.map(id => { const d = DECORATION_ITEMS.find(x => x.id === id); return d ? `<span title="${escapeHtml(d.name)}">${d.icon}</span>` : ''; }).join('') || '<small>decorations go here</small>'}</div>`;
}
function shelfButtons() {
  const h = homeState(), full = h.shelf.length >= SHELF_MAX;
  const own = DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0);
  return own.map(d => sceneBtn('shelf:' + d.id, `${d.icon} Put a ${d.name} on the shelf (${decorationInventoryCount(d.id)})`, full)).join('') +
    (own.length ? '' : sceneBtn('shelf:none', 'No decorations in storage - buy some at the Card Shop → Items', true)) +
    sceneBtn('shelf:clear', `📦 Clear the shelves (${h.shelf.length}/${SHELF_MAX})`, !h.shelf.length);
}
function shelfAction(id) {
  const h = homeState();
  if (id === 'clear') { h.shelf.forEach(x => { state.decorationInventory[x] = decorationInventoryCount(x) + 1; }); h.shelf = []; saveState(); sfx('tap'); return 'You pack everything back into storage.'; }
  const d = DECORATION_ITEMS.find(x => x.id === id);
  if (!d || decorationInventoryCount(id) <= 0 || h.shelf.length >= SHELF_MAX) return 'The shelves are full.';
  state.decorationInventory[id]--; h.shelf.push(id); saveState(); sfx('claim');
  return `${d.icon} The ${d.name} looks right at home.`;
}
function favButtons() {
  const h = homeState(), ids = [...new Set(state.ownedCards.map(id => BattleEngine.baseIdOf(id)))].filter(id => cardDef(id))
    .sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity) || cardDef(b).power - cardDef(a).power);
  const shown = [...new Set(h.favs.concat(ids))].slice(0, 12);
  const frames = `<div class="fav-slots">${Array.from({ length: FAV_MAX }, (_, i) => `<span class="${h.favs[i] ? 'on' : ''}">${h.favs[i] ? cardDef(h.favs[i]).icon : '+'}</span>`).join('')}<b>${h.favs.length} of ${FAV_MAX} framed</b></div>`;
  return frames + shown.map(id => { const d = cardDef(id), on = h.favs.includes(id); return sceneBtn('fav:' + id, `${on ? '⭐' : '☆'} ${d.icon} ${d.name} <small>${RARITY_LABEL[d.rarity]}</small>`); }).join('');
}
function toggleFav(id) {
  const h = homeState(), d = cardDef(id);
  if (!d) return '';
  if (h.favs.includes(id)) { h.favs = h.favs.filter(x => x !== id); saveState(); sfx('tap'); return `${d.name} comes down off the wall.`; }
  if (h.favs.length >= FAV_MAX) return `Only ${FAV_MAX} frames on the wall. Take one down first.`;
  h.favs.push(id); saveState(); sfx('claim');
  return `${d.icon} ${d.name} gets a frame of its own.`;
}
function trophySummary() {
  const tr = trophyItems(), r = state.progress.record;
  const lines = tr.map(t => `${t.icon} ${t.label}`);
  if (r) lines.push(`⚔️ ${r.won} matches won (best streak ${r.best})`);
  if (miniGoldCount()) lines.push(`🥇 gold in ${miniGoldCount()} of ${Object.keys(MINIGAMES).length} house games`);
  const pz = state.progress.puzzle; if (pz && pz.solved) lines.push(`🧩 ${pz.solved} puzzle${pz.solved === 1 ? '' : 's'} solved`);
  const foilTotal = Object.values(foils()).reduce((a, b) => a + b, 0); if (foilTotal) lines.push(`✨ ${foilTotal} Reborn shimmering in your collection`);
  return lines.length ? lines.join(' · ') : `The trophy case is empty for now. Win the ${GAME.player.many}’ Cup, go deep in the cellar, or land a legendary catch.`;
}

// ROOK_LETTERS: in content/dialogue.js (the game's words and data, kept apart from the code)
const FRIEND_NOTES = [
  'Thank you for being such a good neighbor. I found this and thought of you.',
  'The town feels friendlier with you in it. A little something, just because.',
  `I tried to bake like ${CAST.baker.name}. It did not go well. Here is something better instead.`,
  'Saw you playing cards by the fountain the other day. You make it look easy!',
];
function mailState() { const p = state.progress; if (!p.mail || typeof p.mail !== 'object') p.mail = { list: [], sent: {}, friendDay: null }; return p.mail; }
function unreadMail() { return mailState().list.filter(l => !l.read).length; }
function sendLetter(key, L) {
  const ms = mailState();
  if (ms.sent[key]) return false;
  ms.sent[key] = true;
  ms.list.unshift(Object.assign({ id: key, at: Date.now(), read: false, claimed: false }, L));
  if (ms.list.length > 40) ms.list.length = 40;
  toast(`📬 A letter from ${L.from} - read it at home`);
  logEvent('📬', `A letter arrived from ${L.from}: "${L.subject}".`);
  saveState();
  return true;
}
function giftText(g) {
  if (!g) return '';
  if (g.kind === 'pebbles') return `🫧 ${g.n} ${GAME.currency.many}`;
  if (g.kind === 'seed') return `${seedDef(g.id).icon} a ${seedDef(g.id).name} seed`;
  if (g.kind === 'ingredient') return `${INGREDIENTS[g.id].icon} ${g.n} × ${INGREDIENTS[g.id].name}`;
  if (g.kind === 'bread') return '🍞 a loaf of bread';
  if (g.kind === 'card') return `a ${RARITY_LABEL[g.rarity]} card`;
  return '';
}
let mailCheckedAt = 0;
function checkMail(force) {
  if (!force && Date.now() - mailCheckedAt < 20000) return;
  mailCheckedAt = Date.now();
  const t = state.progress.totals, ms = mailState();
  sendLetter('welcome-home', { from: CAST.guide.name, icon: CAST.guide.icon, subject: 'Your cottage', gift: { kind: 'pebbles', n: 5 },
    body: 'The little cottage beside the Reading Nook is yours now, dear. Put a few things on the shelves, frame your favourite cards, and check the mailbox now and then - the neighbors like to write.' });
  if ((t.breadBaked || 0) >= 1) sendLetter('maple-cook', { from: CAST.baker.name, icon: CAST.baker.icon, subject: 'Cooking lessons', gift: { kind: 'bread', n: 1 },
    body: 'Bread is only the start! Bring me what you grow and what you catch, and we will cook something special together. Pumpkin Pie is my favourite, if you are wondering what to give me.' });
  if ((t.cropsHarvested || 0) >= 1) sendLetter('fern-seeds', { from: CAST.gardener.name, icon: CAST.gardener.icon, subject: 'A little something for the garden', gift: { kind: 'seed', id: 'moonbean' },
    body: `Your first harvest! Here is a Moonbean for you - they are hard to come by. You can find more hiding in ${PLACES.garden} grass, if you look closely.` });
  if ((t.puzzlesSolved || 0) >= 1) sendLetter('olwen-puzzle', { from: CAST.scholar.name, icon: CAST.scholar.icon, subject: 'Well puzzled', gift: { kind: 'pebbles', n: 4 },
    body: 'I watched you work through my puzzle. Most people just attack everything and hope. You thought about it. There will be a new board tomorrow.' });
  const rv = state.progress.rival;
  if (rv) for (let c = 1; c <= Math.min(rv.chapter || 0, RIVAL.chapters); c++)
    sendLetter('rook-' + c, { from: CAST.rival.name, icon: CAST.rival.icon, subject: c === RIVAL.chapters ? 'Thank you' : `About our match (${c}/${RIVAL.chapters})`, body: ROOK_LETTERS[c - 1], gift: c < RIVAL.chapters ? { kind: 'pebbles', n: 5 } : null });
  if ((t.battlesWon || 0) >= 1) sendLetter('cup-' + cupWeek(), { from: 'The Festival Committee', icon: '🎪', subject: `The ${cupName()} is on!`,
    body: `This week's ${cupName()} is open at the fountain in ${PLACES.square}. Three matches, no healing in between, and a trophy for anyone who sweeps them all. Good luck!` });
  if ((state.progress.level || 1) >= 2) sendLetter('lumen-night', { from: CAST.nightVendor.name, icon: CAST.nightVendor.icon, subject: 'After dark', gift: null,
    body: `When the lamps come on, look for my lanterns in ${PLACES.market}. I trade in night things: rare packs, glowing trinkets, and whatever critters you catch in a jar.` });
  // a friend's note, at most one a day
  if (ms.friendDay !== todayKey()) {
    ms.friendDay = todayKey();
    const close = Object.values(friendsState()).filter(f => heartsFor(f.points) >= 2);
    if (close.length && Math.random() < 0.6) {
      const f = close[Math.floor(Math.random() * close.length)];
      const gifts = [{ kind: 'pebbles', n: 4 }, { kind: 'seed', id: 'daisy' }, { kind: 'ingredient', id: 'flowers', n: 2 }, { kind: 'bread', n: 1 }];
      sendLetter('friend-' + todayKey(), { from: f.name, icon: f.icon || '💌', subject: 'A note from a friend', body: FRIEND_NOTES[Math.floor(Math.random() * FRIEND_NOTES.length)], gift: gifts[Math.floor(Math.random() * gifts.length)] });
    }
  }
}
// The mailbox is a list of expandable cards (see renderMailList) rather than a flat list of buttons whose
// body text showed up disconnected, in the scene bubble above - scene.mailOpen (reset fresh every time the
// mailbox is opened, never saved) tracks which cards are currently expanded.
function mailSortKey(l) { return (l.gift && !l.claimed) ? 0 : (!l.read ? 1 : 2); }
function renderMailList() {
  const list = mailState().list;
  if (!list.length) return '<div class="panel-desc">Nothing yet. Neighbors write once they get to know you.</div>';
  if (!scene.mailOpen) scene.mailOpen = {};
  // Actionable letters float to the top - gifts still waiting, then unread, then everything else - same
  // idea as sorting claimable quests to the top of Dailies/Weekly.
  const sorted = list.slice(0, 40).map((l, i) => ({ l, i })).sort((a, b) => mailSortKey(a.l) - mailSortKey(b.l) || a.i - b.i);
  // Two groups so the eye lands on what needs doing: gifts to claim and unread letters first, then the rest.
  const isNew = l => (l.gift && !l.claimed) || !l.read, nNew = sorted.filter(x => isNew(x.l)).length;
  const item = l => {
    const open = !!scene.mailOpen[l.id], hasGift = l.gift && !l.claimed;
    return `<div class="panel-item mail-item${l.read ? '' : ' unread'}${open ? ' open' : ''}" data-act="toggle:${l.id}">
      <span class="mail-ava">${l.icon}${!l.read ? '<i class="mail-dot"></i>' : ''}</span>
      <span class="panel-text">
        <div class="panel-name">${escapeHtml(l.subject)}</div>
        <div class="panel-desc">from ${escapeHtml(l.from)} · ${fmtLogTime(l.at)}</div>
        ${open ? `<div class="mail-body">${escapeHtml(l.body)}</div>
          <div class="mail-item-actions">
            ${hasGift ? `<button class="btn mail-claim-btn" data-act="claim:${l.id}">🎁 Take the gift: ${giftText(l.gift)}</button>`
              : `<button class="btn btn-ghost mail-delete-btn" data-act="delete:${l.id}">🗑️ Delete</button>`}
          </div>` : ''}
      </span>
      ${hasGift ? '<span class="mail-gift">🎁 Gift</span>' : ''}
      <span class="mail-chevron">${open ? '▲' : '▼'}</span>
    </div>`;
  };
  let out = '';
  sorted.forEach(({ l }, i) => {
    if (i === 0 && nNew) out += `<div class="mail-sec">Waiting for you · ${nNew}</div>`;
    if (i === nNew && nNew < sorted.length) out += `<div class="mail-sec">Earlier</div>`;
    out += item(l);
  });
  return `<div class="panel-list mail-list">${out}</div>`;
}
function toggleMailItem(id) {
  const l = mailState().list.find(x => x.id === id);
  if (!l) return;
  if (!scene.mailOpen) scene.mailOpen = {};
  const opening = !scene.mailOpen[id];
  scene.mailOpen[id] = opening;
  if (opening && !l.read) { l.read = true; bumpStat('lettersRead', 1); saveState(); }
  sfx('flip');
  renderScene();
}
function claimLetter(id) {
  const l = mailState().list.find(x => x.id === id);
  if (!l || !l.gift || l.claimed) return;
  const g = l.gift;
  l.claimed = true; l.read = true;
  if (g.kind === 'pebbles') addPebbles(g.n, 'letters');
  else if (g.kind === 'seed') seedInv()[g.id] = seedCount(g.id) + 1;
  else if (g.kind === 'ingredient') addIngredient(g.id, g.n);
  else if (g.kind === 'bread') state.progress.bread = Math.min(BREAD_MAX, breadCount() + 1);
  else if (g.kind === 'card') { const cid = randomCardId(g.rarity); state.ownedCards.push(cid); bumpStat('cardsFound', 1); showCardReveal(cid, `A gift from ${l.from}`, true); }
  saveState(); sfx('claim'); buzz(HAP.found);
  if (g.kind !== 'card') toast(`🎁 ${giftText(g)} - thanks, ${l.from}!`);
  renderScene();
}
// Keeps a gift from being thrown away unclaimed by mistake - claim it first, then delete is offered instead.
function deleteLetter(id) {
  const ms = mailState(), l = ms.list.find(x => x.id === id);
  if (!l) return;
  if (l.gift && !l.claimed) { toast('Claim the gift first'); return; }
  askConfirm({ title: 'Delete this letter?', text: "This can't be undone.", ok: 'Delete' }, () => {
    ms.list = ms.list.filter(x => x.id !== id);
    if (scene.mailOpen) delete scene.mailOpen[id];
    saveState(); buzz(HAP.tap);
    renderScene();
  });
}

// A label like "Play: Catch the Grain · 3 prizes left today" is split at the first " · " so the storefront layout can show the
// status as a small chip on the right (labels with markup are left alone). Other layouts show it inline, see .sb-meta in the CSS.
// Sheet kit (build 206): a leading emoji becomes the row's icon tile and the title is the bold line. textContent stays what it
// was ("🌱 Seeds"), since the space is kept between the spans. `cls` adds classes (the edit panel's Done is 'sc-done').
const SB_EMOJI = /^([\p{Extended_Pictographic}☆★][\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\p{Extended_Pictographic}]*)\s+/u;
function sceneBtn(id, label, disabled, cls) {
  let inner = label;
  if (typeof label === 'string') {
    const m = label.match(SB_EMOJI), rest = m ? label.slice(m[0].length) : label;
    const i = !rest.includes('<') ? rest.indexOf(' · ') : -1;
    const main = i > 0 ? rest.slice(0, i) : rest;
    inner = (m ? `<span class="ico">${m[1]}</span> ` : '') + (m || i > 0 ? `<span class="sb-main">${main}</span>` : main) + (i > 0 ? `<span class="sb-meta">${rest.slice(i + 3)}</span>` : '');
  }
  return `<button class="btn sc-btn sc-row${cls ? ' ' + cls : ''}" data-act="${id}" ${disabled ? 'disabled' : ''}>${inner}</button>`;
}
// The top-left arrow is gone, so every scene state must offer its own way out. They all do today; this keeps it true.
const SCENE_EXIT_ACTS = ['leave', 'back', 'mg-back', 'wings-back', 'exp-cancel', 'hr-close'];   // hr-close: your cottage's Close, which stays in the house (js/home-room.js)
function renderScene() {
  renderSceneBody();
  if (typeof spiceScreenSync === 'function') spiceScreenSync();   // js/spice-screen.js: Saffron's stall, full screen
  if (typeof bakeryScreenSync === 'function') bakeryScreenSync();   // js/bakery-screen.js: Maple's kitchen, full screen, over the bakery's home view
  hrSync();                                           // js/home-room.js: your cottage is a walkable room (does nothing anywhere else)
  // The storefront layout (v1.77.0) is for the ordinary "talk to the owner" screens; mini-games, the memory game and the
  // Card Shop counter keep the compact layout because they fill the stage with their own content.
  sceneView.classList.toggle('sc-std', !!scene && !['memory-mode', 'mini-mode', 'shop-mode'].some(c => sceneView.classList.contains(c)));
  // A building (or the fountain, a sign, the lantern market) takes over the whole screen, so its way out is a plain "Leave" button at the foot
  // (build 296). The round X is for windows that sit over the town. Screens whose own exit says more ('Leave for now (the run waits)', '← Back') keep it.
  const acts = document.getElementById('scActions');
  if (scene && acts && !SCENE_EXIT_ACTS.some(a => acts.querySelector(`[data-act="${a}"]`))) acts.insertAdjacentHTML('beforeend', sceneBtn('leave', 'Leave', false, 'btn-ghost sc-leave'));
}
function renderSceneBody() {
  if (!scene) return;
  const stage = document.getElementById('scStage'), pips = document.getElementById('scPips'), acts = document.getElementById('scActions');
  document.getElementById('scText').textContent = scene.text;
  renderHomeShelf();                                  // only draws in your own cottage; clears itself anywhere else
  if (scene.id === 'cup') {
    const cs = cupState();
    sceneView.dataset.theme = 'warm';
    document.getElementById('scTitle').textContent = `🏆 The ${cupName()}`;
    document.getElementById('scWho').textContent = cs.active ? cs.foes[cs.round].icon : '🏆';
    pips.innerHTML = CUP_ROUNDS.map((r, i) => `<span class="pip ${cs.active && i < cs.round ? 'done' : (cs.active && i === cs.round ? 'now' : '')}"></span>`).join('') + (cs.trophy ? '<span class="pip-label">🏆 won this week</span>' : '');
    acts.innerHTML = scene.mode === 'chal' ? challengeButtons() : scene.mode === 'draft' ? draftButtons() : cupButtons();
    if (scene.mode === 'draft') {
      const dr = draftState();
      document.getElementById('scTitle').textContent = '🎴 The Draft Run';
      document.getElementById('scWho').textContent = dr.active && dr.stage === 'fight' ? dr.foes[dr.round].icon : '🎴';
      pips.innerHTML = DRAFT_ROUNDS.map((r, i) => `<span class="pip ${dr.active && dr.stage === 'fight' && i < dr.round ? 'done' : (dr.active && dr.stage === 'fight' && i === dr.round ? 'now' : '')}"></span>`).join('') + `<span class="pip-label">${dr.active && dr.stage === 'pick' ? `${dr.picks.length}/${DRAFT_PICKS} drafted` : dr.runsToday + ' run' + (dr.runsToday === 1 ? '' : 's') + ' today'}</span>`;
    }
  } else if (scene.id === 'trades') {
    sceneView.dataset.theme = 'warm';
    document.getElementById('scTitle').textContent = '🪧 The Trading Board';
    document.getElementById('scWho').textContent = '🪧';
    pips.innerHTML = `<span class="pip-label">New offers every morning · ${tradesState().offers.filter(o => o.done).length}/${tradesState().offers.length} traded today</span>`;
    acts.innerHTML = tradeButtons();
  } else if (mini && scene.id === mini.house) {
    // a mini-game fills the stage; the buttons below only offer another go or a way back
    const it = INTERIORS[scene.id];
    sceneView.dataset.theme = it.theme;
    document.getElementById('scTitle').textContent = `${mini.def.icon} ${mini.def.title}`;
    pips.innerHTML = '';
    acts.innerHTML = mini.done ? sceneBtn('mg-again', '🔁 Play again') + sceneBtn('mg-back', `← Back to ${it.name === 'You' ? 'your room' : it.name}`) : sceneBtn('mg-back', 'Stop playing');
    miniRender();
  } else if (scene.id === 'nook' && typeof memory !== 'undefined' && memory && !memory.done) {
    const it = INTERIORS[scene.id];
    sceneView.dataset.theme = it.theme;
    document.getElementById('scTitle').textContent = it.title;
    document.getElementById('scWho').textContent = typeof it.who === 'function' ? it.who() : it.who;
    pips.innerHTML = '';
    acts.innerHTML = '';
    renderMemoryGrid();
  } else {
    if (typeof memory !== 'undefined' && memory) { memory = null; memoryLeaveStage(); }
    const it = INTERIORS[scene.id];
    sceneView.dataset.theme = it.theme;
    document.getElementById('scTitle').textContent = it.title;
    document.getElementById('scWho').textContent = typeof it.who === 'function' ? it.who() : it.who;
    pips.innerHTML = '';
    renderHomeShelf();
    mountShopView(shopModeActive() ? scene.mode : null);
    if (shopModeActive()) acts.innerHTML = sceneBtn('back', '← Back to the counter');
    else if (scene.mode === 'sleeves') acts.innerHTML = sleeveButtons() + sceneBtn('back', '← Back to the counter');
    else if (scene.mode === 'bait') acts.innerHTML = baitButtons() + sceneBtn('back', '← Back to the counter');
    else if (scene.mode === 'seeds') acts.innerHTML = seedButtons() + sceneBtn('back', '← Back');
    else if (scene.mode === 'cook') acts.innerHTML = cookButtons() + sceneBtn('back', '← Back to the counter');
    else if (scene.mode === 'decorate') acts.innerHTML = shelfButtons() + sceneBtn('back', '← Done');
    else if (scene.mode === 'favs') acts.innerHTML = favButtons() + sceneBtn('back', '← Done');
    else if (scene.mode === 'altar') acts.innerHTML = altarButtons();
    else if (scene.mode === 'atlas-ask') acts.innerHTML = atlasAskButtons();
    else if (scene.mode === 'atlas-battle') acts.innerHTML = atlasBattleButtons();
    else if (scene.mode === 'atlas-games') acts.innerHTML = atlasGameButtons();
    else if (scene.mode === 'atlas-shop') acts.innerHTML = atlasShopButtons();
    else if (scene.mode === 'mail') {
      const ms = mailState(), gifts = ms.list.filter(l => l.gift && !l.claimed).length;
      document.getElementById('scText').textContent = ms.list.length
        ? `${ms.list.length} letter${ms.list.length === 1 ? '' : 's'}${gifts ? ` · 🎁 ${gifts} to claim` : ''}`
        : 'Nothing yet. Neighbors write once they get to know you.';
      acts.innerHTML = renderMailList() + sceneBtn('back', '← Close the mailbox');
    }
    else if (scene.mode === 'wings') acts.innerHTML = museumWingButtons() + sceneBtn('back', '← Back to the curator');
    else if (scene.mode === 'wing') acts.innerHTML = museumCardButtons(scene.wing) + sceneBtn('wings-back', '← All wings');
    else if (scene.mode === 'exped') acts.innerHTML = expedButtons();
    else if (scene.mode === 'redraw') acts.innerHTML = fortuneRedrawButtons() + sceneBtn('back', '← Back to the table');
    else if (scene.mode === 'nightdeco') acts.innerHTML = DECORATION_ITEMS.filter(d => d.night).map(d => sceneBtn('nightdeco:' + d.id, `${d.icon} ${d.name} · 🫧 ${d.cost}${decorationInventoryCount(d.id) ? ` (have ${decorationInventoryCount(d.id)})` : ''}`)).join('') + sceneBtn('back', '← Back');
    // an action may compute its own label (a timer, a sold-out deal) through view()
    else acts.innerHTML = it.actions.map(a => { const v = a.view ? a.view(a) : null; return sceneBtn(a.id, v ? v.label : a.label, v && v.disabled); }).join('');
  }
}
// `src` names where the Embers came from (or went), for the economy ledger (econNote, js/progression.js).
function addPebbles(n, src) { state.progress.pebbles += n; econNote(n, src); saveState(); updateHud(); bumpPill('pillPebbles'); if (n > 0 && typeof pfxGain === 'function') pfxGain('\uD83E\uDEE7'); }
function sceneAction(actId) {
  if (!scene) return;
  if (actId === 'leave') {
    if (doorFading || scene.leaving) return;
    sfx('nav'); buzz(HAP.tap);
    // The sheet drops away and the speech fades first, then the usual fade to the street (v1.77.0)
    if (btMotionOk() && sceneView.classList.contains('sc-std')) {
      scene.leaving = true; sceneView.classList.remove('scene-enter'); sceneView.classList.add('scene-leaving');
      setTimeout(() => withDoorFade(closeScene, 170, 260), 230);
    } else withDoorFade(closeScene);
    return;
  }
  if (actId === 'hr-close' || actId.startsWith('hr:')) { hrAction(actId); return; }   // js/home-room.js: Close, and the Decorate panel's buttons
  if (actId.startsWith('hs:')) { hsAction(actId); return; }   // js/home-spirits.js: perches, the mantel, welcoming a visiting spirit
  if (actId.startsWith('atlasq:')) { scene.text = atlasAnswer(actId.slice(7)); sfx('tap'); renderScene(); return; }
  if (actId.startsWith('atlasb:')) { const i = +actId.slice(7); if (scene.mode === 'atlas-battle' && scene.armed === i) { startAtlasBattle(i); return; } scene.armed = i; scene.text = atlasBattleText(i) + ' Tap again to begin.'; sfx('tap'); renderScene(); return; }
  if (actId.startsWith('atlasg:')) { miniStart(actId.slice(7), true); return; }
  if (actId.startsWith('atlasbuy:')) { scene.text = atlasBuy(actId.slice(9)); renderScene(); return; }
  if (actId === 'alt:open') { openAltarScreen(); return; }   // js/altar-screen.js: the candles, full screen
  if (actId.startsWith('summon:')) { scene.text = summonTap(actId.slice(7)); renderScene(); return; }
  if (actId === 'back') { scene.mode = null; sfx('nav'); renderScene(); return; }
  if (actId === 'mg-again' && mini) { miniStart(mini.id, mini.atlas); return; }
  if (actId === 'noop') return;
  if (scene.id === 'trades') { if (actId.startsWith('trade:')) { scene.text = doTrade(+actId.slice(6)); renderScene(); } return; }
  if (actId.startsWith('wing:')) { scene.mode = 'wing'; scene.wing = actId.slice(5); const w = wingDef(scene.wing); scene.text = `${w.icon} ${w.name}: ${wingProgress(w)}/${w.cards.length} donated. Complete it for 🫧 ${WING_PEBBLES}, ${WING_STARLIGHT} ${GAME.starlight.name} and a keepsake.`; sfx('tap'); renderScene(); return; }
  if (actId === 'wings-back') { scene.mode = 'wings'; scene.text = 'Which wing shall we visit?'; renderScene(); return; }
  if (actId.startsWith('donate:')) { scene.text = donateCard(actId.slice(7)); renderScene(); return; }
  if (actId.startsWith('donateall:')) { const w = wingDef(actId.slice(10)); let last = ''; w.cards.filter(canDonate).forEach(id => { last = donateCard(id); }); scene.text = last; renderScene(); return; }
  if (actId.startsWith('exp-')) { scene.text = expedAction(actId) || scene.text; renderScene(); return; }
  if (actId === 'mg-back') { miniStop(); const g = INTERIORS[scene.id].greet; scene.text = typeof g === 'function' ? g() : g; sfx('nav'); renderScene(); return; }
  if (scene.id === 'cup') { cupAction(actId); return; }
  if (actId.startsWith('redraw:')) { scene.text = tarotRedraw(+actId.slice(7)); scene.mode = null; renderScene(); return; }
  if (actId.startsWith('bait:')) { scene.text = baitAction(actId.slice(5)); renderScene(); return; }
  if (actId.startsWith('sleeve:')) { scene.text = sleeveAction(actId.slice(7)); renderScene(); return; }
  if (actId.startsWith('dish:')) { scene.text = cookDish(actId.slice(5)); renderScene(); return; }
  if (actId.startsWith('nightdeco:')) { const d = DECORATION_ITEMS.find(x => x.id === actId.slice(10)); if (d) { if (state.progress.pebbles < d.cost) { scene.text = `That one is 🫧 ${d.cost}.`; sfx('tie'); } else { buyDecoration(d); scene.text = `${d.icon} ${CAST.nightVendor.name} wraps the ${d.name} in dark paper. Place it from Shop → Items.`; } } renderScene(); return; }
  if (actId.startsWith('shelf:')) { scene.text = shelfAction(actId.slice(6)); renderScene(); return; }
  if (actId.startsWith('fav:')) { scene.text = toggleFav(actId.slice(4)); renderScene(); return; }
  if (actId.startsWith('toggle:')) { toggleMailItem(actId.slice(7)); return; }
  if (actId.startsWith('claim:')) { claimLetter(actId.slice(6)); return; }
  if (actId.startsWith('delete:')) { deleteLetter(actId.slice(7)); return; }
  if (actId.startsWith('seed:')) { const t = seedAction(actId.slice(5)); if (scene) { scene.text = t; renderScene(); } return; }   // planting leaves the scene
  const it = INTERIORS[scene.id], a = it.actions.find(x => x.id === actId), st = buildingState(scene.id);
  if (!a) return;
  if (a.kind === 'shopmode') { scene.mode = a.mode; scene.text = { packs: 'Fresh packs, straight off the shelf. Spend as much or as little as you like.', customize: 'A new look, perhaps? Everything here is just for you.', items: 'Decorations for every district. Tap Place after buying to put one down.' }[a.mode]; sfx('tap'); renderScene(); return; }
  if (a.kind === 'gotoshop') { closeScene(); switchTab('shop'); if (a.shopView) setShopView(a.shopView); return; }
  if (a.kind === 'oven') { scene.text = ovenAction(); }
  else if (a.kind === 'deal') { scene.text = spiceDealAction(); }
  else if (a.kind === 'sleeves') { scene.mode = 'sleeves'; scene.text = `Pick a sleeve. You're wearing ${currentSleeve().name}.`; sfx('tap'); }
  else if (a.kind === 'bait') { scene.mode = 'bait'; scene.text = `Fresh bait, fair prices. ${baitHaveLine()}`; sfx('tap'); }
  else if (a.kind === 'calm') { openCalm(a.game); return; }
  else if (a.kind === 'seeds') { scene.mode = 'seeds'; scene.text = seedsIntro(); sfx('tap'); }
  else if (a.kind === 'puzzle') { startPuzzle(); return; }
  else if (a.kind === 'minigame') { miniStart(a.game); return; }
  else if (a.kind === 'mail') { scene.mode = 'mail'; scene.mailOpen = {}; sfx('tap'); }
  else if (a.kind === 'decorate') { scene.mode = 'decorate'; scene.text = `Put decorations from your collection on the shelves (up to ${SHELF_MAX}). They come back to your decorations if you clear the shelves.`; sfx('tap'); }
  else if (a.kind === 'atlas-ask') { scene.mode = 'atlas-ask'; scene.text = 'Ask whatever you like. I will answer as well as I can, which is not always the same as well.'; sfx('tap'); }
  else if (a.kind === 'atlas-battle') { scene.mode = 'atlas-battle'; scene.armed = -1; scene.text = 'Four matches, each with a rule bent. Win one to open the next.'; sfx('tap'); }
  else if (a.kind === 'atlas-games') { scene.mode = 'atlas-games'; scene.text = 'The same little games, with the medal lines higher. Two prizes per game each day.'; sfx('tap'); }
  else if (a.kind === 'atlas-shop') { scene.mode = 'atlas-shop'; scene.text = `A few things I have kept for ${GAME.player.lowerMany} who visit. You have won ${atlasState().wins} time${atlasState().wins === 1 ? '' : 's'}.`; sfx('tap'); }
  else if (a.kind === 'altar') { scene.mode = 'altar'; scene.text = altarIntro(); sfx('tap'); showTipOnce('altar'); }
  else if (a.kind === 'favs') { scene.mode = 'favs'; scene.text = `Frame up to ${FAV_MAX} favourite cards on the wall.`; sfx('tap'); }
  else if (a.kind === 'trophies') { scene.text = trophySummary(); sfx('tap'); }
  else if (a.kind === 'wings') { scene.mode = 'wings'; scene.text = 'Which wing shall we visit? Wings with spare cards ready are marked.'; sfx('tap'); showTipOnce('museum'); }
  else if (a.kind === 'exped') { scene.mode = 'exped'; scene.text = `Send spare cards off to explore. They come back with ${GAME.currency.many}, supplies and sometimes a card - and a little mastery.`; sfx('tap'); showTipOnce('expeditions'); }
  else if (a.kind === 'nightpack') { scene.text = buyNightPack(); }
  else if (a.kind === 'sellbugs') { scene.text = sellJar(); }
  else if (a.kind === 'fortune') { scene.text = fortuneAction(a.id); }
  else if (a.kind === 'nightdeco') { scene.mode = 'nightdeco'; scene.text = 'They glow once the sun goes down.'; sfx('tap'); }
  else if (a.kind === 'cook') { scene.mode = 'cook'; scene.text = `${CAST.baker.name} ties on an apron. "What shall we make?" ${pantryLine()}`; sfx('tap'); showTipOnce('cook'); }
  else if (a.kind === 'daily') {
    if (st[a.id] === todayKey()) { scene.text = a.already; }
    else { st[a.id] = todayKey(); scene.text = a.done;
      const pebbles = a.pebbles + (weatherFx().dailyBonus || 0) + (scene.id === 'home' && typeof hrCosyBonus === 'function' ? hrCosyBonus() : 0);   // a cosy home pays a little more for its naps
      addPebbles(pebbles, 'daily-tasks'); toast(`🫧 +${pebbles} ${GAME.currency.many}`); sfx('claim'); }
  } else if (a.kind === 'memory') {
    memoryNewGame(); scene.text = `Match all ${memory.pairs} pairs. ${CAST.scholar.name} watches with quiet interest.`; sfx('tap'); renderScene(); renderMemoryGrid(); return;
  } else if (a.kind === 'advice') {
    scene.text = deckAdvice(); sfx('tap');
  } else if (a.kind === 'chest') {
    if (st[a.id]) { scene.text = a.already; }
    else {
      st[a.id] = true; saveState();
      const cid = randomCardId(rollRewardRarity(false)), isNew = !discoveredSet().has(BattleEngine.baseIdOf(cid));
      state.ownedCards.push(cid); saveState(); updateHud(); bumpPill('pillCards'); bumpStat('cardsFound', 1);
      scene.text = a.done; if (isNew) toast('📖 New entry in your Index');
      renderScene(); showCardReveal(cid, 'A hidden card', false); return;
    }
  }
  saveState(); renderScene();
}
document.getElementById('scActions').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) sceneAction(b.dataset.act); });
setInterval(() => {
  if (!inScene || !scene) return;
  if (scene.id === 'bakery' && ovenState().startedAt) renderScene();   // live oven countdown
  else if (scene.id === 'museum' && scene.mode === 'exped' && !expedState().picking && expedState().active.length) renderScene();
}, 1000);

/* ---------------- the Dreamers’ Cup: three matches at the fountain, no healing in between ----------------
   A new cup every week, named for the season. Your Calm carries from one round to the next, a loss ends the run,
   and a clean sweep wins that week's trophy (shown at home) plus a big prize. Later sweeps that week pay Embers. */
const CUP_NAMES = { spring: 'Blossom Cup', summer: 'Sunshine Cup', autumn: 'Harvest Cup', winter: 'Frost Cup' };
const CUP_ROUNDS = [
  { title: 'Round one', icon: '🥉', level: 'normal', spirit: 16, pebbles: 5 },
  { title: 'Semi-final', icon: '🥈', level: 'smart', spirit: 18, pebbles: 10 },
  { title: 'Final', icon: '🥇', level: 'smart', spirit: 22, pebbles: 25 },
];
function cupWeek() { return Math.floor(Date.now() / WEEK_MS); }
function cupName() { return CUP_NAMES[seasonNow()]; }
function cupState() {
  const p = state.progress;
  if (!p.cup || p.cup.week !== cupWeek()) p.cup = { week: cupWeek(), round: 0, spirit: BattleEngine.RULES.spirit, active: false, trophy: false, best: 0, foes: null };
  return p.cup;
}
function trophies() { const p = state.progress; if (!Array.isArray(p.trophies)) p.trophies = []; return p.trophies; }
// The three opponents are picked when a run starts and kept for that run.
function cupFoes() {
  const all = Object.values(NPC_POOLS).flatMap(pl => pl.names.map((n, i) => ({ name: n, icon: pl.icons[i % pl.icons.length] })));
  const a = shuffledArr(all);
  return [{ name: a[0].name, icon: a[0].icon }, { name: a[1].name, icon: a[1].icon }, { name: 'The Reigning Champion', icon: '🏆' }];
}
function cupDeck(round) { return round === 0 ? buildDeckForOpponent(DECK_SIZE, false) : round === 1 ? buildDeckForOpponent(DECK_SIZE, true) : rivalDeck(6); }
function cupButtons() {
  const cs = cupState();
  const chal = sceneBtn('chal', `🎯 Deck challenges · ${challengeState().list.filter(c => c.won).length}/3 beaten today`);
  const dr = draftState(), draft = sceneBtn('draft', dr.active ? `🎴 Draft Run · in progress` : featureLocked('draft') ? `🎴 Draft Run · 🔒 level ${FEATURE_LEVELS.draft.level}` : `🎴 Draft Run · build a deck, win four`);
  if (!cs.active) return sceneBtn('cup-enter', cs.trophy ? `🏆 Enter again (for ${GAME.currency.many})` : `🏆 Enter the ${cupName()}`) + draft + chal;
  const r = CUP_ROUNDS[cs.round], foe = cs.foes[cs.round];
  return sceneBtn('cup-play', `${r.icon} ${r.title}: ${foe.icon} ${foe.name} · you have ♥${cs.spirit}`) +
    sceneBtn('cup-quit', 'Withdraw (ends this run)') + sceneBtn('leave', 'Step away for now');
}
function cupIntro() {
  const cs = cupState();
  if (cs.active) return `The crowd is waiting for your ${CUP_ROUNDS[cs.round].title.toLowerCase()}. You carry ♥${cs.spirit} Calm into it - there is no healing between rounds.`;
  return `The ${cupName()} is on this week! Win three matches in a row and the trophy is yours. Your Calm carries over between rounds, so every point counts.${cs.trophy ? ' You already won this week\'s trophy - another sweep pays 🫧.' : ''}`;
}
function cupAction(act) {
  const cs = cupState();
  if (act === 'draft' || act.startsWith('draft-')) { draftAction(act); return; }
  if (act === 'chal') { scene.mode = 'chal'; scene.text = "Today's deck challenges: win using a deck that follows the rule. Tip: keep a deck for them in one of your deck slots (Cards → Deck)."; sfx('tap'); showTipOnce('challenges'); renderScene(); return; }
  if (act === 'chal-back') { scene.mode = null; scene.text = cupIntro(); renderScene(); return; }
  if (act.startsWith('chal-play:')) { startChallenge(+act.slice(10)); return; }
  if (act === 'cup-enter') {
    cs.active = true; cs.round = 0; cs.spirit = BattleEngine.RULES.spirit; cs.foes = cupFoes(); saveState();
    sfx('claim'); scene.text = cupIntro(); renderScene(); return;
  }
  if (act === 'cup-quit') { cs.active = false; cs.round = 0; saveState(); sfx('soft'); scene.text = 'You bow out of the cup. Maybe next time.'; renderScene(); return; }
  if (act === 'cup-play' && cs.active) {
    const r = CUP_ROUNDS[cs.round], foe = cs.foes[cs.round];
    startBattle({ id: 'cup-' + cs.round, name: foe.name, icon: foe.icon, deck: cupDeck(cs.round), profile: { level: r.level, spirit: r.spirit },
                  isBoss: cs.round === 2, rewardCard: null, cup: { round: cs.round }, startSpirit: cs.spirit });
  }
}
function cupWin() {
  const cs = cupState(), round = battle.npc.cup.round, r = CUP_ROUNDS[round];
  battle.rewarded = true;
  state.wins++; bumpStat('battlesWon', 1); bumpStat('cupRoundsWon', 1);
  cs.spirit = Math.max(1, battle.G.p[0].spirit);
  cs.best = Math.max(cs.best || 0, round + 1);
  const cupPeb = econTaper('cup', r.pebbles * (eventIs('festival-day') ? 2 : 1), 60);
  addPebbles(cupPeb, 'cup');
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.className = 'big-icon reveal-icon';
  let extra = '';
  if (round < CUP_ROUNDS.length - 1) {
    cs.round++;
    icon.textContent = r.icon;
    battleEndTitle.textContent = `Through to the ${CUP_ROUNDS[cs.round].title.toLowerCase()}!`;
    extra = `You carry <b>♥${cs.spirit}</b> into the next round.`;
  } else {
    cs.active = false; cs.round = 0;
    icon.textContent = '🏆';
    battleEndTitle.textContent = `You won the ${cupName()}!`;
    if (!cs.trophy) {
      cs.trophy = true;
      const s = seasonDef();
      trophies().push({ name: cupName(), icon: s.icon, season: seasonNow(), week: cs.week, at: Date.now() });
      bumpStat('cupTrophies', 1);
      const cid = randomCardId(Math.random() < 0.35 ? 'mythic' : 'super'), def = cardDef(cid);
      state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards');
      endCard.classList.add('glow-' + def.rarity);
      extra = `The ${s.icon} trophy goes on your shelf at home, with<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
      logEvent('🏆', `Won the ${cupName()}!`);
    } else extra = 'Another clean sweep this week.';
  }
  saveState();
  battleEndStats.innerHTML = `<b>+${cupPeb} 🫧</b> ${extra}`;
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🏆', '✨', '🎉'], round === 2 ? 24 : 10);
  sfx(round === 2 ? 'mythic' : 'win'); buzz(HAP.win); bumpPill('pillWins');
}
function cupLoss() {
  const cs = cupState(), round = battle.npc.cup.round;
  cs.active = false; cs.round = 0; saveState();
  const icon = btGet('battleEndIcon');
  icon.textContent = '🎗️'; icon.className = 'big-icon';
  btGet('battleSparkles').innerHTML = '';
  battleEndTitle.textContent = `Out in the ${CUP_ROUNDS[round].title.toLowerCase()}.`;
  battleEndStats.textContent = `A good run all the same. The ${cupName()} is open all week - enter again whenever you like.`;
  btGet('battleRetryBtn').classList.add('hidden');
  sfx('soft');
}

/* ---------------- winning a cellar fight (called from the battle result screen) ----------------
   A fight is one creature on the floor's map (js/cellar-world.js): winning removes it and pays Embers (the first on a floor in full, the others
   half), and a guardian (or the Root Keeper) also leaves a card and opens the stairs it was standing on. The floor does not change here; you
   take the stairs down yourself. */
function dungeonWin() {
  const npc = battle.npc, d = npc.dungeon, st = cellarState(), run = cellarRun(st), fl = run && run.fl;
  battle.rewarded = true;
  const f = cellarFloor(d.floor), icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  endCard.className = 'overlay-card';
  const foe = fl && fl.foes.find(x => x.id === d.foe); if (foe) foe.done = true;
  const first = !(fl && fl.wins); if (fl) fl.wins = (fl.wins || 0) + 1;
  const pay = Math.max(1, Math.round(cellarPebblesFor(f.pebbles, st) * (first ? 1 : 0.5)));
  addPebbles(pay, 'cellar');
  bumpStat('battlesWon', 1);
  let cardId = null, heading = '';
  if (f.final) { cardId = randomCardId(rollRewardRarity(false)); heading = 'From the old chest'; }
  else if (f.guardian) {
    // the first guardians hand over the cellar's own cards in order; after that a prize that grows with depth
    const next = CELLAR_PRIZES.find(id => !discoveredSet().has(id));
    cardId = next && Math.random() < 0.85 ? next : randomCardId(f.depth >= 12 ? 'mythic' : f.depth >= 7 ? (Math.random() < 0.5 ? 'mythic' : 'super') : 'super');
    heading = 'The guardian leaves behind';
  }
  let cardLine = '';
  if (cardId) {
    const def = cardDef(cardId), isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId));
    state.ownedCards.push(cardId); bumpStat('cardsFound', 1); bumpPill('pillCards');
    if (RARITY_ORDER.indexOf(def.rarity) >= 1) endCard.classList.add('glow-' + def.rarity);
    cardLine = `<br>${heading}: <b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
    if (isNew) setTimeout(() => toast('📖 New entry in your Index'), 900);
  }
  saveState();
  icon.textContent = f.final || f.guardian ? '🗝️' : '🕯️'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = f.final ? 'The cellar gives up its chest.' : f.guardian ? `${f.name} sinks back into the dark.` : `${f.name} steps aside.`;
  battleEndStats.innerHTML = `You won with <b>${Math.max(0, battle.G.p[0].spirit)}</b> Calm left. <b>+${pay} 🫧</b>${cardLine}` +
    `<br><small>Floor ${d.floor + 1} · deepest ${cellarBest()}${f.final || f.guardian ? ' · the stairs down are open' : ''}</small>`;
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['✨', '🕯️', '🌿'], f.final || f.guardian ? 18 : 8);
  sfx(f.final || f.guardian ? 'mythic' : 'win'); buzz(HAP.win);
  bumpPill('pillWins');
}
// A lost (or yielded) cellar fight costs a heart. At zero the run ends. Returns { ended, hearts }.
function dungeonLoss() {
  const d = battle.npc.dungeon;
  if (!d) return null;
  const st = cellarState();
  const run = cellarRun(st) || (typeof cellarNewRun === 'function' ? cellarNewRun(st) : null);
  if (!run) { endCellarRun(st, 'the dark pushed back'); return { ended: true, hearts: 0 }; }
  run.hearts--;
  if (run.hearts <= 0) { endCellarRun(st, 'the dark pushed back'); return { ended: true, hearts: 0 }; }
  saveState(); return { ended: false, hearts: run.hearts };
}

/* ---------- graves: tap for the epitaph and a countdown ---------- */
function showGrave(f) {
  const left = graveLeft(f), boss = !!f.isBoss;
  showProp(boss ? '👑' : '🪦', `${f.name}'s resting place`, `${f.grave.epitaph} They will be back in about ${fmtLeft(left)}.`);
}


