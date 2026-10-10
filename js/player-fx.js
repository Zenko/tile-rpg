/* ============================================================
   CHARACTER EFFECTS: how the drawn character sits in the town (shadow, light, weather, footsteps, auras, dissolve, hop)
   ============================================================
   Everything here is cosmetic and sits on top of js/player-sprite.js. It keeps the drawing exactly as drawn and only adds things around
   and over it. One Settings switch (`prefs.charFx`, on by default; `body.no-charfx` hides the CSS layers) turns it all off, and the
   device's reduced-motion setting turns off everything that moves (footsteps, hop, dissolve, motes, aura animation).

   - Light: `.pl-tint` is the figure's silhouette (a CSS mask) filled with a colour: cool blue at night, warm at dusk and dawn, and a warm
     glow near a lit lamp. No filters, no blend modes (HANDOFF §9: both caused tearing on phones).
   - Weather: `.pl-wet` (rain, storm) and `.pl-frost` (snow) fade in and out from `.town-view[data-wx]` in CSS alone.
   - Footsteps: tiny DOM bits that fly and fade (transform and opacity only), different on grass and flowers (petals), path (dust) and
     cobble or bridge (grey puffs and a spark).
   - Motes: fireflies at night and drifting leaves by day in `.pfx-motes`, a screen-space layer above the sky. Hidden in rain and snow.
   - Auras: `.pl-aura` behind the sprite, one per state: a win streak of 3+ (flames), a companion at Trusted or better (hearts), a
     district made calm today (rings). Priority in that order.
   - Pocket it: when a card reveal or level-up screen closes, the card (or a star) arcs from the middle of the screen into her and she takes it in.
   - Dissolve: walking into a building burns the figure away in embers (the same SVG filter trick as a fainting card in js/battle-fx.js);
     coming back out re-forms it in blue sparks. */
const pfxOn = () => prefs.charFx !== false;
const pfxMotion = () => pfxOn() && btMotionOk() && !document.hidden;
const pfxClamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the sky: the light tint follows the clock ----
let pfxLast = '';
function pfxSync() {
  if (typeof townView === 'undefined' || !townView) return;
  pfxEnsureMotes();      // the town view can be rebuilt, which drops the layer
  document.body.classList.toggle('no-charfx', !pfxOn());
  if (!pfxOn()) return;
  const s = skyPhase(), dim = pfxClamp(s.dim / 0.5, 0, 1);
  const tint = s.tintA > s.dim && s.tintA > 0.1 ? `rgba(${hexRgb(s.tint)},${(s.tintA * 0.55).toFixed(2)})` : dim > 0.04 ? `rgba(40,64,150,${(0.3 * dim).toFixed(2)})` : 'rgba(0,0,0,0)';
  if (tint === pfxLast) return;
  pfxLast = tint;
  townView.style.setProperty('--pl-tint', tint);
}
function hexRgb(h) { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); }

// ---- the player: lamp light, aura, footsteps (called from positionPlayer) ----
function pfxPlayer(prev, now, animate) {
  if (!playerEl) return;
  if (!pfxOn()) { playerEl.removeAttribute('data-aura'); return; }
  pfxSync();
  // a lit lamp within three tiles: warm light on the figure
  let best = null;
  if (typeof nlLamps !== 'undefined' && nlLamps && skyPhase().isNight) nlLamps.forEach(l => { const d = Math.hypot(l.x - now.x, l.y - now.y); if (d <= 3.2 && (!best || d < best.d)) best = { d }; });
  if (best) playerEl.style.setProperty('--pl-tint', `rgba(255,208,140,${(0.16 + 0.22 * (1 - best.d / 3.2)).toFixed(2)})`);
  else playerEl.style.removeProperty('--pl-tint');
  if (!playerEl.querySelector('.pl-splash')) playerEl.insertAdjacentHTML('beforeend', '<div class="pl-splash" aria-hidden="true"><i></i><i></i><i></i><i></i></div>');
  // the aura
  let aura = '';
  try {
    if (state.progress.record && state.progress.record.streak >= 3) aura = 'streak';
    else if (state.companion && typeof bondLevel === 'function' && bondLevel(state.companion) >= 2) aura = 'bond';
    else if (typeof districtCalm === 'function' && districtCalm()) aura = 'calm';
  } catch (e) { aura = ''; }
  if (aura) { playerEl.dataset.aura = aura; if (!playerEl.querySelector('.pl-aura')) playerEl.insertAdjacentHTML('afterbegin', '<div class="pl-aura"><i></i><i></i><i></i></div>'); }
  else playerEl.removeAttribute('data-aura');
  if (animate && prev && pfxMotion() && (prev.x !== now.x || prev.y !== now.y) && Math.abs(prev.x - now.x) + Math.abs(prev.y - now.y) <= 2) pfxStep(prev);
}

// ---- tiny things that fly and fade, in world coordinates ----
function pfxBit(cls, x, y, o) {
  if (!townWorld) return;
  if (townWorld.querySelectorAll('.pfx').length > 46) return;
  const e = document.createElement('i'); e.className = 'pfx ' + cls;
  e.style.left = x.toFixed(0) + 'px'; e.style.top = y.toFixed(0) + 'px'; e.style.zIndex = (state.playerPos.y * 2 + 3);
  e.style.setProperty('--dx', o.dx.toFixed(0) + 'px'); e.style.setProperty('--dy', o.dy.toFixed(0) + 'px'); e.style.setProperty('--d', (o.d || 0.8).toFixed(2) + 's');
  if (o.c) e.style.setProperty('--c', o.c); if (o.r != null) e.style.setProperty('--r', o.r + 'deg'); if (o.s != null) e.style.setProperty('--s', o.s);
  e.addEventListener('animationend', () => e.remove(), { once: true });
  townWorld.appendChild(e);
}
function pfxStep(from) {
  const m = getMap(state.currentDistrict), t = (m.rows[from.y] || '')[from.x] || '.', x = (from.x + 0.5) * tilePx, y = (from.y + 0.92) * tilePx, rnd = () => Math.random() - 0.5;
  if (t === '.' || t === ',') {
    const cols = t === ',' ? ['#f6a9c2', '#ffffff', '#ffd86e'] : ['#9fcf7a', '#c6e58f', '#7fb35a'];
    for (let i = 0; i < 3; i++) pfxBit('pfx-petal', x + rnd() * tilePx * 0.3, y, { dx: rnd() * tilePx * 0.9, dy: -tilePx * (0.15 + Math.random() * 0.35), r: Math.round(rnd() * 360), d: 0.7 + Math.random() * 0.4, c: cols[i % cols.length] });
  } else if (t === '=') {
    for (let i = 0; i < 2; i++) pfxBit('pfx-dust', x + rnd() * tilePx * 0.25, y, { dx: rnd() * tilePx * 0.6, dy: -tilePx * (0.1 + Math.random() * 0.2), s: 2.1, d: 0.65, c: '#d9bf8b' });
  } else {
    pfxBit('pfx-dust', x + rnd() * tilePx * 0.2, y, { dx: rnd() * tilePx * 0.5, dy: -tilePx * 0.12, s: 1.8, d: 0.5, c: '#b8bcc4' });
    if (Math.random() < 0.4) pfxBit('pfx-spark', x, y, { dx: rnd() * tilePx * 0.8, dy: -tilePx * (0.2 + Math.random() * 0.3), d: 0.4 });
  }
}

// ---- motes: fireflies at night, leaves by day (one screen-space layer) ----
function pfxEnsureMotes() {
  if (!townView || townView.querySelector('.pfx-motes')) return;
  let h = '<div class="pfx-motes" aria-hidden="true">';
  for (let i = 0; i < 12; i++) h += `<i class="fly" style="left:${(Math.random() * 96).toFixed(0)}%;top:${(18 + Math.random() * 70).toFixed(0)}%;--wx:${(Math.random() * 60 - 30).toFixed(0)}px;--wy:${(Math.random() * 40 - 25).toFixed(0)}px;--wd:${(7 + Math.random() * 6).toFixed(1)}s;--wl:${(-Math.random() * 8).toFixed(1)}s;--bd:${(2.4 + Math.random() * 2.2).toFixed(1)}s"></i>`;
  for (let i = 0; i < 8; i++) h += `<i class="leaf" style="left:${(Math.random() * 100).toFixed(0)}%;--ld:${(15 + Math.random() * 12).toFixed(0)}s;--ll:${(-Math.random() * 20).toFixed(0)}s;--lc:${Math.random() < 0.5 ? '#7fb35a' : '#d9b24a'}"></i>`;
  townView.insertAdjacentHTML('beforeend', h + '</div>');
}

// ---- pocket it: when a reveal or level-up popup closes, what she got (the card, or a star) arcs from the middle of the screen into her and she takes it in ----
// `pfxLoot` is set by whatever opened the popup (showCardReveal: the card's own art and rarity; the level-up popup: a star). Web Animations on a throwaway
// fixed element, so nothing in the town is touched; a short squash and a rarity-coloured ring on her when it lands.
let pfxLoot = null;
const PFX_RARITY_RGB = { common: '200,220,210', rare: '170,150,235', ultra: '120,185,235', super: '240,190,110', mythic: '240,130,175', divine: '235,180,40', atlas: '143,122,217' };
function pfxEmote(direct) {
  const loot = direct || pfxLoot; pfxLoot = null;
  if (!loot) return;                                                                    // nothing was gained (a card you only looked at, a popup with no reward): nothing happens
  if (!playerEl || !pfxMotion() || inBattle || inScene || typeof playerEl.animate !== 'function') return;
  const spr = playerEl.querySelector('.pl-sprite'); if (spr && spr.classList.contains('pl-gone')) return;
  const pr = playerEl.getBoundingClientRect(); if (!pr.width) return;
  const rgb = PFX_RARITY_RGB[loot.r] || '255,214,120', W = 40, H = 54;
  const tx = pr.left + pr.width / 2 - W / 2, ty = pr.top - pr.height * 0.1 - H / 2;          // her chest
  const sx = direct ? tx : window.innerWidth / 2 - W / 2, sy = direct ? ty - 150 : window.innerHeight * 0.4 - H / 2;   // where the popup's card was, or just above her for something she picked up in town
  const chip = document.createElement('div'); chip.className = 'pfx-chip'; chip.setAttribute('aria-hidden', 'true'); chip.style.setProperty('--rc', rgb);
  chip.innerHTML = `<span>${loot.html}</span>`; document.body.appendChild(chip);
  const arc = chip.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(1.7) rotate(-10deg)`, opacity: 0 },
    { transform: `translate(${sx}px, ${sy}px) scale(1.7) rotate(-10deg)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${(sx + tx) / 2 + (tx > sx ? -30 : 30)}px, ${Math.min(sy, ty) - 36}px) scale(1.1) rotate(8deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${tx}px, ${ty}px) scale(0.35) rotate(0deg)`, opacity: 1, offset: 0.93 },
    { transform: `translate(${tx}px, ${ty}px) scale(0.2)`, opacity: 0 }
  ], { duration: 950, easing: 'cubic-bezier(.45, 0, .7, .5)', fill: 'forwards' });
  const done = () => {
    chip.remove();
    const rig = spr && spr.querySelector('.pl-rig');
    if (rig) rig.animate([{ transform: 'none' }, { transform: 'scale(1.09, .92)', offset: 0.35 }, { transform: 'scale(.98, 1.04)', offset: 0.7 }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
    const ring = document.createElement('div'); ring.className = 'pfx-take'; ring.style.setProperty('--rc', rgb);
    ring.style.left = (pr.left + pr.width / 2) + 'px'; ring.style.top = (pr.top + pr.height * 0.6) + 'px'; document.body.appendChild(ring);
    ring.animate([{ transform: 'translate(-50%, -50%) scale(.3)', opacity: 0.9 }, { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => ring.remove();
  };
  arc.onfinish = done; arc.oncancel = () => chip.remove();
}
// Something she picked up in town without a popup (Embers, an ingredient): the same arc from just above her. One at a time, only on the town screen.
let pfxGainAt = 0;
function pfxGain(html, r) {
  if (!pfxOn() || inBattle || inScene || (typeof currentTab !== 'undefined' && currentTab !== 'town')) return;
  if (document.querySelector('#pickupOverlay:not(.hidden), #levelUpOverlay:not(.hidden), #battleEndOverlay:not(.hidden)')) return;
  const now = Date.now(); if (now - pfxGainAt < 900) return; pfxGainAt = now;
  pfxEmote({ html, r });
}
function pfxWatchPopups() {
  ['pickupOverlay', 'levelUpOverlay'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    let wasOpen = !el.classList.contains('hidden');
    new MutationObserver(() => { const open = !el.classList.contains('hidden'); if (wasOpen && !open) setTimeout(pfxEmote, 260); wasOpen = open; }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
}

// ---- dissolve: into a building and back out ----
let pfxDefs = null, pfxN = 0;
function pfxBurn(spr, reverse, ms, done) {
  try {
    if (!pfxDefs) { pfxDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); pfxDefs.setAttribute('width', '0'); pfxDefs.setAttribute('height', '0'); pfxDefs.setAttribute('aria-hidden', 'true'); pfxDefs.style.position = 'absolute'; document.body.appendChild(pfxDefs); }
    const id = 'pfxDiss' + (++pfxN), ember = reverse ? '#7fd2ff' : '#ff8a2e';
    pfxDefs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="-15%" y="-10%" width="130%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${1 + Math.floor(Math.random() * 90)}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="na"/>
      <feComponentTransfer in="na" result="cut"><feFuncA type="linear" slope="24" intercept="0"/></feComponentTransfer>
      <feComponentTransfer in="na" result="cutB"><feFuncA type="linear" slope="24" intercept="0"/></feComponentTransfer>
      <feComposite in="SourceGraphic" in2="cut" operator="in" result="body"/>
      <feComposite in="cutB" in2="cut" operator="out" result="band"/>
      <feComposite in="band" in2="SourceAlpha" operator="in" result="band2"/>
      <feFlood flood-color="${ember}" result="fl"/><feComposite in="fl" in2="band2" operator="in" result="emb"/>
      <feMerge><feMergeNode in="body"/><feMergeNode in="emb"/></feMerge></filter>`);
    const f = document.getElementById(id), fa = f.querySelectorAll('feFuncA'), t0 = performance.now();
    spr.style.filter = `url(#${id})`; spr.classList.remove('pl-gone');
    let nextBit = 0;
    const step = now => {
      let u = Math.min(1, (now - t0) / ms); if (reverse) u = 1 - u;
      const th = 0.1 + 0.95 * u * u * (3 - 2 * u);
      fa[0].setAttribute('intercept', (-24 * th).toFixed(3)); fa[1].setAttribute('intercept', (-24 * (th - 0.1)).toFixed(3));
      if (now > nextBit && townWorld) {
        nextBit = now + 60; const x = (state.playerPos.x + 0.5) * tilePx, y = (state.playerPos.y + 1) * tilePx;
        for (let i = 0; i < 2; i++) pfxBit(reverse ? 'pfx-spark pfx-blue' : 'pfx-ember', x + (Math.random() - 0.5) * tilePx * 0.7, y - Math.random() * tilePx * (0.2 + 1.2 * (reverse ? 1 - u : u)), { dx: (Math.random() - 0.5) * tilePx * 0.5, dy: -tilePx * (0.3 + Math.random() * 0.6), d: 0.7 + Math.random() * 0.4 });
      }
      const end = reverse ? u <= 0 : u >= 1;
      if (!end && spr.isConnected) requestAnimationFrame(step);
      else { spr.style.filter = ''; f.remove(); if (!reverse) spr.classList.add('pl-gone'); done && done(); }
    };
    requestAnimationFrame(step); return true;
  } catch (e) { spr.style.filter = ''; done && done(); return false; }
}
// Returns true when it took over (it calls `go` itself once the figure has burned away).
function pfxEnter(go) {
  const spr = playerEl && playerEl.querySelector('.pl-sprite');
  if (!spr || !pfxMotion() || inBattle || spr.style.filter) return false;
  pfxBurn(spr, false, 520, go);
  setTimeout(() => { if (!inScene && !doorFading && spr.classList.contains('pl-gone')) spr.classList.remove('pl-gone'); }, 3000);   // a scene that never opened: she is back
  return true;
}
function pfxReform() {
  const spr = playerEl && playerEl.querySelector('.pl-sprite');
  if (!spr) return;
  if (!spr.classList.contains('pl-gone')) return;
  if (!pfxMotion()) { spr.classList.remove('pl-gone'); return; }
  setTimeout(() => { if (spr.isConnected) pfxBurn(spr, true, 600); else spr.classList.remove('pl-gone'); }, 160);
}

pfxEnsureMotes(); pfxWatchPopups();
