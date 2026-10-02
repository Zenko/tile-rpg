// The calm corner: every activity opens without errors, saved things persist, and Rested adds XP.
module.exports = async (page, assert) => {
  await page.evaluate(() => { state.progress.calm = undefined; openCalm(); });
  assert.ok(await page.locator('#calmOverlay').isVisible(), 'hub opens');
  assert.strictEqual(await page.locator('#calmBody [data-calm]').count(), 8);
  // night so every activity is available
  await page.evaluate(() => { state.sky.elapsedMs = 0; });
  const night = await page.evaluate(() => { for (let t = 0; t < DAY_LEN_MS; t += DAY_LEN_MS / 48) { state.sky.elapsedMs = t; if (skyPhase().isNight) return true; } return false; });
  assert.ok(night, 'found a night time');
  for (const act of ['breathe', 'sand', 'lanterns', 'chimes', 'stars', 'tea', 'bonsai', 'tarot']) {
    await page.evaluate(a => { calmCur = a; calmRender(); }, act);
    assert.ok(await page.locator('#calmBody').innerHTML().then(h => h.length > 40), act + ' rendered');
  }
  // sand: strokes saved and redrawn
  await page.evaluate(() => { calmCur = 'sand'; calmRender(); });
  const box = await page.locator('#cSandCv').boundingBox();
  await page.mouse.move(box.x + 40, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 160, box.y + 120, { steps: 8 }); await page.mouse.up();
  assert.ok(await page.evaluate(() => calmState().sand.strokes.length) >= 1, 'a stroke was saved');
  // stars: finishing a constellation records it
  await page.evaluate(() => { calmCur = 'stars'; calmRender(); });
  for (let i = 0; i < 4; i++) await page.locator('.calm-bigstar').nth(11 + i).click({ force: true });
  assert.ok(await page.evaluate(() => !!calmState().stars['The Lantern']), 'The Lantern was found');
  // bonsai: plant, tend, stage grows with days
  const b = await page.evaluate(() => { calmCur = 'bonsai'; calmRender(); return null; });
  await page.click('#cPlant'); await page.click('#cTend');
  assert.strictEqual(await page.evaluate(() => calmState().bonsai.trimDay === todayKey() && calmState().bonsai.trims), 1);
  const stage = await page.evaluate(() => { calmState().bonsai.since -= 20 * 86400000; return bonsaiStage(); });
  assert.strictEqual(stage, 3, '20+ days of growth is a Bonsai');
  // postcards
  const pc = await page.evaluate(() => { calmCur = 'hub'; calmRender(); calmSavePostcard(); return calmState().postcards.length; });
  assert.strictEqual(pc, 1);
  // rested bonus
  const r = await page.evaluate(() => { const before = skillBonus('xp'); const c = calmState(); c.breathDay = todayKey(); c.breathsToday = 5; return { before, after: skillBonus('xp') }; });
  assert.ok(Math.abs(r.after - r.before - 0.05) < 1e-9, 'Rested adds 5% XP');
  // sit mode and closing
  await page.evaluate(() => calmSit(''));
  assert.ok(await page.evaluate(() => document.body.classList.contains('calm-sit')));
  await page.click('#cStand');
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('calm-sit'))) && !(await page.locator('#calmOverlay').isVisible()), 'standing up closes it');
  // cozy mode hides the goal pill
  const cozy = await page.evaluate(() => { prefs.cozy = true; refreshGoalChip(true); const hidden = document.getElementById('goalChip').classList.contains('hidden'); prefs.cozy = false; return hidden; });
  assert.ok(cozy);
};
