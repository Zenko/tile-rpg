#!/usr/bin/env node
/* Draws every sprite the game has today, on the Town Square ground colour, at twice game size, with its id and frame size under it:
   assets/art-templates/reference-current-sprites.png. It is the style reference for new map art (and the list of what exists).
   Usage: node scripts/render-sprite-reference.js      (needs Playwright, like scripts/build-art.js) */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.resolve(__dirname, '..'), out = path.join(root, 'assets', 'art-templates', 'reference-current-sprites.png');
const css = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const block = css.match(/(?<![\w\]] )\.town-view\[data-biome="meadow"\]\s*\{([^}]*)\}/)[1];   // the dark Town Square palette
const vars = [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => `--${m[1]}:${m[2]}`);
vars.push('--cloth:#7d6bb0', '--day:#d6e6d8', '--sky:#a9d3de', '--tshadow:rgba(0,0,0,.32)');   // the few colours the sprites use that sit outside that block
const ground = block.match(/--ground:\s*(#[0-9a-fA-F]{6})/)[1];
const src = fs.readFileSync(path.join(root, 'assets', 'sprites.js'), 'utf8'), svg = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
const syms = [...svg.matchAll(/<symbol id="([a-z0-9-]+)" viewBox="0 0 (\d+) (\d+)"/g)].map(m => ({ id: m[1], w: +m[2], h: +m[3] }));
const groups = [['Scenery and props (64 x 64 units): s-* p-* g-*', s => /^[spg]-/.test(s.id)], ['Buildings (128 x 128 and 192 x 128 units): b-*', s => /^b-/.test(s.id)], ['Room objects (64 x 64 and 64 x 96 units): r-*', s => /^r-/.test(s.id)]];
const Z = 2;
const cell = s => `<figure><svg width="${s.w * Z}" height="${s.h * Z}" viewBox="0 0 ${s.w} ${s.h}"><use href="#${s.id}"/></svg><figcaption>${s.id}<br>${s.w} x ${s.h}</figcaption></figure>`;
const html = `<style>body{margin:0;padding:18px;background:#1e2128;color:#dfe3ea;font:13px sans-serif;width:1160px}h2{font-size:15px;margin:22px 0 10px}
.row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}figure{margin:0;text-align:center;font-size:11px;color:#aab}figure svg{display:block;background:${ground};outline:1px solid #3a4150;margin-bottom:4px}
.town{${vars.join(';')}}</style><div style="width:0;height:0;position:absolute" class="town">${svg}</div>
<div class="town"><p>Current game sprites on the Town Square ground colour (${ground}), drawn at 2 pixels per unit. Your PSD templates use 4 pixels per unit.</p>
${groups.map(([t, f]) => `<h2>${t}</h2><div class="row">${syms.filter(f).map(cell).join('')}</div>`).join('')}</div>`;
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
  console.log('wrote', path.relative(root, out), syms.length, 'sprites');
})();
