/* ============================================================
   THE SPICE STALL SCREEN (build 306): Saffron's stall, full screen, the second building after the bakery (js/bakery-screen.js has the
   pattern). It sits on top of the stall's scene whenever the scene shows its home view or runs Higher or Lower, and puts away for
   nothing else. Rules stay in js/houses-and-cellar.js (spiceDealAction, the deal) and js/puzzle-memory-minigames.js (the haggle game's
   MINIGAMES.haggle and its rewards); this file is the hands-on way to reach them.
     - The deal: today's one item sits on the counter with its price. Drag your purse onto it to pay (a plain Buy button does the same).
     - The jars: tap a hanging jar to open it, a puff of spice and a line from Saffron. Nothing is paid; it is just the stall.
     - Higher or Lower: the same game, played here. Drag the open jar UP for higher, DOWN for lower (the buttons work too), and tap the
       coin pile to take the pot. It runs on the game's own state (`mini`), so the medals, prizes and daily limit are unchanged.
   ============================================================ */
const SP_SWIPE_PX = 46;
let spiceEl = null, spiceUi = { sig: '' };
const spiceOpen = () => !!spiceEl && !spiceEl.classList.contains('hidden');
const spiceGame = () => (typeof mini !== 'undefined' && mini && mini.id === 'haggle' ? mini : null);

function spiceBuild() {
  const el = document.createElement('div'); el.id = 'spiceScreen'; el.className = 'spice-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${CAST.spiceSeller.name}'s spice stall`);
  el.innerHTML = `<div class="sp-motes" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
    <div class="sp-bar"><button type="button" class="sp-x" id="spX" aria-label="Leave the stall">✕</button><b class="sp-title">${CAST.spiceSeller.name}'s Spice Stall</b><span class="sp-chip" id="spChip"></span></div>
    <div class="sp-awning" aria-hidden="true"></div>
    <div class="sp-shelf" id="spShelf"></div>
    <div class="sp-maker"><span class="sp-seller" aria-hidden="true">${CAST.spiceSeller.icon}</span><p class="sp-say" id="spSay" aria-live="polite"></p></div>
    <div class="sp-stage" id="spStage"></div>
    <p class="sp-hint" id="spHint"></p>
    <div class="sp-foot" id="spFoot"></div>`;
  document.body.appendChild(el); spiceEl = el; spiceWire(el); return el;
}

function spiceRender() {
  if (!spiceOpen()) return;
  const g = spiceGame(), $ = id => document.getElementById(id);
  spiceEl.dataset.mode = g ? (g.done ? 'over' : 'game') : 'shop';
  $('spChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('spSay').textContent = (scene && scene.text) || '';
  $('spShelf').innerHTML = SPICE_JARS.map(j => `<button type="button" class="sp-jar" data-jar="${j.id}" data-hue="${j.hue}" aria-label="${j.name}"><i class="sp-lid"></i><i class="sp-body"></i></button>`).join('');
  if (!g) spiceRenderShop($); else spiceRenderGame($, g);
}

function spiceRenderShop($) {
  const d = spiceDeal(), sold = spiceSold(), def = d.kind === 'card' ? cardDef(d.card) : null, ms = miniState('haggle'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded), can = state.progress.pebbles >= d.price;
  const item = d.kind === 'pack'
    ? `<div class="sp-pack"><span>${d.icon}</span></div><b class="sp-name">${d.name}</b><small>${d.was ? `usually 🫧 ${d.was}` : ''}</small>`
    : `<div class="sp-card">${cardArtHtml(def)}</div><b class="sp-name">${def.icon} ${def.name}</b><small>${RARITY_LABEL[def.rarity]} · ${def.spell ? spellText(def) : `⚔${def.power} ♥${def.grit}${def.kw.length ? ' ' + kwIcons(def) : ''}`}</small>`;
  $('spStage').innerHTML = sold
    ? `<div class="sp-counter sold"><div class="sp-sold" role="status">🧺<b>Sold out until tomorrow</b><small>${CAST.spiceSeller.name} is already dreaming up the next deal.</small></div></div>`
    : `<div class="sp-counter"><div class="sp-tag">Today only</div><div class="sp-item" id="spItem" role="group" aria-label="Today's deal">${item}<span class="sp-price">🫧 ${d.price}</span></div>
        <div class="sp-purse${can ? '' : ' light'}" id="spPurse" role="button" tabindex="0" aria-label="Your purse: drag it onto the deal to pay"><span class="sp-purse-bag" aria-hidden="true">👛</span><b>${state.progress.pebbles}</b></div></div>
       <button type="button" class="sp-buy" id="spBuy">Buy · 🫧 ${d.price}</button>`;
  $('spHint').textContent = sold ? 'Come back tomorrow, or have a go at Higher or Lower.' : can ? 'Drag your purse onto the deal to pay. (Or press Buy.)' : `You need 🫧 ${d.price - state.progress.pebbles} more for this one.`;
  $('spFoot').innerHTML = `<button type="button" class="sp-play" data-sp="mg-haggle"><span aria-hidden="true">🫙</span><b>Higher or Lower</b><small>${left ? `${left} prize${left === 1 ? '' : 's'} left today` : 'just for fun today'}</small></button>`;
}

function spiceRenderGame($, g) {
  const st = g.st, pot = HAGGLE_POT[Math.min(st.streak, HAGGLE_POT.length - 1)], over = g.done, bust = st.phase === 'bust', ok = st.last && st.last.ok;
  const hist = (st.hist || []).slice(-5).map(n => `<span>${n}</span>`).join('');
  $('spStage').innerHTML = `<div class="sp-table${bust ? ' bust' : ''}">
      <div class="sp-pot" id="spPot" role="button" tabindex="0" aria-label="Take the pot: ${pot}" ${st.streak && st.phase === 'guess' && !over ? '' : 'aria-disabled="true"'}>
        <span class="sp-coins" aria-hidden="true">${'<i></i>'.repeat(Math.min(12, st.streak * 2))}</span><b>🫧 ${pot}</b><small>${over ? 'pot paid' : st.streak ? 'tap to take it' : 'streak 0'}</small></div>
      <div class="sp-jarwrap"><button type="button" class="sp-arrow up" data-sp="hi" ${st.phase === 'guess' && !over ? '' : 'disabled'} aria-label="Higher">⬆️ Higher</button>
        <div class="sp-bigjar${st.last ? (ok ? ' ok' : ' no') : ''}" id="spBigJar" aria-label="Jar number ${st.cur}"><i class="sp-biglid"></i><b>${st.cur}</b></div>
        <button type="button" class="sp-arrow down" data-sp="lo" ${st.phase === 'guess' && !over ? '' : 'disabled'} aria-label="Lower">⬇️ Lower</button></div>
      <div class="sp-hist" aria-label="Recent jars">${hist}</div></div>`;
  $('spHint').textContent = over ? '' : bust ? 'Oh no. Wrong jar.' : 'Drag the jar up for higher, down for lower.';
  $('spFoot').innerHTML = over ? `<button type="button" class="sp-play" data-sp="mg-again"><span aria-hidden="true">🔁</span><b>Play again</b></button><button type="button" class="sp-play ghost" data-sp="mg-back"><span aria-hidden="true">←</span><b>Back to the stall</b></button>`
    : `<button type="button" class="sp-play ghost" data-sp="mg-back"><span aria-hidden="true">←</span><b>Stop playing</b></button>`;
}

// every guess goes through the game's own tap(), so the pot, the bust and the medals are exactly the old game's
function spiceGuess(v) {
  const g = spiceGame(); if (!g || g.done || g.st.phase !== 'guess') return;
  if (v === 'take' && !g.st.streak) return;
  const st = g.st; st.hist = (st.hist || []).concat(st.cur);
  g.def.tap(st, v); buzz(HAP.tap);
  spiceRender();
}
function spiceBuyNow() {
  if (spiceSold() || !scene) return;
  const d = spiceDeal(), ok = state.progress.pebbles >= d.price;
  scene.text = spiceDealAction();
  if (!ok) { const p = document.getElementById('spPurse'); if (p) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); } buzz(HAP.soft); spiceRender(); return; }
  const it = document.getElementById('spItem'); if (it) it.classList.add('wrapped');
  saveState(); setTimeout(() => { if (scene) renderScene(); }, 600);
}
function spiceOpenJar(id, btn) {
  const j = SPICE_JARS.find(x => x.id === id); if (!j || !scene) return;
  sfx('tap'); buzz(HAP.tap); scene.text = `${j.name}. ${j.line}`;
  const r = btn.getBoundingClientRect(), host = spiceEl;
  for (let i = 0; i < 7; i++) { const p = document.createElement('i'); p.className = 'sp-puff'; p.dataset.hue = j.hue; p.style.left = (r.left + r.width / 2 + (Math.random() - .5) * 26) + 'px'; p.style.top = (r.bottom - 8) + 'px'; p.style.setProperty('--dx', ((Math.random() - .5) * 60).toFixed(0) + 'px'); host.appendChild(p); setTimeout(() => p.remove(), 900); }
  btn.classList.remove('open'); void btn.offsetWidth; btn.classList.add('open');
  const t = document.getElementById('spSay'); if (t) t.textContent = scene.text;
}

function spiceWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#spX')) { sceneAction('leave'); return; }
    if (e.target.closest('#spBuy')) { spiceBuyNow(); return; }
    const jar = e.target.closest('[data-jar]'); if (jar) { spiceOpenJar(jar.dataset.jar, jar); return; }
    const sp = e.target.closest('[data-sp]');
    if (sp && !sp.disabled) { const a = sp.dataset.sp; if (a === 'hi' || a === 'lo') spiceGuess(a); else { sfx('tap'); sceneAction(a); } return; }
    if (e.target.closest('#spPot')) spiceGuess('take');
  });
  el.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('#spPot')) { e.preventDefault(); spiceGuess('take'); } else if (e.target.closest('#spPurse')) { e.preventDefault(); spiceBuyNow(); }
  });
  // two drags: the purse onto the deal, and the open jar up or down
  let g = null;
  el.addEventListener('pointerdown', e => {
    const purse = e.target.closest('#spPurse'), jar = e.target.closest('#spBigJar');
    if (!purse && !jar) return;
    if (jar && (!spiceGame() || spiceGame().done || spiceGame().st.phase !== 'guess')) return;
    e.preventDefault(); const t = purse || jar; try { t.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    t.classList.add('dragging'); g = { id: e.pointerId, el: t, purse: !!purse, x0: e.clientX, y0: e.clientY, moved: 0 };
  });
  el.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0; g.moved = Math.max(g.moved, Math.hypot(dx, dy));
    g.el.style.transform = g.purse ? `translate(${dx}px, ${dy}px) rotate(${Math.max(-12, Math.min(12, dx / 8))}deg)` : `translateY(${Math.max(-70, Math.min(70, dy))}px)`;
  });
  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const a = g; g = null; a.el.classList.remove('dragging');
    const dy = e.clientY - a.y0, pr = a.el.getBoundingClientRect();   // where it was dropped, before it springs home
    a.el.style.transform = '';
    if (a.purse) {
      const it = document.getElementById('spItem'); if (!it || a.moved < 8) return;
      const r = it.getBoundingClientRect(), cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
      if (cx > r.left - 10 && cx < r.right + 10 && cy > r.top - 10 && cy < r.bottom + 10) spiceBuyNow();
    } else if (Math.abs(dy) >= SP_SWIPE_PX) spiceGuess(dy < 0 ? 'hi' : 'lo');
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function spiceScreenHide() {
  if (!spiceEl || spiceEl.classList.contains('hidden')) return;
  spiceEl.classList.add('hidden'); document.body.classList.remove('in-spice');
}
// called at the end of renderScene(): over the stall's home view and its game, away for anything else
function spiceScreenSync() {
  if (!scene || scene.id !== 'stall-spice' || scene.mode || (typeof mini !== 'undefined' && mini && mini.id !== 'haggle')) { spiceScreenHide(); return; }
  const el = spiceEl || spiceBuild(), was = spiceOpen(), g = spiceGame();
  el.classList.remove('hidden'); document.body.classList.add('in-spice');
  const sig = [scene.text, state.progress.pebbles, spiceSold(), g ? [g.st.cur, g.st.streak, g.st.phase, g.done].join(',') : '-', miniState('haggle').rewarded].join('|');
  if (!was || sig !== spiceUi.sig) { spiceUi.sig = sig; spiceRender(); }
}
