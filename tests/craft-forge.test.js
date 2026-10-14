// js/craft-forge.js + js/shop-economy.js (build 265): the forge (three timed hammer strikes grade a craft and scale its fail and
// skill chances) and the hot streak (crafts that work heat the forge; at full heat the next craft is a Masterwork that cannot
// crack). Also: a splashed puddle is a way in half the time.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 6000 }).catch(() => {});
  const setup = () => page.evaluate(() => {
    state.companion = null; state.progress.craftMeter = 0; state.progress.craftHeat = 0; state.progress.craftHeatAt = 0;
    const commons = CARD_POOL.filter(c => c.rarity === 'common' && !c.spell && !c.exclusive && !c.crafted).slice(0, 8);
    state.ownedCards = []; commons.forEach(c => state.ownedCards.push(c.id, c.id, c.id, c.id)); state.deck = [];
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    return commons.map(c => c.id);
  });
  const seq = 'list => { let i = 0; return () => (i < list.length ? list[i++] : 0.99); }';

  // ---- 1. grades: three strikes' points pick a grade; a better grade means fewer fails and more skills ----
  const g = await page.evaluate(() => {
    state.companion = null;
    const o = id => craftOdds('refine', 'rare', id);
    return { grades: [6, 5, 4, 3, 2, 1, 0].map(n => forgeGrade(n).id), flawless: o('flawless'), clean: o('clean'), rough: o('rough'), botched: o('botched'), plain: o(), base: { fail: craftFailChance('refine', 'rare'), skill: craftSkillChance('refine', 'rare') } };
  });
  assert.deepStrictEqual(g.grades, ['flawless', 'clean', 'clean', 'rough', 'rough', 'botched', 'botched']);
  assert.ok(g.flawless.fail < g.clean.fail && g.clean.fail < g.rough.fail && g.rough.fail < g.botched.fail, 'fails fall with the grade');
  assert.ok(g.flawless.skill > g.clean.skill && g.clean.skill > g.rough.skill && g.rough.skill > g.botched.skill, 'skills rise with the grade');
  assert.deepStrictEqual([g.rough.fail, g.rough.skill], [g.base.fail, g.base.skill], 'Rough is the plain chances');
  assert.deepStrictEqual([g.plain.fail, g.plain.skill], [g.base.fail, g.base.skill], 'and so is no grade at all');

  // ---- 2. the Refine button opens the forge; three strikes in the core forge it Flawless, then the card is crafted ----
  const ids = await setup();
  await page.evaluate(id => { switchTab('collection'); setCardsView('craft'); craftMode = 'refine'; refineOpenId = id; renderCraft(); }, ids[0]);
  const c0 = await page.evaluate(() => state.progress.crafted + (state.progress.totals.craftFails || 0));
  await page.click('#craftView button[data-refine]');
  const open = await page.evaluate(() => ({ shown: !document.getElementById('forgeSheet').classList.contains('hidden'), band: parseFloat(document.querySelector('.fg-band').style.width), marks: document.querySelectorAll('.fg-marks span').length }));
  assert.ok(open.shown && open.marks === 3, 'the forge opens with three strikes to make');
  assert.ok(Math.abs(open.band - 26) < 0.01, 'common iron has the widest glow: ' + open.band);
  // the spark really moves
  const p1 = await page.evaluate(() => document.querySelector('.fg-spark').style.left); await page.waitForTimeout(150);
  assert.notStrictEqual(await page.evaluate(() => document.querySelector('.fg-spark').style.left), p1, 'the spark slides along the iron');
  const marks = await page.evaluate(() => [forgeStrike(forgeRun.centre), forgeStrike(forgeRun.centre), forgeStrike(forgeRun.centre)]);
  assert.deepStrictEqual(marks, ['perfect', 'perfect', 'perfect']);
  assert.match(await page.evaluate(() => document.querySelector('.fg-msg').textContent), /Flawless!.*→.*→/, 'it says what the grade did to the chances');
  await until(() => document.getElementById('forgeSheet').classList.contains('hidden'));
  const after = await page.evaluate(() => ({ made: state.progress.crafted + (state.progress.totals.craftFails || 0), heat: craftHeat(), flawless: state.progress.totals.forgeFlawless || 0, fails: state.progress.totals.craftFails || 0 }));
  assert.strictEqual(after.made - c0, 1, 'the craft went ahead');
  assert.ok(after.fails > 0 || (after.heat === 2 && after.flawless === 1), 'a Flawless craft heats the forge twice: ' + JSON.stringify(after));

  // ---- 3. strikes outside the glow are misses; Skip forges at the plain chances; the X cancels the craft ----
  const miss = await page.evaluate(() => { forgeOpen({ kind: 'refine', rarity: 'mythic' }, id => { window.__grade = id; }); const far = forgeRun.centre > 0.5 ? 0 : 1, w = forgeRun.band;
    return { w, m: [forgeStrike(far), forgeStrike(forgeRun.centre + w * 0.45), forgeStrike(far)] }; });
  assert.ok(Math.abs(miss.w - 0.12) < 1e-9, 'mythic iron has the narrowest glow');
  assert.deepStrictEqual(miss.m, ['miss', 'good', 'miss']);
  await until(() => window.__grade);
  assert.strictEqual(await page.evaluate(() => window.__grade), 'botched', 'one good strike of three is Botched');
  await page.evaluate(() => { window.__grade = null; forgeOpen({ kind: 'trade', rarity: 'rare' }, id => { window.__grade = id; }); document.querySelector('.fg-skip').click(); });
  await until(() => window.__grade);
  assert.strictEqual(await page.evaluate(() => window.__grade), 'rough', 'Skip is Rough');
  const cancel = await page.evaluate(() => { window.__grade = null; forgeOpen({ kind: 'refine', rarity: 'common' }, id => { window.__grade = id; }); document.querySelector('.fg-x').click(); return document.getElementById('forgeSheet').classList.contains('hidden'); });
  await page.waitForTimeout(1300);
  assert.ok(cancel && (await page.evaluate(() => window.__grade)) === null, 'closing the forge cancels the craft');

  // ---- 4. the hot streak: full heat makes a Masterwork that cannot crack, doubles the skill chance, then the forge is cold ----
  await setup();
  const mw = await page.evaluate(([ids, seq]) => {
    setCraftHeat(CRAFT.heatMax);
    const odds = craftOdds('refine', 'common'), x0 = state.progress.totals.masterworks || 0;
    const r = refineCard(ids[1], 'p', eval(seq)([0.0, 0.99, 0.99]));   // a roll that would crack it
    return { odds, r, heat: craftHeat(), mw: (state.progress.totals.masterworks || 0) - x0, skill: craftSkillChance('refine', 'common') };
  }, [ids, seq]);
  assert.ok(mw.odds.master && mw.odds.fail === 0, 'full heat: a Masterwork, no fail chance');
  assert.ok(Math.abs(mw.odds.skill - Math.min(0.9, mw.skill * 2)) < 1e-9, 'and double the skill chance');
  assert.ok(mw.r && !mw.r.failed && mw.r.master, 'the roll that would crack it holds: ' + JSON.stringify(mw.r));
  assert.deepStrictEqual([mw.heat, mw.mw], [0, 1], 'the forge starts cold again, and the Masterwork is counted');

  // ---- 5. a crack cools the forge; it also cools by itself over time; a plain success heats it by one ----
  const cool = await page.evaluate(([ids, seq]) => {
    setCraftHeat(3); refineCard(ids[2], 'p', eval(seq)([0.0])); const afterFail = craftHeat();
    setCraftHeat(3); state.progress.craftHeatAt = Date.now() - CRAFT.heatCoolMs * 2.5; const cooled = craftHeat();
    setCraftHeat(1); refineCard(ids[3], 'p', eval(seq)([0.99, 0.99])); const plain = craftHeat();
    return { afterFail, cooled, plain };
  }, [ids, seq]);
  assert.deepStrictEqual(cool, { afterFail: 0, cooled: 1, plain: 2 }, 'cracks and time cool it, a success heats it');

  // ---- 6. the Workshop shows the streak and the forge's promise ----
  const ui = await page.evaluate(() => { setCraftHeat(CRAFT.heatMax - 1); craftMode = 'refine'; renderCraft();
    const a = { lit: document.querySelectorAll('#craftView .cr-flames i.on').length, note: !!document.querySelector('#craftView .cr-forgenote'), ready: !!document.querySelector('#craftView .cr-heat.ready') };
    setCraftHeat(CRAFT.heatMax); renderCraft();
    return { a, ready: !!document.querySelector('#craftView .cr-heat.ready'), fail: document.querySelector('#craftView .cr-meter.fail b').textContent };
  });
  assert.deepStrictEqual(ui, { a: { lit: 4, note: true, ready: false }, ready: true, fail: '0%' }, 'four flames, then a Masterwork ready with no fail chance');

  // ---- 7. puddles: half of all splashed puddles are a way in ----
  assert.strictEqual(await page.evaluate(() => PW_CHANCE), 0.5);
  await page.evaluate(() => { setCraftHeat(0); switchTab('town'); });
};
