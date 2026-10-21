/* ============================================================
   THE CARD SHOP SCREEN (build 312): the shop front, full screen, the seventh building screen (pattern: js/bakery-screen.js; leaving is a
   Leave button at the foot, see HANDOFF). Over the Card Shop's scene while it shows its home view. The four displays are the old four
   buttons made into fixtures that show what is inside: the pack rack (a few packs and the cheapest price), the sleeve wall (the sleeve
   you are wearing), the mirror (your character) and the decoration shelf. Tapping one opens exactly what the button opened
   (sceneAction 'packs' / 'sleeves' / 'customize' / 'items'); those views are the existing Shop screens, and their Back returns here.
   ============================================================ */
let shopEl = null, shopUi = { sig: '' };
const shopOpen = () => !!shopEl && !shopEl.classList.contains('hidden');

function shopBuild() {
  const el = document.createElement('div'); el.id = 'shopScreen'; el.className = 'shop-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Card Shop');
  el.innerHTML = `<div class="cs-bar"><span aria-hidden="true"></span><b class="cs-title">The Card Shop</b><span class="cs-chip" id="csChip"></span></div>
    <div class="cs-awning" aria-hidden="true"></div>
    <div class="cs-maker"><span class="cs-seller" aria-hidden="true">${CAST.cardSeller.icon}</span><p class="cs-say" id="csSay" aria-live="polite"></p></div>
    <div class="cs-stage" id="csStage"></div>
    <p class="cs-hint">Tap a display to look inside.</p>
    <button type="button" class="btn btn-ghost cs-leave" id="csLeave">Leave</button>`;
  document.body.appendChild(el); shopEl = el; shopWire(el); return el;
}

function shopRender() {
  if (!shopOpen()) return;
  const $ = id => document.getElementById(id), sl = currentSleeve(), cheapest = Math.min(...PACKS.map(p => packPrice(p)));
  $('csChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('csSay').textContent = (scene && scene.text) || '';
  const decos = DECORATION_ITEMS.filter(d => !d.museum && !d.rift && d.cost).slice(0, 3);
  $('csStage').innerHTML = [
    ['packs', 'Card packs', `from 🫧 ${cheapest}`, `<span class="cs-packs" aria-hidden="true">${PACKS.slice(0, 3).map(p => `<i>${p.icon}</i>`).join('')}</span>`],
    ['sleeves', 'Card sleeves', `wearing ${sl.name}`, `<span class="cs-sleeve" aria-hidden="true">${sleeveChip(sl)}</span>`],
    ['customize', 'The mirror', 'a fresh look', `<span class="cs-mirror" aria-hidden="true">${escapeHtml(state.character.emoji || '🙂')}</span>`],
    ['items', 'Decorations', 'for town and home', `<span class="cs-packs" aria-hidden="true">${decos.map(d => `<i>${d.icon}</i>`).join('')}</span>`],
  ].map(([id, name, sub, art]) => `<button type="button" class="cs-case" data-shop="${id}" aria-label="${name}: ${sub}"><span class="cs-glass">${art}</span><b>${name}</b><small>${sub}</small></button>`).join('');
}

function shopWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#csLeave')) { sceneAction('leave'); return; }
    const c = e.target.closest('[data-shop]'); if (!c) return;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); sfx('tap'); buzz(HAP.tap);
    setTimeout(() => { if (scene && scene.id === 'card-shop') sceneAction(c.dataset.shop); }, 160);
  });
}

function shopScreenHide() {
  if (!shopEl || shopEl.classList.contains('hidden')) return;
  shopEl.classList.add('hidden'); document.body.classList.remove('in-shopfront');
}
// called at the end of renderScene(): over the Card Shop's home view; its Packs / Sleeves / Customize / Items views show the Shop screens instead
function shopScreenSync() {
  if (!scene || scene.id !== 'card-shop' || scene.mode) { shopScreenHide(); return; }
  const el = shopEl || shopBuild(), was = shopOpen();
  el.classList.remove('hidden'); document.body.classList.add('in-shopfront');
  const sig = [scene.text, state.progress.pebbles, currentSleeve().id, state.character.emoji].join('|');
  if (!was || sig !== shopUi.sig) { shopUi.sig = sig; shopRender(); }
}
