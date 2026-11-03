/* ============================================================
   STORIES: A CHAPTER PER DISTRICT, A STORY PER NEIGHBOUR (build 331)
   The words and steps are all in content/chapters.js (CHAPTERS); this file only runs them.
   - When: after the first hour's path (STORY_ARC_LEN steps of STORY), a district's chapter opens with the district and a
     neighbour's story opens with its `opens(progress)` test (usually: you have been inside their building).
   - Steps: one at a time per chapter, several chapters side by side. A step counts only what happens after it starts: a
     `stat` step remembers the total when it began (base), a `visit` / `boss` step is ticked by chapterNoteVisit (from
     noteVisit, js/requests-friendship-rival.js) and chapterNoteBoss (from noteGodBeaten, js/summoning.js).
   - Scenes: a step's cards play once through the story runner (playStoryScene, js/scenes.js) when the screen is quiet: a
     district's in that district, a neighbour's anywhere but at most one every CHAPTER_NEIGHBOUR_GAP_MS. They wait for Wren's
     first hour and space themselves out with storyHoldUntil, so two scenes never land on top of each other. Cozy mode turns the scenes off (Rewards still lists them).
   - Claim: Rewards → Stories (claimChapter). The last claim plays the chapter's ending and pays its reward.
   Saved: state.progress.chapters = { id: { step, base, met, beat, notified, done } }. An unknown or extra id is ignored, so
   a chapter can be added or retired in content/ without touching saves.
   ============================================================ */
const CHAPTER_SCENE_GAP_MS = 4000;   // quiet time after a scene, a claim or a toast before the next chapter scene may play
const CHAPTER_NEIGHBOUR_GAP_MS = 90000;   // a neighbour's scene (which may play anywhere) waits this long after any chapter scene, so they trickle in
let chapterSceneAt = 0;

function chaptersState() { const p = state.progress; if (!p.chapters || typeof p.chapters !== 'object') p.chapters = {}; return p.chapters; }
function chapterDef(id) { return CHAPTERS.find(c => c.id === id) || null; }
function chapterRec(ch) {
  const all = chaptersState(); let c = all[ch.id];
  if (!c || typeof c !== 'object') c = all[ch.id] = { step: 0, base: null, met: false, beat: -1, notified: -1, done: false };
  if (typeof c.step !== 'number' || c.step < 0) c.step = 0;
  if (c.step >= ch.steps.length) c.done = true;
  return c;
}
function chapterFirstHourDone() { return typeof STORY_ARC_LEN === 'number' && storyState().step >= STORY_ARC_LEN; }
function chapterOpen(ch) {
  if (!chapterFirstHourDone()) return false;
  if (ch.kind === 'district') return !!DISTRICTS[ch.district] && districtUnlocked(ch.district);
  return typeof ch.opens === 'function' ? !!ch.opens(state.progress) : true;
}
function chapterStatNow(stat) { return (state.progress.totals && state.progress.totals[stat]) || 0; }
// The current step, started on first look: a stat step remembers where the total stood.
function chapterStep(ch) {
  const c = chapterRec(ch); if (c.done) return null;
  const st = ch.steps[c.step]; if (!st) return null;
  if (st.need && st.need.stat && typeof c.base !== 'number') { c.base = chapterStatNow(st.need.stat); saveState(); }
  return st;
}
// How far the current step has got: { have, need }. A visit or boss step is 0 or 1.
function chapterProgress(ch) {
  const c = chapterRec(ch), st = chapterStep(ch); if (!st) return { have: 0, need: 1 };
  const n = st.need || {};
  if (n.stat) return { have: Math.max(0, Math.min(n.n || 1, chapterStatNow(n.stat) - (c.base || 0))), need: n.n || 1 };
  return { have: c.met ? 1 : 0, need: 1 };
}
function chapterReady(ch) { if (!chapterOpen(ch)) return false; const pr = chapterProgress(ch); return !chapterRec(ch).done && pr.have >= pr.need; }

/* ---------- ticks from the rest of the game ---------- */
function chapterNoteVisit(buildingId) {
  if (typeof CHAPTERS === 'undefined') return;
  CHAPTERS.forEach(ch => { const st = chapterOpen(ch) && chapterStep(ch); if (st && st.need && st.need.visit === buildingId) { chapterRec(ch).met = true; saveState(); } });
}
function chapterNoteBoss(district) {
  if (typeof CHAPTERS === 'undefined') return;
  CHAPTERS.forEach(ch => { const st = ch.district === district && chapterOpen(ch) && chapterStep(ch); if (st && st.need && st.need.boss) { chapterRec(ch).met = true; saveState(); } });
}

/* ---------- speaking ---------- */
// A card's `who` is a CAST role, or 'boss' for the chapter's district god.
function chapterSpeaker(ch, who) {
  if (who === 'boss' && ch.district && DISTRICTS[ch.district]) return { name: DISTRICTS[ch.district].boss, icon: DISTRICTS[ch.district].bossIcon };
  const c = CAST[who] || CAST[ch.who] || CAST.guide;
  return { name: c.name, icon: c.icon };
}
function chapterScript(ch, cards) {
  return { id: null, style: 'talk', cards: (cards || []).map(k => { const s = chapterSpeaker(ch, k.who); return { who: s.name, icon: s.icon, text: k.text, choices: k.choices }; }) };
}
function chapterPlayStep(ch, i, replay) { const st = ch.steps[i]; return st ? playStoryScene(chapterScript(ch, st.cards), { replay: !!replay }) : Promise.resolve(false); }

// Called with checkStory() on every HUD refresh: at most one chapter scene, when nothing else is happening.
function chapterBeatCheck() {
  if (typeof CHAPTERS === 'undefined' || prefs.cozy || !chapterFirstHourDone() || storyBusy() || Date.now() < storyHoldAt) return;
  const open = CHAPTERS.filter(ch => chapterOpen(ch) && !chapterRec(ch).done);
  // a step just done: say so once (Rewards → Stories has the Claim button)
  const ready = open.find(ch => chapterReady(ch) && chapterRec(ch).notified !== chapterRec(ch).step);
  if (ready) { const c = chapterRec(ready); c.notified = c.step; saveState(); toast(words('stories.stepDone', { title: ready.title })); storyHoldUntil(CHAPTER_SCENE_GAP_MS); return; }
  const due = ch => chapterRec(ch).beat < chapterRec(ch).step;
  const ch = open.find(x => x.kind === 'district' && x.district === state.currentDistrict && due(x)) ||
    (Date.now() - chapterSceneAt > CHAPTER_NEIGHBOUR_GAP_MS ? open.find(x => x.kind === 'neighbour' && due(x)) : null);
  if (!ch) return;
  const c = chapterRec(ch), i = c.step; chapterStep(ch);
  c.beat = i; chapterSceneAt = Date.now(); saveState();
  chapterPlayStep(ch, i).then(ok => { storyHoldUntil(CHAPTER_SCENE_GAP_MS); if (ok) showTipOnce('stories'); });
}

/* ---------- claiming ---------- */
function claimChapter(id) {
  const ch = chapterDef(id); if (!ch || !chapterReady(ch)) return;
  const c = chapterRec(ch), st = ch.steps[c.step];
  c.step++; c.base = null; c.met = false;
  if (st.pebbles) { addPebbles(st.pebbles, 'story'); toast(words('stories.claimed', { n: st.pebbles, money: currencyName(st.pebbles) })); }
  logEvent(ch.icon, `${ch.title}: ${st.ask}.`);
  if (c.step >= ch.steps.length) chapterFinish(ch);
  saveState(); sfx('claim'); buzz(HAP.found);
  renderQuests(); checkAchievements();
  storyHoldUntil(CHAPTER_SCENE_GAP_MS);
}
function chapterFinish(ch) {
  const c = chapterRec(ch), r = ch.reward || {};
  c.done = true;
  bumpStat('chaptersDone', 1);
  logEvent(ch.icon, words('stories.finishedLog', { title: ch.title }));
  const pay = () => {
    if (r.pebbles) addPebbles(r.pebbles, 'story');
    if (r.deco && DECORATION_ITEMS.some(d => d.id === r.deco)) { state.decorationInventory[r.deco] = decorationInventoryCount(r.deco) + 1; const d = DECORATION_ITEMS.find(x => x.id === r.deco); toast(words('stories.decoGift', { icon: d.icon, name: d.name })); }
    if (r.card) { const cid = randomCardId(r.card); state.ownedCards.push(cid); bumpStat('cardsFound', 1); setTimeout(() => showCardReveal(cid, ch.title, true, words('stories.cardNote', { name: chapterSpeaker(ch, (ch.end && ch.end[0] && ch.end[0].who) || ch.who).name })), 300); }
    saveState(); updateHud(); renderQuests();
  };
  // the ending is said first (it waits for the Rewards sheet to be closed), then the reward lands
  if (ch.end && ch.end.length && !prefs.cozy) {
    switchTab('town');
    setTimeout(() => playStoryScene(chapterScript(ch, ch.end)).then(pay), 350);
  } else pay();
}

/* ---------- Rewards → Stories ---------- */
function chapterGo(ch) {
  const st = chapterStep(ch); if (!st) return;
  const t = typeof st.go === 'function' ? st.go() : st.go;
  const isPlace = t && (t.scene || t.travel || t.run || t.tab || t.map || t.menu);
  if (ch.kind === 'district' && !isPlace && state.currentDistrict !== ch.district) { journalGo({ travel: ch.district }); return; }
  journalGo(t || { tab: 'town' });
}
function chapterCardHtml(ch) {
  const c = chapterRec(ch), open = chapterOpen(ch), n = ch.steps.length;
  const where = ch.kind === 'district' ? DISTRICTS[ch.district].name : CAST[ch.who].name;
  if (!open) {
    const why = !chapterFirstHourDone() ? words('stories.lockedFirstHour') : ch.kind === 'district' ? words('stories.lockedDistrict', { place: where }) : words('stories.lockedNeighbour', { name: CAST[ch.who].name });
    return `<div class="story-card chapter-card locked"><div class="story-top"><span class="story-icon">🔒</span><span class="story-text"><small>${escapeHtml(where)}</small><b>${ch.kind === 'neighbour' ? '???' : escapeHtml(ch.title)}</b><span>${why}</span></span></div></div>`;
  }
  if (c.done) {
    return `<div class="story-card chapter-card done"><div class="story-top"><span class="story-icon">${ch.icon}</span><span class="story-text"><small>${escapeHtml(where)} · finished</small><b>${escapeHtml(ch.title)}</b></span><span class="q-count">✓</span></div>
      <div class="chapter-links"><button type="button" class="chapter-link" data-ch-end="${ch.id}">${words('stories.hearEnding')}</button></div></div>`;
  }
  const st = chapterStep(ch), pr = chapterProgress(ch), ready = pr.have >= pr.need;
  const count = pr.need > 1 ? ` · ${pr.have}/${pr.need}` : '';
  return `<div class="story-card chapter-card${ready ? ' ready' : ''}">
    <div class="story-top"><span class="story-icon">${ch.icon}</span><span class="story-text"><small>${escapeHtml(where)} · step ${c.step + 1} of ${n}</small><b>${escapeHtml(ch.title)}</b><span>${escapeHtml(st.ask)}${count}</span></span>
    ${ready ? `<button class="panel-action active" data-ch-claim="${ch.id}">Claim</button>` : `<button class="panel-action" data-ch-go="${ch.id}">Go</button>`}</div>
    <div class="q-bar"><div class="q-fill" style="width:${Math.round((c.step + pr.have / pr.need) / n * 100)}%"></div></div>
    <div class="chapter-links"><button type="button" class="chapter-link" data-ch-hear="${ch.id}">${words('stories.hearAgain')}</button></div></div>`;
}
function renderChapters() {
  const box = document.getElementById('storiesList'); if (!box || typeof CHAPTERS === 'undefined') return;
  const group = (kind, title, sub) => `<div class="section-title">${title}</div><div class="panel-desc">${sub}</div>` + CHAPTERS.filter(ch => ch.kind === kind).map(chapterCardHtml).join('');
  box.innerHTML = group('district', words('stories.districtTitle'), words('stories.districtSub')) +
                  group('neighbour', words('stories.neighbourTitle'), words('stories.neighbourSub'));
  onAll(box, '[data-ch-claim]', b => claimChapter(b.dataset.chClaim));
  onAll(box, '[data-ch-go]', b => { sfx('nav'); chapterGo(chapterDef(b.dataset.chGo)); });
  onAll(box, '[data-ch-hear]', b => { const ch = chapterDef(b.dataset.chHear); sfx('tap'); switchTab('town'); setTimeout(() => chapterPlayStep(ch, chapterRec(ch).step, true), 300); });
  onAll(box, '[data-ch-end]', b => { const ch = chapterDef(b.dataset.chEnd); sfx('tap'); switchTab('town'); setTimeout(() => playStoryScene(chapterScript(ch, ch.end), { replay: true }), 300); });
}
// For the goal pill (nextGoal, js/skills-gear.js): a ready step first, then this district's chapter, then any open one.
function chapterGoal(hereOnly) {
  if (typeof CHAPTERS === 'undefined' || !chapterFirstHourDone()) return null;
  const open = CHAPTERS.filter(ch => chapterOpen(ch) && !chapterRec(ch).done);
  const ready = open.find(chapterReady);
  if (ready) return { icon: '📖', text: words('stories.pillClaim', { title: ready.title }), run: () => { switchTab('quests'); switchRewardsSegment('stories'); } };
  const ch = open.find(x => x.kind === 'district' && x.district === state.currentDistrict) || (hereOnly ? null : open[0]);
  if (!ch) return null;
  const st = chapterStep(ch), t = typeof st.go === 'function' ? st.go() : st.go;
  return { icon: ch.icon, text: `${ch.title}: ${st.ask}`, run: () => chapterGo(ch), go: t && t.scene ? t : null };
}
