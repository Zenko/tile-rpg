/* ============================================================
   THE CELLAR'S DARK FLOORS: FOG OF WAR (build 109)
   Each floor of the Descent Map (js/cellar-run.js) is now a small dark room you walk through with a lantern. The doors are
   still the choices, but you have to find them first. Around them:

     🛢️ barrels   - smash for a few Embers
     🗝️ a key     - opens the 🔒 locked chest on the same floor (a boon and Embers)
     🐀 rats      - scurry across and knock your lantern: the light shrinks to one tile for a few steps
     🍄 glowcaps  - make the lantern burn bright for a few steps (three tiles)

   Tap any tile you have seen and you walk there, one step at a time. Walking onto a door opens it exactly as tapping the
   door did before; tapping the door you are standing on opens it again (after a lost fight, say). Nothing here can hurt your
   hearts: rats only dim the light. "Light the whole floor" shows everything at once, and Settings -> Comfort has a switch to
   turn exploring off altogether, which gives back the plain row of doors. The floor lives in the run (run.map) so a reload
   keeps your place, and it is rebuilt when you move to the next floor.
   ============================================================ */
const CRAWL_W = 7, CRAWL_H = 7;
const crawlOn = () => prefs.cellarFog !== false;
const crawlKey = (x, y) => x + ',' + y;
let crawlWalking = null;

function crawlGenerate(run, floor) {
  const W = CRAWL_W, H = CRAWL_H, rnd = n => Math.floor(Math.random() * n);
  for (let attempt = 0; attempt < 40; attempt++) {
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push(Math.random() < (attempt < 30 ? 0.2 : 0) && !(y >= H - 2 && x >= 2 && x <= 4) && y > 0 ? '#' : '.');
    const at = (x, y) => cells[y * W + x];
    const objs = {}, free = () => { for (let t = 0; t < 200; t++) { const x = rnd(W), y = 2 + rnd(H - 3); if (at(x, y) === '.' && !objs[crawlKey(x, y)] && !(x === 3 && y === H - 1)) return [x, y]; } return null; };
    // the doors along the top two rows, spread out
    const n = run.doors.length, cols = n === 1 ? [3] : [1, 3, 5];
    run.doors.forEach((d, i) => { const x = cols[i], y = Math.random() < 0.5 ? 0 : 1; cells[y * W + x] = '.'; if (y === 1) cells[0 * W + x] = at(x, 0); objs[crawlKey(x, y)] = { k: 'door', i }; });
    const put = (k, count) => { for (let c = 0; c < count; c++) { const p = free(); if (p) objs[crawlKey(p[0], p[1])] = { k }; } };
    put('barrel', 3 + rnd(2)); put('rat', 1 + (floor > 3 ? 1 : 0)); put('cap', 1);
    const hasLock = Math.random() < 0.7; if (hasLock) { put('key', 1); put('lock', 1); }
    // everything must be reachable from the start
    const start = [3, H - 1], seen = new Set([crawlKey(start[0], start[1])]), q = [start];
    while (q.length) { const [cx, cy] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy, k = crawlKey(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || cells[ny * W + nx] === '#') return; seen.add(k); q.push([nx, ny]); }); }
    if (Object.keys(objs).every(k => seen.has(k))) return { w: W, h: H, cells: cells.join(''), objs, pos: start, seen: {}, key: false, dim: 0, bright: 0, lit: false };
  }
  return null;
}
function crawlMap(run, floor) { if (!run.map || run.map.floor !== floor) { run.map = crawlGenerate(run, floor); if (run.map) run.map.floor = floor; } return run.map; }
const crawlCell = (m, x, y) => m.cells[y * m.w + x];
function crawlRadius(m) { return m.bright > 0 ? 3 : m.dim > 0 ? 1 : 2; }
function crawlVisible(m, x, y) { return m.lit || Math.hypot(x - m.pos[0], y - m.pos[1]) <= crawlRadius(m) + 0.35; }

const CRAWL_ICON = { barrel: '🛢️', key: '🗝️', rat: '🐀', cap: '🍄', lock: '🔒' };
function crawlGridHtml(st) {
  const run = cellarRun(st), m = crawlMap(run, st.floor); if (!m) return null;
  let html = '';
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const k = crawlKey(x, y), vis = crawlVisible(m, x, y); if (vis) m.seen[k] = 1;
    const known = !!m.seen[k], wall = crawlCell(m, x, y) === '#', o = m.objs[k], me = x === m.pos[0] && y === m.pos[1];
    let cls = 'cl-cell', glyph = '', label = 'Unexplored';
    if (!known) cls += ' fog';
    else if (wall) { cls += ' wall'; label = 'Wall'; }
    else {
      if (!vis) cls += ' dim';
      if (o) { glyph = o.k === 'door' ? CELLAR_DOORS[run.doors[o.i].k].icon : o.k === 'lock' ? '🧰' : CRAWL_ICON[o.k]; cls += ' obj ' + (o.k === 'door' ? 'door ' + run.doors[o.i].k : o.k); label = o.k === 'door' ? 'Door: ' + CELLAR_DOORS[run.doors[o.i].k].name : o.k === 'lock' ? 'Locked chest' : o.k; if (o.k === 'lock') glyph = m.key ? '🧰' : '🔒'; }
      else label = 'Floor';
    }
    if (me) { cls += ' me'; glyph = state.character.emoji; label = 'You'; }
    html += `<button type="button" class="${cls}" data-act="cell:${x},${y}" aria-label="${label}" ${wall || !known ? 'tabindex="-1"' : ''}>${glyph}</button>`;
  }
  return html;
}
function crawlDraw() {
  const grid = document.getElementById('clGrid'); if (!grid || !scene || scene.id !== 'cellar') return;
  const st = cellarState(), run = cellarRun(st); if (!run) return; const html = crawlGridHtml(st); if (html) grid.innerHTML = html;
  const m = run.map; const chips = document.getElementById('clChips');
  if (chips && m) chips.innerHTML = `<span class="chip">${m.bright > 0 ? '🔆 Bright' : m.dim > 0 ? '🔅 Dim' : '🔦 Lantern'}</span>${m.key ? '<span class="chip gold">🗝️ Key</span>' : ''}`;
  const say = document.getElementById('scText'); if (say && scene.text) say.textContent = scene.text;
  const me = grid.querySelector('.me'); if (me && me.scrollIntoView) me.scrollIntoView({ block: 'nearest', behavior: 'auto' });   // keep yourself on screen
}

// Walk toward a tile, one step every 150ms, and stop when something happens.
function crawlGo(x, y) {
  const st = cellarState(), run = cellarRun(st), m = run && run.map; if (!m || crawlWalking) return;
  const k = crawlKey(x, y); if (!m.seen[k] || crawlCell(m, x, y) === '#') return;
  if (x === m.pos[0] && y === m.pos[1]) { const o = m.objs[k]; if (o && o.k === 'door') crawlInteract(st, run, x, y); return; }
  const path = crawlPath(m, x, y); if (!path) { scene.text = 'You cannot get there from here.'; crawlDraw(); return; }
  const tick = () => {
    const step = path.shift(); if (!step) { clearInterval(crawlWalking); crawlWalking = null; return; }
    m.pos = step; sfx('step');
    const stop = crawlInteract(st, run, step[0], step[1]);
    if (!scene || scene.id !== 'cellar') { clearInterval(crawlWalking); crawlWalking = null; return; }
    if (m.dim > 0) m.dim--; if (m.bright > 0) m.bright--;
    crawlDraw();
    if (stop || !path.length) { clearInterval(crawlWalking); crawlWalking = null; saveState(); }
  };
  crawlWalking = setInterval(tick, 150); tick();
}
function crawlPath(m, tx, ty) {
  const key = crawlKey, prev = { [key(m.pos[0], m.pos[1])]: null }, q = [[m.pos[0], m.pos[1]]];
  while (q.length) { const c = q.shift(); if (c[0] === tx && c[1] === ty) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c[0] + dx, ny = c[1] + dy, k = key(nx, ny); if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || k in prev || crawlCell(m, nx, ny) === '#' || !m.seen[k]) return; prev[k] = c; q.push([nx, ny]); }); }
  if (!((tx + ',' + ty) in prev)) return null;
  const out = []; let cur = [tx, ty]; while (cur && !(cur[0] === m.pos[0] && cur[1] === m.pos[1])) { out.unshift(cur); cur = prev[key(cur[0], cur[1])]; } return out;
}
// What happens when you step on a tile. Returns true if the walk should stop there.
function crawlInteract(st, run, x, y) {
  const m = run.map, k = crawlKey(x, y), o = m.objs[k]; if (!o) return false;
  if (o.k === 'barrel') { const n = 1 + Math.floor(Math.random() * 3); addPebbles(n, 'cellar'); delete m.objs[k]; scene.text = `You smash a barrel: +${n} 🫧.`; sfx('tap'); buzz(HAP.tap); return false; }
  if (o.k === 'key') { m.key = true; delete m.objs[k]; scene.text = 'A rusty key, wedged behind a crate. Somewhere on this floor a chest is locked.'; sfx('claim'); return false; }
  if (o.k === 'cap') { m.bright = 10; delete m.objs[k]; scene.text = 'A glowcap. Your lantern burns bright for a few steps.'; sfx('found'); return false; }
  if (o.k === 'rat') { m.dim = 8; delete m.objs[k]; scene.text = 'A rat darts under your feet and knocks your lantern. The light shrinks for a few steps.'; sfx('soft'); return true; }
  if (o.k === 'lock') {
    if (!m.key) { scene.text = 'The chest is locked. There must be a key on this floor.'; sfx('tie'); return true; }
    m.key = false; delete m.objs[k]; const p = cellarPebblesFor(5 + st.floor, st); addPebbles(p, 'cellar');
    scene.text = `The key turns. +${p} 🫧. ` + cellarGainBoon(st); sfx('claim'); return true;
  }
  if (o.k === 'door') { clearInterval(crawlWalking); crawlWalking = null; saveState(); sceneAction('door:' + o.i); return true; }
  return false;
}
function crawlLightAll() { const st = cellarState(), run = cellarRun(st), m = run && run.map; if (!m) return; m.lit = true; scene.text = 'You hold the lantern high and the whole floor glows.'; sfx('found'); saveState(); renderScene(); }
