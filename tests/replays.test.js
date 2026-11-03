// Match replays and battle stats (build 332): a real match is recorded move by move, kept outside the save, opens in the
// viewer from Journal → Battles, and its cards and families are counted.
module.exports = async (page, assert) => {
  await page.evaluate(() => { localStorage.removeItem('tr-replays'); state.progress.cardStats = {}; state.progress.famStats = null;
    state.deck = CARD_POOL.filter(c => !c.exclusive && !c.foe).slice(0, 12).map(c => c.id); state.deck.forEach(id => state.ownedCards.push(id, id));
    prefs.tossStyle = 'skip'; prefs.fast = true; startBattleNow(state.districtData.square.npcs[0], 0); });
  // play it out: the AI plays our side too, through the real end-turn button flow
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate(async () => {
      if (!battle || battle.G.over) return true;
      if (battle.G.active === 0 && !battle.busy) { BattleEngine.aiTurn(battle.G, 0, 'smart'); await btAnimate(btFlush(battle.G), battle.token); if (!battle.G.over) await btPlayerEnd(); }
      return battle.G.over;
    });
    if (done) break;
    await page.waitForTimeout(50);
  }
  await page.waitForFunction(() => battle && battle.G.over, null, { timeout: 20000 });
  await page.evaluate(() => { if (!battle.ended) btFinish(); });
  await page.waitForFunction(() => battle && battle.recorded, null, { timeout: 8000 });
  const r = await page.evaluate(() => {
    const log = battleLog()[0], reps = JSON.parse(localStorage.getItem('tr-replays') || '[]'), rep = reps[0];
    return { rid: log.rid, same: rep && rep.id === log.rid, frames: rep ? rep.frames.length : 0, hasPlay: !!rep && rep.frames.some(f => f.l.some(t => / played /.test(t))),
      lastLine: rep ? rep.frames[rep.frames.length - 1].l.join(' ') : '', inSave: JSON.stringify(state).includes('"frames"'),
      stats: Object.keys(state.progress.cardStats).length, fam: !!(state.progress.famStats && Object.keys(state.progress.famStats.mine).length), won: battle.G.winner === 0 };
  });
  assert.ok(r.rid && r.same, 'the log entry points at the saved replay');
  assert.ok(r.frames > 5, `only ${r.frames} frames`);
  assert.ok(r.hasPlay, 'the replay says who played what');
  assert.match(r.lastLine, r.won ? /You won/ : /won the match/);
  assert.strictEqual(r.inSave, false, 'replays stay out of the save');
  assert.ok(r.stats > 0 && r.fam, 'card and family stats counted');

  // the viewer: opens from Journal → Battles, steps, and closes
  await page.evaluate(() => { closeBattle && closeBattle(); switchTab('journal'); switchJournalSegment('battles'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('#battleLogList .bl-head').click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#battleLogList [data-replay]').click());
  const v = await page.evaluate(() => { const a = document.getElementById('rpStep').textContent; document.getElementById('rpNext').click(); const b = document.getElementById('rpStep').textContent;
    return { open: !document.getElementById('replayOverlay').classList.contains('hidden'), a, b, insights: !document.getElementById('battleInsights').classList.contains('hidden') }; });
  assert.ok(v.open); assert.match(v.a, /^Move 1 of/); assert.match(v.b, /^Move 2 of/); assert.ok(v.insights, 'Journal → Battles shows the stats');
  await page.evaluate(() => document.getElementById('rpClose').click());
  assert.strictEqual(await page.evaluate(() => document.getElementById('replayOverlay').classList.contains('hidden')), true);
  // only the last 10 are kept
  await page.evaluate(() => { for (let i = 0; i < 12; i++) { battle.rec = { frames: [{ l: ['a'], t: 1, w: 0, s: [1, 1], b: [[], []], h: [], hc: 0 }, { l: ['b'], t: 1, w: 0, s: [1, 1], b: [[], []], h: [], hc: 0 }], mine: [], theirs: [] }; replaySave({ name: 'x' + i }); } });
  assert.strictEqual(await page.evaluate(() => replaysAll().length), 10);
};
