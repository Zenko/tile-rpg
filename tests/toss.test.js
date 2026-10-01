// Who goes first: the coin and the dice both hand the match over, and the loser's seat gets the catch-up card.
module.exports = async (page, assert) => {
  const hands = await page.evaluate(() => {
    const ids = CARD_POOL.filter(c => !c.exclusive).slice(0, 30).map(c => c.id), deck = () => ids.slice(0, 12);
    return [0, 1].map(first => { const G = BattleEngine.newGame(deck(), deck(), Math.random, { first }); return [G.p[0].hand.length, G.p[1].hand.length]; });
  });
  assert.deepStrictEqual(hands[0], [3, 4], 'seat 1 should get the extra card when seat 0 goes first');
  assert.deepStrictEqual(hands[1], [4, 3]);
  await page.evaluate(() => document.getElementById('testHideOverlays').remove());
  for (const style of ['coin', 'dice']) {
    await page.evaluate(s => { prefs.tossStyle = s; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); }, style);
    await page.waitForTimeout(400);
    assert.ok(!(await page.evaluate(() => document.getElementById('tossOverlay').classList.contains('hidden'))), style + ': toss did not show');
    await page.click(style === 'coin' ? '[data-call="sun"]' : '[data-roll]');
    await page.waitForFunction(() => document.getElementById('tossOverlay').classList.contains('hidden'), null, { timeout: 8000 });
    await page.waitForFunction(() => inBattle && battle && !battle.ended && battle.G, null, { timeout: 12000 });
    const st = await page.evaluate(() => ({ inBattle, first: battle.first, active: battle.G.active }));
    assert.ok(st.inBattle && (st.first === 0 || st.first === 1), style + ': no battle after the toss');
    await page.evaluate(() => { battle.ended = true; closeBattle(); });
    await page.waitForFunction(() => !inBattle, null, { timeout: 8000 });
  }
};
