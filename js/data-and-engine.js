const STORAGE_KEY = 'quiet-commons-state-v4';
const OLD_STORAGE_KEY = 'quiet-commons-state-v3';
const PREFS_KEY = 'quiet-commons-prefs';
const TOWN_SIZE = 6;
const DECK_SIZE = 12;   // must equal BattleEngine.RULES.deck
const MAX_COPIES = 2;   // must equal BattleEngine.RULES.copies
const ITEM_DESPAWN_MS = 30000;
const ITEM_RESPAWN_MS = 20000;
const NPC_RESPAWN_MS = 180000;

// Pebbles: earned by releasing spare copies, spent on card packs.
// A pack costs more than any single release pays, so it can never be looped for profit.
const RELEASE_VALUE = { common: 1, rare: 3, ultra: 8, super: 20, mythic: 50 };
// Pack odds are flat on purpose: they must NOT scale with wins, or a veteran's packs would
// out-pay their own cost and release-and-rebuy would become free money (checked by simulation).
const PACKS = [
  { id: 'puddle', name: 'Puddle Pack', icon: '💦', cost: 4,  floorLabel: 'Any card',           desc: 'A cheap, quick draw - mostly commons, but every card has a shot.',
    odds: { common: 0.78, rare: 0.17, ultra: 0.04, super: 0.008, mythic: 0.002 } },
  { id: 'meadow', name: 'Meadow Pack', icon: '🌾', cost: 8,  floorLabel: 'Any card',           desc: 'Mostly everyday finds, with a chance of something better.',
    odds: { common: 0.62, rare: 0.27, ultra: 0.08, super: 0.025, mythic: 0.005 } },
  { id: 'brook',  name: 'Brook Pack',  icon: '💧', cost: 25, floorLabel: 'Rare or better',     desc: 'A rare card is guaranteed.',
    odds: { common: 0, rare: 0.70, ultra: 0.22, super: 0.065, mythic: 0.015 } },
  { id: 'orchard', name: 'Orchard Pack', icon: '🍂', cost: 45, floorLabel: 'Rare or better',   desc: 'Better odds than a Brook Pack for the same guarantee.',
    odds: { common: 0, rare: 0.52, ultra: 0.35, super: 0.10, mythic: 0.03 } },
  { id: 'aurora', name: 'Aurora Pack', icon: '🌌', cost: 80, floorLabel: 'Ultra rare or better', desc: 'An ultra rare card is guaranteed.',
    odds: { common: 0, rare: 0, ultra: 0.78, super: 0.18, mythic: 0.04 } },
  { id: 'zenith', name: 'Zenith Pack', icon: '⛰️', cost: 220, floorLabel: 'Super or better', desc: 'A super rare card is guaranteed, with a real shot at mythic.',
    odds: { common: 0, rare: 0, ultra: 0, super: 0.82, mythic: 0.18 } },
  { id: 'spellbook', name: 'Spellbook Pack', icon: '📜', cost: 30, floorLabel: 'Always a spell', only: 'spell', desc: 'A single spell card: instant effects that never take a board slot.',
    odds: { common: 0.45, rare: 0.36, ultra: 0.13, super: 0.045, mythic: 0.015 } }
];   // defeated neighbors return after 3 minutes

// Shop > Items: decorations the player places into Town Square. Buying one adds it to the player's
// decoration inventory (state.decorationInventory) rather than spending it immediately - see
// buyDecoration / startPlacingDecoration / handleDecorationTap for the buy -> store -> place flow.
// cat groups the Items shop's filter chips: 'plant', 'seating', 'lighting', 'ornament'.
const DECORATION_ITEMS = [
  { id: 'planter', name: 'Potted Plant', icon: '🪴', cost: 10, desc: 'A leafy little planter for a quiet corner.', cat: 'plant' },
  { id: 'flag', name: 'Little Flag', icon: '🚩', cost: 10, desc: 'Marks the spot as yours.', cat: 'ornament' },
  { id: 'wildflowers', name: 'Wildflower Patch', icon: '🌼', cost: 12, desc: "A little wild, on purpose.", cat: 'plant' },
  { id: 'basket', name: 'Woven Basket', icon: '🧺', cost: 12, desc: 'Left out, waiting to be filled.', cat: 'ornament' },
  { id: 'gardenrock', name: 'Garden Stone', icon: '🪨', cost: 14, desc: 'Smooth and cool to the touch.', cat: 'ornament' },
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
  // museum: given for completing a museum wing, never sold
  { id: 'pond-diorama', name: 'Pond Diorama', icon: '🪷', cost: 0, desc: 'A thank-you from the museum for the Pond Wing.', museum: true },
  { id: 'meadow-painting', name: 'Meadow Painting', icon: '🖼️', cost: 0, desc: 'A thank-you from the museum for the Meadow Wing.', museum: true },
  { id: 'hearth-urn', name: 'Hearth Urn', icon: '⚱️', cost: 0, desc: 'A thank-you from the museum for Stone & Hearth.', museum: true },
  { id: 'festival-mask', name: 'Festival Mask', icon: '👺', cost: 0, desc: 'A thank-you from the museum for the Festival Hall.', museum: true },
  { id: 'star-telescope', name: 'Star Telescope', icon: '🔭', cost: 0, desc: 'A thank-you from the museum for the Night Sky Gallery.', museum: true },
  { id: 'legend-statue', name: 'Legend Statue', icon: '🗽', cost: 0, desc: 'A thank-you from the museum for the Hall of Legends.', museum: true }
];

const CARD_POOL = [
  { id: 'sprout', name: 'Sprout', icon: '🌱', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['bloom'] },
  { id: 'pebble', name: 'Pebble', icon: '🪨', rarity: 'common', cost: 1, power: 1, grit: 3, kw: ['guard'] },
  { id: 'reed', name: 'Reed', icon: '🌾', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['swift'] },
  { id: 'droplet', name: 'Droplet', icon: '💧', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['mend'] },
  { id: 'toadstool', name: 'Toadstool', icon: '🍄', rarity: 'common', cost: 2, power: 3, grit: 2, kw: ['guard'] },
  { id: 'bubble', name: 'Bubble', icon: '🫧', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['shield'] },
  { id: 'flintstone', name: 'Flint', icon: '🪨', rarity: 'common', cost: 2, power: 4, grit: 1, kw: ['swift'] },
  { id: 'moth', name: 'Moth', icon: '🦋', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['bloom'] },

  { id: 'lily', name: 'Lily', icon: '🪷', rarity: 'rare', cost: 2, power: 2, grit: 3, kw: ['mend'] },
  { id: 'blossom', name: 'Blossom', icon: '🌸', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['bloom'] },
  { id: 'geode', name: 'Geode', icon: '💎', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard'] },
  { id: 'tide', name: 'Tide', icon: '🌊', rarity: 'rare', cost: 3, power: 4, grit: 3, kw: ['echo'] },
  { id: 'feather', name: 'Feather', icon: '🪶', rarity: 'rare', cost: 2, power: 3, grit: 1, kw: ['swift'] },
  { id: 'boulder', name: 'Boulder', icon: '🗿', rarity: 'rare', cost: 3, power: 3, grit: 6, kw: ['guard'] },

  { id: 'cloud', name: 'Cloud', icon: '☁️', rarity: 'ultra', cost: 3, power: 4, grit: 3, kw: ['shield'] },
  { id: 'dove', name: 'Dove', icon: '🕊️', rarity: 'ultra', cost: 3, power: 3, grit: 3, kw: ['mend', 'swift'] },
  { id: 'crystal-spire', name: 'Crystal Spire', icon: '🔷', rarity: 'ultra', cost: 4, power: 6, grit: 4, kw: ['shield'] },
  { id: 'gale', name: 'Gale', icon: '🌬️', rarity: 'ultra', cost: 3, power: 5, grit: 2, kw: ['swift'] },
  { id: 'ember-fox', name: 'Ember Fox', icon: '🦊', rarity: 'ultra', cost: 3, power: 4, grit: 3, kw: ['echo'] },

  { id: 'lantern', name: 'Lantern', icon: '🏮', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['guard'] },
  { id: 'starlight', name: 'Starlight', icon: '✨', rarity: 'super', cost: 4, power: 7, grit: 4, kw: ['echo'] },
  { id: 'moonstone', name: 'Moonstone', icon: '🔮', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['shield'] },

  { id: 'aurora-stag', name: 'Aurora Stag', icon: '🦌', rarity: 'mythic', cost: 5, power: 7, grit: 7, kw: ['bloom'] },
  { id: 'deep-current', name: 'Deep Current', icon: '🐋', rarity: 'mythic', cost: 5, power: 6, grit: 8, kw: ['mend'] },
  { id: 'mountain-heart', name: 'Mountain Heart', icon: '⛰️', rarity: 'mythic', cost: 5, power: 8, grit: 9, kw: ['guard'] },
  { id: 'sakura-petal', name: 'Sakura Petal', icon: '🌺', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['swift'] },
  { id: 'koi', name: 'Koi', icon: '🐟', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['mend'] },
  { id: 'origami-crane', name: 'Origami Crane', icon: '🪽', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['swift'] },
  { id: 'rice-cake', name: 'Rice Cake', icon: '🍡', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['guard'] },
  { id: 'paper-fan', name: 'Paper Fan', icon: '🪭', rarity: 'common', cost: 2, power: 3, grit: 2, kw: ['echo'] },
  { id: 'lucky-cat', name: 'Lucky Cat', icon: '🐱', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['bloom'] },
  { id: 'bamboo-grove', name: 'Bamboo Grove', icon: '🎍', rarity: 'rare', cost: 2, power: 2, grit: 3, kw: ['mend'] },
  { id: 'torii-gate', name: 'Torii Gate', icon: '⛩️', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard'] },
  { id: 'paper-lantern', name: 'Paper Lantern', icon: '🎐', rarity: 'rare', cost: 2, power: 3, grit: 1, kw: ['swift'] },
  { id: 'folding-screen', name: 'Folding Screen', icon: '🎏', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['shield'] },
  { id: 'temple-bell', name: 'Temple Bell', icon: '🔔', rarity: 'rare', cost: 3, power: 4, grit: 3, kw: ['echo'] },
  { id: 'moonlit-shrine', name: 'Moonlit Shrine', icon: '🌙', rarity: 'ultra', cost: 3, power: 4, grit: 3, kw: ['echo'] },
  { id: 'crane-dance', name: 'Crane Dance', icon: '🎋', rarity: 'ultra', cost: 3, power: 5, grit: 2, kw: ['swift'] },
  { id: 'moon-viewing', name: 'Moon Viewing', icon: '🌕', rarity: 'ultra', cost: 4, power: 3, grit: 3, kw: ['mend', 'swift'] },
  { id: 'stone-lantern', name: 'Stone Lantern', icon: '🗼', rarity: 'ultra', cost: 4, power: 3, grit: 4, kw: ['guard'] },
  { id: 'koi-ascending', name: 'Koi Ascending', icon: '🐉', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['mend'] },
  { id: 'autumn-maple', name: 'Autumn Maple', icon: '🍁', rarity: 'rare', cost: 3, power: 4, grit: 2, kw: ['echo'] },
  { id: 'cherry-blossom-storm', name: 'Cherry Blossom Storm', icon: '🍃', rarity: 'ultra', cost: 4, power: 4, grit: 3, kw: ['bloom'] },
  { id: 'festival-drum', name: 'Festival Drum', icon: '🥁', rarity: 'rare', cost: 2, power: 3, grit: 3, kw: ['swift'] },

  { id: 'acorn', name: 'Acorn', icon: '🌰', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['mend'] },
  { id: 'clover', name: 'Clover', icon: '🍀', rarity: 'common', cost: 1, power: 2, grit: 1, kw: ['bloom'] },
  { id: 'twig-bundle', name: 'Twig Bundle', icon: '🪵', rarity: 'common', cost: 1, power: 1, grit: 3, kw: ['guard'] },
  { id: 'snail', name: 'Snail', icon: '🐌', rarity: 'common', cost: 2, power: 1, grit: 4, kw: ['guard'] },
  { id: 'firefly', name: 'Firefly', icon: '🪲', rarity: 'common', cost: 2, power: 3, grit: 1, kw: ['swift'] },
  { id: 'dew-leaf', name: 'Dew Leaf', icon: '🍂', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['mend'] },

  { id: 'thistle', name: 'Thistle', icon: '🌵', rarity: 'rare', cost: 2, power: 3, grit: 2, kw: ['guard'] },
  { id: 'hollow-log', name: 'Hollow Log', icon: '🪵', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['shield'] },
  { id: 'windchime', name: 'Windchime', icon: '🎶', rarity: 'rare', cost: 2, power: 2, grit: 3, kw: ['echo'] },
  { id: 'foxglove', name: 'Foxglove', icon: '🌷', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['mend'] },
  { id: 'stray-kitten', name: 'Stray Kitten', icon: '🐈', rarity: 'rare', cost: 2, power: 3, grit: 2, kw: ['swift'] },
  { id: 'old-kettle', name: 'Old Kettle', icon: '🫖', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['mend'] },

  { id: 'heron', name: 'Heron', icon: '🦢', rarity: 'ultra', cost: 4, power: 4, grit: 4, kw: ['mend'] },
  { id: 'hedgehog', name: 'Hedgehog', icon: '🦔', rarity: 'ultra', cost: 3, power: 3, grit: 5, kw: ['guard'] },
  { id: 'paper-boat', name: 'Paper Boat', icon: '⛵', rarity: 'ultra', cost: 3, power: 4, grit: 2, kw: ['swift', 'echo'] },
  { id: 'glass-float', name: 'Glass Float', icon: '🔵', rarity: 'ultra', cost: 4, power: 3, grit: 5, kw: ['shield'] },
  { id: 'lantern-fish', name: 'Lantern Fish', icon: '🐠', rarity: 'ultra', cost: 3, power: 5, grit: 3, kw: ['echo'] },
  { id: 'pinewood-owl', name: 'Pinewood Owl', icon: '🦉', rarity: 'ultra', cost: 4, power: 4, grit: 4, kw: ['guard', 'mend'] },
  { id: 'thunderhead', name: 'Thunderhead', icon: '🌩️', rarity: 'ultra', cost: 4, power: 6, grit: 2, kw: ['swift'] },
  { id: 'copper-carp', name: 'Copper Carp', icon: '🎏', rarity: 'ultra', cost: 3, power: 4, grit: 4, kw: ['bloom'] },
  { id: 'nightjar', name: 'Nightjar', icon: '🦅', rarity: 'ultra', cost: 3, power: 5, grit: 3, kw: ['swift'] },
  { id: 'quartz-cluster', name: 'Quartz Cluster', icon: '💠', rarity: 'ultra', cost: 4, power: 3, grit: 6, kw: ['shield'] },

  { id: 'harvest-lantern', name: 'Harvest Lantern', icon: '🎃', rarity: 'super', cost: 4, power: 6, grit: 5, kw: ['guard'] },
  { id: 'silver-fox', name: 'Silver Fox', icon: '🦊', rarity: 'super', cost: 4, power: 6, grit: 4, kw: ['swift'] },
  { id: 'wishing-well', name: 'Wishing Well', icon: '⭐', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['mend'] },
  { id: 'storm-lily', name: 'Storm Lily', icon: '🌼', rarity: 'super', cost: 4, power: 6, grit: 6, kw: ['bloom'] },
  { id: 'copper-kettle-spirit', name: 'Kettle Spirit', icon: '👻', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['shield'] },
  { id: 'winter-hare', name: 'Winter Hare', icon: '🐇', rarity: 'super', cost: 4, power: 7, grit: 3, kw: ['swift'] },
  { id: 'jade-turtle', name: 'Jade Turtle', icon: '🐢', rarity: 'super', cost: 4, power: 4, grit: 8, kw: ['guard'] },
  { id: 'echoing-bell', name: 'Echoing Bell', icon: '🔔', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['echo'] },
  { id: 'moth-queen', name: 'Moth Queen', icon: '🦋', rarity: 'super', cost: 4, power: 6, grit: 5, kw: ['bloom'] },
  { id: 'river-otter', name: 'River Otter', icon: '🦦', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['mend'] },
  { id: 'copper-stag-beetle', name: 'Stag Beetle', icon: '🪲', rarity: 'super', cost: 4, power: 7, grit: 4, kw: ['guard'] },
  { id: 'northern-lights', name: 'Northern Lights', icon: '🌌', rarity: 'super', cost: 4, power: 6, grit: 4, kw: ['echo'] },
  { id: 'garden-spirit', name: 'Garden Spirit', icon: '🧚', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['bloom'] },
  { id: 'obsidian-shard', name: 'Obsidian Shard', icon: '⚫', rarity: 'super', cost: 4, power: 7, grit: 5, kw: ['shield'] },
  { id: 'paper-phoenix', name: 'Paper Phoenix', icon: '🪶', rarity: 'super', cost: 4, power: 6, grit: 4, kw: ['echo'] },
  { id: 'moss-golem', name: 'Moss Golem', icon: '🗿', rarity: 'super', cost: 4, power: 4, grit: 7, kw: ['guard'] },
  { id: 'twilight-crane', name: 'Twilight Crane', icon: '🕊️', rarity: 'super', cost: 4, power: 5, grit: 6, kw: ['swift'] },

  { id: 'sky-whale', name: 'Sky Whale', icon: '🐳', rarity: 'mythic', cost: 5, power: 8, grit: 8, kw: ['mend'] },
  { id: 'ancient-oak', name: 'Ancient Oak', icon: '🌳', rarity: 'mythic', cost: 5, power: 6, grit: 10, kw: ['guard'] },
  { id: 'phoenix-ember', name: 'Phoenix Ember', icon: '🔥', rarity: 'mythic', cost: 5, power: 9, grit: 6, kw: ['echo'] },
  { id: 'moon-dragon', name: 'Moon Dragon', icon: '🐲', rarity: 'mythic', cost: 5, power: 8, grit: 7, kw: ['swift'] },
  { id: 'starfall-unicorn', name: 'Starfall Unicorn', icon: '🦄', rarity: 'mythic', cost: 5, power: 7, grit: 8, kw: ['bloom'] },
  { id: 'glacier-spirit', name: 'Glacier Spirit', icon: '🧊', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['shield'] },
  { id: 'thundering-ram', name: 'Thundering Ram', icon: '🐏', rarity: 'mythic', cost: 5, power: 9, grit: 7, kw: ['guard'] },
  { id: 'garden-titan', name: 'Garden Titan', icon: '🌻', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['mend'] },
  { id: 'void-koi', name: 'Void Koi', icon: '🐟', rarity: 'mythic', cost: 5, power: 8, grit: 8, kw: ['echo'] },
  { id: 'celestial-owl', name: 'Celestial Owl', icon: '🦉', rarity: 'mythic', cost: 5, power: 7, grit: 7, kw: ['swift'] },
  { id: 'emberwing-phoenix', name: 'Emberwing Phoenix', icon: '🦅', rarity: 'mythic', cost: 5, power: 9, grit: 6, kw: ['bloom'] },
  { id: 'crystal-golem', name: 'Crystal Golem', icon: '💎', rarity: 'mythic', cost: 5, power: 6, grit: 10, kw: ['shield'] },
  { id: 'wandering-comet', name: 'Wandering Comet', icon: '☄️', rarity: 'mythic', cost: 5, power: 9, grit: 5, kw: ['swift'] },
  { id: 'sunken-leviathan', name: 'Sunken Leviathan', icon: '🐙', rarity: 'mythic', cost: 5, power: 8, grit: 9, kw: ['guard'] },
  { id: 'ironroot-treant', name: 'Ironroot Treant', icon: '🌲', rarity: 'mythic', cost: 5, power: 6, grit: 9, kw: ['mend'] },
  { id: 'silver-phoenix', name: 'Silver Phoenix', icon: '🕊️', rarity: 'mythic', cost: 5, power: 8, grit: 7, kw: ['echo'] },
  { id: 'eclipse-panther', name: 'Eclipse Panther', icon: '🐆', rarity: 'mythic', cost: 5, power: 9, grit: 6, kw: ['swift'] },

  // Thorns, Rally and Drain
  { id: 'bramble', name: 'Bramble', icon: '🥀', rarity: 'common', cost: 1, power: 1, grit: 3, kw: ['thorns'] },
  { id: 'morning-bugle', name: 'Morning Bugle', icon: '📯', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['rally'] },
  { id: 'dusk-bat', name: 'Dusk Bat', icon: '🦇', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['drain'] },
  { id: 'rosebush', name: 'Rosebush', icon: '🌹', rarity: 'rare', cost: 2, power: 2, grit: 4, kw: ['thorns'] },
  { id: 'village-banner', name: 'Village Banner', icon: '🚩', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['rally'] },
  { id: 'whirlpool', name: 'Whirlpool', icon: '🌀', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['drain'] },
  { id: 'cactus-keeper', name: 'Cactus Keeper', icon: '🌵', rarity: 'ultra', cost: 3, power: 3, grit: 5, kw: ['thorns', 'guard'] },
  { id: 'lion-dancer', name: 'Lion Dancer', icon: '🦁', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['rally', 'swift'] },
  { id: 'mist-wraith', name: 'Mist Wraith', icon: '🌫️', rarity: 'super', cost: 4, power: 5, grit: 5, kw: ['drain', 'shield'] },
  { id: 'bramble-king', name: 'Bramble King', icon: '👑', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['thorns', 'rally'] },

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
  { id: 'deep-wyrm', name: 'Deep Wyrm', icon: '🐉', rarity: 'mythic', cost: 5, power: 9, grit: 9, kw: ['bloom', 'guard'], exclusive: 'cellar' },
  { id: 'rooks-ace', name: "Rook's Ace", icon: '🎭', rarity: 'mythic', cost: 4, power: 7, grit: 6, kw: ['swift', 'echo'], exclusive: 'rival' },
  // v1.82.0 - four families (CARD_FAMILY below), one per district, and the Seed / Lull / Kin / Sting keywords. Appended at the
  // end on purpose: deck share codes store cards by their position in this list.
  // Grove (Hollow Garden): Seed leaves a Seedling behind, Kin grows with its family.
  { id: 'seedpod', name: 'Seedpod', icon: '🫘', rarity: 'common', cost: 1, power: 1, grit: 2, kw: ['seed'] },
  { id: 'fern-sprite', name: 'Fern Sprite', icon: '🌿', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['seed'] },
  { id: 'moss-hare', name: 'Moss Hare', icon: '🐇', rarity: 'rare', cost: 3, power: 3, grit: 3, kw: ['kin'] },
  { id: 'dandelion', name: 'Dandelion', icon: '🏵️', rarity: 'rare', cost: 3, power: 2, grit: 3, kw: ['seed', 'bloom'] },
  { id: 'oak-warden', name: 'Oak Warden', icon: '🌳', rarity: 'super', cost: 4, power: 4, grit: 6, kw: ['seed', 'guard'] },
  { id: 'world-tree', name: 'World Tree', icon: '🎄', rarity: 'mythic', cost: 5, power: 6, grit: 9, kw: ['seed', 'kin'] },
  // Stone (Town Square): steady bodies that dig the small things out.
  { id: 'stone-hen', name: 'Stone Hen', icon: '🐔', rarity: 'common', cost: 2, power: 2, grit: 3, kw: ['kin'] },
  { id: 'cliff-goat', name: 'Cliff Goat', icon: '🐐', rarity: 'rare', cost: 3, power: 2, grit: 5, kw: ['guard', 'kin'] },
  { id: 'badger', name: 'Badger', icon: '🦡', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['sting'] },
  { id: 'quarry-bear', name: 'Quarry Bear', icon: '🐻', rarity: 'ultra', cost: 4, power: 4, grit: 6, kw: ['sting', 'guard'] },
  { id: 'mossy-titan', name: 'Mossy Titan', icon: '🗻', rarity: 'mythic', cost: 5, power: 7, grit: 9, kw: ['guard', 'kin'] },
  // Tide (Quiet Harbor): Lull holds the enemy's best card back for a turn.
  { id: 'hermit-crab', name: 'Hermit Crab', icon: '🦀', rarity: 'common', cost: 2, power: 1, grit: 3, kw: ['lull'] },
  { id: 'puffer', name: 'Puffer', icon: '🐡', rarity: 'common', cost: 2, power: 2, grit: 3, kw: ['thorns'] },
  { id: 'harbor-seal', name: 'Harbor Seal', icon: '🦭', rarity: 'rare', cost: 3, power: 3, grit: 4, kw: ['lull'] },
  { id: 'moon-jelly', name: 'Moon Jelly', icon: '🪼', rarity: 'ultra', cost: 3, power: 2, grit: 4, kw: ['lull', 'shield'] },
  { id: 'tide-caller', name: 'Tide Caller', icon: '🐚', rarity: 'ultra', cost: 4, power: 4, grit: 5, kw: ['lull', 'mend'] },
  { id: 'kraken', name: 'Kraken', icon: '🦑', rarity: 'mythic', cost: 5, power: 6, grit: 8, kw: ['lull', 'drain'] },
  // Wind (Market Row): fast cards that sting on the way in.
  { id: 'honeybee', name: 'Honeybee', icon: '🐝', rarity: 'common', cost: 2, power: 2, grit: 2, kw: ['sting'] },
  { id: 'market-sparrow', name: 'Market Sparrow', icon: '🐦', rarity: 'rare', cost: 3, power: 3, grit: 2, kw: ['swift', 'sting'] },
  { id: 'kite-runner', name: 'Kite Runner', icon: '🪁', rarity: 'ultra', cost: 3, power: 4, grit: 2, kw: ['swift', 'kin'] },
  { id: 'storm-petrel', name: 'Storm Petrel', icon: '🐦‍⬛', rarity: 'super', cost: 4, power: 6, grit: 3, kw: ['swift', 'sting'] },
  { id: 'thunder-roc', name: 'Thunder Roc', icon: '🦅', rarity: 'mythic', cost: 5, power: 8, grit: 6, kw: ['swift', 'sting'] },
  // New spells (effects in BattleEngine.SPELLS)
  { id: 'chill', name: 'Chill', icon: '❄️', rarity: 'common', cost: 1, power: 0, grit: 0, kw: [], spell: 'chill' },
  { id: 'overgrowth', name: 'Overgrowth', icon: '🌱', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'overgrowth' },
  { id: 'stone-skin', name: 'Stone Skin', icon: '🧱', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'stone-skin' },
  { id: 'undertow', name: 'Undertow', icon: '🌀', rarity: 'rare', cost: 3, power: 0, grit: 0, kw: [], spell: 'undertow' },
  { id: 'quickstep', name: 'Quickstep', icon: '👟', rarity: 'ultra', cost: 3, power: 0, grit: 0, kw: [], spell: 'quickstep' },
  { id: 'picnic', name: 'Picnic', icon: '🧺', rarity: 'rare', cost: 2, power: 0, grit: 0, kw: [], spell: 'picnic' },
];
/* Foe cards: unique cards that only opponents carry (neighbors, bosses, cellar floors). They are deliberately NOT in
   CARD_POOL - so they never show up in packs, the Index, deck codes or rewards - but defOf() knows them, so the battle
   engine and card art treat them like any other card. `tier` is the earliest foe tier that may field them (see
   foeTierFor in progression.js). */
const FOE_CARDS = [
  { id: 'market-cat',     name: 'Market Cat',     icon: '🐈', rarity: 'rare',   cost: 2, power: 3, grit: 2, kw: ['swift'],           foe: true, tier: 1 },
  { id: 'lamplighter',    name: 'Lamplighter',    icon: '🏮', rarity: 'rare',   cost: 2, power: 2, grit: 3, kw: ['mend'],            foe: true, tier: 1 },
  { id: 'pebble-golem',   name: 'Pebble Golem',   icon: '🗿', rarity: 'rare',   cost: 3, power: 3, grit: 5, kw: ['guard'],           foe: true, tier: 1 },
  { id: 'thorn-hare',     name: 'Thorn Hare',     icon: '🐇', rarity: 'ultra',  cost: 3, power: 4, grit: 3, kw: ['swift', 'thorns'], foe: true, tier: 2 },
  { id: 'wisp-keeper',    name: 'Wisp Keeper',    icon: '🕯️', rarity: 'ultra',  cost: 3, power: 3, grit: 4, kw: ['mend', 'shield'],  foe: true, tier: 2 },
  { id: 'bell-ringer',    name: 'Bell Ringer',    icon: '🛎️', rarity: 'ultra',  cost: 3, power: 3, grit: 4, kw: ['echo', 'rally'],   foe: true, tier: 2 },
  { id: 'storm-heron',    name: 'Storm Heron',    icon: '🦅', rarity: 'super',  cost: 4, power: 5, grit: 4, kw: ['swift', 'drain'],  foe: true, tier: 3 },
  { id: 'iron-tortoise',  name: 'Iron Tortoise',  icon: '🐢', rarity: 'super',  cost: 4, power: 4, grit: 7, kw: ['guard', 'thorns'], foe: true, tier: 3 },
  { id: 'cinder-fox',      name: 'Cinder Fox',     icon: '🦊', rarity: 'super',  cost: 4, power: 6, grit: 4, kw: ['swift', 'bloom'],  foe: true, tier: 3 },
  { id: 'night-regent',   name: 'Night Regent',   icon: '🦉', rarity: 'mythic', cost: 5, power: 7, grit: 7, kw: ['guard', 'drain'],  foe: true, tier: 4 },
  { id: 'tide-leviathan', name: 'Tide Leviathan', icon: '🐋', rarity: 'mythic', cost: 5, power: 7, grit: 8, kw: ['shield', 'echo'],  foe: true, tier: 4 },
];
// Families (v1.82.0): each district leans on one. Kin cards grow with the other cards of their family on your board, and a
// district's neighbors and boss build decks that favour their family (buildDeckForOpponent). Spells and unlisted cards have none.
const FAMILIES = {
  grove: { icon: '🌿', name: 'Grove', district: 'garden' },
  stone: { icon: '🪨', name: 'Stone', district: 'square' },
  tide:  { icon: '🌊', name: 'Tide',  district: 'harbor' },
  wind:  { icon: '🪶', name: 'Wind',  district: 'market' }
};
const CARD_FAMILY = (() => {
  const lists = {
    grove: 'sprout reed moth lily blossom toadstool sakura-petal bamboo-grove autumn-maple cherry-blossom-storm acorn clover twig-bundle snail firefly dew-leaf thistle hollow-log foxglove hedgehog storm-lily garden-spirit moth-queen aurora-stag ancient-oak starfall-unicorn garden-titan ironroot-treant bramble rosebush cactus-keeper bramble-king glowworm harvest-lantern winter-hare seedpod fern-sprite moss-hare dandelion oak-warden world-tree',
    stone: 'pebble flintstone geode boulder crystal-spire lantern moonstone mountain-heart rice-cake torii-gate stone-lantern quartz-cluster old-kettle copper-kettle-spirit jade-turtle obsidian-shard moss-golem glacier-spirit crystal-golem thundering-ram copper-stag-beetle echo-cavern deep-wyrm stone-hen cliff-goat badger quarry-bear mossy-titan',
    tide: 'droplet bubble tide koi koi-ascending deep-current whirlpool lantern-fish copper-carp glass-float river-otter void-koi sunken-leviathan wishing-well heron paper-boat hermit-crab puffer harbor-seal moon-jelly tide-caller kraken',
    wind: 'feather cloud dove gale origami-crane paper-fan paper-lantern folding-screen temple-bell moonlit-shrine crane-dance moon-viewing festival-drum windchime stray-kitten nightjar thunderhead twilight-crane paper-phoenix sky-whale phoenix-ember moon-dragon celestial-owl emberwing-phoenix wandering-comet silver-phoenix eclipse-panther lion-dancer morning-bugle dusk-bat village-banner pinewood-owl silver-fox ember-fox starlight northern-lights rooks-ace echoing-bell lucky-cat mist-wraith honeybee market-sparrow kite-runner storm-petrel thunder-roc'
  };
  const m = {};
  Object.keys(lists).forEach(f => lists[f].split(' ').forEach(id => { m[id] = f; }));
  return m;
})();
// Tokens that cards create mid-battle. Never in packs, pools, decks or the Index; BattleEngine.defOf still knows them.
const TOKEN_CARDS = [
  { id: 'seedling', name: 'Seedling', icon: '🌱', rarity: 'common', cost: 0, power: 1, grit: 2, kw: [], token: true }
];
const EXCLUSIVE_HINT = { cellar: 'found deep in the cellar', rival: "a rival's final prize" };

const RARITY_ORDER = ['common', 'rare', 'ultra', 'super', 'mythic'];

// Card art: a CARD_POOL entry may optionally carry `art: 'assets/cards/<id>.png'`. Every place that shows
// a card's own icon/art (not a keyword icon, recipe icon, etc.) should call this instead of reading
// `def.icon` directly, so art can be dropped in card-by-card with the emoji staying as a fallback for
// every card that doesn't have one yet. The <img> is sized in em so it drops into any of the existing
// font-size-driven icon containers (see .card-art-img in style.css) without per-call-site CSS.
function cardArtHtml(def, cls) {
  return def.art
    ? `<img class="card-art-img${cls ? ' ' + cls : ''}" src="${def.art}" alt="${escapeHtml(def.name)}">`
    : `<span class="card-emoji${cls ? ' ' + cls : ''}">${def.icon}</span>`;
}

// The full card-face markup (cost/art/name/keywords/stats) shared by the battle-hand card (btCardEl) and
// the card-reveal popup (showCardReveal) - built from a card's base def rather than a live battle instance,
// so it always shows the card's resting stats (def.grit, not a damaged battle-instance hp).
function cardFaceHtml(def) {
  return def.spell
    ? `<div class="cost">${def.cost}</div><div class="icon">${cardArtHtml(def)}</div><div class="nm">${def.name}</div><div class="spell-tag">✨ Spell</div>`
    : `<div class="cost">${def.cost}</div><div class="icon">${cardArtHtml(def)}</div><div class="nm">${def.name}</div>
    <div class="kws">${def.kw.map(k => `<span>${KW[k].icon}</span>`).join('')}</div>
    <div class="stats"><span class="pw">⚔${def.power}</span><span class="hp">♥${def.grit}</span></div>`;
}

/* BEGIN BATTLE ENGINE */
/* Pure rules for the turn-based card battle. No DOM. Reads card stats from CARD_POOL.
   - Spirit (health) 20 each. Board up to 4. Energy 1..5, +1 per turn. Second player: +1 card, and +1 energy on its first 2 turns.
   - Cards you play stay on the board and can attack from the following turn (Swift: the same turn), once per turn.
   - An attack targets an enemy card, or the enemy Spirit (at most 4 damage to Spirit per attack).
   - Guard: while an enemy has a Guard card, attacks must be aimed at a Guard.
   - No retaliation: a card that survives a hit does not hit back.                                                       */
const BattleEngine = (function () {
  'use strict';
  const RULES = { spirit: 20, board: 4, hand: 3, ecap: 5, secondBonus: 1, secondBonusTurns: 2, faceCap: 4, mend: 1, echo: 2, handMax: 7, turnCap: 60, deck: 12, copies: 2 };

  const KEYWORDS = {
    guard:  { icon: '🛡️', name: 'Guard',  text: 'Enemies must attack Guard cards first.' },
    swift:  { icon: '💨', name: 'Swift',  text: 'Can attack the turn it arrives.' },
    mend:   { icon: '🌿', name: 'Mend',   text: 'At the end of your turn, restore 1 Spirit.' },
    bloom:  { icon: '🌸', name: 'Bloom',  text: 'Gains +1 power each time it attacks.' },
    shield: { icon: '🫧', name: 'Shield', text: 'Ignores the first damage it takes.' },
    echo:   { icon: '🔔', name: 'Echo',   text: 'When played, deals 2 damage to enemy Spirit.' },
    thorns: { icon: '🌵', name: 'Thorns', text: 'Deals 1 damage back to any card that attacks it.' },
    rally:  { icon: '📯', name: 'Rally',  text: 'When played, your other cards gain +1 power.' },
    drain:  { icon: '🌀', name: 'Drain',  text: 'Each time it attacks, restore 2 Spirit.' },
    seed:   { icon: '🌰', name: 'Seed',   text: 'When it falls, a 1/2 Seedling grows in its place.' },
    lull:   { icon: '😴', name: 'Lull',   text: "When played, the enemy's strongest card can't attack on its next turn." },
    kin:    { icon: '🤝', name: 'Kin',    text: 'When played, gains +1/+1 for each other card of its family on your board.' },
    sting:  { icon: '🐝', name: 'Sting',  text: 'When played, deals 1 damage to the enemy card with the least health.' }
  };

  /* ---------- Boss twists ----------
     Each district boss bends one rule for its side (G.twist.side):
       roots : restores 3 Spirit at the end of each of its turns
       wall  : its Guard cards have +1 health
       tide  : every 4th of its turns, the strongest card facing it washes back to its owner's hand
       bloom : every card it plays costing 1 has Bloom
     (tuned by simulation so each twist is worth roughly the same few points of win rate to the boss) */
  const TWISTS = {
    roots: { icon: '🌳', text: 'Restores 3 Spirit at the end of each of its turns.' },
    wall:  { icon: '🧱', text: 'Its Guard cards have +1 health.' },
    tide:  { icon: '🌊', text: 'Every 4th turn, the tide washes your strongest card back to your hand.' },
    bloom: { icon: '🌻', text: 'Its 1-cost cards all have Bloom.' }
  };
  /* ---------- Keeper's Knack (v1.84.0) ----------
     One free, once-per-match ability the player picks before the match (the keep-this-hand screen), unlocked by level. It
     is usable from its own turn number (`from`), takes no energy, and none of them need aiming, so one tap does it. Neighbors don't
     have one: it is the player's edge. `level` is the Keeper level that unlocks it (progression.js reads it). */
  const KNACKS = {
    forage:     { icon: '🧺', name: 'Forage',      level: 1,  from: 2, text: 'Draw 2 cards.' },
    soothe:     { icon: '🌿', name: 'Soothe',      level: 3,  from: 2, text: 'Restore 6 Spirit and heal each of your cards by 2.' },
    sow:        { icon: '🌱', name: 'Sow',         level: 5,  from: 2, text: 'Grow two 1/2 Seedlings on your board (as many as fit).' },
    sparkstorm: { icon: '⚡', name: 'Spark Storm', level: 8,  from: 2, text: 'Deal 1 damage to every enemy card and 1 to enemy Spirit.' },
    bulwark:    { icon: '🛡️', name: 'Bulwark',     level: 11, from: 2, text: 'Every card on your board gains a Shield.' },
    tidal:      { icon: '🌊', name: 'Tidal Hush',  level: 15, from: 2, text: "The enemy's two strongest cards can't attack on their next turn." }
  };
  function knackReady(G, who) {
    const pl = G.p[who];
    if (!pl.knack || !KNACKS[pl.knack]) return { ok: false, why: 'No Knack chosen' };
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

  function modsFor(G, side) {
    const m = Object.assign({}, G.mods || {});
    if (G.twist && G.twist.kind === 'bloom' && G.twist.side === side) { m.addKw = 'bloom'; m.addKwMaxCost = 1; }
    if (G.twist && G.twist.kind === 'wall' && G.twist.side === side) m.guardHp = 1;
    return m;
  }

  /* ---------- Spells ----------
     A spell is played from the hand, spends its energy, resolves at once and is gone - it never takes a board slot.
     target 'enemy' : needs an enemy card to aim at (Guard does not protect against spells).
     needs  'own'   : only worth casting while you have a card on the board.
     value          : how much deck-builders and the AI like it. */
  const SPELLS = {
    'spark':        { target: 'enemy', value: 5,  text: 'Deal 2 damage to an enemy card.' },
    'rain-shower':  { value: 4,  text: 'Restore 2 Spirit and heal each of your cards by 1.' },
    'harvest':      { value: 6,  text: 'Draw 2 cards.' },
    'gust':         { target: 'enemy', value: 7,  text: "Return an enemy card to its owner's hand." },
    'sunbeam':      { needs: 'own', value: 6, text: 'Your cards on the board gain +1 power.' },
    'thunderclap':  { value: 8,  text: 'Deal 1 damage to every enemy card and 2 to enemy Spirit.' },
    'second-wind':  { needs: 'own', value: 7, text: 'Your cards on the board can attack again this turn.' },
    'moonlit-tide': { value: 11, text: 'Deal 3 damage to every enemy card.' },
    'starfall':     { target: 'enemy', value: 14, text: 'Defeat an enemy card outright (even through Shield), then deal 3 damage to enemy Spirit.' },
    'chill':        { target: 'enemy', value: 5, text: "Deal 1 damage to an enemy card. It can't attack on its next turn." },
    'overgrowth':   { needs: 'room', value: 6, text: 'Grow two 1/2 Seedlings on your board (as many as fit).' },
    'stone-skin':   { needs: 'guard', value: 7, text: 'Your Guard cards gain +2 health and +1 power.' },
    'undertow':     { value: 7, text: "Return every enemy card that costs 2 or less to its owner's hand." },
    'quickstep':    { needs: 'own', value: 7, text: 'Your cards that just arrived can attack right away.' },
    'picnic':       { value: 8, text: 'Restore 5 Spirit and draw a card.' }
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

  // mods.swiftBonus: extra power for every Swift card (storms), applied to both sides alike.
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

  /* opts.spirit = [spiritForPlayer0, spiritForPlayer1] lets friendly opponents start with less Spirit.
     opts.mods   = the world's effect on a match, the same for both sides (battleWorld() in js/battle-ui.js builds it):
                   swiftBonus (+power to Swift), bloomStart (+power to Bloom), shieldHp (+health to Shield), mendBonus (Mend restores
                   more), echoBonus (Echo hits harder) and famHp { family, hp } (a district's "home turf": its family is tougher).
     opts.twist  = { side, kind } - a district boss's rule twist (see TWISTS).
     opts.knack  = [idForPlayer0, idForPlayer1] - Keeper's Knack choices (see KNACKS); only the player uses one.
     opts.first  = 0 or 1 - who takes the first turn (the coin/dice toss). The other seat is "second" and gets the catch-up
                   bonus: +1 card and +1 energy on its first turns. Old puzzle snapshots have no G.first, so it reads as 0. */
  function newGame(deckA, deckB, rng, opts) {
    rng = rng || Math.random; opts = opts || {};
    let uid = 1;
    const mods = opts.mods || {};
    const first = opts.first === 1 ? 1 : 0;
    const G = { rng, turn: 0, first, active: first, over: false, winner: null, why: null, events: [], aiMemo: null, mods, twist: opts.twist || null, p: [] };
    const mk = (deck, i) => shuffled(deck, rng).map(id => makeCard(id, uid++, modsFor(G, i)));
    const sp = opts.spirit || [RULES.spirit, RULES.spirit];
    G.p = [0, 1].map(i => ({ idx: i, spirit: sp[i], maxSpirit: sp[i], deck: mk(i === 0 ? deckA : deckB, i), hand: [], board: [], turns: 0, energy: 0, maxEnergy: 0 }));
    G.uid = uid;                                   // later cards (Seedlings) keep numbering from here
    (opts.knack || []).forEach((id, i) => { if (id && KNACKS[id]) G.p[i].knack = id; });
    G.p.forEach((pl, i) => { const n = RULES.hand + (i !== first ? 1 : 0); for (let k = 0; k < n; k++) draw(G, pl, true); });
    // opts.startSpirit: begin below full (the Festival Cup carries your Spirit from one round to the next)
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
    me.turns++;
    const bonus = (G.active !== (G.first || 0) && me.turns <= RULES.secondBonusTurns) ? RULES.secondBonus : 0;
    me.maxEnergy = Math.min(me.turns + bonus, RULES.ecap);
    me.energy = me.maxEnergy;
    draw(G, me);
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
      if (fx.needs === 'guard' && !me.board.some(x => x.kw.includes('guard'))) return { ok: false, why: 'You need a Guard card on the board' };
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
  // Spell damage to a card: a Shield still soaks the first hit, exactly like an attack.
  function zap(G, side, t, dmg, pierce, tag) {
    const pl = G.p[side];
    let blocked = false;
    if (pierce) { t.hp = 0; t.shield = false; }
    else if (t.shield) { t.shield = false; blocked = true; }
    else t.hp -= dmg;
    emit(G, 'zap', { who: side, uid: t.uid, dmg: pierce ? 0 : dmg, blocked, pierce: !!pierce, tag: tag || null });
    if (t.hp <= 0 && pl.board.includes(t)) fall(G, side, t);
  }
  // A card leaves the board for good. Seed cards leave a Seedling behind (if there is room).
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
      return { ok: false, why: guards(op).length ? 'A Guard must be attacked first' : 'Invalid target' };

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
  // A head start before the first turn: extra Spirit (raising the cap with it) and extra cards.
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
  }

  /* ---------- Opponent AI ----------
     aiNextAction() decides ONE action and applies nothing, so the UI can animate each step as it happens.
     level: 'gentle' (often plays at random and forgets to attack sensibly), 'normal', 'smart'. */
  function valueOf(c) { return c.power + c.hp * 0.8 + (c.kw.length ? 2 : 0) + (c.lull ? -1 : 0); }
  const RANDOMNESS = { gentle: 0.55, normal: 0.25, smart: 0 };

  function aiNextAction(G, who, level) {
    const me = G.p[who], op = G.p[1 - who], rng = G.rng;
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
    for (let i = 0; i < 40 && !G.over; i++) { const a = aiNextAction(G, who, level); if (a.type === 'end') break; steps.push(a); applyAction(G, who, a); }
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

  return { RULES, KEYWORDS, SPELLS, TWISTS, KNACKS, knackReady, setKnack, useKnack, MAX_KEYWORDS, defOf, baseIdOf, variantId, suggestDeck, makeCard, familyOf, newGame, startTurn, canPlay, playCard, spellNeedsTarget, legalTargets, attack, endTurn, forfeit, boost, mulligan, aiNextAction, applyAction, aiTurn, guards, valueOf };
})();
/* END BATTLE ENGINE */

const KW = BattleEngine.KEYWORDS;

const RARITY_LABEL = { common: 'common', rare: 'rare', ultra: 'ultra rare', super: 'super ultra rare', mythic: 'mythic' };

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
  square: { name: 'Town Square', theme: 'square', unlockWins: 0, unlockLevel: 1, boss: 'Elder Yew', bossIcon: '🌳',
    scenery: [{ icon: '🪑', title: 'A quiet bench', desc: 'A good place to sit and watch the town go by.' },
              { icon: '⛲', title: 'The old fountain', desc: 'Coins glimmer faintly beneath the water.' }] },
  market: { name: 'Market Row', theme: 'market', unlockWins: 1, unlockLevel: 2, boss: 'Old Bramble, the Market Warden', bossIcon: '🦡',
    scenery: [{ icon: '🏪', title: 'A small stall', desc: 'The vendor is out today, but the awning gives good shade.' },
              { icon: '🧺', title: 'A basket of goods', desc: 'Nothing to take, but it smells like fresh bread.' }] },
  harbor: { name: 'Quiet Harbor', theme: 'harbor', unlockWins: 3, unlockLevel: 4, boss: 'The Harbor Keeper', bossIcon: '⚓',
    scenery: [{ icon: '⛵', title: 'A moored boat', desc: 'It rocks gently against the dock.' },
              { icon: '🦭', title: 'A resting seal', desc: 'It barely opens an eye as you pass.' }] },
  garden: { name: 'Hollow Garden', theme: 'garden', unlockWins: 5, unlockLevel: 6, boss: 'The Garden Sentinel', bossIcon: '🌻',
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


