/* ============================================================
   TAROT TRIALS (build 114)  - Quiet Nook -> Tarot -> Trials
   Five themed matches against a foe who brings its own Fate and Fate Spread (the same pieces you can use). They run in order;
   beating a trial the first time gives you its Arcana card, later wins pay a few Embers. A trial foe is a normal opponent
   (battle.npc.trial) that carries `fate` and `spread` into BattleEngine.newGame, and uses its Fate through aiTurn / btOpponentTurn.
   Needs Keeper level 6 (the Fate Spread unlock). Progress: state.progress.trials = { done: { [fateId]: true } }.
   Balance: see HANDOFF. Foes are pre-built decks (not scaled to your wins), so the difficulty is fixed.
   ============================================================ */
const TRIALS = [
  { fate: 'fool',    title: 'The Fool',    line: 'A cheerful stranger who draws more than they should.',  ai: 'normal', spirit: 19, spread: 'harmony',  tier: 'common' },
  { fate: 'chariot', title: 'The Chariot', line: 'Quick and relentless. Do not let them settle.',          ai: 'normal', spirit: 18, spread: 'harmony',  tier: 'rare' },
  { fate: 'justice', title: 'Justice',     line: 'Calm, even-handed, and always one step ahead.',          ai: 'smart',  spirit: 17, spread: 'contrast', tier: 'common' },
  { fate: 'tower',   title: 'The Tower',   line: 'Everything you built will be tested.',                   ai: 'smart',  spirit: 17, spread: 'harmony',  tier: 'common' },
  { fate: 'world',   title: 'The World',   line: 'The last trial. Every family answers to it.',            ai: 'smart',  spirit: 25, spread: 'contrast', tier: 'ultra' },
];
const trialIndex = t => ARCANA.findIndex(a => a.fate === t.fate);
function trialState() { const p = state.progress; if (!p.trials || typeof p.trials !== 'object') p.trials = { done: {} }; if (!p.trials.done) p.trials.done = {}; return p.trials; }
const trialDone = t => !!trialState().done[t.fate];
const trialOpen = k => k === 0 || trialDone(TRIALS[k - 1]);
// A fixed 12-card deck for a trial: the Arcana's own family leads (with the Arcana card itself), a few others fill in. Never spells, never more than 2 copies.
function trialDeck(t) {
  const a = ARCANA[trialIndex(t)], fam = arcanaFamily(a), others = Object.keys(TAROT_FAM).filter(f => f !== fam);
  const deck = [a.card], count = id => deck.filter(x => x === id).length;
  const add = id => { if (id && deck.length < DECK_SIZE && count(id) < 2 && !cardDef(id).spell) deck.push(id); };
  const tiers = { common: ['common', 'common', 'rare'], rare: ['common', 'rare', 'rare'], ultra: ['rare', 'rare', 'ultra'] }[t.tier];
  // contrast needs one card of three different families; harmony wants three of one
  if (t.spread === 'contrast') others.slice(0, 2).forEach((f, i) => add(familyCardId(f, tiers[i + 1])));
  for (let i = 0; deck.length < 9 && i < 60; i++) add(familyCardId(fam, tiers[i % tiers.length]));
  for (let i = 0; deck.length < DECK_SIZE && i < 80; i++) add(familyCardId(others[i % others.length], tiers[i % tiers.length]));
  return deck;
}
function trialSpread(t, deck) {
  const a = ARCANA[trialIndex(t)], fam = arcanaFamily(a), fo = id => CARD_FAMILY[id];
  const pick = (f, skip) => deck.find(id => fo(id) === f && !skip.includes(id));
  if (t.spread === 'contrast') {
    const ids = [a.card]; Object.keys(TAROT_FAM).filter(f => f !== fam).forEach(f => { const id = pick(f, ids); if (id && ids.length < 3) ids.push(id); });
    if (ids.length === 3) return ids;
  }
  const ids = deck.filter(id => fo(id) === fam).slice(0, 3);
  return ids.length === 3 ? ids : null;
}
function trialOpponent(k) {
  const t = TRIALS[k], a = ARCANA[trialIndex(t)], deck = trialDeck(t);
  return { id: 'trial-' + t.fate, name: t.title, icon: BattleEngine.FATES[t.fate].icon, deck, fate: t.fate, spread: trialSpread(t, deck), trial: { k },
           profile: { level: t.ai, spirit: t.spirit }, isBoss: false, rewardCard: null };
}
function startTrial(k) {
  if (featureLocked('spread') || !TRIALS[k] || !trialOpen(k)) return;
  if (state.deck.length < DECK_SIZE) { toast('Fill your deck with 12 cards first.'); sfx('tie'); return; }
  closeCalm(); startBattle(trialOpponent(k));
}
const TRIAL_REPEAT_PEBBLES = 6;
function trialWin() {
  const t = TRIALS[battle.npc.trial.k], a = ARCANA[trialIndex(t)], first = !trialDone(t), def = arcanaCardDef(a);
  battle.rewarded = true;
  state.wins++; bumpStat('battlesWon', 1); bumpStat('trialsWon', 1);
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = '🔮'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = first ? `${t.title}: trial passed!` : `${t.title}: beaten again`;
  if (first) {
    trialState().done[t.fate] = true;
    state.ownedCards.push(a.card); noteCardsFound(1); bumpPill('pillCards'); tarotState().seen[trialIndex(t)] = true;
    endCard.classList.add('glow-' + def.rarity);
    battleEndStats.innerHTML = `The trial leaves you<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
    logEvent('🔮', `Passed the Trial of ${t.title}.`);
  } else { addPebbles(TRIAL_REPEAT_PEBBLES, 'trial'); battleEndStats.innerHTML = `<b>+${TRIAL_REPEAT_PEBBLES} 🫧</b>. The Arcana card comes only the first time.`; }
  saveState();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🔮', '✨'], 12); sfx('win'); buzz(HAP.win); bumpPill('pillWins');
}
function tarotDrawTrials(box) {
  if (featureLocked('spread')) { box.innerHTML = `<div class="tr-detail"><b>🔮 Trials of the Arcana</b><span>${featureLockText('spread')}</span></div>`; return; }
  const done = TRIALS.filter(trialDone).length;
  const row = (t, k) => {
    const open = trialOpen(k), fin = trialDone(t), F = BattleEngine.FATES[t.fate], a = ARCANA[trialIndex(t)];
    return `<div class="tl-row${open ? '' : ' lock'}${fin ? ' done' : ''}"><div class="tl-ic">${open ? F.icon : '🔒'}</div>
      <div class="tl-txt"><b>${a.n} · ${t.title}</b><small>${open ? t.line : 'Pass the trial before this one.'}</small>
      ${open ? `<small class="tl-fate">${F.icon} ${F.name}: ${F.text}</small><small class="tl-fate">🃏 Spread: ${t.spread === 'harmony' ? 'Harmony (one family)' : 'Contrast (three families)'} · ${['Gentle', 'Fair', 'Sharp'][t.ai === 'normal' ? (k ? 1 : 0) : 2]}</small>` : ''}</div>
      <button type="button" class="calm-btn${open && !fin ? ' pri' : ''}" data-trial="${k}" ${open ? '' : 'disabled'}>${fin ? 'Again' : 'Face it'}</button></div>`;
  };
  box.innerHTML = `<div class="tr-count">${done} of ${TRIALS.length} trials passed</div><div class="calm-say sm">A foe who brings a Fate and a Spread of their own. Pass one to take home its Arcana card.</div><div class="tl-list">${TRIALS.map(row).join('')}</div>`;
  onAll(box, '[data-trial]', b => { sfx('tap'); startTrial(+b.dataset.trial); });
}
