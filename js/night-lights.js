/* =====================================================================================================================
   NIGHT LIGHTS (a light map for the town)
   Night used to be one dark overlay (.town-sky, above the entities) with a single soft hole cut around the player. Now lit lamps, the
   Lantern Market owl and every building's window also cut warm holes in it, so the town reads as lit from several places instead of dim
   with one torch. Prototype: pixi-fx-lab.html ("Night lights", where the darkness is a Pixi light map).
   How it works (and why it is a 2D canvas and not Pixi):
   - The entities are DOM and .town-sky is a DOM layer ABOVE them, so a canvas INSIDE .town-sky darkens them too. A WebGL layer behind them
     could not.
   - A small canvas (half resolution, stretched by CSS, so the gradients stay smooth and it is cheap) child of .town-sky paints the sky colour
     opaque, then cuts a hole per light with destination-out radial gradients, then lays a faint warm glow over each hole. Because the canvas is
     a child of .town-sky it inherits that layer's opacity (the 3 s day/night fade, --sky-opacity) and its CSS mask (the player's hole), so
     neither had to change. While it exists .town-sky itself has no background (.has-lights): the canvas is the darkness.
   - Redrawn from updateNightHole (every camera update, so while walking), from applySky (colour change) and when lamps change (renderTown).
     By day nothing is drawn. Lamps flicker a little at ~9 fps, only while a lamp is in view, the town is showing and motion is allowed.
   - No WebGL is involved, so it works the same with ?renderer=dom.
   Top-level names here all start with nl / NL so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
let nlCanvas = null, nlCtx = null, nlLamps = [], nlLast = null, nlTimer = 0;
const NL_SCALE = 0.5;

function nlMount(skyEl) {
  if (nlCanvas || !skyEl) return;
  nlCanvas = document.createElement('canvas'); nlCanvas.className = 'town-lights'; nlCanvas.setAttribute('aria-hidden', 'true');
  nlCtx = nlCanvas.getContext('2d'); if (!nlCtx) { nlCanvas = null; return; }
  skyEl.insertBefore(nlCanvas, skyEl.firstChild); skyEl.classList.add('has-lights');
}
// Called by lifeRenderEntities (js/town-life.js) with the lit lamps of this district: [{ x, y }] in tiles.
function nlSetLamps(list) { nlLamps = list || []; nlRefresh(); }
function nlRefresh(active) { if (nlLast) nlDraw(nlLast.cx, nlLast.cy, nlLast.vw, nlLast.vh, active === undefined ? nlLast.active : active); }   // `active` = is any night darkening showing (applySky passes the fresh value)

function nlLights(tilePx) {
  const out = [], m = typeof getMap === 'function' ? getMap(state.currentDistrict) : null;
  nlLamps.forEach(l => out.push({ x: l.x + 0.5, y: l.y + 0.3, r: 3.3, a: 1, warm: 0.26, flick: true }));
  if (m) (m.buildings || []).forEach(b => out.push({ x: b.x + b.w / 2, y: b.y + b.h - 0.6, r: 2.3, a: 0.7, warm: 0.14, flick: false }));
  if (typeof lanternOpen === 'function' && lanternOpen() && typeof LANTERN_TILE !== 'undefined') out.push({ x: LANTERN_TILE.x + 0.5, y: LANTERN_TILE.y + 0.5, r: 3, a: 0.85, warm: 0.22, flick: true });
  return out;
}
function nlDraw(cx, cy, vw, vh, active) {
  nlLast = { cx, cy, vw, vh, active };
  if (!nlCanvas || !vw || !vh) return;
  const w = Math.max(2, Math.round(vw * NL_SCALE)), h = Math.max(2, Math.round(vh * NL_SCALE));
  if (nlCanvas.width !== w || nlCanvas.height !== h) { nlCanvas.width = w; nlCanvas.height = h; }
  const c = nlCtx;
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h);
  if (!active) { nlStop(); return; }                                    // by day nothing is dimmed
  const sky = (document.querySelector('.town-sky') || {}).style, col = (sky && sky.getPropertyValue('--sky-color') || '').trim() || '#0b1230';
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  const tp = (typeof tilePx === 'number' ? tilePx : 56) * NL_SCALE, t = performance.now() / 1000, calm = typeof btMotionOk === 'function' ? !btMotionOk() : false;
  const ls = nlLights(tp); let flicker = false;
  c.globalCompositeOperation = 'destination-out';
  ls.forEach(l => {
    const fl = l.flick && !calm ? 1 + Math.sin(t * 9 + l.x * 3) * 0.03 + Math.sin(t * 23 + l.y * 5) * 0.02 : 1, R = l.r * tp * fl, x = l.x * tp + cx * NL_SCALE, y = l.y * tp + cy * NL_SCALE;
    if (x < -R || x > w + R || y < -R || y > h + R) return;
    if (l.flick) flicker = true;
    const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(0.35, `rgba(0,0,0,${l.a * 0.75})`); g.addColorStop(0.7, `rgba(0,0,0,${l.a * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 6.2832); c.fill();
  });
  c.globalCompositeOperation = 'source-over';
  ls.forEach(l => {                                                       // the warm glow: a faint orange wash over the hole
    const R = l.r * tp * 0.8, x = l.x * tp + cx * NL_SCALE, y = l.y * tp + cy * NL_SCALE; if (x < -R || x > w + R || y < -R || y > h + R) return;
    const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,176,72,${l.warm})`); g.addColorStop(1, 'rgba(255,176,72,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 6.2832); c.fill();
  });
  if (flicker && !calm) nlStart(); else nlStop();
}
function nlStart() { if (!nlTimer) nlTimer = setInterval(() => { if (document.hidden || (typeof inBattle !== 'undefined' && inBattle) || !nlLast || !nlLast.active) return; nlRefresh(); }, 110); }
function nlStop() { if (nlTimer) { clearInterval(nlTimer); nlTimer = 0; } }
