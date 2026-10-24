// Reborn odds (builds 325-326): a card from a portal or puddle world (ground cards, prizes, keepsakes) or a boss's prize rolls the
// better FOIL_SOURCE_ODDS (markFoil); any other new card the ordinary FOIL_ODDS; each copy is rolled once. A pinned roll of 0.05 is
// under the special chance and over the ordinary one, so it tells the two apart; 0.5 misses both. The cellar is not a puddle.
module.exports = async (page, assert) => {
  const until = (fn, a, ms) => page.waitForFunction(fn, a, { timeout: ms || 8000 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const hide = () => ev(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  await ev(() => { switchTab('town'); updateHud(); window.__pin = v => { window.__real = window.__real || Math.random; Math.random = () => v; }; window.__unpin = () => { if (window.__real) Math.random = window.__real; }; });
  assert.ok(await ev(() => FOIL_ODDS < 0.05 && FOIL_SOURCE_ODDS > 0.05 && FOIL_SOURCE_ODDS * 3 > 0.05 && FOIL_ODDS * 3 < 0.05), 'the pinned roll sits between the two chances (starfall included)');

  // a prize handed out by a world kind (maze, board, deep, sketch, still) through pwGiveCard: a hit, then a miss, each rolled once
  const r1 = await ev(() => { const n = foilCount('sprout'); __pin(0.05); pwGiveCard('sprout', 'A prize'); reconcileFoils(); __unpin(); return [n, foilCount('sprout')]; });
  assert.strictEqual(r1[1], r1[0] + 1, 'a world prize can be Reborn, once: ' + r1);
  await hide();
  const r1b = await ev(() => { const n = foilCount('sprout'); __pin(0.5); pwGiveCard('sprout', 'A prize'); __unpin(); __pin(0.001); reconcileFoils(); __unpin(); return [n, foilCount('sprout')]; });
  assert.strictEqual(r1b[1], r1b[0], 'a miss stays plain, and the ordinary roll does not get a second go at that copy: ' + r1b);
  await hide();

  // a keepsake (giveSpecialCard with foil)
  const r2 = await ev(() => { const id = 'blossom', n = foilCount(id); __pin(0.05); giveSpecialCard(id, 'A keepsake', true); __unpin(); return [n, foilCount(id)]; });
  assert.strictEqual(r2[1], r2[0] + 1, 'a world keepsake can be Reborn');

  // a card lying on the ground inside a puddle world
  await ev(() => { state.progress.pwEndedAt = 0; pwEnter(); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  const r3 = await ev(() => { const data = state.districtData.pw; let item = (data.items || []).find(i => !i.collected); if (!item) { item = { id: 'item-pw-test', x: 1, y: 1, cardId: 'sprout', collected: false, fixed: true }; (data.items = data.items || []).push(item); } const n = foilCount(item.cardId); __pin(0.05); collectItem(item); reconcileFoils(); __unpin(); return [n, foilCount(item.cardId), foilWorldNow()]; });
  assert.ok(r3[2] && r3[1] === r3[0] + 1, 'a card found in a puddle world rolls the better chance: ' + r3);
  await hide();
  await ev(() => pwLeave('left'));
  await until(() => state.currentDistrict !== 'pw' && !document.querySelector('.travel-fade, .warp-fx'));

  // in town the same roll is not enough: ordinary cards have the small chance
  const r4 = await ev(() => { const id = 'feather', n = foilCount(id), item = { cardId: id, collected: false }; __pin(0.05); collectItem(item); reconcileFoils(); __unpin(); return [n, foilCount(id), foilWorldNow()]; });
  assert.ok(!r4[2] && r4[1] === r4[0], 'a card found in town has only the small chance: ' + r4);
  await hide();

  // a boss's prize: a boss match won
  const r5 = await ev(async () => {
    state.deck = CARD_POOL.slice(0, 12).map(c => c.id); CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); reconcileFoils();
    const boss = ensureDistrictData('square').boss || Object.assign({}, ensureDistrictData('square').npcs[0], { isBoss: true });
    boss.rewardCard = 'pebble'; boss.defeated = false;
    startBattleNow(boss, 0);
    const before = Object.assign({}, foils()); battle.G.over = true; battle.G.winner = 0; battle.G.events = []; __pin(0.05); btFinish();
    await new Promise(r => setTimeout(r, 1500)); __unpin(); const id = boss.rewardCard; return [before[id] || 0, foilCount(id), id];
  });
  assert.strictEqual(r5[1], r5[0] + 1, 'a boss prize rolls the better chance: ' + r5);
};
