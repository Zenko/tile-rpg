/* ---------- Starter cards and the move to the turn-based battle ---------- */
const STARTER_CARDS = ['sprout','sprout','pebble','pebble','origami-crane','origami-crane','droplet','toadstool','toadstool','bubble','flintstone','firefly'];

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

// A card can only be released once the Dreamer owns more than two copies of it (RELEASE_MIN_COPIES): two are always kept.
const RELEASE_MIN_COPIES = 3;
function canRelease(id) { return spareCount(id) >= 1 && state.ownedCards.filter(c => c === id).length >= RELEASE_MIN_COPIES; }
function releaseCard(id) {
  if (!canRelease(id)) return false;               // guard: last copy, deck copy, or fewer than three copies can never be released
  const idx = state.ownedCards.indexOf(id);
  if (idx < 0) return false;
  state.ownedCards.splice(idx, 1);
  const gain = RELEASE_VALUE[cardDef(id).rarity];
  state.progress.pebbles += gain; econNote(gain, 'release');
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
  spendPebbles(cost, 'packs');
  const id = randomCardId(rollPackRarity(pack), pack.only);
  const isNew = !state.ownedCards.includes(id);
  state.ownedCards.push(id);
  noteCardsFound(1);
  state.progress.packsOpened += 1;
  logEvent(pack.icon, `Bought a ${pack.name} for 🫧 ${cost}.`);
  saveState();
  updateHud();
  bumpPill('pillCards');
  showCardReveal(id, `${pack.name}`, true, null, 0, { flip: true, isNew });
  if (isNew) toast('📖 New entry in your Index');
  checkAchievements();
  return id;
}

let cardsView = 'mine';   // 'mine' | 'deck' | 'almanac' (the Sets segment) | 'craft' (the Workshop)  (the Deck used to be its own bottom tab; it is now a segment of Cards)

// Opens Cards on its Deck segment - the one place that used to be `switchTab('deck')`.
function openDeck() { switchTab('collection'); setCardsView('deck'); }
let viewTick = 0;   // bumped whenever a Cards or Shop view is chosen, so switchTab's deferred work never overrides an explicit choice
function setCardsView(view) {
  viewTick++;
  if (typeof closeCardSheet === 'function') closeCardSheet();
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
    if (view === 'almanac') renderAlmanac();
  else if (view === 'craft') renderCraft();
  else if (view === 'deck') renderDeckPanel();
  else renderCollection();
}

// What is biting right now, for the fishing scene's idle line.
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
  viewTick++;
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
  box.innerHTML = `<div class="cr-intro">Combine cards into something better. <b>Nothing here costs Embers</b>: the cards are the price.</div>`;

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
  const steps = RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(TRADE_TOP));   // mythic is the top of the ladder: divine and atlas are summoned
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
        <div class="w-sub">${spares > 0 ? `${spares} spare card${spares === 1 ? '' : 's'} could be released for ${totalSpareValue()} more` : 'Release spare copies from My Cards to earn Embers'}</div>
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
      else { toast('Not enough Embers yet'); sfx('tie'); }
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
        <div class="w-sub">Unlock emojis, accessories, colors, avatar borders, table mats and backdrops for good.</div>
      </div>
    </div>`;

  const custNote = document.createElement('div');
  custNote.className = 'shop-note';
  custNote.textContent = 'Buying an emoji, accessory, color, avatar border or table mat unlocks it for good and equips it right away.';
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
  const bdLabel = document.createElement('div'); bdLabel.className = 'shop-note'; bdLabel.textContent = 'Avatar borders: the ring around your portrait. Pick its colour for free in Character > Look.';
  box.appendChild(bdLabel);
  const bdRow = document.createElement('div'); bdRow.className = 'swatch-row shop-swatch-row';
  BORDER_OPTIONS.forEach(o => bdRow.appendChild(shopCosmeticSwatch('border', o.id, o.name + (o.fixed ? ' (own colours)' : ''), o.cost, ch.avBorder === o.id, ch.unlockedAvBorders.includes(o.id))));
  box.appendChild(bdRow);
  const matLabel = document.createElement('div'); matLabel.className = 'shop-note'; matLabel.textContent = 'Table mats: the cloth on your side of the battle table.';
  box.appendChild(matLabel);
  const matRow = document.createElement('div'); matRow.className = 'swatch-row shop-swatch-row shop-mat-row';
  MAT_OPTIONS.forEach(o => matRow.appendChild(shopCosmeticSwatch('mat', o.id, o.name, o.cost, ch.mat === o.id, ch.unlockedMats.includes(o.id))));
  box.appendChild(matRow);
  const stageLabel = document.createElement('div'); stageLabel.className = 'shop-note'; stageLabel.textContent = 'Backdrops: the scene behind you and your companion on the Character tab.';
  box.appendChild(stageLabel);
  const stageRow = document.createElement('div'); stageRow.className = 'swatch-row shop-swatch-row shop-mat-row';
  STAGE_OPTIONS.forEach(o => stageRow.appendChild(shopCosmeticSwatch('stage', o.id, o.name, o.cost, ch.stage === o.id, ch.unlockedStages.includes(o.id))));
  box.appendChild(stageRow);
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

  const shopItems = DECORATION_ITEMS.filter(item => !item.museum && !item.atlas && (itemsCat === 'all' || item.cat === itemsCat));
  const night = isNightNow();
  shopItems.forEach(item => {
    const lockedToNight = item.night && !night, lockedLevel = item.level && ensureLevel().level < item.level;
    const can = peb >= item.cost && !lockedToNight && !lockedLevel;
    const el = document.createElement('div');
    el.className = 'pack' + (can ? '' : ' cant');
    el.innerHTML = `
      <div class="pk-icon">${item.icon}</div>
      <div class="pk-body">
        <div class="pk-name">${item.name}</div>
        <div class="pk-desc">${item.desc}</div>
        ${lockedLevel ? `<div class="pk-floor">🔒 Unlocks at level ${item.level}</div>` : ''}
        ${item.night ? `<div class="pk-floor">🌙 ${lockedToNight ? 'Only sold after dark - come back at night' : 'Night decoration'}</div>` : ''}
      </div>
      <button class="btn" ${can ? '' : 'disabled'}>${lockedLevel ? '🔒' : '🫧'} ${item.cost}</button>`;
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
// One swatch in the Shop's Customize rows: unlocked ones equip on tap, locked ones show their Ember
// price and buy-then-equip on tap (via buyCosmetic).
function shopCosmeticSwatch(kind, value, label, cost, isEquipped, isUnlocked) {
  const el = document.createElement('div');
  el.className = (kind === 'color' ? 'color-swatch' : kind === 'mat' ? 'mat-swatch mat-' + value : kind === 'stage' ? 'mat-swatch stage-swatch' : kind === 'border' ? 'emoji-swatch border-swatch' : 'emoji-swatch') + ' shop-swatch' + (isEquipped ? ' active' : '') + (isUnlocked ? '' : ' locked');
  if (kind === 'color') el.style.background = value;
  else if (kind === 'mat') { el.innerHTML = `<span>${label}</span>`; el.title = label; }
  else if (kind === 'stage') { el.style.background = stageGradient(stageDef(value)); el.innerHTML = `<span>${label}</span>`; el.title = label; }
  else if (kind === 'border') {                   // a little avatar ring, drawn with the same code as the real one
    const ch = state.character, prev = document.createElement('span'); prev.className = 'bd-prev';
    applyAvatarStyle(prev, { color: ch.color, avBorder: value, avBorderColor: ch.avBorderColor, avBorderW: ch.avBorderW });
    el.appendChild(prev); el.title = label; el.setAttribute('aria-label', label);
  }
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
      const field = kind === 'emoji' ? 'emoji' : kind === 'accessory' ? 'accessory' : kind === 'mat' ? 'mat' : kind === 'stage' ? 'stage' : kind === 'border' ? 'avBorder' : 'color';
      state.character[field] = value;
      saveState(); updateHud(); renderTown(); renderCustomize(); if (typeof renderCharacterTab === 'function') renderCharacterTab();
    } else {
      buyCosmetic(kind, value, cost);
    }
  });
  return el;
}

let setOpenId = null, almGridOpen = false;   // Sets segment: which set is expanded, and whether the every-card Index is showing
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
  const ring = (n, of) => { const C = 2 * Math.PI * 17; return `<svg class="set-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="var(--stone-edge)" stroke-width="4"/><circle cx="20" cy="20" r="17" fill="none" stroke="${n === of ? 'var(--accent)' : 'var(--water)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * n / of).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${n}</text></svg>`; };
  const setsHtml = `<div class="sets-box">${CARD_SETS.map(st => { const n = setProgress(st), done = n === st.cards.length, open = setOpenId === st.id;
    return `<div class="set-card${done ? ' done' : ''}"><button type="button" class="set-head" data-set="${st.id}" aria-expanded="${open}">${ring(n, st.cards.length)}
      <span class="set-title"><b>${st.icon} ${st.name}</b><span>${done ? '✅ Bonus active: ' : 'Bonus: '}${st.text}</span></span><span class="set-chev">${open ? '▲' : '▼'}</span></button>
      ${open ? `<div class="alm-row set-open">${st.cards.map(id => { const d = cardDef(id);
        return own.has(id) ? `<div class="alm-card rarity-${d.rarity}" data-inspect="${id}"><span class="ac-cost">${d.cost}</span><span class="ac-icon">${cardArtHtml(d)}</span><span class="ac-power">${cardStatsText(d)}</span><span class="ac-name">${d.name}</span></div>`
          : `<div class="alm-card unknown"><span class="ac-icon">${cardArtHtml(d)}</span><span class="ac-name">${disc.has(id) ? d.name : '???'}</span><span class="ac-hint">${RARITY_LABEL[d.rarity]}</span></div>`; }).join('')}</div>${n < st.cards.length ? '<div class="set-note">Missing cards show as silhouettes. Find them in packs, on the ground or as prizes.</div>' : ''}` : ''}</div>`; }).join('')}</div>`;
  const foilTotal = Object.values(foils()).reduce((a, b) => a + b, 0);
  const hasNew = almanacHasNew();
  if (hasNew) almGridOpen = true;      // never hide the "New" tags behind a closed toggle
  document.getElementById('almProgress').innerHTML = (typeof binderHtml === 'function' ? binderHtml() : '') + setsHtml + `
    <div class="ap-top"><span><b>${found}</b> of ${total} discovered</span><span>${Math.round(found / total * 100)}%</span></div>
    <div class="q-bar"><div class="q-fill" style="width:${Math.round(found / total * 100)}%"></div></div>
    ${foilTotal ? `<div class="alm-season">✨ ${foilTotal} Reborn in your collection - look for the shimmer on any card.</div>` : ''}
    <div class="alm-season">${sd.icon} It's ${sd.name}: cards marked ${sd.icon} turn up more often for ${seasonDaysLeft()} more day${seasonDaysLeft() === 1 ? '' : 's'}.</div>
    <button type="button" class="claim-more" id="almGridToggle">${almGridOpen ? 'Hide' : 'Show'} every card · ${found}/${total}</button>`;
  onAll(document, '#almProgress [data-set]', b => { setOpenId = setOpenId === b.dataset.set ? null : b.dataset.set; sfx('tap'); renderAlmanac(); });
  document.getElementById('almGridToggle').addEventListener('click', () => { almGridOpen = !almGridOpen; sfx('nav'); renderAlmanac(); });

  grid.innerHTML = '';
  grid.classList.toggle('hidden', cardsView !== 'almanac' || !almGridOpen);
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
            <span class="ac-rar rt-${def.rarity}" style="background:var(--${def.rarity === 'common' ? 'water' : def.rarity === 'rare' ? 'rare' : def.rarity === 'ultra' ? 'epic' : def.rarity === 'super' ? 'accent' : def.rarity === 'divine' ? 'divine' : def.rarity === 'atlas' ? 'atlas' : 'mythic'})">${RARITY_LABEL[def.rarity]}</span>
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

