/* ============================================================
   DAILY TOWN EVENTS
   One event a day, the same for everyone that day, each bending one system a little.
   Read through eventIs(); announced once a day and shown next to the district name.
   ============================================================ */
const TOWN_EVENTS = [
  { id: 'market-day',    icon: '🛍️', name: 'Market Day',    text: "Card packs and Saffron's daily deal are 20% off." },
  { id: 'fishing-derby', icon: '🎣', name: 'Fishing Derby', text: 'Fish pay double Pebbles, and rare fish bite more often.' },
  { id: 'spirit-parade', icon: '👻', name: 'Spirit Parade', text: 'Wandering spirits give double XP.' },
  { id: 'harvest-fair',  icon: '🌽', name: 'Harvest Fair',  text: 'Crops grow 50% faster, and every harvest pays +3 Pebbles.' },
  { id: 'swap-day',      icon: '🤝', name: 'Swap Day',      text: 'The trading board has five offers instead of three.' },
  { id: 'double-xp',     icon: '⭐', name: 'Double XP Day', text: 'Everything you do earns double XP.' },
  { id: 'cellar-night',  icon: '🕯️', name: 'Cellar Night',  text: 'Deep cellar floors pay double Pebbles.' },
  { id: 'baking-day',    icon: '🥐', name: 'Baking Day',    text: 'Bread bakes twice as fast.' },
  { id: 'festival-day',  icon: '🎉', name: 'Festival Day',  text: 'Festival Cup rounds pay double Pebbles.' },
];
function eventNow() { return TOWN_EVENTS[Math.floor(seeded('event-' + todayKey())() * TOWN_EVENTS.length)]; }
function eventIs(id) { return eventNow().id === id; }
function noteTodayEvent() {
  const pr = state.progress, ev = eventNow();
  if (pr.eventSeen === todayKey()) return;
  pr.eventSeen = todayKey(); saveState();
  setTimeout(() => toast(`${ev.icon} Today in town: ${ev.name} - ${ev.text}`), 1500);
  logEvent(ev.icon, `Today in town: ${ev.name}. ${ev.text}`);
  showTipOnce('events');
}
function packPrice(pack) { return Math.round(pack.cost * (eventIs('market-day') ? 0.8 : 1)); }

/* ============================================================
   GETTING STARTED: a short guided path for someone new to town
   One step at a time, shown at the top of Rewards → Dailies. Each step pays a little; the last pays a card.
   ============================================================ */
const STORY = [
  { icon: '👣', text: 'Take a stroll around the square.',            goal: 'Walk 30 steps',                              done: p => (p.totals.steps || 0) >= 30,        pebbles: 5 },
  { icon: '💬', text: 'Say hello to a neighbor.',                    goal: 'Tap a neighbor and chat',                    done: p => (p.totals.talks || 0) >= 1,         pebbles: 5 },
  { icon: '⚔️', text: 'Try a friendly card match.',                  goal: 'Win a match against a neighbor',             done: p => (p.totals.battlesWon || 0) >= 1,    pebbles: 10 },
  { icon: '🎁', text: 'Open the gift waiting for you.',              goal: 'Claim the daily gift (Rewards → Dailies)',   done: p => !!p.lastGift,                       pebbles: 5 },
  { icon: '🏡', text: 'Drop in on Wren, who welcomed you.',          goal: "Visit Wren's Cottage in Town Square",        done: p => !!(p.visited && p.visited.cottage), pebbles: 5 },
  { icon: '🍞', text: "Bake something at Maple's.",                  goal: 'Bake a loaf at the bakery',                  done: p => (p.totals.breadBaked || 0) >= 1,    pebbles: 8 },
  { icon: '🎣', text: 'Cast a line by the river.',                   goal: 'Catch a fish (tap water with a fish in it)', done: p => (p.totals.fishCaught || 0) >= 1,    pebbles: 8 },
  { icon: '🎲', text: 'Play a little game in one of the houses.',    goal: 'Finish any house mini-game',                 done: p => (p.totals.minigamesPlayed || 0) >= 1, pebbles: 8 },
  { icon: '🌱', text: 'Start a garden of your own.',                 goal: "Plant a seed (buy one at Fern's Cottage)",   done: p => (p.totals.seedsPlanted || 0) >= 1,  pebbles: 10 },
  { icon: '🛍️', text: 'Treat yourself.',                             goal: 'Open a card pack at the Card Shop',               done: p => (p.packsOpened || 0) >= 1,          pebbles: 10 },
  { icon: '🎴', text: 'Make the deck your own.',                     goal: 'Change a card in Cards → Deck',              done: p => (p.deckEdits || 0) >= 1,            pebbles: 10 },
  { icon: '⭐', text: 'Settle in properly.',                          goal: 'Reach level 5',                              done: p => (p.level || 1) >= 5,                card: 'super' },
];
// The path above ends onboarding; everyone who keeps playing gets these too, at their own pace, still one
// step at a time in the same Rewards → Dailies slot. STORY_ARC_LEN marks where "getting started" ends.
const STORY_ARC_LEN = STORY.length;
STORY.push(
  { icon: '👑', text: 'Face down a district boss.',                   goal: 'Defeat any district boss',                   done: p => (p.totals.bossesWon || 0) >= 1,     pebbles: 12 },
  { icon: '🗺️', text: 'See the whole town.',                          goal: 'Visit every district',                       done: () => Object.keys(DISTRICTS).every(k => state.visitedDistricts.includes(k)), pebbles: 12 },
  { icon: '🦦', text: "Meet the harbor and the garden's newest neighbors.", goal: 'Visit the Net Loft and the Glasshouse', done: p => !!(p.visited && p.visited['harbor-hut'] && p.visited['garden-glass']), pebbles: 10 },
  { icon: '🎭', text: 'Take on your rival.',                          goal: 'Beat Rook in a match',                       done: p => (p.totals.rivalWins || 0) >= 1,     pebbles: 15 },
  { icon: '🧩', text: 'Finish what you started.',                     goal: 'Complete any themed card set',               done: () => CARD_SETS.some(setComplete),        pebbles: 15 },
  { icon: '⭐', text: 'Truly settle in.',                             goal: 'Reach level 10',                             done: p => (p.level || 1) >= 10,                card: 'mythic' },
);
function storyState() { const p = state.progress; if (!p.story || typeof p.story !== 'object') p.story = { step: 0, notified: -1 }; return p.story; }
function storyStep() { const s = storyState(); return s.step < STORY.length ? STORY[s.step] : null; }
function storyReady() { const st = storyStep(); return !!(st && st.done(state.progress)); }
function storyArcLabel(step) { return step < STORY_ARC_LEN ? 'Getting started' : 'Making yourself at home'; }
function claimStory() {
  const s = storyState(), st = storyStep(), wasOnboarding = s.step < STORY_ARC_LEN;
  if (!st || !st.done(state.progress)) return;
  s.step++;
  if (st.pebbles) { addPebbles(st.pebbles); toast(`📜 Step done! +${st.pebbles} 🫧`); }
  if (st.card) { const cid = randomCardId(st.card); state.ownedCards.push(cid); bumpStat('cardsFound', 1);
    setTimeout(() => showCardReveal(cid, wasOnboarding ? 'Welcome to town!' : 'A town that knows you', true, wasOnboarding ? 'Wren says: "You belong here now."' : 'Wren says: "Look at you - practically a local."'), 300); }
  logEvent(st.icon, `${storyArcLabel(s.step - 1)}: ${st.goal}.`);
  saveState(); sfx('claim'); buzz(HAP.found);
  renderQuests(); checkAchievements();
}
function renderStory() {
  const slot = document.getElementById('storySlot'), s = storyState(), st = storyStep();
  if (!st) { slot.innerHTML = ''; return; }
  const ready = st.done(state.progress), arc = storyArcLabel(s.step);
  const arcStart = s.step < STORY_ARC_LEN ? 0 : STORY_ARC_LEN, arcLen = s.step < STORY_ARC_LEN ? STORY_ARC_LEN : STORY.length - STORY_ARC_LEN;
  slot.innerHTML = `<div class="story-card${ready ? ' ready' : ''}">
    <div class="story-top"><span class="story-icon">${st.icon}</span><span class="story-text"><small>${arc} · step ${s.step - arcStart + 1} of ${arcLen}</small><b>${st.text}</b><span>${st.goal}</span></span>
    ${ready ? '<button class="panel-action active" id="storyClaim">Claim</button>' : `<span class="q-count">${st.card ? 'a card' : `🫧 ${st.pebbles}`}</span>`}</div>
    <div class="q-bar"><div class="q-fill" style="width:${Math.round((s.step - arcStart) / arcLen * 100)}%"></div></div></div>`;
  const b = document.getElementById('storyClaim'); if (b) b.addEventListener('click', claimStory);
}
// A nudge when the current step gets done, so nobody has to keep checking.
function checkStory() {
  const s = storyState();
  if (storyReady() && s.notified !== s.step) { s.notified = s.step; saveState(); toast('📜 Next step ready - claim it in Rewards'); }
}

/* ============================================================
   FOIL CARDS
   Any card that joins your collection has a small chance to be a shiny foil. Foils are purely a collector's chase:
   they shimmer everywhere the card is shown. Found by comparing the collection with the last snapshot, so every
   way of getting a card counts without each one having to remember to roll.
   ============================================================ */
const FOIL_ODDS = 0.02;
function foils() { const p = state.progress; if (!p.foils || typeof p.foils !== 'object') p.foils = {}; return p.foils; }
function foilCount(id) { return foils()[id] || 0; }
function hasFoil(id) { const b = BattleEngine.baseIdOf(id); return Object.keys(foils()).some(k => BattleEngine.baseIdOf(k) === b && foils()[k] > 0); }
function reconcileFoils() {
  const p = state.progress, counts = ownedCardCounts(), f = foils();
  if (!p.foilSnap) { p.foilSnap = counts; return; }
  const found = [];
  Object.keys(counts).forEach(id => { for (let i = 0; i < counts[id] - (p.foilSnap[id] || 0); i++) if (Math.random() < FOIL_ODDS) { f[id] = (f[id] || 0) + 1; found.push(id); } });
  Object.keys(f).forEach(id => { f[id] = Math.min(f[id], counts[id] || 0); if (!f[id]) delete f[id]; });   // a foil you gave away is gone
  p.foilSnap = counts;
  if (found.length) {
    found.forEach(id => { const d = cardDef(id); setTimeout(() => toast(`✨ Foil! Your new ${d.icon} ${d.name} is a shiny one`), 1400); logEvent('✨', `Found a foil ${d.name}!`); });
    bumpStat('foilsFound', found.length); sfx('mythic'); showTipOnce('foils');
  }
  saveState();
}

/* ============================================================
   TOWN GUIDE (Journal → Guide)
   Every system in one place: what it is, where to find it, and what (if anything) still has to unlock.
   ============================================================ */
const needs = (district) => districtUnlocked(district) ? '' : `Opens with ${DISTRICTS[district].name} (${districtLockReason(district).replace(/^Needs /, '')})`;
const GUIDE = [
  { section: 'Around town', items: [
    { icon: '🗺️', name: 'Districts', where: 'Walk off the edge of a map, or tap the mini-map', how: 'Market Row, Quiet Harbor and Hollow Garden open as you win matches and level up.' },
    { icon: '🌦️', name: 'Weather & forecast', where: 'Any sign · the sky badge, top right', how: 'Tap the badge for the full picture: clear pays a little extra on daily tasks, cloudy doubles spirit XP, rain helps fishing and gardens, fog turns up more finds, storms power Swift cards, snow toughens bosses but pays more.' },
    { icon: '🌸', name: 'Seasons', where: 'Everywhere, one real week each', how: "Trees, music and weather change, and each season's cards turn up more often." },
    { icon: '📅', name: 'Daily events', where: 'Shown next to the district name', how: 'One a day - a Fishing Derby, Market Day, Harvest Fair and more.' },
    { icon: '🗝️', name: 'Hidden cards & chests', where: 'Grass, flowers and props everywhere', how: 'Walk through flowers, poke at props, and follow a golden glow to a chest.' },
    { icon: '🪑', name: 'Things to do in town', where: 'Benches, wells, lamps, trees, water, puddles', how: 'Sit, wish, light lamps after dark, shake trees, skip stones, splash in the rain, scatter the birds. The Square, Market, Harbor and Garden each have an activity too: busking, haggling, hauling nets and watering plants.' },
    { icon: '🎈', name: 'Town mood', where: 'Shown on signs and prop menus', how: 'Every interaction fills the district\'s mood. At 10, 25 and 50 it dresses up for good: balloons, flower pots, then lamps that glow all night.' },
    { icon: '✨', name: 'Night critters', where: 'Every district, after dark', how: 'Tap a glowing critter to catch it. Trade them at the Lantern Market.' },
    { icon: '👻', name: 'Companion spirits', where: 'Tap a wandering spirit', how: 'Invite one along; it follows you and lends a small perk. Tap it again any time to play Hide and Seek together.' },
    { icon: '🎒', name: 'Inventory', where: 'Tap your avatar → 🎒 View Inventory', how: 'Pantry ingredients, cooked dishes, seeds and spare decorations, all in one list - tap Plant or Place to use one right from there.' },
  ] },
  { section: 'Neighbors', items: [
    { icon: '💬', name: 'Favours', where: 'Tap any neighbor', how: 'Small daily requests for Pebbles or cards. Track them in Rewards → Favours.' },
    { icon: '💞', name: 'Friendship', where: 'Tap any neighbor', how: 'Favours, gifts (bread, dishes, cards they love) and wins earn hearts. 3 hearts: signature match. 5: a keepsake.' },
    { icon: '🎭', name: 'Rook, your rival', where: 'A different district each time', how: 'Appears after your first win. Eight chapters, each harder, with a unique final prize.', lock: () => (state.progress.totals.battlesWon || 0) >= 1 ? '' : 'Appears after your first win' },
    { icon: '📬', name: 'Letters', where: 'Your cottage mailbox (Town Square)', how: 'Neighbors write to you, sometimes with a gift.' },
  ] },
  { section: 'Card battles', items: [
    { icon: '⚔️', name: 'Friendly matches', where: 'Tap a neighbor → Friendly match', how: 'Win a card every time. Tap "How battles work" in Cards → Deck for the rules.' },
    { icon: '👹', name: 'District bosses', where: 'Each district, 30 minutes on, 30 off', how: 'Every boss bends one rule of the match, and pays super rare or better.' },
    { icon: '🕯️', name: 'The cellar', where: 'Town Square, top middle', how: 'Three floors, then an endless deep climb with guardians every 5th floor.' },
    { icon: '🏆', name: 'Festival Cup', where: 'The fountain in Town Square', how: 'Three matches in a row with no healing. Sweep it for the weekly trophy.' },
    { icon: '🎯', name: 'Deck challenges', where: 'The fountain in Town Square', how: 'Three deck rules a day, each with a card prize.' },
    { icon: '🧩', name: 'Daily puzzle', where: 'The Reading Nook', how: 'A fixed board to win in one turn. New every day.' },
  ] },
  { section: 'Houses & shops', items: [
    { icon: '🏠', name: 'Your cottage', where: 'Town Square, beside the Reading Nook', how: 'Mailbox, shelves, framed cards, trophies, and the Tidy Up game.' },
    { icon: '🍞', name: "Maple's Bakery", where: 'Town Square, bottom left', how: 'Bake bread, cook dishes from your pantry, and play Cake Toppings.' },
    { icon: '🌱', name: "Fern's Cottage", where: 'Town Square, the blue house', how: 'Seeds for your garden, and Weed the Beds.' },
    { icon: '🫖', name: "Wren's Cottage & the Reading Nook", where: 'Town Square, top', how: 'Tea, advice, the memory game, the card quiz and the daily puzzle.' },
    { icon: '🏪', name: 'Market stalls', where: 'Market Row', how: "Pip, Clover, Saffron's daily deal, Tock's card sleeves and Zeph's Card Shop - each with a game (the Card Shop is where you buy packs, sleeves, cosmetics and decorations).", lock: () => needs('market') },
    { icon: '🏛️', name: 'Card Museum & expeditions', where: 'Market Row, by the east hedge', how: 'Donate spare cards to six wings, and send spare cards on expeditions.', lock: () => needs('market') },
    { icon: '🏮', name: 'Lantern Market', where: 'Market Row, after dark', how: 'Night Packs, glowing decorations, and Pebbles for critters.', lock: () => needs('market') },
    { icon: '🦦', name: 'The Net Loft', where: 'Quiet Harbor', how: "Tam mends nets for Pebbles, and keeps a buoy box worth checking once a day.", lock: () => needs('harbor') },
    { icon: '🐌', name: 'The Glasshouse', where: 'Hollow Garden', how: 'Iris prunes vines for Pebbles, and has a box of spare pots worth digging through.', lock: () => needs('garden') },
  ] },
  { section: 'Collecting', items: [
    { icon: '🛍️', name: 'Packs & decorations', where: 'Market Row → Card Shop', how: 'Spend Pebbles on packs, sleeves, cosmetics and decorations for any district. Until Market Row opens, tap your 🫧 Pebbles counter to browse.' },
    { icon: '🔨', name: 'Workshop', where: 'Cards → Craft', how: 'Refine two copies into a stronger card, or trade three up a rarity.' },
    { icon: '🧩', name: 'Index & sets', where: 'Cards → Index', how: 'Every card in the game, and eight sets that give lasting bonuses when complete.' },
    { icon: '✦', name: 'Charms & mastery', where: 'Cards → My Cards', how: 'Charm cards for town perks; cards you play earn ★ mastery (★★★: +1 health in battle).' },
    { icon: '🤝', name: 'Trading board', where: 'The sign in Market Row', how: 'Three trades a day for spare cards.', lock: () => needs('market') },
    { icon: '✨', name: 'Foil cards', where: 'Any new card', how: 'Now and then a new card arrives as a shimmering foil. Your running total shows at the top of Cards → Index and in your cottage trophy case.' },
    { icon: '🎣', name: 'Fishing & gardening', where: 'River banks · Town Square soil', how: 'Fish and crops fill the Fish page, your pantry and your pockets.' },
  ] },
];
// Collapsed by default (keyed by item name) - with ~30 entries across 5 sections, showing every "how"
// description at once was the same wall-of-text problem the Changelog had. Tapping a row expands just
// its own details in place, same idiom as mail-item/cl-entry.
let guideOpen = {};
function renderGuide() {
  const box = document.getElementById('guideList'), ev = eventNow(), sd = seasonDef();
  box.innerHTML = `<div class="guide-today"><b>Today:</b> ${ev.icon} ${ev.name} - ${ev.text}<br>${sd.icon} ${sd.name}, ${seasonDaysLeft()} day${seasonDaysLeft() === 1 ? '' : 's'} left · ${forecastText()}</div>` +
    GUIDE.map(g => `<div class="section-title">${g.section}</div>` + g.items.map(it => {
      const lock = it.lock ? it.lock() : '';
      const open = !!guideOpen[it.name];
      // A lock reason answers "why can't I do this yet" - show it right away rather than gating it
      // behind a tap; only the (usually longer) "how" text for unlocked items collapses.
      return `<div class="panel-item guide-item${lock ? ' locked' : ''}${open ? ' open' : ''}"${lock ? '' : ` data-toggle-guide="${escapeHtml(it.name)}"`}>
        <span class="panel-icon">${it.icon}</span><span class="panel-text">
        <div class="panel-name">${it.name}</div><div class="panel-desc">📍 ${it.where}</div>
        ${lock ? `<div class="guide-how">🔒 ${escapeHtml(lock)}</div>` : (open ? `<div class="guide-how">${it.how}</div>` : '')}</span>
        ${lock ? '' : `<span class="guide-chevron">${open ? '▲' : '▼'}</span>`}</div>`;
    }).join('')).join('');
  box.querySelectorAll('[data-toggle-guide]').forEach(el => el.addEventListener('click', () => {
    const name = el.dataset.toggleGuide;
    sfx('nav');
    guideOpen[name] = !guideOpen[name];
    renderGuide();
  }));
}

/* ============================================================
   COMFORT SETTINGS: fast battles, larger text, calmer motion
   ============================================================ */
function applyComfortPrefs() {
  document.documentElement.classList.toggle('big-text', !!prefs.bigText);
  document.documentElement.classList.toggle('calm', !!prefs.calm);
}
[['fastToggle', 'fast'], ['bigTextToggle', 'bigText'], ['calmToggle', 'calm']].forEach(([id, key]) => {
  document.getElementById(id).addEventListener('click', () => {
    prefs[key] = !prefs[key]; savePrefs(); applyComfortPrefs(); syncToggles(); sfx('tap');
    if (key === 'bigText' && !inBattle) renderTown();
  });
});
// Separate from the loop above: turning this on needs an async permission prompt first, and turning it on
// or off should immediately (re)schedule or cancel whatever's currently pending (a loaf in the oven, the
// boss's next appearance) rather than waiting for the next natural trigger.
// Restores scheduling after a reload/reopen - anything already in flight (a loaf mid-bake, the boss
// currently hidden) needs to be rescheduled since the setTimeout from whenever it originally started is
// long gone. Called once at start-up (if notifications are already on) and right after turning them on.
function scheduleAllPendingNotifs() {
  if (!notifsEnabled()) return;
  const ov = ovenState();
  if (ov.startedAt) scheduleLocalNotify('bread', ov.startedAt + (ov.ms || BAKE_MS), '🍞 Bread is ready!', 'Your loaf at the bakery is done baking.');
  const wait = msUntilBossAppear();
  if (wait > 0) scheduleLocalNotify('boss', Date.now() + wait, '👹 The boss is back', 'A district boss has returned - good luck!');
}
document.getElementById('notifsToggle').addEventListener('click', async () => {
  sfx('tap');
  if (prefs.notifs) {
    prefs.notifs = false; savePrefs(); syncToggles();
    Object.keys(notifTimers).forEach(k => clearTimeout(notifTimers[k]));
    return;
  }
  const granted = await requestNotifPermission();
  if (!granted) { syncToggles(); return; }
  prefs.notifs = true; savePrefs(); syncToggles();
  toast('🔔 Notifications on');
  scheduleAllPendingNotifs();
});
document.getElementById('presenceToggle').addEventListener('click', () => {
  sfx('tap');
  prefs.sharePresence = !prefs.sharePresence; prefs.presenceChosen = true; savePrefs(); syncToggles();
  if (prefs.sharePresence) { pushPresence(); toast("👋 Sharing that you're playing"); }
  else removePresence();
  fetchWhosPlaying();
});

/* ============================================================
   FEEDBACK FOR TESTERS: every note carries enough context to act on
   ============================================================ */
function testerInfo() {
  const pr = ensureLevel(), w = WEATHER_KINDS[weatherNow()];
  const ua = navigator.userAgent.replace(/\s*\(KHTML, like Gecko\)/, '').slice(0, 160);
  const recent = (state.progress.eventLog || []).slice(0, 4).map(e => `  - ${String(e.text).replace(/<[^>]+>/g, '')}`).join('\n');
  return [`— Tile RPG ${gameVersionLabel()}`,
    `Level ${pr.level} · ${state.wins} wins · ${state.ownedCards.length} cards · in ${DISTRICTS[state.currentDistrict].name}`,
    `${w ? w.name : ''} · ${seasonDef().name} · ${eventNow().name} · ${inBattle ? 'in a battle' : inScene && scene ? 'inside ' + scene.id : 'in town'}`,
    `Screen ${window.innerWidth}×${window.innerHeight} · touch ${'ontouchstart' in window ? 'yes' : 'no'}`,
    `Device: ${ua}`,
    recent ? `Recent:\n${recent}` : ''].filter(Boolean).join('\n');
}
// The same facts as testerInfo(), as structured fields, so a feedback document in Firestore can be
// scanned/filtered by name or level instead of only read as one block of text.
function testerData() {
  const pr = ensureLevel();
  return {
    name: (state.character && state.character.name) || 'A player',
    emoji: (state.character && state.character.emoji) || '',
    level: pr.level, wins: state.wins || 0, cards: state.ownedCards.length,
    district: DISTRICTS[state.currentDistrict] ? DISTRICTS[state.currentDistrict].name : '',
    version: gameVersionLabel(), screen: `${window.innerWidth}x${window.innerHeight}`,
  };
}
// A real overlay (like #cloudOverlay - see js/cloud-save.js) instead of prompt(), so a longer bug report or
// piece of feedback can actually be seen and edited while typing, not squeezed into one browser pop-up line.
let feedbackModalResolve = null;
async function sendFeedback(kind) {
  sfx('nav'); buzz(HAP.tap);
  const bug = kind === 'bug';
  document.getElementById('feedbackModalTitle').textContent = bug ? 'Report a bug' : 'Send feedback';
  document.getElementById('feedbackModalDesc').textContent = bug
    ? 'What happened, and what did you expect to happen? Your name, level, game version and device are added for you.'
    : "What's on your mind? It's sent straight to the developer, along with your name, level and game version.";
  document.getElementById('feedbackModalSubmit').textContent = bug ? 'Report' : 'Send';
  const textEl = document.getElementById('feedbackTextInput');
  textEl.value = '';
  document.getElementById('feedbackOverlay').classList.remove('hidden');
  setTimeout(() => textEl.focus(), 50);
  const msg = await new Promise(resolve => { feedbackModalResolve = resolve; });
  if (!msg || !msg.trim()) return;
  const sent = await pushFeedback(kind, msg.trim(), testerInfo(), testerData());
  if (sent) { toast(bug ? '🐞 Bug reported - thank you!' : '💬 Feedback sent - thank you!'); sfx('claim'); return; }
  // Firestore unreachable or its security rule isn't set up yet - fall back to the old mailto: link
  // rather than the message just disappearing.
  const subject = encodeURIComponent(bug ? 'Tile RPG bug report' : 'Tile RPG feedback');
  const body = encodeURIComponent((msg.trim() + '\n\n' + testerInfo()).slice(0, 1600));
  window.location.href = `mailto:imzenko@gmail.com?subject=${subject}&body=${body}`;
}
function closeFeedbackModal(result) {
  document.getElementById('feedbackOverlay').classList.add('hidden');
  if (feedbackModalResolve) { const r = feedbackModalResolve; feedbackModalResolve = null; r(result); }
}
document.getElementById('feedbackModalCancel').addEventListener('click', () => { sfx('nav'); closeFeedbackModal(null); });
document.getElementById('feedbackModalSubmit').addEventListener('click', () => {
  const val = document.getElementById('feedbackTextInput').value;
  if (!val.trim()) { toast('Type a message first.'); sfx('tie'); return; }
  sfx('claim'); closeFeedbackModal(val);
});
document.getElementById('bugBtn').addEventListener('click', () => sendFeedback('bug'));

loadState();
applyComfortPrefs();
ensureQuests();
migrateMapV2();
sanitizeCards();
const __mig = migrateToBattleV2();
migrateRewardsV2();
generateTiles();
advanceClock();
renderTown();
updateHud();
syncToggles();
scheduleAllPendingNotifs();
checkAchievements();
if (__mig && __mig.granted.length) setTimeout(() => toast(__mig.brandNew ? '🌱 A starter deck is ready. Tap a neighbor to battle.' : '📦 Battles use 12-card decks now. Starter cards were added and your deck is filled.'), 900);

// Browsers require a touch before audio can start; unlock it on the first tap

