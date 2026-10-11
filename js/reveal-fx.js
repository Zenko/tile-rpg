/* =====================================================================================================================
   CARD REVEAL BURST ON WEBGL (PixiJS) - the pack-opening moment
   When a face-down card from a pack (or a summon, or a Fate) is tapped open, or any mythic-and-up card is revealed, a burst of light is
   drawn over the popup around the card: a flash, shockwave rings, rays of light and falling sparks, all in the rarity's colour, bigger
   with every step up the rarity ladder. It ADDS to the existing reveal (the flip, the glow, the DOM sparkleBurst, the sound); nothing is
   replaced, and with no WebGL, still loading, or reduced motion, rvfxReveal() returns false and the reveal plays as it always did.
   - One transparent fixed canvas (#rvfxCanvas, pointer-events: none, z-index 24: above the reveal popup at 22 and the tip at 23) made the
     first time it is needed. No ticker; it renders from its own rAF loop only while particles are alive, then hides itself.
   - Particles come from the shared helper in js/pixi-particles.js, in client pixels. Fast mode halves the counts.
   - Tiers: 0 common (nothing) - 1 rare (ring, motes) - 2 ultra (+ rays) - 3 super (+ stars) - 4 mythic (+ second ring, more of everything)
     - 5 divine / Atlas (+ a screen-wide flash and a rain of gold).
   Top-level names here all start with rvfx so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
const RVFX_TIER = { common: 0, rare: 1, ultra: 2, super: 3, mythic: 4, divine: 5, atlas: 5 };
let rvfx = null, rvfxBusy = false, rvfxFailed = false;
const rvfxR = (a, b) => a + Math.random() * (b - a);

async function rvfxWarm() {
  if (rvfx || rvfxBusy || rvfxFailed) return;
  rvfxBusy = true;
  try {
    if (typeof PIXI === 'undefined') await new Promise((res, rej) => { let n = 0; const t = setInterval(() => { if (typeof PIXI !== 'undefined') { clearInterval(t); res(); } else if (++n > 240) { clearInterval(t); rej(new Error('PixiJS did not load')); } }, 50); });
    const app = new PIXI.Application();
    await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    app.ticker.stop();
    app.canvas.id = 'rvfxCanvas'; app.canvas.setAttribute('aria-hidden', 'true'); app.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:24;display:none';
    document.body.appendChild(app.canvas);
    app.canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    rvfx = { app, sys: ppMake(app.stage, 420), raf: 0, last: 0 };
  } catch (e) { rvfxFailed = true; rvfx = null; console.warn('Reveal effects: WebGL unavailable, the reveal plays without them.', e && e.message || e); }
  rvfxBusy = false;
}
function rvfxStep(now) {
  const b = rvfx, dt = Math.min(0.05, (now - b.last) / 1000 || 0.016); b.last = now;
  const alive = ppStep(b.sys, dt); b.app.render();
  if (alive) b.raf = requestAnimationFrame(rvfxStep); else { b.raf = 0; b.app.canvas.style.display = 'none'; }
}
function rvfxKick() {
  const b = rvfx; b.app.canvas.style.display = '';
  if (!b.raf) { b.last = performance.now(); b.raf = requestAnimationFrame(rvfxStep); }
}
const rvfxN = n => Math.max(2, Math.round(n * (typeof prefs !== 'undefined' && prefs.fast ? 0.5 : 1)));
function rvfxTint(rarity) { const m = typeof PFX_RARITY_RGB !== 'undefined' && PFX_RARITY_RGB[rarity]; const p = (m || '255,214,120').split(',').map(Number); return (p[0] << 16) | (p[1] << 8) | p[2]; }

// el: the card frame. fromPack: it was a face-down card the player tapped open (smaller reveals only get the burst then).
function rvfxReveal(el, rarity, fromPack) {
  try {
    const tier = RVFX_TIER[rarity] || 0;
    if (tier < (fromPack ? 1 : 3)) return false;
    if (!rvfx) { rvfxWarm(); return false; }                        // not made yet (showCardReveal warms it when a card is revealed): this one plays without it
    if (!btMotionOk() || !el) return false;
    const r = el.getBoundingClientRect(); if (!r.width) return false;
    const S = rvfx.sys, x = r.left + r.width / 2, y = r.top + r.height / 2, tint = rvfxTint(rarity), big = Math.max(r.width, r.height);
    ppEmit(S, { tex: 'glow', tint, x, y, life: 0.45, s0: big * 0.5, s1: big * (1.3 + tier * 0.25), a: 0.75, drag: 1 });
    ppEmit(S, { tex: 'ring', tint, x, y, life: 0.7, s0: big * 0.3, s1: big * (1.1 + tier * 0.2), a: 0.9, drag: 1 });
    if (tier >= 4) ppEmit(S, { tex: 'ring', tint: 0xffffff, x, y, life: 0.95, s0: big * 0.2, s1: big * 1.7, a: 0.7, drag: 1 });
    if (tier >= 5) ppEmit(S, { tex: 'glow', tint: 0xfff2c0, x: window.innerWidth / 2, y: window.innerHeight / 2, life: 0.7, s0: big, s1: Math.max(window.innerWidth, window.innerHeight) * 1.5, a: 0.35, drag: 1 });
    if (tier >= 2) for (let i = 0, k = rvfxN(6 + tier * 3); i < k; i++) {                // rays of light, fanned out from the middle, turning slowly as they fade
      const a = (i / k) * 6.283 + rvfxR(-0.12, 0.12);
      ppEmit(S, { tex: 'ray', tint: i % 3 ? tint : 0xffffff, x, y, rot: a, vr: rvfxR(-0.35, 0.35), life: rvfxR(0.9, 1.4), s0: big * 0.9, s1: big * rvfxR(1.5, 2.2), a: 0.55, bell: true, drag: 1 });
    }
    for (let i = 0, k = rvfxN(10 + tier * 5); i < k; i++) {                                // motes thrown out and rising
      const a = rvfxR(0, 6.283), v = rvfxR(60, 220 + tier * 30);
      ppEmit(S, { tex: i % 3 ? 'glow' : 'star', tint: i % 4 ? tint : 0xffffff, x: x + Math.cos(a) * big * 0.25, y: y + Math.sin(a) * big * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, ay: 40, drag: 0.35, life: rvfxR(0.9, 1.7), s0: rvfxR(9, 18), s1: 2 });
    }
    if (tier >= 3) for (let i = 0, k = rvfxN(10 + tier * 4); i < k; i++)                    // sparks falling past the card
      ppEmit(S, { tex: 'star', tint: i % 2 ? tint : 0xffffff, x: rvfxR(r.left - 30, r.right + 30), y: r.top - rvfxR(0, 60), vx: rvfxR(-18, 18), vy: rvfxR(30, 90), ay: 120, drag: 0.8, life: rvfxR(1.1, 2), s0: rvfxR(8, 15), s1: 3, bell: true });
    rvfxKick(); return true;
  } catch (e) { return false; }
}
