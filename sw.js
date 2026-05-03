const CACHE_NAME = 'race-v6';
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
  './images/04-library.jpg',
  './images/05-garden.jpg',
  './images/06-bench.jpg',
  './images/07-clock.jpg',
  './images/08-gates.jpg',
  './images/09-tree.jpg',
  './images/10-science.jpg',
  './images/11-stage.jpg',
  './images/12-gallery.jpg',
  './images/13-bell.jpg',
  './images/14-gym.jpg',
  './images/15-plants.jpg',
  './images/16-arch.jpg',
  './images/17-pond.jpg',
  './images/18-mural.jpg',
  './images/19-well.jpg',
  './images/20-hall.jpg'
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
