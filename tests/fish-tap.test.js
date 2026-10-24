// Tapping a fish you can see opens the fishing screen, even after the fishing spots reshuffle (js/town-render-weather.js fishHintsSync),
// and tapping plain water over and over skips stones for fun but only counts (stat, XP) once every 8 s (js/town-life.js lifeSkip).
module.exports = async (page, assert) => {
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { switchTab('town'); if (state.currentDistrict !== 'harbor') travelToDistrictNow('harbor'); const d = ensureDistrictData('harbor'); d.npcs.length = 0; d.boss = null; d.items = []; d.spirits = []; d.bugs = []; renderTown(); });
  const drawn = () => ev(() => [...document.querySelectorAll('.fish-hint')].map(h => { const t = h.closest('[data-x]'); return t.dataset.x + ',' + t.dataset.y; }).sort().join(' '));
  const real = () => ev(() => Object.keys(getMap('harbor').fishTiles).sort().join(' '));
  assert.ok((await real()).length > 0, 'the harbour has fish');
  assert.strictEqual(await drawn(), await real(), 'a fish is drawn on every fishable tile and nowhere else');

  // the spots reshuffle (the next 10 minute bucket): the drawn fish follow without leaving the district
  await ev(() => { const m = getMap('harbor'); const water = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === '~' && bankFor(m, x, y)) water.push(x + ',' + y);
    const old = Object.keys(m.fishTiles); m.fishTiles = {}; water.filter(k => !old.includes(k)).slice(0, 3).forEach(k => { m.fishTiles[k] = true; }); m.fishBucket = -1; renderTown(); });
  assert.strictEqual(await drawn(), await real(), 'after a reshuffle the fish are drawn where the fish really are');

  // stand next to one and tap the fish you can see
  const spot = await ev(() => { const m = getMap('harbor'), k = Object.keys(m.fishTiles)[0], [x, y] = k.split(',').map(Number), b = bankFor(m, x, y); state.playerPos = { x: b.x, y: b.y }; renderTown(); return { x, y }; });
  await page.waitForTimeout(300);
  const box = await ev(s => { const h = document.querySelector(`[data-x="${s.x}"][data-y="${s.y}"] .fish-hint`), r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, spot);
  await page.mouse.click(box.x, box.y);
  await page.waitForFunction(() => !!fishing && !document.getElementById('fishOverlay').classList.contains('hidden'), null, { timeout: 6000 });
  await ev(() => closeFishing());

  // tapping plain water again and again: a skipped stone each time, but it only counts once
  const n0 = await ev(() => state.progress.totals.stonesSkipped || 0);
  await ev(s => { lifeState().lastSkipAt = 0; for (let i = 0; i < 10; i++) lifeSkip(s.x, s.y); }, spot);
  assert.strictEqual(await ev(() => state.progress.totals.stonesSkipped || 0), n0 + 1, 'ten quick skips count as one');
};
