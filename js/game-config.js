/* ============================================================
   GAME CONFIG: THE NAMES PLAYERS SEE
   ============================================================
   The one place for the game's name, its places, its people and its words. Every sentence in the game that
   mentions one of these reads it from here (`${CAST.baker.name} laughs.`), so a reskin is: change the values below,
   reload, done. Loaded first of all the game's scripts (index.html, the labs and server/load-engine.js), so any
   file may use these at its top level.

   Rules for editing:
   - Change the VALUES, never the keys. The keys (square, grove, baker, ...) are internal ids that the code itself uses
     (and, once real players have saves, their saves and deck codes); players never see them.
   - Titles that sit in front of a name are written in the sentences, not here: "the Atlas", "Madame Brume",
     "Curator Paz", "Maple's Bakery". Pick names that read well after "the" / before "'s".
   - The text still uses she / they for some people (Wren and Maple are "her"); check those lines if you change who
     someone is, not just what they are called.
   - `scripts/check.py` fails if one of these names is typed straight into a string anywhere in js/, so a new line of
     dialogue cannot quietly bring an old name back. The changelog files are history and are left alone.

   Everything else the game says lives in content/ (loaded straight after this file), one file per kind of thing:
   - content/cards.js     cards, packs, families, Fates, card sets
   - content/world.js     districts, random neighbour names, buildings and their keepers' lines, fish, seeds, recipes
   - content/items.js     decorations, cottage furniture, sleeves, avatar borders, backdrops
   - content/dialogue.js  companion and neighbour talk, favours, hints, letters
   - content/story.js     the opening, the story steps and the guide's words, events, the Gazette, gossip
   - content/guide.js     tips, the Town Guide, quests, milestones, titles
   Not yet in content/: spirits at the altar (js/summoning.js), mini-game rules (js/puzzle-memory-minigames.js) and
   the save key, STORAGE_KEY (js/data-and-engine.js) - changing that starts every player on a fresh save.
   ============================================================ */
const GAME = {
  title: 'Tile RPG',                                  // tab title, version line, feedback mail, signs in town
  tagline: 'a calm card-collecting town',             // after the title in the browser tab
  currency: { one: 'Ember', many: 'Embers' },          // the money (its icon is the 🫧 emoji, swapped for art by js/icon-swap.js)
  starlight: { name: 'Starlight', icon: '✨' },        // what duplicate pack cards pay, spent on wishes (js/wishes.js)
  depth: { name: 'Depth', verb: 'Dive', icon: '🌀' },    // the second lap: a district's boss again, deeper each time (js/depth.js)
  player: { one: 'Dreamer', many: 'Dreamers', lower: 'dreamer', lowerMany: 'dreamers' }   // what the game calls you
};
// "3 Embers" / "1 Ember", for counts built at run time.
function currencyName(n) { return n === 1 ? GAME.currency.one : GAME.currency.many; }

// The four districts (towns) and the boss who rules each.
const PLACES = { square: 'El Umbral', market: 'El Mercado de Susurros', harbor: 'La Orilla del Arrullo', garden: 'El Jardín Lúcido', cellar: 'El Sótano Olvidado' };
const BOSSES = { square: 'Duermevela', market: 'Murmullo', harbor: 'Marea Lenta', garden: 'Ensueño' };

// The four card families (FAMILIES in js/data-and-engine.js adds their icon and home district).
const FAMILY_NAMES = { grove: 'Brote', stone: 'Recuerdo', tide: 'Deriva', wind: 'Susurro' };

// Everyone with a name and a job. The key is their role; `icon` is their face until portraits arrive.
const CAST = {
  guide:         { name: 'Wren',    icon: '🧓' },        // welcomes you, guides the first hour, lives in the cottage
  rival:         { name: 'Rook',    icon: '🎭' },        // the wandering rival
  atlas:         { name: 'Atlas',   icon: '🗺️' },        // "the Atlas": the one-of-a-kind top card and its building
  scholar:       { name: 'Olwen',   icon: '🧙' },        // the Reading Nook: puzzles, memory game, deck advice
  baker:         { name: 'Maple',   icon: '🧑‍🍳' },       // the bakery and cooking
  gardener:      { name: 'Fern',    icon: '👩‍🌾' },       // sells seeds
  grainSeller:   { name: 'Pip',     icon: '🐭' },        // grain stall
  threadSeller:  { name: 'Clover',  icon: '🐰' },        // thread stall
  spiceSeller:   { name: 'Saffron', icon: '🦔' },        // spice stall and the daily deal
  tinker:        { name: 'Tock',    icon: '🦝' },        // tinker stall and fishing bait
  cardSeller:    { name: 'Zeph',    icon: '🦎' },        // the Card Shop
  nightVendor:   { name: 'Lumen',   icon: '🦉' },        // the Lantern Market (after dark)
  fortuneTeller: { name: 'Brume',   icon: '🐈‍⬛' },       // "Madame Brume": daily Fate readings
  netMender:     { name: 'Tam',     icon: '🦦' },        // the Net Loft (harbor)
  glassKeeper:   { name: 'Iris',    icon: '🐌' },        // the Glasshouse (garden)
  curator:       { name: 'Paz',     icon: '🦚' },        // "Curator Paz": the Hall of Spirits (Market Row)
  pedlar:        { name: 'Moth',    icon: '🧳' },        // "Moth the Pedlar": a travelling visitor who sells cards
  wanderer:      { name: 'Quill',   icon: '🎒' }         // "Quill the Wanderer": a travelling visitor who duels
};

// Static text in index.html. The markup keeps today's words as a fallback and marks them:
//   <span data-game="PLACES.square">El Umbral</span>     the element's text becomes that value
//   data-game-title="{GAME.currency.many} to spend"       the element's title (tooltip) is filled in from the template
// index.html runs this straight after loading this file. check.py makes sure the fallback words match the values above.
function gameConfigValue(path) {
  const roots = { GAME, PLACES, BOSSES, FAMILY_NAMES, CAST };
  const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), roots);
  return typeof v === 'string' ? v : null;
}
function applyGameConfigText() {
  document.title = `${GAME.title}: ${GAME.tagline}`;
  document.querySelectorAll('[data-game]').forEach(el => { const v = gameConfigValue(el.dataset.game); if (v != null) el.textContent = v; });
  document.querySelectorAll('[data-game-title]').forEach(el => { el.title = el.dataset.gameTitle.replace(/\{([\w.]+)\}/g, (m, p) => gameConfigValue(p) ?? m); });
}
