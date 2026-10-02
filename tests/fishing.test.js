// Every fish swims as a silhouette (caught or not); only the fish that bites is shown in colour, and landing one never recolours the rest.
module.exports = async (page, assert) => {
  await page.evaluate(() => { const f = fishState(); f.caught = { minnow: 3 }; saveState(); (typeof openFishing === 'function' ? openFishing : startFishing)(); });
  await page.waitForTimeout(1500);
  const st = () => page.evaluate(() => fishing.swimmers.map(s => [s.fish.id, s.el.classList.contains('unknown')]));
  const before = await st();
  assert.ok(before.length > 0 && before.every(([, hidden]) => hidden), 'every swimmer must be a silhouette, even caught species');
  await page.evaluate(() => { const perch = fishDef('perch'); fishing.size = fishSizeOf(perch); fishing.fish = perch; fishLand(perch); });
  await page.waitForTimeout(2500);
  assert.ok((await st()).every(([, hidden]) => hidden), 'landing a fish must not recolour the swimmers');
  assert.ok(await page.evaluate(() => fishState().caught.perch >= 1));
};
