// The style guide loads the game's own CSS, sprites and card data: it must render without errors, list every card and sprite, and flip themes.
module.exports = async (page, assert) => {
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'style-guide.html')); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ cards: document.querySelectorAll('#catalogue .sg-cat-item').length, pool: CARD_POOL.length, sprites: document.querySelectorAll('#spriteGrid svg').length, tokens: document.querySelectorAll('#tokTable tbody tr').length, faces: document.querySelectorAll('#battle .card').length }));
  assert.ok(r.cards >= r.pool, 'catalogue should list every card, got ' + r.cards + ' of ' + r.pool);
  assert.ok(r.sprites >= 24, 'all sprites shown: ' + r.sprites); assert.ok(r.tokens >= 20 && r.faces >= 4, 'tokens and battle faces render');
  await page.click('#sgLight'); assert.strictEqual(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
};
