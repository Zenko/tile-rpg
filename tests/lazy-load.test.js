// The pre-Beta changelog archive is added on demand (not a <script> tag), and every WebGL layer shares one pixiReady promise.
module.exports = async (page, assert) => {
  assert.strictEqual(await page.evaluate(() => typeof CHANGELOG_ARCHIVE), 'undefined', 'archive must not load with the page');
  await page.evaluate(() => { renderChangelog(); });
  await page.waitForFunction(() => typeof CHANGELOG_ARCHIVE !== 'undefined' && document.getElementById('clHistoryBtn'), null, { timeout: 5000 });
  const r = await page.evaluate(async () => {
    clHistory = true; renderChangelog();
    const entries = document.querySelectorAll('#changelogList .cl-entry').length;
    clHistory = false; renderChangelog();
    let pixi = 'pending';
    try { await Promise.race([pixiReady, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]); pixi = typeof PIXI; } catch (e) { pixi = 'rejected'; }
    return { entries, pixi, scripts: [...document.scripts].filter(s => /changelog-archive/.test(s.src)).length };
  });
  assert.ok(r.entries > 90, 'history lists the archive entries: ' + r.entries);
  assert.strictEqual(r.pixi, 'object', 'pixiReady resolves once PIXI has loaded');
  assert.strictEqual(r.scripts, 1, 'archive script added only once');
};
