// Buying a pack in the Card Shop (js/pack-tear.js): the foil pack is held up first, swipe across its top (or tap it) to tear it open, and
// only then are you charged and the card revealed. "Put it back" leaves with your money.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { state.progress.pebbles = 200; switchTab('shop'); setShopView('packs'); });
  await page.waitForTimeout(400);
  const cards = await q("state.ownedCards.length"), price = await q("packPrice(PACKS[0])");
  await page.click('.pack .btn >> nth=0'); await page.waitForTimeout(500);
  assert.ok(await q("!!document.getElementById('packTear')"), 'the pack is held up full screen');
  assert.strictEqual(await q("state.progress.pebbles"), 200, 'nothing is charged yet');
  // put it back: no charge, no card
  await page.click('#ptLeave'); assert.ok(await q("!document.getElementById('packTear') && state.progress.pebbles === 200 && state.ownedCards.length === " + cards), 'putting it back costs nothing');
  // a short swipe tears part of it; a full swipe along the top rips it open
  await page.click('.pack .btn >> nth=0'); await page.waitForTimeout(500);
  const pb = await page.locator('#ptPack').boundingBox(), y = pb.y + pb.height * 0.14;
  await page.mouse.move(pb.x + 20, y); await page.mouse.down(); await page.mouse.move(pb.x + 90, y, { steps: 6 });
  assert.ok(await q("packTearUi.tear > 0.1 && packTearUi.tear < 1"), 'a short swipe tears part of the strip');
  await page.mouse.move(pb.x + pb.width - 10, y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(900);
  assert.ok(await q("!document.getElementById('packTear')"), 'tearing it all the way opens the pack');
  assert.strictEqual(await q("state.ownedCards.length"), cards + 1, 'and you get a card'); assert.strictEqual(await q("state.progress.pebbles"), 200 - price, 'and pay for it');
  // three taps do the same
  await page.waitForTimeout(300); await page.evaluate(() => { const o = document.getElementById('pickupOverlay'); if (o) o.classList.add('hidden'); });
  await page.click('.pack .btn >> nth=0'); await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { await page.locator('#ptPack').click({ force: true }); await page.waitForTimeout(80); }
  await page.waitForTimeout(900); assert.strictEqual(await q("state.ownedCards.length"), cards + 2, 'three taps also tear it open');
};
