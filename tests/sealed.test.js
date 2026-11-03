// The weekly sealed league (build 332): the same seeded pool for everyone, a 12-card deck from it, five matches that each
// count once, and the reward for four wins.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    const a = sealedPool('2026-W10'), b = sealedPool('2026-W10'), c = sealedPool('2026-W11');
    out.size = a.length; out.same = JSON.stringify(a) === JSON.stringify(b); out.differs = JSON.stringify(a) !== JSON.stringify(c);
    out.clean = a.every(id => { const d = cardDef(id); return d && !d.exclusive && !d.foe; });
    out.foesSame = JSON.stringify(sealedFoes('2026-W10')) === JSON.stringify(sealedFoes('2026-W10'));
    state.progress.sealed = null; state.progress.level = 20; if (typeof ensureLevel === 'function') ensureLevel().level = 20;
    sealedOpen(); sealedAuto();
    out.autoLen = sealedPick.length; out.autoSpells = sealedPick.filter(i => cardDef(sealedPool()[i]).spell).length;
    document.getElementById('sealedDone').click();
    out.ready = sealedDeckReady();
    return out;
  });
  assert.strictEqual(r.size, 30); assert.ok(r.same, 'same week, same pool'); assert.ok(r.differs, 'a new week, a new pool');
  assert.ok(r.clean); assert.ok(r.foesSame);
  assert.strictEqual(r.autoLen, 12); assert.ok(r.autoSpells <= 3); assert.ok(r.ready);
  // play the five matches by forcing results: W W L W W -> 4-1, prize card, then no more matches
  for (const won of [true, true, false, true, true]) {
    await page.evaluate(w => { prefs.tossStyle = 'skip'; openScene('cup'); sceneAction('sealed'); sceneAction('sealed-play'); }, won);
    await page.waitForFunction(() => battle && battle.npc && battle.npc.sealed && !battle.ended, null, { timeout: 8000 });
    await page.evaluate(w => { battle.G.over = true; battle.G.winner = w ? 0 : 1; battle.G.events = []; btFinish(); }, won);
    await page.waitForFunction(() => battle && battle.rewarded, null, { timeout: 8000 });
    await page.evaluate(() => { closeBattle(); });
    await page.waitForFunction(() => !inBattle, null, { timeout: 8000 });
  }
  const e = await page.evaluate(() => ({ results: sealedState().results, rec: sealedRecordText(), paid: sealedState().paid, presence: sealedPresence(), btn: sealedButtons(), neutral: battleLog()[0].kind }));
  assert.deepStrictEqual(e.results, [true, true, false, true, true]);
  assert.strictEqual(e.rec, '4–1'); assert.strictEqual(e.paid, true);
  assert.deepStrictEqual([e.presence.w, e.presence.l], [4, 1]);
  assert.ok(!/sealed-play/.test(e.btn), 'no sixth match');
  assert.strictEqual(e.neutral, 'sealed');
};
