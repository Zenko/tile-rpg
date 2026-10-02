// Dragging the town map detaches the camera (and never counts as a tap); the Center button and walking bring it back.
module.exports = async (page, assert) => {
  await page.evaluate(() => { switchTab('town'); }); await page.waitForTimeout(900);
  const tf = () => page.evaluate(() => townWorld.style.transform);
  const pos = () => page.evaluate(() => JSON.stringify(state.playerPos));
  const follow = await tf(), p0 = await pos();
  assert.strictEqual(await page.evaluate(() => camFree), null, 'the camera follows the player at first');
  assert.ok(await page.evaluate(() => document.getElementById('camRecenter').classList.contains('hidden')), 'no Center button while following');
  const box = await page.evaluate(() => { const r = townView.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  // a real drag
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] - 60, box[1] - 40, { steps: 4 }); await page.mouse.move(box[0] - 140, box[1] - 90, { steps: 4 }); await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(400);
  const dragged = await tf();
  assert.notStrictEqual(dragged, follow, 'dragging moves the map: ' + follow + ' -> ' + dragged);
  assert.ok(await page.evaluate(() => !!camFree), 'the camera is detached after a drag');
  assert.strictEqual(await pos(), p0, 'a drag must not send the player walking');
  assert.ok(await page.evaluate(() => !document.getElementById('camRecenter').classList.contains('hidden')), 'the Center button appears');
  // the map cannot be dragged past its edges
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] + 2000, box[1] + 2000, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
  const b = await page.evaluate(() => { const c = camCurrent(), k = camBounds(); return [c.cx <= k.maxX + 0.5, c.cy <= k.maxY + 0.5]; });
  assert.deepStrictEqual(b, [true, true], 'the map stays inside its bounds');
  // Center brings it back
  await page.click('#camRecenter'); await page.waitForTimeout(500);
  assert.strictEqual(await page.evaluate(() => camFree), null, 'Center re-attaches the camera');
  assert.strictEqual(await tf(), follow, 'and the map returns to following the player');
  // a plain tap still walks, and walking releases a dragged camera
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] - 80, box[1], { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => !!camFree));
  await page.evaluate(() => { const m = getMap(state.currentDistrict), p = state.playerPos; startWalk([{ x: p.x, y: p.y + 1 }].filter(t => !m.solid[t.y][t.x]).concat([]).length ? [{ x: p.x, y: p.y + 1 }] : [{ x: p.x + 1, y: p.y }]); }); await page.waitForTimeout(600);
  assert.strictEqual(await page.evaluate(() => camFree), null, 'starting a walk re-attaches the camera');
};
