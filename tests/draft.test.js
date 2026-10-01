// Draft Run: unlocks at its level, twelve picks build a neutral deck, a win moves on, a loss ends the run.
module.exports = async (page, assert) => {
  await page.evaluate(() => { prefs.tossStyle = 'skip'; prefs.fast = true; ensureLevel().level = 10; saveState(); openScene('cup'); });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('testHideOverlays').remove());
  await page.evaluate(() => { const o = document.getElementById('tipOverlay'); if (o) o.classList.add('hidden'); });
  await page.click('[data-act="draft"]'); await page.waitForTimeout(300);
  await page.click('[data-act="draft-start"]'); await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) { await page.click('.draft-opt >> nth=1'); await page.waitForTimeout(100); await page.click('#draftTake'); await page.waitForTimeout(120); }
  assert.strictEqual(await page.evaluate(() => draftState().picks.length), 12);
  await page.waitForTimeout(500);
  await page.click('[data-act="draft-play"]'); await page.waitForTimeout(4200);
  assert.ok(await page.evaluate(() => battle.neutral), 'draft battles must be neutral (no world mods, no snack)');
  const winsBefore = await page.evaluate(() => state.wins);
  await page.evaluate(() => { battle.G.over = true; battle.G.winner = 0; battle.G.events.length = 0; btFinish(); });
  await page.waitForTimeout(1200);
  assert.strictEqual(await page.evaluate(() => draftState().round), 1, 'a win should advance the round');
  assert.strictEqual(await page.evaluate(() => state.wins), winsBefore, 'draft wins must not count as normal wins');
  await page.evaluate(() => closeBattle()); await page.waitForTimeout(1300);
  await page.click('[data-act="draft-play"]'); await page.waitForTimeout(4200);
  await page.evaluate(() => { battle.G.over = true; battle.G.winner = 1; battle.G.events.length = 0; btFinish(); });
  await page.waitForTimeout(1200);
  assert.strictEqual(await page.evaluate(() => draftState().active), false, 'a loss should end the run');
};
