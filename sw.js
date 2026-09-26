const CACHE_NAME = 'sisledere-v10';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './oyun.html',
  './style.css',
  './ogretici.css',
  './vfx.css',
  './engine.js',
  './ogretici.js',
  './yukleme.js',
  './vfx.js',
  './sfx.js',
  './case.json',
  './manifest.json',

  // --- ARAYÜZ İKONLARI VE SİMGELER ---
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/arayuz/harita.webp',
  'assets/arayuz/defter.webp',
  'assets/arayuz/tokmak.webp',
  'assets/arayuz/buyutec.webp',
  'assets/arayuz/el.webp',
  'assets/arayuz/ayak.webp',
  'assets/arayuz/geri.webp',
  'assets/arayuz/kulak.webp',
  'assets/arayuz/uyku.webp',
  'assets/arayuz/ali_ihsan.webp',

  // --- TAKVİM GÖRSELLERİ ---
  'assets/arayuz/takvim_gun1.webp',
  'assets/arayuz/takvim_gun2.webp',
  'assets/arayuz/takvim_gun3.webp',
  'assets/arayuz/takvim_gun4.webp',
  'assets/arayuz/takvim_gun5.webp',
  'assets/arayuz/takvim_gun6.webp',
  'assets/arayuz/takvim_gun7.webp',

  // --- SESLER ---
  'assets/ses/mesaj.mp3',
  'assets/ses/mors_kodu.mp3',
  'assets/ses/yuru.mp3',
  'assets/ses/kilit.mp3',
  'assets/ses/kilit_ac.mp3',
  'assets/ses/take.mp3',

  // --- GİRİŞ & ODALAR ---
  'assets/odalar/giris.webp',
  'assets/odalar/ofis_sehir.webp',
  'assets/odalar/mors_kagidi.webp',
  'assets/odalar/raf.webp',
  'assets/odalar/sislidere_dosya.webp',
  'assets/odalar/at_arabasi.webp',
  'assets/odalar/koy_giris.webp',
  'assets/odalar/dedektif_ofis.webp',
  'assets/odalar/gazeteci_oda.webp',

  // --- 2. GÜN VARLIKLARI ---
  'assets/tiklanabilir/anahtar.webp',
  'assets/tiklanabilir/bakirci1_tiklanabilir.webp',
  'assets/tiklanabilir/bakirci2_tiklanabilir.webp',
  'assets/tiklanabilir/riza2_tiklanabilir.webp',
  'assets/karakterler/bakirci1.webp',
  'assets/karakterler/bakirci2.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(PRECACHE_ASSETS.map(asset => cache.add(asset)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {});
    })
  );
});