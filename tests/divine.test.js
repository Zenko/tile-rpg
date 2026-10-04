// The Divine and Atlas rarities: five summon-only cards that no pack, find, prize or trade can produce.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    out.total = CARD_POOL.length;
    out.divine = CARD_POOL.filter(c => c.rarity === 'divine').map(c => c.id).sort();
    out.atlas = CARD_POOL.filter(c => c.rarity === 'atlas').map(c => c.id);
    out.allSummon = CARD_POOL.filter(c => c.rarity === 'divine' || c.rarity === 'atlas').every(c => c.exclusive === 'summon');
    out.inPool = ['divine', 'atlas'].map(r => cardPool(r).length);
    out.mythicUp = nextRarity('mythic');
    out.steps = RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(TRADE_TOP));
    out.families = ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'].map(id => CARD_FAMILY[id]);
    out.tier = rarityTier('the-atlas');
    out.gift = CARD_GIFT_POINTS[rarityTier('the-atlas')];
    // every rarity renders: the card sheet, a battle card and the Index
    state.ownedCards.push('duermevela', 'the-atlas');
    renderCollection(); openCardSheet('the-atlas'); out.sheet = /atlas/.test(document.getElementById('cardSheet').innerHTML);
    closeCardSheet();
    out.binder = binderPages().filter(p => p.id === 'divine' || p.id === 'atlas').map(p => p.id);
    // a pack can never roll them
    let leak = 0; for (let i = 0; i < 3000; i++) { const c = cardDef(randomCardId(rollPackRarity(PACKS[PACKS.length - 1]))); if (c.exclusive) leak++; }
    out.leak = leak;
    return out;
  });
  assert.strictEqual(r.total, 100, 'the pool is exactly 100 cards');
  assert.deepStrictEqual(r.divine, ['duermevela', 'ensueno', 'marea-lenta', 'murmullo']);
  assert.deepStrictEqual(r.atlas, ['the-atlas']);
  assert.ok(r.allSummon, 'divine and atlas cards are all summon-only');
  assert.deepStrictEqual(r.inPool, [0, 0], 'cardPool never offers them');
  assert.strictEqual(r.mythicUp, null, 'nothing trades up from mythic');
  assert.ok(!r.steps.includes('divine') && r.steps.includes('mythic') === false && r.steps.length === 4, 'trade-up ladder stops below mythic: ' + r.steps);
  assert.deepStrictEqual(r.families, ['stone', 'wind', 'tide', 'grove']);
  assert.strictEqual(r.tier, 7); assert.strictEqual(r.gift, 8);
  assert.ok(r.sheet, 'the Atlas card sheet renders'); assert.deepStrictEqual(r.binder, ['divine', 'atlas']);
  assert.strictEqual(r.leak, 0, 'no pack ever hands out an exclusive card');
};
