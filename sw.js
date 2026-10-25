/* Бюджет КЗ — service worker: кэш оболочки для мгновенного запуска и работы офлайн.
   Запросы к api.github.com никогда не кэшируются. */
const VERSION = 'bkz-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest?v=3', './icons/icon-192.png?v=2', './icons/icon-512.png?v=2', './icons/maskable-512.png?v=2', './icons/apple-touch-icon.png?v=2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // GitHub API и всё внешнее — только сеть
  const isDoc = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('sw.js');
  if (isDoc) {
    // сеть в приоритете, чтобы обновления приходили сразу; офлайн — из кэша
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })));
  }
});
