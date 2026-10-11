// Adaptive difficulty: a small, bounded, visible nudge from your recent results.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, set = a => { state.progress.form = { recent: a.slice() }; }, tilt = a => { set(a); return adaptTilt(); };
    prefs.adaptive = true;
    out.none = tilt([]) === 0 && tilt([0, 0]) === 0;                       // too few results to judge
    out.cruise = tilt([1, 1, 1, 1, 1]); out.strug = tilt([0, 0, 0]); out.mixed = tilt([1, 1, 0, 1, 1, 0]); out.slump = tilt([1, 1, 1, 0, 0, 0]);
    out.bounds = tilt(Array(8).fill(1)) <= 2 && tilt(Array(8).fill(0)) >= -2;
    const prof = (level, spirit) => ({ level, spirit }), npc = { name: 'Testa' };
    set([0, 0, 0]);
    let p = prof('normal', 17); const m1 = adaptApply(p, npc, false); out.easier = p.level === 'gentle' && p.spirit === 15 && /gentle today/.test(m1);
    p = prof('gentle', 15); adaptApply(p, npc, false); out.floorLevel = p.level === 'gentle' && p.spirit === 13;
    p = prof('gentle', 12); adaptApply(p, npc, false); out.floorSpirit = p.spirit === 12;
    set([1, 1, 1, 1]);
    p = prof('normal', 17); const m2 = adaptApply(p, npc, false); out.harder = p.level === 'smart' && p.spirit === 19 && /competitive/.test(m2);
    p = prof('smart', 18); adaptApply(p, npc, false); out.capLevel = p.level === 'smart';
    p = prof('normal', 18); const m3 = adaptApply(p, npc, true); out.bossSafe = p.level === 'normal' && p.spirit === 18 && m3 === '';
    set([0, 0, 0]); p = prof('smart', 20); adaptApply(p, npc, true); out.bossEasier = p.level === 'normal' && p.spirit === 18;     // but a boss can ease off
    prefs.adaptive = false; p = prof('normal', 17); out.off = adaptApply(p, npc, false) === '' && p.spirit === 17 && p.level === 'normal'; prefs.adaptive = true;
    // recording keeps the last 8
    set([]); for (let i = 0; i < 12; i++) adaptRecord(i % 2 === 0); out.window = adaptForm().recent.length === 8;
    // a real match: the result counts, and the opponent's mood shows on the versus note
    set([0, 0, 0]);
    state.deck = CARD_POOL.slice(0, 12).map(c => c.id); CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); prefs.tossStyle = 'skip';
    const n = state.districtData.square.npcs[0];
    startBattleNow(n, 0);
    out.mood = /feeling gentle/.test(n.deckNote || ''); out.flag = n.adaptive === true;
    battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish();
    out.counted = adaptForm().recent.length === 4 && adaptForm().recent[3] === 1;
    // a yield does not count
    const before = adaptForm().recent.length; closeBattle && closeBattle();
    startBattleNow(n, 0); battle.G.over = true; battle.G.winner = 1; battle.G.why = 'yield'; battle.G.events = []; btFinish();
    out.yieldIgnored = adaptForm().recent.length === before;
    return out;
  });
  assert.ok(r.none, 'too few results do nothing');
  assert.strictEqual(r.cruise, 2); assert.strictEqual(r.strug, -2); assert.strictEqual(r.mixed, 0, 'a 2 in 3 record is about right');
  assert.ok(r.slump <= -2 || r.slump === 0, 'three losses in a row is a slump: ' + r.slump); assert.ok(r.bounds);
  assert.ok(r.easier, 'a rough patch: easier AI and less Calm, and it says so'); assert.ok(r.floorLevel && r.floorSpirit, 'never a pushover');
  assert.ok(r.harder, 'a hot streak: smarter AI and more Calm, and it says so'); assert.ok(r.capLevel);
  assert.ok(r.bossSafe, 'bosses are never made harder'); assert.ok(r.bossEasier, 'but can ease off');
  assert.ok(r.off, 'it can be switched off'); assert.ok(r.window, 'only the last 8 count');
  assert.ok(r.mood && r.flag, 'the versus note carries the mood');
  assert.ok(r.counted, 'a finished match is recorded'); assert.ok(r.yieldIgnored, 'a yield is not');
};
