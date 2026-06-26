// MalaSense AI — Service Worker
// Caches the app shell and model files for full offline use

const CACHE_NAME = 'malasense-v1';
const MODEL_CACHE = 'malasense-model-v1';

// App shell files to cache immediately on install
const APP_SHELL = [
  '/malasense-ai/',
  '/malasense-ai/index.html',
  '/malasense-ai/manifest.json'
];

// Model files cached separately so they can be updated independently
const MODEL_FILES = [
  '/malasense-ai/model/model.json',
  '/malasense-ai/model/group1-shard1of8.bin',
  '/malasense-ai/model/group1-shard2of8.bin',
  '/malasense-ai/model/group1-shard3of8.bin',
  '/malasense-ai/model/group1-shard4of8.bin',
  '/malasense-ai/model/group1-shard5of8.bin',
  '/malasense-ai/model/group1-shard6of8.bin',
  '/malasense-ai/model/group1-shard7of8.bin',
  '/malasense-ai/model/group1-shard8of8.bin'
];

// Install: cache app shell and model files
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)),
      caches.open(MODEL_CACHE).then(cache => cache.addAll(MODEL_FILES))
    ]).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== MODEL_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache any new successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/malasense-ai/index.html');
        }
      });
    })
  );
});
