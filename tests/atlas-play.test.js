// Playing through the Atlas's challenges from its scene: a battle won, and a harder game finished.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    CARD_POOL.filter(c => !c.exclusive).slice(0, 40).forEach(c => state.ownedCards.push(c.id, c.id));
    state.ownedCards.push('the-atlas'); state.deck = BattleEngine.suggestDeck(ownedCardCounts()); prefs.tossStyle = 'skip'; checkBinder();
    state.progress.pebbles = 0; openScene('atlas'); sceneAction('atlas-battle');
    sceneAction('atlasb:0'); sceneAction('atlasb:0');          // the first tap arms it, the second begins
  });
  await page.waitForFunction(() => typeof inBattle !== 'undefined' && inBattle && battle && battle.npc && battle.npc.atlas, null, { timeout: 15000 });
  const twist = await page.evaluate(() => battle.G.twist && battle.G.twist.kind);
  assert.strictEqual(twist, 'bloom', 'the first challenge bends the Counting rule');
  await page.evaluate(() => { battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); });
  await page.waitForFunction(() => !document.getElementById('battleEndOverlay').classList.contains('hidden'), null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ wins: atlasState().wins, embers: state.progress.pebbles, next: atlasBattleOpen(1), title: document.getElementById('battleEndTitle').textContent }));
  assert.strictEqual(r.wins, 1); assert.ok(r.embers >= 30, 'the first win pays at least 30 Embers: ' + r.embers); assert.ok(r.next, 'winning opens the next challenge'); assert.ok(/done/.test(r.title));
  await page.evaluate(() => { closeBattle(); });
  const r0 = r.embers;
  const g = await page.evaluate(() => { openScene('atlas'); sceneAction('atlas-games'); miniStart('tea', true); miniFinish(300); return { embers: state.progress.pebbles, text: scene.text }; });
  assert.ok(g.embers > r0, 'a gold game pays Embers: ' + JSON.stringify(g));
};
