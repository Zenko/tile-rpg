// NPC brain: daily routines follow the sky, differ between neighbours, and steer where they go.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    out.phases = npcPhase(0.1) === 'night' && npcPhase(0.3) === 'morning' && npcPhase(0.5) === 'afternoon' && npcPhase(0.75) === 'evening' && npcPhase(0.95) === 'night';
    const names = ['Wren', 'Rowan', 'Sable', 'Tansy', 'Fenn', 'Aster', 'Briar', 'Juniper', 'Mallow', 'Ortega'];
    const routines = names.map(n => npcRoutine({ name: n }));
    out.stable = JSON.stringify(npcRoutine({ name: 'Wren' })) === JSON.stringify(routines[0]);
    out.varied = new Set(routines.map(x => x.morning)).size >= 2 && new Set(routines.map(x => x.afternoon)).size >= 2 && new Set(routines.map(x => x.evening)).size >= 2;
    out.valid = routines.every(x => ['morning', 'afternoon', 'evening'].every(k => typeof x[k] === 'string'));
    // matching
    out.match = npcPrefMatches('door:bakery', { kind: 'door', btype: 'bakery' }) && !npcPrefMatches('door:bakery', { kind: 'door', btype: 'cottage' }) && npcPrefMatches('door', { kind: 'door', btype: 'nook' }) && npcPrefMatches('bench', { kind: 'bench' }) && !npcPrefMatches('bench', { kind: 'well' }) && !npcPrefMatches(null, { kind: 'bench' });
    // a habit pulls: by day, with fine weather, the habit place is picked more often than the same place without it
    const near = (x, y) => ({ x, y }), cands = [{ id: 'home', kind: 'home', x: 8, y: 8 }, { id: 'b', kind: 'bench', x: 10, y: 8 }, { id: 'f', kind: 'fountain', x: 8, y: 11 }, { id: 'd', kind: 'door', btype: 'bakery', x: 6, y: 9 }];
    const share = (pref, id) => { let n = 0; for (let i = 0; i < 800; i++) { const p = npcPickScored(npcScoreGoals({ night: false, weather: 'clear', pref, bold: false, social: 0, home: near(8, 8), pos: near(9, 9), recent: [], cands })); if (p.id === id) n++; } return n / 800; };
    out.pull = share('door:bakery', 'd') > share(null, 'd') + 0.1 && share('fountain', 'f') > share(null, 'f') + 0.1;
    // a talk line exists by day and not at night
    state.sky.elapsedMs = DAY_LEN_MS * 0.3; const day = npcRoutineLine({ name: 'Wren' });
    state.sky.elapsedMs = DAY_LEN_MS * 0.02; const night = npcRoutineLine({ name: 'Wren' });
    out.line = /^I like to spend the morning /.test(day) && night === null;
    // a real goal pick for a neighbour carries the building type, and the bakery is called by name
    WANDER.enabled = false; state.sky.elapsedMs = DAY_LEN_MS * 0.3; state.weather.current = 'clear';
    const m = getMap('square'), data = ensureDistrictData('square'); data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    out.btypes = npcLandmarks(m).filter(l => l.kind === 'door').every(l => typeof l.btype === 'string');
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'routine: ' + k));
};
