/* ============================================================
   CONTENT: THE WORLD - DISTRICTS, BUILDINGS, FISH AND CROPS
   ============================================================
   The districts and who lives in them, every building you can enter (its title, keeper, greeting and the lines of
   each action), the town's flavour lines, fish, seeds, recipes and travelling visitors.
   Names of places and people come from js/game-config.js. Keys (square, bakery, 'stall-grain', ...) are ids: keep them.
   ============================================================ */

// ---- used by js/data-and-engine.js ----
const DISTRICTS = {
  square: { name: PLACES.square, theme: 'square', unlockWins: 0, unlockLevel: 1, boss: BOSSES.square, bossIcon: '🌳',
    scenery: [{ icon: '🪑', title: 'A quiet bench', desc: 'A good place to sit and watch the town go by.' },
              { icon: '⛲', title: 'La Fuente', desc: 'It hums a half-remembered song.' }] },
  market: { name: PLACES.market, theme: 'market', unlockWins: 1, unlockLevel: 2, boss: BOSSES.market, bossIcon: '🦡',
    scenery: [{ icon: '🏪', title: 'A small stall', desc: 'The vendor is out today, but the awning gives good shade.' },
              { icon: '🧺', title: 'A basket of goods', desc: 'Nothing to take, but it smells like fresh bread.' }] },
  harbor: { name: PLACES.harbor, theme: 'harbor', unlockWins: 3, unlockLevel: 4, boss: BOSSES.harbor, bossIcon: '⚓',
    scenery: [{ icon: '⛵', title: 'A moored boat', desc: 'It rocks gently against the dock.' },
              { icon: '🦭', title: 'A resting seal', desc: 'It barely opens an eye as you pass.' }] },
  garden: { name: PLACES.garden, theme: 'garden', unlockWins: 5, unlockLevel: 6, boss: BOSSES.garden, bossIcon: '🌻',
    scenery: [{ icon: '🌻', title: 'Sunflowers', desc: 'They turn slowly to follow the light.' },
              { icon: '🪴', title: 'A potted fern', desc: 'Someone tends this carefully.' }] }
};
// Each town has its own population - a name pool and a species/face pool - so neighbors read as a
// different crowd from one district to the next, not just the same people in a different building.
const NPC_POOLS = {
  square: { names: [CAST.guide.name, 'Sable', 'Fenn', 'Marlow', 'Tansy', 'Rowan', 'Juniper', 'Cove'],
             icons: ['🧑', '👩', '🧔', '👨', '🧑‍🦱', '🧑‍🦳', '🧕', '🧑‍🎨'] },
  market: { names: [CAST.threadSeller.name, 'Hazel', 'Bramble', CAST.grainSeller.name, 'Nutmeg', 'Acorn', 'Chestnut', 'Ginger'],
             icons: ['🐰', '🐹', '🐭', '🐿️'] },
};

// ---- used by js/houses-and-cellar.js ----
const INTERIORS = {
  cottage: { title: `${CAST.guide.name}'s Cottage`, who: CAST.guide.icon, name: CAST.guide.name, theme: 'warm',
    greet: 'Come in, come in. The kettle is on, and there is always room by the fire. I am not sure how I knew you were coming.',
    actions: [{ id: 'calm-tea', label: '🍵 Tea ritual', kind: 'calm', game: 'tea' },
              { id: 'mg-tea', kind: 'minigame', game: 'tea', view: () => miniView('tea') },
              { id: 'tea', label: '☕ Share a pot of tea', kind: 'daily', pebbles: 4,
      done: `${CAST.guide.name} pours you a cup and presses two ${GAME.currency.many} into your hand. "For the road."`, already: 'The teapot is empty for today. "Come back tomorrow, dear."' }] },
  nook: { title: 'The Reading Nook', who: CAST.scholar.icon, name: CAST.scholar.name, theme: 'cool',
    greet: 'Ah, a visitor. Books are quiet, but I am not. Ask me anything about your deck.',
    actions: [{ id: 'puzzle', kind: 'puzzle', view: () => puzzleView() },
              { id: 'mg-quiz', kind: 'minigame', game: 'quiz', view: () => miniView('quiz') },
              { id: 'memory', label: '🃏 Play a memory game', kind: 'memory' },
              { id: 'advice', label: '📖 Ask about my deck', kind: 'advice' },
              { id: 'book', label: '📕 Open the dusty book', kind: 'chest', done: 'Something slips out from between the pages.', already: `The book is just a book now. ${CAST.scholar.name} smiles. "It only had the one surprise."` }] },
  'stall-grain': { title: `${CAST.grainSeller.name}'s Grain Stall`, who: CAST.grainSeller.icon, name: CAST.grainSeller.name, theme: 'warm',
    greet: 'Shh - fresh grain, still warm from the sack. Try a handful, on the house, and mind your voice. A loud word breaks a sale.',
    actions: [{ id: 'mg-grain', kind: 'minigame', game: 'grain', view: () => miniView('grain') },
              { id: 'sample', label: '🌾 Try a free sample', kind: 'daily', pebbles: 4,
      done: `${CAST.grainSeller.name} scoops a handful into your palm, then presses two ${GAME.currency.many} into it too. "For being a good customer."`, already: `${CAST.grainSeller.name} pats the empty sack. "Sold out for today - back tomorrow!"` }] },
  'stall-thread': { title: `${CAST.threadSeller.name}'s Thread Stall`, who: CAST.threadSeller.icon, name: CAST.threadSeller.name, theme: 'cool',
    greet: `"Ribbons, thread, whatever you're stitching together," ${CAST.threadSeller.name} says, just above a whisper. "And I know a thing or two about decks, if you're curious."`,
    actions: [{ id: 'mg-pattern', kind: 'minigame', game: 'pattern', view: () => miniView('pattern') },
              { id: 'advice', label: '🧵 Ask about my deck', kind: 'advice' },
              { id: 'basket', label: '🧺 Dig through the remnant basket', kind: 'chest', done: 'Something catches your eye under all the scraps.', already: `${CAST.threadSeller.name} shrugs. "You already found the good one in there."` }] },
  home: { title: 'Your Cottage', who: () => state.character.emoji, name: 'You', theme: 'warm',
    greet: () => `Your cottage, exactly as you remember it, though you cannot recall arriving. ${unreadMail() ? `📬 ${unreadMail()} unread letter${unreadMail() === 1 ? '' : 's'} in the mailbox.` : 'The mailbox is empty for now.'}`,
    actions: [{ id: 'mail', kind: 'mail', view: () => ({ label: `📬 Mailbox${unreadMail() ? ` (${unreadMail()} new)` : ''}` }) },
              { id: 'mg-tidy', kind: 'minigame', game: 'tidy', view: () => miniView('tidy') },
              { id: 'calm-sand', label: '🪨 Sand garden', kind: 'calm', game: 'sand' },
              { id: 'calm-bonsai', label: '🪴 Your bonsai', kind: 'calm', game: 'bonsai' },
              { id: 'decorate', label: '🖼️ Decorate the shelves', kind: 'decorate' },
              { id: 'altar', label: '🕯️ The altar', kind: 'altar' },
              { id: 'favs', label: '⭐ Choose favourite cards to frame', kind: 'favs' },
              { id: 'trophies', label: '🏆 Look over the trophy case', kind: 'trophies' },
              { id: 'nap', label: '😴 Nap by the window', kind: 'daily', pebbles: 3,
                done: `You doze off in the sunny chair. When you wake, three ${GAME.currency.many} have rolled out of your pocket onto the cushion.`, already: 'You are not sleepy yet. Maybe tomorrow.' }] },
  lantern: { title: 'The Lantern Market', who: CAST.nightVendor.icon, name: CAST.nightVendor.name, theme: 'dark',
    greet: () => `Lanterns sway on strings between the stalls, and each glows brightest when you look away. "Night things, for night folk," ${CAST.nightVendor.name} hoots. ${jarLine()}`,
    actions: [{ id: 'nightpack', kind: 'nightpack', view: () => ({ label: `🌙 Lantern Pack · 🫧 ${NIGHT_PACK_COST} (rare or better, night cards)` }) },
              { id: 'sellbugs', kind: 'sellbugs', view: () => ({ label: jarValue() ? `🫙 Trade your jar of critters for 🫧 ${jarValue()}` : '🫙 Your critter jar is empty', disabled: !jarValue() }) },
              { id: 'nightdeco', label: '🕯️ Night-only decorations', kind: 'nightdeco' },
              { id: 'mg-lanterns', kind: 'minigame', game: 'lanterns', view: () => miniView('lanterns') }] },
  fortune: { title: `Madame ${CAST.fortuneTeller.name}'s Tent`, who: CAST.fortuneTeller.icon, name: CAST.fortuneTeller.name, theme: 'dark',
    greet: () => `Beads click, a candle gutters. "Sit, sit," purrs ${CAST.fortuneTeller.name}. ${typeof tarotCanDraw === 'function' && tarotCanDraw() ? 'Your daily reading has not been drawn yet.' : 'The cards know you already.'}`,
    actions: [{ id: 'fortune-read', label: '🔮 Daily reading', kind: 'calm', game: 'tarot' },
              { id: 'fortune-redraw', kind: 'fortune', view: () => { const s = fortuneRedrawState(); return { label: `🃏 Draw once more · 🫧 ${FORTUNE_REDRAW_COST}${s === 'used' ? ' (done today)' : ''}`, disabled: s === 'used' }; } },
              { id: 'fortune-story', label: '📜 Hear your deck\'s story', kind: 'fortune' },
              { id: 'fortune-pack', kind: 'fortune', view: () => ({ label: `🃏 Fate Pack · 🫧 ${FORTUNE_PACK_COST}`, disabled: state.progress.pebbles < FORTUNE_PACK_COST }) }] },
  atlas: { title: `The ${CAST.atlas.name}`, who: CAST.atlas.icon, name: `The ${CAST.atlas.name}`, theme: 'dark',
    greet: () => atlasGreeting(),
    actions: [{ id: 'atlas-ask', label: '💭 Ask something', kind: 'atlas-ask' },
              { id: 'atlas-battle', label: `⚔️ Challenge the ${CAST.atlas.name}`, kind: 'atlas-battle' },
              { id: 'atlas-games', label: '🎲 Play something harder', kind: 'atlas-games' },
              { id: 'atlas-shop', label: `🛍️ What the ${CAST.atlas.name} keeps`, kind: 'atlas-shop' }] },
  museum: { title: 'The Card Museum', who: CAST.curator.icon, name: `Curator ${CAST.curator.name}`, theme: 'cool',
    greet: () => `Welcome! Every card has a story, and we would love to keep one of each. Spare copies only - we never take your last. ${MUSEUM_WINGS.filter(w => museumState().wings[w.id]).length}/${MUSEUM_WINGS.length} wings complete.`,
    actions: [{ id: 'wings', label: '🏛️ Donate to the wings', kind: 'wings' },
              { id: 'exped', kind: 'exped', view: () => { const es = expedState(), home = es.active.filter(t => Date.now() >= t.ends).length;
                  return { label: `🧭 Expeditions${home ? ` · ${home} team${home === 1 ? '' : 's'} home!` : es.active.length ? ` · ${es.active.length} away` : ''}` }; } }] },
  // ----- the four buildings that used to be locked -----
  bakery: { title: `${CAST.baker.name}'s Bakery`, who: CAST.baker.icon, name: CAST.baker.name, theme: 'warm',
    greet: () => `The oven is warm and the dough is rising. The bread tastes like a memory you cannot quite place, so bake a loaf and share it with a neighbor. ${breadLine()}`,
    actions: [{ id: 'oven', kind: 'oven', view: () => ovenView() },
              { id: 'cook', label: `🍳 Cook with ${CAST.baker.name}`, kind: 'cook' },
              { id: 'mg-frost', kind: 'minigame', game: 'frost', view: () => miniView('frost') },
              { id: 'roll', label: '🥐 Taste a warm roll', kind: 'daily', pebbles: 3,
                done: `${CAST.baker.name} hands you a roll straight off the tray, and three ${GAME.currency.many} "for the jam fund."`, already: `${CAST.baker.name} laughs. "One roll a day, or there will be none left for the market!"` }] },
  house2: { title: `${CAST.gardener.name}'s Cottage`, who: CAST.gardener.icon, name: CAST.gardener.name, theme: 'cool',
    greet: () => `Mind the watering cans! I tend the flower boxes in the square, and the small thoughts that grow in them. ${seedsGreeting()}`,
    actions: [{ id: 'seeds', label: '🌱 Seeds & planting', kind: 'seeds' },
              { id: 'mg-weeds', kind: 'minigame', game: 'weeds', view: () => miniView('weeds') },
              { id: 'water', label: '💧 Help water the flower boxes', kind: 'daily', pebbles: 3,
                done: `You water every box on the lane. ${CAST.gardener.name} beams and tips three ${GAME.currency.many} into your palm.`, already: `${CAST.gardener.name} points at the dripping boxes. "Already watered today - thank you!"` }] },
  'stall-spice': { title: `${CAST.spiceSeller.name}'s Spice Stall`, who: CAST.spiceSeller.icon, name: CAST.spiceSeller.name, theme: 'warm',
    greet: () => `One deal a day, and when it's gone, it's gone. ${spiceDealLine()}`,
    actions: [{ id: 'deal', kind: 'deal', view: () => spiceDealView() },
              { id: 'mg-haggle', kind: 'minigame', game: 'haggle', view: () => miniView('haggle') }] },
  'card-shop': { title: 'The Card Shop', who: CAST.cardSeller.icon, name: CAST.cardSeller.name, theme: 'warm',
    greet: 'Packs, sleeves, decorations, a fresh look for your character - if it has to do with cards, you will find it here. Have a look around.',
    actions: [{ id: 'packs', label: '🎁 Card packs', kind: 'shopmode', mode: 'packs' },
              { id: 'sleeves', label: '🎴 Card sleeves', kind: 'sleeves' },
              { id: 'customize', label: '🎨 Customize', kind: 'shopmode', mode: 'customize' },
              { id: 'items', label: '🪑 Items & decorations', kind: 'shopmode', mode: 'items' }] },
  'stall-tinker': { title: `${CAST.tinker.name}'s Tinker Stall`, who: CAST.tinker.icon, name: CAST.tinker.name, theme: 'cool',
    greet: () => `Lures, lines and little baits! Fish bite better when they like what is on the hook. ${baitHaveLine()}`,
    actions: [{ id: 'bait', label: '🎣 Bait counter', kind: 'bait' },
              { id: 'mg-gears', kind: 'minigame', game: 'gears', view: () => miniView('gears') },
              { id: 'sort', label: '🔧 Help sort the spare parts', kind: 'daily', pebbles: 2,
                done: `Springs here, cogs there. ${CAST.tinker.name} pays you two ${GAME.currency.many} and a very small screw you did not ask for.`, already: `${CAST.tinker.name} waves you off. "Parts are sorted! Come back tomorrow."` }] },
  'harbor-hut': { title: 'The Net Loft', who: CAST.netMender.icon, name: CAST.netMender.name, theme: 'cool',
    greet: 'Salt in the air, gulls on the roof. Mind the nets drying by the door - I only just finished mending them. (I mend them every day. Nothing ever seems to tear.)',
    actions: [{ id: 'calm-lanterns', kind: 'calm', game: 'lanterns', view: () => ({ label: skyPhase().isNight ? '🏮 Release a lantern' : '🏮 Lanterns (after dark)', disabled: !skyPhase().isNight }) },
              { id: 'mend', label: '🪢 Help mend a net', kind: 'daily', pebbles: 4,
      done: `You work a knot loose and tie it back tighter. ${CAST.netMender.name} presses four ${GAME.currency.many} into your hand. "Steady hands, you."`, already: `${CAST.netMender.name} pats the nets, all mended. "Nothing left to fix today - come back tomorrow."` },
              { id: 'buoy', label: '🎣 Check the old buoy box', kind: 'chest', done: 'Something washed up in the buoy box, wedged between the floats.', already: `${CAST.netMender.name} shrugs. "That box only ever had the one surprise in it."` }] },
  'garden-glass': { title: 'The Glasshouse', who: CAST.glassKeeper.icon, name: CAST.glassKeeper.name, theme: 'warm',
    greet: 'Careful of the watering cans! Everything in here grows a little slower than the sun, and a little stranger too. What are you thinking about?',
    actions: [{ id: 'prune', label: '🌿 Help prune the vines', kind: 'daily', pebbles: 4,
      done: `You snip back the wandering vines. ${CAST.glassKeeper.name} slides four ${GAME.currency.many} across a potting bench. "For the help, dear."`, already: `${CAST.glassKeeper.name} waves a leaf at you. "All pruned for today - the vines will grow back by tomorrow."` },
              { id: 'pots', label: '🪴 Dig through the spare pots', kind: 'chest', done: 'Something is tucked under an upturned pot, waiting.', already: `${CAST.glassKeeper.name} smiles. "You already found what was hiding under there."` }] },
};
const RECIPES = [
  { id: 'daisy-tea',     name: 'Daisy Tea',      icon: '🍵', needs: { flowers: 2 },              gift: 3,                            desc: 'A calming cup. A lovely gift.' },
  { id: 'fish-soup',     name: 'Fish Soup',      icon: '🍲', needs: { fish: 2, flowers: 1 },     gift: 2, battle: { spirit: 3 },     desc: 'Eat before a match: start with +3 Calm.' },
  { id: 'pumpkin-pie',   name: 'Pumpkin Pie',    icon: '🥧', needs: { pumpkin: 1, bread: 1 },    gift: 5, battle: { spirit: 2 },     desc: 'Everyone loves pie. Or eat it for +2 Calm.' },
  { id: 'sunflower-loaf', name: 'Sunflower Loaf', icon: '🥖', needs: { sunflower: 1, bread: 1 }, gift: 3, battle: { draw: 1 },       desc: 'Eat before a match: draw 1 extra card.' },
  { id: 'moonlit-stew',  name: 'Moonlit Stew',   icon: '🥘', needs: { moonbean: 1, fish: 1 },    gift: 6, battle: { spirit: 3, draw: 1 }, desc: 'Eat before a match: +3 Calm and 1 extra card. A treasured gift.' },
];

// ---- used by js/gardening.js ----
const SEEDS = [
  { id: 'daisy',     name: 'Daisy',     icon: '🌼', cost: 5,  growMin: 5,  pebbles: 7,  xp: 10, desc: 'Quick and cheerful.' },
  { id: 'pumpkin',   name: 'Pumpkin',   icon: '🎃', cost: 12, growMin: 15, pebbles: 18, xp: 20, desc: 'Slow, but it pays.' },
  { id: 'sunflower', name: 'Sunflower', icon: '🌻', cost: 22, growMin: 25, pebbles: 6,  xp: 25, card: 'rare',  desc: 'A card seed: grows a rare card or better.' },
  { id: 'moonbean',  name: 'Moonbean',  icon: '🌙', cost: 0,  growMin: 40, pebbles: 8,  xp: 40, card: 'ultra', found: true, desc: `Only found in ${PLACES.garden}. Grows an ultra rare card or better.` },
];

// ---- used by js/fishing.js ----
// Beyond the everyday three, a fish may only bite in some districts (where), at night, or in certain weather.
// `hint` is what the Fish page shows before you've caught one.
const FISH = [
  { id: 'minnow', name: 'Minnow',      icon: '🐟', pebbles: 2, weight: 58, blurb: 'Small, silver and quick.',        drain: 3.0, pull: 16, hint: 'Bites anywhere, any time' },
  { id: 'perch',  name: 'Perch',       icon: '🐠', pebbles: 3, weight: 30, blurb: 'Striped and a little proud of it.', drain: 5.5, pull: 13, hint: 'Bites anywhere, any time' },
  { id: 'carp',   name: 'Golden Carp', icon: '🏅', pebbles: 5, weight: 12, blurb: 'It shimmers like a coin in the sun.', drain: 8.0, pull: 10, hint: 'Anywhere, but shy' },
  { id: 'crab',   name: 'Harbor Crab', icon: '🦀', pebbles: 3, weight: 26, where: ['harbor'], blurb: 'It pinches the line, then lets go politely.', drain: 4.5, pull: 14, hint: `Scuttles only in ${PLACES.harbor}` },
  { id: 'puffer', name: 'Pufferfish',  icon: '🐡', pebbles: 5, weight: 12, where: ['harbor'], blurb: 'It puffs up, offended, then settles down.', drain: 6.0, pull: 12, hint: `Lives only in ${PLACES.harbor}` },
  { id: 'eel',    name: 'Moonlit Eel', icon: '🐍', pebbles: 4, weight: 18, night: true, blurb: 'Long and silver, like a ribbon of moonlight.', drain: 6.0, pull: 12, hint: 'Bites only at night' },
  { id: 'trout',  name: 'Rainbow Trout', icon: '🌈', pebbles: 5, weight: 18, weather: ['rain'], blurb: 'Every scale a different colour.', drain: 6.5, pull: 12, hint: 'Rises only in the rain' },
  { id: 'pike',   name: 'Thunder Pike', icon: '⚡', pebbles: 6, weight: 14, weather: ['storm'], blurb: 'It crackles faintly when it thrashes.', drain: 8.5, pull: 10, hint: 'Hunts only in storms' },
  { id: 'ghost-koi', name: 'Ghost Koi', icon: '👻', pebbles: 6, weight: 14, weather: ['cloudy'], blurb: 'You can almost see through it.', drain: 7.0, pull: 11, hint: 'Drifts up only under cloudy skies' },
  { id: 'frost-cod', name: 'Frost Cod', icon: '🧊', pebbles: 5, weight: 16, weather: ['snow'], blurb: 'Cold to the touch, and very grumpy.', drain: 6.0, pull: 12, hint: 'Bites only when it snows' },
  { id: 'star-koi', name: 'Starlight Koi', icon: '🌟', pebbles: 25, weight: 1.2, legendary: true, blurb: 'The water glows gold around it. You will remember this.', drain: 10, pull: 9, hint: 'A legend. Anywhere, almost never' },
];

// ---- used by js/town-render-weather.js ----
/* ---------------- ambient flavor line: a quiet, rotating sense-of-place above the event log ---------------- */
const DISTRICT_AMBIENT = {
  square: { day: ['Pigeons peck at crumbs near the fountain.', 'Sunlight settles warm over the square.', 'Someone left a book open on a bench.', 'The old fountain trickles quietly.'],
            night: ['The fountain catches the moonlight.', 'Lamplight pools soft over the cobblestones.', 'The square is hushed but for a distant owl.', 'Moths circle the street lamps.'] },
  market: { day: ['The smell of fresh bread drifts from a stall.', 'Awnings flap gently in the breeze.', 'Baskets of goods sit stacked and waiting.', 'A cart wheel creaks somewhere nearby.'],
            night: ['The stalls are shuttered for the night.', 'A lone lantern glows over the empty market.', 'Crates sit stacked neatly, waiting for morning.'] },
  harbor: { day: ['Gulls wheel and call over the docks.', 'Boats rock gently against their moorings.', 'Salt air drifts in off the water.', 'A seal suns itself on the rocks.'],
            night: ['Waves lap quietly against the dock posts.', 'A buoy bell rings faint in the distance.', 'Harbor lights ripple on dark water.'] },
  garden: { day: ['Bees drift lazily between the blossoms.', 'Sunflowers turn slowly toward the light.', 'Something rustles gently in the hedges.', 'The air smells of warm earth and petals.'],
            night: ['Night-blooming flowers open their petals.', 'Crickets sing from somewhere in the garden.', 'The garden holds its breath in the moonlight.'] },
};

// ---- used by js/maps.js ----
const TREE_FLAVOR = ['An old tree. It has seen a lot of quiet afternoons.', 'The trunk is too wide to squeeze past.', 'Leaves rustle overhead.', 'Nothing to do here but admire it.'];

// ---- used by js/world-map.js ----
// Text and the few facts that aren't stored anywhere else. Buildings and neighbour names come from the real maps/save.
const WM_INFO = {
  square: { short: 'Square', blurb: `The threshold of the dream. Every ${GAME.player.lower} arrives here first, and every road leads back to it.`, extras: [`${GAME.player.many}’ Cup fountain`, 'Weather sign'] },
  market: { short: 'Market', blurb: 'Lantern-lit stalls and voices just below understanding. A lantern market opens after dark.', extras: ['Trading board', `${CAST.nightVendor.name}'s Lantern Market (night only)`] },
  harbor: { short: 'Harbor', blurb: 'A tideless sea under a low moon. The best Thought Fishing around, and a god who breathes the tide in and out.', extras: ['Thought Fishing spots (they shuffle every 10 minutes)'] },
  garden: { short: 'Garden', blurb: 'A hush of glowing blooms that grow toward whatever you are thinking, with a glasshouse in the middle.', extras: [] }
};

// ---- used by js/town-news.js ----
/* ---------------- 5. VISITORS ----------------
   Who comes, where and with what is seeded by the date (the district is picked among the ones you have opened). */
const VISITORS = {
  pedlar:   { name: `${CAST.pedlar.name} the Pedlar`, icon: CAST.pedlar.icon, greet: 'Oh, a customer! I only pass through once in a while, so take a look. Everything here is one of a kind, today only.' },
  wanderer: { name: `${CAST.wanderer.name} the Wanderer`, icon: CAST.wanderer.icon, greet: 'I walk from town to town with one deck and play whoever will have me. Fancy a match? Beat me and I will leave you a card from my bag.' },
};
