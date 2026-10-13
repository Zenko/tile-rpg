/* =====================================================================================================================
   HOLO FOIL SHADER (PixiJS)
   The real-shader version of the foil in js/holo-foil.js. A Pixi canvas is laid over the revealed card, inside its face, and a
   fragment shader paints the foil on it: a rainbow that slides with the light, a diagonal sweep, a soft glare under the finger and
   twinkling sparkles, stronger for each rarity step. Prototype: labs/pixi-fx-lab.html ("Holo card").
   - The card itself is DOM, so the shader cannot touch its pixels; it draws a semi-transparent layer ABOVE the card. It uses plain alpha
     compositing (no CSS blend modes, which HANDOFF section 9 warns tear on phones).
   - It is driven by the same two custom properties as the CSS foil, --hx / --hy on the card face (read every frame from the computed style,
     so both a finger and the idle CSS sweep move it). holo-foil.js still does the finger handling and the frame tilt.
   - holoApply() calls hglApply(face, tier) last. If the shader is up, the face gets .holo-gl and the CSS foil spans are hidden; if
     PixiJS or WebGL is missing, or anything throws, nothing is added and the CSS foil stays exactly as it was.
   - One PIXI.Application is made the first time it is needed and reused: its canvas moves into each new face. It renders from its own rAF
     loop only while the canvas is inside a visible card face, and stops by itself when the card is replaced or the popup closes.
   - Reduced motion: the time input stays still (no sweep, no twinkle drift); the foil still follows a finger.
   Top-level names here all start with hgl so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
let hgl = null, hglBusy = false, hglFailed = false, hglRaf = 0, hglFace = null, hglTier = 2;
// strength per tier index (RARITY_ORDER: 2 ultra, 3 super, 4 mythic, 5 divine/atlas): [rainbow, sweep, sparkle]
const HGL_STRENGTH = { 2: [0.17, 0.3, 0], 3: [0.21, 0.4, 0.6], 4: [0.26, 0.5, 0.9], 5: [0.3, 0.55, 1] };
const HGL_VERT = `in vec2 aPosition; out vec2 vTextureCoord;
uniform vec4 uInputSize; uniform vec4 uOutputFrame; uniform vec4 uOutputTexture;
void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`;
const HGL_FRAG = `precision highp float; in vec2 vTextureCoord; out vec4 finalColor; uniform sampler2D uTexture;
uniform vec2 uPtr; uniform float uTime; uniform vec3 uHolo;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main(void) {
  vec2 uv = vTextureCoord;
  vec3 rainbow = hue(fract((uv.x * 0.8 + uv.y) * 1.3 + (uPtr.x - 0.5) * 1.2 + (uPtr.y - 0.5) * 0.6 + uTime * 0.03));
  float ra = uHolo.x * (0.8 + 0.2 * sin((uv.x + uv.y) * 30.0 + uTime));
  float diag = (uv.x + uv.y * 0.7) - (uPtr.x + uPtr.y * 0.7) - 0.1;
  float sw = uHolo.y * exp(-pow(diag * 5.5, 2.0));
  float gl = uHolo.y * 0.45 * exp(-pow(length((uv - uPtr) * vec2(1.0, 1.25)) * 2.8, 2.0));
  vec2 cellUv = uv * vec2(46.0, 64.0); vec2 g = floor(cellUv); float n = hash(g);
  float tw = uHolo.z * step(0.965, n) * smoothstep(0.5, 0.0, length(fract(cellUv) - 0.5)) * (0.5 + 0.5 * sin(uTime * 4.0 + n * 60.0));
  float wa = sw + gl + tw;
  float a = clamp(ra + wa, 0.0, 0.8);
  vec3 col = (rainbow * ra + vec3(1.0, 0.97, 0.9) * wa) / max(ra + wa, 0.0001);
  finalColor = vec4(col * a, a);
}`;

async function hglWarm() {
  if (hgl || hglBusy || hglFailed) return;
  hglBusy = true;
  try {
    if (typeof PIXI === 'undefined') await pixiReady;
    const app = new PIXI.Application();
    await app.init({ width: 64, height: 64, backgroundAlpha: 0, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    app.ticker.stop();
    const filter = new PIXI.Filter({ glProgram: PIXI.GlProgram.from({ vertex: HGL_VERT, fragment: HGL_FRAG, name: 'holo-gl' }), resources: { u: { uPtr: { value: [0.5, 0.4], type: 'vec2<f32>' }, uTime: { value: 0, type: 'f32' }, uHolo: { value: [0, 0, 0], type: 'vec3<f32>' } } } });
    const spr = new PIXI.Sprite(PIXI.Texture.WHITE); spr.width = 64; spr.height = 64; spr.filters = [filter]; app.stage.addChild(spr);
    app.canvas.className = 'holo-gl-canvas'; app.canvas.setAttribute('aria-hidden', 'true');
    app.canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    hgl = { app, filter, spr, w: 0, h: 0 };
    if (hglFace && hglFace.isConnected) hglApply(hglFace, hglTier);   // a card was waiting for it
  } catch (e) { hglFailed = true; hgl = null; console.warn('Holo foil: WebGL unavailable, using the CSS foil.', e && e.message || e); }
  hglBusy = false;
}
function hglPct(v, d) { const n = parseFloat(v); return isFinite(n) ? n / 100 : d; }
function hglFrame(now) {
  hglRaf = 0;
  const face = hglFace; if (!hgl || !face || hgl.app.canvas.parentNode !== face || !face.isConnected) return;   // replaced by another card or gone: stop
  const w = face.offsetWidth, h = face.offsetHeight;
  if (w && h) {
    if (hgl.w !== w || hgl.h !== h) { hgl.w = w; hgl.h = h; hgl.app.renderer.resize(w, h); hgl.spr.width = w; hgl.spr.height = h; }
    const cs = getComputedStyle(face), u = hgl.filter.resources.u.uniforms;
    u.uPtr = [hglPct(cs.getPropertyValue('--hx'), 0.5), hglPct(cs.getPropertyValue('--hy'), 0.4)];
    u.uTime = btMotionOk() ? now / 1000 : 0; u.uHolo = HGL_STRENGTH[hglTier] || HGL_STRENGTH[2];
    hgl.app.render();
  }
  hglRaf = requestAnimationFrame(hglFrame);
}
// Called at the end of holoApply (ultra and up): puts the shader canvas into the face and starts it.
function hglApply(face, tier) {
  try {
    hglFace = face; hglTier = Math.min(tier, 5);
    if (hglFailed) return;
    if (!hgl) { hglWarm(); return; }
    if (hgl.app.canvas.parentNode !== face) face.appendChild(hgl.app.canvas);
    hgl.w = 0; face.classList.add('holo-gl');
    if (!hglRaf) hglRaf = requestAnimationFrame(hglFrame);
  } catch (e) { hglFailed = true; face.classList.remove('holo-gl'); }
}
