// Holo foil (js/holo-foil.js): ultra and up get foil overlays in the reveal popup, commons and rares do not, a finger moves the light and tilts the frame, and letting go resets it.
module.exports = async (page, assert) => {
  const probe = id => page.evaluate(id => { showCardReveal(id, 'Card Details', false, ''); const f = document.getElementById('pickupCardFace'); return { holo: f.classList.contains('holo'), foil: !!f.querySelector('.holo-foil'), spark: !!f.querySelector('.holo-spark') }; }, id);
  const common = await probe('toadstool'), rare = await probe('blossom'), ultra = await probe('ember-fox'), mythic = await probe('mossy-titan');
  assert.ok(!common.holo && !common.foil && !rare.holo && !rare.foil, 'commons and rares get no foil');
  assert.ok(ultra.holo && ultra.foil && !ultra.spark, 'ultra gets foil without sparkles: ' + JSON.stringify(ultra));
  assert.ok(mythic.holo && mythic.foil && mythic.spark, 'mythic gets foil and sparkles: ' + JSON.stringify(mythic));
  await page.evaluate(() => { const st = document.getElementById('testHideOverlays'); if (st) st.remove(); document.getElementById('pickupOverlay').classList.remove('hidden'); });   // the harness hides overlays; this test needs the popup laid out
  await page.waitForTimeout(800);
  const box = await page.evaluate(() => { const r = document.getElementById('pickupCardFace').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  // the test harness hides overlays so they cannot block clicks, so the pointer events are dispatched on the frame directly
  const fire = (type, fx, fy) => page.evaluate(([t, x, y, b]) => { const fr = document.getElementById('pickupCardFace').parentElement; fr.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'mouse', buttons: t === 'pointerup' ? 0 : 1, clientX: b[0] + b[2] * x, clientY: b[1] + b[3] * y })); }, [type, fx, fy, box]);
  await fire('pointerdown', 0.8, 0.25); await fire('pointermove', 0.82, 0.27);
  const live = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { hx: f.style.getPropertyValue('--hx'), live: f.parentElement.classList.contains('holo-live'), tilt: f.parentElement.style.transform }; });
  assert.ok(parseFloat(live.hx) > 70 && live.live, 'a finger should move the light: ' + JSON.stringify(live));
  await fire('pointerup', 0.82, 0.27);
  const rest = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { hx: f.style.getPropertyValue('--hx'), live: f.parentElement.classList.contains('holo-live'), tilt: f.parentElement.style.transform }; });
  assert.ok(!rest.live && rest.hx === '' && rest.tilt === '', 'letting go resets the light and the tilt: ' + JSON.stringify(rest));
  await probe('toadstool');
  assert.strictEqual(await page.evaluate(() => document.getElementById('pickupCardFace').parentElement.style.transform), '', 'a common after a foil card must not keep the tilt');
};
