/* ============================================================
   CONTENT: THE STORY AND THE TOWN'S NEWS
   ============================================================
   The getting-started story (STORY: steps, goals and rewards) and the guide's words for each step (STORY_BEATS:
   same order and length - a test checks it), the opening dream, daily events, the Dream Gazette, gossip,
   weather moments and what the Atlas will talk about.
   ============================================================ */

// ---- used by js/events-story-foils-guide.js ----
const STORY = [
  { icon: '👣', text: 'Wander the threshold and get your bearings.',            goal: 'Walk 30 steps',                              done: p => (p.totals.steps || 0) >= 30,        pebbles: 5 },
  { icon: '💬', text: 'Say hello to a neighbor.',                    goal: 'Tap a neighbor and chat',                    done: p => (p.totals.talks || 0) >= 1,         pebbles: 5 },
  { icon: '⚔️', text: 'Try a friendly card match.',                  goal: 'Win a match against a neighbor',             done: p => (p.totals.battlesWon || 0) >= 1,    pebbles: 10 },
  { icon: '🎁', text: 'Open the gift waiting for you.',              goal: 'Claim the daily gift (Rewards → Dailies)',   done: p => !!p.lastGift,                       pebbles: 5 },
  { icon: '🏡', text: `Drop in on ${CAST.guide.name}, who welcomed you.`,          goal: `Visit ${CAST.guide.name}'s Cottage in ${PLACES.square}`,        done: p => !!(p.visited && p.visited.cottage), pebbles: 5 },
  { icon: '🍞', text: `Bake something at ${CAST.baker.name}'s.`,                  goal: 'Bake a loaf at the bakery',                  done: p => (p.totals.breadBaked || 0) >= 1,    pebbles: 8 },
  { icon: '🎣', text: 'Cast a thought into the water.',                   goal: 'Catch a fish (tap water with a fish in it)', done: p => (p.totals.fishCaught || 0) >= 1,    pebbles: 8 },
  { icon: '🎲', text: 'Play a little game in one of the houses.',    goal: 'Finish any house mini-game',                 done: p => (p.totals.minigamesPlayed || 0) >= 1, pebbles: 8 },
  { icon: '🌱', text: 'Plant a thought in the soil.',                 goal: `Plant a seed (buy one at ${CAST.gardener.name}'s Cottage)`,   done: p => (p.totals.seedsPlanted || 0) >= 1,  pebbles: 10 },
  { icon: '🛍️', text: 'Treat yourself.',                             goal: 'Open a card pack at the Card Shop',               done: p => (p.packsOpened || 0) >= 1,          pebbles: 10 },
  { icon: '🎴', text: 'Make the deck your own.',                     goal: 'Change a card in Cards → Deck',              done: p => (p.deckEdits || 0) >= 1,            pebbles: 10 },
  { icon: '⭐', text: 'Settle in properly.',                          goal: 'Reach level 5',                              done: p => (p.level || 1) >= 5,                card: 'super' },
];

// ---- used by js/scenes.js ----
/* ---------- A. the opening ---------- */
const STORY_INTRO = { id: 'intro', style: 'dream', cards: [
  { text: 'Let your eyes close.', sub: 'Breathe in. Out.', breath: true },
  { text: 'Somewhere, a fountain hums a song you almost remember.' },
  { text: 'You open your eyes.', sub: 'Nobody remembers arriving here. It feels like you always did.' },
  { text: '"There you are," says a warm voice. "Right on time. Was it? Never mind. Come in."' }
] };
/* ---------- B. the guided first hour ---------- */
// who speaks defaults to Wren. ask is what the goal pill says; go (a function, so it is read late) is where the pill's tap
// takes you (see guideTo in js/guide-walk.js: it walks there for you), or nothing to hear the beat again; mark is the building id that gets the gold diamond (in district, default square).
const WREN_NOT_SURE = 'I could not tell you how I know my way around, only that I do.';
const STORY_BEATS = [
  { ask: 'wander the Threshold for a bit', go: () => ({ wander: 30 }), cards: [
      { text: 'There you are. Come in off the middle of the path, dear.' },
      { text: `I am ${CAST.guide.name}. I keep the kettle on. ${WREN_NOT_SURE}`, choices: [
        { label: 'Where am I?', reply: `${PLACES.square}, the Threshold. Every ${GAME.player.lower} starts here, though nobody remembers arriving.` },
        { label: 'Is this a dream?', reply: 'It might be. Whose, I could not say. I have heard it called a few things.' },
        { label: 'How do I leave?', reply: 'The doors here only lead deeper in, dear. Have some tea first.' } ] },
      { text: `Take a slow wander first. ${PLACES.square} likes to be looked at. Thirty steps will do.` } ] },
  { ask: 'say hello to a neighbor', go: () => ({ npc: true }), cards: [
      { text: 'Did you notice? Everyone here is a spirit wearing a card.' },
      { text: 'Tap one and say hello. They like being noticed more than they let on.' } ] },
  { ask: 'win a friendly card match', go: () => ({ npc: true }), cards: [
      { text: 'Cards are how spirits talk. A friendly match is just a very polite way of saying more.' },
      { text: 'Go on. Nobody here plays to hurt.' } ] },
  { ask: 'claim your gift in Rewards', go: () => ({ tab: 'quests' }), cards: [
      { text: 'Something is waiting for you in Rewards. Things tend to turn up for people here.' } ] },
  { ask: 'visit my cottage, top left', mark: 'cottage', go: () => ({ scene: 'cottage', district: 'square', name: `${CAST.guide.name}'s cottage` }), cards: [
      { text: 'Come by the cottage. It is top left of the square, you cannot miss it.' },
      { text: 'I will put the kettle on. I always do, and it is always just ready.' } ] },
  { ask: `bake a loaf at ${CAST.baker.name}'s bakery`, mark: 'bakery', go: () => JPLACES.bakery, cards: [
      { text: `${CAST.baker.name} bakes bread that tastes like a memory you cannot place.` },
      { text: 'Bake a loaf at her bakery, bottom left. Tell me what it reminds you of. Nobody ever agrees.' } ] },
  { ask: 'catch a fish: tap the water', go: () => ({ fish: true }), cards: [
      { text: 'Cast a thought into any water. The fish bite on whatever you are thinking about.' },
      { text: 'The quiet ones bite best. Tap the water where a shadow is swimming.' } ] },
  { ask: 'finish a game in any house', go: () => ({ minigame: true }), cards: [
      { text: 'Most houses have a little game going. Nobody keeps the score for long.' },
      { text: 'Try one. Mine has tea in it.' } ] },
  { ask: `plant a seed: ${CAST.gardener.name} sells them`, mark: 'house2', go: () => ({ scene: 'house2', district: 'square', name: `${CAST.gardener.name}'s cottage` }), cards: [
      { text: `Seeds grow toward whatever you pay attention to. ${CAST.gardener.name} sells them, bottom right of the square.` },
      { text: 'Plant one and keep an eye on it. Or do not, and see what it becomes.' } ] },
  { ask: 'open a pack at the Card Shop', go: () => JPLACES.shop, cards: [
      { text: `Treat yourself. The Card Shop is in ${PLACES.market}. Speak softly there.` } ] },
  { ask: 'change a card in Cards, then Deck', go: () => ({ tab: 'collection' }), cards: [
      { text: 'A deck is a sentence made of spirits. Change one word and it says something else.' },
      { text: 'Look under Cards, then Deck.' } ] },
  { ask: 'reach level 5', cards: [
      { text: 'Settle in properly. Do whatever pulls at you and it all counts.' },
      { text: 'When you reach level five, I have something for you.' } ] },
  // After the first chain, "Making yourself at home".
  { ask: 'meet a district god in battle', go: () => ({ boss: true }), cards: [
      { text: 'Every district belongs to a spirit god. They do not mean any harm. They only want to be met.' },
      { text: 'Face one when you are ready. They are gentle, in their way.' } ] },
  { ask: 'visit every district', go: () => { const k = Object.keys(DISTRICTS).find(d => !state.visitedDistricts.includes(d) && districtUnlocked(d)); return k ? { travel: k } : { map: 1 }; }, cards: [
      { text: 'There are four districts, and each one dreams a little differently.' },
      { text: 'Open the map and drift somewhere you have not been.' } ] },
  { ask: 'visit the Net Loft and Glasshouse', go: () => (state.progress.visited || {})['harbor-hut'] ? JPLACES.glass : JPLACES.net, cards: [
      { text: `${CAST.netMender.name} mends nets by the shore, though nothing ever seems to tear.` },
      { text: `${CAST.glassKeeper.name} grows the most delicate thoughts under glass. Both would love a visitor.` } ] },
  { ask: `beat ${CAST.rival.name} in a match`, go: () => ({ rival: true }), cards: [
      { text: `${CAST.rival.name} keeps turning up. Another ${GAME.player.lower}, like you, with a head full of theories.` },
      { text: 'Play them, and listen. You never know which of their guesses is right. I certainly do not.' } ] },
  { ask: 'complete a themed card set', go: () => ({ tab: 'collection' }), cards: [
      { text: 'Finish what you start. A set is a small story made of cards.' } ] },
  { ask: 'reach level 10', cards: [
      { text: 'Look at you. Practically a local.' },
      { text: 'Keep going, dear. I have a feeling there is more to this place than the town.' } ] }
];

// ---- used by js/events-story-foils-guide.js ----
const TOWN_EVENTS = [
  { id: 'market-day',    icon: '🛍️', name: 'Market Day',    text: `Card packs and ${CAST.spiceSeller.name}'s daily deal are 20% off.` },
  { id: 'fishing-derby', icon: '🎣', name: 'Thought Fishing Derby', text: `Fish pay double ${GAME.currency.many}, and rare fish bite more often.` },
  { id: 'spirit-parade', icon: '👻', name: 'Spirit Parade', text: 'Wandering spirits give double XP.' },
  { id: 'harvest-fair',  icon: '🌽', name: 'Harvest Fair',  text: `Crops grow 50% faster, and every harvest pays +3 ${GAME.currency.many}.` },
  { id: 'swap-day',      icon: '🤝', name: 'Swap Day',      text: 'The trading board has five offers instead of three.' },
  { id: 'double-xp',     icon: '⭐', name: 'Double XP Day', text: 'Everything you do earns double XP.' },
  { id: 'cellar-night',  icon: '🕯️', name: 'Cellar Night',  text: `Deep cellar floors pay double ${GAME.currency.many}.` },
  { id: 'baking-day',    icon: '🥐', name: 'Baking Day',    text: 'Bread bakes twice as fast.' },
  { id: 'festival-day',  icon: '🎉', name: 'Festival Day',  text: `${GAME.player.many}’ Cup rounds pay double ${GAME.currency.many}.` },
  // Rare events (build 102): a quarter of the weight of the others, so about one day in a dozen is something special.
  { id: 'starfall',      icon: '☄️', name: 'Starfall',      text: 'Hidden cards are twice as easy to spot, and new cards are three times as likely to come back Reborn.', rare: true },
  { id: 'friendship-fair', icon: '💞', name: 'Friendship Fair', text: 'Every heart you earn with a neighbor counts double.', rare: true },
  { id: 'tourney',       icon: '🏅', name: 'Tournament Day', text: `Every match you win pays +3 ${GAME.currency.many}.`, rare: true },
];

// ---- used by js/town-news.js ----
/* ---------------- 3. THE DREAM GAZETTE ----------------
   {a} {b} = two different townsfolk, {d} = a district, {s} = the season, {f} = a card family. Seeded by the date only, so the
   story is the same for every tester that day; the "also today" lines below it are yours. */
const GAZETTE_STORIES = [
  { h: '{a} swears the fountain hummed a new tune', b: 'Nobody else heard it, but {b} has been humming it all morning. Readers are asked to stand very still by the water and report back.' },
  { h: 'Lost: one left slipper, last seen in {d}', b: '{a} would like it back. {b} points out that nobody in town has ever owned a right one.' },
  { h: '{s} arrives early, says {a}', b: 'The evidence: a single leaf, a feeling, and the way the light leans in {d}. {b} remains unconvinced.' },
  { h: `Record loaf baked at ${CAST.baker.name}’s`, b: 'It was so tall that {a} had to stand on a crate to see over it. {b} took the first slice before anyone could stop them.' },
  { h: '{f} cards spotted dozing in {d}', b: `${GAME.player.many} walking that way are asked to step softly. {a} says one of them snored, which {b} calls "frankly unlikely".` },
  { h: 'Mystery of the moving bench solved', b: 'It was {a}, moving it one inch a day toward the sun. {b} has asked for the bench to be returned "to where benches go".' },
  { h: '{a} and {b} declare a truce', b: 'The argument, which began over the correct way to fold a map of {d}, has been settled. Neither will say who won.' },
  { h: 'Tide reported "unusually polite"', b: '{a} says the water came in, waited, and went out again without a fuss. {b} suspects it wants something.' },
  { h: 'Night market lantern count reaches a new high', b: '{a} counted twice and got two different numbers, both of them large. {b} recommends counting in the daytime.' },
  { h: 'Small cloud follows {a} around {d}', b: 'It rains only on their hat. {b} has offered to swap hats, "for science".' },
  { h: 'Letter of the week: "Where do dreams go when you wake?"', b: '{a} replies: "Into the cupboard, mostly." {b} would like to add that the cupboard is full.' },
  { h: 'Crop of the season: the {s} turnip', b: 'Round, cheerful and very slightly glowing. {a} grew one the size of a lantern. {b} has started talking to theirs.' },
  { h: 'A spirit asks for directions in {d}', b: '{a} sent it left, {b} sent it right. It went up. Witnesses say it seemed happy with the outcome.' },
  { h: 'Town clock runs backwards for one minute', b: 'Nobody minded. {a} says they got an extra minute of sleep out of it, and {b} used it to finish a sandwich.' },
  { h: 'Puddles "deeper than they look", warns {a}', b: `A ${GAME.player.lower} was seen splashing into one and coming out somewhere else entirely. {b} says that is just good puddle design.` },
  { h: 'Card match in {d} ends in a draw of biscuits', b: '{a} ran out of cards, {b} ran out of patience, and everybody shared the biscuits. A good day for {f} decks, by all accounts.' },
  { h: 'Wind carries a song from far away', b: 'It drifted through {d} at dawn. {a} wrote down the words; {b} says they were mostly "la".' },
  { h: 'Fishing report: "The thoughts are biting"', b: '{a} caught three small worries and let them all go. {b} caught a big idea and is still deciding what to do with it.' },
];
const GOSSIP_DEEDS = {
  fishCaught:        { did: n => n > 1 ? `caught ${n} fish` : 'landed a fish' },
  battlesWon:        { did: n => n > 1 ? `won ${n} matches` : 'won a match' },
  bossesWon:         { did: () => 'stood up to the district god and won', big: true },
  cropsHarvested:    { did: n => n > 1 ? `brought in ${n} crops` : 'brought in a harvest' },
  breadBaked:        { did: n => n > 1 ? `baked ${n} loaves` : `baked a loaf at ${CAST.baker.name}'s` },
  decorationsPlaced: { did: () => 'put up a new decoration' },
  puzzlesSolved:     { did: () => 'cracked the daily puzzle in the Reading Nook' },
  cupTrophies:       { did: () => `won the ${GAME.player.many}’ Cup`, big: true },
  puddleWorlds:      { did: () => 'fell straight through a puddle and came back', big: true },
  portalsEntered:    { did: () => 'walked into a portal like it was a door', big: true },
  minigameGolds:     { did: () => 'took a gold medal at one of the house games' },
  favours:           { did: n => n > 1 ? `helped ${n} neighbours out` : 'did a neighbour a favour' },
  homeVisitors:      { did: () => 'had a spirit come calling at your cottage' },
  visitorWins:       { did: () => 'beat the travelling Wanderer', big: true },
};
/* ---------------- 2. WEATHER MOMENTS ----------------
   fx numbers multiply the weather's own (dailyBonus adds). A moment ends when its time is up or the weather changes. */
const MOMENTS = {
  'koi-run':       { weather: 'rain',   icon: '🐟', name: 'Koi run', text: 'The fish are restless in the moonrain: rare fish bite more often, and sooner.', fx: { rareFish: 2, biteSpeed: 0.8 } },
  'static':        { weather: 'storm',  icon: '⚡', name: 'Static in the air', text: 'The storm shakes hidden cards loose: they turn up twice as often.', fx: { findMult: 2 } },
  'star-shower':   { weather: 'snow',   icon: '🌠', name: 'Star shower', text: 'Falling stars land as treasure: chests turn up twice as often.', fx: { chestMult: 2 } },
  'mist-lanterns': { weather: 'cloudy', icon: '🏮', name: 'Lanterns in the mist', text: `Lanterns light the way between houses: daily tasks pay +2 ${GAME.currency.many}.`, fx: { dailyBonus: 2 } },
  'rainbow':       { weather: 'clear',  after: ['rain', 'storm'], icon: '🌈', name: 'Rainbow', night: 'Moonbow', text: 'An arc of colour over town: hidden cards and chests turn up half again as often.', fx: { findMult: 1.5, chestMult: 1.5 } },
};

// ---- used by js/atlas.js ----
/* ---------- Ask: the written chat ---------- */
// Every reply to a big question is a maybe. Several lines per question so a second visit does not repeat itself.
const ATLAS_TOPICS = [
  { id: 'where', label: '🌫️ Where are we?', lines: [
    'Somewhere that is kind to you. Perhaps somewhere that is you.',
    'A place with doors. Whether they open outward, I could not say.',
    'Here. It is a good word. It holds a great deal.'] },
  { id: 'who', label: '🗺️ Who are you?', lines: [
    'I am what the places are written on. Perhaps. Ask me again tomorrow.',
    'Every road you have walked is in me somewhere. So are the ones you have not.',
    'A friend, if that helps. It usually does.'] },
  { id: 'me', label: '💭 What am I?', lines: [
    'Someone who arrived. Beyond that, you know more than I do.',
    `A ${GAME.player.one}. The word is wider than it looks.`,
    'Curious. That is already a great deal to be.'] },
  { id: 'gods', label: '🕯️ Tell me about the gods', lines: [
    `${BOSSES.square} keeps the threshold and cannot tell which side they stand on. Be gentle with them.`,
    `${BOSSES.market} trades in small secrets. Offer one back and you will be liked.`,
    `${BOSSES.harbor} breathes in and out. Everything else is a rhythm they allow.`,
    `${BOSSES.garden} plants whatever you leave behind. Mind what you think near them.`] },
  { id: 'wake', label: '🌙 Can I wake up?', lines: [
    'Perhaps you have, a few times. How would you tell?',
    'Waking is a lovely idea. Many here have it. It keeps them warm.',
    'That depends which dream you mean.'] },
  { id: 'next', label: '🧭 What should I do next?', guidance: true }
];
