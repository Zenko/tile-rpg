// The altar's candles (js/summoning.js): spare cards feed four family candles, the flames call a spirit (a card of the leading family),
// pillars burn for an hour or overnight, the Spirit Book remembers, and the four gods on four candles call the Atlas.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    const fam = f => CARD_POOL.filter(c => !c.spell && !c.exclusive && CARD_FAMILY[c.id] === f);
    const common = f => fam(f).find(c => c.rarity === 'common').id, rare = f => fam(f).find(c => c.rarity === 'rare').id;
    state.ownedCards = ['sprout', 'sprout', 'firefly', 'firefly', 'acorn', 'acorn', 'droplet', 'droplet', 'bubble', 'bubble', 'toadstool', 'toadstool'];
    state.deck = state.ownedCards.slice();
    const give = (id, n) => { for (let i = 0; i < n; i++) state.ownedCards.push(id); };
    const c1 = common('stone'), c2 = common('stone'), r1 = rare('stone'), w1 = common('wind');
    [c1, c1, c1, c1, r1, r1, w1, w1, w1].forEach(id => state.ownedCards.push(id));   // the game always keeps one copy of each, so these are 3 + 1 + 2 spare
    state.progress.altar = { found: {}, burning: [] }; altarDraft = null;
    out.deckRefused = altarAdd('sprout') !== '';                       // a deck card is not spare
    out.fedOk = [altarAdd(c1), altarAdd(c1), altarAdd(r1)].every(m => m === '');
    let rd = altarRead(); out.key = rd.key; out.lit = rd.lit.join(',');
    out.fourthStone = altarAdd(c1) !== '';                             // only three copies exist as spares beyond ... and a candle holds three
    // a second family changes the read
    altarAdd(w1); rd = altarRead(); out.mixKey = rd.key;
    // speak now: the cards are used, a stone-family card of at least the best rarity arrives
    const before = state.ownedCards.length, pebbles = state.progress.pebbles;
    altarDraftNow().burn = 'now'; const text = altarGo();
    out.after = before - state.ownedCards.length; out.text = text; out.found = Object.keys(altarState().found);
    out.pebbleFirst = state.progress.pebbles - pebbles;
    out.draftEmpty = altarFed().length === 0;
    // a pillar: cards are used now, the card comes later, Embers too
    give(c1, 3); altarAdd(c1); altarAdd(c1); altarDraftNow().burn = 'hour';
    const owned0 = state.ownedCards.length; altarGo();
    out.pillar = altarBurning().length; out.pillarSpent = state.ownedCards.length === owned0 - 2 || state.ownedCards.length <= owned0;
    out.earlyCollect = altarCollect(0); out.stillThere = altarBurning().length;
    altarBurning()[0].start -= 3600001; const pb = state.progress.pebbles, n0 = state.ownedCards.length;
    altarCollect(0); out.collected = state.ownedCards.length - n0; out.embers = state.progress.pebbles - pb; out.pillarGone = altarBurning().length;
    // the pillar cap
    for (let k = 0; k < 3; k++) { give(c1, 3); altarAdd(c1); altarAdd(c1); altarDraftNow().burn = 'night'; out['cap' + k] = altarGo(); }
    out.pillars = altarBurning().length;
    // gods
    altarBurning().length = 0; altarDraft = null;
    ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'].forEach(id => state.ownedCards.push(id));
    altarAdd('duermevela'); altarAdd('murmullo'); altarAdd('marea-lenta'); out.threeGods = altarRead().atlas;
    give(c1, 3); out.mixed = (altarAdd(c1) === '' && altarRead().mixed); altarFed(); altarDraftNow().feed.stone.pop();
    altarAdd('ensueno'); out.fourGods = altarRead().atlas; altarGo();
    out.atlas = state.ownedCards.includes('the-atlas'); out.godsKept = ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'].every(id => state.ownedCards.includes(id));
    // the view
    altarDraft = null; openScene('home'); sceneAction('altar'); sceneAction('alt:open');
    out.view = document.querySelectorAll('#scActions .alt-c').length; out.book = document.querySelectorAll('#scActions .alt-b').length;
    return out;
  });
  assert.ok(r.deckRefused, 'a card the deck needs cannot be fed');
  assert.ok(r.fedOk); assert.strictEqual(r.key, 'stone-stone'); assert.strictEqual(r.mixKey, 'stone-wind', 'stone leads, wind follows');
  assert.ok(r.fourthStone, 'a candle holds three cards');
  assert.strictEqual(r.after, 3, 'four cards were spent and one arrived'); assert.ok(/answers the candles/.test(r.text)); assert.deepStrictEqual(r.found, ['stone-wind']);
  assert.ok(r.pebbleFirst >= 6, 'the first find pays Embers'); assert.ok(r.draftEmpty);
  assert.strictEqual(r.pillar, 1, 'an hour burn goes on a pillar'); assert.ok(/still burning/.test(r.earlyCollect)); assert.strictEqual(r.stillThere, 1);
  assert.strictEqual(r.collected, 1, 'the card arrives when it is done'); assert.ok(r.embers >= 4, 'an hour pays Embers a card'); assert.strictEqual(r.pillarGone, 0);
  assert.strictEqual(r.pillars, 2, 'only two pillars at once'); assert.ok(/Both pillars/.test(r.cap2));
  assert.ok(!r.threeGods, 'three gods are not enough'); assert.ok(r.mixed, 'a god with another card is not the Atlas');
  assert.ok(r.fourGods && r.atlas && r.godsKept, 'four gods on four candles call the Atlas and nothing is used up');
  assert.strictEqual(r.view, 4, 'the candle view draws four candles'); assert.strictEqual(r.book, 23, 'the Spirit Book has a slot for each of the 23 spirits');
};
