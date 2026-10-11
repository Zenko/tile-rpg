/* =====================================================================================================================
   HOME ROOM LIGHT ON WEBGL (PixiJS)
   The light in your cottage room, drawn by one Pixi canvas that sits inside the room's scrolling world (so it pans with the room and the
   camera), above the furniture and below the top bar. The floor, rugs, furniture, spirits and the character stay DOM on purpose (every
   one of them is tapped, dragged, restyled and counted by js/home-room.js and js/home-spirits.js); this layer only adds the light:
   - Every glow the room already had (a lamp, the wall lamp, the altar's candles, the fireplace, the doorway) is now a soft additive glow
     that FLICKERS (candles and fire a lot, lamps a little).
   - A window lets in two slow shafts of pale light across the floor, with dust motes drifting through them.
   - A fireplace sends the odd ember up.
   Rules:
   - It REPLACES the static `.hr-glow` divs only while it is drawing (the `.hmg-on` class on `.hr-world` hides them); with no WebGL, still
     loading, or reduced motion, those divs are what the player sees, exactly as before.
   - Glows are worked out from the same items and numbers as hrWorldHtml() (door glow plus each piece's `glow`), so a moved, sold or
     added piece is picked up on the next hrLayout(), which calls hmgSync().
   - Renders at ~24 fps only while the room is on screen and the tab is visible; hmgStop() (from hrLeave) ends it.
   Top-level names here all start with hmg so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
let hmg = null, hmgBusy = false, hmgFailed = false, hmgRaf = 0, hmgLast = 0, hmgNextMote = 0, hmgNextEmber = 0;
const hmgR = (a, b) => a + Math.random() * (b - a);

async function hmgWarm() {
  if (hmg || hmgBusy || hmgFailed) return;
  hmgBusy = true;
  try {
    if (typeof PIXI === 'undefined') await pixiReady;
    const app = new PIXI.Application();
    await app.init({ width: 64, height: 64, backgroundAlpha: 0, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    app.ticker.stop();
    app.canvas.className = 'hmg-canvas'; app.canvas.setAttribute('aria-hidden', 'true');
    app.canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    const beams = new PIXI.Container(), glows = new PIXI.Container(), motes = new PIXI.Container(); app.stage.addChild(beams, glows, motes);
    hmg = { app, beams, glows, sys: ppMake(motes, 90), items: [], w: 0, h: 0, sig: '' };
    if (typeof homeRoom !== 'undefined' && homeRoom.host) hmgSync();   // the room was already open
  } catch (e) { hmgFailed = true; hmg = null; console.warn('Home light: WebGL unavailable, using the plain glows.', e && e.message || e); }
  hmgBusy = false;
}
// The same list hrWorldHtml() makes: the doorway plus every piece that has a glow.
function hmgGlowList() {
  const r = homeRoom, out = [{ x: HR_DOOR_X + 0.5, y: r.rows - 1.6, r: 3.4, day: 1, id: 'door' }];
  hrHome().items.forEach(i => { const d = hrDef(i); if (d && d.glow) out.push({ x: i.x + d.glow.dx, y: i.y + d.glow.dy, r: d.glow.r, day: d.glow.day, id: i.id }); });
  return out;
}
function hmgSync() {
  try {
    const H = typeof homeRoom !== 'undefined' ? homeRoom : null;
    if (!H || !H.host || !H.world || !H.t) return;
    if (!btMotionOk() || hmgFailed) return;                               // the plain DOM glows stay
    if (!hmg) { hmgWarm(); return; }
    if (hmg.app.canvas.parentNode !== H.world) H.world.appendChild(hmg.app.canvas);
    H.world.classList.add('hmg-on');
    const w = Math.round(H.cols * H.t), h = Math.round(H.rows * H.t);
    if (hmg.w !== w || hmg.h !== h) { hmg.w = w; hmg.h = h; hmg.app.renderer.resize(w, h); }
    // rebuild the sprites for the current glows
    hmg.beams.removeChildren().forEach(s => s.destroy()); hmg.glows.removeChildren().forEach(s => s.destroy()); ppClear(hmg.sys);
    hmg.items = hmgGlowList().map(g => {
      const s = new PIXI.Sprite(hmg.sys.tex.glow); s.anchor.set(0.5); s.blendMode = 'add'; s.position.set(g.x * H.t, g.y * H.t);
      s.tint = g.day ? 0xd6e6d8 : 0xffcf66; hmg.glows.addChild(s);
      const it = { g, s, ph: Math.random() * 6.283, beams: [] };
      if (g.id === 'window') for (let k = 0; k < 2; k++) {                  // two shafts of light, leaning across the floor
        const b = new PIXI.Sprite(hmg.sys.tex.ray); b.anchor.set(0, 0.5); b.blendMode = 'add'; b.tint = 0xe6f2dc; b.position.set(g.x * H.t, g.y * H.t); b.rotation = 1.05 + k * 0.32;
        b.scale.set(H.t * (3.4 + k * 0.5) / b.texture.width, H.t * (0.9 + k * 0.25) / 14); hmg.beams.addChild(b); it.beams.push(b);
      }
      return it;
    });
    if (!hmgRaf) { hmgLast = 0; hmgRaf = requestAnimationFrame(hmgFrame); }
  } catch (e) { hmgFailed = true; try { homeRoom.world && homeRoom.world.classList.remove('hmg-on'); } catch (x) { /* ignore */ } }
}
function hmgFrame(now) {
  hmgRaf = 0;
  const H = homeRoom;
  if (!hmg || !H || !H.host || !H.host.isConnected || !H.world || hmg.app.canvas.parentNode !== H.world || document.hidden) return;   // visibilitychange / the next hrLayout restarts it
  if (now - hmgLast < 38) { hmgRaf = requestAnimationFrame(hmgFrame); return; }
  const dt = Math.min(0.06, (now - hmgLast) / 1000 || 0.04), t = now / 1000; hmgLast = now;
  const t0 = H.t;
  hmg.items.forEach(it => {
    const id = it.g.id, strong = id === 'fireplace' || id === 'altar';
    // candles and fire flicker hard and fast, lamps and sconces a little, windows and the door breathe slowly
    const f = strong ? 0.86 + 0.1 * Math.sin(t * 11 + it.ph) + 0.06 * Math.sin(t * 23.7 + it.ph * 2) + 0.04 * Math.sin(t * 5.3)
      : it.g.day ? 0.95 + 0.05 * Math.sin(t * 0.6 + it.ph) : 0.97 + 0.03 * Math.sin(t * 7 + it.ph);
    it.s.scale.set(it.g.r * t0 * 0.9 / 64 * (strong ? 0.94 + 0.08 * f : 1)); it.s.alpha = (it.g.day ? 0.42 : 0.5) * f;
    it.beams.forEach((b, k) => { b.alpha = 0.16 + 0.05 * Math.sin(t * 0.5 + it.ph + k * 2); });
  });
  // dust drifting through the shafts, and the odd ember off a fireplace
  const wins = hmg.items.filter(it => it.beams.length), fires = hmg.items.filter(it => it.g.id === 'fireplace');
  if (wins.length && t > hmgNextMote) {
    hmgNextMote = t + 0.35;
    const it = wins[Math.floor(Math.random() * wins.length)], b = it.beams[Math.floor(Math.random() * it.beams.length)], len = t0 * 3.4, u = hmgR(0.12, 0.9), a = b.rotation;
    ppEmit(hmg.sys, { tex: 'glow', tint: 0xfff4d6, x: b.x + Math.cos(a) * len * u + hmgR(-14, 14), y: b.y + Math.sin(a) * len * u + hmgR(-14, 14), vx: hmgR(-5, 5), vy: hmgR(-4, 8), drag: 0.9, life: hmgR(4, 8), s0: hmgR(3, 6), s1: hmgR(3, 6), a: 0.8, bell: true, grow: 'lin' });
  }
  if (fires.length && t > hmgNextEmber) {
    hmgNextEmber = t + 0.5;
    const it = fires[Math.floor(Math.random() * fires.length)];
    ppEmit(hmg.sys, { tex: 'glow', tint: 0xffa23a, x: it.s.x + hmgR(-t0 * 0.18, t0 * 0.18), y: it.s.y - t0 * 0.2, vx: hmgR(-6, 6), vy: hmgR(-18, -34), drag: 0.8, life: hmgR(1, 1.8), s0: hmgR(4, 7), s1: 1, a: 0.9 });
  }
  ppStep(hmg.sys, dt);
  hmg.app.render();
  hmgRaf = requestAnimationFrame(hmgFrame);
}
function hmgStop() {
  if (hmgRaf) { cancelAnimationFrame(hmgRaf); hmgRaf = 0; }
  if (hmg) { if (hmg.app.canvas.parentNode) hmg.app.canvas.remove(); ppClear(hmg.sys); hmg.w = 0; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && !hmgRaf && typeof homeRoom !== 'undefined' && homeRoom.host) hmgSync(); });
