// Saffron's spice stall as a full screen (js/spice-screen.js), driven the way a player does: open a jar, drag the purse onto the deal,
// play Higher or Lower by dragging the jar and tapping the pot.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.progress.pebbles = 500; delete buildingState('stall-spice').dealDay; openScene('stall-spice'); });
  await page.waitForTimeout(400);
  assert.ok(await q("spiceOpen() && document.body.classList.contains('in-spice')"), 'the stall opens as a full screen');
  assert.strictEqual(await page.locator('.sp-jar').count(), 6, 'six jars hang on the shelf');
  // a jar: a line from the seller, nothing paid
  await page.locator('.sp-jar >> nth=1').click(); assert.ok(/Moon saffron/.test(await page.textContent('#spSay')), 'tapping a jar opens it'); assert.strictEqual(await q("state.progress.pebbles"), 500);
  // dropping the purse short of the deal buys nothing
  let pr = await page.locator('#spPurse').boundingBox(), it = await page.locator('#spItem').boundingBox();
  await page.mouse.move(pr.x + 30, pr.y + 30); await page.mouse.down(); await page.mouse.move(pr.x + 30, pr.y + 80, { steps: 4 }); await page.mouse.up();
  assert.strictEqual(await q("spiceSold()"), false, 'a purse dropped away from the deal pays nothing');
  // dragging it onto the deal pays
  await page.waitForTimeout(150); pr = await page.locator('#spPurse').boundingBox();
  const price = await q("spiceDeal().price");
  await page.mouse.move(pr.x + 30, pr.y + 30); await page.mouse.down(); await page.mouse.move(it.x + it.width / 2, it.y + it.height / 2, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(300);
  assert.strictEqual(await q("spiceSold()"), true, 'the deal is bought');
  assert.strictEqual(await q("state.progress.pebbles"), 500 - price, 'and its price is paid');
  await page.evaluate(() => { const o = document.getElementById('pickupOverlay'); if (o) o.classList.add('hidden'); }); await page.waitForTimeout(800);
  assert.ok(/Sold out/.test(await page.textContent('#spStage')), 'the counter shows it is sold out');
  // too poor: the purse shakes and nothing changes
  await q("delete buildingState('stall-spice').dealDay; state.progress.pebbles = 1; renderScene()"); await page.waitForTimeout(200);
  await page.click('#spBuy'); assert.strictEqual(await q("spiceSold()"), false, 'an empty purse buys nothing'); assert.strictEqual(await q("state.progress.pebbles"), 1);
  // Higher or Lower: play in the screen on the game's own state
  await page.click('[data-sp="mg-haggle"]'); await page.waitForTimeout(300);
  assert.strictEqual(await q("spiceEl.dataset.mode"), 'game', 'the game plays inside the stall');
  await q("mini.st.cur = 5"); await q("spiceRender()");
  const rig = (to) => q(`(() => { const r = Math.random; Math.random = () => ${to}; })()`);
  // drag the jar up: higher. Rig the next jar to 9 (rand uses Math.random).
  await rig(0.99); await page.waitForTimeout(500); let jb = await page.locator('#spBigJar').boundingBox();
  await page.mouse.move(jb.x + 60, jb.y + 70); await page.mouse.down(); await page.mouse.move(jb.x + 60, jb.y + 10, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(250);
  assert.strictEqual(await q("mini.st.streak"), 1, 'a swipe up guesses higher, and it was right');
  assert.ok(/1\s*tap to take/.test(await page.textContent('#spPot')), 'the pot grows');
  await page.click('#spPot'); await page.waitForTimeout(300);
  assert.ok(await q("mini.done && spiceEl.dataset.mode === 'over'"), 'taking the pot ends the game'); assert.ok(await q("state.progress.pebbles") >= 2, 'and pays it');
  await page.click('[data-sp="mg-again"]'); await page.waitForTimeout(300); assert.strictEqual(await q("spiceEl.dataset.mode"), 'game', 'play again starts a new round');
  // a wrong guess busts
  await q("mini.st.cur = 2"); await q("spiceRender()"); await rig(0.99); await page.click('[data-sp="lo"]'); await page.waitForTimeout(100);
  assert.strictEqual(await q("mini.st.phase"), 'bust', 'a wrong guess busts'); await page.waitForTimeout(1200);
  assert.ok(await q("mini.done"), 'and ends the round'); await q("Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })()");
  await page.click('[data-sp="mg-back"]'); await page.waitForTimeout(300); assert.strictEqual(await q("spiceEl.dataset.mode"), 'shop', 'Back returns to the stall');
  await page.click('#spLeave'); await page.waitForTimeout(1100); assert.ok(await q("!spiceOpen() && !inScene"), 'the X leaves');
};
