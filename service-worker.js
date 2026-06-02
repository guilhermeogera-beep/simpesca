const CACHE_NAME = 'simulador-pesca-v2';

// Arquivos cacheados na primeira abertura (com Wi-Fi do ESP32)
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/leve.mp4',
  '/media.mp4',
  '/pesada.mp4'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cacheia assets essenciais; ignora falha individual de vídeo
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requisições ao ESP32 — nunca cacheia
  if (url.pathname === '/setDAC' || url.pathname === '/getStatus') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('offline', { status: 503 }))
    );
    return;
  }

  // Vídeos do usuário (blob:) — deixa o browser tratar normalmente
  if (event.request.url.startsWith('blob:')) return;

  // Tudo mais: Cache First, atualiza em background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
