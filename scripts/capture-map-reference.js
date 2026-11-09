#!/usr/bin/env node
/* Whole-district map screenshots for art reference: the ground, props, buildings and trees with no HUD, popups, sky, weather or characters.
   Usage:  node scripts/capture-map-reference.js [district ...]        (all four when none are named; needs Playwright, like build-art.js)
           DPR=4 OUT=some/folder node scripts/capture-map-reference.js
   The game never shows more than 7 columns (VIEW_COLS in js/town-render-weather.js), so for the capture only, an in-memory copy of that file is
   served with the constant set to the map's width; nothing in the repo changes. One tile is 64 css px, so DPR 4 (the default) gives 256 px per
   tile, the same scale as the PSD templates in assets/art-templates/. Trees and the ground follow the real calendar's season, so the colours change. */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.resolve(__dirname, '..'), DPR = +process.env.DPR || 4, OUT = path.resolve(process.env.OUT || 'map-reference');
const render = fs.readFileSync(path.join(root, 'js', 'town-render-weather.js'), 'utf8'), page = 'file://' + path.join(root, 'index.html');
// hide the HUD, dock, popups, sky, weather and the player; lift the phone-width cap on the app
const CSS = `.app { max-width: none !important; width: 100% !important; } .overlay, #cardScrim, #journalScrim, #cardSheet, #journalSheet { display: none !important; }
.board-wrap > :not(#screen), #bottomNav, #toast, #tabWin, #winDim, #updateBanner, #townPanel > :not(.town-map-wrap), .map-radar-btn,
.town-sky, .town-weather, .town-vignette, .pfx-motes, .ent.player, .ent.companion { display: none !important; }`;
(async () => {
  const b = await chromium.launch();
  const probe = await (await b.newContext()).newPage(); await probe.goto(page); await probe.waitForTimeout(800);
  const sizes = await probe.evaluate(() => Object.fromEntries(Object.keys(DISTRICTS).map(k => [k, [getMap(k).w, getMap(k).h]]))); await probe.close();
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sizes); fs.mkdirSync(OUT, { recursive: true });
  for (const key of keys) {
    const [cw, ch] = sizes[key]; if (!cw) { console.log('no such district:', key); continue; }
    const ctx = await b.newContext({ viewport: { width: cw * 64, height: ch * 64 }, deviceScaleFactor: DPR });
    await ctx.route('**/js/town-render-weather.js', r => r.fulfill({ contentType: 'application/javascript', body: render.replace('const VIEW_COLS = 7;', `const VIEW_COLS = ${cw};`) }));
    const p = await ctx.newPage(); await p.goto(page); await p.waitForTimeout(1200);
    await p.evaluate(async ([key, css]) => {
      Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); while (storyCur) storyEnd(); storyScenes().seen.intro = true; storyState().beat = 999; tipQueue.length = 0;
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      switchTab('town'); if (state.currentDistrict !== key) travelToDistrictNow(key);
      const d = ensureDistrictData(key); d.npcs.length = 0; d.boss = null; d.items = []; d.spirits = []; d.bugs = [];
      renderTown(); await new Promise(r => setTimeout(r, 1500));
    }, [key, CSS]);
    await p.waitForTimeout(500);
    const file = path.join(OUT, `map-${key}.png`); await (await p.$('#townGrid')).screenshot({ path: file });
    console.log('wrote', path.relative(process.cwd(), file), `${cw} x ${ch} tiles, ${cw * 64 * DPR} x ${ch * 64 * DPR} px`);
    await ctx.close();
  }
  await b.close();
})();
