// Fish you have not caught swim as silhouettes; landing one reveals it.
module.exports = async (page, assert) => {
  await page.evaluate(() => { const f = fishState(); f.caught = { minnow: 3 }; saveState(); (typeof openFishing === 'function' ? openFishing : startFishing)(); });
  await page.waitForTimeout(1500);
  const st = () => page.evaluate(() => fishing.swimmers.map(s => [s.fish.id, s.el.classList.contains('unknown')]));
  const before = await st();
  assert.ok(before.some(([id, hidden]) => id === 'minnow' && !hidden) || !before.some(([id]) => id === 'minnow'), 'a caught fish should show in colour');
  assert.ok(before.filter(([id]) => id !== 'minnow').every(([, hidden]) => hidden), 'uncaught fish must be silhouettes');
  await page.evaluate(() => { const perch = fishDef('perch'); fishing.size = fishSizeOf(perch); fishing.fish = perch; fishLand(perch); });
  await page.waitForTimeout(2500);
  assert.ok((await st()).filter(([id]) => id === 'perch').every(([, hidden]) => !hidden), 'perch was not revealed after catching it');
  assert.ok(await page.evaluate(() => fishState().caught.perch >= 1));
};
