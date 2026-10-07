#!/usr/bin/env node
/* Cuts Alyn's turntable (see HANDOFF.md, "Character system vocabulary") sheet (assets/player/alyn/Alyn_360.svg: 25 turn angles x 3 camera heights, one <g> per view) into the PNGs that
   scripts/build_player_art.py reads:

     node scripts/export-alyn-views.js [path/to/Alyn_360.svg]     (needs playwright)

   Only the eye-level row (camera 0) is used. front/right/back/left.png are the four walking views (0, 90, 180, -90 degrees) and
   turn/aNNN.png are the other angles, named by degrees clockwise from the front (015 ... 345), for turning on the spot.

   The views of a turntable never line up on their own (each one was drawn separately), so every view is aligned here by measurement:
   the torso's horizontal centre goes on the middle line, the soles on the bottom line, and each view is scaled to the row's median
   height. Without that she drifts and pulses while she turns. All views share one canvas size, so the build script must not trim them. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SRC = process.argv[2] || path.join(__dirname, '..', 'assets', 'player', 'alyn', 'Alyn_360.svg');
const OUT = path.join(__dirname, '..', 'assets', 'player', 'alyn');
const K = 1.25;                       // output pixels per sheet unit (the game draws her 240 px wide, so this is about 2x)
const CARDINAL = { 0: 'front', 90: 'right', 180: 'back', 270: 'left' };

(async () => {
  const svg = fs.readFileSync(SRC, 'utf8').replace(/^<\?xml[^>]*\?>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 9891, height: 2383 } });
  await page.setContent('<body style="margin:0;background:transparent">' + svg.replace('<svg ', '<svg id="sheet" style="display:block" width="9890.891" height="2382.783" ') + '</body>');
  const sheet = (await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 9890, height: 2382 } })).toString('base64');

  // measure every eye-level view from a render of the sheet: top, soles, and the centre of the torso band (12-45% down the figure)
  const views = await page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    const out = [];
    document.querySelectorAll('#sheet [id^="Generative_Object_"]').forEach(g => {
      const m = /\((-?\d+),\s*(-?\d+)\)/.exec(g.getAttribute('data-name') || ''); if (!m || +m[2] !== 0) return;
      const bb = g.getBBox(), x0 = Math.max(0, Math.floor(bb.x) - 4), y0 = Math.max(0, Math.floor(bb.y) - 4), w = Math.ceil(bb.width) + 9, h = Math.ceil(bb.height) + 9;
      const d = cx.getImageData(x0, y0, Math.min(w, cv.width - x0), Math.min(h, cv.height - y0)), W = d.width, H = d.height;
      const solid = (x, y) => d.data[(y * W + x) * 4 + 3] > 40;
      let top = -1, bot = -1;
      for (let y = 0; y < H; y++) { let any = false; for (let x = 0; x < W && !any; x++) any = solid(x, y); if (any) { if (top < 0) top = y; bot = y; } }
      const f = bot - top; let sx = 0, n = 0;
      for (let y = top + Math.floor(f * .12); y < top + Math.floor(f * .45); y++) for (let x = 0; x < W; x++) if (solid(x, y)) { sx += x; n++; }
      out.push({ id: g.id, angle: +m[1], ax: x0 + sx / n, top: y0 + top, bot: y0 + bot, w: bb.width });
    });
    return out;
  }, sheet);

  const hs = views.map(v => v.bot - v.top).sort((a, b) => a - b), Hr = hs[hs.length >> 1];
  const Wr = Math.max(...views.map(v => v.w)) + 40, pad = 18;
  const cw = Math.round(Wr * K), ch = Math.round((Hr + 2 * pad) * K);
  const done = [];
  for (const v of views) {
    const deg = ((v.angle % 360) + 360) % 360;
    if (v.angle === 180 && views.some(o => o.angle === -180)) { /* -180 and 180 are the same view; keep 180 as the back */ }
    if (v.angle === -180) continue;
    const s = (v.bot - v.top) / Hr;
    const box = [v.ax - s * Wr / 2, v.bot - s * (Hr + pad), s * Wr, s * (Hr + 2 * pad)];
    await page.evaluate(([id, box, cw, ch]) => {
      const root = document.getElementById('sheet');
      root.setAttribute('viewBox', box.join(' ')); root.setAttribute('width', cw); root.setAttribute('height', ch);
      document.querySelectorAll('#sheet [id^="Generative_Object_"]').forEach(g => { g.style.display = g.id === id ? '' : 'none'; });
    }, [v.id, box, cw, ch]);
    await page.setViewportSize({ width: cw, height: ch });
    const file = CARDINAL[deg] ? path.join(OUT, CARDINAL[deg] + '.png') : path.join(OUT, 'turn', 'a' + String(deg).padStart(3, '0') + '.png');
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: cw, height: ch } });
    done.push(path.basename(file));
  }
  console.log('canvas', cw + 'x' + ch, '|', done.length, 'views:', done.join(' '));
  await browser.close();
})();
