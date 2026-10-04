/* =====================================================================================================================
   WEATHER ON ONE CANVAS (rain and snow)
   The original rain is 60 animated <div>s and the snow 22 more (see buildRainDrops / buildSnowFlakes in
   town-render-weather.js). Each one is its own animated element sitting on top of the whole map, which is what the
   frame-time benchmark (scripts/perf-town.js) found to be the most consistent cost on a throttled CPU. This file draws
   the same effect into a single <canvas> from one requestAnimationFrame loop instead.
   It is ON by default (since build 134, together with the WebGL ground in js/town-gl.js) and switched off only by
   ?renderer=dom in the URL or localStorage['tr-renderer']='dom', which brings back the old CSS drops and flakes exactly.
   ?renderer=canvas keeps the old tiles but uses this weather. When it is off nothing in this file runs except the
   one-line guards in town-render-weather.js.
   Rules it keeps: nothing is drawn (and no loop runs) while a battle, a building, another tab or a hidden page covers
   the town, or when reduced motion is on - the CSS version froze then too. Fades match the CSS
   (about 2.2s), a change of weather fades the old one out before the new one in. Lightning, sun and cloud shadows stay
   CSS: each is a single element.
   ===================================================================================================================== */
const WEATHER_CANVAS = (() => {
  try { return (new URLSearchParams(location.search).get('renderer') || localStorage.getItem('tr-renderer') || 'gl') !== 'dom'; }
  catch (e) { return true; }
})();
function weatherCanvasOn() { return WEATHER_CANVAS; }

const fx = { cv: null, cx: null, raf: 0, timer: 0, want: null, kind: null, alpha: 0, last: 0, w: 0, h: 0, dpr: 1, parts: [], frames: 0, motion: true };
const FX_FADE_S = 2.2, FX_SLANT = Math.sin(8 * Math.PI / 180);   // rain leans 8 degrees, like the CSS rotate(8deg)

function fxAttach(layer) {
  fx.cv = document.createElement('canvas'); fx.cv.className = 'fx-canvas'; fx.cv.setAttribute('aria-hidden', 'true');
  fx.cx = fx.cv.getContext('2d');
  layer.appendChild(fx.cv);
  if (fx.raf) cancelAnimationFrame(fx.raf);
  if (fx.timer) clearTimeout(fx.timer);
  fx.raf = fx.timer = 0; fx.last = 0; fx.kind = null; fx.alpha = 0;
  fxResize();
}
// Called from layoutTown(): the canvas matches the town view in CSS pixels.
function fxResize() {
  if (!fx.cv || !townView) return;
  const w = townView.clientWidth, h = townView.clientHeight;
  if (!w || !h) return;
  // Capped at 1x on purpose: at 2x the canvas was clearly slower in the benchmark (software raster), and soft rain hairlines gain nothing from it.
  fx.dpr = 1;
  fx.w = w; fx.h = h;
  fx.cv.width = Math.round(w * fx.dpr); fx.cv.height = Math.round(h * fx.dpr);
  if (fx.kind) fxSeed();
}
// The CSS layer (.town-weather) is 1.2x as wide and 1.4x as tall as the town view, and its drops spend about half their fall
// off-screen. This canvas covers only the view, so it has fewer particles and a shorter fall at the same on-screen speed and
// density: rain 60 -> 24 drops, a 1.15-view-height fall in 0.556x the time; snow 22 -> 10 flakes, 1.1 view heights in 0.625x.
function fxSeed() {
  const storm = fx.kind === 'storm', n = fx.kind === 'snow' ? 10 : 24, parts = [];
  for (let i = 0; i < n; i++) {
    if (fx.kind === 'snow') parts.push({ x: Math.random(), p: Math.random(), dur: (6 + Math.random() * 7) * 0.625, size: 3 + Math.random() * 4, drift: Math.random() * 40 - 20 });
    else parts.push({ x: Math.random(), p: Math.random(), dur: (1.7 + Math.random() * 0.9) * (storm ? 0.75 : 1) * 0.556, len: (4 + Math.random() * 3) / 100 * 0.85 * (storm ? 1.2 : 1) });
  }
  fx.parts = parts;
}
function fxVisible() {
  const p = document.getElementById('townPanel');
  return !document.hidden && !inBattle && !inScene && !!p && !p.hidden && !p.classList.contains('tab-away');
}
// applyWeather() tells us what the sky wants; the loop does the fading.
function fxSet(kind, instant) {
  if (!fx.cv) return;
  fx.want = (kind === 'rain' || kind === 'storm' || kind === 'snow') ? kind : null;
  if (instant) {
    fx.kind = fx.want; fx.alpha = fx.want ? 1 : 0;
    if (fx.kind) fxSeed();
  }
  fxWake();
}
function fxWake() {
  if (fx.timer) { clearTimeout(fx.timer); fx.timer = 0; }
  if (fx.raf || !fx.cv) return;
  fx.motion = btMotionOk();
  if (!fx.kind && !fx.want) return;
  if (!fx.motion) { fxClear(); return; }
  if (!fxVisible()) { fx.timer = setTimeout(fxWake, 300); return; }   // covered: no frames, just a cheap poll for the town coming back
  fx.last = 0; fx.raf = requestAnimationFrame(fxFrame);
}
function fxClear() { if (fx.cx) { fx.cx.setTransform(1, 0, 0, 1, 0, 0); fx.cx.clearRect(0, 0, fx.cv.width, fx.cv.height); } }
function fxFrame(t) {
  fx.raf = 0;
  if (!fx.cv) return;
  if (++fx.frames % 90 === 0) fx.motion = btMotionOk();
  if (!fx.motion || !fxVisible()) { fxClear(); fxWake(); return; }
  const dt = fx.last ? Math.min(0.05, (t - fx.last) / 1000) : 0; fx.last = t;
  // Fade the current weather out when the sky wants something else, swap, fade the new one in.
  if (fx.kind !== fx.want && fx.alpha <= 0.01) { fx.kind = fx.want; fx.alpha = 0; if (fx.kind) fxSeed(); }
  const target = fx.kind && fx.kind === fx.want ? 1 : 0;
  fx.alpha += Math.sign(target - fx.alpha) * Math.min(Math.abs(target - fx.alpha), dt / FX_FADE_S);
  if (!fx.kind && !fx.want) { fxClear(); return; }   // nothing to show and nothing coming: the loop ends here
  const { cx, w, h, dpr } = fx;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
  if (fx.alpha > 0.01) {
    cx.globalAlpha = fx.alpha;
    if (fx.kind === 'snow') {
      cx.fillStyle = 'rgba(242,247,250,0.85)'; cx.beginPath();
      for (const f of fx.parts) {
        f.p += dt / f.dur; if (f.p >= 1) f.p -= 1;
        const x = f.x * w + f.p * f.drift, y = -0.05 * h + f.p * h * 1.1;
        cx.moveTo(x + f.size / 2, y); cx.arc(x, y, f.size / 2, 0, 6.2832);
      }
      cx.fill();
    } else {
      cx.strokeStyle = fx.kind === 'storm' ? 'rgba(208,222,242,0.45)' : 'rgba(200,215,235,0.34)'; cx.lineWidth = 1; cx.beginPath();
      const fall = h * 1.15;
      for (const d of fx.parts) {
        d.p += dt / d.dur; if (d.p >= 1) d.p -= 1;
        const travel = d.p * fall, len = d.len * h, x = d.x * w - FX_SLANT * travel, y = -0.12 * h + travel;
        cx.moveTo(x + FX_SLANT * len, y - len); cx.lineTo(x, y);
      }
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }
  fx.raf = requestAnimationFrame(fxFrame);
}
