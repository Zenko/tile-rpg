// Stories (build 331): content/chapters.js is well formed, chapters open after Getting started, a step counts only what
// happens after it starts, visits and boss wins tick their steps, claims pay, and the last claim pays the reward.
module.exports = async (page, assert) => {
  // 1. the data: unique ids, known districts / roles / buildings / decorations / stats, every card has a speaker
  const bad = await page.evaluate(() => {
    const out = [], ids = new Set(), roles = new Set(Object.keys(CAST).concat('boss'));
    CHAPTERS.forEach(ch => {
      if (ids.has(ch.id)) out.push('duplicate id ' + ch.id); ids.add(ch.id);
      if (!['district', 'neighbour'].includes(ch.kind)) out.push(ch.id + ': kind');
      if (ch.kind === 'district' && !DISTRICTS[ch.district]) out.push(ch.id + ': district');
      if (ch.kind === 'neighbour' && (!CAST[ch.who] || typeof ch.opens !== 'function')) out.push(ch.id + ': who / opens');
      if (ch.reward && ch.reward.deco && !DECORATION_ITEMS.some(d => d.id === ch.reward.deco)) out.push(ch.id + ': deco ' + ch.reward.deco);
      if (ch.reward && ch.reward.card && !RARITY_ORDER.includes(ch.reward.card)) out.push(ch.id + ': card rarity');
      [].concat(...ch.steps.map(s => s.cards), ch.end || []).forEach(k => { if (!roles.has(k.who) || !k.text) out.push(ch.id + ': card who ' + k.who); if (k.who === 'boss' && ch.kind !== 'district') out.push(ch.id + ': boss outside a district'); });
      ch.steps.forEach((s, i) => {
        const n = s.need || {};
        if (!s.ask || !s.cards || !s.cards.length) out.push(`${ch.id}[${i}]: ask / cards`);
        if (n.visit && !INTERIORS[n.visit]) out.push(`${ch.id}[${i}]: visit ${n.visit}`);
        if (!n.stat && !n.visit && !n.boss) out.push(`${ch.id}[${i}]: need`);
        if (n.stat && !(n.stat in XP_PER_STAT) && n.stat !== 'steps') out.push(`${ch.id}[${i}]: stat ${n.stat} (not a known stat)`);
        if (typeof s.go === 'function') { try { s.go(); } catch (e) { out.push(`${ch.id}[${i}]: go throws ${e.message}`); } }
      });
    });
    return out;
  });
  assert.deepStrictEqual(bad, []);

  // 2. closed until Getting started is done; then the square's chapter is open and a neighbour's waits for a visit
  const r = await page.evaluate(() => {
    const sq = chapterDef('square'), baker = chapterDef('baker');
    state.progress.chapters = {}; state.progress.visited = {}; state.progress.totals.talks = 50;
    storyState().step = 0; const before = chapterOpen(sq);
    storyState().step = STORY_ARC_LEN; const after = chapterOpen(sq), bakerShut = chapterOpen(baker);
    noteVisit('bakery'); const bakerOpen = chapterOpen(baker);
    // step 1 counts talks from now on
    chapterStep(sq);
    const notYet = chapterReady(sq);
    bumpStat('talks', 3); const ready = chapterReady(sq);
    const peb = state.progress.pebbles; claimChapter('square'); const paid = state.progress.pebbles - peb;
    // step 2 is a visit: an old visit does not count, going in now does
    const visitBefore = chapterReady(sq); noteVisit('nook'); const visitAfter = chapterReady(sq); claimChapter('square');
    bumpStat('battlesWon', 2); claimChapter('square');
    // the boss step: another district's god does not count
    noteGodBeaten('market'); const wrongBoss = chapterReady(sq); noteGodBeaten('square'); const rightBoss = chapterReady(sq);
    prefs.cozy = true;   // no ending scene in the test: the reward lands at once
    const owned = state.ownedCards.length; claimChapter('square'); prefs.cozy = false;
    return { before, after, bakerShut, bakerOpen, notYet, ready, paid, visitBefore, visitAfter, wrongBoss, rightBoss,
      done: chapterRec(sq).done, gotCard: state.ownedCards.length - owned, doneStat: state.progress.totals.chaptersDone };
  });
  assert.deepStrictEqual(r, { before: false, after: true, bakerShut: false, bakerOpen: true, notYet: false, ready: true, paid: 6,
    visitBefore: false, visitAfter: true, wrongBoss: false, rightBoss: true, done: true, gotCard: 1, doneStat: 1 });

  // 3. Rewards → Stories lists them: the square finished, the market locked until it opens, the baker's story open
  await page.evaluate(() => { switchTab('quests'); switchRewardsSegment('stories'); });
  await page.waitForTimeout(250);
  const ui = await page.evaluate(() => ({
    cards: document.querySelectorAll('#storiesList .chapter-card').length,
    done: document.querySelectorAll('#storiesList .chapter-card.done').length,
    go: [...document.querySelectorAll('#storiesList [data-ch-go]')].map(b => b.dataset.chGo),
    visible: !document.getElementById('storiesView').classList.contains('hidden') }));
  assert.strictEqual(ui.cards, 8); assert.strictEqual(ui.done, 1); assert.ok(ui.visible); assert.ok(ui.go.includes('baker'), 'the baker\'s story has a Go button');

  // 4. a step's scene plays once, by itself (the HUD refresh runs chapterBeatCheck), when the screen is quiet; a neighbour's can
  //    play anywhere. After it, the next one waits (CHAPTER_SCENE_GAP_MS) so two scenes never run back to back.
  // (the finished chapter's XP may have opened a level-up sheet, which rightly holds every scene back: close it)
  await page.evaluate(() => { switchTab('town'); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); storyHoldUntil(0); state.progress.chapters.baker = undefined; state.progress.visited = { bakery: true }; chapterSceneAt = 0; if (storyCur) storyEnd(); storyHoldUntil(0); });
  // the reward card from step 2 opens on a timer and may land after that: keep closing sheets until the scene starts
  await page.waitForFunction(() => { document.querySelectorAll('.overlay:not(#sceneOverlay)').forEach(o => o.classList.add('hidden')); return !!storyCur; }, null, { timeout: 8000, polling: 100 });
  const played = await page.evaluate(() => { const on = !!storyCur, who = on ? document.getElementById('storyName').textContent : ''; if (storyCur) storyEnd(); return { on, who, beat: chapterRec(chapterDef('baker')).beat, again: (chapterBeatCheck(), !!storyCur) }; });
  assert.strictEqual(played.on, true); assert.strictEqual(played.beat, 0); assert.strictEqual(played.again, false);
  assert.strictEqual(played.who, await page.evaluate(() => CAST.baker.name));
};
