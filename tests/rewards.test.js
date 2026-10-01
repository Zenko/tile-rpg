// Rewards claim center: finished quests are counted, Claim all pays them out once.
module.exports = async (page, assert) => {
  await page.evaluate(() => { ensureQuests(); state.progress.quests.slice(0, 3).forEach(q => { const d = questDef(q.id); state.progress.totals[d.stat] = (state.progress.totals[d.stat] || 0) + d.goal; }); switchTab('quests'); });
  await page.waitForTimeout(300);
  assert.match(await page.locator('#dailyClaim .claim-hero').innerText(), /3 ready to claim/);
  const before = await page.evaluate(() => state.ownedCards.length);
  await page.click('#dailyClaim [data-claimall]'); await page.waitForTimeout(250);
  assert.strictEqual(await page.evaluate(() => state.ownedCards.length), before + 3);
  assert.match(await page.locator('#dailyClaim .claim-hero').innerText(), /Nothing to claim/);
  await page.click('#dailyClaim [data-nsopen]');
  assert.ok(await page.locator('#dailyClaim .quest').count() > 5, 'not-started group did not open');
  await page.click('#segWeekly'); assert.ok(await page.locator('#weeklyClaim .claim-hero').isVisible());
};
