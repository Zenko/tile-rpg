// Fate: the 22 Arcana powers. Every one runs through real games without breaking the rules, gating works, and the battle UI wires up.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const ids = Object.keys(BattleEngine.FATES), arcFates = ARCANA.map(a => a.fate);
    const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe).map(c => c.id);
    const mk = s => { let x = s % 2147483647 || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
    const deck = r => { const d = []; while (d.length < 12) { const c = pool[Math.floor(r() * pool.length)]; if (d.filter(x => x === c).length < 2) d.push(c); } return d; };
    const bad = [], used = {};
    ids.forEach(id => {
      for (let g = 0; g < 12; g++) {
        const rd = mk(50 + g), G = BattleEngine.newGame(deck(rd), deck(rd), mk(900 + g), { first: g % 2, fate: [id, null] });
        BattleEngine.startTurn(G);
        for (let t = 0; t < 200 && !G.over; t++) {
          BattleEngine.aiTurn(G, G.active, 'smart');
          if (!G.over && G.active === 0 && BattleEngine.fateReady(G, 0).ok) { if (BattleEngine.useFate(G, 0).ok) used[id] = (used[id] || 0) + 1; if (!G.over) BattleEngine.aiTurn(G, 0, 'smart'); }
          if (!G.over) BattleEngine.endTurn(G, G.active);
        }
        if (!G.over) bad.push(id + ' never finished');
        G.p.forEach(p => { if (p.board.length > BattleEngine.RULES.board) bad.push(id + ' overfull board'); if (p.board.some(c => c.hp <= 0)) bad.push(id + ' dead card on board'); if (p.hand.length > BattleEngine.RULES.handMax) bad.push(id + ' overfull hand'); });
      }
    });
    // gating: not before its turn, only once, never for a side without one
    const G = BattleEngine.newGame(deck(mk(7)), deck(mk(8)), mk(9), { first: 0, fate: ['star', null] }); BattleEngine.startTurn(G);
    const early = BattleEngine.fateReady(G, 0).ok; for (let i = 0; i < 6; i++) { BattleEngine.endTurn(G, 0); BattleEngine.startTurn(G); BattleEngine.endTurn(G, 1); BattleEngine.startTurn(G); }
    const ready = BattleEngine.fateReady(G, 0).ok, first = BattleEngine.useFate(G, 0).ok, second = BattleEngine.useFate(G, 0).ok, other = BattleEngine.fateReady(G, 1).ok;
    return { n: ids.length, mapped: arcFates.every(f => ids.includes(f)) && new Set(arcFates).size === 22, bad, usedAll: ids.every(id => used[id]), early, ready, first, second, other };
  });
  assert.strictEqual(r.n, 22); assert.ok(r.mapped, 'every Arcana maps to a different Fate'); assert.deepStrictEqual(r.bad, []);
  assert.ok(r.usedAll, 'every Fate was used in at least one game');
  assert.ok(!r.early && r.ready && r.first && !r.second && !r.other, 'gated by turn, once only, only for the side that has one');
  // choosing: only attuned, owned Arcana count
  const c = await page.evaluate(() => {
    state.progress.tarot = undefined; tarotState(); state.ownedCards = ['starlight', 'lantern', 'world-tree'];
    const star = ARCANA.findIndex(a => a.card === 'starlight');
    chooseFate(star); const notAttuned = currentFateId();
    tarotAttune(star); chooseFate(star); const attuned = currentFateId();
    state.ownedCards = []; const notOwned = currentFateId();
    return { notAttuned, attuned, notOwned };
  });
  assert.strictEqual(c.notAttuned, null); assert.strictEqual(c.attuned, 'star'); assert.strictEqual(c.notOwned, null);
  // the battle: the picker shows, the button glows from its turn, and using it works through the UI
  await page.evaluate(() => {
    prefs.tossStyle = 'skip'; CARD_POOL.slice(0, 40).forEach(x => state.ownedCards.push(x.id, x.id)); state.ownedCards.push('starlight');
    state.deck = BattleEngine.suggestDeck(ownedCardCounts()); const star = ARCANA.findIndex(a => a.card === 'starlight'); state.progress.tarot.attuned = [star]; chooseFate(star);
    startBattle({ id: 'fate-test', name: 'Test Foe', icon: '🦊', deck: BattleEngine.suggestDeck(ownedCardCounts()), isBoss: false, rewardCard: null, defeated: false, profile: { level: 'gentle', spirit: 15 } });
  });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (await page.evaluate(() => inBattle && battle && battle.G && !battle.busy && !document.getElementById('mulliganOverlay').classList.contains('hidden'))) break; }
  assert.ok(await page.locator('#fateRow .knack-chip').count() >= 2, 'the Fate picker lists None and the attuned Arcana');
  assert.ok(await page.evaluate(() => battle.G.p[0].fate === 'star'), 'the chosen Fate is in the game');
  assert.ok(await page.evaluate(() => !document.getElementById('btFate').classList.contains('hidden')), 'the Fate button is shown');
  const used = await page.evaluate(async () => { const G = battle.G; G.p[0].turns = 9; G.active = 0; G.p[0].spirit = 10; battle.busy = false; await btDoFate(); return { used: G.p[0].fateUsed, spirit: G.p[0].spirit }; });
  assert.ok(used.used && used.spirit === 17, 'The Star restored 7 Spirit through the UI');
};
