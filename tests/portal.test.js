// js/portal.js + js/warp-fx.js: a portal opens near you, is drawn on its tile, flickers in its last minute, closes on time, and
// stepping onto it takes you into a puddle world through the warped-time transition (the plain fade with reduced motion).
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});
  const fresh = () => page.evaluate(() => {
    if (pwActive()) pwLeave('left', true);
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn);
    state.progress.portal = null; state.progress.pwEndedAt = 0; state.progress.portalEndedAt = 0; prefs.cozy = false;
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); renderTown();
  });
  await page.evaluate(() => { state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 1); });
  await fresh();

  // ---- 1. it opens a few steps away, on screen, somewhere she can walk to, and is drawn there ----
  const o = await page.evaluate(() => {
    const ok = portalOpen(), p = state.progress.portal, me = state.playerPos, m = getMap('square');
    const el = document.querySelector('.ent.life-portal');
    return { ok, p, dx: Math.abs(p.x - me.x), dy: Math.abs(p.y - me.y), ground: !m.solid[p.y][p.x], drawn: !!el && +el.dataset.x === p.x && +el.dataset.y === p.y,
      life: p.until - p.openedAt === PORTAL_LIFE_MS, path: !!findPath(m, ensureDistrictData('square'), me, (x, y) => x === p.x && y === p.y) };
  });
  assert.ok(o.ok && o.p && o.p.district === 'square', 'a portal opened in this district');
  assert.ok(o.dx <= 3 && o.dy <= 5 && o.dx + o.dy >= 3, `on screen and a few steps away (dx ${o.dx}, dy ${o.dy})`);
  assert.ok(o.ground && o.path, 'on walkable ground she can reach');
  assert.ok(o.drawn, 'drawn on its tile');
  assert.ok(o.life, 'stays open for PORTAL_LIFE_MS');

  // ---- 2. only one at a time, and not in Cozy mode, inside a world or during the cooldown ----
  const gates = await page.evaluate(() => {
    const out = { second: portalCanOpen() };
    const p = state.progress.portal; state.progress.portal = null;
    prefs.cozy = true; out.cozy = portalCanOpen(); prefs.cozy = false;
    state.progress.portalEndedAt = Date.now(); out.cooldown = portalCanOpen(); state.progress.portalEndedAt = 0;
    out.free = portalCanOpen();
    state.progress.portal = p; return out;
  });
  assert.deepStrictEqual(gates, { second: false, cozy: false, cooldown: false, free: true }, 'opens only when nothing stops it');

  // ---- 3. it flickers in its last minute and closes when its time is up ----
  const closing = await page.evaluate(() => { state.progress.portal.until = Date.now() + 30000; renderTown(); return document.querySelector('.ent.life-portal').classList.contains('closing'); });
  assert.ok(closing, 'flickers in its last minute');
  const shut = await page.evaluate(() => { state.progress.portal.until = Date.now() - 1; portalTick(); return { gone: !state.progress.portal, el: !!document.querySelector('.ent.life-portal'), ended: Date.now() - state.progress.portalEndedAt < 5000 }; });
  assert.deepStrictEqual(shut, { gone: true, el: false, ended: true }, 'closed, no longer drawn, cooldown started');

  // ---- 4. a portal that closed while the game was away is gone at start-up ----
  const boot = await page.evaluate(() => { state.progress.portal = { district: 'square', x: 3, y: 3, openedAt: 0, until: Date.now() - 1000 }; portalBoot(); return state.progress.portal; });
  assert.strictEqual(boot, null, 'an expired portal is dropped at boot');

  // ---- 5. stepping onto it: warped time, then a puddle world (counted as a portal, not a puddle) ----
  await fresh();
  await page.evaluate(() => portalOpen());
  const before = await page.evaluate(() => ({ portals: state.progress.totals.portalsEntered || 0, puddles: state.progress.totals.puddleWorlds || 0 }));
  await page.evaluate(() => { const p = state.progress.portal; lifeStep(p.x, p.y); });
  await until(() => !!document.querySelector('.warp-fx'), null, 3000);
  const warping = await page.evaluate(() => ({ fx: !!document.querySelector('.warp-fx'), twist: !!document.querySelector('.town-map-wrap.warp-twist, .town-map-wrap.warp-untwist'), clock: !!document.querySelector('.warp-fx .wf-clock'), busy: travelFading }));
  assert.ok(warping.fx && warping.clock && warping.twist && warping.busy, 'the warped-time transition plays (vortex, clock, twisting map) and holds the game still');
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx') && !document.querySelector('.town-map-wrap.warp-twist, .town-map-wrap.warp-untwist'));
  const inside = await page.evaluate(() => ({ d: state.currentDistrict, world: !!pwActive(), portal: state.progress.portal, busy: travelFading, portals: state.progress.totals.portalsEntered || 0, puddles: state.progress.totals.puddleWorlds || 0 }));
  assert.ok(inside.d === 'pw' && inside.world && !inside.portal && !inside.busy, 'through the portal into a world; the portal is used up');
  assert.deepStrictEqual([inside.portals - before.portals, inside.puddles - before.puddles], [1, 0], 'counted as a portal, not a puddle');

  // ---- 6. the way back out warps too, with time running forward ----
  await page.evaluate(() => pwLeave('left'));
  await until(() => !!document.querySelector('.warp-fx'), null, 3000);
  const out = await page.evaluate(() => ({ fwd: !!document.querySelector('.warp-fx.fwd'), map: !!document.querySelector('.town-map-wrap.warp-fwd') }));
  assert.ok(out.fwd && out.map, 'leaving a world plays the forward warp');
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'));
  const back = await page.evaluate(() => ({ d: state.currentDistrict, world: !!pwActive(), busy: travelFading, left: !!document.querySelector('.town-map-wrap.warp-twist, .town-map-wrap.warp-untwist, .town-map-wrap.warp-fwd') }));
  assert.deepStrictEqual(back, { d: 'square', world: false, busy: false, left: false }, 'back in town, nothing left over');

  // ---- 7. with reduced motion the way in is the plain travel fade ----
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fresh();
  await page.evaluate(() => { state.progress.pwEndedAt = 0; pwEnter(); });
  await until(() => !!document.querySelector('.travel-fade') || state.currentDistrict === 'pw', null, 3000);
  const calm = await page.evaluate(() => ({ warp: !!document.querySelector('.warp-fx') }));
  assert.ok(!calm.warp, 'no warp effect with reduced motion');
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { if (pwActive()) pwLeave('left', true); state.progress.portal = null; renderTown(); });
};
