// The altar: gods are summoned with a beaten boss plus a spare-card offering; the Atlas needs all four gods.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    const fam = f => CARD_POOL.filter(c => !c.spell && !c.exclusive && CARD_FAMILY[c.id] === f).map(c => c.id);
    // a deck that does not use the Recuerdo cards, plus 4 spare copies of one common Recuerdo card
    state.ownedCards = ['sprout', 'sprout', 'firefly', 'firefly', 'acorn', 'acorn', 'droplet', 'droplet', 'bubble', 'bubble', 'toadstool', 'toadstool'];
    state.deck = state.ownedCards.slice(); const rc = fam('stone')[0];
    for (let i = 0; i < 4; i++) state.ownedCards.push(rc);
    summonState(); const s = summonDef('duermevela');
    out.notBeaten = summonReady(s);
    noteGodBeaten('square'); out.beatenKept = summonState().beaten.square === true;
    out.offeringLen = summonOffering(s).length;
    out.readyNow = summonReady(s);
    const before = state.ownedCards.filter(c => c === rc).length;
    const text = summonTap('duermevela');
    out.afterCopies = state.ownedCards.filter(c => c === rc).length; out.before = before;
    out.ownsGod = state.ownedCards.includes('duermevela'); out.text = text;
    out.again = summonTap('duermevela');
    // the deck is untouched and the offering never takes the last copy
    out.deckOk = state.deck.every(id => state.ownedCards.includes(id));
    // the Atlas stays hidden, then unmet, then ready
    out.atlasHidden = !atlasRevealed() ? false : true;   // one god home reveals it
    out.atlasReadyEarly = summonReady(summonDef('the-atlas'));
    ['murmullo', 'marea-lenta', 'ensueno'].forEach(id => state.ownedCards.push(id));
    out.atlasReady = summonReady(summonDef('the-atlas'));
    const t2 = summonTap('the-atlas'); out.atlasOwned = state.ownedCards.includes('the-atlas'); out.godsKept = ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'].every(id => state.ownedCards.includes(id));
    // the cottage renders the altar
    openScene('home'); sceneAction('altar'); out.altarBtns = document.querySelectorAll('#scActions [data-act^="summon:"]').length;
    return out;
  });
  assert.strictEqual(r.notBeaten, false, 'a god needs a beaten boss'); assert.ok(r.beatenKept);
  assert.strictEqual(r.offeringLen, 3); assert.ok(r.readyNow);
  assert.strictEqual(r.before - r.afterCopies, 3, 'the offering took three spare copies'); assert.ok(r.ownsGod, 'the god is summoned');
  assert.ok(/answers the call/.test(r.text)); assert.ok(/home/.test(r.again), 'summoning twice just says so');
  assert.ok(r.deckOk, 'the deck is never offered up');
  assert.strictEqual(r.atlasHidden, true, 'the Atlas row appears once a god is home'); assert.strictEqual(r.atlasReadyEarly, false);
  assert.ok(r.atlasReady && r.atlasOwned && r.godsKept, 'the Atlas needs all four gods and consumes nothing');
  assert.strictEqual(r.altarBtns, 5, 'the altar lists five summons');
};
