/* ============================================================
   THE ATLAS
   Once summoned (js/summoning.js) the Atlas is an entity that travels across the worlds: syncAtlas() keeps one NPC (isAtlas) in
   whichever district the Dreamer is standing in, the same way syncRival() places Rook. Tapping it opens a scene (INTERIORS.atlas in
   js/houses-and-cellar.js) with four things:
     Ask      - a written, tap-a-question chat. No AI and no server: every answer is a line from a pool, and the big questions
                always stay maybes (the maybe rule). Guidance (atlasGuidance) is chosen by ordinary code from the Dreamer's progress.
     Battles  - four hard matches with the normal battle cards, each bending a rule (the boss twists). One pays per day.
     Games    - the house mini-games with every medal tier raised by ATLAS_HARD. Two prizes per game per day.
     The shop - decorations sold only here (DECORATION_ITEMS with atlas: true), opened up by Atlas wins.
   Saved: state.progress.atlas = { wins, battles: { id: { done, day } }, minis: { game: { day, rewarded, best } }, last }.
   ============================================================ */
const ATLAS = { id: 'atlas', name: 'The Atlas', icon: '🗺️' };
const ATLAS_HARD = 1.35;            // mini-game medal thresholds are multiplied by this
const ATLAS_GAMES_PAID = 2;         // paid medals per game per day
const ATLAS_TIER_EMBERS = { bronze: 5, silver: 10, gold: 18 };

function atlasState() {
  const p = state.progress;
  if (!p.atlas || typeof p.atlas !== 'object') p.atlas = {};
  const a = p.atlas;
  if (!a.battles) a.battles = {}; if (!a.minis) a.minis = {}; if (!a.wins) a.wins = 0; if (a.last === undefined) a.last = '';
  return a;
}
function atlasHome() { return state.ownedCards.includes('the-atlas'); }
function atlasNpc(data) { return data && data.npcs ? data.npcs.find(n => n.isAtlas) : null; }

// Keeps exactly one Atlas NPC, in the district the Dreamer is in. True when the town should redraw.
function syncAtlas() {
  if (inBattle || inScene || talkTo) return false;
  let changed = false;
  const here = atlasHome() ? state.currentDistrict : null;
  Object.keys(state.districtData).forEach(k => {
    const d = state.districtData[k], i = d.npcs.findIndex(n => n.isAtlas);
    if (i >= 0 && k !== here) { d.npcs.splice(i, 1); if (k === state.currentDistrict) changed = true; }
  });
  if (here) {
    const d = ensureDistrictData(here);
    if (!atlasNpc(d)) {
      const s = pickSpot(getMap(here), occupiedSet(d), d, { isBoss: false });
      d.npcs.push({ id: ATLAS.id, name: ATLAS.name, icon: ATLAS.icon, isAtlas: true, x: s.x, y: s.y, homeX: s.x, homeY: s.y,
                    deck: [], profile: { level: 'normal', spirit: 20 }, rewardCard: null, defeated: false, isBoss: false, justArrived: true });
      changed = true;
    }
  }
  if (changed) saveState();
  return changed;
}
function openAtlas() {
  sfx('claim');
  withDoorFade(() => { openScene('atlas'); showTipOnce('atlas'); });
}

/* ---------- Ask: the written chat ---------- */
// Every reply to a big question is a maybe. Several lines per question so a second visit does not repeat itself.
const ATLAS_TOPICS = [
  { id: 'where', label: '🌫️ Where are we?', lines: [
    'Somewhere that is kind to you. Perhaps somewhere that is you.',
    'A place with doors. Whether they open outward, I could not say.',
    'Here. It is a good word. It holds a great deal.'] },
  { id: 'who', label: '🗺️ Who are you?', lines: [
    'I am what the places are written on. Perhaps. Ask me again tomorrow.',
    'Every road you have walked is in me somewhere. So are the ones you have not.',
    'A friend, if that helps. It usually does.'] },
  { id: 'me', label: '💭 What am I?', lines: [
    'Someone who arrived. Beyond that, you know more than I do.',
    'A Dreamer. The word is wider than it looks.',
    'Curious. That is already a great deal to be.'] },
  { id: 'gods', label: '🕯️ Tell me about the gods', lines: [
    'Duermevela keeps the threshold and cannot tell which side they stand on. Be gentle with them.',
    'Murmullo trades in small secrets. Offer one back and you will be liked.',
    'Marea Lenta breathes in and out. Everything else is a rhythm they allow.',
    'Ensueño plants whatever you leave behind. Mind what you think near them.'] },
  { id: 'wake', label: '🌙 Can I wake up?', lines: [
    'Perhaps you have, a few times. How would you tell?',
    'Waking is a lovely idea. Many here have it. It keeps them warm.',
    'That depends which dream you mean.'] },
  { id: 'next', label: '🧭 What should I do next?', guidance: true }
];
function atlasPick(arr, key) {
  const a = atlasState(); let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && a.last === key + i) i = (i + 1) % arr.length;
  a.last = key + i; return arr[i];
}
// Guidance is plain code over the Dreamer's progress, spoken in the Atlas's voice. First matching rule wins.
function atlasGuidance() {
  const s = summonState();
  if (state.deck.length < DECK_SIZE) return `You carry ${state.deck.length} of ${DECK_SIZE} spirits into a match. Fill the rest of your deck and the doors will feel lighter.`;
  const order = Object.keys(DISTRICTS);
  for (const k of order) {
    const d = DISTRICTS[k];
    if (!districtUnlocked(k)) return `${d.name} is not open to you yet. ${districtLockReason(k)}, and it will be.`;
    if (!s.beaten[k]) return `${d.boss} keeps ${d.name}. Visit, and bring a deck you trust.`;
  }
  const waiting = SUMMONS.filter(x => !x.atlas && !summonOwned(x));
  if (waiting.length) { const x = waiting[0], d = cardDef(x.card); return `${d.name} would answer a call at the altar in your cottage, if you bring ${x.offer} spare ${FAMILIES[x.fam].name} cards.`; }
  const open = ATLAS_BATTLES.find(b => !atlasState().battles[b.id]);
  if (open) return `I have kept a few games for you, if you want something harder. The first is called ${open.title}.`;
  return 'You have done most of what there is to do. Wander. Fish. Bake something. The rest tends to arrive by itself.';
}
function atlasAskButtons() {
  return ATLAS_TOPICS.map(t => sceneBtn('atlasq:' + t.id, t.label)).join('') + sceneBtn('back', '← Back');
}
function atlasAnswer(id) {
  const t = ATLAS_TOPICS.find(x => x.id === id); if (!t) return '';
  atlasState().heard = (atlasState().heard || 0) + 1; saveState();
  const line = t.guidance ? atlasGuidance() : atlasPick(t.lines, id);
  if (!t.guidance) { const a = atlasState(); if (!a.hints) a.hints = []; if (!a.hints.includes(line)) { a.hints.push(line); if (a.hints.length > 40) a.hints.shift(); } }
  return line;
}
// The Theories page of the Journal keeps what the Atlas has said, as hints to build guesses on. It never says which guess is right.
function renderAtlasHints() {
  const box = document.getElementById('atlasHints'); if (!box) return;
  const h = (state.progress.atlas && state.progress.atlas.hints) || [];
  box.classList.toggle('hidden', !h.length);
  if (!h.length) return;
  box.innerHTML = `<div class="jgroup-h">Heard from the Atlas</div>` + h.slice(-6).reverse().map(x => `<div class="atlas-hint">“${escapeHtml(x)}”</div>`).join('') + (h.length > 6 ? `<div class="atlas-hint more">…and ${h.length - 6} more</div>` : '');
}
const ATLAS_HELLO = [
  'You are here. Good. So am I.',
  'Hello again. The roads are where you left them.',
  'I was just reading a page about you. It had not been written yet.',
  'Sit. Or do not. Both are fine.'
];
function atlasGreeting() { return atlasPick(ATLAS_HELLO, 'hello'); }

/* ---------- Battles ---------- */
// Difficulty is set by the deck's rarity floor (the foe deck is built from every card at or above it), not by Calm, which barely
// moves a match. Simulated (300 smart-vs-smart games each, a mid-game midrange deck): about 59%, 51%, 18% and 18% for the four, so
// they climb. A slow wall deck does worse (about 27%, 15%, 4%, 8%): the AI's decks are quick. Re-run before changing a row.
const ATLAS_BATTLES = [
  { id: 'hand', title: 'The Quiet Hand', twist: 'roots', calm: 22, rarity: 'ultra', pay: 30, line: 'It mends itself as if nothing had happened.' },
  { id: 'wall', title: 'The Long Wall',  twist: 'wall',  calm: 30, rarity: 'ultra', pay: 45, line: 'Everything it plays is a little sturdier than it should be.' },
  { id: 'tide', title: 'The Slow Tide',  twist: 'tide',  calm: 28, rarity: 'ultra', pay: 60, line: 'Your best card keeps being taken back.' },
  { id: 'bloom', title: 'The Counting',  twist: 'bloom', calm: 34, rarity: 'rare',  pay: 80, line: 'Small things, everywhere, growing.' }
];
function atlasBattleOpen(i) { return i === 0 || !!atlasState().battles[ATLAS_BATTLES[i - 1].id]; }
function atlasDeck(t) {
  const floor = RARITY_ORDER.indexOf(t.rarity), counts = {};
  CARD_POOL.filter(c => !c.exclusive && !c.foe && RARITY_ORDER.indexOf(c.rarity) >= floor).forEach(c => { counts[c.id] = 2; });
  return BattleEngine.suggestDeck(counts);
}
function atlasOpponent(i) {
  const t = ATLAS_BATTLES[i];
  return { id: 'atlas-' + t.id, name: ATLAS.name, icon: ATLAS.icon, deck: atlasDeck(t), profile: { level: 'smart', spirit: t.calm },
           isBoss: false, rewardCard: null, atlas: { k: i, twist: t.twist } };
}
function atlasBattleButtons() {
  return ATLAS_BATTLES.map((t, i) => {
    const open = atlasBattleOpen(i), done = !!atlasState().battles[t.id];
    return sceneBtn('atlasb:' + i, open ? `⚔️ ${t.title} · ${done ? 'again' : 'face it'}` : `🔒 ${t.title} · beat the one before`, !open);
  }).join('') + sceneBtn('back', '← Back');
}
function atlasBattleText(i) { const t = ATLAS_BATTLES[i], tw = BattleEngine.TWISTS[t.twist]; return `${t.title}. ${t.line} ${tw.icon} ${tw.text}`; }
function startAtlasBattle(i) {
  if (!ATLAS_BATTLES[i] || !atlasBattleOpen(i)) return;
  if (state.deck.length < DECK_SIZE) { toast('Fill your deck with 12 cards first.'); sfx('tie'); return; }
  closeScene(); startBattle(atlasOpponent(i));
}
function atlasWin() {
  const t = ATLAS_BATTLES[battle.npc.atlas.k], a = atlasState(), b = a.battles[t.id] || (a.battles[t.id] = { done: true, day: '' });
  battle.rewarded = true;
  state.wins++; a.wins++; bumpStat('battlesWon', 1); bumpStat('atlasWins', 1);
  const icon = btGet('battleEndIcon');
  icon.textContent = ATLAS.icon; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `${t.title}: done`;
  if (b.day !== todayKey()) { b.day = todayKey(); addPebbles(t.pay, 'atlas'); battleEndStats.innerHTML = `The Atlas turns a page for you<br><b>+${t.pay} 🫧</b>`; }
  else battleEndStats.innerHTML = 'The Atlas has already given today. It still counts.';
  saveState();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🗺️', '✨'], 12); sfx('win'); buzz(HAP.win); bumpPill('pillWins');
}

/* ---------- Games ---------- */
// Only the plain scored games: a score that gets higher, played inside a building. The ones with their own medal rules stay as they are.
function atlasGameIds() { return Object.keys(MINIGAMES).filter(id => MINIGAMES[id].tiers && !MINIGAMES[id].lowerBetter && !MINIGAMES[id].tierOf); }
function atlasGameButtons() {
  const t = todayKey();
  return atlasGameIds().map(id => {
    const d = MINIGAMES[id], m = atlasState().minis[id], left = Math.max(0, ATLAS_GAMES_PAID - (m && m.day === t ? m.rewarded : 0));
    return sceneBtn('atlasg:' + id, `${d.icon} ${d.title} · ${left ? `${left} prize${left === 1 ? '' : 's'} left` : 'just for fun'}${m && m.golds ? ' 🥇' : ''}`);
  }).join('') + sceneBtn('back', '← Back');
}
function atlasMiniResult(id, score) {
  const def = MINIGAMES[id], a = atlasState(), m = a.minis[id] || (a.minis[id] = { day: todayKey(), rewarded: 0, best: null, golds: 0 });
  if (m.day !== todayKey()) { m.day = todayKey(); m.rewarded = 0; }
  const tier = miniTier(def, score), better = m.best === null || score > m.best;
  if (better) m.best = score;
  bumpStat('atlasGames', 1);
  let rewardText = '';
  if (!tier) rewardText = 'No medal this time. The Atlas does not mind.';
  else {
    if (tier === 'gold') { m.golds = (m.golds || 0) + 1; bumpStat('atlasGolds', 1); }
    if (m.rewarded < ATLAS_GAMES_PAID) { m.rewarded++; addPebbles(ATLAS_TIER_EMBERS[tier], 'atlas'); rewardText = `+${ATLAS_TIER_EMBERS[tier]} 🫧`; }
    else rewardText = "Today's prizes are used up, but it still counts toward your best.";
  }
  saveState(); updateHud();
  logEvent(def.icon, `Played ${def.title} with the Atlas: ${def.scoreText(score)}${tier ? ' ' + MEDAL[tier] + '.' : ''}`);
  return { tier, rewardText, cardId: null, better };
}

/* ---------- The shop ---------- */
const ATLAS_SHOP = [
  { id: 'atlas-compass', need: 1 },
  { id: 'atlas-lantern', need: 1 },
  { id: 'dream-globe',   need: 2 },
  { id: 'star-chart',    need: 4 }
];
function atlasShopButtons() {
  const a = atlasState();
  return ATLAS_SHOP.map(s => {
    const item = DECORATION_ITEMS.find(x => x.id === s.id); if (!item) return '';
    const open = a.wins >= s.need;
    return sceneBtn('atlasbuy:' + s.id, open ? `${item.icon} ${item.name} · 🫧 ${item.cost}` : `🔒 ${item.name} · ${s.need} Atlas win${s.need === 1 ? '' : 's'}`, !open);
  }).join('') + sceneBtn('back', '← Back');
}
function atlasBuy(id) {
  const s = ATLAS_SHOP.find(x => x.id === id), item = s && DECORATION_ITEMS.find(x => x.id === id);
  if (!item) return '';
  if (atlasState().wins < s.need) return 'Not yet. Win a little more first.';
  if (state.progress.pebbles < item.cost) { sfx('tie'); return `That is 🫧 ${item.cost}. Come back when you have it.`; }
  spendPebbles(item.cost, 'decorations');
  state.decorationInventory[item.id] = decorationInventoryCount(item.id) + 1;
  saveState(); updateHud(); bumpPill('pillPebbles');
  logEvent(item.icon, `Bought a ${item.name} from the Atlas.`);
  sfx('claim'); buzz(HAP.found);
  return `${item.icon} ${item.name} goes into your decorations. Place it from the Decorations tab.`;
}
