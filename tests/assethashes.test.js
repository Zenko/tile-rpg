// Incremental service-worker updates (build 281): asset-hashes.json is honest, and a new build downloads only what changed.
// A service worker needs http, so this test serves the repo itself on a local port and plays two "publishes" through it.
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const fp = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

module.exports = async (page, assert) => {
  // ----- 1. the file is honest: every fingerprint matches the file on disk, and everything index.html loads is listed -----
  const hashes = JSON.parse(fs.readFileSync(path.join(root, 'asset-hashes.json'), 'utf8'));
  const stale = [];
  Object.entries(Object.assign({}, hashes.art, hashes.core)).forEach(([u, h]) => { const f = path.join(root, u === './' ? 'index.html' : u.replace(/^\.\//, '').split('?')[0]); if (!fs.existsSync(f) || fp(fs.readFileSync(f)) !== h) stale.push(u); });
  assert.deepStrictEqual(stale, [], 'asset-hashes.json is stale for: ' + stale.slice(0, 6).join(', ') + ' - run python3 scripts/check.py and commit the file');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), missing = [];
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/gi)) { if (/^(https?:)?\/\/|^data:|^mailto:/i.test(m[1])) continue; if (!hashes.core['./' + m[1].replace(/^\.?\//, '')]) missing.push(m[1]); }
  assert.deepStrictEqual(missing, [], 'files index.html loads that asset-hashes.json does not list: ' + missing.join(', '));

  // ----- 2. a server with files we can change between "publishes" -----
  const overrides = {}, log = [];
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]); log.push(p === '/' ? '/index.html' : p);
    if (Object.prototype.hasOwnProperty.call(overrides, p)) { const o = overrides[p]; if (o === null) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain', 'cache-control': 'no-store' }); return res.end(o); }
    const f = path.join(root, p === '/' ? 'index.html' : p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port, build = +fs.readFileSync(path.join(root, 'js/build.js'), 'utf8').match(/BUILD = (\d+)/)[1];
  const cacheState = n => page.evaluate(async name => { const names = await caches.keys(); const c = names.includes(name) ? await caches.open(name) : null; return { names, has: c ? await c.match('./__asset-hashes') !== undefined : false, n: c ? (await c.keys()).length : 0 }; }, 'tile-rpg-v' + n);
  const until = async (n, ms) => { for (let i = 0; i < ms / 200; i++) { const s = await cacheState(n); if (s.has) return s; await page.waitForTimeout(200); } return cacheState(n); };
  try {
    // ----- 3. first install: everything is downloaded and the fingerprints are stored -----
    await page.goto(base + '/index.html'); await page.waitForTimeout(500);
    await page.evaluate(() => navigator.serviceWorker.ready);
    const first = await until(build, 20000);
    assert.ok(first.has && first.n > 100, 'the first install fills the cache: ' + JSON.stringify(first));
    const firstRequests = log.length;

    // ----- 4. a second build that changes one stylesheet and the build number: only those are downloaded -----
    log.length = 0;
    const orig = n => fs.readFileSync(path.join(root, n));
    overrides['/js/build.js'] = orig('js/build.js').toString().replace(/BUILD = \d+/, 'BUILD = ' + (build + 1));
    overrides['/css/base.css'] = orig('css/base.css').toString() + '\n/* assethash test */\n';
    const h2 = JSON.parse(JSON.stringify(hashes)); h2.core['./js/build.js'] = fp(overrides['/js/build.js']); h2.core['./css/base.css'] = fp(overrides['/css/base.css']);
    overrides['/asset-hashes.json'] = JSON.stringify(h2);
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    const second = await until(build + 1, 20000);
    await page.waitForTimeout(600);
    assert.ok(second.has, 'the second build installs: ' + JSON.stringify(second));
    const asked = [...new Set(log)].filter(p => p !== '/favicon.ico');
    const allowed = new Set(['/sw.js', '/js/build.js', '/css/base.css', '/asset-hashes.json']);
    assert.ok(asked.every(p => allowed.has(p)), 'only the changed files (and the worker itself) were downloaded: ' + asked.join(', '));
    assert.ok(asked.includes('/css/base.css'), 'the changed stylesheet was downloaded');
    assert.ok(!asked.includes('/assets/player-art.js') && !asked.includes('/js/battle-ui.js'), 'unchanged files were not');
    const inCache = await page.evaluate(async name => { const c = await caches.open(name); const css = await c.match('./css/base.css'), art = await c.match('./assets/player-art.js'), ui = await c.match('./js/battle-ui.js'); const names = await caches.keys();
      return { css: css ? (await css.text()).includes('assethash test') : null, art: !!art && (await art.text()).length > 1000, ui: !!ui, n: (await c.keys()).length, names }; }, 'tile-rpg-v' + (build + 1));
    assert.ok(inCache.css === true, 'the new cache holds the new stylesheet'); assert.ok(inCache.art && inCache.ui, 'and the unchanged files, copied from the old cache');
    assert.ok(Math.abs(inCache.n - first.n) <= 2, `with as many entries as the first install: ${inCache.n} vs ${first.n}`);
    assert.ok(firstRequests > 100 && asked.length <= 5, `a first install is ${firstRequests} requests, an update ${asked.length}`);
    let names = inCache.names; for (let i = 0; i < 25 && names.includes('tile-rpg-v' + build); i++) { await page.waitForTimeout(200); names = await page.evaluate(() => caches.keys()); }
    assert.ok(!names.includes('tile-rpg-v' + build), 'the old cache is cleaned up once the new worker takes over: ' + names);

    // ----- 5. no asset-hashes.json: the old full install still works -----
    log.length = 0; overrides['/asset-hashes.json'] = null;
    overrides['/js/build.js'] = overrides['/js/build.js'].replace(/BUILD = \d+/, 'BUILD = ' + (build + 2));
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    const third = await until(build + 2, 20000); await page.waitForTimeout(300);
    assert.ok(third.n > 100 && [...new Set(log)].length > 100, 'without the fingerprint file everything is downloaded again: ' + JSON.stringify(third) + ' requests ' + [...new Set(log)].length);
  } finally {
    await page.evaluate(async () => { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); (await caches.keys()).forEach(k => caches.delete(k)); }).catch(() => {});
    await new Promise(r => server.close(r));
  }
};
