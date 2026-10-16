/* ============================================================
   CONTENT: THINGS TO BUY AND PLACE
   ============================================================
   Decorations for the town, furniture for your cottage, card sleeves, avatar borders and character backdrops.
   Ids are saved in players' inventories: rename and re-price freely; keep the ids once real players have saves.
   ============================================================ */

// ---- used by js/data-and-engine.js ----
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
  { id: 'golden-keeper', name: `Golden ${GAME.player.one}`, icon: '🏆', cost: 300, level: 15, desc: `A statue of the ${GAME.player.one}, mid-triumph.`, cat: 'ornament' },
  // sold only by the Atlas (js/atlas.js ATLAS_SHOP), never in the Card Shop
  { id: 'atlas-compass', name: 'Compass Rose', icon: '🧭', cost: 150, desc: 'It always points at something you meant to find.', cat: 'ornament', atlas: true },
  { id: 'atlas-lantern', name: 'Map Lantern', icon: '🏮', cost: 180, desc: 'Lights up the parts of the ground nobody has drawn yet.', cat: 'ornament', atlas: true },
  { id: 'dream-globe', name: 'Dream Globe', icon: '🌐', cost: 240, desc: 'Turn it and a different dream faces you.', cat: 'ornament', atlas: true },
  // Hall of Spirits keepsakes (js/afterdark-companion-cards.js): one for each finished wing, never sold in the shop
  { id: 'hall-grove', name: `${FAMILY_NAMES.grove} Planter`, icon: '🪴', cost: 60, desc: 'A little pot that grows whatever the Grove last dreamed about.', cat: 'plant', museum: true },
  { id: 'hall-stone', name: `${FAMILY_NAMES.stone} Urn`, icon: '🏺', cost: 60, desc: 'Cool to the touch. It holds a memory, nothing else.', cat: 'ornament', museum: true },
  { id: 'hall-tide', name: `${FAMILY_NAMES.tide} Shell Lamp`, icon: '🐚', cost: 60, desc: 'Hold it to your ear and it hums a lullaby.', cat: 'lighting', museum: true },
  { id: 'hall-wind', name: `${FAMILY_NAMES.wind} Wind Chime`, icon: '🎐', cost: 60, desc: 'It rings for whispers you have not heard yet.', cat: 'ornament', museum: true },
  { id: 'hall-lullaby', name: 'Lullaby Scroll', icon: '📜', cost: 60, desc: 'Every spell you have kept, in a hand that gets sleepier toward the end.', cat: 'ornament', museum: true },
  // Rift Atlas souvenirs (js/rift-atlas.js): one for each finished row, never sold in the shop
  { id: 'rift-hourglass', name: 'Bent Hourglass', icon: '⏳', cost: 120, desc: 'Its sand falls sideways, then upward, then not at all.', cat: 'ornament', rift: true },
  { id: 'rift-prism', name: 'World Prism', icon: '🔮', cost: 160, desc: 'Turn it and the light inside takes the colour of somewhere you have been.', cat: 'lighting', rift: true },
  { id: 'rift-planet', name: 'Pocket World', icon: '🪐', cost: 120, desc: 'A world small enough to hold, still turning slowly.', cat: 'ornament', rift: true },
  { id: 'rift-lotus', name: 'Four-Family Lotus', icon: '🪷', cost: 160, desc: 'One petal for each family. It opens a little wider near a portal.', cat: 'plant', rift: true },
  { id: 'star-chart', name: 'Star Chart', icon: '🌌', cost: 320, desc: 'Every star on it is a place you almost went.', cat: 'ornament', atlas: true }
];

// ---- used by js/houses-and-cellar.js ----
/* ---------------- Card sleeves (sold in Zeph's Card Shop): a purely cosmetic frame for your own cards in battle ---------------- */
const SLEEVES = [
  { id: '',       name: 'Plain',        icon: '▫️', cost: 0 },
  { id: 'leafy',  name: 'Leafy',        icon: '🍃', cost: 25 },
  { id: 'gilded', name: 'Gilded',       icon: '✨', cost: 30 },
  { id: 'tide',   name: 'Tidal',        icon: '🌊', cost: 35 },
  { id: 'petal',  name: 'Petal',        icon: '🌸', cost: 35 },
  { id: 'ember',  name: 'Ember',        icon: '🔥', cost: 40 },   // names-ok: a sleeve, not the currency
  { id: 'starry', name: 'Starry Night', icon: '🌙', cost: 45 },
];

// ---- used by js/home-room.js ----
/* Everything that can stand in the room. `act` marks a menu piece (an id from INTERIORS.home: owned from the start, never put away).
   The rest is bought with Embers (`cost`) once the home reaches `lvl`. wall = hangs on the back wall, flat = lies on the floor under
   everything (w x h tiles), tall = drawn one and a half tiles high, glow = light it gives off (dx, dy in tiles from its tile). */
const HR_CATALOG = {
  nap: { name: 'Armchair', icon: '🛋️', spr: 'r-armchair', act: 'nap', say: () => 'A sunny chair by the window. The cushion is still warm.' },
  decorate: { name: 'The shelves', icon: '📚', spr: 'r-shelves', tall: 1, wall: 1, act: 'decorate', say: () => 'Room for a few more things.' },
  favs: { name: 'Framed cards', icon: '⭐', spr: 'r-frames', tall: 1, wall: 1, act: 'favs', say: () => 'Your favourite cards, framed on the wall.' },
  trophies: { name: 'Trophy case', icon: '🏆', spr: 'r-trophy', tall: 1, wall: 1, act: 'trophies', say: () => 'Everything you have won so far.' },
  altar: { name: 'The altar', icon: '🕯️', spr: 'r-altar', act: 'altar', glow: { dx: .5, dy: .2, r: 3.2 }, say: () => 'A small flame, always lit.' },
  sand: { name: 'Sand garden', icon: '🪨', spr: 'r-sand', act: 'calm-sand', say: () => 'The sand is smooth, waiting for a rake.' },
  bonsai: { name: 'Your bonsai', icon: '🪴', spr: 'r-bonsai', act: 'calm-bonsai', say: () => 'It looks a little taller than yesterday.' },
  tidy: { name: 'Basket', icon: '🧺', spr: 'r-basket', act: 'mg-tidy', say: () => 'Toys everywhere. Someone has been busy.' },
  mail: { name: 'Mailbox', icon: '📬', spr: 'r-mail', act: 'mail', say: () => unreadMail() ? `📬 ${unreadMail()} unread letter${unreadMail() === 1 ? '' : 's'} in the mailbox.` : 'The mailbox is empty for now.' },
  window: { name: 'Window', icon: '🪟', spr: 'r-window', tall: 1, wall: 1, cost: 30, lvl: 1, glow: { dx: .5, dy: .9, r: 2.6, day: 1 } },
  sconce: { name: 'Wall lamp', icon: '💡', spr: 'r-sconce', tall: 1, wall: 1, cost: 20, lvl: 1, glow: { dx: .5, dy: .6, r: 3 } },
  clock: { name: 'Clock', icon: '🕰️', spr: 'r-clock', tall: 1, wall: 1, cost: 18, lvl: 1 },
  toys: { name: 'Toys', icon: '🧸', spr: 'r-toys', flat: 1, cost: 8, lvl: 1 },
  plant: { name: 'Potted plant', icon: '🪴', spr: 'r-plant', cost: 12, lvl: 1 },
  stool: { name: 'Stool', icon: '🪑', spr: 'r-stool', cost: 10, lvl: 1 },
  table: { name: 'Side table', icon: '🌼', spr: 'r-table', cost: 22, lvl: 1 },
  lamp: { name: 'Floor lamp', icon: '🏮', spr: 'r-lamp', tall: 1, cost: 30, lvl: 1, glow: { dx: .5, dy: .4, r: 3 } },
  rug2: { name: 'Small rug', icon: '🧶', flat: 1, rug: 1, w: 2, h: 2, cost: 18, lvl: 1 },
  rug3: { name: 'Rug', icon: '🧶', flat: 1, rug: 1, w: 3, h: 3, cost: 30, lvl: 1 },
  cot: { name: 'Cot', icon: '🛏️', spr: 'r-cot', cost: 60, lvl: 2 },
  painting: { name: 'Painting', icon: '🖼️', spr: 'r-painting', tall: 1, wall: 1, cost: 25, lvl: 2 },
  bookcase: { name: 'Bookcase', icon: '📚', spr: 'r-shelf', tall: 1, cost: 45, lvl: 2 },
  cat: { name: 'Sleeping cat', icon: '🐈', spr: 'r-cat', cost: 40, lvl: 2 },
  fireplace: { name: 'Fireplace', icon: '🔥', spr: 'r-fireplace', tall: 1, wall: 1, cost: 120, lvl: 3, glow: { dx: .5, dy: .9, r: 3.8 } },
  wardrobe: { name: 'Wardrobe', icon: '🚪', spr: 'r-wardrobe', tall: 1, cost: 70, lvl: 3 },
  chest: { name: 'Chest', icon: '🧰', spr: 'r-chest', cost: 50, lvl: 3 },
  tree: { name: 'Indoor tree', icon: '🌳', spr: 'r-tree', tall: 1, cost: 90, lvl: 4 },
  rug4: { name: 'Grand rug', icon: '🧶', flat: 1, rug: 1, w: 4, h: 4, cost: 60, lvl: 4 },
  // Spirit pieces (js/home-spirits.js). `uses` marks a piece with a sheet of its own (like the menu pieces, but not one of INTERIORS.home's
  // actions); `family` marks a family corner, which draws spirits of that family to visit.
  perch: { name: 'Spirit perch', icon: '🕊️', spr: 'r-perch', tall: 1, uses: 1, cost: 40, lvl: 2, say: () => hsSay('perch') },
  cabinet: { name: 'Collector\'s cabinet', icon: '🏅', spr: 'r-cabinet', tall: 1, wall: 1, uses: 1, cost: 60, lvl: 2, say: () => hsSay('cabinet') },
  mantel: { name: 'Reborn mantel', icon: '✨', spr: 'r-mantel', tall: 1, wall: 1, uses: 1, cost: 120, lvl: 3, say: () => hsSay('mantel') },
  grove: { name: 'Grove nook', icon: '🌿', spr: 'r-grove', family: 'grove', cost: 45, lvl: 2 },
  cairn: { name: 'Memory cairn', icon: '🪨', spr: 'r-cairn', family: 'stone', cost: 45, lvl: 2 },
  basin: { name: 'Tide basin', icon: '🌊', spr: 'r-basin', family: 'tide', cost: 45, lvl: 2 },
  chimes: { name: 'Wind chimes', icon: '🎐', spr: 'r-chimes', family: 'wind', cost: 45, lvl: 2 }
};

// ---- used by js/world-map.js ----
const BORDER_OPTIONS = [
  { id: 'solid',   name: 'Solid',      cost: 0,  native: 'solid' },
  { id: 'dashed',  name: 'Dashed',     cost: 12, native: 'dashed' },
  { id: 'dotted',  name: 'Dotted',     cost: 12, native: 'dotted' },
  { id: 'double',  name: 'Double',     cost: 15, native: 'double' },
  { id: 'groove',  name: 'Groove',     cost: 15, native: 'groove' },
  { id: 'ridge',   name: 'Ridge',      cost: 15, native: 'ridge' },
  { id: 'glow',    name: 'Glow',       cost: 22, native: 'solid', glow: true },
  { id: 'neon',    name: 'Neon dashes', cost: 28, native: 'dashed', glow: true },
  { id: 'twotone', name: 'Two-tone',   cost: 18, grad: c => `conic-gradient(${c} 0 50%, color-mix(in srgb, ${c} 45%, #fff) 50% 100%)` },
  { id: 'candy',   name: 'Candy stripe', cost: 20, grad: c => `repeating-conic-gradient(${c} 0 15deg, #fff 15deg 30deg)` },
  { id: 'sunset',  name: 'Sunset fade', cost: 24, grad: c => `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 35%, #ff8fb1))` },
  { id: 'rainbow', name: 'Rainbow',    cost: 30, fixed: true, grad: () => 'conic-gradient(#e86a6a, #f0c05a, #7fbf8a, #6fc3d6, #7a8fe0, #c27ad6, #e86a6a)' },
  { id: 'gold',    name: 'Gilded',     cost: 36, fixed: true, glow: true, grad: () => 'conic-gradient(#f6e3a1, #c9962d, #fff0b8, #a87420, #f6e3a1)' },
  // Premium rings (v1.87.0): the high-end Ember sinks
  { id: 'prism',   name: 'Prism',      cost: 90,  fixed: true, grad: () => 'conic-gradient(from 30deg, #ffd1dc, #ffe9b8, #d1f5d3, #c4e7ff, #e0d1ff, #ffd1dc)' },
  { id: 'ember',   name: 'Ember',      cost: 120, fixed: true, glow: true, grad: () => 'conic-gradient(#ff9a3c, #e8443a, #ffd36b, #e8443a, #ff9a3c)' },   // names-ok: an avatar border, not the currency
  { id: 'galaxy',  name: 'Galaxy',     cost: 170, fixed: true, glow: true, grad: () => 'conic-gradient(#2b1f5c, #7a4fd6, #3fb6e8, #7a4fd6, #2b1f5c)' },
  { id: 'crown',   name: 'Crown',      cost: 240, fixed: true, glow: true, grad: () => 'conic-gradient(#fff3b0, #f0b429, #fff3b0, #c98a12, #fff3b0)' }
];
// Backdrops for the Character tab's stage (you and your companion). 'live' follows the real sky and weather; the
// rest are painted from the sky/ground colours and a few emoji scattered over them (see stageHtml() in js/character-tab.js).
// Same Shop-and-equip flow as the mats: ids live in state.character.unlockedStages / state.character.stage.
const STAGE_OPTIONS = [
  { id: 'live',    name: "Today's sky",    cost: 0,  live: true },
  { id: 'meadow',  name: 'Meadow',         cost: 12, sky: ['#9fd3ea', '#e6f3d8'], ground: '#86b873', deco: ['☁️', '☁️', '🌼', '🌷', '🦋'] },
  { id: 'harbor',  name: 'Harbor lights',  cost: 18, sky: ['#f4b88f', '#8fa9c9'], ground: '#58798f', deco: ['⛵', '🌅', '🕊️', '⚓'] },
  { id: 'autumn',  name: 'Autumn grove',   cost: 20, sky: ['#f2c58b', '#f7e4c2'], ground: '#b3733c', deco: ['🍂', '🍁', '🍂', '🌰', '🍁'] },
  { id: 'night',   name: 'Starry night',   cost: 22, sky: ['#0f1b3a', '#33457a'], ground: '#25344a', deco: ['⭐', '✨', '🌙', '⭐', '✨'], dark: true },
  { id: 'snow',    name: 'Snowfall',       cost: 24, sky: ['#b9cde0', '#eef4fa'], ground: '#e8eef5', deco: ['❄️', '❄️', '⛄', '❄️', '🌲'] },
  { id: 'lantern', name: 'Lantern night',  cost: 30, sky: ['#2a1d3d', '#7a3f55'], ground: '#3b2634', deco: ['🏮', '🏮', '✨', '🏮', '🌙'], dark: true },
  { id: 'aurora',  name: 'Aurora hill',    cost: 40, sky: ['#0b2a3a', '#2f8f7a'], ground: '#1d3a4a', deco: ['🌌', '✨', '⭐', '✨', '🌲'], dark: true },
  { id: 'sakura',  name: 'Sakura grove',   cost: 100, sky: ['#f7d6e0', '#fdf0e6'], ground: '#a7c98a', deco: ['🌸', '🌸', '🏮', '🦋', '🌸'] },
  { id: 'nightfall', name: 'Nightfall',    cost: 140, sky: ['#141a36', '#3b4a7a'], ground: '#222c4a', deco: ['🌙', '⭐', '✨', '🦉', '⭐'], dark: true },
  { id: 'summit',  name: 'Misty summit',   cost: 190, sky: ['#cfdbe8', '#f4f7fa'], ground: '#8a9aa8', deco: ['⛰️', '☁️', '🦅', '☁️', '❄️'] },
];
