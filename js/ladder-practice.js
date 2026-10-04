/* ============================================================
   LADDER, DECK ARCHETYPES AND PRACTICE (build 100)
   The trading-card side. Three small systems that share one file:

   - The ladder: a monthly rank (Pebble, Stone, Moss, Gem, Star) earned from lingering duels, deck challenges, cup trophies,
     bosses, the rival and Draft clears. It only ever goes up inside a season (nothing is lost by losing), and a new
     month halves your points and pays Embers for the best rank you reached. Calm by design: you climb against ghosts and
     the town, never against a live player.
   - Archetypes: a deck with 6+ cards of one family is a "<Family> deck"; with 8+ it gets +1 Calm at the start of
     matches (read through skillBonus('startSpirit') in js/skills-gear.js, so it needs no new battle hook).
   - Practice: "Test your deck" plays the deck against sample opponents at three strengths on the plain rules (no skills,
     charms or mastery) and reports a win rate, so a player can compare two builds without spending real matches.
   Saved in state.progress.ladder (created lazily).
   ============================================================ */
const LADDER_RANKS = [
  { id: 'pebble', name: 'Pebble', icon: '⚪', at: 0 },
  { id: 'stone',  name: 'Stone',  icon: '🪨', at: 100 },
  { id: 'moss',   name: 'Moss',   icon: '🌿', at: 250 },
  { id: 'gem',    name: 'Gem',    icon: '💎', at: 450 },
  { id: 'star',   name: 'Star',   icon: '⭐', at: 700 },
];
const LADDER_FROM = { ghostWins: 10, challengesWon: 8, cupTrophies: 15, bossesWon: 6, draftClears: 20, rivalWins: 8, trialsWon: 12 };
const LADDER_RANK_PEBBLES = 15, LADDER_SEASON_PEBBLES = 25;   // per rank index: first time this season / paid when a season ends
const monthKey = () => todayKey().slice(0, 7);
function ladderRankIndex(pts) { let r = 0; LADDER_RANKS.forEach((k, i) => { if (pts >= k.at) r = i; }); return r; }
function ladderState() {
  const p = state.progress, m = monthKey();
  if (!p.ladder || typeof p.ladder !== 'object') p.ladder = { season: m, pts: 0, paid: 0 };
  const L = p.ladder;
  if (L.season !== m) {   // a new month: pay for the best rank reached, then keep half the points
    const best = ladderRankIndex(L.pts || 0);
    if (best > 0) { addPebbles(best * LADDER_SEASON_PEBBLES, 'ladder'); logEvent(LADDER_RANKS[best].icon, `Season over: you finished ${LADDER_RANKS[best].name}. +${best * LADDER_SEASON_PEBBLES} 🫧`); toast(`${LADDER_RANKS[best].icon} Season over: ${LADDER_RANKS[best].name} rank pays 🫧 ${best * LADDER_SEASON_PEBBLES}`); }
    L.season = m; L.pts = Math.floor((L.pts || 0) / 2); L.paid = 0;
  }
  return L;
}
function ladderGain(n, why) {
  if (!n) return;
  const L = ladderState(), before = ladderRankIndex(L.pts);
  L.pts += n;
  const after = ladderRankIndex(L.pts);
  if (after > before) {
    const r = LADDER_RANKS[after];
    if (after > (L.paid || 0)) { addPebbles((after - (L.paid || 0)) * LADDER_RANK_PEBBLES, 'ladder'); L.paid = after; }
    toast(`${r.icon} Ranked up: ${r.name}! +🫧 ${after * LADDER_RANK_PEBBLES}`); logEvent(r.icon, `Reached ${r.name} rank${why ? ' (' + why + ')' : ''}.`); sfx('rankup'); buzz(HAP.win);
  }
  saveState();
}
function ladderFromStat(stat, n) { const per = LADDER_FROM[stat]; if (per) ladderGain(per * (n || 1), stat); }   // called from bumpStat (js/quests.js)
function seasonDaysLeftInMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); }
function renderLadderCard() {
  const el = document.getElementById('socialRank'); if (!el) return;
  const L = ladderState(), i = ladderRankIndex(L.pts), r = LADDER_RANKS[i], nx = LADDER_RANKS[i + 1];
  const pct = nx ? Math.round((L.pts - r.at) / (nx.at - r.at) * 100) : 100, left = seasonDaysLeftInMonth();
  el.innerHTML = `<span class="lr-badge">${r.icon}</span><div class="lr-body"><div class="lr-name">${r.name} rank<span>${L.pts} pts</span></div>
    <div class="lr-bar"><i style="width:${pct}%"></i></div>
    <small>${nx ? `${nx.at - L.pts} to ${nx.name}` : 'Top rank this season'} · season ends in ${left} day${left === 1 ? '' : 's'}</small>
    ${typeof weeklyRule === 'function' ? `<small>📅 ${weeklyRule().icon} ${weeklyRule().name}: ${weeklyRule().text} in every match this week.</small>` : ''}
    <small>Earn points from lingering duels, deck challenges, the Cup, bosses and Draft Runs. You never lose points.</small></div>`;
}

/* ---------- archetypes ---------- */
function deckArchetype(deck) {
  const tally = {}; (deck || []).forEach(id => { const f = CARD_FAMILY[BattleEngine.baseIdOf(id)]; if (f) tally[f] = (tally[f] || 0) + 1; });
  const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  if (!top || tally[top] < 6) return null;
  const full = deck.length >= DECK_SIZE;
  return { fam: top, n: tally[top], bonus: tally[top] >= 8 && full, tier: !full ? 0 : tally[top] >= 8 ? 2 : 1 };   // tier 1: 6-7 cards (a smaller once-per-match passive), tier 2: 8+
}
// The family whose passive this deck plays with (6+ cards of one family, full deck), or null; archetypeTier() says which step. Neutral and puzzle matches ignore it.
function archetypePassive() { const a = deckArchetype(state.deck); return a && a.tier ? a.fam : null; }
function archetypeTier() { const a = deckArchetype(state.deck); return a ? a.tier : 0; }
const passiveDef = (fam, tier) => (tier === 1 ? BattleEngine.MINORS : BattleEngine.PASSIVES)[fam];

/* ---------- practice ---------- */
const PRACTICE_TIERS = [{ tier: 1, label: 'Easy', ai: 'normal', spirit: 17 }, { tier: 2, label: 'Middling', ai: 'normal', spirit: 17 }, { tier: 3, label: 'Hard', ai: 'smart', spirit: 20 }];
const PRACTICE_GAMES = 14;
let practiceResult = null, practiceRunning = false;
function practiceOnce(mine, spec, g) {
  const foe = buildDeckForOpponent(DECK_SIZE, false, spec.tier);
  const G = BattleEngine.newGame(mine.slice(), foe, Math.random, { spirit: [BattleEngine.RULES.spirit, spec.spirit], first: g % 2 });
  BattleEngine.startTurn(G);
  for (let t = 0; t < 120 && !G.over; t++) { BattleEngine.aiTurn(G, G.active, G.active === 0 ? 'smart' : spec.ai); if (!G.over) BattleEngine.endTurn(G, G.active); }
  return G.over && G.winner === 0;
}
function runPractice() {
  if (practiceRunning || state.deck.length < DECK_SIZE) return;
  practiceRunning = true; practiceResult = { wins: [], done: 0 };
  const mine = state.deck.slice(); let ti = 0, g = 0, w = 0;
  const step = () => {
    const spec = PRACTICE_TIERS[ti];
    for (let k = 0; k < 4 && g < PRACTICE_GAMES; k++, g++) if (practiceOnce(mine, spec, g)) w++;
    if (g >= PRACTICE_GAMES) { practiceResult.wins[ti] = Math.round(w / PRACTICE_GAMES * 100); ti++; g = 0; w = 0; }
    practiceResult.done = ti;
    const finished = ti >= PRACTICE_TIERS.length;
    if (finished) { practiceRunning = false; practiceResult.deck = mine; }   // before the render, so the button comes back
    renderDeckInsights();
    if (!finished) setTimeout(step, 20); else bumpStat('practiceRuns', 1);
  };
  setTimeout(step, 20);
}
function renderDeckInsights() {
  const el = document.getElementById('deckInsights'); if (!el) return;
  const a = deckArchetype(state.deck), full = state.deck.length >= DECK_SIZE;
  const row = (P, on, note) => `<div class="di-pass${on ? '' : ' dim'}"><i>${on ? P.icon : '🔒'}</i><div><b>${P.name}${note ? ` <small>${note}</small>` : ''}</b><span>${P.text}</span></div></div>`;
  const arch = a ? `<div class="di-arch"><b>${FAMILIES[a.fam].icon} ${FAMILIES[a.fam].name} deck</b><span>${a.n} of ${state.deck.length} cards${a.tier === 0 ? ' · fill the deck to unlock its passive' : ''}</span>
      ${row(BattleEngine.MINORS[a.fam], a.tier >= 1, '6 cards')}${row(BattleEngine.PASSIVES[a.fam], a.tier >= 2, '8 cards · replaces the first')}</div>`
    : `<div class="di-arch"><b>Mixed deck</b><span>Six cards of one family unlock a small passive; eight unlock the full one.</span></div>`;
  const stale = practiceResult && practiceResult.deck && practiceResult.deck.join() !== state.deck.join();
  const res = practiceResult && practiceResult.wins.length ? `<div class="di-bars${stale ? ' stale' : ''}">${PRACTICE_TIERS.map((t, i) => practiceResult.wins[i] === undefined ? `<div class="di-row"><span>${t.label}</span><i class="di-bar"><b style="width:0"></b></i><em>…</em></div>` : `<div class="di-row"><span>${t.label}</span><i class="di-bar"><b style="width:${practiceResult.wins[i]}%"></b></i><em>${practiceResult.wins[i]}%</em></div>`).join('')}</div><small class="di-note">${stale ? 'Your deck has changed since this test. ' : ''}Plain rules, ${PRACTICE_GAMES} practice games each, no skills, charms or mastery.</small>` : '';
  el.innerHTML = arch + `<button type="button" class="dk-tool-btn di-test" id="deckPractice" ${full && !practiceRunning ? '' : 'disabled'}>${practiceRunning ? 'Testing…' : full ? '🧪 Test your deck' : 'Fill your deck to test it'}</button>` + res;
  const b = document.getElementById('deckPractice'); if (b) b.addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); runPractice(); });
}
