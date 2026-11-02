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
   - Everyone in CAST has `pronouns` ('she', 'he', 'they' or 'it', see PRONOUNS below). Sentences never type a he / she / her /
     his: they read `${pron('baker').their} rolls`, `${pron('rival').They} brought spells.` (capitalised = start of a sentence),
     and a verb that changes with "they" adds `${pron('baker').s}` ("she bake-s", "they bake") or uses .is / .has / .was. So changing
     who someone is (not just what they are called) is one word here too. check.py fails on a he / she / her / his typed in a
     string; a line that really means the plain word ends with a `pronouns-ok` comment.
   - `scripts/check.py` fails if one of these names is typed straight into a string anywhere in js/, so a new line of
     dialogue cannot quietly bring an old name back. The changelog files are history and are left alone.

   Everything else the game says lives in content/ (loaded straight after this file), one file per kind of thing:
   - content/cards.js     cards, packs, families, Fates, card sets
   - content/world.js     districts, random neighbour names, buildings and their keepers' lines, fish, seeds, recipes
   - content/items.js     decorations, cottage furniture, sleeves, avatar borders, backdrops
   - content/dialogue.js  companion and neighbour talk, favours, hints, letters
   - content/story.js     the opening, the story steps and the guide's words, events, the Gazette, gossip
   - content/guide.js     tips, the Town Guide, quests, milestones, titles, deck challenges
   - content/text.js      every other line the code says on its own, by key: words('bread.basketFull', { n: 4 })
   Not yet in content/: mini-game rules (js/puzzle-memory-minigames.js), many one-off lines still typed in js/ (check.py
   counts them and only lets the number go down) and the save key, STORAGE_KEY (js/data-and-engine.js) - changing that
   starts every player on a fresh save.
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

// The words for each kind of pronoun. pron(role) returns one of these for CAST[role], with capitalised copies (They, Them, Their, ...).
// `s` is the verb ending ("she bakes" / "they bake"); is / was / has are the verbs that change with it.
const PRONOUNS = {
  she:  { they: 'she',  them: 'her',  their: 'her',   theirs: 'hers',   self: 'herself',  s: 's', is: 'is',  was: 'was',  has: 'has' },
  he:   { they: 'he',   them: 'him',  their: 'his',   theirs: 'his',    self: 'himself',  s: 's', is: 'is',  was: 'was',  has: 'has' },
  they: { they: 'they', them: 'them', their: 'their', theirs: 'theirs', self: 'themself', s: '',  is: 'are', was: 'were', has: 'have' },
  it:   { they: 'it',   them: 'it',   their: 'its',   theirs: 'its',    self: 'itself',   s: 's', is: 'is',  was: 'was',  has: 'has' }
};
function pron(role) {
  const p = PRONOUNS[(CAST[role] && CAST[role].pronouns) || 'they'] || PRONOUNS.they, out = {};
  Object.keys(p).forEach(k => { out[k] = p[k]; out[k.charAt(0).toUpperCase() + k.slice(1)] = p[k].charAt(0).toUpperCase() + p[k].slice(1); });
  return out;
}

// Everyone with a name and a job. The key is their role; `icon` is their emoji face (used in text: letters, toasts, lists);
// `pronouns` picks a PRONOUNS row. Add `portrait: 'assets/cast/baker.png'` to show a drawn face instead wherever a face is shown
// large (their shop or building, the story scenes): see faceHtml() below. Without one, the emoji is used as today.
const CAST = {
  guide:         { name: 'Wren',    icon: '🧓', pronouns: 'she' },        // welcomes you, guides the first hour, lives in the cottage
  rival:         { name: 'Rook',    icon: '🎭', pronouns: 'he' },        // the wandering rival
  atlas:         { name: 'Atlas',   icon: '🗺️', pronouns: 'they' },        // "the Atlas": the one-of-a-kind top card and its building
  scholar:       { name: 'Olwen',   icon: '🧙', pronouns: 'they' },        // the Reading Nook: puzzles, memory game, deck advice
  baker:         { name: 'Maple',   icon: '🧑‍🍳', pronouns: 'she' },       // the bakery and cooking
  gardener:      { name: 'Fern',    icon: '👩‍🌾', pronouns: 'she' },       // sells seeds
  grainSeller:   { name: 'Pip',     icon: '🐭', pronouns: 'they' },        // grain stall
  threadSeller:  { name: 'Clover',  icon: '🐰', pronouns: 'they' },        // thread stall
  spiceSeller:   { name: 'Saffron', icon: '🦔', pronouns: 'they' },        // spice stall and the daily deal
  tinker:        { name: 'Tock',    icon: '🦝', pronouns: 'they' },        // tinker stall and fishing bait
  cardSeller:    { name: 'Zeph',    icon: '🦎', pronouns: 'they' },        // the Card Shop
  nightVendor:   { name: 'Lumen',   icon: '🦉', pronouns: 'they' },        // the Lantern Market (after dark)
  fortuneTeller: { name: 'Brume',   icon: '🐈‍⬛', pronouns: 'she' },       // "Madame Brume": daily Fate readings
  netMender:     { name: 'Tam',     icon: '🦦', pronouns: 'they' },        // the Net Loft (harbor)
  glassKeeper:   { name: 'Iris',    icon: '🐌', pronouns: 'they' },        // the Glasshouse (garden)
  curator:       { name: 'Paz',     icon: '🦚', pronouns: 'they' },        // "Curator Paz": the Hall of Spirits (Market Row)
  pedlar:        { name: 'Moth',    icon: '🧳', pronouns: 'they' },        // "Moth the Pedlar": a travelling visitor who sells cards
  wanderer:      { name: 'Quill',   icon: '🎒', pronouns: 'they' }         // "Quill the Wanderer": a travelling visitor who duels
};

// A face for a speaker: the drawn portrait when the CAST member with this emoji has one, else the emoji itself (escaped).
// Places that show a face large (shop keepers, building keepers, the story scenes) use this, so a portrait lands everywhere at once.
function castByIcon(icon) { return Object.values(CAST).find(c => c.icon === icon) || null; }
function faceHtml(icon, cls) {
  const c = castByIcon(icon), safe = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  return c && c.portrait ? `<img class="cast-portrait${cls ? ' ' + cls : ''}" src="${safe(c.portrait)}" alt="${safe(c.name)}">` : safe(icon == null ? '' : icon);
}

// One line of the game's words from TEXT (content/text.js) by its key, with its {slots} filled from vars:
// words('bread.basketFull', { n: 4 }). A missing key shows the key itself, so it is easy to spot (and check.py fails on it).
// A slot with no value is left as {slot} for the same reason.
function words(key, vars) {
  const t = typeof TEXT !== 'undefined' ? TEXT[key] : undefined;
  if (typeof t !== 'string') return key;
  return vars ? t.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : t;
}

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

/* ---------- SKINS: try a whole new set of names and words without touching the real ones (build 330) ----------
   A skin is one file in content/skins/ that calls skin({...}) with only what it changes (see content/skins/example.js):
     names    GAME / PLACES / BOSSES / FAMILY_NAMES / CAST, merged into the tables above before content/ loads, so every
              sentence built from them (all of content/ and the code) picks the new names up, pronouns included
     text     lines for TEXT (content/text.js), by key
     content  a function run after content/ has loaded, for anything else: STORY_INTRO.cards[0].text = '...', a new
              entry in NPC_POOLS.square.names, a different STORY step
   Open the game with ?skin=example to switch one on (it is remembered on this device), ?skin= to go back to the real game.
   A skin only changes words, never saves or rules, so it is safe to switch back and forth; while one is on, a small
   "Skin" pill with an Exit button sits at the bottom left. List each skin file in SKINS so a typo in the address is ignored. */
const SKINS = ['example'];
let SKIN_ON = null, SKIN_DEF = null;
function skinMerge(into, from) {
  Object.keys(from || {}).forEach(k => {
    const v = from[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object') skinMerge(into[k], v);
    else into[k] = v;
  });
}
// Called by a skin file as it loads (straight after this file, before content/).
function skin(def) {
  SKIN_DEF = def || {};
  const roots = { GAME, PLACES, BOSSES, FAMILY_NAMES, CAST };
  Object.keys(roots).forEach(k => { if (SKIN_DEF[k]) skinMerge(roots[k], SKIN_DEF[k]); });
}
// Called by index.html straight after content/ has loaded: the skin's TEXT lines and its content() hook, then the pill.
function applySkinContent() {
  if (!SKIN_DEF) return;
  if (SKIN_DEF.text && typeof TEXT !== 'undefined') Object.assign(TEXT, SKIN_DEF.text);
  if (typeof SKIN_DEF.content === 'function') { try { SKIN_DEF.content(); } catch (e) { console.warn('skin content() failed:', e); } }
  const pill = () => {
    const p = document.createElement('div'); p.className = 'ico-pill skin-pill'; p.setAttribute('data-no-icon-swap', '');
    p.innerHTML = `<span>Skin: ${String(SKIN_DEF.title || SKIN_ON).replace(/[&<>"]/g, '')}</span><button type="button">Exit</button>`;
    p.querySelector('button').onclick = () => { try { localStorage.removeItem('tr-skin'); } catch (e) {} location.href = location.pathname; };
    document.body.appendChild(p);
  };
  if (typeof document !== 'undefined') { if (document.body) pill(); else document.addEventListener('DOMContentLoaded', pill); }
}
// Which skin this page uses: ?skin=name (remembered), ?skin= (forget it), else the one remembered on this device.
function skinChosen() {
  if (typeof location === 'undefined' || typeof localStorage === 'undefined') return null;
  let name = null;
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('skin')) { name = q.get('skin') || null; if (name && SKINS.includes(name)) localStorage.setItem('tr-skin', name); else localStorage.removeItem('tr-skin'); }
    else name = localStorage.getItem('tr-skin');
  } catch (e) { return null; }
  return name && SKINS.includes(name) ? name : null;
}
// index.html calls this straight after loading this file; document.write keeps the skin ahead of content/ (and works from file://).
function loadSkin() {
  SKIN_ON = skinChosen();
  if (SKIN_ON && typeof document !== 'undefined' && document.readyState === 'loading') document.write(`<script src="content/skins/${SKIN_ON}.js"><\/script>`);
}
