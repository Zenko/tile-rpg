// Companion cheer (build 278): a once-per-match power from a companion at bond 2 or higher, chosen by the companion's main perk.
module.exports = async (page, assert) => {
  // ----- the engine: every cheer, both tiers -----
  const r = await page.evaluate(() => {
    const BE = BattleEngine, out = {};
    out.perksCovered = Object.keys(BE.CHEERS).every(k => COMPANION_PERKS[k]) && Object.keys(COMPANION_PERKS).every(k => BE.CHEERS[k]);
    out.texts = Object.keys(BE.CHEERS).every(k => [1, 2].every(t => typeof BE.CHEERS[k].text(t) === 'string' && BE.CHEERS[k].text(t).length > 10));
    const deck = Array(12).fill('sprout');
    const fresh = (perk, tier) => { const G = BE.newGame(deck.slice(), deck.slice(), Math.random, { cheer: [perk, null], cheerTier: [tier, null], seed: 'cheer-' + perk }); BE.startTurn(G); const me = G.p[0], op = G.p[1];
      G.active = 0; me.turns = 9; me.board = []; op.board = []; ['a', 'b'].forEach((n, i) => { me.board.push(BE.makeCard('hedgehog', 900 + i, {})); op.board.push(BE.makeCard(i ? 'hedgehog' : 'geode', 950 + i, {})); }); return G; };
    const go = (perk, tier, f) => { const G = fresh(perk, tier), me = G.p[0], op = G.p[1]; const before = { sp: me.spirit, osp: op.spirit, e: me.energy, hand: me.hand.length, deck: me.deck.length }; const res = BE.step(G, { type: 'cheer', who: 0 }); return f(G, me, op, before, res); };
    out.heal = [1, 2].map(t => { const G = fresh('spirit', t); G.p[0].spirit = 8; BE.step(G, { type: 'cheer', who: 0 }); return G.p[0].spirit - 8; });
    out.fish = [1, 2].map(t => go('fish', t, (G, me, op, b) => b.osp - op.spirit));
    out.xp = [1, 2].map(t => go('xp', t, (G, me) => me.board.map(x => x.power).join()));
    out.crops = [1, 2].map(t => { const G = fresh('crops', t); G.p[0].board.forEach(x => { x.hp -= 2; }); BE.step(G, { type: 'cheer', who: 0 }); return G.p[0].board.map(x => x.grit - x.hp).join() + '/' + G.p[0].board.map(x => x.grit).join(); });
    out.harvest = [1, 2].map(t => go('harvest', t, (G, me, op, b) => me.energy - b.e));
    out.chest = [1, 2].map(t => go('chest', t, (G, me) => me.board.filter(x => x.shield).length));
    out.craft = [1, 2].map(t => { const G = fresh('craft', t); G.p[0].board[1].hp -= 9; const before = G.p[0].board[1].hp; BE.step(G, { type: 'cheer', who: 0 }); return G.p[0].board[1].hp - before; });
    out.bounty = [1, 2].map(t => go('bounty', t, (G, me, op) => op.board.map(x => x.grit - x.hp).join()));
    out.medals = [1, 2].map(t => { const G = fresh('medals', t); G.p[0].board.forEach(x => { x.ready = false; }); BE.step(G, { type: 'cheer', who: 0 }); return G.p[0].board.filter(x => x.ready).length; });
    out.hearth = [1, 2].map(t => { const G = fresh('hearth', t); G.p[0].spirit = 10; BE.step(G, { type: 'cheer', who: 0 }); return G.p[1].board.filter(x => x.lull).length + ':' + (G.p[0].spirit - 10); });
    out.finds = [1, 2].map(t => go('finds', t, (G, me, op, b) => (me.hand.length - b.hand) + ':' + (me.deck.length - b.deck)));
    // readiness: too early, once only, wrong turn, none chosen
    const G = fresh('spirit', 1), me = G.p[0]; me.turns = 2; out.early = BE.cheerReady(G, 0).why;
    me.turns = 3; out.ok = BE.cheerReady(G, 0).ok; BE.useCheer(G, 0); out.twice = BE.cheerReady(G, 0).why; out.note = BE.useCheer(G, 0).ok;
    const G2 = fresh(null, 1); out.none = BE.cheerReady(G2, 0).why; const G3 = fresh('spirit', 1); G3.active = 1; out.notYours = BE.cheerReady(G3, 0).why;
    // a replay of a recorded match that used a cheer comes out the same
    const rec = BE.simulate(7, deck, deck, { opts: { cheer: ['fish', 'fish'], cheerTier: [2, 1] } });
    out.recorded = rec.record.actions.filter(a => a.type === 'cheer').length;
    const rp = BE.replay(rec.record); out.replay = rp && rp.G ? (rp.G.winner === rec.G.winner && rp.G.turn === rec.G.turn) : rp && rp.winner === rec.G.winner;
    return out;
  });
  assert.ok(r.perksCovered, 'every companion perk has a cheer and every cheer a perk'); assert.ok(r.texts);
  assert.deepStrictEqual(r.heal, [4, 7], 'spirit restores 4, then 7'); assert.deepStrictEqual(r.fish, [3, 5], 'fish takes 3 then 5 Calm');
  assert.deepStrictEqual(r.xp, ['7,6', '8,6'], 'xp lifts the strongest card by 1, then 2: ' + r.xp);
  assert.deepStrictEqual(r.harvest, [1, 2], 'harvest gives 1 then 2 energy'); assert.deepStrictEqual(r.chest, [1, 2], 'chest gives a Haze to the strongest, then two cards');
  assert.deepStrictEqual(r.craft, [5, 9], 'craft heals 5 then 9'); assert.deepStrictEqual(r.medals, [1, 2], 'medals readies one card, then two');
  assert.deepStrictEqual(r.crops, ['2,2/6,6', '0,0/6,6'], 'crops: +1 health to each card, and at bond 3 heals 2 of the 2 lost: ' + r.crops);
  assert.deepStrictEqual(r.bounty, ['0,1', '0,2'], 'bounty hits the enemy card with the least health for 1, then 2: ' + r.bounty);
  assert.deepStrictEqual(r.hearth, ['1:0', '1:2'], 'hearth lulls their strongest card, and at bond 3 restores 2 Calm: ' + r.hearth);
  assert.ok(r.finds[0] === r.finds[1] && /^2:/.test(r.finds[0]), 'finds pulls a card and draws a card (two cards into the hand): ' + r.finds);
  assert.ok(/Ready on your turn 3/.test(r.early) && r.ok, 'it waits for its turn'); assert.ok(/Already used/.test(r.twice) && r.note === false, 'once per match');
  assert.ok(/No companion/.test(r.none) && /Not your turn/.test(r.notYours));
  assert.ok(r.recorded >= 1 && r.replay, 'a recorded match that used a cheer replays the same');

  // ----- who gets one: bond 2 or higher, not in neutral matches or spars -----
  const who = await page.evaluate(() => {
    state.ownedCards = CARD_POOL.flatMap(c => [c.id, c.id, c.id]); state.progress.level = 12; chooseCompanion(cardEntry('sprout'));
    const out = {}; state.companion.bond = 0; out.b1 = companionCheerFor({}, false);
    state.companion.bond = BOND_AT[1]; out.b2 = companionCheerFor({}, false); out.neutral = companionCheerFor({}, true); out.puzzle = companionCheerFor({ puzzle: true }, false); out.spar = companionCheerFor({ spar: true }, false);
    state.companion.bond = BOND_AT[2]; out.b3 = companionCheerFor({}, false);
    return out;
  });
  assert.strictEqual(who.b1, null, 'bond 1 has no cheer'); assert.strictEqual(who.b2.tier, 1); assert.strictEqual(who.b3.tier, 2); assert.strictEqual(who.b2.perk, 'harvest', 'a Sprout companion (Bloom) cheers with Harvest');
  assert.ok(!who.neutral && !who.puzzle && !who.spar, 'not in neutral matches, puzzles or spars');

  // ----- the battle: the button appears, waits, and works through the UI -----
  await page.evaluate(() => {
    prefs.tossStyle = 'skip'; state.deck = BattleEngine.suggestDeck(ownedCardCounts()); state.companion.bond = BOND_AT[1]; state.companion.perk = 'spirit'; saveState();
    startBattle({ id: 'cheer-test', name: 'Test Foe', icon: '🦊', deck: BattleEngine.suggestDeck(ownedCardCounts()), isBoss: false, rewardCard: null, defeated: false, profile: { level: 'gentle', spirit: 15 } });
  });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (await page.evaluate(() => inBattle && battle && battle.G && !battle.busy && !document.getElementById('mulliganOverlay').classList.contains('hidden'))) break; }
  assert.ok(await page.evaluate(() => battle.G.p[0].cheer === 'spirit' && battle.G.p[0].cheerTier === 1), 'the companion\'s perk is the cheer');
  assert.ok(await page.evaluate(() => !document.getElementById('btCheer').classList.contains('hidden')), 'the cheer button is shown');
  assert.ok(await page.evaluate(() => battle.G.p[1].cheer === undefined), 'the neighbour has none');
  const used = await page.evaluate(async () => { const G = battle.G; G.p[0].turns = 9; G.active = 0; G.p[0].spirit = 10; battle.busy = false; btRender(); const ready = document.getElementById('btCheer').classList.contains('ready'); await btDoCheer(); return { ready, used: G.p[0].cheerUsed, spirit: G.p[0].spirit, cls: document.getElementById('btCheer').classList.contains('used') }; });
  assert.ok(used.ready, 'the button glows when it is ready'); assert.ok(used.used && used.spirit === 14 && used.cls, 'the companion restored 4 Calm through the UI: ' + JSON.stringify(used));
};
