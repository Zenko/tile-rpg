// Rare events, calm districts, the Binder and the stats summary.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const ids = new Set(TOWN_EVENTS.map(e => e.id));
    let rare = 0, days = 600;
    const real = todayKey; 
    for (let i = 0; i < days; i++) { todayKey = () => '2030-01-' + i; const e = eventNow(); if (!ids.has(e.id)) throw new Error('bad event'); if (e.rare) rare++; }
    todayKey = real;
    markDistrictCalm('square');
    return { rare, calm: districtCalm('square'), calmOther: districtCalm('market') };
  });
  assert.ok(r.rare > 10 && r.rare < 120, 'rare events should be roughly 1 day in 12, got ' + r.rare + ' of 600');
  assert.ok(r.calm && !r.calmOther, 'calm applies only to the beaten district, today');
  const b = await page.evaluate(() => {
    state.progress.binderDone = {}; const disc = new Set(state.progress.discovered || []);
    CARD_POOL.filter(c => c.rarity === 'common' && !c.foe).forEach(c => disc.add(c.id));
    state.progress.discovered = Array.from(disc);
    const p0 = state.progress.pebbles; checkBinder();
    return { done: Object.keys(binderDone()), paid: state.progress.pebbles - p0, html: binderHtml().includes('Binder') };
  });
  assert.ok(b.done.includes('common'), 'the common page completes'); assert.strictEqual(b.paid, 20); assert.ok(b.html);
  const s = await page.evaluate(() => statsSummary());
  assert.ok(s.build > 0 && s.totals && typeof s.level === 'number'); assert.ok(!('name' in s), 'stats must be anonymous');
};
