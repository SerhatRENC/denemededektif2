const CACHE_NAME = 'sisledere-v1';

// Oyuna girişte hafızaya alınacak temel dosyalar
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './oyun.html',
  './style.css',
  './ogretici.css',
  './engine.js',
  './case.json',
  './manifest.json'
];

// Service Worker Kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Eski önbellekleri temizleme
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// İnternet varken yeni dosyaları indir/güncelle, yoksa hafızadan çalıştır
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // Dosya önbellekte varsa direkt hafızadan getir
      if (cachedResponse) {
        return cachedResponse;
      }

      // Hafızada yoksa internetten indir ve sonraki sefere hafızaya yaz (Resim, Ses vs.)
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.log('Çevrimdışı moddasınız ve dosya önbellekte yok:', event.request.url);
      });
    })
  );
});