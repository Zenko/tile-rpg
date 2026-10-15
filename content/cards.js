/* ============================================================
   CONTENT: CARDS, PACKS AND FATES
   ============================================================
   Every card's name, icon, rarity and numbers, the packs that sell them, the families and the Fates.
   Once real players have saves: APPEND NEW CARDS TO THE END of CARD_POOL only (deck share codes store cards by position)
   and never change a card id (saves use them). Until the launch reset (HANDOFF section 5) both are free, as long as the
   art files and the code that names a card id are updated with it. Names, icons and text can always change. Card pictures: assets/cards/<id>.png (CARD_ART in
   js/data-and-engine.js). Combat numbers are balanced by simulation - see HANDOFF section 5 before changing them.
   ============================================================ */

// ---- used by js/data-and-engine.js ----
const CARD_POOL = [
  { id: 'sprout', name: 'Sprout', icon: '🌱', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['bloom'] },
  { id: 'pebble', name: 'Worry Stone', icon: '🪨', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['guard'] },
  { id: 'droplet', name: 'Droplet', icon: '💧', rarity: 'common', cost: 1, power: 2, grit: 2, kw: ['mend'] },
  { id: 'toadstool', name: 'Toadstool', icon: '🍄', rarity: 'common', cost: 2, power: 3, grit: 3, kw: ['guard'] },
  { id: 'bubble', name: 'Dream Bubble', icon: '🫧', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['shield'] },
  { id: 'flintstone', name: 'Flint', icon: '🔥', rarity: 'common', cost: 2, power: 1, grit: 2, kw: ['swift'] },

  { id: 'blossom', name: 'Blossom', icon: '🌸', rarity: 'rare', cost: 3, power: 5, grit: 4, kw: ['bloom'] },
  { id: 'geode', name: 'Memory Geode', icon: '💎', rarity: 'rare', cost: 3, power: 4, grit: 6, kw: ['guard'] },
  { id: 'tide', name: 'Gentle Wave', icon: '🌊', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['echo'] },
  { id: 'feather', name: 'Drifting Feather', icon: '🪶', rarity: 'rare', cost: 2, power: 1, grit: 2, kw: ['swift'] },

  { id: 'dove', name: 'Letter Dove', icon: '🕊️', rarity: 'ultra', cost: 3, power: 2, grit: 4, kw: ['mend', 'swift'] },
  { id: 'crystal-spire', name: 'Memory Spire', icon: '🔷', rarity: 'ultra', cost: 4, power: 6, grit: 2, kw: ['shield'] },
  { id: 'gale', name: 'Wandering Gale', icon: '🌬️', rarity: 'ultra', cost: 3, power: 4, grit: 1, kw: ['swift'] },
  { id: 'ember-fox', name: 'Dusk Fox', icon: '🦊', rarity: 'ultra', cost: 3, power: 4, grit: 4, kw: ['echo'] },

  { id: 'moonstone', name: 'Moonstone', icon: '🔮', rarity: 'super', cost: 4, power: 5, grit: 7, kw: ['shield'] },

  { id: 'aurora-stag', name: 'Dawn Stag', icon: '🦌', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['bloom'] },
  { id: 'deep-current', name: 'Slow Current', icon: '🐋', rarity: 'mythic', cost: 5, power: 9, grit: 9, kw: ['mend'] },
  { id: 'mountain-heart', name: 'Mountain of Memory', icon: '⛰️', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['guard'] },
  { id: 'origami-crane', name: 'Origami Crane', icon: '🪽', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['swift'] },
  { id: 'rice-cake', name: 'Rice Cake', icon: '🍡', rarity: 'common', cost: 2, power: 3, grit: 3, kw: ['guard'] },
  { id: 'paper-fan', name: 'Paper Fan', icon: '🪭', rarity: 'common', cost: 2, power: 3, grit: 1, kw: ['echo'] },
  { id: 'torii-gate', name: 'Torii Gate', icon: '⛩️', rarity: 'rare', cost: 3, power: 4, grit: 6, kw: ['guard'] },
  { id: 'folding-screen', name: 'Folding Screen', icon: '🎏', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['shield'] },
  { id: 'temple-bell', name: 'Temple Bell', icon: '🔔', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['echo'] },
  { id: 'stone-lantern', name: 'Night Lamp', icon: '🗼', rarity: 'ultra', cost: 3, power: 6, grit: 5, kw: ['guard'] },
  { id: 'koi-ascending', name: 'Koi Ascending', icon: '🐉', rarity: 'rare', cost: 3, power: 3, grit: 5, kw: ['mend'] },
  { id: 'cherry-blossom-storm', name: 'Blossom Drift', icon: '🍃', rarity: 'ultra', cost: 4, power: 7, grit: 6, kw: ['bloom'] },

  { id: 'acorn', name: 'Acorn', icon: '🌰', rarity: 'common', cost: 1, power: 2, grit: 2, kw: ['mend'] },
  { id: 'firefly', name: 'Firefly', icon: '🪲', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['swift'] },

  { id: 'hollow-log', name: 'Hollow Log', icon: '🪵', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['shield'] },
  { id: 'foxglove', name: 'Foxglove', icon: '🌷', rarity: 'rare', cost: 3, power: 3, grit: 5, kw: ['mend'] },
  { id: 'old-kettle', name: 'Old Kettle', icon: '🫖', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['mend'] },

  { id: 'heron', name: 'Sleepwalking Heron', icon: '🦢', rarity: 'ultra', cost: 4, power: 6, grit: 6, kw: ['mend'] },
  { id: 'hedgehog', name: 'Sleepy Hedgehog', icon: '🦔', rarity: 'ultra', cost: 3, power: 6, grit: 5, kw: ['guard'] },
  { id: 'paper-boat', name: 'Paper Boat', icon: '⛵', rarity: 'ultra', cost: 3, power: 3, grit: 3, kw: ['swift', 'echo'] },
  { id: 'glass-float', name: 'Glass Float', icon: '🔵', rarity: 'ultra', cost: 4, power: 6, grit: 5, kw: ['shield'] },
  { id: 'lantern-fish', name: 'Lantern Fish', icon: '🐠', rarity: 'ultra', cost: 3, power: 5, grit: 4, kw: ['echo'] },

  { id: 'silver-fox', name: 'Whisper Fox', icon: '🦊', rarity: 'super', cost: 4, power: 6, grit: 4, kw: ['swift'] },
  { id: 'wishing-well', name: 'Wishing Well', icon: '⭐', rarity: 'super', cost: 4, power: 7, grit: 6, kw: ['mend'] },
  { id: 'storm-lily', name: 'Moonrain Lily', icon: '🌼', rarity: 'super', cost: 4, power: 8, grit: 7, kw: ['bloom'] },
  { id: 'copper-kettle-spirit', name: 'Hearth Spirit', icon: '👻', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['shield'] },
  { id: 'jade-turtle', name: 'Ageless Turtle', icon: '🐢', rarity: 'super', cost: 4, power: 8, grit: 7, kw: ['guard'] },
  { id: 'river-otter', name: 'Drifting Otter', icon: '🦦', rarity: 'super', cost: 4, power: 7, grit: 6, kw: ['mend'] },

  { id: 'sky-whale', name: 'Whisper Whale', icon: '🐳', rarity: 'mythic', cost: 5, power: 9, grit: 9, kw: ['mend'] },
  { id: 'moon-dragon', name: 'Moonwhisper Dragon', icon: '🐲', rarity: 'mythic', cost: 5, power: 8, grit: 7, kw: ['swift'] },
  { id: 'thundering-ram', name: 'Stormkeeper Ram', icon: '🐏', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['guard'] },
  { id: 'void-koi', name: 'Starless Koi', icon: '🐟', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['echo'] },
  { id: 'sunken-leviathan', name: 'Drowsy Leviathan', icon: '🐙', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['guard'] },

  // Briar, Chorus and Sip
  { id: 'bramble', name: 'Bramble', icon: '🥀', rarity: 'common', cost: 1, power: 2, grit: 2, kw: ['thorns'] },
  { id: 'morning-bugle', name: 'Morning Bugle', icon: '📯', rarity: 'common', cost: 2, power: 2, grit: 1, kw: ['rally'] },
  { id: 'dusk-bat', name: 'Dusk Bat', icon: '🦇', rarity: 'common', cost: 2, power: 3, grit: 3, kw: ['drain'] },
  { id: 'village-banner', name: 'Market Banner', icon: '🚩', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['rally'] },
  { id: 'whirlpool', name: 'Whirlpool', icon: '🌀', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['drain'] },
  { id: 'cactus-keeper', name: 'Briar Keeper', icon: '🌵', rarity: 'ultra', cost: 3, power: 3, grit: 5, kw: ['thorns', 'guard'] },
  { id: 'lion-dancer', name: 'Lantern Dancer', icon: '🦁', rarity: 'super', cost: 4, power: 5, grit: 4, kw: ['rally', 'swift'] },
  { id: 'mist-wraith', name: 'Mist Wisp', icon: '🌫️', rarity: 'super', cost: 4, power: 4, grit: 4, kw: ['drain', 'shield'] },
  { id: 'bramble-king', name: 'Briar King', icon: '👑', rarity: 'mythic', cost: 5, power: 9, grit: 8, kw: ['thorns', 'rally'] },

  // Spells: played from the hand for an instant effect, never take a board slot. `spell` names the effect in BattleEngine.SPELLS.
  { id: 'spark', name: 'Spark', icon: '⚡', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'spark' },
  { id: 'rain-shower', name: 'Rain Shower', icon: '🌦️', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'rain-shower' },
  { id: 'harvest', name: 'Harvest', icon: '🧺', rarity: 'rare', cost: 1, power: 0, grit: 0, kw: [], spell: 'harvest' },
  { id: 'gust', name: 'Gust', icon: '💨', rarity: 'rare', cost: 3, power: 0, grit: 0, kw: [], spell: 'gust' },
  { id: 'sunbeam', name: 'Sunbeam', icon: '🌞', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'sunbeam' },
  { id: 'thunderclap', name: 'Thunderclap', icon: '🌩️', rarity: 'ultra', cost: 2, power: 0, grit: 0, kw: [], spell: 'thunderclap' },
  { id: 'second-wind', name: 'Second Wind', icon: '🧘', rarity: 'ultra', cost: 3, power: 0, grit: 0, kw: [], spell: 'second-wind' },
  { id: 'moonlit-tide', name: 'Moonlit Tide', icon: '🌙', rarity: 'super', cost: 4, power: 0, grit: 0, kw: [], spell: 'moonlit-tide' },
  { id: 'starfall', name: 'Starfall', icon: '🌠', rarity: 'mythic', cost: 5, power: 0, grit: 0, kw: [], spell: 'starfall' },

  // Exclusive cards: never in packs, ground finds or opponent decks. `exclusive` says who hands them out.
  { id: 'glowworm', name: 'Glowworm', icon: '🪱', rarity: 'ultra', cost: 2, power: 2, grit: 3, kw: ['mend', 'shield'], exclusive: 'cellar' },
  { id: 'echo-cavern', name: 'Echo Cavern', icon: '🕳️', rarity: 'super', cost: 4, power: 6, grit: 6, kw: ['echo', 'guard'], exclusive: 'cellar' },
  { id: 'deep-wyrm', name: 'Forgotten Wyrm', icon: '🐍', rarity: 'mythic', cost: 5, power: 9, grit: 9, kw: ['bloom', 'guard'], exclusive: 'cellar' },
  { id: 'rooks-ace', name: `${CAST.rival.name}'s Ace`, icon: '🎭', rarity: 'mythic', cost: 4, power: 7, grit: 6, kw: ['swift', 'echo'], exclusive: 'rival' },
  // v1.82.0 - four families (CARD_FAMILY below), one per district, and the Echo / Lull / Kin / Sting keywords. Appended at the
  // end on purpose: deck share codes store cards by their position in this list.
  // Grove (El Jardín Lúcido): Echo leaves an Afterthought behind, Kin grows with its family.
  { id: 'seedpod', name: 'Seedpod', icon: '🫘', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['seed'] },
  { id: 'moss-hare', name: 'Moss Hare', icon: '🐇', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['kin'] },
  { id: 'dandelion', name: 'Dandelion Wish', icon: '🏵️', rarity: 'rare', cost: 3, power: 3, grit: 5, kw: ['seed', 'bloom'] },
  { id: 'oak-warden', name: 'Warden of Roots', icon: '🌳', rarity: 'super', cost: 4, power: 7, grit: 7, kw: ['seed', 'guard'] },
  { id: 'world-tree', name: 'The Dreaming Tree', icon: '🎄', rarity: 'mythic', cost: 5, power: 10, grit: 10, kw: ['seed', 'kin'] },
  // Stone (El Umbral): steady bodies that dig the small things out.
  { id: 'stone-hen', name: 'Stone Hen', icon: '🐔', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['kin'] },
  { id: 'cliff-goat', name: 'Cliff Goat', icon: '🐐', rarity: 'rare', cost: 3, power: 4, grit: 5, kw: ['guard', 'kin'] },
  { id: 'badger', name: 'Badger', icon: '🦡', rarity: 'rare', cost: 3, power: 4, grit: 3, kw: ['sting'] },
  { id: 'quarry-bear', name: 'Stonedigger Bear', icon: '🐻', rarity: 'ultra', cost: 4, power: 5, grit: 7, kw: ['sting', 'guard'] },
  { id: 'mossy-titan', name: 'Mossmind Titan', icon: '🗻', rarity: 'mythic', cost: 5, power: 9, grit: 10, kw: ['guard', 'kin'] },
  // Tide (La Orilla del Arrullo): Lull holds the enemy's best card back for a turn.
  { id: 'hermit-crab', name: 'Hermit Crab', icon: '🦀', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['lull'] },
  { id: 'puffer', name: 'Puffer', icon: '🐡', rarity: 'common', cost: 2, power: 3, grit: 2, kw: ['thorns'] },
  { id: 'harbor-seal', name: 'Shore Seal', icon: '🦭', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['lull'] },
  { id: 'moon-jelly', name: 'Moon Jelly', icon: '🪼', rarity: 'ultra', cost: 3, power: 3, grit: 3, kw: ['lull', 'shield'] },
  { id: 'tide-caller', name: 'Tide Caller', icon: '🐚', rarity: 'ultra', cost: 4, power: 4, grit: 5, kw: ['lull', 'mend'] },
  { id: 'kraken', name: 'Lullaby Kraken', icon: '🦑', rarity: 'mythic', cost: 5, power: 7, grit: 8, kw: ['lull', 'drain'] },
  // Wind (El Mercado de Susurros): fast cards that sting on the way in.
  { id: 'honeybee', name: 'Honeybee', icon: '🐝', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['sting'] },
  { id: 'market-sparrow', name: 'Market Sparrow', icon: '🐦', rarity: 'rare', cost: 3, power: 3, grit: 2, kw: ['swift', 'sting'] },
  { id: 'kite-runner', name: 'Kite Runner', icon: '🪁', rarity: 'ultra', cost: 3, power: 2, grit: 4, kw: ['swift', 'kin'] },
  // New spells (effects in BattleEngine.SPELLS)
  { id: 'chill', name: 'Chill', icon: '❄️', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'chill' },
  { id: 'overgrowth', name: 'Overgrowth', icon: '🌿', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'overgrowth' },
  { id: 'stone-skin', name: 'Stone Skin', icon: '🧱', rarity: 'rare', cost: 1, power: 0, grit: 0, kw: [], spell: 'stone-skin' },
  { id: 'undertow', name: 'Undertow', icon: '🎣', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'undertow' },
  { id: 'quickstep', name: 'Quickstep', icon: '👟', rarity: 'ultra', cost: 2, power: 0, grit: 0, kw: [], spell: 'quickstep' },
  { id: 'picnic', name: 'Picnic', icon: '🍞', rarity: 'rare', cost: 1, power: 0, grit: 0, kw: [], spell: 'picnic' },
  // The four spirit gods (Divine) and the Atlas (Atlas rarity): earned by summoning, never found. Energy is capped at 5, so they cost 5.
  // Stats come from a paired simulation (2500 games each, one of these swapped into a random deck, smart AI both sides; re-run after the build 151 balance pass): +5 to +9 win
  // points each, against 0 to +5 for the mythics. Ensueño needs the big numbers because Echo + Bloom is slow. Swift on the Atlas was +20, so it has none.
  { id: 'duermevela', name: BOSSES.square, icon: '🚪', rarity: 'divine', cost: 5, power: 8, grit: 9, kw: ['guard', 'shield'], exclusive: 'summon' },
  { id: 'murmullo', name: BOSSES.market, icon: '🤫', rarity: 'divine', cost: 5, power: 8, grit: 7, kw: ['swift', 'sting'], exclusive: 'summon' },
  { id: 'marea-lenta', name: BOSSES.harbor, icon: '🪸', rarity: 'divine', cost: 5, power: 8, grit: 8, kw: ['mend', 'lull'], exclusive: 'summon' },
  { id: 'ensueno', name: BOSSES.garden, icon: '💭', rarity: 'divine', cost: 5, power: 14, grit: 13, kw: ['seed', 'bloom'], exclusive: 'summon' },
  { id: 'the-atlas', name: `The ${CAST.atlas.name}`, icon: '🗺️', rarity: 'atlas', cost: 5, power: 10, grit: 12, kw: ['guard'], exclusive: 'summon' },
  // Build 271 - more of the thin keywords (Briar, Chorus, Sip, Sting, Lull) and five family spells. Appended at the end on purpose.
  { id: 'evergreen-sentry', name: 'Evergreen Sentry', icon: '🌲', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['thorns'] },
  { id: 'ladybug', name: 'Ladybug', icon: '🐞', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['sting'] },
  { id: 'clay-jar', name: 'Clay Jar', icon: '🏺', rarity: 'rare', cost: 3, power: 4, grit: 4, kw: ['thorns'] },
  { id: 'drift-ice', name: 'Drift Ice', icon: '🧊', rarity: 'ultra', cost: 3, power: 3, grit: 4, kw: ['thorns', 'shield'] },
  { id: 'warm-tea', name: 'Warm Tea', icon: '🍵', rarity: 'rare', cost: 3, power: 3, grit: 5, kw: ['drain'] },
  { id: 'lotus-pool', name: 'Lotus Pool', icon: '🪷', rarity: 'super', cost: 4, power: 6, grit: 6, kw: ['drain', 'mend'] },
  { id: 'slow-snail', name: 'Slow Snail', icon: '🐌', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['lull'] },
  { id: 'chime-wind', name: 'Wind Chime', icon: '🎐', rarity: 'common', cost: 2, power: 1, grit: 2, kw: ['rally'] },
  { id: 'dusk-moth', name: 'Dusk Wing', icon: '🦋', rarity: 'common', cost: 2, power: 4, grit: 2, kw: ['drain'] },
  { id: 'parade-balloon', name: 'Parade Balloon', icon: '🎈', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['rally'] },
  { id: 'drifting-cloud', name: 'Drifting Cloud', icon: '☁️', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['lull'] },
  { id: 'first-light', name: 'First Light', icon: '🌅', rarity: 'super', cost: 4, power: 6, grit: 5, kw: ['rally', 'drain'] },
  // Family spells: each does more the more of its family you have on the board (effects in BattleEngine.SPELLS)
  { id: 'wild-growth', name: 'Wild Growth', icon: '🌻', rarity: 'rare', cost: 1, power: 0, grit: 0, kw: [], spell: 'wild-growth' },
  { id: 'hold-fast', name: 'Hold Fast', icon: '🛡️', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'hold-fast' },
  { id: 'tidepool', name: 'Tidepool', icon: '🌧️', rarity: 'rare', cost: 1, power: 0, grit: 0, kw: [], spell: 'tidepool' },
  { id: 'gathering-storm', name: 'Gathering Storm', icon: '⛈️', rarity: 'ultra', cost: 2, power: 0, grit: 0, kw: [], spell: 'gathering-storm' },
  { id: 'last-light', name: 'Last Light', icon: '🕯️', rarity: 'ultra', cost: 1, power: 0, grit: 0, kw: [], spell: 'last-light' },
];
/* Foe cards: unique cards that only opponents carry (neighbors, bosses, cellar floors). They are deliberately NOT in
   CARD_POOL - so they never show up in packs, the Index, deck codes or rewards - but defOf() knows them, so the battle
   engine and card art treat them like any other card. `tier` is the earliest foe tier that may field them (see
   foeTierFor in progression.js). */
const FOE_CARDS = [
  { id: 'market-cat',     name: 'Market Cat',     icon: '🐈', rarity: 'rare',   cost: 2, power: 3, grit: 2, kw: ['swift'],           foe: true, tier: 1 },
  { id: 'lamplighter',    name: 'Lamplighter',    icon: '🏮', rarity: 'rare',   cost: 2, power: 2, grit: 3, kw: ['mend'],            foe: true, tier: 1 },
  { id: 'pebble-golem',   name: 'Worry Golem',    icon: '🗿', rarity: 'rare',   cost: 3, power: 3, grit: 5, kw: ['guard'],           foe: true, tier: 1 },
  { id: 'thorn-hare',     name: 'Briar Hare',     icon: '🐇', rarity: 'ultra',  cost: 3, power: 4, grit: 3, kw: ['swift', 'thorns'], foe: true, tier: 2 },
  { id: 'wisp-keeper',    name: 'Wisp Warden',    icon: '🕯️', rarity: 'ultra',  cost: 3, power: 3, grit: 4, kw: ['mend', 'shield'],  foe: true, tier: 2 },
  { id: 'bell-ringer',    name: 'Bell Ringer',    icon: '🛎️', rarity: 'ultra',  cost: 3, power: 3, grit: 4, kw: ['echo', 'rally'],   foe: true, tier: 2 },
  { id: 'storm-heron',    name: 'Dream Heron',    icon: '🦅', rarity: 'super',  cost: 4, power: 5, grit: 4, kw: ['swift', 'drain'],  foe: true, tier: 3 },
  { id: 'iron-tortoise',  name: 'Iron Tortoise',  icon: '🐢', rarity: 'super',  cost: 4, power: 4, grit: 7, kw: ['guard', 'thorns'], foe: true, tier: 3 },
  { id: 'cinder-fox',      name: 'Cinder Fox',     icon: '🦊', rarity: 'super',  cost: 4, power: 6, grit: 4, kw: ['swift', 'bloom'],  foe: true, tier: 3 },
  { id: 'night-regent',   name: 'Regent of Sleep',   icon: '🦉', rarity: 'mythic', cost: 5, power: 7, grit: 7, kw: ['guard', 'drain'],  foe: true, tier: 4 },
  { id: 'tide-leviathan', name: 'Slow Leviathan', icon: '🐋', rarity: 'mythic', cost: 5, power: 7, grit: 8, kw: ['shield', 'echo'],  foe: true, tier: 4 },
];
// Tokens that cards create mid-battle. Never in packs, pools, decks or the Index; BattleEngine.defOf still knows them.
const TOKEN_CARDS = [
  { id: 'seedling', name: 'Afterthought', icon: '🌱', rarity: 'common', cost: 0, power: 1, grit: 2, kw: [], token: true }
];
// Families (v1.82.0): each district leans on one. Kin cards grow with the other cards of their family on your board, and a
// district's neighbors and boss build decks that favour their family (buildDeckForOpponent). Spells and unlisted cards have none.
const FAMILIES = {
  grove: { icon: '🌿', name: FAMILY_NAMES.grove, district: 'garden' },
  stone: { icon: '🪨', name: FAMILY_NAMES.stone, district: 'square' },
  tide:  { icon: '🌊', name: FAMILY_NAMES.tide,  district: 'harbor' },
  wind:  { icon: '🪶', name: FAMILY_NAMES.wind,  district: 'market' }
};
const CARD_FAMILY = (() => {
  const lists = {
    grove: 'sprout blossom toadstool cherry-blossom-storm acorn firefly hollow-log foxglove hedgehog storm-lily aurora-stag bramble cactus-keeper bramble-king glowworm seedpod moss-hare dandelion oak-warden world-tree ensueno evergreen-sentry ladybug',
    stone: 'pebble flintstone geode crystal-spire moonstone mountain-heart rice-cake torii-gate stone-lantern old-kettle copper-kettle-spirit jade-turtle thundering-ram echo-cavern deep-wyrm stone-hen cliff-goat badger quarry-bear mossy-titan duermevela clay-jar',
    tide: 'droplet bubble tide koi-ascending deep-current whirlpool lantern-fish glass-float river-otter void-koi sunken-leviathan wishing-well heron paper-boat hermit-crab puffer harbor-seal moon-jelly tide-caller kraken marea-lenta drift-ice warm-tea lotus-pool slow-snail',
    wind: 'feather dove gale origami-crane paper-fan folding-screen temple-bell sky-whale moon-dragon lion-dancer morning-bugle dusk-bat village-banner silver-fox ember-fox rooks-ace mist-wraith honeybee market-sparrow kite-runner murmullo chime-wind dusk-moth parade-balloon drifting-cloud first-light'
  };
  const m = {};
  Object.keys(lists).forEach(f => lists[f].split(' ').forEach(id => { m[id] = f; }));
  return m;
})();
const EXCLUSIVE_HINT = { cellar: 'found deep in the cellar', rival: "a rival's final prize", summon: 'earned at the altar' };
const RARITY_LABEL = { common: 'common', rare: 'rare', ultra: 'ultra rare', super: 'super ultra rare', mythic: 'mythic', divine: 'divine', atlas: 'atlas' };
// Pack odds are flat on purpose: they must NOT scale with wins, or a veteran's packs would
// out-pay their own cost and release-and-rebuy would become free money (checked by simulation).
const PACKS = [
  { id: 'puddle', name: 'Nap Pack', icon: '💦', cost: 4,  floorLabel: 'Any card',           desc: 'A cheap, quick draw - mostly commons, but every card has a shot.',
    odds: { common: 0.78, rare: 0.17, ultra: 0.04, super: 0.008, mythic: 0.002 } },
  { id: 'meadow', name: 'Daydream Pack', icon: '🌾', cost: 8,  floorLabel: 'Any card',           desc: 'Mostly everyday finds, with a chance of something better.',
    odds: { common: 0.62, rare: 0.27, ultra: 0.08, super: 0.025, mythic: 0.005 } },
  { id: 'brook',  name: 'Moonlit Pack',  icon: '💧', cost: 30, floorLabel: 'Rare or better',     desc: 'A rare card is guaranteed.',
    odds: { common: 0, rare: 0.70, ultra: 0.22, super: 0.065, mythic: 0.015 } },
  { id: 'orchard', name: 'Midnight Pack', icon: '🍂', cost: 55, floorLabel: 'Rare or better',   desc: 'Better odds than a Moonlit Pack for the same guarantee.',
    odds: { common: 0, rare: 0.52, ultra: 0.35, super: 0.10, mythic: 0.03 } },
  { id: 'aurora', name: 'Lucid Pack', icon: '🌌', cost: 105, floorLabel: 'Ultra rare or better', desc: 'An ultra rare card is guaranteed.',
    odds: { common: 0, rare: 0, ultra: 0.78, super: 0.18, mythic: 0.04 } },
  { id: 'zenith', name: 'Reverie Pack', icon: '⛰️', cost: 280, floorLabel: 'Super or better', desc: 'A super rare card is guaranteed, with a real shot at mythic.',
    odds: { common: 0, rare: 0, ultra: 0, super: 0.82, mythic: 0.18 } },
  { id: 'spellbook', name: 'Lullaby Pack', icon: '📜', cost: 30, floorLabel: 'Always a spell', only: 'spell', desc: 'A single spell card: instant effects that never take a board slot.',
    odds: { common: 0.45, rare: 0.36, ultra: 0.13, super: 0.045, mythic: 0.015 } }
];   // defeated neighbors return after 3 minutes

// ---- used by js/afterdark-companion-cards.js ----
/* ---------------- set bonuses: own every card of a themed set for a lasting perk ---------------- */
const CARD_SETS = [
  { id: 'koi',      name: 'Drifting Shoal', icon: '🎏', cards: ['koi-ascending', 'void-koi', 'lantern-fish', 'moon-jelly'],                      kind: 'fish',        val: 0.10, text: 'Fish bite 10% sooner' },
  { id: 'moon',     name: 'Moon Phases',    icon: '🌙', cards: ['moonstone', 'moon-dragon', 'storm-lily', 'sunbeam', 'moonlit-tide'],           kind: 'xp',          val: 0.05, text: '+5% XP' },
  { id: 'garden',   name: 'Midnight Bloom',  icon: '🌷', cards: ['sprout', 'blossom', 'foxglove', 'cherry-blossom-storm', 'aurora-stag'],       kind: 'crops',       val: 0.10, text: 'Crops grow 10% faster' },
  { id: 'stones',   name: 'Memory Stones',  icon: '🪨', cards: ['pebble', 'flintstone', 'geode', 'crystal-spire', 'mountain-heart'],          kind: 'startSpirit', val: 1,    text: '+1 Calm at the start of matches' },
  { id: 'birds',    name: 'Whisper Wings',  icon: '🐦', cards: ['origami-crane', 'feather', 'market-sparrow', 'dove', 'heron'], kind: 'finds',      val: 0.15, text: 'Hidden finds +15%' },
  { id: 'storm',    name: 'Dream Storms',   icon: '⛈️', cards: ['gale', 'thunderclap', 'thundering-ram', 'whirlpool'],                     kind: 'chest',       val: 0.15, text: 'Hidden chests +15%' },
  { id: 'festival', name: 'Lantern Night',  icon: '🏮', cards: ['paper-fan', 'temple-bell', 'morning-bugle', 'stone-lantern', 'lion-dancer'], kind: 'miniPebbles', val: 1, text: `+1 ${GAME.currency.one} per mini-game medal` },
  { id: 'spells',   name: 'Book of Lullabies', icon: '📜', cards: CARD_POOL.filter(c => c.spell).map(c => c.id),                             kind: 'startDraw',   val: 1,    text: 'Draw 1 extra card at the start of matches' },
];

// ---- used by js/tarot.js ----
const ARCANA = [
  { n: '0',     name: 'The Fool',           card: 'aurora-stag',       kind: 'startDraw',      val: 1,    up: 'New beginnings, a light step.',          rev: 'Rushing in without looking.' },
  { n: 'I',     name: 'The Magician',       card: 'silver-fox',  kind: 'xp',             val: .05,  up: 'Everything you need is already here.',   rev: 'Tricks and scattered effort.' },
  { n: 'II',    name: 'The High Priestess', card: 'sky-whale',     kind: 'finds',          val: .10,  up: 'Quiet knowing. Listen first.',           rev: 'Ignoring your own instinct.' },
  { n: 'III',   name: 'The Empress',        card: 'storm-lily',      kind: 'crops',          val: .08,  up: 'Abundance and care.',                    rev: 'Smothering, overgrowth.' },
  { n: 'IV',    name: 'The Emperor',        card: 'mountain-heart',    kind: 'startSpirit',    val: 1,    up: 'Order, structure, a firm hand.',         rev: 'Rigid and stubborn.' },
  { n: 'V',     name: 'The Hierophant',     card: 'jade-turtle',       kind: 'xp',             val: .05,  up: 'Tradition and shared wisdom.',           rev: 'Breaking with convention.' },
  { n: 'VI',    name: 'The Lovers',         card: 'river-otter',       kind: 'miniPebbles',    val: 1,    up: 'Partnership, a meaningful choice.',      rev: 'A bond out of balance.' },
  { n: 'VII',   name: 'The Chariot',        card: 'thundering-ram',    kind: 'winPebbles',     val: 1,    up: 'Will and momentum.',                     rev: 'Losing control of the reins.' },
  { n: 'VIII',  name: 'Strength',           card: 'lion-dancer',       kind: 'startSpirit',    val: 1,    up: 'Gentle courage.',                        rev: 'Doubt, a quiet voice.' },
  { n: 'IX',    name: 'The Hermit',         card: 'copper-kettle-spirit',           kind: 'chest',          val: .10,  up: 'A lamp held up in the dark.',            rev: 'Isolation, hiding away.' },
  { n: 'X',     name: 'Wheel of Fortune',   card: 'wishing-well',   kind: 'winPebbles',     val: 1,    up: 'Cycles turn. Luck arrives.',             rev: 'Bad timing, a stuck wheel.' },
  { n: 'XI',    name: 'Justice',            card: 'oak-warden',      kind: 'winPebbles',     val: 1,    up: 'Fairness. A clear ring of truth.',       rev: 'A one-sided story.' },
  { n: 'XII',   name: 'The Hanged Man',     card: 'mist-wraith',       kind: 'bake',           val: .10,  up: 'A pause, a new angle.',                  rev: 'Stalling.' },
  { n: 'XIII',  name: 'Death',              card: 'void-koi',   kind: 'finds',          val: .10,  up: 'An ending that clears the way.',         rev: 'Clinging to what is done.' },
  { n: 'XIV',   name: 'Temperance',         card: 'deep-current',      kind: 'crops',          val: .08,  up: 'Balance and blending.',                  rev: 'Excess, imbalance.' },
  { n: 'XV',    name: 'The Devil',          card: 'kraken',            kind: 'harvestPebbles', val: 1,    up: 'Temptation and chains you chose.',       rev: 'Slipping free.' },
  { n: 'XVI',   name: 'The Tower',          card: 'sunken-leviathan',       kind: 'chest',          val: .10,  up: 'Sudden change. Clear skies after.',      rev: 'A collapse you avoid.' },
  { n: 'XVII',  name: 'The Star',           card: 'moonstone',         kind: 'startSpirit',    val: 1,    up: 'Hope, quiet healing.',                   rev: 'Lost faith, then renewal.' },
  { n: 'XVIII', name: 'The Moon',           card: 'moon-dragon',       kind: 'finds',          val: .12,  up: 'Dreams and illusions.',                  rev: 'Confusion clears.' },
  { n: 'XIX',   name: 'The Sun',            card: 'mossy-titan',     kind: 'xp',             val: .06,  up: 'Joy, plain and warm.',                   rev: 'Joy delayed, not gone.' },
  { n: 'XX',    name: 'Judgement',          card: 'bramble-king',    kind: 'xp',             val: .05,  up: 'A calling. Rising again.',               rev: 'Self-doubt.' },
  { n: 'XXI',   name: 'The World',          card: 'world-tree',        kind: 'harvestPebbles', val: 1,    up: 'Completion, a full circle.',             rev: 'Nearly there.' },
];

// ---- used by js/progression.js ----
// A small, stable flavor line per card - picked deterministically from the card's id so it never changes
// between views, without hand-authoring one for every card in the pool.
const CARD_STORY_TEMPLATES = {
  common: [
    "A humble find, but every deck needs a few of these.",
    "Nothing fancy - just steady, reliable {name}.",
    "You've probably walked past a dozen of these without noticing.",
    "Common where you'd expect, and always useful in a pinch.",
    "{name} doesn't ask for much attention, and rarely gets any.",
  ],
  rare: [
    "Not every day you come across a {name}.",
    "Keep an eye out - {name} doesn't show up twice in the same spot.",
    "There's a little more shine to {name} than the everyday finds.",
    "{name} has a way of turning a plain match into a memorable one.",
  ],
  ultra: [
    "Few decks are lucky enough to carry a {name}.",
    "{name} is the kind of card people remember pulling.",
    "Word travels fast when someone finds a {name}.",
    "There's a reason {name} makes people stop and look twice.",
  ],
  super: [
    "{name} is spoken about more than it's actually seen.",
    "A genuine rarity - {name} turns heads across town.",
    "Some collectors chase {name} for months without luck.",
  ],
  mythic: [
    `{name} might be the rarest thing in all of ${GAME.title}.`,
    "Legends get told about cards like {name}.",
    "There may only be a handful of {name} in the whole town.",
  ],
};

// ---- used by js/afterdark-companion-cards.js ----
const COMPANION_TRAITS = {
  card: ['Hums quietly when you stop walking.', 'Never goes more than three steps away.', 'Pretends not to notice the puddles, then hops them.', 'Gets a little brighter every time you win.', 'Likes to wait where the light is good.', 'Turns to look whenever you turn a corner.', 'Is secretly very proud to be a card.', 'Rests in your shadow when it rains.'],
  npc: ['Narrates the walk, whether you ask or not.', 'Always has a snack in a pocket.', 'Waves at everyone you pass.', 'Walks a little ahead, then waits with a grin.', 'Hums a tune they never quite finish.', 'Notices small things and mentions them.', 'Says they are only here for the fresh air.', 'Keeps a careful count of your steps.'],
  boss: ['Walks slowly, and the grass leans aside.', 'Looks down at everything, kindly.', 'Has promised to behave. Mostly.', 'Takes up a lot of the path and knows it.', 'Rumbles when something is hidden nearby.', 'Still sizes up every stranger for a match.'],
  rival: ['Claims to be here to keep an eye on you.', 'Practises card shuffles at every bench.', 'Pretends not to be impressed.', 'Keeps score of your wins out loud.'],
};
