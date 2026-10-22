/* ============================================================
   THE CARD SHOP SCREEN (build 312): the shop front, full screen, the seventh building screen (pattern: js/bakery-screen.js; leaving is a
   Leave button at the foot, see HANDOFF). Over the Card Shop's scene while it shows its home view. The four displays are the old four
   buttons made into fixtures that show what is inside: the pack rack (a few packs and the cheapest price), the sleeve wall (the sleeve
   you are wearing), the mirror (your character) and the decoration shelf. Tapping one opens exactly what the button opened
   (sceneAction 'packs' / 'sleeves' / 'customize' / 'items'); those views are the existing Shop screens, and their Back returns here.
   Build 315: two of the four displays are now full-screen views of their own, inside the same screen (scene.mode 'sleeves' / 'items'):
     - The sleeve wall: your sleeves as a carousel. Swipe the big card (or use the arrows) to look through them; it tilts with your finger.
       One button wears the sleeve or buys it first (sleeveAction, unchanged).
     - Decorations: a shelf of tiles by category; tap one to see it, then Buy (buyDecoration) or, if you own one, Place it
       (startPlacingDecoration, which steps out to the map as before). A "Yours" tab lists what is in storage (Place) and what is placed
       (Move, Store, Remove), the old Your Decorations lists.
   Build 316: the mirror is a dressing room too (scene.mode 'customize'). A live preview of your character (look, accessory, colour, border,
   backdrop, table mat) sits above six category tabs and a strip of choices. Tapping a choice TRIES IT ON in the mirror without changing anything;
   the one button then wears it (free or already yours) or buys it first (buyCosmetic, unchanged). Only Packs still opens a Shop screen.
   Back (inside the stage) returns to the front; Leave at the foot still leaves.
   ============================================================ */
let shopEl = null, shopUi = { sig: '', sleeve: 0, tab: 'shop', pick: null, cat: 'look', tryOn: null };
const shopOpen = () => !!shopEl && !shopEl.classList.contains('hidden');

function shopBuild() {
  const el = document.createElement('div'); el.id = 'shopScreen'; el.className = 'shop-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Card Shop');
  el.innerHTML = `<div class="cs-bar"><span aria-hidden="true"></span><b class="cs-title" id="csTitle">The Card Shop</b><span class="cs-chip" id="csChip"></span></div>
    <div class="cs-awning" aria-hidden="true"></div>
    <div class="cs-maker"><span class="cs-seller" aria-hidden="true">${CAST.cardSeller.icon}</span><p class="cs-say" id="csSay" aria-live="polite"></p></div>
    <div class="cs-stage" id="csStage"></div>
    <p class="cs-hint" id="csHint"></p>
    <button type="button" class="btn btn-ghost cs-leave" id="csLeave">Leave</button>`;
  document.body.appendChild(el); shopEl = el; screenFxInit(el); shopWire(el); return el;
}

function shopView() { return scene && ['sleeves', 'items', 'customize'].includes(scene.mode) ? scene.mode : 'hub'; }

function shopRender() {
  if (!shopOpen()) return;
  const $ = id => document.getElementById(id), v = shopView();
  shopEl.dataset.view = v;
  $('csTitle').textContent = v === 'sleeves' ? 'The Sleeve Wall' : v === 'items' ? 'Decorations' : 'The Card Shop';
  $('csChip').textContent = `🫧 ${state.progress.pebbles}`;
  $('csSay').textContent = (scene && scene.text) || '';
  if (v === 'sleeves') shopRenderSleeves($); else if (v === 'items') shopRenderItems($); else if (v === 'customize') shopRenderMirror($); else shopRenderHub($);
}

function shopRenderHub($) {
  const sl = currentSleeve(), cheapest = Math.min(...PACKS.map(p => packPrice(p)));
  const decos = DECORATION_ITEMS.filter(d => !d.museum && !d.rift && d.cost).slice(0, 3);
  $('csStage').innerHTML = [
    ['packs', 'Card packs', `from 🫧 ${cheapest}`, `<span class="cs-packs" aria-hidden="true">${PACKS.slice(0, 3).map(p => `<i>${p.icon}</i>`).join('')}</span>`],
    ['sleeves', 'Card sleeves', `wearing ${sl.name}`, `<span class="cs-sleeve" aria-hidden="true">${sleeveChip(sl)}</span>`],
    ['customize', 'The mirror', 'a fresh look', `<span class="cs-mirror" aria-hidden="true">${escapeHtml(state.character.emoji || '🙂')}</span>`],
    ['items', 'Decorations', 'for town and home', `<span class="cs-packs" aria-hidden="true">${decos.map(d => `<i>${d.icon}</i>`).join('')}</span>`],
  ].map(([id, name, sub, art]) => `<button type="button" class="cs-case" data-shop="${id}" aria-label="${name}: ${sub}"><span class="cs-glass">${art}</span><b>${name}</b><small>${sub}</small></button>`).join('');
  $('csHint').textContent = 'Tap a display to look inside.';
}


/* ---- the mirror ---- */
const SHOP_CATS = [
  { id: 'look',      label: 'Look',      icon: '🙂' },
  { id: 'accessory', label: 'Extras',    icon: '🎀' },
  { id: 'color',     label: 'Colour',    icon: '🎨' },
  { id: 'border',    label: 'Border',    icon: '⭕' },
  { id: 'stage',     label: 'Backdrop',  icon: '🌅' },
  { id: 'mat',       label: 'Table mat', icon: '🃏' },
];
// every choice in a category as { kind, value, label, cost, owned, on, ... }, mirroring the old Customize rows
function shopChoices(cat) {
  ensureCosmeticUnlocks(); const ch = state.character;
  if (cat === 'look') return (typeof drawnAvatarSwatches === 'function' && playerSpriteReady() ? PLAYER_ART.order.filter(id => PLAYER_ART.chars[id]).map(id => ({ kind: 'drawn', value: id, label: PLAYER_ART.chars[id].name, cost: 0, owned: true, on: playerCharId() === id, face: PLAYER_ART.chars[id].face })) : [])
    .concat(EMOJI_OPTIONS.map(o => ({ kind: 'emoji', value: o.emoji, label: o.emoji, cost: o.cost, owned: ch.unlockedEmojis.includes(o.emoji), on: !playerDrawn() && ch.emoji === o.emoji, glyph: o.emoji })));
  if (cat === 'accessory') return ACCESSORY_OPTIONS.map(o => ({ kind: 'accessory', value: o.icon, label: o.label, cost: o.cost, owned: ch.unlockedAccessories.includes(o.icon), on: ch.accessory === o.icon, glyph: o.icon || '🚫' }));
  if (cat === 'color') return COLOR_OPTIONS.map(o => ({ kind: 'color', value: o.color, label: 'Colour', cost: o.cost, owned: ch.unlockedColors.includes(o.color), on: ch.color === o.color, swatch: o.color }));
  if (cat === 'border') return BORDER_OPTIONS.map(o => ({ kind: 'border', value: o.id, label: o.name + (o.fixed ? ' (own colours)' : ''), cost: o.cost, owned: ch.unlockedAvBorders.includes(o.id), on: ch.avBorder === o.id }));
  if (cat === 'stage') return STAGE_OPTIONS.map(o => ({ kind: 'stage', value: o.id, label: o.name, cost: o.cost, owned: ch.unlockedStages.includes(o.id), on: ch.stage === o.id }));
  return MAT_OPTIONS.map(o => ({ kind: 'mat', value: o.id, label: o.name, cost: o.cost, owned: ch.unlockedMats.includes(o.id), on: ch.mat === o.id }));
}
const shopField = kind => ({ emoji: 'emoji', accessory: 'accessory', mat: 'mat', stage: 'stage', border: 'avBorder', color: 'color' })[kind];
function shopPreviewChar(t) {
  const c = Object.assign({}, state.character);
  if (t) { if (t.kind === 'drawn') c.drawn = t.value; else if (t.kind === 'emoji') { c.emoji = t.value; c.drawn = false; } else c[shopField(t.kind)] = t.value; }
  return c;
}
function shopRenderMirror($) {
  const cat = shopUi.cat, list = shopChoices(cat), t = shopUi.tryOn && shopUi.tryOn.cat === cat ? shopUi.tryOn : null, pc = shopPreviewChar(t);
  const pick = t ? list.find(x => x.kind === t.kind && x.value === t.value) : null;
  const dId = pc.drawn === false ? null : (typeof pc.drawn === 'string' && playerSpriteReady() && PLAYER_ART.chars[pc.drawn] ? pc.drawn : playerCharId());
  const face = dId ? `<img class="av-face" src="${PLAYER_ART.chars[dId].face}" alt="" draggable="false">` : escapeHtml(pc.emoji || '🙂');
  const choice = x => {
    const inner = x.face ? `<img class="av-face" src="${x.face}" alt="" draggable="false">` : x.swatch ? '' : x.kind === 'border' ? '<span class="cs-bd"></span>' : x.kind === 'stage' ? '<span class="cs-stg"></span>' : x.kind === 'mat' ? `<span class="cs-mat mat-swatch mat-${x.value}"><span>${x.label}</span></span>` : x.glyph || '';
    return `<button type="button" class="cs-ch${x.on ? ' on' : ''}${pick === x ? ' try' : ''}${x.owned ? '' : ' locked'}" data-try="${x.kind}|${x.value}" data-kind="${x.kind}" aria-label="${x.label}${x.owned ? '' : ', ' + x.cost + ' ' + GAME.currency.many}" ${x.swatch ? `style="--sw:${x.swatch}"` : ''}>${inner}${x.owned ? '' : `<em class="cs-cost">🫧${x.cost}</em>`}</button>`;
  };
  const owned = !pick || pick.owned, can = pick && !pick.owned && state.progress.pebbles >= pick.cost, same = pick && pick.on;
  $('csStage').innerHTML = `<div class="cs-sub"><div class="cs-subhead"><button type="button" class="cs-back" id="csBack">‹ Front</button><b>The mirror</b><span>${pick ? pick.label : 'Try things on'}</span></div>
    <div class="cs-glassbox" id="csGlass"><div class="cs-room" id="csRoom"><span class="cs-sky"></span><span class="cs-ground"></span><span class="avatar-preview cs-me" id="csMe">${face}</span></div><div class="cs-matstrip"><span class="mat-swatch mat-${pc.mat}"><span>Your table mat</span></span></div></div>
    <div class="cs-cats" role="tablist">${SHOP_CATS.map(c => `<button type="button" class="cs-cat${c.id === cat ? ' on' : ''}" data-cat2="${c.id}" aria-label="${c.label}"><span aria-hidden="true">${c.icon}</span><small>${c.label}</small></button>`).join('')}</div>
    <div class="cs-chs">${list.map(choice).join('')}</div>
    <button type="button" class="cs-main" id="csWear" ${!pick || same || (!owned && !can) ? 'disabled' : ''}>${!pick ? 'Tap something to try it on' : same ? 'Wearing it' : owned ? 'Wear it' : can ? `Buy and wear · 🫧 ${pick.cost}` : `Needs 🫧 ${pick.cost - state.progress.pebbles} more`}</button></div>`;
  const me = document.getElementById('csMe'); applyAvatarStyle(me, pc);
  const room = document.getElementById('csRoom'); room.style.setProperty('--sky', stageGradient(stageDef(pc.stage)));
  document.querySelectorAll('.cs-ch[data-kind="border"]').forEach(b => { const v = b.dataset.try.split('|')[1], sp = b.querySelector('.cs-bd'); if (sp) applyAvatarStyle(sp, { color: state.character.color, avBorder: v, avBorderColor: state.character.avBorderColor }); });
  document.querySelectorAll('.cs-ch[data-kind="stage"]').forEach(b => { const sp = b.querySelector('.cs-stg'); if (sp) sp.style.background = stageGradient(stageDef(b.dataset.try.split('|')[1])); });
  $('csHint').textContent = pick ? '' : 'Tap a choice to see it on you. Nothing changes until you press the button.';
}
function shopWear() {
  const t = shopUi.tryOn; if (!t) return;
  const x = shopChoices(t.cat).find(c => c.kind === t.kind && c.value === t.value); if (!x || x.on) return;
  ensureAudio();
  if (x.owned) {
    sfx('nav'); buzz(HAP.tap);
    if (x.kind === 'drawn') state.character.drawn = x.value;
    else { state.character[shopField(x.kind)] = x.value; if (x.kind === 'emoji') state.character.drawn = false; }
    saveState(); updateHud(); renderTown(); if (typeof renderCharacterTab === 'function') renderCharacterTab();
  } else if (!buyCosmetic(x.kind, x.value, x.cost)) return;
  shopUi.tryOn = null; shopUi.sig = ''; shopRender();
  const m = document.getElementById('csMe'); if (m) { m.classList.add('pop'); setTimeout(() => m.classList.remove('pop'), 500); }
}

/* ---- the sleeve wall ---- */
function shopRenderSleeves($) {
  const ch = ensureSleeves(), n = SLEEVES.length;
  if (shopUi.sleeveFor !== 'seen') { shopUi.sleeve = Math.max(0, SLEEVES.findIndex(x => x.id === ch.sleeve)); shopUi.sleeveFor = 'seen'; }
  const i = ((shopUi.sleeve % n) + n) % n, s = SLEEVES[i], owned = ch.unlockedSleeves.includes(s.id), worn = ch.sleeve === s.id, can = state.progress.pebbles >= s.cost;
  $('csStage').innerHTML = `<div class="cs-sub"><div class="cs-subhead"><button type="button" class="cs-back" id="csBack">‹ Front</button><b>Card sleeves</b><span>${i + 1}/${n}</span></div>
    <div class="cs-carousel"><button type="button" class="cs-arrow" data-step="-1" aria-label="Previous sleeve">‹</button>
      <div class="cs-bigcard${worn ? ' worn' : ''}" id="csBigCard" role="img" aria-label="${s.name} sleeve"><span class="cs-bigcard-in">${sleeveChip(s)}<span class="cs-mark" aria-hidden="true">${s.id ? s.icon : ''}</span></span></div>
      <button type="button" class="cs-arrow" data-step="1" aria-label="Next sleeve">›</button></div>
    <div class="cs-sleeve-info"><b>${s.name}</b><span class="cs-status${worn ? ' on' : ''}">${worn ? '✓ Wearing' : owned ? 'Owned' : `🫧 ${s.cost}`}</span></div>
    <div class="cs-dots" role="tablist">${SLEEVES.map((x, j) => `<button type="button" class="cs-dot${j === i ? ' now' : ''}${ch.unlockedSleeves.includes(x.id) ? ' own' : ''}${ch.sleeve === x.id ? ' worn' : ''}" data-dot="${j}" aria-label="${x.name}"></button>`).join('')}</div>
    <button type="button" class="cs-main" id="csMain" ${worn || (!owned && !can) ? 'disabled' : ''}>${worn ? 'Wearing it' : owned ? 'Wear it' : can ? `Buy and wear · 🫧 ${s.cost}` : `Needs 🫧 ${s.cost - state.progress.pebbles} more`}</button></div>`;
  $('csHint').textContent = 'Swipe the card to look through the sleeves.';
}
function shopSleeveStep(d) { shopUi.sleeve += d; sfx('nav'); buzz(HAP.tap); shopRender(); const c = document.getElementById('csBigCard'); if (c) { c.classList.remove(d > 0 ? 'in-l' : 'in-r'); void c.offsetWidth; c.classList.add(d > 0 ? 'in-r' : 'in-l'); } }
function shopSleeveWear() {
  const n = SLEEVES.length, s = SLEEVES[((shopUi.sleeve % n) + n) % n]; if (!scene) return;
  scene.text = sleeveAction(s.id); shopUi.sig = ''; shopRender();
  const c = document.getElementById('csBigCard'); if (c && ensureSleeves().sleeve === s.id) { c.classList.add('pop'); }
}

/* ---- decorations ---- */
function shopRenderItems($) {
  const peb = state.progress.pebbles, night = isNightNow(), inv = DECORATION_ITEMS.map(it => [it, decorationInventoryCount(it.id)]).filter(([, k]) => k > 0), placed = allDecorations();
  const head = `<div class="cs-subhead"><button type="button" class="cs-back" id="csBack">‹ Front</button><b>Decorations</b><span>${DECORATION_ITEMS.filter(haveDecoItem).length}/${DECORATION_ITEMS.length}</span></div>
    <div class="cs-tabs" role="tablist"><button type="button" class="cs-tab${shopUi.tab === 'shop' ? ' on' : ''}" data-tab="shop">Shop</button><button type="button" class="cs-tab${shopUi.tab === 'yours' ? ' on' : ''}" data-tab="yours">Yours${inv.length + placed.length ? ` · ${inv.reduce((a, [, k]) => a + k, 0) + placed.length}` : ''}</button></div>`;
  if (shopUi.tab === 'yours') {
    const rows = inv.map(([it, k]) => `<div class="cs-row"><span class="cs-row-ico">${it.icon}</span><span class="cs-row-txt"><b>${it.name}</b><small>${k} in storage</small></span><button type="button" class="cs-mini on" data-place="${it.id}">Place</button></div>`).join('')
      + placed.map(({ district, deco: d }) => { const it = DECORATION_ITEMS.find(x => x.id === d.id); if (!it) return ''; return `<div class="cs-row"><span class="cs-row-ico">${it.icon}</span><span class="cs-row-txt"><b>${it.name}</b><small>Placed in ${DISTRICTS[district].name}</small></span><span class="cs-row-act"><button type="button" class="cs-mini" data-move="${d.uid}" aria-label="Move ${it.name}">Move</button><button type="button" class="cs-mini" data-store="${d.uid}" aria-label="Store ${it.name}">Store</button><button type="button" class="cs-mini bad" data-del="${d.uid}" aria-label="Remove ${it.name}">Remove</button></span></div>`; }).join('');
    $('csStage').innerHTML = `<div class="cs-sub">${head}<div class="cs-rows">${rows || '<p class="cs-empty">Nothing yet. Buy a decoration in the Shop tab and it waits here until you place it.</p>'}</div></div>`;
    $('csHint').textContent = '';
    return;
  }
  const list = DECORATION_ITEMS.filter(it => !it.museum && !it.atlas && !it.rift && (itemsCat === 'all' || it.cat === itemsCat));
  const pick = DECORATION_ITEMS.find(it => it.id === shopUi.pick && list.includes(it)) || null;
  const tiles = list.map(it => { const lockedLvl = it.level && ensureLevel().level < it.level, lockedNight = it.night && !night, own = decorationInventoryCount(it.id);
    return `<button type="button" class="cs-tile${pick === it ? ' pick' : ''}${lockedLvl || lockedNight ? ' locked' : ''}" data-item="${it.id}" aria-label="${it.name}, ${it.cost} ${GAME.currency.many}"><span class="cs-tile-ico">${it.icon}</span><b>${it.name}</b><small>${lockedLvl ? `🔒 lv ${it.level}` : lockedNight ? '🌙 night' : `🫧 ${it.cost}`}</small>${own ? `<em class="cs-own">${own}</em>` : ''}</button>`; }).join('');
  let detail = '<p class="cs-empty">Tap a decoration to see it.</p>';
  if (pick) {
    const lockedLvl = pick.level && ensureLevel().level < pick.level, lockedNight = pick.night && !night, can = peb >= pick.cost && !lockedLvl && !lockedNight, own = decorationInventoryCount(pick.id);
    detail = `<div class="cs-detail"><span class="cs-detail-ico" aria-hidden="true">${pick.icon}</span><span class="cs-detail-txt"><b>${pick.name}</b><small>${pick.desc}</small>${lockedLvl ? `<small>🔒 Unlocks at level ${pick.level}</small>` : ''}${pick.night ? `<small>🌙 ${lockedNight ? 'Only sold after dark' : 'Glows at night'}</small>` : ''}</span>
      <span class="cs-detail-btns"><button type="button" class="cs-mini on" data-buy="${pick.id}" ${can ? '' : 'disabled'}>${lockedLvl ? '🔒' : `Buy · 🫧 ${pick.cost}`}</button>${own ? `<button type="button" class="cs-mini" data-place="${pick.id}">Place (${own})</button>` : ''}</span></div>`;
  }
  $('csStage').innerHTML = `<div class="cs-sub">${head}<div class="cs-chips">${ITEM_CATS.map(c => `<button type="button" class="cs-chip${c.id === itemsCat ? ' on' : ''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('')}</div>
    <div class="cs-tiles">${tiles || '<p class="cs-empty">Nothing in this category yet.</p>'}</div>${detail}</div>`;
  $('csHint').textContent = '';
}
// renderItems() (js/workshop-and-starter.js) runs after every buy, store, remove and placement: keep this view in step with it
function shopScreenRefresh() { if (shopOpen() && shopView() === 'items') { shopUi.sig = ''; shopRender(); } }

function shopWire(el) {
  el.addEventListener('click', e => {
    if (e.target.closest('#csLeave')) { sceneAction('leave'); return; }
    const c = e.target.closest('[data-shop]');
    if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); sfx('tap'); buzz(HAP.tap); setTimeout(() => { if (scene && scene.id === 'card-shop') sceneAction(c.dataset.shop); }, 160); return; }
    if (e.target.closest('#csBack')) { sfx('nav'); sceneAction('back'); return; }
    const st = e.target.closest('[data-step]'); if (st) { shopSleeveStep(+st.dataset.step); return; }
    const dot = e.target.closest('[data-dot]'); if (dot) { shopUi.sleeve = +dot.dataset.dot; sfx('tap'); shopRender(); return; }
    if (e.target.closest('#csMain')) { shopSleeveWear(); return; }
    if (e.target.closest('#csWear')) { shopWear(); return; }
    const c2 = e.target.closest('[data-cat2]'); if (c2) { shopUi.cat = c2.dataset.cat2; shopUi.tryOn = null; sfx('nav'); buzz(HAP.tap); shopRender(); return; }
    const tr = e.target.closest('[data-try]'); if (tr) { const [kind, ...v] = tr.dataset.try.split('|'); shopUi.tryOn = { cat: shopUi.cat, kind, value: v.join('|') }; sfx('tap'); buzz(HAP.tap); shopRender(); return; }
    const tab = e.target.closest('[data-tab]'); if (tab) { shopUi.tab = tab.dataset.tab; sfx('nav'); shopRender(); return; }
    const cat = e.target.closest('[data-cat]'); if (cat) { itemsCat = cat.dataset.cat; sfx('nav'); buzz(HAP.tap); shopRender(); return; }
    const tile = e.target.closest('[data-item]'); if (tile) { shopUi.pick = tile.dataset.item; sfx('tap'); shopRender(); return; }
    const buy = e.target.closest('[data-buy]'); if (buy && !buy.disabled) { ensureAudio(); buyDecoration(DECORATION_ITEMS.find(x => x.id === buy.dataset.buy)); shopRender(); return; }
    const place = e.target.closest('[data-place]'); if (place) { ensureAudio(); startPlacingDecoration(DECORATION_ITEMS.find(x => x.id === place.dataset.place)); return; }
    const mv = e.target.closest('[data-move]'); if (mv) { const f = findDecoration(mv.dataset.move); ensureAudio(); if (f) startPlacingDecoration(DECORATION_ITEMS.find(x => x.id === f.list[f.idx].id), mv.dataset.move); return; }
    const sto = e.target.closest('[data-store]'); if (sto) { ensureAudio(); storeDecoration(sto.dataset.store); return; }
    const del = e.target.closest('[data-del]'); if (del) { ensureAudio(); deleteDecoration(del.dataset.del); }
  });
  // the sleeve card: swipe it sideways to change sleeve, and it tilts under your finger
  let d = null;
  el.addEventListener('pointerdown', e => { const c = e.target.closest('#csBigCard'); if (!c) return; e.preventDefault(); d = { id: e.pointerId, el: c, x0: e.clientX, y0: e.clientY }; });
  el.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const r = d.el.getBoundingClientRect(); d.el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 40).toFixed(1) + 'deg'); d.el.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 30).toFixed(1) + 'deg');
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const a = d; d = null; a.el.style.removeProperty('--rx'); a.el.style.removeProperty('--ry');
    const dx = e.clientX - a.x0; if (Math.abs(dx) > 45) shopSleeveStep(dx < 0 ? 1 : -1);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

function shopScreenHide() {
  if (!shopEl || shopEl.classList.contains('hidden')) return;
  shopEl.classList.add('hidden'); document.body.classList.remove('in-shopfront');
}
// called at the end of renderScene(): over the Card Shop's front and its Sleeves and Items views; Packs and Customize show the Shop screens instead
function shopScreenSync() {
  if (!scene || scene.id !== 'card-shop' || (scene.mode && !['sleeves', 'items', 'customize'].includes(scene.mode))) { shopScreenHide(); return; }
  const el = shopEl || shopBuild(), was = shopOpen();
  screenFxShow(el); document.body.classList.add('in-shopfront');
  if (!was) { shopUi.sleeveFor = null; shopUi.tab = 'shop'; shopUi.pick = null; shopUi.tryOn = null; shopUi.cat = 'look'; }
  const sig = [shopView(), scene.text, state.progress.pebbles, currentSleeve().id, ensureSleeves().unlockedSleeves.length, state.character.emoji, state.character.drawn, state.character.color].join('|');
  if (!was || sig !== shopUi.sig) { shopUi.sig = sig; shopRender(); }
}
