/* ---------- Starter cards and the move to the turn-based battle ---------- */
const STARTER_CARDS = ['sprout','sprout','pebble','pebble','reed','reed','droplet','toadstool','toadstool','bubble','flintstone','moth'];

// Adds just enough common cards that a full 12-card deck can be built. Returns the ids that were added.
function ensurePlayableCollection() {
  const granted = [];
  for (const id of STARTER_CARDS) {
    if (deckSlots() >= DECK_SIZE) break;
    if (state.ownedCards.filter(c => c === id).length < MAX_COPIES) { state.ownedCards.push(id); granted.push(id); }
  }
  state.progress.starterGranted = (state.progress.starterGranted || 0) + granted.length;
  return granted;
}

// Runs once per save. Older saves had 5-card decks and simple opponents, so: rebuild opponent decks, top up cards if a
// full deck isn't possible yet, and fill the player's deck (keeping any picks they had). Nothing is ever taken away.
function migrateToBattleV2() {
  const pr = state.progress;
  if (pr.battleV2) return null;
  pr.battleV2 = true;
  Object.values(state.districtData || {}).forEach(d => {
    (d.npcs || []).forEach(n => { if (!Array.isArray(n.deck) || n.deck.length !== DECK_SIZE) n.deck = buildDeckForOpponent(DECK_SIZE, false); });
    if (d.boss && (!Array.isArray(d.boss.deck) || d.boss.deck.length !== DECK_SIZE)) d.boss.deck = buildDeckForOpponent(DECK_SIZE, true);
  });
  const before = state.ownedCards.length;
  const granted = ensurePlayableCollection();
  state.deck = BattleEngine.suggestDeck(ownedCardCounts(), state.deck);
  saveState();
  return { granted, brandNew: before === 0 };
}

// A card can only be released if a full 12-card deck stays buildable afterwards.
// Copies beyond the 2-copy limit are always free to release; the second copy of a card is only free when you own more
// than a deck needs. The allowance is handed out from the most valuable cards down, so counts here always add up.
function deckSlots() {
  const c = ownedCardCounts();
  return Object.keys(c).reduce((n, id) => n + Math.min(c[id], MAX_COPIES), 0);
}

function spareAllocation() {
  const counts = ownedCardCounts(), alloc = {};
  let budget = Math.max(0, deckSlots() - DECK_SIZE);
  // Ties are broken by card id, never by the order copies happen to sit in your collection, so the allocation only depends on what you own.
  Object.keys(counts).sort((a, b) => RELEASE_VALUE[cardDef(b).rarity] - RELEASE_VALUE[cardDef(a).rarity] || (a < b ? -1 : 1)).forEach(id => {
    const owned = counts[id], inDeck = state.deck.filter(c => c === id).length;
    const base = Math.max(0, owned - Math.max(1, inDeck));            // never the last copy, never one the deck uses
    const excess = Math.max(0, Math.min(base, owned - MAX_COPIES));   // copies past the limit can never be used
    const take = Math.min(base - excess, budget);
    budget -= take;
    alloc[id] = excess + take;
  });
  return alloc;
}

function spareCount(id) { return spareAllocation()[id] || 0; }

function totalSpares() {
  const a = spareAllocation();
  return Object.keys(a).reduce((n, id) => n + a[id], 0);
}

function totalSpareValue() {
  const a = spareAllocation();
  return Object.keys(a).reduce((n, id) => n + a[id] * RELEASE_VALUE[cardDef(id).rarity], 0);
}

function releaseCard(id) {
  if (spareCount(id) < 1) return false;            // guard: last copy or deck copy can never be released
  const idx = state.ownedCards.indexOf(id);
  if (idx < 0) return false;
  state.ownedCards.splice(idx, 1);
  const gain = RELEASE_VALUE[cardDef(id).rarity];
  state.progress.pebbles += gain;
  state.progress.released += 1;
  saveState();
  updateHud();
  return gain;
}

function rollPackRarity(pack) {
  const r = Math.random();
  let acc = 0;
  for (const rar of RARITY_ORDER) {
    acc += pack.odds[rar] || 0;
    if (r < acc) return rar;
  }
  // Float rounding fallthrough: give the pack's lowest guaranteed tier
  return RARITY_ORDER.find(rar => (pack.odds[rar] || 0) > 0) || 'common';
}

// price: a one-off price (Saffron's daily deal); otherwise the pack's shelf price.
function buyPack(packId, price) {
  const pack = PACKS.find(p => p.id === packId);
  if (!pack) return false;
  const cost = typeof price === 'number' ? price : packPrice(pack);
  if (state.progress.pebbles < cost) return false;   // guard: can't go negative
  state.progress.pebbles -= cost;
  const id = randomCardId(rollPackRarity(pack), pack.only);
  const isNew = !state.ownedCards.includes(id);
  state.ownedCards.push(id);
  noteCardsFound(1);
  state.progress.packsOpened += 1;
  logEvent(pack.icon, `Bought a ${pack.name} for 🫧 ${cost}.`);
  saveState();
  updateHud();
  bumpPill('pillCards');
  showCardReveal(id, `${pack.name}`, true);
  if (isNew) toast('📖 New entry in your Index');
  checkAchievements();
  return id;
}

let cardsView = 'mine';   // 'mine' | 'deck' | 'almanac' | 'craft' | 'fish'  (the Deck used to be its own bottom tab; it is now a segment of Cards)

// Opens Cards on its Deck segment - the one place that used to be `switchTab('deck')`.
function openDeck() { switchTab('collection'); setCardsView('deck'); }
function setCardsView(view) {
  cardsView = view;
  document.getElementById('segMine').classList.toggle('active', view === 'mine');
  document.getElementById('segAlmanac').classList.toggle('active', view === 'almanac');
  document.getElementById('segDeck').classList.toggle('active', view === 'deck');
  document.getElementById('deckPanel').classList.toggle('hidden', view !== 'deck');
  collectionList.classList.toggle('hidden', view !== 'mine');
  document.getElementById('collFilterToolbar').classList.toggle('hidden', view !== 'mine');
  document.getElementById('collFilter').classList.toggle('hidden', view !== 'mine' || !collFilterOpen);
  document.getElementById('almanacGrid').classList.toggle('hidden', view !== 'almanac');
  document.getElementById('almProgress').classList.toggle('hidden', view !== 'almanac');
  document.getElementById('segCraft').classList.toggle('active', view === 'craft');
  document.getElementById('craftView').classList.toggle('hidden', view !== 'craft');
  document.getElementById('segFish').classList.toggle('active', view === 'fish');
  document.getElementById('fishLogView').classList.toggle('hidden', view !== 'fish');
  if (view === 'almanac') renderAlmanac();
  else if (view === 'craft') renderCraft();
  else if (view === 'fish') renderFishLog();
  else if (view === 'deck') renderDeckPanel();
  else renderCollection();
}

// The fish log: every kind of fish, with a hint for the ones you haven't landed yet.
function renderFishLog() {
  const box = document.getElementById('fishLogView'), f = fishState();
  const caught = FISH.filter(x => f.caught[x.id]).length, pct = Math.round(caught / FISH.length * 100);
  const goalNote = caught >= FISH.length ? '🏷️ Master Angler earned - every fish in the log.'
    : `Catch them all for the Master Angler title${f.caught['star-koi'] ? '' : '; a legendary catch alone earns Legend Catcher'}.`;
  box.innerHTML = `<div class="alm-progress"><div class="ap-top"><span><b>${caught}</b> of ${FISH.length} fish caught · ${f.total || 0} landed in all</span><span>${pct}%</span></div>
    <div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div></div>
    <div class="shop-note" style="margin:0 4px 10px">Some fish only bite at night, in certain weather, or in Quiet Harbor. ${fishAvailableNote()}</div>
    <div class="shop-note" style="margin:0 4px 10px">${goalNote}</div>`;
  const row = document.createElement('div');
  row.className = 'alm-row';
  FISH.forEach(x => {
    const n = f.caught[x.id] || 0, el = document.createElement('div');
    if (n) {
      el.className = 'alm-card fish-card ' + (x.legendary ? 'rarity-mythic' : 'rarity-common');
      el.innerHTML = `<span class="ac-count">×${n}</span><span class="ac-icon">${x.icon}</span><span class="ac-name">${x.name}</span><span class="ac-power">🫧 ${x.pebbles}</span><span class="fish-hint-txt">${x.hint}</span>`;
      el.classList.add('tappable');
      el.addEventListener('click', () => showProp(x.icon, x.name, `${x.blurb} Caught ${n} time${n === 1 ? '' : 's'}. ${x.hint}.`));
    } else {
      el.className = 'alm-card unknown';
      el.innerHTML = `<span class="ac-icon">${x.icon}</span><span class="ac-name">???</span><span class="ac-hint">${x.hint}</span>`;
    }
    row.appendChild(el);
  });
  box.appendChild(row);
  // night critters share the page
  const bs = bugState(), bugsCaught = BUGS.filter(b => bs.caught[b.id]).length;
  const head = document.createElement('div');
  head.className = 'alm-section';
  head.innerHTML = `<span>🌙 Night critters</span><span>${bugsCaught}/${BUGS.length}</span>`;
  box.appendChild(head);
  const brow = document.createElement('div');
  brow.className = 'alm-row';
  BUGS.forEach(b => {
    const n = bs.caught[b.id] || 0, el = document.createElement('div');
    if (n) { el.className = 'alm-card fish-card ' + (b.legendary ? 'rarity-mythic' : 'rarity-ultra'); el.innerHTML = `<span class="ac-count">×${n}</span><span class="ac-icon">${b.icon}</span><span class="ac-name">${b.name}</span><span class="ac-power">🫧 ${b.pebbles}</span><span class="fish-hint-txt">${b.hint}</span>`; }
    else { el.className = 'alm-card unknown'; el.innerHTML = `<span class="ac-icon">${b.icon}</span><span class="ac-name">???</span><span class="ac-hint">${b.hint}</span>`; }
    brow.appendChild(el);
  });
  box.appendChild(brow);
}
function fishAvailableNote() {
  const now = FISH.filter(x => x.where || x.night || x.weather).filter(fishAvailable);
  return now.length ? `Biting right now: ${now.map(x => x.icon).join(' ')}` : '';
}

let shopSubView = 'packs';   // 'packs' | 'customize' | 'items'
let itemsCat = 'all';   // filter chip for the Items shop list: 'all' or a DECORATION_ITEMS 'cat'
const ITEM_CATS = [
  { id: 'all', label: 'All', icon: '🗂️' },
  { id: 'plant', label: 'Plants', icon: '🌱' },
  { id: 'seating', label: 'Seating', icon: '🪑' },
  { id: 'lighting', label: 'Lighting', icon: '💡' },
  { id: 'ornament', label: 'Ornaments', icon: '🎀' }
];

function setShopView(view) {
  shopSubView = view;
  document.getElementById('segPacks').classList.toggle('active', view === 'packs');
  document.getElementById('segCustomize').classList.toggle('active', view === 'customize');
  document.getElementById('segItems').classList.toggle('active', view === 'items');
  document.getElementById('packsView').classList.toggle('hidden', view !== 'packs');
  document.getElementById('customizeView').classList.toggle('hidden', view !== 'customize');
  document.getElementById('itemsView').classList.toggle('hidden', view !== 'items');
  if (view === 'customize') renderCustomize();
  else if (view === 'items') renderItems();
  else renderPacks();
}

let craftSel = { rarity: 'common', picks: [] };
let refineOpenId = null;   // which refinable card's stat-choice row is expanded, if any (accordion - only one at a time)

function aOrAn(label) { return (/^[aeiou]/i.test(label) ? 'an ' : 'a ') + label; }

function miniCardHtml(def) {
  return `<div class="card-mini rarity-${def.rarity}${def.crafted ? ' crafted' : ''}" data-inspect="${def.id}">
      <span class="c-cost">${def.cost}</span><span class="c-icon">${cardArtHtml(def)}</span><span class="c-power">${cardStatsText(def)}</span></div>`;
}

function renderCraft() {
  const box = document.getElementById('craftView');
  const counts = ownedCardCounts();
  const pct = n => Math.round(n * 100);
  box.innerHTML = `<div class="cr-intro">Combine cards into something better. <b>Nothing here costs Pebbles</b>: the cards are the price.</div>`;

  // ----- Refine -----
  const refinable = Object.keys(counts).filter(id => counts[id] >= 2 && cardDef(id) && !cardDef(id).crafted && !cardDef(id).spell)
    .sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity) || cardDef(a).cost - cardDef(b).cost || (a < b ? -1 : 1));
  const ref = document.createElement('div');
  ref.className = 'cr-section';
  ref.innerHTML = `<div class="cr-title">🔨 Refine</div>
    <div class="cr-desc">Combine <b>2 copies</b> of a card into <b>1 stronger version</b>. You pick +1 power or +1 health, and there is a <b>${pct(CRAFT.refineSkillChance)}% chance it also gains a skill</b>.</div>`;
  if (!refinable.length) {
    ref.innerHTML += `<div class="cr-empty">Get a second copy of any card to refine it.</div>`;
  } else {
    if (!refinable.includes(refineOpenId)) refineOpenId = null;
    refinable.forEach(id => {
      const def = cardDef(id), skills = craftableSkills(id);
      const why = { p: refineBlockReason(id, 'p'), g: refineBlockReason(id, 'g') };
      const open = refineOpenId === id;
      const row = document.createElement('div');
      row.className = 'panel-item cr-refine-row' + (open ? ' open' : '');
      row.dataset.toggleRefine = id;
      row.innerHTML = `${miniCardHtml(def)}
        <span class="panel-text">
          <div class="panel-name">${def.name}</div>
          <div class="panel-desc">${counts[id]} owned · uses 2</div>
          <div class="panel-desc">${why.p && why.g ? why.p : (skills.length ? `May gain: ${skills.map(k => KW[k].icon).join(' ')}` : 'No skill possible: it already has 2')}</div>
        </span>
        <span class="cr-chevron">${open ? '▲' : '▼'}</span>
        ${open ? `<div class="cr-refine-choice">
          <button class="panel-action" data-refine="${id}" data-stat="p" ${why.p ? 'disabled' : ''} aria-label="Refine ${def.name} for plus one power">+1 ⚔ Power</button>
          <button class="panel-action" data-refine="${id}" data-stat="g" ${why.g ? 'disabled' : ''} aria-label="Refine ${def.name} for plus one health">+1 ♥ Health</button>
        </div>` : ''}`;
      ref.appendChild(row);
    });
  }
  box.appendChild(ref);

  // ----- Trade up -----
  const steps = RARITY_ORDER.slice(0, -1);
  if (!steps.includes(craftSel.rarity)) craftSel.rarity = steps[0];
  const tradable = id => Math.max(0, tradableCount(id));
  const picked = id => craftSel.picks.filter(p => p === id).length;
  // drop picks that are no longer available (cards changed while the screen was closed)
  craftSel.picks = craftSel.picks.filter((id, i, arr) => cardDef(id) && cardDef(id).rarity === craftSel.rarity && arr.slice(0, i + 1).filter(x => x === id).length <= tradable(id));
  const trade = document.createElement('div');
  trade.className = 'cr-section';
  const avail = r => Object.keys(counts).filter(id => cardDef(id).rarity === r).reduce((n, id) => n + tradable(id), 0);
  trade.innerHTML = `<div class="cr-title">🔁 Trade up</div>
    <div class="cr-desc">Combine <b>${CRAFT.tradeCount} cards of one rarity</b> into <b>1 random card of the next rarity</b>, with a <b>${pct(CRAFT.tradeSkillChance)}% chance it comes with a skill</b>. Cards in your deck are never used.</div>
    <div class="cr-chips">${steps.map(r => `<button class="cr-chip${r === craftSel.rarity ? ' active' : ''}${avail(r) < CRAFT.tradeCount ? ' short' : ''}" data-rar="${r}" title="${avail(r) < CRAFT.tradeCount ? `Needs ${CRAFT.tradeCount - avail(r)} more spare ${RARITY_LABEL[r].toLowerCase()} card${CRAFT.tradeCount - avail(r) === 1 ? '' : 's'}` : 'Ready to trade'}">${RARITY_LABEL[r]} <small>${avail(r)}/${CRAFT.tradeCount}</small></button>`).join('')}</div>`;
  const target = nextRarity(craftSel.rarity);
  const tray = document.createElement('div');
  tray.className = 'cr-tray';
  for (let i = 0; i < CRAFT.tradeCount; i++) {
    const id = craftSel.picks[i];
    tray.innerHTML += id
      ? `<button class="cr-slot filled${i === craftSel.picks.length - 1 ? ' just-picked' : ''}" data-unpick="${i}" aria-label="Remove ${cardDef(id).name} from the trade">${miniCardHtml(cardDef(id))}</button>`
      : `<div class="cr-slot${i === craftSel.picks.length ? ' next' : ''}"><span>?</span></div>`;
  }
  tray.innerHTML += `<div class="cr-arrow">→</div><div class="cr-slot result"><span>${RARITY_LABEL[target]}</span></div>`;
  const dock = document.createElement('div');
  dock.className = 'cr-dock';
  dock.appendChild(tray);
  trade.appendChild(dock);

  const list = Object.keys(counts).filter(id => cardDef(id).rarity === craftSel.rarity && tradable(id) > 0)
    .sort((a, b) => (cardDef(a).crafted ? 1 : 0) - (cardDef(b).crafted ? 1 : 0) || cardDef(a).cost - cardDef(b).cost || (a < b ? -1 : 1));
  if (!list.length) {
    const empty = document.createElement('div'); empty.className = 'cr-empty';
    empty.textContent = `No spare ${RARITY_LABEL[craftSel.rarity].toLowerCase()} cards outside your deck yet. Collect ${CRAFT.tradeCount} spares to trade up.`;
    trade.appendChild(empty);
  } else {
    list.forEach(id => {
      const def = cardDef(id), left = tradable(id) - picked(id);
      const canPick = left > 0 && craftSel.picks.length < CRAFT.tradeCount;
      const row = document.createElement('div');
      row.className = 'panel-item cr-pick-row' + (canPick ? '' : ' disabled');
      if (canPick) row.dataset.pick = id;
      row.innerHTML = `${miniCardHtml(def)}
        <span class="panel-text"><div class="panel-name">${def.name}</div><div class="panel-desc">${tradable(id)} spare${picked(id) ? ` · ${picked(id)} chosen` : ''}</div></span>
        <span class="cr-pick-hint">${canPick ? '+ Add' : (picked(id) ? '✓' : '')}</span>`;
      trade.appendChild(row);
    });
  }
  const need = CRAFT.tradeCount - craftSel.picks.length;
  const whyNot = need === 0 ? tradeBlockReason(craftSel.picks) : '';
  const go = document.createElement('div');
  go.className = 'cr-go';
  const ready = need === 0 && !whyNot;
  go.innerHTML = `<button class="btn${ready ? ' cr-ready' : ''}" id="craftGo" ${ready ? '' : 'disabled'}>${need === 0 ? `Combine into ${aOrAn(RARITY_LABEL[target])} card` : `Pick ${need} more`}</button>${whyNot ? `<div class="cr-empty">${whyNot}</div>` : ''}`;
  dock.appendChild(go);
  box.appendChild(trade);

  // ----- events -----
  box.querySelectorAll('[data-toggle-refine]').forEach(row => row.addEventListener('click', () => {
    const id = row.dataset.toggleRefine;
    sfx('nav'); buzz(HAP.tap);
    refineOpenId = refineOpenId === id ? null : id;
    renderCraft();
  }));
  box.querySelectorAll('[data-refine]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    ensureAudio();
    if (!refineCard(btn.dataset.refine, btn.dataset.stat)) { toast('That cannot be refined right now'); sfx('tie'); }
    else refineOpenId = null;
    renderCraft();
  }));
  box.querySelectorAll('[data-rar]').forEach(btn => btn.addEventListener('click', () => {
    sfx('nav'); buzz(HAP.tap); craftSel = { rarity: btn.dataset.rar, picks: [] }; renderCraft();
  }));
  box.querySelectorAll('[data-pick]').forEach(row => row.addEventListener('click', () => {
    const id = row.dataset.pick;
    if (craftSel.picks.length >= CRAFT.tradeCount || picked(id) >= tradable(id)) return;
    craftSel.picks.push(id); sfx('tap'); buzz(HAP.tap); renderCraft();
  }));
  box.querySelectorAll('[data-unpick]').forEach(btn => btn.addEventListener('click', () => {
    craftSel.picks.splice(+btn.dataset.unpick, 1); sfx('tap'); buzz(HAP.tap); renderCraft();
  }));
  const goBtn = document.getElementById('craftGo');
  if (goBtn) goBtn.addEventListener('click', () => {
    if (craftSel.picks.length !== CRAFT.tradeCount) return;
    ensureAudio();
    const picks = craftSel.picks.slice();
    craftSel.picks = [];
    if (!tradeUp(picks)) { toast('That trade is not possible right now'); sfx('tie'); }
    renderCraft();
  });
}

function renderPacks() {
  const box = document.getElementById('packsView');
  const peb = state.progress.pebbles;
  const spares = totalSpares();
  box.innerHTML = `
    <div class="wallet">
      <div>
        <div class="w-amt">🫧 ${peb}</div>
        <div class="w-sub">${spares > 0 ? `${spares} spare card${spares === 1 ? '' : 's'} could be released for ${totalSpareValue()} more` : 'Release spare copies from My Cards to earn Pebbles'}</div>
      </div>
      ${spares > 0 ? '<button class="panel-action active" id="goRelease">Release</button>' : ''}
    </div>`;

  if (eventIs('market-day')) box.insertAdjacentHTML('beforeend', '<div class="event-banner">🛍️ Market Day: every pack is 20% off today!</div>');
  PACKS.forEach(pack => {
    const price = packPrice(pack), can = peb >= price;
    const el = document.createElement('div');
    el.className = 'pack' + (can ? '' : ' cant');
    el.innerHTML = `
      <div class="pk-icon">${pack.icon}</div>
      <div class="pk-body">
        <div class="pk-name">${pack.name}</div>
        <div class="pk-floor">${pack.floorLabel}</div>
        <div class="pk-desc">${pack.desc}</div>
      </div>
      <button class="btn" ${can ? '' : 'disabled'}>${price < pack.cost ? `<s>${pack.cost}</s> ` : ''}🫧 ${price}</button>`;
    el.querySelector('.btn').addEventListener('click', () => {
      ensureAudio();
      if (buyPack(pack.id)) { /* reveal overlay handles feedback */ }
      else { toast('Not enough Pebbles yet'); sfx('tie'); }
    });
    box.appendChild(el);
  });

  const note = document.createElement('div');
  note.className = 'shop-note';
  note.textContent = "Packs always cost more than a release pays, so it's a slow, calm trade. Nothing here ever expires.";
  box.appendChild(note);

  const go = document.getElementById('goRelease');
  if (go) go.addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); switchTab('collection'); setCardsView('mine'); });
}

function renderCustomize() {
  const box = document.getElementById('customizeView');
  box.innerHTML = '';
  ensureCosmeticUnlocks();
  const ch = state.character;
  const peb = state.progress.pebbles;

  box.innerHTML = `
    <div class="wallet">
      <div>
        <div class="w-amt">🫧 ${peb}</div>
        <div class="w-sub">Unlock emojis, accessories, and colors for good.</div>
      </div>
    </div>`;

  const custNote = document.createElement('div');
  custNote.className = 'shop-note';
  custNote.textContent = 'Buying an emoji, accessory, or color unlocks it for good and equips it right away.';
  box.appendChild(custNote);

  const emojiRow = document.createElement('div'); emojiRow.className = 'swatch-row shop-swatch-row';
  EMOJI_OPTIONS.forEach(o => emojiRow.appendChild(shopCosmeticSwatch('emoji', o.emoji, '', o.cost, ch.emoji === o.emoji, ch.unlockedEmojis.includes(o.emoji))));
  box.appendChild(emojiRow);
  const accRow = document.createElement('div'); accRow.className = 'swatch-row shop-swatch-row';
  ACCESSORY_OPTIONS.forEach(o => accRow.appendChild(shopCosmeticSwatch('accessory', o.icon, o.label, o.cost, ch.accessory === o.icon, ch.unlockedAccessories.includes(o.icon))));
  box.appendChild(accRow);
  const colorRow = document.createElement('div'); colorRow.className = 'swatch-row shop-swatch-row';
  COLOR_OPTIONS.forEach(o => colorRow.appendChild(shopCosmeticSwatch('color', o.color, '', o.cost, ch.color === o.color, ch.unlockedColors.includes(o.color))));
  box.appendChild(colorRow);
}

function haveDecoItem(item) { return decorationInventoryCount(item.id) > 0 || allDecorations().some(d => d.deco.id === item.id); }

function renderItems() {
  const box = document.getElementById('itemsView');
  const peb = state.progress.pebbles;
  const collected = DECORATION_ITEMS.filter(haveDecoItem).length;
  box.innerHTML = `
    <div class="wallet">
      <div>
        <div class="w-amt">🫧 ${peb}</div>
        <div class="w-sub">Decorate any district with something new. ${collected}/${DECORATION_ITEMS.length} decorations collected.</div>
      </div>
    </div>`;

  const invEntries = DECORATION_ITEMS.map(item => [item, decorationInventoryCount(item.id)]).filter(([, n]) => n > 0);
  if (invEntries.length) {
    const invTitle = document.createElement('div');
    invTitle.className = 'section-title';
    invTitle.textContent = 'Your Decorations';
    box.appendChild(invTitle);
    invEntries.forEach(([item, n]) => {
      const row = document.createElement('div');
      row.className = 'panel-item';
      row.innerHTML = `
        <span class="panel-icon">${item.icon}</span>
        <span class="panel-text"><div class="panel-name">${item.name}</div><div class="panel-desc">${n} in storage</div></span>
        <button class="panel-action active" data-place>Place</button>`;
      row.querySelector('[data-place]').addEventListener('click', () => { ensureAudio(); startPlacingDecoration(item); });
      box.appendChild(row);
    });
  }

  const placed = allDecorations();
  if (placed.length) {
    const plTitle = document.createElement('div');
    plTitle.className = 'section-title';
    plTitle.textContent = 'Placed around town';
    box.appendChild(plTitle);
    placed.forEach(({ district, deco: d }) => {
      const item = DECORATION_ITEMS.find(x => x.id === d.id);
      if (!item) return;
      const row = document.createElement('div');
      row.className = 'panel-item';
      row.innerHTML = `
        <span class="panel-icon">${item.icon}</span>
        <span class="panel-text"><div class="panel-name">${item.name}</div><div class="panel-desc">Placed in ${DISTRICTS[district].name}</div></span>
        <div class="deco-actions">
          <button class="deco-mini-btn" data-move title="Move" aria-label="Move ${item.name}">🔀</button>
          <button class="deco-mini-btn" data-store title="Store" aria-label="Store ${item.name}">📦</button>
          <button class="deco-mini-btn" data-del title="Delete" aria-label="Delete ${item.name}">🗑️</button>
        </div>`;
      row.querySelector('[data-move]').addEventListener('click', () => { ensureAudio(); startPlacingDecoration(item, d.uid); });
      row.querySelector('[data-store]').addEventListener('click', () => { ensureAudio(); storeDecoration(d.uid); });
      row.querySelector('[data-del]').addEventListener('click', () => { ensureAudio(); deleteDecoration(d.uid); });
      box.appendChild(row);
    });
  }

  const lockedMuseum = DECORATION_ITEMS.filter(item => item.museum && !haveDecoItem(item));
  if (lockedMuseum.length) {
    const mTitle = document.createElement('div');
    mTitle.className = 'section-title';
    mTitle.textContent = 'Museum trophies';
    box.appendChild(mTitle);
    lockedMuseum.forEach(item => {
      const w = MUSEUM_WINGS.find(x => x.deco === item.id);
      const row = document.createElement('div');
      row.className = 'panel-item';
      row.innerHTML = `
        <span class="panel-icon" style="filter:grayscale(1) opacity(0.55)">${item.icon}</span>
        <span class="panel-text"><div class="panel-name">${item.name}</div><div class="panel-desc">${w ? `Finish the ${w.name} to earn this · ${wingProgress(w)}/${w.cards.length} donated` : 'Earned through the museum'}</div></span>`;
      box.appendChild(row);
    });
  }

  const shopTitle = document.createElement('div');
  shopTitle.className = 'section-title';
  shopTitle.textContent = 'Shop';
  box.appendChild(shopTitle);

  const chips = document.createElement('div');
  chips.className = 'cr-chips';
  chips.innerHTML = ITEM_CATS.map(c => `<button class="cr-chip${c.id === itemsCat ? ' active' : ''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('');
  box.appendChild(chips);

  const shopItems = DECORATION_ITEMS.filter(item => !item.museum && (itemsCat === 'all' || item.cat === itemsCat));
  const night = isNightNow();
  shopItems.forEach(item => {
    const lockedToNight = item.night && !night;
    const can = peb >= item.cost && !lockedToNight;
    const el = document.createElement('div');
    el.className = 'pack' + (can ? '' : ' cant');
    el.innerHTML = `
      <div class="pk-icon">${item.icon}</div>
      <div class="pk-body">
        <div class="pk-name">${item.name}</div>
        <div class="pk-desc">${item.desc}</div>
        ${item.night ? `<div class="pk-floor">🌙 ${lockedToNight ? 'Only sold after dark - come back at night' : 'Night decoration'}</div>` : ''}
      </div>
      <button class="btn" ${can ? '' : 'disabled'}>🫧 ${item.cost}</button>`;
    el.querySelector('.btn').addEventListener('click', () => { ensureAudio(); buyDecoration(item); });
    box.appendChild(el);
  });
  if (!shopItems.length) {
    const empty = document.createElement('div');
    empty.className = 'shop-note';
    empty.textContent = 'Nothing in this category yet.';
    box.appendChild(empty);
  }

  box.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
    sfx('nav'); buzz(HAP.tap); itemsCat = btn.dataset.cat; renderItems();
  }));

  const note = document.createElement('div');
  note.className = 'shop-note';
  note.textContent = 'Buying a decoration adds it to Your Decorations above. Place it whenever you like - it goes in whichever district you are standing in.';
  box.appendChild(note);
}
// One swatch in the Shop's Customize rows: unlocked ones equip on tap, locked ones show their Pebble
// price and buy-then-equip on tap (via buyCosmetic).
function shopCosmeticSwatch(kind, value, label, cost, isEquipped, isUnlocked) {
  const el = document.createElement('div');
  el.className = (kind === 'color' ? 'color-swatch' : 'emoji-swatch') + ' shop-swatch' + (isEquipped ? ' active' : '') + (isUnlocked ? '' : ' locked');
  if (kind === 'color') el.style.background = value;
  else { el.textContent = value || '🚫'; if (label) el.title = label; }
  if (!isUnlocked) {
    const tag = document.createElement('span');
    tag.className = 'shop-swatch-cost';
    tag.textContent = '🫧' + cost;
    el.appendChild(tag);
  }
  el.addEventListener('click', () => {
    ensureAudio();
    if (isUnlocked) {
      sfx('nav'); buzz(HAP.tap);
      const field = kind === 'emoji' ? 'emoji' : kind === 'accessory' ? 'accessory' : 'color';
      state.character[field] = value;
      saveState(); updateHud(); renderTown(); renderCustomize();
    } else {
      buyCosmetic(kind, value, cost);
    }
  });
  return el;
}

function renderAlmanac() {
  const counts = ownedCardCounts();
  const grid = document.getElementById('almanacGrid');
  const total = CARD_POOL.length;
  const disc = discoveredSet();
  const found = CARD_POOL.filter(c => disc.has(c.id)).length;
  const pr = state.progress;

  // Which discovered cards are new since the last time the Almanac was opened?
  const seen = new Set(pr.almanacSeen || []);
  const firstOpen = pr.almanacSeen === null;

  const sd = seasonDef();
  const own = baseOwnedSet();
  const setsHtml = `<div class="sets-box"><div class="section-title" style="margin-top:6px">Sets <span class="title-sub">own every card in a set for a lasting bonus</span></div>${CARD_SETS.map(st => { const n = setProgress(st), done = n === st.cards.length;
    return `<div class="set-row${done ? ' done' : ''}"><span class="set-name">${st.icon} ${st.name} <small>${n}/${st.cards.length}</small></span><span class="set-cards">${st.cards.map(id => `<span class="${own.has(id) ? 'have' : 'miss'}" title="${own.has(id) || disc.has(id) ? escapeHtml(cardDef(id).name) : '???'}">${cardArtHtml(cardDef(id))}</span>`).join('')}</span><span class="set-perk">${done ? '✓ ' : ''}${st.text}</span></div>`; }).join('')}</div>`;
  const foilTotal = Object.values(foils()).reduce((a, b) => a + b, 0);
  document.getElementById('almProgress').innerHTML = setsHtml + `
    <div class="ap-top"><span><b>${found}</b> of ${total} discovered</span><span>${Math.round(found / total * 100)}%</span></div>
    <div class="q-bar"><div class="q-fill" style="width:${Math.round(found / total * 100)}%"></div></div>
    ${foilTotal ? `<div class="alm-season">✨ ${foilTotal} foil${foilTotal === 1 ? '' : 's'} in your collection - look for the shimmer on any card.</div>` : ''}
    <div class="alm-season">${sd.icon} It's ${sd.name}: cards marked ${sd.icon} turn up more often for ${seasonDaysLeft()} more day${seasonDaysLeft() === 1 ? '' : 's'}.</div>`;

  grid.innerHTML = '';
  [...RARITY_ORDER].reverse().forEach(rar => {
    const cards = CARD_POOL.filter(c => c.rarity === rar);
    const foundHere = cards.filter(c => disc.has(c.id)).length;

    const head = document.createElement('div');
    head.className = 'alm-section';
    head.innerHTML = `<span>${RARITY_LABEL[rar]}</span><span>${foundHere}/${cards.length}</span>`;
    grid.appendChild(head);

    const row = document.createElement('div');
    row.className = 'alm-row';
    cards
      .slice()
      .sort((a, b) => b.power - a.power)
      .forEach(def => {
        const owned = counts[def.id] || 0;
        const el = document.createElement('div');
        if (disc.has(def.id)) {
          const isNew = !firstOpen && !seen.has(def.id);
          el.className = `alm-card rarity-${def.rarity}` + (isNew ? ' fresh' : '') + (hasFoil(def.id) ? ' foil' : '');
          el.dataset.inspect = def.id;
          el.innerHTML = `
            ${isNew ? '<span class="ac-new">New</span>' : ''}
            ${inSeason(def.id) ? `<span class="ac-season">${sd.icon}</span>` : ''}
            ${isDonated(def.id) ? '<span class="ac-museum">🏛️</span>' : ''}
            ${owned > 1 ? `<span class="ac-count">×${owned}</span>` : ''}
            <span class="ac-cost">${def.cost}</span>
            <span class="ac-icon">${cardArtHtml(def)}</span>
            <span class="ac-power">${cardStatsText(def)}</span>
            <span class="ac-name">${def.name}</span>
            ${def.kw.length ? `<span class="ac-kw">${kwIcons(def)}</span>` : ''}`;
          el.classList.add('tappable');
          el.addEventListener('click', () => showCardReveal(def.id, 'Card Details', false, cardStory(def)));
        } else {
          el.className = 'alm-card unknown';
          el.innerHTML = `
            <span class="ac-icon">${cardArtHtml(def)}</span>
            <span class="ac-name">???</span>
            <span class="ac-rar rt-${def.rarity}" style="background:var(--${def.rarity === 'common' ? 'water' : def.rarity === 'rare' ? 'rare' : def.rarity === 'ultra' ? 'epic' : def.rarity === 'super' ? 'accent' : 'mythic'})">${RARITY_LABEL[def.rarity]}</span>
            <span class="ac-hint">costs ${def.cost} ⚡</span>
            <span class="ac-hint">${def.exclusive ? EXCLUSIVE_HINT[def.exclusive] : def.spell ? 'a spell' : def.kw.length ? (def.kw.length > 1 ? 'has keywords' : 'has a keyword') : 'plain card'}</span>`;
        }
        row.appendChild(el);
      });
    grid.appendChild(row);
  });

  // Mark everything currently discovered as seen
  pr.almanacSeen = CARD_POOL.filter(c => disc.has(c.id)).map(c => c.id);
  saveState();
}

function almanacHasNew() {
  const pr = state.progress;
  if (pr.almanacSeen === null) return false;   // don't nag before they've ever opened it
  const seen = new Set(pr.almanacSeen);
  return [...discoveredSet()].some(id => !seen.has(id));
}

