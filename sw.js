// Service worker: makes the game installable and fully playable offline.
// Bump CACHE_VERSION on every publish (see HANDOFF §2's publish checklist) so returning players
// pick up the new files instead of a stale cache - it does not need to match the game's own version.
const CACHE_VERSION = 'v48';
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

self.addEventListener('install', event => {
  event.waitUntil(
    buildPrecacheUrls()
      // cache: 'reload' skips the browser's own HTTP cache. GitHub Pages sends max-age=600, so without it a new
      // service worker could precache the *previous* publish's CSS/JS if the phone had fetched them in the last
      // ten minutes - the new version would then "install" while still showing the old screens.
      .then(urls => caches.open(CACHE_NAME).then(cache => cache.addAll(urls.map(u => new Request(u, { cache: 'reload' })))))
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
      }).catch(() => cached);
    })
  );
});
