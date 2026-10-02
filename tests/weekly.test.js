// Weekly Rule: one rule per week, numbers add onto the world's mods, skipped for neutral matches.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const rule = weeklyRule(), mods = { shieldHp: 1 }, chips = []; applyWeeklyRule(mods, chips);
    const key = Object.keys(rule.mods)[0], w = battleWorld({}, 'clear'), n = battleWorld({ playerDeck: [] }, 'clear');
    return { id: rule.id, ok: WEEKLY_RULES.includes(rule), added: mods[key] === (key === 'shieldHp' ? 2 : 1), chips: chips.length, inWorld: w.chips.some(c => c.startsWith('📅')), neutral: n.chips.some(c => c.startsWith('📅')), all: new Set(WEEKLY_RULES.map(x => x.id)).size };
  });
  assert.ok(r.ok && r.added && r.chips === 1, 'the rule adds onto mods and gives a chip');
  assert.ok(r.inWorld && !r.neutral, 'normal matches get it, draft matches do not');
  assert.strictEqual(r.all, 6);
};
