/* ============================================================
   CONTENT: STORIES - ONE PER DISTRICT, ONE PER NEIGHBOUR (build 331)
   ============================================================
   After the first hour (STORY in content/story.js) each district has a short chapter of its own that ends with its god, and
   some of the named neighbours have a little story of their own. js/chapters.js runs them; this file is only words and data.
   Rewards → Stories lists them, the goal pill points at the next step, and a step's scene plays once when it starts.

   A chapter:  { id, kind: 'district' | 'neighbour', district (district chapters), who (the neighbour, a CAST role),
                 title, icon, opens (neighbour chapters: when it appears), steps: [...], end: [cards], reward }
   A step:     { ask, need, go, pebbles, cards }
     ask       what the goal pill and the list say ("talk with three neighbours")
     need      what counts, from the moment the step starts (things done before do not count):
                 { stat: 'fishCaught', n: 3 }   a number in the player's totals goes up by n (see the list below)
                 { visit: 'nook' }              go into this building (an INTERIORS id)
                 { boss: true }                 beat this district's god in battle
     go        where the pill's tap takes you, read late: () => JPLACES.nook, () => ({ npc: true }), ({ fish: true }),
               ({ crop: true }), ({ boss: true }), ({ minigame: true }) (see js/guide-walk.js). District chapters travel there first.
     pebbles   paid when the step is claimed
     cards     what is said when the step starts: { who, text } with who a CAST role ('guide', 'baker', ...) or 'boss'
               (this district's god). A card may have choices: [{ label, reply }] - a reply only changes what is said next.
   end         said once the last step is claimed; reward = { pebbles, card: rarity, deco: DECORATION_ITEMS id }
   Stats you can count: talks, battlesWon, fishCaught, cropsHarvested, seedsPlanted, breadBaked, dishesCooked,
   puzzlesSolved, minigamesPlayed, stonesSkipped, spiritsMet, cardsFound, papersRead, steps (any key bumpStat() uses).
   Keep the ids: they are what a save remembers. The maybe rule holds here too: nobody explains the dream for certain.
   ============================================================ */
const CHAPTERS = [
  /* ---------------- the districts ---------------- */
  { id: 'square', kind: 'district', district: 'square', icon: '⛲', title: 'The Humming Fountain',
    steps: [
      { ask: 'talk with three neighbours about the fountain', need: { stat: 'talks', n: 3 }, go: () => ({ npc: true }), pebbles: 6, cards: [
        { who: 'guide', text: 'Have you noticed the fountain hums? Not loudly. Only when nobody is listening on purpose.' },
        { who: 'guide', text: 'Everyone hears a different song in it. Ask three neighbours what theirs is. I am curious what they say.', choices: [
          { label: 'What do you hear?', reply: 'A kettle, mostly. But I would hear a kettle in a thunderstorm.' },
          { label: 'I will ask around.', reply: 'Good. Tell me if anyone hears the same one twice.' } ] } ] },
      { ask: 'ask in the Reading Nook', need: { visit: 'nook' }, go: () => JPLACES.nook, pebbles: 6, cards: [
        { who: 'guide', text: 'Nobody heard the same song. That is either very ordinary or very strange.' },
        { who: 'guide', text: `${CAST.scholar.name} keeps the books in the Reading Nook. If anyone has read about a humming fountain, it is ${pron('scholar').them}.` } ] },
      { ask: 'win two friendly matches', need: { stat: 'battlesWon', n: 2 }, go: () => ({ npc: true }), pebbles: 8, cards: [
        { who: 'scholar', text: 'A song with no words. There is a book about that. There is a book about everything here, but most of the pages are blank.' },
        { who: 'scholar', text: `The one page that is written says the song belongs to whoever keeps ${PLACES.square}. And that the keeper only listens to people who play well.` },
        { who: 'scholar', text: 'Win a couple of matches. Not to prove anything. Just so your cards remember how to talk.' } ] },
      { ask: `meet ${BOSSES.square} in battle`, need: { boss: true }, go: () => ({ boss: true }), pebbles: 10, cards: [
        { who: 'boss', text: 'You are not quite awake and not quite asleep. Good. That is where I live.' },
        { who: 'boss', text: 'You want to know about the song. Play with me first. I hear people best when they are busy.' } ] },
    ],
    end: [
      { who: 'boss', text: 'The song? I think it was yours. You hummed it on the way in. Everybody does, and nobody remembers.' },
      { who: 'guide', text: 'Well. Maybe. Or maybe it was the kettle. Either way, the square sounds a little more like home now.' } ],
    reward: { pebbles: 20, card: 'rare' } },

  { id: 'market', kind: 'district', district: 'market', icon: '🧵', title: 'Things Said Quietly',
    steps: [
      { ask: `see what is tangled at ${CAST.threadSeller.name}'s stall`, need: { visit: 'stall-thread' }, go: () => ({ scene: 'stall-thread', district: 'market', name: `${CAST.threadSeller.name}'s stall` }), pebbles: 6, cards: [
        { who: 'threadSeller', text: `Psst. Over here. Someone left a whisper tangled in my thread this morning, and it will not come loose.` },
        { who: 'threadSeller', text: 'Come and look. Maybe it is meant for you. Maybe it is meant for nobody. That happens here more than you would think.' } ] },
      { ask: 'listen to the packs at the Card Shop', need: { visit: 'card-shop' }, go: () => JPLACES.shop, pebbles: 6, cards: [
        { who: 'threadSeller', text: 'It only says one word, over and over, and I cannot make out which word it is.' },
        { who: 'threadSeller', text: `${CAST.cardSeller.name} says the packs at the Card Shop whisper too. Ask ${pron('cardSeller').them} if the words match.` } ] },
      { ask: 'win three matches', need: { stat: 'battlesWon', n: 3 }, go: () => ({ npc: true }), pebbles: 8, cards: [
        { who: 'cardSeller', text: 'Whispers? The packs only rustle. Although... the rustling has been very polite lately. Almost like it is asking for something.' },
        { who: 'cardSeller', text: `Everyone says the whispers come from ${BOSSES.market}, who sits behind the stalls and keeps every secret this market ever heard. Play a few matches first. The market likes to see you around.` } ] },
      { ask: `meet ${BOSSES.market} in battle`, need: { boss: true }, go: () => ({ boss: true }), pebbles: 10, cards: [
        { who: 'boss', text: 'Shh. Every word anyone ever meant to say and did not, ends up here with me.' },
        { who: 'boss', text: 'You may have one back. But I only give them to people who play their cards in the open.' } ] },
    ],
    end: [
      { who: 'boss', text: 'The word in the thread was "thank you". Someone meant to say it to you, a long time ago. It kept.' },
      { who: 'threadSeller', text: 'Oh! It came loose. It is a lovely word to have back, even if we never find out who sent it.' } ],
    reward: { pebbles: 25, card: 'rare' } },

  { id: 'harbor', kind: 'district', district: 'harbor', icon: '⚓', title: 'The Slow Tide',
    steps: [
      { ask: `visit ${CAST.netMender.name} at the Net Loft`, need: { visit: 'harbor-hut' }, go: () => JPLACES.net, pebbles: 6, cards: [
        { who: 'netMender', text: 'The tide is late again. Not by much. A day or two. It brings things back when it comes, so we wait.' },
        { who: 'netMender', text: 'Come up to the Net Loft. I will show you what it brought last time.' } ] },
      { ask: 'catch three fish', need: { stat: 'fishCaught', n: 3 }, go: () => ({ fish: true }), pebbles: 8, cards: [
        { who: 'netMender', text: 'A button, a key with no door, and a drawing of a house nobody here has seen. The tide keeps what people forget.' },
        { who: 'netMender', text: 'Catch a few fish while we wait. They swim up from the deep end of the dream. Sometimes they carry a little news.' } ] },
      { ask: 'win three matches', need: { stat: 'battlesWon', n: 3 }, go: () => ({ npc: true }), pebbles: 8, cards: [
        { who: 'netMender', text: `The fish say the tide is not lost. It is waiting for someone to ask it to come in. ${BOSSES.harbor} decides when.` },
        { who: 'netMender', text: `${BOSSES.harbor} only ever plays with people who are patient. Win a few matches first and let the harbour get used to you.` } ] },
      { ask: `meet ${BOSSES.harbor} in battle`, need: { boss: true }, go: () => ({ boss: true }), pebbles: 10, cards: [
        { who: 'boss', text: 'Everything comes back. Not when you want it to. When it is ready.' },
        { who: 'boss', text: 'Play slowly with me, and I will think about it.' } ] },
    ],
    end: [
      { who: 'boss', text: 'There. The tide is in. It brought you something, too, though you may not remember losing it.' },
      { who: 'netMender', text: 'Look at the water. That is the calmest I have seen it in... well. As long as I remember, which is not very long.' } ],
    reward: { pebbles: 30, card: 'ultra' } },

  { id: 'garden', kind: 'district', district: 'garden', icon: '🌻', title: 'Seeds That Know They Are Dreaming',
    steps: [
      { ask: `visit ${CAST.glassKeeper.name} at the Glasshouse`, need: { visit: 'garden-glass' }, go: () => JPLACES.glass, pebbles: 6, cards: [
        { who: 'glassKeeper', text: 'Something in the garden is growing in its sleep. Very slowly. It is listening for whoever is watching.' },
        { who: 'glassKeeper', text: 'Come into the Glasshouse. Speak softly, the thoughts in here bruise easily.' } ] },
      { ask: 'harvest three crops', need: { stat: 'cropsHarvested', n: 3 }, go: () => ({ crop: true }), pebbles: 8, cards: [
        { who: 'glassKeeper', text: 'The plants here grow toward whatever you pay attention to. If you look away, they grow toward that instead.' },
        { who: 'glassKeeper', text: `Bring in a few harvests. The garden likes to know it is being noticed. ${CAST.gardener.name} will have seeds if you need them.` } ] },
      { ask: 'win three matches', need: { stat: 'battlesWon', n: 3 }, go: () => ({ npc: true }), pebbles: 8, cards: [
        { who: 'gardener', text: `${CAST.glassKeeper.name} thinks the garden is dreaming that it is a garden. I think it is just a garden. We have agreed to both be right.` },
        { who: 'gardener', text: `Either way, ${BOSSES.garden} tends the whole thing. Play a few matches and the flowers will start turning toward you.` } ] },
      { ask: `meet ${BOSSES.garden} in battle`, need: { boss: true }, go: () => ({ boss: true }), pebbles: 10, cards: [
        { who: 'boss', text: 'You know you are dreaming. I can tell. You look at things twice.' },
        { who: 'boss', text: 'That is the only rule of my garden. Look twice. Now, show me your cards.' } ] },
    ],
    end: [
      { who: 'boss', text: 'The thing growing in its sleep was a door. It is not finished yet. It will be, one day, if you keep looking twice.' },
      { who: 'glassKeeper', text: 'A door. Of course it was. Leave it to grow. Some things open better when nobody pushes.' } ],
    reward: { pebbles: 30, card: 'ultra' } },

  /* ---------------- the neighbours ---------------- */
  { id: 'baker', kind: 'neighbour', who: 'baker', icon: '🍞', title: 'A Recipe Nobody Wrote Down', opens: p => !!(p.visited && p.visited.bakery),
    steps: [
      { ask: `bake two loaves at ${CAST.baker.name}'s`, need: { stat: 'breadBaked', n: 2 }, go: () => JPLACES.bakery, pebbles: 6, cards: [
        { who: 'baker', text: 'I have a recipe I can almost taste. Something my grandmother made. Or someone. I cannot remember whose kitchen it was.' },
        { who: 'baker', text: 'Bake a couple of loaves with me. My hands remember things my head does not.' } ] },
      { ask: 'cook a dish in the bakery', need: { stat: 'dishesCooked', n: 1 }, go: () => JPLACES.bakery, pebbles: 8, cards: [
        { who: 'baker', text: 'Warm, a little sweet, something from the garden in it. Bread is only the beginning of it.' },
        { who: 'baker', text: 'Cook something with what you have grown or caught. Anything. I want to see what you reach for.' } ] },
      { ask: 'catch a fish for the last part', need: { stat: 'fishCaught', n: 1 }, go: () => ({ fish: true }), pebbles: 8, cards: [
        { who: 'baker', text: 'Oh, that is close. That is very close. There was a smell of the sea in that kitchen, I am sure of it now.' },
        { who: 'baker', text: 'Bring me a fish, any fish. And then we will see.' } ] },
    ],
    end: [
      { who: 'baker', text: 'That is it. That is the one. I still do not know whose kitchen it was, but I know it was a happy one.' },
      { who: 'baker', text: 'Here, take a basket. Every recipe should go home with somebody.' } ],
    reward: { pebbles: 15, deco: 'basket' } },

  { id: 'gardener', kind: 'neighbour', who: 'gardener', icon: '🌱', title: 'What the Seeds Remember', opens: p => !!(p.visited && p.visited.house2),
    steps: [
      { ask: 'plant three seeds', need: { stat: 'seedsPlanted', n: 3 }, go: () => ({ scene: 'house2', district: 'square', name: `${CAST.gardener.name}'s cottage` }), pebbles: 6, cards: [
        { who: 'gardener', text: 'Every seed I sell remembers the plant it came from. If you listen closely, they tell you what they want to be.' },
        { who: 'gardener', text: 'Plant three. Do not tell them what to grow into. Just see.' } ] },
      { ask: 'harvest three crops', need: { stat: 'cropsHarvested', n: 3 }, go: () => ({ crop: true }), pebbles: 8, cards: [
        { who: 'gardener', text: 'Now comes the hard part, which is waiting. I am very bad at it. I check on mine every hour.' },
        { who: 'gardener', text: 'When they are ready, bring them in.' } ] },
      { ask: `tell ${CAST.gardener.name} how they grew`, need: { visit: 'house2' }, go: () => ({ scene: 'house2', district: 'square', name: `${CAST.gardener.name}'s cottage` }), pebbles: 6, cards: [
        { who: 'gardener', text: 'Did they grow the way you expected? Mine never do. That is the best part.' },
        { who: 'gardener', text: 'Pop in and tell me about them.' } ] },
    ],
    end: [
      { who: 'gardener', text: 'You let them grow into what they wanted. Most people do not. The seeds will remember you for it.' },
      { who: 'gardener', text: 'Here: a tulip bed, from the ones that grew the most stubbornly.' } ],
    reward: { pebbles: 15, deco: 'tulips' } },

  { id: 'scholar', kind: 'neighbour', who: 'scholar', icon: '📚', title: 'The Blank Pages', opens: p => !!(p.visited && p.visited.nook),
    steps: [
      { ask: `solve ${CAST.scholar.name}'s daily puzzle`, need: { stat: 'puzzlesSolved', n: 1 }, go: () => JPLACES.nook, pebbles: 6, cards: [
        { who: 'scholar', text: 'Most of the books in the Nook have blank pages. I used to think they were unfinished. Now I think they are waiting.' },
        { who: 'scholar', text: 'Waiting for what, I do not know. Solve today\'s puzzle and let us see if a page fills in.' } ] },
      { ask: 'finish two house mini-games', need: { stat: 'minigamesPlayed', n: 2 }, go: () => ({ minigame: true }), pebbles: 8, cards: [
        { who: 'scholar', text: 'One line appeared. It says: "the town is written by the people who play in it". Rather vague, as lines go.' },
        { who: 'scholar', text: 'Play a couple of the little games around town. If I am right, another line will come.' } ] },
      { ask: 'read a new Dream Gazette (one comes out each day)', need: { stat: 'papersRead', n: 1 }, go: () => ({ run: openGazette }), pebbles: 6, cards: [
        { who: 'scholar', text: 'Another line: "and read by the people who live in it". I think the book wants us to look at the town\'s own news.' },
        { who: 'scholar', text: 'Read the next Dream Gazette. A new one comes out every day.' } ] },
    ],
    end: [
      { who: 'scholar', text: 'The whole page is full now. It is a list of everything you did today, in your handwriting. I am choosing not to find that strange.' },
      { who: 'scholar', text: 'Keep this candle. Reading by it makes the blank pages a little less blank.' } ],
    reward: { pebbles: 15, deco: 'candle' } },

  { id: 'netMender', kind: 'neighbour', who: 'netMender', icon: '🪢', title: 'Nets That Never Tear', opens: p => !!(p.visited && p.visited['harbor-hut']),
    steps: [
      { ask: 'catch five fish', need: { stat: 'fishCaught', n: 5 }, go: () => ({ fish: true }), pebbles: 8, cards: [
        { who: 'netMender', text: 'I mend nets every day, and they never tear. I am starting to think I am mending something else.' },
        { who: 'netMender', text: 'Catch a few fish for me. I want to see if the nets hold anything at all.' } ] },
      { ask: 'skip five stones across the water', need: { stat: 'stonesSkipped', n: 5 }, go: () => ({ fish: true }), pebbles: 6, cards: [
        { who: 'netMender', text: 'They held. Of course they held. But the water rippled the wrong way, as if something underneath was mending too.' },
        { who: 'netMender', text: 'Skip a few stones. Watch where the rings go.' } ] },
      { ask: `tell ${CAST.netMender.name} where the ripples went`, need: { visit: 'harbor-hut' }, go: () => JPLACES.net, pebbles: 6, cards: [
        { who: 'netMender', text: 'Did the rings come back toward you? They do for me. Come up and tell me.' } ] },
    ],
    end: [
      { who: 'netMender', text: 'Toward you, then. I thought so. I think the harbour mends whatever people bring here with them. The nets are only how I watch.' },
      { who: 'netMender', text: 'Take a streamer for your window. So the wind knows where you live.' } ],
    reward: { pebbles: 15, deco: 'carp-streamer' } },
];
