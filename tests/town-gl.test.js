// The WebGL town (js/town-gl.js): the ground is a canvas, the DOM keeps only entities and buildings, the camera moves ground and entities
// together, and the game falls back to the classic tiles if WebGL is unavailable. Skips itself when the machine has no WebGL.
const path = require('path');
module.exports = async (page, assert) => {
  await page.waitForFunction(() => typeof tglState !== 'undefined' && tglState !== 'init', null, { timeout: 30000 });
  if (await page.evaluate(() => tglState === 'off')) { console.log('      (no WebGL here: town-gl test skipped)'); return; }
  await page.waitForFunction(() => tglOn(), null, { timeout: 15000 });

  // 1. the DOM is small: no per-tile divs, and the canvases are in place around #townWorld
  const a = await page.evaluate(() => ({ dom: townView.getElementsByTagName('*').length, tiles: document.querySelectorAll('.town-tile:not(.ov)').length,
    order: [...townView.children].map(c => c.className.split(' ')[0] || c.tagName).join(',') }));
  assert.strictEqual(a.tiles, 0, 'tile divs should not exist while WebGL draws the ground');
  assert.ok(a.dom < 250, 'the town DOM should be small, got ' + a.dom);
  assert.ok(await page.evaluate(() => document.getElementById('glMapToggle').classList.contains('on')), 'the Smooth map switch should read on');
  assert.ok(/town-gl,town-world,town-front,town-sky/.test(a.order), 'layer order is wrong: ' + a.order);

  // 2. camera sync: after a walk the DOM entity layer and the Pixi world sit at the same place, and the camera follows the player
  const b = await page.evaluate(async () => {
    // Neighbours wander and are placed at random: one on the route (or the goal) would block the walk, so the district is emptied first.
    const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = []; data.bugs = []; renderTown();
    const p = findPath(m, data, state.playerPos, (x, y) => x === 7 && y === 8);
    await new Promise(res => { startWalk(p, res); setTimeout(res, 6000); });
    await new Promise(r => setTimeout(r, 400));
    const mt = new DOMMatrix(getComputedStyle(townWorld).transform), c = tglCamNow();
    return { dx: Math.abs(mt.m41 - c.cx), dy: Math.abs(mt.m42 - c.cy), gx: tgl.world.position.x - c.cx, gy: tgl.world.position.y - c.cy, pos: state.playerPos };
  });
  assert.ok(b.dx < 0.01 && b.dy < 0.01 && b.gx === 0 && b.gy === 0, 'ground and entity layer disagree: ' + JSON.stringify(b));
  assert.deepStrictEqual([b.pos.x, b.pos.y], [7, 8]);

  // 3. tree overhangs: with the camera at the bottom edge there are trees with a walkable tile to their north, so strips are drawn in front
  const s = await page.evaluate(async () => { state.playerPos = { x: 7, y: 15 }; updateCamera(false); await new Promise(r => setTimeout(r, 100));
    const fc = tgl.front, px = fc.getContext('2d').getImageData(0, 0, fc.width, fc.height).data; let drawn = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) { drawn++; break; }
    return { strips: tgl.strips.length, drawn }; });
  assert.ok(s.strips > 0 && s.drawn === 1, 'tree overhang strips were not drawn: ' + JSON.stringify(s));

  // 4. placement glow works through overlay tiles, and the overlays are released afterwards (fish hints stay)
  const o = await page.evaluate(() => {
    placingDecoration = { district: state.currentDistrict }; highlightPlaceableTiles();
    const lit = document.querySelectorAll('.town-tile.placeable').length;
    placingDecoration = null; clearPlaceableHighlight();
    return { lit, left: [...document.querySelectorAll('.town-tile')].filter(e => !e.classList.contains('fishspot')).length };
  });
  assert.ok(o.lit > 10, 'no tiles glowed for placement: ' + o.lit);
  assert.strictEqual(o.left, 0, 'highlight overlays were not released');

  // 4b. Hide and Seek glows the candidate tiles the same way, and the found / wrong marks land on the right tiles
  const h = await page.evaluate(() => {
    HIDESEEK.phase = 'seek'; HIDESEEK.spots = [{ x: 7, y: 14 }, { x: 6, y: 14 }]; hideseekHighlight();
    const spots = [...document.querySelectorAll('.town-tile.hideseek-spot')].map(e => e.dataset.x + ',' + e.dataset.y).sort();
    hideseekEl(7, 14).classList.add('hideseek-found'); hideseekEl(2, 2).classList.add('hideseek-wrong');
    const marked = document.querySelectorAll('.town-tile.hideseek-found, .town-tile.hideseek-wrong').length;
    hideseekClearHighlight(); HIDESEEK.phase = 'idle'; HIDESEEK.spots = [];
    return { spots, marked, left: [...document.querySelectorAll('.town-tile')].filter(e => !e.classList.contains('fishspot')).length };
  });
  assert.deepStrictEqual(h, { spots: ['6,14', '7,14'], marked: 2, left: 0 });

  // 5. a theme change recolours the ground (new texture signature) without errors
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.waitForFunction(() => tgl.sig.includes('|light|'), null, { timeout: 10000 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForFunction(() => tgl.sig.includes('|dark|'), null, { timeout: 10000 });

  // 6. travelling to another district rebuilds the scene
  const t = await page.evaluate(async () => { state.currentDistrict = 'market'; state.playerPos = { x: 6, y: 13 }; renderTown(); await new Promise(r => setTimeout(r, 300)); return { key: tgl.map.key, tiles: document.querySelectorAll('.town-tile:not(.ov)').length }; });
  assert.deepStrictEqual(t, { key: 'market', tiles: 0 });

  // 7. fallback: if WebGL fails the classic tiles take over and the town keeps working
  const f = await page.evaluate(async () => { tglFallback(new Error('test')); await new Promise(r => setTimeout(r, 300));
    const m = getMap(state.currentDistrict); return { state: tglState, tiles: document.querySelectorAll('.town-tile:not(.ov)').length, want: m.w * m.h, canvases: townView.querySelectorAll('canvas.town-gl').length }; });
  assert.strictEqual(f.state, 'off'); assert.strictEqual(f.tiles, f.want, 'classic tiles did not come back'); assert.strictEqual(f.canvases, 0);
  assert.ok(await page.evaluate(() => !document.getElementById('glMapToggle').classList.contains('on')), 'the Smooth map switch should read off after a fallback');

  // 8. ?renderer=dom never starts the WebGL path at all
  const classic = await page.context().newPage(), errors = [];
  classic.on('pageerror', e => errors.push(e.message));
  try {
    await classic.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?renderer=dom'); await classic.waitForTimeout(800);
    const c = await classic.evaluate(() => { const m = getMap(state.currentDistrict); return { state: tglState, tiles: document.querySelectorAll('.town-tile').length === m.w * m.h, canvases: townView.querySelectorAll('canvas.town-gl').length }; });
    assert.deepStrictEqual(c, { state: 'off', tiles: true, canvases: 0 });
    assert.deepStrictEqual(errors, [], 'errors in classic mode: ' + errors);
  } finally { await classic.close(); }
};
