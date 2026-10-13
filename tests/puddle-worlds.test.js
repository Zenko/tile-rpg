// js/puddle-worlds.js: a splashed puddle can open a small timed world; every world is different; the timer ends it and puts you back.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});   // wait for the state, not a fixed time (slow CI machines)
  await page.evaluate(() => { state.progress.level = 5; state.progress.xp = Math.max(state.progress.xp || 0, 1); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); });

  // ---- 1. the world is a hidden district: lookups work, lists never see it ----
  const hid = await page.evaluate(() => ({ keys: Object.keys(DISTRICTS), values: Object.values(DISTRICTS).length, has: !!DISTRICTS.pw, listed: Object.keys(DISTRICTS).includes('pw') }));
  assert.deepStrictEqual(hid.keys, ['square', 'market', 'harbor', 'garden'], 'the four real districts only');
  assert.ok(hid.has && !hid.listed && hid.values === 4, 'DISTRICTS.pw can be looked up but is not enumerable');

  // ---- 2. maps: every shape, size and seed is a connected, walkable world; different seeds differ (a world's map is stored, so it need not be reproducible) ----
  const maps = await page.evaluate(() => {
    const bad = [], sigs = {}, sizes = [[15, 15], [17, 17], [19, 19], [15, 19], [19, 15]];
    for (const shape of Object.keys(PW_SHAPES)) {
      sigs[shape] = new Set();
      for (let i = 0; i < 12; i++) for (const size of sizes) {
        const w = { seed: 't' + i, shape, size }, m = pwGenerate(w), tag = `${shape}/${i}/${size}`;
        if (m.rows.length !== size[1] || m.rows.some(r => r.length !== size[0])) bad.push(tag + ' wrong size');
        const open = (x, y) => !SOLID_TERRAIN.includes(m.rows[y][x]);
        if (!open(m.spawn.x, m.spawn.y)) bad.push(tag + ' spawn blocked');
        const seen = new Set([m.spawn.x + ',' + m.spawn.y]), q = [m.spawn];
        while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = c.x + dx, ny = c.y + dy; if (nx < 0 || ny < 0 || nx >= size[0] || ny >= size[1] || seen.has(nx + ',' + ny) || !open(nx, ny)) return; seen.add(nx + ',' + ny); q.push({ x: nx, y: ny }); }); }
        const walk = m.rows.join('').split('').filter(c => !SOLID_TERRAIN.includes(c)).length;
        if (walk !== seen.size) bad.push(tag + ' has unreachable ground');
        if (walk < 45) bad.push(tag + ' too small: ' + walk);
        if (m.props.length < 1 || m.props.length > 3 || m.props.some(p => SOLID_TERRAIN.includes(m.rows[p.y][p.x]))) bad.push(tag + ' props');
        if (size[0] === 17 && size[1] === 17) sigs[shape].add(m.rows.join(''));
      }
    }
    return { bad: bad.slice(0, 5), distinct: Object.fromEntries(Object.entries(sigs).map(([k, s]) => [k, s.size])) };
  });
  assert.deepStrictEqual(maps.bad, [], 'every generated map is playable: ' + JSON.stringify(maps.bad));
  Object.entries(maps.distinct).forEach(([shape, n]) => assert.ok(n >= 10, `${shape}: 12 seeds should give at least 10 different maps, got ${n}`));

  // ---- 3. every world biome has its own palette, in both themes ----
  const pal = await page.evaluate(() => {
    const out = {};
    for (const theme of ['dark', 'light']) {
      document.documentElement.dataset.theme = theme;
      out[theme] = PW_BIOMES.map(b => { const el = document.createElement('div'); el.className = 'town-view'; el.dataset.biome = b.id; document.body.appendChild(el); const v = getComputedStyle(el).getPropertyValue('--ground').trim() + '|' + getComputedStyle(el).getPropertyValue('--water').trim(); el.remove(); return v; });
    }
    document.documentElement.dataset.theme = 'dark';
    return out;
  });
  ['dark', 'light'].forEach(t => { assert.ok(pal[t].every(v => /#/.test(v)), `${t}: every biome defines its colours`); assert.strictEqual(new Set(pal[t]).size, 7, `${t}: seven different palettes`); });

  // ---- 4. a splashed puddle can be a way in (the real hook), and the rules around it ----
  const guards = await page.evaluate(() => {
    const out = {}, lvl = state.progress.level, cozy = prefs.cozy;
    out.base = pwCanStart();
    prefs.cozy = true; out.cozy = pwCanStart(); prefs.cozy = cozy;
    state.progress.pwEndedAt = Date.now(); out.cooldown = pwCanStart(); state.progress.pwEndedAt = Date.now() - PW_COOLDOWN_MS - 1000; out.afterCooldown = pwCanStart();
    inBattle = true; out.battle = pwCanStart(); inBattle = false;
    return out;
  });
  assert.deepStrictEqual(guards, { base: true, cozy: false, cooldown: false, afterCooldown: true, battle: false }, 'who may fall in, and when');

  const enter = await page.evaluate(async () => {
    const out = {}, realRandom = Math.random;
    const m = getMap('square'), tile = (() => { for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (!m.solid[y][x] && m.reach[y][x] && Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) > 3) return { x, y }; })();
    state.currentDistrict = 'square'; state.playerPos = { x: tile.x, y: tile.y }; townBuiltFor = null; renderTown(); switchTab('town');
    // a puddle on her tile, as the rain would make it (put back before each splash: a dry-weather redraw of the town clears it)
    const puddle = () => { LIFE.puddles.square = { key: 'test', tiles: [tile] }; LIFE.splashed.clear(); };
    puddle(); Math.random = () => 0.99; lifeStep(tile.x, tile.y); Math.random = realRandom; await new Promise(r => setTimeout(r, 900)); out.unlucky = state.currentDistrict;   // a bad roll: nothing happens
    puddle(); Math.random = () => 0; lifeStep(tile.x, tile.y); Math.random = realRandom;                                                                                  // a good roll
    out.tile = tile; return out;
  });
  assert.strictEqual(enter.unlucky, 'square', 'most puddles are just puddles');
  await until(() => state.currentDistrict === 'pw' && !!document.querySelector('#townWorld'));
  const inside = await page.evaluate(() => {
    const w = pwActive(), d = state.districtData.pw, hud = document.getElementById('pillWorld');
    return { district: state.currentDistrict, origin: w && w.origin, mins: w && (w.endsAt - w.startedAt) / 60000, name: w && w.name, nameLookup: DISTRICTS.pw.name, biomeAttr: townView.dataset.biome, biome: w && w.biome,
      items: d.items.length, fixed: d.items.every(i => i.fixed), treasures: d.items.filter(i => i.treasure).length, spirits: d.spirits.length, npcs: d.npcs.length, boss: d.boss, pill: !hud.classList.contains('hidden'), time: document.getElementById('pwTime').textContent,
      stat: state.progress.totals.puddleWorlds, log: state.progress.eventLog[0] && state.progress.eventLog[0].text, listed: Object.keys(DISTRICTS).includes('pw'), visited: state.visitedDistricts.includes('pw'), hudName: document.getElementById('hudDistrict').textContent };
  });
  assert.strictEqual(inside.district, 'pw', 'the puddle took her in');
  assert.deepStrictEqual(inside.origin, { district: 'square', x: enter.tile.x, y: enter.tile.y }, 'it remembers exactly where she fell in from');
  assert.ok(inside.mins >= 4 && inside.mins <= 7, 'a world lasts four to seven minutes: ' + inside.mins);
  assert.ok(inside.name && inside.nameLookup === inside.name && inside.hudName === inside.name, 'the world has a name, shown at the top');
  assert.strictEqual(inside.biomeAttr, inside.biome, 'the town view wears the world\'s palette');
  assert.ok(inside.items === 6 && inside.fixed && inside.treasures === 1 && inside.spirits === 3 && inside.npcs === 0 && inside.boss === null, 'six hidden cards (one treasure), three spirits, nobody to fight: ' + JSON.stringify(inside));
  assert.ok(inside.pill && /^\d:\d\d$/.test(inside.time), 'the countdown shows in the top bar: ' + inside.time);
  assert.strictEqual(inside.stat, 1, 'counted'); assert.ok(/fell through a puddle/i.test(inside.log), 'and written in the Journal log');
  assert.ok(!inside.listed && !inside.visited, 'it never becomes a visited district');
  const stored = await page.evaluate(() => { const w = pwActive(), rows = getMap('pw').rows.join('/'); const same = w.map.rows.join('/') === rows;
    w.seed = 'a-different-seed'; delete MAP_CACHE.pw; return { same, afterSeedChange: getMap('pw').rows.join('/') === rows, props: w.map.props.length === getMap('pw').props.length }; });
  assert.ok(stored.same && stored.afterSeedChange && stored.props, 'the map is stored with the world: it does not depend on regenerating it: ' + JSON.stringify(stored));

  // ---- 5. inside: no leaving by the map, no new world on top, cards stay put ----
  const rules = await page.evaluate(() => {
    const out = {}, shown = [], realToast = toast; toast = m => { shown.push(m); };
    try { travelToDistrict('market'); out.stayed = state.currentDistrict; out.msg = shown.join('|'); out.nested = pwCanStart(); } finally { toast = realToast; }
    const d = state.districtData.pw, it = d.items[0], realNow = Date.now.bind(Date);
    Date.now = () => realNow() + 10 * 60 * 1000; tickItems(d); out.stillThere = !it.collected;     // ten minutes on: a town card would have vanished by now
    it.collected = true; it.collectedAt = realNow() - 10 * 60 * 1000; tickItems(d); out.noRespawn = it.collected; Date.now = realNow;
    it.collected = false; return out;
  });
  assert.strictEqual(rules.stayed, 'pw', 'the world map cannot take her away'); assert.ok(/ripple holds you/i.test(rules.msg), 'and says why: ' + rules.msg);
  assert.strictEqual(rules.nested, false, 'no world inside a world');
  assert.ok(rules.stillThere && rules.noRespawn, 'cards here neither vanish nor come back');

  // ---- 6. the timer: a warning near the end, and the world waits for a battle to finish ----
  const t = await page.evaluate(() => {
    const out = {}, w = pwActive(); w.endsAt = Date.now() + 20000; pwTick(); out.warn = document.getElementById('pillWorld').classList.contains('warn');
    w.endsAt = Date.now() - 1; inBattle = true; pwTick(); out.heldByBattle = state.currentDistrict; inBattle = false; return out;
  });
  assert.ok(t.warn, 'the pill pulses in the last thirty seconds'); assert.strictEqual(t.heldByBattle, 'pw', 'a battle in progress keeps the world until it is over');
  await page.evaluate(() => pwTick());
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade'));
  const back = await page.evaluate(() => ({ district: state.currentDistrict, pos: state.playerPos, world: state.progress.puddleWorld, data: !!state.districtData.pw, cache: !!MAP_CACHE.pw, pill: document.getElementById('pillWorld').classList.contains('hidden'),
    name: DISTRICTS.pw.name, biome: townView.dataset.biome, ended: !!state.progress.pwEndedAt, again: pwCanStart(), tx: !!townWorld.querySelector('.player') }));
  assert.strictEqual(back.district, 'square', 'back where she came from'); assert.deepStrictEqual(back.pos, { x: enter.tile.x, y: enter.tile.y }, 'on the very tile she fell in from');
  assert.ok(back.world === null && !back.data && !back.cache && back.pill && back.name === 'A Puddle World', 'the world is gone: its data, map and timer');
  assert.strictEqual(back.biome, 'meadow', 'the Square wears its own colours again'); assert.ok(back.ended && back.again === false && back.tx, 'a rest before the next one, and the town is drawn');

  // ---- 7. climbing out early through the timer ----
  await page.evaluate(() => { state.progress.pwEndedAt = 0; pwEnter(); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade'));
  await page.$eval('#pillWorld', el => el.click());   // a DOM click: Playwright's click waits for the animated overlay to be "stable", which can take for ever on a busy machine
  assert.ok(await page.evaluate(() => !document.getElementById('confirmOverlay').classList.contains('hidden') && /Climb out/.test(document.getElementById('confirmTitle').textContent)), 'tapping the timer asks first');
  await page.$eval('#confirmOk', el => el.click());
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade'));
  assert.ok(await page.evaluate(() => state.currentDistrict === 'square' && !pwActive()), 'and then she is back');

  // ---- 8. a restart: a running world is rebuilt from its seed; one that ended while the game was closed is gone ----
  await page.evaluate(() => { state.progress.pwEndedAt = 0; pwEnter(); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade'));
  const before = await page.evaluate(() => { state.districtData.pw.items[0].collected = true; saveState(); flushSaveState(); return { rows: getMap('pw').rows.join('/'), name: pwActive().name, left: pwActive().endsAt - Date.now() }; });
  const same = await page.evaluate(() => { delete MAP_CACHE.pw; BIOME_OF.pw = 'meadow'; DISTRICTS.pw.name = 'x'; loadState(); pwBoot(); return { rows: getMap('pw').rows.join('/'), name: DISTRICTS.pw.name, district: state.currentDistrict, biome: BIOME_OF.pw, w: pwActive() && pwActive().biome, collected: state.districtData.pw.items[0].collected }; });
  assert.strictEqual(same.district, 'pw', 'still inside after a restart'); assert.strictEqual(same.rows, before.rows, 'the same map, rebuilt from the seed');
  assert.ok(same.name === before.name && same.biome === same.w && same.collected, 'same name, palette and what was already found');
  const gone = await page.evaluate(() => {
    pwActive().endsAt = Date.now() - 5000; saveState(); flushSaveState(); loadState(); pwBoot();
    return { district: state.currentDistrict, pos: state.playerPos, world: state.progress.puddleWorld, data: !!state.districtData.pw };
  });
  assert.ok(gone.district === 'square' && gone.world === null && !gone.data, 'a world that ended while the game was closed is gone and she is back in the Square');
  const stray = await page.evaluate(() => { state.currentDistrict = 'pw'; state.progress.puddleWorld = null; pwBoot(); return state.currentDistrict; });
  assert.strictEqual(stray, 'square', 'a save left pointing at a world that no longer exists goes home');
};
