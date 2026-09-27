/* ============================================================
   FIRST-TIME TIPS
   A short explanation the first time you meet each system. Shown once ever; if another popup is open it waits
   its turn rather than stacking on top.
   ============================================================ */
const TIPS = {
  bakery:     { icon: '🍞', title: 'The bakery', text: 'Put a loaf in the oven - it bakes in real time. Share bread with neighbors (one gift each per day) to grow your friendship, or cook with it.' },
  cook:       { icon: '🍳', title: 'Cooking', text: 'Harvests and fish land in your pantry. Cook them into dishes: give one as a gift (worth more than bread), eat it on the keep-this-hand screen for a head start, or bring one to a neighbor who asked.' },
  garden:     { icon: '🌱', title: 'Gardening', text: 'Buy seeds here, then tap a glowing patch of Town Square to plant. Crops grow in real time (faster in the rain). Card seeds grow a card.' },
  puzzle:     { icon: '🧩', title: 'The daily puzzle', text: 'A fixed board: win it this turn. Ending your turn gives up and resets the board, so take your time. The first solve each day pays a card.' },
  cup:        { icon: '🏆', title: 'The Festival Cup', text: 'Three matches in a row. Your Spirit carries over between rounds - there is no healing - and a loss ends the run. Sweep all three for the week\'s trophy.' },
  home:       { icon: '🏠', title: 'Your cottage', text: 'Your own place. Read letters in the mailbox, put decorations on the shelves, frame favourite cards, and see your trophies.' },
  lantern:    { icon: '🏮', title: 'The Lantern Market', text: 'Lumen only trades after dark: Night Packs full of moonlit cards, glowing decorations, and Pebbles for the critters in your jar.' },
  bugs:       { icon: '✨', title: 'Night critters', text: 'Glowing critters come out at night. Tap one to catch it - it goes in your jar for the Lantern Market and in the critter log under Cards → Fish.' },
  companion:  { icon: '👻', title: 'A companion', text: 'You can invite one wandering spirit to follow you. Each brings a small perk depending on its card. Let it go any time from your profile.' },
  cellarDeep: { icon: '🕳️', title: 'The deep cellar', text: 'From here on it is a run: a loss or climbing out ends it and the cellar rests. Every 5th floor is a guardian with a rare prize.' },
  rival:      { icon: '🎭', title: 'A rival', text: 'Rook moves between districts. Every win sends them off to build a stronger deck - eight chapters in all, with a unique final prize.' },
  friends:    { icon: '💞', title: 'Friendship', text: 'Favours, gifts and friendly wins earn hearts. At 3 hearts a neighbor plays their signature deck with you; at 5 they give you a keepsake.' },
  spells:     { icon: '✨', title: 'Spell cards', text: 'Spells are cast from your hand for an instant effect and never take a board slot. Aimed spells ignore Guard.' },
  museum:      { icon: '🏛️', title: 'The Card Museum', text: 'Donate spare copies of cards to fill six wings. The museum never takes your last copy or one your deck uses. Each finished wing pays Pebbles and gives a keepsake decoration.' },
  expeditions: { icon: '🧭', title: 'Expeditions', text: 'Send up to three spare cards away for a while - two teams at once. Swift cards travel faster, Guards keep the team safe, Echo cards find treasure, and stronger teams bring back more. Your cards come home with loot and a little mastery.' },
  trades:      { icon: '🤝', title: 'The trading board', text: 'Three new offers every morning: swap a spare for a card you have never had, bundle three spares for a rarer card, or sell one to a collector for three times its release value.' },
  challenges:  { icon: '🎯', title: 'Deck challenges', text: 'Three rules a day, like "only commons" or "no two cards the same". Win with a deck that follows the rule for a card prize. Keep a deck slot for challenges so switching is quick.' },
  minigames:  { icon: '🎲', title: 'Mini-games', text: 'Every house has a little game. Earn a bronze, silver or gold medal; the first three medals in each game every day pay Pebbles, and gold can turn up a card. Play as much as you like after that.' },
  forecast:   { icon: '🪧', title: 'The weather board', text: 'Signs show the forecast. Weather changes play: rain for fishing and growing, fog for finds, storms for Swift cards, snow for tougher bosses and richer prizes.' },
  events:     { icon: '📅', title: 'Daily town events', text: "One event runs each day, shown next to the district name - a Fishing Derby, Market Day, Harvest Fair and more, each bending the rules a little in your favor." },
  foils:      { icon: '✨', title: 'Foil cards', text: 'A shimmering foil is purely a collector\'s chase - the same card, just shinier. Your foil total shows at the top of Cards → Index and in your cottage trophy case.' },
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

/* ============================================================
   PROGRESSION: DAILY GIFT, QUESTS, ACHIEVEMENTS
   ============================================================ */
// The "wander" line: one quest at every 500-step rung up to 10,000, escalating rewards for the grind -
// replaces the old handful of small step goals with a full ladder.
const STEP_QUEST_TIERS = [];
for (let s = 500; s <= 10000; s += 500) {
  const reward = s >= 10000 ? 'mythic' : s >= 5000 ? 'super' : s >= 3000 ? 'ultra' : s >= 1500 ? 'rare' : 'common';
  const icon = s >= 5000 ? '🏔️' : s >= 1500 ? '🧭' : '👣';
  STEP_QUEST_TIERS.push({ id: 'step' + s, icon, name: `Wander ${s.toLocaleString()} steps`, goal: s, stat: 'steps', reward });
}

const QUEST_POOL = [
  { id: 'find2',    icon: '🍂', name: 'Find 2 cards on the ground',   goal: 2,  stat: 'cardsFound',      reward: 'common' },
  { id: 'find3',    icon: '🃏', name: 'Find 3 cards on the ground',   goal: 3,  stat: 'cardsFound',      reward: 'rare' },
  { id: 'find5',    icon: '✨', name: 'Find 5 cards on the ground',   goal: 5,  stat: 'cardsFound',      reward: 'ultra' },
  { id: 'find8',    icon: '💰', name: 'Find 8 cards on the ground',   goal: 8,  stat: 'cardsFound',      reward: 'super' },
  { id: 'find12',   icon: '🎒', name: 'Find 12 cards on the ground',  goal: 12, stat: 'cardsFound',      reward: 'super' },
  { id: 'find20',   icon: '🧳', name: 'Find 20 cards on the ground',  goal: 20, stat: 'cardsFound',      reward: 'super' },
  { id: 'win1',     icon: '🌿', name: 'Win a friendly match',         goal: 1,  stat: 'battlesWon',      reward: 'rare' },
  { id: 'win2',     icon: '🏆', name: 'Win 2 matches',                goal: 2,  stat: 'battlesWon',      reward: 'ultra' },
  { id: 'win3',     icon: '🎖️', name: 'Win 3 matches',                goal: 3,  stat: 'battlesWon',      reward: 'ultra' },
  { id: 'win4',     icon: '⚔️', name: 'Win 4 matches',                goal: 4,  stat: 'battlesWon',      reward: 'super' },
  { id: 'win6',     icon: '🥇', name: 'Win 6 matches',                goal: 6,  stat: 'battlesWon',      reward: 'super' },
  { id: 'win8',     icon: '🎗️', name: 'Win 8 matches',                goal: 8,  stat: 'battlesWon',      reward: 'super' },
  { id: 'boss1',    icon: '👑', name: 'Defeat a district boss',       goal: 1,  stat: 'bossesWon',       reward: 'super' },
  { id: 'boss2',    icon: '🏰', name: 'Defeat 2 district bosses',     goal: 2,  stat: 'bossesWon',       reward: 'super' },
  { id: 'fish1',    icon: '🎣', name: 'Catch a fish',                 goal: 1,  stat: 'fishCaught',      reward: 'common' },
  { id: 'fish2',    icon: '🐡', name: 'Catch 2 fish',                 goal: 2,  stat: 'fishCaught',      reward: 'rare' },
  { id: 'fish3',    icon: '🐟', name: 'Catch 3 fish',                 goal: 3,  stat: 'fishCaught',      reward: 'rare' },
  { id: 'fish6',    icon: '🏅', name: 'Catch 6 fish',                 goal: 6,  stat: 'fishCaught',      reward: 'ultra' },
  { id: 'fish10',   icon: '🐠', name: 'Catch 10 fish',                goal: 10, stat: 'fishCaught',      reward: 'super' },
  { id: 'fish15',   icon: '🦈', name: 'Catch 15 fish',                goal: 15, stat: 'fishCaught',      reward: 'super' },
  { id: 'favour1',  icon: '🤝', name: 'Help a neighbor with a request', goal: 1, stat: 'favours',        reward: 'rare' },
  { id: 'favour2',  icon: '💌', name: 'Help 2 neighbors',             goal: 2,  stat: 'favours',         reward: 'ultra' },
  { id: 'favour4',  icon: '🎗️', name: 'Help 4 neighbors',             goal: 4,  stat: 'favours',         reward: 'super' },
  { id: 'favour6',  icon: '💐', name: 'Help 6 neighbors',             goal: 6,  stat: 'favours',         reward: 'super' },
  { id: 'spirit1',  icon: '🌟', name: 'Meet a wandering spirit',      goal: 1,  stat: 'spiritsMet',      reward: 'common' },
  { id: 'spirit2',  icon: '💫', name: 'Meet 2 wandering spirits',     goal: 2,  stat: 'spiritsMet',      reward: 'rare' },
  { id: 'spirit3',  icon: '🔮', name: 'Meet 3 wandering spirits',     goal: 3,  stat: 'spiritsMet',      reward: 'rare' },
  { id: 'spirit5',  icon: '🌌', name: 'Meet 5 wandering spirits',     goal: 5,  stat: 'spiritsMet',      reward: 'ultra' },
  { id: 'spirit8',  icon: '👻', name: 'Meet 8 wandering spirits',     goal: 8,  stat: 'spiritsMet',      reward: 'super' },
  { id: 'district1', icon: '🗺️', name: 'Visit a new district',        goal: 1,  stat: 'districtsVisited', reward: 'ultra' },
  { id: 'district2', icon: '🌐', name: 'Visit 2 new districts',       goal: 2,  stat: 'districtsVisited', reward: 'ultra' },
  { id: 'district3', icon: '🧳', name: 'Visit 3 new districts',       goal: 3,  stat: 'districtsVisited', reward: 'super' },
  { id: 'chest1',   icon: '🗝️', name: 'Open a hidden chest',          goal: 1,  stat: 'chestsOpened',    reward: 'ultra' },
  { id: 'chest2',   icon: '🏴', name: 'Open 2 hidden chests',         goal: 2,  stat: 'chestsOpened',    reward: 'super' },
  { id: 'bake1',    icon: '🍞', name: 'Bake a loaf at the bakery',    goal: 1,  stat: 'breadBaked',      reward: 'rare' },
  { id: 'share1',   icon: '🥖', name: 'Share a loaf with a neighbor', goal: 1,  stat: 'breadShared',     reward: 'rare' },
  { id: 'spell3',   icon: '✨', name: 'Cast 3 spells in battle',      goal: 3,  stat: 'spellsCast',      reward: 'rare' },
  { id: 'plant2',   icon: '🌱', name: 'Plant 2 seeds in Town Square', goal: 2,  stat: 'seedsPlanted',    reward: 'common' },
  { id: 'harvest1', icon: '🌻', name: 'Harvest something you grew',   goal: 1,  stat: 'cropsHarvested',  reward: 'rare' },
  { id: 'rival1',   icon: '🎭', name: 'Beat your rival, Rook',        goal: 1,  stat: 'rivalWins',       reward: 'ultra' },
  { id: 'cook1',    icon: '🍳', name: 'Cook a dish with Maple',       goal: 1,  stat: 'dishesCooked',    reward: 'rare' },
  { id: 'puzzle1',  icon: '🧩', name: "Solve Olwen's daily puzzle",   goal: 1,  stat: 'puzzlesSolved',   reward: 'ultra' },
  { id: 'cupwin1',  icon: '🥉', name: 'Win a Festival Cup match',     goal: 1,  stat: 'cupRoundsWon',    reward: 'rare' },
  { id: 'bugs2',    icon: '✨', name: 'Catch 2 night critters',       goal: 2,  stat: 'bugsCaught',      reward: 'common' },
  { id: 'mini3',    icon: '🎲', name: 'Play 3 house mini-games',      goal: 3,  stat: 'minigamesPlayed', reward: 'common' },
  { id: 'donate1',  icon: '🏛️', name: 'Donate a card to the museum',  goal: 1,  stat: 'donations',       reward: 'common' },
  { id: 'exped1',   icon: '🧭', name: 'Bring home an expedition',     goal: 1,  stat: 'expeditionsDone', reward: 'rare' },
  { id: 'trade1',   icon: '🤝', name: 'Make a trade at the board',    goal: 1,  stat: 'tradesDone',      reward: 'rare' },
  { id: 'cardgift1', icon: '🃏', name: 'Give a neighbor a card',      goal: 1,  stat: 'cardsGifted',     reward: 'common' },
  { id: 'chal1',    icon: '🎯', name: 'Beat a deck challenge',        goal: 1,  stat: 'challengesWon',   reward: 'ultra' },
  { id: 'minigold', icon: '🥇', name: 'Win a gold medal in a mini-game', goal: 1, stat: 'minigameGolds', reward: 'rare' },
  { id: 'foil1',    icon: '✨', name: 'Find a foil card',              goal: 1, stat: 'foilsFound',      reward: 'rare' },
  ...STEP_QUEST_TIERS
];

// Same shape as QUEST_POOL, but with week-sized goals and better rewards to match the longer commitment.
const WEEKLY_QUEST_POOL = [
  { id: 'w_find50',   icon: '🎒', name: 'Find 50 cards on the ground', goal: 50,  stat: 'cardsFound',      reward: 'super' },
  { id: 'w_find100',  icon: '🏺', name: 'Find 100 cards on the ground', goal: 100, stat: 'cardsFound',     reward: 'mythic' },
  { id: 'w_win15',    icon: '🥇', name: 'Win 15 matches',              goal: 15,  stat: 'battlesWon',      reward: 'super' },
  { id: 'w_win30',    icon: '🏵️', name: 'Win 30 matches',              goal: 30,  stat: 'battlesWon',      reward: 'mythic' },
  { id: 'w_boss3',    icon: '👑', name: 'Defeat 3 district bosses',    goal: 3,   stat: 'bossesWon',       reward: 'mythic' },
  { id: 'w_step3000', icon: '🏔️', name: 'Wander 3,000 steps',          goal: 3000, stat: 'steps',          reward: 'super' },
  { id: 'w_step6000', icon: '🌄', name: 'Wander 6,000 steps',          goal: 6000, stat: 'steps',          reward: 'mythic' },
  { id: 'w_fish20',   icon: '🐠', name: 'Catch 20 fish',               goal: 20,  stat: 'fishCaught',      reward: 'super' },
  { id: 'w_fish40',   icon: '🦈', name: 'Catch 40 fish',               goal: 40,  stat: 'fishCaught',      reward: 'mythic' },
  { id: 'w_favour8',  icon: '🎗️', name: 'Help 8 neighbors',            goal: 8,   stat: 'favours',         reward: 'super' },
  { id: 'w_favour15', icon: '💐', name: 'Help 15 neighbors',           goal: 15,  stat: 'favours',         reward: 'mythic' },
  { id: 'w_spirit10', icon: '🌌', name: 'Meet 10 wandering spirits',   goal: 10,  stat: 'spiritsMet',      reward: 'super' },
  { id: 'w_spirit20', icon: '👻', name: 'Meet 20 wandering spirits',   goal: 20,  stat: 'spiritsMet',      reward: 'mythic' },
  { id: 'w_district_all', icon: '🌐', name: 'Visit every district',    goal: Object.keys(DISTRICTS).length, stat: 'districtsVisited', reward: 'super' },
  { id: 'w_chest3',   icon: '🗝️', name: 'Open 3 hidden chests',        goal: 3,   stat: 'chestsOpened',    reward: 'mythic' },
  { id: 'w_boss5',    icon: '🏰', name: 'Defeat 5 district bosses',    goal: 5,   stat: 'bossesWon',       reward: 'mythic' },
  { id: 'w_win45',    icon: '🎫', name: 'Win 45 matches',              goal: 45,  stat: 'battlesWon',      reward: 'mythic' },
  { id: 'w_step10000', icon: '🌋', name: 'Wander 10,000 steps',        goal: 10000, stat: 'steps',         reward: 'mythic' },
  { id: 'w_find200',  icon: '🏛️', name: 'Find 200 cards on the ground', goal: 200, stat: 'cardsFound',    reward: 'mythic' },
  { id: 'w_favour20', icon: '🎁', name: 'Help 20 neighbors',            goal: 20,  stat: 'favours',        reward: 'mythic' },
  { id: 'w_decor3',   icon: '🏺', name: 'Place 3 decorations', goal: 3, stat: 'decorationsPlaced', reward: 'super' },
  { id: 'w_share5',   icon: '🥖', name: 'Share 5 loaves with neighbors', goal: 5, stat: 'breadShared',  reward: 'super' },
  { id: 'w_spell20',  icon: '📜', name: 'Cast 20 spells in battle',  goal: 20, stat: 'spellsCast',      reward: 'super' },
  { id: 'w_harvest8', icon: '🧺', name: 'Harvest 8 crops',           goal: 8,  stat: 'cropsHarvested',  reward: 'super' },
  { id: 'w_rival3',   icon: '🎭', name: 'Beat Rook 3 times',         goal: 3,  stat: 'rivalWins',       reward: 'mythic' },
  { id: 'w_cup',      icon: '🏆', name: "Win this week's Festival Cup", goal: 1, stat: 'cupTrophies',     reward: 'mythic' },
  { id: 'w_cook6',    icon: '🥘', name: 'Cook 6 dishes',             goal: 6,  stat: 'dishesCooked',    reward: 'super' },
  { id: 'w_puzzle4',  icon: '🧩', name: 'Solve 4 daily puzzles',     goal: 4,  stat: 'puzzlesSolved',   reward: 'mythic' },
  { id: 'w_bugs12',   icon: '🫙', name: 'Catch 12 night critters',   goal: 12, stat: 'bugsCaught',      reward: 'super' },
  { id: 'w_mini20',   icon: '🎲', name: 'Play 20 house mini-games',  goal: 20, stat: 'minigamesPlayed', reward: 'super' },
  { id: 'w_gold8',    icon: '🥇', name: 'Win 8 mini-game gold medals', goal: 8, stat: 'minigameGolds',  reward: 'mythic' },
  { id: 'w_donate8',  icon: '🏛️', name: 'Donate 8 cards to the museum', goal: 8, stat: 'donations',     reward: 'super' },
  { id: 'w_exped5',   icon: '🧭', name: 'Bring home 5 expeditions',  goal: 5,  stat: 'expeditionsDone', reward: 'super' },
  { id: 'w_chal6',    icon: '🎯', name: 'Beat 6 deck challenges',    goal: 6,  stat: 'challengesWon',   reward: 'mythic' },
  { id: 'w_trade5',   icon: '🤝', name: 'Make 5 trades',             goal: 5,  stat: 'tradesDone',      reward: 'super' },
  { id: 'w_foil3',    icon: '✨', name: 'Find 3 foil cards',         goal: 3,  stat: 'foilsFound',      reward: 'mythic' }
];

const ACHIEVEMENTS = [
  { id: 'first-card',  icon: '🌱', name: 'First find',      test: () => state.progress.totals.cardsFound >= 1 },
  { id: 'first-win',   icon: '🏅', name: 'First win',       test: () => state.progress.totals.battlesWon >= 1 },
  { id: 'deck-ready',  icon: '🎴', name: 'Deck tuned',      test: () => state.progress.deckEdits >= 1 && state.deck.length >= DECK_SIZE },
  { id: 'collector',   icon: '📚', name: '30 cards',        test: () => state.ownedCards.length >= 30 },
  { id: 'rare-find',   icon: '💎', name: 'Rare or better',  test: () => state.ownedCards.some(id => RARITY_ORDER.indexOf(cardDef(id).rarity) >= 1) },
  { id: 'super-find',  icon: '🌟', name: 'Super ultra',     test: () => state.ownedCards.some(id => RARITY_ORDER.indexOf(cardDef(id).rarity) >= 3) },
  { id: 'mythic-find', icon: '🐋', name: 'Mythic card',     test: () => state.ownedCards.some(id => cardDef(id).rarity === 'mythic') },
  { id: 'boss-bested', icon: '👑', name: 'Boss bested',     test: () => state.progress.totals.bossesWon >= 1 },
  { id: 'explorer',    icon: '🧭', name: 'All districts',   test: () => Object.keys(DISTRICTS).every(k => state.visitedDistricts.includes(k)) },
  { id: 'wanderer',    icon: '👣', name: '100 steps',       test: () => state.progress.totals.steps >= 100 },
  { id: 'regular',     icon: '🗓️', name: '3-day streak',    test: () => state.progress.giftStreak >= 3 },
  { id: 'ten-wins',    icon: '🔥', name: '10 wins',         test: () => state.progress.totals.battlesWon >= 10 },
  { id: 'first-pack',  icon: '🌾', name: 'First pack',      test: () => state.progress.packsOpened >= 1 },
  { id: 'tidy',        icon: '🫧', name: 'Tidy up',         test: () => state.progress.released >= 10 },
  { id: 'alm-half',    icon: '📖', name: 'Half the Index', test: () => discoveredSet().size >= Math.ceil(CARD_POOL.length / 2) },
  { id: 'alm-full',    icon: '🏛️', name: 'Complete Index', test: () => CARD_POOL.every(c => discoveredSet().has(c.id)) },
  { id: 'first-craft', icon: '🔨', name: 'First craft',     test: () => state.progress.crafted >= 1 },
  { id: 'lucky-skill', icon: '🪄', name: 'Lucky skill',     test: () => state.progress.skillsCrafted >= 1 },
  { id: 'collector-60',  icon: '📦', name: '60 cards',        test: () => state.ownedCards.length >= 60 },
  { id: 'collector-100', icon: '🏰', name: '100 cards',       test: () => state.ownedCards.length >= 100 },
  { id: 'all-rarities', icon: '🌈', name: 'One of every rarity', test: () => RARITY_ORDER.every(r => state.ownedCards.some(id => cardDef(id).rarity === r)) },
  { id: 'mythic-x3',   icon: '🐳', name: '3 mythic cards',   test: () => state.ownedCards.filter(id => cardDef(id).rarity === 'mythic').length >= 3 },
  { id: 'boss-all',    icon: '🏆', name: 'All bosses beaten', test: () => Object.keys(DISTRICTS).every(k => { const d = state.districtData[k]; return !!(d && d.boss && d.boss.defeated); }) },
  { id: 'streak-7',    icon: '🔆', name: '7-day streak',     test: () => state.progress.giftStreak >= 7 },
  { id: 'streak-14',   icon: '🌕', name: '14-day streak',    test: () => state.progress.giftStreak >= 14 },
  { id: 'wins-25',     icon: '💪', name: '25 wins',          test: () => state.progress.totals.battlesWon >= 25 },
  { id: 'wins-50',     icon: '🏵️', name: '50 wins',          test: () => state.progress.totals.battlesWon >= 50 },
  { id: 'steps-250',   icon: '🚶', name: '250 steps',        test: () => state.progress.totals.steps >= 250 },
  { id: 'steps-500',   icon: '🏃', name: '500 steps',        test: () => state.progress.totals.steps >= 500 },
  { id: 'steps-1000',  icon: '🌍', name: '1000 steps',       test: () => state.progress.totals.steps >= 1000 },
  { id: 'fish-10',     icon: '🎏', name: '10 fish caught',   test: () => state.progress.totals.fishCaught >= 10 },
  { id: 'fish-25',     icon: '🐡', name: '25 fish caught',   test: () => state.progress.totals.fishCaught >= 25 },
  { id: 'favours-5',   icon: '💝', name: '5 favours done',   test: () => state.progress.totals.favours >= 5 },
  { id: 'favours-10',  icon: '🕊️', name: '10 favours done',  test: () => state.progress.totals.favours >= 10 },
  { id: 'spirits-5',   icon: '🌌', name: '5 spirits met',    test: () => state.progress.totals.spiritsMet >= 5 },
  { id: 'spirits-10',  icon: '👻', name: '10 spirits met',   test: () => state.progress.totals.spiritsMet >= 10 },
  { id: 'packs-5',     icon: '🎫', name: '5 packs opened',   test: () => state.progress.packsOpened >= 5 },
  { id: 'packs-10',    icon: '🎪', name: '10 packs opened',  test: () => state.progress.packsOpened >= 10 },
  { id: 'crafted-5',   icon: '⚒️', name: '5 crafts',         test: () => state.progress.crafted >= 5 },
  { id: 'crafted-10',  icon: '🛠️', name: '10 crafts',        test: () => state.progress.crafted >= 10 },
  { id: 'skills-3',    icon: '🍀', name: '3 lucky skills',   test: () => state.progress.skillsCrafted >= 3 },
  { id: 'released-25', icon: '♻️', name: '25 released',      test: () => state.progress.released >= 25 },
  { id: 'released-50', icon: '🌊', name: '50 released',      test: () => state.progress.released >= 50 },
  { id: 'deck-master', icon: '🧩', name: '10 deck edits',    test: () => state.progress.deckEdits >= 10 },
  { id: 'chest-1',     icon: '🗝️', name: 'First chest',      test: () => (state.progress.totals.chestsOpened || 0) >= 1 },
  { id: 'chest-5',     icon: '🏴', name: '5 chests opened',  test: () => (state.progress.totals.chestsOpened || 0) >= 5 },
  { id: 'index-75',    icon: '📜', name: '75% of the Index', test: () => discoveredSet().size >= Math.ceil(CARD_POOL.length * 0.75) },
  { id: 'collector-150', icon: '🗼', name: '150 cards',       test: () => state.ownedCards.length >= 150 },
  { id: 'mythic-x5',   icon: '🦄', name: '5 mythic cards',   test: () => state.ownedCards.filter(id => cardDef(id).rarity === 'mythic').length >= 5 },
  { id: 'mythic-x10',  icon: '🌠', name: '10 mythic cards',  test: () => state.ownedCards.filter(id => cardDef(id).rarity === 'mythic').length >= 10 },
  { id: 'wins-100',    icon: '🎯', name: '100 wins',         test: () => state.progress.totals.battlesWon >= 100 },
  { id: 'wins-200',    icon: '👑', name: '200 wins',         test: () => state.progress.totals.battlesWon >= 200 },
  { id: 'steps-2500',  icon: '🥾', name: '2,500 steps',      test: () => state.progress.totals.steps >= 2500 },
  { id: 'steps-5000',  icon: '🧭', name: '5,000 steps',      test: () => state.progress.totals.steps >= 5000 },
  { id: 'steps-10000', icon: '🏆', name: '10,000 steps',     test: () => state.progress.totals.steps >= 10000 },
  { id: 'fish-50',     icon: '🎣', name: '50 fish caught',   test: () => state.progress.totals.fishCaught >= 50 },
  { id: 'fish-100',    icon: '🐋', name: '100 fish caught',  test: () => state.progress.totals.fishCaught >= 100 },
  { id: 'favours-20',  icon: '🌷', name: '20 favours done',  test: () => state.progress.totals.favours >= 20 },
  { id: 'favours-30',  icon: '🎁', name: '30 favours done',  test: () => state.progress.totals.favours >= 30 },
  { id: 'spirits-20',  icon: '🪄', name: '20 spirits met',   test: () => state.progress.totals.spiritsMet >= 20 },
  { id: 'spirits-30',  icon: '🎆', name: '30 spirits met',   test: () => state.progress.totals.spiritsMet >= 30 },
  { id: 'packs-25',    icon: '🎡', name: '25 packs opened',  test: () => state.progress.packsOpened >= 25 },
  { id: 'packs-50',    icon: '🎢', name: '50 packs opened',  test: () => state.progress.packsOpened >= 50 },
  { id: 'crafted-25',  icon: '⚙️', name: '25 crafts',        test: () => state.progress.crafted >= 25 },
  { id: 'skills-10',   icon: '🎋', name: '10 lucky skills',  test: () => state.progress.skillsCrafted >= 10 },
  { id: 'released-100', icon: '🌀', name: '100 released',    test: () => state.progress.released >= 100 },
  { id: 'deck-master-25', icon: '🪡', name: '25 deck edits', test: () => state.progress.deckEdits >= 25 },
  { id: 'chest-10',    icon: '⛓️', name: '10 chests opened', test: () => (state.progress.totals.chestsOpened || 0) >= 10 },
  { id: 'chest-20',    icon: '💎', name: '20 chests opened', test: () => (state.progress.totals.chestsOpened || 0) >= 20 },
  { id: 'index-90',    icon: '🗂️', name: '90% of the Index', test: () => discoveredSet().size >= Math.ceil(CARD_POOL.length * 0.9) },
  { id: 'streak-30',   icon: '🌞', name: '30-day streak',    test: () => state.progress.giftStreak >= 30 },
  { id: 'first-weekly', icon: '📅', name: 'First weekly quest', test: () => (state.progress.questHistory || []).some(h => h.kind === 'weekly') },
  { id: 'weekly-10',   icon: '🗓️', name: '10 weekly quests', test: () => (state.progress.questHistory || []).filter(h => h.kind === 'weekly').length >= 10 },
  { id: 'quests-50',   icon: '📋', name: '50 quests done',   test: () => (state.progress.questHistory || []).length >= 50 },
  { id: 'quests-150',  icon: '📜', name: '150 quests done',  test: () => (state.progress.questHistory || []).length >= 150 },
  { id: 'first-loaf',  icon: '🍞', name: 'First loaf',       test: () => (state.progress.totals.breadBaked || 0) >= 1 },
  { id: 'bread-10',    icon: '🥖', name: '10 loaves shared', test: () => (state.progress.totals.breadShared || 0) >= 10 },
  { id: 'first-spell', icon: '✨', name: 'First spell',      test: () => (state.progress.totals.spellsCast || 0) >= 1 },
  { id: 'spells-50',   icon: '📜', name: '50 spells cast',   test: () => (state.progress.totals.spellsCast || 0) >= 50 },
  { id: 'sleeved',     icon: '🎴', name: 'Sharp sleeves',    test: () => ((state.character.unlockedSleeves || []).length > 1) },
  { id: 'cellar-5',    icon: '🕳️', name: 'Cellar floor 5',   test: () => (state.progress.cellarBest || 0) >= 5 },
  { id: 'cellar-10',   icon: '🦇', name: 'Cellar floor 10',  test: () => (state.progress.cellarBest || 0) >= 10 },
  { id: 'cellar-20',   icon: '🐉', name: 'Cellar floor 20',  test: () => (state.progress.cellarBest || 0) >= 20 },
  { id: 'rival-first', icon: '🎭', name: 'Beat Rook',        test: () => (state.progress.totals.rivalWins || 0) >= 1 },
  { id: 'rival-done',  icon: '🃏', name: 'Rivalry settled',  test: () => !!(state.progress.rival && state.progress.rival.chapter >= RIVAL.chapters) },
  { id: 'friend-3',    icon: '💞', name: 'A true friend',    test: () => Object.values(state.progress.friends || {}).some(f => heartsFor(f.points) >= 3) },
  { id: 'friend-5',    icon: '💖', name: 'Best friends',     test: () => Object.values(state.progress.friends || {}).some(f => heartsFor(f.points) >= 5) },
  { id: 'first-harvest', icon: '🌻', name: 'First harvest',  test: () => (state.progress.totals.cropsHarvested || 0) >= 1 },
  { id: 'green-thumb', icon: '🪴', name: '25 harvests',      test: () => (state.progress.totals.cropsHarvested || 0) >= 25 },
  { id: 'fish-log-half', icon: '🐠', name: 'Half the fish log', test: () => FISH.filter(f => state.progress.fishing && state.progress.fishing.caught[f.id]).length >= Math.ceil(FISH.length / 2) },
  { id: 'fish-log-full', icon: '🐋', name: 'Every fish',     test: () => FISH.every(f => state.progress.fishing && state.progress.fishing.caught[f.id]) },
  { id: 'legend-fish', icon: '🌟', name: 'A legendary catch', test: () => !!(state.progress.fishing && state.progress.fishing.caught['star-koi']) },
  { id: 'first-dish',  icon: '🍳', name: 'First dish',       test: () => (state.progress.totals.dishesCooked || 0) >= 1 },
  { id: 'chef',        icon: '🧑‍🍳', name: '20 dishes cooked', test: () => (state.progress.totals.dishesCooked || 0) >= 20 },
  { id: 'puzzle-1',    icon: '🧩', name: 'First puzzle',     test: () => (state.progress.totals.puzzlesSolved || 0) >= 1 },
  { id: 'puzzle-7',    icon: '🗝️', name: '7-day puzzle streak', test: () => !!(state.progress.puzzle && state.progress.puzzle.streak >= 7) },
  { id: 'cup-champ',   icon: '🏆', name: 'Cup champion',     test: () => (state.progress.totals.cupTrophies || 0) >= 1 },
  { id: 'cup-4',       icon: '🎖️', name: 'Four cups',        test: () => (state.progress.totals.cupTrophies || 0) >= 4 },
  { id: 'all-bosses-twist', icon: '🌊', name: 'Tide turner', test: () => !!(state.districtData.harbor && state.districtData.harbor.boss && state.districtData.harbor.boss.defeated) },
  { id: 'first-critter', icon: '✨', name: 'First critter',  test: () => (state.progress.totals.bugsCaught || 0) >= 1 },
  { id: 'starwing',    icon: '💫', name: 'Caught a Starwing', test: () => !!(state.progress.bugs && state.progress.bugs.caught && state.progress.bugs.caught.starwing) },
  { id: 'companion',   icon: '👻', name: 'A spirit friend',  test: () => !!state.companion },
  { id: 'cosy-home',   icon: '🏠', name: 'Cosy cottage',     test: () => !!(state.progress.home && state.progress.home.shelf.length >= SHELF_MAX) },
  { id: 'pen-pal',     icon: '📬', name: '10 letters read',  test: () => (state.progress.totals.lettersRead || 0) >= 10 },
  { id: 'mini-first',  icon: '🎲', name: 'First mini-game',  test: () => (state.progress.totals.minigamesPlayed || 0) >= 1 },
  { id: 'mini-gold-5', icon: '🥇', name: 'Gold in 5 games',  test: () => miniGoldCount() >= 5 },
  { id: 'mini-all-gold', icon: '🏅', name: 'Gold in every game', test: () => miniGoldCount() >= Object.keys(MINIGAMES).length },
  { id: 'mini-50',     icon: '🕹️', name: '50 mini-games',    test: () => (state.progress.totals.minigamesPlayed || 0) >= 50 },
  { id: 'first-donation', icon: '🏛️', name: 'First donation', test: () => (state.progress.totals.donations || 0) >= 1 },
  { id: 'wing-done',   icon: '🖼️', name: 'A museum wing',    test: () => !!(state.progress.museum && Object.keys(state.progress.museum.wings).length >= 1) },
  { id: 'museum-full', icon: '🏛️', name: 'Every museum wing', test: () => !!(state.progress.museum && Object.keys(state.progress.museum.wings).length >= MUSEUM_WINGS.length) },
  { id: 'first-exped', icon: '🧭', name: 'First expedition', test: () => (state.progress.totals.expeditionsDone || 0) >= 1 },
  { id: 'exped-20',    icon: '⛰️', name: '20 expeditions',   test: () => (state.progress.totals.expeditionsDone || 0) >= 20 },
  { id: 'first-trade', icon: '🤝', name: 'First trade',      test: () => (state.progress.totals.tradesDone || 0) >= 1 },
  { id: 'trade-15',    icon: '💱', name: '15 trades',        test: () => (state.progress.totals.tradesDone || 0) >= 15 },
  { id: 'mastery-3',   icon: '✨', name: 'A ★★★ card',       test: () => Object.keys(state.progress.mastery || {}).some(id => masteryRank(id) >= 3) },
  { id: 'mastery-10',  icon: '🌟', name: 'Ten ★★★ cards',    test: () => Object.keys(state.progress.mastery || {}).filter(id => masteryRank(id) >= 3).length >= 10 },
  { id: 'set-1',       icon: '🧩', name: 'First set',        test: () => CARD_SETS.some(setComplete) },
  { id: 'set-all',     icon: '🏅', name: 'Every set',        test: () => CARD_SETS.every(setComplete) },
  { id: 'charms-3',    icon: '✦', name: 'Three charms',      test: () => activeCharms().length >= 3 },
  { id: 'challenge-10', icon: '🎯', name: '10 challenges',   test: () => (state.progress.totals.challengesWon || 0) >= 10 },
  { id: 'card-gifts-10', icon: '🃏', name: '10 cards given', test: () => (state.progress.totals.cardsGifted || 0) >= 10 },
  { id: 'settled-in',  icon: '📜', name: 'Settled in',       test: () => !!(state.progress.story && state.progress.story.step >= STORY_ARC_LEN) },
  { id: 'true-local',  icon: '🏘️', name: 'A true local',      test: () => !!(state.progress.story && state.progress.story.step >= STORY.length) },
  { id: 'first-foil',  icon: '✨', name: 'First foil',        test: () => (state.progress.totals.foilsFound || 0) >= 1 },
  { id: 'foil-10',     icon: '🌈', name: '10 foils',          test: () => (state.progress.totals.foilsFound || 0) >= 10 }
];

const DAILY_QUEST_COUNT = 20;
const WEEKLY_QUEST_COUNT = 20;

// Draws `count` quests from `pool`, preferring one of each stat before repeating any - used for both
// dailies and weekly quests so a fresh set stays varied even at a count larger than the number of stats.
function drawQuestSet(pool, count) {
  const shuffled = shuffle(pool.slice());
  const picked = [], usedStats = new Set();
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (usedStats.has(q.stat)) continue;
    usedStats.add(q.stat);
    picked.push(q);
  }
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (picked.includes(q)) continue;
    picked.push(q);
  }
  return picked;
}

function ensureQuests() {
  const pr = state.progress;
  const today = todayKey();
  // Also redraw if a saved quest points at an id that no longer exists in QUEST_POOL (e.g. after a
  // pool edit) - otherwise questDef(id) returns undefined and every caller downstream throws.
  const stale = pr.quests.some(q => !questDef(q.id));
  if (pr.questDay === today && pr.quests.length && !stale) return;
  // New day: draw a fresh set of quests, baseline against current totals so progress starts at 0 today
  const picked = drawQuestSet(QUEST_POOL, DAILY_QUEST_COUNT)
    .map(q => ({ id: q.id, base: pr.totals[q.stat] || 0, claimed: false }));
  pr.questDay = today;
  pr.quests = picked;
  saveState();
}

function questDef(id) { return QUEST_POOL.find(q => q.id === id); }
function questProgress(q) {
  const def = questDef(q.id);
  return Math.min(def.goal, Math.max(0, (state.progress.totals[def.stat] || 0) - q.base));
}

// Simple year+week-number key - doesn't need to be calendar-precise, just needs to change once a week.
function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + week;
}
function ensureWeeklyQuests() {
  const pr = state.progress;
  if (!Array.isArray(pr.weeklyQuests)) pr.weeklyQuests = [];
  if (typeof pr.weekKey !== 'string') pr.weekKey = null;
  const wk = weekKey();
  const stale = pr.weeklyQuests.some(q => !weeklyQuestDef(q.id));
  if (pr.weekKey === wk && pr.weeklyQuests.length && !stale) return;
  // New week: draw a fresh set of weekly quests, baselined against current totals like dailies
  const picked = drawQuestSet(WEEKLY_QUEST_POOL, WEEKLY_QUEST_COUNT)
    .map(q => ({ id: q.id, base: pr.totals[q.stat] || 0, claimed: false }));
  pr.weekKey = wk;
  pr.weeklyQuests = picked;
  saveState();
}
function weeklyQuestDef(id) { return WEEKLY_QUEST_POOL.find(q => q.id === id); }
function weeklyQuestProgress(q) {
  const def = weeklyQuestDef(q.id);
  return Math.min(def.goal, Math.max(0, (state.progress.totals[def.stat] || 0) - q.base));
}

// Completed dailies and weeklies both land here, newest first - what the Journal's Quest Log shows under "Completed".
const QUEST_HISTORY_MAX = 100;
function ensureQuestHistory() {
  const pr = state.progress;
  if (!Array.isArray(pr.questHistory)) pr.questHistory = [];
  return pr.questHistory;
}
function logQuestHistory(kind, def, rewardCardId) {
  const hist = ensureQuestHistory();
  hist.unshift({ kind, icon: def.icon, name: def.name, reward: cardDef(rewardCardId).rarity, at: Date.now() });
  if (hist.length > QUEST_HISTORY_MAX) hist.length = QUEST_HISTORY_MAX;
}

function giftReady() { return state.progress.lastGift !== todayKey(); }

function claimDailyGift() {
  if (!giftReady()) return;
  const pr = state.progress;
  // Streak continues only if the last claim was yesterday
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  pr.giftStreak = (pr.lastGift === yKey) ? pr.giftStreak + 1 : 1;
  pr.lastGift = todayKey();

  // Gift is always at least rare; streak nudges the odds upward, never punishes a gap
  const bonus = Math.min(pr.giftStreak, 7) * 0.03;
  let rarity = 'rare';
  const r = Math.random();
  if (r < 0.04 + bonus * 0.4) rarity = 'super';
  else if (r < 0.25 + bonus) rarity = 'ultra';
  const id = randomCardId(rarity);
  state.ownedCards.push(id);
  noteCardsFound(1);
  saveState();
  updateHud();
  showCardReveal(id, `Daily gift · day ${pr.giftStreak}`, true);
  renderQuests();
  checkAchievements();
}

function claimQuest(index) {
  const q = state.progress.quests[index];
  if (!q || q.claimed) return;
  const def = questDef(q.id);
  if (questProgress(q) < def.goal) return;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('daily', def, id);
  saveState();
  updateHud();
  logEvent('🎯', `Completed quest: ${def.name}.`);
  showCardReveal(id, 'Quest complete', true);
  renderQuests();
  checkAchievements();
}

function claimWeeklyQuest(index) {
  const q = state.progress.weeklyQuests[index];
  if (!q || q.claimed) return;
  const def = weeklyQuestDef(q.id);
  if (weeklyQuestProgress(q) < def.goal) return;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('weekly', def, id);
  saveState();
  updateHud();
  logEvent('🏵️', `Completed weekly quest: ${def.name}.`);
  showCardReveal(id, 'Weekly quest complete', true);
  renderQuests();
  checkAchievements();
}

function checkAchievements() {
  const pr = state.progress;
  let anyNew = false;
  ACHIEVEMENTS.forEach(a => {
    if (!pr.achievements.includes(a.id) && a.test()) {
      pr.achievements.push(a.id);
      anyNew = true;
      pr.freshAch = a.id;
      toast(`${a.icon} Milestone: ${a.name}`);
      logEvent(a.icon, `Milestone reached: ${a.name}.`);
      const t = titleFor(a.id);
      if (t) { toast(`🏷️ New title: ${t.name} - wear it from your profile`); logEvent('🏷️', `Earned the title "${t.name}".`); }
      sfx('claim'); buzz(HAP.found);
    }
  });
  if (anyNew) saveState();
  updateQuestBadge();
  if (!questsPanel.classList.contains('hidden')) renderQuests();
}

function updateCardsBadge() {
  const btn = document.getElementById('tabCollection');
  const show = almanacHasNew() && !btn.classList.contains('active');
  let dot = btn.querySelector('.dot');
  if (show && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!show && dot) dot.remove();
}

function updateQuestBadge() {
  updateCardsBadge();
  const btn = document.getElementById('tabQuests');
  const pr = state.progress;
  ensureQuests();
  ensureWeeklyQuests();
  const claimable = pr.quests.some(q => !q.claimed && questProgress(q) >= questDef(q.id).goal)
    || (pr.weeklyQuests || []).some(q => !q.claimed && weeklyQuestProgress(q) >= weeklyQuestDef(q.id).goal);
  const show = giftReady() || claimable || storyReady();
  let dot = btn.querySelector('.dot');
  if (show && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!show && dot) dot.remove();
}

function bumpStat(stat, n) {
  state.progress.totals[stat] = (state.progress.totals[stat] || 0) + (n || 1);
  if (stat === 'cardsFound') noteCardsFound(n || 1);
  // Toast when a quest first completes, so progress feels alive
  state.progress.quests.forEach(q => {
    const def = questDef(q.id);
    if (def.stat === stat && !q.claimed && !q.notified && questProgress(q) >= def.goal) {
      q.notified = true;
      toast(`${def.icon} Quest ready to claim!`);
      sfx('claim');
    }
  });
  addXP((XP_PER_STAT[stat] || 2) * (n || 1));
  saveState();
  checkAchievements();
}

/* ---------------- leveling: XP for basically everything you do, steps included ---------------- */
const XP_PER_STAT = {
  steps: 0.25, cardsFound: 15, battlesWon: 40, bossesWon: 150, fishCaught: 18,
  favours: 30, spiritsMet: 10, districtsVisited: 60, decorationsPlaced: 12,
  breadBaked: 8, breadShared: 10, spellsCast: 3, seedsPlanted: 3, seedsFound: 5, cropsHarvested: 5, rivalWins: 60,
  minigamesPlayed: 5, minigameGolds: 10, talks: 1, foilsFound: 20,
  donations: 6, expeditionsDone: 25, tradesDone: 15, cardsGifted: 10, challengesWon: 40, setsCompleted: 60, masteryRanks: 15, charmsSet: 2,
  dishesCooked: 10, dishesGiven: 10, snacksEaten: 2, puzzlesSolved: 40, cupRoundsWon: 30, cupTrophies: 100, bugsCaught: 8, lettersRead: 2,
};
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
  let levelsGained = 0, bonusLevel = null;
  while (pr.xp >= xpToNext(pr.level)) {
    pr.xp -= xpToNext(pr.level);
    pr.level++;
    levelsGained++;
    if (pr.level % 5 === 0) bonusLevel = pr.level;
  }
  if (levelsGained > 0) {
    const pebbleGain = levelsGained * 5;
    addPebbles(pebbleGain);
    let bonusCardId = null;
    if (bonusLevel) { bonusCardId = randomCardId('rare'); state.ownedCards.push(bonusCardId); noteCardsFound(1); }
    showLevelUp(pr.level, pebbleGain, bonusCardId);
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
  const pmBadge = document.getElementById('pmLevelBadge'), pmText = document.getElementById('pmXpText'), pmFill = document.getElementById('pmXpFill');
  if (pmBadge) pmBadge.textContent = 'Lv ' + pr.level;
  if (pmText) pmText.textContent = `${Math.floor(pr.xp)} / ${need} XP`;
  if (pmFill) pmFill.style.width = pct + '%';
}
function showLevelUp(level, pebbles, bonusCardId) {
  logEvent('⭐', `Reached Level ${level}.`);
  document.getElementById('levelUpNum').textContent = level;
  const desc = document.getElementById('levelUpDesc');
  desc.innerHTML = `You reached <b>Level ${level}</b>!<br>+${pebbles} 🫧 Pebbles` + (bonusCardId ? `<br><b>A bonus card is waiting for you.</b>` : '');
  sparkleBurst(document.getElementById('levelUpSparkles'), ['⭐', '✨', '🌟'], 16);
  document.getElementById('levelUpOverlay').classList.remove('hidden');
  sfx('claim'); buzz(HAP.win);
  document.getElementById('levelUpContinue').onclick = () => {
    document.getElementById('levelUpOverlay').classList.add('hidden');
    if (bonusCardId) setTimeout(() => showCardReveal(bonusCardId, `Level ${level} bonus card`, true), 200);
  };
}

function renderQuests() {
  ensureQuests();
  ensureWeeklyQuests();
  const pr = state.progress;

  renderStory();
  const slot = document.getElementById('giftSlot');
  const ready = giftReady();
  slot.innerHTML = `
    <div class="gift-card ${ready ? 'ready' : ''}" id="giftCard">
      <div class="g-icon">${ready ? '🎁' : '📦'}</div>
      <div>
        <div class="g-title">${ready ? 'Your daily gift is ready' : 'Daily gift collected'}</div>
        <div class="g-sub">${ready ? 'Tap to open. A rare card or better.' : `Come back tomorrow${pr.giftStreak > 1 ? ` · ${pr.giftStreak}-day streak` : ''}`}</div>
      </div>
    </div>`;
  if (ready) document.getElementById('giftCard').addEventListener('click', claimDailyGift);

  const list = document.getElementById('questList');
  list.innerHTML = '';
  pr.quests.forEach((q, i) => {
    const def = questDef(q.id);
    const prog = questProgress(q);
    const done = prog >= def.goal;
    const el = document.createElement('div');
    el.className = 'quest' + (done ? ' done' : '');
    el.innerHTML = `
      <div class="quest-top">
        <span class="q-icon">${def.icon}</span>
        <span class="q-name">${def.name}</span>
        ${q.claimed ? '<span class="q-count">✓ claimed</span>'
          : done ? '<button class="panel-action active q-claim">Claim</button>'
          : `<span class="q-count">${prog}/${def.goal}</span>`}
      </div>
      <div class="q-bar"><div class="q-fill" style="width:${Math.round(prog / def.goal * 100)}%"></div></div>`;
    const btn = el.querySelector('.q-claim');
    if (btn) btn.addEventListener('click', () => claimQuest(i));
    list.appendChild(el);
  });

  const wlist = document.getElementById('weeklyQuestList');
  wlist.innerHTML = '';
  pr.weeklyQuests.forEach((q, i) => {
    const def = weeklyQuestDef(q.id);
    const prog = weeklyQuestProgress(q);
    const done = prog >= def.goal;
    const el = document.createElement('div');
    el.className = 'quest' + (done ? ' done' : '');
    el.innerHTML = `
      <div class="quest-top">
        <span class="q-icon">${def.icon}</span>
        <span class="q-name">${def.name}</span>
        ${q.claimed ? '<span class="q-count">✓ claimed</span>'
          : done ? '<button class="panel-action active q-claim">Claim</button>'
          : `<span class="q-count">${prog}/${def.goal}</span>`}
      </div>
      <div class="q-bar"><div class="q-fill" style="width:${Math.round(prog / def.goal * 100)}%"></div></div>`;
    const btn = el.querySelector('.q-claim');
    if (btn) btn.addEventListener('click', () => claimWeeklyQuest(i));
    wlist.appendChild(el);
  });

  const grid = document.getElementById('achGrid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = pr.achievements.includes(a.id);
    const el = document.createElement('div');
    el.className = 'ach' + (unlocked ? '' : ' locked') + (pr.freshAch === a.id ? ' fresh' : '');
    const t = titleFor(a.id);
    el.innerHTML = `<span class="a-ico">${unlocked ? a.icon : '🔒'}</span><span class="a-name">${a.name}</span>${t ? `<span class="a-title">🏷️ ${escapeHtml(t.name)}</span>` : ''}`;
    grid.appendChild(el);
  });
  pr.freshAch = null;

  renderFavours();
  renderQuestHistory();
}

// A read-only tracker for neighbor favours - the only way to check one used to be finding that neighbor
// again in town. Doesn't offer a "claim" button here since handing one in still has to happen in person.
function renderFriends() {
  const box = document.getElementById('friendsList');
  const list = Object.values(friendsState()).filter(fr => fr.points > 0).sort((a, b) => b.points - a.points);
  if (!list.length) { box.innerHTML = '<div class="panel-desc">Nobody yet. Finish favours, share bread from the bakery, and win friendly matches to grow closer to your neighbors.</div>'; return; }
  box.innerHTML = list.map(fr => {
    const h = heartsFor(fr.points), next = HEART_AT[h];
    const perks = [h >= SIG_HEARTS ? '🌟 signature match unlocked' : `🌟 signature match at ${SIG_HEARTS} hearts`, h >= 5 ? '🎁 keepsake given' : ''].filter(Boolean).join(' · ');
    return `<div class="panel-item"><span class="panel-icon">${fr.icon || '🙂'}</span><span class="panel-text">
      <div class="panel-name">${escapeHtml(fr.name)} <span class="q-kind">${DISTRICTS[fr.district] ? DISTRICTS[fr.district].name : ''}</span></div>
      <div class="panel-desc">${heartRow(h)} ${h >= 5 ? '' : `· ${next - fr.points} to go`}</div>
      <div class="panel-ability">${perks}</div></span></div>`;
  }).join('');
}
function renderFavours() {
  renderFriends();
  const rs = reqState();
  const active = Object.values(rs.list).filter(r => r.state === 'active');
  document.getElementById('favoursSub').textContent = `${active.length}/${REQ_MAX_ACTIVE} favours open`;
  const list = document.getElementById('favoursList');
  list.innerHTML = '';
  if (!active.length) {
    list.innerHTML = '<div class="panel-desc">No favours accepted yet - chat with a neighbor in town and see if they need a hand.</div>';
    return;
  }
  active.forEach(r => {
    const ready = requestDone(r);
    const el = document.createElement('div');
    el.className = 'quest' + (ready ? ' done' : '');
    const rewardText = r.reward ? `a ${REQ_WIN_RARITY} card or better` : `🫧 ${r.pebbles} Pebbles`;
    el.innerHTML = `
      <div class="quest-top">
        <span class="q-icon">🤝</span>
        <span class="q-name">${escapeHtml(r.giver)}<span class="q-kind">Favour</span></span>
        <span class="q-count">${ready ? 'Ready!' : ''}</span>
      </div>
      <div class="panel-desc fav-detail">${escapeHtml(r.text)}</div>
      <div class="panel-desc fav-status">${ready ? `Find ${escapeHtml(r.giver)} to hand it in · ${rewardText}` : `${escapeHtml(requestProgressText(r))} · ${rewardText}`}</div>`;
    list.appendChild(el);
  });
}

// Completed dailies and weeklies both land here, newest first - the Rewards tab's own record of what
// you've already claimed, so Dailies/Weekly only ever have to show what's still active.
function renderQuestHistory() {
  const histList = document.getElementById('questLogHistoryList');
  const hist = ensureQuestHistory();
  histList.innerHTML = '';
  if (!hist.length) {
    histList.innerHTML = '<div class="panel-desc">Nothing completed yet.</div>';
  } else {
    hist.forEach(h => {
      const el = document.createElement('div');
      el.className = 'log-entry';
      el.innerHTML = `<span class="le-icon">${h.icon}</span><span class="le-text">${escapeHtml(h.name)}<span class="q-kind">${h.kind === 'weekly' ? 'Weekly' : 'Daily'}</span><div class="le-time">${fmtLogTime(h.at)} · ${h.reward} reward</div></span>`;
      histList.appendChild(el);
    });
  }
}

const REWARDS_SEGMENTS = {
  dailies: { btn: 'segDailies', view: 'dailiesView' },
  weekly: { btn: 'segWeekly', view: 'weeklyView' },
  milestones: { btn: 'segMilestones', view: 'milestonesView' },
  favours: { btn: 'segFavours', view: 'favoursView' },
  history: { btn: 'segHistory', view: 'historyView' },
};
function switchRewardsSegment(key) {
  sfx('nav'); buzz(HAP.tap);
  Object.entries(REWARDS_SEGMENTS).forEach(([k, s]) => {
    document.getElementById(s.btn).classList.toggle('active', k === key);
    document.getElementById(s.view).classList.toggle('hidden', k !== key);
  });
}
document.getElementById('segDailies').addEventListener('click', () => switchRewardsSegment('dailies'));
document.getElementById('segWeekly').addEventListener('click', () => switchRewardsSegment('weekly'));
document.getElementById('segMilestones').addEventListener('click', () => switchRewardsSegment('milestones'));
document.getElementById('segFavours').addEventListener('click', () => switchRewardsSegment('favours'));
document.getElementById('segHistory').addEventListener('click', () => switchRewardsSegment('history'));


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
const pickupIcon = document.getElementById('pickupIcon');
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
  deck: { btn: document.getElementById('tabDeck'), panel: deckPanel },
  shop: { btn: document.getElementById('tabShop'), panel: shopPanel },
  quests: { btn: document.getElementById('tabQuests'), panel: questsPanel }
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
function kwLines(def) { return def.kw.map(k => `${KW[k].icon} <b>${KW[k].name}.</b> ${KW[k].text}`).join('<br>'); }
// Spells have no power/health, so every place that prints a card's stats or rules text goes through these.
function spellText(def) { return def && def.spell ? BattleEngine.SPELLS[def.spell].text : ''; }
function cardStatsText(def) { return def.spell ? '✨ Spell' : `⚔${def.power} ♥${def.grit}`; }
function hasAbility(def) { return !!def.spell || def.kw.length > 0; }
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
    if (!state.decorationInventory || typeof state.decorationInventory !== 'object') state.decorationInventory = {};
    // Character: old saves may have a `hat` field, and border/borderStyle from before cosmetics moved to
    // the simpler emoji+accessory+color system - drop all three, they're unused now.
    if (!state.character || typeof state.character !== 'object') state.character = { emoji: '🧑', color: '#a8d4cc', accessory: '', name: 'You' };
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

function saveState() {
  // the active deck slot always mirrors the live deck, whichever screen changed it
  if (Array.isArray(state.deckSlots) && state.deckSlots[state.activeDeckSlot]) state.deckSlots[state.activeDeckSlot].cards = state.deck.slice();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function rollRarity(forBoss) {
  const w = Math.min(state.wins, 12);
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
const BASE_COMMONS = ['sprout','sprout','sprout','pebble','pebble','pebble','reed','reed','reed','droplet','droplet','toadstool','toadstool','bubble','flintstone','moth'];

// Opponent decks are built the same way the Deck tab's Auto-fill builds yours: from a pool of cards, with a healthy cost curve.
function buildDeckForOpponent(count, forBoss) {
  const pool = BASE_COMMONS.slice();
  for (let i = 0; i < 14; i++) {
    const rarity = forBoss ? (Math.random() < 0.35 ? 'super' : (Math.random() < 0.55 ? 'ultra' : 'rare')) : rollRarity(false);
    pool.push(randomCardId(rarity));
  }
  const counts = {};
  pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return BattleEngine.suggestDeck(counts);
}

// How hard an opponent is: chosen at battle time from how many battles you have won.
// Difficulty is tuned by simulation (see the notes with the game). Friendly neighbors start with less Spirit.
// Regular neighbors: gentle -> normal -> sharp as you win more. Bosses: normal, then sharp from 5 wins, with full-strength Spirit.
function opponentProfile(isBoss) {
  const w = state.wins;
  if (isBoss) return w < 5 ? { level: 'normal', spirit: 18 } : { level: 'smart', spirit: 20 };
  if (w < 3) return { level: 'gentle', spirit: 15 };
  return w < 8 ? { level: 'normal', spirit: 17 } : { level: 'smart', spirit: 18 };
}
