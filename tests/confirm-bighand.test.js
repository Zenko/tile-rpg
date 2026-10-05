// The in-game confirm sheet replaces the browser's confirm(), the town pill stops saying "skill point" once it is spent,
// and a hand of six or more cards fits the screen.
module.exports = async (page, assert) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.getElementById('testHideOverlays').remove());
  // confirm sheet: Cancel keeps the letter, OK deletes it
  await page.evaluate(() => { mailState().list = [{ id: 'm1', from: 'Wren', subject: 'Hi', body: 'x', read: true }]; saveState(); });
  await page.evaluate(() => { let ran = 0; window.__ran = () => ran; askConfirm({ title: 'T', text: 'x', ok: 'Yes' }, () => { ran++; }); });
  assert.strictEqual(await page.locator('#confirmOk').textContent(), 'Yes');
  await page.click('#confirmCancel');
  assert.strictEqual(await page.evaluate(() => __ran()), 0, 'Cancel does not run the action');
  assert.ok(await page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('hidden')), 'Cancel closes the sheet');
  await page.evaluate(() => askConfirm({ title: 'T', text: 'x', ok: 'Yes' }, () => { window.__yes = true; }));
  await page.click('#confirmOk');
  assert.ok(await page.evaluate(() => window.__yes === true), 'OK runs the action');
  // skill point pill: spend the last point and the pill must update at once
  await page.evaluate(() => { state.progress.level = 3; state.progress.skills = {}; saveState(); });
  assert.strictEqual(await page.evaluate(() => skillPointsLeft()), 2);
  await page.evaluate(() => { buySkill('angler'); buySkill('gardener'); });
  assert.strictEqual(await page.evaluate(() => skillPointsLeft()), 0);
  assert.ok(!/skill point/.test(await page.evaluate(() => document.getElementById('goalText').textContent)), 'the pill no longer offers skill points');
  // big hand: six cards, every one inside the screen
  await page.evaluate(() => { CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); });
  await page.waitForFunction(() => !document.getElementById('mulliganOverlay').classList.contains('hidden'), null, { timeout: 10000 });
  await page.click('#mulliganKeepBtn'); await page.waitForTimeout(400);
  await page.evaluate(() => { const me = battle.G.p[0]; while (me.hand.length < 6) me.hand.push(Object.assign({}, me.hand[0], { uid: 9000 + me.hand.length })); btRender(); });
  await page.waitForTimeout(500);   // the cards ease into their fan
  const r = await page.evaluate(() => [...document.querySelectorAll('#btHand .hcard')].map(c => { const b = c.getBoundingClientRect(); return [b.left, b.right, b.bottom]; }));
  assert.strictEqual(r.length, 6);
  assert.ok(r.every(([l, rt, bt]) => l >= 0 && rt <= innerWidthOf(400) && bt <= 860), 'all six cards are on screen: ' + JSON.stringify(r));
  function innerWidthOf(w) { return w; }
};
