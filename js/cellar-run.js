/* ============================================================
   THE CELLAR AS A DESCENT MAP (build 107)
   The cellar used to be a list: one button per floor, fight, repeat. Now every floor is a choice of doors:

     ⚔️ Skirmish  - the floor's battle (the same themed decks and deep foes as before), pays Pebbles
     🧰 Chest     - Pebbles, or a boon
     🔥 Campfire  - restores a heart
     ⛩️ Shrine    - a boon
     🧳 Peddler   - sells a boon for Pebbles
     👁️ Guardian  - every 5th floor (and the Root Keeper on floor 3) is a single door: a hard fight and a prize card

   A run has three hearts. Losing or yielding a fight costs one (you pick a door again); at zero the run ends, the cellar
   rests for its usual five minutes and your deepest floor is kept. Boons last for the run: they are read through
   skillBonus() (js/skills-gear.js) while a cellar fight is on, so they need no new battle hooks. Leaving the cellar does
   not end a run; "Climb out" does. The run lives in the cellar's building state (st.run), so it survives a reload.
   The battle itself, its prizes and the guardian cards are unchanged (js/houses-and-cellar.js: dungeonWin / dungeonLoss).
   ============================================================ */
const CELLAR_HEARTS = 3;
const CELLAR_BOONS = [
  { id: 'skin',   icon: '🛡️', name: 'Thick Skin',  text: '+2 Spirit at the start of cellar fights', kind: 'startSpirit', val: 2 },
  { id: 'sharp',  icon: '🗡️', name: 'Sharp Start', text: 'Draw 1 extra card in cellar fights',       kind: 'startDraw',   val: 1 },
  { id: 'lucky',  icon: '🍀', name: 'Lucky Penny', text: 'Fights and chests pay 25% more Pebbles' },
  { id: 'warm',   icon: '🔥', name: 'Warm Hands',  text: 'Campfires restore one more heart' },
  { id: 'moss',   icon: '🌱', name: 'Mossy Boots', text: 'The peddler charges less' },
  { id: 'wick',   icon: '🕯️', name: 'Long Wick',   text: '+1 heart now, and one more at most' },
];
const CELLAR_DOORS = {
  fight: { icon: '⚔️', name: 'Skirmish', weight: 3 }, chest: { icon: '🧰', name: 'Chest', hint: 'Pebbles or a boon', weight: 2 },
  camp:  { icon: '🔥', name: 'Campfire', hint: 'Restore a heart', weight: 1.2 }, shrine: { icon: '⛩️', name: 'Shrine', hint: 'Gain a boon', weight: 1.2 },
  shop:  { icon: '🧳', name: 'Peddler', hint: 'Buy a boon', weight: 1 }, boss: { icon: '👁️', name: 'Guardian', weight: 0 },
};
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

function cellarDoors(floor, run) {
  if (cellarIsGuardian(floor)) return [{ k: 'boss' }];
  const hurt = run && run.hearts < cellarMaxHearts(run), kinds = Object.keys(CELLAR_DOORS).filter(k => k !== 'boss' && k !== 'fight');
  const weight = k => CELLAR_DOORS[k].weight * (k === 'camp' ? (hurt ? 1.8 : 0.3) : 1);
  const picks = ['fight'];
  while (picks.length < 3) {
    const pool = kinds.filter(k => !picks.includes(k)), total = pool.reduce((n, k) => n + weight(k), 0); let r = Math.random() * total, pick = pool[0];
    for (const k of pool) { r -= weight(k); if (r < 0) { pick = k; break; } }
    picks.push(pick);
  }
  for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  return picks.map(k => ({ k }));
}
function cellarNewRun(st) { st.run = { hearts: CELLAR_HEARTS, boons: [], doors: [] }; st.inRun = true; st.run.doors = cellarDoors(st.floor, st.run); return st.run; }
// Moving to the next floor: bump the record and deal new doors.
function cellarAdvance(st) {
  if (cellarRun(st)) cellarRun(st).map = null;   // a new floor is a new dark room (js/cellar-crawl.js)
  state.progress.cellarBest = Math.max(state.progress.cellarBest || 0, st.floor); st.best = Math.max(st.best || 0, st.floor);
  const run = cellarRun(st); if (run) run.doors = cellarDoors(st.floor, run);
  saveState();
}
function cellarGainBoon(st) {
  const run = cellarRun(st), left = CELLAR_BOONS.filter(b => !run.boons.includes(b.id));
  if (!left.length) { const p = cellarPebblesFor(8, st); addPebbles(p, 'cellar'); return `You already carry every boon. +${p} 🫧 instead.`; }
  const b = left[Math.floor(Math.random() * left.length)]; run.boons.push(b.id);
  if (b.id === 'wick') run.hearts = Math.min(cellarMaxHearts(run), run.hearts + 1);
  sfx('found'); return `A boon: ${b.icon} ${b.name}. ${b.text}.`;
}

// Resolves a non-fight door. Returns the line to show.
function cellarOpenDoor(st, i) {
  const run = cellarRun(st), d = run && run.doors[i]; if (!d) return '';
  let line = '';
  if (d.k === 'chest') {
    if (Math.random() < 0.55) { const p = cellarPebblesFor((4 + st.floor) * (eventIs('cellar-night') ? 2 : 1), st); addPebbles(p, 'cellar'); line = `A dusty chest creaks open: +${p} 🫧.`; sfx('claim'); } else line = 'Under the lid, something glows. ' + cellarGainBoon(st);
  } else if (d.k === 'camp') {
    const heal = 1 + (cellarHasBoon('warm', st) ? 1 : 0), before = run.hearts; run.hearts = Math.min(cellarMaxHearts(run), run.hearts + heal);
    line = run.hearts > before ? `You warm your hands by the fire. ${'♥'.repeat(run.hearts - before)} restored.` : 'You rest by the fire. Your hearts are already full, so you just enjoy it.'; sfx('soft');
  } else if (d.k === 'shrine') { line = 'You kneel at the little shrine. ' + cellarGainBoon(st); }
  else if (d.k === 'shop') {
    const cost = cellarHasBoon('moss', st) ? PEDDLER_COST_MOSS : PEDDLER_COST;
    if (state.progress.pebbles >= cost && run.boons.length < CELLAR_BOONS.length) { spendPebbles(cost, 'cellar'); line = `The peddler wraps something up for 🫧 ${cost}. ` + cellarGainBoon(st); }
    else line = `The peddler sells boons for 🫧 ${cost}. ${run.boons.length >= CELLAR_BOONS.length ? 'You have them all.' : 'You are short, so you nod and move on.'}`;
  }
  st.floor++; cellarAdvance(st); return line;
}

// What the player sees: hearts and boons, then a door per choice.
function cellarMapHtml(st) {
  const run = cellarRun(st), max = cellarMaxHearts(run);
  const hearts = Array.from({ length: max }, (_, i) => `<span class="cl-heart${i < run.hearts ? ' on' : ''}">♥</span>`).join('');
  const boons = run.boons.map(id => { const b = CELLAR_BOONS.find(x => x.id === id); return `<span class="cl-boon" title="${b.name}: ${b.text}">${b.icon} ${b.name}</span>`; }).join('') || '<span class="cl-none">No boons yet</span>';
  const f = cellarFloor(st.floor);
  // Exploring on (js/cellar-crawl.js): a dark room to walk through instead of a row of doors.
  if (crawlOn()) {
    const g = crawlGridHtml(st);
    if (g) {
      const m = run.map;
      return `<div class="cl-hud"><div class="cl-hearts" aria-label="${run.hearts} of ${max} hearts">${hearts}</div><div class="cl-boons">${boons}</div></div>
        <div class="cl-chips" id="clChips"><span class="chip">${m.bright > 0 ? '🔆 Bright' : m.dim > 0 ? '🔅 Dim' : '🔦 Lantern'}</span>${m.key ? '<span class="chip gold">🗝️ Key</span>' : ''}</div>
        <div class="cl-grid" id="clGrid" role="group" aria-label="The dark floor. Tap a tile you can see to walk there.">${g}</div>
        ${m.lit ? '' : '<button type="button" class="cl-light" data-act="lightall">💡 Light the whole floor</button>'}`;
    }
  }
  const doors = run.doors.map((d, i) => {
    const def = CELLAR_DOORS[d.k], fight = d.k === 'fight' || d.k === 'boss';
    const icon = fight ? f.icon : def.icon, name = d.k === 'boss' ? f.name : def.name, hint = fight ? (d.k === 'boss' ? 'Guardian · prize card' : f.name) : def.hint;
    return `<button type="button" class="cl-door ${d.k}" data-act="door:${i}" aria-label="${name}${hint ? ', ' + hint : ''}"><span class="cl-door-ico">${icon}</span><b>${d.k === 'fight' ? 'Skirmish' : name}</b><small>${hint}</small></button>`;
  }).join('');
  return `<div class="cl-hud"><div class="cl-hearts" aria-label="${run.hearts} of ${max} hearts">${hearts}</div><div class="cl-boons">${boons}</div></div><div class="cl-doors n${run.doors.length}">${doors}</div>`;
}

// Torches and barrels around the stage, drawn once while the cellar scene is open.
function cellarDecorateStage(on) {
  const stage = document.getElementById('scStage'); if (!stage) return;
  stage.classList.toggle('is-cellar', !!on);
  const have = stage.querySelector('.cl-deco');
  if (!on) { if (have) have.remove(); return; }
  if (have) return;
  stage.insertAdjacentHTML('beforeend', '<div class="cl-deco" aria-hidden="true"><span class="cl-torch l">🔥</span><span class="cl-torch r">🔥</span><span class="cl-web">🕸️</span><span class="cl-barrels">🛢️ 📦 🛢️</span><i class="cl-drip"></i></div>');
}
