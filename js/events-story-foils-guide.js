/* ============================================================
   DAILY TOWN EVENTS
   One event a day, the same for everyone that day, each bending one system a little.
   Read through eventIs(); announced once a day and shown next to the district name.
   ============================================================ */
const TOWN_EVENTS = [
  { id: 'market-day',    icon: '🛍️', name: 'Market Day',    text: "Card packs and Saffron's daily deal are 20% off." },
  { id: 'fishing-derby', icon: '🎣', name: 'Thought Fishing Derby', text: 'Fish pay double Embers, and rare fish bite more often.' },
  { id: 'spirit-parade', icon: '👻', name: 'Spirit Parade', text: 'Wandering spirits give double XP.' },
  { id: 'harvest-fair',  icon: '🌽', name: 'Harvest Fair',  text: 'Crops grow 50% faster, and every harvest pays +3 Embers.' },
  { id: 'swap-day',      icon: '🤝', name: 'Swap Day',      text: 'The trading board has five offers instead of three.' },
  { id: 'double-xp',     icon: '⭐', name: 'Double XP Day', text: 'Everything you do earns double XP.' },
  { id: 'cellar-night',  icon: '🕯️', name: 'Cellar Night',  text: 'Deep cellar floors pay double Embers.' },
  { id: 'baking-day',    icon: '🥐', name: 'Baking Day',    text: 'Bread bakes twice as fast.' },
  { id: 'festival-day',  icon: '🎉', name: 'Festival Day',  text: 'Dreamers’ Cup rounds pay double Embers.' },
  // Rare events (build 102): a quarter of the weight of the others, so about one day in a dozen is something special.
  { id: 'starfall',      icon: '☄️', name: 'Starfall',      text: 'Hidden cards are twice as easy to spot, and new cards are three times as likely to come back Reborn.', rare: true },
  { id: 'friendship-fair', icon: '💞', name: 'Friendship Fair', text: 'Every heart you earn with a neighbor counts double.', rare: true },
  { id: 'tourney',       icon: '🏅', name: 'Tournament Day', text: 'Every match you win pays +3 Embers.', rare: true },
];
const EVENT_WEIGHT = e => e.rare ? 0.25 : 1;
function eventNow() {
  const total = TOWN_EVENTS.reduce((n, e) => n + EVENT_WEIGHT(e), 0);
  let r = seeded('event-' + todayKey())() * total;
  for (const e of TOWN_EVENTS) { r -= EVENT_WEIGHT(e); if (r < 0) return e; }
  return TOWN_EVENTS[0];
}
/* Calm districts (build 102): beating a district's boss leaves that district calm for the rest of the real day - hidden
   cards and chests turn up half again as often there, and its ambient line says so. It is the town reacting to what you did. */
function districtCalm(d) { const c = state.progress.calm; return !!(c && c[d || state.currentDistrict] === todayKey()); }
function markDistrictCalm(d) {
  const p = state.progress; if (!p.calm || typeof p.calm !== 'object') p.calm = {};
  p.calm[d] = todayKey(); saveState();
  setTimeout(() => toast(`🕊️ ${DISTRICTS[d].name} is calm today: hidden cards and chests turn up more often.`), 1800);
}
function eventIs(id) { return eventNow().id === id; }
function noteTodayEvent() {
  const pr = state.progress, ev = eventNow();
  if (pr.eventSeen === todayKey()) return;
  if (prefs.cozy) { pr.eventSeen = todayKey(); return; }   // Cozy mode: no event toast (it is still shown next to the district name)
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
  { icon: '👣', text: 'Wander the threshold and get your bearings.',            goal: 'Walk 30 steps',                              done: p => (p.totals.steps || 0) >= 30,        pebbles: 5 },
  { icon: '💬', text: 'Say hello to a neighbor.',                    goal: 'Tap a neighbor and chat',                    done: p => (p.totals.talks || 0) >= 1,         pebbles: 5 },
  { icon: '⚔️', text: 'Try a friendly card match.',                  goal: 'Win a match against a neighbor',             done: p => (p.totals.battlesWon || 0) >= 1,    pebbles: 10 },
  { icon: '🎁', text: 'Open the gift waiting for you.',              goal: 'Claim the daily gift (Rewards → Dailies)',   done: p => !!p.lastGift,                       pebbles: 5 },
  { icon: '🏡', text: 'Drop in on Wren, who welcomed you.',          goal: "Visit Wren's Cottage in El Umbral",        done: p => !!(p.visited && p.visited.cottage), pebbles: 5 },
  { icon: '🍞', text: "Bake something at Maple's.",                  goal: 'Bake a loaf at the bakery',                  done: p => (p.totals.breadBaked || 0) >= 1,    pebbles: 8 },
  { icon: '🎣', text: 'Cast a thought into the water.',                   goal: 'Catch a fish (tap water with a fish in it)', done: p => (p.totals.fishCaught || 0) >= 1,    pebbles: 8 },
  { icon: '🎲', text: 'Play a little game in one of the houses.',    goal: 'Finish any house mini-game',                 done: p => (p.totals.minigamesPlayed || 0) >= 1, pebbles: 8 },
  { icon: '🌱', text: 'Plant a thought in the soil.',                 goal: "Plant a seed (buy one at Fern's Cottage)",   done: p => (p.totals.seedsPlanted || 0) >= 1,  pebbles: 10 },
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
function storyState() { const p = state.progress; if (!p.story || typeof p.story !== 'object') p.story = { step: 0, notified: -1, beat: -1 }; return p.story; }   // beat: the last step whose scene has played (js/scenes.js)
function storyStep() { const s = storyState(); return s.step < STORY.length ? STORY[s.step] : null; }
function storyReady() { const st = storyStep(); return !!(st && st.done(state.progress)); }
function storyArcLabel(step) { return step < STORY_ARC_LEN ? 'Getting started' : 'Making yourself at home'; }
function claimStory() {
  const s = storyState(), st = storyStep(), wasOnboarding = s.step < STORY_ARC_LEN;
  if (!st || !st.done(state.progress)) return;
  s.step++;
  if (st.pebbles) { addPebbles(st.pebbles, 'story'); toast(`📜 Step done! +${st.pebbles} 🫧`); }
  if (st.card) { const cid = randomCardId(st.card); state.ownedCards.push(cid); bumpStat('cardsFound', 1);
    setTimeout(() => showCardReveal(cid, wasOnboarding ? 'Welcome to town!' : 'A town that knows you', true, wasOnboarding ? 'Wren says: "You belong here now."' : 'Wren says: "Look at you - practically a local."'), 300); }
  logEvent(st.icon, `${storyArcLabel(s.step - 1)}: ${st.goal}.`);
  saveState(); sfx('claim'); buzz(HAP.found);
  renderQuests(); checkAchievements();
  storyHoldUntil(1600);   // let the toast and any card reveal clear before Wren speaks again (js/scenes.js)
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
  storyBeatCheck();
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
  Object.keys(counts).forEach(id => { for (let i = 0; i < counts[id] - (p.foilSnap[id] || 0); i++) if (Math.random() < FOIL_ODDS * (eventIs('starfall') ? 3 : 1)) { f[id] = (f[id] || 0) + 1; found.push(id); } });
  Object.keys(f).forEach(id => { f[id] = Math.min(f[id], counts[id] || 0); if (!f[id]) delete f[id]; });   // a foil you gave away is gone
  p.foilSnap = counts;
  if (found.length) {
    found.forEach(id => { const d = cardDef(id); setTimeout(() => toast(`✨ Reborn! Your new ${d.icon} ${d.name} is a shimmering one`), 1400); logEvent('✨', `Found a Reborn ${d.name}!`); });
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
    { icon: '📓', name: 'The Journal', where: 'Bottom bar → Journal', how: 'Today lists what is waiting for you with a Go button for each. The Log, Battles and Almanac keep your history and collections, and the ? button holds this Guide and What\'s new.' },
    { icon: '🖐️', name: 'Looking around', where: 'Town map', how: 'Drag the map with your finger to look at the rest of the district; a quick flick glides on. Tap the target button on the right to bring the camera back to you. Dragging never sends your character walking, and walking somewhere brings the camera back by itself.' },
    { icon: '🧓', name: 'Wren points the way', where: 'The pill under the top bar · gold diamonds in town', how: "A new dreamer starts with a short drifting-off scene, then Wren tells you what to try next. The pill says what she asked: tap it to hear her again or to go there, and look for a small gold diamond over the building to visit. Every scene can be skipped, and Cozy mode in Settings turns the pill, the diamonds and Wren's reminders off." },
    { icon: '🗺️', name: 'Districts', where: 'Walk off the edge of a map, or tap the mini-map', how: 'El Mercado de Susurros, La Orilla del Arrullo and El Jardín Lúcido open as you win matches and level up.' },
    { icon: '🌦️', name: 'Weather & forecast', where: 'Any sign · the sky badge, top right', how: 'Tap the badge for the full picture: clear pays a little extra on daily tasks, cloudy doubles spirit XP, rain helps fishing and gardens, storms power Flicker cards, snow toughens bosses but pays more.' },
    { icon: '🌸', name: 'Seasons', where: 'Everywhere, one real week each', how: "Trees, music and weather change, and each season's cards turn up more often." },
    { icon: '📅', name: 'Daily events', where: 'Shown next to the district name', how: 'One a day - a Thought Fishing Derby, Market Day, Harvest Fair and more. About one day in twelve is a rare one: Starfall, Friendship Fair or Tournament Day. After you beat a district boss, that district stays calm for the day and hides more cards and chests.' },
    { icon: '🗝️', name: 'Hidden cards & chests', where: 'Grass, flowers and props everywhere', how: 'Walk through flowers, poke at props, and follow a golden glow to a chest.' },
    { icon: '🧶', name: 'Table mats', where: 'Card Shop → Customize, then Player → Customize', how: 'The cloth on your side of the battle table. Buy one with Embers, then pick it in your Customize tab.' },
    { icon: '🎨', name: 'Themes', where: 'Tap your avatar → Settings → Appearance', how: 'Dark (sea glass), Light (sand and sea glass) or Auto, which follows your device. The map, battles and interiors stay dark either way.' },
    { icon: '🪑', name: 'Things to do in town', where: 'Benches, wells, lamps, trees, water, puddles', how: 'Sit, wish, light lamps after dark, shake trees, skip stones, splash in the rain, scatter the birds. The Square, Market, Harbor and Garden each have an activity too: busking, haggling, hauling nets and watering plants.' },
    { icon: '🎈', name: 'Town mood', where: 'Shown on signs and prop menus', how: 'Every interaction fills the district\'s mood. At 10, 25 and 50 it dresses up for good: balloons, flower pots, then lamps that glow all night.' },
    { icon: '✨', name: 'Night critters', where: 'Every district, after dark', how: 'Tap a glowing critter to catch it. Trade them at the Lantern Market.' },
    { icon: '👻', name: 'Companions', where: 'Character → Companion', how: 'Any card you own, any neighbour (at full hearts) or boss you have met, and Rook can walk with you, once you are high enough level. Each lends small perks and your bond with each is kept. Tap your companion to go for a walk, calm down, spar, play tic-tac-toe or Spirit Trumps, play Hide and Seek, chat, pet, talk or duel.' },
    { icon: '✨', name: 'Your glow and sparkles', where: 'Around your character in town', how: 'The little things floating around you are earned. Flames: a win streak of 3 or more. Hearts: a companion you are close with (Trusted bond or better). Rings: a district you have calmed today. If you qualify for more than one you see flames first, then hearts, then rings; at night they also get a soft glow. In rain and storms a few drops bounce off you. Settings → Character effects turns them all off.' },
    { icon: '🎒', name: 'Inventory', where: 'Character → Pantry', how: 'Pantry ingredients, cooked dishes, seeds and spare decorations, all in one list - tap Plant or Place to use one right from there.' },
  ] },
  { section: 'Neighbors', items: [
    { icon: '💬', name: 'Favours', where: 'Tap any neighbor', how: 'Small daily requests for Embers or cards. Track them in Rewards → Favours.' },
    { icon: '💞', name: 'Friendship', where: 'Tap any neighbor', how: 'Favours, gifts (bread, dishes, cards they love) and wins earn hearts. 3 hearts: signature match. 5: a keepsake.' },
    { icon: '🎭', name: 'Rook, your rival', where: 'A different district each time', how: 'Appears after your first win. Eight chapters, each harder, with a unique final prize.', lock: () => (state.progress.totals.battlesWon || 0) >= 1 ? '' : 'Appears after your first win' },
    { icon: '📬', name: 'Letters', where: 'Your cottage mailbox (El Umbral)', how: 'Neighbors write to you, sometimes with a gift.' },
  ] },
  { section: 'Card battles', items: [
    { icon: '👻', name: 'Lingering duels', where: "Player menu → Social → Who's Playing → Duel", how: "Other testers' current decks can be played against as ghosts - the game plays their 12 cards for them. Beat a ghost for a few Embers (once per ghost a day). Your own deck is shared the same way; turn it off with 'Let testers duel my deck' in Settings." },
    { icon: '🎴', name: 'Draft Run', where: 'The fountain in El Umbral → Draft Run', how: 'Build a brand-new 12-card deck by picking 1 card from each of 12 offers of three (from every card in the game, not just yours), then win four matches in a row. Your collection\'s perks stay home so everyone drafts equally. Embers for every round (first 3 runs a day pay full) and a super-or-better card for the first clear each day.' },
    { icon: '✨', name: "Dreamer’s Gift", where: 'Keep-this-hand screen · Character → Me', how: 'A free, once-per-match power you pick before the match: Forage (draw 2), Soothe (heal), Sow (Seedlings), Spark Storm, Bulwark (Shields) and Tidal Hush. New ones unlock as you level up. Tap the glowing round button by your bar, then Use it.' },
    { icon: '🌦️', name: 'The world in battle', where: 'The line under the battle bar', how: 'Matches feel the world around them, for both sides: ☀️ clear skies give Bloom +1 power, ☁️ cloud gives Haze +1 health, 🌧️ rain makes Rest heal +1, ⛈️ storms give Flicker +1 power, 🌙 night makes Startle hit +1, and every district is home turf for its family (+1 health). Bring the right family to the right town.' },
    { icon: '🌿', name: 'Card families', where: 'Card info · each district favours one', how: 'Cards belong to a family: 🪨 Recuerdo (El Umbral), 🪶 Susurro (El Mercado de Susurros), 🌊 Deriva (La Orilla del Arrullo) or 🌿 Brote (El Jardín Lúcido). Neighbors and bosses lean on their district\'s family, and 🤝 Kin cards grow when more of their family are on your board.' },
    { icon: '🌰', name: 'New keywords', where: 'Card info', how: '🌰 Echo leaves an Afterthought when it falls. 😴 Lull stops the enemy\'s strongest card attacking next turn. 🤝 Kin grows with its family. 🐝 Sting hits the weakest enemy card as it arrives.' },
    { icon: '🪙', name: 'Who goes first', where: 'Before every match · Settings → Accessibility & battles', how: 'Call the coin (Sun or Moon) or roll a die against your opponent. The winner plays first; whoever goes second draws an extra card and gets +1 energy on their first two turns. Pick Coin, Dice, Mix or Skip in Settings.' },
    { icon: '⚔️', name: 'Friendly matches', where: 'Tap a neighbor → Friendly match', how: 'Drag a card from your hand onto the table to play it (or tap it to read it, tap again to play). To attack, drag a ready card onto an enemy card or up past their cards, or tap it and use the Attack Calm button. Win a card every time. Tap "How battles work" in Cards → Deck for the rules.' },
    { icon: '👹', name: 'District bosses', where: 'Each district, 30 minutes on, 30 off', how: 'Every boss bends one rule of the match, and pays super rare or better.' },
    { icon: '🕯️', name: 'The cellar', where: 'El Umbral, top middle', how: 'Every floor is a dark room you walk through with a lantern, and in it are a choice of doors (turn exploring off in Settings for a plain row): a fight, a chest, a campfire, a shrine or a peddler. You have three hearts per run, boons last for the run, and every 5th floor is a guardian with a rare prize. Smash barrels, find the key for the locked chest, mind the rats and grab glowcaps. Leaving does not end a run; Climb out does. The cellar rests for a few minutes after a run of three floors or more.' },
    { icon: '🏆', name: 'Dreamers’ Cup', where: 'The fountain in El Umbral', how: 'Three matches in a row with no healing. Sweep it for the weekly trophy.' },
    { icon: '🎯', name: 'Deck challenges', where: 'The fountain in El Umbral', how: 'Three deck rules a day, each with a card prize.' },
    { icon: '🧩', name: 'Daily puzzle', where: 'The Reading Nook', how: 'A fixed board to win in one turn. New every day.' },
  ] },
  { section: 'Houses & shops', items: [
    { icon: '🫧', name: 'Embers and soft limits', where: 'Settings → Ember ledger', how: 'Thought Fishing, crops, the Dreamers’ Cup and Draft Runs pay full Embers up to a daily amount, then less, then less again - it resets every morning. The Ember ledger in Settings shows where yours came from. Bigger purchases (premium rings, backdrops and decorations) open up as you level.' },
    { icon: '🏠', name: 'Your cottage', where: 'El Umbral, beside the Reading Nook', how: 'A room you can walk around: mailbox, shelves, framed cards, trophies, a sand garden, a bonsai, the altar and the Tidy Up game.' },
    { icon: '🗺️', name: 'The Atlas', where: 'Wherever you are, once summoned', how: 'It walks with you from district to district. Ask it questions, take on four matches that each bend a rule, play harder versions of the house games, and buy decorations only it sells. It never explains itself.', lock: () => atlasHome() ? '' : 'Summon it at the altar first.' },
    { icon: '🕯️', name: 'The altar', where: 'Your cottage', how: 'Summon the four district gods as cards: beat the god, then offer three spare cards of their family. Then light the four candles: feed them spare cards and the tallest flames call a spirit, a card of that family. Burn one for an hour or overnight for more. Put all four gods on the candles, one each, and the Atlas answers. Divine and Atlas cards are never in packs.' },
    { icon: '🍞', name: "Maple's Bakery", where: 'El Umbral, bottom left', how: 'Bake bread, cook dishes from your pantry, and play Cake Toppings.' },
    { icon: '🌱', name: "Fern's Cottage", where: 'El Umbral, the blue house', how: 'Seeds for your garden, and Weed the Beds.' },
    { icon: '🫖', name: "Wren's Cottage & the Reading Nook", where: 'El Umbral, top', how: 'Tea, advice, the memory game, the card quiz and the daily puzzle.' },
    { icon: '🏪', name: 'Market stalls', where: 'El Mercado de Susurros', how: "Pip, Clover, Saffron's daily deal, Tock's fishing bait and Zeph's Card Shop - each with a game (the Card Shop is where you buy packs, card sleeves, cosmetics and decorations).", lock: () => needs('market') },
    { icon: '🏮', name: 'Lantern Market', where: 'El Mercado de Susurros, after dark', how: 'Lantern Packs, glowing decorations, and Embers for critters.', lock: () => needs('market') },
    { icon: '🦦', name: 'The Net Loft', where: 'La Orilla del Arrullo', how: "Tam mends nets for Embers, and keeps a buoy box worth checking once a day.", lock: () => needs('harbor') },
    { icon: '🐌', name: 'The Glasshouse', where: 'El Jardín Lúcido', how: 'Iris prunes vines for Embers, and has a box of spare pots worth digging through.', lock: () => needs('garden') },
  ] },
  { section: 'Collecting', items: [
    { icon: '🛍️', name: 'Packs & decorations', where: 'El Mercado de Susurros → Card Shop', how: 'Spend Embers on packs, sleeves, cosmetics and decorations for any district. Until El Mercado de Susurros opens, tap your 🫧 Embers counter to browse.' },
    { icon: '🔨', name: 'Workshop', where: 'Cards → Craft', how: 'Refine two copies into a stronger card, or trade three up a rarity.' },
    { icon: '🧩', name: 'Index & sets', where: 'Cards → Sets', how: 'Eight themed sets that give lasting bonuses when complete, and an Index of every card in the game.' },
    { icon: '✦', name: 'Charms & mastery', where: 'Cards → My Cards', how: 'Charm cards for town perks; cards you play earn ★ mastery (★★★: +1 health in battle).' },
    { icon: '🤝', name: 'Trading board', where: 'The sign in El Mercado de Susurros', how: 'Three trades a day for spare cards.', lock: () => needs('market') },
    { icon: '✨', name: 'Reborn cards', where: 'Any new card', how: 'Now and then a spirit that faded as an Echo comes back Reborn: the same card, shimmering. Your running total shows at the top of Cards → Sets and in your cottage trophy case.' },
    { icon: '🏅', name: 'Ladder & deck test', where: 'Social (ladder) · Cards → Deck → Your deck', how: 'Lingering duels, deck challenges, the Cup, bosses and Draft Runs earn ladder points. Ranks (Pebble, Stone, Moss, Gem, Star) pay Embers, you never lose points, and the season resets monthly. Your deck gets an archetype label (6+ of a family; 8+ gives +1 Calm at the start), and Test your deck plays practice matches to show a win rate.' },
    { icon: '🧬', name: 'Family passives', where: 'Cards → Deck → Your deck', how: 'Build a full deck with 6 or more cards of one family and it plays with a small once-per-match passive (Seedling: your first Brote card restores 3 Calm. Footing: your first Recuerdo card costing 3+ gets +1 health. Ebb: your first Deriva card costing 3+ refunds 1 Energy. Breeze: your first cheap Flicker Susurro card gets +1 power). At 8 or more it becomes the full one. Brote (Rooted): Brote cards restore 2 Calm when they arrive. Recuerdo (Bedrock): your first Recuerdo card costing 4 or more enters with a Haze. Deriva (Undertow): your first Deriva card each turn draws a card if you hold 4 or fewer. Susurro (Tailwind): Flicker Susurro cards costing 2 or less get +1 power. This replaces the old +1 Calm.' },
    { icon: '📅', name: 'Weekly Rule', where: 'A chip in battle, and the Social ladder card', how: 'A small rule changes for the whole week and applies to both sides, such as Flicker cards +1 power or Haze cards +1 health. It changes by itself every week; puzzles and cellar fights ignore it.' },
    { icon: '🔮', name: 'Trials of the Fates', where: 'Quiet Nook → Fates → Trials', how: 'Five matches (The Fool, The Chariot, Justice, The Tower, The World), each against a foe who brings its own Fate and Fate Spread. They open in order from Dreamer level 6. The first win over each gives you its Fate card; later wins pay 6 Embers.' },
    { icon: '🃏', name: 'Fate Spread', where: 'Deck screen, under the deck insights', how: 'Choose three cards from your deck as Past, Present and Future. Past is kept in your opening hand, Present enters with a Haze, and Future is held back until your 4th turn. Three cards of one family give Harmony (+2 Calm at the start); three different families give Contrast (+1 card).' },
    { icon: '🔮', name: 'Fate (powers)', where: 'Pick it on the keep-this-hand screen', how: 'Each Fates you have attuned (Quiet Nook → Fates → The Fates) can be taken into a match as a second once-per-match power next to your Gift. Most cost a little: Death hits the enemy card with the most power but costs 2 Calm, The Tower hits every enemy card for 2 but costs 5. A purple round button by your bar glows when it is ready.' },
    { icon: '🐈‍⬛', name: "Madame Brume's tent", where: 'El Mercado de Susurros, from dusk until dawn', how: "A black cat who reads cards. She gives your daily Fate reading, swaps one card of it for 🫧 15 (once a day), tells you the story of your deck for free, and sells Fate packs (🫧 90): one of the 22 Fates, three times as likely to be one you do not own.", lock: () => needs('market') },
    { icon: '🔮', name: 'Fates', where: 'Journal → Today → Quiet Nook → Fates', how: 'One reading a day: three Fates (Past, Present, Future), each upright or reversed. Turn all three over and the Present card gives the day a fortune, at half strength if it is reversed. The 22 Fates are mythic and super cards you already know (The Fool is Dawn Stag, The Star is Moonstone, The World is The Dreaming Tree). Owning the card collects the Fate, up to three can be attuned for a small permanent perk, and a full set fills a Binder page.' },
    { icon: '🧘', name: 'Quiet Nook', where: 'Journal → Today · Wren, your cottage, the Net Loft · any bench', how: 'Quiet things that score nothing: a breathing pond (five breaths leave you Rested: +5% XP for the day), a sand garden, lanterns and stargazing after dark, wind chimes, a tea ritual, a bonsai that grows on real days, and postcards of places. Sitting on a bench zooms the town out until you stand up. Cozy mode in Settings hides the goal pill and event nudges.' },
    { icon: '🧭', name: 'Skills & gear', where: 'Character → Path', how: 'Every level gives a skill point for Angler, Gardener, Duelist or Wanderer (five ranks each; reset for free). Upgrade your rod, watering can and lantern with Embers as you level. A companion also grows closer when you win matches and catch fish, and its perk gets stronger.' },
    { icon: '🧑', name: 'Character tab', where: 'Bottom bar, far right', how: 'Everything about your character. Me shows level and stats, Look is where you change your name, avatar, colour, table mat, backdrop and title (some cost Embers), and then Bag, Milestones and Companion. Settings and Social are behind your avatar at the top.' },
    { icon: '🎣', name: 'Thought Fishing', where: 'Tap water from a bank', how: 'Pick a bait, cast, and watch the shadow: its size hints at the fish. Tap when it bites, then hold to reel and keep the marker in the green. Easy reeling is in Settings.' },
    { icon: '🌱', name: 'Thought Tending', where: 'El Umbral soil', how: 'Crops fill your pantry and your pockets.' },
  ] },
];
// Collapsed by default (keyed by item name) - with ~30 entries across 5 sections, showing every "how"
// description at once was the same wall-of-text problem the Changelog had. Tapping a row expands just
// its own details in place, same idiom as mail-item/cl-entry.
let guideOpen = {}, guideQuery = '', guideSection = 'all';   // guideSection: 'all' or a GUIDE section name
// Items added in the v1.81-1.89 releases wear a NEW tag until they have been opened once (state.progress.guideSeen).
const GUIDE_NEW = ['Your glow and sparkles', 'Wren points the way', 'Who goes first', 'Card families', 'New keywords', 'The world in battle', "Dreamer’s Gift", 'Draft Run', 'Lingering duels', 'Embers and soft limits'];
function guideSeen() { const p = state.progress; if (!p.guideSeen || typeof p.guideSeen !== 'object') p.guideSeen = {}; return p.guideSeen; }
// Redesign (build 93): roomier cards (icon tile, name, a "where" chip, details on tap), a Today card split into
// labelled rows instead of one paragraph, and section chips pinned under the search box. Searching ignores the chip
// so a match is never hidden by a filter you forgot about.
function renderGuide() {
  const box = document.getElementById('guideList'), ev = eventNow(), sd = seasonDef(), q = guideQuery.trim().toLowerCase(), seen = guideSeen();
  const match = it => !q || `${it.name} ${it.where} ${it.how}`.toLowerCase().includes(q);
  const chips = document.getElementById('guideChips'), keep = chips.scrollLeft;
  chips.innerHTML = [['all', 'All']].concat(GUIDE.map(g => [g.section, g.section])).map(([id, label]) =>
    `<button type="button" class="gd-chip${!q && guideSection === id ? ' active' : ''}" role="tab" data-gsec="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join('');
  chips.scrollLeft = keep;
  onAll(chips, '[data-gsec]', b => { sfx('nav'); guideSection = b.dataset.gsec; renderGuide(); });
  let body = GUIDE.map(g => {
    if (!q && guideSection !== 'all' && guideSection !== g.section) return '';
    const items = g.items.filter(match);
    if (!items.length) return '';
    return `<div class="gd-section"><div class="gd-section-title">${g.section}<span>${items.length}</span></div>` + items.map(it => {
      const lock = it.lock ? it.lock() : '';
      const open = !!guideOpen[it.name] || (!!q && items.length <= 3 && !lock);
      const isNew = GUIDE_NEW.includes(it.name) && !seen[it.name], go = guideTarget(it.name);
      // A lock reason answers "why can't I do this yet" - show it right away rather than gating it
      // behind a tap; only the (usually longer) "how" text for unlocked items collapses.
      return `<div class="gd-card${lock ? ' locked' : ''}${open ? ' open' : ''}"${lock ? '' : ` data-toggle-guide="${escapeHtml(it.name)}" role="button" tabindex="0" aria-expanded="${open}"`}>
        <div class="gd-head"><span class="gd-icon">${it.icon}</span>
          <div class="gd-title"><div class="gd-name">${it.name}${isNew ? '<span class="jnew">NEW</span>' : ''}</div><div class="gd-where">📍 ${it.where}</div></div>
          ${lock ? '' : `<span class="gd-chev" aria-hidden="true">${open ? '⌃' : '⌄'}</span>`}</div>
        ${lock ? `<div class="gd-how gd-lock">🔒 ${escapeHtml(lock)}</div>` : (open ? `<div class="gd-how">${it.how}${go ? `<div class="gd-go"><button type="button" class="jgo" data-guide-go="${escapeHtml(it.name)}">Take me there →</button></div>` : ''}</div>` : '')}</div>`;
    }).join('') + '</div>';
  }).join('');
  if (!body) body = `<div class="jempty">Nothing matches “${escapeHtml(guideQuery)}”.<button class="jgo" type="button" id="guideClear">Clear search</button></div>`;
  const left = seasonDaysLeft();
  box.innerHTML = `<div class="gd-today">
      <div class="gd-today-label">Today</div>
      <div class="gd-row"><span class="gd-row-ico">${ev.icon}</span><div><b>${ev.name}</b><span>${ev.text}</span></div></div>
      <div class="gd-row"><span class="gd-row-ico">${sd.icon}</span><div><b>${sd.name}</b><span>${left} day${left === 1 ? '' : 's'} left</span></div></div>
      <div class="gd-row"><span class="gd-row-ico">🌦️</span><div><b>${weatherBrief()}</b><span>Tap the sky badge for what each weather does</span></div></div>
    </div>` + body;
  box.querySelectorAll('[data-toggle-guide]').forEach(el => {
    const toggle = ev2 => {
      if (ev2.target.closest('[data-guide-go]')) return;
      const name = el.dataset.toggleGuide;
      sfx('nav');
      guideOpen[name] = !guideOpen[name];
      if (guideOpen[name] && GUIDE_NEW.includes(name)) { guideSeen()[name] = true; saveState(); }
      renderGuide();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  });
  box.querySelectorAll('[data-guide-go]').forEach(b => b.addEventListener('click', () => { sfx('tap'); closeJournalSheet(); journalGo(guideTarget(b.dataset.guideGo)); }));
  const gc = document.getElementById('guideClear'); if (gc) gc.addEventListener('click', () => { guideQuery = ''; document.getElementById('guideSearch').value = ''; renderGuide(); });
}

/* ============================================================
   DISPLAY SETTINGS: larger text (the old Fast battles, Easy reeling, Cozy mode, dark cellar and Smooth map switches were removed)
   ============================================================ */
function applyComfortPrefs() {
  document.documentElement.classList.toggle('big-text', !!prefs.bigText);
}
[['bigTextToggle', 'bigText']].forEach(([id, key]) => {
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
// Ember ledger (js/progression.js): where Embers come from and go, for tuning the economy.
document.getElementById('econToggle').addEventListener('click', () => {
  const panel = document.getElementById('econPanel'), open = panel.classList.toggle('hidden') === false;
  document.getElementById('econToggle').textContent = open ? 'Hide' : 'Show'; sfx('tap');
  if (!open) return;
  const r = econReport(), fmt = l => l.slice(0, 8).map(x => `${x.src}: ${x.total} (${Math.round(x.perHour)}/h)`).join('\n') || '-';
  panel.textContent = `Over ${r.hours}h of play\nEarned ${r.earned} (${r.earnedPerHour}/h) · Spent ${r.spent} (${r.spentPerHour}/h)\n\nEARNED\n${fmt(r.earn)}\n\nSPENT\n${fmt(r.spend)}`;
});
document.getElementById('statsToggle').addEventListener('click', () => {
  sfx('tap'); prefs.shareStats = prefs.shareStats === false; savePrefs(); syncToggles();
  if (prefs.shareStats !== false) pushStats();
  toast(prefs.shareStats === false ? '📈 Play stats are private' : '📈 Sharing anonymous play stats');
});
// Lingering duels: your current deck rides along with your presence entry (on by default, with Share that I'm playing).
document.getElementById('shareDeckToggle').addEventListener('click', () => {
  sfx('tap');
  prefs.shareDeck = prefs.shareDeck === false; savePrefs(); syncToggles();
  if (prefs.sharePresence) pushPresence();
  toast(prefs.shareDeck === false ? '👻 Your deck is private' : prefs.sharePresence ? '👻 Testers can duel your deck' : '👻 Turn on Share that I\'m playing so testers can find you');
});

/* ============================================================
   FEEDBACK FOR TESTERS: every note carries enough context to act on
   ============================================================ */
function testerInfo() {
  const pr = ensureLevel(), w = WEATHER_KINDS[weatherNow()];
  const ua = navigator.userAgent.replace(/\s*\(KHTML, like Gecko\)/, '').slice(0, 160);
  const recent = (state.progress.eventLog || []).slice(0, 4).map(e => `  - ${String(e.text).replace(/<[^>]+>/g, '')}`).join('\n');
  return [`— Tile RPG ${gameBuildLabel()} · ${fmtChangelogDate(RELEASES[0].date)}`,
    `Level ${pr.level} · ${state.wins} wins · ${state.ownedCards.length} cards · in ${DISTRICTS[state.currentDistrict].name}`,
    `${w ? w.name : ''} · ${seasonDef().name} · ${eventNow().name} · ${inBattle ? 'in a battle' : inScene && scene ? 'inside ' + scene.id : 'in town'}`,
    `Screen ${window.innerWidth}×${window.innerHeight} · touch ${'ontouchstart' in window ? 'yes' : 'no'}`,
    `Device: ${ua}`,
    econSummaryText() ? `Economy: ${econSummaryText()}` : '',
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
    version: gameBuildLabel(), screen: `${window.innerWidth}x${window.innerHeight}`,
    econ: (() => { const r = econReport(); return { hours: r.hours, earned: r.earned, spent: r.spent, earn: Object.fromEntries(r.earn.slice(0, 8).map(x => [x.src, x.total])), spend: Object.fromEntries(r.spend.slice(0, 8).map(x => [x.src, x.total])) }; })(),
  };
}
// A real overlay (like #cloudOverlay - see js/cloud-save.js) instead of prompt(), so a longer bug report or
// piece of feedback can actually be seen and edited while typing, not squeezed into one browser pop-up line.
let feedbackModalResolve = null;
async function sendFeedback(kind) {
  sfx('nav'); buzz(HAP.tap);
  document.getElementById('feedbackModalTitle').textContent = 'Feedback and bugs';
  document.getElementById('feedbackModalDesc').textContent = "Ideas, thoughts or something that broke? If it is a bug, tell us what happened and what you expected. It's sent straight to the developer, along with your name, level, game version and device.";
  document.getElementById('feedbackModalSubmit').textContent = 'Send';
  const textEl = document.getElementById('feedbackTextInput');
  textEl.value = '';
  document.getElementById('feedbackOverlay').classList.remove('hidden');
  setTimeout(() => textEl.focus(), 50);
  const msg = await new Promise(resolve => { feedbackModalResolve = resolve; });
  if (!msg || !msg.trim()) return;
  const sent = await pushFeedback(kind, msg.trim(), testerInfo(), testerData());
  if (sent) { toast('💬 Sent - thank you!'); sfx('claim'); return; }
  // Firestore unreachable or its security rule isn't set up yet - fall back to the old mailto: link
  // rather than the message just disappearing.
  const subject = encodeURIComponent('Tile RPG feedback');
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


initTransientNotices();   // js/town-render-weather.js: the ambient line and town log fade in and out
setTimeout(storyIntroCheck, 500);   // a brand-new save opens with the dream-in scene (js/scenes.js)
