#!/usr/bin/env node
/* Town map frame-time benchmark. Usage: node scripts/perf-town.js [--renderer=dom|canvas|pixi] [--seconds=8] [--map=square|big200]
   (--renderer=pixi runs pixi-lab.html with auto-walk instead of the game, with --map choosing its map; the lab is software-rendered WebGL here)
   Walks the player back and forth across Town Square while sampling requestAnimationFrame gaps, under a few weather
   and CPU-throttle combinations (CPU throttling is a rough stand-in for a mid-range phone: headless desktop Chromium
   alone says little about a real device). Prints p50/p95/max frame gap, dropped-frame share and DOM size.
   Needs Playwright, same as tests/run.js. Results are only comparable between runs on the same machine. */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SECONDS = +arg('seconds', 8), RENDERER = arg('renderer', ''), HIDE = arg('hide', ''), ONLY = arg('only', ''), MAP = arg('map', 'square');
// --hide=weather|sky|tiles|all  switches a layer off to show what it costs (diagnostic only); --only=<substring> filters the cases.
const ALL_CASES = [
  { name: 'clear, day',   weather: 'clear', sky: 12 * 60 * 1000, cpu: 1 },
  { name: 'clear, day',   weather: 'clear', sky: 12 * 60 * 1000, cpu: 4 },
  { name: 'rain, night',  weather: 'rain',  sky: 0,              cpu: 1 },
  { name: 'rain, night',  weather: 'rain',  sky: 0,              cpu: 4 },
  { name: 'snow, night',  weather: 'snow',  sky: 0,              cpu: 4 },
];
const CASES = ALL_CASES.filter(c => !ONLY || (c.name + ' ' + c.cpu + 'x').includes(ONLY));

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });   // same flags for every renderer, so WebGL works headless and the comparison is fair
  console.log(`renderer=${RENDERER || 'default'}  hide=${HIDE || 'none'}  ${SECONDS}s per case, 400x860 viewport`);
  console.log('case'.padEnd(18) + 'cpu'.padEnd(5) + 'p50'.padEnd(8) + 'p95'.padEnd(8) + 'max'.padEnd(8) + '>20ms'.padEnd(8) + 'frames'.padEnd(8) + 'townDOM'.padEnd(8) + 'main-thread busy');
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    if (RENDERER === 'pixi') await page.goto('file://' + path.resolve(__dirname, '..', 'pixi-lab.html') + `?panel=0&auto=1&map=${MAP}&weather=${c.weather}&time=${c.sky ? 'day' : 'night'}`);
    else await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + (RENDERER ? '?renderer=' + RENDERER : ''));
    if (RENDERER === 'pixi') await page.waitForFunction(() => window.__lab && window.__lab.ready);
    await page.waitForTimeout(800);
    if (RENDERER !== 'pixi') await page.evaluate(({ weather, sky, hide }) => {
      Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; });
      state.weather = { current: weather, changesAt: Date.now() + 3600e3, elapsed: 0 };
      state.sky.elapsedMs = sky;
      saveState();
      const st = document.createElement('style'); st.textContent = '.overlay{display:none!important}'; document.head.appendChild(st);
      applyWeather(true); applySky(true); renderTown();
      const css = { weather: '.town-weather{display:none!important}', sky: '.town-sky,.town-vignette{display:none!important}', tiles: '.town-tile *{display:none!important}' };
      const off = hide === 'all' ? Object.values(css).join('') : (css[hide] || '');
      if (off) { const h = document.createElement('style'); h.textContent = off; document.head.appendChild(h); }
    }, { ...c, hide: HIDE });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.cpu });
    await page.waitForTimeout(500);
    await cdp.send('Performance.enable');
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const r = await page.evaluate(async ([seconds, pixi]) => {
      let stop = false, walk = () => {};
      if (!pixi) {
      const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
      const goals = [{ x: 7, y: 15 }, { x: 7, y: 8 }];
      let g = 0;
      walk = () => {
        if (stop) return;
        g ^= 1;
        const goal = goals[g], p = findPath(m, data, state.playerPos, (x, y) => x === goal.x && y === goal.y);
        startWalk(p || [], () => setTimeout(walk, 50));
      };
      walk();
      }
      const gaps = []; let last = performance.now(); const t0 = last;
      await new Promise(res => { const f = t => { gaps.push(t - last); last = t; if (t - t0 < seconds * 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      stop = true;
      const s = gaps.slice(1).sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
      return { p50: q(0.5), p95: q(0.95), max: s[s.length - 1], slow: s.filter(x => x > 20).length, n: s.length, dom: pixi ? document.getElementsByTagName('*').length : townView.getElementsByTagName('*').length };
    }, [SECONDS, RENDERER === 'pixi']);
    const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    // Main-thread busy time per second of wall clock: steadier than frame gaps, which vary a lot from run to run.
    const busy = k => ((m1[k] - m0[k]) / SECONDS * 100).toFixed(1) + '%';
    r.cpu = `task ${busy('TaskDuration')} script ${busy('ScriptDuration')} layout ${busy('LayoutDuration')} style ${busy('RecalcStyleDuration')}`;
    console.log(c.name.padEnd(18) + (c.cpu + 'x').padEnd(5) + r.p50.toFixed(1).padEnd(8) + r.p95.toFixed(1).padEnd(8) + r.max.toFixed(1).padEnd(8) + String(r.slow).padEnd(8) + String(r.n).padEnd(8) + String(r.dom).padEnd(8) + r.cpu);
    await ctx.close();
  }
  await browser.close();
})();
