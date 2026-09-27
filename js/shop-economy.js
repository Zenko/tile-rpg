/* ============================================================
   RELEASE + PACKS (Pebbles economy)
   ============================================================ */
// How many copies of a card are genuinely spare: never the last one, never one the deck is using.
/* ---------- Workshop: Refine and Trade up ----------
   Refine  : 2 copies of a plain card become 1 stronger version (+1 power or +1 health you choose), sometimes with a skill.
   Trade up: 3 cards of one rarity become 1 random card of the next rarity, sometimes with a skill.
   Nothing costs Pebbles; the cards are the price. Skills come from a small pool because simulation showed that
   Swift and Shield hand out too much power for free (see the notes with the game). */
const CRAFT = {
  skills: ['guard', 'mend', 'bloom', 'echo', 'thorns', 'drain'],
  refineSkillChance: 0.30,
  tradeSkillChance: 0.40,
  tradeCount: 3
};

function craftableSkills(id) {
  const d = cardDef(id);
  if (!d || d.spell || d.kw.length >= BattleEngine.MAX_KEYWORDS) return [];
  return CRAFT.skills.filter(k => !d.kw.includes(k));
}

function tradableCount(id) {   // copies not held by the deck
  return state.ownedCards.filter(c => c === id).length - state.deck.filter(c => c === id).length;
}

function nextRarity(rar) { const i = RARITY_ORDER.indexOf(rar); return (i >= 0 && i < RARITY_ORDER.length - 1) ? RARITY_ORDER[i + 1] : null; }

function removeCopies(id, n) {
  for (let i = 0; i < n; i++) {
    const idx = state.ownedCards.indexOf(id);
    if (idx < 0) return false;
    state.ownedCards.splice(idx, 1);
  }
  return true;
}

// Keeps the deck valid after cards were used up: drops slots that are no longer backed by a card,
// puts the new card in a freed slot, then tops the deck back up so the person can still battle.
function repairDeckAfterCraft(newId) {
  const counts = ownedCardCounts(), used = {}, kept = [];
  let freed = 0;
  state.deck.forEach(id => {
    used[id] = (used[id] || 0) + 1;
    if (used[id] <= Math.min(counts[id] || 0, MAX_COPIES)) kept.push(id); else freed++;
  });
  if (freed > 0) {
    if (newId && (used[newId] || 0) < Math.min(counts[newId] || 0, MAX_COPIES)) kept.push(newId);
    state.deck = deckSlots() >= DECK_SIZE ? BattleEngine.suggestDeck(counts, kept) : kept;
  }
  return freed > 0;
}

function finishCraft(resultId, skill, heading) {
  state.progress.crafted += 1;
  if (skill) state.progress.skillsCrafted += 1;
  saveState();
  updateHud();
  bumpPill('pillCards');
  const def = cardDef(resultId);
  const note = skill ? `✨ It gained a skill: ${KW[skill].icon} ${KW[skill].name}!` : '';
  logEvent(def.icon, `Crafted ${def.name}${skill ? ` with ${KW[skill].name}` : ''}.`);
  showCardReveal(resultId, heading, true, note);
  if (skill) { sfx('mythic'); buzz(HAP.big); }
  checkAchievements();
}

// Crafting turns several cards into one, so it must never leave someone unable to build a full deck.
// Same promise the release system makes: if you can battle now, you can still battle afterwards.
function slotsAfter(removed, added) {
  const c = ownedCardCounts();
  Object.keys(removed).forEach(id => { c[id] = (c[id] || 0) - removed[id]; });
  added.forEach(id => { c[id] = (c[id] || 0) + 1; });
  return Object.keys(c).reduce((n, id) => n + Math.min(Math.max(c[id], 0), MAX_COPIES), 0);
}
function keepsFullDeck(removed, added) { return deckSlots() < DECK_SIZE || slotsAfter(removed, added) >= DECK_SIZE; }

// '' when the craft is allowed, otherwise a short reason to show the person.
function refineBlockReason(id, stat) {
  const def = cardDef(id);
  if (!def) return 'Unknown card';
  if (def.spell) return 'Spells cannot be refined';
  if (def.crafted) return 'Already crafted';
  if (stat !== 'p' && stat !== 'g') return 'Pick power or health';
  if (state.ownedCards.filter(c => c === id).length < 2) return 'Needs 2 copies';
  if (!keepsFullDeck({ [id]: 2 }, [BattleEngine.variantId(id, stat, '')])) return 'Needs one more spare card, so your deck can stay at ' + DECK_SIZE;
  return '';
}
function tradeBlockReason(picks) {
  if (!Array.isArray(picks) || picks.length !== CRAFT.tradeCount) return 'Pick ' + CRAFT.tradeCount + ' cards';
  const defs = picks.map(cardDef);
  if (defs.some(d => !d)) return 'Unknown card';
  if (defs.some(d => d.rarity !== defs[0].rarity)) return 'All cards must share a rarity';
  if (!nextRarity(defs[0].rarity)) return 'Nothing rarer than mythic';
  const need = {};
  picks.forEach(id => { need[id] = (need[id] || 0) + 1; });
  if (Object.keys(need).some(id => tradableCount(id) < need[id])) return 'Cards in your deck are never used';
  if (!keepsFullDeck(need, [])) return 'Needs more spare cards, so your deck can stay at ' + DECK_SIZE;
  return '';
}

// stat: 'p' (+1 power) or 'g' (+1 health). rng is injectable so tests can prove the odds.
function refineCard(id, stat, rng) {
  rng = rng || Math.random;
  if (refineBlockReason(id, stat)) return false;
  let skills = craftableSkills(id);
  let skill = (skills.length && rng() < CRAFT.refineSkillChance) ? skills[Math.floor(rng() * skills.length)] : '';
  let resultId = BattleEngine.variantId(id, stat, skill);
  if (!cardDef(resultId)) return false;
  // the gate above was checked without the skill; if the skilled version would somehow break the deck rule, hand out the plain one
  if (!keepsFullDeck({ [id]: 2 }, [resultId])) { skill = ''; resultId = BattleEngine.variantId(id, stat, ''); }
  removeCopies(id, 2);
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat([id])));
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  const deckChanged = repairDeckAfterCraft(resultId);
  finishCraft(resultId, skill, 'Refined!');
  if (deckChanged) toast('🎴 Your deck was updated with the new card');
  return { id: resultId, skill, deckChanged };
}

// picks: three card ids of one rarity, taken from copies that are not in the deck.
function tradeUp(picks, rng) {
  rng = rng || Math.random;
  if (tradeBlockReason(picks)) return false;
  const target = nextRarity(cardDef(picks[0]).rarity);
  const need = {};
  picks.forEach(id => { need[id] = (need[id] || 0) + 1; });
  const pool = cardPool(target);
  if (!pool.length) return false;
  const base = pool[Math.floor(rng() * pool.length)].id;
  const skills = craftableSkills(base);
  const skill = (skills.length && rng() < CRAFT.tradeSkillChance) ? skills[Math.floor(rng() * skills.length)] : '';
  const resultId = skill ? BattleEngine.variantId(base, '', skill) : base;
  Object.keys(need).forEach(id => removeCopies(id, need[id]));
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat(picks.map(BattleEngine.baseIdOf))));
  const isNew = !discoveredSet().has(base);
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  finishCraft(resultId, skill, 'Traded up!');
  if (isNew) toast('📖 New entry in your Index');
  return { id: resultId, skill, base, isNew };
}

