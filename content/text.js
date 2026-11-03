/* ============================================================
   CONTENT: THE GAME'S OTHER WORDS (build 329)
   ============================================================
   One sentence per key, for the lines the code says on its own (a toast, a screen's opening line, a log entry, a letter)
   rather than a table of things like cards or fish. The code asks for a line by its key: words('bread.basketFull', { n: 4 }).
   - {slots} in a line are filled from the second argument ({n}, {name}, ...). A slot the code does not fill stays visible,
     so a typo shows up on screen instead of quietly vanishing; content-viewer.html (labs/) lists every key with its slots.
   - Names and pronouns come from js/game-config.js as everywhere else (${CAST.baker.name}, ${pron('baker').their}).
   - Change the words freely; keep the keys and the {slots}. A key the code asks for that is missing here shows the key
     itself, and check.py fails on it.
   - check.py counts the sentences still typed straight into js/ and will not let the number grow; move a few here
     whenever you touch a file.
   ============================================================ */
const TEXT = {
  // ---- the bakery (js/houses-and-cellar.js) ----
  'bread.readyTitle': '🍞 Bread is ready!',
  'bread.readyBody': 'Your loaf at the bakery is done baking.',
  'bread.basketFull': `Your basket is already full, so ${CAST.baker.name} buys this loaf back for {n} ${GAME.currency.many}.`,
  'bread.log': 'Baked a loaf of bread at the bakery.',

  // ---- sleeves, shelves, trophies (js/houses-and-cellar.js) ----
  'sleeves.on': 'Your cards slip into {name} sleeves. {icon} Very smart.',
  'sleeves.off': 'Back to plain sleeves. Classic.',
  'shelf.intro': 'Put decorations from your collection on the shelves (up to {n}). They come back to your decorations if you clear the shelves.',
  'shelf.noneInStorage': 'No decorations in storage - buy some at the Card Shop → Items',
  'shelf.cleared': 'You pack everything back into storage.',
  'shelf.full': 'The shelves are full.',
  'trophies.empty': `The trophy case is empty for now. Win the ${GAME.player.many}’ Cup, go deep in the cellar, or land a legendary catch.`,

  // ---- around town (js/houses-and-cellar.js) ----
  'town.stepOutside': 'You step back outside.',
  'trades.intro': 'Neighbors pin up offers here each morning. Only spare copies can be traded.',
  'shop.mode.packs': 'Fresh packs, straight off the shelf. Spend as much or as little as you like.',
  'shop.mode.customize': 'A new look, perhaps? Everything here is just for you.',
  'shop.mode.items': 'Decorations for every district. Tap Place after buying to put one down.',
  'atlas.ask': 'Ask whatever you like. I will answer as well as I can, which is not always the same as well.',
  'atlas.games': 'The same little games, with the medal lines higher. Two prizes per game each day.',
  'hall.whichWing': 'Which wing shall we visit?',
  'hall.whichWingMarked': 'Which wing shall we visit? Wings with spare cards ready are marked.',
  'exped.intro': `Send spare cards off to explore. They come back with ${GAME.currency.many}, supplies and sometimes a card - and a little mastery.`,
  'night.decoIntro': 'They glow once the sun goes down.',

  // ---- the Cup at the fountain (js/houses-and-cellar.js) ----
  'cup.withdraw': 'Withdraw (ends this run)',
  'cup.stepAway': 'Step away for now',
  'cup.waiting': 'The crowd is waiting for your {round}. You carry ♥{calm} Calm into it - there is no healing between rounds.',
  'cup.bowOut': 'You bow out of the cup. Maybe next time.',
  'cup.anotherSweep': 'Another clean sweep this week.',

  // ---- the cellar (js/houses-and-cellar.js) ----
  'cellar.climbedOut': 'Climbed out of the cellar after clearing floor {n}{why}.',
  'cellar.chestHeading': 'From the old chest',
  'cellar.guardianHeading': 'The guardian leaves behind',
  'cellar.chestWin': 'The cellar gives up its chest.',
  'cellar.guardianWin': '{name} sinks back into the dark.',
  'cellar.foeWin': '{name} steps aside.',

  // ---- the scholar's deck advice (js/houses-and-cellar.js) ----
  'advice.notFull': 'Your deck holds {n} of {size} cards. Fill it in Cards → Deck first, then we can talk shape.',
  'advice.fewCheap': 'Only {n} of your cards cost 1 or 2. Your first turns will feel slow. Try to have at least 5 cheap cards.',
  'advice.heavy': 'Your average cost is {avg}, which is heavy. Strong cards do nothing sitting in your hand. Swap one expensive card for a cheap one.',
  'advice.noWatch': 'Not one Watch in the whole deck. Enemies will hit your Calm as they please. One or two Watch cards buy you time.',
  'advice.noFinisher': 'A tidy, cheap deck, but nothing to finish with. One big card at cost 4 or 5 gives you something to build toward.',
  'advice.good': 'That is a well-shaped deck: {cheap} cheap cards, average cost {avg}, and {defenders} defenders. I would not change much.',

  // ---- Rewards → Stories (js/chapters.js; the stories themselves are in content/chapters.js) ----
  'stories.districtTitle': 'District stories',
  'stories.districtSub': 'Each district has a story of its own, and it ends with its god.',
  'stories.neighbourTitle': 'Neighbours’ stories',
  'stories.neighbourSub': 'Some neighbours have something on their mind. Get to know them and they will tell you.',
  'stories.lockedFirstHour': 'Opens after Getting started',
  'stories.lockedDistrict': 'Opens with {place}',
  'stories.lockedNeighbour': 'Meet {name} first',
  'stories.hearAgain': 'Hear it again',
  'stories.hearEnding': 'Hear the ending again',
  'stories.stepDone': '📖 {title}: step done - claim it in Rewards → Stories',
  'stories.claimed': '📖 Step done! +{n} {money}',
  'stories.pillClaim': '{title}: claim it in Rewards',
  'stories.finishedLog': 'Finished the story “{title}”.',
  'stories.decoGift': '{icon} {name} goes into your decorations',
  'stories.cardNote': '{name}: "This is yours now."',

  // ---- match replays and battle stats (js/replays.js) ----
  'replay.watch': '▶ Watch replay',
  'replay.title': 'Against {name}',
  'replay.subWon': 'You won',
  'replay.subLost': 'You lost',
  'replay.subYield': 'You stepped away',
  'replay.you': 'You',
  'replay.them': 'They',
  'replay.start': 'The cards are dealt.',
  'replay.turn': '{who}: a new turn.',
  'replay.play': '{who} played {card}.',
  'replay.spell': '{who} cast {card}.',
  'replay.attack': '{card} attacked {target}.',
  'replay.attackCalm': '{card} went straight for the Calm.',
  'replay.faint': '{card} drifted off.',
  'replay.hurt': '{who} lost {n} Calm.',
  'replay.heal': '{who} got {n} Calm back.',
  'replay.knack': '{who} used a Knack.',
  'replay.fate': '{who} turned a Fate.',
  'replay.won': 'You won the match.',
  'replay.lost': '{who} won the match.',
  'replay.emptyBoard': 'nothing on the table',
  'replay.step': 'Move {i} of {n} · turn {turn}',
  'replay.playBtn': 'Play',
  'replay.pause': 'Pause',
  'replay.gone': 'That replay is no longer kept. The last 10 matches are.',
  'stats.title': 'Your cards in battle',
  'stats.mostPlayed': 'Played the most',
  'stats.bestWinners': 'Win the most (3+ games)',
  'stats.cardLine': '{games} · {pct}% won',
  'stats.oneGame': '1 game',
  'stats.games': '{n} games',
  'stats.withFamily': 'Your deck’s main family',
  'stats.againstFamily': 'Against each family',
  'stats.toughest': 'Your toughest matchup: {fam} decks, {pct}% won.',

  // ---- the lucky meter and starred cards (js/pack-luck.js) ----
  'luck.title': 'Lucky meter',
  'luck.sub': '{n} of {of} filled. Every pack fills it by its price; when it fills, that pack is super rare or better. A super rare from any pack empties it.',
  'luck.filled': '🍀 The lucky meter filled: super rare or better!',
  'star.none': 'Star up to three cards you are missing in Cards → Sets. They turn up twice as often as the rest of their rarity.',
  'star.full': 'You can star {n} cards at a time. Unstar one first.',
  'star.cannot': 'That card is earned, not found: it cannot be starred.',
  'star.found': '⭐ You found {card}, a card you starred!',
  'star.starLabel': 'Star this card: it turns up more often',
  'star.unstarLabel': 'Unstar this card',

  // ---- card evolution and lore (js/evolution.js) ----
  'evolve.button': 'Evolve into {name}',
  'evolve.heading': 'Evolved!',
  'evolve.log': '{from} evolved into {to}.',
  'evolve.cannot': 'Only creatures can evolve',
  'evolve.done': 'Already evolved once',
  'evolve.notOwned': 'You need a copy to evolve',
  'evolve.needMastery': 'Evolves at {stars} mastery ({have}/{need})',
  'lore.heading': 'Lore',
  'lore.voice': 'as {name} tells it',

  // ---- the weekly sealed league (js/sealed.js) ----
  'sealed.title': '📦 The Sealed League',
  'sealed.button': '📦 Sealed League · {record}',
  'sealed.new': 'new this week',
  'sealed.back': '← Back to the fountain',
  'sealed.intro': 'This week everyone opens the same {packs} packs. Build a 12-card deck from them only, then play {n} league matches. Every match counts, won or lost.',
  'sealed.next': 'League match {i} of {of}: {foe} is waiting. Your record so far: {record}.',
  'sealed.done': 'Your league week is done: {record}. A new pool opens next week.',
  'sealed.build': '📦 Open this week\'s packs and build',
  'sealed.rebuild': '🃏 Change my sealed deck',
  'sealed.play': '⚔️ Match {i}: {foe}',
  'sealed.finished': '✅ This week: {record}',
  'sealed.pips': 'This week: {record}',
  'sealed.count': '{n} of {of} cards · {spells} of {max} spells',
  'sealed.full': 'A deck holds {n} cards. Take one out first.',
  'sealed.tooManySpells': 'At most {n} spells in a sealed deck.',
  'sealed.prize': 'A prize for four wins or more: <b>{card}</b>',
  'sealed.log': 'Finished the Sealed League at {record}.',
  'sealed.winTitle': 'A league win!',
  'sealed.lossTitle': 'That one goes to them.',
  'sealed.endTitle': 'League week done: {record}',
  'sealed.endSub': 'See how the same pool went for everyone in Who\'s Playing.',
  'sealed.nextSub': '{left} league matches left this week · {record} so far.',

  // ---- challenges between testers (js/challenges.js) ----
  'chal.subjectWon': 'They beat your ghost',
  'chal.subjectLost': 'Your ghost held',
  'chal.bodyWon': '{name} played a ghost of your deck and won, in {turns} turns. Watch how they did it, or answer with a ghost of their deck.',
  'chal.bodyLost': '{name} played a ghost of your deck and lost, after {turns} turns. Your cards held. You can watch it, or play their deck back.',
  'chal.what': 'Answer them',
  'chal.answer': '⚔️ Play their deck',
  'chal.replayTitle': '{name} against your deck',

  // ---- letters in the mailbox (js/houses-and-cellar.js) ----
  'mail.claimFirst': 'Claim the gift first',
  'mail.welcomeHome.subject': 'Your cottage',
  'mail.welcomeHome.body': 'The little cottage beside the Reading Nook is yours now, dear. Put a few things on the shelves, frame your favourite cards, and check the mailbox now and then - the neighbors like to write.',
  'mail.bakerCook.subject': 'Cooking lessons',
  'mail.bakerCook.body': 'Bread is only the start! Bring me what you grow and what you catch, and we will cook something special together. Pumpkin Pie is my favourite, if you are wondering what to give me.',
  'mail.gardenerSeeds.subject': 'A little something for the garden',
  'mail.gardenerSeeds.body': `Your first harvest! Here is a Moonbean for you - they are hard to come by. You can find more hiding in ${PLACES.garden} grass, if you look closely.`,
  'mail.scholarPuzzle.subject': 'Well puzzled',
  'mail.scholarPuzzle.body': 'I watched you work through my puzzle. Most people just attack everything and hope. You thought about it. There will be a new board tomorrow.',
  'mail.rival.subject': 'About our match ({n}/{of})',
  'mail.rival.lastSubject': 'Thank you',
  'mail.cup.from': 'The Festival Committee',
  'mail.cup.subject': 'The {cup} is on!',
  'mail.cup.body': `This week's {cup} is open at the fountain in ${PLACES.square}. Three matches, no healing in between, and a trophy for anyone who sweeps them all. Good luck!`,
  'mail.nightVendor.subject': 'After dark',
  'mail.nightVendor.body': `When the lamps come on, look for my lanterns in ${PLACES.market}. I trade in night things: rare packs, glowing trinkets, and whatever critters you catch in a jar.`,
};
