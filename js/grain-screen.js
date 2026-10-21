/* ============================================================
   THE GRAIN STALL SCREEN (build 309): the grain seller's stall, full screen, the fifth building screen (pattern: js/bakery-screen.js).
   Over the stall's scene while it shows its home view or runs Catch the Grain; anything else puts it away. Rules stay put: the daily
   'sample' reward in content/world.js (sceneAction) and MINIGAMES.grain (spawning, scoring, medals) in js/puzzle-memory-minigames.js.
     - The free sample (once a day): drag the scoop into the sack to fill it, then over your cupped hand to pour. Or tap the scoop,
       then the sack, then the hand. Pouring is what pays, exactly as the old button did. Already had it: the sack is flat.
     - Catch the Grain: the same game, played here. Drag your finger across the board and the basket follows it (a tap on a lane
       also moves it). The grain falls smoothly instead of in jumps; the game's own timer still drives it, and miniRender() calls
       grainScreenSync() so this screen follows every step.
   ============================================================ */
let grainEl = null, grainUi = { sig: '', carry: false, els: new WeakMap() };
const grainOpen = () => !!grainEl && !grainEl.classList.contains('hidden');
const grainGame = () => (typeof mini !== 'undefined' && mini && mini.id === 'grain' ? mini : null);
const grainSampled = () => buildingState('stall-grain').sample === todayKey();

function grainBuild() {
  const el = document.createElement('div'); el.id = 'grainScreen'; el.className = 'grain-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${CAST.grainSeller.name}'s grain stall`);
  el.innerHTML = `<div class="gr-bar"><span aria-hidden="true"></span><b class="gr-title">${CAST.grainSeller.name}'s Grain Stall</b><span class="gr-chip" id="grChip"></span></div>
    <div class="gr-maker"><span class="gr-seller" aria-hidden="true">${CAST.grainSeller.icon}</span><p class="gr-say" id="grSay" aria-live="polite"></p></div>
    <div class="gr-stage" id="grStage"></div>
    <p class="gr-hint" id="grHint"></p>
    <div class="gr-foot" id="grFoot"></div>
    <button type="button" class="btn btn-ghost gr-leave" id="grLeave">Leave</button>`;
  document.body.appendChild(el); grainEl = el; grainWire(el); return el;
}

function grainRender() {
  if (!grainOpen()) return;
  const g = grainGame(), $ = id => document.getElementById(id);
  grainEl.dataset.mode = g ? (g.done ? 'over' : 'game') : 'shop';
  $('grChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('grSay').textContent = (scene && scene.text) || '';
  if (g) grainRenderGame($, g); else grainRenderShop($);
}

function grainRenderShop($) {
  const ms = miniState('grain'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded), done = grainSampled();
  grainUi.carry = false; grainUi.pickedScoop = false;
  $('grStage').innerHTML = `<div class="gr-counter${done ? ' empty' : ''}">
      <div class="gr-sack" id="grSack" data-drop="sack" role="button" tabindex="0" aria-label="Sack of grain"><span class="gr-grain" aria-hidden="true">${done ? '' : '🌾'}</span><b>${done ? 'Sold out for today' : 'Fresh grain'}</b></div>
      <button type="button" class="gr-scoop" id="grScoop" aria-label="${done ? 'Scoop: ask about a sample' : 'Scoop: fill it from the sack, then pour it into your hand'}"><span aria-hidden="true">🥄</span><i class="gr-load"></i></button>
      <div class="gr-hand" id="grHand" data-drop="hand" aria-label="Your cupped hand"><span aria-hidden="true">🤲</span><b>Your hand</b></div></div>`;
  $('grHint').textContent = done ? '' : 'Drag the scoop into the sack, then over your hand. (Or tap: scoop, sack, hand.)';
  $('grFoot').innerHTML = `<button type="button" class="gr-play" data-gr="mg-grain"><span aria-hidden="true">🌾</span><b>Catch the Grain</b><small>${left ? `${left} prize${left === 1 ? '' : 's'} left today` : 'just for fun today'}</small></button>`;
}

/* ---- the game: lanes, falling things and a basket that follows the finger ---- */
function grainRenderGame($, g) {
  if (!document.getElementById('grBoard')) {
    $('grStage').innerHTML = `<div class="gr-top"><span class="gr-score" id="grScore"></span><div class="gr-time"><i id="grTime"></i></div></div><div class="gr-board" id="grBoard" role="group" aria-label="Move the basket"><div class="gr-lane"></div><div class="gr-lane"></div><div class="gr-lane"></div><div class="gr-basket" id="grBasket" aria-hidden="true">🧺</div></div>`;
    grainUi.els = new WeakMap();
  }
  grainPaint(g);
  $('grHint').textContent = g.done ? '' : 'Drag across the board to steer the basket. Catch the grain, dodge the stones.';
  $('grFoot').innerHTML = g.done ? `<button type="button" class="gr-play" data-gr="mg-again"><span aria-hidden="true">🔁</span><b>Play again</b></button><button type="button" class="gr-play ghost" data-gr="mg-back"><span aria-hidden="true">←</span><b>Back to the stall</b></button>`
    : `<button type="button" class="gr-play ghost" data-gr="mg-back"><span aria-hidden="true">←</span><b>Stop playing</b></button>`;
}
// the falling things are real elements, one per item, moved by CSS: nothing is rebuilt while the game runs
function grainPaint(g) {
  const board = document.getElementById('grBoard'); if (!board) return;
  const st = g.st, live = new Set();
  st.items.forEach(it => {
    let e = grainUi.els.get(it);
    if (!e) { e = document.createElement('span'); e.className = 'gr-fall ' + it.kind; e.textContent = it.kind === 'grain' ? '🌾' : '🪨'; e.style.setProperty('--l', it.lane); board.appendChild(e); grainUi.els.set(it, e); }
    e.style.setProperty('--y', it.y); live.add(e);
  });
  board.querySelectorAll('.gr-fall').forEach(e => { if (!live.has(e)) { e.classList.add('gone'); setTimeout(() => e.remove(), 220); } });
  board.dataset.hit = st.hit || ''; if (st.hit) { board.classList.remove('good', 'bad'); void board.offsetWidth; board.classList.add(st.hit === 'good' ? 'good' : 'bad'); st.hit = null; }
  document.getElementById('grBasket').style.setProperty('--l', st.lane);
  document.getElementById('grScore').textContent = `🌾 ${st.score}`;
  document.getElementById('grTime').style.width = Math.max(0, Math.min(100, st.left / 250)) + '%';
}
function grainLane(clientX) {
  const b = document.getElementById('grBoard').getBoundingClientRect();
  return Math.max(0, Math.min(2, Math.floor(((clientX - b.left) / b.width) * 3)));
}
function grainSteer(clientX) {
  const g = grainGame(); if (!g || g.done) return;
  const l = grainLane(clientX); if (l !== g.st.lane) { g.def.tap(g.st, l); grainPaint(g); }
}

/* ---- the sample: scoop, sack, hand ---- */
function grainScoopStep(target) {   // 'sack' fills the scoop, 'hand' pours it
  const sc = document.getElementById('grScoop'); if (!sc || !scene) return;
  if (grainSampled()) { sceneAction('sample'); return; }   // already had it: the seller says so
  if (target === 'sack' && !grainUi.carry) { grainUi.carry = true; sc.classList.add('full'); sfx('tap'); buzz(HAP.tap); document.getElementById('grHint').textContent = 'Now pour it into your hand.'; return; }
  if (target === 'hand') {
    if (!grainUi.carry) { sfx('soft'); document.getElementById('grHint').textContent = 'The scoop is empty. Fill it from the sack first.'; return; }
    grainUi.carry = false; sc.classList.remove('full'); document.getElementById('grHand').classList.add('catch'); sfx('claim'); buzz(HAP.found);
    setTimeout(() => { if (scene) sceneAction('sample'); }, 380);
  }
}

function grainWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#grLeave')) { sceneAction('leave'); return; }
    const gr = e.target.closest('[data-gr]'); if (gr) { sfx('tap'); sceneAction(gr.dataset.gr); return; }
    if (grainUi.dragged) return;   // the click that follows a drag belongs to the drag
    if (e.target.closest('#grScoop')) { grainUi.pickedScoop = !grainUi.pickedScoop; document.getElementById('grScoop').classList.toggle('held', grainUi.pickedScoop); if (grainSampled()) grainScoopStep('sack'); return; }
    const drop = e.target.closest('[data-drop]');
    if (drop && grainUi.pickedScoop && !grainUi.dragged) { grainScoopStep(drop.dataset.drop); if (drop.dataset.drop === 'hand' || grainSampled()) { grainUi.pickedScoop = false; const sc = document.getElementById('grScoop'); if (sc) sc.classList.remove('held'); } }
  });
  // the board: the basket follows the finger. The scoop: drag it onto the sack, then the hand.
  let d = null;
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('#grBoard') && grainGame()) { e.preventDefault(); d = { id: e.pointerId, kind: 'board' }; grainSteer(e.clientX); return; }
    const sc = e.target.closest('#grScoop'); if (!sc || grainSampled()) return;
    e.preventDefault(); try { sc.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    sc.classList.add('dragging'); d = { id: e.pointerId, kind: 'scoop', el: sc, x0: e.clientX, y0: e.clientY, moved: 0 }; grainUi.dragged = false;
  });
  el.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (d.kind === 'board') { grainSteer(e.clientX); return; }
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0; d.moved = Math.max(d.moved, Math.hypot(dx, dy)); d.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 12}deg)`;
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const a = d; d = null;
    if (a.kind !== 'scoop') return;
    a.el.classList.remove('dragging'); a.el.style.transform = '';
    if (a.moved < 8) return;   // a tap is the click handler's
    grainUi.dragged = true; setTimeout(() => { grainUi.dragged = false; }, 50);
    a.el.style.pointerEvents = 'none'; const under = document.elementFromPoint(e.clientX, e.clientY), drop = under && under.closest('[data-drop]'); a.el.style.pointerEvents = '';   // the scoop is still gliding home: look through it
    if (drop) grainScoopStep(drop.dataset.drop);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function grainScreenHide() {
  if (!grainEl || grainEl.classList.contains('hidden')) return;
  grainEl.classList.add('hidden'); document.body.classList.remove('in-grain');
}
// called at the end of renderScene() and from miniRender() (the game is timer-driven): over the stall's home view and its game
function grainScreenSync() {
  if (!scene || scene.id !== 'stall-grain' || scene.mode || (typeof mini !== 'undefined' && mini && mini.id !== 'grain')) { grainScreenHide(); return; }
  const el = grainEl || grainBuild(), was = grainOpen(), g = grainGame();
  el.classList.remove('hidden'); document.body.classList.add('in-grain');
  const want = g ? (g.done ? 'over' : 'game') : 'shop', sig = [want, scene.text, state.progress.pebbles, grainSampled(), miniState('grain').rewarded].join('|');
  if (!was || sig !== grainUi.sig || el.dataset.mode !== want) { grainUi.sig = sig; grainRender(); } else if (g) grainPaint(g);
}
