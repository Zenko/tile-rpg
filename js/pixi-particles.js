/* =====================================================================================================================
   SHARED PIXI PARTICLES (helper for js/town-fx.js, js/reveal-fx.js and js/home-gl.js)
   A tiny pooled particle system for PixiJS: sprites that are reused, a hard cap, and one step function. It owns no canvas and no
   ticker; each caller makes its own PIXI.Application, a container, and calls ppStep() from its own rAF loop only while something is alive.
   (js/battle-fx.js has its own older copy of the same idea and is left alone.)
   - ppMake(container, max) -> a system { c, parts, pool, tex, max }.
   - ppEmit(sys, o) adds one particle. `o`: tex (glow | star | ring | leaf | ray | rect), tint, x, y, vx, vy, ay, drag (fraction of speed kept
     per second, so 0.2 is a lot of drag), life (s), s0 / s1 (size in px of the 64px texture at start and end), a (peak alpha), rot, vr,
     add (additive blend, default true), bell (fade in AND out, else fade out only), w / h (stretch the sprite sideways / up-down, multipliers, e.g. h: 0.55 squashes a ring into a ground ellipse), sway ({ amp, freq } sideways wobble),
     grow (ease: 'out' (default) or 'lin'), z (zIndex).
   - ppStep(sys, dt) moves everything and returns how many are still alive.
   Textures are made per system (each PIXI.Application has its own GL context), from small canvases; no image files.
   Top-level names here all start with pp so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
function ppTextures() {
  const mk = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return PIXI.Texture.from(cv); };
  return {
    glow: mk(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }),
    star: mk(64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(32, 0); c.quadraticCurveTo(35, 29, 64, 32); c.quadraticCurveTo(35, 35, 32, 64); c.quadraticCurveTo(29, 35, 0, 32); c.quadraticCurveTo(29, 29, 32, 0); c.fill(); }),
    ring: mk(128, 128, c => { c.shadowColor = '#fff'; c.shadowBlur = 8; c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.stroke(); }),
    leaf: mk(32, 32, c => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(3, 29); c.quadraticCurveTo(2, 6, 29, 3); c.quadraticCurveTo(30, 26, 3, 29); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(5, 27); c.lineTo(25, 7); c.stroke(); }),
    ray: mk(128, 16, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, h / 2 - 1); c.lineTo(w, h / 2 - 7); c.lineTo(w, h / 2 + 7); c.lineTo(0, h / 2 + 1); c.closePath(); c.fill(); }),
    rect: mk(64, 64, (c, w) => { c.shadowColor = '#fff'; c.shadowBlur = 8; c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(8, 8, 48, 48, 9) : c.rect(8, 8, 48, 48); c.fill(); })
  };
}
function ppMake(container, max) { return { c: container, parts: [], pool: [], tex: ppTextures(), max: max || 300 }; }
function ppDestroy(sys) { try { sys.parts.forEach(p => p.s.destroy()); sys.pool.forEach(s => s.destroy()); Object.values(sys.tex).forEach(t => t.destroy(true)); } catch (e) { /* the app is going away anyway */ } sys.parts = []; sys.pool = []; }
function ppClear(sys) { sys.parts.forEach(p => { p.s.visible = false; sys.pool.push(p.s); }); sys.parts = []; }
function ppEmit(sys, o) {
  if (sys.parts.length >= sys.max) return null;
  let s = sys.pool.pop(); if (!s) { s = new PIXI.Sprite(); sys.c.addChild(s); }
  const tex = sys.tex[o.tex || 'glow'];
  s.texture = tex; s.visible = true; s.tint = o.tint === undefined ? 0xffffff : o.tint; s.blendMode = o.add === false ? 'normal' : 'add';
  s.anchor.set(o.tex === 'ray' ? 0 : 0.5, 0.5); s.position.set(o.x, o.y); s.rotation = o.rot || 0; s.zIndex = o.z || 0;
  const p = { s, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, ay: o.ay || 0, drag: o.drag === undefined ? 0.3 : o.drag, life: o.life || 0.8, age: 0,
    s0: o.s0 === undefined ? 12 : o.s0, s1: o.s1 === undefined ? 2 : o.s1, a: o.a === undefined ? 1 : o.a, rot: o.rot || 0, vr: o.vr || 0, bell: !!o.bell, w: o.w || 0, h: o.h || 0,
    sway: o.sway || null, ph: Math.random() * 6.283, lin: o.grow === 'lin', tw: tex.width };
  sys.parts.push(p); return p;
}
function ppStep(sys, dt) {
  const parts = sys.parts;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += dt; const u = p.age / p.life;
    if (u >= 1) { p.s.visible = false; sys.pool.push(p.s); parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    const d = Math.pow(p.drag, dt); p.vx *= d; p.vy = p.vy * d + p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    const sw = p.sway ? Math.sin(p.age * p.sway.freq + p.ph) * p.sway.amp : 0;
    p.s.position.set(p.x + sw, p.y); p.s.rotation = p.rot;
    const k = p.lin ? u : 1 - (1 - u) * (1 - u), size = p.s0 + (p.s1 - p.s0) * k;
    p.s.scale.set(size / p.tw * (p.w || 1), size / p.tw * (p.h || 1));
    p.s.alpha = p.a * (p.bell ? Math.sin(Math.PI * u) : 1 - u);
  }
  return parts.length;
}
