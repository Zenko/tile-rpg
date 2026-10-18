/* ============================================================
   FIRST-TIME TIPS
   A short explanation the first time you meet each system. Shown once ever; if another popup is open it waits
   its turn rather than stacking on top.
   ============================================================ */
// TIPS: in content/guide.js (the game's words and data, kept apart from the code)
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
  if (document.querySelector('#pickupOverlay:not(.hidden), #levelUpOverlay:not(.hidden), #battleEndOverlay:not(.hidden), #mulliganOverlay:not(.hidden), #sceneOverlay:not(.hidden)')) { setTimeout(pumpTips, 1200); return; }
  if (storyFirstBeatPending()) { setTimeout(pumpTips, 1200); return; }   // js/scenes.js: Wren speaks before the first tip
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
  steps: 0.25, summons: 120, atlasWins: 80, atlasGames: 20, cardsFound: 15, battlesWon: 40, bossesWon: 150, fishCaught: 18,
  favours: 30, spiritsMet: 10, districtsVisited: 60, decorationsPlaced: 12,
  breadBaked: 8, breadShared: 10, spellsCast: 3, seedsPlanted: 3, seedsFound: 5, cropsHarvested: 5, rivalWins: 60,
  minigamesPlayed: 5, minigameGolds: 10, talks: 1, foilsFound: 20,
  donations: 6, expeditionsDone: 25, tradesDone: 15, cardsGifted: 10, challengesWon: 40, setsCompleted: 60, masteryRanks: 15, charmsSet: 2,
  tossWins: 2, knacksUsed: 3, draftWins: 20, draftClears: 60, ghostWins: 6, townActs: 3, townGames: 8, puddles: 1, puddleWorlds: 8, puddleWins: 12, portalsEntered: 10, riftRows: 20, dailyRifts: 10, stillMotes: 1, crafts: 6, craftSkills: 9, craftFails: 3, forgeFlawless: 4, masterworks: 12, portalFed: 1, portalsCrafted: 25, portalFizzles: 4, portalStonesUsed: 2, portalsHunted: 6, craftFoils: 10, craftsHelped: 1, craftMeterFull: 5, sketches: 4, sketchPerfect: 4, sketchClears: 10, stonesSkipped: 1,
  dishesCooked: 10, dishesGiven: 10, snacksEaten: 2, puzzlesSolved: 40, cupRoundsWon: 30, cupTrophies: 100, bugsCaught: 8, lettersRead: 2, homeVisitors: 30,
  gossipHeard: 1, papersRead: 3, moments: 6, townGoals: 120, visitorsMet: 8, visitorBuys: 10, visitorWins: 40,
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
  return `${GAME.currency.many} over ${r.hours}h: earned ${r.earned} (${r.earnedPerHour}/h) [${top(r.earn)}] · spent ${r.spent} [${top(r.spend)}]`;
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
  ghost: { level: 8, icon: '👻', name: 'Lingering duels' },
  spread: { level: 6, icon: '🃏', name: 'Fate Spread' }
};
function featureLocked(id) { return ensureLevel().level < FEATURE_LEVELS[id].level; }
function featureLockText(id) { const f = FEATURE_LEVELS[id]; return `${f.icon} ${f.name} unlocks at level ${f.level}`; }
function unlocksBetween(from, to) {
  const out = [];
  Object.values(FEATURE_LEVELS).forEach(f => { if (f.level > from && f.level <= to) out.push({ level: f.level, icon: f.icon, text: f.name }); });
  Object.values(BattleEngine.KNACKS).forEach(k => { if (k.level > from && k.level <= to) out.push({ level: k.level, icon: k.icon, text: `Gift: ${k.name}` }); });
  Object.values(DISTRICTS).forEach(d => { if (d.unlockLevel > from && d.unlockLevel <= to && d.unlockWins > 0) out.push({ level: d.unlockLevel, icon: '🗺️', text: d.name }); });
  return out.sort((a, b) => a.level - b.level);
}
// Dreamer’s Gift (BattleEngine.KNACKS): unlocked by Dreamer level, one is picked for each match.
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
  desc.innerHTML = `You reached <b>Level ${level}</b>!<br>+${pebbles} 🫧 ${GAME.currency.many}` + (bonusCardId ? `<br><b>A bonus card is waiting for you.</b>` : '');
  sparkleBurst(document.getElementById('levelUpSparkles'), ['⭐', '✨', '🌟'], 16);
  if (typeof pfxLoot !== 'undefined') pfxLoot = { html: '\u2B50', r: 'super' };
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

// CARD_STORY_TEMPLATES: in content/cards.js (the game's words and data, kept apart from the code)
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); saveFailWarned = false; }
  catch (e) { warnSaveFailed('This device could not store your save (its storage may be full).', true); }
}
// A save that cannot be written used to fail silently, so progress just stopped being kept. Now the player is told, at most once
// every 5 minutes so it cannot nag, and the Settings backup line (cloudSetStatus) says so as well.
let saveFailWarned = false, saveFailAt = 0;
function warnSaveFailed(why, local) {
  if (saveFailWarned && Date.now() - saveFailAt < 5 * 60 * 1000) return;
  saveFailWarned = true; saveFailAt = Date.now();
  if (typeof toast === 'function') toast('⚠️ ' + why + (local ? ' Progress since the last good save may be lost.' : ''));
  if (typeof cloudSetStatus === 'function') cloudSetStatus('Save problem: ' + why);
  if (typeof teleInc === 'function') { try { teleInc('save.failed'); } catch (e2) { /* ignore */ } }
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
  if (opponent && opponent.atlas) return opponent.atlas.twist;     // the Atlas's challenges (js/atlas.js)
  if (opponent && opponent.depth && opponent.district) return BOSS_TWIST[opponent.district] || null;   // a Depth fight keeps the boss's own twist (js/depth.js)
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
  // Cards that were cut from the game (the 100-card pool) can still be named by an older save in places other than the collection.
  const pr = state.progress, known = id => !!(id && cardDef(id));
  if (state.companion) {                  // old saves hold a card companion with no kind; neighbours and bosses carry their own record
    const c = state.companion, kind = c.kind || 'card';
    const bad = typeof c !== 'object' || !['card', 'npc', 'boss', 'rival'].includes(kind) || (kind === 'card' && !known(c.cardId)) || ((kind === 'npc' || kind === 'boss') && (!c.npc || typeof c.npc !== 'object'));
    if (bad) { state.companion = null; state.companionPos = null; }
  }
  if (Array.isArray(pr.charms)) pr.charms = pr.charms.map(id => (known(id) ? id : null));
  if (pr.foils && typeof pr.foils === 'object') Object.keys(pr.foils).forEach(k => { if (!known(BattleEngine.baseIdOf(k))) delete pr.foils[k]; });
  if (pr.home && Array.isArray(pr.home.favs)) pr.home.favs = pr.home.favs.filter(known);
  if (pr.trades && Array.isArray(pr.trades.offers) && pr.trades.offers.some(o => (o.want && !known(o.want)) || (o.give && !known(o.give)))) delete pr.trades;
  if (pr.puzzle && pr.puzzle.snap && (JSON.stringify(pr.puzzle.snap).match(/"id":"[a-z][a-z0-9~.-]*"/g) || []).some(m => !known(m.slice(6, -1)))) pr.puzzle.snap = null;
  // The Card Museum and Expeditions left in Beta 1: send any team that was still away home with its cards.
  if (pr.expeditions && Array.isArray(pr.expeditions.active)) {
    pr.expeditions.active.forEach(t => (t.cards || []).forEach(id => { if (known(id)) state.ownedCards.push(id); }));
    pr.expeditions.active = []; pr.expeditions.picking = null;
  }
}

// only: 'spell' limits the draw to spells (the Lullaby Pack). Cards marked `exclusive` (cellar or rival prizes)
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

/* ---------------- cards you can only get from outside the map (build 288) ----------------
   Cards marked `exclusive` (portal, puddle, cellar, rift, milestone, boss: content/cards.js) never come out of packs or finds. The world
   that owns one hands over the FIRST copy through worldCardId, so a keepsake is a one-time thing; after that the world pays as it always did. */
function worldCardId(group, key) {
  const id = WORLD_CARDS[group] && WORLD_CARDS[group][key];
  return id && !state.ownedCards.includes(id) ? id : null;
}
let specialQueue = [];
// Adds one copy at once (so it can never be lost) and shows its reveal as soon as nothing else is on screen (a battle result, a scene, another card).
function giveSpecialCard(id, label) {
  if (!cardDef(id)) return;
  state.ownedCards.push(id); bumpStat('cardsFound', 1); bumpPill('pillCards'); saveState(); updateHud();
  specialQueue.push({ id, label });
  setTimeout(flushSpecialCards, 400);
}
function flushSpecialCards() {
  if (!specialQueue.length) return;
  if (inBattle || inScene || storyCur || !pickupOverlay.classList.contains('hidden') || (typeof pwBusy === 'function' && pwBusy())) { setTimeout(flushSpecialCards, 1500); return; }
  const s = specialQueue.shift();
  if (state.ownedCards.filter(x => x === s.id).length === 1) toast('📖 New entry in your Index');
  showCardReveal(s.id, s.label, true, null);
  if (specialQueue.length) setTimeout(flushSpecialCards, 1500);
}

// Ambient town finds (ground items, hidden finds): almost always common, rarely a rare - the exciting
// pulls are meant to come from battles, not from strolling around. Weighted toward cards already owned
// so the Almanac fills out with duplicates instead of racing to one-of-everything.
function rollTownFindRarity() { return Math.random() < 0.06 ? 'rare' : 'common'; }   // 12% until build 262
function weightedTownCardId(rarity, ownedWeight) {   // ownedWeight: how much likelier a card you own is (4; ground cards use 8)
  const pool = cardPool(rarity);
  const usePool = pool.length ? pool : cardPool('common');
  const owned = new Set(state.ownedCards);
  const weighted = [];
  usePool.forEach(c => { const w = (owned.has(c.id) ? (ownedWeight || 4) : 1) * (inSeason(c.id) ? 3 : 1); for (let i = 0; i < w; i++) weighted.push(c.id); });
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
function buildDeckForOpponent(count, forBoss, tier, seed, district, wins, plan) {
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
  // A neighbour's plan (js/npc-brain.js) is a few cards they want in the deck: make sure the pool holds them, and keep them first.
  if (plan && plan.keep) plan.keep.forEach(id => { counts[id] = Math.max(counts[id] || 0, 2); });
  return foeEnhanceDeck(BattleEngine.suggestDeck(counts, plan && plan.keep), tier, seed);
}
/* ---------------- boss decks (build 288) ----------------
   Every boss fields cards nobody else has. A district boss's deck is the usual boss build with its own five cards swapped in (BOSS_CARDS in
   content/cards.js: the mythic once and each of the two supers twice); a Depth fight swaps in more of them the deeper it goes, and the cellar's
   guardians carry their own prizes. Each card goes in for the card whose cost is nearest, so the curve stays as it was. Once a boss has been beaten
   it trades the same cards (js/npc-trade.js). */
function swapInCards(deck, ids) {
  deck = deck.slice();
  const used = new Set(), def = x => BattleEngine.defOf(x);
  ids.forEach(id => {
    const want = cardDef(id).cost;
    const slots = deck.map((x, i) => i).filter(i => !used.has(i) && !def(deck[i]).spell);
    if (!slots.length) return;
    slots.sort((a, b) => Math.abs(def(deck[a]).cost - want) - Math.abs(def(deck[b]).cost - want) || def(deck[b]).cost - def(deck[a]).cost);
    deck[slots[0]] = id; used.add(slots[0]);
  });
  return deck;
}
function bossSignatureIds(district, n) {
  const c = BOSS_CARDS[district];
  return c ? [c[2], c[0], c[1], c[0], c[1]].slice(0, n == null ? 5 : n) : [];
}
function buildBossDeck(district, seed) {
  const base = buildDeckForOpponent(DECK_SIZE, true, null, seed || BOSSES[district], district);
  return swapInCards(base, bossSignatureIds(district));
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
