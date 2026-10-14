/* ============================================================
   THE FORGE (build 265): strike the iron yourself
   Refine and Trade up no longer just roll the dice: the Workshop's button opens the forge, a strip of hot iron with a glowing
   band and a spark that slides back and forth. Tap (or press Space) when the spark is in the band: three strikes, each a
   little faster, each band somewhere new. The band is narrower for rarer cards, so the riskier crafts are harder to forge.
   A strike in the band's bright core is Perfect (2 points), anywhere in the band is Good (1), outside it a Miss (0); the total
   picks a grade from FORGE_GRADES (js/shop-economy.js) that scales this craft's fail and skill chances, and a Flawless forge
   heats the hot streak twice as much. Skip forges it as Rough: the plain chances, nothing lost.

   - forgeOpen({ kind, rarity, title }, done) builds #forgeSheet on first use and calls done(gradeId) once, when the forge is
     finished (or skipped); closing it with the X cancels the craft (done is not called).
   - forgeStrike(pos) is one strike; pos (0..1) is where the spark is, read from the animation unless a test passes one.
   - The spark is a CSS transform driven by requestAnimationFrame; nothing runs while the sheet is closed.
   Look: the FORGE block at the end of css/latest.css; colours are --forge-* in css/theme.css. tests/craft-forge.test.js.
   ============================================================ */
const FORGE_STRIKES = 3, FORGE_SPEED = 0.75, FORGE_SPEEDUP = 1.22, FORGE_CORE = 0.36;   // sweeps a second, faster each strike; the Perfect core is 36% of the band
const FORGE_BAND = { common: 0.26, rare: 0.22, ultra: 0.18, super: 0.15, mythic: 0.12 };  // the band's width by rarity
let forgeRun = null;   // { kind, rarity, done, strike, points, marks, centre, speed, t0, raf, over }

function forgeSheetEl() {
  let el = document.getElementById('forgeSheet');
  if (el) return el;
  el = document.createElement('div'); el.id = 'forgeSheet'; el.className = 'fg-sheet hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'fgTitle');
  el.innerHTML = `<div class="fg-card">
      <div class="fg-head"><span class="fg-icon" aria-hidden="true">🔨</span><div><b id="fgTitle">Strike the iron</b><small class="fg-sub"></small></div><button type="button" class="fg-x" aria-label="Close the forge">✕</button></div>
      <div class="fg-iron" role="button" tabindex="0" aria-label="Strike now"><i class="fg-band"><i class="fg-core"></i></i><b class="fg-spark" aria-hidden="true"></b></div>
      <div class="fg-marks" aria-hidden="true"></div>
      <div class="fg-msg" aria-live="polite"></div>
      <div class="fg-btns"><button type="button" class="btn fg-hit">🔨 Strike!</button><button type="button" class="btn btn-ghost fg-skip">Skip</button></div>
    </div>`;
  document.body.appendChild(el);
  const hit = e => { e.preventDefault(); forgeStrike(); };
  el.querySelector('.fg-hit').addEventListener('click', hit);
  el.querySelector('.fg-iron').addEventListener('pointerdown', hit);
  el.querySelector('.fg-skip').addEventListener('click', () => forgeFinish('rough', true));
  el.querySelector('.fg-x').addEventListener('click', () => forgeClose());
  document.addEventListener('keydown', e => {
    if (!forgeRun || el.classList.contains('hidden')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); forgeStrike(); } else if (e.key === 'Escape') forgeClose();
  });
  return el;
}

// The spark's place now: a back-and-forth sweep (0 -> 1 -> 0) at this strike's speed.
function forgePos() {
  const r = forgeRun; if (!r) return 0;
  const t = ((performance.now() - r.t0) / 1000) * r.speed, f = t - Math.floor(t);
  return f < 0.5 ? f * 2 : 2 - f * 2;
}
function forgeTick() {
  const r = forgeRun; if (!r || r.over) return;
  const el = document.getElementById('forgeSheet');
  if (el) el.querySelector('.fg-spark').style.left = (forgePos() * 100).toFixed(2) + '%';
  r.raf = requestAnimationFrame(forgeTick);
}
// A new band for the next strike, somewhere else on the iron.
function forgeBand() {
  const r = forgeRun, el = forgeSheetEl(), w = r.band;
  let c; do { c = w / 2 + 0.04 + Math.random() * (1 - w - 0.08); } while (r.centre != null && Math.abs(c - r.centre) < 0.18);
  r.centre = c;
  const band = el.querySelector('.fg-band');
  band.style.left = ((c - w / 2) * 100).toFixed(2) + '%'; band.style.width = (w * 100).toFixed(2) + '%';
  band.querySelector('.fg-core').style.width = (FORGE_CORE * 100) + '%';
}
function forgeMarksHtml() {
  const r = forgeRun;
  return Array.from({ length: FORGE_STRIKES }, (_, i) => { const m = r.marks[i]; return `<span class="${m || (i === r.strike ? 'next' : '')}">${m === 'perfect' ? '🌟' : m === 'good' ? '🔨' : m === 'miss' ? '✕' : '·'}</span>`; }).join('');
}

function forgeOpen(opts, done) {
  const el = forgeSheetEl(), rarity = opts.rarity || 'common';
  if (forgeRun && forgeRun.raf) cancelAnimationFrame(forgeRun.raf);
  forgeRun = { kind: opts.kind || 'refine', rarity, done, strike: 0, points: 0, marks: [], centre: null, speed: FORGE_SPEED, band: FORGE_BAND[rarity] || FORGE_BAND.common, t0: performance.now(), raf: 0, over: false };
  const master = craftMasterReady();
  el.querySelector('#fgTitle').textContent = master ? 'A Masterwork: strike the iron' : (opts.title || 'Strike the iron');
  el.querySelector('.fg-sub').textContent = `Tap when the spark is in the glow, three times. ${RARITY_LABEL[rarity][0].toUpperCase() + RARITY_LABEL[rarity].slice(1)} iron: ${rarity === 'common' ? 'a wide glow' : rarity === 'rare' ? 'a fair glow' : 'a narrow glow'}.`;
  el.querySelector('.fg-msg').textContent = '';
  el.querySelector('.fg-card').classList.toggle('master', master);
  el.querySelector('.fg-marks').innerHTML = forgeMarksHtml();
  el.querySelector('.fg-hit').disabled = false; el.querySelector('.fg-skip').disabled = false;
  forgeBand();
  el.classList.remove('hidden'); document.body.classList.add('in-forge');
  sfx('flip');
  forgeRun.raf = requestAnimationFrame(forgeTick);
  setTimeout(() => { const b = el.querySelector('.fg-hit'); if (b && forgeRun && !forgeRun.over) b.focus({ preventScroll: true }); }, 60);
}

function forgeStrike(pos) {
  const r = forgeRun; if (!r || r.over || r.strike >= FORGE_STRIKES) return null;
  const el = forgeSheetEl(), at = typeof pos === 'number' ? pos : forgePos(), d = Math.abs(at - r.centre), half = r.band / 2;
  const mark = d <= half * FORGE_CORE ? 'perfect' : d <= half ? 'good' : 'miss';
  r.marks[r.strike] = mark; r.points += mark === 'perfect' ? 2 : mark === 'good' ? 1 : 0; r.strike++;
  el.querySelector('.fg-spark').style.left = (at * 100).toFixed(2) + '%';
  el.querySelector('.fg-msg').textContent = mark === 'perfect' ? 'Perfect strike!' : mark === 'good' ? 'Good strike.' : 'Missed the glow.';
  el.querySelector('.fg-marks').innerHTML = forgeMarksHtml();
  const iron = el.querySelector('.fg-iron'); iron.classList.remove('hit-perfect', 'hit-good', 'hit-miss'); void iron.offsetWidth; iron.classList.add('hit-' + mark);
  sfx(mark === 'miss' ? 'tie' : mark === 'perfect' ? 'rare' : 'tap'); buzz(mark === 'perfect' ? HAP.big : HAP.tap);
  if (r.strike >= FORGE_STRIKES) forgeFinish(forgeGrade(r.points).id, false);
  else { r.speed *= FORGE_SPEEDUP; r.t0 = performance.now(); forgeBand(); }
  return mark;
}

// The forge is done (or skipped): show the grade and what it does to the chances, then hand the grade to the craft.
function forgeFinish(gradeId, skipped) {
  const r = forgeRun; if (!r || r.over) return;
  r.over = true; cancelAnimationFrame(r.raf);
  const el = forgeSheetEl(), g = forgeGradeById(gradeId), pct = n => Math.round(n * 100);
  const base = craftOdds(r.kind, r.rarity, 'rough'), now = craftOdds(r.kind, r.rarity, g.id);
  el.querySelector('.fg-hit').disabled = true; el.querySelector('.fg-skip').disabled = true;
  el.querySelector('.fg-msg').innerHTML = skipped ? 'Forged as it comes: the plain chances.'
    : `<b>${g.icon} ${g.label}!</b> 💥 ${pct(base.fail)}% → ${pct(now.fail)}% · ✨ ${pct(base.skill)}% → ${pct(now.skill)}%`;
  if (!skipped && g.id === 'flawless') sfx('gift');
  const done = r.done;
  setTimeout(() => { forgeClose(true); if (done) done(g.id); }, skipped ? 200 : 1100);
}
function forgeClose(finished) {
  const el = document.getElementById('forgeSheet');
  if (forgeRun) { cancelAnimationFrame(forgeRun.raf); if (!finished) forgeRun.over = true; }
  forgeRun = null;
  if (el) el.classList.add('hidden');
  document.body.classList.remove('in-forge');
}
