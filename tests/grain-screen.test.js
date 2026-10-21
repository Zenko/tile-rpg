// The grain stall as a full screen (js/grain-screen.js), driven the way a player does: scoop the sample (drag, then tap), and play Catch
// the Grain by dragging across the board.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.progress.pebbles = 0; delete buildingState('stall-grain').sample; openScene('stall-grain'); });
  await page.waitForTimeout(400);
  assert.ok(await q("grainOpen() && document.body.classList.contains('in-grain')"), 'the stall opens as a full screen');
  const centre = async sel => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const drag = async (from, to) => { const a = await centre(from), b = await centre(to); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(350); };
  // pouring into the hand with an empty scoop pays nothing
  await drag('#grScoop', '#grHand'); assert.strictEqual(await q("grainSampled()"), false, 'an empty scoop pours nothing');
  await drag('#grScoop', '#grSack'); assert.ok(await q("grainUi.carry && document.getElementById('grScoop').classList.contains('full')"), 'dragging the scoop into the sack fills it');
  await drag('#grScoop', '#grHand'); await page.waitForTimeout(700);
  assert.ok(await q("grainSampled()"), 'pouring it into the hand takes the sample'); assert.ok(await q("state.progress.pebbles") >= 4, 'and pays it');
  assert.ok(/Sold out/.test(await page.textContent('#grSack')), 'the sack is flat afterwards');
  await page.click('#grScoop'); assert.ok(/Sold out for today/.test(await page.textContent('#grSay')), 'asking again gets the seller\'s answer');
  // the game: the basket follows the finger
  await page.click('[data-gr="mg-grain"]'); await page.waitForTimeout(400);
  assert.strictEqual(await q("grainEl.dataset.mode"), 'game', 'the game plays inside the stall');
  const bb = await page.locator('#grBoard').boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.5); await page.mouse.down();
  assert.strictEqual(await q("mini.st.lane"), 0, 'pressing the left lane moves the basket there');
  await page.mouse.move(bb.x + bb.width * 0.85, bb.y + bb.height * 0.5, { steps: 8 }); assert.strictEqual(await q("mini.st.lane"), 2, 'dragging right carries it along');
  await page.waitForTimeout(1500); await page.mouse.up();
  assert.ok(await page.locator('#grBoard .gr-fall').count() >= 1, 'grain and stones fall on the board');
  assert.ok(await q("parseFloat(document.getElementById('grTime').style.width) < 100"), 'the clock runs down');
  await q("mini.st.left = 1; mini.st.start = Date.now() - 30000"); await page.waitForTimeout(400);
  assert.ok(await q("mini.done && grainEl.dataset.mode === 'over'"), 'when time runs out the stall offers play again or back');
  await page.click('[data-gr="mg-back"]'); await page.waitForTimeout(300); assert.strictEqual(await q("grainEl.dataset.mode"), 'shop', 'Back returns to the stall');
  await page.click('#grLeave'); await page.waitForTimeout(1100); assert.ok(await q("!grainOpen() && !inScene"), 'the X leaves');
};
