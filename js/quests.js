/* ============================================================
   QUESTS, ACHIEVEMENTS AND THE REWARDS SCREEN
   Moved out of js/progression.js. Loads straight after it; progression.js keeps tips, levelling, the Ember ledger, the DOM
   handles, save/load and the opponent/reward helpers. Everything here is looked up at run time, so the split changes no behaviour.
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
  { id: 'draft2',   icon: '🎴', name: 'Win 2 matches in a Draft Run', goal: 2, stat: 'draftWins', reward: 'rare' },
  { id: 'knack1',   icon: '✨', name: "Use your Keeper's Knack in a match", goal: 1, stat: 'knacksUsed', reward: 'common' },
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
  { id: 'plant2',   icon: '🌱', name: 'Plant 2 seeds in El Umbral', goal: 2,  stat: 'seedsPlanted',    reward: 'common' },
  { id: 'harvest1', icon: '🌻', name: 'Harvest something you grew',   goal: 1,  stat: 'cropsHarvested',  reward: 'rare' },
  { id: 'rival1',   icon: '🎭', name: 'Beat your rival, Rook',        goal: 1,  stat: 'rivalWins',       reward: 'ultra' },
  { id: 'cook1',    icon: '🍳', name: 'Cook a dish with Maple',       goal: 1,  stat: 'dishesCooked',    reward: 'rare' },
  { id: 'puzzle1',  icon: '🧩', name: "Solve Olwen's daily puzzle",   goal: 1,  stat: 'puzzlesSolved',   reward: 'ultra' },
  { id: 'cupwin1',  icon: '🥉', name: 'Win a Dreamers’ Cup match',     goal: 1,  stat: 'cupRoundsWon',    reward: 'rare' },
  { id: 'bugs2',    icon: '✨', name: 'Catch 2 night critters',       goal: 2,  stat: 'bugsCaught',      reward: 'common' },
  { id: 'mini3',    icon: '🎲', name: 'Play 3 house mini-games',      goal: 3,  stat: 'minigamesPlayed', reward: 'common' },
  { id: 'donate1',  icon: '🏛️', name: 'Donate a card to the museum',  goal: 1,  stat: 'donations',       reward: 'common' },
  { id: 'exped1',   icon: '🧭', name: 'Bring home an expedition',     goal: 1,  stat: 'expeditionsDone', reward: 'rare' },
  { id: 'trade1',   icon: '🤝', name: 'Make a trade at the board',    goal: 1,  stat: 'tradesDone',      reward: 'rare' },
  { id: 'cardgift1', icon: '🃏', name: 'Give a neighbor a card',      goal: 1,  stat: 'cardsGifted',     reward: 'common' },
  { id: 'chal1',    icon: '🎯', name: 'Beat a deck challenge',        goal: 1,  stat: 'challengesWon',   reward: 'ultra' },
  { id: 'minigold', icon: '🥇', name: 'Win a gold medal in a mini-game', goal: 1, stat: 'minigameGolds', reward: 'rare' },
  { id: 'foil1',    icon: '✨', name: 'Find a foil card',              goal: 1, stat: 'foilsFound',      reward: 'rare' },
  { id: 'rainyfish1', icon: '🌧️', name: 'Catch a fish while it rains', goal: 1, stat: 'rainyFish',       reward: 'rare' },
  { id: 'foggyfind1', icon: '🌧️', name: 'Find a card in the rain',     goal: 1, stat: 'foggyFinds',      reward: 'rare' },
  { id: 'acts6',    icon: '🪑', name: 'Interact with 6 things around town', goal: 6,  stat: 'townActs',  reward: 'common' },
  { id: 'acts15',   icon: '🌳', name: 'Interact with 15 things around town', goal: 15, stat: 'townActs', reward: 'rare' },
  { id: 'game2',    icon: '🎸', name: 'Play 2 town activities',        goal: 2,  stat: 'townGames',       reward: 'rare' },
  { id: 'puddle5',  icon: '🌧️', name: 'Splash through 5 puddles',      goal: 5,  stat: 'puddles',         reward: 'common' },
  { id: 'skip5',    icon: '🪨', name: 'Skip 5 stones',                 goal: 5,  stat: 'stonesSkipped',   reward: 'common' },
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
  { id: 'w_cup',      icon: '🏆', name: "Win this week's Dreamers’ Cup", goal: 1, stat: 'cupTrophies',     reward: 'mythic' },
  { id: 'w_cook6',    icon: '🥘', name: 'Cook 6 dishes',             goal: 6,  stat: 'dishesCooked',    reward: 'super' },
  { id: 'w_puzzle4',  icon: '🧩', name: 'Solve 4 daily puzzles',     goal: 4,  stat: 'puzzlesSolved',   reward: 'mythic' },
  { id: 'w_bugs12',   icon: '🫙', name: 'Catch 12 night critters',   goal: 12, stat: 'bugsCaught',      reward: 'super' },
  { id: 'w_mini20',   icon: '🎲', name: 'Play 20 house mini-games',  goal: 20, stat: 'minigamesPlayed', reward: 'super' },
  { id: 'w_gold8',    icon: '🥇', name: 'Win 8 mini-game gold medals', goal: 8, stat: 'minigameGolds',  reward: 'mythic' },
  { id: 'w_donate8',  icon: '🏛️', name: 'Donate 8 cards to the museum', goal: 8, stat: 'donations',     reward: 'super' },
  { id: 'w_exped5',   icon: '🧭', name: 'Bring home 5 expeditions',  goal: 5,  stat: 'expeditionsDone', reward: 'super' },
  { id: 'w_chal6',    icon: '🎯', name: 'Beat 6 deck challenges',    goal: 6,  stat: 'challengesWon',   reward: 'mythic' },
  { id: 'w_trade5',   icon: '🤝', name: 'Make 5 trades',             goal: 5,  stat: 'tradesDone',      reward: 'super' },
  { id: 'w_foil3',    icon: '✨', name: 'Find 3 foil cards',         goal: 3,  stat: 'foilsFound',      reward: 'mythic' },
  { id: 'w_acts60',   icon: '🏘️', name: 'Interact with 60 things around town', goal: 60, stat: 'townActs', reward: 'super' },
  { id: 'w_games8',   icon: '🎸', name: 'Play 8 town activities',    goal: 8,  stat: 'townGames',       reward: 'super' }
];

const ACHIEVEMENTS = [
  { id: 'ghost-5',    icon: '👻', name: 'Beat 5 ghosts of other testers\' decks', test: () => (state.progress.totals.ghostWins || 0) >= 5 },
  { id: 'draft-1',    icon: '🎴', name: 'Cleared a Draft Run', test: () => (state.progress.totals.draftClears || 0) >= 1 },
  { id: 'draft-5',    icon: '🃏', name: 'Cleared 5 Draft Runs', test: () => (state.progress.totals.draftClears || 0) >= 5 },
  { id: 'knack-10',   icon: '✨', name: 'Used your Knack 10 times', test: () => (state.progress.totals.knacksUsed || 0) >= 10 },
  { id: 'toss-10',    icon: '🪙', name: 'Won the first-turn toss 10 times', test: () => (state.progress.totals.tossWins || 0) >= 10 },
  { id: 'acts-25',     icon: '🪑', name: '25 town interactions', test: () => (state.progress.totals.townActs || 0) >= 25 },
  { id: 'acts-100',    icon: '🏘️', name: '100 town interactions', test: () => (state.progress.totals.townActs || 0) >= 100 },
  { id: 'games-5',     icon: '🎸', name: '5 town activities', test: () => (state.progress.totals.townGames || 0) >= 5 },
  { id: 'puddles-10',  icon: '🌧️', name: '10 puddles splashed', test: () => (state.progress.totals.puddles || 0) >= 10 },
  { id: 'mood-1',      icon: '🎈', name: 'A cheerful district', test: () => lifeTopMood() >= 1 },
  { id: 'mood-3',      icon: '🎆', name: 'A festive district', test: () => lifeTopMood() >= 3 },
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
  { id: 'foil-10',     icon: '🌈', name: '10 foils',          test: () => (state.progress.totals.foilsFound || 0) >= 10 },
  { id: 'packed-bag',  icon: '🎒', name: 'Checked your bag',  test: () => (state.progress.totals.inventoryOpened || 0) >= 1 }
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

// batch=true skips the reveal and redraw so "Claim all" can do one reveal at the end; both return the card id.
function claimQuest(index, batch) {
  const q = state.progress.quests[index];
  if (!q || q.claimed) return null;
  const def = questDef(q.id);
  if (questProgress(q) < def.goal) return null;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('daily', def, id);
  logEvent('🎯', `Completed quest: ${def.name} · ${RARITY_LABEL[cardDef(id).rarity]} reward.`);
  if (batch) return id;
  saveState();
  updateHud();
  showCardReveal(id, 'Quest complete', true);
  renderQuests();
  checkAchievements();
  return id;
}

function claimWeeklyQuest(index, batch) {
  const q = state.progress.weeklyQuests[index];
  if (!q || q.claimed) return null;
  const def = weeklyQuestDef(q.id);
  if (weeklyQuestProgress(q) < def.goal) return null;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('weekly', def, id);
  logEvent('🏵️', `Completed weekly quest: ${def.name} · ${RARITY_LABEL[cardDef(id).rarity]} reward.`);
  if (batch) return id;
  saveState();
  updateHud();
  showCardReveal(id, 'Weekly quest complete', true);
  renderQuests();
  checkAchievements();
  return id;
}

// Claim every finished quest in one go (v Beta 2): one reveal for the best card, a note for the rest.
function claimAllQuests(kind) {
  const weekly = kind === 'weekly', list = weekly ? state.progress.weeklyQuests : state.progress.quests, ids = [];
  list.forEach((q, i) => { const id = weekly ? claimWeeklyQuest(i, true) : claimQuest(i, true); if (id) ids.push(id); });
  if (!ids.length) return;
  saveState(); updateHud();
  const best = ids.slice().sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity))[0];
  showCardReveal(best, ids.length > 1 ? `${ids.length} quests claimed` : (weekly ? 'Weekly quest complete' : 'Quest complete'), true, ids.length > 1 ? `Best of ${ids.length} new cards. The rest are in your collection.` : '');
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
  if (typeof companionBond === 'function') companionBond(stat, n || 1);   // js/skills-gear.js
  if (typeof ladderFromStat === 'function') ladderFromStat(stat, n || 1);   // js/ladder-practice.js
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


// The claim center (Dailies and Weekly share it): a hero with Claim all, then Ready / In progress (closest
// first) / a collapsed "not started" group / Claimed. claimQuest()/claimWeeklyQuest() index into the
// unsorted state array, so each row carries its original index.
const claimOpen = { daily: false, weekly: false };
function renderClaimCenter(kind) {
  const weekly = kind === 'weekly', pr = state.progress;
  const box = document.getElementById(weekly ? 'weeklyClaim' : 'dailyClaim');
  const defOf = weekly ? weeklyQuestDef : questDef, progOf = weekly ? weeklyQuestProgress : questProgress;
  const rows = (weekly ? pr.weeklyQuests : pr.quests).map((q, i) => {
    const def = defOf(q.id), prog = progOf(q);
    return { q, i, def, prog, st: q.claimed ? 'done' : prog >= def.goal ? 'ready' : prog > 0 ? 'prog' : 'new' };
  });
  const by = st => rows.filter(r => r.st === st);
  const ready = by('ready'), prog = by('prog').sort((a, b) => b.prog / b.def.goal - a.prog / a.def.goal), fresh = by('new'), done = by('done');
  const row = r => `<div class="quest ${r.st === 'ready' ? 'done' : ''}">
      <div class="quest-top"><span class="q-icon">${r.def.icon}</span><span class="q-name">${r.def.name}</span>
      ${r.st === 'done' ? '<span class="q-count">✓ claimed</span>' : r.st === 'ready' ? `<button class="panel-action active q-claim" data-claim="${r.i}">Claim</button>` : `<span class="q-count">${r.prog}/${r.def.goal}</span>`}</div>
      ${r.st === 'done' ? '' : `<div class="q-bar"><div class="q-fill" style="width:${Math.round(r.prog / r.def.goal * 100)}%"></div></div>`}</div>`;
  const group = (title, note, list) => list.length ? `<div class="section-title">${title}${note ? ` <span class="q-kind">${note}</span>` : ''}</div>${list.map(row).join('')}` : '';
  const total = rows.length;
  box.innerHTML = `<div class="claim-hero ${ready.length ? 'ready' : ''}">
      <div><b>${ready.length ? `${ready.length} ready to claim` : 'Nothing to claim right now'}</b>
      <span>${done.length} of ${total} claimed ${weekly ? 'this week' : 'today'}</span></div>
      ${ready.length ? '<button class="panel-action active" data-claimall="1">Claim all</button>' : `<span class="claim-tick">${done.length === total && total ? '✅' : '🎯'}</span>`}</div>`
    + group('Ready', ready.length, ready) + group('In progress', 'closest first', prog)
    + (fresh.length ? `<button class="claim-more" data-nsopen="1">${claimOpen[kind] ? 'Hide' : 'Show'} not started · ${fresh.length}</button>${claimOpen[kind] ? fresh.map(row).join('') : ''}` : '')
    + group('Claimed', done.length, done);
  onAll(box, '[data-claim]', b => (weekly ? claimWeeklyQuest : claimQuest)(+b.dataset.claim));
  const all = box.querySelector('[data-claimall]'); if (all) all.addEventListener('click', () => claimAllQuests(kind));
  const ns = box.querySelector('[data-nsopen]'); if (ns) ns.addEventListener('click', () => { claimOpen[kind] = !claimOpen[kind]; sfx('tap'); renderClaimCenter(kind); });
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

  renderClaimCenter('daily');
  renderClaimCenter('weekly');

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
  // Ready-to-hand-in favours sort to the top, same as Dailies/Weekly's claimRank - otherwise a finished
  // favour can sit buried below several still-in-progress ones.
  active.slice().sort((a, b) => (requestDone(b) ? 1 : 0) - (requestDone(a) ? 1 : 0)).forEach(r => {
    const ready = requestDone(r);
    const el = document.createElement('div');
    el.className = 'quest' + (ready ? ' done' : '');
    const rewardText = r.reward ? `a ${REQ_WIN_RARITY} card or better` : `🫧 ${r.pebbles} Embers`;
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

// Completed dailies/weeklies still feed state.progress.questHistory (logQuestHistory, above) since
// achievements count it (first-weekly, weekly-10, quests-50, quests-150) - only the standalone "History"
// tab that once displayed it is gone now; a completed quest already gets a Journal → Log entry from
// claimQuest()/claimWeeklyQuest() (with its reward tier included), so nothing shown here was lost.
const REWARDS_SEGMENTS = {
  dailies: { btn: 'segDailies', view: 'dailiesView' },
  weekly: { btn: 'segWeekly', view: 'weeklyView' },
  milestones: { btn: 'segMilestones', view: 'milestonesView' },
  favours: { btn: 'segFavours', view: 'favoursView' },
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


