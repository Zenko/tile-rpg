// The Hall of Spirits: five wings of eight cards, a door in Market Row, donating spare copies, and a finished wing's rewards.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    // the data
    const ids = MUSEUM_WINGS.flatMap(w => w.cards);
    out.wings = MUSEUM_WINGS.length; out.sizes = MUSEUM_WINGS.map(w => w.cards.length).join();
    out.unique = new Set(ids).size === ids.length;
    out.allReal = ids.every(id => { const c = CARD_POOL.find(x => x.id === id); return c && !c.exclusive; });
    out.decos = MUSEUM_WINGS.every(w => { const d = DECORATION_ITEMS.find(x => x.id === w.deco); return d && d.museum; });
    out.ladder = MUSEUM_WINGS.map(w => w.cards.map(id => cardDef(id).rarity).join('>'));
    // the door is on the map and can be walked to
    const m = getMap('market'), b = m.buildings.find(x => x.id === 'museum'), data = ensureDistrictData('market');
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    out.door = !!b && !!m.entries[b.entry.x + ',' + b.entry.y] && !m.solid[b.entry.y][b.entry.x];
    out.path = !!(b && findPath(m, data, m.spawn, (x, y) => x === b.entry.x && y === b.entry.y));
    out.scene = INTERIORS.museum.title;
    // donating
    state.deck = []; state.progress.pebbles = 0; state.progress.starlight = 0; state.progress.museum = { donated: {}, wings: {} };
    const rest = CARD_POOL.filter(c => !c.exclusive && c.id !== 'sprout').flatMap(c => [c.id, c.id, c.id]);   // a full collection, so there are spares to give
    state.ownedCards = rest.concat(['sprout']); out.lastCopy = canDonate('sprout');            // the only copy is never taken
    state.ownedCards = rest.concat(['sprout', 'sprout', 'sprout']); out.spare = canDonate('sprout');
    const t = donateCard('sprout');
    out.after = state.ownedCards.filter(c => c === 'sprout').length; out.donated = isDonated('sprout'); out.embers = state.progress.pebbles; out.again = canDonate('sprout'); out.text = t.includes('takes its place');
    // finishing the Grove wing
    const w = MUSEUM_WINGS[0]; w.cards.forEach(id => { state.ownedCards.push(id, id, id); });
    state.progress.pebbles = 0; state.progress.starlight = 0; delete state.progress.museum.donated.sprout; state.decorationInventory = {};
    let last = ''; w.cards.forEach(id => { last = donateCard(id); });
    out.done = !!museumState().wings[w.id]; out.progress = wingProgress(w);
    out.pay = state.progress.pebbles - 2 * w.cards.length; out.star = state.progress.starlight; out.deco = decorationInventoryCount(w.deco); out.lastText = last.includes('is complete');
    return out;
  });
  assert.strictEqual(r.wings, 5); assert.strictEqual(r.sizes, '8,8,8,8,8'); assert.ok(r.unique, 'no card sits in two wings'); assert.ok(r.allReal, 'every wing card is a real pack card');
  assert.ok(r.decos, 'every wing has a keepsake'); r.ladder.forEach(l => assert.ok(l.startsWith('common>common') && l.endsWith('super>mythic'), 'each wing climbs from commons to a mythic: ' + l));
  assert.ok(r.door && r.path, 'the Hall has a door in Market Row that can be walked to'); assert.strictEqual(r.scene, 'The Hall of Spirits');
  assert.strictEqual(r.lastCopy, false, 'the last copy is never taken'); assert.ok(r.spare, 'a spare can be donated'); assert.strictEqual(r.after, 2, 'one copy goes, the rest stay'); assert.ok(r.donated && r.text && r.embers >= 2 && !r.again, JSON.stringify({ d: r.donated, t: r.text, e: r.embers, a: r.again }));
  assert.ok(r.done && r.progress === 8, 'the wing completes'); assert.ok(r.pay >= 60 && r.pay < 80, 'a finished wing pays 60 Embers (a level-up bonus may add a few): ' + r.pay); assert.strictEqual(r.star, 10, 'and 10 Starlight'); assert.strictEqual(r.deco, 1, 'and a keepsake'); assert.ok(r.lastText);

  // in the building: the wings list and a wing's cards
  await page.evaluate(() => { state.ownedCards = CARD_POOL.filter(c => !c.exclusive && c.id !== 'rice-cake').flatMap(c => [c.id, c.id, c.id]).concat(['rice-cake']); state.deck = []; state.progress.museum = { donated: {}, wings: {} }; openScene('museum'); });
  await page.waitForTimeout(300);
  assert.ok((await page.locator('#scActions button').allTextContents()).join('|').includes('Visit the wings'), 'the Hall offers its wings, and no expeditions');
  assert.ok(!(await page.locator('#scActions').innerText()).includes('Expedition'), 'expeditions stay closed');
  await page.evaluate(() => sceneAction('wings'));
  const wingBtns = await page.locator('#scActions button').allTextContents();
  assert.ok(wingBtns.some(t => t.includes('Wing') && t.includes('/8')) && wingBtns.some(t => t.includes('Lullabies')), 'five wings are listed: ' + wingBtns.join('|'));
  await page.evaluate(() => sceneAction('wing:stone'));
  const cardBtns = (await page.locator('#scActions button').allTextContents()).join('|');
  assert.ok(cardBtns.includes('Donate') && cardBtns.includes('Worry Stone'), 'a spare can be donated from the wing: ' + cardBtns);
  assert.ok(cardBtns.includes('Rice Cake') && cardBtns.includes('needs a spare copy'), 'a single copy is shown but not donatable: ' + cardBtns);
};
