const CACHE_NAME = 'race-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tasks.js',
  './config.js',
  './manifest.json',
  './jspdf.umd.min.js',
  './images/icon.png',
  // --- MISSION IMAGES (Numbered 01-20) ---
  './images/01-fountain.jpg',
  './images/02-statue.jpg',
  './images/03-library.jpg',
  './images/04-bust.jpg'
  // ------------------------------------
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => {
            console.log("Service Worker: Caching files...");

            // Replace cache.addAll(ASSETS) with this:
            ASSETS.map(async (url) => {
                try {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.add(url);
                    console.log("Cached successfully:", url);
                } catch (error) {
                    console.error("❌ FAILED to cache:", url);
                }
            });
        })
    );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => {
    if(k !== CACHE_NAME) return caches.delete(k);
  }))));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
