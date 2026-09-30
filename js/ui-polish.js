/* ============================================================
   UI POLISH
   Small shared interface pieces that don't belong to one game system:
     - Card inspect: press and hold any element carrying data-inspect="<card id>" (collection, deck, Index, Craft,
       memory game, battle cards) to see that card large. A short tap still does whatever it did before - the
       long-press swallows only the click that would otherwise follow it.
     - Reward fly: bumpPill() on the Cards/Pebbles counters also launches a little icon from the middle of the
       screen to the counter, so a reward and the number that changed feel connected.
     - HUD shortcuts: the Cards counter opens Cards; the Pebbles counter points to the Card Shop.
     - Bottom sheets: drag the handle of a .sheet card (or the inspect card) downward to dismiss it.
   Everything here only adds listeners; nothing needs to load before it, and nothing below runs at parse time
   against another file, so its position in the load order is not critical.
   ============================================================ */

/* ---------- card inspect ---------- */
function openCardInspect(id) {
  const def = cardDef(id); if (!def) return;
  const counts = typeof ownedCardCounts === 'function' ? ownedCardCounts() : {};
  const owned = counts[id] || 0, inDeck = state.deck.filter(d => d === id).length;
  const stats = def.spell ? '<div class="ins-stat">✨ Spell</div>' : `<div class="ins-stat"><span>⚔ ${def.power}</span><span>♥ ${def.grit}</span></div>`;
  const note = def.foe ? '<div class="ins-note">✦ A unique card that only opponents carry.</div>'
    : def.crafted ? '<div class="ins-note">＋ Enhanced: sharpened by the Workshop.</div>' : '';
  const card = document.getElementById('inspectCard');
  card.innerHTML = `<div class="sheet-handle" data-sheet-handle></div>
    <div class="ins-card rarity-${def.rarity}"><span class="ins-cost">${def.cost}</span><div class="ins-icon">${cardArtHtml(def)}</div></div>
    <h2>${def.name}</h2>
    <div class="ins-sub">${RARITY_LABEL[def.rarity]} · costs ${def.cost}⚡</div>
    ${stats}
    ${hasAbility(def) ? `<div class="ins-abilities">${cardAbilityHtml(def)}</div>` : '<div class="ins-abilities dim">No keywords.</div>'}
    ${note}
    <p class="ins-story">${cardStory(def)}</p>
    <div class="ins-own">${owned ? `You own ${owned}${inDeck ? ` · ${inDeck} in your deck` : ''}` : 'Not in your collection'}</div>
    <button class="btn" id="inspectClose">Close</button>`;
  document.getElementById('inspectOverlay').classList.remove('hidden');
  document.getElementById('inspectClose').addEventListener('click', closeCardInspect);
  sfx('nav'); buzz(HAP.tap);
}
function closeCardInspect() { document.getElementById('inspectOverlay').classList.add('hidden'); }
document.getElementById('inspectOverlay').addEventListener('click', e => { if (e.target.id === 'inspectOverlay') closeCardInspect(); });

(function longPress() {
  let timer = null, sx = 0, sy = 0, fired = false;
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest && e.target.closest('[data-inspect]');
    if (!t || e.button > 0) return;
    fired = false; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { fired = true; openCardInspect(t.dataset.inspect); showTipOnce('inspect'); }, 450);
  });
  document.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => document.addEventListener(ev, cancel, true));
  // a long-press on Android also asks for a context menu; the click that follows a fired press is swallowed once
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-inspect]')) e.preventDefault(); });
  document.addEventListener('click', e => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
})();

/* ---------- reward fly to the HUD counter ---------- */
let lastFlyAt = 0;
function flyToHud(icon, pillId) {
  const target = document.getElementById(pillId);
  if (!target || !target.offsetParent) return;
  const now = Date.now(); if (now - lastFlyAt < 250) return; lastFlyAt = now;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = target.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly-reward'; el.textContent = icon;
  el.style.left = (window.innerWidth / 2) + 'px'; el.style.top = (window.innerHeight * 0.62) + 'px';
  el.style.setProperty('--dx', (r.left + r.width / 2 - window.innerWidth / 2) + 'px');
  el.style.setProperty('--dy', (r.top + r.height / 2 - window.innerHeight * 0.62) + 'px');
  document.body.appendChild(el); setTimeout(() => el.remove(), 900);
}
(function hookBumpPill() {
  const orig = bumpPill;
  bumpPill = function (id) { orig(id); if (id === 'pillCards') flyToHud('🃏', id); else if (id === 'pillPebbles') flyToHud('🫧', id); };
})();

/* ---------- HUD counters open their screens ---------- */
/* The Shop is no longer a bottom tab - it lives in the Card Shop on Market Row. The Pebbles counter points there,
   and until Market Row has opened it falls back to the Shop screen itself so a new player can still spend Pebbles. */
[['pillCards', 'collection'], ['pillPebbles', 'shop']].forEach(([id, tab]) => {
  const el = document.getElementById(id); if (!el) return;
  const go = () => {
    if (typeof inBattle !== 'undefined' && inBattle) return;
    if (typeof inScene !== 'undefined' && inScene && typeof closeScene === 'function') closeScene();
    sfx('nav'); buzz(HAP.tap);
    if (tab === 'shop' && typeof districtUnlocked === 'function' && districtUnlocked('market')) { toast('🛍️ Spend Pebbles at the Card Shop on Market Row'); return; }
    switchTab(tab);
  };
  el.addEventListener('click', go);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

/* ---------- bottom sheets: drag the handle down to dismiss ---------- */
(function sheetDrag() {
  const closers = { talkOverlay: () => closeTalk(), inspectOverlay: () => closeCardInspect() };
  let card = null, startY = 0, dy = 0, closeFn = null;
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('[data-sheet-handle]'); if (!h) return;
    card = h.closest('.overlay-card'); const ov = card && card.closest('.overlay'); closeFn = ov && closers[ov.id];
    if (!closeFn) { card = null; return; }
    startY = e.clientY; dy = 0; card.style.transition = 'none';
  });
  document.addEventListener('pointermove', e => { if (!card) return; dy = Math.max(0, e.clientY - startY); card.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (!card) return;
    const c = card, fn = closeFn; card = null; c.style.transition = ''; c.style.transform = '';
    if (dy > 90) fn();
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  // tapping the dim backdrop dismisses the talk card too
  document.getElementById('talkOverlay').addEventListener('click', e => { if (e.target.id === 'talkOverlay') closeTalk(); });
})();
