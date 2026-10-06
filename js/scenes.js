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
const STORY_GUIDE_ICON = '🧓';   // Wren, until portraits arrive

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

/* ---------- A. the opening ---------- */
const STORY_INTRO = { id: 'intro', style: 'dream', cards: [
  { text: 'Let your eyes close.', sub: 'Breathe in. Out.', breath: true },
  { text: 'Somewhere, a fountain hums a song you almost remember.' },
  { text: 'You open your eyes.', sub: 'Nobody remembers arriving here. It feels like you always did.' },
  { text: '"There you are," says a warm voice. "Right on time. Was it? Never mind. Come in."' }
] };
// A save with no steps and no wins is a new dreamer; anyone else has already arrived, so mark it seen without playing it.
function storyIntroCheck() {
  if (storySeen('intro')) return;
  const p = state.progress, fresh = !(p.totals && p.totals.steps) && !state.wins && storyState().step === 0 && !p.lastGift;
  if (!fresh) { storyScenes().seen.intro = true; saveState(); return; }
  playStoryScene(STORY_INTRO).then(ok => { if (ok) storyHoldUntil(900); });
}

/* ---------- B. the guided first hour ---------- */
// who speaks defaults to Wren. ask is what the goal pill says; go (a function, so it is read late) is where the pill's tap
// takes you (see guideTo in js/guide-walk.js: it walks there for you), or nothing to hear the beat again; mark is the building id that gets the gold diamond (in district, default square).
const WREN_NOT_SURE = 'I could not tell you how I know my way around, only that I do.';
const STORY_BEATS = [
  { ask: 'wander the Threshold for a bit', go: () => ({ wander: 30 }), cards: [
      { text: 'There you are. Come in off the middle of the path, dear.' },
      { text: `I am Wren. I keep the kettle on. ${WREN_NOT_SURE}`, choices: [
        { label: 'Where am I?', reply: 'El Umbral, the Threshold. Every dreamer starts here, though nobody remembers arriving.' },
        { label: 'Is this a dream?', reply: 'It might be. Whose, I could not say. I have heard it called a few things.' },
        { label: 'How do I leave?', reply: 'The doors here only lead deeper in, dear. Have some tea first.' } ] },
      { text: 'Take a slow wander first. El Umbral likes to be looked at. Thirty steps will do.' } ] },
  { ask: 'say hello to a neighbor', go: () => ({ npc: true }), cards: [
      { text: 'Did you notice? Everyone here is a spirit wearing a card.' },
      { text: 'Tap one and say hello. They like being noticed more than they let on.' } ] },
  { ask: 'win a friendly card match', go: () => ({ npc: true }), cards: [
      { text: 'Cards are how spirits talk. A friendly match is just a very polite way of saying more.' },
      { text: 'Go on. Nobody here plays to hurt.' } ] },
  { ask: 'claim your gift in Rewards', go: () => ({ tab: 'quests' }), cards: [
      { text: 'Something is waiting for you in Rewards. Things tend to turn up for people here.' } ] },
  { ask: 'visit my cottage, top left', mark: 'cottage', go: () => ({ scene: 'cottage', district: 'square', name: "Wren's cottage" }), cards: [
      { text: 'Come by the cottage. It is top left of the square, you cannot miss it.' },
      { text: 'I will put the kettle on. I always do, and it is always just ready.' } ] },
  { ask: 'bake a loaf at Maple\'s bakery', mark: 'bakery', go: () => JPLACES.bakery, cards: [
      { text: 'Maple bakes bread that tastes like a memory you cannot place.' },
      { text: 'Bake a loaf at her bakery, bottom left. Tell me what it reminds you of. Nobody ever agrees.' } ] },
  { ask: 'catch a fish: tap the water', go: () => ({ fish: true }), cards: [
      { text: 'Cast a thought into any water. The fish bite on whatever you are thinking about.' },
      { text: 'The quiet ones bite best. Tap the water where a shadow is swimming.' } ] },
  { ask: 'finish a game in any house', go: () => ({ minigame: true }), cards: [
      { text: 'Most houses have a little game going. Nobody keeps the score for long.' },
      { text: 'Try one. Mine has tea in it.' } ] },
  { ask: 'plant a seed: Fern sells them', mark: 'house2', go: () => ({ scene: 'house2', district: 'square', name: "Fern's cottage" }), cards: [
      { text: 'Seeds grow toward whatever you pay attention to. Fern sells them, bottom right of the square.' },
      { text: 'Plant one and keep an eye on it. Or do not, and see what it becomes.' } ] },
  { ask: 'open a pack at the Card Shop', go: () => JPLACES.shop, cards: [
      { text: 'Treat yourself. The Card Shop is in El Mercado de Susurros. Speak softly there.' } ] },
  { ask: 'change a card in Cards, then Deck', go: () => ({ tab: 'collection' }), cards: [
      { text: 'A deck is a sentence made of spirits. Change one word and it says something else.' },
      { text: 'Look under Cards, then Deck.' } ] },
  { ask: 'reach level 5', cards: [
      { text: 'Settle in properly. Do whatever pulls at you and it all counts.' },
      { text: 'When you reach level five, I have something for you.' } ] },
  // After the first chain, "Making yourself at home".
  { ask: 'meet a district god in battle', go: () => ({ boss: true }), cards: [
      { text: 'Every district belongs to a spirit god. They do not mean any harm. They only want to be met.' },
      { text: 'Face one when you are ready. They are gentle, in their way.' } ] },
  { ask: 'visit every district', go: () => { const k = Object.keys(DISTRICTS).find(d => !state.visitedDistricts.includes(d) && districtUnlocked(d)); return k ? { travel: k } : { map: 1 }; }, cards: [
      { text: 'There are four districts, and each one dreams a little differently.' },
      { text: 'Open the map and drift somewhere you have not been.' } ] },
  { ask: 'visit the Net Loft and Glasshouse', go: () => (state.progress.visited || {})['harbor-hut'] ? JPLACES.glass : JPLACES.net, cards: [
      { text: 'Tam mends nets by the shore, though nothing ever seems to tear.' },
      { text: 'Iris grows the most delicate thoughts under glass. Both would love a visitor.' } ] },
  { ask: 'beat Rook in a match', go: () => ({ rival: true }), cards: [
      { text: 'Rook keeps turning up. Another dreamer, like you, with a head full of theories.' },
      { text: 'Play them, and listen. You never know which of their guesses is right. I certainly do not.' } ] },
  { ask: 'complete a themed card set', go: () => ({ tab: 'collection' }), cards: [
      { text: 'Finish what you start. A set is a small story made of cards.' } ] },
  { ask: 'reach level 10', cards: [
      { text: 'Look at you. Practically a local.' },
      { text: 'Keep going, dear. I have a feeling there is more to this place than the town.' } ] }
];
STORY_BEATS.forEach(b => b.cards.forEach(c => { c.who = c.who || 'Wren'; c.icon = c.icon || STORY_GUIDE_ICON; }));

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
  if (storyReady()) return { icon: '📜', text: 'Wren: that one is done. Claim it in Rewards', run: () => journalGo({ tab: 'quests' }), first };
  const run = () => { if (b.go) journalGo(b.go()); else playStoryScene(storyBeatScript(s.step), { replay: true }); };
  return { icon: st.icon, text: `Wren: ${b.ask}`, run, first, go: b.go ? b.go() : null };
}
// The gold diamond over the building the current step points at, only while you are in that building's district.
function storyMark() {
  const b = storyBeatNow(), want = b && b.mark && !prefs.cozy && !storyReady() && state.currentDistrict === (b.district || 'square') ? b.mark : null;
  document.querySelectorAll('.bld.story-target').forEach(el => { if (!want || el.dataset.building !== want) el.classList.remove('story-target'); });
  if (want) { const el = document.querySelector(`.bld[data-building="${want}"]`); if (el) el.classList.add('story-target'); }
}
