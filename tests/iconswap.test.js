// js/icon-swap.js: swaps the committed clean gradient art in everywhere; a preview pack can override it; with one, a mapped emoji becomes an image everywhere it appears (including later renders),
// a replaced keyword icon is swapped on its own, and Exit puts everything back.
module.exports = async (page, assert) => {
  assert.ok(await page.evaluate(() => IconSwap.active && !document.querySelector('.ico-pill')), 'the committed art is on, with no preview pill');
  const url = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#e03c5a'; x.fillRect(4, 4, 24, 24); return c.toDataURL('image/png'); });
  // Seed the preview pack from an init script that runs before the page's own scripts on the reload, not with a localStorage write followed
  // straight away by a reload: on a busy machine the new page could start before the write was committed and see no pack. The sessionStorage
  // guard makes it run once, so Exit's own reload (which switches the preview off) is not undone.
  await page.addInitScript(u => { try { if (!sessionStorage.getItem('tr-test-seeded')) { sessionStorage.setItem('tr-test-seeded', '1'); localStorage.setItem('tr-icon-preview', JSON.stringify({ on: true, map: { '1f381': u }, kw: { guard: u } })); } } catch (e) { /* ignore */ } }, url);
  const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 8000 }).catch(() => {});   // wait for the state the next assertion checks (a slow machine takes longer than any fixed sleep); the assertion reports a real miss
  await page.reload(); await until(() => typeof IconSwap !== 'undefined' && IconSwap.active && typeof switchTab === 'function');
  await page.evaluate(() => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('quests'); }); await until(() => !!document.querySelector('.ico-pill') && document.querySelectorAll('img.ico-swap').length >= 1);
  assert.ok(await page.evaluate(() => IconSwap.active && !!document.querySelector('.ico-pill')), 'the preview pill shows while the preview is on');
  assert.ok(await page.evaluate(() => document.querySelectorAll('img.ico-swap').length) >= 1, 'the gift emoji in the dock is swapped');
  await page.evaluate(() => { toast('🎁 A gift!'); }); await until(() => document.getElementById('toast').querySelector('img.ico-swap') !== null);
  assert.ok(await page.evaluate(() => document.getElementById('toast').querySelector('img.ico-swap') !== null), 'icons added later (a toast) are swapped too');
  await page.evaluate(() => { switchTab('collection'); }); await until(() => [...document.querySelectorAll('img.ico-swap')].some(i => i.getAttribute('data-o').indexOf(IconSwap.MARK) > 0));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('img.ico-swap')].some(i => i.getAttribute('data-o').indexOf(IconSwap.MARK) > 0)), 'the Guard keyword icon is swapped on its own');
  await page.click('.ico-pill button'); await until(() => !document.querySelector('.ico-pill') && ![...document.querySelectorAll('img.ico-swap')].some(i => /^data:/.test(i.src)));
  assert.ok(await page.evaluate(() => !document.querySelector('.ico-pill') && ![...document.querySelectorAll('img.ico-swap')].some(i => /^data:/.test(i.src))), 'Exit drops the preview and keeps the committed art');
};
