/* Card drawings that are NOT the drawing of the card's emoji (card id -> svg body, same 24 x 24 box and classes as draw/*.js).
   A card only needs an entry here when its emoji is shared with another card, so the two would otherwise get the same picture. */
const fox = require('./draw/10-cards-1.js')['🦊'];
const { star } = require('./base');
const all = {}; require('fs').readdirSync(require('path').join(__dirname, 'draw')).forEach(f => Object.assign(all, require('./draw/' + f)));
// A drawing of another emoji with some of its colours swapped (map: class -> class) and a few sparkles added, for cards that share an emoji
const tint = (glyph, map, sparkles) => {
  const body = all[glyph].replace(/class="(f[A-Za-z]+)"/g, (m, c) => `class="${map[c] || c}"`);
  return body + (sparkles || []).map(([x, y, r]) => star(x, y, r, 'fA')).join('');
};
module.exports = {
  // Whisper Fox: the Dusk Fox's drawing in silver, so the two foxes are told apart at a glance
  'silver-fox': fox.replace(/class="fO"/g, 'class="fS"'),
  // Build 290 - the cards that cannot be found on the map. Each one whose emoji another card already uses gets its own colours.
  'rumour-wing': tint('🦋', { fB: 'fS', fP: 'fD', fY: 'fA' }, [[20, 5, 1.6]]),
  'undertow-choir': tint('🌀', { fB: 'fD' }, [[20, 4, 1.8], [4, 19, 1.3]]),
  'waking-orchard': tint('🌳', { fG: 'fM', fR: 'fK' }, [[3, 4, 1.5], [21, 6, 1.8]]),
  'drowned-bell': tint('🔔', { fA: 'fT', fO: 'fB' }, [[20, 5, 1.5]]),
  'rift-cartographer': tint('🗺', { fC: 'fL', fU: 'fP', fB: 'fD', fG: 'fT' }, [[20, 4, 1.8], [4, 20, 1.3]]),
  'anglers-dream': tint('🎣', { fR: 'fA', fB: 'fP' }, [[19, 5, 1.8], [4, 4, 1.3]]),
  'archivist-owl': tint('🦉', { fU: 'fL', fN: 'fD', fA: 'fY' }, [[20, 4, 1.6]]),
  'crown-of-dreams': tint('👑', { fR: 'fP', fB: 'fK' }, [[3, 5, 1.6], [21, 4, 1.8], [12, 1.5, 1.3]]),
  'prism-fox': tint('🦊', { fO: 'fL', fW: 'fK' }, [[20, 5, 1.8], [4, 18, 1.4]]),
  'starcaught-koi': tint('🐠', { fO: 'fD', fY: 'fL' }, [[19, 4, 1.8], [5, 5, 1.3]])
};
