// sw.js — Service Worker do Simulador de Pesca
// Faz cache dos arquivos do PWA para funcionar offline após instalado

const CACHE_NAME = 'simpesca-v1';

// Arquivos do próprio PWA (GitHub Pages) que ficam em cache
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala e faz cache dos assets do PWA
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Remove caches antigos ao ativar nova versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache first para assets do PWA,
// network only para requisições ao ESP32 (192.168.4.1)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Requisições para o ESP32 (IP local) → sempre vai para rede, nunca cache
  if (url.hostname === '192.168.4.1') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Assets do PWA → cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
