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
