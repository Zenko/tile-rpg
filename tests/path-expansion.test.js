// Path expansion (build 284): ten skill branches, Mastery ranks that cost two points, eight pieces of gear, and every new effect reaching its hook.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, near = (a, b) => Math.abs(a - b) < 1e-9;
    state.progress.skills = {}; state.progress.gear = {}; state.progress.level = 100; state.companion = null;
    out.branches = SKILL_BRANCHES.length; out.gear = GEAR.length;
    out.complete = SKILL_BRANCHES.every(b => b.mastery && b.mtext && [1, 2].every(m => typeof b.mtext(m) === 'string') && [1, 2, 3, 4, 5].every(r => typeof b.text(r) === 'string' && b.perks(r).length));
    out.gearText = GEAR.every(g => g.tiers.length === 3 && [1, 2, 3].every(t => typeof g.text(t) === 'string'));
    out.total = skillPointsTotal();
    // cost: ranks 1-5 one point each, then two each
    const costs = []; SKILL_BRANCHES[0] && (() => { const id = SKILL_BRANCHES[0].id; for (let i = 0; i < 8; i++) { const before = skillPointsSpent(); const ok = buySkill(id); costs.push(ok ? skillPointsSpent() - before : 0); } })();
    out.costs = costs.join(); out.rank = skillRank(SKILL_BRANCHES[0].id); out.spentAll = skillPointsSpent();
    // not enough points for a two-point rank
    state.progress.skills = { angler: 5 }; state.progress.level = 7;   // 6 points, 5 spent: 1 left
    out.oneLeft = skillPointsLeft(); out.blocked = buySkill('angler') === false && skillRank('angler') === 5;
    state.progress.level = 8; out.bought = buySkill('angler') && skillRank('angler') === 6 && skillPointsLeft() === 0;
    // the effects
    const fx = (id, rank) => { state.progress.skills = { [id]: rank }; return k => skillBonus(k); };
    let b = fx('angler', 7); out.fishPeb = b('fishPebbles');
    b = fx('baker', 5); out.baker = [b('bake'), b('breadPebbles')];
    b = fx('baker', 7); out.bakerM = b('breadPebbles');
    b = fx('player', 5); out.player = b('miniPebbles'); b = fx('player', 7); out.playerM = b('miniPebbles');
    b = fx('merchant', 5); out.merch = b('packDiscount'); b = fx('merchant', 7); out.merchM = b('packDiscount');
    b = fx('caretaker', 5); out.care = [b('bondRate'), b('giftEmbers')];
    b = fx('tactician', 1); out.tac1 = b('startHp'); b = fx('tactician', 2); out.tac2 = b('startHp'); b = fx('tactician', 5); out.tac5 = b('startHp'); b = fx('tactician', 7); out.tac7 = b('startHp');
    b = fx('stargazer', 5); out.star = b('starlight');
    // gear
    state.progress.skills = {}; state.progress.gear = { peel: 3, basket: 3, case: 3, boots: 3, glass: 3 };
    out.gearFx = [skillBonus('bake'), skillBonus('harvestPebbles'), skillBonus('winPebbles'), skillBonus('startSpirit'), skillBonus('xp'), skillBonus('bondRate'), skillBonus('starlight')].map(x => +x.toFixed(3)).join();
    // hooks
    state.progress.gear = {}; state.progress.skills = { merchant: 7 };
    const pack = PACKS.find(p => p.id === 'orchard'); const ev = eventIs('market-day') ? 0.8 : 1; out.packPrice = [Math.round(pack.cost * ev * 0.85), packPrice(pack)];
    state.progress.skills = {}; out.packPlain = packPrice(pack) === Math.round(pack.cost * ev);
    state.progress.skills = { stargazer: 5 }; state.progress.starlight = 0; const got = awardStarlight('pebble'), base = RELEASE_VALUE[cardDef('pebble').rarity]; out.starPay = [base, got];
    state.progress.skills = { caretaker: 5 }; state.companion = { kind: 'card', id: 'sprout', cardId: 'sprout', name: 'Sprout', icon: '🌱', perk: 'crops', since: Date.now(), bond: 0 }; companionGrow(10); out.bondGrew = state.companion.bond;
    state.progress.skills = {}; state.companion.bond = 0; companionGrow(10); out.bondPlain = state.companion.bond;
    state.companion = null;
    return out;
  });
  assert.strictEqual(r.branches, 10); assert.strictEqual(r.gear, 8); assert.ok(r.complete, 'every branch has ranks 1-5, two Mastery ranks and text'); assert.ok(r.gearText);
  assert.strictEqual(r.costs, '1,1,1,1,1,2,2,0', 'ranks 1-5 cost one point, Mastery I and II cost two, and there is nothing after: ' + r.costs);
  assert.strictEqual(r.rank, 7); assert.strictEqual(r.spentAll, 9, 'a fully mastered branch is 9 points');
  assert.strictEqual(r.oneLeft, 1); assert.ok(r.blocked, 'one spare point cannot buy a two-point rank'); assert.ok(r.bought, 'two can');
  assert.strictEqual(r.fishPeb, 2, 'Angler Mastery II: +2 per fish'); assert.deepStrictEqual(r.baker.map(x => +x.toFixed(2)), [0.25, 2]); assert.strictEqual(r.bakerM, 6);
  assert.strictEqual(r.player, 3); assert.strictEqual(r.playerM, 5); assert.ok(Math.abs(r.merch - 0.1) < 1e-9 && Math.abs(r.merchM - 0.15) < 1e-9, 'Merchant tops out at 15%: ' + r.merchM);
  assert.deepStrictEqual(r.care.map(x => +x.toFixed(2)), [0.5, 2]); assert.deepStrictEqual([r.tac1, r.tac2, r.tac5, r.tac7], [0, 1, 2, 4], 'Tactician: cost<=2, <=3, then every card at Mastery II');
  assert.ok(Math.abs(r.star - 0.5) < 1e-9);
  assert.strictEqual(r.gearFx, '0.24,2,1,1,0.09,0.15,0.3', 'the new gear reaches its stats: ' + r.gearFx);
  assert.strictEqual(r.packPrice[1], r.packPrice[0], 'a Midnight Pack at 15% off'); assert.ok(r.packPlain);
  assert.ok(r.starPay[1] > r.starPay[0], 'a duplicate pays more Starlight: ' + r.starPay); assert.ok(r.bondGrew > r.bondPlain, 'bond grows faster: ' + r.bondGrew + ' vs ' + r.bondPlain);

  // the screen: ten branches, a mastery button that says +2, and the head count
  await page.evaluate(() => { state.progress.level = 30; state.progress.skills = { angler: 5 }; state.progress.gear = {}; saveState(); switchTab('character'); charSetView('path'); });
  await page.waitForTimeout(300);
  const ui = await page.evaluate(() => ({ cards: document.querySelectorAll('[data-skill]').length, gear: document.querySelectorAll('[data-gear]').length, btn: document.querySelector('[data-skill="angler"]').textContent, aria: document.querySelector('[data-skill="angler"]').getAttribute('aria-label'), head: document.querySelector('.pt-head').textContent }));
  assert.strictEqual(ui.cards, 10); assert.strictEqual(ui.gear, 8); assert.strictEqual(ui.btn, '+2'); assert.ok(/Spend 2 points on Angler/.test(ui.aria), ui.aria);
  await page.click('[data-skill="angler"]');
  assert.strictEqual(await page.evaluate(() => skillRank('angler')), 6, 'a tap on the +2 button buys Mastery I');
  assert.ok(await page.evaluate(() => /Mastery I/.test(document.querySelector('.pt-card.mastered .pt-rank').textContent)));
};
