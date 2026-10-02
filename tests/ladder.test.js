// Ladder ranks, archetypes and the deck practice runner.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    state.progress.ladder = { season: monthKey(), pts: 0, paid: 0 };
    const peb0 = state.progress.pebbles;
    bumpStat('ghostWins', 10);   // 100 points
    const L = ladderState();
    return { pts: L.pts, rank: ladderRankIndex(L.pts), paid: state.progress.pebbles - peb0 };
  });
  assert.strictEqual(r.pts, 100); assert.strictEqual(r.rank, 1);
  assert.ok(r.paid >= 15, 'ranking up pays Pebbles');
  const roll = await page.evaluate(() => { state.progress.ladder = { season: '2000-01', pts: 500, paid: 3 }; const p0 = state.progress.pebbles; const L = ladderState(); return { pts: L.pts, season: L.season === monthKey(), paid: state.progress.pebbles - p0 }; });
  assert.strictEqual(roll.pts, 250, 'a new season halves points'); assert.ok(roll.season); assert.strictEqual(roll.paid, 75, 'gem rank pays 3 x 25');
  const a = await page.evaluate(() => {
    const grove = Object.keys(CARD_FAMILY).filter(id => CARD_FAMILY[id] === 'grove' && cardDef(id) && !cardDef(id).spell && !cardDef(id).exclusive).slice(0, 8);
    const rest = CARD_POOL.filter(c => CARD_FAMILY[c.id] && CARD_FAMILY[c.id] !== 'grove' && !c.spell && !c.exclusive).slice(0, 4).map(c => c.id);
    state.deck = grove.concat(rest); return { arch: deckArchetype(state.deck), bonus: archetypePassive(), n: state.deck.length };
  });
  assert.strictEqual(a.n, 12); assert.strictEqual(a.arch.fam, 'grove'); assert.strictEqual(a.bonus, 'grove');
  const p = await page.evaluate(async () => {
    state.deck = BattleEngine.suggestDeck(Object.fromEntries(CARD_POOL.filter(c => !c.exclusive && !c.foe).slice(0, 40).map(c => [c.id, 2])));
    runPractice(); await new Promise(res => { const t = setInterval(() => { if (!practiceRunning) { clearInterval(t); res(); } }, 50); });
    return practiceResult.wins;
  });
  assert.strictEqual(p.length, 3); assert.ok(p.every(x => x >= 0 && x <= 100));
};
