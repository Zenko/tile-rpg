// js/icon-swap.js: swaps the committed clean gradient art in everywhere; a preview pack can override it; with one, a mapped emoji becomes an image everywhere it appears (including later renders),
// a replaced keyword icon is swapped on its own, and Exit puts everything back.
module.exports = async (page, assert) => {
  assert.ok(await page.evaluate(() => IconSwap.active && !document.querySelector('.ico-pill')), 'the committed art is on, with no preview pill');
  const url = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#e03c5a'; x.fillRect(4, 4, 24, 24); return c.toDataURL('image/png'); });
  // The preview pack is switched on through localStorage and a reload, and Exit switches it off the same way. A write straight before a
  // reload can be missed by the new page on a slow machine (seen on CI, in both directions), so each step is retried until the page really
  // is in the state the next assertion checks. (An init script that seeds the pack was tried and made the Exit step flakier.)
  const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 8000 }).catch(() => {});
  const ready = () => until(() => typeof IconSwap !== 'undefined' && IconSwap.active && typeof switchTab === 'function');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(u => localStorage.setItem('tr-icon-preview', JSON.stringify({ on: true, map: { '1f381': u }, kw: { guard: u } })), url);
    await page.reload(); await ready();
    if (await page.evaluate(() => !!document.querySelector('.ico-pill'))) break;
  }
  await page.evaluate(() => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('quests'); }); await until(() => !!document.querySelector('.ico-pill') && document.querySelectorAll('img.ico-swap').length >= 1);
  assert.ok(await page.evaluate(() => IconSwap.active && !!document.querySelector('.ico-pill')), 'the preview pill shows while the preview is on');
  assert.ok(await page.evaluate(() => document.querySelectorAll('img.ico-swap').length) >= 1, 'the gift emoji in the dock is swapped');
  await page.evaluate(() => { toast('🎁 A gift!'); }); await until(() => document.getElementById('toast').querySelector('img.ico-swap') !== null);
  assert.ok(await page.evaluate(() => document.getElementById('toast').querySelector('img.ico-swap') !== null), 'icons added later (a toast) are swapped too');
  await page.evaluate(() => { switchTab('collection'); }); await until(() => [...document.querySelectorAll('img.ico-swap')].some(i => i.getAttribute('data-o').indexOf(IconSwap.MARK) > 0));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('img.ico-swap')].some(i => i.getAttribute('data-o').indexOf(IconSwap.MARK) > 0)), 'the Guard keyword icon is swapped on its own');
  for (let i = 0; i < 4 && await page.evaluate(() => !!document.querySelector('.ico-pill')).catch(() => true); i++) {   // Exit writes the setting and reloads; press it again if the new page still saw the preview on
    await page.$eval('.ico-pill button', el => el.click()).catch(() => { /* the page was already reloading */ });
    await ready(); await until(() => !document.querySelector('.ico-pill'));
  }
  await until(() => !document.querySelector('.ico-pill') && ![...document.querySelectorAll('img.ico-swap')].some(i => /^data:/.test(i.src)));
  assert.ok(await page.evaluate(() => !document.querySelector('.ico-pill') && ![...document.querySelectorAll('img.ico-swap')].some(i => /^data:/.test(i.src))), 'Exit drops the preview and keeps the committed art');
};
