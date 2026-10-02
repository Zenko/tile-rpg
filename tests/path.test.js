// Path: skill points, gear and companion bond all flow into cardBonus().
module.exports = async (page, assert) => {
  await page.evaluate(() => { state.progress.level = 6; state.progress.skills = {}; state.progress.gear = {}; state.progress.pebbles = 500; saveState(); switchTab('character'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => charSetView('path')); await page.waitForTimeout(200);
  assert.strictEqual(await page.evaluate(() => skillPointsLeft()), 5, 'level 6 gives 5 points');
  await page.click('[data-skill="angler"]'); await page.click('[data-skill="angler"]');
  assert.strictEqual(await page.evaluate(() => skillRank('angler')), 2);
  assert.ok(Math.abs(await page.evaluate(() => skillBonus('fish')) - 0.08) < 1e-9, 'angler rank 2 = 8%');
  assert.strictEqual(await page.evaluate(() => skillPointsLeft()), 3);
  await page.click('[data-gear="rod"]');
  assert.strictEqual(await page.evaluate(() => gearTier('rod')), 1);
  assert.strictEqual(await page.evaluate(() => state.progress.pebbles), 440, 'rod costs 60');
  assert.ok(Math.abs(await page.evaluate(() => cardBonus('fish')) - 0.14) < 1e-9, 'cardBonus includes skills and gear');
  assert.strictEqual(await page.evaluate(() => { state.progress.level = 2; return gearBlock(GEAR[1]); }), 'Needs Lv 3', 'gear is level-gated');
  await page.click('.pt-reset'); assert.strictEqual(await page.evaluate(() => skillPointsSpent()), 0);
  // companion bond
  const bond = await page.evaluate(() => {
    state.companion = { cardId: 'sprout', name: 'Sprout', icon: '🌱', perk: 'crops', since: Date.now() };
    const l1 = bondLevel(state.companion), b1 = skillBonus('crops');
    companionBond('battlesWon', 4);   // 12 bond
    return { l1, b1, l2: bondLevel(state.companion), b2: skillBonus('crops') };
  });
  assert.deepStrictEqual([bond.l1, bond.b1, bond.l2], [1, 0, 2]);
  assert.ok(Math.abs(bond.b2 - 0.08) < 1e-9, 'bond 2 adds 8% crops');
};
