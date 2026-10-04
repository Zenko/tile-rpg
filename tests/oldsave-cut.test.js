// An older save that names cards which no longer exist (the 100-card cut) loads cleanly: companion, charms, foils, favourites, trades and away expeditions are tidied.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const p = state.progress;
    state.companion = { cardId: 'celestial-owl', name: 'Celestial Owl', icon: '🦉', perk: 'finds', since: Date.now() };
    p.charms = ['starlight', 'sprout', null]; p.foils = { reed: 1, sprout: 2 };
    p.home = { shelf: [], favs: ['reed', 'sprout'] };
    p.trades = { day: todayKey(), offers: [{ kind: 'swap', want: 'reed', give: 'sprout' }] };
    p.expeditions = { active: [{ id: 'meadow', cards: ['reed', 'sprout'], ends: Date.now() + 1e6 }], picking: null };
    const before = state.ownedCards.filter(c => c === 'sprout').length;
    sanitizeCards();
    return { companion: state.companion, charms: p.charms, foils: Object.keys(p.foils), favs: p.home.favs, trades: p.trades, away: p.expeditions.active.length,
             sprout: state.ownedCards.filter(c => c === 'sprout').length - before };
  });
  assert.strictEqual(r.companion, null); assert.deepStrictEqual(r.charms, [null, 'sprout', null]); assert.deepStrictEqual(r.foils, ['sprout']);
  assert.deepStrictEqual(r.favs, ['sprout']); assert.strictEqual(r.trades, undefined); assert.strictEqual(r.away, 0);
  assert.strictEqual(r.sprout, 1, 'a card that was away on an expedition comes home');
};
