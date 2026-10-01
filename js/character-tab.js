/* ============================================================
   CHARACTER TAB (v1.64.0)
   The fifth bottom tab. Up top, a small stage with you and your companion standing in front of a backdrop the player
   picks (STAGE_OPTIONS in js/world-map.js, bought and equipped like the table mats). Below it, four views:
   Me (level, title, pinned stats, what unlocks next, Knack), Look, Pantry and Companion. Milestones live only in Rewards. Nothing here owns data of its own - it reads and
   writes the storage each system already has (pantry, dishes, seeds, decorations, bug jar, achievements, companion),
   so the older screens (player menu, Rewards > Milestones, Shop > Customize) keep working unchanged.
   ============================================================ */
const CHAR_VIEWS = [['me', 'Me'], ['look', 'Look'], ['bag', 'Pantry'], ['pals', 'Companion']];   // 'bag' is the Pantry (key kept for old links)
let charView = 'me';        // not saved, like cardsView / shopSubView
const charPanel = () => document.getElementById('characterPanel');
const charVisible = () => !charPanel().classList.contains('hidden');
// The stage shrinks to a strip while you browse long lists, and fills out again for Me and Companion.
const charCompact = () => charView === 'bag' || charView === 'look';

const CHAR_DECO_SLOTS = [[8, 14, 1.7], [76, 9, 1.5], [40, 6, 1.2], [90, 40, 1.15], [3, 44, 1.15], [60, 26, 1]];
function charStageDeco(def) {
  if (def.live) { const sp = skyPhase(), wx = (WEATHER_KINDS[weatherNow()] || {}).icon; return [sp.icon, wx || '☁️', '🌿']; }
  return def.deco || [];
}
function charDaysTogether(c) { return Math.max(0, Math.floor((Date.now() - (c.since || Date.now())) / 86400000)); }

function charBuild() {
  const p = charPanel();
  p.innerHTML = `
    <div class="ch-stage" id="chStage"></div>
    <div class="ch-drawer">
      <div class="seg seg-scroll ch-seg" id="chSeg">${CHAR_VIEWS.map(([k, t]) => `<button class="seg-btn" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="ch-body" id="chBody"></div>
    </div>`;
  onAll(p, '#chSeg .seg-btn', b => { sfx('nav'); buzz(HAP.tap); charSetView(b.dataset.v); });
}
function charSetView(v) {
  charView = v;
  if (v === 'bag') bumpStat('inventoryOpened', 1);   // the "Checked your bag" milestone
  if (v === 'bag') bumpStat('inventoryOpened', 1);   // the "Checked your bag" milestone
  if (!document.getElementById('chStage')) return;   // the tab is not built yet: renderCharacterTab() will draw this view
  document.querySelectorAll('#chSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  document.getElementById('chStage').classList.toggle('compact', charCompact());
  drawCharStage(); drawCharBody();
  document.getElementById('screen').scrollTop = 0;
}

/* ---------- the stage ---------- */
function drawCharStage() {
  const st = document.getElementById('chStage'); if (!st) return;
  ensureCosmeticUnlocks();
  const ch = state.character, def = stageDef(ch.stage), c = stageColors(def), pr = ensureLevel(), t = currentTitle(), comp = state.companion;
  const need = xpToNext(pr.level), pct = Math.max(0, Math.min(100, pr.xp / need * 100));
  st.style.setProperty('--sk-a', c.sky[0]); st.style.setProperty('--sk-b', c.sky[1]); st.style.setProperty('--gr', c.ground);
  st.classList.toggle('dark', !!c.dark); st.classList.toggle('compact', charCompact());
  const deco = charStageDeco(def).map((e, i) => { const s = CHAR_DECO_SLOTS[i % CHAR_DECO_SLOTS.length]; return `<span class="ch-d" style="left:${s[0]}%;top:${s[1]}%;font-size:${s[2]}rem;animation-delay:${-i * 1.7}s">${e}</span>`; }).join('');
  st.innerHTML = `
    <div class="ch-deco" aria-hidden="true">${deco}</div>
    <div class="ch-ground"></div>
    <div class="ch-top">
      <div class="ch-id"><b class="ch-name">${escapeHtml(ch.name || 'You')}</b>${t ? `<span class="ch-chip">${escapeHtml(t.name)}</span>` : ''}${charPins().length ? `<span class="ch-pins">${profileStatValues().filter(v => charPins().includes(v.label)).map(v => `<span>${v.icon} ${v.value}</span>`).join('')}</span>` : ''}</div>
      <span class="ch-peb">🫧 ${state.progress.pebbles}</span>
    </div>
    <div class="ch-actors">
      <button class="ch-actor ch-me" id="chMe" aria-label="${escapeHtml(ch.name || 'You')}">
        <span class="avatar-preview ch-av" id="chAv"><span>${ch.emoji}</span></span>
        <span class="ch-plate">Lv ${pr.level}<i class="ch-xp"><b style="width:${pct}%"></b></i></span>
      </button>
      ${comp ? `<button class="ch-actor ch-pal" id="chPal" aria-label="${escapeHtml(comp.name)}"><span class="ch-pal-f">${comp.icon}</span><span class="ch-plate">${escapeHtml(comp.name)}</span></button>`
             : `<button class="ch-actor ch-pal empty" id="chPal" aria-label="No companion yet"><span class="ch-pal-f">❔</span><span class="ch-plate">No companion</span></button>`}
    </div>
    <button class="ch-paint" id="chPaint" aria-label="Change backdrop" title="Change backdrop">🎨</button>`;
  applyAvatarStyle(document.getElementById('chAv'), ch);
  const hop = id => { const el = document.getElementById(id); el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); sfx('tap'); buzz(HAP.tap); };
  document.getElementById('chMe').addEventListener('click', () => hop('chMe'));
  document.getElementById('chPal').addEventListener('click', () => { hop('chPal'); if (!comp) charSetView('pals'); else toast(`${comp.icon} ${comp.name} · ${COMPANION_PERKS[comp.perk].text}`); });
  document.getElementById('chPaint').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); charSetView('look'); const b = document.getElementById('chBackdrops'); if (b) b.scrollIntoView({ behavior: charMotionOk() ? 'smooth' : 'auto', block: 'center' }); });
}
const charMotionOk = () => typeof btMotionOk !== 'function' || btMotionOk();

/* ---------- the views ---------- */
function drawCharBody() {
  const box = document.getElementById('chBody'); if (!box) return;
  document.querySelectorAll('#chSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.v === charView));
  box.innerHTML = '';
  ({ me: charDrawMe, look: charDrawLook, bag: charDrawBag, pals: charDrawPals })[charView](box);
}
function charSection(box, title) { const h = document.createElement('div'); h.className = 'section-title'; h.textContent = title; box.appendChild(h); }

// Up to three stats the player pins; they ride on the stage under the name. Unset means the default three.
const CHAR_PIN_MAX = 3, CHAR_PIN_DEFAULT = ['Wins', 'Cards', 'Milestones'];
const charPins = () => (Array.isArray(state.character.pinStats) ? state.character.pinStats : CHAR_PIN_DEFAULT);
function charTogglePin(label) {
  const cur = charPins().slice(), i = cur.indexOf(label);
  if (i >= 0) cur.splice(i, 1);
  else if (cur.length >= CHAR_PIN_MAX) { toast(`You can pin ${CHAR_PIN_MAX}. Unpin one first.`); return; }
  else cur.push(label);
  state.character.pinStats = cur; saveState(); sfx('tap'); buzz(HAP.tap);
  drawCharStage(); drawCharBody();
}
function charDrawMe(box) {
  const pr = ensureLevel(), need = xpToNext(pr.level), pct = Math.max(0, Math.min(100, pr.xp / need * 100)), cur = currentTitle();
  const lv = document.createElement('div'); lv.className = 'ch-level';
  lv.innerHTML = `<div class="level-row"><span class="level-badge-lg">Lv ${pr.level}</span><span class="level-xp-text">${Math.floor(pr.xp)} / ${need} XP</span></div><div class="level-bar"><div class="level-bar-fill" style="width:${pct}%"></div></div>`;
  box.appendChild(lv);
  charSection(box, 'Title · shown under your name');
  const mine = unlockedTitles(), trow = document.createElement('div'); trow.className = 'title-row';
  trow.innerHTML = `<button class="title-chip${cur ? '' : ' active'}" data-title="">No title</button>` +
    mine.map(t => `<button class="title-chip${cur && cur.ach === t.ach ? ' active' : ''}" data-title="${t.ach}">${escapeHtml(t.name)}</button>`).join('') +
    (mine.length < TITLES.length ? `<span class="more-in-shop">${TITLES.length - mine.length} more to earn in Rewards › Milestones</span>` : '');
  onAll(trow, '[data-title]', b => charWearTitle(b.dataset.title));
  box.appendChild(trow);
  const pins = charPins();
  charSection(box, `Your highlights · pin up to ${CHAR_PIN_MAX}`);
  const grid = document.createElement('div'); grid.className = 'profile-stats-grid';
  grid.innerHTML = profileStatValues().map(s => `<div class="profile-stat${pins.includes(s.label) ? ' pinned' : ''}"><button class="ps-pin" data-pin="${s.label}" aria-pressed="${pins.includes(s.label)}" aria-label="${pins.includes(s.label) ? 'Unpin' : 'Pin'} ${s.label}">${pins.includes(s.label) ? '📌' : '📍'}</button><span class="ps-icon">${s.icon}</span><span class="ps-value">${s.value}</span><span class="ps-label">${s.label}</span></div>`).join('');
  onAll(grid, '[data-pin]', b => charTogglePin(b.dataset.pin));
  box.appendChild(grid);
  const lvNow = pr.level, ahead = unlocksBetween(lvNow, lvNow + 30).slice(0, 4);
  if (ahead.length) {
    charSection(box, 'Coming up');
    const up = document.createElement('div'); up.className = 'panel-desc';
    up.innerHTML = ahead.map(u => `<div class="unlock-row"><span>${u.icon} ${u.text}</span><b>Lv ${u.level}</b></div>`).join('');
    box.appendChild(up);
  }
  charSection(box, "Keeper's Knack");
  const kb = document.createElement('div'); kb.className = 'knack-row ch-knack';
  const drawK = () => {
    const cur = currentKnackId(), k = BattleEngine.KNACKS[cur];
    kb.innerHTML = `<div class="knack-chips">${knackChipsHtml(cur)}</div><div class="knack-desc">${k.icon} <b>${k.name}.</b> ${k.text} <i>Once per match, from your turn ${k.from}.</i></div>`;
    knackPickerWire(kb, drawK);
  };
  drawK(); box.appendChild(kb);
}
// Look: everything you own, ready to wear. Nothing here is for sale - the Shop button walks you to the Card Shop,
// which sells every look, so there is one place to buy things and one place to wear them.
function charDrawLook(box) {
  ensureCosmeticUnlocks();
  const ch = state.character;
  const row = (cls, kids) => { const r = document.createElement('div'); r.className = 'swatch-row shop-swatch-row' + (cls ? ' ' + cls : ''); kids.forEach(k => r.appendChild(k)); return r; };
  const lockedLeft = EMOJI_OPTIONS.filter(o => !ch.unlockedEmojis.includes(o.emoji)).length + ACCESSORY_OPTIONS.filter(o => !ch.unlockedAccessories.includes(o.icon)).length +
    COLOR_OPTIONS.filter(o => !ch.unlockedColors.includes(o.color)).length + MAT_OPTIONS.filter(o => !ch.unlockedMats.includes(o.id)).length + BORDER_OPTIONS.filter(o => !ch.unlockedAvBorders.includes(o.id)).length + STAGE_OPTIONS.filter(o => !ch.unlockedStages.includes(o.id)).length;
  const shop = document.createElement('button'); shop.className = 'panel-action ch-shop';
  shop.innerHTML = `🛍️ Shop for more looks<small>${lockedLeft ? `${lockedLeft} more to unlock at the Card Shop` : 'You have every look - nice!'}</small>`;
  shop.addEventListener('click', goToCardShop);
  box.appendChild(shop);
  charSection(box, 'Name');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'name-input'; inp.placeholder = 'Your name'; inp.maxLength = 16; inp.value = ch.name || ''; inp.id = 'chNameInput';
  inp.addEventListener('input', () => { state.character.name = inp.value.slice(0, 16); saveState(); updateHud(); });
  box.appendChild(inp);
  charSection(box, 'Avatar');
  box.appendChild(row('', EMOJI_OPTIONS.filter(o => ch.unlockedEmojis.includes(o.emoji)).map(o => shopCosmeticSwatch('emoji', o.emoji, '', o.cost, ch.emoji === o.emoji, true))));
  charSection(box, 'Accessory');
  box.appendChild(row('', ACCESSORY_OPTIONS.filter(o => ch.unlockedAccessories.includes(o.icon)).map(o => shopCosmeticSwatch('accessory', o.icon, o.label, o.cost, ch.accessory === o.icon, true))));
  charSection(box, 'Colour');
  box.appendChild(row('', COLOR_OPTIONS.filter(o => ch.unlockedColors.includes(o.color)).map(o => shopCosmeticSwatch('color', o.color, '', o.cost, ch.color === o.color, true))));
  charSection(box, 'Avatar border · the ring around your portrait');
  box.appendChild(row('', BORDER_OPTIONS.filter(o => ch.unlockedAvBorders.includes(o.id)).map(o => shopCosmeticSwatch('border', o.id, o.name, o.cost, ch.avBorder === o.id, true))));
  const curB = borderDef(ch.avBorder);
  charSection(box, 'Border width');
  const wrow = document.createElement('div'); wrow.className = 'title-row bd-widths';
  wrow.innerHTML = BORDER_WIDTHS.map(w => `<button class="title-chip${ch.avBorderW === w.id ? ' active' : ''}" data-bw="${w.id}">${w.name}</button>`).join('');
  onAll(wrow, '[data-bw]', b => { sfx('nav'); buzz(HAP.tap); state.character.avBorderW = b.dataset.bw; saveState(); updateHud(); renderTown(); renderCharacterTab(); });
  box.appendChild(wrow);
  charSection(box, 'Border colour' + (curB.fixed ? ' · this border keeps its own colours' : ''));
  const cw = document.createElement('div'); cw.className = 'swatch-row shop-swatch-row bd-colors';
  const pick = c => { state.character.avBorderColor = c; saveState(); updateHud(); renderTown(); renderCharacterTab(); };
  BORDER_COLORS.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'color-swatch shop-swatch bd-color' + ((ch.avBorderColor || BORDER_COLORS[0]).toLowerCase() === c ? ' active' : '');
    b.style.background = c; b.setAttribute('aria-label', 'Border colour ' + (i + 1));
    b.addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); pick(i === 0 ? null : c); });
    cw.appendChild(b);
  });
  const custom = document.createElement('button'); custom.type = 'button'; custom.className = 'color-swatch shop-swatch bd-color bd-custom'; custom.title = 'Pick any colour'; custom.setAttribute('aria-label', 'Pick a custom border colour');
  custom.innerHTML = '<span aria-hidden="true">+</span>';
  custom.addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); openColorPicker(ch.avBorderColor || BORDER_COLORS[0], pick); });
  cw.appendChild(custom); box.appendChild(cw);
  charSection(box, 'Table mat · your side in battles');
  box.appendChild(row('shop-mat-row', MAT_OPTIONS.filter(o => ch.unlockedMats.includes(o.id)).map(o => shopCosmeticSwatch('mat', o.id, o.name, o.cost, ch.mat === o.id, true))));
  charSection(box, 'Backdrop · behind you and your companion');
  const bd = row('shop-mat-row', STAGE_OPTIONS.filter(o => ch.unlockedStages.includes(o.id)).map(o => shopCosmeticSwatch('stage', o.id, o.name, o.cost, ch.stage === o.id, true))); bd.id = 'chBackdrops'; box.appendChild(bd);
}
function charWearTitle(achId) {
  state.character.title = achId; saveState(); sfx('nav'); buzz(HAP.tap);
  renderTown(); drawCharStage(); drawCharBody();
}

function charDrawBag(box) {
  let any = false;
  const add = (title, rows) => { if (!rows.length) return; any = true; charSection(box, title); const list = document.createElement('div'); list.className = 'panel-list'; rows.forEach(r => list.appendChild(r)); box.appendChild(list); };
  const goTown = fn => () => { switchTab('town'); fn(); };
  add('Pantry', Object.keys(INGREDIENTS).filter(k => ingredientCount(k) > 0).map(k => invRow(INGREDIENTS[k].icon, escapeHtml(INGREDIENTS[k].name), ingredientCount(k), "Cooked into dishes at Maple's Bakery.")));
  add('Dishes', RECIPES.filter(r => dishCount(r.id) > 0).map(r => invRow(r.icon, escapeHtml(r.name), dishCount(r.id), escapeHtml(r.desc))));
  add('Seeds', SEEDS.filter(s => seedCount(s.id) > 0).map(s => invRow(s.icon, escapeHtml(s.name), seedCount(s.id), escapeHtml(s.desc), '🌱 Plant', goTown(() => startPlanting(s.id)))));
  const jar = bugState().jar;
  add('Bug jar', Object.keys(jar).filter(id => jar[id] > 0 && bugDef(id)).map(id => invRow(bugDef(id).icon, escapeHtml(bugDef(id).name), jar[id], 'Caught at night. Also works as fishing bait.')));
  add('Decorations', DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0).map(d => invRow(d.icon, escapeHtml(d.name), decorationInventoryCount(d.id), escapeHtml(d.desc), '📍 Place', goTown(() => startPlacingDecoration(d)))));
  if (!any) { const e = document.createElement('div'); e.className = 'panel-desc'; e.style.padding = '10px 4px'; e.textContent = 'Your pantry is empty. Harvest crops, catch fish or bugs, bake bread, and what you gather shows up here.'; box.appendChild(e); }
}

function charDrawPals(box) {
  const c = state.companion;
  if (!c) {
    const e = document.createElement('div'); e.className = 'ch-empty';
    e.innerHTML = `<div class="ch-empty-f">❔</div><b>No companion yet</b><div class="panel-desc">Tap a wandering spirit in town and invite it along. It follows you everywhere and brings a small perk. One companion at a time.</div>`;
    box.appendChild(e);
  } else {
    const perk = COMPANION_PERKS[c.perk], d = charDaysTogether(c);
    const card = document.createElement('div'); card.className = 'ch-pal-card';
    card.innerHTML = `<div class="ch-pal-big">${c.icon}</div><div class="ch-pal-info"><b>${escapeHtml(c.name)}</b><span class="ch-perk">${perk.icon} ${perk.text}</span><span class="panel-desc">${d ? `With you for ${d} day${d === 1 ? '' : 's'}` : 'Joined you today'}</span></div>`;
    box.appendChild(card);
    const bye = document.createElement('button'); bye.className = 'panel-action'; bye.textContent = 'Say goodbye';
    bye.addEventListener('click', () => { if (confirm(`Say goodbye to ${c.name}?`)) { releaseCompanion(); renderCharacterTab(); } });
    box.appendChild(bye);
  }
  // charms are cards you carry for a perk; they are chosen from the card screen, so this only shows what is active
  charSection(box, `Charms · ${charmSlotsOpen()} of ${CHARM_SLOT_LEVELS.length} slots open`);
  const list = document.createElement('div'); list.className = 'panel-list';
  const act = activeCharms();
  if (!act.length) { const e = document.createElement('div'); e.className = 'panel-desc'; e.textContent = 'No charms yet. Tap the ✦ on a card in Cards to carry its perk.'; box.appendChild(e); }
  act.forEach(id => { const d = cardDef(id), info = charmInfo(id); list.appendChild(invRow(d.icon, escapeHtml(d.name), '', escapeHtml(info ? info.text : ''))); });
  if (act.length) box.appendChild(list);
}

/* ---------- entry points ---------- */
function renderCharacterTab() {
  if (!charVisible()) return;
  if (!document.getElementById('chStage')) charBuild();
  document.getElementById('chStage').classList.toggle('compact', charCompact());
  drawCharStage(); drawCharBody();
}
// updateHud() calls this on every change: only the stage needs refreshing (name, level, title, pebbles, backdrop).
function refreshCharacterTab() { if (charVisible() && document.getElementById('chStage')) drawCharStage(); }

/* ---------- colour picker popup (v1.76.0) ----------
   Replaces the phone's own colour dialog with one in the game's popup style: three sliders (colour, richness, brightness),
   a hex box, and a live preview of your avatar wearing the colour. onSet gets a lowercase #rrggbb. */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}
let clrOnSet = null;
function openColorPicker(startHex, onSet) {
  const hex0 = /^#[0-9a-f]{6}$/i.test(startHex || '') ? startHex : BORDER_COLORS[0], hsl = hexToHsl(hex0);
  clrOnSet = onSet;
  document.getElementById('clrH').value = hsl.h; document.getElementById('clrS').value = hsl.s; document.getElementById('clrL').value = Math.min(95, Math.max(5, hsl.l));
  clrSync('sliders');
  document.getElementById('colorOverlay').classList.remove('hidden');
}
function closeColorPicker() { document.getElementById('colorOverlay').classList.add('hidden'); clrOnSet = null; }
// from: 'sliders' redraws the hex box; 'hex' (typing) leaves it alone so the caret doesn't jump
function clrSync(from) {
  const h = +document.getElementById('clrH').value, s = +document.getElementById('clrS').value, l = +document.getElementById('clrL').value, hex = hslToHex(h, s, l);
  const card = document.querySelector('#colorOverlay .clr-card');
  card.style.setProperty('--clr-h', h); card.style.setProperty('--clr-s', s + '%'); card.style.setProperty('--clr-hex', hex);
  if (from !== 'hex') document.getElementById('clrHex').value = hex;
  const pv = document.getElementById('clrPreview'), ch = state.character;
  applyAvatarStyle(pv, { color: ch.color, accessory: ch.accessory, avBorder: ch.avBorder, avBorderW: ch.avBorderW, avBorderColor: hex });
  pv.textContent = ch.emoji;
}
['clrH', 'clrS', 'clrL'].forEach(id => document.getElementById(id).addEventListener('input', () => clrSync('sliders')));
document.getElementById('clrHex').addEventListener('input', e => {
  const v = e.target.value.trim().toLowerCase(), full = v.startsWith('#') ? v : '#' + v;
  if (!/^#[0-9a-f]{6}$/.test(full)) return;
  const hsl = hexToHsl(full);
  document.getElementById('clrH').value = hsl.h; document.getElementById('clrS').value = hsl.s; document.getElementById('clrL').value = Math.min(95, Math.max(5, hsl.l));
  clrSync('hex');
});
document.getElementById('clrCancel').addEventListener('click', closeColorPicker);
document.getElementById('clrSet').addEventListener('click', () => {
  const hex = document.getElementById('clrPreview') && getComputedStyle(document.querySelector('#colorOverlay .clr-card')).getPropertyValue('--clr-hex').trim();
  const fn = clrOnSet; closeColorPicker(); if (fn && /^#[0-9a-f]{6}$/i.test(hex)) fn(hex.toLowerCase());
});
document.getElementById('colorOverlay').addEventListener('click', e => { if (e.target.id === 'colorOverlay') closeColorPicker(); });
