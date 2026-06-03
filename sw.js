const CACHE_NAME = 'simulador-pesca-v1';
const BASE_URL   = 'https://guilhermeogera-beep.github.io/SImulador-de-pesca';

// Arquivos cacheados na primeira abertura
const ASSETS = [
  BASE_URL + '/index.html',
  BASE_URL + '/manifest.json',
  BASE_URL + '/sw.js',
  BASE_URL + '/icon-192.png',
  BASE_URL + '/icon-512.png',
  BASE_URL + '/leve.mp4',
  BASE_URL + '/media.mp4',
  BASE_URL + '/pesada.mp4',
];

// Instala e cacheia tudo na primeira vez
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // allSettled: se um vídeo falhar, não impede o resto
      return Promise.allSettled(ASSETS.map(url =>
        cache.add(new Request(url, { mode: 'cors' }))
      ));
    })
  );
  self.skipWaiting();
});

// Remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Requisições ao ESP32 — nunca cacheia
  if (url.includes('/setDAC') || url.includes('/getStatus')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('offline', { status: 503 }))
    );
    return;
  }

  // Blobs locais (vídeo personalizado) — deixa o browser tratar
  if (url.startsWith('blob:')) return;

  // Tudo mais: Cache First, atualiza em background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, response.clone())
          );
        }
        return response;
      }).catch(() => null);
      return cached || network;
    })
  );
});
