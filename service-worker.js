/**
 * Service Worker para o Simulador de Pesca
 * Posicione este arquivo na raiz do seu repositório (junto ao index.html)
 */

const CACHE_NAME = 'simpesca-v1';

// Lista de arquivos essenciais para rodar offline
// Dica: Adicione aqui as imagens de peixes, sons ou cenários se quiser que funcionem sem internet!
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalação: baixa e armazena os arquivos no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Cache do Simulador aberto');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch: intercepta as requisições para rodar offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Retorna do cache se existir, senão busca na rede
            return response || fetch(event.request);
        })
    );
});