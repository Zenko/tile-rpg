#!/usr/bin/env node
/* Renders the clean gradient art for the game.  Run from the repo root:  node scripts/build-art.js [--report]
   Drawings live in scripts/art/ (see scripts/art/base.js for the shape classes). This script turns each one into a PNG:
     assets/icons/icon-<slug>.png   128 px, one per emoji in assets/icons/manifest.js that has a drawing (slug = the Unicode name, as the manifest lists it)
     assets/icons/kw-<keyword>.png  128 px keyword icons (scripts/art/keywords.js)
     assets/cards/<id>.png          512 px card art, for every card whose emoji has a drawing (or that has its own entry in scripts/art/cards.js)
   and then writes the lists that switch them on, between the BEGIN / END GENERATED markers: CARD_ART (js/data-and-engine.js), ICON_ART and KW_ART
   (js/icon-swap.js). Anything you add by hand outside the markers is kept. Each drawing is cropped to its own bounds so it fills the picture.
   Needs Playwright (npm i -D playwright, or the global one the tests use) and a Chromium. If `sharp` is installed (npm i sharp) the PNGs are also shrunk to
   palette PNGs, about a quarter of the size with no visible change; without it they are written as they come out of the browser. --report only lists what
   is not drawn yet. */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
let sharp = null; try { sharp = require('sharp'); } catch (e) { console.log('(sharp is not installed: the PNGs will not be optimised)'); }
const root = path.resolve(__dirname, '..'), art = path.join(__dirname, 'art');
const base = require('./art/base');
const reportOnly = process.argv.includes('--report');

// the same key the game's icon swap layer uses: code points in hex, variation selector dropped, zero-width joiner as '-'
const keyOf = s => Array.from(s).map(ch => ch.codePointAt(0)).filter(c => c !== 0xFE0F).map(c => c === 0x200D ? '-' : c.toString(16)).join('');

const draw = {};   // emoji key -> svg body
fs.readdirSync(path.join(art, 'draw')).filter(f => f.endsWith('.js')).sort().forEach(f => { const m = require(path.join(art, 'draw', f)); Object.keys(m).forEach(g => { draw[keyOf(g)] = m[g]; }); });
const kw = require('./art/keywords');
const cardOwn = fs.existsSync(path.join(art, 'cards.js')) ? require('./art/cards') : {};   // card id -> its own drawing, for cards that should not use the emoji's drawing
global.window = {}; require(path.join(root, 'assets/icons/manifest.js'));
const icons = window.ICON_MANIFEST.icons.filter(i => !i.sym);   // sym = text symbols and sprite glyphs the swap layer cannot reach

(async () => {
  const browser = await chromium.launch();
  const game = await browser.newPage();
  await game.goto('file://' + path.join(root, 'index.html')); await game.waitForTimeout(600);
  const cards = await game.evaluate(() => CARD_POOL.concat(FOE_CARDS, TOKEN_CARDS).map(c => ({ id: c.id, icon: c.icon, name: c.name })));
  await game.close();
  const todoIcons = icons.filter(i => !draw[i.k]), todoCards = cards.filter(c => !cardOwn[c.id] && !draw[keyOf(c.icon)]);
  console.log(`icons drawn ${icons.length - todoIcons.length} of ${icons.length}, keywords ${Object.keys(kw).length}, cards drawn ${cards.length - todoCards.length} of ${cards.length}`);
  if (reportOnly) {
    console.log('icons left (by use):', todoIcons.sort((a, b) => b.n - a.n).map(i => i.g + i.n).join(' '));
    console.log('cards left:', todoCards.map(c => c.id + c.icon).join(' '));
    return browser.close();
  }
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}${base.CSS}svg{display:block;overflow:visible}</style><svg width="0" height="0" style="position:absolute"><defs>${base.DEFS}</defs></svg><div id="stage" style="position:fixed;left:0;top:0"></div>`);
  const render = async (body, px, pad) => {
    await page.evaluate(({ body, px, pad }) => {
      const st = document.getElementById('stage');
      st.innerHTML = `<svg id="probe" viewBox="0 0 24 24" width="24" height="24" style="position:absolute;visibility:hidden"><g id="gg">${body}</g></svg>`;
      const b = document.getElementById('gg').getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2, side = Math.max(b.width, b.height) + 2 * pad;
      st.innerHTML = `<svg id="one" xmlns="http://www.w3.org/2000/svg" viewBox="${cx - side / 2} ${cy - side / 2} ${side} ${side}" width="${px}" height="${px}">${body}</svg>`;
    }, { body, px, pad });
    const buf = await (await page.$('#one')).screenshot({ omitBackground: true });
    return sharp ? sharp(buf).png({ palette: true, quality: 92, effort: 10, dither: 1 }).toBuffer() : buf;
  };
  const write = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); };
  const iconArt = {}, kwArt = {}, cardArt = [];
  for (const i of icons) if (draw[i.k]) { const f = `assets/icons/icon-${i.slug}.png`; write(path.join(root, f), await render(draw[i.k], 128, 0.6)); iconArt[i.k] = f; }
  for (const k of Object.keys(kw)) { const f = `assets/icons/kw-${k}.png`; write(path.join(root, f), await render(kw[k], 128, 1.2)); kwArt[k] = f; }
  for (const c of cards) { const body = cardOwn[c.id] || draw[keyOf(c.icon)]; if (!body) continue; write(path.join(root, `assets/cards/${c.id}.png`), await render(body, 512, 0.5)); cardArt.push(c.id); }
  await browser.close();

  // the lists that switch the art on
  const patch = (file, begin, end, body) => {
    const p = path.join(root, file); let s = fs.readFileSync(p, 'utf8');
    const a = s.indexOf(begin), b = s.indexOf(end); if (a < 0 || b < 0) throw new Error(`${file}: missing generated markers`);
    fs.writeFileSync(p, s.slice(0, a + begin.length) + '\n' + body + '    ' + s.slice(b));
  };
  const objLines = o => Object.keys(o).sort().map(k => `    '${k}': '${o[k]}',\n`).join('');
  patch('js/icon-swap.js', '/* BEGIN GENERATED ICON_ART */', '/* END GENERATED ICON_ART */', objLines(iconArt));
  patch('js/icon-swap.js', '/* BEGIN GENERATED KW_ART */', '/* END GENERATED KW_ART */', Object.keys(kwArt).map(k => `    ${k}: '${kwArt[k]}',\n`).join(''));
  patch('js/data-and-engine.js', '/* BEGIN GENERATED CARD_ART */', '/* END GENERATED CARD_ART */', cardArt.map(id => `  '${id}',\n`).join(''));
  console.log(`wrote ${Object.keys(iconArt).length} icons, ${Object.keys(kwArt).length} keyword icons, ${cardArt.length} cards`);
})();
