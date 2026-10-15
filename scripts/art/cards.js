/* Card drawings that are NOT the drawing of the card's emoji (card id -> svg body, same 24 x 24 box and classes as draw/*.js).
   A card only needs an entry here when its emoji is shared with another card, so the two would otherwise get the same picture. */
const fox = require('./draw/10-cards-1.js')['🦊'];
module.exports = {
  // Whisper Fox: the Dusk Fox's drawing in silver, so the two foxes are told apart at a glance
  'silver-fox': fox.replace(/class="fO"/g, 'class="fS"')
};
