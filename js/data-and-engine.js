const STORAGE_KEY = 'quiet-commons-state-v4';
const OLD_STORAGE_KEY = 'quiet-commons-state-v3';
const PREFS_KEY = 'quiet-commons-prefs';
const TOWN_SIZE = 6;
const DECK_SIZE = 12;   // must equal BattleEngine.RULES.deck
const MAX_COPIES = 2;   // must equal BattleEngine.RULES.copies
const ITEM_DESPAWN_MS = 30000;
const ITEM_RESPAWN_MS = 20000;
const NPC_RESPAWN_MS = 180000;

// Embers: earned by releasing spare copies, spent on card packs.
// A pack costs more than any single release pays, so it can never be looped for profit.
const RELEASE_VALUE = { common: 1, rare: 3, ultra: 8, super: 20, mythic: 50, divine: 120, atlas: 250 };   // divine and atlas are summon-only (never spare), the values just keep sorts and charms total
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

// Shop > Items: decorations the player places into El Umbral. Buying one adds it to the player's
// decoration inventory (state.decorationInventory) rather than spending it immediately - see
// buyDecoration / startPlacingDecoration / handleDecorationTap for the buy -> store -> place flow.
// cat groups the Items shop's filter chips: 'plant', 'seating', 'lighting', 'ornament'.
const DECORATION_ITEMS = [
  { id: 'wind-chime', name: 'Wind Chime', icon: '🎐', cost: 16, desc: 'Tap it and it sings a soft note.', cat: 'ornament' },
  { id: 'planter', name: 'Potted Plant', icon: '🪴', cost: 10, desc: 'A leafy little planter for a quiet corner.', cat: 'plant' },
  { id: 'flag', name: 'Little Flag', icon: '🚩', cost: 10, desc: 'Marks the spot as yours.', cat: 'ornament' },
  { id: 'wildflowers', name: 'Wildflower Patch', icon: '🌼', cost: 12, desc: "A little wild, on purpose.", cat: 'plant' },
  { id: 'basket', name: 'Woven Basket', icon: '🧺', cost: 12, desc: 'Left out, waiting to be filled.', cat: 'ornament' },
  { id: 'gardenrock', name: 'Memory Stone', icon: '🪨', cost: 14, desc: 'Smooth and cool to the touch.', cat: 'ornament' },
  { id: 'candle', name: 'Garden Candle', icon: '🕯️', cost: 14, desc: "Flickers even when there's no wind.", cat: 'lighting' },
  { id: 'lantern', name: 'Paper Lantern', icon: '🏮', cost: 15, desc: 'Glows soft even in daylight.', cat: 'lighting' },
  { id: 'tulips', name: 'Tulip Bed', icon: '🌷', cost: 16, desc: 'Planted in a tidy little row.', cat: 'plant' },
  { id: 'mushroom', name: 'Mushroom Ring', icon: '🍄', cost: 16, desc: "Somebody says it's good luck.", cat: 'ornament' },
  { id: 'log-bench', name: 'Log Seat', icon: '🪵', cost: 18, desc: 'Rough-hewn, but comfortable enough.', cat: 'seating' },
  { id: 'sunflowers', name: 'Sunflower Row', icon: '🌻', cost: 18, desc: 'Turns to follow the light.', cat: 'plant' },
  { id: 'garden-bench', name: 'Garden Bench', icon: '🪑', cost: 20, desc: 'Somewhere new to sit and watch the square.', cat: 'seating' },
  { id: 'bamboo', name: 'Bamboo Stalks', icon: '🎋', cost: 22, desc: 'Rustles gently in the breeze.', cat: 'plant' },
  { id: 'vase', name: 'Old Vase', icon: '🏺', cost: 24, desc: 'Cracked, but still holding water.', cat: 'ornament' },
  { id: 'birdbath', name: 'Birdbath', icon: '🐦', cost: 25, desc: 'Sparrows will find it eventually.', cat: 'ornament' },
  { id: 'carp-streamer', name: 'Carp Streamer', icon: '🎏', cost: 26, desc: 'Dances whenever the wind picks up.', cat: 'ornament' },
  { id: 'duck', name: 'Garden Duck', icon: '🦆', cost: 28, desc: "Doesn't move, but looks like it might.", cat: 'ornament' },
  { id: 'topiary', name: 'Topiary', icon: '🌳', cost: 30, desc: 'Trimmed into a tidy little spiral.', cat: 'plant' },
  { id: 'streetlamp', name: 'Street Lamp', icon: '💡', cost: 35, desc: 'A warm little pool of light after dark.', cat: 'lighting' },
  { id: 'statue', name: 'Old Statue', icon: '🗿', cost: 40, desc: 'Weathered, and a little mysterious.', cat: 'ornament' },
  // night: sold only at the Lantern Market after dark; they glow once the sun goes down
  { id: 'firefly-jar', name: 'Firefly Jar', icon: '🫙', cost: 30, desc: 'A soft, flickering light for dark evenings.', night: true, cat: 'lighting' },
  { id: 'star-garland', name: 'Star Garland', icon: '💫', cost: 35, desc: 'Twinkles like a tiny night sky.', night: true, cat: 'lighting' },
  { id: 'moon-lamp', name: 'Moon Lamp', icon: '🌕', cost: 45, desc: 'A little moon of your own.', night: true, cat: 'lighting' },
  // Premium decorations (v1.87.0): the big, aspirational Ember sinks. `level` is the Dreamer level that opens them in the shop.
  { id: 'moon-gate', name: 'Moon Gate', icon: '⛩️', cost: 90, level: 6, desc: 'A round stone gate. Walk through it twice for luck.', cat: 'ornament' },
  { id: 'koi-pond', name: 'Dreaming Pond', icon: '🐟', cost: 120, level: 8, desc: 'A still pond with a slow, golden visitor.', cat: 'plant' },
  { id: 'crystal-fountain', name: 'Crystal Fountain', icon: '⛲', cost: 160, level: 10, desc: 'Water that chimes as it falls.', cat: 'ornament' },
  { id: 'wishing-tree', name: 'Wishing Tree', icon: '🎋', cost: 220, level: 12, desc: 'Ribbons from every wish ever made.', cat: 'plant' },
  { id: 'golden-keeper', name: 'Golden Dreamer', icon: '🏆', cost: 300, level: 15, desc: 'A statue of the Dreamer, mid-triumph.', cat: 'ornament' },
  // sold only by the Atlas (js/atlas.js ATLAS_SHOP), never in the Card Shop
  { id: 'atlas-compass', name: 'Compass Rose', icon: '🧭', cost: 150, desc: 'It always points at something you meant to find.', cat: 'ornament', atlas: true },
  { id: 'atlas-lantern', name: 'Map Lantern', icon: '🏮', cost: 180, desc: 'Lights up the parts of the ground nobody has drawn yet.', cat: 'ornament', atlas: true },
  { id: 'dream-globe', name: 'Dream Globe', icon: '🌐', cost: 240, desc: 'Turn it and a different dream faces you.', cat: 'ornament', atlas: true },
  { id: 'star-chart', name: 'Star Chart', icon: '🌌', cost: 320, desc: 'Every star on it is a place you almost went.', cat: 'ornament', atlas: true }
];

const CARD_POOL = [
  { id: 'sprout', name: 'Sprout', icon: '🌱', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['bloom'] },
  { id: 'pebble', name: 'Worry Stone', icon: '🪨', rarity: 'common', cost: 1, power: 1, grit: 3, kw: ['guard'] },
  { id: 'droplet', name: 'Droplet', icon: '💧', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['mend'] },
  { id: 'toadstool', name: 'Toadstool', icon: '🍄', rarity: 'common', cost: 2, power: 3, grit: 2, kw: ['guard'] },
  { id: 'bubble', name: 'Dream Bubble', icon: '🫧', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['shield'] },
  { id: 'flintstone', name: 'Flint', icon: '🪨', rarity: 'common', cost: 2, power: 4, grit: 1, kw: ['swift'] },

  { id: 'blossom', name: 'Blossom', icon: '🌸', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['bloom'] },
  { id: 'geode', name: 'Memory Geode', icon: '💎', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard'] },
  { id: 'tide', name: 'Gentle Wave', icon: '🌊', rarity: 'rare', cost: 3, power: 4, grit: 3, kw: ['echo'] },
  { id: 'feather', name: 'Drifting Feather', icon: '🪶', rarity: 'rare', cost: 2, power: 3, grit: 1, kw: ['swift'] },

  { id: 'dove', name: 'Letter Dove', icon: '🕊️', rarity: 'ultra', cost: 3, power: 3, grit: 3, kw: ['mend', 'swift'] },
  { id: 'crystal-spire', name: 'Memory Spire', icon: '🔷', rarity: 'ultra', cost: 4, power: 6, grit: 4, kw: ['shield'] },
  { id: 'gale', name: 'Wandering Gale', icon: '🌬️', rarity: 'ultra', cost: 3, power: 5, grit: 2, kw: ['swift'] },
  { id: 'ember-fox', name: 'Dusk Fox', icon: '🦊', rarity: 'ultra', cost: 3, power: 4, grit: 3, kw: ['echo'] },

  { id: 'moonstone', name: 'Moonstone', icon: '🔮', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['shield'] },

  { id: 'aurora-stag', name: 'Dawn Stag', icon: '🦌', rarity: 'mythic', cost: 5, power: 7, grit: 7, kw: ['bloom'] },
  { id: 'deep-current', name: 'Slow Current', icon: '🐋', rarity: 'mythic', cost: 5, power: 6, grit: 8, kw: ['mend'] },
  { id: 'mountain-heart', name: 'Mountain of Memory', icon: '⛰️', rarity: 'mythic', cost: 5, power: 8, grit: 9, kw: ['guard'] },
  { id: 'origami-crane', name: 'Origami Crane', icon: '🪽', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['swift'] },
  { id: 'rice-cake', name: 'Rice Cake', icon: '🍡', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['guard'] },
  { id: 'paper-fan', name: 'Paper Fan', icon: '🪭', rarity: 'common', cost: 2, power: 3, grit: 2, kw: ['echo'] },
  { id: 'torii-gate', name: 'Torii Gate', icon: '⛩️', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard'] },
  { id: 'folding-screen', name: 'Folding Screen', icon: '🎏', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['shield'] },
  { id: 'temple-bell', name: 'Temple Bell', icon: '🔔', rarity: 'rare', cost: 3, power: 4, grit: 3, kw: ['echo'] },
  { id: 'stone-lantern', name: 'Night Lamp', icon: '🗼', rarity: 'ultra', cost: 4, power: 3, grit: 4, kw: ['guard'] },
  { id: 'koi-ascending', name: 'Koi Ascending', icon: '🐉', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['mend'] },
  { id: 'cherry-blossom-storm', name: 'Blossom Drift', icon: '🍃', rarity: 'ultra', cost: 4, power: 4, grit: 3, kw: ['bloom'] },

  { id: 'acorn', name: 'Acorn', icon: '🌰', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['mend'] },
  { id: 'firefly', name: 'Firefly', icon: '🪲', rarity: 'common', cost: 2, power: 3, grit: 1, kw: ['swift'] },

  { id: 'hollow-log', name: 'Hollow Log', icon: '🪵', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['shield'] },
  { id: 'foxglove', name: 'Foxglove', icon: '🌷', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['mend'] },
  { id: 'old-kettle', name: 'Old Kettle', icon: '🫖', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['mend'] },

  { id: 'heron', name: 'Sleepwalking Heron', icon: '🦢', rarity: 'ultra', cost: 4, power: 4, grit: 4, kw: ['mend'] },
  { id: 'hedgehog', name: 'Sleepy Hedgehog', icon: '🦔', rarity: 'ultra', cost: 3, power: 3, grit: 5, kw: ['guard'] },
  { id: 'paper-boat', name: 'Paper Boat', icon: '⛵', rarity: 'ultra', cost: 3, power: 4, grit: 2, kw: ['swift', 'echo'] },
  { id: 'glass-float', name: 'Glass Float', icon: '🔵', rarity: 'ultra', cost: 4, power: 3, grit: 5, kw: ['shield'] },
  { id: 'lantern-fish', name: 'Lantern Fish', icon: '🐠', rarity: 'ultra', cost: 3, power: 5, grit: 3, kw: ['echo'] },

  { id: 'silver-fox', name: 'Whisper Fox', icon: '🦊', rarity: 'super', cost: 4, power: 6, grit: 4, kw: ['swift'] },
  { id: 'wishing-well', name: 'Wishing Well', icon: '⭐', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['mend'] },
  { id: 'storm-lily', name: 'Moonrain Lily', icon: '🌼', rarity: 'super', cost: 4, power: 6, grit: 6, kw: ['bloom'] },
  { id: 'copper-kettle-spirit', name: 'Hearth Spirit', icon: '👻', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['shield'] },
  { id: 'jade-turtle', name: 'Ageless Turtle', icon: '🐢', rarity: 'super', cost: 4, power: 4, grit: 8, kw: ['guard'] },
  { id: 'river-otter', name: 'Drifting Otter', icon: '🦦', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['mend'] },

  { id: 'sky-whale', name: 'Whisper Whale', icon: '🐳', rarity: 'mythic', cost: 5, power: 8, grit: 8, kw: ['mend'] },
  { id: 'moon-dragon', name: 'Moonwhisper Dragon', icon: '🐲', rarity: 'mythic', cost: 5, power: 8, grit: 7, kw: ['swift'] },
  { id: 'thundering-ram', name: 'Stormkeeper Ram', icon: '🐏', rarity: 'mythic', cost: 5, power: 9, grit: 7, kw: ['guard'] },
  { id: 'void-koi', name: 'Starless Koi', icon: '🐟', rarity: 'mythic', cost: 5, power: 8, grit: 8, kw: ['echo'] },
  { id: 'sunken-leviathan', name: 'Drowsy Leviathan', icon: '🐙', rarity: 'mythic', cost: 5, power: 8, grit: 9, kw: ['guard'] },

  // Briar, Chorus and Sip
  { id: 'bramble', name: 'Bramble', icon: '🥀', rarity: 'common', cost: 1, power: 1, grit: 3, kw: ['thorns'] },
  { id: 'morning-bugle', name: 'Morning Bugle', icon: '📯', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['rally'] },
  { id: 'dusk-bat', name: 'Dusk Bat', icon: '🦇', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['drain'] },
  { id: 'village-banner', name: 'Market Banner', icon: '🚩', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['rally'] },
  { id: 'whirlpool', name: 'Whirlpool', icon: '🌀', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['drain'] },
  { id: 'cactus-keeper', name: 'Briar Keeper', icon: '🌵', rarity: 'ultra', cost: 3, power: 3, grit: 5, kw: ['thorns', 'guard'] },
  { id: 'lion-dancer', name: 'Lantern Dancer', icon: '🦁', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['rally', 'swift'] },
  { id: 'mist-wraith', name: 'Mist Wisp', icon: '🌫️', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['drain', 'shield'] },
  { id: 'bramble-king', name: 'Briar King', icon: '👑', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['thorns', 'rally'] },

  // Spells: played from the hand for an instant effect, never take a board slot. `spell` names the effect in BattleEngine.SPELLS.
  { id: 'spark', name: 'Spark', icon: '⚡', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'spark' },
  { id: 'rain-shower', name: 'Rain Shower', icon: '🌦️', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'rain-shower' },
  { id: 'harvest', name: 'Harvest', icon: '🧺', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'harvest' },
  { id: 'gust', name: 'Gust', icon: '🍃', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'gust' },
  { id: 'sunbeam', name: 'Sunbeam', icon: '🌞', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'sunbeam' },
  { id: 'thunderclap', name: 'Thunderclap', icon: '🌩️', rarity: 'ultra', cost: 3, power: 0, grit: 0, kw: [], spell: 'thunderclap' },
  { id: 'second-wind', name: 'Second Wind', icon: '🌬️', rarity: 'ultra', cost: 3, power: 0, grit: 0, kw: [], spell: 'second-wind' },
  { id: 'moonlit-tide', name: 'Moonlit Tide', icon: '🌊', rarity: 'super', cost: 4, power: 0, grit: 0, kw: [], spell: 'moonlit-tide' },
  { id: 'starfall', name: 'Starfall', icon: '🌠', rarity: 'mythic', cost: 5, power: 0, grit: 0, kw: [], spell: 'starfall' },

  // Exclusive cards: never in packs, ground finds or opponent decks. `exclusive` says who hands them out.
  { id: 'glowworm', name: 'Glowworm', icon: '🪱', rarity: 'ultra', cost: 2, power: 2, grit: 3, kw: ['mend', 'shield'], exclusive: 'cellar' },
  { id: 'echo-cavern', name: 'Echo Cavern', icon: '🕳️', rarity: 'super', cost: 4, power: 6, grit: 6, kw: ['echo', 'guard'], exclusive: 'cellar' },
  { id: 'deep-wyrm', name: 'Forgotten Wyrm', icon: '🐉', rarity: 'mythic', cost: 5, power: 9, grit: 9, kw: ['bloom', 'guard'], exclusive: 'cellar' },
  { id: 'rooks-ace', name: "Rook's Ace", icon: '🎭', rarity: 'mythic', cost: 4, power: 7, grit: 6, kw: ['swift', 'echo'], exclusive: 'rival' },
  // v1.82.0 - four families (CARD_FAMILY below), one per district, and the Echo / Lull / Kin / Sting keywords. Appended at the
  // end on purpose: deck share codes store cards by their position in this list.
  // Grove (El Jardín Lúcido): Echo leaves an Afterthought behind, Kin grows with its family.
  { id: 'seedpod', name: 'Seedpod', icon: '🫘', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['seed'] },
  { id: 'moss-hare', name: 'Moss Hare', icon: '🐇', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['kin'] },
  { id: 'dandelion', name: 'Dandelion Wish', icon: '🏵️', rarity: 'rare', cost: 3, power: 2, grit: 3, kw: ['seed', 'bloom'] },
  { id: 'oak-warden', name: 'Warden of Roots', icon: '🌳', rarity: 'super', cost: 4, power: 4, grit: 6, kw: ['seed', 'guard'] },
  { id: 'world-tree', name: 'The Dreaming Tree', icon: '🎄', rarity: 'mythic', cost: 5, power: 6, grit: 9, kw: ['seed', 'kin'] },
  // Stone (El Umbral): steady bodies that dig the small things out.
  { id: 'stone-hen', name: 'Stone Hen', icon: '🐔', rarity: 'common', cost: 2, power: 2, grit: 3, kw: ['kin'] },
  { id: 'cliff-goat', name: 'Cliff Goat', icon: '🐐', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard', 'kin'] },
  { id: 'badger', name: 'Badger', icon: '🦡', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['sting'] },
  { id: 'quarry-bear', name: 'Stonedigger Bear', icon: '🐻', rarity: 'ultra', cost: 4, power: 4, grit: 6, kw: ['sting', 'guard'] },
  { id: 'mossy-titan', name: 'Mossmind Titan', icon: '🗻', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['guard', 'kin'] },
  // Tide (La Orilla del Arrullo): Lull holds the enemy's best card back for a turn.
  { id: 'hermit-crab', name: 'Hermit Crab', icon: '🦀', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['lull'] },
  { id: 'puffer', name: 'Puffer', icon: '🐡', rarity: 'common', cost: 2, power: 2, grit: 3, kw: ['thorns'] },
  { id: 'harbor-seal', name: 'Shore Seal', icon: '🦭', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['lull'] },
  { id: 'moon-jelly', name: 'Moon Jelly', icon: '🪼', rarity: 'ultra', cost: 3, power: 2, grit: 4, kw: ['lull', 'shield'] },
  { id: 'tide-caller', name: 'Tide Caller', icon: '🐚', rarity: 'ultra', cost: 4, power: 4, grit: 5, kw: ['lull', 'mend'] },
  { id: 'kraken', name: 'Lullaby Kraken', icon: '🦑', rarity: 'mythic', cost: 5, power: 6, grit: 8, kw: ['lull', 'drain'] },
  // Wind (El Mercado de Susurros): fast cards that sting on the way in.
  { id: 'honeybee', name: 'Honeybee', icon: '🐝', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['sting'] },
  { id: 'market-sparrow', name: 'Market Sparrow', icon: '🐦', rarity: 'rare', cost: 3, power: 3, grit: 2, kw: ['swift', 'sting'] },
  { id: 'kite-runner', name: 'Kite Runner', icon: '🪁', rarity: 'ultra', cost: 3, power: 4, grit: 2, kw: ['swift', 'kin'] },
  // New spells (effects in BattleEngine.SPELLS)
  { id: 'chill', name: 'Chill', icon: '❄️', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'chill' },
  { id: 'overgrowth', name: 'Overgrowth', icon: '🌱', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'overgrowth' },
  { id: 'stone-skin', name: 'Stone Skin', icon: '🧱', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'stone-skin' },
  { id: 'undertow', name: 'Undertow', icon: '🌀', rarity: 'rare', cost: 3, power: 0, grit: 0, kw: [], spell: 'undertow' },
  { id: 'quickstep', name: 'Quickstep', icon: '👟', rarity: 'ultra', cost: 3, power: 0, grit: 0, kw: [], spell: 'quickstep' },
  { id: 'picnic', name: 'Picnic', icon: '🧺', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'picnic' },
  // The four spirit gods (Divine) and the Atlas (Atlas rarity): earned by summoning, never found. Energy is capped at 5, so they cost 5.
  // Stats come from a paired simulation (2500 games each, one of these swapped into a random deck, smart AI both sides): +6 to +8 win
  // points each, against 0 to +5 for the mythics. Ensueño needs the big numbers because Echo + Bloom is slow. Swift on the Atlas was +20, so it has none.
  { id: 'duermevela', name: 'Duermevela', icon: '🚪', rarity: 'divine', cost: 5, power: 8, grit: 10, kw: ['guard', 'shield'], exclusive: 'summon' },
  { id: 'murmullo', name: 'Murmullo', icon: '🤫', rarity: 'divine', cost: 5, power: 8, grit: 7, kw: ['swift', 'sting'], exclusive: 'summon' },
  { id: 'marea-lenta', name: 'Marea Lenta', icon: '🪸', rarity: 'divine', cost: 5, power: 8, grit: 9, kw: ['mend', 'lull'], exclusive: 'summon' },
  { id: 'ensueno', name: 'Ensueño', icon: '💭', rarity: 'divine', cost: 5, power: 12, grit: 12, kw: ['seed', 'bloom'], exclusive: 'summon' },
  { id: 'the-atlas', name: 'The Atlas', icon: '🗺️', rarity: 'atlas', cost: 5, power: 10, grit: 12, kw: ['guard'], exclusive: 'summon' },
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
// Families (v1.82.0): each district leans on one. Kin cards grow with the other cards of their family on your board, and a
// district's neighbors and boss build decks that favour their family (buildDeckForOpponent). Spells and unlisted cards have none.
const FAMILIES = {
  grove: { icon: '🌿', name: 'Brote', district: 'garden' },
  stone: { icon: '🪨', name: 'Recuerdo', district: 'square' },
  tide:  { icon: '🌊', name: 'Deriva',  district: 'harbor' },
  wind:  { icon: '🪶', name: 'Susurro',  district: 'market' }
};
const CARD_FAMILY = (() => {
  const lists = {
    grove: 'sprout blossom toadstool cherry-blossom-storm acorn firefly hollow-log foxglove hedgehog storm-lily aurora-stag bramble cactus-keeper bramble-king glowworm seedpod moss-hare dandelion oak-warden world-tree ensueno',
    stone: 'pebble flintstone geode crystal-spire moonstone mountain-heart rice-cake torii-gate stone-lantern old-kettle copper-kettle-spirit jade-turtle thundering-ram echo-cavern deep-wyrm stone-hen cliff-goat badger quarry-bear mossy-titan duermevela',
    tide: 'droplet bubble tide koi-ascending deep-current whirlpool lantern-fish glass-float river-otter void-koi sunken-leviathan wishing-well heron paper-boat hermit-crab puffer harbor-seal moon-jelly tide-caller kraken marea-lenta',
    wind: 'feather dove gale origami-crane paper-fan folding-screen temple-bell sky-whale moon-dragon lion-dancer morning-bugle dusk-bat village-banner silver-fox ember-fox rooks-ace mist-wraith honeybee market-sparrow kite-runner murmullo'
  };
  const m = {};
  Object.keys(lists).forEach(f => lists[f].split(' ').forEach(id => { m[id] = f; }));
  return m;
})();
// Tokens that cards create mid-battle. Never in packs, pools, decks or the Index; BattleEngine.defOf still knows them.
const TOKEN_CARDS = [
  { id: 'seedling', name: 'Afterthought', icon: '🌱', rarity: 'common', cost: 0, power: 1, grit: 2, kw: [], token: true }
];
const EXCLUSIVE_HINT = { cellar: 'found deep in the cellar', rival: "a rival's final prize", summon: 'earned at the altar' };

// Divine (the four gods) and Atlas (the one-of-a-kind top card) sit above mythic. They are never in packs, on the ground or in opponent decks
// (`exclusive: 'summon'`), and they can't be traded up to or from (see TRADE_TOP): the altar is the only way to get them.
const RARITY_ORDER = ['common', 'rare', 'ultra', 'super', 'mythic', 'divine', 'atlas'];
const TRADE_TOP = 'mythic';

// Card art: a CARD_POOL entry may optionally carry `art: 'assets/cards/<id>.png'`. Every place that shows
// a card's own icon/art (not a keyword icon, recipe icon, etc.) should call this instead of reading
// `def.icon` directly, so art can be dropped in card-by-card with the emoji staying as a fallback for
// every card that doesn't have one yet. The <img> is sized in em so it drops into any of the existing
// font-size-driven icon containers (see .card-art-img in style.css) without per-call-site CSS.
// The simple way to switch art on: drop `<id>.png` into assets/cards/ and add the id to this list (nothing else to edit).
// Every listed card gets `art: 'assets/cards/<id>.png'`; cards not listed keep their emoji. See assets/cards/README.md.
const CARD_ART = [];
CARD_POOL.concat(FOE_CARDS, TOKEN_CARDS).forEach(c => { if (CARD_ART.includes(c.id) && !c.art) c.art = 'assets/cards/' + c.id + '.png'; });
function cardArtHtml(def, cls) {
  return def.art
    ? `<img class="card-art-img${cls ? ' ' + cls : ''}" src="${def.art}" alt="${escapeHtml(def.name)}">`
    : `<span class="card-emoji${cls ? ' ' + cls : ''}">${def.icon}</span>`;
}

// The full card-face markup (cost/art/name/keywords/stats) shared by the battle-hand card (btCardEl) and
// the card-reveal popup (showCardReveal) - built from a card's base def rather than a live battle instance,
// so it always shows the card's resting stats (def.grit, not a damaged battle-instance hp).
// Card face layout ("circle stack on paper"): the art sits on the card's own colour, the keywords are round badges stacked
// under the cost bubble, and a calm paper panel at the foot holds the name and the attack / health numbers (or the Spell
// label). btCardEl in js/battle-ui.js and cardTileHtml in js/collection-tools.js build the same layout for live cards and
// collection tiles; the CSS is the "card face" block at the end of css/latest.css.
function cardFaceHtml(def) {
  return def.spell
    ? `<div class="cost">${def.cost}</div><div class="icon">${cardArtHtml(def)}</div><div class="paper"><div class="nm">${def.name}</div><div class="spell-tag">✨ Spell</div></div>`
    : `<div class="cost">${def.cost}</div><div class="icon">${cardArtHtml(def)}</div>${def.kw.length ? `<div class="kws">${def.kw.map(k => `<span>${KW[k].icon}</span>`).join('')}</div>` : ''}
    <div class="paper"><div class="nm">${def.name}</div><div class="stats"><span class="pw">⚔${def.power}</span><span class="hp">♥${def.grit}</span></div></div>`;
}

/* BEGIN BATTLE ENGINE */
/* Pure rules for the turn-based card battle. No DOM. Reads card stats from CARD_POOL.
   - Calm (health) 20 each. Board up to 4. Energy 1..5, +1 per turn. Second player: +1 card, and +1 energy on its first 2 turns.
   - Cards you play stay on the board and can attack from the following turn (Flicker: the same turn), once per turn.
   - An attack targets an enemy card, or the enemy Calm (at most 4 damage to Calm per attack).
   - Watch: while an enemy has a Watch card, attacks must be aimed at a Watch.
   - No retaliation: a card that survives a hit does not hit back.                                                       */
const BattleEngine = (function () {
  'use strict';
  const RULES = { spirit: 20, board: 4, hand: 3, ecap: 5, secondBonus: 1, secondBonusTurns: 2, faceCap: 4, mend: 1, echo: 2, handMax: 7, turnCap: 60, deck: 12, copies: 2 };

  const KEYWORDS = {
    guard:  { icon: '🛡️', name: 'Watch',  text: 'Enemies must attack Watch cards first.' },
    swift:  { icon: '💨', name: 'Flicker',  text: 'Can attack the turn it arrives.' },
    mend:   { icon: '🌿', name: 'Rest',   text: 'At the end of your turn, restore 1 Calm.' },
    bloom:  { icon: '🌸', name: 'Bloom',  text: 'Gains +1 power each time it attacks.' },
    shield: { icon: '🫧', name: 'Haze', text: 'Ignores the first damage it takes.' },
    echo:   { icon: '🔔', name: 'Startle',   text: 'When played, deals 2 damage to enemy Calm.' },
    thorns: { icon: '🌵', name: 'Briar', text: 'Deals 1 damage back to any card that attacks it.' },
    rally:  { icon: '📯', name: 'Chorus',  text: 'When played, your other cards gain +1 power.' },
    drain:  { icon: '🌀', name: 'Sip',  text: 'Each time it attacks, restore 2 Calm.' },
    seed:   { icon: '🌰', name: 'Echo',   text: 'When it falls, a 1/2 Afterthought grows in its place.' },
    lull:   { icon: '😴', name: 'Lull',   text: "When played, the enemy's strongest card can't attack on its next turn." },
    kin:    { icon: '🤝', name: 'Kin',    text: 'When played, gains +1/+1 for each other card of its family on your board.' },
    sting:  { icon: '🐝', name: 'Sting',  text: 'When played, deals 1 damage to the enemy card with the least health.' }
  };

  /* ---------- Boss twists ----------
     Each district boss bends one rule for its side (G.twist.side):
       roots : restores 3 Calm at the end of each of its turns
       wall  : its Watch cards have +1 health
       tide  : every 4th of its turns, the strongest card facing it washes back to its owner's hand
       bloom : every card it plays costing 1 has Bloom
     (tuned by simulation so each twist is worth roughly the same few points of win rate to the boss) */
  const TWISTS = {
    roots: { icon: '🌳', text: 'Restores 3 Calm at the end of each of its turns.' },
    wall:  { icon: '🧱', text: 'Its Watch cards have +1 health.' },
    tide:  { icon: '🌊', text: 'Every 4th turn, the tide washes your strongest card back to your hand.' },
    bloom: { icon: '🌻', text: 'Its 1-cost cards all have Bloom.' }
  };
  /* ---------- Dreamer’s Gift (v1.84.0) ----------
     One free, once-per-match ability the player picks before the match (the keep-this-hand screen), unlocked by level. It
     is usable from its own turn number (`from`), takes no energy, and none of them need aiming, so one tap does it. Neighbors don't
     have one: it is the player's edge. `level` is the Dreamer level that unlocks it (progression.js reads it). */
  const KNACKS = {
    forage:     { icon: '🧺', name: 'Forage',      level: 1,  from: 2, text: 'Draw 2 cards.' },
    soothe:     { icon: '🌿', name: 'Soothe',      level: 3,  from: 2, text: 'Restore 6 Calm and heal each of your cards by 2.' },
    sow:        { icon: '🌱', name: 'Sow',         level: 5,  from: 2, text: 'Grow two 1/2 Afterthoughts on your board (as many as fit).' },
    sparkstorm: { icon: '⚡', name: 'Spark Storm', level: 8,  from: 2, text: 'Deal 1 damage to every enemy card and 1 to enemy Calm.' },
    bulwark:    { icon: '🛡️', name: 'Bulwark',     level: 11, from: 2, text: 'Every card on your board gains a Haze.' },
    tidal:      { icon: '🌊', name: 'Tidal Hush',  level: 15, from: 2, text: "The enemy's two strongest cards can't attack on their next turn." }
  };
  function knackReady(G, who) {
    const pl = G.p[who];
    if (!pl.knack || !KNACKS[pl.knack]) return { ok: false, why: 'No Gift chosen' };
    if (G.over || G.active !== who) return { ok: false, why: 'Not your turn' };
    if (pl.knackUsed) return { ok: false, why: 'Already used this match' };
    if (pl.turns < KNACKS[pl.knack].from) return { ok: false, why: `Ready on your turn ${KNACKS[pl.knack].from}` };
    return { ok: true };
  }
  function setKnack(G, who, id) { const pl = G.p[who]; if (!pl.knackUsed) pl.knack = KNACKS[id] ? id : null; }
  function useKnack(G, who) {
    const chk = knackReady(G, who); if (!chk.ok) return chk;
    const me = G.p[who], op = G.p[1 - who];
    me.knackUsed = true;
    emit(G, 'knack', { who, id: me.knack });
    switch (me.knack) {
      case 'forage': draw(G, me); draw(G, me); break;
      case 'soothe': {
        const heal = Math.min(6, me.maxSpirit - me.spirit);
        if (heal > 0) { me.spirit += heal; emit(G, 'spirit', { who, delta: heal }); }
        me.board.forEach(x => { if (x.hp < x.grit) { const a = Math.min(2, x.grit - x.hp); x.hp += a; emit(G, 'mendcard', { who, uid: x.uid, amt: a }); } });
        break;
      }
      case 'sow': summon(G, who, 'seedling'); summon(G, who, 'seedling'); break;
      case 'sparkstorm': op.board.slice().forEach(x => zap(G, 1 - who, x, 1, false, 'knack')); spellDamageSpirit(G, 1 - who, 1, null); break;
      case 'bulwark': me.board.forEach(x => { if (!x.shield) { x.shield = true; emit(G, 'shieldup', { who, uid: x.uid }); } }); break;
      case 'tidal': op.board.slice().sort((x, y) => y.power - x.power || y.hp - x.hp).slice(0, 2).forEach(x => lullCard(G, 1 - who, x)); break;
    }
    checkEnd(G);
    return { ok: true };
  }

  /* ---------- Fate: the Arcana powers (build 111) ----------
     A second once-per-match power, taken from one of the Fates the player has attuned (js/tarot.js maps each Arcana to
     one of these ids). Like the Gift it is free, needs no aiming and is used from the player's own turn `from`; unlike the
     Gift it is situational and always costs a little (Calm, tempo or a risk), and it comes later (turn 3 to 5). Neighbors
     have none. Balanced by simulation (see HANDOFF §5): each Fate adds roughly one to five points of win rate. */
  const FATES = {
    fool:       { icon: '🃏', name: 'The Fool',           from: 3, text: 'Draw 1 card.' },
    magician:   { icon: '🎩', name: 'The Magician',       from: 5, text: 'Your strongest card gains +2 power.' },
    priestess:  { icon: '🌙', name: 'The High Priestess', from: 3, text: 'Take the most expensive card from your deck into your hand.' },
    empress:    { icon: '🌻', name: 'The Empress',        from: 4, text: 'Restore 3 Calm and heal each of your cards by 3.' },
    emperor:    { icon: '👑', name: 'The Emperor',        from: 5, text: 'Your strongest card gains a Haze. You lose 2 Calm.' },
    hierophant: { icon: '📿', name: 'The Hierophant',     from: 3, text: 'Restore 5 Calm and draw 1 card.' },
    lovers:     { icon: '💞', name: 'The Lovers',         from: 4, text: 'Your weakest card gains +1 power and +2 health.' },
    chariot:    { icon: '🏇', name: 'The Chariot',        from: 6, text: 'Your strongest card can attack again, or attack on the turn it arrives. You lose 2 Calm.' },
    strength:   { icon: '🦁', name: 'Strength',           from: 4, text: 'Every card of yours gains +1 power.' },
    hermit:     { icon: '🏮', name: 'The Hermit',         from: 4, text: 'Draw 1 card, and your weakest card gains a Haze.' },
    wheel:      { icon: '☄️', name: 'Wheel of Fortune',   from: 5, text: 'Gain 2 energy this turn.' },
    justice:    { icon: '⚖️', name: 'Justice',            from: 4, text: 'If your Calm is lower, restore half the gap (up to 6). Otherwise deal 2 to enemy Calm.' },
    hanged:     { icon: '🙃', name: 'The Hanged Man',     from: 5, text: "The enemy's strongest card can't attack on its next turn. You lose 2 Calm." },
    death:      { icon: '💀', name: 'Death',              from: 5, text: 'Deal 3 damage to the enemy card with the most power. You lose 2 Calm.' },
    temperance: { icon: '🫗', name: 'Temperance',         from: 5, text: 'Restore 2 Calm. Every card of yours gains +1 health.' },
    devil:      { icon: '😈', name: 'The Devil',          from: 4, text: 'Deal 5 damage to enemy Calm. You lose 2 Calm.' },
    tower:      { icon: '🗼', name: 'The Tower',          from: 5, text: 'Deal 2 damage to every enemy card. You lose 5 Calm.' },
    star:       { icon: '🌟', name: 'The Star',           from: 4, text: 'Restore 7 Calm.' },
    moon:       { icon: '🌕', name: 'The Moon',           from: 5, text: 'Strip every enemy Haze, then deal 1 damage to each enemy card.' },
    sun:        { icon: '☀️', name: 'The Sun',            from: 6, text: 'Every card of yours gains +1/+1.' },
    judgement:  { icon: '📯', name: 'Judgement',          from: 4, text: 'Draw until you hold 5 cards (up to 3 draws).' },
    world:      { icon: '🌍', name: 'The World',          from: 5, text: 'Restore 2 Calm and give your weakest card a Haze.' },
  };
  function fateReady(G, who) {
    const pl = G.p[who], f = pl.fate && FATES[pl.fate];
    if (!f) return { ok: false, why: 'No Fate chosen' };
    if (G.over || G.active !== who) return { ok: false, why: 'Not your turn' };
    if (pl.fateUsed) return { ok: false, why: 'Already used this match' };
    if (pl.turns < f.from) return { ok: false, why: `Ready on your turn ${f.from}` };
    return { ok: true };
  }
  function setFate(G, who, id) { const pl = G.p[who]; if (!pl.fateUsed) pl.fate = FATES[id] ? id : null; }
  function useFate(G, who) {
    const chk = fateReady(G, who); if (!chk.ok) return chk;
    const me = G.p[who], op = G.p[1 - who], id = me.fate;
    const strongest = b => b.slice().sort((x, y) => y.power - x.power || y.hp - x.hp)[0], weakest = b => b.slice().sort((x, y) => x.power - y.power || x.hp - y.hp)[0];
    const heal = (side, n) => { const pl = G.p[side], h = Math.min(n, pl.maxSpirit - pl.spirit); if (h > 0) { pl.spirit += h; emit(G, 'spirit', { who: side, delta: h }); } };
    const hurtSpirit = (side, n) => { G.p[side].spirit -= n; emit(G, 'spirit', { who: side, delta: -n, spell: true }); };
    const buff = (x, p, h) => { x.power += p; x.grit += h; x.hp += h; emit(G, 'buff', { who, uid: x.uid, amt: Math.max(p, h) }); };
    const mend = (x, n) => { const a = Math.min(n, x.grit - x.hp); if (a > 0) { x.hp += a; emit(G, 'mendcard', { who, uid: x.uid, amt: a }); } };
    const shield = x => { if (x && !x.shield) { x.shield = true; emit(G, 'shieldup', { who, uid: x.uid }); } };
    me.fateUsed = true;
    emit(G, 'fate', { who, id });
    switch (id) {
      case 'fool': draw(G, me); break;
      case 'magician': { const t = strongest(me.board); if (t) buff(t, 2, 0); break; }
      case 'priestess': { if (me.hand.length >= RULES.handMax || !me.deck.length) break; let bi = 0; me.deck.forEach((c, i) => { if (c.cost > me.deck[bi].cost) bi = i; }); const c = me.deck.splice(bi, 1)[0]; me.hand.push(c); emit(G, 'draw', { who, card: c }); break; }
      case 'empress': heal(who, 3); me.board.forEach(x => mend(x, 3)); break;
      case 'emperor': if (me.board.length) { shield(strongest(me.board)); hurtSpirit(who, 2); } break;
      case 'hierophant': heal(who, 5); draw(G, me); break;
      case 'lovers': { const t = weakest(me.board); if (t) buff(t, 1, 2); break; }
      case 'chariot': { const t = strongest(me.board); if (t) { t.ready = true; t.attacks = 0; t.lull = 0; emit(G, 'readied', { who, uid: t.uid }); hurtSpirit(who, 2); } break; }
      case 'strength': me.board.forEach(x => buff(x, 1, 0)); break;
      case 'hermit': draw(G, me); shield(weakest(me.board)); break;
      case 'wheel': me.energy += 2; break;
      case 'justice': { const gap = op.spirit - me.spirit; if (gap > 0) heal(who, Math.min(6, Math.ceil(gap / 2))); else hurtSpirit(1 - who, 2); break; }
      case 'hanged': { const t = strongest(op.board); if (t) { lullCard(G, 1 - who, t); hurtSpirit(who, 2); } break; }
      case 'death': { const t = op.board.slice().sort((x, y) => y.power - x.power || y.hp - x.hp)[0]; if (t) { zap(G, 1 - who, t, 3, false, 'fate'); hurtSpirit(who, 2); } break; }
      case 'temperance': heal(who, 2); me.board.forEach(x => buff(x, 0, 1)); break;
      case 'devil': hurtSpirit(1 - who, 5); hurtSpirit(who, 2); break;
      case 'tower': op.board.slice().forEach(x => zap(G, 1 - who, x, 2, false, 'fate')); hurtSpirit(who, 5); break;
      case 'star': heal(who, 7); break;
      case 'moon': op.board.slice().forEach(x => { x.shield = false; zap(G, 1 - who, x, 1, false, 'fate'); }); break;
      case 'sun': me.board.forEach(x => buff(x, 1, 1)); break;
      case 'judgement': for (let i = 0; i < 3 && me.hand.length < 5; i++) draw(G, me); break;
      case 'world': heal(who, 2); shield(weakest(me.board)); break;
    }
    checkEnd(G);
    return { ok: true };
  }

  /* ---------- Fate Spread (build 112) ----------
     Before a match the player can lay three cards from their deck as a tarot spread (saved with the deck slot):
       Past    - always in your opening hand (it is put back if a mulligan shuffles it away)
       Present - enters play with a Haze
       Future  - held back, and joins your hand at the start of your 4th turn
     All one family is Harmony (+2 Calm); three different families is Contrast (draw 1 extra card at the start).
     Balanced by paired simulation (400-500 games, SPREAD_RULES holds the knobs): the spread adds roughly +4 to +6 win points. A
     one-cost discount on the Present card was tried first and was worth +7 to +13 on its own, far too much, so it became a Haze.
     The same three cards can be listed in any order; spells count as having no family. Pure engine, opts.spread = [ids|null, ids|null].
     Cards are matched by id; a spread that names a card the deck does not hold is quietly ignored. */
  const SPREAD_RULES = { presentDiscount: 0, presentMinCost: 0, presentShield: 1, harmonySpirit: 2, contrastDraw: 1, futureTurn: 4 };
  /* ---------- Family passives (build 116) ----------
     A deck of 8 or more cards of one family plays with that family's passive (opts.passive = [family|null, family|null]; the deck
     screen and battle UI work the family out in archetypePassive(), js/ladder-practice.js). Wind changes the cards when the
     decks are built; Grove, Stone and Tide trigger when a card of the family is played. Re-run the simulation before changing a number. */
  const PASSIVES = {
    grove: { icon: '🌱', name: 'Rooted',   text: 'Brote cards restore 1 Calm when they arrive.' },
    stone: { icon: '⛰️', name: 'Bedrock',  text: 'Your first Recuerdo card costing 4 or more enters with a Haze.' },
    tide:  { icon: '🌊', name: 'Undertow', text: 'The first Deriva card you play each turn draws a card, if you hold 4 or fewer.' },
    wind:  { icon: '🪶', name: 'Tailwind', text: 'Flicker Susurro cards costing 2 or less get +1 power.' }
  };
  // The smaller step at 6-7 cards of a family (opts.passiveTier = [1|2, ...]; 2 is the default): the same idea, once per match.
  const MINORS = {
    grove: { icon: '🌱', name: 'Seedling', text: 'Your first Brote card each match restores 3 Calm.' },
    stone: { icon: '⛰️', name: 'Footing',  text: 'Your first Recuerdo card costing 3 or more enters with +1 health.' },
    tide:  { icon: '🌊', name: 'Ebb',      text: 'Your first Deriva card costing 3 or more refunds 1 Energy.' },
    wind:  { icon: '🪶', name: 'Breeze',   text: 'Your first Flicker Susurro card each match gets +1 power.' }
  };
  const MINOR_RULES = { groveHeal: 3, stoneMinCost: 3, tideMinCost: 3 };   // tuned by simulation
  const PASSIVE_RULES = { windMaxCost: 2, stoneMinCost: 4 };   // Wind only touches Flicker cards up to this cost (tuned by simulation)
  function applyPassiveBuild(pl) {
    if (!pl.passive || pl.passiveTier === 1) return;
    pl.deck.forEach(c => {
      if (c.spell || familyOf(c.id) !== pl.passive) return;
      if (pl.passive === 'wind' && c.kw.includes('swift') && c.cost <= PASSIVE_RULES.windMaxCost) c.power++;
    });
  }
  function passiveOnPlay(G, who, c) {
    const me = G.p[who]; if (!me.passive || familyOf(c.id) !== me.passive) return;
    if (me.passiveTier === 1) {
      if (me.minorUsed) return;
      if (me.passive === 'wind' && !(c.kw.includes('swift') && c.cost <= PASSIVE_RULES.windMaxCost)) return;
      if (me.passive === 'stone' && c.cost < MINOR_RULES.stoneMinCost) return;
      if (me.passive === 'tide' && c.cost < MINOR_RULES.tideMinCost) return;
      me.minorUsed = true;
      if (me.passive === 'grove') { const h = Math.min(MINOR_RULES.groveHeal, me.maxSpirit - me.spirit); if (h > 0) { me.spirit += h; emit(G, 'spirit', { who, delta: h }); } }
      else if (me.passive === 'stone') { c.grit++; c.hp++; emit(G, 'buff', { who, uid: c.uid, amt: 1 }); }
      else if (me.passive === 'tide') me.energy = Math.min(me.maxEnergy, me.energy + 1);
      else if (me.passive === 'wind') { c.power++; emit(G, 'buff', { who, uid: c.uid, amt: 1 }); }
      return;
    }
    if (me.passive === 'grove') { const h = Math.min(1, me.maxSpirit - me.spirit); if (h > 0) { me.spirit += h; emit(G, 'spirit', { who, delta: h }); } }
    else if (me.passive === 'stone') { if (!me.stoneShielded && !c.shield && c.cost >= PASSIVE_RULES.stoneMinCost) { me.stoneShielded = true; c.shield = true; emit(G, 'shieldup', { who, uid: c.uid }); } }
    else if (me.passive === 'tide' && !me.tideDrew && me.hand.length <= 4) { me.tideDrew = true; draw(G, me); }
  }
  function spreadBonus(ids) {
    const fams = ids.map(id => CARD_FAMILY[baseIdOf(id)] || null);
    if (fams.some(f => !f)) return { harmony: false, contrast: false };
    const n = new Set(fams).size;
    return { harmony: n === 1, contrast: n === 3 };
  }
  function layoutSpread(G, who, ids) {
    const pl = G.p[who]; if (!ids || ids.length !== 3) return false;
    const pool = pl.deck.concat(pl.hand), pick = [];
    for (const id of ids) { const c = pool.find(x => x.id === id && !pick.includes(x)); if (!c) return false; pick.push(c); }
    const [past, present, future] = pick;
    past.spread = 'past'; present.spread = 'present'; future.spread = 'future';
    present.cost = Math.max(SPREAD_RULES.presentMinCost, present.cost - SPREAD_RULES.presentDiscount);
    if (SPREAD_RULES.presentShield && !present.spell) present.shield = true;
    pl.spread = { ids: ids.slice(), past, present, future };
    // Future leaves the deck/hand until your 4th turn (a replacement is drawn if it was in the opening hand)
    const hi = pl.hand.indexOf(future); if (hi >= 0) { pl.hand.splice(hi, 1); draw(G, pl, true); }
    const di = pl.deck.indexOf(future); if (di >= 0) pl.deck.splice(di, 1);
    pl.future = future;
    keepPast(G, pl);
    const b = spreadBonus(ids);
    if (b.harmony) { pl.spirit += SPREAD_RULES.harmonySpirit; pl.maxSpirit += SPREAD_RULES.harmonySpirit; }
    for (let i = 0; i < (b.contrast ? SPREAD_RULES.contrastDraw : 0); i++) draw(G, pl, true);
    return true;
  }
  // The Past card belongs in the opening hand: if it is still in the deck, it swaps with a card that is not part of the spread.
  function keepPast(G, pl) {
    if (!pl.spread) return;
    const past = pl.spread.past;
    if (pl.hand.includes(past)) return;
    const di = pl.deck.indexOf(past); if (di < 0) return;
    const out = pl.hand.slice().reverse().find(c => !c.spread);
    if (!out) return;
    pl.deck.splice(di, 1); pl.hand.splice(pl.hand.indexOf(out), 1, past);
    pl.deck.splice(Math.floor(G.rng() * (pl.deck.length + 1)), 0, out);
  }

  function modsFor(G, side) {
    const m = Object.assign({}, G.mods || {});
    if (G.twist && G.twist.kind === 'bloom' && G.twist.side === side) { m.addKw = 'bloom'; m.addKwMaxCost = 1; }
    if (G.twist && G.twist.kind === 'wall' && G.twist.side === side) m.guardHp = 1;
    return m;
  }

  /* ---------- Spells ----------
     A spell is played from the hand, spends its energy, resolves at once and is gone - it never takes a board slot.
     target 'enemy' : needs an enemy card to aim at (Watch does not protect against spells).
     needs  'own'   : only worth casting while you have a card on the board.
     value          : how much deck-builders and the AI like it. */
  const SPELLS = {
    'spark':        { target: 'enemy', value: 5,  text: 'Deal 2 damage to an enemy card.' },
    'rain-shower':  { value: 4,  text: 'Restore 2 Calm and heal each of your cards by 1.' },
    'harvest':      { value: 6,  text: 'Draw 2 cards.' },
    'gust':         { target: 'enemy', value: 7,  text: "Return an enemy card to its owner's hand." },
    'sunbeam':      { needs: 'own', value: 6, text: 'Your cards on the board gain +1 power.' },
    'thunderclap':  { value: 8,  text: 'Deal 1 damage to every enemy card and 2 to enemy Calm.' },
    'second-wind':  { needs: 'own', value: 7, text: 'Your cards on the board can attack again this turn.' },
    'moonlit-tide': { value: 11, text: 'Deal 3 damage to every enemy card.' },
    'starfall':     { target: 'enemy', value: 14, text: 'Defeat an enemy card outright (even through Haze), then deal 3 damage to enemy Calm.' },
    'chill':        { target: 'enemy', value: 5, text: "Deal 1 damage to an enemy card. It can't attack on its next turn." },
    'overgrowth':   { needs: 'room', value: 6, text: 'Grow two 1/2 Afterthoughts on your board (as many as fit).' },
    'stone-skin':   { needs: 'guard', value: 7, text: 'Your Watch cards gain +2 health and +1 power.' },
    'undertow':     { value: 7, text: "Return every enemy card that costs 2 or less to its owner's hand." },
    'quickstep':    { needs: 'own', value: 7, text: 'Your cards that just arrived can attack right away.' },
    'picnic':       { value: 8, text: 'Restore 5 Calm and draw a card.' }
  };

  /* ---------- Card definitions, including crafted variants ----------
     A crafted card's id is  <base>~<stat>.<skill>  and is built on the fly, so saves only ever hold plain strings.
       stat  : 'p' (+1 power), 'g' (+1 health) or empty
       skill : one keyword the base card did not have, or empty
     e.g. 'sprout~p'  'moth~g.guard'  'lantern~.echo'.  A card holds at most 2 keywords. */
  let DEFS = null;
  const MAX_KEYWORDS = 2;
  function baseIdOf(id) { const i = String(id).indexOf('~'); return i < 0 ? id : id.slice(0, i); }
  function defOf(id) {
    if (!DEFS) DEFS = new Map(CARD_POOL.concat(FOE_CARDS, TOKEN_CARDS).map(c => [c.id, c]));
    let d = DEFS.get(id);
    if (d) return d;
    if (typeof id !== 'string') return undefined;
    const i = id.indexOf('~'); if (i < 0) return undefined;
    const base = DEFS.get(id.slice(0, i)); if (!base || base.spell) return undefined;   // spells have no crafted versions
    const rest = id.slice(i + 1), dot = rest.indexOf('.');
    const st = dot < 0 ? rest : rest.slice(0, dot), sk = dot < 0 ? '' : rest.slice(dot + 1);
    if (st !== '' && st !== 'p' && st !== 'g') return undefined;
    if (sk !== '' && !KEYWORDS[sk]) return undefined;
    if (st === '' && sk === '') return undefined;
    if (sk && (base.kw.includes(sk) || base.kw.length >= MAX_KEYWORDS)) return undefined;
    if (variantId(base.id, st, sk) !== id) return undefined;          // one canonical spelling per card, so a card never exists under two ids
    d = Object.assign({}, base, { id: id, name: base.name + '+', power: base.power + (st === 'p' ? 1 : 0), grit: base.grit + (st === 'g' ? 1 : 0),
                                  kw: base.kw.concat(sk ? [sk] : []), crafted: true, base: base.id, stat: st, skill: sk });
    DEFS.set(id, d);
    return d;
  }
  function variantId(baseId, stat, skill) { return baseId + '~' + (stat || '') + (skill ? '.' + skill : ''); }

  // mods.swiftBonus: extra power for every Flicker card (storms), applied to both sides alike.
  function makeCard(id, uid, mods) {
    const d = defOf(id);
    if (d.spell) return { uid, id, cost: d.cost, spell: d.spell, power: 0, grit: 0, hp: 0, kw: [], shield: false, ready: false, attacks: 0 };
    const swift = d.kw.includes('swift'), kw = d.kw.slice();
    if (mods && mods.addKw && !kw.includes(mods.addKw) && d.cost <= (mods.addKwMaxCost || 99)) kw.push(mods.addKw);
    mods = mods || {};
    const fam = mods.famHp ? CARD_FAMILY[baseIdOf(id)] === mods.famHp.family : false;
    const grit = d.grit + (mods.guardHp && kw.includes('guard') ? mods.guardHp : 0) + (mods.shieldHp && kw.includes('shield') ? mods.shieldHp : 0) + (fam ? mods.famHp.hp : 0);
    return { uid, id, cost: d.cost, power: d.power + (swift && mods.swiftBonus ? mods.swiftBonus : 0) + (mods.bloomStart && kw.includes('bloom') ? mods.bloomStart : 0), grit, hp: grit, kw,
             shield: kw.includes('shield'), ready: swift, attacks: 0, lull: 0 };
  }

  function shuffled(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* opts.spirit = [spiritForPlayer0, spiritForPlayer1] lets friendly opponents start with less Calm.
     opts.mods   = the world's effect on a match, the same for both sides (battleWorld() in js/battle-ui.js builds it):
                   swiftBonus (+power to Flicker), bloomStart (+power to Bloom), shieldHp (+health to Haze), mendBonus (Rest restores
                   more), echoBonus (Startle hits harder) and famHp { family, hp } (a district's "home turf": its family is tougher).
     opts.twist  = { side, kind } - a district boss's rule twist (see TWISTS).
     opts.knack  = [idForPlayer0, idForPlayer1] - Dreamer’s Gift choices (see KNACKS); only the player uses one.
     opts.first  = 0 or 1 - who takes the first turn (the coin/dice toss). The other seat is "second" and gets the catch-up
                   bonus: +1 card and +1 energy on its first turns. Old puzzle snapshots have no G.first, so it reads as 0. */
  function newGame(deckA, deckB, rng, opts) {
    opts = opts || {};
    // opts.seed makes the whole match reproducible (server refereeing, replays). Without one, behaviour is exactly as before.
    // The AI draws from its own stream (G.aiRng): a replay re-applies recorded actions without re-running the AI, so if the
    // AI shared G.rng the rules' own random draws (shuffles, random targets) would shift and the replay would diverge.
    const seeded = !rng && opts.seed != null;
    rng = rng || (seeded ? makeRng(opts.seed) : Math.random);
    let uid = 1;
    const mods = opts.mods || {};
    const first = opts.first === 1 ? 1 : 0;
    const G = { rng, aiRng: seeded ? makeRng(String(opts.seed) + ':ai') : null, turn: 0, first, active: first, over: false, winner: null, why: null, events: [], aiMemo: null, mods, twist: opts.twist || null, p: [] };
    const mk = (deck, i) => shuffled(deck, rng).map(id => makeCard(id, uid++, modsFor(G, i)));
    const sp = opts.spirit || [RULES.spirit, RULES.spirit];
    G.p = [0, 1].map(i => ({ idx: i, spirit: sp[i], maxSpirit: sp[i], deck: mk(i === 0 ? deckA : deckB, i), hand: [], board: [], turns: 0, energy: 0, maxEnergy: 0 }));
    G.uid = uid;                                   // later cards (Afterthoughts) keep numbering from here
    (opts.knack || []).forEach((id, i) => { if (id && KNACKS[id]) G.p[i].knack = id; });
    (opts.fate || []).forEach((id, i) => { if (id && FATES[id]) G.p[i].fate = id; });
    (opts.passive || []).forEach((f, i) => { if (f && PASSIVES[f]) { G.p[i].passive = f; G.p[i].passiveTier = (opts.passiveTier || [])[i] === 1 ? 1 : 2; applyPassiveBuild(G.p[i]); } });
    G.p.forEach((pl, i) => { const n = RULES.hand + (i !== first ? 1 : 0); for (let k = 0; k < n; k++) draw(G, pl, true); });
    (opts.spread || []).forEach((ids, i) => { if (ids) layoutSpread(G, i, ids); });
    // opts.startSpirit: begin below full (the Dreamers’ Cup carries your Calm from one round to the next)
    (opts.startSpirit || []).forEach((v, i) => { if (typeof v === 'number') G.p[i].spirit = Math.max(1, Math.min(v, G.p[i].maxSpirit)); });
    return G;
  }

  function emit(G, type, data) { const ev = Object.assign({ type }, data); G.events.push(ev); if (typeof notePlayerPlay === 'function') notePlayerPlay(ev); }

  function draw(G, pl, silent) {
    if (!pl.deck.length) return null;
    const c = pl.deck.pop();
    if (pl.hand.length >= RULES.handMax) { if (!silent) emit(G, 'burn', { who: pl.idx, card: c }); return null; }
    pl.hand.push(c); if (!silent) emit(G, 'draw', { who: pl.idx, card: c });
    return c;
  }

  function startTurn(G) {
    const me = G.p[G.active];
    me.turns++; me.tideDrew = false;
    const bonus = (G.active !== (G.first || 0) && me.turns <= RULES.secondBonusTurns) ? RULES.secondBonus : 0;
    me.maxEnergy = Math.min(me.turns + bonus, RULES.ecap);
    me.energy = me.maxEnergy;
    draw(G, me);
    // the Future card of a Fate Spread arrives on your 4th turn (or the first turn after that your hand has room)
    if (me.future && me.turns >= SPREAD_RULES.futureTurn && me.hand.length < RULES.handMax) { const f = me.future; me.future = null; me.hand.push(f); emit(G, 'draw', { who: G.active, card: f, future: true }); }
    me.board.forEach(c => { c.ready = true; });
    emit(G, 'turn', { who: G.active, energy: me.energy });
    if (G.twist && G.twist.kind === 'tide' && G.twist.side === G.active && me.turns % 4 === 0) tide(G);
  }
  // The tide washes the strongest card facing the boss back into its owner's hand (or under their deck if the hand is full).
  function tide(G) {
    const foe = 1 - G.twist.side;
    if (!G.p[foe].board.length) return;
    emit(G, 'tide', {});
    G.p.forEach((pl, side) => {
      if (side !== foe || !pl.board.length) return;
      const t = pl.board.slice().sort((a, b) => b.power - a.power)[0];
      pl.board.splice(pl.board.indexOf(t), 1);
      emit(G, 'bounce', { who: side, card: t });
      const back = makeCard(t.id, t.uid, modsFor(G, side));
      if (pl.hand.length >= RULES.handMax) pl.deck.unshift(back); else pl.hand.push(back);
    });
  }

  function canPlay(G, who, uid) {
    if (G.over || G.active !== who) return { ok: false, why: 'Not your turn' };
    const me = G.p[who], c = me.hand.find(x => x.uid === uid);
    if (!c) return { ok: false, why: 'Not in hand' };
    if (c.cost > me.energy) return { ok: false, why: 'Needs ' + c.cost + ' energy' };
    if (c.spell) {
      const fx = SPELLS[c.spell];
      if (fx.target === 'enemy' && !G.p[1 - who].board.length) return { ok: false, why: 'No enemy card to aim at' };
      if (fx.needs === 'own' && !me.board.length) return { ok: false, why: 'You need a card on the board first' };
      if (fx.needs === 'room' && me.board.length >= RULES.board) return { ok: false, why: 'Your board is full' };
      if (fx.needs === 'guard' && !me.board.some(x => x.kw.includes('guard'))) return { ok: false, why: 'You need a Watch card on the board' };
      return { ok: true };
    }
    if (me.board.length >= RULES.board) return { ok: false, why: 'Your board is full' };
    return { ok: true };
  }
  function spellNeedsTarget(c) { return !!(c && c.spell && SPELLS[c.spell].target === 'enemy'); }

  function playCard(G, who, uid, target) {
    const chk = canPlay(G, who, uid); if (!chk.ok) return chk;
    const me = G.p[who], op = G.p[1 - who];
    const c = me.hand.find(x => x.uid === uid);
    if (c.spell) return castSpell(G, who, c, target);
    me.hand.splice(me.hand.indexOf(c), 1);
    me.energy -= c.cost; me.board.push(c);
    emit(G, 'play', { who, card: c });
    passiveOnPlay(G, who, c);
    if (c.kw.includes('echo')) { const dmg = RULES.echo + ((G.mods && G.mods.echoBonus) || 0); op.spirit -= dmg; emit(G, 'spirit', { who: 1 - who, delta: -dmg, source: c, echo: true }); }
    if (c.kw.includes('rally')) me.board.forEach(x => { if (x !== c) { x.power++; emit(G, 'buff', { who, uid: x.uid, amt: 1, rally: true }); } });
    if (c.kw.includes('kin')) {
      const fam = familyOf(c.id), n = fam ? me.board.filter(x => x !== c && familyOf(x.id) === fam).length : 0;
      if (n) { c.power += n; c.grit += n; c.hp += n; emit(G, 'kin', { who, uid: c.uid, n }); }
    }
    if (c.kw.includes('sting') && op.board.length) {
      const t = op.board.slice().sort((a, b) => a.hp - b.hp)[0];
      zap(G, 1 - who, t, 1, false, 'sting');
    }
    if (c.kw.includes('lull') && op.board.length) lullCard(G, 1 - who, op.board.slice().sort((a, b) => b.power - a.power || b.hp - a.hp)[0]);
    checkEnd(G);
    return { ok: true };
  }

  /* ---------- casting ---------- */
  // Spell damage to a card: a Haze still soaks the first hit, exactly like an attack.
  function zap(G, side, t, dmg, pierce, tag) {
    const pl = G.p[side];
    let blocked = false;
    if (pierce) { t.hp = 0; t.shield = false; }
    else if (t.shield) { t.shield = false; blocked = true; }
    else t.hp -= dmg;
    emit(G, 'zap', { who: side, uid: t.uid, dmg: pierce ? 0 : dmg, blocked, pierce: !!pierce, tag: tag || null });
    if (t.hp <= 0 && pl.board.includes(t)) fall(G, side, t);
  }
  // A card leaves the board for good. Echo cards leave an Afterthought behind (if there is room).
  function fall(G, side, t) {
    const pl = G.p[side];
    if (pl.board.includes(t)) pl.board.splice(pl.board.indexOf(t), 1);
    emit(G, 'faint', { who: side, card: t });
    if (t.kw.includes('seed')) summon(G, side, 'seedling');
  }
  function summon(G, side, id) {
    const pl = G.p[side];
    if (pl.board.length >= RULES.board) return null;
    const c = makeCard(id, G.uid = (G.uid || 1000) + 1, modsFor(G, side));
    pl.board.push(c);
    emit(G, 'summon', { who: side, card: c });
    return c;
  }
  function familyOf(id) { return CARD_FAMILY[baseIdOf(id)] || null; }
  // Lull: the card can't attack until its owner's next turn is over.
  function lullCard(G, side, t) { if (!t) return; t.lull = 1; emit(G, 'lull', { who: side, uid: t.uid }); }
  function spellDamageSpirit(G, side, n, card) { G.p[side].spirit -= n; emit(G, 'spirit', { who: side, delta: -n, source: card, spell: true }); }

  function castSpell(G, who, c, target) {
    const me = G.p[who], op = G.p[1 - who], fx = SPELLS[c.spell];
    let t = null;
    if (fx.target === 'enemy') {
      t = target && target.kind === 'card' ? op.board.find(x => x.uid === target.uid) : null;
      if (!t) t = bestSpellTarget(G, who, c);          // no (or a stale) target: aim for the caster, as the AI would
      if (!t) return { ok: false, why: 'No enemy card to aim at' };
    }
    me.hand.splice(me.hand.indexOf(c), 1);
    me.energy -= c.cost;
    emit(G, 'spell', { who, card: c, target: t ? { kind: 'card', uid: t.uid } : null });
    switch (c.spell) {
      case 'spark': zap(G, 1 - who, t, 2); break;
      case 'rain-shower': {
        const heal = Math.min(2, me.maxSpirit - me.spirit);
        if (heal > 0) { me.spirit += heal; emit(G, 'spirit', { who, delta: heal, source: c }); }
        me.board.forEach(x => { if (x.hp < x.grit) { x.hp++; emit(G, 'mendcard', { who, uid: x.uid, amt: 1 }); } });
        break;
      }
      case 'harvest': draw(G, me); draw(G, me); break;
      case 'gust': {
        op.board.splice(op.board.indexOf(t), 1);
        const back = makeCard(t.id, t.uid, modsFor(G, 1 - who));      // comes back fresh, as if never played
        emit(G, 'bounce', { who: 1 - who, card: t });
        if (op.hand.length >= RULES.handMax) { op.deck.unshift(back); } else op.hand.push(back);
        break;
      }
      case 'sunbeam': me.board.forEach(x => { x.power++; emit(G, 'buff', { who, uid: x.uid, amt: 1 }); }); break;
      case 'thunderclap': op.board.slice().forEach(x => zap(G, 1 - who, x, 1)); spellDamageSpirit(G, 1 - who, 2, c); break;
      case 'second-wind': me.board.forEach(x => { x.ready = true; x.attacks = 0; emit(G, 'readied', { who, uid: x.uid }); }); break;
      case 'moonlit-tide': op.board.slice().forEach(x => zap(G, 1 - who, x, 3)); break;
      case 'starfall': zap(G, 1 - who, t, 0, true); spellDamageSpirit(G, 1 - who, 3, c); break;
      case 'chill': zap(G, 1 - who, t, 1, false, 'chill'); if (op.board.includes(t)) lullCard(G, 1 - who, t); break;
      case 'overgrowth': summon(G, who, 'seedling'); summon(G, who, 'seedling'); break;
      case 'stone-skin': me.board.forEach(x => { if (x.kw.includes('guard')) { x.grit += 2; x.hp += 2; x.power += 1; emit(G, 'buff', { who, uid: x.uid, amt: 2, skin: true }); } }); break;
      case 'undertow': op.board.slice().forEach(x => {
        if (x.cost > 2) return;
        op.board.splice(op.board.indexOf(x), 1);
        const back = makeCard(x.id, x.uid, modsFor(G, 1 - who));
        emit(G, 'bounce', { who: 1 - who, card: x });
        if (op.hand.length >= RULES.handMax) op.deck.unshift(back); else op.hand.push(back);
      }); break;
      case 'quickstep': me.board.forEach(x => { if (!x.ready) { x.ready = true; emit(G, 'readied', { who, uid: x.uid }); } }); break;
      case 'picnic': {
        const heal = Math.min(5, me.maxSpirit - me.spirit);
        if (heal > 0) { me.spirit += heal; emit(G, 'spirit', { who, delta: heal, source: c }); }
        draw(G, me); break;
      }
    }
    checkEnd(G);
    return { ok: true };
  }

  // How good a spell is right now for `who`, and where it would aim. score <= 0 means "not worth casting".
  function spellPlan(G, who, c) {
    const me = G.p[who], op = G.p[1 - who];
    const killable = dmg => op.board.filter(x => !x.shield && x.hp <= dmg);
    const bestBy = list => list.slice().sort((a, b) => valueOf(b) - valueOf(a))[0] || null;
    switch (c.spell) {
      case 'spark': {
        const k = bestBy(killable(2)); if (k) return { score: 2 + valueOf(k) / 3, target: k };
        const t = bestBy(op.board.filter(x => !x.shield)) || bestBy(op.board); return { score: t ? (t.shield ? 0.6 : 1.4) : 0, target: t };
      }
      case 'rain-shower': { const s = Math.min(2, me.maxSpirit - me.spirit) + me.board.filter(x => x.hp < x.grit).length; return { score: s >= 2 ? s : 0 }; }
      case 'harvest': return { score: me.deck.length ? (me.hand.length <= 3 ? 3.2 : 1.6) : 0 };
      case 'gust': { const t = bestBy(op.board); return { score: t ? valueOf(t) / 3 : 0, target: t }; }
      case 'sunbeam': return { score: me.board.length * 1.3 };
      case 'thunderclap': return { score: (killable(1).length * 3 + op.board.length + 2) / 1.8 };
      case 'second-wind': return { score: me.board.filter(x => x.attacks > 0).length * 1.8 };
      case 'moonlit-tide': { const s = killable(3).reduce((n, x) => n + valueOf(x), 0) / 3 + op.board.length * 0.5; return { score: op.board.length ? s : 0 }; }
      case 'starfall': { const t = bestBy(op.board); return { score: t ? 2 + valueOf(t) / 4 : 0, target: t }; }
      case 'chill': {
        const k = bestBy(killable(1)); if (k) return { score: 2 + valueOf(k) / 3, target: k };
        const t = bestBy(op.board.filter(x => x.power >= 3 && !x.shield)); return { score: t ? 1.6 + t.power / 5 : 0, target: t };
      }
      case 'overgrowth': { const room = RULES.board - me.board.length; return { score: room >= 2 ? 2.8 : room === 1 ? 1.2 : 0 }; }
      case 'stone-skin': return { score: me.board.filter(x => x.kw.includes('guard')).length * 1.7 };
      case 'undertow': { const n = op.board.filter(x => x.cost <= 2).length; return { score: n >= 2 ? n * 1.4 : n ? 0.8 : 0 }; }
      case 'quickstep': { const n = me.board.filter(x => !x.ready && !x.lull).length; return { score: n * 1.7 }; }
      case 'picnic': { const heal = Math.min(5, me.maxSpirit - me.spirit); return { score: heal >= 3 ? 1.2 + heal * 0.7 : me.deck.length && me.hand.length <= 2 ? 1.5 : 0 }; }
    }
    return { score: 0 };
  }
  function bestSpellTarget(G, who, c) { return spellPlan(G, who, c).target || G.p[1 - who].board[0] || null; }

  function guards(pl) { return pl.board.filter(c => c.kw.includes('guard')); }

  function legalTargets(G, who, attackerUid) {
    const me = G.p[who], op = G.p[1 - who];
    const a = me.board.find(c => c.uid === attackerUid);
    if (!a || !a.ready || a.lull || a.attacks > 0 || G.over || G.active !== who) return [];
    const g = guards(op);
    if (g.length) return g.map(c => ({ kind: 'card', uid: c.uid }));
    return op.board.map(c => ({ kind: 'card', uid: c.uid })).concat([{ kind: 'spirit' }]);
  }

  function attack(G, who, attackerUid, target) {
    if (G.over || G.active !== who) return { ok: false, why: 'Not your turn' };
    const me = G.p[who], op = G.p[1 - who];
    const a = me.board.find(c => c.uid === attackerUid);
    if (!a) return { ok: false, why: 'No such card' };
    if (!a.ready) return { ok: false, why: 'Just arrived' };
    if (a.lull) return { ok: false, why: 'Lulled: it rests this turn' };
    if (a.attacks > 0) return { ok: false, why: 'Already attacked' };
    const legal = legalTargets(G, who, attackerUid);
    if (!legal.some(t => t.kind === target.kind && (t.kind === 'spirit' || t.uid === target.uid)))
      return { ok: false, why: guards(op).length ? 'A Watch must be attacked first' : 'Invalid target' };

    if (a.kw.includes('bloom')) { a.power++; emit(G, 'grow', { card: a }); }
    a.attacks++;
    if (target.kind === 'spirit') {
      const dmg = Math.min(a.power, RULES.faceCap);
      op.spirit -= dmg;
      emit(G, 'attack', { who, attacker: a, target: { kind: 'spirit' }, dmg });
      emit(G, 'spirit', { who: 1 - who, delta: -dmg, source: a });
    } else {
      const t = op.board.find(c => c.uid === target.uid);
      let dmg = a.power, blocked = false;
      if (t.shield) { t.shield = false; dmg = 0; blocked = true; } else t.hp -= dmg;
      emit(G, 'attack', { who, attacker: a, target: { kind: 'card', uid: t.uid }, dmg, blocked });
      if (t.hp <= 0) fall(G, 1 - who, t);
      if (t.kw.includes('thorns') && me.board.includes(a)) zap(G, who, a, 1, false, 'thorns');         // thorns prick back, even as they fall
    }
    if (a.kw.includes('drain') && me.spirit < me.maxSpirit) {
      const heal = Math.min(2, me.maxSpirit - me.spirit); me.spirit += heal; emit(G, 'spirit', { who, delta: heal, source: a });
    }
    checkEnd(G);
    return { ok: true };
  }

  function endTurn(G, who) {
    if (G.over || G.active !== who) return { ok: false };
    const me = G.p[who];
    me.board.forEach(c => { if (c.kw.includes('mend') && me.spirit < me.maxSpirit) { const heal = RULES.mend + ((G.mods && G.mods.mendBonus) || 0); me.spirit = Math.min(me.maxSpirit, me.spirit + heal); emit(G, 'spirit', { who, delta: heal, source: c }); } });
    if (G.twist && G.twist.kind === 'roots' && G.twist.side === who && me.spirit < me.maxSpirit) {
      const heal = Math.min(3, me.maxSpirit - me.spirit); me.spirit += heal; emit(G, 'spirit', { who, delta: heal, twist: true });
    }
    me.board.forEach(c => { c.attacks = 0; c.lull = 0; });
    G.active = 1 - who; G.turn++;
    checkEnd(G);
    if (!G.over) startTurn(G);
    return { ok: true };
  }

  function finish(G, winner, why) { G.over = true; G.winner = winner; G.why = why || 'spirit'; emit(G, 'end', { winner, why: G.why }); }

  function checkEnd(G) {
    if (G.over) return;
    const [a, b] = G.p;
    if (a.spirit <= 0 || b.spirit <= 0) { finish(G, (a.spirit <= 0 && b.spirit <= 0) ? G.active : (a.spirit <= 0 ? 1 : 0), 'spirit'); return; }
    for (let i = 0; i < 2; i++) { const pl = G.p[i]; if (!pl.deck.length && !pl.hand.length && !pl.board.length) { finish(G, 1 - i, 'outlasted'); return; } }
    if (G.turn >= RULES.turnCap) finish(G, a.spirit >= b.spirit ? 0 : 1, 'time');
  }

  function forfeit(G, who) { if (!G.over) finish(G, 1 - who, 'yield'); }
  // A head start before the first turn: extra Calm (raising the cap with it) and extra cards.
  function boost(G, who, b) {
    const pl = G.p[who];
    if (b.spirit) { pl.spirit += b.spirit; pl.maxSpirit += b.spirit; }
    for (let i = 0; i < (b.draw || 0); i++) draw(G, pl, true);
  }

  /* Shuffles a player's opening hand back into their deck and redraws the same number of cards.
     Used once, before the first turn, so a bad opening hand isn't a run-ender. */
  function mulligan(G, who) {
    const pl = G.p[who], n = pl.hand.length;
    pl.deck = shuffled(pl.deck.concat(pl.hand), G.rng);
    pl.hand = [];
    for (let i = 0; i < n; i++) draw(G, pl, true);
    keepPast(G, pl);                      // a Fate Spread's Past card stays in the opening hand
  }

  /* ---------- Opponent AI ----------
     aiNextAction() decides ONE action and applies nothing, so the UI can animate each step as it happens.
     level: 'gentle' (often plays at random and forgets to attack sensibly), 'normal', 'smart'. */
  function valueOf(c) { return c.power + c.hp * 0.8 + (c.kw.length ? 2 : 0) + (c.lull ? -1 : 0); }
  const RANDOMNESS = { gentle: 0.55, normal: 0.25, smart: 0 };

  function aiNextAction(G, who, level) {
    const me = G.p[who], op = G.p[1 - who], rng = G.aiRng || G.rng;
    const r = RANDOMNESS[level] != null ? RANDOMNESS[level] : 0.25;
    if (!G.aiMemo || G.aiMemo.turn !== G.turn) G.aiMemo = { turn: G.turn, stopPlaying: false };
    const memo = G.aiMemo;

    if (!memo.stopPlaying) {
      // Spells are only considered when they would actually do something right now.
      const plans = new Map();
      me.hand.forEach(c => { if (c.spell) plans.set(c.uid, spellPlan(G, who, c)); });
      const affordable = me.hand.filter(c => c.cost <= me.energy && canPlay(G, who, c.uid).ok && (!c.spell || plans.get(c.uid).score > 0));
      if (affordable.length) {
        const threat = op.board.reduce((s, c) => s + c.power, 0), mine = me.board.reduce((s, c) => s + c.power, 0);
        const score = c => {
          if (c.spell) return plans.get(c.uid).score;
          let s = valueOf(c) / c.cost;
          if (threat > mine + 2 && (c.kw.includes('guard') || c.kw.includes('shield'))) s += 1.5;
          if (op.spirit <= 8 && (c.kw.includes('swift') || c.kw.includes('echo'))) s += 2;
          if (me.spirit <= 8 && c.kw.includes('mend')) s += 1.5;
          return s;
        };
        const pick = (rng() < r) ? affordable[Math.floor(rng() * affordable.length)] : affordable.slice().sort((a, b) => score(b) - score(a))[0];
        if (rng() < r * 0.4) memo.stopPlaying = true;          // a gentle opponent sometimes just holds its cards
        else {
          const plan = pick.spell ? plans.get(pick.uid) : null;
          return { type: 'play', uid: pick.uid, target: plan && plan.target ? { kind: 'card', uid: plan.target.uid } : undefined };
        }
      }
    }

    for (const a of me.board) {
      const targets = legalTargets(G, who, a.uid);
      if (!targets.length) continue;
      let choice;
      if (rng() < r) choice = targets[Math.floor(rng() * targets.length)];
      else {
        const guardT = targets.filter(t => t.kind === 'card' && op.board.find(c => c.uid === t.uid && c.kw.includes('guard')));
        if (guardT.length) choice = guardT.slice().sort((x, y) => op.board.find(c => c.uid === x.uid).hp - op.board.find(c => c.uid === y.uid).hp)[0];
        else {
          const killable = targets.filter(t => t.kind === 'card').map(t => op.board.find(c => c.uid === t.uid)).filter(c => c && !c.shield && a.power >= c.hp);
          if (killable.length) { const k = killable.sort((x, y) => valueOf(y) - valueOf(x))[0]; choice = { kind: 'card', uid: k.uid }; }
          else choice = { kind: 'spirit' };
        }
      }
      return { type: 'attack', uid: a.uid, target: choice };
    }
    return { type: 'end' };
  }

  function applyAction(G, who, a) { return a.type === 'play' ? playCard(G, who, a.uid, a.target) : a.type === 'attack' ? attack(G, who, a.uid, a.target) : { ok: true }; }

  /* Whole AI turn at once: used by tests and simulations. The UI uses aiNextAction() step by step. */
  function aiTurn(G, who, level) {
    const steps = [];
    for (let i = 0; i < 40 && !G.over; i++) {
      const a = aiNextAction(G, who, level);
      if (a.type === 'end') { if (G.p[who].fate && fateReady(G, who).ok && useFate(G, who).ok) { steps.push({ type: 'fate' }); continue; } break; }   // a foe with a Fate uses it once it has nothing better to do
      steps.push(a); applyAction(G, who, a);
    }
    return steps;
  }


  /* ---------- Deck suggestions ----------
     Builds a sensible 12-card deck from what someone owns: at most 2 copies of a card, and a healthy cost curve
     (about 6 cheap cards, 4 mid, 2 expensive), because simulation showed top-heavy decks lose badly.
     Anything in `keep` is respected first, so this can also "fill the remaining slots". */
  function suggestDeck(counts, keep) {
    const used = {}, deck = [];
    const free = id => Math.min(counts[id] || 0, RULES.copies) - (used[id] || 0) > 0;
    const add = id => { deck.push(id); used[id] = (used[id] || 0) + 1; };
    (keep || []).forEach(id => { if (deck.length < RULES.deck && defOf(id) && free(id)) add(id); });
    const bucket = id => { const c = defOf(id).cost; return c <= 2 ? 'lo' : c === 3 ? 'mid' : 'hi'; };
    const score = id => { const d = defOf(id); return d.spell ? SPELLS[d.spell].value : d.power + d.grit + 2 * d.kw.length; };
    const ids = Object.keys(counts).filter(id => defOf(id) && counts[id] > 0);
    const quota = { lo: 6, mid: 4, hi: 2 };
    // A deck needs bodies on the board, so the curve pass takes at most 3 spells.
    let spells = deck.filter(id => defOf(id).spell).length;
    const room = id => !defOf(id).spell || spells < 3;
    deck.forEach(id => { quota[bucket(id)]--; });
    ['lo', 'mid', 'hi'].forEach(b => {
      const pool = ids.filter(id => bucket(id) === b).sort((x, y) => score(y) - score(x));
      for (const id of pool) { while (quota[b] > 0 && deck.length < RULES.deck && free(id) && room(id)) { add(id); quota[b]--; if (defOf(id).spell) spells++; } }
    });
    // Anything still empty (a small collection): best remaining cards, cheapest first among equals
    const rest = ids.slice().sort((x, y) => score(y) - score(x) || defOf(x).cost - defOf(y).cost);
    for (const id of rest) { while (deck.length < RULES.deck && free(id)) add(id); }
    return deck;
  }

  /* ---------- Seeds, match records and replay (no DOM, no Math.random: runs unchanged in Node) ----------
     makeRng(seed) is a small seeded generator (mulberry32; a string seed is hashed first), so the same seed always gives the same
     shuffles. A match is fully described by a record { seed, decks: [A, B], opts, actions }, where an action is one of
       { type: 'start' } (once, first) | { type: 'mulligan', who } | { type: 'play', who, uid, target } |
       { type: 'attack', who, uid, target } | { type: 'knack', who } | { type: 'fate', who } | { type: 'end', who }.
     replay(record) rebuilds the game from the seed and re-applies the actions, so a server can referee a match by checking the
     moves it receives against the same rules the client runs, and a finished match can be replayed move by move.
     simulate() plays a whole AI-vs-AI match and returns its record. Keep every random draw in the rules on G.rng and every AI
     decision on G.aiRng, or replays drift. */
  function makeRng(seed) {
    let a;
    if (typeof seed === 'string') { a = 2166136261; for (let i = 0; i < seed.length; i++) { a ^= seed.charCodeAt(i); a = Math.imul(a, 16777619); } a >>>= 0; }
    else a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function step(G, a) {
    switch (a.type) {
      case 'start': startTurn(G); return { ok: true };
      case 'mulligan': mulligan(G, a.who); return { ok: true };
      case 'play': case 'attack': return applyAction(G, a.who, a);
      case 'knack': return useKnack(G, a.who);
      case 'fate': return useFate(G, a.who);
      case 'end': endTurn(G, a.who); return { ok: true };
    }
    return { ok: false, why: 'unknown action ' + a.type };
  }
  function replay(rec) {
    const G = newGame(rec.decks[0], rec.decks[1], null, Object.assign({}, rec.opts, { seed: rec.seed }));
    for (let i = 0; i < rec.actions.length; i++) {
      const r = step(G, rec.actions[i]);
      if (r && r.ok === false) { G.replayError = { at: i, action: rec.actions[i], why: r.why || 'rejected' }; break; }
    }
    return G;
  }
  function simulate(seed, deckA, deckB, o) {
    o = o || {};
    const levels = o.levels || ['smart', 'smart'], rec = { seed, decks: [deckA, deckB], opts: o.opts || {}, actions: [{ type: 'start' }] };
    const G = newGame(deckA, deckB, null, Object.assign({}, rec.opts, { seed }));
    startTurn(G);
    // o.mulligan = [seat0, seat1]: the keep-hand screen comes after the first startTurn in the real game, before any play.
    [0, 1].forEach(who => { if (o.mulligan && o.mulligan[who]) { mulligan(G, who); rec.actions.push({ type: 'mulligan', who }); } });
    for (let t = 0; t < (o.maxTurns || 200) && !G.over; t++) {
      const who = G.active;
      aiTurn(G, who, levels[who]).forEach(a => rec.actions.push(Object.assign({ who }, a)));
      if (!G.over) { endTurn(G, who); rec.actions.push({ type: 'end', who }); }
    }
    return { G, record: rec };
  }

  return { makeRng, step, replay, simulate, RULES, KEYWORDS, SPELLS, TWISTS, KNACKS, knackReady, setKnack, useKnack, FATES, fateReady, setFate, useFate, spreadBonus, layoutSpread, SPREAD_RULES, PASSIVES, MINORS, PASSIVE_RULES, MINOR_RULES, MAX_KEYWORDS, defOf, baseIdOf, variantId, suggestDeck, makeCard, familyOf, newGame, startTurn, canPlay, playCard, spellNeedsTarget, legalTargets, attack, endTurn, forfeit, boost, mulligan, aiNextAction, applyAction, aiTurn, guards, valueOf };
})();
/* END BATTLE ENGINE */

const KW = BattleEngine.KEYWORDS;

const RARITY_LABEL = { common: 'common', rare: 'rare', ultra: 'ultra rare', super: 'super ultra rare', mythic: 'mythic', divine: 'divine', atlas: 'atlas' };

// Each town has its own population - a name pool and a species/face pool - so neighbors read as a
// different crowd from one district to the next, not just the same people in a different building.
const NPC_POOLS = {
  square: { names: ['Wren', 'Sable', 'Fenn', 'Marlow', 'Tansy', 'Rowan', 'Juniper', 'Cove'],
             icons: ['🧑', '👩', '🧔', '👨', '🧑‍🦱', '🧑‍🦳', '🧕', '🧑‍🎨'] },
  market: { names: ['Clover', 'Hazel', 'Bramble', 'Pip', 'Nutmeg', 'Acorn', 'Chestnut', 'Ginger'],
             icons: ['🐰', '🐹', '🐭', '🐿️'] },
};
function npcPool(key) { return NPC_POOLS[key] || NPC_POOLS.square; }
// Names stay unique within a district, since friendship is remembered by name.
function randomNpcName(key, taken) {
  const p = npcPool(key), free = p.names.filter(n => !(taken || []).includes(n)), from = free.length ? free : p.names;
  return from[Math.floor(Math.random() * from.length)];
}
function namesInUse(data, except) { return data ? data.npcs.filter(n => n !== except).map(n => n.name) : []; }
// A stable "portrait" per opponent: the same neighbor keeps the same face for the session, bosses/cellar foes use their own icon.
function opponentPortrait(opponent) {
  if (!opponent) return '🙂';
  if (opponent.icon) return opponent.icon;
  if (opponent.isBoss) {
    const district = opponent.dungeon ? opponent.dungeon.district : (opponent.id ? opponent.id.replace(/^boss-/, '') : null);
    if (district && DISTRICTS[district]) return DISTRICTS[district].bossIcon;
    return '👑';
  }
  const key = String(opponent.id || opponent.name || '');
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const district = /^npc-([a-z]+)-/.exec(opponent.id || '');
  const icons = npcPool(district ? district[1] : state.currentDistrict).icons;
  return icons[h % icons.length];
}

const DISTRICTS = {
  square: { name: 'El Umbral', theme: 'square', unlockWins: 0, unlockLevel: 1, boss: 'Duermevela', bossIcon: '🌳',
    scenery: [{ icon: '🪑', title: 'A quiet bench', desc: 'A good place to sit and watch the town go by.' },
              { icon: '⛲', title: 'La Fuente', desc: 'It hums a half-remembered song.' }] },
  market: { name: 'El Mercado de Susurros', theme: 'market', unlockWins: 1, unlockLevel: 2, boss: 'Murmullo', bossIcon: '🦡',
    scenery: [{ icon: '🏪', title: 'A small stall', desc: 'The vendor is out today, but the awning gives good shade.' },
              { icon: '🧺', title: 'A basket of goods', desc: 'Nothing to take, but it smells like fresh bread.' }] },
  harbor: { name: 'La Orilla del Arrullo', theme: 'harbor', unlockWins: 3, unlockLevel: 4, boss: 'Marea Lenta', bossIcon: '⚓',
    scenery: [{ icon: '⛵', title: 'A moored boat', desc: 'It rocks gently against the dock.' },
              { icon: '🦭', title: 'A resting seal', desc: 'It barely opens an eye as you pass.' }] },
  garden: { name: 'El Jardín Lúcido', theme: 'garden', unlockWins: 5, unlockLevel: 6, boss: 'Ensueño', bossIcon: '🌻',
    scenery: [{ icon: '🌻', title: 'Sunflowers', desc: 'They turn slowly to follow the light.' },
              { icon: '🪴', title: 'A potted fern', desc: 'Someone tends this carefully.' }] }
};
// A district needs both enough wins and enough XP level to open - wins alone no longer carries you there.
function districtUnlocked(key) {
  const def = DISTRICTS[key];
  return state.wins >= def.unlockWins && ensureLevel().level >= (def.unlockLevel || 1);
}
function districtLockReason(key) {
  const def = DISTRICTS[key], pr = ensureLevel();
  const needWins = Math.max(0, def.unlockWins - state.wins), needLevel = Math.max(0, (def.unlockLevel || 1) - pr.level);
  const parts = [];
  if (needWins > 0) parts.push(`${needWins} more win${needWins === 1 ? '' : 's'}`);
  if (needLevel > 0) parts.push(`level ${def.unlockLevel}`);
  return parts.length ? `Needs ${parts.join(' and ')}` : '';
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function freshProgress() {
  return {
    lastGift: null,        // 'YYYY-MM-DD' of last claimed daily gift
    giftStreak: 0,
    questDay: null,        // day the quest set belongs to
    quests: [],            // [{ id, progress, claimed }]
    weekKey: null,          // week the weekly quest set belongs to
    weeklyQuests: [],       // [{ id, base, claimed }]
    questHistory: [],       // completed quests (daily + weekly), newest first - shown in Journal's Quest Log
    totals: { cardsFound: 0, battlesWon: 0, bossesWon: 0, steps: 0 },
    achievements: [],      // unlocked achievement ids
    almanacSeen: null,     // card ids the person has already looked at in the Almanac (null = never opened)
    pebbles: 0,            // soft currency earned by releasing spare copies
    packsOpened: 0,
    released: 0,           // lifetime spare cards released
    battleV2: false,       // has this save been moved to the turn-based battle (12-card decks, starter cards)?
    seenBattleHelp: false, // has the how-to-play sheet been shown?
    deckEdits: 0,          // times the player has changed their deck
    crafted: 0,            // cards made in the Workshop
    skillsCrafted: 0,      // of those, how many gained a skill
    discovered: [],        // base card ids seen once but since crafted away, so the Almanac never forgets them
    rewardsV2: false,      // have battle rewards been moved to 'rare or better'?
    mapV2: false           // has the town been moved to the tile map?
  };
}

let state = {
  ownedCards: [],
  deck: [],
  wins: 0,
  currentDistrict: 'square',
  visitedDistricts: ['square'],
  playerPos: { x: 7, y: 15 },
  districtData: {},
  character: { emoji: '🧑', color: '#a8d4cc', accessory: '', name: 'You', unlockedEmojis: ['🧑'], unlockedAccessories: [''], unlockedColors: ['#a8d4cc'] },
  progress: freshProgress(),
  sky: { elapsedMs: 8 * 60 * 1000, lastTickAt: null },   // elapsedMs position within one in-game day; start at mid-morning
  weather: { current: 'clear', changesAt: 0, elapsed: 0 },
  decorationInventory: {}   // itemId -> count owned but not placed, see DECORATION_ITEMS
};

let townTiles = [];
let inBattle = false;
let battle = null;


