/* ---------------- search, filter and sort for My Cards and the Deck segment (one shared setting) ---------------- */
const cardFilter = { q: '', rarity: 'all', fam: 'all', sort: 'rarity' };
let collView = 'grid';       // My Cards: 'grid' (tiles, tap for the detail sheet) or 'list'
let deckView = 'build';     // Deck sub-view: 'build' (tray, chart, keywords) or 'add' (pinned strip + your cards)
let deckInfoMode = false;    // Deck: tapping a card reads it instead of adding it
let collFilterOpen = true;   // My Cards' filter starts open (browse-first screen); setCardsView() reads this instead of forcing it open every time the tab is shown
const FILTER_CHIPS = [['all', 'All'], ['common', 'Common'], ['rare', 'Rare'], ['ultra', 'Ultra'], ['super', 'Super'], ['mythic', 'Mythic'], ['spell', '✨ Spells']];
const FAM_CHIPS = [['all', 'All families'], ...Object.keys(FAMILIES).map(k => [k, FAMILIES[k].icon + ' ' + FAMILIES[k].name])];
const SORTS = { rarity: 'Rarity', cost: 'Cost', power: 'Power', name: 'Name' };
function filterSortCards(ids) {
  const q = cardFilter.q.trim().toLowerCase();
  const out = ids.filter(id => {
    const d = cardDef(id);
    if (cardFilter.fam !== 'all' && CARD_FAMILY[BattleEngine.baseIdOf(id)] !== cardFilter.fam) return false;
    if (cardFilter.rarity === 'spell' ? !d.spell : (cardFilter.rarity !== 'all' && d.rarity !== cardFilter.rarity)) return false;
    if (!q) return true;
    return d.name.toLowerCase().includes(q) || d.kw.some(k => KW[k].name.toLowerCase().includes(q)) || (d.spell && ('spell ' + spellText(d)).toLowerCase().includes(q));
  });
  const R = id => RARITY_ORDER.indexOf(cardDef(id).rarity), D = cardDef;
  const cmp = {
    rarity: (a, b) => R(b) - R(a) || D(a).cost - D(b).cost || D(b).power - D(a).power || (a < b ? -1 : 1),
    cost:   (a, b) => D(a).cost - D(b).cost || R(b) - R(a) || (a < b ? -1 : 1),
    power:  (a, b) => D(b).power - D(a).power || D(b).grit - D(a).grit || (a < b ? -1 : 1),
    name:   (a, b) => D(a).name.localeCompare(D(b).name) || (a < b ? -1 : 1),
  }[cardFilter.sort] || (() => 0);
  return out.sort(cmp);
}
// Built once per panel, then only kept in sync - rebuilding it on every keystroke would drop the keyboard.
function renderFilterBar(boxId, rerender) {
  const box = document.getElementById(boxId);
  if (!box.dataset.built) {
    box.dataset.built = '1';
    box.innerHTML = `<div class="cf-row"><input type="search" class="cf-search" placeholder="Search cards or keywords" aria-label="Search cards">
      <button class="cf-sort-btn" aria-label="Sort cards">Sort: <span class="cf-sort-label"></span><span class="cf-caret">▾</span></button></div>
      <div class="cf-chips cf-fams">${FAM_CHIPS.map(([k, l]) => `<button class="cf-chip cf-fam" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="cf-chips">${FILTER_CHIPS.map(([k, l]) => `<button class="cf-chip" data-r="${k}">${l}</button>`).join('')}</div>`;
    box.querySelector('.cf-search').addEventListener('input', e => { cardFilter.q = e.target.value; rerender(); });
    box.querySelector('.cf-sort-btn').addEventListener('click', () => { sfx('tap'); openSortOverlay(rerender); });
    onAll(box, '.cf-chip[data-r]', b => { cardFilter.rarity = b.dataset.r; sfx('tap'); rerender(); });
    onAll(box, '.cf-fam', b => { cardFilter.fam = b.dataset.f; sfx('tap'); rerender(); });
  }
  const input = box.querySelector('.cf-search');
  if (input.value !== cardFilter.q) input.value = cardFilter.q;
  box.querySelector('.cf-sort-label').textContent = SORTS[cardFilter.sort];
  box.querySelectorAll('.cf-chip[data-r]').forEach(b => b.classList.toggle('active', b.dataset.r === cardFilter.rarity));
  box.querySelectorAll('.cf-fam').forEach(b => b.classList.toggle('active', b.dataset.f === cardFilter.fam));
}

// A custom "Sort by" sheet in place of a native <select>, which pops the OS's own picker on mobile and
// looks out of place in a game that skins every other control itself. Shared by both filter bars (My Cards
// and the Deck segment), so it just remembers which one to refresh when a choice is made.
let sortOverlayRerender = null;
function openSortOverlay(rerender) {
  sortOverlayRerender = rerender;
  const box = document.getElementById('sortOptions');
  box.innerHTML = Object.keys(SORTS).map(k => `<button class="sort-opt${k === cardFilter.sort ? ' active' : ''}" data-s="${k}">${SORTS[k]}</button>`).join('');
  box.querySelectorAll('.sort-opt').forEach(b => b.addEventListener('click', () => {
    cardFilter.sort = b.dataset.s; sfx('claim'); closeSortOverlay(); if (sortOverlayRerender) sortOverlayRerender();
  }));
  document.getElementById('sortOverlay').classList.remove('hidden');
}
function closeSortOverlay() { document.getElementById('sortOverlay').classList.add('hidden'); }
document.getElementById('sortOverlayClose').addEventListener('click', () => { sfx('nav'); closeSortOverlay(); });
// Tapping the dimmed backdrop closes it too, same as the player menu/inventory panels.
document.getElementById('sortOverlay').addEventListener('click', e => { if (e.target.id === 'sortOverlay') closeSortOverlay(); });

/* ---------------- deck codes: a short text version of a deck, to share or keep ----------------
   Each card is its place in CARD_POOL (base 36) plus any crafted suffix, e.g. "TRPG1:0,0,1,1,2~p.guard". New cards
   are only ever added to the END of CARD_POOL, so old codes keep working. */
function deckCode(ids) {
  return 'TRPG1:' + ids.map(id => { const base = BattleEngine.baseIdOf(id), i = CARD_POOL.findIndex(c => c.id === base); return i < 0 ? '' : i.toString(36) + id.slice(base.length); }).filter(Boolean).join(',');
}
function parseDeckCode(code) {
  const m = /^\s*TRPG1:([0-9a-z~.,]+)\s*$/i.exec(code || '');
  if (!m) return null;
  const ids = m[1].split(',').map(part => { const mm = /^([0-9a-z]+)(~.*)?$/i.exec(part); if (!mm) return null; const c = CARD_POOL[parseInt(mm[1], 36)]; return c ? c.id + (mm[2] || '') : null; });
  return ids.filter(id => id && cardDef(id)).slice(0, DECK_SIZE);
}
// A real overlay (like #feedbackOverlay/#cloudOverlay) instead of prompt()/alert(), so a single-line
// input (rename a deck, paste a code) looks and behaves like the rest of the game's modals rather than
// a bare unstyled browser popup. Promise-based, same shape as sendFeedback()/cloudOpenModal().
let textPromptResolve = null;
function openTextPrompt({ title, desc, value, placeholder, submitLabel, readonly, maxlength }) {
  document.getElementById('textPromptTitle').textContent = title || '';
  const descEl = document.getElementById('textPromptDesc');
  descEl.textContent = desc || ''; descEl.classList.toggle('hidden', !desc);
  document.getElementById('textPromptSubmit').textContent = submitLabel || 'OK';
  const input = document.getElementById('textPromptInput');
  input.value = value || ''; input.placeholder = placeholder || ''; input.readOnly = !!readonly;
  if (maxlength) input.maxLength = maxlength; else input.removeAttribute('maxlength');
  document.getElementById('textPromptOverlay').classList.remove('hidden');
  setTimeout(() => { input.focus(); if (readonly) input.select(); }, 50);
  return new Promise(resolve => { textPromptResolve = resolve; });
}
function closeTextPrompt(result) {
  document.getElementById('textPromptOverlay').classList.add('hidden');
  if (textPromptResolve) { const r = textPromptResolve; textPromptResolve = null; r(result); }
}
document.getElementById('textPromptCancel').addEventListener('click', () => { sfx('nav'); closeTextPrompt(null); });
document.getElementById('textPromptSubmit').addEventListener('click', () => { sfx('claim'); closeTextPrompt(document.getElementById('textPromptInput').value); });
document.getElementById('textPromptInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('textPromptSubmit').click(); });
document.getElementById('textPromptOverlay').addEventListener('click', e => { if (e.target.id === 'textPromptOverlay') { sfx('nav'); closeTextPrompt(null); } });

async function shareDeck() {
  const code = deckCode(state.deck);
  try { await navigator.clipboard.writeText(code); toast('📋 Deck code copied'); sfx('claim'); return; }
  catch (e) { /* no clipboard access - fall through to the manual-copy modal below */ }
  await openTextPrompt({ title: 'Your deck code', desc: "Couldn't copy automatically - select the code below and copy it yourself.", value: code, readonly: true, submitLabel: 'Done' });
}
async function loadDeckCode() {
  const code = await openTextPrompt({ title: 'Load a deck code', desc: 'Paste a deck code below. It replaces the deck you are using now.', placeholder: 'TRPG1:...', submitLabel: 'Load' });
  if (code === null) return;
  const ids = parseDeckCode(code);
  if (!ids || !ids.length) { toast("That doesn't look like a deck code"); sfx('tie'); return; }
  const deck = usableDeck(ids), missing = ids.length - deck.length;
  state.deck = deck; state.progress.deckEdits++; saveState();
  renderDeckPanel(); updateHud(); sfx('claim');
  toast(missing ? `🎴 Loaded - ${missing} card${missing === 1 ? '' : 's'} you don't own were left out` : '🎴 Deck loaded');
}
document.getElementById('deckShare').addEventListener('click', shareDeck);
document.getElementById('deckLoad').addEventListener('click', loadDeckCode);

function masteryLine(id) {
  const x = masteryXp(id), r = masteryRank(id), next = MASTERY_AT[r];
  return `${r ? `<b>${'★'.repeat(r)}</b> ` : ''}${next ? `mastery ${x}/${next}` : 'fully mastered · +1 health in battle'}`;
}
/* ---------- card tiles and the detail sheet (Beta 2) ----------
   My Cards and the Deck builder both show cards as tiles. Tapping a tile opens the detail sheet (or, in the Deck, adds the
   card); everything you can do to one card - deck, craft, charm, release a spare - lives in that one sheet. */
function cardTileHtml(id, count, opts) {
  const def = cardDef(id), inDeck = state.deck.filter(d => d === id).length, o = opts || {};
  return `<button type="button" class="alm-card tile rarity-${def.rarity}${def.crafted ? ' crafted' : ''}${foilCount(id) ? ' foil' : ''}${o.dim ? ' dim' : ''}" data-tile="${id}" aria-label="${escapeHtml(def.name)}">
    ${count > 1 ? `<span class="ac-count">×${count}</span>` : ''}<span class="ac-cost">${def.cost}</span>
    <span class="ac-icon">${cardArtHtml(def)}</span>${!def.spell && def.kw.length ? `<span class="ac-kw">${def.kw.map(k => `<i>${KW[k].icon}</i>`).join('')}</span>` : ''}
    <span class="ac-paper"><span class="ac-name">${def.name}</span><span class="ac-power">${cardStatsText(def)}</span></span>
    ${inDeck ? `<span class="ac-in">in deck ×${inDeck}</span>` : ''}</button>`;
}
const cardsKeepScroll = fn => { const sc = document.getElementById('screen'), before = sc.scrollTop; fn(); sc.scrollTop = before; };
const refreshCardsView = () => cardsKeepScroll(() => { if (cardsView === 'deck') renderDeckPanel(); else renderCollection(); });

function deckAdd(id) {
  const c = ownedCardCounts();
  if (state.deck.length >= DECK_SIZE) { toast(`Your deck is full (${DECK_SIZE} cards)`); sfx('tie'); return false; }
  if (state.deck.filter(d => d === id).length >= Math.min(c[id] || 0, MAX_COPIES)) { toast(`Up to ${Math.min(c[id] || 0, MAX_COPIES)} of this card`); sfx('tie'); return false; }
  state.deck.push(id); state.progress.deckEdits++;
  saveState(); sfx('tap'); buzz(HAP.tap); updateHud(); checkAchievements();
  return true;
}
function deckRemove(id) {
  const idx = state.deck.lastIndexOf(id);
  if (idx < 0) return false;
  state.deck.splice(idx, 1); state.progress.deckEdits++;
  saveState(); sfx('tap'); buzz(HAP.tap); updateHud();
  return true;
}

let cardSheetId = null;
function openCardSheet(id) { cardSheetId = id; drawCardSheet(); document.getElementById('cardSheet').classList.add('show'); document.getElementById('cardScrim').classList.add('show'); sfx('flip'); buzz(HAP.tap); }
function closeCardSheet() { cardSheetId = null; document.getElementById('cardSheet').classList.remove('show'); document.getElementById('cardScrim').classList.remove('show'); }
function drawCardSheet() {
  const id = cardSheetId, box = document.getElementById('cardSheetBody'); if (!id) return;
  const def = cardDef(id), n = ownedCardCounts()[id] || 0;
  if (!def || !n) { closeCardSheet(); return; }
  const spare = spareCount(id), inDeck = state.deck.filter(d => d === id).length, cap = Math.min(n, MAX_COPIES), fam = CARD_FAMILY[BattleEngine.baseIdOf(id)];
  const stats = def.spell ? '✨ Spell' : `⚔ ${def.power} · ♥ ${def.grit}`;
  const charmOn = charms().includes(id), refinable = n >= 2 && !def.crafted && !def.spell;
  box.innerHTML = `<div class="cs-top"><div class="ins-card rarity-${def.rarity}"><span class="ins-cost">${def.cost}</span><div class="ins-icon">${cardArtHtml(def)}</div></div>
    <div class="cs-info"><b class="cs-name">${def.name}${def.crafted ? ' ✦' : ''}</b>
      <span class="cs-sub">${RARITY_LABEL[def.rarity]} · costs ${def.cost}⚡${fam ? ` · ${FAMILIES[fam].icon} ${FAMILIES[fam].name}` : ''}</span>
      <span class="cs-stats">${stats}</span>
      <span class="cs-sub">Owned ×${n}${foilCount(id) ? ` · ✨ ${foilCount(id)} foil` : ''} · ${inDeck} in deck · ${spare} spare${isDonated(id) ? ' · 🏛️' : ''}</span>
      <span class="cs-sub">${masteryLine(id)}</span></div></div>
    ${hasAbility(def) ? `<div class="cs-abil">${cardAbilityHtml(def)}</div>` : ''}
    <p class="cs-story">${cardStory(def)}</p>
    <div class="cs-actions">
      ${inDeck ? `<button class="btn" data-cs="rem">Remove from deck</button>` : ''}
      <button class="btn${inDeck ? '' : ' cs-primary'}" data-cs="add" ${inDeck >= cap || state.deck.length >= DECK_SIZE ? 'disabled' : ''}>${state.deck.length >= DECK_SIZE && inDeck < cap ? 'Deck is full' : inDeck ? 'Add another' : 'Add to deck'}</button>
      <button class="btn" data-cs="craft" ${refinable ? '' : 'disabled'}>🔨 ${refinable ? 'Refine in Workshop' : def.spell || def.crafted ? 'Cannot be refined' : 'Refine needs 2 copies'}</button>
      <button class="btn${charmOn ? ' cs-on' : ''}" data-cs="charm">✦ ${charmOn ? 'Remove charm' : 'Use as charm'}</button>
      <button class="btn" data-cs="release" ${spare > 0 ? '' : 'disabled'}>Release a spare · +🫧 ${RELEASE_VALUE[def.rarity]}</button>
    </div>`;
  box.querySelectorAll('[data-cs]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.cs;
    if (act === 'add') deckAdd(id);
    else if (act === 'rem') deckRemove(id);
    else if (act === 'craft') { closeCardSheet(); refineOpenId = id; setCardsView('craft'); return; }
    else if (act === 'charm') {
      const i = charms().indexOf(id);
      if (i >= 0) clearCharm(i); else if (!charmInfo(id)) { toast('That card has no charm effect'); return; } else setCharm(id);
    } else if (act === 'release') {
      const gain = releaseCard(id);
      if (gain) { ensureAudio(); sfx('claim'); buzz(HAP.tap); bumpPill('pillPebbles'); toast(`🫧 +${gain} ${gain === 1 ? 'Pebble' : 'Pebbles'}`); }
    }
    drawCardSheet(); refreshCardsView();
  }));
}
document.getElementById('cardScrim').addEventListener('click', closeCardSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cardSheetId) closeCardSheet(); });
document.getElementById('collViewToggle').addEventListener('click', () => {
  collView = collView === 'grid' ? 'list' : 'grid'; sfx('nav'); buzz(HAP.tap); renderCollection();
});

function renderCharmBar() {
  const c = charms(), open = charmSlotsOpen(), own = new Set(state.ownedCards);
  const bar = document.createElement('div');
  bar.className = 'charm-bar';
  bar.innerHTML = `<div class="section-title" style="margin-top:0">✦ Charms <span class="title-sub">open a card and tap ✦ · each lends a small town perk</span></div>
    <div class="charm-slots">${[0, 1, 2].map(i => {
      if (i >= open) return `<div class="charm-slot locked">🔒<small>level ${CHARM_SLOT_LEVELS[i]}</small></div>`;
      const id = c[i] && own.has(c[i]) ? c[i] : null, info = id && charmInfo(id);
      return id ? `<button class="charm-slot on" data-uncharm="${i}"><span>${cardArtHtml(cardDef(id))}</span><small>${info ? info.text : 'no effect'}</small></button>` : '<div class="charm-slot"><span>✦</span><small>empty</small></div>';
    }).join('')}</div>`;
  collectionList.appendChild(bar);
  onAll(bar, '[data-uncharm]', b => { clearCharm(+b.dataset.uncharm); renderCollection(); });
}
function renderCollection() {
  collectionList.innerHTML = '';
  const counts = ownedCardCounts();
  const ids = Object.keys(counts);
  document.getElementById('collViewToggle').textContent = collView === 'grid' ? '☰ List' : '▦ Grid';

  if (ids.length === 0) {
    collectionList.innerHTML = '<div class="panel-desc">No cards yet. Find some on the ground or win a friendly match.</div>';
    return;
  }

  renderFilterBar('collFilter', renderCollection);
  const spares = totalSpares();
  if (spares > 0) {
    const bar = document.createElement('div');
    bar.className = 'release-bar';
    bar.innerHTML = `<span><b>${spares}</b> spare card${spares === 1 ? '' : 's'} · worth <b>🫧 ${totalSpareValue()}</b></span><span>You always keep enough for a full deck</span>`;
    collectionList.appendChild(bar);
  }
  const shownIds = filterSortCards(ids);
  if (!shownIds.length) {
    collectionList.insertAdjacentHTML('beforeend', '<div class="panel-desc cards-empty">No cards match that search.<br><button class="panel-action" id="clearCardFilter">Clear filters</button></div>');
    document.getElementById('clearCardFilter').addEventListener('click', () => { cardFilter.q = ''; cardFilter.rarity = 'all'; cardFilter.fam = 'all'; renderCollection(); });
  } else if (collView === 'grid') {
    const grid = document.createElement('div'); grid.className = 'alm-row card-grid';
    grid.innerHTML = shownIds.map(id => cardTileHtml(id, counts[id])).join('');
    collectionList.appendChild(grid);
  } else {
    shownIds.forEach(id => {
      const def = cardDef(id), spare = spareCount(id), inDeck = state.deck.filter(d => d === id).length;
      const item = document.createElement('button'); item.type = 'button';
      item.className = 'panel-item card-row' + (spare > 0 ? ' has-spare' : '');
      item.dataset.tile = id;
      item.innerHTML = `
        <div class="card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}${foilCount(id) ? ' foil' : ''}">
          <span class="c-cost">${def.cost}</span><span class="c-icon">${cardArtHtml(def)}</span><span class="c-power">${cardStatsText(def)}</span>
        </div>
        <span class="panel-text">
          <div class="panel-name">${def.name} ${counts[id] > 1 ? '× ' + counts[id] : ''}${foilCount(id) ? ` <span class="foil-tag">✨ ${foilCount(id)} foil</span>` : ''}</div>
          <div class="panel-desc">${RARITY_LABEL[def.rarity]} · costs ${def.cost}⚡${inDeck ? ` · ${inDeck} in deck` : ''}${spare ? ` · ${spare} spare` : ''}${isDonated(id) ? ' · 🏛️' : ''}</div>
          ${hasAbility(def) ? `<div class="panel-ability">${cardAbilityHtml(def)}</div>` : ''}
        </span><span class="cr-chevron">›</span>`;
      collectionList.appendChild(item);
    });
  }
  renderCharmBar();
  onAll(collectionList, '[data-tile]', t => openCardSheet(t.dataset.tile));
}

/* ---------------- deck slots: three saved decks, one of them active ----------------
   state.deck is always the active deck (everything else reads it); state.deckSlots keeps a copy of each slot and
   saveState() keeps the active slot's copy current. A slot's cards are checked against the collection when you switch
   to it, since cards may have been released or crafted away in the meantime. */
const DECK_SLOT_COUNT = 3;
function ensureDeckSlots() {
  if (!Array.isArray(state.deckSlots) || state.deckSlots.length !== DECK_SLOT_COUNT) {
    const old = Array.isArray(state.deckSlots) ? state.deckSlots : [];
    state.deckSlots = Array.from({ length: DECK_SLOT_COUNT }, (_, i) => old[i] || { name: 'Deck ' + (i + 1), cards: [] });
    if (typeof state.activeDeckSlot !== 'number' || !state.deckSlots[state.activeDeckSlot]) state.activeDeckSlot = 0;
    state.deckSlots[state.activeDeckSlot].cards = state.deck.slice();
  }
  if (typeof state.activeDeckSlot !== 'number' || !state.deckSlots[state.activeDeckSlot]) state.activeDeckSlot = 0;
  return state.deckSlots;
}
// The part of a saved list you can actually field right now: owned copies only, 2 of a kind, 12 at most.
function usableDeck(cards) {
  const counts = ownedCardCounts(), used = {}, out = [];
  (cards || []).forEach(id => {
    if (!cardDef(id) || out.length >= DECK_SIZE) return;
    used[id] = (used[id] || 0) + 1;
    if (used[id] <= Math.min(counts[id] || 0, MAX_COPIES)) out.push(id);
  });
  return out;
}
function switchDeckSlot(i) {
  const slots = ensureDeckSlots();
  if (i === state.activeDeckSlot || !slots[i]) return;
  slots[state.activeDeckSlot].cards = state.deck.slice();
  state.activeDeckSlot = i;
  const want = slots[i].cards || [], deck = usableDeck(want);
  state.deck = deck; slots[i].cards = deck.slice();
  saveState(); sfx('flip'); buzz(HAP.tap);
  toast(deck.length < want.length ? `🎴 ${slots[i].name}: some cards are gone - Auto-fill can top it up` : `🎴 Now using ${slots[i].name}`);
  renderDeckPanel(); updateHud();
}
async function renameDeckSlot() {
  const slots = ensureDeckSlots(), s = slots[state.activeDeckSlot];
  const name = await openTextPrompt({ title: 'Name this deck', value: s.name, submitLabel: 'Save', maxlength: 16 });
  if (name && name.trim()) { s.name = name.trim().slice(0, 16); saveState(); renderDeckPanel(); }
}
function renderDeckSlots() {
  const slots = ensureDeckSlots(), box = document.getElementById('deckSlots');
  box.innerHTML = slots.map((s, i) => {
    const n = (i === state.activeDeckSlot ? state.deck : s.cards || []).length;
    return `<button class="dk-slot${i === state.activeDeckSlot ? ' active' : ''}" data-slot="${i}"><span class="dk-slot-name">${escapeHtml(s.name)}</span><span class="dk-slot-n">${n}/${DECK_SIZE}</span></button>`;
  }).join('') + '<button class="dk-slot-edit" id="deckRename" title="Rename this deck" aria-label="Rename this deck">✏️</button>';
  onAll(box, '[data-slot]', b => switchDeckSlot(+b.dataset.slot));
  document.getElementById('deckRename').addEventListener('click', renameDeckSlot);
}

function renderDeckPanel() {
  renderDeckSlots();
  deckList.innerHTML = '';
  const counts = ownedCardCounts();
  const ids = Object.keys(counts);
  const total = state.deck.length;

  // Header, cost curve, keyword tally
  const avg = total ? (state.deck.reduce((n, id) => n + cardDef(id).cost, 0) / total).toFixed(1) : '0';
  document.getElementById('deckHeader').innerHTML = `<b>${total}/${DECK_SIZE}</b> cards · up to ${MAX_COPIES} of each · average cost ${avg}`;
  const byCost = [1, 2, 3, 4, 5].map(c => state.deck.filter(id => cardDef(id).cost === c).length);
  const maxBar = Math.max(4, ...byCost);
  document.getElementById('deckCurve').innerHTML = byCost.map((n, i) =>
    `<div class="col"><div class="barwrap"><div class="bar" style="height:${Math.max(n ? 10 : 3, n / maxBar * 100)}%"><span>${n || ''}</span></div></div><div class="lbl">${i + 1} ⚡</div></div>`).join('');
  const kwCount = {};
  state.deck.forEach(id => cardDef(id).kw.forEach(k => { kwCount[k] = (kwCount[k] || 0) + 1; }));
  const spellCount = state.deck.filter(id => cardDef(id).spell).length;
  document.getElementById('deckKws').innerHTML = Object.keys(KW).map(k => `<span title="${KW[k].name}">${KW[k].icon} ${kwCount[k] || 0}</span>`).join('') + `<span title="Spells">✨ ${spellCount}</span>`;
  // The tray: all twelve slots at a glance. Tap a card to take it out (or read it, in Info mode).
  const tray = document.getElementById('deckTray');
  tray.innerHTML = Array.from({ length: DECK_SIZE }, (_, i) => {
    const id = state.deck[i];
    if (!id) return '<div class="dk-tslot empty"></div>';
    const def = cardDef(id);
    return `<button type="button" class="dk-tslot card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}" data-tray="${id}" aria-label="${deckInfoMode ? 'Read' : 'Remove'} ${escapeHtml(def.name)}"><span class="c-cost">${def.cost}</span><span class="c-icon">${cardArtHtml(def)}</span></button>`;
  }).join('');
  tray.querySelectorAll('[data-tray]').forEach(b => b.addEventListener('click', () => {
    if (deckInfoMode) { openCardSheet(b.dataset.tray); return; }
    deckRemove(b.dataset.tray); cardsKeepScroll(renderDeckPanel);
  }));
  // Add cards view: the same twelve cards as a thin strip that stays pinned above the collection, so the deck is never out of sight.
  const strip = document.getElementById('deckStrip');
  strip.innerHTML = Array.from({ length: DECK_SIZE }, (_, i) => {
    const id = state.deck[i];
    if (!id) return '<div class="dk-sslot empty"></div>';
    const def = cardDef(id);
    return `<button type="button" class="dk-sslot card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}" data-tray="${id}" aria-label="${deckInfoMode ? 'Read' : 'Remove'} ${escapeHtml(def.name)}"><span class="c-icon">${cardArtHtml(def)}</span></button>`;
  }).join('');
  strip.querySelectorAll('[data-tray]').forEach(b => b.addEventListener('click', () => {
    if (deckInfoMode) { openCardSheet(b.dataset.tray); return; }
    deckRemove(b.dataset.tray); cardsKeepScroll(renderDeckPanel);
  }));
  document.getElementById('deckAddCount').innerHTML = `<b>${total}/${DECK_SIZE}</b> · avg ${avg}`;
  document.getElementById('deckAutoAdd').disabled = total >= DECK_SIZE || ids.length === 0;
  ['deckInfoToggle', 'deckInfoToggleAdd'].forEach(id => {
    const b = document.getElementById(id), short = id === 'deckInfoToggleAdd';
    b.classList.toggle('active', deckInfoMode); b.setAttribute('aria-pressed', String(deckInfoMode));
    b.textContent = deckInfoMode ? (short ? 'ⓘ On' : 'ⓘ Info mode: on') : (short ? 'ⓘ Info' : 'ⓘ Info mode');
  });
  if (typeof renderDeckInsights === 'function') renderDeckInsights();
  if (typeof renderDeckSpread === 'function') renderDeckSpread();
  setDeckSubView(deckView, true);
  // A full deck with almost nothing cheap has little to play in the first turns, and simulation showed those decks lose a lot.
  const cheap = state.deck.filter(id => cardDef(id).cost <= 2).length, tipEl = document.getElementById('deckTip');
  const needTip = total >= DECK_SIZE && cheap < 4;
  tipEl.classList.toggle('hidden', !needTip);
  if (needTip) tipEl.textContent = `🌱 Only ${cheap} cheap card${cheap === 1 ? '' : 's'} (cost 1 or 2). Early turns go better with 4 or more. Auto-fill can build a balanced deck.`;
  document.getElementById('deckAuto').disabled = total >= DECK_SIZE || ids.length === 0;
  document.getElementById('deckClear').disabled = total === 0;

  if (ids.length === 0) {
    deckList.innerHTML = '<div class="panel-desc">Collect cards first, then build a deck here.</div>';
    if (deckSizeHudEl) deckSizeHudEl.textContent = `${total}/${DECK_SIZE}`;
    return;
  }

  renderFilterBar('deckFilter', renderDeckPanel);
  const shownIds = filterSortCards(ids);
  deckList.className = shownIds.length ? 'alm-row card-grid' : 'panel-list';
  if (!shownIds.length) deckList.innerHTML = '<div class="panel-desc">No cards match that search.</div>';
  else deckList.innerHTML = shownIds.map(id => {
    const inDeckCount = state.deck.filter(d => d === id).length, cap = Math.min(counts[id], MAX_COPIES);
    return cardTileHtml(id, counts[id], { dim: !deckInfoMode && (inDeckCount >= cap || total >= DECK_SIZE) });
  }).join('');
  deckList.querySelectorAll('[data-tile]').forEach(t => t.addEventListener('click', () => {
    if (deckInfoMode) { openCardSheet(t.dataset.tile); return; }
    if (deckAdd(t.dataset.tile)) cardsKeepScroll(renderDeckPanel);
  }));

  if (deckSizeHudEl) deckSizeHudEl.textContent = `${state.deck.length}/${DECK_SIZE}`;
}

// Your deck / Add cards: two views of the same Deck tab. `quiet` skips the click sound when a render re-applies the current view.
function setDeckSubView(view, quiet) {
  deckView = view;
  document.getElementById('deckBuild').classList.toggle('hidden', view !== 'build');
  document.getElementById('deckAdd').classList.toggle('hidden', view !== 'add');
  document.getElementById('deckSegBuild').classList.toggle('active', view === 'build');
  document.getElementById('deckSegAdd').classList.toggle('active', view === 'add');
  if (!quiet) { sfx('nav'); buzz(HAP.tap); }
}
document.getElementById('deckSegBuild').addEventListener('click', () => { if (deckView !== 'build') cardsKeepScroll(() => setDeckSubView('build')); });
document.getElementById('deckSegAdd').addEventListener('click', () => { if (deckView !== 'add') cardsKeepScroll(() => setDeckSubView('add')); });

// Shared toggle behavior for any button/panel pair that shows or hides a section - used by Deck's
// Options/Filter toggles (both start collapsed: the deck screen's most common job, adding/removing a
// few cards, needs neither visible up front) and My Cards' Filter toggle (starts open: My Cards is a
// browse-first screen where the filter is usually wanted right away, but can still be tucked away).
function panelToggleSection(btn, panel) {
  const open = panel.classList.toggle('hidden') === false;
  btn.classList.toggle('active', open);
  btn.setAttribute('aria-expanded', String(open));
  sfx('nav'); buzz(HAP.tap);
}
document.getElementById('deckOptionsToggle').addEventListener('click', function () { panelToggleSection(this, document.getElementById('deckOptions')); });
document.getElementById('deckFilterToggle').addEventListener('click', function () { panelToggleSection(this, document.getElementById('deckFilter')); });
document.getElementById('collFilterToggle').addEventListener('click', function () { panelToggleSection(this, document.getElementById('collFilter')); collFilterOpen = this.classList.contains('active'); });

document.getElementById('deckHelp').addEventListener('click', () => btShowHelp());
['deckInfoToggle', 'deckInfoToggleAdd'].forEach(id => document.getElementById(id).addEventListener('click', () => { deckInfoMode = !deckInfoMode; sfx('nav'); buzz(HAP.tap); renderDeckPanel(); }));
['deckAuto', 'deckAutoAdd'].forEach(id => document.getElementById(id).addEventListener('click', () => {
  if (state.deck.length >= DECK_SIZE) return;
  state.deck = BattleEngine.suggestDeck(ownedCardCounts(), state.deck);   // keeps your picks, fills the rest
  state.progress.deckEdits++; saveState(); sfx('claim'); buzz(HAP.tap);
  renderDeckPanel(); updateHud(); checkAchievements();
  toast(state.deck.length >= DECK_SIZE ? '🎴 Deck filled' : `🎴 Only ${state.deck.length} cards available so far`);
}));
document.getElementById('deckClear').addEventListener('click', () => {
  state.deck = []; state.progress.deckEdits++; saveState(); sfx('tap'); buzz(HAP.tap);
  renderDeckPanel(); updateHud();
});

// Kept as the one place that refreshes the floating radar whenever district state changes (wins, level,
// crossing, fast travel) - the full district list now lives in the World Map overlay instead of its own tab.
function renderDistricts() {
  renderRadar();
}

