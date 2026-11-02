// labs/content-viewer.html (build 330) reads every table in content/ as the game builds it. It must load without errors,
// find the tables check.py lists, and find no broken text (an undefined / NaN / null where a name or number should be),
// in the real game and under the example skin.
const path = require('path');
module.exports = async (page, assert) => {
  const url = 'file://' + path.join(__dirname, '..', 'labs', 'content-viewer.html');
  for (const skin of ['', 'example']) {
    await page.goto(url + '?skin=' + skin); await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ n: rows.length, files: Object.keys(roots).length, skin: SKIN_ON,
      broken: rows.filter(x => x.flags.includes('broken')).map(x => x.path + ': ' + x.text.slice(0, 80)) }));
    assert.ok(r.n > 1500, `only ${r.n} pieces of text found`);
    assert.ok(r.files >= 8, `only ${r.files} files`);
    assert.strictEqual(r.skin, skin || null);
    assert.deepStrictEqual(r.broken, [], 'broken text: ' + r.broken.join('; '));
  }
  // searching narrows the list
  await page.fill('#q', 'kettle'); await page.waitForTimeout(150);
  const shown = await page.$$eval('.row', els => els.length);
  assert.ok(shown > 0 && shown < 60, `search for "kettle" showed ${shown} rows`);
  await page.goto(url + '?skin='); await page.waitForTimeout(300);   // leave the device on the real game
};
