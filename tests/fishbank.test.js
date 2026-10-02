// Every tile that shows a fish must be tappable: it needs a reachable bank (tryFishTap has nowhere to stand otherwise).
module.exports = async (page, assert) => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const d of Object.keys(DISTRICTS)) { const m = getMap(d); Object.keys(m.fishTiles).forEach(k => { const [x, y] = k.split(',').map(Number); if (!bankFor(m, x, y)) out.push(d + ':' + k); }); }
    return out;
  });
  assert.deepStrictEqual(bad, [], 'fish drawn on water with no bank: ' + bad.join(' '));
};
