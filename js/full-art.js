/* ============================================================
   FULL ART: every card is a full bleed card.
   A painted scene fills the whole card and the card's picture stands in front of it, kept inside the card's edge (the cost bubble, keyword
   badges and counts are the only things that hang over it). There are two kinds of scene:
     - drawn: the mythic, divine and Atlas cards listed in FULL_ART have a hand drawn scene and a more detailed subject of their own, two files
       in assets/cards/full/:  <id>-scene.svg  the backdrop, 100 x 108, fills the card (cropped to fit)
                               <id>-hero.svg   the subject, 100 x 100 on a transparent background (PNG or WebP work too if you change FULL_ART_EXT)
       These cards also get the attack preview in battle (btAnimate in js/battle-ui.js): the attacking card flies to the middle, strikes, then flies back.
     - auto: every other card (and any card added later) uses its own picture (assets/cards/<id>.png) as the subject on a scene made in CSS from
       its family and where it comes from (the FULL ART block at the end of css/latest.css; colours in css/theme.css: --fa-*). Nothing to draw: a new
       card gets the full look the moment it has a picture, and a card with only an emoji shows the emoji large.
   It is the only look of a card, at every size (board, hand, tiles, deck lists, draft offers, the Card Details popup): js/data-and-engine.js
   cardArtHtml returns the subject marked `fa-small` and the observer below dresses the card around it. To give a card hand drawn art: draw both
   files, drop them in, add the id to FULL_ART (only the rarities in FULL_ART_RARITIES are eligible, whatever the list says).
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

// A card with hand drawn files (a listed mythic, divine or Atlas card): it also gets the attack preview in battle.
function hasDrawnArt(def) {
  return !!def && FULL_ART_RARITIES.includes(def.rarity) && FULL_ART.includes(BattleEngine.baseIdOf(def.id));
}
// Every card is full art. Drawn cards use their files, the rest use their own picture on a CSS scene.
function hasFullArt(def) { return !!def; }
// The attributes the CSS scene reads: the card's family and what hands it out ("exclusive": boss, portal, puddle, cellar, rift, milestone ...).
function fullArtAttrs(def) {
  const id = BattleEngine.baseIdOf(def.id), base = cardDef(id) || def;
  return `data-fam="${def.spell ? 'spell' : (CARD_FAMILY[id] || 'none')}" data-src="${escapeHtml(base.exclusive || (base.foe ? 'foe' : ''))}"`;
}

function fullArtUrl(def, part) { return `assets/cards/full/${BattleEngine.baseIdOf(def.id)}-${part}.${FULL_ART_EXT}`; }

// Full art is the ONLY look of a card, at every size. cardArtHtml (js/data-and-engine.js) hands out the card's picture as .fa-small (an img, or
// a span for an emoji); this dresses whatever card face holds one in exactly the face the popup has (scene filling the card, the picture
// inside it, translucent name panel, all from the same .fa rules), so battle cards, tiles, deck trays, the Workshop, the Almanac, sets, draft
// offers and the inspect sheet match the Card Details view. One observer on the page, so no template needs to know.
const FULL_ART_HOLDERS = '#battleView .card, .alm-card, .card-mini, .ins-card, .draft-opt .reveal-card';
const FULL_ART_ICONS = '.icon, .ac-icon, .c-icon, .ins-icon';
function fullArtSubject(el) {
  if (el.tagName === 'IMG') return `<img src="${el.getAttribute('src')}" alt="${el.getAttribute('alt') || ''}" draggable="false">`;
  return `<span class="card-emoji">${el.textContent}</span>`;
}
function fullArtScene(el) {
  if (el.classList.contains('fa-auto')) return `<div class="fa-scene fa-auto-scene" data-fam="${el.dataset.fam || 'none'}" data-src="${el.dataset.src || ''}"></div>`;
  return `<div class="fa-scene"><img src="${el.getAttribute('src').replace('-hero.', '-scene.')}" alt="" draggable="false"></div>`;
}
function fullArtDress(el) {
  const card = el.closest(FULL_ART_HOLDERS), icon = el.closest(FULL_ART_ICONS);
  if (!card || !icon || card.classList.contains('fa')) return;
  card.classList.add('fa');
  card.insertAdjacentHTML('afterbegin', fullArtScene(el));
  icon.innerHTML = `<div class="fa-hero">${fullArtSubject(el)}</div>`;
}
function fullArtDecorate(root) { if (root && root.nodeType === 1) root.querySelectorAll('.fa-small').forEach(fullArtDress); }
if (typeof MutationObserver === 'function') {
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.matches('.fa-small')) fullArtDress(n); else if (n.querySelector('.fa-small')) fullArtDecorate(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
}

// Turns a card face (.reveal-card built from cardFaceHtml) into its full art version. Returns true when it did.
function fullArtApply(face, def) {
  if (!face || !hasFullArt(def)) return false;
  const icon = face.querySelector('.icon'); if (!icon) return false;
  const sub = icon.querySelector('.fa-small') || icon.firstElementChild;
  if (!sub) return false;
  face.classList.add('fa');
  face.insertAdjacentHTML('afterbegin', fullArtScene(sub));
  icon.innerHTML = `<div class="fa-hero">${fullArtSubject(sub)}</div>`;
  return true;
}

/* ---------------- attack preview ----------------
   When a card with full art attacks, it lifts off the board, flies to the middle of the field at a large size, winds up, strikes toward its
   target, and flies back to its slot. The normal strike and impact then play as before, so nothing about the rules or the timing of the hit
   changes: this is only a short beat in front of it (about a second). */
function btAttackPreview(e, token) {
  return new Promise(resolve => {
    const def = cardDef(e.attacker.id);
    if (!hasDrawnArt(def) || prefs.fast || !btMotionOk() || typeof battleView === 'undefined' || !battleView.animate) return resolve();
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
