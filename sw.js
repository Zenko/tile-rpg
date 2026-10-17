// Service worker: makes the game installable and fully playable offline.
// The cache is named from BUILD (js/build.js), the one number bumped on every publish (see HANDOFF §2), so returning
// players pick up the new files instead of a stale cache. importScripts files are part of the browser's update check too.
importScripts('js/build.js');
const CACHE_VERSION = 'v' + BUILD;
const CACHE_NAME = 'tile-rpg-' + CACHE_VERSION;

// The precache list used to be a hand-maintained copy of every <script src> in index.html - easy to forget
// to update when a file is added, and then that file silently doesn't work offline. Instead this reads
// index.html and manifest.json themselves at install time and precaches whatever same-origin files they
// already reference, so there is only one place (index.html) to keep up to date, not two.
const CORE_URLS = ['./', './index.html', './manifest.json'];
function sameOriginUrl(raw) {
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('mailto:')) return null;
  return './' + raw.replace(/^\.?\//, '');
}
async function buildPrecacheUrls() {
  const urls = new Set(CORE_URLS);
  const html = await (await fetch('./index.html', { cache: 'reload' })).text();
  const re = /<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) { const u = sameOriginUrl(m[1]); if (u) urls.add(u); }
  try {
    const manifest = await (await fetch('./manifest.json')).json();
    (manifest.icons || []).forEach(icon => { const u = sameOriginUrl(icon.src); if (u) urls.add(u); });
  } catch (e) { /* manifest fetch/parse failed - the core list above is still enough to install */ }
  return [...urls];
}

// Card pictures and UI icons (about 3 MB) are named inside the game's own scripts, not index.html. Without this they were fetched
// one by one on first sight, and the activate step below deletes the previous cache - so right after a publish every picture
// had to come from the network again, and on a slow or dropped connection (or while Pages was still swapping files) the whole
// game showed broken-image icons. Best effort on purpose: one missing picture must never stop an update installing.
// scripts/check.py writes art-manifest.json (the same list, found by the same pattern) so install does not have to download
// and scan every script a second time; the scan below is only the fallback for a publish made without running check.py.
async function precacheArt(cache, urls) {
  const art = new Set();
  try {
    const listed = await (await fetch('./art-manifest.json', { cache: 'reload' })).json();
    if (Array.isArray(listed) && listed.length) { listed.forEach(u => art.add('./' + u)); urls = []; }
  } catch (e) { /* no manifest: scan the scripts instead */ }
  await Promise.all(urls.filter(u => u.endsWith('.js')).map(async u => {
    try { (await (await fetch(u)).text()).replace(/assets\/(?:icons|cards)\/[\w.-]+\.png/g, m => art.add('./' + m)); } catch (e) { /* skip this script */ }
  }));
  await Promise.allSettled([...art].map(u => cache.add(new Request(u, { cache: 'reload' }))));
}

/* ---------- Incremental installs (build 281) ----------
   A new build used to download every file again (cache: 'reload'), a megabyte and a half or more for a change that touched three files.
   scripts/check.py now writes asset-hashes.json, a short fingerprint for every file this worker precaches, and each cache keeps a copy of
   the fingerprints it was built from (HASHES_KEY). On install the worker finds the previous cache, copies every file whose fingerprint did
   not change, and downloads only the rest (still with cache: 'reload', for the GitHub Pages max-age reason above). Anything unusual -
   no asset-hashes.json, no previous cache with fingerprints, a file missing from it - falls back to downloading that file, and no
   asset-hashes.json at all falls back to the old full install below. tests/assethashes.test.js keeps the file honest. */
const HASHES_KEY = './__asset-hashes';
async function loadHashes() {
  try {
    const res = await fetch('./asset-hashes.json', { cache: 'reload' }); if (!res.ok) return null;
    const j = await res.json();
    return j && j.core && typeof j.core === 'object' && Object.keys(j.core).length ? j : null;
  } catch (e) { return null; }
}
async function previousCache() {
  try {
    const names = (await caches.keys()).filter(n => n.startsWith('tile-rpg-') && n !== CACHE_NAME);
    names.sort((a, b) => (parseInt(b.split('-v')[1], 10) || 0) - (parseInt(a.split('-v')[1], 10) || 0));       // newest first
    for (const n of names) { const c = await caches.open(n), r = await c.match(HASHES_KEY); if (r) return { cache: c, hashes: await r.json() }; }
  } catch (e) { /* no usable previous cache: everything is downloaded */ }
  return null;
}
// Copies each unchanged file from the previous cache into the new one and returns the urls that still have to be downloaded.
async function reuseUnchanged(cache, prev, urls, hashes) {
  const todo = [];
  for (const u of urls) {
    let old = null;
    if (prev && prev.hashes[u] && prev.hashes[u] === hashes[u]) { try { old = await prev.cache.match(u); } catch (e) { old = null; } }
    if (old && old.ok) { await cache.put(u, old); } else todo.push(u);
  }
  return todo;
}
async function installIncremental(hashes) {
  const cache = await caches.open(CACHE_NAME), prev = await previousCache(), art = hashes.art || {}, all = Object.assign({}, art, hashes.core);
  const coreTodo = await reuseUnchanged(cache, prev, Object.keys(hashes.core), all);
  await cache.addAll(coreTodo.map(u => new Request(u, { cache: 'reload' })));                                  // all or nothing, as before
  const artTodo = await reuseUnchanged(cache, prev, Object.keys(art), all);
  await Promise.allSettled(artTodo.map(u => cache.add(new Request(u, { cache: 'reload' }))));                 // pictures are best effort, as before
  await cache.put(HASHES_KEY, new Response(JSON.stringify(all), { headers: { 'content-type': 'application/json' } }));
}

self.addEventListener('install', event => {
  event.waitUntil(
    loadHashes().then(hashes => hashes ? installIncremental(hashes) :
      buildPrecacheUrls()
        // cache: 'reload' skips the browser's own HTTP cache. GitHub Pages sends max-age=600, so without it a new
        // service worker could precache the *previous* publish's CSS/JS if the phone had fetched them in the last
        // ten minutes - the new version would then "install" while still showing the old screens.
        .then(urls => caches.open(CACHE_NAME).then(cache => cache.addAll(urls.map(u => new Request(u, { cache: 'reload' }))).then(() => precacheArt(cache, urls)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything same-origin: the game only ever changes on a new publish (new CACHE_VERSION),
// so there is nothing to gain by hitting the network first. Anything not already precached (a new asset,
// or a cross-origin request like a future cloud-sync call) just falls through to the network as normal.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => Response.error());
    })
  );
});
