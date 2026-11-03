// Card evolution and lore (build 332).
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, id = 'sprout';
    state.ownedCards = state.ownedCards.filter(x => x !== id && x !== id + '~e'); state.ownedCards.push(id, id);
    state.deck = state.deck.filter(x => x !== id && x !== id + '~e'); state.progress.evolved = {}; state.progress.mastery = state.progress.mastery || {};
    state.progress.mastery[id] = 0;
    out.blockedLow = /mastery/.test(evolveBlock(id));
    state.progress.mastery[id] = 40;
    out.can = canEvolve(id);
    const to = evolveCard(id), d = cardDef(to), b = cardDef(id);
    out.to = to; out.name = d.name; out.stronger = d.power === b.power + EVOLVE_BONUS.power && d.grit === b.grit + EVOLVE_BONUS.grit;
    out.owned = state.ownedCards.filter(x => x === id).length + '/' + state.ownedCards.filter(x => x === to).length;
    out.again = canEvolve(id);
    // a card whose only copies are in the deck evolves in place
    const id2 = 'acorn'; state.ownedCards = state.ownedCards.filter(x => x !== id2 && !x.startsWith(id2 + '~')); state.deck = state.deck.filter(x => !x.startsWith(id2));
    state.ownedCards.push(id2); state.deck.push(id2); state.progress.mastery[id2] = 40;
    evolveCard(id2); out.deckEvolved = state.deck.includes(id2 + '~e') && !state.deck.includes(id2);
    // every evolved name is a real name; spells, foes and crafted cards never evolve
    out.badNames = CARD_POOL.filter(c => !c.spell).map(c => cardDef(c.id + '~e')).filter(x => !x || !x.name || /undefined/.test(x.name)).length;
    out.spell = cardDef('spark~e') === undefined;
    out.withSkill = cardDef('sprout~e.guard') === undefined;
    // lore: every card's page has a line; written ones win over the templates
    out.lore = cardStory(cardDef('sprout')) === CARD_LORE.sprout;
    out.missingLore = CARD_POOL.filter(c => !CARD_LORE[c.id]).map(c => c.id);
    out.staleLore = Object.keys(CARD_LORE).filter(k => !CARD_POOL.some(c => c.id === k));
    return out;
  });
  assert.strictEqual(r.blockedLow, true); assert.strictEqual(r.can, true);
  assert.strictEqual(r.to, 'sprout~e'); assert.strictEqual(r.name, 'Sapling'); assert.ok(r.stronger);
  assert.strictEqual(r.owned, '1/1'); assert.strictEqual(r.again, false); assert.ok(r.deckEvolved, 'the deck copy evolves in place');
  assert.strictEqual(r.badNames, 0); assert.ok(r.spell); assert.ok(r.withSkill);
  assert.ok(r.lore); assert.deepStrictEqual(r.missingLore, []); assert.deepStrictEqual(r.staleLore, []);
  // the card page: lore and the Evolve button
  await page.evaluate(() => { state.progress.mastery['blossom'] = 40; state.ownedCards.push('blossom'); delete state.progress.evolved.blossom; switchTab('collection'); setCardsView('mine'); openCardSheet('blossom'); });
  const ui = await page.evaluate(() => ({ lore: document.querySelector('#cardSheetBody .cs-lore-who') && document.querySelector('#cardSheetBody .cs-lore-who').textContent,
    evolve: (document.querySelector('#cardSheetBody [data-cs="evolve"]') || {}).disabled }));
  assert.match(ui.lore || '', /as .+ tells it/); assert.strictEqual(ui.evolve, false);
  await page.evaluate(() => document.querySelector('#cardSheetBody [data-cs="evolve"]').click());
  assert.strictEqual(await page.evaluate(() => state.ownedCards.includes('blossom~e')), true, 'one tap evolves it');
};
