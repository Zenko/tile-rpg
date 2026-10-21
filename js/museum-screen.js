/* ============================================================
   THE HALL OF SPIRITS SCREEN (build 311): Curator Paz's museum, full screen, the sixth building screen (pattern: js/bakery-screen.js;
   leaving is a Leave button at the foot, see HANDOFF). Over the museum's scene while it shows its home view; the dormant expeditions
   (scene.mode 'exped') put it away. Rules stay put: donateCard(), canDonate(), wingProgress() and the wings in js/afterdark-companion-cards.js
   and content/cards.js; nothing here decides a donation.
     - The hall: five wing doors, each with its progress and a badge for how many spares are ready. Tap one to go in.
     - A wing: eight plinths, one per card. Filled ones show the card; empty ones you own show a ghost; unseen ones are a "?".
       Spares that can be donated wait on a tray: drag a card onto its own plinth (or tap the card, then the plinth). A card on the wrong
       plinth hops back. The last card of a wing sets it glowing; its prize comes from donateCard as before.
   ============================================================ */
let museumEl = null, museumUi = { wing: null, sel: null, sig: '' };
const museumOpen = () => !!museumEl && !museumEl.classList.contains('hidden');

function museumBuild() {
  const el = document.createElement('div'); el.id = 'museumScreen'; el.className = 'museum-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Hall of Spirits');
  el.innerHTML = `<div class="mu-bar"><span aria-hidden="true"></span><b class="mu-title">The Hall of Spirits</b><span class="mu-chip" id="muChip"></span></div>
    <div class="mu-maker"><span class="mu-curator" aria-hidden="true">${CAST.curator.icon}</span><p class="mu-say" id="muSay" aria-live="polite"></p></div>
    <div class="mu-stage" id="muStage"></div>
    <div class="mu-tray-wrap" id="muTray"></div>
    <p class="mu-hint" id="muHint"></p>
    <button type="button" class="btn btn-ghost mu-leave" id="muLeave">Leave</button>`;
  document.body.appendChild(el); museumEl = el; museumWire(el); return el;
}

function museumRender() {
  if (!museumOpen()) return;
  const $ = id => document.getElementById(id), w = museumUi.wing && wingDef(museumUi.wing);
  museumEl.dataset.view = w ? 'wing' : 'hall';
  $('muChip').textContent = `🏛️ ${MUSEUM_WINGS.filter(x => museumState().wings[x.id]).length}/${MUSEUM_WINGS.length}`;
  $('muSay').textContent = (scene && scene.text) || '';
  if (w) museumRenderWing($, w); else museumRenderHall($);
}

function museumRenderHall($) {
  $('muStage').innerHTML = `<div class="mu-hall">${MUSEUM_WINGS.map(w => {
    const n = wingProgress(w), ready = w.cards.filter(canDonate).length, done = n === w.cards.length;
    return `<button type="button" class="mu-door${done ? ' done' : ''}" data-wing="${w.id}" aria-label="${w.name}, ${n} of ${w.cards.length}${ready ? `, ${ready} to donate` : ''}"><span class="mu-door-ico" aria-hidden="true">${w.icon}</span>
      <span class="mu-door-main"><b>${w.name}</b><i class="mu-bar2"><u style="width:${Math.round(n / w.cards.length * 100)}%"></u></i></span><span class="mu-door-n">${done ? '✓' : `${n}/${w.cards.length}`}</span>${ready && !done ? `<em class="mu-badge">${ready}</em>` : ''}</button>`;
  }).join('')}</div>`;
  $('muTray').innerHTML = ''; $('muHint').textContent = 'Choose a wing. A number on a door means spares you can donate.';
}

function museumRenderWing($, w) {
  const own = baseOwnedSet(), ready = w.cards.filter(canDonate), sel = museumUi.sel, done = wingProgress(w) === w.cards.length;
  $('muStage').innerHTML = `<div class="mu-wing${done ? ' complete' : ''}"><div class="mu-winghead"><button type="button" class="mu-back" id="muBack">‹ All wings</button><b>${w.icon} ${w.name}</b><span>${wingProgress(w)}/${w.cards.length}</span></div>
    <div class="mu-plinths">${w.cards.map(id => {
      const d = cardDef(id), don = isDonated(id), mine = own.has(id), can = canDonate(id);
      const face = don ? `<span class="mu-art">${cardArtHtml(d)}</span><b>${d.name}</b>` : mine ? `<span class="mu-art ghost">${cardArtHtml(d)}</span><b>${d.name}</b><small>${can ? 'place it here' : 'needs a spare'}</small>` : `<span class="mu-art unseen">?</span><b>???</b><small>${RARITY_LABEL[d.rarity]}</small>`;
      return `<div class="mu-plinth${don ? ' filled' : ''}${can ? ' open' : ''}${sel === id ? ' target' : ''}" data-plinth="${id}" role="${can ? 'button' : 'img'}" ${can ? 'tabindex="0"' : ''} aria-label="${don ? d.name + ', donated' : mine ? d.name : 'An unseen ' + RARITY_LABEL[d.rarity] + ' card'}">${face}</div>`; }).join('')}</div></div>`;
  $('muTray').innerHTML = ready.length ? `<div class="mu-tray"><span class="mu-tray-h">Spares ready</span><div class="mu-cards">${ready.map(id => { const d = cardDef(id); return `<button type="button" class="mu-card${sel === id ? ' sel' : ''}" data-card="${id}" aria-label="Donate ${d.name}: drag it onto its plinth"><span class="mu-art">${cardArtHtml(d)}</span><b>${d.name}</b></button>`; }).join('')}</div>${ready.length > 1 ? `<button type="button" class="mu-all" data-all="${w.id}">Donate all ${ready.length}</button>` : ''}</div>` : '';
  $('muHint').textContent = done ? 'This wing is complete.' : ready.length ? 'Drag a spare onto its plinth. (Or tap the card, then the plinth.)' : 'Nothing to donate here yet. Spare copies only: the Hall never takes your last.';
}

function museumDonate(id) {
  if (!canDonate(id) || !scene) return false;
  scene.text = donateCard(id); museumUi.sel = null;
  const el = document.querySelector(`.mu-plinth[data-plinth="${id}"]`); if (el) el.classList.add('placed');
  buzz(HAP.found); setTimeout(() => { museumUi.sig = ''; museumRender(); }, 420);
  return true;
}
function museumWrong(id, plinth) {
  sfx('soft'); buzz(HAP.soft);
  if (plinth) { plinth.classList.remove('shake'); void plinth.offsetWidth; plinth.classList.add('shake'); }
  const d = cardDef(id); scene.text = `${d.name} does not belong there. Each spirit has a plinth of its own.`; const t = document.getElementById('muSay'); if (t) t.textContent = scene.text;
}

function museumWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#muLeave')) { sceneAction('leave'); return; }
    const door = e.target.closest('[data-wing]'); if (door) { museumUi.wing = door.dataset.wing; museumUi.sel = null; sfx('nav'); const w = wingDef(museumUi.wing); scene.text = `${w.icon} ${w.name}: ${wingProgress(w)}/${w.cards.length} donated. Complete it for 🫧 ${WING_PEBBLES}, ${WING_STARLIGHT} ${GAME.starlight.name} and a keepsake.`; museumRender(); return; }
    if (e.target.closest('#muBack')) { museumUi.wing = null; museumUi.sel = null; sfx('nav'); const g = INTERIORS.museum.greet; scene.text = typeof g === 'function' ? g() : g; museumRender(); return; }
    const all = e.target.closest('[data-all]'); if (all) { sceneAction('donateall:' + all.dataset.all); museumUi.sel = null; museumUi.sig = ''; museumRender(); return; }
    if (museumUi.dragged) return;   // the click after a drag belongs to the drag
    const card = e.target.closest('[data-card]'); if (card) { museumUi.sel = museumUi.sel === card.dataset.card ? null : card.dataset.card; sfx('tap'); museumRender(); return; }
    const pl = e.target.closest('[data-plinth]');
    if (pl && museumUi.sel) { if (pl.dataset.plinth === museumUi.sel) museumDonate(museumUi.sel); else museumWrong(museumUi.sel, pl); }
  });
  // a spare card dragged onto a plinth
  let d = null;
  el.addEventListener('pointerdown', e => {
    const card = e.target.closest('[data-card]'); if (!card) return;
    e.preventDefault(); try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    card.classList.add('dragging'); d = { id: e.pointerId, el: card, card: card.dataset.card, x0: e.clientX, y0: e.clientY, moved: 0 }; museumUi.dragged = false;
  });
  el.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0; d.moved = Math.max(d.moved, Math.hypot(dx, dy)); d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.1) rotate(${dx / 14}deg)`;
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const a = d; d = null; a.el.classList.remove('dragging'); a.el.style.transform = '';
    if (a.moved < 8) return;   // a tap is the click handler's
    museumUi.dragged = true; setTimeout(() => { museumUi.dragged = false; }, 50);
    a.el.style.pointerEvents = 'none'; const under = document.elementFromPoint(e.clientX, e.clientY), pl = under && under.closest('[data-plinth]'); a.el.style.pointerEvents = '';   // look through the card gliding home
    if (!pl) return;
    if (pl.dataset.plinth === a.card) museumDonate(a.card); else museumWrong(a.card, pl);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function museumScreenHide() {
  if (!museumEl || museumEl.classList.contains('hidden')) return;
  museumEl.classList.add('hidden'); document.body.classList.remove('in-museum');
}
// called at the end of renderScene(): over the museum's home view, away for the dormant expeditions
function museumScreenSync() {
  if (!scene || scene.id !== 'museum' || scene.mode) { museumScreenHide(); return; }
  const el = museumEl || museumBuild(), was = museumOpen();
  el.classList.remove('hidden'); document.body.classList.add('in-museum');
  if (!was) { museumUi.wing = null; museumUi.sel = null; }   // a fresh visit starts in the hall
  const sig = [museumUi.wing, scene.text, MUSEUM_WINGS.map(wingProgress).join(','), totalSpares()].join('|');
  if (!was || sig !== museumUi.sig) { museumUi.sig = sig; museumRender(); }
}
