/* ============================================================
   WISHES (Starlight): duplicates are never wasted
   A pack card you already own still goes in your collection, and now also pays Starlight: as much as releasing it would pay
   in Embers (RELEASE_VALUE, so a rare spare is 3, a mythic 50). Starlight is a second, slow purse that can only buy one thing:
   a wish, a card of your own choosing (any pack card, WISH_COST by rarity). The prices are about what chasing that one card
   with packs would cost on average, so a wish is a guarantee and a way out of a long unlucky streak, not a cheaper shop.
   - Only packs pay Starlight (buyPack in js/workshop-and-starter.js). Releasing, crafting, finds and gifts never do, so
     release-and-rebuy cannot be farmed (HANDOFF section 5, "Pack odds are flat on purpose").
   - Starlight lives in state.progress.starlight (a whole number); state.progress.wishes counts wishes made.
   - Exclusive cards (cellar, rival, altar), foe cards and tokens cannot be wished for; they are earned.
   - Look: the WISHES block at the end of css/latest.css. tests/wishes.test.js.
   ============================================================ */
const WISH_COST = { common: 15, rare: 45, ultra: 120, super: 300, mythic: 750 };
let wishRarity = 'common';   // the rarity tab shown in the wish sheet

function starlight() { return Math.max(0, Math.floor(+state.progress.starlight) || 0); }
function wishableCards() { return CARD_POOL.filter(c => !c.exclusive && !c.foe && !c.token && WISH_COST[c.rarity]); }

// A pack just gave `id`, and the Dreamer already had a copy. Returns the Starlight it earned.
function awardStarlight(id) {
  const def = cardDef(id), base = (def && RELEASE_VALUE[def.rarity]) || 0, n = base ? base + Math.max(cardBonus('starlight') > 0 ? 1 : 0, Math.round(base * cardBonus('starlight'))) : 0;   // Stargazer skill and Star-glass: a share more, at least 1 more
  if (n > 0) { state.progress.starlight = starlight() + n; }
  return n;
}

function wishBlockReason(id) {
  const def = WISH_COST[(cardDef(id) || {}).rarity] ? wishableCards().find(c => c.id === id) : null;
  if (!def) return 'That card cannot be wished for';
  if (starlight() < WISH_COST[def.rarity]) return `You need ${WISH_COST[def.rarity]} ${GAME.starlight.name} for that wish`;
  return '';
}

function makeWish(id) {
  if (wishBlockReason(id)) return false;
  const def = cardDef(id), isNew = !state.ownedCards.includes(id);
  state.progress.starlight = starlight() - WISH_COST[def.rarity];
  state.progress.wishes = (state.progress.wishes || 0) + 1;
  state.ownedCards.push(id);
  noteCardsFound(1);
  logEvent(GAME.starlight.icon, `Made a wish and ${def.name} came true.`);
  saveState();
  updateHud();
  bumpPill('pillCards');
  closeWishSheet();
  showCardReveal(id, 'Your wish came true', true, null, 0, { flip: true, isNew });
  if (isNew) toast('📖 New entry in your Index');
  checkAchievements();
  return id;
}

function wishSheetEl() {
  let el = document.getElementById('wishSheet');
  if (el) return el;
  el = document.createElement('div'); el.id = 'wishSheet'; el.className = 'ws-sheet hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Make a wish');
  el.innerHTML = `<div class="ws-card">
      <div class="ws-head"><span class="ws-icon" aria-hidden="true">${GAME.starlight.icon}</span><div><b>Make a wish</b><small class="ws-sub"></small></div><button type="button" class="ws-x" aria-label="Close">✕</button></div>
      <div class="ws-tabs" role="tablist"></div>
      <div class="ws-list"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeWishSheet(); });
  el.querySelector('.ws-x').addEventListener('click', closeWishSheet);
  return el;
}

function drawWishSheet() {
  const el = wishSheetEl(), have = starlight(), owned = ownedCardCounts();
  el.querySelector('.ws-sub').textContent = `${have} ${GAME.starlight.name} · duplicates from packs add to it`;
  const tabs = el.querySelector('.ws-tabs');
  tabs.innerHTML = Object.keys(WISH_COST).map(r => `<button type="button" role="tab" class="ws-tab${r === wishRarity ? ' active' : ''}${have >= WISH_COST[r] ? ' can' : ''}" data-r="${r}" aria-selected="${r === wishRarity}">${RARITY_LABEL[r]}<small>${WISH_COST[r]}</small></button>`).join('');
  onAll(tabs, '.ws-tab', b => { wishRarity = b.dataset.r; sfx('nav'); drawWishSheet(); });
  const cost = WISH_COST[wishRarity], can = have >= cost;
  const cards = wishableCards().filter(c => c.rarity === wishRarity).sort((a, b) => (owned[a.id] ? 1 : 0) - (owned[b.id] ? 1 : 0) || a.name.localeCompare(b.name));
  el.querySelector('.ws-list').innerHTML = cards.map(c => `<button type="button" class="ws-row rarity-${c.rarity}${can ? '' : ' cant'}" data-id="${c.id}" ${can ? '' : 'disabled'}>
      <span class="ws-art">${cardArtHtml(c)}</span>
      <span class="ws-name"><b>${c.name}</b><small>${c.spell ? 'Spell' : `${c.power}/${c.grit}`} · ${c.cost}⚡${owned[c.id] ? ` · own ×${owned[c.id]}` : ' · <em>new</em>'}</small></span>
      <span class="ws-cost">${GAME.starlight.icon} ${cost}</span></button>`).join('');
  onAll(el.querySelector('.ws-list'), '.ws-row', b => {
    const def = cardDef(b.dataset.id);
    askConfirm({ title: 'Make this wish?', text: `Spend ${cost} ${GAME.starlight.name} to wish for ${def.name}.`, ok: 'Wish' }, () => makeWish(b.dataset.id));
  });
}

function openWishSheet() {
  const have = starlight();
  wishRarity = Object.keys(WISH_COST).reverse().find(r => have >= WISH_COST[r]) || 'common';   // open on the best wish you can afford
  drawWishSheet(); wishSheetEl().classList.remove('hidden'); sfx('flip'); buzz(HAP.tap);
}
function closeWishSheet() { const el = document.getElementById('wishSheet'); if (el) el.classList.add('hidden'); }

// The Starlight row at the top of the Shop's pack list.
function wishPanelHtml() {
  const have = starlight(), next = Object.keys(WISH_COST).find(r => have < WISH_COST[r]);
  const sub = next ? `${WISH_COST[next] - have} more to wish for a ${RARITY_LABEL[next]} card` : 'Enough for a wish of any rarity';
  return `<div class="wallet wish-wallet"><div><div class="w-amt">${GAME.starlight.icon} ${have}</div><div class="w-sub">${GAME.starlight.name}: a duplicate pack card adds to it. ${sub}.</div></div><button class="panel-action${have >= WISH_COST.common ? ' active' : ''}" id="goWish">Make a wish</button></div>`;
}
