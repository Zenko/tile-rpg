// labs/pixi-battle-lab.html (options A and B for the battle screen) boots, plays an attack in beats for every family, knocks a card out, and drains its particles. Skips itself when there is no WebGL.
const path = require('path');
module.exports = async (page, assert) => {
  const lab = await page.context().newPage(), errors = [];
  lab.on('pageerror', e => errors.push(e.message));
  lab.on('console', m => m.type() === 'error' && !/gstatic|googleapis|fonts|ERR_|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  try {
    await lab.setViewportSize({ width: 400, height: 860 });
    await lab.goto('file://' + path.resolve(__dirname, '..', 'labs/pixi-battle-lab.html'));
    await lab.waitForFunction(() => (window.__bl && window.__bl.ready) || getComputedStyle(document.getElementById('err')).display !== 'none', null, { timeout: 30000 });
    if (await lab.evaluate(() => !window.__bl)) { console.log('      (no WebGL here: pixi battle lab test skipped)'); return; }
    for (let i = 0; i < 4; i++) {   // one attacker per family (grove, stone, tide, wind), each into a different target
      await lab.evaluate(i => __bl.attack('you', i, (i + 1) % 4), i);
      await lab.waitForFunction(() => !__bl.S.busy, null, { timeout: 15000 });
    }
    const hp = await lab.evaluate(() => __bl.S.cards.foe.map(c => c.hp));
    assert.ok(hp.every((v, i) => v <= [7, 6, 5, 4][i]) && hp.some((v, i) => v < [7, 6, 5, 4][i]), 'attacks should hurt their targets: ' + hp);
    const dead0 = await lab.evaluate(() => document.querySelectorAll('#rowFoe .c.dead').length);
    // a knockout, with both layers off (today's plain lunge) and on
    await lab.evaluate(() => { __bl.S.cine = false; __bl.S.stage = false; __bl.S.cards.foe[3].hp = 1; __bl.attack('you', 0, 3); });
    await lab.waitForFunction(() => !__bl.S.busy, null, { timeout: 15000 });
    assert.strictEqual(await lab.evaluate(() => document.querySelectorAll('#rowFoe .c.dead').length), dead0 + 1, 'a card with no grit left should be gone');
    await lab.evaluate(() => { __bl.S.cine = true; __bl.S.stage = true; __bl.S.cards.foe[0].hp = 1; __bl.attack('you', 1, 0); });
    await lab.waitForFunction(() => !__bl.S.busy, null, { timeout: 15000 });
    await lab.waitForFunction(() => __bl.particles() === 0, null, { timeout: 12000 });
    assert.deepStrictEqual(errors, [], 'page errors in the battle lab: ' + errors.join('; '));
  } finally { await lab.close(); }
};
