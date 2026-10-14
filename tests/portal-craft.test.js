// js/portal-craft.js (build 266): feed spare rare-or-better cards to charge the rift, ignite a full charge at the forge for a
// chance of a portal stone (better overcharged and with a better forge; a fizzle keeps half), attuned to the family that fed it
// most. A stone opens a portal right beside you, even during the puddle-world cooldown.
module.exports = async (page, assert) => {
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 8000 }).catch(() => {});
  const seq = 'list => { let i = 0; return () => (i < list.length ? list[i++] : 0.99); }';
  const ids = await page.evaluate(() => {
    state.progress.level = 5; state.progress.portal = null; state.progress.portalForge = null; state.progress.pwEndedAt = 0; prefs.cozy = false;
    const pickFam = (r, fam, n) => CARD_POOL.filter(c => c.rarity === r && !c.spell && !c.exclusive && !c.crafted && CARD_FAMILY[c.id] === fam).slice(0, n).map(c => c.id);
    const fams = Object.keys(FAMILIES), a = fams[0], b = fams[1];
    const rares = pickFam('rare', a, 2), ultra = pickFam('ultra', b, 1), common = CARD_POOL.find(c => c.rarity === 'common' && !c.spell && !c.exclusive).id;
    const fill = CARD_POOL.filter(c => c.rarity === 'common' && !c.spell && !c.exclusive && !c.crafted).slice(0, 8).map(c => c.id);
    state.ownedCards = []; fill.forEach(id => state.ownedCards.push(id, id, id, id)); state.deck = [];
    rares.forEach(id => state.ownedCards.push(id, id, id, id, id, id)); ultra.forEach(id => state.ownedCards.push(id, id, id, id));
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    return { rares, ultra: ultra[0], common, a, b };
  });

  // ---- 1. only rare or better charges it; a card adds its rarity's charge and leans the rift to its family ----
  const f1 = await page.evaluate(i => {
    const out = { common: portalFeedBlock(i.common), n0: ownedCardCounts()[i.rares[0]] };
    out.r = feedPortal(i.rares[0]); out.u = feedPortal(i.ultra); out.n1 = ownedCardCounts()[i.rares[0]];
    out.charge = portalForge().charge; out.att = portalAttunement();
    return out;
  }, ids);
  assert.ok(/rare cards or better/.test(f1.common), 'a common is too faint: ' + f1.common);
  assert.deepStrictEqual([f1.r.added, f1.u.added, f1.charge, f1.n0 - f1.n1], [1, 3, 4, 1], 'a rare adds 1, an ultra 3, and the card is used up');
  assert.strictEqual(f1.att.family, ids.b, 'the ultra\'s family fed it most');

  // ---- 2. not full: no ignite. Full: 50%, rising with the overcharge and the forge; capped ----
  const ch = await page.evaluate(i => {
    const out = { early: ignitePortal('rough', () => 0) };
    while (portalForge().charge < PORTAL_CRAFT.need) feedPortal(i.rares[portalForge().charge % 2]);
    out.full = { rough: portalIgniteChance('rough'), flawless: portalIgniteChance('flawless'), botched: portalIgniteChance('botched') };
    portalForge().charge = 15; out.over = portalIgniteChance('rough');
    portalForge().charge = 99; out.capped = portalIgniteChance('rough');
    portalForge().charge = PORTAL_CRAFT.need;
    return out;
  }, ids);
  assert.strictEqual(ch.early, false, 'an uncharged rift cannot be ignited');
  assert.deepStrictEqual(ch.full, { rough: 0.5, flawless: 0.75, botched: 0.4 }, 'a full charge is 50%, the forge moves it');
  assert.ok(Math.abs(ch.over - 0.75) < 1e-9 && ch.capped === 1, 'overcharging raises it, to certain at the cap');

  // ---- 3. a fizzle keeps half the charge; a success makes a stone of the attuned family and empties the rift ----
  const ig = await page.evaluate(([i, seq]) => {
    const fam = portalAttunement().family, fz = ignitePortal('rough', eval(seq)([0.9]));
    const afterFizzle = portalForge().charge;
    portalForge().charge = PORTAL_CRAFT.cap;
    const ok = ignitePortal('rough', eval(seq)([0.0]));
    return { fam, fz, afterFizzle, ok, stones: portalForge().stones.slice(), charge: portalForge().charge, crafted: state.progress.totals.portalsCrafted || 0, fizzles: state.progress.totals.portalFizzles || 0 };
  }, [ids, seq]);
  assert.ok(ig.fz && !ig.fz.ok && ig.afterFizzle === 6, 'a fizzle keeps half of 12: ' + JSON.stringify(ig.fz));
  assert.ok(ig.ok && ig.ok.ok && ig.stones.length === 1 && ig.stones[0].family === ig.fam, 'a stone of the attuned family');
  assert.deepStrictEqual([ig.charge, ig.crafted, ig.fizzles], [0, 1, 1], 'the rift is empty again; both counted');

  // ---- 4. the Workshop page: the meter, the attunement, the stone and the cards to feed ----
  await page.evaluate(() => { switchTab('collection'); setCardsView('craft'); craftMode = 'portal'; renderCraft(); });
  const ui = await page.evaluate(() => ({ meter: !!document.querySelector('.pc-meter'), stones: document.querySelectorAll('.pc-stone').length, feed: document.querySelectorAll('.pc-feed [data-feed]').length, ignite: document.getElementById('pcIgnite').disabled, tab: !!document.querySelector('.cr-mode [data-mode="portal"] small') }));
  assert.ok(ui.meter && ui.stones === 1 && ui.feed >= 1 && ui.ignite && ui.tab, 'meter, one stone, cards to feed, ignite waits for a charge: ' + JSON.stringify(ui));
  // feeding through the page, then igniting through the forge
  const c0 = await page.evaluate(() => portalForge().charge);
  await page.click('.pc-feed [data-feed]');
  assert.ok(await page.evaluate(c => portalForge().charge > c, c0), 'tapping a card feeds it');
  await page.evaluate(() => { portalForge().charge = PORTAL_CRAFT.cap; renderCraft(); });
  await page.click('#pcIgnite');
  assert.ok(await page.evaluate(() => !document.getElementById('forgeSheet').classList.contains('hidden') && !document.querySelector('.fg-card').classList.contains('master')), 'igniting opens the forge');
  await page.evaluate(() => { forgeStrike(forgeRun.centre); forgeStrike(forgeRun.centre); forgeStrike(forgeRun.centre); });
  assert.match(await page.evaluate(() => document.querySelector('.fg-msg').textContent), /Flawless!.*to fold into a stone/, 'the forge says what it did to the chance');
  await until(() => portalForge().stones.length === 2);
  assert.strictEqual(await page.evaluate(() => portalForge().stones.length), 2, 'a full rift at the cap always makes a stone');

  // ---- 5. a stone opens a portal beside her, even in the cooldown, and lets her through ----
  await page.evaluate(() => { switchTab('town'); state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); state.progress.pwEndedAt = Date.now(); renderTown(); });
  const use = await page.evaluate(() => {
    const cooldown = !pwCanStart(), fam = portalForge().stones[0].family, ok = usePortalStone(0), p = state.progress.portal;
    return { cooldown, ok, fam, p, left: portalForge().stones.length, inView: p && portalInView(p.x, p.y), compass: !!document.getElementById('portalCompass'), blocked: portalStoneBlock() };
  });
  assert.ok(use.cooldown && use.ok, 'opened during the cooldown');
  assert.ok(use.p.crafted && use.p.family === use.fam && use.inView && !use.compass, 'a crafted portal of its family, right beside her (no compass needed)');
  assert.strictEqual(use.left, 1, 'the stone is used up');
  assert.match(use.blocked, /already open/, 'one portal at a time');
  await page.evaluate(() => { const p = state.progress.portal; portalStep(p.x, p.y); });
  await until(() => state.currentDistrict === 'pw' && !document.querySelector('.travel-fade, .warp-fx'), null, 10000);
  assert.strictEqual(await page.evaluate(() => state.currentDistrict), 'pw', 'through it into a world despite the cooldown');
  await page.evaluate(() => { if (pwActive()) pwLeave('left', true); });
  await until(() => state.currentDistrict !== 'pw' && !document.querySelector('.travel-fade, .warp-fx'), null, 10000);

  // ---- 6. the Pantry lists the stone with an Open button ----
  await page.evaluate(() => { switchTab('character'); charSetView('bag'); }); await page.waitForTimeout(300);
  const pantry = await page.evaluate(() => (document.getElementById('chBody') || {}).textContent || '');
  assert.match(pantry, /Portal stones/i, 'the Pantry has the stone: ' + pantry);
  await page.evaluate(() => switchTab('town'));
};
