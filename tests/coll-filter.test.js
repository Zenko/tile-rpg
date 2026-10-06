// My Cards header: search row, Filter sheet (family / rarity / sort), tags and the count badge.
module.exports = async (page, assert) => {
  await page.evaluate(() => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); const tip = document.getElementById('tipOverlay'); if (tip) tip.classList.add('hidden'); CARD_POOL.slice(0, 40).forEach(c => state.ownedCards.push(c.id, c.id)); state.deck = []; cardFilter.q = ''; cardFilter.fam = 'all'; cardFilter.rarity = 'all'; cardFilter.sort = 'rarity'; saveState(); switchTab('collection'); setCardsView('mine'); });
  await page.waitForTimeout(300);
  const tiles = () => page.locator('.card-grid [data-tile]').count();
  const all = await tiles();
  assert.ok(all > 10, 'no tiles');
  assert.ok(!(await page.locator('#collFilterCount').isVisible()), 'badge should be hidden with no filters');
  await page.fill('#collSearch', 'zzzz-no-card'); await page.waitForTimeout(100);
  assert.strictEqual(await tiles(), 0, 'search should empty the grid');
  await page.fill('#collSearch', ''); await page.waitForTimeout(100);
  assert.strictEqual(await tiles(), all);
  await page.evaluate(() => { const t = document.getElementById('testHideOverlays'); if (t) t.remove(); });
  await page.click('#collFilterToggle'); await page.waitForTimeout(500);   // the sheet slides in
  assert.ok(await page.locator('#collFilterSheet').isVisible(), 'sheet did not open');
  await page.click('#csRar [data-r="rare"]'); await page.waitForTimeout(150);
  assert.ok((await tiles()) < all, 'rarity filter did nothing');
  assert.strictEqual(await page.locator('#collFilterCount').textContent(), '1');
  await page.evaluate(() => document.getElementById('tipOverlay').classList.add('hidden'));   // a first-time tip can pop up over the sheet
  await page.click('#csSort [data-s="name"]');
  await page.click('#collSheetDone');
  assert.ok(!(await page.locator('#collFilterSheet').isVisible()), 'sheet did not close');
  assert.strictEqual(await page.locator('#collTags .coll-tag').count(), 2, 'expected a rarity and a sort tag');
  await page.click('#collTags [data-untag="rarity"]');
  assert.strictEqual(await page.locator('#collTags .coll-tag').count(), 1);
  await page.click('#collFilterToggle'); await page.waitForTimeout(500); await page.click('#collClear'); await page.click('#collSheetDone');
  assert.strictEqual(await tiles(), all, 'clear all should restore every card');
  assert.ok(await page.locator('#collTags').evaluate(e => e.classList.contains('hidden')));
};
