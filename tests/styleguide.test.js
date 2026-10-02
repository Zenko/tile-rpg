// The style guide loads the game's own CSS, sprites and card data: it must render without errors, list every card and sprite,
// flip themes, and its "try your art" checker must judge a file correctly.
module.exports = async (page, assert) => {
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'style-guide.html')); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ cards: document.querySelectorAll('#catalogue .sg-cat-item').length, pool: CARD_POOL.length, sprites: document.querySelectorAll('#spriteGrid svg').length, tokens: document.querySelectorAll('#tokTable tbody tr').length, rar: document.querySelectorAll('#rarCols .sg-col').length, fam: document.querySelectorAll('#famCols .sg-col').length, kw: document.querySelectorAll('#kwCards > .sg-card').length, kwTotal: Object.keys(KW).length, comp: document.querySelectorAll('#compose > *').length, prob: document.querySelectorAll('#problems > *').length, backs: document.querySelectorAll('#backs .cback').length }));
  assert.ok(r.cards >= r.pool, 'catalogue should list every card, got ' + r.cards + ' of ' + r.pool);
  assert.ok(r.sprites >= 24 && r.tokens >= 20, 'sprites and tokens render: ' + JSON.stringify(r));
  assert.strictEqual(r.rar, 5); assert.strictEqual(r.fam, 4); assert.strictEqual(r.kw, r.kwTotal); assert.strictEqual(r.comp, 6); assert.strictEqual(r.prob, 6); assert.strictEqual(r.backs, 7);
  await page.click('#sgLight'); assert.strictEqual(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  // the checker: a 512 px transparent PNG passes, a 400 px opaque one fails
  const png = (w, fill) => page.evaluate(([w, fill]) => { const c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'); x.fillStyle = '#e8955a'; if (fill) x.fillRect(0, 0, w, w); else { x.beginPath(); x.arc(w / 2, w / 2, w * 0.28, 0, 7); x.fill(); } return c.toDataURL('image/png').split(',')[1]; }, [w, fill]);
  const send = async (b64) => { await page.setInputFiles('#tryFile', { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }); await page.waitForTimeout(500); return page.evaluate(() => [...document.querySelectorAll('#tryChecks li')].map(l => l.className)); };
  const good = await send(await png(512, false)), bad = await send(await png(400, true));
  assert.ok(good.every(c => c === 'ok'), 'a good file should pass every check: ' + good);
  assert.ok(bad.includes('bad'), 'a 400 px opaque file should fail a check: ' + bad);
};
