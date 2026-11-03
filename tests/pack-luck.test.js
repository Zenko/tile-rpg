// The lucky meter and starred cards (build 332).
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    state.progress.packLuck = 0;
    // an ordinary pull fills the meter by the price; a super empties it; filling it forces super
    out.a = packLuckRoll('common', 100); out.m1 = packLuck();
    out.b = packLuckRoll('mythic', 30); out.m2 = packLuck();
    state.progress.packLuck = 290; out.c = packLuckRoll('rare', 30); out.m3 = packLuck();
    // buying a pack moves it too
    state.progress.pebbles = 1000; state.progress.packLuck = 0; buyPack('brook'); out.afterBuy = packLuck(); out.price = packPrice(PACKS.find(p => p.id === 'brook'));
    // stars: at most three, earned cards cannot be starred, a starred card is twice as likely, and it un-stars once owned
    const pool = cardPool('common').filter(c => !state.ownedCards.includes(c.id));
    state.progress.starred = [];
    out.s = [toggleStar(pool[0].id), toggleStar(pool[1].id), toggleStar(pool[2].id), toggleStar(pool[3].id)];
    const excl = CARD_POOL.find(c => c.exclusive); out.excl = excl ? toggleStar(excl.id) : false;
    // compare the same card starred and unstarred (in-season cards are weighted too, so a flat 1/n is not the baseline)
    const freq = () => { let h = 0; const N = 30000; for (let i = 0; i < N; i++) if (seasonalPick(cardPool('common')).id === pool[0].id) h++; return h; };
    const on = freq(); state.progress.starred = state.progress.starred.filter(id => id !== pool[0].id); const off = freq(); state.progress.starred.push(pool[0].id);
    out.ratio = on / Math.max(1, off);
    state.ownedCards.push(pool[0].id); noteCardsFound(1); out.after = starred().length;
    return out;
  });
  assert.deepStrictEqual([r.a, r.m1, r.b, r.m2, r.c, r.m3], ['common', 100, 'mythic', 0, 'super', 0]);
  assert.ok(r.afterBuy === r.price || r.afterBuy === 0, 'a Moonlit pack adds its price (or empties it on a super)');
  assert.deepStrictEqual(r.s, [true, true, true, false]);
  assert.strictEqual(r.excl, false);
  assert.ok(r.ratio > 1.5 && r.ratio < 2.6, `a starred card came up ${r.ratio.toFixed(2)}x as often`);
  assert.strictEqual(r.after, 2, 'the card you got un-starred itself');
  // the UI: the meter in the shop, a star button on a missing set card
  await page.evaluate(() => { setOpenId = CARD_SETS[0].id; switchTab('collection'); setCardsView('almanac'); });
  await page.waitForTimeout(300);
  const ui = await page.evaluate(() => ({ stars: document.querySelectorAll('#almProgress [data-star]').length }));
  assert.ok(ui.stars > 0, 'missing set cards have a star button');
  const before = await page.evaluate(() => starred().length);
  await page.evaluate(() => { state.progress.starred = []; renderAlmanac(); document.querySelector('#almProgress [data-star]').click(); });
  assert.strictEqual(await page.evaluate(() => starred().length), 1, 'one tap stars it');
};
