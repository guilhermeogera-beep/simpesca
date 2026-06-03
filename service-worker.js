const CACHE_NAME = 'simulador-pesca-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Se a requisição for para o IP do ESP32, NÃO tenta buscar no cache, vai direto pra rede
  if (url.hostname === '192.168.4.1') {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error": "offline"}', {
        status: 503, 
        headers: {'Content-Type': 'application/json'}
      }))
    );
    return;
  }

  // Se não for pro ESP32 (ex: os arquivos do GitHub), tenta buscar no cache primeiro
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    }).catch(() => {
      // Retorna algo genérico se falhar offline
      return new Response('');
    })
  );
});