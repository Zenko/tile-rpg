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
   - The spot is a plain walkable ground tile a few steps away that you can actually walk to (findPath).
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

// A ground tile a few steps away and on screen (at most 3 across, 5 up or down), free of anything standing on it, that she can walk to.
function portalPickSpot() {
  const d = state.currentDistrict, m = getMap(d), data = ensureDistrictData(d); if (!m || !data) return null;
  const taken = occupiedSet(data), me = state.playerPos, pud = (LIFE.puddles[d] && LIFE.puddles[d].tiles) || [];
  const spots = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    const c = m.rows[y][x], dx = Math.abs(x - me.x), dy = Math.abs(y - me.y);   // in view: the camera keeps her near the middle
    if (m.solid[y][x] || (c !== '.' && c !== '=') || dx + dy < 3 || dx > 3 || dy > 5 || taken.has(x + ',' + y) || pud.some(t => t.x === x && t.y === y)) continue;
    spots.push({ x, y });
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return spots.slice(0, 12).find(s => findPath(m, data, me, (x, y) => x === s.x && y === s.y)) || null;
}

// Which family a new portal belongs to: the district's own family counts twice.
function portalPickFamily(district) {
  const bag = [];
  Object.keys(FAMILIES).forEach(f => { bag.push(f); if (FAMILIES[f].district === district) bag.push(f); });
  return bag[Math.floor(Math.random() * bag.length)];
}
function portalOpen(family) {
  const s = portalPickSpot(); if (!s) return false;
  const now = Date.now(), fam = FAMILIES[family] ? family : portalPickFamily(state.currentDistrict), f = FAMILIES[fam];
  state.progress.portal = { district: state.currentDistrict, x: s.x, y: s.y, openedAt: now, until: now + PORTAL_LIFE_MS, family: fam };
  bumpStat('portalsSeen', 1); saveState(); renderTown();
  townLog.textContent = `The air folds over on itself a few steps away. A ${f.name} portal has opened.`;
  toast(`${f.icon} A ${f.name} portal has opened nearby: ${f.name} cards wait on the other side. It will not stay open for ever.`);
  logEvent('🌀', `A ${f.name} portal opened in ${DISTRICTS[state.currentDistrict].name}.`);
  if (typeof teleInc === 'function') teleInc('portal.opened');
  sfx('wish'); buzz(HAP.tap); showTipOnce('portal');
  return true;
}
function portalClose(why) {   // why: 'faded' (its time ran out) or 'used'
  const p = portalState(); if (!p) return;
  const here = p.district === state.currentDistrict;
  state.progress.portal = null; state.progress.portalEndedAt = Date.now(); saveState();
  if (here) renderTown();
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
  const p = portalHere(); if (!p || p.x !== x || p.y !== y) return;
  if (typeof pwCanStart !== 'function' || !pwCanStart()) { toast('🌀 The portal hums, but will not let you through just now.'); return; }
  const fam = p.family;
  portalClose('used');
  sfx('splash'); buzz(HAP.tap);
  setTimeout(() => { if (pwCanStart()) pwEnter(x, y, undefined, 'portal', fam); }, 250);
}

function portalTick() {
  if (document.hidden || !state || !state.progress) return;
  const p = portalState(), now = Date.now();
  if (p) {
    if (now >= p.until) { if (!(typeof pwBusy === 'function' && pwBusy())) portalClose('faded'); return; }
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
