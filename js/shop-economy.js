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
  perkFailMul: 0.5, perkSkillMul: 1.5, perkXpMul: 0.5, perkFoilChance: 0.06,
  // By the rarity of the cards going in (build 264): the commoner the card, the likelier a skill and the rarer a crack.
  // Each multiplies the base chances above (so an ultra is the base, a common gets 1.35x the skill and 0.4x the fails).
  raritySkill: { common: 1.35, rare: 1.1, ultra: 0.85, super: 0.6, mythic: 0.4 },
  rarityFail: { common: 0.4, rare: 0.7, ultra: 1, super: 1.4, mythic: 1.9 },
  // Hot streak (build 265): every craft that works heats the forge (a Flawless strike twice as much), a crack cools it right
  // down, and it cools one notch every heatCoolMs on its own. At heatMax the next craft is a Masterwork: it cannot crack,
  // its skill chance is doubled and it earns XP again on top. Then the forge starts cold.
  heatMax: 5, heatCoolMs: 10 * 60 * 1000, masterSkillMul: 2, masterXpMul: 1
};
// The forge (build 265, js/craft-forge.js): three hammer strikes, 2 points for a perfect one, 1 for a good one. The total picks
// the grade, which scales this craft's fail and skill chances. Skipping the forge counts as Rough (the plain chances).
const FORGE_GRADES = [
  { id: 'flawless', min: 6, label: 'Flawless', icon: '🌟', fail: 0.4, skill: 1.4 },
  { id: 'clean', min: 4, label: 'Clean', icon: '🔨', fail: 0.7, skill: 1.2 },
  { id: 'rough', min: 2, label: 'Rough', icon: '🪨', fail: 1, skill: 1 },
  { id: 'botched', min: 0, label: 'Botched', icon: '💢', fail: 1.3, skill: 0.85 }
];
function forgeGrade(points) { return FORGE_GRADES.find(g => points >= g.min); }
function forgeGradeById(id) { return FORGE_GRADES.find(g => g.id === id) || FORGE_GRADES[2]; }
function craftHeat() {
  const p = state.progress, cooled = Math.floor((Date.now() - (p.craftHeatAt || 0)) / CRAFT.heatCoolMs);
  return Math.max(0, Math.min(CRAFT.heatMax, (p.craftHeat || 0) - Math.max(0, cooled)));
}
function setCraftHeat(n) { state.progress.craftHeat = Math.max(0, Math.min(CRAFT.heatMax, n)); state.progress.craftHeatAt = Date.now(); }
const craftMasterReady = () => craftHeat() >= CRAFT.heatMax;
// This craft's real chances, after the rarity, the companion, the forge grade and a Masterwork.
function craftOdds(kind, rarity, grade) {
  const g = forgeGradeById(grade), master = craftMasterReady();
  return { master, grade: g.id,
    fail: master ? 0 : Math.min(0.9, craftFailChance(kind, rarity) * g.fail),
    skill: Math.min(0.9, craftSkillChance(kind, rarity) * g.skill * (master ? CRAFT.masterSkillMul : 1)) };
}
const CRAFT_RARITIES = ['common', 'rare', 'ultra', 'super', 'mythic'];
const craftHelped = () => typeof hasPerk === 'function' && hasPerk('craft');
// rarity: of the card being refined, or of the three going into a trade-up. Left out = the base chance (no rarity scaling).
function craftFailChance(kind, rarity) {
  const base = (kind === 'trade' ? CRAFT.tradeFail : CRAFT.refineFail) * ((rarity && CRAFT.rarityFail[rarity]) || 1);
  return Math.min(0.9, craftHelped() ? base * CRAFT.perkFailMul : base);
}
function craftSkillChance(kind, rarity) {
  const base = (kind === 'trade' ? CRAFT.tradeSkillChance : CRAFT.refineSkillChance) * ((rarity && CRAFT.raritySkill[rarity]) || 1);
  return Math.min(0.9, craftHelped() ? base * CRAFT.perkSkillMul : base);
}
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
  setCraftHeat(0);   // a crack cools the forge
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

function finishCraft(resultId, skill, heading, rng, odds) {
  rng = rng || Math.random; odds = odds || { master: false, grade: 'rough' };
  state.progress.crafted += 1;
  if (skill) state.progress.skillsCrafted += 1;
  state.progress.craftMeter = 0;   // a success empties the fail meter
  // the hot streak: a Masterwork spends it, anything else heats the forge (a Flawless strike twice)
  if (odds.master) setCraftHeat(0); else setCraftHeat(craftHeat() + (odds.grade === 'flawless' ? 2 : 1));
  if (odds.grade === 'flawless') bumpStat('forgeFlawless', 1);
  // XP (build 261): through bumpStat like everything else, half again with a crafting companion
  const helped = craftHelped(), xp = XP_PER_STAT.crafts + (skill ? XP_PER_STAT.craftSkills : 0);
  bumpStat('crafts', 1); if (skill) bumpStat('craftSkills', 1);
  let bonus = 0;
  if (helped) { bonus = Math.round(xp * CRAFT.perkXpMul); addXP(bonus); bumpStat('craftsHelped', 1); }
  if (odds.master) { const mx = Math.round(xp * CRAFT.masterXpMul); addXP(mx); bonus += mx; bumpStat('masterworks', 1); }
  let reborn = false;
  if (helped && rng() < CRAFT.perkFoilChance) {   // a crafting companion's chance of a Reborn
    const f = foils(); f[resultId] = (f[resultId] || 0) + 1; reborn = true;
    bumpStat('foilsFound', 1); bumpStat('craftFoils', 1);
  }
  saveState();
  updateHud();
  bumpPill('pillCards');
  const def = cardDef(resultId);
  const g = forgeGradeById(odds.grade), hot = craftHeat();
  const note = [odds.master ? '🔥 A Masterwork!' : '', skill ? `✨ It gained a skill: ${KW[skill].icon} ${KW[skill].name}!` : '', reborn ? '🌟 It came out Reborn!' : '',
    odds.grade !== 'rough' ? `${g.icon} ${g.label} forging.` : '', !odds.master ? (hot >= CRAFT.heatMax ? '🔥 The forge is white-hot: your next craft is a Masterwork.' : `🔥 Hot streak ${hot}/${CRAFT.heatMax}.`) : ''].filter(Boolean).join(' ');
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
// grade: the forge's grade for this craft (FORGE_GRADES id; left out = 'rough', the plain chances).
function refineCard(id, stat, rng, grade) {
  rng = rng || Math.random;
  if (refineBlockReason(id, stat)) return false;
  const odds = craftOdds('refine', cardDef(id).rarity, grade);
  if (rng() < odds.fail && keepsFullDeck({ [id]: 2 }, [])) return craftFail('refine', { [id]: 2 });
  let skills = craftableSkills(id);
  let skill = (skills.length && rng() < odds.skill) ? skills[Math.floor(rng() * skills.length)] : '';
  let resultId = BattleEngine.variantId(id, stat, skill);
  if (!cardDef(resultId)) return false;
  // the gate above was checked without the skill; if the skilled version would somehow break the deck rule, hand out the plain one
  if (!keepsFullDeck({ [id]: 2 }, [resultId])) { skill = ''; resultId = BattleEngine.variantId(id, stat, ''); }
  removeCopies(id, 2);
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat([id])));
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  const deckChanged = repairDeckAfterCraft(resultId);
  finishCraft(resultId, skill, odds.master ? 'Masterwork!' : 'Refined!', rng, odds);
  if (deckChanged) toast('🎴 Your deck was updated with the new card');
  return { id: resultId, skill, deckChanged, master: odds.master, grade: odds.grade };
}

// picks: three card ids of one rarity, taken from copies that are not in the deck.
function tradeUp(picks, rng, grade) {
  rng = rng || Math.random;
  if (tradeBlockReason(picks)) return false;
  const target = nextRarity(cardDef(picks[0]).rarity);
  const need = {};
  picks.forEach(id => { need[id] = (need[id] || 0) + 1; });
  const pool = cardPool(target);
  if (!pool.length) return false;
  const odds = craftOdds('trade', cardDef(picks[0]).rarity, grade);
  if (rng() < odds.fail && keepsFullDeck(need, [])) return craftFail('trade', need);
  const base = pool[Math.floor(rng() * pool.length)].id;
  const skills = craftableSkills(base);
  const skill = (skills.length && rng() < odds.skill) ? skills[Math.floor(rng() * skills.length)] : '';
  const resultId = skill ? BattleEngine.variantId(base, '', skill) : base;
  Object.keys(need).forEach(id => removeCopies(id, need[id]));
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat(picks.map(BattleEngine.baseIdOf))));
  const isNew = !discoveredSet().has(base);
  state.ownedCards.push(resultId);
  noteCardsFound(1);
  finishCraft(resultId, skill, odds.master ? 'Masterwork!' : 'Traded up!', rng, odds);
  if (isNew) toast('📖 New entry in your Index');
  return { id: resultId, skill, base, isNew, master: odds.master, grade: odds.grade };
}

