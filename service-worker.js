// Dois caches: SHELL (app, atualiza fácil) e MEDIA (vídeos, persistente)
const SHELL_CACHE = 'simpesca-shell-v4';
const MEDIA_CACHE = 'simpesca-media-v1';

const APP_SHELL = [
  '/simpesca/',
  '/simpesca/index.html',
  '/simpesca/player.html',
  '/simpesca/dashboard.html',
  '/simpesca/ranking.html',
  '/simpesca/manifest.json',
  '/simpesca/icons/icon-192.png',
  '/simpesca/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== SHELL_CACHE && k !== MEDIA_CACHE)
        .map(k => caches.delete(k)))   // remove shells antigos; NUNCA apaga o MEDIA
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Vídeos: cache-first (servem offline; baixam 1x)
  if (url.endsWith('.mp4')) {
    event.respondWith(
      caches.match(event.request).then(r => r ||
        fetch(event.request).then(net => {
          if (net && net.ok) { const c = net.clone(); caches.open(MEDIA_CACHE).then(x => x.put(event.request, c)); }
          return net;
        })
      )
    );
    return;
  }

  // App (HTML/JS/ícones): rede-primeiro (pega versão nova online),
  // cai pro cache quando offline.
  event.respondWith(
    fetch(event.request).then(net => {
      if (net && net.ok && url.startsWith(self.location.origin)) {
        const c = net.clone(); caches.open(SHELL_CACHE).then(x => x.put(event.request, c));
      }
      return net;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/simpesca/index.html')))
  );
});
