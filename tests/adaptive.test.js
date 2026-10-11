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
    let p = prof('normal', 17); const m1 = adaptApply(p, npc, false); out.easier = p.level === 'normal' && p.spirit === 15 && Math.abs(p.shift - 0.25) < 1e-9 && /gentle today/.test(m1);
    p = prof('gentle', 12); adaptApply(p, npc, false); out.floorSpirit = p.spirit === 12;
    set([1, 0, 1, 0]); p = prof('normal', 17); adaptApply(p, npc, false); out.oneStep = adaptTilt() === -1 && p.spirit === 16 && Math.abs(p.shift - 0.125) < 1e-9;
    set([1, 1, 1, 1]);
    p = prof('normal', 17); const m2 = adaptApply(p, npc, false); out.harder = p.level === 'normal' && p.spirit === 19 && Math.abs(p.shift + 0.25) < 1e-9 && /competitive/.test(m2);
    p = prof('normal', 18); const m3 = adaptApply(p, npc, true); out.bossSafe = p.spirit === 18 && !p.shift && m3 === '';
    set([0, 0, 0]); p = prof('smart', 20); adaptApply(p, npc, true); out.bossEasier = p.spirit === 18 && p.shift > 0;
    prefs.adaptive = false; p = prof('normal', 17); out.off = adaptApply(p, npc, false) === '' && p.spirit === 17 && p.level === 'normal' && !p.shift; prefs.adaptive = true;
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
  assert.ok(r.easier, 'a rough patch: more AI mistakes and less Calm, and it says so'); assert.ok(r.floorSpirit && r.oneStep, 'steps scale, and never a pushover');
  assert.ok(r.harder, 'a hot streak: fewer AI mistakes and more Calm, and it says so');
  assert.ok(r.bossSafe, 'bosses are never made harder'); assert.ok(r.bossEasier, 'but can ease off');
  assert.ok(r.off, 'it can be switched off'); assert.ok(r.window, 'only the last 8 count');
  assert.ok(r.mood && r.flag, 'the versus note carries the mood');
  assert.ok(r.counted, 'a finished match is recorded'); assert.ok(r.yieldIgnored, 'a yield is not');
  // the mistake shift really changes outcomes: against the same decks a nudged-easy opponent loses more than a nudged-hard one
  const sim = await page.evaluate(() => {
    let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const owned = {}; CARD_POOL.filter(c => !c.exclusive && !c.foe && c.rarity === 'common').forEach(c => { owned[c.id] = 2; });
    const deck = () => { const pool = {}; Object.keys(owned).forEach(id => { if (rng() < 0.6) pool[id] = 2; }); return BattleEngine.suggestDeck(Object.keys(pool).length > 14 ? pool : owned); };
    const decks = Array.from({ length: 160 }, deck);
    const wins = shift => { let w = 0, g = 0; for (let i = 0; i < 160; i++) { const G = BattleEngine.newGame(decks[i], decks[(i + 3) % 160], rng, { first: i % 2, seed: 'x' + i }); G.aiShift = [0, shift]; BattleEngine.startTurn(G); for (let t = 0; t < 200 && !G.over; t++) { const who = G.active; BattleEngine.aiTurn(G, who, who === 0 ? 'smart' : 'normal'); if (!G.over) BattleEngine.endTurn(G, who); } if (G.over) { g++; if (G.winner === 0) w++; } } return w / g; };
    return { easy: wins(0.25), hard: wins(-0.25) };
  });
  assert.ok(sim.easy > sim.hard + 0.05, 'a +0.25 shift makes the opponent clearly easier than -0.25: ' + sim.easy + ' vs ' + sim.hard);
};
