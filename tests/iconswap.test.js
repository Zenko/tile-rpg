// js/icon-swap.js: swaps the committed clean gradient art in everywhere; a preview pack can override it; with one, a mapped emoji becomes an image everywhere it appears (including later renders),
// a replaced keyword icon is swapped on its own, and Exit puts everything back.
module.exports = async (page, assert) => {
  assert.ok(await page.evaluate(() => IconSwap.active && !document.querySelector('.ico-pill')), 'the committed art is on, with no preview pill');
  const url = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#e03c5a'; x.fillRect(4, 4, 24, 24); return c.toDataURL('image/png'); });
  await page.evaluate(u => localStorage.setItem('tr-icon-preview', JSON.stringify({ on: true, map: { '1f381': u }, kw: { guard: u } })), url);
  await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('quests'); }); await page.waitForTimeout(700);
  assert.ok(await page.evaluate(() => IconSwap.active && !!document.querySelector('.ico-pill')), 'the preview pill shows while the preview is on');
  assert.ok(await page.evaluate(() => document.querySelectorAll('img.ico-swap').length) >= 1, 'the gift emoji in the dock is swapped');
  await page.evaluate(() => { toast('🎁 A gift!'); }); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => document.getElementById('toast').querySelector('img.ico-swap') !== null), 'icons added later (a toast) are swapped too');
  await page.evaluate(() => { switchTab('collection'); }); await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('img.ico-swap')].some(i => i.getAttribute('data-o').indexOf(IconSwap.MARK) > 0)), 'the Guard keyword icon is swapped on its own');
  await page.click('.ico-pill button'); await page.waitForTimeout(900);
  assert.ok(await page.evaluate(() => !document.querySelector('.ico-pill') && ![...document.querySelectorAll('img.ico-swap')].some(i => /^data:/.test(i.src))), 'Exit drops the preview and keeps the committed art');
};
