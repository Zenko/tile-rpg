// Companion AI: a mood from the sky and surroundings, shown and acted on only while you stand still, never onto a wall, door or neighbour.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, id = c => companionMoodId(Object.assign({ night: false, weather: 'clear', itemNear: null, friendNear: false }, c));
    out.moods = id({}) === 'playful' && id({ night: true }) === 'sleepy' && id({ weather: 'storm' }) === 'wary' && id({ weather: 'snow' }) === 'chilly' && id({ weather: 'rain' }) === 'cosy' && id({ weather: 'cloudy' }) === 'content' && id({ friendNear: true }) === 'friendly';
    out.priority = id({ itemNear: [{}], night: true, weather: 'storm' }) === 'alert' && id({ night: true, weather: 'storm' }) === 'sleepy';
    out.known = Object.keys(COMPANION_MOODS).every(k => COMPANION_MOODS[k].icon && COMPANION_MOODS[k].word);
    // a card companion beside you, in the open square
    WANDER.enabled = false;
    const m = getMap('square'), data = ensureDistrictData('square'); data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = []; data.chest = null;
    const free = (x, y) => m.reach[y][x] && !m.solid[y][x] && !m.entries[x + ',' + y] && !m.exits[x + ',' + y];
    let best = null, bd = 1e9; for (let y = 4; y < m.h - 4; y++) for (let x = 4; x < m.w - 4; x++) { const d = Math.abs(x - m.w / 2) + Math.abs(y - m.h / 2); if (d < bd && free(x, y)) { bd = d; best = { x, y }; } }
    state.playerPos = { x: best.x, y: best.y };
    state.companion = { kind: 'card', cardId: 'sprout', name: 'Sprout', icon: '🌱', bond: 40, perk: 'xp' }; state.companionPos = besidePlayer();
    renderEntities(data);
    const floats = []; const realFloat = companionFloat; companionFloat = e => floats.push(e);
    const T = 1700000000000; let acts = [], bad = 0, far = 0;
    state.sky.elapsedMs = DAY_LEN_MS * 0.5; state.weather.current = 'clear';
    // just moved: nothing happens
    CAI.pos = null; out.quietWhenMoving = companionAiTick(T) === '' && companionAiTick(T + 1000) === '';
    // standing still: it plays around (moves and mood emotes), always on a good tile near you
    for (let i = 1; i <= 400; i++) {
      const a = companionAiTick(T + 4000 + i * 3000); if (a) acts.push(a);
      const c = state.companionPos, p = state.playerPos;
      if ((c.x === p.x && c.y === p.y) || m.solid[c.y][c.x] || m.entries[c.x + ',' + c.y] || m.exits[c.x + ',' + c.y]) bad++;
      if (Math.abs(c.x - p.x) + Math.abs(c.y - p.y) > COMPANION_AI.wanderRadius + 1) far++;
    }
    out.moved = acts.includes('move'); out.emoted = acts.includes('emote') && floats.length > 0; out.bad = bad; out.far = far;
    // a night makes it sleepy: the emote is 💤
    floats.length = 0; state.sky.elapsedMs = DAY_LEN_MS * 0.02; CAI.nextAt = 0; companionAiTick(T + 9e6 + 4000); CAI.pos = { x: state.playerPos.x, y: state.playerPos.y }; CAI.posAt = T; CAI.nextAt = 0;
    for (let i = 0; i < 30 && !floats.includes('💤'); i++) { CAI.nextAt = 0; companionAiTick(T + 9e6 + 10000 + i * 20000); }
    out.sleepy = floats.includes('💤');
    // it points out a nearby item once (bond level 2+), not twice
    state.sky.elapsedMs = DAY_LEN_MS * 0.5; floats.length = 0; CAI.sensed = {};
    data.items = [{ id: 'i1', x: state.playerPos.x + 2, y: state.playerPos.y, cardId: 'sprout', collected: false }];
    CAI.pos = { x: state.playerPos.x, y: state.playerPos.y }; CAI.posAt = T; const first = companionAiTick(T + 5000), second = companionAiTick(T + 5000 + 20000);
    out.sensed = first === 'sense' && second !== 'sense';
    // a low bond does not point
    state.companion.bond = 0; CAI.sensed = {}; CAI.pos = { x: state.playerPos.x, y: state.playerPos.y }; CAI.posAt = T; out.lowBond = companionAiTick(T + 5000) !== 'sense'; state.companion.bond = 40;
    data.items = [];
    // it greets a friend who walks up, once in a while
    const f = { id: 'npc-square-0', name: 'Pal', x: state.playerPos.x + 1, y: state.playerPos.y + 1, homeX: 0, homeY: 0 }; data.npcs.push(f);
    friendsState()[neighborKey(f)] = { name: 'Pal', district: 'square', points: 12, icon: '🙂', sigDay: null, sigWins: 0, gift: false };
    floats.length = 0; CAI.greeted = {}; CAI.pos = { x: state.playerPos.x, y: state.playerPos.y }; CAI.posAt = T; const g1 = companionAiTick(T + 5000), g2 = companionAiTick(T + 6000);
    out.greet = g1 === 'greet' && g2 !== 'greet' && floats.includes('💞');
    // the mood shows when you pet it
    companionFloat = realFloat; out.line = /^Sprout seems /.test(companionMoodLine());
    return out;
  });
  Object.keys(r).forEach(k => { if (typeof r[k] === 'boolean') assert.ok(r[k], 'companion AI: ' + k); });
  assert.strictEqual(r.bad, 0, 'never on you, a wall or a door'); assert.strictEqual(r.far, 0, 'stays close to you');
};
