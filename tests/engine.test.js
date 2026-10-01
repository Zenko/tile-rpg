// The pure rules: many AI-vs-AI games on random decks finish without throwing, and both seats can win.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const ids = CARD_POOL.filter(c => !c.exclusive && !c.foe).map(c => c.id), wins = [0, 0], stuck = [];
    let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const deck = () => { const d = []; while (d.length < 12) { const id = ids[Math.floor(rng() * ids.length)]; if (d.filter(x => x === id).length < 2) d.push(id); } return d; };
    for (let g = 0; g < 60; g++) {
      const G = BattleEngine.newGame(deck(), deck(), rng, { first: g % 2 });
      BattleEngine.startTurn(G);
      for (let t = 0; t < 200 && !G.over; t++) { BattleEngine.aiTurn(G, G.active, 'smart'); if (!G.over) BattleEngine.endTurn(G, G.active); }
      if (!G.over) stuck.push(g); else wins[G.winner]++;
    }
    return { wins, stuck };
  });
  assert.deepStrictEqual(r.stuck, [], 'some games never finished');
  assert.ok(r.wins[0] > 5 && r.wins[1] > 5, 'one seat never wins: ' + r.wins);
};
