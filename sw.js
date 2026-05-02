const CACHE_NAME = 'race-v4';
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
  // --- ADD YOUR MISSION IMAGES HERE ---
  './images/fountain.jpg',
  './images/statue.jpg',
  './images/library.jpg' 
  // ------------------------------------
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => {
            console.log("Service Worker: Caching files...");
            return c.addAll(ASSETS).catch(err => {
                console.error("Cache addAll failed! Check your ASSETS list.", err);
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
