/* ============================================================
   PATH: SKILLS, GEAR AND COMPANION BOND (build 99)
   The RPG layer. Every level from 2 up gives one skill point to spend in four branches (Angler, Gardener, Duelist,
   Wanderer, five ranks each). Three tools (rod, watering can, lantern) are upgraded with Pebbles. A companion grows
   closer to you as you win matches and catch fish and reaches bond levels 2 and 3, which strengthen its perk.

   None of this adds a new hook to the game's systems: everything is summed by kind in skillBonus(kind), which
   cardBonus() (js/afterdark-companion-cards.js) already adds to the charm and set perks, so fishing, gardening, finds,
   chests, XP, battle starts and win Pebbles all pick it up through the hooks they had.
   Saved in state.progress.skills / .gear (and state.companion.bond), created lazily - older saves just start at zero.
   ============================================================ */
const SKILL_MAX_RANK = 5;
const SKILL_BRANCHES = [
  { id: 'angler',   icon: '🎣', name: 'Angler',   blurb: 'Fish bite sooner',
    perks: r => [{ kind: 'fish', val: 0.04 * r }],
    text: r => `Fish bite ${4 * r}% sooner` },
  { id: 'gardener', icon: '🌱', name: 'Gardener', blurb: 'Crops grow faster and pay more',
    perks: r => [{ kind: 'crops', val: 0.04 * r }, { kind: 'harvestPebbles', val: Math.floor(r / 2) }],
    text: r => `Crops grow ${4 * r}% faster${r >= 2 ? `, +${Math.floor(r / 2)} Pebble${r >= 4 ? 's' : ''} per harvest` : ''}` },
  { id: 'duelist',  icon: '⚔️', name: 'Duelist',  blurb: 'A better start in every match',
    perks: r => [{ kind: 'startSpirit', val: Math.floor(r / 2) }, { kind: 'winPebbles', val: r >= 3 ? 1 : 0 }, { kind: 'startDraw', val: r >= 5 ? 1 : 0 }],
    text: r => r < 2 ? 'Unlocks at rank 2' : `+${Math.floor(r / 2)} Spirit at the start${r >= 3 ? ', +1 Pebble per win' : ''}${r >= 5 ? ', draw 1 extra card' : ''}` },
  { id: 'wanderer', icon: '🧭', name: 'Wanderer', blurb: 'Sharper eyes and quicker learning',
    perks: r => [{ kind: 'finds', val: 0.06 * r }, { kind: 'chest', val: 0.04 * r }, { kind: 'xp', val: 0.02 * r }],
    text: r => `Finds +${6 * r}%, chests +${4 * r}%, XP +${2 * r}%` },
];
const GEAR = [
  { id: 'rod',     icon: '🎣', name: 'Fishing rod',  tiers: [{ cost: 60, level: 3, name: 'Willow rod' }, { cost: 150, level: 8, name: 'Bamboo rod' }, { cost: 320, level: 15, name: 'Silver rod' }],
    perks: t => [{ kind: 'fish', val: 0.06 * t }], text: t => `Fish bite ${6 * t}% sooner` },
  { id: 'can',     icon: '🚿', name: 'Watering can', tiers: [{ cost: 60, level: 3, name: 'Tin can' }, { cost: 150, level: 8, name: 'Copper can' }, { cost: 320, level: 15, name: 'Rain-glass can' }],
    perks: t => [{ kind: 'crops', val: 0.06 * t }], text: t => `Crops grow ${6 * t}% faster` },
  { id: 'lantern', icon: '🏮', name: 'Lantern',      tiers: [{ cost: 60, level: 3, name: 'Paper lantern' }, { cost: 150, level: 8, name: 'Brass lantern' }, { cost: 320, level: 15, name: 'Star lantern' }],
    perks: t => [{ kind: 'finds', val: 0.08 * t }, { kind: 'chest', val: 0.04 * t }], text: t => `Finds +${8 * t}%, chests +${4 * t}%` },
];
// A companion's bond: wins and catches bring you closer. Level 2 and 3 add a second helping of its perk.
const BOND_AT = [0, 12, 40];
const BOND_PERK = {   // companion perk -> [stat kind, bonus at bond 2, bonus at bond 3]
  spirit: ['startSpirit', 1, 2], finds: ['finds', 0.10, 0.20], crops: ['crops', 0.08, 0.16], harvest: ['harvestPebbles', 1, 2],
  chest: ['chest', 0.10, 0.20], fish: ['fish', 0.08, 0.16], xp: ['xp', 0.05, 0.10],
};
const BOND_FROM = { battlesWon: 3, bossesWon: 6, fishCaught: 1, cropsHarvested: 1, steps: 0.02 };

function skillState() { const p = state.progress; if (!p.skills || typeof p.skills !== 'object') p.skills = {}; return p.skills; }
function gearState() { const p = state.progress; if (!p.gear || typeof p.gear !== 'object') p.gear = {}; return p.gear; }
function skillRank(id) { return Math.max(0, Math.min(SKILL_MAX_RANK, Math.floor(skillState()[id]) || 0)); }
function skillPointsTotal() { return Math.max(0, (ensureLevel().level || 1) - 1); }
function skillPointsSpent() { return SKILL_BRANCHES.reduce((n, b) => n + skillRank(b.id), 0); }
function skillPointsLeft() { return Math.max(0, skillPointsTotal() - skillPointsSpent()); }
function gearTier(id) { const g = GEAR.find(x => x.id === id); return g ? Math.max(0, Math.min(g.tiers.length, Math.floor(gearState()[id]) || 0)) : 0; }
function bondLevel(c) { const b = (c && c.bond) || 0; return BOND_AT.filter(t => b >= t).length; }

// Everything above, summed by kind. Called by cardBonus().
function skillBonus(kind) {
  let v = 0;
  SKILL_BRANCHES.forEach(b => { const r = skillRank(b.id); if (r) b.perks(r).forEach(p => { if (p.kind === kind) v += p.val; }); });
  GEAR.forEach(g => { const t = gearTier(g.id); if (t) g.perks(t).forEach(p => { if (p.kind === kind) v += p.val; }); });
  const c = state.companion, bp = c && BOND_PERK[c.perk], bl = bondLevel(c);
  if (bp && bp[0] === kind && bl >= 2) v += bp[bl - 1];   // bond 2 adds bp[1], bond 3 adds bp[2]
  if (typeof cellarRunBonus === 'function') v += cellarRunBonus(kind);   // boons while a cellar fight is on (js/cellar-run.js)
  if (kind === 'xp' && typeof calmRested === 'function' && calmRested()) v += 0.05;   // Rested after five breaths (js/calm.js)
  if (kind === 'startSpirit' && typeof archetypeBonus === 'function') v += archetypeBonus();   // 8+ cards of one family (js/ladder-practice.js)
  return v;
}

function buySkill(id) {
  const b = SKILL_BRANCHES.find(x => x.id === id);
  if (!b || skillRank(id) >= SKILL_MAX_RANK || skillPointsLeft() < 1) { sfx('tie'); return false; }
  skillState()[id] = skillRank(id) + 1; saveState(); sfx('skill'); buzz(HAP.found);
  toast(`${b.icon} ${b.name} rank ${skillRank(id)}: ${b.text(skillRank(id))}`);
  logEvent(b.icon, `${b.name} reached rank ${skillRank(id)}.`);
  return true;
}
function resetSkills() { state.progress.skills = {}; saveState(); sfx('nav'); buzz(HAP.tap); toast('Skill points returned. Spend them however you like.'); }
function gearBlock(g) {
  const t = gearTier(g.id), next = g.tiers[t];
  if (!next) return '';
  if ((ensureLevel().level || 1) < next.level) return `Needs Lv ${next.level}`;
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
  const before = bondLevel(c);
  c.bond = (c.bond || 0) + per * (n || 1);
  const after = bondLevel(c);
  if (after > before) {
    const bp = BOND_PERK[c.perk];
    toast(`${c.icon} ${c.name} feels closer to you (bond ${after})${bp ? ': its perk grew' : ''}`);
    logEvent(c.icon, `${c.name} reached bond level ${after}.`);
  }
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
    const r = skillRank(b.id), max = r >= SKILL_MAX_RANK;
    return `<div class="pt-card"><span class="pt-ico">${b.icon}</span>
      <div class="pt-body"><div class="pt-name">${b.name}<span class="pt-rank">Rank ${r}/${SKILL_MAX_RANK}</span></div>
      <div class="pt-pips">${pipsHtml(r, SKILL_MAX_RANK)}</div>
      <div class="pt-text">${r ? b.text(r) : b.blurb}${!max ? `<small>Next: ${b.text(r + 1)}</small>` : ''}</div></div>
      <button type="button" class="pt-add" data-skill="${b.id}" aria-label="Add a point to ${b.name}" ${max || !left ? 'disabled' : ''}>${max ? '✓' : '+'}</button></div>`;
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
      <div class="pt-text">${t ? g.text(t) : 'Not upgraded yet'}${next ? `<small>Next: ${next.name}, ${g.text(t + 1)}</small>` : ''}</div></div>
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
   Recomputed at most every 2 seconds (updateHud calls this very often) and hidden while a decoration is being placed. */
let goalChipAt = 0, goalChipTarget = null;
function nextGoal() {
  if (skillPointsLeft() > 0) return { icon: '🧭', text: `${skillPointsLeft()} skill point${skillPointsLeft() === 1 ? '' : 's'} to spend`, run: () => { switchTab('character'); charSetView('path'); } };
  const m = todayModel();
  if (m.away.length) { const a = m.away[0]; return { icon: a.icon, text: a.title, run: () => journalGo(a.go) }; }
  const open = m.daily.find(i => !i.done && i.go && i.title !== 'Daily gift') || m.daily.find(i => !i.done);
  if (open) return { icon: open.icon, text: `${open.title}: ${open.sub}`, run: () => journalGo(open.go) };
  return null;
}
function refreshGoalChip(force) {
  const chip = document.getElementById('goalChip'); if (!chip) return;
  if (prefs.cozy) { chip.classList.add('hidden'); return; }   // Cozy mode: no nudges
  const now = Date.now(); if (!force && now - goalChipAt < 2000) return; goalChipAt = now;
  const placing = !document.getElementById('decorationHint').classList.contains('hidden');
  const g = inBattle || placing ? null : nextGoal();
  chip.classList.toggle('hidden', !g);
  if (!g) { goalChipTarget = null; return; }
  goalChipTarget = g.run;
  document.getElementById('goalIcon').textContent = g.icon; document.getElementById('goalText').textContent = g.text;
}
document.getElementById('goalChip').addEventListener('click', () => { if (goalChipTarget) { sfx('nav'); buzz(HAP.tap); goalChipTarget(); } });
