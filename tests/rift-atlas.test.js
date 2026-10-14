// js/rift-atlas.js: the Rift Map (Journal -> Rifts) collects every world you visit, pays for something new, gives a row's
// souvenir and Embers once when the row is full, keeps the recent worlds, and the souvenirs never appear in the shop.
module.exports = async (page, assert) => {
  await page.evaluate(() => { state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 400); state.progress.rifts = null; });
  const visit = (kind, fam, via) => page.evaluate(([kind, fam, via]) => {
    state.progress.pwEndedAt = 0; state.progress.puddleWorld = null; state.currentDistrict = 'square';
    const w = pwFamilize(pwNewWorld(kind), fam); w.origin = { district: 'square', x: null, y: null }; w.map = pwGenerate(w);
    state.progress.puddleWorld = w; pwApply(w); riftNoteEnter(w, via);
    return { kind: w.kind, biome: w.biome, shape: w.shape, family: w.family || null, name: w.name };
  }, [kind, fam, via]);
  const leave = (why, found) => page.evaluate(([why, found]) => { const w = pwActive(); for (let i = 0; i < found; i++) state.ownedCards.push('sprout'); pwLeave(why, true); return !!w; }, [why, found]);

  // ---- 1. one world: noted in every row it belongs to, paid for, logged ----
  const peb0 = await page.evaluate(() => state.progress.pebbles);
  const w1 = await visit('explore', null, 'puddle');
  const r1 = await page.evaluate(() => ({ seen: riftState().seen, visits: riftState().visits, log: riftState().log[0], peb: state.progress.pebbles, each: RIFT_NEW_PEBBLES }));
  assert.ok(r1.seen.kinds.explore && r1.seen.palettes[w1.biome] && r1.seen.shapes[w1.shape], 'kind, palette and shape all noted');
  assert.strictEqual(Object.keys(r1.seen.families).length, 0, 'a puddle world has no family');
  assert.strictEqual(r1.peb - peb0, r1.each * 3, 'three new things pay three times');
  assert.deepStrictEqual([r1.visits, r1.log.name, r1.log.via, r1.log.end], [1, w1.name, 'puddle', null], 'logged as an open visit');
  await leave('done', 2);
  const end = await page.evaluate(() => riftState().log[0]);
  assert.deepStrictEqual([end.end, end.found], ['done', 2], 'the way it ended and the cards found are kept');

  // ---- 2. the same world again pays nothing new ----
  const again = await page.evaluate(() => {
    const peb = state.progress.pebbles, w = Object.assign({}, riftState().log[0]);
    riftNoteEnter({ name: 'x', kind: 'explore', biome: w.biome, shape: null, family: null }, 'puddle'); riftNoteLeave({ name: 'x' }, 'left', 0);
    return state.progress.pebbles - peb;
  });
  assert.strictEqual(again, 0, 'nothing new, nothing paid');

  // ---- 3. a full row: four family portals -> the lotus souvenir and Embers, once ----
  // the other rows are marked done first: each visit's shape is random, so the shapes row could otherwise fill up here too
  const before = await page.evaluate(() => { const r = riftState(); RIFT_ROWS.forEach(row => { if (row.id !== 'families') r.done[row.id] = r.done[row.id] || Date.now(); });
    return { lotus: decorationInventoryCount('rift-lotus'), rows: state.progress.totals.riftRows || 0 }; });
  for (const f of ['grove', 'stone', 'tide', 'wind']) { await visit('explore', f, 'portal'); await leave('faded', 0); }
  const full = await page.evaluate(() => ({ lotus: decorationInventoryCount('rift-lotus'), rows: state.progress.totals.riftRows || 0, done: !!riftState().done.families,
    count: riftRowCount(RIFT_ROWS.find(r => r.id === 'families')) }));
  assert.deepStrictEqual([full.lotus - before.lotus, full.rows - before.rows, full.done], [1, 1, true], 'the family row pays its souvenir once');
  assert.deepStrictEqual(full.count, { have: 4, of: 4 }, '4 of 4 families');
  await visit('explore', 'grove', 'portal'); await leave('left', 0);
  assert.strictEqual(await page.evaluate(() => decorationInventoryCount('rift-lotus')), full.lotus, 'a finished row never pays again');

  // ---- 4. the log keeps only the newest RIFT_LOG_MAX ----
  for (let i = 0; i < 14; i++) { await visit('explore', null, 'puddle'); await leave('faded', 0); }
  assert.strictEqual(await page.evaluate(() => riftState().log.length), 12, 'the recent list is capped');

  // ---- 5. the page: Journal -> Rifts draws every row, found chips and the souvenirs ----
  await page.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('journal'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => switchJournalSegment('rifts'));
  const ui = await page.evaluate(() => ({ shown: !document.getElementById('riftView').classList.contains('hidden'), rows: document.querySelectorAll('#riftList .ra-row:not(.dr-card)').length,   // the Daily Rift card on top (js/daily-rift.js) is not a collection row
    got: document.querySelectorAll('#riftList .ra-chip.got').length, won: document.querySelectorAll('#riftList .ra-prize.won').length, recent: document.querySelectorAll('#riftList .ra-log li').length,
    text: document.getElementById('riftList').innerText }));
  assert.ok(ui.shown && ui.rows === 4, 'the Rifts page shows four rows');
  assert.ok(ui.got >= 6 && ui.won >= 1 && ui.recent === 12, 'found chips, the won souvenir and the recent worlds are drawn');
  assert.ok(/Family portals/.test(ui.text) && /4\/4/.test(ui.text), 'the family row reads 4/4');

  // ---- 6. souvenirs are never sold in the shop ----
  const shop = await page.evaluate(() => DECORATION_ITEMS.filter(i => i.rift).map(i => i.id));
  assert.strictEqual(shop.length, 4, 'four souvenirs exist');
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'workshop-and-starter.js'), 'utf8');
  assert.ok(/!item\.rift/.test(src), 'the shop list leaves rift souvenirs out');
  await page.evaluate(() => { state.progress.puddleWorld = null; state.currentDistrict = 'square'; switchTab('town'); renderTown(); });
};
