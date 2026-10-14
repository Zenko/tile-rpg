/* ============================================================
   RIFT ATLAS (build 258)
   Journal -> Rifts: every puddle world you have been to, collected. Four rows to fill - the kinds of world (PW_KINDS), the
   palettes (PW_BIOMES), the shapes of a wander world (PW_SHAPES) and the four family portals (FAMILIES) - and the last
   few worlds, with how you got in and what you found. Something new in a row pays RIFT_NEW_PEBBLES; finishing a row pays its
   Embers and its souvenir, a decoration (DECORATION_ITEMS with `rift: true`, content/items.js) that is never sold in the
   shop and goes where any decoration goes: the town, or your cottage.

   - Saved in state.progress.rifts = { seen: { kinds: { maze: firstAt }, palettes, shapes, families }, done: { kinds: at },
     log: [{ name, kind, biome, family, via, at, found, end }] (newest first, RIFT_LOG_MAX), visits }.
   - Hooks (typeof-guarded): pwEnter's go() calls riftNoteEnter(w, via); pwLeave's back() calls riftNoteLeave(w, why, found).
     Every row is worked out from the world record alone, so a row with more entries later (a new kind of world, a new
     palette) simply shows the new ones as not found yet.
   Look: the RIFT ATLAS block at the end of css/latest.css. tests/rift-atlas.test.js.
   ============================================================ */
const RIFT_NEW_PEBBLES = 2, RIFT_LOG_MAX = 12;
const RIFT_KIND_LABEL = { explore: 'Wander', maze: 'Maze', ladders: 'Ladders', deep: 'The deep' };
const RIFT_KIND_ICON = { explore: '🔎', maze: '🧭', ladders: '🎲', deep: '🐠' };
const RIFT_BIOME_ICON = { 'pw-glass': '🔷', 'pw-ember': '🔥', 'pw-mirror': '🪞', 'pw-bloom': '🌸', 'pw-static': '⚡', 'pw-tide': '🌊', 'pw-dusk': '🌆', 'pw-reef': '🪸', 'pw-abyss': '🌑' };
const RIFT_ROWS = [
  { id: 'kinds', title: 'Kinds of world', souvenir: 'rift-hourglass', pebbles: 30,
    list: () => Object.keys(PW_KINDS).map(k => ({ key: k, label: RIFT_KIND_LABEL[k] || k, icon: RIFT_KIND_ICON[k] || '🌀' })), of: w => w.kind },
  { id: 'palettes', title: 'Palettes', souvenir: 'rift-prism', pebbles: 40,
    list: () => PW_BIOMES.map(b => ({ key: b.id, label: b.word, icon: RIFT_BIOME_ICON[b.id] || '🎨' })), of: w => w.biome },
  { id: 'shapes', title: 'Shapes of a wander world', souvenir: 'rift-planet', pebbles: 30,
    list: () => Object.keys(PW_SHAPES).map(s => ({ key: s, label: PW_SHAPES[s][0], icon: '🗺️' })), of: w => (w.kind === 'explore' ? w.shape : null) },
  { id: 'families', title: 'Family portals', souvenir: 'rift-lotus', pebbles: 40,
    list: () => Object.keys(FAMILIES).map(f => ({ key: f, label: FAMILIES[f].name, icon: FAMILIES[f].icon })), of: w => w.family }
];

function riftState() {
  const p = state.progress;
  if (!p.rifts || typeof p.rifts !== 'object') p.rifts = {};
  const r = p.rifts;
  r.seen = r.seen || {}; RIFT_ROWS.forEach(row => { r.seen[row.id] = r.seen[row.id] || {}; });
  r.done = r.done || {}; r.log = Array.isArray(r.log) ? r.log : []; r.visits = r.visits || 0;
  return r;
}
function riftRowCount(row) { const seen = riftState().seen[row.id], keys = row.list().map(e => e.key); return { have: keys.filter(k => seen[k]).length, of: keys.length }; }

// A world has just begun: note it, pay for anything new, and finish any row it completes.
function riftNoteEnter(w, via) {
  if (!w) return;
  const r = riftState(), now = Date.now(), fresh = [];
  r.visits++;
  r.log.unshift({ name: w.name, kind: w.kind, biome: w.biome, family: w.family || null, via: via === 'portal' || via === 'daily' ? via : 'puddle', at: now, found: 0, end: null });
  r.log.length = Math.min(r.log.length, RIFT_LOG_MAX);
  RIFT_ROWS.forEach(row => {
    const key = row.of(w); if (!key || r.seen[row.id][key]) return;
    if (!row.list().some(e => e.key === key)) return;
    r.seen[row.id][key] = now; fresh.push(row.list().find(e => e.key === key).label);
  });
  if (fresh.length) {
    addPebbles(RIFT_NEW_PEBBLES * fresh.length, 'rifts');
    logEvent('🗺️', `New in your Rift Map: ${fresh.join(', ')}.`);
    setTimeout(() => toast(`🗺️ New in your Rift Map: ${fresh.join(', ')} · +${RIFT_NEW_PEBBLES * fresh.length} 🫧`), 2600);
  }
  RIFT_ROWS.forEach(row => {
    const c = riftRowCount(row);
    if (r.done[row.id] || c.have < c.of) return;
    r.done[row.id] = now;
    const def = DECORATION_ITEMS.find(d => d.id === row.souvenir);
    if (def) state.decorationInventory[def.id] = decorationInventoryCount(def.id) + 1;
    addPebbles(row.pebbles, 'rifts');
    bumpStat('riftRows', 1);
    logEvent('🗺️', `Rift Map: every one of "${row.title}" found${def ? ` - ${def.name} souvenir` : ''}.`);
    setTimeout(() => { toast(`🗺️ Rift Map row complete: ${row.title}! ${def ? `${def.icon} ${def.name} is in your decorations, ` : ''}+${row.pebbles} 🫧`); sfx('gift'); }, 5200);
  });
  saveState();
}
// A world has ended: what came of it.
function riftNoteLeave(w, why, found) {
  if (!w) return;
  const e = riftState().log.find(x => x.name === w.name && !x.end); if (!e) return;
  e.end = why || 'faded'; e.found = found || 0;
}

/* ---------------- the page (Journal -> Rifts) ---------------- */
function riftWhen(at) {
  const d = new Date(at), now = new Date();
  return d.toDateString() === now.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function renderRiftAtlas() {
  const el = document.getElementById('riftList'); if (!el) return;
  const r = riftState(), esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s));
  const rows = RIFT_ROWS.map(row => {
    const c = riftRowCount(row), def = DECORATION_ITEMS.find(d => d.id === row.souvenir), seen = r.seen[row.id];
    const chips = row.list().map(e => {
      const got = !!seen[e.key];
      const face = `<b>${got ? e.icon : '❔'}</b>`;
      return `<span class="ra-chip${got ? ' got' : ''}" title="${esc(got ? e.label : 'Not found yet')}">${face}${got ? `<em>${esc(e.label)}</em>` : ''}</span>`;
    }).join('');
    const prize = def ? `<span class="ra-prize${r.done[row.id] ? ' won' : ''}" title="${esc(def.name)}">${def.icon}<small>${r.done[row.id] ? 'Yours' : `+${row.pebbles} 🫧`}</small></span>` : '';
    return `<section class="ra-row"><header><h3>${esc(row.title)}</h3><span class="ra-count">${c.have}/${c.of}</span>${prize}</header><div class="ra-chips">${chips}</div></section>`;
  }).join('');
  const recent = r.log.length ? r.log.map(e => {
    const fam = e.family && FAMILIES[e.family] ? FAMILIES[e.family].icon + ' ' : '';
    const end = !e.end ? 'still open' : e.end === 'done' ? 'finished' : e.end === 'left' ? 'climbed out' : 'faded';
    return `<li><span class="ra-ico">${RIFT_KIND_ICON[e.kind] || '🌀'}</span><div><b>${fam}${esc(e.name)}</b><small>${e.via === 'daily' ? 'The Daily Rift' : e.via === 'portal' ? 'Through a portal' : 'Through a puddle'} · ${end}${e.found ? ` · ${e.found} new card${e.found === 1 ? '' : 's'}` : ''}</small></div><time>${riftWhen(e.at)}</time></li>`;
  }).join('') : `<li class="ra-empty">No worlds yet. Splash through puddles in the rain, or walk into a portal when one opens.</li>`;
  el.innerHTML = (typeof dailyRiftHtml === 'function' ? dailyRiftHtml() : '') + `<p class="ra-intro">${r.visits} world${r.visits === 1 ? '' : 's'} visited. Something new in a row pays ${RIFT_NEW_PEBBLES} 🫧; a full row pays more and leaves you a souvenir to place in town or in your cottage.</p>${rows}<h3 class="ra-h">Recent worlds</h3><ul class="ra-log">${recent}</ul>`;
}
