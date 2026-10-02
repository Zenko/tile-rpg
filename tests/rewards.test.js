// Rewards claim center: finished quests are counted, Claim all pays them out once.
module.exports = async (page, assert) => {
  await page.evaluate(() => { ensureQuests(); state.progress.quests.slice(0, 3).forEach(q => { const d = questDef(q.id); state.progress.totals[d.stat] = (state.progress.totals[d.stat] || 0) + d.goal; }); switchTab('quests'); });
  await page.waitForTimeout(300);
  // Quests that share a stat finish together, so the number ready is at least 3 but not fixed: read it from the hero.
  const ready = +(/(\d+) ready to claim/.exec(await page.locator('#dailyClaim .claim-hero').innerText()) || [])[1];
  assert.ok(ready >= 3, 'expected at least 3 ready, saw ' + ready);
  const before = await page.evaluate(() => state.ownedCards.length);
  await page.click('#dailyClaim [data-claimall]'); await page.waitForTimeout(250);
  assert.strictEqual(await page.evaluate(() => state.ownedCards.length), before + ready);
  // Claiming a card can itself finish another quest (e.g. "find a card"), so keep claiming until nothing is left.
  for (let i = 0; i < 4 && await page.locator('#dailyClaim [data-claimall]').count(); i++) { await page.click('#dailyClaim [data-claimall]'); await page.waitForTimeout(250); }
  assert.match(await page.locator('#dailyClaim .claim-hero').innerText(), /Nothing to claim/);
  await page.click('#dailyClaim [data-nsopen]');
  assert.ok(await page.locator('#dailyClaim .quest').count() > 5, 'not-started group did not open');
  await page.click('#segWeekly'); assert.ok(await page.locator('#weeklyClaim .claim-hero').isVisible());
};
