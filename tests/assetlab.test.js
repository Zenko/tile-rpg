// The Asset Lab swaps uploaded images onto the real card defs in memory only: files named after a card or sprite id match by themselves,
// the preflight judges them, and everything renders without errors.
module.exports = async (page, assert) => {
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'asset-lab.html')); await page.waitForTimeout(700);
  const png = (name, w, opaque) => page.evaluate(([w, opaque]) => { const c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'); x.fillStyle = '#e8955a'; if (opaque) x.fillRect(0, 0, w, w); else { x.beginPath(); x.arc(w / 2, w / 2, w * 0.28, 0, 7); x.fill(); } return c.toDataURL('image/png').split(',')[1]; }, [w, opaque]).then(b => ({ name, mimeType: 'image/png', buffer: Buffer.from(b, 'base64') }));
  await page.setInputFiles('#file', [await png('sprout.png', 512), await png('s-oak.png', 64), await png('mystery.png', 400, true), await png('kw-guard.png', 128), await png('icon-wrapped-present.png', 128)]); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ rows: document.querySelectorAll('#lib tbody tr').length, art: CARD_POOL.find(c => c.id === 'sprout').art, other: CARD_POOL.find(c => c.id === 'pebble').art, unmatched: document.querySelectorAll('#lib [data-assign]').length, exp: document.getElementById('exp').textContent, town: document.querySelectorAll('#townScene img').length, mocks: document.querySelectorAll('#mocks .phone').length, set: document.querySelectorAll('#setGrid .cat-item').length }));
  assert.strictEqual(r.rows, 5); assert.ok(/^blob:/.test(r.art), 'sprout.png should become sprout\'s art'); assert.ok(!r.other, 'other cards stay untouched');
  assert.strictEqual(r.unmatched, 1, 'the oddly named file waits for a manual assignment'); assert.ok(r.exp.indexOf("'sprout'") >= 0, 'sprout passes the checks and is exported'); assert.ok(r.exp.indexOf('mystery') < 0);
  assert.ok(r.town >= 1 && r.mocks === 4 && r.set >= 95, 'town, mock screens and the set render: ' + JSON.stringify(r));
  const kw = await page.evaluate(() => ({ marked: KW.guard.icon.indexOf(IconSwap.MARK) > 0, other: KW.swift.icon.indexOf(IconSwap.MARK) < 0, swapped: document.querySelectorAll('#kwLab img.ico-swap').length, rows: document.querySelectorAll('#kwLab tbody tr').length }));
  assert.ok(kw.marked && kw.other, 'kw-guard.png marks only the Guard keyword'); assert.ok(kw.swapped > 0 && kw.rows === 13, 'keyword section renders all 13 with swapped icons: ' + JSON.stringify(kw));
  const ic = await page.evaluate(() => ({ cards: document.querySelectorAll('#iconGrid .ic').length, total: ICON_MANIFEST.icons.length, has: document.querySelectorAll('#iconGrid .ic.has').length, sampler: document.querySelectorAll('#sampler img.ico-swap').length, gift: !!ICON_MANIFEST.icons.find(i => i.slug === 'wrapped-present') }));
  assert.ok(ic.gift && ic.total > 300 && ic.cards === ic.total, 'every inventoried icon is listed: ' + JSON.stringify(ic)); assert.strictEqual(ic.has, 1, 'icon-wrapped-present.png attaches to the gift icon'); assert.ok(ic.sampler >= 1, 'the swap shows in the UI sampler');
  await page.click('#gpApply'); await page.waitForTimeout(800);
  const pk = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-icon-preview') || 'null'));
  assert.ok(pk && pk.on && pk.map['1f381'] && pk.kw.guard, 'the game preview pack holds the gift icon and the Guard keyword icon');
  await page.selectOption('#lib [data-assign]', 'pebble'); await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => !!CARD_POOL.find(c => c.id === 'pebble').art), 'assigning a file attaches it to that card');
  await page.click('#thLight'); assert.strictEqual(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
};
