const CACHE_NAME = 'race-v19';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  //'./tasks.js',   read from googlesheet
  './config.js',
  './manifest.json',
  './jspdf.umd.min.js',
  './images/icon.png',
  // --- MISSION IMAGES (Numbered 01-20) ---
'./images/01_L3ExerciseMachine1.jpg',
'./images/02_L2SkyTerrace5.jpg',
'./images/03_L1PackagePals.jpg',
'./images/05_L2CareforSeniors.jpg',
'./images/09_L2ISH2.jpeg',
'./images/11_L3DrinksMachine.jpg',
'./images/12_L1Recycables4.jpg',
'./images/13_SkyTerrace3&4.png',
'./images/14_L4GeylangInternationalFC.jpg',
'./images/15_L5KindnessMovement1.jpg',
'./images/20_L5EcogardenTampinesTree.jpg',
'./images/21_L5Mirror.png',
'./images/24_L5ExerciseMachine1.jpg',
'./images/26_L2ColourMachine.png',
'./images/27_L2ColourMachine.png',
'./images/30_L5Stadium.jpg',
'./images/32_L5Species1Species2.png',
'./images/33_CrosswordsCrossroads.png',
'./images/34_L1WaterPlasticsTurtle.jpg',
'./images/36_L1meetingpoint3.jpg',
'./images/37_L5TranslucentArchedRooftop.jpg',
'./images/38_L4CyclingMachinecloseup.jpg',
'./images/39_L3_Mural_Ofkuehsandchildhoodmemories.jpg',
'./images/40_ArtfulObservation_Identifythecolourscheme.jpg',
'./images/41_Brighterthantherest.jpg',
'./images/42_Underyourfeet.jpg',
'./images/43_HumanLogoChallenge_OTHLogo.jpg',
'./images/44_LinePatternScan_L4_Mural.jpg',
'./images/46_DecodetheText_OrderandChaos.jpg',
'./images/47_DecodetheText_OrderandChaos.jpg',
'./images/48_CharacterDataReconstruction_L4.jpg',
'./images/49_MotionSequence_L4.jpg',
'./images/50_TypographyScan.jpg',
'./images/default.jpg'
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
