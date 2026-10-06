// Guide me there (js/guide-walk.js): the goal chip and Journal "Go" buttons walk the player to the target and go in.
module.exports = async (page, assert) => {
  const reset = (district) => page.evaluate((d) => {
    while (typeof storyCur !== 'undefined' && storyCur) storyEnd();
    state.currentDistrict = d; state.playerPos = Object.assign({}, getMap(d).spawn);
    ['square', 'market'].forEach(k => ensureDistrictData(k).items.forEach(i => { i.collected = true; }));   // a card pickup would stop the walk
    renderTown(); switchTab('town');
  }, district);

  await page.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0.99; });   // no hidden-card finds on the way
  // ---- a building in this district: the player walks to the door and the scene opens ----
  await reset('square');
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = ''; journalGo(JPLACES.bakery); });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.querySelector('.bld[data-building="bakery"]') && true), 'bakery exists');
  assert.ok(await page.evaluate(() => playerEl.classList.contains('walking')), 'the player starts walking by themselves');
  await page.waitForFunction(() => document.body.classList.contains('in-scene'), null, { timeout: 12000 });
  assert.strictEqual(await page.evaluate(() => scene && scene.id), 'bakery', 'it walked into the bakery');
  await page.evaluate(() => closeScene && closeScene());

  // ---- a building in another district: it crosses over first, then walks to the door ----
  await reset('square');
  await page.evaluate(() => { state.wins = 99; state.progress.level = 99; journalGo(JPLACES.shop); });
  await page.waitForFunction(() => document.body.classList.contains('in-scene'), null, { timeout: 15000 });
  assert.deepStrictEqual(await page.evaluate(() => [state.currentDistrict, scene.id]), ['market', 'card-shop']);
  await page.evaluate(() => closeScene && closeScene());

  // ---- a tap on the map cancels a trip; a locked district just says so ----
  await reset('square');
  await page.evaluate(() => { journalGo(JPLACES.bakery); });
  await page.waitForTimeout(300);
  await page.evaluate(() => cancelWalk());
  await page.waitForTimeout(800);
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('in-scene'))), 'a cancelled walk does not go in');

  // ---- neighbour, help, minigame and the diamond ----
  await reset('square');
  const t = await page.evaluate(() => ({
    help: guideResolve({ help: true }), mini: guideResolve({ minigame: true }),
    keys: ['wander', 'npc', 'fish', 'minigame', 'boss', 'rival', 'travel'].every(k => guideWants({ [k]: 1 })),
    none: guideWants({ tab: 'town' })
  }));
  assert.ok(t.help && t.help.scene && t.mini && t.mini.scene, 'help and minigame resolve to a building');
  assert.ok(t.keys && !t.none);
  await page.evaluate(() => { guideMarkApply({ scene: 'bakery', district: 'square', name: 'x' }); });
  assert.ok(await page.evaluate(() => !!document.querySelector('.bld[data-building="bakery"].goal-target')), 'the target building gets the diamond');
  await page.evaluate(() => { guideMarkApply(null); });
  assert.ok(await page.evaluate(() => !document.querySelector('.goal-target')), 'and loses it');

  await page.evaluate(() => { guideTo({ npc: true }); });
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => playerEl.classList.contains('walking') || !document.getElementById('talkOverlay').classList.contains('hidden')), 'walking to a neighbour');
  await page.waitForFunction(() => !document.getElementById('talkOverlay').classList.contains('hidden'), null, { timeout: 15000 });
};
