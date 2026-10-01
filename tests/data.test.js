// Data sanity: the guide, cards, releases and quests are internally consistent.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    const flat = []; (GUIDE || []).forEach(g => (g.items || [g]).forEach(i => flat.push(i)));
    const names = new Set(flat.map(i => i.name));
    out.guideNoName = flat.filter(i => !i.name || !i.how).length;
    out.staleGuideGo = Object.keys(GUIDE_GO).filter(k => !names.has(k));
    out.dupGuide = flat.map(i => i.name).filter((n, i, a) => a.indexOf(n) !== i);
    out.dupCards = CARD_POOL.map(c => c.id).filter((n, i, a) => a.indexOf(n) !== i);
    out.badCards = CARD_POOL.filter(c => !c.name || !c.icon || !RARITY_LABEL[c.rarity] || (!c.spell && (typeof c.power !== 'number' || typeof c.grit !== 'number'))).map(c => c.id);
    out.badSetCards = CARD_SETS.flatMap(s => s.cards.filter(id => !CARD_POOL.some(c => c.id === id)).map(id => s.id + ':' + id));
    out.badFamily = Object.keys(CARD_FAMILY).filter(id => !CARD_POOL.some(c => c.id === id) && !FOE_CARDS.some(c => c.id === id));
    out.badQuests = QUEST_POOL.concat(WEEKLY_QUEST_POOL).filter(q => !q.id || !q.stat || !(q.goal > 0) || !RARITY_LABEL[q.reward]).map(q => q.id);
    out.dupQuests = QUEST_POOL.concat(WEEKLY_QUEST_POOL).map(q => q.id).filter((n, i, a) => a.indexOf(n) !== i);
    out.badDeckCode = parseDeckCode(deckCode(CARD_POOL.slice(0, 12).map(c => c.id))).length;
    return out;
  });
  assert.strictEqual(r.guideNoName, 0, 'guide entries missing a name or text');
  assert.deepStrictEqual(r.staleGuideGo, [], 'GUIDE_GO names a guide entry that does not exist');
  assert.deepStrictEqual(r.dupGuide, [], 'duplicate guide names');
  assert.deepStrictEqual(r.dupCards, [], 'duplicate card ids');
  assert.deepStrictEqual(r.badCards, [], 'cards missing fields');
  assert.deepStrictEqual(r.badSetCards, [], 'a set lists a card that does not exist');
  assert.deepStrictEqual(r.badFamily, [], 'CARD_FAMILY lists unknown cards');
  assert.deepStrictEqual(r.badQuests, [], 'quests missing fields');
  assert.deepStrictEqual(r.dupQuests, [], 'duplicate quest ids');
  assert.strictEqual(r.badDeckCode, 12, 'deck code round trip');
};
