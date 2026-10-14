// js/puddle-still.js: the time-stop world. Everything is frozen, time only moves when you step (45 steps), motes are gathered by
// stepping on them, and when the steps run out or every mote is taken time thaws, the world lets you go and pays for the motes.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});
  const enter = async () => {
    await page.evaluate(() => { if (pwActive()) pwLeave('left', true); state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 400); state.progress.pwEndedAt = 0;
      state.currentDistrict = 'square'; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); pwEnter(null, null, 'still'); });
    await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  };

  // ---- 1. a stopped moment: motes, frozen folk, hanging rain and the drained colour ----
  await enter();
  const w1 = await page.evaluate(() => { const w = pwActive(), d = state.districtData.pw; return { kind: w.kind, steps: w.stepsLeft, motes: d.motes.length, moteEls: document.querySelectorAll('.ent.pw-mote').length,
    folk: document.querySelectorAll('.ent.pw-frozen').length, drops: document.querySelectorAll('.pw-still-air .sd').length, still: document.getElementById('townGrid').classList.contains('pw-still'),
    goal: (nextGoal() || {}).text, npcs: d.npcs.length }; });
  assert.strictEqual(w1.kind, 'still');
  assert.deepStrictEqual([w1.steps, w1.motes, w1.moteEls, w1.folk, w1.drops], [45, 10, 10, 4, 70], 'ten motes, four frozen folk, the rain: ' + JSON.stringify(w1));
  assert.ok(w1.still && w1.npcs === 0, 'the town view is stilled and nobody can be fought');
  assert.match(w1.goal, /^45 steps of stillness · 0\/10 motes$/, 'the goal pill counts the steps');

  // ---- 2. a step costs one step of stillness; stepping on a mote gathers it ----
  const s = await page.evaluate(() => {
    const d = state.districtData.pw, mo = d.motes[0], w = pwActive();
    let px = 1; while (d.motes.some(o => o.x === px && o.y === 1)) px++;   // a plain step, on a tile with no mote
    pwStep(px, 1); const afterPlain = w.stepsLeft;
    pwStep(mo.x, mo.y);
    return { afterPlain, after: w.stepsLeft, got: w.got, mote: mo.got, el: !!document.querySelector(`.ent.pw-mote[data-x="${mo.x}"][data-y="${mo.y}"]`), goal: nextGoal().text };
  });
  assert.deepStrictEqual([s.afterPlain, s.after, s.got, s.mote, s.el], [44, 43, 1, true, false], 'each step counts; a mote is taken and disappears');
  assert.match(s.goal, /43 steps of stillness · 1\/10/, 'the pill follows');

  // ---- 3. a reload in the middle carries on: same steps, same motes, still stilled ----
  const boot = await page.evaluate(() => { saveState(); flushSaveState(); loadState(); pwBoot(); renderTown(); const w = pwActive(); return { steps: w.stepsLeft, got: w.got, still: document.getElementById('townGrid').classList.contains('pw-still'), left: document.querySelectorAll('.ent.pw-mote').length }; });
  assert.deepStrictEqual(boot, { steps: 43, got: 1, still: true, left: 9 }, 'a reload mid-world carries on');

  // ---- 4. the last step: time thaws, the world lets her go, the motes are paid for ----
  const peb0 = await page.evaluate(() => state.progress.pebbles), m0 = await page.evaluate(() => state.progress.totals.stillMotes || 0);
  await page.evaluate(() => { const w = pwActive(), d = state.districtData.pw; let px = 1; while (d.motes.some(o => !o.got && o.x === px && o.y === 1)) px++; w.stepsLeft = 1; pwStep(px, 1); });
  const thaw = await page.evaluate(() => ({ thawing: !!pwActive().thawing, cls: document.getElementById('townGrid').classList.contains('pw-thaw') }));
  assert.ok(thaw.thawing && thaw.cls, 'time starts again');
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'), null, 10000);
  const out = await page.evaluate(() => ({ d: state.currentDistrict, cls: document.getElementById('townGrid').className, peb: state.progress.pebbles, motes: state.progress.totals.stillMotes || 0 }));
  assert.strictEqual(out.d, 'square', 'back in town');
  assert.ok(!/pw-still|pw-thaw/.test(out.cls), 'nothing stilled left behind: ' + out.cls);
  assert.strictEqual(out.peb - peb0, 2, 'two Embers for the one mote');
  assert.strictEqual(out.motes - m0, 1, 'counted');

  // ---- 5. every mote gathered ends it early with a win and a card ----
  await enter();
  const c0 = await page.evaluate(() => ({ cards: state.ownedCards.length, wins: state.progress.totals.puddleWins || 0, clears: state.progress.totals.stillClears || 0 }));
  await page.evaluate(() => { state.districtData.pw.motes.forEach(mo => pwStep(mo.x, mo.y)); });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'), null, 10000);
  await page.waitForTimeout(900);
  const c1 = await page.evaluate(() => ({ cards: state.ownedCards.length, wins: state.progress.totals.puddleWins || 0, clears: state.progress.totals.stillClears || 0 }));
  assert.deepStrictEqual([c1.cards - c0.cards, c1.wins - c0.wins, c1.clears - c0.clears], [1, 1, 1], 'a card, a win and a clear');

  // ---- 6. the Rift Map knows the new kind ----
  assert.ok(await page.evaluate(() => RIFT_ROWS[0].list().some(e => e.key === 'still' && e.label === 'Time-stop') && !!riftState().seen.kinds.still), 'listed and found in the Rift Map');
  await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
};
