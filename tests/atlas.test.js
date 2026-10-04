// The Atlas: placed in the Dreamer's district once summoned, a written chat, four rule-bending matches, harder games and its own shop.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    out.before = syncAtlas() === false && !atlasNpc(ensureDistrictData(state.currentDistrict));
    state.ownedCards.push('the-atlas');
    checkBinder();   // the Atlas binder page pays out once, settle it before counting Embers
    out.placed = syncAtlas() === true && !!atlasNpc(ensureDistrictData(state.currentDistrict));
    const other = Object.keys(DISTRICTS).find(k => k !== state.currentDistrict);
    state.currentDistrict = other; syncAtlas();
    out.moved = !!atlasNpc(ensureDistrictData(other)) && Object.keys(state.districtData).filter(k => atlasNpc(state.districtData[k])).length === 1;
    // chat
    out.answers = ATLAS_TOPICS.map(t => atlasAnswer(t.id)).every(a => typeof a === 'string' && a.length > 10);
    state.deck = [];
    out.guideDeck = /spirits into a match/.test(atlasGuidance());
    // battle opponent and twist
    const o = atlasOpponent(2);
    out.opp = [o.deck.length, bossTwistFor(o), o.profile.level];
    out.open = [atlasBattleOpen(0), atlasBattleOpen(1)];
    // shop: needs wins and Embers
    state.progress.pebbles = 1000; const a = atlasState(); a.wins = 0;
    out.locked = /Not yet/.test(atlasBuy('atlas-compass'));
    a.wins = 1; const had = state.progress.pebbles; atlasBuy('atlas-compass');
    out.bought = [decorationInventoryCount('atlas-compass'), had - state.progress.pebbles];
    out.notInCardShop = !DECORATION_ITEMS.filter(i => !i.museum && !i.atlas).some(i => i.atlas);
    // games: thresholds are higher
    const g = atlasGameIds()[0], d = MINIGAMES[g];
    mini = { id: g, def: d, atlas: true }; const hard = miniTier(d, d.tiers.gold); const hardOk = miniTier(d, Math.ceil(d.tiers.gold * ATLAS_HARD));
    mini = null; const easy = miniTier(d, d.tiers.gold);
    out.tiers = [hard, hardOk, easy];
    // scene
    openScene('atlas'); out.sceneBtns = document.querySelectorAll('#scActions [data-act^="atlas-"]').length;
    sceneAction('atlas-shop'); out.shopBtns = document.querySelectorAll('#scActions [data-act^="atlasbuy:"]').length;
    return out;
  });
  assert.ok(r.before, 'no Atlas before it is summoned'); assert.ok(r.placed, 'the Atlas appears in the Dreamer\'s district');
  assert.ok(r.moved, 'and follows them to another one, only ever in one place'); assert.ok(r.answers, 'every question has an answer');
  assert.ok(r.guideDeck, 'guidance follows progress'); assert.deepStrictEqual(r.opp, [12, 'tide', 'smart']);
  assert.deepStrictEqual(r.open, [true, false]); assert.ok(r.locked, 'the shop needs an Atlas win');
  assert.deepStrictEqual(r.bought, [1, 150]); assert.strictEqual(r.tiers[0], 'silver', 'the old gold line is only silver for the Atlas');
  assert.strictEqual(r.tiers[1], 'gold'); assert.strictEqual(r.tiers[2], 'gold');
  assert.strictEqual(r.sceneBtns, 4); assert.strictEqual(r.shopBtns, 4);
};
