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
  './tags/items.json',
  './tags/mesh.json',
  './tags/musics.json',
  './tags/part.json',
  './tags/taunts.json',
  './tags/Voicelines.json',
  // Pasta txt
  './txt/Build Coloring Tutorial.txt'
];

// Instalação do Service Worker e cache inicial
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalado');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação e limpeza de caches antigos
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

// Intercepta requisições e serve do cache com estratégia Stale-While-Revalidate
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

// Mensagem para ativar a nova versão imediatamente
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
