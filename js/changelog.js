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
    version: '1.64.0',
    date: '2026-10-01',
    title: "The Character tab",
    changes: [
      "A new Character tab sits at the right of the bottom bar. You and your companion stand on a little stage, with your level and Pebbles on top.",
      "Pick the backdrop behind you. Today's sky is free and follows the time of day and weather. Meadow, Harbor lights, Autumn grove, Starry night, Snowfall, Lantern night and Aurora hill cost Pebbles, in the tab or in the Shop's Customize page.",
      "Me shows your level, stats and the title you wear. Bag shows your pantry, dishes, seeds, bug jar and decorations, and you can plant or place from it. Milestones shows every milestone, and tapping one with a title wears it. Companion shows who is with you, their perk, and the charms you carry.",
      "Tap yourself or your companion on the stage for a little hop. The older player menu, Rewards and Shop screens work as before.",
    ],
  },
  {
    version: '1.63.0',
    date: '2026-10-01',
    title: "A pond full of fish",
    changes: [
      "Cast again works after a catch. The button takes you back to aiming, and your last spot is remembered, so it is one tap to cast again.",
      "You can see several fish swimming in the water now. Tap the water to choose where to cast, and the fish closest to your spot swims over to the hook. Nothing close? One wanders in from the edge, but it takes longer.",
      "Your bait floats on the water like the fish do. Pick daisies and daisies bob around the pond. Fish that like your bait will come from further away.",
      "New animations: the rod whips and the float arcs out when you cast, the hook shakes when you set it, a caught fish leaps into your bucket with a spray of water, and a fish that gets away dashes off in a puff while the float bounces.",
      "Calm mode and reduced motion keep the fish still and skip the splashes.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.62.0',
    title: "A new way to fish",
    changes: [
      "Fishing is now a full-screen look at the pond: the bobber, ripples and line on the surface, and a fish you can watch below. Rain and fog show in the scene.",
      "Pick a bait before you cast. Crumbs are free, and daisies, night bugs and fish from your pantry each attract different fish. A bait is only used up when a fish bites.",
      "While you wait, a shadow swims toward the hook and shows how big the fish is. Sometimes there is a false nibble, so it pays to wait for the real bite.",
      "Reeling is now a hold, not a tap race. Hold the button to reel and keep the marker in the green. When the fish runs, ease off in short pulls. The line never snaps, it just lets the fish take back line, so there is still no penalty.",
      "Prefer something simpler? Turn on Easy reeling in Settings and holding keeps the line steady for you.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.61.0',
    title: "Battle fixes and effects",
    changes: [
      "Fixed cards in your row coming out bigger than the other row and the deck pile sitting on top of your last card. Every slot is now the same size and the piles have their own space.",
      "Life is back as a wide numbered bar under each name (with the ring still around the portrait).",
      "Hitting the opponent's Spirit is easier: when a card is ready, a big red Attack Spirit button appears. You can also drag a ready card up past their cards, or onto an enemy card, to attack.",
      "New battle effects: a slash and a screen shake when a card is hit, a shield bubble when an attack is blocked, a red or gold edge flash when a Spirit is hit, and spells now fly across the table as a glowing orb with a burst, a lightning bolt, a sweep or rising sparkles depending on the spell.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.60.0',
    title: "A gentler sunny sky",
    changes: [
      "Clear weather no longer sweeps a bright glare across the map. It now has a soft sun burst in the top corner that slowly breathes, and it fades away at night.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.59.0',
    title: "Table mats and decks you can see",
    changes: [
      "Customize your side of the battle table with a table mat: Moss felt, Midnight velvet, Sand linen, Cherry lacquer, Starfield or Aurora. Buy them in the Card Shop (Customize), then pick one in Player → Customize.",
      "Each side now has a visible draw pile of card backs on the table, and the opponent's hand is a fan of backs beside their name. Your own card backs wear your card sleeve.",
      "Cards are dealt slowly from the deck: the opening hand, every draw you make and every draw your opponent makes. The back flies across the table and flips face up. Fast battles speeds it up, and Calm motion turns it off.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.58.0',
    title: "Battles on a tabletop",
    changes: [
      "The battle screen has a new look: both sides' cards sit on a tilted glass table, Spirit is a ring around each portrait, and your hand fans out at the bottom.",
      "Drag a card from your hand onto the table to play it. Drop it on a slot to choose where it goes. Spells with no aim can be dropped anywhere on the table, and aimed spells are dropped on an enemy card.",
      "Tapping still works: tap a card to read it, tap again to play it.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.57.0',
    title: "Slate glass dark theme",
    changes: [
      "The dark theme is now blue-grey slate with soft blue-teal glass, with less green than before. The light theme is unchanged.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.56.0',
    title: "A new look, with light and dark themes",
    changes: [
      "The whole game has a softer new look: sea-glass buttons, rounded cards and a gentle serif for titles.",
      "Choose Dark or Light, or let Auto follow your device, in Player → Settings → Appearance. Dark is still the default.",
      "The town map, battles and building interiors stay dark in both themes, so the world keeps its night colours.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.55.0',
    title: "A livelier town",
    changes: [
      "Props do things now: sit on benches, make a wish at the well, light lamps after dark. The Market has a crate to haggle at, the Harbor has nets to haul in and the Garden has a pump to water plants. The Square's far bench lets you busk for tips.",
      "Shake trees for acorns and seeds, skip stones across the water, splash through puddles when it rains, and watch the birds scatter as you walk up. Villagers carry umbrellas in the rain.",
      "Each district has a town mood that fills as you do all this. At 10, 25 and 50 it dresses up for good - balloons, flower pots, then lamps that glow all night.",
      "New quests, weekly quests, achievements, a Town Guide entry and little sound effects for all of it. The Harbor and Garden now have a few benches, lamps and a prop each.",
    ],
  },
  {
    date: '2026-10-01',
    version: '1.54.0',
    title: "Softer rain and town ambience",
    changes: [
      "Rain and storm sound much softer and more natural now - a gentle patter instead of a harsh hiss.",
      "Each town has its own ambient sound: wind and birdsong in the Square, a market murmur, waves and gulls at the Harbor, rustling leaves (and crickets at night) in the Garden.",
      "New \"Town ambience\" switch in Settings → Audio. It's on by default.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.53.0',
    title: "Card Shop screens scroll properly",
    changes: [
      "Fixed the \"Back to the counter\" button floating over the packs, items and customize lists in the Card Shop. The list now scrolls by itself and the button stays at the bottom.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.52.0',
    title: "Deck moves into Cards; the Card Shop stays put",
    changes: [
      "The Deck is now a segment of Cards (My Cards · Deck · Index · Craft · Fish), so the bottom bar is down to four tabs: Town, Journal, Cards and Rewards.",
      "In the Card Shop, Packs, Customize and Items now open right on the shop counter, just like the sleeves - no more jumping to another screen. Place and Move still take you back out to the map.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.51.0',
    title: "The Card Shop is the shop",
    changes: [
      "The Shop tab is gone from the bottom bar. Everything it sold now lives in Zeph's Card Shop on Market Row: card packs, card sleeves, Customize, and Items & decorations. Until Market Row opens, tap your 🫧 Pebbles counter to browse.",
      "\"Share that I'm playing\" is now on by default (you can switch it off in Settings any time, and your choice is remembered).",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.50.0',
    title: "A round of interface polish",
    changes: [
      "Press and hold any card - in Cards, Deck, the Index, Craft, the memory game or a battle - to see it large with its rules and story.",
      "Tips now slide in as a small banner above the tab bar instead of covering the whole screen.",
      "Battles show what an attack would do (💥 KO, 🫧 blocked, or the health left) on every enemy card you can hit, and unique or enhanced enemy cards explain themselves when tapped.",
      "Talk cards, Feedback and Back up now slide up as bottom sheets. Drag the handle down or tap outside to close.",
      "Rewards fly up to the Cards and Pebbles counters, and tapping those counters opens Cards or the Shop.",
      "Craft's Trade up chips show progress (like 1/3) and dim until you have enough spares.",
      "Clearer text contrast, bigger tap targets, visible keyboard focus, press feedback on buttons, and reduced-motion is respected everywhere.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.49.0',
    title: "Livelier neighbors, softer cellar, travel fade",
    changes: [
      "Talking to a neighbor is more of a conversation: a portrait that reacts, a speech bubble that types out (tap it to skip), and small-talk topics - the weather, town gossip and favourite cards. Your first chat of the day with each neighbor earns a little friendship.",
      "Traveling between districts now fades through a tinted \"arriving at…\" screen instead of popping.",
      "The cellar is gentler: the first three floors are easier, and the deep floors ramp up more slowly.",
      "The Craft screen's Trade up block no longer has its own background.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.48.0',
    title: "Easier trading up",
    changes: [
      "On the Craft screen, your chosen cards and the Combine button now sit together and stay pinned at the top while you scroll your spare cards, so there's no more swiping to the bottom to finish a trade.",
    ],
  },
  {
    date: '2026-09-30',
    version: '1.47.0',
    title: "Tougher opponents, and a memory game fix",
    changes: [
      "Neighbors, district bosses and the cellar floors now field unique cards you can't find anywhere else (marked with a gold ✦) plus enhanced + cards. Each neighbor keeps their own favourites, and it all grows tougher as you win more and go deeper into the cellar.",
      "Fixed the Reading Nook memory game grid running off the side of the screen on bigger boards.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.46.0',
    title: "Feedback now includes who sent it",
    changes: [
      "Feedback and bug reports now include your player name, level, wins, cards and game version, so the developer can tell whose note it is. The feedback box says so before you send.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.45.0',
    title: "A snack before battle now clearly helps, plus more fixes",
    changes: [
      "Fixed snacks/dishes eaten before a match: the boost always worked, but was easy to miss since the spirit bar looked identical at full health. There's now a badge next to your spirit bar for the whole match, and a floater the moment you eat.",
      "Deck's Share/Load code and rename-deck now open a proper in-game dialog instead of a plain browser pop-up.",
      "Found and revealed cards now show the actual card face (cost, art, keywords, power/health) instead of just an icon and a line of text - the same look as My Cards, Craft and battle.",
      "Feedback and bug reports now send straight from the game instead of opening your email app.",
      "Merged Rewards' History tab into Journal's Log - a completed quest already showed up in both places; now it's just the one place, with its reward included.",
      "New: a Card Shop in Market Row, run by Zeph - walk in and browse the same Shop you'd open from the player menu.",
      "Player menu is now tabbed (Customize / Profile / Social / Settings) instead of one long scroll with a couple of expandable sections.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.44.0',
    title: "A round of small UI/UX fixes",
    changes: [
      "The Town Guide is now a compact list that expands one entry at a time, instead of showing every entry's full description at once.",
      "A favour that's ready to hand in now floats to the top of Rewards → Favours, same as Dailies and Weekly already did.",
      "Tapping the dimmed background behind World Map, Weather and Sort-by now closes them, like the player menu already does.",
      "A few small buttons (battle Help/Yield, decoration Move/Store/Delete) are now bigger and easier to tap accurately.",
      "The player menu's Settings and Who's Playing sections now start tucked away behind a tap, and Settings is grouped into Audio / Accessibility & battles / Notifications & privacy instead of one long list.",
      "My Cards now has the same optional Filter toggle Deck just got, so both screens work the same way.",
      "The Journal and Rewards tab bars now scroll sideways instead of shrinking their labels to fit 5 tabs.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.43.0',
    title: "Craft, Deck and What's New, redesigned",
    changes: [
      "Craft: refining a card now expands its power/health choice right on the card instead of always showing both buttons, and trade-up cards are picked by tapping the card itself.",
      "Deck: the options (Auto-fill, Clear, Share/Load code) and filters are now tucked behind two small buttons instead of always sitting on screen, so the card list isn't crowded out.",
      "What's New is now a compact timeline: only the newest update is expanded by default, and older ones tap open instead of filling the whole screen with text.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.42.0',
    title: "Smarter offline updates",
    changes: [
      "Under the hood: the offline/installable version of the game now figures out which files to save for offline play by reading the page itself, instead of a hand-kept list - no visible change, just fewer chances for a new file to be missed.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.41.0',
    title: "Card-art groundwork",
    changes: [
      "Under the hood: cards can now optionally carry real artwork alongside their emoji, everywhere a card's icon is shown (hand, battle, collection, packs, rewards). No visible change yet - every card still shows its emoji until we start dropping in art.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.40.0',
    title: "Fix duplicate neighbors, add a Profile and opt-in notifications",
    changes: [
      "Fixed a bug where a neighbor (most visibly Rook and the district boss) could briefly appear twice, side by side. Sorry about that!",
      "New Profile section in the player menu: a glance at your level, wins, cards, foils, milestones, friendships, cellar record and steps, all in one place.",
      "New opt-in setting: turn on Notify Me to get a notification when bread finishes baking or the district boss returns, even if you've stepped away from the tab. Off by default.",
      "New opt-in Who's Playing glance, also in the player menu - see the other testers' names, levels and last-seen time if they've chosen to share it too. Not a leaderboard, just a friendly \"who's around.\"",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.39.0',
    title: "Redesigned mailbox",
    changes: [
      "The mailbox is now a proper inbox: each letter is a card you tap to expand right in place, instead of reading it in a separate line up top. Letters with a gift still waiting float to the top, unread ones show a dot, and you can now delete letters you don't need to keep (gifts have to be claimed first, so nothing gets lost by accident).",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.38.0',
    title: "Fix cut-off mail and scene text",
    changes: [
      "A longer letter, request or event description could get visually cut off and overlapped by the buttons below it (worst in the mailbox with several letters listed). That screen now always gives the text its full height and scrolls instead.",
    ],
  },
  {
    date: '2026-09-29',
    version: '1.37.0',
    title: "Hide and Seek moves into town",
    changes: [
      "Hide and Seek is no longer a pop-up screen - it now plays out right on the town map. Your companion actually ducks behind a real spot nearby (a bush, a bench, whatever's around) while the rest of the town keeps going around you, and you tap the real tile from memory instead of picking from a little grid of icons.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.36.0',
    title: "Hide and Seek with your companion, easier-to-claim rewards",
    changes: [
      "New mini-game: tap your companion in town any time to play Hide and Seek. It ducks behind something nearby, and you tap where it's hiding from memory - rounds get quicker and add more hiding spots the longer your streak runs. Counts toward the usual mini-game quests and medals.",
      "Dailies and Weekly now sort quests that are ready to claim to the top, so you never have to scroll past in-progress ones to find the Claim button.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.35.0',
    title: "More smoothness, bigger tap targets",
    changes: [
      "Neighbors and drifting spirits should no longer visibly snap or flicker in place - the same underlying smoothness fix from last update, extended to them.",
      "Several small icon buttons (world map, drawing tools, the charm toggle, deleting a note) are now easier to tap accurately, especially with bigger fingers or on the move.",
      "Assorted small robustness fixes under the hood.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.34.0',
    title: "Fix a walking screen flash",
    changes: [
      "Fixed a brief visual glitch some players could see while walking - a flash of a slightly different scene (camera/neighbors shifted) for a fraction of a second. It happened when the game's regular background check landed in the middle of a walking step and cut the smooth camera glide short. Walking should look consistently smooth now.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.33.0',
    title: "Fix audio pumping",
    changes: [
      "The last audio pass wasn't enough - the master limiter was configured as an always-on compressor rather than a peak safety net, which caused audible pumping/ducking every time a new music voice or sound effect played. It now stays fully out of the way until something actually risks clipping.",
      "Also shortened the reverb tail, which was smearing notes into each other and adding unnecessary CPU load.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.32.0',
    title: "Clearer ambience, smoother performance",
    changes: [
      "The background music and weather ambience are noticeably clearer now - they were being over-filtered and over-reverbed, which made them sound muffled. Still calm, just less dull.",
      "Smoothed out some behind-the-scenes performance rough edges (how often the game saves, how it tracks wandering neighbors and spirits) - shouldn't be noticeable, just steadier on older phones.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.31.0',
    title: "Faster updates",
    changes: [
      "The game now checks for updates whenever you reopen it, instead of waiting for the browser to notice on its own - a banner offers to refresh when a new version is ready.",
      "Fixes home-screen shortcuts (Android \"Add to Home Screen\") sometimes staying stuck on an old version even after clearing the app's cache.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.30.0',
    title: "Quieter weather",
    changes: [
      "Rain, storms, fog and cloudy hums are all noticeably quieter now - meant to sit faintly under the music, not compete with it.",
      "Thunder cracks softer too.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.29.0',
    title: "Weather and seasons",
    changes: [
      "Fog is redone: soft drifting cloud banks instead of one flat grey band, closer to what actual mist looks like from above.",
      "Weather now fades in and out more gradually instead of snapping to the new look.",
      "Snow is winter-only from now on - no more the odd snowy day in spring or summer.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.28.0',
    title: "A place for your things",
    changes: [
      "New: Inventory. Tap your avatar → 🎒 View Inventory to see everything you're carrying - pantry ingredients, cooked dishes, seeds and spare decorations - in one list instead of hunting through buildings.",
      "Plant a seed or place a decoration straight from the Inventory list.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.27.0',
    title: "A tidier Shop",
    changes: [
      "Shop > Items now shows how many decorations you've collected at a glance.",
      "Filter the shop by Plants, Seating, Lighting or Ornaments instead of scrolling one long list.",
      "Museum-only decorations you haven't earned yet now show up as a locked trophy, with which wing unlocks them.",
      "Night-only decorations are visible in the shop any time of day, clearly marked as sold after dark instead of just vanishing from the list.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.26.0',
    title: "A better day of fishing",
    changes: [
      "The fishing spot now tells you what's actually biting right now - night fish, weather fish, or whatever's local to that shore - instead of leaving you to guess.",
      "Fish long enough without a legendary catch and the Starlight Koi stops being a lottery ticket: the next bite is guaranteed to be one.",
      "Every so often a catch turns out to be a big one - a little flourish and some bonus Pebbles.",
      "The Fish page now says outright what completing it earns you: the Master Angler title.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.25.0',
    title: "Fixed real rain and snow glitching",
    changes: [
      "Found the actual cause of the flashing/tearing some players saw during rain or snow: those effects were animating a layout property on dozens of elements at once every frame, which is heavy enough to make some phones drop or tear a frame. They're now driven by GPU-friendly transforms instead, which should be far smoother.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.24.0',
    title: "Softer rain",
    changes: [
      "Turned down the rain: the falling streaks were bright and long enough to look like screen glitches rather than rain, especially at night. They're now thinner, softer, and more numerous, so a rainy day reads as rain instead of static.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.23.0',
    title: "Fixed the storm lightning getting stuck",
    changes: [
      "Found it: the storm lightning flash could keep firing every few seconds even outside a storm, on some phones, because its animation wasn't being fully stopped when the weather changed away from storm. It's now switched on and off directly, so it can't get stuck anymore.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.22.0',
    title: "Fixed a screen flash after the last weather update",
    changes: [
      "Fixed an intermittent screen flash some players saw every few seconds, regardless of weather - a mobile GPU rendering quirk from the new cloudy-day effect, and unnecessary repeated redraws of the weather layer.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.21.0',
    title: "Weather, front and centre",
    changes: [
      "Tap the sky badge (top right) for the full picture in one place: time, weather and its effect, season, today's event and the forecast.",
      "Clear skies now do something too: daily tasks around town pay a little extra Pebbles.",
      "Clear and cloudy days now get their own gentle visual touch - drifting sunbeams and soft cloud-shadows - joining the rain, fog, snow and storm effects already there.",
      "Two new quests: catch a fish while it's raining, and find a hidden card in the fog.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.20.0',
    title: "The water moves, and a nicer feedback screen",
    changes: [
      "Fishing spots now drift to new places on the water every so often, instead of sitting in the same spots forever.",
      "Feedback and Report a bug now open a proper screen with a real text box, instead of a plain browser pop-up.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.19.0',
    title: "My Cards, tuned up for mobile",
    changes: [
      "Bigger, colour-coded filter chips in My Cards and the Deck tab - each rarity now has its own colour, with real tap targets instead of tiny text.",
      "Sort now opens a proper \"Sort by\" screen instead of a plain browser dropdown.",
      "Filter chips now scroll sideways instead of wrapping onto a second line.",
    ],
  },
  {
    date: '2026-09-28',
    version: '1.18.0',
    title: "A nicer cloud save screen",
    changes: [
      "Back up your save and Restore a save now open a proper screen instead of plain browser pop-ups, with a password field that actually hides what you type.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.17.0',
    title: "Cloud save",
    changes: [
      "Your progress now backs up automatically in the background - no account needed, nothing to set up.",
      "Settings → Back up your save: link an email so you can restore your progress on another device or browser with Settings → Restore a save.",
    ],
  },
  {
    date: '2026-09-27',
    version: '1.16.0',
    title: "Play offline",
    changes: [
      "Tile RPG can now be installed (look for \"Add to Home Screen\" or your browser's install icon) and works fully offline once you've loaded it a first time - no connection needed to walk around town, battle or open packs.",
    ],
  },
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
// Which entries are expanded, keyed by version - a compact vertical timeline of collapsed tiles reads far
// better than 40+ entries all fully expanded at once. The newest entry opens by default (that's the point
// of "What's New"); everything older starts collapsed and expands in place on tap, same idiom as the
// mailbox's mail-item/mail-body (see renderMailList in houses-and-cellar.js).
let clOpen = null;
function renderChangelog() {
  if (!clOpen) { clOpen = {}; if (CHANGELOG[0]) clOpen[CHANGELOG[0].version] = true; }
  const listEl = document.getElementById('changelogList');
  listEl.innerHTML = '';
  const versionLine = document.getElementById('clVersionLine');
  if (versionLine) versionLine.textContent = 'You\'re on ' + gameVersionLabel();
  CHANGELOG.forEach(entry => {
    const open = !!clOpen[entry.version];
    const el = document.createElement('div');
    el.className = 'cl-entry' + (open ? ' open' : '');
    el.dataset.toggleCl = entry.version;
    el.innerHTML = `<div class="cl-head">
        <span class="cl-dot"></span>
        <span class="cl-v">v${entry.version}</span>
        <span class="cl-title">${escapeHtml(entry.title)}</span>
        <span class="cl-date">${fmtChangelogDate(entry.date)}</span>
        <span class="cl-chevron">${open ? '▲' : '▼'}</span>
      </div>
      ${open ? `<ul class="cl-list">${entry.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}`;
    listEl.appendChild(el);
  });
  listEl.querySelectorAll('[data-toggle-cl]').forEach(el => el.addEventListener('click', () => {
    const v = el.dataset.toggleCl;
    sfx('flip');
    clOpen[v] = !clOpen[v];
    renderChangelog();
  }));
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

