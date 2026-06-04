/**
 * Service Worker — Simulador de Pesca
 * Coloque este arquivo na raiz do repositório (junto ao index.html)
 */

const CACHE_NAME = 'simpesca-v1';

// Arquivos do PWA que ficam disponíveis offline
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalação: armazena os arquivos no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Cache aberto');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList =>
            Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }))
        )
    );
    self.clients.claim();
});

// Fetch: cache first para assets do PWA, rede direta para o ESP32
self.addEventListener('fetch', event => {
    // IMPORTANTE: NÃO interceptar requisições para o ESP32 (IP fixo do AP)
    // Caso contrário o PWA tentaria buscar no cache em vez do hardware
    if (event.request.url.includes('192.168.4.1')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response =>
            response || fetch(event.request)
        )
    );
});
