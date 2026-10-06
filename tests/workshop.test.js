// Workshop: the Forge (Refine) stage, its card strip, the stat choice, the Refine button and the Trade up mode.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    state.ownedCards = []; ['sprout', 'sprout', 'sprout', 'sprout', 'origami-crane', 'origami-crane'].forEach(id => { if (cardDef(id)) state.ownedCards.push(id); });
    CARD_POOL.slice(0, 12).forEach(c => state.ownedCards.push(c.id, c.id, c.id));
    state.deck = []; refineOpenId = null; refineStat = 'p'; craftMode = 'refine'; saveState(); switchTab('collection'); setCardsView('craft');
  });
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.cr-forge').isVisible(), 'forge stage missing');
  assert.strictEqual(await page.locator('.cr-forge .cr-pair .alm-card').count(), 2, 'forge should show the two copies going in');
  assert.ok(await page.locator('.cr-strip .cr-pickcard').count() >= 2, 'strip should list refinable cards');
  // picking another card from the strip moves the forge
  const second = await page.locator('.cr-strip .cr-pickcard').nth(1).getAttribute('data-forge-pick');
  await page.locator('.cr-strip .cr-pickcard').nth(1).click();
  assert.strictEqual(await page.evaluate(() => refineOpenId), second);
  // stat choice changes the preview card and the Refine button
  await page.click('.cr-stat-pick [data-stat="g"]');
  assert.strictEqual(await page.getAttribute('.cr-forge > .btn', 'data-stat'), 'g');
  const before = await page.evaluate(id => state.ownedCards.filter(c => c === id).length, second);
  await page.click('.cr-forge > .btn'); await page.waitForTimeout(450);
  await page.evaluate(() => { const o = document.getElementById('pickupOverlay'); if (o) o.classList.add('hidden'); const r = document.querySelector('.reveal-overlay'); if (r) r.classList.add('hidden'); });
  assert.strictEqual(await page.evaluate(id => state.ownedCards.filter(c => c === id).length, second), before - 2, 'refining should use two copies');
  assert.ok(await page.evaluate(id => state.ownedCards.some(c => c.startsWith(id + '~g')), second), 'refined card missing');
  // Trade up mode
  await page.evaluate(() => { const t = document.getElementById('testHideOverlays'); if (t) t.remove(); });
  await page.click('.cr-mode [data-mode="trade"]');
  assert.ok(await page.locator('.cr-tray').count() === 1 && await page.locator('.cr-forge').count() === 0, 'trade up should show the tray, not the forge');
  await page.click('.cr-mode [data-mode="refine"]');
  assert.ok(await page.locator('.cr-forge, .cr-empty').count() >= 1);
};
