/* ============================================================
   THE TINKER STALL SCREEN (build 308): Tock's stall, full screen, the fourth building screen (pattern: js/bakery-screen.js).
   Over the stall's scene while it shows its home view or runs Fix the Clockwork; anything else puts it away. Rules stay put:
   baitAction() / BAIT_STOCK and the daily 'sort' reward in js/houses-and-cellar.js, and MINIGAMES.gears (with its medals) in
   js/puzzle-memory-minigames.js. This file is the hands-on way to reach them.
     - Bait: three crates on the shelf. Tap one to buy it; it drops into your tackle box and the count goes up (the same purchase as
       the old counter, one tap, price on the crate).
     - Spare parts (once a day): sort the pile into cog, screw and spring bins. Drag a part into its bin, or tap the part and then
       the bin. A wrong bin makes the part bounce back. Sort all six and the daily job pays, exactly as the old button did.
     - Fix the Clockwork: the sliding gears, played here. Drag a gear into the gap (or tap it) and it slides and turns.
   ============================================================ */
let tinkerEl = null, tinkerUi = { sig: '', parts: [], sel: null, left: 0 };
const TN_SORT_PARTS = 6;
const tinkerOpen = () => !!tinkerEl && !tinkerEl.classList.contains('hidden');
const tinkerGame = () => (typeof mini !== 'undefined' && mini && mini.id === 'gears' ? mini : null);
const tinkerSorted = () => buildingState('stall-tinker').sort === todayKey();

function tinkerBuild() {
  const el = document.createElement('div'); el.id = 'tinkerScreen'; el.className = 'tinker-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${CAST.tinker.name}'s tinker stall`);
  el.innerHTML = `<div class="tn-bar"><span aria-hidden="true"></span><b class="tn-title">${CAST.tinker.name}'s Tinker Stall</b><span class="tn-chip" id="tnChip"></span></div>
    <div class="tn-maker"><span class="tn-seller" aria-hidden="true">${CAST.tinker.icon}</span><p class="tn-say" id="tnSay" aria-live="polite"></p></div>
    <div class="tn-stage" id="tnStage"></div>
    <p class="tn-hint" id="tnHint"></p>
    <div class="tn-foot" id="tnFoot"></div>
    <button type="button" class="btn btn-ghost tn-leave" id="tnLeave">Leave</button>`;
  document.body.appendChild(el); tinkerEl = el; tinkerWire(el); return el;
}

function tinkerRender() {
  if (!tinkerOpen()) return;
  const g = tinkerGame(), $ = id => document.getElementById(id);
  tinkerEl.dataset.mode = g ? (g.done ? 'over' : 'game') : 'shop';
  $('tnChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('tnSay').textContent = (scene && scene.text) || '';
  if (g) tinkerRenderGame($, g); else tinkerRenderShop($);
}

function tinkerRenderShop($) {
  const ms = miniState('gears'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded), sorted = tinkerSorted();
  if (!tinkerUi.parts.length || tinkerUi.fresh !== todayKey()) { tinkerUi.parts = Array.from({ length: TN_SORT_PARTS }, () => TINKER_PARTS[rand(3)]); tinkerUi.fresh = todayKey(); tinkerUi.left = TN_SORT_PARTS; tinkerUi.sel = null; }
  const crates = BAIT_STOCK.map(b => {
    const ks = Object.keys(b.give), parts = ks.map(k => `${ks.length > 1 ? INGREDIENTS[k].icon : ''}×${b.give[k]}`).join(' ');
    return `<button type="button" class="tn-crate" data-bait="${b.id}" aria-label="${b.name}, ${b.cost} ${GAME.currency.many}"><span class="tn-crate-ico" aria-hidden="true">${b.icon}</span><b>${b.name}</b><small>${parts}</small><span class="tn-price">🫧 ${b.cost}</span></button>`;
  }).join('');
  const bench = sorted
    ? `<div class="tn-bench done"><b>🔧 The bench is tidy</b><small>${CAST.tinker.name} waves you off. "Parts are sorted! Come back tomorrow."</small></div>`
    : `<div class="tn-bench" id="tnBench"><div class="tn-pile" id="tnPile">${tinkerUi.parts.map((k, i) => (k ? tinkerPartHtml(k, i) : '')).join('')}</div>
        <div class="tn-bins">${TINKER_BINS.map(b => `<button type="button" class="tn-bin" data-bin="${b.id}" aria-label="${b.name} bin"><span aria-hidden="true">${b.icon}</span><b>${b.name}</b></button>`).join('')}</div></div>`;
  $('tnStage').innerHTML = `<div class="tn-shelf"><div class="tn-tackle" aria-live="polite"><span aria-hidden="true">🧰</span><b>🌼 ${ingredientCount('flowers')}</b><b>🐟 ${ingredientCount('fish')}</b></div><div class="tn-crates">${crates}</div></div>${bench}`;
  $('tnHint').textContent = sorted ? '' : tinkerUi.left ? 'Drag each spare part into its bin. (Or tap a part, then its bin.)' : '';
  $('tnFoot').innerHTML = `<button type="button" class="tn-play" data-tn="mg-gears"><span aria-hidden="true">⚙️</span><b>Fix the Clockwork</b><small>${left ? `${left} prize${left === 1 ? '' : 's'} left today` : 'just for fun today'}</small></button>`;
}
const tinkerPartHtml = (k, i) => `<button type="button" class="tn-part ${k}${tinkerUi.sel === i ? ' sel' : ''}" data-part="${i}" data-kind="${k}" aria-label="A spare ${k}" style="--i:${i}"><span aria-hidden="true">${TINKER_BINS.find(b => b.id === k).icon}</span></button>`;

/* ---- the gears: eight persistent elements slid into place, so a move animates ---- */
function tinkerRenderGame($, g) {
  if (!document.getElementById('tnGears')) {
    $('tnStage').innerHTML = `<div class="tn-board"><p class="tn-moves" id="tnMoves"></p><div class="tn-gears" id="tnGears">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button type="button" class="tn-gear" data-gear="${n}" aria-label="Gear ${n}"><i class="tn-cog" aria-hidden="true">⚙️</i><b>${n}</b></button>`).join('')}</div></div>`;
    tinkerUi.spin = {};
  }
  tinkerPaint(g);
  $('tnHint').textContent = g.done ? '' : 'Slide the gears into order, 1 to 8, with the gap at the bottom right.';
  $('tnFoot').innerHTML = g.done ? `<button type="button" class="tn-play" data-tn="mg-again"><span aria-hidden="true">🔁</span><b>Play again</b></button><button type="button" class="tn-play ghost" data-tn="mg-back"><span aria-hidden="true">←</span><b>Back to the stall</b></button>`
    : `<button type="button" class="tn-play ghost" data-tn="mg-back"><span aria-hidden="true">←</span><b>Stop playing</b></button>`;
}
function tinkerPaint(g) {
  const t = g.st.tiles, mv = document.getElementById('tnMoves'); if (mv) mv.textContent = `Moves: ${g.st.moves} · gold in 26 or fewer`;
  document.querySelectorAll('#tnGears .tn-gear').forEach(b => {
    const n = +b.dataset.gear, i = t.indexOf(n), r = Math.floor(i / 3), c = i % 3;
    b.style.setProperty('--c', c); b.style.setProperty('--r', r);
    b.classList.toggle('home', n === i + 1); b.classList.toggle('next', GEAR_NEIGHBORS(t.indexOf(0)).includes(i));
    if (b.dataset.at !== undefined && b.dataset.at !== String(i)) tinkerUi.spin[n] = (tinkerUi.spin[n] || 0) + 90;   // a gear that moved turns a quarter
    b.style.setProperty('--spin', (tinkerUi.spin[n] || 0) + 'deg'); b.dataset.at = i;
  });
}
function tinkerSlide(n) {
  const g = tinkerGame(); if (!g || g.done) return;
  const t = g.st.tiles, i = t.indexOf(n), gap = t.indexOf(0); if (i < 0 || !GEAR_NEIGHBORS(gap).includes(i)) { buzz(HAP.soft); return; }
  g.def.tap(g.st, i); buzz(HAP.tap); tinkerPaint(g);
  if (gearsSolved(g.st.tiles)) tinkerEl.classList.add('solved');
}

/* ---- bait: one tap buys, the crate hops into the tackle box ---- */
function tinkerBuyBait(id, btn) {
  if (!scene) return;
  const had = state.progress.pebbles;
  scene.text = baitAction(id);
  if (state.progress.pebbles < had) { btn.classList.remove('hop'); void btn.offsetWidth; btn.classList.add('hop'); }
  else { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }
  tinkerUi.sig = ''; tinkerRender();
}

/* ---- parts: drag or tap into the right bin ---- */
function tinkerPlace(i, bin) {
  const k = tinkerUi.parts[i]; if (!k || k === '') return false;
  const el = document.querySelector(`.tn-part[data-part="${i}"]`);
  if (k !== bin) { if (el) { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); } sfx('soft'); buzz(HAP.soft); scene.text = `That one is a ${k}, not a ${bin}.`; document.getElementById('tnSay').textContent = scene.text; return false; }
  tinkerUi.parts[i] = ''; tinkerUi.sel = null; tinkerUi.left--; sfx('tap'); buzz(HAP.tap);
  if (el) el.classList.add('gone');
  const b = document.querySelector(`.tn-bin[data-bin="${bin}"]`); if (b) { b.classList.remove('catch'); void b.offsetWidth; b.classList.add('catch'); }
  if (tinkerUi.left <= 0) setTimeout(() => { if (scene) { tinkerUi.sig = ''; sceneAction('sort'); } }, 380);
  else document.getElementById('tnHint').textContent = `${tinkerUi.left} to go.`;
  return true;
}

function tinkerWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#tnLeave')) { sceneAction('leave'); return; }
    const bait = e.target.closest('[data-bait]'); if (bait) { tinkerBuyBait(bait.dataset.bait, bait); return; }
    const tn = e.target.closest('[data-tn]'); if (tn) { sfx('tap'); sceneAction(tn.dataset.tn); return; }
    const gear = e.target.closest('[data-gear]'); if (gear && e.detail === 0) { tinkerSlide(+gear.dataset.gear); return; }   // keyboard; a pointer already moved it on press
    const part = e.target.closest('[data-part]');
    if (part) { const i = +part.dataset.part; if (tinkerUi.parts[i] === '') return; tinkerUi.sel = tinkerUi.sel === i ? null : i; sfx('tap'); document.querySelectorAll('.tn-part').forEach(p => p.classList.toggle('sel', +p.dataset.part === tinkerUi.sel)); return; }
    const bin = e.target.closest('[data-bin]'); if (bin && tinkerUi.sel != null) tinkerPlace(tinkerUi.sel, bin.dataset.bin);
  });
  // drags: a gear towards the gap (press and slide at least a little, or just press), a part towards its bin
  let g = null;
  el.addEventListener('pointerdown', e => {
    const gear = e.target.closest('[data-gear]'), part = e.target.closest('[data-part]');
    if (gear) { e.preventDefault(); tinkerSlide(+gear.dataset.gear); return; }
    if (!part || tinkerUi.parts[+part.dataset.part] === '') return;
    e.preventDefault(); try { part.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    part.classList.add('dragging'); g = { id: e.pointerId, el: part, i: +part.dataset.part, x0: e.clientX, y0: e.clientY, moved: 0 };
  });
  el.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0; g.moved = Math.max(g.moved, Math.hypot(dx, dy)); g.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 10}deg)`;
  });
  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const a = g; g = null; a.el.classList.remove('dragging');
    a.el.style.transform = ''; a.el.style.pointerEvents = 'none';   // it is still gliding home: look through it
    const under = document.elementFromPoint(e.clientX, e.clientY), bin = under && under.closest('[data-bin]'); a.el.style.pointerEvents = '';
    if (a.moved >= 8 && bin) tinkerPlace(a.i, bin.dataset.bin);   // a plain tap is the click handler's: it selects the part
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function tinkerScreenHide() {
  if (!tinkerEl || tinkerEl.classList.contains('hidden')) return;
  tinkerEl.classList.add('hidden'); tinkerEl.classList.remove('solved'); document.body.classList.remove('in-tinker');
}
// called at the end of renderScene(): over the stall's home view and its game, away for anything else
function tinkerScreenSync() {
  if (!scene || scene.id !== 'stall-tinker' || scene.mode || (typeof mini !== 'undefined' && mini && mini.id !== 'gears')) { tinkerScreenHide(); return; }
  const el = tinkerEl || tinkerBuild(), was = tinkerOpen(), g = tinkerGame();
  el.classList.remove('hidden'); document.body.classList.add('in-tinker');
  const sig = [scene.text, state.progress.pebbles, tinkerSorted(), g ? ['g', g.done].join(',') : '-', miniState('gears').rewarded, ingredientCount('flowers'), ingredientCount('fish')].join('|');
  const want = g ? (g.done ? 'over' : 'game') : 'shop';
  if (!was || sig !== tinkerUi.sig || el.dataset.mode !== want) { tinkerUi.sig = sig; if (!g) el.classList.remove('solved'); tinkerRender(); }
}
