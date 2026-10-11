// NPC brain, stage 2: neighbours walk to goals (home, props, doors, each other), shaped by time of day and weather.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    WANDER.enabled = false;                                   // we drive the brain ourselves with a scripted clock
    const out = {}, m = getMap('square'), data = ensureDistrictData('square');
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    // ---- scoring: share of picks that are "home", by situation ----
    const near = (x, y) => ({ x, y });
    const cands = [{ id: 'home', kind: 'home', x: 8, y: 8 }, { id: 'b', kind: 'bench', x: 10, y: 8 }, { id: 'd', kind: 'door', x: 6, y: 9 }, { id: 'w', kind: 'well', x: 8, y: 11 }];
    const share = (ctx, kind) => { let n = 0; for (let i = 0; i < 600; i++) { const p = npcPickScored(npcScoreGoals(Object.assign({ bold: false, social: 0, home: near(8, 8), pos: near(9, 9), recent: [], cands }, ctx))); if (p.kind === kind) n++; } return n / 600; };
    out.nightHome = share({ night: true, weather: 'clear' }, 'home');
    out.dayHome = share({ night: false, weather: 'clear' }, 'home');
    out.dayProp = share({ night: false, weather: 'clear' }, 'bench') + share({ night: false, weather: 'clear' }, 'well');
    out.rainProp = share({ night: false, weather: 'rain' }, 'bench') + share({ night: false, weather: 'rain' }, 'well');
    out.rainShelter = share({ night: false, weather: 'rain' }, 'door') + share({ night: false, weather: 'rain' }, 'home');
    out.clearShelter = share({ night: false, weather: 'clear' }, 'door') + share({ night: false, weather: 'clear' }, 'home');
    // a sociable moment pulls towards a neighbour
    const withFriend = cands.concat([{ id: 'friend:x', kind: 'friend', x: 9, y: 11 }]);
    out.social = share({ night: false, weather: 'clear', social: 1, cands: withFriend }, 'friend') > share({ night: false, weather: 'clear', social: 0, cands: withFriend }, 'friend');
    // recently visited places are avoided
    let again = 0; for (let i = 0; i < 400; i++) { const p = npcPickScored(npcScoreGoals({ night: false, weather: 'clear', bold: false, social: 0, home: near(8, 8), pos: near(9, 9), recent: ['b'], cands })); if (p.id === 'b') again++; }
    out.recentAvoided = again / 400 < share({ night: false, weather: 'clear' }, 'bench');
    // ---- a real walk on the real map ----
    state.sky.elapsedMs = DAY_LEN_MS * 0.5; state.weather.current = 'clear';   // midday
    let spot = null, bd = 1e9;                                // the open tile nearest the middle of the map (corners can be chokepoints)
    for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
      const d = Math.abs(x - m.w / 2) + Math.abs(y - m.h / 2);
      if (d < bd && m.reach[y][x] && tileFreeForWander(m, data, x, y, {}) && stepOptionsFromSafe(x, y) >= 3) { bd = d; spot = { x, y }; }
    }
    function stepOptionsFromSafe(x, y) { return [[0, 1], [1, 0], [0, -1], [-1, 0]].filter(([dx, dy]) => tileFreeForWander(m, data, x + dx, y + dy, {})).length; }
    const f = { id: 'npc-square-0', name: 'Walker', x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, icon: '🙂' };
    data.npcs.push(f);
    const base = cutOffCount(m, data, f), seen = new Set(), goals = new Set(); let now = Date.now(), bad = 0, steps = 0, last = spot.x + ',' + spot.y;
    for (let i = 0; i < 600; i++) {
      now += 1000; f.nextMoveAt = 0; npcWanderTick(m, data, f, now);
      const k = f.x + ',' + f.y; if (k !== last) { steps++; last = k; }
      seen.add(k);
      if (m.solid[f.y][f.x] || m.entries[k] || (state.playerPos.x === f.x && state.playerPos.y === f.y)) bad++;
      if (f.mind && f.mind.recent) f.mind.recent.forEach(g => goals.add(g));
    }
    out.steps = steps; out.tiles = seen.size; out.bad = bad; out.goals = goals.size; out.intent = f.intent;
    out.cut = cutOffCount(m, data, f) <= base;
    // ---- night: it ends up at home and stays ----
    state.sky.elapsedMs = DAY_LEN_MS * 0.02; state.weather.current = 'clear';
    out.isNight = skyPhase().isNight;
    return out;
  });
  assert.ok(r.nightHome > 0.5, 'at night they mostly go home: ' + r.nightHome);
  assert.ok(r.dayHome < r.nightHome - 0.2, 'less so by day: ' + r.dayHome + ' vs ' + r.nightHome);
  assert.ok(r.dayProp > r.rainProp + 0.15, 'in fine weather they visit benches and wells more than in rain: ' + r.dayProp + ' vs ' + r.rainProp);
  assert.ok(r.rainShelter > r.clearShelter, 'rain sends them to doors and home: ' + r.rainShelter + ' vs ' + r.clearShelter);
  assert.ok(r.social, 'a sociable moment pulls them to a neighbour');
  assert.ok(r.recentAvoided, 'a place they just visited is less likely');
  assert.ok(r.steps > 40, 'it actually walks: ' + r.steps);
  assert.ok(r.tiles >= 8, 'and covers ground: ' + r.tiles);
  assert.ok(r.goals >= 2, 'to more than one place: ' + r.goals);
  assert.strictEqual(r.bad, 0, 'never on a solid tile, a door or the player');
  assert.ok(r.cut, 'never walls the village in');
  assert.ok(typeof r.intent === 'string' && r.intent.length > 0, 'it says what it is doing');
};
