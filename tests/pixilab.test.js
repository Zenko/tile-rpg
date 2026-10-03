// pixi-lab.html boots, draws the real town, switches maps, and keeps the scene small on a huge map. Skips itself when the machine has no WebGL.
const path = require('path');
module.exports = async (page, assert) => {
  const lab = await page.context().newPage(), errors = [];
  lab.on('pageerror', e => errors.push(e.message));
  try {
    await lab.goto('file://' + path.resolve(__dirname, '..', 'pixi-lab.html') + '?panel=0&npcs=6');
    await lab.waitForFunction(() => (window.__lab && window.__lab.ready) || getComputedStyle(document.getElementById('plErr')).display !== 'none', null, { timeout: 30000 });
    if (await lab.evaluate(() => !window.__lab)) { console.log('      (no WebGL here: pixi lab test skipped)'); return; }
    const small = await lab.evaluate(() => ({ w: __lab.S.map.w, h: __lab.S.map.h, scene: __lab.app.stage.children.length, objs: __lab.world.children[1].children.length, ground: __lab.world.children[0].children.length }));
    assert.deepStrictEqual([small.w, small.h], [16, 17], 'Town Square should be 16 x 17');
    assert.ok(small.objs > 20 && small.ground > 0, 'nothing was drawn: ' + JSON.stringify(small));
    await lab.evaluate(() => __lab.rebuildAll('big200'));
    await lab.waitForTimeout(500);
    const big = await lab.evaluate(() => ({ w: __lab.S.map.w, objs: __lab.world.children[1].children.length, ground: __lab.world.children[0].children.length }));
    assert.strictEqual(big.w, 200);
    assert.ok(big.objs < 2500 && big.ground <= 80, 'a 200 x 200 map should keep only the tiles near the camera in the scene: ' + JSON.stringify(big));
    for (const m of ['market', 'harbor', 'garden']) await lab.evaluate(k => __lab.rebuildAll(k), m);
    assert.deepStrictEqual(errors, [], 'page errors in the lab: ' + errors.join('; '));
  } finally { await lab.close(); }
};
