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
  return SUMMONS.map(s => {
    const d = cardDef(s.card);
    if (s.atlas && !atlasRevealed() && !summonOwned(s)) return sceneBtn('summon:' + s.id, '❔ ??? · beyond the four');
    if (summonOwned(s)) return sceneBtn('summon:' + s.id, `✅ ${d.icon} ${d.name} · summoned`);
    return sceneBtn('summon:' + s.id, `${summonReady(s) ? '🕯️' : '🔒'} ${d.icon} ${d.name} · ${summonReady(s) ? 'ready' : `${summonReqs(s).filter(r => r.ok).length}/${summonReqs(s).length}`}`);
  }).join('') + sceneBtn('back', '← Step away');
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
