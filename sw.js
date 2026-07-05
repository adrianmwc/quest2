const CACHE_NAME = 'race-v14';
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
  './images/04-bust.jpg',
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

// 1. SAFE ALL-SETTLED ASYNC INSTALLATION
self.addEventListener('install', e => {
    self.skipWaiting();
    
    e.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log("Service Worker: Caching assets sequentially...");
            
            // Map urls into an explicit array of individual fetch promises
            const cachePromises = ASSETS.map(async (url) => {
                try {
                    await cache.add(url);
                    console.log(`Cached successfully: ${url}`);
                } catch (err) {
                    console.error(`❌ FAILED to cache resource: ${url}`, err);
                }
            });

            // Forces e.waitUntil to wait until ALL promises resolve out completely
            await Promise.allSettled(cachePromises);
            console.log("Service Worker: Asset caching loop concluded.");
        })
    );
});

// 2. CLEAN UP OLD CACHE REFERENCES
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(k => {
                if (k !== CACHE_NAME) {
                    console.log(`Service Worker: Decomposing legacy cache structure: ${k}`);
                    return caches.delete(k);
                }
            })
        ))
    );
});

// 3. OFFLINE FALLBACK NETWORK PROXY INTERCEPTOR
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            // Return cached resource, or fetch dynamically from web connection
            return res || fetch(e.request).catch(() => {
                console.warn(`Resource missing offline: ${e.request.url}`);
            });
        })
    );
});
