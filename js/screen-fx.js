/* ============================================================
   SCREEN TRANSITIONS (build 317): the full-screen building screens (bakery, the stalls, museum, card shop, altar) used to appear and vanish
   in one frame. They now come in like the rest of the game: the screen fades up and its parts follow one after another; leaving fades it
   down while the usual door fade runs; and a screen that switches between its own views (hub and wing, stall and game, front and mirror)
   cross-fades the stage. All of it is opacity and transform (css/latest.css, SCREEN TRANSITIONS), and all of it stands down when the device
   asks for reduced motion (btMotionOk). Each screen calls screenFxInit(el) once when it is built and screenFxShow(el) instead of
   el.classList.remove('hidden'); sceneAction('leave') calls screenFxLeave().
   ============================================================ */
const screenFxOk = () => typeof btMotionOk !== 'function' || btMotionOk();
function screenFxInit(el) {
  el.classList.add('bscreen');
  // a change of the screen's own view or mode (data-view / data-mode) cross-fades its stage
  const stage = () => el.querySelector('[id$="Stage"]');
  new MutationObserver(() => {
    const st = stage(); if (!st || !screenFxOk() || el.classList.contains('hidden') || el.classList.contains('bs-in')) return;
    st.classList.remove('bs-swap'); void st.offsetWidth; st.classList.add('bs-swap');
  }).observe(el, { attributes: true, attributeFilter: ['data-view', 'data-mode'] });
}
function screenFxShow(el) {
  const was = el.classList.contains('hidden');
  clearTimeout(el._fxOut); el.classList.remove('hidden', 'bs-out');
  if (!was || !screenFxOk()) return;
  el.classList.remove('bs-in'); void el.offsetWidth; el.classList.add('bs-in');
  clearTimeout(el._fx); el._fx = setTimeout(() => el.classList.remove('bs-in'), 900);
}
// fade the open building screens down (the door fade that follows hides them for good)
function screenFxLeave() {
  if (!screenFxOk()) return;
  document.querySelectorAll('.bscreen:not(.hidden)').forEach(e => { e.classList.remove('bs-in'); e.classList.add('bs-out'); });
}
// hide one screen with the fade (used where there is no door fade, like the altar)
function screenFxHide(el) {
  if (!el || el.classList.contains('hidden')) return;
  if (!screenFxOk()) { el.classList.add('hidden'); return; }
  el.classList.add('bs-out'); clearTimeout(el._fxOut); el._fxOut = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('bs-out'); }, 240);
}
