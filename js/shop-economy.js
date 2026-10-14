/* ============================================================
   RELEASE + PACKS (Embers economy)
   ============================================================ */
// How many copies of a card are genuinely spare: never the last one, never one the deck is using.
/* ---------- Workshop: Refine and Trade up ----------
   Refine  : 2 copies of a plain card become 1 stronger version (+1 power or +1 health you choose), sometimes with a skill.
   Trade up: 3 cards of one rarity become 1 random card of the next rarity, sometimes with a skill.
   Nothing costs Embers; the cards are the price. Skills come from a small pool because simulation showed that
   Flicker and Haze hand out too much power for free (see the notes with the game).
   Build 261: a craft earns XP (bumpStat 'crafts', 'craftSkills'), and it can FAIL (refineFail / tradeFail): the cards are used up
   and turn into Embers instead. Every fail in a row fills the fail meter (state.progress.craftMeter, up to meterMax), and each
   step raises what a fail pays (meterStep); a success empties it. A companion with the 'craft' perk (js/afterdark-companion-cards.js,
   cards whose first keyword is seed) halves the fail chance, adds half again to the XP and the skill chance, and gives the new
   card a perkFoilChance of coming out Reborn. A fail never happens when losing the cards would break the full-deck promise. */
const CRAFT = {
  skills: ['guard', 'mend', 'bloom', 'echo', 'thorns', 'drain'],
  refineSkillChance: 0.30,
  tradeSkillChance: 0.40,
  tradeCount: 3,
  refineFail: 0.15, tradeFail: 0.20,      // the chance a craft cracks
  meterMax: 4, meterStep: 0.5,            // a fail pays the base x (1 + meterStep x the meter after it): x1.5 up to x3
  failBase: 2, failMin: 4,                // base = failBase x the cards' release value, never under failMin
  perkFailMul: 0.5, perkSkillMul: 1.5, perkXpMul: 0.5, perkFoilChance: 0.06
};
const craftHelped = () => typeof hasPerk === 'function' && hasPerk('craft');
function craftFailChance(kind) { const base = kind === 'trade' ? CRAFT.tradeFail : CRAFT.refineFail; return craftHelped() ? base * CRAFT.perkFailMul : base; }
function craftSkillChance(kind) { const base = kind === 'trade' ? CRAFT.tradeSkillChance : CRAFT.refineSkillChance; return Math.min(0.9, craftHelped() ? base * CRAFT.perkSkillMul : base); }
function craftMeter() { return Math.max(0, Math.min(CRAFT.meterMax, state.progress.craftMeter || 0)); }
function craftFailMultiplier(meterAfter) { return 1 + CRAFT.meterStep * meterAfter; }
// What a fail made of these cards pays at the given meter (after the fail is counted).
function craftFailPayout(removed, meterAfter) {
  const value = Object.keys(removed).reduce((n, id) => { const d = cardDef(id); return n + removed[id] * ((d && RELEASE_VALUE[d.rarity]) || 1); }, 0);
  return Math.round(Math.max(CRAFT.failMin, CRAFT.failBase * value) * craftFailMultiplier(meterAfter));
}
// The craft cracked: the cards are gone, Embers instead, and the meter goes up.
function craftFail(kind, removed) {
  Object.keys(removed).forEach(id => removeCopies(id, removed[id]));
  const meter = Math.min(CRAFT.meterMax, craftMeter() + 1), pay = craftFailPayout(removed, meter);
  state.progress.craftMeter = meter;
  repairDeckAfterCraft(null);
  addPebbles(pay, 'craft-fail');
  bumpStat('craftFails', 1);
  if (meter >= CRAFT.meterMax) bumpStat('craftMeterFull', 1);
  logEvent('💥', `A ${kind === 'trade' ? 'trade-up' : 'refine'} cracked and crumbled into ${pay} ${currencyName(pay)}.`);
  toast(`💥 The craft cracked! The cards crumble into 🫧 ${pay} ${currencyName(pay)} · fail meter ${meter}/${CRAFT.meterMax}${meter < CRAFT.meterMax ? `, next fail pays x${craftFailMultiplier(meter + 1)}` : ' (full)'}`);
  sfx('tie'); buzz(HAP.soft);
  updateHud(); checkAchievements();
  return { failed: true, pebbles: pay, meter };
}

function craftableSkills(id) {
  const d = cardDef(id);
  if (!d || d.spell || d.kw.length >= BattleEngine.MAX_KEYWORDS) return [];
  return CRAFT.skills.filter(k => !d.kw.includes(k));
}

function tradableCount(id) {   // copies not held by the deck
  return state.ownedCards.filter(c => c === id).length - state.deck.filter(c => c === id).length;
}

function nextRarity(rar) { const i = RARITY_ORDER.indexOf(rar); return (i >= 0 && i < RARITY_ORDER.indexOf(TRADE_TOP)) ? RARITY_ORDER[i + 1] : null; }   // nothing trades up into divine or atlas

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

function finishCraft(resultId, skill, heading, rng) {
  rng = rng || Math.random;
  state.progress.crafted += 1;
  if (skill) state.progress.skillsCrafted += 1;
  state.progress.craftMeter = 0;   // a success empties the fail meter
  // XP (build 261): through bumpStat like everything else, half again with a crafting companion
  const helped = craftHelped(), xp = XP_PER_STAT.crafts + (skill ? XP_PER_STAT.craftSkills : 0);
  bumpStat('crafts', 1); if (skill) bumpStat('craftSkills', 1);
  let bonus = 0;
  if (helped) { bonus = Math.round(xp * CRAFT.perkXpMul); addXP(bonus); bumpStat('craftsHelped', 1); }
  let reborn = false;
  if (helped && rng() < CRAFT.perkFoilChance) {   // a crafting companion's chance of a Reborn
    const f = foils(); f[resultId] = (f[resultId] || 0) + 1; reborn = true;
    bumpStat('foilsFound', 1); bumpStat('craftFoils', 1);
  }
  saveState();
  updateHud();
  bumpPill('pillCards');
  const def = cardDef(resultId);
  const note = [skill ? `✨ It gained a skill: ${KW[skill].icon} ${KW[skill].name}!` : '', reborn ? '🌟 It came out Reborn!' : ''].filter(Boolean).join(' ');
  logEvent(def.icon, `Crafted ${def.name}${skill ? ` with ${KW[skill].name}` : ''}${reborn ? ' (Reborn)' : ''}.`);
  showCardReveal(resultId, heading, true, note, xp + bonus);
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
  if (rng() < craftFailChance('refine') && keepsFullDeck({ [id]: 2 }, [])) return craftFail('refine', { [id]: 2 });
  let skills = craftableSkills(id);
  let skill = (skills.length && rng() < craftSkillChance('refine')) ? skills[Math.floor(rng() * skills.length)] : '';
  let resultId = BattleEngine.variantId(id, stat, skill);
  if (!cardDef(resultId)) return false;
  // the gate above was checked without the skill; if the skilled version would somehow break the deck rule, hand out the plain one
  if (!keepsFullDeck({ [id]: 2 }, [resultId])) { skill = ''; resultId = BattleEngine.variantId(id, stat, ''); }
  removeCopies(id, 2);
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat([id])));
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  const deckChanged = repairDeckAfterCraft(resultId);
  finishCraft(resultId, skill, 'Refined!', rng);
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
  if (rng() < craftFailChance('trade') && keepsFullDeck(need, [])) return craftFail('trade', need);
  const base = pool[Math.floor(rng() * pool.length)].id;
  const skills = craftableSkills(base);
  const skill = (skills.length && rng() < craftSkillChance('trade')) ? skills[Math.floor(rng() * skills.length)] : '';
  const resultId = skill ? BattleEngine.variantId(base, '', skill) : base;
  Object.keys(need).forEach(id => removeCopies(id, need[id]));
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat(picks.map(BattleEngine.baseIdOf))));
  const isNew = !discoveredSet().has(base);
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  finishCraft(resultId, skill, 'Traded up!', rng);
  if (isNew) toast('📖 New entry in your Index');
  return { id: resultId, skill, base, isNew };
}

