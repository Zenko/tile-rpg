// Release keeps two copies: a card can only be released once you own three or more of it (and the copy isn't one the deck needs).
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    state.ownedCards = ['sprout', 'sprout', 'firefly', 'firefly', 'acorn', 'acorn', 'droplet', 'droplet', 'bubble', 'bubble', 'toadstool', 'toadstool', 'worry-stone'];
    state.deck = []; ensureDeckSlots();
    const id = 'pebble'; state.ownedCards = state.ownedCards.filter(c => c !== 'worry-stone');
    state.ownedCards.push(id, id);
    out.twoCopies = [spareCount(id) >= 1, canRelease(id), releaseCard(id)];
    state.ownedCards.push(id);
    out.threeCopies = [canRelease(id), typeof releaseCard(id)];
    out.left = state.ownedCards.filter(c => c === id).length;
    out.fourthBlocked = releaseCard(id) === false || state.ownedCards.filter(c => c === id).length >= 2;
    return out;
  });
  assert.strictEqual(r.twoCopies[1], false, 'two copies cannot be released'); assert.strictEqual(r.twoCopies[2], false);
  assert.strictEqual(r.threeCopies[0], true, 'three copies can'); assert.strictEqual(r.threeCopies[1], 'number');
  assert.strictEqual(r.left, 2, 'two copies are always kept'); assert.ok(r.fourthBlocked);
};
