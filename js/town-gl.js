/* =====================================================================================================================
   TOWN GROUND ON WEBGL (PixiJS)
   The town used to be one <div> per tile (plus an <svg><use> for every tree, flower and ripple): about 650 elements for the 16 x 17
   El Umbral, all restyled and re-composited as the map moved, and a hard limit on how big a map could be. This file draws the GROUND
   (tiles, trees, hedges, rocks, flowers, tufts, pebbles, cobbles, ripples, bridges) with PixiJS instead, into one canvas behind the
   entity layer. Only the tiles near the camera are ever in the scene, so a 200 x 200 map costs about the same as El Umbral.
   What stays DOM, on purpose: every entity (player, neighbors, boss, cards, spirits, crops, decorations, companion, props, birds...),
   the buildings (.bld), the sky/vignette/weather layers and all the tap / look-around logic. They carry a lot of per-kind CSS and
   behaviour in other files, and there are only a few dozen of them.
   How it fits together (see pixi-lab.html for the same drawing code in a standalone page):
   - Ground tiles are drawn ONCE by Canvas2D into one atlas texture (3 grass tones, 16 path and 16 water edge masks) so they batch into one
     draw call. Sprites are the game's own SVG <symbol>s with their var(--token) colours replaced by the values computed on #townView for
     the current biome, season and theme, rasterised once. A change of any of those (a MutationObserver watches them) rebuilds the textures.
   - Ground sprites live in 8 x 8 chunks made the first time they scroll into view. Trees are added to / removed from a y-sorted layer as
     their tile enters / leaves the view window.
   - The camera is driven from JS (tglCamera): each frame it moves #townWorld (the DOM entity layer), the Pixi world and the front canvas
     together, so ground and entities can never drift apart. Walking tweens over STEP_MS like the old CSS transition; reduced motion snaps.
   - Occlusion: entities used to sit behind a tree's overhang by z-index. The Pixi canvas is BEHIND the entity layer, so the top sixth of
     every tree whose north tile is walkable is redrawn on a thin 2D canvas IN FRONT of the entities (.town-front). Buildings are DOM and
     keep their own z-index, exactly as before.
   - Pixi renders only when something moved (no ticker), so an idle town costs nothing.
   Safety: if PixiJS or WebGL is unavailable or fails, tglFallback() switches to the old DOM tiles and the game plays exactly as before.
   ?renderer=dom (or localStorage['tr-renderer']='dom') forces the old renderer; ?renderer=canvas = old tiles with the canvas weather.
   Top-level names here all start with tgl / TGL so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
const TGL_PREF = (() => { try { return new URLSearchParams(location.search).get('renderer') || localStorage.getItem('tr-renderer') || 'gl'; } catch (e) { return 'gl'; } })();
const TGL_T = 64, TGL_CHUNK = 8, TGL_STRIP = 1 / 6;   // world units per tile; ground chunk size in tiles; the overhanging top sixth of a 1.2-tile tree sprite is 0.2 tile
const TGL_VARS = ['ground', 'ground2', 'ground3', 'path', 'path-edge', 'water', 'shore'];   // what the tile atlas itself paints; every token the sprites use is found in their own markup (tglPalette)
const TGL_SYMBOLS = ['s-oak', 's-oak2', 's-pine', 's-hedge', 's-rock', 's-flowers', 's-tuft', 's-pebbles', 's-ripple', 's-bridge', 's-bridge-l', 's-bridge-r', 's-cobble'];
let tglState = (TGL_PREF === 'dom' || TGL_PREF === 'canvas') ? 'off' : 'init';   // off | init (loading PixiJS) | ready
let tgl = null, tglPendingMap = null, tglBuildId = 0;

// buildWorld() skips its tile <div>s while this is true (loading or ready); tglOn() is true once the canvas is actually drawing the map.
function tglWanted() { return tglState !== 'off'; }
function tglOn() { return tglState === 'ready' && !!tgl && !!tgl.map; }

/* ---------------- start-up ---------------- */
async function tglInit() {
  try {
    if (typeof PIXI === 'undefined') await new Promise((res, rej) => { let n = 0; const t = setInterval(() => { if (typeof PIXI !== 'undefined') { clearInterval(t); res(); } else if (++n > 240) { clearInterval(t); rej(new Error('PixiJS did not load')); } }, 50); });
    const app = new PIXI.Application();
    await app.init({ width: 16, height: 16, backgroundAlpha: 0, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 3), autoDensity: true, preference: 'webgl', autoStart: false });
    app.ticker.stop();
    const front = document.createElement('canvas'); front.className = 'town-front'; front.setAttribute('aria-hidden', 'true');
    app.canvas.classList.add('town-gl'); app.canvas.setAttribute('aria-hidden', 'true');
    const world = new PIXI.Container(), ground = new PIXI.Container(), trees = new PIXI.Container(); trees.sortableChildren = true;
    world.addChild(ground, trees); app.stage.addChild(world);
    tgl = { app, world, ground, trees, front, fctx: front.getContext('2d'), fdpr: 1, tex: null, sig: '', texPx: 0, map: null, pending: null, chunks: new Map(), live: new Map(), pool: [], range: null, strips: [], stripsDrawn: false,
            vw: 0, vh: 0, tp: 0, cam: { cur: null, from: null, to: null, t0: 0, raf: 0 }, dirty: false };
    app.canvas.addEventListener('webglcontextlost', e => e.preventDefault());           // let the browser restore it; Pixi re-uploads the textures
    app.canvas.addEventListener('webglcontextrestored', () => { tglRender(); });
    tglState = 'ready'; tglSyncToggle();
    new MutationObserver(() => tglRepaintIfStale()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new MutationObserver(() => tglRepaintIfStale()).observe(townView, { attributes: true, attributeFilter: ['data-season', 'data-biome'] });
    tglMount();   // the first town may already be built (PixiJS loads after the game starts), so put the canvases around it now
    if (tglPendingMap) { tgl.pending = tglPendingMap; tglPendingMap = null; if (await tglRefreshTextures()) tglBuildScene(); }
  } catch (e) { tglFallback(e); }
}
function tglFallback(err) {
  console.warn('Town: WebGL renderer unavailable, using the classic tiles.', err && err.message || err);
  tglState = 'off'; tglSyncToggle();
  if (tgl) { try { tgl.app.destroy(true, { children: true }); } catch (e) { /* ignore */ } if (tgl.front && tgl.front.parentNode) tgl.front.remove(); if (tgl.cam.raf) cancelAnimationFrame(tgl.cam.raf); }
  tgl = null; tglPendingMap = null;
  try { townBuiltFor = null; renderTown(); } catch (e) { /* the next renderTown() will do it */ }
}

/* ---------------- palette and textures ---------------- */
function tglPalette() {
  const cs = getComputedStyle(townView), pal = {}, names = new Set(TGL_VARS);
  TGL_SYMBOLS.forEach(id => { const sym = document.getElementById(id); if (sym) (sym.innerHTML.match(/var\(--[a-z0-9-]+\)/g) || []).forEach(v => names.add(v.slice(6, -1))); });   // so editing a sprite's colours never needs a change here
  names.forEach(v => { pal[v] = cs.getPropertyValue('--' + v).trim() || '#808080'; });
  return pal;
}
// Texture resolution follows the real pixels one tile covers on this screen, in steps of 32 so a small resize does not rebuild everything.
function tglTexPx() { return Math.max(64, Math.ceil(Math.max(tilePx, 38) * tgl.app.renderer.resolution / 32) * 32); }
function tglSig() { return [townView.dataset.biome || '', townView.dataset.season || '', document.documentElement.dataset.theme || '', tglTexPx()].join('|'); }
function tglRr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function tglBuildAtlas(pal, TEX) {
  const STRIDE = TEX + 4, COLS = 8, ROWS = 5, cv = document.createElement('canvas'); cv.width = COLS * STRIDE; cv.height = ROWS * STRIDE;
  const c = cv.getContext('2d'), k = TEX / 56, pad = 1.5 * k, rad = 6 * k, cells = [];   // 56 = the CSS px a tile is about; the padding, radius and edge widths below are CSS px
  const cell = (i, fill, edgeColor, edgePx, m) => {
    const ox = (i % COLS) * STRIDE + 2, oy = Math.floor(i / COLS) * STRIDE + 2;
    c.save(); c.translate(ox, oy);
    c.save(); tglRr(c, pad, pad, TEX - 2 * pad, TEX - 2 * pad, rad); c.clip();
    c.fillStyle = fill; c.fillRect(0, 0, TEX, TEX);
    if (m) {                                   // the old CSS drew these as inset box-shadows on every side that has a different neighbour
      c.fillStyle = edgeColor; const e = edgePx * k;
      if (m & 1) c.fillRect(0, 0, TEX, pad + e); if (m & 2) c.fillRect(TEX - pad - e, 0, pad + e, TEX);
      if (m & 4) c.fillRect(0, TEX - pad - e, TEX, pad + e); if (m & 8) c.fillRect(0, 0, pad + e, TEX);
    }
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.32)'; c.lineWidth = k; tglRr(c, k / 2, k / 2, TEX - k, TEX - k, rad); c.stroke();   // outline: 1px solid rgba(0,0,0,.32)
    c.restore(); cells[i] = new PIXI.Rectangle(ox, oy, TEX, TEX);
  };
  ['ground', 'ground2', 'ground3'].forEach((g, i) => cell(i, pal[g]));
  for (let m = 0; m < 16; m++) { cell(3 + m, pal.path, pal['path-edge'], 3, m); cell(19 + m, pal.water, pal.shore, 4, m); }
  const base = PIXI.Texture.from(cv); base.source.scaleMode = 'linear';
  const sub = i => new PIXI.Texture({ source: base.source, frame: cells[i] });
  const tile = { g: [0, 1, 2].map(sub), path: [], water: [] };
  for (let m = 0; m < 16; m++) { tile.path[m] = sub(3 + m); tile.water[m] = sub(19 + m); }
  return { base, tile };
}
async function tglSymbol(id, pal, px) {
  const sym = document.getElementById(id); if (!sym) return null;
  const vb = (sym.getAttribute('viewBox') || '0 0 64 64').split(/\s+/).map(Number), w = Math.round(px), h = Math.round(px * vb[3] / vb[2]);
  const inner = sym.innerHTML.replace(/var\((--[a-z0-9-]+)\)/g, (_, n) => pal[n.slice(2)] || '#808080');
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${w}" height="${h}">${inner}</svg>`);
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
  const tex = PIXI.Texture.from(cv); tex.source.scaleMode = 'linear';
  return { tex, cv };
}
// Rebuilds the atlas and sprite textures if the biome, season, theme or tile resolution changed since they were last made.
async function tglRefreshTextures() {
  if (!tgl) return false;
  const sig = tglSig(); if (tgl.tex && tgl.sig === sig) return true;
  const id = ++tglBuildId, TEX = tglTexPx(), pal = tglPalette();
  const atlas = tglBuildAtlas(pal, TEX), sym = {};
  await Promise.all(TGL_SYMBOLS.map(async s => { const isTree = /^s-(oak2?|pine|hedge|rock)$/.test(s); sym[s] = await tglSymbol(s, pal, isTree ? TEX * 1.2 : TEX); }));
  if (!tgl || id !== tglBuildId) { atlas.base.destroy(true); Object.values(sym).forEach(o => o && o.tex.destroy(true)); return false; }   // a newer rebuild superseded this one
  if (tgl.tex) { tgl.tex.atlas.destroy(true); Object.values(tgl.tex.sym).forEach(o => o && o.tex.destroy(true)); }
  tgl.tex = { atlas: atlas.base, tile: atlas.tile, sym }; tgl.sig = sig; tgl.texPx = TEX;
  return true;
}
function tglRepaintIfStale() {
  if (!tgl || !tgl.map || tgl.sig === tglSig()) return;
  tglRefreshTextures().then(ok => { if (ok && tgl) tglBuildScene(); }).catch(e => tglFallback(e));
}

/* ---------------- the map ---------------- */
// Called by buildWorld() with the per-tile look it already worked out: tiles[i] = { tone, decor: { id, tree } | null }.
function tglSetMap(m, tiles) {
  const pending = { m, tiles };
  if (!tgl) { tglPendingMap = pending; return; }   // PixiJS is still loading: tglInit() builds it as soon as it is ready
  tgl.pending = pending;
  if (tgl.tex && tgl.sig === tglSig()) tglBuildScene();
  else tglRefreshTextures().then(ok => { if (ok && tgl) tglBuildScene(); }).catch(e => tglFallback(e));
}
function tglMount() {   // buildWorld() empties #townView, so the canvases are put back around the new #townWorld
  if (!tgl || !townWorld) return;
  townView.insertBefore(tgl.app.canvas, townWorld);
  townWorld.after(tgl.front);
}
function tglResetScene() {
  tgl.ground.removeChildren().forEach(c => c.destroy({ children: true }));
  tgl.trees.removeChildren().forEach(s => s.destroy()); tgl.chunks = new Map(); tgl.live = new Map(); tgl.pool.forEach(s => s.destroy()); tgl.pool = []; tgl.range = null; tgl.strips = [];
}
function tglBuildScene() {
  if (!tgl || !tgl.pending || !tgl.tex) return;
  tglResetScene();
  tgl.map = tgl.pending.m; tgl.tiles = tgl.pending.tiles;
  tgl.vw = 0;   // force tglResize() to size everything for this town view
  tglResize();
  if (lastCam) tglCamera(lastCam.cx, lastCam.cy, false);
}
const tglAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 'o' : m.rows[y][x];
const tglIsPath = c => c === '=' || c === 'b' || c === '#', tglIsWater = c => c === '~' || c === 'b';
const tglMask = (m, x, y, same) => (same(tglAt(m, x, y - 1)) ? 0 : 1) | (same(tglAt(m, x + 1, y)) ? 0 : 2) | (same(tglAt(m, x, y + 1)) ? 0 : 4) | (same(tglAt(m, x - 1, y)) ? 0 : 8);
function tglChunk(cx, cy) {
  const key = cx + ',' + cy; let ch = tgl.chunks.get(key); if (ch) return ch;
  const m = tgl.map, T = TGL_T, tile = tgl.tex.tile, sym = tgl.tex.sym, x1 = Math.min(m.w, (cx + 1) * TGL_CHUNK), y1 = Math.min(m.h, (cy + 1) * TGL_CHUNK), decor = [];
  ch = new PIXI.Container();
  for (let y = cy * TGL_CHUNK; y < y1; y++) for (let x = cx * TGL_CHUNK; x < x1; x++) {
    const c = m.rows[y][x], d = tgl.tiles[y * m.w + x];
    const tex = (c === '=' || c === '#') ? tile.path[tglMask(m, x, y, tglIsPath)] : (c === '~' || c === 'b') ? tile.water[tglMask(m, x, y, tglIsWater)] : tile.g[d.tone < 0.34 ? 0 : d.tone < 0.67 ? 1 : 2];
    const s = new PIXI.Sprite(tex); s.position.set(x * T, y * T); s.width = s.height = T; ch.addChild(s);
    if (d.decor && !d.decor.tree) decor.push([x, y, d.decor.id]);
  }
  decor.forEach(([x, y, id]) => { const o = sym[id]; if (!o) return; const s = new PIXI.Sprite(o.tex); s.position.set(x * T, y * T); s.width = s.height = T; ch.addChild(s); });   // flowers, tufts, ripples, bridges: above every ground tile of the chunk
  tgl.ground.addChild(ch); tgl.chunks.set(key, ch); return ch;
}
function tglTreeSprite(x, y, id) {
  const s = tgl.pool.pop() || new PIXI.Sprite(), o = tgl.tex.sym[id], T = TGL_T;
  s.texture = o ? o.tex : PIXI.Texture.EMPTY; s.visible = true; s.position.set(x * T - T * 0.1, y * T - T * 0.2); s.width = s.height = T * 1.2; s.zIndex = y * 2;   // the .spr.tree box: -10% / -20%, 120% square
  return s;
}
// Keeps exactly the tiles near the camera in the scene (ground chunks visible, trees added / removed) and lists the tree overhangs for the front canvas.
function tglSyncRange(cx, cy) {
  const m = tgl.map, tp = tgl.tp, vw = tgl.vw, vh = tgl.vh;
  const x0 = Math.max(0, Math.floor(-cx / tp) - 2), y0 = Math.max(0, Math.floor(-cy / tp) - 2);
  const x1 = Math.min(m.w - 1, Math.ceil((vw - cx) / tp) + 2), y1 = Math.min(m.h - 1, Math.ceil((vh - cy) / tp) + 3);
  const r = x0 + ',' + y0 + ',' + x1 + ',' + y1; if (tgl.range === r) return; tgl.range = r;
  const cx0 = Math.floor(x0 / TGL_CHUNK), cx1 = Math.floor(x1 / TGL_CHUNK), cy0 = Math.floor(y0 / TGL_CHUNK), cy1 = Math.floor(y1 / TGL_CHUNK);
  tgl.chunks.forEach((ch, key) => { const [a, b] = key.split(',').map(Number); ch.visible = a >= cx0 && a <= cx1 && b >= cy0 && b <= cy1; });
  for (let b = cy0; b <= cy1; b++) for (let a = cx0; a <= cx1; a++) tglChunk(a, b).visible = true;
  const want = new Set(), strips = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = tgl.tiles[y * m.w + x]; if (!d || !d.decor || !d.decor.tree) continue;
    const key = y * m.w + x; want.add(key);
    if (!tgl.live.has(key)) { const s = tglTreeSprite(x, y, d.decor.id); tgl.trees.addChild(s); tgl.live.set(key, s); }
    if (y > 0 && !m.solid[y - 1][x]) strips.push({ x, y, id: d.decor.id });   // something can stand north of this tree, so its overhang must cover it
  }
  tgl.live.forEach((s, key) => { if (!want.has(key)) { tgl.trees.removeChild(s); s.visible = false; tgl.pool.push(s); tgl.live.delete(key); } });
  tgl.strips = strips;
}
function tglDrawStrips() {
  const c = tgl.fctx, fc = tgl.front;
  if (!tgl.strips.length) { if (tgl.stripsDrawn) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fc.width, fc.height); tgl.stripsDrawn = false; } return; }
  const tp = tgl.tp, cur = tgl.cam.cur;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fc.width, fc.height); c.setTransform(tgl.fdpr, 0, 0, tgl.fdpr, 0, 0);
  for (const s of tgl.strips) {
    const o = tgl.tex.sym[s.id]; if (!o) continue;
    c.drawImage(o.cv, 0, 0, o.cv.width, o.cv.height * TGL_STRIP, s.x * tp + cur.cx - 0.1 * tp, s.y * tp + cur.cy - 0.2 * tp, 1.2 * tp, 0.2 * tp);
  }
  tgl.stripsDrawn = true;
}
function tglRender() { if (tgl && tgl.map) tgl.app.render(); }

/* ---------------- size and camera ---------------- */
function tglResize() {
  if (!tgl || !townView) return;
  const vw = townView.clientWidth, vh = townView.clientHeight; if (!vw || !vh) return;
  if (vw === tgl.vw && vh === tgl.vh && tilePx === tgl.tp) return;
  tgl.vw = vw; tgl.vh = vh; tgl.tp = tilePx;
  tgl.app.renderer.resize(vw, vh); tgl.world.scale.set(tilePx / TGL_T);
  tgl.fdpr = Math.min(window.devicePixelRatio || 1, 2); tgl.front.width = Math.round(vw * tgl.fdpr); tgl.front.height = Math.round(vh * tgl.fdpr); tgl.stripsDrawn = false;
  tgl.range = null;
  if (tgl.map && tgl.sig !== tglSig()) { tglRepaintIfStale(); return; }   // a bigger tile wants sharper textures
  if (tgl.cam.cur) tglApplyCam(tgl.cam.cur.cx, tgl.cam.cur.cy);
}
function tglApplyCam(cx, cy) {
  const cam = tgl.cam; cam.cur = { cx, cy };
  townWorld.style.transform = `translate(${cx}px, ${cy}px)`;   // the DOM entity layer
  tgl.world.position.set(cx, cy);
  tglSyncRange(cx, cy); tglDrawStrips(); tglRender();
}
function tglCamFrame(now) {
  const cam = tgl && tgl.cam; if (!cam) return; cam.raf = 0;
  const k = Math.min(1, (now - cam.t0) / STEP_MS);
  tglApplyCam(cam.from.cx + (cam.to.cx - cam.from.cx) * k, cam.from.cy + (cam.to.cy - cam.from.cy) * k);
  if (k < 1) cam.raf = requestAnimationFrame(tglCamFrame);
}
// The one way the camera moves while the canvas is drawing the map. animate = glide over STEP_MS (a walking step); reduced motion never glides.
function tglCamera(cx, cy, animate) {
  const cam = tgl.cam;
  if (cam.raf) { cancelAnimationFrame(cam.raf); cam.raf = 0; }
  townWorld.style.transition = 'none';
  if (!animate || !cam.cur || !btMotionOk() || (cam.cur.cx === cx && cam.cur.cy === cy)) { tglApplyCam(cx, cy); return; }
  cam.from = { cx: cam.cur.cx, cy: cam.cur.cy }; cam.to = { cx, cy }; cam.t0 = performance.now();
  cam.raf = requestAnimationFrame(tglCamFrame);
}
function tglCamNow() { return tgl && tgl.cam.cur ? tgl.cam.cur : null; }

// Settings > Comfort > Smooth map. It shows what is really in use (so it reads "off" after a fallback) and changing it reloads the game, because the
// renderer is chosen once at start-up. The choice is kept in localStorage['tr-renderer'] ('dom' = classic); a ?renderer= in the address is dropped on reload.
function tglSyncToggle() { const t = document.getElementById('glMapToggle'); if (t) t.classList.toggle('on', tglState !== 'off'); }
(() => {
  const t = document.getElementById('glMapToggle'); if (!t) return;
  t.addEventListener('click', () => {
    try { if (tglState !== 'off') localStorage.setItem('tr-renderer', 'dom'); else localStorage.removeItem('tr-renderer'); } catch (e) { /* storage blocked: the address option still works */ }
    const u = new URL(location.href); u.searchParams.delete('renderer'); location.href = u.href;
  });
  tglSyncToggle();
})();
if (tglState !== 'off') tglInit();   // ?renderer=dom (or canvas) never loads the WebGL path
