// Weekly Rule: one rule per week, numbers add onto the world's mods (objects merge), skipped for neutral matches. Every rule is checked.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const known = new Set(['swiftBonus', 'mendBonus', 'shieldHp', 'bloomStart', 'echoBonus', 'guardHp', 'thornsBonus', 'drainBonus', 'rallyBonus', 'kwPower', 'kwHp', 'kwMaxCost', 'weekFam']);
    const rule = weeklyRule(), mods = { shieldHp: 1 }, chips = []; applyWeeklyRule(mods, chips);
    const key = Object.keys(rule.mods)[0], w = battleWorld({}, 'clear'), n = battleWorld({ playerDeck: [] }, 'clear');
    const each = WEEKLY_RULES.map(x => {
      const m = { shieldHp: 1, kwHp: { guard: 1 } }, c = [], real = weeklyRule; weeklyRule = () => x; applyWeeklyRule(m, c); weeklyRule = real;
      return { id: x.id, known: Object.keys(x.mods).every(k => known.has(k)), chip: c.length === 1 && c[0].includes(x.text), kept: m.shieldHp === (x.mods.shieldHp ? 2 : 1) && m.kwHp.guard === 1 };
    });
    // a week later is a different rule, and a full rotation shows every rule once
    const seen = new Set(); for (let i = 0; i < WEEKLY_RULES.length; i++) { const y = 2030, wk = i + 1; seen.add(WEEKLY_RULES[((y * 53 + wk) % WEEKLY_RULES.length + WEEKLY_RULES.length) % WEEKLY_RULES.length].id); }
    return { id: rule.id, ok: WEEKLY_RULES.includes(rule), added: typeof rule.mods[key] === 'number' ? mods[key] === (key === 'shieldHp' ? 2 : 1) : !!mods[key], chips: chips.length, inWorld: w.chips.some(c => c.startsWith('📅')), neutral: n.chips.some(c => c.startsWith('📅')), all: new Set(WEEKLY_RULES.map(x => x.id)).size, total: WEEKLY_RULES.length, each, rotation: seen.size };
  });
  assert.ok(r.ok && r.added && r.chips === 1, 'the rule adds onto mods and gives a chip');
  assert.ok(r.inWorld && !r.neutral, 'normal matches get it, draft matches do not');
  assert.strictEqual(r.total, 17); assert.strictEqual(r.all, r.total, 'every rule has its own id');
  r.each.forEach(x => { assert.ok(x.known, x.id + ' only uses mods the engine knows'); assert.ok(x.chip, x.id + ' gives one chip with its text'); assert.ok(x.kept, x.id + ' keeps the mods already there'); });
  assert.strictEqual(r.rotation, r.total, 'a full run of weeks shows every rule once');
};
