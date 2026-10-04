// "Keep this hand?": the sheet fits the phone with the buttons pinned in view, the hand is one clean row (no overlap), and the
// loadout rows open one at a time.
module.exports = async (page, assert) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });   // no animation to wait for (the old Calm motion setting is gone)
  await page.evaluate(() => { CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); });
  await page.evaluate(() => { document.getElementById('testHideOverlays').remove(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); });
  await page.waitForFunction(() => { const o = document.getElementById('mulliganOverlay'); return o && !o.classList.contains('hidden'); }, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const sheet = document.querySelector('#mulliganOverlay .mull-sheet').getBoundingClientRect(), keep = document.getElementById('mulliganKeepBtn').getBoundingClientRect(), swap = document.getElementById('mulliganSwapBtn').getBoundingClientRect();
    const cards = [...document.querySelectorAll('#mulliganHand .hcard')].map(c => c.getBoundingClientRect());
    const overlap = cards.some((a, i) => cards.some((b, j) => i < j && Math.abs(a.top - b.top) < 2 && a.right > b.left + 1));
    return { sheetInView: sheet.top >= 0 && sheet.bottom <= innerHeight, buttonsInView: keep.bottom <= innerHeight && swap.bottom <= innerHeight && keep.top > sheet.top, cards: cards.length, overlap,
      open: [...document.querySelectorAll('#mulliganOverlay .lorow.open')].map(r => r.id), rows: [...document.querySelectorAll('#mulliganOverlay .lorow:not(.hidden)')].map(r => r.id) };
  });
  assert.ok(m.sheetInView && m.buttonsInView, 'the sheet and both buttons must be inside the screen: ' + JSON.stringify(m));
  assert.ok(m.cards >= 3 && !m.overlap, 'the hand is a clean row: ' + JSON.stringify(m));
  assert.ok(m.rows.includes('knackRow') && m.open.length === 1 && m.open[0] === 'knackRow', 'the Knack row starts open, alone: ' + JSON.stringify(m));
  // a header toggles its row; the header shows the current pick
  assert.strictEqual(await page.locator('#knackRow .lolab b').textContent(), await page.evaluate(() => BattleEngine.KNACKS[battle.G.p[0].knack].name), 'the header names the current Knack');
  await page.click('#knackRow [data-mull="knack"]');
  assert.strictEqual(await page.locator('#mulliganOverlay .lorow.open').count(), 0, 'tapping the open row closes it');
  await page.click('#knackRow [data-mull="knack"]');
  assert.strictEqual(await page.locator('#mulliganOverlay .lorow.open').count(), 1, 'tapping again opens it');
  assert.ok(await page.locator('#knackRow .knack-chip').count() >= 6, 'the Knack choices are in the row');
  // making Fate visible and opening it closes the Knack row (one open at a time)
  await page.evaluate(() => { document.getElementById('fateRow').classList.remove('hidden'); document.getElementById('fateRow').innerHTML = mullRowHtml('fate', '🔮', 'Fate · once per match', 'None', '<div class="knack-desc">x</div>'); });
  await page.click('#fateRow [data-mull="fate"]');
  assert.deepStrictEqual(await page.evaluate(() => [...document.querySelectorAll('#mulliganOverlay .lorow.open')].map(r => r.id)), ['fateRow'], 'opening one row closes the other');
  // draw a new hand once, then keep
  const before = await page.evaluate(() => battle.G.p[0].hand.length);
  await page.click('#mulliganSwapBtn'); await page.waitForTimeout(200);
  assert.strictEqual(await page.evaluate(() => document.getElementById('mulliganSwapBtn').disabled), true, 'the redraw is one-time');
  assert.strictEqual(await page.locator('#mulliganHand .hcard').count(), before, 'the new hand has the same size');
  await page.click('#mulliganKeepBtn'); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.getElementById('mulliganOverlay').classList.contains('hidden')), 'Keep hand closes the sheet');
};
