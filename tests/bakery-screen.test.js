// Maple's Bakery as a full-screen kitchen (js/bakery-screen.js), driven the way a player does: rub the dough, swipe the loaf, drag it up
// into the oven, wait, drag the fresh loaf to the basket; plus the three spots round the kitchen.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.progress.bread = 0; buildingState('bakery').oven = { startedAt: null }; openScene('bakery'); });
  await page.waitForTimeout(400);
  assert.ok(await q("bakeryOpen() && document.body.classList.contains('in-bakery')"), 'the bakery opens as a full screen');
  assert.ok(/Rub the dough/.test(await page.textContent('#bkHint')), 'it starts at the dough');
  // knead: rub back and forth over the dough
  let b = await page.locator('#bkDough').boundingBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 0; i < 40 && (await q("bakeryUi.step")) === 'knead'; i++) { await page.mouse.move(cx + 50, cy, { steps: 3 }); await page.mouse.move(cx - 50, cy + 10, { steps: 3 }); }
  await page.mouse.up(); await page.waitForTimeout(500);
  assert.strictEqual(await q("bakeryUi.step"), 'score', 'rubbing the dough long enough moves on to scoring');
  // score: three swipes across the loaf
  b = await page.locator('#bkLoaf').boundingBox();
  for (let i = 0; i < 3; i++) { await page.mouse.move(b.x + 40 + i * 45, b.y + 10); await page.mouse.down(); await page.mouse.move(b.x + 80 + i * 45, b.y + b.height - 10, { steps: 5 }); await page.mouse.up(); }
  await page.waitForTimeout(500);
  assert.strictEqual(await q("bakeryUi.step"), 'load', 'three swipes score the loaf');
  assert.strictEqual(await page.locator('#bkCuts i').count(), 3, 'and the cuts show on it');
  // a drag that stops short of the oven springs back
  b = await page.locator('#bkLoaf').boundingBox(); await page.mouse.move(b.x + 60, b.y + 50); await page.mouse.down(); await page.mouse.move(b.x + 60, b.y + 20, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(650);
  assert.strictEqual(await q("bakeryPhase()"), 'idle', 'a loaf dropped short of the oven is not baked');
  // drag it into the oven
  const o = await page.locator('#bkOven').boundingBox(); b = await page.locator('#bkLoaf').boundingBox();
  await page.mouse.move(b.x + 60, b.y + 50); await page.mouse.down(); await page.mouse.move(o.x + o.width / 2, o.y + o.height / 2, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(900);
  assert.strictEqual(await q("bakeryPhase()"), 'baking', 'dropping the loaf in the oven starts the bake');
  assert.ok(await q("/Off you go/.test(document.getElementById('bkSay').textContent)"), 'Maple says so');
  assert.ok(/\d:\d\d/.test(await page.textContent('#bkBigClock')), 'a clock counts down');
  // ready: the door opens and the loaf goes to the basket
  await page.evaluate(() => { ovenState().startedAt = Date.now() - (ovenState().ms || BAKE_MS) - 1000; renderScene(); });
  await page.waitForTimeout(900);   // the loaf pops out of the oven first
  assert.strictEqual(await q("document.getElementById('bkOven').dataset.phase"), 'ready', 'the oven shows it is ready');
  const loaf = await page.locator('#bkLoaf').boundingBox(), bsk = await page.locator('#bkBasketDrop').boundingBox();
  await page.mouse.move(loaf.x + 60, loaf.y + 50); await page.mouse.down(); await page.mouse.move(bsk.x + bsk.width / 2, bsk.y + bsk.height / 2, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(900);
  assert.strictEqual(await q("breadCount()"), 1, 'the loaf lands in the basket');
  assert.strictEqual(await q("bakeryPhase()"), 'idle', 'and the oven is free again');
  // tapping works for every step
  await page.click('#bkDough'); assert.ok(await q("bakeryUi.knead > 0"), 'a tap kneads a little');
  for (let i = 0; i < 8; i++) { if ((await q("bakeryUi.step")) !== 'knead') break; await page.click('#bkDough'); }
  await page.waitForTimeout(400); for (let i = 0; i < 3; i++) { await page.locator('#bkLoaf').click({ force: true }); await page.waitForTimeout(100); }
  await page.waitForTimeout(500); await page.locator('#bkLoaf').click({ force: true }); await page.waitForTimeout(800);
  assert.strictEqual(await q("bakeryPhase()"), 'baking', 'taps alone can bake a loaf');
  // the kitchen spots: the roll pays once, Cook and the game swap in the scene and come back
  const peb = await q("state.progress.pebbles"); await page.click('[data-bk="roll"]');
  assert.ok(await q("state.progress.pebbles") > peb && await q("buildingState('bakery').roll === todayKey()"), 'the warm roll pays once a day');
  await page.click('[data-bk="cook"]'); assert.ok(await q("!bakeryOpen() && scene.mode === 'cook'"), 'Cook leaves the kitchen for the recipe sheet');
  await q("sceneAction('back')"); assert.ok(await q("bakeryOpen()"), 'Back returns to the kitchen');
  await page.click('[data-bk="mg-frost"]'); assert.ok(await q("!bakeryOpen() && !!mini"), 'Cake Toppings starts over the scene'); await q("sceneAction('mg-back')"); assert.ok(await q("bakeryOpen()"), 'and its Back returns to the kitchen');
  await page.click('#bkLeave'); await page.waitForTimeout(1100); assert.ok(await q("!bakeryOpen() && !inScene"), 'the X leaves the bakery');
};
