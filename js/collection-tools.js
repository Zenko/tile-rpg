/* ---------------- search, filter and sort for My Cards and the Deck tab (one shared setting) ---------------- */
const cardFilter = { q: '', rarity: 'all', sort: 'rarity' };
const FILTER_CHIPS = [['all', 'All'], ['common', 'Common'], ['rare', 'Rare'], ['ultra', 'Ultra'], ['super', 'Super'], ['mythic', 'Mythic'], ['spell', '✨ Spells']];
const SORTS = { rarity: 'Rarity', cost: 'Cost', power: 'Power', name: 'Name' };
function filterSortCards(ids) {
  const q = cardFilter.q.trim().toLowerCase();
  const out = ids.filter(id => {
    const d = cardDef(id);
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
      <div class="cf-chips">${FILTER_CHIPS.map(([k, l]) => `<button class="cf-chip" data-r="${k}">${l}</button>`).join('')}</div>`;
    box.querySelector('.cf-search').addEventListener('input', e => { cardFilter.q = e.target.value; rerender(); });
    box.querySelector('.cf-sort-btn').addEventListener('click', () => { sfx('tap'); openSortOverlay(rerender); });
    box.querySelectorAll('.cf-chip').forEach(b => b.addEventListener('click', () => { cardFilter.rarity = b.dataset.r; sfx('tap'); rerender(); }));
  }
  const input = box.querySelector('.cf-search');
  if (input.value !== cardFilter.q) input.value = cardFilter.q;
  box.querySelector('.cf-sort-label').textContent = SORTS[cardFilter.sort];
  box.querySelectorAll('.cf-chip').forEach(b => b.classList.toggle('active', b.dataset.r === cardFilter.rarity));
}

// A custom "Sort by" sheet in place of a native <select>, which pops the OS's own picker on mobile and
// looks out of place in a game that skins every other control itself. Shared by both filter bars (My Cards
// and the Deck tab), so it just remembers which one to refresh when a choice is made.
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
function shareDeck() {
  const code = deckCode(state.deck);
  const done = () => { toast('📋 Deck code copied'); sfx('claim'); };
  try { navigator.clipboard.writeText(code).then(done, () => prompt('Copy your deck code:', code)); }
  catch (e) { prompt('Copy your deck code:', code); }
}
function loadDeckCode() {
  const code = prompt('Paste a deck code (it goes into the deck you are using now):');
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
function renderCharmBar() {
  const c = charms(), open = charmSlotsOpen(), own = new Set(state.ownedCards);
  const bar = document.createElement('div');
  bar.className = 'charm-bar';
  bar.innerHTML = `<div class="section-title" style="margin-top:0">✦ Charms <span class="title-sub">tap ✦ on a card to use it · each lends a small town perk</span></div>
    <div class="charm-slots">${[0, 1, 2].map(i => {
      if (i >= open) return `<div class="charm-slot locked">🔒<small>level ${CHARM_SLOT_LEVELS[i]}</small></div>`;
      const id = c[i] && own.has(c[i]) ? c[i] : null, info = id && charmInfo(id);
      return id ? `<button class="charm-slot on" data-uncharm="${i}"><span>${cardArtHtml(cardDef(id))}</span><small>${info ? info.text : 'no effect'}</small></button>` : '<div class="charm-slot"><span>✦</span><small>empty</small></div>';
    }).join('')}</div>`;
  collectionList.appendChild(bar);
  bar.querySelectorAll('[data-uncharm]').forEach(b => b.addEventListener('click', () => { clearCharm(+b.dataset.uncharm); renderCollection(); }));
}
function renderCollection() {
  collectionList.innerHTML = '';
  const counts = ownedCardCounts();
  const ids = Object.keys(counts);

  if (ids.length === 0) {
    collectionList.innerHTML = '<div class="panel-desc">No cards yet. Find some on the ground or win a friendly match.</div>';
    return;
  }

  const spares = totalSpares();
  if (spares > 0) {
    const bar = document.createElement('div');
    bar.className = 'release-bar';
    bar.innerHTML = `<span><b>${spares}</b> spare card${spares === 1 ? '' : 's'} · worth <b>🫧 ${totalSpareValue()}</b></span><span>You always keep enough for a full deck</span>`;
    collectionList.appendChild(bar);
  }

  renderFilterBar('collFilter', renderCollection);
  renderCharmBar();
  const shownIds = filterSortCards(ids);
  if (!shownIds.length) collectionList.insertAdjacentHTML('beforeend', '<div class="panel-desc">No cards match that search.</div>');
  shownIds.forEach(id => {
      const def = cardDef(id);
      const spare = spareCount(id);
      const inDeck = state.deck.filter(d => d === id).length;
      const value = RELEASE_VALUE[def.rarity];
      const item = document.createElement('div');
      item.className = 'panel-item' + (spare > 0 ? ' has-spare' : '');
      item.innerHTML = `
        <div class="card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}${foilCount(id) ? ' foil' : ''}">
          <span class="c-cost">${def.cost}</span>
          <span class="c-icon">${cardArtHtml(def)}</span>
          <span class="c-power">${cardStatsText(def)}</span>
        </div>
        <span class="panel-text">
          <div class="panel-name">${def.name} ${counts[id] > 1 ? '× ' + counts[id] : ''}${foilCount(id) ? ` <span class="foil-tag">✨ ${foilCount(id)} foil</span>` : ''}</div>
          <div class="panel-desc">${RARITY_LABEL[def.rarity]} · costs ${def.cost}⚡${inDeck ? ` · ${inDeck} in deck` : ''}${isDonated(id) ? ' · 🏛️' : ''}</div>
          <div class="mastery-line">${masteryLine(id)}</div>
          ${hasAbility(def) ? `<div class="panel-ability">${cardAbilityHtml(def)}</div>` : ''}
          ${spare > 0 ? `<div class="spare-tag">${spare} spare</div>` : ''}
        </span>
        <div class="row-actions">
          <button class="panel-action charm-btn${charms().includes(id) ? ' active' : ''}" data-charm="${id}" title="Use as a charm" aria-label="Use as a charm">✦</button>
          ${spare > 0 ? `<button class="panel-action release-btn" data-release="${id}">Release<br>+🫧 ${value}</button>` : ''}
        </div>
      `;
      collectionList.appendChild(item);
    });

  collectionList.querySelectorAll('[data-charm]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.charm, i = charms().indexOf(id);
    if (i >= 0) clearCharm(i); else { if (!charmInfo(id)) { toast('That card has no charm effect'); return; } setCharm(id); }
    const before = document.getElementById('screen').scrollTop; renderCollection(); document.getElementById('screen').scrollTop = before;
  }));
  collectionList.querySelectorAll('[data-release]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.release;
      const before = document.getElementById('screen').scrollTop;
      const gain = releaseCard(id);
      if (gain) {
        ensureAudio(); sfx('claim'); buzz(HAP.tap);
        bumpPill('pillPebbles');
        toast(`🫧 +${gain} ${gain === 1 ? 'Pebble' : 'Pebbles'}`);
        renderCollection();
        document.getElementById('screen').scrollTop = before;   // keep your place in the list
      }
    });
  });
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
function renameDeckSlot() {
  const slots = ensureDeckSlots(), s = slots[state.activeDeckSlot];
  const name = prompt('Name this deck', s.name);
  if (name && name.trim()) { s.name = name.trim().slice(0, 16); saveState(); renderDeckPanel(); }
}
function renderDeckSlots() {
  const slots = ensureDeckSlots(), box = document.getElementById('deckSlots');
  box.innerHTML = slots.map((s, i) => {
    const n = (i === state.activeDeckSlot ? state.deck : s.cards || []).length;
    return `<button class="dk-slot${i === state.activeDeckSlot ? ' active' : ''}" data-slot="${i}"><span class="dk-slot-name">${escapeHtml(s.name)}</span><span class="dk-slot-n">${n}/${DECK_SIZE}</span></button>`;
  }).join('') + '<button class="dk-slot-edit" id="deckRename" title="Rename this deck" aria-label="Rename this deck">✏️</button>';
  box.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => switchDeckSlot(+b.dataset.slot)));
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
  if (!shownIds.length) deckList.innerHTML = '<div class="panel-desc">No cards match that search.</div>';
  shownIds.forEach(id => {
      const def = cardDef(id);
      const inDeckCount = state.deck.filter(d => d === id).length;
      const ownedCount = counts[id];
      const cap = Math.min(ownedCount, MAX_COPIES);
      const canAdd = inDeckCount < cap && total < DECK_SIZE;

      const item = document.createElement('div');
      item.className = 'panel-item';
      item.innerHTML = `
        <div class="card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}">
          <span class="c-cost">${def.cost}</span>
          <span class="c-icon">${cardArtHtml(def)}</span>
          <span class="c-power">${cardStatsText(def)}</span>
        </div>
        <span class="panel-text">
          <div class="panel-name">${def.name}</div>
          <div class="panel-desc">In deck: ${inDeckCount}/${cap}${ownedCount > MAX_COPIES ? ` · ${ownedCount} owned` : ''}${masteryRank(id) ? ` · <b class="mastery-inline">${masteryStars(id)}</b>` : ''}</div>
          ${hasAbility(def) ? `<div class="panel-ability">${cardAbilityHtml(def)}</div>` : ''}
        </span>
        <button class="panel-action" data-add="${id}" ${canAdd ? '' : 'disabled'}>Add</button>
        <button class="panel-action" data-remove="${id}" ${inDeckCount > 0 ? '' : 'disabled'}>Remove</button>
      `;
      deckList.appendChild(item);
    });

  deckList.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.add;
      const c = ownedCardCounts();
      if (state.deck.length >= DECK_SIZE) return;
      if (state.deck.filter(d => d === id).length >= Math.min(c[id] || 0, MAX_COPIES)) return;
      state.deck.push(id); state.progress.deckEdits++;
      saveState(); sfx('tap'); buzz(HAP.tap);
      const before = document.getElementById('screen').scrollTop;
      renderDeckPanel(); updateHud(); checkAchievements();
      document.getElementById('screen').scrollTop = before;
    });
  });

  deckList.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = state.deck.indexOf(btn.dataset.remove);
      if (idx >= 0) { state.deck.splice(idx, 1); state.progress.deckEdits++; }
      saveState(); sfx('tap'); buzz(HAP.tap);
      const before = document.getElementById('screen').scrollTop;
      renderDeckPanel(); updateHud();
      document.getElementById('screen').scrollTop = before;
    });
  });

  if (deckSizeHudEl) deckSizeHudEl.textContent = `${state.deck.length}/${DECK_SIZE}`;
}

document.getElementById('deckHelp').addEventListener('click', () => btShowHelp());
document.getElementById('deckAuto').addEventListener('click', () => {
  if (state.deck.length >= DECK_SIZE) return;
  state.deck = BattleEngine.suggestDeck(ownedCardCounts(), state.deck);   // keeps your picks, fills the rest
  state.progress.deckEdits++; saveState(); sfx('claim'); buzz(HAP.tap);
  renderDeckPanel(); updateHud(); checkAchievements();
  toast(state.deck.length >= DECK_SIZE ? '🎴 Deck filled' : `🎴 Only ${state.deck.length} cards available so far`);
});
document.getElementById('deckClear').addEventListener('click', () => {
  state.deck = []; state.progress.deckEdits++; saveState(); sfx('tap'); buzz(HAP.tap);
  renderDeckPanel(); updateHud();
});

// Kept as the one place that refreshes the floating radar whenever district state changes (wins, level,
// crossing, fast travel) - the full district list now lives in the World Map overlay instead of its own tab.
function renderDistricts() {
  renderRadar();
}

