/* ---------------- game version ----------------
   Each CHANGELOG entry carries its own version, so the version and its build date never have to be kept
   in sync by hand - the current version is just the newest CHANGELOG entry's version. Every entry bumps
   the minor number (x.Y.0); major bumps (X.0.0) are done by hand when an entry's version is written. */
function fmtChangelogDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function gameVersionLabel() {
  const latest = CHANGELOG[0];
  return (latest ? `v${latest.version} · ${fmtChangelogDate(latest.date)}` : '');
}

/* ---------------- journal: "What's New" changelog ----------------
   A developer-maintained list of notable player-facing changes, newest first. Add a new entry here
   whenever a change is worth telling the player about; the Journal tab shows a dot until they've opened
   the What's New segment at least once since the newest entry's date.
   Each entry also carries the version it shipped in - every entry bumps the minor number (x.Y.0) from
   the previous entry. Major version bumps (X.0.0) are done by hand, never automatically. */
const CHANGELOG = [
  {
    date: '2026-09-27',
    version: '1.15.0',
    title: "New neighbors, a longer story, and a listen around town",
    changes: [
      "The Net Loft opens in Quiet Harbor and the Glasshouse opens in Hollow Garden - a neighbor, a daily Pebbles task and a once-a-day box to check in each.",
      "The getting-started path keeps going after level 5: defeat a boss, see every district, meet the two new neighbors, beat Rook, complete a set and reach level 10 for a mythic card.",
      "Each district now leans the ambient music its own way - deeper and slower by the water, brighter and quicker through the market, more sparkle in the garden.",
      "Your foil total now shows at the top of Cards → Index and in your cottage trophy case.",
      "A few small quest and tip gaps closed: a quest for finding your first foil, and first-time tips for daily events and foils.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.14.0',
    title: "A warmer welcome, daily events, foils and comfort settings",
    changes: [
      "Getting started: a 12-step path for new arrivals at the top of Rewards → Dailies, with Pebbles at each step and a card at the end.",
      "Journal → Guide: every part of the game in one place - what it is, where to find it, and what still has to unlock.",
      "Daily town events: a Fishing Derby, Market Day, Harvest Fair, Double XP Day and more. Today's event shows next to the district name.",
      "Foil cards: any card you get has a small chance to arrive as a shimmering foil.",
      "New settings: Fast battles, Larger text and Calm motion (in your profile).",
      "Feedback and the new Report a bug button now include your game version, device and recent activity, so problems are easier to fix.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.13.0',
    title: "More to do with your cards",
    changes: [
      "The Card Museum opens in Market Row: donate spare copies to fill six themed wings. Each finished wing pays Pebbles and a keepsake decoration.",
      "Expeditions (at the museum): send up to three spare cards away for 20 minutes to 3 hours. Their keywords and strength shape the trip, and they come home with Pebbles, supplies and sometimes a card.",
      "The trading board on the Market Row sign: three new offers every morning - swap a spare for a card you have never had, bundle spares into a rarer card, or sell to a collector.",
      "Card mastery: every card you play earns mastery. ★, ★★ and ★★★ ranks show on your cards, and ★★★ cards get +1 health in battle.",
      "Charms: put up to three cards in charm slots (in My Cards) for small town perks based on their keyword and rarity. More slots open at levels 5 and 10.",
      "Sets: own every card in a themed set for a lasting bonus. Track them at the top of the Index.",
      "Give neighbors cards - each one loves a particular keyword, and a card they love is worth extra hearts.",
      "Deck challenges at the fountain: three rules a day, like 'only commons' or 'no two cards the same'. Win with a deck that follows the rule for a card prize.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.12.0',
    title: "A mini-game in every house",
    changes: [
      "Wren's Cottage: 🫖 Perfect Pour - stop the tea in the green band.",
      "The Reading Nook: ❓ Name That Card - guess the card from Olwen's description.",
      "Maple's Bakery: 🎂 Cake Toppings - repeat the order of the toppings.",
      "Fern's Cottage: 🌿 Weed the Beds - pull weeds, spare the flowers.",
      "Pip's Grain Stall: 🌾 Catch the Grain - three lanes, dodge the stones.",
      "Clover's Thread Stall: 🧵 Stitch the Pattern - remember the squares.",
      "Saffron's Spice Stall: 🫙 Higher or Lower - push your luck, or take the pot.",
      "Tock's Tinker Stall: ⚙️ Fix the Clockwork - a sliding gear puzzle.",
      "Your cottage: 🧺 Tidy Up - put everything where it belongs.",
      "The Lantern Market (after dark): 🏮 Light the Lanterns - flip them all on.",
      "Every game awards bronze, silver or gold. The first three medals in each game per day pay Pebbles, and gold can turn up a card. New quests, milestones and two titles to go with them.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.11.0',
    title: "A home of your own, letters, night life, and a companion",
    changes: [
      "Your own cottage beside the Reading Nook: decorate the shelves, frame three favourite cards, look over your trophies, and nap once a day.",
      "Letters: neighbors, Rook, shopkeepers and friends now write to you. Read them in your mailbox at home - some come with a small gift.",
      "After dark, Lumen's Lantern Market opens in Market Row with Night Packs, glowing decorations, and Pebbles for your critters.",
      "Night critters glow in every district after dark. Catch them for the new critter log on the Fish page.",
      "Invite a wandering spirit to follow you around. Each companion brings a small perk.",
      "Search, filter and sort in My Cards and the Deck tab.",
      "Deck codes: share a deck as a short text code, or load one into your current deck.",
      "Short tips the first time you meet each system, and a weather forecast on the signs (and the sky button).",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.10.0',
    title: "Cooking, boss twists, new keywords, puzzles and the Festival Cup",
    changes: [
      "Cooking: harvests and catches fill your pantry, and Maple helps you cook them into dishes. Give dishes as gifts, eat one before a match for a head start, or bring one to a neighbor who asks.",
      "Every district boss now bends one rule: Elder Yew heals each turn, Old Bramble's Guards are sturdier, the Harbor Keeper's tide washes your best card back to hand, and the Garden Sentinel's cheap cards all Bloom.",
      "Three new keywords - 🌵 Thorns, 📯 Rally and 🌀 Drain - on ten new cards. Thorns and Drain can also be gained in the Workshop.",
      "Olwen's daily puzzle: a fixed board to win in a single turn, new every day, with a card for the first solve.",
      "The Festival Cup at the fountain: three matches in a row with no healing in between, and a trophy for a clean sweep each week.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.9.0',
    title: "Seasons, saved decks, battle history and titles",
    changes: [
      "Seasons: every real week the town moves through spring, summer, autumn and winter. Trees change colour, the music changes key, the weather shifts, and each season's cards turn up more often (marked in the Index).",
      "Save up to three decks in the Deck tab and switch between them with a tap. Tap ✏️ to rename the one you're using.",
      "Journal → Battles shows your recent matches (who, how it went, what you won) plus your overall record and win streaks.",
      "Titles: many milestones now award a title. Pick one from your profile and it shows under your name in town.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.8.0',
    title: "The deep cellar, a rival, friends, gardens, and a fish log",
    changes: [
      "The cellar keeps going: past the Root Keeper's chest a crack leads to endless deep floors that get harder as you go. A loss ends the run, and your deepest floor is kept as a record.",
      "Every 5th deep floor has a guardian that can drop one of three cards found nowhere else.",
      "A rival named Rook turns up after your first win, practising in a different district each time. Beat Rook and they come back with a stronger deck - eight chapters, with a one-of-a-kind finale card.",
      "Neighbors remember you: favours, shared bread and friendly wins earn hearts. At 3 hearts a neighbor plays you with their signature deck, and at 5 they give you a keepsake card.",
      "Gardening: buy seeds from Fern (or find Moonbeans in the Hollow Garden's grass), plant them in Town Square, and harvest them when grown. Card seeds grow a card. Rain makes everything grow faster.",
      "Eight new fish, some only at night, in certain weather, or in Quiet Harbor - plus a legendary one. See them all on the new Fish page under Cards.",
      "Decorations can now be placed in any district, not just Town Square.",
      "New quests and milestones for the cellar, Rook, friends, gardening and the fish log.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.7.0',
    title: "Open doors, weather that matters, and spell cards",
    changes: [
      "Maple's Bakery is open: bake a loaf in the oven (ready in 6 minutes), then share it with a neighbor for a thank-you.",
      "Fern's Cottage (the blue house in the square) is open - help water the flower boxes each day.",
      "Saffron's Spice Stall in Market Row has one deal a day: a discounted pack or a hand-picked card.",
      "Tock's Tinker Stall sells card sleeves that dress up your own cards in battle.",
      "Weather now changes play: rain makes fish bite sooner, fog hides more cards and chests, storms give Swift cards +1 power, snow makes bosses tougher but prizes richer, and cloudy skies double spirit XP.",
      "New spell cards (9 of them) and a Spellbook Pack: cast from your hand for an instant effect, never taking a board slot. Aimed spells ignore Guard.",
      "New quests and milestones for baking, sharing bread, and casting spells.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.6.0',
    title: "Livelier town: names, a boss on a clock, and smoother wandering",
    changes: [
      "Accepting a favour from a neighbor now shows up in the Journal's Log.",
      "Hidden chests now show a key icon along with their glow, so they're easier to spot.",
      "Neighbors wander out a little way and loop back home instead of drifting at random - smoother movement.",
      "District bosses now appear for 30 minutes, then vanish for 30 minutes, with an entrance/exit animation and a warning before they return.",
      "Added name labels under neighbors, bosses, and your own character in town.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.5.0',
    title: "Track your neighbor favours",
    changes: [
      "Added a Favours tab to Rewards, listing every favour you've accepted from a neighbor, its progress, and the reward - no more forgetting who asked for what.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.4.0',
    title: "Quests consolidated under Rewards",
    changes: [
      "Removed the separate Quests segment from the Journal - it showed the same active quests as Rewards.",
      "Added a History tab to Rewards, showing everything you've completed (Dailies, Weekly, or otherwise).",
      "Journal is back to Log, Notes, and Updates.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.3.0',
    title: "Way more quests, a simpler profile, and a bigger Shop",
    changes: [
      "Dozens more Daily quests, including a full \"wander\" ladder rewarding every 500 steps up to 10,000.",
      "Way more Weekly quests, and 3 are now active at once instead of 2.",
      "Way more Milestones to unlock.",
      "Profile customization is simpler now: 5 emojis, 5 accessories, and 5 colors. One of each is free - the rest are in the Shop.",
      "Shop: buy emojis, accessories, and colors with Pebbles to unlock them on your profile.",
      "Shop: added the Puddle, Orchard, and Zenith card packs.",
      "Pebbles are a bit easier to come by now across the board - leveling up, dungeons, fishing, favours, and hidden chests all pay out more.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.2.0',
    title: "Weekly quests & a Quest Log",
    changes: [
      "Quests is now called Rewards, and is split into Dailies, Weekly, and Milestones tabs.",
      "Added Weekly quests - bigger goals than dailies, with better rewards.",
      "Added a Quest Log under the Journal, showing your active quests and a history of everything you've completed.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.1.0',
    title: "Version tracking, activity digest & more to chase",
    changes: [
      "The game now shows a version number - check your Player profile or Journal → Updates.",
      "Event Log now drops a summary every ~6 hours showing how many cards you've picked up.",
      "Added a bunch of new daily quests, including a hidden-chest quest.",
      "Added a bunch of new milestones to chase: card-collection tiers, win streaks, distance walked, fishing, favours, crafting, and more.",
    ],
  },
  {
    date: '2026-09-24',
    version: '1.0.0',
    title: "Journal notebook",
    changes: [
      "Notes is now a notebook: create as many written or drawn notes as you like, each opened and edited on its own.",
      "Written notes autosave as a draft while you type, and get a lined-paper look.",
      "Drawing notes got a bigger color palette, a custom color picker, and a choice of Blank, Lined, Grid, or Dotted paper.",
      "Any note - written or drawn - can be saved as a PNG image.",
      "Added this What's New tab so you can see what changed.",
    ],
  },
];
function renderChangelog() {
  const listEl = document.getElementById('changelogList');
  listEl.innerHTML = '';
  const versionLine = document.getElementById('clVersionLine');
  if (versionLine) versionLine.textContent = 'You\'re on ' + gameVersionLabel();
  CHANGELOG.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'cl-entry';
    el.innerHTML = `<div class="cl-head"><span class="cl-title">${escapeHtml(entry.title)}</span><span class="cl-date">${fmtChangelogDate(entry.date)}</span></div>
      <ul class="cl-list">${entry.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
    listEl.appendChild(el);
  });
}
function markChangelogSeen() {
  const pr = state.progress;
  const latest = CHANGELOG[0] && CHANGELOG[0].date;
  if (latest && pr.lastSeenChangelog !== latest) { pr.lastSeenChangelog = latest; saveState(); }
  updateJournalBadge();
}
function updateJournalBadge() {
  const btn = document.getElementById('tabJournal');
  const pr = state.progress;
  const latest = CHANGELOG[0] && CHANGELOG[0].date;
  const show = !!latest && pr.lastSeenChangelog !== latest;
  let dot = btn.querySelector('.dot');
  if (show && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!show && dot) dot.remove();
}

