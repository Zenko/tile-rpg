// NPC brain, stage 1: a neighbour plans their deck from your suggestion, the weather, the season and their own taste.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const n = { id: 'npc-square-1', name: 'Testa', x: 1, y: 1 }, out = {};
    // no hearts: a suggestion is politely declined and nothing is stored
    out.declined = npcAcceptHint(n, 'family:tide').ok === false && !npcDeckHint(n);
    // give them hearts, then suggest
    friendsState()[neighborKey(n)] = { name: n.name, district: 'square', points: 25, icon: '🙂', sigDay: null, sigWins: 0, gift: false };
    out.hearts = friendHearts(n);
    out.accepted = npcAcceptHint(n, 'family:tide').ok === true && npcDeckHint(n).id === 'family:tide';
    state.weather.current = 'clear';
    const plan = npcDeckPlan(n, 3);
    out.keepLen = plan.keep.length;
    out.tideKept = plan.keep.filter(id => CARD_FAMILY[id] === 'tide').length;
    out.allOk = plan.keep.every(id => npcCardOk(id, 3));
    out.note = plan.note;
    // the plan flows into a full, legal deck
    const deck = buildDeckForOpponent(DECK_SIZE, false, 3, n.name, 'square', null, plan);
    out.deckLen = deck.length; out.deckValid = deck.every(id => !!cardDef(id));
    const bases = deck.map(id => BattleEngine.baseIdOf(id));   // foe/enhanced swaps may turn a card into its "+" version
    out.inDeck = plan.keep.filter(id => bases.includes(id)).length;
    // gentle neighbours (tier 1) never keep a card above common
    npcAcceptHint(n, 'tough');
    out.tier1 = npcDeckPlan(n, 1).keep.every(id => BattleEngine.defOf(id).rarity === 'common');
    // weather drives the family when nothing is suggested
    delete friendOf(n).deckHint; state.weather.current = 'rain';
    out.rain = npcDeckPlan(n, 3).keep.some(id => CARD_FAMILY[id] === 'tide');
    // taste is stable
    out.stable = JSON.stringify(npcTaste(n)) === JSON.stringify(npcTaste({ name: 'Testa' }));
    return out;
  });
  assert.ok(r.declined, 'no hearts, no suggestion');
  assert.strictEqual(r.hearts, 5);
  assert.ok(r.accepted, 'a friend takes the suggestion');
  assert.ok(r.keepLen >= 3 && r.keepLen <= 7, 'a few kept cards: ' + r.keepLen);
  assert.ok(r.tideKept >= 3, 'five hearts keeps several Deriva cards: ' + r.tideKept);
  assert.ok(r.allOk, 'every kept card is allowed at this tier');
  assert.ok(/Deriva cards \(as you suggested\)/.test(r.note), r.note);
  assert.strictEqual(r.deckLen, 12); assert.ok(r.deckValid);
  assert.ok(r.inDeck >= Math.ceil(r.keepLen / 2), 'the plan reaches the deck: ' + r.inDeck + ' of ' + r.keepLen);
  assert.ok(r.tier1, 'a gentle neighbour keeps only commons');
  assert.ok(r.rain, 'rain turns them to Deriva');
  assert.ok(r.stable);
  // the Chat menu offers it and a pick is saved
  await page.evaluate(() => { document.getElementById('testHideOverlays').remove(); const n = state.districtData.square.npcs[0]; friendsState()[neighborKey(n)] = { name: n.name, district: 'square', points: 7, icon: '🙂', sigDay: null, sigWins: 0, gift: false }; openTalk(n); });
  const click = sel => page.evaluate(q => document.querySelector(q).click(), sel);
  await click('#talkCats [data-go="chat"]');
  await page.evaluate(() => [...document.querySelectorAll('#talkTopics button')].find(b => /Suggest a deck/.test(b.textContent)).click());
  await click('#talkTopics [data-hint="gentle"]');
  assert.strictEqual(await page.evaluate(() => npcDeckHint(talkTo).id), 'gentle');
};
