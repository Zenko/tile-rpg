#!/usr/bin/env node
/* Exports every drawn card picture, icon and keyword icon as a standalone SVG, for reference in Figma or any vector editor.
   Run from the repo root:  node scripts/export-svgs.js [outDir]      (default: assets/svg-reference)
   Reads the same sources as scripts/build-art.js (scripts/art/draw/*.js, keywords.js, cards.js). Each file is cropped to the drawing's own
   bounds, has its gradients inlined and its shape classes (fR, fG, sh, hl ...) turned into plain fill attributes, so it opens correctly
   outside the game. Output: cards/<card-id>.svg, icons/<slug>.svg (slug = the Unicode name), keywords/<keyword>.svg and index.html (a contact sheet). */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.resolve(__dirname, '..'), art = path.join(__dirname, 'art');
const out = path.resolve(process.argv[2] || path.join(root, 'assets/svg-reference'));
const base = require('./art/base');
const keyOf = s => Array.from(s).map(ch => ch.codePointAt(0)).filter(c => c !== 0xFE0F).map(c => c === 0x200D ? '-' : c.toString(16)).join('');
const draw = {};
fs.readdirSync(path.join(art, 'draw')).filter(f => f.endsWith('.js')).sort().forEach(f => { const m = require(path.join(art, 'draw', f)); Object.keys(m).forEach(g => { draw[keyOf(g)] = m[g]; }); });
const kw = require('./art/keywords');
const cardOwn = fs.existsSync(path.join(art, 'cards.js')) ? require('./art/cards') : {};
global.window = {}; require(path.join(root, 'assets/icons/manifest.js'));
const icons = window.ICON_MANIFEST.icons.filter(i => !i.sym);

// class name -> attributes, from base.CSS ("sh", "hl" and "ink" are flat, the rest point at a gradient)
const classAttr = {};
base.CSS.replace(/\.(\w+)\{([^}]*)\}/g, (m, cls, decl) => { if (!/^[a-z]/i.test(cls)) return m; classAttr[cls] = decl; return m; });
const gradients = {};
base.DEFS.replace(/<(linearGradient|radialGradient) id="(\w+)"[\s\S]*?<\/\1>/g, (m, t, id) => { gradients[id] = m; return m; });
const attrsFor = decl => decl.split(';').filter(Boolean).map(p => { const [k, v] = p.split(':'); return `${k.trim()}="${v.trim()}"`; }).join(' ');
function standalone(body, box) {
  // class="fR" -> fill="url(#gR)"; a class list is merged. Keep any attribute the element already has (no duplicates).
  body = body.replace(/<(\w+)([^>]*?)\sclass="([^"]+)"([^>]*?)(\/?)>/g, (m, tag, a, cls, b, close) => {
    const have = a + b, add = [];
    cls.split(/\s+/).forEach(c => { const decl = classAttr[c]; if (!decl) return; decl.split(';').filter(Boolean).forEach(p => { const [k, v] = p.split(':'); const key = k.trim(); if (!new RegExp('\\s' + key + '=').test(have) && !add.some(x => x.startsWith(key + '='))) add.push(`${key}="${v.trim()}"`); }); });
    return `<${tag}${a}${add.length ? ' ' + add.join(' ') : ''}${b}${close}>`;
  });
  // a few sources repeat an attribute (opacity twice): HTML keeps the first, XML refuses the file, so drop later repeats
  body = body.replace(/<(\w+)((?:\s+[\w:-]+="[^"]*")+)\s*(\/?)>/g, (m, tag, attrs, close) => {
    const seenA = new Set(); const kept = attrs.match(/\s+[\w:-]+="[^"]*"/g).filter(a => { const k = a.trim().split('=')[0]; if (seenA.has(k)) return false; seenA.add(k); return true; });
    return `<${tag}${kept.join('')}${close}>`;
  });
  const used = new Set(), want = [], seen = new Set();
  (body.match(/url\(#(\w+)\)/g) || []).forEach(u => want.push(u.slice(5, -1)));
  while (want.length) { const id = want.pop(); if (seen.has(id) || !gradients[id]) continue; seen.add(id); used.add(id); (gradients[id].match(/href="#(\w+)"/g) || []).forEach(h => want.push(h.slice(7, -1))); }
  const defs = [...used].map(id => gradients[id]).join('\n');
  const f = n => +n.toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(box.x)} ${f(box.y)} ${f(box.s)} ${f(box.s)}" width="512" height="512" stroke-linecap="round" stroke-linejoin="round">\n${defs ? `<defs>\n${defs}\n</defs>\n` : ''}${body}\n</svg>\n`;
}

(async () => {
  const browser = await chromium.launch();
  const game = await browser.newPage();
  await game.goto('file://' + path.join(root, 'index.html')); await game.waitForTimeout(600);
  const cards = await game.evaluate(() => CARD_POOL.concat(FOE_CARDS, TOKEN_CARDS).map(c => ({ id: c.id, icon: c.icon, name: c.name })));
  await game.close();
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  await page.setContent(`<style>${base.CSS}</style><svg width="0" height="0" style="position:absolute"><defs>${base.DEFS}</defs></svg><div id="stage"></div>`);
  const box = (body, pad) => page.evaluate(({ body, pad }) => {
    document.getElementById('stage').innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" style="position:absolute;visibility:hidden"><g id="gg">${body}</g></svg>`;
    const b = document.getElementById('gg').getBBox(), side = Math.max(b.width, b.height) + 2 * pad;
    return { x: b.x + b.width / 2 - side / 2, y: b.y + b.height / 2 - side / 2, s: side };
  }, { body, pad });
  const dirs = { cards: [], icons: [], keywords: [] };
  const put = async (dir, name, label, body, pad) => {
    fs.mkdirSync(path.join(out, dir), { recursive: true });
    fs.writeFileSync(path.join(out, dir, name + '.svg'), standalone(body, await box(body, pad)));
    dirs[dir].push([name, label]);
  };
  for (const c of cards) { const body = cardOwn[c.id] || draw[keyOf(c.icon)]; if (body) await put('cards', c.id, `${c.icon} ${c.name}`, body, 0.5); }
  for (const i of icons) if (draw[i.k]) await put('icons', i.slug, i.g, draw[i.k], 0.6);
  for (const k of Object.keys(kw)) await put('keywords', k, k, kw[k], 1.2);
  await browser.close();
  const sheet = Object.keys(dirs).map(d => `<h2>${d} (${dirs[d].length})</h2><div class="g">${dirs[d].map(([n, l]) => `<figure><img src="${d}/${n}.svg" alt=""><figcaption>${l}<br><small>${n}.svg</small></figcaption></figure>`).join('')}</div>`).join('');
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Tile RPG SVG reference</title><style>body{font:14px system-ui;margin:24px;background:#eef0f4;color:#222}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}figure{margin:0;background:#fff;border-radius:10px;padding:8px;text-align:center}img{width:96px;height:96px}figcaption{font-size:12px}small{color:#888;word-break:break-all}</style><h1>Tile RPG: card, icon and keyword art (SVG)</h1>${sheet}`);
  console.log(Object.keys(dirs).map(d => `${d}: ${dirs[d].length}`).join(', '), '->', out);
})();
