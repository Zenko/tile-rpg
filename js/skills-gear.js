/* ============================================================
   PATH: SKILLS, GEAR AND COMPANION BOND (build 99)
   The RPG layer. Every level from 2 up gives one skill point to spend in ten branches (Angler, Gardener, Duelist, Wanderer,
   Baker, Player, Merchant, Caretaker, Tactician, Stargazer). Ranks 1-5 cost one point each; Mastery I and II (ranks 6 and 7) cost two
   and add a new effect instead of more of the same (a branch's ranks 1-5 can sit at a cap, e.g. bite speed). Eight tools are upgraded with Embers. A companion grows
   closer to you as you win matches and catch fish and reaches bond levels 2 and 3, which strengthen its perk.

   None of this adds a new hook to the game's systems: everything is summed by kind in skillBonus(kind), which
   cardBonus() (js/afterdark-companion-cards.js) already adds to the charm and set perks, so fishing, gardening, finds,
   chests, XP, battle starts and win Embers all pick it up through the hooks they had.
   Saved in state.progress.skills / .gear (and state.companion.bond), created lazily - older saves just start at zero.
   ============================================================ */
const SKILL_MAX_RANK = 5, SKILL_MASTERY_RANK = 7, SKILL_MASTERY_COST = 2;   // ranks 6 and 7 are Mastery I and II
const SKILL_BRANCHES = [
  { id: 'angler',   icon: '🎣', name: 'Angler',   blurb: 'Fish bite sooner',
    perks: r => [{ kind: 'fish', val: 0.04 * r }],
    text: r => `Fish bite ${4 * r}% sooner`,
    mastery: m => [{ kind: 'fishPebbles', val: m }], mtext: m => `+${m} ${currencyName(m)} for every fish you keep` },
  { id: 'gardener', icon: '🌱', name: 'Gardener', blurb: 'Crops grow faster and pay more',
    perks: r => [{ kind: 'crops', val: 0.04 * r }, { kind: 'harvestPebbles', val: Math.floor(r / 2) }],
    text: r => `Crops grow ${4 * r}% faster${r >= 2 ? `, +${Math.floor(r / 2)} ${currencyName(Math.floor(r / 2))} per harvest` : ''}`,
    mastery: m => [{ kind: 'harvestPebbles', val: m }], mtext: m => `+${m} more ${currencyName(m)} per harvest` },
  { id: 'duelist',  icon: '⚔️', name: 'Duelist',  blurb: 'A better start in every match',
    perks: r => [{ kind: 'startSpirit', val: Math.floor(r / 2) }, { kind: 'winPebbles', val: r >= 3 ? 1 : 0 }, { kind: 'startDraw', val: r >= 5 ? 1 : 0 }],
    text: r => r < 2 ? 'Unlocks at rank 2' : `+${Math.floor(r / 2)} Calm at the start${r >= 3 ? `, +1 ${GAME.currency.one} per win` : ''}${r >= 5 ? ', draw 1 extra card' : ''}`,
    mastery: m => [{ kind: 'startSpirit', val: m }], mtext: m => `+${m} more Calm at the start` },
  { id: 'wanderer', icon: '🧭', name: 'Wanderer', blurb: 'Sharper eyes and quicker learning',
    perks: r => [{ kind: 'finds', val: 0.06 * r }, { kind: 'chest', val: 0.04 * r }, { kind: 'xp', val: 0.02 * r }],
    text: r => `Finds +${6 * r}%, chests +${4 * r}%, XP +${2 * r}%`,
    mastery: m => [{ kind: 'xp', val: 0.04 * m }], mtext: m => `XP +${4 * m}% more` },
  { id: 'baker',    icon: '🍞', name: 'Baker',    blurb: 'Bread bakes faster',
    perks: r => [{ kind: 'bake', val: 0.05 * r }, { kind: 'breadPebbles', val: Math.floor(r / 2) }],
    text: r => `Bread bakes ${5 * r}% faster${r >= 2 ? `, a spare loaf sells for +${Math.floor(r / 2)}` : ''}`,
    mastery: m => [{ kind: 'breadPebbles', val: 2 * m }], mtext: m => `A spare loaf sells for +${2 * m} more` },
  { id: 'player',   icon: '🎲', name: 'Player',   blurb: 'Mini-games pay more',
    perks: r => [{ kind: 'miniPebbles', val: Math.ceil(r / 2) }],
    text: r => `+${Math.ceil(r / 2)} ${currencyName(Math.ceil(r / 2))} for every mini-game medal`,
    mastery: m => [{ kind: 'miniPebbles', val: m }], mtext: m => `+${m} more per medal` },
  { id: 'merchant', icon: '🪙', name: 'Merchant', blurb: 'Packs cost less',
    perks: r => [{ kind: 'packDiscount', val: 0.02 * r }],
    text: r => `Packs cost ${2 * r}% less`,
    mastery: m => [{ kind: 'packDiscount', val: 0.025 * m }], mtext: m => `Packs cost ${2.5 * m}% less again` },
  { id: 'caretaker', icon: '🤝', name: 'Caretaker', blurb: 'Your companion grows closer, faster',
    perks: r => [{ kind: 'bondRate', val: 0.1 * r }, { kind: 'giftEmbers', val: Math.floor(r / 2) }],
    text: r => `Bond grows ${10 * r}% faster${r >= 2 ? `, the daily gift has +${Math.floor(r / 2)}` : ''}`,
    mastery: m => [{ kind: 'bondRate', val: 0.15 * m }, { kind: 'giftEmbers', val: m }], mtext: m => `Bond +${15 * m}% faster, gift +${m}` },
  { id: 'tactician', icon: '🛡️', name: 'Tactician', blurb: 'Your first plays arrive tougher',
    perks: r => [{ kind: 'startHp', val: Math.floor(r / 2) }],
    text: r => r < 2 ? 'Unlocks at rank 2' : `Cards costing ${Math.floor(r / 2) + 1} or less start with +1 health`,
    mastery: m => [{ kind: 'startHp', val: m }], mtext: m => m >= 2 ? 'Every card starts with +1 health' : 'Cards costing 4 or less start with +1 health' },
  { id: 'stargazer', icon: '✨', name: 'Stargazer', blurb: 'Duplicates pay more Starlight',
    perks: r => [{ kind: 'starlight', val: 0.1 * r }],
    text: r => `A duplicate from a pack pays ${10 * r}% more ${GAME.starlight.name}`,
    mastery: m => [{ kind: 'starlight', val: 0.15 * m }], mtext: m => `${15 * m}% more again` },
];
const GEAR = [
  { id: 'rod',     icon: '🎣', name: 'Thought Fishing rod',  tiers: [{ cost: 60, level: 3, name: 'Willow rod' }, { cost: 150, level: 8, name: 'Bamboo rod' }, { cost: 320, level: 15, name: 'Silver rod' }, { cost: 600, level: 20, name: 'Dream rod', depth: ['harbor', 2] }],
    perks: t => [{ kind: 'fish', val: 0.06 * Math.min(t, 3) }, { kind: 'fishPebbles', val: t >= 4 ? 1 : 0 }], text: t => `Fish bite ${6 * Math.min(t, 3)}% sooner${t >= 4 ? `, +1 ${GAME.currency.one} for every fish you keep` : ''}` },
  { id: 'can',     icon: '🚿', name: 'Watering can', tiers: [{ cost: 60, level: 3, name: 'Tin can' }, { cost: 150, level: 8, name: 'Copper can' }, { cost: 320, level: 15, name: 'Rain-glass can' }, { cost: 600, level: 20, name: 'Dew-glass can', depth: ['garden', 2] }],
    perks: t => [{ kind: 'crops', val: 0.06 * t }, { kind: 'harvestPebbles', val: t >= 4 ? 1 : 0 }], text: t => `Crops grow ${6 * t}% faster${t >= 4 ? `, +1 ${GAME.currency.one} per harvest` : ''}` },
  { id: 'lantern', icon: '🏮', name: 'Lantern',      tiers: [{ cost: 60, level: 3, name: 'Paper lantern' }, { cost: 150, level: 8, name: 'Brass lantern' }, { cost: 320, level: 15, name: 'Star lantern' }, { cost: 600, level: 20, name: 'Dream lantern', depth: ['market', 2] }],
    perks: t => [{ kind: 'finds', val: 0.08 * t }, { kind: 'chest', val: 0.04 * t }], text: t => `Finds +${8 * t}%, chests +${4 * t}%` },
  { id: 'peel',    icon: '🥖', name: 'Bread peel',   tiers: [{ cost: 80, level: 5, name: 'Wooden peel' }, { cost: 200, level: 11, name: 'Iron peel' }, { cost: 420, level: 18, name: 'Copper peel' }],
    perks: t => [{ kind: 'bake', val: 0.08 * t }], text: t => `Bread bakes ${8 * t}% faster` },
  { id: 'basket',  icon: '🧺', name: 'Basket',       tiers: [{ cost: 80, level: 5, name: 'Wicker basket' }, { cost: 200, level: 11, name: 'Willow basket' }, { cost: 420, level: 18, name: 'Gilded basket' }],
    perks: t => [{ kind: 'harvestPebbles', val: Math.ceil(t / 2) }], text: t => `+${Math.ceil(t / 2)} ${currencyName(Math.ceil(t / 2))} per harvest` },
  { id: 'case',    icon: '🎴', name: 'Card case',    tiers: [{ cost: 100, level: 6, name: 'Paper sleeve' }, { cost: 240, level: 12, name: 'Wooden case' }, { cost: 480, level: 19, name: 'Lacquer case' }],
    perks: t => [{ kind: 'winPebbles', val: t >= 2 ? 1 : 0 }, { kind: 'startSpirit', val: t >= 3 ? 1 : 0 }], text: t => t < 2 ? 'Tidier decks (nothing yet)' : `+1 ${GAME.currency.one} per win${t >= 3 ? ', +1 Calm at the start' : ''}` },
  { id: 'boots',   icon: '🥾', name: 'Walking boots', tiers: [{ cost: 80, level: 5, name: 'Cloth boots' }, { cost: 200, level: 11, name: 'Leather boots' }, { cost: 420, level: 18, name: 'Cloud boots' }],
    perks: t => [{ kind: 'xp', val: 0.03 * t }, { kind: 'bondRate', val: 0.05 * t }], text: t => `XP +${3 * t}%, bond grows ${5 * t}% faster` },
  { id: 'glass',   icon: '🔭', name: 'Star-glass',   tiers: [{ cost: 120, level: 7, name: 'Cardboard tube' }, { cost: 280, level: 13, name: 'Brass glass' }, { cost: 520, level: 20, name: 'Moon glass' }],
    perks: t => [{ kind: 'starlight', val: 0.1 * t }, { kind: 'finds', val: 0.04 * t }], text: t => `Finds +${4 * t}%, duplicates pay ${10 * t}% more ${GAME.starlight.name}` },
];
// A companion's bond: wins and catches bring you closer. Level 2 and 3 add a second helping of its perk.
const BOND_AT = [0, 12, 40];
const BOND_PERK = {   // companion perk -> [stat kind, bonus at bond 2, bonus at bond 3]
  spirit: ['startSpirit', 1, 2], finds: ['finds', 0.10, 0.20], crops: ['crops', 0.08, 0.16], harvest: ['harvestPebbles', 1, 2],
  chest: ['chest', 0.10, 0.20], fish: ['fish', 0.08, 0.16], xp: ['xp', 0.05, 0.10],
  bounty: ['winPebbles', 1, 2], medals: ['miniPebbles', 1, 2], hearth: ['bake', 0.10, 0.20],
};
const BOND_FROM = { battlesWon: 3, bossesWon: 6, fishCaught: 1, cropsHarvested: 1, steps: 0.02 };

function skillState() { const p = state.progress; if (!p.skills || typeof p.skills !== 'object') p.skills = {}; return p.skills; }
function gearState() { const p = state.progress; if (!p.gear || typeof p.gear !== 'object') p.gear = {}; return p.gear; }
function skillRank(id) { return Math.max(0, Math.min(SKILL_MASTERY_RANK, Math.floor(skillState()[id]) || 0)); }
// What the next rank costs: one point up to rank 5, then two for each Mastery rank. Points spent on a rank are the sum of those.
function skillCost(rank) { return rank > SKILL_MAX_RANK ? SKILL_MASTERY_COST : 1; }
function skillRankCost(r) { return Math.min(r, SKILL_MAX_RANK) + Math.max(0, r - SKILL_MAX_RANK) * SKILL_MASTERY_COST; }
function skillPointsTotal() { return Math.max(0, (ensureLevel().level || 1) - 1); }
function skillPointsSpent() { return SKILL_BRANCHES.reduce((n, b) => n + skillRankCost(skillRank(b.id)), 0); }
function skillPointsLeft() { return Math.max(0, skillPointsTotal() - skillPointsSpent()); }
function gearTier(id) { const g = GEAR.find(x => x.id === id); return g ? Math.max(0, Math.min(g.tiers.length, Math.floor(gearState()[id]) || 0)) : 0; }
function bondLevel(c) { const b = (c && c.bond) || 0; return BOND_AT.filter(t => b >= t).length; }

// Everything above, summed by kind. Called by cardBonus().
function skillBonus(kind) {
  let v = 0;
  SKILL_BRANCHES.forEach(b => { const r = skillRank(b.id); if (r) b.perks(Math.min(r, SKILL_MAX_RANK)).forEach(p => { if (p.kind === kind) v += p.val; }); if (r > SKILL_MAX_RANK) b.mastery(r - SKILL_MAX_RANK).forEach(p => { if (p.kind === kind) v += p.val; }); });
  GEAR.forEach(g => { const t = gearTier(g.id); if (t) g.perks(t).forEach(p => { if (p.kind === kind) v += p.val; }); });
  const c = state.companion, bl = bondLevel(c);
  if (c && bl >= 2) companionPerks(c).forEach(pk => { const bp = BOND_PERK[pk]; if (bp && bp[0] === kind) v += bp[bl - 1]; });   // bond 2 adds bp[1], bond 3 adds bp[2], for each of their perks
  if (typeof tarotBonus === 'function') v += tarotBonus(kind);   // the day's fortune and attuned Arcana (js/tarot.js)
  if (typeof cellarRunBonus === 'function') v += cellarRunBonus(kind);   // boons while a cellar fight is on (js/cellar-run.js)
  if (kind === 'xp' && typeof calmRested === 'function' && calmRested()) v += 0.05;   // Rested after five breaths (js/calm.js)
  return v;
}

function buySkill(id) {
  const b = SKILL_BRANCHES.find(x => x.id === id);
  if (!b || skillRank(id) >= SKILL_MASTERY_RANK || skillPointsLeft() < skillCost(skillRank(id) + 1)) { sfx('tie'); return false; }
  skillState()[id] = skillRank(id) + 1; saveState(); sfx('skill'); buzz(HAP.found); refreshGoalChip(true);   // the town pill must stop saying "1 skill point" at once
  toast(`${b.icon} ${b.name} ${skillRankName(b, skillRank(id))}: ${skillRankText(b, skillRank(id))}`);
  logEvent(b.icon, `${b.name} reached ${skillRankName(b, skillRank(id)).toLowerCase()}.`);
  return true;
}
// Ranks 1-5 read as 'rank n'; the two above them are Mastery I and II, whose text is the new effect on its own.
function skillRankName(b, r) { return r > SKILL_MAX_RANK ? 'Mastery ' + 'I'.repeat(r - SKILL_MAX_RANK) : 'rank ' + r; }
function skillRankText(b, r) { return r > SKILL_MAX_RANK ? b.mtext(r - SKILL_MAX_RANK) : b.text(r); }
function resetSkills() { state.progress.skills = {}; saveState(); refreshGoalChip(true); sfx('nav'); buzz(HAP.tap); toast('Skill points returned. Spend them however you like.'); }
function gearBlock(g) {
  const t = gearTier(g.id), next = g.tiers[t];
  if (!next) return '';
  if ((ensureLevel().level || 1) < next.level) return `Needs Lv ${next.level}`;
  if (next.depth && typeof depthCleared === 'function' && depthCleared(next.depth[0]) < next.depth[1]) return `Needs ${GAME.depth.name} ${next.depth[1]}`;   // the second lap (js/depth.js)
  if (state.progress.pebbles < next.cost) return `Needs 🫧 ${next.cost}`;
  return '';
}
function buyGear(id) {
  const g = GEAR.find(x => x.id === id); if (!g) return false;
  const t = gearTier(id), next = g.tiers[t];
  if (!next || gearBlock(g)) { sfx('tie'); return false; }
  spendPebbles(next.cost, 'gear'); gearState()[id] = t + 1; saveState(); updateHud(); bumpPill('pillPebbles'); sfx('claim'); buzz(HAP.found);
  toast(`${g.icon} ${next.name}: ${g.text(t + 1)}`);
  logEvent(g.icon, `Upgraded to the ${next.name} for 🫧 ${next.cost}.`);
  return true;
}

// Called from bumpStat (js/quests.js) for every stat bump.
function companionBond(stat, n) {
  const c = state.companion, per = BOND_FROM[stat];
  if (!c || !per) return;
  if (stat === 'battlesWon' || stat === 'bossesWon') c.wins = (c.wins || 0) + (n || 1);
  if (stat === 'fishCaught') c.catches = (c.catches || 0) + (n || 1);
  companionGrow(per * (n || 1));      // js/afterdark-companion-cards.js: also keeps this companion's bond for next time
}

/* ---------- the Path view (Character tab) ---------- */
const pipsHtml = (n, max) => Array.from({ length: max }, (_, i) => `<i class="pt-pip${i < n ? ' on' : ''}"></i>`).join('');
function charDrawPath(box) {
  showTipOnce('path');
  const left = skillPointsLeft(), total = skillPointsTotal();
  const head = document.createElement('div'); head.className = 'pt-head';
  head.innerHTML = `<div><b>${left}</b><span> skill point${left === 1 ? '' : 's'} to spend</span></div><small>You earn one every level. ${skillPointsSpent()} of ${total} spent. Reset any time for free.</small>`;
  box.appendChild(head);
  charSection(box, 'Skills');
  const list = document.createElement('div'); list.className = 'pt-list';
  list.innerHTML = SKILL_BRANCHES.map(b => {
    const r = skillRank(b.id), max = r >= SKILL_MASTERY_RANK, cost = max ? 0 : skillCost(r + 1), mastery = r >= SKILL_MAX_RANK;
    return `<div class="pt-card${mastery ? ' mastered' : ''}"><span class="pt-ico">${b.icon}</span>
      <div class="pt-body"><div class="pt-name">${b.name}<span class="pt-rank">${r > SKILL_MAX_RANK ? skillRankName(b, r) : `Rank ${r}/${SKILL_MAX_RANK}`}</span></div>
      <div class="pt-pips">${pipsHtml(Math.min(r, SKILL_MAX_RANK), SKILL_MAX_RANK)}${mastery ? pipsHtml(r - SKILL_MAX_RANK, SKILL_MASTERY_RANK - SKILL_MAX_RANK).replace(/pt-pip/g, 'pt-pip mastery') : ''}</div>
      <div class="pt-text">${r ? skillRankText(b, r) : b.blurb}${!max ? `<small>${r >= SKILL_MAX_RANK ? 'Mastery' : 'Next'} (${cost} point${cost === 1 ? '' : 's'}): ${skillRankText(b, r + 1)}</small>` : ''}</div></div>
      <button type="button" class="pt-add" data-skill="${b.id}" aria-label="${max ? b.name + ' is fully mastered' : `Spend ${cost} point${cost === 1 ? '' : 's'} on ${b.name}`}" ${max || left < cost ? 'disabled' : ''}>${max ? '✓' : cost > 1 ? '+' + cost : '+'}</button></div>`;
  }).join('');
  onAll(list, '[data-skill]', b => { if (buySkill(b.dataset.skill)) drawCharBody(); });
  box.appendChild(list);
  if (skillPointsSpent()) {
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'panel-action pt-reset'; reset.textContent = 'Reset skill points';
    reset.addEventListener('click', () => { resetSkills(); drawCharBody(); });
    box.appendChild(reset);
  }
  charSection(box, 'Gear');
  const gl = document.createElement('div'); gl.className = 'pt-list';
  gl.innerHTML = GEAR.map(g => {
    const t = gearTier(g.id), next = g.tiers[t], block = gearBlock(g), cur = t ? g.tiers[t - 1] : null;
    return `<div class="pt-card"><span class="pt-ico">${g.icon}</span>
      <div class="pt-body"><div class="pt-name">${cur ? cur.name : g.name}<span class="pt-rank">Tier ${t}/${g.tiers.length}</span></div>
      <div class="pt-pips">${pipsHtml(t, g.tiers.length)}</div>
      <div class="pt-text">${t ? g.text(t) : 'Not upgraded yet'}${next ? `<small>Next: ${next.name}, ${g.text(t + 1)}${next.depth ? ` (clear ${GAME.depth.name} ${next.depth[1]} in ${PLACES[next.depth[0]]})` : ''}</small>` : ''}</div></div>
      ${next ? `<button type="button" class="pt-buy" data-gear="${g.id}" ${block ? 'disabled' : ''}>${block || `🫧 ${next.cost}`}</button>` : '<span class="pt-done">Maxed</span>'}</div>`;
  }).join('');
  onAll(gl, '[data-gear]', b => { if (buyGear(b.dataset.gear)) drawCharBody(); });
  box.appendChild(gl);
  const c = state.companion;
  if (c) {
    charSection(box, 'Companion bond');
    const bl = bondLevel(c), nextAt = BOND_AT[bl], bp = BOND_PERK[c.perk];
    const bd = document.createElement('div'); bd.className = 'pt-card';
    bd.innerHTML = `<span class="pt-ico">${c.icon}</span><div class="pt-body"><div class="pt-name">${escapeHtml(c.name)}<span class="pt-rank">Bond ${bl}/${BOND_AT.length}</span></div>
      <div class="pt-pips">${pipsHtml(bl, BOND_AT.length)}</div>
      <div class="pt-text">${nextAt === undefined ? 'As close as it gets.' : `${Math.floor(c.bond || 0)} / ${nextAt} · wins and catches bring you closer`}${bp && bl < 3 ? `<small>Bond ${bl + 1} strengthens ${COMPANION_PERKS[c.perk].text.toLowerCase()}</small>` : ''}</div></div>`;
    box.appendChild(bd);
  }
}

/* ---------- the next-goal chip ----------
   One small pill under the top bar that says the single most useful thing to do next, and takes you there when tapped.
   It reads the same model as the Journal's Today page (todayModel), plus unspent skill points, so there is no new state.
   Tapping it walks you there (js/guide-walk.js): across districts, to the door, and in; or to the neighbour, the water or the plot.
   Recomputed at most every 2 seconds (updateHud calls this very often) and hidden while a decoration is being placed. */
let goalChipAt = 0, goalChipTarget = null;
function nextGoal() {
  const pg = typeof pwGoal === 'function' ? pwGoal() : null; if (pg) return pg;   // inside a puddle world the pill says what the world is about
  const sg = storyGoal();   // js/scenes.js: Wren's current ask. It leads during the first chain and only fills an empty pill after it.
  if (sg && sg.first) return sg;
  if (skillPointsLeft() > 0) return { icon: '🧭', text: `${skillPointsLeft()} skill point${skillPointsLeft() === 1 ? '' : 's'} to spend`, run: () => { switchTab('character'); charSetView('path'); } };
  const m = todayModel();
  if (m.away.length) { const a = m.away[0]; return { icon: a.icon, text: a.title, run: () => journalGo(a.go), go: a.go }; }
  const open = m.daily.find(i => !i.done && i.go && i.title !== 'Daily gift') || m.daily.find(i => !i.done);
  if (open) return { icon: open.icon, text: `${open.title}: ${open.sub}`, run: () => journalGo(open.go), go: open.go };
  return sg;
}
function refreshGoalChip(force) {
  const chip = document.getElementById('goalChip'); if (!chip) return;
  storyMark();
  if (prefs.cozy) { chip.classList.add('hidden'); guideMarkApply(null); return; }   // Cozy mode: no nudges
  const now = Date.now(); if (!force && now - goalChipAt < 2000) return; goalChipAt = now;
  const placing = !document.getElementById('decorationHint').classList.contains('hidden');
  const g = inBattle || placing ? null : nextGoal();
  chip.classList.toggle('hidden', !g);
  guideMarkApply(g && g.go);   // js/guide-walk.js: the gold diamond over the building the goal points at, when it is in this district
  if (!g) { goalChipTarget = null; return; }
  goalChipTarget = g.run;
  document.getElementById('goalIcon').textContent = g.icon; document.getElementById('goalText').textContent = g.text;
}
// The pill is only re-read every 2 seconds, so re-check on tap: if its goal has just been done, say so instead of walking to an empty screen.
document.getElementById('goalChip').addEventListener('click', () => { const was = document.getElementById('goalText').textContent; refreshGoalChip(true); if (document.getElementById('goalText').textContent !== was) return; if (goalChipTarget) { sfx('nav'); buzz(HAP.tap); goalChipTarget(); } });
