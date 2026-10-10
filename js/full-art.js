/* ============================================================
   FULL ART: a bigger, more detailed picture for the rarest cards.
   Mythic, divine and Atlas cards that are listed in FULL_ART show a "full bleed" card: a painted scene fills the whole card and a detailed
   subject stands in front of it, breaking out past the card's edge. It is used in two places only, both of them large:
     - the card reveal / Card Details popup (showCardReveal in js/gardening.js)
     - the attack preview in battle (btAnimate in js/battle-ui.js): the attacking card flies to the middle, strikes, then flies back
   Small cards (board, hand, collection tiles, deck lists, draft offers) keep their normal art, so full art is optional per card: a card that is
   not listed here looks exactly as it always did.
   Each card has two files in assets/cards/full/:
     <id>-scene.svg   the backdrop, 100 x 108, fills the card (cropped to fit)
     <id>-hero.svg    the subject, 100 x 100 on a transparent background; it may reach past the edges of its square
   PNG or WebP files of the same names work too if you change the extension in FULL_ART_EXT. To add a card: draw both, drop them in, add the
   id to FULL_ART. Only the rarities in FULL_ART_RARITIES are eligible, whatever the list says.
   The attack preview is skipped under reduced motion and when "Fast battles" is on, and a tap on it skips it.
   ============================================================ */
const FULL_ART_RARITIES = ['mythic', 'divine', 'atlas'];
const FULL_ART_EXT = 'svg';
const FULL_ART = [
  // mythic
  'aurora-stag', 'deep-current', 'mountain-heart', 'sky-whale', 'moon-dragon', 'thundering-ram', 'void-koi', 'sunken-leviathan', 'bramble-king',
  'starfall', 'deep-wyrm', 'rooks-ace', 'world-tree', 'mossy-titan', 'kraken', 'night-regent', 'tide-leviathan',
  // divine
  'duermevela', 'marea-lenta', 'ensueno'
];

function hasFullArt(def) {
  return !!def && FULL_ART_RARITIES.includes(def.rarity) && FULL_ART.includes(BattleEngine.baseIdOf(def.id));
}

function fullArtUrl(def, part) { return `assets/cards/full/${BattleEngine.baseIdOf(def.id)}-${part}.${FULL_ART_EXT}`; }
// The painted scene as a card's backdrop, for the small faces (battle cards, collection tiles). '' for a card without full art.
function fullArtBgHtml(def) { return hasFullArt(def) ? `<span class="fa-bg" aria-hidden="true"><img src="${fullArtUrl(def, 'scene')}" alt="" draggable="false"></span>` : ''; }

// Turns a card face (.reveal-card built from cardFaceHtml) into its full art version. Returns true when it did.
function fullArtApply(face, def) {
  if (!face || !hasFullArt(def)) return false;
  const icon = face.querySelector('.icon'); if (!icon) return false;
  const id = BattleEngine.baseIdOf(def.id), base = `assets/cards/full/${id}-`;
  face.classList.add('fa');
  face.insertAdjacentHTML('afterbegin', `<div class="fa-scene"><img src="${base}scene.${FULL_ART_EXT}" alt="" draggable="false"></div>`);
  icon.innerHTML = `<div class="fa-hero"><img src="${base}hero.${FULL_ART_EXT}" alt="${escapeHtml(def.name)}" draggable="false"></div>`;
  return true;
}

/* ---------------- attack preview ----------------
   When a card with full art attacks, it lifts off the board, flies to the middle of the field at a large size, winds up, strikes toward its
   target, and flies back to its slot. The normal strike and impact then play as before, so nothing about the rules or the timing of the hit
   changes: this is only a short beat in front of it (about a second). */
function btAttackPreview(e, token) {
  return new Promise(resolve => {
    const def = cardDef(e.attacker.id);
    if (!hasFullArt(def) || prefs.fast || !btMotionOk() || typeof battleView === 'undefined' || !battleView.animate) return resolve();
    const src = document.querySelector(`#battleView .card[data-uid="${e.attacker.uid}"]`);
    if (!src) return resolve();
    const up = e.who === 0, dir = up ? -1 : 1;                         // you attack up the screen, the opponent attacks down it
    const view = battleView.getBoundingClientRect(), sr = src.getBoundingClientRect();
    const w = Math.round(Math.min(230, view.width * 0.6)), h = w * 4 / 3, cy = view.height * 0.46;
    const stage = document.createElement('div'); stage.className = 'atk-preview ' + (up ? 'up' : 'down');
    const face = document.createElement('div'); face.className = `reveal-card ap-card rarity-${def.rarity}` + (def.spell ? ' spell' : '');
    face.innerHTML = cardFaceHtml(def);
    const pw = face.querySelector('.pw'), hp = face.querySelector('.hp');   // show the numbers the card has right now, not its printed ones
    if (pw && e.attacker.power != null) pw.textContent = '⚔' + e.attacker.power;
    if (hp && e.attacker.hp != null) hp.textContent = '♥' + e.attacker.hp;
    fullArtApply(face, def);
    face.style.width = w + 'px'; face.style.left = Math.round((view.width - w) / 2) + 'px'; face.style.top = Math.round(cy - h / 2) + 'px';
    stage.appendChild(face); battleView.appendChild(stage);
    src.style.visibility = 'hidden';                                        // it has been lifted off the board
    const dx = (sr.left + sr.width / 2) - (view.left + view.width / 2), dy = (sr.top + sr.height / 2) - (view.top + cy), s0 = sr.width / w;
    let done = false; const anims = [];
    const finish = () => {
      if (done) return; done = true;
      anims.forEach(a => { try { a.cancel(); } catch (x) { /* already finished */ } });
      stage.remove(); src.style.visibility = ''; resolve();
    };
    const play = (el, frames, opts) => { const a = el.animate(frames, Object.assign({ fill: 'forwards' }, opts)); anims.push(a); return a.finished.catch(() => {}); };
    const live = () => !done && btAlive(token);
    stage.addEventListener('pointerdown', finish);                          // a tap skips it
    setTimeout(finish, 2200);                                               // and nothing can leave it stuck on screen
    (async () => {
      play(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      sfx('rare');
      await play(face, [{ transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: 0.7 }, { transform: 'translate(0, 0) scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.08)' });
      if (!live()) return finish();
      await play(face, [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(0, ${-dir * 14}px) scale(1.05)` }], { duration: 160, easing: 'ease-out' });   // wind up, away from the target
      if (!live()) return finish();
      face.classList.add('strike'); sfx('hit');
      stage.insertAdjacentHTML('beforeend', '<div class="ap-burst"></div><div class="ap-flash"></div>');
      await play(face, [{ transform: `translate(0, ${-dir * 14}px) scale(1.05)` }, { transform: `translate(0, ${dir * 64}px) scale(1.13)` }], { duration: 170, easing: 'cubic-bezier(.5,0,.9,.4)' });
      if (!live()) return finish();
      await new Promise(r => setTimeout(r, 150));
      if (!live()) return finish();
      play(stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 60 });
      await play(face, [{ transform: `translate(0, ${dir * 64}px) scale(1.13)`, opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: 0.4 }], { duration: 280, easing: 'ease-in' });
      finish();
    })();
  });
}
