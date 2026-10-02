// Tarot: the 22 Arcana are real cards, a reading flips into a fortune, attuning works, and the perks reach skillBonus.
module.exports = async (page, assert) => {
  const m = await page.evaluate(() => ({ n: ARCANA.length, missing: ARCANA.filter(a => !cardDef(a.card)).map(a => a.card), kinds: [...new Set(ARCANA.map(a => a.kind))] }));
  assert.strictEqual(m.n, 22); assert.deepStrictEqual(m.missing, [], 'every Arcana maps to a real card');
  // a reading: draw, flip all three, the Present card sets the fortune
  const r = await page.evaluate(() => {
    state.progress.tarot = undefined; const t0 = tarotState();
    const drew = tarotDraw(), again = tarotDraw(); const t = tarotState();
    const ids = t.cards.map(c => c.i), distinct = new Set(ids).size === 3;
    tarotFlip(0); tarotFlip(1); const midway = !t.fortune; tarotFlip(2);
    const mid = ARCANA[t.cards[1].i];
    return { drew, again, distinct, midway, fortune: !!t.fortune, same: t.fortune && t.fortune.i === t.cards[1].i, seen: Object.keys(t.seen).length, kind: mid.kind };
  });
  assert.ok(r.drew && !r.again, 'one draw a day'); assert.ok(r.distinct); assert.ok(r.midway, 'no fortune until all three are turned'); assert.ok(r.fortune && r.same); assert.strictEqual(r.seen, 3);
  // the fortune reaches skillBonus (and halves when reversed, for fractional perks)
  const f = await page.evaluate(() => {
    const t = tarotState(); const xp = ARCANA.findIndex(a => a.kind === 'xp' && a.val === .05);
    t.fortune = { i: xp, rev: false }; const up = skillBonus('xp') - 0;
    t.fortune = { i: xp, rev: true }; const rev = skillBonus('xp');
    t.fortune = null; const none = skillBonus('xp');
    return { up, rev, none };
  });
  assert.ok(Math.abs(f.up - f.none - 0.05) < 1e-9, 'upright fortune +5% XP'); assert.ok(Math.abs(f.rev - f.none - 0.025) < 1e-9, 'reversed is half');
  // attuning needs the card, and caps at three
  const a = await page.evaluate(() => {
    const t = tarotState(); t.attuned = []; state.ownedCards = ARCANA.slice(0, 5).map(x => x.card);
    const unowned = tarotAttune(10);
    const on = [0, 1, 2].map(i => tarotAttune(i)), fourth = tarotAttune(3), off = tarotAttune(0);
    return { unowned, on, fourth, off, left: t.attuned.length };
  });
  assert.strictEqual(a.unowned, false); assert.deepStrictEqual(a.on, ['on', 'on', 'on']); assert.strictEqual(a.fourth, false); assert.strictEqual(a.off, 'off'); assert.strictEqual(a.left, 2);
  // attuned Spirit or draw becomes a gentle XP perk
  const g = await page.evaluate(() => { const i = ARCANA.findIndex(x => x.kind === 'startSpirit'); const p = tarotAttunedPerk(ARCANA[i]); return p; });
  assert.deepStrictEqual(g, { kind: 'xp', val: 0.03 });
  // the screen renders both views and a flip click works
  await page.evaluate(() => { state.progress.tarot.cards = null; openCalm('tarot'); });
  await page.waitForTimeout(300);
  await page.click('#trDraw'); await page.waitForTimeout(200);
  await page.locator('[data-flip="0"]').click(); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => tarotState().flipped[0]));
  await page.click('[data-tv="arcana"]'); await page.waitForTimeout(200);
  assert.strictEqual(await page.locator('.tr-tile').count(), 22);
  // Binder has the Arcana page
  assert.ok(await page.evaluate(() => binderPages().some(p => p.id === 'tarot' && p.ids.length === 22)));
};
