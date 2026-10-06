// pixi-fx-lab.html boots, builds all three prototypes (holo card, night lights + water, battle hit), survives a strike and a dissolve, and keeps its particle list drained. Skips itself when the machine has no WebGL.
const path = require('path');
module.exports = async (page, assert) => {
  const lab = await page.context().newPage(), errors = [];
  lab.on('pageerror', e => errors.push(e.message));
  try {
    await lab.goto('file://' + path.resolve(__dirname, '..', 'pixi-fx-lab.html'));
    await lab.waitForFunction(() => (window.__fx && window.__fx.ready) || getComputedStyle(document.getElementById('fxErr')).display !== 'none', null, { timeout: 30000 });
    if (await lab.evaluate(() => !window.__fx)) { console.log('      (no WebGL here: pixi fx lab test skipped)'); return; }
    for (const r of ['common', 'rare', 'ultra', 'super', 'mythic']) await lab.evaluate(r => __fx.setCardRarity(r), r);
    await lab.evaluate(() => __fx.show('night')); await lab.waitForTimeout(400);
    assert.ok(await lab.evaluate(() => __fx.night.lights.length) >= 4, 'the yard should start with its lamps');
    await lab.evaluate(() => __fx.show('battle')); await lab.waitForTimeout(300);
    await lab.evaluate(() => { __fx.bat.foes[2].hp = 1; __fx.strike(2); });
    await lab.waitForTimeout(2500);
    assert.strictEqual(await lab.evaluate(() => __fx.bat.busy), false, 'a strike should finish and free the table');
    assert.strictEqual(await lab.evaluate(() => __fx.particles()), 0, 'strike particles should all expire');
    assert.deepStrictEqual(errors, [], 'page errors in the fx lab: ' + errors.join('; '));
  } finally { await lab.close(); }
};
