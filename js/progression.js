/* ============================================================
   FIRST-TIME TIPS
   A short explanation the first time you meet each system. Shown once ever; if another popup is open it waits
   its turn rather than stacking on top.
   ============================================================ */
const TIPS = {
  altar:      { icon: '🕯️', title: 'The altar', text: 'In your cottage. Beat a district god, bring spare cards of their family, and the god can be summoned as a card. Once all four are home, something else may answer.' },
  trials:     { icon: '🔮', title: 'Trials', text: 'In the Tarot screen (Quiet Nook → Tarot → Trials), five foes each bring a Fate and a Spread of their own. Beat one for the first time to take home its Arcana card. They open in order, and they are meant to be hard.' },
  spread:     { icon: '🃏', title: 'Fate Spread', text: 'On the Deck screen, lay three cards as Past, Present and Future. Past is always in your opening hand, Present enters with a Haze, and Future arrives on your 4th turn. Three cards of one family give Harmony (+2 Calm); three different families give Contrast (+1 card).' },
  fate:       { icon: '🔮', title: 'Fate', text: 'Attune a Major Arcana (Quiet Nook → Tarot → The Arcana) and you can take its power into a match. Pick it on the keep-this-hand screen; a purple round button by your bar glows when it is ready. Each one works once per match, from its own turn, and most cost a little.' },
  fortune:    { icon: '🔮', title: "Madame Brume's tent", text: 'On El Mercado de Susurros from dusk until dawn. Brume gives your daily tarot reading, swaps one card once a day, tells you the story of your deck, and sells Arcana packs.' },
  tarot:      { icon: '🔮', title: 'Tarot', text: 'Once a day, draw three Arcana. Turn them all over and the middle card gives the day a fortune. The 22 Major Arcana are real cards from the game: own the card and you own the Arcana, and you can attune three for a small permanent perk.' },
  cellarRun:  { icon: '🕯️', title: 'The cellar', text: 'Every floor offers a few doors: a fight, a chest, a campfire, a shrine or a peddler, hidden in the dark: walk with your lantern and tap tiles to explore. Barrels hold Embers, a key opens the locked chest, rats dim the light and glowcaps brighten it. You have three hearts; losing a fight costs one, and at zero the run ends. Leaving does not end it.' },
  calm:       { icon: '🧘', title: 'The quiet nook', text: 'A few quiet things to do that score nothing and cost nothing: breathe, rake sand, watch the stars, drink tea, tend a bonsai. Five slow breaths leave you Rested for the day.' },
  path:       { icon: '🧭', title: 'Your path', text: 'Every level gives you a skill point. Spend them on Angler, Gardener, Duelist or Wanderer, and upgrade your rod, watering can and lantern with Embers. You can reset your points for free any time.' },
  bakery:     { icon: '🍞', title: 'The bakery', text: 'Put a loaf in the oven - it bakes in real time. Share bread with neighbors (one gift each per day) to grow your friendship, or cook with it.' },
  cook:       { icon: '🍳', title: 'Cooking', text: 'Harvests and fish land in your pantry. Cook them into dishes: give one as a gift (worth more than bread), eat it on the keep-this-hand screen for a head start, or bring one to a neighbor who asked.' },
  garden:     { icon: '🌱', title: 'Gardening', text: 'Buy seeds here, then tap a glowing patch of El Umbral to plant. Crops grow in real time (faster in the rain). Card seeds grow a card.' },
  puzzle:     { icon: '🧩', title: 'The daily puzzle', text: 'A fixed board: win it this turn. Ending your turn gives up and resets the board, so take your time. The first solve each day pays a card.' },
  cup:        { icon: '🏆', title: 'The Dreamers’ Cup', text: 'Three matches in a row. Your Calm carries over between rounds - there is no healing - and a loss ends the run. Sweep all three for the week\'s trophy.' },
  home:       { icon: '🏠', title: 'Your cottage', text: 'Your own place. Read letters in the mailbox, put decorations on the shelves, frame favourite cards, and see your trophies.' },
  lantern:    { icon: '🏮', title: 'The Lantern Market', text: 'Lumen only trades after dark: Night Packs full of moonlit cards, glowing decorations, and Embers for the critters in your jar.' },
  bugs:       { icon: '✨', title: 'Night critters', text: 'Glowing critters come out at night. Tap one to catch it - it goes in your jar for the Lantern Market and in the critter log under Cards → Fish.' },
  companion:  { icon: '👻', title: 'A companion', text: 'You can invite one wandering spirit to follow you. Each brings a small perk depending on its card. Let it go any time from your profile.' },
  companionPlay: { icon: '🙈', title: 'Play with your companion', text: "Tap your companion in town to play Hide and Seek right there on the map - it ducks behind a real spot nearby, so watch closely, then tap where it went from memory. Rounds get quicker and add more hiding spots the longer your streak runs." },
  cellarDeep: { icon: '🕳️', title: 'The deep cellar', text: 'From here on it is a run: a loss or climbing out ends it and the cellar rests. Every 5th floor is a guardian with a rare prize.' },
  rival:      { icon: '🎭', title: 'A rival', text: 'Rook moves between districts. Every win sends them off to build a stronger deck - eight chapters in all, with a unique final prize.' },
  friends:    { icon: '💞', title: 'Friendship', text: 'Favours, gifts and friendly wins earn hearts. At 3 hearts a neighbor plays their signature deck with you; at 5 they give you a keepsake.' },
  inspect:    { icon: '🔍', title: 'Look closer', text: 'Press and hold any card - in your collection, the deck, a battle or the Index - to see it large, with its full name, rules and story.' },
  spells:     { icon: '✨', title: 'Spell cards', text: 'Spells are cast from your hand for an instant effect and never take a board slot. Aimed spells ignore Watch.' },
  museum:      { icon: '🏛️', title: 'The Card Museum', text: 'Donate spare copies of cards to fill six wings. The museum never takes your last copy or one your deck uses. Each finished wing pays Embers and gives a keepsake decoration.' },
  expeditions: { icon: '🧭', title: 'Expeditions', text: 'Send up to three spare cards away for a while - two teams at once. Flicker cards travel faster, Watch cards keep the team safe, Startle cards find treasure, and stronger teams bring back more. Your cards come home with loot and a little mastery.' },
  trades:      { icon: '🤝', title: 'The trading board', text: 'Three new offers every morning: swap a spare for a card you have never had, bundle three spares for a rarer card, or sell one to a collector for three times its release value.' },
  challenges:  { icon: '🎯', title: 'Deck challenges', text: 'Three rules a day, like "only commons" or "no two cards the same". Win with a deck that follows the rule for a card prize. Keep a deck slot for challenges so switching is quick.' },
  minigames:  { icon: '🎲', title: 'Mini-games', text: 'Every house has a little game. Earn a bronze, silver or gold medal; the first three medals in each game every day pay Embers, and gold can turn up a card. Play as much as you like after that.' },
  lookaround: { icon: '🖐️', title: 'Look around', text: 'Drag the town map with your finger to look at the rest of the district. Tap the target button to bring the camera back to your character; walking somewhere does it too.' },
  forecast:   { icon: '🪧', title: 'The weather board', text: 'Signs show the forecast. Weather changes play: clear pays a little extra on daily tasks, cloudy doubles spirit XP, rain helps fishing and growing, storms boost Flicker cards, snow toughens bosses for richer prizes.' },
  events:     { icon: '📅', title: 'Daily town events', text: "One event runs each day, shown next to the district name - a Fishing Derby, Market Day, Harvest Fair and more, each bending the rules a little in your favor." },
  foils:      { icon: '✨', title: 'Foil cards', text: 'A shimmering foil is purely a collector\'s chase - the same card, just shinier. Your foil total shows at the top of Cards → Sets and in your cottage trophy case.' },
  townlife:   { icon: '🪑', title: 'Things to do around town', text: 'Props do things now: sit on benches, make a wish at wells, light lamps after dark, haggle, haul nets, water plants or busk for tips. Shake trees, skip stones, splash through puddles in the rain. Everything nudges the district\'s town mood - fill it up and the district dresses itself up for good.' },
  character:  { icon: '🧑', title: 'Your character', text: 'You and your companion stand on a backdrop you choose. Check your stats here, change how you look in Look, and see your bag, milestones and companion. Tap the 🎨 to jump to the backdrops, and tap a milestone with a 🏷️ title to wear it. Settings are behind your avatar at the top.' },
  fishing:    { icon: '🎣', title: 'Fishing', text: 'Pick a bait that suits the fish you want, then cast and watch the shadow: its size hints at the catch. When it bites, tap to hook it, then hold the button to reel. Keep the marker in the green and ease off when the fish runs. Nothing is lost if it gets away. Prefer simpler? Turn on Easy reeling in Settings.' },
  inventory:  { icon: '🎒', title: 'Your inventory', text: 'Everything you\'re carrying, in one place: pantry ingredients, cooked dishes, seeds and spare decorations. Tap Plant or Place to use one straight from the list.' },
};
function tipsSeen() { const p = state.progress; if (!p.tipsSeen || typeof p.tipsSeen !== 'object') p.tipsSeen = {}; return p.tipsSeen; }
let tipQueue = [];
function showTipOnce(id) {
  if (!TIPS[id] || tipsSeen()[id] || tipQueue.includes(id)) return;
  tipQueue.push(id);
  pumpTips();
}
function pumpTips() {
  const ov = document.getElementById('tipOverlay');
  if (!tipQueue.length || !ov.classList.contains('hidden')) return;
  // wait while something else is on screen (a card reveal, a level-up...), except the talk card and the battle
  if (document.querySelector('#pickupOverlay:not(.hidden), #levelUpOverlay:not(.hidden), #battleEndOverlay:not(.hidden), #mulliganOverlay:not(.hidden)')) { setTimeout(pumpTips, 1200); return; }
  const id = tipQueue.shift(), t = TIPS[id];
  tipsSeen()[id] = true; saveState();
  document.getElementById('tipIcon').textContent = t.icon;
  document.getElementById('tipTitle').textContent = t.title;
  document.getElementById('tipText').textContent = t.text;
  ov.classList.remove('hidden');
}
document.getElementById('tipOk').addEventListener('click', () => { document.getElementById('tipOverlay').classList.add('hidden'); sfx('tap'); setTimeout(pumpTips, 300); });

/* ---------------- leveling: XP for basically everything you do, steps included ---------------- */
const XP_PER_STAT = {
  steps: 0.25, summons: 120, cardsFound: 15, battlesWon: 40, bossesWon: 150, fishCaught: 18,
  favours: 30, spiritsMet: 10, districtsVisited: 60, decorationsPlaced: 12,
  breadBaked: 8, breadShared: 10, spellsCast: 3, seedsPlanted: 3, seedsFound: 5, cropsHarvested: 5, rivalWins: 60,
  minigamesPlayed: 5, minigameGolds: 10, talks: 1, foilsFound: 20,
  donations: 6, expeditionsDone: 25, tradesDone: 15, cardsGifted: 10, challengesWon: 40, setsCompleted: 60, masteryRanks: 15, charmsSet: 2,
  tossWins: 2, knacksUsed: 3, draftWins: 20, draftClears: 60, ghostWins: 6, townActs: 3, townGames: 8, puddles: 1, stonesSkipped: 1,
  dishesCooked: 10, dishesGiven: 10, snacksEaten: 2, puzzlesSolved: 40, cupRoundsWon: 30, cupTrophies: 100, bugsCaught: 8, lettersRead: 2,
};
/* ============================================================
   PEBBLE LEDGER (v1.87.0)
   Every Ember earned or spent is tagged with where it came from (addPebbles(n, 'fishing'), spendPebbles(n, 'packs')) and
   counted in state.progress.econ, together with active play time, so "is the economy too generous?" can be answered with
   numbers instead of feel. Nothing here changes any amount. The report is in Settings -> Ember ledger, is attached to
   feedback/bug reports (testerInfo), and `econReport()` can be called from the console. Add a tag whenever a new
   source or sink is added; an untagged one lands in 'other'.
   ============================================================ */
function econState() {
  const p = state.progress;
  if (!p.econ || typeof p.econ !== 'object') p.econ = { since: Date.now(), activeMs: 0, earn: {}, spend: {}, day: null, dayEarn: {}, daySpend: {} };
  const e = p.econ, t = todayKey();
  if (e.day !== t) { e.day = t; e.dayEarn = {}; e.daySpend = {}; }
  return e;
}
function econNote(n, src) {
  if (!n || !state || !state.progress) return;
  const e = econState(), k = src || 'other', a = Math.abs(n), side = n > 0 ? 'earn' : 'spend';
  e[side][k] = (e[side][k] || 0) + a;
  e[side === 'earn' ? 'dayEarn' : 'daySpend'][k] = (e[side === 'earn' ? 'dayEarn' : 'daySpend'][k] || 0) + a;
}
function spendPebbles(n, src) { state.progress.pebbles -= n; econNote(-n, src); }
// Active play time: only counted while the page is visible.
setInterval(() => { if (typeof state !== 'undefined' && state && state.progress && !document.hidden) econState().activeMs += 5000; }, 5000);
function econReport() {
  const e = econState(), hours = Math.max(e.activeMs / 3600000, 1 / 60);
  const rows = m => Object.entries(m).map(([src, total]) => ({ src, total, perHour: total / hours })).sort((a, b) => b.total - a.total);
  const earn = rows(e.earn), spend = rows(e.spend), tE = earn.reduce((s, r) => s + r.total, 0), tS = spend.reduce((s, r) => s + r.total, 0);
  return { hours: +hours.toFixed(2), earned: tE, spent: tS, earnedPerHour: Math.round(tE / hours), spentPerHour: Math.round(tS / hours), earn, spend, today: { earn: e.dayEarn, spend: e.daySpend } };
}
function econSummaryText() {
  const r = econReport(); if (!r.earned && !r.spent) return '';
  const top = list => list.slice(0, 4).map(x => `${x.src} ${x.total}`).join(', ');
  return `Embers over ${r.hours}h: earned ${r.earned} (${r.earnedPerHour}/h) [${top(r.earn)}] · spent ${r.spent} [${top(r.spend)}]`;
}
// Soft daily limits (v1.87.0): the more of one activity's Embers you have already earned today, the less the next ones pay.
// Full pay up to `softCap` Embers a day, half up to double that, a quarter beyond. It is read straight from the ledger, so it
// follows the same tags as addPebbles(n, src), and it resets with the day. It keeps a repeatable activity (fishing, the cup,
// drafts, crops) from being the answer to everything, without ever stopping it or touching its other rewards.
function econTaper(src, n, softCap) {
  const e = econState(), done = e.dayEarn[src] || 0;
  const out = done < softCap ? n : done < softCap * 2 ? Math.round(n / 2) : Math.round(n / 4);
  if (out < n) {
    if (!e.dayTaper) e.dayTaper = {};
    if (!e.dayTaper[src]) { e.dayTaper[src] = true; setTimeout(() => toast(`🫧 You've earned plenty from ${src} today - it pays a little less now`), 900); }
  }
  return Math.max(n > 0 ? 1 : 0, out);
}
// Features that unlock with the Keeper's level (v1.87.0). Districts and Knacks carry their own levels
// (DISTRICTS[x].unlockLevel, BattleEngine.KNACKS[x].level); upcomingUnlocks() merges all three for the Character tab.
const FEATURE_LEVELS = {
  draft: { level: 5, icon: '🎴', name: 'Draft Run' },
  ghost: { level: 8, icon: '👻', name: 'Ghost duels' },
  spread: { level: 6, icon: '🃏', name: 'Fate Spread' }
};
function featureLocked(id) { return ensureLevel().level < FEATURE_LEVELS[id].level; }
function featureLockText(id) { const f = FEATURE_LEVELS[id]; return `${f.icon} ${f.name} unlocks at level ${f.level}`; }
function unlocksBetween(from, to) {
  const out = [];
  Object.values(FEATURE_LEVELS).forEach(f => { if (f.level > from && f.level <= to) out.push({ level: f.level, icon: f.icon, text: f.name }); });
  Object.values(BattleEngine.KNACKS).forEach(k => { if (k.level > from && k.level <= to) out.push({ level: k.level, icon: k.icon, text: `Knack: ${k.name}` }); });
  Object.values(DISTRICTS).forEach(d => { if (d.unlockLevel > from && d.unlockLevel <= to && d.unlockWins > 0) out.push({ level: d.unlockLevel, icon: '🗺️', text: d.name }); });
  return out.sort((a, b) => a.level - b.level);
}
// Keeper's Knack (BattleEngine.KNACKS): unlocked by Keeper level, one is picked for each match.
function knackUnlocked(id) { const k = BattleEngine.KNACKS[id]; return !!k && ensureLevel().level >= k.level; }
function currentKnackId() { const id = state.progress.knack; return id && knackUnlocked(id) ? id : 'forage'; }
function chooseKnack(id) { if (!knackUnlocked(id)) return false; state.progress.knack = id; saveState(); return true; }
function xpToNext(level) { return 60 + (level - 1) * 40; }   // a steady, gentle climb
function ensureLevel() {
  const pr = state.progress;
  if (typeof pr.level !== 'number') pr.level = 1;
  if (typeof pr.xp !== 'number') pr.xp = 0;
  return pr;
}
function addXP(amount) {
  if (!amount) return;
  if (hasPerk('xp')) amount *= 1.1;
  amount *= 1 + cardBonus('xp');
  if (eventIs('double-xp')) amount *= 2;
  const pr = ensureLevel();
  pr.xp += amount;
  let levelsGained = 0, bonusLevel = null; const levelBefore = pr.level;
  while (pr.xp >= xpToNext(pr.level)) {
    pr.xp -= xpToNext(pr.level);
    pr.level++;
    levelsGained++;
    if (pr.level % 5 === 0) bonusLevel = pr.level;
  }
  if (levelsGained > 0) {
    const pebbleGain = levelsGained * 5;
    addPebbles(pebbleGain, 'levelup');
    let bonusCardId = null;
    if (bonusLevel) { bonusCardId = randomCardId('rare'); state.ownedCards.push(bonusCardId); noteCardsFound(1); }
    showLevelUp(pr.level, pebbleGain, bonusCardId);
    const fresh = unlocksBetween(levelBefore, pr.level);       // "🔓" notices for whatever this level opened up
    if (fresh.length) setTimeout(() => toast('🔓 Unlocked: ' + fresh.map(u => `${u.icon} ${u.text}`).join(' · ')), 2200);
  }
  updateLevelHud();
}
function updateLevelHud() {
  const pr = ensureLevel();
  const need = xpToNext(pr.level), pct = Math.max(0, Math.min(100, (pr.xp / need) * 100));
  const badge = document.getElementById('hudLevelBadge');
  const fill = document.getElementById('hudXpFill');
  if (badge) badge.textContent = pr.level;
  if (fill) fill.style.width = pct + '%';
  const ring = document.getElementById('hudRing'); if (ring) ring.style.setProperty('--p', pct.toFixed(1));
  const pmBadge = document.getElementById('pmLevelBadge'), pmText = document.getElementById('pmXpText'), pmFill = document.getElementById('pmXpFill');
  if (pmBadge) pmBadge.textContent = 'Lv ' + pr.level;
  if (pmText) pmText.textContent = `${Math.floor(pr.xp)} / ${need} XP`;
  if (pmFill) pmFill.style.width = pct + '%';
}
function showLevelUp(level, pebbles, bonusCardId) {
  logEvent('⭐', `Reached Level ${level}.`);
  document.getElementById('levelUpNum').textContent = level;
  const desc = document.getElementById('levelUpDesc');
  desc.innerHTML = `You reached <b>Level ${level}</b>!<br>+${pebbles} 🫧 Embers` + (bonusCardId ? `<br><b>A bonus card is waiting for you.</b>` : '');
  sparkleBurst(document.getElementById('levelUpSparkles'), ['⭐', '✨', '🌟'], 16);
  document.getElementById('levelUpOverlay').classList.remove('hidden');
  sfx('claim'); buzz(HAP.win);
  document.getElementById('levelUpContinue').onclick = () => {
    document.getElementById('levelUpOverlay').classList.add('hidden');
    if (bonusCardId) setTimeout(() => showCardReveal(bonusCardId, `Level ${level} bonus card`, true), 200);
  };
}

const townGrid = document.getElementById('townGrid');
const townPanel = document.getElementById('townPanel');
const journalPanel = document.getElementById('journalPanel');
const collectionPanel = document.getElementById('collectionPanel');
const deckPanel = document.getElementById('deckPanel');
const shopPanel = document.getElementById('shopPanel');
const questsPanel = document.getElementById('questsPanel');
const battleView = document.getElementById('battleView');
const townLog = document.getElementById('townLog');
const districtNameEl = document.getElementById('districtName');
const seasonTagEl = document.getElementById('seasonTag');

const cardCountEl = document.getElementById('cardCount');
const winCountEl = document.getElementById('winCount');
const deckSizeHudEl = document.getElementById('deckSizeHud');
const pebbleCountEl = document.getElementById('pebbleCount');
const avatarChipEmoji = document.getElementById('avatarChipEmoji');
const avatarChipName = document.getElementById('avatarChipName');
const deckFillBarEl = document.getElementById('deckFillBar');
const pillDeckEl = document.getElementById('pillDeck');

const eventLogList = document.getElementById('eventLogList');
const collectionList = document.getElementById('collectionList');
const deckList = document.getElementById('deckList');

const pickupOverlay = document.getElementById('pickupOverlay');
const pickupTitle = document.getElementById('pickupTitle');
const pickupDesc = document.getElementById('pickupDesc');

const sceneryOverlay = document.getElementById('sceneryOverlay');
const sceneryIcon = document.getElementById('sceneryIcon');
const sceneryTitle = document.getElementById('sceneryTitle');
const sceneryDesc = document.getElementById('sceneryDesc');

const battleEndOverlay = document.getElementById('battleEndOverlay');
const battleEndTitle = document.getElementById('battleEndTitle');
const battleEndStats = document.getElementById('battleEndStats');


const tabs = {
  town: { btn: document.getElementById('tabTown'), panel: townPanel },
  journal: { btn: document.getElementById('tabJournal'), panel: journalPanel },
  collection: { btn: document.getElementById('tabCollection'), panel: collectionPanel },
  shop: { btn: document.getElementById('tabShop') || document.createElement('button'), panel: shopPanel },
  quests: { btn: document.getElementById('tabQuests'), panel: questsPanel },
  character: { btn: document.getElementById('tabCharacter'), panel: document.getElementById('characterPanel') }
};

function cardDef(id) { return BattleEngine.defOf(id); }

// A small, stable flavor line per card - picked deterministically from the card's id so it never changes
// between views, without hand-authoring one for every card in the pool.
const CARD_STORY_TEMPLATES = {
  common: [
    "A humble find, but every deck needs a few of these.",
    "Nothing fancy - just steady, reliable {name}.",
    "You've probably walked past a dozen of these without noticing.",
    "Common where you'd expect, and always useful in a pinch.",
    "{name} doesn't ask for much attention, and rarely gets any.",
  ],
  rare: [
    "Not every day you come across a {name}.",
    "Keep an eye out - {name} doesn't show up twice in the same spot.",
    "There's a little more shine to {name} than the everyday finds.",
    "{name} has a way of turning a plain match into a memorable one.",
  ],
  ultra: [
    "Few decks are lucky enough to carry a {name}.",
    "{name} is the kind of card people remember pulling.",
    "Word travels fast when someone finds a {name}.",
    "There's a reason {name} makes people stop and look twice.",
  ],
  super: [
    "{name} is spoken about more than it's actually seen.",
    "A genuine rarity - {name} turns heads across town.",
    "Some collectors chase {name} for months without luck.",
  ],
  mythic: [
    "{name} might be the rarest thing in all of Tile RPG.",
    "Legends get told about cards like {name}.",
    "There may only be a handful of {name} in the whole town.",
  ],
};
function cardStory(def) {
  const pool = CARD_STORY_TEMPLATES[def.rarity] || CARD_STORY_TEMPLATES.common;
  let h = 0; for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) >>> 0;
  return pool[h % pool.length].replace(/\{name\}/g, def.name);
}
// Every base card the person has ever held: what they own now (a crafted card counts as its original) plus anything since crafted away.
function discoveredSet() {
  const set = new Set(state.progress.discovered || []);
  state.ownedCards.forEach(id => set.add(BattleEngine.baseIdOf(id)));
  return set;
}   // plain cards and crafted variants (e.g. 'sprout~p')
function kwIcons(def) { return def.spell ? '✨' : def.kw.map(k => KW[k].icon).join(' '); }
function kwLines(def) {
  const fam = def.spell ? null : FAMILIES[CARD_FAMILY[BattleEngine.baseIdOf(def.id)]];
  return def.kw.map(k => `${KW[k].icon} <b>${KW[k].name}.</b> ${KW[k].text}`).concat(fam ? [`${fam.icon} <b>${fam.name} family.</b> Kin cards grow with their family.`] : []).join('<br>');
}
// Spells have no power/health, so every place that prints a card's stats or rules text goes through these.
function spellText(def) { return def && def.spell ? BattleEngine.SPELLS[def.spell].text : ''; }
function cardStatsText(def) { return def.spell ? '✨ Spell' : `⚔${def.power} ♥${def.grit}`; }
function hasAbility(def) { return !!def.spell || def.kw.length > 0 || !!CARD_FAMILY[BattleEngine.baseIdOf(def.id)]; }
function cardAbilityHtml(def) { return def.spell ? `✨ <b>Spell.</b> ${spellText(def)}` : kwLines(def); }

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let migrated = false;
    if (!raw) {
      raw = localStorage.getItem(OLD_STORAGE_KEY);   // v3 save: carry it forward
      migrated = !!raw;
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.playerPos) state = Object.assign(state, parsed);
    }
    // v3 saves (and any partial save) have no progress block: give them one
    if (!state.progress || typeof state.progress !== 'object') state.progress = freshProgress();
    const fp = freshProgress();
    Object.keys(fp).forEach(k => { if (state.progress[k] === undefined) state.progress[k] = fp[k]; });
    Object.keys(fp.totals).forEach(k => { if (state.progress.totals[k] === undefined) state.progress.totals[k] = 0; });
    if (typeof state.progress.pebbles !== 'number' || state.progress.pebbles < 0) state.progress.pebbles = 0;
    // Sky/weather: give old saves fresh defaults, and never resume the clock from a stale timestamp
    if (!state.sky || typeof state.sky.elapsedMs !== 'number') state.sky = { elapsedMs: 8 * 60 * 1000, lastTickAt: null };
    state.sky.lastTickAt = null;
    if (!state.weather || typeof state.weather.current !== 'string') state.weather = { current: 'clear', changesAt: 0, elapsed: 0 };
    // Older saves may have a weather.changesAt scheduled against the wrapping sky clock (the bug that could
    // freeze weather forever); resetting elapsed/changesAt here forces an immediate, correct reroll.
    if (typeof state.weather.elapsed !== 'number') { state.weather.elapsed = 0; state.weather.changesAt = 0; }
    if (state.weather.current === 'fog') state.weather.current = 'cloudy';   // fog was removed
    if (state.weather.next === 'fog') state.weather.next = null;
    if (!state.decorationInventory || typeof state.decorationInventory !== 'object') state.decorationInventory = {};
    // Character: old saves may have a `hat` field, and border/borderStyle from before cosmetics moved to
    // the simpler emoji+accessory+color system - drop all three, they're unused now.
    if (!state.character || typeof state.character !== 'object') state.character = { emoji: '🧑', color: '#a8d4cc', accessory: '', name: 'You' };
    // Text that ends up in the page (and in other players' lists) is kept short and plain, whatever a save file says.
    if (typeof state.character.name !== 'string') state.character.name = 'You';
    state.character.name = state.character.name.slice(0, 16);
    if (typeof state.character.emoji !== 'string' || !state.character.emoji || state.character.emoji.length > 8) state.character.emoji = '🧑';
    delete state.character.hat;
    delete state.character.border;
    delete state.character.borderStyle;
    if (typeof state.character.accessory !== 'string') state.character.accessory = '';
    ensureCosmeticUnlocks();
    if (migrated) {
      // Credit past wins so migrated players don't start their milestones from zero
      state.progress.totals.battlesWon = Math.max(state.progress.totals.battlesWon, state.wins || 0);
      state.progress.totals.cardsFound = Math.max(state.progress.totals.cardsFound, (state.ownedCards || []).length);
      saveState();
    }
  } catch (e) { /* ignore */ }
}

// saveState() is called very often (several times per action in places) - the JSON.stringify + localStorage
// write is real synchronous work on the whole state tree, so bursts of calls are coalesced into one write
// every SAVE_STATE_DEBOUNCE_MS rather than writing on every single call (the same lesson cloud-save.js's
// own cloudSaveDebounced already applied to the Firestore side). Flushed immediately when the tab is hidden
// or unloaded so nothing is lost if the player switches away or closes the game mid-debounce.
const SAVE_STATE_DEBOUNCE_MS = 600;
let saveStateTimer = null, saveStatePending = false;
function saveState() {
  // the active deck slot always mirrors the live deck, whichever screen changed it
  if (Array.isArray(state.deckSlots) && state.deckSlots[state.activeDeckSlot]) state.deckSlots[state.activeDeckSlot].cards = state.deck.slice();
  saveStatePending = true;
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(flushSaveState, SAVE_STATE_DEBOUNCE_MS);
  if (typeof cloudSaveDebounced === 'function') cloudSaveDebounced();   // optional Firestore backup - see js/cloud-save.js
}
function flushSaveState() {
  if (!saveStatePending) return;
  saveStatePending = false;
  clearTimeout(saveStateTimer);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSaveState(); });
window.addEventListener('pagehide', flushSaveState);

function rollRarity(forBoss, wins) {
  const w = Math.min(wins != null ? wins : state.wins, 12);      // `wins` lets a Draft Run pick its own difficulty instead of yours
  if (forBoss) {
    const mythicChance = 0.15 + w * 0.02;
    return Math.random() < mythicChance ? 'mythic' : 'super';
  }
  const mythicChance = 0.01 + w * 0.004;
  const superChance = 0.04 + w * 0.01;
  const ultraChance = 0.12 + w * 0.015;
  const rareChance = 0.30 + w * 0.01;

  const r = Math.random();
  if (r < mythicChance) return 'mythic';
  if (r < mythicChance + superChance) return 'super';
  if (r < mythicChance + superChance + ultraChance) return 'ultra';
  if (r < mythicChance + superChance + ultraChance + rareChance) return 'rare';
  return 'common';
}

// Battle rewards are always a real prize: neighbors give rare or better, bosses give super or better.
// (Ground finds and packs keep their own odds.) Better odds as you win more.
function rollRewardRarity(forBoss) {
  if (forBoss) return rollRarity(true);
  const w = Math.min(state.wins, 12);
  const mythic = 0.02 + w * 0.004, sup = 0.06 + w * 0.01, ultra = 0.20 + w * 0.015;
  const r = Math.random();
  if (r < mythic) return 'mythic';
  if (r < mythic + sup) return 'super';
  if (r < mythic + sup + ultra) return 'ultra';
  return 'rare';
}
function rewardFloor(isBoss) { return isBoss ? 'super' : 'rare'; }
// Each district's boss bends one rule of the match (see BattleEngine.TWISTS).
const BOSS_TWIST = { square: 'roots', market: 'wall', harbor: 'tide', garden: 'bloom' };
function bossTwistFor(opponent) {
  if (!opponent || !opponent.isBoss || opponent.dungeon || !/^boss-/.test(opponent.id || '')) return null;
  return BOSS_TWIST[opponent.id.slice(5)] || null;
}
// Snow's "richer rewards": roll the prize a second time and keep whichever is rarer.
function snowUpgrade(cardId, isBoss) {
  const alt = randomCardId(rollRewardRarity(isBoss));
  return RARITY_ORDER.indexOf(cardDef(alt).rarity) > RARITY_ORDER.indexOf(cardDef(cardId).rarity) ? alt : cardId;
}
// Older saves may hold a common reward; swap it for a proper one. Runs at the moment of victory, so it can never be missed.
function ensureRewardTier(npc) {
  const def = npc.rewardCard && cardDef(npc.rewardCard);
  if (!def || RARITY_ORDER.indexOf(def.rarity) < RARITY_ORDER.indexOf(rewardFloor(!!npc.isBoss))) npc.rewardCard = randomCardId(rollRewardRarity(!!npc.isBoss));
  return npc.rewardCard;
}
function migrateRewardsV2() {
  const pr = state.progress;
  if (pr.rewardsV2) return;
  pr.rewardsV2 = true;
  Object.values(state.districtData || {}).forEach(d => {
    (d.npcs || []).forEach(n => { n.isBoss = false; ensureRewardTier(n); });
    if (d.boss) { d.boss.isBoss = true; ensureRewardTier(d.boss); }
  });
  saveState();
}
// Drops anything that isn't a real card (a damaged save, or a crafted id that no longer parses) so nothing can crash a screen.
function sanitizeCards() {
  if (!Array.isArray(state.ownedCards)) state.ownedCards = [];
  if (!Array.isArray(state.deck)) state.deck = [];
  state.ownedCards = state.ownedCards.filter(id => !!cardDef(id));
  state.deck = state.deck.filter(id => !!cardDef(id));
  if (!Array.isArray(state.progress.discovered)) state.progress.discovered = [];
}

// only: 'spell' limits the draw to spells (the Spellbook Pack). Cards marked `exclusive` (cellar or rival prizes)
// never come out of the ordinary pools - they are handed out only by the thing that owns them.
function cardPool(rarity, only) {
  return CARD_POOL.filter(c => c.rarity === rarity && !c.exclusive && (only !== 'spell' || c.spell));
}
function randomCardId(rarity, only) {
  let pool = cardPool(rarity, only);
  if (!pool.length && only) for (let i = RARITY_ORDER.indexOf(rarity); i >= 0 && !pool.length; i--) pool = cardPool(RARITY_ORDER[i], only);
  const usePool = pool.length ? pool : cardPool('common');
  return seasonalPick(usePool).id;
}
// In-season cards are three times as likely as the rest of their rarity.
function seasonalPick(pool) {
  const w = pool.map(c => (inSeason(c.id) ? 3 : 1)), total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

// Ambient town finds (ground items, hidden finds): almost always common, rarely a rare - the exciting
// pulls are meant to come from battles, not from strolling around. Weighted toward cards already owned
// so the Almanac fills out with duplicates instead of racing to one-of-everything.
function rollTownFindRarity() { return Math.random() < 0.12 ? 'rare' : 'common'; }
function weightedTownCardId(rarity) {
  const pool = cardPool(rarity);
  const usePool = pool.length ? pool : cardPool('common');
  const owned = new Set(state.ownedCards);
  const weighted = [];
  usePool.forEach(c => { const w = (owned.has(c.id) ? 4 : 1) * (inSeason(c.id) ? 3 : 1); for (let i = 0; i < w; i++) weighted.push(c.id); });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// Cheap everyday cards every opponent can draw on, so their decks always have a playable early game.
const BASE_COMMONS = ['sprout','sprout','sprout','pebble','pebble','pebble','origami-crane','origami-crane','origami-crane','droplet','droplet','toadstool','toadstool','bubble','flintstone','firefly'];

// Opponent decks are built the same way the Deck's Auto-fill builds yours: from a pool of cards, with a healthy cost curve.
/* Opponent decks used to be a plain pool of random cards, which made neighbors and the old cellar floors easy.
   They now scale with a "foe tier" (1 gentle .. 4 boss) and get two things a normal deck doesn't:
     - Foe cards: unique cards only opponents carry (FOE_CARDS). Each neighbor is seeded by their name, so the same
       neighbor keeps fielding the same few uniques and can be learned.
     - Enhanced cards: the same crafted "+" versions the Workshop makes (+1 power or +1 grit, sometimes with an extra
       keyword), swapped in for some of the ordinary cards.
   Tuned by simulation against a normal player deck - see HANDOFF §5's Balance note. */
const FOE_COUNT = [1, 1, 1, 2], FOE_ENHANCED = [2, 3, 3, 3], FOE_SKILL_CHANCE = [0, 0.2, 0.3, 0.4];
const FOE_SKILLS = ['guard', 'swift', 'shield', 'mend', 'thorns', 'drain', 'rally', 'echo', 'seed', 'sting', 'lull'];
function foeTierFor(isBoss) {
  const w = state.wins;
  if (isBoss) return w < 5 ? 3 : 4;
  return w < 3 ? 1 : w < 8 ? 2 : 3;
}
function foeSeedHash(str) { let h = 7; str = String(str || ''); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
// The family a district's neighbors and boss favour (FAMILIES in js/data-and-engine.js), or null for an unknown district.
function districtFamily(key) { return Object.keys(FAMILIES).find(f => FAMILIES[f].district === key) || null; }
function familyCardId(fam, rarity) {
  const all = CARD_POOL.filter(c => !c.spell && !c.exclusive && CARD_FAMILY[c.id] === fam);
  const same = all.filter(c => c.rarity === rarity);
  return seasonalPick(same.length ? same : all).id;
}
function buildDeckForOpponent(count, forBoss, tier, seed, district, wins) {
  tier = Math.max(1, Math.min(4, tier || foeTierFor(forBoss)));
  const rarityFor = () => {
    const r = Math.random();
    if (tier <= 3) return rollRarity(false, wins);
    return r < 0.35 ? 'super' : (Math.random() < 0.55 ? 'ultra' : 'rare');
  };
  // A district's folk lean on their family (Recuerdo in El Umbral, Susurro in El Mercado de Susurros, Deriva in the Harbor, Grove in the
  // Garden): the everyday commons shrink to that family's, and about half the picks come from it.
  const fam = districtFamily(district);
  const pool = BASE_COMMONS.filter(id => !fam || !CARD_FAMILY[id] || CARD_FAMILY[id] === fam);
  if (fam) for (let i = 0; i < 6; i++) pool.push(familyCardId(fam, Math.random() < 0.7 ? 'common' : 'rare'));
  for (let i = 0; i < 14; i++) pool.push(fam && i % 2 === 0 ? familyCardId(fam, rarityFor()) : randomCardId(rarityFor()));
  const counts = {};
  pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return foeEnhanceDeck(BattleEngine.suggestDeck(counts), tier, seed);
}
function foeEnhanceDeck(deck, tier, seed, extra) {
  deck = deck.slice();
  extra = extra || {};
  const def = id => BattleEngine.defOf(id);
  // Unique foe cards: a small, name-seeded set for this opponent, each swapped in for a similarly priced card.
  const fp = FOE_CARDS.filter(c => c.tier <= tier);
  const h = foeSeedHash(seed);
  const picks = [];
  for (let i = 0; i < (extra.foeCount != null ? extra.foeCount : FOE_COUNT[tier - 1]) && fp.length; i++) {
    // the opponent's own favourites come from their seed; later slots (and unseeded opponents) are random
    const c = seed != null && i < 2 ? fp[(h + i * 7) % fp.length] : fp[Math.floor(Math.random() * fp.length)];
    if (!picks.includes(c)) picks.push(c);
  }
  picks.forEach(fc => {
    const slots = deck.map((id, i) => i).filter(i => !def(deck[i]).foe && !def(deck[i]).spell && Math.abs(def(deck[i]).cost - fc.cost) <= 1);
    if (slots.length) deck[slots[Math.floor(Math.random() * slots.length)]] = fc.id;
  });
  // Enhanced cards: crafted "+" variants of ordinary cards.
  const free = deck.map((id, i) => i).filter(i => { const d = def(deck[i]); return !d.foe && !d.spell; });
  const swaps = shuffledArr(free).slice(0, extra.enhanced != null ? extra.enhanced : FOE_ENHANCED[tier - 1]);
  swaps.forEach(i => {
    const base = def(deck[i]), st = Math.random() < 0.5 ? 'p' : 'g';
    let sk = '';
    if (Math.random() < (extra.skill != null ? extra.skill : FOE_SKILL_CHANCE[tier - 1]) && base.kw.length < BattleEngine.MAX_KEYWORDS) {
      const opts = FOE_SKILLS.filter(k => !base.kw.includes(k));
      sk = opts[Math.floor(Math.random() * opts.length)];
    }
    let vid = BattleEngine.variantId(deck[i], st, sk);
    if (!def(vid)) vid = BattleEngine.variantId(deck[i], st, '');
    if (def(vid)) deck[i] = vid;
  });
  return deck;
}

// How hard an opponent is: chosen at battle time from how many battles you have won.
// Difficulty is tuned by simulation (see the notes with the game). Friendly neighbors start with less Calm.
// Regular neighbors: gentle -> normal -> sharp as you win more. Bosses: normal, then sharp from 5 wins, with full-strength Calm.
function opponentProfile(isBoss) {
  const w = state.wins;
  if (isBoss) return w < 5 ? { level: 'normal', spirit: 18 } : { level: 'smart', spirit: 20 };
  if (w < 3) return { level: 'gentle', spirit: 15 };
  return w < 8 ? { level: 'normal', spirit: 17 } : { level: 'smart', spirit: 18 };
}
