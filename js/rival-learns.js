/* ============================================================
   ROOK LEARNS (build 228)
   The rival used to rebuild a random deck between duels. Now Rook watches how you play. After every duel (not a yield) Rook studies the deck you brought
   (state.progress.rival.study: a running average over your recent duels, newest counting most):
     avgCost   how expensive your cards are        guards   how many Watch cards you run        swifts   fast cards (Flicker, Startle)
     spells    spells in your deck                  fam      the family you lean on most
   and next time swaps up to three cards of the deck he was going to bring for counters:
     you lean on Watch cards (3+)      -> spells, because a spell is not stopped by Watch
     you are cheap and fast            -> Watch / shield cards to blunt a rush
     you are top-heavy (avg cost 3.2+) -> cheap, hard-hitting cards to punish a slow start
     you carry many spells (3+)        -> shield cards, which soak a spell
   Counters are picked only from rarities his current chapter allows, one or two per theme, and the deck keeps its size and its spell cap, so he is
   smarter, not stronger on paper. He says what he noticed on the versus card and in his greeting. Everything is saved in state.progress.rival.study.
   ============================================================ */
const ROOK_LEARN = { swaps: 3, spellCap: 4, theme: 2, guards: 3, swifts: 3, cheap: 2.4, heavy: 3.2, spells: 3 };
function rookStudy() { const rv = rivalState(); if (!rv.study || typeof rv.study !== 'object') rv.study = { duels: 0, avgCost: 0, guards: 0, swifts: 0, spells: 0, fam: null }; return rv.study; }
function rookStudyFrom(deck) {
  const defs = (deck || []).map(id => BattleEngine.defOf(id)).filter(Boolean), n = defs.length || 1, fam = {};
  defs.forEach(d => { const f = CARD_FAMILY[BattleEngine.baseIdOf(d.id)]; if (f) fam[f] = (fam[f] || 0) + 1; });
  const top = Object.keys(fam).sort((a, b) => fam[b] - fam[a])[0] || null;
  return {
    avgCost: defs.reduce((s, d) => s + d.cost, 0) / n,
    guards: defs.filter(d => d.kw && d.kw.includes('guard')).length,
    swifts: defs.filter(d => d.kw && (d.kw.includes('swift') || d.kw.includes('startle'))).length,
    spells: defs.filter(d => d.spell).length,
    fam: top
  };
}
// Fold a duel's deck into the running study (new duels count half, so a change of style shows within a duel or two).
function rookNoteDuel(deck) {
  const s = rookStudy(), d = rookStudyFrom(deck), w = s.duels ? 0.5 : 1;
  ['avgCost', 'guards', 'swifts', 'spells'].forEach(k => { s[k] = s[k] * (1 - w) + d[k] * w; });
  s.fam = d.fam || s.fam; s.duels++; if (typeof teleInc === 'function') teleInc('rook.duels'); saveState();
}
// Which themes of counter would this study call for? A list of { id, why }.
function rookThemes(s) {
  const out = [];
  if (!s || !s.duels) return out;
  if (s.guards >= ROOK_LEARN.guards) out.push({ id: 'spells', why: 'You lean on Watch cards, so he brought spells.', say: 'I noticed you lean on Watch cards, so I brought spells.' });
  if (s.swifts >= ROOK_LEARN.swifts || s.avgCost <= ROOK_LEARN.cheap) out.push({ id: 'blockers', why: 'You like to rush, so he brought Watch cards.', say: 'I noticed you like to rush, so I brought Watch cards.' });
  if (s.avgCost >= ROOK_LEARN.heavy) out.push({ id: 'rush', why: 'You build slowly, so he brought fast, hard-hitting cards.', say: 'I noticed you build slowly, so I brought fast, hard-hitting cards.' });
  if (s.spells >= ROOK_LEARN.spells) out.push({ id: 'shields', why: 'You carry plenty of spells, so he brought shields.', say: 'I noticed you carry plenty of spells, so I brought shields.' });
  return out;
}
function rookPool(theme, maxRarityIdx) {
  const ok = d => d && !d.foe && !d.exclusive && !d.crafted && RARITY_ORDER.indexOf(d.rarity) <= maxRarityIdx;
  const defs = CARD_POOL.filter(c => ok(c));
  if (theme === 'spells') return defs.filter(d => d.spell).map(d => d.id);
  if (theme === 'blockers') return defs.filter(d => !d.spell && d.kw.includes('guard') && d.cost <= 4).map(d => d.id);
  if (theme === 'rush') return defs.filter(d => !d.spell && d.cost <= 2 && d.power >= 2).map(d => d.id);
  if (theme === 'shields') return defs.filter(d => !d.spell && d.kw.includes('shield')).map(d => d.id);
  return [];
}
// Rook's deck for this duel: his usual one with up to ROOK_LEARN.swaps cards swapped for counters. Returns { deck, notes: [...] }.
function rookAdaptDeck(deck, chapter, study) {
  deck = deck.slice();
  const themes = rookThemes(study || rookStudy()), notes = [], maxR = Math.min(4, 1 + Math.ceil((chapter || 0) / 2));
  if (!themes.length) return { deck, notes };
  const defOf = id => BattleEngine.defOf(id);
  const spellCount = () => deck.filter(id => defOf(id) && defOf(id).spell).length;
  const worth = id => { const d = defOf(id); return d.spell ? 3 : d.power + d.grit + 2 * d.kw.length; };
  let swaps = 0;
  themes.forEach(t => {
    const pool = shuffledArr(rookPool(t.id, maxR)).filter(id => !deck.includes(id));
    let used = 0;
    for (const id of pool) {
      if (swaps >= ROOK_LEARN.swaps || used >= ROOK_LEARN.theme) break;
      if (defOf(id).spell && spellCount() >= ROOK_LEARN.spellCap) continue;
      // replace his weakest card that is not already one of this theme's counters
      const idx = deck.map((c, i) => i).filter(i => !rookPool(t.id, 6).includes(deck[i])).sort((a, b) => worth(deck[a]) - worth(deck[b]))[0];
      if (idx == null) break;
      deck[idx] = id; swaps++; used++;
    }
    if (used) notes.push(t.why);
  });
  return { deck, notes };
}
// A sentence for Rook's greeting that shows he has been paying attention, or ''.
function rookTalkHint() {
  const s = rookStudy(); if (!s.duels) return '';
  const t = rookThemes(s)[0];
  return t ? ' ' + t.say : '';
}
