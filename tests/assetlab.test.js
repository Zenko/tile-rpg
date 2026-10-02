// The Asset Lab swaps uploaded images onto the real card defs in memory only: files named after a card or sprite id match by themselves,
// the preflight judges them, and everything renders without errors.
module.exports = async (page, assert) => {
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'asset-lab.html')); await page.waitForTimeout(700);
  const png = (name, w, opaque) => page.evaluate(([w, opaque]) => { const c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'); x.fillStyle = '#e8955a'; if (opaque) x.fillRect(0, 0, w, w); else { x.beginPath(); x.arc(w / 2, w / 2, w * 0.28, 0, 7); x.fill(); } return c.toDataURL('image/png').split(',')[1]; }, [w, opaque]).then(b => ({ name, mimeType: 'image/png', buffer: Buffer.from(b, 'base64') }));
  await page.setInputFiles('#file', [await png('sprout.png', 512), await png('s-oak.png', 64), await png('mystery.png', 400, true), await png('kw-guard.png', 128)]); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ rows: document.querySelectorAll('#lib tbody tr').length, art: CARD_POOL.find(c => c.id === 'sprout').art, other: CARD_POOL.find(c => c.id === 'pebble').art, unmatched: document.querySelectorAll('#lib [data-assign]').length, exp: document.getElementById('exp').textContent, town: document.querySelectorAll('#townScene img').length, mocks: document.querySelectorAll('#mocks .phone').length, set: document.querySelectorAll('#setGrid .cat-item').length }));
  assert.strictEqual(r.rows, 4); assert.ok(/^blob:/.test(r.art), 'sprout.png should become sprout\'s art'); assert.ok(!r.other, 'other cards stay untouched');
  assert.strictEqual(r.unmatched, 1, 'the oddly named file waits for a manual assignment'); assert.ok(r.exp.indexOf("'sprout'") >= 0, 'sprout passes the checks and is exported'); assert.ok(r.exp.indexOf('mystery') < 0);
  assert.ok(r.town >= 1 && r.mocks === 4 && r.set >= 150, 'town, mock screens and the set render: ' + JSON.stringify(r));
  const kw = await page.evaluate(() => ({ icon: KW.guard.icon, other: KW.swift.icon, inTile: document.querySelectorAll('#kwLab img.kwi').length, rows: document.querySelectorAll('#kwLab tbody tr').length }));
  assert.ok(/<img/.test(kw.icon) && !/<img/.test(kw.other), 'kw-guard.png replaces only the Guard icon'); assert.ok(kw.inTile > 0 && kw.rows === 13, 'keyword section renders all 13: ' + JSON.stringify(kw));
  await page.selectOption('#lib [data-assign]', 'pebble'); await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => !!CARD_POOL.find(c => c.id === 'pebble').art), 'assigning a file attaches it to that card');
  await page.click('#thLight'); assert.strictEqual(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
};
