/* =====================================================================================================================
   TOWN EFFECTS ON WEBGL (PixiJS)
   Light and particles in the town that the DOM cannot do cheaply, drawn in the town's own Pixi scene (js/town-gl.js) in a layer above the
   ground and trees. The layer is in WORLD units (64 per tile) inside the Pixi world, so everything scrolls with the map and scales with the
   camera for free. Prototype of the particles: pixi-lab.html ("Particle effects").
   - Fireflies at night (replaces the old screen-space DOM fireflies in js/player-fx.js, which now hide while this is drawing).
   - Leaves by day, coloured by season (green, pink petals in spring, orange and gold in autumn, none in winter), also replacing the DOM ones.
   - Embers rising from every lit lamp at night.
   - Glints on water: tiny stars that flash on the water tiles in view, by day and by night.
   - Ripples where she steps on a bridge, and a faint sparkle trail behind her when she walks (called from pfxStep in js/player-fx.js).
   - tfxBurst(rarity): a ring and a spray of motes at her feet when she pockets a card or item (called from pfxEmote), bigger for rarer loot.
   Rules:
   - It only draws when there is something to draw. A 1 second timer (tfxWatch) decides whether any ambient effect applies; the rAF loop runs
     at ~30 fps only while particles are alive or an ambient kind is wanted, and stops otherwise, so a quiet daytime winter town costs nothing.
   - Never required. Without the WebGL town (?renderer=dom, no WebGL, still loading), reduced motion, Character effects off, other tabs, a
     battle or a building scene, every tfx* function does nothing and the old DOM motes and rings are what the player sees.
   - The Pixi canvas is BEHIND the DOM entities, so a mote can pass behind a neighbour; that is why everything here is small and soft.
   Top-level names here all start with tfx / TFX so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
const TFX_FLIES = 16, TFX_FRAME_MS = 33;
const TFX_TIER = { common: 0, rare: 1, ultra: 2, super: 3, mythic: 4, divine: 5, atlas: 5 };
const TFX_SEASON_LEAVES = { spring: [0xf6a9c2, 0xffd0de, 0xffffff], summer: [0x7fb35a, 0x9fcf7a, 0xc6e58f], autumn: [0xe0782a, 0xc9452b, 0xe8b13a, 0xa8531f] };
let tfx = null, tfxRaf = 0, tfxLastFrame = 0, tfxTimer = 0, tfxNext = { leaf: 0, ember: 0, glint: 0 };

const tfxR = (a, b) => a + Math.random() * (b - a), tfxPick = a => a[Math.floor(Math.random() * a.length)];
function tfxRgb(name) { const m = typeof PFX_RARITY_RGB !== 'undefined' && PFX_RARITY_RGB[name]; const p = (m || '255,214,120').split(',').map(Number); return (p[0] << 16) | (p[1] << 8) | p[2]; }

// Can anything be drawn right now?
function tfxReady() {
  return typeof tglOn === 'function' && tglOn() && typeof pfxOn === 'function' && pfxOn() && btMotionOk() && !document.hidden &&
    !inBattle && !inScene && currentTab === 'town' && !!townView;
}
// The Pixi layer. Rebuilt if the town's Pixi app was replaced (a fallback and re-init).
function tfxLayer() {
  if (!tglOn()) return null;
  if (tfx && tfx.app !== tgl.app) { try { ppDestroy(tfx.sys); } catch (e) { /* gone with the app */ } tfx = null; }
  if (!tfx) {
    const layer = new PIXI.Container(); layer.sortableChildren = false; tgl.world.addChild(layer);
    tfx = { app: tgl.app, layer, sys: ppMake(layer, 260), flies: [], on: false };
  }
  return tfx;
}
// The part of the map the camera shows, in world units, with a margin.
function tfxView(pad) {
  const cam = tgl.cam.cur; if (!cam || !tgl.tp) return null;
  const s = tgl.tp / TGL_T, p = (pad || 0) * TGL_T;
  return { x0: -cam.cx / s - p, y0: -cam.cy / s - p, x1: (tgl.vw - cam.cx) / s + p, y1: (tgl.vh - cam.cy) / s + p };
}
function tfxTile(wx, wy) { const m = tgl.map; if (!m) return '.'; const x = Math.floor(wx / TGL_T), y = Math.floor(wy / TGL_T); return (m.rows[y] || '')[x] || ' '; }
const tfxIsWater = c => c === '~';
const tfxIsGrass = c => c !== '=' && c !== '#' && c !== '~' && c !== 'b' && c !== ' ';

// What this moment calls for.
function tfxWanted() {
  const night = townView.classList.contains('is-night'), wx = townView.dataset.wx || 'clear', season = townView.dataset.season || 'summer';
  const wet = wx === 'rain' || wx === 'storm' || wx === 'snow';
  return { fly: night && !wet, leaf: !night && !wet && season !== 'winter', ember: night && !!(typeof nlLamps !== 'undefined' && nlLamps && nlLamps.length), glint: true, season };
}

// ---- fireflies: a fixed handful that wander in the view and blink; they fade out when it is no longer night ----
function tfxFlies(t, dt, want, view) {
  const T = tfx;
  if (want && !T.flies.length) for (let i = 0; i < TFX_FLIES; i++) { const s = new PIXI.Sprite(T.sys.tex.glow); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = tfxPick([0xf4ff8a, 0xc8ff7a, 0xffe58a]); s.alpha = 0; T.layer.addChild(s); T.flies.push({ s, x: 0, y: 0, ph: tfxR(0, 6.28), sp: tfxR(0.5, 1.2), sz: tfxR(11, 18), fade: 0, placed: false }); }
  let live = 0;
  T.flies.forEach(f => {
    f.fade = Math.max(0, Math.min(1, f.fade + (want ? dt / 2 : -dt / 1.5)));
    if (want && view && (!f.placed || f.x < view.x0 - 80 || f.x > view.x1 + 80 || f.y < view.y0 - 80 || f.y > view.y1 + 80)) {
      for (let k = 0; k < 8; k++) { const x = tfxR(view.x0, view.x1), y = tfxR(view.y0, view.y1); if (tfxIsGrass(tfxTile(x, y)) || k === 7) { f.x = x; f.y = y; break; } }
      f.placed = true; f.fade = 0;
    }
    const bx = f.x + Math.sin(t * f.sp + f.ph) * 26 + Math.sin(t * f.sp * 2.3 + f.ph * 2) * 8, by = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 18;
    f.s.position.set(bx, by); f.s.scale.set(f.sz / 64);
    f.s.alpha = f.fade * (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 + f.ph * 3))); f.s.visible = f.fade > 0.01; if (f.s.visible) live++;
    f.x += Math.sin(t * 0.21 + f.ph) * dt * 7; f.y += Math.cos(t * 0.17 + f.ph) * dt * 5;   // the whole route drifts slowly
  });
  return want || live > 0;
}

function tfxSpawn(t, dt, want, view) {
  const S = tfx.sys, now = t;
  if (want.leaf && now > tfxNext.leaf) {
    tfxNext.leaf = now + (want.season === 'autumn' ? tfxR(0.35, 0.8) : tfxR(0.9, 1.9));
    const cols = TFX_SEASON_LEAVES[want.season] || TFX_SEASON_LEAVES.summer, petal = want.season === 'spring';
    ppEmit(S, { tex: 'leaf', add: false, tint: tfxPick(cols), x: tfxR(view.x0 - 40, view.x1), y: view.y0 - 20, vx: tfxR(14, 34), vy: tfxR(22, 42), drag: 1, life: tfxR(7, 11), s0: petal ? 11 : 14, s1: petal ? 9 : 12, a: 0.85, rot: tfxR(0, 6.28), vr: tfxR(-2.2, 2.2), bell: true, sway: { amp: tfxR(10, 22), freq: tfxR(1.1, 2) }, grow: 'lin' });
  }
  if (want.ember && now > tfxNext.ember) {
    tfxNext.ember = now + 0.16;
    const lamps = nlLamps.filter(l => { const x = (l.x + 0.5) * TGL_T, y = (l.y + 0.3) * TGL_T; return x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1; });
    if (lamps.length) { const l = tfxPick(lamps); ppEmit(S, { tex: 'glow', tint: tfxPick([0xffb347, 0xff9a2e, 0xffd27a]), x: (l.x + 0.5 + tfxR(-0.12, 0.12)) * TGL_T, y: (l.y + 0.25) * TGL_T, vx: tfxR(-6, 6), vy: tfxR(-16, -30), drag: 0.8, life: tfxR(1.2, 2), s0: tfxR(5, 8), s1: 1, a: 0.85, sway: { amp: 4, freq: 3 } }); }
  }
  if (want.glint && now > tfxNext.glint) {
    tfxNext.glint = now + tfxR(0.12, 0.3);
    for (let k = 0; k < 6; k++) {
      const x = tfxR(view.x0, view.x1), y = tfxR(view.y0, view.y1);
      if (tfxIsWater(tfxTile(x, y))) { const night = townView.classList.contains('is-night'); ppEmit(S, { tex: 'star', tint: night ? 0xcfe3ff : 0xeaf8ff, x, y, life: tfxR(0.8, 1.4), s0: tfxR(9, 16), s1: tfxR(9, 16), a: night ? 0.7 : 0.85, bell: true, rot: tfxR(-0.3, 0.3), vr: tfxR(-0.4, 0.4), drag: 1, grow: 'lin' }); break; }
    }
  }
}

// ---- the loop ----
function tfxFrame(now) {
  tfxRaf = 0;
  if (!tfxReady() || !tfxLayer()) { tfxStop(); return; }
  if (now - tfxLastFrame < TFX_FRAME_MS - 2) { tfxRaf = requestAnimationFrame(tfxFrame); return; }
  const dt = Math.min(0.06, (now - tfxLastFrame) / 1000 || 0.033), t = now / 1000; tfxLastFrame = now;
  const view = tfxView(0.5), want = tfxWanted(); townView.classList.add('tfx-on');
  let busy = false;
  if (view) { tfxSpawn(t, dt, want, view); busy = tfxFlies(t, dt, want.fly, view) || busy; }
  if (ppStep(tfx.sys, dt)) busy = true;
  if (!tgl.cam.raf) tglRender();   // while the camera glides, town-gl renders every frame itself
  if (busy || want.leaf || want.ember || (want.glint && tfxWaterInView(view))) tfxRaf = requestAnimationFrame(tfxFrame);
  else { tglRender(); }
}
function tfxWaterInView(view) {
  if (!view || !tgl.map) return false;
  const x0 = Math.max(0, Math.floor(view.x0 / TGL_T)), x1 = Math.min(tgl.map.w - 1, Math.floor(view.x1 / TGL_T)), y0 = Math.max(0, Math.floor(view.y0 / TGL_T)), y1 = Math.min(tgl.map.h - 1, Math.floor(view.y1 / TGL_T));
  for (let y = y0; y <= y1; y++) { const row = tgl.map.rows[y] || ''; for (let x = x0; x <= x1; x++) if (row[x] === '~') return true; }
  return false;
}
function tfxKick() { if (!tfxRaf && tfxReady() && tfxLayer()) { tfxLastFrame = 0; tfxRaf = requestAnimationFrame(tfxFrame); } }
function tfxStop() {
  if (tfxRaf) { cancelAnimationFrame(tfxRaf); tfxRaf = 0; }
  if (typeof townView !== 'undefined' && townView) townView.classList.remove('tfx-on');   // the old DOM motes come back
  if (tfx) { ppClear(tfx.sys); tfx.flies.forEach(f => { f.s.visible = false; f.fade = 0; f.placed = false; }); if (typeof tgl !== 'undefined' && tgl && tgl.app === tfx.app && tglOn()) tglRender(); }
}
// A once-a-second check, so the effects start and stop with the night, the weather and the screen the player is on without any other file telling us.
function tfxWatch() {
  if (!tfxReady()) { if (tfxRaf || (tfx && townView.classList.contains('tfx-on'))) tfxStop(); return; }
  townView.classList.add('tfx-on'); tfxKick();
}
// A new map: whatever was flying belongs to the old one.
function tfxReset() { if (tfx) { ppClear(tfx.sys); tfx.flies.forEach(f => { f.placed = false; f.fade = 0; f.s.visible = false; }); } tfxKick(); }

// ---- one-off effects ----
// Called from pfxStep with the tile she just left: a faint sparkle behind her, and a ripple where she stands on a bridge.
function tfxStep(from) {
  try {
    if (!tfxReady() || !tfxLayer()) return;
    const now = state.playerPos, S = tfx.sys, night = townView.classList.contains('is-night');
    for (let i = 0, k = night ? 2 : 1; i < k; i++) ppEmit(S, { tex: 'star', tint: night ? 0xffe9a8 : 0xfff3c8, x: (from.x + 0.5 + tfxR(-0.2, 0.2)) * TGL_T, y: (from.y + 0.85 + tfxR(-0.1, 0.1)) * TGL_T, vx: tfxR(-8, 8), vy: tfxR(-10, -22), drag: 0.5, life: tfxR(0.5, 0.9), s0: tfxR(7, 11), s1: 2, a: night ? 0.7 : 0.45 });
    if (tgl.map && (tgl.map.rows[now.y] || '')[now.x] === 'b') {
      const x = (now.x + 0.5) * TGL_T, y = (now.y + 0.9) * TGL_T;
      ppEmit(S, { tex: 'ring', tint: 0xcfeaff, x, y, life: 0.9, s0: 10, s1: 64, a: 0.7, drag: 1, w: 1, h: 0.55 });
      ppEmit(S, { tex: 'ring', tint: 0xcfeaff, x, y, life: 1.2, s0: 6, s1: 44, a: 0.5, drag: 1, w: 1, h: 0.55 });
    }
    tfxKick();
  } catch (e) { /* cosmetic only */ }
}
// Called when she has pocketed something: a ring on the ground and motes rising off her, more of both for rarer loot. Returns false when nothing was drawn.
function tfxBurst(rarity) {
  try {
    if (!tfxReady() || !tfxLayer()) return false;
    const tier = TFX_TIER[rarity] || 0, tint = tfxRgb(rarity), S = tfx.sys, x = (state.playerPos.x + 0.5) * TGL_T, y = (state.playerPos.y + 0.9) * TGL_T;
    ppEmit(S, { tex: 'glow', tint, x, y: y - 28, life: 0.35, s0: 30, s1: 120 + tier * 22, a: 0.8, drag: 1 });
    ppEmit(S, { tex: 'ring', tint, x, y, life: 0.7, s0: 12, s1: 110 + tier * 28, a: 0.9, drag: 1, w: 1, h: 0.6 });
    if (tier >= 2) ppEmit(S, { tex: 'ring', tint: 0xffffff, x, y, life: 0.95, s0: 8, s1: 150 + tier * 24, a: 0.6, drag: 1, w: 1, h: 0.6 });
    for (let i = 0, k = 8 + tier * 5; i < k; i++) ppEmit(S, { tex: i % 3 ? 'glow' : 'star', tint: i % 4 ? tint : 0xffffff, x: x + tfxR(-26, 26), y: y - tfxR(0, 30), vx: tfxR(-34, 34), vy: tfxR(-70, -170), ay: 60, drag: 0.5, life: tfxR(0.8, 1.5), s0: tfxR(8, 16), s1: 2 });
    tfxKick(); return true;
  } catch (e) { return false; }
}

tfxTimer = setInterval(tfxWatch, 1000);
document.addEventListener('visibilitychange', tfxWatch);
