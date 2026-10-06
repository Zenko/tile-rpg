// Companions: who is allowed (level, owning the card, never the Atlas), neighbours and bosses leaving and returning to
// their district, Rook, bond kept per companion, the town menu, the Character page and the picker.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; });
    state.companion = null; state.companionPos = null; state.progress.bonds = {}; state.progress.met = {};
    state.progress.level = 1; state.ownedCards = ['sprout', 'sprout']; state.deck = [];
    ensureDistrictData('square'); saveState(); renderTown();
  });

  // ----- cards: level by rarity, must be owned, never the Atlas -----
  const cards = await page.evaluate(() => {
    const rare = CARD_POOL.find(c => c.rarity === 'rare' && !c.spell), spell = CARD_POOL.find(c => c.spell && c.rarity === 'common');
    const mythic = CARD_POOL.find(c => c.rarity === 'mythic' && !c.spell), atlas = CARD_POOL.find(c => c.rarity === 'atlas');
    state.ownedCards.push(rare.id, spell.id, mythic.id);
    const r = { common: companionBlock(cardEntry('sprout')), rareLow: companionBlock(cardEntry(rare.id)), unowned: companionBlock(cardEntry(CARD_POOL.find(c => c.rarity === 'common' && c.id !== 'sprout' && !state.ownedCards.includes(c.id)).id)),
      spellLow: companionBlock(cardEntry(spell.id)), mythicLow: companionBlock(cardEntry(mythic.id)), atlas: atlas ? companionBlock(cardEntry(atlas.id)) : 'The Atlas cannot walk with anyone',
      inRoster: companionRoster().cards.some(e => e.rarity === 'atlas') };
    state.progress.level = 12;
    r.rareOk = companionBlock(cardEntry(rare.id)); r.mythicOk = companionBlock(cardEntry(mythic.id)); r.spellOk = companionBlock(cardEntry(spell.id));
    r.ids = { rare: rare.id, spell: spell.id };
    return r;
  });
  assert.strictEqual(cards.common, '', 'a common card you own is open to everyone');
  assert.ok(/^Reach Lv 3/.test(cards.rareLow), cards.rareLow);
  assert.ok(/own this card/.test(cards.unowned), 'a card you do not own cannot join');
  assert.ok(/^Reach Lv 4/.test(cards.spellLow), 'spells need three more levels than their rarity: ' + cards.spellLow);
  assert.ok(/^Reach Lv 12/.test(cards.mythicLow), cards.mythicLow);
  assert.ok(/Atlas/.test(cards.atlas) && !cards.inRoster, 'the Atlas can never be a companion');
  assert.strictEqual(cards.rareOk + cards.mythicOk + cards.spellOk, '', 'at level 12 those are open');

  // ----- choosing, swapping and the bond that stays with each one -----
  const swap = await page.evaluate(ids => {
    chooseCompanion(cardEntry('sprout'));
    const first = state.companion && state.companion.cardId;
    companionGrow(13);                                      // past the first bond step
    const b1 = bondLevel(state.companion);
    chooseCompanion(cardEntry(ids.rare));
    const second = state.companion.cardId, b2 = bondLevel(state.companion);
    chooseCompanion(cardEntry('sprout'));
    return { first, second, b1, b2, back: bondLevel(state.companion), stored: !!state.progress.bonds['card:sprout'] };
  }, cards.ids);
  assert.strictEqual(swap.first, 'sprout'); assert.strictEqual(swap.second, cards.ids.rare);
  assert.strictEqual(swap.b1, 2); assert.strictEqual(swap.b2, 1, 'a new companion starts at the first bond step');
  assert.strictEqual(swap.back, 2, 'the bond comes back when you pick them again'); assert.ok(swap.stored);

  // ----- a neighbour: needs a higher level AND all five hearts, brings two perks, leaves their district and comes back -----
  const npc = await page.evaluate(() => {
    const d = ensureDistrictData('square'), n = d.npcs[0], before = d.npcs.length, key = 'square:' + n.name;
    noteMet(n); delete friendsState()[key];
    const e0 = () => companionRoster().neighbours.find(x => x.kind === 'npc' && x.name === n.name);
    const r = { name: n.name, before };
    state.progress.level = 7; friendsState()[key] = { name: n.name, district: 'square', points: 25, icon: '🙂' }; r.lowLevel = companionBlock(e0());
    state.progress.level = 8; friendsState()[key].points = 12; r.lowHearts = companionBlock(e0());
    state.progress.level = 1; r.both = companionBlock(e0());
    state.progress.level = 8; friendsState()[key].points = 25;
    r.open = companionBlock(e0());
    r.ok = chooseCompanion(e0());
    const c = state.companion;
    r.during = { inWorld: d.npcs.includes(n), count: d.npcs.length, kind: c.kind, perk: c.perk, perk2: c.perk2, perks: companionPerks(c).length, bond: bondLevel(c), stash: c.npc === n };
    r.talk = (() => { openTalk(companionNpcObj()); const shown = !document.getElementById('talkOverlay').classList.contains('hidden'); closeTalk(); return shown; })();
    releaseCompanion();
    r.back = d.npcs.includes(n); r.after = d.npcs.length;
    return r;
  });
  assert.ok(/^Reach Lv 8/.test(npc.lowLevel), npc.lowLevel);
  assert.ok(/^Needs 5 hearts \(you have 3\)/.test(npc.lowHearts), npc.lowHearts);
  assert.ok(/Lv 8 and 5 hearts/.test(npc.both), npc.both);
  assert.strictEqual(npc.open, '', 'Lv 8 and five hearts opens a neighbour'); assert.ok(npc.ok);
  assert.strictEqual(npc.during.inWorld, false, 'a walking neighbour leaves the district list'); assert.strictEqual(npc.during.count, npc.before - 1);
  assert.strictEqual(npc.during.kind, 'npc'); assert.strictEqual(npc.during.perk, 'xp'); assert.ok(npc.during.stash);
  assert.strictEqual(npc.during.perks, 2, 'a best friend brings a second perk'); assert.notStrictEqual(npc.during.perk2, npc.during.perk);
  assert.strictEqual(npc.during.bond, 2, 'and starts one bond step closer');
  assert.ok(npc.talk, 'you can still talk to a companion neighbour');
  assert.ok(npc.back && npc.after === npc.before, 'they go home when you part');

  // ----- a boss: much higher level, home ground only, and back again -----
  const boss = await page.evaluate(() => {
    const d = ensureDistrictData('square'), b = d.boss;
    noteMet(b);
    const e = companionRoster().bosses.find(x => x.id === 'square');
    state.progress.level = 11; const low = companionBlock(e); state.progress.level = 12;
    const ok = chooseCompanion(e);
    const r = { low, ok, gone: d.boss === null, bond: bondLevel(state.companion), away: false };
    state.currentDistrict = 'market'; r.away = !companionFightGate(state.companion.npc); state.currentDistrict = 'square';
    r.home = companionFightGate(state.companion.npc);
    releaseCompanion();
    r.back = d.boss === b;
    return r;
  });
  assert.ok(/^Reach Lv 12/.test(boss.low), boss.low); assert.ok(boss.ok); assert.ok(boss.gone, 'a walking boss leaves the district');
  assert.strictEqual(boss.bond, 2, 'a boss starts one step closer'); assert.ok(boss.away, 'bosses only duel at home'); assert.ok(boss.home);
  assert.ok(boss.back, 'the boss returns to the district');

  // ----- Rook: not placed in a district while he walks with you, and still duelable -----
  const rook = await page.evaluate(() => {
    const rv = rivalState(); rv.met = true; rv.chapter = 1; rv.awayUntil = 0; state.progress.totals.battlesWon = Math.max(1, state.progress.totals.battlesWon || 0);
    state.progress.level = 10;
    const ok = chooseCompanion(companionRoster().neighbours.find(x => x.kind === 'rival'));
    syncRival();
    const inTown = Object.values(state.districtData).some(d => d.npcs.some(n => n.isRival));
    const o = companionNpcObj();
    const r = { ok, inTown, isRival: !!(o && o.isRival), deck: !!(o && o.deck && o.deck.length) };
    rv.awayUntil = Date.now() + 60000; r.rebuilding = companionNpcObj() === null; rv.awayUntil = 0;
    releaseCompanion();
    return r;
  });
  assert.ok(rook.ok); assert.strictEqual(rook.inTown, false, 'Rook is not wandering the town while he walks with you');
  assert.ok(rook.isRival && rook.deck, 'Rook can still be talked to and duelled'); assert.ok(rook.rebuilding, 'and rests after a loss as usual');

  // ----- the hub: pat up to three times a day, look around, and every activity is offered -----
  const menu = await page.evaluate(() => {
    chooseCompanion(cardEntry('sprout'));
    state.companion.bond = 0; companionDay().pets = 0;
    const before = state.companion.bond; petCompanion(); petCompanion(); petCompanion(); petCompanion();
    const gained = state.companion.bond - before;
    const look = companionLookAround();
    openCompanionMenu();
    const labels = [...document.querySelectorAll('#companionHub .chb-act b')].map(b => b.textContent), quick = [...document.querySelectorAll('#companionHub .chb-quick button')].map(b => b.textContent);
    document.getElementById('companionHub').classList.add('hidden');
    return { gained, look: typeof look, labels, quick };
  });
  assert.strictEqual(menu.gained, 3, 'only three pats a day count');
  assert.ok(['Go for a walk', 'Calm together', 'Sit together', 'Spar', 'Play a game', 'Hide and seek', 'Companion page'].every(l => menu.labels.includes(l)), menu.labels.join('|'));
  assert.ok(menu.quick.some(q => /Chat/.test(q)) && menu.quick.some(q => /Pet/.test(q)) && menu.quick.some(q => /Look/.test(q)));

  // ----- the Character page and the picker -----
  await page.evaluate(() => { document.getElementById('testHideOverlays') && document.getElementById('testHideOverlays').remove(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('character'); charSetView('pals'); });
  await page.waitForTimeout(350);
  assert.ok(await page.locator('.cp-hero').isVisible(), 'the companion page should show the hero');
  await page.click('#cpChange'); await page.waitForTimeout(300);
  assert.ok(await page.locator('#companionPicker').isVisible(), 'the picker did not open');
  assert.ok(await page.locator('#cpList .cp-row').count() >= 1, 'the picker should list cards');
  await page.click('#cpTabs [data-cptab="bosses"]');
  assert.ok(await page.locator('#cpList').textContent() !== '', 'bosses tab renders');
  await page.click('#cpTabs [data-cptab="cards"]');
  const target = await page.locator('#cpList .cp-row:not(.cur):not(.lock)').first().getAttribute('data-cpkey');
  await page.locator('#cpList .cp-row:not(.cur):not(.lock)').first().click(); await page.waitForTimeout(250);
  assert.strictEqual(await page.evaluate(() => companionKey(state.companion)), target, 'tapping a row should choose it');
  assert.ok(!(await page.locator('#companionPicker').isVisible()), 'the picker should close');

  // ----- dueling a companion boss: same prize and rest as always, and they stay with you -----
  await page.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); state.progress.level = 12; state.currentDistrict = 'square'; const d = ensureDistrictData('square'); noteMet(d.boss); STARTER_CARDS.forEach(id => state.ownedCards.push(id)); state.deck = BattleEngine.suggestDeck(ownedCardCounts()); chooseCompanion(bossEntry('square')); state.companion.bond = 12; });
  const pre = await page.evaluate(() => { prefs.tossStyle = 'skip'; prefs.fast = true; const o = companionNpcObj(); window.__duel = { owned: state.ownedCards.length, wins: state.companion.wins || 0 }; interactWith('fight', o); return true; });
  await page.waitForTimeout(2500);
  const began = await page.evaluate(() => { const ok = !!(inBattle && battle); if (ok) { battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish(); } return ok; });
  await page.waitForTimeout(1200);
  const duel = await page.evaluate(() => {
    const o = companionNpcObj();
    const r = { started: true, defeated: o.defeated, prize: state.ownedCards.length === window.__duel.owned + 1, stays: !!state.companion && state.companion.npc === o, wins: (state.companion.wins || 0) - window.__duel.wins };
    closeBattle(false);
    r.rest = companionFightGate(o);
    return r;
  });
  duel.started = began;
  await page.waitForTimeout(1200);   // the battle screen closes on a short fade
  assert.ok(duel.started, 'the challenge should start a battle'); assert.ok(duel.defeated && duel.prize, 'a win pays out as usual ' + JSON.stringify(duel));
  assert.ok(duel.stays, 'the boss stays with you after a duel'); assert.strictEqual(duel.rest, false, 'and rests before the next one');
  assert.ok(duel.wins >= 1, 'a win together is counted');
  await page.evaluate(() => { releaseCompanion(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); });

  // ----- a wandering spirit: you must own its card and meet the level -----
  const spirit = await page.evaluate(() => {
    state.progress.level = 1; state.companion = null;
    const d = ensureDistrictData('square'); d.spirits = d.spirits || [];
    const rare = CARD_POOL.find(c => c.rarity === 'rare' && !c.spell && !state.ownedCards.includes(c.id));
    const sp = { id: 'sp-test', cardId: rare.id, x: 1, y: 1, homeX: 1, homeY: 1, story: 'A test spirit.' };
    d.spirits.push(sp);
    const oldBump = window.bumpStat, oldXP = window.addXP; window.bumpStat = () => {}; window.addXP = () => {};   // meeting a spirit pays a little XP, which could level you past the check
    const inv = document.getElementById('pickupInvite'), out = { inBattle, inScene };
    interactWith('spirit', sp); out.unowned = [inv.disabled, inv.textContent];
    state.ownedCards.push(rare.id); state.progress.level = 1; interactWith('spirit', sp); out.low = [inv.disabled, inv.textContent];
    state.progress.level = 3; interactWith('spirit', sp); out.ok = [inv.disabled, inv.textContent];
    inv.click(); out.joined = state.companion && state.companion.cardId === rare.id; out.removed = !d.spirits.includes(sp);
    window.bumpStat = oldBump; window.addXP = oldXP; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    return out;
  });
  assert.ok(!spirit.inBattle && !spirit.inScene, 'still in battle/scene ' + JSON.stringify(spirit));
  assert.ok(spirit.unowned[0] && /own this card/.test(spirit.unowned[1]), spirit.unowned.join(' '));
  assert.ok(spirit.low[0] && /Reach Lv 3/.test(spirit.low[1]), spirit.low.join(' '));
  assert.ok(!spirit.ok[0] && /Invite it along/.test(spirit.ok[1]), spirit.ok.join(' '));
  assert.ok(spirit.joined && spirit.removed, 'the invite should make it your companion and take it off the ground');

  // ----- asking a neighbour from their talk card -----
  const ask = await page.evaluate(() => {
    state.progress.level = 8; releaseCompanion(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    const d = ensureDistrictData('square'), n = d.npcs.find(x => !x.defeated); friendsState()['square:' + n.name] = { name: n.name, district: 'square', points: 25, icon: '🙂' };
    openTalk(n); const b = document.getElementById('talkCompanion'), r = { shown: !b.classList.contains('hidden'), enabled: !b.disabled };
    b.click(); r.joined = !!state.companion && state.companion.name === n.name; r.closed = document.getElementById('talkOverlay').classList.contains('hidden');
    releaseCompanion();
    return r;
  });
  assert.ok(ask.shown && ask.enabled && ask.joined && ask.closed, JSON.stringify(ask));

  // ----- an old save with a card companion and no kind still loads -----
  const old = await page.evaluate(() => { state.companion = { cardId: 'sprout', name: 'Sprout', icon: '🌱', perk: 'crops', since: Date.now() }; sanitizeCards(); return state.companion && companionKind(state.companion); });
  assert.strictEqual(old, 'card');
};
