// Journal pages open; What's new shows the newest Beta and keeps the old history collapsed.
module.exports = async (page, assert) => {
  await page.evaluate(() => switchTab('journal')); await page.waitForTimeout(250);
  for (const id of ['segToday', 'segEventLog', 'segBattles', 'segJAlmanac', 'segNotes']) { await page.click('#' + id); await page.waitForTimeout(120); }
  await page.evaluate(() => openJournalSheet('updates')); await page.waitForTimeout(300);
  const txt = () => page.evaluate(() => document.getElementById('changelogView').innerText);
  const a = await txt();
  assert.match(a, /Beta 1/); assert.match(a, /Before Beta/);
  await page.locator('#changelogView').getByText(/Before Beta/).first().click(); await page.waitForTimeout(150);
  assert.ok((await txt()).length > a.length + 1000, 'history did not expand');
};
