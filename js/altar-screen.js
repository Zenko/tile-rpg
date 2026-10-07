/* ============================================================
   THE ALTAR SCREEN (build 175): the candles, full screen. Opened from the cottage altar's "Light the candles" button. It is
   the view for the rules in js/summoning.js (THE CANDLES): nothing here decides a spirit, it only feeds altarDraft and calls
   altarGo / altarCollect.
     - Four candles stand at the compass points around a bowl, each with a riddle under its name (CANDLE_CLUES).
     - Cards come from a tray under the stage, one family tab at a time. Drag a card up onto its candle, or tap it. A card on
       the wrong candle makes it sputter and says where the card belongs.
     - The four gods have to find their own candle: tap a god, then tap the candle its riddle points at (or drag it there).
       Put all four on their candles, with nothing else, and the Atlas answers. Nothing is used up.
     - Calling: when the flames can speak, the bowl glows and pulses and you hold it until its ring closes, or tap the big call
       button pinned to the bottom (it is always on screen, and shimmers when it is ready).
   Layering: the card reveal (#pickupOverlay) is a plain overlay at z-index 20, so while this screen is open body.in-altar lifts
   every overlay above it (see css/latest.css).
   ============================================================ */
const CANDLE_CLUES = { wind: 'Where whispers rise', grove: 'Where thoughts take root', tide: 'Where the water settles', stone: 'Where the door stays shut' };
const CANDLE_POS = { wind: 'n', grove: 'e', tide: 's', stone: 'w' };
const HOLD_MS = 900;
let altarUi = null, altarEl = null;

// Where a card may go: a spare card only on its own family's candle; a god only on the candle its riddle points at.
function altarPlace(id, fam) {
  const home = CARD_FAMILY[id], d = cardDef(id);
  if (fam !== home) return { ok: false, fizz: true, msg: altarIsGod(id) ? `The candle sputters. ${d.name} does not belong where "${CANDLE_CLUES[fam].toLowerCase()}".` : `${d.name} belongs to the ${FAMILIES[home].name} candle.` };
  const m = altarAdd(id); return { ok: !m, msg: m };
}
function altarSay(t) {
  if (!altarUi) return; altarUi.msg = t; clearTimeout(altarUi.msgT);
  altarUi.msgT = setTimeout(() => { if (altarUi) { altarUi.msg = ''; altarRender(); } }, 3000); altarRender();
}
function altarOwnedGods() { return ALTAR_GODS.filter(g => state.ownedCards.includes(g) && !altarFedCount(g)); }

function altarBuildScreen() {
  const el = document.createElement('div'); el.id = 'altarScreen'; el.className = 'altar-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The altar');
  el.innerHTML = `<div class="as-embers" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
    <div class="as-bar"><button type="button" class="as-x" id="asX" aria-label="Close the altar">✕</button><b class="as-title">The altar</b><button type="button" class="as-book" id="asBook"></button></div>
    <div class="as-pil" id="asPil"></div><div class="as-smoke" id="asSmoke" aria-live="polite"></div>
    <div class="as-stage" id="asStage">${Object.keys(CANDLE_POS).map(f => `<div class="as-c pos-${CANDLE_POS[f]}" data-fam="${f}"></div>`).join('')}<button type="button" class="as-bowl" id="asBowl" aria-label="Hold to call the spirit"><svg viewBox="0 0 132 132" aria-hidden="true"><circle class="as-ring" id="asRing" cx="66" cy="66" r="64"/></svg><span class="as-core"><i>🔥</i><span id="asBowlTxt"></span></span></button></div>
    <div class="as-burns" id="asBurns"></div><p class="as-hint" id="asHint"></p><div class="as-tabs" id="asTabs"></div><div class="as-tray" id="asTray"></div>
    <div class="as-cta"><button type="button" class="as-call" id="asCall"></button></div><div class="as-sheet hidden" id="asSheet"></div>`;
  document.body.appendChild(el); altarEl = el; altarWire(el); return el;
}
function openAltarScreen() {
  altarDraft = null; altarDraftNow();
  altarUi = { sel: ALTAR_FAMS.find(f => altarSpares(f).length) || 'stone', armed: null, msg: '', msgT: 0, hold: null, book: false };
  const el = altarEl || altarBuildScreen(); el.classList.remove('hidden'); document.body.classList.add('in-altar');
  showTipOnce('candles'); sfx('nav'); altarRender();
}
function closeAltarScreen() {
  if (!altarEl || altarEl.classList.contains('hidden')) return;
  clearTimeout(altarUi && altarUi.msgT); altarEl.classList.add('hidden'); document.body.classList.remove('in-altar'); altarUi = null; altarDraft = null; sfx('nav');
  if (typeof inScene !== 'undefined' && inScene && scene) renderScene();   // the altar menu behind it shows the new god rows and pillar state
}
const altarOpen = () => !!altarUi && !!altarEl && !altarEl.classList.contains('hidden');

function altarRender() {
  if (!altarOpen()) return;
  const d = altarDraftNow(), r = altarRead(), ready = r.atlas || (!!r.key && !r.mixed), st = altarState();
  $$altar('.as-c').forEach(c => {
    const f = c.dataset.fam, fu = r.fuel[f], god = d.feed[f].some(altarIsGod), s = god ? 1.7 : fu ? Math.min(2.1, 0.55 + fu * 0.17) : 0.3;
    c.classList.toggle('sel', altarUi.sel === f); c.classList.toggle('arm', !!altarUi.armed);
    c.innerHTML = `<div class="as-fw"><i class="as-flame${god ? ' god' : ''}" style="transform:scale(${s});opacity:${fu || god ? 1 : 0.2}"></i></div><i class="as-wick"></i><button type="button" class="as-wax" data-wax="${f}" aria-label="${FAMILIES[f].name} candle, ${d.feed[f].length} cards"></button>
      <div class="as-fed">${d.feed[f].map((id, i) => `<button type="button" data-rm="${f}:${i}" aria-label="Take ${escapeHtml(cardDef(id).name)} back">${cardDef(id).icon}</button>`).join('')}</div><b class="as-lbl">${FAMILIES[f].icon} ${FAMILIES[f].name}</b><span class="as-clue">${CANDLE_CLUES[f]}</span>`;
  });
  $$altar('#asSmoke')[0].textContent = altarSmoke(r);
  const bowl = $$altar('#asBowl')[0]; bowl.className = 'as-bowl' + (ready ? ' ready' : '') + (r.atlas ? ' atlas' : '');
  $$altar('#asBowlTxt')[0].textContent = ready ? (r.atlas ? 'Hold to call the Atlas' : 'Hold to call') : 'Feed the candles';
  $$altar('#asBurns')[0].innerHTML = r.atlas ? '' : ALTAR_BURNS.map(b => `<button type="button" class="as-chip${d.burn === b.id ? ' on' : ''}" data-burn="${b.id}"><b>${b.label}</b><small>${b.sub}</small></button>`).join('');
  $$altar('#asHint')[0].textContent = altarUi.msg || (altarUi.armed ? `Tap the candle where ${cardDef(altarUi.armed).name} belongs, or drag it there.` : ready ? 'Hold the glowing bowl until its ring closes, or tap the button below.' : 'Drag a card up onto its candle, or just tap it.');
  const gods = altarOwnedGods();
  $$altar('#asTabs')[0].innerHTML = ALTAR_FAMS.map(f => `<button type="button" class="as-tab${altarUi.sel === f ? ' on' : ''}" data-tab="${f}">${FAMILIES[f].icon} ${altarSpares(f).reduce((n, x) => n + x.left, 0)}</button>`).join('') + (gods.length ? `<button type="button" class="as-tab god${altarUi.sel === 'gods' ? ' on' : ''}" data-tab="gods">✨ Gods</button>` : '');
  if (altarUi.sel === 'gods' && !gods.length) altarUi.sel = ALTAR_FAMS[0];
  const list = altarUi.sel === 'gods' ? gods.map(id => ({ id, left: 1 })) : altarSpares(altarUi.sel);
  $$altar('#asTray')[0].innerHTML = list.length ? list.map(x => { const c = cardDef(x.id); return `<button type="button" class="as-card r-${c.rarity}${altarUi.armed === x.id ? ' armed' : ''}" data-id="${x.id}" data-fam="${CARD_FAMILY[x.id]}"><span class="q">${altarIsGod(x.id) ? '✨' : '×' + x.left}</span><span class="i">${c.icon}</span><b>${escapeHtml(c.name)}</b><small>${RARITY_LABEL[c.rarity]}</small></button>`; }).join('')
    : `<p class="as-none">${altarUi.sel === 'gods' ? 'No gods are home yet.' : `No spare ${FAMILIES[altarUi.sel].name} cards. Cards in your deck are never used.`}</p>`;
  const call = $$altar('#asCall')[0]; call.disabled = !ready; call.className = 'as-call' + (ready ? ' ready' : '') + (r.atlas ? ' atlas' : '');
  call.innerHTML = ready ? `<span class="fl">${r.atlas ? '🗺️' : '🔥'}</span>${r.atlas ? 'Call the Atlas' : 'Let the flames speak'}` : (r.mixed ? 'Give each god its own candle' : 'Feed a candle to begin');
  const pil = $$altar('#asPil')[0];
  pil.innerHTML = st.burning.map((b, i) => altarDone(b) ? `<button type="button" class="rdy" data-collect="${i}">✨ ${escapeHtml(b.name)} · collect</button>` : `<span>🕯️ ${escapeHtml(b.name)} · <i data-alt-left="${i}">${altarLeft(b)}</i></span>`).join('');
  const keys = altarKeys(), got = keys.filter(k => st.found[k]).length; $$altar('#asBook')[0].textContent = `📖 ${got}/${keys.length}`;
  const sheet = $$altar('#asSheet')[0]; sheet.classList.toggle('hidden', !altarUi.book);
  if (altarUi.book) sheet.innerHTML = `<div class="as-sh-h"><b>Spirit Book</b><span>${got}/${keys.length}</span><button type="button" id="asBookX" aria-label="Close the book">✕</button></div><div class="as-sh-b">${keys.map(k => `<span class="${st.found[k] ? 'got' : ''}">${st.found[k] ? escapeHtml(altarName(k)) : '???'}</span>`).join('')}</div>`;
}
const $$altar = sel => altarEl ? [...altarEl.querySelectorAll(sel)] : [];

function altarFizz(fam) { const c = $$altar(`.as-c[data-fam="${fam}"]`)[0]; if (!c) return; c.classList.add('nope'); setTimeout(() => c.classList.remove('nope'), 450); sfx('soft'); buzz(HAP.tap); }
function altarDrop(id, fam) {
  const res = altarPlace(id, fam);
  if (res.ok) { altarUi.sel = fam; altarUi.armed = null; altarRender(); } else { if (res.fizz) altarFizz(fam); altarSay(res.msg); }
}
function altarCall() {
  const r = altarRead(); if (!(r.atlas || (r.key && !r.mixed))) { altarSay(r.mixed ? 'The gods do not burn. Give each its own candle, with nothing else.' : 'The candles are cold. Feed one a card.'); return; }
  const text = altarGo(); altarUi.armed = null; altarSay(text);
}
function altarWire(el) {
  el.querySelector('#asX').onclick = closeAltarScreen;
  el.querySelector('#asBook').onclick = () => { altarUi.book = !altarUi.book; sfx('tap'); altarRender(); };
  el.querySelector('#asCall').onclick = altarCall;
  el.addEventListener('click', e => {
    if (!altarUi) return;
    const rm = e.target.closest('[data-rm]'), burn = e.target.closest('[data-burn]'), tab = e.target.closest('[data-tab]'), col = e.target.closest('[data-collect]'), c = e.target.closest('.as-c'), card = e.target.closest('.as-card');
    if (e.target.closest('#asBookX')) { altarUi.book = false; altarRender(); return; }
    if (rm) { e.stopPropagation(); const [f, i] = rm.dataset.rm.split(':'); altarDraftNow().feed[f].splice(+i, 1); sfx('tap'); altarRender(); return; }
    if (burn) { altarDraftNow().burn = burn.dataset.burn; sfx('tap'); altarRender(); return; }
    if (tab) { altarUi.sel = tab.dataset.tab; sfx('tap'); altarRender(); return; }
    if (col) { altarSay(altarCollect(+col.dataset.collect)); return; }
    if (c) { const f = c.dataset.fam; if (altarUi.armed) altarDrop(altarUi.armed, f); else { altarUi.sel = f; sfx('tap'); altarRender(); } return; }
    if (card) {
      if (altarUi.dragged) { altarUi.dragged = false; return; }
      const id = card.dataset.id;
      if (altarIsGod(id)) { altarUi.armed = altarUi.armed === id ? null : id; sfx('tap'); altarRender(); }
      else { const m = altarAdd(id); if (m) altarSay(m); else altarRender(); }
    }
  });
  // drag a card up onto a candle (a tap also feeds it; a god is placed by tapping it, then its candle, or by dragging)
  const tray = el.querySelector('#asTray'); let st = null, ghost = null;
  const under = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest('#altarScreen .as-c'); };
  tray.addEventListener('pointerdown', e => { altarUi.dragged = false; const c = e.target.closest('.as-card'); if (c) st = { id: c.dataset.id, x: e.clientX, y: e.clientY, drag: false }; });
  window.addEventListener('pointermove', e => {
    if (!st) return;
    if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 12 && st.y - e.clientY > 6) { st.drag = true; altarUi.dragged = true; ghost = document.createElement('div'); ghost.className = 'as-ghost'; const c = cardDef(st.id); ghost.innerHTML = `<span>${c.icon}</span><b>${escapeHtml(c.name)}</b>`; document.body.appendChild(ghost); }
    if (st.drag) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; const u = under(e.clientX, e.clientY); $$altar('.as-c').forEach(x => x.classList.toggle('hot', x === u)); }
  });
  const end = e => {
    if (!st) return; const s = st; st = null; if (ghost) { ghost.remove(); ghost = null; } $$altar('.as-c').forEach(x => x.classList.remove('hot'));
    if (s.drag) { const u = under(e.clientX, e.clientY); if (u) altarDrop(s.id, u.dataset.fam); }
  };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', () => { st = null; if (ghost) { ghost.remove(); ghost = null; } });
  // hold the bowl until the ring closes
  const bowl = el.querySelector('#asBowl'), ring = el.querySelector('#asRing');
  const stop = () => { if (altarUi && altarUi.hold) { cancelAnimationFrame(altarUi.hold.raf); altarUi.hold = null; } ring.style.strokeDashoffset = 402; $$altar('.as-flame').forEach(f => { f.style.filter = ''; }); };
  bowl.addEventListener('pointerdown', e => {
    e.preventDefault(); if (!altarUi) return; const r = altarRead();
    if (!(r.atlas || (r.key && !r.mixed))) { altarSay(r.mixed ? 'The gods do not burn. Give each its own candle, with nothing else.' : 'Nothing is ready yet. Feed the candles first.'); sfx('soft'); return; }
    bowl.setPointerCapture(e.pointerId); const t0 = performance.now(); altarUi.hold = { raf: 0 }; sfx('tap');
    const step = now => { if (!altarUi || !altarUi.hold) return; const p = Math.min(1, (now - t0) / HOLD_MS); ring.style.strokeDashoffset = 402 * (1 - p); $$altar('.as-flame').forEach(f => { f.style.filter = `drop-shadow(0 0 ${9 + p * 22}px var(--fc)) brightness(${1 + p * 0.6})`; });
      if (p >= 1) { stop(); buzz(HAP.big); altarCall(); } else altarUi.hold.raf = requestAnimationFrame(step); };
    altarUi.hold.raf = requestAnimationFrame(step);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => bowl.addEventListener(ev, stop));
  bowl.addEventListener('contextmenu', e => e.preventDefault());
}
// Once a second while the screen is open: count the pillars down, and redraw when one finishes.
setInterval(() => {
  if (!altarOpen()) return; const b = altarBurning(); if (!b.length) return;
  if (b.some((x, i) => altarDone(x) && !altarEl.querySelector(`[data-collect="${i}"]`))) { altarRender(); return; }
  $$altar('[data-alt-left]').forEach(n => { const x = b[+n.dataset.altLeft]; if (x) n.textContent = altarLeft(x); });
}, 1000);
