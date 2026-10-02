// The cellar Descent Map: doors, boons, hearts, runs and the legacy-save upgrade.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; st.clearedAt = null; st.inRun = false;
    cellarNewRun(st);
    const doors0 = st.run.doors.map(d => d.k);
    // every non-guardian floor offers three distinct doors including a fight
    let ok = true; for (let i = 0; i < 40; i++) { if (cellarIsGuardian(i)) continue; const d = cellarDoors(i, st.run).map(x => x.k); if (d.length !== 3 || new Set(d).size !== 3 || !d.includes('fight')) ok = false; }
    // guardian floors are a single door
    const g = cellarDoors(2, st.run).map(x => x.k);
    return { doors0, ok, g, hearts: st.run.hearts };
  });
  assert.strictEqual(r.doors0.length, 3); assert.ok(r.ok, 'doors are three distinct kinds with a fight'); assert.deepStrictEqual(r.g, ['boss']); assert.strictEqual(r.hearts, 3);
  // a chest / camp / shrine door advances the floor and records the best
  const adv = await page.evaluate(() => {
    const st = cellarState(); st.floor = 0; st.run = null; cellarNewRun(st);
    st.run.doors = [{ k: 'chest' }, { k: 'camp' }, { k: 'shrine' }]; st.run.hearts = 1;
    cellarOpenDoor(st, 1);   // campfire
    return { floor: st.floor, hearts: st.run.hearts, best: state.progress.cellarBest >= 1 };
  });
  assert.strictEqual(adv.floor, 1); assert.strictEqual(adv.hearts, 2); assert.ok(adv.best);
  // boons work in a cellar fight only
  const b = await page.evaluate(() => {
    const st = cellarState(); st.run.boons = ['skin', 'sharp'];
    const outside = skillBonus('startSpirit');
    inBattle = true; battle = { npc: { dungeon: { id: 'cellar' } } };
    const inside = { spirit: skillBonus('startSpirit') - outside, draw: skillBonus('startDraw') };
    inBattle = false; battle = null;
    return { outside, inside };
  });
  assert.strictEqual(b.inside.spirit, 2); assert.strictEqual(b.inside.draw, 1);
  // hearts: two losses leave one heart, the third ends the run (a run of three floors rests the cellar)
  const l = await page.evaluate(() => {
    const st = cellarState(); st.floor = 4; st.run = null; cellarNewRun(st);
    const fight = () => { battle = { npc: { dungeon: { id: 'cellar', district: state.currentDistrict, floor: 4, deep: true } } }; return dungeonLoss(); };
    const a = fight(), b2 = fight(), c = fight(); battle = null;
    return { a, b2, c, resting: st.resting, run: !!st.run };
  });
  assert.strictEqual(l.a.hearts, 2); assert.strictEqual(l.b2.hearts, 1); assert.ok(l.c.ended && l.resting && !l.run, 'the third loss ends the run and the cellar rests');
  // a short run costs no rest
  const s = await page.evaluate(() => { const st = cellarState(); st.resting = false; st.clearedAt = null; st.floor = 1; st.run = null; cellarNewRun(st); endCellarRun(st, 'test'); return { resting: st.resting, floor: st.floor }; });
  assert.deepStrictEqual(s, { resting: false, floor: 0 });
  // legacy save: mid-climb floor with no run gets one
  const leg = await page.evaluate(() => { const st = cellarState(); st.run = null; st.resting = false; st.clearedAt = null; st.floor = 2; return !!cellarRun(cellarState()); });
  assert.ok(leg, 'a mid-climb save gets a run');
  // with exploring off, the scene renders a plain row of doors and clicking a non-fight door works through the real handler
  await page.evaluate(() => { prefs.cellarFog = false; const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; cellarNewRun(st); st.run.doors = [{ k: 'chest' }, { k: 'fight' }, { k: 'camp' }]; saveState(); openScene('cellar'); });
  await page.waitForTimeout(700);
  assert.strictEqual(await page.locator('.cl-door').count(), 3, 'three doors drawn');
  await page.locator('.cl-door.camp').click({ force: true }); await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => cellarState().floor), 1, 'the campfire advanced the floor');
  // ----- fog of war -----
  const g = await page.evaluate(() => {
    prefs.cellarFog = true; const st = cellarState(); st.floor = 1; st.run = null; st.resting = false; cellarNewRun(st);
    let reach = true, sizes = [];
    for (let i = 0; i < 60; i++) { const run = { doors: cellarDoors(1 + (i % 3), st.run), hearts: 3, boons: [] }; const m = crawlGenerate(run, 1 + (i % 3)); if (!m) { reach = false; break; } sizes.push(m.cells.length);
      // every object reachable on foot from the start
      m.seen = Object.fromEntries(Object.keys(m.objs).map(k => [k, 1])); for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) m.seen[x + ',' + y] = 1;
      for (const k of Object.keys(m.objs)) { const [x, y] = k.split(',').map(Number); if (!crawlPath(m, x, y) && !(x === m.pos[0] && y === m.pos[1])) reach = false; } }
    return { reach, size: sizes[0] };
  });
  assert.ok(g.reach, 'every object is reachable'); assert.strictEqual(g.size, 49);
  const o = await page.evaluate(() => {
    const st = cellarState(); st.floor = 2; st.run = null; cellarNewRun(st); const run = cellarRun(st); run.doors = [{ k: 'chest' }, { k: 'fight' }, { k: 'camp' }];
    const m = crawlMap(run, 2); m.objs = {}; scene = { id: 'cellar', text: '' };
    const put = (x, y, k) => { m.objs[x + ',' + y] = { k }; };
    const peb0 = state.progress.pebbles; put(3, 5, 'barrel'); crawlInteract(st, run, 3, 5); const barrel = state.progress.pebbles - peb0 >= 1 && !m.objs['3,5'];
    put(2, 5, 'lock'); const lockedStop = crawlInteract(st, run, 2, 5); const lockKept = !!m.objs['2,5'];
    put(4, 5, 'key'); crawlInteract(st, run, 4, 5); const hasKey = m.key;
    const boons0 = run.boons.length, p1 = state.progress.pebbles; crawlInteract(st, run, 2, 5); const opened = !m.objs['2,5'] && !m.key && (run.boons.length > boons0 || state.progress.pebbles > p1);
    put(1, 5, 'rat'); crawlInteract(st, run, 1, 5); const dim = m.dim;
    put(5, 5, 'cap'); crawlInteract(st, run, 5, 5); const bright = m.bright;
    const radii = [crawlRadius(Object.assign({}, m, { dim: 0, bright: 0 })), crawlRadius(Object.assign({}, m, { dim: 5, bright: 0 })), crawlRadius(Object.assign({}, m, { dim: 0, bright: 5 }))];
    scene = null; return { barrel, lockedStop, lockKept, hasKey, opened, dim, bright, radii };
  });
  assert.ok(o.barrel, 'barrels pay Pebbles'); assert.ok(o.lockedStop && o.lockKept, 'the chest stays locked without the key'); assert.ok(o.hasKey && o.opened, 'the key opens the chest');
  assert.strictEqual(o.dim, 8); assert.strictEqual(o.bright, 10); assert.deepStrictEqual(o.radii, [2, 1, 3]);
  // the real scene: fog is drawn, walking to a door opens it, and Light the whole floor reveals everything
  await page.evaluate(() => { prefs.cellarFog = true; const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; st.clearedAt = null; cellarNewRun(st); const run = cellarRun(st); run.doors = [{ k: 'camp' }, { k: 'chest' }, { k: 'shrine' }]; run.map = null; saveState(); openScene('cellar'); });
  await page.waitForTimeout(800);
  assert.strictEqual(await page.locator('.cl-cell').count(), 49, 'a 7x7 grid is drawn');
  assert.ok(await page.locator('.cl-cell.fog').count() > 20, 'most of the floor starts in the dark');
  await page.locator('.cl-light').click({ force: true }); await page.waitForTimeout(400);
  assert.strictEqual(await page.locator('.cl-cell.fog').count(), 0, 'lighting the floor reveals it all');
  // clear barrels, rats and the rest from the way so the walk is not (correctly) interrupted
  await page.evaluate(() => { const m = cellarRun(cellarState()).map; Object.keys(m.objs).forEach(k => { if (m.objs[k].k !== 'door') delete m.objs[k]; }); });
  const door = await page.evaluate(() => { const m = cellarRun(cellarState()).map; return Object.keys(m.objs).filter(k => m.objs[k].k === 'door' && cellarRun(cellarState()).doors[m.objs[k].i].k === 'camp')[0]; });
  await page.locator(`[data-act="cell:${door}"]`).click({ force: true });
  await page.waitForFunction(() => cellarState().floor === 1, null, { timeout: 15000 });
  assert.strictEqual(await page.evaluate(() => cellarState().floor), 1, 'walking onto the campfire door advanced the floor');
  assert.ok(await page.evaluate(() => cellarRun(cellarState()).map === null || cellarRun(cellarState()).map.floor === 1), 'a new floor gets a new map');
};
