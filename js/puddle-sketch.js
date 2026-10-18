/* ============================================================
   SKETCHBOOK WORLDS (build 263): the puddle world kind 'sketch'
   A world that was never finished: a pale paper page whose drawings went missing. Five sketch stones each ask for one thing
   (a full moon, a mountain, a star, a lightning bolt...). Walk up to a stone and a page opens: the shape glows for a moment,
   then fades, and you draw it from memory with one stroke of your finger. A small shape recogniser (the "$1 unistroke"
   method: resample, rotate, scale, compare) grades it: the right shape scores 1 to 3 stars by how close it is; a drawing that
   looks more like another shape is named ("that looks more like a heart") and you try again. Your own stroke is then
   inked onto the stone in glowing lines, and the page fills with colour a little more each time. Ink all five and the
   world lets you go with Embers for every star and a card that is better the more stars you earned.

   - World record: sketches done in data.stones [{ id, x, y, shape, done, stars, path }] (path = your stroke, 0..100 box,
     saved, so your drawings survive a reload and are drawn on the map); w.stars totals them.
   - SK_SHAPES are the shapes a stone can ask for; skTemplates() builds each one's reference strokes (both directions, and for
     closed shapes four starting points) once. skRecognize(points) -> { shape, score 0..1 }. SK_PASS / SK_STARS set the grades.
   - The drawing page is built on demand (#skSheet), pointer events on a canvas; reduced motion skips the ghost's fade.
   Look: the SKETCHBOOK block at the end of css/latest.css; colours are --sketch-* in css/theme.css.
   ============================================================ */
const SK_N = 64, SK_SIZE = 250, SK_STONES = 5, SK_PASS = 0.78, SK_STARS = [0.78, 0.84, 0.9];   // a pass, two stars, three stars
const SK_SHAPES = {
  circle:   { icon: '🌕', ask: 'a full moon',      hint: 'One round loop' },
  triangle: { icon: '⛰️', ask: 'a mountain',       hint: 'Three straight sides' },
  square:   { icon: '🪟', ask: 'a window',         hint: 'Four sides, four corners' },
  star:     { icon: '⭐', ask: 'a star',           hint: 'Five points, without lifting your finger' },
  zigzag:   { icon: '⚡', ask: 'a lightning bolt', hint: 'A sharp zig, a zag and a zig' },
  spiral:   { icon: '🌀', ask: 'a whirlpool',      hint: 'Curl in towards the middle' },
  heart:    { icon: '❤️', ask: 'a heart',          hint: 'Two bumps on top, a point at the bottom' },
  wave:     { icon: '🌊', ask: 'a wave',           hint: 'Up, down, up, down' }
};
const SK_WORDS = ['Sketchbook', 'Unfinished Page', 'Margin', 'Rough Draft', 'Doodle'];

/* ---------------- the recogniser ($1 unistroke) ---------------- */
function skPathLength(p) { let d = 0; for (let i = 1; i < p.length; i++) d += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); return d; }
function skResample(points, n) {
  const I = skPathLength(points) / (n - 1), out = [points[0]]; let D = 0, pts = points.slice();
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (D + d >= I && d > 0) {
      const q = { x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y) };
      out.push(q); pts.splice(i, 0, q); D = 0;
    } else D += d;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out.slice(0, n);
}
function skCentroid(p) { return p.reduce((c, q) => ({ x: c.x + q.x / p.length, y: c.y + q.y / p.length }), { x: 0, y: 0 }); }
function skRotate(p, a) { const c = skCentroid(p), cos = Math.cos(a), sin = Math.sin(a); return p.map(q => ({ x: (q.x - c.x) * cos - (q.y - c.y) * sin + c.x, y: (q.x - c.x) * sin + (q.y - c.y) * cos + c.y })); }
function skScaleTranslate(p) {
  const xs = p.map(q => q.x), ys = p.map(q => q.y), minX = Math.min(...xs), minY = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - minX, 1e-6), h = Math.max(Math.max(...ys) - minY, 1e-6);
  const s = p.map(q => ({ x: q.x * SK_SIZE / w, y: q.y * SK_SIZE / h })), c = skCentroid(s);
  return s.map(q => ({ x: q.x - c.x, y: q.y - c.y }));
}
function skNormalize(points) {
  const r = skResample(points, SK_N), c = skCentroid(r);
  return skScaleTranslate(skRotate(r, -Math.atan2(c.y - r[0].y, c.x - r[0].x)));
}
function skPathDistance(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y); return d / a.length; }
function skBestDistance(p, t) {   // golden-section search over +-45 degrees
  const phi = 0.5 * (Math.sqrt(5) - 1); let a = -Math.PI / 4, b = Math.PI / 4;
  let x1 = phi * a + (1 - phi) * b, f1 = skPathDistance(skRotate(p, x1), t), x2 = (1 - phi) * a + phi * b, f2 = skPathDistance(skRotate(p, x2), t);
  while (Math.abs(b - a) > Math.PI / 90) {
    if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = phi * a + (1 - phi) * b; f1 = skPathDistance(skRotate(p, x1), t); }
    else { a = x1; x1 = x2; f1 = f2; x2 = (1 - phi) * a + phi * b; f2 = skPathDistance(skRotate(p, x2), t); }
  }
  return Math.min(f1, f2);
}
// The reference strokes, in a 0..100 box (y down).
function skShapePoints(shape) {
  const P = [], arc = (n, fx, fy) => { for (let i = 0; i <= n; i++) { const t = i / n; P.push({ x: fx(t), y: fy(t) }); } };
  if (shape === 'circle') arc(64, t => 50 + 45 * Math.cos(2 * Math.PI * t), t => 50 + 45 * Math.sin(2 * Math.PI * t));
  else if (shape === 'triangle') [[50, 8], [92, 88], [8, 88], [50, 8]].forEach(([x, y]) => P.push({ x, y }));
  else if (shape === 'square') [[10, 10], [90, 10], [90, 90], [10, 90], [10, 10]].forEach(([x, y]) => P.push({ x, y }));
  else if (shape === 'star') { for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; P.push({ x: 50 + 45 * Math.cos(a), y: 52 + 45 * Math.sin(a) }); } }
  else if (shape === 'zigzag') [[30, 5], [70, 40], [35, 55], [75, 95]].forEach(([x, y]) => P.push({ x, y }));
  else if (shape === 'spiral') arc(80, t => 50 + 45 * (1 - t) * Math.cos(4 * Math.PI * t), t => 50 + 45 * (1 - t) * Math.sin(4 * Math.PI * t));
  else if (shape === 'heart') arc(80, t => { const a = 2 * Math.PI * t; return 50 + 2.6 * 16 * Math.pow(Math.sin(a), 3); }, t => { const a = 2 * Math.PI * t; return 45 - 2.6 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); });
  else if (shape === 'wave') arc(64, t => 5 + 90 * t, t => 50 + 30 * Math.sin(4 * Math.PI * t));
  return P;
}
// Dense polyline (so every corner survives resampling), both directions, and for closed shapes four starting points.
function skDensify(p) { const out = []; for (let i = 1; i < p.length; i++) for (let k = 0; k < 12; k++) { const t = k / 12; out.push({ x: p[i - 1].x + (p[i].x - p[i - 1].x) * t, y: p[i - 1].y + (p[i].y - p[i - 1].y) * t }); } out.push(p[p.length - 1]); return out; }
const SK_CLOSED = { circle: 1, triangle: 1, square: 1, star: 1, heart: 1 };
let skTemplateCache = null;
function skTemplates() {
  if (skTemplateCache) return skTemplateCache;
  skTemplateCache = [];
  Object.keys(SK_SHAPES).forEach(shape => {
    const base = skDensify(skShapePoints(shape)), variants = [base, base.slice().reverse()];
    if (SK_CLOSED[shape]) {
      const ring = base.slice(0, -1);
      [0.25, 0.5, 0.75].forEach(f => { const k = Math.floor(ring.length * f), r = ring.slice(k).concat(ring.slice(0, k)); r.push(r[0]); variants.push(r, r.slice().reverse()); });
    }
    variants.forEach(v => skTemplateCache.push({ shape, points: skNormalize(v) }));
  });
  return skTemplateCache;
}
// points: the stroke as [{x, y}] in any units. Returns the best shape and a score 0..1 (1 = perfect).
function skRecognize(points) {
  if (!points || points.length < 8 || skPathLength(points) < 40) return { shape: null, score: 0 };
  const cand = skNormalize(points), best = {};
  skTemplates().forEach(t => { const d = skBestDistance(cand, t.points); if (best[t.shape] === undefined || d < best[t.shape]) best[t.shape] = d; });
  const half = 0.5 * Math.sqrt(2 * SK_SIZE * SK_SIZE), ranked = Object.keys(best).sort((a, b) => best[a] - best[b]);
  return { shape: ranked[0], score: Math.max(0, 1 - best[ranked[0]] / half), scores: Object.fromEntries(ranked.map(k => [k, Math.max(0, 1 - best[k] / half)])) };
}
// How a drawing does against the shape that was asked for: { ok, stars, score, looksLike }.
function skGrade(points, want) {
  const r = skRecognize(points), score = (r.scores && r.scores[want]) || 0;
  if (r.shape !== want || score < SK_PASS) return { ok: false, stars: 0, score, looksLike: r.shape && r.shape !== want ? r.shape : null };
  return { ok: true, stars: SK_STARS.filter(s => score >= s).length, score, looksLike: null };
}
// The stroke squeezed into a 0..100 box (for saving and for drawing it back on the stone).
function skFitPath(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y), minX = Math.min(...xs), minY = Math.min(...ys);
  const s = 84 / Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1), ox = (100 - (Math.max(...xs) - minX) * s) / 2, oy = (100 - (Math.max(...ys) - minY) * s) / 2;
  const step = Math.max(1, Math.floor(points.length / 48));
  return points.filter((_, i) => i % step === 0 || i === points.length - 1).map(p => [Math.round(ox + (p.x - minX) * s), Math.round(oy + (p.y - minY) * s)]);
}
const skSvgPath = path => 'M' + path.map(([x, y]) => x + ' ' + y).join('L');

/* ---------------- the drawing page ---------------- */
let skOpen = null;   // { w, stone, points, drawing }
function skSheetEl() {
  let el = document.getElementById('skSheet');
  if (el) return el;
  el = document.createElement('div'); el.id = 'skSheet'; el.className = 'sk-sheet hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="sk-card"><div class="sk-head"><span class="sk-icon"></span><div><b class="sk-ask"></b><small class="sk-hint"></small></div><button type="button" class="sk-x" aria-label="Close">✕</button></div>
    <div class="sk-pad"><svg class="sk-ghost" viewBox="0 0 100 100" aria-hidden="true"><path></path></svg><canvas class="sk-canvas" width="600" height="600" aria-label="Drawing area"></canvas></div>
    <div class="sk-msg" aria-live="polite"></div><div class="sk-btns"><button type="button" class="btn btn-ghost sk-peek">👁️ Peek</button><button type="button" class="btn btn-ghost sk-clear">Clear</button></div></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('.sk-canvas'), ctx = cv.getContext('2d');
  const at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--sketch-ink').trim() || 'black';
  cv.addEventListener('pointerdown', e => {
    if (!skOpen) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    skOpen.points = [at(e)]; skOpen.drawing = true; ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(skOpen.points[0].x, skOpen.points[0].y);
    el.querySelector('.sk-msg').textContent = '';
  });
  cv.addEventListener('pointermove', e => { if (!skOpen || !skOpen.drawing) return; const p = at(e); skOpen.points.push(p); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  const up = () => { if (!skOpen || !skOpen.drawing) return; skOpen.drawing = false; skJudge(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  el.querySelector('.sk-clear').addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); if (skOpen) skOpen.points = []; el.querySelector('.sk-msg').textContent = ''; sfx('tap'); });
  el.querySelector('.sk-peek').addEventListener('click', () => { skGhost(1400); sfx('tap'); });
  el.querySelector('.sk-x').addEventListener('click', () => skClose());
  return el;
}
function skGhost(ms) {
  const el = skSheetEl(), g = el.querySelector('.sk-ghost');
  g.classList.remove('fade'); g.classList.add('show');
  clearTimeout(skGhost.t); skGhost.t = setTimeout(() => g.classList.add('fade'), ms);
}
function skOpenStone(w, stone) {
  const el = skSheetEl(), sh = SK_SHAPES[stone.shape];
  skOpen = { w, stone, points: [], drawing: false };
  el.querySelector('.sk-icon').textContent = sh.icon;
  el.querySelector('.sk-ask').textContent = `Draw ${sh.ask}`;
  el.querySelector('.sk-hint').textContent = `${sh.hint}. Watch, then draw it from memory in one stroke.`;
  el.querySelector('.sk-ghost path').setAttribute('d', skSvgPath(skShapePoints(stone.shape).map(p => [p.x, p.y])));
  el.querySelector('.sk-msg').textContent = '';
  const cv = el.querySelector('.sk-canvas'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  el.classList.remove('hidden'); document.body.classList.add('in-sketch');
  skGhost(1600); sfx('flip');
}
function skClose() { const el = document.getElementById('skSheet'); if (el) el.classList.add('hidden'); document.body.classList.remove('in-sketch'); skOpen = null; }
function skJudge() {
  const o = skOpen; if (!o) return;
  const el = skSheetEl(), msg = el.querySelector('.sk-msg'), g = skGrade(o.points, o.stone.shape);
  if (!g.ok) {
    msg.textContent = g.looksLike ? `That looks more like ${SK_SHAPES[g.looksLike].ask}. Try again, or peek once more.` : 'Not quite. Try again in one smooth stroke.';
    sfx('tie'); buzz(HAP.tap); return;
  }
  const st = o.stone; st.done = true; st.stars = g.stars; st.path = skFitPath(o.points);
  o.w.stars = (o.w.stars || 0) + g.stars; bumpStat('sketches', 1); if (g.stars === 3) bumpStat('sketchPerfect', 1);
  addPebbles(g.stars, 'puddle-world');
  msg.textContent = `${'★'.repeat(g.stars)}${'☆'.repeat(3 - g.stars)}  ${Math.round(g.score * 100)}% · it comes to life!`;
  sfx(g.stars === 3 ? 'rare' : 'found'); buzz(HAP.tap); saveState();
  setTimeout(() => {
    skClose(); renderTown();
    const data = state.districtData[PW_KEY]; if (!data) return;
    skPaint(o.w);
    if (typeof refreshGoalChip === 'function') refreshGoalChip(true);
    if (data.stones.every(s => s.done)) skFinish(o.w);
  }, 1100);
}
// The page fills with colour as the stones are inked.
function skPaint(w) {
  const data = state.districtData[PW_KEY]; if (!townView || !data) return;
  townView.classList.add('pw-sketch');
  townView.style.setProperty('--sk-done', String(data.stones.filter(s => s.done).length / data.stones.length));
}
function skUnpaint() { if (townView) { townView.classList.remove('pw-sketch'); townView.style.removeProperty('--sk-done'); } skClose(); }
function skFinish(w) {
  if (w.finished) return; w.finished = true; saveState();
  const stars = w.stars || 0, max = SK_STONES * 3;
  townLog.textContent = 'The last drawing settles into the page. The sketchbook is finished.';
  bumpStat('sketchClears', 1); bumpStat('puddleWins', 1);
  setTimeout(() => {
    if (pwActive() !== w) return;
    pwLeave('done', false, () => {
      const peb = 6 + stars;
      addPebbles(peb, 'puddle-world'); toast(`✏️ ${stars}/${max} stars · +${peb} ${currencyName(peb)}`);
      const roll = rollRewardRarity(false), rarity = stars >= 13 ? (roll === 'common' ? 'rare' : roll) : stars >= 9 ? 'rare' : 'common';
      const ks = stars >= 9 ? worldCardId('puddle', 'sketch') : null;   // a good sketchbook brings the sketch's own card, once
      pwGiveCard(ks || pwCardId(rarity), ks ? 'A keepsake from the sketchbook' : stars >= 13 ? 'A masterpiece' : 'The finished sketchbook');
    });
  }, 1400);
}

PW_KINDS.sketch = {
  weight: 2,
  create(w, rnd, pick, last) {
    const biome = pick(pwBiomesFor(false).filter(b => b.id !== last.biome));
    w.shape = pick(Object.keys(PW_SHAPES)); w.biome = biome.id; w.name = biome.word + ' ' + pick(SK_WORDS);
    w.size = [15, 15]; w.ms = 8 * 60 * 1000; w.stars = 0;
    w.intro = 'Nothing here has been drawn in yet. Find the sketch stones and draw what each one asks.';
  },
  generate: pwGenerateExplore,
  build(w, data, m) {
    const shapes = pwPickFrom(Object.keys(SK_SHAPES), SK_STONES), placed = [];
    const choices = spotChoices(m, new Set([m.spawn.x + ',' + m.spawn.y]), data, null);   // one flood of the map, not one per try
    const gap = s => placed.reduce((a, o) => Math.min(a, Math.abs(o.x - s.x) + Math.abs(o.y - s.y)), 99);
    data.stones = [];
    shapes.forEach((shape, i) => {
      const open = choices.filter(s => gap(s) > 0), apart = open.filter(s => gap(s) >= 4);
      const s = apart.length ? apart[Math.floor(Math.random() * apart.length)] : open.length ? open.reduce((b, o) => (gap(o) > gap(b) ? o : b)) : { x: m.spawn.x, y: m.spawn.y + 1 };
      placed.push(s);
      data.stones.push({ id: 'stone' + i, x: s.x, y: s.y, shape, done: false, stars: 0, path: null });
    });
    data.spirits = [];
  },
  enter(w) { skPaint(w); },
  boot(w) { skPaint(w); if (w.finished) setTimeout(() => { if (pwActive() === w) pwLeave('done'); }, 1200); },
  leave(w) { skUnpaint(); },
  render(w, data, add) {
    (data.stones || []).forEach(s => {
      const sh = SK_SHAPES[s.shape];
      if (s.done && s.path) add('pw-sketch-stone done', s.x, s.y, `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${skSvgPath(s.path)}"/></svg><b>${'★'.repeat(s.stars)}</b>`);
      else add('pw-sketch-stone', s.x, s.y, `<span>✎</span><i>${sh.icon}</i>`);
    });
    skPaint(w);
  },
  tap(w, tx, ty) {
    const data = state.districtData[PW_KEY], s = data && (data.stones || []).find(o => o.x === tx && o.y === ty);
    if (!s) return false;
    if (s.done) { townLog.textContent = `Your drawing of ${SK_SHAPES[s.shape].ask} (${'★'.repeat(s.stars)}). It is part of the page now.`; sfx('tap'); return true; }
    const near = (x, y) => Math.abs(x - s.x) + Math.abs(y - s.y) <= 1;
    if (near(state.playerPos.x, state.playerPos.y)) skOpenStone(w, s);
    else walkThen(near, () => { if (pwActive() === w && !s.done) skOpenStone(w, s); });
    return true;
  },
  goal(w) {
    const data = state.districtData[PW_KEY], st = (data && data.stones) || [], done = st.filter(s => s.done).length;
    return { icon: '✏️', text: `${done}/${st.length || SK_STONES} sketches · ${w.stars || 0} ★`, hint: 'Walk to a sketch stone (✎) and tap it: the shape glows for a moment, then draw it from memory in one stroke.' };
  }
};
