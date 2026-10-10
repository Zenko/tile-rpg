/* ============================================================
   YOUR COTTAGE AS A ROOM
   ============================================================
   Inside your own cottage (scene id 'home') the stage is a small tile map you walk around instead of an emoji on a counter. The
   room is 9 x 11 tiles: a back wall with windows, the shelves, framed cards and trophy case, a front wall with the door, and floor
   in between. The camera is the town's: seven tiles across, following you, stopping at the room's edge.

   It reuses what the town already has, so it looks like the town: the tiles are `.town-tile`, the furniture is the r-* symbols in
   assets/sprites.js drawn through svgUse(), and the character is the real one (playerSpriteHTML / applyPlayerSprite, so the walk
   animation, facing, Alyn's turn pictures and the emoji fallback all come for free). Walking is the town's too: one tile every
   STEP_MS, taps find a path (breadth first, like findPath), a new tap cancels the old walk.

   It does NOT replace the scene, it sits in its stage. Each piece of furniture is one of the cottage's existing actions in
   INTERIORS.home (js/houses-and-cellar.js): walk up to it and the scene's own bubble and bottom sheet offer that action, and
   sceneAction() runs it exactly as before (mailbox list, shelves, framed cards, the altar, calm games, Tidy). While one of
   those is open, or a mini-game has taken over the stage, the room stays put and comes back with you where you left it.
   Walking onto the doormat leaves through the same fade as every other building (sceneAction('leave')).

   Hooks into houses-and-cellar.js: renderScene() calls hrSync() after drawing, and closeScene() calls hrLeave(). The room is built
   lazily into #scStage (a mini-game rebuilds that element, so hrMount() rebuilds the room when it finds it gone). There are no
   seasons or weather indoors: the colours are the fixed .hr-room tokens in css/latest.css. */
const HR_COLS = 9, HR_ROWS = 11, HR_START = { x: 4, y: 9 };
// Furniture: the action it opens (an id from INTERIORS.home), its tile, and the line the bubble says when you walk up to it. `tall`
// props hang on the back wall and rise one and a half tiles.
const HR_PROPS = [
  { act: 'nap', x: 1, y: 2, spr: 'r-armchair', name: 'Armchair', say: () => 'A sunny chair by the window. The cushion is still warm.' },
  { act: 'decorate', x: 3, y: 1, spr: 'r-shelf', tall: 1, name: 'The shelves', say: () => 'Room for a few more things.' },
  { act: 'favs', x: 4, y: 1, spr: 'r-frames', tall: 1, name: 'Framed cards', say: () => 'Your favourite cards, framed on the wall.' },
  { act: 'trophies', x: 6, y: 1, spr: 'r-trophy', tall: 1, name: 'Trophy case', say: () => 'Everything you have won so far.' },
  { act: 'altar', x: 7, y: 2, spr: 'r-altar', name: 'The altar', say: () => 'A small flame, always lit.' },
  { act: 'calm-sand', x: 2, y: 5, spr: 'r-sand', name: 'Sand garden', say: () => 'The sand is smooth, waiting for a rake.' },
  { act: 'calm-bonsai', x: 7, y: 5, spr: 'r-bonsai', name: 'Your bonsai', say: () => 'It looks a little taller than yesterday.' },
  { act: 'mg-tidy', x: 1, y: 8, spr: 'r-basket', name: 'Basket', say: () => 'Toys everywhere. Someone has been busy.' },
  { act: 'mail', x: 7, y: 8, spr: 'r-mail', name: 'Mailbox', say: () => unreadMail() ? `📬 ${unreadMail()} unread letter${unreadMail() === 1 ? '' : 's'} in the mailbox.` : 'The mailbox is empty for now.' }
];
const HR_DECO = [   // for looking at only
  { spr: 'r-window', x: 1, y: 1, tall: 1 }, { spr: 'r-sconce', x: 2, y: 1, tall: 1 }, { spr: 'r-clock', x: 5, y: 1, tall: 1 }, { spr: 'r-window', x: 7, y: 1, tall: 1 },
  { spr: 'r-door', x: 4, y: HR_ROWS - 1, door: 1 }, { spr: 'r-mat', x: 4, y: HR_ROWS - 2 }, { spr: 'r-toys', x: 2, y: 8 }
];
const HR_GLOWS = [   // warm light round the lamp and altar, daylight at the windows and the door
  { x: 7.5, y: 2.2, r: 3.2 }, { x: 2.5, y: 1.6, r: 3 }, { x: 4.5, y: HR_ROWS - 1.6, r: 3.4, day: 1 }, { x: 1.5, y: 1.9, r: 2.6, day: 1 }, { x: 7.5, y: 1.9, r: 2.6, day: 1 }
];
const homeRoom = { scene: null, host: null, world: null, player: null, ring: null, badge: null, rug: null, ro: null,
  t: 58, vw: 400, vh: 600, cx: 0, cy: 0, x: HR_START.x, y: HR_START.y, sel: null, walk: 0, hadModal: false };

function hrKind(x, y) { return y === 0 ? 'wt' : y === 1 ? 'wb' : y === HR_ROWS - 1 ? (x === 4 ? 'door' : 'ws') : (x === 0 || x === HR_COLS - 1) ? 'ws' : 'floor'; }
function hrPropAt(x, y) { return HR_PROPS.find(p => p.x === x && p.y === y) || null; }
function hrWalkable(x, y) { if (x < 0 || y < 0 || x >= HR_COLS || y >= HR_ROWS) return false; const k = hrKind(x, y); return (k === 'floor' || k === 'door') && !hrPropAt(x, y); }
function hrBfs(sx, sy, goal) {   // shortest path over walkable tiles, as [x, y] steps (null when there is none)
  if (goal(sx, sy)) return [];
  const key = (x, y) => y * HR_COLS + x, prev = { [key(sx, sy)]: -1 }, q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (!hrWalkable(nx, ny) || prev[key(nx, ny)] !== undefined) continue;
      prev[key(nx, ny)] = key(x, y);
      if (goal(nx, ny)) { const p = []; let c = key(nx, ny); while (c !== key(sx, sy)) { p.push([c % HR_COLS, (c / HR_COLS) | 0]); c = prev[c]; } return p.reverse(); }
      q.push([nx, ny]);
    }
  }
  return null;
}

/* ---------------- building the room ---------------- */
function hrWorldHtml() {
  let h = '<div class="hr-world snap">';
  for (let y = 0; y < HR_ROWS; y++) for (let x = 0; x < HR_COLS; x++) {
    const k = hrKind(x, y);
    if (k === 'floor' || k === 'door') h += `<div class="town-tile hr-f${1 + ((x * 7 + y * 13 + x * y) % 3)}" style="--x:${x};--y:${y}">${svgUse(((x + y * 2) & 1) ? 'r-plank-a' : 'r-plank-b')}</div>`;
    else h += `<div class="town-tile hr-${k}" style="--x:${x};--y:${y}"></div>`;
  }
  h += '<div class="hr-rug"></div>';
  HR_DECO.forEach(d => { h += `<div class="hr-prop deco${d.tall ? ' tall' : ''}${d.door ? ' door' : ''}" style="--x:${d.x};--y:${d.y}">${svgUse(d.spr)}</div>`; });
  HR_PROPS.forEach(p => { h += `<div class="hr-prop${p.tall ? ' tall' : ''}" style="--x:${p.x};--y:${p.y}">${svgUse(p.spr)}</div>`; });
  HR_GLOWS.forEach(g => { h += `<div class="hr-glow${g.day ? ' day' : ''}" data-x="${g.x}" data-y="${g.y}" data-r="${g.r}"></div>`; });
  return h + '<div class="hr-ring hidden"></div><div class="hr-badge hidden"></div><div class="ent player hr-player">' + playerSpriteHTML() + '</div></div>';
}
function hrMount() {
  const h = homeRoom;
  if (h.host && h.host.isConnected) return;
  if (h.ro) h.ro.disconnect();
  const stage = document.getElementById('scStage');
  h.host = document.createElement('div'); h.host.className = 'hr-room'; h.host.innerHTML = hrWorldHtml() + '<div class="hr-vignette"></div>';
  stage.appendChild(h.host);
  h.world = h.host.querySelector('.hr-world'); h.player = h.host.querySelector('.hr-player'); h.ring = h.host.querySelector('.hr-ring');
  h.badge = h.host.querySelector('.hr-badge'); h.rug = h.host.querySelector('.hr-rug');
  h.host.addEventListener('pointerdown', hrTap);
  h.ro = new ResizeObserver(() => hrLayout()); h.ro.observe(h.host);
  hrLayout();
}
function hrEnter() {   // a fresh visit starts just inside the door, facing the room
  const h = homeRoom; h.scene = scene; h.x = HR_START.x; h.y = HR_START.y; h.sel = null; h.hadModal = false; h.walk++;
  playerFaceFromMove({ x: HR_START.x, y: HR_START.y + 1 }, { x: HR_START.x, y: HR_START.y });
}
function hrLeave() {
  const h = homeRoom; h.walk++;
  if (h.ro) { h.ro.disconnect(); h.ro = null; }
  if (h.host) { h.host.remove(); h.host = null; h.world = h.player = null; }
  h.scene = null; h.sel = null; h.hadModal = false;
  if (typeof sceneView !== 'undefined') sceneView.classList.remove('room-on', 'hr-idle');
}

/* ---------------- camera, layout, the player ---------------- */
function hrLayout() {
  const h = homeRoom; if (!h.host || !h.world) return;
  const r = h.host.getBoundingClientRect(); if (!r.width || !r.height) return;
  h.vw = r.width; h.vh = r.height; h.t = Math.max(38, Math.ceil(h.vw / 7));
  h.host.style.setProperty('--t', h.t + 'px');
  h.world.style.width = HR_COLS * h.t + 'px'; h.world.style.height = HR_ROWS * h.t + 'px';
  h.rug.style.cssText = `left:${3 * h.t}px;top:${5 * h.t}px;width:${3 * h.t}px;height:${3 * h.t}px`;
  h.host.querySelectorAll('.hr-glow').forEach(g => { const d = g.dataset.r * h.t; g.style.cssText = `left:${g.dataset.x * h.t - d / 2}px;top:${g.dataset.y * h.t - d / 2}px;width:${d}px;height:${d}px`; });
  hrPlace(false); hrCamera(true); hrBadge(); hrMarks();
}
// Centre on the player like the town does, but never show past the room's edge; a room smaller than the view sits in the middle.
// The top is kept clear of the floating top bar.
function hrCamera(snap) {
  const h = homeRoom; if (!h.world) return;
  const hud = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-h')) || 72, top = hud + 6, bottom = 8, avail = h.vh - top - bottom;
  const px = (h.x + .5) * h.t, py = (h.y + .5) * h.t, rw = HR_COLS * h.t, rh = HR_ROWS * h.t;
  h.cx = rw <= h.vw ? (h.vw - rw) / 2 : Math.max(h.vw - rw, Math.min(0, h.vw / 2 - px));
  h.cy = rh <= avail ? top + (avail - rh) / 2 : Math.max(h.vh - bottom - rh, Math.min(top, top + avail / 2 - py));
  h.world.classList.toggle('snap', !!snap || !btMotionOk());
  h.world.style.transition = snap || !btMotionOk() ? 'none' : `transform ${STEP_MS}ms linear`;
  h.world.style.transform = `translate(${h.cx}px,${h.cy}px)`;
}
function hrPlace(animate) {
  const h = homeRoom, el = h.player; if (!el) return;
  el.style.transition = animate && btMotionOk() ? `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear` : 'none';
  el.style.setProperty('--x', h.x); el.style.setProperty('--y', h.y); el.style.zIndex = h.y * 10 + 5;
  const badge = el.querySelector('.pl-badge');
  if (badge) { badge.textContent = state.character.emoji; applyAvatarStyle(badge, state.character); }   // the emoji badge is the fallback when there is no drawn art
  else applyPlayerSprite(el, state.character, animate);
}
function hrBadge() {   // the unread count on the letter table
  const h = homeRoom; if (!h.badge) return;
  const m = HR_PROPS.find(p => p.act === 'mail'), n = unreadMail();
  h.badge.classList.toggle('hidden', !n); h.badge.textContent = n;
  h.badge.style.left = (m.x + .62) * h.t + 'px'; h.badge.style.top = (m.y + .02) * h.t + 'px';
}
// A ring round the furniture you are using (the bubble says what it is).
function hrMarks() {
  const h = homeRoom; if (!h.ring) return;
  const p = h.sel && HR_PROPS.find(q => q.act === h.sel);
  h.ring.classList.toggle('hidden', !p);
  if (!p) return;
  const top = p.tall ? p.y - .5 : p.y;
  h.ring.style.cssText = `left:${p.x * h.t + 3}px;top:${top * h.t + 3}px;width:${h.t - 6}px;height:${(p.tall ? 1.5 : 1) * h.t - 6}px`;
}

/* ---------------- walking and using furniture ---------------- */
function hrWalk(path, then) {
  const h = homeRoom, my = ++h.walk;
  h.player.classList.toggle('walking', path.length > 0);
  let i = 0;
  const next = () => {
    if (my !== h.walk || !h.player) return;
    if (i >= path.length) { h.player.classList.remove('walking'); hrArrive(then); return; }
    const [nx, ny] = path[i++];
    playerFaceFromMove({ x: h.x, y: h.y }, { x: nx, y: ny });
    h.x = nx; h.y = ny; hrPlace(true); hrCamera(false);
    setTimeout(next, btMotionOk() ? STEP_MS : 0);
  };
  next();
}
function hrArrive(prop) {
  const h = homeRoom;
  if (h.y === HR_ROWS - 1) { sceneAction('leave'); return; }   // the doorway: the usual fade back to the street
  if (prop) hrSelect(prop);
}
function hrSelect(p) {
  const h = homeRoom; if (!scene || scene.id !== 'home') return;
  playerFaceFromMove({ x: h.x, y: h.y }, { x: p.x, y: p.y }); hrPlace(false);
  h.sel = p.act; scene.text = p.say(); sfx('tap');
  renderScene();   // hrSync() puts the action in the sheet
}
function hrGoTo(p) {
  const h = homeRoom; if (!h.player) return;
  const path = hrBfs(h.x, h.y, (x, y) => Math.abs(x - p.x) + Math.abs(y - p.y) === 1);
  if (!path) { toast('Something is in the way.'); return; }
  hrWalk(path, p);
}
function hrTap(e) {
  const h = homeRoom;
  if (!h.world || doorFading || !scene || scene.mode || scene.leaving) return;   // a letter list or the shelves are open: the sheet is in charge
  const r = h.host.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left - h.cx) / h.t), ty = Math.floor((e.clientY - r.top - h.cy) / h.t);
  if (tx < 0 || ty < 0 || tx >= HR_COLS || ty >= HR_ROWS) return;
  const prop = hrPropAt(tx, ty) || (() => { const below = hrPropAt(tx, ty + 1); return below && below.tall ? below : null; })();   // a wall piece's top half counts too
  const path = prop ? null : (hrWalkable(tx, ty) ? hrBfs(h.x, h.y, (x, y) => x === tx && y === ty) : null);
  if (!prop && !path) return;
  if (h.sel) { h.sel = null; renderScene(); }   // any new tap puts the sheet away
  if (prop) hrGoTo(prop); else hrWalk(path, null);
}

/* ---------------- the scene around the room ---------------- */
// Called at the end of renderScene(). With nothing open the room fills the screen (.hr-idle); with a piece of furniture picked, or one of
// the cottage's own screens open, the stage shrinks to the usual size and the sheet shows the action, so the sheet never hides you.
function hrSync() {
  const h = homeRoom;
  if (!scene || scene.id !== 'home') { if (h.scene) hrLeave(); return; }
  const miniHome = typeof mini !== 'undefined' && !!mini && mini.house === 'home', modal = !!scene.mode || miniHome;
  if (h.scene !== scene) hrEnter();
  if (h.hadModal && !modal) h.sel = null;      // closed the mailbox, the shelves, a game: the room is free again
  h.hadModal = modal;
  sceneView.classList.toggle('room-on', !miniHome);
  if (miniHome) { sceneView.classList.remove('hr-idle'); return; }   // a mini-game owns the stage until it ends
  hrMount();
  if (!modal) {
    const acts = document.getElementById('scActions'), txt = document.getElementById('scText');
    const a = h.sel && INTERIORS.home.actions.find(x => x.id === h.sel);
    if (a) { const v = a.view ? a.view(a) : null; acts.innerHTML = sceneBtn(a.id, v ? v.label : a.label, v && v.disabled); txt.textContent = scene.text; }
    else { h.sel = null; acts.innerHTML = ''; scene.text = ''; txt.textContent = ''; }
  }
  sceneView.classList.toggle('hr-idle', !modal && !h.sel);
  hrBadge(); hrMarks();
}
