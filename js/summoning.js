/* ============================================================
   SUMMONING (the altar in the Dreamer's Cottage)
   The only way to earn the Divine and Atlas cards. A summon is plain data: a result card and a list of requirements, built from
   three kinds of check, so a later summon (the Hall of Spirits, Reborn cards) is one more entry in SUMMONS.
     beat   - the district's god has been beaten in battle at least once (state.progress.summons.beaten[district], set from btFinish)
     offer  - N spare cards of one family are given up. Offerings go through spareCount(), so a full 12-card deck is always still
              possible, and the cheapest spares are taken first so nothing precious is spent by accident.
     owns   - the player already owns these cards (the Atlas needs all four gods and consumes nothing).
   Unmet summons stay visible, marked 🔒, and tapping one says exactly what is missing. The Atlas row stays a "???" until the first
   god is home, which keeps its secret (the maybe rule).
   The Atlas is no longer a row on this list: it answers at the candles (see THE CANDLES below), when the four gods burn together.
   Saved: state.progress.summons = { beaten: { district: true }, done: { summonId: true } }.
   ============================================================ */
const SUMMON_OFFER = 3;
const SUMMONS = [
  { id: 'duermevela',  card: 'duermevela',  district: 'square', fam: 'stone', offer: SUMMON_OFFER },
  { id: 'murmullo',    card: 'murmullo',    district: 'market', fam: 'wind',  offer: SUMMON_OFFER },
  { id: 'marea-lenta', card: 'marea-lenta', district: 'harbor', fam: 'tide',  offer: SUMMON_OFFER },
  { id: 'ensueno',     card: 'ensueno',     district: 'garden', fam: 'grove', offer: SUMMON_OFFER },
  { id: 'the-atlas',   card: 'the-atlas',   owns: ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'], atlas: true }
];

function summonState() {
  const p = state.progress;
  if (!p.summons || typeof p.summons !== 'object') p.summons = { beaten: {}, done: {} };
  if (!p.summons.beaten) p.summons.beaten = {};
  if (!p.summons.done) p.summons.done = {};
  return p.summons;
}
function summonDef(id) { return SUMMONS.find(s => s.id === id); }
function noteGodBeaten(district) {
  if (!DISTRICTS[district]) return;
  const s = summonState();
  if (!s.beaten[district]) { s.beaten[district] = true; saveState(); }
}
function summonOwned(s) { return state.ownedCards.includes(s.card); }

// The spare cards an offering would take: this family only, cheapest rarity first, never a copy the deck needs.
function summonOffering(s) {
  if (!s.offer) return [];
  const picks = [];
  const ids = Object.keys(ownedCardCounts()).filter(id => CARD_FAMILY[id] === s.fam && !cardDef(id).spell && !cardDef(id).exclusive && spareCount(id) >= 1)
    .sort((a, b) => RELEASE_VALUE[cardDef(a).rarity] - RELEASE_VALUE[cardDef(b).rarity] || (a < b ? -1 : 1));
  ids.forEach(id => { for (let i = 0; i < spareCount(id) && picks.length < s.offer; i++) picks.push(id); });
  return picks;
}
// [{ ok, text }] for every requirement of a summon
function summonReqs(s) {
  const out = [];
  if (s.district) out.push({ ok: !!summonState().beaten[s.district], text: `Beat ${DISTRICTS[s.district].boss} in ${DISTRICTS[s.district].name}` });
  if (s.offer) { const have = summonOffering(s).length; out.push({ ok: have >= s.offer, text: `Offer ${s.offer} spare ${FAMILIES[s.fam].name} cards (you have ${have})` }); }
  (s.owns || []).forEach(id => out.push({ ok: state.ownedCards.includes(id), text: `Own ${cardDef(id).name}` }));
  return out;
}
function summonReady(s) { return !summonOwned(s) && summonReqs(s).every(r => r.ok); }

// Does the Atlas row show yet? Only once a god has been summoned.
function atlasRevealed() { return SUMMONS.some(s => !s.atlas && summonOwned(s)); }

function altarButtons() {
  return SUMMONS.filter(s => !s.atlas).map(s => {
    const d = cardDef(s.card);
    if (summonOwned(s)) return sceneBtn('summon:' + s.id, `✅ ${d.icon} ${d.name} · summoned`);
    return sceneBtn('summon:' + s.id, `${summonReady(s) ? '🕯️' : '🔒'} ${d.icon} ${d.name} · ${summonReady(s) ? 'ready' : `${summonReqs(s).filter(r => r.ok).length}/${summonReqs(s).length}`}`);
  }).join('') + sceneBtn('alt:open', `🔥 Light the candles${altarBurning().some(b => altarDone(b)) ? ' · ready' : ''}`) + sceneBtn('back', '← Step away');
}
function altarIntro() {
  return `A small altar of candles and folded paper sits in the corner. Spirits can be called here, if you bring what they ask for. ${SUMMONS.filter(s => !s.atlas && summonOwned(s)).length}/4 gods are home.`;
}

// A tap on a summon: perform it when ready, otherwise say what is missing. Returns the text for the scene.
function summonTap(id) {
  const s = summonDef(id); if (!s) return altarIntro();
  const d = cardDef(s.card);
  if (s.atlas && !atlasRevealed() && !summonOwned(s)) return 'The candles lean toward something you cannot see yet.';
  if (summonOwned(s)) return s.atlas ? 'The Atlas is with you. It was always going to be.' : `${d.name} is home. Their card waits in your collection.`;
  if (!summonReady(s)) return `${d.icon} ${d.name} is not ready.\n` + summonReqs(s).map(r => `${r.ok ? '✅' : '▫️'} ${r.text}`).join('\n');
  return summonDo(s);
}
function summonDo(s) {
  const offer = summonOffering(s);
  if (!summonReady(s) || offer.length < (s.offer || 0)) return 'Not yet.';
  offer.forEach(id => removeCopies(id, 1));          // spareCount() already guaranteed these were spare copies
  state.ownedCards.push(s.card);
  summonState().done[s.id] = true;
  noteCardsFound(1);
  bumpStat('summons', 1);
  const d = cardDef(s.card);
  logEvent(s.atlas ? '🗺️' : '🕯️', s.atlas ? 'Summoned the Atlas.' : `Summoned ${d.name}${offer.length ? `, offering ${offer.map(id => cardDef(id).name).join(', ')}` : ''}.`);
  saveState(); updateHud(); ensureAudio(); sfx('mythic'); buzz(HAP.big);
  showCardReveal(s.card, s.atlas ? 'The Atlas arrives' : 'Summoned', true, null, 0, { flip: true, isNew: true });
  checkAchievements();
  return s.atlas ? 'The candles all lean one way. Something very large has noticed you, and it is not unkind.' : `${d.name} answers the call.${offer.length ? ` You gave up ${offer.map(id => cardDef(id).name).join(', ')}.` : ''}`;
}

/* ============================================================
   THE CANDLES (build 174; its full-screen view is js/altar-screen.js): the altar's second half. Four candles, one per family. Feed a candle a spare card and its flame grows
   with the card's rarity; the tallest flames decide which spirit answers. The spirit is a real card of the leading family
   (the same rarity as the best card fed), and a Spirit Book remembers every one that has answered: 24 names, 17 families of
   mix (single flame, one leading and one following, two level, all four level).
     now    - the card arrives at once.
     1 hour - the candle burns on a pillar (two at a time, saved with its start time like the bakery oven) and pays +2 Embers a card.
     night  - 8 hours; with four or more cards the card comes one rarity higher (never above super).
   Only spare copies are ever fed (spareCount, so the deck is never touched). The four gods are never used up: put one on each
   candle, with nothing else, and the Atlas answers (summonDo, exactly as before). The draft on the altar is not saved; the
   pillars and the book are: state.progress.altar = { found: { key: true }, burning: [{ key, name, fam, tier, n, icons, start, ms, ember }] }.
   ============================================================ */
const ALTAR_FAMS = ['grove', 'stone', 'tide', 'wind'];
const ALTAR_PER_CANDLE = 3, ALTAR_TOTAL = 6, ALTAR_PILLARS = 2, ALTAR_TIER_CAP = 3;   // index into RARITY_ORDER: super
const ALTAR_PTS = { common: 1, rare: 2, ultra: 3, super: 4, mythic: 5 };
const ALTAR_PRE = { grove: 'Mossy', stone: 'Hollow', tide: 'Drifting', wind: 'Hushed' }, ALTAR_NOUN = { grove: 'Fawn', stone: 'Warden', tide: 'Heron', wind: 'Moth' };
const ALTAR_BURNS = [
  { id: 'now', label: 'Now', sub: 'no wait' },
  { id: 'hour', label: '1 hour', sub: '+2 Embers a card', ms: 3600000 },
  { id: 'night', label: 'Overnight', sub: '4+ cards: a rarity higher', ms: 8 * 3600000 }
];
const ALTAR_GODS = SUMMONS.filter(x => !x.atlas).map(x => x.card);
let altarDraft = null;
function altarDraftNow() { if (!altarDraft) altarDraft = { feed: { grove: [], stone: [], tide: [], wind: [] }, sel: 'grove', burn: 'now' }; return altarDraft; }
function altarState() {
  const p = state.progress;
  if (!p.altar || typeof p.altar !== 'object') p.altar = { found: {}, burning: [] };
  if (!p.altar.found || typeof p.altar.found !== 'object') p.altar.found = {};
  if (!Array.isArray(p.altar.burning)) p.altar.burning = [];
  return p.altar;
}
function altarBurning() { return altarState().burning; }
function altarDone(b) { return Date.now() - b.start >= b.ms; }
const altarIsGod = id => ALTAR_GODS.includes(id);
const altarFed = () => { const d = altarDraftNow(); return ALTAR_FAMS.flatMap(f => d.feed[f]); };
const altarFedCount = id => altarFed().filter(x => x === id).length;
function altarKeys() {
  const k = [];
  ALTAR_FAMS.forEach(a => { k.push(a + '-' + a); ALTAR_FAMS.forEach(b => { if (a !== b) k.push(a + '-' + b); }); });
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) k.push('twin:' + ALTAR_FAMS[i] + '-' + ALTAR_FAMS[j]);
  k.push('chorus'); return k;
}
function altarName(key) {
  if (key === 'chorus') return 'The Chorus';
  if (key.startsWith('twin:')) { const [a, b] = key.slice(5).split('-'); return `${FAMILIES[a].name}-${FAMILIES[b].name} Twin`; }
  const [a, b] = key.split('-'); return a === b ? `${ALTAR_PRE[a]} Echo` : `${ALTAR_PRE[a]} ${ALTAR_NOUN[b]}`;
}
// Spare cards of a family that can still be put on its candle: [{ id, left }], rarest last.
function altarSpares(fam) {
  return Object.keys(ownedCardCounts()).filter(id => CARD_FAMILY[id] === fam && !altarIsGod(id) && !cardDef(id).spell && !cardDef(id).exclusive && spareCount(id) - altarFedCount(id) > 0)
    .sort((a, b) => RELEASE_VALUE[cardDef(a).rarity] - RELEASE_VALUE[cardDef(b).rarity] || (a < b ? -1 : 1)).map(id => ({ id, left: spareCount(id) - altarFedCount(id) }));
}
// What the candles say right now: which flames burn, which spirit it would be, and whether it is the Atlas.
function altarRead() {
  const d = altarDraftNow(), ids = altarFed(), gods = ids.filter(altarIsGod), rest = ids.filter(id => !altarIsGod(id)), fuel = {};
  ALTAR_FAMS.forEach(f => { fuel[f] = d.feed[f].filter(id => !altarIsGod(id)).reduce((n, id) => n + (ALTAR_PTS[cardDef(id).rarity] || 1), 0); });
  const lit = ALTAR_FAMS.filter(f => fuel[f] > 0).sort((a, b) => fuel[b] - fuel[a] || ALTAR_FAMS.indexOf(a) - ALTAR_FAMS.indexOf(b));
  const out = { ids, rest, fuel, lit, key: null, atlas: false, mixed: false };
  if (gods.length) {
    if (gods.length === 4 && !rest.length && ALTAR_FAMS.every(f => d.feed[f].length === 1)) out.atlas = true; else out.mixed = true;
    return out;
  }
  if (!lit.length) return out;
  if (lit.length === 4 && fuel[lit[0]] === fuel[lit[3]]) out.key = 'chorus';
  else if (lit.length === 1) out.key = lit[0] + '-' + lit[0];
  else if (fuel[lit[0]] === fuel[lit[1]]) out.key = 'twin:' + [lit[0], lit[1]].sort((a, b) => ALTAR_FAMS.indexOf(a) - ALTAR_FAMS.indexOf(b)).join('-');
  else out.key = lit[0] + '-' + lit[1];
  return out;
}
function altarAdd(id) {
  const d = altarDraftNow(), def = cardDef(id), fam = CARD_FAMILY[id]; if (!def || !fam) return 'Nothing happens.';
  if (altarIsGod(id)) { if (!state.ownedCards.includes(id) || altarFedCount(id)) return 'That god is already on a candle.'; }
  else if (spareCount(id) - altarFedCount(id) < 1) return 'That card is not spare.';
  if (d.feed[fam].length >= ALTAR_PER_CANDLE) return `The ${FAMILIES[fam].name} candle cannot hold more.`;
  if (altarFed().length >= ALTAR_TOTAL) return 'The altar is full. Take something back first.';
  d.feed[fam].push(id); sfx('tap'); buzz(HAP.tap); return '';
}
function altarTier(rest) {
  let t = 0; rest.forEach(id => { t = Math.max(t, RARITY_ORDER.indexOf(cardDef(id).rarity)); });
  return Math.min(t, ALTAR_TIER_CAP);
}
// A card of the leading family at the given rarity (a rarity with no card in that family steps down). Cards you do not own yet come up three times as often.
function altarPickCard(fam, tierIdx) {
  for (let i = tierIdx; i >= 0; i--) {
    const pool = CARD_POOL.filter(c => c.rarity === RARITY_ORDER[i] && !c.exclusive && !c.spell && CARD_FAMILY[c.id] === fam);
    if (!pool.length) continue;
    const w = pool.map(c => (state.ownedCards.includes(c.id) ? 1 : 3) * (inSeason(c.id) ? 2 : 1)), total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total; for (let j = 0; j < pool.length; j++) { r -= w[j]; if (r <= 0) return pool[j].id; }
    return pool[pool.length - 1].id;
  }
  return randomCardId('common');
}
function altarGrant(sp) {
  const st = altarState(), cardId = altarPickCard(sp.fam, sp.tier), isNew = !state.ownedCards.includes(cardId), first = !st.found[sp.key], d = cardDef(cardId);
  state.ownedCards.push(cardId); noteCardsFound(1); st.found[sp.key] = true;
  if (first) { addPebbles(6, 'altar'); addXP(20); }
  if (sp.ember) addPebbles(sp.ember, 'altar');
  bumpStat('echoes', 1);
  logEvent('🕯️', `${sp.name} answered the candles${first ? ' for the first time' : ''}: ${d.name}.`);
  saveState(); updateHud(); ensureAudio(); sfx('claim'); buzz(HAP.big);
  showCardReveal(cardId, `${sp.name} answers`, true, first ? 'A new page in your Spirit Book. 6 Embers for the find.' : 'You have met before.', 0, { flip: true, isNew });
  return `${sp.name} answers the candles. ${d.name} is yours.${first ? ' New in your Spirit Book.' : ''}`;
}
function altarGo() {
  const r = altarRead(), d = altarDraftNow(), st = altarState();
  if (r.atlas) { ALTAR_FAMS.forEach(f => { d.feed[f] = []; }); return summonTap('the-atlas'); }
  if (r.mixed) return 'The gods do not burn. Give each of them a candle of their own, with nothing else on the altar.';
  if (!r.key) return 'The candles are cold. Feed one a card.';
  const need = {}; r.rest.forEach(id => { need[id] = (need[id] || 0) + 1; });
  if (!r.rest.length || Object.keys(need).some(id => spareCount(id) < need[id])) return 'Something has changed in your collection. Start again.';
  const burn = ALTAR_BURNS.find(b => b.id === d.burn) || ALTAR_BURNS[0];
  if (burn.ms && st.burning.length >= ALTAR_PILLARS) return 'Both pillars are already burning. Collect one first.';
  const tied = r.lit.filter(f => r.fuel[f] === r.fuel[r.lit[0]]), fam = (r.key === 'chorus' || r.key.startsWith('twin:')) ? tied[Math.floor(Math.random() * tied.length)] : r.lit[0];
  let tier = altarTier(r.rest); if (burn.id === 'night' && r.rest.length >= 4) tier = Math.min(ALTAR_TIER_CAP, tier + 1);
  const sp = { key: r.key, name: altarName(r.key), fam, tier, n: r.rest.length, icons: r.rest.map(id => cardDef(id).icon), ember: burn.id === 'hour' ? 2 * r.rest.length : 0 };
  r.rest.forEach(id => removeCopies(id, 1));
  ALTAR_FAMS.forEach(f => { d.feed[f] = []; });
  if (burn.ms) { st.burning.push(Object.assign(sp, { start: Date.now(), ms: burn.ms })); saveState(); sfx('claim'); return `The pillar is lit. ${burn.id === 'hour' ? 'Come back in an hour.' : 'Leave it burning overnight.'}`; }
  return altarGrant(sp);
}
function altarCollect(i) {
  const st = altarState(), b = st.burning[i]; if (!b) return '';
  if (!altarDone(b)) return 'It is still burning.';
  st.burning.splice(i, 1); return altarGrant(b);
}
function altarLeft(b) { const m = Math.max(0, Math.ceil((b.ms - (Date.now() - b.start)) / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`; }
function altarSmoke(r) {
  if (r.atlas) return '🗺️ Four gods, four flames. Something enormous is listening.';
  if (r.mixed) return '✨ The gods do not burn. They want a candle each, and nothing else.';
  if (!r.key) return ALTAR_GODS.every(g => state.ownedCards.includes(g)) && !state.ownedCards.includes('the-atlas') ? 'The candles lean toward something you cannot see yet.' : 'The candles are cold. Pick a family and feed it a spare card.';
  const isNew = !altarState().found[r.key], tag = isNew ? '🆕 ' : '';
  if (r.key === 'chorus') return tag + 'All four flames stand level.';
  if (r.key.startsWith('twin:')) return tag + 'Two flames burn level.';
  if (r.lit.length === 1) return `${tag}A pure ${FAMILIES[r.lit[0]].name} flame.`;
  return `${tag}${FAMILIES[r.lit[0]].name} leads, ${FAMILIES[r.lit[1]].name} follows.`;
}
