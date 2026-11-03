// Challenges between testers (build 332), against a pretend Firestore: a ghost duel sends its result and replay to the deck's
// owner once a day; the owner's game turns it into a letter with Watch / Play-their-deck buttons and deletes it.
module.exports = async (page, assert) => {
  const r = await page.evaluate(async () => {
    const store = {}; let n = 0;
    const coll = () => ({
      add: async d => { const id = 'd' + (++n); store[id] = JSON.parse(JSON.stringify(d)); return { id }; },
      where: (f, op, v) => ({ limit: () => ({ get: async () => ({ docs: Object.keys(store).filter(k => store[k][f] === v).map(k => ({ id: k, data: () => store[k], ref: { delete: async () => { delete store[k]; } } })) }) }) })
    });
    cloudDb = { collection: coll }; cloudReady = true; prefs.sharePresence = true;
    const out = {};
    // I am "me" and duel the ghost of "them"
    cloudUser = { uid: 'me' }; state.character.name = 'Tester A';
    state.deck = CARD_POOL.filter(c => !c.exclusive && !c.foe).slice(0, 12).map(c => c.id); state.deck.forEach(id => state.ownedCards.push(id, id));
    prefs.tossStyle = 'skip'; state.progress.chalSent = {}; ensureLevel().level = 20;   // lingering duels open at level 8
    startGhostDuel({ id: 'them', name: 'Tester B', deck: deckCode(state.deck) });
    await new Promise(res => setTimeout(res, 400));
    for (let i = 0; i < 4; i++) { BattleEngine.aiTurn(battle.G, battle.G.active, 'smart'); btFlush(battle.G); if (battle.G.over) break; BattleEngine.endTurn(battle.G, battle.G.active); btFlush(battle.G); }
    battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish();
    await new Promise(res => setTimeout(res, 1200));
    const sent = Object.values(store);
    out.sent = sent.length; out.to = sent[0] && sent[0].to; out.won = sent[0] && sent[0].won; out.frames = sent[0] ? sent[0].frames.length : 0; out.hasDeck = !!(sent[0] && sent[0].deck);
    // a second duel the same day sends nothing more
    out.again = challengeSend(true);
    closeBattle(); await new Promise(res => setTimeout(res, 900));
    // now I am "them": the challenge arrives as a letter, with its replay, and the document is gone
    cloudUser = { uid: 'them' };
    out.got = await challengeFetch(true);
    const l = mailState().list.find(x => /^chal-/.test(x.id));
    out.letter = !!l; out.subject = l && l.subject; out.left = Object.keys(store).length;
    out.replay = !!(l && l.chal.rid && replayGet(l.chal.rid)); out.pov = l && replayGet(l.chal.rid).pov;
    return out;
  });
  assert.strictEqual(r.sent, 1); assert.strictEqual(r.to, 'them'); assert.strictEqual(r.won, true); assert.ok(r.frames > 1); assert.ok(r.hasDeck);
  assert.strictEqual(r.again, false, 'one challenge per tester per day');
  assert.strictEqual(r.got, 1); assert.ok(r.letter); assert.strictEqual(r.subject, 'They beat your ghost'); assert.strictEqual(r.left, 0, 'delivered challenges are deleted');
  assert.ok(r.replay); assert.strictEqual(r.pov, 'Tester A');
  // the letter's buttons: watch opens the replay (labelled with their name), answer starts a duel with their deck
  const ui = await page.evaluate(() => { const l = mailState().list.find(x => /^chal-/.test(x.id)); challengeWatch(l.id);
    const t = document.getElementById('rpTitle').textContent, you = document.querySelector('#rpYou .rp-who').textContent; closeReplay();
    challengeAnswer(l.id); return { t, you }; });
  assert.strictEqual(ui.t, 'Tester A against your deck'); assert.strictEqual(ui.you, 'Tester A');
  await page.waitForFunction(() => battle && battle.npc && battle.npc.ghost && battle.npc.ghost.uid === 'me' && !battle.ended, null, { timeout: 8000 });   // answering duels their deck
};
