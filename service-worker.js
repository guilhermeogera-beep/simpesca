const CACHE_NAME = 'simpesca-v1';

const urlsToCache = [
    '/simpesca/',
    '/simpesca/index.html',
    '/simpesca/manifest.json',
    '/simpesca/icons/icon-192.png',
    '/simpesca/icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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
    if (event.request.url.includes('192.168.4.1')) return;
    event.respondWith(
        caches.match(event.request).then(r => r || fetch(event.request))
    );
});
