/* =====================================================================================================================
   HOLO FOIL (CSS) for the card reveal / Card Details popup
   Ultra, Super, Mythic, Divine and Atlas cards get a rainbow foil that follows the finger (or sweeps on its own), a bright glare under it,
   sparkles from Super up, and the whole card tilts a few degrees toward the touch. Prototype: pixi-fx-lab.html ("Holo card"); this is the
   same look done in CSS, because a shader cannot paint on a DOM card.
   How it works: showCardReveal calls holoApply(face, tier), which adds .holo + .h<tier> to the card and three empty overlay spans (.holo-foil,
   .holo-glare, .holo-spark). The look is driven by two custom properties on the card, --hx and --hy (the light position, percent): the foil
   slides its background with --hx, the glare and sparkles are centred on (--hx, --hy). With no finger down, a CSS animation (registered with
   @property so it can animate a custom property) sweeps --hx back and forth; while a finger is down JS sets --hx/--hy and the animation is off
   (.holo-live). The tilt is a transform on the FRAME (.reveal-card-frame), not the card, so it never fights the card's own flip / spin animations.
   Reduced motion: no auto sweep, no tilt; the foil still follows a finger. Nothing is added to commons and rares.
   Top-level names here all start with holo so they cannot collide with the other files (they share one global scope).
   ===================================================================================================================== */
let holoBound = null;
function holoApply(face, tier) {
  const frame = face && face.parentElement; if (!frame) return;
  frame.style.transform = ''; frame.classList.remove('holo-live');
  if (!(tier >= 2)) return;                                          // ultra and up only
  face.classList.add('holo', 'h' + Math.min(tier, 5));
  face.insertAdjacentHTML('beforeend', '<span class="holo-foil" aria-hidden="true"></span><span class="holo-glare" aria-hidden="true"></span>' + (tier >= 3 ? '<span class="holo-spark" aria-hidden="true"></span>' : ''));
  face.style.removeProperty('--hx'); face.style.removeProperty('--hy');
  if (holoBound !== frame) {
    holoBound = frame;
    const move = e => {
      if (!face.classList.contains('holo') || frame.classList.contains('pk-down')) return;
      if (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return;
      const r = face.getBoundingClientRect(); if (!r.width) return;
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      frame.classList.add('holo-live'); face.style.setProperty('--hx', (x * 100).toFixed(1) + '%'); face.style.setProperty('--hy', (y * 100).toFixed(1) + '%');
      if (typeof btMotionOk !== 'function' || btMotionOk()) frame.style.transform = `perspective(700px) rotateX(${((0.5 - y) * 16).toFixed(1)}deg) rotateY(${((x - 0.5) * 16).toFixed(1)}deg)`;
    };
    const rest = () => { frame.classList.remove('holo-live'); frame.style.transform = ''; face.style.removeProperty('--hx'); face.style.removeProperty('--hy'); };
    frame.addEventListener('pointerdown', move); frame.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => frame.addEventListener(t, rest));
  }
}
