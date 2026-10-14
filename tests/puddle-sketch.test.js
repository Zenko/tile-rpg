// js/puddle-sketch.js: the Sketchbook world. Five sketch stones each ask for a shape; the shape glows for a moment and you draw
// it from memory in one stroke. A shape recogniser grades the stroke (1-3 stars); a pass inks the stone, the page fills with
// colour, and when every stone is drawn the world lets you go with Embers for the stars and a card.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});
  const enter = async () => {
    await page.evaluate(() => { if (pwActive()) pwLeave('left', true); state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 400); state.progress.pwEndedAt = 0;
      state.currentDistrict = 'square'; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); pwEnter(null, null, 'sketch'); });
    await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  };

  // ---- 1. the recogniser: every template knows itself, a wobbly hand still passes, lines and scribbles do not ----
  const rec = await page.evaluate(() => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = {};
    Object.keys(SK_SHAPES).forEach(k => {
      const clean = skGrade(skDensify(skShapePoints(k)), k);
      const wobbly = skResample(skDensify(skShapePoints(k)), 120).map(p => ({ x: p.x * 3 + (rnd() - 0.5) * 6, y: p.y * 3 + (rnd() - 0.5) * 6 }));
      out[k] = { clean: clean.ok && clean.stars === 3, wobbly: skGrade(wobbly, k).ok };
    });
    const line = Array.from({ length: 40 }, (_, i) => ({ x: i * 5, y: i * 2 }));
    const dot = [{ x: 1, y: 1 }, { x: 2, y: 1 }];
    return { out, line: skGrade(line, 'circle').ok, dot: skGrade(dot, 'circle').ok, wrong: skGrade(skDensify(skShapePoints('square')), 'circle') };
  });
  Object.entries(rec.out).forEach(([k, r]) => assert.ok(r.clean && r.wobbly, `${k} is recognised, clean and wobbly: ` + JSON.stringify(r)));
  assert.ok(!rec.line && !rec.dot, 'a straight line and a dot are not a circle');
  assert.ok(!rec.wrong.ok && rec.wrong.looksLike === 'square', 'a square is not a circle, and it says what it looks like');

  // ---- 2. a sketchbook: five stones, a paper veil, the goal pill ----
  await enter();
  const w1 = await page.evaluate(() => { const w = pwActive(), d = state.districtData.pw; return { kind: w.kind, stones: d.stones.length, shapes: new Set(d.stones.map(s => s.shape)).size,
    els: document.querySelectorAll('.ent.pw-sketch-stone').length, paper: document.getElementById('townGrid').classList.contains('pw-sketch'), goal: (nextGoal() || {}).text, npcs: d.npcs.length }; });
  assert.strictEqual(w1.kind, 'sketch');
  assert.deepStrictEqual([w1.stones, w1.shapes, w1.els], [5, 5, 5], 'five stones, five different shapes');
  assert.ok(w1.paper && w1.npcs === 0, 'the page is blank paper and nobody can be fought');
  assert.strictEqual(w1.goal, '0/5 sketches · 0 ★');

  // ---- 3. tap a stone, draw a circle with the mouse: the stone is inked and pays its stars ----
  const peb0 = await page.evaluate(() => { const s = state.districtData.pw.stones[0]; s.shape = 'circle'; state.playerPos = { x: s.x, y: s.y + 1 }; window.__s = s; return state.progress.pebbles; });
  await page.evaluate(() => PW_KINDS.sketch.tap(pwActive(), window.__s.x, window.__s.y));
  assert.ok(await page.evaluate(() => !document.getElementById('skSheet').classList.contains('hidden') && /full moon/.test(document.querySelector('.sk-ask').textContent)), 'the drawing sheet asks for the shape');
  // a scribble first: refused, the stone stays blank
  let box = await page.locator('.sk-canvas').boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + 20 + i * 15, box.y + 20 + (i % 2) * 40);
  await page.mouse.up();
  const bad = await page.evaluate(() => ({ msg: document.querySelector('.sk-msg').textContent, done: window.__s.done }));
  assert.ok(!bad.done && /Try again/.test(bad.msg), 'a scribble is refused: ' + bad.msg);
  // then a fair circle
  box = await page.locator('.sk-canvas').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * 0.35;
  await page.mouse.move(cx + r, cy); await page.mouse.down();
  for (let i = 1; i <= 40; i++) { const a = i / 40 * Math.PI * 2; await page.mouse.move(cx + r * Math.cos(a) * (1 + 0.04 * Math.sin(5 * a)), cy + r * Math.sin(a)); }
  await page.mouse.up();
  const good = await page.evaluate(() => ({ done: window.__s.done, stars: window.__s.stars, path: (window.__s.path || []).length, w: pwActive().stars }));
  assert.ok(good.done && good.stars >= 2 && good.path > 10 && good.w === good.stars, 'the circle inks the stone: ' + JSON.stringify(good));
  await until(() => document.getElementById('skSheet').classList.contains('hidden') && document.querySelector('.ent.pw-sketch-stone.done svg path'));
  const after = await page.evaluate(() => ({ peb: state.progress.pebbles, inked: document.querySelectorAll('.ent.pw-sketch-stone.done').length, veil: getComputedStyle(document.getElementById('townGrid')).getPropertyValue('--sk-done').trim(), goal: nextGoal().text }));
  assert.ok(after.peb - peb0 >= good.stars, 'the stars are paid');
  assert.deepStrictEqual([after.inked, after.veil], [1, '0.2'], 'one inked stone on the map, a fifth of the colour back');
  assert.match(after.goal, /^1\/5 sketches · [23] ★$/);

  // ---- 4. a reload keeps the drawings ----
  const boot = await page.evaluate(() => { saveState(); flushSaveState(); loadState(); pwBoot(); renderTown(); const d = state.districtData.pw; return { done: d.stones.filter(s => s.done).length, path: !!d.stones[0].path, inked: document.querySelectorAll('.ent.pw-sketch-stone.done svg path').length, paper: document.getElementById('townGrid').classList.contains('pw-sketch') }; });
  assert.deepStrictEqual(boot, { done: 1, path: true, inked: 1, paper: true }, 'a reload keeps the drawing');

  // ---- 5. the rest drawn (by the recogniser's own templates): the world lets you go with a card ----
  const c0 = await page.evaluate(() => ({ cards: state.ownedCards.length, wins: state.progress.totals.puddleWins || 0, clears: state.progress.totals.sketchClears || 0 }));
  await page.evaluate(() => { const w = pwActive(); state.districtData.pw.stones.filter(s => !s.done).forEach(s => { skOpenStone(w, s); skOpen.points = skDensify(skShapePoints(s.shape)); skJudge(); }); });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'), null, 12000);
  await page.waitForTimeout(900);
  const c1 = await page.evaluate(() => ({ cards: state.ownedCards.length, wins: state.progress.totals.puddleWins || 0, clears: state.progress.totals.sketchClears || 0, cls: document.getElementById('townGrid').className, sheet: !!document.querySelector('#skSheet:not(.hidden)') }));
  assert.deepStrictEqual([c1.cards - c0.cards, c1.wins - c0.wins, c1.clears - c0.clears], [1, 1, 1], 'a card, a win and a clear');
  assert.ok(!/pw-sketch/.test(c1.cls) && !c1.sheet, 'no paper or sheet left behind');

  // ---- 6. the Rift Map knows the new kind ----
  assert.ok(await page.evaluate(() => RIFT_ROWS[0].list().some(e => e.key === 'sketch' && e.label === 'Sketchbook') && !!riftState().seen.kinds.sketch), 'listed and found in the Rift Map');
  await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
};
