// Build 325: every card from a portal or puddle world (ground cards, prizes, keepsakes) and every boss prize is Reborn (markFoil);
// other cards keep the usual small roll, and the cellar (a world, but not a puddle) is not affected.
module.exports = async (page, assert) => {
  const until = (fn, a, ms) => page.waitForFunction(fn, a, { timeout: ms || 8000 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { switchTab('town'); updateHud(); });   // a first reconcile takes the snapshot

  // a prize handed out by a world kind (maze, board, deep, sketch, still) through pwGiveCard
  const r1 = await ev(() => { const n = foilCount('sprout'); pwGiveCard('sprout', 'A prize'); reconcileFoils(); return [n, foilCount('sprout')]; });
  assert.strictEqual(r1[1], r1[0] + 1, 'a world prize is Reborn, once: ' + r1);
  await ev(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));

  // a keepsake (giveSpecialCard with foil) and an ordinary special card
  const r2 = await ev(() => { const id = 'blossom', n = foilCount(id); giveSpecialCard(id, 'A keepsake', true); return [n, foilCount(id)]; });
  assert.strictEqual(r2[1], r2[0] + 1, 'a world keepsake is Reborn');

  // a card lying on the ground inside a puddle world
  await ev(() => { state.progress.pwEndedAt = 0; pwEnter(); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  const r3 = await ev(() => { const data = state.districtData.pw; let item = (data.items || []).find(i => !i.collected); if (!item) { item = { id: 'item-pw-test', x: 1, y: 1, cardId: 'sprout', collected: false, fixed: true }; (data.items = data.items || []).push(item); } const n = foilCount(item.cardId); collectItem(item); reconcileFoils(); return [n, foilCount(item.cardId), foilWorldNow()]; });
  assert.ok(r3[2] && r3[1] === r3[0] + 1, 'a card found in a puddle world is Reborn: ' + r3);
  await ev(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  await ev(() => pwLeave('left'));
  await until(() => state.currentDistrict !== 'pw' && !document.querySelector('.travel-fade, .warp-fx'));

  // in town the same pickup is not Reborn (the 2% roll is pinned off)
  const r4 = await ev(() => { const real = Math.random; Math.random = () => 0.99; const id = 'feather', n = foilCount(id), item = { cardId: id, collected: false };
    collectItem(item); reconcileFoils(); Math.random = real; return [n, foilCount(id), foilWorldNow()]; });
  assert.ok(!r4[2] && r4[1] === r4[0], 'a card found in town keeps the usual roll: ' + r4);
  await ev(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));

  // a boss's prize: a boss match won
  const r5 = await ev(async () => {
    state.deck = CARD_POOL.slice(0, 12).map(c => c.id); CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); reconcileFoils();
    const boss = ensureDistrictData('square').boss || Object.assign({}, ensureDistrictData('square').npcs[0], { isBoss: true });
    boss.rewardCard = 'pebble'; boss.defeated = false;
    startBattleNow(boss, 0);
    const before = Object.assign({}, foils()); battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish();
    await new Promise(r => setTimeout(r, 1500)); const id = boss.rewardCard; return [before[id] || 0, foilCount(id), id];
  });
  assert.strictEqual(r5[1], r5[0] + 1, 'a boss prize is Reborn: ' + r5);
};
