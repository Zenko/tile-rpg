// NPC brain, stage 4: neighbours come over to you - rationed, optional, and they say why they came.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    WANDER.enabled = false;
    const out = {}, m = getMap('square'), data = ensureDistrictData('square');
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    storyScenes().seen.intro = true;
    const free = (x, y) => m.reach[y][x] && tileFreeForWander(m, data, x, y, {});
    // the player stands on open ground near the middle (the spawn tile is a dead end: a neighbour beside you there would shut the exit, so the safety rule refuses it)
    let best = null, bd = 1e9;
    for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) { const d = Math.abs(x - m.w / 2) + Math.abs(y - m.h / 2); if (d < bd && free(x, y) && [[0, 1], [1, 0], [0, -1], [-1, 0]].every(([dx, dy]) => free(x + dx, y + dy))) { bd = d; best = { x, y }; } }
    const p = state.playerPos = { x: best.x, y: best.y };
    // a neighbour a few tiles away on open ground, who can really get to you
    let spot = null;
    const probe = { id: 'npc-square-9', name: 'Probe', x: 0, y: 0 };
    for (let d = 4; d < 10 && !spot; d++) for (let dx = -d; dx <= d && !spot; dx++) for (const sy of [-1, 1]) {
      const x = p.x + dx, y = p.y + sy * (d - Math.abs(dx));
      if (y < 2 || y >= m.h - 1 || x < 2 || x >= m.w - 1 || !free(x, y)) continue;
      probe.x = x; probe.y = y; data.npcs.length = 0; data.npcs.push(probe);
      if (npcApproachFeasible(probe, data)) { spot = { x, y }; break; }
    }
    data.npcs.length = 0;
    const f = { id: 'npc-square-0', name: 'Visitor', x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, icon: '🙂' };
    data.npcs.push(f);
    renderEntities(data);
    state.deck = CARD_POOL.slice(0, 12).map(c => c.id); state.progress.requests = null; state.progress.chats = null; state.progress.approaches = null;
    const T = Date.now(), still = t => { NPC_APP.pos = { x: p.x, y: p.y }; NPC_APP.posAt = t - 10000; };
    const realRandom = Math.random;
    // ---- Never: nobody comes, however long you stand there ----
    prefs.approach = 'off'; Math.random = () => 0; NPC_APP.cur = null; NPC_APP.last = 0; NPC_APP.checkAt = 0;
    for (let i = 1; i <= 20; i++) { still(T + i * 9000); npcApproachTick(data, T + i * 9000); }
    out.offQuiet = NPC_APP.cur === null;
    // ---- Sometimes: nobody comes while you are walking ----
    prefs.approach = 'sometimes'; NPC_APP.checkAt = 0; NPC_APP.pos = { x: p.x + 1, y: p.y }; NPC_APP.posAt = T + 200000;   // "just moved"
    npcApproachTick(data, T + 200000 + 100); out.walkingQuiet = NPC_APP.cur === null;
    // ---- ...but when you stand still, one comes ----
    still(T + 300000); NPC_APP.checkAt = 0; NPC_APP.last = 0; npcApproachTick(data, T + 300000);
    out.started = !!NPC_APP.cur && NPC_APP.cur.id === f.id; out.kind = NPC_APP.cur && NPC_APP.cur.kind; out.today = npcApproachToday().n;
    out.kindOk = ['help', 'social', 'match'].includes(out.kind);
    // ---- they walk over, stop beside you, and a marker appears ----
    let now = T + 300000, steps = 0;
    for (let i = 0; i < 120 && !npcNextToPlayer(f); i++) { now += 800; f.nextMoveAt = 0; npcWanderTick(m, data, f, now); steps++; }
    out.arrived = npcNextToPlayer(f);
    now += 800; npcWanderTick(m, data, f, now); npcApproachTick(data, now + 400);
    out.waiting = NPC_APP.cur && NPC_APP.cur.phase === 'waiting';
    out.marker = !!(entityElsById.get(f.id) && entityElsById.get(f.id).querySelector('.ent-ask'));
    out.notOnPlayer = !(f.x === p.x && f.y === p.y);
    // ---- only one at a time, and a pause before the next ----
    const g = { id: 'npc-square-1', name: 'Second', x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, icon: '🙂' }; data.npcs.push(g);
    still(now); NPC_APP.checkAt = 0; npcApproachTick(data, now + 500);
    out.onlyOne = NPC_APP.cur.id === f.id;
    // ---- tapping them accepts: the marker goes and their talk screen says why ----
    const kind = NPC_APP.cur.kind;
    npcApproachAccepted(f);
    out.accepted = NPC_APP.cur === null && f.approach.kind === kind;
    out.markerGone = !entityElsById.get(f.id).querySelector('.ent-ask');
    out.greeting = typeof npcGreeting(f, 'FALLBACK') === 'string' && npcGreeting(f, 'FALLBACK') !== 'FALLBACK';
    if (kind === 'help') out.requestReady = !!reqState().list[f.id];
    // ---- the pause: nobody new for a while, then the daily cap ----
    Math.random = () => 0; still(now + 20000); NPC_APP.checkAt = 0; npcApproachTick(data, now + 20000); out.paused = NPC_APP.cur === null;
    npcApproachToday().n = NPC_APPROACH.daily.sometimes; still(now + 900000); NPC_APP.checkAt = 0; npcApproachTick(data, now + 900000); out.capped = NPC_APP.cur === null;
    // ---- ignoring them: they give up politely and rest longer ----
    npcApproachToday().n = 0; g.mind = null; f.mind = null; NPC_APP.last = 0;
    data.npcs.splice(1, 1); f.approach = null; f.x = spot.x; f.y = spot.y;     // back where they started, so they have to walk over again
    still(now + 1000000); NPC_APP.checkAt = 0; npcApproachTick(data, now + 1000000);
    out.again = !!NPC_APP.cur;
    if (NPC_APP.cur) { const c = NPC_APP.cur; f.x = p.x + 1; f.y = p.y; c.phase = 'waiting'; c.since = now + 1000000 - NPC_APPROACH.waitMs - 10; const who = data.npcs.find(n => n.id === c.id); npcApproachTick(data, now + 1000000 + 100); out.gaveUp = NPC_APP.cur === null && npcMind(who).approachAt > now + 1000000 + NPC_APPROACH.perNpcMs; }
    Math.random = realRandom;
    return out;
  });
  assert.ok(r.offQuiet, 'Never means never');
  assert.ok(r.walkingQuiet, 'nobody comes while you are walking');
  assert.ok(r.started && r.kindOk, 'standing still, one comes: ' + r.kind);
  assert.strictEqual(r.today, 1, 'the day is counted');
  assert.ok(r.arrived, 'they walk all the way over');
  assert.ok(r.waiting && r.marker && r.notOnPlayer, 'and wait beside you with a marker');
  assert.ok(r.onlyOne, 'only one neighbour at a time');
  assert.ok(r.accepted && r.markerGone && r.greeting, 'tapping accepts, and they say why they came');
  if (r.kind === 'help') assert.ok(r.requestReady, 'a favour is ready');
  assert.ok(r.paused, 'a pause follows a visit'); assert.ok(r.capped, 'and there is a daily cap');
  assert.ok(r.again && r.gaveUp, 'if ignored they give up politely and rest longer');
};
