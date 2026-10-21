// Tock's tinker stall as a full screen (js/tinker-screen.js), driven the way a player does: buy bait, sort the spare parts into bins
// (drag, tap-then-bin, a wrong bin), and slide the gears.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.progress.pebbles = 100; delete buildingState('stall-tinker').sort; openScene('stall-tinker'); });
  await page.waitForTimeout(400);
  assert.ok(await q("tinkerOpen() && document.body.classList.contains('in-tinker')"), 'the stall opens as a full screen');
  // bait: one tap buys
  const flowers = await q("ingredientCount('flowers')"); await page.click('[data-bait="daisy"]'); await page.waitForTimeout(200);
  assert.strictEqual(await q("ingredientCount('flowers')"), flowers + 4, 'a tap buys the bait'); assert.strictEqual(await q("state.progress.pebbles"), 92, 'and pays for it');
  await q("state.progress.pebbles = 1"); await page.click('[data-bait="fish"]'); assert.strictEqual(await q("state.progress.pebbles"), 1, 'too poor buys nothing');
  await q("state.progress.pebbles = 100");
  // parts: a wrong bin bounces it back, a tap-then-bin places it, a drag places it
  const kind = i => q(`tinkerUi.parts[${i}]`), other = k => ['cog', 'screw', 'spring'].find(x => x !== k);
  let k0 = await kind(0); await page.click('.tn-part[data-part="0"]'); await page.click(`.tn-bin[data-bin="${other(k0)}"]`);
  assert.strictEqual(await q("tinkerUi.left"), 6, 'a wrong bin places nothing'); assert.ok(/not a/.test(await page.textContent('#tnSay')), 'and says so');
  await page.click(`.tn-bin[data-bin="${k0}"]`); assert.strictEqual(await q("tinkerUi.left"), 5, 'tap the part, then its bin');
  await page.waitForTimeout(300);
  const k1 = await kind(1); let pb = await page.locator('.tn-part[data-part="1"]').boundingBox(), bb = await page.locator(`.tn-bin[data-bin="${k1}"]`).boundingBox();
  await page.mouse.move(pb.x + 24, pb.y + 24); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 }); await page.mouse.up();
  assert.strictEqual(await q("tinkerUi.left"), 4, 'dragging a part into its bin places it');
  const peb = await q("state.progress.pebbles");
  for (let i = 2; i < 6; i++) { const k = await kind(i); await page.click(`.tn-part[data-part="${i}"]`); await page.click(`.tn-bin[data-bin="${k}"]`); await page.waitForTimeout(80); }
  await page.waitForTimeout(700);
  assert.ok(await q("tinkerSorted()"), 'sorting the last part finishes the day\'s job'); assert.ok(await q("state.progress.pebbles") > peb, 'and it pays');
  assert.ok(/tidy/.test(await page.textContent('#tnStage')), 'the bench shows it is tidy');
  // the gears: one move from solved, then slide it home
  await page.click('[data-tn="mg-gears"]'); await page.waitForTimeout(300);
  assert.strictEqual(await q("tinkerEl.dataset.mode"), 'game', 'the gears play inside the stall');
  await q("mini.st.tiles = [1, 2, 3, 4, 5, 6, 7, 0, 8]; tinkerPaint(mini)");
  await page.click('.tn-gear[data-gear="1"]'); assert.strictEqual(await q("mini.st.moves"), 0, 'a gear away from the gap does not move');
  await page.click('.tn-gear[data-gear="8"]'); await page.waitForTimeout(800);
  assert.ok(await q("mini.done && tinkerEl.dataset.mode === 'over'"), 'solving the gears ends the game'); assert.ok(await q("miniState('gears').plays >= 1"), 'and counts as a play');
  await page.click('[data-tn="mg-back"]'); await page.waitForTimeout(300); assert.strictEqual(await q("tinkerEl.dataset.mode"), 'shop', 'Back returns to the stall');
  await page.click('#tnX'); await page.waitForTimeout(1100); assert.ok(await q("!tinkerOpen() && !inScene"), 'the X leaves');
};
