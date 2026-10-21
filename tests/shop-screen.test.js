// The Card Shop front as a full screen (js/shop-screen.js): four displays, each opening the Shop view its button used to, and a Leave button.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; openScene('card-shop'); });
  await page.waitForTimeout(400);
  assert.ok(await q("shopOpen() && document.body.classList.contains('in-shopfront')"), 'the shop front opens as a full screen');
  assert.strictEqual(await page.locator('.cs-case').count(), 4, 'four displays');
  for (const [id, mode] of [['packs', 'packs'], ['customize', 'customize'], ['items', 'items'], ['sleeves', 'sleeves']]) {
    await page.click(`[data-shop="${id}"]`); await page.waitForTimeout(400);
    assert.ok(await q(`!shopOpen() && scene.mode === '${mode}'`), `the ${id} display opens its view and puts the front away`);
    await q("sceneAction('back')"); await page.waitForTimeout(300); assert.ok(await q("shopOpen()"), `Back returns to the front from ${id}`);
  }
  await page.click('#csLeave'); await page.waitForTimeout(1100); assert.ok(await q("!shopOpen() && !inScene"), 'Leave goes back to the street');
};
