// The cellar as a world (js/cellar-world.js, js/cellar-run.js): hearts and boons, rooms-and-corridors floors, the fog, things on the floor, creatures
// that start matches, the stairs, and leaving and coming back.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const fresh = () => ev(() => { if (pwActive()) pwLeave('left', true); const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; st.clearedAt = null; st.inRun = false; state.progress.level = 8; return true; });

  // ----- hearts, boons, the record -----
  const r = await ev(() => { const st = cellarState(); st.floor = 0; st.run = null; st.resting = false; st.clearedAt = null; st.inRun = false; cellarNewRun(st); return { hearts: st.run.hearts, seed: !!st.run.seed, noDoors: !('doors' in st.run) }; });
  assert.strictEqual(r.hearts, 3); assert.ok(r.seed && r.noDoors, 'a run has hearts and a seed, and no row of doors any more');
  const b = await ev(() => {
    const st = cellarState(); st.run.boons = ['skin', 'sharp'];
    const outside = skillBonus('startSpirit');
    inBattle = true; battle = { npc: { dungeon: { id: 'cellar' } } };
    const inside = { spirit: skillBonus('startSpirit') - outside, draw: skillBonus('startDraw') };
    inBattle = false; battle = null; return { outside, inside };
  });
  assert.strictEqual(b.inside.spirit, 2); assert.strictEqual(b.inside.draw, 1, 'boons work in a cellar fight only');
  const l = await ev(() => {
    const st = cellarState(); st.floor = 4; st.run = null; cellarNewRun(st);
    const fight = () => { battle = { npc: { dungeon: { id: 'cellar', district: 'square', floor: 4, deep: true } } }; return dungeonLoss(); };
    const a = fight(), b2 = fight(), c = fight(); battle = null;
    return { a, b2, c, resting: st.resting, run: !!st.run };
  });
  assert.strictEqual(l.a.hearts, 2); assert.strictEqual(l.b2.hearts, 1); assert.ok(l.c.ended && l.resting && !l.run, 'the third loss ends the run and the cellar rests');
  const s = await ev(() => { const st = cellarState(); st.resting = false; st.clearedAt = null; st.floor = 1; st.run = null; cellarNewRun(st); endCellarRun(st, 'test'); return { resting: st.resting, floor: st.floor }; });
  assert.deepStrictEqual(s, { resting: false, floor: 0 }, 'a short run costs no rest');
  assert.ok(await ev(() => { const st = cellarState(); st.run = null; st.resting = false; st.clearedAt = null; st.floor = 2; return !!cellarRun(cellarState()); }), 'a mid-climb save gets a run');

  // ----- the maps: every floor is joined up, and everything on it can be reached -----
  const g = await ev(() => {
    const bad = []; let sizes = new Set();
    for (let floor = 0; floor < 10; floor++) for (let k = 0; k < 8; k++) {
      const st = cellarState(); st.floor = floor; st.run = null; cellarNewRun(st); st.run.seed = 'seed' + k;
      const fl = cellarMakeFloor(st), m = fl.map, free = (x, y) => m.rows[y] && '#='.includes(m.rows[y][x]);
      sizes.add(m.w + 'x' + m.h);
      const seen = new Set([m.spawn.x + ',' + m.spawn.y]), q = [m.spawn];
      while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const x = c.x + dx, y = c.y + dy, key = x + ',' + y; if (free(x, y) && !seen.has(key)) { seen.add(key); q.push({ x, y }); } }); }
      const reach = (x, y) => seen.has(x + ',' + y);
      Object.keys(fl.objs).forEach(key => { const [x, y] = key.split(',').map(Number); if (!reach(x, y)) bad.push(`f${floor} ${k}: ${fl.objs[key].k} unreachable`); });
      fl.foes.forEach(f => { if (!reach(f.x, f.y) && !(f.guard && reach(f.x, f.y))) bad.push(`f${floor} ${k}: foe unreachable`); });
      if (!reach(m.cellarDown.x, m.cellarDown.y)) bad.push(`f${floor} ${k}: no way down`);
      if (m.cellarDown.x === m.pwExit.x && m.cellarDown.y === m.pwExit.y) bad.push('stairs on stairs');
      if (cellarIsGuardian(floor) !== fl.foes.some(f => f.guard && f.x === m.cellarDown.x && f.y === m.cellarDown.y)) bad.push(`f${floor} ${k}: guardian floors put the guardian on the stairs`);
      if (!cellarIsGuardian(floor) && fl.foes.length < 2) bad.push(`f${floor} ${k}: too few creatures`);
    }
    return { bad: bad.slice(0, 5), sizes: [...sizes] };
  });
  assert.deepStrictEqual(g.bad, [], 'floors are joined up and everything can be reached: ' + g.bad.join('; '));
  assert.ok(g.sizes.length >= 2, 'deeper floors are bigger: ' + g.sizes);

  // ----- going in: a real map, in the town view -----
  await fresh();
  await ev(() => { document.getElementById('testHideOverlays') && document.getElementById('testHideOverlays').remove(); state.currentDistrict = 'square'; state.playerPos = { x: 7, y: 3 }; openScene('cellar'); });
  await page.waitForTimeout(500);
  const w = await ev(() => ({ on: cellarWorldOn(), district: state.currentDistrict, scene: !!inScene, kind: pwActive().kind, noTimer: !!pwActive().noTimer, name: DISTRICTS.pw.name, pill: document.getElementById('pwTime').textContent, pillShown: !document.getElementById('pillWorld').classList.contains('hidden'),
    bar: document.getElementById('hudCellar').textContent, barShown: getComputedStyle(document.getElementById('hudCellar')).display !== 'none', fog: !!document.querySelector('canvas.cl-fog'), ents: document.querySelectorAll('.ent.cl-obj, .ent.cl-foe, .ent.cl-stairs').length,
    atSpawn: state.playerPos.x === getMap('pw').spawn.x && state.playerPos.y === getMap('pw').spawn.y, sky: getComputedStyle(document.querySelector('.town-sky') || document.body).display }));
  assert.ok(w.on && w.district === 'pw' && !w.scene && w.kind === 'cellar' && w.noTimer, 'the cellar door leads into a world, not a scene: ' + JSON.stringify(w));
  assert.ok(/Sótano/.test(w.name) && /^F1 ♥♥♥/.test(w.pill) && w.pillShown && /Floor 1/.test(w.bar) && w.barShown, 'the pill and the bar say where you are: ' + JSON.stringify(w));
  assert.ok(w.fog && w.ents >= 6 && w.atSpawn, 'the fog is drawn, the floor has things on it, and you start by the stairs: ' + JSON.stringify(w));
  assert.ok(!(await ev(() => Object.keys(PW_KINDS).includes('cellar'))), 'the cellar is not one of the puddle kinds the Rift Atlas lists');

  // the lantern lights a little way, and walking remembers more
  const f1 = await ev(() => { const fl = cellarFl(); const n0 = Object.keys(fl.seen).length; const m = getMap('pw'); const near = Object.keys(fl.seen).every(k => { const [x, y] = k.split(',').map(Number); return Math.hypot(x - fl.pos.x, y - fl.pos.y) <= cellarRadius(fl) + 0.4; });
    return { n0, total: m.w * m.h, near }; });
  assert.ok(f1.near && f1.n0 > 6 && f1.n0 < f1.total / 3, 'only the tiles around the lantern are known at first: ' + JSON.stringify(f1));
  const f2 = await ev(() => { const fl = cellarFl(), m = getMap('pw'), data = state.districtData.pw; const far = Object.keys(fl.seen).length;
    // walk (by steps) to the tile furthest from you that is walkable and seen, then see how much more is known
    fl.foes.length = 0; fl.objs = {}; cellarSyncBlockers();   // clear the floor first: a creature standing in a corridor used to leave no path (findPath null), now and then
    const path = findPath(m, data, state.playerPos, (x, y) => Math.hypot(x - fl.map.cellarDown.x, y - fl.map.cellarDown.y) < 1.5);
    path.slice(0, 12).forEach(p => { state.playerPos = { x: p.x, y: p.y }; cellarStep(pwActive(), p.x, p.y); });
    return { before: far, after: Object.keys(fl.seen).length, pos: fl.pos }; });
  assert.ok(f2.after > f2.before + 10, 'walking lights up and remembers more of the floor: ' + JSON.stringify(f2));

  // ----- the things on the floor -----
  const o = await ev(() => {
    const st = cellarState(), run = cellarRun(st), fl = run.fl, m = getMap('pw');
    fl.foes.length = 0; fl.objs = {}; fl.key = false; fl.dim = 0; fl.bright = 0; run.hearts = 1; run.boons = [];
    // six free tiles in a row somewhere
    const spots = []; for (let y = 1; y < m.h - 1 && spots.length < 8; y++) for (let x = 1; x < m.w - 1 && spots.length < 8; x++) if ('#='.includes(m.rows[y][x]) && !(x === fl.map.pwExit.x && y === fl.map.pwExit.y) && !(x === fl.map.cellarDown.x && y === fl.map.cellarDown.y)) spots.push({ x, y });
    const put = (i, k) => { fl.objs[spots[i].x + ',' + spots[i].y] = { k }; return spots[i]; }, step = i => { state.playerPos = { x: spots[i].x, y: spots[i].y }; cellarStep(pwActive(), spots[i].x, spots[i].y); };
    const p0 = state.progress.pebbles; put(0, 'barrel'); step(0); const barrel = state.progress.pebbles - p0 >= 1 && !fl.objs[spots[0].x + ',' + spots[0].y];
    put(1, 'lock'); step(1); const lockKept = !!fl.objs[spots[1].x + ',' + spots[1].y];
    put(2, 'key'); step(2); const hasKey = fl.key;
    const boons0 = run.boons.length, p1 = state.progress.pebbles; step(1); const opened = !fl.objs[spots[1].x + ',' + spots[1].y] && !fl.key && (run.boons.length > boons0 || state.progress.pebbles > p1);
    put(3, 'rat'); step(3); const dim = fl.dim;
    fl.dim = 0; put(4, 'cap'); step(4); const bright = fl.bright;
    const radii = [cellarRadius({ dim: 0, bright: 0 }), cellarRadius({ dim: 5, bright: 0 }), cellarRadius({ dim: 0, bright: 5 })];
    // no boons for the campfire: the chest above may have given Warm Hands (+1 heart from a campfire), 1 time in 6
    run.hearts = 1; run.boons = []; put(5, 'camp'); step(5); const healed = run.hearts === 2 && fl.objs[spots[5].x + ',' + spots[5].y].used;
    step(5); const once = run.hearts === 2;
    put(6, 'shrine'); const b1 = run.boons.length; step(6); const shrine = run.boons.length > b1 || run.boons.length === CELLAR_BOONS.length;
    return { barrel, lockKept, hasKey, opened, dim, bright, radii, healed, once, shrine };
  });
  assert.ok(o.barrel, 'barrels pay Embers'); assert.ok(o.lockKept, 'the chest stays locked without the key'); assert.ok(o.hasKey && o.opened, 'the key opens the chest');
  assert.strictEqual(o.dim, 7, 'a rat dims the light (8, less the step it was found on)'); assert.strictEqual(o.bright, 9); assert.ok(o.radii[1] < o.radii[0] && o.radii[2] > o.radii[0], 'dim is smaller and bright is bigger: ' + o.radii);
  assert.ok(o.healed && o.once, 'a campfire restores a heart, once'); assert.ok(o.shrine, 'a shrine gives a boon');

  // ----- creatures: a tap walks up to one and starts a match -----
  const f = await ev(() => {
    const fl = cellarFl(), m = getMap('pw'); fl.foes.length = 0; fl.objs = {}; fl.dim = 0; fl.bright = 0;
    const pp = state.playerPos; const c = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => ({ x: pp.x + dx, y: pp.y + dy })).find(q => '#='.includes(m.rows[q.y] && m.rows[q.y][q.x]) && '#='.includes(m.rows[(q.y + pp.y) >> 1][(q.x + pp.x) >> 1]));
    fl.foes.push({ id: 'f9', x: c.x, y: c.y, done: false }); fl.seen[c.x + ',' + c.y] = 1; renderTown(); cellarSyncBlockers();
    const blocked = !findPath(m, state.districtData.pw, pp, (x, y) => x === c.x && y === c.y);
    const started = []; const real = startBattle; startBattle = o2 => { started.push(o2); }; window.__realStart = real;
    handleMapTap(c.x, c.y);
    return { blocked, c };
  });
  assert.ok(f.blocked, 'a creature stands in the way (you cannot walk through it)');
  // wait for the walk to arrive rather than a fixed time: on a busy machine 1.5 s was sometimes too short
  await page.waitForFunction(() => { const fl = cellarFl(), pp = state.playerPos, c = fl.foes[0]; return c && Math.abs(pp.x - c.x) + Math.abs(pp.y - c.y) === 1; }, null, { timeout: 8000 }).catch(() => {});
  const f3 = await ev(() => { const fl = cellarFl(), pp = state.playerPos, c = fl.foes[0]; return { adjacent: Math.abs(pp.x - c.x) + Math.abs(pp.y - c.y) === 1 }; });
  assert.ok(f3.adjacent, 'you walked up next to it');
  const f4 = await ev(() => {
    const foe = cellarFl().foes[0], st = cellarState(), started = []; startBattle = o2 => { started.push(o2); };
    cellarFight(foe); startBattle = window.__realStart;
    const o2 = started[0]; return { has: !!o2, world: o2 && o2.dungeon && o2.dungeon.world, foe: o2 && o2.dungeon.foe, district: o2 && o2.dungeon.district, deck: o2 && o2.deck && o2.deck.length };
  });
  assert.ok(f4.has && f4.world && f4.foe === 'f9' && f4.district === 'square' && f4.deck > 0, 'the match is a cellar match tied to that creature: ' + JSON.stringify(f4));
  // winning removes it and pays; the first win on a floor pays in full, the next half
  const win = await ev(() => {
    const fl = cellarFl(), st = cellarState(), foe = fl.foes[0], fe = cellarFloor(st.floor); fl.wins = 0;
    const win1 = () => { battle = { npc: { dungeon: { id: 'cellar', district: 'square', floor: st.floor, world: true, foe: foe.id } }, G: { p: [{ spirit: 9 }] } }; const p0 = state.progress.pebbles; dungeonWin(); battle = null; return state.progress.pebbles - p0; };
    const a = win1(); foe.done = false; const c = win1();
    return { a, c, done: foe.done, floor: st.floor, base: cellarPebblesFor(fe.pebbles, st) };
  });
  assert.ok(win.done && win.floor === 0, 'winning removes the creature and does not change the floor');
  assert.strictEqual(win.a, win.base, 'the first win pays in full'); assert.strictEqual(win.c, Math.max(1, Math.round(win.base * 0.5)), 'later wins pay half');

  // ----- the stairs down -----
  const d = await ev(() => {
    const st = cellarState(), fl0 = cellarFl(), seed0 = JSON.stringify(fl0.map.rows), best0 = state.progress.cellarBest || 0;
    fl0.foes.forEach(x => { x.done = true; });
    const dn = fl0.map.cellarDown; state.playerPos = { x: dn.x, y: dn.y }; cellarStep(pwActive(), dn.x, dn.y);
    return { floor: st.floor, best: (state.progress.cellarBest || 0) > best0 || best0 >= 1, seed0 };
  });
  await page.waitForFunction(() => cellarFl() && cellarFl().floor === 1 && !doorFading, null, { timeout: 8000 });
  const d2 = await ev(() => { const fl = cellarFl(), m = getMap('pw'); return { floor: cellarState().floor, pos: state.playerPos, spawn: m.spawn, size: [m.w, m.h], name: DISTRICTS.pw.name, bar: document.getElementById('hudCellar').textContent, guardian: cellarIsGuardian(1) }; });
  assert.strictEqual(d.floor, 1, 'the stairs take you to the next floor');
  assert.ok(d2.floor === 1 && d2.pos.x === d2.spawn.x && d2.pos.y === d2.spawn.y && /Floor 2/.test(d2.bar), 'a new floor, you at its stairs: ' + JSON.stringify(d2));

  // ----- leaving keeps the run; coming back puts you where you were -----
  const lv = await ev(() => { const fl = cellarFl(), pos = Object.assign({}, state.playerPos), seen = Object.keys(fl.seen).length, hearts = cellarRun(cellarState()).hearts; window.__keep = { pos, seen, hearts, floor: cellarState().floor }; pwLeave('left', true); return { out: !pwActive(), district: state.currentDistrict, run: !!cellarRun(cellarState()), fogGone: !document.querySelector('canvas.cl-fog'), sky: document.body.classList.contains('in-cellar'), pillHidden: document.getElementById('pillWorld').classList.contains('hidden') }; });
  assert.ok(lv.out && lv.district === 'square' && lv.run && lv.fogGone && !lv.sky && lv.pillHidden, 'you are back in the square and the run waits: ' + JSON.stringify(lv));
  await ev(() => { openScene('cellar'); }); await page.waitForTimeout(300);
  const back = await ev(() => ({ floor: cellarState().floor, pos: state.playerPos, seen: Object.keys(cellarFl().seen).length, hearts: cellarRun(cellarState()).hearts, keep: window.__keep }));
  assert.ok(back.floor === back.keep.floor && back.pos.x === back.keep.pos.x && back.pos.y === back.keep.pos.y && back.seen === back.keep.seen && back.hearts === back.keep.hearts, 'the same floor, place, map and hearts: ' + JSON.stringify(back));

  // a reload in the middle puts you back in the cellar
  const boot = await ev(() => { saveState(); const raw = JSON.parse(JSON.stringify(state.progress.puddleWorld)); pwApply(null); cellarOff(); const active = pwActive(); state.progress.puddleWorld = raw; pwBoot(); return { active: !!pwActive(), hud: cellarWorldOn(), fl: !!cellarFl() }; });
  assert.ok(boot.active && boot.hud && boot.fl, 'a reload keeps you in the cellar: ' + JSON.stringify(boot));

  // a lost last heart ends the run and puts you out
  await ev(() => { const st = cellarState(), run = cellarRun(st); run.hearts = 1; battle = { npc: { dungeon: { id: 'cellar', district: 'square', floor: st.floor, world: true, foe: 'x' } } }; const lost = dungeonLoss(); battle = null; cellarAfterBattle(); return lost; });
  await page.waitForFunction(() => !pwActive(), null, { timeout: 8000 });
  assert.ok(await ev(() => !cellarRun(cellarState()) && state.currentDistrict === 'square'), 'at zero hearts the run ends and the dark pushes you out');
  await ev(() => { const st = cellarState(); st.resting = true; st.clearedAt = Date.now(); });
  await ev(() => { openScene('cellar'); }); await page.waitForTimeout(200);
  assert.ok(await ev(() => !pwActive() && !document.getElementById('sceneryOverlay').classList.contains('hidden')), 'a resting cellar will not let you in');
  await ev(() => { const st = cellarState(); st.resting = false; st.clearedAt = null; st.floor = 0; st.run = null; });
};
