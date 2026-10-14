// js/shop-economy.js (build 261): a craft earns XP, can fail into Embers with a fail meter that raises what a fail pays, and a
// crafting companion (the 'craft' perk) halves the fails, adds XP and skill chance and can make the card Reborn.
module.exports = async (page, assert) => {
  const setup = () => page.evaluate(() => {
    Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; });
    state.companion = null; state.progress.craftMeter = 0;
    const commons = CARD_POOL.filter(c => c.rarity === 'common' && !c.spell && !c.exclusive && !c.crafted).slice(0, 8);
    state.ownedCards = []; commons.forEach(c => state.ownedCards.push(c.id, c.id, c.id, c.id)); state.deck = [];
    window.__xp = []; if (!window.__realAddXP) window.__realAddXP = addXP; addXP = a => { window.__xp.push(a); window.__realAddXP(a); };
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    return commons.map(c => c.id);
  });
  // rng that hands out the given numbers in order, then 0.99
  const seq = 'list => { let i = 0; return () => (i < list.length ? list[i++] : 0.99); }';

  // ---- 1. a successful refine: XP through bumpStat (6, +9 with a skill), the meter stays empty ----
  const ids = await setup();
  const ok = await page.evaluate(([id, seq]) => {
    const rng = eval(seq)([0.99, 0.0, 0.0]);   // no fail, then a skill
    const c0 = state.progress.totals.crafts || 0, r = refineCard(id, 'p', rng);
    return { r, xp: window.__xp.slice(), crafts: (state.progress.totals.crafts || 0) - c0, meter: state.progress.craftMeter };
  }, [ids[0], seq]);
  assert.ok(ok.r && !ok.r.failed && ok.r.skill, 'refined, with a skill: ' + JSON.stringify(ok.r));
  assert.ok(ok.xp.includes(6) && ok.xp.includes(9), 'XP for the craft and the skill: ' + JSON.stringify(ok.xp));
  assert.deepStrictEqual([ok.crafts, ok.meter], [1, 0], 'counted, meter empty');

  // ---- 2. fails: the cards are used up, Embers instead, the meter fills and each fail pays more, up to the cap ----
  const fails = await page.evaluate(([ids, seq]) => {
    const out = [];
    for (let i = 1; i <= 5; i++) {
      const id = ids[i], peb = state.progress.pebbles, n = state.ownedCards.filter(c => c === id).length;
      const r = refineCard(id, 'p', eval(seq)([0.0]));
      out.push({ failed: !!(r && r.failed), paid: r.pebbles, gained: state.progress.pebbles - peb, lost: n - state.ownedCards.filter(c => c === id).length, meter: state.progress.craftMeter });
    }
    return { out, fails: state.progress.totals.craftFails || 0, full: state.progress.totals.craftMeterFull || 0, ach: state.progress.achievements.includes('craft-fail') };
  }, [ids, seq]);
  assert.ok(fails.out.every(f => f.failed && f.lost === 2), 'every forced roll fails and uses up both cards');
  assert.deepStrictEqual(fails.out.map(f => f.meter), [1, 2, 3, 4, 4], 'the meter fills and stops at 4');
  assert.deepStrictEqual(fails.out.map(f => f.paid), [6, 8, 10, 12, 12], 'each fail in a row pays more (x1.5 .. x3 of 4)');
  assert.ok(fails.out.every(f => f.gained >= f.paid), 'and the Embers arrive (a level-up from the XP can add more)');
  assert.ok(fails.fails >= 5 && fails.full >= 1 && fails.ach, 'counted, the full meter noted, and the first-fail milestone');

  // ---- 3. a success empties the meter ----
  const reset = await page.evaluate(([id, seq]) => { const r = refineCard(id, 'g', eval(seq)([0.99, 0.99])); return { ok: !!r && !r.failed, meter: state.progress.craftMeter }; }, [ids[6], seq]);
  assert.deepStrictEqual(reset, { ok: true, meter: 0 }, 'a success empties the fail meter');

  // ---- 4. trade-ups fail too, and never when losing the cards would leave too few for a deck ----
  await setup();
  const trade = await page.evaluate(seq => {
    CRAFT.tradeFail = 0.2;
    const picks = state.ownedCards.slice(0, 3), peb = state.progress.pebbles, n = state.ownedCards.length;
    const r = tradeUp(picks, eval(seq)([0.0]));
    return { failed: !!(r && r.failed), lost: n - state.ownedCards.length, paid: r.pebbles };
  }, seq);
  assert.deepStrictEqual([trade.failed, trade.lost], [true, 3], 'a trade-up can crack, using up its three cards');
  assert.ok(trade.paid >= 6, 'and pays for them');

  // ---- 5. a crafting companion: half the fails, more skill chance, more XP, and a chance of Reborn ----
  const helped = await page.evaluate(([ids, seq]) => {
    const seedCard = CARD_POOL.find(c => !c.spell && c.kw[0] === 'seed');
    const base = { refineFail: craftFailChance('refine'), tradeFail: craftFailChance('trade'), skill: craftSkillChance('refine') };
    state.companion = { kind: 'card', cardId: seedCard.id, name: seedCard.name, icon: seedCard.icon, perk: companionPerkFor(seedCard.id), perk2: null, level: 1 };
    const now = { perk: state.companion.perk, has: hasPerk('craft'), refineFail: craftFailChance('refine'), tradeFail: craftFailChance('trade'), skill: craftSkillChance('refine') };
    state.ownedCards.push(ids[7], ids[7]); window.__xp = [];
    const id = ids[7], r = refineCard(id, 'p', eval(seq)([0.99, 0.99, 0.0]));   // no fail, no skill, then the Reborn roll hits
    return { base, now, r, xp: window.__xp.slice(), reborn: foilCount(r.id) > 0, helped: state.progress.totals.craftsHelped || 0 };
  }, [ids, seq]);
  assert.strictEqual(helped.now.perk, 'craft', 'a Seed card lends the craft perk');
  assert.ok(Math.abs(helped.now.refineFail - helped.base.refineFail / 2) < 1e-9 && Math.abs(helped.now.tradeFail - helped.base.tradeFail / 2) < 1e-9, 'half the fails');
  assert.ok(Math.abs(helped.now.skill - helped.base.skill * 1.5) < 1e-9, 'half again the skill chance');
  assert.ok(helped.xp.includes(6) && helped.xp.includes(3), 'the craft XP plus half again: ' + JSON.stringify(helped.xp));
  assert.ok(helped.reborn && helped.helped >= 1, 'the crafted card came out Reborn');

  // ---- 5b. the chances follow rarity: commoner cards gain skills more and crack less (build 264) ----
  const rar = await page.evaluate(() => {
    const keep = state.companion; state.companion = null; const rs = CRAFT_RARITIES, out = {};
    ['refine', 'trade'].forEach(k => { out[k] = { skill: rs.map(r => craftSkillChance(k, r)), fail: rs.map(r => craftFailChance(k, r)) }; });
    // a roll of 0.08 cracks an ultra refine (15%) but not a common one (6%)
    const com = CARD_POOL.find(c => c.rarity === 'common' && !c.spell && !c.exclusive && !c.crafted), ult = CARD_POOL.find(c => c.rarity === 'ultra' && !c.spell && !c.exclusive && !c.crafted);
    state.ownedCards.push(com.id, com.id, ult.id, ult.id); state.progress.craftMeter = 0;
    const one = id => { let i = 0; const l = [0.08, 0.99, 0.99]; return refineCard(id, 'p', () => (i < l.length ? l[i++] : 0.99)); };
    const res = { out, common: !!one(com.id).failed, ultra: !!one(ult.id).failed }; state.companion = keep; return res;
  });
  ['refine', 'trade'].forEach(k => {
    const { skill, fail } = rar.out[k];
    assert.ok(skill.every((v, i) => i === 0 || v < skill[i - 1]), `${k}: the skill chance falls as the rarity rises: ${skill}`);
    assert.ok(fail.every((v, i) => i === 0 || v > fail[i - 1]), `${k}: the fail chance rises with the rarity: ${fail}`);
  });
  assert.deepStrictEqual([rar.common, rar.ultra], [false, true], 'the same roll holds for a common and cracks an ultra');

  // ---- 6. the Workshop shows the odds and the meter ----
  const ui = await page.evaluate(() => { state.progress.craftMeter = 2; craftMode = 'refine'; switchTab('collection'); setCardsView('craft'); renderCraft();
    return { fail: !!document.querySelector('#craftView .cr-meter.fail'), pips: document.querySelectorAll('#craftView .cr-pips i.on').length, help: !!document.querySelector('#craftView .cr-help'), rows: document.querySelectorAll('#craftView .cr-rarodds .cr-ro').length, lit: document.querySelectorAll('#craftView .cr-rarodds .cr-ro.on').length }; });
  assert.deepStrictEqual(ui, { fail: true, pips: 2, help: true, rows: 5, lit: 1 }, 'fail chance, two lit pips, the companion\'s note and the chances for every rarity, the forge card\'s lit');

  await page.evaluate(() => { addXP = window.__realAddXP; state.companion = null; state.progress.craftMeter = 0; CRAFT.tradeFail = 0.2; CRAFT.refineFail = 0.15; switchTab('town'); });
};
