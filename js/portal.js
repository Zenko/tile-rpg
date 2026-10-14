/* ============================================================
   PORTALS (build 255)
   Now and then a portal opens somewhere near you in town: one shimmering doorway, in any weather, that stays open for a
   while (PORTAL_LIFE_MS - far longer than a spell of rain's puddles) and then folds shut. Walk onto it and it takes you
   into a puddle world, the same worlds a puddle can drop you into (js/puddle-worlds.js) - every time, not by chance.

   - One portal at a time, saved in state.progress.portal = { district, x, y, openedAt, until }, so it survives a reload.
     It stays in the district it opened in; leave and come back and it is still there until it closes.
   - It only opens when a puddle world could start (pwCanStart: level 2+, not in Cozy mode, no world running, the puddle
     cooldown over), while you are in town and looking at the map; then PORTAL_CHANCE every PORTAL_CHECK_MS, and never
     again for PORTAL_COOLDOWN_MS after one closes or is used.
   - The spot is a plain walkable ground tile you can actually walk to (findPath). Since build 266 it is anywhere in the district,
     out of view when it can be: the screen ripples from its side (portalScreenFx), SFX.portal plays, the toast says which way,
     and a compass arrow at the edge of the view (portalCompass) points to it until it comes on screen. A portal stone
     (js/portal-craft.js) opens one right beside you instead, and lets you through even during the puddle cooldown.
   - Hooks (typeof-guarded there): lifeRenderEntities (js/town-life.js) calls portalRender to draw it, lifeStep calls
     portalStep when you step on a tile. Entering goes through pwEnter(x, y, undefined, 'portal'), so the warped-time
     transition (js/warp-fx.js) plays for portals and puddles alike.
   - Family portals (build 257): every portal belongs to one card family (portal.family; the district's own family is twice as
     likely). Its colours and the icon floating above it say which, and its world is that family's (pwFamilize in
     js/puddle-worlds.js: palette, name and every card inside). A portal saved before build 257 has no family and leads to a
     plain world.
   Look: the PORTAL block at the end of css/latest.css; colours are the --portal-* tokens in css/theme.css (one set per family).
   ============================================================ */
const PORTAL_LIFE_MS = 12 * 60 * 1000;      // how long a portal stays open
const PORTAL_CLOSING_MS = 60 * 1000;        // it flickers for its last minute
const PORTAL_CHECK_MS = 45 * 1000;          // how often a new one may open...
const PORTAL_CHANCE = 0.12;                 // ...and the chance each time (about one every six minutes of town play)
const PORTAL_COOLDOWN_MS = 8 * 60 * 1000;   // none for this long after one closes or is used
let portalCheckedAt = Date.now();

function portalState() { const p = state.progress && state.progress.portal; return p && p.until ? p : null; }
function portalHere() { const p = portalState(); return p && p.district === state.currentDistrict ? p : null; }
function portalTownShowing() {
  const panel = document.getElementById('townPanel');
  return !!panel && !panel.classList.contains('hidden') && !panel.classList.contains('tab-away');
}
function portalCanOpen() {
  if (portalState() || typeof pwCanStart !== 'function' || !pwCanStart()) return false;
  if (!portalTownShowing()) return false;
  return Date.now() - (state.progress.portalEndedAt || 0) >= PORTAL_COOLDOWN_MS;
}

// A plain walkable ground tile she can reach, free of anything standing on it. near: a few steps away and on screen (a portal
// stone, js/portal-craft.js); otherwise anywhere in the district, out of view when it can be (build 266: finding it is the fun).
const PORTAL_VIEW = { x: 3, y: 5 };   // about what the camera shows around her: further than this is off screen
// Is this tile on screen with the camera at rest on her? The same sums as updateCamera (js/town-render-weather.js): centred on
// her in the band between the top bar and the dock, but stopped at the map's edges, so near an edge a tile far from her can
// still be in view. Before the town has a size it falls back to a plain box round her (PORTAL_VIEW).
function portalInView(x, y) {
  const view = typeof townView !== 'undefined' && townView, t = typeof tilePx !== 'undefined' ? tilePx : 0;
  if (!view || !view.clientWidth || !t) return Math.abs(x - state.playerPos.x) <= PORTAL_VIEW.x && Math.abs(y - state.playerPos.y) <= PORTAL_VIEW.y;
  const m = getMap(state.currentDistrict), vw = view.clientWidth, vh = view.clientHeight, padT = CAM_PAD_TOP, padB = CAM_PAD_BOTTOM;
  const cx = Math.min(0, Math.max(vw - m.w * t, vw / 2 - (state.playerPos.x + 0.5) * t));
  const cy = Math.min(padT, Math.max(vh - m.h * t - padB, (padT + vh - padB) / 2 - (state.playerPos.y + 0.5) * t));
  const px = (x + 0.5) * t + cx, py = (y + 0.5) * t + cy;
  return px > t * 0.5 && px < vw - t * 0.5 && py > padT + t * 0.3 && py < vh - padB - t * 0.3;
}
function portalPickSpot(near) {
  const d = state.currentDistrict, m = getMap(d), data = ensureDistrictData(d); if (!m || !data) return null;
  const taken = occupiedSet(data), me = state.playerPos, pud = (LIFE.puddles[d] && LIFE.puddles[d].tiles) || [];
  const close = [], far = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    const c = m.rows[y][x], dx = Math.abs(x - me.x), dy = Math.abs(y - me.y);
    if (m.solid[y][x] || (c !== '.' && c !== '=') || dx + dy < 3 || taken.has(x + ',' + y) || pud.some(t => t.x === x && t.y === y)) continue;
    (portalInView(x, y) ? close : far).push({ x, y });
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reach = list => shuffle(list).slice(0, 16).find(s => findPath(m, data, me, (x, y) => x === s.x && y === s.y)) || null;
  return near ? reach(close) : (reach(far) || reach(close));
}
// Which way a tile lies from her, in words ("to the north-east"), for the toast and the compass.
function portalBearing(x, y) {
  const dx = x - state.playerPos.x, dy = y - state.playerPos.y, ns = dy < -1 ? 'north' : dy > 1 ? 'south' : '', ew = dx < -1 ? 'west' : dx > 1 ? 'east' : '';
  return ns && ew ? `${ns}-${ew}` : ns || ew || 'right here';
}

// Which family a new portal belongs to: the district's own family counts twice.
function portalPickFamily(district) {
  const bag = [];
  Object.keys(FAMILIES).forEach(f => { bag.push(f); if (FAMILIES[f].district === district) bag.push(f); });
  return bag[Math.floor(Math.random() * bag.length)];
}
// opts.crafted: opened from a portal stone (js/portal-craft.js): right beside her, and it lets her through even during the
// puddle-world cooldown, since she made it.
function portalOpen(family, opts) {
  opts = opts || {};
  const s = portalPickSpot(!!opts.crafted); if (!s) return false;
  const now = Date.now(), fam = FAMILIES[family] ? family : portalPickFamily(state.currentDistrict), f = FAMILIES[fam];
  state.progress.portal = { district: state.currentDistrict, x: s.x, y: s.y, openedAt: now, until: now + PORTAL_LIFE_MS, family: fam, crafted: !!opts.crafted, hidden: !portalInView(s.x, s.y) };
  bumpStat('portalsSeen', 1); saveState(); renderTown();
  const seen = portalInView(s.x, s.y), way = portalBearing(s.x, s.y);
  if (opts.crafted) {
    townLog.textContent = `The stone cracks and the air folds open beside you. A ${f.name} portal.`;
    toast(`${f.icon} Your ${f.name} portal is open. Step in when you are ready: it stays for ${Math.round(PORTAL_LIFE_MS / 60000)} minutes.`);
  } else {
    townLog.textContent = seen ? `The air folds over on itself a few steps away. A ${f.name} portal has opened.` : `Somewhere ${way === 'right here' ? 'close' : `to the ${way}`}, the air folds over on itself. A ${f.name} portal has opened. Can you find it?`;
    toast(`${f.icon} A ${f.name} portal has opened ${seen ? 'nearby' : `somewhere to the ${way}`}: ${f.name} cards wait on the other side. It will not stay open for ever.`);
  }
  logEvent('🌀', `A ${f.name} portal opened in ${DISTRICTS[state.currentDistrict].name}.`);
  if (typeof teleInc === 'function') teleInc('portal.opened');
  portalScreenFx(fam, s.x, s.y);
  sfx('portal'); buzz(HAP.big); showTipOnce('portal');
  portalCompass();
  return true;
}

/* The moment one opens (build 266): the screen ripples in the family's colours from the side the portal lies on, with a
   low whoomph and a shimmer (SFX.portal in js/audio.js). One short-lived element on top of the town, then gone. */
function portalScreenFx(fam, x, y) {
  const old = document.getElementById('portalFx'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'portalFx'; el.className = 'portal-fx portal-fam'; el.dataset.fam = fam; el.setAttribute('aria-hidden', 'true');
  const dx = x - state.playerPos.x, dy = y - state.playerPos.y, len = Math.hypot(dx, dy) || 1;
  el.style.setProperty('--fx-x', (50 + 42 * dx / len).toFixed(1) + '%'); el.style.setProperty('--fx-y', (50 + 42 * dy / len).toFixed(1) + '%');
  el.innerHTML = '<i class="pfx-ring"></i><i class="pfx-ring r2"></i><i class="pfx-edge"></i>';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* The compass (build 266): while the portal in this district is off screen, an arrow at the edge of the town view points the
   way, with the family's icon. It glows warmer the closer she gets, and goes when the portal comes into view. */
function portalCompass() {
  const view = typeof townView !== 'undefined' ? townView : null; if (!view) return;
  let el = document.getElementById('portalCompass');
  const p = portalHere(), show = p && !p.daily && portalTownShowing() && !portalInView(p.x, p.y) && state.currentDistrict !== (typeof PW_KEY !== 'undefined' ? PW_KEY : '');
  if (!show) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('button'); el.type = 'button'; el.id = 'portalCompass'; el.className = 'portal-compass portal-fam';
    el.addEventListener('click', e => { e.stopPropagation(); const q = portalHere(); if (!q) return;
      const n = Math.abs(q.x - state.playerPos.x) + Math.abs(q.y - state.playerPos.y);
      toast(`🌀 The portal hums somewhere to the ${portalBearing(q.x, q.y)}, about ${n} steps away.`); sfx('tap'); });
    view.appendChild(el);
  }
  const f = FAMILIES[p.family], n = Math.abs(p.x - state.playerPos.x) + Math.abs(p.y - state.playerPos.y);
  // the way on screen, from where she is drawn to where the portal is (the camera stops at the map's edges, so she is not always
  // in the middle); the tiles' own direction when either is not drawn
  const pe = typeof townWorld !== 'undefined' && townWorld && townWorld.querySelector('.ent.life-portal:not(.daily)'), me = typeof townWorld !== 'undefined' && townWorld && townWorld.querySelector('.ent.player');
  let dx = p.x - state.playerPos.x, dy = p.y - state.playerPos.y;
  if (pe && me) { const a1 = pe.getBoundingClientRect(), b1 = me.getBoundingClientRect(); if (a1.width && b1.width) { dx = (a1.left + a1.width / 2) - (b1.left + b1.width / 2); dy = (a1.top + a1.height / 2) - (b1.top + b1.height / 2); } }
  const a = Math.atan2(dy, dx);
  // place it on the rim of the view, where the line towards the portal leaves the screen
  const k = Math.min(0.40 / Math.max(Math.abs(Math.cos(a)), 1e-6), 0.27 / Math.max(Math.abs(Math.sin(a)), 1e-6));   // clear of the HUD and goal pill above, the words and dock below
  el.style.left = (50 + 100 * Math.cos(a) * k).toFixed(1) + '%'; el.style.top = (50 + 100 * Math.sin(a) * k).toFixed(1) + '%';
  el.style.setProperty('--a', (a * 180 / Math.PI).toFixed(1) + 'deg');
  el.style.setProperty('--warm', Math.max(0, Math.min(1, 1 - (n - 4) / 20)).toFixed(2));
  if (p.family) el.dataset.fam = p.family;
  el.setAttribute('aria-label', `A portal lies to the ${portalBearing(p.x, p.y)}`);
  el.innerHTML = `<span class="pc-arrow" aria-hidden="true"></span><span class="pc-fam" aria-hidden="true">${f ? f.icon : '🌀'}</span>`;
}
function portalClose(why) {   // why: 'faded' (its time ran out) or 'used'
  const p = portalState(); if (!p) return;
  const here = p.district === state.currentDistrict;
  state.progress.portal = null; state.progress.portalEndedAt = Date.now(); saveState();
  if (here) renderTown();
  portalCompass();
  if (why === 'faded') {
    if (here && portalTownShowing()) { townLog.textContent = 'The portal folds shut with a soft pop, as if it had never been there.'; sfx('soft'); }
    if (typeof teleInc === 'function') teleInc('portal.faded');
  }
}

// From lifeRenderEntities: draws the portal on its tile (it stands, so it uses the normal row stacking, not the ground's).
function portalRender(data, add) {
  const p = portalHere(); if (!p) return;
  const f = FAMILIES[p.family];
  const el = add('life-portal', p.x, p.y, '<span class="pt-glow"></span><span class="pt-swirl"></span><span class="pt-core"></span><i></i><i></i><i></i>' +
    (f ? `<span class="pt-fam" title="${f.name}">${f.icon}</span>` : ''));
  if (el && f) el.dataset.fam = p.family;
  if (el && p.until - Date.now() <= PORTAL_CLOSING_MS) el.classList.add('closing');
}
// From lifeStep: stepping onto the portal takes you through.
function portalStep(x, y) {
  const p = portalHere(); portalCompass(); if (!p || p.x !== x || p.y !== y) return;
  if (typeof pwCanStart !== 'function' || !pwCanStart(!!p.crafted)) { toast('🌀 The portal hums, but will not let you through just now.'); return; }
  const fam = p.family;
  portalClose('used');
  sfx('splash'); buzz(HAP.tap);
  const crafted = !!p.crafted;
  if (p.hidden) bumpStat('portalsHunted', 1);   // it opened out of sight and she found it
  setTimeout(() => { if (pwCanStart(crafted)) pwEnter(x, y, undefined, 'portal', fam); }, 250);
}

function portalTick() {
  if (document.hidden || !state || !state.progress) return;
  const p = portalState(), now = Date.now();
  if (p) {
    if (now >= p.until) { if (!(typeof pwBusy === 'function' && pwBusy())) portalClose('faded'); return; }
    portalCompass();
    if (p.until - now <= PORTAL_CLOSING_MS && p.district === state.currentDistrict && typeof townWorld !== 'undefined' && townWorld) {
      const el = townWorld.querySelector('.ent.life-portal:not(.daily)'); if (el && !el.classList.contains('closing')) el.classList.add('closing');
    }
    return;
  }
  if (now - portalCheckedAt < PORTAL_CHECK_MS) return;
  portalCheckedAt = now;
  if (portalCanOpen() && Math.random() < PORTAL_CHANCE) portalOpen();
}
// At start-up a portal that closed while the game was away is simply gone.
function portalBoot() { const p = portalState(); if (p && Date.now() >= p.until) { state.progress.portal = null; state.progress.portalEndedAt = p.until; } }
setInterval(portalTick, 1000);
