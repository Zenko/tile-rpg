// Battle effects on WebGL (js/battle-fx.js): a hit and a spell draw particles on the overlay canvas, they all expire, and with no WebGL the DOM sparks still run. Skips itself when there is no WebGL.
module.exports = async (page, assert) => {
  await page.evaluate(() => { CARD_POOL.slice(0, 14).forEach(c => state.ownedCards.push(c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); });
  await page.waitForFunction(() => typeof inBattle !== 'undefined' && inBattle && !!document.querySelector('#battleView .card'), null, { timeout: 15000 });
  await page.waitForFunction(() => !!bfx || bfxFailed, null, { timeout: 15000 });
  if (await page.evaluate(() => !bfx)) { console.log('      (no WebGL here: battle fx test skipped)'); return; }
  const r = await page.evaluate(() => {
    const card = document.querySelector('#battleView .card'); const a = btImpact(card, 4); const n1 = bfx.parts.length;
    bfxSpell(200, 300, '#8de0a0', 'rise'); const n2 = bfx.parts.length;
    btImpact(card, 6); return { n1, n2, n3: bfx.parts.length, shown: bfx.app.canvas.style.display, inDom: !!document.getElementById('bfxCanvas'), domSparks: card.querySelectorAll('.impact-spark').length };
  });
  assert.ok(r.n1 > 5 && r.n2 > r.n1 && r.n3 > r.n2 && r.inDom && r.shown === '', 'the hit and the spell should add particles to the overlay: ' + JSON.stringify(r));
  assert.strictEqual(r.domSparks, 0, 'with WebGL effects on, the DOM sparks should not also run');
  await page.waitForFunction(() => bfx.parts.length === 0 && bfx.app.canvas.style.display === 'none', null, { timeout: 8000 });
  // reduced motion and a missing layer both fall back to the DOM sparks
  const fb = await page.evaluate(() => { const card = document.querySelector('#battleView .card'); const keep = bfx; bfx = null; btImpact(card, 4); const dom = card.querySelectorAll('.impact-spark').length; bfx = keep; return dom; });
  assert.ok(fb > 0, 'without the WebGL layer the old DOM sparks should run');
  // the dissolve: a throwaway SVG filter that sweeps away, leaves the card hidden, and cleans up after itself
  const d = await page.evaluate(() => { const card = document.querySelector('#battleView .card'); prefs.fast = false; const ok = bfxDissolve(card); return { ok, filter: card.style.filter, defs: bfxDefs.querySelectorAll('filter').length }; });
  assert.ok(d.ok && /url\(["']?#bfxDiss\d+/.test(d.filter) && d.defs >= 1, 'a fainting card should get a dissolve filter: ' + JSON.stringify(d));
  await page.waitForFunction(() => bfxDefs.querySelectorAll('filter').length === 0, null, { timeout: 5000 });
  assert.strictEqual(await page.evaluate(() => document.querySelector('#battleView .card').style.visibility), 'hidden', 'a dissolved card should stay gone');
};
