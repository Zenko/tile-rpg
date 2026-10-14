// js/daily-rift.js: one gold portal a day by the fountain; the world behind it is the same for everyone (made from the date);
// one try; all cards found ends it early; the result pays, goes in the board and closes the portal until tomorrow.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});
  await page.evaluate(() => {
    state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 400); state.progress.dailyRift = null; prefs.cozy = false;
    if (pwActive()) pwLeave('left', true);
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn);
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); renderTown();
  });

  // ---- 1. the same world for everyone: made from the date alone (map, name, family, hidden cards and where they are) ----
  const same = await page.evaluate(() => {
    const day = todayKey(), make = () => {
      const w = dailyRiftWorld(day); w.map = pwGenerate(w);
      const save = state.progress.puddleWorld; state.progress.puddleWorld = w; pwApply(w);
      const owned = state.ownedCards.slice(); if (owned.length % 2) state.ownedCards.push('sprout');   // a different collection must not change the cards
      const d = pwBuildData(); const items = d.items.map(i => i.x + ',' + i.y + ':' + i.cardId).join(' ');
      state.ownedCards = owned; state.progress.puddleWorld = save; pwApply(save); delete state.districtData.pw;
      return { name: w.name, family: w.family, biome: w.biome, rows: w.map.rows.join('/'), items, ms: w.endsAt - w.startedAt };
    };
    const a = make(), b = make(), other = dailyRiftWorld('2001-01-01');
    return { a, b, otherName: other.name + other.biome, spot1: dailyRiftSpot(day), spot2: dailyRiftSpot(day) };
  });
  assert.deepStrictEqual(same.a, same.b, 'two players on the same day get exactly the same world');
  assert.ok(same.a.family && same.a.items.split(' ').length === 6, 'a family world with six hidden cards');
  assert.strictEqual(same.a.ms, 4 * 60 * 1000, 'the same length for everyone');
  assert.deepStrictEqual(same.spot1, same.spot2, 'the gold portal stands in the same place all day');

  // ---- 2. the gold portal is drawn by the fountain; stepping on it goes in, once ----
  const drawn = await page.evaluate(() => { const s = dailyRiftSpot(todayKey()), el = document.querySelector('.ent.life-portal.daily'); return !!el && +el.dataset.x === s.x && +el.dataset.y === s.y; });
  assert.ok(drawn, 'drawn on its tile in the square');
  await page.evaluate(() => { const s = dailyRiftSpot(todayKey()); lifeStep(s.x, s.y); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  const inside = await page.evaluate(() => ({ d: state.currentDistrict, daily: pwActive() && pwActive().daily, entered: dailyRiftState().entered, stat: state.progress.totals.dailyRifts || 0, open: dailyRiftOpen() }));
  assert.ok(inside.d === 'pw' && inside.daily === await page.evaluate(() => todayKey()), 'in today\'s rift');
  assert.ok(inside.entered && !inside.open && inside.stat >= 1, 'one try: the portal is used up for today');

  // ---- 3. finding every card ends it early, and the result is kept and paid ----
  const peb0 = await page.evaluate(() => state.progress.pebbles);
  await page.evaluate(() => state.districtData.pw.items.forEach(i => { i.collected = true; }));
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'), null, 10000);
  const res = await page.evaluate(() => ({ st: dailyRiftState(), d: state.currentDistrict, peb: state.progress.pebbles, portal: !!document.querySelector('.ent.life-portal.daily'), rows: dailyRiftRows() }));
  assert.strictEqual(res.d, 'square', 'back in town');
  assert.ok(res.st.done && res.st.cards === 6 && res.st.of === 6 && res.st.ms > 0 && res.st.ms < 4 * 60 * 1000, 'six of six, with the time it took: ' + JSON.stringify(res.st));
  assert.strictEqual(res.peb - peb0, 6 * 2 + 6, 'two per card and a bonus for all of them');
  assert.ok(!res.portal, 'no gold portal until tomorrow');
  assert.ok(res.rows.length >= 1 && res.rows.some(r => r.me && r.cards === 6), 'your result is on the board (alone, with no cloud here)');

  // ---- 4. Journal -> Rifts shows today's card and the board ----
  await page.evaluate(() => { switchTab('journal'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => switchJournalSegment('rifts'));
  const ui = await page.evaluate(() => ({ card: !!document.querySelector('#riftList .dr-card'), me: !!document.querySelector('#riftList .dr-board li.me'), text: (document.querySelector('#riftList .dr-card') || {}).innerText || '' }));
  assert.ok(ui.card && ui.me && /6 of 6/.test(ui.text), "today's rift and your place on the board: " + ui.text);

  // ---- 5. a new day opens it again; Cozy mode keeps it shut ----
  const next = await page.evaluate(() => { state.progress.dailyRift.day = '2001-01-01'; const open = dailyRiftOpen(); prefs.cozy = true; const cozy = dailyRiftOpen(); prefs.cozy = false; return { open, cozy }; });
  assert.deepStrictEqual(next, { open: true, cozy: false }, 'opens again the next day, never in Cozy mode');
  await page.evaluate(() => { state.progress.dailyRift = null; switchTab('town'); renderTown(); });
};
