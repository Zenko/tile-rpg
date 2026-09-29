/* ============================================================
   GARDENING
   Buy seeds from Fern (the blue cottage) or find them in the Hollow Garden's grass, plant them on open ground in
   Town Square, and harvest when grown. Growth runs on real time and the rain makes it half again as fast.
   Card seeds grow a card instead of (well, as well as) Pebbles.
   ============================================================ */
const SEEDS = [
  { id: 'daisy',     name: 'Daisy',     icon: '🌼', cost: 4,  growMin: 5,  pebbles: 7,  xp: 10, desc: 'Quick and cheerful.' },
  { id: 'pumpkin',   name: 'Pumpkin',   icon: '🎃', cost: 10, growMin: 15, pebbles: 18, xp: 20, desc: 'Slow, but it pays.' },
  { id: 'sunflower', name: 'Sunflower', icon: '🌻', cost: 16, growMin: 25, pebbles: 6,  xp: 25, card: 'rare',  desc: 'A card seed: grows a rare card or better.' },
  { id: 'moonbean',  name: 'Moonbean',  icon: '🌙', cost: 0,  growMin: 40, pebbles: 8,  xp: 40, card: 'ultra', found: true, desc: 'Only found in the Hollow Garden. Grows an ultra rare card or better.' },
];
const PLOT_MAX = 8;
const SEED_FIND_CHANCE = 0.03;          // per Hollow Garden grass tile walked, reset daily
function seedDef(id) { return SEEDS.find(s => s.id === id); }
const CROP_INGREDIENT = { daisy: 'flowers', pumpkin: 'pumpkin', sunflower: 'sunflower', moonbean: 'moonbean' };
function seedInv() { const p = state.progress; if (!p.seeds || typeof p.seeds !== 'object') p.seeds = {}; return p.seeds; }
function seedCount(id) { return seedInv()[id] || 0; }
function cropsIn() { const d = ensureDistrictData('square'); if (!Array.isArray(d.crops)) d.crops = []; return d.crops; }
function cropAt(data, x, y) { return (data.crops || []).find(c => c.x === x && c.y === y) || null; }
function cropGrowMs(c) { return seedDef(c.seed).growMin * 60000; }
function cropProgress(c) { return Math.min(1, (c.grown || 0) / cropGrowMs(c)); }
function cropStage(c) { const p = cropProgress(c); return p >= 1 ? 2 : p >= 0.5 ? 1 : 0; }
function cropIcon(c) { return cropStage(c) === 2 ? seedDef(c.seed).icon : cropStage(c) === 1 ? '🌿' : '🌱'; }
// Advances every crop by the time since it was last looked at (1.5x in the rain). True when any crop changed stage.
function tickCrops() {
  const d = state.districtData.square;
  if (!d || !Array.isArray(d.crops) || !d.crops.length) return false;
  const now = Date.now(), rate = (weatherIs('rain') ? 1.5 : 1) * (hasPerk('crops') ? 1.25 : 1) * (1 + cardBonus('crops')) * (eventIs('harvest-fair') ? 1.5 : 1);
  let changed = false;
  d.crops.forEach(c => {
    const before = cropStage(c);
    c.grown = (c.grown || 0) + Math.max(0, now - (c.lastTick || now)) * rate;
    c.lastTick = now;
    if (cropStage(c) !== before) changed = true;
  });
  return changed;
}
function seedsGreeting() {
  const inv = SEEDS.filter(s => seedCount(s.id) > 0).map(s => `${s.icon}×${seedCount(s.id)}`).join(' ');
  return `I also sell seeds, if you fancy a garden of your own.${inv ? ` You're carrying ${inv}.` : ''}`;
}
function seedsIntro() {
  const used = cropsIn().length;
  return `Seeds grow in real time in the square's soft ground, and the rain makes them grow faster. ${used}/${PLOT_MAX} plots in use. Moonbeans hide in the Hollow Garden's grass.`;
}
function seedButtons() {
  const buy = SEEDS.filter(s => !s.found).map(s => sceneBtn('seed:buy-' + s.id, `${s.icon} Buy ${s.name} seed · 🫧 ${s.cost}${s.card ? ' · grows a card' : ''}`));
  const plant = SEEDS.filter(s => seedCount(s.id) > 0).map(s => sceneBtn('seed:plant-' + s.id, `🪴 Plant ${s.name} (${seedCount(s.id)} left) · ${s.growMin} min`, cropsIn().length >= PLOT_MAX));
  return plant.join('') + buy.join('');
}
function seedAction(act) {
  const [verb, id] = [act.slice(0, act.indexOf('-')), act.slice(act.indexOf('-') + 1)], s = seedDef(id);
  if (!s) return '';
  if (verb === 'buy') {
    if (state.progress.pebbles < s.cost) { sfx('tie'); return `Fern smiles kindly. "Those are 🫧 ${s.cost} a packet."`; }
    state.progress.pebbles -= s.cost; seedInv()[id] = seedCount(id) + 1;
    saveState(); updateHud(); bumpPill('pillPebbles'); sfx('claim');
    return `${s.icon} One ${s.name} seed, wrapped in paper. ${s.desc}`;
  }
  if (verb === 'plant') { closeScene(); startPlanting(id); return ''; }
  return '';
}
function startPlanting(seedId) {
  const s = seedDef(seedId);
  if (!s || seedCount(seedId) <= 0 || inBattle || inScene) return;
  if (cropsIn().length >= PLOT_MAX) { toast(`All ${PLOT_MAX} garden plots are in use`); return; }
  placingDecoration = { item: { icon: s.icon, name: s.name + ' seed' }, district: 'square', seed: seedId };
  goToDistrictFor('square');
  beginPlacementUI(`Planting ${s.icon} ${s.name} - tap a glowing patch of ground`);
}
function plantSeed(seedId, x, y) {
  const s = seedDef(seedId), now = Date.now();
  seedInv()[seedId] = Math.max(0, seedCount(seedId) - 1);
  cropsIn().push({ uid: 'crop-' + now + '-' + Math.floor(Math.random() * 1000), seed: seedId, x, y, plantedAt: now, lastTick: now, grown: 0 });
  bumpStat('seedsPlanted', 1);
  toast(`🌱 ${s.name} planted - ready in about ${s.growMin} min`);
  logEvent('🌱', `Planted a ${s.name} seed in Town Square.`);
}
function cropCardRarity(floor) {
  if (floor === 'ultra') { const r = Math.random(); return r < 0.12 ? 'mythic' : r < 0.4 ? 'super' : 'ultra'; }
  return rollRewardRarity(false);                   // 'rare': rare or better, like a neighbor's prize
}
function harvestCrop(c) {
  const data = ensureDistrictData('square'), s = seedDef(c.seed);
  data.crops = data.crops.filter(x => x.uid !== c.uid);
  addPebbles(s.pebbles + (hasPerk('harvest') ? 2 : 0) + cardBonus('harvestPebbles') + (eventIs('harvest-fair') ? 3 : 0));
  addXP(s.xp);
  addIngredient(CROP_INGREDIENT[c.seed], 1);                 // every harvest also stocks the pantry
  bumpStat('cropsHarvested', 1);
  logEvent(s.icon, `Harvested a ${s.name}${s.card ? ' - and a card grew with it' : ''}.`);
  if (s.card) {
    const cid = randomCardId(cropCardRarity(s.card)), isNew = !discoveredSet().has(cid);
    state.ownedCards.push(cid); bumpStat('cardsFound', 1); bumpPill('pillCards');
    saveState(); renderTown();
    showCardReveal(cid, `${s.icon} Harvested!`, true, `+${s.pebbles} 🫧 Pebbles`, s.xp);
    if (isNew) toast('📖 New entry in your Index');
    return;
  }
  saveState(); renderTown();
  toast(`${s.icon} Harvested! +${s.pebbles} 🫧`); sfx('claim'); buzz(HAP.found);
}
function showCrop(c) {
  const s = seedDef(c.seed), left = Math.ceil((cropGrowMs(c) - (c.grown || 0)) / (weatherIs('rain') ? 1.5 : 1));
  showProp(cropIcon(c), `${s.name} (${Math.round(cropProgress(c) * 100)}% grown)`, `About ${fmtLeft(left)} to go${weatherIs('rain') ? ' - the rain is helping it along.' : '.'} ${s.desc}`);
}
// Hollow Garden grass hides a few seeds each day.
function maybeFindSeed(data, tk) {
  if (state.currentDistrict !== 'garden') return false;
  if (data.seedDay !== todayKey()) { data.seedDay = todayKey(); data.seedTiles = {}; }
  if (data.seedTiles[tk] || Math.random() >= SEED_FIND_CHANCE * (weatherFx().findMult || 1)) return false;
  data.seedTiles[tk] = true;
  const r = Math.random(), id = r < 0.3 ? 'moonbean' : r < 0.65 ? 'daisy' : r < 0.9 ? 'pumpkin' : 'sunflower', s = seedDef(id);
  seedInv()[id] = seedCount(id) + 1;
  bumpStat('seedsFound', 1);
  toast(`${s.icon} You found a ${s.name} seed in the grass!`); sfx('found'); buzz(HAP.found);
  saveState();
  return true;
}

function respawnNpc(data, n) {
  const spot = findFreeTile(data);
  n.x = spot.x;
  n.y = spot.y;
  n.name = randomNpcName(state.currentDistrict, namesInUse(data, n));
  n.deck = buildDeckForOpponent(DECK_SIZE, false);
  n.rewardCard = randomCardId(rollRewardRarity(false));
  n.defeated = false;
  n.defeatedAt = null;
  n.justArrived = true;   // one-time entrance animation
}

function showCardReveal(cardId, heading, isGift, note, xpGained) {
  const def = cardDef(cardId);
  const tier = RARITY_ORDER.indexOf(def.rarity);
  const card = document.getElementById('pickupCard');
  card.className = 'overlay-card' + (tier >= 1 ? ' glow-' + def.rarity : '');

  const face = document.getElementById('pickupCardFace');
  face.className = `reveal-card rarity-${def.rarity}` + (def.spell ? ' spell' : '');
  face.innerHTML = cardFaceHtml(def);
  face.classList.remove('reveal-icon'); void face.offsetWidth; face.classList.add('reveal-icon');

  pickupTitle.textContent = heading || 'You found a card';
  pickupDesc.innerHTML = `<span class="rarity-tag rt-${def.rarity}">${RARITY_LABEL[def.rarity]}</span>` + (hasAbility(def) ? `<br><span style="color:var(--accent)">${cardAbilityHtml(def)}</span>` : '') + (note ? `<br><b>${note}</b>` : '') + (xpGained ? `<br><span class="xp-gain-tag">+${Math.round(xpGained)} XP</span>` : '');

  const sparkCounts = [0, 4, 8, 14, 22];
  sparkleBurst(document.getElementById('pickupSparkles'), ['✨', '🌟', '·'], sparkCounts[tier] || 0);

  pickupOverlay.classList.remove('hidden');
  if (def.spell) showTipOnce('spells');
  if (tier >= 4) { sfx('mythic'); buzz(HAP.big); }
  else if (tier >= 1) { sfx('rare'); buzz(HAP.win); }
  else { sfx('found'); buzz(HAP.found); }
  if (isGift) sfx(tier >= 3 ? 'mythic' : 'gift');
}

function collectItem(item) {
  item.collected = true;
  item.collectedAt = Date.now();
  item.despawnedUncollected = false;
  const isNewCard = !state.ownedCards.includes(item.cardId);
  state.ownedCards.push(item.cardId);
  saveState();
  renderTown();
  updateHud();
  if (isNewCard) toast('📖 New entry in your Index');
  bumpPill('pillCards');
  bumpStat('cardsFound', 1);
  showCardReveal(item.cardId, 'You found a card', false, null, XP_PER_STAT.cardsFound);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

