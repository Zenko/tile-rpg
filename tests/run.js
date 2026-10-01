#!/usr/bin/env node
/* Browser tests for Tile RPG. Run from the repo root:  node tests/run.js [name-filter]
   Each tests/*.test.js exports an async function (page, t); it gets a fresh page with first-time tips switched off and
   overlays that would block clicks hidden. Any page error or console error fails the test. Needs Playwright:
   `npm i -D playwright` (or a global install) and a Chromium (`npx playwright install chromium`, or set PLAYWRIGHT_BROWSERS_PATH). */
const fs = require('fs'), path = require('path'), assert = require('assert');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(__dirname, '..'), only = process.argv[2] || '';
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f.includes(only)).sort();
// Network noise that is expected in a sandbox or offline CI run (fonts, Firebase) is not a game error.
const NOISE = /gstatic|googleapis|firebase|fonts|ERR_|Failed to load resource/;

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const f of files) {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && !NOISE.test(m.text()) && errors.push(m.text()));
    page.on('dialog', d => setTimeout(() => d.accept().catch(() => {}), 50));
    const t0 = Date.now();
    try {
      await page.goto('file://' + path.join(root, 'index.html')); await page.waitForTimeout(600);
      await page.evaluate(() => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); saveState(); });
      await page.addStyleTag({ content: '.overlay{display:none!important}' });   // level-ups and reveals would intercept clicks
      await require(path.join(__dirname, f))(page, assert);
      if (errors.length) throw new Error('page errors:\n  ' + errors.join('\n  '));
      console.log(`ok    ${f} (${Date.now() - t0}ms)`);
    } catch (e) { failed++; console.log(`FAIL  ${f}\n  ${String(e.stack || e).split('\n').slice(0, 6).join('\n  ')}`); }
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `${failed} of ${files.length} failed` : `all ${files.length} passed`);
  process.exit(failed ? 1 : 0);
})();
