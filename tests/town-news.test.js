// Town news (js/town-news.js): gossip, weather moments, the Dream Gazette, the town goal and travelling visitors.
module.exports = async (page, assert) => {
  /* ---- gossip ---- */
  const g = await page.evaluate(() => {
    const out = {};
    state.currentDistrict = 'square';
    const t = tnState(); t.deeds = [];
    const f = { id: 'npc-square-1', name: 'Gossa', x: 1, y: 1 }, h = { id: 'npc-square-2', name: 'Hearsay', x: 2, y: 2 };
    gossipNote('notAStat', 1); out.ignoresOthers = t.deeds.length === 0;
    gossipNote('fishCaught', 1); gossipNote('fishCaught', 1);
    out.merged = t.deeds.length === 1 && t.deeds[0].n === 2;
    const line = gossipLine(f); out.sameDistrict = /caught 2 fish/.test(line) && /(saw you|Was that you|saw you)/.test(line);
    out.onlyOnce = gossipLine(f) === null;
    out.othersStillTalk = /caught 2 fish/.test(gossipLine(h) || '');
    // a deed from another district is "heard", and names where
    t.deeds = [{ s: 'bossesWon', n: 1, d: 'market', at: Date.now(), told: [] }];
    const far = gossipLine(f); out.farAway = new RegExp(DISTRICTS.market.name).test(far) && /district god/.test(far);
    out.noBosses = gossipLine({ id: 'boss-square', name: 'Boss', isBoss: true }) === null;
    // bumpStat feeds it
    t.deeds = []; bumpStat('breadBaked', 1); out.viaBumpStat = t.deeds.length === 1 && t.deeds[0].s === 'breadBaked';
    // npcGreeting asks gossip first (the coin flip forced to heads)
    const rnd = Math.random; Math.random = () => 0.01;
    try { out.greeting = /baked a loaf/.test(npcGreeting({ id: 'npc-square-3', name: 'Third', x: 0, y: 0 }, 'FALLBACK')); } finally { Math.random = rnd; }
    // stale deeds are forgotten
    t.deeds = [{ s: 'fishCaught', n: 1, d: 'square', at: Date.now() - GOSSIP.freshMs - 1000, told: [] }];
    out.stale = gossipLine({ id: 'npc-square-4', name: 'Late', x: 0, y: 0 }) === null;
    return out;
  });
  Object.keys(g).forEach(k => assert.ok(g[k], 'gossip: ' + k));

  /* ---- weather moments ---- */
  const m = await page.evaluate(() => {
    const out = {}, t = tnState(); t.moment = null;
    state.weather.current = 'rain';
    out.none = momentNow() === null && weatherFx() === WEATHER_EFFECTS.rain;
    out.missedRoll = momentOnWeather('clear', 'rain', 0.99) === null;
    out.koi = momentOnWeather('clear', 'rain', 0.01) === 'koi-run';
    const fx = weatherFx();
    out.merged = Math.abs(fx.rareFish - WEATHER_EFFECTS.rain.rareFish * 2) < 1e-9 && Math.abs(fx.biteSpeed - WEATHER_EFFECTS.rain.biteSpeed * 0.8) < 1e-9 && fx.mendBonus === WEATHER_EFFECTS.rain.mendBonus;
    out.untouched = WEATHER_EFFECTS.rain.rareFish === 2.5;   // the table itself is never changed
    out.counted = (state.progress.totals.moments || 0) >= 1;
    state.weather.current = 'cloudy'; out.endsWithWeather = momentNow() === null && weatherFx() === WEATHER_EFFECTS.cloudy;
    // a rainbow only follows rain or a storm, and adds onto the clear-sky daily bonus
    state.weather.current = 'clear';
    out.noRainbowFromMist = momentOnWeather('cloudy', 'clear', 0.01) === null;
    out.rainbow = momentOnWeather('rain', 'clear', 0.01) === 'rainbow' && weatherFx().findMult === 1.5 && weatherFx().dailyBonus === WEATHER_EFFECTS.clear.dailyBonus;
    out.arc = !!townView.querySelector('.tn-rainbow');
    t.moment.ends = Date.now() - 1; out.expires = momentNow() === null;
    // mist lanterns add to the daily bonus instead of multiplying
    state.weather.current = 'cloudy'; momentOnWeather('rain', 'cloudy', 0.01); out.lanterns = weatherFx().dailyBonus === 2;
    t.moment = null;
    return out;
  });
  Object.keys(m).forEach(k => assert.ok(m[k], 'moments: ' + k));

  /* ---- the Dream Gazette ---- */
  const z = await page.evaluate(() => {
    const out = {}, days = [];
    for (let i = 1; i <= 60; i++) days.push('2026-03-' + String(i).padStart(2, '0'));
    const pages = days.map(d => gazetteToday(d));
    out.sameEachTime = JSON.stringify(gazetteToday('2026-03-05')) === JSON.stringify(gazetteToday('2026-03-05'));
    out.varies = new Set(pages.map(p => p.h)).size >= 8;
    out.filled = pages.every(p => !/[{}]/.test(p.h + p.b) && p.h.length > 5 && /^[A-Z“"]/.test(p.h));
    document.getElementById('testHideOverlays') && document.getElementById('testHideOverlays').remove();
    const before = state.progress.totals.papersRead || 0;
    out.unread = !gazetteRead();
    openGazette(); openGazette();
    out.readOnce = (state.progress.totals.papersRead || 0) === before + 1 && gazetteRead();
    out.shown = !document.getElementById('sceneryOverlay').classList.contains('hidden') && document.getElementById('sceneryDesc').textContent.includes(gazetteToday().h);
    document.getElementById('sceneryOverlay').classList.add('hidden');
    return out;
  });
  Object.keys(z).forEach(k => assert.ok(z[k], 'gazette: ' + k));

  /* ---- the town goal ---- */
  const c = await page.evaluate(() => {
    const out = {}, t = tnState(); t.comm = null;
    const goal = communityGoal(), st = communityState();
    out.weekly = communityGoal('2026-W10').id === communityGoal('2026-W10').id && st.wk === weekKey();
    out.startsAtZero = communityMine() === 0;
    // Saturday (when weekKey turns over) is the start of the week, Friday night the end
    out.satStart = communityWeekFrac(new Date(2026, 9, 10, 0, 30).getTime()) < 0.01;
    out.friEnd = communityWeekFrac(new Date(2026, 9, 16, 23, 0).getTime()) > 0.99;
    st.others = 0;
    state.progress.totals[goal.stat] = (state.progress.totals[goal.stat] || 0) + Math.ceil(goal.goal / 2);
    const tt = communityTotals(); out.mine = tt.mine === Math.ceil(goal.goal / 2) && tt.total >= tt.mine;
    out.claimHalf = communityClaimable();
    const peb = state.progress.pebbles; communityClaim();
    out.halfPaid = st.half && !st.full && state.progress.pebbles === peb + COMMUNITY.half;
    out.notTwice = !communityClaimable() || communityTotals().frac >= 1;
    st.others = goal.goal;   // other dreamers carry it over the line
    out.full = communityTotals().total === goal.goal && communityClaimable();
    const cards = state.ownedCards.length, peb2 = state.progress.pebbles; communityClaim();
    out.fullPaid = st.full && state.ownedCards.length === cards + 1 && state.progress.pebbles >= peb2 + COMMUNITY.full && /* a level-up from the goal's XP can add a few more */ (state.progress.totals.townGoals || 0) === 1;
    out.done = !communityClaimable();
    // With no cloud (offline, signed out), pushing and fetching must quietly do nothing. Switched off here rather than assumed:
    // on a CI runner with network, Firebase can sign in before this line runs.
    const wasReady = cloudReady; cloudReady = false;
    out.offlineOk = communityCloudOk() === false;
    communityPush(true); communityFetch(true);
    cloudReady = wasReady;
    document.getElementById('pickupOverlay').classList.add('hidden');
    return out;
  });
  Object.keys(c).forEach(k => assert.ok(c[k], 'town goal: ' + k));

  /* ---- the Journal and the weather board ---- */
  const j = await page.evaluate(() => {
    const out = {}, model = todayModel();
    out.group = model.groups[0].title === 'Town news' && model.groups[0].items.some(i => i.title === 'The Dream Gazette');
    out.daily = model.daily.every(i => i.title !== 'The Dream Gazette');   // the "x of y" ring only counts daily chores
    let ran = false; journalGo({ run: () => { ran = true; } }); out.run = ran;
    const row = (ico, label, title) => `[${label}:${title}]`;
    out.board = /Town goal/.test(townNewsBoardRows(row)) && /Dream Gazette/.test(townNewsBoardRows(row));
    switchTab('journal'); renderToday(); out.rendered = /Town news/.test(document.getElementById('todayList').textContent);
    switchTab('town');
    return out;
  });
  Object.keys(j).forEach(k => assert.ok(j[k], 'journal: ' + k));

  /* ---- visitors ---- */
  const v = await page.evaluate(() => {
    const out = {};
    ensureLevel().level = 5;
    out.lowLevel = (() => { ensureLevel().level = 1; const n = visitorToday('2026-04-01'); ensureLevel().level = 5; return n === null; })();
    // find a day of each kind (the schedule is seeded by the date)
    const days = []; for (let i = 1; i <= 90; i++) days.push(new Date(2026, 0, i).toISOString().slice(0, 10));
    const ped = days.find(d => (visitorToday(d) || {}).kind === 'pedlar'), wan = days.find(d => (visitorToday(d) || {}).kind === 'wanderer');
    out.some = !!ped && !!wan && days.filter(d => visitorToday(d)).length > 30 && days.filter(d => !visitorToday(d)).length > 10;
    window.__tnDay = ped; window.__realTodayKey = todayKey; window.todayKey = () => window.__tnDay;
    const pv = visitorToday();
    out.stock = pv.stock.length === 3 && pv.stock.every(s => cardDef(s.id) && !cardDef(s.id).exclusive);
    state.currentDistrict = pv.district;
    out.synced = syncVisitor() === true;
    const data = ensureDistrictData(pv.district), npc = data.npcs.find(n => n.isVisitor);
    out.placed = !!npc && npc.id === 'visitor-pedlar' && npc.name === VISITORS.pedlar.name;
    syncVisitor(); out.single = data.npcs.filter(n => n.isVisitor).length === 1;
    out.notBrained = !npcBrained(npc) && gossipLine(npc) === null;
    openTalk(npc);
    out.opened = !document.getElementById('sceneryOverlay').classList.contains('hidden') && /Moth/.test(document.getElementById('sceneryTitle').textContent) && talkTo === null;
    out.notMet = !metStore().npcs || !JSON.stringify(metStore().npcs).includes('Moth');
    document.getElementById('sceneryOverlay').classList.add('hidden');
    state.progress.pebbles = 10; const owned = state.ownedCards.length;
    pedlarBuy(0); out.tooPoor = state.ownedCards.length === owned && !visitState().sold[0];
    state.progress.pebbles = 1000; pedlarBuy(0); pedlarBuy(0);
    out.bought = state.ownedCards.length === owned + 1 && visitState().sold[0] && state.progress.pebbles === 1000 - pv.stock[0].price && (state.progress.totals.visitorBuys || 0) === 1;
    document.getElementById('pickupOverlay').classList.add('hidden');
    // the next day brings the Wanderer instead, and the Pedlar packs up
    window.__tnDay = wan; const wv = visitorToday();
    state.currentDistrict = wv.district; syncVisitor();
    const all = Object.keys(state.districtData).flatMap(k => state.districtData[k].npcs.filter(n => n.isVisitor).map(n => n.id));
    out.swapped = all.length === 1 && all[0] === 'visitor-wanderer';
    out.row = todayModel().groups[0].items.some(i => /Quill/.test(i.title));
    // a full deck for the match
    CARD_POOL.filter(c => !c.exclusive).slice(0, 40).forEach(c => state.ownedCards.push(c.id, c.id));
    state.deck = BattleEngine.suggestDeck(ownedCardCounts()); prefs.tossStyle = 'skip';
    wandererBattle(wv);
    return out;
  });
  Object.keys(v).forEach(k => assert.ok(v[k], 'visitors: ' + k));
  await page.waitForFunction(() => typeof inBattle !== 'undefined' && inBattle && battle && battle.npc && battle.npc.visitor, null, { timeout: 15000 });
  const intro = await page.evaluate(() => ({ deck: battle.G.p[1].deck.length + battle.G.p[1].hand.length >= 1, adaptive: !!battle.npc.adaptive }));
  assert.ok(intro.deck, 'the Wanderer brings a deck'); assert.ok(!intro.adaptive, 'a visitor is not a plain neighbour (no adaptive deck swap)');
  await page.evaluate(() => { battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); });
  await page.waitForFunction(() => !document.getElementById('battleEndOverlay').classList.contains('hidden'), null, { timeout: 15000 });
  const w = await page.evaluate(() => ({ beaten: visitState().beaten, wins: state.progress.totals.visitorWins || 0, title: document.getElementById('battleEndTitle').textContent }));
  assert.ok(w.beaten && w.wins === 1, 'beating the Wanderer counts once'); assert.ok(/tips their hat/.test(w.title), 'the visitor result window: ' + w.title);
  await page.evaluate(() => { closeBattle(); window.todayKey = window.__realTodayKey; });
};
