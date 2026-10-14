// js/puddle-modes.js: the three other kinds of puddle world (maze, ladders, deep) and the kind picking in js/puddle-worlds.js.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 10000 }).catch(() => {});   // wait for the state, not a fixed time
  await page.evaluate(() => { state.progress.level = 6; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); PWB.speed = 0.04; });
  const enter = async kind => {
    await page.evaluate(k => { state.progress.pwEndedAt = 0; state.progress.puddleWorld = null; state.currentDistrict = 'square'; pwEnter(undefined, undefined, k); }, kind);
    await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx') && !!state.districtData.pw);
  };
  const leaveQuiet = () => page.evaluate(() => { if (pwActive()) pwLeave('left', true); renderTown(); });

  // ---- 1. kinds: all five exist (the time-stop world is tested in puddle-still.test.js), are picked in turn (never the same twice running), and look right ----
  const kinds = await page.evaluate(() => {
    const out = { names: Object.keys(PW_KINDS), hooks: {}, repeat: 0, seen: {}, bad: [] };
    for (const k of out.names) out.hooks[k] = ['create', 'generate', 'build', 'goal'].every(h => typeof PW_KINDS[k][h] === 'function');
    for (let i = 0; i < 600; i++) {
      const last = out.names[i % out.names.length]; state.progress.pwLast = { kind: last };
      const w = pwNewWorld(); out.seen[w.kind] = (out.seen[w.kind] || 0) + 1; if (w.kind === last) out.repeat++;
      const biome = PW_BIOMES.find(b => b.id === w.biome), mins = (w.endsAt - w.startedAt) / 60000;
      if (!biome || !!biome.deep !== (w.kind === 'deep')) out.bad.push(w.kind + ' biome ' + w.biome);
      const range = { explore: [4, 7], maze: [5, 7], ladders: [5, 7], deep: [6, 8], still: [8, 8] }[w.kind];
      if (!(mins >= range[0] && mins <= range[1] + 0.01)) out.bad.push(w.kind + ' minutes ' + mins);
      if (!w.name || !w.intro) out.bad.push(w.kind + ' name/intro');
    }
    state.progress.pwLast = null; return out;
  });
  assert.deepStrictEqual(kinds.names.sort(), ['deep', 'explore', 'ladders', 'maze', 'still'], 'five kinds of world');
  assert.ok(Object.values(kinds.hooks).every(Boolean), 'each kind has its hooks: ' + JSON.stringify(kinds.hooks));
  assert.strictEqual(kinds.repeat, 0, 'never the same kind twice in a row');
  Object.values(kinds.seen).forEach(n => assert.ok(n > 40, 'every kind turns up: ' + JSON.stringify(kinds.seen)));
  assert.deepStrictEqual(kinds.bad.slice(0, 3), [], 'palette, timer and name fit the kind: ' + kinds.bad.slice(0, 3));

  // ---- 2. maze: always solvable, exit in the top wall, cards in dead ends ----
  const mazes = await page.evaluate(() => {
    const bad = [], stats = [];
    for (const cells of [7, 8, 9]) for (let i = 0; i < 10; i++) {
      const w = { seed: 'm' + i, kind: 'maze', cells, size: [2 * cells + 1, 2 * cells + 1], wall: i % 2 ? 'h' : 'r' }, m = pwMazeGenerate(w), tag = `${cells}/${i}`, n = 2 * cells + 1;
      if (m.rows.length !== n || m.rows.some(r => r.length !== n)) bad.push(tag + ' size');
      const open = (x, y) => !SOLID_TERRAIN.includes(m.rows[y][x]);
      if (!open(m.spawn.x, m.spawn.y)) bad.push(tag + ' spawn'); if (!m.pwExit || m.pwExit.y !== 0 || !open(m.pwExit.x, 0)) bad.push(tag + ' exit');
      const dist = new Map([[m.spawn.x + ',' + m.spawn.y, 0]]), q = [m.spawn];
      while (q.length) { const c = q.shift(); PW_DIRS.forEach(([dx, dy]) => { const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= n || y >= n || dist.has(x + ',' + y) || !open(x, y)) return; dist.set(x + ',' + y, dist.get(c.x + ',' + c.y) + 1); q.push({ x, y }); }); }
      const walkable = m.rows.join('').split('').filter(c => !SOLID_TERRAIN.includes(c)).length;
      if (dist.size !== walkable) bad.push(tag + ' unreachable ground');
      const d = dist.get(m.pwExit.x + ',0'); if (d == null) bad.push(tag + ' exit unreachable'); else stats.push(d);
      let dead = 0; for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) if (open(x, y) && PW_DIRS.filter(([dx, dy]) => open(x + dx, y + dy)).length === 1) dead++;
      if (dead < 2) bad.push(tag + ' too few dead ends ' + dead);
    }
    return { bad: bad.slice(0, 4), min: Math.min(...stats) };
  });
  assert.deepStrictEqual(mazes.bad, [], 'every maze can be solved: ' + JSON.stringify(mazes.bad)); assert.ok(mazes.min >= 14, 'and takes some finding: shortest way out ' + mazes.min);

  await enter('maze');
  const mz = await page.evaluate(() => {
    const w = pwActive(), d = state.districtData.pw, m = getMap('pw');
    const dead = d.items.every(i => pwFree(m, i.x, i.y) && Math.abs(i.x - m.spawn.x) + Math.abs(i.y - m.spawn.y) > 4);   // far from the start (usually a dead end)
    return { kind: w.kind, fog: !!document.querySelector('.pw-fog'), items: d.items.length, deadEnds: dead, treasure: d.items.filter(i => i.treasure).length, racers: d.racers.length, actors: document.querySelectorAll('.pw-actor').length,
      exit: Object.keys(m.exits), goal: document.getElementById('goalText').textContent, pos: state.playerPos, spawn: m.spawn, noSpirits: d.spirits.length === 0, pill: !document.getElementById('pillWorld').classList.contains('hidden') };
  });
  assert.ok(mz.kind === 'maze' && mz.fog && mz.items === 3 && mz.deadEnds && mz.treasure === 1 && mz.racers === 3 && mz.actors === 3 && mz.noSpirits, 'a maze: fog, three cards in dead ends, three racers: ' + JSON.stringify(mz));
  assert.ok(/way out of the maze/.test(mz.goal) && mz.exit.length === 1 && mz.pill, 'the goal pill, one exit and the timer');
  const taps = await page.evaluate(async () => {
    const m = getMap('pw'), d = state.districtData.pw, start = Object.assign({}, state.playerPos), out = {};
    // a far tile is refused: you cannot tap-walk to the exit, or anywhere you cannot see
    const ex = Object.keys(m.exits)[0].split(',').map(Number); handleMapTap(ex[0], ex[1] + 1); await new Promise(r => setTimeout(r, 400));
    out.farStayed = state.playerPos.x === start.x && state.playerPos.y === start.y; out.farMsg = townLog.textContent;
    // a neighbouring open tile is walked to
    const nb = PW_DIRS.map(([dx, dy]) => ({ x: start.x + dx, y: start.y + dy })).find(c => pwFree(m, c.x, c.y));
    handleMapTap(nb.x, nb.y); await new Promise(r => setTimeout(r, 900)); out.moved = state.playerPos.x === nb.x && state.playerPos.y === nb.y;
    // a racer answers when tapped
    const r0 = d.racers[0]; out.racerTap = pwHandleTap(Math.round(r0.x), Math.round(r0.y));
    return out;
  });
  assert.ok(taps.farStayed && /cannot see|not so simple/.test(taps.farMsg), 'a far tap is refused: ' + taps.farMsg); assert.ok(taps.moved, 'a near tap walks'); assert.ok(taps.racerTap, 'tapping a racer is used up');
  // the racers explore on their own; given time one of them gets out
  const race = await page.evaluate(() => {
    const w = pwActive(), d = state.districtData.pw; let now = Date.now(), steps = 0;
    const realToast = toast; toast = () => {};
    try { while (steps < 60000 && !d.racers.some(r => r.out)) { now += 700; pwMazeTick(w, now); steps++; } } finally { toast = realToast; }
    const out = d.racers.filter(r => r.out);
    return { out: out.length, names: w.outBy, steps, actorGone: out.every(r => !document.querySelector(`[data-pwid="${r.id}"]`)) };
  });
  assert.ok(race.out >= 1 && race.names.length === race.out && race.actorGone, 'a racer finds the way out on its own (' + race.steps + ' steps) and leaves the maze: ' + JSON.stringify(race));
  // her way out: the exit tile ends the world with a card and Embers (smaller when others got out first)
  const before = await page.evaluate(() => ({ cards: state.ownedCards.length, emb: state.progress.pebbles, outBy: pwActive().outBy.length }));
  await page.evaluate(() => { const m = getMap('pw'), ex = Object.keys(m.exits)[0].split(',').map(Number); state.playerPos = { x: ex[0], y: 1 }; crossExit(m.exits[ex[0] + ',' + ex[1]]); });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'));
  await until(() => state.ownedCards.length > 0 && !document.getElementById('pickupOverlay').classList.contains('hidden'), null, 6000);
  const after = await page.evaluate(() => ({ cards: state.ownedCards.length, emb: state.progress.pebbles, home: state.currentDistrict, world: pwActive(), fog: !!document.querySelector('.pw-fog'), layer: !!document.querySelector('.pw-layer'), wins: state.progress.totals.puddleWins }));
  assert.ok(after.home === 'square' && !after.world && !after.fog && !after.layer, 'out of the maze: back home, fog and actors gone'); assert.strictEqual(after.cards, before.cards + 1, 'a card for getting out');
  const expectEmb = before.outBy === 0 ? 10 : before.outBy === 1 ? 6 : before.outBy === 2 ? 4 : 3; assert.strictEqual(after.emb - before.emb, expectEmb, `Embers by place (${before.outBy} out before her)`); assert.strictEqual(after.wins, 1, 'counted as a win');
  await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  // first one out: the best reward
  await enter('maze');
  const first = await page.evaluate(async () => { const e0 = state.progress.pebbles, m = getMap('pw'), ex = Object.keys(m.exits)[0].split(',').map(Number); state.playerPos = { x: ex[0], y: 1 }; crossExit(m.exits[ex[0] + ',' + ex[1]]); return e0; });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx')); await until(f => state.progress.pebbles >= f + 10, first, 6000);
  assert.strictEqual(await page.evaluate(() => state.progress.pebbles), first + 10, 'first one out earns 10 Embers');
  await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));

  // ---- 3. ladders: the board is a real board, movement is only by dice, the rules work ----
  const boards = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 40; i++) {
      const w = { seed: 'b' + i, kind: 'ladders', size: [9, 12] }, m = pwBoardGenerate(w), b = w.board, N = b.cells.length, tag = 'seed' + i;
      if (N !== 39) bad.push(tag + ' cells ' + N);
      for (let k = 1; k < N; k++) if (Math.abs(b.cells[k][0] - b.cells[k - 1][0]) + Math.abs(b.cells[k][1] - b.cells[k - 1][1]) !== 1) { bad.push(tag + ' gap at ' + k); break; }
      if (b.cells.some(([x, y]) => m.rows[y][x] !== '=')) bad.push(tag + ' cell not a path');
      if (m.spawn.x !== b.cells[0][0] || m.spawn.y !== b.cells[0][1]) bad.push(tag + ' spawn');
      const ends = new Set(); let ladders = 0, snakes = 0;
      for (const [from, j] of Object.entries(b.jumps)) { const f = +from; ladders += j.t === 'ladder'; snakes += j.t === 'snake';
        if (j.t === 'ladder' ? !(j.to > f && j.to - f >= 6 && j.to <= N - 2) : !(j.to < f && f - j.to >= 6 && j.to >= 2)) bad.push(tag + ' bad jump ' + f + '>' + j.to); ends.add(f); ends.add(j.to); }
      if (ends.size !== Object.keys(b.jumps).length * 2) bad.push(tag + ' jumps share a square'); if (ladders !== 4 || snakes !== 4) bad.push(tag + ` ${ladders} ladders ${snakes} snakes`);
      if (Object.keys(b.spec).some(k => ends.has(+k) || +k < 3 || +k > N - 3)) bad.push(tag + ' special on a jump or the ends');
      if (Object.keys(b.spec).length !== 7) bad.push(tag + ' specials ' + Object.keys(b.spec).length);
    }
    return bad.slice(0, 4);
  });
  assert.deepStrictEqual(boards, [], 'every board is sound: ' + JSON.stringify(boards));
  await enter('ladders');
  const lad = await page.evaluate(async () => {
    const w = pwActive(), g = w.game, m = getMap('pw'), out = {};
    out.kind = w.kind; out.dice = !document.getElementById('pwDice').classList.contains('hidden'); out.players = g.n; out.rollOn = !document.getElementById('pwdRoll').disabled;
    out.bodyClass = document.body.classList.contains('pw-board'); out.pawns = document.querySelectorAll('.pw-pawn').length; out.nums = document.querySelectorAll('.ent.pw-num').length;
    const start = Object.assign({}, state.playerPos), t = { x: start.x + 2, y: start.y }; handleMapTap(t.x, t.y); await new Promise(r => setTimeout(r, 500));
    out.noWalk = state.playerPos.x === start.x && state.playerPos.y === start.y; out.msg = townLog.textContent;
    out.noItems = state.districtData.pw.items.length === 0; out.goalShown = getComputedStyle(document.getElementById('goalChip')).display; return out;
  });
  assert.ok(lad.kind === 'ladders' && lad.dice && lad.players >= 3 && lad.rollOn && lad.bodyClass && lad.pawns === lad.players - 1 && lad.nums === 39, 'a board with its dice panel, pawns and numbers: ' + JSON.stringify(lad));
  assert.ok(lad.noWalk && /roll the dice/i.test(lad.msg) && lad.goalShown === 'none', 'tapping the ground does not walk: ' + lad.msg);
  const play = async (who, v) => { await page.evaluate(([who, v]) => { const g = pwActive().game; g.turn = who; PWB.busy = false; pwBoardRoll(who, v); }, [who, v]); await until(([who]) => !PWB.busy && pwActive() && pwActive().game.turn !== who, [who]); return page.evaluate(() => { const g = pwActive().game; return { pos: g.pos.slice(), skip: g.skip.slice(), rank: g.rank.slice(), playerPos: Object.assign({}, state.playerPos) }; }); };
  const rules = {};
  await page.evaluate(() => { const w = pwActive(); w.board.jumps = {}; w.board.spec = {}; clearTimeout(PWB.timer); PWB.paused = true; });   // the neighbours wait while the rules are tried one by one
  let r = await play(0, 3); rules.plain = r.pos[0]; rules.onCell = JSON.stringify(r.playerPos) === JSON.stringify(await page.evaluate(() => pwBoardCell(pwActive(), 3)));
  await page.evaluate(() => { const w = pwActive(); w.game.pos[0] = 0; w.board.jumps = { 5: { to: 20, t: 'ladder' }, 12: { to: 4, t: 'snake' } }; });
  r = await play(0, 5); rules.ladder = r.pos[0];
  await page.evaluate(() => { pwActive().game.pos[0] = 6; }); r = await play(0, 6); rules.snake = r.pos[0];
  await page.evaluate(() => { const w = pwActive(); w.board.jumps = {}; w.board.spec = { 10: 'trap' }; w.game.pos[0] = 7; }); r = await play(0, 3); rules.trap = r.pos[0];
  await page.evaluate(() => { const w = pwActive(); w.board.spec = { 10: 'boost' }; w.game.pos[0] = 7; }); r = await play(0, 3); rules.boost = r.pos[0];
  await page.evaluate(() => { const w = pwActive(); w.board.spec = { 10: 'skip' }; w.game.pos[0] = 7; w.game.skip[0] = 0; }); r = await play(0, 3); rules.skipPos = r.pos[0]; rules.skipSet = r.skip[0];
  const cards0 = await page.evaluate(() => state.ownedCards.length);
  await page.evaluate(() => { const w = pwActive(); w.board.spec = { 10: 'gift' }; w.game.pos[0] = 7; w.game.skip[0] = 0; w.game.gifted = {}; }); r = await play(0, 3); await until(() => !document.getElementById('pickupOverlay').classList.contains('hidden'), null, 4000);
  rules.gift = await page.evaluate(c => state.ownedCards.length - c, cards0); await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  await page.evaluate(() => { const w = pwActive(); w.board.spec = {}; w.game.pos[0] = 37; }); r = await play(0, 4); rules.bounce = r.pos[0];
  assert.deepStrictEqual(rules, { plain: 3, onCell: true, ladder: 20, snake: 4, trap: 7, boost: 13, skipPos: 10, skipSet: 1, gift: 1, bounce: 35 }, 'the dice rules: ' + JSON.stringify(rules));
  await page.evaluate(() => { PWB.paused = false; });
  const npcs = await page.evaluate(async () => { const g = pwActive().game; g.pos = g.pos.map(() => 0); g.rank = []; g.skip = g.skip.map(() => 0); g.turn = 0; PWB.busy = false; pwBoardRoll(0, 2);
    await new Promise(r => setTimeout(r, 100)); return true; });
  await until(() => !PWB.busy && pwActive().game.turn === 0 && pwActive().game.pos.slice(1).every(p => p > 0), null, 15000);
  const turns = await page.evaluate(() => pwActive().game.pos.slice());
  assert.ok(turns[0] === 2 && turns.slice(1).every(p => p >= 1 && p <= 6), 'the neighbours take their own turns after hers: ' + JSON.stringify(turns));
  // an NPC reaches the flag first, then she does: second place
  await page.evaluate(() => { const g = pwActive().game; g.pos[1] = 37; g.turn = 1; PWB.busy = false; pwBoardRoll(1, 1); });
  await until(() => pwActive().game.rank.includes(1) && !PWB.busy, null, 8000);
  const placed = await page.evaluate(() => ({ rank: pwActive().game.rank.slice(), still: state.currentDistrict }));
  assert.deepStrictEqual(placed.rank, [1], 'a neighbour finishes first and the game goes on'); assert.strictEqual(placed.still, 'pw', 'she is still playing');
  const emb0 = await page.evaluate(() => state.progress.pebbles);
  await page.evaluate(() => { const g = pwActive().game; g.pos[0] = 37; g.turn = 0; PWB.busy = false; pwBoardRoll(0, 1); });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'));
  await until(e => state.progress.pebbles >= e + 6, emb0, 6000);
  const fin = await page.evaluate(() => ({ emb: state.progress.pebbles, dice: document.getElementById('pwDice').classList.contains('hidden'), cls: document.body.classList.contains('pw-board'), layer: !!document.querySelector('.pw-layer'), wins: state.progress.totals.puddleWins }));
  assert.strictEqual(fin.emb - emb0, 6, 'second place earns 6 Embers'); assert.ok(fin.dice && !fin.cls && !fin.layer, 'the board is cleaned away'); assert.strictEqual(fin.wins, 3, 'wins counted');
  await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  // a ladder climb (or any delayed move) still waiting on a timer when the world ends must not move her on the real map
  await enter('ladders');
  const stale = await page.evaluate(async () => {
    const w = pwActive(); PWB.paused = true; PWB.speed = 1; w.board.jumps = { 4: { to: 20, t: 'ladder' } }; w.game.pos[0] = 4;
    pwBoardLanded(w, 0); await new Promise(r => setTimeout(r, 150));          // the climb is announced and waiting 650 ms to happen
    pwLeave('left', true); const home = Object.assign({}, state.playerPos), district = state.currentDistrict;
    await new Promise(r => setTimeout(r, 1800)); PWB.speed = 0.04; PWB.paused = false;
    return { moved: JSON.stringify(state.playerPos) !== JSON.stringify(home), district: state.currentDistrict, was: district };
  });
  assert.ok(!stale.moved && stale.district === 'square' && stale.was === 'square', 'a late climb does nothing once the world is gone: ' + JSON.stringify(stale));
  // a restart mid-game carries on from the same squares; the timer running out ends it with nothing extra
  await enter('ladders');
  const keep = await page.evaluate(() => { const w = pwActive(); w.game.pos[0] = 9; w.game.pos[1] = 14; saveState(); flushSaveState(); loadState(); pwBoot();
    const c = pwBoardCell(pwActive(), 9); return { pos: pwActive().game.pos.slice(0, 2), on: state.playerPos.x === c.x && state.playerPos.y === c.y, panel: !document.getElementById('pwDice').classList.contains('hidden') }; });
  assert.deepStrictEqual(keep.pos, [9, 14], 'the squares survive a restart'); assert.ok(keep.on, 'and she is standing on hers');
  const cardsT = await page.evaluate(() => { PWB.speed = 1; return { c: state.ownedCards.length, e: state.progress.pebbles }; });
  await page.evaluate(() => { pwActive().endsAt = Date.now() - 1; pwTick(); });
  await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'));
  assert.deepStrictEqual(await page.evaluate(() => ({ c: state.ownedCards.length, e: state.progress.pebbles })), cardsT, 'running out of time earns nothing extra');
  await page.evaluate(() => { PWB.speed = 0.04; });

  // ---- 4. deep: a sunken city you swim through, with folk and fish ----
  const cities = await page.evaluate(() => {
    const bad = [], blds = []; let withHouses = 0;
    for (const size of [[19, 17], [21, 17], [19, 19], [21, 19]]) for (let i = 0; i < 10; i++) {
      const w = { seed: 'd' + i, kind: 'deep', size }, m = pwDeepGenerate(w), tag = `${size}/${i}`, [W, H] = size;
      if (m.rows.length !== H || m.rows.some(r => r.length !== W)) bad.push(tag + ' size');
      const solidAt = (x, y) => SOLID_TERRAIN.includes(m.rows[y][x]) || m.buildings.some(b => { const t = BUILDING_TYPES[b.type]; return x >= b.x && x < b.x + t.w && y >= b.y && y < b.y + t.h; }) || m.props.some(p => p.x === x && p.y === y);
      if (solidAt(m.spawn.x, m.spawn.y)) bad.push(tag + ' spawn');
      const seen = new Set([m.spawn.x + ',' + m.spawn.y]), q = [m.spawn]; while (q.length) { const c = q.shift(); PW_DIRS.forEach(([dx, dy]) => { const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= W || y >= H || seen.has(x + ',' + y) || solidAt(x, y)) return; seen.add(x + ',' + y); q.push({ x, y }); }); }
      let open = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solidAt(x, y)) open++;
      if (open !== seen.size) bad.push(tag + ' unreachable ground'); if (seen.size < 90) bad.push(tag + ' small ' + seen.size);
      m.buildings.forEach(b => { const t = BUILDING_TYPES[b.type], ex = b.x + t.door, ey = b.y + t.h; if (!seen.has(ex + ',' + ey)) bad.push(tag + ' door of ' + b.id + ' unreachable'); if (!b.locked) bad.push(tag + ' no locked text'); });
      blds.push(m.buildings.length); if (m.buildings.length) withHouses++;
      if (!m.props.some(p => p.type === 'fountain')) bad.push(tag + ' no fountain');
    }
    return { bad: bad.slice(0, 4), withHouses, total: blds.length };
  });
  assert.deepStrictEqual(cities.bad, [], 'every city is open and joined up: ' + JSON.stringify(cities.bad)); assert.ok(cities.withHouses >= cities.total * 0.6, 'most cities have houses: ' + cities.withHouses + '/' + cities.total);
  const stepBefore = await page.evaluate(() => STEP_MS);
  await enter('deep');
  const deep = await page.evaluate(() => {
    const w = pwActive(), d = state.districtData.pw, m = getMap('pw'), out = {};
    out.kind = w.kind; out.cls = townView.classList.contains('pw-deep'); out.slow = STEP_MS > 170; out.swim = !!(playerEl && playerEl.classList.contains('pw-swim')); out.abyss = ['pw-reef', 'pw-abyss'].includes(townView.dataset.biome);
    out.folk = d.folk.length; out.fish = d.fish.length; out.items = d.items.length; out.folkOk = d.folk.every(f => pwFree(m, f.x, f.y)); out.actors = document.querySelectorAll('.pw-actor').length;
    out.goal = document.getElementById('goalText').textContent; out.noSpirits = d.spirits.length === 0;
    const sky = document.querySelector('.town-sky'); out.skyHidden = !sky || getComputedStyle(sky).display === 'none';
    return out;
  });
  assert.ok(deep.kind === 'deep' && deep.cls && deep.slow && deep.swim && deep.abyss, 'underwater: palette, tint, slower swimming and a floating swimmer: ' + JSON.stringify(deep));
  assert.ok(deep.folk === 6 && deep.fish === 12 && deep.items === 6 && deep.folkOk && deep.actors === 18 && deep.noSpirits && deep.skyHidden, 'six folk, twelve fish, six hidden cards: ' + JSON.stringify(deep)); assert.ok(/sunken city/.test(deep.goal));
  const swim = await page.evaluate(() => {
    const w = pwActive(), d = state.districtData.pw, m = getMap('pw'), f0 = d.fish.map(f => [f.x, f.y]), home = d.folk.map(f => [f.hx, f.hy]); let now = Date.now(), moved = 0;
    for (let i = 0; i < 300; i++) { now += 3000; pwDeepTick(w, now, 0.2); }
    d.fish.forEach((f, i) => { if (Math.abs(f.x - f0[i][0]) + Math.abs(f.y - f0[i][1]) > 0.5) moved++; });
    return { moved, inBounds: d.fish.every(f => f.x >= 0.5 && f.x <= m.w - 1.4 && f.y >= 0.5 && f.y <= m.h - 1.4), folkNear: d.folk.every((f, i) => Math.abs(f.x - home[i][0]) + Math.abs(f.y - home[i][1]) <= 3 && pwFree(m, f.x, f.y)), folkMoved: d.folk.some((f, i) => f.x !== home[i][0] || f.y !== home[i][1]) };
  });
  assert.ok(swim.moved >= 10 && swim.inBounds, 'the fish swim around and stay in the sea: ' + JSON.stringify(swim)); assert.ok(swim.folkNear && swim.folkMoved, 'the folk wander near home, on open ground');
  const gifts = await page.evaluate(async () => {
    const d = state.districtData.pw, f = d.folk[0], c0 = state.ownedCards.length; pwFolkTalk(f); await new Promise(r => setTimeout(r, 1300)); const c1 = state.ownedCards.length;
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); pwFolkTalk(f); await new Promise(r => setTimeout(r, 1300)); return { first: c1 - c0, second: state.ownedCards.length - c1, given: f.given, tapUsed: pwHandleTap(d.folk[1].x, d.folk[1].y) };
  });
  assert.deepStrictEqual([gifts.first, gifts.second, gifts.given, gifts.tapUsed], [1, 0, true, true], 'each of the folk gives one gift, then only talks: ' + JSON.stringify(gifts));
  await page.evaluate(() => { cancelWalk(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); });
  await leaveQuiet();
  const gone = await page.evaluate(() => ({ step: STEP_MS, cls: townView.classList.contains('pw-deep'), layer: !!document.querySelector('.pw-layer'), swim: !!(playerEl && playerEl.classList.contains('pw-swim')), biome: townView.dataset.biome }));
  assert.strictEqual(gone.step, stepBefore, 'her pace is back to normal'); assert.ok(!gone.cls && !gone.layer && !gone.swim && gone.biome === 'meadow', 'and the sea is gone: ' + JSON.stringify(gone));

  // ---- 5. every kind: the world map cannot take her away, and nothing is left behind afterwards ----
  for (const kind of ['explore', 'maze', 'ladders', 'deep']) {
    await enter(kind);
    const blocked = await page.evaluate(() => { const shown = [], real = toast; toast = m => { shown.push(m); }; try { travelToDistrict('market'); } finally { toast = real; } return { stayed: state.currentDistrict, msg: shown.join('|') }; });
    assert.ok(blocked.stayed === 'pw' && /ripple holds you/i.test(blocked.msg), kind + ': travel is blocked');
    await page.evaluate(() => { pwActive().endsAt = Date.now() - 1; pwTick(); });
    await until(() => state.currentDistrict === 'square' && !pwActive() && !document.querySelector('.travel-fade, .warp-fx'));
    const clean = await page.evaluate(() => ({ layer: !!document.querySelector('.pw-layer'), fog: !!document.querySelector('.pw-fog'), dice: !document.getElementById('pwDice').classList.contains('hidden'), body: document.body.classList.contains('pw-board'), deep: townView.classList.contains('pw-deep'), step: STEP_MS, data: !!state.districtData.pw }));
    assert.deepStrictEqual(clean, { layer: false, fog: false, dice: false, body: false, deep: false, step: stepBefore, data: false }, kind + ': nothing left behind: ' + JSON.stringify(clean));
  }
};
