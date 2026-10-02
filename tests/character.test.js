// Character tab: four views, pinning is capped at three, titles can be worn from Me.
module.exports = async (page, assert) => {
  await page.evaluate(() => switchTab('character')); await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => [...document.querySelectorAll('#chSeg .seg-btn')].map(b => b.textContent).join()), 'Me,Path,Look,Pantry,Companion');
  await page.click('[data-pin="Friends"]');   // already three pinned by default: refused
  assert.strictEqual(await page.evaluate(() => charPins().length), 3);
  await page.click('[data-pin="Wins"]'); await page.click('[data-pin="Friends"]');
  assert.deepStrictEqual(await page.evaluate(() => charPins()), ['Cards', 'Milestones', 'Friends']);
  for (const v of ['look', 'bag', 'pals', 'me']) { await page.click(`#chSeg [data-v="${v}"]`); await page.waitForTimeout(80); }
};
