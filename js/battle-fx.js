/* =====================================================================================================================
   BATTLE EFFECTS ON WEBGL (PixiJS)
   A transparent PixiJS canvas laid over the battle screen (position: fixed, pointer-events: none, above the cards and below the DOM .fx layer)
   that draws light and particles the DOM cannot do cheaply: additive sparks, glows and shockwave rings. It ADDS to the existing effects, it
   does not replace them: slashes, shields, floaters, vignettes, shakes and the spell orb flight are untouched, and `btImpact` (the old DOM
   sparks) is what runs whenever this file returns false.
   Prototype and the full effect set: pixi-fx-lab.html (battle hit) and pixi-lab.html (particle effects).
   Rules:
   - Lazy and cheap. PixiJS is created by bfxWarm() when a battle starts (it needs the async vendor script), has NO ticker, and renders only
     from its own requestAnimationFrame loop while particles are alive, so an idle battle costs nothing.
   - Never required. If PixiJS or WebGL is missing, still loading, reduced motion is on, or anything throws, every bfx* function returns false
     and the caller falls back to the old DOM effect.
   - Coordinates are client pixels (the canvas is fixed at 0,0 and covers the window), the same space as getBoundingClientRect.
   - Particles are pooled sprites with a hard cap (BFX_MAX); Fast battles use half the count.
   Top-level names here all start with bfx / BFX so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
const BFX_MAX = 360;
let bfx = null, bfxBusy = false, bfxFailed = false;
const bfxR = (a, b) => a + Math.random() * (b - a), bfxPick = a => a[Math.floor(Math.random() * a.length)];
const bfxHex = c => parseInt(String(c).replace('#', ''), 16) || 0xffe9a8;

async function bfxWarm() {
  if (bfx || bfxBusy || bfxFailed) return;
  bfxBusy = true;
  try {
    if (typeof PIXI === 'undefined') await new Promise((res, rej) => { let n = 0; const t = setInterval(() => { if (typeof PIXI !== 'undefined') { clearInterval(t); res(); } else if (++n > 240) { clearInterval(t); rej(new Error('PixiJS did not load')); } }, 50); });
    const app = new PIXI.Application();
    await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    app.ticker.stop();
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    const rc = document.createElement('canvas'); rc.width = rc.height = 128; const r = rc.getContext('2d'); r.shadowColor = '#fff'; r.shadowBlur = 8; r.strokeStyle = '#fff'; r.lineWidth = 5; r.beginPath(); r.arc(64, 64, 52, 0, 7); r.stroke();
    app.canvas.id = 'bfxCanvas'; app.canvas.setAttribute('aria-hidden', 'true'); app.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:64;display:none';
    bfx = { app, glow: PIXI.Texture.from(cv), ring: PIXI.Texture.from(rc), parts: [], pool: [], raf: 0, last: 0 };
    battleView.appendChild(app.canvas);
    app.canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  } catch (e) { bfxFailed = true; bfx = null; console.warn('Battle effects: WebGL unavailable, using the DOM effects.', e && e.message || e); }
  bfxBusy = false;
}
const bfxOk = () => !!bfx && btMotionOk() && inBattle;
const bfxScale = n => Math.max(2, Math.round(n * (typeof prefs !== 'undefined' && prefs.fast ? 0.5 : 1)));

function bfxEmit(tex, x, y, o) {
  if (bfx.parts.length >= BFX_MAX) return;
  let s = bfx.pool.pop(); if (!s) { s = new PIXI.Sprite(); s.anchor.set(0.5); bfx.app.stage.addChild(s); }
  s.texture = tex === 'ring' ? bfx.ring : bfx.glow; s.visible = true; s.tint = o.tint; s.blendMode = 'add'; s.position.set(x, y);
  bfx.parts.push({ s, x, y, vx: o.vx || 0, vy: o.vy || 0, ay: o.ay || 0, drag: o.drag === undefined ? 0.2 : o.drag, life: o.life || 0.6, age: 0, s0: o.s0 || 14, s1: o.s1 === undefined ? 2 : o.s1, a: o.a === undefined ? 1 : o.a });
}
function bfxStep(now) {
  const b = bfx, dt = Math.min(0.05, (now - b.last) / 1000 || 0.016); b.last = now;
  for (let i = b.parts.length - 1; i >= 0; i--) {
    const p = b.parts[i]; p.age += dt; const u = p.age / p.life;
    if (u >= 1) { p.s.visible = false; b.pool.push(p.s); b.parts[i] = b.parts[b.parts.length - 1]; b.parts.pop(); continue; }
    const d = Math.pow(p.drag, dt); p.vx *= d; p.vy = p.vy * d + p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.s.position.set(p.x, p.y); p.s.scale.set((p.s0 + (p.s1 - p.s0) * (1 - (1 - u) * (1 - u))) / 64); p.s.alpha = p.a * (1 - u);
  }
  b.app.render();
  if (b.parts.length) b.raf = requestAnimationFrame(bfxStep); else { b.raf = 0; b.app.canvas.style.display = 'none'; }
}
function bfxKick() {
  const b = bfx; b.app.canvas.style.display = '';
  if (!b.raf) { b.last = performance.now(); b.raf = requestAnimationFrame(bfxStep); }
}
function bfxCenter(el) { const r = el && el.getBoundingClientRect(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : null; }

// A hit: a flash, a shockwave ring and a spray of sparks from the middle of the element (a card or a Spirit bar). n >= 6 is a knockout and also sends embers up.
function bfxImpact(el, n, tint) {
  try {
    if (!bfxOk()) return false;
    const c = bfxCenter(el); if (!c) return false; const big = n >= 6, base = Math.min(c.w, 120) / 80;
    bfxEmit('glow', c.x, c.y, { tint: 0xffd9a0, s0: 30 * base, s1: 110 * base, life: 0.22, a: 0.9, drag: 1 });
    bfxEmit('ring', c.x, c.y, { tint: tint || 0xffd2a0, s0: 14 * base, s1: (big ? 190 : 130) * base, life: big ? 0.5 : 0.38, a: 0.85, drag: 1 });
    for (let i = 0, k = bfxScale(big ? 22 : 14); i < k; i++) { const a = bfxR(0, 6.283), v = bfxR(90, big ? 340 : 260); bfxEmit('glow', c.x, c.y, { tint: tint || bfxPick([0xffe08a, 0xff9a2e, 0xffffff]), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, ay: 380, drag: 0.15, life: bfxR(0.3, 0.7), s0: bfxR(7, 15) }); }
    if (big) for (let i = 0, k = bfxScale(12); i < k; i++) bfxEmit('glow', c.x + bfxR(-c.w / 3, c.w / 3), c.y + bfxR(-c.h / 4, c.h / 4), { tint: bfxPick([0xffb347, 0xff7a2e, 0xffe08a]), vx: bfxR(-30, 30), vy: bfxR(-60, -150), drag: 0.5, life: bfxR(0.7, 1.3), s0: bfxR(8, 16) });
    bfxKick(); return true;
  } catch (e) { return false; }
}
// A spell landing: a coloured flash and ring at the target, plus motes in the spell's colour (rising for buffs and draws, bursting for the rest).
function bfxSpell(x, y, color, kind) {
  try {
    if (!bfxOk()) return false; const tint = bfxHex(color), up = kind === 'rise' || kind === 'draw';
    bfxEmit('glow', x, y, { tint, s0: 40, s1: 170, life: 0.4, a: 0.85, drag: 1 });
    bfxEmit('ring', x, y, { tint, s0: 16, s1: 220, life: 0.55, a: 0.9, drag: 1 });
    for (let i = 0, k = bfxScale(up ? 18 : 26); i < k; i++) {
      if (up) bfxEmit('glow', x + bfxR(-40, 40), y + bfxR(-10, 30), { tint: bfxPick([tint, 0xffffff]), vy: bfxR(-60, -150), vx: bfxR(-20, 20), drag: 0.55, life: bfxR(0.8, 1.4), s0: bfxR(8, 15) });
      else { const a = bfxR(0, 6.283), v = bfxR(80, 300); bfxEmit('glow', x, y, { tint: bfxPick([tint, 0xffffff]), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.1, life: bfxR(0.45, 0.95), s0: bfxR(8, 17) }); }
    }
    bfxKick(); return true;
  } catch (e) { return false; }
}
