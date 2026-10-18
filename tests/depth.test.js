// Depth (build 286): the second lap. Locked until the four bosses are down and level 15; a Depth fight is a boss with a deeper deck, more Calm and its own rule; the first win pays, a repeat pays little.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    state.progress.depth = {}; state.progress.summons = { beaten: {}, done: {} }; state.progress.level = 20;
    out.lockedBosses = depthUnlocked(); out.lockText = depthLockText();
    Object.keys(DISTRICTS).forEach(d => noteGodBeaten(d)); state.progress.level = 10;
    out.lockedLevel = depthUnlocked(); state.progress.level = 20; out.open = depthUnlocked();
    // pure rules
    out.spirit = [0, 1, 3, 5].map(d => depthProfile(d, true).spirit); out.mods = [1, 2, 3, 4].map(d => JSON.stringify(depthMods('square', d)));
    const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe && !c.token), deck = depthDeck(pool, Math.random, 3, 'stone');
    out.deckLen = deck.length; out.deckOk = deck.every(id => !!BattleEngine.defOf(id));
    out.texts = Object.keys(DISTRICTS).every(d => DEPTH_RULE_TEXT[d].length === 2 && Object.keys(DEPTH_MODS).includes(d));
    out.pay = DEPTH_FIRST_CLEAR.slice(1).every(p => p.embers > 0 && p.starlight > 0 && RARITY_ORDER.includes(p.card));
    // the sheet and its chips
    state.deck = BattleEngine.suggestDeck(Object.fromEntries(CARD_POOL.filter(c => !c.exclusive).map(c => [c.id, 2])));
    state.progress.depth = { cleared: { square: 2 } };
    drawDepthSheet(); const chips = [...document.querySelectorAll('.dp-chip')].filter(c => c.dataset.d === 'square').map(c => (c.disabled ? 'x' : c.classList.contains('done') ? 'd' : c.classList.contains('next') ? 'n' : '?')).join('');
    out.chips = chips; out.cant = [startDepth('square', 5), startDepth('market', 2), startDepth('square', 0)];
    return out;
  });
  assert.strictEqual(r.lockedBosses, false, 'locked until the bosses are down: ' + r.lockText); assert.ok(/four district bosses/.test(r.lockText));
  assert.strictEqual(r.lockedLevel, false, 'and until level 15'); assert.ok(r.open);
  assert.deepStrictEqual(r.spirit, [20, 22, 26, 30]); assert.deepStrictEqual(r.mods, ['{}', '{"guardHp":1}', '{"guardHp":1}', '{"guardHp":1,"shieldHp":1}']);
  assert.strictEqual(r.deckLen, 12); assert.ok(r.deckOk && r.texts && r.pay);
  assert.strictEqual(r.chips, 'ddnxx', 'two cleared, the next open, the rest locked: ' + r.chips); assert.deepStrictEqual(r.cant, [false, false, false], 'you cannot skip a Depth');

  // starting a fight: the boss, the deck, the rule, the twist
  await page.evaluate(() => { state.progress.depth = { cleared: { square: 1 } }; prefs.tossStyle = 'skip'; startDepth('square', 2); });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (await page.evaluate(() => inBattle && battle && battle.G && !document.getElementById('mulliganOverlay').classList.contains('hidden'))) break; }
  const b = await page.evaluate(() => ({ depth: battle.npc.depth, boss: battle.npc.isBoss, name: battle.npc.name === BOSSES.square, spirit: battle.G.p[1].spirit - ((weatherFx().bossSpirit) || 0), mods: battle.G.mods.guardHp, deck: battle.G.p[1].deck.length + battle.G.p[1].hand.length, twist: !!battle.G.twist, chip: document.getElementById('btWeather').textContent.includes('Watch cards +1 health'), weekly: JSON.stringify(battle.G.mods).includes('weekFam') }));
  assert.ok(b.depth === 2 && b.boss && b.name, 'the district boss at Depth 2'); assert.strictEqual(b.spirit, 24, 'Depth 2: 24 Calm (snow adds its own bonus on top)'); assert.strictEqual(b.mods, 1, "the district's rule is in the match");
  assert.strictEqual(b.deck, 12); assert.ok(b.twist, 'the boss keeps its own twist'); assert.ok(b.chip, 'and the rule is shown: ' + JSON.stringify(b)); assert.ok(!b.weekly, "the week's rule does not apply to a Depth fight");

  // a first win pays and opens the next Depth; a repeat win pays a little
  const win = await page.evaluate(() => { const e0 = state.progress.pebbles, s0 = starlight(), c0 = state.ownedCards.length; battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); return new Promise(res => setTimeout(() => res({ cleared: depthCleared('square'), e: state.progress.pebbles - e0, s: starlight() - s0, c: state.ownedCards.length - c0, text: document.getElementById('battleEndStats').textContent }), 1200)); });
  assert.strictEqual(win.cleared, 2, 'Depth 2 is cleared'); assert.ok(win.e >= 80 && win.s === 20 && win.c === 1, 'the first clear pays 80 Embers, 20 Starlight and a card: ' + JSON.stringify(win));
  const again = await page.evaluate(async () => { closeBattle && closeBattle(); startBattleNow(depthOpponent('square', 2), 0); battle.G.over = true; battle.G.winner = 0; battle.G.events = []; const e0 = state.progress.pebbles, s0 = starlight(), c0 = state.ownedCards.length; btFinish(); await new Promise(r => setTimeout(r, 1200)); return { e: state.progress.pebbles - e0, s: starlight() - s0, c: state.ownedCards.length - c0, cleared: depthCleared('square') }; });
  assert.ok(again.e > 0 && again.e < 40 && again.s === 0 && again.c === 0 && again.cleared === 2, 'a repeat win pays a few Embers and nothing else: ' + JSON.stringify(again));

  // the Journal card
  await page.evaluate(() => { closeBattle && closeBattle(); document.querySelectorAll('.overlay').forEach(o => { if (o.id !== 'battleView') o.classList.add('hidden'); }); switchTab('journal'); document.getElementById('segBattles').click(); });
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => { const b = document.getElementById('depthOpenBtn'); return !!b && !b.disabled; }), 'the Battles page has a Dive button');

  // gear tier 4 needs a Depth in the tool's own district; the achievements and titles follow the clears
  const g = await page.evaluate(() => {
    const out = {}; state.progress.level = 25; state.progress.pebbles = 5000; state.progress.gear = { rod: 3, can: 3, lantern: 3 }; state.progress.depth = { cleared: { harbor: 1 } };
    const rod = GEAR.find(x => x.id === 'rod'); out.blocked = gearBlock(rod); out.bought = buyGear('rod');
    state.progress.depth = { cleared: { harbor: 2, garden: 1 } }; out.rodOk = gearBlock(rod) === ''; out.canBlocked = gearBlock(GEAR.find(x => x.id === 'can'));
    out.bought2 = buyGear('rod'); out.tier = gearTier('rod'); out.fishPeb = skillBonus('fishPebbles'); out.bite = +skillBonus('fish').toFixed(2);
    state.progress.achievements = []; state.progress.depth = { cleared: {} }; out.a0 = ACHIEVEMENTS.find(a => a.id === 'depth-1').test();
    state.progress.depth = { cleared: { garden: 5 } }; out.a1 = ACHIEVEMENTS.find(a => a.id === 'depth-1').test() && ACHIEVEMENTS.find(a => a.id === 'depth-5').test() && !ACHIEVEMENTS.find(a => a.id === 'depth-all').test();
    state.progress.depth = { cleared: { square: 5, market: 5, harbor: 5, garden: 5 } }; out.a2 = ACHIEVEMENTS.find(a => a.id === 'depth-all').test();
    out.titles = ['depth-1', 'depth-5', 'depth-all'].every(a => !!titleFor(a));
    return out;
  });
  assert.strictEqual(g.blocked, 'Needs Depth 2'); assert.strictEqual(g.bought, false, 'the Dream rod needs Depth 2 in the harbour'); assert.ok(g.rodOk && g.canBlocked === 'Needs Depth 2');
  assert.ok(g.bought2 && g.tier === 4 && g.fishPeb === 1 && g.bite === 0.18, 'tier 4 pays 1 Ember per fish and the bite speed stays at tier 3: ' + JSON.stringify(g));
  assert.ok(!g.a0 && g.a1 && g.a2 && g.titles, 'the achievements and their titles follow the clears');
};
