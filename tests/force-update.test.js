// Settings -> Update game: the button exists, and forceUpdateGame clears the game's caches (never the save), asks for fresh copies of the local files, then reloads.
module.exports = async (page, assert) => {
  assert.strictEqual(await page.locator('#forceUpdateBtn').count(), 1, 'the Update game button should be in Settings');
  const r = await page.evaluate(async () => {
    localStorage.setItem('tr-force-update-probe', 'keep');
    const calls = { fetched: [], deleted: [], reloaded: 0 };
    const realFetch = window.fetch, realKeys = caches.keys.bind(caches), realDelete = caches.delete.bind(caches);
    // the harness opens the game from file://, where fetch() of a local file is refused, so the stub answers with a tiny stand-in index.html
    window.fetch = (u, o) => { calls.fetched.push([String(u), o && o.cache]); return /index\.html$/.test(String(u)) ? Promise.resolve(new Response('<link href="css/base.css"><script src="js/build.js"></script><script src="https://example.com/x.js"></script>')) : Promise.resolve(new Response('')); };
    caches.keys = async () => ['v1-fake', 'v2-fake']; caches.delete = async k => { calls.deleted.push(k); return true; };
    const btn = document.getElementById('forceUpdateBtn'); await forceUpdateGame(btn, () => { calls.reloaded++; });
    window.fetch = realFetch; caches.keys = realKeys; caches.delete = realDelete;
    return { calls, text: btn.textContent, save: localStorage.getItem('tr-force-update-probe') };
  });
  assert.deepStrictEqual(r.calls.deleted, ['v1-fake', 'v2-fake'], 'every cache should be deleted: ' + JSON.stringify(r.calls));
  assert.ok(r.calls.fetched.every(([, c]) => c === 'reload') && r.calls.fetched.some(([u]) => /index\.html$/.test(u)) && r.calls.fetched.some(([u]) => /js\/build\.js/.test(u)) && r.calls.fetched.every(([u]) => !/example\.com/.test(u)), 'index.html and the scripts should be re-fetched past the HTTP cache: ' + JSON.stringify(r.calls.fetched.slice(0, 4)));
  assert.strictEqual(r.calls.reloaded, 1, 'the page should reload once');
  assert.strictEqual(r.save, 'keep', 'the save must not be touched');
};
