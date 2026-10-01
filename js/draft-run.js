/* ============================================================
   DRAFT RUN (v1.85.0)
   A run at the fountain (the Festival Cup scene): you build a fresh 12-card deck out of the WHOLE card list - not your
   collection - by taking one card from each of twelve offers of three, then take it through four matches of rising
   difficulty. A loss ends the run. It plays on neutral ground: your collection's extras (mastery, charms, snacks, the
   companion) stay home, so a new player and a veteran draft on equal terms (battle.neutral, see startBattleNow).
   The Keeper's Knack still counts, since that is yours rather than your cards'.
   Rewards: Pebbles per round (the first 3 runs a day pay in full, then half), and a super-or-better card for the first
   clear each day. Wins here don't count toward district wins; they have their own stats.
   State lives in state.progress.draft (draftState()); the pick screen is #draftOverlay, the run's buttons are the
   fountain scene's 'draft' mode (draftButtons / draftAction, wired in js/houses-and-cellar.js).
   ============================================================ */
const DRAFT_PICKS = 12;
const DRAFT_ROUNDS = [
  { title: 'Round one',   icon: '🥉', level: 'gentle', spirit: 14, tier: 1, pebbles: 6 },
  { title: 'Round two',   icon: '🥈', level: 'normal', spirit: 16, tier: 2, pebbles: 10 },
  { title: 'Round three', icon: '🥇', level: 'normal', spirit: 18, tier: 2, pebbles: 16 },
  { title: 'The Final',   icon: '🏆', level: 'smart',  spirit: 20, tier: 3, pebbles: 30 }
];
const DRAFT_RARITY_W = { common: 50, rare: 28, ultra: 14, super: 6, mythic: 2 };
const DRAFT_FULL_RUNS_PER_DAY = 3;
const DRAFT_FOE_WINS = 3;      // opponents' card quality is set as if you had this many wins, whoever you are

function draftState() {
  const p = state.progress;
  if (!p.draft || typeof p.draft !== 'object') p.draft = { active: false, stage: null, picks: [], offer: [], round: 0, foes: [], best: 0, day: null, runsToday: 0, clearedToday: false };
  const d = p.draft, t = todayKey();
  if (d.day !== t) { d.day = t; d.runsToday = 0; d.clearedToday = false; }
  return d;
}

// Three different cards. Picks 4, 8 and 12 are "rare or better" offers; a deck may hold two copies of a card and at most three
// spells (so there are always bodies to put on the board).
function draftRollOffer(picks) {
  const counts = {}; picks.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const spells = picks.filter(id => cardDef(id).spell).length;
  const boosted = picks.length % 4 === 3;
  const pool = CARD_POOL.filter(c => !c.exclusive && (counts[c.id] || 0) < RULES_COPIES() && (spells < 3 || !c.spell));
  const offer = [];
  for (let guard = 0; offer.length < 3 && guard < 300; guard++) {
    let tot = 0; const w = Object.entries(DRAFT_RARITY_W).map(([r, v]) => [r, boosted && r === 'common' ? 0 : v]);
    w.forEach(([, v]) => { tot += v; });
    let x = Math.random() * tot, rar = 'common';
    for (const [r, v] of w) { x -= v; if (x <= 0) { rar = r; break; } }
    const same = pool.filter(c => c.rarity === rar && !offer.includes(c.id));
    if (same.length) offer.push(same[Math.floor(Math.random() * same.length)].id);
  }
  return offer;
}
function RULES_COPIES() { return BattleEngine.RULES.copies; }

function draftFoes() {
  const all = Object.values(NPC_POOLS).flatMap(pl => pl.names.map((n, i) => ({ name: n, icon: pl.icons[i % pl.icons.length] })));
  const a = shuffledArr(all);
  return [{ name: a[0].name, icon: a[0].icon }, { name: a[1].name, icon: a[1].icon }, { name: a[2].name, icon: a[2].icon }, { name: 'The Draft Master', icon: '🎴' }];
}
function draftPebbles(base) { return Math.round(base * (draftState().runsToday <= DRAFT_FULL_RUNS_PER_DAY ? 1 : 0.5)) * (typeof eventIs === 'function' && eventIs('festival-day') ? 2 : 1); }

function draftIntro() {
  const d = draftState();
  if (d.active && d.stage === 'pick') return `Your draft is in progress: ${d.picks.length} of ${DRAFT_PICKS} cards chosen. Pick one card from each offer to build a deck from scratch.`;
  if (d.active) return `Your deck is ready. ${DRAFT_ROUNDS[d.round].title}: ${d.foes[d.round].icon} ${d.foes[d.round].name} is waiting. A loss ends the run.`;
  return `The Draft Run: build a fresh deck by picking 1 card from each of ${DRAFT_PICKS} offers of three - from every card in the game, not just yours - then win four matches in a row. Your collection's perks stay home, so everyone drafts on equal terms. ${d.runsToday >= DRAFT_FULL_RUNS_PER_DAY ? 'Runs after your first three today pay half.' : `${DRAFT_FULL_RUNS_PER_DAY - d.runsToday} full-pay runs left today.`}${d.best ? ` Best so far: ${d.best} round${d.best === 1 ? '' : 's'}.` : ''}`;
}

function draftButtons() {
  const d = draftState();
  const back = sceneBtn('draft-back', '← Back to the fountain');
  if (!d.active) return sceneBtn('draft-start', '🎴 Start a Draft Run') + back;
  if (d.stage === 'pick') return sceneBtn('draft-pick', `🎴 Keep drafting · ${d.picks.length}/${DRAFT_PICKS} picked`) + sceneBtn('draft-quit', 'Abandon this run') + back;
  const r = DRAFT_ROUNDS[d.round], foe = d.foes[d.round];
  return sceneBtn('draft-play', `${r.icon} ${r.title} · ${foe.icon} ${foe.name}`) + sceneBtn('draft-deck', '🃏 Look at my draft deck') + sceneBtn('draft-quit', 'Abandon this run') + back;
}
function draftAction(act) {
  const d = draftState();
  if (act === 'draft') { scene.mode = 'draft'; scene.text = draftIntro(); sfx('tap'); renderScene(); return; }
  if (act === 'draft-back') { scene.mode = null; scene.text = cupIntro(); sfx('nav'); renderScene(); return; }
  if (act === 'draft-start') {
    d.active = true; d.stage = 'pick'; d.picks = []; d.round = 0; d.foes = draftFoes(); d.offer = draftRollOffer([]); d.runsToday++;
    saveState(); sfx('claim'); scene.text = draftIntro(); renderScene(); draftOpen(); return;
  }
  if (act === 'draft-pick' && d.active && d.stage === 'pick') { draftOpen(); return; }
  if (act === 'draft-quit') { d.active = false; d.stage = null; d.picks = []; d.offer = []; d.round = 0; saveState(); sfx('soft'); scene.text = 'You walk away from the draft table. Maybe next time.'; renderScene(); return; }
  if (act === 'draft-deck') { draftShowDeck(); return; }
  if (act === 'draft-play' && d.active && d.stage === 'fight') {
    const r = DRAFT_ROUNDS[d.round], foe = d.foes[d.round];
    startBattle({ id: 'draft-' + d.round, name: foe.name, icon: foe.icon, deck: buildDeckForOpponent(DECK_SIZE, d.round === 3, r.tier, foe.name, null, DRAFT_FOE_WINS),
                  profile: { level: r.level, spirit: r.spirit }, isBoss: d.round === 3, rewardCard: null, draft: { round: d.round }, playerDeck: d.picks.slice() });
  }
}

/* ---------- the pick screen ---------- */
let draftSel = -1;
function draftOpen() {
  const d = draftState(); if (!d.active || d.stage !== 'pick') return;
  draftSel = -1; draftRender();
  btGet('draftOverlay').classList.remove('hidden');
}
function draftRender() {
  const d = draftState();
  btGet('draftTitle').textContent = `Pick ${d.picks.length + 1} of ${DRAFT_PICKS}`;
  btGet('draftSub').textContent = d.picks.length % 4 === 3 ? 'A rare-or-better offer. Take one.' : 'Take the card that fits your deck best.';
  const box = btGet('draftOffer');
  box.innerHTML = d.offer.map((id, i) => {
    const def = cardDef(id);
    return `<button type="button" class="draft-opt${i === draftSel ? ' sel' : ''}" data-i="${i}" aria-label="${def.name}"><div class="reveal-card rarity-${def.rarity}${def.spell ? ' spell' : ''}">${cardFaceHtml(def)}</div><span class="rarity-tag rt-${def.rarity}">${RARITY_LABEL[def.rarity]}</span></button>`;
  }).join('');
  const sel = draftSel >= 0 ? cardDef(d.offer[draftSel]) : null;
  btGet('draftInfo').innerHTML = sel ? `<b>${sel.name}</b> · costs ${sel.cost} · ${cardStatsText(sel)}${hasAbility(sel) ? `<br>${cardAbilityHtml(sel)}` : ''}` : 'Tap a card to read it, then take it.';
  const take = btGet('draftTake'); take.disabled = draftSel < 0; take.textContent = sel ? `Take ${sel.name}` : 'Take it';
  btGet('draftPicked').innerHTML = Array.from({ length: DRAFT_PICKS }, (_, i) => d.picks[i] ? `<span class="dp on" title="${cardDef(d.picks[i]).name}">${cardArtHtml(cardDef(d.picks[i]))}</span>` : '<span class="dp"></span>').join('');
  box.querySelectorAll('.draft-opt').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    if (draftSel === i) { draftTake(); return; }              // a second tap on the same card takes it
    draftSel = i; sfx('tap'); draftRender();
  }));
}
function draftTake() {
  const d = draftState(); if (!d.active || d.stage !== 'pick' || draftSel < 0) return;
  d.picks.push(d.offer[draftSel]); draftSel = -1; sfx('flip'); buzz(HAP.play);
  if (d.picks.length >= DRAFT_PICKS) {
    d.stage = 'fight'; d.round = 0; d.offer = []; saveState();
    btGet('draftOverlay').classList.add('hidden');
    if (inScene && scene && scene.id === 'cup') { scene.text = draftIntro(); renderScene(); }
    toast('🎴 Deck drafted! Time to play');
    return;
  }
  d.offer = draftRollOffer(d.picks); saveState(); draftRender();
}
function draftShowDeck() {
  const d = draftState();
  const counts = {}; d.picks.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const lines = Object.entries(counts).map(([id, n]) => { const def = cardDef(id); return `${def.icon} ${def.name}${n > 1 ? ' ×' + n : ''}`; });
  scene.text = 'Your draft deck: ' + lines.join(' · ');
  sfx('tap'); renderScene();
}

/* ---------- results (called from btShowResult) ---------- */
function draftWin() {
  const d = draftState(), round = battle.npc.draft.round, r = DRAFT_ROUNDS[round];
  battle.rewarded = true;
  bumpStat('draftWins', 1);
  d.best = Math.max(d.best || 0, round + 1);
  const peb = draftPebbles(r.pebbles); addPebbles(peb);
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.className = 'big-icon reveal-icon';
  let extra = '';
  if (round < DRAFT_ROUNDS.length - 1) {
    d.round++;
    icon.textContent = r.icon;
    battleEndTitle.textContent = `On to ${DRAFT_ROUNDS[d.round].title.toLowerCase()}!`;
    extra = `${d.foes[d.round].icon} ${d.foes[d.round].name} is next.`;
  } else {
    d.active = false; d.stage = null; d.round = 0;
    bumpStat('draftClears', 1);
    icon.textContent = '🎴';
    battleEndTitle.textContent = 'Draft Run complete!';
    if (!d.clearedToday) {
      d.clearedToday = true;
      const cid = randomCardId(Math.random() < 0.3 ? 'mythic' : 'super'), def = cardDef(cid);
      state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards');
      endCard.classList.add('glow-' + def.rarity);
      extra = `A prize for the first clear today:<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
      logEvent('🎴', `Cleared a Draft Run and won ${def.name}.`);
    } else { addPebbles(20); extra = 'Another clean run today: +20 🫧 bonus.'; }
  }
  saveState();
  battleEndStats.innerHTML = `<b>+${peb} 🫧</b> ${extra}`;
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🎴', '✨', '🎉'], round === DRAFT_ROUNDS.length - 1 ? 24 : 10);
  sfx(round === DRAFT_ROUNDS.length - 1 ? 'mythic' : 'win'); buzz(HAP.win); bumpPill('pillWins');
}
function draftLoss() {
  const d = draftState(), round = battle.npc.draft.round;
  d.active = false; d.stage = null; d.round = 0; d.picks = []; saveState();
  const icon = btGet('battleEndIcon');
  icon.textContent = '🎗️'; icon.className = 'big-icon';
  btGet('battleSparkles').innerHTML = '';
  battleEndTitle.textContent = `Out in ${DRAFT_ROUNDS[round].title.toLowerCase()}.`;
  battleEndStats.textContent = `That deck had a good run${round ? ` - ${round} round${round === 1 ? '' : 's'} won` : ''}. Draft a new one whenever you like.`;
  btGet('battleRetryBtn').classList.add('hidden');
  sfx('soft');
}

btGet('draftTake').addEventListener('click', draftTake);
btGet('draftCloseBtn').addEventListener('click', () => btGet('draftOverlay').classList.add('hidden'));
