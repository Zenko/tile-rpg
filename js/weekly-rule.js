/* ============================================================
   WEEKLY RULE (build 115)
   One small rule bends every card match for a whole week, the same for both sides (it is just another BattleEngine mod,
   added in battleWorld() in js/battle-ui.js and shown there as a chip). It turns over with weekKey() (js/quests.js), by simple rotation,
   so everyone has the same one. It never applies to puzzles or cellar fights (battleWorld skips those). Shown on the Social ladder card.
   ============================================================ */
const WEEKLY_RULES = [
  { id: 'gale',   icon: '🌬️', name: 'Gale Week',     text: 'Flicker cards +1 power',   mods: { swiftBonus: 1 } },
  { id: 'rain',   icon: '🌧️', name: 'Soft Rain Week', text: 'Rest heals +1',          mods: { mendBonus: 1 } },
  { id: 'wall',   icon: '🛡️', name: 'Wall Week',      text: 'Haze cards +1 health', mods: { shieldHp: 1 } },
  { id: 'bloom',  icon: '🌸', name: 'Bloom Week',     text: 'Bloom cards +1 power',   mods: { bloomStart: 1 } },
  { id: 'echo',   icon: '🔔', name: 'Startle Week',      text: 'Startle hits +1',           mods: { echoBonus: 1 } },
  { id: 'guard',  icon: '🏰', name: 'Watch Week',     text: 'Watch cards +1 health',  mods: { guardHp: 1 } },
];
function weeklyRule() {
  const [y, w] = weekKey().split('-W').map(Number);
  return WEEKLY_RULES[((y * 53 + w) % WEEKLY_RULES.length + WEEKLY_RULES.length) % WEEKLY_RULES.length];
}
// Adds this week's rule onto a mods object (numbers add, so weather and the weekly rule can both touch the same mod).
function applyWeeklyRule(mods, chips) {
  const r = weeklyRule();
  Object.keys(r.mods).forEach(k => { mods[k] = (mods[k] || 0) + r.mods[k]; });
  if (chips) chips.push(`📅 ${r.icon} ${r.text}`);
}
