const CACHE_NAME = 'simpesca-v2';

// App shell — precarregado na instalação (rápido, obrigatório)
const APP_SHELL = [
  '/simpesca/',
  '/simpesca/index.html',
  '/simpesca/player.html',
  '/simpesca/dashboard.html',
  '/simpesca/manifest.json',
  '/simpesca/icons/icon-192.png',
  '/simpesca/icons/icon-512.png'
];

// Vídeos — cacheados pela página inicial (com barra de progresso).
// O fetch handler (cache-first) serve eles offline depois de baixados.

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // addAll falharia tudo se um item faltasse; cacheia um a um tolerando falhas
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(e => console.log('SW: falhou cache de', url))
      ))
    )
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

// Cache-first: serve do cache; se não tiver, busca na rede e guarda.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) return resp;
      return fetch(event.request).then(net => {
        // guarda no cache o que for do próprio site (mesma origem)
        if (net && net.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = net.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return net;
      }).catch(() => resp); // offline e sem cache → falha silenciosa
    })
  );
});
