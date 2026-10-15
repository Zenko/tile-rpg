// Wishes: a duplicate from a pack pays Starlight (its release value), a new card pays none, and Starlight buys the card you choose.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, real = randomCardId;
    state.progress.pebbles = 500; state.progress.starlight = 0; state.ownedCards = ['sprout', 'sprout'];
    randomCardId = () => 'sprout'; buyPack('puddle');                      // a common duplicate: +1
    out.common = starlight();
    randomCardId = () => 'blossom'; buyPack('puddle');                     // a rare you do not own yet: nothing
    out.newCard = starlight();
    buyPack('puddle');                                                     // the same rare again, now a duplicate: +3
    out.rare = starlight();
    randomCardId = real;
    out.owned = state.ownedCards.filter(c => c === 'blossom').length;
    // wishing
    state.progress.starlight = 14; out.tooPoor = makeWish('acorn');
    state.progress.starlight = 15; const before = state.ownedCards.filter(c => c === 'acorn').length;
    out.wish = makeWish('acorn'); out.after = state.ownedCards.filter(c => c === 'acorn').length - before; out.left = starlight(); out.wishes = state.progress.wishes;
    state.progress.starlight = 5000;
    out.exclusive = makeWish('deep-wyrm'); out.god = makeWish('duermevela'); out.foe = makeWish('market-cat'); out.unknown = makeWish('nope');
    out.wishable = wishableCards().length; out.badWishable = wishableCards().filter(c => c.exclusive || c.foe || c.rarity === 'divine' || c.rarity === 'atlas').length;
    return out;
  });
  assert.strictEqual(r.common, 1, 'a common duplicate pays 1'); assert.strictEqual(r.newCard, 1, 'a new card pays nothing (still the 1 from before)'); assert.strictEqual(r.rare, 4, 'a rare duplicate pays 3 more');
  assert.strictEqual(r.owned, 2, 'both pulls are kept');
  assert.strictEqual(r.tooPoor, false, 'one short is not enough'); assert.ok(r.wish, 'a common wish costs 15'); assert.strictEqual(r.after, 1); assert.strictEqual(r.left, 0); assert.strictEqual(r.wishes, 1);
  assert.ok(!r.exclusive && !r.god && !r.foe && !r.unknown, 'earned and foe cards cannot be wished for'); assert.strictEqual(r.badWishable, 0); assert.ok(r.wishable > 60);

  // the Shop row and the sheet
  await page.evaluate(() => { state.progress.starlight = 50; state.ownedCards = ['sprout', 'sprout']; saveState(); switchTab('shop'); });
  await page.waitForTimeout(300);
  assert.ok(await page.locator('#goWish').isVisible(), 'the Starlight row is in the Shop');
  await page.click('#goWish');
  assert.ok(await page.locator('#wishSheet:not(.hidden)').count() === 1, 'the wish sheet opens');
  assert.strictEqual(await page.locator('#wishSheet .ws-tab').count(), 5, 'one tab per rarity');
  assert.strictEqual(await page.evaluate(() => wishRarity), 'rare', 'opens on the best wish you can afford (45 for a rare)');
  assert.ok(await page.locator('#wishSheet .ws-row:not([disabled])').count() > 0, 'affordable rows are tappable');
  await page.click('#wishSheet .ws-tab[data-r="mythic"]');
  assert.strictEqual(await page.locator('#wishSheet .ws-row:not([disabled])').count(), 0, 'a mythic wish is out of reach at 50');
  await page.click('#wishSheet .ws-tab[data-r="rare"]');
  const id = await page.locator('#wishSheet .ws-row:not([disabled])').first().getAttribute('data-id');
  await page.evaluate(() => { const t = document.getElementById('testHideOverlays'); if (t) t.remove(); });
  await page.locator('#wishSheet .ws-row:not([disabled])').first().click();
  await page.click('#confirmOk');
  await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(i => state.ownedCards.includes(i) && starlight() === 5, id), true, 'the wished card arrives and the cost is spent');
  assert.ok(await page.locator('#wishSheet.hidden').count() === 1, 'the sheet closes');
};
