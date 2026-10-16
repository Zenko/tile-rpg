/* ============================================================
   WEEKLY RULE (build 115)
   One small rule bends every card match for a whole week, the same for both sides (it is just another BattleEngine mod,
   added in battleWorld() in js/battle-ui.js and shown there as a chip). It turns over with weekKey() (js/quests.js), by simple rotation,
   so everyone has the same one. It never applies to puzzles or cellar fights (battleWorld skips those). Shown on the Social ladder card.
   ============================================================ */
// Build 275 grew the rotation from 6 to 17 rules: one for each keyword that was too quiet (Briar, Sip, Chorus, Lull, Kin, Echo, Sting) and one for each
// family. The list alternates a keyword week and a family week, so no two neighbours feel alike. Each rule is a battle mod (see opts.mods in the engine);
// scripts/battle-report.js section E checks that every rule lifts the deck it is aimed at without making it unbeatable. Names come from KW and FAMILIES.
// A family week can be limited to cheap cards (maxCost): +1 power on a whole family was often too much, +1 health on its own did almost nothing.
const fw = (f, label, mods) => ({ id: f, icon: FAMILIES[f].icon, name: `${FAMILIES[f].name} Week`, text: `${FAMILIES[f].name} cards ${label}`, mods: { weekFam: Object.assign({ family: f }, mods) } });
const WEEKLY_RULES = [
  { id: 'gale',   icon: '🌬️', name: 'Gale Week',     text: 'Flicker cards costing 2 or less +1 power',   mods: { kwPower: { swift: 1 }, kwMaxCost: 2 } },
  fw('grove', '+1 power', { power: 1 }),
  { id: 'rain',   icon: '🌧️', name: 'Soft Rain Week', text: 'Rest heals +1',          mods: { mendBonus: 1 } },
  fw('stone', '+1 health', { hp: 1 }),
  { id: 'wall',   icon: '🛡️', name: 'Wall Week',      text: 'Haze cards costing 2 or less +1 power', mods: { kwPower: { shield: 1 }, kwMaxCost: 2 } },
  { id: 'briar',  icon: KW.thorns.icon, name: `${KW.thorns.name} Week`, text: `${KW.thorns.name} pricks 1 harder`, mods: { thornsBonus: 1 } },
  { id: 'bloom',  icon: '🌸', name: 'Bloom Week',     text: 'Bloom cards +1 power',   mods: { bloomStart: 1 } },
  fw('tide', 'costing 2 or less +1/+1', { power: 1, hp: 1, maxCost: 2 }),
  { id: 'echo',   icon: '🔔', name: 'Startle Week',      text: 'Startle hits +1',           mods: { echoBonus: 1 } },
  { id: 'chorus', icon: KW.rally.icon, name: `${KW.rally.name} Week`, text: `${KW.rally.name} gives 1 more power`, mods: { rallyBonus: 1 } },
  { id: 'guard',  icon: '🏰', name: 'Watch Week',     text: 'Watch cards +1 health',  mods: { guardHp: 1 } },
  fw('wind', '+1 power', { power: 1 }),
  { id: 'sip',    icon: KW.drain.icon, name: `${KW.drain.name} Week`, text: `${KW.drain.name} restores 1 more Calm and its cards get +1 health`, mods: { drainBonus: 1, kwHp: { drain: 1 } } },
  { id: 'lull',   icon: KW.lull.icon, name: `${KW.lull.name} Week`, text: `${KW.lull.name} cards costing 3 or less +1 power`, mods: { kwPower: { lull: 1 }, kwMaxCost: 3 } },
  { id: 'kin',    icon: KW.kin.icon, name: `${KW.kin.name} Week`, text: `${KW.kin.name} cards +1 power`, mods: { kwPower: { kin: 1 } } },
  { id: 'sting',  icon: KW.sting.icon, name: `${KW.sting.name} Week`, text: `${KW.sting.name} cards costing 2 or less +1 power`, mods: { kwPower: { sting: 1 }, kwMaxCost: 2 } },
  { id: 'seeds',  icon: KW.seed.icon, name: `${KW.seed.name} Week`, text: `${KW.seed.name} cards +2 health`, mods: { kwHp: { seed: 2 } } },
];
function weeklyRule() {
  const [y, w] = weekKey().split('-W').map(Number);
  return WEEKLY_RULES[((y * 53 + w) % WEEKLY_RULES.length + WEEKLY_RULES.length) % WEEKLY_RULES.length];
}
// Adds this week's rule onto a mods object (numbers add, so weather and the weekly rule can both touch the same mod; object mods are merged).
function applyWeeklyRule(mods, chips) {
  const r = weeklyRule();
  Object.keys(r.mods).forEach(k => { const v = r.mods[k]; mods[k] = typeof v === 'number' ? (mods[k] || 0) + v : Object.assign({}, mods[k], v); });
  if (chips) chips.push(`📅 ${r.icon} ${r.text}`);
}
