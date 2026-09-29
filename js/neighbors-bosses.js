/* ============================================================
   WANDERING NEIGHBORS, BOSSES AND GRAVES
   Fighters stroll around their home tile. When one loses, a grave
   is left where they fell. After a cooldown they return, fresh.
   ============================================================ */
const WANDER = {
  enabled: true,   // tests switch this off to hold fighters still
  npc:  { minMs: 1300, maxMs: 2700, leash: 4, moveChance: 0.75 },
  boss: { minMs: 1900, maxMs: 3600, leash: 5, moveChance: 0.55 },
};
const GRAVE_MS = { npc: 90 * 1000, boss: 4 * 60 * 1000 };
const GRAVE_MOVE_MS = 520;   // how long the slide from one tile to the next takes
const EPITAPHS = [
  'Lost a friendly match. Resting for now.',
  'Sleeping off a hard-fought game.',
  'Went down swinging. Well, playing cards.',
  'Gone to think about their deck.',
  'Taking a well-earned nap.',
];
const BOSS_EPITAPHS = [
  'Bested, but not gone for good.',
  'Sulking somewhere quiet. It will pass.',
  'Resting. The rematch will be worth the wait.',
];

const fighters = (data) => [...data.npcs, ...(data.boss ? [data.boss] : [])];
const kindOf = (f) => (f.isBoss ? 'boss' : 'npc');
const graveMs = (f) => GRAVE_MS[kindOf(f)];

/* ---------- where a fighter may stand or step ---------- */
function isBridgeTile(m, x, y) { const c = m.rows[y] && m.rows[y][x]; return c === 'b'; }
function tileFreeForWander(m, data, x, y, self) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  if (m.solid[y][x]) return false;
  if (isBridgeTile(m, x, y)) return false;
  if (state.playerPos.x === x && state.playerPos.y === y) return false;
  if (m.entries[x + ',' + y]) return false;
  if (fighters(data).some(f => f !== self && f.x === x && f.y === y)) return false;       // live or in a grave
  if (fighters(data).some(f => f.grave && f.grave.x === x && f.grave.y === y)) return false;
  if (data.items.some(it => !it.collected && it.x === x && it.y === y)) return false;
  return true;
}
/* How many walkable tiles the player could NOT reach from the spawn if these tiles were blocked. */
function cutOffCount(m, data, self, extraBlock) {
  const block = new Set(extraBlock ? [extraBlock] : []);
  fighters(data).forEach(f => {
    if (f === self) return;                       // the mover is represented by extraBlock
    if (!f.defeated) block.add(f.x + ',' + f.y);
    if (f.grave) block.add(f.grave.x + ',' + f.grave.y);
  });
  const seen = new Set([m.spawn.x + ',' + m.spawn.y]), q = [m.spawn];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const ax = c.x + dx, ay = c.y + dy, k = ax + ',' + ay;
      if (ax < 0 || ay < 0 || ax >= m.w || ay >= m.h || seen.has(k) || m.solid[ay][ax] || block.has(k)) continue;
      seen.add(k); q.push({ x: ax, y: ay });
    }
  }
  let cut = 0;
  m.reach.forEach((row, y) => row.forEach((ok, x) => { if (ok && !seen.has(x + ',' + y) && !block.has(x + ',' + y)) cut++; }));
  return cut;
}
/* A step is fine as long as it does not strand anyone who could get through before. A fighter who
   starts in a tight spot may always walk out of it. */
function stillConnected(m, data, self, nx, ny) { return stepKeepsVillageOpen(m, data, self, self.x, self.y, nx, ny); }

/* How many different tiles could a fighter step to if it stood at (x, y)? Used so nobody is placed
   somewhere they cannot walk away from. Uses exactly the rules the mover uses. */
function stepOptionsFrom(m, data, f, x, y) {
  const cfg = WANDER[kindOf(f)];
  let n = 0;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const nx = x + dx, ny = y + dy;
    if (Math.abs(nx - x) + Math.abs(ny - y) > cfg.leash) continue;
    if (!tileFreeForWander(m, data, nx, ny, f)) continue;
    if (!stepKeepsVillageOpen(m, data, f, x, y, nx, ny)) continue;   // same rule the mover applies
    n++;
  }
  return n;
}
/* Would a fighter moving from (x, y) to (nx, ny) leave anyone stranded who was not stranded before? */
function stepKeepsVillageOpen(m, data, f, x, y, nx, ny) {
  return cutOffCount(m, data, f, nx + ',' + ny) <= cutOffCount(m, data, f, x + ',' + y);
}

/* ---------- pick a step ---------- */
// A step back toward (tx, ty), preferring whichever axis is further off, with the other three
// directions as fallback so a blocked straight line still finds a way home.
function stepToward(m, data, f, tx, ty) {
  const dx = tx - f.x, dy = ty - f.y;
  const dirs = [];
  if (dx !== 0) dirs.push([dx > 0 ? 1 : -1, 0]);
  if (dy !== 0) dirs.push([0, dy > 0 ? 1 : -1]);
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(d => { if (!dirs.some(c => c[0] === d[0] && c[1] === d[1])) dirs.push(d); });
  for (const [ddx, ddy] of dirs) {
    const nx = f.x + ddx, ny = f.y + ddy;
    if (!tileFreeForWander(m, data, nx, ny, f)) continue;
    if (!stillConnected(m, data, f, nx, ny)) continue;
    return { x: nx, y: ny, dx: ddx, dy: ddy };
  }
  return null;
}
// Fighters wander outward a handful of steps, then loop back to retrace their way home before setting
// off again - a short there-and-back walk instead of an unbounded random drift, so their idle motion
// reads as a deliberate little patrol rather than jitter.
function wanderStep(m, data, f) {
  const cfg = WANDER[kindOf(f)];
  if (typeof f.homeX !== 'number') { f.homeX = f.x; f.homeY = f.y; }
  if (typeof f.tripSteps !== 'number') f.tripSteps = 0;
  if (typeof f.tripLen !== 'number') f.tripLen = 2 + Math.floor(Math.random() * 3);
  if (f.returning) {
    const step = stepToward(m, data, f, f.homeX, f.homeY);
    if (step && step.x === f.homeX && step.y === f.homeY) { f.returning = false; f.tripSteps = 0; f.tripLen = 2 + Math.floor(Math.random() * 3); }
    return step;
  }
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => Math.random() - 0.5);
  for (const [dx, dy] of dirs) {
    const nx = f.x + dx, ny = f.y + dy;
    if (Math.abs(nx - f.homeX) + Math.abs(ny - f.homeY) > cfg.leash) continue;
    if (!tileFreeForWander(m, data, nx, ny, f)) continue;
    if (!stillConnected(m, data, f, nx, ny)) continue;
    f.tripSteps++;
    if (f.tripSteps >= f.tripLen) f.returning = true;
    return { x: nx, y: ny, dx, dy };
  }
  // No room to wander further out - head home instead of getting stuck.
  f.returning = true;
  return stepToward(m, data, f, f.homeX, f.homeY);
}
function fighterEl(f) {
  return entityElsById.get(f.id) || null;
}
function moveFighter(f, to) {
  f.x = to.x; f.y = to.y;
  const el = fighterEl(f);
  if (el) {
    el.dataset.x = to.x; el.dataset.y = to.y;
    el.style.transition = `left ${GRAVE_MOVE_MS}ms ease-in-out, top ${GRAVE_MOVE_MS}ms ease-in-out`;
    el.style.setProperty('--x', to.x); el.style.setProperty('--y', to.y);
    el.style.zIndex = to.y * 2 + 1;
    const span = el.firstChild;
    if (span && to.dx) span.style.transform = `scaleX(${to.dx < 0 ? -1 : 1})`;
  }
}
const wanderPaused = () => inBattle || inScene || document.hidden || townPanel.classList.contains('hidden') ||
  !!document.querySelector('.overlay:not(.hidden)');

/* Fighters are on their own clocks so the village never moves in lockstep. */
function wanderTick() {
  if (!WANDER.enabled || !townWorld || wanderPaused()) return;
  const key = state.currentDistrict, m = getMap(key), data = ensureDistrictData(key), now = Date.now();
  fighters(data).forEach(f => {
    if (f.defeated) return;
    const cfg = WANDER[kindOf(f)];
    if (typeof f.nextMoveAt !== 'number') f.nextMoveAt = now + cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs);
    if (now < f.nextMoveAt) return;
    f.nextMoveAt = now + cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs);
    if (Math.random() > cfg.moveChance) return;
    const to = wanderStep(m, data, f);
    if (to) moveFighter(f, to);
  });
}
/* Spirits drift on their own, much simpler clock: no connectivity checks, they never block anything. */
function wanderSpiritsTick() {
  if (!WANDER.enabled || !townWorld || wanderPaused()) return;
  const key = state.currentDistrict, m = getMap(key), data = ensureDistrictData(key), now = Date.now();
  (data.spirits || []).forEach(s => {
    if (typeof s.nextMoveAt !== 'number' || s.nextMoveAt === 0) s.nextMoveAt = now + 2000 + Math.random() * 3000;
    if (now < s.nextMoveAt) return;
    s.nextMoveAt = now + 2500 + Math.random() * 3500;
    if (Math.random() > 0.55) return;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = s.x + dx, ny = s.y + dy;
      if (Math.abs(nx - s.homeX) + Math.abs(ny - s.homeY) > 4) continue;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.solid[ny][nx]) continue;
      if (state.playerPos.x === nx && state.playerPos.y === ny) continue;
      if (data.spirits.some(o => o !== s && o.x === nx && o.y === ny)) continue;
      s.x = nx; s.y = ny;
      const el = spiritElsById.get(s.id);
      if (el) { el.dataset.x = nx; el.dataset.y = ny; el.style.setProperty('--x', nx); el.style.setProperty('--y', ny); el.style.zIndex = ny * 2 + 1; }
      break;
    }
  });
}
setInterval(wanderSpiritsTick, 600);
setInterval(wanderTick, 400);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const data = ensureDistrictData(state.currentDistrict);
  fighters(data).forEach(f => { f.nextMoveAt = Date.now() + 800 + Math.random() * 1500; });   // no sudden jump on return
});

/* ---------- district bosses come and go on a clock: up for 30 minutes, gone for 30, in sync everywhere,
   so a boss fight is a thing you catch rather than something always on tap. Doesn't touch a defeated
   boss's grave/respawn timer - that's a separate mechanic and keeps running regardless of this cycle. ---------- */
const BOSS_CYCLE_MS = 30 * 60 * 1000;
const BOSS_WARN_MS = 3 * 60 * 1000;
function bossPhase(now) { return (now || Date.now()) % (BOSS_CYCLE_MS * 2) < BOSS_CYCLE_MS ? 'visible' : 'hidden'; }
function bossVisible(now) { return bossPhase(now) === 'visible'; }
function msUntilBossAppear(now) {
  now = now || Date.now();
  const t = now % (BOSS_CYCLE_MS * 2);
  return t < BOSS_CYCLE_MS ? 0 : (BOSS_CYCLE_MS * 2) - t;
}
let bossCycleState = { lastPhase: null, announced: false };
function checkBossCycle() {
  const now = Date.now();
  const phase = bossPhase(now);
  if (bossCycleState.lastPhase === null) { bossCycleState.lastPhase = phase; return; }   // don't animate on first load
  if (phase === 'hidden' && !bossCycleState.announced && msUntilBossAppear(now) <= BOSS_WARN_MS) {
    bossCycleState.announced = true;
    toast('⚠️ Something stirs nearby - the district boss returns soon.');
  }
  if (phase === bossCycleState.lastPhase) return;
  bossCycleState.lastPhase = phase;
  const data = ensureDistrictData(state.currentDistrict);
  const inTown = !townPanel.classList.contains('hidden') && !inBattle && !inScene;
  if (phase === 'hidden') {
    if (data.boss && !data.boss.defeated) {
      const el = fighterEl(data.boss);
      if (el) { el.classList.add('boss-vanish'); setTimeout(() => { if (inTown) renderTown(); }, 650); }
      if (inTown) toast(`👹 ${data.boss.name} has slipped away for now.`);
    }
    scheduleLocalNotify('boss', now + msUntilBossAppear(now), '👹 The boss is back', 'A district boss has returned - good luck!');
  } else {
    bossCycleState.announced = false;
    if (inTown) renderTown();
    if (data.boss && !data.boss.defeated) {
      const el = fighterEl(data.boss);
      if (el) el.classList.add('boss-appear-cycle');
      if (inTown) toast(`👹 ${data.boss.name} has returned!`);
    }
  }
}
setInterval(checkBossCycle, 5000);

/* ---------- graves ---------- */
function buryFighter(f) {
  f.defeated = true;
  f.defeatedAt = Date.now();
  f.grave = { x: f.x, y: f.y, at: Date.now(), ms: graveMs(f), epitaph: (f.isBoss ? BOSS_EPITAPHS : EPITAPHS)[Math.floor(Math.random() * (f.isBoss ? BOSS_EPITAPHS.length : EPITAPHS.length))] };
}
function graveLeft(f) { return f.grave ? Math.max(0, f.grave.ms - (Date.now() - f.grave.at)) : 0; }
function fmtLeft(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`; }
function migrateGraves(data) {
  let changed = false;
  fighters(data).forEach(f => {
    if (f.defeated && !f.grave) { f.grave = { x: f.x, y: f.y, at: f.defeatedAt || Date.now(), ms: graveMs(f), epitaph: EPITAPHS[0] }; changed = true; }
    if (typeof f.homeX !== 'number') { f.homeX = f.x; f.homeY = f.y; changed = true; }
  });
  return changed;
}
function returnFromGrave(data, f) {
  const m = getMap(state.currentDistrict), g = f.grave;
  f.grave = null;
  const near = [];
  for (let r = 0; r <= 4 && !near.length; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== r) continue;
      const x = g.x + dx, y = g.y + dy;
      if (spawnable(m, x, y) && tileFreeForWander(m, data, x, y, f) && stillConnected(m, data, f, x, y)) near.push({ x, y });
    }
  const roomy = near.filter(t => stepOptionsFrom(m, data, f, t.x, t.y) >= 2);
  const pool = roomy.length ? roomy : near;
  const spot = pool.length ? pool[Math.floor(Math.random() * pool.length)] : findFreeTile(data, f);
  f.x = spot.x; f.y = spot.y; f.homeX = spot.x; f.homeY = spot.y;
  if (!f.isBoss) f.name = randomNpcName(state.currentDistrict, namesInUse(data, f));
  f.deck = buildDeckForOpponent(DECK_SIZE, !!f.isBoss);
  f.rewardCard = randomCardId(rollRewardRarity(!!f.isBoss));
  f.defeated = false; f.defeatedAt = null; f.nextMoveAt = null; f.justArrived = true;
}
function tickGraves(data) {
  let changed = migrateGraves(data);
  fighters(data).forEach(f => { if (f.defeated && f.grave && graveLeft(f) <= 0) { returnFromGrave(data, f); changed = true; } });
  return changed;
}
function graveAt(data, x, y) { return fighters(data).find(f => f.defeated && f.grave && f.grave.x === x && f.grave.y === y) || null; }

/* ---------- walking toward someone who keeps moving ----------
   The walk loop asks chaseNextStep() before every step. If the person we are heading for has
   drifted, the route is worked out again from where we stand, so there is only ever one walker. */
let walkTarget = null;
function setChase(f) { walkTarget = f || null; }
function chaseNextStep(path, i) {
  const f = walkTarget;
  if (!f) return path;
  if (f.defeated) { walkTarget = null; return null; }
  const last = path[path.length - 1] || state.playerPos;
  if (Math.abs(last.x - f.x) + Math.abs(last.y - f.y) === 1) return path;             // still ends next to them
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
  const fresh = findPath(m, data, path[i - 1] || state.playerPos, adjacentTo(f));
  return fresh ? path.slice(0, i).concat(fresh) : null;
}


