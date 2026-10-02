// Madame Soot's tent: opens at dusk on Market Row, swaps a card once a day, tells a deck story and sells Arcana.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    let dusk = null, day = null;
    for (let t = 0; t < DAY_LEN_MS; t += DAY_LEN_MS / 96) { state.sky.elapsedMs = t; const open = skyPhase().dim >= 0.2; if (open && dusk === null) dusk = t; if (!open && day === null) day = t; }
    state.sky.elapsedMs = dusk; const evening = { market: (state.currentDistrict = 'market', fortuneOpen()), square: (state.currentDistrict = 'square', fortuneOpen()) };
    state.sky.elapsedMs = day; state.currentDistrict = 'market'; const noon = fortuneOpen();
    state.sky.elapsedMs = dusk; state.currentDistrict = 'market';
    return { dusk: dusk !== null, evening, noon };
  });
  assert.ok(r.dusk && r.evening.market && !r.evening.square && !r.noon, 'the tent is open on Market Row in the evening only');
  // story needs a full deck, then names a deck
  const s = await page.evaluate(() => {
    state.deck = []; const short = fortuneDeckStory();
    CARD_POOL.slice(0, 40).forEach(c => state.ownedCards.push(c.id, c.id)); state.deck = BattleEngine.suggestDeck(ownedCardCounts()); const full = fortuneDeckStory();
    return { short, full };
  });
  assert.match(s.short, /of 12 cards/); assert.match(s.full, /deck/); assert.match(s.full, /If it were a card/);
  // redraw: not before a reading, once after, costs Pebbles, face-down again, fortune cleared
  const d = await page.evaluate(() => {
    state.progress.tarot = undefined; state.progress.pebbles = 100; tarotState();
    const before = fortuneRedrawState(); tarotDraw(); [0, 1, 2].forEach(k => tarotFlip(k));
    const hadFortune = !!tarotState().fortune; const old = tarotState().cards[1].i;
    const msg = tarotRedraw(1); const t = tarotState();
    const after = { state: fortuneRedrawState(), flipped: t.flipped[1], fortune: t.fortune, changed: t.cards[1].i !== old, peb: state.progress.pebbles, distinct: new Set(t.cards.map(c => c.i)).size };
    const again = tarotRedraw(0);
    return { before, hadFortune, after, again, msg: msg.length > 10 };
  });
  assert.strictEqual(d.before, 'none'); assert.ok(d.hadFortune); assert.strictEqual(d.after.state, 'used'); assert.strictEqual(d.after.flipped, false); assert.strictEqual(d.after.fortune, null);
  assert.ok(d.after.changed && d.after.distinct === 3 && d.after.peb === 85); assert.match(d.again, /Nothing to turn over/);
  // the pack: costs Pebbles and adds an Arcana card
  const p = await page.evaluate(() => { state.progress.pebbles = 200; const n0 = state.ownedCards.length; const msg = fortuneBuyPack(); const added = state.ownedCards[state.ownedCards.length - 1]; return { peb: state.progress.pebbles, grew: state.ownedCards.length === n0 + 1, arcana: ARCANA.some(a => a.card === added), msg: msg.length > 10 }; });
  assert.ok(p.peb >= 110 && p.peb < 200, 'the pack cost 90 (a Binder page or achievement may pay a little back)'); assert.ok(p.grew && p.arcana);
  const poor = await page.evaluate(() => { state.progress.pebbles = 5; const n0 = state.ownedCards.length; fortuneBuyPack(); return state.ownedCards.length === n0; });
  assert.ok(poor, 'no pack without the Pebbles');
  // the scene opens with its four actions, and the tent shows on the map
  await page.evaluate(() => { state.progress.pebbles = 100; renderTown(); });
  assert.ok(await page.locator('.ent.vendor').count() >= 1, 'the fortune teller is drawn on Market Row');
  await page.evaluate(() => openScene('fortune')); await page.waitForTimeout(700);
  assert.strictEqual(await page.locator('#scActions .sc-btn[data-act^="fortune"]').count(), 4);
  await page.locator('[data-act="fortune-redraw"]').click({ force: true }); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => scene.text.length > 10));
};
