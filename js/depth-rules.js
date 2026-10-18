/* ============================================================
   DEPTH (build 286): the second lap
   Once the four district bosses are down, each district can be taken again at Depth 1 to 5. A deeper fight is the same boss with a
   better deck (the rarity ladder climbs), more Calm and, from Depth 2, a rule that bends the match for both sides (a battle mod, like
   the weekly rule). This file is only the numbers and the deck recipe, with no DOM and no names players see (those are in
   content/world.js), so scripts/battle-report.js can load it in Node (server/load-engine.js) and measure it. The screen, the unlock and the
   rewards are in js/depth.js.
   ============================================================ */
const DEPTH_MAX = 5;
// How a Depth n opponent's cards are drawn: weights for [common, rare, ultra, super, mythic]. Depth 0 is a district boss as the game has always made one.
const DEPTH_RARITY = [
  [0.00, 0.29, 0.36, 0.35, 0.00],
  [0.05, 0.30, 0.40, 0.23, 0.02],
  [0.00, 0.20, 0.40, 0.37, 0.03],
  [0.00, 0.10, 0.37, 0.50, 0.03],
  [0.00, 0.05, 0.30, 0.60, 0.05],
  [0.00, 0.00, 0.25, 0.65, 0.10],
];
const DEPTH_ENHANCED = [0, 1, 1, 2, 3, 4], DEPTH_SKILL = [0, 0.3, 0.4, 0.5, 0.6, 0.7];
const DEPTH_SKILLS = ['guard', 'swift', 'shield', 'mend', 'thorns', 'drain', 'rally', 'echo', 'seed', 'sting', 'lull'];
// A boss's Calm at a Depth. Plain neighbours get a gentler version of the same climb.
function depthProfile(depth, isBoss) {
  const d = Math.max(0, Math.min(DEPTH_MAX, depth | 0));
  return { level: 'smart', spirit: (isBoss ? 20 : 18) + d * (isBoss ? 2 : 1) };
}
// The rule a district adds to the match, the same for both sides: one from Depth 2 and a second from Depth 4. The text players see is in content/world.js.
const DEPTH_MODS = {
  square: [{ guardHp: 1 }, { shieldHp: 1 }],
  market: [{ swiftBonus: 1 }, { echoBonus: 1 }],
  harbor: [{ mendBonus: 1 }, { drainBonus: 1 }],
  garden: [{ bloomStart: 1 }, { thornsBonus: 1 }],
};
function depthMods(district, depth) {
  const list = DEPTH_MODS[district] || [], out = {};
  list.forEach((m, i) => { if (depth >= 2 + i * 2) Object.assign(out, m); });
  return out;
}
// The deck for a Depth n boss: 12 cards from `pool` (card definitions, no spells needed), about half from the district's family, rarities by DEPTH_RARITY.
// `rnd` returns [0,1). BattleEngine.suggestDeck fills the cost curve exactly as it does for the player's own decks.
function depthDeck(pool, rnd, depth, family) {
  const w = DEPTH_RARITY[Math.max(0, Math.min(DEPTH_MAX, depth | 0))], ranks = ['common', 'rare', 'ultra', 'super', 'mythic'];
  const rarity = () => { let r = rnd(), i = 0; for (; i < w.length - 1; i++) { if (r < w[i]) break; r -= w[i]; } return ranks[i]; };
  const kin = id => BattleEngine.familyOf(id) === family;
  const counts = {};
  // A deck of only rares and better is clunky (nothing cheap to play on turns 1 and 2), so the first eight picks come from the cheap cards of any rarity
  // and the rest follow the weights.
  for (let i = 0; i < 36; i++) {
    const cheap = i < 8, rar = rarity(), wantFam = family && i % 2 === 0;
    let cand = pool.filter(c => !c.spell && (cheap ? c.cost <= 2 : c.rarity === rar) && (!wantFam || kin(c.id)));
    if (!cand.length) cand = pool.filter(c => !c.spell && (cheap ? c.cost <= 2 : c.rarity === rar));
    if (!cand.length) continue;
    const c = cand[Math.floor(rnd() * cand.length)]; counts[c.id] = (counts[c.id] || 0) + 1;
  }
  const deck = BattleEngine.suggestDeck(counts), d = Math.max(0, Math.min(DEPTH_MAX, depth | 0));
  // Crafted variants ("+" cards: +power or +health, sometimes with a keyword added): more of them the deeper you go.
  const free = deck.map((id, i) => i).filter(i => { const def = BattleEngine.defOf(deck[i]); return !def.spell && !def.foe; });
  for (let k = free.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [free[k], free[j]] = [free[j], free[k]]; }
  free.slice(0, DEPTH_ENHANCED[d]).forEach(i => {
    const base = BattleEngine.defOf(deck[i]), st = rnd() < 0.5 ? 'p' : 'g';
    let sk = '';
    if (rnd() < DEPTH_SKILL[d] && base.kw.length < BattleEngine.MAX_KEYWORDS) { const opts = DEPTH_SKILLS.filter(k => !base.kw.includes(k)); sk = opts[Math.floor(rnd() * opts.length)]; }
    let vid = BattleEngine.variantId(deck[i], st, sk);
    if (!BattleEngine.defOf(vid)) vid = BattleEngine.variantId(deck[i], st, '');
    if (BattleEngine.defOf(vid)) deck[i] = vid;
  });
  return deck;
}
