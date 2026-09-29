/* ---------------- titles: earned from milestones, worn under your name label in town ---------------- */
const TITLES = [
  { ach: 'first-win',     name: 'Friendly Rival' },
  { ach: 'first-loaf',    name: 'Baker' },
  { ach: 'boss-bested',   name: 'Boss Breaker' },
  { ach: 'explorer',      name: 'Wanderer' },
  { ach: 'first-harvest', name: 'Gardener' },
  { ach: 'fish-25',       name: 'Angler' },
  { ach: 'favours-10',    name: 'Good Neighbor' },
  { ach: 'chest-5',       name: 'Treasure Hunter' },
  { ach: 'crafted-10',    name: 'Tinkerer' },
  { ach: 'mythic-find',   name: 'Mythic Keeper' },
  { ach: 'spells-50',     name: 'Spellweaver' },
  { ach: 'cellar-10',     name: 'Deep Delver' },
  { ach: 'friend-5',      name: 'Beloved' },
  { ach: 'green-thumb',   name: 'Green Thumb' },
  { ach: 'wins-50',       name: 'Champion' },
  { ach: 'rival-done',    name: "Rook's Equal" },
  { ach: 'legend-fish',   name: 'Legend Catcher' },
  { ach: 'fish-log-full', name: 'Master Angler' },
  { ach: 'steps-10000',   name: 'Pathfinder' },
  { ach: 'alm-full',      name: 'Archivist' },
  { ach: 'chef',          name: 'Chef' },
  { ach: 'puzzle-7',      name: 'Puzzler' },
  { ach: 'cup-champ',     name: 'Cup Champion' },
  { ach: 'first-critter', name: 'Night Owl' },
  { ach: 'starwing',      name: 'Star Catcher' },
  { ach: 'companion',     name: 'Spirit Friend' },
  { ach: 'pen-pal',       name: 'Pen Pal' },
  { ach: 'mini-gold-5',   name: 'All-Rounder' },
  { ach: 'mini-all-gold', name: 'Game Master' },
  { ach: 'museum-full',   name: 'Patron of the Museum' },
  { ach: 'exped-20',      name: 'Expedition Leader' },
  { ach: 'trade-15',      name: 'Trader' },
  { ach: 'mastery-10',    name: 'Card Master' },
  { ach: 'set-all',       name: 'Completionist' },
  { ach: 'challenge-10',  name: 'Rule Bender' },
  { ach: 'settled-in',    name: 'Local' },
  { ach: 'true-local',    name: 'True Local' },
  { ach: 'foil-10',       name: 'Shiny Hunter' },
];
function titleFor(achId) { return TITLES.find(t => t.ach === achId) || null; }
function unlockedTitles() { return TITLES.filter(t => state.progress.achievements.includes(t.ach)); }
function currentTitle() { const t = titleFor(state.character.title); return t && state.progress.achievements.includes(t.ach) ? t : null; }
function renderTitleSwatches() {
  const row = document.getElementById('titleSwatches'), mine = unlockedTitles(), cur = currentTitle();
  row.innerHTML = `<button class="title-chip${cur ? '' : ' active'}" data-title="">No title</button>` +
    mine.map(t => `<button class="title-chip${cur && cur.ach === t.ach ? ' active' : ''}" data-title="${t.ach}">${escapeHtml(t.name)}</button>`).join('') +
    (mine.length < TITLES.length ? `<span class="more-in-shop">${TITLES.length - mine.length} more to earn</span>` : '');
  row.querySelectorAll('[data-title]').forEach(b => b.addEventListener('click', () => {
    state.character.title = b.dataset.title; saveState(); sfx('nav'); buzz(HAP.tap);
    renderTitleSwatches(); renderTown();
  }));
}

function ensureCosmeticUnlocks() {
  const ch = state.character;
  if (!Array.isArray(ch.unlockedEmojis)) ch.unlockedEmojis = [EMOJI_OPTIONS[0].emoji];
  if (!Array.isArray(ch.unlockedAccessories)) ch.unlockedAccessories = [ACCESSORY_OPTIONS[0].icon];
  if (!Array.isArray(ch.unlockedColors)) ch.unlockedColors = [COLOR_OPTIONS[0].color];
  // Grandfather in whatever this save already had picked, even if it predates today's five-item lists.
  if (ch.emoji && !ch.unlockedEmojis.includes(ch.emoji)) ch.unlockedEmojis.push(ch.emoji);
  if (ch.color && !ch.unlockedColors.includes(ch.color)) ch.unlockedColors.push(ch.color);
  if (typeof ch.accessory === 'string' && !ch.unlockedAccessories.includes(ch.accessory)) ch.unlockedAccessories.push(ch.accessory);
}
// Spends Pebbles to unlock a cosmetic and immediately equips it, so the Shop purchase doubles as picking it.
function buyCosmetic(kind, value, cost) {
  ensureCosmeticUnlocks();
  const ch = state.character, pr = state.progress;
  if (pr.pebbles < cost) { toast('Not enough Pebbles yet'); sfx('tie'); return false; }
  pr.pebbles -= cost;
  const key = kind === 'emoji' ? 'unlockedEmojis' : kind === 'accessory' ? 'unlockedAccessories' : 'unlockedColors';
  if (!ch[key].includes(value)) ch[key].push(value);
  if (kind === 'emoji') ch.emoji = value;
  else if (kind === 'accessory') ch.accessory = value;
  else ch.color = value;
  const label = kind === 'emoji' ? `the ${value} look` : kind === 'accessory' ? `the ${value} accessory` : 'a new color';
  logEvent(kind === 'emoji' ? value : '✨', `Bought and equipped ${label} for 🫧 ${cost}.`);
  saveState();
  updateHud();
  bumpPill('pillPebbles');
  toast('✨ Unlocked, and equipped on your profile');
  sfx('claim'); buzz(HAP.found);
  renderCustomize();
  return true;
}

// Applies the player's background, border colour and border style to any avatar element (HUD portrait,
// in-town badge, menu preview) so all three stay visually in sync with a single source of truth.
// Border is intentionally not a per-player customization anymore - every avatar gets the same fixed
// solid ring (there's nothing to pick, so no picker row for it).
function applyAvatarStyle(el, character) {
  if (!el) return;
  el.style.setProperty('--av-bg', character.color || 'var(--water-glow)');
  el.style.background = character.color || 'var(--water-glow)';
  el.style.setProperty('--av-border-color', 'var(--water)');
  el.style.setProperty('--av-border-style', 'solid');
  el.style.setProperty('--av-border-w', '3px');
  el.classList.remove('av-glow');
  el.dataset.accessory = character.accessory || '';
}

// Only cosmetics the player has unlocked (starter freebie + anything bought in the Shop) show up here -
// the rest live in Shop > Customize until bought. See buyCosmetic() and renderCustomize().
function renderCharacterPanel() {
  document.getElementById('nameInput').value = state.character.name || '';
  ensureCosmeticUnlocks();

  const emojiRow = document.getElementById('emojiSwatches');
  emojiRow.innerHTML = '';
  EMOJI_OPTIONS.filter(o => state.character.unlockedEmojis.includes(o.emoji)).forEach(o => {
    const sw = document.createElement('div');
    sw.className = 'emoji-swatch' + (state.character.emoji === o.emoji ? ' active' : '');
    sw.textContent = o.emoji;
    sw.addEventListener('click', () => {
      state.character.emoji = o.emoji;
      saveState();
      renderCharacterPanel();
      updateHud();
      renderTown();
    });
    emojiRow.appendChild(sw);
  });
  if (emojiRow.children.length < EMOJI_OPTIONS.length) emojiRow.appendChild(moreInShopHint());

  const accessoryRow = document.getElementById('accessorySwatches');
  accessoryRow.innerHTML = '';
  ACCESSORY_OPTIONS.filter(o => state.character.unlockedAccessories.includes(o.icon)).forEach(o => {
    const sw = document.createElement('div');
    sw.className = 'emoji-swatch' + (state.character.accessory === o.icon ? ' active' : '');
    sw.title = o.label;
    sw.textContent = o.icon || '🚫';
    sw.addEventListener('click', () => {
      state.character.accessory = o.icon;
      saveState();
      renderCharacterPanel();
      updateHud();
      renderTown();
    });
    accessoryRow.appendChild(sw);
  });
  if (accessoryRow.children.length < ACCESSORY_OPTIONS.length) accessoryRow.appendChild(moreInShopHint());

  const colorRow = document.getElementById('colorSwatches');
  colorRow.innerHTML = '';
  COLOR_OPTIONS.filter(o => state.character.unlockedColors.includes(o.color)).forEach(o => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (state.character.color === o.color ? ' active' : '');
    sw.style.background = o.color;
    sw.addEventListener('click', () => {
      state.character.color = o.color;
      saveState();
      renderCharacterPanel();
      updateHud();
      renderTown();
    });
    colorRow.appendChild(sw);
  });
  if (colorRow.children.length < COLOR_OPTIONS.length) colorRow.appendChild(moreInShopHint());

  applyAvatarStyle(document.getElementById('avatarPreview'), state.character);
  document.getElementById('avatarPreviewEmoji').textContent = state.character.emoji;
  renderTitleSwatches();
  renderCompanionBox();
  renderProfileStats();
  fetchWhosPlaying();
}
// A glanceable summary of progress in the player menu - the numbers already existed (testerInfo() in
// js/events-story-foils-guide.js assembles a similar set for bug-report emails), they just weren't shown
// to the player anywhere as an actual screen.
function profileStatValues() {
  const t = state.progress.totals || {}, pr = ensureLevel();
  const friends = Object.values(friendsState()).filter(fr => fr.points > 0).length;
  return [
    { icon: '⭐', label: 'Level', value: pr.level },
    { icon: '🏆', label: 'Wins', value: state.wins || 0 },
    { icon: '🃏', label: 'Cards', value: state.ownedCards.length },
    { icon: '✨', label: 'Foils', value: t.foilsFound || 0 },
    { icon: '🏅', label: 'Milestones', value: `${state.progress.achievements.length}/${ACHIEVEMENTS.length}` },
    { icon: '💞', label: 'Friends', value: friends },
    { icon: '🕳️', label: 'Cellar best', value: cellarBest() },
    { icon: '👣', label: 'Steps', value: t.steps || 0 },
  ];
}
function renderProfileStats() {
  const box = document.getElementById('profileStatsGrid');
  if (!box) return;
  box.innerHTML = profileStatValues().map(s =>
    `<div class="profile-stat"><span class="ps-icon">${s.icon}</span><span class="ps-value">${s.value}</span><span class="ps-label">${s.label}</span></div>`
  ).join('');
}
function moreInShopHint() {
  const hint = document.createElement('div');
  hint.className = 'more-in-shop';
  hint.textContent = 'More in Shop';
  return hint;
}

document.getElementById('nameInput').addEventListener('input', (e) => {
  state.character.name = e.target.value.slice(0, 16);
  saveState();
  updateHud();
});

// Customize/Profile/Social/Settings as tabs rather than an always-expanded stack (or the disclosure
// toggles this replaced) - same .seg/.seg-btn idiom as Journal/Rewards/Shop. Kept in module state (not
// saved) so reopening the menu returns to whichever tab was last open, like cardsView/shopSubView do.
let pmView = 'customize';
const PM_SEGMENTS = {
  customize: { btn: 'segPmCustomize', view: 'pmCustomizeView' },
  profile: { btn: 'segPmProfile', view: 'pmProfileView' },
  social: { btn: 'segPmSocial', view: 'pmSocialView' },
  settings: { btn: 'segPmSettings', view: 'pmSettingsView' },
};
function switchPmSegment(key) {
  pmView = key;
  Object.entries(PM_SEGMENTS).forEach(([k, s]) => {
    document.getElementById(s.btn).classList.toggle('active', k === key);
    document.getElementById(s.view).classList.toggle('hidden', k !== key);
  });
}
Object.entries(PM_SEGMENTS).forEach(([key, s]) => {
  document.getElementById(s.btn).addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); switchPmSegment(key); });
});

function openPlayerMenu() {
  renderCharacterPanel();
  syncToggles();
  switchPmSegment(pmView);
  document.getElementById('pmVersion').textContent = 'Tile RPG ' + gameVersionLabel();
  document.getElementById('playerMenuBackdrop').classList.remove('hidden');
  document.getElementById('playerMenu').classList.remove('hidden');
}
function closePlayerMenu() {
  document.getElementById('playerMenuBackdrop').classList.add('hidden');
  document.getElementById('playerMenu').classList.add('hidden');
}
document.getElementById('avatarChip').addEventListener('click', () => { if (inBattle) return; ensureAudio(); sfx('nav'); buzz(HAP.tap); openPlayerMenu(); });
document.getElementById('playerMenuClose').addEventListener('click', closePlayerMenu);
document.getElementById('playerMenuBackdrop').addEventListener('click', closePlayerMenu);

/* ---------------- inventory: one place to see and use everything you're carrying ----------------
   Deliberately not a new item-tracking system of its own - it just reads the storage each subsystem
   already owns (pantry(), dishes(), seedInv(), state.decorationInventory) and gives it a shared window,
   per HANDOFF §6's "every system creates its own slice" rule. The only actions offered are the ones that
   were only reachable by hunting down the right building before: planting a seed and placing a decoration
   both reuse the exact flow those buildings already use (startPlanting/startPlacingDecoration), so there's
   nothing new to keep in sync. Dishes and pantry ingredients stay informational here - they're already
   used at the point of cooking/battle/gifting a neighbor, so a second "use" button here would just be a
   confusing second path to the same effect. */
let invTab = 'pantry';
function openInventory() {
  closePlayerMenu();
  showTipOnce('inventory');
  bumpStat('inventoryOpened', 1);
  document.getElementById('inventoryBackdrop').classList.remove('hidden');
  document.getElementById('inventoryPanel').classList.remove('hidden');
  renderInventory();
}
function closeInventory() {
  document.getElementById('inventoryBackdrop').classList.add('hidden');
  document.getElementById('inventoryPanel').classList.add('hidden');
}
function switchInvTab(tab) {
  invTab = tab;
  document.querySelectorAll('#invSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.inv === tab));
  renderInventory();
}
function invRow(icon, name, count, desc, actionLabel, onAction) {
  const el = document.createElement('div');
  el.className = 'quest inv-item';
  el.innerHTML = `<div class="quest-top">
      <span class="q-icon">${icon}</span>
      <span class="q-name">${name}<div class="panel-desc">${desc}</div></span>
      <span class="q-count">×${count}</span>
    </div>` + (onAction ? `<div class="controls" style="margin-top:8px"><button class="panel-action active inv-use-btn">${actionLabel}</button></div>` : '');
  if (onAction) el.querySelector('.inv-use-btn').addEventListener('click', onAction);
  return el;
}
function invEmpty(text) { return `<div class="panel-desc" style="padding:10px 4px">${text}</div>`; }
function renderInventory() {
  const list = document.getElementById('inventoryList');
  list.innerHTML = '';
  let rows = [];
  if (invTab === 'pantry') {
    rows = Object.keys(INGREDIENTS).filter(k => ingredientCount(k) > 0)
      .map(k => ({ icon: INGREDIENTS[k].icon, name: INGREDIENTS[k].name, count: ingredientCount(k), desc: "Cooked into dishes at Maple's Bakery." }));
    if (!rows.length) { list.innerHTML = invEmpty("Your pantry is empty - harvest crops, catch fish or bake bread to fill it."); return; }
  } else if (invTab === 'dishes') {
    rows = RECIPES.filter(r => dishCount(r.id) > 0).map(r => ({ icon: r.icon, name: r.name, count: dishCount(r.id), desc: r.desc }));
    if (!rows.length) { list.innerHTML = invEmpty("No dishes cooked yet - Maple's Bakery turns your pantry into dishes."); return; }
  } else if (invTab === 'seeds') {
    rows = SEEDS.filter(s => seedCount(s.id) > 0).map(s => ({ icon: s.icon, name: s.name, count: seedCount(s.id), desc: s.desc, seed: s }));
    if (!rows.length) { list.innerHTML = invEmpty('No seeds yet - buy some from Fern, or find them in the Hollow Garden.'); return; }
  } else if (invTab === 'decor') {
    rows = DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0).map(d => ({ icon: d.icon, name: d.name, count: decorationInventoryCount(d.id), desc: d.desc, deco: d }));
    if (!rows.length) { list.innerHTML = invEmpty("No spare decorations - the Shop's Items tab has more, or earn them from the museum wings."); return; }
  }
  rows.forEach(r => {
    const action = r.seed ? { label: '🌱 Plant', fn: () => { closeInventory(); startPlanting(r.seed.id); } }
      : r.deco ? { label: '📍 Place', fn: () => { closeInventory(); startPlacingDecoration(r.deco); } }
      : null;
    list.appendChild(invRow(r.icon, escapeHtml(r.name), r.count, escapeHtml(r.desc), action && action.label, action && action.fn));
  });
}
document.getElementById('openInventoryBtn').addEventListener('click', openInventory);
document.getElementById('inventoryClose').addEventListener('click', closeInventory);
document.getElementById('inventoryBackdrop').addEventListener('click', closeInventory);
document.querySelectorAll('#invSeg .seg-btn').forEach(b => b.addEventListener('click', () => switchInvTab(b.dataset.inv)));
// One clean overlay instead of a stack of toasts firing one after another - everything worth knowing about
// right now (time, weather and its effect, season, today's event, and the forecast) at a glance together.
document.getElementById('pillSky').addEventListener('click', () => {
  sfx('tap');
  const s = skyPhase(), kind = state.weather.current || 'clear', w = WEATHER_KINDS[kind];
  const sd = seasonDef(), tev = eventNow(), ws = state.weather;
  const label = s.label.replace(/^the /i, ''), timeLabel = label.charAt(0).toUpperCase() + label.slice(1);
  document.getElementById('wxTitle').textContent = kind === 'clear' ? timeLabel : `${w.name} · ${timeLabel}`;
  const rows = [
    { icon: w.icon || s.icon, text: (WEATHER_EFFECTS[kind] || {}).short || 'No special effect right now.' },
    { icon: sd.icon, text: `${sd.name} · ${seasonDaysLeft()} day${seasonDaysLeft() === 1 ? '' : 's'} left this season` },
    { icon: tev.icon, text: `${tev.name}: ${tev.text}` },
  ];
  if (ws.next && ws.next !== weatherNow() && WEATHER_KINDS[ws.next]) {
    const mins = Math.max(1, Math.round((ws.changesAt - ws.elapsed) / 60000));
    rows.push({ icon: WEATHER_KINDS[ws.next].icon || '☀️', text: `Next: ${WEATHER_KINDS[ws.next].name} in ~${mins} min` });
  }
  document.getElementById('wxRows').innerHTML = rows.map(r => `<div class="wx-row"><span class="wx-icon">${r.icon}</span><span>${r.text}</span></div>`).join('');
  document.getElementById('weatherOverlay').classList.remove('hidden');
});
document.getElementById('weatherOverlayClose').addEventListener('click', () => { sfx('nav'); document.getElementById('weatherOverlay').classList.add('hidden'); });
// Tapping the dimmed backdrop closes it too, same as the player menu/inventory panels.
document.getElementById('weatherOverlay').addEventListener('click', e => { if (e.target.id === 'weatherOverlay') document.getElementById('weatherOverlay').classList.add('hidden'); });

function updateHud() {
  cardCountEl.textContent = state.ownedCards.length;
  winCountEl.textContent = state.wins;
  if (deckSizeHudEl) deckSizeHudEl.textContent = `${state.deck.length}/${DECK_SIZE}`;
  pebbleCountEl.textContent = state.progress.pebbles;
  avatarChipEmoji.textContent = state.character.emoji;
  avatarChipName.textContent = state.character.name || 'You';
  applyAvatarStyle(document.querySelector('.hud-portrait'), state.character);
  const deckFull = state.deck.length >= DECK_SIZE;
  if (deckFillBarEl) deckFillBarEl.style.width = Math.min(100, (state.deck.length / DECK_SIZE) * 100) + '%';
  if (pillDeckEl) pillDeckEl.classList.toggle('deck-full', deckFull);
  updateQuestBadge();
  updateJournalBadge();
  updateLevelHud();
  checkSets();
  reconcileFoils();
  maybeFlushCardLog();
}

function switchTab(key) {
  if (inBattle) return;
  if (placingDecoration && key !== 'town') cancelPlacingDecoration(true);
  if (HIDESEEK.active && key !== 'town') cancelHideSeek(true);
  Object.entries(tabs).forEach(([k, t]) => {
    const active = k === key;
    t.btn.classList.toggle('active', active);
    t.panel.classList.toggle('hidden', !active);
  });
  document.getElementById('screen').scrollTop = 0;
  if (key === 'journal') renderJournal();
  // A dot on the Cards tab always means "new Index entries" - jump straight to the Index instead of
  // whatever segment was last open, so tapping the badge actually shows what's new.
  if (key === 'collection') setCardsView(almanacHasNew() ? 'almanac' : cardsView);
  if (key === 'deck') renderDeckPanel();
  if (key === 'shop') setShopView(shopSubView);
  if (key === 'quests') renderQuests();
  if (key === 'town') renderTown();
  updateQuestBadge();
}

Object.entries(tabs).forEach(([key, t]) => {
  t.btn.addEventListener('click', () => {
    if (inBattle) return;
    ensureAudio(); sfx('nav'); buzz(HAP.tap);
    switchTab(key);
  });
});

document.getElementById('segMine').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('mine'); });
document.getElementById('segAlmanac').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('almanac'); });
document.getElementById('segCraft').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('craft'); });
document.getElementById('segFish').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('fish'); });

document.getElementById('segPacks').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('packs'); });
document.getElementById('segCustomize').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('customize'); });
document.getElementById('segItems').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('items'); });
document.getElementById('decorationCancelBtn').addEventListener('click', () => cancelPlacingDecoration());

document.getElementById('pickupInvite').addEventListener('click', e => { inviteCompanion(e.currentTarget.dataset.spirit); });
document.getElementById('pickupContinue').addEventListener('click', () => {
  pickupOverlay.classList.add('hidden'); document.getElementById('pickupInvite').classList.add('hidden'); sfx('tap'); checkAchievements();
  if (typeof resumePendingWalk === 'function') resumePendingWalk();
  if (!shopPanel.classList.contains('hidden') && shopSubView === 'packs') renderPacks();
  if (!collectionPanel.classList.contains('hidden') && cardsView === 'craft') renderCraft();
});
document.getElementById('sceneryContinue').addEventListener('click', () => sceneryOverlay.classList.add('hidden'));
document.getElementById('battleRetryBtn').addEventListener('click', () => closeBattle(true));
document.getElementById('battleContinueBtn').addEventListener('click', () => closeBattle(false));

document.getElementById('resetTown').addEventListener('click', () => {
  if (confirm('Start over? This clears your collection, character, and progress.')) resetGame();
});
document.getElementById('feedbackBtn').addEventListener('click', () => sendFeedback('feedback'));
document.getElementById('visitShopBtn').addEventListener('click', () => {
  sfx('nav'); buzz(HAP.tap);
  closePlayerMenu();
  switchTab('shop');
  setShopView('customize');
});

function resetGame() {
  state = {
    ownedCards: [],
    deck: [],
    wins: 0,
    currentDistrict: 'square',
    visitedDistricts: ['square'],
    playerPos: { x: 7, y: 15 },
    districtData: {},
    character: { emoji: '🧑', color: '#a8d4cc', accessory: '', name: 'You', unlockedEmojis: ['🧑'], unlockedAccessories: [''], unlockedColors: ['#a8d4cc'] },
    progress: freshProgress(),
    decorationInventory: {}
  };
  ensureQuests();
  migrateMapV2();
  migrateToBattleV2();
  migrateRewardsV2();
  generateTiles();
  inBattle = false;
  battle = null;
  battleView.classList.add('hidden');
  townPanel.classList.remove('hidden');
  document.getElementById('bottomNav').style.display = '';
  document.body.classList.remove('in-battle');
  saveState();
  renderTown();
  updateHud();
  switchTab('town');
  townLog.textContent = 'A new day begins in town.';
}

let lastTownSig = '';
function townSignature() {
  const data = state.districtData[state.currentDistrict];
  if (!data) return '';
  const now = Date.now();
  // Captures everything that can visibly change on its own: item presence/position and the fade-warning window
  const itemSig = data.items.map(it => {
    const fading = !it.collected && (ITEM_DESPAWN_MS - (now - it.spawnedAt)) < 6000;
    const respawnDue = it.collected && it.collectedAt && (now - it.collectedAt) >= ITEM_RESPAWN_MS;
    const despawnDue = !it.collected && (now - it.spawnedAt) >= ITEM_DESPAWN_MS;
    return [it.x, it.y, it.collected, fading, respawnDue, despawnDue].join(':');
  }).join('|');
  const npcSig = data.npcs.map(n => {
    return [n.defeated, n.defeated && n.grave ? graveLeft(n) <= 0 : false].join(':');
  }).join('|');
  const bossSig = data.boss ? [data.boss.defeated, data.boss.defeated && data.boss.grave ? graveLeft(data.boss) <= 0 : false].join(':') : '';
  // night-time things: Lumen's stall, how many critters are out, and whether mail is waiting
  const nightSig = [isNightNow(), (data.bugs || []).length, unreadMail()].join(':');
  // which water tiles have fish reshuffles every FISH_ROTATE_MS (see maps.js) - include the bucket so a
  // reshuffle while standing in town is picked up by this same signature check, not just on next visit
  const fishSig = Math.floor(Date.now() / FISH_ROTATE_MS);
  return itemSig + '#' + npcSig + '#' + bossSig + '#' + nightSig + '#' + fishSig;
}

setInterval(() => {
  if (!inBattle) { checkMail(); checkExpeditions(); checkStory(); }
  const rivalMoved = syncRival();
  const cropsGrew = tickCrops();
  if (!inBattle && !inScene && !townPanel.classList.contains('hidden')) {
    const sig = townSignature();
    if (sig !== lastTownSig || rivalMoved || (cropsGrew && state.currentDistrict === 'square')) { lastTownSig = sig; renderTown(); }
  }
  if (!inBattle) updateQuestBadge();
}, 2000);

const soundToggle = document.getElementById('soundToggle');
const musicToggle = document.getElementById('musicToggle');
const hapticToggle = document.getElementById('hapticToggle');

document.documentElement.setAttribute('data-theme', 'dark');   // dark mode is the only mode now; kept as an attribute since #sceneView room themes and a few selectors still key off it

function syncToggles() {
  soundToggle.classList.toggle('on', prefs.sound);
  musicToggle.classList.toggle('on', prefs.music);
  hapticToggle.classList.toggle('on', prefs.haptics);
  document.getElementById('fastToggle').classList.toggle('on', !!prefs.fast);
  document.getElementById('bigTextToggle').classList.toggle('on', !!prefs.bigText);
  document.getElementById('calmToggle').classList.toggle('on', !!prefs.calm);
  document.getElementById('notifsToggle').classList.toggle('on', notifsEnabled());
  document.getElementById('presenceToggle').classList.toggle('on', !!prefs.sharePresence);
  [['musicVol', 'musicVolNum', prefs.musicVol, !(prefs.sound && prefs.music)], ['sfxVol', 'sfxVolNum', prefs.sfxVol, !prefs.sound]].forEach(([id, numId, v, off]) => {
    const el = document.getElementById(id), pct = Math.round(v * 100);
    el.value = pct; el.style.setProperty('--fill', pct + '%');
    document.getElementById(numId).textContent = pct;
    el.closest('.vol-row').classList.toggle('off', off);
  });
}

soundToggle.addEventListener('click', () => {
  prefs.sound = !prefs.sound; savePrefs();
  if (prefs.sound) { ensureAudio(); }
  syncToggles(); syncMusic();
  if (prefs.sound) sfx('claim');
});
musicToggle.addEventListener('click', () => {
  prefs.music = !prefs.music; savePrefs();
  if (prefs.music && prefs.sound) ensureAudio();
  syncToggles(); syncMusic();
  if (prefs.music && !prefs.sound) toast('Turn Sound on to hear music');
});

function bindVolume(id, key, onChange) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    prefs[key] = Math.min(1, Math.max(0, Number(el.value) / 100));
    el.style.setProperty('--fill', el.value + '%');
    document.getElementById(id + 'Num').textContent = el.value;
    applyVolumes();                       // live: you hear it change while dragging
    if (onChange) onChange();
  });
  el.addEventListener('change', () => { savePrefs(); syncToggles(); });   // persist once the drag ends
}
bindVolume('musicVol', 'musicVol', () => { if (prefs.musicVol > 0 && prefs.music && prefs.sound) { ensureAudio(); syncMusic(); } });
let sfxPreviewAt = 0;
bindVolume('sfxVol', 'sfxVol', () => {
  const now = Date.now();
  if (now - sfxPreviewAt > 260 && prefs.sound) { sfxPreviewAt = now; sfx('tap'); }   // small blip so you can judge the level
});
hapticToggle.addEventListener('click', () => {
  prefs.haptics = !prefs.haptics; savePrefs(); syncToggles();
  if (prefs.haptics) buzz(HAP.win);
});

