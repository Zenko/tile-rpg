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
function ensureCosmeticUnlocks() {
  const ch = state.character;
  if (!Array.isArray(ch.unlockedEmojis)) ch.unlockedEmojis = [EMOJI_OPTIONS[0].emoji];
  if (!Array.isArray(ch.unlockedAccessories)) ch.unlockedAccessories = [ACCESSORY_OPTIONS[0].icon];
  if (!Array.isArray(ch.unlockedColors)) ch.unlockedColors = [COLOR_OPTIONS[0].color];
  if (!Array.isArray(ch.unlockedMats)) ch.unlockedMats = [MAT_OPTIONS[0].id];
  if (!Array.isArray(ch.unlockedStages)) ch.unlockedStages = [STAGE_OPTIONS[0].id];
  if (!STAGE_OPTIONS.some(m => m.id === ch.stage)) ch.stage = STAGE_OPTIONS[0].id;
  if (!ch.unlockedStages.includes(ch.stage)) ch.unlockedStages.push(ch.stage);
  if (!MAT_OPTIONS.some(m => m.id === ch.mat)) ch.mat = MAT_OPTIONS[0].id;
  if (!ch.unlockedMats.includes(ch.mat)) ch.unlockedMats.push(ch.mat);
  if (!Array.isArray(ch.unlockedAvBorders)) ch.unlockedAvBorders = [BORDER_OPTIONS[0].id];
  if (!BORDER_OPTIONS.some(b => b.id === ch.avBorder)) ch.avBorder = BORDER_OPTIONS[0].id;
  if (!ch.unlockedAvBorders.includes(ch.avBorder)) ch.unlockedAvBorders.push(ch.avBorder);
  if (!BORDER_WIDTHS.some(w => w.id === ch.avBorderW)) ch.avBorderW = 'thick';
  if (ch.avBorderColor != null && !/^#[0-9a-f]{6}$/i.test(ch.avBorderColor)) ch.avBorderColor = null;   // null = the default sea-glass ring
  // Grandfather in whatever this save already had picked, even if it predates today's five-item lists.
  if (ch.emoji && !ch.unlockedEmojis.includes(ch.emoji)) ch.unlockedEmojis.push(ch.emoji);
  if (ch.color && !ch.unlockedColors.includes(ch.color)) ch.unlockedColors.push(ch.color);
  if (typeof ch.accessory === 'string' && !ch.unlockedAccessories.includes(ch.accessory)) ch.unlockedAccessories.push(ch.accessory);
}
// Spends Embers to unlock a cosmetic and immediately equips it, so the Shop purchase doubles as picking it.
function buyCosmetic(kind, value, cost) {
  ensureCosmeticUnlocks();
  const ch = state.character, pr = state.progress;
  if (pr.pebbles < cost) { toast('Not enough Embers yet'); sfx('tie'); return false; }
  spendPebbles(cost, 'cosmetics');
  const key = kind === 'emoji' ? 'unlockedEmojis' : kind === 'accessory' ? 'unlockedAccessories' : kind === 'mat' ? 'unlockedMats' : kind === 'stage' ? 'unlockedStages' : kind === 'border' ? 'unlockedAvBorders' : 'unlockedColors';
  if (!ch[key].includes(value)) ch[key].push(value);
  if (kind === 'emoji') ch.emoji = value;
  else if (kind === 'accessory') ch.accessory = value;
  else if (kind === 'mat') ch.mat = value;
  else if (kind === 'stage') ch.stage = value;
  else if (kind === 'border') ch.avBorder = value;
  else ch.color = value;
  const label = kind === 'emoji' ? `the ${value} look` : kind === 'accessory' ? `the ${value} accessory` : kind === 'mat' ? `the ${MAT_OPTIONS.find(m => m.id === value).name} table mat` : kind === 'stage' ? `the ${STAGE_OPTIONS.find(m => m.id === value).name} backdrop` : kind === 'border' ? `the ${borderDef(value).name} avatar border` : 'a new color';
  logEvent(kind === 'emoji' ? value : '✨', `Bought and equipped ${label} for 🫧 ${cost}.`);
  saveState();
  updateHud();
  bumpPill('pillPebbles');
  toast('✨ Unlocked, and equipped on your profile');
  sfx('claim'); buzz(HAP.found);
  renderCustomize(); if (typeof renderCharacterTab === 'function') renderCharacterTab();
  return true;
}

// Applies the player's background and border (style + colour, see BORDER_OPTIONS in js/world-map.js) to any avatar
// element (HUD portrait, in-town badge, battle portrait, Character tab) so all of them stay in sync from one place.
// The CSS for each of those reads --av-border-w / --av-border-style / --av-border-color. Native styles just set those;
// gradient styles make the border transparent and paint the gradient behind it (border-box layer under a padding-box layer
// of the avatar colour), which still follows the round corners.
function applyAvatarStyle(el, character) {
  if (!el) return;
  const bg = character.color || 'var(--water-glow)', def = borderDef(character.avBorder);
  const col = /^#[0-9a-f]{6}$/i.test(character.avBorderColor || '') ? character.avBorderColor : 'var(--water)';
  el.style.setProperty('--av-bg', bg);
  el.style.setProperty('--av-border-w', borderWidthDef(character.avBorderW).px);
  if (def.grad) {
    el.style.setProperty('--av-border-style', 'solid');
    el.style.setProperty('--av-border-color', 'transparent');
    el.style.background = `linear-gradient(${bg}, ${bg}) padding-box, ${def.grad(col)} border-box`;
    el.style.backgroundOrigin = 'border-box';
  } else {
    el.style.setProperty('--av-border-style', def.native);
    el.style.setProperty('--av-border-color', col);
    el.style.background = bg; el.style.backgroundOrigin = '';
  }
  // the halo uses the border colour; gradient styles that ignore it get a fitting one of their own
  el.style.setProperty('--av-glow-color', def.id === 'gold' ? '#e8cb88' : col);
  el.classList.toggle('av-glow', !!def.glow);
  el.dataset.accessory = character.accessory || '';
}

// A glanceable summary of progress for the Character tab's Me view - the numbers already existed (testerInfo() in
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

// Customize/Profile/Social/Settings as tabs rather than an always-expanded stack (or the disclosure
// toggles this replaced) - same .seg/.seg-btn idiom as Journal/Rewards/Shop. Kept in module state (not
// saved) so reopening the menu returns to whichever tab was last open, like cardsView/shopSubView do.
let pmView = 'settings';
const PM_SEGMENTS = {
  settings: { btn: 'segPmSettings', view: 'pmSettingsView' },
  social: { btn: 'segPmSocial', view: 'pmSocialView' },
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

// The avatar opens the app-level sheet: Settings and Social. Everything about the character itself lives in the Character tab.
function openPlayerMenu() {
  fetchWhosPlaying();
  syncToggles();
  switchPmSegment(pmView);
  document.getElementById('pmVersion').textContent = 'Tile RPG ' + gameVersionLabel() + ' · build ' + BUILD;
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

/* ---------------- inventory rows: the Character tab's Pantry view (js/character-tab.js) builds its lists from these ---------------- */
function invRow(icon, name, count, desc, actionLabel, onAction) {
  const el = document.createElement('div');
  el.className = 'quest inv-item';
  el.innerHTML = `<div class="quest-top">
      <span class="q-icon">${icon}</span>
      <span class="q-name">${name}<div class="panel-desc">${desc}</div></span>
      <span class="q-count">${count === '' ? '' : '×' + count}</span>
    </div>` + (onAction ? `<div class="controls" style="margin-top:8px"><button class="panel-action active inv-use-btn">${actionLabel}</button></div>` : '');
  if (onAction) el.querySelector('.inv-use-btn').addEventListener('click', onAction);
  return el;
}
// One clean overlay instead of a stack of toasts firing one after another - everything worth knowing about
// right now (time, weather and its effect, season, today's event, and the forecast) at a glance together.
document.getElementById('pillSky').addEventListener('click', () => {
  sfx('tap');
  const s = skyPhase(), kind = state.weather.current || 'clear', w = WEATHER_KINDS[kind];
  const sd = seasonDef(), tev = eventNow(), ws = state.weather;
  const label = s.label.replace(/^the /i, ''), timeLabel = label.charAt(0).toUpperCase() + label.slice(1);
  document.getElementById('wxTitle').textContent = kind === 'clear' ? timeLabel : `${w.name} · ${timeLabel}`;
  const rows = [
    { icon: '🕘', text: `${formatGameClock(s.dayPos)} · ${DISTRICTS[state.currentDistrict].name}` },
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
  if (typeof refreshGoalChip === 'function') refreshGoalChip();   // js/skills-gear.js
  cardCountEl.textContent = state.ownedCards.length;
  winCountEl.textContent = state.wins;
  if (deckSizeHudEl) deckSizeHudEl.textContent = `${state.deck.length}/${DECK_SIZE}`;
  pebbleCountEl.textContent = state.progress.pebbles;
  avatarChipEmoji.textContent = state.character.emoji;
  const tabEmoji = document.getElementById('tabCharEmoji'); if (tabEmoji) tabEmoji.textContent = state.character.emoji;
  if (typeof refreshCharacterTab === 'function') refreshCharacterTab();
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

/* Switching tabs: the dock's pill slides (a transform), the new panel fades and slides in (opacity and transform), and
   the heavy rendering waits two frames so the first frames of the animation are never blocked by it. Both animations
   run on the compositor, so they stay smooth even while the page is busy building a long list. */
const TAB_ORDER = ['town', 'journal', 'collection', 'quests', 'character'];
let currentTab = 'town';
function renderTabContent(key) {
  if (key === 'journal') renderJournal();
  // A dot on the Cards tab always means "new Index entries" - jump straight to the Index instead of
  // whatever segment was last open, so tapping the badge actually shows what's new.
  if (key === 'collection') setCardsView(almanacHasNew() ? 'almanac' : cardsView);
  if (key === 'shop') setShopView(shopSubView);
  if (key === 'quests') renderQuests();
  if (key === 'character') { renderCharacterTab(); showTipOnce('character'); }
  if (key === 'town') renderTown();
}
function switchTab(key) {
  if (inBattle) return;
  if (placingDecoration && key !== 'town') cancelPlacingDecoration(true);
  if (HIDESEEK.active && key !== 'town') cancelHideSeek(true);
  const prev = currentTab, smooth = prev !== key && btMotionOk();
  currentTab = key;
  Object.entries(tabs).forEach(([k, t]) => {
    const active = k === key;
    t.btn.classList.toggle('active', active);
    // The town stays laid out while another tab is open (just invisible), so coming back is a fade, not a re-layout.
    if (t.panel === townPanel) { townPanel.classList.toggle('tab-away', !active); if (active) townPanel.classList.remove('hidden'); else if (inScene) townPanel.classList.add('hidden'); }
    else t.panel.classList.toggle('hidden', !active);
  });
  const nav = document.getElementById('bottomNav'), idx = TAB_ORDER.indexOf(key);
  if (nav && idx >= 0) nav.style.setProperty('--i', idx);
  document.getElementById('screen').scrollTop = 0;
  if (smooth) {
    const panel = tabs[key].panel, dir = Math.sign(idx - TAB_ORDER.indexOf(prev));
    const cls = key === 'town' || !dir || idx < 0 ? 'tab-in' : dir > 0 ? 'tab-in-r' : 'tab-in-l';
    panel.classList.remove('tab-in', 'tab-in-r', 'tab-in-l'); void panel.offsetWidth; panel.classList.add(cls);
    setTimeout(() => panel.classList.remove(cls), 360);
    const tick = viewTick;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (currentTab !== key) return;
      // someone who called switchTab and then chose a Cards/Shop view themselves keeps their choice
      if ((key === 'collection' || key === 'shop') && viewTick !== tick) return;
      renderTabContent(key); updateQuestBadge();
    }));
  } else { renderTabContent(key); }
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
document.getElementById('segDeck').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('deck'); });
document.getElementById('segAlmanac').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('almanac'); });
document.getElementById('segCraft').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setCardsView('craft'); });

document.getElementById('segPacks').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('packs'); });
document.getElementById('segCustomize').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('customize'); });
document.getElementById('segItems').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); setShopView('items'); });
document.getElementById('decorationCancelBtn').addEventListener('click', () => cancelPlacingDecoration());

document.getElementById('pickupInvite').addEventListener('click', e => { inviteCompanion(e.currentTarget.dataset.spirit); });
document.getElementById('pickupContinue').addEventListener('click', () => {
  pickupOverlay.classList.add('hidden'); document.getElementById('pickupInvite').classList.add('hidden'); sfx('tap'); checkAchievements();
  if (typeof resumePendingWalk === 'function') resumePendingWalk();
  if ((!shopPanel.classList.contains('hidden') && shopSubView === 'packs') || shopModeActive('packs')) renderPacks();
  if (!collectionPanel.classList.contains('hidden') && cardsView === 'craft') renderCraft();
});
document.getElementById('sceneryContinue').addEventListener('click', () => sceneryOverlay.classList.add('hidden'));
document.getElementById('battleRetryBtn').addEventListener('click', () => closeBattle(true));
document.getElementById('battleContinueBtn').addEventListener('click', () => closeBattle(false));

document.getElementById('resetTown').addEventListener('click', () => {
  if (confirm('Start over? This clears your collection, character, and progress.')) resetGame();
});
document.getElementById('feedbackBtn').addEventListener('click', () => sendFeedback('feedback'));

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
  if (!inBattle && !inScene && !townPanel.classList.contains('hidden') && !townPanel.classList.contains('tab-away')) {
    const sig = townSignature();
    if (sig !== lastTownSig || rivalMoved || (cropsGrew && state.currentDistrict === 'square')) { lastTownSig = sig; renderTown(); }
  }
  if (!inBattle) updateQuestBadge();
}, 2000);

const soundToggle = document.getElementById('soundToggle');
const musicToggle = document.getElementById('musicToggle');
const hapticToggle = document.getElementById('hapticToggle');


function syncToggles() {
  soundToggle.classList.toggle('on', prefs.sound);
  musicToggle.classList.toggle('on', prefs.music);
  hapticToggle.classList.toggle('on', prefs.haptics);
  document.querySelectorAll('#themeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.themePick === prefs.theme));
  document.getElementById('ambientToggle').classList.toggle('on', prefs.ambient);
  document.getElementById('fastToggle').classList.toggle('on', !!prefs.fast);
  document.getElementById('fishEasyToggle').classList.toggle('on', !!prefs.fishEasy);
  document.getElementById('bigTextToggle').classList.toggle('on', !!prefs.bigText);
  document.getElementById('calmToggle').classList.toggle('on', !!prefs.calm);
  document.getElementById('notifsToggle').classList.toggle('on', notifsEnabled());
  document.getElementById('presenceToggle').classList.toggle('on', !!prefs.sharePresence);
  document.getElementById('shareDeckToggle').classList.toggle('on', prefs.shareDeck !== false);
  document.getElementById('statsToggle').classList.toggle('on', prefs.shareStats !== false);
  document.getElementById('cozyToggle').classList.toggle('on', !!prefs.cozy);
  document.getElementById('cellarFogToggle').classList.toggle('on', prefs.cellarFog !== false);
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

document.querySelectorAll('#themeSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.theme = b.dataset.themePick; savePrefs(); applyTheme(); syncToggles(); sfx('tap');
}));
document.getElementById('ambientToggle').addEventListener('click', () => {
  prefs.ambient = !prefs.ambient; savePrefs();
  if (prefs.ambient && prefs.sound && prefs.music) ensureAudio();
  syncToggles(); syncAmbientAudio();
  if (prefs.ambient && !(prefs.sound && prefs.music)) toast('Turn Sound and Music on to hear ambience');
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

