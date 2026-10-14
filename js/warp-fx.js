/* ============================================================
   WARPED TIME (build 255; the way out too since 256)
   The way into (and back out of) a puddle world, from a puddle or through a portal: instead of the plain travel fade, time bends. The town twists into a
   spiral and loses its colour to a hue shift, a clock face spins its hands backwards faster and faster, rings fall inward,
   and at the deepest point (everything hidden by the vortex) the world is swapped; then it all unwinds the other way and
   the new world settles into place.

   warpTransition(key, swap, opts) has the same contract as withTravelTransition (js/world-map.js): it sets travelFading for
   its length, calls swap() once the screen is covered, and is a no-op wrapper if a transition is already running. opts:
   { name, sub } are shown under the clock; forward: true (the way back out of a world) runs time the other way - the hands spin
   clockwise and the map twists the opposite way, as if time snaps back. With reduced motion it is the plain fade.
   Look: the WARPED TIME block at the end of css/latest.css; its colours are the --warp-* tokens in css/theme.css.
   Sound: SFX.warp in js/audio.js (a tick-tock that speeds up, a falling swoop, a chime on arrival).
   ============================================================ */
const WARP_IN_MS = 900, WARP_OUT_MS = 800;   // twist in, then unwind; swap() runs at the turn

function warpClockSvg() {
  let ticks = '';
  for (let i = 0; i < 12; i++) ticks += `<line x1="50" y1="${i % 3 ? 9 : 7}" x2="50" y2="14" transform="rotate(${i * 30} 50 50)"/>`;
  return `<svg class="wf-clock" viewBox="0 0 100 100" aria-hidden="true"><circle class="wf-face" cx="50" cy="50" r="44"/><g class="wf-ticks">${ticks}</g>` +
    `<line class="wf-hand wf-hour" x1="50" y1="50" x2="50" y2="28"/><line class="wf-hand wf-min" x1="50" y1="50" x2="50" y2="15"/><circle class="wf-pin" cx="50" cy="50" r="3"/></svg>`;
}

function warpTransition(key, swap, opts) {
  opts = opts || {};
  if (typeof btMotionOk === 'function' && !btMotionOk()) return withTravelTransition(key, swap, opts);
  if (travelFading) { swap(); return; }
  travelFading = true;
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const el = document.createElement('div');
  el.className = 'warp-fx' + (opts.forward ? ' fwd' : '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="wf-vortex"></div><div class="wf-rings"><i></i><i></i><i></i><i></i></div>${warpClockSvg()}` +
    `<div class="wf-text"><b>${esc(opts.name)}</b><span>${esc(opts.sub)}</span></div><div class="wf-flash"></div>`;
  document.body.appendChild(el);
  const map = document.querySelector('.town-map-wrap');
  if (map) { map.classList.remove('warp-untwist'); map.classList.toggle('warp-fwd', !!opts.forward); map.classList.add('warp-twist'); }
  if (typeof sfx === 'function') sfx('warp');
  if (typeof buzz === 'function' && typeof HAP !== 'undefined') buzz(HAP.soft);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    try { swap(); } finally {
      const m2 = document.querySelector('.town-map-wrap');
      if (m2) { m2.classList.remove('warp-twist'); m2.classList.toggle('warp-fwd', !!opts.forward); m2.classList.add('warp-untwist'); }
      el.classList.add('out');
      setTimeout(() => {
        el.remove(); travelFading = false;
        const m3 = document.querySelector('.town-map-wrap'); if (m3) m3.classList.remove('warp-untwist', 'warp-fwd');
      }, WARP_OUT_MS);
    }
  }, WARP_IN_MS);
}
