/* ============================================================
   THE THREAD STALL SCREEN (build 307): Clover's stall, full screen, the third building screen (pattern: js/bakery-screen.js).
   It lies over the stall's scene while it shows its home view or runs Stitch the Pattern; anything else puts it away.
   Rules stay put: deckAdvice() and the remnant basket's chest (sceneAction 'advice' / 'basket') in js/houses-and-cellar.js, and the
   pattern game (MINIGAMES.pattern, with its rewards) in js/puzzle-memory-minigames.js. This is the hands-on way to reach them.
     - The mannequin: tap it to have Clover measure up your deck (the same advice as the old "Ask about my deck").
     - The remnant basket: sweep your finger over the scraps to push them aside; when the basket is clear, the good one under them is
       yours (once, as before). Already found: it says so.
     - The ribbons on the line: tap one to make it flutter and hear what Clover whispers about it.
     - Stitch the Pattern: watch the squares light up, then press them from memory. (Not a drag: the pattern is rarely a straight line,
       and a finger sweeping across would stitch the squares in between.)
   The pattern game is run by timers, so miniRender() calls threadScreenSync() to keep this screen in step with it.
   ============================================================ */
let threadEl = null, threadUi = { sig: '', scraps: 0, digging: false };
const THREAD_SCRAPS = 6;
const threadOpen = () => !!threadEl && !threadEl.classList.contains('hidden');
const threadGame = () => (typeof mini !== 'undefined' && mini && mini.id === 'pattern' ? mini : null);
const threadFound = () => !!buildingState('stall-thread').basket;

function threadBuild() {
  const el = document.createElement('div'); el.id = 'threadScreen'; el.className = 'thread-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${CAST.threadSeller.name}'s thread stall`);
  el.innerHTML = `<div class="th-bar"><button type="button" class="th-x" id="thX" aria-label="Leave the stall">✕</button><b class="th-title">${CAST.threadSeller.name}'s Thread Stall</b><span class="th-chip" id="thChip"></span></div>
    <div class="th-line" id="thLine"></div>
    <div class="th-maker"><span class="th-seller" aria-hidden="true">${CAST.threadSeller.icon}</span><p class="th-say" id="thSay" aria-live="polite"></p></div>
    <div class="th-stage" id="thStage"></div>
    <p class="th-hint" id="thHint"></p>
    <div class="th-foot" id="thFoot"></div>`;
  document.body.appendChild(el); threadEl = el; threadWire(el); return el;
}

function threadRender() {
  if (!threadOpen()) return;
  const g = threadGame(), $ = id => document.getElementById(id);
  threadEl.dataset.mode = g ? (g.done ? 'over' : 'game') : 'shop';
  $('thChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('thSay').textContent = (scene && scene.text) || '';
  $('thLine').innerHTML = THREAD_RIBBONS.map(r => `<button type="button" class="th-rib" data-rib="${r.id}" data-hue="${r.hue}" aria-label="${r.name}"><i></i></button>`).join('');
  if (g) threadRenderGame($, g); else threadRenderShop($);
}

function threadRenderShop($) {
  const found = threadFound(), ms = miniState('pattern'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded);
  threadUi.scraps = 0;
  $('thStage').innerHTML = `<div class="th-room">
      <button type="button" class="th-dummy" data-th="advice" aria-label="Have ${CAST.threadSeller.name} measure up your deck"><span class="th-dummy-body" aria-hidden="true">🧥</span><b>Measure my deck</b><small>${CAST.threadSeller.name} knows a thing or two</small></button>
      <div class="th-basket${found ? ' done' : ''}" id="thBasket" role="button" tabindex="0" aria-label="Remnant basket: sweep the scraps aside, or tap to dig">
        <div class="th-scraps" id="thScraps">${found ? '' : Array.from({ length: THREAD_SCRAPS }, (_, i) => `<i class="th-scrap s${i}" data-scrap="${i}"></i>`).join('')}</div>
        <span class="th-rim" aria-hidden="true">🧺</span><b>${found ? 'Nothing left but lint' : 'Remnant basket'}</b></div></div>`;
  $('thHint').textContent = found ? 'You already found the good one in the basket.' : 'Sweep your finger over the scraps to dig through the basket.';
  $('thFoot').innerHTML = `<button type="button" class="th-play" data-th="mg-pattern"><span aria-hidden="true">🧵</span><b>Stitch the Pattern</b><small>${left ? `${left} prize${left === 1 ? '' : 's'} left today` : 'just for fun today'}</small></button>`;
}

function threadRenderGame($, g) {
  const over = g.done;
  if (!document.getElementById('thGrid')) $('thStage').innerHTML = `<div class="th-board"><p class="th-round" id="thRound"></p><div class="th-quilt" id="thGrid">${[...Array(16).keys()].map(i => `<button type="button" class="th-patch" data-patch="${i}" aria-label="Square ${i + 1}"></button>`).join('')}</div></div>`;
  threadPaint(g);
  $('thFoot').innerHTML = over ? `<button type="button" class="th-play" data-th="mg-again"><span aria-hidden="true">🔁</span><b>Play again</b></button><button type="button" class="th-play ghost" data-th="mg-back"><span aria-hidden="true">←</span><b>Back to the stall</b></button>`
    : `<button type="button" class="th-play ghost" data-th="mg-back"><span aria-hidden="true">←</span><b>Stop playing</b></button>`;
}
// the squares are repainted in place (never rebuilt), so a finger dragging across them keeps working
function threadPaint(g) {
  const st = g.st, $ = id => document.getElementById(id); if (!$('thGrid')) return;
  document.querySelectorAll('#thGrid .th-patch').forEach((b, i) => {
    const on = st.phase === 'show' ? st.target.includes(i) : st.picks.includes(i) || (st.phase === 'over' && st.target.includes(i));
    b.classList.toggle('on', on); b.classList.toggle('wrong', st.wrong === i); b.classList.toggle('miss', st.phase === 'over' && st.target.includes(i) && !st.picks.includes(i));
    b.disabled = st.phase !== 'input';
  });
  $('thRound').textContent = `Round ${st.round + 1}`;
  $('thHint').textContent = g.done ? '' : st.phase === 'show' ? '👀 Remember the squares…' : st.phase === 'input' ? `Stitch ${st.target.length - st.picks.length} more.` : st.phase === 'done' ? '✨ Perfect stitching!' : '🧶 A stitch out of place';
}

function threadStitch(i) {
  const g = threadGame(); if (!g || g.done || g.st.phase !== 'input' || g.st.picks.includes(i)) return;
  g.def.tap(g.st, i); buzz(HAP.tap); threadPaint(g);
}
function threadDigDone() {
  if (threadFound() || !scene) return;
  sceneAction('basket');   // the chest: a hidden card, once
}
function threadFlutter(id, btn) {
  const r = THREAD_RIBBONS.find(x => x.id === id); if (!r || !scene) return;
  sfx('tap'); buzz(HAP.tap); scene.text = `${r.name}. ${r.line}`;
  btn.classList.remove('flutter'); void btn.offsetWidth; btn.classList.add('flutter');
  const t = document.getElementById('thSay'); if (t) t.textContent = scene.text;
}

function threadWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#thX')) { sceneAction('leave'); return; }
    const rib = e.target.closest('[data-rib]'); if (rib) { threadFlutter(rib.dataset.rib, rib); return; }
    const t = e.target.closest('[data-th]'); if (t && !t.disabled) { sfx('tap'); sceneAction(t.dataset.th); return; }
    const patch = e.target.closest('[data-patch]'); if (patch && e.detail === 0) { threadStitch(+patch.dataset.patch); return; }   // keyboard; a pointer already stitched on press
    const bsk = e.target.closest('#thBasket');
    if (bsk && e.detail === 0) threadDigDone();
  });
  // a press stitches a square; dragging over the basket's scraps pushes them aside
  let drag = null;
  el.addEventListener('pointerdown', e => {
    const patch = e.target.closest('[data-patch]'), bsk = e.target.closest('#thBasket');
    if (!patch && !bsk) return;
    if (e.target.releasePointerCapture) { try { e.target.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } }   // touch grabs the element it started on; we want whatever is under the finger
    drag = { id: e.pointerId, kind: patch ? 'patch' : 'basket', moved: 0, x: e.clientX, y: e.clientY };
    if (patch) { e.preventDefault(); threadStitch(+patch.dataset.patch); }
  });
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.moved += Math.hypot(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY;
    const under = document.elementFromPoint(e.clientX, e.clientY); if (!under) return;
    if (drag.kind === 'patch') return;
    const sc = under.closest('[data-scrap]');
    if (sc && !sc.classList.contains('moved')) {
      sc.classList.add('moved'); threadUi.scraps++; sfx('tap');
      if (threadUi.scraps >= THREAD_SCRAPS) setTimeout(threadDigDone, 350);
    }
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = drag; drag = null;
    if (a.kind === 'basket' && a.moved < 8) {   // a plain tap digs a little: one scrap per tap, so the basket still takes a moment
      const left = [...document.querySelectorAll('#thScraps .th-scrap:not(.moved)')];
      if (!left.length) { if (threadFound()) { scene.text = `${CAST.threadSeller.name} shrugs. "You already found the good one in there."`; threadRender(); } return; }
      left[0].classList.add('moved'); threadUi.scraps++; sfx('tap'); if (threadUi.scraps >= THREAD_SCRAPS) setTimeout(threadDigDone, 350);
    }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function threadScreenHide() {
  if (!threadEl || threadEl.classList.contains('hidden')) return;
  threadEl.classList.add('hidden'); document.body.classList.remove('in-thread');
}
// called at the end of renderScene() and from miniRender(): over the stall's home view and its game, away for anything else
function threadScreenSync() {
  if (!scene || scene.id !== 'stall-thread' || scene.mode || (typeof mini !== 'undefined' && mini && mini.id !== 'pattern')) { threadScreenHide(); return; }
  const el = threadEl || threadBuild(), was = threadOpen(), g = threadGame();
  el.classList.remove('hidden'); document.body.classList.add('in-thread');
  if (g) { threadRender2(g, was); return; }
  const sig = [scene.text, state.progress.pebbles, threadFound(), miniState('pattern').rewarded].join('|');
  if (!was || sig !== threadUi.sig || el.dataset.mode !== 'shop') { threadUi.sig = sig; threadRender(); }
}
function threadRender2(g, was) {
  const sig = ['g', scene.text, g.done, miniState('pattern').rewarded].join('|');
  if (!was || sig !== threadUi.sig || threadEl.dataset.mode === 'shop') { threadUi.sig = sig; threadRender(); }
  else threadPaint(g);   // a phase change inside the round: only the squares and the hint move
}
