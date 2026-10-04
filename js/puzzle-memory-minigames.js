/* ============================================================
   DAILY PUZZLE
   Olwen sets one board a day, the same for everyone that day: win it in a single turn. Boards are generated from
   the date and only kept if a small search proves they can be won - and that simply attacking with everything
   does not win - so every puzzle has a real answer that takes a little thought. Built once, then kept for the day.
   ============================================================ */
const PUZZLE_CARDS = {
  theirs: ['pebble', 'toadstool', 'bubble', 'geode', 'boulder', 'rice-cake', 'snail', 'twig-bundle', 'thistle', 'hollow-log', 'hedgehog', 'bramble', 'rosebush', 'folding-screen', 'torii-gate', 'moth', 'reed'],
  mine:   ['reed', 'flintstone', 'feather', 'moth', 'sprout', 'toadstool', 'gale', 'stray-kitten', 'lucky-cat', 'firefly', 'dusk-bat', 'paper-lantern'],
  hand:   ['spark', 'gust', 'thunderclap', 'sunbeam', 'second-wind', 'harvest', 'reed', 'flintstone', 'tide', 'temple-bell', 'paper-fan', 'morning-bugle', 'village-banner', 'feather', 'gale', 'windchime', 'autumn-maple'],
  filler: ['pebble', 'sprout', 'reed', 'moth']
};
function cloneBattle(G) { const c = JSON.parse(JSON.stringify(Object.assign({}, G, { rng: null, events: [], aiMemo: null }))); c.rng = Math.random; return c; }
function puzzleActions(G) {
  const E = BattleEngine, me = G.p[0], op = G.p[1], acts = [];
  me.hand.forEach(c => {
    if (!E.canPlay(G, 0, c.uid).ok) return;
    if (E.spellNeedsTarget(c)) op.board.forEach(t => acts.push({ type: 'play', uid: c.uid, target: { kind: 'card', uid: t.uid } }));
    else acts.push({ type: 'play', uid: c.uid });
  });
  me.board.forEach(a => E.legalTargets(G, 0, a.uid).forEach(t => acts.push({ type: 'attack', uid: a.uid, target: t })));
  return acts;
}
// Depth-first search for a winning line this turn. Returns the actions, or null.
function solvePuzzle(G, depth, budget) {
  if (G.over) return G.winner === 0 ? [] : null;
  if (depth === 0 || budget.n-- <= 0) return null;
  for (const a of puzzleActions(G)) {
    const H = cloneBattle(G); BattleEngine.applyAction(H, 0, a); H.events.length = 0;
    const rest = solvePuzzle(H, depth - 1, budget);
    if (rest) return [a].concat(rest);
  }
  return null;
}
// Would just swinging every ready card at their Calm win? Then it's not much of a puzzle.
function naiveWins(G) {
  const H = cloneBattle(G);
  H.p[0].board.forEach(a => { if (BattleEngine.legalTargets(H, 0, a.uid).some(t => t.kind === 'spirit')) BattleEngine.attack(H, 0, a.uid, { kind: 'spirit' }); });
  return H.over && H.winner === 0;
}
function buildPuzzle(day) {
  const E = BattleEngine, rnd = seeded('puzzle-' + day), pick = a => a[Math.floor(rnd() * a.length)];
  for (let attempt = 0; attempt < 160; attempt++) {
    const G = E.newGame(PUZZLE_CARDS.filler.concat(PUZZLE_CARDS.filler, PUZZLE_CARDS.filler), PUZZLE_CARDS.filler.concat(PUZZLE_CARDS.filler, PUZZLE_CARDS.filler), rnd, { spirit: [8, 5 + Math.floor(rnd() * 6)] });
    let uid = 500;
    const me = G.p[0], op = G.p[1];
    me.hand = []; me.board = []; op.hand = []; op.board = [];
    me.deck = [E.makeCard(pick(PUZZLE_CARDS.hand), uid++), E.makeCard(pick(PUZZLE_CARDS.hand), uid++)];
    op.deck = [0, 1, 2].map(() => E.makeCard(pick(PUZZLE_CARDS.filler), uid++));
    const nOpp = 1 + Math.floor(rnd() * 3), nMine = 1 + Math.floor(rnd() * 2), nHand = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < nOpp; i++) op.board.push(E.makeCard(pick(PUZZLE_CARDS.theirs), uid++));
    for (let i = 0; i < nMine; i++) { const c = E.makeCard(pick(PUZZLE_CARDS.mine), uid++); c.ready = true; me.board.push(c); }
    for (let i = 0; i < nHand; i++) me.hand.push(E.makeCard(pick(PUZZLE_CARDS.hand), uid++));
    G.active = 0; G.turn = 8; me.turns = 5; op.turns = 4;
    me.maxEnergy = me.energy = 2 + Math.floor(rnd() * 3);
    if (naiveWins(G)) continue;
    const sol = solvePuzzle(G, 6, { n: 1500 });
    if (sol && sol.length >= 2) return { day, G: cloneBattle(G), steps: sol.length };
  }
  return null;
}
function puzzleState() {
  const p = state.progress;
  if (!p.puzzle || typeof p.puzzle !== 'object') p.puzzle = { day: null, snap: null, solvedDay: null, streak: 0, solved: 0 };
  const pz = p.puzzle;
  if (pz.day !== todayKey()) {
    const built = buildPuzzle(todayKey());
    pz.day = todayKey(); pz.snap = built ? JSON.stringify(built.G) : null; pz.steps = built ? built.steps : 0;
    saveState();
  }
  return pz;
}
function puzzleView() {
  const pz = state.progress.puzzle;
  return { label: pz && pz.solvedDay === todayKey() ? '🧩 Today\'s puzzle ✓ (play again)' : '🧩 Today\'s puzzle: win in one turn' };
}
function startPuzzle() {
  const pz = puzzleState();
  if (!pz.snap) { scene.text = 'Olwen frowns at a blank page. "No puzzle today, I am afraid."'; renderScene(); return; }
  showTipOnce('puzzle');
  startBattle({ id: 'puzzle', name: "Olwen's puzzle", icon: '🧩', puzzle: pz.snap, isBoss: false });
}
function puzzleWin() {
  const pz = puzzleState(), first = pz.solvedDay !== todayKey();
  battle.rewarded = true;
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = '🧩'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = 'Solved!';
  if (first) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    pz.streak = pz.solvedDay === yKey ? pz.streak + 1 : 1;
    pz.solvedDay = todayKey(); pz.solved = (pz.solved || 0) + 1;
    const cid = randomCardId(rollRewardRarity(false)), def = cardDef(cid);
    state.ownedCards.push(cid); bumpStat('cardsFound', 1); bumpStat('puzzlesSolved', 1); bumpPill('pillCards');
    endCard.classList.add('glow-' + def.rarity);
    battleEndStats.innerHTML = `Olwen claps quietly. Day ${pz.streak} of your streak.<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
    logEvent('🧩', `Solved the daily puzzle (streak ${pz.streak}).`);
    sfx('win');
  } else { battleEndStats.innerHTML = 'Solved again - the prize was already yours today. Come back tomorrow for a new board.'; sfx('claim'); }
  saveState();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🧩', '✨'], 10); buzz(HAP.win);
}

/* ============================================================
   MEMORY MATCH
   A quiet card-matching game at the Reading Nook. Pairs are drawn from the
   player's own collection (deduplicated by base id), so it really uses
   your cards, not a fixed generic set. Grid size grows with how many
   distinct cards you own. Reward is small and capped per day, well below
   what a fought battle pays, since this is meant as a calm side activity.
   ============================================================ */
const MEMORY_DAILY_REWARDED = 3;     // rewarded games per day; playing itself is never blocked
const MEMORY_FLIP_BACK_MS = 750;     // how long a mismatched pair stays face up before flipping back
const MEMORY_MIN_PAIRS = 4;          // smallest grid, used while the collection is still small
const MEMORY_MAX_PAIRS = 10;         // largest grid, reached once the collection is large (the full pool is 100 distinct cards)

function memoryState() {
  const p = state.progress;
  if (!p.memory) p.memory = { day: todayKey(), rewarded: 0, wins: 0, bestFlips: null };
  const m = p.memory;
  if (m.day !== todayKey()) { m.day = todayKey(); m.rewarded = 0; }
  return m;
}
function memoryDistinctOwned() {
  const seen = new Set();
  state.ownedCards.forEach(id => seen.add(BattleEngine.baseIdOf ? BattleEngine.baseIdOf(id) : id));
  return [...seen];
}
function memoryPairCount() {
  const distinct = memoryDistinctOwned().length;
  const starterDistinct = new Set(STARTER_CARDS.map(id => BattleEngine.baseIdOf ? BattleEngine.baseIdOf(id) : id)).size;
  // The starter set alone already gives 8 distinct ids, so scale from there: the minimum grid until
  // the player has gone noticeably past the starter set, growing toward the ceiling after that.
  const beyondStarter = Math.max(0, distinct - starterDistinct);
  const grown = MEMORY_MIN_PAIRS + Math.floor(beyondStarter / 2);
  return Math.max(MEMORY_MIN_PAIRS, Math.min(MEMORY_MAX_PAIRS, grown));
}
/* A light, mostly-common reward roll of its own: this is a calm side game, not a fought win, so it
   should never out-pay a battle. Independent from rollRewardRarity, which is reserved for combat. */
function memoryRollRarity() {
  const r = Math.random();
  if (r < 0.03) return 'ultra';
  if (r < 0.14) return 'rare';
  return 'common';
}

/* ---------- the game itself ---------- */
let memory = null;   // { pairs, cards: [{baseId, key, matched}], flipped: [idx,idx], flips, busy }
function memoryNewGame() {
  const owned = memoryDistinctOwned();
  const n = memoryPairCount();
  // Prefer variety from the real collection; pad with starter ids only if the collection is smaller than the minimum grid needs.
  const pool = owned.length >= n ? owned.slice() : owned.concat(STARTER_CARDS.map(id => BattleEngine.baseIdOf ? BattleEngine.baseIdOf(id) : id));
  const uniquePool = [...new Set(pool)];
  const chosen = shuffledArr(uniquePool).slice(0, n);
  const cards = shuffledArr(chosen.concat(chosen)).map((baseId, i) => ({ key: i, baseId, matched: false }));
  memory = { cards, flipped: [], flips: 0, pairs: n, matches: 0, busy: false, startedAt: Date.now() };
}
function shuffledArr(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function memoryTap(key) {
  if (!memory || memory.busy) return;
  const c = memory.cards.find(x => x.key === key);
  if (!c || c.matched || memory.flipped.includes(key)) return;
  memory.flipped.push(key);
  renderMemoryGrid();
  if (memory.flipped.length < 2) { sfx('tap'); return; }
  memory.flips++;
  const [a, b] = memory.flipped.map(k => memory.cards.find(x => x.key === k));
  if (a.baseId === b.baseId) {
    a.matched = b.matched = true; memory.matches++;
    memory.flipped = [];
    sfx('claim'); buzz(HAP.tap);
    renderMemoryGrid();
    if (memory.matches === memory.pairs) setTimeout(memoryFinish, 400);
  } else {
    memory.busy = true;
    sfx('soft');
    renderMemoryGrid();
    setTimeout(() => { memory.flipped = []; memory.busy = false; renderMemoryGrid(); }, MEMORY_FLIP_BACK_MS);
  }
}
function memoryFinish() {
  const st = memoryState(), best = MEMORY_FLIP_BACK_MS && memory.pairs;
  const efficient = memory.flips <= memory.pairs + 1;      // the fewest possible is exactly `pairs` flips
  st.wins = (st.wins || 0) + 1;
  if (st.bestFlips === null || memory.flips < st.bestFlips) st.bestFlips = memory.flips;
  const rewarded = st.rewarded < MEMORY_DAILY_REWARDED;
  let cardId = null, pebbles = 0;
  if (rewarded) {
    st.rewarded++;
    pebbles = efficient ? 3 : 2;
    if (Math.random() < (efficient ? 0.12 : 0.05)) { cardId = randomCardId(memoryRollRarity()); state.ownedCards.push(cardId); bumpStat('cardsFound', 1); bumpPill('pillCards'); }
    else addPebbles(pebbles, 'memory');
  }
  saveState(); updateHud();
  scene.text = !rewarded ? `${memory.pairs} pairs in ${memory.flips} flips. Olwen nods approvingly, though today's reward is spent.`
    : cardId ? `${memory.pairs} pairs in ${memory.flips} flips. Tucked between two books: a card!`
    : `${memory.pairs} pairs in ${memory.flips} flips. Olwen slides ${pebbles} Ember${pebbles > 1 ? 's' : ''} across the table.`;
  memory.done = true;
  renderScene();
  if (cardId) { const isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId)); if (isNew) toast('📖 New entry in your Index'); setTimeout(() => showCardReveal(cardId, 'Found between the pages', false), 350); }
}

/* ---------- rendering: reuses the scene stage, drawn as a grid instead of the usual portrait ---------- */
function renderMemoryGrid() {
  const cols = memory.pairs <= 3 ? 3 : 4;
  const stage = document.getElementById('scStage');
  stage.classList.add('memory-stage');
  sceneView.classList.add('memory-mode');
  stage.style.setProperty('--mcols', cols);
  stage.innerHTML = `<div class="mem-grid">${memory.cards.map(c => {
    const shown = c.matched || memory.flipped.includes(c.key);
    const def = shown ? cardDef(c.baseId) : null;
    return `<button class="mem-tile ${shown ? 'up' : 'down'} ${c.matched ? 'matched' : ''}" data-key="${c.key}" ${shown ? `data-inspect="${c.baseId}"` : ''} ${c.matched || memory.busy ? 'disabled' : ''}>
      ${shown ? `<span class="mi">${def.icon}</span><span class="mn">${def.name}</span>` : '<span class="mb">🌿</span>'}
    </button>`;
  }).join('')}</div>`;
}
function memoryLeaveStage() {
  const stage = document.getElementById('scStage');
  stage.classList.remove('memory-stage');
  sceneView.classList.remove('memory-mode');
  stage.innerHTML = '<div class="sc-rug"></div><div class="sc-who" id="scWho"></div>';
}
document.getElementById('scStage').addEventListener('click', e => {
  const b = e.target.closest('.mem-tile'); if (b && !b.disabled) memoryTap(+b.dataset.key);
});

/* ============================================================
   HOUSE MINI-GAMES
   One small game in every building you can enter, all run by the same frame: the game draws into the scene stage,
   taps land through data-mg attributes (on pointerdown, so fast games never lose a tap to a redraw), and a finished
   game earns a medal. The first MINI_DAILY_REWARDED medals of each game every day pay Embers (gold may add a card);
   playing is never blocked. Each game is { house, icon, title, how, init, begin?, tap, render, scoreText,
   tiers {bronze, silver, gold} or tierOf(score), lowerBetter?, pebbles?(score) }.
   ============================================================ */
const MINI_DAILY_REWARDED = 3;
const TIER_PEBBLES = { bronze: 2, silver: 4, gold: 6 };
const MEDAL = { gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze' };
const MINI_GOLD_CARD_ODDS = 0.12;
let mini = null;   // { id, def, st, done, timers, house }

const rand = n => Math.floor(Math.random() * n);
function miniState(id) {
  const p = state.progress;
  if (!p.minigames || typeof p.minigames !== 'object') p.minigames = {};
  const m = p.minigames[id] || (p.minigames[id] = { day: todayKey(), rewarded: 0, best: null, plays: 0, golds: 0 });
  if (m.day !== todayKey()) { m.day = todayKey(); m.rewarded = 0; }
  return m;
}
function miniGoldCount() { return Object.keys(MINIGAMES).filter(id => state.progress.minigames && state.progress.minigames[id] && state.progress.minigames[id].golds > 0).length; }
function miniView(id) {
  const d = MINIGAMES[id], ms = miniState(id), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded);
  return { label: `${d.icon} Play: ${d.title}${left ? ` · ${left} prize${left === 1 ? '' : 's'} left today` : ' · just for fun today'}${ms.golds ? ' 🥇' : ''}` };
}
function miniStart(id) {
  miniStop();
  const def = MINIGAMES[id];
  mini = { id, def, st: def.init(), done: false, timers: [], house: scene.id };
  const best = miniState(id).best;
  scene.text = def.how + (best !== null ? ` Your best: ${def.scoreText(best)}` : '');
  showTipOnce('minigames');
  sfx('tap');
  renderScene();
  if (def.begin) def.begin(mini);
}
function miniClearTimers() { if (mini) mini.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); }
function miniStop() {
  miniClearTimers();
  if (mini) { mini = null; miniLeaveStage(); }
}
function miniEvery(ms, fn) { const g = mini; g.timers.push(setInterval(() => { if (mini === g && !g.done) fn(g.st); }, ms)); }
function miniAfter(ms, fn) { const g = mini; g.timers.push(setTimeout(() => { if (mini === g && !g.done) fn(g.st); }, ms)); }
function miniRender() {
  if (!mini) return;
  const stage = document.getElementById('scStage');
  stage.classList.add('mini-stage'); sceneView.classList.add('mini-mode');
  stage.innerHTML = `<div class="mg mg-${mini.id}${mini.done ? ' mg-over' : ''}">${mini.def.render(mini.st)}</div>`;
}
function miniLeaveStage() {
  const stage = document.getElementById('scStage');
  stage.classList.remove('mini-stage'); sceneView.classList.remove('mini-mode');
  stage.innerHTML = '<div class="sc-rug"></div><div class="sc-who" id="scWho"></div>';
}
function miniTier(def, score) {
  if (def.tierOf) return def.tierOf(score);
  const t = def.tiers;
  return score >= t.gold ? 'gold' : score >= t.silver ? 'silver' : score >= t.bronze ? 'bronze' : null;
}
// Shared by every mini-game - the scene-modal ones (tea, quiz, ...) and any played live on the map itself
// (Hide and Seek, see town-render-weather.js) - so tiers, pebbles, the daily reward cap, gold card odds and
// the minigamesPlayed/minigameGolds stat bumps (which the existing quests/achievements already track) are
// exactly the same regardless of how a game is presented. The caller decides how to show the result.
function awardMinigameResult(id, score) {
  const def = MINIGAMES[id], ms = miniState(id), tier = miniTier(def, score);
  ms.plays++;
  const better = ms.best === null || (def.lowerBetter ? score < ms.best : score > ms.best);
  if (better && (tier || !def.lowerBetter)) ms.best = score;
  bumpStat('minigamesPlayed', 1);
  let rewardText = '', cardId = null;
  if (!tier) rewardText = 'No medal this time - have another go.';
  else {
    if (tier === 'gold') { ms.golds++; bumpStat('minigameGolds', 1); }
    if (ms.rewarded < MINI_DAILY_REWARDED) {
      ms.rewarded++;
      const peb = (def.pebbles ? def.pebbles(score) : TIER_PEBBLES[tier]) + cardBonus('miniPebbles');
      if (peb) addPebbles(peb, 'minigames');
      if (tier === 'gold' && Math.random() < MINI_GOLD_CARD_ODDS) { cardId = randomCardId(memoryRollRarity()); state.ownedCards.push(cardId); bumpStat('cardsFound', 1); bumpPill('pillCards'); }
      rewardText = `+${peb} 🫧${cardId ? ' and a card!' : ''}`;
    } else rewardText = "Today's prizes are used up, but it still counts toward your best.";
  }
  saveState(); updateHud();
  logEvent(def.icon, `Played ${def.title}: ${def.scoreText(score)}${tier ? ' ' + MEDAL[tier] + '.' : ''}`);
  return { tier, rewardText, cardId, better };
}
function miniFinish(score) {
  if (!mini || mini.done) return;
  miniClearTimers();
  mini.done = true;
  const def = mini.def, r = awardMinigameResult(mini.id, score);
  scene.text = `${def.scoreText(score)} ${r.tier ? MEDAL[r.tier] + '!' : ''} ${r.rewardText}${r.better && r.tier ? ' ⭐ New best!' : ''}`;
  sfx(r.tier === 'gold' ? 'win' : r.tier ? 'claim' : 'soft'); if (r.tier) buzz(HAP.found);
  renderScene();
  if (r.cardId) setTimeout(() => showCardReveal(r.cardId, `${def.title} prize`, true), 400);
}
document.getElementById('scStage').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-mg]');
  if (!b || !mini || mini.done || b.disabled) return;
  e.preventDefault();
  mini.def.tap(mini.st, b.dataset.mg);
  if (mini && !mini.done) miniRender();
});
const timerBar = (left, total) => `<div class="mg-timer"><i style="width:${Math.max(0, left / total * 100)}%"></i></div>`;

/* ---------- 🫖 Perfect Pour (Wren's Cottage) ---------- */
function teaNextCup(g) {
  const st = g.st;
  st.band = 48 + rand(30); st.level = 0; st.pouring = false; st.note = `Cup ${st.cup + 1} of 3`;
  miniRender();
  miniAfter(650, s => { s.pouring = true; });
}
function teaStop(st, spilled) {
  st.pouring = false;
  const lo = st.band, hi = st.band + 14, dist = st.level < lo ? lo - st.level : st.level > hi ? st.level - hi : 0;
  const pts = spilled ? 0 : Math.max(0, Math.round(100 - dist * 6));
  st.scores.push(pts);
  st.note = spilled ? '☕ Spilled over! 0 points' : dist === 0 ? `✨ Perfect! 100 points` : `${pts} points - ${st.level < lo ? 'a little light' : 'a little full'}`;
  sfx(dist === 0 && !spilled ? 'claim' : 'soft');
  miniAfter(950, s => { s.cup++; if (s.cup >= 3) miniFinish(s.scores.reduce((a, b) => a + b, 0)); else teaNextCup(mini); });
}

/* ---------- ❓ Name That Card (the Reading Nook) ---------- */
function quizQuestion() {
  const pool = CARD_POOL.filter(c => !c.exclusive), ans = pool[rand(pool.length)];
  const same = shuffledArr(pool.filter(c => c.rarity === ans.rarity && c.id !== ans.id && c.icon !== ans.icon));
  const others = (same.length >= 2 ? same : shuffledArr(pool.filter(c => c.id !== ans.id))).slice(0, 2);
  const clue = ans.spell ? `✨ A spell: "${spellText(ans)}"` : `⚔ ${ans.power} power, ♥ ${ans.grit} health${ans.kw.length ? ', ' + ans.kw.map(k => KW[k].icon + ' ' + KW[k].name).join(' + ') : ', no keywords'}`;
  return { answer: ans.id, clue: `${RARITY_LABEL[ans.rarity]}, costs ${ans.cost}. ${clue}`, options: shuffledArr([ans].concat(others)).map(c => c.id) };
}

/* ---------- 🎂 Cake Toppings (Maple's Bakery) ---------- */
const TOPPINGS = ['🍓', '🫐', '🍋', '🥝'];
function frostNext(g) {
  const st = g.st;
  if (!st.seq.length) st.seq.push(rand(4));
  st.seq.push(rand(4));
  st.pos = 0; st.phase = 'show'; st.lit = null;
  miniRender();
  st.seq.forEach((t, i) => {
    miniAfter(500 + i * 620, s => { s.lit = t; sfx('tap'); miniRender(); });
    miniAfter(500 + i * 620 + 400, s => { s.lit = null; miniRender(); });
  });
  miniAfter(500 + st.seq.length * 620, s => { s.phase = 'input'; miniRender(); });
}

/* ---------- 🧵 Stitch the Pattern (Clover's Thread Stall) ---------- */
function patternNext(g) {
  const st = g.st, n = 3 + st.round;
  if (n > 11) { miniFinish(st.round); return; }
  st.target = shuffledArr([...Array(16).keys()]).slice(0, n); st.picks = []; st.phase = 'show'; st.wrong = null;
  miniRender();
  miniAfter(1200 + n * 130, s => { s.phase = 'input'; miniRender(); });
}

/* ---------- ⚙️ Fix the Clockwork (Tock's Tinker Stall) ---------- */
const GEAR_NEIGHBORS = i => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(j => j >= 0 && j < 9);
function gearsSolved(t) { return t.every((v, i) => v === (i === 8 ? 0 : i + 1)); }
function gearsShuffled() {
  let t;
  do {
    t = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let prev = -1;
    for (let k = 0; k < 24; k++) {
      const b = t.indexOf(0), opts = GEAR_NEIGHBORS(b).filter(j => j !== prev), j = opts[rand(opts.length)];
      t[b] = t[j]; t[j] = 0; prev = b;
    }
  } while (gearsSolved(t));
  return t;
}

/* ---------- 🏮 Light the Lanterns (the Lantern Market) ---------- */
function lanternFlip(on, i) { [i].concat(GEAR_NEIGHBORS(i)).forEach(j => { on[j] = !on[j]; }); }
function lanternsScrambled() {
  let on;
  do { on = Array(9).fill(true); shuffledArr([...Array(9).keys()]).slice(0, 3 + rand(2)).forEach(i => lanternFlip(on, i)); } while (on.every(Boolean));
  return on;
}

/* ---------- 🧺 Tidy Up (your cottage) ---------- */
const TIDY_BINS = { wardrobe: { icon: '🚪', name: 'Wardrobe', things: ['🧦', '👕', '🧣', '🎩', '🧤', '👗'] },
                    shelf:    { icon: '📚', name: 'Bookshelf', things: ['📖', '🗞️', '🧸', '🖼️', '🕯️', '🎲'] },
                    kitchen:  { icon: '🍳', name: 'Kitchen', things: ['🍵', '🥄', '🍽️', '🫖', '🥣', '🧂'] } };
function tidyItem(prev) {
  let bin, icon;
  do { bin = Object.keys(TIDY_BINS)[rand(3)]; icon = TIDY_BINS[bin].things[rand(6)]; } while (prev && prev.icon === icon);
  return { bin, icon };
}

const HAGGLE_POT = [0, 1, 2, 4, 6, 9, 12, 16, 20];
const MINIGAMES = {
  tea: { house: 'cottage', icon: '🫖', title: 'Perfect Pour',
    how: 'Wren pours, you say when: stop the tea inside the green band. Three cups, each a little quicker.',
    tiers: { bronze: 90, silver: 170, gold: 240 }, scoreText: s => `${s} of 300 points.`,
    init: () => ({ cup: 0, level: 0, pouring: false, band: 60, scores: [], note: '' }),
    begin: g => {
      teaNextCup(g);
      miniEvery(40, st => { if (!st.pouring) return; st.level += 0.9 + st.cup * 0.45; if (st.level >= 100) { st.level = 100; teaStop(st, true); } miniRender(); });
    },
    tap: (st, v) => { if (v === 'stop' && st.pouring) teaStop(st, false); },
    render: st => `<div class="tea-wrap"><div class="tea-cup"><div class="tea-band" style="bottom:${st.band}%"></div><div class="tea-fill" style="height:${st.level}%"></div></div>
      <div class="mg-side"><div class="mg-info">${st.scores.map(s => `☕ ${s}`).join(' · ') || '&nbsp;'}</div><div class="mg-note">${st.note}</div>
      <button class="mg-big" data-mg="stop" ${st.pouring ? '' : 'disabled'}>🫖 Stop!</button></div></div>` },

  quiz: { house: 'nook', icon: '❓', title: 'Name That Card',
    how: "Olwen reads out a card's details. Which card is it? Six questions.",
    tiers: { bronze: 2, silver: 4, gold: 6 }, scoreText: s => `${s} of 6 right.`,
    init: () => ({ q: 0, right: 0, cur: quizQuestion(), feedback: null }),
    tap: (st, v) => {
      if (st.feedback) return;
      const ok = v === st.cur.answer;
      if (ok) st.right++;
      st.feedback = { ok, pick: v }; sfx(ok ? 'claim' : 'soft');
      miniAfter(1000, s => { s.q++; s.feedback = null; if (s.q >= 6) miniFinish(s.right); else { s.cur = quizQuestion(); miniRender(); } });
    },
    render: st => `<div class="mg-info">Question ${Math.min(st.q + 1, 6)} of 6 · ${st.right} right</div><div class="quiz-clue">${st.cur.clue}</div>
      <div class="quiz-opts">${st.cur.options.map(id => { const d = cardDef(id), fb = st.feedback;
        const cls = fb ? (id === st.cur.answer ? ' right' : id === fb.pick ? ' wrong' : ' dim') : '';
        return `<button class="mg-opt${cls}" data-mg="${id}"><span>${d.icon}</span> ${d.name}</button>`; }).join('')}</div>` },

  frost: { house: 'bakery', icon: '🎂', title: 'Cake Toppings',
    how: 'Watch the order Maple adds the toppings, then repeat it. One more each round.',
    tiers: { bronze: 2, silver: 4, gold: 6 }, scoreText: s => `${s} round${s === 1 ? '' : 's'} of toppings.`,
    init: () => ({ seq: [], pos: 0, phase: 'show', lit: null, round: 0 }),
    begin: g => frostNext(g),
    tap: (st, v) => {
      if (st.phase !== 'input') return;
      const t = +v;
      st.lit = t; miniAfter(180, s => { if (s.lit === t) { s.lit = null; miniRender(); } });
      if (st.seq[st.pos] !== t) { st.phase = 'over'; st.wrongAt = t; sfx('soft'); miniAfter(700, s => miniFinish(s.round)); return; }
      st.pos++; sfx('tap');
      if (st.pos === st.seq.length) { st.round++; st.phase = 'done'; sfx('claim'); miniAfter(700, () => frostNext(mini)); }
    },
    render: st => `<div class="mg-info">${st.phase === 'show' ? '👀 Watch closely…' : st.phase === 'input' ? `Your turn: ${st.pos}/${st.seq.length}` : st.phase === 'done' ? '✨ Lovely!' : '🍰 Oh no, wrong topping'} · round ${st.round + 1}</div>
      <div class="cake">🎂</div><div class="tops">${TOPPINGS.map((t, i) => `<button class="mg-top${st.lit === i ? ' lit' : ''}" data-mg="${i}" ${st.phase === 'input' ? '' : 'disabled'}>${t}</button>`).join('')}</div>` },

  weeds: { house: 'house2', icon: '🌿', title: 'Weed the Beds',
    how: "Pull the weeds 🌿 as they pop up - but leave Fern's flowers 🌷 alone! 20 seconds.",
    tiers: { bronze: 6, silver: 12, gold: 18 }, scoreText: s => `${s} weed${s === 1 ? '' : 's'} pulled.`,
    init: () => ({ cells: Array(9).fill(null), score: 0, start: Date.now(), nextSpawn: 0, left: 20000 }),
    begin: g => {
      g.st.start = Date.now();
      miniEvery(90, st => {
        const now = Date.now(), el = now - st.start;
        st.left = 20000 - el;
        st.cells = st.cells.map(c => (c && c.until < now ? null : c));
        if (now >= st.nextSpawn) {
          const empty = st.cells.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
          if (empty.length) st.cells[empty[rand(empty.length)]] = { kind: Math.random() < 0.25 ? 'flower' : 'weed', until: now + Math.max(750, 1150 - el * 0.02) };
          st.nextSpawn = now + Math.max(380, 700 - el * 0.016);
        }
        if (st.left <= 0) miniFinish(st.score); else miniRender();
      });
    },
    tap: (st, v) => {
      const i = +v, c = st.cells[i];
      if (!c) return;
      if (c.kind === 'weed') { st.score++; sfx('tap'); buzz(HAP.tap); } else { st.score = Math.max(0, st.score - 2); sfx('soft'); }
      st.cells[i] = null;
    },
    render: st => `${timerBar(st.left, 20000)}<div class="mg-info">🌿 ${st.score}</div>
      <div class="beds">${st.cells.map((c, i) => `<button class="bed" data-mg="${i}">${c ? (c.kind === 'weed' ? '🌿' : '🌷') : ''}</button>`).join('')}</div>` },

  grain: { house: 'stall-grain', icon: '🌾', title: 'Catch the Grain',
    how: 'Tap a lane to move your basket. Catch the grain 🌾, dodge the stones 🪨. 25 seconds.',
    tiers: { bronze: 6, silver: 13, gold: 20 }, scoreText: s => `${s} grain caught.`,
    init: () => ({ lane: 1, items: [], score: 0, start: Date.now(), nextSpawn: 0, lastStep: 0, left: 25000, hit: null }),
    begin: g => {
      g.st.start = Date.now();
      miniEvery(60, st => {
        const now = Date.now(), el = now - st.start;
        st.left = 25000 - el;
        if (now - st.lastStep >= Math.max(170, 300 - el * 0.005)) {
          st.lastStep = now;
          st.items.forEach(it => { it.y++; });
          st.items.filter(it => it.y === 5 && it.lane === st.lane).forEach(it => {
            if (it.kind === 'grain') { st.score++; sfx('tap'); st.hit = 'good'; } else { st.score = Math.max(0, st.score - 2); sfx('soft'); buzz(HAP.soft); st.hit = 'bad'; }
            it.caught = true;
          });
          st.items = st.items.filter(it => it.y < 5 && !it.caught);
        }
        if (now >= st.nextSpawn) { st.items.push({ lane: rand(3), y: 0, kind: Math.random() < 0.22 ? 'stone' : 'grain' }); st.nextSpawn = now + Math.max(330, 560 - el * 0.008); }
        if (st.left <= 0) miniFinish(st.score); else miniRender();
      });
    },
    tap: (st, v) => { st.lane = +v; },
    render: st => `${timerBar(st.left, 25000)}<div class="mg-info">🌾 ${st.score}</div><div class="lanes">${[0, 1, 2].map(l => `<button class="lane" data-mg="${l}">${[0, 1, 2, 3, 4].map(y => {
        const it = st.items.find(x => x.lane === l && x.y === y); return `<span class="lane-cell">${it ? (it.kind === 'grain' ? '🌾' : '🪨') : ''}</span>`; }).join('')}<span class="lane-cell basket">${st.lane === l ? '🧺' : ''}</span></button>`).join('')}</div>` },

  pattern: { house: 'stall-thread', icon: '🧵', title: 'Stitch the Pattern',
    how: 'Clover shows a pattern for a moment. Stitch the same squares from memory - one more square each round.',
    tiers: { bronze: 1, silver: 3, gold: 5 }, scoreText: s => `${s} pattern${s === 1 ? '' : 's'} stitched.`,
    init: () => ({ round: 0, target: [], picks: [], phase: 'show', wrong: null }),
    begin: g => patternNext(g),
    tap: (st, v) => {
      if (st.phase !== 'input') return;
      const i = +v;
      if (st.picks.includes(i)) return;
      st.picks.push(i);
      if (!st.target.includes(i)) { st.phase = 'over'; st.wrong = i; sfx('soft'); miniAfter(900, s => miniFinish(s.round)); return; }
      if (st.picks.length === st.target.length) { st.round++; st.phase = 'done'; sfx('claim'); miniAfter(650, () => patternNext(mini)); } else sfx('tap');
    },
    render: st => `<div class="mg-info">${st.phase === 'show' ? '👀 Remember it…' : st.phase === 'input' ? `Stitch ${st.target.length - st.picks.length} more` : st.phase === 'done' ? '✨ Perfect stitching!' : '🧶 A stitch out of place'} · round ${st.round + 1}</div>
      <div class="quilt">${[...Array(16).keys()].map(i => { const on = st.phase === 'show' ? st.target.includes(i) : st.picks.includes(i) || (st.phase === 'over' && st.target.includes(i));
        return `<button class="patch${on ? ' on' : ''}${st.wrong === i ? ' wrong' : ''}" data-mg="${i}" ${st.phase === 'input' ? '' : 'disabled'}></button>`; }).join('')}</div>` },

  haggle: { house: 'stall-spice', icon: '🫙', title: 'Higher or Lower',
    how: 'Saffron turns over spice jars numbered 1 to 9. Guess whether the next is higher or lower - a tie counts for you. Each right guess sweetens the pot. Take it whenever you like, or lose it on a wrong guess.',
    tiers: { bronze: 1, silver: 4, gold: 6 }, scoreText: s => (s ? `A streak of ${s}.` : 'Bust!'), pebbles: s => HAGGLE_POT[Math.min(s, HAGGLE_POT.length - 1)],
    init: () => ({ cur: 1 + rand(9), streak: 0, last: null, phase: 'guess' }),
    tap: (st, v) => {
      if (st.phase !== 'guess') return;
      if (v === 'take') { if (st.streak) miniFinish(st.streak); return; }
      const next = 1 + rand(9), ok = v === 'hi' ? next >= st.cur : next <= st.cur;
      st.last = { from: st.cur, to: next, ok }; st.cur = next;
      if (ok) { st.streak++; sfx('claim'); if (st.streak >= HAGGLE_POT.length - 1) miniAfter(500, s => miniFinish(s.streak)); }
      else { st.phase = 'bust'; sfx('soft'); miniAfter(900, () => miniFinish(0)); }
    },
    render: st => `<div class="mg-info">Pot: 🫧 ${HAGGLE_POT[Math.min(st.streak, HAGGLE_POT.length - 1)]} · streak ${st.streak}${st.last ? ` · ${st.last.from} → ${st.last.to} ${st.last.ok ? '✅' : '❌'}` : ''}</div>
      <div class="jar"><span>🫙</span><b>${st.cur}</b></div>
      <div class="haggle-btns"><button class="mg-opt" data-mg="hi" ${st.phase === 'guess' ? '' : 'disabled'}>⬆️ Higher</button><button class="mg-opt" data-mg="lo" ${st.phase === 'guess' ? '' : 'disabled'}>⬇️ Lower</button>
      <button class="mg-opt take" data-mg="take" ${st.phase === 'guess' && st.streak ? '' : 'disabled'}>🤝 Take the pot</button></div>` },

  gears: { house: 'stall-tinker', icon: '⚙️', title: 'Fix the Clockwork',
    how: 'Tap a gear next to the gap to slide it. Put them back in order, 1 to 8, with the gap in the bottom corner.',
    lowerBetter: true, tierOf: m => (m <= 26 ? 'gold' : m <= 44 ? 'silver' : 'bronze'), scoreText: m => `Fixed in ${m} moves.`,
    init: () => ({ tiles: gearsShuffled(), moves: 0 }),
    tap: (st, v) => {
      const i = +v, b = st.tiles.indexOf(0);
      if (!GEAR_NEIGHBORS(b).includes(i)) return;
      st.tiles[b] = st.tiles[i]; st.tiles[i] = 0; st.moves++; sfx('tap');
      if (gearsSolved(st.tiles)) { miniRender(); miniAfter(350, s => miniFinish(s.moves)); }
    },
    render: st => `<div class="mg-info">Moves: ${st.moves} · gold in 26 or fewer</div>
      <div class="gears">${st.tiles.map((t, i) => `<button class="gear${t ? '' : ' gap'}${t && t === i + 1 ? ' home' : ''}" data-mg="${i}">${t ? `<span>⚙️</span><b>${t}</b>` : ''}</button>`).join('')}</div>` },

  tidy: { house: 'home', icon: '🧺', title: 'Tidy Up',
    how: 'Put each thing where it belongs - wardrobe, bookshelf or kitchen - as fast as you can. 20 seconds!',
    tiers: { bronze: 6, silver: 11, gold: 16 }, scoreText: s => `${s} thing${s === 1 ? '' : 's'} tidied.`,
    init: () => ({ item: tidyItem(), score: 0, start: Date.now(), left: 20000, last: null }),
    begin: g => { g.st.start = Date.now(); miniEvery(100, st => { st.left = 20000 - (Date.now() - st.start); if (st.left <= 0) miniFinish(st.score); else miniRender(); }); },
    tap: (st, v) => { const ok = v === st.item.bin; st.score = Math.max(0, st.score + (ok ? 1 : -1)); st.last = ok ? 'good' : 'bad'; sfx(ok ? 'tap' : 'soft'); st.item = tidyItem(st.item); },
    render: st => `${timerBar(st.left, 20000)}<div class="mg-info">🧺 ${st.score}</div><div class="tidy-item ${st.last || ''}">${st.item.icon}</div>
      <div class="bins">${Object.keys(TIDY_BINS).map(k => `<button class="mg-opt bin" data-mg="${k}"><span>${TIDY_BINS[k].icon}</span> ${TIDY_BINS[k].name}</button>`).join('')}</div>` },

  lanterns: { house: 'lantern', icon: '🏮', title: 'Light the Lanterns',
    how: 'Tapping a lantern flips it and the ones beside it. Light all nine.',
    lowerBetter: true, tierOf: m => (m <= 5 ? 'gold' : m <= 9 ? 'silver' : 'bronze'), scoreText: m => `All lit in ${m} moves.`,
    init: () => ({ on: lanternsScrambled(), moves: 0 }),
    tap: (st, v) => {
      lanternFlip(st.on, +v); st.moves++; sfx('tap');
      if (st.on.every(Boolean)) { miniRender(); miniAfter(400, s => miniFinish(s.moves)); }
    },
    render: st => `<div class="mg-info">Moves: ${st.moves} · gold in 5 or fewer</div>
      <div class="lanterns">${st.on.map((o, i) => `<button class="lantern${o ? ' lit' : ''}" data-mg="${i}">🏮</button>`).join('')}</div>` },

  // Metadata only - Hide and Seek isn't played through the scene-modal mini/miniStart/miniRender plumbing
  // above (no house, init, begin, tap or render here). It's played live on the town map itself: tap your
  // own companion to start (see the HIDESEEK game object and handleHideSeekTap() in town-render-weather.js).
  // This entry only exists so awardMinigameResult()/miniState()/miniView() - the tier/pebble/quest-stat
  // machinery every mini-game shares - work for it exactly like any other.
  hideseek: { icon: '🙈', title: 'Hide and Seek',
    tiers: { bronze: 3, silver: 6, gold: 9 }, scoreText: s => `Found ${s} time${s === 1 ? '' : 's'}.` },
};


function tickItems(data) {
  const now = Date.now();
  let changed = false;

  data.items.forEach(it => {
    if (!it.collected && it.spawnedAt && (now - it.spawnedAt) >= ITEM_DESPAWN_MS) {
      it.collected = true;
      it.collectedAt = now;
      it.despawnedUncollected = true;
      changed = true;
    }
  });

  data.items.forEach(it => {
    if (it.collected && it.collectedAt && (now - it.collectedAt) >= ITEM_RESPAWN_MS) {
      const spot = findFreeTile(data);
      it.x = spot.x;
      it.y = spot.y;
      it.collected = false;
      it.collectedAt = null;
      it.despawnedUncollected = false;
      it.cardId = weightedTownCardId(rollTownFindRarity());
      it.spawnedAt = now;
      changed = true;
    }
  });

  // Defeated neighbors and bosses rest in a grave and come back when its timer runs out.
  if (tickGraves(data)) changed = true;

  if (tickChest(data)) changed = true;
  if (tickBugs(data)) changed = true;

  if (changed) saveState();
  return changed;
}

/* ---------------- hidden chest: rare, glowing, on a cooldown, always worth the detour ---------------- */
const CHEST_SPAWN_CHANCE = 0.012;      // rolled once per render tick while none is out and the cooldown has passed
const CHEST_COOLDOWN_MS = 18 * 60 * 1000;
function tickChest(data) {
  const now = Date.now();
  if (data.chest) return false;
  if (data.chestCooldownUntil && now < data.chestCooldownUntil) return false;
  if (Math.random() >= CHEST_SPAWN_CHANCE * (weatherFx().chestMult || 1) * (hasPerk('chest') ? 1.5 : 1) * (1 + cardBonus('chest')) * (districtCalm() ? 1.5 : 1)) return false;
  const spot = findFreeTile(data);
  data.chest = { x: spot.x, y: spot.y, spawnedAt: now };
  return true;
}
function openChest(data) {
  if (!data.chest) return;
  data.chest = null;
  data.chestCooldownUntil = Date.now() + CHEST_COOLDOWN_MS;
  const rarity = Math.random() < 0.72 ? 'rare' : Math.random() < 0.8 ? 'ultra' : 'super';
  const cardId = randomCardId(rarity);
  const pebbles = 18 + Math.floor(Math.random() * 15);
  const xp = 80;
  state.ownedCards.push(cardId);
  noteCardsFound(1);
  addPebbles(pebbles, 'puzzle');
  addXP(xp);
  bumpPill('pillCards');
  bumpStat('chestsOpened', 1);
  saveState(); updateHud(); renderTown();
  sfx('claim'); buzz(HAP.big);
  logEvent('🗝️', 'Opened a hidden chest.');
  showCardReveal(cardId, '🗝️ A hidden chest!', true, `+${pebbles} 🫧 Embers`, xp);
}

