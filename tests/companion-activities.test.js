// Things to do with your companion: the hub, the slow auto walk with bubbles, calm company, sparring (XP, no prizes, nothing
// counts toward quests) and the two games.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); tipQueue.length = 0;   // a tip queued at start-up would pop up over the hub
    document.getElementById('testHideOverlays') && document.getElementById('testHideOverlays').remove();
    state.progress.level = 12; state.progress.companionDay = null; state.progress.bonds = {};
    STARTER_CARDS.forEach(id => state.ownedCards.push(id)); CARD_POOL.slice(0, 20).forEach(c => state.ownedCards.push(c.id));
    state.deck = BattleEngine.suggestDeck(ownedCardCounts());
    prefs.tossStyle = 'skip'; prefs.fast = true;
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    switchTab('town'); chooseCompanion(cardEntry('sprout')); saveState(); renderTown();
  });
  await page.waitForTimeout(400);

  // ----- the hub opens from the companion and its buttons work -----
  await page.evaluate(() => openCompanionMenu());
  assert.ok(await page.locator('#companionHub').isVisible(), 'the hub did not open');
  const said = await page.evaluate(() => document.getElementById('chbSay').textContent);
  await page.click('#companionHub [data-chb="chat"]');
  const said2 = await page.evaluate(() => document.getElementById('chbSay').textContent);
  assert.ok(said2.startsWith('“') && said2 !== said, 'Chat should show a spoken line: ' + said2);
  await page.click('#companionHub [data-chb="games"]');
  assert.ok(await page.locator('#companionHub [data-chb="game-ttt"]').isVisible() && await page.locator('#companionHub [data-chb="game-trumps"]').isVisible(), 'games chooser');
  await page.click('#companionHub [data-chb="back"]');
  assert.ok(await page.locator('#companionHub .chb-grid').isVisible(), 'back returns to the activities');
  await page.evaluate(() => closeCompanionHub());

  // ----- an auto walk: slow, the companion talks, any tap stops it, and a real walk leaves you closer -----
  const walk = await page.evaluate(async () => {
    const start = Object.assign({}, state.playerPos), r = {};
    startCompanionWalk();
    r.on = companionWalkActive(); r.slow = STEP_MS; r.pill = !document.getElementById('compWalkPill').classList.contains('hidden');
    await new Promise(res => setTimeout(res, 3400));
    r.moved = Math.abs(state.playerPos.x - start.x) + Math.abs(state.playerPos.y - start.y) > 0 || CWALK.steps > 0;
    r.bubble = !!document.querySelector('.ent.companion .comp-bubble');
    CWALK.started -= 70000; CWALK.steps = Math.max(CWALK.steps, 25);       // pretend it has been a proper walk
    const bond0 = state.companion.bond || 0;
    handleMapTap(0, 0);
    r.stopped = !companionWalkActive(); r.restored = STEP_MS; r.pillHidden = document.getElementById('compWalkPill').classList.contains('hidden');
    r.bond = (state.companion.bond || 0) - bond0;
    startCompanionWalk(); switchTab('journal'); r.tabStops = !companionWalkActive(); switchTab('town');
    return r;
  });
  assert.ok(walk.on && walk.pill, 'the walk should start and show its pill'); assert.strictEqual(walk.slow, 720, 'a relaxed pace');
  assert.ok(walk.moved, 'the player should have moved on their own'); assert.ok(walk.bubble, 'the companion should be chatting in a bubble');
  assert.ok(walk.stopped && walk.pillHidden && walk.restored === 140, 'a tap stops the walk and restores the usual speed');
  assert.strictEqual(walk.bond, 1, 'a proper walk brings you closer'); assert.ok(walk.tabStops, 'leaving the town stops it');

  // ----- calm: your companion keeps you company -----
  const calm = await page.evaluate(() => { openCalm('breathe'); const there = !!document.querySelector('.calm-comp'); closeCalm(); return there; });
  assert.ok(calm, 'the companion should be in the Quiet Nook');

  // ----- spar: XP win or lose, no prizes, and it does not count toward wins -----
  const spar = await page.evaluate(() => {
    window.__sp = { wins: state.wins, cards: state.ownedCards.length, xp: ensureLevel().xp + ensureLevel().level * 1000, bw: (state.progress.totals.battlesWon || 0) };
    startCompanionSpar('mirror'); return true;
  });
  await page.waitForTimeout(2500);
  const sparWin = await page.evaluate(() => { const ok = !!(inBattle && battle && battle.npc.spar); if (ok) { battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); } return { ok, neutral: ok && battle.neutral }; });
  assert.ok(sparWin.ok && sparWin.neutral, 'a spar is a neutral battle');
  await page.waitForTimeout(1200);
  const res = await page.evaluate(() => ({ title: document.getElementById('battleEndTitle').textContent, stats: document.getElementById('battleEndStats').textContent, wins: state.wins === window.__sp.wins, cards: state.ownedCards.length === window.__sp.cards, bw: (state.progress.totals.battlesWon || 0) === window.__sp.bw, xp: ensureLevel().xp + ensureLevel().level * 1000 > window.__sp.xp }));
  assert.ok(/You beat/.test(res.title) && /XP/.test(res.stats), res.title + ' / ' + res.stats);
  assert.ok(res.wins && res.cards && res.bw, 'no wins, prizes or quest progress from a spar'); assert.ok(res.xp, 'but you earn XP');
  await page.evaluate(() => { closeBattle(false); });
  await page.waitForTimeout(1200);

  // ----- tic-tac-toe plays to a result and pays a little -----
  await page.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); companionDay().plays = 0; openCompanionGame('ttt'); });
  assert.strictEqual(await page.locator('#cgTtt .cg-cell').count(), 9);
  for (let i = 0; i < 9; i++) {
    if (await page.locator('#cgBody .cg-result').count()) break;
    const cell = page.locator('#cgTtt .cg-cell:not([disabled])').first();
    if (!(await cell.count())) { await page.waitForTimeout(700); continue; }
    await cell.click(); await page.waitForTimeout(900);
  }
  assert.ok(await page.locator('#cgBody .cg-result').count() === 1, 'tic-tac-toe should end in a result');
  assert.strictEqual(await page.evaluate(() => companionDay().plays), 1, 'the play was counted');
  await page.evaluate(() => closeCompanionGame());

  // ----- Spirit Trumps: five rounds -----
  await page.evaluate(() => openCompanionGame('trumps'));
  for (let r = 0; r < 5; r++) {
    await page.locator('#cgBody [data-play]').first().click();
    if (r < 4) await page.click('#cgNext');
  }
  assert.ok(await page.locator('#cgBody .cg-result').count() === 1, 'five rounds end in a result');
  assert.ok(await page.evaluate(() => cgState.score[0] + cgState.score[1] <= 5));
  await page.evaluate(() => closeCompanionGame());
};
