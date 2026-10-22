/* ============================================================
   THE BAKERY SCREEN (build 305): Maple's Bakery, full screen. It sits on top of the bakery scene (js/houses-and-cellar.js) whenever
   the scene is showing its home view, and gives way to the scene's own sheet for Cook and the Cake Toppings game (their Back button
   brings it back). The rules stay where they were: ovenAction() starts and collects a bake, sceneAction() does the roll, Cook and the
   mini-game. Nothing here decides a reward; it is the hands-on way to reach them.
     - Baking is something you do, in four steps: KNEAD the dough (rub it with a finger), SCORE the loaf (three swipes across it),
       LOAD it (drag the loaf up into the oven), then wait. The wait is the same real-time bake as before.
     - Baking: the oven glows, the loaf rises in its window and a clock counts down. Ready: the door opens and the loaf is on the
       peel; drag it (or tap it) into the basket.
     - Round the kitchen, three spots: the stove (Cook), the cake stand (Cake Toppings) and the roll tray (a warm roll, once a day).
   Every step also works with a plain tap, so nobody needs to scrub a screen to bake bread.
   ============================================================ */
const BK_BAKED_CUTS = [{ x: 32, y: 50, len: 44, a: 70 }, { x: 50, y: 50, len: 46, a: 70 }, { x: 68, y: 50, len: 44, a: 70 }];   // what the loaf comes out of the oven wearing
const BK_KNEAD_PX = 1100, BK_TAP_KNEAD = 0.14, BK_SLASHES = 3, BK_MIN_SLASH = 46;
let bakeryEl = null, bakeryUi = { step: 'knead', knead: 0, cuts: [], sig: '' };

const bakeryOpen = () => !!bakeryEl && !bakeryEl.classList.contains('hidden');
function bakeryPhase() {
  const ov = ovenState();
  if (!ov.startedAt) return 'idle';
  return Date.now() - ov.startedAt < (ov.ms || BAKE_MS) ? 'baking' : 'ready';
}
function bakeryBakeFrac() { const ov = ovenState(); return ov.startedAt ? Math.min(1, (Date.now() - ov.startedAt) / (ov.ms || BAKE_MS)) : 0; }

function bakeryBuild() {
  const el = document.createElement('div'); el.id = 'bakeryScreen'; el.className = 'bakery-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${CAST.baker.name}'s bakery`);
  el.innerHTML = `<div class="bk-steam" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
    <div class="bk-bar"><span aria-hidden="true"></span><b class="bk-title">${CAST.baker.name}'s Bakery</b><span class="bk-basket-chip" id="bkChip"></span></div>
    <div class="bk-maple"><span class="bk-chef" aria-hidden="true">${CAST.baker.icon}</span><p class="bk-say" id="bkSay" aria-live="polite"></p></div>
    <div class="bk-stage" id="bkStage">
      <div class="bk-oven" id="bkOven"><div class="bk-arch"><div class="bk-window"><span class="bk-inloaf" id="bkInLoaf" aria-hidden="true"></span><span class="bk-glow"></span></div><div class="bk-door"></div></div><div class="bk-clock" id="bkClock"></div></div>
      <div class="bk-counter" id="bkCounter"></div>
    </div>
    <p class="bk-hint" id="bkHint"></p>
    <div class="bk-spots" id="bkSpots"></div>
    <button type="button" class="btn btn-ghost bk-leave" id="bkLeave">Leave</button>`;
  document.body.appendChild(el); bakeryEl = el; screenFxInit(el); bakeryWire(el); return el;
}

function bakerySay() { const t = document.getElementById('bkSay'); if (t && scene) t.textContent = scene.text || ''; }

function bakeryRender() {
  if (!bakeryOpen()) return;
  const ph = bakeryPhase(), u = bakeryUi, $ = id => document.getElementById(id);
  bakeryEl.dataset.phase = ph; bakeryEl.dataset.step = ph === 'idle' ? u.step : '';
  bakerySay();
  $('bkChip').textContent = `🍞 ${breadCount()}/${BREAD_MAX}`;
  const c = $('bkCounter'); c.className = 'bk-counter';
  if (ph === 'idle') {
    if (u.step === 'knead') {
      c.innerHTML = `<div class="bk-board"><div class="bk-dough" id="bkDough" role="button" tabindex="0" aria-label="Dough: rub it to knead, or tap"><i class="bk-dough-shine"></i></div><div class="bk-meter"><i id="bkMeter" style="width:${Math.round(u.knead * 100)}%"></i></div></div>`;
      $('bkHint').textContent = 'Rub the dough with your finger to knead it. (Or just tap it.)';
    } else if (u.step === 'score') {
      c.innerHTML = `<div class="bk-board"><div class="bk-loaf raw" id="bkLoaf" role="button" tabindex="0" aria-label="Loaf: swipe across it to score it, or tap"><i class="bk-loaf-shine"></i><span class="bk-cuts" id="bkCuts"></span><span class="bk-guide" aria-hidden="true"><b></b><b></b><b></b></span></div><div class="bk-pips" id="bkPips"></div></div>`;
      $('bkHint').textContent = 'Swipe across the loaf three times to score it. (Or tap it.)';
      bakeryDrawCuts();
    } else {
      c.innerHTML = `<div class="bk-board"><div class="bk-loaf raw scored drag" id="bkLoaf" role="button" tabindex="0" aria-label="Loaf: drag it up into the oven, or tap"><i class="bk-loaf-shine"></i><span class="bk-cuts" id="bkCuts"></span></div></div>`;
      $('bkHint').textContent = 'Drag the loaf up into the oven. (Or tap it.)';
      bakeryDrawCuts();
    }
  } else if (ph === 'baking') {
    c.innerHTML = `<div class="bk-board bk-wait"><div class="bk-bigclock" id="bkBigClock"></div><p class="bk-waitnote">It bakes in real time, so you can leave and come back. Cook, play or have a roll while you wait.</p></div>`;
    $('bkHint').textContent = '';
  } else {
    c.innerHTML = `<div class="bk-board"><div class="bk-peel"><div class="bk-loaf baked drag" id="bkLoaf" role="button" tabindex="0" aria-label="Fresh loaf: drag it to the basket, or tap"><i class="bk-loaf-shine"></i><span class="bk-cuts" id="bkCuts"></span></div></div><div class="bk-basket" id="bkBasketDrop" aria-hidden="true"><span>🧺</span><b>${breadCount()}/${BREAD_MAX}</b></div></div>`;
    bakeryDrawCuts(); $('bkHint').textContent = 'Golden and crackling. Drag the loaf into the basket. (Or tap it.)';
  }
  bakeryTick(true);
  bakerySpots();
}

function bakerySpots() {
  const st = buildingState('bakery'), done = st.roll === todayKey(), ms = miniState('frost'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded);
  const stock = Object.keys(INGREDIENTS).reduce((n, k) => n + ingredientCount(k), 0);
  document.getElementById('bkSpots').innerHTML = [
    ['cook', '🍳', 'Cook', stock ? `${stock} ingredient${stock === 1 ? '' : 's'} in the pantry` : 'the pantry is empty'],
    ['mg-frost', '🎂', 'Cake Toppings', left ? `${left} prize${left === 1 ? '' : 's'} left today` : 'just for fun today'],
    ['roll', '🥐', 'Warm roll', done ? 'eaten today' : `+3 ${GAME.currency.many}`],
  ].map(([id, ico, name, meta]) => `<button type="button" class="bk-spot${id === 'roll' && done ? ' used' : ''}" data-bk="${id}"><span class="bk-spot-ico" aria-hidden="true">${ico}</span><b>${name}</b><small>${meta}</small></button>`).join('');
}

// the cuts a player has made stay drawn on the loaf, in its own coordinates (0-100%)
function bakeryDrawCuts() {
  const box = document.getElementById('bkCuts'); if (!box) return;
  box.innerHTML = (bakeryPhase() === 'ready' ? BK_BAKED_CUTS : bakeryUi.cuts).map(c => `<i style="left:${c.x}%;top:${c.y}%;width:${c.len}%;transform:translate(-50%,-50%) rotate(${c.a}deg)"></i>`).join('');
  const pips = document.getElementById('bkPips'); if (pips) pips.innerHTML = Array.from({ length: BK_SLASHES }, (_, i) => `<span class="${i < bakeryUi.cuts.length ? 'on' : ''}"></span>`).join('');
}

// the live bits that move every second without touching the stage: the oven window, the clocks
function bakeryTick(force) {
  if (!bakeryOpen()) return;
  const ph = bakeryPhase(), ov = ovenState(), left = ov.startedAt ? Math.max(0, (ov.ms || BAKE_MS) - (Date.now() - ov.startedAt)) : 0, f = bakeryBakeFrac();
  const oven = document.getElementById('bkOven'); oven.dataset.phase = ph;
  oven.style.setProperty('--bk-rise', ph === 'baking' ? (0.35 + f * 0.65).toFixed(3) : ph === 'ready' ? 1 : 0.35);
  const clock = document.getElementById('bkClock'), big = document.getElementById('bkBigClock');
  const t = ph === 'baking' ? `⏳ ${fmtClock(left)}` : ph === 'ready' ? '🍞 Ready!' : 'Oven is warm';
  clock.textContent = t; if (big) big.innerHTML = `<b>${fmtClock(left)}</b><small>until it is ready</small>`;
  if (ph !== bakeryUi.lastPhase && !force) bakeryRender();
  bakeryUi.lastPhase = ph;
}

/* ---- the hands-on part ---- */
function bakeryKneadAdd(amount, x, y) {
  const u = bakeryUi; if (u.step !== 'knead') return;
  u.knead = Math.min(1, u.knead + amount);
  const m = document.getElementById('bkMeter'); if (m) m.style.width = Math.round(u.knead * 100) + '%';
  const d = document.getElementById('bkDough'); if (d) { d.style.setProperty('--k', u.knead.toFixed(3)); if (x != null) bakeryPuff(d, x, y); }
  if (u.knead >= 1) { sfx('claim'); buzz(HAP.found); scene.text = 'Smooth as anything. Now a few cuts across the top, so it can breathe.'; u.step = 'score'; u.cuts = []; setTimeout(bakeryRender, 260); }
}
function bakeryPuff(host, x, y) {
  const r = host.getBoundingClientRect(), p = document.createElement('i'); p.className = 'bk-puff';
  p.style.left = (x - r.left) + 'px'; p.style.top = (y - r.top) + 'px'; host.appendChild(p); setTimeout(() => p.remove(), 700);
}
function bakeryAddCut(x0, y0, x1, y1) {
  const loaf = document.getElementById('bkLoaf'); if (!loaf || bakeryUi.step !== 'score') return false;
  const r = loaf.getBoundingClientRect(), len = Math.hypot(x1 - x0, y1 - y0);
  const inside = (x, y) => x >= r.left - 14 && x <= r.right + 14 && y >= r.top - 14 && y <= r.bottom + 14;
  if (len < BK_MIN_SLASH || !(inside(x0, y0) || inside(x1, y1) || inside((x0 + x1) / 2, (y0 + y1) / 2))) return false;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  bakeryUi.cuts.push({ x: Math.max(12, Math.min(88, ((mx - r.left) / r.width) * 100)), y: Math.max(18, Math.min(82, ((my - r.top) / r.height) * 100)), len: Math.min(70, (len / r.width) * 100), a: Math.round(Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI) });
  sfx('tap'); buzz(HAP.tap); bakeryDrawCuts();
  if (bakeryUi.cuts.length >= BK_SLASHES) { scene.text = 'Lovely. Into the oven it goes: drag it up to the door.'; bakeryUi.step = 'load'; setTimeout(bakeryRender, 320); }
  return true;
}
function bakeryLoad() {
  if (bakeryPhase() !== 'idle') return;
  const loaf = document.getElementById('bkLoaf'); if (loaf) loaf.classList.add('going');
  scene.text = ovenAction(); sfx('claim'); buzz(HAP.found);
  bakeryUi.step = 'knead'; bakeryUi.knead = 0; bakeryUi.cuts = [];
  setTimeout(() => { if (scene) renderScene(); }, 520);
}
function bakeryCollect() {
  if (bakeryPhase() !== 'ready') return;
  const loaf = document.getElementById('bkLoaf'); if (loaf) loaf.classList.add('going');
  const bsk = document.getElementById('bkBasketDrop'); if (bsk) bsk.classList.add('catch');
  scene.text = ovenAction();
  setTimeout(() => { if (scene) renderScene(); }, 560);
}

function bakeryWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#bkLeave')) { sceneAction('leave'); return; }
    const spot = e.target.closest('[data-bk]');
    if (spot) { sfx('tap'); buzz(HAP.tap); sceneAction(spot.dataset.bk); return; }
  });
  el.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest('#bkDough, #bkLoaf'); if (!t) return; e.preventDefault(); bakeryTap(t);
  });
  // one pointer handler for every hands-on step: rub the dough, swipe the loaf, drag the loaf to the oven or the basket
  let g = null;
  el.addEventListener('pointerdown', e => {
    const dough = e.target.closest('#bkDough');
    let loaf = e.target.closest('#bkLoaf');
    if (!loaf && !dough && bakeryUi.step === 'score' && bakeryPhase() === 'idle' && e.target.closest('.bk-board')) loaf = document.getElementById('bkLoaf');   // a swipe may start on the board beside the loaf
    if (!dough && !loaf) return;
    e.preventDefault(); try { (dough || loaf).setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (loaf) loaf.classList.add('dragging');
    g = { id: e.pointerId, dough: !!dough, el: dough || loaf, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, dist: 0, moved: 0 };
  });
  el.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py, d = Math.hypot(dx, dy); g.px = e.clientX; g.py = e.clientY; g.moved += d;
    if (g.dough) { if (bakeryUi.step === 'knead' && d) { bakeryKneadAdd(d / BK_KNEAD_PX, e.clientX, e.clientY); g.el.style.setProperty('--sq', (Math.sin(g.moved / 26)).toFixed(2)); } }
    else if (bakeryUi.step === 'load' || bakeryPhase() === 'ready') g.el.style.transform = `translate(${e.clientX - g.x0}px, ${e.clientY - g.y0}px)`;
  });
  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const a = g; g = null; a.el.classList.remove('dragging');
    if (a.dough) { a.el.style.removeProperty('--sq'); if (a.moved < 8) bakeryTap(a.el); return; }
    if (bakeryUi.step === 'score' && bakeryPhase() === 'idle') { if (a.moved < 8) bakeryTap(a.el); else bakeryAddCut(a.x0, a.y0, e.clientX, e.clientY); return; }
    const tapped = a.moved < 8;
    if (bakeryPhase() === 'idle' && bakeryUi.step === 'load') {
      const o = document.getElementById('bkOven').getBoundingClientRect(), lr = a.el.getBoundingClientRect(), cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
      if (tapped || (cx > o.left && cx < o.right && cy > o.top - 20 && cy < o.bottom)) { a.el.style.transform = ''; bakeryLoad(); } else a.el.style.transform = '';
    } else if (bakeryPhase() === 'ready') {
      const b = document.getElementById('bkBasketDrop'), lr = a.el.getBoundingClientRect(), cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
      const br = b ? b.getBoundingClientRect() : null;
      if (tapped || (br && cx > br.left - 30 && cx < br.right + 30 && cy > br.top - 30 && cy < br.bottom + 30)) { a.el.style.transform = ''; bakeryCollect(); } else a.el.style.transform = '';
    }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
// a plain tap does the step's job, for anyone who would rather not scrub or swipe
function bakeryTap(t) {
  const u = bakeryUi;
  if (t.id === 'bkDough') { if (u.step === 'knead') { sfx('tap'); bakeryKneadAdd(BK_TAP_KNEAD, null); } return; }
  if (u.step === 'score') {
    const loaf = document.getElementById('bkLoaf'), r = loaf.getBoundingClientRect(), y = r.top + r.height * (0.3 + 0.2 * u.cuts.length);
    bakeryAddCut(r.left + r.width * 0.25, y + 12, r.left + r.width * 0.75, y - 12); return;
  }
  if (u.step === 'load') bakeryLoad(); else if (bakeryPhase() === 'ready') bakeryCollect();
}

/* ---- opening and closing: the scene decides (see bakeryScreenSync in renderScene) ---- */
function bakeryScreenHide() {
  if (!bakeryEl || bakeryEl.classList.contains('hidden')) return;
  bakeryEl.classList.add('hidden'); document.body.classList.remove('in-bakery');
}
// called at the end of renderScene(): show the kitchen over the bakery's home view, put it away for Cook and the mini-game
function bakeryScreenSync() {
  const home = !!scene && scene.id === 'bakery' && !scene.mode && !(typeof mini !== 'undefined' && mini);
  if (!home) { bakeryScreenHide(); return; }
  const el = bakeryEl || bakeryBuild(), was = bakeryOpen();
  screenFxShow(el); document.body.classList.add('in-bakery');
  if (!was) { bakeryUi.step = 'knead'; bakeryUi.knead = 0; bakeryUi.cuts = []; }   // a fresh visit starts at the dough
  const sig = [bakeryPhase(), bakeryUi.step, scene.text, breadCount(), buildingState('bakery').roll, miniState('frost').rewarded].join('|');
  if (!was || sig !== bakeryUi.sig) { bakeryUi.sig = sig; bakeryRender(); } else bakeryTick();
}
