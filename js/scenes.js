/* ============================================================
   STORY SCENES AND THE GUIDED FIRST HOUR
   The story bible's way of telling the dream, in two parts that share one small scene runner.

   The runner  playStoryScene(script, opts)  shows short cards over the game and resolves when the player finishes or skips.
   A script is { id, style, cards }. style 'dream' is a full screen of drifting colour with centred text (the opening);
   style 'talk' is a card at the foot of the screen over the town, with a portrait and a name (everyone's voice). A card is
   { who, icon, text, sub, choices: [{ label, reply }] }. A choice only changes what the speaker says next, never what
   happens, because the bible's maybe rule says every answer about the dream stays a maybe. Every scene can be skipped,
   and one with an id is remembered in state.progress.scenes.seen so it plays once; tapping the goal pill replays it.

   A. The opening (STORY_INTRO). A brand-new save drifts off and wakes in El Umbral before the town is shown. An older save
      is marked as having seen it, so a returning tester is never sent back to the start.
   B. The guided first hour (STORY_BEATS). One beat per step of the STORY chain in js/events-story-foils-guide.js (same
      index). When a step becomes the current one its beat plays once as a few lines from Wren, the goal pill under the top
      bar shows what she asked, and a small gold diamond bobs over the building to go to. Nothing here changes a rule: the
      steps, goals and rewards are still the ones in STORY.
   Saved: state.progress.scenes = { seen: { id: true } } and state.progress.story.beat (the last step whose beat has played).
   ============================================================ */
const STORY_GUIDE_ICON = CAST.guide.icon;   // the guide's face (js/game-config.js), until portraits arrive

function storyScenes() { const p = state.progress; if (!p.scenes || typeof p.scenes !== 'object') p.scenes = { seen: {} }; if (!p.scenes.seen) p.scenes.seen = {}; return p.scenes; }
function storySeen(id) { return !!storyScenes().seen[id]; }

/* ---------- the runner ---------- */
let storyCur = null;   // the scene on screen: { script, queue, i, replay, typing, timer, resolve }
function storyEls() {
  return { ov: document.getElementById('sceneOverlay'), stage: document.getElementById('storyStage'), who: document.getElementById('storyWho'),
    portrait: document.getElementById('storyPortrait'), name: document.getElementById('storyName'), text: document.getElementById('storyText'),
    sub: document.getElementById('storySub'), opts: document.getElementById('storyOpts'), hint: document.getElementById('storyHint'),
    breath: document.getElementById('storyBreath'), pips: document.getElementById('storyPips') };
}
function storyReduce() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

function playStoryScene(script, opts) {
  if (storyCur || inBattle || !script || !script.cards || !script.cards.length) return Promise.resolve(false);
  return new Promise(resolve => {
    const e = storyEls();
    storyCur = { script, queue: script.cards.slice(), i: 0, replay: !!(opts && opts.replay), typing: false, timer: 0, resolve };
    e.ov.dataset.style = script.style || 'talk';
    e.pips.innerHTML = script.style === 'dream' ? script.cards.map(() => '<i></i>').join('') : '';
    document.body.classList.add('in-story');
    e.ov.classList.remove('hidden');
    storyShow();
    e.stage.focus({ preventScroll: true });
  });
}
function storyShow() {
  const c = storyCur, e = storyEls(); if (!c) return;
  const card = c.queue[c.i];
  clearInterval(c.timer); c.typing = false;
  const dream = c.script.style === 'dream';
  [...e.pips.children].forEach((p, k) => p.classList.toggle('on', k <= c.i));
  e.breath.classList.toggle('hidden', !card.breath);
  e.who.classList.toggle('hidden', dream || !card.who);
  if (card.who) { e.name.textContent = card.who; e.portrait.textContent = card.icon || STORY_GUIDE_ICON; }
  e.sub.textContent = card.sub || '';
  e.opts.innerHTML = ''; e.hint.classList.add('hidden');
  e.stage.classList.remove('scn-in'); void e.stage.offsetWidth; e.stage.classList.add('scn-in');
  const text = card.text || '';
  if (dream || storyReduce() || text.length < 3) { storyReveal(card); return; }
  let n = 0; e.text.textContent = ''; c.typing = true;
  c.timer = setInterval(() => { n += 2; e.text.textContent = text.slice(0, n); if (n >= text.length) storyReveal(card); }, 22);
}
// The text is fully shown: offer the choices, or the "tap to continue" hint.
function storyReveal(card) {
  const c = storyCur, e = storyEls(); if (!c) return;
  clearInterval(c.timer); c.typing = false;
  e.text.textContent = card.text || '';
  e.opts.innerHTML = ''; e.hint.classList.add('hidden');
  if (!card.choices) { e.hint.classList.remove('hidden'); return; }
  card.choices.forEach(ch => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'scn-opt'; b.textContent = ch.label;
    b.addEventListener('click', ev => { ev.stopPropagation(); storyChoose(ch, card); });
    e.opts.appendChild(b);
  });
}
// A reply is spliced in as the next card from the same speaker, so a choice never branches the story.
function storyChoose(ch, card) {
  const c = storyCur; if (!c) return;
  const replies = [].concat(ch.reply || []).map(t => ({ who: card.who, icon: card.icon, text: t }));
  c.queue.splice(c.i + 1, 0, ...replies);
  sfx('tap'); storyNext();
}
function storyNext() {
  const c = storyCur; if (!c) return;
  c.i++;
  if (c.i >= c.queue.length) { storyEnd(); return; }
  storyShow();
}
function storyEnd() {
  const c = storyCur; if (!c) return;
  clearInterval(c.timer);
  storyEls().ov.classList.add('hidden'); document.body.classList.remove('in-story');
  if (c.script.id && !c.replay) { storyScenes().seen[c.script.id] = true; saveState(); }
  storyCur = null; c.resolve(true);
}
function storyStageTap() {
  const c = storyCur; if (!c) return;
  const card = c.queue[c.i];
  if (c.typing) { storyReveal(card); return; }   // a tap while it types shows the rest at once
  if (card.choices) return;                        // the buttons handle it
  sfx('tap'); storyNext();
}
document.getElementById('storyStage').addEventListener('click', storyStageTap);
document.getElementById('storyStage').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); storyStageTap(); } });
document.getElementById('storySkip').addEventListener('click', ev => { ev.stopPropagation(); sfx('nav'); storyEnd(); });

// STORY_INTRO: in content/story.js (the game's words and data, kept apart from the code)
// A save with no steps and no wins is a new dreamer; anyone else has already arrived, so mark it seen without playing it.
function storyIntroCheck() {
  if (storySeen('intro')) return;
  const p = state.progress, fresh = !(p.totals && p.totals.steps) && !state.wins && storyState().step === 0 && !p.lastGift;
  if (!fresh) { storyScenes().seen.intro = true; saveState(); return; }
  playStoryScene(STORY_INTRO).then(ok => { if (ok) storyHoldUntil(900); });
}

// WREN_NOT_SURE, STORY_BEATS: in content/story.js (the game's words and data, kept apart from the code)
STORY_BEATS.forEach(b => b.cards.forEach(c => { c.who = c.who || CAST.guide.name; c.icon = c.icon || STORY_GUIDE_ICON; }));

let storyHoldAt = 0;
function storyHoldUntil(ms) { storyHoldAt = Date.now() + ms; }
function storyBeatNow() { const s = storyState(); return s.step < STORY_BEATS.length ? STORY_BEATS[s.step] : null; }
function storyBeatScript(step) { return { id: null, style: 'talk', cards: STORY_BEATS[step].cards }; }
// Anything that should not be talked over: a battle, a building, another sheet, a walk in progress, or another tab.
function storyBusy() {
  if (storyCur || inBattle || currentTab !== 'town') return true;
  if (document.body.classList.contains('in-scene') || document.body.classList.contains('in-fishing')) return true;
  if (document.querySelector('.overlay:not(.hidden)')) return true;
  if (typeof playerEl !== 'undefined' && playerEl && playerEl.classList.contains('walking')) return true;
  return false;
}
// Called from checkStory() on every HUD refresh: plays the beat for the current step once, when the screen is quiet.
function storyBeatCheck() {
  const s = storyState(); if (s.beat === undefined) s.beat = -1;
  if (s.step >= STORY_BEATS.length || s.beat >= s.step || prefs.cozy || !storySeen('intro')) return;
  if (storyReadyNow() || storyBusy() || Date.now() < storyHoldAt) return;
  const step = s.step; s.beat = step; saveState();
  playStoryScene(storyBeatScript(step)).then(ok => { if (ok && step === 0) showTipOnce('story'); });
}
function storyReadyNow() { return storyReady(); }
// Wren's first words come before any first-run tip, so the very first minutes read dream, then Wren, then the tips.
function storyFirstBeatPending() { const s = storyState(); return !inBattle && !prefs.cozy && s.step === 0 && (s.beat === undefined || s.beat < 0); }
// The goal pill. During the first chain it outranks every other nudge; afterwards it only fills an otherwise empty pill.
function storyGoal() {
  const s = storyState(), b = storyBeatNow(), st = storyStep(); if (!b || !st) return null;
  const first = s.step < STORY_ARC_LEN;
  if (storyReady()) return { icon: '📜', text: `${CAST.guide.name}: that one is done. Claim it in Rewards`, run: () => journalGo({ tab: 'quests' }), first };
  const run = () => { if (b.go) journalGo(b.go()); else playStoryScene(storyBeatScript(s.step), { replay: true }); };
  return { icon: st.icon, text: `${CAST.guide.name}: ${b.ask}`, run, first, go: b.go ? b.go() : null };
}
// The gold diamond over the building the current step points at, only while you are in that building's district.
function storyMark() {
  const b = storyBeatNow(), want = b && b.mark && !prefs.cozy && !storyReady() && state.currentDistrict === (b.district || 'square') ? b.mark : null;
  document.querySelectorAll('.bld.story-target').forEach(el => { if (!want || el.dataset.building !== want) el.classList.remove('story-target'); });
  if (want) { const el = document.querySelector(`.bld[data-building="${want}"]`); if (el) el.classList.add('story-target'); }
}
