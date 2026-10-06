// Workshop > Trade up: slots, the tile grid, picking and un-picking, and the trade itself.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; });
    state.ownedCards = []; state.deck = [];
    const commons = CARD_POOL.filter(c => c.rarity === 'common' && !c.spell && !c.exclusive).slice(0, 4);
    commons.forEach(c => state.ownedCards.push(c.id, c.id));
    craftMode = 'trade'; craftSel = { rarity: 'common', picks: [] };
    saveState(); switchTab('collection'); setCardsView('craft');
  });
  await page.waitForTimeout(300);
  assert.strictEqual(await page.locator('.cr-tslot').count(), 4, 'three slots and a result');
  assert.ok(await page.locator('.cr-gridcard').count() >= 3, 'spare cards should be a tile grid');
  await page.locator('.cr-gridcard[data-pick]').first().click();
  assert.strictEqual(await page.evaluate(() => craftSel.picks.length), 1);
  await page.locator('.cr-tslot.filled').first().click();
  assert.strictEqual(await page.evaluate(() => craftSel.picks.length), 0, 'tapping a slot should take the card back');
  for (let i = 0; i < 3; i++) await page.locator('.cr-gridcard[data-pick]').first().click();
  assert.strictEqual(await page.evaluate(() => craftSel.picks.length), 3);
  await page.evaluate(() => { const t = document.getElementById('testHideOverlays'); if (t) t.remove(); const tip = document.getElementById('tipOverlay'); if (tip) tip.classList.add('hidden'); });
  const before = await page.evaluate(() => state.ownedCards.length);
  await page.click('#craftGo'); await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(() => state.ownedCards.length), before - 2, 'three cards in, one out');
};
