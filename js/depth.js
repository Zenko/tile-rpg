/* ============================================================
   DEPTH: THE SECOND LAP (build 286)
   Once all four district bosses are down and the Dreamer is level 15, each district can be taken again, deeper: Depth 1 to 5.
   A Depth fight is the district's boss with a better deck, more Calm and (from Depth 2) a rule for the match (js/depth-rules.js has the
   numbers and is measured by scripts/battle-report.js section G). This file is the screen (a sheet opened from the Journal's Battles page),
   the unlock, starting the fight and what a win pays. The fight itself goes through startBattle like any other opponent:
   `opponent.depth` (1-5) and `opponent.district` mark it, and js/battle-ui.js reads them in battleWorld, bossTwistFor and btShowResult.
   Saved in state.progress.depth = { cleared: { district: n }, day: { key, earned } }, created lazily.
   ============================================================ */
const DEPTH_MIN_LEVEL = 15;
function depthState() { const p = state.progress; if (!p.depth || typeof p.depth !== 'object') p.depth = {}; if (!p.depth.cleared) p.depth.cleared = {}; return p.depth; }
function depthCleared(district) { return Math.max(0, Math.min(DEPTH_MAX, Math.floor(depthState().cleared[district]) || 0)); }
function depthBossesDown() { const b = summonState().beaten; return Object.keys(DISTRICTS).every(d => b[d]); }
function depthUnlocked() { return depthBossesDown() && ensureLevel().level >= DEPTH_MIN_LEVEL; }
function depthLockText() {
  const need = [];
  if (!depthBossesDown()) need.push(`beat all four district bosses (${Object.keys(DISTRICTS).filter(d => summonState().beaten[d]).length} of 4 so far)`);
  if (ensureLevel().level < DEPTH_MIN_LEVEL) need.push(`reach level ${DEPTH_MIN_LEVEL}`);
  return need.length ? `To ${GAME.depth.verb.toLowerCase()} deeper: ${need.join(' and ')}.` : '';
}
function depthTotalCleared() { return Object.keys(DISTRICTS).reduce((n, d) => n + depthCleared(d), 0); }

// A fresh opponent for a Depth fight. The deck is made once, here, and handed to the battle (battle-ui.js only builds a deck itself for plain foes).
function depthOpponent(district, depth) {
  const fam = districtFamily(district), pool = CARD_POOL.filter(c => !c.exclusive && !c.foe && !c.token);
  return { id: 'depth-' + district, name: BOSSES[district], icon: DISTRICTS[district].bossIcon, isBoss: true, depth, district, rewardCard: null,
    deck: swapInCards(depthDeck(pool, Math.random, depth, fam), bossSignatureIds(district, Math.min(5, depth + 1))), profile: depthProfile(depth, true), defeated: false };   // and the boss's own cards, more of them the deeper it goes
}
function depthRuleText(district, depth) { return (DEPTH_RULE_TEXT[district] || []).filter((t, i) => depth >= 2 + i * 2); }
function depthSummary(district, depth) {
  const prof = depthProfile(depth, true), rules = depthRuleText(district, depth), first = depth > depthCleared(district), pay = DEPTH_FIRST_CLEAR[depth];
  return `${BOSSES[district]} starts with ${prof.spirit} Calm and a deck of ${depth >= 4 ? 'mostly super rare' : depth >= 2 ? 'ultra and super rare' : 'ultra rare'} cards.${rules.length ? ' Rules: ' + rules.join('; ') + '.' : ''} ${first ? `First win: ${pay.embers} ${GAME.currency.many}, ${pay.starlight} ${GAME.starlight.name} and a ${RARITY_LABEL[pay.card]} card or better.` : 'You have beaten this Depth: a win pays a few ' + GAME.currency.many + '.'}`;
}
function startDepth(district, depth) {
  if (!depthUnlocked() || !DISTRICTS[district] || depth < 1 || depth > Math.min(DEPTH_MAX, depthCleared(district) + 1)) return false;
  if (state.deck.length < DECK_SIZE) { toast(`Fill your ${DECK_SIZE}-card deck first`); return false; }
  closeDepthSheet(); startBattle(depthOpponent(district, depth));
  return true;
}

// What a win pays. The first win of a Depth pays well and records the Depth; a repeat pays a few Embers, tapered through the day like the other repeatable things.
function depthWin() {
  const npc = battle.npc, d = npc.district, n = npc.depth, first = n > depthCleared(d), pay = DEPTH_FIRST_CLEAR[n];
  battle.rewarded = true;
  state.wins++; bumpStat('battlesWon', 1); bumpStat('bossesWon', 1);
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = GAME.depth.icon; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `${GAME.depth.name} ${n}: ${npc.name} yields.`;
  if (first) {
    depthState().cleared[d] = n;
    const floor = RARITY_ORDER.indexOf(pay.card), rolled = rollRewardRarity(true), rar = RARITY_ORDER.indexOf(rolled) > floor ? rolled : pay.card;
    const cid = randomCardId(rar), def = cardDef(cid);
    state.ownedCards.push(cid); markFoil(cid); noteCardsFound(1); bumpPill('pillCards');   // a boss's prize has a better chance to be Reborn (markFoil)
    addPebbles(pay.embers, 'depth'); state.progress.starlight = starlight() + pay.starlight;
    endCard.classList.add('glow-' + def.rarity);
    battleEndStats.innerHTML = `<span class="end-prize-k">First clear</span><br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span><br><b>+${pay.embers} 🫧</b> · <b>+${pay.starlight} ${GAME.starlight.icon}</b>${n < DEPTH_MAX ? `<br>${GAME.depth.name} ${n + 1} is open.` : `<br>${PLACES[d]} is as deep as it goes.`}`;
    logEvent(GAME.depth.icon, `Cleared ${GAME.depth.name} ${n} in ${PLACES[d]}.`);
    bumpStat('depthClears', 1);
  } else {
    const gain = econTaper('depth', 6 + n * 2, 60);
    addPebbles(gain, 'depth');
    battleEndStats.innerHTML = `Beaten again: <b>+${gain} 🫧</b>. The prizes come the first time.`;
  }
  saveState(); updateHud();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), [GAME.depth.icon, '✨', '🌟'], 16); sfx('mythic'); buzz(HAP.win); bumpPill('pillWins');
  if (typeof checkAchievements === 'function') checkAchievements();
}

/* ---------- the sheet ---------- */
function depthSheetEl() {
  let el = document.getElementById('depthSheet');
  if (el) return el;
  el = document.createElement('div'); el.id = 'depthSheet'; el.className = 'ws-sheet hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', GAME.depth.name);
  el.innerHTML = `<div class="ws-card">
      <div class="ws-head"><span class="ws-icon" aria-hidden="true">${GAME.depth.icon}</span><div><b>${GAME.depth.name}</b><small class="ws-sub"></small></div><button type="button" class="ws-x" aria-label="Close">✕</button></div>
      <div class="ws-list dp-list"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeDepthSheet(); });
  el.querySelector('.ws-x').addEventListener('click', closeDepthSheet);
  return el;
}
function drawDepthSheet() {
  const el = depthSheetEl();
  el.querySelector('.ws-sub').textContent = `${depthTotalCleared()} of ${Object.keys(DISTRICTS).length * DEPTH_MAX} cleared`;
  el.querySelector('.dp-list').innerHTML = Object.keys(DISTRICTS).map(d => {
    const c = depthCleared(d), chips = Array.from({ length: DEPTH_MAX }, (_, i) => {
      const n = i + 1, done = n <= c, next = n === c + 1;
      return `<button type="button" class="dp-chip${done ? ' done' : ''}${next ? ' next' : ''}" data-d="${d}" data-n="${n}" ${done || next ? '' : 'disabled'} aria-label="${GAME.depth.name} ${n}, ${done ? 'cleared, play again' : next ? 'next' : 'locked'}">${done ? '✓' : n}</button>`;
    }).join('');
    return `<div class="dp-row"><div class="dp-name"><b>${PLACES[d]}</b><small>${BOSSES[d]} · ${c ? `${GAME.depth.name} ${c} cleared` : 'not yet dived'}</small></div><div class="dp-chips">${chips}</div></div>`;
  }).join('');
  onAll(el.querySelector('.dp-list'), '.dp-chip', b => {
    const d = b.dataset.d, n = +b.dataset.n;
    askConfirm({ title: `${GAME.depth.verb} into ${PLACES[d]}? ${GAME.depth.name} ${n}`, text: depthSummary(d, n), ok: GAME.depth.verb }, () => startDepth(d, n));
  });
}
function openDepthSheet() { if (!depthUnlocked()) { toast(depthLockText()); sfx('tie'); return; } drawDepthSheet(); depthSheetEl().classList.remove('hidden'); sfx('flip'); buzz(HAP.tap); }
function closeDepthSheet() { const el = document.getElementById('depthSheet'); if (el) el.classList.add('hidden'); }

// The card at the top of the Journal's Battles page.
function drawDepthCard() {
  const box = document.getElementById('depthCard'); if (!box) return;
  const open = depthUnlocked();
  box.innerHTML = `<div class="dp-card"><span class="ws-icon" aria-hidden="true">${GAME.depth.icon}</span><div class="dp-card-t"><b>${GAME.depth.name}</b><small>${open ? `${depthTotalCleared()} of ${Object.keys(DISTRICTS).length * DEPTH_MAX} cleared. The four bosses again, each deeper than the last.` : depthLockText()}</small></div><button type="button" class="panel-action" id="depthOpenBtn" ${open ? '' : 'disabled'}>${GAME.depth.verb}</button></div>`;
  const b = document.getElementById('depthOpenBtn'); if (b) b.addEventListener('click', openDepthSheet);
}
