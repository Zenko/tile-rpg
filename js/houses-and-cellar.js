/* ============================================================
   HOUSES AND THE CELLAR
   ============================================================ */
const INTERIORS = {
  cottage: { title: "Wren's Cottage", who: '🧓', name: 'Wren', theme: 'warm',
    greet: 'Come in, come in. The kettle is on, and there is always room by the fire.',
    actions: [{ id: 'mg-tea', kind: 'minigame', game: 'tea', view: () => miniView('tea') },
              { id: 'tea', label: '☕ Share a pot of tea', kind: 'daily', pebbles: 4,
      done: 'Wren pours you a cup and presses two Pebbles into your hand. "For the road."', already: 'The teapot is empty for today. "Come back tomorrow, dear."' }] },
  nook: { title: 'The Reading Nook', who: '🧙', name: 'Olwen', theme: 'cool',
    greet: 'Ah, a visitor. Books are quiet, but I am not. Ask me anything about your deck.',
    actions: [{ id: 'puzzle', kind: 'puzzle', view: () => puzzleView() },
              { id: 'mg-quiz', kind: 'minigame', game: 'quiz', view: () => miniView('quiz') },
              { id: 'memory', label: '🃏 Play a memory game', kind: 'memory' },
              { id: 'advice', label: '📖 Ask about my deck', kind: 'advice' },
              { id: 'book', label: '📕 Open the dusty book', kind: 'chest', done: 'Something slips out from between the pages.', already: 'The book is just a book now. Olwen smiles. "It only had the one surprise."' }] },
  'stall-grain': { title: "Pip's Grain Stall", who: '🐭', name: 'Pip', theme: 'warm',
    greet: 'Fresh grain, still warm from the sack! Try a handful, on the house.',
    actions: [{ id: 'mg-grain', kind: 'minigame', game: 'grain', view: () => miniView('grain') },
              { id: 'sample', label: '🌾 Try a free sample', kind: 'daily', pebbles: 4,
      done: 'Pip scoops a handful into your palm, then presses two Pebbles into it too. "For being a good customer."', already: 'Pip pats the empty sack. "Sold out for today - back tomorrow!"' }] },
  'stall-thread': { title: "Clover's Thread Stall", who: '🐰', name: 'Clover', theme: 'cool',
    greet: "Ribbons, thread, whatever you're stitching together. And I know a thing or two about decks, if you're curious.",
    actions: [{ id: 'mg-pattern', kind: 'minigame', game: 'pattern', view: () => miniView('pattern') },
              { id: 'advice', label: '🧵 Ask about my deck', kind: 'advice' },
              { id: 'basket', label: '🧺 Dig through the remnant basket', kind: 'chest', done: 'Something catches your eye under all the scraps.', already: 'Clover shrugs. "You already found the good one in there."' }] },
  home: { title: 'Your Cottage', who: () => state.character.emoji, name: 'You', theme: 'warm',
    greet: () => `Home, sweet home. ${unreadMail() ? `📬 ${unreadMail()} unread letter${unreadMail() === 1 ? '' : 's'} in the mailbox.` : 'The mailbox is empty for now.'}`,
    actions: [{ id: 'mail', kind: 'mail', view: () => ({ label: `📬 Mailbox${unreadMail() ? ` (${unreadMail()} new)` : ''}` }) },
              { id: 'mg-tidy', kind: 'minigame', game: 'tidy', view: () => miniView('tidy') },
              { id: 'decorate', label: '🖼️ Decorate the shelves', kind: 'decorate' },
              { id: 'favs', label: '⭐ Choose favourite cards to frame', kind: 'favs' },
              { id: 'trophies', label: '🏆 Look over the trophy case', kind: 'trophies' },
              { id: 'nap', label: '😴 Nap by the window', kind: 'daily', pebbles: 3,
                done: 'You doze off in the sunny chair. When you wake, three Pebbles have rolled out of your pocket onto the cushion.', already: 'You are not sleepy yet. Maybe tomorrow.' }] },
  lantern: { title: 'The Lantern Market', who: '🦉', name: 'Lumen', theme: 'dark',
    greet: () => `Lanterns sway on strings between the stalls. "Night things, for night folk," Lumen hoots. ${jarLine()}`,
    actions: [{ id: 'nightpack', kind: 'nightpack', view: () => ({ label: `🌙 Night Pack · 🫧 ${NIGHT_PACK_COST} (rare or better, night cards)` }) },
              { id: 'sellbugs', kind: 'sellbugs', view: () => ({ label: jarValue() ? `🫙 Trade your jar of critters for 🫧 ${jarValue()}` : '🫙 Your critter jar is empty', disabled: !jarValue() }) },
              { id: 'nightdeco', label: '🕯️ Night-only decorations', kind: 'nightdeco' },
              { id: 'mg-lanterns', kind: 'minigame', game: 'lanterns', view: () => miniView('lanterns') }] },
  museum: { title: 'The Card Museum', who: '🦚', name: 'Curator Paz', theme: 'cool',
    greet: () => `Welcome! Every card has a story, and we would love to keep one of each. Spare copies only - we never take your last. ${MUSEUM_WINGS.filter(w => museumState().wings[w.id]).length}/${MUSEUM_WINGS.length} wings complete.`,
    actions: [{ id: 'wings', label: '🏛️ Donate to the wings', kind: 'wings' },
              { id: 'exped', kind: 'exped', view: () => { const es = expedState(), home = es.active.filter(t => Date.now() >= t.ends).length;
                  return { label: `🧭 Expeditions${home ? ` · ${home} team${home === 1 ? '' : 's'} home!` : es.active.length ? ` · ${es.active.length} away` : ''}` }; } }] },
  // ----- the four buildings that used to be locked -----
  bakery: { title: "Maple's Bakery", who: '🧑‍🍳', name: 'Maple', theme: 'warm',
    greet: () => `The oven is warm and the dough is rising. Bake a loaf and share it with a neighbor - nothing makes a friend faster. ${breadLine()}`,
    actions: [{ id: 'oven', kind: 'oven', view: ovenView },
              { id: 'cook', label: '🍳 Cook with Maple', kind: 'cook' },
              { id: 'mg-frost', kind: 'minigame', game: 'frost', view: () => miniView('frost') },
              { id: 'roll', label: '🥐 Taste a warm roll', kind: 'daily', pebbles: 3,
                done: 'Maple hands you a roll straight off the tray, and three Pebbles "for the jam fund."', already: 'Maple laughs. "One roll a day, or there will be none left for the market!"' }] },
  house2: { title: "Fern's Cottage", who: '👩‍🌾', name: 'Fern', theme: 'cool',
    greet: () => `Mind the watering cans! I tend the flower boxes in the square. ${seedsGreeting()}`,
    actions: [{ id: 'seeds', label: '🌱 Seeds & planting', kind: 'seeds' },
              { id: 'mg-weeds', kind: 'minigame', game: 'weeds', view: () => miniView('weeds') },
              { id: 'water', label: '💧 Help water the flower boxes', kind: 'daily', pebbles: 3,
                done: 'You water every box on the lane. Fern beams and tips three Pebbles into your palm.', already: 'Fern points at the dripping boxes. "Already watered today - thank you!"' }] },
  'stall-spice': { title: "Saffron's Spice Stall", who: '🦔', name: 'Saffron', theme: 'warm',
    greet: () => `One deal a day, and when it's gone, it's gone. ${spiceDealLine()}`,
    actions: [{ id: 'deal', kind: 'deal', view: spiceDealView },
              { id: 'mg-haggle', kind: 'minigame', game: 'haggle', view: () => miniView('haggle') }] },
  'card-shop': { title: 'The Card Shop', who: '🦎', name: 'Zeph', theme: 'warm',
    greet: 'Packs, sleeves, decorations, a fresh look for your character - if it has to do with cards, you will find it here. Have a look around.',
    actions: [{ id: 'packs', label: '🎁 Card packs', kind: 'shopmode', mode: 'packs' },
              { id: 'sleeves', label: '🎴 Card sleeves', kind: 'sleeves' },
              { id: 'customize', label: '🎨 Customize', kind: 'shopmode', mode: 'customize' },
              { id: 'items', label: '🪑 Items & decorations', kind: 'shopmode', mode: 'items' }] },
  'stall-tinker': { title: "Tock's Tinker Stall", who: '🦝', name: 'Tock', theme: 'cool',
    greet: 'Sleeves! Fancy card sleeves! Your cards will look their best in a match - only your side sees the shine, mind you.',
    actions: [{ id: 'sleeves', label: '🎴 Browse card sleeves', kind: 'sleeves' },
              { id: 'mg-gears', kind: 'minigame', game: 'gears', view: () => miniView('gears') },
              { id: 'sort', label: '🔧 Help sort the spare parts', kind: 'daily', pebbles: 2,
                done: 'Springs here, cogs there. Tock pays you two Pebbles and a very small screw you did not ask for.', already: 'Tock waves you off. "Parts are sorted! Come back tomorrow."' }] },
  'harbor-hut': { title: 'The Net Loft', who: '🦦', name: 'Tam', theme: 'cool',
    greet: 'Salt in the air, gulls on the roof. Mind the nets drying by the door - I only just finished mending them.',
    actions: [{ id: 'mend', label: '🪢 Help mend a net', kind: 'daily', pebbles: 4,
      done: 'You work a knot loose and tie it back tighter. Tam presses four Pebbles into your hand. "Steady hands, you."', already: 'Tam pats the nets, all mended. "Nothing left to fix today - come back tomorrow."' },
              { id: 'buoy', label: '🎣 Check the old buoy box', kind: 'chest', done: 'Something washed up in the buoy box, wedged between the floats.', already: 'Tam shrugs. "That box only ever had the one surprise in it."' }] },
  'garden-glass': { title: 'The Glasshouse', who: '🐌', name: 'Iris', theme: 'warm',
    greet: 'Careful of the watering cans! Everything in here grows a little slower than the sun, and a little stranger too.',
    actions: [{ id: 'prune', label: '🌿 Help prune the vines', kind: 'daily', pebbles: 4,
      done: 'You snip back the wandering vines. Iris slides four Pebbles across a potting bench. "For the help, dear."', already: 'Iris waves a leaf at you. "All pruned for today - the vines will grow back by tomorrow."' },
              { id: 'pots', label: '🪴 Dig through the spare pots', kind: 'chest', done: 'Something is tucked under an upturned pot, waiting.', already: 'Iris smiles. "You already found what was hiding under there."' }] },
};

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
function bakeMs() { return Math.round(BAKE_MS * (1 - Math.min(0.5, cardBonus('bake'))) * (eventIs('baking-day') ? 0.5 : 1)); }
function fmtClock(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function ovenAction() {
  const ov = ovenState();
  if (!ov.startedAt) {
    ov.startedAt = Date.now(); ov.ms = bakeMs(); saveState(); sfx('tap');
    scheduleLocalNotify('bread', ov.startedAt + ov.ms, '🍞 Bread is ready!', 'Your loaf at the bakery is done baking.');
    return 'Maple slides your loaf into the oven. "Off you go - it will not burn, I promise."';
  }
  if (Date.now() - ov.startedAt < (ov.ms || BAKE_MS)) return 'Not yet. It smells wonderful, though.';
  ov.startedAt = null;
  bumpStat('breadBaked', 1);
  if (breadCount() >= BREAD_MAX) { addPebbles(4, 'bread'); toast('🫧 +4 Pebbles'); saveState(); return 'Your basket is already full, so Maple buys this loaf back for 4 Pebbles.'; }
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
const RECIPES = [
  { id: 'daisy-tea',     name: 'Daisy Tea',      icon: '🍵', needs: { flowers: 2 },              gift: 3,                            desc: 'A calming cup. A lovely gift.' },
  { id: 'fish-soup',     name: 'Fish Soup',      icon: '🍲', needs: { fish: 2, flowers: 1 },     gift: 2, battle: { spirit: 3 },     desc: 'Eat before a match: start with +3 Spirit.' },
  { id: 'pumpkin-pie',   name: 'Pumpkin Pie',    icon: '🥧', needs: { pumpkin: 1, bread: 1 },    gift: 5, battle: { spirit: 2 },     desc: 'Everyone loves pie. Or eat it for +2 Spirit.' },
  { id: 'sunflower-loaf', name: 'Sunflower Loaf', icon: '🥖', needs: { sunflower: 1, bread: 1 }, gift: 3, battle: { draw: 1 },       desc: 'Eat before a match: draw 1 extra card.' },
  { id: 'moonlit-stew',  name: 'Moonlit Stew',   icon: '🥘', needs: { moonbean: 1, fish: 1 },    gift: 6, battle: { spirit: 3, draw: 1 }, desc: 'Eat before a match: +3 Spirit and 1 extra card. A treasured gift.' },
];
function recipeDef(id) { return RECIPES.find(r => r.id === id); }
function pantry() { const p = state.progress; if (!p.pantry || typeof p.pantry !== 'object') p.pantry = {}; return p.pantry; }
function ingredientCount(k) { return k === 'bread' ? breadCount() : (pantry()[k] || 0); }
function addIngredient(k, n) { const pt = pantry(); pt[k] = Math.min(PANTRY_MAX, (pt[k] || 0) + (n || 1)); }
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
  logEvent(r.icon, `Cooked ${r.name} with Maple.`);
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
  if (spiceSold()) return "Today's deal is gone. Saffron is already dreaming up tomorrow's.";
  const d = spiceDeal();
  if (state.progress.pebbles < d.price) { sfx('tie'); return `Saffron taps the sign. "🫧 ${d.price}, friend. Come back when your pockets jingle."`; }
  buildingState('stall-spice').dealDay = todayKey();
  if (d.kind === 'pack') { buyPack(d.pack, d.price); return 'Saffron wraps the pack in brown paper. "A bargain, and you know it."'; }
  spendPebbles(d.price, 'spice-deal');
  const isNew = !discoveredSet().has(d.card);
  state.ownedCards.push(d.card); noteCardsFound(1);
  logEvent('🌶️', `Bought ${cardDef(d.card).name} from Saffron's deal for 🫧 ${d.price}.`);
  saveState(); updateHud(); bumpPill('pillCards'); bumpPill('pillPebbles');
  showCardReveal(d.card, "Saffron's deal", true);
  if (isNew) toast('📖 New entry in your Index');
  return 'Saffron slides the card across the counter with a wink.';
}

/* ---------------- Tock's tinker stall: card sleeves, a purely cosmetic frame for your own cards in battle ---------------- */
const SLEEVES = [
  { id: '',       name: 'Plain',        icon: '▫️', cost: 0 },
  { id: 'leafy',  name: 'Leafy',        icon: '🍃', cost: 25 },
  { id: 'gilded', name: 'Gilded',       icon: '✨', cost: 30 },
  { id: 'tide',   name: 'Tidal',        icon: '🌊', cost: 35 },
  { id: 'petal',  name: 'Petal',        icon: '🌸', cost: 35 },
  { id: 'ember',  name: 'Ember',        icon: '🔥', cost: 40 },
  { id: 'starry', name: 'Starry Night', icon: '🌙', cost: 45 },
];
function ensureSleeves() { const ch = state.character; if (!Array.isArray(ch.unlockedSleeves)) ch.unlockedSleeves = ['']; if (typeof ch.sleeve !== 'string') ch.sleeve = ''; return ch; }
function currentSleeve() { const id = ensureSleeves().sleeve; return SLEEVES.find(s => s.id === id) || SLEEVES[0]; }
function sleeveChip(s) { return `<span class="sleeve-chip${s.id ? ' sleeve-' + s.id : ''}"><span class="sleeve-fx"></span></span>`; }
function sleeveButtons() {
  const ch = ensureSleeves();
  return SLEEVES.map(s => {
    const owned = ch.unlockedSleeves.includes(s.id), worn = ch.sleeve === s.id;
    const label = worn ? `${sleeveChip(s)} ${s.name} · wearing` : owned ? `${sleeveChip(s)} Wear ${s.name}` : `${sleeveChip(s)} ${s.name} · 🫧 ${s.cost}`;
    return sceneBtn('sleeve:' + s.id, label, worn);
  }).join('');
}
function sleeveAction(id) {
  const ch = ensureSleeves(), s = SLEEVES.find(x => x.id === id);
  if (!s) return '';
  if (!ch.unlockedSleeves.includes(s.id)) {
    if (state.progress.pebbles < s.cost) { sfx('tie'); return `"That one's 🫧 ${s.cost}," says ${scene && INTERIORS[scene.id] ? INTERIORS[scene.id].name : 'Tock'}, polishing it anyway.`; }
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
    swarm: ['reed', 'reed', 'flintstone', 'flintstone', 'sprout', 'sprout', 'feather', 'feather', 'gale', 'moth', 'droplet', 'toadstool', 'tide'],
    wall:  ['pebble', 'pebble', 'geode', 'geode', 'boulder', 'boulder', 'bubble', 'bubble', 'lantern', 'moonstone', 'droplet', 'toadstool', 'cloud'],
    grove: ['moth', 'moth', 'blossom', 'blossom', 'lily', 'lily', 'droplet', 'droplet', 'aurora-stag', 'deep-current', 'mountain-heart', 'dove', 'cloud'],
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
  { name: 'The Watcher Below', icon: '👁️', kw: 'guard', blurb: 'One great eye opens in the rock and follows you.' },
  { name: 'The Deep Wyrm',     icon: '🐉', kw: 'bloom', blurb: 'The floor trembles. Something very large is breathing.' },
];
// The prizes only the deep gives up, handed out by guardians in this order (then at random once you have them all).
const CELLAR_PRIZES = ['glowworm', 'echo-cavern', 'deep-wyrm'];
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
  return foeEnhanceDeck(BattleEngine.suggestDeck(counts), 4, fl.name,
    { foeCount: Math.min(2, 1 + Math.floor(d / 5)), enhanced: Math.min(5, 1 + Math.floor(d / 2)), skill: Math.min(0.5, 0.2 + d * 0.03) });
}
function cellarState() {
  const st = buildingState('cellar');
  if (typeof st.floor !== 'number') st.floor = 0;
  if (typeof st.best !== 'number') st.best = 0;
  // an older save "rested" by sitting on floor 3 with clearedAt set; the rest now has its own flag
  if (st.clearedAt && !st.resting && st.floor >= CELLAR.floors.length && !st.inRun) st.resting = true;
  if (st.resting && Date.now() - (st.clearedAt || 0) >= CELLAR.cooldownMs) { st.floor = 0; st.clearedAt = null; st.resting = false; st.inRun = false; }
  return st;
}
// Ends a deep run: the cellar rests, the record stays.
function endCellarRun(st, reason) {
  st.resting = true; st.inRun = false; st.clearedAt = Date.now();
  const reached = st.floor;                                // floors cleared this run
  if (reached > CELLAR.floors.length) logEvent('🕳️', `Climbed out of the cellar after clearing floor ${reached}${reason ? ' (' + reason + ')' : ''}.`);
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
  if (has('guard') === 0) return 'Not one Guard in the whole deck. Enemies will hit your Spirit as they please. One or two Guards buy you time.';
  if (d.filter(c => c.cost >= 4).length === 0) return 'A tidy, cheap deck, but nothing to finish with. One big card at cost 4 or 5 gives you something to build toward.';
  return `That is a well-shaped deck: ${cheap} cheap cards, average cost ${avg.toFixed(1)}, and ${has('guard') + has('shield')} defenders. I would not change much.`;
}

/* ---------------- the scene screen ---------------- */
const SCENE_TIPS = { bakery: 'bakery', house2: 'garden' };
/* ---------- door fade ----------
   Going into (or out of) a building covers the screen with a quick fade to the page colour, swaps the screens while
   it's covered, then fades back, the same idea as the district travel card but shorter. While it runs, further taps
   on the same trigger are ignored. With motion off (Calm mode / reduced motion) the swap just happens at once. */
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
function openSceneFx(id) { withDoorFade(() => openScene(id)); }
function sceneEnterFx() {
  sceneView.classList.remove('scene-enter'); void sceneView.offsetWidth; sceneView.classList.add('scene-enter');
  setTimeout(() => sceneView.classList.remove('scene-enter'), 900);
}
/* The Character > Look "Shop" button: walk the player to the Card Shop (Market Row) and open its Customize counter. Until
   Market Row is open, the Shop tab does the same job. */
function goToCardShop() {
  if (inBattle || doorFading) return;
  sfx('nav'); buzz(HAP.tap);
  if (!districtUnlocked('market')) { switchTab('shop'); setShopView('customize'); toast("The Card Shop is in Market Row - until it opens, this is its shop window"); return; }
  const enter = () => { if (state.currentDistrict !== 'market') travelToDistrictNow('market'); else switchTab('town'); openScene('card-shop'); sceneAction('customize'); };
  if (state.currentDistrict !== 'market') withTravelTransition('market', enter); else withDoorFade(enter);
}
function openScene(id) {
  cancelWalk(); if (typeof noteVisit === 'function') noteVisit(id);
  if (SCENE_TIPS[id]) showTipOnce(SCENE_TIPS[id]);
  inScene = true; scene = { id, text: '' }; sceneView.classList.remove('scene-leaving');
  townPanel.classList.add('hidden'); document.getElementById('bottomNav').style.display = 'none';
  document.body.classList.add('in-scene'); sceneView.classList.remove('hidden'); sceneEnterFx();
  if (id === 'cellar') {
    const st = cellarState();
    scene.text = st.resting ? 'The cellar is quiet. Whatever lives here is resting.'
      : st.floor === CELLAR.floors.length && !st.inRun ? (showTipOnce('cellarDeep'), 'Behind the old chest, a crack in the wall leads further down. Cold air breathes out of it.')
      : (st.floor === 0 ? 'Cool air rises from the stairs. ' : '') + cellarFloor(st.floor).blurb;
  } else if (id === 'cup') { scene.text = cupIntro(); showTipOnce('cup'); }
  else if (id === 'trades') { scene.text = `Neighbors pin up offers here each morning. Only spare copies can be traded. ${forecastText()}`; showTipOnce('trades'); }
  else if (id === 'home') { const g = INTERIORS.home.greet; scene.text = g(); showTipOnce('home'); }
  else { const g = INTERIORS[id].greet; scene.text = typeof g === 'function' ? g() : g; }
  renderScene();
}
/* The Card Shop's Packs / Customize / Items screens are the same views the Shop panel uses (renderPacks,
   renderCustomize, renderItems draw into #packsView, #customizeView, #itemsView by id). While the Card Shop scene
   is in one of those modes we simply move that element into the scene, so the player never leaves the shop counter;
   leaving the mode puts them back in #shopPanel, where the profile menu's "Visit shop" and the Pebbles fallback
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
  mountShopView(null);
  miniStop();
  inScene = false; scene = null; if (typeof memory !== 'undefined') { memory = null; memoryLeaveStage(); }
  sceneView.classList.add('hidden'); sceneView.classList.remove('scene-leaving', 'scene-enter', 'sc-std');
  townPanel.classList.remove('hidden'); document.getElementById('bottomNav').style.display = '';
  document.body.classList.remove('in-scene');
  townLog.textContent = 'You step back outside.';
  renderTown(); updateHud();
}
/* ---------------- your cottage: shelves, framed cards, trophies and the mailbox ---------------- */
const SHELF_MAX = 6, FAV_MAX = 3;
function homeState() { const p = state.progress; if (!p.home || typeof p.home !== 'object') p.home = { shelf: [], favs: [] }; return p.home; }
// Everything you have earned that deserves a spot on the top shelf.
function trophyItems() {
  const out = trophies().map(t => ({ icon: '🏆', label: `${t.icon} ${t.name}` }));
  const best = state.progress.cellarBest || 0;
  if (best >= 5) out.push({ icon: '🕯️', label: `Cellar floor ${best}` });
  if (state.progress.rival && state.progress.rival.chapter >= RIVAL.chapters) out.push({ icon: '🎭', label: "Rook's respect" });
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
  return shown.map(id => { const d = cardDef(id), on = h.favs.includes(id); return sceneBtn('fav:' + id, `${on ? '⭐' : '☆'} ${d.icon} ${d.name} <small>${RARITY_LABEL[d.rarity]}</small>`); }).join('');
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
  const foilTotal = Object.values(foils()).reduce((a, b) => a + b, 0); if (foilTotal) lines.push(`✨ ${foilTotal} foil${foilTotal === 1 ? '' : 's'} shimmering in your collection`);
  return lines.length ? lines.join(' · ') : 'The trophy case is empty for now. Win the Festival Cup, go deep in the cellar, or land a legendary catch.';
}

/* ---------------- letters: the neighbors write to you ----------------
   Each letter has a key so it is only ever sent once (friend notes use the day in theirs). Some carry a small gift,
   claimed from the mailbox at home. checkMail() runs every so often and sends whatever has become due. */
const ROOK_LETTERS = [
  'Fine, you won. I have been practising in secret. See you soon - and bring your best cards.',
  'I asked around about you. Everyone says you are "nice". Nice people are the most dangerous.',
  'I traded my lucky coin for a rare card. Worth it? We will find out.',
  'Your Guard cards are a wall I cannot seem to climb. I am working on it.',
  'I caught myself smiling after our last match. Do not tell anyone.',
  'Three decks, three rebuilds, zero sleep. Our next match will be different.',
  'I think I finally understand why I keep losing to you. You play like you are having fun.',
  'Thank you. For all of it. If you ever need a practice partner, you know where to find me. - R.',
];
const FRIEND_NOTES = [
  'Thank you for being such a good neighbor. I found this and thought of you.',
  'The town feels friendlier with you in it. A little something, just because.',
  'I tried to bake like Maple. It did not go well. Here is something better instead.',
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
  if (g.kind === 'pebbles') return `🫧 ${g.n} Pebbles`;
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
  sendLetter('welcome-home', { from: 'Wren', icon: '🧓', subject: 'Your cottage', gift: { kind: 'pebbles', n: 5 },
    body: 'The little cottage beside the Reading Nook is yours now, dear. Put a few things on the shelves, frame your favourite cards, and check the mailbox now and then - the neighbors like to write.' });
  if ((t.breadBaked || 0) >= 1) sendLetter('maple-cook', { from: 'Maple', icon: '🧑‍🍳', subject: 'Cooking lessons', gift: { kind: 'bread', n: 1 },
    body: 'Bread is only the start! Bring me what you grow and what you catch, and we will cook something special together. Pumpkin Pie is my favourite, if you are wondering what to give me.' });
  if ((t.cropsHarvested || 0) >= 1) sendLetter('fern-seeds', { from: 'Fern', icon: '👩‍🌾', subject: 'A little something for the garden', gift: { kind: 'seed', id: 'moonbean' },
    body: 'Your first harvest! Here is a Moonbean for you - they are hard to come by. You can find more hiding in the Hollow Garden grass, if you look closely.' });
  if ((t.puzzlesSolved || 0) >= 1) sendLetter('olwen-puzzle', { from: 'Olwen', icon: '🧙', subject: 'Well puzzled', gift: { kind: 'pebbles', n: 4 },
    body: 'I watched you work through my puzzle. Most people just attack everything and hope. You thought about it. There will be a new board tomorrow.' });
  const rv = state.progress.rival;
  if (rv) for (let c = 1; c <= Math.min(rv.chapter || 0, RIVAL.chapters); c++)
    sendLetter('rook-' + c, { from: 'Rook', icon: '🎭', subject: c === RIVAL.chapters ? 'Thank you' : `About our match (${c}/${RIVAL.chapters})`, body: ROOK_LETTERS[c - 1], gift: c < RIVAL.chapters ? { kind: 'pebbles', n: 5 } : null });
  if ((t.battlesWon || 0) >= 1) sendLetter('cup-' + cupWeek(), { from: 'The Festival Committee', icon: '🎪', subject: `The ${cupName()} is on!`,
    body: `This week's ${cupName()} is open at the fountain in Town Square. Three matches, no healing in between, and a trophy for anyone who sweeps them all. Good luck!` });
  if ((state.progress.level || 1) >= 2) sendLetter('lumen-night', { from: 'Lumen', icon: '🦉', subject: 'After dark', gift: null,
    body: 'When the lamps come on, look for my lanterns in Market Row. I trade in night things: rare packs, glowing trinkets, and whatever critters you catch in a jar.' });
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
  return `<div class="panel-list mail-list">${sorted.map(({ l }) => {
    const open = !!scene.mailOpen[l.id], hasGift = l.gift && !l.claimed;
    return `<div class="panel-item mail-item${l.read ? '' : ' unread'}${open ? ' open' : ''}" data-act="toggle:${l.id}">
      <span class="panel-icon">${l.icon}</span>
      <span class="panel-text">
        <div class="panel-name">${escapeHtml(l.subject)}${!l.read ? '<span class="mail-dot"></span>' : ''}${hasGift ? ' 🎁' : ''}</div>
        <div class="panel-desc">from ${escapeHtml(l.from)} · ${fmtLogTime(l.at)}</div>
        ${open ? `<div class="mail-body">${escapeHtml(l.body)}</div>
          <div class="mail-item-actions">
            ${hasGift ? `<button class="btn mail-claim-btn" data-act="claim:${l.id}">🎁 Take the gift: ${giftText(l.gift)}</button>`
              : `<button class="btn btn-ghost mail-delete-btn" data-act="delete:${l.id}">🗑️ Delete</button>`}
          </div>` : ''}
      </span>
      <span class="mail-chevron">${open ? '▲' : '▼'}</span>
    </div>`;
  }).join('')}</div>`;
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
  if (!confirm("Delete this letter? This can't be undone.")) return;
  ms.list = ms.list.filter(x => x.id !== id);
  if (scene.mailOpen) delete scene.mailOpen[id];
  saveState(); sfx('nav'); buzz(HAP.tap);
  renderScene();
}

// A label like "Play: Catch the Grain · 3 prizes left today" is split at the first " · " so the storefront layout can show the
// status as a small chip on the right (labels with markup are left alone). Other layouts show it inline, see .sb-meta in the CSS.
function sceneBtn(id, label, disabled) {
  let inner = label;
  const i = typeof label === 'string' && !label.includes('<') ? label.indexOf(' · ') : -1;
  if (i > 0) inner = `<span class="sb-main">${label.slice(0, i)}</span><span class="sb-meta">${label.slice(i + 3)}</span>`;
  return `<button class="btn sc-btn" data-act="${id}" ${disabled ? 'disabled' : ''}>${inner}</button>`;
}
// The top-left arrow is gone, so every scene state must offer its own way out. They all do today; this keeps it true.
const SCENE_EXIT_ACTS = ['leave', 'back', 'mg-back', 'wings-back', 'exp-cancel'];
function renderScene() {
  renderSceneBody();
  // The storefront layout (v1.77.0) is for the ordinary "talk to the owner" screens; mini-games, the memory game and the
  // Card Shop counter keep the compact layout because they fill the stage with their own content.
  sceneView.classList.toggle('sc-std', !!scene && !['memory-mode', 'mini-mode', 'shop-mode'].some(c => sceneView.classList.contains(c)));
  const acts = document.getElementById('scActions');
  if (scene && acts && !SCENE_EXIT_ACTS.some(a => acts.querySelector(`[data-act="${a}"]`))) acts.insertAdjacentHTML('beforeend', sceneBtn('leave', 'Head back out'));
}
function renderSceneBody() {
  if (!scene) return;
  const stage = document.getElementById('scStage'), pips = document.getElementById('scPips'), acts = document.getElementById('scActions');
  document.getElementById('scText').textContent = scene.text;
  renderHomeShelf();                                  // only draws in your own cottage; clears itself anywhere else
  if (scene.id === 'cellar') {
    const st = cellarState(), fl = CELLAR.floors, resting = st.resting, deep = isDeepFloor(st.floor);
    sceneView.dataset.theme = 'dark';
    document.getElementById('scTitle').textContent = deep && !resting ? 'The Deep Cellar' : 'The Old Cellar';
    document.getElementById('scWho').textContent = resting ? '🕯️' : cellarFloor(st.floor).icon;
    const best = cellarBest();
    pips.innerHTML = deep && !resting
      ? `<span class="pip-label">🕳️ Floor ${st.floor + 1}${best ? ` · deepest ${best}` : ''}</span>`
      : fl.map((f, i) => `<span class="pip ${i < st.floor ? 'done' : (i === st.floor && !resting ? 'now' : '')}"></span>`).join('') + (best > fl.length ? `<span class="pip-label">deepest ${best}</span>` : '');
    if (resting) {
      acts.innerHTML = sceneBtn('rest', `Quiet for now (${fmtClock(CELLAR.cooldownMs - (Date.now() - st.clearedAt))})`, true) + sceneBtn('leave', 'Climb back up');
    } else if (deep) {
      const f = cellarFloor(st.floor);
      acts.innerHTML = sceneBtn('descend', `${f.guardian ? '🗝️' : '🕳️'} Floor ${st.floor + 1}: ${f.name}`) +
        sceneBtn('leave', st.inRun ? `Climb back up (ends the run at floor ${st.floor})` : 'Climb back up (the cellar rests)');
    } else {
      acts.innerHTML = sceneBtn('descend', st.floor === 0 ? '🕯️ Go down the stairs' : `🕯️ Floor ${st.floor + 1}: ${fl[st.floor].name}`) + sceneBtn('leave', 'Climb back up');
    }
  } else if (scene.id === 'cup') {
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
    acts.innerHTML = sceneBtn('leave', 'Head back out');
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
    else if (scene.mode === 'seeds') acts.innerHTML = seedButtons() + sceneBtn('back', '← Back');
    else if (scene.mode === 'cook') acts.innerHTML = cookButtons() + sceneBtn('back', '← Back to the counter');
    else if (scene.mode === 'decorate') acts.innerHTML = shelfButtons() + sceneBtn('back', '← Done');
    else if (scene.mode === 'favs') acts.innerHTML = favButtons() + sceneBtn('back', '← Done');
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
    else if (scene.mode === 'nightdeco') acts.innerHTML = DECORATION_ITEMS.filter(d => d.night).map(d => sceneBtn('nightdeco:' + d.id, `${d.icon} ${d.name} · 🫧 ${d.cost}${decorationInventoryCount(d.id) ? ` (have ${decorationInventoryCount(d.id)})` : ''}`)).join('') + sceneBtn('back', '← Back');
    // an action may compute its own label (a timer, a sold-out deal) through view()
    else acts.innerHTML = it.actions.map(a => { const v = a.view ? a.view(a) : null; return sceneBtn(a.id, v ? v.label : a.label, v && v.disabled); }).join('') + sceneBtn('leave', 'Head back out');
  }
}
// `src` names where the Pebbles came from (or went), for the economy ledger (econNote, js/progression.js).
function addPebbles(n, src) { state.progress.pebbles += n; econNote(n, src); saveState(); updateHud(); bumpPill('pillPebbles'); }
function sceneAction(actId) {
  if (!scene) return;
  if (actId === 'leave') {
    // Past the Root Keeper's chest, walking away ends the run and lets the cellar rest (and reset) as it always did.
    if (scene.id === 'cellar') { const st = cellarState(); if (!st.resting && isDeepFloor(st.floor)) endCellarRun(st, 'climbed out'); }
    if (doorFading || scene.leaving) return;
    sfx('nav'); buzz(HAP.tap);
    // The sheet drops away and the speech fades first, then the usual fade to the street (v1.77.0)
    if (btMotionOk() && sceneView.classList.contains('sc-std')) {
      scene.leaving = true; sceneView.classList.remove('scene-enter'); sceneView.classList.add('scene-leaving');
      setTimeout(() => withDoorFade(closeScene, 170, 260), 230);
    } else withDoorFade(closeScene);
    return;
  }
  if (scene.id === 'cellar') {
    if (actId !== 'descend') return;
    const st = cellarState(); if (st.resting) return;
    const f = cellarFloor(st.floor);
    if (f.deep) st.inRun = true;
    const foe = { id: 'cellar-' + st.floor, name: f.name, icon: f.icon, deck: f.deep ? deepDeck(f) : themedDeck(f.theme, st.floor), isBoss: !!(f.final || f.guardian), rewardCard: null, defeated: false,
                  profile: f.profile, dungeon: { id: 'cellar', district: state.currentDistrict, floor: st.floor, deep: !!f.deep } };
    sfx('tap'); buzz(HAP.tap); startBattle(foe); return;
  }
  if (actId === 'back') { scene.mode = null; sfx('nav'); renderScene(); return; }
  if (actId === 'mg-again' && mini) { miniStart(mini.id); return; }
  if (actId === 'noop') return;
  if (scene.id === 'trades') { if (actId.startsWith('trade:')) { scene.text = doTrade(+actId.slice(6)); renderScene(); } return; }
  if (actId.startsWith('wing:')) { scene.mode = 'wing'; scene.wing = actId.slice(5); const w = wingDef(scene.wing); scene.text = `${w.icon} ${w.name}: ${wingProgress(w)}/${w.cards.length} donated. Complete it for 🫧 ${WING_PEBBLES} and a keepsake.`; sfx('tap'); renderScene(); return; }
  if (actId === 'wings-back') { scene.mode = 'wings'; scene.text = 'Which wing shall we visit?'; renderScene(); return; }
  if (actId.startsWith('donate:')) { scene.text = donateCard(actId.slice(7)); renderScene(); return; }
  if (actId.startsWith('donateall:')) { const w = wingDef(actId.slice(10)); let last = ''; w.cards.filter(canDonate).forEach(id => { last = donateCard(id); }); scene.text = last; renderScene(); return; }
  if (actId.startsWith('exp-')) { scene.text = expedAction(actId) || scene.text; renderScene(); return; }
  if (actId === 'mg-back') { miniStop(); const g = INTERIORS[scene.id].greet; scene.text = typeof g === 'function' ? g() : g; sfx('nav'); renderScene(); return; }
  if (scene.id === 'cup') { cupAction(actId); return; }
  if (actId.startsWith('sleeve:')) { scene.text = sleeveAction(actId.slice(7)); renderScene(); return; }
  if (actId.startsWith('dish:')) { scene.text = cookDish(actId.slice(5)); renderScene(); return; }
  if (actId.startsWith('nightdeco:')) { const d = DECORATION_ITEMS.find(x => x.id === actId.slice(10)); if (d) { if (state.progress.pebbles < d.cost) { scene.text = `That one is 🫧 ${d.cost}.`; sfx('tie'); } else { buyDecoration(d); scene.text = `${d.icon} Lumen wraps the ${d.name} in dark paper. Place it from Shop → Items.`; } } renderScene(); return; }
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
  else if (a.kind === 'seeds') { scene.mode = 'seeds'; scene.text = seedsIntro(); sfx('tap'); }
  else if (a.kind === 'puzzle') { startPuzzle(); return; }
  else if (a.kind === 'minigame') { miniStart(a.game); return; }
  else if (a.kind === 'mail') { scene.mode = 'mail'; scene.mailOpen = {}; sfx('tap'); }
  else if (a.kind === 'decorate') { scene.mode = 'decorate'; scene.text = `Put decorations from your collection on the shelves (up to ${SHELF_MAX}). They come back to your decorations if you clear the shelves.`; sfx('tap'); }
  else if (a.kind === 'favs') { scene.mode = 'favs'; scene.text = `Frame up to ${FAV_MAX} favourite cards on the wall.`; sfx('tap'); }
  else if (a.kind === 'trophies') { scene.text = trophySummary(); sfx('tap'); }
  else if (a.kind === 'wings') { scene.mode = 'wings'; scene.text = 'Which wing shall we visit? Wings with spare cards ready are marked.'; sfx('tap'); showTipOnce('museum'); }
  else if (a.kind === 'exped') { scene.mode = 'exped'; scene.text = 'Send spare cards off to explore. They come back with Pebbles, supplies and sometimes a card - and a little mastery.'; sfx('tap'); showTipOnce('expeditions'); }
  else if (a.kind === 'nightpack') { scene.text = buyNightPack(); }
  else if (a.kind === 'sellbugs') { scene.text = sellJar(); }
  else if (a.kind === 'nightdeco') { scene.mode = 'nightdeco'; scene.text = 'They glow once the sun goes down.'; sfx('tap'); }
  else if (a.kind === 'cook') { scene.mode = 'cook'; scene.text = `Maple ties on an apron. "What shall we make?" ${pantryLine()}`; sfx('tap'); showTipOnce('cook'); }
  else if (a.kind === 'daily') {
    if (st[a.id] === todayKey()) { scene.text = a.already; }
    else { st[a.id] = todayKey(); scene.text = a.done;
      const pebbles = a.pebbles + (weatherFx().dailyBonus || 0);
      addPebbles(pebbles, 'daily-tasks'); toast(`🫧 +${pebbles} Pebbles`); sfx('claim'); }
  } else if (a.kind === 'memory') {
    memoryNewGame(); scene.text = `Match all ${memory.pairs} pairs. Olwen watches with quiet interest.`; sfx('tap'); renderScene(); renderMemoryGrid(); return;
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
  if (scene.id === 'cellar' && cellarState().resting) renderScene();
  else if (scene.id === 'bakery' && ovenState().startedAt) renderScene();   // live oven countdown
  else if (scene.id === 'museum' && scene.mode === 'exped' && !expedState().picking && expedState().active.length) renderScene();
}, 1000);

/* ---------------- the Festival Cup: three matches at the fountain, no healing in between ----------------
   A new cup every week, named for the season. Your Spirit carries from one round to the next, a loss ends the run,
   and a clean sweep wins that week's trophy (shown at home) plus a big prize. Later sweeps that week pay Pebbles. */
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
  if (!cs.active) return sceneBtn('cup-enter', cs.trophy ? `🏆 Enter again (for Pebbles)` : `🏆 Enter the ${cupName()}`) + draft + chal + sceneBtn('leave', 'Head back out');
  const r = CUP_ROUNDS[cs.round], foe = cs.foes[cs.round];
  return sceneBtn('cup-play', `${r.icon} ${r.title}: ${foe.icon} ${foe.name} · you have ♥${cs.spirit}`) +
    sceneBtn('cup-quit', 'Withdraw (ends this run)') + sceneBtn('leave', 'Step away for now');
}
function cupIntro() {
  const cs = cupState();
  if (cs.active) return `The crowd is waiting for your ${CUP_ROUNDS[cs.round].title.toLowerCase()}. You carry ♥${cs.spirit} Spirit into it - there is no healing between rounds.`;
  return `The ${cupName()} is on this week! Win three matches in a row and the trophy is yours. Your Spirit carries over between rounds, so every point counts.${cs.trophy ? ' You already won this week\'s trophy - another sweep pays 🫧.' : ''}`;
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

/* ---------------- winning a cellar floor (called from the battle result screen) ---------------- */
function dungeonWin() {
  const npc = battle.npc, d = npc.dungeon, data = ensureDistrictData(d.district), st = data.buildings[d.id] || (data.buildings[d.id] = {});
  battle.rewarded = true;
  const f = cellarFloor(d.floor), icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  endCard.className = 'overlay-card';
  st.floor = d.floor + 1;
  const newBest = st.floor > (state.progress.cellarBest || 0);
  st.best = Math.max(st.best || 0, st.floor);
  state.progress.cellarBest = Math.max(state.progress.cellarBest || 0, st.floor);
  addPebbles(f.pebbles, 'cellar');
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
  if (f.deep && newBest) { logEvent('🕳️', `New cellar record: floor ${st.floor}.`); setTimeout(() => toast(`🕳️ New record: floor ${st.floor}`), 1200); }
  saveState();
  icon.textContent = f.final || f.guardian ? '🗝️' : '🕯️'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = f.final ? 'The cellar gives up its chest.' : f.guardian ? `${f.name} sinks back into the dark.` : `${f.name} steps aside.`;
  battleEndStats.innerHTML = `You won with <b>${Math.max(0, battle.G.p[0].spirit)}</b> Spirit left. <b>+${f.pebbles} 🫧</b>${cardLine}` +
    (f.final ? '<br><small>A crack behind the chest leads deeper…</small>' : f.deep ? `<br><small>Floor ${st.floor} cleared · deepest ${cellarBest()}</small>` : '');
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['✨', '🕯️', '🌿'], f.final || f.guardian ? 18 : 8);
  sfx(f.final || f.guardian ? 'mythic' : 'win'); buzz(HAP.win);
  bumpPill('pillWins');
}
// A loss (or a yield) on a deep floor ends the run.
function dungeonLoss() {
  const d = battle.npc.dungeon;
  if (!d || !d.deep) return false;
  const data = ensureDistrictData(d.district), st = data.buildings[d.id] || (data.buildings[d.id] = {});
  endCellarRun(st, 'the deep pushed back');
  return true;
}

/* ---------- graves: tap for the epitaph and a countdown ---------- */
function showGrave(f) {
  const left = graveLeft(f), boss = !!f.isBoss;
  showProp(boss ? '👑' : '🪦', `${f.name}'s resting place`, `${f.grave.epitaph} They will be back in about ${fmtLeft(left)}.`);
}


