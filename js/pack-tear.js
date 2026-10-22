/* ============================================================
   TEARING A PACK OPEN (build 313): buying a pack in the Card Shop used to charge you and flip a card at once. Now the foil pack is
   held up full screen first: swipe across its top to rip the strip off (or tap it three times), and only then does buyPack() charge
   you and show the face-down card. Nothing is charged until it tears; "Put it back" leaves with your money. Reduced motion, a pack you
   cannot afford, and the spice stall's deal (which calls buyPack itself) skip it.
   ============================================================ */
let packTearEl = null, packTearUi = null;
const PACK_TEAR_TAP = 0.34;

function packTearStart(pack) {
  if (packTearEl) return;
  if (state.progress.pebbles < packPrice(pack)) return false;
  if (typeof btMotionOk === 'function' && !btMotionOk()) return false;
  packTearUi = { pack, tear: 0, torn: false, x0: null, id: null };
  const el = document.createElement('div'); el.id = 'packTear'; el.className = 'pack-tear'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Open the ${pack.name}`);
  el.innerHTML = `<div class="ptr-sparks" aria-hidden="true">${'<i></i>'.repeat(10)}</div>
    <b class="ptr-title">${pack.name}</b>
    <div class="ptr-pack" id="ptPack" role="button" tabindex="0" aria-label="${pack.name}: swipe across the top to tear it open, or tap it three times">
      <div class="ptr-flap" id="ptFlap"><span class="ptr-crimp" aria-hidden="true"></span></div>
      <div class="ptr-body"><span class="ptr-icon" aria-hidden="true">${pack.icon}</span><b>${pack.name}</b><small>${pack.floorLabel}</small></div>
      <div class="ptr-line" aria-hidden="true"><i id="ptFill"></i></div>
    </div>
    <p class="ptr-hint" id="ptHint">Swipe across the top to tear it open. (Or tap it three times.)</p>
    <button type="button" class="btn btn-ghost pt-leave" id="ptLeave">Put it back</button>`;
  document.body.appendChild(el); packTearEl = el; packTearWire(el); sfx('nav');
  requestAnimationFrame(() => el.classList.add('in'));
  return true;
}
function packTearSet(v) {
  const u = packTearUi; if (!u || u.torn) return;
  u.tear = Math.max(u.tear, Math.min(1, v));
  packTearEl.style.setProperty('--tear', u.tear.toFixed(3));
  if (u.tear >= 1) packTearDone();
}
function packTearDone() {
  const u = packTearUi; if (u.torn) return; u.torn = true;
  packTearEl.classList.add('torn'); sfx('claim'); buzz(HAP.big);
  document.getElementById('ptHint').textContent = '';
  setTimeout(() => { const p = u.pack; packTearClose(); ensureAudio(); if (!buyPack(p.id)) { toast(`Not enough ${GAME.currency.many} yet`); sfx('tie'); } }, 520);
}
function packTearClose() {
  if (!packTearEl) return;
  const el = packTearEl; packTearEl = null; packTearUi = null;   // gone for logic at once; the picture fades out
  el.removeAttribute('id'); el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));   // so a fading copy is never mistaken for the live one
  el.classList.add('bye'); setTimeout(() => el.remove(), 220);
}

function packTearWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#ptLeave')) { sfx('nav'); packTearClose(); return; }
    if (e.target.closest('#ptPack') && packTearUi && !packTearUi.swiped) { packTearSet(packTearUi.tear + PACK_TEAR_TAP); sfx('tap'); buzz(HAP.tap); }
  });
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('#ptPack')) { e.preventDefault(); packTearSet(packTearUi.tear + PACK_TEAR_TAP); } });
  el.addEventListener('pointerdown', e => {
    const pk = e.target.closest('#ptPack'); if (!pk || !packTearUi) return;
    e.preventDefault(); const r = pk.getBoundingClientRect();
    Object.assign(packTearUi, { id: e.pointerId, x0: e.clientX, y0: e.clientY, w: r.width, swiped: false, top: r.top + r.height * 0.3 });
  });
  el.addEventListener('pointermove', e => {
    const u = packTearUi; if (!u || u.id !== e.pointerId || u.torn) return;
    const dx = e.clientX - u.x0; if (Math.abs(dx) > 8) u.swiped = true;
    if (e.clientY > u.top + 60) return;   // the tear follows the top strip: pull down away from it and it stops
    packTearSet(Math.abs(dx) / (u.w * 0.8));
  });
  const end = e => { const u = packTearUi; if (!u || u.id !== e.pointerId) return; u.id = null; setTimeout(() => { if (packTearUi) packTearUi.swiped = false; }, 50); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
