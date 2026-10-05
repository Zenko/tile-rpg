/* Small drawing helpers shared by the icon batches (shapes only, no colours of their own beyond the class you pass). */
const { star, shine, glow, bubble } = require('./base');
const eye = (x, y, r) => `<circle class="ink" cx="${x}" cy="${y}" r="${r}"/><circle fill="#fff" cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .35}"/>`;
const ring = (n, cx, cy, rx, ry, dist, cls, rot0) => Array.from({ length: n }, (_, i) => `<ellipse class="${cls}" cx="${cx}" cy="${cy - dist}" rx="${rx}" ry="${ry}" transform="rotate(${(rot0 || 0) + i * 360 / n} ${cx} ${cy})"/>`).join('');
const star5 = (cx, cy, R, r, cls) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; pts.push((cx + Math.cos(a) * rad).toFixed(2) + ' ' + (cy + Math.sin(a) * rad).toFixed(2)); } return `<path class="${cls}" stroke-linejoin="round" d="M${pts.join('L')}z"/>`; };
const spikes = (n, cx, cy, r1, r2, cls) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r1 : r2; pts.push((cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2)); } return `<path class="${cls}" stroke-linejoin="round" d="M${pts.join('L')}z"/>`; };
const cloud = (x, y, s, cls) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="${cls}" d="M5 16a4 4 0 0 1-.5-8 5.500 5.500 0 0 1 10.500-1.500A4.500 4.500 0 0 1 18 16z"/></g>`;
const heart = (cx, cy, s, cls) => `<path class="${cls}" transform="translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})" d="M12 21C5 16 2 12 2 8.500 2 5.500 4.500 3.500 7 3.500c2 0 3.800 1 5 3 1.200-2 3-3 5-3 2.500 0 5 2 5 5C22 12 19 16 12 21z"/>`;
// a round yellow face with the usual eyes and smile; extras go on top
const face = (cx, cy, r, extra) => `<circle class="fY" cx="${cx}" cy="${cy}" r="${r}"/><path class="sh" d="M${cx} ${cy - r}a${r} ${r} 0 0 1 0 ${2 * r}c${r * .5}-${r * .6} ${r * .5}-${r * 1.4} 0-${2 * r}z" opacity=".22"/>${extra || ''}`;
module.exports = { star, shine, glow, bubble, eye, ring, star5, spikes, cloud, heart, face };
