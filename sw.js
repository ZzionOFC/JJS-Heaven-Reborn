const CACHE_NAME = 'jjs-heaven-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/index.css',
  './js/index.js',
  './manifest.json',
  './sw.js',
  './README.md',
  // Imagens
  './grass.png',
  './img.png',
  './wood.png',
  // Pasta json
  './json/codes.json',
  './json/colors.json',
  './json/dados.json',
  './json/log.txt',
  // Pasta tags
  './tags/audios.json',
  './tags/chars.json',
  './tags/decals.json',
  './tags/emotes.json',
  './tags/firearms.json',
  './tags/gore-and-body.json',
  './tags/heavy-general-impacts.json',
  './tags/ice-sfx.json',
  './tags/items.json',
  './tags/jjk-sound-effects-and-cursed-energy.json',
  './tags/jjkm.json',
  './tags/jjktechniques.json',
  './tags/jjkweapons.json',
  './tags/limbusm.json',
  './tags/magic-and-sci-fi.json',
  './tags/materials-and-environment.json',
  './tags/mesh.json',
  './tags/musics.json',
  './tags/part.json',
  './tags/phisical.json',
  './tags/quincys.json',
  './tags/sfx.json',
  './tags/taunts.json',
  './tags/vfxmeshes.json',
  './tags/Voicelines.json',
  './tags/weapons-and-blades.json',
  './tags/wind-and-movement.json',
  './tags/windup-cast-and-energy.json',
  // Pasta txt
  './txt/Build Coloring Tutorial.txt'
];


self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalado');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});


self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
