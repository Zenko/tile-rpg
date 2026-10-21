/* ============================================================
   THE CELLAR RUN: hearts, boons and the record (build 107; the floors themselves are a world since build 300, js/cellar-world.js)
   A run has three hearts. Losing or yielding a fight costs one; at zero the run ends, the cellar rests for its usual five minutes and
   your deepest floor is kept. Boons last for the run: they are read through skillBonus() (js/skills-gear.js) while a cellar fight is on,
   so they need no new battle hooks. Leaving the cellar does not end a run; "Climb out for good" does. The run lives in the cellar's building
   state (st.run), so it survives a reload. What you find along the way (a campfire, a shrine, a peddler, chests) lives on the floor's
   map in js/cellar-world.js and calls cellarGainBoon() and the helpers below.
   ============================================================ */
const CELLAR_HEARTS = 3;
const CELLAR_BOONS = [
  { id: 'skin',   icon: '🛡️', name: 'Thick Skin',  text: '+2 Calm at the start of cellar fights', kind: 'startSpirit', val: 2 },
  { id: 'sharp',  icon: '🗡️', name: 'Sharp Start', text: 'Draw 1 extra card in cellar fights',       kind: 'startDraw',   val: 1 },
  { id: 'lucky',  icon: '🍀', name: 'Lucky Penny', text: `Fights and chests pay 25% more ${GAME.currency.many}` },
  { id: 'warm',   icon: '🔥', name: 'Warm Hands',  text: 'Campfires restore one more heart' },
  { id: 'moss',   icon: '🌱', name: 'Mossy Boots', text: 'The peddler charges less' },
  { id: 'wick',   icon: '🕯️', name: 'Long Wick',   text: '+1 heart now, and one more at most' },
];
const PEDDLER_COST = 12, PEDDLER_COST_MOSS = 8;

function cellarRun(st) { return st && st.run && typeof st.run === 'object' ? st.run : null; }
function cellarHasBoon(id, st) { const r = cellarRun(st || cellarState()); return !!(r && r.boons.includes(id)); }
function cellarMaxHearts(run) { return CELLAR_HEARTS + (run.boons.includes('wick') ? 1 : 0); }
function cellarIsGuardian(i) { const f = cellarFloor(i); return !!(f.final || f.guardian); }
function cellarPebblesFor(base, st) { return Math.round(base * (cellarHasBoon('lucky', st) ? 1.25 : 1)); }

// Boon effects during a cellar fight, summed into skillBonus().
function cellarRunBonus(kind) {
  if (typeof inBattle === 'undefined' || !inBattle || typeof battle === 'undefined' || !battle || !battle.npc || !battle.npc.dungeon) return 0;
  const run = cellarRun(cellarState()); if (!run) return 0;
  let v = 0; run.boons.forEach(id => { const b = CELLAR_BOONS.find(x => x.id === id); if (b && b.kind === kind) v += b.val; });
  return v;
}

function cellarNewRun(st) { st.run = { hearts: CELLAR_HEARTS, boons: [], seed: Math.random().toString(36).slice(2, 8), fl: null }; st.inRun = true; return st.run; }
// Taking the stairs down: the record moves on (the floor itself is made by cellarMakeFloor, js/cellar-world.js).
function cellarAdvance(st) {
  state.progress.cellarBest = Math.max(state.progress.cellarBest || 0, st.floor); st.best = Math.max(st.best || 0, st.floor);
  saveState();
}
function cellarGainBoon(st) {
  const run = cellarRun(st), left = CELLAR_BOONS.filter(b => !run.boons.includes(b.id));
  if (!left.length) { const p = cellarPebblesFor(8, st); addPebbles(p, 'cellar'); return `You already carry every boon. +${p} 🫧 instead.`; }
  const b = left[Math.floor(Math.random() * left.length)]; run.boons.push(b.id);
  if (b.id === 'wick') run.hearts = Math.min(cellarMaxHearts(run), run.hearts + 1);
  sfx('found'); return `A boon: ${b.icon} ${b.name}. ${b.text}.`;
}
