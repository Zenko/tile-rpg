// Clover's thread stall as a full screen (js/thread-screen.js), driven the way a player does: a ribbon, the mannequin's advice, sweeping
// the remnant basket, and Stitch the Pattern by pressing the squares.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; delete buildingState('stall-thread').basket; openScene('stall-thread'); });
  await page.waitForTimeout(400);
  assert.ok(await q("threadOpen() && document.body.classList.contains('in-thread')"), 'the stall opens as a full screen');
  await page.locator('.th-rib >> nth=3').click(); assert.ok(/Gold thread/.test(await page.textContent('#thSay')), 'a ribbon speaks when tapped');
  await page.click('[data-th="advice"]'); await page.waitForTimeout(200);
  assert.ok(await q("document.getElementById('thSay').textContent === scene.text && /deck/i.test(scene.text)"), 'the mannequin gives deck advice');
  // sweep over the scraps: the basket empties and the hidden card is found, once
  const cards = await q("state.ownedCards.length");
  const sb = await page.locator('#thScraps').boundingBox();
  await page.mouse.move(sb.x + 2, sb.y + 4); await page.mouse.down();
  for (let row = 0; row < 4; row++) { await page.mouse.move(sb.x + sb.width - 2, sb.y + 8 + row * 14, { steps: 14 }); await page.mouse.move(sb.x + 2, sb.y + 14 + row * 14, { steps: 14 }); }
  await page.mouse.up(); await page.waitForTimeout(700);
  assert.strictEqual(await q("state.ownedCards.length"), cards + 1, 'sweeping the basket clear finds a card');
  assert.strictEqual(await q("threadFound()"), true);
  await page.evaluate(() => { const o = document.getElementById('pickupOverlay'); if (o) o.classList.add('hidden'); });
  await page.waitForTimeout(300); assert.ok(/Nothing left but lint/.test(await page.textContent('#thBasket')), 'and the basket shows it is empty');
  // the pattern game: watch, then press the squares
  await page.click('[data-th="mg-pattern"]'); await page.waitForTimeout(300);
  assert.strictEqual(await q("threadEl.dataset.mode"), 'game', 'the game plays inside the stall');
  await page.waitForFunction(() => mini && mini.st.phase === 'input', null, { timeout: 8000 });
  const cell = async i => { const b = await page.locator(`.th-patch[data-patch="${i}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  let target = await q("mini.st.target.slice()");
  let c;
  for (const t of target) { c = await cell(t); await page.mouse.click(c.x, c.y); }
  await page.waitForTimeout(300);
  assert.strictEqual(await q("mini.st.round"), 1, 'pressing the right squares stitches the round');
  await page.waitForFunction(() => mini && mini.st.phase === 'input' && mini.st.round === 1, null, { timeout: 8000 });
  // a wrong square ends it
  target = await q("mini.st.target.slice()"); const wrong = await q("[...Array(16).keys()].find(i => !mini.st.target.includes(i))");
  c = await cell(wrong); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(100);
  assert.strictEqual(await q("mini.st.phase"), 'over', 'a wrong square ends the round'); await page.waitForTimeout(1300);
  assert.ok(await q("mini.done && threadEl.dataset.mode === 'over'"), 'and the stall offers play again or back');
  await page.click('[data-th="mg-back"]'); await page.waitForTimeout(300); assert.strictEqual(await q("threadEl.dataset.mode"), 'shop', 'Back returns to the stall');
  await page.click('#thX'); await page.waitForTimeout(1100); assert.ok(await q("!threadOpen() && !inScene"), 'the X leaves');
};
