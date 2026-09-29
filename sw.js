// Service worker: makes the game installable and fully playable offline.
// Bump CACHE_VERSION on every publish (see HANDOFF §2's publish checklist) so returning players
// pick up the new files instead of a stale cache - it does not need to match the game's own version.
const CACHE_VERSION = 'v23';
const CACHE_NAME = 'tile-rpg-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './assets/sprites.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './js/afterdark-companion-cards.js',
  './js/audio.js',
  './js/battle-ui.js',
  './js/changelog.js',
  './js/cloud-save.js',
  './js/collection-tools.js',
  './js/data-and-engine.js',
  './js/events-story-foils-guide.js',
  './js/fishing.js',
  './js/gardening.js',
  './js/houses-and-cellar.js',
  './js/journal-history.js',
  './js/maps.js',
  './js/neighbors-bosses.js',
  './js/notes.js',
  './js/progression.js',
  './js/puzzle-memory-minigames.js',
  './js/requests-friendship-rival.js',
  './js/shop-economy.js',
  './js/titles.js',
  './js/town-render-weather.js',
  './js/workshop-and-starter.js',
  './js/world-map.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
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
