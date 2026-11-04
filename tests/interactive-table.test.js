// The interactive table (build 336), driven through the real battle screen: a Snare is set face down and shown on the pile, a
// choose-one spell asks which half, Glimpse offers three cards to keep one, Nestle buffs the cards it lands between, a Follow-up
// card glows once a card has been played, the deck tracker lists what is left, a reaction shows a bubble, and an enemy Snare
// springs when you attack.
module.exports = async (page, assert) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    CARD_POOL.filter(c => !c.exclusive).slice(0, 40).forEach(c => state.ownedCards.push(c.id, c.id));
    state.deck = CARD_POOL.filter(c => !c.exclusive && !c.spell).slice(0, 12).map(c => c.id); saveState();
    state.progress.seenBattleHelp = true; Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; });
    document.getElementById('testHideOverlays').remove(); prefs.tossStyle = 'skip'; prefs.fast = true;
    startBattle(state.districtData.square.npcs[0]);
  });
  await page.waitForFunction(() => { const o = document.getElementById('mulliganOverlay'); return o && !o.classList.contains('hidden'); }, null, { timeout: 10000 });
  await page.click('#mulliganKeepBtn');
  await page.waitForFunction(() => battle && battle.G.active === 0 && !battle.busy && document.getElementById('mulliganOverlay').classList.contains('hidden'), null, { timeout: 20000 });
  // a known table: five chosen cards in hand, two of yours on the board, one of theirs, plenty of energy
  await page.evaluate(() => {
    const G = battle.G, me = G.p[0], op = G.p[1], mk = id => BattleEngine.makeCard(id, G.uid = (G.uid || 1000) + 1, {});
    me.hand = ['hush-snare', 'crossroads', 'leaf-reader', 'nest-keeper', 'domino-mouse'].map(mk);
    me.board = ['pebble', 'toadstool'].map(id => Object.assign(mk(id), { ready: true }));
    op.board = [mk('geode')]; op.snares = []; me.snares = [];
    me.energy = 12; me.maxEnergy = 5; me.played = 0; G.pending = null;
    btRender();
  });
  const uid = id => page.evaluate(i => battle.G.p[0].hand.find(c => c.id === i).uid, id);
  const idle = () => page.waitForFunction(() => !battle.busy, null, { timeout: 10000 });

  // Snare: set face down, shown on your pile
  await page.evaluate(u => btDoPlay(u), await uid('hush-snare')); await idle();
  assert.strictEqual(await page.locator('#btYouPile .snare.mine').count(), 1, 'your set Snare sits on your pile');
  assert.strictEqual(await page.evaluate(() => BattleEngine.snaresOf(battle.G.p[0]).length), 1);

  // Follow-up glows now that a card has been played this turn
  assert.ok(await page.locator('#btHand .card.combo-ready').count() >= 1, 'a Follow-up card glows after the first play');

  // choose one: tap, tap, then the second half (draw a card and restore Calm)
  const handBefore = await page.evaluate(() => battle.G.p[0].hand.length);
  await page.evaluate(u => { const c = battle.G.p[0].hand.find(x => x.uid === u); btOnHandCard(c); btOnHandCard(c); }, await uid('crossroads'));
  await page.waitForSelector('#btChoice:not(.hidden) .btc-opt', { timeout: 5000 });
  assert.strictEqual(await page.locator('#btChoice .btc-opt').count(), 2, 'two halves to choose from');
  await page.screenshot({ path: require('path').join(process.env.SHOT_DIR || require('os').tmpdir(), 'table-choose.png') });
  await page.click('#btChoice .btc-opt[data-mode="1"]'); await idle();
  assert.ok(await page.evaluate(() => document.getElementById('btChoice').classList.contains('hidden')), 'the picker closes');
  assert.strictEqual(await page.evaluate(() => battle.G.p[0].hand.length), handBefore, 'Crossroads left the hand and drew a card');

  // Glimpse: three cards offered, one kept
  await page.evaluate(u => { btDoPlay(u); }, await uid('leaf-reader'));
  await page.waitForSelector('#btChoice:not(.hidden) .btc-pick', { timeout: 8000 });
  assert.strictEqual(await page.locator('#btChoice .btc-pick').count(), 3, 'Glimpse shows the top three');
  await page.screenshot({ path: require('path').join(process.env.SHOT_DIR || require('os').tmpdir(), 'table-glimpse.png') });
  const picked = await page.evaluate(() => battle.G.pending.options[1].id);
  await page.click('#btChoice .btc-pick >> nth=1'); await idle();
  assert.ok(await page.evaluate(id => !battle.G.pending && battle.G.p[0].hand.some(c => c.id === id), picked), 'the chosen card is in hand and the choice is closed');

  // Nestle between two cards: both neighbours grow
  const before = await page.evaluate(() => battle.G.p[0].board.map(c => c.power));
  await page.evaluate(u => btDoPlay(u, undefined, 1), await uid('nest-keeper')); await idle();
  const after = await page.evaluate(() => battle.G.p[0].board.map(c => ({ id: c.id, p: c.power })));
  assert.strictEqual(after[1].id, 'nest-keeper', 'it lands in the slot it was dropped on: ' + JSON.stringify(after));
  assert.ok(after[0].p === before[0] + 1 && after[2].p === before[1] + 1, 'both neighbours gain power: ' + JSON.stringify({ before, after }));

  // deck tracker
  await page.click('#btYouPile');
  await page.waitForSelector('#btDeckSheet:not(.hidden) .bds-list li', { timeout: 3000 });
  assert.ok(await page.locator('#btDeckSheet .bds-list li').count() >= 1);
  await page.click('#btDeckSheet .bds-x');
  assert.ok(await page.evaluate(() => document.getElementById('btDeckSheet').classList.contains('hidden')));

  // a reaction
  await page.click('#btEmoteBtn'); await page.click('#btEmotes .bt-emote >> nth=0');
  assert.strictEqual(await page.locator('#btYouSpirit .bt-bubble').count(), 1, 'your reaction shows over your portrait');

  // their Bramble Snare springs when you attack: your attacker takes 3 first
  const atk = await page.evaluate(() => {
    const G = battle.G, op = G.p[1], a = G.p[0].board.find(c => c.id === 'toadstool');
    op.snares = [BattleEngine.makeCard('bramble-snare', 9999, {})]; btRender();
    return { uid: a.uid, hp: a.hp, target: op.board[0].uid };
  });
  assert.strictEqual(await page.locator('#btOppPile .snare').count(), 1, 'their Snare shows face down');
  await page.evaluate(a => btDoAttack(a.uid, { kind: 'card', uid: a.target }), atk); await idle();
  const res = await page.evaluate(a => ({ snares: battle.G.p[1].snares.length, hp: (battle.G.p[0].board.find(c => c.uid === a.uid) || { hp: 0 }).hp }), atk);
  assert.strictEqual(res.snares, 0, 'the Snare is used up');
  assert.ok(res.hp <= atk.hp - 3, 'the attacker took the Snare\'s 3 damage: ' + JSON.stringify(res));
  await page.screenshot({ path: require('path').join(process.env.SHOT_DIR || require('os').tmpdir(), 'table-after.png') });
};
