/* ============================================================
   THE WEEKLY SEALED LEAGUE (build 332)
   Every week each tester opens the same SEALED_PACKS packs of SEALED_PER_PACK cards (seeded by the week, BattleEngine.makeRng,
   so the pool is identical on every device without a server), builds a 12-card deck from that pool only, and plays
   SEALED_MATCHES league matches against the same five opponents, also from the week's seed. Every match counts once, won or
   lost; the deck can be rebuilt between matches. It plays on neutral ground like the Draft Run (playerDeck: your
   collection's perks stay home). Rewards: Embers per win (tapered like the Draft Run), a super-or-better card for 4+ wins.
   Your record joins your Who's Playing entry (pushPresence, js/cloud-save.js), so testers can see how the same pool went
   for everyone.
   At the fountain (the cup scene's 'sealed' mode, wired in js/houses-and-cellar.js); the builder is #sealedOverlay.
   Saved: state.progress.sealed = { wk, deck: [pool indices], results: [true / false], paid }.
   ============================================================ */
const SEALED_PACKS = 6, SEALED_PER_PACK = 5, SEALED_MATCHES = 5, SEALED_SPELLS = 3, SEALED_WIN_EMBERS = 8;
const SEALED_RARITY_W = { common: 54, rare: 28, ultra: 12, super: 5, mythic: 1 };
const SEALED_FOES = [
  { level: 'gentle', spirit: 15, tier: 1 }, { level: 'normal', spirit: 16, tier: 1 }, { level: 'normal', spirit: 17, tier: 2 },
  { level: 'smart', spirit: 18, tier: 2 }, { level: 'smart', spirit: 20, tier: 3 }
];

function sealedState() {
  const p = state.progress, wk = weekKey();
  if (!p.sealed || typeof p.sealed !== 'object' || p.sealed.wk !== wk) p.sealed = { wk, deck: [], results: [], paid: false };
  if (!Array.isArray(p.sealed.deck)) p.sealed.deck = [];
  if (!Array.isArray(p.sealed.results)) p.sealed.results = [];
  return p.sealed;
}
// The week's pool: the same 30 cards for everyone (CARD_POOL order and the week's seed decide it).
function sealedPool(wk) {
  const rng = BattleEngine.makeRng('sealed-' + (wk || weekKey())), out = [];
  const byRar = r => CARD_POOL.filter(c => c.rarity === r && !c.exclusive && !c.foe && !c.token);
  const rars = Object.keys(SEALED_RARITY_W), tot = rars.reduce((n, r) => n + SEALED_RARITY_W[r], 0);
  for (let p = 0; p < SEALED_PACKS; p++) for (let k = 0; k < SEALED_PER_PACK; k++) {
    let x = rng() * tot, rar = 'common';
    for (const r of rars) { x -= SEALED_RARITY_W[r]; if (x <= 0) { rar = r; break; } }
    if (k === SEALED_PER_PACK - 1 && rar === 'common') rar = 'rare';   // every pack's last card is rare or better
    const pool = byRar(rar); out.push(pool[Math.floor(rng() * pool.length)].id);
  }
  return out;
}
function sealedFoes(wk) {
  const rng = BattleEngine.makeRng('sealed-foes-' + (wk || weekKey()));
  const all = Object.values(NPC_POOLS).flatMap(pl => pl.names.map((n, i) => ({ name: n, icon: pl.icons[i % pl.icons.length] })));
  const picks = []; while (picks.length < SEALED_MATCHES && all.length) picks.push(all.splice(Math.floor(rng() * all.length), 1)[0]);
  return picks.map((f, i) => Object.assign({}, f, SEALED_FOES[i]));
}
function sealedDeckIds() { const s = sealedState(), pool = sealedPool(s.wk); return s.deck.map(i => pool[i]).filter(Boolean); }
function sealedDeckReady() { const ids = sealedDeckIds(); return ids.length === DECK_SIZE && ids.filter(id => cardDef(id).spell).length <= SEALED_SPELLS; }
function sealedWins() { return sealedState().results.filter(Boolean).length; }
function sealedRecordText() { const s = sealedState(); return `${sealedWins()}–${s.results.length - sealedWins()}`; }

/* ---------- the fountain ---------- */
function sealedIntro() {
  const s = sealedState(), n = s.results.length;
  if (n >= SEALED_MATCHES) return words('sealed.done', { record: sealedRecordText() });
  if (!sealedDeckReady()) return words('sealed.intro', { packs: SEALED_PACKS, n: SEALED_MATCHES });
  const f = sealedFoes(s.wk)[n];
  return words('sealed.next', { i: n + 1, of: SEALED_MATCHES, foe: `${f.icon} ${f.name}`, record: sealedRecordText() });
}
function sealedButtons() {
  const s = sealedState(), n = s.results.length, back = sceneBtn('sealed-back', words('sealed.back'));
  if (featureLocked('sealed')) return sceneBtn('sealed-none', `🔒 ${featureLockText('sealed')}`, true) + back;
  const build = sceneBtn('sealed-build', sealedDeckReady() ? words('sealed.rebuild') : words('sealed.build'));
  if (n >= SEALED_MATCHES) return sceneBtn('sealed-none', words('sealed.finished', { record: sealedRecordText() }), true) + back;
  if (!sealedDeckReady()) return build + back;
  const f = sealedFoes(s.wk)[n];
  return sceneBtn('sealed-play', words('sealed.play', { i: n + 1, foe: `${f.icon} ${f.name}` })) + build + back;
}
function sealedAction(act) {
  const s = sealedState();
  if (act === 'sealed') { scene.mode = 'sealed'; scene.text = sealedIntro(); sfx('tap'); showTipOnce('sealed'); renderScene(); return; }
  if (act === 'sealed-back') { scene.mode = null; scene.text = cupIntro(); sfx('nav'); renderScene(); return; }
  if (act === 'sealed-build') { if (featureLocked('sealed')) return; sealedOpen(); return; }
  if (act === 'sealed-play' && sealedDeckReady() && s.results.length < SEALED_MATCHES) {
    const i = s.results.length, f = sealedFoes(s.wk)[i];
    startBattle({ id: 'sealed-' + i, name: f.name, icon: f.icon, deck: buildDeckForOpponent(DECK_SIZE, i === SEALED_MATCHES - 1, f.tier, f.name, null, DRAFT_FOE_WINS),
      profile: { level: f.level, spirit: f.spirit }, isBoss: false, rewardCard: null, sealed: { match: i }, playerDeck: sealedDeckIds() });
  }
}

/* ---------- results (from btShowResult) ---------- */
function sealedResult(won) {
  const s = sealedState(), i = battle.npc.sealed.match;
  battle.rewarded = true;
  if (s.results.length === i) s.results.push(!!won);
  let extra = '';
  if (won) { bumpStat('sealedWins', 1); const peb = econTaper('sealed', SEALED_WIN_EMBERS, 40); addPebbles(peb, 'sealed'); extra = `<b>+${peb} 🫧</b> `; }
  const done = s.results.length >= SEALED_MATCHES;
  if (done && !s.paid) {
    s.paid = true; bumpStat('sealedLeagues', 1);
    if (sealedWins() >= 4) {
      const cid = randomCardId(sealedWins() === SEALED_MATCHES && Math.random() < 0.35 ? 'mythic' : 'super'), d = cardDef(cid);
      state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards');
      extra += words('sealed.prize', { card: `${cardArtHtml(d)} ${d.name}` });
    }
    logEvent('📦', words('sealed.log', { record: sealedRecordText() }));
  }
  saveState();
  if (typeof pushPresence === 'function') pushPresence();   // your league record for Who's Playing
  const icon = btGet('battleEndIcon'); icon.textContent = '📦'; icon.className = 'big-icon' + (won ? ' reveal-icon' : '');
  battleEndTitle.textContent = done ? words('sealed.endTitle', { record: sealedRecordText() }) : won ? words('sealed.winTitle') : words('sealed.lossTitle');
  battleEndStats.innerHTML = extra + escapeHtml(done ? words('sealed.endSub') : words('sealed.nextSub', { left: SEALED_MATCHES - s.results.length, record: sealedRecordText() }));
  btGet('battleRetryBtn').classList.add('hidden');
  if (won) { sparkleBurst(btGet('battleSparkles'), ['📦', '✨'], done ? 20 : 8); sfx('win'); buzz(HAP.win); } else { btGet('battleSparkles').innerHTML = ''; sfx('soft'); }
}
// For pushPresence: this week's record, or null before the first match.
function sealedPresence() { const s = sealedState(); return s.results.length ? { wk: s.wk, w: sealedWins(), l: s.results.length - sealedWins() } : null; }

/* ---------- the builder ---------- */
let sealedPick = null;   // the deck being edited (pool indices), saved on Done
function sealedOpen() {
  sealedPick = sealedState().deck.slice();
  btGet('sealedOverlay').classList.remove('hidden'); sfx('tap');
  sealedRender();
}
function sealedRender() {
  const pool = sealedPool(), picked = new Set(sealedPick), spells = sealedPick.filter(i => cardDef(pool[i]).spell).length;
  btGet('sealedCount').textContent = words('sealed.count', { n: sealedPick.length, of: DECK_SIZE, spells, max: SEALED_SPELLS });
  const order = pool.map((id, i) => i).sort((a, b) => cardDef(pool[a]).cost - cardDef(pool[b]).cost || (pool[a] < pool[b] ? -1 : 1));
  btGet('sealedPool').innerHTML = order.map(i => { const d = cardDef(pool[i]);
    return `<button type="button" class="sl-card rarity-${d.rarity}${picked.has(i) ? ' on' : ''}" data-i="${i}" aria-pressed="${picked.has(i)}" title="${escapeHtml(d.name)}">
      <span class="ac-cost">${d.cost}</span><span class="ac-icon">${cardArtHtml(d)}</span><span class="ac-power">${cardStatsText(d)}</span><span class="ac-name">${escapeHtml(d.name)}</span></button>`; }).join('');
  btGet('sealedDone').disabled = sealedPick.length !== DECK_SIZE || spells > SEALED_SPELLS;
  onAll(btGet('sealedPool'), '.sl-card', b => {
    const i = +b.dataset.i, k = sealedPick.indexOf(i);
    if (k >= 0) sealedPick.splice(k, 1);
    else if (sealedPick.length >= DECK_SIZE) { toast(words('sealed.full', { n: DECK_SIZE })); return; }
    else if (cardDef(pool[i]).spell && spells >= SEALED_SPELLS) { toast(words('sealed.tooManySpells', { n: SEALED_SPELLS })); return; }
    else sealedPick.push(i);
    sfx('flip'); sealedRender();
  });
}
// The quickest fair deck from the pool: the engine's own deck suggestion, limited to what the pool holds.
function sealedAuto() {
  const pool = sealedPool(), counts = {}; pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const ids = BattleEngine.suggestDeck(counts).slice(0, DECK_SIZE), used = new Set(); sealedPick = [];
  ids.forEach(id => { const i = pool.findIndex((x, k) => x === id && !used.has(k)); if (i >= 0) { used.add(i); sealedPick.push(i); } });
  for (let i = 0; sealedPick.length < DECK_SIZE && i < pool.length; i++) if (!used.has(i) && !cardDef(pool[i]).spell) { used.add(i); sealedPick.push(i); }
  sfx('tap'); sealedRender();
}
btGet('sealedAuto').addEventListener('click', sealedAuto);
btGet('sealedClose').addEventListener('click', () => { btGet('sealedOverlay').classList.add('hidden'); sealedPick = null; });
btGet('sealedDone').addEventListener('click', () => {
  sealedState().deck = sealedPick.slice(); saveState(); btGet('sealedOverlay').classList.add('hidden'); sealedPick = null; sfx('claim');
  if (inScene && scene && scene.id === 'cup') { scene.mode = 'sealed'; scene.text = sealedIntro(); renderScene(); }
});
