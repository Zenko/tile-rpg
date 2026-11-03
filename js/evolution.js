/* ============================================================
   CARD EVOLUTION AND LORE (build 332)
   Evolution. A creature played to ★★★ mastery (MASTERY_AT, js/afterdark-companion-cards.js) can evolve once: one copy
   becomes '<id>~e', the same card with EVOLVE_BONUS and a new name (EVOLVE_* in content/cards.js; defOf in
   js/data-and-engine.js builds it like a crafted card, so decks, deck codes, trades and the battle screen already know it).
   A spare copy is used first; if every copy is in the deck, the deck's copy evolves in place. "Once" is per card, kept in
   state.progress.evolved = { baseId: true }, so trading the evolved copy away does not let it evolve again.
   Lore. cardStory (js/progression.js) reads CARD_LORE (content/lore.js) before falling back to the rarity templates, and the
   card page names who in town tells it (LORE_VOICE). The card page (drawCardSheet, js/collection-tools.js) shows both.
   ============================================================ */
function evolvedState() { const p = state.progress; if (!p.evolved || typeof p.evolved !== 'object') p.evolved = {}; return p.evolved; }
function evolveBlock(id) {
  const d = cardDef(id);
  if (!d || d.spell || d.crafted || d.foe || d.token) return words('evolve.cannot');
  if (evolvedState()[id]) return words('evolve.done');
  if (!state.ownedCards.includes(id)) return words('evolve.notOwned');
  if (masteryRank(id) < MASTERY_AT.length) return words('evolve.needMastery', { stars: '★'.repeat(MASTERY_AT.length), have: masteryXp(id), need: MASTERY_AT[MASTERY_AT.length - 1] });
  return '';
}
function canEvolve(id) { return !evolveBlock(id); }
function evolveCard(id) {
  const why = evolveBlock(id); if (why) { toast(why); return null; }
  const to = id + '~e', d = cardDef(to); if (!d) return null;
  const i = state.ownedCards.indexOf(id); state.ownedCards[i] = to;
  if (state.ownedCards.filter(x => x === id).length < state.deck.filter(x => x === id).length) { const k = state.deck.indexOf(id); if (k >= 0) state.deck[k] = to; }   // that copy was in the deck
  evolvedState()[id] = true;
  bumpStat('evolutions', 1);
  logEvent('🌟', words('evolve.log', { from: cardDef(id).name, to: d.name }));
  saveState(); sfx('rare'); buzz(HAP.win);
  showCardReveal(to, words('evolve.heading'), false, cardStory(d), 0, { view: true });
  return to;
}
// The card page's lore block: the line, and who tells it.
function loreHtml(def) {
  const base = BattleEngine.baseIdOf(def.id), fam = def.spell ? 'spell' : CARD_FAMILY[base], role = LORE_VOICE[fam], who = role && CAST[role];
  return `<p class="cs-story"><span class="cs-lore-h">${words('lore.heading')}</span>${escapeHtml(cardStory(def))}${who && CARD_LORE[base] ? `<span class="cs-lore-who">${words('lore.voice', { name: who.name })}</span>` : ''}</p>`;
}
