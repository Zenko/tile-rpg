// Battle AI play styles: each one plays recognisably differently, but none is much stronger or weaker than the plain AI.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const ids = CARD_POOL.filter(c => !c.exclusive && !c.foe && c.rarity === 'common' || c.rarity === 'rare').filter(c => !c.exclusive && !c.foe).map(c => c.id);
    let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const counts = {}; ids.forEach(id => { counts[id] = 2; });
    const deck = () => { const pool = {}; ids.forEach(id => { if (rng() < 0.55) pool[id] = 2; }); return BattleEngine.suggestDeck(Object.keys(pool).length > 14 ? pool : counts); };
    const decks = []; for (let g = 0; g < 160; g++) decks.push(deck());       // the same 160 decks for every style
    const styles = [null, 'aggressive', 'defensive', 'tricky', 'greedy'], out = {}, plainTurns = [];
    styles.forEach(st => {
      let wins = 0, games = 0, face = 0, hits = 0, stuck = 0, turns = 0, differ = 0;
      for (let g = 0; g < 160; g++) {
        const dA = decks[g], dB = dA.slice();                                    // a mirror: the same deck on both sides, so only the style differs
        const G = BattleEngine.newGame(dA, dB, rng, { first: g % 2, seed: 'ai-' + g });
        G.aiStyles = [null, st];
        BattleEngine.startTurn(G);
        for (let t = 0; t < 200 && !G.over; t++) {
          const who = G.active, steps = BattleEngine.aiTurn(G, who, 'smart');
          if (who === 1) steps.forEach(s => { if (s.type === 'attack') { hits++; if (s.target && s.target.kind === 'spirit') face++; } });
          if (!G.over) BattleEngine.endTurn(G, who);
        }
        if (!G.over) { stuck++; continue; }
        games++; turns += G.turn; if (G.winner === 1) wins++;
        if (!st) plainTurns[g] = G.turn + ':' + G.winner; else if (plainTurns[g] !== G.turn + ':' + G.winner) differ++;
      }
      out[st || 'plain'] = { win: wins / games, face: hits ? face / hits : 0, stuck, turns: turns / games, differ: differ / 160 };
    });
    out.known = Object.keys(BattleEngine.AI_STYLES).sort().join();
    return out;
  });
  assert.strictEqual(r.known, 'aggressive,defensive,greedy,tricky');
  ['plain', 'aggressive', 'defensive', 'tricky', 'greedy'].forEach(k => assert.strictEqual(r[k].stuck, 0, k + ' games all finish'));
  assert.ok(r.aggressive.face > r.plain.face + 0.03, 'aggressive hits the Calm more: ' + r.aggressive.face + ' vs ' + r.plain.face);
  assert.ok(r.defensive.face < r.aggressive.face, 'defensive hits the Calm less than aggressive: ' + r.defensive.face + ' vs ' + r.aggressive.face);
  ['aggressive', 'defensive', 'tricky', 'greedy'].forEach(k => {
    assert.ok(r[k].differ > 0.2, k + ' really changes how games go: ' + r[k].differ);
    assert.ok(Math.abs(r[k].win - r.plain.win) < 0.22, k + ' stays near the plain AI in strength: ' + r[k].win + ' vs ' + r.plain.win);
    assert.ok(r[k].win > 0.2 && r[k].win < 0.8, k + ' is neither hopeless nor unbeatable: ' + r[k].win);
  });
};
