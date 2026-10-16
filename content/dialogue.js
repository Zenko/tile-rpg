/* ============================================================
   CONTENT: WHAT PEOPLE SAY
   ============================================================
   Companion chatter, neighbour talk, favours, hints, letters and the small lines of the calm activities.
   Names come from js/game-config.js (CAST, PLACES); {name}-style slots are filled in by the code that uses each table.
   ============================================================ */

// ---- used by js/companion-activities.js ----
/* ---------- what they say: first person, short, a little different every time ---------- */
/* Build 277. Things a companion remembers about the two of you: each line unlocks when its count (days together, wins together, catches together)
   reaches `min`; {n} is that count. They join its chat, and the Companion page shows the latest one for each count. */
const COMPANION_MEMORIES = [
  { need: 'days', min: 3,   text: 'We have walked together for {n} days. I have been counting, quietly.' },
  { need: 'days', min: 14,  text: '{n} days already. I know your footsteps now.' },
  { need: 'days', min: 60,  text: '{n} days side by side. I cannot picture the town without you in it.' },
  { need: 'wins', min: 3,   text: 'That is {n} wins together. I only watched, but I felt every one.' },
  { need: 'wins', min: 12,  text: '{n} wins! I was there for each of them, you know.' },
  { need: 'wins', min: 30,  text: '{n} wins together. They should write that down somewhere.' },
  { need: 'catches', min: 3,  text: '{n} fish caught while I held the net. Well, stood near it.' },
  { need: 'catches', min: 12, text: '{n} catches. The water recognises us now.' },
  { need: 'catches', min: 30, text: '{n} catches together. The fish must talk about us.' },
];
/* What a companion brings once a day from bond 2 (companionGift in js/afterdark-companion-cards.js), by its main perk. */
const COMPANION_GIFT_LINES = {
  spirit: 'found this on the steps, humming to itself', finds: 'spotted this under a bush and just knew', crops: 'dug this up by the garden fence', harvest: 'gathered this from the market floor',
  chest: 'worked this loose from an old lock', fish: 'fished this out of a puddle, proudly', xp: 'learned something today and wanted to share it', craft: 'sanded this down all morning for you',
  bounty: 'kept this from our last win', medals: 'polished this up from our last game', hearth: 'baked this and tried very hard not to eat it',
};
const COMPANION_TALK = {
  any: ['This is nice.', 'I like walking with you.', 'Do you ever just listen to the town?', 'No hurry, is there?', 'I could do this all day.', 'You walk at a good pace.', 'I was hoping you would come by.', 'Thank you for bringing me.', 'Everything feels a little brighter with company.', 'I noticed something small just now. I forgot what.'],
  clear: ['What a bright day.', 'The light on the stones is lovely today.', 'Not a cloud to worry about.'],
  cloudy: ['Soft light today. I like it.', 'Mist makes the town feel close.', 'Everything looks a little dreamy in this.'],
  rain: ['Listen to the rain on the roofs.', 'I like how the puddles shine.', 'Mind the puddles. Or do not.'],
  storm: ['The air is tingling. Stay close.', 'Big sky today.', 'I do not mind a storm, with you here.'],
  snow: ['Little drifting stars everywhere.', 'It is so quiet in the snow.', 'Look, it is landing on your sleeve.'],
  night: ['The lanterns look like small moons.', 'Nights are for slow walks.', 'Do you think the stars know our names?'],
  places: {
    square: [`${PLACES.square} always smells like warm bread.`, 'The old stones here remember a lot.', 'I like the benches. Someone is always just leaving.'],
    market: ['So many voices at once. I love it.', 'Someone is selling something that smells wonderful.', 'Keep your cards close in a crowd.'],
    harbor: ['Hear the water? It is humming along.', 'The boats sound like they are sleeping.', 'I could watch the tide for hours.'],
    garden: ['Everything here is growing, quietly.', 'The flowers keep their own time.', 'Do plants dream, do you think?'],
  },
  perk: {
    spirit: ['I feel steady when I am beside you.', 'If a match comes, I will be right here.'],
    finds: ['I think there is something in the grass. Maybe.', 'Keep your eyes low. Things hide there.'],
    crops: ['Your garden must be doing well.', 'I can feel the seedlings from here.'],
    harvest: ['Harvest days are the best days.', 'Could we bake something later?'],
    chest: ['Somewhere a lock is waiting for a key.', 'I have a feeling about chests today.'],
    fish: ['The fish are talking. It sounds like bubbles.', 'We should visit the water later.'],
    xp: ['You are getting better at all of this.', 'Every day you learn a little more.'],
    bounty: ['A win always feels a little heavier in the pocket.', 'I like it when we come home with something.'],
    medals: ['Medals look best on you.', 'Another game? I will keep score.'],
    hearth: ['Is that bread I smell, or hope?', 'The oven likes us today, I can tell.'],
  },
  kind: {
    card: ['Being a card is mostly waiting. This is better.', 'I used to be in a deck. Now I get to walk.', 'My picture looks good in this light, I think.'],
    spell: ['I only ever last a moment in a match. This is longer.', 'Spells do not usually get walks. Thank you.'],
    npc: ['Folks keep waving at us.', 'I told them I was out with a friend.', 'It is good to have somewhere to be.'],
    boss: ['The town looks smaller from up here.', 'I have promised not to scare anyone. Mostly.', 'Walking is not so different from guarding.'],
    rival: ['Do not think this means I am going easy next time.', 'I am only here to watch your footwork.', 'Your deck is getting scary, you know.'],
  },
  bond: ['I think we are good friends now.', 'I would follow you anywhere. Almost anywhere.', 'You make this town feel like home.'],
};
const COMPANION_CALM_TALK = ['This is peaceful.', 'I am just breathing.', 'Mmm.', 'The quiet is soft today.', 'I am glad we stopped.', 'Nothing needs us right now.'];

// ---- used by js/requests-friendship-rival.js ----
const TALK_WEATHER = {
  clear:  ['Lovely and bright, isn\'t it? Good day for a wander.', 'Not a cloud to complain about. I could sit out in this all afternoon.'],
  cloudy: ['A bit misty, but I don\'t mind. It keeps the glare off the cards.', 'Misty days are for slow walks and warm drinks.'],
  rain:   ['Listen to the moonrain on the roofs. I do love the sound.', 'Puddles everywhere, each with its own little moon!'],
  storm:  ['Quite the dream storm! Everything feels a little faster in this weather.', 'It always makes my cards tingle. Stay close, friend.'],
  snow:   ['Drifting stars! Everything is so quiet under them.', 'Come and find me by the warm windows later.']
};
const REQ_VISITS = [
  { building: 'nook',    who: CAST.scholar.name, place: 'the Reading Nook', line: `Could you pop into the Reading Nook and tell ${CAST.scholar.name} I said hello?` },
  { building: 'cottage', who: CAST.guide.name,  place: `${CAST.guide.name}'s Cottage`,   line: `Would you look in on ${CAST.guide.name} at the cottage? Just say I sent you.` },
  { building: 'bakery',  who: CAST.baker.name, place: `${CAST.baker.name}'s Bakery`,   line: `Pop into the bakery and tell ${CAST.baker.name} her rolls are the talk of the square.` },
  { building: 'house2',  who: CAST.gardener.name,  place: `${CAST.gardener.name}'s Cottage`,   line: `${CAST.gardener.name} lent me a watering can ages ago. Could you let her know I have not forgotten?` },
  { building: 'stall-spice',  who: CAST.spiceSeller.name, place: `${CAST.spiceSeller.name}'s Spice Stall`, line: `Could you ask ${CAST.spiceSeller.name} what today's deal is? I'm too shy to haggle.` },
  { building: 'stall-tinker', who: CAST.tinker.name,    place: `${CAST.tinker.name}'s Tinker Stall`,   line: `Tell ${CAST.tinker.name} the little bell on the door is squeaking again, would you?` },
];

// ---- used by js/npc-brain.js ----
const NPC_HINTS = [
  { id: 'family:grove', label: `🌿 ${FAMILY_NAMES.grove} cards`, say: `${FAMILY_NAMES.grove} cards? Lovely, I will pack some.` },
  { id: 'family:stone', label: `🪨 ${FAMILY_NAMES.stone} cards`, say: `${FAMILY_NAMES.stone}, solid and steady. I can do that.` },
  { id: 'family:tide', label: `🌊 ${FAMILY_NAMES.tide} cards`, say: `${FAMILY_NAMES.tide} it is. I like the sound of that.` },
  { id: 'family:wind', label: `🪶 ${FAMILY_NAMES.wind} cards`, say: `${FAMILY_NAMES.wind} cards, light on their feet. Good idea.` },
  { id: 'tough', label: '💪 Something tougher', say: 'You want a real challenge? Then I will bring my sturdiest cards.' },
  { id: 'gentle', label: '🫖 Something gentler', say: 'A softer deck for a softer day. I will go easy.' },
  { id: 'seasonal', label: '🍂 Whatever suits the season', say: 'Something seasonal. I will see what the weather brings.' }
];

// ---- used by js/calm.js ----
const CALM_TEA_LINES = ['The steam curls and lets go.', 'Warm hands, a quiet mind.', 'Nothing needs you for the next minute.', 'The cup is just the right size.', 'Somewhere, rain on a roof.', 'You taste leaves, and a little sunlight.', 'Slow is also a speed.', 'The kettle sings and settles.', 'A good pause is a kind of progress.', 'You do not have to finish anything.'];

// ---- used by js/town-life.js ----
const WISH_LINES = ['Your coin sinks slowly. You feel lighter.', 'A far-off splash. Somebody, somewhere, smiles.', 'The water ripples twice, as if it heard.', 'You wish for a quiet evening. It seems likely.'];

// ---- used by js/puddle-modes.js ----
const PW_DEEP_LINES = ['The tide is in a mood today.', 'Have you seen the lantern reef? It hums at night.', 'Mind the current by the plaza. It steals hats.', 'We never close the doors. We just forget how they open.',
  'This used to be a market. You can still hear the haggling, if you hold your breath.', 'Everything here is a little bit slower. I like it.', 'The fish know everything. They just do not say.', 'Do not tell the crabs I said so, but the east quarter has the best view.'];

// ---- used by js/houses-and-cellar.js ----
/* ---------------- letters: the neighbors write to you ----------------
   Each letter has a key so it is only ever sent once (friend notes use the day in theirs). Some carry a small gift,
   claimed from the mailbox at home. checkMail() runs every so often and sends whatever has become due. */
const ROOK_LETTERS = [
  'Fine, you won. I have been practising in secret. See you soon - and bring your best cards.',
  'I asked around about you. Everyone says you are "nice". Nice people are the most dangerous.',
  'I traded my lucky coin for a rare card. Worth it? We will find out.',
  'Your Watch cards are a wall I cannot seem to climb. I am working on it.',
  'I caught myself smiling after our last match. Do not tell anyone.',
  'Three decks, three rebuilds, zero sleep. Our next match will be different.',
  'I think I finally understand why I keep losing to you. You play like you are having fun.',
  'Thank you. For all of it. If you ever need a practice partner, you know where to find me. - R.',
];

// ---- used by js/town-render-weather.js ----
// One-line lore rolled once per spirit and kept for its lifetime, so re-tapping it tells the same story.
const SPIRIT_STORIES = [
  '{name} drifted in on the wind and never quite left {town}.',
  'Locals say {name} has watched over {town} for longer than anyone can remember.',
  'A quiet spirit - {name} only shows itself to those who slow down enough to notice.',
  '{name} seems to know every corner of {town} by heart.',
  'They say {name} brings luck to whoever crosses its path with a kind word.',
  '{name} flickers in and out of sight, like a memory not quite ready to fade.',
  'No one is quite sure where {name} came from, only that it has always been near {town}.',
  '{name} hums a tune too faint to place, gone the moment you try to listen closer.',
  'Children in {town} leave small gifts out for {name}, just in case the stories are true.',
  '{name} rarely lingers long enough to be seen twice in the same place.',
];
