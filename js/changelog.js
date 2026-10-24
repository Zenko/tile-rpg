/* ---------------- releases: "Version 1 Beta" ----------------
   Players read about BETA UPDATES, all labelled just "Beta" (n is only the internal order; the build number is the exact version). A Beta update bundles everything since the previous one into one
   note with three short sections (new / better / fixed). It is cut on purpose - when the owner asks, or a batch is worth
   announcing - not on every publish. Between releases, finished player-facing changes are logged as bullets in
   PENDING_CHANGES (below; nobody sees it in-game). To cut a release: write the polished note at the TOP of RELEASES from
   those bullets (n = previous n + 1, today's date), then empty PENDING_CHANGES. The Journal dot / ? badge fire only for a
   new release. js/build.js holds BUILD, bumped on every publish, which is what the service worker and bug reports use.
   The 90 per-change notes from before the Beta live on as CHANGELOG_ARCHIVE, shown collapsed under "Before Beta". */
function fmtChangelogDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function gameVersionLabel() {
  const latest = RELEASES[0];
  return latest ? `Beta · ${fmtChangelogDate(latest.date)}` : '';
}
// For bug reports and the Settings menu: the Beta update plus the exact build.
function gameBuildLabel() { return RELEASES[0] ? `Beta (build ${BUILD})` : `build ${BUILD}`; }

// Bullets waiting for the next Beta update. tag: 'new' | 'better' | 'fixed'.
const PENDING_CHANGES = [
  { t: 'new', x: 'Every card you get from a portal, a puddle world or a boss you beat is now Reborn: the shimmering version, every time. Other new cards can still turn out Reborn now and then.' },
  { t: 'better', x: 'Messages at the bottom of the screen stay a little longer (3 seconds, more for long ones), so there is time to read them.' },
  { t: 'fixed', x: 'Tapping a fish you can see in the water opens fishing again. The fish moved every ten minutes but the drawings stayed put, so a tap often landed on plain water.' },
  { t: 'fixed', x: 'Skipping stones on the water no longer gives XP on every tap: it counts at most once every few seconds.' },
  { t: 'better', x: 'A new home is even smaller: a snug 3 by 3 nook with the door in the middle, just room for the armchair and the mailbox. Level 2 opens it up to 6 by 6.' },
  { t: 'better', x: 'The spirit perch, the Reborn mantel and the collector\'s cabinet open full screen like the rest of your home: pick a spirit to rest on the perch, put Reborn spirits up on the mantel, and see every card set\'s progress in the cabinet. A visiting spirit greets you on a screen of its own too.' },
  { t: 'better', x: 'Tidy Up has a full screen of its own in your home: drag each thing from the messy floor to the wardrobe, bookshelf or kitchen (or tap one). Things fly into place, wrong ones shake back, and right answers in a row build a combo. Same 20 seconds, medals and prizes as before.' },
  { t: 'new', x: 'Your home starts small: a bare little nook with a mailbox and an armchair. It grows as you level it up, and new pieces arrive as it does (a bonsai, shelves and frames, then a sand garden, trophy case and toy basket, then the altar, sooner once you beat a district god).' },
  { t: 'new', x: 'Walk up to anything in your home and it opens straight away, full screen. No more menu with one button in it.' },
  { t: 'new', x: 'The mailbox: break the seal on each letter, unwrap gifts, write back to friends (a friendship point) and collect a stamp from every sender.' },
  { t: 'new', x: 'The bonsai: hold to water it into the green band and snip the three stray shoots that grow each day. Tend it on days in a row for a little extra, and once it is a young tree it flowers every day.' },
  { t: 'new', x: 'The sand garden: three rakes, stones and shells, and three leaves blow onto the sand each day. Rake them away for a little something.' },
  { t: 'new', x: 'The armchair: close your eyes and catch the dreams that drift up. A good catch pays a little more for the nap.' },
  { t: 'new', x: 'Manage your home (bottom right in your home): level, cosiness, stats, what is still on the way, upgrades, colours and the furniture shop, all in one place. Decorate the room from there.' },
  { t: 'better', x: 'The shelves, framed cards, trophy case and altar are full screens of their own. Two decorations of a kind on a shelf make a pair, framed cards draw spirits of their family, and the trophy case shows what is still to win.' },
  { t: 'fixed', x: 'The Settings window now slides down from the top when you open it and slides back up when you close it, at the same speed and feel as the main menu windows, with its rows rising in one after another. Before, it just appeared and vanished.' },
  { t: 'new', x: 'Settings is reorganised and has new things in it. A search box and jump chips find any setting fast. Neighbours and Battles are now one Gameplay group, Privacy is separate from Notifications, and Start over lives in its own Danger zone. Every privacy switch now says exactly what is sent and who sees it.' },
  { t: 'new', x: 'New settings: Text size (Normal, Large, Largest, with a sample line), Screen animations (Full or Reduced), Haptic strength (Gentle, Normal, Strong, and you feel a sample when you pick), Quiet hours for notifications (anything due in that window waits until it ends), and Reset settings, which puts every switch back to how it started without touching your game. The colour theme buttons show each theme in its own colours.' },
  { t: 'better', x: 'The full-screen bakery, stalls, museum, card shop and altar now come in and go out smoothly: the screen fades up with its parts following one after another, fades down when you press Leave, and slides between its own views (a wing, a game, the mirror). Opening a card pack fades out too. With reduced motion on, they just appear.' },
  { t: 'better', x: 'Settings no longer has the Talking to neighbours choice. Neighbours always show the close-up screen now.' },
  { t: 'new', x: 'The Card Shop mirror is a dressing room. Your character stands in a mirror with your backdrop and table mat, and tapping any look, accessory, colour, border, backdrop or mat tries it on without changing anything. One button then wears it, or buys it first. If you cannot afford it, the button says how much more you need.' },
  { t: 'new', x: 'The Card Shop\'s sleeves and decorations are full-screen now. On the sleeve wall, swipe the big card sideways (or use the arrows) to look through your sleeves; it tilts under your finger, and one button wears it or buys it first. On the decoration shelf, tap a tile to see it, then Buy it or Place one you own. A Yours tab lists what is in storage and what you have placed, with Place, Move, Store and Remove.' },
  { t: 'new', x: 'Opening a card pack is something you do now. Buy one in the Card Shop and the foil pack is held up on its own: swipe across the top to tear the strip off (or tap it three times). Nothing is charged until it rips, and Put it back leaves you with your money. Then the card appears face down, as before.' },
  { t: 'new', x: 'The Card Shop is a shop front now, full screen. Four display cases show what is inside: the pack rack with the cheapest price, the sleeve wall with the sleeve you are wearing, the mirror with your character, and the decoration shelf. Tap one to look inside, and Back returns you to the front.' },
  { t: 'new', x: 'The Hall of Spirits is a full-screen gallery. Five wing doors show how far along each wing is, with a glowing number for spares you can donate. Inside a wing, every card has its own plinth: drag a spare from the tray onto its plinth to place it (or tap the card, then the plinth), or press Donate all. A card on the wrong plinth hops back, and a finished wing glows gold. Prizes are the same as before.' },
  { t: 'better', x: 'The new full-screen bakery and market stalls all leave the same way as the other screens: a Leave button at the bottom, instead of an X at the top.' },
  { t: 'new', x: 'The Grain Stall is full screen. Take your free sample by scooping from the sack and pouring it into your hand (drag the scoop, or tap scoop, sack, hand). Catch the Grain is played right at the stall: drag your finger across the board and the basket follows it, and the grain falls smoothly. Prizes and medals are unchanged.' },
  { t: 'new', x: 'Tock\'s Tinker Stall is a full-screen workshop. The bait crates sit on a shelf with their prices: tap one to buy it and it drops into your tackle box. Sort the day\'s spare parts by dragging each into its bin (cogs, screws, springs), or tap a part and then its bin. Fix the Clockwork is played right there too: the gears slide and turn into place.' },
  { t: 'new', x: 'Clover\'s Thread Stall is a full-screen stall. Tap the ribbons on the line to hear what Clover whispers about each one. Tap the coat to have Clover measure up your deck. Sweep your finger over the scraps in the remnant basket to dig through it (the good one is still there once). Stitch the Pattern is played right at the stall: watch the squares, then press them from memory.' },
  { t: 'new', x: 'Saffron\'s Spice Stall is a full-screen market stall. Today\'s deal sits on the counter: drag your purse onto it to pay (or press Buy). Tap the hanging jars to open them and hear what Saffron says about each spice. Higher or Lower is played right at the stall: drag the open jar up for higher or down for lower, and tap the coin pile to take the pot. Prizes and medals are the same as before.' },
  { t: 'new', x: 'Maple\'s Bakery is a kitchen you work in now, full screen. Baking a loaf is hands-on: rub the dough to knead it, swipe three cuts across the loaf, then drag it up into the oven. The oven glows and the loaf rises in its window while it bakes (still in real time). When it is ready the door opens and you drag the fresh loaf into your basket. Cook, Cake Toppings and the daily warm roll are three spots around the kitchen. Every step also works with a plain tap.' },
  { t: 'better', x: 'The neighbour screen in the light theme: the name and hearts are light and easy to read over the town, and Leave is a proper solid button. The little smiley beside a close friend is gone, since the hearts already say it.' },
  { t: 'fixed', x: 'After you beat a neighbour, only their grave is left. Before, another neighbour could turn up in the same drawn look right next to it, so it seemed the beaten one was still standing there.' },
  { t: 'new', x: 'The cellar is a world now. Tap its door and you walk down into a dark place of your own: every floor is a map of rooms and corridors, you carry a lantern and only see a little way, and the floor remembers what you have found. Look for the stairs down. Creatures stand in the rooms (walk up and tap one for a match), a guardian stands on the stairs every few floors, and barrels, keys, chests, campfires, shrines and a peddler are tucked away. Tap the candle at the top for your run, or walk onto the stairs up to leave; your run waits.' },
  { t: 'fixed', x: 'A card\'s detail sheet has the round X in its top right, and its cost bubble is no longer cut off at the top. The way out of a maze world now glows above the dark, and when it is off screen an arrow on the edge points to it. The locked companion button says "make it your companion" instead of "walk with it".' },
  { t: 'new', x: 'Lucky swaps. Every trade has a chance to double its XP and Embers (10% to start). The Merchant path skill adds 3% a rank, and a companion helps too: 4% for each bond level, and 8% more if it carries Sting or Kin.' },
  { t: 'better', x: 'Your Deck page shows whole cards, with their name and stats, like My Cards. On card tiles the attack and health numbers keep their icons the same size, and the "in deck" label no longer covers them. The cost bubble on a card\'s detail sheet is no longer cut off at the top.' },
  { t: 'better', x: 'The trade table shows the whole card on both sides. Prop messages (a bench, a sign) and the new-card popup close with the round X instead of a button. On the neighbour screen the name and hearts sit above their head, bigger, and the words have more room. A keyword badge on a card is now the same size as the cost bubble above it.' },
  { t: 'fixed', x: 'Tapping a card to trade no longer throws you back to the neighbour screen. You stay on Trade and pick what to give.' },
  { t: 'new', x: 'Trading is a little game now. Climb Trader ranks (Newcomer, Swapper, Dealer, Merchant, Tycoon) for +10% on every swap per rank, swap two cards of the same family for a +50% Family match, and make three swaps in a day for a bonus.' },
  { t: 'new', x: 'A proper trade table. Pick a card to take and a spare to give and a window shows both cards side by side with their families, what the swap pays, and a two-step handshake: you shake on it, then they do, and only then do the cards change hands. Every trade now pays XP and Embers (more for rarer cards, and a little extra when it is their favourite).' },
  { t: 'better', x: 'The neighbour screen is tidier: the picture is a little smaller, their name and hearts sit just above what they say, the memory pill at the top is gone, and a favour\'s Happy to help is the first thing in Chat.' },
  { t: 'better', x: 'One look for buttons everywhere. Every card, window and menu closes with the same round X in the top right (the welcome sign, the weather card and the world map now match the main menu). Screens that take over the whole display (a neighbour, a building, the fountain) leave with a plain Leave button at the foot instead, and the action buttons are one size, with a filled pill for the main choice and an outline pill for Not now, Later and Cancel.' },
  { t: 'new', x: 'When a neighbour has something to say to you, they say it first. Tap them and a message card opens over the screen with Accept and Not now (or Hand it in and Later when you have finished their favour). It only shows when you tap that neighbour yourself.' },
  { t: 'fixed', x: 'On the neighbour screen the words no longer sit on top of their face. The picture is above and what they say is in its own panel underneath.' },
  { t: 'new', x: 'The top bar is about you, the bottom bar is about where you are. Up top: your level, XP, cards and Embers. Below: the place, the time and the weather in town, and what each screen is (with one line about it) when a window is open.' },
  { t: 'new', x: 'The welcome sign has a new look. The weather right now gets its own card, what is coming next is one slim line, and today\'s event, the town goal (with a progress bar), the Gazette and the town mood follow underneath in tighter rows. The title and the Continue button stay in place while the rows scroll.' },
  { t: 'fixed', x: 'The town map now runs all the way to the bottom of the screen, with the menu bar floating on top of it, instead of stopping short and leaving an empty strip.' },
  { t: 'new', x: 'A new way to talk to neighbours. Tap someone and you get a close-up of their face with what they say as large subtitles, a line about what they remember about you, a Friendly match button under your thumb, and a dock of Chat, Play, Gift and Trade. A list opens as a card above the dock; tap the same icon or the neighbour to put it away. In Settings, Neighbours, Talking to neighbours you can pick Dock (the same dock with the whole neighbour in view) or Classic (the grid of cards from before).' },
  { t: 'new', x: 'Every card is full art now. The picture fills the whole card behind the name panel, on a backdrop that matches its family, everywhere a card shows: the board, your hand, My Cards, decks, the Card Details popup. The art stays inside the card; only the cost bubble and keyword badges sit over the edge.' },
  { t: 'new', x: 'Forty-five cards you cannot find on the map. A portal hides its own card in the world behind it (one for each family), every kind of puddle world sends you home with a keepsake the first time you do well in it, the deep cellar guardians drop three more, the Daily Rift pays two, and the hardest milestones (200 wins, 10,000 steps, every fish, 90% of the Index and more) each pay a card nobody else has. The Index tells you where an unseen one comes from.' },
  { t: 'new', x: 'Every boss has cards of its own and plays them. Each district boss fields two super rare cards and a mythic that nobody else carries, a Depth fight brings more of them the deeper you go, and the deep cellar guardians play the cards they drop.' },
  { t: 'new', x: 'Trade with your neighbours. Tap anyone and pick Trade: they show three cards they would part with today, and you pay with a spare copy of the same rarity or better. A card with their favourite keyword makes them happiest. Bosses trade too, but only after you have beaten them, and only their own super rare and mythic cards, for a spare super rare or better, once a day.' },
  { t: 'new', x: 'Depth, a second lap. Once you have beaten all four district bosses and reached level 15, the Journal\'s Battles page opens Depth: each district\'s boss again, five Depths deep. A deeper boss starts with more Calm and brings a better deck, and from Depth 2 each district adds a rule to the match (Watch cards tougher, Bloom cards stronger and so on). The first win of each Depth pays Embers, Starlight and a rare card; beating one again pays a few Embers.' },
  { t: 'new', x: 'The rod, watering can and lantern get a fourth tier, the Dream rod, Dew-glass can and Dream lantern, which need a Depth cleared in the harbour, the garden and the market. And there are three new achievements and titles for diving: Diver, Deep Dreamer and Bottomless.' },
  { t: 'new', x: 'A bigger Path. Six new skill branches (Baker, Player, Merchant, Caretaker, Tactician and Stargazer) join Angler, Gardener, Duelist and Wanderer, so there is far more to spend skill points on. Every branch now has two Mastery ranks after rank 5: they cost 2 points each and add a new effect (a fish pays Embers, a card starts with extra health, packs cost even less and so on).' },
  { t: 'new', x: 'Five new pieces of gear to upgrade with Embers, three tiers each: the Bread peel, the Basket, the Card case, Walking boots and the Star-glass.' },
  { t: 'new', x: 'Save to a file. Settings, Your save now has "Save to file" and "Load from file": keep a copy of your game on your device, or move it to another browser, with no account or connection. Loading asks first and keeps a copy of the game it replaces.' },
  { t: 'better', x: 'Haze and Briar cards were the weakest to build around, so a few got sturdier: Folding Screen hits for 4, Hollow Log and Bramble have 1 more health, and the Evergreen Sentry has 5 health.' },
  { t: 'better', x: 'Updates download less. When a new version comes out, the game now fetches only the files that changed instead of everything again, and the player pictures moved out of the main script into small image files, so the first load is about 300 KB lighter and the town shows sooner.' },
  { t: 'better', x: 'Easier on a phone. Small buttons now have a 44px area for your thumb without looking any bigger: the Embers pill, the Cards, Journal and Character tabs, the round battle buttons, Release and Make a wish, the pin stars. You can also pinch to zoom the menus now, and the smallest labels (the bottom tabs, the level badge, the clock, town name tags, pack descriptions) are no longer under 11px.' },
  { t: 'better', x: 'Battles on a short phone: the line of effects under the board (weather, the weekly rule, home turf, your passive) folds into its first effect and a "+N" you can tap to open, which gives the board about 60px back. In a crowded hand every card now shows its health as well as its power, stacked when there are six or seven.' },
  { t: 'new', x: 'Your companion cheers you on in battle. From bond 2 (Trusted) a third button sits next to your Gift and your Fate: once per match, from your turn 3 or later, your companion does something small and useful for free. What it does comes from its main perk (a Bounty companion strikes the weakest enemy card, a Hearth companion puts the strongest to sleep, a Spirit companion restores Calm and so on), and at bond 3 (Inseparable) it is a step stronger. The Companion page says what yours does.' },
  { t: 'new', x: 'Companions now bring you something. From bond 2 (Trusted) your companion has a gift for you once a day: a few Embers, a little XP and now and then a common card. Open the Companion page and tap "See what they brought".' },
  { t: 'new', x: 'Companions remember. Once you have walked together a few days, won a few matches or caught a few fish, they say so in their chat, and the Companion page shows what they remember for days, wins and catches.' },
  { t: 'better', x: 'Cards with Sting, Kin or Lull used to give a companion nothing but plain XP. Now Sting gives +1 Ember for every match you win, Kin gives +1 Ember for every mini-game medal, and Lull makes bread bake 20% faster. Each grows with the bond.' },
  { t: 'new', x: 'The Hall of Spirits is open in Market Row. Give it spare copies of cards and each one takes a place in its wing: one wing for every family (Brote, Recuerdo, Deriva, Susurro) and a Wing of Lullabies for spells, eight cards each, from everyday commons up to a mythic. It never takes your last copy or one your deck uses. A finished wing pays 60 Embers and 10 Starlight and gives you a keepsake for your home: a planter, an urn, a shell lamp, a wind chime and a lullaby scroll.' },
  { t: 'new', x: 'Eleven new weekly rules. The rule that bends every match for a week now rotates through 17: a week for each family (Brote, Recuerdo, Deriva, Susurro) and one for each keyword that was too quiet (Briar, Chorus, Sip, Lull, Kin, Sting and Echo), on top of the old six. It is the same for both sides, so it is a reason to build a different deck that week.' },
  { t: 'better', x: 'Gale Week was far too strong for Flicker decks (they won about nine in ten games), so it now boosts only Flicker cards that cost 2 or less. Wall Week now gives cheap Haze cards +1 power instead of +1 health, which barely did anything.' },
  { t: 'better', x: 'Rest cards now restore 2 Calm at the end of your turn (it was 1), and Chorus gives your other cards +2 power when played (it was +1). Both were the weakest keywords in play. Bloom cards (Blossom, Dandelion Wish, Blossom Drift, Moonrain Lily) hit a little harder, and Dusk Moth, Parade Balloon and Market Sparrow got a point of power so the Wind family keeps up with Stone.' },
  { t: 'better', x: 'Wind and Stone are now much closer: in the battle report Wind decks win about half their games against a mix of decks, where before they trailed Stone by 15 points.' },
  { t: 'fixed', x: 'The Suggest deck button no longer puts a family spell (Wild Growth, Hold Fast, Gathering Storm...) into a deck that has no cards of that family to power it, and a deck built around one family now brings its own spell.' },
  { t: 'new', x: 'Starlight and wishes: when a pack gives you a card you already own, you keep it and it also pays Starlight (as much as releasing it would pay in Embers). Spend Starlight in the Shop on a wish: pick any card you can get from packs and it is yours. Rarer cards cost more, so a long unlucky streak always ends somewhere.' },
  { t: 'new', x: 'Twelve new cards for the thinner keywords (Briar, Chorus, Sip, Sting and Lull) across all four families, and five new spells that grow stronger the more of their family you have out: Wild Growth, Hold Fast, Tidepool, Gathering Storm and Last Light.' },
  { t: 'better', x: 'Rarer cards now feel rarer. Rare, ultra, super and mythic cards were no stronger in play than commons, so their numbers have been raised where they lagged, and a few over-strong cards (Moon Jelly, Paper Boat, the cheap Flicker commons) were brought down.' },
  { t: 'better', x: 'Watch cards were the weakest family of cards in every rarity; their health and power have been raised, and a rare is never worse than a common you could have found instead.' },
  { t: 'better', x: 'Most spells were too weak to be worth a slot, so several are cheaper or stronger (Harvest, Picnic, Rain Shower, Stone Skin, Undertow, Thunderclap, Quickstep).' },
  { t: 'better', x: 'Cards that shared a picture now have their own: Flint, Overgrowth, Moonlit Tide, Second Wind, Gust, Undertow, Picnic, Forgotten Wyrm and a silver Whisper Fox.' },
  { t: 'fixed', x: 'Near the edge of a district, a portal that opened "out of sight" could actually be on screen while the compass still pointed at it. Out of sight now means truly off screen.' },
  { t: 'better', x: 'Trade up now looks like Refine: the three slots and the result in one panel, the rarity to trade right under them, then the button and the odds. The cards to pick are listed below.' },
  { t: 'better', x: 'A tidier Workshop: the Refine button now sits right under the Power / Health choice, with just the skill and fail chances and one row for your streak and fail meter beneath it. The full odds table and how the forge works fold away under "How the odds work".' },
  { t: 'better', x: 'Portals can now open anywhere in town, not just beside you. When one opens the screen ripples in its colours with a deep whoomph, and an arrow at the edge of the map points the way until you find it.' },
  { t: 'new', x: 'Portal stones: in the Workshop\'s new Portal page, feed spare rare cards (or better) into the rift. Once it is fully charged, ignite it at the forge for a chance of a portal stone - overcharge it or strike the iron well for a better chance. The rift takes on the family that fed it most. Open a stone from the Workshop or your Pantry and its portal appears right beside you.' },
  { t: 'new', x: 'The forge: refining and trading up now ask you to strike the iron yourself. Tap when the spark is in the glow, three times - a Flawless forge means fewer fails and more skills. Rarer cards have a narrower glow. Skip it any time for the plain chances.' },
  { t: 'new', x: 'Hot streak: every craft that works heats the forge, and a crack cools it. Five in a row and your next craft is a Masterwork: it cannot crack and is twice as likely to gain a skill.' },
  { t: 'better', x: 'Puddles in the rain are a way into a puddle world half the time now (it used to be about one in seven).' },
  { t: 'better', x: 'Crafting odds now follow rarity: commoner cards gain a skill more often and crack less, rarer cards risk more. The Workshop shows the skill and fail chance for every rarity, with the one you are crafting lit up.' },
  { t: 'new', x: 'Sketchbook worlds: a puddle or a portal can drop you onto an unfinished page. Each sketch stone asks for a shape - a full moon, a star, a wave - and shows it for a moment; then draw it from memory in one stroke. The better your drawing, the more stars, and every drawing you get right brings the colour back and stays on the page.' },
  { t: 'better', x: 'Cards on the ground are spread further apart and come back less often (a minute or more after one is taken). They are mostly commons now, and often the same card again, so doubles for crafting are easier to collect.' },
  { t: 'better', x: 'Crafting earns XP now, with new crafting milestones and quests. A craft can also crack: the cards turn into Embers instead, and a fail meter makes every fail in a row pay more until a craft works.' },
  { t: 'new', x: 'Crafting companions: a companion whose card has Seed halves your crafting fails, adds XP and skill chance, and can make the card come out Reborn.' },
  { t: 'new', x: 'Time-stop worlds: a puddle or a portal can drop you into a moment that has stopped - rain hanging in the air, neighbours frozen mid-step. Time only moves when you do: 45 steps, then it starts again. Gather the glowing motes before it does.' },
  { t: 'new', x: 'The Daily Rift: a gold portal by the fountain, once a day. Everyone gets the same world behind it that day - the same map and the same hidden cards in the same places. One try, four minutes: find every card, as fast as you can, and see how the other testers did in Journal → Rifts.' },
  { t: 'new', x: 'The Rift Map (Journal → Rifts): every puddle world you visit is collected - the kinds of world, their palettes, the shapes and the four family portals - with your recent worlds and what you found in them. Something new pays a few Embers, and a full row leaves you a souvenir to place in town or in your cottage.' },
  { t: 'new', x: 'Portals: now and then a shimmering portal opens a few steps away from you, in any weather. It stays open for about twelve minutes (it flickers when it is about to close). Walk onto it and it always takes you into a puddle world. Every portal belongs to a card family: its colour and icon show which, and its world is that family\'s, with only their cards hidden inside.' },
  { t: 'better', x: 'Falling into a puddle world (through a puddle or a portal) now warps time: the town twists into a spiral, a clock spins its hands backwards and the new world unwinds into place. Coming back out warps too, with time running forward.' },
  { t: 'better', x: 'Behind the scenes: every colour in the game\'s look now comes from one theme file, ready for a future redesign. Nothing changes on screen.' },
  { t: 'better', x: 'Behind the scenes: the game\'s cards, places, dialogue, story and quests now live in their own content files, apart from the code. Nothing changes on screen.' },
  { t: 'better', x: 'Behind the scenes: every name in the game (the town, its places, its people, the Embers) now comes from one settings file, ready for a future redesign. Nothing changes on screen.' },
  { t: 'new', x: 'The Dream Gazette: a new front page every morning, the same story for every dreamer, with today\'s event, the town goal and any visitors underneath. Find it at the top of the Journal\'s Today page.' },
  { t: 'new', x: 'Gossip: neighbours notice what you get up to (a big catch, a harvest, beating the district god, falling through a puddle) and bring it up when you walk over.' },
  { t: 'new', x: 'Weather moments: a change of weather can bring a few special minutes, like a koi run in the moonrain, a star shower in the snow or a rainbow when the rain clears, each with its own small bonus.' },
  { t: 'new', x: 'Town goal: one shared goal a week. You, your neighbours and the other dreamers all count toward it, with a reward at halfway and a card when it is done.' },
  { t: 'new', x: 'Travelling visitors: on most days Moth the Pedlar (three cards for sale) or Quill the Wanderer (a match with a prize) turns up in one district.' },
  { t: 'new', x: 'A new menu. The bar of five tabs at the bottom is now one round button: tap it and Town, Journal, Cards, Rewards and Character fan out around your thumb, and the button turns into a cross to put them away again. Settings, Appearance, Menu hand moves it to the left side if that suits your thumb better.' },
  { t: 'new', x: 'Screens open as a window. Journal, Cards, Rewards and Character slide up as a window over the dimmed town instead of replacing it, and what is inside rises in one row after another. Tap the cross, tap the dimmed town, or press Escape to close it. With motion reduced in your phone settings they simply appear.' },
  { t: 'better', x: 'The place, the time and weather, and your cards and Embers moved to a bar at the bottom, beside the menu button. When a window is open the bar says what it is about (Cards: deck 12/12, Rewards: gift ready), and a thin gold line shows how close the next level is. The pill at the top is just you now.' }
];

const RELEASES = [
  {
    id: 'beta-6', n: 6, date: '2026-10-13', title: 'Weather alerts',
    intro: 'Get a nudge when the weather turns, even while the game is in the background.',
    new: [
      'Weather alerts. A new switch in Settings, under Notify me, sends a notification when the weather turns while the game is in the background ("Moonrain starts to fall" and what it changes). With it on, the weather keeps moving while you are away; with it off, weather still only moves while you play. Like the bread and boss notifications, it cannot wake an app your phone has fully closed.',
    ],
    better: [],
    fixed: [],
  },
  {
    id: 'beta-5', n: 5, date: '2026-10-13', title: 'Three new kinds of puddle world',
    intro: 'A puddle no longer drops you into just one sort of place. Now it might be a maze, a board game or a sunken city.',
    new: [
      'Maze worlds. Find the way out before the timer ends. You only see a few tiles around you, and three neighbours are searching for the exit too. Cards are hidden in the dead ends, and finishing earns Embers and a card, more for coming first.',
      'Board game worlds. A shoots-and-ladders board where the dice are the only way to move: climb ladders, slide down snakes, dodge traps, land on boosts and gifts, and race the neighbours to the flag.',
      'Underwater worlds. Swim through a sunken coral city with fish drifting by, folk who live there (each has a gift card for you) and houses you can peek into.',
    ],
    better: [
      'Puddle worlds never repeat the same kind twice in a row, so each fall into a puddle feels different.',
    ],
    fixed: [],
  },
  {
    id: 'beta-4', n: 4, date: '2026-10-13', title: 'Puddle worlds, neighbours with lives and a home full of spirits',
    intro: 'Splash through a puddle and you might fall into a world of its own. Neighbours have their own days now, your cottage is yours to decorate and fill with spirits, and battles are easier to read.',
    new: [
      'Puddle worlds. When it rains, a puddle you splash through might swallow you and drop you into a small, different world: its own look, layout, hidden cards and spirits. A timer in the top bar counts down a few minutes, and when it runs out the world is gone and you are back where you fell in. Tap the timer to climb out early. Off in Cozy mode.',
      'Neighbours have lives. Each has a daily routine, walks to benches, wells and doorways, shelters from rain, goes home at night, chats and trades gifts with friends, plans their own deck for the weather and season, and remembers your matches, favours and gifts. Now and then one walks over to you with a favour, a chat or a friendly game (Settings has Never, Sometimes or Often).',
      'Journal has a Neighbours page: everyone you have met, with hearts, the score between you, how they play, their favourite family, their routine and who they are closest to, and what they are doing right now. There is also a new kind of favour: carry a message from one neighbour to another.',
      'Opponents have a play style you can learn (Aggressive, Defensive, Tricky or Greedy), ease off a little after a rough patch and push back after a streak (switch it off in Settings), and come back practised after you beat them twice. Rook studies your deck after each duel and swaps in counters, and after a loss your coach gives a kind, specific tip. Chat has Suggest a deck.',
      'Your companion has moods: it dozes at night, shivers in snow, cosies up in rain and plays on clear days, and from bond level 2 points out items close by.',
      'Your cottage is yours to make. Decorate lets you move or put away any piece, buy furniture, pick floor, wall and rug colours and level the home from 1 to 5 with Embers, each level a bigger room with more to place. Cosiness scores how lived-in it feels and earns more Embers for a nap, and the outside of the cottage shows it in town. Sell pieces, undo, flip and drag them to carry.',
      'Spirits live in your home. Your companion wanders the room, perches show your cards as glowing figures, the Collector\'s cabinet lights a medal for each finished set, and the Reborn mantel shows three Reborn cards. Family corners draw spirits of their family, and from home level 3 visiting spirits drop in and leave you a rare card when you welcome them.',
      'The town and your cards have more life: fireflies and embers at night, falling leaves in the colours of the season, water glints, a sparkle trail and bridge ripples (they follow the Character effects switch), light bursting from loot you pick up, and rings, rays and sparks when you open a card, grander for each rarity.'
    ],
    better: [
      'Battles are easier to read. Your hand is a stack of bigger overlapping cards, the cards you can play are raised and outlined, energy shows as bright gold gems, press and hold shows the whole card, a hit card flashes white, and the light theme has stronger contrast.',
      'Talking to a neighbour is now a full screen with big Chat, Play and Gift cards, and building, cottage, mailbox and favourite-card screens have a new look: icon tiles, a clear main action and Close pinned at the bottom.',
      'Journal Theories now keeps what the Atlas has told you. Notes and drawings are paused for now because they were making saves too big; your written notes are still in your save, and saved drawings are cleared out.',
      'If your device cannot store your save, or the cloud backup is refused, the game now tells you instead of quietly stopping.',
      'Lighter on your battery and quicker to start: background checks (weather, mail, the boss clock) pause while the app is hidden and catch up when you return, and the oldest update notes load only when you open them.',
      'The daily town event is paced like a story: it rarely repeats, usually suits something you do, and a Friendship Fair is more likely while you are making friends. Adaptive difficulty changes in smooth steps and neighbour visits are rationed.',
      'A new home starts as a small plain room and grows as you level it, and frames, shelves and the trophy case show what is really in them. Your cottage has real light: flickering lamps and candles, fireplace embers and shafts of dusty light.',
      'Ultra rare and better cards have a smoother, shinier foil, and your character walks a little slower so it is easier to follow.'
    ],
    fixed: [
      'Rain puddles stay on the ground: neighbours, items, crops and your character are drawn over them instead of the other way round.',
      'The Close button on the card sheet works on the first tap, the Watch shield under an enemy card is no longer covered by your hand, and the Done button while decorating no longer floats over Settings.',
      'Neighbour friendships no longer share storage with your companion bonds, so a busy town can never push a companion bond out.'
    ]
  },
  {
    id: 'beta-3', n: 3, date: '2026-10-10', title: 'Drawn characters, candles and a cottage you can walk around',
    intro: 'The biggest round yet: you are drawn now, your cottage is a room, the altar and the Atlas have arrived, and every card has a new look.',
    new: [
      'Your cottage is a room you can walk around. Tap the floor to move and tap the furniture to use it: the mailbox, shelves, framed cards, trophy case, altar, sand garden, bonsai, the basket for Tidy Up and the armchair for a nap. Walk out of the door on the bottom wall to head back out.',
      'Your character is drawn. In town you see her walking, turning to face the way you go. Original, Don and the new Alyn are the first choices under Avatar, and Alyn turns smoothly through every angle. One neighbour in El Umbral is drawn too, as a try-out.',
      'The altar has four candles on a full-screen altar. Drag spare cards onto them and the flames grow with each card\'s rarity. Candles can burn while you explore for Embers, and the Atlas answers at the right candle.',
      'The Atlas and the four spirit gods: two new top rarities, Divine and Atlas. Beat a district god, offer spare cards of their family at the altar and the god is summoned. The Atlas walks with you through every district once summoned.',
      'Anyone can be your companion: any card you own, any neighbour or boss you have met, and Rook. Character → Companion shows their perks and your bond, and you can walk, calm down or spar together.',
      'A new look for every card and most icons, all drawn in one clean gradient style. The rarest cards (every mythic and three of the gods) have full art: a painted scene with a subject that steps out of the frame. Ultra rare and better cards shine with a holo foil you can tilt with your finger.',
      'Wren guides your first hour. A new dreamer starts with a short, skippable drifting-off scene and wakes in El Umbral, and each early goal begins with a few words from her.',
      'Look around the town by dragging the map, and tap the goal bar at the top to have your character walk you to it, even into another district.',
      'The Old Cellar is a Descent Map of dark floors and a lantern, with a choice of doors on every floor. The Calm corner, Tarot readings, Fate and Fate Spread, Trials of the Arcana, family passives and the Weekly Rule all joined the game too.',
      'Settings has an Update game button. If your phone seems stuck on an old version, tap it: it clears the stored files and loads the newest copy without touching your save.'
    ],
    better: [
      'Cards have a new face: a bigger picture, round keyword badges, and the name and numbers on a calm panel. The card list is cut to 95 cards and the four families now play about evenly.',
      'The town draws much more smoothly on your phone, and at night it is lit from lamps, the Lantern Market and every building.',
      'Battle hits and spells have more punch, and a fainted card burns away at the edges.',
      'Dream words everywhere: Embers, Calm, Watch and Flicker, new pack and level names, and Theories in the Journal.',
      'My Cards, the Workshop, Social, Settings, the mailbox and the Town Guide have roomier, redesigned layouts, and Settings is simpler.',
      'Fishing follows the light theme, and every fish swims as a silhouette until it bites.',
      'Sitting on a bench is calmer and keeps you still while the town eases in, and rain makes uneven puddles that hold a little sky.'
    ],
    fixed: [
      'Big hands in battle stay on screen, and full art cards in a sleeve no longer slip below the card.',
      'Card art and icons stay put while an update installs, and the bottom menu no longer slides off the screen after tapping Refresh on Android.',
      'Social no longer fills with copies of the same tester, and you can only see fish in water you can reach.',
      'Water tiles fill the whole tile, and older saves load cleanly after the card cut.'
    ]
  },
  {
    id: 'beta-2', n: 2, date: '2026-10-01', title: 'Cards, Rewards and Character, redone',
    intro: 'Three tabs got a proper tidy-up, based on your feedback on the Journal.',
    new: [
      'Cards: My Cards is now a grid of tiles with family and rarity filters. Tap a card to open its sheet, where you can add it to your deck, refine it, use it as a charm or release a spare.',
      'Deck builder: a 12-slot tray at the top shows your whole deck. Tap a card below to add it, tap one in the tray to remove it, and turn on Info mode to read cards without changing anything.',
      'Rewards: Dailies and Weekly now open with a Claim all button, then Ready, In progress (closest first), a collapsed Not started group, and Claimed at the bottom.',
      'Character: pin up to three stats and they show on your stage under your name.'
    ],
    better: [
      'Character tab: Me now holds your title chips and what unlocks next. Bag is now Pantry, and Milestones live only in Rewards.',
      'Index is now Sets: tap a set to see its cards, with silhouettes for the ones you are missing. Craft is now Workshop, and the Fish log lives in the Journal Almanac.'
    ],
    fixed: [
      'Other players\' emoji and levels in Who\'s Playing can no longer inject anything odd, and a damaged save can\'t carry markup in your name.'
    ]
  },
  {
    id: 'beta-1', n: 1, date: '2026-10-01', title: 'Welcome to the Beta',
    intro: 'Tile RPG is now Version 1 Beta. Updates are bundled, so you get one note every so often instead of one for every small change. Here is everything from the first big round of playtest improvements.',
    new: [
      'Who goes first: every match starts with a coin call or a dice roll-off. The loser goes second and gets an extra card and +1 energy early.',
      'Card families (Stone, Wind, Tide, Grove, one per district) and four new keywords: Seed, Lull, Kin and Sting. Plus 28 new cards, and neighbors and bosses now build decks around their district\'s family.',
      'The world joins the fight: weather, night and each district\'s home turf now change how matches play, for both sides.',
      'Keeper\'s Knack: a free once-per-match power you pick before the match. Six of them, unlocked as you level up.',
      'Draft Runs at the fountain (level 5): build a deck from offers of three, then win four matches in a row.',
      'Ghost duels (level 8): play a match against a ghost of another tester\'s deck from Who\'s Playing.',
      'A new Journal: Today (your daily checklist with Go buttons and a "Since you were away" box), an Almanac of fish, cards, recipes and night critters, a Log grouped by day with filters, and Battles with a trend line, filters and Rematch.',
      'Fish you have not caught yet swim as silhouettes. Land one and its colours are revealed.',
      'Premium things to save for: five decorations, four shimmering avatar rings and three new backdrops.'
    ],
    better: [
      'Battles now follow the light theme and fill the whole screen.',
      'A steadier economy: fishing, crops, the Festival Cup and Draft Runs pay full Embers up to a daily amount, then less. Packs from Brook upward and some seeds cost a bit more. A Ember ledger in Settings shows where yours came from.',
      'New features unlock with your level, with a notice when they do, and a "Coming up" list on the Character tab.',
      'Notes: search, pin favourites, and swipe to delete with an Undo.',
      'The Guide and What\'s new moved behind the ? button. The Guide has search, NEW tags and a "Take me there" button.',
      'Match cards no longer have a coloured left edge.'
    ],
    fixed: [
      'The opponent-only Ember Fox clashed with your collectible Ember Fox and quietly replaced its stats in battle. It is now the Cinder Fox.'
    ]
  }
];

// Which entries are expanded, keyed by version - a compact vertical timeline of collapsed tiles reads far
// better than 40+ entries all fully expanded at once. The newest entry opens by default (that's the point
// of "What's New"); everything older starts collapsed and expands in place on tap, same idiom as the
// mailbox's mail-item/mail-body (see renderMailList in houses-and-cellar.js).
let clOpen = null;
/* ---- What's new (inside the Journal's ? sheet) ----
   The newest Beta updates are listed (open the latest to read it); older ones fold under "Earlier Beta updates", and the old
   per-change notes sit in one collapsed "Before Beta" entry. Each release has an unread dot (state.progress.clRead, keyed by
   release id), cleared by opening it or by "Mark all as read". A save that never opened Updates starts fully read. */
const CL_SHOWN = 3;
let clEarlier = false, clHistory = false;
/* The pre-Beta notes (js/changelog-archive.js, about 56 KB) are not a <script> tag any more: index.html only <link rel=prefetch>es it,
   so it is fetched at idle time and precached for offline, and the first time this screen draws it is added here. Until it
   arrives the "Before Beta" button is simply absent, then the list re-draws. */
let clArchiveLoading = false;
function clArchive() {
  if (typeof CHANGELOG_ARCHIVE !== 'undefined') return CHANGELOG_ARCHIVE;
  if (!clArchiveLoading) {
    clArchiveLoading = true;
    const sc = document.createElement('script'); sc.src = 'js/changelog-archive.js';
    sc.onload = () => { if (typeof renderChangelog === 'function' && document.getElementById('clHistoryBtn') === null) renderChangelog(); };
    sc.onerror = () => { clArchiveLoading = false; };
    document.head.appendChild(sc);
  }
  return null;
}
function clReadMap() {
  const pr = state.progress;
  if (!pr.clRead || typeof pr.clRead !== 'object') {
    pr.clRead = {};
    if (!pr.lastSeenChangelog) RELEASES.forEach(r => { pr.clRead[r.id] = true; });
    saveState();
  }
  return pr.clRead;
}
function clUnreadCount() { const r = clReadMap(); return RELEASES.filter(e => !r[e.id]).length; }
function renderChangelog() {
  if (!clOpen) { clOpen = {}; if (RELEASES[0]) clOpen[RELEASES[0].id] = true; }
  const read = clReadMap(), listEl = document.getElementById('changelogList'), unread = clUnreadCount(), arch = clArchive();
  const versionLine = document.getElementById('clVersionLine');
  if (versionLine) versionLine.textContent = 'You\'re on ' + gameVersionLabel();
  const sec = (label, list) => list && list.length ? `<div class="cl-sec">${label}</div><ul class="cl-list">${list.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : '';
  const release = r => {
    const open = !!clOpen[r.id];
    return `<div class="cl-entry${open ? ' open' : ''}" data-toggle-cl="${r.id}"><div class="cl-head">
        <span class="cl-dot"></span><span class="cl-v">Beta</span><span class="cl-title">${escapeHtml(r.title)}</span>
        ${read[r.id] ? '' : '<i class="jdot" title="Unread"></i>'}<span class="cl-date">${fmtChangelogDate(r.date)}</span><span class="cl-chevron">${open ? '▲' : '▼'}</span></div>
      ${open ? `<div class="cl-body">${r.intro ? `<p class="cl-intro">${escapeHtml(r.intro)}</p>` : ''}${sec('✨ New', r.new)}${sec('🌿 Better', r.better)}${sec('🔧 Fixed', r.fixed)}</div>` : ''}</div>`;
  };
  const old = e => {
    const open = !!clOpen['v' + e.version];
    return `<div class="cl-entry${open ? ' open' : ''}" data-toggle-cl="v${e.version}"><div class="cl-head"><span class="cl-dot"></span><span class="cl-v">v${e.version}</span><span class="cl-title">${escapeHtml(e.title)}</span><span class="cl-date">${fmtChangelogDate(e.date)}</span><span class="cl-chevron">${open ? '▲' : '▼'}</span></div>${open ? `<ul class="cl-list">${e.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}</div>`;
  };
  const shown = RELEASES.slice(0, CL_SHOWN), earlier = RELEASES.slice(CL_SHOWN);
  listEl.innerHTML = `<div class="jgroup-h">Beta updates<small>${unread ? unread + ' unread' : 'all read'}</small></div>` + shown.map(release).join('') +
    (earlier.length ? `<button type="button" class="jchip jearlier" id="clEarlierBtn" aria-expanded="${clEarlier}">${clEarlier ? 'Hide earlier Beta updates' : `Earlier Beta updates · ${earlier.length}`}</button>${clEarlier ? earlier.map(release).join('') : ''}` : '') +
    (arch && arch.length ? `<button type="button" class="jchip jearlier" id="clHistoryBtn" aria-expanded="${clHistory}">${clHistory ? 'Hide history' : `Before Beta · ${arch.length} earlier notes`}</button>${clHistory ? arch.map(old).join('') : ''}` : '') +
    (unread ? '<div class="jmarkall"><button type="button" class="jgo" id="clMarkAll">Mark all as read</button></div>' : '');
  listEl.querySelectorAll('[data-toggle-cl]').forEach(el => el.addEventListener('click', () => {
    const v = el.dataset.toggleCl;
    sfx('flip');
    clOpen[v] = !clOpen[v];
    if (clOpen[v] && !v.startsWith('v')) { clReadMap()[v] = true; saveState(); }
    renderChangelog(); updateJournalBadge();
  }));
  const eb = document.getElementById('clEarlierBtn'); if (eb) eb.addEventListener('click', () => { sfx('nav'); clEarlier = !clEarlier; renderChangelog(); });
  const hb = document.getElementById('clHistoryBtn'); if (hb) hb.addEventListener('click', () => { sfx('nav'); clHistory = !clHistory; renderChangelog(); });
  const ma = document.getElementById('clMarkAll'); if (ma) ma.addEventListener('click', () => { markChangelogSeen(); sfx('claim'); renderChangelog(); });
}
function markChangelogSeen() {
  const pr = state.progress, r = clReadMap();
  RELEASES.forEach(e => { r[e.id] = true; });
  if (RELEASES[0]) pr.lastSeenChangelog = RELEASES[0].date;
  saveState(); updateJournalBadge();
}
// The dot on the Journal tab and the number on the ? button both mean "there are updates you have not read".
function updateJournalBadge() {
  const btn = document.getElementById('tabJournal'), n = clUnreadCount();
  let dot = btn.querySelector('.dot');
  if (n && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!n && dot) dot.remove();
  const b = document.getElementById('journalHelpBadge');
  if (b) { b.textContent = n || ''; b.classList.toggle('hidden', !n); }
}

