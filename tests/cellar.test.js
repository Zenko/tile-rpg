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
  // the scene renders doors and clicking a non-fight door works through the real handler
  await page.evaluate(() => { const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; cellarNewRun(st); st.run.doors = [{ k: 'chest' }, { k: 'fight' }, { k: 'camp' }]; saveState(); openScene('cellar'); });
  await page.waitForTimeout(700);
  assert.strictEqual(await page.locator('.cl-door').count(), 3, 'three doors drawn');
  await page.locator('.cl-door.camp').click({ force: true }); await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => cellarState().floor), 1, 'the campfire advanced the floor');
};
