// Fate Spread: Past/Present/Future layout, Harmony and Contrast, and the deck-screen validity rules.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe && CARD_FAMILY[c.id] && !c.spell);
    const mk = s => { let x = s % 2147483647 || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
    const deck = r => { const d = []; while (d.length < 12) { const c = pool[Math.floor(r() * pool.length)].id; if (d.filter(x => x === c).length < 2) d.push(c); } return d; };
    const out = { bad: [] };
    for (let g = 0; g < 30; g++) {
      const d = deck(mk(10 + g)), ids = d.slice(0, 3);
      const G = BattleEngine.newGame(d, deck(mk(99 + g)), mk(500 + g), { first: 0, spread: [ids, null] });
      const pl = G.p[0];
      if (!pl.hand.some(c => c.spread === 'past')) out.bad.push('past not in hand ' + g);
      if (!pl.future || pl.future.spread !== 'future') out.bad.push('no future ' + g);
      BattleEngine.startTurn(G);
      for (let t = 0; t < 200 && !G.over; t++) { BattleEngine.aiTurn(G, G.active, 'smart'); if (!G.over) BattleEngine.endTurn(G, G.active); }
      if (!G.over) out.bad.push('never finished ' + g);
    }
    const sp = BattleEngine.spreadBonus;
    const fam = f => pool.filter(c => CARD_FAMILY[c.id] === f).slice(0, 3).map(c => c.id);
    const fams = [...new Set(pool.map(c => CARD_FAMILY[c.id]))];
    out.harmony = sp(fam(fams[0])).harmony;
    out.contrast = sp(fams.slice(0, 3).map(f => pool.find(c => CARD_FAMILY[c.id] === f).id)).contrast;
    out.none = !sp([pool[0].id, pool[0].id, pool[0].id]).contrast;
    return out;
  });
  assert.deepStrictEqual(r.bad, []);
  assert.ok(r.harmony && r.contrast, 'Harmony for one family, Contrast for three');
  const u = await page.evaluate(() => {
    state.deck = ['silver-fox', 'moonstone', 'world-tree']; state.activeDeckSlot = state.activeDeckSlot || 0;
    spreadSet(['silver-fox', 'moonstone', 'world-tree']); const ok = spreadValid(spreadIds());
    const bad = spreadValid(['silver-fox', 'silver-fox', 'moonstone']);
    const locked = featureLocked('spread');
    return { ok, bad, locked, cur: !!currentSpread() };
  });
  assert.ok(u.ok && !u.bad, 'valid only when the deck holds the cards');
  assert.strictEqual(u.cur, !u.locked, 'currentSpread follows the level gate');
};
