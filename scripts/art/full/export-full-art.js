// Writes assets/cards/full/<id>-hero.svg and <id>-scene.svg from the drawings in fa-art.js and fa-mythic.js.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['fa-art.js', 'fa-mythic.js'].forEach(f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }));
const inner = s => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const defs = inner(ctx.FA_DEFS).replace(/<\/?defs>/g, '') + inner(ctx.FA_DEFS2).replace(/<\/?defs>/g, '');
const css = ctx.FA_CSS.replace(/svg\.fa-svg/g, 'svg').replace(/\s+/g, ' ').trim();
const out = process.argv[2];
const ids = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });
const wrap = (vb, w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}"><defs>${defs}</defs><style>${css}</style>${body}</svg>\n`;
let total = 0;
ids.forEach(id => {
  const d = ctx.FA[id]; if (!d) { console.log('missing', id); return; }
  const hero = wrap('0 0 100 100', 800, 800, d.hero.replace(/\n\s*/g, ''));
  const scene = wrap('0 0 100 108', 600, 648, d.scene.replace(/\n\s*/g, ''));
  fs.writeFileSync(path.join(out, id + '-hero.svg'), hero); fs.writeFileSync(path.join(out, id + '-scene.svg'), scene);
  total += hero.length + scene.length;
});
console.log(ids.length + ' cards,', Math.round(total / 1024) + ' KB');
