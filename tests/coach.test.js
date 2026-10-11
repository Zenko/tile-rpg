// Battle coach: it watches how your turns end and, after a loss, gives at most two kind, specific tips.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, none = { turns: 4, unspent: 0, spellHeld: 0, wasted: 0, idle: 0, firstIdle: false }, shape0 = { size: 12, heavy: 1, spells: 2, ownsSpell: true };
    out.quiet = coachTips(none, shape0).length === 0 && coachNote({ coach: none }, [], []) === '';
    out.unspent = /3 turns with energy to spare/.test(coachTips(Object.assign({}, none, { unspent: 3 }), shape0)[0]);
    out.spell = /including a spell/.test(coachTips(Object.assign({}, none, { unspent: 2, spellHeld: 1 }), shape0)[0]);
    out.first = coachTips(Object.assign({}, none, { firstIdle: true }), shape0).some(t => /first turn/.test(t));
    out.idle = coachTips(Object.assign({}, none, { idle: 4 }), shape0).some(t => /stayed home/.test(t));
    out.heavy = coachTips(none, { size: 12, heavy: 5, spells: 2, ownsSpell: true }).some(t => /top-heavy/.test(t));
    out.noSpells = coachTips(none, { size: 12, heavy: 1, spells: 0, ownsSpell: true }).some(t => /own spells/.test(t));
    out.noSpellsOk = coachTips(none, { size: 12, heavy: 1, spells: 0, ownsSpell: false }).length === 0;     // nothing to suggest if you own none
    out.atTwo = coachTips({ turns: 5, unspent: 4, spellHeld: 0, wasted: 6, idle: 5, firstIdle: true }, { size: 12, heavy: 6, spells: 0, ownsSpell: true }).length === 2;
    // tracking in a real battle: end a turn with energy and a playable card
    state.deck = CARD_POOL.slice(0, 12).map(c => c.id); CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); prefs.tossStyle = 'skip';
    startBattleNow(state.districtData.square.npcs[0], 0);
    const G = battle.G, me = G.p[0]; me.energy = 5;
    if (!me.hand.some(c => BattleEngine.canPlay(G, 0, c.uid).ok)) me.hand.push(BattleEngine.makeCard ? BattleEngine.makeCard('sprout', 9999) : me.hand[0]);
    coachTrackEnd(battle);
    out.tracked = battle.coach.turns === 1 && battle.coach.unspent === 1 && battle.coach.firstIdle === true;
    // the result card shows the tip after a loss, hides it after a win and after a yield
    battle.coach.unspent = 3; battle.G.over = true; battle.G.winner = 1; battle.G.events = []; btFinish();
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'coach: ' + k));
  await page.waitForFunction(() => !document.getElementById('battleCoachNote').classList.contains('hidden'), null, { timeout: 5000 });
  const txt = await page.evaluate(() => document.getElementById('battleCoachNote').textContent);
  assert.ok(txt.length > 40 && /energy to spare/.test(txt) && txt.split(' ')[0].length <= 3, 'the loss card carries the tip: ' + txt);
  const win = await page.evaluate(() => { closeBattle && closeBattle(); startBattleNow(state.districtData.square.npcs[0], 0); battle.coach = { turns: 5, unspent: 5, spellHeld: 0, wasted: 9, idle: 5, firstIdle: true }; battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); return true; });
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => document.getElementById('battleCoachNote').classList.contains('hidden')), 'no tip after a win');
};
