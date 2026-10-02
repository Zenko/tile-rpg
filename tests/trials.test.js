// Trials of the Arcana: foes bring a Fate and Spread, the AI uses the Fate, wins pay out once, trials open in order.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = { bad: [], fates: 0 };
    TRIALS.forEach((t, k) => {
      const o = trialOpponent(k);
      if (o.deck.length !== DECK_SIZE) out.bad.push(t.title + ' deck ' + o.deck.length);
      if (!o.spread || o.spread.length !== 3) out.bad.push(t.title + ' no spread');
      const mine = BattleEngine.suggestDeck(Object.fromEntries(CARD_POOL.filter(c => !c.spell && !c.exclusive && !c.foe && c.rarity === 'common').map(c => [c.id, 2])));
      const G = BattleEngine.newGame(mine, o.deck, Math.random, { first: 1, fate: [null, o.fate], spread: [null, o.spread] });
      BattleEngine.startTurn(G);
      for (let q = 0; q < 200 && !G.over; q++) { BattleEngine.aiTurn(G, G.active, 'smart'); if (!G.over) BattleEngine.endTurn(G, G.active); }
      if (!G.over) out.bad.push(t.title + ' never finished');
      if (G.p[1].fateUsed) out.fates++;
    });
    return out;
  });
  assert.deepStrictEqual(r.bad, []); assert.ok(r.fates >= 3, 'trial foes use their Fate');
  const g = await page.evaluate(() => {
    ensureLevel().level = 10; state.progress.trials = undefined;
    return { open0: trialOpen(0), open1: trialOpen(1), locked: featureLocked('spread') };
  });
  assert.ok(g.open0 && !g.open1 && !g.locked, 'only the first trial is open at the start');
  // winning pays the Arcana card once, later wins pay Pebbles; the next trial opens
  const w = await page.evaluate(() => {
    state.ownedCards = []; const before = state.progress.pebbles;
    const win = () => { battle = { npc: { trial: { k: 0 } }, rewarded: false }; trialWin(); return battle.rewarded; };
    win(); const own1 = state.ownedCards.filter(c => c === ARCANA[0].card).length, open1 = trialOpen(1), peb1 = (state.progress.pebbles) - before;
    win(); const own2 = state.ownedCards.filter(c => c === ARCANA[0].card).length, peb2 = (state.progress.pebbles) - before;
    battle = null; return { own1, own2, open1, peb1, peb2 };
  });
  assert.strictEqual(w.own1, 1); assert.strictEqual(w.own2, 1, 'the card comes only once'); assert.ok(w.open1, 'the next trial opens');
  assert.ok(w.peb2 - w.peb1 === 6, 'a repeat win pays 6 Pebbles');
  // the tab renders
  await page.evaluate(() => { tarotView = 'trials'; openCalm('tarot'); });
  assert.ok(await page.locator('#trBody .tl-row').count() === 5, 'five trials are listed');
  assert.ok(await page.locator('#trBody .tl-row.lock').count() === 3, 'three still locked');
};
