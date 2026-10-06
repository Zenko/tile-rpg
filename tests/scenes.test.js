// Story scenes (js/scenes.js): the dream-in opening for a new save, Wren's beat for each step, the goal pill and the gold diamond.
module.exports = async (page, assert) => {
  await page.evaluate(() => { const st = document.getElementById('testHideOverlays'); if (st) st.remove(); });   // this test drives an overlay

  // ---- data: one beat per step, every card has a speaker and text, every choice has a reply ----
  const data = await page.evaluate(() => ({
    beats: STORY_BEATS.length, steps: STORY.length,
    bad: STORY_BEATS.flatMap((b, i) => (!b.ask || !b.cards.length ? [`beat ${i} has no ask or cards`] : [])
      .concat(b.cards.flatMap((c, j) => (!c.who || !c.text ? [`beat ${i} card ${j} has no speaker or text`] : [])
        .concat((c.choices || []).filter(ch => !ch.label || !ch.reply).map(() => `beat ${i} card ${j} has a choice with no reply`))))),
    introCards: STORY_INTRO.cards.length
  }));
  assert.strictEqual(data.beats, data.steps, 'STORY_BEATS must line up with STORY, one beat per step');
  assert.deepStrictEqual(data.bad, []);
  assert.ok(data.introCards >= 3);

  // ---- a brand-new save: the opening plays, the pips and text show, a tap advances, Skip ends it and it never repeats ----
  await page.evaluate(() => { while (storyCur) storyEnd(); const s = state.progress; s.scenes = { seen: {} }; s.story = { step: 0, notified: -1, beat: -1 }; s.totals.steps = 0; state.wins = 0; delete s.lastGift; storyHoldUntil(0); storyIntroCheck(); });
  await page.waitForTimeout(200);
  let open = await page.evaluate(() => ({ hidden: document.getElementById('sceneOverlay').classList.contains('hidden'), style: document.getElementById('sceneOverlay').dataset.style, pips: document.querySelectorAll('#storyPips i').length, text: document.getElementById('storyText').textContent, body: document.body.classList.contains('in-story') }));
  assert.strictEqual(open.hidden, false, 'a new save should open with the dream-in scene');
  assert.strictEqual(open.style, 'dream');
  assert.strictEqual(open.pips, data.introCards);
  assert.ok(/eyes close/i.test(open.text), 'first card text: ' + open.text);
  assert.ok(open.body);
  await page.click('#storyStage'); await page.waitForTimeout(150);
  assert.ok(/fountain/i.test(await page.textContent('#storyText')), 'a tap moves to the next card');
  await page.click('#storySkip'); await page.waitForTimeout(150);
  open = await page.evaluate(() => ({ hidden: document.getElementById('sceneOverlay').classList.contains('hidden'), seen: storySeen('intro'), body: document.body.classList.contains('in-story') }));
  assert.ok(open.hidden && open.seen && !open.body, 'Skip closes the scene and remembers it');
  await page.evaluate(() => storyIntroCheck()); await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => document.getElementById('sceneOverlay').classList.contains('hidden')), 'the opening plays once');

  // ---- an older save is marked as seen and never sent back to the dream ----
  await page.evaluate(() => { state.progress.scenes = { seen: {} }; state.progress.totals.steps = 500; storyIntroCheck(); });
  assert.ok(await page.evaluate(() => storySeen('intro') && !storyCur), 'a save with progress skips the opening silently');

  // ---- Wren's first beat plays once, a choice only adds a reply, and the goal pill carries her ask ----
  await page.evaluate(() => { state.progress.totals.steps = 0; state.progress.story = { step: 0, notified: -1, beat: -1 }; storyHoldUntil(0); });
  await page.evaluate(() => { storyBeatCheck(); });
  await page.waitForTimeout(150);
  let talk = await page.evaluate(() => ({ style: document.getElementById('sceneOverlay').dataset.style, who: document.getElementById('storyName').textContent, beat: storyState().beat }));
  assert.strictEqual(talk.style, 'talk'); assert.strictEqual(talk.who, 'Wren'); assert.strictEqual(talk.beat, 0, 'the beat is remembered as soon as it plays');
  await page.click('#storyStage'); await page.waitForTimeout(100);   // finishes typing the first card
  await page.click('#storyStage'); await page.waitForTimeout(100);   // next card (the one with choices)
  await page.waitForSelector('.scn-opt', { timeout: 3000 });
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.scn-opt').length), 3, 'three questions to ask');
  await page.click('.scn-opt >> nth=2'); await page.waitForTimeout(150);
  await page.waitForFunction(() => /doors here only lead deeper/i.test(document.getElementById('storyText').textContent), null, { timeout: 3000 });
  await page.evaluate(() => { while (storyCur) storyEnd(); });
  assert.ok(await page.evaluate(() => { const g = storyGoal(); return g.first && /Wren: wander/.test(g.text); }), 'the pill carries the ask');
  await page.evaluate(() => { storyHoldUntil(0); storyBeatCheck(); });
  assert.ok(await page.evaluate(() => !storyCur), 'a beat never plays twice');

  // ---- the pill leads during the first chain, and a tap with nothing to go to replays the beat ----
  await page.evaluate(() => { refreshGoalChip(true); });
  assert.ok(/Wren: wander/.test(await page.textContent('#goalText')));
  await page.click('#goalChip'); await page.waitForTimeout(150);
  assert.ok(await page.evaluate(() => !!storyCur && storyCur.replay), 'tapping the pill replays her words');
  await page.evaluate(() => { while (storyCur) storyEnd(); });

  // ---- the gold diamond marks the building for the current step, only in its district, and not in Cozy mode ----
  const mark = await page.evaluate(() => {
    const out = {}; state.progress.story.step = 4; state.currentDistrict = 'square';
    storyMark(); out.cottage = !!document.querySelector('.bld[data-building="cottage"].story-target');
    out.others = document.querySelectorAll('.bld.story-target').length;
    prefs.cozy = true; storyMark(); out.cozy = document.querySelectorAll('.bld.story-target').length; prefs.cozy = false;
    state.progress.story.step = 5; storyMark(); out.bakery = !!document.querySelector('.bld[data-building="bakery"].story-target') && !document.querySelector('.bld[data-building="cottage"].story-target');
    state.progress.story.step = 0; storyMark(); out.none = document.querySelectorAll('.bld.story-target').length;
    return out;
  });
  assert.ok(mark.cottage && mark.others === 1, 'the cottage gets the diamond at step 5: ' + JSON.stringify(mark));
  assert.strictEqual(mark.cozy, 0, 'Cozy mode removes it'); assert.ok(mark.bakery); assert.strictEqual(mark.none, 0);

  // ---- nothing talks over a battle, another sheet or another tab ----
  const guards = await page.evaluate(() => {
    const out = {}; const s = state.progress.story; s.step = 1; s.beat = 0; storyHoldUntil(0);
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));   // a first-time tip can pop up late on a slow runner and would count as another sheet
    document.getElementById('talkOverlay').classList.remove('hidden'); storyBeatCheck(); out.sheet = !storyCur && s.beat === 0;
    document.getElementById('talkOverlay').classList.add('hidden');
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    currentTab = 'journal'; storyBeatCheck(); out.tab = !storyCur && s.beat === 0; currentTab = 'town';
    prefs.cozy = true; storyBeatCheck(); out.cozy = !storyCur && s.beat === 0; prefs.cozy = false;
    storyBeatCheck(); out.plays = !!storyCur && s.beat === 1;
    while (storyCur) storyEnd(); return out;
  });
  assert.deepStrictEqual(guards, { sheet: true, tab: true, cozy: true, plays: true });

  // ---- claiming a step schedules the next beat, and the first tip waits for Wren ----
  const flow = await page.evaluate(() => {
    const out = {}; const s = state.progress.story; s.step = 0; s.beat = 0; state.progress.totals.steps = 40;
    out.ready = storyReady(); claimStory(); out.step = s.step; out.held = Date.now() < storyHoldAt;
    s.step = 0; s.beat = -1; out.firstPending = storyFirstBeatPending(); s.beat = 0; out.afterPending = storyFirstBeatPending();
    return out;
  });
  assert.ok(flow.ready && flow.step === 1 && flow.held && flow.firstPending && !flow.afterPending, JSON.stringify(flow));
};
