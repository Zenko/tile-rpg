// Event director: paced, relevant, stable for the day, and rare events stay rare.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, real = todayKey, ev = id => TOWN_EVENTS.find(e => e.id === id);
    // the weights, as pure arithmetic
    const w = (id, ctx) => directorWeight(ev(id), Object.assign({ hist: [], totals: {}, hearts: 9, tilt: 0 }, ctx));
    out.noRepeat = w('market-day', { hist: ['market-day'] }) < w('market-day', {}) * 0.2;
    out.recentLess = w('market-day', { hist: ['market-day', 'swap-day'] }) < w('market-day', {}) && w('market-day', { hist: ['market-day', 'swap-day'] }) > w('market-day', { hist: ['swap-day', 'market-day'] });
    out.usedBoost = w('fishing-derby', { totals: { fishCaught: 5 } }) > w('fishing-derby', { totals: { fishCaught: 0 } });
    out.afterRare = w('starfall', { hist: ['tourney'] }) < w('starfall', {});
    out.friendsFair = w('friendship-fair', { hearts: 0 }) > w('friendship-fair', { hearts: 9 });
    out.tourneyAfterLosses = w('tourney', { tilt: -2 }) > w('tourney', { tilt: 0 });
    // over a long run: valid, no back-to-back repeats, rare events about one day in a dozen, every event appears
    state.progress.director = { day: null, id: null, hist: [] }; state.progress.totals.fishCaught = 3;
    let prev = null, repeats = 0, rare = 0, bad = 0; const seen = new Set(), days = 720;
    for (let i = 0; i < days; i++) { todayKey = () => '2031-01-' + i; const e = eventNow(); if (!TOWN_EVENTS.includes(e)) bad++; if (e.id === prev) repeats++; if (e.rare) rare++; prev = e.id; seen.add(e.id); }
    out.bad = bad; out.repeats = repeats; out.rare = rare; out.seen = seen.size; out.histLen = state.progress.director.hist.length;
    // stable within a day, even if what you do changes
    todayKey = () => '2031-06-01'; const a = eventNow(); state.progress.totals.cropsHarvested = 99; const b = eventNow();
    out.stable = a.id === b.id;
    todayKey = real;
    return out;
  });
  Object.keys(r).filter(k => typeof r[k] === 'boolean').forEach(k => assert.ok(r[k], 'director: ' + k));
  assert.strictEqual(r.bad, 0); assert.ok(r.repeats < 30, 'the same event two days running is rare (a plain roll would repeat about 60 times in 720 days): ' + r.repeats);
  assert.ok(r.rare > 20 && r.rare < 110, 'rare events stay rare: ' + r.rare + ' of 720'); assert.strictEqual(r.seen, 12, 'every event still turns up');
  assert.ok(r.histLen <= 5, 'the history stays short');
};
